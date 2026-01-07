/**
 * Real-Time Translation Hook
 * 
 * Provides live translation for typing indicators:
 * - Sender sees their message converted to native script (based on their mother tongue)
 * - Recipient sees partial typing translated to their language in native script
 * - Skips translation when same language, but still shows native script
 * - Uses embedded translator (no external APIs)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  isSameLanguage as checkSameLanguage, 
  isLatinText,
  isLatinScriptLanguage 
} from './embedded-translator';
import { transliterateToNative, translate } from './embedded-translator';

export interface TypingIndicator {
  userId: string;
  originalText: string;
  translatedText: string;
  nativePreview: string; // Native script preview for receiver
  isTranslating: boolean;
  senderLanguage: string;
  recipientLanguage: string;
  timestamp: number;
}

interface UseRealtimeTranslationOptions {
  currentUserId: string;
  currentUserLanguage: string;
  channelId: string;
  enabled?: boolean;
}

interface UseRealtimeTranslationReturn {
  // Outgoing (sender's typing)
  sendTypingIndicator: (text: string, partnerLanguage: string) => void;
  stopTyping: () => void;
  
  // Sender's native preview (what sender sees as they type)
  senderNativePreview: string;
  
  // Incoming (partner's typing)
  partnerTyping: TypingIndicator | null;
  
  // State
  isTyping: boolean;
  isTranslating: boolean;
}

export function useRealtimeTranslation({
  currentUserId,
  currentUserLanguage,
  channelId,
  enabled = true
}: UseRealtimeTranslationOptions): UseRealtimeTranslationReturn {
  const [partnerTyping, setPartnerTyping] = useState<TypingIndicator | null>(null);
  const [senderNativePreview, setSenderNativePreview] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const translateDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentTextRef = useRef<string>('');

  // Subscribe to typing channel
  useEffect(() => {
    if (!enabled || !channelId) return;

    const channel = supabase.channel(`typing:${channelId}`)
      .on('broadcast', { event: 'typing' }, async ({ payload }) => {
        if (payload.userId === currentUserId) return;

        const { text, senderLanguage, senderNativeText } = payload;
        
        // Show sender's native text immediately with loading state
        setPartnerTyping({
          userId: payload.userId,
          originalText: text,
          translatedText: '',
          nativePreview: senderNativeText || text,
          isTranslating: true,
          senderLanguage,
          recipientLanguage: currentUserLanguage,
          timestamp: Date.now()
        });

        // Generate native preview for receiver (in receiver's mother tongue)
        try {
          let receiverNativeText = text;
          
          // If same language, just convert to receiver's native script
          if (checkSameLanguage(senderLanguage, currentUserLanguage)) {
            // Both same language - show in native script
            if (!isLatinScriptLanguage(currentUserLanguage) && isLatinText(text)) {
              receiverNativeText = transliterateToNative(text, currentUserLanguage);
            } else {
              receiverNativeText = senderNativeText || text;
            }
          } else {
            // Different languages - translate to receiver's language in native script
            const translated = await translate(text, senderLanguage, currentUserLanguage);
            receiverNativeText = translated.text;
            
            // If receiver's language needs native script conversion
            if (!isLatinScriptLanguage(currentUserLanguage) && isLatinText(receiverNativeText)) {
              receiverNativeText = transliterateToNative(receiverNativeText, currentUserLanguage);
            }
          }

          setPartnerTyping(prev => prev ? {
            ...prev,
            translatedText: receiverNativeText,
            nativePreview: receiverNativeText,
            isTranslating: false
          } : null);
        } catch (err) {
          console.error('[RealtimeTranslation] Failed to translate typing:', err);
          setPartnerTyping(prev => prev ? {
            ...prev,
            translatedText: senderNativeText || text,
            nativePreview: senderNativeText || text,
            isTranslating: false
          } : null);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        if (payload.userId !== currentUserId) {
          setPartnerTyping(null);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [enabled, channelId, currentUserId, currentUserLanguage]);

  // Send typing indicator with native script conversion for sender
  const sendTypingIndicator = useCallback((text: string, partnerLanguage: string) => {
    if (!enabled || !channelRef.current || !text.trim()) return;
    
    // Don't resend if text hasn't changed significantly
    if (text === lastSentTextRef.current) return;
    lastSentTextRef.current = text;

    setIsTyping(true);
    setIsTranslating(true);

    // Generate sender's native preview (what sender sees as they type)
    let senderNative = text;
    if (!isLatinScriptLanguage(currentUserLanguage) && isLatinText(text)) {
      senderNative = transliterateToNative(text, currentUserLanguage);
    }
    setSenderNativePreview(senderNative);

    // Debounce the broadcast
    if (translateDebounceRef.current) {
      clearTimeout(translateDebounceRef.current);
    }

    translateDebounceRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUserId,
          text, // Original Latin text
          senderNativeText: senderNative, // Sender's native script version
          senderLanguage: currentUserLanguage,
          timestamp: Date.now()
        }
      });
      setIsTranslating(false);
    }, 100); // Reduced debounce for faster preview

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [enabled, currentUserId, currentUserLanguage]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (!channelRef.current) return;

    setIsTyping(false);
    setSenderNativePreview('');
    lastSentTextRef.current = '';

    channelRef.current.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { userId: currentUserId }
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (translateDebounceRef.current) {
      clearTimeout(translateDebounceRef.current);
    }
  }, [currentUserId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (translateDebounceRef.current) clearTimeout(translateDebounceRef.current);
    };
  }, []);

  return {
    sendTypingIndicator,
    stopTyping,
    senderNativePreview,
    partnerTyping,
    isTyping,
    isTranslating
  };
}

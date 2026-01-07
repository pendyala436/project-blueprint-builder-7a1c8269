/**
 * Real-Time Translation Hook - FULLY ASYNC & NON-BLOCKING
 * 
 * 100% Background Processing - Typing is NEVER affected:
 * - All translation/transliteration runs in background via requestIdleCallback
 * - Sender sees live native script preview (based on their mother tongue from profile)
 * - Recipient sees partner's typing translated to their mother tongue in native script
 * - Same language: No translation, but native script conversion still applies
 * - Supports 300+ languages using embedded translator (no external APIs)
 * 
 * NO START/STOP BUTTONS NEEDED - Everything is automatic:
 * - Typing indicator starts automatically when user types
 * - Auto-stops after 3 seconds of inactivity
 * - Preview clears automatically when message is sent
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
  // Outgoing (sender's typing) - FULLY AUTOMATIC
  sendTypingIndicator: (text: string, partnerLanguage: string) => void;
  clearPreview: () => void; // Called after message sent - no UI button needed
  
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
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentTextRef = useRef<string>('');

  // Subscribe to typing channel - FULLY ASYNC
  useEffect(() => {
    if (!enabled || !channelId) return;

    const channel = supabase.channel(`typing:${channelId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
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

        // BACKGROUND: Generate native preview for receiver using requestIdleCallback
        const processReceiverPreview = async () => {
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
        };

        // Use requestIdleCallback for true non-blocking background work
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => processReceiverPreview(), { timeout: 500 });
        } else {
          setTimeout(processReceiverPreview, 0);
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

  // FULLY ASYNC: Send typing indicator - NEVER blocks typing
  const sendTypingIndicator = useCallback((text: string, partnerLanguage: string) => {
    if (!enabled || !text.trim()) {
      // Empty text - clear preview immediately
      if (!text.trim()) {
        setSenderNativePreview('');
        setIsTyping(false);
      }
      return;
    }
    
    setIsTyping(true);

    // IMMEDIATE: Generate sender's native preview in background
    // This runs completely async - typing is NEVER blocked
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }

    // Debounce preview generation (50ms) - very fast for responsiveness
    previewDebounceRef.current = setTimeout(() => {
      const generatePreview = () => {
        let senderNative = text;
        if (!isLatinScriptLanguage(currentUserLanguage) && isLatinText(text)) {
          senderNative = transliterateToNative(text, currentUserLanguage);
        }
        setSenderNativePreview(senderNative);
        setIsTranslating(false);
      };

      // Use requestIdleCallback for true non-blocking
      if ('requestIdleCallback' in window) {
        setIsTranslating(true);
        (window as any).requestIdleCallback(generatePreview, { timeout: 100 });
      } else {
        generatePreview();
      }
    }, 50);

    // BACKGROUND: Broadcast to partner - debounced separately (150ms)
    if (text !== lastSentTextRef.current) {
      lastSentTextRef.current = text;
      
      if (broadcastDebounceRef.current) {
        clearTimeout(broadcastDebounceRef.current);
      }

      broadcastDebounceRef.current = setTimeout(() => {
        if (!channelRef.current) return;
        
        // Generate native text for broadcast
        let senderNative = text;
        if (!isLatinScriptLanguage(currentUserLanguage) && isLatinText(text)) {
          senderNative = transliterateToNative(text, currentUserLanguage);
        }
        
        channelRef.current.send({
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
      }, 150);
    }

    // AUTO-STOP: Clear typing after 3 seconds of inactivity - NO BUTTON NEEDED
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      lastSentTextRef.current = '';
      
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stop_typing',
          payload: { userId: currentUserId }
        });
      }
    }, 3000);
  }, [enabled, currentUserId, currentUserLanguage]);

  // Clear preview after message sent - called programmatically, no button
  const clearPreview = useCallback(() => {
    setSenderNativePreview('');
    setIsTyping(false);
    lastSentTextRef.current = '';
    
    // Clear any pending timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = null;
    }
    if (broadcastDebounceRef.current) {
      clearTimeout(broadcastDebounceRef.current);
      broadcastDebounceRef.current = null;
    }
    
    // Send stop typing broadcast
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { userId: currentUserId }
      });
    }
  }, [currentUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      if (broadcastDebounceRef.current) clearTimeout(broadcastDebounceRef.current);
    };
  }, []);

  return {
    sendTypingIndicator,
    clearPreview,
    senderNativePreview,
    partnerTyping,
    isTyping,
    isTranslating
  };
}

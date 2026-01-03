/**
 * Real-Time Translation Hook
 * 
 * Provides live translation for typing indicators:
 * - Sender sees their message converted to native script
 * - Recipient sees partial typing translated to their language
 * - Skips translation when same language
 * 
 * Uses embedded translation engine (LibreTranslate, MyMemory)
 * NO edge functions - all logic in client code
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isSameLanguage } from './language-detector';
import { translateText } from './translation-engine';

export interface TypingIndicator {
  userId: string;
  originalText: string;
  translatedText: string;
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

        const { text, senderLanguage } = payload;
        
        // If same language, just show original
        if (isSameLanguage(senderLanguage, currentUserLanguage)) {
          setPartnerTyping({
            userId: payload.userId,
            originalText: text,
            translatedText: text,
            isTranslating: false,
            senderLanguage,
            recipientLanguage: currentUserLanguage,
            timestamp: Date.now()
          });
          return;
        }

        // Show original with loading state
        setPartnerTyping({
          userId: payload.userId,
          originalText: text,
          translatedText: '',
          isTranslating: true,
          senderLanguage,
          recipientLanguage: currentUserLanguage,
          timestamp: Date.now()
        });

        // Translate to recipient's language using embedded engine
        try {
          const result = await translateText(text, {
            sourceLanguage: senderLanguage,
            targetLanguage: currentUserLanguage,
            mode: 'translate'
          });

          if (result.isTranslated && result.translatedText) {
            setPartnerTyping(prev => prev ? {
              ...prev,
              translatedText: result.translatedText,
              isTranslating: false
            } : null);
          } else {
            // Fallback if no translation
            setPartnerTyping(prev => prev ? {
              ...prev,
              translatedText: text,
              isTranslating: false
            } : null);
          }
        } catch (err) {
          console.error('[RealtimeTranslation] Failed to translate typing:', err);
          setPartnerTyping(prev => prev ? {
            ...prev,
            translatedText: text,
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

  // Send typing indicator
  const sendTypingIndicator = useCallback((text: string, partnerLanguage: string) => {
    if (!enabled || !channelRef.current || !text.trim()) return;
    
    // Don't resend if text hasn't changed significantly
    if (text === lastSentTextRef.current) return;
    lastSentTextRef.current = text;

    setIsTyping(true);
    setIsTranslating(true);

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
          text,
          senderLanguage: currentUserLanguage,
          timestamp: Date.now()
        }
      });
      setIsTranslating(false);
    }, 150);

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
    partnerTyping,
    isTyping,
    isTranslating
  };
}

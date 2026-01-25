/**
 * Real-Time Translation Hook - FULLY ASYNC & NON-BLOCKING
 * 
 * 100% Background Processing - Typing is NEVER affected:
 * - All translation runs in background via requestIdleCallback
 * - Sender sees live native script preview (MEANING-based, mother tongue)
 * - Recipient sees partner's typing translated to their mother tongue (MEANING-based)
 * - Same language: No translation needed
 * - Uses Edge Function APIs (LibreTranslate/MyMemory/Google) for semantic translation
 * 
 * NO NLLB-200 - NO HARDCODING - REAL SEMANTIC TRANSLATION
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
// SEMANTIC TRANSLATION via Edge Function APIs - replaces old phonetic system
import { 
  translateSemantic,
  isSameLanguageCheck,
  isEnglishLanguage 
} from './semantic-translate-api';

export interface TypingIndicator {
  userId: string;
  originalText: string;
  translatedText: string;
  nativePreview: string; // Semantic translation in receiver's mother tongue
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
  
  // Sender's native preview (what sender sees as they type - SEMANTIC translation)
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

        const { text, senderLanguage, senderNativeText, englishText } = payload;
        
        // Show sender's text immediately with loading state
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

        // BACKGROUND: Generate SEMANTIC translation for receiver using Edge Function
        const processReceiverPreview = async () => {
          try {
            let receiverNativeText = text;
            
            // If same language, no translation needed
            if (isSameLanguageCheck(senderLanguage, currentUserLanguage)) {
              // Same language - show as-is
              receiverNativeText = senderNativeText || text;
            } else {
              // Different languages - SEMANTIC translation via Edge Function API
              // Use English as bridge if available, else translate from sender's language
              if (englishText && englishText.trim()) {
                // Have English - translate to receiver's mother tongue
                console.log('[RealtimeTranslation] Translating English to receiver:', currentUserLanguage);
                const result = await translateSemantic(englishText, 'english', currentUserLanguage);
                receiverNativeText = result?.translatedText || text;
              } else if (isEnglishLanguage(senderLanguage)) {
                // Sender typed in English - translate to receiver
                console.log('[RealtimeTranslation] Sender is English, translating to receiver:', currentUserLanguage);
                const result = await translateSemantic(text, 'english', currentUserLanguage);
                receiverNativeText = result?.translatedText || text;
              } else {
                // Non-English sender - translate via Edge Function
                console.log('[RealtimeTranslation] Translating from', senderLanguage, 'to', currentUserLanguage);
                const result = await translateSemantic(text, senderLanguage, currentUserLanguage);
                receiverNativeText = result?.translatedText || text;
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
  // Generates SEMANTIC translation preview for sender (mother tongue)
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

    // IMMEDIATE: Generate sender's native preview in background (SEMANTIC translation)
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }

    // Debounce preview generation (300ms) for semantic translation
    previewDebounceRef.current = setTimeout(async () => {
      setIsTranslating(true);
      
      try {
        let senderNative = text;
        let englishMeaning = '';
        
        // If sender's language is English, no need to translate preview
        if (isEnglishLanguage(currentUserLanguage)) {
          senderNative = text;
          englishMeaning = text;
        } else {
          // SEMANTIC translation: English → sender's mother tongue
          console.log('[RealtimeTranslation] Generating sender preview:', currentUserLanguage);
          const result = await translateSemantic(text, 'english', currentUserLanguage);
          senderNative = result?.translatedText || text;
          englishMeaning = text; // Original English input
        }
        
        setSenderNativePreview(senderNative);
        setIsTranslating(false);
        
        // Also broadcast with the English meaning for receiver
        if (channelRef.current && text !== lastSentTextRef.current) {
          lastSentTextRef.current = text;
          
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
              userId: currentUserId,
              text, // Original English text
              senderNativeText: senderNative, // Sender's mother tongue translation
              englishText: englishMeaning, // English meaning for receiver to use
              senderLanguage: currentUserLanguage,
              timestamp: Date.now()
            }
          });
        }
      } catch (err) {
        console.error('[RealtimeTranslation] Preview generation failed:', err);
        setSenderNativePreview(text);
        setIsTranslating(false);
      }
    }, 300);

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

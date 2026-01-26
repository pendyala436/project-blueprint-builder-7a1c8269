/**
 * Real-Time Translation Hook - FULLY ASYNC & NON-BLOCKING
 * 
 * 100% Background Processing - Typing is NEVER affected:
 * - All translation runs in background via requestIdleCallback
 * - Sender sees live native script preview (MEANING-based, mother tongue)
 * - Recipient sees partner's typing translated to their mother tongue (MEANING-based)
 * - Same language: No translation needed
 * - Uses XENOVA BROWSER-BASED SDK for semantic translation (Zero server load)
 * 
 * FULLY CLIENT-SIDE - NO EDGE FUNCTIONS - REAL SEMANTIC TRANSLATION
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
// XENOVA BROWSER-BASED TRANSLATION SDK - replaces edge function calls
import { 
  translateText as xenovaTranslate,
  normalizeLanguageCode,
  isSameLanguage as xenovaSameLanguage,
  isEnglish as xenovaIsEnglish,
} from '@/lib/xenova-translate-sdk';

// Wrapper for legacy API compatibility
async function translateSemantic(text: string, source: string, target: string) {
  if (!text.trim()) return { translatedText: '', isTranslated: false };
  try {
    const result = await xenovaTranslate(text, source, target);
    return { translatedText: result.text, isTranslated: result.isTranslated };
  } catch (e) {
    console.error('[translateSemantic] Xenova error:', e);
    return { translatedText: text, isTranslated: false };
  }
}

function isSameLanguageCheck(lang1: string, lang2: string): boolean {
  return xenovaSameLanguage(lang1, lang2);
}

function isEnglishLanguage(lang: string): boolean {
  return xenovaIsEnglish(lang);
}

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
  // Uses requestIdleCallback/setTimeout(0) to ensure input is never blocked
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

    // IMMEDIATE: Clear previous debounce
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }

    // Debounce preview generation (400ms) - increased for smoother typing
    previewDebounceRef.current = setTimeout(() => {
      // Schedule translation in background using requestIdleCallback
      const processPreview = async () => {
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
            // Wrapped in try-catch to ensure errors don't block
            try {
              console.log('[RealtimeTranslation] Generating sender preview:', currentUserLanguage);
              const result = await translateSemantic(text, 'english', currentUserLanguage);
              senderNative = result?.translatedText || text;
              englishMeaning = text; // Original English input
            } catch (translateError) {
              console.warn('[RealtimeTranslation] Preview translation error (non-blocking):', translateError);
              senderNative = text;
              englishMeaning = text;
            }
          }
          
          setSenderNativePreview(senderNative);
          setIsTranslating(false);
          
          // Also broadcast with the English meaning for receiver
          if (channelRef.current && text !== lastSentTextRef.current) {
            lastSentTextRef.current = text;
            
            // Broadcast in next tick to not block
            setTimeout(() => {
              channelRef.current?.send({
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
            }, 0);
          }
        } catch (err) {
          console.warn('[RealtimeTranslation] Preview generation failed (non-blocking):', err);
          setSenderNativePreview(text);
          setIsTranslating(false);
        }
      };

      // Use requestIdleCallback if available for true non-blocking
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => processPreview(), { timeout: 2000 });
      } else {
        setTimeout(processPreview, 0);
      }
    }, 400);

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

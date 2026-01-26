/**
 * Real-Time Translation Hook - FULLY ASYNC & NON-BLOCKING
 * 
 * 100% Background Processing - Typing is NEVER affected:
 * - All translation runs in background via requestIdleCallback
 * - Sender sees live native script preview (MEANING-based, mother tongue)
 * - Recipient sees partner's typing translated to their mother tongue (MEANING-based)
 * - Same language: No translation needed
 * - Uses SUPABASE EDGE FUNCTION for semantic translation (reliable for all 1000+ languages)
 * 
 * FULLY BIDIRECTIONAL - Works for ALL input types:
 * - English typing → native preview + native receiver
 * - Native script (Gboard) → show as-is + translate for receiver
 * - Romanized input → transliterate + translate for receiver
 * - Voice-to-text → detect language + translate
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
// XENOVA BROWSER-BASED TRANSLATION SDK - use worker client for non-blocking translation
import { 
  normalizeLanguageCode,
  isSameLanguage as xenovaSameLanguage,
  isEnglish as xenovaIsEnglish,
} from '@/lib/xenova-translate-sdk';
import { translateInWorker } from '@/lib/xenova-translate-sdk/worker-client';

// Wrapper for legacy API compatibility - uses worker with fallback
async function translateSemantic(text: string, source: string, target: string) {
  if (!text.trim()) return { translatedText: '', isTranslated: false };
  try {
    const result = await translateInWorker(text, source, target);
    return { translatedText: result.text, isTranslated: result.isTranslated };
  } catch (e) {
    console.error('[translateSemantic] Translation error:', e);
    return { translatedText: text, isTranslated: false };
  }
}

/**
 * Full bidirectional translation using edge function
 * Handles ALL input types: English, native script, romanized, voice
 */
async function translateBidirectional(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{
  senderView: string;
  receiverView: string;
  englishCore: string;
  isTranslated: boolean;
}> {
  if (!text.trim()) {
    return { senderView: '', receiverView: '', englishCore: '', isTranslated: false };
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        senderLanguage: normalizeLanguageCode(senderLanguage),
        receiverLanguage: normalizeLanguageCode(receiverLanguage),
        mode: 'bidirectional',
      },
    });
    
    if (error) throw error;
    
    return {
      senderView: data?.senderView || text,
      receiverView: data?.receiverView || text,
      englishCore: data?.englishCore || text,
      isTranslated: data?.wasTranslated || false,
    };
  } catch (e) {
    console.error('[translateBidirectional] Edge function error:', e);
    
    // Fallback to browser-based translation
    try {
      const normSender = normalizeLanguageCode(senderLanguage);
      const normReceiver = normalizeLanguageCode(receiverLanguage);
      
      let senderView = text;
      let receiverView = text;
      let englishCore = text;
      
      // Get English meaning first
      if (!xenovaIsEnglish(senderLanguage)) {
        const toEnglish = await translateSemantic(text, normSender, 'en');
        if (toEnglish.isTranslated) {
          englishCore = toEnglish.translatedText;
        }
      }
      
      // Translate to receiver
      if (!xenovaSameLanguage(senderLanguage, receiverLanguage)) {
        const toReceiver = await translateSemantic(englishCore, 'en', normReceiver);
        if (toReceiver.isTranslated) {
          receiverView = toReceiver.translatedText;
        }
      }
      
      return { senderView, receiverView, englishCore, isTranslated: receiverView !== text };
    } catch (fallbackError) {
      console.error('[translateBidirectional] Fallback failed:', fallbackError);
      return { senderView: text, receiverView: text, englishCore: text, isTranslated: false };
    }
  }
}

function isSameLanguageCheck(lang1: string, lang2: string): boolean {
  return xenovaSameLanguage(lang1, lang2);
}

function isEnglishLanguage(lang: string): boolean {
  return xenovaIsEnglish(lang);
}

/**
 * Detect script type from text
 */
function detectScript(text: string): 'latin' | 'native' | 'mixed' {
  if (!text.trim()) return 'latin';
  const hasLatin = /[a-zA-Z]/.test(text);
  const hasNonLatin = /[^\x00-\x7F]/.test(text);
  
  if (hasLatin && hasNonLatin) return 'mixed';
  if (hasNonLatin) return 'native';
  return 'latin';
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

        const { text, senderLanguage, senderNativeText, englishText, receiverView } = payload;
        
        // Show sender's text immediately with loading state
        setPartnerTyping({
          userId: payload.userId,
          originalText: text,
          translatedText: receiverView || '',
          nativePreview: receiverView || senderNativeText || text,
          isTranslating: !receiverView,
          senderLanguage,
          recipientLanguage: currentUserLanguage,
          timestamp: Date.now()
        });

        // If receiver view is already provided, we're done
        if (receiverView && receiverView.trim()) {
          console.log('[RealtimeTranslation] Receiver view pre-computed:', receiverView.substring(0, 30));
          setPartnerTyping(prev => prev ? {
            ...prev,
            translatedText: receiverView,
            nativePreview: receiverView,
            isTranslating: false
          } : null);
          return;
        }

        // BACKGROUND: Generate SEMANTIC translation for receiver
        const processReceiverPreview = async () => {
          try {
            let receiverNativeText = text;
            
            // If same language, no translation needed
            if (isSameLanguageCheck(senderLanguage, currentUserLanguage)) {
              receiverNativeText = senderNativeText || text;
              console.log('[RealtimeTranslation] Same language, using sender view');
            } else {
              // Different languages - use bidirectional translation
              console.log('[RealtimeTranslation] Translating from', senderLanguage, 'to', currentUserLanguage);
              
              // Use the edge function for reliable translation
              const result = await translateBidirectional(
                senderNativeText || text,
                senderLanguage,
                currentUserLanguage
              );
              
              if (result.isTranslated && result.receiverView) {
                receiverNativeText = result.receiverView;
                console.log('[RealtimeTranslation] Receiver translation success:', receiverNativeText.substring(0, 30));
              } else {
                // Fallback: try English as bridge
                if (englishText && englishText.trim() && !isEnglishLanguage(currentUserLanguage)) {
                  const toReceiver = await translateSemantic(englishText, 'english', currentUserLanguage);
                  if (toReceiver.isTranslated) {
                    receiverNativeText = toReceiver.translatedText;
                  }
                }
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

    // Debounce preview generation (300ms) - short for responsive feel
    previewDebounceRef.current = setTimeout(() => {
      // Schedule translation in background using requestIdleCallback
      const processPreview = async () => {
        setIsTranslating(true);
        
        try {
          const scriptType = detectScript(text);
          let senderNative = text;
          let receiverView = '';
          let englishMeaning = '';
          
          // Determine handling based on script type
          if (isEnglishLanguage(currentUserLanguage)) {
            // Sender's language is English - input IS English
            senderNative = text;
            englishMeaning = text;
            
            // Translate to partner's language
            if (!isEnglishLanguage(partnerLanguage)) {
              const toPartner = await translateSemantic(text, 'english', partnerLanguage);
              receiverView = toPartner.translatedText || text;
            } else {
              receiverView = text;
            }
          } else if (scriptType === 'native') {
            // Sender typed in native script (Gboard/IME)
            // No transliteration needed - show as-is
            senderNative = text;
            
            // Use bidirectional translation for accurate receiver view
            const result = await translateBidirectional(text, currentUserLanguage, partnerLanguage);
            receiverView = result.receiverView || text;
            englishMeaning = result.englishCore || text;
            
            console.log('[RealtimeTranslation] Native input processed:', {
              senderNative: senderNative.substring(0, 20),
              receiverView: receiverView.substring(0, 20),
              englishMeaning: englishMeaning.substring(0, 20)
            });
          } else if (scriptType === 'latin') {
            // Latin script input - could be English or romanized native language
            // Use bidirectional edge function to handle properly
            const result = await translateBidirectional(text, currentUserLanguage, partnerLanguage);
            senderNative = result.senderView || text;
            receiverView = result.receiverView || text;
            englishMeaning = result.englishCore || text;
            
            console.log('[RealtimeTranslation] Latin input processed:', {
              senderNative: senderNative.substring(0, 20),
              receiverView: receiverView.substring(0, 20),
              englishMeaning: englishMeaning.substring(0, 20)
            });
          } else {
            // Mixed script - use bidirectional
            const result = await translateBidirectional(text, currentUserLanguage, partnerLanguage);
            senderNative = result.senderView || text;
            receiverView = result.receiverView || text;
            englishMeaning = result.englishCore || text;
          }
          
          setSenderNativePreview(senderNative);
          setIsTranslating(false);
          
          // Broadcast with all translations for receiver
          if (channelRef.current && text !== lastSentTextRef.current) {
            lastSentTextRef.current = text;
            
            // Broadcast in next tick to not block
            setTimeout(() => {
              channelRef.current?.send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                  userId: currentUserId,
                  text, // Original input text
                  senderNativeText: senderNative, // Sender's mother tongue view
                  englishText: englishMeaning, // English meaning for receiver to use
                  receiverView: receiverView, // Pre-computed receiver view
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

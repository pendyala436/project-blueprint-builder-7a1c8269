/**
 * Real-Time Translation Hook - FULLY ASYNC & NON-BLOCKING
 * 
 * Uses SUPABASE EDGE FUNCTION for semantic translation.
 * Browser-based models removed.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ============================================================
// UTILITIES
// ============================================================

function normalizeLanguageCode(lang: string): string {
  if (!lang) return 'en';
  const code = lang.toLowerCase().trim();
  const codeMap: Record<string, string> = {
    'english': 'en', 'hindi': 'hi', 'telugu': 'te', 'tamil': 'ta',
    'kannada': 'kn', 'malayalam': 'ml', 'marathi': 'mr', 'gujarati': 'gu',
    'bengali': 'bn', 'punjabi': 'pa', 'urdu': 'ur', 'odia': 'or',
  };
  return codeMap[code] || code.slice(0, 2);
}

function isSameLanguageCheck(lang1: string, lang2: string): boolean {
  return normalizeLanguageCode(lang1) === normalizeLanguageCode(lang2);
}

function isEnglishLanguage(lang: string): boolean {
  const code = normalizeLanguageCode(lang);
  return code === 'en' || code === 'english';
}

/**
 * Full bidirectional translation using edge function
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
    return { senderView: text, receiverView: text, englishCore: text, isTranslated: false };
  }
}

// ============================================================
// TYPES
// ============================================================

export interface TypingIndicator {
  userId: string;
  originalText: string;
  translatedText: string;
  nativePreview: string;
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
  sendTypingIndicator: (text: string, partnerLanguage: string) => void;
  clearPreview: () => void;
  senderNativePreview: string;
  partnerTyping: TypingIndicator | null;
  isTyping: boolean;
  isTranslating: boolean;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

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
  const lastSentTextRef = useRef<string>('');

  // Subscribe to typing channel
  useEffect(() => {
    if (!enabled || !channelId) return;

    const channel = supabase.channel(`typing:${channelId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === currentUserId) return;

        const { text, senderLanguage, senderNativeText, receiverView } = payload;
        
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

        if (receiverView && receiverView.trim()) {
          setPartnerTyping(prev => prev ? {
            ...prev,
            translatedText: receiverView,
            nativePreview: receiverView,
            isTranslating: false
          } : null);
          return;
        }

        // Background translation if needed
        const processReceiverPreview = async () => {
          try {
            let receiverNativeText = text;
            
            if (isSameLanguageCheck(senderLanguage, currentUserLanguage)) {
              receiverNativeText = senderNativeText || text;
            } else {
              const result = await translateBidirectional(
                senderNativeText || text,
                senderLanguage,
                currentUserLanguage
              );
              
              if (result.isTranslated && result.receiverView) {
                receiverNativeText = result.receiverView;
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

  const sendTypingIndicator = useCallback((text: string, partnerLanguage: string) => {
    if (!enabled || !text.trim()) {
      if (!text.trim()) {
        setSenderNativePreview('');
        setIsTyping(false);
      }
      return;
    }
    
    setIsTyping(true);

    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }

    previewDebounceRef.current = setTimeout(() => {
      const processPreview = async () => {
        setIsTranslating(true);
        
        try {
          const result = await translateBidirectional(text, currentUserLanguage, partnerLanguage);
          const senderNative = result.senderView || text;
          const receiverView = result.receiverView || text;
          const englishMeaning = result.englishCore || text;
          
          setSenderNativePreview(senderNative);
          setIsTranslating(false);
          
          if (channelRef.current && text !== lastSentTextRef.current) {
            lastSentTextRef.current = text;
            
            setTimeout(() => {
              channelRef.current?.send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                  userId: currentUserId,
                  text,
                  senderNativeText: senderNative,
                  englishText: englishMeaning,
                  receiverView: receiverView,
                  senderLanguage: currentUserLanguage,
                  timestamp: Date.now()
                }
              });
            }, 0);
          }
        } catch (err) {
          console.warn('[RealtimeTranslation] Preview generation failed:', err);
          setSenderNativePreview(text);
          setIsTranslating(false);
        }
      };

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => processPreview(), { timeout: 2000 });
      } else {
        setTimeout(processPreview, 0);
      }
    }, 300);

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

  const clearPreview = useCallback(() => {
    setSenderNativePreview('');
    setIsTyping(false);
    lastSentTextRef.current = '';
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = null;
    }
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { userId: currentUserId }
      });
    }
  }, [currentUserId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
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

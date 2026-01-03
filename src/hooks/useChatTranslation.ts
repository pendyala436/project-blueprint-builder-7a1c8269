/**
 * useChatTranslation - Comprehensive Chat Translation Hook
 * 
 * Features:
 * - Auto-detect source/target language from user profiles (mother tongue)
 * - Type in Latin letters → Live preview in native script
 * - Send: Translation happens in background (non-blocking)
 * - Sender sees: Their message in their native language
 * - Receiver sees: Message translated to their native language
 * - Bi-directional: Works both ways
 * - Non-blocking: Typing is never affected by translation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  translateText,
  convertToNativeScript,
  detectLanguage,
  isLatinScript as checkIsLatinScript,
  isSameLanguage as checkSameLanguage,
  normalizeLanguage
} from '@/lib/translation/translation-engine';
import { phoneticTransliterate, isPhoneticTransliterationSupported } from '@/lib/translation/phonetic-transliterator';

// Types
export interface TranslatedMessage {
  id: string;
  senderId: string;
  originalText: string;           // Original text as sent
  senderNativeText: string;       // Text in sender's native script
  receiverNativeText: string;     // Text translated to receiver's language
  displayText: string;            // What current user should see
  isTranslated: boolean;
  senderLanguage: string;
  receiverLanguage: string;
  createdAt: string;
}

export interface LivePreviewState {
  latinInput: string;             // What user is typing (Latin)
  nativePreview: string;          // Real-time native script preview
  isConverting: boolean;
}

export interface UseChatTranslationOptions {
  currentUserId: string;
  currentUserLanguage: string;    // Current user's mother tongue
  partnerId: string;
  partnerLanguage: string;        // Partner's mother tongue
  debounceMs?: number;
}

export interface UseChatTranslationReturn {
  // Live preview for typing
  livePreview: LivePreviewState;
  updateLivePreview: (latinText: string) => void;
  clearLivePreview: () => void;
  
  // Message processing
  processOutgoingMessage: (text: string) => Promise<{
    nativeText: string;
    originalLatin: string;
  }>;
  processIncomingMessage: (
    text: string, 
    senderId: string, 
    senderLanguage?: string
  ) => Promise<TranslatedMessage>;
  
  // Background translation for stored messages
  translateForReceiver: (
    text: string, 
    senderLang: string, 
    receiverLang: string
  ) => Promise<string>;
  
  // Utilities
  isLatinScript: (text: string) => boolean;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  needsTranslation: boolean;
  needsNativeConversion: boolean;
  
  // State
  isTranslating: boolean;
  error: string | null;
}

export function useChatTranslation(options: UseChatTranslationOptions): UseChatTranslationReturn {
  const {
    currentUserId,
    currentUserLanguage,
    partnerId,
    partnerLanguage,
    debounceMs = 150
  } = options;

  // Normalize languages
  const myLanguage = normalizeLanguage(currentUserLanguage);
  const theirLanguage = normalizeLanguage(partnerLanguage);

  // State
  const [livePreview, setLivePreview] = useState<LivePreviewState>({
    latinInput: '',
    nativePreview: '',
    isConverting: false
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for debouncing
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedInputRef = useRef<string>('');

  // Check if languages are same (no translation needed)
  const needsTranslation = !checkSameLanguage(myLanguage, theirLanguage);
  
  // Check if current user needs Latin → Native conversion
  const needsNativeConversion = myLanguage !== 'english' && myLanguage !== 'en';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /**
   * Update live preview as user types in Latin
   * Uses phonetic transliteration for instant preview
   */
  const updateLivePreview = useCallback((latinText: string) => {
    const trimmed = latinText.trim();
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Update Latin input immediately (never block typing)
    setLivePreview(prev => ({ ...prev, latinInput: latinText }));

    // If empty, clear preview
    if (!trimmed) {
      setLivePreview({ latinInput: '', nativePreview: '', isConverting: false });
      lastProcessedInputRef.current = '';
      return;
    }

    // If user's language is English, no conversion needed
    if (!needsNativeConversion) {
      setLivePreview(prev => ({ ...prev, nativePreview: trimmed, isConverting: false }));
      return;
    }

    // If already non-Latin, show as-is
    if (!checkIsLatinScript(trimmed)) {
      setLivePreview(prev => ({ ...prev, nativePreview: trimmed, isConverting: false }));
      lastProcessedInputRef.current = '';
      return;
    }

    // Skip if same as last processed
    if (lastProcessedInputRef.current === trimmed) {
      return;
    }

    // Show converting state
    setLivePreview(prev => ({ ...prev, isConverting: true }));

    // Debounced conversion
    debounceRef.current = setTimeout(async () => {
      try {
        lastProcessedInputRef.current = trimmed;

        // First try fast phonetic transliteration
        if (isPhoneticTransliterationSupported(myLanguage)) {
          const phoneticResult = phoneticTransliterate(trimmed, myLanguage);
          if (phoneticResult && phoneticResult !== trimmed) {
            setLivePreview(prev => ({ 
              ...prev, 
              nativePreview: phoneticResult, 
              isConverting: false 
            }));
            return;
          }
        }

        // Fallback to full conversion (dictionary + edge function)
        const converted = await convertToNativeScript(trimmed, myLanguage);
        setLivePreview(prev => ({
          ...prev,
          nativePreview: converted || trimmed,
          isConverting: false
        }));
      } catch (err) {
        console.error('[ChatTranslation] Preview error:', err);
        // On error, show Latin input
        setLivePreview(prev => ({ 
          ...prev, 
          nativePreview: trimmed, 
          isConverting: false 
        }));
      }
    }, debounceMs);
  }, [myLanguage, needsNativeConversion, debounceMs]);

  /**
   * Clear live preview (call on send)
   */
  const clearLivePreview = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setLivePreview({ latinInput: '', nativePreview: '', isConverting: false });
    lastProcessedInputRef.current = '';
  }, []);

  /**
   * Process outgoing message before sending
   * Converts Latin to sender's native script
   * Returns immediately with best available result
   */
  const processOutgoingMessage = useCallback(async (text: string): Promise<{
    nativeText: string;
    originalLatin: string;
  }> => {
    const trimmed = text.trim();
    
    if (!trimmed) {
      return { nativeText: '', originalLatin: '' };
    }

    // If user's language is English, no conversion needed
    if (!needsNativeConversion) {
      return { nativeText: trimmed, originalLatin: trimmed };
    }

    // If already non-Latin, it's already in native script
    if (!checkIsLatinScript(trimmed)) {
      return { nativeText: trimmed, originalLatin: '' };
    }

    // Check if we have a ready preview that matches
    if (livePreview.nativePreview && 
        livePreview.latinInput.trim() === trimmed &&
        !checkIsLatinScript(livePreview.nativePreview)) {
      return { 
        nativeText: livePreview.nativePreview, 
        originalLatin: trimmed 
      };
    }

    // Need to convert now
    try {
      // First try fast phonetic
      if (isPhoneticTransliterationSupported(myLanguage)) {
        const phoneticResult = phoneticTransliterate(trimmed, myLanguage);
        if (phoneticResult && phoneticResult !== trimmed) {
          return { nativeText: phoneticResult, originalLatin: trimmed };
        }
      }

      // Full conversion
      const converted = await convertToNativeScript(trimmed, myLanguage);
      return { 
        nativeText: converted || trimmed, 
        originalLatin: trimmed 
      };
    } catch (err) {
      console.error('[ChatTranslation] Outgoing conversion error:', err);
      return { nativeText: trimmed, originalLatin: trimmed };
    }
  }, [myLanguage, needsNativeConversion, livePreview]);

  /**
   * Translate text from sender's language to receiver's language
   * Used for background translation when message is received
   */
  const translateForReceiver = useCallback(async (
    text: string,
    senderLang: string,
    receiverLang: string
  ): Promise<string> => {
    const normSender = normalizeLanguage(senderLang);
    const normReceiver = normalizeLanguage(receiverLang);

    // Same language - no translation needed
    if (checkSameLanguage(normSender, normReceiver)) {
      return text;
    }

    try {
      setIsTranslating(true);
      const result = await translateText(text, {
        sourceLanguage: normSender,
        targetLanguage: normReceiver,
        mode: 'translate'
      });
      return result.translatedText || text;
    } catch (err) {
      console.error('[ChatTranslation] Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  /**
   * Process incoming message for display
   * Translates from sender's language to current user's language
   */
  const processIncomingMessage = useCallback(async (
    text: string,
    senderId: string,
    senderLanguage?: string
  ): Promise<TranslatedMessage> => {
    const trimmed = text.trim();
    const now = new Date().toISOString();
    
    // Determine sender language
    const senderLang = senderLanguage 
      ? normalizeLanguage(senderLanguage) 
      : (senderId === currentUserId ? myLanguage : theirLanguage);
    
    // Determine what language this user should see
    const targetLang = senderId === currentUserId ? myLanguage : myLanguage;

    // Base message
    const baseMessage: TranslatedMessage = {
      id: `msg-${Date.now()}`,
      senderId,
      originalText: trimmed,
      senderNativeText: trimmed,
      receiverNativeText: trimmed,
      displayText: trimmed,
      isTranslated: false,
      senderLanguage: senderLang,
      receiverLanguage: targetLang,
      createdAt: now
    };

    // If it's my own message, I see it as I sent it (already in my native)
    if (senderId === currentUserId) {
      return baseMessage;
    }

    // If same language, no translation needed
    if (checkSameLanguage(senderLang, myLanguage)) {
      return baseMessage;
    }

    // Translate partner's message to my language
    try {
      const translated = await translateForReceiver(trimmed, senderLang, myLanguage);
      return {
        ...baseMessage,
        receiverNativeText: translated,
        displayText: translated,
        isTranslated: translated !== trimmed
      };
    } catch (err) {
      console.error('[ChatTranslation] Incoming message error:', err);
      return baseMessage;
    }
  }, [currentUserId, myLanguage, theirLanguage, translateForReceiver]);

  return {
    livePreview,
    updateLivePreview,
    clearLivePreview,
    processOutgoingMessage,
    processIncomingMessage,
    translateForReceiver,
    isLatinScript: checkIsLatinScript,
    isSameLanguage: checkSameLanguage,
    needsTranslation,
    needsNativeConversion,
    isTranslating,
    error
  };
}

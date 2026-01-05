/**
 * useChatTranslation - NLLB-200 Chat Translation Hook
 * 
 * Uses NLLB-200 model for 200+ language translation
 * 
 * Features:
 * - Auto-detect source/target language from user profiles (mother tongue)
 * - Type in Latin letters → Live preview in native script (non-blocking)
 * - Send: Translation happens in background (non-blocking)
 * - Sender sees: Their message in their native language in chat
 * - Receiver sees: Message translated to their native language
 * - Bi-directional: Works both ways
 * - Non-blocking: Typing is never affected by translation
 * - Spell correction on Latin input
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  initializeNLLB,
  translateWithNLLB,
  isNLLBLoaded,
  getNLLBCode,
} from '@/lib/translation/nllb-translator';
import { correctSpelling } from '@/lib/translation/spell-corrector';
import { phoneticTransliterate, isPhoneticTransliterationSupported } from '@/lib/translation/phonetic-transliterator';
import { detectLanguage as detectLang, isLatinScript as checkIsLatinScript } from '@/lib/translation/language-detector';
import { normalizeLanguage } from '@/lib/translation/language-codes';

// Types
export interface TranslatedMessage {
  id: string;
  senderId: string;
  originalText: string;
  senderNativeText: string;
  receiverNativeText: string;
  displayText: string;
  isTranslated: boolean;
  senderLanguage: string;
  receiverLanguage: string;
  detectedLanguage?: string;
  createdAt: string;
}

export interface LivePreviewState {
  latinInput: string;
  nativePreview: string;
  isConverting: boolean;
}

export interface UseChatTranslationOptions {
  currentUserId: string;
  currentUserLanguage: string;
  partnerId: string;
  partnerLanguage: string;
  debounceMs?: number;
  autoDetectLanguage?: boolean;
}

export interface UseChatTranslationReturn {
  livePreview: LivePreviewState;
  updateLivePreview: (latinText: string) => void;
  clearLivePreview: () => void;
  processOutgoingMessage: (text: string) => Promise<{
    nativeText: string;
    originalLatin: string;
    translatedForReceiver: string;
  }>;
  processIncomingMessage: (
    text: string, 
    senderId: string, 
    senderLanguage?: string
  ) => Promise<TranslatedMessage>;
  translateForReceiver: (
    text: string, 
    senderLang: string, 
    receiverLang: string
  ) => Promise<string>;
  autoDetectLanguage: (text: string) => string;
  isLatinScript: (text: string) => boolean;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  needsTranslation: boolean;
  needsNativeConversion: boolean;
  isTranslating: boolean;
  error: string | null;
}

const isEnglish = (lang: string): boolean => {
  const norm = normalizeLanguage(lang);
  return norm === 'english' || norm === 'en';
};

export function useChatTranslation(options: UseChatTranslationOptions): UseChatTranslationReturn {
  const {
    currentUserId,
    currentUserLanguage,
    partnerId,
    partnerLanguage,
    debounceMs = 100
  } = options;

  const myLanguage = normalizeLanguage(currentUserLanguage);
  const theirLanguage = normalizeLanguage(partnerLanguage);

  const [livePreview, setLivePreview] = useState<LivePreviewState>({
    latinInput: '',
    nativePreview: '',
    isConverting: false
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedRef = useRef<string>('');

  const needsTranslation = getNLLBCode(myLanguage) !== getNLLBCode(theirLanguage);
  const needsNativeConversion = !isEnglish(myLanguage);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const updateLivePreview = useCallback((latinText: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = latinText.trim();
    setLivePreview(prev => ({ ...prev, latinInput: latinText }));

    if (!trimmed) {
      setLivePreview({ latinInput: '', nativePreview: '', isConverting: false });
      lastProcessedRef.current = '';
      return;
    }

    if (!needsNativeConversion) {
      const corrected = correctSpelling(trimmed);
      setLivePreview(prev => ({ ...prev, nativePreview: corrected, isConverting: false }));
      return;
    }

    if (!checkIsLatinScript(trimmed)) {
      setLivePreview(prev => ({ ...prev, nativePreview: trimmed, isConverting: false }));
      lastProcessedRef.current = '';
      return;
    }

    if (lastProcessedRef.current === trimmed) {
      return;
    }

    setLivePreview(prev => ({ ...prev, isConverting: true }));

    debounceRef.current = setTimeout(async () => {
      try {
        lastProcessedRef.current = trimmed;
        const corrected = correctSpelling(trimmed);

        let nativePreview = corrected;
        if (isPhoneticTransliterationSupported(myLanguage)) {
          const transliterated = phoneticTransliterate(corrected, myLanguage);
          if (transliterated && transliterated !== corrected) {
            nativePreview = transliterated;
          }
        }

        setLivePreview(prev => ({
          ...prev,
          nativePreview,
          isConverting: false
        }));
      } catch (err) {
        console.error('[ChatTranslation] Preview error:', err);
        setLivePreview(prev => ({ 
          ...prev, 
          nativePreview: trimmed, 
          isConverting: false 
        }));
      }
    }, debounceMs);
  }, [myLanguage, needsNativeConversion, debounceMs]);

  const clearLivePreview = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setLivePreview({ latinInput: '', nativePreview: '', isConverting: false });
    lastProcessedRef.current = '';
  }, []);

  const processOutgoingMessage = useCallback(async (text: string): Promise<{
    nativeText: string;
    originalLatin: string;
    translatedForReceiver: string;
  }> => {
    const trimmed = text.trim();
    
    if (!trimmed) {
      return { nativeText: '', originalLatin: '', translatedForReceiver: '' };
    }

    const correctedText = correctSpelling(trimmed);
    let nativeText = correctedText;
    const originalLatin = checkIsLatinScript(trimmed) ? trimmed : '';

    if (needsNativeConversion && checkIsLatinScript(correctedText)) {
      if (livePreview.nativePreview && 
          livePreview.latinInput.trim() === trimmed &&
          !checkIsLatinScript(livePreview.nativePreview)) {
        nativeText = livePreview.nativePreview;
      } else if (isPhoneticTransliterationSupported(myLanguage)) {
        const transliterated = phoneticTransliterate(correctedText, myLanguage);
        if (transliterated && transliterated !== correctedText) {
          nativeText = transliterated;
        }
      }
    }

    let translatedForReceiver = nativeText;
    if (needsTranslation) {
      try {
        setIsTranslating(true);
        if (!isNLLBLoaded()) {
          await initializeNLLB();
        }
        const translated = await translateWithNLLB(nativeText, myLanguage, theirLanguage);
        if (translated && translated !== nativeText) {
          translatedForReceiver = translated;
        }
      } catch (err) {
        console.error('[ChatTranslation] Translation error:', err);
        setError(err instanceof Error ? err.message : 'Translation failed');
      } finally {
        setIsTranslating(false);
      }
    }

    return { nativeText, originalLatin, translatedForReceiver };
  }, [myLanguage, theirLanguage, needsNativeConversion, needsTranslation, livePreview]);

  const translateForReceiver = useCallback(async (
    text: string,
    senderLang: string,
    receiverLang: string
  ): Promise<string> => {
    const normSender = normalizeLanguage(senderLang);
    const normReceiver = normalizeLanguage(receiverLang);

    if (getNLLBCode(normSender) === getNLLBCode(normReceiver)) {
      return text;
    }

    try {
      setIsTranslating(true);
      if (!isNLLBLoaded()) {
        await initializeNLLB();
      }
      const result = await translateWithNLLB(text, normSender, normReceiver);
      return result || text;
    } catch (err) {
      console.error('[ChatTranslation] Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const processIncomingMessage = useCallback(async (
    text: string,
    senderId: string,
    senderLanguage?: string
  ): Promise<TranslatedMessage> => {
    const trimmed = text.trim();
    const now = new Date().toISOString();
    
    const senderLang = senderLanguage 
      ? normalizeLanguage(senderLanguage) 
      : (senderId === currentUserId ? myLanguage : theirLanguage);
    
    const targetLang = myLanguage;

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

    if (senderId === currentUserId) {
      return baseMessage;
    }

    if (getNLLBCode(senderLang) === getNLLBCode(myLanguage)) {
      return baseMessage;
    }

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

  const autoDetectLang = useCallback((text: string): string => {
    if (!text.trim()) return myLanguage;
    const result = detectLang(text);
    return result.language || myLanguage;
  }, [myLanguage]);

  const isSameLanguage = useCallback((lang1: string, lang2: string): boolean => {
    return getNLLBCode(normalizeLanguage(lang1)) === getNLLBCode(normalizeLanguage(lang2));
  }, []);

  return {
    livePreview,
    updateLivePreview,
    clearLivePreview,
    processOutgoingMessage,
    processIncomingMessage,
    translateForReceiver,
    autoDetectLanguage: autoDetectLang,
    isLatinScript: checkIsLatinScript,
    isSameLanguage,
    needsTranslation,
    needsNativeConversion,
    isTranslating,
    error
  };
}

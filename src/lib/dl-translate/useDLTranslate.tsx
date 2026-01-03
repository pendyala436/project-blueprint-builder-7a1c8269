/**
 * React Hook for DL-Translate
 * 
 * 100% Local - No External API Calls
 * Uses NLLB-200 model via @huggingface/transformers for 200+ languages
 * 
 * Based on: https://github.com/xhluca/dl-translate
 * 
 * Translation methods:
 * 1. Dictionary Translation + Phonetic Transliteration (instant, browser)
 * 2. DL-Translate HuggingFace API (fallback) - 200+ languages
 */

import { useState, useCallback } from 'react';
import { 
  translateText, 
  convertToNativeScript, 
  clearTranslationCache,
  detectLanguage as detectLang,
  isLatinScript as isLatinScriptFn,
  isSameLanguage as isSameLanguageFn,
  normalizeLanguage
} from '@/lib/translation/translation-engine';

// Types
export interface TranslationResult {
  text: string;
  originalText: string;
  source: string;
  target: string;
  isTranslated: boolean;
  mode: 'translate' | 'convert' | 'passthrough' | 'dictionary' | 'phonetic' | 'neural' | 'same_language';
}

export interface ChatTranslationOptions {
  senderLanguage: string;
  receiverLanguage: string;
}

interface UseDLTranslateReturn {
  translate: (text: string, source?: string, target?: string) => Promise<TranslationResult>;
  translateForChat: (text: string, options: ChatTranslationOptions) => Promise<TranslationResult>;
  convertToNative: (text: string, targetLanguage: string) => Promise<TranslationResult>;
  detect: (text: string) => { language: string; isLatin: boolean };
  detectLanguage: (text: string) => string;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  isLatinScript: (text: string) => boolean;
  getNativeName: (language: string) => string;
  isTranslating: boolean;
  error: string | null;
  clearCache: () => void;
}

const NATIVE_NAMES: Record<string, string> = {
  english: 'English', hindi: 'हिंदी', bengali: 'বাংলা', telugu: 'తెలుగు', 
  marathi: 'मराठी', tamil: 'தமிழ்', gujarati: 'ગુજરાતી', kannada: 'ಕನ್ನಡ',
  malayalam: 'മലയാളം', punjabi: 'ਪੰਜਾਬੀ', odia: 'ଓଡ଼ିଆ', urdu: 'اردو',
  arabic: 'العربية', spanish: 'Español', french: 'Français', german: 'Deutsch',
  chinese: '中文', japanese: '日本語', korean: '한국어', russian: 'Русский',
  portuguese: 'Português', italian: 'Italiano', dutch: 'Nederlands'
};

export function useDLTranslate(): UseDLTranslateReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (
    text: string,
    source?: string,
    target?: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { text, originalText: text, source: source || 'english', target: target || 'english', isTranslated: false, mode: 'passthrough' };
    }

    const effectiveTarget = target || 'english';
    if (source && isSameLanguageFn(source, effectiveTarget)) {
      return { text: trimmed, originalText: trimmed, source, target: effectiveTarget, isTranslated: false, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateText(trimmed, {
        sourceLanguage: source || 'auto',
        targetLanguage: effectiveTarget,
        mode: 'translate'
      });

      return {
        text: result.translatedText,
        originalText: result.originalText,
        source: result.sourceLanguage,
        target: result.targetLanguage,
        isTranslated: result.isTranslated,
        mode: result.mode === 'same_language' ? 'passthrough' : result.mode
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
      return { text: trimmed, originalText: trimmed, source: source || 'english', target: effectiveTarget, isTranslated: false, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const translateForChat = useCallback(async (
    text: string,
    options: ChatTranslationOptions
  ): Promise<TranslationResult> => {
    const { senderLanguage, receiverLanguage } = options;
    const trimmed = text.trim();

    console.log('[useDLTranslate] translateForChat:', { 
      text: trimmed.slice(0, 30), 
      from: senderLanguage, 
      to: receiverLanguage 
    });

    if (!trimmed) {
      return { text, originalText: text, source: senderLanguage, target: receiverLanguage, isTranslated: false, mode: 'passthrough' };
    }

    if (isSameLanguageFn(senderLanguage, receiverLanguage)) {
      console.log('[useDLTranslate] Same language, passthrough');
      return { text: trimmed, originalText: trimmed, source: senderLanguage, target: receiverLanguage, isTranslated: false, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateText(trimmed, {
        sourceLanguage: senderLanguage,
        targetLanguage: receiverLanguage,
        mode: 'translate'
      });

      console.log('[useDLTranslate] Translation result:', {
        original: result.originalText?.slice(0, 30),
        translated: result.translatedText?.slice(0, 30),
        isTranslated: result.isTranslated,
        mode: result.mode
      });

      return {
        text: result.translatedText,
        originalText: result.originalText,
        source: result.sourceLanguage,
        target: result.targetLanguage,
        isTranslated: result.isTranslated,
        mode: result.mode === 'same_language' ? 'passthrough' : result.mode
      };
    } catch (err) {
      console.error('[useDLTranslate] Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      return { text: trimmed, originalText: trimmed, source: senderLanguage, target: receiverLanguage, isTranslated: false, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const convertToNative = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    if (!trimmed || !isLatinScriptFn(trimmed)) {
      return { text: trimmed || text, originalText: text, source: 'english', target: targetLanguage, isTranslated: false, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const converted = await convertToNativeScript(trimmed, targetLanguage);
      return {
        text: converted,
        originalText: trimmed,
        source: 'english',
        target: targetLanguage,
        isTranslated: converted !== trimmed,
        mode: 'convert'
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
      return { text: trimmed, originalText: trimmed, source: 'english', target: targetLanguage, isTranslated: false, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const detect = useCallback((text: string) => {
    const result = detectLang(text);
    return { language: result.language, isLatin: result.isLatin };
  }, []);

  const detectLanguage = useCallback((text: string) => {
    return detectLang(text).language;
  }, []);

  const getNativeName = useCallback((language: string) => {
    return NATIVE_NAMES[normalizeLanguage(language)] || language;
  }, []);

  const clearCache = useCallback(() => {
    clearTranslationCache();
  }, []);

  return {
    translate,
    translateForChat,
    convertToNative,
    detect,
    detectLanguage,
    isSameLanguage: isSameLanguageFn,
    isLatinScript: isLatinScriptFn,
    getNativeName,
    isTranslating,
    error,
    clearCache
  };
}

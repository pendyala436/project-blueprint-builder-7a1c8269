/**
 * Real-Time Chat Translation Hook (Unified)
 * ==========================================
 * 
 * SINGLE SOURCE: Uses translateText from @/lib/translation/translate
 * 
 * TYPING: Dynamic Transliterator
 * - Uses dynamic transliteration for all 1000+ languages
 * - Instant, sync, client-side conversion
 * 
 * TRANSLATION: Universal Translator (translateText)
 * - Semantic meaning-based translation between any language pair
 * - Async via Edge Function
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  translateText,
  isSameLanguage,
  isLatinText,
  isLatinScriptLanguage,
  needsScriptConversion,
  autoDetectLanguage,
  normalizeLanguage,
} from '@/lib/translation/translate';
import { dynamicTransliterate } from '@/lib/translation/dynamic-transliterator';

// ============================================================
// TYPES
// ============================================================

export interface ChatMessageResult {
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
  processingTime: number;
}

export interface LivePreviewResult {
  preview: string;
  isLatin: boolean;
  processingTime: number;
}

export interface AutoDetectedLanguage {
  language: string;
  script: string;
  isLatin: boolean;
  confidence: number;
}

// ============================================================
// CACHE
// ============================================================

const previewCache = new Map<string, string>();
const MAX_CACHE = 2000;

function getCacheKey(text: string, lang: string): string {
  return text.length <= 50 ? `${lang}|${text}` : `${lang}|${text.slice(0, 50)}`;
}

// ============================================================
// QUICK HELPER FUNCTIONS
// ============================================================

function quickTransliterate(text: string, language: string): string {
  try {
    const result = dynamicTransliterate(text, language);
    return result || text;
  } catch {
    return text;
  }
}

function isQuickLatinText(text: string): boolean {
  if (!text.trim()) return true;
  const sample = text.slice(0, 100);
  let latinChars = 0;
  let nonAscii = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) latinChars++;
    else if (c > 127) nonAscii++;
  }
  return latinChars > nonAscii;
}

// ============================================================
// HOOK
// ============================================================

export function useRealtimeChatTranslation(
  senderLanguage?: string,
  receiverLanguage?: string
) {
  const [isReady, setIsReady] = useState(true);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(100);
  const [error, setError] = useState<string | null>(null);

  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const normalizeLang = (lang?: string): string => {
    if (!lang || typeof lang !== 'string') return 'english';
    return normalizeLanguage(lang);
  };

  const senderLang = normalizeLang(senderLanguage);
  const receiverLang = normalizeLang(receiverLanguage);
  const sameLanguage = isSameLanguage(senderLang, receiverLang);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
    };
  }, []);

  // ============================================================
  // INSTANT PREVIEW (Sync, dynamic transliterator)
  // ============================================================

  const getLivePreview = useCallback((text: string, language?: string): LivePreviewResult => {
    const startTime = performance.now();
    const targetLang = normalizeLang(language || senderLanguage);

    if (!text || !text.trim()) {
      return { preview: '', isLatin: true, processingTime: 0 };
    }

    const isLatin = isQuickLatinText(text);

    if (isLatinScriptLanguage(targetLang)) {
      return { preview: text, isLatin, processingTime: performance.now() - startTime };
    }

    if (!isLatin) {
      return { preview: text, isLatin: false, processingTime: performance.now() - startTime };
    }

    const cacheKey = getCacheKey(text, targetLang);
    const cached = previewCache.get(cacheKey);
    if (cached) {
      return { preview: cached, isLatin: true, processingTime: performance.now() - startTime };
    }

    const preview = quickTransliterate(text, targetLang);
    
    if (previewCache.size >= MAX_CACHE) {
      const firstKey = previewCache.keys().next().value;
      if (firstKey) previewCache.delete(firstKey);
    }
    previewCache.set(cacheKey, preview);

    return { preview, isLatin: true, processingTime: performance.now() - startTime };
  }, [senderLanguage]);

  const getInstantPreview = getLivePreview;

  // ============================================================
  // PROCESS MESSAGE (Async, uses translateText)
  // ============================================================

  const processMessage = useCallback(async (
    text: string,
    fromLanguage?: string,
    toLanguage?: string
  ): Promise<ChatMessageResult> => {
    const startTime = performance.now();
    const srcLang = normalizeLang(fromLanguage || senderLanguage);
    const tgtLang = normalizeLang(toLanguage || receiverLanguage);

    if (!text || !text.trim()) {
      return {
        senderView: '',
        receiverView: '',
        originalText: '',
        wasTransliterated: false,
        wasTranslated: false,
        processingTime: 0,
      };
    }

    const trimmed = text.trim();
    let senderView = trimmed;
    let wasTransliterated = false;

    if (needsScriptConversion(srcLang) && isLatinText(trimmed)) {
      senderView = quickTransliterate(trimmed, srcLang);
      wasTransliterated = senderView !== trimmed;
    }

    if (isSameLanguage(srcLang, tgtLang)) {
      return {
        senderView,
        receiverView: senderView,
        originalText: trimmed,
        wasTransliterated,
        wasTranslated: false,
        processingTime: performance.now() - startTime,
      };
    }

    let receiverView = senderView;
    let wasTranslated = false;

    try {
      console.log(`[Chat Translation] translateText: ${srcLang} → ${tgtLang}`);
      
      const result = await translateText(senderView, srcLang, tgtLang);
      
      if (result.isTranslated && result.text !== senderView) {
        receiverView = result.text;
        wasTranslated = true;
        console.log(`[Chat Translation] Translated: "${senderView}" → "${receiverView}"`);
      }
    } catch (err) {
      console.error('[useRealtimeChatTranslation] Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    }

    return {
      senderView,
      receiverView,
      originalText: trimmed,
      wasTransliterated,
      wasTranslated,
      processingTime: performance.now() - startTime,
    };
  }, [senderLanguage, receiverLanguage]);

  // ============================================================
  // TRANSLATE TEXT (Async, uses translateText)
  // ============================================================

  const translateTextFn = useCallback(async (
    text: string,
    fromLanguage: string,
    toLanguage: string
  ): Promise<string> => {
    const from = normalizeLang(fromLanguage);
    const to = normalizeLang(toLanguage);

    if (!text.trim() || isSameLanguage(from, to)) {
      return text;
    }

    try {
      const result = await translateText(text, from, to);
      return result.isTranslated ? result.text : text;
    } catch {
      return text;
    }
  }, []);

  const translateIncoming = useCallback(async (
    text: string,
    fromLanguage: string
  ): Promise<string> => {
    return translateTextFn(text, fromLanguage, senderLang);
  }, [translateTextFn, senderLang]);

  // ============================================================
  // DEBOUNCED PREVIEW
  // ============================================================

  const updatePreviewDebounced = useCallback((
    text: string,
    language: string,
    callback: (preview: LivePreviewResult) => void,
    debounceMs: number = 50
  ) => {
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }

    previewDebounceRef.current = setTimeout(() => {
      const result = getLivePreview(text, language);
      callback(result);
    }, debounceMs);
  }, [getLivePreview]);

  const cancelPreview = useCallback(() => {
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = null;
    }
  }, []);

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  const detectInputLanguage = useCallback((text: string): AutoDetectedLanguage => {
    return autoDetectLanguage(text);
  }, []);

  const checkIsLatinText = useCallback((text: string): boolean => {
    return isLatinText(text);
  }, []);

  const checkIsLatinScriptLanguage = useCallback((lang: string): boolean => {
    return isLatinScriptLanguage(normalizeLang(lang));
  }, []);

  const checkSameLanguage = useCallback((lang1: string, lang2: string): boolean => {
    return isSameLanguage(normalizeLang(lang1), normalizeLang(lang2));
  }, []);

  return {
    isReady,
    isModelLoading,
    isLoading: isModelLoading,
    modelLoadProgress,
    loadProgress: modelLoadProgress,
    error,
    sameLanguage,
    getLivePreview,
    getInstantPreview,
    updatePreviewDebounced,
    cancelPreview,
    processMessage,
    translateText: translateTextFn,
    translateIncoming,
    detectInputLanguage,
    autoDetectLanguage: detectInputLanguage,
    checkIsLatinText,
    isLatinText: checkIsLatinText,
    checkIsLatinScriptLanguage,
    checkSameLanguage,
    isLatinScriptLanguage: checkIsLatinScriptLanguage,
    isSameLanguage: checkSameLanguage,
    normalizeUnicode: (text: string) => text.normalize('NFC'),
  };
}

// ============================================================
// EXPORTED UTILITY FUNCTIONS
// ============================================================

export function transliterate(text: string, language: string): string {
  return quickTransliterate(text, language);
}

export { isLatinScriptLanguage, isSameLanguage } from '@/lib/translation/translate';

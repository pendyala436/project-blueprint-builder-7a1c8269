/**
 * Real-Time Chat Translation Hook
 * ================================
 * Uses Edge Function for translation (server-side NLLB)
 * Dynamic phonetic transliteration for instant previews (client-side)
 * 
 * ARCHITECTURE:
 * - Main thread: Instant sync transliteration using dynamic phonetic mapping
 * - Edge Function: Translation via Supabase (server-side NLLB)
 * - Caching for performance
 * 
 * FLOW:
 * 1. Sender types Latin → Instant native preview (sync, dynamic transliterator)
 * 2. Sender sends → Native text shown immediately
 * 3. Background: Translation via Edge Function
 * 4. Receiver sees translated native text
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  translateAsync,
  convertToNativeScriptAsync,
  getNativeScriptPreview,
  isSameLanguage,
  isLatinText,
  isLatinScriptLanguage,
  needsScriptConversion,
  autoDetectLanguageSync,
} from '@/lib/translation/async-translator';
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
// QUICK HELPER FUNCTIONS (Sync, instant)
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
  const [isReady, setIsReady] = useState(true); // Always ready (Edge Function based)
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(100);
  const [error, setError] = useState<string | null>(null);

  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const normalizeLang = (lang?: string): string => {
    if (!lang || typeof lang !== 'string') return 'english';
    return lang.toLowerCase().trim() || 'english';
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

    // Latin script language - no conversion needed
    if (isLatinScriptLanguage(targetLang)) {
      return { preview: text, isLatin, processingTime: performance.now() - startTime };
    }

    // Already native script
    if (!isLatin) {
      return { preview: text, isLatin: false, processingTime: performance.now() - startTime };
    }

    // Check cache
    const cacheKey = getCacheKey(text, targetLang);
    const cached = previewCache.get(cacheKey);
    if (cached) {
      return { preview: cached, isLatin: true, processingTime: performance.now() - startTime };
    }

    // Transliterate
    const preview = quickTransliterate(text, targetLang);
    
    // Cache with LRU eviction
    if (previewCache.size >= MAX_CACHE) {
      const firstKey = previewCache.keys().next().value;
      if (firstKey) previewCache.delete(firstKey);
    }
    previewCache.set(cacheKey, preview);

    return { preview, isLatin: true, processingTime: performance.now() - startTime };
  }, [senderLanguage]);

  const getInstantPreview = getLivePreview;

  // ============================================================
  // PROCESS MESSAGE (Async, Edge Function with Auto-Detection)
  // ============================================================

  const processMessage = useCallback(async (
    text: string,
    fromLanguage?: string,
    toLanguage?: string
  ): Promise<ChatMessageResult> => {
    const startTime = performance.now();

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
    
    // AUTO-DETECT source language from actual text typed
    const detected = autoDetectLanguageSync(trimmed);
    const detectedSourceLang = detected.language;
    
    // Use detected language if it's a specific non-Latin script, 
    // otherwise fall back to explicit source language or 'english' for Latin text
    let srcLang: string;
    if (!detected.isLatin && detected.confidence > 0.8) {
      // Non-Latin script detected with high confidence - use it
      srcLang = detectedSourceLang;
      console.log(`[useRealtimeChatTranslation] Auto-detected source: ${srcLang} (${detected.script})`);
    } else if (detected.isLatin) {
      // Latin text - could be English or romanized text
      // Default to English for translation purposes
      srcLang = 'english';
      console.log(`[useRealtimeChatTranslation] Latin text, assuming English source`);
    } else {
      // Fall back to provided language
      srcLang = normalizeLang(fromLanguage || senderLanguage);
    }
    
    const tgtLang = normalizeLang(toLanguage || receiverLanguage);

    let senderView = trimmed;
    let wasTransliterated = false;

    // If sender specified a non-Latin language but typed in Latin,
    // convert to sender's native script for their view
    const explicitSenderLang = normalizeLang(fromLanguage || senderLanguage);
    if (needsScriptConversion(explicitSenderLang) && isLatinText(trimmed)) {
      const result = await convertToNativeScriptAsync(trimmed, explicitSenderLang);
      if (result.isTranslated) {
        senderView = result.text;
        wasTransliterated = true;
      }
    }

    // If same language, receiver sees same as sender
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

    // Translate via Edge Function with auto-detected source
    let receiverView = senderView;
    let wasTranslated = false;

    try {
      // Pass the original text for translation (Edge Function will auto-detect too)
      const result = await translateAsync(trimmed, srcLang, tgtLang);
      if (result.isTranslated) {
        receiverView = result.text;
        wasTranslated = true;

        // Convert to receiver's native script if needed
        if (needsScriptConversion(tgtLang) && isLatinText(receiverView)) {
          const nativeResult = await convertToNativeScriptAsync(receiverView, tgtLang);
          if (nativeResult.isTranslated) {
            receiverView = nativeResult.text;
          }
        }
      }
    } catch (err) {
      console.error('[useRealtimeChatTranslation] Translation error:', err);
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
  // TRANSLATE TEXT (Async, Edge Function)
  // ============================================================

  const translateText = useCallback(async (
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
      const result = await translateAsync(text, from, to);
      return result.isTranslated ? result.text : text;
    } catch {
      return text;
    }
  }, []);

  const translateIncoming = useCallback(async (
    text: string,
    fromLanguage: string
  ): Promise<string> => {
    return translateText(text, fromLanguage, senderLang);
  }, [translateText, senderLang]);

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
    return autoDetectLanguageSync(text);
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
    // State
    isReady,
    isModelLoading,
    isLoading: isModelLoading,
    modelLoadProgress,
    loadProgress: modelLoadProgress,
    error,
    sameLanguage,

    // Preview (instant)
    getLivePreview,
    getInstantPreview,
    updatePreviewDebounced,
    cancelPreview,

    // Message processing (async)
    processMessage,
    translateText,
    translateIncoming,

    // Utilities
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

export { isLatinScriptLanguage, isSameLanguage };

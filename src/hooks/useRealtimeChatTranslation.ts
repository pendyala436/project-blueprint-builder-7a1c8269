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
    
    // Sender's mother tongue (profile language)
    const motherTongue = normalizeLang(fromLanguage || senderLanguage);
    const tgtLang = normalizeLang(toLanguage || receiverLanguage);
    
    // Determine effective source language:
    // 1. If non-Latin script detected with high confidence, use detected language
    // 2. If Latin text typed by non-English mother tongue user, let edge function decide
    // 3. If Latin text by English user, use English
    let srcLang: string;
    let autoDetectFromText = false;
    
    if (!detected.isLatin && detected.confidence > 0.8) {
      // Non-Latin script detected with high confidence - use it
      srcLang = detectedSourceLang;
      console.log(`[useRealtimeChatTranslation] Auto-detected source: ${srcLang} (${detected.script})`);
    } else if (detected.isLatin) {
      // Latin text - let edge function auto-detect based on mother tongue
      // Pass 'auto' to signal the edge function to make the decision
      srcLang = 'auto';
      autoDetectFromText = true;
      console.log(`[useRealtimeChatTranslation] Latin text by ${motherTongue} speaker, auto-detecting`);
    } else {
      // Fall back to mother tongue
      srcLang = motherTongue;
    }

    let senderView = trimmed;
    let wasTransliterated = false;

    // If sender has a non-Latin mother tongue but typed in Latin,
    // check if it's English or romanized text for their view
    if (needsScriptConversion(motherTongue) && isLatinText(trimmed)) {
      // Only transliterate if it doesn't look like English
      const looksLikeEnglish = isLikelyEnglishWords(trimmed);
      if (!looksLikeEnglish) {
        const result = await convertToNativeScriptAsync(trimmed, motherTongue);
        if (result.isTranslated) {
          senderView = result.text;
          wasTransliterated = true;
        }
      }
    }

    // If same language, receiver sees same as sender
    const effectiveSrc = autoDetectFromText ? motherTongue : srcLang;
    if (isSameLanguage(effectiveSrc, tgtLang) && !autoDetectFromText) {
      return {
        senderView,
        receiverView: senderView,
        originalText: trimmed,
        wasTransliterated,
        wasTranslated: false,
        processingTime: performance.now() - startTime,
      };
    }

    // Translate via Edge Function with mother tongue context
    let receiverView = senderView;
    let wasTranslated = false;

    try {
      // Pass original text, auto-detect signal, and mother tongue for context
      const result = await translateAsync(
        trimmed, 
        autoDetectFromText ? 'auto' : srcLang, 
        tgtLang,
        true, // autoDetect flag
        motherTongue // pass mother tongue for context
      );
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

  // Helper to detect English words in Latin text
  const isLikelyEnglishWords = (text: string): boolean => {
    const cleanText = text.toLowerCase().trim();
    const englishWords = new Set([
      'hello', 'hi', 'hey', 'bye', 'good', 'morning', 'evening', 'night', 'afternoon',
      'how', 'are', 'you', 'what', 'is', 'the', 'a', 'an', 'this', 'that', 'it',
      'yes', 'no', 'ok', 'okay', 'please', 'thank', 'thanks', 'sorry', 'welcome',
      'love', 'like', 'nice', 'great', 'bad', 'happy', 'sad', 'fine',
      'where', 'when', 'why', 'who', 'which', 'can', 'will', 'would', 'could', 'should',
      'i', 'me', 'my', 'we', 'us', 'our', 'they', 'them', 'their', 'he', 'she',
      'do', 'does', 'did', 'have', 'has', 'had', 'am', 'was', 'were',
      'go', 'going', 'come', 'coming', 'see', 'look', 'want', 'need', 'help',
    ]);
    
    const words = cleanText.split(/\s+/);
    const englishWordCount = words.filter(w => englishWords.has(w.toLowerCase())).length;
    
    // Single word English check
    if (words.length === 1 && englishWords.has(cleanText)) {
      return true;
    }
    
    // If more than 40% are English words
    return words.length > 0 && englishWordCount / words.length >= 0.4;
  };

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

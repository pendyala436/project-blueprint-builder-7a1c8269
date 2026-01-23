/**
 * Offline Translation Hook
 * ========================
 * 
 * React hook for offline translation using Supabase-stored dictionaries
 * and dynamic transliteration. No external APIs required.
 * 
 * Features:
 * - Instant transliteration preview
 * - Common phrase lookup
 * - Dictionary-based translation
 * - English pivot for cross-language
 * - Fully offline capable
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  translateOffline,
  translateBidirectionalOffline,
  initializeOfflineTranslator,
  isReady,
  clearCache,
  getCacheStats,
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  getLanguages,
  getLanguageCount,
  dynamicTransliterate,
  reverseTransliterate,
  type OfflineTranslationResult,
  type BidirectionalResult,
} from '@/lib/translation/offline-translator';

// ============================================================
// TYPES
// ============================================================

export interface UseOfflineTranslationOptions {
  senderLanguage?: string;
  receiverLanguage?: string;
  autoInitialize?: boolean;
}

export interface TranslationState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LivePreviewResult {
  preview: string;
  isLatin: boolean;
  isTransliterated: boolean;
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useOfflineTranslation(options: UseOfflineTranslationOptions = {}) {
  const {
    senderLanguage = 'english',
    receiverLanguage = 'english',
    autoInitialize = true,
  } = options;

  const [state, setState] = useState<TranslationState>({
    isReady: false,
    isLoading: false,
    error: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (!autoInitialize) return;

    const init = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      try {
        await initializeOfflineTranslator();
        setState({ isReady: true, isLoading: false, error: null });
      } catch (err) {
        console.error('[useOfflineTranslation] Init failed:', err);
        setState({ 
          isReady: false, 
          isLoading: false, 
          error: err instanceof Error ? err.message : 'Initialization failed' 
        });
      }
    };

    init();
  }, [autoInitialize]);

  // Translate text
  const translate = useCallback(async (
    text: string,
    source?: string,
    target?: string
  ): Promise<OfflineTranslationResult> => {
    const srcLang = source || senderLanguage;
    const tgtLang = target || receiverLanguage;
    return translateOffline(text, srcLang, tgtLang);
  }, [senderLanguage, receiverLanguage]);

  // Bidirectional translation for chat
  const translateForChat = useCallback(async (
    text: string,
    senderLang?: string,
    receiverLang?: string
  ): Promise<BidirectionalResult> => {
    const srcLang = senderLang || senderLanguage;
    const tgtLang = receiverLang || receiverLanguage;
    return translateBidirectionalOffline(text, srcLang, tgtLang);
  }, [senderLanguage, receiverLanguage]);

  // Instant live preview (synchronous transliteration)
  const getLivePreview = useCallback((
    text: string,
    targetLang?: string
  ): LivePreviewResult => {
    const target = targetLang || senderLanguage;
    const inputIsLatin = isLatinText(text);
    const targetIsLatin = isLatinScriptLanguage(target);

    if (!text.trim()) {
      return { preview: '', isLatin: true, isTransliterated: false };
    }

    // Convert Latin to native script if needed
    if (inputIsLatin && !targetIsLatin) {
      const transliterated = dynamicTransliterate(text, target);
      return {
        preview: transliterated || text,
        isLatin: false,
        isTransliterated: !!transliterated && transliterated !== text,
      };
    }

    // Convert native to Latin if needed
    if (!inputIsLatin && targetIsLatin) {
      const reversed = reverseTransliterate(text, target);
      return {
        preview: reversed || text,
        isLatin: true,
        isTransliterated: !!reversed && reversed !== text,
      };
    }

    return { preview: text, isLatin: inputIsLatin, isTransliterated: false };
  }, [senderLanguage]);

  // Debounced preview update
  const updatePreviewDebounced = useCallback((
    text: string,
    targetLang: string,
    callback: (result: LivePreviewResult) => void,
    debounceMs: number = 50
  ) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const result = getLivePreview(text, targetLang);
      callback(result);
    }, debounceMs);
  }, [getLivePreview]);

  // Cancel pending preview
  const cancelPreview = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  // Clear translation cache
  const clearTranslationCache = useCallback(() => {
    clearCache();
  }, []);

  // Get cache statistics
  const getStats = useCallback(() => {
    return getCacheStats();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Translation functions
    translate,
    translateForChat,
    getLivePreview,
    updatePreviewDebounced,
    cancelPreview,
    
    // Utilities
    clearTranslationCache,
    getStats,
    
    // Language utilities
    normalizeLanguage,
    isLatinScriptLanguage,
    isLatinText,
    isSameLanguage,
    isEnglish,
    getLanguages,
    getLanguageCount,
    
    // Direct transliteration access
    dynamicTransliterate,
    reverseTransliterate,
  };
}

// ============================================================
// SIMPLE TRANSLATION HOOK
// ============================================================

export function useTranslateOffline(sourceLanguage: string, targetLanguage: string) {
  const [result, setResult] = useState<OfflineTranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (text: string) => {
    if (!text.trim()) {
      setResult(null);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const res = await translateOffline(text, sourceLanguage, targetLanguage);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
      setResult(null);
    } finally {
      setIsTranslating(false);
    }
  }, [sourceLanguage, targetLanguage]);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    isTranslating,
    error,
    translate,
    clear,
  };
}

// ============================================================
// CHAT TRANSLATION HOOK
// ============================================================

export function useChatTranslationOffline(
  senderLanguage: string,
  receiverLanguage: string
) {
  const { isReady, translateForChat, getLivePreview } = useOfflineTranslation({
    senderLanguage,
    receiverLanguage,
  });

  const [lastResult, setLastResult] = useState<BidirectionalResult | null>(null);

  const processMessage = useCallback(async (text: string) => {
    const result = await translateForChat(text, senderLanguage, receiverLanguage);
    setLastResult(result);
    return result;
  }, [translateForChat, senderLanguage, receiverLanguage]);

  const getPreview = useCallback((text: string) => {
    return getLivePreview(text, senderLanguage);
  }, [getLivePreview, senderLanguage]);

  return {
    isReady,
    processMessage,
    getPreview,
    lastResult,
  };
}

export default useOfflineTranslation;

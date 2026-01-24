/**
 * Universal Translation - React Hook
 * ===================================
 * 
 * React hook for using the Universal Translation system.
 * Automatically handles user profile language detection.
 * 
 * @example
 * ```tsx
 * import { useUniversalTranslation } from '@/lib/universal-translation';
 * 
 * function ChatComponent() {
 *   const { translate, translateForChat, getPreview, isReady } = useUniversalTranslation();
 *   
 *   // Get live preview while typing
 *   const preview = getPreview('namaste', 'hindi'); // "नमस्ते"
 *   
 *   // Translate between languages
 *   const result = await translate('hello', 'english', 'hindi');
 * }
 * ```
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  translate as coreTranslate,
  translateForChat as coreTranslateForChat,
  initializeEngine,
  isEngineReady,
  clearCache,
  clearPhraseCache,
  getCacheStats,
} from './engine';
import {
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  isRTL,
  getLanguageInfo,
  getLanguageCode,
  getNativeName,
  getAllLanguages,
  getLanguageCount,
  detectScript,
  isLanguageSupported,
} from './language-registry';
import {
  transliterateToNative,
  reverseTransliterate,
  getLivePreview,
  hasTransliteration,
} from './transliterator';
import type {
  TranslationResult,
  BidirectionalChatResult,
  LanguageInfo,
} from './types';

export interface UseUniversalTranslationReturn {
  // Core translation
  translate: (text: string, source: string, target: string) => Promise<TranslationResult>;
  translateForChat: (text: string, senderLang: string, receiverLang: string) => Promise<BidirectionalChatResult>;
  
  // Live preview (synchronous)
  getPreview: (text: string, targetLanguage: string) => string;
  
  // Transliteration
  transliterate: (text: string, targetLanguage: string) => string;
  reverseTransliterate: (text: string, sourceLanguage: string) => string;
  hasTransliteration: (language: string) => boolean;
  
  // Language utilities
  normalizeLanguage: (lang: string) => string;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  isEnglish: (lang: string) => boolean;
  isLatinScript: (text: string) => boolean;
  isLatinLanguage: (lang: string) => boolean;
  isRTL: (lang: string) => boolean;
  isSupported: (lang: string) => boolean;
  getLanguageInfo: (lang: string) => LanguageInfo | null;
  getLanguageCode: (lang: string) => string;
  getNativeName: (lang: string) => string;
  detectScript: typeof detectScript;
  
  // Language list
  getAllLanguages: () => LanguageInfo[];
  getLanguageCount: () => number;
  
  // State
  isReady: boolean;
  isTranslating: boolean;
  error: string | null;
  
  // Cache management
  clearCache: () => void;
  clearPhraseCache: () => void;
  getCacheStats: typeof getCacheStats;
  
  // Initialization
  initialize: () => Promise<void>;
}

export function useUniversalTranslation(): UseUniversalTranslationReturn {
  const [isReady, setIsReady] = useState(isEngineReady());
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize engine on mount
  useEffect(() => {
    if (!isReady) {
      initializeEngine()
        .then(() => setIsReady(true))
        .catch(err => {
          console.error('[useUniversalTranslation] Init error:', err);
          setError(err.message);
        });
    }
  }, [isReady]);

  // Wrapped translate with state management
  const translate = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      return await coreTranslate(text, source, target);
    } catch (err: any) {
      const errorMessage = err.message || 'Translation failed';
      setError(errorMessage);
      return {
        text,
        originalText: text,
        sourceLanguage: source,
        targetLanguage: target,
        direction: 'passthrough',
        isTranslated: false,
        isTransliterated: false,
        confidence: 0,
        method: 'passthrough',
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Wrapped chat translation
  const translateForChat = useCallback(async (
    text: string,
    senderLang: string,
    receiverLang: string
  ): Promise<BidirectionalChatResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      return await coreTranslateForChat(text, senderLang, receiverLang);
    } catch (err: any) {
      setError(err.message || 'Translation failed');
      return {
        originalText: text,
        senderView: text,
        receiverView: text,
        englishCore: text,
        direction: 'passthrough',
        wasTranslated: false,
        wasTransliterated: false,
        confidence: 0,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Manual initialization
  const initialize = useCallback(async () => {
    try {
      await initializeEngine();
      setIsReady(true);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return useMemo(() => ({
    // Core translation
    translate,
    translateForChat,
    
    // Live preview
    getPreview: getLivePreview,
    
    // Transliteration
    transliterate: transliterateToNative,
    reverseTransliterate,
    hasTransliteration,
    
    // Language utilities
    normalizeLanguage,
    isSameLanguage,
    isEnglish,
    isLatinScript: isLatinText,
    isLatinLanguage: isLatinScriptLanguage,
    isRTL,
    isSupported: isLanguageSupported,
    getLanguageInfo,
    getLanguageCode,
    getNativeName,
    detectScript,
    
    // Language list
    getAllLanguages,
    getLanguageCount,
    
    // State
    isReady,
    isTranslating,
    error,
    
    // Cache
    clearCache,
    clearPhraseCache,
    getCacheStats,
    
    // Init
    initialize,
  }), [translate, translateForChat, initialize, isReady, isTranslating, error]);
}

export default useUniversalTranslation;

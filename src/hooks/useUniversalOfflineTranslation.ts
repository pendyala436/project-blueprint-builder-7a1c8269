/**
 * Universal Offline Translation Hook
 * ===================================
 * 
 * React hooks for 100% offline translation
 * Supports ALL 1000+ languages from languages.ts
 * NO external APIs - NO NLLB-200 - NO hardcoding
 * 
 * Uses meaning-based translation via dictionary lookups
 * with English pivot for cross-language communication
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  translateUniversal,
  translateBidirectionalChat,
  getLiveNativePreview,
  getLiveLatinPreview,
  autoDetectLanguage,
  initializeEngine,
  isEngineReady,
  clearAllCaches,
  getCacheStats,
  normalizeLanguage,
  getLanguageInfo,
  getLanguageCode,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  isRTL,
  getAllLanguages,
  getLanguageCount,
  isLanguageSupported,
  type UniversalTranslationResult,
  type BidirectionalChatResult,
} from '@/lib/translation/universal-offline-engine';

// ============================================================
// MAIN TRANSLATION HOOK
// ============================================================

export interface UseUniversalTranslationOptions {
  autoInitialize?: boolean;
  previewDebounce?: number;
}

export interface UseUniversalTranslationReturn {
  // Translation functions
  translate: (text: string, source: string, target: string) => Promise<UniversalTranslationResult>;
  translateChat: (text: string, sender: string, receiver: string) => Promise<BidirectionalChatResult>;
  
  // Live preview (synchronous)
  getNativePreview: (text: string, target: string) => string;
  getLatinPreview: (text: string, source: string) => string;
  
  // Language detection
  detectLanguage: (text: string) => ReturnType<typeof autoDetectLanguage>;
  
  // Utilities
  normalizeLanguage: typeof normalizeLanguage;
  getLanguageInfo: typeof getLanguageInfo;
  getLanguageCode: typeof getLanguageCode;
  isLatinScript: (lang: string) => boolean;
  isLatinText: (text: string) => boolean;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  isEnglish: (lang: string) => boolean;
  isRTL: (lang: string) => boolean;
  isSupported: (lang: string) => boolean;
  
  // Language data
  getAllLanguages: typeof getAllLanguages;
  getLanguageCount: typeof getLanguageCount;
  
  // State
  isReady: boolean;
  isTranslating: boolean;
  error: string | null;
  cacheStats: ReturnType<typeof getCacheStats>;
  
  // Cache management
  clearCache: () => void;
  initialize: () => Promise<void>;
}

export function useUniversalTranslation(
  options: UseUniversalTranslationOptions = {}
): UseUniversalTranslationReturn {
  const { autoInitialize = true } = options;
  
  const [isReady, setIsReady] = useState(isEngineReady());
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState(getCacheStats());
  
  // Initialize engine
  useEffect(() => {
    if (autoInitialize && !isReady) {
      initializeEngine().then(() => {
        setIsReady(true);
        setCacheStats(getCacheStats());
      });
    }
  }, [autoInitialize, isReady]);

  // Translate text
  const translate = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<UniversalTranslationResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translateUniversal(text, sourceLanguage, targetLanguage);
      setCacheStats(getCacheStats());
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      setError(message);
      console.error('[useUniversalTranslation] Error:', err);
      
      return {
        text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        isTransliterated: false,
        confidence: 0,
        method: 'passthrough',
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Translate for chat (bidirectional)
  const translateChat = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<BidirectionalChatResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translateBidirectionalChat(text, senderLanguage, receiverLanguage);
      setCacheStats(getCacheStats());
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      setError(message);
      console.error('[useUniversalTranslation] Chat error:', err);
      
      return {
        senderView: text,
        receiverView: text,
        englishCore: text,
        originalText: text,
        wasTransliterated: false,
        wasTranslated: false,
        confidence: 0,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Live previews (synchronous)
  const getNativePreview = useCallback((text: string, target: string) => {
    return getLiveNativePreview(text, target);
  }, []);

  const getLatinPreview = useCallback((text: string, source: string) => {
    return getLiveLatinPreview(text, source);
  }, []);

  // Language detection
  const detectLanguage = useCallback((text: string) => {
    return autoDetectLanguage(text);
  }, []);

  // Cache management
  const clearCache = useCallback(() => {
    clearAllCaches();
    setCacheStats(getCacheStats());
  }, []);

  // Initialize manually
  const initialize = useCallback(async () => {
    await initializeEngine();
    setIsReady(true);
    setCacheStats(getCacheStats());
  }, []);

  return {
    translate,
    translateChat,
    getNativePreview,
    getLatinPreview,
    detectLanguage,
    normalizeLanguage,
    getLanguageInfo,
    getLanguageCode,
    isLatinScript: isLatinScriptLanguage,
    isLatinText,
    isSameLanguage,
    isEnglish,
    isRTL,
    isSupported: isLanguageSupported,
    getAllLanguages,
    getLanguageCount,
    isReady,
    isTranslating,
    error,
    cacheStats,
    clearCache,
    initialize,
  };
}

// ============================================================
// SIMPLIFIED TRANSLATION HOOK
// ============================================================

export interface UseTranslateOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

export function useTranslateUniversal(options: UseTranslateOptions) {
  const { sourceLanguage, targetLanguage } = options;
  const { translate, isReady, isTranslating, error } = useUniversalTranslation();
  
  const [result, setResult] = useState<UniversalTranslationResult | null>(null);
  
  const translateText = useCallback(async (text: string) => {
    const translation = await translate(text, sourceLanguage, targetLanguage);
    setResult(translation);
    return translation;
  }, [translate, sourceLanguage, targetLanguage]);

  return {
    translateText,
    result,
    isReady,
    isTranslating,
    error,
  };
}

// ============================================================
// CHAT TRANSLATION HOOK
// ============================================================

export interface UseChatTranslationOptions {
  senderLanguage: string;
  receiverLanguage: string;
  enableLivePreview?: boolean;
}

export function useChatTranslationUniversal(options: UseChatTranslationOptions) {
  const { senderLanguage, receiverLanguage, enableLivePreview = true } = options;
  const { translateChat, getNativePreview, isReady, isTranslating } = useUniversalTranslation();
  
  const [lastResult, setLastResult] = useState<BidirectionalChatResult | null>(null);
  const [livePreview, setLivePreview] = useState('');
  
  // Process outgoing message
  const processMessage = useCallback(async (text: string) => {
    const result = await translateChat(text, senderLanguage, receiverLanguage);
    setLastResult(result);
    return result;
  }, [translateChat, senderLanguage, receiverLanguage]);

  // Update live preview
  const updatePreview = useCallback((text: string) => {
    if (enableLivePreview) {
      setLivePreview(getNativePreview(text, senderLanguage));
    }
  }, [getNativePreview, senderLanguage, enableLivePreview]);

  // Process incoming message
  const processIncoming = useCallback(async (text: string, incomingFromLanguage: string) => {
    const result = await translateChat(text, incomingFromLanguage, senderLanguage);
    return result.receiverView;
  }, [translateChat, senderLanguage]);

  return {
    processMessage,
    processIncoming,
    updatePreview,
    livePreview,
    lastResult,
    isReady,
    isTranslating,
    senderLanguage,
    receiverLanguage,
  };
}

// ============================================================
// LIVE PREVIEW HOOK (Debounced)
// ============================================================

export interface UseLivePreviewOptions {
  targetLanguage: string;
  debounceMs?: number;
}

export function useLiveTransliterationPreview(options: UseLivePreviewOptions) {
  const { targetLanguage, debounceMs = 50 } = options;
  
  const [inputText, setInputText] = useState('');
  const [preview, setPreview] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const isNonLatin = useMemo(() => !isLatinScriptLanguage(targetLanguage), [targetLanguage]);
  
  // Update preview with debounce
  const updateInput = useCallback((text: string) => {
    setInputText(text);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (!isNonLatin) {
      setPreview(text);
      return;
    }
    
    timeoutRef.current = setTimeout(() => {
      const nativePreview = getLiveNativePreview(text, targetLanguage);
      setPreview(nativePreview);
    }, debounceMs);
  }, [targetLanguage, isNonLatin, debounceMs]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    inputText,
    preview,
    updateInput,
    isNonLatin,
    targetLanguage,
  };
}

// ============================================================
// LANGUAGE SELECTOR HOOK
// ============================================================

export function useLanguageSelector(initialLanguage?: string) {
  const [selectedLanguage, setSelectedLanguage] = useState(
    initialLanguage ? normalizeLanguage(initialLanguage) : 'english'
  );
  
  const languages = useMemo(() => getAllLanguages(), []);
  const languageCount = useMemo(() => getLanguageCount(), []);
  
  const languageInfo = useMemo(() => 
    getLanguageInfo(selectedLanguage), 
    [selectedLanguage]
  );
  
  const isRTLLanguage = useMemo(() => 
    isRTL(selectedLanguage), 
    [selectedLanguage]
  );
  
  const isLatinScript = useMemo(() => 
    isLatinScriptLanguage(selectedLanguage), 
    [selectedLanguage]
  );

  const selectLanguage = useCallback((lang: string) => {
    setSelectedLanguage(normalizeLanguage(lang));
  }, []);

  return {
    selectedLanguage,
    selectLanguage,
    languages,
    languageCount,
    languageInfo,
    isRTLLanguage,
    isLatinScript,
  };
}

// Default export
export default useUniversalTranslation;

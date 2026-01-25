/**
 * Offline Translation - React Hooks
 * ==================================
 * 
 * React hooks for using the offline translation engine.
 * Provides translation, live preview, and chat translation functionality.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  TranslationResult,
  ChatMessageViews,
  UserLanguageProfile,
} from './types';
import {
  translate,
  translateForChat,
  translateSimple,
  getNativePreview,
  getEnglishPreview,
  initializeEngine,
  isEngineReady,
  getCacheStats,
  clearCache,
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  detectLanguage,
} from './engine';
import { transliterateToNative, reverseTransliterate } from './transliterator';

// ============================================================
// MAIN TRANSLATION HOOK
// ============================================================

export interface UseOfflineTranslationOptions {
  autoInitialize?: boolean;
  debounceMs?: number;
}

export interface UseOfflineTranslationReturn {
  // Core functions
  translate: (text: string, source: string, target: string) => Promise<TranslationResult>;
  translateChat: (text: string, senderLang: string, receiverLang: string) => Promise<ChatMessageViews>;
  translateForProfiles: (text: string, sender: UserLanguageProfile, receiver: UserLanguageProfile) => Promise<ChatMessageViews>;
  
  // Previews
  getNativePreview: (text: string, language: string) => string;
  getEnglishPreview: (text: string, language: string) => Promise<string>;
  
  // Utilities
  detectLanguage: typeof detectLanguage;
  normalizeLanguage: typeof normalizeLanguage;
  isLatinScriptLanguage: typeof isLatinScriptLanguage;
  isLatinText: typeof isLatinText;
  isSameLanguage: typeof isSameLanguage;
  isEnglish: typeof isEnglish;
  transliterateToNative: typeof transliterateToNative;
  reverseTransliterate: typeof reverseTransliterate;
  
  // State
  isReady: boolean;
  isTranslating: boolean;
  error: string | null;
  
  // Cache management
  clearCache: () => void;
  getCacheStats: typeof getCacheStats;
  initialize: () => Promise<void>;
}

export function useOfflineTranslation(
  options: UseOfflineTranslationOptions = {}
): UseOfflineTranslationReturn {
  const { autoInitialize = true } = options;
  
  const [isReady, setIsReady] = useState(isEngineReady());
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize engine
  useEffect(() => {
    if (autoInitialize && !isReady) {
      initializeEngine()
        .then(() => setIsReady(true))
        .catch(err => {
          console.error('[useOfflineTranslation] Init error:', err);
          setError(err.message);
        });
    }
  }, [autoInitialize, isReady]);
  
  // Core translate function
  const translateFn = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);
    try {
      const result = await translate(text, source, target);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, []);
  
  // Chat translation
  const translateChatFn = useCallback(async (
    text: string,
    senderLang: string,
    receiverLang: string
  ): Promise<ChatMessageViews> => {
    setIsTranslating(true);
    setError(null);
    try {
      const result = await translateSimple(text, senderLang, receiverLang);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, []);
  
  // Profile-based translation
  const translateForProfilesFn = useCallback(async (
    text: string,
    sender: UserLanguageProfile,
    receiver: UserLanguageProfile
  ): Promise<ChatMessageViews> => {
    setIsTranslating(true);
    setError(null);
    try {
      const result = await translateForChat(text, sender, receiver);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, []);
  
  // Initialize function
  const initializeFn = useCallback(async () => {
    try {
      await initializeEngine();
      setIsReady(true);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  return {
    translate: translateFn,
    translateChat: translateChatFn,
    translateForProfiles: translateForProfilesFn,
    getNativePreview,
    getEnglishPreview: async (text: string, lang: string) => getEnglishPreview(text, lang),
    detectLanguage,
    normalizeLanguage,
    isLatinScriptLanguage,
    isLatinText,
    isSameLanguage,
    isEnglish,
    transliterateToNative,
    reverseTransliterate,
    isReady,
    isTranslating,
    error,
    clearCache,
    getCacheStats,
    initialize: initializeFn,
  };
}

// ============================================================
// LIVE PREVIEW HOOK
// ============================================================

export interface UseLivePreviewOptions {
  senderLanguage: string;
  receiverLanguage?: string;
  debounceMs?: number;
}

export interface UseLivePreviewReturn {
  nativePreview: string;
  englishPreview: string;
  receiverPreview: string;
  isGenerating: boolean;
  updatePreview: (text: string) => void;
}

export function useLivePreview(options: UseLivePreviewOptions): UseLivePreviewReturn {
  const { senderLanguage, receiverLanguage, debounceMs = 300 } = options;
  
  const [nativePreview, setNativePreview] = useState('');
  const [englishPreview, setEnglishPreview] = useState('');
  const [receiverPreview, setReceiverPreview] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const updatePreview = useCallback((text: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Instant native preview
    const native = getNativePreview(text, senderLanguage);
    setNativePreview(native);
    
    if (!text.trim()) {
      setEnglishPreview('');
      setReceiverPreview('');
      return;
    }
    
    // Debounced async previews
    setIsGenerating(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        // Get English preview
        const english = await getEnglishPreview(text, senderLanguage);
        setEnglishPreview(english);
        
        // Get receiver preview if different language
        if (receiverLanguage && !isSameLanguage(senderLanguage, receiverLanguage)) {
          const result = await translateSimple(text, senderLanguage, receiverLanguage);
          setReceiverPreview(result.receiverView);
        } else {
          setReceiverPreview('');
        }
      } catch (err) {
        console.error('[useLivePreview] Error:', err);
      } finally {
        setIsGenerating(false);
      }
    }, debounceMs);
  }, [senderLanguage, receiverLanguage, debounceMs]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    nativePreview,
    englishPreview,
    receiverPreview,
    isGenerating,
    updatePreview,
  };
}

// ============================================================
// CHAT MESSAGE HOOK
// ============================================================

export interface UseChatTranslationOptions {
  senderProfile: UserLanguageProfile;
  receiverProfile: UserLanguageProfile;
}

export interface UseChatTranslationReturn {
  processMessage: (text: string) => Promise<ChatMessageViews>;
  isProcessing: boolean;
  lastResult: ChatMessageViews | null;
  error: string | null;
}

export function useChatTranslation(options: UseChatTranslationOptions): UseChatTranslationReturn {
  const { senderProfile, receiverProfile } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ChatMessageViews | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const processMessage = useCallback(async (text: string): Promise<ChatMessageViews> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await translateForChat(text, senderProfile, receiverProfile);
      setLastResult(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [senderProfile, receiverProfile]);
  
  return {
    processMessage,
    isProcessing,
    lastResult,
    error,
  };
}

// ============================================================
// LANGUAGE SELECTOR HOOK
// ============================================================

export interface UseLanguageSelectorReturn {
  language: string;
  setLanguage: (lang: string) => void;
  normalizedLanguage: string;
  isLatinScript: boolean;
  isRTL: boolean;
}

export function useLanguageSelector(initialLanguage = 'english'): UseLanguageSelectorReturn {
  const [language, setLanguage] = useState(initialLanguage);
  
  const normalizedLanguage = useMemo(() => normalizeLanguage(language), [language]);
  const isLatinScript = useMemo(() => isLatinScriptLanguage(normalizedLanguage), [normalizedLanguage]);
  const isRTL = useMemo(() => {
    const rtlLanguages = ['arabic', 'urdu', 'persian', 'hebrew', 'sindhi', 'kashmiri'];
    return rtlLanguages.includes(normalizedLanguage);
  }, [normalizedLanguage]);
  
  return {
    language,
    setLanguage,
    normalizedLanguage,
    isLatinScript,
    isRTL,
  };
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default useOfflineTranslation;

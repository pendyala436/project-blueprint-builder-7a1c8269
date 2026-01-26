/**
 * React Hook for Xenova Translation SDK
 * Provides easy-to-use translation with loading states
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  translateText,
  translateForChat,
  getEnglishMeaning,
  detectLanguage,
  clearCache,
} from './engine';
import {
  configureThreads,
  onProgress,
  isLoading as isModelLoading,
  getModelStatus,
} from './modelLoader';
import {
  normalizeLanguageCode,
  isSameLanguage,
  isEnglish,
} from './languages';
import type {
  TranslationResult,
  ChatTranslationResult,
  ModelLoadProgress,
} from './types';

export interface UseXenovaTranslateOptions {
  /** Enable mobile-optimized mode (fewer threads) */
  mobileMode?: boolean;
  /** Pre-load models on mount */
  preloadModels?: boolean;
}

export interface UseXenovaTranslateReturn {
  // Translation functions
  translate: (text: string, source: string, target: string) => Promise<TranslationResult>;
  translateChat: (text: string, senderLang: string, receiverLang: string) => Promise<ChatTranslationResult>;
  toEnglish: (text: string, sourceLang: string) => Promise<string>;
  detect: (text: string) => Promise<{ language: string; confidence: number }>;
  
  // State
  isTranslating: boolean;
  isModelLoading: boolean;
  modelProgress: ModelLoadProgress | null;
  error: string | null;
  
  // Model status
  modelsReady: { m2m: boolean; nllb: boolean; detector: boolean };
  
  // Utilities
  clearCache: () => void;
  normalizeLanguage: (lang: string) => string;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  isEnglish: (lang: string) => boolean;
}

/**
 * Hook for browser-based translation using Xenova models
 */
export function useXenovaTranslate(
  options: UseXenovaTranslateOptions = {}
): UseXenovaTranslateReturn {
  const { mobileMode, preloadModels } = options;
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [modelProgress, setModelProgress] = useState<ModelLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(getModelStatus());
  
  const mountedRef = useRef(true);
  
  // Configure threads on mount
  useEffect(() => {
    const isMobile = mobileMode ?? /Mobi|Android/i.test(navigator.userAgent);
    configureThreads(isMobile);
  }, [mobileMode]);
  
  // Subscribe to model loading progress
  useEffect(() => {
    const unsubscribe = onProgress((progress) => {
      if (mountedRef.current) {
        setModelProgress(progress);
        if (progress.status === 'ready' || progress.status === 'error') {
          setModelsReady(getModelStatus());
        }
      }
    });
    
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);
  
  // Translate function
  const translate = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translateText(text, source, target);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Translation failed';
      setError(msg);
      return {
        text,
        originalText: text,
        sourceLang: normalizeLanguageCode(source),
        targetLang: normalizeLanguageCode(target),
        path: 'FALLBACK',
        isTranslated: false,
      };
    } finally {
      if (mountedRef.current) {
        setIsTranslating(false);
      }
    }
  }, []);
  
  // Chat translation
  const translateChat = useCallback(async (
    text: string,
    senderLang: string,
    receiverLang: string
  ): Promise<ChatTranslationResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translateForChat(text, senderLang, receiverLang);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Translation failed';
      setError(msg);
      return {
        senderView: text,
        receiverView: text,
        englishCore: text,
        originalText: text,
        path: 'FALLBACK',
        isTranslated: false,
      };
    } finally {
      if (mountedRef.current) {
        setIsTranslating(false);
      }
    }
  }, []);
  
  // Get English meaning
  const toEnglish = useCallback(async (
    text: string,
    sourceLang: string
  ): Promise<string> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      return await getEnglishMeaning(text, sourceLang);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Translation failed';
      setError(msg);
      return text;
    } finally {
      if (mountedRef.current) {
        setIsTranslating(false);
      }
    }
  }, []);
  
  // Detect language
  const detect = useCallback(async (text: string) => {
    return await detectLanguage(text);
  }, []);
  
  return {
    translate,
    translateChat,
    toEnglish,
    detect,
    isTranslating,
    isModelLoading: isModelLoading(),
    modelProgress,
    error,
    modelsReady,
    clearCache,
    normalizeLanguage: normalizeLanguageCode,
    isSameLanguage,
    isEnglish,
  };
}

/**
 * Simplified hook for chat translation between two users
 */
export interface UseChatTranslateOptions {
  myLanguage: string;
  partnerLanguage: string;
}

export function useChatTranslate(options: UseChatTranslateOptions) {
  const { myLanguage, partnerLanguage } = options;
  const xenova = useXenovaTranslate();
  
  const myLang = useMemo(() => normalizeLanguageCode(myLanguage), [myLanguage]);
  const partnerLang = useMemo(() => normalizeLanguageCode(partnerLanguage), [partnerLanguage]);
  const sameLanguage = useMemo(() => isSameLanguage(myLang, partnerLang), [myLang, partnerLang]);
  
  // Send message (I am sender, partner is receiver)
  const sendMessage = useCallback(async (text: string) => {
    if (sameLanguage) {
      return {
        senderView: text,
        receiverView: text,
        englishCore: isEnglish(myLang) ? text : await xenova.toEnglish(text, myLang),
        originalText: text,
        path: 'SAME' as const,
        isTranslated: false,
      };
    }
    return xenova.translateChat(text, myLang, partnerLang);
  }, [xenova, myLang, partnerLang, sameLanguage]);
  
  // Receive message (partner is sender, I am receiver)
  const receiveMessage = useCallback(async (text: string) => {
    if (sameLanguage) {
      return {
        senderView: text,
        receiverView: text,
        englishCore: isEnglish(partnerLang) ? text : await xenova.toEnglish(text, partnerLang),
        originalText: text,
        path: 'SAME' as const,
        isTranslated: false,
      };
    }
    return xenova.translateChat(text, partnerLang, myLang);
  }, [xenova, myLang, partnerLang, sameLanguage]);
  
  return {
    sendMessage,
    receiveMessage,
    sameLanguage,
    myLang,
    partnerLang,
    ...xenova,
  };
}

export default useXenovaTranslate;

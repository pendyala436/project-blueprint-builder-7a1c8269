/**
 * Translation Service Hook
 * Fully in-memory, browser-based translation
 * Uses @huggingface/transformers NLLB-200 model
 * NO external APIs, NO Docker, NO hardcoding
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  translate,
  transliterateToNative,
  processMessage,
  detectLanguageFromScript,
  isLatinText,
  isNonLatinScript,
  initPipeline,
  isPipelineReady,
  getLoadingStatus,
  getAvailableLanguages,
  clearCache,
  type TranslationResult,
  type LanguageInfo,
} from '@/lib/translation/in-memory-translator';

export type { TranslationResult, LanguageInfo };

export interface ConversionResult {
  converted: string;
  isConverted: boolean;
}

export interface MessageProcessResult {
  senderView: string;
  receiverView: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}

export function useTranslationService() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(isPipelineReady());
  
  // Track pending operations for non-blocking
  const pendingOps = useRef<Map<string, AbortController>>(new Map());

  // Preload model on first use
  useEffect(() => {
    if (!isReady && !isModelLoading) {
      const { isLoading } = getLoadingStatus();
      if (!isLoading) {
        setIsModelLoading(true);
        initPipeline((progress) => {
          setModelLoadProgress(progress);
        }).then((success) => {
          setIsReady(success);
          setIsModelLoading(false);
          if (!success) {
            setError('Failed to load translation model');
          }
        });
      }
    }
  }, [isReady, isModelLoading]);

  // Get all available languages dynamically
  const getLanguages = useCallback((): LanguageInfo[] => {
    return getAvailableLanguages();
  }, []);

  // Translate text (in-memory, non-blocking)
  const translateText = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    if (!text.trim()) {
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: false,
        model: 'none',
      };
    }

    // Same language - no translation needed
    if (sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: false,
        model: 'none',
      };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translate(
        text,
        sourceLanguage,
        targetLanguage,
        (progress) => setModelLoadProgress(progress)
      );

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      console.error('[TranslationService] Error:', message);
      setError(message);
      
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: false,
        model: 'error',
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Convert Latin text to native script (in-memory)
  const convertToNativeScript = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<ConversionResult> => {
    if (!text.trim()) {
      return { converted: text, isConverted: false };
    }

    // Check if text is Latin script
    if (!isLatinText(text)) {
      return { converted: text, isConverted: false };
    }

    // Check if target language uses non-Latin script
    if (!isNonLatinScript(targetLanguage)) {
      return { converted: text, isConverted: false };
    }

    try {
      const result = await transliterateToNative(text, targetLanguage);
      return {
        converted: result.text,
        isConverted: result.success,
      };
    } catch {
      return { converted: text, isConverted: false };
    }
  }, []);

  // Process message for chat (handles both transliteration and translation)
  const processMessageForChat = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<MessageProcessResult> => {
    try {
      return await processMessage(text, senderLanguage, receiverLanguage);
    } catch {
      return {
        senderView: text,
        receiverView: text,
        wasTransliterated: false,
        wasTranslated: false,
      };
    }
  }, []);

  // Detect language from text (in-memory, instant)
  const detectLanguage = useCallback((text: string): { language: string; isLatin: boolean } => {
    const trimmed = text.trim();
    if (!trimmed) return { language: 'english', isLatin: true };

    const detected = detectLanguageFromScript(trimmed);
    return { language: detected.language, isLatin: detected.isLatin };
  }, []);

  // Check if language uses non-Latin script
  const checkNonLatinScript = useCallback((language: string): boolean => {
    return isNonLatinScript(language);
  }, []);

  // Clear translation cache
  const clearTranslationCache = useCallback((): void => {
    clearCache();
  }, []);

  return {
    // Core translation functions
    translate: translateText,
    convertToNativeScript,
    processMessageForChat,
    detectLanguage,
    
    // Utility functions
    getLanguages,
    checkNonLatinScript,
    clearTranslationCache,
    
    // State
    isTranslating,
    isModelLoading,
    modelLoadProgress,
    isReady,
    error,
  };
}

export default useTranslationService;

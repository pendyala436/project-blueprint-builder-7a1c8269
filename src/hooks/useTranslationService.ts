/**
 * Translation Service Hook
 * =========================
 * Fully in-memory, browser-based translation
 * Uses @huggingface/transformers NLLB-200 model
 * 
 * NO external APIs, NO Docker, NO hardcoding
 * Supports 200+ languages dynamically
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  translate,
  transliterateToNative,
  processSenderMessage,
  processReceiverMessage,
  processChatMessage,
  detectLanguageFromText,
  isLatinText,
  isLatinScriptLanguage,
  isSameLanguage,
  initPipeline,
  isPipelineReady,
  getLoadingStatus,
  getLanguages,
  clearCache,
  createLivePreview,
  type TranslationResult,
  type ChatProcessResult,
  type LanguageInfo,
} from '@/lib/translation/realtime-chat-translator';

export type { TranslationResult, ChatProcessResult, LanguageInfo };

export interface ConversionResult {
  converted: string;
  isConverted: boolean;
}

export function useTranslationService() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(isPipelineReady());
  
  // Live preview helper
  const livePreviewRef = useRef(createLivePreview(150));

  // Preload model on first use
  useEffect(() => {
    if (!isReady && !isModelLoading) {
      const status = getLoadingStatus();
      if (!status.isLoading) {
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
  const getAllLanguages = useCallback((): LanguageInfo[] => {
    return getLanguages();
  }, []);

  // Translate text (in-memory, non-blocking)
  const translateText = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    if (!text.trim()) {
      return {
        text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: false,
      };
    }

    // Same language - no translation needed
    if (isSameLanguage(sourceLanguage, targetLanguage)) {
      return {
        text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: false,
      };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translate(text, sourceLanguage, targetLanguage);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      console.error('[TranslationService] Error:', message);
      setError(message);
      
      return {
        text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: false,
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
    if (isLatinScriptLanguage(targetLanguage)) {
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

  // Process outgoing message (sender's view)
  const processOutgoing = useCallback(async (
    text: string,
    senderLanguage: string
  ) => {
    return processSenderMessage(text, senderLanguage);
  }, []);

  // Process incoming message (receiver's view)
  const processIncoming = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ) => {
    return processReceiverMessage(text, senderLanguage, receiverLanguage);
  }, []);

  // Full chat message processing
  const processMessageForChat = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<ChatProcessResult> => {
    return processChatMessage(text, senderLanguage, receiverLanguage);
  }, []);

  // Detect language from text (in-memory, instant)
  const detectLanguage = useCallback((text: string): { language: string; isLatin: boolean } => {
    const trimmed = text.trim();
    if (!trimmed) return { language: 'english', isLatin: true };

    const detected = detectLanguageFromText(trimmed);
    return { language: detected.language, isLatin: detected.isLatin };
  }, []);

  // Update live preview (debounced, non-blocking)
  const updateLivePreview = useCallback((
    text: string,
    targetLanguage: string,
    callback: (preview: string) => void
  ) => {
    livePreviewRef.current.update(text, targetLanguage, callback);
  }, []);

  // Cancel live preview
  const cancelLivePreview = useCallback(() => {
    livePreviewRef.current.cancel();
  }, []);

  // Check if language uses non-Latin script
  const checkNonLatinScript = useCallback((language: string): boolean => {
    return !isLatinScriptLanguage(language);
  }, []);

  // Clear translation cache
  const clearTranslationCache = useCallback((): void => {
    clearCache();
  }, []);

  return {
    // Core translation functions
    translate: translateText,
    convertToNativeScript,
    processOutgoing,
    processIncoming,
    processMessageForChat,
    detectLanguage,
    
    // Live preview
    updateLivePreview,
    cancelLivePreview,
    
    // Utility functions
    getLanguages: getAllLanguages,
    checkNonLatinScript,
    isSameLanguage,
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

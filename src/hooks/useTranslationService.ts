/**
 * Translation Service Hook
 * =========================
 * Fully in-memory, browser-based translation using Web Worker
 * Uses @huggingface/transformers NLLB-200 model
 * 
 * NO external APIs, NO Docker, NO hardcoding
 * Supports 200+ languages dynamically
 * Non-blocking - all heavy work happens in Web Worker
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  // Worker-based translator (preferred)
  translate,
  transliterateToNative,
  processChatMessage,
  detectLanguage as detectLanguageFromWorker,
  initWorker,
  isReady as isWorkerReady,
  getLoadingStatus,
  createDebouncedPreview,
  isLatinText,
  isLatinScriptLanguage,
  isSameLanguage,
  normalizeUnicode,
  terminateWorker,
} from '@/lib/translation';

// Re-export types
export interface TranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  wasTransliterated: boolean;
}

export interface ChatProcessResult {
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}

export interface LanguageInfo {
  name: string;
  code: string;
  nllbCode: string;
  native: string;
  script: string;
  rtl?: boolean;
}

export interface ConversionResult {
  converted: string;
  isConverted: boolean;
}

export function useTranslationService() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(isWorkerReady());
  
  // Live preview helper (debounced, non-blocking)
  const livePreviewRef = useRef(createDebouncedPreview(100));

  // Preload worker and model on first use
  useEffect(() => {
    if (!isReady && !isModelLoading) {
      const status = getLoadingStatus();
      if (!status.isLoading) {
        setIsModelLoading(true);
        initWorker((progress) => {
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

    // Cleanup on unmount
    return () => {
      livePreviewRef.current.cancel();
    };
  }, [isReady, isModelLoading]);

  // Translate text (worker-based, non-blocking)
  const translateText = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    const originalText = normalizeUnicode(text.trim());
    
    if (!originalText) {
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
        text: originalText,
        originalText,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: false,
      };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translate(originalText, sourceLanguage, targetLanguage);
      return {
        text: result.text,
        originalText,
        sourceLanguage,
        targetLanguage,
        isTranslated: result.success && result.text !== originalText,
        wasTransliterated: false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      console.error('[TranslationService] Error:', message);
      setError(message);
      
      return {
        text: originalText,
        originalText,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: false,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Convert Latin text to native script (worker-based, non-blocking)
  const convertToNativeScript = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<ConversionResult> => {
    const trimmed = normalizeUnicode(text.trim());
    
    if (!trimmed) {
      return { converted: text, isConverted: false };
    }

    // Check if text is already non-Latin
    if (!isLatinText(trimmed)) {
      return { converted: trimmed, isConverted: false };
    }

    // Check if target language uses Latin script
    if (isLatinScriptLanguage(targetLanguage)) {
      return { converted: trimmed, isConverted: false };
    }

    try {
      const result = await transliterateToNative(trimmed, targetLanguage);
      return {
        converted: result.text,
        isConverted: result.success,
      };
    } catch {
      return { converted: trimmed, isConverted: false };
    }
  }, []);

  // Process outgoing message (sender's view)
  const processOutgoing = useCallback(async (
    text: string,
    senderLanguage: string
  ): Promise<{ senderView: string; wasTransliterated: boolean }> => {
    const trimmed = normalizeUnicode(text.trim());
    
    if (!trimmed) {
      return { senderView: text, wasTransliterated: false };
    }

    // If sender's language uses Latin script, no conversion
    if (isLatinScriptLanguage(senderLanguage)) {
      return { senderView: trimmed, wasTransliterated: false };
    }

    // If text is already in native script, no conversion
    if (!isLatinText(trimmed)) {
      return { senderView: trimmed, wasTransliterated: false };
    }

    // Convert Latin to sender's native script
    const result = await transliterateToNative(trimmed, senderLanguage);
    return {
      senderView: result.text,
      wasTransliterated: result.success,
    };
  }, []);

  // Process incoming message (receiver's view)
  const processIncoming = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<{ receiverView: string; wasTranslated: boolean }> => {
    const trimmed = normalizeUnicode(text.trim());
    
    if (!trimmed) {
      return { receiverView: text, wasTranslated: false };
    }

    // Same language - no translation needed
    if (isSameLanguage(senderLanguage, receiverLanguage)) {
      // But if receiver's language is non-Latin and text is Latin, convert
      if (!isLatinScriptLanguage(receiverLanguage) && isLatinText(trimmed)) {
        const result = await transliterateToNative(trimmed, receiverLanguage);
        return { receiverView: result.text, wasTranslated: false };
      }
      return { receiverView: trimmed, wasTranslated: false };
    }

    // Translate to receiver's language
    const result = await translate(trimmed, senderLanguage, receiverLanguage);
    return {
      receiverView: result.text,
      wasTranslated: result.success && result.text !== trimmed,
    };
  }, []);

  // Full chat message processing (worker-based)
  const processMessageForChat = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<ChatProcessResult> => {
    return processChatMessage(text, senderLanguage, receiverLanguage);
  }, []);

  // Detect language from text (async, uses worker)
  const detectLanguage = useCallback(async (
    text: string
  ): Promise<{ language: string; isLatin: boolean }> => {
    const trimmed = normalizeUnicode(text.trim());
    if (!trimmed) return { language: 'english', isLatin: true };

    try {
      const detected = await detectLanguageFromWorker(trimmed);
      return { language: detected.language, isLatin: detected.isLatin };
    } catch {
      return { language: 'english', isLatin: true };
    }
  }, []);

  // Update live preview (debounced, non-blocking)
  const updateLivePreview = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<string> => {
    return livePreviewRef.current.update(text, targetLanguage);
  }, []);

  // Cancel live preview
  const cancelLivePreview = useCallback(() => {
    livePreviewRef.current.cancel();
  }, []);

  // Check if language uses non-Latin script (sync)
  const checkNonLatinScript = useCallback((language: string): boolean => {
    return !isLatinScriptLanguage(language);
  }, []);

  // Clear translation cache (worker handles this internally)
  const clearTranslationCache = useCallback((): void => {
    // Worker manages its own cache
    console.log('[TranslationService] Cache clear requested');
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
    
    // Utility functions (sync)
    checkNonLatinScript,
    isSameLanguage,
    isLatinText,
    isLatinScriptLanguage,
    normalizeUnicode,
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

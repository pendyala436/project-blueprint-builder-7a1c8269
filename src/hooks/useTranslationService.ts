/**
 * Translation Service Hook
 * =========================
 * Fully embedded, browser-based translation
 * 100% in-browser, NO external APIs, NO Docker
 * 
 * Supports 386+ languages with instant response
 * Bidirectional: Source ↔ English ↔ Target
 * Non-blocking - all operations are synchronous or fast async
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  // Embedded translator (preferred)
  translate,
  transliterateToNative,
  processMessageForChat,
  autoDetectLanguage,
  isReady as isEmbeddedReady,
  getLoadingStatus,
  getNativeScriptPreview,
  isLatinText,
  isLatinScriptLanguage,
  isSameLanguage,
  normalizeUnicode,
  clearTranslationCache as clearCache,
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
  const [modelLoadProgress, setModelLoadProgress] = useState(100); // Always loaded
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(true); // Embedded is always ready
  
  // Live preview helper (debounced, non-blocking)
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Always ready - no model loading needed
  useEffect(() => {
    const status = getLoadingStatus();
    setIsReady(status.ready);
    setModelLoadProgress(status.progress);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  // Translate text (embedded, non-blocking)
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
        isTranslated: result.isTranslated,
        wasTransliterated: result.isTransliterated || false,
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

  // Convert Latin text to native script (embedded, sync)
  const convertToNativeScript = useCallback((
    text: string,
    targetLanguage: string
  ): ConversionResult => {
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
      const result = transliterateToNative(trimmed, targetLanguage);
      return {
        converted: result,
        isConverted: result !== trimmed,
      };
    } catch {
      return { converted: trimmed, isConverted: false };
    }
  }, []);

  // Process outgoing message (sender's view)
  const processOutgoing = useCallback((
    text: string,
    senderLanguage: string
  ): { senderView: string; wasTransliterated: boolean } => {
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
    const result = transliterateToNative(trimmed, senderLanguage);
    return {
      senderView: result,
      wasTransliterated: result !== trimmed,
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
        const result = transliterateToNative(trimmed, receiverLanguage);
        return { receiverView: result, wasTranslated: false };
      }
      return { receiverView: trimmed, wasTranslated: false };
    }

    // Translate to receiver's language
    const result = await translate(trimmed, senderLanguage, receiverLanguage);
    return {
      receiverView: result.text,
      wasTranslated: result.isTranslated,
    };
  }, []);

  // Full chat message processing (embedded)
  const processMessageForChatFn = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<ChatProcessResult> => {
    return await processMessageForChat(text, senderLanguage, receiverLanguage);
  }, []);

  // Detect language from text (sync)
  const detectLanguage = useCallback((
    text: string
  ): { language: string; isLatin: boolean } => {
    const trimmed = normalizeUnicode(text.trim());
    if (!trimmed) return { language: 'english', isLatin: true };

    try {
      const detected = autoDetectLanguage(trimmed);
      return { language: detected.language, isLatin: detected.isLatin };
    } catch {
      return { language: 'english', isLatin: true };
    }
  }, []);

  // Update live preview (debounced, non-blocking)
  const updateLivePreview = useCallback((
    text: string,
    targetLanguage: string
  ): Promise<string> => {
    return new Promise((resolve) => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      
      previewTimeoutRef.current = setTimeout(() => {
        const preview = getNativeScriptPreview(text, targetLanguage);
        resolve(preview);
      }, 100);
    });
  }, []);

  // Cancel live preview
  const cancelLivePreview = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  }, []);

  // Check if language uses non-Latin script (sync)
  const checkNonLatinScript = useCallback((language: string): boolean => {
    return !isLatinScriptLanguage(language);
  }, []);

  // Clear translation cache
  const clearTranslationCache = useCallback((): void => {
    clearCache();
    console.log('[TranslationService] Cache cleared');
  }, []);

  return {
    // Core translation functions
    translate: translateText,
    convertToNativeScript,
    processOutgoing,
    processIncoming,
    processMessageForChat: processMessageForChatFn,
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

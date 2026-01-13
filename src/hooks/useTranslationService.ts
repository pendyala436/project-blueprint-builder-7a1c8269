/**
 * Translation Service Hook (Unified)
 * ===================================
 * 
 * SINGLE SOURCE: Uses translateText from @/lib/translation/translate
 * All translations go through the unified translate.ts system
 * 
 * Supports 1000+ languages with semantic translation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  translateText,
  isLatinText,
  isLatinScriptLanguage,
  isSameLanguage,
  autoDetectLanguage,
  normalizeLanguage,
  needsScriptConversion,
  clearCache,
  processMessageForChat,
  transliterateToNative,
  getNativeScriptPreview,
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
  const [modelLoadProgress, setModelLoadProgress] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(true);
  
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  // Translate text using unified translateText
  const translateTextFn = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    const originalText = text.trim().normalize('NFC');
    
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
      const result = await translateText(originalText, sourceLanguage, targetLanguage);
      return {
        text: result.text,
        originalText,
        sourceLanguage,
        targetLanguage,
        isTranslated: result.isTranslated,
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

  // Convert Latin text to native script
  const convertToNativeScript = useCallback((
    text: string,
    targetLanguage: string
  ): ConversionResult => {
    const trimmed = text.trim().normalize('NFC');
    
    if (!trimmed || !isLatinText(trimmed) || isLatinScriptLanguage(targetLanguage)) {
      return { converted: trimmed || text, isConverted: false };
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
    const trimmed = text.trim().normalize('NFC');
    
    if (!trimmed || isLatinScriptLanguage(senderLanguage) || !isLatinText(trimmed)) {
      return { senderView: trimmed || text, wasTransliterated: false };
    }

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
    const trimmed = text.trim().normalize('NFC');
    
    if (!trimmed) {
      return { receiverView: text, wasTranslated: false };
    }

    if (isSameLanguage(senderLanguage, receiverLanguage)) {
      if (!isLatinScriptLanguage(receiverLanguage) && isLatinText(trimmed)) {
        const result = transliterateToNative(trimmed, receiverLanguage);
        return { receiverView: result, wasTranslated: false };
      }
      return { receiverView: trimmed, wasTranslated: false };
    }

    const result = await translateText(trimmed, senderLanguage, receiverLanguage);
    return {
      receiverView: result.text,
      wasTranslated: result.isTranslated,
    };
  }, []);

  // Full chat message processing
  const processMessageForChatFn = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<ChatProcessResult> => {
    return await processMessageForChat(text, senderLanguage, receiverLanguage);
  }, []);

  // Detect language from text
  const detectLanguage = useCallback((
    text: string
  ): { language: string; isLatin: boolean } => {
    const trimmed = text.trim().normalize('NFC');
    if (!trimmed) return { language: 'english', isLatin: true };

    try {
      const detected = autoDetectLanguage(trimmed);
      return { language: detected.language, isLatin: detected.isLatin };
    } catch {
      return { language: 'english', isLatin: true };
    }
  }, []);

  // Update live preview (debounced)
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

  // Clear translation cache
  const clearTranslationCache = useCallback((): void => {
    clearCache();
    console.log('[TranslationService] Cache cleared');
  }, []);

  return {
    translate: translateTextFn,
    convertToNativeScript,
    processOutgoing,
    processIncoming,
    processMessageForChat: processMessageForChatFn,
    detectLanguage,
    updateLivePreview,
    cancelLivePreview,
    checkNonLatinScript: (language: string) => !isLatinScriptLanguage(language),
    isSameLanguage,
    isLatinText,
    isLatinScriptLanguage,
    normalizeUnicode: (text: string) => text.normalize('NFC'),
    clearTranslationCache,
    isTranslating,
    isModelLoading,
    modelLoadProgress,
    isReady,
    error,
  };
}

export default useTranslationService;

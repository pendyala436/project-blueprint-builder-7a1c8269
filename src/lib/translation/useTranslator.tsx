/**
 * React Hook for Translation
 * Provides easy-to-use translation functionality in React components
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { translator } from './translator';
import { detectLanguage, isSameLanguage, isLatinScript } from './language-detector';
import type { TranslationResult, TranslationOptions } from './types';

interface LivePreview {
  originalText: string;
  previewText: string;
  isLoading: boolean;
}

interface UseTranslatorOptions {
  userLanguage?: string;
  partnerLanguage?: string;
  enableLivePreview?: boolean;
  previewDebounceMs?: number;
}

interface UseTranslatorReturn {
  // Translation functions
  translate: (text: string, options: TranslationOptions) => Promise<TranslationResult>;
  convertScript: (text: string, targetLanguage: string) => Promise<string>;
  translateBatch: (items: { text: string; options: TranslationOptions }[]) => Promise<TranslationResult[]>;
  
  // Language detection
  detectLanguage: (text: string) => ReturnType<typeof detectLanguage>;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  isLatinScript: (text: string) => boolean;
  
  // Live preview for chat input
  livePreview: LivePreview | null;
  updateLivePreview: (text: string) => void;
  clearLivePreview: () => void;
  
  // State
  isTranslating: boolean;
  lastError: string | null;
  
  // Message processing for chat
  processOutgoingMessage: (text: string) => Promise<{ original: string; converted: string; isConverted: boolean }>;
  processIncomingMessage: (text: string, senderLanguage: string) => Promise<{ original: string; translated: string; isTranslated: boolean }>;
  
  // Cache control
  clearCache: () => void;
}

export function useTranslator(options: UseTranslatorOptions = {}): UseTranslatorReturn {
  const {
    userLanguage = 'english',
    partnerLanguage = 'english',
    enableLivePreview = true,
    previewDebounceMs = 300
  } = options;

  const [isTranslating, setIsTranslating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState<LivePreview | null>(null);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Main translate function
  const translateText = useCallback(async (
    text: string, 
    opts: TranslationOptions
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setLastError(null);
    
    try {
      const result = await translator.translate(text, opts);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Translation failed';
      setLastError(error);
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Convert script (English typing to native script)
  const convertScriptFn = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<string> => {
    setIsTranslating(true);
    try {
      return await translator.convertScript(text, targetLanguage);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Batch translate
  const translateBatch = useCallback(async (
    items: { text: string; options: TranslationOptions }[]
  ): Promise<TranslationResult[]> => {
    setIsTranslating(true);
    try {
      const result = await translator.translateBatch(items);
      return result.results;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Live preview update (debounced)
  const updateLivePreview = useCallback((text: string) => {
    if (!enableLivePreview || !text.trim()) {
      setLivePreview(null);
      return;
    }

    // Skip if same language
    if (isSameLanguage(userLanguage, partnerLanguage)) {
      setLivePreview(null);
      return;
    }

    // Set loading state immediately
    setLivePreview({
      originalText: text,
      previewText: '',
      isLoading: true
    });

    // Debounce API call
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        // Check if Latin input needs conversion to native script
        if (isLatinScript(text) && userLanguage.toLowerCase() !== 'english') {
          const converted = await translator.convertScript(text, userLanguage);
          setLivePreview({
            originalText: text,
            previewText: converted,
            isLoading: false
          });
        } else {
          // Show how it will appear to partner
          const result = await translator.translate(text, {
            sourceLanguage: userLanguage,
            targetLanguage: partnerLanguage
          });
          setLivePreview({
            originalText: text,
            previewText: result.translatedText,
            isLoading: false
          });
        }
      } catch {
        setLivePreview(null);
      }
    }, previewDebounceMs);
  }, [userLanguage, partnerLanguage, enableLivePreview, previewDebounceMs]);

  // Clear live preview
  const clearLivePreview = useCallback(() => {
    setLivePreview(null);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  // Process outgoing message (for sender)
  const processOutgoingMessage = useCallback(async (text: string): Promise<{
    original: string;
    converted: string;
    isConverted: boolean;
  }> => {
    if (!text.trim()) {
      return { original: text, converted: text, isConverted: false };
    }

    // If typing in Latin and user's language is non-Latin, convert to native script
    if (isLatinScript(text) && userLanguage.toLowerCase() !== 'english') {
      try {
        const converted = await translator.convertScript(text, userLanguage);
        return {
          original: text,
          converted,
          isConverted: converted !== text
        };
      } catch {
        return { original: text, converted: text, isConverted: false };
      }
    }

    return { original: text, converted: text, isConverted: false };
  }, [userLanguage]);

  // Process incoming message (for receiver)
  const processIncomingMessage = useCallback(async (
    text: string,
    senderLanguage: string
  ): Promise<{
    original: string;
    translated: string;
    isTranslated: boolean;
  }> => {
    if (!text.trim()) {
      return { original: text, translated: text, isTranslated: false };
    }

    // Skip if same language
    if (isSameLanguage(senderLanguage, userLanguage)) {
      return { original: text, translated: text, isTranslated: false };
    }

    try {
      const result = await translator.translate(text, {
        sourceLanguage: senderLanguage,
        targetLanguage: userLanguage
      });
      
      return {
        original: text,
        translated: result.translatedText,
        isTranslated: result.isTranslated
      };
    } catch {
      return { original: text, translated: text, isTranslated: false };
    }
  }, [userLanguage]);

  // Clear cache
  const clearCache = useCallback(() => {
    translator.clearCache();
  }, []);

  return {
    translate: translateText,
    convertScript: convertScriptFn,
    translateBatch,
    detectLanguage,
    isSameLanguage,
    isLatinScript,
    livePreview,
    updateLivePreview,
    clearLivePreview,
    isTranslating,
    lastError,
    processOutgoingMessage,
    processIncomingMessage,
    clearCache
  };
}

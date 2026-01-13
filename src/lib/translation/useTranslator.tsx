/**
 * React Hook for Universal Translation
 * =====================================
 * Uses the Universal Translation System (translate.ts) for 1000+ languages
 * with semantic translation via Edge Function
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  translateText, 
  isSameLanguage, 
  isLatinScriptLanguage,
  isLatinText,
  normalizeLanguage,
  getLanguageInfo 
} from './translate';
import { dynamicTransliterate } from './dynamic-transliterator';

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

interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceCode?: string;
  targetCode?: string;
  isTranslated: boolean;
  model?: string;
  mode?: string;
}

interface UseTranslatorReturn {
  // Translation functions
  translate: (text: string, options: { sourceLanguage?: string; targetLanguage: string }) => Promise<TranslationResult>;
  convertScript: (text: string, targetLanguage: string) => Promise<string>;
  translateBatch: (items: { text: string; options: { sourceLanguage?: string; targetLanguage: string } }[]) => Promise<{ results: TranslationResult[] }>;
  
  // Language detection
  detectLanguage: (text: string) => { language: string; isLatin: boolean };
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

/**
 * Universal Translator Hook
 * Uses translateText from translate.ts for all translations
 */
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

  // Main translate function - uses Universal Translation
  const translateFn = useCallback(async (
    text: string, 
    opts: { sourceLanguage?: string; targetLanguage: string }
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setLastError(null);
    
    try {
      const source = opts.sourceLanguage || userLanguage;
      const result = await translateText(text, source, opts.targetLanguage);
      
      return {
        translatedText: result.text,
        originalText: result.originalText,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        isTranslated: result.isTranslated,
        mode: result.isSameLanguage ? 'same_language' : 'translate'
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Translation failed';
      setLastError(error);
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage: opts.sourceLanguage || userLanguage,
        targetLanguage: opts.targetLanguage,
        isTranslated: false
      };
    } finally {
      setIsTranslating(false);
    }
  }, [userLanguage]);

  // Convert script using dynamic transliteration (offline Gboard-style)
  const convertScriptFn = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<string> => {
    if (!text.trim()) return text;
    
    // If target uses Latin script, no conversion needed
    if (isLatinScriptLanguage(targetLanguage)) {
      return text;
    }
    
    // If text is already non-Latin, return as-is
    if (!isLatinText(text)) {
      return text;
    }
    
    try {
      // Use offline dynamic transliteration for instant Gboard-style conversion
      const converted = dynamicTransliterate(text, targetLanguage);
      return converted || text;
    } catch (err) {
      console.error('[useTranslator] Script conversion error:', err);
      return text;
    }
  }, []);

  // Batch translate
  const translateBatch = useCallback(async (
    items: { text: string; options: { sourceLanguage?: string; targetLanguage: string } }[]
  ): Promise<{ results: TranslationResult[] }> => {
    setIsTranslating(true);
    try {
      const results = await Promise.all(
        items.map(item => translateFn(item.text, item.options))
      );
      return { results };
    } finally {
      setIsTranslating(false);
    }
  }, [translateFn]);

  // Detect language
  const detectLanguageFn = useCallback((text: string): { language: string; isLatin: boolean } => {
    const isLatin = isLatinText(text);
    // Basic detection - return user's language or english based on script
    return {
      language: isLatin ? 'english' : userLanguage,
      isLatin
    };
  }, [userLanguage]);

  // Live preview update (debounced) - uses offline transliteration
  const updateLivePreview = useCallback((text: string) => {
    if (!enableLivePreview || !text.trim()) {
      setLivePreview(null);
      return;
    }

    // Skip if user language uses Latin script
    if (isLatinScriptLanguage(userLanguage)) {
      setLivePreview(null);
      return;
    }

    // Skip if text is already non-Latin
    if (!isLatinText(text)) {
      setLivePreview(null);
      return;
    }

    // Set loading state immediately
    setLivePreview({
      originalText: text,
      previewText: '',
      isLoading: true
    });

    // Debounce conversion
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        // Use offline dynamic transliteration for instant preview
        const converted = dynamicTransliterate(text, userLanguage);
        setLivePreview({
          originalText: text,
          previewText: converted || text,
          isLoading: false
        });
      } catch {
        setLivePreview({
          originalText: text,
          previewText: text,
          isLoading: false
        });
      }
    }, previewDebounceMs);
  }, [userLanguage, enableLivePreview, previewDebounceMs]);

  // Clear live preview
  const clearLivePreview = useCallback(() => {
    setLivePreview(null);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  // Process outgoing message (for sender) - uses offline transliteration
  const processOutgoingMessage = useCallback(async (text: string): Promise<{
    original: string;
    converted: string;
    isConverted: boolean;
  }> => {
    if (!text.trim()) {
      return { original: text, converted: text, isConverted: false };
    }

    // If user's language uses Latin script, no conversion needed
    if (isLatinScriptLanguage(userLanguage)) {
      return { original: text, converted: text, isConverted: false };
    }

    // If text is already non-Latin, return as-is
    if (!isLatinText(text)) {
      return { original: text, converted: text, isConverted: false };
    }

    try {
      // Use offline dynamic transliteration
      const converted = dynamicTransliterate(text, userLanguage);
      return {
        original: text,
        converted: converted || text,
        isConverted: converted !== text
      };
    } catch {
      return { original: text, converted: text, isConverted: false };
    }
  }, [userLanguage]);

  // Process incoming message (for receiver) - uses Universal Translation
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
      // Use Universal Translation (translateText)
      const result = await translateText(text, senderLanguage, userLanguage);
      
      return {
        original: text,
        translated: result.text,
        isTranslated: result.isTranslated
      };
    } catch {
      return { original: text, translated: text, isTranslated: false };
    }
  }, [userLanguage]);

  // Clear cache
  const clearCache = useCallback(() => {
    // Import and call clearCache from translate.ts
    import('./translate').then(module => {
      module.clearCache();
    });
  }, []);

  return {
    translate: translateFn,
    convertScript: convertScriptFn,
    translateBatch,
    detectLanguage: detectLanguageFn,
    isSameLanguage,
    isLatinScript: isLatinText,
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

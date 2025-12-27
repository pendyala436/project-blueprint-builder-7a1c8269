/**
 * Translation Service Hook
 * Uses browser-based @huggingface/transformers for FREE local translation
 * No external API calls or payments required
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  translateText, 
  detectLanguage as detectLang, 
  isLatinScript,
  preloadModel,
  isTranslationReady,
  getLoadingStatus
} from '@/lib/translation/browser-translator';

export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  model: string;
  usedPivot: boolean;
  pivotLanguage?: string;
  detectedLanguage?: string;
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
  const [isReady, setIsReady] = useState(isTranslationReady());

  // Preload model on first use
  useEffect(() => {
    if (!isReady && !isModelLoading) {
      const { isLoading } = getLoadingStatus();
      if (!isLoading) {
        setIsModelLoading(true);
        preloadModel((progress) => {
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

  // Translate text using browser-based model (FREE)
  const translate = useCallback(async (
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
        model: 'none',
        usedPivot: false,
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
        model: 'none',
        usedPivot: false,
      };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateText(
        text,
        sourceLanguage,
        targetLanguage,
        (progress) => setModelLoadProgress(progress)
      );

      return {
        translatedText: result.translatedText,
        originalText: result.originalText,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        isTranslated: result.isTranslated,
        model: result.model,
        usedPivot: false,
        detectedLanguage: result.sourceLanguage,
      };
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
        model: 'error',
        usedPivot: false,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Convert romanized text to native script (uses translation)
  const convertToNativeScript = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<ConversionResult> => {
    if (!text.trim()) {
      return { converted: text, isConverted: false };
    }

    // Check if text is Latin script
    if (!isLatinScript(text)) {
      return { converted: text, isConverted: false };
    }

    try {
      // Use translation from English to target language for conversion
      const result = await translateText(text, 'english', targetLanguage);
      
      return {
        converted: result.translatedText,
        isConverted: result.isTranslated,
      };
    } catch {
      return { converted: text, isConverted: false };
    }
  }, []);

  // Detect language from text
  const detectLanguage = useCallback((text: string): { language: string; isLatin: boolean } => {
    const trimmed = text.trim();
    if (!trimmed) return { language: 'english', isLatin: true };

    const detected = detectLang(trimmed);
    const latin = isLatinScript(trimmed);

    return { language: detected, isLatin: latin };
  }, []);

  return {
    translate,
    convertToNativeScript,
    detectLanguage,
    isTranslating,
    isModelLoading,
    modelLoadProgress,
    isReady,
    error,
  };
}

export default useTranslationService;

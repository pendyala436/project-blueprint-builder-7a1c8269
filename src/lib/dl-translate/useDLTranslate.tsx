/**
 * React Hook for DL-Translate
 * Server-based translation without client-side model
 */

import { useState, useCallback } from 'react';
import { TranslationModel } from './translator';
import { detectLanguage, isLatinScript, isSameLanguage } from './languages';
import type { TranslationResult } from './types';

interface UseDLTranslateReturn {
  translate: (text: string, source: string, target: string) => Promise<TranslationResult>;
  translateAuto: (text: string, target: string) => Promise<TranslationResult>;
  detect: (text: string) => { language: string; code: string };
  isTranslating: boolean;
  error: string | null;
  clearCache: () => void;
  isLatinScript: (text: string) => boolean;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
}

export function useDLTranslate(): UseDLTranslateReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model] = useState(() => new TranslationModel());

  const translate = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await model.translate(text, source, target);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMsg);
      return { text, source, target, isTranslated: false };
    } finally {
      setIsTranslating(false);
    }
  }, [model]);

  const translateAuto = useCallback(async (
    text: string,
    target: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await model.translateAuto(text, target);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMsg);
      return { text, source: 'auto', target, isTranslated: false };
    } finally {
      setIsTranslating(false);
    }
  }, [model]);

  const detect = useCallback((text: string) => {
    return model.detect(text);
  }, [model]);

  const clearCache = useCallback(() => {
    model.clearCache();
  }, [model]);

  return {
    translate,
    translateAuto,
    detect,
    isTranslating,
    error,
    clearCache,
    isLatinScript,
    isSameLanguage,
  };
}

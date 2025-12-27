/**
 * React Hook for DL-Translate
 * Provides easy integration of NLLB-200 translation in React components
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { TranslationModel, type TranslationResult, type TranslatorConfig } from './index';

interface UseDLTranslateOptions extends TranslatorConfig {
  autoLoad?: boolean;
}

interface UseDLTranslateReturn {
  // Translation functions
  translate: (text: string, source: string, target: string) => Promise<TranslationResult>;
  translateAuto: (text: string, target: string) => Promise<TranslationResult>;
  detect: (text: string) => { language: string; code: string };
  
  // State
  isLoading: boolean;
  isReady: boolean;
  loadProgress: number;
  error: string | null;
  
  // Control
  load: () => Promise<boolean>;
  clearCache: () => void;
}

export function useDLTranslate(options: UseDLTranslateOptions = {}): UseDLTranslateReturn {
  const { autoLoad = true, ...config } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const modelRef = useRef<TranslationModel | null>(null);

  // Initialize model
  useEffect(() => {
    modelRef.current = new TranslationModel({
      ...config,
      onProgress: (progress) => {
        setLoadProgress(Math.round(progress * 100));
        config.onProgress?.(progress);
      },
    });
    
    if (autoLoad) {
      load();
    }
    
    return () => {
      modelRef.current?.clearCache();
    };
  }, []);

  const load = useCallback(async (): Promise<boolean> => {
    if (!modelRef.current) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await modelRef.current.load();
      setIsReady(success);
      if (!success) {
        setError('Failed to load translation model');
      }
      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const translate = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResult> => {
    if (!modelRef.current) {
      throw new Error('Model not initialized');
    }
    return modelRef.current.translate(text, source, target);
  }, []);

  const translateAuto = useCallback(async (
    text: string,
    target: string
  ): Promise<TranslationResult> => {
    if (!modelRef.current) {
      throw new Error('Model not initialized');
    }
    return modelRef.current.translateAuto(text, target);
  }, []);

  const detect = useCallback((text: string): { language: string; code: string } => {
    if (!modelRef.current) {
      return { language: 'english', code: 'eng_Latn' };
    }
    return modelRef.current.detect(text);
  }, []);

  const clearCache = useCallback(() => {
    modelRef.current?.clearCache();
  }, []);

  return {
    translate,
    translateAuto,
    detect,
    isLoading,
    isReady,
    loadProgress,
    error,
    load,
    clearCache,
  };
}

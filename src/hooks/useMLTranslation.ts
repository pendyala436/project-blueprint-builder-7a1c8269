/**
 * React Hook for Browser-based ML Translation
 * 
 * Uses Transformers.js with NLLB-200 model for 200+ language support
 * Runs entirely in the browser - NO external API calls
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  initializeMLTranslator,
  translateWithML,
  translateBatchWithML,
  isMLTranslatorReady,
  isMLTranslatorLoading,
  disposeMLTranslator,
  clearMLCache,
  getMLCacheStats,
  getNLLBCode,
  isNLLBSupported,
  getSupportedNLLBLanguages,
} from '@/lib/translation/ml-translation-engine';

export interface MLTranslationProgress {
  status: 'idle' | 'loading' | 'downloading' | 'ready' | 'error';
  progress: number;
  file?: string;
}

export interface UseMLTranslationOptions {
  autoLoad?: boolean;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface UseMLTranslationReturn {
  // State
  isReady: boolean;
  isLoading: boolean;
  progress: MLTranslationProgress;
  error: string | null;
  
  // Methods
  initialize: () => Promise<boolean>;
  translate: (text: string, source?: string, target?: string) => Promise<string>;
  translateBatch: (texts: string[], source?: string, target?: string) => Promise<string[]>;
  dispose: () => Promise<void>;
  
  // Utilities
  clearCache: () => void;
  getCacheStats: () => { size: number; maxSize: number };
  isSupported: (language: string) => boolean;
  getLanguageCode: (language: string) => string;
  getSupportedLanguages: () => string[];
}

export function useMLTranslation(
  options: UseMLTranslationOptions = {}
): UseMLTranslationReturn {
  const { 
    autoLoad = false, 
    sourceLanguage = 'english', 
    targetLanguage = 'hindi' 
  } = options;
  
  const [isReady, setIsReady] = useState(isMLTranslatorReady());
  const [isLoading, setIsLoading] = useState(isMLTranslatorLoading());
  const [progress, setProgress] = useState<MLTranslationProgress>({
    status: 'idle',
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  
  const defaultSourceRef = useRef(sourceLanguage);
  const defaultTargetRef = useRef(targetLanguage);
  
  // Update refs when props change
  useEffect(() => {
    defaultSourceRef.current = sourceLanguage;
    defaultTargetRef.current = targetLanguage;
  }, [sourceLanguage, targetLanguage]);
  
  // Initialize the model
  const initialize = useCallback(async (): Promise<boolean> => {
    if (isMLTranslatorReady()) {
      setIsReady(true);
      setProgress({ status: 'ready', progress: 100 });
      return true;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await initializeMLTranslator((progressData) => {
        setProgress({
          status: progressData.status as MLTranslationProgress['status'],
          progress: progressData.progress ?? 0,
          file: progressData.file,
        });
      });
      
      setIsReady(success);
      if (!success) {
        setError('Failed to initialize translation model');
      }
      
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setProgress({ status: 'error', progress: 0 });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && !isMLTranslatorReady() && !isMLTranslatorLoading()) {
      initialize();
    }
  }, [autoLoad, initialize]);
  
  // Translate single text
  const translate = useCallback(async (
    text: string,
    source?: string,
    target?: string
  ): Promise<string> => {
    const srcLang = source || defaultSourceRef.current;
    const tgtLang = target || defaultTargetRef.current;
    
    // Initialize if not ready
    if (!isMLTranslatorReady()) {
      const success = await initialize();
      if (!success) {
        console.warn('[useMLTranslation] Model not available, returning original text');
        return text;
      }
    }
    
    const result = await translateWithML(text, srcLang, tgtLang);
    return result || text;
  }, [initialize]);
  
  // Translate batch
  const translateBatch = useCallback(async (
    texts: string[],
    source?: string,
    target?: string
  ): Promise<string[]> => {
    const srcLang = source || defaultSourceRef.current;
    const tgtLang = target || defaultTargetRef.current;
    
    // Initialize if not ready
    if (!isMLTranslatorReady()) {
      const success = await initialize();
      if (!success) {
        return texts;
      }
    }
    
    return translateBatchWithML(texts, srcLang, tgtLang);
  }, [initialize]);
  
  // Dispose model
  const dispose = useCallback(async (): Promise<void> => {
    await disposeMLTranslator();
    setIsReady(false);
    setProgress({ status: 'idle', progress: 0 });
  }, []);
  
  return {
    // State
    isReady,
    isLoading,
    progress,
    error,
    
    // Methods
    initialize,
    translate,
    translateBatch,
    dispose,
    
    // Utilities
    clearCache: clearMLCache,
    getCacheStats: getMLCacheStats,
    isSupported: isNLLBSupported,
    getLanguageCode: getNLLBCode,
    getSupportedLanguages: getSupportedNLLBLanguages,
  };
}

export default useMLTranslation;

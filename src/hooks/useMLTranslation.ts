/**
 * React Hook for Browser-based Dictionary Translation
 * 
 * Uses DL-Translate pattern with embedded dictionaries
 * Runs entirely in the browser - NO external API calls - NO ML models
 * 
 * Based on:
 * - https://github.com/xhluca/dl-translate (API pattern)
 * - https://github.com/Goutam245/Language-Translator-Web-Application (pure JS dictionary)
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
  getDLM2M100Code,
  isDLM2M100Supported,
  getSupportedDLM2M100Languages,
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
  
  // Dictionary-based translator is always ready (no model to load)
  const [isReady, setIsReady] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<MLTranslationProgress>({
    status: 'ready',
    progress: 100,
  });
  const [error, setError] = useState<string | null>(null);
  
  const defaultSourceRef = useRef(sourceLanguage);
  const defaultTargetRef = useRef(targetLanguage);
  
  // Update refs when props change
  useEffect(() => {
    defaultSourceRef.current = sourceLanguage;
    defaultTargetRef.current = targetLanguage;
  }, [sourceLanguage, targetLanguage]);
  
  // Initialize (instant for dictionary-based)
  const initialize = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await initializeMLTranslator((progressData) => {
        setProgress({
          status: progressData.status as MLTranslationProgress['status'],
          progress: progressData.progress ?? 100,
          file: progressData.file,
        });
      });
      
      setIsReady(success);
      setProgress({ status: 'ready', progress: 100 });
      console.log('[DL-Translate Hook] Dictionary translator ready');
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
  
  // Auto-initialize on mount if enabled
  useEffect(() => {
    if (autoLoad) {
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
    
    const result = await translateWithML(text, srcLang, tgtLang);
    return result || text;
  }, []);
  
  // Translate batch
  const translateBatch = useCallback(async (
    texts: string[],
    source?: string,
    target?: string
  ): Promise<string[]> => {
    const srcLang = source || defaultSourceRef.current;
    const tgtLang = target || defaultTargetRef.current;
    
    return translateBatchWithML(texts, srcLang, tgtLang);
  }, []);
  
  // Dispose (clear cache)
  const dispose = useCallback(async (): Promise<void> => {
    await disposeMLTranslator();
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
    isSupported: isDLM2M100Supported,
    getLanguageCode: getDLM2M100Code,
    getSupportedLanguages: getSupportedDLM2M100Languages,
  };
}

export default useMLTranslation;

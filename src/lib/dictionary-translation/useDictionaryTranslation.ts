/**
 * React Hook for Dictionary-Based Translation
 * =============================================
 * 
 * Provides a convenient React hook interface for the dictionary translation engine.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  translateWithDictionary,
  translateForChat,
  initializeEngine,
  isEngineReady,
  getCacheStats,
  configureEngine,
} from './engine';
import type {
  DictionaryTranslationResult,
  DictionaryChatResult,
  DictionaryEngineConfig,
} from './types';

// ============================================================
// TYPES
// ============================================================

export interface UseDictionaryTranslationOptions {
  autoInitialize?: boolean;
  config?: Partial<DictionaryEngineConfig>;
}

export interface UseDictionaryTranslationReturn {
  // State
  isReady: boolean;
  isTranslating: boolean;
  error: string | null;
  
  // Translation functions
  translate: (text: string, source: string, target: string) => Promise<DictionaryTranslationResult>;
  translateChat: (text: string, sender: string, receiver: string) => Promise<DictionaryChatResult>;
  
  // Quick translate (for live preview)
  quickTranslate: (text: string, source: string, target: string) => Promise<string>;
  
  // Engine management
  initialize: () => Promise<void>;
  configure: (options: Partial<DictionaryEngineConfig>) => void;
  
  // Stats
  cacheStats: { results: number; phrases: number; ready: boolean };
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useDictionaryTranslation(
  options: UseDictionaryTranslationOptions = {}
): UseDictionaryTranslationReturn {
  const { autoInitialize = true, config } = options;
  
  const [isReady, setIsReady] = useState(isEngineReady());
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState(getCacheStats());
  
  const initializingRef = useRef(false);
  
  // Initialize engine
  const initialize = useCallback(async () => {
    if (initializingRef.current || isEngineReady()) {
      setIsReady(true);
      return;
    }
    
    initializingRef.current = true;
    setError(null);
    
    try {
      if (config) {
        configureEngine(config);
      }
      
      await initializeEngine();
      setIsReady(true);
      setCacheStats(getCacheStats());
    } catch (err) {
      console.error('[useDictionaryTranslation] Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize translation engine');
    } finally {
      initializingRef.current = false;
    }
  }, [config]);
  
  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }
  }, [autoInitialize, initialize]);
  
  // Configure engine
  const configure = useCallback((options: Partial<DictionaryEngineConfig>) => {
    configureEngine(options);
  }, []);
  
  // Translate function
  const translate = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<DictionaryTranslationResult> => {
    if (!isReady) {
      await initialize();
    }
    
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translateWithDictionary(text, source, target);
      setCacheStats(getCacheStats());
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      setError(message);
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, [isReady, initialize]);
  
  // Translate for chat
  const translateChat = useCallback(async (
    text: string,
    sender: string,
    receiver: string
  ): Promise<DictionaryChatResult> => {
    if (!isReady) {
      await initialize();
    }
    
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translateForChat(text, sender, receiver);
      setCacheStats(getCacheStats());
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat translation failed';
      setError(message);
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, [isReady, initialize]);
  
  // Quick translate (just returns text)
  const quickTranslate = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<string> => {
    try {
      const result = await translate(text, source, target);
      return result.text;
    } catch {
      return text;
    }
  }, [translate]);
  
  return {
    isReady,
    isTranslating,
    error,
    translate,
    translateChat,
    quickTranslate,
    initialize,
    configure,
    cacheStats,
  };
}

export default useDictionaryTranslation;

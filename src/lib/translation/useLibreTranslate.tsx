/**
 * useLibreTranslate React Hook
 * ============================
 * Pure TypeScript translation hook inspired by LibreTranslate
 * Provides sync/async translation with English pivot
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  detectLanguage,
  isLatinScript,
  normalizeLanguage,
  transliterate,
  translateLocal,
  convertToNativeScript,
  translate,
  processMessageForChat,
  type TranslationResult,
  type DetectionResult,
} from './libre-translate';

export interface UseLibreTranslateOptions {
  userLanguage?: string;
  partnerLanguage?: string;
  enableLivePreview?: boolean;
}

export interface LivePreview {
  text: string;
  nativeScript: string;
  targetLanguage: string;
  timestamp: number;
}

export interface UseLibreTranslateReturn {
  // State
  isTranslating: boolean;
  error: string | null;
  livePreview: LivePreview | null;
  
  // Sync functions (instant, <5ms)
  detect: (text: string) => DetectionResult;
  isLatin: (text: string) => boolean;
  normalize: (lang: string) => string;
  toNativeScript: (text: string, language: string) => string;
  translateSync: (text: string, source: string, target: string) => TranslationResult;
  
  // Async functions
  translateAsync: (text: string, source?: string, target?: string) => Promise<TranslationResult>;
  processForChat: (text: string, senderLang: string, receiverLang: string) => Promise<{
    senderView: string;
    receiverView: string;
    wasTransliterated: boolean;
    wasTranslated: boolean;
  }>;
  
  // Live preview
  updateLivePreview: (text: string, targetLanguage?: string) => void;
  clearLivePreview: () => void;
  
  // Utilities
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  needsTranslation: (senderLang: string, receiverLang: string) => boolean;
}

export function useLibreTranslate(options: UseLibreTranslateOptions = {}): UseLibreTranslateReturn {
  const { userLanguage = 'english', partnerLanguage = 'english', enableLivePreview = true } = options;
  
  // State
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState<LivePreview | null>(null);
  
  // Refs for debouncing
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // ============================================================
  // SYNC FUNCTIONS (Instant)
  // ============================================================
  
  const detect = useCallback((text: string): DetectionResult => {
    return detectLanguage(text);
  }, []);
  
  const isLatin = useCallback((text: string): boolean => {
    return isLatinScript(text);
  }, []);
  
  const normalize = useCallback((lang: string): string => {
    return normalizeLanguage(lang);
  }, []);
  
  const toNativeScript = useCallback((text: string, language: string): string => {
    return convertToNativeScript(text, language);
  }, []);
  
  const translateSync = useCallback((text: string, source: string, target: string): TranslationResult => {
    return translateLocal(text, source, target);
  }, []);
  
  const isSameLanguage = useCallback((lang1: string, lang2: string): boolean => {
    return normalizeLanguage(lang1) === normalizeLanguage(lang2);
  }, []);
  
  const needsTranslation = useCallback((senderLang: string, receiverLang: string): boolean => {
    return !isSameLanguage(senderLang, receiverLang);
  }, [isSameLanguage]);
  
  // ============================================================
  // ASYNC FUNCTIONS
  // ============================================================
  
  const translateAsync = useCallback(async (
    text: string,
    source?: string,
    target?: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translate(
        text,
        source || userLanguage,
        target || partnerLanguage
      );
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMsg);
      // Fallback to sync
      return translateLocal(text, source || userLanguage, target || partnerLanguage);
    } finally {
      setIsTranslating(false);
    }
  }, [userLanguage, partnerLanguage]);
  
  const processForChat = useCallback(async (
    text: string,
    senderLang: string,
    receiverLang: string
  ) => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await processMessageForChat(text, senderLang, receiverLang);
      return {
        senderView: result.senderView,
        receiverView: result.receiverView,
        wasTransliterated: result.wasTransliterated,
        wasTranslated: result.wasTranslated
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMsg);
      return {
        senderView: text,
        receiverView: text,
        wasTransliterated: false,
        wasTranslated: false
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);
  
  // ============================================================
  // LIVE PREVIEW
  // ============================================================
  
  const updateLivePreview = useCallback((text: string, targetLanguage?: string) => {
    if (!enableLivePreview) return;
    
    // Clear existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Debounce preview generation
    previewTimeoutRef.current = setTimeout(() => {
      const target = targetLanguage || userLanguage;
      const detected = detectLanguage(text);
      
      if (detected.script === 'Latin' && target !== 'english') {
        const nativeScript = convertToNativeScript(text, target);
        setLivePreview({
          text,
          nativeScript,
          targetLanguage: target,
          timestamp: Date.now()
        });
      } else {
        setLivePreview(null);
      }
    }, 100); // 100ms debounce
  }, [userLanguage, enableLivePreview]);
  
  const clearLivePreview = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    setLivePreview(null);
  }, []);
  
  // ============================================================
  // RETURN
  // ============================================================
  
  return useMemo(() => ({
    // State
    isTranslating,
    error,
    livePreview,
    
    // Sync functions
    detect,
    isLatin,
    normalize,
    toNativeScript,
    translateSync,
    
    // Async functions
    translateAsync,
    processForChat,
    
    // Live preview
    updateLivePreview,
    clearLivePreview,
    
    // Utilities
    isSameLanguage,
    needsTranslation
  }), [
    isTranslating,
    error,
    livePreview,
    detect,
    isLatin,
    normalize,
    toNativeScript,
    translateSync,
    translateAsync,
    processForChat,
    updateLivePreview,
    clearLivePreview,
    isSameLanguage,
    needsTranslation
  ]);
}

export default useLibreTranslate;

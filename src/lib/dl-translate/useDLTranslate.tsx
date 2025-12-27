/**
 * React Hook for DL-Translate
 * Handles chat translation with auto-detection
 */

import { useState, useCallback, useRef } from 'react';
import { 
  translate, 
  translateForChat, 
  convertToNativeScript,
  detect,
  clearCache as clearTranslationCache 
} from './translator';
import { isSameLanguage, isLatinScript, getNativeName, detectLanguage } from './languages';
import type { TranslationResult, ChatTranslationOptions } from './types';

interface UseDLTranslateReturn {
  // Translation functions
  translate: (text: string, source?: string, target?: string) => Promise<TranslationResult>;
  translateForChat: (text: string, options: ChatTranslationOptions) => Promise<TranslationResult>;
  convertToNative: (text: string, targetLanguage: string) => Promise<TranslationResult>;
  
  // Detection
  detect: (text: string) => { language: string; isLatin: boolean };
  detectLanguage: (text: string) => string;
  
  // Utilities
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  isLatinScript: (text: string) => boolean;
  getNativeName: (language: string) => string;
  
  // State
  isTranslating: boolean;
  error: string | null;
  
  // Cache
  clearCache: () => void;
}

export function useDLTranslate(): UseDLTranslateReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<AbortController | null>(null);

  const translateFn = useCallback(async (
    text: string,
    source?: string,
    target?: string
  ): Promise<TranslationResult> => {
    // Cancel pending request
    pendingRef.current?.abort();
    pendingRef.current = new AbortController();

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translate(text, source, target);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMsg);
      return {
        text,
        originalText: text,
        source: source || 'english',
        target: target || 'english',
        isTranslated: false,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const translateForChatFn = useCallback(async (
    text: string,
    options: ChatTranslationOptions
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateForChat(text, options);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMsg);
      return {
        text,
        originalText: text,
        source: options.senderLanguage,
        target: options.receiverLanguage,
        isTranslated: false,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const convertToNativeFn = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);

    try {
      const result = await convertToNativeScript(text, targetLanguage);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Conversion failed';
      setError(errorMsg);
      return {
        text,
        originalText: text,
        source: 'english',
        target: targetLanguage,
        isTranslated: false,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    clearTranslationCache();
  }, []);

  return {
    translate: translateFn,
    translateForChat: translateForChatFn,
    convertToNative: convertToNativeFn,
    detect,
    detectLanguage,
    isSameLanguage,
    isLatinScript,
    getNativeName,
    isTranslating,
    error,
    clearCache,
  };
}

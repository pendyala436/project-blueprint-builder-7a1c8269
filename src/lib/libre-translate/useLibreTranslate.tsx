/**
 * useLibreTranslate React Hook
 * ============================
 * 
 * React hook for browser-based translation inspired by LibreTranslate.
 * Provides easy access to all translation features.
 * 
 * @example
 * ```tsx
 * import { useLibreTranslate } from '@/lib/libre-translate';
 * 
 * function ChatComponent() {
 *   const { translate, getPreview, isTranslating } = useLibreTranslate();
 *   
 *   // Get instant preview while typing
 *   const preview = getPreview('namaste', 'hindi'); // "नमस्ते"
 *   
 *   // Translate message
 *   const handleSend = async (text: string) => {
 *     const result = await translate(text, 'english', 'hindi');
 *     console.log(result.text);
 *   };
 * }
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import {
  translate as coreTranslate,
  translateBidirectional as coreBidirectional,
  processChatMessage as coreProcessChat,
  processOutgoing,
  processIncoming,
  getInstantPreview,
  transliterateToNative,
  reverseTransliterate,
  clearCache,
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  detectScript,
} from './engine';
import type {
  TranslationResult,
  ChatMessageViews,
  ChatProcessingOptions,
  BidirectionalResult,
} from './types';

export interface UseLibreTranslateReturn {
  // Core translation
  translate: (text: string, source: string, target: string) => Promise<TranslationResult>;
  translateBidirectional: (text: string, source: string, target: string) => Promise<BidirectionalResult>;
  
  // Chat processing
  processChatMessage: (text: string, options: ChatProcessingOptions) => Promise<ChatMessageViews>;
  processOutgoing: (text: string, senderLanguage: string) => { senderView: string; wasTransliterated: boolean };
  processIncoming: (text: string, senderLanguage: string, receiverLanguage: string) => Promise<{ receiverView: string; wasTranslated: boolean }>;
  
  // Live preview (synchronous)
  getPreview: (text: string, targetLanguage: string) => string;
  
  // Transliteration
  transliterate: (text: string, targetLanguage: string) => string;
  reverseTransliterate: (text: string, sourceLanguage: string) => string;
  
  // Language utilities
  normalizeLanguage: (lang: string) => string;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  isEnglish: (lang: string) => boolean;
  isLatinScript: (text: string) => boolean;
  isLatinLanguage: (lang: string) => boolean;
  detectScript: typeof detectScript;
  
  // State
  isTranslating: boolean;
  error: string | null;
  
  // Cache
  clearCache: () => void;
}

export function useLibreTranslate(): UseLibreTranslateReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wrapped translate with state management
  const translate = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await coreTranslate(text, source, target);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Translation failed';
      setError(errorMessage);
      return {
        text,
        originalText: text,
        sourceLanguage: source,
        targetLanguage: target,
        isTranslated: false,
        wasTransliterated: false,
        confidence: 0,
        mode: 'passthrough',
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Wrapped bidirectional with state management
  const translateBidirectional = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<BidirectionalResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      return await coreBidirectional(text, source, target);
    } catch (err: any) {
      setError(err.message || 'Translation failed');
      const fallback: TranslationResult = {
        text,
        originalText: text,
        sourceLanguage: source,
        targetLanguage: target,
        isTranslated: false,
        wasTransliterated: false,
        confidence: 0,
        mode: 'passthrough',
      };
      return { forward: fallback, backward: fallback };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Wrapped chat processing with state management
  const processChatMessage = useCallback(async (
    text: string,
    options: ChatProcessingOptions
  ): Promise<ChatMessageViews> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      return await coreProcessChat(text, options);
    } catch (err: any) {
      setError(err.message || 'Processing failed');
      return {
        originalText: text,
        senderView: text,
        receiverView: text,
        wasTransliterated: false,
        wasTranslated: false,
        combination: 'same-native-native',
        typingMode: options.typingMode,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Memoized return object
  return useMemo(() => ({
    // Core translation
    translate,
    translateBidirectional,
    
    // Chat processing
    processChatMessage,
    processOutgoing,
    processIncoming,
    
    // Live preview
    getPreview: getInstantPreview,
    
    // Transliteration
    transliterate: transliterateToNative,
    reverseTransliterate,
    
    // Language utilities
    normalizeLanguage,
    isSameLanguage,
    isEnglish,
    isLatinScript: isLatinText,
    isLatinLanguage: isLatinScriptLanguage,
    detectScript,
    
    // State
    isTranslating,
    error,
    
    // Cache
    clearCache,
  }), [translate, translateBidirectional, processChatMessage, isTranslating, error]);
}

export default useLibreTranslate;

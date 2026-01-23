/**
 * Translation Service Hook (Unified)
 * ===================================
 * 
 * SINGLE SOURCE: Uses Universal Offline Translation Engine
 * Supports 1000+ languages from languages.ts
 * NO external APIs - NO NLLB-200 - NO hardcoding
 * 
 * Features:
 * - Meaning-based translation via dictionary lookups
 * - English pivot for cross-language communication
 * - Native script conversion (Latin ↔ Native)
 * - Real-time typing preview
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// Import from unified translation system
import {
  translateText,
  isLatinText,
  isLatinScriptLanguage,
  isSameLanguage,
  autoDetectLanguage,
  normalizeLanguage,
  needsScriptConversion,
  clearCache,
  processMessageForChat,
  transliterateToNative,
  getNativeScriptPreview,
} from '@/lib/translation';

// Import from universal offline engine for enhanced offline support
import {
  translateUniversal,
  translateBidirectionalChat,
  getLiveNativePreview,
  getLiveLatinPreview,
  initializeEngine,
  isEngineReady,
  getAllLanguages,
  getLanguageCount,
  isLanguageSupported,
  isRTL,
  type UniversalTranslationResult,
  type BidirectionalChatResult,
} from '@/lib/translation/universal-offline-engine';

// Re-export types
export interface TranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  wasTransliterated: boolean;
  confidence?: number;
  method?: string;
}

export interface ChatProcessResult {
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
  confidence?: number;
}

export interface LanguageInfo {
  name: string;
  code: string;
  nativeName: string;
  script: string;
  rtl?: boolean;
}

export interface ConversionResult {
  converted: string;
  isConverted: boolean;
}

export function useTranslationService() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(isEngineReady());
  
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize universal engine on mount
  useEffect(() => {
    if (!isReady) {
      initializeEngine().then(() => {
        setIsReady(true);
      });
    }
    
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [isReady]);

  // Translate text - tries universal offline first, falls back to Edge Function
  const translateTextFn = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    const originalText = text.trim().normalize('NFC');
    
    if (!originalText) {
      return {
        text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: false,
      };
    }

    if (isSameLanguage(sourceLanguage, targetLanguage)) {
      // Same language - just convert script if needed
      const nativeView = getLiveNativePreview(originalText, targetLanguage);
      return {
        text: nativeView,
        originalText,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: nativeView !== originalText,
      };
    }

    setIsTranslating(true);
    setError(null);

    try {
      // Try universal offline translation first
      const offlineResult = await translateUniversal(originalText, sourceLanguage, targetLanguage);
      
      if (offlineResult.isTranslated || offlineResult.confidence > 0.5) {
        return {
          text: offlineResult.text,
          originalText,
          sourceLanguage,
          targetLanguage,
          isTranslated: offlineResult.isTranslated,
          wasTransliterated: offlineResult.isTransliterated,
          confidence: offlineResult.confidence,
          method: offlineResult.method,
        };
      }
      
      // Fallback to Edge Function for better semantic translation
      const result = await translateText(originalText, sourceLanguage, targetLanguage);
      return {
        text: result.text,
        originalText,
        sourceLanguage,
        targetLanguage,
        isTranslated: result.isTranslated,
        wasTransliterated: false,
        confidence: result.confidence,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      console.error('[TranslationService] Error:', message);
      setError(message);
      
      // Final fallback - just return transliterated text
      const fallbackText = getLiveNativePreview(originalText, targetLanguage);
      return {
        text: fallbackText,
        originalText,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: fallbackText !== originalText,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Convert Latin text to native script
  const convertToNativeScript = useCallback((
    text: string,
    targetLanguage: string
  ): ConversionResult => {
    const trimmed = text.trim().normalize('NFC');
    
    if (!trimmed || !isLatinText(trimmed) || isLatinScriptLanguage(targetLanguage)) {
      return { converted: trimmed || text, isConverted: false };
    }

    try {
      const result = transliterateToNative(trimmed, targetLanguage);
      return {
        converted: result,
        isConverted: result !== trimmed,
      };
    } catch {
      return { converted: trimmed, isConverted: false };
    }
  }, []);

  // Process outgoing message (sender's view)
  const processOutgoing = useCallback((
    text: string,
    senderLanguage: string
  ): { senderView: string; wasTransliterated: boolean } => {
    const trimmed = text.trim().normalize('NFC');
    
    if (!trimmed || isLatinScriptLanguage(senderLanguage) || !isLatinText(trimmed)) {
      return { senderView: trimmed || text, wasTransliterated: false };
    }

    const result = getLiveNativePreview(trimmed, senderLanguage);
    return {
      senderView: result,
      wasTransliterated: result !== trimmed,
    };
  }, []);

  // Process incoming message (receiver's view) - uses universal offline
  const processIncoming = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<{ receiverView: string; wasTranslated: boolean }> => {
    const trimmed = text.trim().normalize('NFC');
    
    if (!trimmed) {
      return { receiverView: text, wasTranslated: false };
    }

    if (isSameLanguage(senderLanguage, receiverLanguage)) {
      if (!isLatinScriptLanguage(receiverLanguage) && isLatinText(trimmed)) {
        const result = getLiveNativePreview(trimmed, receiverLanguage);
        return { receiverView: result, wasTranslated: false };
      }
      return { receiverView: trimmed, wasTranslated: false };
    }

    // Use universal offline bidirectional translation
    const result = await translateBidirectionalChat(trimmed, senderLanguage, receiverLanguage);
    return {
      receiverView: result.receiverView,
      wasTranslated: result.wasTranslated,
    };
  }, []);

  // Full chat message processing
  const processMessageForChatFn = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<ChatProcessResult> => {
    try {
      // Use universal offline for chat
      const result = await translateBidirectionalChat(text, senderLanguage, receiverLanguage);
      return {
        senderView: result.senderView,
        receiverView: result.receiverView,
        originalText: result.originalText,
        wasTransliterated: result.wasTransliterated,
        wasTranslated: result.wasTranslated,
        confidence: result.confidence,
      };
    } catch {
      // Fallback to Edge Function
      return await processMessageForChat(text, senderLanguage, receiverLanguage);
    }
  }, []);

  // Detect language from text
  const detectLanguage = useCallback((
    text: string
  ): { language: string; isLatin: boolean } => {
    const trimmed = text.trim().normalize('NFC');
    if (!trimmed) return { language: 'english', isLatin: true };

    try {
      const detected = autoDetectLanguage(trimmed);
      return { language: detected.language, isLatin: detected.isLatin };
    } catch {
      return { language: 'english', isLatin: true };
    }
  }, []);

  // Update live preview (debounced)
  const updateLivePreview = useCallback((
    text: string,
    targetLanguage: string
  ): Promise<string> => {
    return new Promise((resolve) => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      
      previewTimeoutRef.current = setTimeout(() => {
        const preview = getLiveNativePreview(text, targetLanguage);
        resolve(preview);
      }, 50); // Reduced debounce for faster preview
    });
  }, []);

  // Cancel live preview
  const cancelLivePreview = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  }, []);

  // Clear translation cache
  const clearTranslationCache = useCallback((): void => {
    clearCache();
    console.log('[TranslationService] Cache cleared');
  }, []);

  // Get all supported languages
  const getSupportedLanguages = useCallback(() => {
    return getAllLanguages();
  }, []);

  // Get language count
  const getTotalLanguageCount = useCallback(() => {
    return getLanguageCount();
  }, []);

  // Check if language is supported
  const checkLanguageSupported = useCallback((lang: string) => {
    return isLanguageSupported(lang);
  }, []);

  // Check if language is RTL
  const checkRTL = useCallback((lang: string) => {
    return isRTL(lang);
  }, []);

  return {
    // Translation functions
    translate: translateTextFn,
    convertToNativeScript,
    processOutgoing,
    processIncoming,
    processMessageForChat: processMessageForChatFn,
    
    // Detection
    detectLanguage,
    
    // Preview
    updateLivePreview,
    cancelLivePreview,
    
    // Language utilities
    checkNonLatinScript: (language: string) => !isLatinScriptLanguage(language),
    isSameLanguage,
    isLatinText,
    isLatinScriptLanguage,
    normalizeUnicode: (text: string) => text.normalize('NFC'),
    normalizeLanguage,
    
    // Language data
    getSupportedLanguages,
    getTotalLanguageCount,
    checkLanguageSupported,
    checkRTL,
    
    // Cache
    clearTranslationCache,
    
    // State
    isTranslating,
    isModelLoading,
    modelLoadProgress,
    isReady,
    error,
  };
}

export default useTranslationService;

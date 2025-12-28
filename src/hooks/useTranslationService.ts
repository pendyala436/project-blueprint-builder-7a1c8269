/**
 * Translation Service Hook
 * Uses server-side DL-Translate edge function for translation
 * No browser-based translation - all processing happens on the server
 */

import { useState, useCallback } from 'react';
import { 
  translate, 
  convertToNativeScript,
  processIncomingMessage,
  processOutgoingMessage
} from '@/lib/dl-translate/translator';
import { 
  detectLanguage as detectLang, 
  isLatinScript as checkLatinScript,
  isSameLanguage
} from '@/lib/dl-translate/languages';

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
  const [error, setError] = useState<string | null>(null);

  // Translate text using server-side dl-translate
  const translateText = useCallback(async (
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
    if (isSameLanguage(sourceLanguage, targetLanguage)) {
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
      const result = await translate(text, sourceLanguage, targetLanguage);

      return {
        translatedText: result.text,
        originalText: result.originalText,
        sourceLanguage: result.source,
        targetLanguage: result.target,
        isTranslated: result.isTranslated,
        model: 'dl-translate-server',
        usedPivot: false,
        detectedLanguage: result.detectedLanguage,
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

  // Convert romanized text to native script (uses server translation)
  const convertToNative = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<ConversionResult> => {
    if (!text.trim()) {
      return { converted: text, isConverted: false };
    }

    // Check if text is Latin script
    if (!checkLatinScript(text)) {
      return { converted: text, isConverted: false };
    }

    try {
      const result = await convertToNativeScript(text, targetLanguage);
      
      return {
        converted: result.text,
        isConverted: result.isTranslated,
      };
    } catch {
      return { converted: text, isConverted: false };
    }
  }, []);

  // Process outgoing message (convert Latin typing to native script)
  const processOutgoing = useCallback(async (
    text: string,
    userLanguage: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    try {
      const result = await processOutgoingMessage(text, userLanguage);
      return {
        translatedText: result.text,
        originalText: result.originalText,
        sourceLanguage: result.source,
        targetLanguage: result.target,
        isTranslated: result.isTranslated,
        model: 'dl-translate-server',
        usedPivot: false,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Process incoming message (translate to receiver's language)
  const processIncoming = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    try {
      const result = await processIncomingMessage(text, senderLanguage, receiverLanguage);
      return {
        translatedText: result.text,
        originalText: result.originalText,
        sourceLanguage: result.source,
        targetLanguage: result.target,
        isTranslated: result.isTranslated,
        model: 'dl-translate-server',
        usedPivot: false,
        detectedLanguage: result.detectedLanguage,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Detect language from text
  const detectLanguage = useCallback((text: string): { language: string; isLatin: boolean } => {
    const trimmed = text.trim();
    if (!trimmed) return { language: 'english', isLatin: true };

    const detected = detectLang(trimmed);
    const latin = checkLatinScript(trimmed);

    return { language: detected, isLatin: latin };
  }, []);

  return {
    translate: translateText,
    convertToNativeScript: convertToNative,
    processOutgoingMessage: processOutgoing,
    processIncomingMessage: processIncoming,
    detectLanguage,
    isTranslating,
    isModelLoading: false, // No model loading for server-side
    modelLoadProgress: 100, // Always ready
    isReady: true, // Always ready - server handles it
    error,
  };
}

export default useTranslationService;

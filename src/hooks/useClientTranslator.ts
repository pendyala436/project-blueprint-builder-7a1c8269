/**
 * Client-side Translator using DL-Translate server-side implementation
 * 
 * All translation happens on the server via Edge Function
 * No browser-based model loading required
 */

import { useState, useCallback } from 'react';
import { 
  translate as dlTranslate, 
  convertToNativeScript as dlConvertToNativeScript,
  processIncomingMessage,
  processOutgoingMessage
} from '@/lib/dl-translate/translator';
import { 
  detectLanguage as detectLang, 
  isLatinScript as checkLatinScript,
  isSameLanguage as checkSameLanguage
} from '@/lib/dl-translate/languages';

// Translation result type
export interface ClientTranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  model: string;
  usedPivot: boolean;
  detectedLanguage?: string;
}

// Cache for translations
const translationCache = new Map<string, ClientTranslationResult>();

export function useClientTranslator() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Translate text using the server-side dl-translate
  const translate = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<ClientTranslationResult> => {
    const cacheKey = `${text}|${sourceLanguage}|${targetLanguage}`;
    
    // Check cache first
    const cached = translationCache.get(cacheKey);
    if (cached) return cached;
    
    // Detect language if needed
    const detected = detectLang(text);
    const effectiveSourceLang = sourceLanguage || detected;
    
    // Check if same language
    if (checkSameLanguage(effectiveSourceLang, targetLanguage)) {
      const result: ClientTranslationResult = {
        translatedText: text,
        originalText: text,
        sourceLanguage: effectiveSourceLang,
        targetLanguage,
        isTranslated: false,
        model: 'dl-translate-server',
        usedPivot: false,
        detectedLanguage: detected,
      };
      return result;
    }

    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await dlTranslate(text, effectiveSourceLang, targetLanguage);
      
      const translationResult: ClientTranslationResult = {
        translatedText: result.text,
        originalText: result.originalText,
        sourceLanguage: result.source,
        targetLanguage: result.target,
        isTranslated: result.isTranslated,
        model: 'dl-translate-server',
        usedPivot: false,
        detectedLanguage: result.detectedLanguage,
      };
      
      if (result.isTranslated) {
        translationCache.set(cacheKey, translationResult);
      }
      
      return translationResult;
    } catch (err) {
      console.error('[ClientTranslator] Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage: effectiveSourceLang,
        targetLanguage,
        isTranslated: false,
        model: 'error',
        usedPivot: false,
        detectedLanguage: detected,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Convert romanized text to native script
  const convertToNativeScript = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<{ converted: string; isConverted: boolean }> => {
    if (!text.trim()) return { converted: text, isConverted: false };
    
    // Check if input is Latin script
    if (!checkLatinScript(text)) {
      return { converted: text, isConverted: false };
    }
    
    try {
      const result = await dlConvertToNativeScript(text, targetLanguage);
      return { 
        converted: result.text, 
        isConverted: result.isTranslated 
      };
    } catch (err) {
      console.error('[ClientTranslator] Script conversion error:', err);
      return { converted: text, isConverted: false };
    }
  }, []);

  // Process outgoing message
  const processOutgoing = useCallback(async (
    text: string,
    userLanguage: string
  ): Promise<ClientTranslationResult> => {
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
  }, []);

  // Process incoming message
  const processIncoming = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<ClientTranslationResult> => {
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
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    translationCache.clear();
  }, []);

  // Detect language
  const detectLanguage = useCallback((text: string) => {
    const language = detectLang(text);
    const isLatin = checkLatinScript(text);
    return { language, isLatin };
  }, []);

  return {
    // State - no model loading needed for server-side
    isModelLoading: false,
    modelLoadProgress: 100,
    isModelReady: true,
    isTranslating,
    error,
    
    // Actions
    loadModel: async () => {}, // No-op for server-side
    translate,
    convertToNativeScript,
    processOutgoingMessage: processOutgoing,
    processIncomingMessage: processIncoming,
    clearCache,
    
    // Utils
    detectLanguage,
    isLatinScript: checkLatinScript,
    isSameLanguage: checkSameLanguage,
  };
}

export default useClientTranslator;

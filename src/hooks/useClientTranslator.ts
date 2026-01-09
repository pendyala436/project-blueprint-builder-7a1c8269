/**
 * Client-side Translator using embedded translation
 * 
 * Uses the embedded translator from @/lib/translation
 * Supports 386+ languages with transliteration
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  translate as embeddedTranslate,
  autoDetectLanguage,
  isSameLanguage,
  isLanguageSupported,
  dynamicTransliterate,
  isLatinScriptLanguage
} from '@/lib/translation';

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

// Check if text is primarily Latin script
function isLatinScript(text: string): boolean {
  const latinChars = text.match(/[a-zA-Z]/g);
  const totalChars = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  return latinChars !== null && totalChars.length > 0 && (latinChars.length / totalChars.length) > 0.7;
}

export function useClientTranslator() {
  const [isModelLoading] = useState(false);
  const [modelLoadProgress] = useState(100);
  const [isModelReady] = useState(true);
  const [error] = useState<string | null>(null);

  // Load model - no-op since we use embedded translator
  const loadModel = useCallback(async () => {
    // Embedded translator is always ready
  }, []);

  // Translate text using embedded translator
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
    const detected = autoDetectLanguage(text);
    const effectiveSourceLang = sourceLanguage || detected.language;
    
    // Check if same language
    if (isSameLanguage(effectiveSourceLang, targetLanguage)) {
      const result: ClientTranslationResult = {
        translatedText: text,
        originalText: text,
        sourceLanguage: effectiveSourceLang,
        targetLanguage,
        isTranslated: false,
        model: 'embedded-translator',
        usedPivot: false,
        detectedLanguage: detected.language,
      };
      return result;
    }
    
    try {
      // Use embedded translator
      const translationResult = await embeddedTranslate(text, effectiveSourceLang, targetLanguage);
      
      const result: ClientTranslationResult = {
        translatedText: translationResult.text,
        originalText: text,
        sourceLanguage: effectiveSourceLang,
        targetLanguage,
        isTranslated: translationResult.isTranslated,
        model: 'embedded-translator',
        usedPivot: !!translationResult.englishPivot,
        detectedLanguage: detected.language,
      };
      
      translationCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[ClientTranslator] Translation error:', err);
      
      // Fallback: Basic transliteration for romanized input
      if (isLatinScript(text) && !isLatinScriptLanguage(targetLanguage)) {
        const transliterated = dynamicTransliterate(text, targetLanguage);
        const result: ClientTranslationResult = {
          translatedText: transliterated,
          originalText: text,
          sourceLanguage: effectiveSourceLang,
          targetLanguage,
          isTranslated: transliterated !== text,
          model: 'transliteration-fallback',
          usedPivot: false,
          detectedLanguage: detected.language,
        };
        
        if (transliterated !== text) {
          translationCache.set(cacheKey, result);
        }
        return result;
      }
      
      // No translation available
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage: effectiveSourceLang,
        targetLanguage,
        isTranslated: false,
        model: 'none',
        usedPivot: false,
        detectedLanguage: detected.language,
      };
    }
  }, []);

  // Convert romanized text to native script
  const convertToNativeScript = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<{ converted: string; isConverted: boolean }> => {
    if (!text.trim()) return { converted: text, isConverted: false };
    
    // Check if input is Latin script
    if (!isLatinScript(text)) {
      return { converted: text, isConverted: false };
    }
    
    // Use dynamic transliteration
    if (!isLatinScriptLanguage(targetLanguage)) {
      const transliterated = dynamicTransliterate(text, targetLanguage);
      if (transliterated !== text) {
        return { converted: transliterated, isConverted: true };
      }
    }
    
    return { converted: text, isConverted: false };
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    translationCache.clear();
  }, []);

  // Auto-ready on mount
  useEffect(() => {
    // No loading needed - embedded translator is always ready
  }, []);

  return {
    // State
    isModelLoading,
    modelLoadProgress,
    isModelReady,
    error,
    
    // Actions
    loadModel,
    translate,
    convertToNativeScript,
    clearCache,
    
    // Utils
    detectLanguage: autoDetectLanguage,
    isLatinScript,
    isSameLanguage,
  };
}

export default useClientTranslator;

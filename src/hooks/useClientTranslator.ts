/**
 * Client-side NLLB-200 Translator using @huggingface/transformers
 * 
 * Runs translation entirely in the browser using WebGPU/WASM
 * Supports 200+ languages with auto-detection and transliteration
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { pipeline, env } from '@huggingface/transformers';
import { detectLanguage, isLatinScript, isSameLanguage } from '@/lib/translation/language-detector';
import { getNLLBCode, LANGUAGE_TO_NLLB } from '@/lib/translation/language-codes';
import { ALL_NLLB200_LANGUAGES } from '@/data/languages';

// Configure transformers.js to allow local model caching
env.allowLocalModels = true;
env.useBrowserCache = true;

// Translation pipeline type (using any to handle dynamic API)
type TranslatorPipeline = (text: string | string[], options?: Record<string, unknown>) => Promise<Array<{ translation_text: string }>>;

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

// DEPRECATED: Old hardcoded word mappings removed
// Now uses dynamic phonetic transliteration from @/lib/translation/dynamic-transliterator
// This supports ALL 300+ languages without hardcoded words
//
// Import the dynamic transliterator for fallback
import { dynamicTransliterate, isLatinScriptLanguage } from '@/lib/translation/dynamic-transliterator';

// Dynamic phonetic transliteration - NO hardcoded words
// Uses dynamic-transliterator for ALL 300+ languages
function transliterateToNative(text: string, targetLanguage: string): string {
  if (!text || !text.trim()) return text;
  
  // Use dynamic transliterator - works for ALL 300+ languages
  return dynamicTransliterate(text, targetLanguage);
}

// Get the NLLB language code for translation
function getLanguageCode(language: string): string | null {
  const normalized = language.toLowerCase().trim();
  const code = LANGUAGE_TO_NLLB[normalized];
  if (code) return code;
  
  // Try finding in ALL_NLLB200_LANGUAGES
  const found = ALL_NLLB200_LANGUAGES.find(
    l => l.name.toLowerCase() === normalized
  );
  return found?.code || null;
}

// Cache for translations
const translationCache = new Map<string, ClientTranslationResult>();

export function useClientTranslator() {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [isModelReady, setIsModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const translatorRef = useRef<TranslatorPipeline | null>(null);
  const loadingRef = useRef(false);

  // Load the translation model
  const loadModel = useCallback(async () => {
    if (loadingRef.current || translatorRef.current) return;
    
    loadingRef.current = true;
    setIsModelLoading(true);
    setError(null);
    
    try {
      console.log('[ClientTranslator] Loading NLLB-200 model...');
      
      // Use the distilled 600M model for faster loading
      const translator = await pipeline(
        'translation',
        'Xenova/nllb-200-distilled-600M',
        {
          progress_callback: (progress: { progress?: number; status?: string }) => {
            if (progress.progress !== undefined) {
              setModelLoadProgress(Math.round(progress.progress));
            }
            console.log('[ClientTranslator] Loading:', progress);
          },
        }
      );
      
      // Store the translator with proper typing
      translatorRef.current = translator as unknown as TranslatorPipeline;
      setIsModelReady(true);
      console.log('[ClientTranslator] Model loaded successfully');
    } catch (err) {
      console.error('[ClientTranslator] Failed to load model:', err);
      setError(err instanceof Error ? err.message : 'Failed to load translation model');
    } finally {
      setIsModelLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Translate text using the local model
  const translate = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<ClientTranslationResult> => {
    const cacheKey = `${text}|${sourceLanguage}|${targetLanguage}`;
    
    // Check cache first
    const cached = translationCache.get(cacheKey);
    if (cached) return cached;
    
    // Get NLLB codes
    const sourceCode = getLanguageCode(sourceLanguage);
    const targetCode = getLanguageCode(targetLanguage);
    
    // Detect language if needed
    const detected = detectLanguage(text);
    const effectiveSourceLang = sourceLanguage || detected.language;
    
    // Check if same language
    if (isSameLanguage(effectiveSourceLang, targetLanguage)) {
      const result: ClientTranslationResult = {
        translatedText: text,
        originalText: text,
        sourceLanguage: effectiveSourceLang,
        targetLanguage,
        isTranslated: false,
        model: 'nllb-200-distilled-600M',
        usedPivot: false,
        detectedLanguage: detected.language,
      };
      return result;
    }
    
    // If model is ready, use it
    if (translatorRef.current && sourceCode && targetCode) {
      try {
        // Call the translator with src_lang and tgt_lang options
        const output = await translatorRef.current(text, {
          src_lang: sourceCode,
          tgt_lang: targetCode,
        });
        
        const translatedText = Array.isArray(output) && output[0]
          ? output[0].translation_text || text
          : text;
        
        const result: ClientTranslationResult = {
          translatedText,
          originalText: text,
          sourceLanguage: effectiveSourceLang,
          targetLanguage,
          isTranslated: translatedText !== text,
          model: 'nllb-200-distilled-600M',
          usedPivot: false,
          detectedLanguage: detected.language,
        };
        
        translationCache.set(cacheKey, result);
        return result;
      } catch (err) {
        console.error('[ClientTranslator] Translation error:', err);
        // Fall through to basic transliteration
      }
    }
    
    // Fallback: Basic transliteration for romanized input
    if (isLatinScript(text)) {
      const transliterated = transliterateToNative(text, targetLanguage);
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
    
    // Try transliteration first
    const transliterated = transliterateToNative(text, targetLanguage);
    if (transliterated !== text.toLowerCase()) {
      return { converted: transliterated, isConverted: true };
    }
    
    // If model is ready, try translation from English to target
    if (translatorRef.current) {
      try {
        const targetCode = getLanguageCode(targetLanguage);
        if (targetCode && !targetCode.endsWith('_Latn')) {
          const output = await translatorRef.current(text, {
            src_lang: 'eng_Latn',
            tgt_lang: targetCode,
          });
          
          const converted = Array.isArray(output) && output[0]
            ? output[0].translation_text || text
            : text;
          
          if (converted !== text) {
            return { converted, isConverted: true };
          }
        }
      } catch (err) {
        console.error('[ClientTranslator] Script conversion error:', err);
      }
    }
    
    return { converted: text, isConverted: false };
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    translationCache.clear();
  }, []);

  // Auto-load model on mount (optional - can be triggered manually)
  useEffect(() => {
    // Uncomment to auto-load on mount:
    // loadModel();
  }, [loadModel]);

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
    detectLanguage,
    isLatinScript,
    isSameLanguage,
  };
}

export default useClientTranslator;

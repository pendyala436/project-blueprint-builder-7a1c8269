/**
 * Translation Model - Main translator class
 * Converted from dl-translate Python: https://github.com/xhluca/dl-translate
 * 
 * Uses @huggingface/transformers for in-browser NLLB-200 translation
 */

import { pipeline } from '@huggingface/transformers';
import { ModelFamily } from './language-pairs';
import { 
  inferModelFamily, 
  resolveLangCode, 
  getAvailableLanguages, 
  getAvailableCodes,
  getLangCodeMap,
  normalizeLanguageInput 
} from './utils';
import { detectLanguage, LanguageDetectionResult, isSameLanguage } from './language-detector';
import { transliterate, isTransliterationSupported } from './transliteration';

// Progress callback type
export type ProgressCallback = (progress: { 
  status: string; 
  progress?: number;
  loaded?: number;
  total?: number;
}) => void;

// Translation result interface
export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceCode: string;
  targetCode: string;
  isTranslated: boolean;
  transliterationPreview?: string;
}

// Model state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let translatorPipeline: any = null;
let isLoading = false;
let loadingProgress = 0;
let currentModelFamily: ModelFamily = 'nllb200';

/**
 * Initialize the translation model
 */
export async function initializeTranslator(
  modelOrPath: string = 'Xenova/nllb-200-distilled-600M',
  onProgress?: ProgressCallback
): Promise<boolean> {
  if (translatorPipeline) {
    return true;
  }
  
  if (isLoading) {
    // Wait for existing load
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return translatorPipeline !== null;
  }
  
  isLoading = true;
  loadingProgress = 0;
  
  try {
    onProgress?.({ status: 'loading', progress: 0 });
    
    translatorPipeline = await pipeline(
      'translation',
      modelOrPath,
      {
        progress_callback: (data: { status: string; progress?: number; loaded?: number; total?: number }) => {
          if (data.progress !== undefined) {
            loadingProgress = data.progress;
          }
          onProgress?.(data);
        },
      }
    );
    
    currentModelFamily = inferModelFamily(modelOrPath);
    loadingProgress = 100;
    onProgress?.({ status: 'ready', progress: 100 });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize translator:', error);
    onProgress?.({ status: 'error', progress: 0 });
    return false;
  } finally {
    isLoading = false;
  }
}

/**
 * Check if translator is loaded
 */
export function isTranslatorLoaded(): boolean {
  return translatorPipeline !== null;
}

/**
 * Check if translator is loading
 */
export function isTranslatorLoading(): boolean {
  return isLoading;
}

/**
 * Get loading progress (0-100)
 */
export function getLoadingProgress(): number {
  return loadingProgress;
}

/**
 * Translate text from source to target language
 */
export async function translate(
  text: string | string[],
  source: string,
  target: string,
  options: {
    autoDetect?: boolean;
    maxNewTokens?: number;
  } = {}
): Promise<TranslationResult | TranslationResult[]> {
  const { autoDetect = true, maxNewTokens = 512 } = options;
  
  // Ensure model is loaded
  if (!translatorPipeline) {
    const loaded = await initializeTranslator();
    if (!loaded) {
      throw new Error('Failed to load translation model');
    }
  }
  
  const isArray = Array.isArray(text);
  const texts = isArray ? text : [text];
  const results: TranslationResult[] = [];
  
  for (const t of texts) {
    // Normalize language inputs
    const normalizedSource = normalizeLanguageInput(source);
    const normalizedTarget = normalizeLanguageInput(target);
    
    // Auto-detect source language if enabled
    let detectedSource = normalizedSource;
    let sourceDetection: LanguageDetectionResult | null = null;
    
    if (autoDetect) {
      sourceDetection = detectLanguage(t, normalizedSource);
      if (sourceDetection.confidence > 0.5) {
        detectedSource = sourceDetection.language;
      }
    }
    
    // Resolve language codes
    const sourceCode = sourceDetection?.nllbCode || resolveLangCode(detectedSource, currentModelFamily);
    const targetCode = resolveLangCode(normalizedTarget, currentModelFamily);
    
    // Check if same language
    if (isSameLanguage(detectedSource, normalizedTarget)) {
      // No translation needed, but maybe transliteration
      let transliterationPreview: string | undefined;
      
      if (sourceDetection?.isPhonetic && isTransliterationSupported(targetCode)) {
        transliterationPreview = transliterate(t, targetCode);
      }
      
      results.push({
        translatedText: transliterationPreview || t,
        originalText: t,
        sourceLanguage: detectedSource,
        targetLanguage: normalizedTarget,
        sourceCode,
        targetCode,
        isTranslated: false,
        transliterationPreview,
      });
      continue;
    }
    
    try {
      // Perform translation
      const output = await translatorPipeline!(t, {
        src_lang: sourceCode,
        tgt_lang: targetCode,
        max_new_tokens: maxNewTokens,
      });
      
      // Extract translated text
      const translatedText = Array.isArray(output) 
        ? (output[0] as { translation_text: string }).translation_text 
        : (output as { translation_text: string }).translation_text;
      
      // Generate transliteration preview for phonetic input
      let transliterationPreview: string | undefined;
      if (sourceDetection?.isPhonetic && isTransliterationSupported(sourceCode)) {
        transliterationPreview = transliterate(t, sourceCode);
      }
      
      results.push({
        translatedText,
        originalText: t,
        sourceLanguage: detectedSource,
        targetLanguage: normalizedTarget,
        sourceCode,
        targetCode,
        isTranslated: true,
        transliterationPreview,
      });
    } catch (error) {
      console.error('Translation error:', error);
      
      // Fallback: return original with transliteration if possible
      let transliterationPreview: string | undefined;
      if (sourceDetection?.isPhonetic && isTransliterationSupported(targetCode)) {
        transliterationPreview = transliterate(t, targetCode);
      }
      
      results.push({
        translatedText: transliterationPreview || t,
        originalText: t,
        sourceLanguage: detectedSource,
        targetLanguage: normalizedTarget,
        sourceCode,
        targetCode,
        isTranslated: false,
        transliterationPreview,
      });
    }
  }
  
  return isArray ? results : results[0];
}

/**
 * Translate for chat - handles bidirectional translation
 */
export async function translateForChat(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{
  senderNativeText: string;      // Text in sender's native script
  receiverNativeText: string;    // Text translated to receiver's language
  originalLatin: string;         // Original Latin input
  isTranslated: boolean;
}> {
  const normalizedSender = normalizeLanguageInput(senderLanguage);
  const normalizedReceiver = normalizeLanguageInput(receiverLanguage);
  
  // Detect the input language
  const detection = detectLanguage(text, normalizedSender);
  
  // Get sender's native text (transliteration if phonetic)
  let senderNativeText = text;
  const senderCode = resolveLangCode(normalizedSender, currentModelFamily);
  
  if (detection.isPhonetic && isTransliterationSupported(senderCode)) {
    senderNativeText = transliterate(text, senderCode);
  } else if (!detection.isLatinScript) {
    senderNativeText = text; // Already in native script
  }
  
  // Check if translation is needed
  if (isSameLanguage(normalizedSender, normalizedReceiver)) {
    return {
      senderNativeText,
      receiverNativeText: senderNativeText,
      originalLatin: detection.isLatinScript ? text : '',
      isTranslated: false,
    };
  }
  
  // Translate to receiver's language
  try {
    const result = await translate(senderNativeText, normalizedSender, normalizedReceiver, {
      autoDetect: true,
    }) as TranslationResult;
    
    return {
      senderNativeText,
      receiverNativeText: result.translatedText,
      originalLatin: detection.isLatinScript ? text : '',
      isTranslated: result.isTranslated,
    };
  } catch (error) {
    console.error('Chat translation error:', error);
    return {
      senderNativeText,
      receiverNativeText: senderNativeText, // Fallback to sender's text
      originalLatin: detection.isLatinScript ? text : '',
      isTranslated: false,
    };
  }
}

/**
 * Get live transliteration preview (non-blocking)
 */
export function getTransliterationPreview(
  text: string,
  targetLanguage: string
): string {
  const targetCode = resolveLangCode(normalizeLanguageInput(targetLanguage), currentModelFamily);
  
  if (isTransliterationSupported(targetCode)) {
    return transliterate(text, targetCode);
  }
  
  return text;
}

/**
 * Get available languages
 */
export function availableLanguages(): string[] {
  return getAvailableLanguages(currentModelFamily);
}

/**
 * Get available language codes
 */
export function availableCodes(): string[] {
  return getAvailableCodes(currentModelFamily);
}

/**
 * Get language to code mapping
 */
export function getLangCodes(): Record<string, string> {
  return getLangCodeMap(currentModelFamily);
}

/**
 * Unload the model to free memory
 */
export function unloadTranslator(): void {
  translatorPipeline = null;
  loadingProgress = 0;
}

// Re-export utilities
export { detectLanguage, isSameLanguage } from './language-detector';
export { transliterate, isTransliterationSupported, getLanguageDisplayName } from './transliteration';
export { normalizeLanguageInput, resolveLangCode } from './utils';

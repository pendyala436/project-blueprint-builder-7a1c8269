/**
 * Browser-based Translation Service
 * Uses embedded translator - no external API calls
 */

import { 
  translate as embeddedTranslate,
  autoDetectLanguage,
  isReady
} from './embedded-translator';

export interface BrowserTranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  model: string;
}

/**
 * Initialize the translation pipeline (no-op - always ready)
 */
export async function initTranslationPipeline(
  _onProgress?: (progress: number) => void
): Promise<boolean> {
  return true;
}

/**
 * Detect language from text based on script
 */
export function detectLanguage(text: string): string {
  const result = autoDetectLanguage(text);
  return result.language;
}

/**
 * Check if text is primarily Latin script
 */
export function isLatinScript(text: string): boolean {
  const latinChars = text.match(/[a-zA-Z]/g);
  const totalChars = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  return latinChars !== null && totalChars.length > 0 && (latinChars.length / totalChars.length) > 0.7;
}

/**
 * Get NLLB language code (stub)
 */
export function getNLLBCode(language: string): string {
  return language.toLowerCase();
}

/**
 * Translate text using embedded translator
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  _onProgress?: (progress: number) => void
): Promise<BrowserTranslationResult> {
  const originalText = text.trim();
  
  if (!originalText) {
    return {
      translatedText: text,
      originalText: text,
      sourceLanguage,
      targetLanguage,
      isTranslated: false,
      model: 'none',
    };
  }

  // Normalize languages
  const srcLang = sourceLanguage.toLowerCase().trim();
  const tgtLang = targetLanguage.toLowerCase().trim();

  // Same language - no translation needed
  if (srcLang === tgtLang) {
    return {
      translatedText: text,
      originalText: text,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: false,
      model: 'same_language',
    };
  }

  try {
    const result = await embeddedTranslate(originalText, srcLang, tgtLang);
    
    return {
      translatedText: result.text,
      originalText: text,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      isTranslated: result.isTranslated,
      model: 'embedded-translator',
    };
  } catch (err) {
    console.error('[BrowserTranslator] Translation error:', err);
    return {
      translatedText: text,
      originalText: text,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: false,
      model: 'error',
    };
  }
}

/**
 * Check if translation pipeline is ready
 */
export function isTranslationReady(): boolean {
  return isReady();
}

/**
 * Get loading status
 */
export function getLoadingStatus(): { isLoading: boolean; error: string | null } {
  return { isLoading: false, error: null };
}

/**
 * Preload the translation model (no-op)
 */
export async function preloadModel(_onProgress?: (progress: number) => void): Promise<boolean> {
  return true;
}

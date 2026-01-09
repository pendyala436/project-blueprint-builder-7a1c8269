/**
 * In-Memory Translation System
 * Fully browser-based, no external APIs
 * Uses embedded translator for 386+ languages
 */

import {
  translate as embeddedTranslate,
  autoDetectLanguage,
  isLanguageSupported,
  getLanguageInfo as getEmbeddedLanguageInfo,
  getSupportedLanguages,
  isReady
} from './embedded-translator';

// ============================================================
// TYPES
// ============================================================

export interface LanguageInfo {
  name: string;
  code: string;
  nllbCode: string;
  native: string;
  script: string;
  rtl?: boolean;
}

export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  wasTransliterated: boolean;
  model: string;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get all available languages dynamically
 */
export function getAvailableLanguages(): LanguageInfo[] {
  return getSupportedLanguages().map(lang => ({
    name: lang.name,
    code: lang.code,
    nllbCode: `${lang.code}_${lang.script?.substring(0, 4) || 'Latn'}`,
    native: lang.native,
    script: lang.script,
    rtl: lang.rtl
  }));
}

/**
 * Get language info by name or code
 */
export function getLanguageInfo(nameOrCode: string): LanguageInfo | undefined {
  const info = getEmbeddedLanguageInfo(nameOrCode);
  if (!info) return undefined;
  return {
    name: info.name,
    code: info.code,
    nllbCode: info.nllbCode,
    native: info.native,
    script: info.script,
    rtl: info.rtl
  };
}

/**
 * Get NLLB code for a language
 */
export function getNLLBCode(language: string): string {
  const info = getLanguageInfo(language);
  return info?.nllbCode || 'eng_Latn';
}

/**
 * Check if language uses non-Latin script
 */
export function isNonLatinScript(language: string): boolean {
  const info = getLanguageInfo(language);
  return info ? info.script !== 'Latin' : false;
}

/**
 * Check if text is primarily Latin script
 */
export function isLatinText(text: string): boolean {
  const latinChars = text.match(/[a-zA-Z]/g);
  const totalChars = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  return latinChars !== null && totalChars.length > 0 && (latinChars.length / totalChars.length) > 0.7;
}

/**
 * Detect language from text based on script
 */
export function detectLanguageFromScript(text: string): { language: string; script: string; isLatin: boolean } {
  const result = autoDetectLanguage(text);
  return {
    language: result.language,
    script: result.script,
    isLatin: result.isLatin
  };
}

/**
 * Initialize pipeline (no-op - always ready)
 */
export async function initPipeline(_onProgress?: (progress: number) => void): Promise<boolean> {
  return true;
}

/**
 * Check if pipeline is ready
 */
export function isPipelineReady(): boolean {
  return isReady();
}

/**
 * Get loading status
 */
export function getLoadingStatus(): { isLoading: boolean; progress: number } {
  return { isLoading: false, progress: 100 };
}

// ============================================================
// TRANSLATION FUNCTIONS
// ============================================================

/**
 * Translate text using embedded translator
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  _onProgress?: (progress: number) => void
): Promise<TranslationResult> {
  const originalText = text.trim();
  
  if (!originalText) {
    return {
      translatedText: text,
      originalText: text,
      sourceLanguage,
      targetLanguage,
      isTranslated: false,
      wasTransliterated: false,
      model: 'none',
    };
  }

  // Normalize language names
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
      wasTransliterated: false,
      model: 'same_language',
    };
  }

  try {
    const result = await embeddedTranslate(originalText, srcLang, tgtLang);
    
    return {
      translatedText: result.text,
      originalText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      isTranslated: result.isTranslated,
      wasTransliterated: result.isTransliterated,
      model: 'embedded-translator',
    };
  } catch (err) {
    console.error('[InMemoryTranslator] Translation error:', err);
    return {
      translatedText: text,
      originalText: text,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: false,
      wasTransliterated: false,
      model: 'error',
    };
  }
}

/**
 * Transliterate Latin text to native script
 */
export async function transliterateToNative(
  latinText: string,
  targetLanguage: string,
  _onProgress?: (progress: number) => void
): Promise<{ text: string; success: boolean }> {
  if (!latinText.trim()) {
    return { text: latinText, success: false };
  }

  // Only transliterate if target is non-Latin
  if (!isNonLatinScript(targetLanguage)) {
    return { text: latinText, success: false };
  }

  try {
    const result = await embeddedTranslate(latinText, 'english', targetLanguage);
    if (result.isTranslated || result.isTransliterated) {
      return { text: result.text, success: true };
    }
    return { text: latinText, success: false };
  } catch {
    return { text: latinText, success: false };
  }
}

/**
 * Process message for chat
 */
export async function processMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string,
  _onProgress?: (progress: number) => void
): Promise<{
  senderView: string;
  receiverView: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}> {
  const senderLang = senderLanguage.toLowerCase();
  const receiverLang = receiverLanguage.toLowerCase();

  // Same language
  if (senderLang === receiverLang) {
    return {
      senderView: text,
      receiverView: text,
      wasTransliterated: false,
      wasTranslated: false
    };
  }

  try {
    const result = await embeddedTranslate(text, senderLang, receiverLang);
    
    return {
      senderView: text,
      receiverView: result.text,
      wasTransliterated: result.isTransliterated,
      wasTranslated: result.isTranslated
    };
  } catch {
    return {
      senderView: text,
      receiverView: text,
      wasTransliterated: false,
      wasTranslated: false
    };
  }
}

/**
 * Clear translation cache (no-op for embedded)
 */
export function clearCache(): void {
  // No-op - embedded translator manages its own cache
}

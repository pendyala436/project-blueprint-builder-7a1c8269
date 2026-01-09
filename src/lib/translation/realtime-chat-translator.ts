/**
 * Real-Time Chat Translator
 * =========================
 * Browser-based translation using embedded translator
 * 
 * Features:
 * - 386+ languages support
 * - Auto-detect source language from script
 * - Live Latin typing → native script preview
 * - Non-blocking background translation
 * - Bi-directional chat translation
 */

import {
  translate as embeddedTranslate,
  autoDetectLanguage,
  isLanguageSupported,
  getLanguageInfo as getEmbeddedLanguageInfo,
  getSupportedLanguages,
  isSameLanguage as checkSameLanguage,
  normalizeLanguage as normalizeLanguageName,
  isReady
} from './embedded-translator';

import { dynamicTransliterate, isLatinScriptLanguage } from './dynamic-transliterator';

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
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  wasTransliterated: boolean;
  detectedLanguage?: string;
}

export interface ChatProcessResult {
  senderView: string;
  receiverView: string;
  originalText: string;
  senderLanguage: string;
  receiverLanguage: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get all available languages
 */
export function getLanguages(): LanguageInfo[] {
  return getSupportedLanguages().map(lang => ({
    name: lang.name,
    code: lang.code,
    nllbCode: lang.nllbCode,
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
 * Check if language uses Latin script
 */
export { isLatinScriptLanguage };

/**
 * Check if text is primarily Latin script
 */
export function isLatinText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  if (!cleaned) return true;
  const latinChars = cleaned.match(/[a-zA-Z]/g);
  return latinChars !== null && (latinChars.length / cleaned.length) > 0.7;
}

/**
 * Detect language from text script
 */
export function detectLanguageFromText(text: string): { language: string; script: string; isLatin: boolean } {
  const result = autoDetectLanguage(text);
  return {
    language: result.language,
    script: result.script,
    isLatin: result.isLatin
  };
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  return checkSameLanguage(lang1, lang2);
}

/**
 * Normalize language name
 */
export function normalizeLanguage(language: string): string {
  return normalizeLanguageName(language);
}

// ============================================================
// PIPELINE MANAGEMENT
// ============================================================

/**
 * Initialize translation pipeline (no-op - always ready)
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
export function getLoadingStatus(): { isLoading: boolean; progress: number; error: string | null } {
  return { isLoading: false, progress: 100, error: null };
}

// ============================================================
// TRANSLATION FUNCTIONS
// ============================================================

/**
 * Translate text
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
      text,
      originalText: text,
      sourceLanguage,
      targetLanguage,
      isTranslated: false,
      wasTransliterated: false
    };
  }

  const srcLang = sourceLanguage.toLowerCase().trim();
  const tgtLang = targetLanguage.toLowerCase().trim();

  if (isSameLanguage(srcLang, tgtLang)) {
    return {
      text,
      originalText: text,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: false,
      wasTransliterated: false
    };
  }

  try {
    const result = await embeddedTranslate(originalText, srcLang, tgtLang);
    
    return {
      text: result.text,
      originalText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      isTranslated: result.isTranslated,
      wasTransliterated: result.isTransliterated,
      detectedLanguage: result.detectedLanguage
    };
  } catch (err) {
    console.error('[RealtimeTranslator] Translation error:', err);
    return {
      text,
      originalText: text,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: false,
      wasTransliterated: false
    };
  }
}

/**
 * Transliterate Latin text to native script
 */
export function transliterateToNative(latinText: string, targetLanguage: string): string {
  if (!latinText.trim()) return latinText;
  if (isLatinScriptLanguage(targetLanguage)) return latinText;
  return dynamicTransliterate(latinText, targetLanguage);
}

/**
 * Process message for chat
 */
export async function processMessageForChat(
  text: string,
  senderLanguage: string,
  receiverLanguage: string,
  _onProgress?: (progress: number) => void
): Promise<ChatProcessResult> {
  const senderLang = senderLanguage.toLowerCase();
  const receiverLang = receiverLanguage.toLowerCase();

  // Same language
  if (isSameLanguage(senderLang, receiverLang)) {
    // Check if sender input needs transliteration
    let senderView = text;
    if (isLatinText(text) && !isLatinScriptLanguage(senderLang)) {
      senderView = transliterateToNative(text, senderLang);
    }
    
    return {
      senderView,
      receiverView: senderView,
      originalText: text,
      senderLanguage: senderLang,
      receiverLanguage: receiverLang,
      wasTransliterated: senderView !== text,
      wasTranslated: false
    };
  }

  // Different languages - translate
  try {
    // Sender view - show in their native script
    let senderView = text;
    if (isLatinText(text) && !isLatinScriptLanguage(senderLang)) {
      senderView = transliterateToNative(text, senderLang);
    }

    // Receiver view - translate to their language
    const result = await embeddedTranslate(text, senderLang, receiverLang);

    return {
      senderView,
      receiverView: result.text,
      originalText: text,
      senderLanguage: senderLang,
      receiverLanguage: receiverLang,
      wasTransliterated: senderView !== text,
      wasTranslated: result.isTranslated
    };
  } catch (err) {
    console.error('[RealtimeTranslator] Chat processing error:', err);
    return {
      senderView: text,
      receiverView: text,
      originalText: text,
      senderLanguage: senderLang,
      receiverLanguage: receiverLang,
      wasTransliterated: false,
      wasTranslated: false
    };
  }
}

/**
 * Background translation (non-blocking)
 */
export function translateInBackground(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  callback: (result: TranslationResult) => void
): void {
  translate(text, sourceLanguage, targetLanguage)
    .then(callback)
    .catch(err => {
      console.error('[RealtimeTranslator] Background translation error:', err);
      callback({
        text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        wasTransliterated: false
      });
    });
}

/**
 * Clear cache (no-op for embedded)
 */
export function clearCache(): void {
  // No-op - embedded translator manages its own cache
}

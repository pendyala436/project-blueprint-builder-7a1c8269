/**
 * Offline Translation - Core Engine
 * ==================================
 * 
 * LibreTranslate-inspired offline translation engine.
 * 
 * NO DATABASE LOOKUPS - NO common_phrases TABLE - NO HARDCODING
 * NO EXTERNAL APIs - NO NLLB-200
 * 
 * Translation Rules:
 * 1. Native → Latin: Native → English → Latin
 * 2. Latin → Native: Latin → English → Native
 * 3. Native → Native (different): Native → English → Target Native
 * 4. Latin → Latin: Direct (no English bridge)
 * 5. English as source/target: Direct (no middle language)
 * 
 * English is ALWAYS the bidirectional bridge, EXCEPT:
 * - Both languages are Latin-based
 * - English is already source or target
 */

import {
  translate as libreTranslate,
  translateForChat as libreTranslateForChat,
  generateLivePreview as libreGenerateLivePreview,
  getInstantPreview,
  getEnglishMeaning,
  detectLanguage as libreDetectLanguage,
  normalizeLanguage as libreNormalizeLanguage,
  isLatinScript,
  isLatinText as libreIsLatinText,
  isSameLanguage as libreSameLanguage,
  isEnglish as libreIsEnglish,
  isRTL as libreIsRTL,
  getEffectiveLanguage as libreGetEffectiveLanguage,
  getScriptForLanguage as libreGetScriptForLanguage,
  initializeEngine as libreInitializeEngine,
  isEngineReady as libreIsEngineReady,
  clearCache as libreClearCache,
  getCacheStats as libreGetCacheStats,
  getLanguageCount as libreGetLanguageCount,
  getAllLanguages as libreGetAllLanguages,
  type LivePreview,
} from '../translation/libre-translate-engine';

import type { TranslationResult, ChatMessageViews, UserLanguageProfile, TranslationMethod } from './types';

// ============================================================
// WRAPPER FUNCTIONS - Convert LibreTranslate types to legacy types
// ============================================================

/**
 * Translate text between languages
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  const result = await libreTranslate(text, sourceLanguage, targetLanguage);
  
  // Map method to TranslationMethod type
  let method: TranslationMethod = 'direct';
  if (result.method === 'passthrough') method = 'passthrough';
  else if (result.method === 'cached') method = 'cached';
  else if (result.method === 'english-pivot') method = 'english-pivot';
  else if (result.method === 'semantic') method = 'semantic';
  
  return {
    text: result.text,
    originalText: result.originalText,
    sourceLanguage: result.sourceLanguage,
    targetLanguage: result.targetLanguage,
    englishMeaning: result.englishMeaning,
    englishPivot: result.englishMeaning,
    isTranslated: result.isTranslated,
    isTransliterated: false,
    confidence: result.confidence,
    method,
    direction: result.method === 'passthrough' ? 'passthrough' : 
               result.method === 'english-pivot' ? 'native-to-native' : 'english-source',
  };
}

/**
 * Translate for chat with sender/receiver profiles
 */
export async function translateForChat(
  text: string,
  senderOrLang: UserLanguageProfile | string,
  receiverOrLang: UserLanguageProfile | string
): Promise<ChatMessageViews> {
  // Handle both profile objects and string languages
  const senderLang = typeof senderOrLang === 'string' ? senderOrLang : senderOrLang.motherTongue;
  const receiverLang = typeof receiverOrLang === 'string' ? receiverOrLang : receiverOrLang.motherTongue;
  
  const result = await libreTranslateForChat(text, senderLang, receiverLang);
  return {
    id: result.id,
    originalText: result.originalInput,
    originalInput: result.originalInput,
    englishMeaning: result.englishMeaning,
    englishCore: result.englishMeaning,
    senderView: result.senderView,
    receiverView: result.receiverView,
    senderLanguage: result.senderLanguage,
    receiverLanguage: result.receiverLanguage,
    confidence: result.confidence,
    wasTranslated: result.wasTranslated,
    wasTransliterated: false,
    direction: result.wasTranslated ? 'native-to-native' : 'passthrough',
  };
}

/**
 * Simple translate for chat (string-based)
 */
export async function translateSimple(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<ChatMessageViews> {
  return translateForChat(text, senderLanguage, receiverLanguage);
}

/**
 * Get native script preview (synchronous)
 */
export function getNativePreview(text: string, targetLanguage: string): string {
  return getInstantPreview(text, targetLanguage);
}

/**
 * Get English preview (returns Promise for backward compatibility)
 */
export async function getEnglishPreview(text: string, sourceLanguage: string): Promise<string> {
  return getEnglishMeaning(text, sourceLanguage);
}

/**
 * Generate live preview
 */
export function generateLivePreview(
  input: string,
  senderLanguage: string,
  receiverLanguage: string
): LivePreview {
  return libreGenerateLivePreview(input, senderLanguage, receiverLanguage);
}

// ============================================================
// RE-EXPORT UTILITY FUNCTIONS
// ============================================================

export function normalizeLanguage(lang: string): string {
  return libreNormalizeLanguage(lang);
}

export function isLatinScriptLanguage(lang: string): boolean {
  return isLatinScript(lang);
}

export function isLatinText(text: string): boolean {
  return libreIsLatinText(text);
}

export function isSameLanguage(lang1: string, lang2: string): boolean {
  return libreSameLanguage(lang1, lang2);
}

export function isEnglish(lang: string): boolean {
  return libreIsEnglish(lang);
}

export function isRTL(lang: string): boolean {
  return libreIsRTL(lang);
}

export function getEffectiveLanguage(lang: string): string {
  return libreGetEffectiveLanguage(lang);
}

export function getScriptForLanguage(lang: string): string {
  return libreGetScriptForLanguage(lang);
}

export function detectLanguage(text: string) {
  return libreDetectLanguage(text);
}

export async function initializeEngine(): Promise<void> {
  return libreInitializeEngine();
}

export function isEngineReady(): boolean {
  return libreIsEngineReady();
}

export function clearCache(): void {
  libreClearCache();
}

export function getCacheStats() {
  return libreGetCacheStats();
}

export function getLanguageCount(): number {
  return libreGetLanguageCount();
}

export function getAllLanguages() {
  return libreGetAllLanguages();
}

// ============================================================
// LEGACY EXPORTS - No-ops for backward compatibility
// ============================================================

export function clearPhraseCache(): void {
  console.log('[OfflineEngine] Phrase cache cleared (no-op in pure offline mode)');
}

export function loadPhrases(): Promise<void> {
  return Promise.resolve();
}

export function getLanguageColumn(lang: string): string {
  const normalized = normalizeLanguage(lang);
  return normalized.toLowerCase().replace(/[^a-z]/g, '_');
}

// Legacy TRANSLATION_RULES
export const TRANSLATION_RULES = {
  determineDirection(
    sourceIsLatin: boolean,
    targetIsLatin: boolean,
    sourceIsEnglish: boolean,
    targetIsEnglish: boolean,
    sameLang: boolean
  ): string {
    if (sameLang) return 'passthrough';
    if (sourceIsEnglish) return 'english-source';
    if (targetIsEnglish) return 'english-target';
    if (sourceIsLatin && targetIsLatin) return 'latin-to-latin';
    if (sourceIsLatin && !targetIsLatin) return 'latin-to-native';
    if (!sourceIsLatin && targetIsLatin) return 'native-to-latin';
    return 'native-to-native';
  }
};

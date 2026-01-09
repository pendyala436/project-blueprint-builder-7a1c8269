/**
 * Translation Module Exports
 * ==========================
 * 
 * UNIVERSAL SEMANTIC TRANSLATION SYSTEM
 * - Language-agnostic engine
 * - Dynamically discovers available languages
 * - Scales to ANY number of languages (10, 50, 386, 1000+)
 * - Uses English as semantic pivot
 * - NO hard-coded language lists in translation logic
 * - 100% EMBEDDED, NO EXTERNAL APIs
 * 
 * Architecture:
 * - engine.ts: Universal engine contract
 * - semantic-translate.ts: Meaning-only pivot logic
 * - embedded-translator.ts: Legacy compatibility layer
 * 
 * @example
 * ```tsx
 * import { semanticTranslate, getSupportedLanguages } from '@/lib/translation';
 * 
 * // Dynamic language discovery
 * const languages = await getSupportedLanguages();
 * console.log(`${languages.length} languages supported`);
 * 
 * // Universal semantic translation
 * const result = await semanticTranslate('hello', 'english', 'hindi');
 * // Returns: { text: 'हैलो', isTranslated: true, ... }
 * ```
 */

// ============================================================
// PRIMARY API - UNIVERSAL SEMANTIC TRANSLATION
// ============================================================

export {
  // Core semantic translation
  semanticTranslate,
  semanticTranslateBatch,
  semanticTranslateBidirectional,
  
  // Language discovery (dynamic, no hard-coding)
  getSupportedLanguages,
  getLanguageCount,
  isLanguageSupported,
  isPairSupported,
  
  // Types
  type SemanticTranslationResult,
  type BidirectionalResult,
  type LanguageInfo,
} from './semantic-translate';

// Engine access
export {
  loadEngine,
  getEngine,
  clearEngineCache,
  getEngineCacheStats,
  type Language,
  type Translator,
  type TranslationEngine,
} from './engine';

// ============================================================
// LEGACY API - EMBEDDED TRANSLATOR (Backward Compatibility)
// ============================================================

export {
  // Core translation functions
  translate,
  translateInBackground,
  convertToNativeScript,
  transliterateToNative,
  getNativeScriptPreview,
  processMessageForChat,
  
  // Bidirectional translation (Source ↔ Target via English)
  translateBidirectional,
  translateReply,
  translateBidirectionalInBackground,
  translateTargetToSource, // Target → English → Source
  
  // Language detection
  autoDetectLanguage,
  
  // Language utilities
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  needsScriptConversion,
  getLanguageInfo,
  isEnglish,
  isRTL,
  
  // Legacy language functions (now delegating to engine)
  getSupportedLanguages as getLegacySupportedLanguages,
  isLanguageSupported as isLegacyLanguageSupported,
  isPairSupported as isLegacyPairSupported,
  getTotalLanguageCount,
  getSupportedPairs,
  
  // Status (always ready - no model loading)
  isReady,
  getLoadingStatus,
  
  // Cache management
  clearTranslationCache,
  getCacheStats,
  
  // Constants
  LANGUAGES,
} from './embedded-translator';

// Compatibility aliases (for backward compat with old API)
export {
  autoDetectLanguage as autoDetectLanguageSync,
  autoDetectLanguage as detectLanguage,
  convertToNativeScript as convertToNativeScriptAsync,
  needsScriptConversion as asyncNeedsScriptConversion,
  isLatinText as asyncIsLatinText,
  processMessageForChat as processChatMessage,
} from './embedded-translator';

// Stub functions for removed worker-based features
export const initWorker = () => Promise.resolve();
export const terminateWorker = () => {};
export const normalizeUnicode = (text: string) => text.normalize('NFC');
export const createDebouncedPreview = () => ({
  update: (text: string, lang: string) => Promise.resolve(getNativeScriptPreview(text, lang)),
  cancel: () => {},
});
export const isLatinScript = (text: string) => isLatinText(text);

import { getNativeScriptPreview, isLatinText } from './embedded-translator';

export type {
  EmbeddedTranslationResult,
  LanguageDetectionResult as AutoDetectedLanguage,
  ChatProcessResult,
  LanguageInfo as LegacyLanguageInfo,
  BidirectionalTranslationResult,
} from './embedded-translator';

// ============================================================
// PHONETIC SYMSPELL - Spell correction for 300+ languages
// ============================================================

export {
  correctWord,
  correctText,
  getSuggestions,
  spellCorrectForChat,
  applyLanguagePhonetics,
  editDistance,
  phoneticNormalize,
  generatePhoneticVariations,
} from './phonetic-symspell';

// ============================================================
// DYNAMIC TRANSLITERATOR - Script conversion for 386+ languages
// ============================================================

export {
  dynamicTransliterate,
  reverseTransliterate,
  detectScriptFromText,
  getScriptForLanguage,
} from './dynamic-transliterator';

// ============================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================

export type {
  TranslationResult,
  TranslationOptions,
  TranslatorConfig,
  LanguageDetectionResult,
  BatchTranslationItem,
  BatchTranslationResult,
  NLLBLanguageCode,
  ScriptPattern,
} from './types';

export {
  getNLLBCode,
  isIndianLanguage,
  // getSupportedLanguages, // Now exported from embedded-translator with 386+ languages
  // isLanguageSupported,   // Now exported from embedded-translator with 386+ languages
  LANGUAGE_TO_NLLB,
  SCRIPT_PATTERNS,
  INDIAN_LANGUAGES,
  LATIN_SCRIPT_LANGUAGES,
} from './language-codes';

// ============================================================
// SEMANTIC TRANSLATION HOOKS (Recommended)
// ============================================================

export { 
  useSemanticTranslation, 
  useTranslate, 
  useChatTranslation 
} from '@/hooks/useSemanticTranslation';

// ============================================================
// LEGACY HOOKS (Backward compatibility)
// ============================================================

export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

// Legacy realtime hook
export { useRealtimeChatTranslation } from '@/hooks/useRealtimeChatTranslation';
export type {
  ChatMessageResult,
  LivePreviewResult,
  AutoDetectedLanguage as RealtimeAutoDetectedLanguage,
} from '@/hooks/useRealtimeChatTranslation';

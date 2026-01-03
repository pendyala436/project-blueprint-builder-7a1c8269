/**
 * Translation Module - Unified Export
 * 
 * DL-Translate implementation with M2M100 model (100+ languages)
 * 
 * Translation methods:
 * 1. Dictionary translation (instant, browser-based)
 * 2. Phonetic transliteration (Latin → Native script)
 * 3. M2M100 Neural Translation (100+ languages, in-browser)
 * 
 * Flow:
 * - Typing: Latin letters → Live preview in native script
 * - Send: Background translation (non-blocking)
 * - Receive: Auto-translate to receiver's language
 * - Bi-directional: Works both ways
 * 
 * Based on: https://github.com/xhluca/dl-translate
 */

// ============================================================================
// Types
// ============================================================================
export type {
  LanguageCode,
  TranslationResult,
  TranslationOptions,
  TranslatorConfig,
  LanguageDetectionResult,
  BatchTranslationItem,
  BatchTranslationResult,
  ScriptPattern,
  LivePreviewState,
  ChatTranslationOptions,
  ProcessedMessage,
  TranslatedMessage,
} from './types';

// ============================================================================
// Language Utilities
// ============================================================================
export {
  normalizeLanguage,
  isIndianLanguage,
  isLatinScriptLanguage,
  isLanguageSupported,
  getSupportedLanguages,
  SCRIPT_PATTERNS,
  SUPPORTED_LANGUAGES,
  INDIAN_LANGUAGES,
  LATIN_SCRIPT_LANGUAGES,
} from './language-codes';

// ============================================================================
// Language Detection
// ============================================================================
export {
  detectLanguage,
  isLatinScript,
  isSameLanguage,
  detectPhoneticIndianLanguage,
} from './language-detector';

// ============================================================================
// Phonetic Transliteration
// ============================================================================
export {
  phoneticTransliterate,
  isPhoneticTransliterationSupported,
  getSupportedPhoneticLanguages,
} from './phonetic-transliterator';

// ============================================================================
// Translation Engine
// ============================================================================
export {
  translateText,
  convertToNativeScript,
  translateBatch,
  clearTranslationCache,
  getCacheStats,
  setEdgeFunctionFallbackEnabled,
  isEdgeFunctionFallbackEnabled,
} from './translation-engine';

// ============================================================================
// Dictionary Translation (ML Engine)
// ============================================================================
export {
  translateWithML,
  translateBatchWithML,
  initializeMLTranslator,
  isMLTranslatorReady,
  isMLTranslatorLoading,
  disposeMLTranslator,
  clearMLCache,
  getMLCacheStats,
  getLanguageCode,
  LANGUAGE_CODES,
} from './ml-translation-engine';

// ============================================================================
// DL-Translate (Dictionary + M2M100 Neural Model - 100+ languages)
// ============================================================================
export {
  translateWithDLTranslate,
  getDLTranslateLanguageName,
  isDLTranslateSupported,
  clearDLTranslateCache,
  getDLTranslateCacheStats,
  isDLTranslateLanguageSupported,
  getDLTranslateSupportedLanguages,
  initializeDLTranslate,
  isDLTranslateModelLoaded,
  isDLTranslateModelLoading,
  DL_TRANSLATE_LANGUAGES,
  M2M100_LANGUAGES,
} from './dl-translate-api';

// ============================================================================
// DL-Translate M2M100 Model (direct access)
// ============================================================================
export {
  translateWithM2M100,
  initializeM2M100,
  isM2M100Supported,
  getM2M100SupportedLanguages,
  isM2M100Loaded,
  isM2M100Loading,
  unloadM2M100,
  getM2M100Code,
  getM2M100LanguageName,
} from './dl-translate-model';

// ============================================================================
// React Hooks
// ============================================================================
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

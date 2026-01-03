/**
 * Translation Module - Unified Export
 * 
 * Multi-tier translation (200+ languages):
 * 1. Dictionary translation (instant, browser-based)
 * 2. Phonetic transliteration (Latin → Native script)
 * 3. ML Translation via NLLB-200 model (200+ languages, in-browser)
 * 
 * Flow:
 * - Typing: Latin letters → Live preview in native script
 * - Send: Background translation (non-blocking)
 * - Receive: Auto-translate to receiver's language
 * - Bi-directional: Works both ways
 * 
 * Based on: https://github.com/xhluca/dl-translate
 * Model: NLLB-200 via @huggingface/transformers
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
// DL-Translate API (200+ languages via NLLB-200)
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
  DL_TRANSLATE_LANGUAGES,
  NLLB_LANGUAGE_CODES,
} from './dl-translate-api';

// ============================================================================
// ML Translator (NLLB-200 model)
// ============================================================================
export {
  translateWithML as translateWithNLLB,
  initializeMLTranslator as initializeNLLBTranslator,
  isLanguageSupported as isNLLBLanguageSupported,
  getSupportedLanguages as getNLLBSupportedLanguages,
  isModelLoaded as isNLLBModelLoaded,
  isModelCurrentlyLoading as isNLLBModelLoading,
  getModelInfo as getNLLBModelInfo,
  unloadModel as unloadNLLBModel,
  getNLLBCode,
} from './ml-translator';

// ============================================================================
// React Hooks
// ============================================================================
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

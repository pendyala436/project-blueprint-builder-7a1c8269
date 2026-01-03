/**
 * Translation Module - Unified Export
 * 
 * Multi-tier translation:
 * 1. Dictionary translation (instant, browser-based)
 * 2. Phonetic transliteration (Latin → Native script)
 * 3. DL-Translate HuggingFace API (200+ languages via NLLB model)
 * 
 * Flow:
 * - Typing: Latin letters → Live preview in native script
 * - Send: Background translation (non-blocking)
 * - Receive: Auto-translate to receiver's language
 * - Bi-directional: Works both ways
 * 
 * Based on: https://huggingface.co/spaces/kintong3000/dl-translate
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
// DL-Translate HuggingFace API
// ============================================================================
export {
  translateWithDLTranslate,
  getDLTranslateLanguageName,
  isDLTranslateSupported,
  clearDLTranslateCache,
  getDLTranslateCacheStats,
  DL_TRANSLATE_LANGUAGES,
} from './dl-translate-api';

// ============================================================================
// React Hooks
// ============================================================================
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

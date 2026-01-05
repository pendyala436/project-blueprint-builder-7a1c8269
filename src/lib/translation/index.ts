/**
 * Translation Module - Unified Export
 * 
 * Translation methods:
 * 1. Dictionary translation (instant, browser-based)
 * 2. Phonetic transliteration (Latin → Native script)
 * 3. NLLB-200 Neural Translation (200+ languages, in-browser)
 * 
 * Flow:
 * - Typing: Latin letters → Live preview in native script
 * - Send: Background translation with NLLB-200 (non-blocking)
 * - Receive: Auto-translate to receiver's language
 * - Bi-directional: Works both ways
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
// Phonetic Transliteration (ICU-style for 200+ languages)
// ============================================================================
export {
  phoneticTransliterate,
  isPhoneticTransliterationSupported,
  getSupportedPhoneticLanguages,
  convertNumerals,
  getScriptType,
} from './phonetic-transliterator';

// Direct ICU exports for advanced usage
export {
  icuTransliterate,
  isICUTransliterationSupported,
  getICUSupportedLanguages,
} from './icu-transliterator';

// ============================================================================
// Spell Correction
// ============================================================================
export {
  correctSpelling,
  getSpellingSuggestion,
  hasSpellingErrors,
} from './spell-corrector';

// ============================================================================
// Translation Engine (Dictionary-based)
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
// NLLB-200 Neural Translation (200+ languages)
// ============================================================================
export {
  translateWithNLLB,
  translateBatchWithNLLB,
  initializeNLLB,
  isNLLBLoaded,
  isNLLBLoading,
  getNLLBLoadingProgress,
  getNLLBCode,
  isNLLBSupported,
  getNLLBSupportedLanguages,
  unloadNLLB,
  NLLB_LANGUAGE_CODES,
} from './nllb-translator';

// ============================================================================
// React Hooks
// ============================================================================
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

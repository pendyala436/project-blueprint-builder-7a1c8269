/**
 * Translation Module - Unified Export
 * 
 * Multi-model neural translation with embedded fallbacks:
 * 1. Dictionary translation (instant, browser-based)
 * 2. Phonetic transliteration (Latin → Native script)
 * 3. Edge Function fallback (NLLB-200, SeamlessM4T, M2M100, mBART-50)
 * 
 * Flow:
 * - Typing: Latin letters → Live preview in native script
 * - Send: Background translation (non-blocking)
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
// React Hooks
// ============================================================================
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

/**
 * Translation Module Exports
 * ==========================
 * 
 * Production-ready, fully in-browser translation with:
 * - Web Worker (non-blocking UI)
 * - 200+ NLLB languages
 * - Debounced preview (50-100ms throttle)
 * - Unicode NFC normalization
 * - Phonetic preprocessing (ICU-style)
 * - Chunked translation for long text
 * - Message queue with unique IDs
 * - Error handling with fallbacks
 * - Atomic state updates
 * 
 * Fixes Applied:
 * - Transliteration mapping with phonetic rules (aa→ā, sh→ś)
 * - Preview debounce to prevent lag/flicker
 * - Unicode NFC normalization for combining marks
 * - Chunked translation for long sentences
 * - Batch translate for multi-user scenarios
 * - Confidence-based language detection
 * - Extended Latin character support
 * 
 * @example
 * ```tsx
 * import { translate, transliterateToNative, processChatMessage } from '@/lib/translation';
 * 
 * // Translate text
 * const result = await translate('Hello', 'english', 'hindi');
 * 
 * // Live preview for typing (with debounce)
 * const preview = createDebouncedPreview(75);
 * const text = await preview.update('namaste', 'hindi');
 * 
 * // Process full chat message
 * const chat = await processChatMessage('Hello', 'english', 'hindi');
 * ```
 */

// Types
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

// Translator class and functions (legacy)
export {
  Translator,
  translator,
  translate as translateLegacy,
  convertScript,
  detectLanguage as detectLanguageLegacy,
  isSameLanguage as isSameLanguageLegacy,
  isLatinScript,
} from './translator';

// Language utilities
export {
  getNLLBCode,
  isIndianLanguage,
  isLatinScriptLanguage as isLatinScriptLanguageLegacy,
  getSupportedLanguages,
  isLanguageSupported,
  LANGUAGE_TO_NLLB,
  SCRIPT_PATTERNS,
  INDIAN_LANGUAGES,
  LATIN_SCRIPT_LANGUAGES,
} from './language-codes';

// React hooks
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

// ============================================================
// NEW: Worker-based translator (fully in-browser, non-blocking)
// This is the preferred API - NO external APIs, NO Docker
// ============================================================

export {
  // Core translation functions (async, uses Web Worker)
  translate,
  transliterateToNative,
  processChatMessage,
  detectLanguage,
  
  // Batch operations (for multi-user scenarios)
  batchTranslate,
  
  // Worker management
  initWorker,
  isReady,
  isTranslatorReady,
  getLoadingStatus,
  terminateWorker,
  
  // Debounced preview (for live typing - 50-100ms recommended)
  createDebouncedPreview,
  
  // Utility functions (sync, no worker needed)
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  normalizeUnicode,
  detectLanguageSync,
} from './worker-translator';

// Export types from worker-translator
export type {
  TranslationResult as WorkerTranslationResult,
  ChatProcessResult,
  LanguageDetectionResult as WorkerLanguageDetectionResult,
  BatchTranslateItem,
  BatchTranslateResult,
} from './worker-translator';

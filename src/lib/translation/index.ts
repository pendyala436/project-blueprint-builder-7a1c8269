/**
 * Universal Real-Time Translation Module
 * 
 * TypeScript implementation for universal multilingual chat
 * Supports 200+ languages with NLLB-200 model
 * 
 * Features:
 * - Real-time typing in sender's native language
 * - Automatic translation for recipient
 * - Skip translation when same language
 * - Web Worker for non-blocking operations
 * - Unicode NFC normalization
 * - Debounced live preview
 * 
 * @example
 * ```tsx
 * import { translate, transliterateToNative, processChatMessage } from '@/lib/translation';
 * 
 * // Translate text
 * const result = await translate('Hello', 'english', 'hindi');
 * 
 * // Live preview for typing
 * const preview = await transliterateToNative('namaste', 'hindi');
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
  
  // Worker management
  initWorker,
  isReady,
  getLoadingStatus,
  terminateWorker,
  
  // Debounced preview (for live typing)
  createDebouncedPreview,
  
  // Utility functions (sync, no worker)
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  normalizeUnicode,
} from './worker-translator';

// Export types from worker-translator
export type {
  TranslationResult as WorkerTranslationResult,
  ChatProcessResult,
  LanguageDetectionResult as WorkerLanguageDetectionResult,
} from './worker-translator';

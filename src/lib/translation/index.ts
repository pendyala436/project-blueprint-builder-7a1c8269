/**
 * DL-Translate Translation Module
 * 
 * Embedded translation using LibreTranslate, MyMemory, Google Input Tools
 * Based on: https://github.com/xhluca/dl-translate
 * 
 * NO external edge functions - all logic embedded in client code
 * 
 * Features:
 * - Real-time typing in sender's native language
 * - Automatic translation for recipient
 * - Skip translation when same language
 * - 200+ language support
 * 
 * @example
 * ```tsx
 * import { translator, translate, useTranslator } from '@/lib/translation';
 * 
 * // Using the Translator class
 * const result = await translator.translate('Hello', { targetLanguage: 'hindi' });
 * console.log(result.translatedText); // "नमस्ते"
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
  LanguageCode,
  ScriptPattern,
} from './types';

// Translator class and functions
export {
  Translator,
  translator,
  translate,
  convertScript,
  detectLanguage,
  isSameLanguage,
  isLatinScript,
} from './translator';

// Embedded translation engine
export {
  translateText,
  convertToNativeScript,
  translateBatch,
  clearTranslationCache,
  getCacheStats,
} from './translation-engine';

// Browser-based ML translation (Transformers.js + NLLB-200)
export {
  translateWithML,
  translateBatchWithML,
  initializeMLTranslator,
  isMLTranslatorReady,
  isMLTranslatorLoading,
  disposeMLTranslator,
  clearMLCache,
  getMLCacheStats,
  getNLLBCode,
  isNLLBSupported,
  getSupportedNLLBLanguages,
  NLLB_LANGUAGE_CODES,
} from './ml-translation-engine';

// Language utilities
export {
  isIndianLanguage,
  isLatinScriptLanguage,
  getSupportedLanguages,
  isLanguageSupported,
  normalizeLanguage,
  SCRIPT_PATTERNS,
  INDIAN_LANGUAGES,
  LATIN_SCRIPT_LANGUAGES,
  SUPPORTED_LANGUAGES,
} from './language-codes';

// React hooks
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

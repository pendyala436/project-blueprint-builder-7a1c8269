/**
 * DL-Translate TypeScript Port (Unified)
 * =======================================
 * 
 * SINGLE SOURCE: All translations use translateText from @/lib/translation/translate
 * 
 * Inspired by: https://github.com/xhluca/dl-translate
 * 
 * Supports 3 model backends:
 * - NLLB-200: 200+ languages (best quality) - codes: eng_Latn, hin_Deva
 * - M2M-100: 100 languages (fallback) - codes: en, hi, te
 * - mBART50: 50 languages (legacy) - codes: ar_AR, en_XX
 * 
 * Key Features:
 * 1. Auto-detect source language from text script
 * 2. Convert Latin typing to user's native script (real-time preview)
 * 3. Bidirectional chat translation (sender → receiver, receiver → sender)
 * 4. Same language optimization (native script works, no translation)
 * 5. Support for 200+ languages
 * 
 * @example
 * ```tsx
 * import { translate, translateForChat, convertToNativeScript } from '@/lib/dl-translate';
 * 
 * // Basic translation (uses translateText internally)
 * const result = await translate('Hello world', 'english', 'hindi');
 * console.log(result.text); // "नमस्ते दुनिया"
 * 
 * // Chat translation
 * const chatResult = await translateForChat('How are you?', {
 *   senderLanguage: 'english',
 *   receiverLanguage: 'hindi',
 * });
 * ```
 */

// Types
export type {
  TranslationResult,
  LanguageInfo,
  ChatTranslationOptions,
  ScriptDetectionResult,
  ChatMessage,
  LivePreview,
  CacheEntry,
  TranslatorConfig,
  BatchTranslationItem,
  BatchTranslationResult,
} from './types';

// Core translation functions (all use translateText internally)
export {
  translate,
  translateForChat,
  convertToNativeScript,
  processOutgoingMessage,
  processIncomingMessage,
  translateBatch,
  detect,
  clearCache,
  getCacheStats,
  detectLanguage,
  detectScript,
  getNativeName,
  isSameLanguage,
  isLatinScript,
  isLatinScriptLanguage,
  needsScriptConversion,
  normalizeLanguage,
  getCode,
} from './translator';

// Model-specific language codes
export {
  M2M100_CODES,
  MBART50_CODES,
  NLLB200_CODES,
  getModelCode,
  isModelSupported,
  getModelLanguages,
} from './model-codes';

// Language utilities from translate.ts
export {
  getLanguages as getSupportedLanguages,
  getLanguageInfo,
  isLanguageSupported,
  normalizeLanguage as getLanguage,
  ALL_LANGUAGES as LANGUAGES,
} from '@/lib/translation/translate';

// React hook
export { useDLTranslate } from './useDLTranslate';
export { useDLTranslate as default } from './useDLTranslate';

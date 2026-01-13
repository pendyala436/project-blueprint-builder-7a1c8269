/**
 * DL-Translate TypeScript Port (Unified)
 * =======================================
 * 
 * SINGLE SOURCE: All translations use translateText from @/lib/translation/translate
 * 
 * Inspired by: https://github.com/xhluca/dl-translate
 * 
 * Key Features:
 * 1. Auto-detect source language from text script
 * 2. Convert Latin typing to user's native script (real-time preview)
 * 3. Bidirectional chat translation (sender → receiver, receiver → sender)
 * 4. Same language optimization (native script works, no translation)
 * 5. Support for 1000+ languages
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

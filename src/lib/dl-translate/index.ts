/**
 * DL-Translate TypeScript Port
 * ============================
 * 
 * Auto-detects source/target languages and translates text
 * for chat applications with native language support.
 * 
 * Features:
 * - Auto language detection from text script
 * - Sender types English → converts to receiver's native language
 * - Same language = no translation
 * - Translation caching
 * - React hook for easy integration
 * 
 * @example
 * ```tsx
 * import { translate, translateForChat, useDLTranslate } from '@/lib/dl-translate';
 * 
 * // Basic translation with auto-detection
 * const result = await translate('Hello world', undefined, 'hindi');
 * console.log(result.text); // "नमस्ते दुनिया"
 * 
 * // Chat translation (sender → receiver)
 * const chatResult = await translateForChat('How are you?', {
 *   senderLanguage: 'english',
 *   receiverLanguage: 'hindi',
 * });
 * 
 * // Using React hook
 * const { translate, isTranslating, detectLanguage } = useDLTranslate();
 * ```
 */

// Types
export type {
  TranslationResult,
  LanguageInfo,
  ChatTranslationOptions,
  ScriptDetectionResult,
} from './types';

// Translation functions
export {
  translate,
  translateForChat,
  convertToNativeScript,
  detect,
  clearCache,
} from './translator';

// Language utilities
export {
  LANGUAGES,
  LANGUAGE_TO_CODE,
  CODE_TO_LANGUAGE,
  getSupportedLanguages,
  detectScript,
  detectLanguage,
  isLatinScript,
  isSameLanguage,
  normalizeLanguage,
  getCode,
  getLanguage,
  getNativeName,
} from './languages';

// React hook
export { useDLTranslate } from './useDLTranslate';

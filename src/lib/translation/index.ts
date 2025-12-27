/**
 * DL-Translate Inspired Translation Module
 * 
 * TypeScript implementation of translation functionality
 * inspired by https://github.com/xhluca/dl-translate
 * 
 * Uses NLLB-200 model via Hugging Face for 200+ language support
 * 
 * @example
 * ```tsx
 * import { translator, translate, useTranslator } from '@/lib/translation';
 * 
 * // Using the Translator class
 * const result = await translator.translate('Hello', { targetLanguage: 'hindi' });
 * console.log(result.translatedText); // "नमस्ते"
 * 
 * // Using the convenience function
 * const { translatedText } = await translate('Hello', { targetLanguage: 'hindi' });
 * 
 * // Using the React hook
 * const { translate, isTranslating } = useTranslator();
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

// Language utilities
export {
  getNLLBCode,
  isIndianLanguage,
  isLatinScriptLanguage,
  getSupportedLanguages,
  isLanguageSupported,
  LANGUAGE_TO_NLLB,
  SCRIPT_PATTERNS,
  INDIAN_LANGUAGES,
  LATIN_SCRIPT_LANGUAGES,
} from './language-codes';

// React hook
export { useTranslator } from './useTranslator';

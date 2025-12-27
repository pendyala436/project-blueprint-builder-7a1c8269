/**
 * DL-Translate TypeScript Port
 * ============================
 * 
 * Inspired by: https://github.com/xhluca/dl-translate
 * 
 * A TypeScript implementation of dl-translate for browser-based
 * machine translation using NLLB-200 model via @huggingface/transformers.
 * 
 * Features:
 * - 200+ language support (NLLB-200)
 * - Browser-based translation (no server required)
 * - Automatic language detection
 * - Translation caching
 * - React hooks for easy integration
 * 
 * @example
 * ```tsx
 * import { TranslationModel, translate, useDLTranslate } from '@/lib/dl-translate';
 * 
 * // Using the TranslationModel class (like Python's dl-translate)
 * const mt = new TranslationModel();
 * await mt.load();
 * const result = await mt.translate('Hello world', 'english', 'hindi');
 * console.log(result.text); // "नमस्ते दुनिया"
 * 
 * // Using convenience function
 * const result = await translate('Hello', 'english', 'spanish');
 * 
 * // Using React hook
 * const { translate, isLoading, isReady } = useDLTranslate();
 * ```
 */

// Types
export type {
  NLLBCode,
  ModelType,
  TranslationResult,
  LanguageInfo,
  TranslatorConfig,
  ScriptDetectionResult,
} from './types';

// TranslationModel class and functions
export {
  TranslationModel,
  mt,
  translate,
  translateAuto,
  detect,
  isLatinScript,
  isSameLanguage,
  getCode,
  getLanguage,
} from './translator';

// Language utilities
export {
  LANGUAGE_TO_CODE,
  CODE_TO_LANGUAGE,
  getSupportedLanguages,
  detectScript,
} from './languages';

// React hook
export { useDLTranslate } from './useDLTranslate';

/**
 * DL-Translate TypeScript Port
 * ============================
 * 
 * Inspired by: https://github.com/xhluca/dl-translate
 * 
 * A simplified TypeScript implementation using server-side translation
 * via Supabase Edge Function. No client-side model loading required.
 * 
 * Features:
 * - Language detection based on script
 * - Translation caching
 * - Server-side translation via Edge Function
 * - React hook for easy integration
 * 
 * @example
 * ```tsx
 * import { translate, useDLTranslate } from '@/lib/dl-translate';
 * 
 * // Using convenience function
 * const result = await translate('Hello', 'english', 'spanish');
 * 
 * // Using React hook
 * const { translate, isTranslating } = useDLTranslate();
 * const result = await translate('Hello', 'english', 'hindi');
 * ```
 */

// Types
export type {
  LanguageCode,
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
} from './translator';

// Language utilities
export {
  LANGUAGE_TO_CODE,
  CODE_TO_LANGUAGE,
  getSupportedLanguages,
  detectScript,
  detectLanguage,
  isLatinScript,
  isSameLanguage,
  getCode,
  getLanguage,
} from './languages';

// React hook
export { useDLTranslate } from './useDLTranslate';

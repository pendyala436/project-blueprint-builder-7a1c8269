/**
 * DL-Translate Translation Module
 * 
 * Server-side translation via Supabase Edge Function
 * Based on: https://github.com/xhluca/dl-translate
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

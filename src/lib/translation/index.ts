/**
 * Universal Real-Time Translation Module
 * 
 * TypeScript implementation for universal multilingual chat
 * Supports all human languages with M2M100/NLLB-200 + English pivot fallback
 * 
 * Features:
 * - Real-time typing in sender's native language
 * - Automatic translation for recipient
 * - Skip translation when same language
 * - English pivot for rare language pairs
 * - Real-time typing indicators with translation
 * 
 * @example
 * ```tsx
 * import { translator, translate, useTranslator, useRealtimeTranslation } from '@/lib/translation';
 * 
 * // Using the Translator class
 * const result = await translator.translate('Hello', { targetLanguage: 'hindi' });
 * console.log(result.translatedText); // "नमस्ते"
 * 
 * // Real-time typing with translation
 * const { sendTypingIndicator, partnerTyping } = useRealtimeTranslation({
 *   currentUserId: 'user-1',
 *   currentUserLanguage: 'english',
 *   channelId: 'chat-123'
 * });
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

// React hooks
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

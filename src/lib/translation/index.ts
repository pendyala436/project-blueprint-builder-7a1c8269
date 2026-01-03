/**
 * DL-Translate Translation Module
 * 
 * Browser-based translation using pure JavaScript dictionaries
 * Based on: https://github.com/xhluca/dl-translate
 * 
 * NO external API calls - all logic embedded in client code
 * 
 * Flow:
 * 1. Typing: Latin letters based on user's mother tongue
 * 2. Preview: Live transliteration into native script
 * 3. Send: Translation happens in background
 * 4. Receiver: Sees message in their mother tongue
 * 5. Bi-directional: Same flow for both users
 * 6. Dynamic: Supports 200 languages
 * 7. Non-blocking: Typing is not affected by translation
 * 
 * @example
 * ```tsx
 * import { useLiveTranslationChat } from '@/hooks/useLiveTranslationChat';
 * 
 * const { livePreview, setInput, prepareOutgoing } = useLiveTranslationChat({
 *   userLanguage: 'hindi',
 *   partnerLanguage: 'telugu',
 *   userId: 'user-1'
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
  LanguageCode,
  ScriptPattern,
} from './types';

// Translator class and functions
export {
  Translator,
  translator,
  translate,
  convertScript,
} from './translator';

// Embedded translation engine
export {
  translateText,
  convertToNativeScript,
  translateBatch,
  clearTranslationCache,
  getCacheStats,
} from './translation-engine';

// Phonetic transliterator (Latin → Native script)
export {
  phoneticTransliterate,
  isPhoneticTransliterationSupported,
  getSupportedPhoneticLanguages,
} from './phonetic-transliterator';

// Browser-based DL-Translate dictionary translation
export {
  translateWithML,
  translateBatchWithML,
  initializeMLTranslator,
  isMLTranslatorReady,
  isMLTranslatorLoading,
  disposeMLTranslator,
  clearMLCache,
  getMLCacheStats,
  getLanguageCode,
  isLanguageSupported,
  getSupportedLanguages,
  LANGUAGE_CODES,
} from './ml-translation-engine';

// Language utilities
export {
  isIndianLanguage,
  isLatinScriptLanguage,
  normalizeLanguage,
  SCRIPT_PATTERNS,
  INDIAN_LANGUAGES,
  LATIN_SCRIPT_LANGUAGES,
  SUPPORTED_LANGUAGES,
} from './language-codes';

// Language detection (single source of truth)
export {
  detectLanguage,
  isLatinScript,
  isSameLanguage,
  detectPhoneticIndianLanguage,
} from './language-detector';

// React hooks
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

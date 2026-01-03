/**
 * DL-Translate Translation Module
 * 
 * Browser-based translation using Transformers.js + M2M100 model
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
  getDLM2M100Code as getLanguageCode,
  isDLM2M100Supported as isLanguageSupported,
  getSupportedDLM2M100Languages as getSupportedLanguages,
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

// React hooks
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

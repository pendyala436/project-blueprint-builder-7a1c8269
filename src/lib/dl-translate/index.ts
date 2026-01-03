/**
 * DL-Translate Module - Unified Translation API
 * 
 * Full dl-translate implementation with M2M100 model (100+ languages)
 * Same model as the Python dl-translate library
 * 
 * Translation Flow:
 * 1. Dictionary translation (instant, browser-based)
 * 2. Phonetic transliteration (Latin → Native script)
 * 3. M2M100 Neural Translation (100+ languages, in-browser)
 * 
 * Based on: https://github.com/xhluca/dl-translate
 * 
 * Usage:
 * ```tsx
 * import { useDLTranslate } from '@/lib/dl-translate';
 * 
 * const { translate, translateForChat, convertToNative } = useDLTranslate();
 * const result = await translate('Hello', 'english', 'hindi');
 * ```
 */

// Types
export type { TranslationResult, ChatTranslationOptions } from './useDLTranslate';

// Main hook
export { useDLTranslate } from './useDLTranslate';
export { useDLTranslate as default } from './useDLTranslate';

// Re-export core translation functions
export {
  translateText,
  convertToNativeScript,
  translateBatch,
  clearTranslationCache,
  getCacheStats,
  detectLanguage,
  isLatinScript,
  isSameLanguage,
  normalizeLanguage,
  setEdgeFunctionFallbackEnabled,
  isEdgeFunctionFallbackEnabled,
} from '@/lib/translation/translation-engine';

// Re-export dictionary translation
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
} from '@/lib/translation/ml-translation-engine';

// Re-export phonetic transliteration
export {
  phoneticTransliterate,
  isPhoneticTransliterationSupported,
  getSupportedPhoneticLanguages,
} from '@/lib/translation/phonetic-transliterator';

// Re-export DL-Translate HuggingFace API
export {
  translateWithDLTranslate,
  getDLTranslateLanguageName,
  isDLTranslateSupported,
  clearDLTranslateCache,
  getDLTranslateCacheStats,
  DL_TRANSLATE_LANGUAGES,
} from '@/lib/translation/dl-translate-api';

// Re-export hooks
export { useServerTranslation } from '@/hooks/useServerTranslation';
export type { UseServerTranslationOptions, UseServerTranslationReturn } from '@/hooks/useServerTranslation';

export { useChatTranslation } from '@/hooks/useChatTranslation';
export type { UseChatTranslationOptions, UseChatTranslationReturn } from '@/hooks/useChatTranslation';

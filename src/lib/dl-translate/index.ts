/**
 * DL-Translate Module - Unified Translation API
 * 
 * Uses DL-Translate HuggingFace Space for ML translation:
 * https://huggingface.co/spaces/kintong3000/dl-translate
 * 
 * Translation Flow:
 * 1. Dictionary translation (instant, browser-based)
 * 2. Phonetic transliteration (Latin → Native script)
 * 3. DL-Translate HuggingFace API (200+ languages)
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

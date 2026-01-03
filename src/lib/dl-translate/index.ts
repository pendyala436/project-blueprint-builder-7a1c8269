/**
 * DL-Translate Module - Unified Translation API
 * 
 * Multi-model neural translation:
 * - NLLB-200 (200 languages, primary)
 * - SeamlessM4T (100 languages, multimodal)
 * - M2M100 (100 languages, many-to-many)
 * - mBART-50 (50 languages, European)
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

// Re-export hooks
export { useServerTranslation } from '@/hooks/useServerTranslation';
export type { UseServerTranslationOptions, UseServerTranslationReturn } from '@/hooks/useServerTranslation';

export { useChatTranslation } from '@/hooks/useChatTranslation';
export type { UseChatTranslationOptions, UseChatTranslationReturn } from '@/hooks/useChatTranslation';

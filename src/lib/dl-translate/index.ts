/**
 * DL-Translate - Fully Embedded Translation
 * ==========================================
 * Based on: https://github.com/xhluca/dl-translate (API pattern)
 * Combined with: https://github.com/Goutam245/Language-Translator-Web-Application (pure JS)
 * 
 * NO external APIs for main translation - instant browser-based:
 * 
 * MAIN: DL-Translate Dictionary + Phonetic Transliteration
 * - Instant common phrases
 * - Latin → native script conversion
 * - Zero download, works immediately
 * 
 * FALLBACK: Hugging Face NLLB-200 via Edge Function
 * - Same model as Python dl-translate library
 * - Uses facebook/nllb-200-distilled-600M
 * - Requires HUGGING_FACE_ACCESS_TOKEN
 * 
 * Features:
 * 1. Auto-detect source language
 * 2. Translate between any language pair (200+ languages)
 * 3. Convert Latin typing to native script
 * 4. Same language optimization (no translation needed)
 * 5. Non-blocking translation (doesn't affect typing)
 * 
 * @example
 * ```tsx
 * import { useDLTranslate } from '@/lib/dl-translate';
 * 
 * const { translate, translateForChat, convertToNative } = useDLTranslate();
 * 
 * // Translate text
 * const result = await translate('Hello', 'english', 'hindi');
 * console.log(result.text); // "नमस्ते"
 * 
 * // Chat translation
 * const chatResult = await translateForChat('How are you?', {
 *   senderLanguage: 'english',
 *   receiverLanguage: 'hindi'
 * });
 * ```
 */

// Types
export type {
  TranslationResult,
  ChatTranslationOptions,
} from './useDLTranslate';

// React hook (embedded translation)
export { useDLTranslate } from './useDLTranslate';
export { useDLTranslate as default } from './useDLTranslate';

// Re-export embedded translation hook
export { useServerTranslation } from '@/hooks/useServerTranslation';
export type { UseServerTranslationOptions, UseServerTranslationReturn } from '@/hooks/useServerTranslation';

// Re-export translation engine functions
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

// Re-export browser-based DL-Translate dictionary translation
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

// Re-export ML translation hook
export { 
  useMLTranslation,
  type UseMLTranslationOptions, 
  type UseMLTranslationReturn, 
  type MLTranslationProgress 
} from '@/hooks/useMLTranslation';

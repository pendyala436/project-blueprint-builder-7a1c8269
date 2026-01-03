/**
 * DL-Translate - Embedded Translation
 * ====================================
 * All translation using LibreTranslate, MyMemory, Google Input Tools
 * NO external edge functions - all logic embedded in client code
 * 
 * Features:
 * 1. Auto-detect source language
 * 2. Translate between any language pair (200+ languages)
 * 3. Convert Latin typing to native script
 * 4. Same language optimization (no translation needed)
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
} from '@/lib/translation/translation-engine';

// Re-export browser-based ML translation
export {
  translateWithML,
  translateBatchWithML,
  initializeMLTranslator,
  isMLTranslatorReady,
  isMLTranslatorLoading,
  disposeMLTranslator,
  clearMLCache,
  getMLCacheStats,
  getNLLBCode,
  isNLLBSupported,
  getSupportedNLLBLanguages,
} from '@/lib/translation/ml-translation-engine';

// Re-export ML translation hook
export { 
  useMLTranslation,
  type UseMLTranslationOptions, 
  type UseMLTranslationReturn, 
  type MLTranslationProgress 
} from '@/hooks/useMLTranslation';

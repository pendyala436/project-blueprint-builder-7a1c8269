/**
 * Universal Translation System
 * ============================
 * 
 * Local-only, offline translation engine based on LibreTranslate principles.
 * 
 * Core Features:
 * - NO external APIs
 * - NO NLLB-200
 * - NO hardcoded language names
 * - All logic is dynamic and data-driven from languages.ts
 * - English as bidirectional bridge (with exceptions)
 * 
 * Translation Rules:
 * 1. Native → Latin: Native → English → Latin
 * 2. Latin → Native: Latin → English → Native
 * 3. Native → Native (different): Native → English → Target Native
 * 4. Latin → Latin: Direct (no English bridge)
 * 5. English as source/target: Direct (no middle language)
 * 
 * @example
 * ```tsx
 * import { useUniversalTranslation, translate, translateForChat } from '@/lib/universal-translation';
 * 
 * // React hook usage
 * const { translate, getPreview, isReady } = useUniversalTranslation();
 * 
 * // Direct function usage
 * const result = await translate('hello', 'english', 'hindi');
 * console.log(result.text); // "नमस्ते"
 * 
 * // Chat translation
 * const chatResult = await translateForChat('hello', 'english', 'telugu');
 * console.log(chatResult.receiverView); // "హలో"
 * ```
 * 
 * @see https://github.com/LibreTranslate/LibreTranslate
 */

// ============================================================
// TYPE EXPORTS
// ============================================================

export type {
  TranslationResult,
  BidirectionalChatResult,
  TranslationDirection,
  TranslationMethod,
  UserLanguageProfile,
  ScriptDetection,
  LanguageInfo,
  TranslationConfig,
  CacheEntry,
  CommonPhraseEntry,
} from './types';

export { DEFAULT_CONFIG, TRANSLATION_RULES } from './types';

// ============================================================
// ENGINE EXPORTS
// ============================================================

export {
  // Core translation
  translate,
  translateForChat,
  
  // Cache management
  clearCache,
  clearPhraseCache,
  getCacheStats,
  
  // Initialization
  initializeEngine,
  isEngineReady,
} from './engine';

// ============================================================
// LANGUAGE REGISTRY EXPORTS
// ============================================================

export {
  // Language utilities
  normalizeLanguage,
  getLanguageInfo,
  getLanguageCode,
  getNativeName,
  getScript,
  isLanguageSupported,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  isRTL,
  detectScript,
  getEffectiveLanguage,
  getLanguageColumn,
  
  // Language lists
  getAllLanguages,
  getLanguageCount,
} from './language-registry';

// ============================================================
// TRANSLITERATOR EXPORTS
// ============================================================

export {
  transliterateToNative,
  reverseTransliterate,
  getLivePreview,
  hasTransliteration,
} from './transliterator';

// ============================================================
// REACT HOOK EXPORTS
// ============================================================

export { useUniversalTranslation } from './useUniversalTranslation';
export type { UseUniversalTranslationReturn } from './useUniversalTranslation';

// Default export
export { useUniversalTranslation as default } from './useUniversalTranslation';

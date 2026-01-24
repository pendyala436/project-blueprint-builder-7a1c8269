/**
 * Offline Translation System - Public API
 * ========================================
 * 
 * LibreTranslate-inspired offline translation engine.
 * 
 * Features:
 * - 1000+ language support via languages.ts
 * - Profile-based automatic translation direction
 * - English as universal pivot language
 * - Latin ↔ Native script conversion
 * - Real-time live preview
 * - Phrase-based + word-by-word translation
 * - Caching for performance
 * 
 * Translation Rules:
 * 1. Native → Latin: Native → English → Latin
 * 2. Latin → Native: Latin → English → Native
 * 3. Native → Native: Native → English → Target Native
 * 4. Latin → Latin: Direct (no English bridge)
 * 5. English source/target: Direct (no middle language)
 */

// Core types
export type {
  UserLanguageProfile,
  TranslationResult,
  ChatMessageViews,
  TranslationDirection,
  TranslationMethod,
  LanguageInfo,
  ScriptDetection,
  CommonPhraseEntry,
  TranslationEngineConfig,
} from './types';

export { TRANSLATION_RULES } from './types';

// Core engine functions
export {
  translate,
  translateForChat,
  translateSimple,
  getNativePreview,
  getEnglishPreview,
  initializeEngine,
  isEngineReady,
  clearCache,
  clearPhraseCache,
  getCacheStats,
} from './engine';

// Language registry
export {
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
  detectLanguage,
  getEffectiveLanguage,
  getLanguageColumn,
  getAllLanguages,
  getLanguageCount,
  getLanguagesByScript,
} from './language-registry';

// Transliterator
export {
  transliterateToNative,
  reverseTransliterate,
  getLivePreview,
  hasTransliteration,
} from './transliterator';

// React hooks
export {
  useOfflineTranslation,
  useLivePreview,
  useChatTranslation,
  useLanguageSelector,
} from './hooks';

export type {
  UseOfflineTranslationOptions,
  UseOfflineTranslationReturn,
  UseLivePreviewOptions,
  UseLivePreviewReturn,
  UseChatTranslationOptions,
  UseChatTranslationReturn,
  UseLanguageSelectorReturn,
} from './hooks';

// React components
export {
  OfflineChatInput,
  OfflineMessageBubble,
  TranslationStatusBadge,
} from './components';

export type {
  OfflineChatInputProps,
  OfflineMessageBubbleProps,
  TranslationStatusBadgeProps,
} from './components';

// Default export
export { useOfflineTranslation as default } from './hooks';

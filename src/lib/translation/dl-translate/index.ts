/**
 * DL-Translate Library - Complete 300+ Language Translation System
 * 
 * Production-ready, real-time, bi-directional chat translation
 * 
 * Supports:
 * - 44+ Indian languages (all scheduled + regional)
 * - 260+ world languages (European, Asian, African, etc.)
 * - Auto-detection of source language
 * - Latin typing with live native preview
 * - Non-blocking background translation
 * - Bi-directional translation
 */

// ============================================================================
// PRODUCTION BI-DIRECTIONAL TRANSLATOR (Recommended for Chat Apps)
// ============================================================================

export {
  // Core functions
  getLivePreview,
  processOutgoingMessage as sendBiDirectionalMessage,
  processIncomingMessage as receiveBiDirectionalMessage,
  usersNeedTranslation,
  
  // Utilities
  getLanguageDisplay,
  isLanguageSupportedByTranslator,
  getSupportedLanguageCount,
  getTranslatorState,
  initializeTranslator as initBiDirectionalTranslator,
  cleanupTranslator as cleanupBiDirectionalTranslator,
  autoDetect,
  isTextLatin,
  
  // Memory cache functions
  clearMemoryCache,
  getCachedMessage,
  cacheMessage,
  getAllCachedMessages,
  clearMessageCache,
  clearTranslationCache,
  getCacheStats,
  
  // Types
  type ChatParticipant,
  type BiDirectionalMessage,
  type LiveTypingPreview,
  type TranslatorState,
  type TranslationCallbacks,
} from './production-bidirectional-translator';

// ============================================================================
// CORE TRANSLATION MODEL
// ============================================================================

export {
  initializeTranslator,
  translate,
  translateForChat,
  getTransliterationPreview,
  isTranslatorLoaded,
  isTranslatorLoading,
  getLoadingProgress,
  unloadTranslator,
  availableLanguages,
  availableCodes,
  getLangCodes,
  type TranslationResult,
  type ProgressCallback,
} from './translation-model';

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

export {
  detectLanguage,
  isLatinScript,
  isSameLanguage,
  getTargetLanguageCode,
  type LanguageDetectionResult,
} from './language-detector';

// ============================================================================
// TRANSLITERATION (Latin → Native Script)
// ============================================================================

export {
  transliterate,
  isTransliterationSupported,
  getLanguageDisplayName,
  SUPPORTED_TRANSLITERATION_SCRIPTS,
} from './transliteration';

// ============================================================================
// LANGUAGE PAIRS & CODES
// ============================================================================

export {
  PAIRS_M2M100,
  PAIRS_MBART50,
  PAIRS_NLLB200,
  getPairsForModel,
  type ModelFamily,
} from './language-pairs';

// ============================================================================
// UTILITIES
// ============================================================================

export {
  inferModelFamily,
  inferModelOrPath,
  resolveLangCode,
  normalizeLanguageInput,
  isLanguageSupported,
  getLanguageFromCode,
  getAvailableLanguages,
  getAvailableCodes,
  getLangCodeMap,
} from './utils';

// ============================================================================
// REACT HOOKS
// ============================================================================

export { useDLTranslate, useQuickTranslate } from './useDLTranslate';
export { useRealtimeChatTranslation } from './useRealtimeChatTranslation';

// ============================================================================
// REAL-TIME CHAT TRANSLATOR
// ============================================================================

export {
  getLiveNativePreview,
  processOutgoingMessage,
  processIncomingMessage,
  needsTranslation,
  getTranslatorStatus,
  preloadTranslationModel,
  cleanup,
  autoDetectLanguage,
  type ProcessedMessage,
  type LivePreview,
  type ChatUser,
} from './realtime-chat-translator';

// ============================================================================
// SPELL CORRECTIONS (ALL 300+ Languages with intelligent fallback)
// ============================================================================

export {
  applySpellCorrections,
  suggestCorrections,
  validateTransliteration,
  getCorrectionsForLanguage,
  LANGUAGE_CORRECTIONS,
  UNIVERSAL_LATIN_CORRECTIONS,
} from './spell-corrections';

// ============================================================================
// TRANSLATION WORKER (Background Processing)
// ============================================================================

export {
  initWorkerTranslator,
  isWorkerReady,
  queueTranslation,
  cancelPendingJobs,
  getQueueStats,
  cleanupWorker,
} from './translation-worker';

// ============================================================================
// LANGUAGE DATA (300+ Languages)
// ============================================================================

export {
  ALL_LANGUAGES,
  INDIAN_LANGUAGES,
  NON_INDIAN_LANGUAGES as GLOBAL_LANGUAGES,
  getLanguageCode,
  getLanguageByCode,
  getLanguageByName,
  getIndianLanguageNames,
  getNonIndianLanguageNames,
  getTotalLanguageCount,
  getLanguagesByRegion,
  getLanguagesByScript,
  searchLanguages,
  isIndianLanguage,
  type DLTranslateLanguage,
} from '@/data/dlTranslateLanguages';

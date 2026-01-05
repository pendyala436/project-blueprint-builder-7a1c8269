/**
 * DL-Translate TypeScript Port
 * 
 * Converted from: https://github.com/xhluca/dl-translate
 * Original: Python library for translating between 200+ languages
 * 
 * This TypeScript version uses @huggingface/transformers for in-browser
 * neural machine translation with the NLLB-200 model.
 * 
 * Features:
 * - 200+ language support (NLLB-200 model)
 * - Auto language detection from text
 * - Phonetic Latin input detection for Indian languages
 * - Real-time transliteration preview
 * - Bi-directional chat translation
 * - Non-blocking typing experience
 * - Production-ready for scale (lakhs of users)
 */

// ============================================================================
// Core Translation Model
// ============================================================================
export {
  initializeTranslator,
  isTranslatorLoaded,
  isTranslatorLoading,
  getLoadingProgress,
  translate,
  translateForChat,
  getTransliterationPreview,
  availableLanguages,
  availableCodes,
  getLangCodes,
  unloadTranslator,
  type TranslationResult,
  type ProgressCallback,
} from './translation-model';

// ============================================================================
// Language Detection
// ============================================================================
export {
  detectLanguage,
  isLatinScript,
  isSameLanguage,
  getTargetLanguageCode,
  type LanguageDetectionResult,
} from './language-detector';

// ============================================================================
// Transliteration (Latin → Native Script)
// ============================================================================
export {
  transliterate,
  isTransliterationSupported,
  getLanguageDisplayName,
  SUPPORTED_TRANSLITERATION_SCRIPTS,
} from './transliteration';

// ============================================================================
// Language Pairs & Codes
// ============================================================================
export {
  PAIRS_M2M100,
  PAIRS_MBART50,
  PAIRS_NLLB200,
  getPairsForModel,
  type ModelFamily,
} from './language-pairs';

// ============================================================================
// Utilities
// ============================================================================
export {
  inferModelFamily,
  inferModelOrPath,
  getLangCodeMap,
  getAvailableLanguages,
  getAvailableCodes,
  resolveLangCode,
  isLanguageSupported,
  getLanguageFromCode,
  normalizeLanguageInput,
} from './utils';

// ============================================================================
// React Hooks (Legacy)
// ============================================================================
export {
  useDLTranslate,
  useQuickTranslate,
  type ChatMessage,
  type LivePreviewState,
  type UseDLTranslateOptions,
  type UseDLTranslateReturn,
} from './useDLTranslate';

// ============================================================================
// Production Real-time Chat Translation
// ============================================================================
export {
  useRealtimeChatTranslation,
  cleanupTranslator,
  type ChatUser,
  type ProcessedMessage,
  type LivePreview,
  type UseRealtimeChatOptions,
  type UseRealtimeChatReturn,
} from './useRealtimeChatTranslation';

// ============================================================================
// Real-time Chat Translator (Core Functions)
// ============================================================================
export {
  getLiveNativePreview,
  processOutgoingMessage,
  processIncomingMessage,
  autoDetectLanguage,
  needsTranslation,
  getTranslatorStatus,
  preloadTranslationModel,
  cleanup,
} from './realtime-chat-translator';

// ============================================================================
// Translation Worker (Background Processing)
// ============================================================================
export {
  initWorkerTranslator,
  isWorkerReady,
  queueTranslation,
  cancelPendingJobs,
  getQueueStats,
  cleanupWorker,
} from './translation-worker';

/**
 * Translation Module Exports
 * ==========================
 * 
 * 100% EMBEDDED, NO EXTERNAL APIs - LibreTranslate-Inspired
 * 
 * Features:
 * - 300+ language support
 * - Real-time transliteration (< 2ms)
 * - Auto language detection
 * - Phonetic spell correction
 * - Native script preview
 * - Bi-directional chat translation
 * 
 * ARCHITECTURE:
 * - Typing: Latin letters based on mother tongue
 * - Preview: Live transliteration into native script
 * - Send: Translation in background, sender sees native
 * - Receive: Message in receiver's mother tongue
 * - Non-blocking: All operations async
 * 
 * @example
 * ```tsx
 * import { translate, getNativeScriptPreview, processMessageForChat } from '@/lib/translation';
 * 
 * // Instant preview (< 2ms)
 * const preview = getNativeScriptPreview('namaste', 'hindi');
 * // Returns: नमस्ते
 * 
 * // Full chat processing
 * const result = await processMessageForChat('hello', 'english', 'hindi');
 * // result.senderView = 'hello'
 * // result.receiverView = 'हैलो'
 * ```
 */

// ============================================================
// PRIMARY API - EMBEDDED TRANSLATOR (100% in-browser)
// ============================================================

export {
  // Core translation functions
  translate,
  translateInBackground,
  convertToNativeScript,
  transliterateToNative,
  getNativeScriptPreview,
  processMessageForChat,
  
  // Bidirectional translation (Source ↔ Target via English)
  translateBidirectional,
  translateReply,
  translateBidirectionalInBackground,
  
  // Language detection
  autoDetectLanguage,
  
  // Language utilities
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  needsScriptConversion,
  getLanguageInfo,
  isEnglish,
  
  // Status (always ready - no model loading)
  isReady,
  getLoadingStatus,
  
  // Cache management
  clearTranslationCache,
  getCacheStats,
  
  // Constants
  LANGUAGES,
} from './embedded-translator';

// Compatibility aliases (for backward compat with old API)
export {
  autoDetectLanguage as autoDetectLanguageSync,
  autoDetectLanguage as detectLanguage,
  convertToNativeScript as convertToNativeScriptAsync,
  needsScriptConversion as asyncNeedsScriptConversion,
  isLatinText as asyncIsLatinText,
  processMessageForChat as processChatMessage,
} from './embedded-translator';

// Stub functions for removed worker-based features
export const initWorker = () => Promise.resolve();
export const terminateWorker = () => {};
export const normalizeUnicode = (text: string) => text.normalize('NFC');
export const createDebouncedPreview = () => ({
  update: (text: string, lang: string) => Promise.resolve(getNativeScriptPreview(text, lang)),
  cancel: () => {},
});
export const isLatinScript = (text: string) => isLatinText(text);

import { getNativeScriptPreview, isLatinText } from './embedded-translator';

export type {
  EmbeddedTranslationResult,
  LanguageDetectionResult as AutoDetectedLanguage,
  ChatProcessResult,
  LanguageInfo,
  BidirectionalTranslationResult,
} from './embedded-translator';

// ============================================================
// PHONETIC SYMSPELL - Spell correction for 300+ languages
// ============================================================

export {
  correctWord,
  correctText,
  getSuggestions,
  spellCorrectForChat,
  applyLanguagePhonetics,
  editDistance,
  phoneticNormalize,
  generatePhoneticVariations,
} from './phonetic-symspell';

// ============================================================
// DYNAMIC TRANSLITERATOR - Script conversion
// ============================================================

export {
  dynamicTransliterate,
  detectScriptFromText,
  getScriptForLanguage,
} from './dynamic-transliterator';

// ============================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================

export type {
  TranslationResult,
  TranslationOptions,
  TranslatorConfig,
  LanguageDetectionResult,
  BatchTranslationItem,
  BatchTranslationResult,
  NLLBLanguageCode,
  ScriptPattern,
} from './types';

export {
  getNLLBCode,
  isIndianLanguage,
  getSupportedLanguages,
  isLanguageSupported,
  LANGUAGE_TO_NLLB,
  SCRIPT_PATTERNS,
  INDIAN_LANGUAGES,
  LATIN_SCRIPT_LANGUAGES,
} from './language-codes';

// Legacy hooks (still available but recommend using embedded translator directly)
export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

// Legacy realtime hook
export { useRealtimeChatTranslation } from '@/hooks/useRealtimeChatTranslation';
export type {
  ChatMessageResult,
  LivePreviewResult,
  AutoDetectedLanguage as RealtimeAutoDetectedLanguage,
} from '@/hooks/useRealtimeChatTranslation';

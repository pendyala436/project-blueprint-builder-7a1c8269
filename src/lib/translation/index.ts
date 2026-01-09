/**
 * Universal Translation System - 1000+ Languages
 * ===============================================
 * 
 * Complete browser-based translation supporting ALL languages
 * from men_languages.ts and women_languages.ts (842+ languages each).
 * 
 * Key Features:
 * 1. Same-language bypass (source = target → return input as-is)
 * 2. Different-language translation via English pivot
 * 3. Dynamic language discovery (no hardcoding)
 * 4. Native script conversion (Latin ↔ Native)
 * 5. Real-time typing preview
 * 6. Offline, browser-based, meaning-based translation
 * 
 * @example
 * ```tsx
 * import { 
 *   translateText, 
 *   getLanguages, 
 *   isReady,
 *   isSameLanguage 
 * } from '@/lib/translation';
 * 
 * // Same language returns input as-is
 * const result1 = await translateText('Hello', 'english', 'english');
 * // result1.text === 'Hello', result1.isSameLanguage === true
 * 
 * // Different languages use semantic translation
 * const result2 = await translateText('Hello friend', 'english', 'hindi');
 * // result2.text === 'नमस्ते दोस्त', result2.isTranslated === true
 * ```
 */

// ============================================================
// CORE 1000+ LANGUAGE TRANSLATION API (Primary - from translate.ts)
// ============================================================

export {
  // Main translation function
  translateText,
  
  // Language discovery
  getLanguages,
  getLanguageCount,
  getLanguageInfo,
  getTranslator,
  loadEngine,
  
  // Status
  isReady,
  clearCache,
  getCacheStats,
  
  // Language utilities
  normalizeLanguage,
  isLanguageSupported,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  needsScriptConversion,
  autoDetectLanguage,
  
  // Constants - All 1000+ languages
  ALL_LANGUAGES,
  
  // Types
  type Language,
  type TranslationResult,
  type Translator,
  type TranslationEngine,
} from './translate';

// ============================================================
// SEMANTIC TRANSLATION API (Alternative high-level API)
// ============================================================

export {
  // Core semantic translation
  semanticTranslate,
  semanticTranslateBatch,
  semanticTranslateBidirectional,
  
  // Language discovery
  getSupportedLanguages,
  isPairSupported,
  
  // Types
  type SemanticTranslationResult,
  type BidirectionalResult,
  type LanguageInfo,
} from './semantic-translate';

// Engine access (aliased to avoid conflicts)
export {
  getEngine,
  clearEngineCache,
  getEngineCacheStats,
  type Language as EngineLanguage,
  type Translator as EngineTranslator,
  type TranslationEngine as Engine,
} from './engine';

// ============================================================
// EMBEDDED TRANSLATOR (Legacy/Backward Compatibility)
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
  translateTargetToSource,
  
  // Status
  getLoadingStatus,
  
  // Language utilities (aliased)
  isRTL,
  getProxyLanguage,
  getEffectiveTargetLanguage,
  
  // Legacy language functions
  getSupportedLanguages as getLegacySupportedLanguages,
  isLanguageSupported as isLegacyLanguageSupported,
  isPairSupported as isLegacyPairSupported,
  getTotalLanguageCount,
  getSupportedPairs,
  
  // Cache management
  clearTranslationCache,
  
  // Constants
  LANGUAGES,
} from './embedded-translator';

// Compatibility aliases - re-export from translate.ts
export {
  autoDetectLanguage as autoDetectLanguageSync,
  autoDetectLanguage as detectLanguage,
  needsScriptConversion as asyncNeedsScriptConversion,
  isLatinText as asyncIsLatinText,
} from './translate';

// Re-export from embedded-translator for chat processing
export {
  convertToNativeScript as convertToNativeScriptAsync,
  processMessageForChat as processChatMessage,
} from './embedded-translator';

// Import for stub functions
import { getNativeScriptPreview } from './embedded-translator';
import { isLatinText as checkLatinText } from './translate';

export const initWorker = () => Promise.resolve();
export const terminateWorker = () => {};
export const normalizeUnicode = (text: string) => text.normalize('NFC');
export const createDebouncedPreview = () => ({
  update: (text: string, lang: string) => Promise.resolve(getNativeScriptPreview(text, lang)),
  cancel: () => {},
});
export const isLatinScript = (text: string) => checkLatinText(text);

// Embedded translator types
export type {
  EmbeddedTranslationResult,
  LanguageDetectionResult as AutoDetectedLanguage,
  ChatProcessResult,
  LanguageInfo as LegacyLanguageInfo,
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
// DYNAMIC TRANSLITERATOR - Script conversion for 1000+ languages
// ============================================================

export {
  dynamicTransliterate,
  reverseTransliterate,
  detectScriptFromText,
  getScriptForLanguage,
} from './dynamic-transliterator';

// ============================================================
// LEGACY TYPE EXPORTS
// ============================================================

export type {
  TranslationResult as LegacyTranslationResult,
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
  LANGUAGE_TO_NLLB,
  SCRIPT_PATTERNS,
  INDIAN_LANGUAGES,
  LATIN_SCRIPT_LANGUAGES,
} from './language-codes';

// ============================================================
// SEMANTIC TRANSLATION HOOKS (Recommended)
// ============================================================

export { 
  useSemanticTranslation, 
  useTranslate, 
  useChatTranslation 
} from '@/hooks/useSemanticTranslation';

// ============================================================
// LEGACY HOOKS (Backward compatibility)
// ============================================================

export { useTranslator } from './useTranslator';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';

// Legacy realtime hook
export { useRealtimeChatTranslation } from '@/hooks/useRealtimeChatTranslation';
export type {
  ChatMessageResult,
  LivePreviewResult,
  AutoDetectedLanguage as RealtimeAutoDetectedLanguage,
} from '@/hooks/useRealtimeChatTranslation';

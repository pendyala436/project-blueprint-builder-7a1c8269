/**
 * LibreTranslate Browser-Based Translation System
 * =================================================
 * 
 * Main entry point for browser-based translation inspired by LibreTranslate.
 * 
 * COMPLETE BROWSER-BASED SOLUTION:
 * - No external API calls (uses only Supabase edge function)
 * - No NLLB-200 or heavy ML models
 * - Uses English as pivot language for cross-language translation
 * - Supports all languages from languages.ts
 * - Works with 3 typing modes and 9 combinations
 * 
 * Inspired by: https://github.com/LibreTranslate/LibreTranslate
 * 
 * @example
 * ```tsx
 * import { translate, processChatMessage, getInstantPreview } from '@/lib/libre-translate';
 * 
 * // Basic translation
 * const result = await translate('Hello', 'english', 'hindi');
 * console.log(result.text); // "नमस्ते"
 * 
 * // Chat message processing (handles all 9 combinations)
 * const chatResult = await processChatMessage('hello', {
 *   senderLanguage: 'english',
 *   receiverLanguage: 'hindi',
 *   typingMode: 'native',
 * });
 * 
 * // Instant preview (synchronous, for typing)
 * const preview = getInstantPreview('namaste', 'hindi'); // "नमस्ते"
 * ```
 */

// ============================================================
// TYPE EXPORTS
// ============================================================

export type {
  LanguageInfo,
  ScriptDetection,
  TranslationResult,
  TypingMode,
  TranslationMode,
  TranslationCombination,
  ChatMessageViews,
  ChatProcessingOptions,
  BidirectionalResult,
  CacheEntry,
  TranslatorConfig,
} from './types';

export { DEFAULT_CONFIG } from './types';

// ============================================================
// TRANSLATION ENGINE
// ============================================================

export {
  // Core translation
  translate,
  translateBidirectional,
  
  // Chat message processing
  processChatMessage,
  processOutgoing,
  processIncoming,
  
  // Live preview
  getInstantPreview,
  getLivePreview,
  
  // Transliteration
  transliterateToNative,
  reverseTransliterate,
  
  // Cache management
  clearCache,
  getCacheStats,
  
  // Language utilities
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  getLanguageCode,
  detectScript,
} from './engine';

// ============================================================
// LANGUAGE DATA
// ============================================================

export {
  ALL_LANGUAGES,
  getLanguages,
  getLanguageCount,
  getLanguageInfo,
  isLanguageSupported,
  getNativeName,
  needsScriptConversion,
  getScriptForLanguage,
} from './language-data';

// ============================================================
// TRANSLITERATOR
// ============================================================

export {
  hasTransliteration,
} from './transliterator';

// ============================================================
// REACT HOOK
// ============================================================

export { useLibreTranslate } from './useLibreTranslate';
export { useLibreTranslate as default } from './useLibreTranslate';

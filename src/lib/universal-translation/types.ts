/**
 * Universal Translation System - Type Definitions
 * ================================================
 * 
 * Local-only, offline translation system based on LibreTranslate principles.
 * NO external APIs, NO NLLB-200, NO hardcoded language names.
 * All logic is dynamic and data-driven from languages.ts.
 * 
 * @see https://github.com/LibreTranslate/LibreTranslate
 */

import type { Language } from '@/data/languages';

// ============================================================
// CORE TYPES
// ============================================================

/**
 * User profile language information
 * Derived from profile's mother tongue setting
 */
export interface UserLanguageProfile {
  userId: string;
  motherTongue: string;
  nativeScript: string;
  latinEquivalent: string | null;
  isLatinScript: boolean;
  isRTL: boolean;
}

/**
 * Translation direction determines the translation path
 */
export type TranslationDirection =
  | 'native-to-latin'       // Native → English → Latin
  | 'latin-to-native'       // Latin → English → Native
  | 'native-to-native'      // Native → English → Target Native
  | 'latin-to-latin'        // Direct (no English bridge)
  | 'english-source'        // Direct (English is source)
  | 'english-target'        // Direct (English is target)
  | 'passthrough';          // Same language, no translation

/**
 * Translation result with full metadata
 */
export interface TranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  direction: TranslationDirection;
  englishPivot?: string;
  isTranslated: boolean;
  isTransliterated: boolean;
  confidence: number;
  method: TranslationMethod;
}

/**
 * Method used for translation
 */
export type TranslationMethod =
  | 'passthrough'       // No translation needed
  | 'phrase-lookup'     // Common phrases table
  | 'dictionary'        // Semantic dictionary
  | 'word-by-word'      // Word-level translation
  | 'transliteration'   // Script conversion only
  | 'english-pivot'     // Via English intermediary
  | 'direct'            // Direct translation
  | 'cached';           // From cache

/**
 * Bidirectional chat translation result
 * Both sender and receiver see messages in their native scripts
 */
export interface BidirectionalChatResult {
  originalText: string;
  senderView: string;
  receiverView: string;
  englishCore: string;
  direction: TranslationDirection;
  wasTranslated: boolean;
  wasTransliterated: boolean;
  confidence: number;
}

/**
 * Script detection result
 */
export interface ScriptDetection {
  script: string;
  language: string;
  isLatin: boolean;
  confidence: number;
}

/**
 * Cache entry with timestamp for TTL
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Translation engine configuration
 */
export interface TranslationConfig {
  cacheTTL: number;
  maxCacheSize: number;
  debug: boolean;
}

/**
 * Common phrase entry from database
 */
export interface CommonPhraseEntry {
  phrase_key: string;
  english: string;
  [languageColumn: string]: string | null | number | undefined;
}

/**
 * Language info derived from languages.ts
 */
export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  rtl: boolean;
}

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

export const DEFAULT_CONFIG: TranslationConfig = {
  cacheTTL: 60000,      // 1 minute
  maxCacheSize: 5000,
  debug: false,
};

// ============================================================
// TRANSLATION RULES
// ============================================================

/**
 * Translation rules based on script types
 * 
 * 1. Native → Latin: Translate Native → English → Latin
 * 2. Latin → Native: Translate Latin → English → Native
 * 3. Native → Native (different): Translate Native → English → Target Native
 * 4. Latin → Latin: Translate directly (no English bridge)
 * 5. English as source/target: Translate directly (no middle language)
 */
export const TRANSLATION_RULES = {
  /**
   * English is ALWAYS the bidirectional bridge language, EXCEPT when:
   * - Both languages are Latin-based
   * - English is already the source or target
   */
  useEnglishPivot: (
    sourceIsLatin: boolean,
    targetIsLatin: boolean,
    sourceIsEnglish: boolean,
    targetIsEnglish: boolean
  ): boolean => {
    // No pivot if English is involved
    if (sourceIsEnglish || targetIsEnglish) return false;
    // No pivot if both are Latin-based
    if (sourceIsLatin && targetIsLatin) return false;
    // Use pivot for all other cases
    return true;
  },

  /**
   * Determine translation direction based on script types
   */
  determineDirection: (
    sourceIsLatin: boolean,
    targetIsLatin: boolean,
    sourceIsEnglish: boolean,
    targetIsEnglish: boolean,
    isSameLanguage: boolean
  ): TranslationDirection => {
    if (isSameLanguage) return 'passthrough';
    if (sourceIsEnglish) return 'english-source';
    if (targetIsEnglish) return 'english-target';
    if (sourceIsLatin && targetIsLatin) return 'latin-to-latin';
    if (sourceIsLatin && !targetIsLatin) return 'latin-to-native';
    if (!sourceIsLatin && targetIsLatin) return 'native-to-latin';
    return 'native-to-native';
  },
} as const;

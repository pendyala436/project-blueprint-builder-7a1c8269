/**
 * LibreTranslate Browser-Based Types
 * ===================================
 * 
 * Complete type definitions for browser-based translation system
 * Inspired by: https://github.com/LibreTranslate/LibreTranslate
 * 
 * Features:
 * - No external API calls
 * - No NLLB-200 or heavy ML models
 * - English as pivot language for cross-language translation
 * - Supports 3 typing modes and 9 combinations
 * - All languages from languages.ts
 */

// Language information structure
export interface LanguageInfo {
  name: string;
  code: string;
  native: string;
  script: string;
  rtl?: boolean;
}

// Script detection result
export interface ScriptDetection {
  script: string;
  language: string;
  isLatin: boolean;
  confidence: number;
}

// Translation result
export interface TranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  wasTransliterated: boolean;
  englishPivot?: string;
  confidence: number;
  mode: TranslationMode;
}

// Single typing mode: English to Native (meaning-based translation)
export type TypingMode = 'english-meaning';

// Translation mode indicates how translation was performed
export type TranslationMode = 
  | 'passthrough'        // Same language, no translation needed
  | 'direct'             // Direct translation (English involved)
  | 'pivot'              // English pivot for non-English pairs
  | 'transliterate'      // Latin to native script conversion
  | 'reverse-transliterate'; // Native to Latin conversion

// 9 Combinations for chat translation
export type TranslationCombination = 
  | 'same-native-native'      // Same lang, native → native (passthrough)
  | 'same-latin-native'       // Same lang, latin → native (transliterate)
  | 'same-native-latin'       // Same lang, native → latin (reverse transliterate)
  | 'diff-native-native'      // Diff lang, native → native (English pivot)
  | 'diff-latin-native'       // Diff lang, latin → native (transliterate + pivot)
  | 'diff-native-latin'       // Diff lang, native → latin (pivot + reverse)
  | 'english-to-any'          // English → any (direct)
  | 'any-to-english'          // Any → English (direct)
  | 'latin-to-latin';         // Latin → Latin (direct)

// Chat message with views for sender and receiver
export interface ChatMessageViews {
  originalText: string;
  senderView: string;
  receiverView: string;
  englishPivot?: string;
  senderNative?: string;
  receiverNative?: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
  combination: TranslationCombination;
  typingMode: TypingMode;
}

// Processing options for chat messages
export interface ChatProcessingOptions {
  senderLanguage: string;
  receiverLanguage: string;
  typingMode: TypingMode;
  inputIsLatin?: boolean;
}

// Bidirectional translation result
export interface BidirectionalResult {
  forward: TranslationResult;
  backward: TranslationResult;
  englishPivot?: string;
}

// Translation cache entry
export interface CacheEntry {
  result: TranslationResult;
  timestamp: number;
}

// Translation engine configuration
export interface TranslatorConfig {
  cacheTTL: number;      // Cache time-to-live in ms
  maxCacheSize: number;  // Max cache entries
  debug: boolean;        // Enable debug logging
}

// Default configuration
export const DEFAULT_CONFIG: TranslatorConfig = {
  cacheTTL: 60000,       // 1 minute
  maxCacheSize: 2000,    // 2000 entries
  debug: false,
};

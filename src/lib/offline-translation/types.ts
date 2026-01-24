/**
 * Offline Translation System - Core Types
 * ========================================
 * 
 * Type definitions for the LibreTranslate-inspired offline translation engine.
 * All language handling is dynamic - NO hardcoded language names.
 */

// User profile language information
export interface UserLanguageProfile {
  userId: string;
  gender: 'male' | 'female';
  motherTongue: string;
  scriptType: 'native' | 'latin';
  preferredScript?: string;
}

// Translation direction enum
export type TranslationDirection =
  | 'native-to-latin'      // Native → English → Latin
  | 'latin-to-native'      // Latin → English → Native
  | 'native-to-native'     // Native → English → Target Native
  | 'latin-to-latin'       // Direct (no English bridge)
  | 'english-source'       // English → Target (direct)
  | 'english-target'       // Source → English (direct)
  | 'passthrough';         // Same language, no translation

// Translation method used
export type TranslationMethod =
  | 'phrase-lookup'        // Found in common_phrases table
  | 'word-by-word'         // Individual word translation
  | 'english-pivot'        // Used English as bridge
  | 'transliteration'      // Script conversion only
  | 'passthrough'          // No translation needed
  | 'cached'               // Retrieved from cache
  | 'direct';              // Direct translation

// Single translation result
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

// Chat message with bidirectional views
export interface ChatMessageViews {
  originalText: string;           // Raw input as typed
  senderView: string;             // What sender sees (their native script)
  receiverView: string;           // What receiver sees (their native script)
  englishCore: string;            // English meaning (for pivot and display)
  senderLanguage: string;         // Sender's mother tongue
  receiverLanguage: string;       // Receiver's mother tongue
  direction: TranslationDirection;
  wasTranslated: boolean;
  wasTransliterated: boolean;
  confidence: number;
}

// Bidirectional chat result for profile-based translation
export interface ProfileChatResult {
  senderMessage: ChatMessageViews;
  timestamp: string;
  senderProfile: UserLanguageProfile;
  receiverProfile: UserLanguageProfile;
}

// Language metadata from languages.ts
export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  rtl: boolean;
}

// Script detection result
export interface ScriptDetection {
  script: string;
  language: string;
  isLatin: boolean;
  confidence: number;
}

// Cache entry structure
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Common phrase from database
export interface CommonPhraseEntry {
  id?: string;
  phrase_key: string;
  english: string;
  category?: string | null;
  usage_count?: number | null;
  created_at?: string;
  updated_at?: string;
  hindi?: string | null;
  bengali?: string | null;
  telugu?: string | null;
  tamil?: string | null;
  kannada?: string | null;
  malayalam?: string | null;
  marathi?: string | null;
  gujarati?: string | null;
  punjabi?: string | null;
  odia?: string | null;
  urdu?: string | null;
  arabic?: string | null;
  spanish?: string | null;
  french?: string | null;
  portuguese?: string | null;
  russian?: string | null;
  japanese?: string | null;
  korean?: string | null;
  chinese?: string | null;
  thai?: string | null;
  vietnamese?: string | null;
  indonesian?: string | null;
  turkish?: string | null;
  persian?: string | null;
  [key: string]: string | number | null | undefined;
}

// Translation engine configuration
export interface TranslationEngineConfig {
  maxCacheSize: number;
  cacheTTL: number;
  phraseLimit: number;
  enableLogging: boolean;
}

// Translation rules - determines when to use English pivot
export const TRANSLATION_RULES = {
  /**
   * Determine the translation direction based on script types
   * 
   * Rules:
   * 1. Same language → passthrough
   * 2. English source → english-source (direct)
   * 3. English target → english-target (direct)
   * 4. Latin-to-Latin → latin-to-latin (direct)
   * 5. Latin-to-Native → latin-to-native (via English)
   * 6. Native-to-Latin → native-to-latin (via English)
   * 7. Native-to-Native → native-to-native (via English)
   */
  determineDirection(
    sourceIsLatin: boolean,
    targetIsLatin: boolean,
    sourceIsEnglish: boolean,
    targetIsEnglish: boolean,
    isSameLanguage: boolean
  ): TranslationDirection {
    // Same language - no translation needed
    if (isSameLanguage) return 'passthrough';
    
    // English as source - direct translation
    if (sourceIsEnglish) return 'english-source';
    
    // English as target - direct translation
    if (targetIsEnglish) return 'english-target';
    
    // Both Latin scripts - direct translation (no English bridge)
    if (sourceIsLatin && targetIsLatin) return 'latin-to-latin';
    
    // Latin to Native - use English pivot
    if (sourceIsLatin && !targetIsLatin) return 'latin-to-native';
    
    // Native to Latin - use English pivot
    if (!sourceIsLatin && targetIsLatin) return 'native-to-latin';
    
    // Native to Native - use English pivot
    return 'native-to-native';
  },
  
  /**
   * Check if English bridge should be used
   */
  needsEnglishBridge(direction: TranslationDirection): boolean {
    return [
      'native-to-latin',
      'latin-to-native',
      'native-to-native'
    ].includes(direction);
  }
};

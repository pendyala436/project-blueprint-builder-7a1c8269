/**
 * Offline Translation Types
 * =========================
 * 
 * Type definitions for the offline translation system.
 * Compatible with LibreTranslate-inspired engine.
 */

// User language profile
export interface UserLanguageProfile {
  userId: string;
  gender: 'male' | 'female';
  motherTongue: string;
  scriptType?: 'native' | 'latin';
}

// Language info for database
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

// Translation engine config
export interface TranslationEngineConfig {
  enableCache?: boolean;
  maxCacheSize?: number;
  cacheTTL?: number;
  autoInitialize?: boolean;
}

// Translation method types
export type TranslationMethod = 
  | 'passthrough' 
  | 'semantic' 
  | 'script-conversion' 
  | 'english-pivot' 
  | 'cached' 
  | 'phrase-lookup' 
  | 'word-by-word' 
  | 'direct' 
  | 'transliteration';

// Translation result type - compatible with LibreTranslate engine
export interface TranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  englishMeaning?: string;
  englishPivot?: string;
  isTranslated: boolean;
  isTransliterated?: boolean;
  confidence: number;
  method: TranslationMethod;
  direction?: TranslationDirection;
}

// Chat message views for bidirectional chat
export interface ChatMessageViews {
  id?: string;
  originalText?: string;
  originalInput?: string;
  englishMeaning?: string;
  englishCore?: string;
  senderView: string;
  receiverView: string;
  senderLanguage?: string;
  receiverLanguage?: string;
  confidence?: number;
  wasTranslated?: boolean;
  wasTransliterated?: boolean;
  direction?: TranslationDirection;
}

// Live preview result
export interface LivePreview {
  nativeScript: string;
  englishMeaning: string;
  receiverPreview: string;
  confidence: number;
}

// Cache entry for internal use
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Legacy phrase entry type (kept for compatibility but not used)
export interface CommonPhraseEntry {
  id?: string;
  phrase_key: string;
  english: string;
  [key: string]: string | undefined;
}

// Translation direction enum
export type TranslationDirection = 
  | 'passthrough'
  | 'english-source'
  | 'english-target'
  | 'latin-to-latin'
  | 'latin-to-native'
  | 'native-to-latin'
  | 'native-to-native';

// Legacy TRANSLATION_RULES for backward compatibility
export const TRANSLATION_RULES = {
  determineDirection(
    sourceIsLatin: boolean,
    targetIsLatin: boolean,
    sourceIsEnglish: boolean,
    targetIsEnglish: boolean,
    sameLang: boolean
  ): TranslationDirection {
    if (sameLang) return 'passthrough';
    if (sourceIsEnglish) return 'english-source';
    if (targetIsEnglish) return 'english-target';
    if (sourceIsLatin && targetIsLatin) return 'latin-to-latin';
    if (sourceIsLatin && !targetIsLatin) return 'latin-to-native';
    if (!sourceIsLatin && targetIsLatin) return 'native-to-latin';
    return 'native-to-native';
  }
};

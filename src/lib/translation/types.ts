/**
 * DL-Translate TypeScript Translation Types
 * Server-side translation via Edge Function
 * Based on: https://github.com/xhluca/dl-translate
 */

// Language code type (flexible string for 200+ languages)
export type LanguageCode = string;

// Translation result
export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  mode: 'translate' | 'convert' | 'same_language';
}

// Language detection result
export interface LanguageDetectionResult {
  language: string;
  isLatin: boolean;
  confidence: number;
  isPhonetic?: boolean; // True if Latin text detected as phonetic Indian language input
}

// Translation options
export interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  mode?: 'auto' | 'translate' | 'convert';
}

// Batch translation item
export interface BatchTranslationItem {
  text: string;
  options: TranslationOptions;
}

// Batch translation result
export interface BatchTranslationResult {
  results: TranslationResult[];
  successCount: number;
  failureCount: number;
}

// Translator configuration
export interface TranslatorConfig {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  maxRetries?: number;
  timeout?: number;
}

// Script detection pattern
export interface ScriptPattern {
  regex: RegExp;
  language: string;
  script: string;
}

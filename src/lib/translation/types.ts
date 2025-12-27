/**
 * DL-Translate inspired TypeScript Translation Types
 * Based on: https://github.com/xhluca/dl-translate
 * Uses NLLB-200 model via Hugging Face Inference API
 */

// Supported language codes (NLLB-200 format)
export type NLLBLanguageCode = string;

// Translation result
export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceCode: NLLBLanguageCode;
  targetCode: NLLBLanguageCode;
  isTranslated: boolean;
  model: 'nllb-200' | 'm2m-100';
  mode: 'translate' | 'convert' | 'same_language';
}

// Language detection result
export interface LanguageDetectionResult {
  language: string;
  nllbCode: NLLBLanguageCode;
  isLatin: boolean;
  confidence: number;
}

// Translation options
export interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  mode?: 'auto' | 'translate' | 'convert';
  maxLength?: number;
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
  model?: 'nllb-200' | 'm2m-100';
  cacheEnabled?: boolean;
  cacheTTL?: number;
  maxRetries?: number;
  timeout?: number;
}

// Script detection pattern
export interface ScriptPattern {
  regex: RegExp;
  language: string;
  nllbCode: NLLBLanguageCode;
  script: string;
}

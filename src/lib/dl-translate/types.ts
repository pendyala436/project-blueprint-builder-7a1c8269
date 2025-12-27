/**
 * DL-Translate TypeScript Types
 * Simplified version without client-side model
 */

// Language code type
export type LanguageCode = string;

// Translation result
export interface TranslationResult {
  text: string;
  source: string;
  target: string;
  isTranslated: boolean;
}

// Language info
export interface LanguageInfo {
  name: string;
  code: string;
}

// Translator configuration
export interface TranslatorConfig {
  cacheEnabled?: boolean;
  apiEndpoint?: string;
}

// Script detection result
export interface ScriptDetectionResult {
  script: string;
  language: string;
  confidence: number;
}

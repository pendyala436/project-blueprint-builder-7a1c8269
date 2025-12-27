/**
 * DL-Translate TypeScript Types
 */

// Translation result
export interface TranslationResult {
  text: string;
  originalText: string;
  source: string;
  target: string;
  isTranslated: boolean;
  detectedLanguage?: string;
}

// Language info
export interface LanguageInfo {
  name: string;
  code: string;
  native?: string;
}

// Chat translation options
export interface ChatTranslationOptions {
  senderLanguage: string;
  receiverLanguage: string;
}

// Script detection result
export interface ScriptDetectionResult {
  script: string;
  language: string;
  isLatin: boolean;
  confidence: number;
}

/**
 * DL-Translate TypeScript Types
 * Inspired by: https://github.com/xhluca/dl-translate
 * 
 * TypeScript port of the dl-translate Python library
 * Uses NLLB-200 model via @huggingface/transformers for browser-based translation
 */

// NLLB-200 Language Code (e.g., "eng_Latn", "hin_Deva")
export type NLLBCode = string;

// Supported model types
export type ModelType = 'nllb-200-distilled-600M' | 'nllb-200-distilled-1.3B' | 'm2m100_418M';

// Translation result
export interface TranslationResult {
  text: string;
  source: string;
  target: string;
  sourceCode: NLLBCode;
  targetCode: NLLBCode;
  isTranslated: boolean;
}

// Language info
export interface LanguageInfo {
  name: string;
  code: NLLBCode;
  script: string;
}

// Translator configuration
export interface TranslatorConfig {
  modelName?: ModelType;
  device?: 'webgpu' | 'wasm' | 'cpu';
  cacheEnabled?: boolean;
  onProgress?: (progress: number) => void;
}

// Script detection result
export interface ScriptDetectionResult {
  script: string;
  language: string;
  code: NLLBCode;
  confidence: number;
}

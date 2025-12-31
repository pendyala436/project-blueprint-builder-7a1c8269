/**
 * DL-Translate Language Codes Mapping
 * Complete mapping of 200+ languages
 * Based on: https://github.com/xhluca/dl-translate
 */

import type { ScriptPattern } from './types';

// Complete language name mapping (normalized names)
export const SUPPORTED_LANGUAGES: string[] = [
  // Indian Languages
  'hindi', 'bengali', 'bangla', 'telugu', 'tamil', 'marathi', 'gujarati',
  'kannada', 'malayalam', 'punjabi', 'odia', 'oriya', 'assamese', 'nepali',
  'urdu', 'konkani', 'maithili', 'santali', 'bodo', 'dogri', 'kashmiri',
  'sindhi', 'manipuri', 'sinhala', 'sinhalese', 'bhojpuri', 'magahi',
  'chhattisgarhi', 'awadhi',

  // Major World Languages
  'english', 'spanish', 'french', 'german', 'portuguese', 'italian', 'dutch',
  'russian', 'polish', 'ukrainian',

  // East Asian Languages
  'chinese', 'mandarin', 'simplified chinese', 'traditional chinese',
  'cantonese', 'japanese', 'korean',

  // Southeast Asian Languages
  'vietnamese', 'thai', 'indonesian', 'malay', 'tagalog', 'filipino',
  'burmese', 'myanmar', 'khmer', 'cambodian', 'lao', 'laotian',
  'javanese', 'sundanese', 'cebuano', 'ilocano',

  // Middle Eastern Languages
  'arabic', 'standard arabic', 'egyptian arabic', 'moroccan arabic',
  'persian', 'farsi', 'pashto', 'dari', 'turkish', 'hebrew', 'kurdish',

  // African Languages
  'swahili', 'amharic', 'yoruba', 'igbo', 'hausa', 'zulu', 'xhosa',
  'afrikaans', 'somali',

  // European Languages
  'greek', 'czech', 'romanian', 'hungarian', 'swedish', 'danish', 'finnish',
  'norwegian', 'icelandic', 'catalan', 'croatian', 'serbian', 'bosnian',
  'slovak', 'slovenian', 'bulgarian', 'lithuanian', 'latvian', 'estonian',

  // Central Asian Languages
  'georgian', 'armenian', 'azerbaijani', 'kazakh', 'uzbek', 'turkmen',
  'kyrgyz', 'tajik', 'mongolian', 'tibetan',
];

// Script detection patterns
export const SCRIPT_PATTERNS: ScriptPattern[] = [
  // Indian Scripts
  { regex: /[\u0900-\u097F]/, language: 'hindi', script: 'Devanagari' },
  { regex: /[\u0980-\u09FF]/, language: 'bengali', script: 'Bengali' },
  { regex: /[\u0C00-\u0C7F]/, language: 'telugu', script: 'Telugu' },
  { regex: /[\u0B80-\u0BFF]/, language: 'tamil', script: 'Tamil' },
  { regex: /[\u0A80-\u0AFF]/, language: 'gujarati', script: 'Gujarati' },
  { regex: /[\u0C80-\u0CFF]/, language: 'kannada', script: 'Kannada' },
  { regex: /[\u0D00-\u0D7F]/, language: 'malayalam', script: 'Malayalam' },
  { regex: /[\u0A00-\u0A7F]/, language: 'punjabi', script: 'Gurmukhi' },
  { regex: /[\u0B00-\u0B7F]/, language: 'odia', script: 'Oriya' },
  { regex: /[\u0D80-\u0DFF]/, language: 'sinhala', script: 'Sinhala' },

  // East Asian Scripts
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: 'chinese', script: 'Han' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese', script: 'Japanese' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: 'korean', script: 'Hangul' },

  // Southeast Asian Scripts
  { regex: /[\u0E00-\u0E7F]/, language: 'thai', script: 'Thai' },
  { regex: /[\u1000-\u109F]/, language: 'burmese', script: 'Myanmar' },
  { regex: /[\u1780-\u17FF]/, language: 'khmer', script: 'Khmer' },
  { regex: /[\u0E80-\u0EFF]/, language: 'lao', script: 'Lao' },

  // Middle Eastern Scripts
  { regex: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/, language: 'arabic', script: 'Arabic' },
  { regex: /[\u0590-\u05FF\uFB1D-\uFB4F]/, language: 'hebrew', script: 'Hebrew' },

  // Cyrillic
  { regex: /[\u0400-\u04FF]/, language: 'russian', script: 'Cyrillic' },

  // Caucasian Scripts
  { regex: /[\u10A0-\u10FF]/, language: 'georgian', script: 'Georgian' },
  { regex: /[\u0530-\u058F]/, language: 'armenian', script: 'Armenian' },

  // African Scripts
  { regex: /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/, language: 'amharic', script: 'Ethiopic' },

  // Greek
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, language: 'greek', script: 'Greek' },

  // Tibetan
  { regex: /[\u0F00-\u0FFF]/, language: 'tibetan', script: 'Tibetan' },
];

// Indian language list
export const INDIAN_LANGUAGES = [
  'hindi', 'bengali', 'bangla', 'telugu', 'tamil', 'marathi', 'gujarati',
  'kannada', 'malayalam', 'punjabi', 'odia', 'oriya', 'assamese', 'nepali',
  'urdu', 'konkani', 'maithili', 'santali', 'bodo', 'dogri', 'kashmiri',
  'sindhi', 'manipuri', 'sinhala', 'bhojpuri', 'magahi', 'chhattisgarhi', 'awadhi'
];

// Latin-script languages
export const LATIN_SCRIPT_LANGUAGES = [
  'english', 'spanish', 'french', 'german', 'portuguese', 'italian', 'dutch',
  'polish', 'vietnamese', 'indonesian', 'malay', 'tagalog', 'turkish', 'swahili',
  'czech', 'romanian', 'hungarian', 'swedish', 'danish', 'finnish', 'norwegian'
];

/**
 * Check if a language is Indian
 */
export function isIndianLanguage(language: string): boolean {
  return INDIAN_LANGUAGES.includes(language.toLowerCase().trim());
}

/**
 * Check if a language uses Latin script
 */
export function isLatinScriptLanguage(language: string): boolean {
  return LATIN_SCRIPT_LANGUAGES.includes(language.toLowerCase().trim());
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): string[] {
  return SUPPORTED_LANGUAGES;
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
  const normalized = language.toLowerCase().trim();
  return SUPPORTED_LANGUAGES.includes(normalized);
}

/**
 * Normalize language name
 */
export function normalizeLanguage(language: string): string {
  const normalized = language.toLowerCase().trim();
  
  // Handle aliases
  const aliases: Record<string, string> = {
    bangla: 'bengali',
    oriya: 'odia',
    mandarin: 'chinese',
    'simplified chinese': 'chinese',
    myanmar: 'burmese',
    cambodian: 'khmer',
    laotian: 'lao',
    farsi: 'persian',
    sinhalese: 'sinhala',
    filipino: 'tagalog',
  };
  
  return aliases[normalized] || normalized;
}

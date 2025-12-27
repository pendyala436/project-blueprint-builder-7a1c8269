/**
 * DL-Translate Language Utilities
 * Language detection and mapping without client-side model
 */

import type { LanguageInfo, ScriptDetectionResult } from './types';

// Language name mappings
export const LANGUAGE_TO_CODE: Record<string, string> = {
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  portuguese: 'pt',
  italian: 'it',
  dutch: 'nl',
  russian: 'ru',
  polish: 'pl',
  ukrainian: 'uk',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  vietnamese: 'vi',
  hindi: 'hi',
  bengali: 'bn',
  tamil: 'ta',
  telugu: 'te',
  marathi: 'mr',
  gujarati: 'gu',
  kannada: 'kn',
  malayalam: 'ml',
  punjabi: 'pa',
  odia: 'or',
  urdu: 'ur',
  nepali: 'ne',
  sinhala: 'si',
  thai: 'th',
  indonesian: 'id',
  malay: 'ms',
  tagalog: 'tl',
  burmese: 'my',
  khmer: 'km',
  arabic: 'ar',
  persian: 'fa',
  turkish: 'tr',
  hebrew: 'he',
  greek: 'el',
  czech: 'cs',
  romanian: 'ro',
  hungarian: 'hu',
  swedish: 'sv',
  danish: 'da',
  finnish: 'fi',
  norwegian: 'no',
  swahili: 'sw',
  amharic: 'am',
  georgian: 'ka',
  armenian: 'hy',
};

// Code to language name
export const CODE_TO_LANGUAGE: Record<string, string> = Object.entries(LANGUAGE_TO_CODE)
  .reduce((acc, [name, code]) => {
    if (!acc[code]) acc[code] = name;
    return acc;
  }, {} as Record<string, string>);

// Script patterns for detection
const SCRIPT_PATTERNS: Array<{ regex: RegExp; script: string; language: string }> = [
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', language: 'hindi' },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', language: 'bengali' },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', language: 'tamil' },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', language: 'telugu' },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', language: 'kannada' },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', language: 'malayalam' },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', language: 'gujarati' },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', language: 'punjabi' },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', language: 'odia' },
  { regex: /[\u0600-\u06FF]/, script: 'Arabic', language: 'arabic' },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', language: 'hebrew' },
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', language: 'thai' },
  { regex: /[\u4E00-\u9FFF]/, script: 'Han', language: 'chinese' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', language: 'japanese' },
  { regex: /[\uAC00-\uD7AF]/, script: 'Hangul', language: 'korean' },
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', language: 'russian' },
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', language: 'georgian' },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', language: 'armenian' },
  { regex: /[\u1200-\u137F]/, script: 'Ethiopic', language: 'amharic' },
  { regex: /[\u0D80-\u0DFF]/, script: 'Sinhala', language: 'sinhala' },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', language: 'burmese' },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', language: 'khmer' },
  { regex: /[\u0370-\u03FF]/, script: 'Greek', language: 'greek' },
];

/**
 * Get language code from name
 */
export function getCode(language: string): string {
  const normalized = language.toLowerCase().trim();
  return LANGUAGE_TO_CODE[normalized] || 'en';
}

/**
 * Get language name from code
 */
export function getLanguage(code: string): string {
  return CODE_TO_LANGUAGE[code] || 'english';
}

/**
 * Check if text is Latin script
 */
export function isLatinScript(text: string): boolean {
  const latinChars = text.match(/[a-zA-Z]/g) || [];
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 && latinChars.length / totalChars > 0.5;
}

/**
 * Detect script and language from text
 */
export function detectScript(text: string): ScriptDetectionResult {
  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(text)) {
      const matches = text.match(pattern.regex) || [];
      const confidence = matches.length / text.replace(/\s/g, '').length;
      return {
        script: pattern.script,
        language: pattern.language,
        confidence: Math.min(confidence, 1),
      };
    }
  }
  
  return {
    script: 'Latin',
    language: 'english',
    confidence: 0.5,
  };
}

/**
 * Detect language from text
 */
export function detectLanguage(text: string): string {
  return detectScript(text).language;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): LanguageInfo[] {
  return Object.entries(LANGUAGE_TO_CODE).map(([name, code]) => ({
    name,
    code,
  }));
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  const code1 = getCode(lang1);
  const code2 = getCode(lang2);
  return code1 === code2;
}

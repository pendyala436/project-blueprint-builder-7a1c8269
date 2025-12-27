/**
 * DL-Translate Language Utilities
 * Auto-detection and mapping for 50+ languages
 */

import type { LanguageInfo, ScriptDetectionResult } from './types';

// Complete language mappings with native names
export const LANGUAGES: LanguageInfo[] = [
  { name: 'english', code: 'en', native: 'English' },
  { name: 'hindi', code: 'hi', native: 'हिंदी' },
  { name: 'bengali', code: 'bn', native: 'বাংলা' },
  { name: 'tamil', code: 'ta', native: 'தமிழ்' },
  { name: 'telugu', code: 'te', native: 'తెలుగు' },
  { name: 'marathi', code: 'mr', native: 'मराठी' },
  { name: 'gujarati', code: 'gu', native: 'ગુજરાતી' },
  { name: 'kannada', code: 'kn', native: 'ಕನ್ನಡ' },
  { name: 'malayalam', code: 'ml', native: 'മലയാളം' },
  { name: 'punjabi', code: 'pa', native: 'ਪੰਜਾਬੀ' },
  { name: 'odia', code: 'or', native: 'ଓଡ଼ିଆ' },
  { name: 'urdu', code: 'ur', native: 'اردو' },
  { name: 'nepali', code: 'ne', native: 'नेपाली' },
  { name: 'sinhala', code: 'si', native: 'සිංහල' },
  { name: 'spanish', code: 'es', native: 'Español' },
  { name: 'french', code: 'fr', native: 'Français' },
  { name: 'german', code: 'de', native: 'Deutsch' },
  { name: 'portuguese', code: 'pt', native: 'Português' },
  { name: 'italian', code: 'it', native: 'Italiano' },
  { name: 'dutch', code: 'nl', native: 'Nederlands' },
  { name: 'russian', code: 'ru', native: 'Русский' },
  { name: 'polish', code: 'pl', native: 'Polski' },
  { name: 'ukrainian', code: 'uk', native: 'Українська' },
  { name: 'chinese', code: 'zh', native: '中文' },
  { name: 'japanese', code: 'ja', native: '日本語' },
  { name: 'korean', code: 'ko', native: '한국어' },
  { name: 'vietnamese', code: 'vi', native: 'Tiếng Việt' },
  { name: 'thai', code: 'th', native: 'ไทย' },
  { name: 'indonesian', code: 'id', native: 'Bahasa Indonesia' },
  { name: 'malay', code: 'ms', native: 'Bahasa Melayu' },
  { name: 'tagalog', code: 'tl', native: 'Tagalog' },
  { name: 'burmese', code: 'my', native: 'မြန်မာ' },
  { name: 'khmer', code: 'km', native: 'ខ្មែរ' },
  { name: 'arabic', code: 'ar', native: 'العربية' },
  { name: 'persian', code: 'fa', native: 'فارسی' },
  { name: 'turkish', code: 'tr', native: 'Türkçe' },
  { name: 'hebrew', code: 'he', native: 'עברית' },
  { name: 'greek', code: 'el', native: 'Ελληνικά' },
  { name: 'czech', code: 'cs', native: 'Čeština' },
  { name: 'romanian', code: 'ro', native: 'Română' },
  { name: 'hungarian', code: 'hu', native: 'Magyar' },
  { name: 'swedish', code: 'sv', native: 'Svenska' },
  { name: 'danish', code: 'da', native: 'Dansk' },
  { name: 'finnish', code: 'fi', native: 'Suomi' },
  { name: 'norwegian', code: 'no', native: 'Norsk' },
  { name: 'swahili', code: 'sw', native: 'Kiswahili' },
  { name: 'amharic', code: 'am', native: 'አማርኛ' },
  { name: 'georgian', code: 'ka', native: 'ქართული' },
  { name: 'armenian', code: 'hy', native: 'Հայdelays' },
];

// Language name to code mapping
export const LANGUAGE_TO_CODE: Record<string, string> = LANGUAGES.reduce(
  (acc, lang) => ({ ...acc, [lang.name]: lang.code }),
  {}
);

// Code to language name
export const CODE_TO_LANGUAGE: Record<string, string> = LANGUAGES.reduce(
  (acc, lang) => ({ ...acc, [lang.code]: lang.name }),
  {}
);

// Script patterns for auto-detection
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

// Language aliases
const LANGUAGE_ALIASES: Record<string, string> = {
  bangla: 'bengali',
  oriya: 'odia',
  farsi: 'persian',
  mandarin: 'chinese',
  filipino: 'tagalog',
};

/**
 * Detect script and language from text (auto-detection)
 */
export function detectScript(text: string): ScriptDetectionResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { script: 'Latin', language: 'english', isLatin: true, confidence: 1 };
  }

  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      const matches = trimmed.match(pattern.regex) || [];
      const confidence = Math.min(matches.length / trimmed.replace(/\s/g, '').length, 1);
      return {
        script: pattern.script,
        language: pattern.language,
        isLatin: false,
        confidence,
      };
    }
  }

  // Check Latin script
  const latinChars = trimmed.match(/[a-zA-Z]/g) || [];
  const totalChars = trimmed.replace(/\s/g, '').length;
  const isLatin = totalChars > 0 && latinChars.length / totalChars > 0.5;

  return {
    script: 'Latin',
    language: 'english',
    isLatin,
    confidence: isLatin ? latinChars.length / totalChars : 0.5,
  };
}

/**
 * Auto-detect language from text
 */
export function detectLanguage(text: string): string {
  return detectScript(text).language;
}

/**
 * Check if text is Latin script
 */
export function isLatinScript(text: string): boolean {
  return detectScript(text).isLatin;
}

/**
 * Normalize language name
 */
export function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] || normalized;
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

/**
 * Get language code from name
 */
export function getCode(language: string): string {
  const normalized = normalizeLanguage(language);
  return LANGUAGE_TO_CODE[normalized] || 'en';
}

/**
 * Get language name from code
 */
export function getLanguage(code: string): string {
  return CODE_TO_LANGUAGE[code] || 'english';
}

/**
 * Get native name for a language
 */
export function getNativeName(language: string): string {
  const normalized = normalizeLanguage(language);
  const lang = LANGUAGES.find(l => l.name === normalized);
  return lang?.native || language;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): LanguageInfo[] {
  return [...LANGUAGES];
}

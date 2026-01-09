/**
 * DL-Translate Language Utilities
 * ================================
 * 386+ Language Support via Single Source of Truth
 * Uses @/data/languages.ts as the canonical language database
 * 
 * English Pivot Translation System:
 * - Source → English → Target (forward translation)
 * - Target → English → Source (reverse translation)
 * - 386 × 385 = 148,610 translation pairs
 */

import type { LanguageInfo, ScriptDetectionResult } from './types';
import { languages as allSourceLanguages, type Language } from '@/data/languages';

// Convert source language to LanguageInfo format
function convertToLanguageInfo(lang: Language): LanguageInfo {
  return {
    name: lang.name.toLowerCase().replace(/[()]/g, '').trim(),
    code: lang.code,
    native: lang.nativeName,
    script: lang.script || 'Latin',
    rtl: lang.rtl,
  };
}

// All 386+ languages from the main languages database (single source of truth)
export const LANGUAGES: LanguageInfo[] = allSourceLanguages.map(convertToLanguageInfo);

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

// Languages that use Latin script (no conversion needed when typing)
export const LATIN_SCRIPT_LANGUAGES = new Set(
  LANGUAGES.filter(l => l.script === 'Latin').map(l => l.name)
);

// Non-Latin script languages (need conversion from Latin typing)
export const NON_LATIN_LANGUAGES = new Set(
  LANGUAGES.filter(l => l.script !== 'Latin').map(l => l.name)
);

// Complete script patterns for auto-detection
const SCRIPT_PATTERNS: Array<{ regex: RegExp; script: string; language: string }> = [
  // South Asian scripts
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', language: 'hindi' },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', language: 'bengali' },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', language: 'tamil' },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', language: 'telugu' },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', language: 'kannada' },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', language: 'malayalam' },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', language: 'gujarati' },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', language: 'punjabi' },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', language: 'odia' },
  { regex: /[\u0D80-\u0DFF]/, script: 'Sinhala', language: 'sinhala' },
  { regex: /[\u0F00-\u0FFF]/, script: 'Tibetan', language: 'tibetan' },
  
  // East Asian scripts
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, script: 'Han', language: 'chinese mandarin' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', language: 'japanese' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, script: 'Hangul', language: 'korean' },
  
  // Southeast Asian scripts
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', language: 'thai' },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', language: 'lao' },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', language: 'burmese' },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', language: 'khmer' },
  { regex: /[\uA980-\uA9DF]/, script: 'Javanese', language: 'javanese' },
  { regex: /[\u1B00-\u1B7F]/, script: 'Balinese', language: 'balinese' },
  
  // Middle Eastern scripts
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, script: 'Arabic', language: 'arabic' },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', language: 'hebrew' },
  { regex: /[\u0700-\u074F]/, script: 'Syriac', language: 'syriac' },
  { regex: /[\u0780-\u07BF]/, script: 'Thaana', language: 'dhivehi' },
  
  // European scripts
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', language: 'russian' },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, script: 'Greek', language: 'greek' },
  
  // Caucasian scripts
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', language: 'georgian' },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', language: 'armenian' },
  
  // African scripts
  { regex: /[\u1200-\u137F\u1380-\u139F]/, script: 'Ethiopic', language: 'amharic' },
  { regex: /[\u2D30-\u2D7F]/, script: 'Tifinagh', language: 'berber' },
  { regex: /[\u07C0-\u07FF]/, script: 'Nko', language: 'bambara' },
  { regex: /[\uA6A0-\uA6FF]/, script: 'Bamum', language: 'bamum' },
  
  // Native American scripts
  { regex: /[\u1400-\u167F]/, script: 'Canadian_Aboriginal', language: 'inuktitut' },
  { regex: /[\u13A0-\u13FF]/, script: 'Cherokee', language: 'cherokee' },
  
  // Other scripts
  { regex: /[\u1800-\u18AF]/, script: 'Mongolian', language: 'mongolian' },
];

// Language aliases for normalization
const LANGUAGE_ALIASES: Record<string, string> = {
  bangla: 'bengali',
  oriya: 'odia',
  farsi: 'persian',
  mandarin: 'chinese mandarin',
  cantonese: 'cantonese',
  simplified_chinese: 'chinese mandarin',
  traditional_chinese: 'chinese mandarin',
  brazilian: 'portuguese',
  brazilian_portuguese: 'portuguese',
  mexican_spanish: 'spanish',
  castilian: 'spanish',
  flemish: 'dutch',
  burmese: 'burmese',
  myanmar: 'burmese',
  khmer: 'khmer',
  cambodian: 'khmer',
  tagalog: 'tagalog',
  pilipino: 'tagalog',
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

  // Check Latin script (includes extended Latin for European languages)
  const latinChars = trimmed.match(/[a-zA-ZÀ-ÿĀ-žƀ-ɏ]/g) || [];
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
 * Check if language uses Latin script
 */
export function isLatinScriptLanguage(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return LATIN_SCRIPT_LANGUAGES.has(normalized);
}

/**
 * Check if language uses non-Latin script (needs conversion)
 */
export function needsScriptConversion(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return NON_LATIN_LANGUAGES.has(normalized);
}

/**
 * Normalize language name
 */
export function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/[()]/g, '');
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
 * Get language info
 */
export function getLanguageInfo(language: string): LanguageInfo | undefined {
  const normalized = normalizeLanguage(language);
  return LANGUAGES.find(l => l.name === normalized || l.code === normalized);
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): LanguageInfo[] {
  return [...LANGUAGES];
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return LANGUAGES.some(l => l.name === normalized || l.code === normalized);
}

/**
 * Search languages by query
 */
export function searchLanguages(query: string): LanguageInfo[] {
  const q = query.toLowerCase().trim();
  return LANGUAGES.filter(l =>
    l.name.includes(q) ||
    l.code.includes(q) ||
    (l.native && l.native.toLowerCase().includes(q))
  );
}

/**
 * Get total language count
 */
export function getTotalLanguageCount(): number {
  return LANGUAGES.length;
}

// Log on module load
console.log(`[DL-Translate Languages] ✓ Loaded ${LANGUAGES.length} languages from single source of truth`);

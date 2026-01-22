/**
 * LibreTranslate Language Data
 * ============================
 * 
 * Unified language database from men_languages and women_languages
 * Provides all language utilities for browser-based translation
 */

import { menLanguages, type MenLanguage } from '@/data/men_languages';
import { womenLanguages, type WomenLanguage } from '@/data/women_languages';
import type { LanguageInfo, ScriptDetection } from './types';

// ============================================================
// UNIFIED LANGUAGE DATABASE
// ============================================================

const languageMap = new Map<string, LanguageInfo>();
const codeToLanguage = new Map<string, LanguageInfo>();
const nativeToLanguage = new Map<string, LanguageInfo>();

// Process men languages
menLanguages.forEach((lang: MenLanguage) => {
  const info: LanguageInfo = {
    name: lang.name.toLowerCase(),
    code: lang.code.toLowerCase(),
    native: lang.nativeName,
    script: lang.script || 'Latin',
    rtl: lang.rtl,
  };
  languageMap.set(info.name, info);
  codeToLanguage.set(info.code, info);
  if (info.native) {
    nativeToLanguage.set(info.native.toLowerCase(), info);
  }
});

// Process women languages (merge/add new)
womenLanguages.forEach((lang: WomenLanguage) => {
  const name = lang.name.toLowerCase();
  if (!languageMap.has(name)) {
    const info: LanguageInfo = {
      name,
      code: lang.code.toLowerCase(),
      native: lang.nativeName,
      script: lang.script || 'Latin',
      rtl: lang.rtl,
    };
    languageMap.set(info.name, info);
    codeToLanguage.set(info.code, info);
    if (info.native) {
      nativeToLanguage.set(info.native.toLowerCase(), info);
    }
  }
});

// Export all languages
export const ALL_LANGUAGES: LanguageInfo[] = Array.from(languageMap.values());

// ============================================================
// LANGUAGE ALIASES
// ============================================================

const ALIASES: Record<string, string> = {
  'bangla': 'bengali',
  'oriya': 'odia',
  'farsi': 'persian',
  'chinese': 'chinese (mandarin)',
  'mandarin': 'chinese (mandarin)',
  'hindustani': 'hindi',
  'filipino': 'tagalog',
  'panjabi': 'punjabi',
  'sinhalese': 'sinhala',
  'myanmar': 'burmese',
  'hangul': 'korean',
  'nihongo': 'japanese',
};

// ============================================================
// LATIN SCRIPT LANGUAGES
// ============================================================

const LATIN_SCRIPT_LANGUAGES = new Set(
  ALL_LANGUAGES
    .filter(l => l.script === 'Latin')
    .map(l => l.name)
);

// ============================================================
// SCRIPT DETECTION PATTERNS
// ============================================================

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
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, script: 'Han', language: 'chinese' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', language: 'japanese' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, script: 'Hangul', language: 'korean' },
  
  // Southeast Asian
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', language: 'thai' },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', language: 'lao' },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', language: 'burmese' },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', language: 'khmer' },
  
  // Middle Eastern
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, script: 'Arabic', language: 'arabic' },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', language: 'hebrew' },
  
  // European
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', language: 'russian' },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, script: 'Greek', language: 'greek' },
  
  // Caucasian
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', language: 'georgian' },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', language: 'armenian' },
  
  // African
  { regex: /[\u1200-\u137F\u1380-\u139F]/, script: 'Ethiopic', language: 'amharic' },
];

// ============================================================
// LANGUAGE UTILITIES
// ============================================================

/**
 * Normalize language name (handle aliases, case, etc.)
 */
export function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  
  // Check aliases first
  if (ALIASES[normalized]) {
    return ALIASES[normalized];
  }
  
  // Check if it's a known language name
  if (languageMap.has(normalized)) {
    return normalized;
  }
  
  // Check if it's a language code
  const byCode = codeToLanguage.get(normalized);
  if (byCode) {
    return byCode.name;
  }
  
  return normalized;
}

/**
 * Get language info by name or code
 */
export function getLanguageInfo(lang: string): LanguageInfo | null {
  const normalized = normalizeLanguage(lang);
  return languageMap.get(normalized) || codeToLanguage.get(lang.toLowerCase()) || null;
}

/**
 * Get language code from name
 */
export function getLanguageCode(lang: string): string {
  const info = getLanguageInfo(lang);
  return info?.code || lang.substring(0, 2).toLowerCase();
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return languageMap.has(normalized) || codeToLanguage.has(lang.toLowerCase());
}

/**
 * Check if language uses Latin script
 */
export function isLatinScriptLanguage(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return LATIN_SCRIPT_LANGUAGES.has(normalized);
}

/**
 * Check if text is primarily Latin script
 */
export function isLatinText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
  if (!cleaned) return true;
  const latinMatch = cleaned.match(/[\u0000-\u007F\u0080-\u00FF\u0100-\u024F]/g) || [];
  return latinMatch.length / cleaned.length > 0.7;
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

/**
 * Check if language is English
 */
export function isEnglish(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return normalized === 'english' || lang.toLowerCase() === 'en';
}

/**
 * Detect script and language from text
 */
export function detectScript(text: string): ScriptDetection {
  // Check for non-Latin scripts first
  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(text)) {
      const matches = text.match(pattern.regex) || [];
      const cleaned = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
      const confidence = cleaned.length > 0 ? matches.length / cleaned.length : 0;
      
      return {
        script: pattern.script,
        language: pattern.language,
        isLatin: false,
        confidence: Math.min(confidence, 1),
      };
    }
  }
  
  // Default to Latin
  return {
    script: 'Latin',
    language: 'english',
    isLatin: true,
    confidence: 0.5,
  };
}

/**
 * Get all supported languages
 */
export function getLanguages(): LanguageInfo[] {
  return [...ALL_LANGUAGES];
}

/**
 * Get language count
 */
export function getLanguageCount(): number {
  return ALL_LANGUAGES.length;
}

/**
 * Get native name for a language
 */
export function getNativeName(lang: string): string {
  const info = getLanguageInfo(lang);
  return info?.native || lang;
}

/**
 * Check if language needs script conversion (non-Latin)
 */
export function needsScriptConversion(lang: string): boolean {
  return !isLatinScriptLanguage(lang);
}

/**
 * Get script for a language
 */
export function getScriptForLanguage(lang: string): string {
  const info = getLanguageInfo(lang);
  return info?.script || 'Latin';
}

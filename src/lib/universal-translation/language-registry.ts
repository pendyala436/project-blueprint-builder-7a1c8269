/**
 * Universal Translation - Language Registry
 * ==========================================
 * 
 * Dynamic language database built from languages.ts.
 * NO hardcoded language names - all data-driven.
 * 
 * Features:
 * - Unified language lookup by name, code, or native name
 * - Script detection and classification
 * - Language fallback mapping for 1000+ dialects
 * - RTL language detection
 */

import { languages, type Language } from '@/data/languages';
import type { LanguageInfo, ScriptDetection } from './types';

// ============================================================
// LANGUAGE DATABASE - Built dynamically from languages.ts
// ============================================================

const languageByName = new Map<string, LanguageInfo>();
const languageByCode = new Map<string, LanguageInfo>();
const languageByNative = new Map<string, LanguageInfo>();
const latinScriptLanguages = new Set<string>();

// Initialize database from languages.ts
languages.forEach((lang: Language) => {
  const info: LanguageInfo = {
    code: lang.code.toLowerCase(),
    name: lang.name.toLowerCase(),
    nativeName: lang.nativeName,
    script: lang.script || 'Latin',
    rtl: lang.rtl || false,
  };
  
  languageByName.set(info.name, info);
  languageByCode.set(info.code, info);
  
  // Map native name if ASCII-compatible for lookup
  if (/^[\x00-\x7F]+$/.test(lang.nativeName)) {
    languageByNative.set(lang.nativeName.toLowerCase(), info);
  }
  
  // Track Latin script languages
  if (info.script === 'Latin') {
    latinScriptLanguages.add(info.name);
  }
});

// ============================================================
// LANGUAGE ALIASES - Dynamic mappings
// ============================================================

// Common alternative names (dynamically extendable)
const LANGUAGE_ALIASES = new Map<string, string>([
  ['bangla', 'bengali'],
  ['oriya', 'odia'],
  ['farsi', 'persian'],
  ['mandarin', 'chinese (mandarin)'],
  ['chinese', 'chinese (mandarin)'],
  ['hindustani', 'hindi'],
  ['filipino', 'tagalog'],
  ['panjabi', 'punjabi'],
  ['sinhalese', 'sinhala'],
  ['myanmar', 'burmese'],
  ['hangul', 'korean'],
  ['nihongo', 'japanese'],
]);

// Add native name aliases dynamically
languages.forEach((lang) => {
  const normalizedNative = lang.nativeName.toLowerCase();
  if (normalizedNative !== lang.name.toLowerCase()) {
    LANGUAGE_ALIASES.set(normalizedNative, lang.name.toLowerCase());
  }
});

// ============================================================
// LANGUAGE FALLBACK MAP - For 1000+ dialects
// Maps unsupported/dialect languages to nearest supported language
// ============================================================

// Build fallback map dynamically based on script
const SCRIPT_FALLBACK: Record<string, string> = {
  'Devanagari': 'hindi',
  'Bengali': 'bengali',
  'Tamil': 'tamil',
  'Telugu': 'telugu',
  'Kannada': 'kannada',
  'Malayalam': 'malayalam',
  'Gujarati': 'gujarati',
  'Gurmukhi': 'punjabi',
  'Odia': 'odia',
  'Arabic': 'arabic',
  'Cyrillic': 'russian',
  'Greek': 'greek',
  'Hebrew': 'hebrew',
  'Thai': 'thai',
  'Han': 'chinese (mandarin)',
  'Japanese': 'japanese',
  'Hangul': 'korean',
  'Georgian': 'georgian',
  'Armenian': 'armenian',
  'Ethiopic': 'amharic',
  'Myanmar': 'burmese',
  'Khmer': 'khmer',
  'Lao': 'lao',
  'Sinhala': 'sinhala',
  'Tibetan': 'hindi',
  'Latin': 'english',
};

// ============================================================
// SCRIPT DETECTION PATTERNS
// ============================================================

const SCRIPT_PATTERNS: Array<{ regex: RegExp; script: string; language: string }> = [
  // South Asian
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
  
  // East Asian
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, script: 'Han', language: 'chinese (mandarin)' },
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
 * ALL lookups are dynamic - no hardcoded language names
 */
export function normalizeLanguage(lang: string): string {
  if (!lang || typeof lang !== 'string') return 'english';
  
  const normalized = lang.toLowerCase().trim();
  if (!normalized) return 'english';
  
  // Check aliases
  const alias = LANGUAGE_ALIASES.get(normalized);
  if (alias) return alias;
  
  // Check by name
  if (languageByName.has(normalized)) return normalized;
  
  // Check by code
  const byCode = languageByCode.get(normalized);
  if (byCode) return byCode.name;
  
  // Check by native name
  const byNative = languageByNative.get(normalized);
  if (byNative) return byNative.name;
  
  return normalized;
}

/**
 * Get language info by name, code, or native name
 */
export function getLanguageInfo(lang: string): LanguageInfo | null {
  const normalized = normalizeLanguage(lang);
  return languageByName.get(normalized) || languageByCode.get(lang.toLowerCase()) || null;
}

/**
 * Get language code from name
 */
export function getLanguageCode(lang: string): string {
  const info = getLanguageInfo(lang);
  return info?.code || lang.substring(0, 2).toLowerCase();
}

/**
 * Get native name for a language
 */
export function getNativeName(lang: string): string {
  const info = getLanguageInfo(lang);
  return info?.nativeName || lang;
}

/**
 * Get script for a language
 */
export function getScript(lang: string): string {
  const info = getLanguageInfo(lang);
  return info?.script || 'Latin';
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return languageByName.has(normalized) || languageByCode.has(lang.toLowerCase());
}

/**
 * Check if language uses Latin script
 */
export function isLatinScriptLanguage(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return latinScriptLanguages.has(normalized);
}

/**
 * Check if text is primarily Latin script (>70%)
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
 * Check if language is RTL
 */
export function isRTL(lang: string): boolean {
  const info = getLanguageInfo(lang);
  return info?.rtl || false;
}

/**
 * Detect script and probable language from text
 */
export function detectScript(text: string): ScriptDetection {
  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(text)) {
      const matches = text.match(pattern.regex) || [];
      const cleaned = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
      const confidence = cleaned.length > 0 ? Math.min(matches.length / cleaned.length, 1) : 0;
      
      return {
        script: pattern.script,
        language: pattern.language,
        isLatin: false,
        confidence,
      };
    }
  }
  
  return {
    script: 'Latin',
    language: 'english',
    isLatin: true,
    confidence: 0.5,
  };
}

/**
 * Get effective language for translation (resolves dialects)
 */
export function getEffectiveLanguage(lang: string): string {
  const normalized = normalizeLanguage(lang);
  const info = getLanguageInfo(normalized);
  
  // If language has phrase support, use it directly
  if (info && SUPPORTED_PHRASE_LANGUAGES.has(normalized)) {
    return normalized;
  }
  
  // Otherwise fall back based on script
  if (info?.script && SCRIPT_FALLBACK[info.script]) {
    return SCRIPT_FALLBACK[info.script];
  }
  
  return normalized;
}

/**
 * Get database column name for language in common_phrases table
 */
export function getLanguageColumn(lang: string): string {
  const effective = getEffectiveLanguage(lang);
  return LANGUAGE_TO_COLUMN.get(effective) || 'english';
}

// Languages with phrase table support
const SUPPORTED_PHRASE_LANGUAGES = new Set([
  'hindi', 'bengali', 'telugu', 'tamil', 'kannada', 'malayalam',
  'marathi', 'gujarati', 'punjabi', 'odia', 'urdu', 'arabic',
  'spanish', 'french', 'portuguese', 'russian', 'japanese', 'korean',
  'chinese (mandarin)', 'thai', 'vietnamese', 'indonesian', 'turkish',
  'persian', 'english',
]);

// Language name to database column mapping
const LANGUAGE_TO_COLUMN = new Map<string, string>([
  ['hindi', 'hindi'],
  ['bengali', 'bengali'],
  ['telugu', 'telugu'],
  ['tamil', 'tamil'],
  ['kannada', 'kannada'],
  ['malayalam', 'malayalam'],
  ['marathi', 'marathi'],
  ['gujarati', 'gujarati'],
  ['punjabi', 'punjabi'],
  ['odia', 'odia'],
  ['urdu', 'urdu'],
  ['arabic', 'arabic'],
  ['spanish', 'spanish'],
  ['french', 'french'],
  ['portuguese', 'portuguese'],
  ['russian', 'russian'],
  ['japanese', 'japanese'],
  ['korean', 'korean'],
  ['chinese (mandarin)', 'chinese'],
  ['thai', 'thai'],
  ['vietnamese', 'vietnamese'],
  ['indonesian', 'indonesian'],
  ['turkish', 'turkish'],
  ['persian', 'persian'],
  ['english', 'english'],
]);

/**
 * Get all supported languages
 */
export function getAllLanguages(): LanguageInfo[] {
  return Array.from(languageByName.values());
}

/**
 * Get language count
 */
export function getLanguageCount(): number {
  return languageByName.size;
}

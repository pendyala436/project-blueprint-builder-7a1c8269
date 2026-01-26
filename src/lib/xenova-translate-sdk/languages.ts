/**
 * Language Registry for Xenova SDK
 * Maps languages from src/data/languages.ts to SDK format
 */

import { languages as appLanguages } from '@/data/languages';
import type { Language, ScriptType } from './types';
import { isNLLBSupported, isM2MSupported } from './iso639';

// Latin script types
const LATIN_SCRIPTS = new Set([
  'Latin', 'latin', 'LATIN',
]);

/**
 * Determine if a language uses Latin script
 */
function isLatinScript(script?: string): boolean {
  if (!script) return false;
  return LATIN_SCRIPTS.has(script) || script.toLowerCase() === 'latin';
}

/**
 * Convert app language to SDK language format
 */
function toSDKLanguage(lang: typeof appLanguages[0]): Language {
  const code = lang.code.toLowerCase();
  const script: ScriptType = isLatinScript(lang.script) ? 'latin' : 'native';
  
  return {
    code,
    name: lang.name,
    nativeName: lang.nativeName,
    script,
    supported: isNLLBSupported(code) || isM2MSupported(code),
    models: {
      nllb: isNLLBSupported(code),
      m2m: isM2MSupported(code),
    },
  };
}

// Build SDK language list from app languages
export const LANGUAGES: Language[] = appLanguages.map(toSDKLanguage);

// Language lookup map for fast access
const languageMap = new Map<string, Language>();
LANGUAGES.forEach(lang => {
  languageMap.set(lang.code.toLowerCase(), lang);
  languageMap.set(lang.name.toLowerCase(), lang);
  // Also add native name for better matching
  if (lang.nativeName) {
    languageMap.set(lang.nativeName.toLowerCase(), lang);
  }
});

console.log(`[XenovaLanguages] Initialized with ${LANGUAGES.length} languages, ${languageMap.size} lookup entries`);

/**
 * Get language by code or name
 */
export function getLanguage(codeOrName: string): Language | null {
  const result = languageMap.get(codeOrName.toLowerCase()) || null;
  if (!result) {
    console.log(`[XenovaLanguages] getLanguage('${codeOrName}') not found in languageMap`);
  }
  return result;
}

/**
 * Check if language uses Latin script
 */
export function isLatinLanguage(code: string): boolean {
  const normalizedCode = normalizeLanguageCode(code);
  const lang = getLanguage(normalizedCode);
  
  if (lang) {
    const isLatin = lang.script === 'latin';
    console.log(`[XenovaLanguages] isLatinLanguage('${code}' → '${normalizedCode}'): script=${lang.script}, isLatin=${isLatin}`);
    return isLatin;
  }
  
  // Fallback: Check if it's a known Latin language by code
  const latinCodes = new Set(['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'vi', 'tr', 'sv', 'da', 'no', 'fi', 'cs', 'sk', 'hu', 'ro', 'hr', 'id', 'ms', 'tl', 'sw', 'af']);
  const isLatin = latinCodes.has(normalizedCode);
  console.log(`[XenovaLanguages] isLatinLanguage('${code}' → '${normalizedCode}'): not in registry, fallback=${isLatin}`);
  return isLatin;
}

/**
 * Check if language is supported for translation
 * Falls back to checking ISO codes directly if not found in registry
 */
export function isLanguageSupported(code: string): boolean {
  const normalizedCode = normalizeLanguageCode(code);
  const lang = getLanguage(normalizedCode);
  
  if (lang) {
    console.log(`[XenovaLanguages] isLanguageSupported('${code}' → '${normalizedCode}'): models=${JSON.stringify(lang.models)}, supported=${lang.supported}`);
    return lang.supported;
  }
  
  // Fallback: Check ISO codes directly for languages not in app registry
  const directSupport = isNLLBSupported(normalizedCode) || isM2MSupported(normalizedCode);
  console.log(`[XenovaLanguages] isLanguageSupported('${code}' → '${normalizedCode}'): not in registry, direct ISO check=${directSupport}`);
  return directSupport;
}

/**
 * Get language code from language name
 */
export function getCodeFromName(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  
  // Direct lookup
  const lang = languageMap.get(normalized);
  if (lang) return lang.code;
  
  // Search in languages
  const found = LANGUAGES.find(l => 
    l.name.toLowerCase() === normalized ||
    l.nativeName?.toLowerCase() === normalized
  );
  
  return found?.code || null;
}

/**
 * Normalize language to ISO code
 */
export function normalizeLanguageCode(input: string): string {
  if (!input) return 'en';
  
  const lower = input.toLowerCase().trim();
  
  // Already a code?
  const lang = languageMap.get(lower);
  if (lang) return lang.code;
  
  // Try to find by name
  const code = getCodeFromName(lower);
  if (code) return code;
  
  // Common aliases
  const aliases: Record<string, string> = {
    'english': 'en',
    'hindi': 'hi',
    'telugu': 'te',
    'tamil': 'ta',
    'kannada': 'kn',
    'malayalam': 'ml',
    'marathi': 'mr',
    'gujarati': 'gu',
    'bengali': 'bn',
    'punjabi': 'pa',
    'urdu': 'ur',
    'odia': 'or',
    'oriya': 'or',
    'assamese': 'as',
    'nepali': 'ne',
    'french': 'fr',
    'spanish': 'es',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'russian': 'ru',
    'chinese': 'zh',
    'mandarin': 'zh',
    'japanese': 'ja',
    'korean': 'ko',
    'arabic': 'ar',
  };
  
  return aliases[lower] || lower;
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  const code1 = normalizeLanguageCode(lang1);
  const code2 = normalizeLanguageCode(lang2);
  return code1 === code2;
}

/**
 * Check if language is English
 */
export function isEnglish(lang: string): boolean {
  const code = normalizeLanguageCode(lang);
  return code === 'en' || code === 'eng';
}

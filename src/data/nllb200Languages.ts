/**
 * Language Data for Profile Selection
 * ====================================
 * Dynamically sources all 386+ languages from languages.ts
 * NO hardcoded NLLB-200 codes - uses embedded translator via English pivot
 */

import { languages, type Language } from './languages';

export interface NLLB200Language {
  code: string; // Language code (e.g., "en", "hi")
  name: string; // Human-readable name
  isIndian: boolean; // Whether this is an Indian language
  script: string; // Script used
  nativeName?: string; // Native name
  rtl?: boolean; // Right-to-left
}

// Indian language codes (22 Official + Regional + Northeast + Tribal)
const INDIAN_LANGUAGE_CODES = new Set([
  // Official 22 Eighth Schedule
  "hi", "bn", "te", "mr", "ta", "gu", "kn", "ml", "or", "pa",
  "as", "mai", "sa", "ks", "ne", "sd", "kok", "doi", "mni", "sat", "brx", "ur",
  // Regional
  "bho", "hne", "raj", "mwr", "mtr", "bgc", "mag", "anp", "bjj", "awa",
  "bns", "bfy", "gbm", "kfy", "him", "kan", "tcy", "kfa", "bhb", "gon",
  "lmn", "sck", "kru", "unr", "hoc", "khr", "hlb",
  // Northeast
  "lus", "kha", "grt", "mjw", "trp", "rah", "mrg", "njz", "apt", "adi",
  "lep", "sip", "lif", "njo", "njh", "nsm", "njm", "nmf", "pck", "tcz",
  "nbu", "nst", "nnp", "njb", "nag", "cmn",
  // South Indian Tribal
  "tcx", "bfq", "iru", "kfh", "vav",
  // Other South Asian
  "dv", "bo", "dz", "pi", "caq", "si"
]);

// Convert Language to NLLB200Language format
function convertToNLLB200(lang: Language): NLLB200Language {
  return {
    code: lang.code,
    name: lang.name,
    isIndian: INDIAN_LANGUAGE_CODES.has(lang.code),
    script: lang.script || 'Latin',
    nativeName: lang.nativeName,
    rtl: lang.rtl
  };
}

// All 386+ languages from languages.ts
export const ALL_NLLB200_LANGUAGES: NLLB200Language[] = languages.map(convertToNLLB200);

// Indian languages (filtered from all languages)
export const INDIAN_NLLB200_LANGUAGES: NLLB200Language[] = ALL_NLLB200_LANGUAGES.filter(l => l.isIndian);

// Non-Indian languages (filtered from all languages)
export const NON_INDIAN_NLLB200_LANGUAGES: NLLB200Language[] = ALL_NLLB200_LANGUAGES.filter(l => !l.isIndian);

// Helper functions
export function isIndianLanguage(languageName: string): boolean {
  const normalized = languageName.toLowerCase().trim();
  return INDIAN_NLLB200_LANGUAGES.some(
    lang => lang.name.toLowerCase() === normalized
  );
}

export function getNLLB200Code(languageName: string): string | null {
  const normalized = languageName.toLowerCase().trim();
  const found = ALL_NLLB200_LANGUAGES.find(
    lang => lang.name.toLowerCase() === normalized
  );
  return found?.code || null;
}

export function getLanguageByCode(code: string): NLLB200Language | null {
  return ALL_NLLB200_LANGUAGES.find(lang => lang.code === code) || null;
}

export function getLanguageByName(name: string): NLLB200Language | null {
  const normalized = name.toLowerCase().trim();
  return ALL_NLLB200_LANGUAGES.find(
    lang => lang.name.toLowerCase() === normalized
  ) || null;
}

export function getIndianLanguageNames(): string[] {
  return INDIAN_NLLB200_LANGUAGES.map(lang => lang.name);
}

export function getNonIndianLanguageNames(): string[] {
  return NON_INDIAN_NLLB200_LANGUAGES.map(lang => lang.name);
}

// Get total language count
export function getTotalLanguageCount(): number {
  return ALL_NLLB200_LANGUAGES.length;
}

// Search languages by name or native name
export function searchLanguages(query: string): NLLB200Language[] {
  const q = query.toLowerCase();
  return ALL_NLLB200_LANGUAGES.filter(lang =>
    lang.name.toLowerCase().includes(q) ||
    (lang.nativeName && lang.nativeName.toLowerCase().includes(q)) ||
    lang.code.toLowerCase().includes(q)
  );
}

// Map common language name variations
export const LANGUAGE_NAME_ALIASES: Record<string, string> = {
  "mandarin": "zh",
  "chinese": "zh",
  "cantonese": "yue",
  "farsi": "fa",
  "bangla": "bn",
  "oriya": "or",
  "filipino": "tl",
  "burmese": "my",
  "malay": "ms",
};

/**
 * Language Data for Women Profile Selection
 * ==========================================
 * All 386+ languages from languages.ts for female user profiles
 */

import { languages, type Language } from './languages';

export interface WomenProfileLanguage {
  code: string;
  name: string;
  isIndian: boolean;
  script: string;
  nativeName?: string;
  rtl?: boolean;
}

// Indian language codes
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

function convertToWomenProfileLanguage(lang: Language): WomenProfileLanguage {
  return {
    code: lang.code,
    name: lang.name,
    isIndian: INDIAN_LANGUAGE_CODES.has(lang.code),
    script: lang.script || 'Latin',
    nativeName: lang.nativeName,
    rtl: lang.rtl
  };
}

// All 386+ languages for women profiles
export const WOMEN_ALL_LANGUAGES: WomenProfileLanguage[] = languages.map(convertToWomenProfileLanguage);

// Indian languages for women
export const WOMEN_INDIAN_LANGUAGES: WomenProfileLanguage[] = WOMEN_ALL_LANGUAGES.filter(l => l.isIndian);

// Non-Indian languages for women
export const WOMEN_NON_INDIAN_LANGUAGES: WomenProfileLanguage[] = WOMEN_ALL_LANGUAGES.filter(l => !l.isIndian);

// Helper functions for women profiles
export function getWomenLanguageByCode(code: string): WomenProfileLanguage | null {
  return WOMEN_ALL_LANGUAGES.find(lang => lang.code === code) || null;
}

export function getWomenLanguageByName(name: string): WomenProfileLanguage | null {
  const normalized = name.toLowerCase().trim();
  return WOMEN_ALL_LANGUAGES.find(
    lang => lang.name.toLowerCase() === normalized
  ) || null;
}

export function searchWomenLanguages(query: string): WomenProfileLanguage[] {
  const q = query.toLowerCase();
  return WOMEN_ALL_LANGUAGES.filter(lang =>
    lang.name.toLowerCase().includes(q) ||
    (lang.nativeName && lang.nativeName.toLowerCase().includes(q)) ||
    lang.code.toLowerCase().includes(q)
  );
}

export function getWomenLanguageCount(): number {
  return WOMEN_ALL_LANGUAGES.length;
}

/**
 * Language Data for Men Profile Selection
 * ========================================
 * All 386+ languages from languages.ts for male user profiles
 */

import { languages, type Language } from './languages';

export interface MenProfileLanguage {
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

function convertToMenProfileLanguage(lang: Language): MenProfileLanguage {
  return {
    code: lang.code,
    name: lang.name,
    isIndian: INDIAN_LANGUAGE_CODES.has(lang.code),
    script: lang.script || 'Latin',
    nativeName: lang.nativeName,
    rtl: lang.rtl
  };
}

// All 386+ languages for men profiles
export const MEN_ALL_LANGUAGES: MenProfileLanguage[] = languages.map(convertToMenProfileLanguage);

// Indian languages for men
export const MEN_INDIAN_LANGUAGES: MenProfileLanguage[] = MEN_ALL_LANGUAGES.filter(l => l.isIndian);

// Non-Indian languages for men
export const MEN_NON_INDIAN_LANGUAGES: MenProfileLanguage[] = MEN_ALL_LANGUAGES.filter(l => !l.isIndian);

// Helper functions for men profiles
export function getMenLanguageByCode(code: string): MenProfileLanguage | null {
  return MEN_ALL_LANGUAGES.find(lang => lang.code === code) || null;
}

export function getMenLanguageByName(name: string): MenProfileLanguage | null {
  const normalized = name.toLowerCase().trim();
  return MEN_ALL_LANGUAGES.find(
    lang => lang.name.toLowerCase() === normalized
  ) || null;
}

export function searchMenLanguages(query: string): MenProfileLanguage[] {
  const q = query.toLowerCase();
  return MEN_ALL_LANGUAGES.filter(lang =>
    lang.name.toLowerCase().includes(q) ||
    (lang.nativeName && lang.nativeName.toLowerCase().includes(q)) ||
    lang.code.toLowerCase().includes(q)
  );
}

export function getMenLanguageCount(): number {
  return MEN_ALL_LANGUAGES.length;
}

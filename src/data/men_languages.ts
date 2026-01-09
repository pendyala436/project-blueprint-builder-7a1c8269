// Men Profile Languages - Synced with languages.ts
// All 386+ languages available for men user profiles

import { languages, Language } from './languages';

// Re-export the Language interface for men profiles
export type MenLanguage = Language;

// Men profile languages - directly synced from main languages
export const menLanguages: MenLanguage[] = languages;

// Helper functions for men profile language operations
export const getMenLanguageByCode = (code: string): MenLanguage | undefined => {
  return menLanguages.find(lang => lang.code === code);
};

export const getMenLanguageByName = (name: string): MenLanguage | undefined => {
  return menLanguages.find(lang => 
    lang.name.toLowerCase() === name.toLowerCase() ||
    lang.nativeName.toLowerCase() === name.toLowerCase()
  );
};

export const getMenLanguagesByScript = (script: string): MenLanguage[] => {
  return menLanguages.filter(lang => lang.script === script);
};

export const getMenRTLLanguages = (): MenLanguage[] => {
  return menLanguages.filter(lang => lang.rtl === true);
};

export const searchMenLanguages = (query: string): MenLanguage[] => {
  const lowerQuery = query.toLowerCase();
  return menLanguages.filter(lang =>
    lang.name.toLowerCase().includes(lowerQuery) ||
    lang.nativeName.toLowerCase().includes(lowerQuery) ||
    lang.code.toLowerCase().includes(lowerQuery)
  );
};

// Total count of available languages for men profiles
export const MEN_LANGUAGE_COUNT = menLanguages.length;

// Female Profile Languages - Synced with languages.ts
// All 386+ languages available for female user profiles

import { languages, Language } from './languages';

// Re-export the Language interface for female profiles
export type FemaleLanguage = Language;

// Female profile languages - directly synced from main languages
export const femaleLanguages: FemaleLanguage[] = languages;

// Helper functions for female profile language operations
export const getFemaleLanguageByCode = (code: string): FemaleLanguage | undefined => {
  return femaleLanguages.find(lang => lang.code === code);
};

export const getFemaleLanguageByName = (name: string): FemaleLanguage | undefined => {
  return femaleLanguages.find(lang => 
    lang.name.toLowerCase() === name.toLowerCase() ||
    lang.nativeName.toLowerCase() === name.toLowerCase()
  );
};

export const getFemaleLanguagesByScript = (script: string): FemaleLanguage[] => {
  return femaleLanguages.filter(lang => lang.script === script);
};

export const getFemaleRTLLanguages = (): FemaleLanguage[] => {
  return femaleLanguages.filter(lang => lang.rtl === true);
};

export const searchFemaleLanguages = (query: string): FemaleLanguage[] => {
  const lowerQuery = query.toLowerCase();
  return femaleLanguages.filter(lang =>
    lang.name.toLowerCase().includes(lowerQuery) ||
    lang.nativeName.toLowerCase().includes(lowerQuery) ||
    lang.code.toLowerCase().includes(lowerQuery)
  );
};

// Total count of available languages for female profiles
export const FEMALE_LANGUAGE_COUNT = femaleLanguages.length;

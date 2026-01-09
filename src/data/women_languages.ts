// Women Profile Languages - Synced with languages.ts
// All 386+ languages available for women user profiles

import { languages, Language } from './languages';

// Re-export the Language interface for women profiles
export type WomenLanguage = Language;

// Women profile languages - directly synced from main languages
export const womenLanguages: WomenLanguage[] = languages;

// Helper functions for women profile language operations
export const getWomenLanguageByCode = (code: string): WomenLanguage | undefined => {
  return womenLanguages.find(lang => lang.code === code);
};

export const getWomenLanguageByName = (name: string): WomenLanguage | undefined => {
  return womenLanguages.find(lang => 
    lang.name.toLowerCase() === name.toLowerCase() ||
    lang.nativeName.toLowerCase() === name.toLowerCase()
  );
};

export const getWomenLanguagesByScript = (script: string): WomenLanguage[] => {
  return womenLanguages.filter(lang => lang.script === script);
};

export const getWomenRTLLanguages = (): WomenLanguage[] => {
  return womenLanguages.filter(lang => lang.rtl === true);
};

export const searchWomenLanguages = (query: string): WomenLanguage[] => {
  const lowerQuery = query.toLowerCase();
  return womenLanguages.filter(lang =>
    lang.name.toLowerCase().includes(lowerQuery) ||
    lang.nativeName.toLowerCase().includes(lowerQuery) ||
    lang.code.toLowerCase().includes(lowerQuery)
  );
};

// Total count of available languages for women profiles
export const WOMEN_LANGUAGE_COUNT = womenLanguages.length;

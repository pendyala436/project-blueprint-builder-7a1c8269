// Male Profile Languages - Synced with languages.ts
// All 386+ languages available for male user profiles

import { languages, Language } from './languages';

// Re-export the Language interface for male profiles
export type MaleLanguage = Language;

// Male profile languages - directly synced from main languages
export const maleLanguages: MaleLanguage[] = languages;

// Helper functions for male profile language operations
export const getMaleLanguageByCode = (code: string): MaleLanguage | undefined => {
  return maleLanguages.find(lang => lang.code === code);
};

export const getMaleLanguageByName = (name: string): MaleLanguage | undefined => {
  return maleLanguages.find(lang => 
    lang.name.toLowerCase() === name.toLowerCase() ||
    lang.nativeName.toLowerCase() === name.toLowerCase()
  );
};

export const getMaleLanguagesByScript = (script: string): MaleLanguage[] => {
  return maleLanguages.filter(lang => lang.script === script);
};

export const getMaleRTLLanguages = (): MaleLanguage[] => {
  return maleLanguages.filter(lang => lang.rtl === true);
};

export const searchMaleLanguages = (query: string): MaleLanguage[] => {
  const lowerQuery = query.toLowerCase();
  return maleLanguages.filter(lang =>
    lang.name.toLowerCase().includes(lowerQuery) ||
    lang.nativeName.toLowerCase().includes(lowerQuery) ||
    lang.code.toLowerCase().includes(lowerQuery)
  );
};

// Total count of available languages for male profiles
export const MALE_LANGUAGE_COUNT = maleLanguages.length;

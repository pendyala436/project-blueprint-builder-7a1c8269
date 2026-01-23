// Women Profile Languages - Synced with master languages.ts
// Re-exports all languages from the master list for consistency

import { languages, type Language } from './languages';

// Re-export the Language interface as WomenLanguage for backward compatibility
export type WomenLanguage = Language;

// Export all languages from master list
export const womenLanguages: WomenLanguage[] = languages;

// Helper functions (re-using master list)
export function getWomenLanguageName(code: string): string {
  const lang = womenLanguages.find(l => l.code === code);
  return lang?.name || code;
}

export function getWomenLanguageNativeName(code: string): string {
  const lang = womenLanguages.find(l => l.code === code);
  return lang?.nativeName || code;
}

export function getWomenLanguageByCode(code: string): WomenLanguage | undefined {
  return womenLanguages.find(l => l.code === code);
}

export function searchWomenLanguages(query: string): WomenLanguage[] {
  const q = query.toLowerCase();
  return womenLanguages.filter(l => 
    l.code.toLowerCase().includes(q) ||
    l.name.toLowerCase().includes(q) ||
    l.nativeName.toLowerCase().includes(q)
  );
}

export function getWomenLanguageCount(): number {
  return womenLanguages.length;
}

export function getWomenRTLLanguages(): WomenLanguage[] {
  return womenLanguages.filter(l => l.rtl === true);
}

// Men Profile Languages - Synced with master languages.ts
// Re-exports all languages from the master list for consistency

import { languages, type Language } from './languages';

// Re-export the Language interface as MenLanguage for backward compatibility
export type MenLanguage = Language;

// Export all languages from master list
export const menLanguages: MenLanguage[] = languages;

// Helper functions (re-using master list)
export function getMenLanguageName(code: string): string {
  const lang = menLanguages.find(l => l.code === code);
  return lang?.name || code;
}

export function getMenLanguageNativeName(code: string): string {
  const lang = menLanguages.find(l => l.code === code);
  return lang?.nativeName || code;
}

export function getMenLanguageByCode(code: string): MenLanguage | undefined {
  return menLanguages.find(l => l.code === code);
}

export function searchMenLanguages(query: string): MenLanguage[] {
  const q = query.toLowerCase();
  return menLanguages.filter(l => 
    l.code.toLowerCase().includes(q) ||
    l.name.toLowerCase().includes(q) ||
    l.nativeName.toLowerCase().includes(q)
  );
}

export function getMenLanguageCount(): number {
  return menLanguages.length;
}

export function getMenRTLLanguages(): MenLanguage[] {
  return menLanguages.filter(l => l.rtl === true);
}

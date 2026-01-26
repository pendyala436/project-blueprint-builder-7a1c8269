/**
 * Idiom Dictionary
 * =================
 * 
 * Database-driven idiom handling.
 * All idiom data is loaded from Supabase - no hardcoded data.
 */

import type { IdiomEntry } from './types';
import { 
  loadIdioms, 
  getIdiom, 
  getAllIdioms, 
  findIdiomInText,
  initializeDatabaseTranslation,
} from './database-loader';

// ============================================================
// IDIOM LOOKUP FUNCTIONS (Database-driven)
// ============================================================

/**
 * Look up an idiom in the database
 */
export function lookupIdiom(phrase: string): IdiomEntry | null {
  return getIdiom(phrase);
}

/**
 * Get translation for an idiom
 */
export function getIdiomTranslation(phrase: string, targetLanguage: string): string | null {
  const idiom = getIdiom(phrase);
  if (!idiom) return null;
  
  const langKey = targetLanguage.toLowerCase();
  return idiom.translations[langKey] || null;
}

/**
 * Find all idioms present in text
 */
export function findIdiomsInText(text: string): Array<{ phrase: string; idiom: IdiomEntry }> {
  const found: Array<{ phrase: string; idiom: IdiomEntry }> = [];
  const lowerText = text.toLowerCase();
  
  const allIdioms = getAllIdioms();
  for (const idiom of allIdioms) {
    if (lowerText.includes(idiom.normalizedPhrase)) {
      found.push({ phrase: idiom.phrase, idiom });
    }
  }
  
  return found;
}

/**
 * Replace idioms in text with translations
 */
export function replaceIdiomsInText(
  text: string, 
  targetLanguage: string
): { text: string; replacements: string[] } {
  let result = text;
  const replacements: string[] = [];
  const langKey = targetLanguage.toLowerCase();
  
  const allIdioms = getAllIdioms();
  
  // Sort by length (longest first) to avoid partial matches
  const sortedIdioms = [...allIdioms].sort(
    (a, b) => b.normalizedPhrase.length - a.normalizedPhrase.length
  );
  
  for (const idiom of sortedIdioms) {
    const regex = new RegExp(escapeRegex(idiom.normalizedPhrase), 'gi');
    const translation = idiom.translations[langKey];
    
    if (translation && regex.test(result)) {
      result = result.replace(regex, translation);
      replacements.push(idiom.phrase);
    }
  }
  
  return { text: result, replacements };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Initialize idiom data from database
 */
export async function initializeIdioms(): Promise<void> {
  await loadIdioms();
}

/**
 * Check if idiom data is loaded
 */
export function isIdiomsLoaded(): boolean {
  return getAllIdioms().length > 0;
}

// Re-export for backward compatibility
export { IdiomEntry };

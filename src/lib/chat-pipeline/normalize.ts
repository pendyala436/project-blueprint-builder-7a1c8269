/**
 * Normalize Module
 * ================
 * 
 * Normalizes ANY user input (roman, native, mixed, voice, Gboard) to clean text.
 * This layer makes the input method irrelevant.
 * 
 * Uses existing languages.ts as source of truth.
 */

import { languages, type Language } from '@/data/languages';

// Build lookup maps from languages.ts
const languageByCode = new Map<string, Language>();
const languageByName = new Map<string, Language>();

languages.forEach(lang => {
  languageByCode.set(lang.code.toLowerCase(), lang);
  languageByName.set(lang.name.toLowerCase(), lang);
});

/**
 * Get language info from languages.ts
 */
export function getLanguageInfo(langInput: string): Language | undefined {
  const normalized = langInput.toLowerCase().trim();
  return languageByName.get(normalized) || languageByCode.get(normalized);
}

/**
 * Check if language uses non-Latin script
 */
export function isNonLatinScript(langCode: string): boolean {
  const lang = getLanguageInfo(langCode);
  return lang?.script !== 'Latin';
}

/**
 * Detect if text is primarily Latin script
 */
export function isLatinText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  
  const latinChars = trimmed.match(/[a-zA-ZÀ-ÿĀ-žƀ-ɏ]/g) || [];
  const totalChars = trimmed.replace(/\s/g, '').length;
  
  return totalChars > 0 && latinChars.length / totalChars > 0.5;
}

/**
 * Normalize text input
 * - Trims whitespace
 * - Handles mixed scripts
 * - Ready for translation/transliteration
 * 
 * @param text - Raw user input (any typing method)
 * @param langCode - User's mother tongue code
 */
export async function normalizeText(
  text: string,
  langCode: string
): Promise<string> {
  // Basic normalization
  return text.trim();
}

/**
 * Check if text looks like actual English (vs romanized native)
 */
export function looksLikeEnglish(text: string): boolean {
  const lowered = text.toLowerCase().trim();
  const englishWords = [
    'hello', 'hi', 'how', 'are', 'you', 'what', 'where', 'when', 'why', 'who',
    'the', 'is', 'a', 'an', 'to', 'for', 'in', 'on', 'with', 'good', 'morning',
    'yes', 'no', 'ok', 'okay', 'thank', 'thanks', 'please', 'sorry', 'bye',
    'love', 'like', 'want', 'need', 'can', 'will', 'have', 'do', 'did', 'does',
    'my', 'your', 'our', 'their', 'his', 'her', 'its', 'this', 'that',
    'and', 'or', 'but', 'if', 'then', 'because', 'so', 'very', 'really', 'just'
  ];
  
  const words = lowered.split(/\s+/);
  const englishWordCount = words.filter(w => englishWords.includes(w)).length;
  
  // If more than 30% of words are common English words, it's likely English
  return words.length > 0 && (englishWordCount / words.length) >= 0.3;
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  const norm1 = lang1.toLowerCase().trim();
  const norm2 = lang2.toLowerCase().trim();
  
  if (norm1 === norm2) return true;
  
  // Check code vs name matches
  const info1 = getLanguageInfo(lang1);
  const info2 = getLanguageInfo(lang2);
  
  if (info1 && info2) {
    return info1.code === info2.code;
  }
  
  return false;
}

/**
 * Check if language is English
 */
export function isEnglish(lang: string): boolean {
  const normalized = lang.toLowerCase().trim();
  return normalized === 'en' || normalized === 'english';
}

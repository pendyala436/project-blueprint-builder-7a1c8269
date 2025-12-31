/**
 * Language Detection Module
 * Detects language from text using Unicode script patterns
 */

import type { LanguageDetectionResult } from './types';
import { SCRIPT_PATTERNS } from './language-codes';

/**
 * Check if text is primarily Latin script
 */
export function isLatinScript(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const latinChars = trimmed.match(/[a-zA-Z]/g);
  const totalChars = trimmed.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');

  if (!latinChars || !totalChars.length) {
    return /^[a-zA-Z0-9\s\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]+$/.test(trimmed);
  }

  return (latinChars.length / totalChars.length) > 0.8;
}

/**
 * Detect European language from diacritics
 */
function detectEuropeanLanguage(text: string): LanguageDetectionResult | null {
  if (/[ñ¿¡]/i.test(text)) {
    return { language: 'spanish', isLatin: true, confidence: 0.85 };
  }
  if (/[ç]/i.test(text) && /[ã|õ]/i.test(text)) {
    return { language: 'portuguese', isLatin: true, confidence: 0.85 };
  }
  if (/[éèêë]/i.test(text) && /[çà]/i.test(text)) {
    return { language: 'french', isLatin: true, confidence: 0.8 };
  }
  if (/[äöüß]/i.test(text)) {
    return { language: 'german', isLatin: true, confidence: 0.85 };
  }
  if (/[ăîâșț]/i.test(text)) {
    return { language: 'romanian', isLatin: true, confidence: 0.85 };
  }
  if (/[ąćęłńóśźż]/i.test(text)) {
    return { language: 'polish', isLatin: true, confidence: 0.85 };
  }
  if (/[čďěňřšťůž]/i.test(text)) {
    return { language: 'czech', isLatin: true, confidence: 0.85 };
  }
  if (/[őű]/i.test(text)) {
    return { language: 'hungarian', isLatin: true, confidence: 0.85 };
  }
  if (/[åäö]/i.test(text)) {
    return { language: 'swedish', isLatin: true, confidence: 0.8 };
  }
  if (/[æøå]/i.test(text)) {
    return { language: 'norwegian', isLatin: true, confidence: 0.8 };
  }
  return null;
}

/**
 * Detect Vietnamese from diacritics
 */
function detectVietnamese(text: string): boolean {
  return /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text);
}

/**
 * Detect language from text using Unicode patterns
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  const trimmed = text.trim();
  
  // Default to English
  const defaultResult: LanguageDetectionResult = {
    language: 'english',
    isLatin: true,
    confidence: 0.5
  };

  if (!trimmed) return defaultResult;

  // Check script patterns (non-Latin first)
  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return {
        language: pattern.language,
        isLatin: false,
        confidence: 0.95
      };
    }
  }

  // Check for Vietnamese
  if (detectVietnamese(trimmed)) {
    return { language: 'vietnamese', isLatin: true, confidence: 0.9 };
  }

  // Check for European languages with diacritics
  if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(trimmed)) {
    const european = detectEuropeanLanguage(trimmed);
    if (european) return european;
  }

  // Default to English for basic Latin
  return defaultResult;
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  if (!lang1 || !lang2) return false;
  
  const normalize = (l: string) => l.toLowerCase().trim();
  const l1 = normalize(lang1);
  const l2 = normalize(lang2);
  
  if (l1 === l2) return true;
  
  // Check aliases
  const aliases: Record<string, string[]> = {
    bengali: ['bangla'],
    odia: ['oriya'],
    chinese: ['mandarin', 'simplified chinese'],
    burmese: ['myanmar'],
    khmer: ['cambodian'],
    lao: ['laotian'],
    persian: ['farsi'],
    sinhala: ['sinhalese'],
    tagalog: ['filipino'],
    swahili: ['kiswahili'],
  };
  
  for (const [main, alts] of Object.entries(aliases)) {
    const all = [main, ...alts];
    if (all.includes(l1) && all.includes(l2)) return true;
  }
  
  return false;
}

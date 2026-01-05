/**
 * Language Detection Module
 * Detects language from text using Unicode script patterns
 * Also detects phonetic Latin input for Indian languages
 */

import type { LanguageDetectionResult } from './types';
import { SCRIPT_PATTERNS } from './language-codes';

/**
 * Common romanized patterns for Indian languages
 * Used to detect if Latin text is phonetic Telugu, Hindi, Tamil, etc.
 */
const INDIAN_PHONETIC_PATTERNS: Record<string, { patterns: RegExp[]; words: string[] }> = {
  telugu: {
    patterns: [/\b(nenu|meeru|nuvvu|ela|emi|undi|unnaru|unnav|bagundi|chesthunnav|chesthunnaru)\b/i],
    words: ['nenu', 'meeru', 'nuvvu', 'ela', 'emi', 'undi', 'unnaru', 'unnav', 'bagundi', 'bagunnanu', 'bagunnav', 'chesthunnav', 'chesthunnaru', 'vellanu', 'vastanu', 'avunu', 'ledu', 'manchidi', 'dhanyavadalu', 'eppudu', 'ekkada', 'enduku', 'inka', 'chala', 'konchem']
  },
  hindi: {
    patterns: [/\b(kya|kaise|kahan|kyun|main|tum|aap|hum|hai|hoon|karo|karta|karti|raha|rahi|theek|accha)\b/i],
    words: ['kya', 'kaise', 'kahan', 'kyun', 'main', 'tum', 'aap', 'hum', 'hai', 'hoon', 'ho', 'karo', 'karta', 'karti', 'raha', 'rahi', 'theek', 'accha', 'bahut', 'nahi', 'haan', 'namaste', 'dhanyavad', 'shukriya', 'pyar', 'mohabbat', 'dost', 'bhai', 'behen']
  },
  tamil: {
    patterns: [/\b(naan|nee|neengal|enna|eppadi|enga|yaar|vanakkam|nandri|aama|illa)\b/i],
    words: ['naan', 'nee', 'neengal', 'enna', 'eppadi', 'enga', 'yaar', 'vanakkam', 'nandri', 'aama', 'illa', 'sari', 'romba', 'nalla', 'paaru', 'vaa', 'po', 'sol', 'kelu', 'podu', 'edu']
  },
  bengali: {
    patterns: [/\b(ami|tumi|apni|kemon|ki|kothay|keno|bhalo|achi|accho|acho|bhai|didi|dhonnobad)\b/i],
    words: ['ami', 'tumi', 'apni', 'kemon', 'ki', 'kothay', 'keno', 'bhalo', 'achi', 'accho', 'acho', 'bhai', 'didi', 'dhonnobad', 'namaskar', 'haan', 'na', 'kotha', 'jao', 'eso', 'dekho', 'bolo']
  },
  kannada: {
    patterns: [/\b(naanu|neevu|hege|yenu|yelli|yaake|houdu|illa|dhanyavada|namaskara)\b/i],
    words: ['naanu', 'neevu', 'hege', 'yenu', 'yelli', 'yaake', 'houdu', 'illa', 'dhanyavada', 'namaskara', 'baa', 'hogu', 'nodu', 'helu', 'kelu', 'chennagide', 'tumba']
  },
  malayalam: {
    patterns: [/\b(njan|ningal|nee|enthu|engane|evide|enthinanu|athe|alla|nanni|namaskkaram)\b/i],
    words: ['njan', 'ningal', 'nee', 'enthu', 'engane', 'evide', 'enthinanu', 'athe', 'alla', 'nanni', 'namaskkaram', 'vaa', 'po', 'nokku', 'para', 'kelkku', 'kollam', 'sheriyanu']
  },
  marathi: {
    patterns: [/\b(mi|tumhi|aahe|kay|kasa|kuthe|ka|ho|nahi|dhanyavad|namaskar)\b/i],
    words: ['mi', 'tumhi', 'aahe', 'kay', 'kasa', 'kashi', 'kuthe', 'ka', 'ho', 'hoय', 'nahi', 'dhanyavad', 'namaskar', 'ya', 'ja', 'bagh', 'sang', 'aik', 'bhari']
  },
  gujarati: {
    patterns: [/\b(hu|tame|chhe|shu|kem|kya|kare|chhu|haa|na|aabhar|namaste)\b/i],
    words: ['hu', 'tame', 'chhe', 'chhu', 'shu', 'kem', 'kya', 'kyare', 'haa', 'na', 'nathi', 'aabhar', 'dhanyavaad', 'aav', 'ja', 'jo', 'bol', 'sambhal', 'saru']
  },
  punjabi: {
    patterns: [/\b(main|tusi|ki|kiven|kadon|kitthe|kyon|haan|hanji|nahi|sat_sri_akal)\b/i],
    words: ['main', 'tusi', 'ki', 'kiven', 'kadon', 'kitthe', 'kyon', 'haan', 'hanji', 'nahi', 'sat', 'sri', 'akal', 'dhannvaad', 'shukriya', 'aa', 'ja', 'dekh', 'bol', 'sun', 'sohna']
  }
};

/**
 * Detect if Latin text is phonetic input for an Indian language
 */
export function detectPhoneticIndianLanguage(text: string): { language: string; confidence: number } | null {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);
  
  for (const [language, { patterns, words: langWords }] of Object.entries(INDIAN_PHONETIC_PATTERNS)) {
    // Check patterns
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        return { language, confidence: 0.75 };
      }
    }
    
    // Check word matches
    let matchCount = 0;
    for (const word of words) {
      const cleanWord = word.replace(/[.,!?;:'"]/g, '');
      if (langWords.includes(cleanWord)) {
        matchCount++;
      }
    }
    
    // If multiple words match, likely this language
    if (matchCount >= 2 || (matchCount >= 1 && words.length <= 3)) {
      return { language, confidence: 0.7 + (matchCount * 0.05) };
    }
  }
  
  return null;
}

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

// Minimum text length for reliable detection
const MIN_DETECTION_LENGTH = 3;
const LOW_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Detect language from text using Unicode patterns
 * Also detects phonetic Latin input for Indian languages
 * 
 * FIX #1: For short or mixed text, falls back to user's profile (hintLanguage)
 */
export function detectLanguage(text: string, hintLanguage?: string): LanguageDetectionResult {
  const trimmed = text.trim();
  
  // Default result - use hint language if provided, otherwise English
  const fallbackLanguage = hintLanguage?.toLowerCase() || 'english';
  const defaultResult: LanguageDetectionResult = {
    language: fallbackLanguage,
    isLatin: true,
    confidence: hintLanguage ? 0.7 : 0.5 // Higher confidence if we have a hint
  };

  if (!trimmed) return defaultResult;

  // FIX #1: For very short text (< 3 chars), use hint language with low confidence
  if (trimmed.length < MIN_DETECTION_LENGTH && hintLanguage) {
    return {
      language: hintLanguage.toLowerCase(),
      isLatin: isLatinScript(trimmed),
      confidence: 0.6
    };
  }

  // Check script patterns (non-Latin first) - highest priority
  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return {
        language: pattern.language,
        isLatin: false,
        confidence: 0.95
      };
    }
  }

  // For Latin text, check if it's phonetic input for an Indian language
  if (isLatinScript(trimmed)) {
    // If we have a hint (user's mother tongue), prioritize checking that language first
    if (hintLanguage) {
      const normalizedHint = hintLanguage.toLowerCase();
      const phoneticData = INDIAN_PHONETIC_PATTERNS[normalizedHint];
      if (phoneticData) {
        const words = trimmed.toLowerCase().split(/\s+/);
        let matchCount = 0;
        for (const word of words) {
          const cleanWord = word.replace(/[.,!?;:'"]/g, '');
          if (phoneticData.words.includes(cleanWord)) {
            matchCount++;
          }
        }
        // FIX #1: Even with 0 matches, if hint is provided and text is short, use hint
        if (matchCount >= 1) {
          return {
            language: normalizedHint,
            isLatin: true,
            isPhonetic: true,
            confidence: 0.8 + (matchCount * 0.03)
          };
        }
        // For short Latin text with a hint but no pattern match, still use hint
        if (trimmed.length < 20 && hintLanguage) {
          return {
            language: normalizedHint,
            isLatin: true,
            isPhonetic: true,
            confidence: 0.65
          };
        }
      }
    }
    
    // Try to detect phonetic Indian language without hint
    const phoneticResult = detectPhoneticIndianLanguage(trimmed);
    if (phoneticResult) {
      // FIX #1: If confidence is low and we have a hint, prefer hint
      if (phoneticResult.confidence < LOW_CONFIDENCE_THRESHOLD && hintLanguage) {
        return {
          language: hintLanguage.toLowerCase(),
          isLatin: true,
          isPhonetic: true,
          confidence: 0.65
        };
      }
      return {
        language: phoneticResult.language,
        isLatin: true,
        isPhonetic: true,
        confidence: phoneticResult.confidence
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

  // FIX #1: For basic Latin text, fall back to hint language if available
  if (hintLanguage) {
    return {
      language: hintLanguage.toLowerCase(),
      isLatin: true,
      confidence: 0.6
    };
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

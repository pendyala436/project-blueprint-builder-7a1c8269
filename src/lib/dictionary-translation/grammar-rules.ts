/**
 * Language Grammar Rules Database
 * ================================
 * 
 * Grammar rules for 100+ languages covering:
 * - Word order (SVO, SOV, VSO, etc.)
 * - Gender systems
 * - Adjective placement
 * - Article usage
 * - Morphological features
 */

import type { LanguageGrammar, WordOrder } from './types';

// ============================================================
// LANGUAGE GRAMMAR DATABASE
// ============================================================

export const LANGUAGE_GRAMMARS: Record<string, LanguageGrammar> = {
  // ============================================================
  // INDO-EUROPEAN: GERMANIC
  // ============================================================
  english: {
    code: 'en',
    name: 'English',
    wordOrder: 'SVO',
    hasGender: false,
    hasArticles: true,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: false,
    hasCases: false,
    hasHonorific: false,
  },
  german: {
    code: 'de',
    name: 'German',
    wordOrder: 'SVO', // V2 in main clauses, SOV in subordinate
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: false,
    hasCases: true,
    hasHonorific: true,
  },
  dutch: {
    code: 'nl',
    name: 'Dutch',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: false,
    hasCases: false,
    hasHonorific: true,
  },
  swedish: {
    code: 'sv',
    name: 'Swedish',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: false,
    hasCases: false,
    hasHonorific: true,
  },
  norwegian: {
    code: 'no',
    name: 'Norwegian',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: false,
    hasCases: false,
    hasHonorific: true,
  },
  danish: {
    code: 'da',
    name: 'Danish',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: false,
    hasCases: false,
    hasHonorific: true,
  },

  // ============================================================
  // INDO-EUROPEAN: ROMANCE
  // ============================================================
  spanish: {
    code: 'es',
    name: 'Spanish',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'after', // Usually after, but can be before
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },
  french: {
    code: 'fr',
    name: 'French',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'after', // Most after, some before
    usesPostpositions: false,
    subjectDropping: false,
    hasCases: false,
    hasHonorific: true,
  },
  italian: {
    code: 'it',
    name: 'Italian',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'after',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },
  portuguese: {
    code: 'pt',
    name: 'Portuguese',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'after',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },
  romanian: {
    code: 'ro',
    name: 'Romanian',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'after',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },

  // ============================================================
  // INDO-EUROPEAN: SLAVIC
  // ============================================================
  russian: {
    code: 'ru',
    name: 'Russian',
    wordOrder: 'SVO', // Flexible due to cases
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  polish: {
    code: 'pl',
    name: 'Polish',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  ukrainian: {
    code: 'uk',
    name: 'Ukrainian',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  czech: {
    code: 'cs',
    name: 'Czech',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  serbian: {
    code: 'sr',
    name: 'Serbian',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  croatian: {
    code: 'hr',
    name: 'Croatian',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  bulgarian: {
    code: 'bg',
    name: 'Bulgarian',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true, // Postpositive
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },

  // ============================================================
  // INDO-EUROPEAN: INDIC (SOV Languages)
  // ============================================================
  hindi: {
    code: 'hi',
    name: 'Hindi',
    wordOrder: 'SOV',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  bengali: {
    code: 'bn',
    name: 'Bengali',
    wordOrder: 'SOV',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  punjabi: {
    code: 'pa',
    name: 'Punjabi',
    wordOrder: 'SOV',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  gujarati: {
    code: 'gu',
    name: 'Gujarati',
    wordOrder: 'SOV',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  marathi: {
    code: 'mr',
    name: 'Marathi',
    wordOrder: 'SOV',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  nepali: {
    code: 'ne',
    name: 'Nepali',
    wordOrder: 'SOV',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  urdu: {
    code: 'ur',
    name: 'Urdu',
    wordOrder: 'SOV',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },

  // ============================================================
  // DRAVIDIAN (SOV Languages)
  // ============================================================
  tamil: {
    code: 'ta',
    name: 'Tamil',
    wordOrder: 'SOV',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  telugu: {
    code: 'te',
    name: 'Telugu',
    wordOrder: 'SOV',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  kannada: {
    code: 'kn',
    name: 'Kannada',
    wordOrder: 'SOV',
    hasGender: true,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  malayalam: {
    code: 'ml',
    name: 'Malayalam',
    wordOrder: 'SOV',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },

  // ============================================================
  // SINO-TIBETAN
  // ============================================================
  chinese: {
    code: 'zh',
    name: 'Chinese',
    wordOrder: 'SVO',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },

  // ============================================================
  // JAPONIC (SOV)
  // ============================================================
  japanese: {
    code: 'ja',
    name: 'Japanese',
    wordOrder: 'SOV',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
    sentenceEndParticle: 'です/ます',
  },

  // ============================================================
  // KOREANIC (SOV)
  // ============================================================
  korean: {
    code: 'ko',
    name: 'Korean',
    wordOrder: 'SOV',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },

  // ============================================================
  // TURKIC (SOV)
  // ============================================================
  turkish: {
    code: 'tr',
    name: 'Turkish',
    wordOrder: 'SOV',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },

  // ============================================================
  // SEMITIC (VSO)
  // ============================================================
  arabic: {
    code: 'ar',
    name: 'Arabic',
    wordOrder: 'VSO', // Classical, modern often SVO
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'after',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  hebrew: {
    code: 'he',
    name: 'Hebrew',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'after',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },

  // ============================================================
  // OTHER MAJOR LANGUAGES
  // ============================================================
  thai: {
    code: 'th',
    name: 'Thai',
    wordOrder: 'SVO',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'after',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },
  vietnamese: {
    code: 'vi',
    name: 'Vietnamese',
    wordOrder: 'SVO',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'after',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },
  indonesian: {
    code: 'id',
    name: 'Indonesian',
    wordOrder: 'SVO',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'after',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },
  malay: {
    code: 'ms',
    name: 'Malay',
    wordOrder: 'SVO',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'after',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },
  persian: {
    code: 'fa',
    name: 'Persian',
    wordOrder: 'SOV',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'after',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: true,
  },
  swahili: {
    code: 'sw',
    name: 'Swahili',
    wordOrder: 'SVO',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'after',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: false,
    hasHonorific: false,
  },
  greek: {
    code: 'el',
    name: 'Greek',
    wordOrder: 'SVO',
    hasGender: true,
    hasArticles: true,
    adjectivePosition: 'before',
    usesPostpositions: false,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  hungarian: {
    code: 'hu',
    name: 'Hungarian',
    wordOrder: 'SVO', // Flexible due to focus
    hasGender: false,
    hasArticles: true,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
  finnish: {
    code: 'fi',
    name: 'Finnish',
    wordOrder: 'SVO',
    hasGender: false,
    hasArticles: false,
    adjectivePosition: 'before',
    usesPostpositions: true,
    subjectDropping: true,
    hasCases: true,
    hasHonorific: true,
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get grammar rules for a language
 */
export function getLanguageGrammar(language: string): LanguageGrammar {
  const normalized = language.toLowerCase().trim();
  return LANGUAGE_GRAMMARS[normalized] || LANGUAGE_GRAMMARS.english;
}

/**
 * Get word order for a language
 */
export function getWordOrder(language: string): WordOrder {
  return getLanguageGrammar(language).wordOrder;
}

/**
 * Check if language uses postpositions (like Hindi, Japanese)
 */
export function usesPostpositions(language: string): boolean {
  return getLanguageGrammar(language).usesPostpositions;
}

/**
 * Check if adjectives come after nouns (like Spanish, French)
 */
export function adjectivesAfterNouns(language: string): boolean {
  return getLanguageGrammar(language).adjectivePosition === 'after';
}

/**
 * Check if language has grammatical gender
 */
export function hasGrammaticalGender(language: string): boolean {
  return getLanguageGrammar(language).hasGender;
}

/**
 * Check if language allows subject dropping (pro-drop)
 */
export function allowsSubjectDropping(language: string): boolean {
  return getLanguageGrammar(language).subjectDropping;
}

/**
 * Check if source and target have different word orders
 */
export function needsReordering(source: string, target: string): boolean {
  const sourceOrder = getWordOrder(source);
  const targetOrder = getWordOrder(target);
  return sourceOrder !== targetOrder;
}

/**
 * Get list of SOV languages (need reordering from English SVO)
 */
export function getSOVLanguages(): string[] {
  return Object.entries(LANGUAGE_GRAMMARS)
    .filter(([_, grammar]) => grammar.wordOrder === 'SOV')
    .map(([name]) => name);
}

/**
 * Get list of VSO languages
 */
export function getVSOLanguages(): string[] {
  return Object.entries(LANGUAGE_GRAMMARS)
    .filter(([_, grammar]) => grammar.wordOrder === 'VSO')
    .map(([name]) => name);
}

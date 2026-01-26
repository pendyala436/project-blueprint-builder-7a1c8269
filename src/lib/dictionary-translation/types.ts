/**
 * Dictionary-Based Translation System Types
 * ==========================================
 * 
 * Comprehensive type definitions for the enhanced dictionary translation engine
 * with NLP corrections for word-for-word translation issues.
 */

// ============================================================
// CORE TYPES
// ============================================================

export type WordOrder = 'SVO' | 'SOV' | 'VSO' | 'VOS' | 'OVS' | 'OSV';
export type GrammaticalGender = 'masculine' | 'feminine' | 'neuter' | 'common';
export type GrammaticalNumber = 'singular' | 'plural' | 'dual';
export type GrammaticalTense = 'past' | 'present' | 'future' | 'perfect' | 'progressive';
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition' | 'conjunction' | 'interjection' | 'determiner' | 'unknown';

// ============================================================
// TOKEN & ANALYSIS TYPES
// ============================================================

export interface Token {
  text: string;
  normalized: string;
  pos: PartOfSpeech;
  lemma: string;
  features: MorphologicalFeatures;
  index: number;
  isWord: boolean;
}

export interface MorphologicalFeatures {
  gender?: GrammaticalGender;
  number?: GrammaticalNumber;
  tense?: GrammaticalTense;
  person?: 1 | 2 | 3;
  isPlural?: boolean;
  isNegated?: boolean;
  isQuestion?: boolean;
}

export interface SentenceChunk {
  text: string;
  tokens: Token[];
  type: 'main' | 'subordinate' | 'relative' | 'conditional';
  subject?: Token;
  verb?: Token;
  object?: Token;
}

// ============================================================
// DICTIONARY ENTRY TYPES
// ============================================================

export interface DictionaryEntry {
  word: string;
  translations: Record<string, string[]>; // language -> possible translations
  pos: PartOfSpeech;
  senses: WordSense[];
  morphology: MorphologyInfo;
}

export interface WordSense {
  id: string;
  definition: string;
  examples: string[];
  contextClues: string[]; // words that indicate this sense
  translations: Record<string, string>;
}

export interface MorphologyInfo {
  lemma: string;
  irregularForms?: Record<string, string>; // form type -> form
  conjugations?: VerbConjugation;
  declensions?: NounDeclension;
}

export interface VerbConjugation {
  infinitive: string;
  pastSimple: string;
  pastParticiple: string;
  presentParticiple: string;
  thirdPersonSingular: string;
}

export interface NounDeclension {
  singular: string;
  plural: string;
  possessive?: string;
}

// ============================================================
// IDIOM TYPES
// ============================================================

export interface IdiomEntry {
  phrase: string;
  normalizedPhrase: string;
  meaning: string;
  translations: Record<string, string>;
  category: 'idiom' | 'proverb' | 'slang' | 'colloquial';
  register: 'formal' | 'informal' | 'neutral';
}

// ============================================================
// LANGUAGE GRAMMAR RULES
// ============================================================

export interface LanguageGrammar {
  code: string;
  name: string;
  wordOrder: WordOrder;
  hasGender: boolean;
  hasArticles: boolean;
  adjectivePosition: 'before' | 'after';
  usesPostpositions: boolean;
  subjectDropping: boolean;
  hasCases: boolean;
  hasHonorific: boolean;
  sentenceEndParticle?: string;
}

// ============================================================
// TRANSLATION RESULT TYPES
// ============================================================

export interface DictionaryTranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  method: TranslationMethod;
  confidence: number;
  corrections: CorrectionApplied[];
  tokens: Token[];
  englishPivot?: string;
  wasReordered: boolean;
  wasDisambiguated: boolean;
  idiomsFound: string[];
  unknownWords: string[];
  fallbackUsed: boolean;
}

export type TranslationMethod = 
  | 'dictionary-lookup'
  | 'phrase-match'
  | 'idiom-replacement'
  | 'word-by-word'
  | 'morphology-adjusted'
  | 'reordered'
  | 'context-disambiguated'
  | 'post-processed'
  | 'libre-translate-fallback'
  | 'passthrough';

export interface CorrectionApplied {
  type: CorrectionType;
  original: string;
  corrected: string;
  reason: string;
}

export type CorrectionType = 
  | 'word-sense'
  | 'word-order'
  | 'morphology'
  | 'idiom'
  | 'grammar'
  | 'fluency';

// ============================================================
// CHAT TRANSLATION TYPES
// ============================================================

export interface DictionaryChatResult {
  originalText: string;
  senderView: string;
  receiverView: string;
  englishCore: string;
  corrections: CorrectionApplied[];
  confidence: number;
  method: TranslationMethod;
}

// ============================================================
// ENGINE CONFIGURATION
// ============================================================

export interface DictionaryEngineConfig {
  enableIdiomsLookup: boolean;
  enableMorphology: boolean;
  enableReordering: boolean;
  enableDisambiguation: boolean;
  enablePostProcessing: boolean;
  enableLibreTranslateFallback: boolean;
  fallbackConfidenceThreshold: number;
  maxSentenceLength: number;
  cacheTTL: number;
  maxCacheSize: number;
}

export const DEFAULT_ENGINE_CONFIG: DictionaryEngineConfig = {
  enableIdiomsLookup: true,
  enableMorphology: true,
  enableReordering: true,
  enableDisambiguation: true,
  enablePostProcessing: true,
  enableLibreTranslateFallback: true,
  fallbackConfidenceThreshold: 0.4, // Below this, use fallback
  maxSentenceLength: 500,
  cacheTTL: 300000, // 5 minutes
  maxCacheSize: 10000,
};

// ============================================================
// DISAMBIGUATION CONTEXT
// ============================================================

export interface DisambiguationContext {
  surroundingWords: string[];
  sentence: string;
  previousSentence?: string;
  domain?: string; // 'sports', 'finance', 'casual', etc.
}

// ============================================================
// CACHE ENTRY
// ============================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

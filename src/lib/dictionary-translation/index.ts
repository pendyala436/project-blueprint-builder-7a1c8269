/**
 * Dictionary-Based Translation System - Public API
 * =================================================
 * 
 * Comprehensive browser-based translation with:
 * - Dictionary lookup for 100+ languages
 * - Idiom/phrase handling
 * - Morphology (stemming, lemmatization, conjugation)
 * - Word order reordering (SVO ↔ SOV)
 * - Word sense disambiguation
 * - Post-processing for grammar/fluency
 * - LibreTranslate edge function as fallback
 * 
 * @example
 * ```tsx
 * import { translateWithDictionary, translateForChat } from '@/lib/dictionary-translation';
 * 
 * // Basic translation
 * const result = await translateWithDictionary('Hello, how are you?', 'english', 'hindi');
 * console.log(result.text); // "नमस्ते, आप कैसे हैं?"
 * console.log(result.corrections); // Applied corrections
 * console.log(result.idiomsFound); // Replaced idioms
 * 
 * // Chat translation (bidirectional)
 * const chat = await translateForChat('I love you', 'english', 'telugu');
 * console.log(chat.senderView); // "I love you"
 * console.log(chat.receiverView); // "నేను నిన్ను ప్రేమిస్తున్నాను"
 * console.log(chat.englishCore); // "I love you"
 * ```
 */

// ============================================================
// TYPE EXPORTS
// ============================================================

export type {
  // Core types
  WordOrder,
  GrammaticalGender,
  GrammaticalNumber,
  GrammaticalTense,
  PartOfSpeech,
  
  // Token types
  Token,
  MorphologicalFeatures,
  SentenceChunk,
  
  // Dictionary types
  DictionaryEntry,
  WordSense,
  MorphologyInfo,
  VerbConjugation,
  NounDeclension,
  
  // Idiom types
  IdiomEntry,
  
  // Grammar types
  LanguageGrammar,
  
  // Result types
  DictionaryTranslationResult,
  DictionaryChatResult,
  CorrectionApplied,
  TranslationMethod,
  CorrectionType,
  
  // Config types
  DictionaryEngineConfig,
  DisambiguationContext,
  CacheEntry,
} from './types';

export { DEFAULT_ENGINE_CONFIG } from './types';

// ============================================================
// ENGINE EXPORTS (Main API)
// ============================================================

export {
  // Core translation
  translateWithDictionary,
  translateForChat,
  
  // Engine management
  configureEngine,
  getEngineConfig,
  initializeEngine,
  isEngineReady,
  clearCache,
  getCacheStats,
} from './engine';

// ============================================================
// GRAMMAR RULES EXPORTS
// ============================================================

export {
  LANGUAGE_GRAMMARS,
  getLanguageGrammar,
  getWordOrder,
  usesPostpositions,
  adjectivesAfterNouns,
  hasGrammaticalGender,
  allowsSubjectDropping,
  needsReordering,
  getSOVLanguages,
  getVSOLanguages,
} from './grammar-rules';

// ============================================================
// MORPHOLOGY EXPORTS
// ============================================================

export {
  // Stemming & Lemmatization
  stemWord,
  getLemma,
  
  // Pluralization
  pluralize,
  singularize,
  
  // Verb conjugation
  conjugateVerb,
  
  // POS detection
  detectPOS,
  extractFeatures,
  applyMorphology,
} from './morphology';

// ============================================================
// IDIOM DICTIONARY EXPORTS
// ============================================================

export {
  IDIOM_DATABASE,
  lookupIdiom,
  getIdiomTranslation,
  findIdiomsInText,
  replaceIdiomsInText,
  getIdiomsForLanguage,
  getIdiomCount,
} from './idiom-dictionary';

// ============================================================
// DISAMBIGUATION EXPORTS
// ============================================================

export {
  isAmbiguousWord,
  getWordSenses,
  disambiguateWord,
  getTranslationForSense,
  disambiguateAndTranslate,
  getAllAmbiguousWords,
} from './disambiguation';

// ============================================================
// REORDERING EXPORTS
// ============================================================

export {
  tokenize,
  identifySVO,
  reorderSVOtoSOV,
  reorderSOVtoSVO,
  reorderSVOtoVSO,
  moveAdjectivesAfterNouns,
  moveAdjectivesBeforeNouns,
  reorderSentence,
  reorderText,
  tokensToString,
  chunkSentence,
  reconstructFromChunks,
} from './reordering';

// ============================================================
// REACT HOOK
// ============================================================

export { useDictionaryTranslation } from './useDictionaryTranslation';
export type { UseDictionaryTranslationReturn, UseDictionaryTranslationOptions } from './useDictionaryTranslation';

// ============================================================
// DEFAULT EXPORT
// ============================================================

export { translateWithDictionary as default } from './engine';

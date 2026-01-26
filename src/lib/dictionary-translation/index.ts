/**
 * Dictionary-Based Translation System
 * =====================================
 * 
 * Fully database-driven translation with no hardcoded data.
 * No external APIs - pure browser-based translation.
 * 
 * @example
 * ```tsx
 * import { translateWithDictionary, translateForChat } from '@/lib/dictionary-translation';
 * 
 * // Basic translation
 * const result = await translateWithDictionary('Hello, how are you?', 'english', 'hindi');
 * console.log(result.text); // Translation result
 * 
 * // Chat translation (bidirectional)
 * const chat = await translateForChat('I love you', 'english', 'telugu');
 * console.log(chat.receiverView); // Translated for receiver
 * ```
 */

// ============================================================
// TYPE EXPORTS
// ============================================================

export type {
  WordOrder,
  GrammaticalGender,
  GrammaticalNumber,
  GrammaticalTense,
  PartOfSpeech,
  Token,
  MorphologicalFeatures,
  SentenceChunk,
  DictionaryEntry,
  WordSense,
  MorphologyInfo,
  VerbConjugation,
  NounDeclension,
  IdiomEntry,
  LanguageGrammar,
  DictionaryTranslationResult,
  DictionaryChatResult,
  CorrectionApplied,
  TranslationMethod,
  CorrectionType,
  DictionaryEngineConfig,
  DisambiguationContext,
  CacheEntry,
} from './types';

export { DEFAULT_ENGINE_CONFIG } from './types';

// ============================================================
// ENGINE EXPORTS (Main API)
// ============================================================

export {
  translateWithDictionary,
  translateForChat,
  configureEngine,
  getEngineConfig,
  initializeDictionaryEngine,
  isDataLoaded,
} from './engine';

// ============================================================
// DATABASE LOADER EXPORTS
// ============================================================

export {
  initializeDatabaseTranslation,
  loadIdioms,
  loadGrammarRules,
  loadWordSenses,
  refreshAllData,
  getLoadStatus,
} from './database-loader';

// ============================================================
// GRAMMAR RULES EXPORTS
// ============================================================

export {
  getLanguageGrammar,
  getWordOrder,
  usesPostpositions,
  adjectiveFollowsNoun,
  adjectivesAfterNouns,
  hasGrammaticalGender,
  allowsSubjectDropping,
  needsReordering,
  isSOVLanguage,
  isVSOLanguage,
  hasCaseSystem,
  initializeGrammarRules,
} from './grammar-rules';

// ============================================================
// MORPHOLOGY EXPORTS
// ============================================================

export {
  stemWord,
  getLemma,
  pluralize,
  singularize,
  conjugateVerb,
  detectPOS,
  extractFeatures,
} from './morphology';

// ============================================================
// IDIOM DICTIONARY EXPORTS
// ============================================================

export {
  lookupIdiom,
  getIdiomTranslation,
  findIdiomsInText,
  replaceIdiomsInText,
  initializeIdioms,
  isIdiomsLoaded,
} from './idiom-dictionary';

// ============================================================
// DISAMBIGUATION EXPORTS
// ============================================================

export {
  isAmbiguousWord,
  getWordSenseData,
  disambiguateWord,
  getTranslationForSense,
  disambiguateAndTranslate,
  getAllAmbiguousWords,
  initializeWordSenses,
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

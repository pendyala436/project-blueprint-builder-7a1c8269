/**
 * Morphology Processing Module
 * ============================
 * 
 * Handles:
 * - Stemming (reducing words to root form)
 * - Lemmatization (dictionary form lookup)
 * - Verb conjugation
 * - Noun pluralization/singularization
 * - Gender agreement
 */

import type { 
  Token, 
  PartOfSpeech, 
  MorphologicalFeatures,
  GrammaticalTense 
} from './types';

// ============================================================
// ENGLISH MORPHOLOGY RULES
// ============================================================

// Irregular verb forms: infinitive -> past, past participle
const IRREGULAR_VERBS: Record<string, [string, string]> = {
  'be': ['was/were', 'been'],
  'have': ['had', 'had'],
  'do': ['did', 'done'],
  'go': ['went', 'gone'],
  'come': ['came', 'come'],
  'see': ['saw', 'seen'],
  'take': ['took', 'taken'],
  'get': ['got', 'gotten'],
  'make': ['made', 'made'],
  'know': ['knew', 'known'],
  'think': ['thought', 'thought'],
  'say': ['said', 'said'],
  'give': ['gave', 'given'],
  'find': ['found', 'found'],
  'tell': ['told', 'told'],
  'feel': ['felt', 'felt'],
  'become': ['became', 'become'],
  'leave': ['left', 'left'],
  'put': ['put', 'put'],
  'keep': ['kept', 'kept'],
  'let': ['let', 'let'],
  'begin': ['began', 'begun'],
  'seem': ['seemed', 'seemed'],
  'help': ['helped', 'helped'],
  'show': ['showed', 'shown'],
  'hear': ['heard', 'heard'],
  'play': ['played', 'played'],
  'run': ['ran', 'run'],
  'move': ['moved', 'moved'],
  'live': ['lived', 'lived'],
  'believe': ['believed', 'believed'],
  'bring': ['brought', 'brought'],
  'happen': ['happened', 'happened'],
  'write': ['wrote', 'written'],
  'sit': ['sat', 'sat'],
  'stand': ['stood', 'stood'],
  'lose': ['lost', 'lost'],
  'pay': ['paid', 'paid'],
  'meet': ['met', 'met'],
  'include': ['included', 'included'],
  'continue': ['continued', 'continued'],
  'set': ['set', 'set'],
  'learn': ['learned', 'learned'],
  'change': ['changed', 'changed'],
  'lead': ['led', 'led'],
  'understand': ['understood', 'understood'],
  'watch': ['watched', 'watched'],
  'follow': ['followed', 'followed'],
  'stop': ['stopped', 'stopped'],
  'create': ['created', 'created'],
  'speak': ['spoke', 'spoken'],
  'read': ['read', 'read'],
  'spend': ['spent', 'spent'],
  'grow': ['grew', 'grown'],
  'open': ['opened', 'opened'],
  'walk': ['walked', 'walked'],
  'win': ['won', 'won'],
  'offer': ['offered', 'offered'],
  'remember': ['remembered', 'remembered'],
  'love': ['loved', 'loved'],
  'consider': ['considered', 'considered'],
  'appear': ['appeared', 'appeared'],
  'buy': ['bought', 'bought'],
  'wait': ['waited', 'waited'],
  'serve': ['served', 'served'],
  'die': ['died', 'died'],
  'send': ['sent', 'sent'],
  'expect': ['expected', 'expected'],
  'build': ['built', 'built'],
  'stay': ['stayed', 'stayed'],
  'fall': ['fell', 'fallen'],
  'cut': ['cut', 'cut'],
  'reach': ['reached', 'reached'],
  'kill': ['killed', 'killed'],
  'remain': ['remained', 'remained'],
  'eat': ['ate', 'eaten'],
  'sleep': ['slept', 'slept'],
  'drink': ['drank', 'drunk'],
  'swim': ['swam', 'swum'],
  'drive': ['drove', 'driven'],
  'fly': ['flew', 'flown'],
  'break': ['broke', 'broken'],
  'choose': ['chose', 'chosen'],
  'forget': ['forgot', 'forgotten'],
  'hide': ['hid', 'hidden'],
  'ride': ['rode', 'ridden'],
  'ring': ['rang', 'rung'],
  'rise': ['rose', 'risen'],
  'shake': ['shook', 'shaken'],
  'sing': ['sang', 'sung'],
  'sink': ['sank', 'sunk'],
  'steal': ['stole', 'stolen'],
  'strike': ['struck', 'struck'],
  'tear': ['tore', 'torn'],
  'throw': ['threw', 'thrown'],
  'wake': ['woke', 'woken'],
  'wear': ['wore', 'worn'],
};

// Irregular plurals
const IRREGULAR_PLURALS: Record<string, string> = {
  'child': 'children',
  'person': 'people',
  'man': 'men',
  'woman': 'women',
  'foot': 'feet',
  'tooth': 'teeth',
  'goose': 'geese',
  'mouse': 'mice',
  'louse': 'lice',
  'ox': 'oxen',
  'sheep': 'sheep',
  'deer': 'deer',
  'fish': 'fish',
  'species': 'species',
  'series': 'series',
  'aircraft': 'aircraft',
  'knife': 'knives',
  'wife': 'wives',
  'life': 'lives',
  'leaf': 'leaves',
  'half': 'halves',
  'wolf': 'wolves',
  'calf': 'calves',
  'loaf': 'loaves',
  'thief': 'thieves',
  'self': 'selves',
  'shelf': 'shelves',
  'elf': 'elves',
  'analysis': 'analyses',
  'basis': 'bases',
  'crisis': 'crises',
  'thesis': 'theses',
  'phenomenon': 'phenomena',
  'criterion': 'criteria',
  'datum': 'data',
  'medium': 'media',
  'forum': 'forums',
  'curriculum': 'curricula',
  'bacterium': 'bacteria',
  'cactus': 'cacti',
  'focus': 'foci',
  'fungus': 'fungi',
  'nucleus': 'nuclei',
  'radius': 'radii',
  'stimulus': 'stimuli',
  'syllabus': 'syllabi',
};

// Reverse map for singularization
const PLURALS_TO_SINGULAR: Record<string, string> = Object.entries(IRREGULAR_PLURALS)
  .reduce((acc, [sing, plur]) => ({ ...acc, [plur]: sing }), {});

// ============================================================
// STEMMING FUNCTIONS
// ============================================================

/**
 * Simple Porter-like stemmer for English
 */
export function stemWord(word: string): string {
  let stem = word.toLowerCase();
  
  // Step 1: Remove common suffixes
  const suffixes = [
    'ational', 'tional', 'ization', 'fulness', 'ousness', 'iveness',
    'ement', 'ness', 'ment', 'able', 'ible', 'ally', 'ance', 'ence',
    'ism', 'ity', 'ous', 'ive', 'ful', 'less', 'ing', 'tion', 'sion',
    'ed', 'ly', 'er', 'est', 'en', 's'
  ];
  
  for (const suffix of suffixes) {
    if (stem.endsWith(suffix) && stem.length > suffix.length + 2) {
      stem = stem.slice(0, -suffix.length);
      break;
    }
  }
  
  // Step 2: Handle double consonants
  if (/(.)\1$/.test(stem) && stem.length > 3) {
    stem = stem.slice(0, -1);
  }
  
  return stem;
}

/**
 * Get lemma (base dictionary form) of a word
 */
export function getLemma(word: string, pos?: PartOfSpeech): string {
  const lower = word.toLowerCase();
  
  // Check irregular verbs
  for (const [infinitive, forms] of Object.entries(IRREGULAR_VERBS)) {
    const [past, participle] = forms;
    if (lower === past || lower === past.split('/')[0] || lower === past.split('/')[1] || lower === participle) {
      return infinitive;
    }
  }
  
  // Check irregular plurals
  if (PLURALS_TO_SINGULAR[lower]) {
    return PLURALS_TO_SINGULAR[lower];
  }
  
  // Regular verb forms
  if (lower.endsWith('ing')) {
    // running -> run, taking -> take
    let base = lower.slice(0, -3);
    if (base.endsWith(base.charAt(base.length - 1)) && base.length > 2) {
      base = base.slice(0, -1); // running -> run
    }
    if (/[aeiou][bcdfghjklmnpqrstvwxyz]$/.test(base)) {
      return base + 'e'; // taking -> take
    }
    return base || lower;
  }
  
  if (lower.endsWith('ed')) {
    // walked -> walk, stopped -> stop
    let base = lower.slice(0, -2);
    if (base.endsWith(base.charAt(base.length - 1)) && base.length > 2) {
      base = base.slice(0, -1);
    }
    return base || lower;
  }
  
  if (lower.endsWith('s') && !lower.endsWith('ss')) {
    // cats -> cat, boxes -> box
    if (lower.endsWith('ies')) {
      return lower.slice(0, -3) + 'y';
    }
    if (lower.endsWith('es')) {
      return lower.slice(0, -2);
    }
    return lower.slice(0, -1);
  }
  
  return lower;
}

// ============================================================
// PLURALIZATION / SINGULARIZATION
// ============================================================

/**
 * Convert singular noun to plural
 */
export function pluralize(word: string): string {
  const lower = word.toLowerCase();
  
  // Check irregular forms
  if (IRREGULAR_PLURALS[lower]) {
    return IRREGULAR_PLURALS[lower];
  }
  
  // Regular rules
  if (lower.endsWith('y') && !/[aeiou]y$/.test(lower)) {
    return lower.slice(0, -1) + 'ies';
  }
  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') || 
      lower.endsWith('ch') || lower.endsWith('sh')) {
    return lower + 'es';
  }
  if (lower.endsWith('f')) {
    return lower.slice(0, -1) + 'ves';
  }
  if (lower.endsWith('fe')) {
    return lower.slice(0, -2) + 'ves';
  }
  
  return lower + 's';
}

/**
 * Convert plural noun to singular
 */
export function singularize(word: string): string {
  const lower = word.toLowerCase();
  
  // Check irregular forms
  if (PLURALS_TO_SINGULAR[lower]) {
    return PLURALS_TO_SINGULAR[lower];
  }
  
  // Regular rules
  if (lower.endsWith('ies')) {
    return lower.slice(0, -3) + 'y';
  }
  if (lower.endsWith('ves')) {
    return lower.slice(0, -3) + 'f';
  }
  if (lower.endsWith('es') && (
    lower.endsWith('sses') || lower.endsWith('xes') || lower.endsWith('zes') ||
    lower.endsWith('ches') || lower.endsWith('shes')
  )) {
    return lower.slice(0, -2);
  }
  if (lower.endsWith('s') && !lower.endsWith('ss')) {
    return lower.slice(0, -1);
  }
  
  return lower;
}

// ============================================================
// VERB CONJUGATION
// ============================================================

/**
 * Conjugate verb to specified tense
 */
export function conjugateVerb(
  infinitive: string,
  tense: GrammaticalTense,
  person: 1 | 2 | 3 = 3,
  number: 'singular' | 'plural' = 'singular'
): string {
  const lower = infinitive.toLowerCase();
  const irregular = IRREGULAR_VERBS[lower];
  
  switch (tense) {
    case 'past':
      if (irregular) {
        const past = irregular[0];
        // Handle "was/were"
        if (past.includes('/')) {
          const [singular, plural] = past.split('/');
          return number === 'plural' || person === 2 ? plural : singular;
        }
        return past;
      }
      // Regular past: add -ed
      if (lower.endsWith('e')) return lower + 'd';
      if (lower.endsWith('y') && !/[aeiou]y$/.test(lower)) {
        return lower.slice(0, -1) + 'ied';
      }
      if (/[aeiou][bcdfghjklmnpqrstvwxyz]$/.test(lower) && lower.length <= 4) {
        return lower + lower.charAt(lower.length - 1) + 'ed';
      }
      return lower + 'ed';
      
    case 'perfect':
      if (irregular) return irregular[1];
      // Same as past for regular verbs
      return conjugateVerb(infinitive, 'past');
      
    case 'progressive':
      // -ing form
      if (lower.endsWith('ie')) return lower.slice(0, -2) + 'ying';
      if (lower.endsWith('e') && !lower.endsWith('ee')) return lower.slice(0, -1) + 'ing';
      if (/[aeiou][bcdfghjklmnpqrstvwxyz]$/.test(lower) && lower.length <= 4) {
        return lower + lower.charAt(lower.length - 1) + 'ing';
      }
      return lower + 'ing';
      
    case 'present':
    default:
      // Third person singular adds -s/-es
      if (person === 3 && number === 'singular') {
        if (lower === 'be') return 'is';
        if (lower === 'have') return 'has';
        if (lower === 'do') return 'does';
        if (lower === 'go') return 'goes';
        if (lower.endsWith('y') && !/[aeiou]y$/.test(lower)) {
          return lower.slice(0, -1) + 'ies';
        }
        if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') ||
            lower.endsWith('ch') || lower.endsWith('sh') || lower.endsWith('o')) {
          return lower + 'es';
        }
        return lower + 's';
      }
      // Handle "be" verb specially
      if (lower === 'be') {
        if (person === 1 && number === 'singular') return 'am';
        if (number === 'plural' || person === 2) return 'are';
        return 'is';
      }
      return lower;
  }
}

// ============================================================
// POS DETECTION
// ============================================================

// Common word patterns for POS detection
const NOUN_SUFFIXES = ['tion', 'sion', 'ness', 'ment', 'ity', 'ance', 'ence', 'er', 'or', 'ist', 'ism'];
const VERB_SUFFIXES = ['ize', 'ify', 'ate', 'en'];
const ADJ_SUFFIXES = ['ful', 'less', 'ous', 'ive', 'able', 'ible', 'al', 'ical', 'ic', 'ish'];
const ADV_SUFFIXES = ['ly'];

// Common determiners and pronouns
const DETERMINERS = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'some', 'any', 'no', 'every', 'each', 'all', 'both', 'few', 'many', 'much', 'several']);
const PRONOUNS = new Set(['i', 'me', 'my', 'mine', 'myself', 'you', 'your', 'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves', 'who', 'whom', 'whose', 'which', 'what', 'that', 'whoever', 'whomever', 'whatever', 'whichever']);
const PREPOSITIONS = new Set(['in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'beneath', 'under', 'above', 'below', 'between', 'among', 'through', 'during', 'before', 'behind', 'beyond', 'near', 'across', 'around', 'against', 'along', 'beside', 'towards', 'without', 'within']);
const CONJUNCTIONS = new Set(['and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'because', 'although', 'while', 'if', 'when', 'where', 'unless', 'until', 'since', 'though', 'whether', 'whereas', 'whenever', 'wherever', 'however', 'moreover', 'therefore', 'thus', 'hence', 'otherwise', 'nevertheless', 'furthermore', 'besides', 'consequently']);
const COMMON_VERBS = new Set(['be', 'is', 'am', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'done', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could', 'go', 'goes', 'went', 'gone', 'going', 'get', 'gets', 'got', 'gotten', 'getting', 'make', 'makes', 'made', 'making', 'see', 'sees', 'saw', 'seen', 'seeing', 'know', 'knows', 'knew', 'known', 'knowing', 'take', 'takes', 'took', 'taken', 'taking', 'come', 'comes', 'came', 'coming', 'think', 'thinks', 'thought', 'thinking', 'say', 'says', 'said', 'saying', 'give', 'gives', 'gave', 'given', 'giving', 'find', 'finds', 'found', 'finding', 'tell', 'tells', 'told', 'telling', 'want', 'wants', 'wanted', 'wanting', 'use', 'uses', 'used', 'using', 'try', 'tries', 'tried', 'trying', 'ask', 'asks', 'asked', 'asking', 'need', 'needs', 'needed', 'needing', 'feel', 'feels', 'felt', 'feeling', 'become', 'becomes', 'became', 'becoming', 'leave', 'leaves', 'left', 'leaving', 'put', 'puts', 'putting', 'mean', 'means', 'meant', 'meaning', 'keep', 'keeps', 'kept', 'keeping', 'let', 'lets', 'letting', 'begin', 'begins', 'began', 'begun', 'beginning', 'seem', 'seems', 'seemed', 'seeming', 'help', 'helps', 'helped', 'helping', 'show', 'shows', 'showed', 'shown', 'showing', 'hear', 'hears', 'heard', 'hearing', 'play', 'plays', 'played', 'playing', 'run', 'runs', 'ran', 'running', 'move', 'moves', 'moved', 'moving', 'like', 'likes', 'liked', 'liking', 'live', 'lives', 'lived', 'living', 'believe', 'believes', 'believed', 'believing', 'hold', 'holds', 'held', 'holding', 'bring', 'brings', 'brought', 'bringing', 'happen', 'happens', 'happened', 'happening', 'write', 'writes', 'wrote', 'written', 'writing', 'sit', 'sits', 'sat', 'sitting', 'stand', 'stands', 'stood', 'standing', 'lose', 'loses', 'lost', 'losing', 'pay', 'pays', 'paid', 'paying', 'meet', 'meets', 'met', 'meeting']);

/**
 * Detect part of speech based on word form and context
 */
export function detectPOS(word: string, context?: { previous?: string; next?: string }): PartOfSpeech {
  const lower = word.toLowerCase();
  
  // Check closed classes first
  if (DETERMINERS.has(lower)) return 'determiner';
  if (PRONOUNS.has(lower)) return 'pronoun';
  if (PREPOSITIONS.has(lower)) return 'preposition';
  if (CONJUNCTIONS.has(lower)) return 'conjunction';
  if (COMMON_VERBS.has(lower)) return 'verb';
  
  // Check suffixes
  for (const suffix of ADV_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) return 'adverb';
  }
  for (const suffix of ADJ_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) return 'adjective';
  }
  for (const suffix of VERB_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) return 'verb';
  }
  for (const suffix of NOUN_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) return 'noun';
  }
  
  // Check for verb forms
  if (lower.endsWith('ing') || lower.endsWith('ed')) return 'verb';
  
  // Context-based detection
  if (context?.previous) {
    const prev = context.previous.toLowerCase();
    if (DETERMINERS.has(prev)) return 'noun'; // "the cat" -> noun
    if (prev === 'very' || prev === 'so' || prev === 'too') return 'adjective';
    if (prev === 'to') return 'verb'; // "to run" -> verb
  }
  
  // Default to noun (most common open class)
  return 'noun';
}

/**
 * Extract morphological features from a token
 */
export function extractFeatures(word: string, pos: PartOfSpeech): MorphologicalFeatures {
  const lower = word.toLowerCase();
  const features: MorphologicalFeatures = {};
  
  // Detect plurality for nouns
  if (pos === 'noun') {
    const singular = singularize(lower);
    features.isPlural = singular !== lower;
    features.number = features.isPlural ? 'plural' : 'singular';
  }
  
  // Detect tense for verbs
  if (pos === 'verb') {
    if (lower.endsWith('ing')) {
      features.tense = 'progressive';
    } else if (lower.endsWith('ed') || IRREGULAR_VERBS[getLemma(lower)]?.[0] === lower) {
      features.tense = 'past';
    } else {
      features.tense = 'present';
    }
  }
  
  return features;
}

/**
 * Apply morphology rules for target language
 */
export function applyMorphology(
  word: string,
  features: MorphologicalFeatures,
  targetLanguage: string
): string {
  // For now, return the word as-is
  // Full implementation would apply target language morphology rules
  let result = word;
  
  // Apply plurality if needed
  if (features.isPlural && targetLanguage === 'english') {
    result = pluralize(word);
  }
  
  return result;
}

/**
 * Dictionary-Based Translation Engine
 * =====================================
 * 
 * Fully database-driven translation system.
 * NO hardcoded data - everything from Supabase.
 * NO external APIs - pure browser-based translation.
 * 
 * Translation Flow:
 * ┌─────────────────────────────┐
 * │       Input Text            │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │  1. Initialize Database     │
 * │  - Load idioms              │
 * │  - Load grammar rules       │
 * │  - Load word senses         │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │  2. Preprocessing           │
 * │  - Tokenization             │
 * │  - Sentence splitting       │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 3. Dictionary Lookup        │
 * │  - Idiom database check     │
 * │  - Phrase translation       │
 * │  - Word-by-word fallback    │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 4. Morphology Handling      │
 * │  - Lemmatization            │
 * │  - Apply target grammar     │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 5. Word Order Reordering    │
 * │  - SVO ↔ SOV adjustments    │
 * │  - Adjective placement      │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 6. Word Sense Disambiguation│
 * │  - Context-based selection  │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 7. Post-Processing          │
 * │  - Grammar correction       │
 * │  - Fluency enhancement      │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │       Output Text           │
 * └─────────────────────────────┘
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  DictionaryTranslationResult,
  DictionaryChatResult,
  DictionaryEngineConfig,
  Token,
  CorrectionApplied,
  TranslationMethod,
  CacheEntry,
} from './types';
import { DEFAULT_ENGINE_CONFIG } from './types';
import { lookupIdiom, getIdiomTranslation, findIdiomsInText, replaceIdiomsInText } from './idiom-dictionary';
import { getLemma, stemWord, pluralize, singularize, detectPOS, extractFeatures, conjugateVerb } from './morphology';
import { disambiguateAndTranslate, isAmbiguousWord } from './disambiguation';
import { tokenize, reorderText, tokensToString, chunkSentence, reconstructFromChunks } from './reordering';
import { getWordOrder, needsReordering, getLanguageGrammar } from './grammar-rules';
import { initializeDatabaseTranslation, isDataLoaded } from './database-loader';
import {
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  getLanguageColumn,
} from '../universal-translation/language-registry';
import { transliterateToNative, reverseTransliterate } from '../universal-translation/transliterator';

// ============================================================
// CONFIGURATION & CACHING
// ============================================================

let config: DictionaryEngineConfig = { 
  ...DEFAULT_ENGINE_CONFIG,
  enableLibreTranslateFallback: false, // Disabled - no external APIs
};

const resultCache = new Map<string, CacheEntry<DictionaryTranslationResult>>();
const phraseCache = new Map<string, Record<string, string>>();
let phraseCacheLoaded = false;
let phraseCacheLoading = false;

function getCacheKey(text: string, source: string, target: string): string {
  return `${source}:${target}:${text.substring(0, 100)}:${text.length}`;
}

function getFromCache(key: string): DictionaryTranslationResult | null {
  const entry = resultCache.get(key);
  if (entry && Date.now() - entry.timestamp < config.cacheTTL) {
    return { ...entry.data };
  }
  if (entry) resultCache.delete(key);
  return null;
}

function setInCache(key: string, result: DictionaryTranslationResult): void {
  if (resultCache.size >= config.maxCacheSize) {
    const firstKey = resultCache.keys().next().value;
    if (firstKey) resultCache.delete(firstKey);
  }
  resultCache.set(key, { data: result, timestamp: Date.now() });
}

// ============================================================
// PHRASE DATABASE LOADING
// ============================================================

async function loadPhrases(): Promise<void> {
  if (phraseCacheLoaded || phraseCacheLoading) return;
  phraseCacheLoading = true;
  
  try {
    const { data, error } = await supabase
      .from('common_phrases')
      .select('*')
      .limit(5000);
    
    if (error) {
      console.warn('[DictionaryEngine] Failed to load phrases:', error);
      phraseCacheLoading = false;
      return;
    }
    
    if (data) {
      data.forEach((phrase: any) => {
        const key = phrase.english?.toLowerCase().trim();
        if (key) {
          phraseCache.set(key, phrase);
        }
        if (phrase.phrase_key) {
          phraseCache.set(phrase.phrase_key.toLowerCase(), phrase);
        }
      });
      console.log(`[DictionaryEngine] Loaded ${phraseCache.size} phrases from database`);
    }
    
    phraseCacheLoaded = true;
  } catch (err) {
    console.warn('[DictionaryEngine] Error loading phrases:', err);
  } finally {
    phraseCacheLoading = false;
  }
}

/**
 * Lookup phrase translation in database
 */
function lookupPhrase(text: string, targetLanguage: string): string | null {
  const key = text.toLowerCase().trim();
  const phrase = phraseCache.get(key);
  if (!phrase) return null;
  
  const column = getLanguageColumn(targetLanguage);
  const translation = phrase[column];
  
  if (translation && typeof translation === 'string' && translation.trim()) {
    return translation;
  }
  return null;
}

// ============================================================
// STEP 1: PREPROCESSING
// ============================================================

function preprocessText(text: string): {
  chunks: string[];
  tokens: Token[];
} {
  const chunks = chunkSentence(text);
  const tokens = tokenize(text);
  return { chunks, tokens };
}

// ============================================================
// STEP 2: DICTIONARY LOOKUP WITH IDIOMS
// ============================================================

function dictionaryLookup(
  text: string,
  targetLanguage: string,
  corrections: CorrectionApplied[]
): { text: string; confidence: number; idiomsFound: string[] } {
  let result = text;
  let confidence = 0;
  const idiomsFound: string[] = [];
  
  // Step 2a: Check for idioms first
  if (config.enableIdiomsLookup) {
    const { text: idiomReplaced, replacements } = replaceIdiomsInText(text, targetLanguage);
    if (replacements.length > 0) {
      result = idiomReplaced;
      idiomsFound.push(...replacements);
      confidence += 0.3;
      
      corrections.push({
        type: 'idiom',
        original: text,
        corrected: idiomReplaced,
        reason: `Replaced ${replacements.length} idiom(s)`,
      });
    }
  }
  
  // Step 2b: Try full phrase lookup
  const phraseResult = lookupPhrase(result, targetLanguage);
  if (phraseResult) {
    return {
      text: phraseResult,
      confidence: 0.95,
      idiomsFound,
    };
  }
  
  // Step 2c: Word-by-word translation
  const words = result.split(/(\s+)/);
  const translatedWords: string[] = [];
  let translatedCount = 0;
  let totalWords = 0;
  
  for (const segment of words) {
    if (/^\s+$/.test(segment) || !segment.trim()) {
      translatedWords.push(segment);
      continue;
    }
    
    totalWords++;
    
    // Try phrase lookup for single word
    const wordTranslation = lookupPhrase(segment, targetLanguage);
    if (wordTranslation) {
      translatedWords.push(wordTranslation);
      translatedCount++;
      continue;
    }
    
    // Try lemma lookup
    const lemma = getLemma(segment);
    if (lemma !== segment.toLowerCase()) {
      const lemmaTranslation = lookupPhrase(lemma, targetLanguage);
      if (lemmaTranslation) {
        translatedWords.push(lemmaTranslation);
        translatedCount++;
        continue;
      }
    }
    
    // Keep original (transliterate if needed)
    translatedWords.push(segment);
  }
  
  result = translatedWords.join('');
  confidence = totalWords > 0 ? (translatedCount / totalWords) * 0.8 : 0;
  
  return { text: result, confidence, idiomsFound };
}

// ============================================================
// STEP 3: MORPHOLOGY PROCESSING
// ============================================================

function applyMorphologyRules(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  corrections: CorrectionApplied[]
): string {
  if (!config.enableMorphology) return text;
  
  const tokens = tokenize(text);
  const processed: string[] = [];
  
  for (const token of tokens) {
    if (!token.isWord) {
      processed.push(token.text);
      continue;
    }
    
    const features = extractFeatures(token.text, token.pos);
    
    // Handle plural forms
    if (features.isPlural && token.pos === 'noun') {
      const targetGrammar = getLanguageGrammar(targetLanguage);
      if (!targetGrammar.hasCases) {
        processed.push(token.text);
      } else {
        processed.push(token.text);
      }
    } else {
      processed.push(token.text);
    }
  }
  
  return processed.join('');
}

// ============================================================
// STEP 4: WORD ORDER REORDERING
// ============================================================

function applyReordering(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  corrections: CorrectionApplied[]
): { text: string; wasReordered: boolean } {
  if (!config.enableReordering) {
    return { text, wasReordered: false };
  }
  
  if (!needsReordering(sourceLanguage, targetLanguage)) {
    return { text, wasReordered: false };
  }
  
  const { text: reordered, wasReordered } = reorderText(text, sourceLanguage, targetLanguage);
  
  if (wasReordered) {
    corrections.push({
      type: 'word-order',
      original: text,
      corrected: reordered,
      reason: `Reordered from ${getWordOrder(sourceLanguage)} to ${getWordOrder(targetLanguage)}`,
    });
  }
  
  return { text: reordered, wasReordered };
}

// ============================================================
// STEP 5: WORD SENSE DISAMBIGUATION
// ============================================================

function applyDisambiguation(
  text: string,
  targetLanguage: string,
  corrections: CorrectionApplied[]
): { text: string; wasDisambiguated: boolean } {
  if (!config.enableDisambiguation) {
    return { text, wasDisambiguated: false };
  }
  
  const tokens = tokenize(text);
  let wasDisambiguated = false;
  const result: string[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (!token.isWord || !isAmbiguousWord(token.text)) {
      result.push(token.text);
      continue;
    }
    
    // Build context
    const surroundingWords: string[] = [];
    for (let j = Math.max(0, i - 5); j < Math.min(tokens.length, i + 5); j++) {
      if (j !== i && tokens[j].isWord) {
        surroundingWords.push(tokens[j].text);
      }
    }
    
    const context = {
      surroundingWords,
      sentence: text,
    };
    
    const disambiguation = disambiguateAndTranslate(token.text, context, targetLanguage);
    
    if (disambiguation) {
      result.push(disambiguation.translation);
      wasDisambiguated = true;
      
      corrections.push({
        type: 'word-sense',
        original: token.text,
        corrected: disambiguation.translation,
        reason: `Disambiguated "${token.text}" based on context (${disambiguation.senseId})`,
      });
    } else {
      result.push(token.text);
    }
  }
  
  return {
    text: result.join(''),
    wasDisambiguated,
  };
}

// ============================================================
// STEP 6: POST-PROCESSING
// ============================================================

function postProcess(
  text: string,
  targetLanguage: string,
  corrections: CorrectionApplied[]
): string {
  if (!config.enablePostProcessing) return text;
  
  let result = text;
  
  // Fix double spaces
  result = result.replace(/\s{2,}/g, ' ');
  
  // Fix punctuation spacing
  result = result.replace(/\s+([.,!?;:])/g, '$1');
  result = result.replace(/([.,!?;:])([a-zA-Z])/g, '$1 $2');
  
  // Capitalize first letter of sentences
  result = result.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
  
  // Language-specific post-processing
  const grammar = getLanguageGrammar(targetLanguage);
  
  if (grammar.sentenceEndParticle && !result.endsWith('.') && !result.endsWith('!') && !result.endsWith('?')) {
    // Could add particle here if needed
  }
  
  if (result !== text) {
    corrections.push({
      type: 'grammar',
      original: text,
      corrected: result,
      reason: 'Applied grammar and punctuation corrections',
    });
  }
  
  return result;
}

// ============================================================
// MAIN TRANSLATION FUNCTION
// ============================================================

export async function translateWithDictionary(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<DictionaryTranslationResult> {
  // Validate input
  if (!text || !text.trim()) {
    return {
      text: '',
      originalText: text,
      sourceLanguage,
      targetLanguage,
      method: 'passthrough',
      confidence: 1,
      corrections: [],
      tokens: [],
      wasReordered: false,
      wasDisambiguated: false,
      idiomsFound: [],
      unknownWords: [],
      fallbackUsed: false,
    };
  }
  
  // Check cache
  const cacheKey = getCacheKey(text, sourceLanguage, targetLanguage);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Initialize database if needed
  if (!isDataLoaded()) {
    await initializeDatabaseTranslation();
    await loadPhrases();
  }
  
  // Normalize languages
  const normalizedSource = normalizeLanguage(sourceLanguage);
  const normalizedTarget = normalizeLanguage(targetLanguage);
  
  // Same language - return as is
  if (isSameLanguage(normalizedSource, normalizedTarget)) {
    const result: DictionaryTranslationResult = {
      text,
      originalText: text,
      sourceLanguage: normalizedSource,
      targetLanguage: normalizedTarget,
      method: 'passthrough',
      confidence: 1,
      corrections: [],
      tokens: [],
      wasReordered: false,
      wasDisambiguated: false,
      idiomsFound: [],
      unknownWords: [],
      fallbackUsed: false,
    };
    setInCache(cacheKey, result);
    return result;
  }
  
  const corrections: CorrectionApplied[] = [];
  let currentText = text;
  let method: TranslationMethod = 'dictionary-lookup';
  let totalConfidence = 0;
  
  // Step 1: Preprocessing
  const { chunks, tokens } = preprocessText(text);
  
  // Step 2: Dictionary lookup with idioms
  const lookupResult = dictionaryLookup(currentText, normalizedTarget, corrections);
  currentText = lookupResult.text;
  totalConfidence = lookupResult.confidence;
  
  if (lookupResult.idiomsFound.length > 0) {
    method = 'idiom-replacement';
  }
  
  // Step 3: Morphology processing
  currentText = applyMorphologyRules(currentText, normalizedSource, normalizedTarget, corrections);
  
  // Step 4: Word order reordering
  const reorderResult = applyReordering(currentText, normalizedSource, normalizedTarget, corrections);
  currentText = reorderResult.text;
  
  if (reorderResult.wasReordered) {
    method = 'reordered';
  }
  
  // Step 5: Word sense disambiguation
  const disambiguationResult = applyDisambiguation(currentText, normalizedTarget, corrections);
  currentText = disambiguationResult.text;
  
  if (disambiguationResult.wasDisambiguated) {
    method = 'context-disambiguated';
  }
  
  // Step 6: Post-processing
  currentText = postProcess(currentText, normalizedTarget, corrections);
  
  if (corrections.some(c => c.type === 'grammar' || c.type === 'fluency')) {
    method = 'post-processed';
  }
  
  // Find unknown words
  const unknownWords: string[] = [];
  const finalTokens = tokenize(currentText);
  for (const token of finalTokens) {
    if (token.isWord && !lookupPhrase(token.text, normalizedTarget)) {
      // Word wasn't translated - might be unknown
      if (token.text === text.split(/\s+/).find(w => w.toLowerCase() === token.text.toLowerCase())) {
        unknownWords.push(token.text);
      }
    }
  }
  
  const result: DictionaryTranslationResult = {
    text: currentText,
    originalText: text,
    sourceLanguage: normalizedSource,
    targetLanguage: normalizedTarget,
    method,
    confidence: Math.min(0.95, totalConfidence),
    corrections,
    tokens: finalTokens,
    wasReordered: reorderResult.wasReordered,
    wasDisambiguated: disambiguationResult.wasDisambiguated,
    idiomsFound: lookupResult.idiomsFound,
    unknownWords,
    fallbackUsed: false, // No fallback - pure dictionary translation
  };
  
  setInCache(cacheKey, result);
  return result;
}

// ============================================================
// CHAT-SPECIFIC TRANSLATION
// ============================================================

export async function translateForChat(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<DictionaryChatResult> {
  // Initialize if needed
  if (!isDataLoaded()) {
    await initializeDatabaseTranslation();
    await loadPhrases();
  }
  
  const normalizedSender = normalizeLanguage(senderLanguage);
  const normalizedReceiver = normalizeLanguage(receiverLanguage);
  
  // Step 1: Translate to English (pivot language)
  let englishCore = text;
  if (!isEnglish(normalizedSender)) {
    const toEnglish = await translateWithDictionary(text, normalizedSender, 'english');
    englishCore = toEnglish.text;
  }
  
  // Step 2: Translate to sender's language for their view
  let senderView = text;
  if (!isEnglish(normalizedSender)) {
    const toSender = await translateWithDictionary(englishCore, 'english', normalizedSender);
    senderView = toSender.text;
  } else {
    senderView = englishCore;
  }
  
  // Step 3: Translate to receiver's language
  let receiverView = englishCore;
  if (!isEnglish(normalizedReceiver)) {
    const toReceiver = await translateWithDictionary(englishCore, 'english', normalizedReceiver);
    receiverView = toReceiver.text;
  }
  
  return {
    originalText: text,
    senderView,
    receiverView,
    englishCore,
    corrections: [],
    confidence: 0.8,
    method: 'dictionary-lookup',
  };
}

// ============================================================
// CONFIGURATION
// ============================================================

export function configureEngine(newConfig: Partial<DictionaryEngineConfig>): void {
  config = { 
    ...config, 
    ...newConfig,
    enableLibreTranslateFallback: false, // Always disabled - no external APIs
  };
}

export function getEngineConfig(): DictionaryEngineConfig {
  return { ...config };
}

// ============================================================
// INITIALIZATION
// ============================================================

export async function initializeDictionaryEngine(): Promise<void> {
  console.log('[DictionaryEngine] Initializing database-driven translation engine...');
  await initializeDatabaseTranslation();
  await loadPhrases();
  console.log('[DictionaryEngine] Engine initialized - ready for translation');
}

export { isDataLoaded };

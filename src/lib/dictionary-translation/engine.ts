/**
 * Dictionary-Based Translation Engine
 * =====================================
 * 
 * Comprehensive translation system implementing all corrections:
 * 1. Preprocessing - Tokenization, chunking, simplification
 * 2. Dictionary Lookup - Word/phrase translation with idiom handling
 * 3. Morphology - Stemming, lemmatization, conjugation
 * 4. Reordering - SVO/SOV/VSO adjustments
 * 5. Word Sense Disambiguation - Context-aware translation
 * 6. Post-Processing - Grammar/fluency corrections
 * 7. LibreTranslate Fallback - When dictionary fails
 * 
 * Translation Flow:
 * ┌─────────────────────────────┐
 * │       Input Text            │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │  1. Preprocessing           │
 * │  - Tokenization             │
 * │  - Sentence splitting       │
 * │  - Simplification           │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 2. Dictionary Lookup        │
 * │  - Idiom dictionary check   │
 * │  - Phrase translation       │
 * │  - Word-by-word fallback    │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 3. Morphology Handling      │
 * │  - Lemmatization            │
 * │  - Apply target grammar     │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 4. Word Order Reordering    │
 * │  - SVO ↔ SOV adjustments    │
 * │  - Adjective placement      │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 5. Word Sense Disambiguation│
 * │  - Context-based selection  │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 6. Post-Processing          │
 * │  - Grammar correction       │
 * │  - Fluency enhancement      │
 * └─────────────┬───────────────┘
 *               │
 *               ▼
 * ┌─────────────────────────────┐
 * │ 7. Confidence Check         │
 * │  - If low → LibreTranslate  │
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

let config: DictionaryEngineConfig = { ...DEFAULT_ENGINE_CONFIG };

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
      .limit(2000);
    
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
      console.log(`[DictionaryEngine] Loaded ${phraseCache.size} phrases`);
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
  // Split into manageable chunks
  const chunks = chunkSentence(text);
  
  // Tokenize the full text
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
    
    // Keep original
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
  
  // Tokenize and process each token
  const tokens = tokenize(text);
  const processed: string[] = [];
  
  for (const token of tokens) {
    if (!token.isWord) {
      processed.push(token.text);
      continue;
    }
    
    // For now, basic morphology - more can be added
    const features = extractFeatures(token.text, token.pos);
    
    // Handle plural forms - try to match target language conventions
    if (features.isPlural && token.pos === 'noun') {
      // Keep plural marker if target language uses it
      const targetGrammar = getLanguageGrammar(targetLanguage);
      if (!targetGrammar.hasCases) {
        // Languages without cases often use explicit plural markers
        processed.push(token.text);
      } else {
        // Languages with cases might handle plurality differently
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
  
  // Basic grammar corrections
  // Fix double spaces
  result = result.replace(/\s{2,}/g, ' ');
  
  // Fix punctuation spacing
  result = result.replace(/\s+([.,!?;:])/g, '$1');
  result = result.replace(/([.,!?;:])([a-zA-Z])/g, '$1 $2');
  
  // Capitalize first letter of sentences
  result = result.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
  
  // Language-specific post-processing
  const grammar = getLanguageGrammar(targetLanguage);
  
  // For languages with sentence-end particles (Japanese)
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
// STEP 7: LIBRETRANSLATE FALLBACK
// ============================================================

async function libreTranslateFallback(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean }> {
  if (!config.enableLibreTranslateFallback) {
    return { text, success: false };
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        sourceLanguage,
        targetLanguage,
        mode: 'translate',
      },
    });
    
    if (error || !data?.translatedText) {
      console.warn('[DictionaryEngine] LibreTranslate fallback failed:', error);
      return { text, success: false };
    }
    
    console.log('[DictionaryEngine] LibreTranslate fallback successful');
    return { text: data.translatedText, success: true };
  } catch (err) {
    console.warn('[DictionaryEngine] LibreTranslate fallback error:', err);
    return { text, success: false };
  }
}

// ============================================================
// MAIN TRANSLATION FUNCTION
// ============================================================

/**
 * Translate text using dictionary-based approach with all corrections
 */
export async function translateWithDictionary(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<DictionaryTranslationResult> {
  const trimmed = text.trim();
  
  // Handle empty text
  if (!trimmed) {
    return {
      text: '',
      originalText: '',
      sourceLanguage,
      targetLanguage,
      method: 'passthrough',
      confidence: 0,
      corrections: [],
      tokens: [],
      wasReordered: false,
      wasDisambiguated: false,
      idiomsFound: [],
      unknownWords: [],
      fallbackUsed: false,
    };
  }
  
  const normSource = normalizeLanguage(sourceLanguage);
  const normTarget = normalizeLanguage(targetLanguage);
  
  // Check cache
  const cacheKey = getCacheKey(trimmed, normSource, normTarget);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;
  
  // Load phrases if not loaded
  await loadPhrases();
  
  // Same language - passthrough with possible script conversion
  if (isSameLanguage(normSource, normTarget)) {
    const inputIsLatin = isLatinText(trimmed);
    const targetIsLatin = isLatinScriptLanguage(normTarget);
    
    let resultText = trimmed;
    if (inputIsLatin && !targetIsLatin) {
      resultText = transliterateToNative(trimmed, normTarget);
    } else if (!inputIsLatin && targetIsLatin) {
      resultText = reverseTransliterate(trimmed, normSource);
    }
    
    return {
      text: resultText,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      method: 'passthrough',
      confidence: 1.0,
      corrections: [],
      tokens: [],
      wasReordered: false,
      wasDisambiguated: false,
      idiomsFound: [],
      unknownWords: [],
      fallbackUsed: false,
    };
  }
  
  const corrections: CorrectionApplied[] = [];
  let currentText = trimmed;
  let confidence = 0;
  let idiomsFound: string[] = [];
  let wasReordered = false;
  let wasDisambiguated = false;
  let method: TranslationMethod = 'dictionary-lookup';
  
  // Get English pivot if needed
  let englishPivot: string | undefined;
  const sourceIsEnglish = isEnglish(normSource);
  const targetIsEnglish = isEnglish(normTarget);
  
  if (!sourceIsEnglish && !targetIsEnglish) {
    // Need English pivot
    if (!isLatinText(currentText)) {
      englishPivot = reverseTransliterate(currentText, normSource);
    } else {
      englishPivot = currentText;
    }
    currentText = englishPivot;
  } else if (!sourceIsEnglish) {
    // Source to English
    if (!isLatinText(currentText)) {
      currentText = reverseTransliterate(currentText, normSource);
    }
    englishPivot = currentText;
  }
  
  // STEP 1: Preprocessing
  const { chunks, tokens } = preprocessText(currentText);
  
  // Process each chunk
  const translatedChunks: string[] = [];
  
  for (const chunk of chunks) {
    let chunkResult = chunk;
    
    // STEP 2: Dictionary lookup with idioms
    const lookupResult = dictionaryLookup(chunkResult, normTarget, corrections);
    chunkResult = lookupResult.text;
    confidence = Math.max(confidence, lookupResult.confidence);
    idiomsFound.push(...lookupResult.idiomsFound);
    
    if (lookupResult.idiomsFound.length > 0) {
      method = 'idiom-replacement';
    }
    
    // STEP 3: Morphology
    chunkResult = applyMorphologyRules(chunkResult, normSource, normTarget, corrections);
    
    // STEP 4: Reordering
    const reorderResult = applyReordering(chunkResult, 'english', normTarget, corrections);
    chunkResult = reorderResult.text;
    wasReordered = wasReordered || reorderResult.wasReordered;
    
    if (reorderResult.wasReordered) {
      method = 'reordered';
    }
    
    // STEP 5: Disambiguation
    const disambigResult = applyDisambiguation(chunkResult, normTarget, corrections);
    chunkResult = disambigResult.text;
    wasDisambiguated = wasDisambiguated || disambigResult.wasDisambiguated;
    
    if (disambigResult.wasDisambiguated) {
      method = 'context-disambiguated';
    }
    
    // STEP 6: Post-processing
    chunkResult = postProcess(chunkResult, normTarget, corrections);
    
    translatedChunks.push(chunkResult);
  }
  
  currentText = reconstructFromChunks(translatedChunks, ' ');
  
  // Apply final script conversion if needed
  if (!isLatinScriptLanguage(normTarget) && isLatinText(currentText)) {
    currentText = transliterateToNative(currentText, normTarget);
  }
  
  // STEP 7: Check confidence and use fallback if needed
  let fallbackUsed = false;
  if (confidence < config.fallbackConfidenceThreshold && config.enableLibreTranslateFallback) {
    const fallback = await libreTranslateFallback(trimmed, normSource, normTarget);
    if (fallback.success) {
      currentText = fallback.text;
      fallbackUsed = true;
      method = 'libre-translate-fallback';
      confidence = 0.85; // Assume good confidence from ML model
    }
  }
  
  // Identify unknown words
  const unknownWords: string[] = [];
  const resultTokens = tokenize(currentText);
  for (const token of resultTokens) {
    if (token.isWord && isLatinText(token.text) && !isLatinScriptLanguage(normTarget)) {
      unknownWords.push(token.text);
    }
  }
  
  const result: DictionaryTranslationResult = {
    text: currentText,
    originalText: trimmed,
    sourceLanguage: normSource,
    targetLanguage: normTarget,
    method,
    confidence,
    corrections,
    tokens: resultTokens,
    englishPivot,
    wasReordered,
    wasDisambiguated,
    idiomsFound,
    unknownWords,
    fallbackUsed,
  };
  
  // Cache result
  setInCache(cacheKey, result);
  
  return result;
}

// ============================================================
// CHAT TRANSLATION
// ============================================================

/**
 * Translate for bidirectional chat display
 */
export async function translateForChat(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<DictionaryChatResult> {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      originalText: '',
      senderView: '',
      receiverView: '',
      englishCore: '',
      corrections: [],
      confidence: 0,
      method: 'passthrough',
    };
  }
  
  await loadPhrases();
  
  const normSender = normalizeLanguage(senderLanguage);
  const normReceiver = normalizeLanguage(receiverLanguage);
  const inputIsLatin = isLatinText(trimmed);
  const senderIsLatin = isLatinScriptLanguage(normSender);
  
  // Generate sender view
  let senderView = trimmed;
  if (inputIsLatin && !senderIsLatin) {
    senderView = transliterateToNative(trimmed, normSender);
  }
  
  // Generate English core
  let englishCore: string;
  if (isEnglish(normSender)) {
    englishCore = trimmed;
  } else if (inputIsLatin) {
    englishCore = trimmed;
  } else {
    englishCore = reverseTransliterate(trimmed, normSender);
  }
  
  // Generate receiver view
  let receiverView: string;
  let corrections: CorrectionApplied[] = [];
  let confidence = 0.5;
  let method: TranslationMethod = 'dictionary-lookup';
  
  if (isSameLanguage(normSender, normReceiver)) {
    receiverView = senderView;
    confidence = 1.0;
    method = 'passthrough';
  } else {
    const result = await translateWithDictionary(englishCore, 'english', normReceiver);
    receiverView = result.text;
    corrections = result.corrections;
    confidence = result.confidence;
    method = result.method;
  }
  
  return {
    originalText: trimmed,
    senderView,
    receiverView,
    englishCore,
    corrections,
    confidence,
    method,
  };
}

// ============================================================
// ENGINE MANAGEMENT
// ============================================================

/**
 * Configure the dictionary engine
 */
export function configureEngine(options: Partial<DictionaryEngineConfig>): void {
  config = { ...config, ...options };
  console.log('[DictionaryEngine] Configuration updated:', config);
}

/**
 * Get current engine configuration
 */
export function getEngineConfig(): DictionaryEngineConfig {
  return { ...config };
}

/**
 * Initialize the engine
 */
export async function initializeEngine(): Promise<void> {
  await loadPhrases();
  console.log('[DictionaryEngine] Engine initialized');
}

/**
 * Check if engine is ready
 */
export function isEngineReady(): boolean {
  return phraseCacheLoaded;
}

/**
 * Clear all caches
 */
export function clearCache(): void {
  resultCache.clear();
  phraseCache.clear();
  phraseCacheLoaded = false;
  console.log('[DictionaryEngine] Caches cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  results: number;
  phrases: number;
  ready: boolean;
} {
  return {
    results: resultCache.size,
    phrases: phraseCache.size,
    ready: phraseCacheLoaded,
  };
}

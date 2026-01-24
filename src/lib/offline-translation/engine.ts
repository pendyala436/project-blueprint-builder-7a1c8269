/**
 * Offline Translation - Core Engine
 * ==================================
 * 
 * LibreTranslate-inspired offline translation engine.
 * 
 * Translation Rules:
 * 1. Native → Latin: Native → English → Latin
 * 2. Latin → Native: Latin → English → Native
 * 3. Native → Native (different): Native → English → Target Native
 * 4. Latin → Latin: Direct (no English bridge)
 * 5. English as source/target: Direct (no middle language)
 * 
 * English is ALWAYS the bidirectional bridge, EXCEPT:
 * - Both languages are Latin-based
 * - English is already source or target
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  TranslationResult,
  ChatMessageViews,
  TranslationDirection,
  CommonPhraseEntry,
  CacheEntry,
  UserLanguageProfile,
} from './types';
import { TRANSLATION_RULES } from './types';
import {
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  getLanguageColumn,
  detectLanguage,
} from './language-registry';
import {
  transliterateToNative,
  reverseTransliterate,
} from './transliterator';

// ============================================================
// CACHING SYSTEM
// ============================================================

const resultCache = new Map<string, CacheEntry<TranslationResult>>();
const phraseCache = new Map<string, CommonPhraseEntry>();
let phraseCacheLoaded = false;
let phraseCacheLoading = false;

const MAX_CACHE_SIZE = 5000;
const CACHE_TTL = 60000; // 1 minute

function getCacheKey(text: string, source: string, target: string): string {
  const hash = simpleHash(text);
  return `${source}:${target}:${hash}:${text.length}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getFromCache(key: string): TranslationResult | null {
  const entry = resultCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return { ...entry.data, method: 'cached' };
  }
  if (entry) resultCache.delete(key);
  return null;
}

function setInCache(key: string, result: TranslationResult): void {
  if (resultCache.size >= MAX_CACHE_SIZE) {
    const firstKey = resultCache.keys().next().value;
    if (firstKey) resultCache.delete(firstKey);
  }
  resultCache.set(key, { data: result, timestamp: Date.now() });
}

// ============================================================
// PHRASE LOADING FROM DATABASE
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
      console.warn('[OfflineTranslation] Failed to load phrases:', error);
      phraseCacheLoading = false;
      return;
    }
    
    if (data) {
      data.forEach((phrase: CommonPhraseEntry) => {
        const englishKey = phrase.english?.toLowerCase().trim();
        if (englishKey) phraseCache.set(englishKey, phrase);
        if (phrase.phrase_key) {
          phraseCache.set(phrase.phrase_key.toLowerCase(), phrase);
        }
      });
      console.log(`[OfflineTranslation] Loaded ${phraseCache.size} phrases`);
    }
    
    phraseCacheLoaded = true;
  } catch (err) {
    console.warn('[OfflineTranslation] Error loading phrases:', err);
  } finally {
    phraseCacheLoading = false;
  }
}

/**
 * Lookup common phrase in target language
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

/**
 * Lookup English meaning from native text
 */
function lookupEnglishFromNative(text: string, sourceLanguage: string): string | null {
  const column = getLanguageColumn(sourceLanguage);
  
  for (const phrase of phraseCache.values()) {
    const nativeText = phrase[column];
    if (nativeText && typeof nativeText === 'string') {
      if (nativeText.toLowerCase().trim() === text.toLowerCase().trim()) {
        return phrase.english || null;
      }
    }
  }
  return null;
}

// ============================================================
// CORE TRANSLATION FUNCTIONS
// ============================================================

/**
 * Main translation function - translates text between any two languages
 * Follows the translation rules with English as pivot when needed
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  const trimmed = text.trim();
  
  // Handle empty text
  if (!trimmed) {
    return {
      text: '',
      originalText: '',
      sourceLanguage,
      targetLanguage,
      direction: 'passthrough',
      isTranslated: false,
      isTransliterated: false,
      confidence: 0,
      method: 'passthrough',
    };
  }
  
  const normSource = normalizeLanguage(sourceLanguage);
  const normTarget = normalizeLanguage(targetLanguage);
  
  // Check cache first
  const cacheKey = getCacheKey(trimmed, normSource, normTarget);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;
  
  // Ensure phrases are loaded
  await loadPhrases();
  
  // Determine script types
  const sourceIsLatin = isLatinScriptLanguage(normSource);
  const targetIsLatin = isLatinScriptLanguage(normTarget);
  const sourceIsEnglish = isEnglish(normSource);
  const targetIsEnglish = isEnglish(normTarget);
  const sameLang = isSameLanguage(normSource, normTarget);
  const inputIsLatin = isLatinText(trimmed);
  
  // Determine direction
  const direction = TRANSLATION_RULES.determineDirection(
    sourceIsLatin,
    targetIsLatin,
    sourceIsEnglish,
    targetIsEnglish,
    sameLang
  );
  
  let result: TranslationResult;
  
  switch (direction) {
    case 'passthrough':
      result = handlePassthrough(trimmed, normSource, normTarget, inputIsLatin, targetIsLatin);
      break;
    case 'english-source':
      result = await handleEnglishSource(trimmed, normSource, normTarget);
      break;
    case 'english-target':
      result = await handleEnglishTarget(trimmed, normSource, normTarget, inputIsLatin);
      break;
    case 'latin-to-latin':
      result = await handleLatinToLatin(trimmed, normSource, normTarget);
      break;
    case 'latin-to-native':
      result = await handleLatinToNative(trimmed, normSource, normTarget);
      break;
    case 'native-to-latin':
      result = await handleNativeToLatin(trimmed, normSource, normTarget);
      break;
    case 'native-to-native':
      result = await handleNativeToNative(trimmed, normSource, normTarget, inputIsLatin);
      break;
    default:
      result = handlePassthrough(trimmed, normSource, normTarget, inputIsLatin, targetIsLatin);
  }
  
  // Cache result
  if (result.isTranslated || result.isTransliterated) {
    setInCache(cacheKey, result);
  }
  
  return result;
}

// ============================================================
// DIRECTION HANDLERS
// ============================================================

/**
 * Same language - script conversion only
 */
function handlePassthrough(
  text: string,
  source: string,
  target: string,
  inputIsLatin: boolean,
  targetIsLatin: boolean
): TranslationResult {
  let resultText = text;
  let isTransliterated = false;
  
  if (inputIsLatin && !targetIsLatin) {
    resultText = transliterateToNative(text, target);
    isTransliterated = resultText !== text;
  } else if (!inputIsLatin && targetIsLatin) {
    resultText = reverseTransliterate(text, source);
    isTransliterated = resultText !== text;
  }
  
  return {
    text: resultText,
    originalText: text,
    sourceLanguage: source,
    targetLanguage: target,
    direction: 'passthrough',
    isTranslated: false,
    isTransliterated,
    confidence: 1.0,
    method: 'passthrough',
  };
}

/**
 * English is source - direct translation
 */
async function handleEnglishSource(
  text: string,
  source: string,
  target: string
): Promise<TranslationResult> {
  // Try phrase lookup first
  const phraseResult = lookupPhrase(text, target);
  
  if (phraseResult) {
    return {
      text: phraseResult,
      originalText: text,
      sourceLanguage: source,
      targetLanguage: target,
      direction: 'english-source',
      englishPivot: text,
      isTranslated: true,
      isTransliterated: false,
      confidence: 0.95,
      method: 'phrase-lookup',
    };
  }
  
  // Word-by-word translation
  const wordResult = await translateWordByWord(text, target);
  
  // Apply script if needed
  let finalText = wordResult.text;
  if (!isLatinScriptLanguage(target) && isLatinText(finalText)) {
    finalText = transliterateToNative(finalText, target);
  }
  
  return {
    text: finalText,
    originalText: text,
    sourceLanguage: source,
    targetLanguage: target,
    direction: 'english-source',
    englishPivot: text,
    isTranslated: wordResult.translated,
    isTransliterated: finalText !== wordResult.text,
    confidence: wordResult.confidence,
    method: wordResult.translated ? 'word-by-word' : 'transliteration',
  };
}

/**
 * English is target - direct translation
 */
async function handleEnglishTarget(
  text: string,
  source: string,
  target: string,
  inputIsLatin: boolean
): Promise<TranslationResult> {
  // First try to find English meaning from native text
  const englishFromNative = lookupEnglishFromNative(text, source);
  
  if (englishFromNative) {
    return {
      text: englishFromNative,
      originalText: text,
      sourceLanguage: source,
      targetLanguage: target,
      direction: 'english-target',
      isTranslated: true,
      isTransliterated: false,
      confidence: 0.9,
      method: 'phrase-lookup',
    };
  }
  
  // Get Latin representation
  let englishText = text;
  
  if (!inputIsLatin) {
    englishText = reverseTransliterate(text, source);
  }
  
  return {
    text: englishText,
    originalText: text,
    sourceLanguage: source,
    targetLanguage: target,
    direction: 'english-target',
    isTranslated: true,
    isTransliterated: !inputIsLatin,
    confidence: 0.7,
    method: 'direct',
  };
}

/**
 * Latin → Latin - direct translation (no English bridge)
 */
async function handleLatinToLatin(
  text: string,
  source: string,
  target: string
): Promise<TranslationResult> {
  // Direct phrase lookup
  const phraseResult = lookupPhrase(text, target);
  
  if (phraseResult) {
    return {
      text: phraseResult,
      originalText: text,
      sourceLanguage: source,
      targetLanguage: target,
      direction: 'latin-to-latin',
      isTranslated: true,
      isTransliterated: false,
      confidence: 0.9,
      method: 'phrase-lookup',
    };
  }
  
  // Word-by-word
  const wordResult = await translateWordByWord(text, target);
  
  return {
    text: wordResult.text,
    originalText: text,
    sourceLanguage: source,
    targetLanguage: target,
    direction: 'latin-to-latin',
    isTranslated: wordResult.translated,
    isTransliterated: false,
    confidence: wordResult.confidence,
    method: wordResult.translated ? 'word-by-word' : 'direct',
  };
}

/**
 * Latin → Native - via English pivot
 */
async function handleLatinToNative(
  text: string,
  source: string,
  target: string
): Promise<TranslationResult> {
  // Step 1: Treat Latin input as English representation (pivot)
  const englishPivot = text;
  
  // Step 2: Translate to target native via phrase lookup
  const phraseResult = lookupPhrase(englishPivot, target);
  
  if (phraseResult) {
    return {
      text: phraseResult,
      originalText: text,
      sourceLanguage: source,
      targetLanguage: target,
      direction: 'latin-to-native',
      englishPivot,
      isTranslated: true,
      isTransliterated: false,
      confidence: 0.85,
      method: 'english-pivot',
    };
  }
  
  // Word-by-word + transliteration
  const wordResult = await translateWordByWord(englishPivot, target);
  let finalText = wordResult.text;
  
  if (isLatinText(finalText)) {
    finalText = transliterateToNative(finalText, target);
  }
  
  return {
    text: finalText,
    originalText: text,
    sourceLanguage: source,
    targetLanguage: target,
    direction: 'latin-to-native',
    englishPivot,
    isTranslated: wordResult.translated,
    isTransliterated: true,
    confidence: wordResult.confidence,
    method: 'english-pivot',
  };
}

/**
 * Native → Latin - via English pivot
 */
async function handleNativeToLatin(
  text: string,
  source: string,
  target: string
): Promise<TranslationResult> {
  // Step 1: Get English meaning from native
  let englishPivot = lookupEnglishFromNative(text, source);
  
  if (!englishPivot) {
    // Fallback: reverse transliterate
    englishPivot = reverseTransliterate(text, source);
  }
  
  // Step 2: Translate to target Latin language
  const phraseResult = lookupPhrase(englishPivot, target);
  
  if (phraseResult) {
    return {
      text: phraseResult,
      originalText: text,
      sourceLanguage: source,
      targetLanguage: target,
      direction: 'native-to-latin',
      englishPivot,
      isTranslated: true,
      isTransliterated: true,
      confidence: 0.8,
      method: 'english-pivot',
    };
  }
  
  const wordResult = await translateWordByWord(englishPivot, target);
  
  return {
    text: wordResult.text,
    originalText: text,
    sourceLanguage: source,
    targetLanguage: target,
    direction: 'native-to-latin',
    englishPivot,
    isTranslated: wordResult.translated,
    isTransliterated: true,
    confidence: wordResult.confidence,
    method: 'english-pivot',
  };
}

/**
 * Native → Native (different languages) - via English pivot
 */
async function handleNativeToNative(
  text: string,
  source: string,
  target: string,
  inputIsLatin: boolean
): Promise<TranslationResult> {
  // Step 1: Get English representation
  let englishPivot: string;
  
  if (inputIsLatin) {
    // Input is Latin (typed phonetically)
    englishPivot = text;
  } else {
    // Input is native script - get English meaning
    const englishFromNative = lookupEnglishFromNative(text, source);
    englishPivot = englishFromNative || reverseTransliterate(text, source);
  }
  
  // Step 2: Translate to target native
  const phraseResult = lookupPhrase(englishPivot, target);
  
  if (phraseResult) {
    return {
      text: phraseResult,
      originalText: text,
      sourceLanguage: source,
      targetLanguage: target,
      direction: 'native-to-native',
      englishPivot,
      isTranslated: true,
      isTransliterated: !inputIsLatin,
      confidence: 0.85,
      method: 'english-pivot',
    };
  }
  
  // Word-by-word + transliteration
  const wordResult = await translateWordByWord(englishPivot, target);
  let finalText = wordResult.text;
  
  if (isLatinText(finalText) && !isLatinScriptLanguage(target)) {
    finalText = transliterateToNative(finalText, target);
  }
  
  return {
    text: finalText,
    originalText: text,
    sourceLanguage: source,
    targetLanguage: target,
    direction: 'native-to-native',
    englishPivot,
    isTranslated: wordResult.translated,
    isTransliterated: true,
    confidence: wordResult.confidence,
    method: 'english-pivot',
  };
}

// ============================================================
// WORD-BY-WORD TRANSLATION
// ============================================================

async function translateWordByWord(
  text: string,
  targetLanguage: string
): Promise<{ text: string; translated: boolean; confidence: number }> {
  const words = text.split(/(\s+)/);
  const translatedWords: string[] = [];
  let anyTranslated = false;
  let translatedCount = 0;
  let totalWords = 0;
  
  for (const segment of words) {
    // Keep whitespace
    if (/^\s+$/.test(segment)) {
      translatedWords.push(segment);
      continue;
    }
    
    if (!segment.trim()) continue;
    totalWords++;
    
    // Try phrase lookup
    const phraseResult = lookupPhrase(segment, targetLanguage);
    if (phraseResult) {
      translatedWords.push(phraseResult);
      anyTranslated = true;
      translatedCount++;
      continue;
    }
    
    // No translation found - keep original
    translatedWords.push(segment);
  }
  
  return {
    text: translatedWords.join(''),
    translated: anyTranslated,
    confidence: totalWords > 0 ? translatedCount / totalWords : 0,
  };
}

// ============================================================
// PROFILE-BASED CHAT TRANSLATION
// ============================================================

/**
 * Translate chat message based on user profiles
 * Automatically determines direction from mother tongue settings
 */
export async function translateForChat(
  text: string,
  senderProfile: UserLanguageProfile,
  receiverProfile: UserLanguageProfile
): Promise<ChatMessageViews> {
  const trimmed = text.trim();
  const senderLang = normalizeLanguage(senderProfile.motherTongue);
  const receiverLang = normalizeLanguage(receiverProfile.motherTongue);
  
  if (!trimmed) {
    return {
      originalText: '',
      senderView: '',
      receiverView: '',
      englishCore: '',
      senderLanguage: senderLang,
      receiverLanguage: receiverLang,
      direction: 'passthrough',
      wasTranslated: false,
      wasTransliterated: false,
      confidence: 0,
    };
  }
  
  await loadPhrases();
  
  const inputIsLatin = isLatinText(trimmed);
  const senderIsLatin = isLatinScriptLanguage(senderLang);
  const receiverIsLatin = isLatinScriptLanguage(receiverLang);
  const senderIsEnglish = isEnglish(senderLang);
  const receiverIsEnglish = isEnglish(receiverLang);
  const sameLang = isSameLanguage(senderLang, receiverLang);
  
  // Determine direction
  const direction = TRANSLATION_RULES.determineDirection(
    senderIsLatin,
    receiverIsLatin,
    senderIsEnglish,
    receiverIsEnglish,
    sameLang
  );
  
  // Generate sender view (in sender's native script)
  let senderView = trimmed;
  let wasTransliterated = false;
  
  if (inputIsLatin && !senderIsLatin) {
    senderView = transliterateToNative(trimmed, senderLang);
    wasTransliterated = senderView !== trimmed;
  }
  
  // Generate English core (pivot)
  let englishCore: string;
  if (senderIsEnglish) {
    englishCore = trimmed;
  } else if (inputIsLatin) {
    englishCore = trimmed;
  } else {
    const englishFromNative = lookupEnglishFromNative(trimmed, senderLang);
    englishCore = englishFromNative || reverseTransliterate(trimmed, senderLang);
  }
  
  // Generate receiver view
  let receiverView: string;
  let wasTranslated = false;
  
  if (sameLang) {
    receiverView = senderView;
  } else if (receiverIsEnglish) {
    receiverView = englishCore;
    wasTranslated = !senderIsEnglish;
  } else {
    // Translate from English to receiver's language
    const result = await translate(englishCore, 'english', receiverLang);
    receiverView = result.text;
    wasTranslated = result.isTranslated;
  }
  
  return {
    originalText: trimmed,
    senderView,
    receiverView,
    englishCore,
    senderLanguage: senderLang,
    receiverLanguage: receiverLang,
    direction,
    wasTranslated,
    wasTransliterated,
    confidence: wasTranslated ? 0.85 : (wasTransliterated ? 0.9 : 1.0),
  };
}

/**
 * Simple translation between two languages (for non-profile use)
 */
export async function translateSimple(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<ChatMessageViews> {
  const senderProfile: UserLanguageProfile = {
    userId: 'sender',
    gender: 'male',
    motherTongue: senderLanguage,
    scriptType: isLatinScriptLanguage(senderLanguage) ? 'latin' : 'native',
  };
  
  const receiverProfile: UserLanguageProfile = {
    userId: 'receiver',
    gender: 'female',
    motherTongue: receiverLanguage,
    scriptType: isLatinScriptLanguage(receiverLanguage) ? 'latin' : 'native',
  };
  
  return translateForChat(text, senderProfile, receiverProfile);
}

// ============================================================
// LIVE PREVIEW
// ============================================================

/**
 * Get instant native script preview while typing
 */
export function getNativePreview(text: string, targetLanguage: string): string {
  if (!text?.trim()) return '';
  if (isLatinScriptLanguage(targetLanguage)) return text;
  if (!isLatinText(text)) return text;
  return transliterateToNative(text, targetLanguage);
}

/**
 * Get English meaning preview
 */
export async function getEnglishPreview(text: string, sourceLanguage: string): Promise<string> {
  if (!text?.trim()) return '';
  if (isEnglish(sourceLanguage)) return text;
  
  await loadPhrases();
  
  // Try phrase lookup
  const englishFromNative = lookupEnglishFromNative(text, sourceLanguage);
  if (englishFromNative) return englishFromNative;
  
  // Try reverse lookup from Latin input
  if (isLatinText(text)) {
    const phrase = phraseCache.get(text.toLowerCase().trim());
    if (phrase?.english) return phrase.english;
  }
  
  // Fallback: return Latin representation
  if (!isLatinText(text)) {
    return reverseTransliterate(text, sourceLanguage);
  }
  
  return text;
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

export function clearCache(): void {
  resultCache.clear();
  console.log('[OfflineTranslation] Cache cleared');
}

export function clearPhraseCache(): void {
  phraseCache.clear();
  phraseCacheLoaded = false;
  console.log('[OfflineTranslation] Phrase cache cleared');
}

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

// ============================================================
// INITIALIZATION
// ============================================================

export async function initializeEngine(): Promise<void> {
  await loadPhrases();
  console.log('[OfflineTranslation] Engine initialized');
}

export function isEngineReady(): boolean {
  return phraseCacheLoaded;
}

// ============================================================
// UTILITY EXPORTS
// ============================================================

export {
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  detectLanguage,
} from './language-registry';

export {
  transliterateToNative,
  reverseTransliterate,
  getLivePreview,
  hasTransliteration,
} from './transliterator';

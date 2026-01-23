/**
 * LibreTranslate Browser-Based Translation Engine
 * =================================================
 * 
 * Complete browser-based translation system with NO external API calls.
 * NO NLLB-200 - NO HARDCODING - NO EXTERNAL APIs
 * Inspired by: https://github.com/LibreTranslate/LibreTranslate
 * 
 * Features:
 * - Supports all languages from languages.ts
 * - Uses English as pivot for cross-language translation
 * - 3 typing modes: native, english-core, english-meaning
 * - 9 translation combinations
 * - All processing happens in browser using dynamic database lookups
 * 
 * Translation Paths:
 * 1. Same Language: passthrough (no translation)
 * 2. English → Any: direct translation via common_phrases table
 * 3. Any → English: direct translation via common_phrases table
 * 4. Latin → Latin: direct translation
 * 5. Native → Native: English pivot
 * 6. Latin → Native: transliterate + translate if needed
 * 7. Native → Latin: translate + reverse transliterate
 */

import {
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  getLanguageCode,
  detectScript,
} from './language-data';
import { transliterateToNative, reverseTransliterate, getLivePreview } from './transliterator';
import {
  translateUniversal as offlineTranslate,
} from '../translation/universal-offline-engine';
import type {
  TranslationResult,
  ChatMessageViews,
  ChatProcessingOptions,
  TranslationCombination,
  TranslationMode,
  TypingMode,
  CacheEntry,
  TranslatorConfig,
  DEFAULT_CONFIG,
  BidirectionalResult,
} from './types';

// ============================================================
// TRANSLATION CACHE
// ============================================================

const translationCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 2000;
const CACHE_TTL = 60000; // 1 minute

// Simple hash function for cache keys to avoid collisions with long messages
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function getCacheKey(text: string, source: string, target: string): string {
  // Use hash of full text + length to avoid collisions
  return `${source}:${target}:${simpleHash(text)}:${text.length}`;
}

function getFromCache(key: string): TranslationResult | null {
  const entry = translationCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.result;
  }
  if (entry) {
    translationCache.delete(key);
  }
  return null;
}

function setInCache(key: string, result: TranslationResult): void {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(key, { result, timestamp: Date.now() });
}

export function clearCache(): void {
  translationCache.clear();
}

export function getCacheStats(): { size: number; hitRate: number } {
  return { size: translationCache.size, hitRate: 0 };
}

// ============================================================
// CORE TRANSLATION API (Uses Universal Offline Engine)
// NO EXTERNAL API CALLS - ALL PROCESSING IS LOCAL/DATABASE-BASED
// ============================================================

/**
 * Translate using the universal offline engine
 * NO external API calls - uses common_phrases table and dynamic transliteration
 */
async function translateOffline(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ translatedText: string; success: boolean; wasTransliterated: boolean }> {
  try {
    const result = await offlineTranslate(text, sourceLanguage, targetLanguage);
    
    return {
      translatedText: result.text,
      success: result.isTranslated || result.isTransliterated,
      wasTransliterated: result.isTransliterated,
    };
  } catch (err: any) {
    console.error('[LibreTranslate] Offline translation error:', err);
    return { translatedText: text, success: false, wasTransliterated: false };
  }
}

// ============================================================
// MAIN TRANSLATION FUNCTION
// ============================================================

/**
 * Translate text between any two languages
 * Uses English as pivot for non-English pairs
 * ALL PROCESSING IS OFFLINE - NO EXTERNAL API CALLS
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  const trimmed = text.trim();
  
  // Empty text
  if (!trimmed) {
    return {
      text: '',
      originalText: '',
      sourceLanguage,
      targetLanguage,
      isTranslated: false,
      wasTransliterated: false,
      confidence: 0,
      mode: 'passthrough',
    };
  }

  const normSource = normalizeLanguage(sourceLanguage);
  const normTarget = normalizeLanguage(targetLanguage);

  // CASE 1: Same language - passthrough
  if (isSameLanguage(normSource, normTarget)) {
    // Handle script conversion if needed
    const sourceIsLatin = isLatinScriptLanguage(normSource);
    const inputIsLatin = isLatinText(trimmed);
    
    let resultText = trimmed;
    let wasTransliterated = false;
    
    if (inputIsLatin && !sourceIsLatin) {
      // Latin input for non-Latin language - transliterate
      resultText = transliterateToNative(trimmed, normTarget) || trimmed;
      wasTransliterated = resultText !== trimmed;
    }
    
    return {
      text: resultText,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      isTranslated: false,
      wasTransliterated,
      confidence: 1.0,
      mode: 'passthrough',
    };
  }

  // Check cache
  const cacheKey = getCacheKey(trimmed, normSource, normTarget);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const sourceIsEnglish = isEnglish(normSource);
  const targetIsEnglish = isEnglish(normTarget);
  const sourceIsLatin = isLatinScriptLanguage(normSource);
  const targetIsLatin = isLatinScriptLanguage(normTarget);

  let translatedText = trimmed;
  let englishPivot: string | undefined;
  let wasTranslated = false;
  let wasTransliterated = false;
  let mode: TranslationMode = 'direct';

  try {
    // CASE 2: English → Any (direct offline translation)
    if (sourceIsEnglish) {
      const result = await translateOffline(trimmed, normSource, normTarget);
      translatedText = result.translatedText;
      wasTranslated = result.success;
      wasTransliterated = result.wasTransliterated;
      mode = 'direct';
    }
    // CASE 3: Any → English (direct offline translation)
    else if (targetIsEnglish) {
      const result = await translateOffline(trimmed, normSource, normTarget);
      translatedText = result.translatedText;
      wasTranslated = result.success;
      wasTransliterated = result.wasTransliterated;
      mode = 'direct';
    }
    // CASE 4: Latin → Latin (direct offline translation)
    else if (sourceIsLatin && targetIsLatin) {
      const result = await translateOffline(trimmed, normSource, normTarget);
      translatedText = result.translatedText;
      wasTranslated = result.success;
      wasTransliterated = result.wasTransliterated;
      mode = 'direct';
    }
    // CASE 5: Native → Native (English pivot via offline engine)
    else if (!sourceIsLatin && !targetIsLatin) {
      // The offline engine handles English pivot internally
      const result = await translateOffline(trimmed, normSource, normTarget);
      translatedText = result.translatedText;
      wasTranslated = result.success;
      wasTransliterated = result.wasTransliterated;
      mode = 'pivot';
    }
    // CASE 6: Latin source → Native target OR Native source → Latin target
    else {
      const result = await translateOffline(trimmed, normSource, normTarget);
      translatedText = result.translatedText;
      wasTranslated = result.success;
      wasTransliterated = result.wasTransliterated;
      mode = 'direct';
    }
  } catch (err: any) {
    console.error('[LibreTranslate] Translation error:', err);
    translatedText = trimmed;
  }

  const result: TranslationResult = {
    text: translatedText,
    originalText: trimmed,
    sourceLanguage: normSource,
    targetLanguage: normTarget,
    isTranslated: wasTranslated,
    wasTransliterated,
    englishPivot,
    confidence: wasTranslated ? 0.9 : wasTransliterated ? 0.7 : 0.3,
    mode,
  };

  if (wasTranslated || wasTransliterated) {
    setInCache(cacheKey, result);
  }

  return result;
}

// ============================================================
// BIDIRECTIONAL TRANSLATION
// ============================================================

/**
 * Translate in both directions (for chat)
 */
export async function translateBidirectional(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<BidirectionalResult> {
  const forward = await translate(text, sourceLanguage, targetLanguage);
  const backward = await translate(forward.text, targetLanguage, sourceLanguage);
  
  return {
    forward,
    backward,
    englishPivot: forward.englishPivot,
  };
}

// ============================================================
// CHAT MESSAGE PROCESSING (3 Modes × 9 Combinations)
// ============================================================

/**
 * Determine the translation combination based on languages and input
 */
function determineCombination(
  senderLanguage: string,
  receiverLanguage: string,
  inputIsLatin: boolean
): TranslationCombination {
  const senderIsEnglish = isEnglish(senderLanguage);
  const receiverIsEnglish = isEnglish(receiverLanguage);
  const senderIsLatinScript = isLatinScriptLanguage(senderLanguage);
  const receiverIsLatinScript = isLatinScriptLanguage(receiverLanguage);
  const sameLang = isSameLanguage(senderLanguage, receiverLanguage);

  // Same language cases
  if (sameLang) {
    if (inputIsLatin && !senderIsLatinScript) {
      return 'same-latin-native';
    }
    if (!inputIsLatin && senderIsLatinScript) {
      return 'same-native-latin';
    }
    return 'same-native-native';
  }

  // English involved
  if (senderIsEnglish) {
    return 'english-to-any';
  }
  if (receiverIsEnglish) {
    return 'any-to-english';
  }

  // Latin to Latin (different languages)
  if (senderIsLatinScript && receiverIsLatinScript) {
    return 'latin-to-latin';
  }

  // Cross-script cases
  if (inputIsLatin && !receiverIsLatinScript) {
    return 'diff-latin-native';
  }
  if (!inputIsLatin && receiverIsLatinScript) {
    return 'diff-native-latin';
  }

  return 'diff-native-native';
}

/**
 * Process outgoing message for chat (sender's view)
 * Converts Latin input to native script if needed
 */
export function processOutgoing(
  text: string,
  senderLanguage: string
): { senderView: string; wasTransliterated: boolean } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { senderView: '', wasTransliterated: false };
  }

  // If sender uses non-Latin script and input is Latin, transliterate
  if (!isLatinScriptLanguage(senderLanguage) && isLatinText(trimmed)) {
    const converted = transliterateToNative(trimmed, senderLanguage);
    return {
      senderView: converted,
      wasTransliterated: converted !== trimmed,
    };
  }

  return { senderView: trimmed, wasTransliterated: false };
}

/**
 * Process incoming message for receiver
 * Translates from sender's language to receiver's language
 */
export async function processIncoming(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{ receiverView: string; wasTranslated: boolean }> {
  // Same language - no translation needed
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    return { receiverView: text, wasTranslated: false };
  }

  const result = await translate(text, senderLanguage, receiverLanguage);
  return {
    receiverView: result.text,
    wasTranslated: result.isTranslated,
  };
}

/**
 * Process chat message for all 3 modes and 9 combinations
 * Returns views for both sender and receiver
 */
export async function processChatMessage(
  text: string,
  options: ChatProcessingOptions
): Promise<ChatMessageViews> {
  const { senderLanguage, receiverLanguage, typingMode } = options;
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      originalText: '',
      senderView: '',
      receiverView: '',
      wasTransliterated: false,
      wasTranslated: false,
      combination: 'same-native-native',
      typingMode,
    };
  }

  const inputIsLatin = options.inputIsLatin ?? isLatinText(trimmed);
  const combination = determineCombination(senderLanguage, receiverLanguage, inputIsLatin);

  let senderView = trimmed;
  let receiverView = trimmed;
  let senderNative: string | undefined;
  let receiverNative: string | undefined;
  let englishPivot: string | undefined;
  let wasTransliterated = false;
  let wasTranslated = false;

  // Handle based on typing mode - only english-meaning supported
  // English to Native (Meaning-based)
  // Sender types in English, sees their mother tongue after send
  // Receiver sees their mother tongue
  // ALL translations are DIRECT from English (no double translation)
  
  // Store original English as the pivot
  englishPivot = trimmed;
  
  // Translate English → Sender's mother tongue (for sender's view)
  if (!isEnglish(senderLanguage)) {
    const senderResult = await translate(trimmed, 'english', senderLanguage);
    senderView = senderResult.text;
    senderNative = senderView;
    wasTranslated = senderResult.isTranslated;
  } else {
    // Sender's language IS English - they see their English input
    senderView = trimmed;
    senderNative = trimmed;
  }
  // Translate English → Receiver's mother tongue (DIRECTLY from English, not from sender's native)
  if (isEnglish(receiverLanguage)) {
    // Receiver's language IS English - they see English
    receiverView = trimmed;
    receiverNative = trimmed;
  } else if (isSameLanguage(senderLanguage, receiverLanguage)) {
    // Same language - receiver sees same as sender
    receiverView = senderView;
    receiverNative = senderNative;
  } else {
    // DIRECT translation from English → Receiver's language (no intermediate step)
    const receiverResult = await translate(trimmed, 'english', receiverLanguage);
    receiverView = receiverResult.text;
    receiverNative = receiverView;
    wasTranslated = wasTranslated || receiverResult.isTranslated;
  }

  return {
    originalText: trimmed,
    senderView,
    receiverView,
    englishPivot,
    senderNative,
    receiverNative,
    wasTransliterated,
    wasTranslated,
    combination,
    typingMode,
  };
}

// ============================================================
// LIVE PREVIEW (Instant, no async)
// ============================================================

/**
 * Get instant live preview while typing
 * Converts Latin to native script synchronously
 */
export function getInstantPreview(text: string, targetLanguage: string): string {
  return getLivePreview(text, targetLanguage);
}

// ============================================================
// EXPORTS
// ============================================================

export {
  // Language utilities
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  getLanguageCode,
  detectScript,
  
  // Transliteration
  transliterateToNative,
  reverseTransliterate,
  getLivePreview,
};

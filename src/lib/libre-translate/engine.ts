/**
 * LibreTranslate Browser-Based Translation Engine
 * =================================================
 * 
 * WRAPPER for Universal Translation System
 * 
 * This file provides backward compatibility with the existing LibreTranslate
 * interface while using the new Universal Translation engine underneath.
 * 
 * @see src/lib/universal-translation for the new implementation
 * @see https://github.com/LibreTranslate/LibreTranslate
 */

// Re-export everything from the new Universal Translation system
import {
  translate as universalTranslate,
  translateForChat as universalTranslateForChat,
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  getLanguageCode,
  detectScript,
  transliterateToNative,
  reverseTransliterate,
  getLivePreview,
  clearCache as clearUniversalCache,
  getCacheStats as getUniversalCacheStats,
} from '../universal-translation';

import type {
  TranslationResult as UniversalTranslationResult,
  BidirectionalChatResult,
} from '../universal-translation';

import type {
  TranslationResult,
  ChatMessageViews,
  ChatProcessingOptions,
  TranslationCombination,
  TranslationMode,
  TypingMode,
  CacheEntry,
  BidirectionalResult,
} from './types';

// ============================================================
// CACHE FUNCTIONS (Delegated to Universal Translation)
// ============================================================

export function clearCache(): void {
  clearUniversalCache();
}

export function getCacheStats(): { size: number; hitRate: number } {
  const stats = getUniversalCacheStats();
  return { size: stats.results, hitRate: 0 };
}

// ============================================================
// HELPER: Convert Universal Result to LibreTranslate Format
// ============================================================

function convertToLibreResult(
  result: UniversalTranslationResult,
  source: string,
  target: string
): TranslationResult {
  // Map direction to mode
  let mode: TranslationMode = 'passthrough';
  switch (result.direction) {
    case 'passthrough': mode = 'passthrough'; break;
    case 'english-source':
    case 'english-target':
    case 'latin-to-latin': mode = 'direct'; break;
    case 'latin-to-native':
    case 'native-to-latin':
    case 'native-to-native': mode = 'pivot'; break;
  }
  
  return {
    text: result.text,
    originalText: result.originalText,
    sourceLanguage: result.sourceLanguage,
    targetLanguage: result.targetLanguage,
    isTranslated: result.isTranslated,
    wasTransliterated: result.isTransliterated,
    englishPivot: result.englishPivot,
    confidence: result.confidence,
    mode,
  };
}

// ============================================================
// MAIN TRANSLATION FUNCTION
// ============================================================

/**
 * Translate text between any two languages
 * Uses the Universal Translation engine
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

  try {
    // Use the Universal Translation engine
    const result = await universalTranslate(trimmed, sourceLanguage, targetLanguage);
    return convertToLibreResult(result, sourceLanguage, targetLanguage);
  } catch (err: any) {
    console.error('[LibreTranslate] Translation error:', err);
    return {
      text: trimmed,
      originalText: trimmed,
      sourceLanguage: normalizeLanguage(sourceLanguage),
      targetLanguage: normalizeLanguage(targetLanguage),
      isTranslated: false,
      wasTransliterated: false,
      confidence: 0,
      mode: 'passthrough',
    };
  }
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

/**
 * Realtime Chat Translator - Production-ready bi-directional translation
 * Full 300+ language support with ICU-compliant transliteration
 * 
 * Features:
 * - Auto-detect source language (300+ languages, English fallback)
 * - Latin typing with live native preview (ICU transliteration)
 * - Spell correction for better transliteration
 * - Same language = no translation, both see native script
 * - Background translation (non-blocking)
 * - Bi-directional translation
 * - Optimized for scale (lakhs of users)
 */

import { detectLanguage, isSameLanguage, isLatinScript } from './language-detector';
import { transliterate, isTransliterationSupported } from './transliteration';
import { resolveLangCode, normalizeLanguageInput } from './utils';
import { queueTranslation, isWorkerReady, initWorkerTranslator, getQueueStats } from './translation-worker';
import { applySpellCorrections } from './spell-corrections';
import { icuTransliterate, isICUTransliterationSupported } from '@/lib/translation/icu-transliterator';

// ============================================================================
// Types
// ============================================================================

export interface ChatUser {
  id: string;
  language: string; // Mother tongue (e.g., 'hindi', 'telugu', 'english')
}

export interface ProcessedMessage {
  id: string;
  originalInput: string;           // What user typed (Latin or native)
  senderNativeText: string;        // Text in sender's native script
  receiverNativeText: string;      // Text for receiver (translated if needed)
  isTranslated: boolean;           // Was translation performed
  detectedLanguage: string;        // Auto-detected input language
  timestamp: number;
  spellCorrections?: string[];     // Any spelling corrections applied
  transliterationValid?: boolean;  // Was transliteration successful
}

export interface LivePreview {
  input: string;                   // Current Latin input
  nativePreview: string;           // Live native script preview
  isProcessing: boolean;           // Is preview being calculated
  spellCorrected?: boolean;        // Was spell correction applied
}

// ============================================================================
// PERFORMANCE CACHES - Sub-2ms Response Time
// ============================================================================

const previewCache = new Map<string, string>();
const MAX_PREVIEW_CACHE = 5000;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get live transliteration preview as user types (non-blocking)
 * ULTRA-FAST: Aggressive caching for sub-2ms response
 * Returns native script preview for Latin input with spell correction
 * Uses ICU transliteration for all 300+ languages
 */
export function getLiveNativePreview(
  input: string,
  userLanguage: string
): string {
  // Fast path: empty input
  if (!input || input.length === 0) {
    return '';
  }

  // Check cache first (fastest path)
  const cacheKey = `${input}|${userLanguage}`;
  const cached = previewCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Fast path: non-Latin script (no transliteration needed)
  if (!isLatinScript(input)) {
    previewCache.set(cacheKey, input);
    return input;
  }

  const langCode = resolveLangCode(normalizeLanguageInput(userLanguage), 'nllb200');
  
  // Apply spell corrections
  const { correctedText } = applySpellCorrections(input, userLanguage);
  
  let result: string;
  
  // Use ICU transliteration for all 300+ languages
  if (isTransliterationSupported(langCode)) {
    result = transliterate(correctedText, langCode);
  } else if (isICUTransliterationSupported(userLanguage)) {
    result = icuTransliterate(correctedText, userLanguage);
  } else {
    result = input;
  }

  // Cache result with size limit
  if (previewCache.size > MAX_PREVIEW_CACHE) {
    const keysToDelete = Array.from(previewCache.keys()).slice(0, 1000);
    keysToDelete.forEach(k => previewCache.delete(k));
  }
  previewCache.set(cacheKey, result);

  return result;
}

/**
 * Process outgoing message - sender side
 * Called when user sends a message
 * Returns sender's native text immediately, receiver's text via callback
 */
export async function processOutgoingMessage(
  input: string,
  sender: ChatUser,
  receiver: ChatUser,
  onReceiverTextReady?: (text: string) => void
): Promise<ProcessedMessage> {
  const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = Date.now();

  // Auto-detect input language
  const detection = detectLanguage(input, sender.language);
  
  // Apply spell corrections for phonetic input
  const { correctedText, corrections } = applySpellCorrections(input, sender.language);
  const inputToProcess = corrections.length > 0 ? correctedText : input;
  
  // Get sender's native text
  let senderNativeText = inputToProcess;
  const senderLangCode = resolveLangCode(normalizeLanguageInput(sender.language), 'nllb200');
  
  if (detection.isLatinScript && isTransliterationSupported(senderLangCode)) {
    // Convert Latin to sender's native script
    senderNativeText = transliterate(inputToProcess, senderLangCode);
  }

  // Check if sender and receiver have same language
  const sameLang = isSameLanguage(sender.language, receiver.language);

  if (sameLang) {
    // Same language - no translation needed
    // Both see native script
    const receiverLangCode = resolveLangCode(normalizeLanguageInput(receiver.language), 'nllb200');
    let receiverNativeText = senderNativeText;
    
    // If receiver's language uses different script variant, transliterate
    if (isTransliterationSupported(receiverLangCode) && detection.isLatinScript) {
      receiverNativeText = transliterate(inputToProcess, receiverLangCode);
    }

    onReceiverTextReady?.(receiverNativeText);

    return {
      id: messageId,
      originalInput: input,
      senderNativeText,
      receiverNativeText,
      isTranslated: false,
      detectedLanguage: detection.language,
      timestamp,
      spellCorrections: corrections.length > 0 ? corrections : undefined,
      transliterationValid: true,
    };
  }

  // Different languages - translation needed
  // Return sender's view immediately
  const result: ProcessedMessage = {
    id: messageId,
    originalInput: input,
    senderNativeText,
    receiverNativeText: senderNativeText, // Placeholder until translation completes
    isTranslated: true,
    detectedLanguage: detection.language,
    timestamp,
  };

  // Queue translation in background (non-blocking)
  translateInBackground(senderNativeText, sender.language, receiver.language)
    .then(translatedText => {
      result.receiverNativeText = translatedText;
      onReceiverTextReady?.(translatedText);
    })
    .catch(error => {
      console.error('[RealtimeTranslator] Translation failed:', error);
      // Fallback to sender's text
      onReceiverTextReady?.(senderNativeText);
    });

  return result;
}

/**
 * Process incoming message - receiver side
 * Translates message to receiver's language if needed
 */
export async function processIncomingMessage(
  message: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<string> {
  // Check if same language
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    return message; // No translation needed
  }

  try {
    const translated = await translateInBackground(message, senderLanguage, receiverLanguage);
    return translated;
  } catch (error) {
    console.error('[RealtimeTranslator] Incoming translation failed:', error);
    return message; // Fallback to original
  }
}

/**
 * Translate text in background (non-blocking)
 * Uses worker queue for scalability
 */
async function translateInBackground(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  priority: number = 0
): Promise<string> {
  // Ensure worker is initialized
  if (!isWorkerReady()) {
    await initWorkerTranslator();
  }

  return queueTranslation(text, sourceLanguage, targetLanguage, priority);
}

/**
 * Auto-detect language from input text
 */
export function autoDetectLanguage(text: string, hintLanguage?: string) {
  return detectLanguage(text, hintLanguage);
}

/**
 * Check if translation is needed between two users
 */
export function needsTranslation(user1Language: string, user2Language: string): boolean {
  return !isSameLanguage(user1Language, user2Language);
}

/**
 * Get translation system status
 */
export function getTranslatorStatus() {
  const queueStats = getQueueStats();
  return {
    ready: queueStats.ready,
    pendingJobs: queueStats.pending,
    activeJobs: queueStats.active,
  };
}

// ============================================================================
// Preload Model (call on app start for faster first translation)
// ============================================================================

let preloadPromise: Promise<boolean> | null = null;

export function preloadTranslationModel(
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (!preloadPromise) {
    preloadPromise = initWorkerTranslator(undefined, onProgress);
  }
  return preloadPromise;
}

// ============================================================================
// Cleanup
// ============================================================================

export { cleanupWorker as cleanup } from './translation-worker';

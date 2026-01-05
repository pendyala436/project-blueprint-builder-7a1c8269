/**
 * Production Bi-Directional Translator - Full 300+ Language Support
 * 
 * MEMORY-BASED: All state stored in memory for maximum performance
 * No database persistence - pure real-time in-memory processing
 * 
 * Complete real-time, non-blocking chat translation system:
 * 
 * 1. AUTO-DETECT: Automatically detect source and target language
 * 2. LATIN TYPING: Users type in Latin script based on their mother tongue
 * 3. LIVE PREVIEW: Real-time transliteration to native script as user types
 * 4. SAME LANGUAGE: No translation needed, both see native script
 * 5. SENDER VIEW: Sender sees their native script immediately
 * 6. RECEIVER VIEW: Receiver sees translated message in their mother tongue
 * 7. BI-DIRECTIONAL: Both sides type Latin, see native, get translations
 * 8. NON-BLOCKING: All operations run in background, typing is never affected
 * 
 * Supports 300+ languages including:
 * - 44+ Indian languages (all scheduled + regional)
 * - 260+ world languages (European, Asian, African, etc.)
 */

import { detectLanguage, detectLanguageWithMotherTongue, isSameLanguage, isLatinScript, LanguageDetectionResult, DEFAULT_FALLBACK_LANGUAGE, DEFAULT_FALLBACK_CODE } from './language-detector';
import { transliterate, isTransliterationSupported, getLanguageDisplayName } from './transliteration';
import { resolveLangCode, normalizeLanguageInput, isLanguageSupported } from './utils';
import { queueTranslation, isWorkerReady, initWorkerTranslator, getQueueStats, cleanupWorker } from './translation-worker';
import { applySpellCorrections, validateTransliteration } from './spell-corrections';
import { ALL_LANGUAGES, getLanguageByCode, getLanguageByName } from '@/data/dlTranslateLanguages';

// ============================================================================
// MEMORY STORAGE - No Database, Pure In-Memory
// ============================================================================

// In-memory message cache (per session)
const messageCache = new Map<string, BiDirectionalMessage>();

// In-memory translation cache (avoids re-translating same text)
const translationCache = new Map<string, string>();

// Pending translations tracker
const pendingTranslations = new Map<string, {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
}>();

// Session state
let sessionId = `session_${Date.now()}`;

// ============================================================================
// TYPES - Full 300 Language Support (Memory-Based)
// ============================================================================

export interface ChatParticipant {
  id: string;
  motherTongue: string;        // User's native language (e.g., 'Hindi', 'Telugu', 'English')
  motherTongueCode?: string;   // NLLB code (auto-resolved if not provided)
  displayName?: string;
}

export interface BiDirectionalMessage {
  id: string;
  timestamp: number;
  
  // Original input
  originalInput: string;              // Raw text user typed
  inputScript: 'latin' | 'native';    // Script type of input
  
  // Auto-detected info
  detectedLanguage: string;           // Auto-detected input language
  detectedConfidence: number;         // Detection confidence (0-1)
  
  // Sender's view (immediate, non-blocking)
  senderMotherTongue: string;         // Sender's mother tongue
  senderNativeText: string;           // Text in sender's native script
  senderDisplayText: string;          // What sender sees in chat
  
  // Receiver's view (may be async if translation needed)
  receiverMotherTongue: string;       // Receiver's mother tongue
  receiverNativeText: string;         // Text in receiver's native script (translated if needed)
  receiverDisplayText: string;        // What receiver sees in chat
  
  // Status
  needsTranslation: boolean;          // Was translation required?
  translationStatus: 'not_needed' | 'pending' | 'complete' | 'failed';
  
  // Debug info (optional)
  spellCorrections?: string[];
  transliterationValid?: boolean;
  processingTimeMs?: number;
}

export interface LiveTypingPreview {
  currentInput: string;               // Current text being typed
  nativePreview: string;              // Real-time native script preview
  isLatinInput: boolean;              // Is input in Latin script?
  detectedLanguage: string | null;    // Auto-detected language
  isProcessing: boolean;              // Is preview being calculated?
  spellCorrected: boolean;            // Was spell correction applied?
}

export interface TranslatorState {
  isReady: boolean;
  isInitializing: boolean;
  initProgress: number;
  pendingTranslations: number;
  activeTranslations: number;
  supportedLanguages: number;
  cachedTranslations: number;         // Number of cached translations
  cachedMessages: number;             // Number of cached messages
}

export interface TranslationCallbacks {
  onSenderViewReady?: (messageId: string, senderText: string) => void;
  onReceiverViewReady?: (messageId: string, receiverText: string) => void;
  onTranslationError?: (messageId: string, error: Error) => void;
}

// ============================================================================
// CORE: Get Live Native Preview (Non-blocking)
// ============================================================================

/**
 * Get real-time native script preview as user types
 * This is INSTANT and NON-BLOCKING - typing is never affected
 * 
 * @param input - Current text being typed (Latin or native)
 * @param motherTongue - User's mother tongue (e.g., 'Hindi', 'Telugu')
 * @returns Native script preview
 */
export function getLivePreview(
  input: string,
  motherTongue: string
): LiveTypingPreview {
  const startTime = performance.now();
  
  if (!input || input.trim().length === 0) {
    return {
      currentInput: input,
      nativePreview: '',
      isLatinInput: false,
      detectedLanguage: null,
      isProcessing: false,
      spellCorrected: false,
    };
  }

  const isLatin = isLatinScript(input);
  const langCode = resolveLangCode(normalizeLanguageInput(motherTongue), 'nllb200');
  
  let nativePreview = input;
  let spellCorrected = false;
  let detectedLang: string | null = null;

  // Only transliterate Latin input
  if (isLatin) {
    // Apply spell corrections for phonetic input
    const { correctedText, corrections } = applySpellCorrections(input, motherTongue);
    spellCorrected = corrections.length > 0;
    
    const textToProcess = spellCorrected ? correctedText : input;

    // Transliterate to native script
    if (isTransliterationSupported(langCode)) {
      nativePreview = transliterate(textToProcess, langCode);
    }

    // Auto-detect language using mother tongue awareness for better accuracy
    if (input.trim().length > 3) {
      const detection = detectLanguageWithMotherTongue(input, motherTongue);
      detectedLang = detection.language;
    }
  } else {
    // Already in native script
    nativePreview = input;
  }

  const processingTime = performance.now() - startTime;
  
  return {
    currentInput: input,
    nativePreview,
    isLatinInput: isLatin,
    detectedLanguage: detectedLang,
    isProcessing: false, // Synchronous, never blocking
    spellCorrected,
  };
}

// ============================================================================
// CORE: Process Outgoing Message (Sender Side)
// ============================================================================

/**
 * Process message when sender clicks send
 * 
 * CRITICAL: This is NON-BLOCKING
 * - Sender's native text is returned IMMEDIATELY
 * - Translation runs in BACKGROUND
 * - Receiver's text is delivered via callback
 * 
 * @param input - Text user typed
 * @param sender - Sender participant info
 * @param receiver - Receiver participant info
 * @param callbacks - Optional callbacks for async results
 */
export async function processOutgoingMessage(
  input: string,
  sender: ChatParticipant,
  receiver: ChatParticipant,
  callbacks?: TranslationCallbacks
): Promise<BiDirectionalMessage> {
  const startTime = performance.now();
  const messageId = generateMessageId();
  const timestamp = Date.now();
  const trimmedInput = input.trim();

  // Resolve language codes
  const senderLangCode = resolveLangCode(normalizeLanguageInput(sender.motherTongue), 'nllb200');
  const receiverLangCode = resolveLangCode(normalizeLanguageInput(receiver.motherTongue), 'nllb200');

  // Detect input script and language using mother tongue awareness
  const isLatin = isLatinScript(trimmedInput);
  const detection = detectLanguageWithMotherTongue(trimmedInput, sender.motherTongue);

  // Apply spell corrections for phonetic input
  const { correctedText, corrections } = applySpellCorrections(trimmedInput, sender.motherTongue);
  const textToProcess = corrections.length > 0 ? correctedText : trimmedInput;

  // === SENDER'S VIEW (Immediate) ===
  let senderNativeText = textToProcess;
  
  if (isLatin && isTransliterationSupported(senderLangCode)) {
    senderNativeText = transliterate(textToProcess, senderLangCode);
  }

  // Validate transliteration
  let transliterationValid = true;
  if (isLatin) {
    const validation = validateTransliteration(textToProcess, senderNativeText, sender.motherTongue);
    transliterationValid = validation.isValid;
  }

  // Check if translation is needed
  const needsTranslation = !isSameLanguage(sender.motherTongue, receiver.motherTongue);

  // === RECEIVER'S VIEW ===
  let receiverNativeText = senderNativeText;
  let translationStatus: BiDirectionalMessage['translationStatus'] = 'not_needed';

  if (!needsTranslation) {
    // Same language - no translation needed
    // Just transliterate to receiver's script if different
    if (isLatin && isTransliterationSupported(receiverLangCode)) {
      receiverNativeText = transliterate(textToProcess, receiverLangCode);
    }
    
    // Notify immediately
    callbacks?.onSenderViewReady?.(messageId, senderNativeText);
    callbacks?.onReceiverViewReady?.(messageId, receiverNativeText);
  } else {
    // Different languages - translation needed
    translationStatus = 'pending';
    
    // Notify sender's view immediately
    callbacks?.onSenderViewReady?.(messageId, senderNativeText);

    // Queue translation in background (NON-BLOCKING)
    queueBackgroundTranslation(
      senderNativeText,
      sender.motherTongue,
      receiver.motherTongue,
      messageId,
      (translatedText) => {
        callbacks?.onReceiverViewReady?.(messageId, translatedText);
      },
      (error) => {
        callbacks?.onTranslationError?.(messageId, error);
      }
    );
  }

  const processingTime = performance.now() - startTime;

  // Return message object (sender can display immediately)
  return {
    id: messageId,
    timestamp,
    
    originalInput: trimmedInput,
    inputScript: isLatin ? 'latin' : 'native',
    
    detectedLanguage: detection.language,
    detectedConfidence: detection.confidence,
    
    senderMotherTongue: sender.motherTongue,
    senderNativeText,
    senderDisplayText: senderNativeText,
    
    receiverMotherTongue: receiver.motherTongue,
    receiverNativeText,
    receiverDisplayText: receiverNativeText,
    
    needsTranslation,
    translationStatus,
    
    spellCorrections: corrections.length > 0 ? corrections : undefined,
    transliterationValid,
    processingTimeMs: processingTime,
  };
}

// ============================================================================
// CORE: Process Incoming Message (Receiver Side)
// ============================================================================

/**
 * Process message received from another user
 * Translates to receiver's mother tongue if needed
 * 
 * @param message - Message text (in sender's language)
 * @param senderMotherTongue - Sender's mother tongue
 * @param receiverMotherTongue - Receiver's mother tongue
 */
export async function processIncomingMessage(
  message: string,
  senderMotherTongue: string,
  receiverMotherTongue: string
): Promise<string> {
  // Check if same language
  if (isSameLanguage(senderMotherTongue, receiverMotherTongue)) {
    return message; // No translation needed
  }

  // Check translation cache first (memory-based)
  const cacheKey = `${message}|${senderMotherTongue}|${receiverMotherTongue}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached; // Return from memory cache
  }

  try {
    // Ensure translator is ready
    if (!isWorkerReady()) {
      await initWorkerTranslator();
    }

    // Translate in background
    const translated = await queueTranslation(
      message,
      senderMotherTongue,
      receiverMotherTongue,
      5 // High priority for incoming messages
    );

    // Store in memory cache
    translationCache.set(cacheKey, translated);

    return translated;
  } catch (error) {
    console.error('[BiDirectionalTranslator] Incoming translation failed:', error);
    return message; // Fallback to original
  }
}

// ============================================================================
// BACKGROUND TRANSLATION (Non-blocking)
// ============================================================================

/**
 * Queue translation in background without blocking
 * Uses memory cache to avoid re-translating same text
 */
function queueBackgroundTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  messageId: string,
  onSuccess: (translatedText: string) => void,
  onError: (error: Error) => void
): void {
  // Check translation cache first (memory-based)
  const cacheKey = `${text}|${sourceLang}|${targetLang}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    onSuccess(cached);
    return;
  }

  // Start async translation without awaiting
  (async () => {
    try {
      // Ensure translator is ready
      if (!isWorkerReady()) {
        await initWorkerTranslator();
      }

      // Queue translation with high priority
      const translatedText = await queueTranslation(text, sourceLang, targetLang, 10);
      
      // Store in memory cache
      translationCache.set(cacheKey, translatedText);
      
      onSuccess(translatedText);
    } catch (error) {
      console.error('[BiDirectionalTranslator] Background translation failed:', messageId, error);
      onError(error instanceof Error ? error : new Error('Translation failed'));
    }
  })();
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if two users need translation
 */
export function usersNeedTranslation(user1MotherTongue: string, user2MotherTongue: string): boolean {
  return !isSameLanguage(user1MotherTongue, user2MotherTongue);
}

/**
 * Get display name for a language code
 */
export function getLanguageDisplay(languageOrCode: string): string {
  // Try as NLLB code first
  const displayName = getLanguageDisplayName(languageOrCode);
  if (displayName !== languageOrCode) {
    return displayName;
  }
  
  // Try as language name
  const lang = getLanguageByName(languageOrCode);
  if (lang) {
    return lang.nativeName;
  }

  return languageOrCode;
}

/**
 * Check if a language is supported
 */
export function isLanguageSupportedByTranslator(language: string): boolean {
  const code = resolveLangCode(normalizeLanguageInput(language), 'nllb200');
  return isLanguageSupported(code, 'nllb200');
}

/**
 * Get total supported language count
 */
export function getSupportedLanguageCount(): number {
  return ALL_LANGUAGES.length;
}

/**
 * Get translator state
 */
export function getTranslatorState(): TranslatorState {
  const stats = getQueueStats();
  
  return {
    isReady: stats.ready,
    isInitializing: false,
    initProgress: stats.ready ? 100 : 0,
    pendingTranslations: stats.pending,
    activeTranslations: stats.active,
    supportedLanguages: ALL_LANGUAGES.length,
    cachedTranslations: translationCache.size,
    cachedMessages: messageCache.size,
  };
}

/**
 * Initialize translator (call early for faster first translation)
 */
export async function initializeTranslator(
  onProgress?: (progress: number) => void
): Promise<boolean> {
  return initWorkerTranslator(undefined, onProgress);
}

/**
 * Cleanup translator resources and clear memory caches
 */
export function cleanupTranslator(): void {
  cleanupWorker();
  clearMemoryCache();
}

/**
 * Clear all memory caches
 */
export function clearMemoryCache(): void {
  messageCache.clear();
  translationCache.clear();
  pendingTranslations.clear();
}

/**
 * Get message from memory cache
 */
export function getCachedMessage(messageId: string): BiDirectionalMessage | undefined {
  return messageCache.get(messageId);
}

/**
 * Store message in memory cache
 */
export function cacheMessage(message: BiDirectionalMessage): void {
  messageCache.set(message.id, message);
}

/**
 * Get all cached messages
 */
export function getAllCachedMessages(): BiDirectionalMessage[] {
  return Array.from(messageCache.values());
}

/**
 * Clear message cache only
 */
export function clearMessageCache(): void {
  messageCache.clear();
}

/**
 * Clear translation cache only
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { messages: number; translations: number } {
  return {
    messages: messageCache.size,
    translations: translationCache.size,
  };
}

// ============================================================================
// AUTO-DETECTION
// ============================================================================

/**
 * Auto-detect language from text
 */
export function autoDetect(text: string, hintLanguage?: string): LanguageDetectionResult {
  return detectLanguage(text, hintLanguage);
}

/**
 * Check if text is in Latin script
 */
export function isTextLatin(text: string): boolean {
  return isLatinScript(text);
}

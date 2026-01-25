/**
 * Meaning-Based Bidirectional Chat Engine
 * ========================================
 * 
 * OFFLINE ONLY - NO EXTERNAL APIs - NO NLLB-200 - NO DICTIONARY-BASED
 * 
 * Core Principles:
 * 1. Accept ANY input method (keyboard, voice, phonetic, native, mixed)
 * 2. Detect MEANING and INTENT, not script or spelling
 * 3. Never restrict input method or script
 * 4. All input normalized to meaning before processing
 * 5. English is used ONLY as semantic bridge when needed
 * 
 * Message Flow:
 * - Sender types → Meaning extracted → Live preview in sender's mother tongue
 * - On send → Message displayed in sender's mother tongue + English meaning below
 * - Receiver sees → Message in receiver's mother tongue + English meaning below
 * 
 * Same language handling:
 * - If sender and receiver share the same mother tongue, no translation pipeline
 * - Message rendered directly with script conversion if needed
 * 
 * PROFILE INTEGRATION:
 * - Uses user profiles to determine mother tongue
 * - Supports ALL 1000+ languages from languages.ts
 * - Fetches primary_language from profiles table
 */

import {
  translateBidirectionalChat,
  getLiveNativePreview,
  getLiveLatinPreview,
  autoDetectLanguage,
  initializeEngine as initUniversalEngine,
  isEngineReady as isUniversalEngineReady,
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  isRTL,
} from './universal-offline-engine';
import {
  translate as offlineTranslate,
  getNativePreview,
  getEnglishPreview,
} from '../offline-translation/engine';
import {
  type ChatMessageViews,
  type UserLanguageProfile,
} from '../offline-translation/types';
import { languages } from '@/data/languages';
// Phonetic transliteration removed - meaning-based only

// Track engine state
let engineInitialized = false;

// ============================================================
// TYPES
// ============================================================

export interface MeaningBasedMessage {
  // Core message data
  id: string;
  originalInput: string;           // Raw input from user (any method)
  detectedInputType: InputType;    // What kind of input was detected
  
  // Semantic content
  extractedMeaning: string;        // English semantic meaning
  confidence: number;              // Confidence in meaning extraction
  
  // Sender display
  senderView: string;              // Message in sender's mother tongue
  senderScript: 'native' | 'latin';
  
  // Receiver display
  receiverView: string;            // Message in receiver's mother tongue
  receiverScript: 'native' | 'latin';
  
  // Metadata
  senderLanguage: string;
  receiverLanguage: string;
  timestamp: string;
  
  // Flags
  wasTranslated: boolean;
  wasTransliterated: boolean;
  sameLanguage: boolean;
}

export type InputType = 
  | 'pure-english'           // Pure English text
  | 'pure-native'            // Native script (e.g., हिंदी)
  | 'phonetic-latin'         // Native words in Latin letters (e.g., "kaisaho")
  | 'mixed-script'           // Mix of native and Latin
  | 'mixed-language'         // Mix of languages
  | 'unknown';               // Could not determine

export interface LivePreviewResult {
  nativePreview: string;           // Preview in sender's native script
  englishMeaning: string;          // English meaning preview
  receiverPreview: string;         // Preview for receiver (if different language)
  inputType: InputType;
  confidence: number;
}

export interface BidirectionalChatConfig {
  senderProfile: UserLanguageProfile;
  receiverProfile: UserLanguageProfile;
  showEnglishMeaning: boolean;
  enableLivePreview: boolean;
}

// ============================================================
// INPUT TYPE DETECTION
// ============================================================

/**
 * Detect input type based on content analysis
 * Handles: phonetic typing, native script, mixed input, etc.
 */
export function detectInputType(text: string, expectedLanguage: string): InputType {
  if (!text || !text.trim()) return 'unknown';
  
  const trimmed = text.trim();
  const inputIsLatin = isLatinText(trimmed);
  const expectedIsLatin = isLatinScriptLanguage(expectedLanguage);
  
  // Check for pure English - if expected language is English
  if (inputIsLatin && isEnglish(expectedLanguage)) {
    return 'pure-english';
  }
  
  // Check for native script input
  if (!inputIsLatin) {
    // Could still have some Latin mixed in
    const hasLatin = /[a-zA-Z]/.test(trimmed);
    const hasNative = /[^\u0000-\u007F]/.test(trimmed);
    
    if (hasLatin && hasNative) {
      return 'mixed-script';
    }
    
    return 'pure-native';
  }
  
  // Latin input for non-Latin language - need to distinguish English from phonetic
  if (inputIsLatin && !expectedIsLatin) {
    // Common phonetic patterns for Indian languages
    const phoneticPatterns = [
      /\b(kya|kaise|kaisa|tum|mein|aap|yeh|woh|nahi|haan|theek|accha|bahut|aur)\b/i,  // Hindi
      /\b(eppadi|nalla|irukken|irukka|enna|ethu|ithu|athu|vanakkam|romba|illa)\b/i, // Tamil
      /\b(ela|unnavu|nenu|meeru|emi|idi|adi|baaga|chala|ledu|avunu|manchidi)\b/i,   // Telugu
      /\b(kem|cho|su|che|shu|avu|tame|mari|saru|nathi)\b/i,                          // Gujarati
      /\b(kemon|achen|ami|tumi|apni|eta|ota|bhalo|kharap|hobe)\b/i,                  // Bengali
      /\b(hega|idhya|nanu|neenu|yenu|idu|adu|hege|chennaagi|illa|houdu)\b/i,        // Kannada
      /\b(enthanu|ningal|njan|ivan|aval|oru|onnu|nalla|illa|aanu)\b/i,              // Malayalam
      /\b(kasa|aahe|mi|tu|tumhi|ha|ti|te|kay|kas|bara|nahi)\b/i,                    // Marathi
      /\b(ki|haal|tusi|sanu|kyon|kithe|theek|vadiya|nahi)\b/i,                      // Punjabi
      /\b(kemiti|achha|mu|tume|kana|eta|seta|bhala)\b/i,                            // Odia
    ];
    
    // Check if input matches phonetic patterns
    for (const pattern of phoneticPatterns) {
      if (pattern.test(trimmed)) {
        return 'phonetic-latin';
      }
    }
    
    // Common English words/patterns - if these are present, it's likely English
    const commonEnglishPatterns = [
      /\b(the|is|are|was|were|have|has|had|will|would|could|should|can|may|might)\b/i,
      /\b(what|how|why|when|where|who|which|that|this|these|those)\b/i,
      /\b(you|your|i|me|my|we|our|they|their|he|she|it|him|her)\b/i,
      /\b(good|great|nice|fine|okay|yes|no|please|thank|thanks|sorry|hello|hi|bye)\b/i,
      /\b(do|does|did|done|doing|go|going|went|come|coming|came|get|got)\b/i,
      /\b(want|need|like|love|think|know|see|look|feel|make|take|give)\b/i,
      /\b(day|time|today|tomorrow|yesterday|morning|evening|night|week|month|year)\b/i,
      /\b(very|really|just|only|also|too|more|less|much|many|some|any|all)\b/i,
    ];
    
    // Count English word matches
    let englishWordCount = 0;
    for (const pattern of commonEnglishPatterns) {
      const matches = trimmed.match(pattern);
      if (matches) {
        englishWordCount += matches.length;
      }
    }
    
    // If we found multiple common English words, treat as English
    const words = trimmed.split(/\s+/).filter(w => w.length > 1);
    const englishRatio = words.length > 0 ? englishWordCount / words.length : 0;
    
    if (englishWordCount >= 2 || englishRatio >= 0.4) {
      return 'pure-english';
    }
    
    // Single word that looks English (common greetings, words)
    if (words.length <= 2 && /^[a-zA-Z]+$/.test(trimmed)) {
      const singleEnglishWords = /^(hi|hello|hey|bye|yes|no|ok|okay|thanks|thank|please|sorry|good|great|nice|fine|what|how|why|when|where|who)$/i;
      if (singleEnglishWords.test(trimmed.toLowerCase())) {
        return 'pure-english';
      }
    }
    
    // Default: if no phonetic patterns matched but it's Latin text for non-Latin language,
    // assume it's English (user typing in English to a non-English speaker)
    return 'pure-english';
  }
  
  // Latin input for Latin language
  if (inputIsLatin && expectedIsLatin) {
    // Check if it might be a different language
    if (!isEnglish(expectedLanguage)) {
      return 'pure-native'; // It's native for a Latin-script language
    }
    return 'pure-english';
  }
  
  return 'unknown';
}

// ============================================================
// MEANING EXTRACTION
// ============================================================

/**
 * Extract semantic meaning from any input
 * Normalizes all input types to a consistent English representation
 */
export async function extractMeaning(
  text: string,
  sourceLanguage: string,
  forcedInputType?: InputType // Optional: override input detection
): Promise<{ meaning: string; confidence: number; inputType: InputType }> {
  if (!text || !text.trim()) {
    return { meaning: '', confidence: 0, inputType: 'unknown' };
  }
  
  const trimmed = text.trim();
  const inputType = forcedInputType || detectInputType(trimmed, sourceLanguage);
  const normSource = normalizeLanguage(sourceLanguage);
  
  // Ensure engine is ready
  if (!isUniversalEngineReady()) {
    await initUniversalEngine();
  }
  
  let meaning: string;
  let confidence: number;
  
  switch (inputType) {
    case 'pure-english':
      // Input is already in English
      meaning = trimmed;
      confidence = 1.0;
      break;
      
    case 'pure-native':
      // Native script - extract English meaning
      meaning = await getEnglishPreview(trimmed, normSource);
      confidence = 0.85;
      break;
      
    case 'phonetic-latin':
      // Phonetic input - treat as English representation
      // The words typed phonetically represent the meaning
      meaning = trimmed;
      confidence = 0.9;
      break;
      
    case 'mixed-script':
    case 'mixed-language':
      // Mixed input - try to normalize
      const latinParts = trimmed.replace(/[^\u0000-\u007F]/g, ' ').trim();
      const nativeParts = trimmed.replace(/[\u0000-\u007F]/g, ' ').trim();
      
      // Get English meaning from native parts
      const nativeMeaning = nativeParts 
        ? await getEnglishPreview(nativeParts, normSource)
        : '';
      
      // Combine with Latin parts
      meaning = `${latinParts} ${nativeMeaning}`.trim();
      confidence = 0.7;
      break;
      
    default:
      // Unknown - pass through with low confidence
      meaning = trimmed;
      confidence = 0.5;
  }
  
  return { meaning, confidence, inputType };
}

// ============================================================
// LIVE PREVIEW GENERATION - MEANING-BASED ONLY
// ============================================================

/**
 * Generate live preview as user types
 * MEANING-BASED ONLY - NO PHONETIC TRANSLITERATION
 * 
 * In EN mode: English input → Meaning-based translation to native script
 * In NL mode: Native input displayed as-is (no phonetic conversion)
 * 
 * Preview shows translated MEANING in sender's mother tongue, not phonetic sounds
 */
export async function generateLivePreview(
  input: string,
  senderLanguage: string,
  receiverLanguage: string,
  forceEnglishMode?: boolean // Optional: override input detection
): Promise<LivePreviewResult> {
  if (!input || !input.trim()) {
    return {
      nativePreview: '',
      englishMeaning: '',
      receiverPreview: '',
      inputType: 'unknown',
      confidence: 0,
    };
  }
  
  const trimmed = input.trim();
  const normSender = normalizeLanguage(senderLanguage);
  const normReceiver = normalizeLanguage(receiverLanguage);
  const sameLanguage = isSameLanguage(normSender, normReceiver);
  
  // Use forced mode or detect automatically
  const inputType = forceEnglishMode !== undefined
    ? (forceEnglishMode ? 'pure-english' : 'pure-native')
    : detectInputType(trimmed, normSender);
  
  const senderIsEnglish = isEnglish(normSender);
  const senderIsLatin = isLatinScriptLanguage(normSender);
  
  let nativePreview: string;
  let englishMeaning: string;
  let confidence: number;
  
  // MEANING-BASED PREVIEW ONLY
  // No phonetic transliteration - only semantic translation
  
  if (senderIsEnglish) {
    // Sender's mother tongue is English - show as-is
    nativePreview = trimmed;
    englishMeaning = trimmed;
    confidence = 1.0;
  } else if (inputType === 'pure-english' || forceEnglishMode === true) {
    // EN MODE: English input for non-English speaker
    // Translate English MEANING to sender's mother tongue
    englishMeaning = trimmed;
    
    // Get meaning-based translation (NO phonetic transliteration)
    const result = await offlineTranslate(trimmed, 'english', normSender);
    nativePreview = result.text;
    // NO transliteration - keep result as-is (meaning-based only)
    
    confidence = result.confidence || 0.85;
  } else if (inputType === 'pure-native') {
    // Native script input - show as-is
    nativePreview = trimmed;
    englishMeaning = await getEnglishPreview(trimmed, normSender);
    confidence = 0.9;
  } else {
    // Mixed or other input - show as-is
    nativePreview = trimmed;
    englishMeaning = trimmed;
    confidence = 0.7;
  }
  
  // Generate receiver preview if different language
  let receiverPreview = '';
  if (!sameLanguage) {
    if (isEnglish(normReceiver)) {
      receiverPreview = englishMeaning;
    } else {
      // Translate meaning to receiver's language (NO transliteration)
      const result = await offlineTranslate(englishMeaning, 'english', normReceiver);
      receiverPreview = result.text;
      // NO transliteration - keep result as-is
    }
  }
  
  return {
    nativePreview,
    englishMeaning,
    receiverPreview,
    inputType,
    confidence,
  };
}

/**
 * Synchronous native preview for instant feedback
 * MEANING-BASED: Returns input as-is (no phonetic conversion)
 * Real translation happens in async generateLivePreview
 */
export function getInstantNativePreview(
  input: string,
  targetLanguage: string
): string {
  // Return input as-is - no phonetic transliteration
  // The async generateLivePreview will provide meaning-based translation
  return input || '';
}

// ============================================================
// MESSAGE PROCESSING
// ============================================================

/**
 * Process message for bidirectional chat
 * Returns views for both sender and receiver
 */
export async function processMessage(
  input: string,
  senderProfile: UserLanguageProfile,
  receiverProfile: UserLanguageProfile,
  forceEnglishMode?: boolean // Optional: override input detection
): Promise<MeaningBasedMessage> {
  const trimmed = input.trim();
  const timestamp = new Date().toISOString();
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  
  if (!trimmed) {
    return createEmptyMessage(id, senderProfile, receiverProfile, timestamp);
  }
  
  const normSender = normalizeLanguage(senderProfile.motherTongue);
  const normReceiver = normalizeLanguage(receiverProfile.motherTongue);
  const sameLanguage = isSameLanguage(normSender, normReceiver);
  
  // Use forced mode or detect automatically
  const inputType = forceEnglishMode !== undefined
    ? (forceEnglishMode ? 'pure-english' : 'phonetic-latin')
    : detectInputType(trimmed, normSender);
  
  // Extract meaning using the forced input type
  const { meaning, confidence } = await extractMeaning(trimmed, normSender, inputType);
  
  // Determine script types
  const inputIsLatin = isLatinText(trimmed);
  const senderIsLatin = isLatinScriptLanguage(normSender);
  const receiverIsLatin = isLatinScriptLanguage(normReceiver);
  
  // Generate sender view (in sender's mother tongue with appropriate script)
  let senderView: string;
  let senderScript: 'native' | 'latin';
  let wasTransliterated = false;
  
  if (senderIsLatin) {
    senderView = trimmed;
    senderScript = 'latin';
  } else if (inputType === 'pure-english') {
    // English input for non-English speaker - translate meaning (NO transliteration)
    const result = await offlineTranslate(meaning, 'english', normSender);
    senderView = result.text;
    senderScript = isLatinScriptLanguage(normSender) ? 'latin' : 'native';
  } else {
    // Other input types - show as-is (NO transliteration)
    senderView = trimmed;
    senderScript = isLatinScriptLanguage(normSender) ? 'latin' : 'native';
  }
  
  // Generate receiver view
  let receiverView: string;
  let receiverScript: 'native' | 'latin';
  let wasTranslated = false;
  
  if (sameLanguage) {
    // Same language - no translation needed
    receiverView = senderView;
    receiverScript = senderScript;
  } else if (isEnglish(normReceiver)) {
    // Receiver speaks English - use extracted meaning
    receiverView = meaning;
    receiverScript = 'latin';
    wasTranslated = !isEnglish(normSender);
  } else {
    // Different language - translate via meaning (NO transliteration)
    const result = await offlineTranslate(meaning, 'english', normReceiver);
    receiverView = result.text;
    receiverScript = isLatinScriptLanguage(normReceiver) ? 'latin' : 'native';
    wasTranslated = result.isTranslated;
  }
  
  return {
    id,
    originalInput: trimmed,
    detectedInputType: inputType,
    extractedMeaning: meaning,
    confidence,
    senderView,
    senderScript,
    receiverView,
    receiverScript,
    senderLanguage: normSender,
    receiverLanguage: normReceiver,
    timestamp,
    wasTranslated,
    wasTransliterated,
    sameLanguage,
  };
}

function createEmptyMessage(
  id: string,
  senderProfile: UserLanguageProfile,
  receiverProfile: UserLanguageProfile,
  timestamp: string
): MeaningBasedMessage {
  return {
    id,
    originalInput: '',
    detectedInputType: 'unknown',
    extractedMeaning: '',
    confidence: 0,
    senderView: '',
    senderScript: 'latin',
    receiverView: '',
    receiverScript: 'latin',
    senderLanguage: senderProfile.motherTongue,
    receiverLanguage: receiverProfile.motherTongue,
    timestamp,
    wasTranslated: false,
    wasTransliterated: false,
    sameLanguage: false,
  };
}

// ============================================================
// INCOMING MESSAGE PROCESSING
// ============================================================

/**
 * Process incoming message for display to any viewer
 * Handles translation based on viewer's language profile
 * 
 * This function supports bidirectional chat where:
 * - Either party can be sender or receiver
 * - Each viewer sees the message in their mother tongue
 * - English meaning is always available for clarity
 */
export async function processIncomingMessage(
  message: MeaningBasedMessage,
  viewerLanguage: string
): Promise<{ displayText: string; englishMeaning: string; textDirection: 'ltr' | 'rtl' }> {
  const normViewer = normalizeLanguage(viewerLanguage);
  const isSender = isSameLanguage(normViewer, message.senderLanguage);
  const isReceiver = isSameLanguage(normViewer, message.receiverLanguage);
  
  // If viewer is the original sender, show sender view
  if (isSender) {
    return {
      displayText: message.senderView,
      englishMeaning: message.extractedMeaning,
      textDirection: getTextDirection(message.senderLanguage),
    };
  }
  
  // If viewer is the original receiver, show receiver view
  if (isReceiver) {
    return {
      displayText: message.receiverView,
      englishMeaning: message.extractedMeaning,
      textDirection: getTextDirection(message.receiverLanguage),
    };
  }
  
  // Viewer is a third party (e.g., admin viewing chat)
  // Translate meaning to viewer's language
  if (isEnglish(normViewer)) {
    return {
      displayText: message.extractedMeaning,
      englishMeaning: message.extractedMeaning,
      textDirection: 'ltr',
    };
  }
  
  // Translate to viewer's language (NO transliteration)
  const result = await offlineTranslate(message.extractedMeaning, 'english', normViewer);
  const translatedText = result.text;
    
  return {
    displayText: translatedText,
    englishMeaning: message.extractedMeaning,
    textDirection: getTextDirection(normViewer),
  };
}

/**
 * Get the appropriate view of a message for a specific user
 * Symmetric function - works the same whether user was original sender or receiver
 */
export function getMessageViewForUser(
  message: MeaningBasedMessage,
  userLanguage: string
): {
  displayText: string;
  englishMeaning: string;
  textDirection: 'ltr' | 'rtl';
  isOriginalSender: boolean;
} {
  const normUser = normalizeLanguage(userLanguage);
  const isSender = isSameLanguage(normUser, message.senderLanguage);
  
  if (isSender) {
    return {
      displayText: message.senderView,
      englishMeaning: message.extractedMeaning,
      textDirection: getTextDirection(message.senderLanguage),
      isOriginalSender: true,
    };
  }
  
  return {
    displayText: message.receiverView,
    englishMeaning: message.extractedMeaning,
    textDirection: getTextDirection(message.receiverLanguage),
    isOriginalSender: false,
  };
}

// ============================================================
// BATCH MESSAGE PROCESSING
// ============================================================

/**
 * Process multiple messages for a chat conversation
 */
export async function processMessageBatch(
  messages: Array<{ text: string; senderId: string }>,
  participants: Map<string, UserLanguageProfile>
): Promise<MeaningBasedMessage[]> {
  const results: MeaningBasedMessage[] = [];
  
  for (const msg of messages) {
    const senderProfile = participants.get(msg.senderId);
    if (!senderProfile) continue;
    
    // Find receiver (first participant that isn't sender)
    let receiverProfile: UserLanguageProfile | undefined;
    for (const [id, profile] of participants) {
      if (id !== msg.senderId) {
        receiverProfile = profile;
        break;
      }
    }
    
    if (!receiverProfile) continue;
    
    const processed = await processMessage(msg.text, senderProfile, receiverProfile);
    results.push(processed);
  }
  
  return results;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Check if translation is needed between two languages
 */
export function needsTranslation(lang1: string, lang2: string): boolean {
  return !isSameLanguage(normalizeLanguage(lang1), normalizeLanguage(lang2));
}

/**
 * Get appropriate text direction for display
 */
export function getTextDirection(language: string): 'ltr' | 'rtl' {
  return isRTL(normalizeLanguage(language)) ? 'rtl' : 'ltr';
}

/**
 * Format timestamp for display
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// ENGINE INITIALIZATION - With profile language support
// ============================================================

/**
 * Initialize the meaning-based chat engine
 * Loads the universal offline engine with all 1000+ languages
 */
export async function initializeEngine(): Promise<void> {
  if (engineInitialized) return;
  
  await initUniversalEngine();
  engineInitialized = true;
  console.log(`[MeaningBasedChat] Engine ready with ${languages.length} languages`);
}

/**
 * Check if engine is ready
 */
export function isEngineReady(): boolean {
  return engineInitialized && isUniversalEngineReady();
}

/**
 * Get supported language count
 */
export function getSupportedLanguageCount(): number {
  return languages.length;
}

// ============================================================
// EXPORTS
// ============================================================

export {
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  isRTL,
} from './universal-offline-engine';

export type { UserLanguageProfile } from '../offline-translation/types';

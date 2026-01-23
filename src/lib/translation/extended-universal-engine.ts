/**
 * Extended Universal Translation Engine
 * ======================================
 * 
 * Supports input in ANY language (typed or voice)
 * 
 * FLOW:
 * 1. User Input (any language: typed or voice)
 * 2. Language Auto-Detection (Unicode script analysis)
 * 3. Live Preview: Message in sender's mother tongue + detected language shown
 * 4. On Send:
 *    - Sender sees: Native message (large) + English meaning (small)
 *    - Receiver sees: Native message (large) + English meaning (small)
 * 
 * TRANSLATION PIPELINE:
 * Input (any language) → Detect language → English pivot → Sender's native + Receiver's native
 */

import {
  translateUniversal,
  translateBidirectionalChat,
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  dynamicTransliterate,
  reverseTransliterate,
  detectScriptFromText,
  autoDetectLanguage,
} from './universal-offline-engine';

// ============================================================
// TYPES
// ============================================================

export interface DetectedLanguageInfo {
  language: string;           // Detected language name
  script: string;             // Script used (Devanagari, Latin, etc.)
  isLatin: boolean;           // Whether input uses Latin script
  confidence: number;         // Detection confidence (0-1)
  isEnglish: boolean;         // Whether detected as English
}

export interface ExtendedMessageViews {
  // Core message content
  originalInput: string;      // Raw user input (any language)
  detectedLanguage: string;   // Auto-detected input language
  
  // English meaning (pivot for translation)
  englishMeaning: string;     // English semantic meaning
  
  // Sender's view
  senderNativeText: string;   // Sender's mother tongue (large)
  senderEnglishHint: string;  // English meaning for sender (small)
  
  // Receiver's view
  receiverNativeText: string; // Receiver's mother tongue (large)
  receiverEnglishHint: string;// English meaning for receiver (small)
  
  // Translation metadata
  wasTranslated: boolean;
  wasTransliterated: boolean;
  confidence: number;
}

export interface LivePreviewResult {
  nativePreview: string;      // Preview in sender's mother tongue
  detectedLanguage: string;   // Detected input language
  isDetecting: boolean;       // Whether detection is in progress
  confidence: number;
}

// ============================================================
// ENHANCED LANGUAGE DETECTION
// ============================================================

/**
 * Detect language from input text using script analysis
 * Supports 1000+ languages via script detection and fallback mapping
 */
export function detectInputLanguage(text: string): DetectedLanguageInfo {
  if (!text?.trim()) {
    return {
      language: 'english',
      script: 'Latin',
      isLatin: true,
      confidence: 0,
      isEnglish: true,
    };
  }

  const detection = autoDetectLanguage(text);
  
  return {
    language: detection.language,
    script: detection.script,
    isLatin: detection.isLatin,
    confidence: detection.confidence,
    isEnglish: isEnglish(detection.language),
  };
}

// ============================================================
// ENGLISH MEANING EXTRACTION
// ============================================================

/**
 * Extract or translate to English meaning from any language input
 * This is the pivot point for all translations
 */
export async function getEnglishMeaning(
  text: string,
  sourceLanguage: string
): Promise<{ english: string; confidence: number }> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { english: '', confidence: 0 };
  }

  const normSource = normalizeLanguage(sourceLanguage);
  
  // If already English, return as-is
  if (isEnglish(normSource)) {
    return { english: trimmed, confidence: 1.0 };
  }

  // If Latin text but non-English language, might be transliterated
  // Try to use as-is for translation
  const isLatin = isLatinText(trimmed);
  
  try {
    // Translate from source language to English
    const result = await translateUniversal(trimmed, normSource, 'english');
    
    if (result.isTranslated && result.text !== trimmed) {
      return { 
        english: result.text, 
        confidence: result.confidence 
      };
    }
    
    // If no translation happened, try reverse transliteration for non-Latin input
    if (!isLatin) {
      const latinized = reverseTransliterate(trimmed, normSource);
      if (latinized && latinized !== trimmed) {
        // Try translating the latinized version
        const latinResult = await translateUniversal(latinized, 'english', 'english');
        if (latinResult.isTranslated) {
          return {
            english: latinResult.text,
            confidence: latinResult.confidence * 0.8,
          };
        }
        return { english: latinized, confidence: 0.6 };
      }
    }
    
    // Fallback: return as-is
    return { english: result.text || trimmed, confidence: 0.4 };
  } catch (err) {
    console.error('[ExtendedEngine] English extraction error:', err);
    return { english: trimmed, confidence: 0.2 };
  }
}

// ============================================================
// EXTENDED TRANSLATION PIPELINE
// ============================================================

/**
 * Full translation pipeline for multi-language input
 * 
 * Input (any language) → Detect → English pivot → Sender native + Receiver native
 */
export async function translateExtended(
  input: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<ExtendedMessageViews> {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return createEmptyViews();
  }

  const normSender = normalizeLanguage(senderLanguage);
  const normReceiver = normalizeLanguage(receiverLanguage);
  
  // Step 1: Detect input language
  const detection = detectInputLanguage(trimmed);
  const detectedLanguage = detection.language;
  
  console.log('[ExtendedEngine] Input detected:', {
    input: trimmed.substring(0, 50),
    detected: detectedLanguage,
    script: detection.script,
    confidence: detection.confidence,
  });

  // Step 2: Get English meaning (pivot)
  const { english: englishMeaning, confidence: englishConfidence } = 
    await getEnglishMeaning(trimmed, detectedLanguage);
  
  console.log('[ExtendedEngine] English meaning:', englishMeaning);

  // Step 3: Generate sender's native view
  let senderNativeText: string;
  let wasTranslated = false;
  let wasTransliterated = false;
  
  if (isEnglish(normSender)) {
    // Sender's native is English
    senderNativeText = englishMeaning;
  } else if (isSameLanguage(detectedLanguage, normSender)) {
    // Input is already in sender's language
    senderNativeText = trimmed;
    
    // But convert to native script if needed
    if (detection.isLatin && !isLatinScriptLanguage(normSender)) {
      const transliterated = dynamicTransliterate(trimmed, normSender);
      if (transliterated && transliterated !== trimmed) {
        senderNativeText = transliterated;
        wasTransliterated = true;
      }
    }
  } else {
    // Translate from English to sender's native
    const senderResult = await translateUniversal(englishMeaning, 'english', normSender);
    senderNativeText = senderResult.text || englishMeaning;
    wasTranslated = senderResult.isTranslated;
    wasTransliterated = senderResult.isTransliterated;
  }

  // Step 4: Generate receiver's native view
  let receiverNativeText: string;
  
  if (isEnglish(normReceiver)) {
    // Receiver's native is English
    receiverNativeText = englishMeaning;
  } else if (isSameLanguage(normSender, normReceiver)) {
    // Same language - receiver sees same as sender
    receiverNativeText = senderNativeText;
  } else {
    // Translate from English to receiver's native
    const receiverResult = await translateUniversal(englishMeaning, 'english', normReceiver);
    receiverNativeText = receiverResult.text || englishMeaning;
    wasTranslated = wasTranslated || receiverResult.isTranslated;
  }

  // English hints are the same for both (the English meaning)
  const englishHint = englishMeaning;

  return {
    originalInput: trimmed,
    detectedLanguage,
    englishMeaning,
    senderNativeText,
    senderEnglishHint: englishHint,
    receiverNativeText,
    receiverEnglishHint: englishHint,
    wasTranslated,
    wasTransliterated,
    confidence: englishConfidence,
  };
}

// ============================================================
// LIVE PREVIEW GENERATION
// ============================================================

/**
 * Generate live preview as user types
 * Shows message in sender's mother tongue with detected language
 */
export async function generateLivePreview(
  input: string,
  senderLanguage: string
): Promise<LivePreviewResult> {
  if (!input?.trim()) {
    return {
      nativePreview: '',
      detectedLanguage: '',
      isDetecting: false,
      confidence: 0,
    };
  }

  const trimmed = input.trim();
  const normSender = normalizeLanguage(senderLanguage);
  
  // Detect input language
  const detection = detectInputLanguage(trimmed);
  
  // Generate native preview
  let nativePreview = trimmed;
  
  if (isEnglish(normSender)) {
    // Sender's native is English - show as-is or translate to English
    if (!detection.isEnglish) {
      // Input is not English, try to get English meaning
      try {
        const { english } = await getEnglishMeaning(trimmed, detection.language);
        nativePreview = english || trimmed;
      } catch {
        nativePreview = trimmed;
      }
    }
  } else if (isSameLanguage(detection.language, normSender)) {
    // Input is in sender's language
    if (detection.isLatin && !isLatinScriptLanguage(normSender)) {
      // Latin input, non-Latin language - transliterate
      nativePreview = dynamicTransliterate(trimmed, normSender) || trimmed;
    }
  } else {
    // Input is in different language - translate to sender's native
    try {
      const result = await translateUniversal(trimmed, detection.language, normSender);
      nativePreview = result.text || trimmed;
    } catch {
      nativePreview = trimmed;
    }
  }

  return {
    nativePreview,
    detectedLanguage: detection.language,
    isDetecting: false,
    confidence: detection.confidence,
  };
}

// ============================================================
// RECEIVER PREVIEW GENERATION
// ============================================================

/**
 * Generate preview of what receiver will see
 */
export async function generateReceiverPreview(
  input: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{ preview: string; englishMeaning: string }> {
  if (!input?.trim()) {
    return { preview: '', englishMeaning: '' };
  }

  const normReceiver = normalizeLanguage(receiverLanguage);
  
  // Detect input language
  const detection = detectInputLanguage(input);
  
  // Get English meaning
  const { english: englishMeaning } = await getEnglishMeaning(input, detection.language);
  
  // If receiver's native is English
  if (isEnglish(normReceiver)) {
    return { preview: englishMeaning, englishMeaning };
  }
  
  // Translate to receiver's native
  const result = await translateUniversal(englishMeaning, 'english', normReceiver);
  
  return {
    preview: result.text || englishMeaning,
    englishMeaning,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function createEmptyViews(): ExtendedMessageViews {
  return {
    originalInput: '',
    detectedLanguage: '',
    englishMeaning: '',
    senderNativeText: '',
    senderEnglishHint: '',
    receiverNativeText: '',
    receiverEnglishHint: '',
    wasTranslated: false,
    wasTransliterated: false,
    confidence: 0,
  };
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
  dynamicTransliterate,
  reverseTransliterate,
} from './universal-offline-engine';

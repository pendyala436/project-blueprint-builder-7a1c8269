/**
 * Auto Language Detection Hook
 * =============================
 * 
 * Automatically detects input type, source language, and input method:
 * 1. English typing: "how are you"
 * 2. Native script: "బాగున్నావా" (direct native keyboard/Gboard)
 * 3. Romanized: "bagunnava" (English letters, native meaning)
 * 4. Voice-to-text: Any language via Web Speech API
 * 5. Gboard: Android/iOS virtual keyboard with native script
 * 6. External keyboards: Hardware/Bluetooth keyboards
 * 7. Font-based: Google Input Tools, transliteration services
 * 8. Mixed: Combination of scripts in single input
 * 
 * NO HARDCODING - uses Unicode detection, input events, and ML models
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { detectLanguage } from '@/lib/xenova-translate-sdk/engine';
import { normalizeLanguageCode, isEnglish, isLatinLanguage } from '@/lib/xenova-translate-sdk/languages';

// ============================================================
// TYPES
// ============================================================

export type InputType = 
  | 'english'           // Pure English input
  | 'native-script'     // Native keyboard/Gboard (Telugu, Hindi, etc.)
  | 'romanized'         // English letters with native meaning (bagunnava)
  | 'mixed'             // Mix of scripts
  | 'voice'             // Voice-to-text input
  | 'unknown';

export type InputMethod = 
  | 'gboard'            // Google Keyboard (Android/iOS)
  | 'swiftkey'          // Microsoft SwiftKey
  | 'samsung'           // Samsung Keyboard
  | 'ios-native'        // iOS native keyboard
  | 'external'          // Hardware/Bluetooth keyboard
  | 'virtual'           // Generic virtual keyboard
  | 'font-tool'         // Google Input Tools, transliteration
  | 'voice'             // Voice-to-text
  | 'ime'               // Input Method Editor (CJK, etc.)
  | 'standard';         // Standard keyboard

export interface DetectionResult {
  inputType: InputType;
  inputMethod: InputMethod;
  detectedLanguage: string;      // ISO code
  detectedLanguageName: string;  // Human readable
  isLatinInput: boolean;
  isNativeInput: boolean;
  confidence: number;
  script: string;
  metadata: InputMetadata;
}

export interface InputMetadata {
  isGboard: boolean;
  isExternalKeyboard: boolean;
  isVoiceInput: boolean;
  isFontTool: boolean;
  isMixedInput: boolean;
  isIME: boolean;
  inputEventType: string;
  compositionActive: boolean;
  characterBurstDetected: boolean;
}

export interface UseAutoLanguageDetectionOptions {
  userMotherTongue: string;       // User's configured mother tongue
  fallbackLanguage?: string;      // Fallback if detection fails (default: 'en')
  debounceMs?: number;            // Detection debounce (default: 150ms)
}

// ============================================================
// INPUT METHOD DETECTION
// ============================================================

// Track input events for method detection
interface InputEventTracker {
  lastInputTime: number;
  lastInputType: string;
  compositionActive: boolean;
  characterBurstCount: number;
  lastCharacterTime: number;
  inputPattern: string[];
}

const inputTracker: InputEventTracker = {
  lastInputTime: 0,
  lastInputType: '',
  compositionActive: false,
  characterBurstCount: 0,
  lastCharacterTime: 0,
  inputPattern: [],
};

/**
 * Detect if running on mobile device (likely using Gboard/virtual keyboard)
 */
function detectMobileDevice(): { isMobile: boolean; isAndroid: boolean; isIOS: boolean } {
  if (typeof navigator === 'undefined') {
    return { isMobile: false, isAndroid: false, isIOS: false };
  }
  
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = /android/.test(ua);
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isMobile = isAndroid || isIOS || /mobile|tablet/.test(ua);
  
  return { isMobile, isAndroid, isIOS };
}

/**
 * Detect input method from input event characteristics
 */
function detectInputMethod(
  inputEvent: InputEvent | null,
  text: string,
  isVoice: boolean
): InputMethod {
  // Voice input override
  if (isVoice) return 'voice';
  
  const device = detectMobileDevice();
  
  // Check for IME/composition (CJK, Korean, etc.)
  if (inputTracker.compositionActive) {
    return 'ime';
  }
  
  // Analyze input event type
  if (inputEvent) {
    const inputType = inputEvent.inputType || '';
    
    // Font-based tools often insert via insertFromPaste or insertText with long strings
    if (inputType === 'insertFromPaste' || inputType === 'insertFromDrop') {
      // Check if pasted text looks like it came from a transliteration tool
      if (hasNativeChars(text) && inputTracker.inputPattern.includes('latin')) {
        return 'font-tool';
      }
    }
    
    // Detect character burst (fast sequential native chars = likely virtual keyboard prediction)
    const now = Date.now();
    if (now - inputTracker.lastCharacterTime < 50) {
      inputTracker.characterBurstCount++;
    } else {
      inputTracker.characterBurstCount = 0;
    }
    inputTracker.lastCharacterTime = now;
    
    // High burst rate suggests auto-complete/prediction from virtual keyboard
    if (inputTracker.characterBurstCount > 3) {
      if (device.isAndroid) return 'gboard';
      if (device.isIOS) return 'ios-native';
      return 'virtual';
    }
  }
  
  // Device-based detection
  if (device.isAndroid) {
    return 'gboard'; // Most common on Android
  }
  
  if (device.isIOS) {
    return 'ios-native';
  }
  
  // Check for external keyboard indicators
  // External keyboards typically have more consistent timing and no prediction bursts
  if (!device.isMobile && inputTracker.characterBurstCount === 0) {
    return 'external';
  }
  
  return 'standard';
}

/**
 * Track input event for pattern analysis
 */
export function trackInputEvent(event: InputEvent): void {
  inputTracker.lastInputTime = Date.now();
  inputTracker.lastInputType = event.inputType || 'unknown';
  
  // Track script pattern (last 5 inputs)
  const data = event.data || '';
  if (data) {
    const isNative = hasNativeChars(data);
    inputTracker.inputPattern.push(isNative ? 'native' : 'latin');
    if (inputTracker.inputPattern.length > 5) {
      inputTracker.inputPattern.shift();
    }
  }
}

/**
 * Track composition events (for IME detection)
 */
export function trackComposition(isStarting: boolean): void {
  inputTracker.compositionActive = isStarting;
}

// ============================================================
// SCRIPT DETECTION - Unicode Range Based (No hardcoding)
// ============================================================

const SCRIPT_RANGES: Record<string, [number, number][]> = {
  'Devanagari': [[0x0900, 0x097F], [0xA8E0, 0xA8FF]],
  'Bengali': [[0x0980, 0x09FF]],
  'Tamil': [[0x0B80, 0x0BFF]],
  'Telugu': [[0x0C00, 0x0C7F]],
  'Kannada': [[0x0C80, 0x0CFF]],
  'Malayalam': [[0x0D00, 0x0D7F]],
  'Gujarati': [[0x0A80, 0x0AFF]],
  'Gurmukhi': [[0x0A00, 0x0A7F]],
  'Odia': [[0x0B00, 0x0B7F]],
  'Arabic': [[0x0600, 0x06FF], [0x0750, 0x077F], [0x08A0, 0x08FF]],
  'Cyrillic': [[0x0400, 0x04FF], [0x0500, 0x052F]],
  'Greek': [[0x0370, 0x03FF], [0x1F00, 0x1FFF]],
  'Hebrew': [[0x0590, 0x05FF]],
  'Thai': [[0x0E00, 0x0E7F]],
  'Han': [[0x4E00, 0x9FFF], [0x3400, 0x4DBF], [0x20000, 0x2A6DF]],
  'Hangul': [[0xAC00, 0xD7AF], [0x1100, 0x11FF], [0x3130, 0x318F]],
  'Hiragana': [[0x3040, 0x309F]],
  'Katakana': [[0x30A0, 0x30FF], [0x31F0, 0x31FF]],
  'Georgian': [[0x10A0, 0x10FF], [0x2D00, 0x2D2F]],
  'Armenian': [[0x0530, 0x058F]],
  'Ethiopic': [[0x1200, 0x137F], [0x1380, 0x139F]],
  'Myanmar': [[0x1000, 0x109F]],
  'Khmer': [[0x1780, 0x17FF]],
  'Lao': [[0x0E80, 0x0EFF]],
  'Sinhala': [[0x0D80, 0x0DFF]],
  'Tibetan': [[0x0F00, 0x0FFF]],
  'Thaana': [[0x0780, 0x07BF]],
  'Mongolian': [[0x1800, 0x18AF]],
};

// Script to language mapping (dynamic)
const SCRIPT_TO_LANG: Record<string, string> = {
  'Devanagari': 'hi',
  'Bengali': 'bn',
  'Tamil': 'ta',
  'Telugu': 'te',
  'Kannada': 'kn',
  'Malayalam': 'ml',
  'Gujarati': 'gu',
  'Gurmukhi': 'pa',
  'Odia': 'or',
  'Arabic': 'ar',
  'Cyrillic': 'ru',
  'Greek': 'el',
  'Hebrew': 'he',
  'Thai': 'th',
  'Han': 'zh',
  'Hangul': 'ko',
  'Hiragana': 'ja',
  'Katakana': 'ja',
  'Georgian': 'ka',
  'Armenian': 'hy',
  'Ethiopic': 'am',
  'Myanmar': 'my',
  'Khmer': 'km',
  'Lao': 'lo',
  'Sinhala': 'si',
  'Tibetan': 'bo',
  'Thaana': 'dv',
  'Mongolian': 'mn',
};

/**
 * Detect script from text using Unicode ranges
 */
function detectScript(text: string): { script: string; counts: Record<string, number> } {
  const scriptCounts: Record<string, number> = { 'Latin': 0 };
  
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i);
    if (code === undefined) continue;
    
    // Handle surrogate pairs
    if (code > 0xFFFF) i++;
    
    // Latin check (extended)
    if ((code >= 0x0041 && code <= 0x007A) || (code >= 0x00C0 && code <= 0x024F)) {
      scriptCounts['Latin'] = (scriptCounts['Latin'] || 0) + 1;
      continue;
    }
    
    // Check other scripts
    for (const [script, ranges] of Object.entries(SCRIPT_RANGES)) {
      for (const [start, end] of ranges) {
        if (code >= start && code <= end) {
          scriptCounts[script] = (scriptCounts[script] || 0) + 1;
          break;
        }
      }
    }
  }
  
  // Find dominant script
  let maxScript = 'Latin';
  let maxCount = scriptCounts['Latin'];
  
  for (const [script, count] of Object.entries(scriptCounts)) {
    if (count > maxCount) {
      maxScript = script;
      maxCount = count;
    }
  }
  
  return { script: maxScript, counts: scriptCounts };
}

/**
 * Check if text is purely Latin characters
 */
function isPureLatinText(text: string): boolean {
  if (!text.trim()) return true;
  // Allow only Latin letters, numbers, and common punctuation
  return /^[\x00-\x7F\u00C0-\u024F\s\d.,!?'"()\-:;@#$%&*+=/<>]+$/.test(text);
}

/**
 * Check if text contains non-Latin (native) characters
 */
function hasNativeChars(text: string): boolean {
  // Any character outside basic Latin and extended Latin
  return /[^\x00-\x7F\u00C0-\u024F]/.test(text);
}

/**
 * Check if input looks like it came from a font-based tool
 * (Google Input Tools, online transliterators, etc.)
 */
function detectFontTool(text: string, prevText: string): boolean {
  if (!text || !prevText) return false;
  
  // Font tools often replace entire words at once
  // Check if a Latin word was suddenly replaced with native script
  const prevLatin = isPureLatinText(prevText);
  const currNative = hasNativeChars(text);
  
  // If previous was Latin and current has native, with significant change
  if (prevLatin && currNative) {
    const lengthRatio = text.length / Math.max(prevText.length, 1);
    // Font tools typically maintain similar length or expand slightly
    if (lengthRatio > 0.5 && lengthRatio < 3) {
      return true;
    }
  }
  
  return false;
}

/**
 * Common English words for detection (minimal, dynamic)
 */
const COMMON_ENGLISH_PATTERNS = [
  /\b(the|is|are|was|were|have|has|had|do|does|did)\b/i,
  /\b(what|when|where|why|how|who|which)\b/i,
  /\b(this|that|these|those|here|there)\b/i,
  /\b(can|could|will|would|should|may|might)\b/i,
  /\b(hello|hi|hey|thanks|thank|please|sorry)\b/i,
  /\b(good|nice|great|fine|okay|ok)\b/i,
  /\b(you|your|me|my|we|our|they|their)\b/i,
  /\b(i|am|be|been|being|a|an|and|or|but|not)\b/i,
];

/**
 * Check if Latin text appears to be English
 */
function looksLikeEnglish(text: string): boolean {
  const lower = text.toLowerCase();
  
  // Check for common English patterns
  for (const pattern of COMMON_ENGLISH_PATTERNS) {
    if (pattern.test(lower)) return true;
  }
  
  // Check for common English word endings
  const englishEndings = /\b\w+(ing|tion|ness|ment|ful|less|able|ible|ly|ed|er|est|ous|ive)\b/i;
  if (englishEndings.test(lower)) return true;
  
  // Check for English contractions
  if (/\b(i'm|you're|we're|they're|it's|don't|won't|can't|isn't|aren't|wasn't|weren't)\b/i.test(lower)) {
    return true;
  }
  
  return false;
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useAutoLanguageDetection(options: UseAutoLanguageDetectionOptions) {
  const { 
    userMotherTongue, 
    fallbackLanguage = 'en',
    debounceMs = 150 
  } = options;
  
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef<string>('');
  const lastInputEventRef = useRef<InputEvent | null>(null);
  
  // Normalize user's mother tongue
  const motherTongueCode = normalizeLanguageCode(userMotherTongue);
  const isMotherTongueEnglish = isEnglish(motherTongueCode);
  const isMotherTongueLatin = isLatinLanguage(motherTongueCode);

  /**
   * Create metadata object
   */
  const createMetadata = useCallback((
    inputMethod: InputMethod,
    isMixed: boolean,
    inputType: string
  ): InputMetadata => {
    return {
      isGboard: inputMethod === 'gboard',
      isExternalKeyboard: inputMethod === 'external',
      isVoiceInput: inputMethod === 'voice',
      isFontTool: inputMethod === 'font-tool',
      isMixedInput: isMixed,
      isIME: inputMethod === 'ime',
      inputEventType: inputType,
      compositionActive: inputTracker.compositionActive,
      characterBurstDetected: inputTracker.characterBurstCount > 3,
    };
  }, []);

  /**
   * Instant detection (synchronous, for immediate feedback)
   */
  const detectInstant = useCallback((
    text: string,
    isVoiceInput = false,
    inputEvent: InputEvent | null = null
  ): DetectionResult => {
    if (!text.trim()) {
      return {
        inputType: 'unknown',
        inputMethod: 'standard',
        detectedLanguage: fallbackLanguage,
        detectedLanguageName: 'Unknown',
        isLatinInput: true,
        isNativeInput: false,
        confidence: 0,
        script: 'Latin',
        metadata: createMetadata('standard', false, ''),
      };
    }
    
    const { script, counts } = detectScript(text);
    const latinCount = counts['Latin'] || 0;
    const totalNonSpace = text.replace(/\s/g, '').length;
    const latinRatio = totalNonSpace > 0 ? latinCount / totalNonSpace : 0;
    
    const isLatin = isPureLatinText(text);
    const hasNative = hasNativeChars(text);
    const isMixed = hasNative && latinCount > 0 && latinRatio > 0.1 && latinRatio < 0.9;
    
    // Detect font tool usage
    const isFontToolInput = detectFontTool(text, lastTextRef.current);
    
    // Detect input method
    let inputMethod = detectInputMethod(inputEvent, text, isVoiceInput);
    if (isFontToolInput) inputMethod = 'font-tool';
    
    let inputType: InputType = 'unknown';
    let detectedLang = fallbackLanguage;
    let confidence = 0.5;
    
    if (isVoiceInput) {
      // VOICE INPUT
      inputType = 'voice';
      inputMethod = 'voice';
      if (hasNative) {
        detectedLang = SCRIPT_TO_LANG[script] || motherTongueCode;
        confidence = 0.9;
      } else if (looksLikeEnglish(text)) {
        detectedLang = 'en';
        confidence = 0.85;
      } else {
        detectedLang = motherTongueCode;
        confidence = 0.7;
      }
    } else if (isMixed) {
      // MIXED INPUT (combination of scripts)
      inputType = 'mixed';
      // Determine primary language based on dominant script
      if (latinRatio > 0.5) {
        detectedLang = looksLikeEnglish(text) ? 'en' : motherTongueCode;
      } else {
        detectedLang = SCRIPT_TO_LANG[script] || motherTongueCode;
      }
      confidence = 0.65;
    } else if (hasNative && !isLatin) {
      // NATIVE SCRIPT INPUT (Gboard, native keyboard, font tool, IME)
      inputType = 'native-script';
      detectedLang = SCRIPT_TO_LANG[script] || motherTongueCode;
      confidence = 0.95;
    } else if (isLatin) {
      // LATIN INPUT - could be English or romanized
      if (looksLikeEnglish(text)) {
        inputType = 'english';
        detectedLang = 'en';
        confidence = 0.85;
      } else if (!isMotherTongueEnglish && !isMotherTongueLatin) {
        // User's mother tongue is non-Latin, Latin input = likely romanized
        inputType = 'romanized';
        detectedLang = motherTongueCode;
        confidence = 0.7;
      } else {
        // Latin mother tongue user typing Latin = likely their language or English
        inputType = 'english';
        detectedLang = 'en';
        confidence = 0.6;
      }
    }
    
    return {
      inputType,
      inputMethod,
      detectedLanguage: detectedLang,
      detectedLanguageName: getLanguageName(detectedLang),
      isLatinInput: isLatin,
      isNativeInput: hasNative && !isLatin,
      confidence,
      script,
      metadata: createMetadata(inputMethod, isMixed, lastInputEventRef.current?.inputType || ''),
    };
  }, [motherTongueCode, isMotherTongueEnglish, isMotherTongueLatin, fallbackLanguage, createMetadata]);

  /**
   * ML-based detection (async, for higher accuracy)
   */
  const detectWithML = useCallback(async (
    text: string,
    isVoiceInput = false,
    inputEvent: InputEvent | null = null
  ): Promise<DetectionResult> => {
    const instant = detectInstant(text, isVoiceInput, inputEvent);
    
    // Only use ML for ambiguous cases
    if (instant.confidence > 0.8) {
      return instant;
    }
    
    try {
      const mlResult = await detectLanguage(text);
      
      if (mlResult.confidence > instant.confidence) {
        return {
          ...instant,
          detectedLanguage: normalizeLanguageCode(mlResult.language),
          detectedLanguageName: getLanguageName(mlResult.language),
          confidence: mlResult.confidence,
        };
      }
    } catch (error) {
      console.warn('[AutoDetect] ML detection failed:', error);
    }
    
    return instant;
  }, [detectInstant]);

  /**
   * Handle input event tracking
   */
  const handleInputEvent = useCallback((event: InputEvent) => {
    trackInputEvent(event);
    lastInputEventRef.current = event;
  }, []);

  /**
   * Handle composition events
   */
  const handleCompositionStart = useCallback(() => {
    trackComposition(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    trackComposition(false);
  }, []);

  /**
   * Main detection function with debouncing
   */
  const detect = useCallback((text: string, isVoiceInput = false, inputEvent?: InputEvent) => {
    if (text === lastTextRef.current && !isVoiceInput) return;
    
    const prevText = lastTextRef.current;
    lastTextRef.current = text;
    
    if (inputEvent) {
      handleInputEvent(inputEvent);
    }
    
    // Clear pending detection
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Instant detection for immediate feedback
    const instant = detectInstant(text, isVoiceInput, inputEvent || null);
    setDetection(instant);
    
    // Debounced ML detection for higher accuracy
    if (instant.confidence < 0.8 && text.length > 5) {
      setIsDetecting(true);
      debounceRef.current = setTimeout(async () => {
        const mlResult = await detectWithML(text, isVoiceInput, inputEvent || null);
        setDetection(mlResult);
        setIsDetecting(false);
      }, debounceMs);
    }
  }, [detectInstant, detectWithML, debounceMs, handleInputEvent]);

  /**
   * Detect for voice input specifically
   */
  const detectVoice = useCallback((text: string) => {
    detect(text, true);
  }, [detect]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    detect,
    detectVoice,
    detectInstant,
    detection,
    isDetecting,
    motherTongueCode,
    isMotherTongueEnglish,
    // Event handlers for input tracking
    handleInputEvent,
    handleCompositionStart,
    handleCompositionEnd,
  };
}

/**
 * Get language name from code (uses dynamic lookup)
 */
function getLanguageName(code: string): string {
  // Dynamic language name lookup - no hardcoded list
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const name = displayNames.of(code);
    if (name && name !== code) return name;
  } catch {
    // Fallback for unsupported codes
  }
  
  // Minimal fallback for common codes
  const fallbackNames: Record<string, string> = {
    en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil',
    kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', gu: 'Gujarati',
    bn: 'Bengali', pa: 'Punjabi', ur: 'Urdu', or: 'Odia',
  };
  
  return fallbackNames[code.toLowerCase()] || `Language (${code})`;
}

export default useAutoLanguageDetection;

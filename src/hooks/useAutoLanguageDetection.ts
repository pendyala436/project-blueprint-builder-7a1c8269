/**
 * Auto Language Detection Hook
 * =============================
 * 
 * Automatically detects input type, source language, and input method.
 * Uses Unicode detection and input events (no browser-based ML models).
 */

import { useState, useCallback, useRef } from 'react';

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
// SCRIPT DETECTION - Unicode Range Based
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
};

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
};

function normalizeLanguageCode(lang: string): string {
  if (!lang) return 'en';
  const code = lang.toLowerCase().trim();
  const codeMap: Record<string, string> = {
    'english': 'en', 'hindi': 'hi', 'telugu': 'te', 'tamil': 'ta',
    'kannada': 'kn', 'malayalam': 'ml', 'marathi': 'mr', 'gujarati': 'gu',
    'bengali': 'bn', 'punjabi': 'pa', 'urdu': 'ur', 'odia': 'or',
  };
  return codeMap[code] || code.slice(0, 2);
}

function isEnglish(lang: string): boolean {
  const code = normalizeLanguageCode(lang);
  return code === 'en' || code === 'english';
}

function isLatinLanguage(lang: string): boolean {
  const latinLangs = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ro', 'cs', 'hu', 'sv'];
  return latinLangs.includes(normalizeLanguageCode(lang));
}

function detectScript(text: string): { script: string; counts: Record<string, number> } {
  const scriptCounts: Record<string, number> = { 'Latin': 0 };
  
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i);
    if (code === undefined) continue;
    
    if (code > 0xFFFF) i++;
    
    if ((code >= 0x0041 && code <= 0x007A) || (code >= 0x00C0 && code <= 0x024F)) {
      scriptCounts['Latin'] = (scriptCounts['Latin'] || 0) + 1;
      continue;
    }
    
    for (const [script, ranges] of Object.entries(SCRIPT_RANGES)) {
      for (const [start, end] of ranges) {
        if (code >= start && code <= end) {
          scriptCounts[script] = (scriptCounts[script] || 0) + 1;
          break;
        }
      }
    }
  }
  
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

function isPureLatinText(text: string): boolean {
  if (!text.trim()) return true;
  return /^[\x00-\x7F\u00C0-\u024F\s\d.,!?'"()\-:;@#$%&*+=/<>]+$/.test(text);
}

function hasNativeChars(text: string): boolean {
  return /[^\x00-\x7F\u00C0-\u024F]/.test(text);
}

const COMMON_ENGLISH_PATTERNS = [
  /\b(the|is|are|was|were|have|has|had|do|does|did)\b/i,
  /\b(what|when|where|why|how|who|which)\b/i,
  /\b(hello|hi|hey|thanks|thank|please|sorry)\b/i,
  /\b(you|your|me|my|we|our|they|their)\b/i,
  /\b(i|am|be|been|being|a|an|and|or|but|not)\b/i,
];

function looksLikeEnglish(text: string): boolean {
  const lower = text.toLowerCase();
  for (const pattern of COMMON_ENGLISH_PATTERNS) {
    if (pattern.test(lower)) return true;
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
  
  const motherTongueCode = normalizeLanguageCode(userMotherTongue);
  const isMotherTongueEnglish = isEnglish(motherTongueCode);
  const isMotherTongueLatin = isLatinLanguage(motherTongueCode);

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
      compositionActive: false,
      characterBurstDetected: false,
    };
  }, []);

  const detectInstant = useCallback((
    text: string,
    isVoiceInput = false
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
    
    let inputMethod: InputMethod = isVoiceInput ? 'voice' : 'standard';
    let inputType: InputType = 'unknown';
    let detectedLang = fallbackLanguage;
    let confidence = 0.5;
    
    if (isVoiceInput) {
      inputType = 'voice';
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
      inputType = 'mixed';
      if (latinRatio > 0.5) {
        detectedLang = looksLikeEnglish(text) ? 'en' : motherTongueCode;
      } else {
        detectedLang = SCRIPT_TO_LANG[script] || motherTongueCode;
      }
      confidence = 0.75;
    } else if (hasNative) {
      inputType = 'native-script';
      detectedLang = SCRIPT_TO_LANG[script] || motherTongueCode;
      confidence = 0.95;
    } else if (isLatin) {
      if (looksLikeEnglish(text)) {
        inputType = 'english';
        detectedLang = 'en';
        confidence = 0.9;
      } else if (!isMotherTongueEnglish && !isMotherTongueLatin) {
        inputType = 'romanized';
        detectedLang = motherTongueCode;
        confidence = 0.7;
      } else {
        inputType = 'english';
        detectedLang = 'en';
        confidence = 0.6;
      }
    }
    
    return {
      inputType,
      inputMethod,
      detectedLanguage: detectedLang,
      detectedLanguageName: detectedLang.toUpperCase(),
      isLatinInput: isLatin,
      isNativeInput: hasNative && !isLatin,
      confidence,
      script,
      metadata: createMetadata(inputMethod, isMixed, ''),
    };
  }, [fallbackLanguage, motherTongueCode, isMotherTongueEnglish, isMotherTongueLatin, createMetadata]);

  const detect = useCallback((text: string, inputEvent?: InputEvent | null) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    lastTextRef.current = text;
    setIsDetecting(true);
    
    debounceRef.current = setTimeout(() => {
      const result = detectInstant(text, false);
      setDetection(result);
      setIsDetecting(false);
    }, debounceMs);
  }, [debounceMs, detectInstant]);

  const detectVoice = useCallback((text: string) => {
    const result = detectInstant(text, true);
    setDetection(result);
  }, [detectInstant]);

  return {
    detect,
    detectVoice,
    detectInstant,
    detection,
    isDetecting,
    motherTongueCode,
  };
}

export function trackInputEvent(event: InputEvent): void {
  // No-op for compatibility
}

export function trackComposition(isStarting: boolean): void {
  // No-op for compatibility
}

export default useAutoLanguageDetection;

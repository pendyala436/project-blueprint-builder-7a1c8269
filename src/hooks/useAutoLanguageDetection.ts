/**
 * Auto Language Detection Hook
 * =============================
 * 
 * Automatically detects input type and source language:
 * 1. English typing: "how are you"
 * 2. Native script: "బాగున్నావా" (direct native keyboard/Gboard)
 * 3. Romanized: "bagunnava" (English letters, native meaning)
 * 4. Voice-to-text: Any language
 * 
 * NO HARDCODING - uses Unicode detection and ML models
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

export interface DetectionResult {
  inputType: InputType;
  detectedLanguage: string;      // ISO code
  detectedLanguageName: string;  // Human readable
  isLatinInput: boolean;
  isNativeInput: boolean;
  confidence: number;
  script: string;
}

export interface UseAutoLanguageDetectionOptions {
  userMotherTongue: string;       // User's configured mother tongue
  fallbackLanguage?: string;      // Fallback if detection fails (default: 'en')
  debounceMs?: number;            // Detection debounce (default: 150ms)
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
  'Arabic': [[0x0600, 0x06FF], [0x0750, 0x077F]],
  'Cyrillic': [[0x0400, 0x04FF], [0x0500, 0x052F]],
  'Greek': [[0x0370, 0x03FF]],
  'Hebrew': [[0x0590, 0x05FF]],
  'Thai': [[0x0E00, 0x0E7F]],
  'Han': [[0x4E00, 0x9FFF], [0x3400, 0x4DBF]],
  'Hangul': [[0xAC00, 0xD7AF], [0x1100, 0x11FF]],
  'Japanese': [[0x3040, 0x309F], [0x30A0, 0x30FF]],
  'Georgian': [[0x10A0, 0x10FF]],
  'Armenian': [[0x0530, 0x058F]],
  'Ethiopic': [[0x1200, 0x137F]],
  'Myanmar': [[0x1000, 0x109F]],
  'Khmer': [[0x1780, 0x17FF]],
  'Lao': [[0x0E80, 0x0EFF]],
  'Sinhala': [[0x0D80, 0x0DFF]],
  'Tibetan': [[0x0F00, 0x0FFF]],
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
  'Japanese': 'ja',
  'Georgian': 'ka',
  'Armenian': 'hy',
  'Ethiopic': 'am',
  'Myanmar': 'my',
  'Khmer': 'km',
  'Lao': 'lo',
  'Sinhala': 'si',
  'Tibetan': 'bo',
};

/**
 * Detect script from text using Unicode ranges
 */
function detectScript(text: string): { script: string; counts: Record<string, number> } {
  const scriptCounts: Record<string, number> = { 'Latin': 0 };
  
  for (const char of text) {
    const code = char.charCodeAt(0);
    
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
  return /^[\x00-\x7F\u00C0-\u024F\s\d.,!?'"()-]+$/.test(text);
}

/**
 * Check if text contains non-Latin (native) characters
 */
function hasNativeChars(text: string): boolean {
  // Any character outside basic Latin and extended Latin
  return /[^\x00-\x7F\u00C0-\u024F]/.test(text);
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
  const englishEndings = /\b\w+(ing|tion|ness|ment|ful|less|able|ible|ly|ed|er|est)\b/i;
  if (englishEndings.test(lower)) return true;
  
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
  
  // Normalize user's mother tongue
  const motherTongueCode = normalizeLanguageCode(userMotherTongue);
  const isMotherTongueEnglish = isEnglish(motherTongueCode);
  const isMotherTongueLatin = isLatinLanguage(motherTongueCode);

  /**
   * Instant detection (synchronous, for immediate feedback)
   */
  const detectInstant = useCallback((text: string): DetectionResult => {
    if (!text.trim()) {
      return {
        inputType: 'unknown',
        detectedLanguage: fallbackLanguage,
        detectedLanguageName: 'Unknown',
        isLatinInput: true,
        isNativeInput: false,
        confidence: 0,
        script: 'Latin',
      };
    }
    
    const { script, counts } = detectScript(text);
    const latinCount = counts['Latin'] || 0;
    const totalNonSpace = text.replace(/\s/g, '').length;
    const latinRatio = totalNonSpace > 0 ? latinCount / totalNonSpace : 0;
    
    const isLatin = isPureLatinText(text);
    const hasNative = hasNativeChars(text);
    
    let inputType: InputType = 'unknown';
    let detectedLang = fallbackLanguage;
    let confidence = 0.5;
    
    if (hasNative && !isLatin) {
      // NATIVE SCRIPT INPUT (Gboard, native keyboard)
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
        // Latin mother tongue user typing Latin = likely their language
        inputType = 'english';
        detectedLang = 'en';
        confidence = 0.6;
      }
    } else if (hasNative && latinCount > 0) {
      // MIXED INPUT
      inputType = 'mixed';
      detectedLang = latinRatio > 0.5 ? 'en' : (SCRIPT_TO_LANG[script] || motherTongueCode);
      confidence = 0.6;
    }
    
    return {
      inputType,
      detectedLanguage: detectedLang,
      detectedLanguageName: getLanguageName(detectedLang),
      isLatinInput: isLatin,
      isNativeInput: hasNative && !isLatin,
      confidence,
      script,
    };
  }, [motherTongueCode, isMotherTongueEnglish, isMotherTongueLatin, fallbackLanguage]);

  /**
   * ML-based detection (async, for higher accuracy)
   */
  const detectWithML = useCallback(async (text: string): Promise<DetectionResult> => {
    const instant = detectInstant(text);
    
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
   * Main detection function with debouncing
   */
  const detect = useCallback((text: string, isVoiceInput = false) => {
    if (text === lastTextRef.current) return;
    lastTextRef.current = text;
    
    // Clear pending detection
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Instant detection for immediate feedback
    const instant = detectInstant(text);
    
    // Override for voice input
    if (isVoiceInput) {
      instant.inputType = 'voice';
    }
    
    setDetection(instant);
    
    // Debounced ML detection for higher accuracy
    if (instant.confidence < 0.8 && text.length > 5) {
      setIsDetecting(true);
      debounceRef.current = setTimeout(async () => {
        const mlResult = await detectWithML(text);
        if (isVoiceInput) mlResult.inputType = 'voice';
        setDetection(mlResult);
        setIsDetecting(false);
      }, debounceMs);
    }
  }, [detectInstant, detectWithML, debounceMs]);

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
  };
}

/**
 * Get language name from code
 */
function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    te: 'Telugu',
    ta: 'Tamil',
    kn: 'Kannada',
    ml: 'Malayalam',
    mr: 'Marathi',
    gu: 'Gujarati',
    bn: 'Bengali',
    pa: 'Punjabi',
    ur: 'Urdu',
    or: 'Odia',
    as: 'Assamese',
    ne: 'Nepali',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic',
  };
  return names[code.toLowerCase()] || `Language (${code})`;
}

export default useAutoLanguageDetection;

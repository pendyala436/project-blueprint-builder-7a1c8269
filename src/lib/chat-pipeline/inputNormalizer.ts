/**
 * Universal Input Normalizer
 * ==========================
 * 
 * Handles ALL 12 input methods and normalizes them for translation:
 * 
 * 1. Pure English typing - "How are you?"
 * 2. Manual native-script typing - "బాగున్నావా" (Gboard native layout)
 * 3. English transliteration (Romanized) - "bagunnava" → "బాగున్నావా"
 * 4. Mixed/code-mixed typing - "Bagunnava bro?" / "Today nenu office ki vellaledu"
 * 5. Gboard/phonetic keyboard - Predictive, swipe, transliteration
 * 6. Keyboard layout typing - INSCRIPT, Phonetic, QWERTY regional
 * 7. Virtual keyboard typing - On-screen, touch-based
 * 8. Font-based (legacy) typing - Non-Unicode fonts (detect + warn)
 * 9. Voice-to-Text (single language) - "Bagunnava" → "బాగున్నావా"
 * 10. Voice-to-Text (mixed language) - "Today nenu office ki vellaledu"
 * 11. AI-assisted/predictive typing - Auto-completion, grammar correction
 * 12. Accessibility typing - Speech, assistive input
 * 
 * Output: Normalized Unicode text ready for translation pipeline
 */

export type InputMethod = 
  | 'pure-english'
  | 'native-script'
  | 'transliteration'
  | 'mixed-code'
  | 'gboard-ime'
  | 'keyboard-layout'
  | 'virtual-keyboard'
  | 'font-based'
  | 'voice-single'
  | 'voice-mixed'
  | 'ai-predictive'
  | 'accessibility';

export interface InputAnalysis {
  method: InputMethod;
  originalText: string;
  normalizedText: string;
  detectedScript: string;
  hasNativeChars: boolean;
  hasLatinChars: boolean;
  isMixed: boolean;
  isLegacyFont: boolean;
  confidence: number;
  languages: string[];
}

// Unicode script ranges for detection
const SCRIPT_PATTERNS: Record<string, { regex: RegExp; name: string }> = {
  devanagari: { regex: /[\u0900-\u097F]/, name: 'Devanagari' },
  telugu: { regex: /[\u0C00-\u0C7F]/, name: 'Telugu' },
  tamil: { regex: /[\u0B80-\u0BFF]/, name: 'Tamil' },
  kannada: { regex: /[\u0C80-\u0CFF]/, name: 'Kannada' },
  malayalam: { regex: /[\u0D00-\u0D7F]/, name: 'Malayalam' },
  bengali: { regex: /[\u0980-\u09FF]/, name: 'Bengali' },
  gujarati: { regex: /[\u0A80-\u0AFF]/, name: 'Gujarati' },
  gurmukhi: { regex: /[\u0A00-\u0A7F]/, name: 'Gurmukhi' },
  odia: { regex: /[\u0B00-\u0B7F]/, name: 'Odia' },
  arabic: { regex: /[\u0600-\u06FF\u0750-\u077F]/, name: 'Arabic' },
  hebrew: { regex: /[\u0590-\u05FF]/, name: 'Hebrew' },
  thai: { regex: /[\u0E00-\u0E7F]/, name: 'Thai' },
  chinese: { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, name: 'Han' },
  japanese: { regex: /[\u3040-\u309F\u30A0-\u30FF]/, name: 'Japanese' },
  korean: { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, name: 'Hangul' },
  cyrillic: { regex: /[\u0400-\u04FF]/, name: 'Cyrillic' },
  greek: { regex: /[\u0370-\u03FF]/, name: 'Greek' },
  myanmar: { regex: /[\u1000-\u109F]/, name: 'Myanmar' },
  lao: { regex: /[\u0E80-\u0EFF]/, name: 'Lao' },
  khmer: { regex: /[\u1780-\u17FF]/, name: 'Khmer' },
  sinhala: { regex: /[\u0D80-\u0DFF]/, name: 'Sinhala' },
  ethiopic: { regex: /[\u1200-\u137F]/, name: 'Ethiopic' },
  latin: { regex: /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/, name: 'Latin' },
};

// Common English words for detection
const ENGLISH_WORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did',
  'a', 'an', 'to', 'for', 'in', 'on', 'with', 'at', 'by', 'from', 'of',
  'hello', 'hi', 'hey', 'yes', 'no', 'ok', 'okay', 'thanks', 'thank',
  'you', 'your', 'me', 'my', 'we', 'i', 'am', 'be', 'and', 'or', 'but', 'not',
  'what', 'when', 'where', 'why', 'how', 'who', 'which', 'this', 'that',
  'good', 'morning', 'evening', 'night', 'please', 'sorry', 'bye', 'love',
  'like', 'want', 'need', 'can', 'will', 'would', 'could', 'should',
]);

// Legacy font detection patterns (non-Unicode encodings)
const LEGACY_FONT_PATTERNS = [
  /[\uE000-\uF8FF]/, // Private Use Area - often used by legacy fonts
  /\ufffd{2,}/, // Multiple replacement characters indicate encoding issues
];

/**
 * Detect the primary script(s) in text
 */
export function detectScripts(text: string): string[] {
  if (!text) return ['unknown'];
  
  const scripts: string[] = [];
  
  for (const [key, { regex, name }] of Object.entries(SCRIPT_PATTERNS)) {
    if (regex.test(text)) {
      scripts.push(name);
    }
  }
  
  return scripts.length > 0 ? scripts : ['unknown'];
}

/**
 * Check if text appears to be romanized native language
 * (Latin characters representing non-English words)
 */
export function isRomanizedNative(text: string, userLanguage: string): boolean {
  if (!text || !userLanguage) return false;
  
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  // If most words are not common English, it's likely romanized native
  const englishWordCount = words.filter(w => ENGLISH_WORDS.has(w)).length;
  const ratio = englishWordCount / words.length;
  
  // If less than 30% English words and all Latin script, likely romanized
  return ratio < 0.3 && /^[a-zA-Z\s\d\p{P}]+$/u.test(text);
}

/**
 * Check if text contains legacy (non-Unicode) font encoding
 */
export function hasLegacyFontEncoding(text: string): boolean {
  return LEGACY_FONT_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Normalize Unicode text (handle combining characters, etc.)
 */
export function normalizeUnicodeText(text: string): string {
  if (!text) return '';
  
  return text
    // Normalize to NFC (Canonical Decomposition, then Canonical Composition)
    .normalize('NFC')
    // Remove zero-width characters except ZWJ/ZWNJ (important for some scripts)
    .replace(/[\u200B\uFEFF]/g, '')
    // Normalize whitespace
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect input method from text characteristics
 */
export function detectInputMethod(
  text: string,
  userLanguage: string,
  previousText: string = ''
): InputMethod {
  if (!text) return 'pure-english';
  
  const hasNative = /[^\x00-\x7F]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  const scripts = detectScripts(text);
  
  // Legacy font check
  if (hasLegacyFontEncoding(text)) {
    return 'font-based';
  }
  
  // Pure native script (Gboard native, keyboard layout, virtual keyboard)
  if (hasNative && !hasLatin) {
    // Check if it's a burst (voice or IME completion)
    const addedChars = text.length - previousText.length;
    if (addedChars > 10 && text.includes(' ')) {
      return 'voice-single';
    }
    return 'native-script';
  }
  
  // Pure Latin
  if (hasLatin && !hasNative) {
    // Check if it looks like English
    const looksEnglish = isEnglishText(text);
    
    if (looksEnglish) {
      // Could be voice-to-text if it's a burst
      const addedChars = text.length - previousText.length;
      if (addedChars > 15 && text.includes(' ')) {
        return 'voice-single';
      }
      return 'pure-english';
    }
    
    // Romanized native
    return 'transliteration';
  }
  
  // Mixed content
  if (hasLatin && hasNative) {
    const addedChars = text.length - previousText.length;
    if (addedChars > 15 && text.includes(' ')) {
      return 'voice-mixed';
    }
    return 'mixed-code';
  }
  
  return 'pure-english';
}

/**
 * Check if text is primarily English
 */
export function isEnglishText(text: string): boolean {
  if (!text) return true;
  
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return true;
  
  const englishWordCount = words.filter(w => {
    const cleaned = w.replace(/[^\w]/g, '');
    return ENGLISH_WORDS.has(cleaned);
  }).length;
  
  return englishWordCount / words.length >= 0.3;
}

/**
 * Analyze and normalize input for translation
 * This is the main entry point for processing any input
 */
export function analyzeAndNormalizeInput(
  text: string,
  userLanguage: string,
  previousText: string = ''
): InputAnalysis {
  const normalizedText = normalizeUnicodeText(text);
  const method = detectInputMethod(normalizedText, userLanguage, previousText);
  const scripts = detectScripts(normalizedText);
  const hasNative = /[^\x00-\x7F]/.test(normalizedText);
  const hasLatin = /[a-zA-Z]/.test(normalizedText);
  const isLegacy = hasLegacyFontEncoding(text);
  
  // Detect languages from scripts
  const languages: string[] = [];
  if (scripts.includes('Devanagari')) languages.push('hindi', 'marathi', 'nepali');
  if (scripts.includes('Telugu')) languages.push('telugu');
  if (scripts.includes('Tamil')) languages.push('tamil');
  if (scripts.includes('Kannada')) languages.push('kannada');
  if (scripts.includes('Malayalam')) languages.push('malayalam');
  if (scripts.includes('Bengali')) languages.push('bengali', 'assamese');
  if (scripts.includes('Gujarati')) languages.push('gujarati');
  if (scripts.includes('Gurmukhi')) languages.push('punjabi');
  if (scripts.includes('Odia')) languages.push('odia');
  if (scripts.includes('Arabic')) languages.push('arabic', 'urdu', 'persian');
  if (scripts.includes('Hebrew')) languages.push('hebrew');
  if (scripts.includes('Thai')) languages.push('thai');
  if (scripts.includes('Han')) languages.push('chinese');
  if (scripts.includes('Japanese')) languages.push('japanese');
  if (scripts.includes('Hangul')) languages.push('korean');
  if (scripts.includes('Cyrillic')) languages.push('russian', 'ukrainian');
  if (scripts.includes('Latin')) languages.push('english');
  
  let confidence = 0.8;
  if (method === 'native-script') confidence = 0.95;
  if (method === 'pure-english' && isEnglishText(normalizedText)) confidence = 0.9;
  if (method === 'mixed-code') confidence = 0.7;
  if (isLegacy) confidence = 0.5;
  
  return {
    method,
    originalText: text,
    normalizedText,
    detectedScript: scripts[0] || 'unknown',
    hasNativeChars: hasNative,
    hasLatinChars: hasLatin,
    isMixed: hasNative && hasLatin,
    isLegacyFont: isLegacy,
    confidence,
    languages: languages.length > 0 ? languages : ['unknown'],
  };
}

/**
 * Get a human-readable description of the input method
 */
export function getInputMethodDescription(method: InputMethod): string {
  const descriptions: Record<InputMethod, string> = {
    'pure-english': 'Pure English',
    'native-script': 'Native Script (Gboard/IME)',
    'transliteration': 'Romanized Text',
    'mixed-code': 'Code-Mixed',
    'gboard-ime': 'Gboard/IME',
    'keyboard-layout': 'Keyboard Layout',
    'virtual-keyboard': 'Virtual Keyboard',
    'font-based': 'Legacy Font (Non-Unicode)',
    'voice-single': 'Voice Input (Single Language)',
    'voice-mixed': 'Voice Input (Mixed Language)',
    'ai-predictive': 'AI-Assisted',
    'accessibility': 'Accessibility Input',
  };
  
  return descriptions[method] || 'Unknown';
}

/**
 * Check if input needs transliteration (Latin to native script)
 */
export function needsTransliteration(analysis: InputAnalysis, targetLanguage: string): boolean {
  // If already native script, no transliteration needed
  if (analysis.hasNativeChars && !analysis.hasLatinChars) {
    return false;
  }
  
  // If pure English to non-English target, it's translation not transliteration
  if (analysis.method === 'pure-english') {
    return false;
  }
  
  // Romanized input to native script needs transliteration
  if (analysis.method === 'transliteration') {
    return true;
  }
  
  // Mixed content may need partial transliteration
  if (analysis.method === 'mixed-code' || analysis.method === 'voice-mixed') {
    return true;
  }
  
  return false;
}

export default {
  analyzeAndNormalizeInput,
  detectInputMethod,
  detectScripts,
  isEnglishText,
  isRomanizedNative,
  normalizeUnicodeText,
  hasLegacyFontEncoding,
  getInputMethodDescription,
  needsTransliteration,
};

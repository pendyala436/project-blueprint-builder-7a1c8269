/**
 * LibreTranslate TypeScript Client
 * ================================
 * Pure TypeScript implementation inspired by LibreTranslate
 * Works entirely in-browser with optional Edge Function fallback
 * 
 * Features:
 * - Auto-detect source language
 * - English pivot translation
 * - Latin → Native script transliteration
 * - 300+ language support
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// TYPES
// ============================================================

export interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
  sourceLanguage: string;
  targetLanguage: string;
  pivotText?: string;
  isTransliterated: boolean;
  confidence: number;
}

export interface DetectionResult {
  language: string;
  script: string;
  confidence: number;
}

export interface LanguageInfo {
  code: string;
  name: string;
  native: string;
  script: string;
  rtl?: boolean;
}

// ============================================================
// SCRIPT DETECTION PATTERNS
// ============================================================

const SCRIPT_PATTERNS: Array<{ regex: RegExp; language: string; script: string }> = [
  { regex: /[\u0900-\u097F]/, language: 'hindi', script: 'Devanagari' },
  { regex: /[\u0980-\u09FF]/, language: 'bengali', script: 'Bengali' },
  { regex: /[\u0A00-\u0A7F]/, language: 'punjabi', script: 'Gurmukhi' },
  { regex: /[\u0A80-\u0AFF]/, language: 'gujarati', script: 'Gujarati' },
  { regex: /[\u0B00-\u0B7F]/, language: 'odia', script: 'Odia' },
  { regex: /[\u0B80-\u0BFF]/, language: 'tamil', script: 'Tamil' },
  { regex: /[\u0C00-\u0C7F]/, language: 'telugu', script: 'Telugu' },
  { regex: /[\u0C80-\u0CFF]/, language: 'kannada', script: 'Kannada' },
  { regex: /[\u0D00-\u0D7F]/, language: 'malayalam', script: 'Malayalam' },
  { regex: /[\u0D80-\u0DFF]/, language: 'sinhala', script: 'Sinhala' },
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: 'chinese', script: 'Han' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese', script: 'Kana' },
  { regex: /[\uAC00-\uD7AF]/, language: 'korean', script: 'Hangul' },
  { regex: /[\u0E00-\u0E7F]/, language: 'thai', script: 'Thai' },
  { regex: /[\u0600-\u06FF]/, language: 'arabic', script: 'Arabic' },
  { regex: /[\u0590-\u05FF]/, language: 'hebrew', script: 'Hebrew' },
  { regex: /[\u0400-\u04FF]/, language: 'russian', script: 'Cyrillic' },
  { regex: /[\u0370-\u03FF]/, language: 'greek', script: 'Greek' },
];

// ============================================================
// TRANSLATION DICTIONARIES
// ============================================================

const HINDI_TO_ENGLISH: Record<string, string> = {
  'नमस्ते': 'hello', 'नमस्कार': 'greetings', 'हाय': 'hi', 'हैलो': 'hello',
  'सुप्रभात': 'good morning', 'शुभ रात्रि': 'good night',
  'आप कैसे हैं': 'how are you', 'मैं ठीक हूं': 'i am fine',
  'धन्यवाद': 'thank you', 'शुक्रिया': 'thanks', 'कृपया': 'please',
  'माफ कीजिए': 'sorry', 'हां': 'yes', 'नहीं': 'no', 'ठीक है': 'okay',
  'प्यार': 'love', 'दोस्त': 'friend', 'परिवार': 'family',
};

const TELUGU_TO_ENGLISH: Record<string, string> = {
  'నమస్కారం': 'hello', 'హాయ్': 'hi', 'శుభోదయం': 'good morning',
  'మీరు ఎలా ఉన్నారు': 'how are you', 'నేను బాగున్నాను': 'i am fine',
  'ధన్యవాదాలు': 'thank you', 'దయచేసి': 'please', 'క్షమించండి': 'sorry',
  'అవును': 'yes', 'కాదు': 'no', 'సరే': 'okay',
  'ప్రేమ': 'love', 'స్నేహితుడు': 'friend', 'కుటుంబం': 'family',
};

const TAMIL_TO_ENGLISH: Record<string, string> = {
  'வணக்கம்': 'hello', 'ஹாய்': 'hi', 'காலை வணக்கம்': 'good morning',
  'எப்படி இருக்கிறீர்கள்': 'how are you', 'நான் நலமாக இருக்கிறேன்': 'i am fine',
  'நன்றி': 'thank you', 'தயவுசெய்து': 'please', 'மன்னிக்கவும்': 'sorry',
  'ஆம்': 'yes', 'இல்லை': 'no', 'சரி': 'okay',
  'காதல்': 'love', 'நண்பன்': 'friend', 'குடும்பம்': 'family',
};

const BENGALI_TO_ENGLISH: Record<string, string> = {
  'নমস্কার': 'hello', 'হ্যালো': 'hello', 'সুপ্রভাত': 'good morning',
  'কেমন আছেন': 'how are you', 'আমি ভালো আছি': 'i am fine',
  'ধন্যবাদ': 'thank you', 'দয়া করে': 'please', 'মাফ করবেন': 'sorry',
  'হ্যাঁ': 'yes', 'না': 'no', 'ঠিক আছে': 'okay',
};

// Reverse dictionaries
const ENGLISH_TO_HINDI = Object.fromEntries(
  Object.entries(HINDI_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);
const ENGLISH_TO_TELUGU = Object.fromEntries(
  Object.entries(TELUGU_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);
const ENGLISH_TO_TAMIL = Object.fromEntries(
  Object.entries(TAMIL_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);
const ENGLISH_TO_BENGALI = Object.fromEntries(
  Object.entries(BENGALI_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// ============================================================
// TRANSLITERATION MAPS
// ============================================================

interface ScriptBlock {
  vowelMap: Record<string, string>;
  consonantMap: Record<string, string>;
  modifiers: Record<string, string>;
  virama?: string;
}

const DEVANAGARI: ScriptBlock = {
  virama: '्',
  vowelMap: {
    'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'ee': 'ई',
    'u': 'उ', 'uu': 'ऊ', 'oo': 'ऊ', 'e': 'ए', 'ai': 'ऐ',
    'o': 'ओ', 'au': 'औ'
  },
  consonantMap: {
    'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
    'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ',
    't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
    'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
    'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
    'sh': 'श', 's': 'स', 'h': 'ह'
  },
  modifiers: {
    'aa': 'ा', 'i': 'ि', 'ii': 'ी', 'ee': 'ी',
    'u': 'ु', 'uu': 'ू', 'oo': 'ू', 'e': 'े', 'ai': 'ै',
    'o': 'ो', 'au': 'ौ'
  }
};

const TELUGU_SCRIPT: ScriptBlock = {
  virama: '్',
  vowelMap: {
    'a': 'అ', 'aa': 'ఆ', 'i': 'ఇ', 'ii': 'ఈ', 'ee': 'ఈ',
    'u': 'ఉ', 'uu': 'ఊ', 'oo': 'ఊ', 'e': 'ఎ', 'ai': 'ఐ',
    'o': 'ఒ', 'au': 'ఔ'
  },
  consonantMap: {
    'k': 'క', 'kh': 'ఖ', 'g': 'గ', 'gh': 'ఘ',
    'ch': 'చ', 'chh': 'ఛ', 'j': 'జ', 'jh': 'ఝ',
    't': 'త', 'th': 'థ', 'd': 'ద', 'dh': 'ధ', 'n': 'న',
    'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
    'y': 'య', 'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ',
    'sh': 'శ', 's': 'స', 'h': 'హ'
  },
  modifiers: {
    'aa': 'ా', 'i': 'ి', 'ii': 'ీ', 'ee': 'ీ',
    'u': 'ు', 'uu': 'ూ', 'oo': 'ూ', 'e': 'ె', 'ai': 'ై',
    'o': 'ొ', 'au': 'ౌ'
  }
};

const TAMIL_SCRIPT: ScriptBlock = {
  virama: '்',
  vowelMap: {
    'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'ee': 'ஈ',
    'u': 'உ', 'uu': 'ஊ', 'oo': 'ஊ', 'e': 'எ', 'ai': 'ஐ',
    'o': 'ஒ', 'au': 'ஔ'
  },
  consonantMap: {
    'k': 'க', 'g': 'க', 'ch': 'ச', 'j': 'ஜ', 's': 'ச',
    't': 'த', 'd': 'த', 'n': 'ந',
    'p': 'ப', 'b': 'ப', 'f': 'ப', 'm': 'ம',
    'y': 'ய', 'r': 'ர', 'l': 'ல', 'v': 'வ', 'w': 'வ',
    'sh': 'ஷ', 'h': 'ஹ'
  },
  modifiers: {
    'aa': 'ா', 'i': 'ி', 'ii': 'ீ', 'ee': 'ீ',
    'u': 'ு', 'uu': 'ூ', 'oo': 'ூ', 'e': 'ெ', 'ai': 'ை',
    'o': 'ொ', 'au': 'ௌ'
  }
};

const SCRIPT_BLOCKS: Record<string, ScriptBlock> = {
  'hindi': DEVANAGARI,
  'hi': DEVANAGARI,
  'marathi': DEVANAGARI,
  'mr': DEVANAGARI,
  'nepali': DEVANAGARI,
  'ne': DEVANAGARI,
  'telugu': TELUGU_SCRIPT,
  'te': TELUGU_SCRIPT,
  'tamil': TAMIL_SCRIPT,
  'ta': TAMIL_SCRIPT,
};

// ============================================================
// CORE FUNCTIONS (Sync, instant)
// ============================================================

/**
 * Detect language from text
 */
export function detectLanguage(text: string): DetectionResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { language: 'english', script: 'Latin', confidence: 0.5 };
  }

  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.language, script: pattern.script, confidence: 0.95 };
    }
  }

  return { language: 'english', script: 'Latin', confidence: 0.7 };
}

/**
 * Check if text is Latin script
 */
export function isLatinScript(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  
  const latinChars = trimmed.match(/[a-zA-Z]/g);
  const totalChars = trimmed.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  
  if (!latinChars || !totalChars.length) {
    return /^[a-zA-Z0-9\s\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]+$/.test(trimmed);
  }
  
  return (latinChars.length / totalChars.length) > 0.8;
}

/**
 * Normalize language name
 */
export function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  
  const aliases: Record<string, string> = {
    'bangla': 'bengali',
    'oriya': 'odia',
    'farsi': 'persian',
    'mandarin': 'chinese',
  };
  
  return aliases[normalized] || normalized;
}

/**
 * Transliterate Latin text to native script
 */
export function transliterate(text: string, targetLanguage: string): string {
  const scriptBlock = SCRIPT_BLOCKS[normalizeLanguage(targetLanguage)];
  if (!scriptBlock) return text;
  
  const { vowelMap, consonantMap, modifiers } = scriptBlock;
  let result = '';
  let i = 0;
  const lowerText = text.toLowerCase();
  
  while (i < lowerText.length) {
    const char = lowerText[i];
    
    if (!/[a-z]/.test(char)) {
      result += text[i];
      i++;
      continue;
    }
    
    // Try multi-character consonants
    let found = false;
    for (const len of [3, 2]) {
      const substr = lowerText.substring(i, i + len);
      if (consonantMap[substr]) {
        result += consonantMap[substr];
        i += len;
        
        // Check for vowel modifier
        for (const vlen of [2, 1]) {
          const vowel = lowerText.substring(i, i + vlen);
          if (modifiers[vowel]) {
            result += modifiers[vowel];
            i += vlen;
            break;
          }
        }
        found = true;
        break;
      }
    }
    
    if (found) continue;
    
    // Single consonant
    if (consonantMap[char]) {
      result += consonantMap[char];
      i++;
      
      for (const vlen of [2, 1]) {
        const vowel = lowerText.substring(i, i + vlen);
        if (modifiers[vowel]) {
          result += modifiers[vowel];
          i += vlen;
          break;
        }
      }
      continue;
    }
    
    // Vowel
    for (const vlen of [2, 1]) {
      const vowel = lowerText.substring(i, i + vlen);
      if (vowelMap[vowel]) {
        result += vowelMap[vowel];
        i += vlen;
        found = true;
        break;
      }
    }
    
    if (!found) {
      result += text[i];
      i++;
    }
  }
  
  return result;
}

/**
 * Get dictionary for translation
 */
function getDictionary(lang: string, direction: 'to_english' | 'from_english'): Record<string, string> {
  const normalized = normalizeLanguage(lang);
  
  if (direction === 'to_english') {
    switch (normalized) {
      case 'hindi': return HINDI_TO_ENGLISH;
      case 'telugu': return TELUGU_TO_ENGLISH;
      case 'tamil': return TAMIL_TO_ENGLISH;
      case 'bengali': return BENGALI_TO_ENGLISH;
      default: return {};
    }
  } else {
    switch (normalized) {
      case 'hindi': return ENGLISH_TO_HINDI;
      case 'telugu': return ENGLISH_TO_TELUGU;
      case 'tamil': return ENGLISH_TO_TAMIL;
      case 'bengali': return ENGLISH_TO_BENGALI;
      default: return {};
    }
  }
}

/**
 * Dictionary-based translation
 */
function dictionaryTranslate(text: string, dictionary: Record<string, string>): { translated: string; found: boolean } {
  const lowerText = text.toLowerCase().trim();
  
  if (dictionary[lowerText]) {
    return { translated: dictionary[lowerText], found: true };
  }
  
  const words = lowerText.split(/\s+/);
  const translatedWords: string[] = [];
  let anyFound = false;
  
  for (const word of words) {
    if (dictionary[word]) {
      translatedWords.push(dictionary[word]);
      anyFound = true;
    } else {
      translatedWords.push(word);
    }
  }
  
  return { translated: translatedWords.join(' '), found: anyFound };
}

/**
 * Translate with English pivot (sync, local)
 */
export function translateLocal(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): TranslationResult {
  const source = normalizeLanguage(sourceLanguage);
  const target = normalizeLanguage(targetLanguage);
  const detected = detectLanguage(text);
  
  if (source === target) {
    return {
      translatedText: text,
      detectedLanguage: detected.language,
      sourceLanguage: source,
      targetLanguage: target,
      isTransliterated: false,
      confidence: 1.0
    };
  }
  
  // Source → English
  let englishText = text;
  if (source !== 'english' && source !== 'en') {
    const toEnglishDict = getDictionary(source, 'to_english');
    const { translated, found } = dictionaryTranslate(text, toEnglishDict);
    if (found) englishText = translated;
  }
  
  // English → Target
  let translatedText = englishText;
  if (target !== 'english' && target !== 'en') {
    const fromEnglishDict = getDictionary(target, 'from_english');
    const { translated, found } = dictionaryTranslate(englishText, fromEnglishDict);
    if (found) {
      translatedText = translated;
    } else if (detected.script === 'Latin') {
      translatedText = transliterate(text, target);
    }
  }
  
  return {
    translatedText,
    detectedLanguage: detected.language,
    sourceLanguage: source,
    targetLanguage: target,
    pivotText: source !== 'english' ? englishText : undefined,
    isTransliterated: detected.script === 'Latin' && translatedText !== text,
    confidence: 0.85
  };
}

/**
 * Convert Latin typing to native script (sync)
 */
export function convertToNativeScript(text: string, targetLanguage: string): string {
  const detected = detectLanguage(text);
  if (detected.script !== 'Latin') return text;
  return transliterate(text, targetLanguage);
}

// ============================================================
// ASYNC API (Edge Function fallback)
// ============================================================

/**
 * Translate using Edge Function (async)
 */
export async function translate(
  text: string,
  sourceLanguage?: string,
  targetLanguage?: string,
  options?: { senderId?: string; receiverId?: string }
): Promise<TranslationResult> {
  // Try local first
  if (sourceLanguage && targetLanguage) {
    const localResult = translateLocal(text, sourceLanguage, targetLanguage);
    if (localResult.confidence > 0.8) {
      return localResult;
    }
  }
  
  // Fallback to Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('libre-translate', {
      body: {
        text,
        sourceLanguage,
        targetLanguage,
        senderId: options?.senderId,
        receiverId: options?.receiverId,
        action: 'translate'
      }
    });
    
    if (error) throw error;
    return data as TranslationResult;
  } catch (err) {
    console.error('Edge function translation failed:', err);
    // Final fallback to local
    return translateLocal(text, sourceLanguage || 'english', targetLanguage || 'english');
  }
}

/**
 * Process message for chat
 */
export async function processMessageForChat(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}> {
  const detected = detectLanguage(text);
  const isLatin = detected.script === 'Latin';
  
  // Convert sender's Latin typing to native script
  let senderView = text;
  let wasTransliterated = false;
  if (isLatin && senderLanguage !== 'english') {
    senderView = convertToNativeScript(text, senderLanguage);
    wasTransliterated = senderView !== text;
  }
  
  // Translate for receiver
  let receiverView = senderView;
  let wasTranslated = false;
  if (normalizeLanguage(senderLanguage) !== normalizeLanguage(receiverLanguage)) {
    const result = translateLocal(senderView, senderLanguage, receiverLanguage);
    receiverView = result.translatedText;
    wasTranslated = receiverView !== senderView;
  }
  
  return {
    senderView,
    receiverView,
    originalText: text,
    wasTransliterated,
    wasTranslated
  };
}

// ============================================================
// REACT HOOK
// ============================================================

export { useLibreTranslate } from './useLibreTranslate';

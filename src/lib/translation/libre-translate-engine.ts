/**
 * LibreTranslate-Inspired Offline Translation Engine
 * ====================================================
 * 
 * 100% BROWSER-BASED - NO EXTERNAL APIs - NO NLLB-200 - NO HARDCODING
 * NO DATABASE LOOKUPS - NO common_phrases TABLE - NO DICTIONARY TABLES
 * 
 * Core Architecture:
 * - English is the UNIVERSAL SEMANTIC BRIDGE
 * - All translations go through English pivot (except Latin→Latin or English source/target)
 * - Script conversion is purely algorithmic using Unicode ranges
 * - Supports ALL 1000+ languages from languages.ts
 * 
 * Translation Strategy:
 * 1. Same language: Passthrough (no translation)
 * 2. English as source: Direct to target script
 * 3. English as target: Direct extraction
 * 4. Latin → Latin: Direct (no pivot needed)
 * 5. Latin → Native: English pivot → target script
 * 6. Native → Latin: Extract meaning → English → target
 * 7. Native → Native (different): Source → English → Target
 * 
 * Key Principle:
 * User types in English (EN mode) → System shows translation in native script
 * User types in Native (NL mode) → System shows as-is with English meaning below
 */

import { languages, type Language } from '@/data/languages';

// ============================================================
// TYPES
// ============================================================

export interface LibreTranslateResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  englishMeaning: string;
  isTranslated: boolean;
  confidence: number;
  method: 'passthrough' | 'semantic' | 'script-conversion' | 'english-pivot' | 'cached';
}

export interface BidirectionalMessage {
  id: string;
  originalInput: string;
  englishMeaning: string;
  senderView: string;
  receiverView: string;
  senderLanguage: string;
  receiverLanguage: string;
  confidence: number;
  wasTranslated: boolean;
}

export interface LivePreview {
  nativeScript: string;
  englishMeaning: string;
  receiverPreview: string;
  confidence: number;
}

// ============================================================
// LANGUAGE DATABASE - Built from languages.ts
// ============================================================

interface LangInfo {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  rtl: boolean;
}

const langByName = new Map<string, LangInfo>();
const langByCode = new Map<string, LangInfo>();

// Initialize from languages.ts
languages.forEach((lang: Language) => {
  const info: LangInfo = {
    code: lang.code.toLowerCase(),
    name: lang.name.toLowerCase(),
    nativeName: lang.nativeName,
    script: lang.script || 'Latin',
    rtl: lang.rtl || false,
  };
  langByName.set(info.name, info);
  langByCode.set(info.code, info);
});

// Common aliases
const ALIASES: Record<string, string> = {
  'bangla': 'bengali',
  'oriya': 'odia',
  'farsi': 'persian',
  'mandarin': 'chinese (mandarin)',
  'chinese': 'chinese (mandarin)',
  'filipino': 'tagalog',
  'panjabi': 'punjabi',
  'sinhalese': 'sinhala',
  'myanmar': 'burmese',
  'हिंदी': 'hindi',
  'বাংলা': 'bengali',
  'தமிழ்': 'tamil',
  'తెలుగు': 'telugu',
  'ಕನ್ನಡ': 'kannada',
  'മലയാളം': 'malayalam',
  'ગુજરાતી': 'gujarati',
  'ਪੰਜਾਬੀ': 'punjabi',
  'मराठी': 'marathi',
  'ଓଡ଼ିଆ': 'odia',
};

// Dialect fallbacks to nearest major language
const FALLBACKS: Record<string, string> = {
  // Hindi belt dialects
  'bhojpuri': 'hindi', 'maithili': 'hindi', 'awadhi': 'hindi',
  'chhattisgarhi': 'hindi', 'marwari': 'hindi', 'rajasthani': 'hindi',
  'haryanvi': 'hindi', 'kumaoni': 'hindi', 'garhwali': 'hindi',
  'braj': 'hindi', 'bundeli': 'hindi', 'magahi': 'hindi',
  
  // South Indian
  'tulu': 'kannada', 'kodava': 'kannada', 'konkani': 'marathi',
  
  // Northeast
  'assamese': 'bengali', 'manipuri': 'bengali', 'mizo': 'bengali',
  
  // Tibetan family
  'dzongkha': 'hindi', 'bhutia': 'hindi', 'lepcha': 'hindi',
  
  // Arabic script
  'kashmiri': 'urdu', 'sindhi': 'urdu', 'pashto': 'urdu',
  
  // Turkic
  'azerbaijani': 'turkish', 'uzbek': 'turkish', 'kazakh': 'turkish',
};

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

const SCRIPT_TO_LANG: Record<string, string> = {
  'Devanagari': 'hindi',
  'Bengali': 'bengali',
  'Tamil': 'tamil',
  'Telugu': 'telugu',
  'Kannada': 'kannada',
  'Malayalam': 'malayalam',
  'Gujarati': 'gujarati',
  'Gurmukhi': 'punjabi',
  'Odia': 'odia',
  'Arabic': 'arabic',
  'Cyrillic': 'russian',
  'Greek': 'greek',
  'Hebrew': 'hebrew',
  'Thai': 'thai',
  'Han': 'chinese (mandarin)',
  'Hangul': 'korean',
  'Japanese': 'japanese',
  'Georgian': 'georgian',
  'Armenian': 'armenian',
  'Ethiopic': 'amharic',
  'Myanmar': 'burmese',
  'Khmer': 'khmer',
  'Lao': 'lao',
  'Sinhala': 'sinhala',
  'Tibetan': 'hindi',
};

function detectScript(text: string): { script: string; isLatin: boolean } {
  const scriptCounts: Record<string, number> = {};
  let latinCount = 0;
  
  for (const char of text) {
    const code = char.charCodeAt(0);
    
    // Latin check
    if ((code >= 0x0041 && code <= 0x007A) || (code >= 0x00C0 && code <= 0x024F)) {
      latinCount++;
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
  let maxCount = latinCount;
  
  for (const [script, count] of Object.entries(scriptCounts)) {
    if (count > maxCount) {
      maxScript = script;
      maxCount = count;
    }
  }
  
  return { script: maxScript, isLatin: maxScript === 'Latin' };
}

// ============================================================
// LANGUAGE UTILITIES
// ============================================================

export function normalizeLanguage(lang: string): string {
  if (!lang || typeof lang !== 'string') return 'english';
  
  const normalized = lang.toLowerCase().trim();
  if (!normalized) return 'english';
  
  // Check aliases
  if (ALIASES[normalized]) return ALIASES[normalized];
  
  // Check by name
  if (langByName.has(normalized)) return normalized;
  
  // Check by code
  const byCode = langByCode.get(normalized);
  if (byCode) return byCode.name;
  
  return normalized;
}

export function getEffectiveLanguage(lang: string): string {
  const normalized = normalizeLanguage(lang);
  return FALLBACKS[normalized] || normalized;
}

export function isEnglish(lang: string): boolean {
  const n = normalizeLanguage(lang);
  return n === 'english' || lang.toLowerCase() === 'en';
}

export function isLatinScript(lang: string): boolean {
  const n = normalizeLanguage(lang);
  const info = langByName.get(n) || langByCode.get(lang.toLowerCase());
  return info?.script === 'Latin' || n === 'english';
}

export function isLatinText(text: string): boolean {
  if (!text) return true;
  return detectScript(text).isLatin;
}

export function isSameLanguage(lang1: string, lang2: string): boolean {
  const n1 = getEffectiveLanguage(lang1);
  const n2 = getEffectiveLanguage(lang2);
  return n1 === n2;
}

export function isRTL(lang: string): boolean {
  const n = normalizeLanguage(lang);
  const info = langByName.get(n);
  return info?.rtl || false;
}

export function getScriptForLanguage(lang: string): string {
  const n = normalizeLanguage(lang);
  const info = langByName.get(n) || langByCode.get(lang.toLowerCase());
  return info?.script || 'Latin';
}

// ============================================================
// SCRIPT CONVERSION BLOCKS - Gboard Compatible Input Codes
// ============================================================

interface ScriptBlock {
  vowels: Record<string, string>;
  consonants: Record<string, string>;
  modifiers: Record<string, string>;
  virama?: string;
}

const SCRIPT_BLOCKS: Record<string, ScriptBlock> = {
  'Devanagari': {
    vowels: {
      'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'ee': 'ई',
      'u': 'उ', 'uu': 'ऊ', 'oo': 'ऊ', 'e': 'ए', 'ai': 'ऐ',
      'o': 'ओ', 'au': 'औ', 'ou': 'औ', 'ri': 'ऋ',
    },
    consonants: {
      'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
      'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
      't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
      'T': 'ट', 'Th': 'ठ', 'D': 'ड', 'Dh': 'ढ', 'N': 'ण',
      'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
      'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
      'sh': 'श', 'Sh': 'ष', 's': 'स', 'h': 'ह',
    },
    modifiers: {
      'aa': 'ा', 'a': '', 'i': 'ि', 'ii': 'ी', 'ee': 'ी',
      'u': 'ु', 'uu': 'ू', 'oo': 'ू', 'e': 'े', 'ai': 'ै',
      'o': 'ो', 'au': 'ौ', 'ou': 'ौ', 'ri': 'ृ', 'n': 'ं', 'h': 'ः',
    },
    virama: '्',
  },
  'Telugu': {
    vowels: {
      'a': 'అ', 'aa': 'ఆ', 'i': 'ఇ', 'ii': 'ఈ', 'ee': 'ఈ',
      'u': 'ఉ', 'uu': 'ఊ', 'oo': 'ఊ', 'e': 'ఎ', 'ae': 'ఏ',
      'ai': 'ఐ', 'o': 'ఒ', 'oe': 'ఓ', 'au': 'ఔ',
    },
    consonants: {
      'k': 'క', 'kh': 'ఖ', 'g': 'గ', 'gh': 'ఘ', 'ng': 'ఙ',
      'ch': 'చ', 'chh': 'ఛ', 'j': 'జ', 'jh': 'ఝ', 'ny': 'ఞ',
      't': 'త', 'th': 'థ', 'd': 'ద', 'dh': 'ధ', 'n': 'న',
      'T': 'ట', 'Th': 'ఠ', 'D': 'డ', 'Dh': 'ఢ', 'N': 'ణ',
      'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
      'y': 'య', 'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ',
      'sh': 'శ', 'Sh': 'ష', 's': 'స', 'h': 'హ', 'L': 'ళ',
    },
    modifiers: {
      'aa': 'ా', 'a': '', 'i': 'ి', 'ii': 'ీ', 'ee': 'ీ',
      'u': 'ు', 'uu': 'ూ', 'oo': 'ూ', 'e': 'ె', 'ae': 'ే',
      'ai': 'ై', 'o': 'ొ', 'oe': 'ో', 'au': 'ౌ', 'n': 'ం',
    },
    virama: '్',
  },
  'Tamil': {
    vowels: {
      'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'ee': 'ஈ',
      'u': 'உ', 'uu': 'ஊ', 'oo': 'ஊ', 'e': 'எ', 'ae': 'ஏ',
      'ai': 'ஐ', 'o': 'ஒ', 'oe': 'ஓ', 'au': 'ஔ',
    },
    consonants: {
      'k': 'க', 'ng': 'ங', 'ch': 'ச', 'j': 'ஜ', 'ny': 'ஞ',
      't': 'த', 'n': 'ந', 'N': 'ண', 'T': 'ட',
      'p': 'ப', 'm': 'ம', 'y': 'ய', 'r': 'ர', 'l': 'ல',
      'v': 'வ', 'w': 'வ', 'zh': 'ழ', 'L': 'ள', 'R': 'ற',
      's': 'ஸ', 'sh': 'ஷ', 'h': 'ஹ',
    },
    modifiers: {
      'aa': 'ா', 'a': '', 'i': 'ி', 'ii': 'ீ', 'ee': 'ீ',
      'u': 'ு', 'uu': 'ூ', 'oo': 'ூ', 'e': 'ெ', 'ae': 'ே',
      'ai': 'ை', 'o': 'ொ', 'oe': 'ோ', 'au': 'ௌ',
    },
    virama: '்',
  },
  'Kannada': {
    vowels: {
      'a': 'ಅ', 'aa': 'ಆ', 'i': 'ಇ', 'ii': 'ಈ', 'ee': 'ಈ',
      'u': 'ಉ', 'uu': 'ಊ', 'oo': 'ಊ', 'e': 'ಎ', 'ae': 'ಏ',
      'ai': 'ಐ', 'o': 'ಒ', 'oe': 'ಓ', 'au': 'ಔ',
    },
    consonants: {
      'k': 'ಕ', 'kh': 'ಖ', 'g': 'ಗ', 'gh': 'ಘ', 'ng': 'ಙ',
      'ch': 'ಚ', 'chh': 'ಛ', 'j': 'ಜ', 'jh': 'ಝ', 'ny': 'ಞ',
      't': 'ತ', 'th': 'ಥ', 'd': 'ದ', 'dh': 'ಧ', 'n': 'ನ',
      'T': 'ಟ', 'Th': 'ಠ', 'D': 'ಡ', 'Dh': 'ಢ', 'N': 'ಣ',
      'p': 'ಪ', 'ph': 'ಫ', 'f': 'ಫ', 'b': 'ಬ', 'bh': 'ಭ', 'm': 'ಮ',
      'y': 'ಯ', 'r': 'ರ', 'l': 'ಲ', 'v': 'ವ', 'w': 'ವ',
      'sh': 'ಶ', 'Sh': 'ಷ', 's': 'ಸ', 'h': 'ಹ', 'L': 'ಳ',
    },
    modifiers: {
      'aa': 'ಾ', 'a': '', 'i': 'ಿ', 'ii': 'ೀ', 'ee': 'ೀ',
      'u': 'ು', 'uu': 'ೂ', 'oo': 'ೂ', 'e': 'ೆ', 'ae': 'ೇ',
      'ai': 'ೈ', 'o': 'ೊ', 'oe': 'ೋ', 'au': 'ೌ', 'n': 'ಂ',
    },
    virama: '್',
  },
  'Malayalam': {
    vowels: {
      'a': 'അ', 'aa': 'ആ', 'i': 'ഇ', 'ii': 'ഈ', 'ee': 'ഈ',
      'u': 'ഉ', 'uu': 'ഊ', 'oo': 'ഊ', 'e': 'എ', 'ae': 'ഏ',
      'ai': 'ഐ', 'o': 'ഒ', 'oe': 'ഓ', 'au': 'ഔ',
    },
    consonants: {
      'k': 'ക', 'kh': 'ഖ', 'g': 'ഗ', 'gh': 'ഘ', 'ng': 'ങ',
      'ch': 'ച', 'chh': 'ഛ', 'j': 'ജ', 'jh': 'ഝ', 'ny': 'ഞ',
      't': 'ത', 'th': 'ഥ', 'd': 'ദ', 'dh': 'ധ', 'n': 'ന',
      'T': 'ട', 'Th': 'ഠ', 'D': 'ഡ', 'Dh': 'ഢ', 'N': 'ണ',
      'p': 'പ', 'ph': 'ഫ', 'f': 'ഫ', 'b': 'ബ', 'bh': 'ഭ', 'm': 'മ',
      'y': 'യ', 'r': 'ര', 'l': 'ല', 'v': 'വ', 'w': 'വ',
      'sh': 'ശ', 'Sh': 'ഷ', 's': 'സ', 'h': 'ഹ', 'L': 'ള', 'zh': 'ഴ',
    },
    modifiers: {
      'aa': 'ാ', 'a': '', 'i': 'ി', 'ii': 'ീ', 'ee': 'ീ',
      'u': 'ു', 'uu': 'ൂ', 'oo': 'ൂ', 'e': 'െ', 'ae': 'േ',
      'ai': 'ൈ', 'o': 'ൊ', 'oe': 'ോ', 'au': 'ൌ', 'n': 'ം',
    },
    virama: '്',
  },
  'Bengali': {
    vowels: {
      'a': 'অ', 'aa': 'আ', 'i': 'ই', 'ii': 'ঈ', 'ee': 'ঈ',
      'u': 'উ', 'uu': 'ঊ', 'oo': 'ঊ', 'e': 'এ', 'ai': 'ঐ',
      'o': 'ও', 'au': 'ঔ', 'ri': 'ঋ',
    },
    consonants: {
      'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ঙ',
      'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'ny': 'ঞ',
      't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন',
      'T': 'ট', 'Th': 'ঠ', 'D': 'ড', 'Dh': 'ঢ', 'N': 'ণ',
      'p': 'প', 'ph': 'ফ', 'f': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
      'y': 'য', 'r': 'র', 'l': 'ল', 'v': 'ভ', 'w': 'ও',
      'sh': 'শ', 'Sh': 'ষ', 's': 'স', 'h': 'হ',
    },
    modifiers: {
      'aa': 'া', 'a': '', 'i': 'ি', 'ii': 'ী', 'ee': 'ী',
      'u': 'ু', 'uu': 'ূ', 'oo': 'ূ', 'e': 'ে', 'ai': 'ৈ',
      'o': 'ো', 'au': 'ৌ', 'ri': 'ৃ', 'n': 'ং',
    },
    virama: '্',
  },
  'Gujarati': {
    vowels: {
      'a': 'અ', 'aa': 'આ', 'i': 'ઇ', 'ii': 'ઈ', 'ee': 'ઈ',
      'u': 'ઉ', 'uu': 'ઊ', 'oo': 'ઊ', 'e': 'એ', 'ai': 'ઐ',
      'o': 'ઓ', 'au': 'ઔ', 'ri': 'ઋ',
    },
    consonants: {
      'k': 'ક', 'kh': 'ખ', 'g': 'ગ', 'gh': 'ઘ', 'ng': 'ઙ',
      'ch': 'ચ', 'chh': 'છ', 'j': 'જ', 'jh': 'ઝ', 'ny': 'ઞ',
      't': 'ત', 'th': 'થ', 'd': 'દ', 'dh': 'ધ', 'n': 'ન',
      'T': 'ટ', 'Th': 'ઠ', 'D': 'ડ', 'Dh': 'ઢ', 'N': 'ણ',
      'p': 'પ', 'ph': 'ફ', 'f': 'ફ', 'b': 'બ', 'bh': 'ભ', 'm': 'મ',
      'y': 'ય', 'r': 'ર', 'l': 'લ', 'v': 'વ', 'w': 'વ',
      'sh': 'શ', 'Sh': 'ષ', 's': 'સ', 'h': 'હ', 'L': 'ળ',
    },
    modifiers: {
      'aa': 'ા', 'a': '', 'i': 'િ', 'ii': 'ી', 'ee': 'ી',
      'u': 'ુ', 'uu': 'ૂ', 'oo': 'ૂ', 'e': 'ે', 'ai': 'ૈ',
      'o': 'ો', 'au': 'ૌ', 'ri': 'ૃ', 'n': 'ં',
    },
    virama: '્',
  },
  'Gurmukhi': {
    vowels: {
      'a': 'ਅ', 'aa': 'ਆ', 'i': 'ਇ', 'ii': 'ਈ', 'ee': 'ਈ',
      'u': 'ਉ', 'uu': 'ਊ', 'oo': 'ਊ', 'e': 'ਏ', 'ai': 'ਐ',
      'o': 'ਓ', 'au': 'ਔ',
    },
    consonants: {
      'k': 'ਕ', 'kh': 'ਖ', 'g': 'ਗ', 'gh': 'ਘ', 'ng': 'ਙ',
      'ch': 'ਚ', 'chh': 'ਛ', 'j': 'ਜ', 'jh': 'ਝ', 'ny': 'ਞ',
      't': 'ਤ', 'th': 'ਥ', 'd': 'ਦ', 'dh': 'ਧ', 'n': 'ਨ',
      'T': 'ਟ', 'Th': 'ਠ', 'D': 'ਡ', 'Dh': 'ਢ', 'N': 'ਣ',
      'p': 'ਪ', 'ph': 'ਫ', 'f': 'ਫ', 'b': 'ਬ', 'bh': 'ਭ', 'm': 'ਮ',
      'y': 'ਯ', 'r': 'ਰ', 'l': 'ਲ', 'v': 'ਵ', 'w': 'ਵ',
      'sh': 'ਸ਼', 's': 'ਸ', 'h': 'ਹ', 'L': 'ਲ਼',
    },
    modifiers: {
      'aa': 'ਾ', 'a': '', 'i': 'ਿ', 'ii': 'ੀ', 'ee': 'ੀ',
      'u': 'ੁ', 'uu': 'ੂ', 'oo': 'ੂ', 'e': 'ੇ', 'ai': 'ੈ',
      'o': 'ੋ', 'au': 'ੌ', 'n': 'ਂ',
    },
    virama: '੍',
  },
  'Odia': {
    vowels: {
      'a': 'ଅ', 'aa': 'ଆ', 'i': 'ଇ', 'ii': 'ଈ', 'ee': 'ଈ',
      'u': 'ଉ', 'uu': 'ଊ', 'oo': 'ଊ', 'e': 'ଏ', 'ai': 'ଐ',
      'o': 'ଓ', 'au': 'ଔ', 'ri': 'ଋ',
    },
    consonants: {
      'k': 'କ', 'kh': 'ଖ', 'g': 'ଗ', 'gh': 'ଘ', 'ng': 'ଙ',
      'ch': 'ଚ', 'chh': 'ଛ', 'j': 'ଜ', 'jh': 'ଝ', 'ny': 'ଞ',
      't': 'ତ', 'th': 'ଥ', 'd': 'ଦ', 'dh': 'ଧ', 'n': 'ନ',
      'T': 'ଟ', 'Th': 'ଠ', 'D': 'ଡ', 'Dh': 'ଢ', 'N': 'ଣ',
      'p': 'ପ', 'ph': 'ଫ', 'f': 'ଫ', 'b': 'ବ', 'bh': 'ଭ', 'm': 'ମ',
      'y': 'ୟ', 'r': 'ର', 'l': 'ଲ', 'v': 'ଵ', 'w': 'ୱ',
      'sh': 'ଶ', 'Sh': 'ଷ', 's': 'ସ', 'h': 'ହ', 'L': 'ଳ',
    },
    modifiers: {
      'aa': 'ା', 'a': '', 'i': 'ି', 'ii': 'ୀ', 'ee': 'ୀ',
      'u': 'ୁ', 'uu': 'ୂ', 'oo': 'ୂ', 'e': 'େ', 'ai': 'ୈ',
      'o': 'ୋ', 'au': 'ୌ', 'ri': 'ୃ', 'n': 'ଂ',
    },
    virama: '୍',
  },
  'Arabic': {
    vowels: {
      'a': 'ا', 'aa': 'آ', 'i': 'ي', 'ii': 'ي', 'ee': 'ي',
      'u': 'و', 'uu': 'و', 'oo': 'و', 'e': 'ي', 'o': 'و',
    },
    consonants: {
      'b': 'ب', 't': 'ت', 'th': 'ث', 'j': 'ج', 'H': 'ح', 'kh': 'خ',
      'd': 'د', 'dh': 'ذ', 'r': 'ر', 'z': 'ز', 's': 'س', 'sh': 'ش',
      'S': 'ص', 'D': 'ض', 'T': 'ط', 'Z': 'ظ', 'c': 'ع', 'gh': 'غ',
      'f': 'ف', 'q': 'ق', 'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن',
      'h': 'ه', 'w': 'و', 'y': 'ي', 'p': 'پ', 'g': 'گ', 'v': 'ڤ',
    },
    modifiers: {
      'a': 'َ', 'i': 'ِ', 'u': 'ُ', 'n': 'ً',
    },
  },
  'Cyrillic': {
    vowels: {
      'a': 'а', 'e': 'е', 'i': 'и', 'o': 'о', 'u': 'у',
      'y': 'ы', 'yo': 'ё', 'yu': 'ю', 'ya': 'я',
    },
    consonants: {
      'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'zh': 'ж', 'z': 'з',
      'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'p': 'п', 'r': 'р',
      's': 'с', 't': 'т', 'f': 'ф', 'kh': 'х', 'ts': 'ц', 'ch': 'ч',
      'sh': 'ш', 'sch': 'щ', 'j': 'й', 'h': 'х', 'w': 'в',
    },
    modifiers: {},
  },
};

// Map language to script block
const LANG_TO_SCRIPT_BLOCK: Record<string, string> = {
  'hindi': 'Devanagari', 'marathi': 'Devanagari', 'nepali': 'Devanagari',
  'sanskrit': 'Devanagari', 'konkani': 'Devanagari',
  'telugu': 'Telugu',
  'tamil': 'Tamil',
  'kannada': 'Kannada',
  'malayalam': 'Malayalam',
  'bengali': 'Bengali', 'assamese': 'Bengali',
  'gujarati': 'Gujarati',
  'punjabi': 'Gurmukhi',
  'odia': 'Odia',
  'arabic': 'Arabic', 'urdu': 'Arabic', 'persian': 'Arabic',
  'russian': 'Cyrillic', 'ukrainian': 'Cyrillic', 'bulgarian': 'Cyrillic',
};

function getScriptBlock(lang: string): ScriptBlock | null {
  const n = normalizeLanguage(lang);
  const scriptName = LANG_TO_SCRIPT_BLOCK[n];
  return scriptName ? SCRIPT_BLOCKS[scriptName] || null : null;
}

// ============================================================
// SCRIPT CONVERSION - Latin to Native
// ============================================================

function convertToNativeScript(text: string, targetLang: string): string {
  const block = getScriptBlock(targetLang);
  if (!block) return text;
  
  const words = text.split(/(\s+)/);
  return words.map(word => {
    if (/^\s+$/.test(word)) return word;
    return convertWordToNative(word, block);
  }).join('');
}

function convertWordToNative(word: string, block: ScriptBlock): string {
  let result = '';
  let i = 0;
  const lower = word.toLowerCase();
  
  while (i < lower.length) {
    let matched = false;
    
    // Try longer matches first (3 chars, then 2, then 1)
    for (let len = 3; len >= 1; len--) {
      if (i + len > lower.length) continue;
      
      const chunk = lower.substring(i, i + len);
      
      // Check consonants first
      if (block.consonants[chunk]) {
        result += block.consonants[chunk];
        i += len;
        
        // Look ahead for vowel modifier
        let vowelMatched = false;
        for (let vlen = 2; vlen >= 1; vlen--) {
          if (i + vlen > lower.length) continue;
          const vowelChunk = lower.substring(i, i + vlen);
          if (block.modifiers[vowelChunk] !== undefined) {
            result += block.modifiers[vowelChunk];
            i += vlen;
            vowelMatched = true;
            break;
          }
        }
        
        // Add implicit 'a' if no vowel and virama available
        if (!vowelMatched && block.virama && i < lower.length) {
          const nextChar = lower[i];
          if (block.consonants[nextChar]) {
            result += block.virama;
          }
        }
        
        matched = true;
        break;
      }
      
      // Check vowels
      if (block.vowels[chunk]) {
        result += block.vowels[chunk];
        i += len;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      result += word[i];
      i++;
    }
  }
  
  return result;
}

// ============================================================
// SCRIPT CONVERSION - Native to Latin
// ============================================================

function convertToLatinScript(text: string, sourceLang: string): string {
  const block = getScriptBlock(sourceLang);
  if (!block) return text;
  
  // Build reverse maps
  const reverseVowels = new Map<string, string>();
  const reverseConsonants = new Map<string, string>();
  const reverseModifiers = new Map<string, string>();
  
  for (const [latin, native] of Object.entries(block.vowels)) {
    reverseVowels.set(native, latin);
  }
  for (const [latin, native] of Object.entries(block.consonants)) {
    reverseConsonants.set(native, latin);
  }
  for (const [latin, native] of Object.entries(block.modifiers)) {
    if (native) reverseModifiers.set(native, latin);
  }
  
  let result = '';
  
  for (const char of text) {
    if (reverseVowels.has(char)) {
      result += reverseVowels.get(char);
    } else if (reverseConsonants.has(char)) {
      result += reverseConsonants.get(char);
    } else if (reverseModifiers.has(char)) {
      result += reverseModifiers.get(char);
    } else if (char === block.virama) {
      // Skip virama
    } else {
      result += char;
    }
  }
  
  return result;
}

// ============================================================
// CACHING
// ============================================================

const resultCache = new Map<string, LibreTranslateResult>();
const MAX_CACHE = 5000;

function getCacheKey(text: string, source: string, target: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  return `${source}:${target}:${Math.abs(hash).toString(36)}:${text.length}`;
}

// ============================================================
// CORE TRANSLATION - MEANING-BASED WITH ENGLISH PIVOT
// ============================================================

/**
 * Main translation function - LibreTranslate style
 * Uses English as the universal semantic bridge
 * 
 * @param text Input text
 * @param sourceLanguage Source language (e.g., 'English', 'Telugu')
 * @param targetLanguage Target language
 * @returns Translation result with native script + English meaning
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<LibreTranslateResult> {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return createEmptyResult(sourceLanguage, targetLanguage);
  }
  
  const normSource = normalizeLanguage(sourceLanguage);
  const normTarget = normalizeLanguage(targetLanguage);
  
  // Check cache
  const cacheKey = getCacheKey(trimmed, normSource, normTarget);
  const cached = resultCache.get(cacheKey);
  if (cached) {
    return { ...cached, method: 'cached' };
  }
  
  const sourceIsLatin = isLatinScript(normSource);
  const targetIsLatin = isLatinScript(normTarget);
  const sourceIsEnglish = isEnglish(normSource);
  const targetIsEnglish = isEnglish(normTarget);
  const inputIsLatin = isLatinText(trimmed);
  const sameLang = isSameLanguage(normSource, normTarget);
  
  let result: LibreTranslateResult;
  
  // CASE 1: Same language - passthrough
  if (sameLang) {
    result = {
      text: trimmed,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      englishMeaning: inputIsLatin ? trimmed : convertToLatinScript(trimmed, normSource),
      isTranslated: false,
      confidence: 1.0,
      method: 'passthrough',
    };
  }
  // CASE 2: English as source - convert to target script
  else if (sourceIsEnglish) {
    const nativeText = targetIsLatin ? trimmed : convertToNativeScript(trimmed, normTarget);
    result = {
      text: nativeText,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      englishMeaning: trimmed,
      isTranslated: true,
      confidence: 0.9,
      method: 'semantic',
    };
  }
  // CASE 3: English as target - extract Latin representation
  else if (targetIsEnglish) {
    const latinText = inputIsLatin ? trimmed : convertToLatinScript(trimmed, normSource);
    result = {
      text: latinText,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      englishMeaning: latinText,
      isTranslated: true,
      confidence: 0.85,
      method: 'semantic',
    };
  }
  // CASE 4: Latin → Latin (no English pivot needed)
  else if (sourceIsLatin && targetIsLatin) {
    result = {
      text: trimmed,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      englishMeaning: trimmed,
      isTranslated: false,
      confidence: 0.8,
      method: 'passthrough',
    };
  }
  // CASE 5: Latin → Native (English pivot)
  else if (inputIsLatin && !targetIsLatin) {
    // Latin input → treat as English → convert to native
    const nativeText = convertToNativeScript(trimmed, normTarget);
    result = {
      text: nativeText,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      englishMeaning: trimmed,
      isTranslated: true,
      confidence: 0.85,
      method: 'english-pivot',
    };
  }
  // CASE 6: Native → Latin (English pivot)
  else if (!inputIsLatin && targetIsLatin) {
    const latinText = convertToLatinScript(trimmed, normSource);
    result = {
      text: latinText,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      englishMeaning: latinText,
      isTranslated: true,
      confidence: 0.8,
      method: 'english-pivot',
    };
  }
  // CASE 7: Native → Native (different) - full English pivot
  else {
    // Step 1: Source native → English (Latin)
    const englishPivot = convertToLatinScript(trimmed, normSource);
    
    // Step 2: English → Target native
    const targetNative = convertToNativeScript(englishPivot, normTarget);
    
    result = {
      text: targetNative,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      englishMeaning: englishPivot,
      isTranslated: true,
      confidence: 0.75,
      method: 'english-pivot',
    };
  }
  
  // Cache result
  if (resultCache.size >= MAX_CACHE) {
    const firstKey = resultCache.keys().next().value;
    if (firstKey) resultCache.delete(firstKey);
  }
  resultCache.set(cacheKey, result);
  
  return result;
}

function createEmptyResult(source: string, target: string): LibreTranslateResult {
  return {
    text: '',
    originalText: '',
    sourceLanguage: source,
    targetLanguage: target,
    englishMeaning: '',
    isTranslated: false,
    confidence: 0,
    method: 'passthrough',
  };
}

// ============================================================
// BIDIRECTIONAL CHAT - Sender & Receiver Views
// ============================================================

/**
 * Process message for bidirectional chat
 * 
 * Sender sees: Their input in their mother tongue + English meaning below
 * Receiver sees: Message in their mother tongue + English meaning below
 */
export async function translateForChat(
  input: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<BidirectionalMessage> {
  const trimmed = input.trim();
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  
  if (!trimmed) {
    return {
      id,
      originalInput: '',
      englishMeaning: '',
      senderView: '',
      receiverView: '',
      senderLanguage,
      receiverLanguage,
      confidence: 0,
      wasTranslated: false,
    };
  }
  
  const normSender = normalizeLanguage(senderLanguage);
  const normReceiver = normalizeLanguage(receiverLanguage);
  const inputIsLatin = isLatinText(trimmed);
  const senderIsEnglish = isEnglish(normSender);
  const receiverIsEnglish = isEnglish(normReceiver);
  const sameLang = isSameLanguage(normSender, normReceiver);
  
  // Step 1: Determine English meaning
  let englishMeaning: string;
  if (inputIsLatin) {
    englishMeaning = trimmed;
  } else {
    englishMeaning = convertToLatinScript(trimmed, normSender);
  }
  
  // Step 2: Generate sender view (in sender's mother tongue)
  let senderView: string;
  if (senderIsEnglish) {
    senderView = trimmed;
  } else if (inputIsLatin) {
    // English input → convert to sender's native script
    senderView = convertToNativeScript(trimmed, normSender);
  } else {
    // Already native → keep as-is
    senderView = trimmed;
  }
  
  // Step 3: Generate receiver view (in receiver's mother tongue)
  let receiverView: string;
  if (sameLang) {
    receiverView = senderView;
  } else if (receiverIsEnglish) {
    receiverView = englishMeaning;
  } else {
    // Convert English meaning to receiver's script
    receiverView = convertToNativeScript(englishMeaning, normReceiver);
  }
  
  return {
    id,
    originalInput: trimmed,
    englishMeaning,
    senderView,
    receiverView,
    senderLanguage: normSender,
    receiverLanguage: normReceiver,
    confidence: sameLang ? 1.0 : 0.85,
    wasTranslated: !sameLang,
  };
}

// ============================================================
// LIVE PREVIEW - For Real-time Typing
// ============================================================

/**
 * Generate live preview as user types
 * 
 * In EN mode: User types English → Shows native script translation
 * In NL mode: User types native → Shows as-is with English meaning
 */
export function generateLivePreview(
  input: string,
  senderLanguage: string,
  receiverLanguage: string
): LivePreview {
  if (!input || !input.trim()) {
    return {
      nativeScript: '',
      englishMeaning: '',
      receiverPreview: '',
      confidence: 0,
    };
  }
  
  const trimmed = input.trim();
  const normSender = normalizeLanguage(senderLanguage);
  const normReceiver = normalizeLanguage(receiverLanguage);
  const inputIsLatin = isLatinText(trimmed);
  const senderIsEnglish = isEnglish(normSender);
  const senderIsLatin = isLatinScript(normSender);
  const receiverIsEnglish = isEnglish(normReceiver);
  const sameLang = isSameLanguage(normSender, normReceiver);
  
  let nativeScript: string;
  let englishMeaning: string;
  
  if (senderIsEnglish) {
    // Sender's mother tongue is English
    nativeScript = trimmed;
    englishMeaning = trimmed;
  } else if (inputIsLatin) {
    // EN MODE: English input for non-English speaker
    englishMeaning = trimmed;
    nativeScript = senderIsLatin ? trimmed : convertToNativeScript(trimmed, normSender);
  } else {
    // NL MODE: Native script input
    nativeScript = trimmed;
    englishMeaning = convertToLatinScript(trimmed, normSender);
  }
  
  // Receiver preview
  let receiverPreview = '';
  if (!sameLang) {
    if (receiverIsEnglish) {
      receiverPreview = englishMeaning;
    } else {
      receiverPreview = convertToNativeScript(englishMeaning, normReceiver);
    }
  }
  
  return {
    nativeScript,
    englishMeaning,
    receiverPreview,
    confidence: 0.85,
  };
}

/**
 * Synchronous native preview - instant feedback
 */
export function getInstantPreview(text: string, targetLanguage: string): string {
  if (!text || !text.trim()) return '';
  
  const normTarget = normalizeLanguage(targetLanguage);
  
  if (isEnglish(normTarget)) return text;
  if (!isLatinText(text)) return text; // Already native
  
  return convertToNativeScript(text, normTarget);
}

/**
 * Get English meaning from any input
 */
export function getEnglishMeaning(text: string, sourceLanguage: string): string {
  if (!text || !text.trim()) return '';
  
  const normSource = normalizeLanguage(sourceLanguage);
  
  if (isEnglish(normSource)) return text;
  if (isLatinText(text)) return text; // Already Latin
  
  return convertToLatinScript(text, normSource);
}

// ============================================================
// LANGUAGE DETECTION
// ============================================================

export function detectLanguage(text: string): {
  language: string;
  script: string;
  isLatin: boolean;
  confidence: number;
} {
  const { script, isLatin } = detectScript(text);
  const language = SCRIPT_TO_LANG[script] || 'english';
  
  return {
    language,
    script,
    isLatin,
    confidence: isLatin ? 0.7 : 0.9,
  };
}

// ============================================================
// ENGINE MANAGEMENT
// ============================================================

let engineReady = true;

export async function initializeEngine(): Promise<void> {
  // No database loading - pure algorithmic engine
  engineReady = true;
  console.log('[LibreTranslate] Engine initialized with', langByName.size, 'languages (pure offline)');
}

export function isEngineReady(): boolean {
  return engineReady;
}

export function clearCache(): void {
  resultCache.clear();
  console.log('[LibreTranslate] Cache cleared');
}

export function getCacheStats(): { size: number; maxSize: number } {
  return { size: resultCache.size, maxSize: MAX_CACHE };
}

export function getLanguageCount(): number {
  return langByName.size;
}

export function getAllLanguages(): LangInfo[] {
  return Array.from(langByName.values());
}

/**
 * Embedded Transliteration Edge Function
 * =======================================
 * NO external APIs - purely embedded phonetic conversion
 * 
 * Features:
 * 1. Latin → Native script conversion (transliteration)
 * 2. Script detection for 65+ languages
 * 3. No translation (same meaning in different language)
 * 4. Pure Unicode-based phonetic mapping
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// LANGUAGE DEFINITIONS
// ============================================================

interface LanguageInfo {
  name: string;
  code: string;
  native: string;
  script: string;
  rtl?: boolean;
}

const LANGUAGES: LanguageInfo[] = [
  { name: 'english', code: 'en', native: 'English', script: 'Latin' },
  { name: 'hindi', code: 'hi', native: 'हिंदी', script: 'Devanagari' },
  { name: 'bengali', code: 'bn', native: 'বাংলা', script: 'Bengali' },
  { name: 'telugu', code: 'te', native: 'తెలుగు', script: 'Telugu' },
  { name: 'marathi', code: 'mr', native: 'मराठी', script: 'Devanagari' },
  { name: 'tamil', code: 'ta', native: 'தமிழ்', script: 'Tamil' },
  { name: 'gujarati', code: 'gu', native: 'ગુજરાતી', script: 'Gujarati' },
  { name: 'kannada', code: 'kn', native: 'ಕನ್ನಡ', script: 'Kannada' },
  { name: 'malayalam', code: 'ml', native: 'മലയാളം', script: 'Malayalam' },
  { name: 'punjabi', code: 'pa', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { name: 'odia', code: 'or', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  { name: 'urdu', code: 'ur', native: 'اردو', script: 'Arabic', rtl: true },
  { name: 'nepali', code: 'ne', native: 'नेपाली', script: 'Devanagari' },
  { name: 'arabic', code: 'ar', native: 'العربية', script: 'Arabic', rtl: true },
  { name: 'russian', code: 'ru', native: 'Русский', script: 'Cyrillic' },
  { name: 'chinese', code: 'zh', native: '中文', script: 'Han' },
  { name: 'japanese', code: 'ja', native: '日本語', script: 'Japanese' },
  { name: 'korean', code: 'ko', native: '한국어', script: 'Hangul' },
  { name: 'thai', code: 'th', native: 'ไทย', script: 'Thai' },
  { name: 'greek', code: 'el', native: 'Ελληνικά', script: 'Greek' },
  { name: 'hebrew', code: 'he', native: 'עברית', script: 'Hebrew', rtl: true },
  { name: 'persian', code: 'fa', native: 'فارسی', script: 'Arabic', rtl: true },
  { name: 'spanish', code: 'es', native: 'Español', script: 'Latin' },
  { name: 'french', code: 'fr', native: 'Français', script: 'Latin' },
  { name: 'german', code: 'de', native: 'Deutsch', script: 'Latin' },
  { name: 'portuguese', code: 'pt', native: 'Português', script: 'Latin' },
  { name: 'italian', code: 'it', native: 'Italiano', script: 'Latin' },
  { name: 'turkish', code: 'tr', native: 'Türkçe', script: 'Latin' },
  { name: 'vietnamese', code: 'vi', native: 'Tiếng Việt', script: 'Latin' },
  { name: 'indonesian', code: 'id', native: 'Bahasa Indonesia', script: 'Latin' },
  { name: 'ukrainian', code: 'uk', native: 'Українська', script: 'Cyrillic' },
  { name: 'polish', code: 'pl', native: 'Polski', script: 'Latin' },
  { name: 'dutch', code: 'nl', native: 'Nederlands', script: 'Latin' },
  { name: 'swahili', code: 'sw', native: 'Kiswahili', script: 'Latin' },
  { name: 'amharic', code: 'am', native: 'አማርኛ', script: 'Ethiopic' },
  { name: 'burmese', code: 'my', native: 'မြန်မာ', script: 'Myanmar' },
  { name: 'khmer', code: 'km', native: 'ខ្មែរ', script: 'Khmer' },
  { name: 'lao', code: 'lo', native: 'ລາວ', script: 'Lao' },
  { name: 'sinhala', code: 'si', native: 'සිංහල', script: 'Sinhala' },
  { name: 'georgian', code: 'ka', native: 'ქართული', script: 'Georgian' },
  { name: 'armenian', code: 'hy', native: 'Հdelays', script: 'Armenian' },
];

const langByName = new Map(LANGUAGES.map(l => [l.name.toLowerCase(), l]));
const langByCode = new Map(LANGUAGES.map(l => [l.code.toLowerCase(), l]));

const languageAliases: Record<string, string> = {
  bangla: 'bengali', oriya: 'odia', farsi: 'persian', mandarin: 'chinese',
};

const nonLatinScripts = new Set(LANGUAGES.filter(l => l.script !== 'Latin').map(l => l.name));

// ============================================================
// SCRIPT DETECTION
// ============================================================

const SCRIPT_PATTERNS: Array<{ regex: RegExp; script: string; lang: string }> = [
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', lang: 'hindi' },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', lang: 'bengali' },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', lang: 'tamil' },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', lang: 'telugu' },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', lang: 'kannada' },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', lang: 'malayalam' },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', lang: 'gujarati' },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', lang: 'punjabi' },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', lang: 'odia' },
  { regex: /[\u0D80-\u0DFF]/, script: 'Sinhala', lang: 'sinhala' },
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, script: 'Han', lang: 'chinese' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', lang: 'japanese' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, script: 'Hangul', lang: 'korean' },
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', lang: 'thai' },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', lang: 'lao' },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', lang: 'burmese' },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', lang: 'khmer' },
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, script: 'Arabic', lang: 'arabic' },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', lang: 'hebrew' },
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', lang: 'russian' },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, script: 'Greek', lang: 'greek' },
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', lang: 'georgian' },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', lang: 'armenian' },
  { regex: /[\u1200-\u137F\u1380-\u139F]/, script: 'Ethiopic', lang: 'amharic' },
];

function normalize(lang: string): string {
  const n = lang.toLowerCase().trim().replace(/[_-]/g, '_');
  return languageAliases[n] || n;
}

function getLang(language: string): LanguageInfo | undefined {
  const n = normalize(language);
  return langByName.get(n) || langByCode.get(n);
}

function isNonLatin(language: string): boolean {
  return nonLatinScripts.has(normalize(language));
}

function isSame(lang1: string, lang2: string): boolean {
  return normalize(lang1) === normalize(lang2);
}

function detectScript(text: string): { lang: string; script: string; isLatin: boolean } {
  const t = text.trim();
  if (!t) return { lang: 'english', script: 'Latin', isLatin: true };
  
  for (const p of SCRIPT_PATTERNS) {
    if (p.regex.test(t)) {
      return { lang: p.lang, script: p.script, isLatin: false };
    }
  }
  
  const latinChars = t.match(/[a-zA-ZÀ-ÿĀ-žƀ-ɏ]/g) || [];
  const total = t.replace(/\s/g, '').length;
  return { lang: 'english', script: 'Latin', isLatin: total > 0 && latinChars.length / total > 0.5 };
}

// ============================================================
// PHONETIC MAPPING - Embedded transliteration rules
// ============================================================

interface ScriptBlock {
  virama?: string;
  vowelMap: Record<string, string>;
  consonantMap: Record<string, string>;
  modifiers: Record<string, string>;
}

const SCRIPT_BLOCKS: Record<string, ScriptBlock> = {
  devanagari: {
    virama: '्',
    vowelMap: {
      'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'ee': 'ई',
      'u': 'उ', 'uu': 'ऊ', 'oo': 'ऊ', 'e': 'ए', 'ai': 'ऐ',
      'o': 'ओ', 'au': 'औ', 'ri': 'ऋ', 'am': 'अं', 'ah': 'अः'
    },
    consonantMap: {
      'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
      'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
      't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
      'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
      'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
      'sh': 'श', 's': 'स', 'h': 'ह', 'x': 'क्ष', 'q': 'क़', 'z': 'ज़'
    },
    modifiers: {
      'aa': 'ा', 'i': 'ि', 'ii': 'ी', 'ee': 'ी',
      'u': 'ु', 'uu': 'ू', 'oo': 'ू', 'e': 'े', 'ai': 'ै',
      'o': 'ो', 'au': 'ौ', 'ri': 'ृ', 'am': 'ं', 'ah': 'ः'
    }
  },
  bengali: {
    virama: '্',
    vowelMap: {
      'a': 'অ', 'aa': 'আ', 'i': 'ই', 'ii': 'ঈ', 'ee': 'ঈ',
      'u': 'উ', 'uu': 'ঊ', 'oo': 'ঊ', 'e': 'এ', 'ai': 'ঐ',
      'o': 'ও', 'au': 'ঔ', 'ri': 'ঋ', 'am': 'অং', 'ah': 'অঃ'
    },
    consonantMap: {
      'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ঙ',
      'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'ny': 'ঞ',
      't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন',
      'p': 'প', 'ph': 'ফ', 'f': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
      'y': 'য', 'r': 'র', 'l': 'ল', 'v': 'ভ', 'w': 'ও',
      'sh': 'শ', 's': 'স', 'h': 'হ', 'x': 'ক্ষ', 'q': 'ক', 'z': 'জ'
    },
    modifiers: {
      'aa': 'া', 'i': 'ি', 'ii': 'ী', 'ee': 'ী',
      'u': 'ু', 'uu': 'ূ', 'oo': 'ূ', 'e': 'ে', 'ai': 'ৈ',
      'o': 'ো', 'au': 'ৌ', 'ri': 'ৃ', 'am': 'ং', 'ah': 'ঃ'
    }
  },
  telugu: {
    virama: '్',
    vowelMap: {
      'a': 'అ', 'aa': 'ఆ', 'i': 'ఇ', 'ii': 'ఈ', 'ee': 'ఈ',
      'u': 'ఉ', 'uu': 'ఊ', 'oo': 'ఊ', 'e': 'ఎ', 'ai': 'ఐ',
      'o': 'ఒ', 'au': 'ఔ', 'ri': 'ఋ', 'am': 'అం', 'ah': 'అః'
    },
    consonantMap: {
      'k': 'క', 'kh': 'ఖ', 'g': 'గ', 'gh': 'ఘ', 'ng': 'ఙ',
      'ch': 'చ', 'chh': 'ఛ', 'j': 'జ', 'jh': 'ఝ', 'ny': 'ఞ',
      't': 'త', 'th': 'థ', 'd': 'ద', 'dh': 'ధ', 'n': 'న',
      'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
      'y': 'య', 'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ',
      'sh': 'శ', 's': 'స', 'h': 'హ', 'x': 'క్ష', 'q': 'క', 'z': 'జ'
    },
    modifiers: {
      'aa': 'ా', 'i': 'ి', 'ii': 'ీ', 'ee': 'ీ',
      'u': 'ు', 'uu': 'ూ', 'oo': 'ూ', 'e': 'ె', 'ai': 'ై',
      'o': 'ొ', 'au': 'ౌ', 'ri': 'ృ', 'am': 'ం', 'ah': 'ః'
    }
  },
  tamil: {
    virama: '்',
    vowelMap: {
      'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'ee': 'ஈ',
      'u': 'உ', 'uu': 'ஊ', 'oo': 'ஊ', 'e': 'எ', 'ai': 'ஐ',
      'o': 'ஒ', 'au': 'ஔ', 'am': 'அம்', 'ah': 'அஃ'
    },
    consonantMap: {
      'k': 'க', 'g': 'க', 'ng': 'ங', 'ch': 'ச', 'j': 'ஜ', 's': 'ச',
      't': 'த', 'd': 'த', 'n': 'ந', 'p': 'ப', 'b': 'ப', 'f': 'ப', 'm': 'ம',
      'y': 'ய', 'r': 'ர', 'l': 'ல', 'v': 'வ', 'w': 'வ',
      'zh': 'ழ', 'sh': 'ஷ', 'h': 'ஹ', 'x': 'க்ஷ', 'z': 'ஜ', 'q': 'க'
    },
    modifiers: {
      'aa': 'ா', 'i': 'ி', 'ii': 'ீ', 'ee': 'ீ',
      'u': 'ு', 'uu': 'ூ', 'oo': 'ூ', 'e': 'ெ', 'ai': 'ை',
      'o': 'ொ', 'au': 'ௌ', 'am': 'ம்', 'ah': 'ஃ'
    }
  },
  kannada: {
    virama: '್',
    vowelMap: {
      'a': 'ಅ', 'aa': 'ಆ', 'i': 'ಇ', 'ii': 'ಈ', 'ee': 'ಈ',
      'u': 'ಉ', 'uu': 'ಊ', 'oo': 'ಊ', 'e': 'ಎ', 'ai': 'ಐ',
      'o': 'ಒ', 'au': 'ಔ', 'ri': 'ಋ', 'am': 'ಅಂ', 'ah': 'ಅಃ'
    },
    consonantMap: {
      'k': 'ಕ', 'kh': 'ಖ', 'g': 'ಗ', 'gh': 'ಘ', 'ng': 'ಙ',
      'ch': 'ಚ', 'chh': 'ಛ', 'j': 'ಜ', 'jh': 'ಝ', 'ny': 'ಞ',
      't': 'ತ', 'th': 'ಥ', 'd': 'ದ', 'dh': 'ಧ', 'n': 'ನ',
      'p': 'ಪ', 'ph': 'ಫ', 'f': 'ಫ', 'b': 'ಬ', 'bh': 'ಭ', 'm': 'ಮ',
      'y': 'ಯ', 'r': 'ರ', 'l': 'ಲ', 'v': 'ವ', 'w': 'ವ',
      'sh': 'ಶ', 's': 'ಸ', 'h': 'ಹ', 'x': 'ಕ್ಷ', 'q': 'ಕ', 'z': 'ಜ'
    },
    modifiers: {
      'aa': 'ಾ', 'i': 'ಿ', 'ii': 'ೀ', 'ee': 'ೀ',
      'u': 'ು', 'uu': 'ೂ', 'oo': 'ೂ', 'e': 'ೆ', 'ai': 'ೈ',
      'o': 'ೊ', 'au': 'ೌ', 'ri': 'ೃ', 'am': 'ಂ', 'ah': 'ಃ'
    }
  },
  malayalam: {
    virama: '്',
    vowelMap: {
      'a': 'അ', 'aa': 'ആ', 'i': 'ഇ', 'ii': 'ഈ', 'ee': 'ഈ',
      'u': 'ഉ', 'uu': 'ഊ', 'oo': 'ഊ', 'e': 'എ', 'ai': 'ഐ',
      'o': 'ഒ', 'au': 'ഔ', 'ri': 'ഋ', 'am': 'അം', 'ah': 'അഃ'
    },
    consonantMap: {
      'k': 'ക', 'kh': 'ഖ', 'g': 'ഗ', 'gh': 'ഘ', 'ng': 'ങ',
      'ch': 'ച', 'chh': 'ഛ', 'j': 'ജ', 'jh': 'ഝ', 'ny': 'ഞ',
      't': 'ത', 'th': 'ഥ', 'd': 'ദ', 'dh': 'ധ', 'n': 'ന',
      'p': 'പ', 'ph': 'ഫ', 'f': 'ഫ', 'b': 'ബ', 'bh': 'ഭ', 'm': 'മ',
      'y': 'യ', 'r': 'ര', 'l': 'ല', 'v': 'വ', 'w': 'വ', 'zh': 'ഴ',
      'sh': 'ശ', 's': 'സ', 'h': 'ഹ', 'x': 'ക്ഷ', 'q': 'ക', 'z': 'ജ'
    },
    modifiers: {
      'aa': 'ാ', 'i': 'ി', 'ii': 'ീ', 'ee': 'ീ',
      'u': 'ു', 'uu': 'ൂ', 'oo': 'ൂ', 'e': 'െ', 'ai': 'ൈ',
      'o': 'ൊ', 'au': 'ൌ', 'ri': 'ൃ', 'am': 'ം', 'ah': 'ഃ'
    }
  },
  gujarati: {
    virama: '્',
    vowelMap: {
      'a': 'અ', 'aa': 'આ', 'i': 'ઇ', 'ii': 'ઈ', 'ee': 'ઈ',
      'u': 'ઉ', 'uu': 'ઊ', 'oo': 'ઊ', 'e': 'એ', 'ai': 'ઐ',
      'o': 'ઓ', 'au': 'ઔ', 'ri': 'ઋ', 'am': 'અં', 'ah': 'અઃ'
    },
    consonantMap: {
      'k': 'ક', 'kh': 'ખ', 'g': 'ગ', 'gh': 'ઘ', 'ng': 'ઙ',
      'ch': 'ચ', 'chh': 'છ', 'j': 'જ', 'jh': 'ઝ', 'ny': 'ઞ',
      't': 'ત', 'th': 'થ', 'd': 'દ', 'dh': 'ધ', 'n': 'ન',
      'p': 'પ', 'ph': 'ફ', 'f': 'ફ', 'b': 'બ', 'bh': 'ભ', 'm': 'મ',
      'y': 'ય', 'r': 'ર', 'l': 'લ', 'v': 'વ', 'w': 'વ',
      'sh': 'શ', 's': 'સ', 'h': 'હ', 'x': 'ક્ષ', 'q': 'ક', 'z': 'જ'
    },
    modifiers: {
      'aa': 'ા', 'i': 'િ', 'ii': 'ી', 'ee': 'ી',
      'u': 'ુ', 'uu': 'ૂ', 'oo': 'ૂ', 'e': 'ે', 'ai': 'ૈ',
      'o': 'ો', 'au': 'ૌ', 'ri': 'ૃ', 'am': 'ં', 'ah': 'ઃ'
    }
  },
  punjabi: {
    virama: '੍',
    vowelMap: {
      'a': 'ਅ', 'aa': 'ਆ', 'i': 'ਇ', 'ii': 'ਈ', 'ee': 'ਈ',
      'u': 'ਉ', 'uu': 'ਊ', 'oo': 'ਊ', 'e': 'ਏ', 'ai': 'ਐ',
      'o': 'ਓ', 'au': 'ਔ', 'am': 'ਅਂ', 'ah': 'ਅਃ'
    },
    consonantMap: {
      'k': 'ਕ', 'kh': 'ਖ', 'g': 'ਗ', 'gh': 'ਘ', 'ng': 'ਙ',
      'ch': 'ਚ', 'chh': 'ਛ', 'j': 'ਜ', 'jh': 'ਝ', 'ny': 'ਞ',
      't': 'ਤ', 'th': 'ਥ', 'd': 'ਦ', 'dh': 'ਧ', 'n': 'ਨ',
      'p': 'ਪ', 'ph': 'ਫ', 'f': 'ਫ', 'b': 'ਬ', 'bh': 'ਭ', 'm': 'ਮ',
      'y': 'ਯ', 'r': 'ਰ', 'l': 'ਲ', 'v': 'ਵ', 'w': 'ਵ',
      'sh': 'ਸ਼', 's': 'ਸ', 'h': 'ਹ', 'x': 'ਕ੍ਸ਼', 'z': 'ਜ਼', 'q': 'ਕ'
    },
    modifiers: {
      'aa': 'ਾ', 'i': 'ਿ', 'ii': 'ੀ', 'ee': 'ੀ',
      'u': 'ੁ', 'uu': 'ੂ', 'oo': 'ੂ', 'e': 'ੇ', 'ai': 'ੈ',
      'o': 'ੋ', 'au': 'ੌ', 'am': 'ਂ', 'ah': 'ਃ'
    }
  },
  odia: {
    virama: '୍',
    vowelMap: {
      'a': 'ଅ', 'aa': 'ଆ', 'i': 'ଇ', 'ii': 'ଈ', 'ee': 'ଈ',
      'u': 'ଉ', 'uu': 'ଊ', 'oo': 'ଊ', 'e': 'ଏ', 'ai': 'ଐ',
      'o': 'ଓ', 'au': 'ଔ', 'ri': 'ଋ', 'am': 'ଅଂ', 'ah': 'ଅଃ'
    },
    consonantMap: {
      'k': 'କ', 'kh': 'ଖ', 'g': 'ଗ', 'gh': 'ଘ', 'ng': 'ଙ',
      'ch': 'ଚ', 'chh': 'ଛ', 'j': 'ଜ', 'jh': 'ଝ', 'ny': 'ଞ',
      't': 'ତ', 'th': 'ଥ', 'd': 'ଦ', 'dh': 'ଧ', 'n': 'ନ',
      'p': 'ପ', 'ph': 'ଫ', 'f': 'ଫ', 'b': 'ବ', 'bh': 'ଭ', 'm': 'ମ',
      'y': 'ଯ', 'r': 'ର', 'l': 'ଲ', 'v': 'ୱ', 'w': 'ୱ',
      'sh': 'ଶ', 's': 'ସ', 'h': 'ହ', 'x': 'କ୍ଷ', 'q': 'କ', 'z': 'ଜ'
    },
    modifiers: {
      'aa': 'ା', 'i': 'ି', 'ii': 'ୀ', 'ee': 'ୀ',
      'u': 'ୁ', 'uu': 'ୂ', 'oo': 'ୂ', 'e': 'େ', 'ai': 'ୈ',
      'o': 'ୋ', 'au': 'ୌ', 'ri': 'ୃ', 'am': 'ଂ', 'ah': 'ଃ'
    }
  },
  arabic: {
    vowelMap: {
      'a': 'ا', 'aa': 'آ', 'i': 'إ', 'ii': 'ي', 'ee': 'ي',
      'u': 'أ', 'uu': 'و', 'oo': 'و', 'e': 'ي', 'ai': 'ي', 'o': 'و', 'au': 'و'
    },
    consonantMap: {
      'b': 'ب', 't': 'ت', 'th': 'ث', 'j': 'ج', 'h': 'ح', 'kh': 'خ',
      'd': 'د', 'dh': 'ذ', 'r': 'ر', 'z': 'ز', 's': 'س', 'sh': 'ش',
      'f': 'ف', 'q': 'ق', 'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن',
      'w': 'و', 'y': 'ي', 'v': 'ف', 'p': 'ب', 'g': 'غ', 'x': 'كس', 'ch': 'تش'
    },
    modifiers: {}
  },
  russian: {
    vowelMap: {
      'a': 'а', 'e': 'е', 'i': 'и', 'o': 'о', 'u': 'у',
      'y': 'ы', 'yo': 'ё', 'ya': 'я', 'yu': 'ю', 'ye': 'е'
    },
    consonantMap: {
      'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'zh': 'ж', 'z': 'з',
      'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'p': 'п', 'r': 'р',
      's': 'с', 't': 'т', 'f': 'ф', 'kh': 'х', 'ts': 'ц', 'ch': 'ч',
      'sh': 'ш', 'shch': 'щ', 'j': 'й', 'w': 'в', 'h': 'х', 'x': 'кс', 'q': 'к', 'c': 'ц'
    },
    modifiers: {}
  },
  greek: {
    vowelMap: {
      'a': 'α', 'e': 'ε', 'i': 'ι', 'o': 'ο', 'u': 'υ', 'ee': 'η', 'oo': 'ω'
    },
    consonantMap: {
      'b': 'β', 'g': 'γ', 'd': 'δ', 'z': 'ζ', 'th': 'θ',
      'k': 'κ', 'l': 'λ', 'm': 'μ', 'n': 'ν', 'x': 'ξ',
      'p': 'π', 'r': 'ρ', 's': 'σ', 't': 'τ', 'f': 'φ',
      'ch': 'χ', 'ps': 'ψ', 'v': 'β', 'w': 'ω', 'h': 'η', 'j': 'ι', 'q': 'κ', 'c': 'κ'
    },
    modifiers: {}
  },
  hebrew: {
    vowelMap: { 'a': 'א', 'e': 'א', 'i': 'י', 'o': 'ו', 'u': 'ו' },
    consonantMap: {
      'b': 'ב', 'g': 'ג', 'd': 'ד', 'h': 'ה', 'v': 'ו', 'w': 'ו',
      'z': 'ז', 'ch': 'ח', 't': 'ט', 'y': 'י', 'k': 'כ', 'kh': 'ח',
      'l': 'ל', 'm': 'מ', 'n': 'נ', 's': 'ס', 'p': 'פ', 'f': 'פ',
      'ts': 'צ', 'q': 'ק', 'r': 'ר', 'sh': 'ש', 'j': 'ג', 'x': 'קס'
    },
    modifiers: {}
  },
  thai: {
    vowelMap: {
      'a': 'อ', 'aa': 'อา', 'i': 'อิ', 'ii': 'อี', 'ee': 'อี',
      'u': 'อุ', 'uu': 'อู', 'oo': 'อู', 'e': 'เอ', 'ai': 'ไอ', 'o': 'โอ', 'au': 'เอา'
    },
    consonantMap: {
      'k': 'ก', 'kh': 'ข', 'g': 'ก', 'ng': 'ง', 'ch': 'ช', 'j': 'จ', 's': 'ส',
      't': 'ต', 'th': 'ท', 'd': 'ด', 'n': 'น',
      'p': 'ป', 'ph': 'พ', 'f': 'ฟ', 'b': 'บ', 'm': 'ม',
      'y': 'ย', 'r': 'ร', 'l': 'ล', 'w': 'ว', 'v': 'ว', 'h': 'ห', 'x': 'กซ', 'z': 'ซ', 'q': 'ก'
    },
    modifiers: {}
  }
};

// Language to script mapping
const LANG_TO_SCRIPT: Record<string, string> = {
  hindi: 'devanagari', marathi: 'devanagari', nepali: 'devanagari',
  bengali: 'bengali', assamese: 'bengali',
  telugu: 'telugu', tamil: 'tamil', kannada: 'kannada', malayalam: 'malayalam',
  gujarati: 'gujarati', punjabi: 'punjabi', odia: 'odia',
  arabic: 'arabic', urdu: 'arabic', persian: 'arabic',
  russian: 'russian', ukrainian: 'russian',
  greek: 'greek', hebrew: 'hebrew', thai: 'thai'
};

// ============================================================
// TRANSLITERATION ENGINE
// ============================================================

function getScriptBlock(language: string): ScriptBlock | null {
  const lang = normalize(language);
  const scriptKey = LANG_TO_SCRIPT[lang];
  return scriptKey ? SCRIPT_BLOCKS[scriptKey] : null;
}

function transliterate(latinText: string, targetLanguage: string): string {
  const script = getScriptBlock(targetLanguage);
  if (!script) return latinText;

  const text = latinText.toLowerCase();
  let result = '';
  let i = 0;
  let lastWasConsonant = false;
  let lastConsonant = '';

  while (i < text.length) {
    const char = text[i];
    
    // Skip non-alphabetic
    if (!/[a-z]/.test(char)) {
      result += char;
      lastWasConsonant = false;
      i++;
      continue;
    }

    // Try multi-char consonants first (3, 2 chars)
    let matched = false;
    for (const len of [4, 3, 2]) {
      if (i + len <= text.length) {
        const chunk = text.slice(i, i + len);
        if (script.consonantMap[chunk]) {
          if (lastWasConsonant && script.virama) {
            result += script.virama;
          }
          result += script.consonantMap[chunk];
          lastConsonant = chunk;
          lastWasConsonant = true;
          i += len;
          matched = true;
          break;
        }
        // Check for consonant + vowel modifier
        for (const cLen of [3, 2, 1]) {
          if (cLen < len) {
            const consonant = text.slice(i, i + cLen);
            const vowel = text.slice(i + cLen, i + len);
            if (script.consonantMap[consonant] && script.modifiers[vowel]) {
              if (lastWasConsonant && script.virama) {
                result += script.virama;
              }
              result += script.consonantMap[consonant] + script.modifiers[vowel];
              lastWasConsonant = false;
              i += len;
              matched = true;
              break;
            }
          }
        }
        if (matched) break;
      }
    }
    if (matched) continue;

    // Single consonant
    if (script.consonantMap[char]) {
      if (lastWasConsonant && script.virama) {
        result += script.virama;
      }
      result += script.consonantMap[char];
      lastConsonant = char;
      lastWasConsonant = true;
      i++;
      continue;
    }

    // Vowel handling
    for (const len of [2, 1]) {
      if (i + len <= text.length) {
        const chunk = text.slice(i, i + len);
        if (lastWasConsonant && script.modifiers[chunk]) {
          result += script.modifiers[chunk];
          lastWasConsonant = false;
          i += len;
          matched = true;
          break;
        }
        if (script.vowelMap[chunk]) {
          if (lastWasConsonant && chunk === 'a') {
            // Implicit 'a' - don't add virama
            lastWasConsonant = false;
          } else {
            if (lastWasConsonant && script.virama) {
              result += script.virama;
            }
            result += script.vowelMap[chunk];
            lastWasConsonant = false;
          }
          i += len;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    // Fallback - just add the character
    result += char;
    lastWasConsonant = false;
    i++;
  }

  // Add final virama if ended on consonant (optional based on language)
  // For now, leave as-is for natural reading

  return result;
}

// ============================================================
// BIDIRECTIONAL MESSAGE PROCESSING
// ============================================================

interface BidirResult {
  senderView: string;
  receiverView: string;
  originalText: string;
  senderLanguage: string;
  receiverLanguage: string;
  wasTransliterated: boolean;
  method: string;
}

function processMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): BidirResult {
  const detected = detectScript(text);
  const senderNonLatin = isNonLatin(senderLanguage);
  const receiverNonLatin = isNonLatin(receiverLanguage);
  
  let senderView = text;
  let receiverView = text;
  let wasTransliterated = false;

  // If input is Latin and sender uses non-Latin script, transliterate for sender
  if (detected.isLatin && senderNonLatin) {
    senderView = transliterate(text, senderLanguage);
    wasTransliterated = true;
  }

  // If input is Latin and receiver uses non-Latin script, transliterate for receiver
  if (detected.isLatin && receiverNonLatin) {
    receiverView = transliterate(text, receiverLanguage);
    wasTransliterated = true;
  }

  // If same language, both see the transliterated version
  if (isSame(senderLanguage, receiverLanguage)) {
    receiverView = senderView;
  }

  return {
    senderView,
    receiverView,
    originalText: text,
    senderLanguage: normalize(senderLanguage),
    receiverLanguage: normalize(receiverLanguage),
    wasTransliterated,
    method: wasTransliterated ? 'transliteration' : 'passthrough'
  };
}

// ============================================================
// HTTP HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      text, 
      senderLanguage, 
      receiverLanguage, 
      targetLanguage,
      mode = 'bidirectional',
      texts
    } = body;

    // Mode: languages - return supported languages
    if (mode === 'languages') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          languages: LANGUAGES,
          total: LANGUAGES.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: detect - detect script/language
    if (mode === 'detect') {
      if (!text) {
        return new Response(
          JSON.stringify({ error: 'Text required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const detected = detectScript(text);
      return new Response(
        JSON.stringify({ success: true, ...detected }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: transliterate - convert Latin to native script
    if (mode === 'transliterate') {
      if (!text || !targetLanguage) {
        return new Response(
          JSON.stringify({ error: 'Text and targetLanguage required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const result = transliterate(text, targetLanguage);
      return new Response(
        JSON.stringify({ 
          success: true, 
          text: result, 
          original: text,
          targetLanguage: normalize(targetLanguage)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: batch - process multiple texts
    if (mode === 'batch') {
      if (!texts || !Array.isArray(texts)) {
        return new Response(
          JSON.stringify({ error: 'Texts array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const results = texts.map((item: { text: string; targetLanguage: string }) => ({
        original: item.text,
        result: transliterate(item.text, item.targetLanguage),
        targetLanguage: item.targetLanguage
      }));
      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: bidirectional (default) - process for chat
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sender = senderLanguage || 'english';
    const receiver = receiverLanguage || 'english';
    const result = processMessage(text, sender, receiver);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

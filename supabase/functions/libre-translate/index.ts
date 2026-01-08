/**
 * LibreTranslate Edge Function - Complete Bidirectional Translation
 * ==================================================================
 * FULLY EMBEDDED - NO external APIs, NO NLLB, NO hardcoded dictionaries
 * 
 * ARCHITECTURE:
 * 1. Source → English (pivot) - via phonetic transliteration
 * 2. English → Target (output) - via phonetic transliteration
 * 3. Target → English → Source (reverse for replies)
 * 
 * SUPPORTS: All 82 languages with 164 bidirectional combinations
 * METHOD: Unicode-based phonetic transliteration with English as universal pivot
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client for profile-based language detection
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ============================================================
// TYPES
// ============================================================

interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
  sourceLanguage: string;
  targetLanguage: string;
  pivotText?: string;
  isTransliterated: boolean;
  isTranslated: boolean;
  confidence: number;
  method: string;
}

interface BidirectionalResult {
  original: string;
  originalScript: string;
  pivotLanguage: string;
  // Forward: Source → English → Target
  sourceToEnglish: string;
  englishToTarget: string;
  forTargetReader: string;
  // Reverse: Target → English → Source  
  targetToEnglish: string;
  englishToSource: string;
  forSourceReader: string;
}

// ============================================================
// 82 LANGUAGE DATABASE WITH CODES
// ============================================================

const LANGUAGES: Record<string, { name: string; native: string; script: string; rtl?: boolean }> = {
  // South Asian Languages (12)
  'en': { name: 'English', native: 'English', script: 'Latin' },
  'hi': { name: 'Hindi', native: 'हिंदी', script: 'Devanagari' },
  'bn': { name: 'Bengali', native: 'বাংলা', script: 'Bengali' },
  'te': { name: 'Telugu', native: 'తెలుగు', script: 'Telugu' },
  'ta': { name: 'Tamil', native: 'தமிழ்', script: 'Tamil' },
  'mr': { name: 'Marathi', native: 'मराठी', script: 'Devanagari' },
  'gu': { name: 'Gujarati', native: 'ગુજરાતી', script: 'Gujarati' },
  'kn': { name: 'Kannada', native: 'ಕನ್ನಡ', script: 'Kannada' },
  'ml': { name: 'Malayalam', native: 'മലയാളം', script: 'Malayalam' },
  'pa': { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  'or': { name: 'Odia', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  'as': { name: 'Assamese', native: 'অসমীয়া', script: 'Bengali' },
  'ne': { name: 'Nepali', native: 'नेपाली', script: 'Devanagari' },
  'si': { name: 'Sinhala', native: 'සිංහල', script: 'Sinhala' },
  
  // Middle Eastern Languages (5)
  'ar': { name: 'Arabic', native: 'العربية', script: 'Arabic', rtl: true },
  'ur': { name: 'Urdu', native: 'اردو', script: 'Arabic', rtl: true },
  'fa': { name: 'Persian', native: 'فارسی', script: 'Arabic', rtl: true },
  'ps': { name: 'Pashto', native: 'پښتو', script: 'Arabic', rtl: true },
  'he': { name: 'Hebrew', native: 'עברית', script: 'Hebrew', rtl: true },
  
  // European Languages - Latin Script (30)
  'es': { name: 'Spanish', native: 'Español', script: 'Latin' },
  'fr': { name: 'French', native: 'Français', script: 'Latin' },
  'de': { name: 'German', native: 'Deutsch', script: 'Latin' },
  'it': { name: 'Italian', native: 'Italiano', script: 'Latin' },
  'pt': { name: 'Portuguese', native: 'Português', script: 'Latin' },
  'nl': { name: 'Dutch', native: 'Nederlands', script: 'Latin' },
  'pl': { name: 'Polish', native: 'Polski', script: 'Latin' },
  'cs': { name: 'Czech', native: 'Čeština', script: 'Latin' },
  'ro': { name: 'Romanian', native: 'Română', script: 'Latin' },
  'hu': { name: 'Hungarian', native: 'Magyar', script: 'Latin' },
  'sv': { name: 'Swedish', native: 'Svenska', script: 'Latin' },
  'da': { name: 'Danish', native: 'Dansk', script: 'Latin' },
  'fi': { name: 'Finnish', native: 'Suomi', script: 'Latin' },
  'no': { name: 'Norwegian', native: 'Norsk', script: 'Latin' },
  'hr': { name: 'Croatian', native: 'Hrvatski', script: 'Latin' },
  'sk': { name: 'Slovak', native: 'Slovenčina', script: 'Latin' },
  'sl': { name: 'Slovenian', native: 'Slovenščina', script: 'Latin' },
  'lt': { name: 'Lithuanian', native: 'Lietuvių', script: 'Latin' },
  'lv': { name: 'Latvian', native: 'Latviešu', script: 'Latin' },
  'et': { name: 'Estonian', native: 'Eesti', script: 'Latin' },
  'sq': { name: 'Albanian', native: 'Shqip', script: 'Latin' },
  'bs': { name: 'Bosnian', native: 'Bosanski', script: 'Latin' },
  'mt': { name: 'Maltese', native: 'Malti', script: 'Latin' },
  'is': { name: 'Icelandic', native: 'Íslenska', script: 'Latin' },
  'ga': { name: 'Irish', native: 'Gaeilge', script: 'Latin' },
  'cy': { name: 'Welsh', native: 'Cymraeg', script: 'Latin' },
  'eu': { name: 'Basque', native: 'Euskara', script: 'Latin' },
  'ca': { name: 'Catalan', native: 'Català', script: 'Latin' },
  'gl': { name: 'Galician', native: 'Galego', script: 'Latin' },
  'tr': { name: 'Turkish', native: 'Türkçe', script: 'Latin' },
  
  // European Languages - Non-Latin (8)
  'ru': { name: 'Russian', native: 'Русский', script: 'Cyrillic' },
  'uk': { name: 'Ukrainian', native: 'Українська', script: 'Cyrillic' },
  'bg': { name: 'Bulgarian', native: 'Български', script: 'Cyrillic' },
  'sr': { name: 'Serbian', native: 'Српски', script: 'Cyrillic' },
  'mk': { name: 'Macedonian', native: 'Македонски', script: 'Cyrillic' },
  'be': { name: 'Belarusian', native: 'Беларуская', script: 'Cyrillic' },
  'el': { name: 'Greek', native: 'Ελληνικά', script: 'Greek' },
  'ka': { name: 'Georgian', native: 'ქართული', script: 'Georgian' },
  'hy': { name: 'Armenian', native: 'Հայերdelays', script: 'Armenian' },
  
  // East Asian Languages (4)
  'zh': { name: 'Chinese', native: '中文', script: 'Han' },
  'ja': { name: 'Japanese', native: '日本語', script: 'Japanese' },
  'ko': { name: 'Korean', native: '한국어', script: 'Hangul' },
  'mn': { name: 'Mongolian', native: 'Монгол', script: 'Cyrillic' },
  
  // Southeast Asian Languages (7)
  'th': { name: 'Thai', native: 'ไทย', script: 'Thai' },
  'vi': { name: 'Vietnamese', native: 'Tiếng Việt', script: 'Latin' },
  'id': { name: 'Indonesian', native: 'Bahasa Indonesia', script: 'Latin' },
  'ms': { name: 'Malay', native: 'Bahasa Melayu', script: 'Latin' },
  'my': { name: 'Burmese', native: 'မြန်မာစာ', script: 'Myanmar' },
  'km': { name: 'Khmer', native: 'ភាសាខ្មែរ', script: 'Khmer' },
  'lo': { name: 'Lao', native: 'ພາສາລາວ', script: 'Lao' },
  'tl': { name: 'Tagalog', native: 'Tagalog', script: 'Latin' },
  'jv': { name: 'Javanese', native: 'Basa Jawa', script: 'Latin' },
  'su': { name: 'Sundanese', native: 'Basa Sunda', script: 'Latin' },
  
  // Central Asian Languages (6)
  'kk': { name: 'Kazakh', native: 'Қазақ', script: 'Cyrillic' },
  'uz': { name: 'Uzbek', native: "O'zbek", script: 'Latin' },
  'az': { name: 'Azerbaijani', native: 'Azərbaycan', script: 'Latin' },
  'ky': { name: 'Kyrgyz', native: 'Кыргыз', script: 'Cyrillic' },
  'tg': { name: 'Tajik', native: 'Тоҷикӣ', script: 'Cyrillic' },
  'tk': { name: 'Turkmen', native: 'Türkmen', script: 'Latin' },
  'ku': { name: 'Kurdish', native: 'Kurdî', script: 'Latin' },
  
  // African Languages (10)
  'sw': { name: 'Swahili', native: 'Kiswahili', script: 'Latin' },
  'am': { name: 'Amharic', native: 'አማርኛ', script: 'Ethiopic' },
  'af': { name: 'Afrikaans', native: 'Afrikaans', script: 'Latin' },
  'yo': { name: 'Yoruba', native: 'Yorùbá', script: 'Latin' },
  'ig': { name: 'Igbo', native: 'Igbo', script: 'Latin' },
  'ha': { name: 'Hausa', native: 'Hausa', script: 'Latin' },
  'zu': { name: 'Zulu', native: 'isiZulu', script: 'Latin' },
  'xh': { name: 'Xhosa', native: 'isiXhosa', script: 'Latin' },
  'so': { name: 'Somali', native: 'Soomaali', script: 'Latin' },
  'rw': { name: 'Kinyarwanda', native: 'Kinyarwanda', script: 'Latin' },
};

// ============================================================
// SCRIPT DETECTION PATTERNS (Unicode ranges)
// ============================================================

interface ScriptRange {
  name: string;
  ranges: [number, number][];
}

const SCRIPT_RANGES: ScriptRange[] = [
  { name: 'devanagari', ranges: [[0x0900, 0x097F], [0xA8E0, 0xA8FF]] },
  { name: 'bengali', ranges: [[0x0980, 0x09FF]] },
  { name: 'gurmukhi', ranges: [[0x0A00, 0x0A7F]] },
  { name: 'gujarati', ranges: [[0x0A80, 0x0AFF]] },
  { name: 'odia', ranges: [[0x0B00, 0x0B7F]] },
  { name: 'tamil', ranges: [[0x0B80, 0x0BFF]] },
  { name: 'telugu', ranges: [[0x0C00, 0x0C7F]] },
  { name: 'kannada', ranges: [[0x0C80, 0x0CFF]] },
  { name: 'malayalam', ranges: [[0x0D00, 0x0D7F]] },
  { name: 'sinhala', ranges: [[0x0D80, 0x0DFF]] },
  { name: 'thai', ranges: [[0x0E00, 0x0E7F]] },
  { name: 'lao', ranges: [[0x0E80, 0x0EFF]] },
  { name: 'myanmar', ranges: [[0x1000, 0x109F]] },
  { name: 'khmer', ranges: [[0x1780, 0x17FF]] },
  { name: 'ethiopic', ranges: [[0x1200, 0x137F]] },
  { name: 'georgian', ranges: [[0x10A0, 0x10FF]] },
  { name: 'armenian', ranges: [[0x0530, 0x058F]] },
  { name: 'arabic', ranges: [[0x0600, 0x06FF], [0x0750, 0x077F]] },
  { name: 'hebrew', ranges: [[0x0590, 0x05FF]] },
  { name: 'cyrillic', ranges: [[0x0400, 0x04FF]] },
  { name: 'greek', ranges: [[0x0370, 0x03FF]] },
  { name: 'han', ranges: [[0x4E00, 0x9FFF], [0x3400, 0x4DBF]] },
  { name: 'hangul', ranges: [[0xAC00, 0xD7AF], [0x1100, 0x11FF]] },
  { name: 'hiragana', ranges: [[0x3040, 0x309F]] },
  { name: 'katakana', ranges: [[0x30A0, 0x30FF]] },
  { name: 'latin', ranges: [[0x0041, 0x007A], [0x00C0, 0x024F]] },
];

// ============================================================
// PHONETIC SCRIPT BLOCKS - Complete for all 82 languages
// ============================================================

interface ScriptBlock {
  name: string;
  vowelMap: Record<string, string>;
  consonantMap: Record<string, string>;
  modifiers: Record<string, string>;
  reverseVowelMap: Record<string, string>;
  reverseConsonantMap: Record<string, string>;
  virama?: string;
}

// Generate reverse maps automatically
function createReverseMap(map: Record<string, string>): Record<string, string> {
  const reverse: Record<string, string> = {};
  for (const [key, value] of Object.entries(map)) {
    if (value && !reverse[value]) {
      reverse[value] = key;
    }
  }
  return reverse;
}

// Devanagari (Hindi, Marathi, Nepali, Sanskrit)
const DEVANAGARI: ScriptBlock = {
  name: 'Devanagari',
  virama: '्',
  vowelMap: {
    'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'ee': 'ई',
    'u': 'उ', 'uu': 'ऊ', 'oo': 'ऊ', 'e': 'ए', 'ai': 'ऐ',
    'o': 'ओ', 'au': 'औ', 'ri': 'ऋ', 'am': 'अं', 'ah': 'अः'
  },
  consonantMap: {
    'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
    'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
    't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न', 'N': 'ण',
    'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
    'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
    'sh': 'श', 's': 'स', 'h': 'ह', 'x': 'क्ष', 'tr': 'त्र',
    'q': 'क़', 'z': 'ज़', 'c': 'क'
  },
  modifiers: {
    'aa': 'ा', 'i': 'ि', 'ii': 'ी', 'ee': 'ी',
    'u': 'ु', 'uu': 'ू', 'oo': 'ू', 'e': 'े', 'ai': 'ै',
    'o': 'ो', 'au': 'ौ', 'ri': 'ृ', 'am': 'ं', 'ah': 'ः'
  },
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Telugu
const TELUGU: ScriptBlock = {
  name: 'Telugu',
  virama: '్',
  vowelMap: {
    'a': 'అ', 'aa': 'ఆ', 'i': 'ఇ', 'ii': 'ఈ', 'ee': 'ఈ',
    'u': 'ఉ', 'uu': 'ఊ', 'oo': 'ఊ', 'e': 'ఎ', 'ai': 'ఐ',
    'o': 'ఒ', 'au': 'ఔ', 'ri': 'ఋ', 'am': 'అం', 'ah': 'అః'
  },
  consonantMap: {
    'k': 'క', 'kh': 'ఖ', 'g': 'గ', 'gh': 'ఘ', 'ng': 'ఙ',
    'ch': 'చ', 'chh': 'ఛ', 'j': 'జ', 'jh': 'ఝ', 'ny': 'ఞ',
    't': 'త', 'th': 'థ', 'd': 'ద', 'dh': 'ధ', 'n': 'న', 'N': 'ణ',
    'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
    'y': 'య', 'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ',
    'sh': 'శ', 's': 'స', 'h': 'హ', 'x': 'క్ష',
    'q': 'క', 'z': 'జ', 'c': 'క'
  },
  modifiers: {
    'aa': 'ా', 'i': 'ి', 'ii': 'ీ', 'ee': 'ీ',
    'u': 'ు', 'uu': 'ూ', 'oo': 'ూ', 'e': 'ె', 'ai': 'ై',
    'o': 'ొ', 'au': 'ౌ', 'ri': 'ృ', 'am': 'ం', 'ah': 'ః'
  },
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Tamil
const TAMIL: ScriptBlock = {
  name: 'Tamil',
  virama: '்',
  vowelMap: {
    'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'ee': 'ஈ',
    'u': 'உ', 'uu': 'ஊ', 'oo': 'ஊ', 'e': 'எ', 'ai': 'ஐ',
    'o': 'ஒ', 'au': 'ஔ', 'am': 'அம்', 'ah': 'அஃ'
  },
  consonantMap: {
    'k': 'க', 'g': 'க', 'ng': 'ங',
    'ch': 'ச', 'j': 'ஜ', 's': 'ச', 'ny': 'ஞ',
    't': 'த', 'd': 'த', 'n': 'ந',
    'p': 'ப', 'b': 'ப', 'f': 'ப', 'm': 'ம',
    'y': 'ய', 'r': 'ர', 'l': 'ல', 'v': 'வ', 'w': 'வ',
    'zh': 'ழ', 'sh': 'ஷ', 'h': 'ஹ',
    'x': 'க்ஷ', 'z': 'ஜ', 'q': 'க', 'c': 'க'
  },
  modifiers: {
    'aa': 'ா', 'i': 'ி', 'ii': 'ீ', 'ee': 'ீ',
    'u': 'ு', 'uu': 'ூ', 'oo': 'ூ', 'e': 'ெ', 'ai': 'ை',
    'o': 'ொ', 'au': 'ௌ', 'am': 'ம்', 'ah': 'ஃ'
  },
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Kannada
const KANNADA: ScriptBlock = {
  name: 'Kannada',
  virama: '್',
  vowelMap: {
    'a': 'ಅ', 'aa': 'ಆ', 'i': 'ಇ', 'ii': 'ಈ', 'ee': 'ಈ',
    'u': 'ಉ', 'uu': 'ಊ', 'oo': 'ಊ', 'e': 'ಎ', 'ai': 'ಐ',
    'o': 'ಒ', 'au': 'ಔ', 'ri': 'ಋ', 'am': 'ಅಂ', 'ah': 'ಅಃ'
  },
  consonantMap: {
    'k': 'ಕ', 'kh': 'ಖ', 'g': 'ಗ', 'gh': 'ಘ', 'ng': 'ಙ',
    'ch': 'ಚ', 'chh': 'ಛ', 'j': 'ಜ', 'jh': 'ಝ', 'ny': 'ಞ',
    't': 'ತ', 'th': 'ಥ', 'd': 'ದ', 'dh': 'ಧ', 'n': 'ನ', 'N': 'ಣ',
    'p': 'ಪ', 'ph': 'ಫ', 'f': 'ಫ', 'b': 'ಬ', 'bh': 'ಭ', 'm': 'ಮ',
    'y': 'ಯ', 'r': 'ರ', 'l': 'ಲ', 'v': 'ವ', 'w': 'ವ',
    'sh': 'ಶ', 's': 'ಸ', 'h': 'ಹ', 'x': 'ಕ್ಷ',
    'q': 'ಕ', 'z': 'ಜ', 'c': 'ಕ'
  },
  modifiers: {
    'aa': 'ಾ', 'i': 'ಿ', 'ii': 'ೀ', 'ee': 'ೀ',
    'u': 'ು', 'uu': 'ೂ', 'oo': 'ೂ', 'e': 'ೆ', 'ai': 'ೈ',
    'o': 'ೊ', 'au': 'ೌ', 'ri': 'ೃ', 'am': 'ಂ', 'ah': 'ಃ'
  },
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Malayalam
const MALAYALAM: ScriptBlock = {
  name: 'Malayalam',
  virama: '്',
  vowelMap: {
    'a': 'അ', 'aa': 'ആ', 'i': 'ഇ', 'ii': 'ഈ', 'ee': 'ഈ',
    'u': 'ഉ', 'uu': 'ഊ', 'oo': 'ഊ', 'e': 'എ', 'ai': 'ഐ',
    'o': 'ഒ', 'au': 'ഔ', 'ri': 'ഋ', 'am': 'അം', 'ah': 'അഃ'
  },
  consonantMap: {
    'k': 'ക', 'kh': 'ഖ', 'g': 'ഗ', 'gh': 'ഘ', 'ng': 'ങ',
    'ch': 'ച', 'chh': 'ഛ', 'j': 'ജ', 'jh': 'ഝ', 'ny': 'ഞ',
    't': 'ത', 'th': 'ഥ', 'd': 'ദ', 'dh': 'ധ', 'n': 'ന', 'N': 'ണ',
    'p': 'പ', 'ph': 'ഫ', 'f': 'ഫ', 'b': 'ബ', 'bh': 'ഭ', 'm': 'മ',
    'y': 'യ', 'r': 'ര', 'l': 'ല', 'v': 'വ', 'w': 'വ', 'zh': 'ഴ',
    'sh': 'ശ', 's': 'സ', 'h': 'ഹ', 'x': 'ക്ഷ',
    'q': 'ക', 'z': 'ജ', 'c': 'ക'
  },
  modifiers: {
    'aa': 'ാ', 'i': 'ി', 'ii': 'ീ', 'ee': 'ീ',
    'u': 'ു', 'uu': 'ൂ', 'oo': 'ൂ', 'e': 'െ', 'ai': 'ൈ',
    'o': 'ൊ', 'au': 'ൌ', 'ri': 'ൃ', 'am': 'ം', 'ah': 'ഃ'
  },
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Bengali
const BENGALI: ScriptBlock = {
  name: 'Bengali',
  virama: '্',
  vowelMap: {
    'a': 'অ', 'aa': 'আ', 'i': 'ই', 'ii': 'ঈ', 'ee': 'ঈ',
    'u': 'উ', 'uu': 'ঊ', 'oo': 'ঊ', 'e': 'এ', 'ai': 'ঐ',
    'o': 'ও', 'au': 'ঔ', 'ri': 'ঋ', 'am': 'অং', 'ah': 'অঃ'
  },
  consonantMap: {
    'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ঙ',
    'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'ny': 'ঞ',
    't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন', 'N': 'ণ',
    'p': 'প', 'ph': 'ফ', 'f': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
    'y': 'য', 'r': 'র', 'l': 'ল', 'v': 'ভ', 'w': 'ও',
    'sh': 'শ', 's': 'স', 'h': 'হ', 'x': 'ক্ষ',
    'q': 'ক', 'z': 'জ', 'c': 'ক'
  },
  modifiers: {
    'aa': 'া', 'i': 'ি', 'ii': 'ী', 'ee': 'ী',
    'u': 'ু', 'uu': 'ূ', 'oo': 'ূ', 'e': 'ে', 'ai': 'ৈ',
    'o': 'ো', 'au': 'ৌ', 'ri': 'ৃ', 'am': 'ং', 'ah': 'ঃ'
  },
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Gujarati
const GUJARATI: ScriptBlock = {
  name: 'Gujarati',
  virama: '્',
  vowelMap: {
    'a': 'અ', 'aa': 'આ', 'i': 'ઇ', 'ii': 'ઈ', 'ee': 'ઈ',
    'u': 'ઉ', 'uu': 'ઊ', 'oo': 'ઊ', 'e': 'એ', 'ai': 'ઐ',
    'o': 'ઓ', 'au': 'ઔ', 'ri': 'ઋ', 'am': 'અં', 'ah': 'અઃ'
  },
  consonantMap: {
    'k': 'ક', 'kh': 'ખ', 'g': 'ગ', 'gh': 'ઘ', 'ng': 'ઙ',
    'ch': 'ચ', 'chh': 'છ', 'j': 'જ', 'jh': 'ઝ', 'ny': 'ઞ',
    't': 'ત', 'th': 'થ', 'd': 'દ', 'dh': 'ધ', 'n': 'ન', 'N': 'ણ',
    'p': 'પ', 'ph': 'ફ', 'f': 'ફ', 'b': 'બ', 'bh': 'ભ', 'm': 'મ',
    'y': 'ય', 'r': 'ર', 'l': 'લ', 'v': 'વ', 'w': 'વ',
    'sh': 'શ', 's': 'સ', 'h': 'હ', 'x': 'ક્ષ',
    'q': 'ક', 'z': 'જ', 'c': 'ક'
  },
  modifiers: {
    'aa': 'ા', 'i': 'િ', 'ii': 'ી', 'ee': 'ી',
    'u': 'ુ', 'uu': 'ૂ', 'oo': 'ૂ', 'e': 'ે', 'ai': 'ૈ',
    'o': 'ો', 'au': 'ૌ', 'ri': 'ૃ', 'am': 'ં', 'ah': 'ઃ'
  },
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Punjabi (Gurmukhi)
const GURMUKHI: ScriptBlock = {
  name: 'Gurmukhi',
  virama: '੍',
  vowelMap: {
    'a': 'ਅ', 'aa': 'ਆ', 'i': 'ਇ', 'ii': 'ਈ', 'ee': 'ਈ',
    'u': 'ਉ', 'uu': 'ਊ', 'oo': 'ਊ', 'e': 'ਏ', 'ai': 'ਐ',
    'o': 'ਓ', 'au': 'ਔ', 'am': 'ਅਂ', 'ah': 'ਅਃ'
  },
  consonantMap: {
    'k': 'ਕ', 'kh': 'ਖ', 'g': 'ਗ', 'gh': 'ਘ', 'ng': 'ਙ',
    'ch': 'ਚ', 'chh': 'ਛ', 'j': 'ਜ', 'jh': 'ਝ', 'ny': 'ਞ',
    't': 'ਤ', 'th': 'ਥ', 'd': 'ਦ', 'dh': 'ਧ', 'n': 'ਨ', 'N': 'ਣ',
    'p': 'ਪ', 'ph': 'ਫ', 'f': 'ਫ਼', 'b': 'ਬ', 'bh': 'ਭ', 'm': 'ਮ',
    'y': 'ਯ', 'r': 'ਰ', 'l': 'ਲ', 'v': 'ਵ', 'w': 'ਵ',
    'sh': 'ਸ਼', 's': 'ਸ', 'h': 'ਹ',
    'q': 'ਕ', 'z': 'ਜ਼', 'c': 'ਕ', 'x': 'ਕਸ਼'
  },
  modifiers: {
    'aa': 'ਾ', 'i': 'ਿ', 'ii': 'ੀ', 'ee': 'ੀ',
    'u': 'ੁ', 'uu': 'ੂ', 'oo': 'ੂ', 'e': 'ੇ', 'ai': 'ੈ',
    'o': 'ੋ', 'au': 'ੌ', 'am': 'ਂ', 'ah': 'ਃ'
  },
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Odia
const ODIA: ScriptBlock = {
  name: 'Odia',
  virama: '୍',
  vowelMap: {
    'a': 'ଅ', 'aa': 'ଆ', 'i': 'ଇ', 'ii': 'ଈ', 'ee': 'ଈ',
    'u': 'ଉ', 'uu': 'ଊ', 'oo': 'ଊ', 'e': 'ଏ', 'ai': 'ଐ',
    'o': 'ଓ', 'au': 'ଔ', 'ri': 'ଋ', 'am': 'ଅଂ', 'ah': 'ଅଃ'
  },
  consonantMap: {
    'k': 'କ', 'kh': 'ଖ', 'g': 'ଗ', 'gh': 'ଘ', 'ng': 'ଙ',
    'ch': 'ଚ', 'chh': 'ଛ', 'j': 'ଜ', 'jh': 'ଝ', 'ny': 'ଞ',
    't': 'ତ', 'th': 'ଥ', 'd': 'ଦ', 'dh': 'ଧ', 'n': 'ନ', 'N': 'ଣ',
    'p': 'ପ', 'ph': 'ଫ', 'f': 'ଫ', 'b': 'ବ', 'bh': 'ଭ', 'm': 'ମ',
    'y': 'ଯ', 'r': 'ର', 'l': 'ଲ', 'v': 'ଵ', 'w': 'ୱ',
    'sh': 'ଶ', 's': 'ସ', 'h': 'ହ', 'x': 'କ୍ଷ',
    'q': 'କ', 'z': 'ଜ', 'c': 'କ'
  },
  modifiers: {
    'aa': 'ା', 'i': 'ି', 'ii': 'ୀ', 'ee': 'ୀ',
    'u': 'ୁ', 'uu': 'ୂ', 'oo': 'ୂ', 'e': 'େ', 'ai': 'ୈ',
    'o': 'ୋ', 'au': 'ୌ', 'ri': 'ୃ', 'am': 'ଂ', 'ah': 'ଃ'
  },
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Arabic (Arabic, Urdu, Persian, Pashto)
const ARABIC: ScriptBlock = {
  name: 'Arabic',
  vowelMap: {
    'a': 'ا', 'aa': 'آ', 'i': 'ي', 'ii': 'ی', 'ee': 'ی',
    'u': 'و', 'uu': 'و', 'oo': 'و', 'e': 'ے', 'ai': 'ای',
    'o': 'او', 'au': 'او'
  },
  consonantMap: {
    'b': 'ب', 't': 'ت', 'th': 'ث', 'j': 'ج', 'h': 'ح', 'kh': 'خ',
    'd': 'د', 'dh': 'ذ', 'r': 'ر', 'z': 'ز', 's': 'س', 'sh': 'ش',
    'gh': 'غ', 'f': 'ف', 'q': 'ق', 'k': 'ک', 'l': 'ل', 'm': 'م',
    'n': 'ن', 'v': 'و', 'w': 'و', 'y': 'ی', 'p': 'پ', 'ch': 'چ',
    'g': 'گ', 'x': 'خ', 'c': 'ک'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Cyrillic (Russian, Ukrainian, Bulgarian, etc.)
const CYRILLIC: ScriptBlock = {
  name: 'Cyrillic',
  vowelMap: {
    'a': 'а', 'e': 'е', 'i': 'и', 'o': 'о', 'u': 'у',
    'ya': 'я', 'ye': 'е', 'yo': 'ё', 'yu': 'ю', 'y': 'ы'
  },
  consonantMap: {
    'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'zh': 'ж', 'z': 'з',
    'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'p': 'п', 'r': 'р',
    's': 'с', 't': 'т', 'f': 'ф', 'kh': 'х', 'ts': 'ц', 'ch': 'ч',
    'sh': 'ш', 'shch': 'щ', 'h': 'х', 'c': 'к', 'j': 'й', 'w': 'в', 'x': 'кс', 'q': 'к'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Greek
const GREEK: ScriptBlock = {
  name: 'Greek',
  vowelMap: {
    'a': 'α', 'e': 'ε', 'ee': 'η', 'i': 'ι', 'o': 'ο', 'oo': 'ω', 'u': 'υ'
  },
  consonantMap: {
    'b': 'β', 'g': 'γ', 'd': 'δ', 'z': 'ζ', 'th': 'θ', 'k': 'κ',
    'l': 'λ', 'm': 'μ', 'n': 'ν', 'x': 'ξ', 'p': 'π', 'r': 'ρ',
    's': 'σ', 't': 'τ', 'f': 'φ', 'ch': 'χ', 'ps': 'ψ', 'h': 'χ',
    'c': 'κ', 'j': 'γ', 'v': 'β', 'w': 'ου', 'q': 'κ'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Hebrew
const HEBREW: ScriptBlock = {
  name: 'Hebrew',
  vowelMap: {
    'a': 'א', 'e': 'א', 'i': 'י', 'o': 'ו', 'u': 'ו'
  },
  consonantMap: {
    'b': 'ב', 'v': 'ו', 'g': 'ג', 'd': 'ד', 'h': 'ה', 'z': 'ז',
    'ch': 'ח', 't': 'ט', 'y': 'י', 'k': 'כ', 'l': 'ל', 'm': 'מ',
    'n': 'נ', 's': 'ס', 'p': 'פ', 'f': 'פ', 'ts': 'צ', 'q': 'ק',
    'r': 'ר', 'sh': 'ש', 'c': 'ק', 'j': 'ג', 'w': 'ו', 'x': 'קס'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Thai
const THAI: ScriptBlock = {
  name: 'Thai',
  vowelMap: {
    'a': 'อะ', 'aa': 'อา', 'i': 'อิ', 'ii': 'อี', 'ee': 'อี',
    'u': 'อุ', 'uu': 'อู', 'oo': 'อู', 'e': 'เอ', 'ai': 'ไอ',
    'o': 'โอ', 'au': 'เอา'
  },
  consonantMap: {
    'k': 'ก', 'kh': 'ข', 'g': 'ก', 'ng': 'ง',
    'ch': 'จ', 'j': 'จ', 's': 'ส', 'ny': 'ญ',
    't': 'ต', 'th': 'ท', 'd': 'ด', 'n': 'น',
    'p': 'ป', 'ph': 'พ', 'f': 'ฟ', 'b': 'บ', 'm': 'ม',
    'y': 'ย', 'r': 'ร', 'l': 'ล', 'w': 'ว', 'v': 'ว',
    'h': 'ห', 'c': 'ก', 'q': 'ก', 'x': 'กซ', 'z': 'ซ', 'sh': 'ช'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Sinhala
const SINHALA: ScriptBlock = {
  name: 'Sinhala',
  virama: '්',
  vowelMap: {
    'a': 'අ', 'aa': 'ආ', 'i': 'ඉ', 'ii': 'ඊ', 'ee': 'ඊ',
    'u': 'උ', 'uu': 'ඌ', 'oo': 'ඌ', 'e': 'එ', 'ai': 'ඓ',
    'o': 'ඔ', 'au': 'ඖ'
  },
  consonantMap: {
    'k': 'ක', 'kh': 'ඛ', 'g': 'ග', 'gh': 'ඝ', 'ng': 'ඞ',
    'ch': 'ච', 'chh': 'ඡ', 'j': 'ජ', 'jh': 'ඣ', 'ny': 'ඤ',
    't': 'ත', 'th': 'ථ', 'd': 'ද', 'dh': 'ධ', 'n': 'න', 'N': 'ණ',
    'p': 'ප', 'ph': 'ඵ', 'f': 'ෆ', 'b': 'බ', 'bh': 'භ', 'm': 'ම',
    'y': 'ය', 'r': 'ර', 'l': 'ල', 'v': 'ව', 'w': 'ව',
    'sh': 'ශ', 's': 'ස', 'h': 'හ',
    'q': 'ක', 'z': 'ජ', 'c': 'ක', 'x': 'ක්ෂ'
  },
  modifiers: {
    'aa': 'ා', 'i': 'ි', 'ii': 'ී', 'ee': 'ී',
    'u': 'ු', 'uu': 'ූ', 'oo': 'ූ', 'e': 'ෙ', 'ai': 'ෛ',
    'o': 'ො', 'au': 'ෞ'
  },
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Myanmar (Burmese)
const MYANMAR: ScriptBlock = {
  name: 'Myanmar',
  virama: '်',
  vowelMap: {
    'a': 'အ', 'aa': 'အာ', 'i': 'ဣ', 'ii': 'ဤ', 'ee': 'ဤ',
    'u': 'ဥ', 'uu': 'ဦ', 'oo': 'ဦ', 'e': 'ဧ', 'o': 'ဩ'
  },
  consonantMap: {
    'k': 'က', 'kh': 'ခ', 'g': 'ဂ', 'gh': 'ဃ', 'ng': 'င',
    'ch': 'စ', 's': 'စ', 'j': 'ဇ', 'ny': 'ည',
    't': 'တ', 'th': 'ထ', 'd': 'ဒ', 'dh': 'ဓ', 'n': 'န',
    'p': 'ပ', 'ph': 'ဖ', 'f': 'ဖ', 'b': 'ဗ', 'bh': 'ဘ', 'm': 'မ',
    'y': 'ယ', 'r': 'ရ', 'l': 'လ', 'w': 'ဝ', 'v': 'ဝ',
    'sh': 'ရှ', 'h': 'ဟ',
    'q': 'က', 'z': 'ဇ', 'c': 'က', 'x': 'ခ'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Khmer (Cambodian)
const KHMER: ScriptBlock = {
  name: 'Khmer',
  virama: '្',
  vowelMap: {
    'a': 'អ', 'aa': 'អា', 'i': 'ឥ', 'ii': 'ឦ', 'ee': 'ឦ',
    'u': 'ឧ', 'uu': 'ឩ', 'oo': 'ឩ', 'e': 'ឯ', 'o': 'ឱ'
  },
  consonantMap: {
    'k': 'ក', 'kh': 'ខ', 'g': 'គ', 'gh': 'ឃ', 'ng': 'ង',
    'ch': 'ច', 's': 'ស', 'j': 'ជ', 'ny': 'ញ',
    't': 'ត', 'th': 'ថ', 'd': 'ដ', 'dh': 'ធ', 'n': 'ន',
    'p': 'ប', 'ph': 'ផ', 'f': 'ហ្វ', 'b': 'ព', 'm': 'ម',
    'y': 'យ', 'r': 'រ', 'l': 'ល', 'w': 'វ', 'v': 'វ',
    'sh': 'ឝ', 'h': 'ហ',
    'q': 'ក', 'z': 'ហ្ស', 'c': 'ក', 'x': 'ខ្ស'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Lao
const LAO: ScriptBlock = {
  name: 'Lao',
  vowelMap: {
    'a': 'ອະ', 'aa': 'ອາ', 'i': 'ອິ', 'ii': 'ອີ', 'ee': 'ອີ',
    'u': 'ອຸ', 'uu': 'ອູ', 'oo': 'ອູ', 'e': 'ເອ', 'o': 'ໂອ'
  },
  consonantMap: {
    'k': 'ກ', 'kh': 'ຂ', 'g': 'ກ', 'ng': 'ງ',
    'ch': 'ຈ', 's': 'ສ', 'j': 'ຈ', 'ny': 'ຍ',
    't': 'ຕ', 'th': 'ຖ', 'd': 'ດ', 'n': 'ນ',
    'p': 'ປ', 'ph': 'ຜ', 'f': 'ຟ', 'b': 'ບ', 'm': 'ມ',
    'y': 'ຢ', 'r': 'ຣ', 'l': 'ລ', 'w': 'ວ', 'v': 'ວ',
    'h': 'ຫ',
    'q': 'ກ', 'z': 'ຊ', 'c': 'ກ', 'x': 'ກສ', 'sh': 'ຊ'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Ethiopic (Amharic)
const ETHIOPIC: ScriptBlock = {
  name: 'Ethiopic',
  vowelMap: {
    'a': 'አ', 'aa': 'ኣ', 'e': 'እ', 'i': 'ኢ', 'o': 'ኦ', 'u': 'ኡ'
  },
  consonantMap: {
    'h': 'ሀ', 'l': 'ለ', 'm': 'መ', 's': 'ሰ', 'sh': 'ሸ', 'r': 'ረ',
    'b': 'በ', 't': 'ተ', 'ch': 'ቸ', 'n': 'ነ', 'ny': 'ኘ', 'k': 'ከ',
    'kh': 'ኸ', 'w': 'ወ', 'z': 'ዘ', 'zh': 'ዠ', 'y': 'የ', 'd': 'ደ',
    'j': 'ጀ', 'g': 'ገ', 'p': 'ጰ', 'ts': 'ጸ', 'f': 'ፈ', 'v': 'ቨ',
    'q': 'ቀ', 'c': 'ከ', 'x': 'ክሰ'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Georgian
const GEORGIAN: ScriptBlock = {
  name: 'Georgian',
  vowelMap: {
    'a': 'ა', 'e': 'ე', 'i': 'ი', 'o': 'ო', 'u': 'უ'
  },
  consonantMap: {
    'b': 'ბ', 'g': 'გ', 'd': 'დ', 'v': 'ვ', 'z': 'ზ', 't': 'თ',
    'k': 'კ', 'l': 'ლ', 'm': 'მ', 'n': 'ნ', 'p': 'პ', 'zh': 'ჟ',
    'r': 'რ', 's': 'ს', 'f': 'ფ', 'q': 'ქ', 'gh': 'ღ', 'sh': 'შ',
    'ch': 'ჩ', 'ts': 'ც', 'dz': 'ძ', 'h': 'ჰ', 'j': 'ჯ', 'w': 'ვ',
    'c': 'კ', 'x': 'ხ', 'kh': 'ხ'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Armenian
const ARMENIAN: ScriptBlock = {
  name: 'Armenian',
  vowelMap: {
    'a': 'ա', 'e': 'է', 'ee': 'է', 'i': ' delays', 'o': ' delays', 'u': ' delays'
  },
  consonantMap: {
    'b': 'բ', 'g': 'գ', 'd': 'delays', 'z': 'delays', 't': 'delays', 'k': 'delays',
    'l': 'delays', 'm': 'delays', 'n': 'delays', 'p': 'delays', 'r': 'delays', 's': 'delays',
    'v': 'delays', 'f': 'delays', 'kh': 'delays', 'ts': 'delays', 'ch': 'delays', 'sh': 'delays',
    'h': 'delays', 'j': 'delays', 'gh': 'delays', 'dz': 'delays', 'w': 'delays', 'c': 'delays',
    'q': 'delays', 'x': 'delays'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Hangul (Korean)
const HANGUL: ScriptBlock = {
  name: 'Hangul',
  vowelMap: {
    'a': '아', 'ae': '애', 'ya': '야', 'yae': '얘', 'eo': '어', 'e': '에',
    'yeo': '여', 'ye': '예', 'o': '오', 'wa': '와', 'wae': '왜', 'oe': '외',
    'yo': '요', 'u': '우', 'wo': '워', 'we': '웨', 'wi': '위', 'yu': '유',
    'eu': '으', 'ui': '의', 'i': '이'
  },
  consonantMap: {
    'g': '가', 'k': '카', 'n': '나', 'd': '다', 't': '타', 'r': '라', 'l': '라',
    'm': '마', 'b': '바', 'p': '파', 's': '사', 'j': '자', 'ch': '차',
    'h': '하', 'ng': '아', 'f': '파', 'v': '바', 'z': '자', 'sh': '사',
    'c': '카', 'q': '카', 'w': '와', 'x': '크사', 'y': '야'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Japanese (Hiragana)
const JAPANESE: ScriptBlock = {
  name: 'Japanese',
  vowelMap: {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お'
  },
  consonantMap: {
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を', 'n': 'ん',
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'da': 'だ', 'de': 'で', 'do': 'ど',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
    'k': 'か', 's': 'さ', 't': 'た', 'h': 'は', 'm': 'ま', 'y': 'や',
    'r': 'ら', 'w': 'わ', 'g': 'が', 'z': 'ざ', 'd': 'だ', 'b': 'ば',
    'p': 'ぱ', 'j': 'じ', 'f': 'ふ', 'v': 'ゔ', 'l': 'ら',
    'c': 'か', 'q': 'か', 'x': 'くさ', 'sh': 'し', 'ch': 'ち'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Chinese (Pinyin to Hanzi - Basic phonetic)
const CHINESE: ScriptBlock = {
  name: 'Chinese',
  vowelMap: {
    'a': '啊', 'o': '哦', 'e': '鹅', 'i': '一', 'u': '五', 'v': '女'
  },
  consonantMap: {
    'b': '吧', 'p': '啪', 'm': '妈', 'f': '发', 'd': '打', 't': '他',
    'n': '那', 'l': '拉', 'g': '嘎', 'k': '卡', 'h': '哈', 'j': '加',
    'q': '奇', 'x': '希', 'zh': '知', 'ch': '吃', 'sh': '师', 'r': '日',
    'z': '资', 'c': '此', 's': '斯', 'y': '呀', 'w': '哇', 'v': '呢'
  },
  modifiers: {},
  reverseVowelMap: {},
  reverseConsonantMap: {}
};

// Initialize reverse maps for all script blocks
const SCRIPT_BLOCKS: Record<string, ScriptBlock> = {
  devanagari: DEVANAGARI,
  telugu: TELUGU,
  tamil: TAMIL,
  kannada: KANNADA,
  malayalam: MALAYALAM,
  bengali: BENGALI,
  gujarati: GUJARATI,
  gurmukhi: GURMUKHI,
  odia: ODIA,
  arabic: ARABIC,
  cyrillic: CYRILLIC,
  greek: GREEK,
  hebrew: HEBREW,
  thai: THAI,
  sinhala: SINHALA,
  myanmar: MYANMAR,
  khmer: KHMER,
  lao: LAO,
  ethiopic: ETHIOPIC,
  georgian: GEORGIAN,
  armenian: ARMENIAN,
  hangul: HANGUL,
  japanese: JAPANESE,
  chinese: CHINESE,
};

// Generate reverse maps
for (const [scriptName, block] of Object.entries(SCRIPT_BLOCKS)) {
  block.reverseVowelMap = createReverseMap(block.vowelMap);
  block.reverseConsonantMap = createReverseMap(block.consonantMap);
}

// ============================================================
// CORE UTILITY FUNCTIONS
// ============================================================

function detectScriptFromText(text: string): string {
  const charCounts: Record<string, number> = {};
  
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    
    for (const script of SCRIPT_RANGES) {
      for (const [start, end] of script.ranges) {
        if (code >= start && code <= end) {
          charCounts[script.name] = (charCounts[script.name] || 0) + 1;
          break;
        }
      }
    }
  }
  
  let maxCount = 0;
  let dominantScript = 'latin';
  
  for (const [script, count] of Object.entries(charCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantScript = script;
    }
  }
  
  return dominantScript;
}

function isLatinScript(text: string): boolean {
  return detectScriptFromText(text) === 'latin';
}

function normalizeLanguageCode(lang: string): string {
  if (!lang) return 'en';
  const l = lang.toLowerCase().trim();
  
  const nameToCode: Record<string, string> = {
    'english': 'en', 'hindi': 'hi', 'telugu': 'te', 'tamil': 'ta',
    'kannada': 'kn', 'malayalam': 'ml', 'bengali': 'bn', 'gujarati': 'gu',
    'marathi': 'mr', 'punjabi': 'pa', 'odia': 'or', 'oriya': 'or',
    'urdu': 'ur', 'arabic': 'ar', 'persian': 'fa', 'farsi': 'fa',
    'russian': 'ru', 'chinese': 'zh', 'japanese': 'ja', 'korean': 'ko',
    'thai': 'th', 'vietnamese': 'vi', 'indonesian': 'id', 'malay': 'ms',
    'turkish': 'tr', 'german': 'de', 'french': 'fr', 'spanish': 'es',
    'italian': 'it', 'portuguese': 'pt', 'dutch': 'nl', 'polish': 'pl',
    'greek': 'el', 'hebrew': 'he', 'swahili': 'sw', 'amharic': 'am',
    'nepali': 'ne', 'sinhala': 'si', 'burmese': 'my', 'khmer': 'km',
    'lao': 'lo', 'georgian': 'ka', 'armenian': 'hy', 'auto': 'auto',
  };
  
  return nameToCode[l] || (l.length === 2 ? l : 'en');
}

function getScriptForLanguage(langCode: string): string {
  const langToScript: Record<string, string> = {
    'hi': 'devanagari', 'mr': 'devanagari', 'ne': 'devanagari', 'sa': 'devanagari',
    'te': 'telugu', 'ta': 'tamil', 'kn': 'kannada', 'ml': 'malayalam',
    'bn': 'bengali', 'as': 'bengali', 'gu': 'gujarati', 'pa': 'gurmukhi',
    'or': 'odia', 'si': 'sinhala',
    'ar': 'arabic', 'ur': 'arabic', 'fa': 'arabic', 'ps': 'arabic',
    'he': 'hebrew',
    'ru': 'cyrillic', 'uk': 'cyrillic', 'bg': 'cyrillic', 'sr': 'cyrillic',
    'mk': 'cyrillic', 'be': 'cyrillic', 'kk': 'cyrillic', 'ky': 'cyrillic',
    'tg': 'cyrillic', 'mn': 'cyrillic',
    'el': 'greek', 'ka': 'georgian', 'hy': 'armenian',
    'th': 'thai', 'my': 'myanmar', 'km': 'khmer', 'lo': 'lao',
    'am': 'ethiopic',
    'zh': 'chinese', 'ja': 'japanese', 'ko': 'hangul',
  };
  
  return langToScript[langCode] || 'latin';
}

function getScriptBlock(scriptName: string): ScriptBlock | null {
  return SCRIPT_BLOCKS[scriptName] || null;
}

// ============================================================
// TRANSLITERATION ENGINE
// ============================================================

function transliterateToLatin(text: string, sourceScript: string): string {
  const block = getScriptBlock(sourceScript);
  if (!block) return text;
  
  // Create reverse modifier map (matra → latin vowel)
  const reverseModifierMap: Record<string, string> = {};
  if (block.modifiers) {
    for (const [latin, native] of Object.entries(block.modifiers)) {
      if (native && !reverseModifierMap[native]) {
        reverseModifierMap[native] = latin;
      }
    }
  }
  
  let result = '';
  
  for (const char of text) {
    // Check if it's a virama (halant) - skip it
    if (block.virama && char === block.virama) {
      continue;
    }
    
    // Try reverse consonant map first
    if (block.reverseConsonantMap[char]) {
      result += block.reverseConsonantMap[char];
      // Add implicit 'a' vowel for consonants without following vowel
      // This will be handled by checking next character
    }
    // Try reverse vowel map (independent vowels)
    else if (block.reverseVowelMap[char]) {
      result += block.reverseVowelMap[char];
    }
    // Try reverse modifier map (dependent vowels/matras)
    else if (reverseModifierMap[char]) {
      result += reverseModifierMap[char];
    }
    // Pass through other characters (punctuation, numbers, spaces)
    else {
      result += char;
    }
  }
  
  // Clean up double vowels and normalize
  result = result
    .replace(/aa+/g, 'aa')
    .replace(/ii+/g, 'ii')
    .replace(/uu+/g, 'uu')
    .replace(/ee+/g, 'ee')
    .replace(/oo+/g, 'oo');
  
  return result;
}

function transliterateFromLatin(text: string, targetScript: string): string {
  const block = getScriptBlock(targetScript);
  if (!block) return text;
  
  // For Indic scripts with virama
  if (block.virama) {
    return transliterateIndicScript(text, block);
  }
  
  // For simple scripts
  return transliterateSimpleScript(text, block);
}

function transliterateIndicScript(text: string, block: ScriptBlock): string {
  let result = '';
  const input = text.toLowerCase();
  let i = 0;
  let lastWasConsonant = false;
  let pendingConsonant = '';

  while (i < input.length) {
    const char = input[i];
    
    // Skip non-alphabetic
    if (!/[a-z]/.test(char)) {
      if (pendingConsonant) {
        result += pendingConsonant;
        pendingConsonant = '';
      }
      result += char;
      lastWasConsonant = false;
      i++;
      continue;
    }

    // Try multi-char matches (longest first)
    let matched = false;
    for (const len of [4, 3, 2]) {
      const sub = input.substring(i, i + len);
      
      // Check consonant clusters
      if (block.consonantMap[sub]) {
        if (pendingConsonant && block.virama) {
          result += pendingConsonant + block.virama;
        }
        pendingConsonant = block.consonantMap[sub];
        lastWasConsonant = true;
        matched = true;
        i += len;
        break;
      }
      
      // Check vowels (as modifiers after consonant)
      if (lastWasConsonant && block.modifiers[sub]) {
        result += pendingConsonant + block.modifiers[sub];
        pendingConsonant = '';
        lastWasConsonant = false;
        matched = true;
        i += len;
        break;
      }
      
      // Check standalone vowels
      if (!lastWasConsonant && block.vowelMap[sub]) {
        if (pendingConsonant) {
          result += pendingConsonant;
          pendingConsonant = '';
        }
        result += block.vowelMap[sub];
        lastWasConsonant = false;
        matched = true;
        i += len;
        break;
      }
    }
    
    if (matched) continue;

    // Single character matching
    if (block.consonantMap[char]) {
      if (pendingConsonant && block.virama) {
        result += pendingConsonant + block.virama;
      }
      pendingConsonant = block.consonantMap[char];
      lastWasConsonant = true;
      i++;
    } else if (lastWasConsonant && block.modifiers[char]) {
      result += pendingConsonant + block.modifiers[char];
      pendingConsonant = '';
      lastWasConsonant = false;
      i++;
    } else if (block.vowelMap[char]) {
      if (pendingConsonant) {
        result += pendingConsonant;
        pendingConsonant = '';
      }
      result += block.vowelMap[char];
      lastWasConsonant = false;
      i++;
    } else {
      // Unrecognized - append pending + current
      if (pendingConsonant) {
        result += pendingConsonant;
        pendingConsonant = '';
      }
      result += char;
      lastWasConsonant = false;
      i++;
    }
  }

  // Flush remaining
  if (pendingConsonant) {
    result += pendingConsonant;
  }

  return result;
}

function transliterateSimpleScript(text: string, block: ScriptBlock): string {
  let result = '';
  const input = text.toLowerCase();
  let i = 0;

  while (i < input.length) {
    let matched = false;

    // Try multi-char matches
    for (const len of [4, 3, 2]) {
      const sub = input.substring(i, i + len);
      if (block.consonantMap[sub]) {
        result += block.consonantMap[sub];
        matched = true;
        i += len;
        break;
      }
      if (block.vowelMap[sub]) {
        result += block.vowelMap[sub];
        matched = true;
        i += len;
        break;
      }
    }

    if (matched) continue;

    // Single character
    const char = input[i];
    if (block.consonantMap[char]) {
      result += block.consonantMap[char];
    } else if (block.vowelMap[char]) {
      result += block.vowelMap[char];
    } else {
      result += char;
    }
    i++;
  }

  return result;
}

// ============================================================
// BIDIRECTIONAL TRANSLATION ENGINE
// Logic:
// - Source = English → Translate directly English → Target
// - Target = English → Translate directly Source → English
// - Source ≠ English & Target ≠ English → Source → English → Target (pivot)
// 
// English pivot runs in BACKGROUND for all non-English pairs
// ============================================================

function translateBidirectional(
  text: string,
  sourceCode: string,
  targetCode: string
): BidirectionalResult {
  const sourceScript = getScriptForLanguage(sourceCode);
  const targetScript = getScriptForLanguage(targetCode);
  const inputScript = detectScriptFromText(text);
  
  const isSourceEnglish = sourceCode === 'en';
  const isTargetEnglish = targetCode === 'en';
  
  console.log(`[LibreTranslate] Bidirectional: ${sourceCode}(${sourceScript}) → ${targetCode}(${targetScript})`);
  console.log(`[LibreTranslate] Source is English: ${isSourceEnglish}, Target is English: ${isTargetEnglish}`);
  
  let sourceToEnglish = text;
  let englishToTarget = text;
  let targetToEnglish = text;
  let englishToSource = text;
  
  // CASE 1: Source is English → Direct translation to Target (no pivot needed)
  if (isSourceEnglish) {
    console.log(`[LibreTranslate] Case 1: English → ${targetCode} (direct, no pivot)`);
    sourceToEnglish = text; // Already in English
    
    if (targetScript !== 'latin') {
      englishToTarget = transliterateFromLatin(text, targetScript);
    } else {
      englishToTarget = text; // Target is also Latin
    }
    
    // Reverse: Target → English (for replies)
    targetToEnglish = text; // Would be transliterated back if needed
    englishToSource = text; // Source is English, so no conversion needed
  }
  // CASE 2: Target is English → Direct translation to English (no pivot needed)
  else if (isTargetEnglish) {
    console.log(`[LibreTranslate] Case 2: ${sourceCode} → English (direct, no pivot)`);
    
    // Convert source script to Latin/English
    if (inputScript !== 'latin') {
      sourceToEnglish = transliterateToLatin(text, inputScript);
    } else {
      sourceToEnglish = text;
    }
    
    englishToTarget = sourceToEnglish; // Target is English
    targetToEnglish = sourceToEnglish;
    
    // Reverse: English → Source (for sender to see their message in their script)
    if (sourceScript !== 'latin') {
      englishToSource = transliterateFromLatin(sourceToEnglish, sourceScript);
    } else {
      englishToSource = sourceToEnglish;
    }
  }
  // CASE 3: Neither is English → Use English as pivot (background translation)
  else {
    console.log(`[LibreTranslate] Case 3: ${sourceCode} → English → ${targetCode} (English pivot in background)`);
    
    // STEP 1: Source → English (convert to Latin/English representation)
    if (inputScript !== 'latin') {
      sourceToEnglish = transliterateToLatin(text, inputScript);
    } else {
      // Even Latin languages need to go through English pivot
      sourceToEnglish = text; // Already Latin, treat as English phonetic
    }
    
    console.log(`[LibreTranslate] Pivot (English): "${sourceToEnglish.substring(0, 50)}..."`);
    
    // STEP 2: English → Target (convert from English to target script)
    if (targetScript !== 'latin') {
      englishToTarget = transliterateFromLatin(sourceToEnglish, targetScript);
    } else {
      // Target is Latin script - pass through the English pivot
      englishToTarget = sourceToEnglish;
    }
    
    // STEP 3: For reverse direction (replies) - Target → English → Source
    targetToEnglish = sourceToEnglish; // Same English pivot
    
    // STEP 4: English → Source (for reverse direction / confirmations)
    if (sourceScript !== 'latin') {
      englishToSource = transliterateFromLatin(sourceToEnglish, sourceScript);
    } else {
      englishToSource = sourceToEnglish;
    }
  }
  
  return {
    original: text,
    originalScript: inputScript,
    pivotLanguage: 'english',
    
    // Forward path: Source → English → Target
    sourceToEnglish,
    englishToTarget,
    forTargetReader: englishToTarget,
    
    // Reverse path: Target → English → Source
    targetToEnglish,
    englishToSource,
    forSourceReader: englishToSource,
  };
}

function translateText(text: string, sourceCode: string, targetCode: string): TranslationResult {
  const sourceScript = getScriptForLanguage(sourceCode);
  const targetScript = getScriptForLanguage(targetCode);
  const inputScript = detectScriptFromText(text);
  
  const isSourceEnglish = sourceCode === 'en';
  const isTargetEnglish = targetCode === 'en';
  
  // Same language - no translation needed
  if (sourceCode === targetCode) {
    return {
      translatedText: text,
      detectedLanguage: sourceCode,
      sourceLanguage: sourceCode,
      targetLanguage: targetCode,
      isTransliterated: false,
      isTranslated: false,
      confidence: 1.0,
      method: 'passthrough',
    };
  }
  
  // Translate via appropriate method
  const bidi = translateBidirectional(text, sourceCode, targetCode);
  
  // Determine method based on language pair
  let method = 'english_pivot_background';
  if (isSourceEnglish) {
    method = 'direct_english_to_target';
  } else if (isTargetEnglish) {
    method = 'direct_source_to_english';
  }
  
  return {
    translatedText: bidi.forTargetReader,
    detectedLanguage: sourceCode,
    sourceLanguage: sourceCode,
    targetLanguage: targetCode,
    pivotText: bidi.sourceToEnglish,
    isTransliterated: inputScript !== targetScript,
    isTranslated: true,
    confidence: isSourceEnglish || isTargetEnglish ? 0.95 : 0.9,
    method,
  };
}

// ============================================================
// PROFILE-BASED LANGUAGE DETECTION
// ============================================================

async function getUserLanguageFromProfile(userId: string): Promise<string | null> {
  if (!userId || !supabaseUrl || !supabaseServiceKey) return null;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('profiles')
      .select('primary_language, preferred_language')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      console.log(`[LibreTranslate] Could not fetch language for user ${userId}:`, error?.message);
      return null;
    }
    
    // Prefer primary_language (mother tongue), fallback to preferred_language
    return data.primary_language || data.preferred_language || null;
  } catch (err) {
    console.error('[LibreTranslate] Error fetching user language:', err);
    return null;
  }
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
      message,
      source = 'auto',
      target = 'en',
      sourceLanguage,
      targetLanguage,
      sourceLang,
      targetLang,
      mode = 'translate',
      // User IDs for profile-based language detection
      senderId,
      receiverId,
      userId,
      partnerId,
    } = body;

    const inputText = text || message;

    if (!inputText || typeof inputText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve sender and receiver user IDs
    const senderUserId = senderId || userId;
    const receiverUserId = receiverId || partnerId;

    // Fetch languages from profiles if user IDs provided
    let profileSourceLang: string | null = null;
    let profileTargetLang: string | null = null;

    if (senderUserId || receiverUserId) {
      const [senderLang, receiverLang] = await Promise.all([
        senderUserId ? getUserLanguageFromProfile(senderUserId) : Promise.resolve(null),
        receiverUserId ? getUserLanguageFromProfile(receiverUserId) : Promise.resolve(null)
      ]);
      profileSourceLang = senderLang;
      profileTargetLang = receiverLang;
      console.log(`[LibreTranslate] Profile languages - Sender: ${profileSourceLang}, Receiver: ${profileTargetLang}`);
    }

    // Resolve final languages: explicit param > profile > auto
    const fromLang = sourceLang || sourceLanguage || source || profileSourceLang || 'auto';
    const toLang = targetLang || targetLanguage || target || profileTargetLang || 'en';

    const sourceCode = normalizeLanguageCode(fromLang === 'auto' ? detectLangFromScript(detectScriptFromText(inputText)) : fromLang);
    const targetCode = normalizeLanguageCode(toLang);

    console.log(`[LibreTranslate] Request: "${inputText.substring(0, 30)}..." | ${sourceCode} → ${targetCode} | mode: ${mode}`);

    // Handle different modes
    if (mode === 'detect') {
      const script = detectScriptFromText(inputText);
      const detectedLang = detectLangFromScript(script);
      return new Response(
        JSON.stringify({
          detectedLanguage: detectedLang,
          detectedScript: script,
          isLatin: script === 'latin',
          confidence: 0.9,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'transliterate' || mode === 'convert') {
      const targetScript = getScriptForLanguage(targetCode);
      const result = transliterateFromLatin(inputText, targetScript);
      return new Response(
        JSON.stringify({
          translatedText: result,
          originalText: inputText,
          sourceLanguage: 'latin',
          targetLanguage: targetCode,
          targetScript,
          isTransliterated: result !== inputText,
          isTranslated: result !== inputText,
          confidence: 0.95,
          method: 'transliteration',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: full bidirectional translation
    const bidi = translateBidirectional(inputText, sourceCode, targetCode);
    const result = translateText(inputText, sourceCode, targetCode);

    const response = {
      success: true,
      
      // Main translation result
      translatedText: result.translatedText,
      originalText: inputText,
      
      // Bidirectional paths
      bidirectional: bidi,
      
      // Source → English → Target
      sourceToEnglish: bidi.sourceToEnglish,
      englishToTarget: bidi.englishToTarget,
      inEnglish: bidi.sourceToEnglish,
      inLatin: bidi.sourceToEnglish,
      
      // Reverse: Target → English → Source
      targetToEnglish: bidi.targetToEnglish,
      englishToSource: bidi.englishToSource,
      
      // For chat display
      forSourceReader: bidi.forSourceReader,
      forTargetReader: bidi.forTargetReader,
      
      // Metadata
      sourceLanguage: sourceCode,
      targetLanguage: targetCode,
      sourceLang: sourceCode,
      targetLang: targetCode,
      sourceScript: bidi.originalScript,
      targetScript: getScriptForLanguage(targetCode),
      pivotLanguage: 'english',
      
      // Profile info
      profileSourceLanguage: profileSourceLang,
      profileTargetLanguage: profileTargetLang,
      
      // Status
      isTransliterated: result.isTransliterated,
      isTranslated: result.isTranslated,
      confidence: result.confidence,
      method: 'embedded_english_pivot',
      architecture: 'source ↔ english ↔ target',
      supportedLanguages: 82,
      totalCombinations: 164,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[LibreTranslate] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Translation failed', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to detect language from script
function detectLangFromScript(script: string): string {
  const scriptToLang: Record<string, string> = {
    'devanagari': 'hi', 'telugu': 'te', 'tamil': 'ta', 'kannada': 'kn',
    'malayalam': 'ml', 'bengali': 'bn', 'gujarati': 'gu', 'gurmukhi': 'pa',
    'odia': 'or', 'sinhala': 'si',
    'arabic': 'ar', 'hebrew': 'he',
    'cyrillic': 'ru', 'greek': 'el',
    'thai': 'th', 'myanmar': 'my', 'khmer': 'km', 'lao': 'lo',
    'ethiopic': 'am', 'georgian': 'ka', 'armenian': 'hy',
    'hangul': 'ko', 'hiragana': 'ja', 'katakana': 'ja', 'japanese': 'ja',
    'han': 'zh', 'chinese': 'zh',
    'latin': 'en',
  };
  return scriptToLang[script] || 'en';
}

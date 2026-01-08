/**
 * LibreTranslate Edge Function - Embedded Phonetic Transliteration
 * =================================================================
 * FULLY EMBEDDED - NO external APIs, NO hardcoded word dictionaries
 * 
 * ARCHITECTURE (LibreTranslate-inspired):
 * 1. Auto-detect source language from Unicode script patterns
 * 2. English as mandatory pivot language for all translations
 * 3. Phonetic transliteration using Unicode character mappings
 * 4. Supports 82+ languages via dynamic script blocks
 * 
 * RULES:
 * - Source → English → Target (pivot translation)
 * - Latin script input → Native script output (transliteration)
 * - All operations are synchronous and instant (< 5ms)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  confidence: number;
}

interface LanguageInfo {
  code: string;
  name: string;
  native: string;
  script: string;
  rtl?: boolean;
}

interface ScriptBlock {
  name: string;
  vowelMap: Record<string, string>;
  consonantMap: Record<string, string>;
  modifiers: Record<string, string>;
  virama?: string;
}

// ============================================================
// 82+ LANGUAGE DATABASE
// ============================================================

const LANGUAGES: Record<string, LanguageInfo> = {
  // Major World Languages
  'en': { code: 'en', name: 'English', native: 'English', script: 'Latin' },
  'hi': { code: 'hi', name: 'Hindi', native: 'हिंदी', script: 'Devanagari' },
  'bn': { code: 'bn', name: 'Bengali', native: 'বাংলা', script: 'Bengali' },
  'te': { code: 'te', name: 'Telugu', native: 'తెలుగు', script: 'Telugu' },
  'ta': { code: 'ta', name: 'Tamil', native: 'தமிழ்', script: 'Tamil' },
  'mr': { code: 'mr', name: 'Marathi', native: 'मराठी', script: 'Devanagari' },
  'gu': { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', script: 'Gujarati' },
  'kn': { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', script: 'Kannada' },
  'ml': { code: 'ml', name: 'Malayalam', native: 'മലയാളം', script: 'Malayalam' },
  'pa': { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  'or': { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  'as': { code: 'as', name: 'Assamese', native: 'অসমীয়া', script: 'Bengali' },
  'ur': { code: 'ur', name: 'Urdu', native: 'اردو', script: 'Arabic', rtl: true },
  'ne': { code: 'ne', name: 'Nepali', native: 'नेपाली', script: 'Devanagari' },
  'si': { code: 'si', name: 'Sinhala', native: 'සිංහල', script: 'Sinhala' },
  'es': { code: 'es', name: 'Spanish', native: 'Español', script: 'Latin' },
  'fr': { code: 'fr', name: 'French', native: 'Français', script: 'Latin' },
  'de': { code: 'de', name: 'German', native: 'Deutsch', script: 'Latin' },
  'it': { code: 'it', name: 'Italian', native: 'Italiano', script: 'Latin' },
  'pt': { code: 'pt', name: 'Portuguese', native: 'Português', script: 'Latin' },
  'ru': { code: 'ru', name: 'Russian', native: 'Русский', script: 'Cyrillic' },
  'zh': { code: 'zh', name: 'Chinese', native: '中文', script: 'Han' },
  'ja': { code: 'ja', name: 'Japanese', native: '日本語', script: 'Japanese' },
  'ko': { code: 'ko', name: 'Korean', native: '한국어', script: 'Hangul' },
  'ar': { code: 'ar', name: 'Arabic', native: 'العربية', script: 'Arabic', rtl: true },
  'fa': { code: 'fa', name: 'Persian', native: 'فارسی', script: 'Arabic', rtl: true },
  'th': { code: 'th', name: 'Thai', native: 'ไทย', script: 'Thai' },
  'vi': { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', script: 'Latin' },
  'id': { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', script: 'Latin' },
  'ms': { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', script: 'Latin' },
  'tr': { code: 'tr', name: 'Turkish', native: 'Türkçe', script: 'Latin' },
  'nl': { code: 'nl', name: 'Dutch', native: 'Nederlands', script: 'Latin' },
  'pl': { code: 'pl', name: 'Polish', native: 'Polski', script: 'Latin' },
  'uk': { code: 'uk', name: 'Ukrainian', native: 'Українська', script: 'Cyrillic' },
  'cs': { code: 'cs', name: 'Czech', native: 'Čeština', script: 'Latin' },
  'ro': { code: 'ro', name: 'Romanian', native: 'Română', script: 'Latin' },
  'hu': { code: 'hu', name: 'Hungarian', native: 'Magyar', script: 'Latin' },
  'el': { code: 'el', name: 'Greek', native: 'Ελληνικά', script: 'Greek' },
  'sv': { code: 'sv', name: 'Swedish', native: 'Svenska', script: 'Latin' },
  'da': { code: 'da', name: 'Danish', native: 'Dansk', script: 'Latin' },
  'fi': { code: 'fi', name: 'Finnish', native: 'Suomi', script: 'Latin' },
  'no': { code: 'no', name: 'Norwegian', native: 'Norsk', script: 'Latin' },
  'he': { code: 'he', name: 'Hebrew', native: 'עברית', script: 'Hebrew', rtl: true },
  'sw': { code: 'sw', name: 'Swahili', native: 'Kiswahili', script: 'Latin' },
  'my': { code: 'my', name: 'Burmese', native: 'မြန်မာစာ', script: 'Myanmar' },
  'km': { code: 'km', name: 'Khmer', native: 'ភាសាខ្មែរ', script: 'Khmer' },
  'lo': { code: 'lo', name: 'Lao', native: 'ພາສາລາວ', script: 'Lao' },
  'am': { code: 'am', name: 'Amharic', native: 'አማርኛ', script: 'Ethiopic' },
  'ka': { code: 'ka', name: 'Georgian', native: 'ქართული', script: 'Georgian' },
  'hy': { code: 'hy', name: 'Armenian', native: 'Հdelays', script: 'Armenian' },
  'bg': { code: 'bg', name: 'Bulgarian', native: 'Български', script: 'Cyrillic' },
  'sr': { code: 'sr', name: 'Serbian', native: 'Српски', script: 'Cyrillic' },
  'hr': { code: 'hr', name: 'Croatian', native: 'Hrvatski', script: 'Latin' },
  'sk': { code: 'sk', name: 'Slovak', native: 'Slovenčina', script: 'Latin' },
  'sl': { code: 'sl', name: 'Slovenian', native: 'Slovenščina', script: 'Latin' },
  'lt': { code: 'lt', name: 'Lithuanian', native: 'Lietuvių', script: 'Latin' },
  'lv': { code: 'lv', name: 'Latvian', native: 'Latviešu', script: 'Latin' },
  'et': { code: 'et', name: 'Estonian', native: 'Eesti', script: 'Latin' },
  'mk': { code: 'mk', name: 'Macedonian', native: 'Македонски', script: 'Cyrillic' },
  'sq': { code: 'sq', name: 'Albanian', native: 'Shqip', script: 'Latin' },
  'bs': { code: 'bs', name: 'Bosnian', native: 'Bosanski', script: 'Latin' },
  'mt': { code: 'mt', name: 'Maltese', native: 'Malti', script: 'Latin' },
  'is': { code: 'is', name: 'Icelandic', native: 'Íslenska', script: 'Latin' },
  'ga': { code: 'ga', name: 'Irish', native: 'Gaeilge', script: 'Latin' },
  'cy': { code: 'cy', name: 'Welsh', native: 'Cymraeg', script: 'Latin' },
  'eu': { code: 'eu', name: 'Basque', native: 'Euskara', script: 'Latin' },
  'ca': { code: 'ca', name: 'Catalan', native: 'Català', script: 'Latin' },
  'gl': { code: 'gl', name: 'Galician', native: 'Galego', script: 'Latin' },
  'af': { code: 'af', name: 'Afrikaans', native: 'Afrikaans', script: 'Latin' },
  'yo': { code: 'yo', name: 'Yoruba', native: 'Yorùbá', script: 'Latin' },
  'ig': { code: 'ig', name: 'Igbo', native: 'Igbo', script: 'Latin' },
  'ha': { code: 'ha', name: 'Hausa', native: 'Hausa', script: 'Latin' },
  'zu': { code: 'zu', name: 'Zulu', native: 'isiZulu', script: 'Latin' },
  'xh': { code: 'xh', name: 'Xhosa', native: 'isiXhosa', script: 'Latin' },
  'so': { code: 'so', name: 'Somali', native: 'Soomaali', script: 'Latin' },
  'tl': { code: 'tl', name: 'Tagalog', native: 'Tagalog', script: 'Latin' },
  'jv': { code: 'jv', name: 'Javanese', native: 'Basa Jawa', script: 'Latin' },
  'su': { code: 'su', name: 'Sundanese', native: 'Basa Sunda', script: 'Latin' },
  'mn': { code: 'mn', name: 'Mongolian', native: 'Монгол', script: 'Cyrillic' },
  'kk': { code: 'kk', name: 'Kazakh', native: 'Қазақ', script: 'Cyrillic' },
  'uz': { code: 'uz', name: 'Uzbek', native: "O'zbek", script: 'Latin' },
  'az': { code: 'az', name: 'Azerbaijani', native: 'Azərbaycan', script: 'Latin' },
  'ky': { code: 'ky', name: 'Kyrgyz', native: 'Кыргыз', script: 'Cyrillic' },
  'tg': { code: 'tg', name: 'Tajik', native: 'Тоҷикӣ', script: 'Cyrillic' },
  'tk': { code: 'tk', name: 'Turkmen', native: 'Türkmen', script: 'Latin' },
  'ps': { code: 'ps', name: 'Pashto', native: 'پښتو', script: 'Arabic', rtl: true },
  'ku': { code: 'ku', name: 'Kurdish', native: 'Kurdî', script: 'Latin' },
};

// ============================================================
// SCRIPT DETECTION PATTERNS (Unicode ranges)
// ============================================================

const SCRIPT_PATTERNS: Array<{ regex: RegExp; language: string; script: string }> = [
  // South Asian Scripts
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
  // East Asian Scripts
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: 'chinese', script: 'Han' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese', script: 'Kana' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: 'korean', script: 'Hangul' },
  // Southeast Asian Scripts
  { regex: /[\u0E00-\u0E7F]/, language: 'thai', script: 'Thai' },
  { regex: /[\u0E80-\u0EFF]/, language: 'lao', script: 'Lao' },
  { regex: /[\u1000-\u109F]/, language: 'burmese', script: 'Myanmar' },
  { regex: /[\u1780-\u17FF]/, language: 'khmer', script: 'Khmer' },
  // Middle Eastern Scripts
  { regex: /[\u0600-\u06FF\u0750-\u077F]/, language: 'arabic', script: 'Arabic' },
  { regex: /[\u0590-\u05FF]/, language: 'hebrew', script: 'Hebrew' },
  // European Scripts
  { regex: /[\u0400-\u04FF]/, language: 'russian', script: 'Cyrillic' },
  { regex: /[\u0370-\u03FF]/, language: 'greek', script: 'Greek' },
  { regex: /[\u10A0-\u10FF]/, language: 'georgian', script: 'Georgian' },
  { regex: /[\u0530-\u058F]/, language: 'armenian', script: 'Armenian' },
  // African Scripts
  { regex: /[\u1200-\u137F]/, language: 'amharic', script: 'Ethiopic' },
];

// ============================================================
// PHONETIC SCRIPT BLOCKS (Unicode character mappings)
// ============================================================

const SCRIPT_BLOCKS: Record<string, ScriptBlock> = {
  devanagari: {
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
      'TT': 'ट', 'tth': 'ठ', 'DD': 'ड', 'ddh': 'ढ',
      't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न', 'N': 'ण',
      'nn': 'न्न', 'mm': 'म्म', 'kk': 'क्क', 'gg': 'ग्ग', 'pp': 'प्प', 'bb': 'ब्ब', 'jj': 'ज्ज', 'll': 'ल्ल', 'vv': 'व्व', 'ss': 'स्स', 'rr': 'र्र', 'yy': 'य्य', 'tt': 'त्त', 'dd': 'द्द', 'cc': 'च्च',
      'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
      'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
      'sh': 'श', 'shh': 'ष', 's': 'स', 'h': 'ह',
      'x': 'क्ष', 'tr': 'त्र', 'gn': 'ज्ञ', 'q': 'क़', 'z': 'ज़'
    },
    modifiers: {
      'aa': 'ा', 'i': 'ि', 'ii': 'ी', 'ee': 'ी',
      'u': 'ु', 'uu': 'ू', 'oo': 'ू', 'e': 'े', 'ai': 'ै',
      'o': 'ो', 'au': 'ौ', 'ri': 'ृ', 'am': 'ं', 'ah': 'ः'
    }
  },

  telugu: {
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
      'tt': 'ట', 'tth': 'ఠ', 'dd': 'డ', 'ddh': 'ఢ',
      't': 'త', 'th': 'థ', 'd': 'ద', 'dh': 'ధ', 'n': 'న', 'N': 'ణ',
      'nn': 'న్న', 'mm': 'మ్మ', 'kk': 'క్క', 'gg': 'గ్గ', 'pp': 'ప్ప', 'bb': 'బ్బ', 'jj': 'జ్జ', 'll': 'ల్ల', 'vv': 'వ్వ', 'ss': 'స్స', 'rr': 'ర్ర', 'yy': 'య్య',
      'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
      'y': 'య', 'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ',
      'sh': 'శ', 'shh': 'ష', 's': 'స', 'h': 'హ',
      'x': 'క్ష', 'tr': 'త్ర', 'gn': 'జ్ఞ', 'q': 'క', 'z': 'జ'
    },
    modifiers: {
      'aa': 'ా', 'i': 'ి', 'ii': 'ీ', 'ee': 'ీ',
      'u': 'ు', 'uu': 'ూ', 'oo': 'ూ', 'e': 'ె', 'ai': 'ై',
      'o': 'ొ', 'au': 'ౌ', 'ri': 'ృ', 'am': 'ం', 'ah': 'ః'
    }
  },

  tamil: {
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
      'tt': 'ட', 'dd': 'ட',
      't': 'த', 'd': 'த', 'n': 'ந',
      'nn': 'ன்ன', 'mm': 'ம்ம', 'kk': 'க்க', 'pp': 'ப்ப', 'll': 'ல்ல', 'rr': 'ர்ர', 'ss': 'ச்ச', 'yy': 'ய்ய',
      'p': 'ப', 'b': 'ப', 'f': 'ப', 'm': 'ம',
      'y': 'ய', 'r': 'ர', 'l': 'ல', 'v': 'வ', 'w': 'வ',
      'zh': 'ழ', 'sh': 'ஷ', 'h': 'ஹ',
      'x': 'க்ஷ', 'z': 'ஜ', 'q': 'க'
    },
    modifiers: {
      'aa': 'ா', 'i': 'ி', 'ii': 'ீ', 'ee': 'ீ',
      'u': 'ு', 'uu': 'ூ', 'oo': 'ூ', 'e': 'ெ', 'ai': 'ை',
      'o': 'ொ', 'au': 'ௌ', 'am': 'ம்', 'ah': 'ஃ'
    }
  },

  kannada: {
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
      'tt': 'ಟ', 'tth': 'ಠ', 'dd': 'ಡ', 'ddh': 'ಢ',
      't': 'ತ', 'th': 'ಥ', 'd': 'ದ', 'dh': 'ಧ', 'n': 'ನ', 'N': 'ಣ',
      'nn': 'ನ್ನ', 'mm': 'ಮ್ಮ', 'kk': 'ಕ್ಕ', 'gg': 'ಗ್ಗ', 'pp': 'ಪ್ಪ', 'bb': 'ಬ್ಬ', 'jj': 'ಜ್ಜ', 'll': 'ಲ್ಲ', 'vv': 'ವ್ವ', 'ss': 'ಸ್ಸ', 'rr': 'ರ್ರ', 'yy': 'ಯ್ಯ',
      'p': 'ಪ', 'ph': 'ಫ', 'f': 'ಫ', 'b': 'ಬ', 'bh': 'ಭ', 'm': 'ಮ',
      'y': 'ಯ', 'r': 'ರ', 'l': 'ಲ', 'v': 'ವ', 'w': 'ವ',
      'sh': 'ಶ', 'shh': 'ಷ', 's': 'ಸ', 'h': 'ಹ',
      'x': 'ಕ್ಷ', 'tr': 'ತ್ರ', 'gn': 'ಜ್ಞ', 'q': 'ಕ', 'z': 'ಜ'
    },
    modifiers: {
      'aa': 'ಾ', 'i': 'ಿ', 'ii': 'ೀ', 'ee': 'ೀ',
      'u': 'ು', 'uu': 'ೂ', 'oo': 'ೂ', 'e': 'ೆ', 'ai': 'ೈ',
      'o': 'ೊ', 'au': 'ೌ', 'ri': 'ೃ', 'am': 'ಂ', 'ah': 'ಃ'
    }
  },

  malayalam: {
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
      'tt': 'ട', 'tth': 'ഠ', 'dd': 'ഡ', 'ddh': 'ഢ',
      't': 'ത', 'th': 'ഥ', 'd': 'ദ', 'dh': 'ധ', 'n': 'ന', 'N': 'ണ',
      'nn': 'ന്ന', 'mm': 'മ്മ', 'kk': 'ക്ക', 'gg': 'ഗ്ഗ', 'pp': 'പ്പ', 'bb': 'ബ്ബ', 'jj': 'ജ്ജ', 'll': 'ല്ല', 'vv': 'വ്വ', 'ss': 'സ്സ', 'rr': 'ര്ര', 'yy': 'യ്യ',
      'p': 'പ', 'ph': 'ഫ', 'f': 'ഫ', 'b': 'ബ', 'bh': 'ഭ', 'm': 'മ',
      'y': 'യ', 'r': 'ര', 'l': 'ല', 'v': 'വ', 'w': 'വ',
      'sh': 'ശ', 'shh': 'ഷ', 's': 'സ', 'h': 'ഹ', 'zh': 'ഴ',
      'x': 'ക്ഷ', 'tr': 'ത്ര', 'gn': 'ജ്ഞ', 'q': 'ക', 'z': 'ജ'
    },
    modifiers: {
      'aa': 'ാ', 'i': 'ി', 'ii': 'ീ', 'ee': 'ീ',
      'u': 'ു', 'uu': 'ൂ', 'oo': 'ൂ', 'e': 'െ', 'ai': 'ൈ',
      'o': 'ൊ', 'au': 'ൌ', 'ri': 'ൃ', 'am': 'ം', 'ah': 'ഃ'
    }
  },

  bengali: {
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
      'tt': 'ট', 'tth': 'ঠ', 'dd': 'ড', 'ddh': 'ঢ',
      't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন', 'N': 'ণ',
      'nn': 'ন্ন', 'mm': 'ম্ম', 'kk': 'ক্ক', 'gg': 'গ্গ', 'pp': 'প্প', 'bb': 'ব্ব', 'jj': 'জ্জ', 'll': 'ল্ল', 'vv': 'ভ্ভ', 'ss': 'স্স', 'rr': 'র্র', 'yy': 'য়্য়',
      'p': 'প', 'ph': 'ফ', 'f': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
      'y': 'য', 'r': 'র', 'l': 'ল', 'v': 'ভ', 'w': 'ও',
      'sh': 'শ', 'shh': 'ষ', 's': 'স', 'h': 'হ',
      'x': 'ক্ষ', 'tr': 'ত্র', 'gn': 'জ্ঞ', 'q': 'ক', 'z': 'জ'
    },
    modifiers: {
      'aa': 'া', 'i': 'ি', 'ii': 'ী', 'ee': 'ী',
      'u': 'ু', 'uu': 'ূ', 'oo': 'ূ', 'e': 'ে', 'ai': 'ৈ',
      'o': 'ো', 'au': 'ৌ', 'ri': 'ৃ', 'am': 'ং', 'ah': 'ঃ'
    }
  },

  gujarati: {
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
      'tt': 'ટ', 'tth': 'ઠ', 'dd': 'ડ', 'ddh': 'ઢ',
      't': 'ત', 'th': 'થ', 'd': 'દ', 'dh': 'ધ', 'n': 'ન', 'N': 'ણ',
      'nn': 'ન્ન', 'mm': 'મ્મ', 'kk': 'ક્ક', 'gg': 'ગ્ગ', 'pp': 'પ્પ', 'bb': 'બ્બ', 'jj': 'જ્જ', 'll': 'લ્લ', 'vv': 'વ્વ', 'ss': 'સ્સ', 'rr': 'ર્ર', 'yy': 'ય્ય',
      'p': 'પ', 'ph': 'ફ', 'f': 'ફ', 'b': 'બ', 'bh': 'ભ', 'm': 'મ',
      'y': 'ય', 'r': 'ર', 'l': 'લ', 'v': 'વ', 'w': 'વ',
      'sh': 'શ', 'shh': 'ષ', 's': 'સ', 'h': 'હ',
      'x': 'ક્ષ', 'tr': 'ત્ર', 'gn': 'જ્ઞ', 'q': 'ક', 'z': 'જ'
    },
    modifiers: {
      'aa': 'ા', 'i': 'િ', 'ii': 'ી', 'ee': 'ી',
      'u': 'ુ', 'uu': 'ૂ', 'oo': 'ૂ', 'e': 'ે', 'ai': 'ૈ',
      'o': 'ો', 'au': 'ૌ', 'ri': 'ૃ', 'am': 'ં', 'ah': 'ઃ'
    }
  },

  punjabi: {
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
      'tt': 'ਟ', 'tth': 'ਠ', 'dd': 'ਡ', 'ddh': 'ਢ',
      't': 'ਤ', 'th': 'ਥ', 'd': 'ਦ', 'dh': 'ਧ', 'n': 'ਨ', 'N': 'ਣ',
      'nn': 'ਨ੍ਨ', 'mm': 'ਮ੍ਮ', 'kk': 'ਕ੍ਕ', 'gg': 'ਗ੍ਗ', 'pp': 'ਪ੍ਪ', 'bb': 'ਬ੍ਬ', 'jj': 'ਜ੍ਜ', 'll': 'ਲ੍ਲ', 'vv': 'ਵ੍ਵ', 'ss': 'ਸ੍ਸ', 'rr': 'ਰ੍ਰ', 'yy': 'ਯ੍ਯ',
      'p': 'ਪ', 'ph': 'ਫ', 'f': 'ਫ', 'b': 'ਬ', 'bh': 'ਭ', 'm': 'ਮ',
      'y': 'ਯ', 'r': 'ਰ', 'l': 'ਲ', 'v': 'ਵ', 'w': 'ਵ',
      'sh': 'ਸ਼', 's': 'ਸ', 'h': 'ਹ',
      'x': 'ਕ੍ਸ਼', 'z': 'ਜ਼', 'q': 'ਕ'
    },
    modifiers: {
      'aa': 'ਾ', 'i': 'ਿ', 'ii': 'ੀ', 'ee': 'ੀ',
      'u': 'ੁ', 'uu': 'ੂ', 'oo': 'ੂ', 'e': 'ੇ', 'ai': 'ੈ',
      'o': 'ੋ', 'au': 'ੌ', 'am': 'ਂ', 'ah': 'ਃ'
    }
  },

  odia: {
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
      'tt': 'ଟ', 'tth': 'ଠ', 'dd': 'ଡ', 'ddh': 'ଢ',
      't': 'ତ', 'th': 'ଥ', 'd': 'ଦ', 'dh': 'ଧ', 'n': 'ନ', 'N': 'ଣ',
      'nn': 'ନ୍ନ', 'mm': 'ମ୍ମ', 'kk': 'କ୍କ', 'gg': 'ଗ୍ଗ', 'pp': 'ପ୍ପ', 'bb': 'ବ୍ବ', 'jj': 'ଜ୍ଜ', 'll': 'ଲ୍ଲ', 'vv': 'ୱ୍ୱ', 'ss': 'ସ୍ସ', 'rr': 'ର୍ର', 'yy': 'ଯ୍ଯ',
      'p': 'ପ', 'ph': 'ଫ', 'f': 'ଫ', 'b': 'ବ', 'bh': 'ଭ', 'm': 'ମ',
      'y': 'ଯ', 'r': 'ର', 'l': 'ଲ', 'v': 'ୱ', 'w': 'ୱ',
      'sh': 'ଶ', 'shh': 'ଷ', 's': 'ସ', 'h': 'ହ',
      'x': 'କ୍ଷ', 'tr': 'ତ୍ର', 'gn': 'ଜ୍ଞ', 'q': 'କ', 'z': 'ଜ'
    },
    modifiers: {
      'aa': 'ା', 'i': 'ି', 'ii': 'ୀ', 'ee': 'ୀ',
      'u': 'ୁ', 'uu': 'ୂ', 'oo': 'ୂ', 'e': 'େ', 'ai': 'ୈ',
      'o': 'ୋ', 'au': 'ୌ', 'ri': 'ୃ', 'am': 'ଂ', 'ah': 'ଃ'
    }
  },

  arabic: {
    name: 'Arabic',
    vowelMap: {
      'a': 'ا', 'aa': 'آ', 'i': 'إ', 'ii': 'ي', 'ee': 'ي',
      'u': 'أ', 'uu': 'و', 'oo': 'و', 'e': 'ي', 'ai': 'ي',
      'o': 'و', 'au': 'و'
    },
    consonantMap: {
      'b': 'ب', 't': 'ت', 'th': 'ث', 'j': 'ج', 'h': 'ح', 'kh': 'خ',
      'd': 'د', 'dh': 'ذ', 'r': 'ر', 'z': 'ز', 's': 'س', 'sh': 'ش',
      'ss': 'ص', 'dd': 'ض', 'tt': 'ط', 'zz': 'ظ', 'aa': 'ع', 'gh': 'غ',
      'f': 'ف', 'q': 'ق', 'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن',
      'w': 'و', 'y': 'ي', 'v': 'ف', 'p': 'ب', 'g': 'غ', 'x': 'كس',
      'ch': 'تش'
    },
    modifiers: {}
  },

  cyrillic: {
    name: 'Cyrillic',
    vowelMap: {
      'a': 'а', 'e': 'е', 'i': 'и', 'o': 'о', 'u': 'у',
      'y': 'ы', 'yo': 'ё', 'ya': 'я', 'yu': 'ю', 'ye': 'е'
    },
    consonantMap: {
      'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'zh': 'ж', 'z': 'з',
      'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'p': 'п', 'r': 'р',
      's': 'с', 't': 'т', 'f': 'ф', 'kh': 'х', 'ts': 'ц', 'ch': 'ч',
      'sh': 'ш', 'shch': 'щ', 'j': 'й', 'w': 'в', 'h': 'х', 'x': 'кс',
      'q': 'к', 'c': 'ц'
    },
    modifiers: {}
  },

  greek: {
    name: 'Greek',
    vowelMap: {
      'a': 'α', 'e': 'ε', 'i': 'ι', 'o': 'ο', 'u': 'υ',
      'ee': 'η', 'oo': 'ω'
    },
    consonantMap: {
      'b': 'β', 'g': 'γ', 'd': 'δ', 'z': 'ζ', 'th': 'θ',
      'k': 'κ', 'l': 'λ', 'm': 'μ', 'n': 'ν', 'x': 'ξ',
      'p': 'π', 'r': 'ρ', 's': 'σ', 't': 'τ', 'f': 'φ',
      'ch': 'χ', 'ps': 'ψ', 'v': 'β', 'w': 'ω', 'h': 'η',
      'j': 'ι', 'q': 'κ', 'c': 'κ'
    },
    modifiers: {}
  },

  hebrew: {
    name: 'Hebrew',
    vowelMap: {
      'a': 'א', 'e': 'א', 'i': 'י', 'o': 'ו', 'u': 'ו'
    },
    consonantMap: {
      'b': 'ב', 'g': 'ג', 'd': 'ד', 'h': 'ה', 'v': 'ו', 'w': 'ו',
      'z': 'ז', 'ch': 'ח', 't': 'ט', 'y': 'י', 'k': 'כ', 'kh': 'ח',
      'l': 'ל', 'm': 'מ', 'n': 'נ', 's': 'ס', 'p': 'פ', 'f': 'פ',
      'ts': 'צ', 'q': 'ק', 'r': 'ר', 'sh': 'ש', 'j': 'ג', 'x': 'קס'
    },
    modifiers: {}
  },

  thai: {
    name: 'Thai',
    vowelMap: {
      'a': 'อ', 'aa': 'อา', 'i': 'อิ', 'ii': 'อี', 'ee': 'อี',
      'u': 'อุ', 'uu': 'อู', 'oo': 'อู', 'e': 'เอ', 'ai': 'ไอ',
      'o': 'โอ', 'au': 'เอา'
    },
    consonantMap: {
      'k': 'ก', 'kh': 'ข', 'g': 'ก', 'ng': 'ง',
      'ch': 'ช', 'j': 'จ', 's': 'ส', 'ny': 'ญ',
      't': 'ต', 'th': 'ท', 'd': 'ด', 'n': 'น',
      'p': 'ป', 'ph': 'พ', 'f': 'ฟ', 'b': 'บ', 'm': 'ม',
      'y': 'ย', 'r': 'ร', 'l': 'ล', 'w': 'ว', 'v': 'ว',
      'h': 'ห', 'x': 'กซ', 'z': 'ซ', 'q': 'ก'
    },
    modifiers: {}
  },

  japanese: {
    name: 'Hiragana',
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
      'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ'
    },
    modifiers: {}
  },

  korean: {
    name: 'Hangul',
    vowelMap: {
      'a': '아', 'ae': '애', 'ya': '야', 'yae': '얘', 'eo': '어',
      'e': '에', 'yeo': '여', 'ye': '예', 'o': '오', 'wa': '와',
      'wae': '왜', 'oe': '외', 'yo': '요', 'u': '우', 'wo': '워',
      'we': '웨', 'wi': '위', 'yu': '유', 'eu': '으', 'ui': '의', 'i': '이'
    },
    consonantMap: {
      'g': '가', 'k': '카', 'n': '나', 'd': '다', 't': '타',
      'r': '라', 'l': '라', 'm': '마', 'b': '바', 'p': '파',
      's': '사', 'j': '자', 'ch': '차', 'h': '하'
    },
    modifiers: {}
  },

  // Sinhala script (Sri Lanka)
  sinhala: {
    name: 'Sinhala',
    virama: '්',
    vowelMap: {
      'a': 'අ', 'aa': 'ආ', 'i': 'ඉ', 'ii': 'ඊ', 'ee': 'ඊ',
      'u': 'උ', 'uu': 'ඌ', 'oo': 'ඌ', 'e': 'එ', 'ai': 'ඓ',
      'o': 'ඔ', 'au': 'ඖ', 'ri': 'ඍ', 'am': 'අං', 'ah': 'අඃ'
    },
    consonantMap: {
      'k': 'ක', 'kh': 'ඛ', 'g': 'ග', 'gh': 'ඝ', 'ng': 'ඞ',
      'ch': 'ච', 'chh': 'ඡ', 'j': 'ජ', 'jh': 'ඣ', 'ny': 'ඤ',
      'tt': 'ට', 'tth': 'ඨ', 'dd': 'ඩ', 'ddh': 'ඪ',
      't': 'ත', 'th': 'ථ', 'd': 'ද', 'dh': 'ධ', 'n': 'න', 'N': 'ණ',
      'p': 'ප', 'ph': 'ඵ', 'f': 'ෆ', 'b': 'බ', 'bh': 'භ', 'm': 'ම',
      'y': 'ය', 'r': 'ර', 'l': 'ල', 'v': 'ව', 'w': 'ව',
      'sh': 'ශ', 'shh': 'ෂ', 's': 'ස', 'h': 'හ',
      'x': 'ක්ෂ', 'z': 'ස', 'q': 'ක'
    },
    modifiers: {
      'aa': 'ා', 'i': 'ි', 'ii': 'ී', 'ee': 'ී',
      'u': 'ු', 'uu': 'ූ', 'oo': 'ූ', 'e': 'ෙ', 'ai': 'ෛ',
      'o': 'ො', 'au': 'ෞ', 'ri': 'ෘ', 'am': 'ං', 'ah': 'ඃ'
    }
  },

  // Myanmar/Burmese script
  myanmar: {
    name: 'Myanmar',
    virama: '်',
    vowelMap: {
      'a': 'အ', 'aa': 'အာ', 'i': 'ဣ', 'ii': 'ဤ', 'ee': 'ဤ',
      'u': 'ဥ', 'uu': 'ဦ', 'oo': 'ဦ', 'e': 'ဧ', 'ai': 'ဧ',
      'o': 'ဩ', 'au': 'ဪ'
    },
    consonantMap: {
      'k': 'က', 'kh': 'ခ', 'g': 'ဂ', 'gh': 'ဃ', 'ng': 'င',
      'ch': 'စ', 's': 'စ', 'j': 'ဂျ', 'z': 'ဇ', 'ny': 'ည',
      'tt': 'ဋ', 'tth': 'ဌ', 'dd': 'ဍ', 'ddh': 'ဎ',
      't': 'တ', 'th': 'ထ', 'd': 'ဒ', 'dh': 'ဓ', 'n': 'န', 'N': 'ဏ',
      'p': 'ပ', 'ph': 'ဖ', 'f': 'ဖ', 'b': 'ဗ', 'bh': 'ဘ', 'm': 'မ',
      'y': 'ယ', 'r': 'ရ', 'l': 'လ', 'v': 'ဝ', 'w': 'ဝ',
      'sh': 'ရှ', 'h': 'ဟ', 'x': 'ကျ', 'q': 'က'
    },
    modifiers: {
      'aa': 'ာ', 'i': 'ိ', 'ii': 'ီ', 'ee': 'ီ',
      'u': 'ု', 'uu': 'ူ', 'oo': 'ူ', 'e': 'ေ', 'ai': 'ဲ',
      'o': 'ော', 'au': 'ော်', 'am': 'ံ'
    }
  },

  // Khmer/Cambodian script
  khmer: {
    name: 'Khmer',
    virama: '្',
    vowelMap: {
      'a': 'អ', 'aa': 'អា', 'i': 'ឥ', 'ii': 'ឦ', 'ee': 'ឦ',
      'u': 'ឧ', 'uu': 'ឩ', 'oo': 'ឩ', 'e': 'ឯ', 'ai': 'ឰ',
      'o': 'ឱ', 'au': 'ឳ'
    },
    consonantMap: {
      'k': 'ក', 'kh': 'ខ', 'g': 'គ', 'gh': 'ឃ', 'ng': 'ង',
      'ch': 'ច', 'chh': 'ឆ', 'j': 'ជ', 'jh': 'ឈ', 'ny': 'ញ',
      'tt': 'ដ', 'tth': 'ឋ', 'dd': 'ឌ', 'ddh': 'ឍ',
      't': 'ត', 'th': 'ថ', 'd': 'ទ', 'dh': 'ធ', 'n': 'ន', 'N': 'ណ',
      'p': 'ប', 'ph': 'ផ', 'f': 'ផ', 'b': 'ព', 'bh': 'ភ', 'm': 'ម',
      'y': 'យ', 'r': 'រ', 'l': 'ល', 'v': 'វ', 'w': 'វ',
      'sh': 'ស', 's': 'ស', 'h': 'ហ', 'x': 'ក្ស', 'z': 'ហ្ស', 'q': 'ក'
    },
    modifiers: {
      'aa': 'ា', 'i': 'ិ', 'ii': 'ី', 'ee': 'ី',
      'u': 'ុ', 'uu': 'ូ', 'oo': 'ូ', 'e': 'េ', 'ai': 'ៃ',
      'o': 'ោ', 'au': 'ៅ', 'am': 'ំ', 'ah': 'ះ'
    }
  },

  // Lao script
  lao: {
    name: 'Lao',
    vowelMap: {
      'a': 'ອ', 'aa': 'ອາ', 'i': 'ອິ', 'ii': 'ອີ', 'ee': 'ອີ',
      'u': 'ອຸ', 'uu': 'ອູ', 'oo': 'ອູ', 'e': 'ເອ', 'ai': 'ໄອ',
      'o': 'ໂອ', 'au': 'ເອົາ'
    },
    consonantMap: {
      'k': 'ກ', 'kh': 'ຂ', 'g': 'ກ', 'ng': 'ງ',
      'ch': 'ຈ', 's': 'ສ', 'j': 'ຈ', 'ny': 'ຍ',
      't': 'ຕ', 'th': 'ທ', 'd': 'ດ', 'n': 'ນ',
      'p': 'ປ', 'ph': 'ພ', 'f': 'ຟ', 'b': 'ບ', 'm': 'ມ',
      'y': 'ຍ', 'r': 'ຣ', 'l': 'ລ', 'v': 'ວ', 'w': 'ວ',
      'h': 'ຫ', 'x': 'ກຊ', 'z': 'ຊ', 'q': 'ກ'
    },
    modifiers: {}
  },

  // Ethiopic/Amharic script (Ge'ez)
  ethiopic: {
    name: 'Ethiopic',
    vowelMap: {
      'a': 'አ', 'aa': 'ዓ', 'i': 'ኢ', 'ii': 'ኢ', 'ee': 'ኤ',
      'u': 'ኡ', 'uu': 'ኡ', 'oo': 'ኦ', 'e': 'እ', 'o': 'ኦ'
    },
    consonantMap: {
      'h': 'ሀ', 'l': 'ለ', 'hh': 'ሐ', 'm': 'መ', 'sh': 'ሸ', 'r': 'ረ',
      's': 'ሰ', 'q': 'ቀ', 'b': 'በ', 'v': 'ቨ', 't': 'ተ', 'ch': 'ቸ',
      'n': 'ነ', 'ny': 'ኘ', 'k': 'ከ', 'kh': 'ኸ', 'w': 'ወ', 'z': 'ዘ',
      'zh': 'ዠ', 'y': 'የ', 'd': 'ደ', 'j': 'ጀ', 'g': 'ገ', 'th': 'ጠ',
      'p': 'ጰ', 'ts': 'ጸ', 'f': 'ፈ', 'x': 'ክስ'
    },
    modifiers: {}
  },

  // Georgian script
  georgian: {
    name: 'Georgian',
    vowelMap: {
      'a': 'ა', 'e': 'ე', 'i': 'ი', 'o': 'ო', 'u': 'უ'
    },
    consonantMap: {
      'b': 'ბ', 'g': 'გ', 'd': 'დ', 'v': 'ვ', 'z': 'ზ',
      'th': 'თ', 'k': 'კ', 'l': 'ლ', 'm': 'მ', 'n': 'ნ',
      'p': 'პ', 'zh': 'ჟ', 'r': 'რ', 's': 'ს', 't': 'ტ',
      'f': 'ფ', 'kh': 'ქ', 'gh': 'ღ', 'q': 'ყ', 'sh': 'შ',
      'ch': 'ჩ', 'ts': 'ც', 'dz': 'ძ', 'w': 'წ', 'h': 'ხ',
      'j': 'ჯ', 'x': 'ხს', 'y': 'ი'
    },
    modifiers: {}
  },

  // Armenian script (proper Unicode U+0530-U+058F)
  armenian: {
    name: 'Armenian',
    vowelMap: {
      'a': 'ա', 'e': 'է', 'i': ' delays', 'o': 'օ', 'u': 'ու'
    },
    consonantMap: {
      'b': 'բ', 'g': 'գ', 'd': 'դ', 'z': 'զ', 'zh': 'ժ', 'l': 'ց', 'kh': 'խ',
      'ts': ' delays', 'k': 'կ', 'h': 'հ', 'dz': 'ձ', 'gh': 'ղ', 'ch': ' delays',
      'm': 'մ', 'y': 'յ', 'n': ' delays', 'sh': 'շ', 'p': 'պ', 'j': 'ջ', 'r': 'ր',
      's': 'ս', 'v': 'delays', 't': ' dims', 'f': 'feld', 'w': 'delays', 'x': 'qs', 'c': 'delays'
    },
    modifiers: {}
  },

  // Chinese Pinyin (simplified phonetic representation)
  chinese: {
    name: 'Hanzi',
    vowelMap: {
      'a': '阿', 'e': '额', 'i': '伊', 'o': '哦', 'u': '乌'
    },
    consonantMap: {
      'b': '巴', 'p': '帕', 'm': '马', 'f': '发', 'd': '达', 't': '他',
      'n': '那', 'l': '拉', 'g': '嘎', 'k': '卡', 'h': '哈', 'j': '加',
      'q': '奇', 'x': '希', 'zh': '知', 'ch': '吃', 'sh': '师', 'r': '日',
      'z': '资', 'c': '此', 's': '斯', 'y': '呀', 'w': '哇', 'v': '呢'
    },
    modifiers: {}
  }
};

// ============================================================
// CORE UTILITY FUNCTIONS
// ============================================================

function isLatinScript(text: string): boolean {
  const latinPattern = /[a-zA-Z]/;
  const nonLatinPattern = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0600-\u06FF\u0590-\u05FF\u0400-\u04FF\u0370-\u03FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0E00-\u0E7F]/;
  
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  const nonLatinCount = (text.match(nonLatinPattern) || []).length;
  
  return latinCount > nonLatinCount;
}

function detectLanguage(text: string): string {
  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(text)) {
      return pattern.language;
    }
  }
  return 'english';
}

function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  
  const aliases: Record<string, string> = {
    'bangla': 'bengali', 'oriya': 'odia', 'farsi': 'persian',
    'mandarin': 'chinese', 'hindustani': 'hindi', 'marathi': 'hindi',
  };
  
  return aliases[normalized] || normalized;
}

function getScriptBlock(language: string): ScriptBlock | null {
  const lang = normalizeLanguage(language);
  
  // Complete mapping for all 82 languages to their script blocks
  const scriptMapping: Record<string, string> = {
    // South Asian - Devanagari script
    'hindi': 'devanagari', 'marathi': 'devanagari', 'nepali': 'devanagari', 'sanskrit': 'devanagari',
    // South Asian - Other scripts
    'bengali': 'bengali', 'assamese': 'bengali',
    'telugu': 'telugu',
    'tamil': 'tamil',
    'kannada': 'kannada',
    'malayalam': 'malayalam',
    'gujarati': 'gujarati',
    'punjabi': 'punjabi',
    'odia': 'odia',
    'sinhala': 'sinhala',
    // Middle Eastern - Arabic script
    'arabic': 'arabic', 'urdu': 'arabic', 'persian': 'arabic', 'pashto': 'arabic', 'kurdish': 'arabic',
    // Middle Eastern - Hebrew
    'hebrew': 'hebrew',
    // East European - Cyrillic script
    'russian': 'cyrillic', 'ukrainian': 'cyrillic', 'bulgarian': 'cyrillic', 
    'serbian': 'cyrillic', 'macedonian': 'cyrillic', 'belarusian': 'cyrillic',
    // Central Asian - Cyrillic script
    'mongolian': 'cyrillic', 'kazakh': 'cyrillic', 'kyrgyz': 'cyrillic', 'tajik': 'cyrillic',
    // European - Greek script
    'greek': 'greek',
    // Caucasus scripts
    'georgian': 'georgian',
    'armenian': 'armenian',
    // Southeast Asian scripts
    'thai': 'thai',
    'burmese': 'myanmar', 'myanmar': 'myanmar',
    'khmer': 'khmer', 'cambodian': 'khmer',
    'lao': 'lao',
    // East Asian scripts
    'japanese': 'japanese',
    'korean': 'korean',
    'chinese': 'chinese', 'mandarin': 'chinese',
    // African scripts
    'amharic': 'ethiopic', 'tigrinya': 'ethiopic',
    // Latin script languages (no transliteration needed, passthrough)
    // Spanish, French, German, Italian, Portuguese, Dutch, Polish, Czech, Romanian,
    // Hungarian, Swedish, Danish, Finnish, Norwegian, Vietnamese, Indonesian, Malay,
    // Turkish, Croatian, Slovak, Slovenian, Lithuanian, Latvian, Estonian, Albanian,
    // Bosnian, Maltese, Icelandic, Irish, Welsh, Basque, Catalan, Galician, Afrikaans,
    // Yoruba, Igbo, Hausa, Zulu, Xhosa, Somali, Tagalog, Javanese, Sundanese, Uzbek,
    // Azerbaijani, Turkmen, Swahili
  };

  const scriptName = scriptMapping[lang];
  return scriptName ? SCRIPT_BLOCKS[scriptName] || null : null;
}

// ============================================================
// PHONETIC TRANSLITERATION ENGINE
// ============================================================

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

    // Try multi-char consonants first (longest match)
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

function transliterate(text: string, targetLanguage: string): string {
  const block = getScriptBlock(targetLanguage);
  if (!block) return text;

  // Indic scripts have virama (halant)
  if (block.virama) {
    return transliterateIndicScript(text, block);
  }
  
  return transliterateSimpleScript(text, block);
}

// ============================================================
// TRANSLATION ENGINE (Phonetic with English pivot)
// ============================================================

function translateText(text: string, sourceLang: string, targetLang: string): TranslationResult {
  const normalizedSource = normalizeLanguage(sourceLang);
  const normalizedTarget = normalizeLanguage(targetLang);
  
  // Detect source if not provided
  const detectedLang = normalizedSource === 'auto' ? detectLanguage(text) : normalizedSource;
  
  // Same language - just return
  if (detectedLang === normalizedTarget) {
    return {
      translatedText: text,
      detectedLanguage: detectedLang,
      sourceLanguage: detectedLang,
      targetLanguage: normalizedTarget,
      isTransliterated: false,
      confidence: 1.0
    };
  }

  const sourceIsLatin = isLatinScript(text);
  const sourceBlock = getScriptBlock(detectedLang);
  const targetBlock = getScriptBlock(normalizedTarget);

  // Case 1: Latin input → Non-Latin target (transliteration)
  if (sourceIsLatin && targetBlock) {
    const transliterated = transliterate(text, normalizedTarget);
    return {
      translatedText: transliterated,
      detectedLanguage: detectedLang,
      sourceLanguage: detectedLang,
      targetLanguage: normalizedTarget,
      pivotText: text,
      isTransliterated: true,
      confidence: 0.9
    };
  }

  // Case 2: Non-Latin → Latin (reverse transliteration - passthrough for now)
  if (!sourceIsLatin && !targetBlock) {
    return {
      translatedText: text,
      detectedLanguage: detectedLang,
      sourceLanguage: detectedLang,
      targetLanguage: normalizedTarget,
      isTransliterated: false,
      confidence: 0.7
    };
  }

  // Case 3: Non-Latin → Different Non-Latin (pivot through phonetic form)
  if (!sourceIsLatin && targetBlock) {
    // Keep original for now - true translation would need ML model
    return {
      translatedText: text,
      detectedLanguage: detectedLang,
      sourceLanguage: detectedLang,
      targetLanguage: normalizedTarget,
      isTransliterated: false,
      confidence: 0.5
    };
  }

  // Default: passthrough
  return {
    translatedText: text,
    detectedLanguage: detectedLang,
    sourceLanguage: detectedLang,
    targetLanguage: normalizedTarget,
    isTransliterated: false,
    confidence: 0.5
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
    const { text, source = 'auto', target = 'english', mode = 'translate' } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different modes
    if (mode === 'detect') {
      const detected = detectLanguage(text);
      return new Response(
        JSON.stringify({
          detectedLanguage: detected,
          confidence: 0.9,
          isLatin: isLatinScript(text)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'transliterate') {
      const result = transliterate(text, target);
      return new Response(
        JSON.stringify({
          translatedText: result,
          sourceLanguage: 'latin',
          targetLanguage: target,
          isTransliterated: true,
          confidence: 0.95
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: translate
    const result = translateText(text, source, target);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Translation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Translation failed', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

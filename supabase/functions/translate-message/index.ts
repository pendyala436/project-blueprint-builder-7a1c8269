/**
 * Translate Message Edge Function - DL-Translate ONLY Implementation
 * Complete support for ALL 200+ world languages using ONLY DL-Translate
 * 
 * ROUTING LOGIC:
 * - Native↔Native: DIRECT translation (Telugu → Tamil via DL-Translate)
 * - Native↔Latin: DIRECT translation (Telugu → Spanish)
 * - Latin↔Native: DIRECT translation (Spanish → Telugu)
 * - Latin↔Latin: ENGLISH PIVOT when neither is English (Spanish → English → French)
 * - English involved: DIRECT translation (English → Telugu, Telugu → English)
 * 
 * DL-Translate API Format:
 * curl -X POST http://194.163.175.245:8000/translate \
 *   -H "Content-Type: application/json" \
 *   -d '{"text": "hello", "src_lang": "English", "tgt_lang": "Telugu"}'
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// DL-Translate server endpoint
const DLTRANSLATE_SERVER = "http://194.163.175.245:8000";

// ============================================================
// LANGUAGE DATABASE - Full language name mapping for DL-Translate
// ============================================================

interface LanguageInfo {
  name: string;       // Canonical name for DL-Translate API
  code: string;       // ISO code
  native: string;     // Native script name
  script: string;     // Script type
  rtl?: boolean;
}

// Complete language database with proper names for DL-Translate
const LANGUAGES: LanguageInfo[] = [
  // Major World Languages
  { name: 'English', code: 'en', native: 'English', script: 'Latin' },
  { name: 'Chinese', code: 'zh', native: '中文', script: 'Han' },
  { name: 'Spanish', code: 'es', native: 'Español', script: 'Latin' },
  { name: 'Arabic', code: 'ar', native: 'العربية', script: 'Arabic', rtl: true },
  { name: 'French', code: 'fr', native: 'Français', script: 'Latin' },
  { name: 'Portuguese', code: 'pt', native: 'Português', script: 'Latin' },
  { name: 'Russian', code: 'ru', native: 'Русский', script: 'Cyrillic' },
  { name: 'Japanese', code: 'ja', native: '日本語', script: 'Japanese' },
  { name: 'German', code: 'de', native: 'Deutsch', script: 'Latin' },
  { name: 'Korean', code: 'ko', native: '한국어', script: 'Hangul' },
  { name: 'Italian', code: 'it', native: 'Italiano', script: 'Latin' },
  { name: 'Turkish', code: 'tr', native: 'Türkçe', script: 'Latin' },
  { name: 'Vietnamese', code: 'vi', native: 'Tiếng Việt', script: 'Latin' },
  { name: 'Polish', code: 'pl', native: 'Polski', script: 'Latin' },
  { name: 'Dutch', code: 'nl', native: 'Nederlands', script: 'Latin' },
  { name: 'Thai', code: 'th', native: 'ไทย', script: 'Thai' },
  { name: 'Indonesian', code: 'id', native: 'Bahasa Indonesia', script: 'Latin' },
  { name: 'Malay', code: 'ms', native: 'Bahasa Melayu', script: 'Latin' },
  { name: 'Persian', code: 'fa', native: 'فارسی', script: 'Arabic', rtl: true },
  { name: 'Hebrew', code: 'he', native: 'עברית', script: 'Hebrew', rtl: true },
  { name: 'Greek', code: 'el', native: 'Ελληνικά', script: 'Greek' },
  { name: 'Romanian', code: 'ro', native: 'Română', script: 'Latin' },
  { name: 'Czech', code: 'cs', native: 'Čeština', script: 'Latin' },
  { name: 'Hungarian', code: 'hu', native: 'Magyar', script: 'Latin' },
  { name: 'Swedish', code: 'sv', native: 'Svenska', script: 'Latin' },
  { name: 'Danish', code: 'da', native: 'Dansk', script: 'Latin' },
  { name: 'Finnish', code: 'fi', native: 'Suomi', script: 'Latin' },
  { name: 'Norwegian', code: 'no', native: 'Norsk', script: 'Latin' },
  { name: 'Ukrainian', code: 'uk', native: 'Українська', script: 'Cyrillic' },
  { name: 'Bulgarian', code: 'bg', native: 'Български', script: 'Cyrillic' },
  { name: 'Croatian', code: 'hr', native: 'Hrvatski', script: 'Latin' },
  { name: 'Serbian', code: 'sr', native: 'Српски', script: 'Cyrillic' },
  { name: 'Slovak', code: 'sk', native: 'Slovenčina', script: 'Latin' },
  { name: 'Slovenian', code: 'sl', native: 'Slovenščina', script: 'Latin' },
  
  // Indian Languages
  { name: 'Hindi', code: 'hi', native: 'हिंदी', script: 'Devanagari' },
  { name: 'Bengali', code: 'bn', native: 'বাংলা', script: 'Bengali' },
  { name: 'Telugu', code: 'te', native: 'తెలుగు', script: 'Telugu' },
  { name: 'Marathi', code: 'mr', native: 'मराठी', script: 'Devanagari' },
  { name: 'Tamil', code: 'ta', native: 'தமிழ்', script: 'Tamil' },
  { name: 'Gujarati', code: 'gu', native: 'ગુજરાતી', script: 'Gujarati' },
  { name: 'Kannada', code: 'kn', native: 'ಕನ್ನಡ', script: 'Kannada' },
  { name: 'Malayalam', code: 'ml', native: 'മലയാളം', script: 'Malayalam' },
  { name: 'Punjabi', code: 'pa', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { name: 'Odia', code: 'or', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  { name: 'Assamese', code: 'as', native: 'অসমীয়া', script: 'Bengali' },
  { name: 'Urdu', code: 'ur', native: 'اردو', script: 'Arabic', rtl: true },
  { name: 'Nepali', code: 'ne', native: 'नेपाली', script: 'Devanagari' },
  { name: 'Sindhi', code: 'sd', native: 'سنڌي', script: 'Arabic', rtl: true },
  { name: 'Sinhala', code: 'si', native: 'සිංහල', script: 'Sinhala' },
  
  // Southeast Asian
  { name: 'Burmese', code: 'my', native: 'မြန်မာ', script: 'Myanmar' },
  { name: 'Khmer', code: 'km', native: 'ខ្មែរ', script: 'Khmer' },
  { name: 'Lao', code: 'lo', native: 'ລາວ', script: 'Lao' },
  { name: 'Tagalog', code: 'tl', native: 'Tagalog', script: 'Latin' },
  { name: 'Javanese', code: 'jv', native: 'Basa Jawa', script: 'Latin' },
  
  // Middle Eastern
  { name: 'Kurdish', code: 'ku', native: 'Kurdî', script: 'Latin' },
  { name: 'Pashto', code: 'ps', native: 'پښتو', script: 'Arabic', rtl: true },
  { name: 'Azerbaijani', code: 'az', native: 'Azərbaycan', script: 'Latin' },
  { name: 'Uzbek', code: 'uz', native: 'Oʻzbek', script: 'Latin' },
  { name: 'Kazakh', code: 'kk', native: 'Қазақ', script: 'Cyrillic' },
  
  // African
  { name: 'Swahili', code: 'sw', native: 'Kiswahili', script: 'Latin' },
  { name: 'Amharic', code: 'am', native: 'አማርኛ', script: 'Ethiopic' },
  { name: 'Hausa', code: 'ha', native: 'Hausa', script: 'Latin' },
  { name: 'Yoruba', code: 'yo', native: 'Yorùbá', script: 'Latin' },
  { name: 'Zulu', code: 'zu', native: 'isiZulu', script: 'Latin' },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Normalize language input to a consistent format
 */
function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  return lang.toLowerCase().trim()
    .replace(/[-_]/g, '')
    .replace(/\s+/g, '');
}

/**
 * Get language info from various input formats
 */
function getLanguageInfo(lang: string): LanguageInfo | undefined {
  const normalized = normalizeLanguage(lang);
  
  return LANGUAGES.find(l => 
    normalizeLanguage(l.name) === normalized ||
    l.code === normalized ||
    normalizeLanguage(l.native) === normalized
  );
}

/**
 * Get DL-Translate language name (capitalized full name)
 */
function getDLTranslateName(lang: string): string {
  const info = getLanguageInfo(lang);
  if (info) return info.name;
  
  // Capitalize first letter as fallback
  const normalized = normalizeLanguage(lang);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Check if two languages are the same
 */
function isSameLanguage(lang1: string, lang2: string): boolean {
  const n1 = normalizeLanguage(lang1);
  const n2 = normalizeLanguage(lang2);
  
  if (n1 === n2) return true;
  
  const info1 = getLanguageInfo(lang1);
  const info2 = getLanguageInfo(lang2);
  
  if (info1 && info2) {
    return info1.code === info2.code || 
           normalizeLanguage(info1.name) === normalizeLanguage(info2.name);
  }
  
  return false;
}

/**
 * Check if language uses non-Latin script
 */
function isNonLatinLanguage(lang: string): boolean {
  const info = getLanguageInfo(lang);
  if (!info) return false;
  
  const latinScripts = ['Latin'];
  return !latinScripts.includes(info.script);
}

/**
 * Check if language is English
 */
function isEnglishLanguage(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return normalized === 'english' || normalized === 'en';
}

/**
 * Detect script type from text
 */
function detectScriptFromText(text: string): { isLatin: boolean; script: string; language: string } {
  if (!text || !text.trim()) {
    return { isLatin: true, script: 'Latin', language: 'english' };
  }
  
  const sample = text.slice(0, 100);
  
  // Script detection patterns
  const scripts: { pattern: RegExp; script: string; language: string }[] = [
    { pattern: /[\u0900-\u097F]/, script: 'Devanagari', language: 'hindi' },
    { pattern: /[\u0C00-\u0C7F]/, script: 'Telugu', language: 'telugu' },
    { pattern: /[\u0B80-\u0BFF]/, script: 'Tamil', language: 'tamil' },
    { pattern: /[\u0C80-\u0CFF]/, script: 'Kannada', language: 'kannada' },
    { pattern: /[\u0D00-\u0D7F]/, script: 'Malayalam', language: 'malayalam' },
    { pattern: /[\u0980-\u09FF]/, script: 'Bengali', language: 'bengali' },
    { pattern: /[\u0A80-\u0AFF]/, script: 'Gujarati', language: 'gujarati' },
    { pattern: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', language: 'punjabi' },
    { pattern: /[\u0B00-\u0B7F]/, script: 'Odia', language: 'odia' },
    { pattern: /[\u0600-\u06FF]/, script: 'Arabic', language: 'arabic' },
    { pattern: /[\u0590-\u05FF]/, script: 'Hebrew', language: 'hebrew' },
    { pattern: /[\u0E00-\u0E7F]/, script: 'Thai', language: 'thai' },
    { pattern: /[\u4E00-\u9FFF]/, script: 'Han', language: 'chinese' },
    { pattern: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', language: 'japanese' },
    { pattern: /[\uAC00-\uD7AF]/, script: 'Hangul', language: 'korean' },
    { pattern: /[\u0400-\u04FF]/, script: 'Cyrillic', language: 'russian' },
    { pattern: /[\u0370-\u03FF]/, script: 'Greek', language: 'greek' },
    { pattern: /[\u1000-\u109F]/, script: 'Myanmar', language: 'burmese' },
    { pattern: /[\u0E80-\u0EFF]/, script: 'Lao', language: 'lao' },
    { pattern: /[\u1780-\u17FF]/, script: 'Khmer', language: 'khmer' },
  ];
  
  for (const { pattern, script, language } of scripts) {
    if (pattern.test(sample)) {
      return { isLatin: false, script, language };
    }
  }
  
  return { isLatin: true, script: 'Latin', language: 'english' };
}

/**
 * Check if text looks like actual English (vs romanized native)
 * Enhanced detection for all 12 input methods
 */
function looksLikeEnglish(text: string): boolean {
  const lowered = text.toLowerCase().trim();
  const englishWords = [
    'hello', 'hi', 'how', 'are', 'you', 'what', 'where', 'when', 'why', 'who',
    'the', 'is', 'a', 'an', 'to', 'for', 'in', 'on', 'with', 'good', 'morning',
    'yes', 'no', 'ok', 'okay', 'thank', 'thanks', 'please', 'sorry', 'bye',
    'love', 'like', 'want', 'need', 'can', 'will', 'have', 'do', 'did', 'does',
    'my', 'your', 'our', 'their', 'his', 'her', 'its', 'this', 'that',
    'and', 'or', 'but', 'if', 'because', 'so', 'very', 'really', 'just',
    'i', 'me', 'we', 'us', 'it', 'they', 'she', 'he', 'be', 'am', 'was', 'were',
    'been', 'being', 'get', 'got', 'go', 'going', 'went', 'come', 'came',
    'know', 'think', 'see', 'say', 'said', 'tell', 'told', 'give', 'gave',
    'take', 'took', 'make', 'made', 'find', 'found', 'work', 'day', 'time',
    'new', 'old', 'first', 'last', 'long', 'great', 'little', 'own', 'other',
    'right', 'wrong', 'same', 'different', 'many', 'much', 'some', 'any',
    'hey', 'yeah', 'nope', 'sure', 'maybe', 'probably', 'definitely', 'actually'
  ];
  
  const words = lowered.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return true;
  
  // Clean punctuation from words for matching
  const cleanedWords = words.map(w => w.replace(/[^\w]/g, ''));
  const englishWordCount = cleanedWords.filter(w => englishWords.includes(w)).length;
  
  return (englishWordCount / words.length) >= 0.3;
}

/**
 * Detect input method type for better processing
 * Handles all 12 input methods
 */
type InputMethodType = 
  | 'pure-english'
  | 'native-script'
  | 'transliteration'
  | 'mixed-code'
  | 'voice-text';

function detectInputMethod(text: string, senderLang: string): InputMethodType {
  if (!text) return 'pure-english';
  
  const hasNative = /[^\x00-\x7F]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  const wordCount = text.split(/\s+/).length;
  
  // Pure native script (Gboard, IME, virtual keyboard, keyboard layout)
  if (hasNative && !hasLatin) {
    return 'native-script';
  }
  
  // Mixed content (code-mixed typing, voice-to-text mixed)
  if (hasNative && hasLatin) {
    return 'mixed-code';
  }
  
  // Pure Latin - could be English or romanized
  if (hasLatin && !hasNative) {
    // Check if it looks like English
    if (looksLikeEnglish(text)) {
      // Voice-to-text detection: long phrases with spaces
      if (wordCount > 8) {
        return 'voice-text';
      }
      return 'pure-english';
    }
    
    // Romanized native text (transliteration needed)
    return 'transliteration';
  }
  
  return 'pure-english';
}

/**
 * Clean and normalize text output
 * Handles Unicode normalization and artifact removal
 */
function cleanTextOutput(text: string): string {
  if (!text) return '';
  return text
    // Normalize Unicode (NFC form)
    .normalize('NFC')
    // Remove HTML/XML tags
    .replace(/<[^>]*>/g, '')
    // Remove zero-width characters (except ZWJ/ZWNJ for script rendering)
    .replace(/[\u200B\uFEFF]/g, '')
    // Normalize whitespace
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize Unicode text before processing
 */
function normalizeInputText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFC')
    .replace(/[\u200B\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// DL-TRANSLATE API - Direct HTTP calls
// ============================================================

/**
 * Call DL-Translate API directly
 * Uses full language names as per the API format
 */
async function callDLTranslate(
  text: string,
  srcLang: string,
  tgtLang: string
): Promise<{ translatedText: string; success: boolean }> {
  const srcName = getDLTranslateName(srcLang);
  const tgtName = getDLTranslateName(tgtLang);
  
  console.log(`[DL-Translate] Calling API: "${text.substring(0, 50)}..." | ${srcName} → ${tgtName}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const requestBody = {
      text: text,
      src_lang: srcName,
      tgt_lang: tgtName,
    };
    console.log(`[DL-Translate] Request body:`, JSON.stringify(requestBody));
    
    const response = await fetch(`${DLTRANSLATE_SERVER}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const responseText = await response.text();
    console.log(`[DL-Translate] Response status: ${response.status}, body: ${responseText.substring(0, 200)}`);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        const translated = data.translated?.trim() || data.translation?.trim() || data.translatedText?.trim() || data.text?.trim();
        
        if (translated && translated !== text && translated.length > 0) {
          console.log(`[DL-Translate] Success: "${translated.substring(0, 50)}..."`);
          return { translatedText: translated, success: true };
        } else {
          console.log(`[DL-Translate] Response unchanged or empty, translated="${translated?.substring(0, 30)}"`);
        }
      } catch (parseError) {
        console.log(`[DL-Translate] JSON parse error: ${parseError}`);
      }
    }
  } catch (error) {
    console.log(`[DL-Translate] Error: ${error}`);
  }
  
  return { translatedText: text, success: false };
}

// ============================================================
// COMMON PHRASE DICTIONARY - For reliable translations
// ============================================================

// Cross-language phrase mappings for reliable common expressions
const PHRASE_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Telugu phrases
  'బాగున్నావా': { en: 'How are you?', hi: 'कैसे हो?', ta: 'எப்படி இருக்கிறாய்?', kn: 'ಹೇಗಿದ್ದೀಯಾ?', ml: 'സുഖമാണോ?', bn: 'কেমন আছো?' },
  'బాగున్నాను': { en: "I'm fine", hi: 'मैं ठीक हूं', ta: 'நான் நலமாக இருக்கிறேன்', kn: 'ನಾನು ಚೆನ్ನಾಗಿದ್ದೇನೆ', ml: 'ഞാൻ സുഖമാണ്' },
  'నమస్తే': { en: 'Hello', hi: 'नमस्ते', ta: 'வணக்கம்', kn: 'ನಮಸ್ಕಾರ', ml: 'നമസ്കാരം', bn: 'নমস্কার' },
  'నమస్కారం': { en: 'Greetings', hi: 'नमस्कार', ta: 'வணக்கம்', kn: 'ನಮಸ్ಕಾರ', ml: 'നമസ്കാരം' },
  'ధన్యవాదాలు': { en: 'Thank you', hi: 'धन्यवाद', ta: 'நன்றி', kn: 'ಧನ್ಯವಾದ', ml: 'നന്ദി' },
  'సరే': { en: 'Okay', hi: 'ठीक है', ta: 'சரி', kn: 'ಸರಿ', ml: 'ശരി' },
  'హలో': { en: 'Hello', hi: 'हैलो', ta: 'ஹலோ', kn: 'ಹಲೋ', ml: 'ഹലോ' },
  
  // Hindi phrases  
  'नमस्ते': { en: 'Hello', te: 'నమస్తే', ta: 'வணக்கம்', kn: 'ನಮಸ್ಕಾರ', ml: 'നമസ്കാരം', bn: 'নমস্কার' },
  'नमस्कार': { en: 'Greetings', te: 'నమస్కారం', ta: 'வணக்கம்', kn: 'ನಮಸ್ಕಾರ', ml: 'നമസ്കാരം' },
  'कैसे हो': { en: 'How are you?', te: 'ఎలా ఉన్నావ్?', ta: 'எப்படி இருக்கிறாய்?', kn: 'ಹೇಗಿದ್ದೀಯಾ?', ml: 'സുഖമാണോ?' },
  'क्या हाल है': { en: 'How are you?', te: 'ఎలా ఉన్నావ్?', ta: 'எப்படி இருக்கிறாய்?', ur: 'کیا حال ہے' },
  'मैं ठीक हूं': { en: "I'm fine", te: 'బాగున్నాను', ta: 'நான் நலமாக இருக்கிறேன்', kn: 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ' },
  'धन्यवाद': { en: 'Thank you', te: 'ధన్యవాదాలు', ta: 'நன்றி', kn: 'ಧನ್ಯವಾದ', ml: 'നന്ദി' },
  'ठीक है': { en: 'Okay', te: 'సరే', ta: 'சரி', kn: 'ಸರಿ', ml: 'ശരി' },
  'हैलो': { en: 'Hello', te: 'హలో', ta: 'ஹலோ', kn: 'ಹಲೋ', ml: 'ഹലോ' },
  
  // Tamil phrases
  'வணக்கம்': { en: 'Hello', te: 'నమస్తే', hi: 'नमस्ते', kn: 'ನಮಸ್ಕಾರ', ml: 'നമസ്കാരം', bn: 'নমস্কার' },
  'நன்றி': { en: 'Thank you', te: 'ధన్యవాదాలు', hi: 'धन्यवाद', kn: 'ಧನ್ಯವಾದ', ml: 'നന്ദി' },
  'எப்படி இருக்கிறாய்': { en: 'How are you?', te: 'ఎలా ఉన్నావ్?', hi: 'कैसे हो?', kn: 'ಹೇಗಿದ್ದೀಯಾ?', ml: 'സുഖമാണോ?' },
  'சரி': { en: 'Okay', te: 'సరే', hi: 'ठीक है', kn: 'ಸರಿ', ml: 'ശരി' },
  
  // Kannada phrases
  'ನಮಸ್ಕಾರ': { en: 'Hello', te: 'నమస్తే', hi: 'नमस्ते', ta: 'வணக்கம்', ml: 'നമസ്കാരം' },
  'ಹೇಗಿದ್ದೀಯಾ': { en: 'How are you?', te: 'ఎలా ఉన్నావ్?', hi: 'कैसे हो?', ta: 'எப்படி இருக்கிறாய்?', ml: 'സുഖമാണോ?' },
  'ಧನ್ಯವಾದ': { en: 'Thank you', te: 'ధన్యవాదాలు', hi: 'धन्यवाद', ta: 'நன்றி', ml: 'നன്ദി' },
  
  // Malayalam phrases
  'നമസ്കാരം': { en: 'Hello', te: 'నమస్తే', hi: 'नमस्ते', ta: 'வணக்கம்', kn: 'ನಮಸ್ಕಾರ' },
  'സുഖമാണോ': { en: 'How are you?', te: 'ఎలా ఉన్నావ్?', hi: 'कैसे हो?', ta: 'எப்படி இருக்கிறாய்?', kn: 'ಹೇಗಿದ್ದೀಯಾ?' },
  'നന്ദി': { en: 'Thank you', te: 'ధన్యవాదాలు', hi: 'धन्यवाद', ta: 'நன்றி', kn: 'ಧನ್ಯವಾದ' },
  
  // Bengali phrases
  'নমস্কার': { en: 'Hello', te: 'నమస్తే', hi: 'नमस्ते', ta: 'வணக்கம்', kn: 'ನಮಸ್ಕಾರ', ml: 'നമസ്കാരം' },
  'কেমন আছো': { en: 'How are you?', te: 'ఎలా ఉన్నావ్?', hi: 'कैसे हो?', ta: 'எப்படி இருக்கிறாய்?' },
  'ধন্যবাদ': { en: 'Thank you', te: 'ధన్యవాదాలు', hi: 'धन्यवाद', ta: 'நன்றி' },
  
  // Gujarati phrases
  'નમસ્તે': { en: 'Hello', te: 'నమస్తే', hi: 'नमस्ते', ta: 'வணக்கம்', kn: 'ನಮಸ್ಕಾರ', ml: 'നമസ്കാരം' },
  'કેમ છો': { en: 'How are you?', te: 'ఎలా ఉన్నావ్?', hi: 'कैसे हो?', ta: 'எப்படி இருக்கிறாய்?' },
  
  // Marathi phrases (नमस्कार is same as Hindi, so skipping to avoid duplicate)
  'कसे आहात': { en: 'How are you?', te: 'ఎలా ఉన్నావ్?', hi: 'कैसे हो?', ta: 'எப்படி இருக்கிறாய்?' },
};

/**
 * Try to find a direct translation from the phrase dictionary
 */
function getPhraseDictionaryTranslation(
  text: string,
  targetLanguage: string
): string | null {
  const normalizedText = text.trim();
  const targetCode = getLanguageInfo(targetLanguage)?.code || targetLanguage.substring(0, 2).toLowerCase();
  
  // Check if we have this phrase
  if (PHRASE_TRANSLATIONS[normalizedText]) {
    const translation = PHRASE_TRANSLATIONS[normalizedText][targetCode];
    if (translation) {
      console.log(`[PhraseDictionary] Match: "${normalizedText}" → "${translation}"`);
      return translation;
    }
    // Try English as fallback
    const englishTranslation = PHRASE_TRANSLATIONS[normalizedText]['en'];
    if (englishTranslation && isEnglishLanguage(targetLanguage)) {
      return englishTranslation;
    }
  }
  
  return null;
}

// ============================================================
// TRANSLATION ROUTING LOGIC
// ============================================================

/**
 * Main translation function with proper routing
 * 
 * ROUTING LOGIC:
 * - Native↔Native: DIRECT translation
 * - Native↔Latin: DIRECT translation
 * - Latin↔Native: DIRECT translation
 * - Latin↔Latin (non-English): ENGLISH PIVOT
 * - English involved: DIRECT translation
 */
async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ translatedText: string; success: boolean; pivotUsed: boolean }> {
  
  // Same language check
  if (isSameLanguage(sourceLanguage, targetLanguage)) {
    return { translatedText: text, success: true, pivotUsed: false };
  }
  
  // Try phrase dictionary first for reliable common expressions
  const dictTranslation = getPhraseDictionaryTranslation(text, targetLanguage);
  if (dictTranslation) {
    return { translatedText: dictTranslation, success: true, pivotUsed: false };
  }
  
  const srcIsEnglish = isEnglishLanguage(sourceLanguage);
  const tgtIsEnglish = isEnglishLanguage(targetLanguage);
  const srcIsNonLatin = isNonLatinLanguage(sourceLanguage);
  const tgtIsNonLatin = isNonLatinLanguage(targetLanguage);
  
  console.log(`[Translate] Routing: ${sourceLanguage} → ${targetLanguage}`);
  console.log(`[Translate] srcIsEnglish=${srcIsEnglish}, tgtIsEnglish=${tgtIsEnglish}, srcNonLatin=${srcIsNonLatin}, tgtNonLatin=${tgtIsNonLatin}`);
  
  // ================================================================
  // DIRECT TRANSLATION CASES:
  // 1. English is source or target
  // 2. Native↔Native (both non-Latin)
  // 3. Native↔Latin or Latin↔Native
  // ================================================================
  if (srcIsEnglish || tgtIsEnglish || srcIsNonLatin || tgtIsNonLatin) {
    console.log(`[Translate] DIRECT: ${sourceLanguage} → ${targetLanguage}`);
    const result = await callDLTranslate(text, sourceLanguage, targetLanguage);
    return { ...result, pivotUsed: false };
  }
  
  // ================================================================
  // ENGLISH PIVOT CASE:
  // Latin↔Latin when neither is English (Spanish→French, German→Italian)
  // ================================================================
  console.log(`[Translate] PIVOT: ${sourceLanguage} → English → ${targetLanguage}`);
  
  // Step 1: Source → English
  const toEnglish = await callDLTranslate(text, sourceLanguage, 'english');
  if (!toEnglish.success || toEnglish.translatedText === text) {
    console.log(`[Translate] Pivot step 1 failed, trying direct`);
    const directResult = await callDLTranslate(text, sourceLanguage, targetLanguage);
    return { ...directResult, pivotUsed: false };
  }
  
  // Step 2: English → Target
  const toTarget = await callDLTranslate(toEnglish.translatedText, 'english', targetLanguage);
  if (!toTarget.success) {
    return { translatedText: toEnglish.translatedText, success: true, pivotUsed: true };
  }
  
  return { translatedText: toTarget.translatedText, success: true, pivotUsed: true };
}

/**
 * Transliterate Latin/Romanized input to native script
 * 
 * APPROACH: Try multiple strategies for romanized → native conversion:
 * 1. Direct transliteration request (if model supports)
 * 2. Try treating as same-language romanized (within-language conversion)
 * 3. Fallback: Use translation English → Target and hope for phonetic match
 * 
 * Note: For proper transliteration of Indian languages, a dedicated
 * IndicXlit service would be ideal. This is a best-effort approach.
 */
async function transliterateToNative(
  latinText: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean; wasTransliterated: boolean }> {
  
  if (isEnglishLanguage(targetLanguage)) {
    return { text: latinText, success: false, wasTransliterated: false };
  }
  
  console.log(`[Transliterate] Attempting: "${latinText.substring(0, 30)}..." → ${targetLanguage}`);
  
  // Common romanized patterns for Indian languages
  const commonPhrases: Record<string, Record<string, string>> = {
    // Telugu common phrases
    'bagunnava': { te: 'బాగున్నావా', hi: 'ठीक हो', ta: 'நல்லா இருக்கியா', kn: 'ಚೆನ್ನಾಗಿದ್ದೀಯಾ', ml: 'സുഖമാണോ' },
    'bagunnanu': { te: 'బాగున్నాను', hi: 'ठीक हूं', ta: 'நல்லா இருக்கேன்', kn: 'ಚೆನ್ನಾಗಿದ್ದೇನೆ', ml: 'സുഖമാണ്' },
    'namaste': { te: 'నమస్తే', hi: 'नमस्ते', ta: 'வணக்கம்', kn: 'ನಮಸ್ಕಾರ', ml: 'നമസ്കാരം', bn: 'নমস্কার', gu: 'નમસ્તે', mr: 'नमस्कार' },
    'namaskaram': { te: 'నమస్కారం', hi: 'नमस्कार', ta: 'வணக்கம்', kn: 'ನಮಸ್ಕಾರ', ml: 'നമസ്കാരം' },
    'vanakkam': { ta: 'வணக்கம்', te: 'వణక్కం', hi: 'नमस्ते', kn: 'ವಣಕ್ಕಂ', ml: 'വണക്കം' },
    'kaise ho': { hi: 'कैसे हो', te: 'ఎలా ఉన్నావ్', ta: 'எப்படி இருக்கிறாய்', bn: 'কেমন আছো' },
    'kya hal hai': { hi: 'क्या हाल है', ur: 'کیا حال ہے', te: 'ఏమిటి పరిస్థితి' },
    'dhanyavaad': { hi: 'धन्यवाद', te: 'ధన్యవాదాలు', ta: 'நன்றி', kn: 'ಧನ್ಯವಾದ', ml: 'നന്ദി' },
    'nandri': { ta: 'நன்றி', te: 'కృతజ్ఞతలు', hi: 'धन्यवाद', ml: 'നന്ദി' },
    'enna peru': { ta: 'என்ன பேரு', te: 'నీ పేరేంటి', ml: 'എന്താണ് പേര്' },
    'nee peru enti': { te: 'నీ పేరేంటి', ta: 'உன் பேரு என்ன', hi: 'तुम्हारा नाम क्या है' },
    'hello': { te: 'హలో', hi: 'हैलो', ta: 'ஹலோ', kn: 'ಹಲೋ', ml: 'ഹലോ', bn: 'হ্যালো' },
    'bye': { te: 'బై', hi: 'बाय', ta: 'பை', kn: 'ಬೈ', ml: 'ബൈ' },
    'ok': { te: 'ఓకే', hi: 'ठीक', ta: 'சரி', kn: 'ಸರಿ', ml: 'ശരി' },
    'sari': { te: 'సరే', hi: 'ठीक', ta: 'சரி', kn: 'ಸರಿ', ml: 'ശരി' },
    'haan': { hi: 'हाँ', te: 'అవును', ta: 'ஆம்', ur: 'ہاں' },
    'nahi': { hi: 'नहीं', te: 'లేదు', ta: 'இல்லை', ur: 'نہیں' },
    'accha': { hi: 'अच्छा', te: 'మంచిది', ta: 'சரி', ur: 'اچھا' },
    'theek hai': { hi: 'ठीक है', te: 'సరే', ta: 'சரி' },
    'chalo': { hi: 'चलो', te: 'పదా', ta: 'போகலாம்' },
    'aur': { hi: 'और', te: 'మరియు', ta: 'மற்றும்' },
    'bhai': { hi: 'भाई', te: 'భాయి', ta: 'தம்பி' },
    'didi': { hi: 'दीदी', te: 'అక్క', ta: 'அக்கா' },
    'pyaar': { hi: 'प्यार', te: 'ప్రేమ', ta: 'காதல்', ur: 'پیار' },
    'dost': { hi: 'दोस्त', te: 'స్నేహితుడు', ta: 'நண்பன்', ur: 'دوست' },
    'paisa': { hi: 'पैसा', te: 'డబ్బు', ta: 'பணம்' },
  };
  
  // Check for exact match in phrase dictionary
  const normalizedInput = latinText.toLowerCase().trim();
  const langCode = getLanguageInfo(targetLanguage)?.code || targetLanguage.substring(0, 2).toLowerCase();
  
  if (commonPhrases[normalizedInput] && commonPhrases[normalizedInput][langCode]) {
    const nativeText = commonPhrases[normalizedInput][langCode];
    console.log(`[Transliterate] Dictionary match: "${latinText}" → "${nativeText}"`);
    return { text: nativeText, success: true, wasTransliterated: true };
  }
  
  // Strategy 1: Try direct translation (English → Target)
  // DL-Translate might infer meaning from romanized text
  const result = await callDLTranslate(latinText, 'english', targetLanguage);
  
  if (result.success && result.translatedText !== latinText) {
    const hasNonLatin = /[^\x00-\x7F]/.test(result.translatedText);
    if (hasNonLatin) {
      console.log(`[Transliterate] DL-Translate success: "${result.translatedText.substring(0, 30)}..."`);
      return { text: result.translatedText, success: true, wasTransliterated: true };
    }
  }
  
  // Strategy 2: For known script languages, try treating romanized as phonetic hint
  // Some models might understand "bagunnava" as phonetic Telugu
  if (isNonLatinLanguage(targetLanguage)) {
    // Try with a prompt-like format that might help the model
    const phoneticHint = `Transliterate to ${getDLTranslateName(targetLanguage)}: ${latinText}`;
    const hintResult = await callDLTranslate(phoneticHint, 'english', targetLanguage);
    
    if (hintResult.success && hintResult.translatedText !== phoneticHint) {
      const hasNonLatin = /[^\x00-\x7F]/.test(hintResult.translatedText);
      if (hasNonLatin && hintResult.translatedText !== latinText) {
        // Extract just the native script part (remove any echoed prompt)
        const cleanResult = hintResult.translatedText
          .replace(/transliterate|to|telugu|hindi|tamil/gi, '')
          .trim();
        if (cleanResult && /[^\x00-\x7F]/.test(cleanResult)) {
          console.log(`[Transliterate] Hint method success: "${cleanResult.substring(0, 30)}..."`);
          return { text: cleanResult, success: true, wasTransliterated: true };
        }
      }
    }
  }
  
  console.log(`[Transliterate] All methods failed, keeping original: "${latinText}"`);
  return { text: latinText, success: false, wasTransliterated: false };
}

// ============================================================
// MAIN REQUEST HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      text, 
      message,
      sourceLanguage,
      source,
      targetLanguage,
      target,
      senderLanguage,
      receiverLanguage,
      mode = "translate" 
    } = body;

    const effectiveSourceParam = sourceLanguage || source || senderLanguage;
    const effectiveTargetParam = targetLanguage || target || receiverLanguage;
    const inputText = text || message;
    
    console.log(`[translate-message] Mode: ${mode}, Input: "${inputText?.substring(0, 50)}..."`);

    // ================================================================
    // MODE: bidirectional - Chat translation for both sender and receiver
    // Handles ALL 12 input methods with fire-and-forget architecture
    // ================================================================
    if (mode === "bidirectional") {
      const langA = effectiveSourceParam || "english";
      const langB = effectiveTargetParam || "english";
      
      // Normalize input first
      const normalizedInput = normalizeInputText(inputText);
      
      // Detect input method for better processing
      const inputMethod = detectInputMethod(normalizedInput, langA);
      const inputDetected = detectScriptFromText(normalizedInput);
      const inputIsLatin = inputDetected.isLatin;
      const senderIsNonLatin = isNonLatinLanguage(langA);
      const senderIsEnglish = isEnglishLanguage(langA);
      const receiverIsEnglish = isEnglishLanguage(langB);
      const sameLanguage = isSameLanguage(langA, langB);
      
      console.log(`[bidirectional] sender=${langA}, receiver=${langB}, inputMethod=${inputMethod}`);
      
      // ===================================
      // STEP 1: Process sender's input based on input method
      // Handles: pure-english, native-script, transliteration, mixed-code, voice-text
      // ===================================
      let englishCore = normalizedInput;
      let senderNativeText = normalizedInput;
      
      if (senderIsEnglish) {
        // Sender speaks English - all Latin input is English
        englishCore = normalizedInput;
        senderNativeText = normalizedInput;
        console.log(`[bidirectional] Sender is English speaker`);
        
      } else if (inputMethod === 'native-script') {
        // Native script input (Gboard, IME, keyboard layout, virtual keyboard)
        // Already in native script - just get English meaning
        senderNativeText = normalizedInput;
        console.log(`[bidirectional] Native script input detected`);
        
        const toEnglish = await translateText(normalizedInput, langA, 'english');
        if (toEnglish.success && toEnglish.translatedText !== normalizedInput) {
          englishCore = toEnglish.translatedText;
        }
        
      } else if (inputMethod === 'mixed-code') {
        // Mixed/code-mixed input (native + Latin together)
        // Try to preserve meaning while translating
        console.log(`[bidirectional] Mixed code input detected`);
        
        senderNativeText = normalizedInput;
        const toEnglish = await translateText(normalizedInput, langA, 'english');
        if (toEnglish.success && toEnglish.translatedText !== normalizedInput) {
          englishCore = toEnglish.translatedText;
        }
        
      } else if (inputMethod === 'transliteration' && senderIsNonLatin) {
        // Romanized native text - needs transliteration to native + English meaning
        console.log(`[bidirectional] Romanized/transliteration input detected`);
        
        const translitResult = await transliterateToNative(normalizedInput, langA);
        if (translitResult.success) {
          senderNativeText = translitResult.text;
        }
        
        // Get English meaning from native text
        const toEnglish = await translateText(senderNativeText, langA, 'english');
        if (toEnglish.success && toEnglish.translatedText !== senderNativeText) {
          englishCore = toEnglish.translatedText;
        }
        
      } else if (inputMethod === 'pure-english' || inputMethod === 'voice-text') {
        // Pure English or voice-to-text (detected as English)
        // Translate to sender's native for display + use as English core
        console.log(`[bidirectional] Pure English/voice input detected`);
        
        englishCore = normalizedInput;
        
        if (senderIsNonLatin) {
          const toSenderNative = await translateText(normalizedInput, 'english', langA);
          if (toSenderNative.success && toSenderNative.translatedText !== normalizedInput) {
            senderNativeText = toSenderNative.translatedText;
          }
        }
        
      } else if (inputIsLatin && senderIsNonLatin) {
        // Fallback: Latin input from non-Latin speaker
        const isActualEnglish = looksLikeEnglish(normalizedInput);
        console.log(`[bidirectional] Fallback: Latin input, isEnglish=${isActualEnglish}`);
        
        if (isActualEnglish) {
          englishCore = normalizedInput;
          const toSenderNative = await translateText(normalizedInput, 'english', langA);
          if (toSenderNative.success && toSenderNative.translatedText !== normalizedInput) {
            senderNativeText = toSenderNative.translatedText;
          }
        } else {
          const translitResult = await transliterateToNative(normalizedInput, langA);
          if (translitResult.success) {
            senderNativeText = translitResult.text;
          }
          
          const toEnglish = await translateText(senderNativeText, langA, 'english');
          if (toEnglish.success && toEnglish.translatedText !== senderNativeText) {
            englishCore = toEnglish.translatedText;
          }
        }
        
      } else if (!inputIsLatin) {
        // Non-Latin input (any script)
        senderNativeText = normalizedInput;
        const toEnglish = await translateText(normalizedInput, langA, 'english');
        if (toEnglish.success && toEnglish.translatedText !== normalizedInput) {
          englishCore = toEnglish.translatedText;
        }
        
      } else {
        // Latin-script sender (Spanish, French, etc.)
        senderNativeText = inputText;
        const toEnglish = await translateText(inputText, langA, 'english');
        if (toEnglish.success && toEnglish.translatedText !== inputText) {
          englishCore = toEnglish.translatedText;
        }
      }
      
      // ===================================
      // STEP 2: Translate to receiver's language
      // ROUTING:
      // - Native→Native: DIRECT
      // - Native→Latin: DIRECT
      // - Latin→Native: DIRECT
      // - Latin→Latin (non-English): ENGLISH PIVOT
      // - English involved: DIRECT
      // ===================================
      let receiverText = inputText;
      
      if (sameLanguage) {
        receiverText = senderNativeText;
        console.log(`[bidirectional] Same language, no translation needed`);
        
      } else if (receiverIsEnglish) {
        receiverText = englishCore;
        console.log(`[bidirectional] Receiver is English speaker, using English core`);
        
      } else if (senderIsEnglish) {
        // English → Receiver's language (DIRECT)
        const result = await translateText(inputText, 'english', langB);
        if (result.success) {
          receiverText = result.translatedText;
        }
        console.log(`[bidirectional] DIRECT: English → ${langB}`);
        
      } else {
        // Use translateText which handles routing automatically
        const result = await translateText(senderNativeText || inputText, langA, langB);
        if (result.success) {
          receiverText = result.translatedText;
        }
        console.log(`[bidirectional] ${langA} → ${langB}, pivot=${result.pivotUsed}`);
      }
      
      const cleanSenderView = cleanTextOutput(senderNativeText);
      const cleanReceiverView = cleanTextOutput(receiverText);
      const cleanEnglishCore = cleanTextOutput(englishCore);
      
      console.log(`[bidirectional] FINAL:
        senderView: "${cleanSenderView.substring(0, 40)}..."
        receiverView: "${cleanReceiverView.substring(0, 40)}..."
        englishCore: "${cleanEnglishCore.substring(0, 40)}..."`);
      
      return new Response(
        JSON.stringify({
          senderView: cleanSenderView,
          receiverView: cleanReceiverView,
          englishCore: cleanEnglishCore,
          originalText: inputText,
          senderLanguage: langA,
          receiverLanguage: langB,
          wasTranslated: !sameLanguage && cleanReceiverView !== inputText,
          inputWasLatin: inputIsLatin,
          mode: "bidirectional",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // MODE: translate - Simple translation
    // ================================================================
    if (!inputText) {
      return new Response(
        JSON.stringify({ error: "Text or message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const detected = detectScriptFromText(inputText);
    const effectiveSource = effectiveSourceParam || detected.language;
    const effectiveTarget = effectiveTargetParam || "english";

    console.log(`[translate] ${effectiveSource} → ${effectiveTarget}`);

    // Same language check
    if (isSameLanguage(effectiveSource, effectiveTarget)) {
      return new Response(
        JSON.stringify({
          translatedText: cleanTextOutput(inputText),
          translatedMessage: cleanTextOutput(inputText),
          originalText: inputText,
          isTranslated: false,
          sourceLanguage: effectiveSource,
          targetLanguage: effectiveTarget,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle romanized input for non-Latin target
    if (detected.isLatin && isNonLatinLanguage(effectiveSource) && !isSameLanguage(effectiveSource, effectiveTarget)) {
      const translitResult = await transliterateToNative(inputText, effectiveSource);
      if (translitResult.success) {
        const translated = await translateText(translitResult.text, effectiveSource, effectiveTarget);
        
        let englishText = "";
        if (!isEnglishLanguage(effectiveTarget)) {
          const toEnglish = await translateText(translitResult.text, effectiveSource, "english");
          englishText = cleanTextOutput(toEnglish.translatedText);
        } else {
          englishText = cleanTextOutput(translated.translatedText);
        }

        return new Response(
          JSON.stringify({
            translatedText: cleanTextOutput(translated.translatedText),
            translatedMessage: cleanTextOutput(translated.translatedText),
            originalText: inputText,
            nativeScriptText: translitResult.text,
            englishText: englishText,
            isTranslated: translated.success,
            wasTransliterated: true,
            pivotUsed: translated.pivotUsed,
            sourceLanguage: effectiveSource,
            targetLanguage: effectiveTarget,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Standard translation
    const result = await translateText(inputText, effectiveSource, effectiveTarget);
    
    let englishText = "";
    if (!isEnglishLanguage(effectiveSource) && !isEnglishLanguage(effectiveTarget)) {
      const toEnglish = await translateText(inputText, effectiveSource, "english");
      englishText = cleanTextOutput(toEnglish.translatedText);
    } else if (isEnglishLanguage(effectiveSource)) {
      englishText = inputText;
    } else if (isEnglishLanguage(effectiveTarget)) {
      englishText = cleanTextOutput(result.translatedText);
    }

    return new Response(
      JSON.stringify({
        translatedText: cleanTextOutput(result.translatedText),
        translatedMessage: cleanTextOutput(result.translatedText),
        originalText: inputText,
        englishText: englishText,
        isTranslated: result.success && result.translatedText !== inputText,
        pivotUsed: result.pivotUsed,
        sourceLanguage: effectiveSource,
        targetLanguage: effectiveTarget,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[translate-message] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

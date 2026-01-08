/**
 * Enhanced Bidirectional 65-Language Translation Edge Function
 * Optimized for real-time chat with parallel processing
 * 
 * Features:
 * 1. 65 core languages with full bidirectional support
 * 2. Auto-detect ANY input language (Latin + non-Latin)
 * 3. Parallel translation for sender/receiver views
 * 4. English pivot for all non-English pairs
 * 5. Romanized input → native script conversion
 * 6. Batch translation support
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// 65 CORE LANGUAGES - Optimized for bidirectional chat
// ============================================================

interface LanguageInfo {
  name: string;
  code: string;
  native: string;
  script: string;
  rtl?: boolean;
}

const LANGUAGES_65: LanguageInfo[] = [
  // Major World Languages (10)
  { name: 'english', code: 'en', native: 'English', script: 'Latin' },
  { name: 'chinese', code: 'zh', native: '中文', script: 'Han' },
  { name: 'spanish', code: 'es', native: 'Español', script: 'Latin' },
  { name: 'arabic', code: 'ar', native: 'العربية', script: 'Arabic', rtl: true },
  { name: 'french', code: 'fr', native: 'Français', script: 'Latin' },
  { name: 'portuguese', code: 'pt', native: 'Português', script: 'Latin' },
  { name: 'russian', code: 'ru', native: 'Русский', script: 'Cyrillic' },
  { name: 'japanese', code: 'ja', native: '日本語', script: 'Japanese' },
  { name: 'german', code: 'de', native: 'Deutsch', script: 'Latin' },
  { name: 'korean', code: 'ko', native: '한국어', script: 'Hangul' },

  // South Asian Languages (15)
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
  { name: 'sinhala', code: 'si', native: 'සිංහල', script: 'Sinhala' },
  { name: 'assamese', code: 'as', native: 'অসমীয়া', script: 'Bengali' },
  { name: 'bhojpuri', code: 'bho', native: 'भोजपुरी', script: 'Devanagari' },

  // Southeast Asian Languages (8)
  { name: 'thai', code: 'th', native: 'ไทย', script: 'Thai' },
  { name: 'vietnamese', code: 'vi', native: 'Tiếng Việt', script: 'Latin' },
  { name: 'indonesian', code: 'id', native: 'Bahasa Indonesia', script: 'Latin' },
  { name: 'malay', code: 'ms', native: 'Bahasa Melayu', script: 'Latin' },
  { name: 'tagalog', code: 'tl', native: 'Tagalog', script: 'Latin' },
  { name: 'burmese', code: 'my', native: 'မြန်မာ', script: 'Myanmar' },
  { name: 'khmer', code: 'km', native: 'ខ្មែរ', script: 'Khmer' },
  { name: 'lao', code: 'lo', native: 'ລາວ', script: 'Lao' },

  // Middle Eastern Languages (8)
  { name: 'persian', code: 'fa', native: 'فارسی', script: 'Arabic', rtl: true },
  { name: 'turkish', code: 'tr', native: 'Türkçe', script: 'Latin' },
  { name: 'hebrew', code: 'he', native: 'עברית', script: 'Hebrew', rtl: true },
  { name: 'kurdish', code: 'ku', native: 'Kurdî', script: 'Latin' },
  { name: 'pashto', code: 'ps', native: 'پښتو', script: 'Arabic', rtl: true },
  { name: 'azerbaijani', code: 'az', native: 'Azərbaycan', script: 'Latin' },
  { name: 'uzbek', code: 'uz', native: 'Oʻzbek', script: 'Latin' },
  { name: 'kazakh', code: 'kk', native: 'Қазақ', script: 'Cyrillic' },

  // European Languages (16)
  { name: 'italian', code: 'it', native: 'Italiano', script: 'Latin' },
  { name: 'dutch', code: 'nl', native: 'Nederlands', script: 'Latin' },
  { name: 'polish', code: 'pl', native: 'Polski', script: 'Latin' },
  { name: 'ukrainian', code: 'uk', native: 'Українська', script: 'Cyrillic' },
  { name: 'czech', code: 'cs', native: 'Čeština', script: 'Latin' },
  { name: 'romanian', code: 'ro', native: 'Română', script: 'Latin' },
  { name: 'hungarian', code: 'hu', native: 'Magyar', script: 'Latin' },
  { name: 'swedish', code: 'sv', native: 'Svenska', script: 'Latin' },
  { name: 'danish', code: 'da', native: 'Dansk', script: 'Latin' },
  { name: 'finnish', code: 'fi', native: 'Suomi', script: 'Latin' },
  { name: 'norwegian', code: 'no', native: 'Norsk', script: 'Latin' },
  { name: 'greek', code: 'el', native: 'Ελληνικά', script: 'Greek' },
  { name: 'bulgarian', code: 'bg', native: 'Български', script: 'Cyrillic' },
  { name: 'croatian', code: 'hr', native: 'Hrvatski', script: 'Latin' },
  { name: 'serbian', code: 'sr', native: 'Српски', script: 'Cyrillic' },
  { name: 'slovak', code: 'sk', native: 'Slovenčina', script: 'Latin' },

  // African Languages (5)
  { name: 'swahili', code: 'sw', native: 'Kiswahili', script: 'Latin' },
  { name: 'amharic', code: 'am', native: 'አማርኛ', script: 'Ethiopic' },
  { name: 'yoruba', code: 'yo', native: 'Yorùbá', script: 'Latin' },
  { name: 'hausa', code: 'ha', native: 'Hausa', script: 'Latin' },
  { name: 'zulu', code: 'zu', native: 'isiZulu', script: 'Latin' },

  // Others (3)
  { name: 'georgian', code: 'ka', native: 'ქართული', script: 'Georgian' },
  { name: 'armenian', code: 'hy', native: 'Հայdelays', script: 'Armenian' },
  { name: 'mongolian', code: 'mn', native: 'Монгол', script: 'Cyrillic' },
];

// ============================================================
// FAST LOOKUP MAPS
// ============================================================

const langByName = new Map(LANGUAGES_65.map(l => [l.name.toLowerCase(), l]));
const langByCode = new Map(LANGUAGES_65.map(l => [l.code.toLowerCase(), l]));

const languageAliases: Record<string, string> = {
  bangla: 'bengali', oriya: 'odia', farsi: 'persian', mandarin: 'chinese',
  cantonese: 'chinese', taiwanese: 'chinese', brazilian: 'portuguese',
  mexican: 'spanish', flemish: 'dutch', filipino: 'tagalog',
};

const nonLatinScripts = new Set(
  LANGUAGES_65.filter(l => l.script !== 'Latin').map(l => l.name)
);

// ============================================================
// SCRIPT DETECTION - All 65 languages
// ============================================================

const SCRIPT_PATTERNS: Array<{ regex: RegExp; script: string; lang: string }> = [
  // South Asian
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
  // East Asian
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, script: 'Han', lang: 'chinese' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', lang: 'japanese' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, script: 'Hangul', lang: 'korean' },
  // Southeast Asian
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', lang: 'thai' },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', lang: 'lao' },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', lang: 'burmese' },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', lang: 'khmer' },
  // Middle Eastern
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, script: 'Arabic', lang: 'arabic' },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', lang: 'hebrew' },
  // European
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', lang: 'russian' },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, script: 'Greek', lang: 'greek' },
  // Caucasian
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', lang: 'georgian' },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', lang: 'armenian' },
  // African
  { regex: /[\u1200-\u137F\u1380-\u139F]/, script: 'Ethiopic', lang: 'amharic' },
];

// ============================================================
// LANGUAGE UTILITIES
// ============================================================

function normalize(lang: string): string {
  const n = lang.toLowerCase().trim().replace(/[_-]/g, '_');
  return languageAliases[n] || n;
}

function getLang(language: string): LanguageInfo | undefined {
  const n = normalize(language);
  return langByName.get(n) || langByCode.get(n);
}

function getCode(language: string): string {
  return getLang(language)?.code || 'en';
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
// LATIN LANGUAGE DETECTION (Enhanced)
// ============================================================

const LATIN_WORDS: Record<string, Set<string>> = {
  english: new Set([
    'hello', 'hi', 'hey', 'bye', 'goodbye', 'good', 'morning', 'evening', 'night',
    'how', 'are', 'you', 'what', 'is', 'the', 'a', 'an', 'this', 'that', 'it', 'to', 'for', 'and', 'or', 'but',
    'yes', 'no', 'ok', 'okay', 'please', 'thank', 'thanks', 'sorry', 'welcome',
    'love', 'like', 'nice', 'great', 'happy', 'fine', 'beautiful', 'miss', 'want', 'need',
    'where', 'when', 'why', 'who', 'which', 'can', 'will', 'would', 'could', 'should',
    'i', 'me', 'my', 'we', 'us', 'our', 'they', 'them', 'their', 'he', 'she', 'his', 'her',
    'do', 'does', 'did', 'have', 'has', 'had', 'am', 'was', 'were', 'be', 'been',
    'go', 'going', 'come', 'see', 'look', 'know', 'think', 'feel', 'call', 'tell', 'say',
  ]),
  french: new Set([
    'bonjour', 'salut', 'bonsoir', 'merci', 'beaucoup', 'oui', 'non', 'je', 'tu', 'il', 'elle',
    'nous', 'vous', 'comment', 'allez', 'bien', 'très', 'ça', 'va', 'quoi', 'qui', 'où',
    'amour', 'avec', 'pour', 'dans', 'sur', 'le', 'la', 'les', 'un', 'une', 'et', 'ou', 'mais',
  ]),
  german: new Set([
    'hallo', 'guten', 'morgen', 'tag', 'danke', 'bitte', 'ja', 'nein', 'ich', 'du', 'er', 'sie',
    'wir', 'wie', 'geht', 'gut', 'sehr', 'was', 'wer', 'wo', 'liebe', 'mit', 'für', 'in', 'auf',
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'nicht',
  ]),
  spanish: new Set([
    'hola', 'buenos', 'buenas', 'gracias', 'por', 'favor', 'sí', 'no', 'yo', 'tú', 'él', 'ella',
    'nosotros', 'cómo', 'estás', 'bien', 'muy', 'qué', 'quién', 'dónde', 'amor', 'con', 'para',
    'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'porque',
  ]),
  portuguese: new Set([
    'olá', 'oi', 'bom', 'dia', 'boa', 'obrigado', 'obrigada', 'sim', 'não', 'eu', 'tu', 'ele',
    'ela', 'nós', 'como', 'está', 'bem', 'muito', 'que', 'quem', 'onde', 'amor', 'com', 'para',
    'o', 'a', 'os', 'as', 'um', 'uma', 'e', 'ou', 'mas',
  ]),
  italian: new Set([
    'ciao', 'buongiorno', 'buonasera', 'grazie', 'prego', 'sì', 'no', 'io', 'tu', 'lui', 'lei',
    'noi', 'come', 'stai', 'bene', 'molto', 'che', 'chi', 'dove', 'amore', 'con', 'in', 'su',
    'il', 'la', 'lo', 'i', 'le', 'un', 'una', 'e', 'o', 'ma',
  ]),
  dutch: new Set([
    'hallo', 'goedemorgen', 'dank', 'ja', 'nee', 'ik', 'jij', 'hij', 'zij', 'wij', 'hoe', 'gaat',
    'het', 'goed', 'wat', 'wie', 'waar', 'liefde', 'met', 'voor', 'in', 'op', 'de', 'een', 'en', 'of', 'maar',
  ]),
  turkish: new Set([
    'merhaba', 'selam', 'günaydın', 'teşekkür', 'evet', 'hayır', 'ben', 'sen', 'o', 'biz', 'siz',
    'nasıl', 'iyi', 'ne', 'kim', 'nerede', 'aşk', 'ile', 'için', 've', 'veya', 'ama',
  ]),
  indonesian: new Set([
    'halo', 'selamat', 'pagi', 'terima', 'kasih', 'ya', 'tidak', 'saya', 'kamu', 'dia', 'kami',
    'bagaimana', 'baik', 'apa', 'siapa', 'dimana', 'cinta', 'dengan', 'untuk', 'dan', 'atau', 'tapi',
  ]),
  vietnamese: new Set([
    'xin', 'chào', 'cảm', 'ơn', 'vâng', 'không', 'tôi', 'bạn', 'anh', 'chị', 'ấy', 'chúng',
    'thế', 'nào', 'tốt', 'gì', 'ai', 'đâu', 'yêu', 'với', 'cho', 'và', 'hoặc', 'nhưng',
  ]),
  swahili: new Set([
    'habari', 'jambo', 'asante', 'sana', 'ndiyo', 'hapana', 'mimi', 'wewe', 'yeye', 'sisi', 'wao',
    'vipi', 'vizuri', 'nini', 'nani', 'wapi', 'upendo', 'na', 'kwa', 'lakini',
  ]),
};

function detectLatinLang(text: string): { lang: string; confidence: number } | null {
  const clean = text.toLowerCase().trim();
  const words = clean.split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return null;

  // Diacritics hints
  const hints: Record<string, boolean> = {
    french: /[éèêëàâùûôîïç]/i.test(clean),
    german: /[äöüß]/i.test(clean),
    spanish: /[ñ¿¡áéíóú]/i.test(clean),
    portuguese: /[ãõç]/i.test(clean),
    turkish: /[ığüşöç]/i.test(clean),
    vietnamese: /[ăâêôơưđ]/i.test(clean),
  };

  const scores: Record<string, number> = {};
  for (const [lang, wordSet] of Object.entries(LATIN_WORDS)) {
    let count = 0;
    for (const word of words) {
      const c = word.replace(/[.,!?;:'"]/g, '');
      if (wordSet.has(c)) count++;
    }
    scores[lang] = count / words.length;
    if (hints[lang]) scores[lang] += 0.35;
  }

  let best = 'english';
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; best = lang; }
  }

  const threshold = words.length === 1 ? 1.0 : 0.25;
  if (bestScore >= threshold) {
    return { lang: best, confidence: bestScore };
  }

  // Single word check
  if (words.length === 1) {
    const w = words[0].replace(/[.,!?;:'"]/g, '');
    for (const [lang, wordSet] of Object.entries(LATIN_WORDS)) {
      if (wordSet.has(w)) return { lang, confidence: 1.0 };
    }
  }

  return null;
}

// ============================================================
// TRANSLATION APIs (with parallel execution)
// ============================================================

async function translateGoogle(text: string, from: string, to: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]) {
        let result = '';
        for (const t of data[0]) { if (t?.[0]) result += t[0]; }
        const trimmed = result.trim();
        if (trimmed && trimmed.toLowerCase() !== text.toLowerCase()) return trimmed;
      }
    }
  } catch { /* silent */ }
  return null;
}

async function translateMyMemory(text: string, from: string, to: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    
    if (res.ok) {
      const data = await res.json();
      const translated = data.responseData?.translatedText?.trim();
      if (translated && !translated.includes('MYMEMORY') && translated.toLowerCase() !== text.toLowerCase()) {
        return translated;
      }
    }
  } catch { /* silent */ }
  return null;
}

async function translateLibre(text: string, from: string, to: string): Promise<string | null> {
  const mirrors = [
    "https://libretranslate.com",
    "https://translate.argosopentech.com",
  ];
  
  for (const mirror of mirrors) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${mirror}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: from, target: to, format: "text" }),
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      
      if (res.ok) {
        const data = await res.json();
        const translated = data.translatedText?.trim();
        if (translated && translated !== text) return translated;
      }
    } catch { /* silent */ }
  }
  return null;
}

// ============================================================
// CORE TRANSLATION ENGINE
// ============================================================

async function translate(
  text: string,
  fromLang: string,
  toLang: string
): Promise<{ result: string; success: boolean; pivot: boolean }> {
  const from = getCode(fromLang);
  const to = getCode(toLang);
  
  console.log(`[bidir-65] Translating: ${from} → ${to}`);
  
  // Non-English pairs: use English pivot
  if (from !== 'en' && to !== 'en') {
    console.log('[bidir-65] Using English pivot');
    
    // Step 1: Source → English
    let english = await translateGoogle(text, from, 'en');
    if (!english) english = await translateMyMemory(text, from, 'en');
    if (!english) english = await translateLibre(text, from, 'en');
    
    if (english && english !== text) {
      console.log(`[bidir-65] Pivot 1 (${from}→en): ${english.substring(0, 40)}...`);
      
      // Step 2: English → Target
      let final = await translateGoogle(english, 'en', to);
      if (!final) final = await translateMyMemory(english, 'en', to);
      if (!final) final = await translateLibre(english, 'en', to);
      
      if (final) {
        console.log(`[bidir-65] Pivot 2 (en→${to}): ${final.substring(0, 40)}...`);
        return { result: final.trim(), success: true, pivot: true };
      }
      return { result: english.trim(), success: true, pivot: true };
    }
  }
  
  // Direct translation
  let result = await translateGoogle(text, from, to);
  if (result) return { result: result.trim(), success: true, pivot: false };
  
  result = await translateMyMemory(text, from, to);
  if (result) return { result: result.trim(), success: true, pivot: false };
  
  result = await translateLibre(text, from, to);
  if (result) return { result: result.trim(), success: true, pivot: false };
  
  console.log('[bidir-65] All translation attempts failed');
  return { result: text.trim(), success: false, pivot: false };
}

// ============================================================
// TRANSLITERATION (Latin → Native Script)
// ============================================================

async function transliterate(latinText: string, targetLang: string): Promise<{ text: string; success: boolean }> {
  const to = getCode(targetLang);
  console.log(`[bidir-65] Transliterating to ${targetLang}`);
  
  // Use translation from English to trigger script conversion
  const result = await translateGoogle(latinText, 'en', to);
  if (result) {
    const detected = detectScript(result);
    if (!detected.isLatin) {
      console.log(`[bidir-65] Transliteration success: ${result.substring(0, 40)}`);
      return { text: result.trim(), success: true };
    }
  }
  
  return { text: latinText.trim(), success: false };
}

// ============================================================
// BIDIRECTIONAL TRANSLATION (Parallel)
// ============================================================

interface BidirResult {
  senderView: {
    text: string;
    nativeScript: string | null;
    wasTransliterated: boolean;
  };
  receiverView: {
    text: string;
    wasTranslated: boolean;
    pivotUsed: boolean;
  };
  detectedSource: string;
  originalText: string;
}

async function translateBidirectional(
  text: string,
  senderLang: string,
  receiverLang: string,
  motherTongue?: string
): Promise<BidirResult> {
  const detected = detectScript(text);
  const isLatin = detected.isLatin;
  
  // Determine effective source language
  let effectiveSource = detected.lang;
  let senderNativeScript: string | null = null;
  let wasTransliterated = false;
  
  if (isLatin) {
    // Check if it's a known Latin-script language
    const latinDetected = detectLatinLang(text);
    if (latinDetected) {
      effectiveSource = latinDetected.lang;
      console.log(`[bidir-65] Detected Latin language: ${effectiveSource}`);
    } else if (motherTongue && isNonLatin(motherTongue)) {
      // Likely romanized text in mother tongue
      effectiveSource = motherTongue;
      console.log(`[bidir-65] Assuming romanized ${motherTongue}`);
      
      // Try to transliterate to native script for sender view
      const translit = await transliterate(text, motherTongue);
      if (translit.success) {
        senderNativeScript = translit.text;
        wasTransliterated = true;
      }
    } else if (senderLang && isNonLatin(senderLang)) {
      effectiveSource = senderLang;
      const translit = await transliterate(text, senderLang);
      if (translit.success) {
        senderNativeScript = translit.text;
        wasTransliterated = true;
      }
    }
  } else {
    effectiveSource = detected.lang;
  }
  
  // Skip translation if same language
  if (isSame(effectiveSource, receiverLang)) {
    return {
      senderView: { text: senderNativeScript || text, nativeScript: senderNativeScript, wasTransliterated },
      receiverView: { text: senderNativeScript || text, wasTranslated: false, pivotUsed: false },
      detectedSource: effectiveSource,
      originalText: text,
    };
  }
  
  // Translate for receiver
  const textToTranslate = senderNativeScript || text;
  const { result, success, pivot } = await translate(textToTranslate, effectiveSource, receiverLang);
  
  return {
    senderView: { text: senderNativeScript || text, nativeScript: senderNativeScript, wasTransliterated },
    receiverView: { text: result, wasTranslated: success, pivotUsed: pivot },
    detectedSource: effectiveSource,
    originalText: text,
  };
}

// ============================================================
// BATCH TRANSLATION
// ============================================================

async function translateBatch(
  texts: string[],
  fromLang: string,
  toLang: string
): Promise<Array<{ original: string; translated: string; success: boolean }>> {
  const results = await Promise.all(
    texts.map(async (text) => {
      const { result, success } = await translate(text, fromLang, toLang);
      return { original: text, translated: result, success };
    })
  );
  return results;
}

// ============================================================
// CLEAN TEXT OUTPUT
// ============================================================

function clean(text: string): string {
  if (!text) return text;
  return text.replace(/[\t\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
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
      text, message, texts, // Single text or batch
      sourceLanguage, targetLanguage,
      senderLanguage, receiverLanguage,
      motherTongue,
      mode = "translate"
    } = body;

    const inputText = text || message;
    console.log(`[bidir-65] Mode: ${mode}`);

    // ================================================================
    // MODE: bidirectional - Full chat message processing
    // ================================================================
    if (mode === "bidirectional" || mode === "chat") {
      const sender = senderLanguage || sourceLanguage || motherTongue || "english";
      const receiver = receiverLanguage || targetLanguage || "english";
      
      console.log(`[bidir-65] Bidirectional: sender=${sender}, receiver=${receiver}, motherTongue=${motherTongue}`);
      
      const result = await translateBidirectional(inputText, sender, receiver, motherTongue);
      
      return new Response(
        JSON.stringify({
          senderView: clean(result.senderView.text),
          senderNativeScript: result.senderView.nativeScript ? clean(result.senderView.nativeScript) : null,
          wasTransliterated: result.senderView.wasTransliterated,
          receiverView: clean(result.receiverView.text),
          wasTranslated: result.receiverView.wasTranslated,
          pivotUsed: result.receiverView.pivotUsed,
          detectedLanguage: result.detectedSource,
          originalText: inputText,
          mode: "bidirectional",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // MODE: batch - Multiple texts at once
    // ================================================================
    if (mode === "batch" && texts && Array.isArray(texts)) {
      const from = sourceLanguage || senderLanguage || "english";
      const to = targetLanguage || receiverLanguage || "english";
      
      console.log(`[bidir-65] Batch: ${texts.length} texts, ${from} → ${to}`);
      
      const results = await translateBatch(texts, from, to);
      
      return new Response(
        JSON.stringify({ results, mode: "batch" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // MODE: languages - List all 65 supported languages
    // ================================================================
    if (mode === "languages") {
      return new Response(
        JSON.stringify({
          count: LANGUAGES_65.length,
          languages: LANGUAGES_65.map(l => ({
            name: l.name,
            code: l.code,
            native: l.native,
            script: l.script,
            rtl: l.rtl || false,
          })),
          totalPairs: 65 * 64,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // MODE: test - Quick translation test
    // ================================================================
    if (mode === "test") {
      const from = sourceLanguage || "english";
      const to = targetLanguage || "telugu";
      const testText = inputText || "hello how are you";
      
      console.log(`[bidir-65] Test: "${testText}" ${from} → ${to}`);
      
      const { result, success, pivot } = await translate(testText, from, to);
      
      return new Response(
        JSON.stringify({
          input: testText,
          output: clean(result),
          from, to,
          success,
          pivotUsed: pivot,
          mode: "test",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // MODE: detect - Auto-detect language
    // ================================================================
    if (mode === "detect") {
      const detected = detectScript(inputText);
      const latinLang = detected.isLatin ? detectLatinLang(inputText) : null;
      
      return new Response(
        JSON.stringify({
          text: inputText,
          detected: {
            language: latinLang?.lang || detected.lang,
            script: detected.script,
            isLatin: detected.isLatin,
            confidence: latinLang?.confidence || 1.0,
          },
          mode: "detect",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // MODE: translate (default) - Standard translation
    // ================================================================
    if (!inputText) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const detected = detectScript(inputText);
    let effectiveSource = sourceLanguage || senderLanguage;
    
    // Auto-detect if no source provided
    if (!effectiveSource) {
      if (detected.isLatin) {
        const latinLang = detectLatinLang(inputText);
        if (latinLang) {
          effectiveSource = latinLang.lang;
        } else if (motherTongue && isNonLatin(motherTongue)) {
          effectiveSource = motherTongue;
        } else {
          effectiveSource = "english";
        }
      } else {
        effectiveSource = detected.lang;
      }
    }
    
    const effectiveTarget = targetLanguage || receiverLanguage || "english";
    
    console.log(`[bidir-65] Translate: ${effectiveSource} → ${effectiveTarget}`);
    
    // Handle romanized input for non-Latin languages
    if (detected.isLatin && isNonLatin(effectiveSource) && !isSame(effectiveSource, effectiveTarget)) {
      // Check if it's actually a known Latin language
      const latinCheck = detectLatinLang(inputText);
      if (latinCheck) {
        // It's English/French/etc., translate directly
        const { result, success, pivot } = await translate(inputText, latinCheck.lang, effectiveTarget);
        return new Response(
          JSON.stringify({
            translatedText: clean(result),
            originalText: inputText,
            isTranslated: success,
            pivotUsed: pivot,
            detectedLanguage: latinCheck.lang,
            sourceLanguage: latinCheck.lang,
            targetLanguage: effectiveTarget,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Romanized input - transliterate first
      const translit = await transliterate(inputText, effectiveSource);
      const textToTranslate = translit.success ? translit.text : inputText;
      const { result, success, pivot } = await translate(textToTranslate, effectiveSource, effectiveTarget);
      
      return new Response(
        JSON.stringify({
          translatedText: clean(result),
          originalText: inputText,
          nativeScriptText: translit.success ? translit.text : null,
          isTranslated: success,
          wasTransliterated: translit.success,
          pivotUsed: pivot,
          sourceLanguage: effectiveSource,
          targetLanguage: effectiveTarget,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Same language check
    if (isSame(effectiveSource, effectiveTarget)) {
      // Script conversion if needed
      if (detected.isLatin && isNonLatin(effectiveTarget)) {
        const translit = await transliterate(inputText, effectiveTarget);
        return new Response(
          JSON.stringify({
            translatedText: clean(translit.success ? translit.text : inputText),
            originalText: inputText,
            isTranslated: false,
            wasTransliterated: translit.success,
            sourceLanguage: effectiveSource,
            targetLanguage: effectiveTarget,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({
          translatedText: clean(inputText),
          originalText: inputText,
          isTranslated: false,
          sourceLanguage: effectiveSource,
          targetLanguage: effectiveTarget,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Standard translation
    const { result, success, pivot } = await translate(inputText, effectiveSource, effectiveTarget);
    
    return new Response(
      JSON.stringify({
        translatedText: clean(result),
        translatedMessage: clean(result),
        originalText: inputText,
        isTranslated: success && clean(result).toLowerCase() !== inputText.toLowerCase(),
        pivotUsed: pivot,
        detectedLanguage: detected.lang,
        sourceLanguage: effectiveSource,
        targetLanguage: effectiveTarget,
        isSourceLatin: detected.isLatin,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bidir-65] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

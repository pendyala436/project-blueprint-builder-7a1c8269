/**
 * Embedded Translation Engine
 * 
 * Multi-provider translation using:
 * - LibreTranslate (free API)
 * - MyMemory API (free tier)
 * - Google Input Tools (transliteration)
 * 
 * All logic embedded in client code - NO external edge functions
 */

import { SCRIPT_PATTERNS, normalizeLanguage, isLatinScriptLanguage } from './language-codes';
import { detectLanguage, isLatinScript, isSameLanguage } from './language-detector';
import type { TranslationResult, TranslationOptions } from './types';

// Language code mappings for different APIs
const LIBRE_LANGUAGE_CODES: Record<string, string> = {
  english: 'en', hindi: 'hi', bengali: 'bn', telugu: 'te', tamil: 'ta',
  marathi: 'mr', gujarati: 'gu', kannada: 'kn', malayalam: 'ml', punjabi: 'pa',
  odia: 'or', urdu: 'ur', arabic: 'ar', spanish: 'es', french: 'fr',
  german: 'de', portuguese: 'pt', italian: 'it', dutch: 'nl', russian: 'ru',
  polish: 'pl', ukrainian: 'uk', chinese: 'zh', japanese: 'ja', korean: 'ko',
  vietnamese: 'vi', thai: 'th', indonesian: 'id', malay: 'ms', turkish: 'tr',
  hebrew: 'he', persian: 'fa', greek: 'el', czech: 'cs', romanian: 'ro',
  hungarian: 'hu', swedish: 'sv', danish: 'da', finnish: 'fi', norwegian: 'no',
  swahili: 'sw', afrikaans: 'af', nepali: 'ne', sinhala: 'si', khmer: 'km',
  lao: 'lo', burmese: 'my', georgian: 'ka', armenian: 'hy', mongolian: 'mn',
  tibetan: 'bo', amharic: 'am', yoruba: 'yo', igbo: 'ig', zulu: 'zu',
  xhosa: 'xh', somali: 'so', hausa: 'ha', azerbaijani: 'az', kazakh: 'kk',
  uzbek: 'uz', tajik: 'tg', kyrgyz: 'ky', turkmen: 'tk', pashto: 'ps',
  kurdish: 'ku', catalan: 'ca', croatian: 'hr', serbian: 'sr', bosnian: 'bs',
  slovak: 'sk', slovenian: 'sl', bulgarian: 'bg', lithuanian: 'lt', latvian: 'lv',
  estonian: 'et', icelandic: 'is', tagalog: 'tl', cebuano: 'ceb', javanese: 'jw',
  sundanese: 'su', malagasy: 'mg', samoan: 'sm', hawaiian: 'haw', assamese: 'as',
};

// MyMemory language codes (ISO 639-1)
const MYMEMORY_LANGUAGE_CODES: Record<string, string> = {
  ...LIBRE_LANGUAGE_CODES,
  // Additional mappings for MyMemory
  bangla: 'bn', oriya: 'or', farsi: 'fa', mandarin: 'zh',
};

// Google Input Tools language codes for transliteration
const GOOGLE_ITRANS_CODES: Record<string, string> = {
  hindi: 'hi-t-i0-und', bengali: 'bn-t-i0-und', telugu: 'te-t-i0-und',
  tamil: 'ta-t-i0-und', marathi: 'mr-t-i0-und', gujarati: 'gu-t-i0-und',
  kannada: 'kn-t-i0-und', malayalam: 'ml-t-i0-und', punjabi: 'pa-t-i0-und',
  odia: 'or-t-i0-und', urdu: 'ur-t-i0-und', nepali: 'ne-t-i0-und',
  sinhala: 'si-t-i0-und', arabic: 'ar-t-i0-und', persian: 'fa-t-i0-und',
  russian: 'ru-t-i0-und', greek: 'el-t-i0-und', hebrew: 'he-t-i0-und',
  thai: 'th-t-i0-und', burmese: 'my-t-i0-und', khmer: 'km-t-i0-und',
  lao: 'lo-t-i0-und', chinese: 'zh-t-i0-pinyin', japanese: 'ja-t-i0-und',
  korean: 'ko-t-i0-und', georgian: 'ka-t-i0-und', armenian: 'hy-t-i0-und',
  amharic: 'am-t-i0-und', tibetan: 'bo-t-i0-und',
};

// Cache for translations
const translationCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Common romantic phrases dictionary for accurate translation
const ROMANTIC_PHRASES: Record<string, Record<string, string>> = {
  'i love you': {
    hindi: 'मैं तुमसे प्यार करता हूं',
    telugu: 'నేను నిన్ను ప్రేమిస్తున్నాను',
    tamil: 'நான் உன்னை காதலிக்கிறேன்',
    bengali: 'আমি তোমাকে ভালোবাসি',
    marathi: 'मी तुझ्यावर प्रेम करतो',
    gujarati: 'હું તને પ્રેમ કરું છું',
    kannada: 'ನಾನು ನಿನ್ನನ್ನು ಪ್ರೀತಿಸುತ್ತೇನೆ',
    malayalam: 'ഞാൻ നിന്നെ സ്നേഹിക്കുന്നു',
    punjabi: 'ਮੈਂ ਤੈਨੂੰ ਪਿਆਰ ਕਰਦਾ ਹਾਂ',
    odia: 'ମୁଁ ତୁମକୁ ଭଲ ପାଏ',
    urdu: 'میں تم سے پیار کرتا ہوں',
    arabic: 'أنا أحبك',
    spanish: 'Te amo',
    french: "Je t'aime",
    german: 'Ich liebe dich',
    portuguese: 'Eu te amo',
    italian: 'Ti amo',
    russian: 'Я тебя люблю',
    chinese: '我爱你',
    japanese: '愛してる',
    korean: '사랑해',
  },
  'i miss you': {
    hindi: 'मुझे तुम्हारी याद आती है',
    telugu: 'నీవు లేకుండా నాకు బాధగా ఉంది',
    tamil: 'உன்னை நினைக்கிறேன்',
    bengali: 'তোমার জন্য মন খারাপ',
    spanish: 'Te extraño',
    french: 'Tu me manques',
    german: 'Ich vermisse dich',
  },
  'good morning': {
    hindi: 'सुप्रभात',
    telugu: 'శుభోదయం',
    tamil: 'காலை வணக்கம்',
    bengali: 'সুপ্রভাত',
    marathi: 'शुभ प्रभात',
    gujarati: 'શુભ સવાર',
    kannada: 'ಶುಭೋದಯ',
    malayalam: 'സുപ്രഭാതം',
    punjabi: 'ਸ਼ੁਭ ਸਵੇਰ',
    spanish: 'Buenos días',
    french: 'Bonjour',
    german: 'Guten Morgen',
  },
  'good night': {
    hindi: 'शुभ रात्रि',
    telugu: 'శుభ రాత్రి',
    tamil: 'இனிய இரவு',
    bengali: 'শুভ রাত্রি',
    spanish: 'Buenas noches',
    french: 'Bonne nuit',
    german: 'Gute Nacht',
  },
  'how are you': {
    hindi: 'आप कैसे हैं',
    telugu: 'మీరు ఎలా ఉన్నారు',
    tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்',
    bengali: 'আপনি কেমন আছেন',
    spanish: '¿Cómo estás?',
    french: 'Comment allez-vous?',
    german: 'Wie geht es dir?',
  },
  'hello': {
    hindi: 'नमस्ते',
    telugu: 'హలో',
    tamil: 'வணக்கம்',
    bengali: 'হ্যালো',
    marathi: 'नमस्कार',
    gujarati: 'નમસ્તે',
    kannada: 'ನಮಸ್ಕಾರ',
    malayalam: 'ഹലോ',
    punjabi: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
    spanish: 'Hola',
    french: 'Bonjour',
    german: 'Hallo',
  },
  'thank you': {
    hindi: 'धन्यवाद',
    telugu: 'ధన్యవాదాలు',
    tamil: 'நன்றி',
    bengali: 'ধন্যবাদ',
    marathi: 'धन्यवाद',
    gujarati: 'આભાર',
    kannada: 'ಧನ್ಯವಾದ',
    malayalam: 'നന്ദി',
    spanish: 'Gracias',
    french: 'Merci',
    german: 'Danke',
  },
};

// Transliteration dictionary for common words
const TRANSLITERATION_MAP: Record<string, Record<string, string>> = {
  hindi: {
    namaste: 'नमस्ते', namaskar: 'नमस्कार', dhanyavad: 'धन्यवाद',
    pyar: 'प्यार', dil: 'दिल', mohabbat: 'मोहब्बत', ishq: 'इश्क',
    khush: 'खुश', acha: 'अच्छा', theek: 'ठीक', haan: 'हाँ', nahi: 'नहीं',
    kya: 'क्या', kaise: 'कैसे', kab: 'कब', kahan: 'कहाँ', kyun: 'क्यों',
    aap: 'आप', tum: 'तुम', main: 'मैं', hum: 'हम', wo: 'वो',
    subah: 'सुबह', shaam: 'शाम', raat: 'रात', din: 'दिन',
  },
  telugu: {
    namaste: 'నమస్తే', namaskar: 'నమస్కారం', dhanyavad: 'ధన్యవాదాలు',
    prema: 'ప్రేమ', priya: 'ప్రియ', snehithudu: 'స్నేహితుడు',
    manchidi: 'మంచిది', avunu: 'అవును', ledu: 'లేదు',
    ela: 'ఎలా', emi: 'ఏమి', eppudu: 'ఎప్పుడు', ekkada: 'ఎక్కడ',
    nenu: 'నేను', nuvvu: 'నువ్వు', meeru: 'మీరు',
  },
  tamil: {
    vanakkam: 'வணக்கம்', nandri: 'நன்றி', anbu: 'அன்பு',
    kadhal: 'காதல்', nalla: 'நல்ல', aama: 'ஆமா', illa: 'இல்ல',
    eppadi: 'எப்படி', enna: 'என்ன', eppo: 'எப்போ', enga: 'எங்கே',
    naan: 'நான்', nee: 'நீ', neengal: 'நீங்கள்',
  },
  bengali: {
    namaskar: 'নমস্কার', dhonnobad: 'ধন্যবাদ', bhalobashi: 'ভালোবাসি',
    bhalo: 'ভালো', haan: 'হ্যাঁ', na: 'না',
    kemon: 'কেমন', ki: 'কি', kokhon: 'কখন', kothay: 'কোথায়',
    ami: 'আমি', tumi: 'তুমি', apni: 'আপনি',
  },
  arabic: {
    marhaba: 'مرحبا', shukran: 'شكرا', habibi: 'حبيبي',
    ahlan: 'أهلاً', naam: 'نعم', la: 'لا',
    kayf: 'كيف', mata: 'متى', ayna: 'أين',
    ana: 'أنا', anta: 'أنت', huwa: 'هو',
  },
};

/**
 * Get language code for LibreTranslate API
 */
function getLibreCode(language: string): string {
  const norm = normalizeLanguage(language);
  return LIBRE_LANGUAGE_CODES[norm] || 'en';
}

/**
 * Get language code for MyMemory API
 */
function getMyMemoryCode(language: string): string {
  const norm = normalizeLanguage(language);
  return MYMEMORY_LANGUAGE_CODES[norm] || 'en';
}

/**
 * Check and return phrase from dictionary
 */
function checkPhraseDictionary(text: string, targetLanguage: string): string | null {
  const lowerText = text.toLowerCase().trim();
  const normTarget = normalizeLanguage(targetLanguage);
  
  if (ROMANTIC_PHRASES[lowerText]?.[normTarget]) {
    return ROMANTIC_PHRASES[lowerText][normTarget];
  }
  return null;
}

/**
 * Check and return transliteration from dictionary
 */
function checkTransliterationDictionary(text: string, targetLanguage: string): string | null {
  const lowerText = text.toLowerCase().trim();
  const normTarget = normalizeLanguage(targetLanguage);
  const langMap = TRANSLITERATION_MAP[normTarget];
  
  if (langMap) {
    // Check single word
    if (langMap[lowerText]) {
      return langMap[lowerText];
    }
    
    // Check word by word
    const words = lowerText.split(/\s+/);
    const transliterated = words.map(word => langMap[word] || word);
    const hasTransliteration = transliterated.some((t, i) => t !== words[i]);
    
    if (hasTransliteration) {
      return transliterated.join(' ');
    }
  }
  
  return null;
}

/**
 * Get from cache
 */
function getFromCache(key: string): string | null {
  const cached = translationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  if (cached) {
    translationCache.delete(key);
  }
  return null;
}

/**
 * Add to cache
 */
function addToCache(key: string, result: string): void {
  translationCache.set(key, { result, timestamp: Date.now() });
  
  // Limit cache size
  if (translationCache.size > 500) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
}

/**
 * Translate using LibreTranslate (free API)
 * Public instance: https://libretranslate.com
 */
async function translateWithLibre(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string | null> {
  const sourceCode = getLibreCode(sourceLang);
  const targetCode = getLibreCode(targetLang);
  
  // Skip if same language
  if (sourceCode === targetCode) return text;
  
  try {
    // Use public LibreTranslate instance
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceCode,
        target: targetCode,
        format: 'text',
      }),
    });
    
    if (!response.ok) {
      console.warn('[LibreTranslate] API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.translatedText || null;
  } catch (error) {
    console.warn('[LibreTranslate] Error:', error);
    return null;
  }
}

/**
 * Translate using MyMemory API (free tier: 1000 words/day)
 */
async function translateWithMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string | null> {
  const sourceCode = getMyMemoryCode(sourceLang);
  const targetCode = getMyMemoryCode(targetLang);
  
  // Skip if same language
  if (sourceCode === targetCode) return text;
  
  try {
    const langPair = `${sourceCode}|${targetCode}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('[MyMemory] API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      // MyMemory sometimes returns in uppercase or with issues
      if (translated.toUpperCase() === translated && text.toUpperCase() !== text) {
        return null; // Skip all-caps responses
      }
      return translated;
    }
    
    return null;
  } catch (error) {
    console.warn('[MyMemory] Error:', error);
    return null;
  }
}

/**
 * Convert Latin text to native script using embedded dictionary
 * Fallback for Google Input Tools when API is unavailable
 */
function convertWithDictionary(text: string, targetLanguage: string): string {
  // First check transliteration dictionary
  const dictResult = checkTransliterationDictionary(text, targetLanguage);
  if (dictResult) return dictResult;
  
  // Check phrase dictionary
  const phraseResult = checkPhraseDictionary(text, targetLanguage);
  if (phraseResult) return phraseResult;
  
  return text;
}

/**
 * Main translation function - uses multiple providers with fallback
 */
export async function translateText(
  text: string,
  options: TranslationOptions
): Promise<TranslationResult> {
  const { sourceLanguage, targetLanguage, mode = 'auto' } = options;
  const trimmed = text.trim();
  
  if (!trimmed) {
    return createResult(text, text, 'unknown', targetLanguage, false, 'translate');
  }
  
  // Detect source language if not provided
  const detected = detectLanguage(trimmed);
  const effectiveSource = sourceLanguage || detected.language;
  const normSource = normalizeLanguage(effectiveSource);
  const normTarget = normalizeLanguage(targetLanguage);
  
  // Same language - no translation needed
  if (isSameLanguage(normSource, normTarget)) {
    return createResult(trimmed, trimmed, normSource, normTarget, false, 'same_language');
  }
  
  // Check cache
  const cacheKey = `${trimmed}|${normSource}|${normTarget}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return createResult(trimmed, cached, normSource, normTarget, true, 'translate');
  }
  
  // Check phrase dictionary first (for accuracy)
  const phraseResult = checkPhraseDictionary(trimmed, normTarget);
  if (phraseResult) {
    addToCache(cacheKey, phraseResult);
    return createResult(trimmed, phraseResult, normSource, normTarget, true, 'translate');
  }
  
  // Determine if conversion mode (Latin input to non-Latin target)
  const isConvertMode = mode === 'convert' || 
    (mode === 'auto' && isLatinScript(trimmed) && !isLatinScriptLanguage(normTarget));
  
  if (isConvertMode) {
    // For conversion, use dictionary-based transliteration
    const converted = convertWithDictionary(trimmed, normTarget);
    if (converted !== trimmed) {
      addToCache(cacheKey, converted);
      return createResult(trimmed, converted, normSource, normTarget, true, 'convert');
    }
  }
  
  // Try MyMemory first (more reliable, free)
  let translated = await translateWithMyMemory(trimmed, normSource, normTarget);
  
  // Fallback to LibreTranslate
  if (!translated) {
    translated = await translateWithLibre(trimmed, normSource, normTarget);
  }
  
  // Fallback to dictionary if APIs fail
  if (!translated) {
    translated = convertWithDictionary(trimmed, normTarget);
  }
  
  if (translated && translated !== trimmed) {
    addToCache(cacheKey, translated);
    return createResult(trimmed, translated, normSource, normTarget, true, 'translate');
  }
  
  return createResult(trimmed, trimmed, normSource, normTarget, false, 'translate');
}

/**
 * Convert Latin text to native script
 */
export async function convertToNativeScript(
  text: string,
  targetLanguage: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  // Already non-Latin, no conversion needed
  if (!isLatinScript(trimmed)) return trimmed;
  
  const normTarget = normalizeLanguage(targetLanguage);
  
  // If target uses Latin script, translate instead
  if (isLatinScriptLanguage(normTarget)) {
    const result = await translateText(trimmed, {
      sourceLanguage: 'english',
      targetLanguage: normTarget,
      mode: 'translate'
    });
    return result.translatedText;
  }
  
  // Check dictionary first
  const dictResult = convertWithDictionary(trimmed, normTarget);
  if (dictResult !== trimmed) return dictResult;
  
  // Try translation APIs for script conversion
  const result = await translateText(trimmed, {
    sourceLanguage: 'english',
    targetLanguage: normTarget,
    mode: 'convert'
  });
  
  return result.translatedText;
}

/**
 * Batch translate multiple texts
 */
export async function translateBatch(
  items: Array<{ text: string; targetLanguage: string; sourceLanguage?: string }>
): Promise<TranslationResult[]> {
  const results = await Promise.allSettled(
    items.map(item =>
      translateText(item.text, {
        sourceLanguage: item.sourceLanguage,
        targetLanguage: item.targetLanguage,
      })
    )
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return createResult(
      items[index].text,
      items[index].text,
      items[index].sourceLanguage || 'unknown',
      items[index].targetLanguage,
      false,
      'translate'
    );
  });
}

/**
 * Clear translation cache
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number } {
  return { size: translationCache.size };
}

// Helper function to create result
function createResult(
  original: string,
  translated: string,
  sourceLang: string,
  targetLang: string,
  isTranslated: boolean,
  mode: 'translate' | 'convert' | 'same_language'
): TranslationResult {
  return {
    translatedText: translated,
    originalText: original,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    isTranslated,
    mode
  };
}

// Re-export utilities
export { detectLanguage, isLatinScript, isSameLanguage, normalizeLanguage };

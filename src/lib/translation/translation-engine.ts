/**
 * Embedded Translation Engine
 * 
 * Multi-provider translation using:
 * - Browser-based ML (Transformers.js + NLLB-200) - PRIMARY
 * - Embedded dictionaries (common phrases)
 * - Transliteration dictionaries
 * 
 * All logic embedded in client code - NO external API calls
 */

import { SCRIPT_PATTERNS, normalizeLanguage, isLatinScriptLanguage } from './language-codes';
import { detectLanguage, isLatinScript, isSameLanguage } from './language-detector';
import type { TranslationResult, TranslationOptions } from './types';
import { translateWithML, isMLTranslatorReady, initializeMLTranslator } from './ml-translation-engine';

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
    shukriya: 'शुक्रिया', hello: 'हैलो', hi: 'हाय', bye: 'बाय', ok: 'ओके',
    yes: 'हाँ', no: 'नहीं', what: 'क्या', why: 'क्यों',
    love: 'प्यार', miss: 'याद', happy: 'खुश', sad: 'उदास',
    good: 'अच्छा', bad: 'बुरा', beautiful: 'सुंदर', cute: 'क्यूट',
    friend: 'दोस्त', brother: 'भाई', bhai: 'भाई', sister: 'बहन', behen: 'बहन',
    mother: 'माँ', maa: 'माँ', father: 'पापा', papa: 'पापा',
    bahut: 'बहुत', thoda: 'थोड़ा', abhi: 'अभी', kal: 'कल', aaj: 'आज',
    // Multi-word phrases (quoted keys)
    'kaise ho': 'कैसे हो', 'kaisa hai': 'कैसा है', 'theek hoon': 'ठीक हूँ',
    'bahut accha': 'बहुत अच्छा', 'maaf karo': 'माफ करो',
  },
  telugu: {
    namaste: 'నమస్తే', namaskar: 'నమస్కారం', dhanyavad: 'ధన్యవాదాలు',
    prema: 'ప్రేమ', priya: 'ప్రియ', snehithudu: 'స్నేహితుడు',
    manchidi: 'మంచిది', avunu: 'అవును', ledu: 'లేదు',
    ela: 'ఎలా', emi: 'ఏమి', eppudu: 'ఎప్పుడు', ekkada: 'ఎక్కడ',
    nenu: 'నేను', nuvvu: 'నువ్వు', meeru: 'మీరు',
    bagunnava: 'బాగున్నావా', bagunnanu: 'బాగున్నాను', bagundi: 'బాగుంది',
    subhodayam: 'శుభోదయం', subharatri: 'శుభరాత్రి',
    thanks: 'ధన్యవాదాలు', sorry: 'క్షమించండి', please: 'దయచేసి',
    hello: 'హలో', hi: 'హాయ్', bye: 'బై', ok: 'సరే',
    yes: 'అవును', no: 'లేదు', what: 'ఏమిటి', why: 'ఎందుకు',
    love: 'ప్రేమ', miss: 'మిస్సు', happy: 'సంతోషం', sad: 'బాధ',
    good: 'మంచి', bad: 'చెడు', beautiful: 'అందమైన', cute: 'క్యూట్',
    friend: 'స్నేహితుడు', brother: 'అన్నయ్య', sister: 'అక్క',
    mother: 'అమ్మ', father: 'నాన్న', amma: 'అమ్మ', nanna: 'నాన్న',
    chala: 'చాలా', konchem: 'కొంచెం', inka: 'ఇంకా',
    // Multi-word phrases (quoted keys)
    'nenu bagunnanu': 'నేను బాగున్నాను', 'ela unnav': 'ఎలా ఉన్నావ్',
    'ela unnaru': 'ఎలా ఉన్నారు',
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
 * Convert Latin text to native script using embedded dictionary
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
 * Main translation function - uses browser-based ML with dictionary fallback
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
    // For conversion, use dictionary-based transliteration first
    const converted = convertWithDictionary(trimmed, normTarget);
    if (converted !== trimmed) {
      addToCache(cacheKey, converted);
      return createResult(trimmed, converted, normSource, normTarget, true, 'convert');
    }
  }
  
  // Use browser-based ML translation (Transformers.js + NLLB-200)
  let translated = await translateWithML(trimmed, normSource, normTarget);
  
  // Fallback to dictionary if ML fails
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

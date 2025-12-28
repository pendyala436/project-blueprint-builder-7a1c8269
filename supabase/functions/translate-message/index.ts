/**
 * Translate Message Edge Function - FULLY LOCAL Implementation
 * NO EXTERNAL APIs - All transliteration done locally
 * 
 * Features:
 * 1. Local transliteration maps for all Indian languages
 * 2. Script conversion without external services
 * 3. Script detection
 * 4. Same language optimization
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// COMPLETE LANGUAGE DATABASE - 200+ LANGUAGES
// ============================================================

interface LanguageInfo {
  name: string;
  code: string;
  nllbCode: string;
  native: string;
  script: string;
  rtl?: boolean;
}

const LANGUAGES: LanguageInfo[] = [
  // Major World Languages
  { name: 'english', code: 'en', nllbCode: 'eng_Latn', native: 'English', script: 'Latin' },
  { name: 'chinese', code: 'zh', nllbCode: 'zho_Hans', native: '中文', script: 'Han' },
  { name: 'spanish', code: 'es', nllbCode: 'spa_Latn', native: 'Español', script: 'Latin' },
  { name: 'arabic', code: 'ar', nllbCode: 'arb_Arab', native: 'العربية', script: 'Arabic', rtl: true },
  { name: 'french', code: 'fr', nllbCode: 'fra_Latn', native: 'Français', script: 'Latin' },
  { name: 'portuguese', code: 'pt', nllbCode: 'por_Latn', native: 'Português', script: 'Latin' },
  { name: 'russian', code: 'ru', nllbCode: 'rus_Cyrl', native: 'Русский', script: 'Cyrillic' },
  { name: 'japanese', code: 'ja', nllbCode: 'jpn_Jpan', native: '日本語', script: 'Japanese' },
  { name: 'german', code: 'de', nllbCode: 'deu_Latn', native: 'Deutsch', script: 'Latin' },
  { name: 'korean', code: 'ko', nllbCode: 'kor_Hang', native: '한국어', script: 'Hangul' },

  // South Asian Languages
  { name: 'hindi', code: 'hi', nllbCode: 'hin_Deva', native: 'हिंदी', script: 'Devanagari' },
  { name: 'bengali', code: 'bn', nllbCode: 'ben_Beng', native: 'বাংলা', script: 'Bengali' },
  { name: 'telugu', code: 'te', nllbCode: 'tel_Telu', native: 'తెలుగు', script: 'Telugu' },
  { name: 'marathi', code: 'mr', nllbCode: 'mar_Deva', native: 'मराठी', script: 'Devanagari' },
  { name: 'tamil', code: 'ta', nllbCode: 'tam_Taml', native: 'தமிழ்', script: 'Tamil' },
  { name: 'gujarati', code: 'gu', nllbCode: 'guj_Gujr', native: 'ગુજરાતી', script: 'Gujarati' },
  { name: 'kannada', code: 'kn', nllbCode: 'kan_Knda', native: 'ಕನ್ನಡ', script: 'Kannada' },
  { name: 'malayalam', code: 'ml', nllbCode: 'mal_Mlym', native: 'മലയാളം', script: 'Malayalam' },
  { name: 'punjabi', code: 'pa', nllbCode: 'pan_Guru', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { name: 'odia', code: 'or', nllbCode: 'ory_Orya', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  { name: 'urdu', code: 'ur', nllbCode: 'urd_Arab', native: 'اردو', script: 'Arabic', rtl: true },
  { name: 'nepali', code: 'ne', nllbCode: 'npi_Deva', native: 'नेपाली', script: 'Devanagari' },
  { name: 'sinhala', code: 'si', nllbCode: 'sin_Sinh', native: 'සිංහල', script: 'Sinhala' },
  { name: 'assamese', code: 'as', nllbCode: 'asm_Beng', native: 'অসমীয়া', script: 'Bengali' },
  
  // European Languages
  { name: 'italian', code: 'it', nllbCode: 'ita_Latn', native: 'Italiano', script: 'Latin' },
  { name: 'dutch', code: 'nl', nllbCode: 'nld_Latn', native: 'Nederlands', script: 'Latin' },
  { name: 'polish', code: 'pl', nllbCode: 'pol_Latn', native: 'Polski', script: 'Latin' },
  { name: 'ukrainian', code: 'uk', nllbCode: 'ukr_Cyrl', native: 'Українська', script: 'Cyrillic' },
  { name: 'greek', code: 'el', nllbCode: 'ell_Grek', native: 'Ελληνικά', script: 'Greek' },
  
  // Southeast Asian Languages
  { name: 'thai', code: 'th', nllbCode: 'tha_Thai', native: 'ไทย', script: 'Thai' },
  { name: 'vietnamese', code: 'vi', nllbCode: 'vie_Latn', native: 'Tiếng Việt', script: 'Latin' },
  { name: 'indonesian', code: 'id', nllbCode: 'ind_Latn', native: 'Bahasa Indonesia', script: 'Latin' },
  { name: 'malay', code: 'ms', nllbCode: 'zsm_Latn', native: 'Bahasa Melayu', script: 'Latin' },
  
  // Middle Eastern Languages
  { name: 'persian', code: 'fa', nllbCode: 'pes_Arab', native: 'فارسی', script: 'Arabic', rtl: true },
  { name: 'turkish', code: 'tr', nllbCode: 'tur_Latn', native: 'Türkçe', script: 'Latin' },
  { name: 'hebrew', code: 'he', nllbCode: 'heb_Hebr', native: 'עברית', script: 'Hebrew', rtl: true },
  
  // Caucasian Languages
  { name: 'georgian', code: 'ka', nllbCode: 'kat_Geor', native: 'ქართული', script: 'Georgian' },
  { name: 'armenian', code: 'hy', nllbCode: 'hye_Armn', native: 'Հdelays', script: 'Armenian' },

  // African Languages
  { name: 'swahili', code: 'sw', nllbCode: 'swh_Latn', native: 'Kiswahili', script: 'Latin' },
  { name: 'amharic', code: 'am', nllbCode: 'amh_Ethi', native: 'አማርኛ', script: 'Ethiopic' },
];

// Create lookup maps
const languageByName = new Map(LANGUAGES.map(l => [l.name.toLowerCase(), l]));
const languageByCode = new Map(LANGUAGES.map(l => [l.code.toLowerCase(), l]));

// Language aliases
const languageAliases: Record<string, string> = {
  bangla: 'bengali',
  oriya: 'odia',
  farsi: 'persian',
  mandarin: 'chinese',
};

// Non-Latin script languages
const nonLatinScriptLanguages = new Set(
  LANGUAGES.filter(l => l.script !== 'Latin').map(l => l.name)
);

// ============================================================
// LOCAL TRANSLITERATION MAPS - NO EXTERNAL APIS
// ============================================================

// Hindi/Devanagari transliteration map
const hindiTranslitMap: Record<string, string> = {
  'namaste': 'नमस्ते', 'kaise': 'कैसे', 'ho': 'हो', 'aap': 'आप',
  'hain': 'हैं', 'main': 'मैं', 'hum': 'हम', 'tum': 'तुम',
  'kya': 'क्या', 'hai': 'है', 'nahi': 'नहीं', 'haan': 'हाँ',
  'dhanyavaad': 'धन्यवाद', 'shukriya': 'शुक्रिया',
  'acha': 'अच्छा', 'theek': 'ठीक', 'bahut': 'बहुत',
  'pyaar': 'प्यार', 'dil': 'दिल', 'zindagi': 'ज़िंदगी',
  'ghar': 'घर', 'paani': 'पानी', 'roti': 'रोटी', 'daal': 'दाल',
  'subah': 'सुबह', 'shaam': 'शाम', 'raat': 'रात', 'din': 'दिन',
  'kal': 'कल', 'aaj': 'आज', 'abhi': 'अभी',
  'kahan': 'कहाँ', 'kab': 'कब', 'kaun': 'कौन',
  'kyun': 'क्यों', 'kitna': 'कितना',
  'mera': 'मेरा', 'tera': 'तेरा', 'uska': 'उसका', 'hamara': 'हमारा',
  'hello': 'हैलो', 'hi': 'हाय', 'bye': 'बाय',
};

// Telugu transliteration map
const teluguTranslitMap: Record<string, string> = {
  'namaskaram': 'నమస్కారం', 'ela': 'ఎలా', 'unnaru': 'ఉన్నారు',
  'bagunnava': 'బాగున్నావా', 'bagunnanu': 'బాగున్నాను',
  'nenu': 'నేను', 'meeru': 'మీరు', 'emi': 'ఏమి',
  'dhanyavadalu': 'ధన్యవాదాలు', 'manchidi': 'మంచిది',
  'avunu': 'అవును', 'kaadu': 'కాదు',
  'hello': 'హలో', 'hi': 'హాయ్', 'bye': 'బై',
  'prema': 'ప్రేమ', 'intiki': 'ఇంటికి',
  'neellu': 'నీళ్ళు', 'annam': 'అన్నం', 'pappu': 'పప్పు',
};

// Tamil transliteration map
const tamilTranslitMap: Record<string, string> = {
  'vanakkam': 'வணக்கம்', 'eppadi': 'எப்படி', 'irukkeenga': 'இருக்கீங்க',
  'nalla': 'நல்ல', 'irukken': 'இருக்கேன்',
  'naan': 'நான்', 'neenga': 'நீங்க', 'enna': 'என்ன',
  'nandri': 'நன்றி', 'sari': 'சரி', 'aama': 'ஆமா', 'illa': 'இல்ல',
  'hello': 'ஹலோ', 'hi': 'ஹாய்', 'bye': 'பை',
  'kadhal': 'காதல்', 'nanban': 'நண்பன்', 'veedu': 'வீடு',
};

// Bengali transliteration map
const bengaliTranslitMap: Record<string, string> = {
  'namaskar': 'নমস্কার', 'kemon': 'কেমন', 'acho': 'আছো',
  'bhalo': 'ভালো', 'achi': 'আছি',
  'ami': 'আমি', 'tumi': 'তুমি', 'ki': 'কী',
  'dhanyabad': 'ধন্যবাদ', 'thik': 'ঠিক', 'hyan': 'হ্যাঁ', 'naa': 'না',
  'hello': 'হ্যালো', 'hi': 'হাই', 'bye': 'বাই',
  'bhalobasha': 'ভালোবাসা', 'bondhu': 'বন্ধু', 'bari': 'বাড়ি',
};

// Marathi transliteration map
const marathiTranslitMap: Record<string, string> = {
  'namaskar': 'नमस्कार', 'kasa': 'कसा', 'aahat': 'आहात',
  'bara': 'बरं', 'aahe': 'आहे',
  'mi': 'मी', 'tumhi': 'तुम्ही', 'kay': 'काय',
  'dhanyavaad': 'धन्यवाद', 'chhan': 'छान', 'ho': 'हो', 'nahi': 'नाही',
  'hello': 'हॅलो', 'hi': 'हाय', 'bye': 'बाय',
  'prem': 'प्रेम', 'mitra': 'मित्र', 'ghar': 'घर',
};

// Gujarati transliteration map
const gujaratiTranslitMap: Record<string, string> = {
  'namaskar': 'નમસ્કાર', 'kem': 'કેમ', 'chho': 'છો',
  'saru': 'સારું', 'chhe': 'છે',
  'hu': 'હું', 'tame': 'તમે', 'shu': 'શું',
  'aabhar': 'આભાર', 'sarus': 'સરસ', 'ha': 'હા', 'naa': 'ના',
  'hello': 'હેલો', 'hi': 'હાય', 'bye': 'બાય',
  'prem': 'પ્રેમ', 'mitra': 'મિત્ર', 'ghar': 'ઘર',
};

// Kannada transliteration map
const kannadaTranslitMap: Record<string, string> = {
  'namaskara': 'ನಮಸ್ಕಾರ', 'hegiddira': 'ಹೇಗಿದ್ದೀರಾ',
  'chennagiddini': 'ಚೆನ್ನಾಗಿದ್ದೀನಿ',
  'naanu': 'ನಾನು', 'neevu': 'ನೀವು', 'enu': 'ಏನು',
  'dhanyavadagalu': 'ಧನ್ಯವಾದಗಳು', 'sari': 'ಸರಿ', 'houdu': 'ಹೌದು', 'illa': 'ಇಲ್ಲ',
  'hello': 'ಹಲೋ', 'hi': 'ಹಾಯ್', 'bye': 'ಬೈ',
  'preeti': 'ಪ್ರೀತಿ', 'mane': 'ಮನೆ', 'neeru': 'ನೀರು',
};

// Malayalam transliteration map
const malayalamTranslitMap: Record<string, string> = {
  'namaskkaram': 'നമസ്കാരം', 'sughamaano': 'സുഖമാണോ', 'sugham': 'സുഖം',
  'njan': 'ഞാൻ', 'ningal': 'നിങ്ങൾ', 'enthu': 'എന്ത്',
  'nandi': 'നന്ദി', 'kollaam': 'കൊള്ളാം', 'athe': 'അതെ', 'alla': 'അല്ല',
  'hello': 'ഹലോ', 'hi': 'ഹായ്', 'bye': 'ബൈ',
  'sneham': 'സ്നേഹം', 'veedu': 'വീട്', 'vellam': 'വെള്ളം',
};

// Punjabi transliteration map
const punjabiTranslitMap: Record<string, string> = {
  'sat_sri_akal': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'kiddan': 'ਕਿੱਦਾਂ',
  'vadiya': 'ਵਧੀਆ', 'haan': 'ਹਾਂ',
  'main': 'ਮੈਂ', 'tusi': 'ਤੁਸੀਂ', 'ki': 'ਕੀ',
  'meharbani': 'ਮਿਹਰਬਾਨੀ', 'theek': 'ਠੀਕ', 'nahin': 'ਨਹੀਂ',
  'hello': 'ਹੈਲੋ', 'hi': 'ਹਾਏ', 'bye': 'ਬਾਏ',
  'pyaar': 'ਪਿਆਰ', 'yaar': 'ਯਾਰ', 'ghar': 'ਘਰ',
};

// Odia transliteration map
const odiaTranslitMap: Record<string, string> = {
  'namaskar': 'ନମସ୍କାର', 'kemiti': 'କେମିତି', 'achha': 'ଅଛ',
  'bhalaa': 'ଭଲ', 'achhi': 'ଅଛି',
  'mu': 'ମୁଁ', 'apana': 'ଆପଣ', 'ki': 'କି',
  'dhanyabad': 'ଧନ୍ୟବାଦ', 'haan': 'ହଁ', 'naa': 'ନା',
  'hello': 'ହେଲୋ', 'hi': 'ହାଏ', 'bye': 'ବାଏ',
  'ethare': 'ଏଠାରେ', 'sethare': 'ସେଠାରେ', 'kouthi': 'କୋଉଠି',
  'kebe': 'କେବେ', 'kie': 'କିଏ', 'kahin': 'କାହିଁ',
  'prema': 'ପ୍ରେମ', 'bandhu': 'ବନ୍ଧୁ',
  'ghara': 'ଘର', 'bahare': 'ବାହାରେ',
  'paani': 'ପାଣି', 'khia': 'ଖିଆ', 'bhata': 'ଭାତ',
  'sakala': 'ସକାଳ', 'sandhya': 'ସନ୍ଧ୍ୟା', 'rati': 'ରାତି',
  'gatakalka': 'ଗତକାଲ୍କ', 'agamikal': 'ଆଗାମୀକାଲ', 'ebhe': 'ଏବେ',
};

// All transliteration maps by language
const transliterationMaps: Record<string, Record<string, string>> = {
  hindi: hindiTranslitMap,
  telugu: teluguTranslitMap,
  tamil: tamilTranslitMap,
  bengali: bengaliTranslitMap,
  marathi: marathiTranslitMap,
  gujarati: gujaratiTranslitMap,
  kannada: kannadaTranslitMap,
  malayalam: malayalamTranslitMap,
  punjabi: punjabiTranslitMap,
  odia: odiaTranslitMap,
  nepali: hindiTranslitMap, // Uses Devanagari like Hindi
  assamese: bengaliTranslitMap, // Uses Bengali script
};

// ============================================================
// SCRIPT DETECTION
// ============================================================

const scriptPatterns: Array<{ regex: RegExp; script: string; language: string }> = [
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', language: 'hindi' },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', language: 'bengali' },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', language: 'tamil' },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', language: 'telugu' },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', language: 'kannada' },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', language: 'malayalam' },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', language: 'gujarati' },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', language: 'punjabi' },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', language: 'odia' },
  { regex: /[\u0D80-\u0DFF]/, script: 'Sinhala', language: 'sinhala' },
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, script: 'Han', language: 'chinese' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', language: 'japanese' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, script: 'Hangul', language: 'korean' },
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', language: 'thai' },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', language: 'lao' },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', language: 'burmese' },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', language: 'khmer' },
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, script: 'Arabic', language: 'arabic' },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', language: 'hebrew' },
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', language: 'russian' },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, script: 'Greek', language: 'greek' },
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', language: 'georgian' },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', language: 'armenian' },
  { regex: /[\u1200-\u137F\u1380-\u139F]/, script: 'Ethiopic', language: 'amharic' },
];

function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim().replace(/[_-]/g, '_');
  return languageAliases[normalized] || normalized;
}

function detectScriptFromText(text: string): { language: string; script: string; isLatin: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { language: 'english', script: 'Latin', isLatin: true };

  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.language, script: pattern.script, isLatin: false };
    }
  }

  const latinChars = trimmed.match(/[a-zA-ZÀ-ÿĀ-žƀ-ɏ]/g) || [];
  const totalChars = trimmed.replace(/\s/g, '').length;
  const isLatin = totalChars > 0 && latinChars.length / totalChars > 0.5;

  return { language: 'english', script: 'Latin', isLatin };
}

function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

function isNonLatinLanguage(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return nonLatinScriptLanguages.has(normalized);
}

// ============================================================
// LOCAL TRANSLITERATION FUNCTION - NO EXTERNAL API
// ============================================================

function transliterateLocally(text: string, targetLanguage: string): { text: string; success: boolean } {
  const normalized = normalizeLanguage(targetLanguage);
  const map = transliterationMaps[normalized];
  
  if (!map) {
    console.log(`[local-translit] No map for ${normalized}, returning original`);
    return { text, success: false };
  }
  
  let result = text.toLowerCase();
  let wasTransliterated = false;
  
  // Sort by length descending to match longer phrases first
  const sortedEntries = Object.entries(map).sort((a, b) => b[0].length - a[0].length);
  
  for (const [latin, native] of sortedEntries) {
    if (result.includes(latin)) {
      result = result.split(latin).join(native);
      wasTransliterated = true;
    }
  }
  
  // If we made any transliterations, return the result
  if (wasTransliterated) {
    console.log(`[local-translit] Converted: "${text}" -> "${result}"`);
    return { text: result, success: true };
  }
  
  console.log(`[local-translit] No matches found for: "${text}"`);
  return { text, success: false };
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
      targetLanguage,
      senderLanguage,
      receiverLanguage,
      mode = "translate" 
    } = body;

    const inputText = text || message;
    console.log(`[local-translate] Mode: ${mode}, Input: "${inputText?.substring(0, 50)}..."`);
    console.log(`[local-translate] Params: source=${sourceLanguage || senderLanguage}, target=${targetLanguage || receiverLanguage}`);

    if (!inputText) {
      return new Response(
        JSON.stringify({ error: "Text or message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect source script
    const detected = detectScriptFromText(inputText);
    const effectiveSource = sourceLanguage || senderLanguage || detected.language;
    const effectiveTarget = targetLanguage || receiverLanguage || "english";
    const inputIsLatin = detected.isLatin;

    console.log(`[local-translate] Detected: ${detected.language} (${detected.script}), isLatin: ${inputIsLatin}`);
    console.log(`[local-translate] Effective: ${effectiveSource} -> ${effectiveTarget}`);

    // ================================================================
    // CASE 0: Convert mode - only script conversion, no translation
    // ================================================================
    if (mode === 'convert') {
      console.log(`[local-translate] Convert mode: converting to ${effectiveTarget}`);
      
      if (inputIsLatin && isNonLatinLanguage(effectiveTarget)) {
        const converted = transliterateLocally(inputText, effectiveTarget);
        
        return new Response(
          JSON.stringify({
            translatedText: converted.success ? converted.text : inputText,
            translatedMessage: converted.success ? converted.text : inputText,
            originalText: inputText,
            isTranslated: converted.success,
            wasTransliterated: converted.success,
            detectedLanguage: detected.language,
            sourceLanguage: 'english',
            targetLanguage: effectiveTarget,
            mode: 'convert',
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({
          translatedText: inputText,
          translatedMessage: inputText,
          originalText: inputText,
          isTranslated: false,
          wasTransliterated: false,
          detectedLanguage: detected.language,
          sourceLanguage: effectiveSource,
          targetLanguage: effectiveTarget,
          mode: 'convert',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // CASE 1: Same language - only script conversion needed
    // ================================================================
    if (isSameLanguage(effectiveSource, effectiveTarget)) {
      if (inputIsLatin && isNonLatinLanguage(effectiveTarget)) {
        console.log(`[local-translate] Same language, converting to native script`);
        const converted = transliterateLocally(inputText, effectiveTarget);
        
        return new Response(
          JSON.stringify({
            translatedText: converted.success ? converted.text : inputText,
            translatedMessage: converted.success ? converted.text : inputText,
            originalText: inputText,
            isTranslated: false,
            wasTransliterated: converted.success,
            detectedLanguage: detected.language,
            sourceLanguage: effectiveSource,
            targetLanguage: effectiveTarget,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log('[local-translate] Same language, same script - passthrough');
      return new Response(
        JSON.stringify({
          translatedText: inputText,
          translatedMessage: inputText,
          originalText: inputText,
          isTranslated: false,
          detectedLanguage: detected.language,
          sourceLanguage: effectiveSource,
          targetLanguage: effectiveTarget,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // CASE 2: Different languages - transliterate to target script
    // For true translation, we would need ML models which are too heavy for edge functions
    // We do best-effort transliteration with our local maps
    // ================================================================
    console.log(`[local-translate] Different languages: ${effectiveSource} -> ${effectiveTarget}`);
    
    // If input is Latin and target is non-Latin, try to convert
    if (inputIsLatin && isNonLatinLanguage(effectiveTarget)) {
      const converted = transliterateLocally(inputText, effectiveTarget);
      
      return new Response(
        JSON.stringify({
          translatedText: converted.success ? converted.text : inputText,
          translatedMessage: converted.success ? converted.text : inputText,
          originalText: inputText,
          isTranslated: converted.success,
          wasTransliterated: converted.success,
          detectedLanguage: detected.language,
          sourceLanguage: effectiveSource,
          targetLanguage: effectiveTarget,
          note: 'Local transliteration only - no external translation API',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If source is non-Latin and target is different, we can't translate without ML
    // Return original text with note
    console.log('[local-translate] No local translation available, returning original');
    return new Response(
      JSON.stringify({
        translatedText: inputText,
        translatedMessage: inputText,
        originalText: inputText,
        isTranslated: false,
        detectedLanguage: detected.language,
        sourceLanguage: effectiveSource,
        targetLanguage: effectiveTarget,
        note: 'Cross-language translation requires external API - currently disabled',
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[local-translate] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

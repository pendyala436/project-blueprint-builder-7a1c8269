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
 */
function looksLikeEnglish(text: string): boolean {
  const lowered = text.toLowerCase().trim();
  const englishWords = [
    'hello', 'hi', 'how', 'are', 'you', 'what', 'where', 'when', 'why', 'who',
    'the', 'is', 'a', 'an', 'to', 'for', 'in', 'on', 'with', 'good', 'morning',
    'yes', 'no', 'ok', 'okay', 'thank', 'thanks', 'please', 'sorry', 'bye',
    'love', 'like', 'want', 'need', 'can', 'will', 'have', 'do', 'did',
    'my', 'your', 'our', 'their', 'his', 'her', 'this', 'that',
    'and', 'or', 'but', 'if', 'because', 'so', 'very', 'really', 'just'
  ];
  
  const words = lowered.split(/\s+/);
  const englishWordCount = words.filter(w => englishWords.includes(w)).length;
  
  return words.length > 0 && (englishWordCount / words.length) >= 0.3;
}

/**
 * Clean text output (remove artifacts)
 */
function cleanTextOutput(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
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
 * Transliterate Latin input to native script
 * Uses English as intermediate: Latin → English → Native
 */
async function transliterateToNative(
  latinText: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean }> {
  
  if (isEnglishLanguage(targetLanguage)) {
    return { text: latinText, success: false };
  }
  
  console.log(`[Transliterate] "${latinText.substring(0, 30)}..." → ${targetLanguage}`);
  
  // Translate English → Native to get native script
  const result = await callDLTranslate(latinText, 'english', targetLanguage);
  
  if (result.success && result.translatedText !== latinText) {
    // Verify result contains non-Latin characters
    const hasNonLatin = /[^\x00-\x7F]/.test(result.translatedText);
    if (hasNonLatin || !isNonLatinLanguage(targetLanguage)) {
      console.log(`[Transliterate] Success: "${result.translatedText.substring(0, 30)}..."`);
      return { text: result.translatedText, success: true };
    }
  }
  
  console.log(`[Transliterate] Failed, keeping original`);
  return { text: latinText, success: false };
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
    // ================================================================
    if (mode === "bidirectional") {
      const langA = effectiveSourceParam || "english";
      const langB = effectiveTargetParam || "english";
      
      console.log(`[bidirectional] sender=${langA}, receiver=${langB}`);
      
      const inputDetected = detectScriptFromText(inputText);
      const inputIsLatin = inputDetected.isLatin;
      const senderIsNonLatin = isNonLatinLanguage(langA);
      const senderIsEnglish = isEnglishLanguage(langA);
      const receiverIsEnglish = isEnglishLanguage(langB);
      const sameLanguage = isSameLanguage(langA, langB);
      
      // ===================================
      // STEP 1: Process sender's input
      // ===================================
      let englishCore = inputText;
      let senderNativeText = inputText;
      
      if (senderIsEnglish) {
        // Sender speaks English
        englishCore = inputText;
        senderNativeText = inputText;
        console.log(`[bidirectional] Sender is English speaker`);
        
      } else if (inputIsLatin && senderIsNonLatin) {
        // Sender typed Latin but speaks non-Latin language
        const isActualEnglish = looksLikeEnglish(inputText);
        console.log(`[bidirectional] Latin input from non-Latin speaker, isEnglish=${isActualEnglish}`);
        
        if (isActualEnglish) {
          // User typed actual English - translate to sender's native
          englishCore = inputText;
          const toSenderNative = await translateText(inputText, 'english', langA);
          if (toSenderNative.success && toSenderNative.translatedText !== inputText) {
            senderNativeText = toSenderNative.translatedText;
          }
        } else {
          // Romanized native text - transliterate + get English meaning
          const translitResult = await transliterateToNative(inputText, langA);
          if (translitResult.success) {
            senderNativeText = translitResult.text;
          }
          
          // Get English meaning
          const toEnglish = await translateText(senderNativeText, langA, 'english');
          if (toEnglish.success && toEnglish.translatedText !== senderNativeText) {
            englishCore = toEnglish.translatedText;
          }
        }
        
      } else if (!inputIsLatin) {
        // Native script input (Gboard, IME)
        senderNativeText = inputText;
        const toEnglish = await translateText(inputText, langA, 'english');
        if (toEnglish.success && toEnglish.translatedText !== inputText) {
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

/**
 * Translate Message Edge Function
 * Uses LibreTranslate (Open-Source) for unlimited free translation
 * Supports transliteration + translation workflow
 * 
 * Flow for romanized input:
 * 1. User types "bagunnava" (Telugu in Latin script)
 * 2. First transliterate to Telugu script: "బాగున్నావా"
 * 3. Then translate from Telugu to Bengali: "ভালো আছো"
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// LibreTranslate public mirrors (free, unlimited)
const LIBRE_TRANSLATE_MIRRORS = [
  "https://libretranslate.com",
  "https://translate.argosopentech.com",
  "https://translate.terraprint.co",
];

// Complete script detection for ALL world languages
const scriptPatterns = [
  // South Asian
  { regex: /[\u0900-\u097F]/, language: "hindi", libreCode: "hi" },
  { regex: /[\u0980-\u09FF]/, language: "bengali", libreCode: "bn" },
  { regex: /[\u0C00-\u0C7F]/, language: "telugu", libreCode: "te" },
  { regex: /[\u0B80-\u0BFF]/, language: "tamil", libreCode: "ta" },
  { regex: /[\u0A80-\u0AFF]/, language: "gujarati", libreCode: "gu" },
  { regex: /[\u0C80-\u0CFF]/, language: "kannada", libreCode: "kn" },
  { regex: /[\u0D00-\u0D7F]/, language: "malayalam", libreCode: "ml" },
  { regex: /[\u0A00-\u0A7F]/, language: "punjabi", libreCode: "pa" },
  { regex: /[\u0B00-\u0B7F]/, language: "odia", libreCode: "or" },
  { regex: /[\u0D80-\u0DFF]/, language: "sinhala", libreCode: "si" },
  // East Asian
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: "chinese", libreCode: "zh" },
  { regex: /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/, language: "japanese", libreCode: "ja" },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: "korean", libreCode: "ko" },
  // Southeast Asian
  { regex: /[\u0E00-\u0E7F]/, language: "thai", libreCode: "th" },
  { regex: /[\u0E80-\u0EFF]/, language: "lao", libreCode: "lo" },
  { regex: /[\u1000-\u109F]/, language: "burmese", libreCode: "my" },
  { regex: /[\u1780-\u17FF]/, language: "khmer", libreCode: "km" },
  { regex: /[\u1A00-\u1A1F]/, language: "buginese", libreCode: "bug" },
  { regex: /[\u1B00-\u1B7F]/, language: "balinese", libreCode: "ban" },
  { regex: /[\uA980-\uA9DF]/, language: "javanese", libreCode: "jv" },
  // Middle Eastern
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, language: "arabic", libreCode: "ar" },
  { regex: /[\u0590-\u05FF]/, language: "hebrew", libreCode: "he" },
  { regex: /[\u0700-\u074F]/, language: "syriac", libreCode: "syr" },
  // Cyrillic
  { regex: /[\u0400-\u04FF]/, language: "russian", libreCode: "ru" },
  // Greek
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, language: "greek", libreCode: "el" },
  // Caucasian
  { regex: /[\u10A0-\u10FF]/, language: "georgian", libreCode: "ka" },
  { regex: /[\u0530-\u058F]/, language: "armenian", libreCode: "hy" },
  // African
  { regex: /[\u1200-\u137F\u1380-\u139F]/, language: "amharic", libreCode: "am" },
  { regex: /[\u2D30-\u2D7F]/, language: "tifinagh", libreCode: "ber" },
  // Indic Extended
  { regex: /[\u0F00-\u0FFF]/, language: "tibetan", libreCode: "bo" },
  { regex: /[\u1900-\u194F]/, language: "limbu", libreCode: "lif" },
  { regex: /[\uABC0-\uABFF]/, language: "meetei_mayek", libreCode: "mni" },
];

// Language name to LibreTranslate code mapping
const languageToLibreCode: Record<string, string> = {
  english: "en",
  hindi: "hi",
  bengali: "bn",
  telugu: "te",
  tamil: "ta",
  gujarati: "gu",
  kannada: "kn",
  malayalam: "ml",
  punjabi: "pa",
  odia: "or",
  marathi: "mr",
  urdu: "ur",
  nepali: "ne",
  sinhala: "si",
  chinese: "zh",
  japanese: "ja",
  korean: "ko",
  thai: "th",
  vietnamese: "vi",
  indonesian: "id",
  malay: "ms",
  tagalog: "tl",
  arabic: "ar",
  persian: "fa",
  hebrew: "he",
  turkish: "tr",
  russian: "ru",
  ukrainian: "uk",
  polish: "pl",
  czech: "cs",
  slovak: "sk",
  hungarian: "hu",
  romanian: "ro",
  bulgarian: "bg",
  serbian: "sr",
  croatian: "hr",
  slovenian: "sl",
  greek: "el",
  german: "de",
  french: "fr",
  spanish: "es",
  portuguese: "pt",
  italian: "it",
  dutch: "nl",
  swedish: "sv",
  danish: "da",
  norwegian: "no",
  finnish: "fi",
  estonian: "et",
  latvian: "lv",
  lithuanian: "lt",
  icelandic: "is",
  irish: "ga",
  welsh: "cy",
  catalan: "ca",
  basque: "eu",
  galician: "gl",
  albanian: "sq",
  georgian: "ka",
  armenian: "hy",
  azerbaijani: "az",
  kazakh: "kk",
  uzbek: "uz",
  swahili: "sw",
  amharic: "am",
  somali: "so",
  hausa: "ha",
  yoruba: "yo",
  igbo: "ig",
  zulu: "zu",
  xhosa: "xh",
  afrikaans: "af",
  javanese: "jv",
  sundanese: "su",
  burmese: "my",
  khmer: "km",
  lao: "lo",
  mongolian: "mn",
  tibetan: "bo",
};

// Language aliases
const languageAliases: Record<string, string> = {
  bangla: "bengali",
  oriya: "odia",
  farsi: "persian",
  mandarin: "chinese",
  cantonese: "chinese",
  taiwanese: "chinese",
  brazilian: "portuguese",
  mexican: "spanish",
  flemish: "dutch",
};

// Languages that use non-Latin scripts
const nonLatinLanguages = new Set([
  "hindi", "bengali", "telugu", "tamil", "gujarati", "kannada", "malayalam",
  "punjabi", "odia", "marathi", "urdu", "nepali", "sinhala",
  "chinese", "japanese", "korean", "thai", "burmese", "khmer", "lao",
  "arabic", "persian", "hebrew", "russian", "ukrainian", "bulgarian",
  "greek", "georgian", "armenian", "amharic", "tibetan"
]);

function detectLanguageFromText(text: string): { language: string; isLatin: boolean; libreCode: string } {
  const trimmed = text.trim();
  if (!trimmed) return { language: "english", isLatin: true, libreCode: "en" };

  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.language, isLatin: false, libreCode: pattern.libreCode };
    }
  }

  const latinChars = trimmed.match(/[a-zA-ZÀ-ÿĀ-žƀ-ɏ]/g) || [];
  const totalChars = trimmed.replace(/\s/g, '').length;
  const isLatin = totalChars > 0 && latinChars.length / totalChars > 0.5;

  return { language: "english", isLatin, libreCode: "en" };
}

function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim().replace(/[_-]/g, '_');
  return languageAliases[normalized] || normalized;
}

function getLibreCode(language: string): string {
  const normalized = normalizeLanguage(language);
  return languageToLibreCode[normalized] || "en";
}

function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

function isLatinScript(text: string): boolean {
  const detected = detectLanguageFromText(text);
  return detected.isLatin;
}

function isNonLatinLanguage(language: string): boolean {
  return nonLatinLanguages.has(normalizeLanguage(language));
}

// Translate using LibreTranslate API (open-source, free)
async function translateWithLibre(
  text: string,
  sourceCode: string,
  targetCode: string
): Promise<{ translatedText: string; success: boolean }> {
  // Try each mirror until one works
  for (const mirror of LIBRE_TRANSLATE_MIRRORS) {
    try {
      console.log(`[translate-message] Trying LibreTranslate mirror: ${mirror}`);
      
      const response = await fetch(`${mirror}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceCode === "auto" ? "auto" : sourceCode,
          target: targetCode,
          format: "text",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.translatedText) {
          console.log(`[translate-message] LibreTranslate success via ${mirror}`);
          return { translatedText: data.translatedText, success: true };
        }
      }
    } catch (error) {
      console.log(`[translate-message] Mirror ${mirror} failed, trying next...`);
    }
  }

  // Fallback: Use MyMemory Translation API (free, open)
  try {
    console.log('[translate-message] Trying MyMemory fallback...');
    const langPair = `${sourceCode === "auto" ? "en" : sourceCode}|${targetCode}`;
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.responseData?.translatedText) {
        console.log('[translate-message] MyMemory translation success');
        return { translatedText: data.responseData.translatedText, success: true };
      }
    }
  } catch (error) {
    console.log('[translate-message] MyMemory fallback failed');
  }

  return { translatedText: text, success: false };
}

/**
 * Transliterate Latin text to native script using translation
 * This converts "bagunnava" → "బాగున్నావా" by translating from English
 */
async function transliterateToNativeScript(
  latinText: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean }> {
  const targetCode = getLibreCode(targetLanguage);
  
  console.log(`[translate-message] Transliterating to ${targetLanguage} (${targetCode})`);
  
  // Use translation from English to target language
  // This effectively transliterates common phrases and words
  const result = await translateWithLibre(latinText, "en", targetCode);
  
  // If the result is still in Latin, the transliteration didn't work
  if (result.success && !isLatinScript(result.translatedText)) {
    return { text: result.translatedText, success: true };
  }
  
  return { text: latinText, success: false };
}

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
    console.log(`[translate-message] Mode: ${mode}, Input: "${inputText?.substring(0, 50)}"`);

    if (!inputText) {
      return new Response(
        JSON.stringify({ error: "Text or message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect source language from text
    const detected = detectLanguageFromText(inputText);
    const effectiveSource = sourceLanguage || senderLanguage || detected.language;
    const effectiveTarget = targetLanguage || receiverLanguage || "english";
    const inputIsLatin = detected.isLatin;

    console.log(`[translate-message] Detected: ${detected.language}, isLatin: ${inputIsLatin}`);
    console.log(`[translate-message] Source: ${effectiveSource}, Target: ${effectiveTarget}`);

    // Special case: Latin input but source is non-Latin language
    // This means user typed romanized text (e.g., "bagunnava" for Telugu)
    // We need to:
    // 1. First convert to source language script (transliterate)
    // 2. Then translate to target language
    if (inputIsLatin && isNonLatinLanguage(effectiveSource) && !isSameLanguage(effectiveSource, effectiveTarget)) {
      console.log(`[translate-message] Romanized input detected for ${effectiveSource}`);
      
      // Step 1: Transliterate Latin to source language script
      // e.g., "bagunnava" → translate to Telugu → "బాగున్నావా"
      const transliterated = await transliterateToNativeScript(inputText, effectiveSource);
      
      if (transliterated.success) {
        console.log(`[translate-message] Transliterated: "${inputText}" → "${transliterated.text}"`);
        
        // Step 2: Now translate from source native script to target language
        const sourceCode = getLibreCode(effectiveSource);
        const targetCode = getLibreCode(effectiveTarget);
        
        console.log(`[translate-message] Now translating ${sourceCode} → ${targetCode}`);
        
        const { translatedText, success } = await translateWithLibre(
          transliterated.text,
          sourceCode,
          targetCode
        );

        console.log(`[translate-message] Final translation: "${transliterated.text}" → "${translatedText}"`);

        return new Response(
          JSON.stringify({
            translatedText,
            translatedMessage: translatedText,
            originalText: inputText,
            nativeScriptText: transliterated.text, // The intermediate native script version
            isTranslated: success && translatedText !== transliterated.text,
            wasTransliterated: true,
            detectedLanguage: effectiveSource,
            sourceLanguage: effectiveSource,
            targetLanguage: effectiveTarget,
            isSourceLatin: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Transliteration failed, try direct translation as fallback
      console.log(`[translate-message] Transliteration failed, trying direct translation`);
    }

    // Same language - no translation needed (but may need script conversion)
    if (isSameLanguage(effectiveSource, effectiveTarget)) {
      // If input is Latin but target is non-Latin, convert to native script
      if (inputIsLatin && isNonLatinLanguage(effectiveTarget)) {
        console.log(`[translate-message] Same language, converting to native script`);
        const converted = await transliterateToNativeScript(inputText, effectiveTarget);
        
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
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log('[translate-message] Same language, skipping translation');
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

    // Standard translation: Get LibreTranslate codes and translate
    const sourceCode = detected.isLatin ? "en" : getLibreCode(effectiveSource);
    const targetCode = getLibreCode(effectiveTarget);

    console.log(`[translate-message] LibreTranslate: ${sourceCode} -> ${targetCode}`);

    // Translate using LibreTranslate (open-source, free, unlimited)
    const { translatedText, success } = await translateWithLibre(inputText, sourceCode, targetCode);

    console.log(`[translate-message] Translation ${success ? 'complete' : 'fallback'}: "${inputText.substring(0, 30)}..." -> "${translatedText.substring(0, 30)}..."`);

    return new Response(
      JSON.stringify({
        translatedText,
        translatedMessage: translatedText,
        originalText: inputText,
        isTranslated: translatedText !== inputText && success,
        detectedLanguage: detected.language,
        sourceLanguage: effectiveSource,
        targetLanguage: effectiveTarget,
        isSourceLatin: detected.isLatin,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[translate-message] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

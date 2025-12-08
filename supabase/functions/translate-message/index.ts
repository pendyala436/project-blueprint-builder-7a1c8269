import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Complete NLLB-200 language code mapping
const languageToNLLB: Record<string, string> = {
  // Indian languages
  "hindi": "hin_Deva",
  "bengali": "ben_Beng",
  "bangla": "ben_Beng",
  "telugu": "tel_Telu",
  "tamil": "tam_Taml",
  "marathi": "mar_Deva",
  "gujarati": "guj_Gujr",
  "kannada": "kan_Knda",
  "malayalam": "mal_Mlym",
  "punjabi": "pan_Guru",
  "odia": "ory_Orya",
  "oriya": "ory_Orya",
  "assamese": "asm_Beng",
  "nepali": "npi_Deva",
  "urdu": "urd_Arab",
  "konkani": "gom_Deva",
  "maithili": "mai_Deva",
  "santali": "sat_Olck",
  "bodo": "brx_Deva",
  "dogri": "doi_Deva",
  "kashmiri": "kas_Arab",
  "sindhi": "snd_Arab",
  "manipuri": "mni_Beng",
  "sinhala": "sin_Sinh",
  
  // Major world languages
  "english": "eng_Latn",
  "spanish": "spa_Latn",
  "french": "fra_Latn",
  "german": "deu_Latn",
  "portuguese": "por_Latn",
  "italian": "ita_Latn",
  "dutch": "nld_Latn",
  "russian": "rus_Cyrl",
  "polish": "pol_Latn",
  "ukrainian": "ukr_Cyrl",
  
  // Asian languages
  "chinese": "zho_Hans",
  "mandarin": "zho_Hans",
  "cantonese": "zho_Hant",
  "japanese": "jpn_Jpan",
  "korean": "kor_Hang",
  "vietnamese": "vie_Latn",
  "thai": "tha_Thai",
  "indonesian": "ind_Latn",
  "malay": "zsm_Latn",
  "tagalog": "tgl_Latn",
  "filipino": "tgl_Latn",
  "burmese": "mya_Mymr",
  "khmer": "khm_Khmr",
  "lao": "lao_Laoo",
  
  // Middle Eastern
  "arabic": "arb_Arab",
  "persian": "pes_Arab",
  "farsi": "pes_Arab",
  "turkish": "tur_Latn",
  "hebrew": "heb_Hebr",
  
  // African
  "swahili": "swh_Latn",
  "amharic": "amh_Ethi",
  "yoruba": "yor_Latn",
  "igbo": "ibo_Latn",
  "hausa": "hau_Latn",
  "zulu": "zul_Latn",
  "xhosa": "xho_Latn",
  "afrikaans": "afr_Latn",
  
  // European
  "greek": "ell_Grek",
  "czech": "ces_Latn",
  "romanian": "ron_Latn",
  "hungarian": "hun_Latn",
  "swedish": "swe_Latn",
  "danish": "dan_Latn",
  "finnish": "fin_Latn",
  "norwegian": "nob_Latn",
  "catalan": "cat_Latn",
  "croatian": "hrv_Latn",
  "serbian": "srp_Cyrl",
  "slovak": "slk_Latn",
  "slovenian": "slv_Latn",
  "bulgarian": "bul_Cyrl",
  "lithuanian": "lit_Latn",
  "latvian": "lvs_Latn",
  "estonian": "est_Latn",
  "albanian": "als_Latn",
  "macedonian": "mkd_Cyrl",
  "bosnian": "bos_Latn",
  
  // Central Asian
  "georgian": "kat_Geor",
  "armenian": "hye_Armn",
  "azerbaijani": "azj_Latn",
  "kazakh": "kaz_Cyrl",
  "uzbek": "uzn_Latn",
  "mongolian": "khk_Cyrl",
  "tibetan": "bod_Tibt",
};

// Indian languages list for checking
const INDIAN_LANGUAGES = [
  "hindi", "bengali", "bangla", "telugu", "tamil", "marathi", "gujarati",
  "kannada", "malayalam", "punjabi", "odia", "oriya", "assamese", "nepali",
  "urdu", "konkani", "maithili", "santali", "bodo", "dogri", "kashmiri",
  "sindhi", "manipuri", "sinhala"
];

function getNLLBCode(language: string): string | null {
  const normalizedLang = language.toLowerCase().trim();
  return languageToNLLB[normalizedLang] || null;
}

function isIndianLanguage(language: string): boolean {
  return INDIAN_LANGUAGES.includes(language.toLowerCase().trim());
}

// Simple language detection based on Unicode character ranges
function detectLanguageFromText(text: string): { language: string; nllbCode: string } {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return { language: "english", nllbCode: "eng_Latn" };
  }

  // Check for various scripts
  const scripts: { regex: RegExp; language: string; nllbCode: string }[] = [
    // Indian scripts
    { regex: /[\u0900-\u097F]/, language: "hindi", nllbCode: "hin_Deva" }, // Devanagari
    { regex: /[\u0980-\u09FF]/, language: "bengali", nllbCode: "ben_Beng" }, // Bengali
    { regex: /[\u0C00-\u0C7F]/, language: "telugu", nllbCode: "tel_Telu" }, // Telugu
    { regex: /[\u0B80-\u0BFF]/, language: "tamil", nllbCode: "tam_Taml" }, // Tamil
    { regex: /[\u0A80-\u0AFF]/, language: "gujarati", nllbCode: "guj_Gujr" }, // Gujarati
    { regex: /[\u0C80-\u0CFF]/, language: "kannada", nllbCode: "kan_Knda" }, // Kannada
    { regex: /[\u0D00-\u0D7F]/, language: "malayalam", nllbCode: "mal_Mlym" }, // Malayalam
    { regex: /[\u0A00-\u0A7F]/, language: "punjabi", nllbCode: "pan_Guru" }, // Gurmukhi
    { regex: /[\u0B00-\u0B7F]/, language: "odia", nllbCode: "ory_Orya" }, // Odia
    
    // Other Asian scripts
    { regex: /[\u4E00-\u9FFF]/, language: "chinese", nllbCode: "zho_Hans" }, // Chinese
    { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: "japanese", nllbCode: "jpn_Jpan" }, // Japanese
    { regex: /[\uAC00-\uD7AF]/, language: "korean", nllbCode: "kor_Hang" }, // Korean
    { regex: /[\u0E00-\u0E7F]/, language: "thai", nllbCode: "tha_Thai" }, // Thai
    { regex: /[\u1000-\u109F]/, language: "burmese", nllbCode: "mya_Mymr" }, // Myanmar
    { regex: /[\u1780-\u17FF]/, language: "khmer", nllbCode: "khm_Khmr" }, // Khmer
    { regex: /[\u0E80-\u0EFF]/, language: "lao", nllbCode: "lao_Laoo" }, // Lao
    
    // Middle Eastern scripts
    { regex: /[\u0600-\u06FF]/, language: "arabic", nllbCode: "arb_Arab" }, // Arabic/Urdu/Persian
    { regex: /[\u0590-\u05FF]/, language: "hebrew", nllbCode: "heb_Hebr" }, // Hebrew
    
    // Other scripts
    { regex: /[\u0400-\u04FF]/, language: "russian", nllbCode: "rus_Cyrl" }, // Cyrillic
    { regex: /[\u10A0-\u10FF]/, language: "georgian", nllbCode: "kat_Geor" }, // Georgian
    { regex: /[\u0530-\u058F]/, language: "armenian", nllbCode: "hye_Armn" }, // Armenian
    { regex: /[\u1200-\u137F]/, language: "amharic", nllbCode: "amh_Ethi" }, // Ethiopic
    { regex: /[\u03B0-\u03FF]/, language: "greek", nllbCode: "ell_Grek" }, // Greek
  ];

  for (const script of scripts) {
    if (script.regex.test(trimmedText)) {
      return { language: script.language, nllbCode: script.nllbCode };
    }
  }

  // Default to English for Latin script
  return { language: "english", nllbCode: "eng_Latn" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sourceLanguage, targetLanguage } = await req.json();

    console.log(`[NLLB-200] Translation request: source="${sourceLanguage}", target="${targetLanguage}"`);

    if (!message || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Message and target language are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!HF_TOKEN) {
      console.error("HUGGING_FACE_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          detectedLanguage: "unknown",
          error: "Translation service not configured"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target NLLB code
    const targetNLLBCode = getNLLBCode(targetLanguage);
    if (!targetNLLBCode) {
      console.error(`Unsupported target language: ${targetLanguage}`);
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          detectedLanguage: "unknown",
          error: `Unsupported language: ${targetLanguage}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect or use provided source language
    let sourceNLLBCode: string;
    let detectedLanguage: string;
    
    if (sourceLanguage) {
      sourceNLLBCode = getNLLBCode(sourceLanguage) || "eng_Latn";
      detectedLanguage = sourceLanguage;
    } else {
      // Auto-detect from text script patterns
      const detected = detectLanguageFromText(message);
      sourceNLLBCode = detected.nllbCode;
      detectedLanguage = detected.language;
      console.log(`[NLLB-200] Auto-detected language from text: ${detectedLanguage} (${sourceNLLBCode})`);
    }

    // ============= SAME LANGUAGE CHECK =============
    // IF Source language == Target language THEN No translation required
    const sourceLower = (sourceLanguage || detectedLanguage).toLowerCase().trim();
    const targetLower = targetLanguage.toLowerCase().trim();
    
    if (sourceNLLBCode === targetNLLBCode || sourceLower === targetLower) {
      console.log(`[NLLB-200] ✓ Same language detected (${detectedLanguage} == ${targetLanguage}), NO TRANSLATION needed`);
      return new Response(
        JSON.stringify({
          translatedMessage: message,
          isTranslated: false,
          detectedLanguage,
          sourceLanguageCode: sourceNLLBCode,
          targetLanguageCode: targetNLLBCode,
          reason: "same_language"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // ============= DIFFERENT LANGUAGES - TRANSLATE =============
    console.log(`[NLLB-200] ✓ Different languages (${detectedLanguage} != ${targetLanguage}), TRANSLATION enabled`);

    console.log(`Translating from ${detectedLanguage} (${sourceNLLBCode}) to ${targetLanguage} (${targetNLLBCode}): "${message.substring(0, 50)}..."`);

    // Call NLLB-200 Distilled 600M via Hugging Face Inference API
    // This model supports 200+ languages with high-quality neural machine translation
    console.log(`[NLLB-200-Distilled-600M] Starting translation: ${sourceNLLBCode} → ${targetNLLBCode}`);
    
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/nllb-200-distilled-600M",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: message,
          parameters: {
            src_lang: sourceNLLBCode,
            tgt_lang: targetNLLBCode,
            max_length: 512, // Allow longer translations
          },
          options: {
            wait_for_model: true, // Wait if model is loading
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error:", response.status, errorText);
      
      if (response.status === 503) {
        return new Response(
          JSON.stringify({ 
            translatedMessage: message, 
            isTranslated: false,
            detectedLanguage,
            error: "Translation model is loading, please try again in a few seconds"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          detectedLanguage,
          error: "Translation failed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("NLLB-200 Response:", JSON.stringify(data).substring(0, 200));

    let translatedText = message;
    
    // Handle different response formats from HF API
    if (Array.isArray(data) && data.length > 0) {
      translatedText = data[0].translation_text || data[0].generated_text || message;
    } else if (data.translation_text) {
      translatedText = data.translation_text;
    } else if (data.generated_text) {
      translatedText = data.generated_text;
    }

    const isTranslated = translatedText !== message;

    console.log(`Translation result: "${translatedText.substring(0, 50)}..." (translated: ${isTranslated})`);

    return new Response(
      JSON.stringify({
        translatedMessage: translatedText,
        isTranslated,
        detectedLanguage,
        sourceLanguageCode: sourceNLLBCode,
        targetLanguageCode: targetNLLBCode,
        isIndianSource: isIndianLanguage(detectedLanguage),
        isIndianTarget: isIndianLanguage(targetLanguage),
        model: "nllb-200-distilled-600M",
        translationPair: `${detectedLanguage} → ${targetLanguage}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Translation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

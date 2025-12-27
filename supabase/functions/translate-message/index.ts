import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= LANGUAGE CODE MAPPINGS =============

// NLLB-200 language codes (primary model - 200+ languages)
const languageToNLLB: Record<string, string> = {
  // Indian Languages
  hindi: "hin_Deva", bengali: "ben_Beng", bangla: "ben_Beng", telugu: "tel_Telu",
  tamil: "tam_Taml", marathi: "mar_Deva", gujarati: "guj_Gujr", kannada: "kan_Knda",
  malayalam: "mal_Mlym", punjabi: "pan_Guru", odia: "ory_Orya", oriya: "ory_Orya",
  assamese: "asm_Beng", nepali: "npi_Deva", urdu: "urd_Arab", konkani: "gom_Deva",
  maithili: "mai_Deva", santali: "sat_Olck", bodo: "brx_Deva", dogri: "doi_Deva",
  kashmiri: "kas_Arab", sindhi: "snd_Arab", manipuri: "mni_Beng", sinhala: "sin_Sinh",
  bhojpuri: "bho_Deva", magahi: "mag_Deva", chhattisgarhi: "hne_Deva", awadhi: "awa_Deva",
  
  // Major World Languages
  english: "eng_Latn", spanish: "spa_Latn", french: "fra_Latn", german: "deu_Latn",
  portuguese: "por_Latn", italian: "ita_Latn", dutch: "nld_Latn", russian: "rus_Cyrl",
  polish: "pol_Latn", ukrainian: "ukr_Cyrl",
  
  // East Asian
  chinese: "zho_Hans", mandarin: "zho_Hans", "simplified chinese": "zho_Hans",
  "traditional chinese": "zho_Hant", cantonese: "yue_Hant", japanese: "jpn_Jpan",
  korean: "kor_Hang",
  
  // Southeast Asian
  vietnamese: "vie_Latn", thai: "tha_Thai", indonesian: "ind_Latn", malay: "zsm_Latn",
  tagalog: "tgl_Latn", filipino: "tgl_Latn", burmese: "mya_Mymr", khmer: "khm_Khmr",
  lao: "lao_Laoo", javanese: "jav_Latn", sundanese: "sun_Latn", cebuano: "ceb_Latn",
  
  // Middle Eastern
  arabic: "arb_Arab", "standard arabic": "arb_Arab", "egyptian arabic": "arz_Arab",
  persian: "pes_Arab", farsi: "pes_Arab", pashto: "pbt_Arab", dari: "prs_Arab",
  turkish: "tur_Latn", hebrew: "heb_Hebr", kurdish: "ckb_Arab",
  
  // African
  swahili: "swh_Latn", amharic: "amh_Ethi", yoruba: "yor_Latn", igbo: "ibo_Latn",
  hausa: "hau_Latn", zulu: "zul_Latn", xhosa: "xho_Latn", afrikaans: "afr_Latn",
  somali: "som_Latn", tigrinya: "tir_Ethi", oromo: "gaz_Latn", shona: "sna_Latn",
  wolof: "wol_Latn", lingala: "lin_Latn", kinyarwanda: "kin_Latn",
  
  // European
  greek: "ell_Grek", czech: "ces_Latn", romanian: "ron_Latn", hungarian: "hun_Latn",
  swedish: "swe_Latn", danish: "dan_Latn", finnish: "fin_Latn", norwegian: "nob_Latn",
  icelandic: "isl_Latn", catalan: "cat_Latn", croatian: "hrv_Latn", serbian: "srp_Cyrl",
  bosnian: "bos_Latn", slovak: "slk_Latn", slovenian: "slv_Latn", bulgarian: "bul_Cyrl",
  lithuanian: "lit_Latn", latvian: "lvs_Latn", estonian: "est_Latn", albanian: "als_Latn",
  maltese: "mlt_Latn", irish: "gle_Latn", welsh: "cym_Latn", belarusian: "bel_Cyrl",
  
  // Central Asian
  georgian: "kat_Geor", armenian: "hye_Armn", azerbaijani: "azj_Latn", kazakh: "kaz_Cyrl",
  uzbek: "uzn_Latn", turkmen: "tuk_Latn", kyrgyz: "kir_Cyrl", tajik: "tgk_Cyrl",
  mongolian: "khk_Cyrl", tibetan: "bod_Tibt", uyghur: "uig_Arab",
  
  // Pacific & Others
  samoan: "smo_Latn", tongan: "ton_Latn", fijian: "fij_Latn", maori: "mri_Latn",
  "haitian creole": "hat_Latn", quechua: "quy_Latn", guarani: "grn_Latn",
  esperanto: "epo_Latn", latin: "lat_Latn", sanskrit: "san_Deva",
};

// M2M100 language codes (fallback model - 100 languages)
const languageToM2M100: Record<string, string> = {
  english: "en", spanish: "es", french: "fr", german: "de", portuguese: "pt",
  italian: "it", dutch: "nl", russian: "ru", polish: "pl", ukrainian: "uk",
  chinese: "zh", japanese: "ja", korean: "ko", vietnamese: "vi", thai: "th",
  indonesian: "id", malay: "ms", tagalog: "tl", arabic: "ar", persian: "fa",
  turkish: "tr", hebrew: "he", hindi: "hi", bengali: "bn", tamil: "ta",
  telugu: "te", marathi: "mr", gujarati: "gu", kannada: "kn", malayalam: "ml",
  punjabi: "pa", urdu: "ur", nepali: "ne", sinhala: "si", burmese: "my",
  khmer: "km", lao: "lo", swahili: "sw", amharic: "am", hausa: "ha",
  yoruba: "yo", igbo: "ig", zulu: "zu", afrikaans: "af", greek: "el",
  czech: "cs", romanian: "ro", hungarian: "hu", swedish: "sv", danish: "da",
  finnish: "fi", norwegian: "no", icelandic: "is", catalan: "ca", croatian: "hr",
  serbian: "sr", bosnian: "bs", slovak: "sk", slovenian: "sl", bulgarian: "bg",
  lithuanian: "lt", latvian: "lv", estonian: "et", albanian: "sq", maltese: "mt",
  irish: "ga", welsh: "cy", georgian: "ka", armenian: "hy", azerbaijani: "az",
  kazakh: "kk", uzbek: "uz", mongolian: "mn",
};

// Script detection patterns
const scriptPatterns = [
  { regex: /[\u0900-\u097F]/, language: "hindi", nllbCode: "hin_Deva" },
  { regex: /[\u0980-\u09FF]/, language: "bengali", nllbCode: "ben_Beng" },
  { regex: /[\u0C00-\u0C7F]/, language: "telugu", nllbCode: "tel_Telu" },
  { regex: /[\u0B80-\u0BFF]/, language: "tamil", nllbCode: "tam_Taml" },
  { regex: /[\u0A80-\u0AFF]/, language: "gujarati", nllbCode: "guj_Gujr" },
  { regex: /[\u0C80-\u0CFF]/, language: "kannada", nllbCode: "kan_Knda" },
  { regex: /[\u0D00-\u0D7F]/, language: "malayalam", nllbCode: "mal_Mlym" },
  { regex: /[\u0A00-\u0A7F]/, language: "punjabi", nllbCode: "pan_Guru" },
  { regex: /[\u0B00-\u0B7F]/, language: "odia", nllbCode: "ory_Orya" },
  { regex: /[\u0D80-\u0DFF]/, language: "sinhala", nllbCode: "sin_Sinh" },
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: "chinese", nllbCode: "zho_Hans" },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: "japanese", nllbCode: "jpn_Jpan" },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: "korean", nllbCode: "kor_Hang" },
  { regex: /[\u0E00-\u0E7F]/, language: "thai", nllbCode: "tha_Thai" },
  { regex: /[\u1000-\u109F]/, language: "burmese", nllbCode: "mya_Mymr" },
  { regex: /[\u1780-\u17FF]/, language: "khmer", nllbCode: "khm_Khmr" },
  { regex: /[\u0E80-\u0EFF]/, language: "lao", nllbCode: "lao_Laoo" },
  { regex: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/, language: "arabic", nllbCode: "arb_Arab" },
  { regex: /[\u0590-\u05FF\uFB1D-\uFB4F]/, language: "hebrew", nllbCode: "heb_Hebr" },
  { regex: /[\u0400-\u04FF]/, language: "russian", nllbCode: "rus_Cyrl" },
  { regex: /[\u10A0-\u10FF]/, language: "georgian", nllbCode: "kat_Geor" },
  { regex: /[\u0530-\u058F]/, language: "armenian", nllbCode: "hye_Armn" },
  { regex: /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/, language: "amharic", nllbCode: "amh_Ethi" },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, language: "greek", nllbCode: "ell_Grek" },
  { regex: /[\u0F00-\u0FFF]/, language: "tibetan", nllbCode: "bod_Tibt" },
];

// ============= UTILITY FUNCTIONS =============

function getNLLBCode(language: string): string | null {
  if (!language) return null;
  return languageToNLLB[language.toLowerCase().trim()] || null;
}

function getM2M100Code(language: string): string | null {
  if (!language) return null;
  return languageToM2M100[language.toLowerCase().trim()] || null;
}

function isLatinScript(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const latinChars = trimmed.match(/[a-zA-Z]/g);
  const totalChars = trimmed.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  if (!latinChars || !totalChars.length) return true;
  return (latinChars.length / totalChars.length) > 0.8;
}

function detectLanguageFromText(text: string): { language: string; nllbCode: string; isLatin: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { language: "english", nllbCode: "eng_Latn", isLatin: true };

  // Check script patterns
  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.language, nllbCode: pattern.nllbCode, isLatin: false };
    }
  }

  // Check Vietnamese diacritics
  if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(trimmed)) {
    return { language: "vietnamese", nllbCode: "vie_Latn", isLatin: true };
  }

  // Check European diacritics
  if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(trimmed)) {
    if (/[ñ¿¡]/i.test(trimmed)) return { language: "spanish", nllbCode: "spa_Latn", isLatin: true };
    if (/[ç]/i.test(trimmed) && /[ã|õ]/i.test(trimmed)) return { language: "portuguese", nllbCode: "por_Latn", isLatin: true };
    if (/[éèêë]/i.test(trimmed) && /[çà]/i.test(trimmed)) return { language: "french", nllbCode: "fra_Latn", isLatin: true };
    if (/[äöüß]/i.test(trimmed)) return { language: "german", nllbCode: "deu_Latn", isLatin: true };
  }

  return { language: "english", nllbCode: "eng_Latn", isLatin: true };
}

function isSupportedByNLLB(language: string): boolean {
  return getNLLBCode(language) !== null;
}

function isSupportedByM2M100(language: string): boolean {
  return getM2M100Code(language) !== null;
}

// ============= TRANSLATION ENGINE =============

interface TranslationResponse {
  translatedMessage: string;
  originalMessage: string;
  isTranslated: boolean;
  model: string;
  sourceLanguage: string;
  targetLanguage: string;
  usedPivot: boolean;
  pivotLanguage?: string;
}

async function translateWithNLLB(
  text: string,
  sourceCode: string,
  targetCode: string,
  hfToken: string
): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/nllb-200-distilled-600M",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: { src_lang: sourceCode, tgt_lang: targetCode, max_length: 512 },
          options: { wait_for_model: true },
        }),
      }
    );

    if (!response.ok) {
      console.error("[NLLB-200] API error:", response.status);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0].translation_text || data[0].generated_text || null;
    }
    return data.translation_text || data.generated_text || null;
  } catch (error) {
    console.error("[NLLB-200] Translation failed:", error);
    return null;
  }
}

async function translateWithM2M100(
  text: string,
  sourceCode: string,
  targetCode: string,
  hfToken: string
): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/m2m100_418M",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: { src_lang: sourceCode, tgt_lang: targetCode, max_length: 512 },
          options: { wait_for_model: true },
        }),
      }
    );

    if (!response.ok) {
      console.error("[M2M100] API error:", response.status);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0].translation_text || data[0].generated_text || null;
    }
    return data.translation_text || data.generated_text || null;
  } catch (error) {
    console.error("[M2M100] Translation failed:", error);
    return null;
  }
}

async function translateWithEnglishPivot(
  text: string,
  sourceLang: string,
  targetLang: string,
  hfToken: string
): Promise<{ translation: string | null; usedPivot: boolean }> {
  console.log(`[PIVOT] Attempting English pivot: ${sourceLang} → English → ${targetLang}`);
  
  // Step 1: Translate source → English
  const sourceNLLB = getNLLBCode(sourceLang);
  const sourceM2M = getM2M100Code(sourceLang);
  
  let englishText: string | null = null;
  
  if (sourceNLLB) {
    englishText = await translateWithNLLB(text, sourceNLLB, "eng_Latn", hfToken);
  }
  if (!englishText && sourceM2M) {
    englishText = await translateWithM2M100(text, sourceM2M, "en", hfToken);
  }
  
  if (!englishText) {
    console.error("[PIVOT] Failed to translate to English");
    return { translation: null, usedPivot: true };
  }
  
  console.log(`[PIVOT] Step 1 complete: "${text}" → "${englishText}"`);
  
  // Step 2: Translate English → target
  const targetNLLB = getNLLBCode(targetLang);
  const targetM2M = getM2M100Code(targetLang);
  
  let finalText: string | null = null;
  
  if (targetNLLB) {
    finalText = await translateWithNLLB(englishText, "eng_Latn", targetNLLB, hfToken);
  }
  if (!finalText && targetM2M) {
    finalText = await translateWithM2M100(englishText, "en", targetM2M, hfToken);
  }
  
  if (finalText) {
    console.log(`[PIVOT] Step 2 complete: "${englishText}" → "${finalText}"`);
  }
  
  return { translation: finalText, usedPivot: true };
}

async function translateMessage(
  text: string,
  sourceLang: string,
  targetLang: string,
  hfToken: string
): Promise<TranslationResponse> {
  const detected = detectLanguageFromText(text);
  const effectiveSource = sourceLang || detected.language;
  
  console.log(`[TRANSLATE] ${effectiveSource} → ${targetLang}: "${text.substring(0, 50)}..."`);
  
  // Check if same language
  if (effectiveSource.toLowerCase() === targetLang.toLowerCase()) {
    return {
      translatedMessage: text,
      originalMessage: text,
      isTranslated: false,
      model: "none",
      sourceLanguage: effectiveSource,
      targetLanguage: targetLang,
      usedPivot: false,
    };
  }
  
  const sourceNLLB = getNLLBCode(effectiveSource);
  const targetNLLB = getNLLBCode(targetLang);
  const sourceM2M = getM2M100Code(effectiveSource);
  const targetM2M = getM2M100Code(targetLang);
  
  let translatedText: string | null = null;
  let model = "unknown";
  let usedPivot = false;
  
  // Strategy 1: Direct NLLB translation
  if (sourceNLLB && targetNLLB) {
    translatedText = await translateWithNLLB(text, sourceNLLB, targetNLLB, hfToken);
    if (translatedText) model = "nllb-200";
  }
  
  // Strategy 2: Direct M2M100 translation (fallback)
  if (!translatedText && sourceM2M && targetM2M) {
    translatedText = await translateWithM2M100(text, sourceM2M, targetM2M, hfToken);
    if (translatedText) model = "m2m100";
  }
  
  // Strategy 3: English pivot for rare language pairs
  if (!translatedText) {
    const pivotResult = await translateWithEnglishPivot(text, effectiveSource, targetLang, hfToken);
    translatedText = pivotResult.translation;
    usedPivot = pivotResult.usedPivot;
    if (translatedText) model = "nllb-200+pivot";
  }
  
  return {
    translatedMessage: translatedText || text,
    originalMessage: text,
    isTranslated: translatedText !== null && translatedText !== text,
    model,
    sourceLanguage: effectiveSource,
    targetLanguage: targetLang,
    usedPivot,
    pivotLanguage: usedPivot ? "english" : undefined,
  };
}

// ============= HTTP SERVER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sourceLanguage, targetLanguage, mode = "auto" } = await req.json();

    console.log(`[REQUEST] source="${sourceLanguage}", target="${targetLanguage}", mode="${mode}"`);

    if (!message || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Message and target language are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          error: "Translation service not configured"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const detected = detectLanguageFromText(message);
    const targetNLLB = getNLLBCode(targetLanguage);

    // ============= CONVERSION MODE =============
    // Convert Latin typing to native script
    if (mode === "convert" || (mode === "auto" && detected.isLatin && targetNLLB && !targetNLLB.endsWith("_Latn"))) {
      console.log(`[CONVERT] English → ${targetLanguage}`);
      
      const result = await translateMessage(message, "english", targetLanguage, HF_TOKEN);
      
      return new Response(
        JSON.stringify({
          translatedMessage: result.translatedMessage,
          convertedMessage: result.translatedMessage,
          originalMessage: message,
          isTranslated: result.isTranslated,
          isConverted: result.isTranslated,
          detectedLanguage: "english",
          model: result.model,
          usedPivot: result.usedPivot,
          mode: "convert",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= TRANSLATION MODE =============
    const result = await translateMessage(message, sourceLanguage || detected.language, targetLanguage, HF_TOKEN);
    
    return new Response(
      JSON.stringify({
        translatedMessage: result.translatedMessage,
        convertedMessage: result.translatedMessage,
        originalMessage: result.originalMessage,
        isTranslated: result.isTranslated,
        isConverted: false,
        detectedLanguage: result.sourceLanguage,
        sourceLanguageCode: getNLLBCode(result.sourceLanguage) || getM2M100Code(result.sourceLanguage),
        targetLanguageCode: getNLLBCode(result.targetLanguage) || getM2M100Code(result.targetLanguage),
        model: result.model,
        usedPivot: result.usedPivot,
        pivotLanguage: result.pivotLanguage,
        mode: result.isTranslated ? "translate" : "same_language",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Complete NLLB-200 language code mapping - ALL 200+ languages supported
const languageToNLLB: Record<string, string> = {
  // ========== INDIAN LANGUAGES ==========
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
  "sinhalese": "sin_Sinh",
  "bhojpuri": "bho_Deva",
  "magahi": "mag_Deva",
  "chhattisgarhi": "hne_Deva",
  "awadhi": "awa_Deva",
  
  // ========== MAJOR WORLD LANGUAGES ==========
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
  
  // ========== EAST ASIAN LANGUAGES ==========
  "chinese": "zho_Hans",
  "mandarin": "zho_Hans",
  "simplified chinese": "zho_Hans",
  "traditional chinese": "zho_Hant",
  "cantonese": "yue_Hant",
  "japanese": "jpn_Jpan",
  "korean": "kor_Hang",
  
  // ========== SOUTHEAST ASIAN LANGUAGES ==========
  "vietnamese": "vie_Latn",
  "thai": "tha_Thai",
  "indonesian": "ind_Latn",
  "malay": "zsm_Latn",
  "tagalog": "tgl_Latn",
  "filipino": "tgl_Latn",
  "burmese": "mya_Mymr",
  "myanmar": "mya_Mymr",
  "khmer": "khm_Khmr",
  "cambodian": "khm_Khmr",
  "lao": "lao_Laoo",
  "laotian": "lao_Laoo",
  "javanese": "jav_Latn",
  "sundanese": "sun_Latn",
  "cebuano": "ceb_Latn",
  "ilocano": "ilo_Latn",
  "waray": "war_Latn",
  "pangasinan": "pag_Latn",
  "minangkabau": "min_Latn",
  "acehnese": "ace_Latn",
  "banjar": "bjn_Latn",
  "balinese": "ban_Latn",
  
  // ========== MIDDLE EASTERN LANGUAGES ==========
  "arabic": "arb_Arab",
  "standard arabic": "arb_Arab",
  "egyptian arabic": "arz_Arab",
  "moroccan arabic": "ary_Arab",
  "levantine arabic": "apc_Arab",
  "gulf arabic": "acq_Arab",
  "persian": "pes_Arab",
  "farsi": "pes_Arab",
  "pashto": "pbt_Arab",
  "dari": "prs_Arab",
  "turkish": "tur_Latn",
  "hebrew": "heb_Hebr",
  "kurdish": "ckb_Arab",
  "sorani": "ckb_Arab",
  "kurmanji": "kmr_Latn",
  
  // ========== AFRICAN LANGUAGES ==========
  "swahili": "swh_Latn",
  "kiswahili": "swh_Latn",
  "amharic": "amh_Ethi",
  "yoruba": "yor_Latn",
  "igbo": "ibo_Latn",
  "hausa": "hau_Latn",
  "zulu": "zul_Latn",
  "xhosa": "xho_Latn",
  "afrikaans": "afr_Latn",
  "somali": "som_Latn",
  "tigrinya": "tir_Ethi",
  "oromo": "gaz_Latn",
  "shona": "sna_Latn",
  "ndebele": "nde_Latn",
  "sesotho": "sot_Latn",
  "setswana": "tsn_Latn",
  "tswana": "tsn_Latn",
  "wolof": "wol_Latn",
  "fulani": "fuv_Latn",
  "fula": "fuv_Latn",
  "bambara": "bam_Latn",
  "lingala": "lin_Latn",
  "kongo": "kon_Latn",
  "kikongo": "kon_Latn",
  "luganda": "lug_Latn",
  "kinyarwanda": "kin_Latn",
  "kirundi": "run_Latn",
  "malagasy": "plt_Latn",
  "twi": "twi_Latn",
  "akan": "aka_Latn",
  "ewe": "ewe_Latn",
  "fon": "fon_Latn",
  "mossi": "mos_Latn",
  "moore": "mos_Latn",
  "kanuri": "knc_Latn",
  "tumbuka": "tum_Latn",
  "chichewa": "nya_Latn",
  "nyanja": "nya_Latn",
  "bemba": "bem_Latn",
  "lozi": "loz_Latn",
  "tsonga": "tso_Latn",
  "venda": "ven_Latn",
  "swati": "ssw_Latn",
  "siswati": "ssw_Latn",
  "dinka": "dik_Latn",
  "nuer": "nus_Latn",
  "luo": "luo_Latn",
  "acholi": "ach_Latn",
  
  // ========== EUROPEAN LANGUAGES ==========
  "greek": "ell_Grek",
  "czech": "ces_Latn",
  "romanian": "ron_Latn",
  "hungarian": "hun_Latn",
  "swedish": "swe_Latn",
  "danish": "dan_Latn",
  "finnish": "fin_Latn",
  "norwegian": "nob_Latn",
  "norwegian bokmal": "nob_Latn",
  "norwegian nynorsk": "nno_Latn",
  "icelandic": "isl_Latn",
  "catalan": "cat_Latn",
  "galician": "glg_Latn",
  "basque": "eus_Latn",
  "croatian": "hrv_Latn",
  "serbian": "srp_Cyrl",
  "bosnian": "bos_Latn",
  "slovak": "slk_Latn",
  "slovenian": "slv_Latn",
  "bulgarian": "bul_Cyrl",
  "macedonian": "mkd_Cyrl",
  "lithuanian": "lit_Latn",
  "latvian": "lvs_Latn",
  "estonian": "est_Latn",
  "albanian": "als_Latn",
  "maltese": "mlt_Latn",
  "irish": "gle_Latn",
  "gaelic": "gle_Latn",
  "scottish gaelic": "gla_Latn",
  "welsh": "cym_Latn",
  "breton": "bre_Latn",
  "luxembourgish": "ltz_Latn",
  "belarusian": "bel_Cyrl",
  "occitan": "oci_Latn",
  "corsican": "cos_Latn",
  "sardinian": "srd_Latn",
  "friulian": "fur_Latn",
  "romansh": "roh_Latn",
  "faroese": "fao_Latn",
  
  // ========== CENTRAL ASIAN LANGUAGES ==========
  "georgian": "kat_Geor",
  "armenian": "hye_Armn",
  "azerbaijani": "azj_Latn",
  "azeri": "azj_Latn",
  "kazakh": "kaz_Cyrl",
  "uzbek": "uzn_Latn",
  "turkmen": "tuk_Latn",
  "kyrgyz": "kir_Cyrl",
  "tajik": "tgk_Cyrl",
  "mongolian": "khk_Cyrl",
  "tibetan": "bod_Tibt",
  "uyghur": "uig_Arab",
  "tatar": "tat_Cyrl",
  "bashkir": "bak_Cyrl",
  "chuvash": "chv_Cyrl",
  
  // ========== SOUTH ASIAN REGIONAL ==========
  "dzongkha": "dzo_Tibt",
  "bhutanese": "dzo_Tibt",
  "maldivian": "div_Thaa",
  "dhivehi": "div_Thaa",
  
  // ========== PACIFIC & OCEANIC ==========
  "samoan": "smo_Latn",
  "tongan": "ton_Latn",
  "fijian": "fij_Latn",
  "hawaiian": "haw_Latn",
  "maori": "mri_Latn",
  "tahitian": "tah_Latn",
  
  // ========== CREOLES & PIDGINS ==========
  "haitian creole": "hat_Latn",
  "haitian": "hat_Latn",
  "jamaican patois": "jam_Latn",
  "tok pisin": "tpi_Latn",
  "papiamento": "pap_Latn",
  "cape verdean creole": "kea_Latn",
  "seychellois creole": "crs_Latn",
  "mauritian creole": "mfe_Latn",
  
  // ========== NATIVE AMERICAN ==========
  "quechua": "quy_Latn",
  "aymara": "ayr_Latn",
  "guarani": "grn_Latn",
  "nahuatl": "nah_Latn",
  "maya": "yua_Latn",
  "yucatec maya": "yua_Latn",
  "mapuche": "arn_Latn",
  "mapudungun": "arn_Latn",
  
  // ========== OTHER LANGUAGES ==========
  "esperanto": "epo_Latn",
  "latin": "lat_Latn",
  "sanskrit": "san_Deva",
  "pali": "pli_Deva",
  "classical chinese": "lzh_Hans",
  "literary chinese": "lzh_Hans",
};

// Unicode script detection patterns - comprehensive global coverage
const scriptPatterns: { regex: RegExp; language: string; nllbCode: string }[] = [
  // ========== INDIAN SCRIPTS ==========
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
  
  // ========== EAST ASIAN SCRIPTS ==========
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: "chinese", nllbCode: "zho_Hans" },
  { regex: /[\u3040-\u309F]/, language: "japanese", nllbCode: "jpn_Jpan" },
  { regex: /[\u30A0-\u30FF]/, language: "japanese", nllbCode: "jpn_Jpan" },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: "korean", nllbCode: "kor_Hang" },
  
  // ========== SOUTHEAST ASIAN SCRIPTS ==========
  { regex: /[\u0E00-\u0E7F]/, language: "thai", nllbCode: "tha_Thai" },
  { regex: /[\u1000-\u109F]/, language: "burmese", nllbCode: "mya_Mymr" },
  { regex: /[\u1780-\u17FF]/, language: "khmer", nllbCode: "khm_Khmr" },
  { regex: /[\u0E80-\u0EFF]/, language: "lao", nllbCode: "lao_Laoo" },
  
  // ========== MIDDLE EASTERN SCRIPTS ==========
  { regex: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/, language: "arabic", nllbCode: "arb_Arab" },
  { regex: /[\u0590-\u05FF\uFB1D-\uFB4F]/, language: "hebrew", nllbCode: "heb_Hebr" },
  { regex: /[\u0780-\u07BF]/, language: "dhivehi", nllbCode: "div_Thaa" },
  
  // ========== CYRILLIC SCRIPTS ==========
  { regex: /[\u0400-\u04FF]/, language: "russian", nllbCode: "rus_Cyrl" },
  
  // ========== CAUCASIAN SCRIPTS ==========
  { regex: /[\u10A0-\u10FF]/, language: "georgian", nllbCode: "kat_Geor" },
  { regex: /[\u0530-\u058F]/, language: "armenian", nllbCode: "hye_Armn" },
  
  // ========== AFRICAN SCRIPTS ==========
  { regex: /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/, language: "amharic", nllbCode: "amh_Ethi" },
  { regex: /[\u2D30-\u2D7F]/, language: "berber", nllbCode: "tzm_Tfng" },
  
  // ========== CENTRAL ASIAN SCRIPTS ==========
  { regex: /[\u0F00-\u0FFF]/, language: "tibetan", nllbCode: "bod_Tibt" },
  
  // ========== GREEK SCRIPT ==========
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, language: "greek", nllbCode: "ell_Grek" },
];

function getNLLBCode(language: string): string | null {
  if (!language) return null;
  const normalizedLang = language.toLowerCase().trim();
  return languageToNLLB[normalizedLang] || null;
}

function isIndianLanguage(language: string): boolean {
  const indianLanguages = [
    "hindi", "bengali", "bangla", "telugu", "tamil", "marathi", "gujarati",
    "kannada", "malayalam", "punjabi", "odia", "oriya", "assamese", "nepali",
    "urdu", "konkani", "maithili", "santali", "bodo", "dogri", "kashmiri",
    "sindhi", "manipuri", "sinhala", "bhojpuri", "magahi", "chhattisgarhi", "awadhi"
  ];
  return indianLanguages.includes(language.toLowerCase().trim());
}

// Check if text is in Latin/English script
function isLatinScript(text: string): boolean {
  const trimmedText = text.trim();
  if (!trimmedText) return false;
  
  // Check if the text is primarily Latin characters
  const latinPattern = /^[a-zA-Z0-9\s\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]+$/;
  
  // Also allow common punctuation and numbers with Latin
  const latinChars = trimmedText.match(/[a-zA-Z]/g);
  const totalChars = trimmedText.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  
  if (!latinChars || !totalChars.length) return latinPattern.test(trimmedText);
  
  // If more than 80% of non-space chars are Latin, consider it Latin script
  return (latinChars.length / totalChars.length) > 0.8;
}

// Comprehensive language detection from Unicode script patterns
function detectLanguageFromText(text: string): { language: string; nllbCode: string; isLatin: boolean } {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return { language: "english", nllbCode: "eng_Latn", isLatin: true };
  }

  // Check each script pattern
  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmedText)) {
      console.log(`[NLLB-200] Detected script: ${pattern.language} from Unicode pattern`);
      return { language: pattern.language, nllbCode: pattern.nllbCode, isLatin: false };
    }
  }

  // Check for extended Latin with diacritics (various European languages)
  if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(trimmedText)) {
    if (/[ñ¿¡]/i.test(trimmedText)) return { language: "spanish", nllbCode: "spa_Latn", isLatin: true };
    if (/[ç]/i.test(trimmedText) && /[ã|õ]/i.test(trimmedText)) return { language: "portuguese", nllbCode: "por_Latn", isLatin: true };
    if (/[éèêë]/i.test(trimmedText) && /[çà]/i.test(trimmedText)) return { language: "french", nllbCode: "fra_Latn", isLatin: true };
    if (/[äöüß]/i.test(trimmedText)) return { language: "german", nllbCode: "deu_Latn", isLatin: true };
    if (/[ăîâșț]/i.test(trimmedText)) return { language: "romanian", nllbCode: "ron_Latn", isLatin: true };
    if (/[ąćęłńóśźż]/i.test(trimmedText)) return { language: "polish", nllbCode: "pol_Latn", isLatin: true };
    if (/[čďěňřšťůž]/i.test(trimmedText)) return { language: "czech", nllbCode: "ces_Latn", isLatin: true };
    if (/[őű]/i.test(trimmedText)) return { language: "hungarian", nllbCode: "hun_Latn", isLatin: true };
    if (/[åäö]/i.test(trimmedText)) return { language: "swedish", nllbCode: "swe_Latn", isLatin: true };
    if (/[æøå]/i.test(trimmedText)) return { language: "norwegian", nllbCode: "nob_Latn", isLatin: true };
  }

  // Check for Vietnamese diacritics specifically
  if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(trimmedText)) {
    return { language: "vietnamese", nllbCode: "vie_Latn", isLatin: true };
  }

  // Default to English for basic Latin script
  return { language: "english", nllbCode: "eng_Latn", isLatin: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sourceLanguage, targetLanguage, mode = "auto" } = await req.json();

    console.log(`[NLLB-200] Request: source="${sourceLanguage}", target="${targetLanguage}", mode="${mode}"`);

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
          convertedMessage: message,
          isTranslated: false,
          isConverted: false,
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
          convertedMessage: message,
          isTranslated: false,
          isConverted: false,
          detectedLanguage: "unknown",
          error: `Unsupported language: ${targetLanguage}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect source language from text
    const detected = detectLanguageFromText(message);
    let sourceNLLBCode = detected.nllbCode;
    let detectedLanguage = detected.language;
    const isInputLatin = detected.isLatin;
    
    // Override with provided source language if available
    if (sourceLanguage) {
      const providedCode = getNLLBCode(sourceLanguage);
      if (providedCode) {
        sourceNLLBCode = providedCode;
        detectedLanguage = sourceLanguage;
      }
    }
    
    console.log(`[NLLB-200] Detected: ${detectedLanguage} (${sourceNLLBCode}), isLatin: ${isInputLatin}`);

    // ============= CONVERSION MODE =============
    // If mode is "convert" or (auto mode AND input is Latin AND target is non-Latin),
    // convert English typing to target language script
    const shouldConvert = mode === "convert" || 
      (mode === "auto" && isInputLatin && !targetNLLBCode.endsWith("_Latn"));
    
    if (shouldConvert) {
      console.log(`[NLLB-200] ✓ CONVERSION MODE: English typing → ${targetLanguage} script`);
      
      // Use translation from English to target language
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
              src_lang: "eng_Latn", // Always from English for conversion
              tgt_lang: targetNLLBCode,
              max_length: 512,
            },
            options: {
              wait_for_model: true,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Conversion API error:", response.status, errorText);
        
        return new Response(
          JSON.stringify({ 
            translatedMessage: message,
            convertedMessage: message, 
            isTranslated: false,
            isConverted: false,
            detectedLanguage,
            error: response.status === 503 
              ? "Translation model is loading, please try again" 
              : "Conversion failed"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      let convertedText = message;
      
      if (Array.isArray(data) && data.length > 0) {
        convertedText = data[0].translation_text || data[0].generated_text || message;
      } else if (data.translation_text) {
        convertedText = data.translation_text;
      } else if (data.generated_text) {
        convertedText = data.generated_text;
      }

      const isConverted = convertedText !== message;
      console.log(`[NLLB-200] Conversion result: "${convertedText.substring(0, 50)}..." (converted: ${isConverted})`);

      return new Response(
        JSON.stringify({
          translatedMessage: convertedText,
          convertedMessage: convertedText,
          originalMessage: message,
          isTranslated: isConverted,
          isConverted: isConverted,
          detectedLanguage: "english",
          sourceLanguageCode: "eng_Latn",
          targetLanguageCode: targetNLLBCode,
          mode: "convert",
          model: "nllb-200-distilled-600M",
          conversionPair: `English → ${targetLanguage}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= SAME LANGUAGE CHECK =============
    const sourceLower = (sourceLanguage || detectedLanguage).toLowerCase().trim();
    const targetLower = targetLanguage.toLowerCase().trim();
    
    if (sourceNLLBCode === targetNLLBCode || sourceLower === targetLower) {
      console.log(`[NLLB-200] ✓ Same language (${detectedLanguage} == ${targetLanguage}), NO TRANSLATION`);
      return new Response(
        JSON.stringify({
          translatedMessage: message,
          convertedMessage: message,
          isTranslated: false,
          isConverted: false,
          detectedLanguage,
          sourceLanguageCode: sourceNLLBCode,
          targetLanguageCode: targetNLLBCode,
          mode: "same_language",
          reason: "same_language"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // ============= TRANSLATION MODE =============
    console.log(`[NLLB-200] ✓ TRANSLATION MODE: ${detectedLanguage} → ${targetLanguage}`);

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
            max_length: 512,
          },
          options: {
            wait_for_model: true,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error:", response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          translatedMessage: message,
          convertedMessage: message, 
          isTranslated: false,
          isConverted: false,
          detectedLanguage,
          error: response.status === 503 
            ? "Translation model is loading, please try again" 
            : "Translation failed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let translatedText = message;
    
    if (Array.isArray(data) && data.length > 0) {
      translatedText = data[0].translation_text || data[0].generated_text || message;
    } else if (data.translation_text) {
      translatedText = data.translation_text;
    } else if (data.generated_text) {
      translatedText = data.generated_text;
    }

    const isTranslated = translatedText !== message;
    console.log(`[NLLB-200] Translation result: "${translatedText.substring(0, 50)}..." (translated: ${isTranslated})`);

    return new Response(
      JSON.stringify({
        translatedMessage: translatedText,
        convertedMessage: translatedText,
        isTranslated,
        isConverted: false,
        detectedLanguage,
        sourceLanguageCode: sourceNLLBCode,
        targetLanguageCode: targetNLLBCode,
        isIndianSource: isIndianLanguage(detectedLanguage),
        isIndianTarget: isIndianLanguage(targetLanguage),
        mode: "translate",
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

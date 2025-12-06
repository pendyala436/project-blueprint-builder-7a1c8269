import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NLLB-200 language code mapping
const languageToNLLB: Record<string, string> = {
  "english": "eng_Latn",
  "hindi": "hin_Deva",
  "spanish": "spa_Latn",
  "french": "fra_Latn",
  "german": "deu_Latn",
  "chinese": "zho_Hans",
  "japanese": "jpn_Jpan",
  "arabic": "arb_Arab",
  "bengali": "ben_Beng",
  "portuguese": "por_Latn",
  "russian": "rus_Cyrl",
  "telugu": "tel_Telu",
  "tamil": "tam_Taml",
  "marathi": "mar_Deva",
  "gujarati": "guj_Gujr",
  "kannada": "kan_Knda",
  "malayalam": "mal_Mlym",
  "punjabi": "pan_Guru",
  "urdu": "urd_Arab",
  "korean": "kor_Hang",
  "vietnamese": "vie_Latn",
  "thai": "tha_Thai",
  "indonesian": "ind_Latn",
  "turkish": "tur_Latn",
  "polish": "pol_Latn",
  "ukrainian": "ukr_Cyrl",
  "dutch": "nld_Latn",
  "italian": "ita_Latn",
  "greek": "ell_Grek",
  "czech": "ces_Latn",
  "romanian": "ron_Latn",
  "hungarian": "hun_Latn",
  "swedish": "swe_Latn",
  "danish": "dan_Latn",
  "finnish": "fin_Latn",
  "norwegian": "nob_Latn",
  "hebrew": "heb_Hebr",
  "persian": "pes_Arab",
  "swahili": "swh_Latn",
  "tagalog": "tgl_Latn",
  "malay": "zsm_Latn",
  "burmese": "mya_Mymr",
  "khmer": "khm_Khmr",
  "lao": "lao_Laoo",
  "nepali": "npi_Deva",
  "sinhala": "sin_Sinh",
  "amharic": "amh_Ethi",
  "yoruba": "yor_Latn",
  "igbo": "ibo_Latn",
  "hausa": "hau_Latn",
  "zulu": "zul_Latn",
  "xhosa": "xho_Latn",
  "afrikaans": "afr_Latn",
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
  "georgian": "kat_Geor",
  "armenian": "hye_Armn",
  "azerbaijani": "azj_Latn",
  "kazakh": "kaz_Cyrl",
  "uzbek": "uzn_Latn",
  "mongolian": "khk_Cyrl",
  "tibetan": "bod_Tibt",
  "assamese": "asm_Beng",
  "odia": "ory_Orya",
  "oriya": "ory_Orya",
  "konkani": "gom_Deva",
  "maithili": "mai_Deva",
  "santali": "sat_Olck",
  "bodo": "brx_Deva",
  "dogri": "doi_Deva",
  "kashmiri": "kas_Arab",
  "sindhi": "snd_Arab",
  "manipuri": "mni_Beng",
};

function getNLLBCode(language: string): string | null {
  const normalizedLang = language.toLowerCase().trim();
  return languageToNLLB[normalizedLang] || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, targetLanguage } = await req.json();

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
          detectedLanguage: "unknown"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log(`Translating to ${targetLanguage} (${targetNLLBCode}): "${message}"`);

    // Call NLLB-200 via Hugging Face Inference API
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/nllb-200-3.3B",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: message,
          parameters: {
            src_lang: "eng_Latn", // Default source as English, NLLB auto-handles
            tgt_lang: targetNLLBCode,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error:", response.status, errorText);
      
      if (response.status === 503) {
        // Model is loading
        return new Response(
          JSON.stringify({ 
            translatedMessage: message, 
            isTranslated: false,
            detectedLanguage: "unknown",
            error: "Translation model is loading, please try again"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          translatedMessage: message, 
          isTranslated: false,
          detectedLanguage: "unknown"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("NLLB-200 Response:", JSON.stringify(data));

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

    console.log(`Translation result: "${translatedText}" (translated: ${isTranslated})`);

    return new Response(
      JSON.stringify({
        translatedMessage: translatedText,
        isTranslated: isTranslated,
        detectedLanguage: "auto-detected"
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

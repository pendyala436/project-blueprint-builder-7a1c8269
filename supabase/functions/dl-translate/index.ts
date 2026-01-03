/**
 * DL-Translate Edge Function - HuggingFace Translation
 * 
 * Uses HuggingFace Inference API for high-quality neural translation.
 * Supports 200+ languages with NLLB-200 model.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// NLLB-200 language codes mapping
const NLLB_LANGUAGE_CODES: Record<string, string> = {
  english: 'eng_Latn', hindi: 'hin_Deva', telugu: 'tel_Telu', tamil: 'tam_Taml',
  bengali: 'ben_Beng', marathi: 'mar_Deva', gujarati: 'guj_Gujr', kannada: 'kan_Knda',
  malayalam: 'mal_Mlym', punjabi: 'pan_Guru', odia: 'ory_Orya', urdu: 'urd_Arab',
  chinese: 'zho_Hans', japanese: 'jpn_Jpan', korean: 'kor_Hang', arabic: 'arb_Arab',
  persian: 'pes_Arab', russian: 'rus_Cyrl', spanish: 'spa_Latn', french: 'fra_Latn',
  german: 'deu_Latn', italian: 'ita_Latn', portuguese: 'por_Latn', dutch: 'nld_Latn',
  polish: 'pol_Latn', turkish: 'tur_Latn', swedish: 'swe_Latn', danish: 'dan_Latn',
  norwegian: 'nob_Latn', finnish: 'fin_Latn', czech: 'ces_Latn', romanian: 'ron_Latn',
  hungarian: 'hun_Latn', bulgarian: 'bul_Cyrl', croatian: 'hrv_Latn', serbian: 'srp_Cyrl',
  slovak: 'slk_Latn', slovenian: 'slv_Latn', lithuanian: 'lit_Latn', latvian: 'lvs_Latn',
  estonian: 'est_Latn', georgian: 'kat_Geor', armenian: 'hye_Armn', swahili: 'swh_Latn',
  amharic: 'amh_Ethi', thai: 'tha_Thai', vietnamese: 'vie_Latn', indonesian: 'ind_Latn',
  malay: 'zsm_Latn', tagalog: 'tgl_Latn', burmese: 'mya_Mymr', khmer: 'khm_Khmr',
  lao: 'lao_Laoo', nepali: 'npi_Deva', sinhala: 'sin_Sinh', assamese: 'asm_Beng',
  greek: 'ell_Grek', ukrainian: 'ukr_Cyrl', hebrew: 'heb_Hebr',
};

// Language name normalization
const LANGUAGE_ALIASES: Record<string, string> = {
  bangla: 'bengali', oriya: 'odia', farsi: 'persian', mandarin: 'chinese',
  en: 'english', hi: 'hindi', te: 'telugu', ta: 'tamil', bn: 'bengali',
  mr: 'marathi', gu: 'gujarati', kn: 'kannada', ml: 'malayalam', pa: 'punjabi',
  or: 'odia', ur: 'urdu', zh: 'chinese', ja: 'japanese', ko: 'korean',
  ar: 'arabic', fa: 'persian', ru: 'russian', es: 'spanish', fr: 'french',
  de: 'german', it: 'italian', pt: 'portuguese', nl: 'dutch', pl: 'polish',
  tr: 'turkish', sv: 'swedish', da: 'danish', no: 'norwegian', fi: 'finnish',
  cs: 'czech', ro: 'romanian', hu: 'hungarian', bg: 'bulgarian', hr: 'croatian',
  sr: 'serbian', sk: 'slovak', sl: 'slovenian', lt: 'lithuanian', lv: 'latvian',
  et: 'estonian', ka: 'georgian', hy: 'armenian', sw: 'swahili', am: 'amharic',
  th: 'thai', vi: 'vietnamese', id: 'indonesian', ms: 'malay', tl: 'tagalog',
  my: 'burmese', km: 'khmer', lo: 'lao', ne: 'nepali', si: 'sinhala',
  as: 'assamese', el: 'greek', uk: 'ukrainian', he: 'hebrew',
};

function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] || normalized;
}

function getNLLBCode(language: string): string | null {
  return NLLB_LANGUAGE_CODES[language] || null;
}

// Translate using HuggingFace NLLB-200 model
async function translateWithHuggingFace(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<string | null> {
  const srcCode = getNLLBCode(sourceLang);
  const tgtCode = getNLLBCode(targetLang);
  
  if (!srcCode || !tgtCode) {
    console.log(`[dl-translate] Language not supported: ${sourceLang} -> ${targetLang}`);
    return null;
  }

  console.log(`[dl-translate] Using HuggingFace NLLB-200: ${srcCode} -> ${tgtCode}`);
  
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/nllb-200-distilled-600M",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            src_lang: srcCode,
            tgt_lang: tgtCode,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[dl-translate] HuggingFace error: ${response.status}`, errorText);
      
      if (response.status === 503) {
        console.log("[dl-translate] Model loading, retrying...");
        // Wait and retry once
        await new Promise(resolve => setTimeout(resolve, 5000));
        return translateWithHuggingFace(text, sourceLang, targetLang, apiKey);
      }
      
      return null;
    }

    const result = await response.json();
    const translatedText = result[0]?.translation_text || result[0]?.generated_text;
    
    if (translatedText) {
      console.log(`[dl-translate] HuggingFace success: "${translatedText.slice(0, 50)}..."`);
      return translatedText;
    }
    
    return null;
  } catch (error) {
    console.error("[dl-translate] HuggingFace exception:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLanguage, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: text, targetLanguage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HF_API_KEY = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!HF_API_KEY) {
      console.error("[dl-translate] HUGGING_FACE_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Translation service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceLang = normalizeLanguage(sourceLanguage || 'english');
    const targetLang = normalizeLanguage(targetLanguage);
    
    console.log(`[dl-translate] Request: "${text.slice(0, 50)}..." from ${sourceLang} to ${targetLang}`);

    // Same language - no translation needed
    if (sourceLang === targetLang) {
      console.log("[dl-translate] Same language, returning original");
      return new Response(
        JSON.stringify({
          translatedText: text,
          originalText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          isTranslated: false,
          mode: 'same_language',
          model: null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Translate using HuggingFace
    const translatedText = await translateWithHuggingFace(text, sourceLang, targetLang, HF_API_KEY);

    if (!translatedText) {
      console.error("[dl-translate] Translation failed");
      return new Response(
        JSON.stringify({
          translatedText: text,
          originalText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          isTranslated: false,
          mode: 'failed',
          model: null,
          error: 'Translation failed'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[dl-translate] Final result: "${translatedText.slice(0, 50)}..."`);

    return new Response(
      JSON.stringify({
        translatedText,
        originalText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        isTranslated: translatedText !== text,
        mode: 'translate',
        model: 'nllb-200'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[dl-translate] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Translation failed",
        translatedText: null
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

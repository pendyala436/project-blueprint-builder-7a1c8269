/**
 * DL-Translate Edge Function
 * Uses Hugging Face Inference API with NLLB-200 model
 * Same model as Python dl-translate library
 * 
 * Based on: https://github.com/xhluca/dl-translate
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// NLLB-200 language codes (same as used by dl-translate)
const NLLB_CODES: Record<string, string> = {
  english: 'eng_Latn',
  hindi: 'hin_Deva',
  bengali: 'ben_Beng',
  telugu: 'tel_Telu',
  marathi: 'mar_Deva',
  tamil: 'tam_Taml',
  gujarati: 'guj_Gujr',
  kannada: 'kan_Knda',
  malayalam: 'mal_Mlym',
  punjabi: 'pan_Guru',
  odia: 'ory_Orya',
  urdu: 'urd_Arab',
  nepali: 'npi_Deva',
  sinhala: 'sin_Sinh',
  assamese: 'asm_Beng',
  chinese: 'zho_Hans',
  japanese: 'jpn_Jpan',
  korean: 'kor_Hang',
  arabic: 'arb_Arab',
  persian: 'pes_Arab',
  hebrew: 'heb_Hebr',
  russian: 'rus_Cyrl',
  ukrainian: 'ukr_Cyrl',
  greek: 'ell_Grek',
  thai: 'tha_Thai',
  vietnamese: 'vie_Latn',
  indonesian: 'ind_Latn',
  malay: 'zsm_Latn',
  tagalog: 'tgl_Latn',
  spanish: 'spa_Latn',
  portuguese: 'por_Latn',
  french: 'fra_Latn',
  german: 'deu_Latn',
  italian: 'ita_Latn',
  dutch: 'nld_Latn',
  polish: 'pol_Latn',
  turkish: 'tur_Latn',
  swedish: 'swe_Latn',
  danish: 'dan_Latn',
  norwegian: 'nob_Latn',
  finnish: 'fin_Latn',
  czech: 'ces_Latn',
  romanian: 'ron_Latn',
  hungarian: 'hun_Latn',
  bulgarian: 'bul_Cyrl',
  croatian: 'hrv_Latn',
  serbian: 'srp_Cyrl',
  slovak: 'slk_Latn',
  slovenian: 'slv_Latn',
  lithuanian: 'lit_Latn',
  latvian: 'lvs_Latn',
  estonian: 'est_Latn',
  georgian: 'kat_Geor',
  armenian: 'hye_Armn',
  swahili: 'swh_Latn',
  amharic: 'amh_Ethi',
  burmese: 'mya_Mymr',
  khmer: 'khm_Khmr',
  lao: 'lao_Laoo',
  tibetan: 'bod_Tibt',
};

// Normalize language name
function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  
  // Handle common aliases
  const aliases: Record<string, string> = {
    bangla: 'bengali',
    oriya: 'odia',
    farsi: 'persian',
    mandarin: 'chinese',
    en: 'english',
    hi: 'hindi',
    te: 'telugu',
    ta: 'tamil',
    bn: 'bengali',
    mr: 'marathi',
    gu: 'gujarati',
    kn: 'kannada',
    ml: 'malayalam',
    pa: 'punjabi',
    or: 'odia',
    ur: 'urdu',
    zh: 'chinese',
    ja: 'japanese',
    ko: 'korean',
    ar: 'arabic',
    fa: 'persian',
    ru: 'russian',
    es: 'spanish',
    fr: 'french',
    de: 'german',
    it: 'italian',
    pt: 'portuguese',
  };
  
  return aliases[normalized] || normalized;
}

// Get NLLB code for a language
function getNllbCode(lang: string): string | null {
  const normalized = normalizeLanguage(lang);
  return NLLB_CODES[normalized] || null;
}

serve(async (req) => {
  // Handle CORS preflight
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

    const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!HF_TOKEN) {
      console.error("[dl-translate] HUGGING_FACE_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Translation service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceLang = normalizeLanguage(sourceLanguage || 'english');
    const targetLang = normalizeLanguage(targetLanguage);
    
    console.log(`[dl-translate] Translating: "${text.slice(0, 50)}..." from ${sourceLang} to ${targetLang}`);

    // Check if same language
    if (sourceLang === targetLang) {
      console.log("[dl-translate] Same language, returning original");
      return new Response(
        JSON.stringify({
          translatedText: text,
          originalText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          isTranslated: false,
          mode: 'same_language'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get NLLB codes
    const srcCode = getNllbCode(sourceLang);
    const tgtCode = getNllbCode(targetLang);

    if (!srcCode || !tgtCode) {
      console.log(`[dl-translate] Unsupported language pair: ${sourceLang} -> ${targetLang}`);
      return new Response(
        JSON.stringify({
          translatedText: text,
          originalText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          isTranslated: false,
          mode: 'unsupported'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Hugging Face client
    const hf = new HfInference(HF_TOKEN);

    // Use NLLB-200 model (same as dl-translate)
    // facebook/nllb-200-distilled-600M is smaller/faster
    // facebook/nllb-200-3.3B is more accurate
    const model = "facebook/nllb-200-distilled-600M";

    console.log(`[dl-translate] Using model: ${model}, ${srcCode} -> ${tgtCode}`);

    // Use fetch directly for more control over the API call
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          src_lang: srcCode,
          tgt_lang: tgtCode,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[dl-translate] Hugging Face API error: ${response.status}`, errorText);
      throw new Error(`Translation API error: ${response.status}`);
    }

    const result = await response.json();
    const translatedText = Array.isArray(result) ? result[0]?.translation_text : result?.translation_text || text;
    
    console.log(`[dl-translate] Result: "${translatedText.slice(0, 50)}..."`);

    return new Response(
      JSON.stringify({
        translatedText,
        originalText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        isTranslated: translatedText !== text,
        mode: 'translate'
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

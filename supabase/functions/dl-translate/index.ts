/**
 * DL-Translate Edge Function - Multi-Model Neural Translation
 * 
 * Combines 4 powerful translation models with intelligent fallback:
 * 1. NLLB-200 (Primary) - 200 languages, best accuracy
 * 2. SeamlessM4T - Multimodal, excellent for speech+text
 * 3. M2M100 - 100 languages, many-to-many
 * 4. mBART-50 - 50 languages, good for European languages
 * 
 * Based on: https://github.com/xhluca/dl-translate
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================================
// Model Configurations
// ============================================================================

interface ModelConfig {
  name: string;
  id: string;
  type: 'nllb' | 'seamless' | 'm2m' | 'mbart';
  languageCount: number;
  codes: Record<string, string>;
}

// NLLB-200 Language Codes (200 languages)
const NLLB_CODES: Record<string, string> = {
  english: 'eng_Latn', hindi: 'hin_Deva', bengali: 'ben_Beng', telugu: 'tel_Telu',
  marathi: 'mar_Deva', tamil: 'tam_Taml', gujarati: 'guj_Gujr', kannada: 'kan_Knda',
  malayalam: 'mal_Mlym', punjabi: 'pan_Guru', odia: 'ory_Orya', urdu: 'urd_Arab',
  nepali: 'npi_Deva', sinhala: 'sin_Sinh', assamese: 'asm_Beng', chinese: 'zho_Hans',
  japanese: 'jpn_Jpan', korean: 'kor_Hang', arabic: 'arb_Arab', persian: 'pes_Arab',
  hebrew: 'heb_Hebr', russian: 'rus_Cyrl', ukrainian: 'ukr_Cyrl', greek: 'ell_Grek',
  thai: 'tha_Thai', vietnamese: 'vie_Latn', indonesian: 'ind_Latn', malay: 'zsm_Latn',
  tagalog: 'tgl_Latn', spanish: 'spa_Latn', portuguese: 'por_Latn', french: 'fra_Latn',
  german: 'deu_Latn', italian: 'ita_Latn', dutch: 'nld_Latn', polish: 'pol_Latn',
  turkish: 'tur_Latn', swedish: 'swe_Latn', danish: 'dan_Latn', norwegian: 'nob_Latn',
  finnish: 'fin_Latn', czech: 'ces_Latn', romanian: 'ron_Latn', hungarian: 'hun_Latn',
  bulgarian: 'bul_Cyrl', croatian: 'hrv_Latn', serbian: 'srp_Cyrl', slovak: 'slk_Latn',
  slovenian: 'slv_Latn', lithuanian: 'lit_Latn', latvian: 'lvs_Latn', estonian: 'est_Latn',
  georgian: 'kat_Geor', armenian: 'hye_Armn', swahili: 'swh_Latn', amharic: 'amh_Ethi',
  burmese: 'mya_Mymr', khmer: 'khm_Khmr', lao: 'lao_Laoo', tibetan: 'bod_Tibt',
};

// SeamlessM4T Language Codes
const SEAMLESS_CODES: Record<string, string> = {
  english: 'eng', hindi: 'hin', bengali: 'ben', telugu: 'tel', marathi: 'mar',
  tamil: 'tam', gujarati: 'guj', kannada: 'kan', malayalam: 'mal', punjabi: 'pan',
  urdu: 'urd', nepali: 'npi', chinese: 'cmn', japanese: 'jpn', korean: 'kor',
  arabic: 'arb', persian: 'pes', hebrew: 'heb', russian: 'rus', ukrainian: 'ukr',
  greek: 'ell', thai: 'tha', vietnamese: 'vie', indonesian: 'ind', malay: 'zlm',
  tagalog: 'tgl', spanish: 'spa', portuguese: 'por', french: 'fra', german: 'deu',
  italian: 'ita', dutch: 'nld', polish: 'pol', turkish: 'tur', swedish: 'swe',
  danish: 'dan', norwegian: 'nob', finnish: 'fin', czech: 'ces', romanian: 'ron',
  hungarian: 'hun', bulgarian: 'bul', croatian: 'hrv', serbian: 'srp', slovak: 'slk',
  slovenian: 'slv', swahili: 'swh', amharic: 'amh',
};

// M2M100 Language Codes (100 languages)
const M2M100_CODES: Record<string, string> = {
  english: 'en', hindi: 'hi', bengali: 'bn', telugu: 'te', marathi: 'mr',
  tamil: 'ta', gujarati: 'gu', kannada: 'kn', malayalam: 'ml', punjabi: 'pa',
  urdu: 'ur', nepali: 'ne', chinese: 'zh', japanese: 'ja', korean: 'ko',
  arabic: 'ar', persian: 'fa', hebrew: 'he', russian: 'ru', ukrainian: 'uk',
  greek: 'el', thai: 'th', vietnamese: 'vi', indonesian: 'id', malay: 'ms',
  tagalog: 'tl', spanish: 'es', portuguese: 'pt', french: 'fr', german: 'de',
  italian: 'it', dutch: 'nl', polish: 'pl', turkish: 'tr', swedish: 'sv',
  danish: 'da', norwegian: 'no', finnish: 'fi', czech: 'cs', romanian: 'ro',
  hungarian: 'hu', bulgarian: 'bg', croatian: 'hr', serbian: 'sr', slovak: 'sk',
  slovenian: 'sl', swahili: 'sw', amharic: 'am',
};

// mBART-50 Language Codes (50 languages)
const MBART_CODES: Record<string, string> = {
  english: 'en_XX', hindi: 'hi_IN', bengali: 'bn_IN', telugu: 'te_IN', marathi: 'mr_IN',
  tamil: 'ta_IN', gujarati: 'gu_IN', kannada: 'kn_IN', malayalam: 'ml_IN',
  urdu: 'ur_PK', nepali: 'ne_NP', chinese: 'zh_CN', japanese: 'ja_XX', korean: 'ko_KR',
  arabic: 'ar_AR', persian: 'fa_IR', hebrew: 'he_IL', russian: 'ru_RU', ukrainian: 'uk_UA',
  greek: 'el_GR', thai: 'th_TH', vietnamese: 'vi_VN', indonesian: 'id_ID',
  spanish: 'es_XX', portuguese: 'pt_XX', french: 'fr_XX', german: 'de_DE',
  italian: 'it_IT', dutch: 'nl_XX', polish: 'pl_PL', turkish: 'tr_TR', swedish: 'sv_SE',
  finnish: 'fi_FI', czech: 'cs_CZ', romanian: 'ro_RO', hungarian: 'hu_HU',
  croatian: 'hr_HR', slovenian: 'sl_SI', lithuanian: 'lt_LT', latvian: 'lv_LV',
  estonian: 'et_EE', swahili: 'sw_KE',
};

// Model configurations in priority order
const MODELS: ModelConfig[] = [
  {
    name: 'NLLB-200',
    id: 'facebook/nllb-200-distilled-600M',
    type: 'nllb',
    languageCount: 200,
    codes: NLLB_CODES,
  },
  {
    name: 'SeamlessM4T',
    id: 'facebook/hf-seamless-m4t-large',
    type: 'seamless',
    languageCount: 100,
    codes: SEAMLESS_CODES,
  },
  {
    name: 'M2M100',
    id: 'facebook/m2m100_418M',
    type: 'm2m',
    languageCount: 100,
    codes: M2M100_CODES,
  },
  {
    name: 'mBART-50',
    id: 'facebook/mbart-large-50-many-to-many-mmt',
    type: 'mbart',
    languageCount: 50,
    codes: MBART_CODES,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  
  const aliases: Record<string, string> = {
    bangla: 'bengali', oriya: 'odia', farsi: 'persian', mandarin: 'chinese',
    en: 'english', hi: 'hindi', te: 'telugu', ta: 'tamil', bn: 'bengali',
    mr: 'marathi', gu: 'gujarati', kn: 'kannada', ml: 'malayalam', pa: 'punjabi',
    or: 'odia', ur: 'urdu', zh: 'chinese', ja: 'japanese', ko: 'korean',
    ar: 'arabic', fa: 'persian', ru: 'russian', es: 'spanish', fr: 'french',
    de: 'german', it: 'italian', pt: 'portuguese',
  };
  
  return aliases[normalized] || normalized;
}

// Find models that support the language pair
function findSupportingModels(srcLang: string, tgtLang: string): ModelConfig[] {
  return MODELS.filter(model => 
    model.codes[srcLang] && model.codes[tgtLang]
  );
}

// Translate using a specific model
async function translateWithModel(
  model: ModelConfig,
  text: string,
  srcLang: string,
  tgtLang: string,
  token: string
): Promise<string | null> {
  const srcCode = model.codes[srcLang];
  const tgtCode = model.codes[tgtLang];
  
  if (!srcCode || !tgtCode) return null;
  
  console.log(`[dl-translate] Trying ${model.name}: ${srcCode} -> ${tgtCode}`);
  
  try {
    let body: any;
    
    // Different models have different API formats
    switch (model.type) {
      case 'nllb':
        body = {
          inputs: text,
          parameters: {
            src_lang: srcCode,
            tgt_lang: tgtCode,
          }
        };
        break;
        
      case 'seamless':
        body = {
          inputs: text,
          parameters: {
            src_lang: srcCode,
            tgt_lang: tgtCode,
          }
        };
        break;
        
      case 'm2m':
        body = {
          inputs: text,
          parameters: {
            src_lang: srcCode,
            tgt_lang: tgtCode,
          }
        };
        break;
        
      case 'mbart':
        body = {
          inputs: text,
          parameters: {
            src_lang: srcCode,
            tgt_lang: tgtCode,
          }
        };
        break;
    }
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${model.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[dl-translate] ${model.name} error: ${response.status}`, errorText);
      
      // Check if model is loading
      if (response.status === 503 && errorText.includes('loading')) {
        console.log(`[dl-translate] ${model.name} is loading, trying next model...`);
        return null;
      }
      
      return null;
    }
    
    const result = await response.json();
    
    // Handle different response formats
    let translatedText: string | null = null;
    
    if (Array.isArray(result)) {
      translatedText = result[0]?.translation_text || result[0]?.generated_text || null;
    } else if (result?.translation_text) {
      translatedText = result.translation_text;
    } else if (result?.generated_text) {
      translatedText = result.generated_text;
    } else if (typeof result === 'string') {
      translatedText = result;
    }
    
    if (translatedText && translatedText.trim()) {
      console.log(`[dl-translate] ${model.name} success: "${translatedText.slice(0, 50)}..."`);
      return translatedText;
    }
    
    return null;
  } catch (error) {
    console.error(`[dl-translate] ${model.name} exception:`, error);
    return null;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLanguage, targetLanguage, preferredModel } = await req.json();

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

    // Find models that support this language pair
    let modelsToTry = findSupportingModels(sourceLang, targetLang);
    
    // If preferred model specified, put it first
    if (preferredModel) {
      const preferred = MODELS.find(m => 
        m.name.toLowerCase() === preferredModel.toLowerCase() ||
        m.id.toLowerCase().includes(preferredModel.toLowerCase())
      );
      if (preferred && modelsToTry.includes(preferred)) {
        modelsToTry = [preferred, ...modelsToTry.filter(m => m !== preferred)];
      }
    }
    
    if (modelsToTry.length === 0) {
      console.log(`[dl-translate] No models support: ${sourceLang} -> ${targetLang}`);
      return new Response(
        JSON.stringify({
          translatedText: text,
          originalText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          isTranslated: false,
          mode: 'unsupported',
          model: null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[dl-translate] ${modelsToTry.length} models available: ${modelsToTry.map(m => m.name).join(', ')}`);

    // Try each model in order until one succeeds
    let translatedText: string | null = null;
    let usedModel: string | null = null;
    
    for (const model of modelsToTry) {
      translatedText = await translateWithModel(model, text, sourceLang, targetLang, HF_TOKEN);
      
      if (translatedText) {
        usedModel = model.name;
        break;
      }
      
      // Small delay before trying next model
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If all models failed
    if (!translatedText) {
      console.error("[dl-translate] All models failed");
      return new Response(
        JSON.stringify({
          translatedText: text,
          originalText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          isTranslated: false,
          mode: 'failed',
          model: null,
          error: 'All translation models failed'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[dl-translate] Final result (${usedModel}): "${translatedText.slice(0, 50)}..."`);

    return new Response(
      JSON.stringify({
        translatedText,
        originalText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        isTranslated: translatedText !== text,
        mode: 'translate',
        model: usedModel
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

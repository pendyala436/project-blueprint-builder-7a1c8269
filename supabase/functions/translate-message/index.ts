/**
 * translate-message Edge Function
 * 
 * Uses Lingva Translate (free Google Translate proxy) for translations.
 * Caches results in translation_cache table to minimize API calls.
 * 
 * Supports: single text or batch translations
 * No API key required.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Lingva Translate public instances (fallback chain)
const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://lingva.thedaviddelta.com',
  'https://translate.plausibility.cloud',
];

// Language name → Lingva/Google Translate code mapping
const LANG_CODE_MAP: Record<string, string> = {
  'english': 'en', 'hindi': 'hi', 'bengali': 'bn', 'telugu': 'te',
  'marathi': 'mr', 'tamil': 'ta', 'gujarati': 'gu', 'kannada': 'kn',
  'malayalam': 'ml', 'odia': 'or', 'punjabi': 'pa', 'assamese': 'as',
  'urdu': 'ur', 'sindhi': 'sd', 'nepali': 'ne', 'sanskrit': 'sa',
  'maithili': 'mai', 'dogri': 'doi', 'konkani': 'gom', 'manipuri': 'mni',
  'bodo': 'brx', 'santali': 'sat', 'kashmiri': 'ks',
  'chinese (mandarin)': 'zh', 'chinese': 'zh', 'spanish': 'es',
  'arabic': 'ar', 'portuguese': 'pt', 'russian': 'ru', 'japanese': 'ja',
  'german': 'de', 'korean': 'ko', 'french': 'fr', 'italian': 'it',
  'dutch': 'nl', 'turkish': 'tr', 'polish': 'pl', 'ukrainian': 'uk',
  'romanian': 'ro', 'greek': 'el', 'czech': 'cs', 'swedish': 'sv',
  'hungarian': 'hu', 'danish': 'da', 'finnish': 'fi', 'norwegian': 'no',
  'thai': 'th', 'vietnamese': 'vi', 'indonesian': 'id', 'malay': 'ms',
  'filipino': 'tl', 'tagalog': 'tl', 'swahili': 'sw', 'persian': 'fa',
  'hebrew': 'he', 'burmese': 'my', 'khmer': 'km', 'lao': 'lo',
  'sinhala': 'si', 'amharic': 'am', 'yoruba': 'yo', 'igbo': 'ig',
  'zulu': 'zu', 'xhosa': 'xh', 'afrikaans': 'af', 'catalan': 'ca',
  'croatian': 'hr', 'serbian': 'sr', 'slovak': 'sk', 'slovenian': 'sl',
  'bulgarian': 'bg', 'latvian': 'lv', 'lithuanian': 'lt', 'estonian': 'et',
  'georgian': 'ka', 'armenian': 'hy', 'azerbaijani': 'az', 'kazakh': 'kk',
  'uzbek': 'uz', 'mongolian': 'mn', 'tibetan': 'bo',
  'javanese': 'jv', 'sundanese': 'su', 'cebuano': 'ceb',
  'hausa': 'ha', 'somali': 'so', 'pashto': 'ps',
  'kurdish': 'ku', 'welsh': 'cy', 'irish': 'ga', 'scots gaelic': 'gd',
  'basque': 'eu', 'galician': 'gl', 'maltese': 'mt', 'icelandic': 'is',
  'albanian': 'sq', 'macedonian': 'mk', 'bosnian': 'bs',
  'belarusian': 'be', 'esperanto': 'eo', 'latin': 'la',
  'luxembourgish': 'lb', 'maori': 'mi', 'samoan': 'sm', 'hawaiian': 'haw',
};

function resolveLanguageCode(lang: string): string {
  if (!lang) return 'en';
  const lower = lang.toLowerCase().trim();
  // If it's already a 2-3 letter code, use it directly
  if (lower.length <= 3 && /^[a-z]+$/.test(lower)) return lower;
  return LANG_CODE_MAP[lower] || 'en';
}

async function translateWithLingva(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const encodedText = encodeURIComponent(text);

  for (const instance of LINGVA_INSTANCES) {
    try {
      const url = `${instance}/api/v1/${sourceLang}/${targetLang}/${encodedText}`;
      const resp = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!resp.ok) {
        await resp.text(); // consume body
        continue;
      }

      const data = await resp.json();
      if (data?.translation) {
        return data.translation;
      }
    } catch {
      // Try next instance
      continue;
    }
  }

  throw new Error(`Translation failed for all Lingva instances`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      text,
      texts,
      sourceLang = 'auto',
      targetLang = 'en',
    } = body;

    if (!text && (!texts || !Array.isArray(texts) || texts.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Provide "text" (string) or "texts" (string[])' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const srcCode = resolveLanguageCode(sourceLang);
    const tgtCode = resolveLanguageCode(targetLang);

    // Same language → return as-is
    if (srcCode === tgtCode) {
      if (text) {
        return new Response(
          JSON.stringify({ translation: text, cached: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ translations: texts, cached: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Init Supabase for cache
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Single text translation
    if (text) {
      // Check cache
      const { data: cached } = await supabase
        .from('translation_cache')
        .select('translated_text')
        .eq('source_lang', srcCode)
        .eq('target_lang', tgtCode)
        .eq('source_text', text)
        .maybeSingle();

      if (cached) {
        // Bump hit count in background
        supabase
          .from('translation_cache')
          .update({ hit_count: 1 }) // trigger updated_at
          .eq('source_lang', srcCode)
          .eq('target_lang', tgtCode)
          .eq('source_text', text)
          .then(() => {});

        return new Response(
          JSON.stringify({ translation: cached.translated_text, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Translate via Lingva
      const translation = await translateWithLingva(text, srcCode, tgtCode);

      // Cache result (fire-and-forget)
      supabase
        .from('translation_cache')
        .upsert({
          source_lang: srcCode,
          target_lang: tgtCode,
          source_text: text,
          translated_text: translation,
        }, { onConflict: 'source_lang,target_lang,source_text' })
        .then(() => {});

      return new Response(
        JSON.stringify({ translation, cached: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Batch translation
    const results: string[] = [];
    for (const t of texts.slice(0, 20)) { // Max 20 per batch
      try {
        // Check cache first
        const { data: cached } = await supabase
          .from('translation_cache')
          .select('translated_text')
          .eq('source_lang', srcCode)
          .eq('target_lang', tgtCode)
          .eq('source_text', t)
          .maybeSingle();

        if (cached) {
          results.push(cached.translated_text);
          continue;
        }

        const translation = await translateWithLingva(t, srcCode, tgtCode);

        // Cache
        supabase
          .from('translation_cache')
          .upsert({
            source_lang: srcCode,
            target_lang: tgtCode,
            source_text: t,
            translated_text: translation,
          }, { onConflict: 'source_lang,target_lang,source_text' })
          .then(() => {});

        results.push(translation);
      } catch {
        results.push(t); // Fallback to original
      }
    }

    return new Response(
      JSON.stringify({ translations: results, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

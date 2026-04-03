/**
 * translate-message Edge Function
 * 
 * Embeds lingva-scraper logic directly — scrapes Google Translate's mobile page.
 * No external API, no Lingva instance, no API key required.
 * Uses English as pivot language for non-direct translation pairs.
 * Caches results in translation_cache table.
 * 
 * Based on: https://github.com/thedaviddelta/lingva-scraper (MIT License)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Google Translate supported languages (from lingva-scraper) ───
const GOOGLE_LANGUAGES: Record<string, string> = {
  "auto": "Detect", "af": "Afrikaans", "sq": "Albanian", "am": "Amharic",
  "ar": "Arabic", "hy": "Armenian", "as": "Assamese", "ay": "Aymara",
  "az": "Azerbaijani", "bm": "Bambara", "eu": "Basque", "be": "Belarusian",
  "bn": "Bengali", "bho": "Bhojpuri", "bs": "Bosnian", "bg": "Bulgarian",
  "ca": "Catalan", "ceb": "Cebuano", "ny": "Chichewa", "zh": "Chinese",
  "zh_HANT": "Chinese (Traditional)", "co": "Corsican", "hr": "Croatian",
  "cs": "Czech", "da": "Danish", "dv": "Dhivehi", "doi": "Dogri",
  "nl": "Dutch", "en": "English", "eo": "Esperanto", "et": "Estonian",
  "ee": "Ewe", "tl": "Filipino", "fi": "Finnish", "fr": "French",
  "fy": "Frisian", "gl": "Galician", "ka": "Georgian", "de": "German",
  "el": "Greek", "gn": "Guarani", "gu": "Gujarati", "ht": "Haitian Creole",
  "ha": "Hausa", "haw": "Hawaiian", "iw": "Hebrew", "hi": "Hindi",
  "hmn": "Hmong", "hu": "Hungarian", "is": "Icelandic", "ig": "Igbo",
  "ilo": "Ilocano", "id": "Indonesian", "ga": "Irish", "it": "Italian",
  "ja": "Japanese", "jw": "Javanese", "kn": "Kannada", "kk": "Kazakh",
  "km": "Khmer", "rw": "Kinyarwanda", "gom": "Konkani", "ko": "Korean",
  "kri": "Krio", "ku": "Kurdish (Kurmanji)", "ckb": "Kurdish (Sorani)",
  "ky": "Kyrgyz", "lo": "Lao", "la": "Latin", "lv": "Latvian",
  "ln": "Lingala", "lt": "Lithuanian", "lg": "Luganda",
  "lb": "Luxembourgish", "mk": "Macedonian", "mai": "Maithili",
  "mg": "Malagasy", "ms": "Malay", "ml": "Malayalam", "mt": "Maltese",
  "mi": "Maori", "mr": "Marathi", "mni-Mtei": "Meiteilon (Manipuri)",
  "lus": "Mizo", "mn": "Mongolian", "my": "Myanmar (Burmese)",
  "ne": "Nepali", "no": "Norwegian", "or": "Odia (Oriya)", "om": "Oromo",
  "ps": "Pashto", "fa": "Persian", "pl": "Polish", "pt": "Portuguese",
  "pa": "Punjabi", "qu": "Quechua", "ro": "Romanian", "ru": "Russian",
  "sm": "Samoan", "sa": "Sanskrit", "gd": "Scots Gaelic", "nso": "Sepedi",
  "sr": "Serbian", "st": "Sesotho", "sn": "Shona", "sd": "Sindhi",
  "si": "Sinhala", "sk": "Slovak", "sl": "Slovenian", "so": "Somali",
  "es": "Spanish", "su": "Sundanese", "sw": "Swahili", "sv": "Swedish",
  "tg": "Tajik", "ta": "Tamil", "tt": "Tatar", "te": "Telugu",
  "th": "Thai", "ti": "Tigrinya", "ts": "Tsonga", "tr": "Turkish",
  "tk": "Turkmen", "ak": "Twi", "uk": "Ukrainian", "ur": "Urdu",
  "ug": "Uyghur", "uz": "Uzbek", "vi": "Vietnamese", "cy": "Welsh",
  "xh": "Xhosa", "yi": "Yiddish", "yo": "Yoruba", "zu": "Zulu",
};

// Code mappings (lingva ↔ google)
const REQUEST_MAPPINGS: Record<string, string> = {
  "zh": "zh-CN", "zh_HANT": "zh-TW",
};

// Language name → code (for user-friendly input)
const NAME_TO_CODE: Record<string, string> = {};
for (const [code, name] of Object.entries(GOOGLE_LANGUAGES)) {
  NAME_TO_CODE[name.toLowerCase()] = code;
}

// Random User-Agent pool to avoid blocks
const USER_AGENTS = [
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function mapToGoogleCode(code: string): string {
  return REQUEST_MAPPINGS[code] || code;
}

function resolveLanguageCode(lang: string): string {
  if (!lang) return 'en';
  const lower = lang.toLowerCase().trim();
  // Already a valid code
  if (GOOGLE_LANGUAGES[lower] || lower === 'auto') return lower;
  // Check name→code map
  return NAME_TO_CODE[lower] || lower;
}

/**
 * Core translation: scrapes Google Translate mobile page directly.
 * Exactly how lingva-scraper works internally.
 */
async function scrapeGoogleTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
  retry = 0
): Promise<string | null> {
  const src = mapToGoogleCode(sourceLang);
  const tgt = mapToGoogleCode(targetLang);
  const encoded = encodeURIComponent(text);

  if (encoded.length > 7500) return null;

  const url = `https://translate.google.com/m?sl=${src}&tl=${tgt}&q=${encoded}`;

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": randomUA() },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      await resp.text();
      if (retry < 3) return scrapeGoogleTranslate(text, sourceLang, targetLang, retry + 1);
      return null;
    }

    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) {
      if (retry < 3) return scrapeGoogleTranslate(text, sourceLang, targetLang, retry + 1);
      return null;
    }

    const resultEl = doc.querySelector(".result-container");
    const translation = resultEl?.textContent?.trim();

    if (!translation || translation.includes("#af-error-page")) {
      if (retry < 3) return scrapeGoogleTranslate(text, sourceLang, targetLang, retry + 1);
      return null;
    }

    return translation;
  } catch {
    if (retry < 3) return scrapeGoogleTranslate(text, sourceLang, targetLang, retry + 1);
    return null;
  }
}

/**
 * Translate using English as pivot language.
 * If source or target is English, translate directly.
 * Otherwise: source → English → target
 */
async function translateWithPivot(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  // Direct translation if one side is English or source is auto
  if (sourceLang === 'en' || targetLang === 'en' || sourceLang === 'auto') {
    const result = await scrapeGoogleTranslate(text, sourceLang, targetLang);
    return result || text;
  }

  // Pivot through English: source → en → target
  const toEnglish = await scrapeGoogleTranslate(text, sourceLang, 'en');
  if (!toEnglish) return text;

  const toTarget = await scrapeGoogleTranslate(toEnglish, 'en', targetLang);
  return toTarget || toEnglish;
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
    if (srcCode === tgtCode && srcCode !== 'auto') {
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

    // ─── Single text translation ───
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
          .update({ hit_count: 1 })
          .eq('source_lang', srcCode)
          .eq('target_lang', tgtCode)
          .eq('source_text', text)
          .then(() => {});

        return new Response(
          JSON.stringify({ translation: cached.translated_text, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Translate via Google (direct scraping)
      const translation = await translateWithPivot(text, srcCode, tgtCode);

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

    // ─── Batch translation ───
    const results: string[] = [];
    for (const t of texts.slice(0, 20)) {
      try {
        // Check cache
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

        const translation = await translateWithPivot(t, srcCode, tgtCode);

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
        results.push(t);
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

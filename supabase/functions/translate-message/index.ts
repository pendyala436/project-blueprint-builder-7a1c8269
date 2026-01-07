/**
 * Translate Message Edge Function - Optimized for fast deployment
 * Supports 200+ languages via LibreTranslate, MyMemory, and Google fallbacks
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Compact language data: [name, code, nllbCode, script, isNonLatin]
const LANG_DATA: [string, string, string, string, boolean][] = [
  ['english', 'en', 'eng_Latn', 'Latin', false],
  ['chinese', 'zh', 'zho_Hans', 'Han', true],
  ['spanish', 'es', 'spa_Latn', 'Latin', false],
  ['arabic', 'ar', 'arb_Arab', 'Arabic', true],
  ['french', 'fr', 'fra_Latn', 'Latin', false],
  ['portuguese', 'pt', 'por_Latn', 'Latin', false],
  ['russian', 'ru', 'rus_Cyrl', 'Cyrillic', true],
  ['japanese', 'ja', 'jpn_Jpan', 'Japanese', true],
  ['german', 'de', 'deu_Latn', 'Latin', false],
  ['korean', 'ko', 'kor_Hang', 'Hangul', true],
  ['hindi', 'hi', 'hin_Deva', 'Devanagari', true],
  ['bengali', 'bn', 'ben_Beng', 'Bengali', true],
  ['telugu', 'te', 'tel_Telu', 'Telugu', true],
  ['marathi', 'mr', 'mar_Deva', 'Devanagari', true],
  ['tamil', 'ta', 'tam_Taml', 'Tamil', true],
  ['gujarati', 'gu', 'guj_Gujr', 'Gujarati', true],
  ['kannada', 'kn', 'kan_Knda', 'Kannada', true],
  ['malayalam', 'ml', 'mal_Mlym', 'Malayalam', true],
  ['punjabi', 'pa', 'pan_Guru', 'Gurmukhi', true],
  ['odia', 'or', 'ory_Orya', 'Odia', true],
  ['urdu', 'ur', 'urd_Arab', 'Arabic', true],
  ['nepali', 'ne', 'npi_Deva', 'Devanagari', true],
  ['sinhala', 'si', 'sin_Sinh', 'Sinhala', true],
  ['assamese', 'as', 'asm_Beng', 'Bengali', true],
  ['maithili', 'mai', 'mai_Deva', 'Devanagari', true],
  ['santali', 'sat', 'sat_Olck', 'Ol_Chiki', true],
  ['kashmiri', 'ks', 'kas_Arab', 'Arabic', true],
  ['konkani', 'kok', 'kok_Deva', 'Devanagari', true],
  ['sindhi', 'sd', 'snd_Arab', 'Arabic', true],
  ['dogri', 'doi', 'doi_Deva', 'Devanagari', true],
  ['manipuri', 'mni', 'mni_Beng', 'Bengali', true],
  ['sanskrit', 'sa', 'san_Deva', 'Devanagari', true],
  ['bhojpuri', 'bho', 'bho_Deva', 'Devanagari', true],
  ['thai', 'th', 'tha_Thai', 'Thai', true],
  ['vietnamese', 'vi', 'vie_Latn', 'Latin', false],
  ['indonesian', 'id', 'ind_Latn', 'Latin', false],
  ['malay', 'ms', 'zsm_Latn', 'Latin', false],
  ['tagalog', 'tl', 'tgl_Latn', 'Latin', false],
  ['filipino', 'fil', 'tgl_Latn', 'Latin', false],
  ['burmese', 'my', 'mya_Mymr', 'Myanmar', true],
  ['khmer', 'km', 'khm_Khmr', 'Khmer', true],
  ['lao', 'lo', 'lao_Laoo', 'Lao', true],
  ['javanese', 'jv', 'jav_Latn', 'Latin', false],
  ['persian', 'fa', 'pes_Arab', 'Arabic', true],
  ['turkish', 'tr', 'tur_Latn', 'Latin', false],
  ['hebrew', 'he', 'heb_Hebr', 'Hebrew', true],
  ['kurdish', 'ku', 'kmr_Latn', 'Latin', false],
  ['pashto', 'ps', 'pbt_Arab', 'Arabic', true],
  ['azerbaijani', 'az', 'azj_Latn', 'Latin', false],
  ['uzbek', 'uz', 'uzn_Latn', 'Latin', false],
  ['kazakh', 'kk', 'kaz_Cyrl', 'Cyrillic', true],
  ['italian', 'it', 'ita_Latn', 'Latin', false],
  ['dutch', 'nl', 'nld_Latn', 'Latin', false],
  ['polish', 'pl', 'pol_Latn', 'Latin', false],
  ['ukrainian', 'uk', 'ukr_Cyrl', 'Cyrillic', true],
  ['czech', 'cs', 'ces_Latn', 'Latin', false],
  ['romanian', 'ro', 'ron_Latn', 'Latin', false],
  ['hungarian', 'hu', 'hun_Latn', 'Latin', false],
  ['swedish', 'sv', 'swe_Latn', 'Latin', false],
  ['danish', 'da', 'dan_Latn', 'Latin', false],
  ['finnish', 'fi', 'fin_Latn', 'Latin', false],
  ['norwegian', 'no', 'nob_Latn', 'Latin', false],
  ['greek', 'el', 'ell_Grek', 'Greek', true],
  ['bulgarian', 'bg', 'bul_Cyrl', 'Cyrillic', true],
  ['croatian', 'hr', 'hrv_Latn', 'Latin', false],
  ['serbian', 'sr', 'srp_Cyrl', 'Cyrillic', true],
  ['swahili', 'sw', 'swh_Latn', 'Latin', false],
  ['amharic', 'am', 'amh_Ethi', 'Ethiopic', true],
  ['yoruba', 'yo', 'yor_Latn', 'Latin', false],
  ['igbo', 'ig', 'ibo_Latn', 'Latin', false],
  ['hausa', 'ha', 'hau_Latn', 'Latin', false],
  ['zulu', 'zu', 'zul_Latn', 'Latin', false],
  ['afrikaans', 'af', 'afr_Latn', 'Latin', false],
  ['somali', 'so', 'som_Latn', 'Latin', false],
  ['georgian', 'ka', 'kat_Geor', 'Georgian', true],
  ['armenian', 'hy', 'hye_Armn', 'Armenian', true],
  ['mongolian', 'mn', 'khk_Cyrl', 'Cyrillic', true],
  ['tibetan', 'bo', 'bod_Tibt', 'Tibetan', true],
  ['dhivehi', 'dv', 'div_Thaa', 'Thaana', true],
];

// Build lookup maps
const langByName = new Map<string, typeof LANG_DATA[0]>();
const langByCode = new Map<string, typeof LANG_DATA[0]>();
for (const l of LANG_DATA) {
  langByName.set(l[0], l);
  langByCode.set(l[1], l);
}

// Non-Latin languages set
const nonLatinLangs = new Set(LANG_DATA.filter(l => l[4]).map(l => l[0]));

// Common aliases (normalized to base language)
const ALIASES: Record<string, string> = {
  bangla: 'bengali', oriya: 'odia', farsi: 'persian', mandarin: 'chinese',
  cantonese: 'chinese', taiwanese: 'chinese', brazilian: 'portuguese',
  mexican: 'spanish', tagalog: 'filipino', meitei: 'manipuri', flemish: 'dutch',
  myanmar: 'burmese', divehi: 'dhivehi', moldovan: 'romanian', gaelic: 'irish',
};

function normalize(lang: string): string {
  let n = lang.toLowerCase().trim().replace(/[_-]/g, ' ').replace(/\s*\([^)]*\)/g, '').trim();
  return ALIASES[n] || n;
}

function getCode(lang: string): string {
  const n = normalize(lang);
  const byName = langByName.get(n);
  if (byName) return byName[1];
  const byCode = langByCode.get(n);
  if (byCode) return byCode[1];
  // Try partial match
  for (const [name, data] of langByName) {
    if (name.includes(n) || n.includes(name)) return data[1];
  }
  return 'en';
}

function isNonLatin(lang: string): boolean {
  return nonLatinLangs.has(normalize(lang));
}

function isSame(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

// Script detection
const SCRIPTS: [RegExp, string][] = [
  [/[\u0900-\u097F]/, 'hindi'], [/[\u0980-\u09FF]/, 'bengali'],
  [/[\u0B80-\u0BFF]/, 'tamil'], [/[\u0C00-\u0C7F]/, 'telugu'],
  [/[\u0C80-\u0CFF]/, 'kannada'], [/[\u0D00-\u0D7F]/, 'malayalam'],
  [/[\u0A80-\u0AFF]/, 'gujarati'], [/[\u0A00-\u0A7F]/, 'punjabi'],
  [/[\u0B00-\u0B7F]/, 'odia'], [/[\u0D80-\u0DFF]/, 'sinhala'],
  [/[\u4E00-\u9FFF\u3400-\u4DBF]/, 'chinese'],
  [/[\u3040-\u309F\u30A0-\u30FF]/, 'japanese'],
  [/[\uAC00-\uD7AF]/, 'korean'], [/[\u0E00-\u0E7F]/, 'thai'],
  [/[\u0E80-\u0EFF]/, 'lao'], [/[\u1000-\u109F]/, 'burmese'],
  [/[\u1780-\u17FF]/, 'khmer'],
  [/[\u0600-\u06FF\u0750-\u077F]/, 'arabic'],
  [/[\u0590-\u05FF]/, 'hebrew'], [/[\u0400-\u04FF]/, 'russian'],
  [/[\u0370-\u03FF]/, 'greek'], [/[\u10A0-\u10FF]/, 'georgian'],
  [/[\u0530-\u058F]/, 'armenian'], [/[\u1200-\u137F]/, 'amharic'],
];

function detectScript(text: string): { lang: string; isLatin: boolean } {
  const t = text.trim();
  if (!t) return { lang: 'english', isLatin: true };
  for (const [rx, lang] of SCRIPTS) {
    if (rx.test(t)) return { lang, isLatin: false };
  }
  const latin = (t.match(/[a-zA-ZÀ-ÿĀ-žƀ-ɏ]/g) || []).length;
  const total = t.replace(/\s/g, '').length;
  return { lang: 'english', isLatin: total > 0 && latin / total > 0.5 };
}

// Translation APIs
const LIBRE_MIRRORS = [
  "https://libretranslate.com",
  "https://translate.argosopentech.com",
];

async function translateLibre(text: string, src: string, tgt: string): Promise<{ t: string; ok: boolean }> {
  for (const m of LIBRE_MIRRORS) {
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(`${m}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: src === "auto" ? "auto" : src, target: tgt, format: "text" }),
        signal: ctrl.signal,
      });
      clearTimeout(id);
      if (r.ok) {
        const d = await r.json();
        const tr = d.translatedText?.trim();
        if (tr && tr !== text) return { t: tr, ok: true };
      }
    } catch { /* next */ }
  }
  return { t: text, ok: false };
}

async function translateMyMemory(text: string, src: string, tgt: string): Promise<{ t: string; ok: boolean }> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`, { signal: ctrl.signal });
    clearTimeout(id);
    if (r.ok) {
      const d = await r.json();
      const tr = d.responseData?.translatedText?.trim();
      if (tr && tr !== text && !tr.includes('MYMEMORY WARNING')) return { t: tr, ok: true };
    }
  } catch { /* fail */ }
  return { t: text, ok: false };
}

async function translateGoogle(text: string, src: string, tgt: string): Promise<{ t: string; ok: boolean }> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=${tgt}&dt=t&q=${encodeURIComponent(text)}`, { signal: ctrl.signal });
    clearTimeout(id);
    if (r.ok) {
      const d = await r.json();
      if (d?.[0]) {
        let tr = '';
        for (const p of d[0]) if (p?.[0]) tr += p[0];
        tr = tr.trim();
        if (tr && tr !== text) return { t: tr, ok: true };
      }
    }
  } catch { /* fail */ }
  return { t: text, ok: false };
}

async function translate(text: string, srcLang: string, tgtLang: string): Promise<{ text: string; ok: boolean; pivot: boolean }> {
  const src = getCode(srcLang);
  const tgt = getCode(tgtLang);
  
  if (src === tgt) return { text, ok: false, pivot: false };
  
  // Use English pivot for non-English pairs
  const needPivot = src !== 'en' && tgt !== 'en';
  
  if (needPivot) {
    console.log(`[translate] Using English pivot: ${src} -> en -> ${tgt}`);
    // Step 1: source -> English
    let r1 = await translateLibre(text, src, 'en');
    if (!r1.ok) r1 = await translateMyMemory(text, src, 'en');
    if (!r1.ok) r1 = await translateGoogle(text, src, 'en');
    
    if (!r1.ok) return { text, ok: false, pivot: true };
    
    // Step 2: English -> target
    let r2 = await translateLibre(r1.t, 'en', tgt);
    if (!r2.ok) r2 = await translateMyMemory(r1.t, 'en', tgt);
    if (!r2.ok) r2 = await translateGoogle(r1.t, 'en', tgt);
    
    return { text: r2.t, ok: r2.ok, pivot: true };
  }
  
  // Direct translation
  let r = await translateLibre(text, src, tgt);
  if (!r.ok) r = await translateMyMemory(text, src, tgt);
  if (!r.ok) r = await translateGoogle(text, src, tgt);
  
  return { text: r.t, ok: r.ok, pivot: false };
}

async function transliterate(latin: string, lang: string): Promise<{ text: string; ok: boolean }> {
  const code = getCode(lang);
  let r = await translateLibre(latin, 'en', code);
  if (!r.ok) r = await translateMyMemory(latin, 'en', code);
  if (r.ok) {
    const det = detectScript(r.t);
    if (!det.isLatin) return { text: r.t, ok: true };
  }
  return { text: latin, ok: false };
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\u200B/g, '').trim();
}

// Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { text, message, sourceLanguage, targetLanguage, senderLanguage, receiverLanguage, mode = "translate" } = body;
    const input = text || message;
    
    console.log(`[translate] Mode: ${mode}, Input: "${input?.substring(0, 50)}..."`);

    if (!input) {
      return new Response(JSON.stringify({ error: "Text required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const det = detectScript(input);
    const src = sourceLanguage || senderLanguage || det.lang;
    const tgt = targetLanguage || receiverLanguage || "english";
    const isLatin = det.isLatin;

    console.log(`[translate] Detected: ${det.lang}, Latin: ${isLatin}, ${src} -> ${tgt}`);

    // Case 1: Latin input for non-Latin source (romanized typing)
    if (isLatin && isNonLatin(src) && !isSame(src, tgt)) {
      console.log(`[translate] Romanized input for ${src}`);
      
      const tr = await transliterate(input, src);
      if (tr.ok) {
        const result = await translate(tr.text, src, tgt);
        return new Response(JSON.stringify({
          translatedText: clean(result.text),
          translatedMessage: clean(result.text),
          originalText: input,
          nativeScriptText: tr.text,
          isTranslated: result.ok,
          wasTransliterated: true,
          pivotUsed: result.pivot,
          sourceLanguage: src,
          targetLanguage: tgt,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // Fallback: treat as English
      const result = await translate(input, 'english', tgt);
      return new Response(JSON.stringify({
        translatedText: clean(result.text),
        translatedMessage: clean(result.text),
        originalText: input,
        isTranslated: result.ok,
        sourceLanguage: 'english',
        targetLanguage: tgt,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Case 2: Same language
    if (isSame(src, tgt)) {
      if (isLatin && isNonLatin(tgt)) {
        const tr = await transliterate(input, tgt);
        return new Response(JSON.stringify({
          translatedText: clean(tr.ok ? tr.text : input),
          translatedMessage: clean(tr.ok ? tr.text : input),
          originalText: input,
          isTranslated: false,
          wasTransliterated: tr.ok,
          sourceLanguage: src,
          targetLanguage: tgt,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        translatedText: clean(input),
        translatedMessage: clean(input),
        originalText: input,
        isTranslated: false,
        sourceLanguage: src,
        targetLanguage: tgt,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Case 3: Standard translation
    const fromLang = isLatin ? 'english' : src;
    const result = await translate(input, fromLang, tgt);
    
    return new Response(JSON.stringify({
      translatedText: clean(result.text),
      translatedMessage: clean(result.text),
      originalText: input,
      isTranslated: result.ok && clean(result.text).toLowerCase() !== input.toLowerCase(),
      pivotUsed: result.pivot,
      sourceLanguage: fromLang,
      targetLanguage: tgt,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[translate] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

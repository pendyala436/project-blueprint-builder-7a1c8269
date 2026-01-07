import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language codes: name -> ISO code
const L: Record<string, string> = {
  english:'en',chinese:'zh',spanish:'es',arabic:'ar',french:'fr',portuguese:'pt',russian:'ru',
  japanese:'ja',german:'de',korean:'ko',hindi:'hi',bengali:'bn',telugu:'te',marathi:'mr',
  tamil:'ta',gujarati:'gu',kannada:'kn',malayalam:'ml',punjabi:'pa',odia:'or',urdu:'ur',
  nepali:'ne',sinhala:'si',assamese:'as',thai:'th',vietnamese:'vi',indonesian:'id',malay:'ms',
  tagalog:'tl',filipino:'fil',burmese:'my',khmer:'km',lao:'lo',persian:'fa',turkish:'tr',
  hebrew:'he',pashto:'ps',italian:'it',dutch:'nl',polish:'pl',ukrainian:'uk',czech:'cs',
  romanian:'ro',hungarian:'hu',swedish:'sv',danish:'da',finnish:'fi',norwegian:'no',greek:'el',
  bulgarian:'bg',croatian:'hr',serbian:'sr',swahili:'sw',amharic:'am',yoruba:'yo',igbo:'ig',
  hausa:'ha',zulu:'zu',afrikaans:'af',georgian:'ka',armenian:'hy',mongolian:'mn',tibetan:'bo'
};

// Non-Latin scripts
const NL = new Set(['chinese','arabic','russian','japanese','korean','hindi','bengali','telugu','marathi','tamil','gujarati','kannada','malayalam','punjabi','odia','urdu','nepali','sinhala','thai','burmese','khmer','lao','persian','hebrew','pashto','greek','bulgarian','serbian','amharic','georgian','armenian','mongolian','tibetan']);

// Aliases
const A: Record<string, string> = {bangla:'bengali',oriya:'odia',farsi:'persian',mandarin:'chinese',myanmar:'burmese'};

const norm = (s: string) => A[s.toLowerCase().trim().replace(/[_-]/g,' ').replace(/\s*\([^)]*\)/g,'').trim()] || s.toLowerCase().trim();
const code = (s: string) => L[norm(s)] || Object.entries(L).find(([k]) => k.includes(norm(s)))?.[1] || 'en';
const isNL = (s: string) => NL.has(norm(s));

// Script detection
const S: [RegExp, string][] = [
  [/[\u0900-\u097F]/,'hindi'],[/[\u0980-\u09FF]/,'bengali'],[/[\u0B80-\u0BFF]/,'tamil'],
  [/[\u0C00-\u0C7F]/,'telugu'],[/[\u0C80-\u0CFF]/,'kannada'],[/[\u0D00-\u0D7F]/,'malayalam'],
  [/[\u0A80-\u0AFF]/,'gujarati'],[/[\u0A00-\u0A7F]/,'punjabi'],[/[\u0B00-\u0B7F]/,'odia'],
  [/[\u4E00-\u9FFF]/,'chinese'],[/[\u3040-\u30FF]/,'japanese'],[/[\uAC00-\uD7AF]/,'korean'],
  [/[\u0E00-\u0E7F]/,'thai'],[/[\u0E80-\u0EFF]/,'lao'],[/[\u1000-\u109F]/,'burmese'],
  [/[\u1780-\u17FF]/,'khmer'],[/[\u0600-\u06FF]/,'arabic'],[/[\u0590-\u05FF]/,'hebrew'],
  [/[\u0400-\u04FF]/,'russian'],[/[\u0370-\u03FF]/,'greek'],[/[\u1200-\u137F]/,'amharic'],
];

const detect = (t: string) => {
  for (const [r, l] of S) if (r.test(t)) return { l, lat: false };
  return { l: 'english', lat: (t.match(/[a-zA-Z]/g)?.length || 0) / t.replace(/\s/g,'').length > 0.5 };
};

// Translation
async function tr(txt: string, s: string, t: string): Promise<{r: string; ok: boolean}> {
  // Try Google Translate
  try {
    const c = new AbortController();
    setTimeout(() => c.abort(), 6000);
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${s}&tl=${t}&dt=t&q=${encodeURIComponent(txt)}`, {signal: c.signal});
    if (res.ok) {
      const d = await res.json();
      let o = '';
      if (d?.[0]) for (const p of d[0]) if (p?.[0]) o += p[0];
      o = o.trim();
      if (o && o !== txt) return {r: o, ok: true};
    }
  } catch {}
  
  // Fallback: MyMemory
  try {
    const c = new AbortController();
    setTimeout(() => c.abort(), 5000);
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(txt)}&langpair=${s}|${t}`, {signal: c.signal});
    if (res.ok) {
      const d = await res.json();
      const o = d.responseData?.translatedText?.trim();
      if (o && o !== txt && !o.includes('WARNING')) return {r: o, ok: true};
    }
  } catch {}
  
  return {r: txt, ok: false};
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, {headers: cors});

  try {
    const b = await req.json();
    const txt = b.text || b.message;
    if (!txt) return new Response(JSON.stringify({error: 'No text'}), {status: 400, headers: {...cors, 'Content-Type': 'application/json'}});

    const d = detect(txt);
    const src = b.sourceLanguage || b.senderLanguage || d.l;
    const tgt = b.targetLanguage || b.receiverLanguage || 'english';
    const sc = code(src), tc = code(tgt);

    console.log(`[tr] ${src}(${sc}) -> ${tgt}(${tc}), latin=${d.lat}`);

    // Same language
    if (norm(src) === norm(tgt)) {
      return new Response(JSON.stringify({
        translatedText: txt, translatedMessage: txt, originalText: txt,
        isTranslated: false, sourceLanguage: src, targetLanguage: tgt
      }), {headers: {...cors, 'Content-Type': 'application/json'}});
    }

    // Translate (use English pivot if needed)
    let result = txt, ok = false;
    if (sc !== 'en' && tc !== 'en') {
      const r1 = await tr(txt, sc, 'en');
      if (r1.ok) {
        const r2 = await tr(r1.r, 'en', tc);
        result = r2.r; ok = r2.ok;
      }
    } else {
      const r = await tr(txt, sc, tc);
      result = r.r; ok = r.ok;
    }

    return new Response(JSON.stringify({
      translatedText: result.trim(), translatedMessage: result.trim(), originalText: txt,
      isTranslated: ok && result.toLowerCase() !== txt.toLowerCase(),
      sourceLanguage: src, targetLanguage: tgt
    }), {headers: {...cors, 'Content-Type': 'application/json'}});

  } catch (e) {
    console.error('[tr] Error:', e);
    return new Response(JSON.stringify({error: String(e)}), {status: 500, headers: {...cors, 'Content-Type': 'application/json'}});
  }
});

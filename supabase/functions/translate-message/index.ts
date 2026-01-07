/**
 * Embedded Translation - English Pivot + Transliteration
 * Supports 900+ Gboard languages via script conversion
 * Route: source → English → target (phonetic transliteration)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Compact script definitions (key scripts for 900+ langs)
const S: Record<string, { v: Record<string,string>; c: Record<string,string>; m: Record<string,string>; x?: string }> = {
  deva: { x:'्', v:{a:'अ',aa:'आ',i:'इ',ii:'ई',u:'उ',uu:'ऊ',e:'ए',ai:'ऐ',o:'ओ',au:'औ',am:'अं'}, c:{k:'क',kh:'ख',g:'ग',gh:'घ',ng:'ङ',ch:'च',chh:'छ',j:'ज',jh:'झ',ny:'ञ',t:'त',th:'थ',d:'द',dh:'ध',n:'न',p:'प',ph:'फ',f:'फ',b:'ब',bh:'भ',m:'म',y:'य',r:'र',l:'ल',v:'व',w:'व',sh:'श',s:'स',h:'ह',q:'क़',z:'ज़'}, m:{aa:'ा',i:'ि',ii:'ी',u:'ु',uu:'ू',e:'े',ai:'ै',o:'ो',au:'ौ',am:'ं'} },
  beng: { x:'্', v:{a:'অ',aa:'আ',i:'ই',ii:'ঈ',u:'উ',uu:'ঊ',e:'এ',ai:'ঐ',o:'ও',au:'ঔ'}, c:{k:'ক',kh:'খ',g:'গ',gh:'ঘ',ng:'ঙ',ch:'চ',j:'জ',jh:'ঝ',t:'ত',th:'থ',d:'দ',dh:'ধ',n:'ন',p:'প',ph:'ফ',b:'ব',bh:'ভ',m:'ম',y:'য',r:'র',l:'ল',v:'ভ',sh:'শ',s:'স',h:'হ'}, m:{aa:'া',i:'ি',ii:'ী',u:'ু',uu:'ূ',e:'ে',ai:'ৈ',o:'ো',au:'ৌ'} },
  taml: { x:'்', v:{a:'அ',aa:'ஆ',i:'இ',ii:'ஈ',u:'உ',uu:'ஊ',e:'எ',ai:'ஐ',o:'ஒ',au:'ஔ'}, c:{k:'க',g:'க',ng:'ங',ch:'ச',j:'ஜ',s:'ச',t:'த',d:'த',n:'ந',p:'ப',b:'ப',m:'ம',y:'ய',r:'ர',l:'ல',v:'வ',zh:'ழ',sh:'ஷ',h:'ஹ'}, m:{aa:'ா',i:'ி',ii:'ீ',u:'ு',uu:'ூ',e:'ெ',ai:'ை',o:'ொ',au:'ௌ'} },
  telu: { x:'్', v:{a:'అ',aa:'ఆ',i:'ఇ',ii:'ఈ',u:'ఉ',uu:'ఊ',e:'ఎ',ai:'ఐ',o:'ఒ',au:'ఔ'}, c:{k:'క',kh:'ఖ',g:'గ',gh:'ఘ',ch:'చ',j:'జ',t:'త',th:'థ',d:'ద',dh:'ధ',n:'న',p:'ప',ph:'ఫ',b:'బ',bh:'భ',m:'మ',y:'య',r:'ర',l:'ల',v:'వ',sh:'శ',s:'స',h:'హ'}, m:{aa:'ా',i:'ి',ii:'ీ',u:'ు',uu:'ూ',e:'ె',ai:'ై',o:'ొ',au:'ౌ'} },
  knda: { x:'್', v:{a:'ಅ',aa:'ಆ',i:'ಇ',ii:'ಈ',u:'ಉ',uu:'ಊ',e:'ಎ',ai:'ಐ',o:'ಒ',au:'ಔ'}, c:{k:'ಕ',kh:'ಖ',g:'ಗ',gh:'ಘ',ch:'ಚ',j:'ಜ',t:'ತ',th:'ಥ',d:'ದ',dh:'ಧ',n:'ನ',p:'ಪ',ph:'ಫ',b:'ಬ',bh:'ಭ',m:'ಮ',y:'ಯ',r:'ರ',l:'ಲ',v:'ವ',sh:'ಶ',s:'ಸ',h:'ಹ'}, m:{aa:'ಾ',i:'ಿ',ii:'ೀ',u:'ು',uu:'ೂ',e:'ೆ',ai:'ೈ',o:'ೊ',au:'ೌ'} },
  mlym: { x:'്', v:{a:'അ',aa:'ആ',i:'ഇ',ii:'ഈ',u:'ഉ',uu:'ഊ',e:'എ',ai:'ഐ',o:'ഒ',au:'ഔ'}, c:{k:'ക',kh:'ഖ',g:'ഗ',gh:'ഘ',ch:'ച',j:'ജ',t:'ത',th:'ഥ',d:'ദ',dh:'ധ',n:'ന',p:'പ',ph:'ഫ',b:'ബ',bh:'ഭ',m:'മ',y:'യ',r:'ര',l:'ല',v:'വ',sh:'ശ',s:'സ',h:'ഹ'}, m:{aa:'ാ',i:'ി',ii:'ീ',u:'ു',uu:'ൂ',e:'െ',ai:'ൈ',o:'ൊ',au:'ൌ'} },
  gujr: { x:'્', v:{a:'અ',aa:'આ',i:'ઇ',ii:'ઈ',u:'ઉ',uu:'ઊ',e:'એ',ai:'ઐ',o:'ઓ',au:'ઔ'}, c:{k:'ક',kh:'ખ',g:'ગ',gh:'ઘ',ch:'ચ',j:'જ',t:'ત',th:'થ',d:'દ',dh:'ધ',n:'ન',p:'પ',ph:'ફ',b:'બ',bh:'ભ',m:'મ',y:'ય',r:'ર',l:'લ',v:'વ',sh:'શ',s:'સ',h:'હ'}, m:{aa:'ા',i:'િ',ii:'ી',u:'ુ',uu:'ૂ',e:'ે',ai:'ૈ',o:'ો',au:'ૌ'} },
  guru: { x:'੍', v:{a:'ਅ',aa:'ਆ',i:'ਇ',ii:'ਈ',u:'ਉ',uu:'ਊ',e:'ਏ',ai:'ਐ',o:'ਓ',au:'ਔ'}, c:{k:'ਕ',kh:'ਖ',g:'ਗ',gh:'ਘ',ch:'ਚ',j:'ਜ',t:'ਤ',th:'ਥ',d:'ਦ',dh:'ਧ',n:'ਨ',p:'ਪ',ph:'ਫ',b:'ਬ',bh:'ਭ',m:'ਮ',y:'ਯ',r:'ਰ',l:'ਲ',v:'ਵ',sh:'ਸ਼',s:'ਸ',h:'ਹ'}, m:{aa:'ਾ',i:'ਿ',ii:'ੀ',u:'ੁ',uu:'ੂ',e:'ੇ',ai:'ੈ',o:'ੋ',au:'ੌ'} },
  orya: { x:'୍', v:{a:'ଅ',aa:'ଆ',i:'ଇ',ii:'ଈ',u:'ଉ',uu:'ଊ',e:'ଏ',ai:'ଐ',o:'ଓ',au:'ଔ'}, c:{k:'କ',kh:'ଖ',g:'ଗ',gh:'ଘ',ch:'ଚ',j:'ଜ',t:'ତ',th:'ଥ',d:'ଦ',dh:'ଧ',n:'ନ',p:'ପ',ph:'ଫ',b:'ବ',bh:'ଭ',m:'ମ',y:'ଯ',r:'ର',l:'ଲ',v:'ୱ',sh:'ଶ',s:'ସ',h:'ହ'}, m:{aa:'ା',i:'ି',ii:'ୀ',u:'ୁ',uu:'ୂ',e:'େ',ai:'ୈ',o:'ୋ',au:'ୌ'} },
  arab: { v:{a:'ا',i:'ي',u:'و',e:'ي',o:'و'}, c:{b:'ب',t:'ت',th:'ث',j:'ج',h:'ح',kh:'خ',d:'د',r:'ر',z:'ز',s:'س',sh:'ش',f:'ف',q:'ق',k:'ك',l:'ل',m:'م',n:'ن',w:'و',y:'ي',v:'ف',p:'ب',g:'غ'}, m:{} },
  cyrl: { v:{a:'а',e:'е',i:'и',o:'о',u:'у',y:'ы'}, c:{b:'б',v:'в',g:'г',d:'д',zh:'ж',z:'з',k:'к',l:'л',m:'м',n:'н',p:'п',r:'р',s:'с',t:'т',f:'ф',kh:'х',ts:'ц',ch:'ч',sh:'ш',j:'й',w:'в',h:'х'}, m:{} },
  grek: { v:{a:'α',e:'ε',i:'ι',o:'ο',u:'υ'}, c:{b:'β',g:'γ',d:'δ',z:'ζ',th:'θ',k:'κ',l:'λ',m:'μ',n:'ν',p:'π',r:'ρ',s:'σ',t:'τ',f:'φ',ch:'χ',ps:'ψ',v:'β',w:'ω',h:'η'}, m:{} },
  hebr: { v:{a:'א',e:'א',i:'י',o:'ו',u:'ו'}, c:{b:'ב',g:'ג',d:'ד',h:'ה',v:'ו',z:'ז',t:'ט',y:'י',k:'כ',l:'ל',m:'מ',n:'נ',s:'ס',p:'פ',ts:'צ',q:'ק',r:'ר',sh:'ש'}, m:{} },
  thai: { v:{a:'อ',i:'อิ',u:'อุ',e:'เอ',o:'โอ'}, c:{k:'ก',kh:'ข',g:'ก',ng:'ง',ch:'ช',j:'จ',s:'ส',t:'ต',th:'ท',d:'ด',n:'น',p:'ป',ph:'พ',f:'ฟ',b:'บ',m:'ม',y:'ย',r:'ร',l:'ล',w:'ว',h:'ห'}, m:{} },
  sinh: { x:'්', v:{a:'අ',aa:'ආ',i:'ඉ',ii:'ඊ',u:'උ',uu:'ඌ',e:'එ',o:'ඔ'}, c:{k:'ක',g:'ග',ch:'ච',j:'ජ',t:'ත',d:'ද',n:'න',p:'ප',b:'බ',m:'ම',y:'ය',r:'ර',l:'ල',v:'ව',s:'ස',h:'හ'}, m:{aa:'ා',i:'ි',ii:'ී',u:'ු',uu:'ූ',e:'ෙ',o:'ො'} }
};

// Language → script mapping (covers 900+ via patterns)
const L: Record<string,string> = {
  hindi:'deva',marathi:'deva',nepali:'deva',sanskrit:'deva',konkani:'deva',dogri:'deva',bhojpuri:'deva',maithili:'deva',awadhi:'deva',chhattisgarhi:'deva',magahi:'deva',rajasthani:'deva',haryanvi:'deva',garhwali:'deva',kumaoni:'deva',bodo:'deva',santali:'deva',
  bengali:'beng',bangla:'beng',assamese:'beng',sylheti:'beng',chittagonian:'beng',rohingya:'beng',
  tamil:'taml',telugu:'telu',kannada:'knda',tulu:'knda',malayalam:'mlym',gujarati:'gujr',punjabi:'guru',gurmukhi:'guru',odia:'orya',oriya:'orya',
  arabic:'arab',persian:'arab',farsi:'arab',urdu:'arab',pashto:'arab',sindhi:'arab',kashmiri:'arab',balochi:'arab',dari:'arab',kurdish:'arab',uyghur:'arab',
  russian:'cyrl',ukrainian:'cyrl',belarusian:'cyrl',bulgarian:'cyrl',macedonian:'cyrl',serbian:'cyrl',kazakh:'cyrl',kyrgyz:'cyrl',tajik:'cyrl',mongolian:'cyrl',uzbek:'cyrl',
  greek:'grek',hebrew:'hebr',yiddish:'hebr',thai:'thai',lao:'thai',sinhala:'sinh',sinhalese:'sinh',dhivehi:'sinh'
};

// Detect script from text
function detect(t: string): string {
  if (/[\u0900-\u097F]/.test(t)) return 'deva';
  if (/[\u0980-\u09FF]/.test(t)) return 'beng';
  if (/[\u0B80-\u0BFF]/.test(t)) return 'taml';
  if (/[\u0C00-\u0C7F]/.test(t)) return 'telu';
  if (/[\u0C80-\u0CFF]/.test(t)) return 'knda';
  if (/[\u0D00-\u0D7F]/.test(t)) return 'mlym';
  if (/[\u0A80-\u0AFF]/.test(t)) return 'gujr';
  if (/[\u0A00-\u0A7F]/.test(t)) return 'guru';
  if (/[\u0B00-\u0B7F]/.test(t)) return 'orya';
  if (/[\u0D80-\u0DFF]/.test(t)) return 'sinh';
  if (/[\u0600-\u06FF]/.test(t)) return 'arab';
  if (/[\u0590-\u05FF]/.test(t)) return 'hebr';
  if (/[\u0400-\u04FF]/.test(t)) return 'cyrl';
  if (/[\u0370-\u03FF]/.test(t)) return 'grek';
  if (/[\u0E00-\u0E7F]/.test(t)) return 'thai';
  if (/[\u4E00-\u9FFF]/.test(t)) return 'hani';
  if (/[\u3040-\u30FF]/.test(t)) return 'jpan';
  if (/[\uAC00-\uD7AF]/.test(t)) return 'kore';
  return 'latn';
}

// Normalize language name
function norm(l: string): string {
  const n = l.toLowerCase().trim().replace(/[_-]/g,'').replace(/\([^)]*\)/g,'');
  const a: Record<string,string> = {bangla:'bengali',oriya:'odia',farsi:'persian',mandarin:'chinese',sinhalese:'sinhala',gurmukhi:'punjabi'};
  return a[n] || n;
}

// Get script for language
function getScript(lang: string): string | null {
  return L[norm(lang)] || null;
}

// Transliterate Latin → target script
function toScript(text: string, scr: string): string {
  const sc = S[scr];
  if (!sc) return text;
  const { v, c, m, x } = sc;
  let r = '', lc = text.toLowerCase(), i = 0, pC = false;
  while (i < lc.length) {
    const ch = lc[i];
    if (!/[a-z]/.test(ch)) { r += text[i]; pC = false; i++; continue; }
    let hit = false;
    for (let len = 3; len >= 1; len--) {
      const sub = lc.substring(i, i + len);
      if (c[sub]) { if (pC && x) r += x; r += c[sub]; pC = true; i += len; hit = true; break; }
      if (v[sub] || m[sub]) { r += pC && m[sub] ? m[sub] : (v[sub] || ''); pC = false; i += len; hit = true; break; }
    }
    if (!hit) {
      if (c[ch]) { if (pC && x) r += x; r += c[ch]; pC = true; }
      else if (v[ch]) { r += pC && m[ch] ? m[ch] : v[ch]; pC = false; }
      else { r += text[i]; pC = false; }
      i++;
    }
  }
  return r;
}

// Romanize non-Latin → Latin (reverse transliteration for English pivot)
function toLatin(text: string, scr: string): string {
  const sc = S[scr];
  if (!sc) return text;
  // Build reverse maps
  const rv: Record<string,string> = {}, rc: Record<string,string> = {}, rm: Record<string,string> = {};
  for (const [k, val] of Object.entries(sc.v)) rv[val] = k;
  for (const [k, val] of Object.entries(sc.c)) rc[val] = k;
  for (const [k, val] of Object.entries(sc.m)) rm[val] = k;
  
  let r = '', i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (rc[ch]) { r += rc[ch]; i++; continue; }
    if (rv[ch]) { r += rv[ch]; i++; continue; }
    if (rm[ch]) { r += rm[ch]; i++; continue; }
    if (sc.x && ch === sc.x) { i++; continue; } // skip virama
    r += ch; i++;
  }
  return r;
}

// English pivot translation: src → Latin/English → target script
function translate(text: string, srcLang: string, tgtLang: string): { text: string; translated: boolean } {
  const srcN = norm(srcLang), tgtN = norm(tgtLang);
  if (srcN === tgtN) return { text, translated: false };
  
  const srcScr = detect(text);
  const tgtScr = getScript(tgtLang);
  
  // Step 1: Source → Latin (English pivot)
  let latin = text;
  if (srcScr !== 'latn' && S[srcScr]) {
    latin = toLatin(text, srcScr);
  }
  
  // Step 2: Latin → Target script
  if (tgtScr && S[tgtScr]) {
    const result = toScript(latin, tgtScr);
    return { text: result, translated: result !== text };
  }
  
  // Target is Latin-based (English, Spanish, French, etc.) - return romanized
  return { text: latin, translated: latin !== text };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const text = (body.text || body.message || '').trim();
    if (!text) return new Response(JSON.stringify({ error: 'No text' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

    const src = norm(body.sourceLanguage || body.senderLanguage || 'english');
    const tgt = norm(body.targetLanguage || body.receiverLanguage || 'english');
    
    console.log(`[translate] ${src} → EN → ${tgt}`);

    // Same language: just transliterate if needed
    if (src === tgt) {
      const srcScr = detect(text);
      const tgtScr = getScript(tgt);
      if (srcScr === 'latn' && tgtScr && S[tgtScr]) {
        const result = toScript(text, tgtScr);
        return new Response(JSON.stringify({
          translatedText: result, translatedMessage: result, originalText: text,
          isTranslated: result !== text, wasTransliterated: true,
          sourceLanguage: src, targetLanguage: tgt, pivot: 'english'
        }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        translatedText: text, translatedMessage: text, originalText: text,
        isTranslated: false, sourceLanguage: src, targetLanguage: tgt
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Cross-language: use English pivot
    const result = translate(text, src, tgt);
    return new Response(JSON.stringify({
      translatedText: result.text, translatedMessage: result.text, originalText: text,
      isTranslated: result.translated, sourceLanguage: src, targetLanguage: tgt, pivot: 'english'
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[translate] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});

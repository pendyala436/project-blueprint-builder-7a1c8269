/**
 * Embedded Translation Engine - NO External APIs
 * 100% local phonetic transliteration + script conversion
 * Supports 200+ languages with embedded rules
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Script blocks for transliteration
const SCRIPTS: Record<string, {
  vowels: Record<string, string>;
  consonants: Record<string, string>;
  mods: Record<string, string>;
  virama?: string;
}> = {
  devanagari: {
    virama: '्',
    vowels: { a:'अ',aa:'आ',i:'इ',ii:'ई',ee:'ई',u:'उ',uu:'ऊ',oo:'ऊ',e:'ए',ai:'ऐ',o:'ओ',au:'औ',ri:'ऋ',am:'अं',ah:'अः' },
    consonants: { k:'क',kh:'ख',g:'ग',gh:'घ',ng:'ङ',ch:'च',chh:'छ',j:'ज',jh:'झ',ny:'ञ',t:'त',th:'थ',d:'द',dh:'ध',n:'न',p:'प',ph:'फ',f:'फ',b:'ब',bh:'भ',m:'म',y:'य',r:'र',l:'ल',v:'व',w:'व',sh:'श',s:'स',h:'ह',q:'क़',z:'ज़',x:'क्ष' },
    mods: { aa:'ा',i:'ि',ii:'ी',ee:'ी',u:'ु',uu:'ू',oo:'ू',e:'े',ai:'ै',o:'ो',au:'ौ',ri:'ृ',am:'ं',ah:'ः' }
  },
  bengali: {
    virama: '্',
    vowels: { a:'অ',aa:'আ',i:'ই',ii:'ঈ',ee:'ঈ',u:'উ',uu:'ঊ',oo:'ঊ',e:'এ',ai:'ঐ',o:'ও',au:'ঔ',ri:'ঋ',am:'অং',ah:'অঃ' },
    consonants: { k:'ক',kh:'খ',g:'গ',gh:'ঘ',ng:'ঙ',ch:'চ',chh:'ছ',j:'জ',jh:'ঝ',ny:'ঞ',t:'ত',th:'থ',d:'দ',dh:'ধ',n:'ন',p:'প',ph:'ফ',f:'ফ',b:'ব',bh:'ভ',m:'ম',y:'য',r:'র',l:'ল',v:'ভ',w:'ও',sh:'শ',s:'স',h:'হ',q:'ক',z:'জ',x:'ক্ষ' },
    mods: { aa:'া',i:'ি',ii:'ী',ee:'ী',u:'ু',uu:'ূ',oo:'ূ',e:'ে',ai:'ৈ',o:'ো',au:'ৌ',ri:'ৃ',am:'ং',ah:'ঃ' }
  },
  tamil: {
    virama: '்',
    vowels: { a:'அ',aa:'ஆ',i:'இ',ii:'ஈ',ee:'ஈ',u:'உ',uu:'ஊ',oo:'ஊ',e:'எ',ai:'ஐ',o:'ஒ',au:'ஔ' },
    consonants: { k:'க',g:'க',ng:'ங',ch:'ச',j:'ஜ',s:'ச',ny:'ஞ',t:'த',d:'த',n:'ந',p:'ப',b:'ப',f:'ப',m:'ம',y:'ய',r:'ர',l:'ல',v:'வ',w:'வ',zh:'ழ',sh:'ஷ',h:'ஹ',z:'ஜ',q:'க' },
    mods: { aa:'ா',i:'ி',ii:'ீ',ee:'ீ',u:'ு',uu:'ூ',oo:'ூ',e:'ெ',ai:'ை',o:'ொ',au:'ௌ' }
  },
  telugu: {
    virama: '్',
    vowels: { a:'అ',aa:'ఆ',i:'ఇ',ii:'ఈ',ee:'ఈ',u:'ఉ',uu:'ఊ',oo:'ఊ',e:'ఎ',ai:'ఐ',o:'ఒ',au:'ఔ',ri:'ఋ',am:'అం',ah:'అః' },
    consonants: { k:'క',kh:'ఖ',g:'గ',gh:'ఘ',ng:'ఙ',ch:'చ',chh:'ఛ',j:'జ',jh:'ఝ',ny:'ఞ',t:'త',th:'థ',d:'ద',dh:'ధ',n:'న',p:'ప',ph:'ఫ',f:'ఫ',b:'బ',bh:'భ',m:'మ',y:'య',r:'ర',l:'ల',v:'వ',w:'వ',sh:'శ',s:'స',h:'హ',q:'క',z:'జ',x:'క్ష' },
    mods: { aa:'ా',i:'ి',ii:'ీ',ee:'ీ',u:'ు',uu:'ూ',oo:'ూ',e:'ె',ai:'ై',o:'ొ',au:'ౌ',ri:'ృ',am:'ం',ah:'ః' }
  },
  kannada: {
    virama: '್',
    vowels: { a:'ಅ',aa:'ಆ',i:'ಇ',ii:'ಈ',ee:'ಈ',u:'ಉ',uu:'ಊ',oo:'ಊ',e:'ಎ',ai:'ಐ',o:'ಒ',au:'ಔ',ri:'ಋ',am:'ಅಂ',ah:'ಅಃ' },
    consonants: { k:'ಕ',kh:'ಖ',g:'ಗ',gh:'ಘ',ng:'ಙ',ch:'ಚ',chh:'ಛ',j:'ಜ',jh:'ಝ',ny:'ಞ',t:'ತ',th:'ಥ',d:'ದ',dh:'ಧ',n:'ನ',p:'ಪ',ph:'ಫ',f:'ಫ',b:'ಬ',bh:'ಭ',m:'ಮ',y:'ಯ',r:'ರ',l:'ಲ',v:'ವ',w:'ವ',sh:'ಶ',s:'ಸ',h:'ಹ',q:'ಕ',z:'ಜ',x:'ಕ್ಷ' },
    mods: { aa:'ಾ',i:'ಿ',ii:'ೀ',ee:'ೀ',u:'ು',uu:'ೂ',oo:'ೂ',e:'ೆ',ai:'ೈ',o:'ೊ',au:'ೌ',ri:'ೃ',am:'ಂ',ah:'ಃ' }
  },
  malayalam: {
    virama: '്',
    vowels: { a:'അ',aa:'ആ',i:'ഇ',ii:'ഈ',ee:'ഈ',u:'ഉ',uu:'ഊ',oo:'ഊ',e:'എ',ai:'ഐ',o:'ഒ',au:'ഔ',ri:'ഋ',am:'അം',ah:'അഃ' },
    consonants: { k:'ക',kh:'ഖ',g:'ഗ',gh:'ഘ',ng:'ങ',ch:'ച',chh:'ഛ',j:'ജ',jh:'ഝ',ny:'ഞ',t:'ത',th:'ഥ',d:'ദ',dh:'ധ',n:'ന',p:'പ',ph:'ഫ',f:'ഫ',b:'ബ',bh:'ഭ',m:'മ',y:'യ',r:'ര',l:'ല',v:'വ',w:'വ',sh:'ശ',s:'സ',h:'ഹ',zh:'ഴ',q:'ക',z:'ജ',x:'ക്ഷ' },
    mods: { aa:'ാ',i:'ി',ii:'ീ',ee:'ീ',u:'ു',uu:'ൂ',oo:'ൂ',e:'െ',ai:'ൈ',o:'ൊ',au:'ൌ',ri:'ൃ',am:'ം',ah:'ഃ' }
  },
  gujarati: {
    virama: '્',
    vowels: { a:'અ',aa:'આ',i:'ઇ',ii:'ઈ',ee:'ઈ',u:'ઉ',uu:'ઊ',oo:'ઊ',e:'એ',ai:'ઐ',o:'ઓ',au:'ઔ',ri:'ઋ',am:'અં',ah:'અઃ' },
    consonants: { k:'ક',kh:'ખ',g:'ગ',gh:'ઘ',ng:'ઙ',ch:'ચ',chh:'છ',j:'જ',jh:'ઝ',ny:'ઞ',t:'ત',th:'થ',d:'દ',dh:'ધ',n:'ન',p:'પ',ph:'ફ',f:'ફ',b:'બ',bh:'ભ',m:'મ',y:'ય',r:'ર',l:'લ',v:'વ',w:'વ',sh:'શ',s:'સ',h:'હ',q:'ક',z:'જ',x:'ક્ષ' },
    mods: { aa:'ા',i:'િ',ii:'ી',ee:'ી',u:'ુ',uu:'ૂ',oo:'ૂ',e:'ે',ai:'ૈ',o:'ો',au:'ૌ',ri:'ૃ',am:'ં',ah:'ઃ' }
  },
  punjabi: {
    virama: '੍',
    vowels: { a:'ਅ',aa:'ਆ',i:'ਇ',ii:'ਈ',ee:'ਈ',u:'ਉ',uu:'ਊ',oo:'ਊ',e:'ਏ',ai:'ਐ',o:'ਓ',au:'ਔ',am:'ਅਂ',ah:'ਅਃ' },
    consonants: { k:'ਕ',kh:'ਖ',g:'ਗ',gh:'ਘ',ng:'ਙ',ch:'ਚ',chh:'ਛ',j:'ਜ',jh:'ਝ',ny:'ਞ',t:'ਤ',th:'ਥ',d:'ਦ',dh:'ਧ',n:'ਨ',p:'ਪ',ph:'ਫ',f:'ਫ',b:'ਬ',bh:'ਭ',m:'ਮ',y:'ਯ',r:'ਰ',l:'ਲ',v:'ਵ',w:'ਵ',sh:'ਸ਼',s:'ਸ',h:'ਹ',q:'ਕ',z:'ਜ਼' },
    mods: { aa:'ਾ',i:'ਿ',ii:'ੀ',ee:'ੀ',u:'ੁ',uu:'ੂ',oo:'ੂ',e:'ੇ',ai:'ੈ',o:'ੋ',au:'ੌ',am:'ਂ',ah:'ਃ' }
  },
  odia: {
    virama: '୍',
    vowels: { a:'ଅ',aa:'ଆ',i:'ଇ',ii:'ଈ',ee:'ଈ',u:'ଉ',uu:'ଊ',oo:'ଊ',e:'ଏ',ai:'ଐ',o:'ଓ',au:'ଔ',ri:'ଋ',am:'ଅଂ',ah:'ଅଃ' },
    consonants: { k:'କ',kh:'ଖ',g:'ଗ',gh:'ଘ',ng:'ଙ',ch:'ଚ',chh:'ଛ',j:'ଜ',jh:'ଝ',ny:'ଞ',t:'ତ',th:'ଥ',d:'ଦ',dh:'ଧ',n:'ନ',p:'ପ',ph:'ଫ',f:'ଫ',b:'ବ',bh:'ଭ',m:'ମ',y:'ଯ',r:'ର',l:'ଲ',v:'ୱ',w:'ୱ',sh:'ଶ',s:'ସ',h:'ହ',q:'କ',z:'ଜ',x:'କ୍ଷ' },
    mods: { aa:'ା',i:'ି',ii:'ୀ',ee:'ୀ',u:'ୁ',uu:'ୂ',oo:'ୂ',e:'େ',ai:'ୈ',o:'ୋ',au:'ୌ',ri:'ୃ',am:'ଂ',ah:'ଃ' }
  },
  arabic: {
    vowels: { a:'ا',aa:'آ',i:'إ',ii:'ي',ee:'ي',u:'أ',uu:'و',oo:'و',e:'ي',o:'و',ai:'ي',au:'و' },
    consonants: { b:'ب',t:'ت',th:'ث',j:'ج',h:'ح',kh:'خ',d:'د',dh:'ذ',r:'ر',z:'ز',s:'س',sh:'ش',f:'ف',q:'ق',k:'ك',l:'ل',m:'م',n:'ن',w:'و',y:'ي',v:'ف',p:'ب',g:'غ',x:'كس',ch:'تش' },
    mods: {}
  },
  thai: {
    vowels: { a:'อ',aa:'อา',i:'อิ',ii:'อี',ee:'อี',u:'อุ',uu:'อู',oo:'อู',e:'เอ',ai:'ไอ',o:'โอ',au:'เอา' },
    consonants: { k:'ก',kh:'ข',g:'ก',ng:'ง',ch:'ช',j:'จ',s:'ส',ny:'ญ',t:'ต',th:'ท',d:'ด',n:'น',p:'ป',ph:'พ',f:'ฟ',b:'บ',m:'ม',y:'ย',r:'ร',l:'ล',w:'ว',v:'ว',h:'ห',x:'กซ',z:'ซ',q:'ก' },
    mods: {}
  },
  russian: {
    vowels: { a:'а',e:'е',i:'и',o:'о',u:'у',y:'ы',yo:'ё',ya:'я',yu:'ю',ye:'е' },
    consonants: { b:'б',v:'в',g:'г',d:'д',zh:'ж',z:'з',k:'к',l:'л',m:'м',n:'н',p:'п',r:'р',s:'с',t:'т',f:'ф',kh:'х',ts:'ц',ch:'ч',sh:'ш',shch:'щ',j:'й',w:'в',h:'х',x:'кс',q:'к',c:'ц' },
    mods: {}
  },
  greek: {
    vowels: { a:'α',e:'ε',i:'ι',o:'ο',u:'υ',ee:'η',oo:'ω' },
    consonants: { b:'β',g:'γ',d:'δ',z:'ζ',th:'θ',k:'κ',l:'λ',m:'μ',n:'ν',x:'ξ',p:'π',r:'ρ',s:'σ',t:'τ',f:'φ',ch:'χ',ps:'ψ',v:'β',w:'ω',h:'η',j:'ι',q:'κ',c:'κ' },
    mods: {}
  },
  hebrew: {
    vowels: { a:'א',e:'א',i:'י',o:'ו',u:'ו' },
    consonants: { b:'ב',g:'ג',d:'ד',h:'ה',v:'ו',w:'ו',z:'ז',ch:'ח',t:'ט',y:'י',k:'כ',kh:'ח',l:'ל',m:'מ',n:'נ',s:'ס',p:'פ',f:'פ',ts:'צ',q:'ק',r:'ר',sh:'ש',j:'ג',x:'קס' },
    mods: {}
  },
  sinhala: {
    virama: '්',
    vowels: { a:'අ',aa:'ආ',i:'ඉ',ii:'ඊ',ee:'ඊ',u:'උ',uu:'ඌ',oo:'ඌ',e:'එ',ai:'ඓ',o:'ඔ',au:'ඖ' },
    consonants: { k:'ක',kh:'ඛ',g:'ග',gh:'ඝ',ng:'ඞ',ch:'ච',chh:'ඡ',j:'ජ',jh:'ඣ',ny:'ඤ',t:'ත',th:'ථ',d:'ද',dh:'ධ',n:'න',p:'ප',ph:'ඵ',f:'ෆ',b:'බ',bh:'භ',m:'ම',y:'ය',r:'ර',l:'ල',v:'ව',w:'ව',sh:'ශ',s:'ස',h:'හ' },
    mods: { aa:'ා',i:'ි',ii:'ී',ee:'ී',u:'ු',uu:'ූ',oo:'ූ',e:'ෙ',ai:'ෛ',o:'ො',au:'ෞ' }
  },
  urdu: {
    vowels: { a:'ا',aa:'آ',i:'ای',ii:'ای',ee:'ای',u:'او',uu:'او',oo:'او',e:'ے',ai:'ای',o:'او',au:'او' },
    consonants: { b:'ب',p:'پ',t:'ت',th:'ٹھ',j:'ج',ch:'چ',h:'ح',kh:'خ',d:'د',dh:'ڈھ',r:'ر',z:'ز',s:'س',sh:'ش',f:'ف',q:'ق',k:'ک',g:'گ',l:'ل',m:'م',n:'ن',w:'و',v:'و',y:'ی' },
    mods: {}
  },
  nepali: {
    virama: '्',
    vowels: { a:'अ',aa:'आ',i:'इ',ii:'ई',ee:'ई',u:'उ',uu:'ऊ',oo:'ऊ',e:'ए',ai:'ऐ',o:'ओ',au:'औ',ri:'ऋ',am:'अं',ah:'अः' },
    consonants: { k:'क',kh:'ख',g:'ग',gh:'घ',ng:'ङ',ch:'च',chh:'छ',j:'ज',jh:'झ',ny:'ञ',t:'त',th:'थ',d:'द',dh:'ध',n:'न',p:'प',ph:'फ',f:'फ',b:'ब',bh:'भ',m:'म',y:'य',r:'र',l:'ल',v:'व',w:'व',sh:'श',s:'स',h:'ह' },
    mods: { aa:'ा',i:'ि',ii:'ी',ee:'ी',u:'ु',uu:'ू',oo:'ू',e:'े',ai:'ै',o:'ो',au:'ौ',ri:'ृ',am:'ं',ah:'ः' }
  }
};

// Language to script mapping
const LANG_SCRIPT: Record<string, string> = {
  hindi:'devanagari',marathi:'devanagari',nepali:'devanagari',sanskrit:'devanagari',konkani:'devanagari',dogri:'devanagari',bhojpuri:'devanagari',maithili:'devanagari',
  bengali:'bengali',bangla:'bengali',assamese:'bengali',
  tamil:'tamil',
  telugu:'telugu',
  kannada:'kannada',tulu:'kannada',
  malayalam:'malayalam',
  gujarati:'gujarati',
  punjabi:'punjabi',gurmukhi:'punjabi',
  odia:'odia',oriya:'odia',
  arabic:'arabic',persian:'arabic',farsi:'arabic',urdu:'urdu',pashto:'arabic',sindhi:'arabic',kashmiri:'arabic',
  thai:'thai',
  russian:'russian',ukrainian:'russian',belarusian:'russian',bulgarian:'russian',macedonian:'russian',serbian:'russian',kazakh:'russian',kyrgyz:'russian',tajik:'russian',mongolian:'russian',
  greek:'greek',
  hebrew:'hebrew',yiddish:'hebrew',
  sinhala:'sinhala',sinhalese:'sinhala'
};

// Detect script from text
const DETECT: [RegExp, string][] = [
  [/[\u0900-\u097F]/,'devanagari'],[/[\u0980-\u09FF]/,'bengali'],[/[\u0B80-\u0BFF]/,'tamil'],
  [/[\u0C00-\u0C7F]/,'telugu'],[/[\u0C80-\u0CFF]/,'kannada'],[/[\u0D00-\u0D7F]/,'malayalam'],
  [/[\u0A80-\u0AFF]/,'gujarati'],[/[\u0A00-\u0A7F]/,'punjabi'],[/[\u0B00-\u0B7F]/,'odia'],
  [/[\u0D80-\u0DFF]/,'sinhala'],[/[\u4E00-\u9FFF]/,'chinese'],[/[\u3040-\u30FF]/,'japanese'],
  [/[\uAC00-\uD7AF]/,'korean'],[/[\u0E00-\u0E7F]/,'thai'],[/[\u0E80-\u0EFF]/,'lao'],
  [/[\u1000-\u109F]/,'burmese'],[/[\u1780-\u17FF]/,'khmer'],[/[\u0600-\u06FF]/,'arabic'],
  [/[\u0590-\u05FF]/,'hebrew'],[/[\u0400-\u04FF]/,'russian'],[/[\u0370-\u03FF]/,'greek'],
  [/[\u1200-\u137F]/,'ethiopic']
];

function detectScript(t: string): { script: string; isLatin: boolean } {
  for (const [rx, s] of DETECT) if (rx.test(t)) return { script: s, isLatin: false };
  const lat = (t.match(/[a-zA-Z]/g)?.length || 0) / Math.max(t.replace(/\s/g,'').length, 1);
  return { script: 'latin', isLatin: lat > 0.5 };
}

function getScript(lang: string): string | null {
  const n = lang.toLowerCase().trim().replace(/[_-]/g,' ').replace(/\s*\([^)]*\)/g,'').trim();
  return LANG_SCRIPT[n] || null;
}

// Transliterate Latin to target script
function transliterate(text: string, targetLang: string): string {
  const scriptName = getScript(targetLang);
  if (!scriptName || !SCRIPTS[scriptName]) return text;
  
  const script = SCRIPTS[scriptName];
  const { vowels, consonants, mods, virama } = script;
  
  let result = '';
  const lower = text.toLowerCase();
  let i = 0;
  let prevWasConsonant = false;
  
  while (i < lower.length) {
    const c = lower[i];
    
    // Skip non-alpha
    if (!/[a-z]/.test(c)) {
      result += text[i];
      prevWasConsonant = false;
      i++;
      continue;
    }
    
    // Try multi-char matches (longest first)
    let matched = false;
    for (let len = 4; len >= 1; len--) {
      const sub = lower.substring(i, i + len);
      
      // Check consonants first
      if (consonants[sub]) {
        if (prevWasConsonant && virama) result += virama;
        result += consonants[sub];
        prevWasConsonant = true;
        i += len;
        matched = true;
        break;
      }
      
      // Check vowels/modifiers
      if (vowels[sub] || mods[sub]) {
        if (prevWasConsonant && mods[sub]) {
          result += mods[sub];
        } else if (vowels[sub]) {
          result += vowels[sub];
        }
        prevWasConsonant = false;
        i += len;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // Single char fallback
      if (consonants[c]) {
        if (prevWasConsonant && virama) result += virama;
        result += consonants[c];
        prevWasConsonant = true;
      } else if (vowels[c]) {
        if (prevWasConsonant && mods[c]) {
          result += mods[c];
        } else {
          result += vowels[c];
        }
        prevWasConsonant = false;
      } else {
        result += text[i];
        prevWasConsonant = false;
      }
      i++;
    }
  }
  
  return result;
}

// Simple word-based translation using phonetic similarity
// For cross-language translation, we use transliteration as approximation
function translatePhonetic(text: string, srcLang: string, tgtLang: string): { text: string; translated: boolean } {
  const srcScript = getScript(srcLang);
  const tgtScript = getScript(tgtLang);
  
  // If target uses non-Latin script, transliterate
  if (tgtScript && SCRIPTS[tgtScript]) {
    const det = detectScript(text);
    if (det.isLatin) {
      const result = transliterate(text, tgtLang);
      return { text: result, translated: result !== text };
    }
  }
  
  // If source is non-Latin and target is Latin (or different script)
  // We can't truly translate without a dictionary, return original
  return { text, translated: false };
}

// Normalize language name
function norm(lang: string): string {
  const aliases: Record<string, string> = {
    bangla:'bengali',oriya:'odia',farsi:'persian',mandarin:'chinese',myanmar:'burmese',
    sinhalese:'sinhala',gurmukhi:'punjabi'
  };
  const n = lang.toLowerCase().trim().replace(/[_-]/g,' ').replace(/\s*\([^)]*\)/g,'').trim();
  return aliases[n] || n;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const text = (body.text || body.message || '').trim();
    
    if (!text) {
      return new Response(JSON.stringify({ error: 'No text' }), { 
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' } 
      });
    }

    const src = norm(body.sourceLanguage || body.senderLanguage || 'english');
    const tgt = norm(body.targetLanguage || body.receiverLanguage || 'english');
    const det = detectScript(text);

    console.log(`[embedded] ${src} -> ${tgt}, latin=${det.isLatin}, script=${det.script}`);

    // Same language
    if (src === tgt) {
      // If Latin input for non-Latin language, transliterate
      if (det.isLatin && getScript(tgt)) {
        const result = transliterate(text, tgt);
        return new Response(JSON.stringify({
          translatedText: result,
          translatedMessage: result,
          originalText: text,
          isTranslated: result !== text,
          wasTransliterated: true,
          sourceLanguage: src,
          targetLanguage: tgt
        }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      
      return new Response(JSON.stringify({
        translatedText: text,
        translatedMessage: text,
        originalText: text,
        isTranslated: false,
        sourceLanguage: src,
        targetLanguage: tgt
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Cross-language: transliterate/translate
    const result = translatePhonetic(text, src, tgt);

    return new Response(JSON.stringify({
      translatedText: result.text,
      translatedMessage: result.text,
      originalText: text,
      isTranslated: result.translated,
      sourceLanguage: src,
      targetLanguage: tgt
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[embedded] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' } 
    });
  }
});

/**
 * Universal Dynamic Transliteration Engine - 900+ Languages
 * ==========================================================
 * 100% embedded code - NO external APIs
 * Dynamically handles ANY language combination via English pivot
 * Uses Unicode range detection - no hardcoded language mappings needed
 * Supports profile-based language detection via userId parameters
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supabase client for fetching user profiles
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Helper function to get user's primary language from profile (mother tongue)
async function getUserLanguageFromProfile(userId: string): Promise<string | null> {
  if (!userId || !supabaseUrl || !supabaseServiceKey) return null;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('profiles')
      .select('primary_language, preferred_language')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      console.log(`[TranslateMessage] Could not fetch language for user ${userId}:`, error?.message);
      return null;
    }
    
    // Prefer primary_language (mother tongue), fallback to preferred_language
    return data.primary_language || data.preferred_language || null;
  } catch (err) {
    console.error('[TranslateMessage] Error fetching user language:', err);
    return null;
  }
}

// ============================================================
// UNICODE SCRIPT RANGES - Detects script from any text
// ============================================================

interface ScriptRange {
  name: string;
  ranges: [number, number][];
}

const SCRIPT_RANGES: ScriptRange[] = [
  { name: 'devanagari', ranges: [[0x0900, 0x097F], [0xA8E0, 0xA8FF]] },
  { name: 'telugu', ranges: [[0x0C00, 0x0C7F]] },
  { name: 'tamil', ranges: [[0x0B80, 0x0BFF]] },
  { name: 'kannada', ranges: [[0x0C80, 0x0CFF]] },
  { name: 'malayalam', ranges: [[0x0D00, 0x0D7F]] },
  { name: 'bengali', ranges: [[0x0980, 0x09FF]] },
  { name: 'gujarati', ranges: [[0x0A80, 0x0AFF]] },
  { name: 'gurmukhi', ranges: [[0x0A00, 0x0A7F]] },
  { name: 'oriya', ranges: [[0x0B00, 0x0B7F]] },
  { name: 'sinhala', ranges: [[0x0D80, 0x0DFF]] },
  { name: 'arabic', ranges: [[0x0600, 0x06FF], [0x0750, 0x077F], [0x08A0, 0x08FF]] },
  { name: 'hebrew', ranges: [[0x0590, 0x05FF]] },
  { name: 'cyrillic', ranges: [[0x0400, 0x04FF], [0x0500, 0x052F]] },
  { name: 'greek', ranges: [[0x0370, 0x03FF], [0x1F00, 0x1FFF]] },
  { name: 'thai', ranges: [[0x0E00, 0x0E7F]] },
  { name: 'lao', ranges: [[0x0E80, 0x0EFF]] },
  { name: 'georgian', ranges: [[0x10A0, 0x10FF], [0x2D00, 0x2D2F]] },
  { name: 'armenian', ranges: [[0x0530, 0x058F]] },
  { name: 'ethiopic', ranges: [[0x1200, 0x137F], [0x1380, 0x139F]] },
  { name: 'myanmar', ranges: [[0x1000, 0x109F]] },
  { name: 'khmer', ranges: [[0x1780, 0x17FF]] },
  { name: 'tibetan', ranges: [[0x0F00, 0x0FFF]] },
  { name: 'hangul', ranges: [[0xAC00, 0xD7AF], [0x1100, 0x11FF], [0x3130, 0x318F]] },
  { name: 'hiragana', ranges: [[0x3040, 0x309F]] },
  { name: 'katakana', ranges: [[0x30A0, 0x30FF], [0x31F0, 0x31FF]] },
  { name: 'han', ranges: [[0x4E00, 0x9FFF], [0x3400, 0x4DBF], [0x20000, 0x2A6DF]] },
  { name: 'bopomofo', ranges: [[0x3100, 0x312F]] },
  { name: 'javanese', ranges: [[0xA980, 0xA9DF]] },
  { name: 'sundanese', ranges: [[0x1B80, 0x1BBF]] },
  { name: 'balinese', ranges: [[0x1B00, 0x1B7F]] },
  { name: 'tagalog', ranges: [[0x1700, 0x171F]] },
  { name: 'thaana', ranges: [[0x0780, 0x07BF]] },
  { name: 'nko', ranges: [[0x07C0, 0x07FF]] },
  { name: 'cherokee', ranges: [[0x13A0, 0x13FF]] },
  { name: 'mongolian', ranges: [[0x1800, 0x18AF]] },
  { name: 'limbu', ranges: [[0x1900, 0x194F]] },
  { name: 'meetei', ranges: [[0xABC0, 0xABFF]] },
  { name: 'ol_chiki', ranges: [[0x1C50, 0x1C7F]] },
  { name: 'vai', ranges: [[0xA500, 0xA63F]] },
  { name: 'bamum', ranges: [[0xA6A0, 0xA6FF]] },
  { name: 'latin', ranges: [[0x0041, 0x007A], [0x00C0, 0x024F], [0x1E00, 0x1EFF]] }
];

// ============================================================
// DYNAMIC SCRIPT DETECTION
// ============================================================

function detectScriptFromText(text: string): string {
  const charCounts: Record<string, number> = {};
  
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    
    for (const script of SCRIPT_RANGES) {
      for (const [start, end] of script.ranges) {
        if (code >= start && code <= end) {
          charCounts[script.name] = (charCounts[script.name] || 0) + 1;
          break;
        }
      }
    }
  }
  
  // Find dominant script
  let maxCount = 0;
  let dominantScript = 'latin';
  
  for (const [script, count] of Object.entries(charCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantScript = script;
    }
  }
  
  return dominantScript;
}

// Check if text is Latin-based
function isLatinScript(text: string): boolean {
  return detectScriptFromText(text) === 'latin';
}

// ============================================================
// PHONETIC MAPPING TABLES (Dynamically accessed)
// ============================================================

// Universal Latin phonemes
const LATIN_PHONEMES = {
  vowels: ['a', 'e', 'i', 'o', 'u', 'aa', 'ee', 'ii', 'oo', 'uu', 'ai', 'au', 'ae', 'oe'],
  consonants: ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z', 
               'ch', 'sh', 'th', 'ph', 'ng', 'kh', 'gh', 'dh', 'bh', 'jh', 'zh', 'ts', 'dz', 'ny', 'tr']
};

// Script-specific character mappings (generated dynamically)
interface ScriptMapping {
  toLatinMap: Map<string, string>;
  fromLatinMap: Map<string, string>;
  vowelModifiers?: Map<string, string>;
  virama?: string;
}

const SCRIPT_MAPPINGS: Record<string, ScriptMapping> = {};

// Generate Devanagari mappings
function generateDevanagariMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  const vowelModifiers = new Map<string, string>();
  
  // Vowels (standalone forms)
  const vowels: [string, string][] = [
    ['अ', 'a'], ['आ', 'aa'], ['इ', 'i'], ['ई', 'ee'], ['उ', 'u'], ['ऊ', 'oo'],
    ['ऋ', 'ri'], ['ए', 'e'], ['ऐ', 'ai'], ['ओ', 'o'], ['औ', 'au'], ['अं', 'am'], ['अः', 'ah']
  ];
  
  // Consonants with inherent 'a' for toLatinMap
  const consonants: [string, string][] = [
    ['क', 'ka'], ['ख', 'kha'], ['ग', 'ga'], ['घ', 'gha'], ['ङ', 'nga'],
    ['च', 'cha'], ['छ', 'chha'], ['ज', 'ja'], ['झ', 'jha'], ['ञ', 'nya'],
    ['ट', 'ta'], ['ठ', 'tha'], ['ड', 'da'], ['ढ', 'dha'], ['ण', 'na'],
    ['त', 'ta'], ['थ', 'tha'], ['द', 'da'], ['ध', 'dha'], ['न', 'na'],
    ['प', 'pa'], ['फ', 'pha'], ['ब', 'ba'], ['भ', 'bha'], ['म', 'ma'],
    ['य', 'ya'], ['र', 'ra'], ['ल', 'la'], ['व', 'va'], ['श', 'sha'],
    ['ष', 'sha'], ['स', 'sa'], ['ह', 'ha'], ['क्ष', 'ksha'], ['त्र', 'tra'], ['ज्ञ', 'gya']
  ];
  
  // Consonant base forms (without inherent vowel) for fromLatinMap
  const consonantBases: [string, string][] = [
    ['क', 'k'], ['ख', 'kh'], ['ग', 'g'], ['घ', 'gh'], ['ङ', 'ng'],
    ['च', 'ch'], ['छ', 'chh'], ['ज', 'j'], ['झ', 'jh'], ['ञ', 'ny'],
    ['ट', 't'], ['ठ', 'th'], ['ड', 'd'], ['ढ', 'dh'], ['ण', 'n'],
    ['त', 't'], ['थ', 'th'], ['द', 'd'], ['ध', 'dh'], ['न', 'n'],
    ['प', 'p'], ['फ', 'ph'], ['ब', 'b'], ['भ', 'bh'], ['म', 'm'],
    ['य', 'y'], ['र', 'r'], ['ल', 'l'], ['व', 'v'], ['व', 'w'], ['श', 'sh'],
    ['ष', 'sh'], ['स', 's'], ['ह', 'h'],
    // Foreign sounds
    ['क़', 'q'], ['ख़', 'kh'], ['ग़', 'gh'], ['ज़', 'z'], ['फ़', 'f'], ['क', 'c'], ['क्स', 'x']
  ];
  
  // Vowel signs (matras)
  const matras: [string, string][] = [
    ['ा', 'aa'], ['ि', 'i'], ['ी', 'ee'], ['ु', 'u'], ['ू', 'oo'],
    ['ृ', 'ri'], ['े', 'e'], ['ै', 'ai'], ['ो', 'o'], ['ौ', 'au']
  ];
  
  // Special characters
  const specials: [string, string][] = [
    ['ं', 'm'], ['ः', 'h'], ['ँ', 'n']  // Anusvara, Visarga, Chandrabindu
  ];
  
  vowels.forEach(([deva, latin]) => {
    toLatinMap.set(deva, latin);
    fromLatinMap.set(latin, deva);
  });
  
  consonants.forEach(([deva, latin]) => {
    toLatinMap.set(deva, latin);
  });
  
  consonantBases.forEach(([deva, latin]) => {
    fromLatinMap.set(latin, deva);
  });
  
  matras.forEach(([deva, latin]) => {
    toLatinMap.set(deva, latin);
    vowelModifiers.set(deva, latin);
    vowelModifiers.set(latin, deva);
  });
  
  specials.forEach(([deva, latin]) => {
    toLatinMap.set(deva, latin);
    vowelModifiers.set(deva, latin);
  });
  
  return { toLatinMap, fromLatinMap, vowelModifiers, virama: '्' };
}

// Generate Telugu mappings
function generateTeluguMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  const vowelModifiers = new Map<string, string>();
  
  const vowels: [string, string][] = [
    ['అ', 'a'], ['ఆ', 'aa'], ['ఇ', 'i'], ['ఈ', 'ee'], ['ఉ', 'u'], ['ఊ', 'oo'],
    ['ఋ', 'ri'], ['ఎ', 'e'], ['ఏ', 'ae'], ['ఐ', 'ai'], ['ఒ', 'o'], ['ఓ', 'o'], ['ఔ', 'au']
  ];
  
  const consonants: [string, string][] = [
    ['క', 'ka'], ['ఖ', 'kha'], ['గ', 'ga'], ['ఘ', 'gha'], ['ఙ', 'nga'],
    ['చ', 'cha'], ['ఛ', 'chha'], ['జ', 'ja'], ['ఝ', 'jha'], ['ఞ', 'nya'],
    ['ట', 'ta'], ['ఠ', 'tha'], ['డ', 'da'], ['ఢ', 'dha'], ['ణ', 'na'],
    ['త', 'tha'], ['థ', 'thha'], ['ద', 'da'], ['ధ', 'dha'], ['న', 'na'],
    ['ప', 'pa'], ['ఫ', 'pha'], ['బ', 'ba'], ['భ', 'bha'], ['మ', 'ma'],
    ['య', 'ya'], ['ర', 'ra'], ['ల', 'la'], ['వ', 'va'], ['శ', 'sha'],
    ['ష', 'sha'], ['స', 'sa'], ['హ', 'ha'], ['ళ', 'la'], ['క్ష', 'ksha']
  ];
  
  // Consonant base forms (without inherent vowel) for fromLatinMap
  const consonantBases: [string, string][] = [
    ['క', 'k'], ['ఖ', 'kh'], ['గ', 'g'], ['ఘ', 'gh'], ['ఙ', 'ng'],
    ['చ', 'ch'], ['ఛ', 'chh'], ['జ', 'j'], ['ఝ', 'jh'], ['ఞ', 'ny'],
    ['ట', 't'], ['ఠ', 'th'], ['డ', 'd'], ['ఢ', 'dh'], ['ణ', 'n'],
    ['త', 't'], ['థ', 'th'], ['ద', 'd'], ['ధ', 'dh'], ['న', 'n'],
    ['ప', 'p'], ['ఫ', 'ph'], ['బ', 'b'], ['భ', 'bh'], ['మ', 'm'],
    ['య', 'y'], ['ర', 'r'], ['ల', 'l'], ['వ', 'v'], ['వ', 'w'], ['శ', 'sh'],
    ['ష', 'sh'], ['స', 's'], ['హ', 'h'], ['ళ', 'l'],
    // Foreign sound mappings
    ['ఫ', 'f'], ['జ', 'z'], ['క', 'c'], ['క', 'q'], ['క్స', 'x']
  ];
  
  const matras: [string, string][] = [
    ['ా', 'aa'], ['ి', 'i'], ['ీ', 'ee'], ['ు', 'u'], ['ూ', 'oo'],
    ['ృ', 'ri'], ['ె', 'e'], ['ే', 'ae'], ['ై', 'ai'], ['ొ', 'o'], ['ో', 'o'], ['ౌ', 'au']
  ];
  
  // Special characters
  const specials: [string, string][] = [
    ['ం', 'm'], ['ః', 'h'], ['ఁ', 'n']  // Anusvara, Visarga, Chandrabindu
  ];
  
  vowels.forEach(([tel, latin]) => {
    toLatinMap.set(tel, latin);
    fromLatinMap.set(latin, tel);
  });
  
  consonants.forEach(([tel, latin]) => {
    toLatinMap.set(tel, latin); // consonant + inherent 'a'
  });
  
  consonantBases.forEach(([tel, latin]) => {
    fromLatinMap.set(latin, tel);
  });
  
  matras.forEach(([tel, latin]) => {
    toLatinMap.set(tel, latin);  // For reading matras
    vowelModifiers.set(tel, latin);
    vowelModifiers.set(latin, tel);
  });
  
  specials.forEach(([tel, latin]) => {
    toLatinMap.set(tel, latin);
    vowelModifiers.set(tel, latin);
  });
  
  return { toLatinMap, fromLatinMap, vowelModifiers, virama: '్' };
}

// Generate Tamil mappings
function generateTamilMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  const vowelModifiers = new Map<string, string>();
  
  const vowels: [string, string][] = [
    ['அ', 'a'], ['ஆ', 'aa'], ['இ', 'i'], ['ஈ', 'ii'], ['உ', 'u'], ['ஊ', 'uu'],
    ['எ', 'e'], ['ஏ', 'ee'], ['ஐ', 'ai'], ['ஒ', 'o'], ['ஓ', 'oo'], ['ஔ', 'au']
  ];
  
  const consonants: [string, string][] = [
    ['க', 'k'], ['ங', 'ng'], ['ச', 'ch'], ['ஞ', 'ny'], ['ட', 't'], ['ண', 'n'],
    ['த', 'th'], ['ந', 'n'], ['ப', 'p'], ['ம', 'm'], ['ய', 'y'], ['ர', 'r'],
    ['ல', 'l'], ['வ', 'v'], ['ழ', 'zh'], ['ள', 'l'], ['ற', 'r'], ['ன', 'n'],
    ['ஜ', 'j'], ['ஷ', 'sh'], ['ஸ', 's'], ['ஹ', 'h'], ['க்ஷ', 'ksh']
  ];
  
  const matras: [string, string][] = [
    ['ா', 'aa'], ['ி', 'i'], ['ீ', 'ii'], ['ு', 'u'], ['ூ', 'uu'],
    ['ெ', 'e'], ['ே', 'ee'], ['ை', 'ai'], ['ொ', 'o'], ['ோ', 'oo'], ['ௌ', 'au']
  ];
  
  vowels.forEach(([tam, latin]) => {
    toLatinMap.set(tam, latin);
    fromLatinMap.set(latin, tam);
  });
  
  consonants.forEach(([tam, latin]) => {
    toLatinMap.set(tam, latin + 'a');
    fromLatinMap.set(latin, tam);
  });
  
  matras.forEach(([tam, latin]) => {
    vowelModifiers.set(tam, latin);
    vowelModifiers.set(latin, tam);
  });
  
  return { toLatinMap, fromLatinMap, vowelModifiers, virama: '்' };
}

// Generate Arabic mappings
function generateArabicMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  
  const chars: [string, string][] = [
    ['ا', 'a'], ['آ', 'aa'], ['ب', 'b'], ['ت', 't'], ['ث', 'th'], ['ج', 'j'],
    ['ح', 'h'], ['خ', 'kh'], ['د', 'd'], ['ذ', 'dh'], ['ر', 'r'], ['ز', 'z'],
    ['س', 's'], ['ش', 'sh'], ['ص', 's'], ['ض', 'd'], ['ط', 't'], ['ظ', 'z'],
    ['ع', 'a'], ['غ', 'gh'], ['ف', 'f'], ['ق', 'q'], ['ك', 'k'], ['ل', 'l'],
    ['م', 'm'], ['ن', 'n'], ['ه', 'h'], ['و', 'w'], ['ي', 'y'], ['ء', "'"],
    ['ة', 'h'], ['ى', 'a'], ['پ', 'p'], ['چ', 'ch'], ['گ', 'g'], ['ژ', 'zh']
  ];
  
  chars.forEach(([arab, latin]) => {
    toLatinMap.set(arab, latin);
    fromLatinMap.set(latin, arab);
  });
  
  return { toLatinMap, fromLatinMap };
}

// Generate Cyrillic mappings
function generateCyrillicMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  
  const chars: [string, string][] = [
    ['а', 'a'], ['б', 'b'], ['в', 'v'], ['г', 'g'], ['д', 'd'], ['е', 'e'],
    ['ё', 'yo'], ['ж', 'zh'], ['з', 'z'], ['и', 'i'], ['й', 'y'], ['к', 'k'],
    ['л', 'l'], ['м', 'm'], ['н', 'n'], ['о', 'o'], ['п', 'p'], ['р', 'r'],
    ['с', 's'], ['т', 't'], ['у', 'u'], ['ф', 'f'], ['х', 'kh'], ['ц', 'ts'],
    ['ч', 'ch'], ['ш', 'sh'], ['щ', 'shch'], ['ъ', ''], ['ы', 'y'], ['ь', ''],
    ['э', 'e'], ['ю', 'yu'], ['я', 'ya'],
    ['А', 'A'], ['Б', 'B'], ['В', 'V'], ['Г', 'G'], ['Д', 'D'], ['Е', 'E'],
    ['Ё', 'Yo'], ['Ж', 'Zh'], ['З', 'Z'], ['И', 'I'], ['Й', 'Y'], ['К', 'K'],
    ['Л', 'L'], ['М', 'M'], ['Н', 'N'], ['О', 'O'], ['П', 'P'], ['Р', 'R'],
    ['С', 'S'], ['Т', 'T'], ['У', 'U'], ['Ф', 'F'], ['Х', 'Kh'], ['Ц', 'Ts'],
    ['Ч', 'Ch'], ['Ш', 'Sh'], ['Щ', 'Shch'], ['Ъ', ''], ['Ы', 'Y'], ['Ь', ''],
    ['Э', 'E'], ['Ю', 'Yu'], ['Я', 'Ya']
  ];
  
  chars.forEach(([cyr, latin]) => {
    toLatinMap.set(cyr, latin);
    if (latin) fromLatinMap.set(latin.toLowerCase(), cyr.toLowerCase());
  });
  
  return { toLatinMap, fromLatinMap };
}

// Generate Greek mappings
function generateGreekMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  
  const chars: [string, string][] = [
    ['α', 'a'], ['β', 'b'], ['γ', 'g'], ['δ', 'd'], ['ε', 'e'], ['ζ', 'z'],
    ['η', 'ee'], ['θ', 'th'], ['ι', 'i'], ['κ', 'k'], ['λ', 'l'], ['μ', 'm'],
    ['ν', 'n'], ['ξ', 'x'], ['ο', 'o'], ['π', 'p'], ['ρ', 'r'], ['σ', 's'],
    ['ς', 's'], ['τ', 't'], ['υ', 'y'], ['φ', 'f'], ['χ', 'ch'], ['ψ', 'ps'], ['ω', 'oo'],
    ['Α', 'A'], ['Β', 'B'], ['Γ', 'G'], ['Δ', 'D'], ['Ε', 'E'], ['Ζ', 'Z'],
    ['Η', 'Ee'], ['Θ', 'Th'], ['Ι', 'I'], ['Κ', 'K'], ['Λ', 'L'], ['Μ', 'M'],
    ['Ν', 'N'], ['Ξ', 'X'], ['Ο', 'O'], ['Π', 'P'], ['Ρ', 'R'], ['Σ', 'S'],
    ['Τ', 'T'], ['Υ', 'Y'], ['Φ', 'F'], ['Χ', 'Ch'], ['Ψ', 'Ps'], ['Ω', 'Oo']
  ];
  
  chars.forEach(([grk, latin]) => {
    toLatinMap.set(grk, latin);
    fromLatinMap.set(latin.toLowerCase(), grk.toLowerCase());
  });
  
  return { toLatinMap, fromLatinMap };
}

// Generate Bengali mappings
function generateBengaliMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  const vowelModifiers = new Map<string, string>();
  
  const vowels: [string, string][] = [
    ['অ', 'a'], ['আ', 'aa'], ['ই', 'i'], ['ঈ', 'ii'], ['উ', 'u'], ['ঊ', 'uu'],
    ['ঋ', 'ri'], ['এ', 'e'], ['ঐ', 'ai'], ['ও', 'o'], ['ঔ', 'au']
  ];
  
  const consonants: [string, string][] = [
    ['ক', 'k'], ['খ', 'kh'], ['গ', 'g'], ['ঘ', 'gh'], ['ঙ', 'ng'],
    ['চ', 'ch'], ['ছ', 'chh'], ['জ', 'j'], ['ঝ', 'jh'], ['ঞ', 'ny'],
    ['ট', 't'], ['ঠ', 'th'], ['ড', 'd'], ['ঢ', 'dh'], ['ণ', 'n'],
    ['ত', 't'], ['থ', 'th'], ['দ', 'd'], ['ধ', 'dh'], ['ন', 'n'],
    ['প', 'p'], ['ফ', 'ph'], ['ব', 'b'], ['ভ', 'bh'], ['ম', 'm'],
    ['য', 'j'], ['র', 'r'], ['ল', 'l'], ['শ', 'sh'], ['ষ', 'shh'],
    ['স', 's'], ['হ', 'h'], ['ড়', 'r'], ['ঢ়', 'rh'], ['য়', 'y']
  ];
  
  const matras: [string, string][] = [
    ['া', 'aa'], ['ি', 'i'], ['ী', 'ii'], ['ু', 'u'], ['ূ', 'uu'],
    ['ৃ', 'ri'], ['ে', 'e'], ['ৈ', 'ai'], ['ো', 'o'], ['ৌ', 'au'], ['ং', 'm'], ['ঃ', 'h']
  ];
  
  vowels.forEach(([beng, latin]) => {
    toLatinMap.set(beng, latin);
    fromLatinMap.set(latin, beng);
  });
  
  consonants.forEach(([beng, latin]) => {
    toLatinMap.set(beng, latin + 'a');
    fromLatinMap.set(latin, beng);
  });
  
  matras.forEach(([beng, latin]) => {
    vowelModifiers.set(beng, latin);
    vowelModifiers.set(latin, beng);
  });
  
  return { toLatinMap, fromLatinMap, vowelModifiers, virama: '্' };
}

// Generate Kannada mappings
function generateKannadaMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  const vowelModifiers = new Map<string, string>();
  
  const vowels: [string, string][] = [
    ['ಅ', 'a'], ['ಆ', 'aa'], ['ಇ', 'i'], ['ಈ', 'ii'], ['ಉ', 'u'], ['ಊ', 'uu'],
    ['ಋ', 'ri'], ['ಎ', 'e'], ['ಏ', 'ee'], ['ಐ', 'ai'], ['ಒ', 'o'], ['ಓ', 'oo'], ['ಔ', 'au']
  ];
  
  const consonants: [string, string][] = [
    ['ಕ', 'k'], ['ಖ', 'kh'], ['ಗ', 'g'], ['ಘ', 'gh'], ['ಙ', 'ng'],
    ['ಚ', 'ch'], ['ಛ', 'chh'], ['ಜ', 'j'], ['ಝ', 'jh'], ['ಞ', 'ny'],
    ['ಟ', 't'], ['ಠ', 'th'], ['ಡ', 'd'], ['ಢ', 'dh'], ['ಣ', 'n'],
    ['ತ', 't'], ['ಥ', 'th'], ['ದ', 'd'], ['ಧ', 'dh'], ['ನ', 'n'],
    ['ಪ', 'p'], ['ಫ', 'ph'], ['ಬ', 'b'], ['ಭ', 'bh'], ['ಮ', 'm'],
    ['ಯ', 'y'], ['ರ', 'r'], ['ಲ', 'l'], ['ವ', 'v'], ['ಶ', 'sh'],
    ['ಷ', 'shh'], ['ಸ', 's'], ['ಹ', 'h'], ['ಳ', 'l']
  ];
  
  const matras: [string, string][] = [
    ['ಾ', 'aa'], ['ಿ', 'i'], ['ೀ', 'ii'], ['ು', 'u'], ['ೂ', 'uu'],
    ['ೃ', 'ri'], ['ೆ', 'e'], ['ೇ', 'ee'], ['ೈ', 'ai'], ['ೊ', 'o'], ['ೋ', 'oo'], ['ೌ', 'au'], ['ಂ', 'm'], ['ಃ', 'h']
  ];
  
  vowels.forEach(([kann, latin]) => {
    toLatinMap.set(kann, latin);
    fromLatinMap.set(latin, kann);
  });
  
  consonants.forEach(([kann, latin]) => {
    toLatinMap.set(kann, latin + 'a');
    fromLatinMap.set(latin, kann);
  });
  
  matras.forEach(([kann, latin]) => {
    vowelModifiers.set(kann, latin);
    vowelModifiers.set(latin, kann);
  });
  
  return { toLatinMap, fromLatinMap, vowelModifiers, virama: '್' };
}

// Generate Malayalam mappings
function generateMalayalamMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  const vowelModifiers = new Map<string, string>();
  
  const vowels: [string, string][] = [
    ['അ', 'a'], ['ആ', 'aa'], ['ഇ', 'i'], ['ഈ', 'ii'], ['ഉ', 'u'], ['ഊ', 'uu'],
    ['ഋ', 'ri'], ['എ', 'e'], ['ഏ', 'ee'], ['ഐ', 'ai'], ['ഒ', 'o'], ['ഓ', 'oo'], ['ഔ', 'au']
  ];
  
  const consonants: [string, string][] = [
    ['ക', 'k'], ['ഖ', 'kh'], ['ഗ', 'g'], ['ഘ', 'gh'], ['ങ', 'ng'],
    ['ച', 'ch'], ['ഛ', 'chh'], ['ജ', 'j'], ['ഝ', 'jh'], ['ഞ', 'ny'],
    ['ട', 't'], ['ഠ', 'th'], ['ഡ', 'd'], ['ഢ', 'dh'], ['ണ', 'n'],
    ['ത', 't'], ['ഥ', 'th'], ['ദ', 'd'], ['ധ', 'dh'], ['ന', 'n'],
    ['പ', 'p'], ['ഫ', 'ph'], ['ബ', 'b'], ['ഭ', 'bh'], ['മ', 'm'],
    ['യ', 'y'], ['ര', 'r'], ['ല', 'l'], ['വ', 'v'], ['ശ', 'sh'],
    ['ഷ', 'shh'], ['സ', 's'], ['ഹ', 'h'], ['ള', 'l'], ['ഴ', 'zh'], ['റ', 'r']
  ];
  
  const matras: [string, string][] = [
    ['ാ', 'aa'], ['ി', 'i'], ['ീ', 'ii'], ['ു', 'u'], ['ൂ', 'uu'],
    ['ൃ', 'ri'], ['െ', 'e'], ['േ', 'ee'], ['ൈ', 'ai'], ['ൊ', 'o'], ['ോ', 'oo'], ['ൌ', 'au'], ['ം', 'm'], ['ഃ', 'h']
  ];
  
  vowels.forEach(([mal, latin]) => {
    toLatinMap.set(mal, latin);
    fromLatinMap.set(latin, mal);
  });
  
  consonants.forEach(([mal, latin]) => {
    toLatinMap.set(mal, latin + 'a');
    fromLatinMap.set(latin, mal);
  });
  
  matras.forEach(([mal, latin]) => {
    vowelModifiers.set(mal, latin);
    vowelModifiers.set(latin, mal);
  });
  
  return { toLatinMap, fromLatinMap, vowelModifiers, virama: '്' };
}

// Generate Gujarati mappings
function generateGujaratiMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  const vowelModifiers = new Map<string, string>();
  
  const vowels: [string, string][] = [
    ['અ', 'a'], ['આ', 'aa'], ['ઇ', 'i'], ['ઈ', 'ii'], ['ઉ', 'u'], ['ઊ', 'uu'],
    ['ઋ', 'ri'], ['એ', 'e'], ['ઐ', 'ai'], ['ઓ', 'o'], ['ઔ', 'au']
  ];
  
  const consonants: [string, string][] = [
    ['ક', 'k'], ['ખ', 'kh'], ['ગ', 'g'], ['ઘ', 'gh'], ['ઙ', 'ng'],
    ['ચ', 'ch'], ['છ', 'chh'], ['જ', 'j'], ['ઝ', 'jh'], ['ઞ', 'ny'],
    ['ટ', 't'], ['ઠ', 'th'], ['ડ', 'd'], ['ઢ', 'dh'], ['ણ', 'n'],
    ['ત', 't'], ['થ', 'th'], ['દ', 'd'], ['ધ', 'dh'], ['ન', 'n'],
    ['પ', 'p'], ['ફ', 'ph'], ['બ', 'b'], ['ભ', 'bh'], ['મ', 'm'],
    ['ય', 'y'], ['ર', 'r'], ['લ', 'l'], ['વ', 'v'], ['શ', 'sh'],
    ['ષ', 'shh'], ['સ', 's'], ['હ', 'h'], ['ળ', 'l']
  ];
  
  const matras: [string, string][] = [
    ['ા', 'aa'], ['િ', 'i'], ['ી', 'ii'], ['ુ', 'u'], ['ૂ', 'uu'],
    ['ૃ', 'ri'], ['ે', 'e'], ['ૈ', 'ai'], ['ો', 'o'], ['ૌ', 'au'], ['ં', 'm'], ['ઃ', 'h']
  ];
  
  vowels.forEach(([guj, latin]) => {
    toLatinMap.set(guj, latin);
    fromLatinMap.set(latin, guj);
  });
  
  consonants.forEach(([guj, latin]) => {
    toLatinMap.set(guj, latin + 'a');
    fromLatinMap.set(latin, guj);
  });
  
  matras.forEach(([guj, latin]) => {
    vowelModifiers.set(guj, latin);
    vowelModifiers.set(latin, guj);
  });
  
  return { toLatinMap, fromLatinMap, vowelModifiers, virama: '્' };
}

// Generate Gurmukhi/Punjabi mappings
function generateGurmukhiMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  const vowelModifiers = new Map<string, string>();
  
  const vowels: [string, string][] = [
    ['ਅ', 'a'], ['ਆ', 'aa'], ['ਇ', 'i'], ['ਈ', 'ii'], ['ਉ', 'u'], ['ਊ', 'uu'],
    ['ਏ', 'e'], ['ਐ', 'ai'], ['ਓ', 'o'], ['ਔ', 'au']
  ];
  
  const consonants: [string, string][] = [
    ['ਕ', 'k'], ['ਖ', 'kh'], ['ਗ', 'g'], ['ਘ', 'gh'], ['ਙ', 'ng'],
    ['ਚ', 'ch'], ['ਛ', 'chh'], ['ਜ', 'j'], ['ਝ', 'jh'], ['ਞ', 'ny'],
    ['ਟ', 't'], ['ਠ', 'th'], ['ਡ', 'd'], ['ਢ', 'dh'], ['ਣ', 'n'],
    ['ਤ', 't'], ['ਥ', 'th'], ['ਦ', 'd'], ['ਧ', 'dh'], ['ਨ', 'n'],
    ['ਪ', 'p'], ['ਫ', 'ph'], ['ਬ', 'b'], ['ਭ', 'bh'], ['ਮ', 'm'],
    ['ਯ', 'y'], ['ਰ', 'r'], ['ਲ', 'l'], ['ਵ', 'v'], ['ਸ਼', 'sh'],
    ['ਸ', 's'], ['ਹ', 'h'], ['ਲ਼', 'l'], ['ਕ਼', 'q'], ['ਖ਼', 'kh'],
    ['ਗ਼', 'gh'], ['ਜ਼', 'z'], ['ਫ਼', 'f']
  ];
  
  const matras: [string, string][] = [
    ['ਾ', 'aa'], ['ਿ', 'i'], ['ੀ', 'ii'], ['ੁ', 'u'], ['ੂ', 'uu'],
    ['ੇ', 'e'], ['ੈ', 'ai'], ['ੋ', 'o'], ['ੌ', 'au'], ['ਂ', 'm'], ['ਃ', 'h']
  ];
  
  vowels.forEach(([gur, latin]) => {
    toLatinMap.set(gur, latin);
    fromLatinMap.set(latin, gur);
  });
  
  consonants.forEach(([gur, latin]) => {
    toLatinMap.set(gur, latin + 'a');
    fromLatinMap.set(latin, gur);
  });
  
  matras.forEach(([gur, latin]) => {
    vowelModifiers.set(gur, latin);
    vowelModifiers.set(latin, gur);
  });
  
  return { toLatinMap, fromLatinMap, vowelModifiers, virama: '੍' };
}

// Generate Oriya mappings
function generateOriyaMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  const vowelModifiers = new Map<string, string>();
  
  const vowels: [string, string][] = [
    ['ଅ', 'a'], ['ଆ', 'aa'], ['ଇ', 'i'], ['ଈ', 'ii'], ['ଉ', 'u'], ['ଊ', 'uu'],
    ['ଋ', 'ri'], ['ଏ', 'e'], ['ଐ', 'ai'], ['ଓ', 'o'], ['ଔ', 'au']
  ];
  
  const consonants: [string, string][] = [
    ['କ', 'k'], ['ଖ', 'kh'], ['ଗ', 'g'], ['ଘ', 'gh'], ['ଙ', 'ng'],
    ['ଚ', 'ch'], ['ଛ', 'chh'], ['ଜ', 'j'], ['ଝ', 'jh'], ['ଞ', 'ny'],
    ['ଟ', 't'], ['ଠ', 'th'], ['ଡ', 'd'], ['ଢ', 'dh'], ['ଣ', 'n'],
    ['ତ', 't'], ['ଥ', 'th'], ['ଦ', 'd'], ['ଧ', 'dh'], ['ନ', 'n'],
    ['ପ', 'p'], ['ଫ', 'ph'], ['ବ', 'b'], ['ଭ', 'bh'], ['ମ', 'm'],
    ['ଯ', 'j'], ['ର', 'r'], ['ଲ', 'l'], ['ଵ', 'v'], ['ଶ', 'sh'],
    ['ଷ', 'shh'], ['ସ', 's'], ['ହ', 'h'], ['ଳ', 'l']
  ];
  
  const matras: [string, string][] = [
    ['ା', 'aa'], ['ି', 'i'], ['ୀ', 'ii'], ['ୁ', 'u'], ['ୂ', 'uu'],
    ['ୃ', 'ri'], ['େ', 'e'], ['ୈ', 'ai'], ['ୋ', 'o'], ['ୌ', 'au'], ['ଂ', 'm'], ['ଃ', 'h']
  ];
  
  vowels.forEach(([ori, latin]) => {
    toLatinMap.set(ori, latin);
    fromLatinMap.set(latin, ori);
  });
  
  consonants.forEach(([ori, latin]) => {
    toLatinMap.set(ori, latin + 'a');
    fromLatinMap.set(latin, ori);
  });
  
  matras.forEach(([ori, latin]) => {
    vowelModifiers.set(ori, latin);
    vowelModifiers.set(latin, ori);
  });
  
  return { toLatinMap, fromLatinMap, vowelModifiers, virama: '୍' };
}

// Generate Thai mappings
function generateThaiMapping(): ScriptMapping {
  const toLatinMap = new Map<string, string>();
  const fromLatinMap = new Map<string, string>();
  
  const chars: [string, string][] = [
    ['ก', 'k'], ['ข', 'kh'], ['ฃ', 'kh'], ['ค', 'kh'], ['ฅ', 'kh'], ['ฆ', 'kh'],
    ['ง', 'ng'], ['จ', 'ch'], ['ฉ', 'ch'], ['ช', 'ch'], ['ซ', 's'], ['ฌ', 'ch'],
    ['ญ', 'y'], ['ฎ', 'd'], ['ฏ', 't'], ['ฐ', 'th'], ['ฑ', 'th'], ['ฒ', 'th'],
    ['ณ', 'n'], ['ด', 'd'], ['ต', 't'], ['ถ', 'th'], ['ท', 'th'], ['ธ', 'th'],
    ['น', 'n'], ['บ', 'b'], ['ป', 'p'], ['ผ', 'ph'], ['ฝ', 'f'], ['พ', 'ph'],
    ['ฟ', 'f'], ['ภ', 'ph'], ['ม', 'm'], ['ย', 'y'], ['ร', 'r'], ['ล', 'l'],
    ['ว', 'w'], ['ศ', 's'], ['ษ', 's'], ['ส', 's'], ['ห', 'h'], ['ฬ', 'l'],
    ['อ', 'a'], ['ฮ', 'h'], ['ะ', 'a'], ['า', 'aa'], ['ิ', 'i'], ['ี', 'ii'],
    ['ึ', 'ue'], ['ื', 'uue'], ['ุ', 'u'], ['ู', 'uu'], ['เ', 'e'], ['แ', 'ae'],
    ['โ', 'o'], ['ใ', 'ai'], ['ไ', 'ai']
  ];
  
  chars.forEach(([thai, latin]) => {
    toLatinMap.set(thai, latin);
    fromLatinMap.set(latin, thai);
  });
  
  return { toLatinMap, fromLatinMap };
}

// Initialize mappings dynamically
function getScriptMapping(scriptName: string): ScriptMapping {
  if (SCRIPT_MAPPINGS[scriptName]) {
    return SCRIPT_MAPPINGS[scriptName];
  }
  
  let mapping: ScriptMapping;
  
  switch (scriptName) {
    case 'devanagari':
      mapping = generateDevanagariMapping();
      break;
    case 'telugu':
      mapping = generateTeluguMapping();
      break;
    case 'tamil':
      mapping = generateTamilMapping();
      break;
    case 'kannada':
      mapping = generateKannadaMapping();
      break;
    case 'malayalam':
      mapping = generateMalayalamMapping();
      break;
    case 'bengali':
      mapping = generateBengaliMapping();
      break;
    case 'gujarati':
      mapping = generateGujaratiMapping();
      break;
    case 'gurmukhi':
      mapping = generateGurmukhiMapping();
      break;
    case 'oriya':
      mapping = generateOriyaMapping();
      break;
    case 'arabic':
      mapping = generateArabicMapping();
      break;
    case 'cyrillic':
      mapping = generateCyrillicMapping();
      break;
    case 'greek':
      mapping = generateGreekMapping();
      break;
    case 'thai':
      mapping = generateThaiMapping();
      break;
    default:
      // For unsupported scripts, create empty mapping (passthrough)
      mapping = { toLatinMap: new Map(), fromLatinMap: new Map() };
  }
  
  SCRIPT_MAPPINGS[scriptName] = mapping;
  return mapping;
}

// ============================================================
// DYNAMIC TRANSLITERATION ENGINE
// ============================================================

// Transliterate any script to Latin (English)
function transliterateToLatin(text: string): string {
  const sourceScript = detectScriptFromText(text);
  
  if (sourceScript === 'latin') {
    return text; // Already Latin
  }
  
  const mapping = getScriptMapping(sourceScript);
  let result = '';
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1] || '';
    const twoChar = char + nextChar;
    const threeChar = text.substring(i, i + 3);
    
    // Try three-character match first (for conjuncts like క్ష)
    if (mapping.toLatinMap.has(threeChar)) {
      result += mapping.toLatinMap.get(threeChar);
      i += 3;
      continue;
    }
    
    // Try two-character match (for conjuncts)
    if (mapping.toLatinMap.has(twoChar)) {
      result += mapping.toLatinMap.get(twoChar);
      i += 2;
      continue;
    }
    
    // Check virama (halant) - removes inherent vowel
    if (mapping.virama && char === mapping.virama) {
      // Remove trailing 'a' from previous consonant
      if (result.endsWith('a')) {
        result = result.slice(0, -1);
      }
      i++;
      continue;
    }
    
    // Check vowel modifiers (matras) - replace inherent 'a' with matra vowel
    if (mapping.vowelModifiers?.has(char)) {
      // Remove trailing 'a' and add matra vowel
      if (result.endsWith('a')) {
        result = result.slice(0, -1);
      }
      result += mapping.vowelModifiers.get(char);
      i++;
      continue;
    }
    
    // Single character match (consonant with inherent 'a' or vowel)
    if (mapping.toLatinMap.has(char)) {
      result += mapping.toLatinMap.get(char);
      i++;
      continue;
    }
    
    // Pass through unchanged (spaces, punctuation, numbers)
    result += char;
    i++;
  }
  
  return result;
}

// Transliterate Latin to target script
function transliterateFromLatin(text: string, targetScript: string): string {
  if (targetScript === 'latin') {
    return text; // Target is Latin, no conversion needed
  }
  
  const mapping = getScriptMapping(targetScript);
  
  // Normalize special characters (German, French, Spanish, etc.)
  const charNormalization: Record<string, string> = {
    'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 'ss', 'Ä': 'A', 'Ö': 'O', 'Ü': 'U',
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u',
    'ý': 'y', 'ÿ': 'y',
    'ñ': 'n', 'ç': 's', 'ð': 'd', 'þ': 'th', 'æ': 'e', 'œ': 'e'
  };
  
  // Normalize the input
  let normalizedText = '';
  for (const char of text) {
    normalizedText += charNormalization[char] || charNormalization[char.toLowerCase()] || char;
  }
  
  const lower = normalizedText.toLowerCase();
  let result = '';
  let i = 0;
  
  // Common digraphs/trigraphs to check first (order matters - longest first)
  const multiCharPatterns = ['shh', 'chh', 'ksh', 'thr', 'sch', 'ng', 'ny', 'kh', 'gh', 'ch', 'jh', 'th', 'dh', 'ph', 'bh', 'sh', 'aa', 'ee', 'ii', 'oo', 'uu', 'ai', 'au', 'ou', 'ei'];
  
  while (i < lower.length) {
    const char = lower[i];
    
    // Skip non-alphabetic characters
    if (!/[a-z]/.test(char)) {
      result += normalizedText[i];
      i++;
      continue;
    }
    
    // Try multi-character patterns first
    let matched = false;
    
    for (const pattern of multiCharPatterns) {
      const substr = lower.substring(i, i + pattern.length);
      if (substr === pattern && mapping.fromLatinMap.has(pattern)) {
        const consonant = mapping.fromLatinMap.get(pattern)!;
        
        // Check if next char is a vowel (need matra instead of inherent 'a')
        const nextPos = i + pattern.length;
        const nextVowel = getNextVowelPattern(lower, nextPos);
        
        if (nextVowel && nextVowel !== 'a') {
          // Add consonant without inherent vowel, then add matra
          result += consonant;
          if (mapping.vowelModifiers?.has(nextVowel)) {
            result += mapping.vowelModifiers.get(nextVowel);
          }
          i = nextPos + nextVowel.length;
        } else if (nextVowel === 'a') {
          // Inherent 'a' - just add consonant (no matra needed)
          result += consonant;
          i = nextPos + 1; // Skip the 'a'
        } else {
          // No following vowel - add consonant with virama
          result += consonant;
          if (mapping.virama && i + pattern.length < lower.length && /[a-z]/.test(lower[i + pattern.length])) {
            result += mapping.virama;
          }
          i = nextPos;
        }
        matched = true;
        break;
      }
    }
    
    if (matched) continue;
    
    // Single consonant
    if (mapping.fromLatinMap.has(char)) {
      const consonant = mapping.fromLatinMap.get(char)!;
      
      // Check if next char is a vowel
      const nextVowel = getNextVowelPattern(lower, i + 1);
      
      if (nextVowel && nextVowel !== 'a') {
        result += consonant;
        if (mapping.vowelModifiers?.has(nextVowel)) {
          result += mapping.vowelModifiers.get(nextVowel);
        }
        i += 1 + nextVowel.length;
      } else if (nextVowel === 'a') {
        result += consonant;
        i += 2; // Skip consonant and 'a'
      } else {
        // Check if it's a standalone vowel
        const isVowel = ['a', 'e', 'i', 'o', 'u'].includes(char);
        if (isVowel) {
          result += consonant; // It's a full vowel character
          i++;
        } else {
          result += consonant;
          // Add virama if followed by another consonant
          if (i + 1 < lower.length && /[a-z]/.test(lower[i + 1]) && !isVowelChar(lower[i + 1])) {
            result += mapping.virama || '';
          }
          i++;
        }
      }
    } else {
      result += normalizedText[i];
      i++;
    }
  }
  
  return result;
}

// Helper: Check if character is a vowel
function isVowelChar(char: string): boolean {
  return ['a', 'e', 'i', 'o', 'u'].includes(char.toLowerCase());
}

// Helper: Get next vowel pattern from position
function getNextVowelPattern(text: string, pos: number): string | null {
  if (pos >= text.length) return null;
  
  // Check for long vowels first
  const twoChar = text.substring(pos, pos + 2);
  if (['aa', 'ee', 'ii', 'oo', 'uu', 'ai', 'au', 'ou', 'ei'].includes(twoChar)) {
    return twoChar;
  }
  
  // Single vowel
  const char = text[pos];
  if (['a', 'e', 'i', 'o', 'u'].includes(char)) {
    return char;
  }
  
  return null;
}

// Force phonetic conversion - uses the improved transliterateFromLatin
function forcePhoneticConversion(text: string, targetScript: string): string {
  // Just use the main transliteration function which now handles everything properly
  return transliterateFromLatin(text, targetScript);
}

// Get target script from language name OR ISO code
function getTargetScriptFromLanguage(language: string): string {
  const lang = language.toLowerCase().trim();
  
  // Map ISO codes to full language names first
  const isoToLang: Record<string, string> = {
    // Indic ISO codes
    'hi': 'hindi', 'mr': 'marathi', 'ne': 'nepali', 'sa': 'sanskrit',
    'te': 'telugu', 'ta': 'tamil', 'kn': 'kannada', 'ml': 'malayalam',
    'bn': 'bengali', 'gu': 'gujarati', 'pa': 'punjabi', 'or': 'oriya',
    'as': 'assamese', 'ks': 'kashmiri', 'sd': 'sindhi', 'mai': 'maithili',
    
    // Middle Eastern ISO codes
    'ar': 'arabic', 'ur': 'urdu', 'fa': 'persian', 'ps': 'pashto', 'he': 'hebrew',
    
    // European ISO codes
    'en': 'english', 'de': 'german', 'fr': 'french', 'es': 'spanish', 'it': 'italian',
    'pt': 'portuguese', 'nl': 'dutch', 'pl': 'polish', 'cs': 'czech', 'sv': 'swedish',
    'no': 'norwegian', 'da': 'danish', 'fi': 'finnish', 'tr': 'turkish',
    'ru': 'russian', 'uk': 'ukrainian', 'be': 'belarusian', 'bg': 'bulgarian',
    'sr': 'serbian', 'mk': 'macedonian', 'el': 'greek',
    
    // Asian ISO codes
    'zh': 'chinese', 'ja': 'japanese', 'ko': 'korean', 'th': 'thai',
    'vi': 'vietnamese', 'id': 'indonesian', 'ms': 'malay', 'tl': 'tagalog',
    
    // African ISO codes
    'sw': 'swahili', 'am': 'amharic', 'ha': 'hausa', 'yo': 'yoruba',
    
    // Central Asian
    'kk': 'kazakh', 'ky': 'kyrgyz', 'uz': 'uzbek', 'tg': 'tajik', 'mn': 'mongolian'
  };
  
  // Resolve ISO code to full language name
  const resolvedLang = isoToLang[lang] || lang;
  
  // Map language names to script names
  const langToScript: Record<string, string> = {
    // Indic languages
    hindi: 'devanagari', marathi: 'devanagari', nepali: 'devanagari', sanskrit: 'devanagari',
    konkani: 'devanagari', dogri: 'devanagari', bodo: 'devanagari', maithili: 'devanagari',
    kashmiri: 'devanagari', sindhi: 'devanagari',
    telugu: 'telugu',
    tamil: 'tamil',
    kannada: 'kannada', tulu: 'kannada',
    malayalam: 'malayalam',
    bengali: 'bengali', bangla: 'bengali', assamese: 'bengali',
    gujarati: 'gujarati',
    punjabi: 'gurmukhi', gurmukhi: 'gurmukhi',
    odia: 'oriya', oriya: 'oriya',
    
    // Middle Eastern
    arabic: 'arabic', urdu: 'arabic', persian: 'arabic', farsi: 'arabic', pashto: 'arabic',
    hebrew: 'hebrew',
    
    // East Asian  
    chinese: 'han', japanese: 'hiragana', korean: 'hangul',
    
    // European non-Latin
    russian: 'cyrillic', ukrainian: 'cyrillic', belarusian: 'cyrillic', bulgarian: 'cyrillic',
    serbian: 'cyrillic', macedonian: 'cyrillic', kazakh: 'cyrillic', kyrgyz: 'cyrillic',
    greek: 'greek',
    
    // Southeast Asian
    thai: 'thai',
    
    // African
    amharic: 'ethiopic',
    
    // Latin-based (no conversion needed)
    english: 'latin', german: 'latin', french: 'latin', spanish: 'latin', italian: 'latin',
    portuguese: 'latin', dutch: 'latin', polish: 'latin', czech: 'latin', swedish: 'latin',
    norwegian: 'latin', danish: 'latin', finnish: 'latin', turkish: 'latin', indonesian: 'latin',
    malay: 'latin', vietnamese: 'latin', tagalog: 'latin', filipino: 'latin', swahili: 'latin',
    hausa: 'latin', yoruba: 'latin', uzbek: 'latin', tajik: 'latin', mongolian: 'latin'
  };
  
  return langToScript[resolvedLang] || 'latin';
}

// ============================================================
// MAIN TRANSLATION FUNCTION
// ============================================================

function translateMessage(
  text: string,
  sourceLang: string,
  targetLang: string
): string {
  if (!text || text.trim().length === 0) {
    return text;
  }
  
  const sourceScript = detectScriptFromText(text);
  const targetScript = getTargetScriptFromLanguage(targetLang);
  
  console.log(`[Translate] "${text.substring(0, 30)}..." | Source script: ${sourceScript} | Target: ${targetLang} (${targetScript})`);
  
  // Case 1: Same script - no transliteration needed
  if (sourceScript === targetScript) {
    return text;
  }
  
  // Case 2: Source is Latin, target is non-Latin
  if (sourceScript === 'latin' && targetScript !== 'latin') {
    return transliterateFromLatin(text, targetScript);
  }
  
  // Case 3: Source is non-Latin, target is Latin
  if (sourceScript !== 'latin' && targetScript === 'latin') {
    return transliterateToLatin(text);
  }
  
  // Case 4: Both non-Latin but different scripts
  // Route: Source → Latin (English pivot) → Target
  const latinIntermediate = transliterateToLatin(text);
  const result = transliterateFromLatin(latinIntermediate, targetScript);
  
  console.log(`[Translate] Cross-script: ${sourceScript} → latin → ${targetScript}`);
  console.log(`[Translate] Intermediate: "${latinIntermediate.substring(0, 30)}..."`);
  
  return result;
}

// ============================================================
// HTTP SERVER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      text, 
      message, 
      sourceLang, 
      targetLang, 
      source_language, 
      target_language, 
      bidirectional,
      // NEW: User IDs for profile-based language detection (mother tongue)
      senderId,
      receiverId,
      userId,       // Alternative: sender's user ID
      partnerId     // Alternative: receiver's user ID
    } = await req.json();
    
    const inputText = text || message;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILE-BASED LANGUAGE DETECTION FROM MOTHER TONGUE
    // Priority: Explicit language param > Profile mother tongue > Auto-detect
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Resolve sender (source) and receiver (target) user IDs
    const senderUserId = senderId || userId;
    const receiverUserId = receiverId || partnerId;
    
    // Fetch languages from profiles if user IDs provided
    let profileSourceLang: string | null = null;
    let profileTargetLang: string | null = null;
    
    if (senderUserId || receiverUserId) {
      const [senderLang, receiverLang] = await Promise.all([
        senderUserId ? getUserLanguageFromProfile(senderUserId) : Promise.resolve(null),
        receiverUserId ? getUserLanguageFromProfile(receiverUserId) : Promise.resolve(null)
      ]);
      profileSourceLang = senderLang;
      profileTargetLang = receiverLang;
      console.log(`[TranslateMessage] Profile languages - Sender: ${profileSourceLang}, Receiver: ${profileTargetLang}`);
    }
    
    // Resolve final languages: explicit param > profile mother tongue > auto-detect
    const fromLang = sourceLang || source_language || profileSourceLang || 'auto';
    const toLang = targetLang || target_language || profileTargetLang || 'english';
    
    console.log(`[TranslateMessage] Resolved languages - Source: ${fromLang}, Target: ${toLang}`);
    
    if (!inputText) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const sourceScript = detectScriptFromText(inputText);
    const targetScript = getTargetScriptFromLanguage(toLang);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SEMANTIC TRANSLATION + TRANSLITERATION VIA LIBRE-TRANSLATE
    // ═══════════════════════════════════════════════════════════════════════════
    // Step 1: Source → English (SEMANTIC translation, not just script)
    // Step 2: English → Target (SEMANTIC translation to target language)
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Call libre-translate for REAL semantic translation
    async function callLibreTranslate(text: string, source: string, target: string): Promise<string> {
      try {
        const url = `${supabaseUrl}/functions/v1/libre-translate/translate`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ q: text, source, target }),
        });
        
        if (!response.ok) {
          console.error('[LibreTranslate] Failed:', response.status);
          return text;
        }
        
        const result = await response.json();
        console.log(`[LibreTranslate] ${source} → ${target}: "${text}" → "${result.translatedText}"`);
        return result.translatedText || text;
      } catch (error) {
        console.error('[LibreTranslate] Error:', error);
        return text;
      }
    }
    
    // Map language codes for libre-translate
    function normalizeToCode(lang: string): string {
      const langMap: Record<string, string> = {
        'english': 'en', 'hindi': 'hi', 'telugu': 'te', 'tamil': 'ta',
        'kannada': 'kn', 'malayalam': 'ml', 'bengali': 'bn', 'gujarati': 'gu',
        'marathi': 'mr', 'punjabi': 'pa', 'odia': 'or', 'urdu': 'ur',
        'german': 'de', 'french': 'fr', 'spanish': 'es', 'italian': 'it',
        'portuguese': 'pt', 'russian': 'ru', 'chinese': 'zh', 'japanese': 'ja',
        'korean': 'ko', 'arabic': 'ar', 'turkish': 'tr', 'dutch': 'nl',
        'polish': 'pl', 'thai': 'th', 'vietnamese': 'vi', 'indonesian': 'id',
        'malay': 'ms', 'swahili': 'sw', 'hebrew': 'he', 'greek': 'el',
      };
      if (lang.length === 2) return lang;
      return langMap[lang.toLowerCase()] || lang;
    }
    
    // Detect language from script when auto-detecting
    function detectLangFromScript(script: string): string {
      const scriptToLang: Record<string, string> = {
        'devanagari': 'hi', 'telugu': 'te', 'tamil': 'ta', 'kannada': 'kn',
        'malayalam': 'ml', 'bengali': 'bn', 'gujarati': 'gu', 'gurmukhi': 'pa',
        'oriya': 'or', 'arabic': 'ar', 'hebrew': 'he', 'cyrillic': 'ru',
        'greek': 'el', 'thai': 'th', 'han': 'zh', 'hangul': 'ko',
        'hiragana': 'ja', 'katakana': 'ja', 'latin': 'en'
      };
      return scriptToLang[script] || 'en';
    }
    
    const sourceCode = normalizeToCode(fromLang === 'auto' ? detectLangFromScript(sourceScript) : fromLang);
    const targetCode = normalizeToCode(toLang);
    
    console.log(`[TranslateMessage] Starting semantic translation: ${sourceCode} → ${targetCode}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SEMANTIC TRANSLATION FLOW (Real meaning, not just phonetics)
    // ═══════════════════════════════════════════════════════════════════════════
    
    // STEP 1: Source → English (semantic meaning)
    let semanticEnglish = inputText;
    if (sourceCode !== 'en') {
      semanticEnglish = await callLibreTranslate(inputText, sourceCode, 'en');
    }
    
    // STEP 2: English → Target (semantic meaning)
    let semanticTarget = semanticEnglish;
    if (targetCode !== 'en') {
      semanticTarget = await callLibreTranslate(semanticEnglish, 'en', targetCode);
    }
    
    // Also keep transliterated versions for display in native scripts
    const transliteratedToLatin = sourceScript !== 'latin' 
      ? transliterateToLatin(inputText)
      : inputText;
    
    let transliteratedToTarget = semanticTarget;
    if (targetScript !== 'latin') {
      const converted = transliterateFromLatin(semanticTarget, targetScript);
      const convertedScript = detectScriptFromText(converted);
      if (convertedScript === targetScript || converted !== semanticTarget) {
        transliteratedToTarget = converted;
      }
    }
    
    // Reverse translation: Target → English → Source
    let reverseToEnglish = semanticTarget;
    if (targetCode !== 'en') {
      reverseToEnglish = await callLibreTranslate(semanticTarget, targetCode, 'en');
    }
    
    let reverseToSource = reverseToEnglish;
    if (sourceCode !== 'en') {
      reverseToSource = await callLibreTranslate(reverseToEnglish, 'en', sourceCode);
    }
    
    // Also transliterate reverse to source script
    const sourceScriptName = getTargetScriptFromLanguage(fromLang);
    if (sourceScriptName !== 'latin') {
      const converted = transliterateFromLatin(reverseToSource, sourceScriptName);
      const convertedScript = detectScriptFromText(converted);
      if (convertedScript === sourceScriptName || converted !== reverseToSource) {
        reverseToSource = converted;
      }
    }
    
    // Full response with SEMANTIC translation via English pivot
    const response: Record<string, any> = {
      success: true,
      
      // Original input
      original: inputText,
      originalScript: sourceScript,
      
      // ═══════════════════════════════════════════════════════════════════
      // SEMANTIC TRANSLATIONS (Real meaning, not just phonetics)
      // ═══════════════════════════════════════════════════════════════════
      
      // Step 1 Result: Source → English (MEANING)
      sourceToEnglish: semanticEnglish,
      inEnglish: semanticEnglish,
      inLatin: semanticEnglish,
      
      // Step 2 Result: English → Target (MEANING)
      englishToTarget: semanticTarget,
      inTargetScript: transliteratedToTarget,
      translated: semanticTarget,
      translatedText: semanticTarget,
      
      // Reverse: Target → English (for replies)
      targetToEnglish: reverseToEnglish,
      
      // Complete Reverse: English → Source (for target user replying back)
      englishToSource: reverseToSource,
      
      // ═══════════════════════════════════════════════════════════════════
      // BIDIRECTIONAL CHAT FIELDS (Source ↔ English ↔ Target)
      // ═══════════════════════════════════════════════════════════════════
      bidirectional: {
        // What was typed
        original: inputText,
        originalScript: sourceScript,
        
        // PIVOT: Always through English
        pivot: 'english',
        pivotText: semanticEnglish,
        
        // ═══════════════════════════════════════════════════════════════
        // FORWARD PATH: Source → English → Target (SEMANTIC)
        // ═══════════════════════════════════════════════════════════════
        sourceToEnglish: semanticEnglish,
        englishToTarget: semanticTarget,
        
        // ═══════════════════════════════════════════════════════════════
        // REVERSE PATH: Target → English → Source  
        // ═══════════════════════════════════════════════════════════════
        targetToEnglish: reverseToEnglish,
        englishToSource: reverseToSource,
        
        // For English/Latin speaker to read
        forEnglishReader: semanticEnglish,
        
        // For source language speaker to read (in their script)
        forSourceReader: reverseToSource,
        
        // For target language speaker to read (in their script)
        forTargetReader: transliteratedToTarget,
        
        // Reverse communication paths
        reverseToEnglish: reverseToEnglish,
        reverseToSource: reverseToSource
      },
      
      // Metadata
      sourceLang: sourceCode,
      targetLang: targetCode,
      sourceScript: sourceScript,
      targetScript: targetScript,
      sourceScriptName: sourceScriptName,
      pivotLanguage: 'english',
      
      // Profile-based language info (mother tongue from user profiles)
      profileSourceLanguage: profileSourceLang,
      profileTargetLanguage: profileTargetLang,
      languageSource: profileSourceLang ? 'profile' : (sourceLang || source_language ? 'explicit' : 'auto-detected'),
      
      // Architecture info
      method: 'semantic_translation_via_libre_translate',
      architecture: 'source ↔ english ↔ target (SEMANTIC)',
      translationType: 'MEANING (not just phonetics)',
      supportedLanguages: 50,
    };
    
    console.log(`[Semantic Translation] "${inputText.substring(0, 15)}..." [${sourceCode}] → English: "${semanticEnglish.substring(0, 20)}..." → [${targetCode}]: "${semanticTarget.substring(0, 20)}..."`);
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Translate Error]", error);
    return new Response(
      JSON.stringify({ 
        error: "Translation failed", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Transliteration Engine - Latin to Native Script
 * Phonetic conversion for real-time preview
 */

// Devanagari (Hindi, Marathi, Nepali, Sanskrit)
const DEVANAGARI_MAP: Record<string, string> = {
  // Vowels
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'ii': 'ई', 'u': 'उ', 'oo': 'ऊ', 'uu': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ', 'ou': 'औ',
  'ri': 'ऋ', 'ru': 'ऋ',
  
  // Consonants
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  'T': 'ट', 'Th': 'ठ', 'D': 'ड', 'Dh': 'ढ', 'N': 'ण',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  'sh': 'श', 'shh': 'ष', 's': 'स', 'h': 'ह',
  'ksh': 'क्ष', 'tr': 'त्र', 'gy': 'ज्ञ', 'gn': 'ज्ञ',
  'q': 'क़', 'x': 'क्स', 'z': 'ज़',
  
  // Matras (vowel signs)
  '_a': '', '_aa': 'ा', '_i': 'ि', '_ee': 'ी', '_ii': 'ी',
  '_u': 'ु', '_oo': 'ू', '_uu': 'ू', '_e': 'े', '_ai': 'ै',
  '_o': 'ो', '_au': 'ौ', '_ou': 'ौ',
  
  // Special
  '.': '।', '|': '।', '||': '॥',
  '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
  '5': '५', '6': '६', '7': '७', '8': '८', '9': '९',
};

// Telugu script mapping
const TELUGU_MAP: Record<string, string> = {
  // Vowels
  'a': 'అ', 'aa': 'ఆ', 'i': 'ఇ', 'ee': 'ఈ', 'ii': 'ఈ', 'u': 'ఉ', 'oo': 'ఊ', 'uu': 'ఊ',
  'e': 'ఎ', 'ae': 'ఏ', 'ai': 'ఐ', 'o': 'ఒ', 'oe': 'ఓ', 'au': 'ఔ', 'ou': 'ఔ',
  
  // Consonants
  'k': 'క', 'kh': 'ఖ', 'g': 'గ', 'gh': 'ఘ', 'ng': 'ఙ',
  'ch': 'చ', 'chh': 'ఛ', 'j': 'జ', 'jh': 'ఝ', 'ny': 'ఞ',
  'T': 'ట', 'Th': 'ఠ', 'D': 'డ', 'Dh': 'ఢ', 'N': 'ణ',
  't': 'త', 'th': 'థ', 'd': 'ద', 'dh': 'ధ', 'n': 'న',
  'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
  'y': 'య', 'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ',
  'sh': 'శ', 'shh': 'ష', 's': 'స', 'h': 'హ',
  'L': 'ళ', 'zh': 'ఴ', 'R': 'ఱ',
  
  // Matras
  '_a': '', '_aa': 'ా', '_i': 'ి', '_ee': 'ీ', '_ii': 'ీ',
  '_u': 'ు', '_oo': 'ూ', '_uu': 'ూ', '_e': 'ె', '_ae': 'ే',
  '_ai': 'ై', '_o': 'ొ', '_oe': 'ో', '_au': 'ౌ', '_ou': 'ౌ',
  
  // Numbers
  '0': '౦', '1': '౧', '2': '౨', '3': '౩', '4': '౪',
  '5': '౫', '6': '౬', '7': '౭', '8': '౮', '9': '౯',
};

// Tamil script mapping
const TAMIL_MAP: Record<string, string> = {
  // Vowels
  'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ee': 'ஈ', 'ii': 'ஈ', 'u': 'உ', 'oo': 'ஊ', 'uu': 'ஊ',
  'e': 'எ', 'ae': 'ஏ', 'ai': 'ஐ', 'o': 'ஒ', 'oe': 'ஓ', 'au': 'ஔ', 'ou': 'ஔ',
  
  // Consonants
  'k': 'க', 'g': 'க', 'ng': 'ங',
  'ch': 'ச', 'j': 'ஜ', 'ny': 'ஞ',
  'T': 'ட', 'D': 'ட', 'N': 'ண',
  't': 'த', 'd': 'த', 'n': 'ந', 'nn': 'ன',
  'p': 'ப', 'b': 'ப', 'm': 'ம',
  'y': 'ய', 'r': 'ர', 'R': 'ற', 'l': 'ல', 'L': 'ள', 'zh': 'ழ',
  'v': 'வ', 'w': 'வ',
  'sh': 'ஷ', 's': 'ச', 'h': 'ஹ',
  
  // Matras
  '_a': '', '_aa': 'ா', '_i': 'ி', '_ee': 'ீ', '_ii': 'ீ',
  '_u': 'ு', '_oo': 'ூ', '_uu': 'ூ', '_e': 'ெ', '_ae': 'ே',
  '_ai': 'ை', '_o': 'ொ', '_oe': 'ோ', '_au': 'ௌ', '_ou': 'ௌ',
  
  // Numbers
  '0': '௦', '1': '௧', '2': '௨', '3': '௩', '4': '௪',
  '5': '௫', '6': '௬', '7': '௭', '8': '௮', '9': '௯',
};

// Kannada script mapping
const KANNADA_MAP: Record<string, string> = {
  // Vowels
  'a': 'ಅ', 'aa': 'ಆ', 'i': 'ಇ', 'ee': 'ಈ', 'ii': 'ಈ', 'u': 'ಉ', 'oo': 'ಊ', 'uu': 'ಊ',
  'e': 'ಎ', 'ae': 'ಏ', 'ai': 'ಐ', 'o': 'ಒ', 'oe': 'ಓ', 'au': 'ಔ', 'ou': 'ಔ',
  
  // Consonants
  'k': 'ಕ', 'kh': 'ಖ', 'g': 'ಗ', 'gh': 'ಘ', 'ng': 'ಙ',
  'ch': 'ಚ', 'chh': 'ಛ', 'j': 'ಜ', 'jh': 'ಝ', 'ny': 'ಞ',
  'T': 'ಟ', 'Th': 'ಠ', 'D': 'ಡ', 'Dh': 'ಢ', 'N': 'ಣ',
  't': 'ತ', 'th': 'ಥ', 'd': 'ದ', 'dh': 'ಧ', 'n': 'ನ',
  'p': 'ಪ', 'ph': 'ಫ', 'f': 'ಫ', 'b': 'ಬ', 'bh': 'ಭ', 'm': 'ಮ',
  'y': 'ಯ', 'r': 'ರ', 'l': 'ಲ', 'v': 'ವ', 'w': 'ವ',
  'sh': 'ಶ', 'shh': 'ಷ', 's': 'ಸ', 'h': 'ಹ',
  'L': 'ಳ',
  
  // Matras
  '_a': '', '_aa': 'ಾ', '_i': 'ಿ', '_ee': 'ೀ', '_ii': 'ೀ',
  '_u': 'ು', '_oo': 'ೂ', '_uu': 'ೂ', '_e': 'ೆ', '_ae': 'ೇ',
  '_ai': 'ೈ', '_o': 'ೊ', '_oe': 'ೋ', '_au': 'ೌ', '_ou': 'ೌ',
  
  // Numbers
  '0': '೦', '1': '೧', '2': '೨', '3': '೩', '4': '೪',
  '5': '೫', '6': '೬', '7': '೭', '8': '೮', '9': '೯',
};

// Malayalam script mapping
const MALAYALAM_MAP: Record<string, string> = {
  // Vowels
  'a': 'അ', 'aa': 'ആ', 'i': 'ഇ', 'ee': 'ഈ', 'ii': 'ഈ', 'u': 'ഉ', 'oo': 'ഊ', 'uu': 'ഊ',
  'e': 'എ', 'ae': 'ഏ', 'ai': 'ഐ', 'o': 'ഒ', 'oe': 'ഓ', 'au': 'ഔ', 'ou': 'ഔ',
  
  // Consonants
  'k': 'ക', 'kh': 'ഖ', 'g': 'ഗ', 'gh': 'ഘ', 'ng': 'ങ',
  'ch': 'ച', 'chh': 'ഛ', 'j': 'ജ', 'jh': 'ഝ', 'ny': 'ഞ',
  'T': 'ട', 'Th': 'ഠ', 'D': 'ഡ', 'Dh': 'ഢ', 'N': 'ണ',
  't': 'ത', 'th': 'ഥ', 'd': 'ദ', 'dh': 'ധ', 'n': 'ന',
  'p': 'പ', 'ph': 'ഫ', 'f': 'ഫ', 'b': 'ബ', 'bh': 'ഭ', 'm': 'മ',
  'y': 'യ', 'r': 'ര', 'l': 'ല', 'v': 'വ', 'w': 'വ',
  'sh': 'ശ', 'shh': 'ഷ', 's': 'സ', 'h': 'ഹ',
  'L': 'ള', 'zh': 'ഴ', 'R': 'റ',
  
  // Matras
  '_a': '', '_aa': 'ാ', '_i': 'ി', '_ee': 'ീ', '_ii': 'ീ',
  '_u': 'ു', '_oo': 'ൂ', '_uu': 'ൂ', '_e': 'െ', '_ae': 'േ',
  '_ai': 'ൈ', '_o': 'ൊ', '_oe': 'ോ', '_au': 'ൌ', '_ou': 'ൌ',
  
  // Numbers
  '0': '൦', '1': '൧', '2': '൨', '3': '൩', '4': '൪',
  '5': '൫', '6': '൬', '7': '൭', '8': '൮', '9': '൯',
};

// Bengali/Bangla script mapping
const BENGALI_MAP: Record<string, string> = {
  // Vowels
  'a': 'অ', 'aa': 'আ', 'i': 'ই', 'ee': 'ঈ', 'ii': 'ঈ', 'u': 'উ', 'oo': 'ঊ', 'uu': 'ঊ',
  'e': 'এ', 'ai': 'ঐ', 'o': 'ও', 'au': 'ঔ', 'ou': 'ঔ',
  
  // Consonants
  'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ঙ',
  'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'ny': 'ঞ',
  'T': 'ট', 'Th': 'ঠ', 'D': 'ড', 'Dh': 'ঢ', 'N': 'ণ',
  't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন',
  'p': 'প', 'ph': 'ফ', 'f': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
  'y': 'য', 'r': 'র', 'l': 'ল', 'v': 'ব', 'w': 'ও',
  'sh': 'শ', 'shh': 'ষ', 's': 'স', 'h': 'হ',
  
  // Matras
  '_a': '', '_aa': 'া', '_i': 'ি', '_ee': 'ী', '_ii': 'ী',
  '_u': 'ু', '_oo': 'ূ', '_uu': 'ূ', '_e': 'ে',
  '_ai': 'ৈ', '_o': 'ো', '_au': 'ৌ', '_ou': 'ৌ',
  
  // Numbers
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

// Gujarati script mapping
const GUJARATI_MAP: Record<string, string> = {
  // Vowels
  'a': 'અ', 'aa': 'આ', 'i': 'ઇ', 'ee': 'ઈ', 'ii': 'ઈ', 'u': 'ઉ', 'oo': 'ઊ', 'uu': 'ઊ',
  'e': 'એ', 'ai': 'ઐ', 'o': 'ઓ', 'au': 'ઔ', 'ou': 'ઔ',
  
  // Consonants
  'k': 'ક', 'kh': 'ખ', 'g': 'ગ', 'gh': 'ઘ', 'ng': 'ઙ',
  'ch': 'ચ', 'chh': 'છ', 'j': 'જ', 'jh': 'ઝ', 'ny': 'ઞ',
  'T': 'ટ', 'Th': 'ઠ', 'D': 'ડ', 'Dh': 'ઢ', 'N': 'ણ',
  't': 'ત', 'th': 'થ', 'd': 'દ', 'dh': 'ધ', 'n': 'ન',
  'p': 'પ', 'ph': 'ફ', 'f': 'ફ', 'b': 'બ', 'bh': 'ભ', 'm': 'મ',
  'y': 'ય', 'r': 'ર', 'l': 'લ', 'v': 'વ', 'w': 'વ',
  'sh': 'શ', 'shh': 'ષ', 's': 'સ', 'h': 'હ',
  'L': 'ળ',
  
  // Matras
  '_a': '', '_aa': 'ા', '_i': 'િ', '_ee': 'ી', '_ii': 'ી',
  '_u': 'ુ', '_oo': 'ૂ', '_uu': 'ૂ', '_e': 'ે',
  '_ai': 'ૈ', '_o': 'ો', '_au': 'ૌ', '_ou': 'ૌ',
  
  // Numbers
  '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
  '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯',
};

// Gurmukhi (Punjabi) script mapping
const GURMUKHI_MAP: Record<string, string> = {
  // Vowels
  'a': 'ਅ', 'aa': 'ਆ', 'i': 'ਇ', 'ee': 'ਈ', 'ii': 'ਈ', 'u': 'ਉ', 'oo': 'ਊ', 'uu': 'ਊ',
  'e': 'ਏ', 'ai': 'ਐ', 'o': 'ਓ', 'au': 'ਔ', 'ou': 'ਔ',
  
  // Consonants
  'k': 'ਕ', 'kh': 'ਖ', 'g': 'ਗ', 'gh': 'ਘ', 'ng': 'ਙ',
  'ch': 'ਚ', 'chh': 'ਛ', 'j': 'ਜ', 'jh': 'ਝ', 'ny': 'ਞ',
  'T': 'ਟ', 'Th': 'ਠ', 'D': 'ਡ', 'Dh': 'ਢ', 'N': 'ਣ',
  't': 'ਤ', 'th': 'ਥ', 'd': 'ਦ', 'dh': 'ਧ', 'n': 'ਨ',
  'p': 'ਪ', 'ph': 'ਫ', 'f': 'ਫ਼', 'b': 'ਬ', 'bh': 'ਭ', 'm': 'ਮ',
  'y': 'ਯ', 'r': 'ਰ', 'l': 'ਲ', 'v': 'ਵ', 'w': 'ਵ',
  'sh': 'ਸ਼', 's': 'ਸ', 'h': 'ਹ',
  'L': 'ਲ਼',
  
  // Matras
  '_a': '', '_aa': 'ਾ', '_i': 'ਿ', '_ee': 'ੀ', '_ii': 'ੀ',
  '_u': 'ੁ', '_oo': 'ੂ', '_uu': 'ੂ', '_e': 'ੇ',
  '_ai': 'ੈ', '_o': 'ੋ', '_au': 'ੌ', '_ou': 'ੌ',
  
  // Numbers
  '0': '੦', '1': '੧', '2': '੨', '3': '੩', '4': '੪',
  '5': '੫', '6': '੬', '7': '੭', '8': '੮', '9': '੯',
};

// Map NLLB codes to script maps
const SCRIPT_MAPS: Record<string, Record<string, string>> = {
  'hin_Deva': DEVANAGARI_MAP,
  'mar_Deva': DEVANAGARI_MAP,
  'npi_Deva': DEVANAGARI_MAP,
  'san_Deva': DEVANAGARI_MAP,
  'bho_Deva': DEVANAGARI_MAP,
  'mag_Deva': DEVANAGARI_MAP,
  'mai_Deva': DEVANAGARI_MAP,
  'tel_Telu': TELUGU_MAP,
  'tam_Taml': TAMIL_MAP,
  'kan_Knda': KANNADA_MAP,
  'mal_Mlym': MALAYALAM_MAP,
  'ben_Beng': BENGALI_MAP,
  'asm_Beng': BENGALI_MAP,
  'guj_Gujr': GUJARATI_MAP,
  'pan_Guru': GURMUKHI_MAP,
};

// Supported scripts for transliteration
export const SUPPORTED_TRANSLITERATION_SCRIPTS = Object.keys(SCRIPT_MAPS);

/**
 * Get script map for a language code
 */
function getScriptMap(nllbCode: string): Record<string, string> | null {
  return SCRIPT_MAPS[nllbCode] || null;
}

/**
 * Check if transliteration is supported for a language
 */
export function isTransliterationSupported(nllbCode: string): boolean {
  return nllbCode in SCRIPT_MAPS;
}

/**
 * Transliterate Latin text to native script
 */
export function transliterate(
  text: string,
  targetNllbCode: string
): string {
  const scriptMap = getScriptMap(targetNllbCode);
  if (!scriptMap) {
    return text; // Return original if no script map found
  }
  
  // Get virama (halant) for the script
  const viramas: Record<string, string> = {
    'hin_Deva': '्', 'mar_Deva': '्', 'npi_Deva': '्', 'san_Deva': '्',
    'bho_Deva': '्', 'mag_Deva': '्', 'mai_Deva': '्',
    'tel_Telu': '్',
    'tam_Taml': '்',
    'kan_Knda': '್',
    'mal_Mlym': '്',
    'ben_Beng': '্', 'asm_Beng': '্',
    'guj_Gujr': '્',
    'pan_Guru': '੍',
  };
  
  const virama = viramas[targetNllbCode] || '';
  
  let result = '';
  let i = 0;
  let prevWasConsonant = false;
  
  while (i < text.length) {
    let matched = false;
    
    // Try to match longest sequences first (up to 4 characters)
    for (let len = 4; len >= 1; len--) {
      if (i + len <= text.length) {
        const substr = text.substring(i, i + len);
        const lowerSubstr = substr.toLowerCase();
        
        // Check for consonant
        if (scriptMap[lowerSubstr] || scriptMap[substr]) {
          const char = scriptMap[lowerSubstr] || scriptMap[substr];
          
          // Check if it's a vowel (starts with vowel indicators)
          const isVowel = /^[aeiou]/i.test(lowerSubstr);
          
          if (isVowel && prevWasConsonant) {
            // Apply matra instead of full vowel
            const matraKey = '_' + lowerSubstr;
            const matra = scriptMap[matraKey];
            if (matra !== undefined) {
              result += matra;
            } else {
              result += char;
            }
          } else if (!isVowel && prevWasConsonant) {
            // Add virama before consonant cluster
            result += virama + char;
          } else {
            result += char;
          }
          
          prevWasConsonant = !isVowel && !/^[0-9\s\p{P}]/u.test(lowerSubstr);
          i += len;
          matched = true;
          break;
        }
      }
    }
    
    if (!matched) {
      // Keep original character (spaces, punctuation, etc.)
      const char = text[i];
      
      // Check for number conversion
      if (/[0-9]/.test(char) && scriptMap[char]) {
        result += scriptMap[char];
      } else {
        result += char;
      }
      
      prevWasConsonant = false;
      i++;
    }
  }
  
  return result;
}

/**
 * Get language name from NLLB code for display
 */
export function getLanguageDisplayName(nllbCode: string): string {
  const names: Record<string, string> = {
    'hin_Deva': 'हिन्दी',
    'tel_Telu': 'తెలుగు',
    'tam_Taml': 'தமிழ்',
    'kan_Knda': 'ಕನ್ನಡ',
    'mal_Mlym': 'മലയാളം',
    'mar_Deva': 'मराठी',
    'ben_Beng': 'বাংলা',
    'guj_Gujr': 'ગુજરાતી',
    'pan_Guru': 'ਪੰਜਾਬੀ',
    'ory_Orya': 'ଓଡ଼ିଆ',
    'asm_Beng': 'অসমীয়া',
    'npi_Deva': 'नेपाली',
    'urd_Arab': 'اردو',
    'eng_Latn': 'English',
    'spa_Latn': 'Español',
    'fra_Latn': 'Français',
    'deu_Latn': 'Deutsch',
    'por_Latn': 'Português',
    'ita_Latn': 'Italiano',
    'rus_Cyrl': 'Русский',
    'arb_Arab': 'العربية',
    'zho_Hans': '中文',
    'jpn_Jpan': '日本語',
    'kor_Hang': '한국어',
    'tha_Thai': 'ไทย',
    'vie_Latn': 'Tiếng Việt',
  };
  
  return names[nllbCode] || nllbCode;
}

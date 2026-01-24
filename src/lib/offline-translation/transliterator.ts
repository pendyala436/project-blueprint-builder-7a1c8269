/**
 * Offline Translation - Script Transliterator
 * ============================================
 * 
 * Converts text between Latin and native scripts.
 * Uses Gboard-compatible input codes for accurate transliteration.
 * 
 * Features:
 * - Latin → Native script conversion
 * - Native → Latin (reverse transliteration)
 * - Live typing preview
 * - Support for all Indic, Arabic, Cyrillic, and Asian scripts
 */

import { normalizeLanguage, isLatinScriptLanguage, isLatinText } from './language-registry';

// ============================================================
// SCRIPT BLOCKS - Gboard Input Codes
// ============================================================

interface ScriptBlock {
  virama?: string;
  vowelMap: Record<string, string>;
  consonantMap: Record<string, string>;
  modifiers: Record<string, string>;
}

const SCRIPT_BLOCKS: Record<string, ScriptBlock> = {
  devanagari: {
    virama: '्',
    vowelMap: {
      'a': 'अ', 'A': 'आ', 'aa': 'आ', 'i': 'इ', 'I': 'ई', 'ee': 'ई',
      'u': 'उ', 'U': 'ऊ', 'oo': 'ऊ', 'e': 'ए', 'E': 'ऐ', 'ai': 'ऐ',
      'o': 'ओ', 'O': 'औ', 'au': 'औ', 'aM': 'अं', 'aH': 'अः'
    },
    consonantMap: {
      'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
      'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
      'T': 'ट', 'Th': 'ठ', 'D': 'ड', 'Dh': 'ढ', 'N': 'ण',
      't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
      'p': 'प', 'ph': 'फ', 'f': 'फ़', 'b': 'ब', 'bh': 'भ', 'm': 'म',
      'y': 'य', 'r': 'र', 'l': 'ल', 'L': 'ळ', 'v': 'व', 'w': 'व',
      'sh': 'श', 'Sh': 'ष', 's': 'स', 'h': 'ह',
      'x': 'क्ष', 'ksh': 'क्ष', 'gy': 'ज्ञ',
      'q': 'क़', 'z': 'ज़', 'M': 'ं', 'H': 'ः'
    },
    modifiers: {
      'aa': 'ा', 'A': 'ा', 'i': 'ि', 'I': 'ी', 'ee': 'ी',
      'u': 'ु', 'U': 'ू', 'oo': 'ू', 'e': 'े', 'E': 'ै', 'ai': 'ै',
      'o': 'ो', 'O': 'ौ', 'au': 'ौ', 'M': 'ं', 'H': 'ः'
    }
  },
  telugu: {
    virama: '్',
    vowelMap: {
      'a': 'అ', 'A': 'ఆ', 'aa': 'ఆ', 'i': 'ఇ', 'I': 'ఈ', 'ee': 'ఈ',
      'u': 'ఉ', 'U': 'ఊ', 'oo': 'ఊ', 'e': 'ఎ', 'E': 'ఏ', 'ai': 'ఐ',
      'o': 'ఒ', 'O': 'ఓ', 'au': 'ఔ', 'aM': 'అం', 'aH': 'అః'
    },
    consonantMap: {
      'k': 'క', 'kh': 'ఖ', 'g': 'గ', 'gh': 'ఘ', 'ng': 'ఙ',
      'ch': 'చ', 'chh': 'ఛ', 'j': 'జ', 'jh': 'ఝ', 'ny': 'ఞ',
      'T': 'ట', 'Th': 'ఠ', 'D': 'డ', 'Dh': 'ఢ', 'N': 'ణ',
      't': 'త', 'th': 'థ', 'd': 'ద', 'dh': 'ధ', 'n': 'న',
      'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
      'y': 'య', 'r': 'ర', 'R': 'ఱ', 'l': 'ల', 'L': 'ళ', 'v': 'వ', 'w': 'వ',
      'sh': 'శ', 'Sh': 'ష', 's': 'స', 'h': 'హ',
      'x': 'క్ష', 'ksh': 'క్ష', 'gy': 'జ్ఞ', 'q': 'క', 'z': 'జ',
      'M': 'ం', 'H': 'ః'
    },
    modifiers: {
      'aa': 'ా', 'A': 'ా', 'i': 'ి', 'I': 'ీ', 'ee': 'ీ',
      'u': 'ు', 'U': 'ూ', 'oo': 'ూ', 'e': 'ె', 'E': 'ే', 'ai': 'ై',
      'o': 'ొ', 'O': 'ో', 'au': 'ౌ', 'M': 'ం', 'H': 'ః'
    }
  },
  tamil: {
    virama: '்',
    vowelMap: {
      'a': 'அ', 'A': 'ஆ', 'aa': 'ஆ', 'i': 'இ', 'I': 'ஈ', 'ee': 'ஈ',
      'u': 'உ', 'U': 'ஊ', 'oo': 'ஊ', 'e': 'எ', 'E': 'ஏ', 'ai': 'ஐ',
      'o': 'ஒ', 'O': 'ஓ', 'au': 'ஔ'
    },
    consonantMap: {
      'k': 'க', 'g': 'க', 'ng': 'ங',
      'ch': 'ச', 's': 'ச', 'j': 'ஜ', 'ny': 'ஞ',
      'T': 'ட', 'D': 'ட',
      't': 'த', 'd': 'த', 'n': 'ந', 'N': 'ண',
      'p': 'ப', 'b': 'ப', 'f': 'ப', 'm': 'ம',
      'y': 'ய', 'r': 'ர', 'R': 'ற', 'l': 'ல', 'L': 'ள', 'zh': 'ழ', 'v': 'வ', 'w': 'வ',
      'sh': 'ஷ', 'Sh': 'ஷ', 'h': 'ஹ',
      'z': 'ஜ', 'q': 'க'
    },
    modifiers: {
      'aa': 'ா', 'A': 'ா', 'i': 'ி', 'I': 'ீ', 'ee': 'ீ',
      'u': 'ு', 'U': 'ூ', 'oo': 'ூ', 'e': 'ெ', 'E': 'ே', 'ai': 'ை',
      'o': 'ொ', 'O': 'ோ', 'au': 'ௌ'
    }
  },
  kannada: {
    virama: '್',
    vowelMap: {
      'a': 'ಅ', 'A': 'ಆ', 'aa': 'ಆ', 'i': 'ಇ', 'I': 'ಈ', 'ee': 'ಈ',
      'u': 'ಉ', 'U': 'ಊ', 'oo': 'ಊ', 'e': 'ಎ', 'E': 'ಏ', 'ai': 'ಐ',
      'o': 'ಒ', 'O': 'ಓ', 'au': 'ಔ', 'aM': 'ಅಂ', 'aH': 'ಅಃ'
    },
    consonantMap: {
      'k': 'ಕ', 'kh': 'ಖ', 'g': 'ಗ', 'gh': 'ಘ', 'ng': 'ಙ',
      'ch': 'ಚ', 'chh': 'ಛ', 'j': 'ಜ', 'jh': 'ಝ', 'ny': 'ಞ',
      'T': 'ಟ', 'Th': 'ಠ', 'D': 'ಡ', 'Dh': 'ಢ', 'N': 'ಣ',
      't': 'ತ', 'th': 'ಥ', 'd': 'ದ', 'dh': 'ಧ', 'n': 'ನ',
      'p': 'ಪ', 'ph': 'ಫ', 'f': 'ಫ', 'b': 'ಬ', 'bh': 'ಭ', 'm': 'ಮ',
      'y': 'ಯ', 'r': 'ರ', 'l': 'ಲ', 'L': 'ಳ', 'v': 'ವ', 'w': 'ವ',
      'sh': 'ಶ', 'Sh': 'ಷ', 's': 'ಸ', 'h': 'ಹ',
      'x': 'ಕ್ಷ', 'ksh': 'ಕ್ಷ', 'gy': 'ಜ್ಞ', 'q': 'ಕ', 'z': 'ಜ',
      'M': 'ಂ', 'H': 'ಃ'
    },
    modifiers: {
      'aa': 'ಾ', 'A': 'ಾ', 'i': 'ಿ', 'I': 'ೀ', 'ee': 'ೀ',
      'u': 'ು', 'U': 'ೂ', 'oo': 'ೂ', 'e': 'ೆ', 'E': 'ೇ', 'ai': 'ೈ',
      'o': 'ೊ', 'O': 'ೋ', 'au': 'ೌ', 'M': 'ಂ', 'H': 'ಃ'
    }
  },
  malayalam: {
    virama: '്',
    vowelMap: {
      'a': 'അ', 'A': 'ആ', 'aa': 'ആ', 'i': 'ഇ', 'I': 'ഈ', 'ee': 'ഈ',
      'u': 'ഉ', 'U': 'ഊ', 'oo': 'ഊ', 'e': 'എ', 'E': 'ഏ', 'ai': 'ഐ',
      'o': 'ഒ', 'O': 'ഓ', 'au': 'ഔ', 'aM': 'അം', 'aH': 'അഃ'
    },
    consonantMap: {
      'k': 'ക', 'kh': 'ഖ', 'g': 'ഗ', 'gh': 'ഘ', 'ng': 'ങ',
      'ch': 'ച', 'chh': 'ഛ', 'j': 'ജ', 'jh': 'ഝ', 'ny': 'ഞ',
      'T': 'ട', 'Th': 'ഠ', 'D': 'ഡ', 'Dh': 'ഢ', 'N': 'ണ',
      't': 'ത', 'th': 'ഥ', 'd': 'ദ', 'dh': 'ധ', 'n': 'ന',
      'p': 'പ', 'ph': 'ഫ', 'f': 'ഫ', 'b': 'ബ', 'bh': 'ഭ', 'm': 'മ',
      'y': 'യ', 'r': 'ര', 'R': 'റ', 'l': 'ല', 'L': 'ള', 'zh': 'ഴ', 'v': 'വ', 'w': 'വ',
      'sh': 'ശ', 'Sh': 'ഷ', 's': 'സ', 'h': 'ഹ',
      'x': 'ക്ഷ', 'ksh': 'ക്ഷ', 'gy': 'ജ്ഞ', 'q': 'ക', 'z': 'ജ',
      'M': 'ം', 'H': 'ഃ'
    },
    modifiers: {
      'aa': 'ാ', 'A': 'ാ', 'i': 'ി', 'I': 'ീ', 'ee': 'ീ',
      'u': 'ു', 'U': 'ൂ', 'oo': 'ൂ', 'e': 'െ', 'E': 'േ', 'ai': 'ൈ',
      'o': 'ൊ', 'O': 'ോ', 'au': 'ൌ', 'M': 'ം', 'H': 'ഃ'
    }
  },
  bengali: {
    virama: '্',
    vowelMap: {
      'a': 'অ', 'A': 'আ', 'aa': 'আ', 'i': 'ই', 'I': 'ঈ', 'ee': 'ঈ',
      'u': 'উ', 'U': 'ঊ', 'oo': 'ঊ', 'e': 'এ', 'E': 'ঐ', 'ai': 'ঐ',
      'o': 'ও', 'O': 'ঔ', 'au': 'ঔ', 'aM': 'অং', 'aH': 'অঃ'
    },
    consonantMap: {
      'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ঙ',
      'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'ny': 'ঞ',
      'T': 'ট', 'Th': 'ঠ', 'D': 'ড', 'Dh': 'ঢ', 'N': 'ণ',
      't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন',
      'p': 'প', 'ph': 'ফ', 'f': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
      'y': 'য', 'r': 'র', 'l': 'ল', 'v': 'ভ', 'w': 'ও',
      'sh': 'শ', 'Sh': 'ষ', 's': 'স', 'h': 'হ',
      'x': 'ক্ষ', 'ksh': 'ক্ষ', 'gy': 'জ্ঞ', 'q': 'ক', 'z': 'জ',
      'M': 'ং', 'H': 'ঃ'
    },
    modifiers: {
      'aa': 'া', 'A': 'া', 'i': 'ি', 'I': 'ী', 'ee': 'ী',
      'u': 'ু', 'U': 'ূ', 'oo': 'ূ', 'e': 'ে', 'E': 'ৈ', 'ai': 'ৈ',
      'o': 'ো', 'O': 'ৌ', 'au': 'ৌ', 'M': 'ং', 'H': 'ঃ'
    }
  },
  gujarati: {
    virama: '્',
    vowelMap: {
      'a': 'અ', 'A': 'આ', 'aa': 'આ', 'i': 'ઇ', 'I': 'ઈ', 'ee': 'ઈ',
      'u': 'ઉ', 'U': 'ઊ', 'oo': 'ઊ', 'e': 'એ', 'E': 'ઐ', 'ai': 'ઐ',
      'o': 'ઓ', 'O': 'ઔ', 'au': 'ઔ', 'aM': 'અં', 'aH': 'અઃ'
    },
    consonantMap: {
      'k': 'ક', 'kh': 'ખ', 'g': 'ગ', 'gh': 'ઘ', 'ng': 'ઙ',
      'ch': 'ચ', 'chh': 'છ', 'j': 'જ', 'jh': 'ઝ', 'ny': 'ઞ',
      'T': 'ટ', 'Th': 'ઠ', 'D': 'ડ', 'Dh': 'ઢ', 'N': 'ણ',
      't': 'ત', 'th': 'થ', 'd': 'દ', 'dh': 'ધ', 'n': 'ન',
      'p': 'પ', 'ph': 'ફ', 'f': 'ફ', 'b': 'બ', 'bh': 'ભ', 'm': 'મ',
      'y': 'ય', 'r': 'ર', 'l': 'લ', 'L': 'ળ', 'v': 'વ', 'w': 'વ',
      'sh': 'શ', 'Sh': 'ષ', 's': 'સ', 'h': 'હ',
      'x': 'ક્ષ', 'ksh': 'ક્ષ', 'gy': 'જ્ઞ', 'q': 'ક', 'z': 'જ',
      'M': 'ં', 'H': 'ઃ'
    },
    modifiers: {
      'aa': 'ા', 'A': 'ા', 'i': 'િ', 'I': 'ી', 'ee': 'ી',
      'u': 'ુ', 'U': 'ૂ', 'oo': 'ૂ', 'e': 'ે', 'E': 'ૈ', 'ai': 'ૈ',
      'o': 'ો', 'O': 'ૌ', 'au': 'ૌ', 'M': 'ં', 'H': 'ઃ'
    }
  },
  punjabi: {
    virama: '੍',
    vowelMap: {
      'a': 'ਅ', 'A': 'ਆ', 'aa': 'ਆ', 'i': 'ਇ', 'I': 'ਈ', 'ee': 'ਈ',
      'u': 'ਉ', 'U': 'ਊ', 'oo': 'ਊ', 'e': 'ਏ', 'E': 'ਐ', 'ai': 'ਐ',
      'o': 'ਓ', 'O': 'ਔ', 'au': 'ਔ', 'aM': 'ਅਂ', 'aH': 'ਅਃ'
    },
    consonantMap: {
      'k': 'ਕ', 'kh': 'ਖ', 'g': 'ਗ', 'gh': 'ਘ', 'ng': 'ਙ',
      'ch': 'ਚ', 'chh': 'ਛ', 'j': 'ਜ', 'jh': 'ਝ', 'ny': 'ਞ',
      'T': 'ਟ', 'Th': 'ਠ', 'D': 'ਡ', 'Dh': 'ਢ', 'N': 'ਣ',
      't': 'ਤ', 'th': 'ਥ', 'd': 'ਦ', 'dh': 'ਧ', 'n': 'ਨ',
      'p': 'ਪ', 'ph': 'ਫ', 'f': 'ਫ਼', 'b': 'ਬ', 'bh': 'ਭ', 'm': 'ਮ',
      'y': 'ਯ', 'r': 'ਰ', 'l': 'ਲ', 'L': 'ਲ਼', 'v': 'ਵ', 'w': 'ਵ',
      'sh': 'ਸ਼', 's': 'ਸ', 'h': 'ਹ',
      'z': 'ਜ਼', 'q': 'ਕ',
      'M': 'ਂ', 'H': 'ਃ'
    },
    modifiers: {
      'aa': 'ਾ', 'A': 'ਾ', 'i': 'ਿ', 'I': 'ੀ', 'ee': 'ੀ',
      'u': 'ੁ', 'U': 'ੂ', 'oo': 'ੂ', 'e': 'ੇ', 'E': 'ੈ', 'ai': 'ੈ',
      'o': 'ੋ', 'O': 'ੌ', 'au': 'ੌ', 'M': 'ਂ', 'H': 'ਃ'
    }
  },
  odia: {
    virama: '୍',
    vowelMap: {
      'a': 'ଅ', 'A': 'ଆ', 'aa': 'ଆ', 'i': 'ଇ', 'I': 'ଈ', 'ee': 'ଈ',
      'u': 'ଉ', 'U': 'ଊ', 'oo': 'ଊ', 'e': 'ଏ', 'E': 'ଐ', 'ai': 'ଐ',
      'o': 'ଓ', 'O': 'ଔ', 'au': 'ଔ', 'aM': 'ଅଂ', 'aH': 'ଅଃ'
    },
    consonantMap: {
      'k': 'କ', 'kh': 'ଖ', 'g': 'ଗ', 'gh': 'ଘ', 'ng': 'ଙ',
      'ch': 'ଚ', 'chh': 'ଛ', 'j': 'ଜ', 'jh': 'ଝ', 'ny': 'ଞ',
      'T': 'ଟ', 'Th': 'ଠ', 'D': 'ଡ', 'Dh': 'ଢ', 'N': 'ଣ',
      't': 'ତ', 'th': 'ଥ', 'd': 'ଦ', 'dh': 'ଧ', 'n': 'ନ',
      'p': 'ପ', 'ph': 'ଫ', 'f': 'ଫ', 'b': 'ବ', 'bh': 'ଭ', 'm': 'ମ',
      'y': 'ଯ', 'Y': 'ୟ', 'r': 'ର', 'l': 'ଲ', 'L': 'ଳ', 'v': 'ୱ', 'w': 'ୱ',
      'sh': 'ଶ', 'Sh': 'ଷ', 's': 'ସ', 'h': 'ହ',
      'x': 'କ୍ଷ', 'ksh': 'କ୍ଷ', 'gy': 'ଜ୍ଞ', 'q': 'କ', 'z': 'ଜ',
      'M': 'ଂ', 'H': 'ଃ'
    },
    modifiers: {
      'aa': 'ା', 'A': 'ା', 'i': 'ି', 'I': 'ୀ', 'ee': 'ୀ',
      'u': 'ୁ', 'U': 'ୂ', 'oo': 'ୂ', 'e': 'େ', 'E': 'ୈ', 'ai': 'ୈ',
      'o': 'ୋ', 'O': 'ୌ', 'au': 'ୌ', 'M': 'ଂ', 'H': 'ଃ'
    }
  },
  arabic: {
    vowelMap: {
      'a': 'ا', 'aa': 'آ', 'i': 'إ', 'I': 'ي', 'ee': 'ي',
      'u': 'أ', 'U': 'و', 'oo': 'و', 'e': 'ي', 'ai': 'ي',
      'o': 'و', 'O': 'و', 'au': 'و'
    },
    consonantMap: {
      'b': 'ب', 't': 'ت', 'th': 'ث', 'j': 'ج', 'H': 'ح', 'kh': 'خ',
      'd': 'د', 'dh': 'ذ', 'r': 'ر', 'z': 'ز', 's': 'س', 'sh': 'ش',
      'S': 'ص', 'D': 'ض', 'T': 'ط', 'Z': 'ظ', 'E': 'ع', 'gh': 'غ',
      'f': 'ف', 'q': 'ق', 'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن',
      'h': 'ه', 'w': 'و', 'y': 'ي', 'v': 'ف', 'p': 'ب', 'g': 'غ',
      'c': 'تش', 'ch': 'تش', "'": 'ء'
    },
    modifiers: {}
  },
  cyrillic: {
    vowelMap: {
      'a': 'а', 'e': 'е', 'i': 'и', 'o': 'о', 'u': 'у',
      'y': 'ы', 'yo': 'ё', 'ya': 'я', 'yu': 'ю', 'ye': 'е',
      'E': 'э', 'A': 'а', 'I': 'и', 'O': 'о', 'U': 'у'
    },
    consonantMap: {
      'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'zh': 'ж', 'z': 'з',
      'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'p': 'п', 'r': 'р',
      's': 'с', 't': 'т', 'f': 'ф', 'kh': 'х', 'h': 'х', 'ts': 'ц', 'c': 'ц',
      'ch': 'ч', 'sh': 'ш', 'shch': 'щ', 'Sh': 'щ', 'j': 'й', 'w': 'в',
      'q': 'к', "'": 'ь', '"': 'ъ'
    },
    modifiers: {}
  },
};

// Language to script mapping
const LANGUAGE_TO_SCRIPT: Record<string, string> = {
  'hindi': 'devanagari',
  'marathi': 'devanagari',
  'sanskrit': 'devanagari',
  'nepali': 'devanagari',
  'bhojpuri': 'devanagari',
  'rajasthani': 'devanagari',
  'maithili': 'devanagari',
  'telugu': 'telugu',
  'tamil': 'tamil',
  'kannada': 'kannada',
  'malayalam': 'malayalam',
  'bengali': 'bengali',
  'assamese': 'bengali',
  'gujarati': 'gujarati',
  'punjabi': 'punjabi',
  'odia': 'odia',
  'oriya': 'odia',
  'arabic': 'arabic',
  'urdu': 'arabic',
  'persian': 'arabic',
  'russian': 'cyrillic',
  'ukrainian': 'cyrillic',
  'bulgarian': 'cyrillic',
  'serbian': 'cyrillic',
};

/**
 * Get script block for a language
 */
function getScriptBlock(language: string): ScriptBlock | null {
  const normalized = normalizeLanguage(language);
  const scriptName = LANGUAGE_TO_SCRIPT[normalized];
  return scriptName ? SCRIPT_BLOCKS[scriptName] || null : null;
}

/**
 * Transliterate Latin text to native script
 */
export function transliterateToNative(text: string, targetLanguage: string): string {
  if (!text?.trim()) return text;
  
  // If target uses Latin script, return as-is
  if (isLatinScriptLanguage(targetLanguage)) return text;
  
  // If input is not Latin, return as-is
  if (!isLatinText(text)) return text;
  
  const scriptBlock = getScriptBlock(targetLanguage);
  if (!scriptBlock) return text;
  
  let result = '';
  let i = 0;
  
  while (i < text.length) {
    // Skip whitespace and punctuation
    if (/[\s\d\p{P}\p{S}]/u.test(text[i])) {
      result += text[i];
      i++;
      continue;
    }
    
    let matched = false;
    
    // Try longest match first (up to 4 chars)
    for (let len = 4; len >= 1; len--) {
      const chunk = text.substring(i, i + len);
      
      // Check consonant map
      if (scriptBlock.consonantMap[chunk]) {
        result += scriptBlock.consonantMap[chunk];
        
        // Check for following vowel modifier
        const nextLen = Math.min(2, text.length - i - len);
        for (let vLen = nextLen; vLen >= 1; vLen--) {
          const vowelChunk = text.substring(i + len, i + len + vLen);
          if (scriptBlock.modifiers[vowelChunk]) {
            result += scriptBlock.modifiers[vowelChunk];
            i += vLen;
            break;
          } else if (vowelChunk === 'a' && vLen === 1) {
            // Inherent 'a' vowel in Indic scripts - skip
            i += 1;
            break;
          }
        }
        
        i += len;
        matched = true;
        break;
      }
      
      // Check vowel map (standalone)
      if (scriptBlock.vowelMap[chunk]) {
        result += scriptBlock.vowelMap[chunk];
        i += len;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      result += text[i];
      i++;
    }
  }
  
  return result || text;
}

/**
 * Reverse transliterate (native to Latin)
 */
export function reverseTransliterate(text: string, sourceLanguage: string): string {
  if (!text?.trim()) return text;
  if (isLatinText(text)) return text;
  
  const scriptBlock = getScriptBlock(sourceLanguage);
  if (!scriptBlock) return text;
  
  // Build reverse maps
  const reverseConsonant: Record<string, string> = {};
  const reverseVowel: Record<string, string> = {};
  const reverseModifier: Record<string, string> = {};
  
  for (const [latin, native] of Object.entries(scriptBlock.consonantMap)) {
    if (!reverseConsonant[native]) reverseConsonant[native] = latin;
  }
  for (const [latin, native] of Object.entries(scriptBlock.vowelMap)) {
    if (!reverseVowel[native]) reverseVowel[native] = latin;
  }
  for (const [latin, native] of Object.entries(scriptBlock.modifiers)) {
    if (!reverseModifier[native]) reverseModifier[native] = latin;
  }
  
  let result = '';
  const chars = [...text];
  
  for (const char of chars) {
    if (reverseConsonant[char]) {
      result += reverseConsonant[char];
    } else if (reverseVowel[char]) {
      result += reverseVowel[char];
    } else if (reverseModifier[char]) {
      result += reverseModifier[char];
    } else if (char === scriptBlock.virama) {
      continue; // Skip virama
    } else {
      result += char;
    }
  }
  
  return result || text;
}

/**
 * Get live preview while typing (instant transliteration)
 */
export function getLivePreview(text: string, targetLanguage: string): string {
  if (!text?.trim()) return '';
  if (isLatinScriptLanguage(targetLanguage)) return text;
  if (!isLatinText(text)) return text;
  return transliterateToNative(text, targetLanguage);
}

/**
 * Check if transliteration is available for a language
 */
export function hasTransliteration(language: string): boolean {
  return getScriptBlock(language) !== null;
}

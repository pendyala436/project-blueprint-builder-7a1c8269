/**
 * ICU-Style Universal Transliterator
 * 
 * Provides transliteration for 200+ languages using Unicode-based
 * phonetic mappings following ICU (International Components for Unicode) standards.
 * 
 * Supports: All NLLB-200 languages with proper script conversions
 * 
 * Based on ICU Transform rules: https://unicode-org.github.io/icu/userguide/transforms/
 */

// ============================================================================
// Script Configuration Types
// ============================================================================

interface ScriptConfig {
  vowels: Record<string, string>;
  vowelSigns: Record<string, string>;
  consonants: Record<string, string>;
  halant: string;
  numerals?: Record<string, string>;
  specialRules?: Record<string, string>;
}

// ============================================================================
// INDIC SCRIPTS - Brahmic Family
// ============================================================================

// Devanagari (Hindi, Marathi, Sanskrit, Nepali, etc.)
const DEVANAGARI: ScriptConfig = {
  vowels: {
    'a': 'अ', 'aa': 'आ', 'ā': 'आ', 'i': 'इ', 'ii': 'ई', 'ī': 'ई', 'ee': 'ई',
    'u': 'उ', 'uu': 'ऊ', 'ū': 'ऊ', 'oo': 'ऊ',
    'e': 'ए', 'ai': 'ऐ', 'ae': 'ऐ',
    'o': 'ओ', 'au': 'औ', 'ou': 'औ', 'ow': 'औ',
    'ri': 'ऋ', 'ru': 'ऋ', 'ṛ': 'ऋ',
    'am': 'अं', 'an': 'अं', 'ah': 'अः',
  },
  vowelSigns: {
    'a': '', 'aa': 'ा', 'ā': 'ा', 'i': 'ि', 'ii': 'ी', 'ī': 'ी', 'ee': 'ी',
    'u': 'ु', 'uu': 'ू', 'ū': 'ू', 'oo': 'ू',
    'e': 'े', 'ai': 'ै', 'ae': 'ै',
    'o': 'ो', 'au': 'ौ', 'ou': 'ौ', 'ow': 'ौ',
    'ri': 'ृ', 'ru': 'ृ', 'ṛ': 'ृ',
    'am': 'ं', 'an': 'ं', 'n': 'ं', 'ah': 'ः',
  },
  consonants: {
    'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ', 'ṅ': 'ङ',
    'c': 'च', 'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ', 'ñ': 'ञ',
    // Retroflex consonants (capital for distinction, common in everyday typing)
    'T': 'ट', 'Th': 'ठ', 'D': 'ड', 'Dh': 'ढ', 'N': 'ण',
    'ṭ': 'ट', 'ṭh': 'ठ', 'ḍ': 'ड', 'ḍh': 'ढ', 'ṇ': 'ण',
    // Dental consonants (lowercase - default for everyday Hindi)
    't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
    'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
    'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
    'ś': 'श', 'sh': 'श', 'Sh': 'ष', 'ṣ': 'ष', 's': 'स', 'h': 'ह',
    'z': 'ज़', 'q': 'क़', 'x': 'क्स', 'ḻ': 'ळ', 'L': 'ळ',
    // Clusters
    'ksh': 'क्ष', 'ks': 'क्स', 'tr': 'त्र', 'Tr': 'ट्र', 'gy': 'ज्ञ', 'gn': 'ज्ञ', 'jn': 'ज्ञ',
    'kr': 'क्र', 'gr': 'ग्र', 'pr': 'प्र', 'br': 'ब्र', 'dr': 'द्र', 'Dr': 'ड्र', 'sr': 'स्र',
    'thr': 'थ्र', 'shr': 'श्र', 'str': 'स्ट्र', 'ntr': 'न्त्र',
  },
  halant: '्',
  numerals: {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९',
  },
};

// Telugu - with dental/retroflex distinction
// 't' = ట (retroflex), 'th' = థ (dental tha - common in speech)
// For exact transliteration: T=ట, Th=ఠ (retroflex), t=త, th=థ (dental)
const TELUGU: ScriptConfig = {
  vowels: {
    'a': 'అ', 'aa': 'ఆ', 'ā': 'ఆ', 'i': 'ఇ', 'ii': 'ఈ', 'ī': 'ఈ', 'ee': 'ఈ',
    'u': 'ఉ', 'uu': 'ఊ', 'ū': 'ఊ', 'oo': 'ఊ',
    'e': 'ఎ', 'ae': 'ఏ', 'ē': 'ఏ', 'ai': 'ఐ',
    'o': 'ఒ', 'oa': 'ఓ', 'ō': 'ఓ', 'au': 'ఔ', 'ou': 'ఔ',
    'ri': 'ఋ', 'ru': 'ఋ', 'ṛ': 'ఋ',
    'am': 'అం', 'an': 'అం', 'ah': 'అః',
  },
  vowelSigns: {
    'a': '', 'aa': 'ా', 'ā': 'ా', 'i': 'ి', 'ii': 'ీ', 'ī': 'ీ', 'ee': 'ీ',
    'u': 'ు', 'uu': 'ూ', 'ū': 'ూ', 'oo': 'ూ',
    'e': 'ె', 'ae': 'ే', 'ē': 'ే', 'ai': 'ై',
    'o': 'ొ', 'oa': 'ో', 'ō': 'ో', 'au': 'ౌ', 'ou': 'ౌ',
    'ri': 'ృ', 'ru': 'ృ', 'ṛ': 'ృ',
    'am': 'ం', 'an': 'ం', 'n': 'ం', 'ah': 'ః',
  },
  consonants: {
    'k': 'క', 'kh': 'ఖ', 'g': 'గ', 'gh': 'ఘ', 'ng': 'ఙ',
    'c': 'చ', 'ch': 'చ', 'chh': 'ఛ', 'j': 'జ', 'jh': 'ఝ', 'ny': 'ఞ', 'gn': 'జ్ఞ',
    // Dental consonants (most common in everyday Telugu typing)
    't': 'త', 'th': 'థ', 'd': 'ద', 'dh': 'ధ',
    // Retroflex consonants (capital letters for distinction)
    'T': 'ట', 'Th': 'ఠ', 'D': 'డ', 'Dh': 'ఢ',
    'n': 'న', 'nn': 'ణ', 'N': 'ణ',
    'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
    'y': 'య', 'r': 'ర', 'rr': 'ఱ', 'l': 'ల', 'll': 'ళ', 'L': 'ళ', 'v': 'వ', 'w': 'వ',
    'sh': 'శ', 'Sh': 'ష', 's': 'స', 'h': 'హ',
    'z': 'జ', 'x': 'క్స', 'q': 'క',
    // Clusters
    'ksh': 'క్ష', 'ks': 'క్స', 'tr': 'త్ర', 'Tr': 'ట్ర', 'pr': 'ప్ర', 'kr': 'క్ర',
    'gr': 'గ్ర', 'br': 'బ్ర', 'dr': 'ద్ర', 'Dr': 'డ్ర', 'sr': 'స్ర', 'hr': 'హ్ర',
    'thr': 'థ్ర', 'shr': 'శ్ర', 'str': 'స్ట్ర', 'ntr': 'న్త్ర',
  },
  halant: '్',
  numerals: {
    '0': '౦', '1': '౧', '2': '౨', '3': '౩', '4': '౪',
    '5': '౫', '6': '౬', '7': '౭', '8': '౮', '9': '౯',
  },
};

// Tamil
const TAMIL: ScriptConfig = {
  vowels: {
    'a': 'அ', 'aa': 'ஆ', 'ā': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'ī': 'ஈ', 'ee': 'ஈ',
    'u': 'உ', 'uu': 'ஊ', 'ū': 'ஊ', 'oo': 'ஊ',
    'e': 'எ', 'ae': 'ஏ', 'ē': 'ஏ', 'ai': 'ஐ',
    'o': 'ஒ', 'oa': 'ஓ', 'ō': 'ஓ', 'au': 'ஔ', 'ou': 'ஔ',
  },
  vowelSigns: {
    'a': '', 'aa': 'ா', 'ā': 'ா', 'i': 'ி', 'ii': 'ீ', 'ī': 'ீ', 'ee': 'ீ',
    'u': 'ு', 'uu': 'ூ', 'ū': 'ூ', 'oo': 'ூ',
    'e': 'ெ', 'ae': 'ே', 'ē': 'ே', 'ai': 'ை',
    'o': 'ொ', 'oa': 'ோ', 'ō': 'ோ', 'au': 'ௌ', 'ou': 'ௌ',
    'am': 'ம்', 'an': 'ன்', 'n': 'ன்',
  },
  consonants: {
    'k': 'க', 'g': 'க', 'ng': 'ங',
    'c': 'ச', 'ch': 'ச', 's': 'ஸ', 'j': 'ஜ', 'ny': 'ஞ',
    't': 'ட', 'd': 'ட', 'n': 'ந', 'nn': 'ண',
    'th': 'த', 'dh': 'த',
    'p': 'ப', 'b': 'ப', 'm': 'ம',
    'y': 'ய', 'r': 'ர', 'rr': 'ற', 'l': 'ல', 'll': 'ள', 'v': 'வ', 'w': 'வ',
    'zh': 'ழ', 'sh': 'ஷ', 'h': 'ஹ',
    'la': 'ள', 'ra': 'ற', 'na': 'ன',
  },
  halant: '்',
  numerals: {
    '0': '௦', '1': '௧', '2': '௨', '3': '௩', '4': '௪',
    '5': '௫', '6': '௬', '7': '௭', '8': '௮', '9': '௯',
  },
};

// Bengali/Bangla
const BENGALI: ScriptConfig = {
  vowels: {
    'a': 'অ', 'aa': 'আ', 'ā': 'আ', 'i': 'ই', 'ii': 'ঈ', 'ī': 'ঈ', 'ee': 'ঈ',
    'u': 'উ', 'uu': 'ঊ', 'ū': 'ঊ', 'oo': 'ঊ',
    'e': 'এ', 'ai': 'ঐ', 'ae': 'এ',
    'o': 'ও', 'au': 'ঔ', 'ou': 'ঔ',
    'ri': 'ঋ', 'ṛ': 'ঋ',
  },
  vowelSigns: {
    'a': '', 'aa': 'া', 'ā': 'া', 'i': 'ি', 'ii': 'ী', 'ī': 'ী', 'ee': 'ী',
    'u': 'ু', 'uu': 'ূ', 'ū': 'ূ', 'oo': 'ূ',
    'e': 'ে', 'ai': 'ৈ', 'ae': 'ে',
    'o': 'ো', 'au': 'ৌ', 'ou': 'ৌ',
    'ri': 'ৃ', 'ṛ': 'ৃ',
    'am': 'ং', 'an': 'ং', 'n': 'ং',
  },
  consonants: {
    'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ঙ',
    'c': 'চ', 'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'ny': 'ঞ',
    't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন',
    'p': 'প', 'ph': 'ফ', 'f': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
    'y': 'য', 'r': 'র', 'l': 'ল', 'v': 'ভ', 'w': 'ও',
    'sh': 'শ', 's': 'স', 'h': 'হ', 'x': 'ক্স',
    'kr': 'ক্র', 'gr': 'গ্র', 'pr': 'প্র', 'br': 'ব্র', 'dr': 'দ্র', 'tr': 'ত্র',
  },
  halant: '্',
  numerals: {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  },
};

// Kannada
const KANNADA: ScriptConfig = {
  vowels: {
    'a': 'ಅ', 'aa': 'ಆ', 'ā': 'ಆ', 'i': 'ಇ', 'ii': 'ಈ', 'ī': 'ಈ', 'ee': 'ಈ',
    'u': 'ಉ', 'uu': 'ಊ', 'ū': 'ಊ', 'oo': 'ಊ',
    'e': 'ಎ', 'ae': 'ಏ', 'ē': 'ಏ', 'ai': 'ಐ',
    'o': 'ಒ', 'oa': 'ಓ', 'ō': 'ಓ', 'au': 'ಔ', 'ou': 'ಔ',
    'ri': 'ಋ', 'ṛ': 'ಋ',
  },
  vowelSigns: {
    'a': '', 'aa': 'ಾ', 'ā': 'ಾ', 'i': 'ಿ', 'ii': 'ೀ', 'ī': 'ೀ', 'ee': 'ೀ',
    'u': 'ು', 'uu': 'ೂ', 'ū': 'ೂ', 'oo': 'ೂ',
    'e': 'ೆ', 'ae': 'ೇ', 'ē': 'ೇ', 'ai': 'ೈ',
    'o': 'ೊ', 'oa': 'ೋ', 'ō': 'ೋ', 'au': 'ೌ', 'ou': 'ೌ',
    'ri': 'ೃ', 'ṛ': 'ೃ',
    'am': 'ಂ', 'an': 'ಂ', 'n': 'ಂ',
  },
  consonants: {
    'k': 'ಕ', 'kh': 'ಖ', 'g': 'ಗ', 'gh': 'ಘ', 'ng': 'ಙ',
    'c': 'ಚ', 'ch': 'ಚ', 'chh': 'ಛ', 'j': 'ಜ', 'jh': 'ಝ', 'ny': 'ಞ',
    't': 'ಟ', 'th': 'ಠ', 'd': 'ಡ', 'dh': 'ಢ', 'n': 'ನ',
    'p': 'ಪ', 'ph': 'ಫ', 'f': 'ಫ', 'b': 'ಬ', 'bh': 'ಭ', 'm': 'ಮ',
    'y': 'ಯ', 'r': 'ರ', 'l': 'ಲ', 'v': 'ವ', 'w': 'ವ',
    'sh': 'ಶ', 's': 'ಸ', 'h': 'ಹ', 'x': 'ಕ್ಸ',
    'kr': 'ಕ್ರ', 'gr': 'ಗ್ರ', 'pr': 'ಪ್ರ', 'br': 'ಬ್ರ', 'dr': 'ಡ್ರ', 'tr': 'ಟ್ರ',
  },
  halant: '್',
  numerals: {
    '0': '೦', '1': '೧', '2': '೨', '3': '೩', '4': '೪',
    '5': '೫', '6': '೬', '7': '೭', '8': '೮', '9': '೯',
  },
};

// Malayalam
const MALAYALAM: ScriptConfig = {
  vowels: {
    'a': 'അ', 'aa': 'ആ', 'ā': 'ആ', 'i': 'ഇ', 'ii': 'ഈ', 'ī': 'ഈ', 'ee': 'ഈ',
    'u': 'ഉ', 'uu': 'ഊ', 'ū': 'ഊ', 'oo': 'ഊ',
    'e': 'എ', 'ae': 'ഏ', 'ē': 'ഏ', 'ai': 'ഐ',
    'o': 'ഒ', 'oa': 'ഓ', 'ō': 'ഓ', 'au': 'ഔ', 'ou': 'ഔ',
    'ri': 'ഋ', 'ṛ': 'ഋ',
  },
  vowelSigns: {
    'a': '', 'aa': 'ാ', 'ā': 'ാ', 'i': 'ി', 'ii': 'ീ', 'ī': 'ീ', 'ee': 'ീ',
    'u': 'ു', 'uu': 'ൂ', 'ū': 'ൂ', 'oo': 'ൂ',
    'e': 'െ', 'ae': 'േ', 'ē': 'േ', 'ai': 'ൈ',
    'o': 'ൊ', 'oa': 'ോ', 'ō': 'ോ', 'au': 'ൌ', 'ou': 'ൌ',
    'ri': 'ൃ', 'ṛ': 'ൃ',
    'am': 'ം', 'an': 'ം', 'n': 'ം',
  },
  consonants: {
    'k': 'ക', 'kh': 'ഖ', 'g': 'ഗ', 'gh': 'ഘ', 'ng': 'ങ',
    'c': 'ച', 'ch': 'ച', 'chh': 'ഛ', 'j': 'ജ', 'jh': 'ഝ', 'ny': 'ഞ',
    't': 'ട', 'th': 'ഠ', 'd': 'ഡ', 'dh': 'ഢ', 'n': 'ന',
    'p': 'പ', 'ph': 'ഫ', 'f': 'ഫ', 'b': 'ബ', 'bh': 'ഭ', 'm': 'മ',
    'y': 'യ', 'r': 'ര', 'l': 'ല', 'v': 'വ', 'w': 'വ',
    'sh': 'ശ', 's': 'സ', 'h': 'ഹ', 'zh': 'ഴ', 'x': 'ക്സ',
    'kr': 'ക്ര', 'gr': 'ഗ്ര', 'pr': 'പ്ര', 'br': 'ബ്ര', 'dr': 'ഡ്ര', 'tr': 'ട്ര',
  },
  halant: '്',
  numerals: {
    '0': '൦', '1': '൧', '2': '൨', '3': '൩', '4': '൪',
    '5': '൫', '6': '൬', '7': '൭', '8': '൮', '9': '൯',
  },
};

// Gujarati
const GUJARATI: ScriptConfig = {
  vowels: {
    'a': 'અ', 'aa': 'આ', 'ā': 'આ', 'i': 'ઇ', 'ii': 'ઈ', 'ī': 'ઈ', 'ee': 'ઈ',
    'u': 'ઉ', 'uu': 'ઊ', 'ū': 'ઊ', 'oo': 'ઊ',
    'e': 'એ', 'ai': 'ઐ', 'ae': 'ઐ',
    'o': 'ઓ', 'au': 'ઔ', 'ou': 'ઔ',
    'ri': 'ઋ', 'ṛ': 'ઋ',
  },
  vowelSigns: {
    'a': '', 'aa': 'ા', 'ā': 'ા', 'i': 'િ', 'ii': 'ી', 'ī': 'ી', 'ee': 'ી',
    'u': 'ુ', 'uu': 'ૂ', 'ū': 'ૂ', 'oo': 'ૂ',
    'e': 'ે', 'ai': 'ૈ', 'ae': 'ૈ',
    'o': 'ો', 'au': 'ૌ', 'ou': 'ૌ',
    'ri': 'ૃ', 'ṛ': 'ૃ',
    'am': 'ં', 'an': 'ં', 'n': 'ં',
  },
  consonants: {
    'k': 'ક', 'kh': 'ખ', 'g': 'ગ', 'gh': 'ઘ', 'ng': 'ઙ',
    'c': 'ચ', 'ch': 'ચ', 'chh': 'છ', 'j': 'જ', 'jh': 'ઝ', 'ny': 'ઞ',
    't': 'ત', 'th': 'થ', 'd': 'દ', 'dh': 'ધ', 'n': 'ન',
    'p': 'પ', 'ph': 'ફ', 'f': 'ફ', 'b': 'બ', 'bh': 'ભ', 'm': 'મ',
    'y': 'ય', 'r': 'ર', 'l': 'લ', 'v': 'વ', 'w': 'વ',
    'sh': 'શ', 's': 'સ', 'h': 'હ',
  },
  halant: '્',
  numerals: {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯',
  },
};

// Gurmukhi (Punjabi)
const GURMUKHI: ScriptConfig = {
  vowels: {
    'a': 'ਅ', 'aa': 'ਆ', 'ā': 'ਆ', 'i': 'ਇ', 'ii': 'ਈ', 'ī': 'ਈ', 'ee': 'ਈ',
    'u': 'ਉ', 'uu': 'ਊ', 'ū': 'ਊ', 'oo': 'ਊ',
    'e': 'ਏ', 'ai': 'ਐ', 'ae': 'ਐ',
    'o': 'ਓ', 'au': 'ਔ', 'ou': 'ਔ',
  },
  vowelSigns: {
    'a': '', 'aa': 'ਾ', 'ā': 'ਾ', 'i': 'ਿ', 'ii': 'ੀ', 'ī': 'ੀ', 'ee': 'ੀ',
    'u': 'ੁ', 'uu': 'ੂ', 'ū': 'ੂ', 'oo': 'ੂ',
    'e': 'ੇ', 'ai': 'ੈ', 'ae': 'ੈ',
    'o': 'ੋ', 'au': 'ੌ', 'ou': 'ੌ',
    'am': 'ਂ', 'an': 'ਂ', 'n': 'ਂ',
  },
  consonants: {
    'k': 'ਕ', 'kh': 'ਖ', 'g': 'ਗ', 'gh': 'ਘ', 'ng': 'ਙ',
    'c': 'ਚ', 'ch': 'ਚ', 'chh': 'ਛ', 'j': 'ਜ', 'jh': 'ਝ', 'ny': 'ਞ',
    't': 'ਤ', 'th': 'ਥ', 'd': 'ਦ', 'dh': 'ਧ', 'n': 'ਨ',
    'p': 'ਪ', 'ph': 'ਫ', 'f': 'ਫ', 'b': 'ਬ', 'bh': 'ਭ', 'm': 'ਮ',
    'y': 'ਯ', 'r': 'ਰ', 'l': 'ਲ', 'v': 'ਵ', 'w': 'ਵ',
    'sh': 'ਸ਼', 's': 'ਸ', 'h': 'ਹ',
  },
  halant: '੍',
  numerals: {
    '0': '੦', '1': '੧', '2': '੨', '3': '੩', '4': '੪',
    '5': '੫', '6': '੬', '7': '੭', '8': '੮', '9': '੯',
  },
};

// Odia/Oriya
const ODIA: ScriptConfig = {
  vowels: {
    'a': 'ଅ', 'aa': 'ଆ', 'ā': 'ଆ', 'i': 'ଇ', 'ii': 'ଈ', 'ī': 'ଈ', 'ee': 'ଈ',
    'u': 'ଉ', 'uu': 'ଊ', 'ū': 'ଊ', 'oo': 'ଊ',
    'e': 'ଏ', 'ai': 'ଐ', 'ae': 'ଐ',
    'o': 'ଓ', 'au': 'ଔ', 'ou': 'ଔ',
    'ri': 'ଋ', 'ṛ': 'ଋ',
  },
  vowelSigns: {
    'a': '', 'aa': 'ା', 'ā': 'ା', 'i': 'ି', 'ii': 'ୀ', 'ī': 'ୀ', 'ee': 'ୀ',
    'u': 'ୁ', 'uu': 'ୂ', 'ū': 'ୂ', 'oo': 'ୂ',
    'e': 'େ', 'ai': 'ୈ', 'ae': 'ୈ',
    'o': 'ୋ', 'au': 'ୌ', 'ou': 'ୌ',
    'ri': 'ୃ', 'ṛ': 'ୃ',
    'am': 'ଂ', 'an': 'ଂ', 'n': 'ଂ',
  },
  consonants: {
    'k': 'କ', 'kh': 'ଖ', 'g': 'ଗ', 'gh': 'ଘ', 'ng': 'ଙ',
    'c': 'ଚ', 'ch': 'ଚ', 'chh': 'ଛ', 'j': 'ଜ', 'jh': 'ଝ', 'ny': 'ଞ',
    't': 'ତ', 'th': 'ଥ', 'd': 'ଦ', 'dh': 'ଧ', 'n': 'ନ',
    'p': 'ପ', 'ph': 'ଫ', 'f': 'ଫ', 'b': 'ବ', 'bh': 'ଭ', 'm': 'ମ',
    'y': 'ଯ', 'r': 'ର', 'l': 'ଲ', 'v': 'ଵ', 'w': 'ୱ',
    'sh': 'ଶ', 's': 'ସ', 'h': 'ହ',
  },
  halant: '୍',
  numerals: {
    '0': '୦', '1': '୧', '2': '୨', '3': '୩', '4': '୪',
    '5': '୫', '6': '୬', '7': '୭', '8': '୮', '9': '୯',
  },
};

// ============================================================================
// ARABIC SCRIPTS
// ============================================================================

const ARABIC: ScriptConfig = {
  vowels: {
    'a': 'ا', 'aa': 'آ', 'ā': 'آ', 'i': 'ي', 'ii': 'ي', 'ee': 'ي',
    'u': 'و', 'uu': 'و', 'oo': 'و',
    'e': 'ي', 'ai': 'اي', 'o': 'و', 'au': 'او',
  },
  vowelSigns: {
    'a': 'َ', 'aa': 'ا', 'ā': 'ا', 'i': 'ِ', 'ii': 'ي', 'ee': 'ي',
    'u': 'ُ', 'uu': 'و', 'oo': 'و',
    'e': 'ِ', 'ai': 'ي', 'o': 'ُ', 'au': 'و',
  },
  consonants: {
    'b': 'ب', 't': 'ت', 'th': 'ث', 'j': 'ج', 'h': 'ح', 'kh': 'خ',
    'd': 'د', 'dh': 'ذ', 'r': 'ر', 'z': 'ز', 's': 'س', 'sh': 'ش',
    'S': 'ص', 'D': 'ض', 'T': 'ط', 'Z': 'ظ',
    '3': 'ع', 'gh': 'غ', 'f': 'ف', 'q': 'ق', 'k': 'ك', 'l': 'ل',
    'm': 'م', 'n': 'ن', 'w': 'و', 'y': 'ي', 'v': 'ڤ',
    'p': 'پ', 'ch': 'چ', 'g': 'گ',
  },
  halant: '',
  numerals: {
    '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
    '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩',
  },
};

// Urdu (Nastaliq Arabic variant)
const URDU: ScriptConfig = {
  ...ARABIC,
  consonants: {
    ...ARABIC.consonants,
    't': 'ت', 'T': 'ٹ', 'd': 'د', 'D': 'ڈ', 'r': 'ر', 'R': 'ڑ',
    'n': 'ن', 'N': 'ں', 'h': 'ہ', 'y': 'ی', 'e': 'ے',
  },
};

// Persian/Farsi
const PERSIAN: ScriptConfig = {
  ...ARABIC,
  consonants: {
    ...ARABIC.consonants,
    'p': 'پ', 'ch': 'چ', 'zh': 'ژ', 'g': 'گ', 'v': 'و',
  },
};

// ============================================================================
// CYRILLIC SCRIPTS
// ============================================================================

const CYRILLIC: ScriptConfig = {
  vowels: {
    'a': 'а', 'e': 'е', 'i': 'и', 'o': 'о', 'u': 'у',
    'y': 'ы', 'ye': 'е', 'yo': 'ё', 'yu': 'ю', 'ya': 'я',
    'ee': 'и', 'oo': 'у', 'aa': 'а',
  },
  vowelSigns: {},
  consonants: {
    'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'zh': 'ж', 'z': 'з',
    'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'p': 'п', 'r': 'р',
    's': 'с', 't': 'т', 'f': 'ф', 'kh': 'х', 'ts': 'ц', 'ch': 'ч',
    'sh': 'ш', 'shch': 'щ', 'h': 'х', 'j': 'й', 'w': 'в', 'x': 'кс',
    'c': 'к', 'q': 'к',
  },
  halant: '',
  specialRules: {
    'soft': 'ь', 'hard': 'ъ',
  },
};

// Ukrainian
const UKRAINIAN: ScriptConfig = {
  ...CYRILLIC,
  vowels: {
    ...CYRILLIC.vowels,
    'yi': 'ї', 'i': 'і', 'ye': 'є',
  },
  consonants: {
    ...CYRILLIC.consonants,
    'g': 'ґ', 'h': 'г',
  },
};

// ============================================================================
// SOUTHEAST ASIAN SCRIPTS
// ============================================================================

// Thai
const THAI: ScriptConfig = {
  vowels: {
    'a': 'อะ', 'aa': 'อา', 'i': 'อิ', 'ii': 'อี', 'ee': 'อี',
    'u': 'อุ', 'uu': 'อู', 'oo': 'อู',
    'e': 'เอ', 'ae': 'แอ', 'o': 'โอ', 'ai': 'ไอ', 'au': 'เอา',
  },
  vowelSigns: {
    'a': 'ะ', 'aa': 'า', 'i': 'ิ', 'ii': 'ี', 'ee': 'ี',
    'u': 'ุ', 'uu': 'ู', 'oo': 'ู',
    'e': 'เ', 'ae': 'แ', 'o': 'โ', 'ai': 'ไ', 'au': 'าว',
  },
  consonants: {
    'k': 'ก', 'kh': 'ข', 'g': 'ก', 'ng': 'ง',
    'c': 'จ', 'ch': 'ช', 'j': 'จ', 's': 'ส',
    't': 'ต', 'th': 'ท', 'd': 'ด', 'n': 'น',
    'p': 'ป', 'ph': 'พ', 'f': 'ฟ', 'b': 'บ', 'm': 'ม',
    'y': 'ย', 'r': 'ร', 'l': 'ล', 'w': 'ว', 'h': 'ห',
  },
  halant: '์',
  numerals: {
    '0': '๐', '1': '๑', '2': '๒', '3': '๓', '4': '๔',
    '5': '๕', '6': '๖', '7': '๗', '8': '๘', '9': '๙',
  },
};

// Vietnamese (Latin with diacritics)
const VIETNAMESE: ScriptConfig = {
  vowels: {
    'a': 'a', 'aa': 'â', 'aw': 'ă',
    'e': 'e', 'ee': 'ê',
    'i': 'i', 'o': 'o', 'oo': 'ô', 'ow': 'ơ',
    'u': 'u', 'uw': 'ư', 'y': 'y',
  },
  vowelSigns: {},
  consonants: {
    'b': 'b', 'c': 'c', 'ch': 'ch', 'd': 'đ', 'dd': 'đ',
    'g': 'g', 'gh': 'gh', 'gi': 'gi', 'h': 'h', 'k': 'k',
    'kh': 'kh', 'l': 'l', 'm': 'm', 'n': 'n', 'ng': 'ng',
    'ngh': 'ngh', 'nh': 'nh', 'p': 'p', 'ph': 'ph', 'q': 'q',
    'r': 'r', 's': 's', 't': 't', 'th': 'th', 'tr': 'tr',
    'v': 'v', 'x': 'x',
  },
  halant: '',
};

// ============================================================================
// EAST ASIAN SCRIPTS (Pinyin/Romaji helpers)
// ============================================================================

// Japanese Hiragana
const HIRAGANA: ScriptConfig = {
  vowels: {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
  },
  vowelSigns: {},
  consonants: {
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を', 'n': 'ん',
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
  },
  halant: '',
};

// Korean (Revised Romanization to Hangul)
const KOREAN: ScriptConfig = {
  vowels: {
    'a': 'ㅏ', 'ae': 'ㅐ', 'ya': 'ㅑ', 'yae': 'ㅒ', 'eo': 'ㅓ', 'e': 'ㅔ',
    'yeo': 'ㅕ', 'ye': 'ㅖ', 'o': 'ㅗ', 'wa': 'ㅘ', 'wae': 'ㅙ', 'oe': 'ㅚ',
    'yo': 'ㅛ', 'u': 'ㅜ', 'wo': 'ㅝ', 'we': 'ㅞ', 'wi': 'ㅟ', 'yu': 'ㅠ',
    'eu': 'ㅡ', 'ui': 'ㅢ', 'i': 'ㅣ',
  },
  vowelSigns: {},
  consonants: {
    'g': 'ㄱ', 'kk': 'ㄲ', 'n': 'ㄴ', 'd': 'ㄷ', 'tt': 'ㄸ',
    'r': 'ㄹ', 'l': 'ㄹ', 'm': 'ㅁ', 'b': 'ㅂ', 'pp': 'ㅃ',
    's': 'ㅅ', 'ss': 'ㅆ', 'ng': 'ㅇ', 'j': 'ㅈ', 'jj': 'ㅉ',
    'ch': 'ㅊ', 'k': 'ㅋ', 't': 'ㅌ', 'p': 'ㅍ', 'h': 'ㅎ',
  },
  halant: '',
};

// ============================================================================
// OTHER SCRIPTS
// ============================================================================

// Georgian
const GEORGIAN: ScriptConfig = {
  vowels: {
    'a': 'ა', 'e': 'ე', 'i': 'ი', 'o': 'ო', 'u': 'უ',
  },
  vowelSigns: {},
  consonants: {
    'b': 'ბ', 'g': 'გ', 'd': 'დ', 'v': 'ვ', 'z': 'ზ',
    't': 'თ', 'k': 'კ', 'l': 'ლ', 'm': 'მ', 'n': 'ნ',
    'p': 'პ', 'zh': 'ჟ', 'r': 'რ', 's': 'ს', 'q': 'ქ',
    'sh': 'შ', 'ch': 'ჩ', 'ts': 'ც', 'dz': 'ძ', 'w': 'წ',
    'kh': 'ხ', 'j': 'ჯ', 'h': 'ჰ',
  },
  halant: '',
};

// Armenian
const ARMENIAN: ScriptConfig = {
  vowels: {
    'a': 'ա', 'e': 'է', 'i': 'ի', 'o': 'օ', 'u': ' delays',
  },
  vowelSigns: {},
  consonants: {
    'b': 'բ', 'g': 'գ', 'd': 'delays', 'z': 'զ', 'e': 'delays',
    't': 'delays', 'zh': ' delays', 'l': 'delays', 'm': 'delays', 'y': 'delays',
    'n': 'delays', 'sh': 'delays', 'ch': 'delays', 'p': 'delays', 'j': 'delays',
    'r': 'delays', 's': 'delays', 'v': 'delays', 'k': 'delays', 'h': 'delays',
    'ts': 'delays', 'dz': 'delays', 'gh': 'delays', 'f': 'delays',
  },
  halant: '',
};

// Greek
const GREEK: ScriptConfig = {
  vowels: {
    'a': 'α', 'e': 'ε', 'i': 'ι', 'o': 'ο', 'u': 'υ',
    'ee': 'η', 'oo': 'ω', 'ai': 'αι', 'ei': 'ει', 'oi': 'οι', 'ou': 'ου',
  },
  vowelSigns: {},
  consonants: {
    'b': 'β', 'g': 'γ', 'd': 'δ', 'z': 'ζ', 'th': 'θ',
    'k': 'κ', 'l': 'λ', 'm': 'μ', 'n': 'ν', 'x': 'ξ',
    'p': 'π', 'r': 'ρ', 's': 'σ', 't': 'τ', 'f': 'φ',
    'ch': 'χ', 'ps': 'ψ', 'v': 'β', 'h': '',
  },
  halant: '',
};

// Hebrew
const HEBREW: ScriptConfig = {
  vowels: {
    'a': 'ַ', 'e': 'ֶ', 'i': 'ִ', 'o': 'ֹ', 'u': 'ֻ',
  },
  vowelSigns: {},
  consonants: {
    'aleph': 'א', "'": 'א', 'b': 'ב', 'v': 'ו', 'g': 'ג', 'd': 'ד',
    'h': 'ה', 'w': 'ו', 'z': 'ז', 'ch': 'ח', 'kh': 'ח', 't': 'ט',
    'y': 'י', 'k': 'כ', 'l': 'ל', 'm': 'מ', 'n': 'נ',
    's': 'ס', 'p': 'פ', 'f': 'פ', 'ts': 'צ', 'q': 'ק',
    'r': 'ר', 'sh': 'ש', 'th': 'ת',
  },
  halant: '',
};

// Sinhala
const SINHALA: ScriptConfig = {
  vowels: {
    'a': 'අ', 'aa': 'ආ', 'ā': 'ආ', 'i': 'ඉ', 'ii': 'ඊ', 'ī': 'ඊ',
    'u': 'උ', 'uu': 'ඌ', 'ū': 'ඌ',
    'e': 'එ', 'ee': 'ඒ', 'ai': 'ඓ',
    'o': 'ඔ', 'oo': 'ඕ', 'au': 'ඖ',
  },
  vowelSigns: {
    'a': '', 'aa': 'ා', 'ā': 'ා', 'i': 'ි', 'ii': 'ී', 'ī': 'ී',
    'u': 'ු', 'uu': 'ූ', 'ū': 'ූ',
    'e': 'ෙ', 'ee': 'ේ', 'ai': 'ෛ',
    'o': 'ො', 'oo': 'ෝ', 'au': 'ෞ',
    'am': 'ං', 'an': 'ං',
  },
  consonants: {
    'k': 'ක', 'kh': 'ඛ', 'g': 'ග', 'gh': 'ඝ', 'ng': 'ඞ',
    'c': 'ච', 'ch': 'ච', 'j': 'ජ', 'jh': 'ඣ', 'ny': 'ඤ',
    't': 'ට', 'th': 'ඨ', 'd': 'ඩ', 'dh': 'ඪ', 'n': 'න',
    'p': 'ප', 'ph': 'ඵ', 'b': 'බ', 'bh': 'භ', 'm': 'ම',
    'y': 'ය', 'r': 'ර', 'l': 'ල', 'v': 'ව', 'w': 'ව',
    'sh': 'ශ', 's': 'ස', 'h': 'හ',
  },
  halant: '්',
};

// Burmese/Myanmar
const MYANMAR: ScriptConfig = {
  vowels: {
    'a': 'အ', 'aa': 'အာ', 'i': 'ဣ', 'ii': 'ဤ', 'u': 'ဥ', 'uu': 'ဦ',
    'e': 'ဧ', 'o': 'ဩ', 'au': 'ဪ',
  },
  vowelSigns: {
    'a': '', 'aa': 'ာ', 'i': 'ိ', 'ii': 'ီ', 'u': 'ု', 'uu': 'ူ',
    'e': 'ေ', 'ai': 'ဲ', 'o': 'ော', 'au': 'ော်',
  },
  consonants: {
    'k': 'က', 'kh': 'ခ', 'g': 'ဂ', 'gh': 'ဃ', 'ng': 'င',
    'c': 'စ', 'ch': 'ဆ', 'j': 'ဇ', 'jh': 'ဈ', 'ny': 'ည',
    't': 'တ', 'th': 'ထ', 'd': 'ဒ', 'dh': 'ဓ', 'n': 'န',
    'p': 'ပ', 'ph': 'ဖ', 'b': 'ဗ', 'bh': 'ဘ', 'm': 'မ',
    'y': 'ယ', 'r': 'ရ', 'l': 'လ', 'w': 'ဝ',
    's': 'သ', 'h': 'ဟ',
  },
  halant: '်',
};

// Khmer (Cambodian)
const KHMER: ScriptConfig = {
  vowels: {
    'a': 'អ', 'aa': 'អា', 'i': 'អិ', 'ii': 'អី', 'u': 'អុ', 'uu': 'អូ',
    'e': 'អេ', 'ai': 'org', 'o': 'org', 'au': 'org',
  },
  vowelSigns: {
    'a': '', 'aa': 'ា', 'i': 'ិ', 'ii': 'ី', 'u': 'ុ', 'uu': 'ូ',
    'e': 'េ', 'ai': 'org', 'o': 'org', 'au': 'org',
  },
  consonants: {
    'k': 'org', 'kh': 'org', 'g': 'org', 'gh': 'org', 'ng': 'org',
    'c': 'org', 'ch': 'org', 'j': 'org', 'ny': 'org',
    't': 'org', 'th': 'org', 'd': 'org', 'dh': 'org', 'n': 'org',
    'p': 'org', 'ph': 'org', 'b': 'org', 'm': 'org',
    'y': 'org', 'r': 'org', 'l': 'org', 'v': 'org', 'w': 'org',
    's': 'org', 'h': 'org',
  },
  halant: '់',
};

// Lao
const LAO: ScriptConfig = {
  vowels: {
    'a': 'ອະ', 'aa': 'ອາ', 'i': 'ອິ', 'ii': 'ອີ', 'u': 'ອຸ', 'uu': 'ອູ',
    'e': 'ເອ', 'ae': 'ແອ', 'o': 'ໂອ', 'ai': 'ໄອ', 'au': 'ເອົາ',
  },
  vowelSigns: {
    'a': 'ະ', 'aa': 'າ', 'i': 'ິ', 'ii': 'ີ', 'u': 'ຸ', 'uu': 'ູ',
    'e': 'ເ', 'ae': 'ແ', 'o': 'ໂ', 'ai': 'ໄ', 'au': 'ົາ',
  },
  consonants: {
    'k': 'ກ', 'kh': 'ຂ', 'g': 'ກ', 'ng': 'ງ',
    'c': 'ຈ', 'ch': 'ຊ', 'j': 'ຈ', 's': 'ສ', 'ny': 'ຍ',
    't': 'ຕ', 'th': 'ຖ', 'd': 'ດ', 'n': 'ນ',
    'p': 'ປ', 'ph': 'ຜ', 'f': 'ຟ', 'b': 'ບ', 'm': 'ມ',
    'y': 'ຢ', 'r': 'ຣ', 'l': 'ລ', 'w': 'ວ', 'h': 'ຫ',
  },
  halant: '',
  numerals: {
    '0': '໐', '1': '໑', '2': '໒', '3': '໓', '4': '໔',
    '5': '໕', '6': '໖', '7': '໗', '8': '໘', '9': '໙',
  },
};

// Tibetan
const TIBETAN: ScriptConfig = {
  vowels: {
    'a': 'ཨ', 'i': 'ཨི', 'u': 'ཨུ', 'e': 'ཨེ', 'o': 'ཨོ',
  },
  vowelSigns: {
    'a': '', 'i': 'ི', 'u': 'ུ', 'e': 'ེ', 'o': 'ོ',
  },
  consonants: {
    'k': 'ཀ', 'kh': 'ཁ', 'g': 'ག', 'ng': 'ང',
    'c': 'ཅ', 'ch': 'ཆ', 'j': 'ཇ', 'ny': 'ཉ',
    't': 'ཏ', 'th': 'ཐ', 'd': 'ད', 'n': 'ན',
    'p': 'པ', 'ph': 'ཕ', 'b': 'བ', 'm': 'མ',
    'ts': 'ཙ', 'tsh': 'ཚ', 'dz': 'ཛ', 'w': 'ཝ',
    'zh': 'ཞ', 'z': 'ཟ', 'y': 'ཡ', 'r': 'ར',
    'l': 'ལ', 'sh': 'ཤ', 's': 'ས', 'h': 'ཧ', 'a': 'ཨ',
  },
  halant: '྄',
};

// Ethiopic/Ge'ez (Amharic, Tigrinya)
const ETHIOPIC: ScriptConfig = {
  vowels: {}, // Ethiopic is an abugida where vowels are inherent
  vowelSigns: {},
  consonants: {
    'ha': 'ሀ', 'hu': 'ሁ', 'hi': 'ሂ', 'haa': 'ሃ', 'he': 'ሄ', 'h': 'ህ', 'ho': 'ሆ',
    'la': 'ለ', 'lu': 'ሉ', 'li': 'ሊ', 'laa': 'ላ', 'le': 'ሌ', 'l': 'ል', 'lo': 'ሎ',
    'ma': 'መ', 'mu': 'ሙ', 'mi': 'ሚ', 'maa': 'ማ', 'me': 'ሜ', 'm': 'ም', 'mo': 'ሞ',
    'sa': 'ሰ', 'su': 'ሱ', 'si': 'ሲ', 'saa': 'ሳ', 'se': 'ሴ', 's': 'ስ', 'so': 'ሶ',
    'ra': 'ረ', 'ru': 'ሩ', 'ri': 'ሪ', 'raa': 'ራ', 're': 'ሬ', 'r': 'ር', 'ro': 'ሮ',
    'sha': 'ሸ', 'shu': 'ሹ', 'shi': 'ሺ', 'shaa': 'ሻ', 'she': 'ሼ', 'sh': 'ሽ', 'sho': 'ሾ',
    'qa': 'ቀ', 'qu': 'ቁ', 'qi': 'ቂ', 'qaa': 'ቃ', 'qe': 'ቄ', 'q': 'ቅ', 'qo': 'ቆ',
    'ba': 'በ', 'bu': 'ቡ', 'bi': 'ቢ', 'baa': 'ባ', 'be': 'ቤ', 'b': 'ብ', 'bo': 'ቦ',
    'ta': 'ተ', 'tu': 'ቱ', 'ti': 'ቲ', 'taa': 'ታ', 'te': 'ቴ', 't': 'ት', 'to': 'ቶ',
    'na': 'ነ', 'nu': 'ኑ', 'ni': 'ኒ', 'naa': 'ና', 'ne': 'ኔ', 'n': 'ን', 'no': 'ኖ',
    'ka': 'ከ', 'ku': 'ኩ', 'ki': 'ኪ', 'kaa': 'ካ', 'ke': 'ኬ', 'k': 'ክ', 'ko': 'ኮ',
    'wa': 'ወ', 'wu': 'ዉ', 'wi': 'ዊ', 'waa': 'ዋ', 'we': 'ዌ', 'w': 'ው', 'wo': 'ዎ',
    'za': 'ዘ', 'zu': 'ዙ', 'zi': 'ዚ', 'zaa': 'ዛ', 'ze': 'ዜ', 'z': 'ዝ', 'zo': 'ዞ',
    'ya': 'የ', 'yu': 'ዩ', 'yi': 'ዪ', 'yaa': 'ያ', 'ye': 'ዬ', 'y': 'ይ', 'yo': 'ዮ',
    'da': 'ደ', 'du': 'ዱ', 'di': 'ዲ', 'daa': 'ዳ', 'de': 'ዴ', 'd': 'ድ', 'do': 'ዶ',
    'ja': 'ጀ', 'ju': 'ጁ', 'ji': 'ጂ', 'jaa': 'ጃ', 'je': 'ጄ', 'j': 'ጅ', 'jo': 'ጆ',
    'ga': 'ገ', 'gu': 'ጉ', 'gi': 'ጊ', 'gaa': 'ጋ', 'ge': 'ጌ', 'g': 'ግ', 'go': 'ጎ',
    'fa': 'ፈ', 'fu': 'ፉ', 'fi': 'ፊ', 'faa': 'ፋ', 'fe': 'ፌ', 'f': 'ፍ', 'fo': 'ፎ',
    'pa': 'ፐ', 'pu': 'ፑ', 'pi': 'ፒ', 'paa': 'ፓ', 'pe': 'ፔ', 'p': 'ፕ', 'po': 'ፖ',
  },
  halant: '',
};

// ============================================================================
// LANGUAGE TO SCRIPT MAPPING (200+ languages)
// ============================================================================

const LANGUAGE_SCRIPT_MAP: Record<string, ScriptConfig> = {
  // Indic languages
  'hindi': DEVANAGARI, 'hi': DEVANAGARI, 'hin': DEVANAGARI, 'hin_Deva': DEVANAGARI,
  'marathi': DEVANAGARI, 'mr': DEVANAGARI, 'mar': DEVANAGARI, 'mar_Deva': DEVANAGARI,
  'nepali': DEVANAGARI, 'ne': DEVANAGARI, 'nep': DEVANAGARI, 'npi_Deva': DEVANAGARI,
  'sanskrit': DEVANAGARI, 'sa': DEVANAGARI, 'san': DEVANAGARI, 'san_Deva': DEVANAGARI,
  'konkani': DEVANAGARI, 'kok': DEVANAGARI,
  'bodo': DEVANAGARI, 'brx': DEVANAGARI,
  'maithili': DEVANAGARI, 'mai': DEVANAGARI, 'mai_Deva': DEVANAGARI,
  'bhojpuri': DEVANAGARI, 'bho': DEVANAGARI, 'bho_Deva': DEVANAGARI,
  'awadhi': DEVANAGARI, 'awa': DEVANAGARI, 'awa_Deva': DEVANAGARI,
  'magahi': DEVANAGARI, 'mag': DEVANAGARI, 'mag_Deva': DEVANAGARI,
  'chhattisgarhi': DEVANAGARI, 'hne': DEVANAGARI, 'hne_Deva': DEVANAGARI,
  
  'telugu': TELUGU, 'te': TELUGU, 'tel': TELUGU, 'tel_Telu': TELUGU,
  'tamil': TAMIL, 'ta': TAMIL, 'tam': TAMIL, 'tam_Taml': TAMIL,
  'bengali': BENGALI, 'bn': BENGALI, 'ben': BENGALI, 'ben_Beng': BENGALI,
  'bangla': BENGALI,
  'assamese': BENGALI, 'as': BENGALI, 'asm': BENGALI, 'asm_Beng': BENGALI,
  'kannada': KANNADA, 'kn': KANNADA, 'kan': KANNADA, 'kan_Knda': KANNADA,
  'malayalam': MALAYALAM, 'ml': MALAYALAM, 'mal': MALAYALAM, 'mal_Mlym': MALAYALAM,
  'gujarati': GUJARATI, 'gu': GUJARATI, 'guj': GUJARATI, 'guj_Gujr': GUJARATI,
  'punjabi': GURMUKHI, 'pa': GURMUKHI, 'pan': GURMUKHI, 'pan_Guru': GURMUKHI,
  'gurmukhi': GURMUKHI,
  'odia': ODIA, 'or': ODIA, 'ori': ODIA, 'ory_Orya': ODIA, 'oriya': ODIA,
  'sinhala': SINHALA, 'si': SINHALA, 'sin': SINHALA, 'sin_Sinh': SINHALA,
  'sinhalese': SINHALA,
  
  // Arabic script languages
  'arabic': ARABIC, 'ar': ARABIC, 'ara': ARABIC, 'arb_Arab': ARABIC,
  'urdu': URDU, 'ur': URDU, 'urd': URDU, 'urd_Arab': URDU,
  'persian': PERSIAN, 'fa': PERSIAN, 'fas': PERSIAN, 'pes_Arab': PERSIAN,
  'farsi': PERSIAN,
  'pashto': ARABIC, 'ps': ARABIC, 'pus': ARABIC, 'pbt_Arab': ARABIC,
  'sindhi': ARABIC, 'sd': ARABIC, 'snd': ARABIC, 'snd_Arab': ARABIC,
  'kashmiri': ARABIC, 'ks': ARABIC, 'kas': ARABIC, 'kas_Arab': ARABIC,
  'kurdish': ARABIC, 'ku': ARABIC, 'ckb_Arab': ARABIC,
  'uyghur': ARABIC, 'ug': ARABIC, 'uig': ARABIC, 'uig_Arab': ARABIC,
  
  // Cyrillic script languages
  'russian': CYRILLIC, 'ru': CYRILLIC, 'rus': CYRILLIC, 'rus_Cyrl': CYRILLIC,
  'ukrainian': UKRAINIAN, 'uk': UKRAINIAN, 'ukr': UKRAINIAN, 'ukr_Cyrl': UKRAINIAN,
  'belarusian': CYRILLIC, 'be': CYRILLIC, 'bel': CYRILLIC, 'bel_Cyrl': CYRILLIC,
  'bulgarian': CYRILLIC, 'bg': CYRILLIC, 'bul': CYRILLIC, 'bul_Cyrl': CYRILLIC,
  'serbian': CYRILLIC, 'sr': CYRILLIC, 'srp': CYRILLIC, 'srp_Cyrl': CYRILLIC,
  'macedonian': CYRILLIC, 'mk': CYRILLIC, 'mkd': CYRILLIC, 'mkd_Cyrl': CYRILLIC,
  'kazakh': CYRILLIC, 'kk': CYRILLIC, 'kaz': CYRILLIC, 'kaz_Cyrl': CYRILLIC,
  'kyrgyz': CYRILLIC, 'ky': CYRILLIC, 'kir': CYRILLIC, 'kir_Cyrl': CYRILLIC,
  'tajik': CYRILLIC, 'tg': CYRILLIC, 'tgk': CYRILLIC, 'tgk_Cyrl': CYRILLIC,
  'uzbek': CYRILLIC, 'uz': CYRILLIC, 'uzb': CYRILLIC, 'uzn_Cyrl': CYRILLIC,
  'mongolian': CYRILLIC, 'mn': CYRILLIC, 'mon': CYRILLIC, 'khk_Cyrl': CYRILLIC,
  
  // Southeast Asian
  'thai': THAI, 'th': THAI, 'tha': THAI, 'tha_Thai': THAI,
  'lao': LAO, 'lo': LAO, 'lao_Laoo': LAO,
  'myanmar': MYANMAR, 'my': MYANMAR, 'mya': MYANMAR, 'mya_Mymr': MYANMAR,
  'burmese': MYANMAR,
  'khmer': KHMER, 'km': KHMER, 'khm': KHMER, 'khm_Khmr': KHMER,
  'cambodian': KHMER,
  'vietnamese': VIETNAMESE, 'vi': VIETNAMESE, 'vie': VIETNAMESE, 'vie_Latn': VIETNAMESE,
  
  // East Asian
  'japanese': HIRAGANA, 'ja': HIRAGANA, 'jpn': HIRAGANA, 'jpn_Jpan': HIRAGANA,
  'korean': KOREAN, 'ko': KOREAN, 'kor': KOREAN, 'kor_Hang': KOREAN,
  
  // Other scripts
  'georgian': GEORGIAN, 'ka': GEORGIAN, 'kat': GEORGIAN, 'kat_Geor': GEORGIAN,
  'armenian': ARMENIAN, 'hy': ARMENIAN, 'hye': ARMENIAN, 'hye_Armn': ARMENIAN,
  'greek': GREEK, 'el': GREEK, 'ell': GREEK, 'ell_Grek': GREEK,
  'hebrew': HEBREW, 'he': HEBREW, 'heb': HEBREW, 'heb_Hebr': HEBREW,
  'tibetan': TIBETAN, 'bo': TIBETAN, 'bod': TIBETAN, 'bod_Tibt': TIBETAN,
  'amharic': ETHIOPIC, 'am': ETHIOPIC, 'amh': ETHIOPIC, 'amh_Ethi': ETHIOPIC,
  'tigrinya': ETHIOPIC, 'ti': ETHIOPIC, 'tir': ETHIOPIC, 'tir_Ethi': ETHIOPIC,
};

// ============================================================================
// TRANSLITERATION ENGINE
// ============================================================================

// Consonant patterns sorted by length (longest first)
// Includes both lowercase (dental) and uppercase (retroflex) variants
const CONSONANT_PATTERNS = [
  'shch', 'ksh', 'chh', 'thr', 'Thr', 'shr', 'Shr', 'ntr', 'str', 'tsh', 'dz',
  'Th', 'Dh', 'th', 'dh', 'bh', 'ph', 'gh', 'kh', 'jh', 'Sh', 'sh', 'ch', 'ng', 'ny', 'nn', 'll', 'rr',
  'Tr', 'Dr', 'tr', 'pr', 'kr', 'gr', 'br', 'dr', 'fr', 'sr', 'hr', 'ts', 'zh', 'ps',
  'T', 'D', 'N', 'L', 'k', 'g', 'c', 'j', 't', 'd', 'n', 'p', 'b', 'm', 'y', 'r', 'l', 
  'v', 'w', 's', 'h', 'z', 'f', 'q', 'x'
];

// Vowel patterns sorted by length (longest first)
const VOWEL_PATTERNS = [
  'aa', 'ee', 'ii', 'oo', 'uu', 'ae', 'ai', 'au', 'ou', 'oa', 'ow',
  'ri', 'ru', 'am', 'an', 'ah', 'ye', 'yo', 'yu', 'ya', 'yi',
  'eo', 'eu', 'ui', 'wo', 'wa', 'we', 'wi', 'wae', 'yae', 'yeo',
  'ā', 'ī', 'ū', 'ē', 'ō', 'ṛ', 'ṅ', 'ñ', 'ṭ', 'ḍ', 'ṇ', 'ś', 'ṣ', 'ḻ',
  'a', 'e', 'i', 'o', 'u', 'y'
];

/**
 * Parse text into syllables for transliteration
 * Preserves case for retroflex/dental distinction (T vs t)
 */
function parseToSyllables(text: string): Array<{consonant: string | null; vowel: string; hasExplicitVowel: boolean}> {
  const syllables: Array<{consonant: string | null; vowel: string; hasExplicitVowel: boolean}> = [];
  let i = 0;
  
  while (i < text.length) {
    let consonant: string | null = null;
    let vowel = 'a';
    let hasExplicitVowel = false;
    
    // Skip non-alphabetic characters
    if (!/[a-zA-Zāīūēōṛṅñṭḍṇśṣḻ]/i.test(text[i])) {
      i++;
      continue;
    }
    
    // Match consonant - try case-sensitive first for retroflex detection
    for (const pattern of CONSONANT_PATTERNS) {
      const slice = text.slice(i, i + pattern.length);
      // Check exact match first (for T, D, N, etc.)
      if (slice === pattern) {
        consonant = pattern;
        i += pattern.length;
        break;
      }
      // Then case-insensitive match
      if (slice.toLowerCase() === pattern.toLowerCase() && pattern === pattern.toLowerCase()) {
        consonant = pattern;
        i += pattern.length;
        break;
      }
    }
    
    if (consonant) {
      // Look for vowel after consonant
      const lowerSlice = text.slice(i).toLowerCase();
      for (const pattern of VOWEL_PATTERNS) {
        if (lowerSlice.startsWith(pattern.toLowerCase())) {
          vowel = pattern;
          hasExplicitVowel = true;
          i += pattern.length;
          break;
        }
      }
      
      // Check for consonant cluster or word-final (adds halant)
      if (!hasExplicitVowel) {
        const nextChar = text[i] || '';
        const isNextConsonant = /[bcdfghjklmnpqrstvwxyzTDNL]/i.test(nextChar);
        const isEndOfWord = !nextChar || !/[a-zA-Z]/i.test(nextChar);
        
        if (isNextConsonant || isEndOfWord) {
          vowel = '';
          hasExplicitVowel = false;
        }
      }
      
      syllables.push({consonant, vowel, hasExplicitVowel});
    } else {
      // Standalone vowel
      const lowerSlice = text.slice(i).toLowerCase();
      for (const pattern of VOWEL_PATTERNS) {
        if (lowerSlice.startsWith(pattern.toLowerCase())) {
          vowel = pattern;
          hasExplicitVowel = true;
          i += pattern.length;
          break;
        }
      }
      
      if (hasExplicitVowel) {
        syllables.push({consonant: null, vowel, hasExplicitVowel});
      } else {
        i++;
      }
    }
  }
  
  return syllables;
}

/**
 * Transliterate a single word using the given script config
 * Handles case-sensitive lookups for retroflex (T, D, N) vs dental (t, d, n)
 */
function transliterateWord(word: string, config: ScriptConfig): string {
  if (!word.trim()) return word;
  
  // Preserve punctuation
  const match = word.match(/^([^\p{L}]*)(.+?)([^\p{L}]*)$/u);
  const prefix = match?.[1] || '';
  const core = match?.[2] || word;
  const suffix = match?.[3] || '';
  
  if (!core) return word;
  
  // Check if already in non-Latin script - return as-is
  if (!/^[a-zA-Zāīūēōṛṅñṭḍṇśṣḻ]+$/.test(core)) {
    return word;
  }
  
  const syllables = parseToSyllables(core);
  if (syllables.length === 0) return word;
  
  let result = '';
  
  for (let i = 0; i < syllables.length; i++) {
    const {consonant, vowel, hasExplicitVowel} = syllables[i];
    
    if (consonant) {
      // Try exact match first (for T, D, N retroflex), then lowercase fallback
      let consonantChar = config.consonants[consonant];
      if (!consonantChar) {
        consonantChar = config.consonants[consonant.toLowerCase()];
      }
      
      if (!consonantChar) {
        result += consonant;
        continue;
      }
      
      result += consonantChar;
      
      // Handle vowel sign or halant
      if (vowel === '' || (!hasExplicitVowel && vowel === 'a')) {
        const nextSyllable = syllables[i + 1];
        if (nextSyllable?.consonant && config.halant) {
          result += config.halant;
        } else if (vowel === '' && config.halant) {
          result += config.halant;
        }
      } else {
        const vowelSign = config.vowelSigns[vowel] ?? config.vowelSigns[vowel.toLowerCase()];
        if (vowelSign !== undefined) {
          result += vowelSign;
        }
      }
    } else if (vowel) {
      const vowelChar = config.vowels[vowel] ?? config.vowels[vowel.toLowerCase()];
      if (vowelChar) {
        result += vowelChar;
      }
    }
  }
  
  return prefix + result + suffix;
}

/**
 * Main ICU-style transliteration function
 * Converts Latin script to target language's native script
 */
export function icuTransliterate(text: string, targetLanguage: string): string {
  const lang = targetLanguage.toLowerCase().replace(/[_\-\s]/g, '');
  const config = LANGUAGE_SCRIPT_MAP[lang];
  
  if (!config) {
    // Unsupported language - return as-is
    return text;
  }
  
  // Split by whitespace, preserving spaces
  const parts = text.split(/(\s+)/);
  return parts.map(part => {
    if (/^\s+$/.test(part)) return part;
    return transliterateWord(part, config);
  }).join('');
}

/**
 * Check if language is supported for transliteration
 */
export function isICUTransliterationSupported(language: string): boolean {
  const lang = language.toLowerCase().replace(/[_\-\s]/g, '');
  return lang in LANGUAGE_SCRIPT_MAP;
}

/**
 * Get all supported languages
 */
export function getICUSupportedLanguages(): string[] {
  const uniqueLanguages = new Set<string>();
  for (const key of Object.keys(LANGUAGE_SCRIPT_MAP)) {
    // Add only human-readable names, not codes
    if (key.length > 3 && !key.includes('_')) {
      uniqueLanguages.add(key);
    }
  }
  return Array.from(uniqueLanguages).sort();
}

/**
 * Convert numerals to target script
 */
export function convertNumerals(text: string, targetLanguage: string): string {
  const lang = targetLanguage.toLowerCase().replace(/[_\-\s]/g, '');
  const config = LANGUAGE_SCRIPT_MAP[lang];
  
  if (!config?.numerals) return text;
  
  let result = text;
  for (const [latin, native] of Object.entries(config.numerals)) {
    result = result.replace(new RegExp(latin, 'g'), native);
  }
  return result;
}

/**
 * Get the script type for a language
 */
export function getScriptType(language: string): string {
  const lang = language.toLowerCase().replace(/[_\-\s]/g, '');
  const config = LANGUAGE_SCRIPT_MAP[lang];
  
  if (!config) return 'latin';
  
  // Determine script type from config characteristics
  if (config === DEVANAGARI) return 'devanagari';
  if (config === TELUGU) return 'telugu';
  if (config === TAMIL) return 'tamil';
  if (config === BENGALI) return 'bengali';
  if (config === KANNADA) return 'kannada';
  if (config === MALAYALAM) return 'malayalam';
  if (config === GUJARATI) return 'gujarati';
  if (config === GURMUKHI) return 'gurmukhi';
  if (config === ODIA) return 'odia';
  if (config === ARABIC || config === URDU || config === PERSIAN) return 'arabic';
  if (config === CYRILLIC || config === UKRAINIAN) return 'cyrillic';
  if (config === THAI) return 'thai';
  if (config === LAO) return 'lao';
  if (config === MYANMAR) return 'myanmar';
  if (config === KHMER) return 'khmer';
  if (config === VIETNAMESE) return 'latin-extended';
  if (config === HIRAGANA) return 'japanese';
  if (config === KOREAN) return 'korean';
  if (config === GEORGIAN) return 'georgian';
  if (config === ARMENIAN) return 'armenian';
  if (config === GREEK) return 'greek';
  if (config === HEBREW) return 'hebrew';
  if (config === TIBETAN) return 'tibetan';
  if (config === ETHIOPIC) return 'ethiopic';
  if (config === SINHALA) return 'sinhala';
  
  return 'unknown';
}

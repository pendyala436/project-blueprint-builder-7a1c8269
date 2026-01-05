/**
 * Phonetic Transliterator
 * 
 * Converts Latin script (romanized text) to native scripts
 * using phonetic/syllable-based mapping rules.
 * 
 * Example: "emi chesthunnavu" → "ఏమి చేస్తున్నావు" (Telugu)
 * 
 * Supports: Telugu, Hindi, Tamil, Bengali, Kannada, Malayalam, etc.
 */

// Telugu phonetic mapping (comprehensive)
const TELUGU_VOWELS: Record<string, string> = {
  'a': 'అ', 'aa': 'ఆ', 'i': 'ఇ', 'ii': 'ఈ', 'ee': 'ఈ',
  'u': 'ఉ', 'uu': 'ఊ', 'oo': 'ఊ',
  'e': 'ఎ', 'ae': 'ఏ', 'ai': 'ఐ',
  'o': 'ఒ', 'oa': 'ఓ', 'au': 'ఔ', 'ou': 'ఔ',
  'ri': 'ఋ', 'ru': 'ఋ',
  'am': 'అం', 'ah': 'అః', 'an': 'అం'
};

const TELUGU_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ా', 'i': 'ి', 'ii': 'ీ', 'ee': 'ీ',
  'u': 'ు', 'uu': 'ూ', 'oo': 'ూ',
  'e': 'ె', 'ae': 'ే', 'ai': 'ై',
  'o': 'ొ', 'oa': 'ో', 'au': 'ౌ', 'ou': 'ౌ',
  'ri': 'ృ', 'ru': 'ృ',
  'am': 'ం', 'an': 'ం', 'n': 'ం', // anusvara
};

const TELUGU_CONSONANTS: Record<string, string> = {
  // Velars
  'k': 'క', 'kh': 'ఖ', 'g': 'గ', 'gh': 'ఘ', 'ng': 'ఙ',
  // Palatals
  'c': 'చ', 'ch': 'చ', 'chh': 'ఛ', 'j': 'జ', 'jh': 'ఝ', 'ny': 'ఞ', 'gn': 'జ్ఞ',
  // Retroflexes  
  't': 'ట', 'th': 'ఠ', 'd': 'డ', 'dh': 'ఢ', 
  // Dentals (using soft versions)
  'n': 'న',
  // Labials
  'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
  // Semi-vowels
  'y': 'య', 'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ',
  // Sibilants & Aspirate
  'sh': 'శ', 's': 'స', 'h': 'హ',
  // Additional
  'z': 'జ', 'x': 'క్స', 'q': 'క',
  // Common clusters
  'ksh': 'క్ష', 'ks': 'క్స', 'tr': 'ట్ర', 'pr': 'ప్ర', 'kr': 'క్ర', 
  'gr': 'గ్ర', 'br': 'బ్ర', 'dr': 'డ్ర', 'sr': 'స్ర', 'hr': 'హ్ర',
  'thr': 'థ్ర', 'shr': 'శ్ర', 'str': 'స్ట్ర', 'ntr': 'న్ట్ర',
};

const TELUGU_HALANT = '్';

// Hindi phonetic mapping
const HINDI_VOWELS: Record<string, string> = {
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'ee': 'ई',
  'u': 'उ', 'uu': 'ऊ', 'oo': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'ae': 'ए',
  'o': 'ओ', 'au': 'औ', 'ou': 'औ',
  'ri': 'ऋ', 'am': 'अं', 'an': 'अं',
};

const HINDI_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ा', 'i': 'ि', 'ii': 'ी', 'ee': 'ी',
  'u': 'ु', 'uu': 'ू', 'oo': 'ू',
  'e': 'े', 'ai': 'ै', 'ae': 'े',
  'o': 'ो', 'au': 'ौ', 'ou': 'ौ',
  'ri': 'ृ',
  'am': 'ं', 'an': 'ं', 'n': 'ं',
};

const HINDI_CONSONANTS: Record<string, string> = {
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'c': 'च', 'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  'sh': 'श', 's': 'स', 'h': 'ह',
  'z': 'ज़', 'q': 'क़', 'x': 'क्स',
  'ksh': 'क्ष', 'tr': 'त्र', 'gy': 'ज्ञ', 'gn': 'ज्ञ',
  'kr': 'क्र', 'gr': 'ग्र', 'pr': 'प्र', 'br': 'ब्र', 'dr': 'द्र', 'sr': 'स्र',
  'thr': 'थ्र', 'shr': 'श्र', 'str': 'स्ट्र', 'ntr': 'न्त्र',
};

const HINDI_HALANT = '्';

// Tamil phonetic mapping
const TAMIL_VOWELS: Record<string, string> = {
  'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'ee': 'ஈ',
  'u': 'உ', 'uu': 'ஊ', 'oo': 'ஊ',
  'e': 'எ', 'ae': 'ஏ', 'ai': 'ஐ',
  'o': 'ஒ', 'oa': 'ஓ', 'au': 'ஔ', 'ou': 'ஔ',
  'am': 'அம்', 'an': 'அந்',
};

const TAMIL_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ா', 'i': 'ி', 'ii': 'ீ', 'ee': 'ீ',
  'u': 'ு', 'uu': 'ூ', 'oo': 'ூ',
  'e': 'ெ', 'ae': 'ே', 'ai': 'ை',
  'o': 'ொ', 'oa': 'ோ', 'au': 'ௌ', 'ou': 'ௌ',
  'am': 'ம்', 'an': 'ந்', 'n': 'ன்',
};

const TAMIL_CONSONANTS: Record<string, string> = {
  'k': 'க', 'g': 'க', 'ng': 'ங', 'c': 'ச',
  'ch': 'ச', 'j': 'ஜ', 'ny': 'ஞ', 's': 'ஸ',
  't': 'ட', 'd': 'ட', 'n': 'ந', 'nn': 'ண',
  'th': 'த', 'dh': 'த',
  'p': 'ப', 'b': 'ப', 'm': 'ம',
  'y': 'ய', 'r': 'ர', 'l': 'ல', 'v': 'வ', 'w': 'வ',
  'zh': 'ழ', 'sh': 'ஷ', 'h': 'ஹ',
  'la': 'ள', 'ra': 'ற', 'na': 'ன',
};

const TAMIL_HALANT = '்';

// Bengali phonetic mapping
const BENGALI_VOWELS: Record<string, string> = {
  'a': 'অ', 'aa': 'আ', 'i': 'ই', 'ii': 'ঈ', 'ee': 'ঈ',
  'u': 'উ', 'uu': 'ঊ', 'oo': 'ঊ',
  'e': 'এ', 'ai': 'ঐ', 'ae': 'এ',
  'o': 'ও', 'au': 'ঔ', 'ou': 'ঔ',
  'ri': 'ঋ', 'am': 'অং', 'an': 'অং',
};

const BENGALI_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'া', 'i': 'ি', 'ii': 'ী', 'ee': 'ী',
  'u': 'ু', 'uu': 'ূ', 'oo': 'ূ',
  'e': 'ে', 'ai': 'ৈ', 'ae': 'ে',
  'o': 'ো', 'au': 'ৌ', 'ou': 'ৌ',
  'ri': 'ৃ',
  'am': 'ং', 'an': 'ং', 'n': 'ং',
};

const BENGALI_CONSONANTS: Record<string, string> = {
  'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ঙ',
  'c': 'চ', 'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'ny': 'ঞ',
  't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন',
  'p': 'প', 'ph': 'ফ', 'f': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
  'y': 'য', 'r': 'র', 'l': 'ল', 'v': 'ভ', 'w': 'ও',
  'sh': 'শ', 's': 'স', 'h': 'হ', 'x': 'ক্স',
  'kr': 'ক্র', 'gr': 'গ্র', 'pr': 'প্র', 'br': 'ব্র', 'dr': 'দ্র', 'tr': 'ত্র',
};

const BENGALI_HALANT = '্';

// Kannada phonetic mapping
const KANNADA_VOWELS: Record<string, string> = {
  'a': 'ಅ', 'aa': 'ಆ', 'i': 'ಇ', 'ii': 'ಈ', 'ee': 'ಈ',
  'u': 'ಉ', 'uu': 'ಊ', 'oo': 'ಊ',
  'e': 'ಎ', 'ae': 'ಏ', 'ai': 'ಐ',
  'o': 'ಒ', 'oa': 'ಓ', 'au': 'ಔ', 'ou': 'ಔ',
  'ri': 'ಋ', 'am': 'ಅಂ', 'an': 'ಅಂ',
};

const KANNADA_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ಾ', 'i': 'ಿ', 'ii': 'ೀ', 'ee': 'ೀ',
  'u': 'ು', 'uu': 'ೂ', 'oo': 'ೂ',
  'e': 'ೆ', 'ae': 'ೇ', 'ai': 'ೈ',
  'o': 'ೊ', 'oa': 'ೋ', 'au': 'ೌ', 'ou': 'ೌ',
  'ri': 'ೃ',
  'am': 'ಂ', 'an': 'ಂ', 'n': 'ಂ',
};

const KANNADA_CONSONANTS: Record<string, string> = {
  'k': 'ಕ', 'kh': 'ಖ', 'g': 'ಗ', 'gh': 'ಘ', 'ng': 'ಙ',
  'c': 'ಚ', 'ch': 'ಚ', 'chh': 'ಛ', 'j': 'ಜ', 'jh': 'ಝ', 'ny': 'ಞ',
  't': 'ಟ', 'th': 'ಠ', 'd': 'ಡ', 'dh': 'ಢ', 'n': 'ನ',
  'p': 'ಪ', 'ph': 'ಫ', 'f': 'ಫ', 'b': 'ಬ', 'bh': 'ಭ', 'm': 'ಮ',
  'y': 'ಯ', 'r': 'ರ', 'l': 'ಲ', 'v': 'ವ', 'w': 'ವ',
  'sh': 'ಶ', 's': 'ಸ', 'h': 'ಹ', 'x': 'ಕ್ಸ',
  'kr': 'ಕ್ರ', 'gr': 'ಗ್ರ', 'pr': 'ಪ್ರ', 'br': 'ಬ್ರ', 'dr': 'ಡ್ರ', 'tr': 'ಟ್ರ',
};

const KANNADA_HALANT = '್';

// Malayalam phonetic mapping
const MALAYALAM_VOWELS: Record<string, string> = {
  'a': 'അ', 'aa': 'ആ', 'i': 'ഇ', 'ii': 'ഈ', 'ee': 'ഈ',
  'u': 'ഉ', 'uu': 'ഊ', 'oo': 'ഊ',
  'e': 'എ', 'ae': 'ഏ', 'ai': 'ഐ',
  'o': 'ഒ', 'oa': 'ഓ', 'au': 'ഔ', 'ou': 'ഔ',
  'ri': 'ഋ', 'am': 'അം', 'an': 'അം',
};

const MALAYALAM_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ാ', 'i': 'ി', 'ii': 'ീ', 'ee': 'ീ',
  'u': 'ു', 'uu': 'ൂ', 'oo': 'ൂ',
  'e': 'െ', 'ae': 'േ', 'ai': 'ൈ',
  'o': 'ൊ', 'oa': 'ോ', 'au': 'ൌ', 'ou': 'ൌ',
  'ri': 'ൃ',
  'am': 'ം', 'an': 'ം', 'n': 'ം',
};

const MALAYALAM_CONSONANTS: Record<string, string> = {
  'k': 'ക', 'kh': 'ഖ', 'g': 'ഗ', 'gh': 'ഘ', 'ng': 'ങ',
  'c': 'ച', 'ch': 'ച', 'chh': 'ഛ', 'j': 'ജ', 'jh': 'ഝ', 'ny': 'ഞ',
  't': 'ട', 'th': 'ഠ', 'd': 'ഡ', 'dh': 'ഢ', 'n': 'ന',
  'p': 'പ', 'ph': 'ഫ', 'f': 'ഫ', 'b': 'ബ', 'bh': 'ഭ', 'm': 'മ',
  'y': 'യ', 'r': 'ര', 'l': 'ല', 'v': 'വ', 'w': 'വ',
  'sh': 'ശ', 's': 'സ', 'h': 'ഹ', 'zh': 'ഴ', 'x': 'ക്സ',
  'kr': 'ക്ര', 'gr': 'ഗ്ര', 'pr': 'പ്ര', 'br': 'ബ്ര', 'dr': 'ഡ്ര', 'tr': 'ട്ര',
};

const MALAYALAM_HALANT = '്';

// Language configuration - supports both full names and ISO codes
interface LanguageConfig {
  vowels: Record<string, string>;
  vowelSigns: Record<string, string>;
  consonants: Record<string, string>;
  halant: string;
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  // Telugu
  te: { vowels: TELUGU_VOWELS, vowelSigns: TELUGU_VOWEL_SIGNS, consonants: TELUGU_CONSONANTS, halant: TELUGU_HALANT },
  telugu: { vowels: TELUGU_VOWELS, vowelSigns: TELUGU_VOWEL_SIGNS, consonants: TELUGU_CONSONANTS, halant: TELUGU_HALANT },
  // Hindi
  hi: { vowels: HINDI_VOWELS, vowelSigns: HINDI_VOWEL_SIGNS, consonants: HINDI_CONSONANTS, halant: HINDI_HALANT },
  hindi: { vowels: HINDI_VOWELS, vowelSigns: HINDI_VOWEL_SIGNS, consonants: HINDI_CONSONANTS, halant: HINDI_HALANT },
  // Tamil
  ta: { vowels: TAMIL_VOWELS, vowelSigns: TAMIL_VOWEL_SIGNS, consonants: TAMIL_CONSONANTS, halant: TAMIL_HALANT },
  tamil: { vowels: TAMIL_VOWELS, vowelSigns: TAMIL_VOWEL_SIGNS, consonants: TAMIL_CONSONANTS, halant: TAMIL_HALANT },
  // Bengali
  bn: { vowels: BENGALI_VOWELS, vowelSigns: BENGALI_VOWEL_SIGNS, consonants: BENGALI_CONSONANTS, halant: BENGALI_HALANT },
  bengali: { vowels: BENGALI_VOWELS, vowelSigns: BENGALI_VOWEL_SIGNS, consonants: BENGALI_CONSONANTS, halant: BENGALI_HALANT },
  // Kannada
  kn: { vowels: KANNADA_VOWELS, vowelSigns: KANNADA_VOWEL_SIGNS, consonants: KANNADA_CONSONANTS, halant: KANNADA_HALANT },
  kannada: { vowels: KANNADA_VOWELS, vowelSigns: KANNADA_VOWEL_SIGNS, consonants: KANNADA_CONSONANTS, halant: KANNADA_HALANT },
  // Malayalam
  ml: { vowels: MALAYALAM_VOWELS, vowelSigns: MALAYALAM_VOWEL_SIGNS, consonants: MALAYALAM_CONSONANTS, halant: MALAYALAM_HALANT },
  malayalam: { vowels: MALAYALAM_VOWELS, vowelSigns: MALAYALAM_VOWEL_SIGNS, consonants: MALAYALAM_CONSONANTS, halant: MALAYALAM_HALANT },
  // Marathi (uses Devanagari like Hindi)
  mr: { vowels: HINDI_VOWELS, vowelSigns: HINDI_VOWEL_SIGNS, consonants: HINDI_CONSONANTS, halant: HINDI_HALANT },
  marathi: { vowels: HINDI_VOWELS, vowelSigns: HINDI_VOWEL_SIGNS, consonants: HINDI_CONSONANTS, halant: HINDI_HALANT },
  // Gujarati (similar structure to Hindi)
  gu: { vowels: HINDI_VOWELS, vowelSigns: HINDI_VOWEL_SIGNS, consonants: HINDI_CONSONANTS, halant: HINDI_HALANT },
  gujarati: { vowels: HINDI_VOWELS, vowelSigns: HINDI_VOWEL_SIGNS, consonants: HINDI_CONSONANTS, halant: HINDI_HALANT },
  // Punjabi (similar structure to Hindi)
  pa: { vowels: HINDI_VOWELS, vowelSigns: HINDI_VOWEL_SIGNS, consonants: HINDI_CONSONANTS, halant: HINDI_HALANT },
  punjabi: { vowels: HINDI_VOWELS, vowelSigns: HINDI_VOWEL_SIGNS, consonants: HINDI_CONSONANTS, halant: HINDI_HALANT },
};

/**
 * Parse a word into syllables (consonant clusters + vowels)
 * Returns array of { consonant, vowel, hasExplicitVowel } tuples
 * 
 * FIXED: Properly handles consonant clusters and word-final consonants
 */
function parseToSyllables(word: string): Array<{ consonant: string | null; vowel: string; hasExplicitVowel: boolean }> {
  const syllables: Array<{ consonant: string | null; vowel: string; hasExplicitVowel: boolean }> = [];
  const lower = word.toLowerCase();
  let i = 0;
  
  // Consonant patterns sorted by length (longest first for proper matching)
  const consonantPatterns = [
    'ksh', 'chh', 'thr', 'shr', 'ntr', 'str',
    'th', 'dh', 'bh', 'ph', 'gh', 'kh', 'jh', 'sh', 'ch', 'ng', 'ny', 'tr', 'pr', 'kr', 'gr', 'br', 'dr', 'fr', 'sr', 'hr',
    'k', 'g', 'c', 'j', 't', 'd', 'n', 'p', 'b', 'm', 'y', 'r', 'l', 'v', 'w', 's', 'h', 'z', 'f', 'q', 'x'
  ];
  
  // Vowel patterns sorted by length (longest first)
  const vowelPatterns = ['aa', 'ee', 'ii', 'oo', 'uu', 'ae', 'ai', 'au', 'ou', 'oa', 'ri', 'ru', 'am', 'an', 'a', 'e', 'i', 'o', 'u'];
  
  while (i < lower.length) {
    let consonant: string | null = null;
    let vowel = 'a'; // Default inherent vowel
    let hasExplicitVowel = false;
    
    // Skip non-alphabetic characters
    if (!/[a-z]/.test(lower[i])) {
      i++;
      continue;
    }
    
    // Try to match consonant (longest first)
    for (const pattern of consonantPatterns) {
      if (lower.slice(i).startsWith(pattern)) {
        consonant = pattern;
        i += pattern.length;
        break;
      }
    }
    
    // If we matched a consonant, check for following vowel
    if (consonant) {
      // Look for vowel after consonant
      for (const pattern of vowelPatterns) {
        if (lower.slice(i).startsWith(pattern)) {
          vowel = pattern;
          hasExplicitVowel = true;
          i += pattern.length;
          break;
        }
      }
      
      // Check if this is a word-final or cluster-internal consonant (no vowel follows)
      // In that case, we need to mark it for halant
      if (!hasExplicitVowel) {
        // Check if next char is another consonant or end of word
        const nextChar = lower[i] || '';
        const isNextConsonant = /[bcdfghjklmnpqrstvwxyz]/.test(nextChar);
        const isEndOfWord = !nextChar || !/[a-z]/.test(nextChar);
        
        if (isNextConsonant || isEndOfWord) {
          // This consonant has no following vowel - use halant
          vowel = '';
          hasExplicitVowel = false;
        }
      }
      
      syllables.push({ consonant, vowel, hasExplicitVowel });
    } else {
      // Standalone vowel (no preceding consonant)
      for (const pattern of vowelPatterns) {
        if (lower.slice(i).startsWith(pattern)) {
          vowel = pattern;
          hasExplicitVowel = true;
          i += pattern.length;
          break;
        }
      }
      
      if (hasExplicitVowel) {
        syllables.push({ consonant: null, vowel, hasExplicitVowel });
      } else {
        // Unknown character, skip
        i++;
      }
    }
  }
  
  return syllables;
}

/**
 * Convert a single word from Latin to native script
 * 
 * FIXED: Properly handles:
 * - Consonant clusters with halant
 * - Word-final consonants
 * - Inherent vowel suppression
 */
function transliterateWord(word: string, config: LanguageConfig): string {
  if (!word.trim()) return word;
  
  // Preserve punctuation
  const punctMatch = word.match(/^([.,!?;:'"()[\]{}]*)(.*?)([.,!?;:'"()[\]{}]*)$/);
  const prefix = punctMatch?.[1] || '';
  const core = punctMatch?.[2] || word;
  const suffix = punctMatch?.[3] || '';
  
  if (!core) return word;
  
  // Check if word contains non-Latin characters - return as-is
  if (!/^[a-zA-Z]+$/.test(core)) {
    return word;
  }
  
  const syllables = parseToSyllables(core);
  
  if (syllables.length === 0) {
    return word;
  }
  
  let result = '';
  
  for (let i = 0; i < syllables.length; i++) {
    const { consonant, vowel, hasExplicitVowel } = syllables[i];
    
    if (consonant) {
      // Get consonant character
      const consonantChar = config.consonants[consonant];
      if (!consonantChar) {
        // Unknown consonant - keep original Latin letter
        result += consonant;
        continue;
      }
      
      result += consonantChar;
      
      // Determine vowel sign
      if (vowel === '' || (!hasExplicitVowel && vowel === 'a')) {
        // Check if next syllable has a consonant (consonant cluster)
        const nextSyllable = syllables[i + 1];
        if (nextSyllable?.consonant) {
          // Add halant for consonant cluster
          result += config.halant;
        } else if (vowel === '') {
          // Word-final consonant with no vowel - add halant
          result += config.halant;
        }
        // else: inherent 'a' vowel - no sign needed (empty string in vowelSigns)
      } else {
        // Explicit vowel - add matra (vowel sign)
        const vowelSign = config.vowelSigns[vowel];
        if (vowelSign !== undefined) {
          result += vowelSign;
        }
      }
    } else if (vowel) {
      // Standalone vowel (word-initial or after another vowel)
      const vowelChar = config.vowels[vowel];
      if (vowelChar) {
        result += vowelChar;
      }
    }
  }
  
  return prefix + result + suffix;
}

/**
 * Main transliteration function
 * Converts Latin script text to target language native script
 */
export function phoneticTransliterate(text: string, targetLanguage: string): string {
  const lang = targetLanguage.toLowerCase().replace(/[_-]/g, '');
  const config = LANGUAGE_CONFIGS[lang];
  
  if (!config) {
    console.log('[PhoneticTransliterator] Unsupported language:', targetLanguage);
    return text;
  }
  
  // Split by whitespace, preserving spaces
  const parts = text.split(/(\s+)/);
  const result = parts.map(part => {
    if (/^\s+$/.test(part)) return part; // Preserve whitespace
    return transliterateWord(part, config);
  }).join('');
  
  console.log('[PhoneticTransliterator]', text, '→', result, `(${targetLanguage})`);
  return result;
}

/**
 * Check if language is supported for phonetic transliteration
 */
export function isPhoneticTransliterationSupported(language: string): boolean {
  const lang = language.toLowerCase().replace(/[_-]/g, '');
  return lang in LANGUAGE_CONFIGS;
}

/**
 * Get list of supported languages for phonetic transliteration
 */
export function getSupportedPhoneticLanguages(): string[] {
  return ['telugu', 'hindi', 'tamil', 'bengali', 'kannada', 'malayalam', 'marathi', 'gujarati', 'punjabi'];
}

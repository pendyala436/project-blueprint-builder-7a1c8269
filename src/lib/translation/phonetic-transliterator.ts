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
  // Standalone vowel signs
  'am': 'అం', 'ah': 'అః'
};

const TELUGU_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ా', 'i': 'ి', 'ii': 'ీ', 'ee': 'ీ',
  'u': 'ు', 'uu': 'ూ', 'oo': 'ూ',
  'e': 'ె', 'ae': 'ే', 'ai': 'ై',
  'o': 'ొ', 'oa': 'ో', 'au': 'ౌ', 'ou': 'ౌ',
  'ri': 'ృ', 'ru': 'ృ',
  'am': 'ం', 'n': 'ం', // anusvara
};

const TELUGU_CONSONANTS: Record<string, string> = {
  // Velars
  'k': 'క', 'kh': 'ఖ', 'g': 'గ', 'gh': 'ఘ', 'ng': 'ఙ',
  // Palatals
  'ch': 'చ', 'chh': 'ఛ', 'j': 'జ', 'jh': 'ఝ', 'ny': 'ఞ', 'gn': 'జ్ఞ',
  // Retroflexes
  't': 'ట', 'th': 'ఠ', 'd': 'డ', 'dh': 'ఢ', 'n': 'న',
  // Dentals - using same as retroflexes for simplicity
  // Labials
  'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
  // Semi-vowels
  'y': 'య', 'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ',
  // Sibilants & Aspirate
  'sh': 'శ', 's': 'స', 'h': 'హ',
  // Additional
  'z': 'జ', 'x': 'క్స', 'q': 'క',
  // Conjuncts that need special handling
  'ksh': 'క్ష', 'ks': 'క్స', 'tr': 'ట్ర', 'pr': 'ప్ర',
};

const TELUGU_HALANT = '్';

// Hindi phonetic mapping
const HINDI_VOWELS: Record<string, string> = {
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'ee': 'ई',
  'u': 'उ', 'uu': 'ऊ', 'oo': 'ऊ',
  'e': 'ए', 'ai': 'ऐ',
  'o': 'ओ', 'au': 'औ', 'ou': 'औ',
  'ri': 'ऋ',
};

const HINDI_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ा', 'i': 'ि', 'ii': 'ी', 'ee': 'ी',
  'u': 'ु', 'uu': 'ू', 'oo': 'ू',
  'e': 'े', 'ai': 'ै',
  'o': 'ो', 'au': 'ौ', 'ou': 'ौ',
  'ri': 'ृ',
  'am': 'ं', 'n': 'ं',
};

const HINDI_CONSONANTS: Record<string, string> = {
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  'sh': 'श', 's': 'स', 'h': 'ह',
  'z': 'ज़', 'q': 'क़',
  'ksh': 'क्ष', 'tr': 'त्र', 'gy': 'ज्ञ',
};

const HINDI_HALANT = '्';

// Tamil phonetic mapping
const TAMIL_VOWELS: Record<string, string> = {
  'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'ee': 'ஈ',
  'u': 'உ', 'uu': 'ஊ', 'oo': 'ஊ',
  'e': 'எ', 'ae': 'ஏ', 'ai': 'ஐ',
  'o': 'ஒ', 'oa': 'ஓ', 'au': 'ஔ',
};

const TAMIL_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ா', 'i': 'ி', 'ii': 'ீ', 'ee': 'ீ',
  'u': 'ு', 'uu': 'ூ', 'oo': 'ூ',
  'e': 'ெ', 'ae': 'ே', 'ai': 'ை',
  'o': 'ொ', 'oa': 'ோ', 'au': 'ௌ',
  'am': 'ம்',
};

const TAMIL_CONSONANTS: Record<string, string> = {
  'k': 'க', 'g': 'க', 'ng': 'ங',
  'ch': 'ச', 'j': 'ச', 'ny': 'ஞ',
  't': 'ட', 'd': 'ட', 'n': 'ந',
  'p': 'ப', 'b': 'ப', 'm': 'ம',
  'y': 'ய', 'r': 'ர', 'l': 'ல', 'v': 'வ', 'w': 'வ',
  'zh': 'ழ', 's': 'ஸ', 'sh': 'ஷ', 'h': 'ஹ',
  'nn': 'ண', 'la': 'ள',
};

const TAMIL_HALANT = '்';

// Bengali phonetic mapping
const BENGALI_VOWELS: Record<string, string> = {
  'a': 'অ', 'aa': 'আ', 'i': 'ই', 'ii': 'ঈ', 'ee': 'ঈ',
  'u': 'উ', 'uu': 'ঊ', 'oo': 'ঊ',
  'e': 'এ', 'ai': 'ঐ',
  'o': 'ও', 'au': 'ঔ',
  'ri': 'ঋ',
};

const BENGALI_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'া', 'i': 'ি', 'ii': 'ী', 'ee': 'ী',
  'u': 'ু', 'uu': 'ূ', 'oo': 'ূ',
  'e': 'ে', 'ai': 'ৈ',
  'o': 'ো', 'au': 'ৌ',
  'ri': 'ৃ',
  'am': 'ং', 'n': 'ং',
};

const BENGALI_CONSONANTS: Record<string, string> = {
  'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ঙ',
  'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'ny': 'ঞ',
  't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন',
  'p': 'প', 'ph': 'ফ', 'f': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
  'y': 'য', 'r': 'র', 'l': 'ল', 'v': 'ভ', 'w': 'ও',
  'sh': 'শ', 's': 'স', 'h': 'হ',
};

const BENGALI_HALANT = '্';

// Kannada phonetic mapping
const KANNADA_VOWELS: Record<string, string> = {
  'a': 'ಅ', 'aa': 'ಆ', 'i': 'ಇ', 'ii': 'ಈ', 'ee': 'ಈ',
  'u': 'ಉ', 'uu': 'ಊ', 'oo': 'ಊ',
  'e': 'ಎ', 'ae': 'ಏ', 'ai': 'ಐ',
  'o': 'ಒ', 'oa': 'ಓ', 'au': 'ಔ',
  'ri': 'ಋ',
};

const KANNADA_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ಾ', 'i': 'ಿ', 'ii': 'ೀ', 'ee': 'ೀ',
  'u': 'ು', 'uu': 'ೂ', 'oo': 'ೂ',
  'e': 'ೆ', 'ae': 'ೇ', 'ai': 'ೈ',
  'o': 'ೊ', 'oa': 'ೋ', 'au': 'ೌ',
  'ri': 'ೃ',
  'am': 'ಂ', 'n': 'ಂ',
};

const KANNADA_CONSONANTS: Record<string, string> = {
  'k': 'ಕ', 'kh': 'ಖ', 'g': 'ಗ', 'gh': 'ಘ', 'ng': 'ಙ',
  'ch': 'ಚ', 'chh': 'ಛ', 'j': 'ಜ', 'jh': 'ಝ', 'ny': 'ಞ',
  't': 'ಟ', 'th': 'ಠ', 'd': 'ಡ', 'dh': 'ಢ', 'n': 'ನ',
  'p': 'ಪ', 'ph': 'ಫ', 'f': 'ಫ', 'b': 'ಬ', 'bh': 'ಭ', 'm': 'ಮ',
  'y': 'ಯ', 'r': 'ರ', 'l': 'ಲ', 'v': 'ವ', 'w': 'ವ',
  'sh': 'ಶ', 's': 'ಸ', 'h': 'ಹ',
};

const KANNADA_HALANT = '್';

// Malayalam phonetic mapping
const MALAYALAM_VOWELS: Record<string, string> = {
  'a': 'അ', 'aa': 'ആ', 'i': 'ഇ', 'ii': 'ഈ', 'ee': 'ഈ',
  'u': 'ഉ', 'uu': 'ഊ', 'oo': 'ഊ',
  'e': 'എ', 'ae': 'ഏ', 'ai': 'ഐ',
  'o': 'ഒ', 'oa': 'ഓ', 'au': 'ഔ',
  'ri': 'ഋ',
};

const MALAYALAM_VOWEL_SIGNS: Record<string, string> = {
  'a': '', 'aa': 'ാ', 'i': 'ി', 'ii': 'ീ', 'ee': 'ീ',
  'u': 'ു', 'uu': 'ൂ', 'oo': 'ൂ',
  'e': 'െ', 'ae': 'േ', 'ai': 'ൈ',
  'o': 'ൊ', 'oa': 'ോ', 'au': 'ൌ',
  'ri': 'ൃ',
  'am': 'ം', 'n': 'ം',
};

const MALAYALAM_CONSONANTS: Record<string, string> = {
  'k': 'ക', 'kh': 'ഖ', 'g': 'ഗ', 'gh': 'ഘ', 'ng': 'ങ',
  'ch': 'ച', 'chh': 'ഛ', 'j': 'ജ', 'jh': 'ഝ', 'ny': 'ഞ',
  't': 'ട', 'th': 'ഠ', 'd': 'ഡ', 'dh': 'ഢ', 'n': 'ന',
  'p': 'പ', 'ph': 'ഫ', 'f': 'ഫ', 'b': 'ബ', 'bh': 'ഭ', 'm': 'മ',
  'y': 'യ', 'r': 'ര', 'l': 'ല', 'v': 'വ', 'w': 'വ',
  'sh': 'ശ', 's': 'സ', 'h': 'ഹ', 'zh': 'ഴ',
};

const MALAYALAM_HALANT = '്';

// Language configuration
interface LanguageConfig {
  vowels: Record<string, string>;
  vowelSigns: Record<string, string>;
  consonants: Record<string, string>;
  halant: string;
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  te: { vowels: TELUGU_VOWELS, vowelSigns: TELUGU_VOWEL_SIGNS, consonants: TELUGU_CONSONANTS, halant: TELUGU_HALANT },
  telugu: { vowels: TELUGU_VOWELS, vowelSigns: TELUGU_VOWEL_SIGNS, consonants: TELUGU_CONSONANTS, halant: TELUGU_HALANT },
  hi: { vowels: HINDI_VOWELS, vowelSigns: HINDI_VOWEL_SIGNS, consonants: HINDI_CONSONANTS, halant: HINDI_HALANT },
  hindi: { vowels: HINDI_VOWELS, vowelSigns: HINDI_VOWEL_SIGNS, consonants: HINDI_CONSONANTS, halant: HINDI_HALANT },
  ta: { vowels: TAMIL_VOWELS, vowelSigns: TAMIL_VOWEL_SIGNS, consonants: TAMIL_CONSONANTS, halant: TAMIL_HALANT },
  tamil: { vowels: TAMIL_VOWELS, vowelSigns: TAMIL_VOWEL_SIGNS, consonants: TAMIL_CONSONANTS, halant: TAMIL_HALANT },
  bn: { vowels: BENGALI_VOWELS, vowelSigns: BENGALI_VOWEL_SIGNS, consonants: BENGALI_CONSONANTS, halant: BENGALI_HALANT },
  bengali: { vowels: BENGALI_VOWELS, vowelSigns: BENGALI_VOWEL_SIGNS, consonants: BENGALI_CONSONANTS, halant: BENGALI_HALANT },
  kn: { vowels: KANNADA_VOWELS, vowelSigns: KANNADA_VOWEL_SIGNS, consonants: KANNADA_CONSONANTS, halant: KANNADA_HALANT },
  kannada: { vowels: KANNADA_VOWELS, vowelSigns: KANNADA_VOWEL_SIGNS, consonants: KANNADA_CONSONANTS, halant: KANNADA_HALANT },
  ml: { vowels: MALAYALAM_VOWELS, vowelSigns: MALAYALAM_VOWEL_SIGNS, consonants: MALAYALAM_CONSONANTS, halant: MALAYALAM_HALANT },
  malayalam: { vowels: MALAYALAM_VOWELS, vowelSigns: MALAYALAM_VOWEL_SIGNS, consonants: MALAYALAM_CONSONANTS, halant: MALAYALAM_HALANT },
};

/**
 * Parse a word into syllables (consonant clusters + vowels)
 * Returns array of { consonant, vowel } pairs
 */
function parseToSyllables(word: string): Array<{ consonant: string | null; vowel: string }> {
  const syllables: Array<{ consonant: string | null; vowel: string }> = [];
  const lower = word.toLowerCase();
  let i = 0;
  
  while (i < lower.length) {
    let consonant: string | null = null;
    let vowel = 'a'; // Default inherent vowel
    
    // Try to match consonant clusters (longest first)
    const consonantPatterns = ['ksh', 'chh', 'th', 'dh', 'bh', 'ph', 'gh', 'kh', 'jh', 'sh', 'ch', 'ng', 'ny'];
    let foundConsonant = false;
    
    for (const pattern of consonantPatterns) {
      if (lower.slice(i).startsWith(pattern)) {
        consonant = pattern;
        i += pattern.length;
        foundConsonant = true;
        break;
      }
    }
    
    // Single consonant
    if (!foundConsonant) {
      const c = lower[i];
      if (/[bcdfghjklmnpqrstvwxyz]/.test(c)) {
        consonant = c;
        i++;
      }
    }
    
    // Check for vowel (longest first)
    const vowelPatterns = ['aa', 'ee', 'ii', 'oo', 'uu', 'ae', 'ai', 'au', 'ou', 'oa', 'ri', 'ru', 'am'];
    let foundVowel = false;
    
    for (const pattern of vowelPatterns) {
      if (lower.slice(i).startsWith(pattern)) {
        vowel = pattern;
        i += pattern.length;
        foundVowel = true;
        break;
      }
    }
    
    // Single vowel
    if (!foundVowel && i < lower.length) {
      const v = lower[i];
      if (/[aeiou]/.test(v)) {
        vowel = v;
        i++;
      } else if (consonant === null) {
        // Not a vowel or consonant, skip
        i++;
        continue;
      }
    }
    
    // If we found nothing, skip character
    if (consonant === null && !foundVowel && !(/[aeiou]/.test(lower[i - 1] || ''))) {
      continue;
    }
    
    syllables.push({ consonant, vowel });
  }
  
  return syllables;
}

/**
 * Convert a single word from Latin to native script
 */
function transliterateWord(word: string, config: LanguageConfig): string {
  if (!word.trim()) return word;
  
  // Preserve punctuation
  const punctMatch = word.match(/^([.,!?;:'"]*)(.*?)([.,!?;:'"']*)$/);
  const prefix = punctMatch?.[1] || '';
  const core = punctMatch?.[2] || word;
  const suffix = punctMatch?.[3] || '';
  
  if (!core) return word;
  
  const syllables = parseToSyllables(core);
  let result = '';
  
  for (let i = 0; i < syllables.length; i++) {
    const { consonant, vowel } = syllables[i];
    const isLastSyllable = i === syllables.length - 1;
    
    if (consonant) {
      // Add consonant
      const consonantChar = config.consonants[consonant];
      if (!consonantChar) {
        // Unknown consonant, keep original
        result += consonant;
        continue;
      }
      result += consonantChar;
      
      // Check if next syllable starts with consonant (consonant cluster)
      const nextSyllable = syllables[i + 1];
      if (nextSyllable?.consonant && !nextSyllable.vowel) {
        // Add halant for conjunct
        result += config.halant;
      } else {
        // Add vowel sign (matra)
        const vowelSign = config.vowelSigns[vowel];
        if (vowelSign !== undefined) {
          result += vowelSign;
        }
      }
    } else {
      // Standalone vowel
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
  return ['telugu', 'hindi', 'tamil', 'bengali', 'kannada', 'malayalam'];
}

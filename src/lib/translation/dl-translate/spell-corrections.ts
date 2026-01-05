/**
 * Spell Correction for Transliteration
 * 
 * Handles common spelling mistakes in phonetic/Latin input
 * and provides corrections for better native script output
 */

// Common spelling corrections for Indian languages
// Maps common typos/variants to correct phonetic form

export const HINDI_CORRECTIONS: Record<string, string> = {
  // Common word corrections
  'namste': 'namaste',
  'namestey': 'namaste',
  'namasthe': 'namaste',
  'namaskar': 'namaskar',
  'namaskaar': 'namaskar',
  'dhanyvaad': 'dhanyavaad',
  'dhanyawad': 'dhanyavaad',
  'dhanyabad': 'dhanyavaad',
  'shukriya': 'shukriya',
  'sukria': 'shukriya',
  'accha': 'accha',
  'acha': 'accha',
  'thik': 'theek',
  'theek': 'theek',
  'teek': 'theek',
  'kaise': 'kaise',
  'kese': 'kaise',
  'kaisey': 'kaise',
  'kyun': 'kyon',
  'kiyu': 'kyon',
  'kyo': 'kyon',
  'haan': 'haan',
  'han': 'haan',
  'nahin': 'nahin',
  'nahi': 'nahin',
  'nai': 'nahin',
  'mein': 'main',
  'mai': 'main',
  'hum': 'ham',
  'tum': 'tum',
  'aap': 'aap',
  'ap': 'aap',
  'yeh': 'yah',
  'ye': 'yah',
  'woh': 'vah',
  'wo': 'vah',
  'vo': 'vah',
  'kya': 'kya',
  'kiya': 'kiya',
  'kar': 'kar',
  'karo': 'karo',
  'karunga': 'karoonga',
  'jayenge': 'jaayenge',
  'jaenge': 'jaayenge',
  'aayega': 'aayega',
  'ayega': 'aayega',
  'dekho': 'dekho',
  'dekha': 'dekha',
  'suno': 'suno',
  'sunlo': 'sun lo',
  'bolo': 'bolo',
  'bolna': 'bolna',
  'pyar': 'pyaar',
  'pyaar': 'pyaar',
  'mohabbat': 'mohabbat',
  'ishq': 'ishq',
  'dost': 'dost',
  'dosth': 'dost',
};

export const TELUGU_CORRECTIONS: Record<string, string> = {
  // Common word corrections
  'namaskaram': 'namaskaram',
  'namaskaaramu': 'namaskaaramu',
  'namaskaramulu': 'namaskaralu',
  'ela': 'ela',
  'ela unnaru': 'ela unnaru',
  'elunnaru': 'ela unnaru',
  'bagunnara': 'baagunnaaraa',
  'bagunara': 'baagunnaaraa',
  'bagundi': 'baagundi',
  'bagundhi': 'baagundi',
  'dhanyavadalu': 'dhanyavaadaalu',
  'dhanyavadamulu': 'dhanyavaadaalu',
  'nenu': 'nenu',
  'neenu': 'nenu',
  'meeru': 'meeru',
  'miru': 'meeru',
  'idi': 'idi',
  'adi': 'adi',
  'emi': 'emi',
  'emiti': 'emiti',
  'enduku': 'enduku',
  'endkuu': 'enduku',
  'avunu': 'avunu',
  'avnu': 'avunu',
  'kadhu': 'kaadu',
  'kadu': 'kaadu',
  'kaadhu': 'kaadu',
  'vellipothunna': 'vellipothunna',
  'vellipotha': 'vellipotaanu',
  'raandi': 'raandi',
  'randi': 'raandi',
  'vachindi': 'vachindi',
  'vacchindi': 'vachindi',
  'chesindi': 'chesindi',
  'chestunna': 'chestunnaanu',
  'chestuna': 'chestunnaanu',
  'cheppandi': 'cheppandi',
  'chepandi': 'cheppandi',
  'vinandi': 'vinandi',
  'chudu': 'choodu',
  'chodu': 'choodu',
  'prema': 'prema',
  'premainchaanu': 'preminchanu',
};

export const TAMIL_CORRECTIONS: Record<string, string> = {
  'vanakkam': 'vanakkam',
  'vanakam': 'vanakkam',
  'nandri': 'nandri',
  'nanri': 'nandri',
  'eppadi': 'eppadi',
  'epdi': 'eppadi',
  'nalla': 'nalla',
  'nala': 'nalla',
  'irukken': 'irukken',
  'iruken': 'irukken',
  'irukireen': 'irukkireen',
  'naan': 'naan',
  'nan': 'naan',
  'neenga': 'neenga',
  'neengal': 'neengal',
  'ninga': 'neenga',
  'avan': 'avan',
  'aval': 'aval',
  'enna': 'enna',
  'ena': 'enna',
  'yenna': 'enna',
  'yaen': 'yaen',
  'yen': 'yaen',
  'aamaam': 'aamaam',
  'amam': 'aamaam',
  'illai': 'illai',
  'illa': 'illai',
  'ile': 'illai',
  'vandhen': 'vandhen',
  'vanthen': 'vandhen',
  'povom': 'povom',
  'poom': 'povom',
  'kaadhal': 'kaadhal',
  'kadhal': 'kaadhal',
  'anbu': 'anbu',
};

export const KANNADA_CORRECTIONS: Record<string, string> = {
  'namaskara': 'namaskara',
  'namaskaar': 'namaskara',
  'hegiddira': 'hegiddira',
  'hegiddeeraa': 'hegiddira',
  'chennagiddini': 'chennagiddini',
  'chenagidini': 'chennagiddini',
  'dhanyavaadagalu': 'dhanyavaadagalu',
  'dhanyavadagalu': 'dhanyavaadagalu',
  'naanu': 'naanu',
  'nanu': 'naanu',
  'neenu': 'neenu',
  'nenu': 'neenu',
  'neevu': 'neevu',
  'nivu': 'neevu',
  'idu': 'idu',
  'adu': 'adu',
  'yaake': 'yaake',
  'yake': 'yaake',
  'howdu': 'howdu',
  'houdu': 'howdu',
  'illa': 'illa',
  'ila': 'illa',
  'baa': 'baa',
  'banni': 'banni',
  'hogu': 'hogu',
  'hogona': 'hogona',
  'maadu': 'maadu',
  'madu': 'maadu',
  'nodu': 'nodu',
  'noodu': 'nodu',
  'preeti': 'preeti',
  'priti': 'preeti',
};

export const MALAYALAM_CORRECTIONS: Record<string, string> = {
  'namaskkaram': 'namaskkaaram',
  'namaskaram': 'namaskkaaram',
  'sughamano': 'sughamano',
  'sugamano': 'sughamano',
  'nandhi': 'nandhi',
  'nandi': 'nandhi',
  'njaan': 'njaan',
  'njan': 'njaan',
  'ningal': 'ningal',
  'nigal': 'ningal',
  'avan': 'avan',
  'aval': 'aval',
  'enthu': 'enthu',
  'entu': 'enthu',
  'enthaa': 'enthaa',
  'enta': 'enthaa',
  'athe': 'athe',
  'alla': 'alla',
  'ala': 'alla',
  'vaa': 'vaa',
  'va': 'vaa',
  'poo': 'poo',
  'po': 'poo',
  'cheyyu': 'cheyyu',
  'cheyu': 'cheyyu',
  'kaanu': 'kaanu',
  'kanu': 'kaanu',
  'sneham': 'sneham',
  'snheam': 'sneham',
};

export const BENGALI_CORRECTIONS: Record<string, string> = {
  'nomoskar': 'namaskar',
  'namaskar': 'namaskar',
  'namaskaar': 'namaskar',
  'kemon': 'kemon',
  'kamon': 'kemon',
  'bhalo': 'bhaalo',
  'balo': 'bhaalo',
  'dhonnobad': 'dhanyabaad',
  'dhanyabad': 'dhanyabaad',
  'ami': 'aami',
  'aami': 'aami',
  'tumi': 'tumi',
  'apni': 'aapni',
  'aponi': 'aapni',
  'ki': 'ki',
  'keno': 'keno',
  'kano': 'keno',
  'haan': 'haan',
  'han': 'haan',
  'na': 'naa',
  'naa': 'naa',
  'esho': 'esho',
  'eso': 'esho',
  'jao': 'jao',
  'koro': 'koro',
  'dekho': 'dekho',
  'bhalobasha': 'bhalobasa',
  'bhalobasa': 'bhalobasa',
};

export const GUJARATI_CORRECTIONS: Record<string, string> = {
  'namaste': 'namaste',
  'namstey': 'namaste',
  'kemcho': 'kem cho',
  'kem cho': 'kem cho',
  'majama': 'majaamaa',
  'maja ma': 'majaamaa',
  'aabhar': 'aabhaar',
  'abhar': 'aabhaar',
  'hu': 'hun',
  'hun': 'hun',
  'tame': 'tame',
  'tamey': 'tame',
  'aa': 'aa',
  'te': 'te',
  'shu': 'shu',
  'kem': 'kem',
  'haa': 'haa',
  'ha': 'haa',
  'naa': 'naa',
  'na': 'naa',
  'aavo': 'aavo',
  'avo': 'aavo',
  'jao': 'jao',
  'karo': 'karo',
  'juo': 'juo',
  'prem': 'prem',
  'preema': 'prem',
};

export const PUNJABI_CORRECTIONS: Record<string, string> = {
  'satsriakaal': 'sat sri akaal',
  'sat sri akal': 'sat sri akaal',
  'sat shri akal': 'sat sri akaal',
  'kidaan': 'ki haal',
  'ki haal': 'ki haal',
  'vadiya': 'vadiya',
  'vadia': 'vadiya',
  'dhanyavaad': 'dhanyavaad',
  'dhanyavad': 'dhanyavaad',
  'main': 'main',
  'mai': 'main',
  'tussi': 'tussi',
  'tusi': 'tussi',
  'ih': 'ih',
  'uh': 'uh',
  'ki': 'ki',
  'kyon': 'kyon',
  'kiun': 'kyon',
  'haan': 'haanjee',
  'haanji': 'haanjee',
  'nahi': 'naheen',
  'nahin': 'naheen',
  'aao': 'aao',
  'jao': 'jao',
  'karo': 'karo',
  'dekho': 'dekho',
  'pyaar': 'pyaar',
  'pyar': 'pyaar',
};

// Master corrections map by language
export const LANGUAGE_CORRECTIONS: Record<string, Record<string, string>> = {
  'hindi': HINDI_CORRECTIONS,
  'hin_Deva': HINDI_CORRECTIONS,
  'telugu': TELUGU_CORRECTIONS,
  'tel_Telu': TELUGU_CORRECTIONS,
  'tamil': TAMIL_CORRECTIONS,
  'tam_Taml': TAMIL_CORRECTIONS,
  'kannada': KANNADA_CORRECTIONS,
  'kan_Knda': KANNADA_CORRECTIONS,
  'malayalam': MALAYALAM_CORRECTIONS,
  'mal_Mlym': MALAYALAM_CORRECTIONS,
  'bengali': BENGALI_CORRECTIONS,
  'ben_Beng': BENGALI_CORRECTIONS,
  'gujarati': GUJARATI_CORRECTIONS,
  'guj_Gujr': GUJARATI_CORRECTIONS,
  'punjabi': PUNJABI_CORRECTIONS,
  'pan_Guru': PUNJABI_CORRECTIONS,
};

/**
 * Apply spelling corrections to input text
 */
export function applySpellCorrections(
  text: string,
  language: string
): { correctedText: string; corrections: string[] } {
  const corrections: string[] = [];
  const langCorrections = LANGUAGE_CORRECTIONS[language.toLowerCase()];
  
  if (!langCorrections) {
    return { correctedText: text, corrections: [] };
  }
  
  let correctedText = text.toLowerCase();
  const words = correctedText.split(/\s+/);
  
  const correctedWords = words.map(word => {
    // Remove punctuation for matching
    const cleanWord = word.replace(/[.,!?;:'"()]/g, '');
    const punctuation = word.slice(cleanWord.length);
    
    if (langCorrections[cleanWord] && langCorrections[cleanWord] !== cleanWord) {
      corrections.push(`${cleanWord} → ${langCorrections[cleanWord]}`);
      return langCorrections[cleanWord] + punctuation;
    }
    return word;
  });
  
  return {
    correctedText: correctedWords.join(' '),
    corrections,
  };
}

/**
 * Suggest corrections for a word
 */
export function suggestCorrections(
  word: string,
  language: string
): string[] {
  const langCorrections = LANGUAGE_CORRECTIONS[language.toLowerCase()];
  if (!langCorrections) return [];
  
  const suggestions: string[] = [];
  const lowerWord = word.toLowerCase();
  
  // Exact match
  if (langCorrections[lowerWord]) {
    suggestions.push(langCorrections[lowerWord]);
  }
  
  // Find similar words (simple edit distance check)
  for (const [key, value] of Object.entries(langCorrections)) {
    if (key !== lowerWord && isSimilar(lowerWord, key)) {
      suggestions.push(value);
    }
  }
  
  return [...new Set(suggestions)].slice(0, 3);
}

/**
 * Simple similarity check (basic edit distance approximation)
 */
function isSimilar(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 2) return false;
  
  let matches = 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length >= b.length ? a : b;
  
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] === longer[i]) matches++;
  }
  
  return matches >= shorter.length * 0.7;
}

/**
 * Validate transliteration output for common errors
 */
export function validateTransliteration(
  input: string,
  output: string,
  language: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for unconverted Latin characters in native output
  const latinPattern = /[a-zA-Z]{3,}/g;
  const latinMatches = output.match(latinPattern);
  if (latinMatches && latinMatches.length > 0) {
    errors.push(`Unconverted text detected: ${latinMatches.join(', ')}`);
  }
  
  // Check output is not empty when input is not empty
  if (input.trim().length > 0 && output.trim().length === 0) {
    errors.push('Empty output for non-empty input');
  }
  
  // Check for broken Unicode (replacement characters)
  if (output.includes('\uFFFD')) {
    errors.push('Invalid Unicode characters detected');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

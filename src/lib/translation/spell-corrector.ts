/**
 * Spell Corrector for Phonetic Input
 * 
 * Corrects common spelling mistakes in Latin-letter input
 * before transliteration/translation
 */

// Common spelling corrections for phonetic input
const SPELLING_CORRECTIONS: Record<string, string> = {
  // Hindi phonetic corrections
  'namste': 'namaste',
  'namasthe': 'namaste',
  'namaskar': 'namaskaar',
  'dhanyvaad': 'dhanyavad',
  'dhanywad': 'dhanyavad',
  'shukriya': 'shukriyaa',
  'bahoot': 'bahut',
  'bohot': 'bahut',
  'bohat': 'bahut',
  'accha': 'achha',
  'acha': 'achha',
  'thik': 'theek',
  'teek': 'theek',
  'kaise': 'kaise',
  'kese': 'kaise',
  'kaisey': 'kaise',
  'haan': 'haan',
  'han': 'haan',
  'nahi': 'nahi',
  'nahin': 'nahi',
  'nhi': 'nahi',
  'kya': 'kya',
  'kiya': 'kya',
  'kyun': 'kyun',
  'kyon': 'kyun',
  'mujhe': 'mujhe',
  'muje': 'mujhe',
  'tumhe': 'tumhe',
  'tumko': 'tumhe',
  'aapko': 'aapko',
  'apko': 'aapko',
  
  // Telugu phonetic corrections
  'bagunnava': 'bagunnava',
  'bagunnara': 'bagunnara',
  'bagundi': 'bagundi',
  'dhanyavadalu': 'dhanyavaadalu',
  'dhanyavaadaalu': 'dhanyavaadalu',
  'subhodayam': 'shubhodayam',
  'manchidi': 'manchidi',
  'manchi': 'manchidi',
  
  // Tamil phonetic corrections
  'vanakkam': 'vanakkam',
  'vannakam': 'vanakkam',
  'nandri': 'nandri',
  'nanri': 'nandri',
  
  // Common English typos in chat
  'helo': 'hello',
  'hllo': 'hello',
  'helllo': 'hello',
  'hai': 'hi',
  'hii': 'hi',
  'byee': 'bye',
  'byeee': 'bye',
  'thnx': 'thanks',
  'thx': 'thanks',
  'thanx': 'thanks',
  'pls': 'please',
  'plz': 'please',
  'plss': 'please',
  'sry': 'sorry',
  'srry': 'sorry',
  'gud': 'good',
  'gd': 'good',
  'morng': 'morning',
  'mornin': 'morning',
  'nite': 'night',
  'nyt': 'night',
  'evng': 'evening',
  'evning': 'evening',
  'luv': 'love',
  'lov': 'love',
  'u': 'you',
  'ur': 'your',
  'r': 'are',
  'y': 'why',
  'hw': 'how',
  'wht': 'what',
  'wat': 'what',
  'wen': 'when',
  'wer': 'where',
  'whr': 'where',
  'msg': 'message',
  'msgs': 'messages',
  'pic': 'picture',
  'pics': 'pictures',
  'bcoz': 'because',
  'coz': 'because',
  'cuz': 'because',
  'bro': 'brother',
  'sis': 'sister',
  'frnd': 'friend',
  'frnds': 'friends',
  'tmrw': 'tomorrow',
  'tmr': 'tomorrow',
  'tdy': 'today',
  'yday': 'yesterday',
  'ystrday': 'yesterday',
};

// Common phrase corrections
const PHRASE_CORRECTIONS: Record<string, string> = {
  'how r u': 'how are you',
  'hw r u': 'how are you',
  'how ru': 'how are you',
  'wats up': 'what\'s up',
  'whats up': 'what\'s up',
  'wassup': 'what\'s up',
  'sup': 'what\'s up',
  'gm': 'good morning',
  'gn': 'good night',
  'ge': 'good evening',
  'gd mrng': 'good morning',
  'gd nyt': 'good night',
  'gd evng': 'good evening',
  'ty': 'thank you',
  'tysm': 'thank you so much',
  'tyvm': 'thank you very much',
  'ily': 'i love you',
  'imy': 'i miss you',
  'wbu': 'what about you',
  'hbu': 'how about you',
  'idk': 'i don\'t know',
  'idc': 'i don\'t care',
  'tbh': 'to be honest',
  'imo': 'in my opinion',
  'btw': 'by the way',
  'brb': 'be right back',
  'gtg': 'got to go',
  'g2g': 'got to go',
  'ttyl': 'talk to you later',
  'lol': 'laughing out loud',
  'lmao': 'laughing my ass off',
  'rofl': 'rolling on floor laughing',
  'omg': 'oh my god',
  'omw': 'on my way',
  'np': 'no problem',
  'nw': 'no worries',
  'k': 'okay',
  'kk': 'okay',
  'ofc': 'of course',
  'obv': 'obviously',
  'rn': 'right now',
  'atm': 'at the moment',
  'asap': 'as soon as possible',
};

/**
 * Correct spelling in text
 */
export function correctSpelling(text: string): string {
  if (!text.trim()) return text;
  
  let corrected = text.toLowerCase();
  
  // First, check for phrase corrections
  for (const [wrong, right] of Object.entries(PHRASE_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    corrected = corrected.replace(regex, right);
  }
  
  // Then, check for word corrections
  const words = corrected.split(/(\s+)/);
  const correctedWords = words.map(word => {
    const trimmed = word.trim().toLowerCase();
    return SPELLING_CORRECTIONS[trimmed] || word;
  });
  
  corrected = correctedWords.join('');
  
  // Preserve original case for first letter if original was capitalized
  if (text[0] === text[0].toUpperCase() && text[0] !== text[0].toLowerCase()) {
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  }
  
  return corrected;
}

/**
 * Get spelling suggestion (returns null if no correction needed)
 */
export function getSpellingSuggestion(text: string): string | null {
  const corrected = correctSpelling(text);
  return corrected !== text ? corrected : null;
}

/**
 * Check if text has spelling errors
 */
export function hasSpellingErrors(text: string): boolean {
  return getSpellingSuggestion(text) !== null;
}

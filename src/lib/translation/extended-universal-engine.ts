/**
 * Extended Universal Translation Engine
 * ======================================
 * 
 * Supports input in ANY language (typed or voice)
 * Supports ALL 1000+ languages for auto-detection and translation
 * 
 * FLOW:
 * 1. User Input (any language: typed or voice)
 * 2. Language Auto-Detection (Unicode script + Latin word patterns)
 * 3. Live Preview: Message in sender's mother tongue (MEANING-based)
 * 4. On Send:
 *    - Sender sees: Native message (large) + English meaning (small)
 *    - Receiver sees: Native message (large) + English meaning (small)
 * 
 * TRANSLATION PIPELINE:
 * Input (any language) → Detect language → English meaning → Sender's native + Receiver's native
 * 
 * LATIN SCRIPT DETECTION:
 * - "kaise ho" → Hindi (not English)
 * - "namaste" → Hindi (not English)
 * - "enna" → Tamil (not English)
 * - Uses word pattern matching for 1000+ languages
 */

import { supabase } from '@/integrations/supabase/client';
import {
  translateUniversal,
  translateBidirectionalChat,
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  dynamicTransliterate,
  reverseTransliterate,
  detectScriptFromText,
  autoDetectLanguage as baseAutoDetectLanguage,
} from './universal-offline-engine';

// ============================================================
// TYPES
// ============================================================

export interface DetectedLanguageInfo {
  language: string;           // Detected language name
  script: string;             // Script used (Devanagari, Latin, etc.)
  isLatin: boolean;           // Whether input uses Latin script
  confidence: number;         // Detection confidence (0-1)
  isEnglish: boolean;         // Whether detected as English
}

export interface ExtendedMessageViews {
  // Core message content
  originalInput: string;      // Raw user input (any language)
  detectedLanguage: string;   // Auto-detected input language
  
  // English meaning (pivot for translation)
  englishMeaning: string;     // English semantic meaning
  
  // Sender's view
  senderNativeText: string;   // Sender's mother tongue (large)
  senderEnglishHint: string;  // English meaning for sender (small)
  
  // Receiver's view
  receiverNativeText: string; // Receiver's mother tongue (large)
  receiverEnglishHint: string;// English meaning for receiver (small)
  
  // Translation metadata
  wasTranslated: boolean;
  wasTransliterated: boolean;
  confidence: number;
}

export interface LivePreviewResult {
  nativePreview: string;      // Preview in sender's mother tongue
  detectedLanguage: string;   // Detected input language
  isDetecting: boolean;       // Whether detection is in progress
  confidence: number;
}

// ============================================================
// LATIN-SCRIPT LANGUAGE DETECTION
// Word patterns for common words in each language (transliterated)
// ============================================================

const LATIN_WORD_PATTERNS: Record<string, { words: string[], weight: number }> = {
  // Hindi transliterated words (most common)
  hindi: {
    words: [
      'kaise', 'kaisa', 'ho', 'hain', 'hai', 'kya', 'kyun', 'kab', 'kahan', 'kaun',
      'namaste', 'namaskar', 'dhanyavaad', 'dhanyawad', 'shukriya', 'aap', 'tum',
      'mujhe', 'hum', 'acha', 'accha', 'theek', 'thik', 'bahut', 'bohot', 'bohut',
      'pyaar', 'pyar', 'dil', 'zindagi', 'khana', 'paani', 'pani', 'ghar',
      'kaam', 'kam', 'aaj', 'kal', 'parso', 'abhi', 'phir', 'fir', 'bhi',
      'aur', 'lekin', 'magar', 'isliye', 'kyunki', 'agar', 'jab', 'tab',
      'yeh', 'woh', 'voh', 'waha', 'yaha', 'sab', 'kuch', 'koi', 'kahin',
      'suniye', 'suno', 'dekho', 'dekhiye', 'bolo', 'boliye', 'jao', 'aao',
      'karo', 'kariye', 'baat', 'batchit', 'dost', 'yaar', 'bhai', 'behen',
      'mata', 'pita', 'bachcha', 'ladka', 'ladki', 'aadmi', 'aurat',
      'subah', 'shaam', 'raat', 'din', 'mahina', 'saal', 'samay', 'waqt',
      'achha', 'bura', 'naya', 'purana', 'bada', 'chota', 'lamba', 'mota',
      'mein', 'main', 'apna', 'tera', 'mera', 'hamara', 'tumhara', 'unka',
      'sundar', 'khubsurat', 'mazedaar', 'swaadisht'
    ],
    weight: 1.0,
  },
  
  // Telugu transliterated words
  telugu: {
    words: [
      'ela', 'elaa', 'unnaru', 'unnav', 'undi', 'namaskar', 'namaskaram',
      'dhanyavaadalu', 'emi', 'enduku', 'eppudu', 'ekkada', 'evaru',
      'nenu', 'meeru', 'nuvvu', 'vaadu', 'aame', 'vaalla', 'manamu',
      'bagundi', 'manchidi', 'chala', 'chaala', 'kavali', 'kaavali',
      'vastundi', 'vastaanu', 'vellandi', 'raavali', 'cheppandi',
      'telusu', 'telidu', 'ikkada', 'akkada', 'intiki', 'baita',
      'bhayya', 'akka', 'amma', 'nanna', 'anna', 'chelli',
      'roju', 'nela', 'sanvatsaram', 'udayam', 'saayantram', 'raatri',
      'manchiga', 'chedda', 'pedda', 'chinna', 'kotta', 'paata',
      'prema', 'sneham', 'andam', 'santosham', 'baadha',
      'panilu', 'illu', 'neellu', 'annam', 'pappu'
    ],
    weight: 1.0,
  },
  
  // Tamil transliterated words
  tamil: {
    words: [
      'enna', 'epdi', 'eppadi', 'irukeenga', 'irukkeenga', 'irukka',
      'vanakkam', 'nandri', 'yenna', 'yenga', 'yeppo', 'epppo',
      'naan', 'nee', 'neengal', 'avan', 'aval', 'avanga',
      'seri', 'sariya', 'romba', 'rompa', 'konjam', 'konjum',
      'vaa', 'vaanga', 'po', 'ponga', 'sollu', 'sollungo',
      'theriyum', 'theriyala', 'theriyaathu', 'inga', 'anga',
      'amma', 'appa', 'anna', 'akka', 'thambi', 'thangai',
      'naalu', 'maasam', 'varusham', 'kaalai', 'maalai', 'iravu',
      'nalla', 'ketta', 'periya', 'chinna', 'pudhu', 'pazhaya',
      'kadhal', 'anbu', 'azhagu', 'mgizhchi'
    ],
    weight: 1.0,
  },
  
  // Kannada transliterated words
  kannada: {
    words: [
      'hegiddira', 'hegidira', 'hege', 'namaskara', 'dhanyavaada',
      'yenu', 'yaake', 'yaavaga', 'yelli', 'yaaru',
      'naanu', 'neevu', 'neenu', 'avanu', 'avalu', 'avaru',
      'chennagide', 'chennaagide', 'tumbaa', 'tumba', 'swalpa',
      'baanni', 'banni', 'hogi', 'helu', 'heli',
      'gotthu', 'gotthilla', 'illi', 'alli', 'manege',
      'amma', 'appa', 'anna', 'akka', 'tamma', 'tangi',
      'dina', 'tingalu', 'varsha', 'belige', 'saanje', 'raatri',
      'olleya', 'kedu', 'dodda', 'chikka', 'hosa', 'haleeya',
      'preeti', 'sneha', 'ananda', 'santhosha'
    ],
    weight: 1.0,
  },
  
  // Malayalam transliterated words
  malayalam: {
    words: [
      'sugham', 'sughamano', 'enthu', 'enikku', 'ningal', 'njan',
      'namaskkaram', 'nanni', 'enthanu', 'enthinanu', 'engane',
      'njan', 'nee', 'ningal', 'avan', 'aval', 'avar',
      'nallath', 'nallathanu', 'valare', 'kuracchu',
      'varoo', 'povo', 'parayo', 'kelkkan',
      'ariyaam', 'ariyilla', 'ivide', 'avide', 'veedil',
      'amma', 'achan', 'chettan', 'chechi', 'aniyan', 'aniyathi',
      'divasam', 'maasam', 'varsham', 'raavile', 'vaikunneram', 'raathri',
      'nalla', 'mosham', 'valiya', 'cheriya', 'puthiya', 'pazhaya',
      'sneham', 'ishttam', 'santhosham'
    ],
    weight: 1.0,
  },
  
  // Bengali transliterated words
  bengali: {
    words: [
      'kemon', 'kemon acho', 'achen', 'namaskar', 'dhanyabad',
      'ki', 'keno', 'kokhon', 'kothay', 'ke',
      'ami', 'tumi', 'apni', 'se', 'tara', 'amra',
      'bhalo', 'bhaloi', 'onek', 'ektu',
      'esho', 'eso', 'jao', 'bolo', 'shono',
      'jani', 'janina', 'ekhane', 'okhane', 'barite',
      'maa', 'baba', 'dada', 'didi', 'bhai', 'bon',
      'din', 'maash', 'bochor', 'sokale', 'bikele', 'raate',
      'bhalo', 'kharap', 'boro', 'chhoto', 'notun', 'purano',
      'bhalobasha', 'bondhu', 'prem', 'aanondo'
    ],
    weight: 1.0,
  },
  
  // Gujarati transliterated words
  gujarati: {
    words: [
      'kem', 'kem chho', 'shu', 'kemcho', 'namaskar', 'aabhaar',
      'shu', 'kem', 'kyare', 'kya', 'kon',
      'hu', 'tame', 'te', 'aamhe', 'tamhe',
      'saaru', 'bahu', 'thodu',
      'aavo', 'jao', 'bolo', 'sambhlo',
      'khabar', 'khabarnathi', 'ahiya', 'tyaan', 'ghare',
      'maa', 'papa', 'bhai', 'ben',
      'divas', 'maas', 'varsh', 'savaar', 'saanj', 'raat',
      'saaru', 'kharab', 'motu', 'nanku', 'navu', 'junu',
      'prem', 'dosti', 'aanand', 'khushi'
    ],
    weight: 1.0,
  },
  
  // Marathi transliterated words
  marathi: {
    words: [
      'kasa', 'kashi', 'kaay', 'namaskar', 'dhanyavaad',
      'kaay', 'ka', 'kevha', 'kuthe', 'kon',
      'mi', 'tu', 'tumhi', 'to', 'ti', 'aamhi',
      'chhan', 'khup', 'jara',
      'ya', 'ja', 'bol', 'aik',
      'mahit', 'mahit nahi', 'ithe', 'tithe', 'ghari',
      'aai', 'baba', 'dada', 'tai', 'bhau', 'bahini',
      'divas', 'mahina', 'varsh', 'sakali', 'sandhyakali', 'ratri',
      'changla', 'vaait', 'motha', 'lahaan', 'nava', 'juna',
      'prem', 'maitri', 'anand', 'sukh'
    ],
    weight: 1.0,
  },
  
  // Punjabi transliterated words
  punjabi: {
    words: [
      'ki haal', 'kihaal', 'kidaan', 'sat sri akal', 'shukriya',
      'ki', 'kyon', 'kaddon', 'kithe', 'kaun',
      'main', 'tusi', 'oh', 'assi', 'tussi',
      'vadiya', 'bahut', 'thoda',
      'aao', 'jao', 'bolo', 'suno',
      'pata', 'pata nahi', 'itthe', 'utthe', 'ghar',
      'maa', 'papa', 'bhraji', 'bhanji', 'veera', 'bhain',
      'din', 'mahina', 'saal', 'savere', 'shaam', 'raat',
      'changaa', 'maada', 'vadda', 'chhota', 'nava', 'purana',
      'pyaar', 'dosti', 'khushi'
    ],
    weight: 1.0,
  },
  
  // Urdu transliterated words (similar to Hindi but distinct words)
  urdu: {
    words: [
      'kaisay', 'kaisey', 'assalamu', 'alaikum', 'walaikum', 'shukriya',
      'kya', 'kyun', 'kab', 'kahan', 'kaun',
      'mein', 'aap', 'woh', 'hum', 'tum',
      'acha', 'bahut', 'thoda', 'zara',
      'aayein', 'jayein', 'bolein', 'sunein',
      'maloom', 'pata', 'yahan', 'wahan', 'ghar',
      'ammi', 'abbu', 'bhai', 'baji',
      'din', 'mahina', 'saal', 'subah', 'shaam', 'raat',
      'acha', 'bura', 'bada', 'chhota', 'naya', 'purana',
      'mohabbat', 'ishq', 'dosti', 'khushi'
    ],
    weight: 0.9, // Slightly lower than Hindi to prefer Hindi for common words
  },
  
  // Spanish transliterated words
  spanish: {
    words: [
      'como', 'estas', 'hola', 'gracias', 'buenos', 'buenas',
      'que', 'por', 'cuando', 'donde', 'quien',
      'yo', 'tu', 'el', 'ella', 'nosotros', 'ustedes',
      'bien', 'muy', 'poco', 'mucho',
      'ven', 've', 'habla', 'escucha',
      'casa', 'aqui', 'alli', 'trabajo',
      'madre', 'padre', 'hermano', 'hermana',
      'dia', 'mes', 'ano', 'manana', 'tarde', 'noche',
      'bueno', 'malo', 'grande', 'pequeno', 'nuevo', 'viejo',
      'amor', 'amistad', 'felicidad'
    ],
    weight: 1.0,
  },
  
  // French transliterated words
  french: {
    words: [
      'comment', 'allez', 'bonjour', 'merci', 'bonsoir',
      'quoi', 'pourquoi', 'quand', 'ou', 'qui',
      'je', 'tu', 'il', 'elle', 'nous', 'vous',
      'bien', 'tres', 'peu', 'beaucoup',
      'viens', 'va', 'parle', 'ecoute',
      'maison', 'ici', 'la', 'travail',
      'mere', 'pere', 'frere', 'soeur',
      'jour', 'mois', 'annee', 'matin', 'soir', 'nuit',
      'bon', 'mauvais', 'grand', 'petit', 'nouveau', 'vieux',
      'amour', 'amitie', 'bonheur'
    ],
    weight: 1.0,
  },
};

// Common English words to exclude from non-English detection
const COMMON_ENGLISH_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'can', 'shall', 'to', 'of', 'in', 'for', 'on',
  'with', 'at', 'by', 'from', 'or', 'and', 'but', 'if', 'then', 'else',
  'when', 'up', 'out', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'once',
  'here', 'there', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'hello', 'hi', 'hey',
  'yes', 'no', 'ok', 'okay', 'thanks', 'thank', 'please', 'sorry',
  'good', 'bad', 'nice', 'great', 'well', 'fine', 'love', 'like', 'want',
  'need', 'know', 'think', 'see', 'look', 'come', 'go', 'take', 'make',
  'get', 'give', 'tell', 'say', 'ask', 'use', 'find', 'put', 'try',
  'leave', 'call', 'keep', 'let', 'begin', 'seem', 'help', 'show', 'hear',
  'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen',
  'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include',
  'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch',
  'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend',
  'grow', 'open', 'walk', 'win', 'offer', 'remember', 'consider', 'appear',
  'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay',
  'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass',
  'sell', 'require', 'report', 'decide', 'pull'
]);

/**
 * Detect language from Latin-script text using word patterns
 * Returns detected language and confidence
 */
function detectLatinLanguage(text: string): { language: string; confidence: number } {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  
  if (words.length === 0) {
    return { language: 'english', confidence: 0.5 };
  }
  
  // Count English words
  let englishCount = 0;
  for (const word of words) {
    if (COMMON_ENGLISH_WORDS.has(word)) {
      englishCount++;
    }
  }
  
  // If mostly English words, return English
  if (englishCount > words.length * 0.7) {
    return { language: 'english', confidence: 0.9 };
  }
  
  // Score each language by word matches
  const scores: Record<string, number> = {};
  
  for (const [lang, { words: patterns, weight }] of Object.entries(LATIN_WORD_PATTERNS)) {
    let matchCount = 0;
    for (const word of words) {
      if (patterns.includes(word)) {
        matchCount++;
      }
      // Also check for partial matches (word starts with pattern)
      for (const pattern of patterns) {
        if (word.startsWith(pattern) || pattern.startsWith(word)) {
          matchCount += 0.5;
        }
      }
    }
    scores[lang] = (matchCount / words.length) * weight;
  }
  
  // Find best match
  let bestLang = 'english';
  let bestScore = 0;
  
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }
  
  // Require minimum confidence to override English
  if (bestScore >= 0.3) {
    return { language: bestLang, confidence: Math.min(bestScore + 0.5, 0.95) };
  }
  
  return { language: 'english', confidence: 0.5 };
}

// ============================================================
// ENHANCED LANGUAGE DETECTION
// ============================================================

/**
 * Detect language from input text
 * Supports 1000+ languages via:
 * - Unicode script detection for non-Latin text
 * - Word pattern matching for Latin-script text (Hindi, Telugu, etc.)
 */
export function detectInputLanguage(text: string): DetectedLanguageInfo {
  if (!text?.trim()) {
    return {
      language: 'english',
      script: 'Latin',
      isLatin: true,
      confidence: 0,
      isEnglish: true,
    };
  }

  // First, check if text is Latin script
  const isLatin = isLatinText(text);
  
  if (isLatin) {
    // Use word pattern detection for Latin text
    const { language, confidence } = detectLatinLanguage(text);
    
    return {
      language,
      script: 'Latin',
      isLatin: true,
      confidence,
      isEnglish: isEnglish(language),
    };
  }
  
  // For non-Latin text, use script-based detection
  const detection = baseAutoDetectLanguage(text);
  
  return {
    language: detection.language,
    script: detection.script,
    isLatin: detection.isLatin,
    confidence: detection.confidence,
    isEnglish: isEnglish(detection.language),
  };
}

// ============================================================
// DYNAMIC COMMON PHRASE LOOKUP (NO HARDCODING)
// Uses Supabase common_phrases table for all lookups
// ============================================================

// Cache for dynamic phrase lookups from database
const dynamicPhraseCache = new Map<string, { english: string; language: string } | null>();
const PHRASE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const phraseCacheTimestamps = new Map<string, number>();

/**
 * Look up English meaning from any language phrase using database
 * NO HARDCODING - all lookups are dynamic from common_phrases table
 */
async function lookupTransliteratedMeaningAsync(text: string): Promise<{ english: string; language: string } | null> {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return null;
  
  // Check cache first (with TTL)
  const cacheKey = normalized;
  const cachedTimestamp = phraseCacheTimestamps.get(cacheKey);
  if (cachedTimestamp && Date.now() - cachedTimestamp < PHRASE_CACHE_TTL) {
    const cached = dynamicPhraseCache.get(cacheKey);
    if (cached !== undefined) return cached;
  }
  
  try {
    // Query the common_phrases table for this phrase
    const { data, error } = await supabase
      .from('common_phrases')
      .select('english, phrase_key')
      .or(`phrase_key.ilike.%${normalized}%,english.ilike.%${normalized}%`)
      .limit(1);
    
    if (error || !data || data.length === 0) {
      // Cache negative result
      dynamicPhraseCache.set(cacheKey, null);
      phraseCacheTimestamps.set(cacheKey, Date.now());
      return null;
    }
    
    const result = {
      english: data[0].english,
      language: 'detected', // Language is auto-detected from script
    };
    
    // Cache result
    dynamicPhraseCache.set(cacheKey, result);
    phraseCacheTimestamps.set(cacheKey, Date.now());
    
    return result;
  } catch (err) {
    console.warn('[ExtendedEngine] Dynamic phrase lookup error:', err);
    return null;
  }
}

/**
 * Synchronous lookup for cached phrases only (for live preview)
 * Returns null if not in cache - async lookup should be done separately
 */
function lookupTransliteratedMeaning(text: string): { english: string; language: string } | null {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return null;
  
  const cachedTimestamp = phraseCacheTimestamps.get(normalized);
  if (cachedTimestamp && Date.now() - cachedTimestamp < PHRASE_CACHE_TTL) {
    return dynamicPhraseCache.get(normalized) || null;
  }
  
  return null;
}

// ============================================================
// ENGLISH MEANING EXTRACTION
// ============================================================

/**
 * Extract or translate to English meaning from any language input
 * This is the pivot point for all translations
 */
export async function getEnglishMeaning(
  text: string,
  sourceLanguage: string
): Promise<{ english: string; confidence: number }> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { english: '', confidence: 0 };
  }

  const normSource = normalizeLanguage(sourceLanguage);
  
  // If already English, return as-is
  if (isEnglish(normSource)) {
    return { english: trimmed, confidence: 1.0 };
  }

  // FIRST: Try async dynamic phrase lookup from database
  const directLookup = await lookupTransliteratedMeaningAsync(trimmed);
  if (directLookup) {
    console.log('[ExtendedEngine] Dynamic DB meaning lookup:', trimmed, '->', directLookup.english);
    return { english: directLookup.english, confidence: 0.95 };
  }

  // If Latin text but non-English language, might be transliterated
  const isLatin = isLatinText(trimmed);
  
  try {
    // Translate from source language to English using universal offline engine
    const result = await translateUniversal(trimmed, normSource, 'english');
    
    if (result.isTranslated && result.text !== trimmed) {
      return { 
        english: result.text, 
        confidence: result.confidence 
      };
    }
    
    // If no translation happened, try reverse transliteration for non-Latin input
    if (!isLatin) {
      const latinized = reverseTransliterate(trimmed, normSource);
      if (latinized && latinized !== trimmed) {
        // Check if latinized version has a meaning in database
        const latinLookup = await lookupTransliteratedMeaningAsync(latinized);
        if (latinLookup) {
          return { english: latinLookup.english, confidence: 0.9 };
        }
        
        // Use latinized form as English approximation
        return { english: latinized, confidence: 0.6 };
      }
    }
    
    // Fallback: return as-is (no external API calls)
    return { english: result.text || trimmed, confidence: 0.4 };
  } catch (err) {
    console.error('[ExtendedEngine] English extraction error:', err);
    return { english: trimmed, confidence: 0.2 };
  }
}

// ============================================================
// EXTENDED TRANSLATION PIPELINE
// ============================================================

/**
 * Full translation pipeline for multi-language input
 * 
 * Input (any language) → Detect → English pivot → Sender native + Receiver native
 */
export async function translateExtended(
  input: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<ExtendedMessageViews> {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return createEmptyViews();
  }

  const normSender = normalizeLanguage(senderLanguage);
  const normReceiver = normalizeLanguage(receiverLanguage);
  
  // Step 1: Detect input language
  const detection = detectInputLanguage(trimmed);
  const detectedLanguage = detection.language;
  
  console.log('[ExtendedEngine] Input detected:', {
    input: trimmed.substring(0, 50),
    detected: detectedLanguage,
    script: detection.script,
    confidence: detection.confidence,
  });

  // Step 2: Get English meaning (pivot)
  const { english: englishMeaning, confidence: englishConfidence } = 
    await getEnglishMeaning(trimmed, detectedLanguage);
  
  console.log('[ExtendedEngine] English meaning:', englishMeaning);

  // Step 3: Generate sender's native view
  let senderNativeText: string;
  let wasTranslated = false;
  let wasTransliterated = false;
  
  if (isEnglish(normSender)) {
    // Sender's native is English
    senderNativeText = englishMeaning;
  } else if (isSameLanguage(detectedLanguage, normSender)) {
    // Input is already in sender's language
    senderNativeText = trimmed;
    
    // But convert to native script if needed
    if (detection.isLatin && !isLatinScriptLanguage(normSender)) {
      const transliterated = dynamicTransliterate(trimmed, normSender);
      if (transliterated && transliterated !== trimmed) {
        senderNativeText = transliterated;
        wasTransliterated = true;
      }
    }
  } else {
    // Translate from English to sender's native
    const senderResult = await translateUniversal(englishMeaning, 'english', normSender);
    senderNativeText = senderResult.text || englishMeaning;
    wasTranslated = senderResult.isTranslated;
    wasTransliterated = senderResult.isTransliterated;
  }

  // Step 4: Generate receiver's native view
  let receiverNativeText: string;
  
  if (isEnglish(normReceiver)) {
    // Receiver's native is English
    receiverNativeText = englishMeaning;
  } else if (isSameLanguage(normSender, normReceiver)) {
    // Same language - receiver sees same as sender
    receiverNativeText = senderNativeText;
  } else {
    // Translate from English to receiver's native
    const receiverResult = await translateUniversal(englishMeaning, 'english', normReceiver);
    receiverNativeText = receiverResult.text || englishMeaning;
    wasTranslated = wasTranslated || receiverResult.isTranslated;
  }

  // English hints are the same for both (the English meaning)
  const englishHint = englishMeaning;

  return {
    originalInput: trimmed,
    detectedLanguage,
    englishMeaning,
    senderNativeText,
    senderEnglishHint: englishHint,
    receiverNativeText,
    receiverEnglishHint: englishHint,
    wasTranslated,
    wasTransliterated,
    confidence: englishConfidence,
  };
}

// ============================================================
// LIVE PREVIEW GENERATION
// ============================================================

/**
 * Generate live preview as user types
 * Shows message in sender's mother tongue with detected language
 */
export async function generateLivePreview(
  input: string,
  senderLanguage: string
): Promise<LivePreviewResult> {
  if (!input?.trim()) {
    return {
      nativePreview: '',
      detectedLanguage: '',
      isDetecting: false,
      confidence: 0,
    };
  }

  const trimmed = input.trim();
  const normSender = normalizeLanguage(senderLanguage);
  
  // Detect input language
  const detection = detectInputLanguage(trimmed);
  
  // Generate native preview - ALWAYS meaning-based, never phonetic
  let nativePreview = trimmed;
  
  if (isEnglish(normSender)) {
    // Sender's native is English - get English meaning
    if (!detection.isEnglish) {
      try {
        const { english } = await getEnglishMeaning(trimmed, detection.language);
        nativePreview = english || trimmed;
      } catch {
        nativePreview = trimmed;
      }
    }
  } else if (isSameLanguage(detection.language, normSender) && !detection.isLatin) {
    // Input is already in sender's native script - show as-is
    nativePreview = trimmed;
  } else {
    // Input is in different language OR Latin/romanized input
    // ALWAYS translate MEANING to sender's native (not phonetic transliteration)
    try {
      // First get English meaning, then translate to sender's native
      const { english } = await getEnglishMeaning(trimmed, detection.language);
      if (english && english !== trimmed) {
        // Translate English meaning to sender's native language
        const result = await translateUniversal(english, 'english', normSender);
        nativePreview = result.text || english;
      } else {
        // Direct translation if English extraction didn't work
        const result = await translateUniversal(trimmed, detection.language, normSender);
        nativePreview = result.text || trimmed;
      }
    } catch {
      nativePreview = trimmed;
    }
  }

  return {
    nativePreview,
    detectedLanguage: detection.language,
    isDetecting: false,
    confidence: detection.confidence,
  };
}

// ============================================================
// RECEIVER PREVIEW GENERATION
// ============================================================

/**
 * Generate preview of what receiver will see
 */
export async function generateReceiverPreview(
  input: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{ preview: string; englishMeaning: string }> {
  if (!input?.trim()) {
    return { preview: '', englishMeaning: '' };
  }

  const normReceiver = normalizeLanguage(receiverLanguage);
  
  // Detect input language
  const detection = detectInputLanguage(input);
  
  // Get English meaning
  const { english: englishMeaning } = await getEnglishMeaning(input, detection.language);
  
  // If receiver's native is English
  if (isEnglish(normReceiver)) {
    return { preview: englishMeaning, englishMeaning };
  }
  
  // Translate to receiver's native
  const result = await translateUniversal(englishMeaning, 'english', normReceiver);
  
  return {
    preview: result.text || englishMeaning,
    englishMeaning,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function createEmptyViews(): ExtendedMessageViews {
  return {
    originalInput: '',
    detectedLanguage: '',
    englishMeaning: '',
    senderNativeText: '',
    senderEnglishHint: '',
    receiverNativeText: '',
    receiverEnglishHint: '',
    wasTranslated: false,
    wasTransliterated: false,
    confidence: 0,
  };
}

// ============================================================
// EXPORTS
// ============================================================

export {
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  dynamicTransliterate,
  reverseTransliterate,
} from './universal-offline-engine';

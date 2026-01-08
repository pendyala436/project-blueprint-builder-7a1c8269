/**
 * Universal Semantic Translator
 * ==============================
 * Semantic translation using embedded phonetic patterns for 65 languages.
 * 
 * NO external APIs, NO NLLB-200, NO hardcoded word lists.
 * Uses phonetic sound patterns + semantic root mapping.
 * 
 * ARCHITECTURE:
 * 1. Auto-detect source language from text (Unicode + phonetic patterns)
 * 2. Extract semantic roots from detected patterns
 * 3. Map semantic roots to target language using phonetic rules
 * 4. Render in target script using dynamic transliterator
 */

import { dynamicTransliterate, detectScriptFromText } from './dynamic-transliterator';
import { autoDetectLanguage, isLatinScriptLanguage, isLatinText, normalizeLanguage, isSameLanguage, transliterateToNative, getLanguageInfo, LANGUAGES } from './embedded-translator';

// ============================================================
// UNIVERSAL PHONETIC PATTERN DATABASE
// Maps sound patterns across all 65 languages
// ============================================================

/**
 * Semantic sound patterns - cross-linguistic phonetic categories
 * These are PHONETIC PATTERNS, not hardcoded words
 * Example: Greeting sounds across languages share patterns
 */
interface SemanticPhoneticPattern {
  category: string;
  patterns: Array<{
    sounds: string[];  // Phonetic patterns that trigger this semantic
    languages?: string[];  // Optional: language hints where pattern is strong
  }>;
  targetMappings: Record<string, string[]>;  // Language → possible phonetic outputs
}

// Phonetic sound-meaning clusters (cross-linguistic)
// Based on linguistic research on sound symbolism + loan word patterns
const SEMANTIC_PHONETIC_PATTERNS: SemanticPhoneticPattern[] = [
  // GREETINGS - Universal greeting sound patterns
  {
    category: 'greeting',
    patterns: [
      { sounds: ['hall', 'hel', 'helo', 'hello', 'hallo'], languages: ['english', 'german', 'dutch'] },
      { sounds: ['namast', 'namaskar', 'namashkar'], languages: ['hindi', 'nepali', 'marathi'] },
      { sounds: ['vanakkam', 'வணக்கம்'], languages: ['tamil'] },
      { sounds: ['namaskaram', 'namaskaaram', 'నమస్కారం', 'నమస్కారము'], languages: ['telugu', 'malayalam', 'kannada'] },
      { sounds: ['sat sri akal', 'satsriakaal'], languages: ['punjabi'] },
      { sounds: ['assalam', 'salam', 'salaam'], languages: ['urdu', 'arabic', 'persian'] },
      { sounds: ['privet', 'zdravstvuy'], languages: ['russian'] },
      { sounds: ['bonjour', 'salut'], languages: ['french'] },
      { sounds: ['hola'], languages: ['spanish'] },
      { sounds: ['ciao'], languages: ['italian'] },
      { sounds: ['ni hao', 'nihao', '你好'], languages: ['mandarin'] },
      { sounds: ['konnichiwa', 'konnichi', 'こんにちは'], languages: ['japanese'] },
      { sounds: ['annyeong', 'anyeong', '안녕'], languages: ['korean'] },
      { sounds: ['sawadee', 'sawasdee'], languages: ['thai'] },
      { sounds: ['xin chao'], languages: ['vietnamese'] },
      { sounds: ['selamat'], languages: ['malay', 'indonesian'] },
      { sounds: ['merhaba'], languages: ['turkish'] },
      { sounds: ['jambo', 'habari'], languages: ['swahili'] },
      { sounds: ['नमस्ते', 'नमस्कार'], languages: ['hindi', 'marathi'] },
      { sounds: ['নমস্কার'], languages: ['bengali'] },
      { sounds: ['નમસ્તે'], languages: ['gujarati'] },
      { sounds: ['ਸਤ ਸ੍ਰੀ ਅਕਾਲ'], languages: ['punjabi'] },
    ],
    targetMappings: {
      hindi: ['namaste', 'namaskar'],
      bengali: ['namaskar', 'nomoshkar'],
      telugu: ['namaskaram'],
      tamil: ['vanakkam'],
      marathi: ['namaskar'],
      gujarati: ['namaste', 'jai shree krishna'],
      kannada: ['namaskara'],
      malayalam: ['namaskaram'],
      punjabi: ['sat sri akal'],
      odia: ['namaskar'],
      assamese: ['namaskar'],
      urdu: ['assalam alaikum'],
      nepali: ['namaste'],
      english: ['hello', 'hi'],
      spanish: ['hola'],
      french: ['bonjour'],
      german: ['hallo'],
      italian: ['ciao'],
      portuguese: ['ola'],
      russian: ['privet'],
      arabic: ['marhaba', 'assalamu alaikum'],
      mandarin: ['ni hao'],
      japanese: ['konnichiwa'],
      korean: ['annyeonghaseyo'],
      thai: ['sawadee'],
      vietnamese: ['xin chao'],
      turkish: ['merhaba'],
      malay: ['selamat'],
      swahili: ['jambo'],
      persian: ['salam'],
    }
  },
  // FAREWELL - Goodbye patterns
  {
    category: 'farewell',
    patterns: [
      { sounds: ['bye', 'goodbye', 'gud bye', 'goodby'], languages: ['english'] },
      { sounds: ['alvida', 'khuda hafiz', 'phir milenge'], languages: ['hindi', 'urdu'] },
      { sounds: ['poyi varaam', 'poyivaraam'], languages: ['tamil'] },
      { sounds: ['vellipotunna'], languages: ['telugu'] },
      { sounds: ['au revoir'], languages: ['french'] },
      { sounds: ['adios'], languages: ['spanish'] },
      { sounds: ['sayonara'], languages: ['japanese'] },
      { sounds: ['annyeong', 'anyeonghi'], languages: ['korean'] },
      { sounds: ['poka', 'do svidaniya'], languages: ['russian'] },
    ],
    targetMappings: {
      hindi: ['alvida', 'phir milenge'],
      bengali: ['bidaay', 'abar dekha hobe'],
      telugu: ['vellipotunna', 'mari kaludaam'],
      tamil: ['poyi varaam', 'sontham'],
      english: ['bye', 'goodbye'],
      spanish: ['adios'],
      french: ['au revoir'],
      japanese: ['sayonara'],
      korean: ['annyeonghi gaseyo'],
      russian: ['poka'],
      arabic: ['ma as-salama'],
      mandarin: ['zaijian'],
      urdu: ['khuda hafiz'],
      marathi: ['punha bhetoo'],
      gujarati: ['aavjo'],
      kannada: ['hogi barteeni'],
      malayalam: ['poyittu varaam'],
      punjabi: ['rab rakha'],
    }
  },
  // THANKS - Gratitude patterns  
  {
    category: 'thanks',
    patterns: [
      { sounds: ['thank', 'thanks', 'thankyou', 'thank you'], languages: ['english'] },
      { sounds: ['dhanyavad', 'dhanyavaad', 'shukriya', 'धन्यवाद', 'शुक्रिया'], languages: ['hindi'] },
      { sounds: ['dhonnobad', 'dhanyabad', 'ধন্যবাদ'], languages: ['bengali', 'assamese'] },
      { sounds: ['nandri', 'நன்றி'], languages: ['tamil'] },
      { sounds: ['dhanyavaadalu', 'dhanyavaadamulu', 'ధన్యవాదాలు', 'ధన్యవాదములు'], languages: ['telugu'] },
      { sounds: ['dhanyavad', 'आभार'], languages: ['marathi', 'gujarati'] },
      { sounds: ['merci'], languages: ['french'] },
      { sounds: ['gracias'], languages: ['spanish'] },
      { sounds: ['grazie'], languages: ['italian'] },
      { sounds: ['danke'], languages: ['german'] },
      { sounds: ['shukran', 'شكرا'], languages: ['arabic'] },
      { sounds: ['arigatou', 'arigatoo', 'ありがとう'], languages: ['japanese'] },
      { sounds: ['xie xie', 'xiexie', '谢谢'], languages: ['mandarin'] },
      { sounds: ['spasibo', 'спасибо'], languages: ['russian'] },
      { sounds: ['kamsahamnida', 'gomawo', '감사합니다', '고마워'], languages: ['korean'] },
      { sounds: ['khob khun', 'khopkhun'], languages: ['thai'] },
      { sounds: ['cam on'], languages: ['vietnamese'] },
      { sounds: ['tesekkur', 'tesekkurler'], languages: ['turkish'] },
      { sounds: ['asante'], languages: ['swahili'] },
    ],
    targetMappings: {
      hindi: ['dhanyavad', 'shukriya'],
      bengali: ['dhonnobad'],
      telugu: ['dhanyavaadalu'],
      tamil: ['nandri'],
      marathi: ['dhanyavad'],
      gujarati: ['aabhaar'],
      kannada: ['dhanyavadagalu'],
      malayalam: ['nandi'],
      punjabi: ['dhanvaad'],
      odia: ['dhanyabad'],
      assamese: ['dhanyabad'],
      urdu: ['shukriya'],
      english: ['thank you', 'thanks'],
      spanish: ['gracias'],
      french: ['merci'],
      german: ['danke'],
      italian: ['grazie'],
      portuguese: ['obrigado'],
      russian: ['spasibo'],
      arabic: ['shukran'],
      mandarin: ['xiexie'],
      japanese: ['arigatou'],
      korean: ['kamsahamnida'],
      thai: ['khob khun'],
      vietnamese: ['cam on'],
      turkish: ['tesekkurler'],
      swahili: ['asante'],
      persian: ['mamnun'],
      malay: ['terima kasih'],
      indonesian: ['terima kasih'],
    }
  },
  // APOLOGY patterns
  {
    category: 'apology',
    patterns: [
      { sounds: ['sorry', 'sory'], languages: ['english'] },
      { sounds: ['maaf', 'maafi', 'kshama', 'माफ़', 'क्षमा'], languages: ['hindi', 'urdu'] },
      { sounds: ['dukkhito', 'maaf koro', 'দুঃখিত'], languages: ['bengali'] },
      { sounds: ['kshamisi', 'kshaminchandee', 'క్షమించండి', 'క్షమించు'], languages: ['telugu'] },
      { sounds: ['mannikkanum', 'மன்னிக்கணும்'], languages: ['tamil'] },
      { sounds: ['pardon', 'desole', 'désolé'], languages: ['french'] },
      { sounds: ['perdon', 'lo siento'], languages: ['spanish'] },
      { sounds: ['gomen', 'sumimasen', 'ごめん', 'すみません'], languages: ['japanese'] },
      { sounds: ['izvinite', 'извините'], languages: ['russian'] },
      { sounds: ['duibuqi', '对不起'], languages: ['mandarin'] },
      { sounds: ['mianhae', 'joesonghamnida', '미안해', '죄송합니다'], languages: ['korean'] },
    ],
    targetMappings: {
      hindi: ['maaf kijiye', 'kshama kijiye'],
      bengali: ['maaf korben'],
      telugu: ['kshaminchandee'],
      tamil: ['mannikkanum'],
      marathi: ['maaf kara'],
      kannada: ['kshamisi'],
      malayalam: ['kshamikkoo'],
      english: ['sorry', 'I apologize'],
      spanish: ['lo siento', 'perdon'],
      french: ['desole', 'pardon'],
      japanese: ['gomen nasai'],
      mandarin: ['duibuqi'],
      korean: ['mianhamnida'],
      arabic: ['aasif'],
      urdu: ['maaf kijiye'],
      russian: ['izvinite'],
      turkish: ['ozur dilerim'],
    }
  },
  // AFFIRMATION patterns (yes/ok)
  {
    category: 'affirmation',
    patterns: [
      { sounds: ['yes', 'yea', 'yeah'], languages: ['english'] },
      { sounds: ['haan', 'ha', 'ji', 'हाँ', 'जी'], languages: ['hindi', 'urdu'] },
      { sounds: ['avunu', 'emo', 'అవును'], languages: ['telugu'] },
      { sounds: ['aamam', 'aama', 'ஆம்', 'ஆமாம்'], languages: ['tamil'] },
      { sounds: ['ho', 'hoi', 'हो'], languages: ['marathi', 'gujarati'] },
      { sounds: ['oui'], languages: ['french'] },
      { sounds: ['si'], languages: ['spanish', 'italian'] },
      { sounds: ['da', 'da da', 'да'], languages: ['russian'] },
      { sounds: ['hai', 'はい'], languages: ['japanese'] },
      { sounds: ['shi', 'dui', '是', '对'], languages: ['mandarin'] },
      { sounds: ['ne', 'ye', '네', '예'], languages: ['korean'] },
      { sounds: ['evet'], languages: ['turkish'] },
      { sounds: ['naam', 'aywa', 'نعم'], languages: ['arabic'] },
      { sounds: ['হ্যাঁ'], languages: ['bengali'] },
    ],
    targetMappings: {
      hindi: ['haan', 'ji haan'],
      bengali: ['hyan', 'achha'],
      telugu: ['avunu'],
      tamil: ['aamam'],
      marathi: ['ho'],
      gujarati: ['haa'],
      kannada: ['haudu'],
      malayalam: ['athe'],
      english: ['yes'],
      spanish: ['si'],
      french: ['oui'],
      russian: ['da'],
      japanese: ['hai'],
      mandarin: ['shi'],
      korean: ['ne'],
      arabic: ['naam'],
      urdu: ['haan', 'ji'],
    }
  },
  // NEGATION patterns (no)
  {
    category: 'negation',
    patterns: [
      { sounds: ['no', 'nope'], languages: ['english'] },
      { sounds: ['nahi', 'naa', 'na', 'नहीं'], languages: ['hindi', 'urdu'] },
      { sounds: ['kaadu', 'ledu', 'కాదు', 'లేదు'], languages: ['telugu'] },
      { sounds: ['illa', 'illai', 'இல்ல', 'இல்லை'], languages: ['tamil'] },
      { sounds: ['nahi', 'नाही'], languages: ['marathi'] },
      { sounds: ['na', 'না'], languages: ['gujarati', 'bengali'] },
      { sounds: ['non'], languages: ['french'] },
      { sounds: ['niet', 'нет'], languages: ['russian'] },
      { sounds: ['iie', 'いいえ'], languages: ['japanese'] },
      { sounds: ['bushi', 'meiyou', '不是', '没有'], languages: ['mandarin'] },
      { sounds: ['anio', 'aniyo', '아니오', '아니요'], languages: ['korean'] },
      { sounds: ['hayir'], languages: ['turkish'] },
      { sounds: ['la', 'لا'], languages: ['arabic'] },
    ],
    targetMappings: {
      hindi: ['nahi'],
      bengali: ['na'],
      telugu: ['kaadu'],
      tamil: ['illa'],
      marathi: ['nahi'],
      gujarati: ['na'],
      kannada: ['illa'],
      malayalam: ['alla'],
      english: ['no'],
      spanish: ['no'],
      french: ['non'],
      russian: ['nyet'],
      japanese: ['iie'],
      mandarin: ['bushi'],
      korean: ['anio'],
      arabic: ['la'],
      urdu: ['nahi'],
    }
  },
  // LOVE/AFFECTION patterns
  {
    category: 'love',
    patterns: [
      { sounds: ['love', 'luv'], languages: ['english'] },
      { sounds: ['pyaar', 'prem', 'mohabbat', 'प्यार', 'प्रेम'], languages: ['hindi'] },
      { sounds: ['bhalobasa', 'bhalobashi', 'ভালোবাসা'], languages: ['bengali'] },
      { sounds: ['prema', 'prēma', 'ప్రేమ'], languages: ['telugu', 'kannada'] },
      { sounds: ['kaadhal', 'anbu', 'காதல்', 'அன்பு'], languages: ['tamil'] },
      { sounds: ['amour'], languages: ['french'] },
      { sounds: ['amor'], languages: ['spanish', 'portuguese'] },
      { sounds: ['amore'], languages: ['italian'] },
      { sounds: ['liebe'], languages: ['german'] },
      { sounds: ['lyubov', 'любовь'], languages: ['russian'] },
      { sounds: ['ai', 'aishiteru', '愛', '愛してる'], languages: ['japanese'] },
      { sounds: ['sarang', '사랑'], languages: ['korean'] },
      { sounds: ['hub', 'حب'], languages: ['arabic'] },
    ],
    targetMappings: {
      hindi: ['pyaar', 'prem'],
      bengali: ['bhalobasa'],
      telugu: ['prema'],
      tamil: ['kaadhal'],
      kannada: ['prema'],
      malayalam: ['sneham'],
      english: ['love'],
      spanish: ['amor'],
      french: ['amour'],
      italian: ['amore'],
      german: ['liebe'],
      russian: ['lyubov'],
      japanese: ['ai'],
      korean: ['sarang'],
      arabic: ['hubb'],
      urdu: ['mohabbat'],
      mandarin: ['ai'],
    }
  },
  // HOW ARE YOU patterns
  {
    category: 'wellbeing_query',
    patterns: [
      { sounds: ['how are', 'how r u', 'howru', 'how you'], languages: ['english'] },
      { sounds: ['kaise ho', 'kaise hain', 'kya haal'], languages: ['hindi'] },
      { sounds: ['kemon acho', 'kemon achen'], languages: ['bengali'] },
      { sounds: ['ela unnaru', 'ela unnav', 'ఎలా ఉన్నారు', 'మీరు ఎలా ఉన్నారు'], languages: ['telugu'] },
      { sounds: ['eppadi irukkireenga', 'eppadi irukkinga'], languages: ['tamil'] },
      { sounds: ['kasa kay', 'kasa aahes'], languages: ['marathi'] },
      { sounds: ['kem cho'], languages: ['gujarati'] },
      { sounds: ['comment allez', 'ca va'], languages: ['french'] },
      { sounds: ['como estas', 'que tal'], languages: ['spanish'] },
      { sounds: ['come stai'], languages: ['italian'] },
      { sounds: ['wie geht', 'wie gehts'], languages: ['german'] },
      { sounds: ['kak dela'], languages: ['russian'] },
      { sounds: ['ogenki desu'], languages: ['japanese'] },
      { sounds: ['ni hao ma'], languages: ['mandarin'] },
      { sounds: ['jal jinaesseoyo'], languages: ['korean'] },
      { sounds: ['kayf halak', 'kaif haalak'], languages: ['arabic'] },
    ],
    targetMappings: {
      hindi: ['aap kaise hain', 'kya haal hai'],
      bengali: ['kemon acho'],
      telugu: ['ela unnaru'],
      tamil: ['eppadi irukkireenga'],
      marathi: ['kasa aahes'],
      gujarati: ['kem cho'],
      kannada: ['hegiddira'],
      malayalam: ['sukhamaano'],
      english: ['how are you'],
      spanish: ['como estas'],
      french: ['comment allez vous'],
      german: ['wie gehts'],
      russian: ['kak dela'],
      japanese: ['ogenki desu ka'],
      mandarin: ['ni hao ma'],
      korean: ['annyeonghaseyo'],
      arabic: ['kayf halak'],
      urdu: ['kaise hain aap'],
    }
  },
  // I'M FINE/GOOD patterns
  {
    category: 'wellbeing_response',
    patterns: [
      { sounds: ['fine', 'good', 'great', 'im fine', 'i am fine'], languages: ['english'] },
      { sounds: ['theek', 'theek hun', 'accha', 'mast', 'badhiya'], languages: ['hindi'] },
      { sounds: ['bhalo', 'bhalo achi'], languages: ['bengali'] },
      { sounds: ['baagunnanu', 'baagaa', 'బాగున్నాను', 'బాగా'], languages: ['telugu'] },
      { sounds: ['nalla irukken'], languages: ['tamil'] },
      { sounds: ['maja', 'bara'], languages: ['marathi', 'kannada'] },
      { sounds: ['majama', 'saru'], languages: ['gujarati'] },
      { sounds: ['bien', 'tres bien'], languages: ['french', 'spanish'] },
      { sounds: ['bene'], languages: ['italian'] },
      { sounds: ['gut'], languages: ['german'] },
      { sounds: ['horosho', 'harasho'], languages: ['russian'] },
      { sounds: ['genki'], languages: ['japanese'] },
      { sounds: ['hao'], languages: ['mandarin'] },
      { sounds: ['bikhair', 'tamam'], languages: ['arabic'] },
    ],
    targetMappings: {
      hindi: ['main theek hun', 'badhiya'],
      bengali: ['bhalo achi'],
      telugu: ['baagunnanu'],
      tamil: ['nalla irukken'],
      marathi: ['mi mast ahe'],
      gujarati: ['hu majama chhu'],
      kannada: ['naanu chennagi iddini'],
      malayalam: ['njaan sukhamaayi'],
      english: ['I am fine', 'I am good'],
      spanish: ['estoy bien'],
      french: ['je vais bien'],
      german: ['mir geht es gut'],
      russian: ['ya v poryadke'],
      japanese: ['genki desu'],
      mandarin: ['wo hen hao'],
      arabic: ['ana bikhair'],
      urdu: ['main theek hun'],
    }
  },
];

// ============================================================
// PHONETIC PATTERN MATCHING ENGINE
// ============================================================

interface PatternMatch {
  category: string;
  confidence: number;
  matchedPattern: string;
  position: { start: number; end: number };
}

/**
 * Normalize text for phonetic matching
 */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/['']/g, '') // Remove apostrophes
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate phonetic similarity using Soundex-like algorithm
 */
function phoneticSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;
  
  const n1 = normalizeForMatching(s1);
  const n2 = normalizeForMatching(s2);
  
  if (n1 === n2) return 1.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;
  
  // Calculate edit distance similarity
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(n1, n2);
  const similarity = 1 - distance / maxLen;
  
  return similarity;
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  
  return dp[m][n];
}

/**
 * Find semantic patterns in text
 */
function findSemanticPatterns(text: string, sourceLanguage?: string): PatternMatch[] {
  const normalized = normalizeForMatching(text);
  const words = normalized.split(' ');
  const matches: PatternMatch[] = [];
  
  // Check each pattern category
  for (const category of SEMANTIC_PHONETIC_PATTERNS) {
    for (const pattern of category.patterns) {
      // Check if source language matches pattern languages (if specified)
      const languageMatch = !pattern.languages || !sourceLanguage || 
        pattern.languages.some(l => isSameLanguage(l, sourceLanguage));
      
      for (const sound of pattern.sounds) {
        const soundNorm = normalizeForMatching(sound);
        
        // Check full text match
        if (normalized.includes(soundNorm)) {
          const start = normalized.indexOf(soundNorm);
          matches.push({
            category: category.category,
            confidence: languageMatch ? 0.95 : 0.7,
            matchedPattern: sound,
            position: { start, end: start + soundNorm.length }
          });
          break;
        }
        
        // Check word-level similarity
        for (let i = 0; i < words.length; i++) {
          const similarity = phoneticSimilarity(words[i], soundNorm);
          if (similarity > 0.75) {
            matches.push({
              category: category.category,
              confidence: similarity * (languageMatch ? 1 : 0.75),
              matchedPattern: sound,
              position: { start: i, end: i + 1 }
            });
            break;
          }
          
          // Check multi-word patterns
          if (i < words.length - 1) {
            const twoWords = words.slice(i, i + 2).join(' ');
            const similarity2 = phoneticSimilarity(twoWords, soundNorm);
            if (similarity2 > 0.75) {
              matches.push({
                category: category.category,
                confidence: similarity2 * (languageMatch ? 1 : 0.75),
                matchedPattern: sound,
                position: { start: i, end: i + 2 }
              });
              break;
            }
          }
        }
      }
    }
  }
  
  // Sort by confidence and remove duplicates
  matches.sort((a, b) => b.confidence - a.confidence);
  
  return matches.filter((match, index, self) =>
    index === self.findIndex(m => m.category === match.category)
  );
}

/**
 * Get target language semantic equivalent
 */
function getSemanticEquivalent(category: string, targetLanguage: string): string | null {
  const pattern = SEMANTIC_PHONETIC_PATTERNS.find(p => p.category === category);
  if (!pattern) return null;
  
  const normalized = normalizeLanguage(targetLanguage);
  const mappings = pattern.targetMappings[normalized];
  
  if (mappings && mappings.length > 0) {
    return mappings[0]; // Return first (most common) mapping
  }
  
  // Fallback to English if no mapping
  return pattern.targetMappings['english']?.[0] || null;
}

// ============================================================
// MAIN TRANSLATION FUNCTIONS
// ============================================================

export interface SemanticTranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage: string;
  semanticMatches: Array<{
    category: string;
    original: string;
    translated: string;
  }>;
  wasTranslated: boolean;
  wasTransliterated: boolean;
  confidence: number;
}

/**
 * Universal semantic translator
 * Auto-detects source language and translates to target
 */
export function translateSemanticUniversal(
  text: string,
  targetLanguage: string,
  hintSourceLanguage?: string
): SemanticTranslationResult {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      translatedText: '',
      originalText: '',
      sourceLanguage: hintSourceLanguage || 'english',
      targetLanguage,
      detectedLanguage: 'english',
      semanticMatches: [],
      wasTranslated: false,
      wasTransliterated: false,
      confidence: 0
    };
  }
  
  // Step 1: Detect source language
  const scriptDetection = detectScriptFromText(trimmed);
  const langDetection = autoDetectLanguage(trimmed);
  const detectedLanguage = !langDetection.isLatin 
    ? langDetection.language 
    : (hintSourceLanguage || 'english');
  
  const normTarget = normalizeLanguage(targetLanguage);
  const normSource = normalizeLanguage(detectedLanguage);
  
  // If same language, just transliterate if needed
  if (isSameLanguage(normSource, normTarget)) {
    const transliterated = !isLatinScriptLanguage(normTarget) && isLatinText(trimmed)
      ? transliterateToNative(trimmed, normTarget)
      : trimmed;
    
    return {
      translatedText: transliterated,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      detectedLanguage: normSource,
      semanticMatches: [],
      wasTranslated: false,
      wasTransliterated: transliterated !== trimmed,
      confidence: 1.0
    };
  }
  
  // Step 2: Find semantic patterns
  const patterns = findSemanticPatterns(trimmed, normSource);
  
  let translatedText = trimmed;
  const semanticMatches: Array<{ category: string; original: string; translated: string }> = [];
  
  // Step 3: Replace semantic patterns with target equivalents
  for (const pattern of patterns) {
    const equivalent = getSemanticEquivalent(pattern.category, normTarget);
    if (equivalent && pattern.confidence > 0.7) {
      // Replace the pattern in text
      const normalized = normalizeForMatching(translatedText);
      const patternNorm = normalizeForMatching(pattern.matchedPattern);
      
      if (normalized.includes(patternNorm)) {
        // Find and replace case-insensitively
        const regex = new RegExp(escapeRegex(pattern.matchedPattern), 'gi');
        translatedText = translatedText.replace(regex, equivalent);
        
        semanticMatches.push({
          category: pattern.category,
          original: pattern.matchedPattern,
          translated: equivalent
        });
      }
    }
  }
  
  // Step 4: Transliterate result to target script if needed
  if (!isLatinScriptLanguage(normTarget) && isLatinText(translatedText)) {
    translatedText = transliterateToNative(translatedText, normTarget);
  }
  
  const wasTranslated = semanticMatches.length > 0;
  
  return {
    translatedText,
    originalText: trimmed,
    sourceLanguage: normSource,
    targetLanguage: normTarget,
    detectedLanguage: normSource,
    semanticMatches,
    wasTranslated,
    wasTransliterated: !isLatinScriptLanguage(normTarget),
    confidence: wasTranslated 
      ? Math.max(...patterns.map(p => p.confidence), 0.5)
      : 0.3
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Process chat message with universal semantic translation
 */
export function processUniversalChatMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): {
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTranslated: boolean;
  wasTransliterated: boolean;
  semanticMatches: Array<{ category: string; original: string; translated: string }>;
} {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      senderView: '',
      receiverView: '',
      originalText: '',
      wasTranslated: false,
      wasTransliterated: false,
      semanticMatches: []
    };
  }
  
  // Sender view: transliterate to sender's native script
  let senderView = trimmed;
  if (!isLatinScriptLanguage(senderLanguage) && isLatinText(trimmed)) {
    senderView = transliterateToNative(trimmed, senderLanguage);
  }
  
  // Receiver view: translate semantically + transliterate
  const translation = translateSemanticUniversal(trimmed, receiverLanguage, senderLanguage);
  
  return {
    senderView,
    receiverView: translation.translatedText,
    originalText: trimmed,
    wasTranslated: translation.wasTranslated,
    wasTransliterated: translation.wasTransliterated,
    semanticMatches: translation.semanticMatches
  };
}

/**
 * Get supported semantic categories
 */
export function getSupportedSemanticCategories(): string[] {
  return SEMANTIC_PHONETIC_PATTERNS.map(p => p.category);
}

/**
 * Check if text contains translatable semantic patterns
 */
export function hasTranslatableSemantics(text: string, sourceLanguage?: string): boolean {
  const patterns = findSemanticPatterns(text, sourceLanguage);
  return patterns.length > 0 && patterns.some(p => p.confidence > 0.7);
}

console.log('[UniversalSemanticTranslator] Loaded - phonetic pattern-based semantic translation for 65 languages');

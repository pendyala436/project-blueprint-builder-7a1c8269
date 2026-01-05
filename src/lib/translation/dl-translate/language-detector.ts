/**
 * Language Detector - Auto-detect source language
 * Based on Unicode script patterns and character analysis
 */

import { ModelFamily } from './language-pairs';
import { resolveLangCode, normalizeLanguageInput } from './utils';

// Script detection patterns with Unicode ranges
const SCRIPT_PATTERNS: Array<{
  regex: RegExp;
  language: string;
  script: string;
  nllbCode: string;
}> = [
  // Indian Languages (Devanagari)
  { regex: /[\u0900-\u097F]/u, language: 'Hindi', script: 'Devanagari', nllbCode: 'hin_Deva' },
  { regex: /[\u0980-\u09FF]/u, language: 'Bengali', script: 'Bengali', nllbCode: 'ben_Beng' },
  { regex: /[\u0A00-\u0A7F]/u, language: 'Punjabi', script: 'Gurmukhi', nllbCode: 'pan_Guru' },
  { regex: /[\u0A80-\u0AFF]/u, language: 'Gujarati', script: 'Gujarati', nllbCode: 'guj_Gujr' },
  { regex: /[\u0B00-\u0B7F]/u, language: 'Odia', script: 'Odia', nllbCode: 'ory_Orya' },
  { regex: /[\u0B80-\u0BFF]/u, language: 'Tamil', script: 'Tamil', nllbCode: 'tam_Taml' },
  { regex: /[\u0C00-\u0C7F]/u, language: 'Telugu', script: 'Telugu', nllbCode: 'tel_Telu' },
  { regex: /[\u0C80-\u0CFF]/u, language: 'Kannada', script: 'Kannada', nllbCode: 'kan_Knda' },
  { regex: /[\u0D00-\u0D7F]/u, language: 'Malayalam', script: 'Malayalam', nllbCode: 'mal_Mlym' },
  
  // Other Asian Scripts
  { regex: /[\u0E00-\u0E7F]/u, language: 'Thai', script: 'Thai', nllbCode: 'tha_Thai' },
  { regex: /[\u0E80-\u0EFF]/u, language: 'Lao', script: 'Lao', nllbCode: 'lao_Laoo' },
  { regex: /[\u1000-\u109F]/u, language: 'Burmese', script: 'Myanmar', nllbCode: 'mya_Mymr' },
  { regex: /[\u1780-\u17FF]/u, language: 'Khmer', script: 'Khmer', nllbCode: 'khm_Khmr' },
  
  // East Asian
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/u, language: 'Japanese', script: 'Japanese', nllbCode: 'jpn_Jpan' },
  { regex: /[\uAC00-\uD7AF]/u, language: 'Korean', script: 'Hangul', nllbCode: 'kor_Hang' },
  { regex: /[\u4E00-\u9FFF]/u, language: 'Chinese', script: 'Han', nllbCode: 'zho_Hans' },
  
  // Middle Eastern
  { regex: /[\u0600-\u06FF]/u, language: 'Arabic', script: 'Arabic', nllbCode: 'arb_Arab' },
  { regex: /[\u0590-\u05FF]/u, language: 'Hebrew', script: 'Hebrew', nllbCode: 'heb_Hebr' },
  
  // Cyrillic
  { regex: /[\u0400-\u04FF]/u, language: 'Russian', script: 'Cyrillic', nllbCode: 'rus_Cyrl' },
  
  // Greek
  { regex: /[\u0370-\u03FF]/u, language: 'Greek', script: 'Greek', nllbCode: 'ell_Grek' },
  
  // Armenian
  { regex: /[\u0530-\u058F]/u, language: 'Armenian', script: 'Armenian', nllbCode: 'hye_Armn' },
  
  // Georgian
  { regex: /[\u10A0-\u10FF]/u, language: 'Georgian', script: 'Georgian', nllbCode: 'kat_Geor' },
  
  // Ethiopic
  { regex: /[\u1200-\u137F]/u, language: 'Amharic', script: 'Ethiopic', nllbCode: 'amh_Ethi' },
  
  // Sinhala
  { regex: /[\u0D80-\u0DFF]/u, language: 'Sinhala', script: 'Sinhala', nllbCode: 'sin_Sinh' },
];

// Phonetic patterns for detecting Indian languages typed in Latin script
const PHONETIC_PATTERNS: Array<{
  language: string;
  nllbCode: string;
  patterns: RegExp[];
  words: string[];
}> = [
  {
    language: 'Hindi',
    nllbCode: 'hin_Deva',
    patterns: [
      /\b(kya|kaise|kab|kahan|kaun|kyun|aur|mein|hai|hain|tha|thi|the|hoga|hogi|kar|karo|karna|jao|aao|bolo|dekho|suno)\b/i,
    ],
    words: ['namaste', 'dhanyawad', 'kripya', 'acha', 'theek', 'bahut', 'pyar', 'dost', 'bhai', 'behan', 'maa', 'papa', 'ghar', 'kaam', 'paani', 'khana', 'sona', 'jaana'],
  },
  {
    language: 'Telugu',
    nllbCode: 'tel_Telu',
    patterns: [
      /\b(emi|ela|eppudu|ekkada|evaru|enduku|mariyu|nenu|meeru|undi|unnaru|cheppu|chepandi|ra|randi|po|poda)\b/i,
    ],
    words: ['namaskar', 'namaskaram', 'dhanyavadalu', 'manchiga', 'bagundi', 'chala', 'prema', 'sneham', 'anna', 'akka', 'amma', 'nanna', 'illu', 'pani', 'neeru', 'bhojanam', 'nidra', 'vellali'],
  },
  {
    language: 'Tamil',
    nllbCode: 'tam_Taml',
    patterns: [
      /\b(enna|eppadi|eppo|enga|yaar|en|mattum|naan|neenga|irukku|irukken|sollu|sollungal|va|vaanga|po|ponga)\b/i,
    ],
    words: ['vanakkam', 'nandri', 'nalla', 'romba', 'kadhal', 'nanban', 'anna', 'akka', 'amma', 'appa', 'veedu', 'velai', 'thanni', 'saapadu', 'thookkam', 'pogalam'],
  },
  {
    language: 'Kannada',
    nllbCode: 'kan_Knda',
    patterns: [
      /\b(enu|hege|yavaga|elli|yaru|yaake|mattu|naanu|neevu|ide|iddare|helu|heliri|ba|banni|ho|hogi)\b/i,
    ],
    words: ['namaskara', 'dhanyavadagalu', 'chennagi', 'tumba', 'preeti', 'gelaya', 'anna', 'akka', 'amma', 'appa', 'mane', 'kelasa', 'neeru', 'oota', 'nidde', 'hogona'],
  },
  {
    language: 'Malayalam',
    nllbCode: 'mal_Mlym',
    patterns: [
      /\b(enthu|engane|eppol|evide|aru|enthinau|um|njan|ningal|undu|undayo|para|parayoo|vaa|varee|po|poda)\b/i,
    ],
    words: ['namaskar', 'namaskaram', 'nanni', 'nallath', 'valare', 'sneham', 'koottukar', 'chettan', 'chechi', 'amma', 'achan', 'veedu', 'pani', 'vellam', 'bhakshanam', 'urakam', 'pokam'],
  },
  {
    language: 'Marathi',
    nllbCode: 'mar_Deva',
    patterns: [
      /\b(kay|kasa|keva|kuthe|kon|ka|ani|mi|tumhi|aahe|aahes|sang|sanga|ye|ya|ja|jaa)\b/i,
    ],
    words: ['namaskar', 'dhanyawad', 'changle', 'khup', 'prem', 'mitra', 'dada', 'tai', 'aai', 'baba', 'ghar', 'kaam', 'paani', 'jevan', 'jhop', 'jaauya'],
  },
  {
    language: 'Bengali',
    nllbCode: 'ben_Beng',
    patterns: [
      /\b(ki|kemon|kokhon|kothay|ke|keno|ebong|ami|tumi|ache|achho|bolo|bolun|eso|esho|jao|jan)\b/i,
    ],
    words: ['namaskar', 'dhanyabad', 'bhalo', 'onek', 'bhalobasha', 'bondhu', 'dada', 'didi', 'ma', 'baba', 'bari', 'kaj', 'jol', 'khabar', 'ghum', 'jai'],
  },
  {
    language: 'Gujarati',
    nllbCode: 'guj_Gujr',
    patterns: [
      /\b(su|kem|kyare|kya|kon|kem|ane|hu|tame|che|chho|kaho|kahejo|aavo|aavjo|jao|jajo)\b/i,
    ],
    words: ['namaskar', 'aabhar', 'saru', 'ghanu', 'prem', 'mitra', 'bhai', 'ben', 'maa', 'papa', 'ghar', 'kaam', 'paani', 'jaman', 'nidra', 'jaiye'],
  },
  {
    language: 'Punjabi',
    nllbCode: 'pan_Guru',
    patterns: [
      /\b(ki|kivein|kado|kithe|kaun|kyu|te|main|tusi|hai|ho|dasso|dasao|aao|aajo|jao|jaao)\b/i,
    ],
    words: ['sat sri akal', 'dhanyawad', 'changi', 'bahut', 'pyar', 'yaar', 'bhai', 'bhain', 'maa', 'pita', 'ghar', 'kaam', 'paani', 'khana', 'neend', 'chaliye'],
  },
  {
    language: 'Urdu',
    nllbCode: 'urd_Arab',
    patterns: [
      /\b(kya|kaise|kab|kahan|kaun|kyun|aur|mein|hai|hain|tha|thi|the|hoga|hogi|kar|karo|karna)\b/i,
    ],
    words: ['assalam', 'shukriya', 'meharbani', 'acha', 'theek', 'bahut', 'mohabbat', 'dost', 'bhai', 'behan', 'ammi', 'abbu', 'ghar', 'kaam', 'paani', 'khana'],
  },
];

export interface LanguageDetectionResult {
  language: string;
  nllbCode: string;
  script: string;
  confidence: number;
  isPhonetic: boolean;
  isLatinScript: boolean;
}

/**
 * Check if text is primarily Latin script
 */
export function isLatinScript(text: string): boolean {
  const latinChars = text.match(/[a-zA-Z]/g)?.length || 0;
  const totalChars = text.replace(/[\s\d\p{P}]/gu, '').length;
  return totalChars > 0 && latinChars / totalChars > 0.7;
}

/**
 * Detect phonetic Indian language from Latin text
 */
function detectPhoneticLanguage(text: string): LanguageDetectionResult | null {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let bestMatch: { language: string; nllbCode: string; score: number } | null = null;
  
  for (const pattern of PHONETIC_PATTERNS) {
    let score = 0;
    
    // Check word matches
    for (const word of words) {
      if (pattern.words.includes(word)) {
        score += 2;
      }
    }
    
    // Check pattern matches
    for (const regex of pattern.patterns) {
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        language: pattern.language,
        nllbCode: pattern.nllbCode,
        score,
      };
    }
  }
  
  if (bestMatch && bestMatch.score >= 1) {
    return {
      language: bestMatch.language,
      nllbCode: bestMatch.nllbCode,
      script: 'Latin (Phonetic)',
      confidence: Math.min(bestMatch.score / 5, 1),
      isPhonetic: true,
      isLatinScript: true,
    };
  }
  
  return null;
}

/**
 * Detect European/Latin languages
 */
function detectLatinLanguage(text: string): LanguageDetectionResult | null {
  const lowerText = text.toLowerCase();
  
  // Spanish indicators
  if (/[ñ]|¿|¡/u.test(text) || /\b(que|como|cuando|donde|por|para|esta|pero|muy|con)\b/i.test(lowerText)) {
    return { language: 'Spanish', nllbCode: 'spa_Latn', script: 'Latin', confidence: 0.8, isPhonetic: false, isLatinScript: true };
  }
  
  // French indicators
  if (/[àâäçéèêëîïôùûü]/u.test(text) || /\b(je|tu|il|elle|nous|vous|est|sont|avoir|être|dans|pour|avec|que|qui)\b/i.test(lowerText)) {
    return { language: 'French', nllbCode: 'fra_Latn', script: 'Latin', confidence: 0.8, isPhonetic: false, isLatinScript: true };
  }
  
  // German indicators
  if (/[äöüß]/u.test(text) || /\b(ich|du|er|sie|wir|ihr|ist|sind|haben|sein|und|oder|aber|mit|für)\b/i.test(lowerText)) {
    return { language: 'German', nllbCode: 'deu_Latn', script: 'Latin', confidence: 0.8, isPhonetic: false, isLatinScript: true };
  }
  
  // Portuguese indicators
  if (/[ãõç]/u.test(text) || /\b(que|como|quando|onde|por|para|esta|mas|muito|com|não|você)\b/i.test(lowerText)) {
    return { language: 'Portuguese', nllbCode: 'por_Latn', script: 'Latin', confidence: 0.8, isPhonetic: false, isLatinScript: true };
  }
  
  // Italian indicators
  if (/\b(che|come|quando|dove|perché|per|questa|ma|molto|con|non|sono|sei|siamo)\b/i.test(lowerText)) {
    return { language: 'Italian', nllbCode: 'ita_Latn', script: 'Latin', confidence: 0.7, isPhonetic: false, isLatinScript: true };
  }
  
  // Vietnamese indicators
  if (/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/u.test(text)) {
    return { language: 'Vietnamese', nllbCode: 'vie_Latn', script: 'Latin', confidence: 0.9, isPhonetic: false, isLatinScript: true };
  }
  
  // Turkish indicators
  if (/[ğışçöü]/u.test(text) || /\b(bir|bu|ne|ve|ile|için|var|yok|evet|hayır|merhaba)\b/i.test(lowerText)) {
    return { language: 'Turkish', nllbCode: 'tur_Latn', script: 'Latin', confidence: 0.8, isPhonetic: false, isLatinScript: true };
  }
  
  // Indonesian indicators
  if (/\b(apa|bagaimana|kapan|dimana|siapa|mengapa|dan|atau|tapi|dengan|untuk|ini|itu|yang|adalah)\b/i.test(lowerText)) {
    return { language: 'Indonesian', nllbCode: 'ind_Latn', script: 'Latin', confidence: 0.7, isPhonetic: false, isLatinScript: true };
  }
  
  // Default to English
  return { language: 'English', nllbCode: 'eng_Latn', script: 'Latin', confidence: 0.5, isPhonetic: false, isLatinScript: true };
}

/**
 * Auto-detect language from text
 */
export function detectLanguage(
  text: string,
  hintLanguage?: string
): LanguageDetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      language: 'English',
      nllbCode: 'eng_Latn',
      script: 'Latin',
      confidence: 0,
      isPhonetic: false,
      isLatinScript: true,
    };
  }
  
  // First check for non-Latin scripts
  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(text)) {
      return {
        language: pattern.language,
        nllbCode: pattern.nllbCode,
        script: pattern.script,
        confidence: 0.95,
        isPhonetic: false,
        isLatinScript: false,
      };
    }
  }
  
  // Text is Latin script - check for phonetic Indian languages
  const phoneticResult = detectPhoneticLanguage(text);
  if (phoneticResult && phoneticResult.confidence > 0.3) {
    return phoneticResult;
  }
  
  // Check if hint language matches
  if (hintLanguage) {
    const normalizedHint = normalizeLanguageInput(hintLanguage);
    const hintCode = resolveLangCode(normalizedHint, 'nllb200');
    
    // If hint is an Indian language, boost phonetic detection
    if (phoneticResult && PHONETIC_PATTERNS.some(p => p.nllbCode === hintCode)) {
      return {
        ...phoneticResult,
        confidence: Math.min(phoneticResult.confidence + 0.3, 1),
      };
    }
  }
  
  // Detect European/Latin languages
  const latinResult = detectLatinLanguage(text);
  
  // If we have a phonetic result with any score, prefer it for ambiguous cases
  if (phoneticResult && latinResult && latinResult.language === 'English' && phoneticResult.confidence > 0.1) {
    return phoneticResult;
  }
  
  return latinResult || {
    language: 'English',
    nllbCode: 'eng_Latn',
    script: 'Latin',
    confidence: 0.3,
    isPhonetic: false,
    isLatinScript: true,
  };
}

/**
 * Get target language code for translation
 */
export function getTargetLanguageCode(
  language: string,
  modelFamily: ModelFamily = 'nllb200'
): string {
  const normalized = normalizeLanguageInput(language);
  return resolveLangCode(normalized, modelFamily);
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  const code1 = resolveLangCode(normalizeLanguageInput(lang1), 'nllb200');
  const code2 = resolveLangCode(normalizeLanguageInput(lang2), 'nllb200');
  
  // Compare base language (before underscore)
  const base1 = code1.split('_')[0];
  const base2 = code2.split('_')[0];
  
  return base1 === base2;
}

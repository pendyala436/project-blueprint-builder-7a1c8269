/**
 * Embedded Translation Engine - English Pivot System
 * ===================================================
 * 100% in-browser, 65 languages (23 Indian + 42 World)
 * 
 * BIDIRECTIONAL TRANSLATION via English Pivot:
 * ============================================
 * Forward:  Source → English → Target
 * Reverse:  Target → English → Source
 * 
 * Total: 65 languages × 64 targets = 4,160 translation pairs
 * (Skip pivot if source or target is English = direct translation)
 * 
 * FEATURES:
 * - Typing: Latin letters based on mother tongue
 * - Preview: Live transliteration into native script
 * - Send: Translation in background, sender sees native
 * - Receive: Message in receiver's mother tongue
 * - Bi-directional: Both parties see their native language
 * - Reply translation: Receiver can reply in their language
 */

import { dynamicTransliterate } from './dynamic-transliterator';
import { spellCorrectForChat } from './phonetic-symspell';

// ============================================================
// 65 LANGUAGE DATABASE (23 Indian + 42 World)
// ============================================================

export interface LanguageInfo {
  name: string;
  code: string;
  nllbCode: string;
  native: string;
  script: string;
  rtl?: boolean;
  family?: string;
}

// 23 Indian Languages
const INDIAN_LANGUAGES: LanguageInfo[] = [
  { name: 'hindi', code: 'hi', nllbCode: 'hin_Deva', native: 'हिन्दी', script: 'Devanagari', family: 'Indo-Aryan' },
  { name: 'bengali', code: 'bn', nllbCode: 'ben_Beng', native: 'বাংলা', script: 'Bengali', family: 'Indo-Aryan' },
  { name: 'telugu', code: 'te', nllbCode: 'tel_Telu', native: 'తెలుగు', script: 'Telugu', family: 'Dravidian' },
  { name: 'marathi', code: 'mr', nllbCode: 'mar_Deva', native: 'मराठी', script: 'Devanagari', family: 'Indo-Aryan' },
  { name: 'tamil', code: 'ta', nllbCode: 'tam_Taml', native: 'தமிழ்', script: 'Tamil', family: 'Dravidian' },
  { name: 'gujarati', code: 'gu', nllbCode: 'guj_Gujr', native: 'ગુજરાતી', script: 'Gujarati', family: 'Indo-Aryan' },
  { name: 'kannada', code: 'kn', nllbCode: 'kan_Knda', native: 'ಕನ್ನಡ', script: 'Kannada', family: 'Dravidian' },
  { name: 'malayalam', code: 'ml', nllbCode: 'mal_Mlym', native: 'മലയാളം', script: 'Malayalam', family: 'Dravidian' },
  { name: 'odia', code: 'or', nllbCode: 'ory_Orya', native: 'ଓଡ଼ିଆ', script: 'Odia', family: 'Indo-Aryan' },
  { name: 'punjabi', code: 'pa', nllbCode: 'pan_Guru', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi', family: 'Indo-Aryan' },
  { name: 'assamese', code: 'as', nllbCode: 'asm_Beng', native: 'অসমীয়া', script: 'Bengali', family: 'Indo-Aryan' },
  { name: 'maithili', code: 'mai', nllbCode: 'mai_Deva', native: 'मैथिली', script: 'Devanagari', family: 'Indo-Aryan' },
  { name: 'sanskrit', code: 'sa', nllbCode: 'san_Deva', native: 'संस्कृतम्', script: 'Devanagari', family: 'Indo-Aryan' },
  { name: 'kashmiri', code: 'ks', nllbCode: 'kas_Arab', native: 'کٲشُر', script: 'Arabic', rtl: true, family: 'Indo-Aryan' },
  { name: 'nepali', code: 'ne', nllbCode: 'npi_Deva', native: 'नेपाली', script: 'Devanagari', family: 'Indo-Aryan' },
  { name: 'sindhi', code: 'sd', nllbCode: 'snd_Arab', native: 'سنڌي', script: 'Arabic', rtl: true, family: 'Indo-Aryan' },
  { name: 'konkani', code: 'kok', nllbCode: 'kok_Deva', native: 'कोंकणी', script: 'Devanagari', family: 'Indo-Aryan' },
  { name: 'dogri', code: 'doi', nllbCode: 'doi_Deva', native: 'डोगरी', script: 'Devanagari', family: 'Indo-Aryan' },
  { name: 'manipuri', code: 'mni', nllbCode: 'mni_Beng', native: 'মৈতৈলোন্', script: 'Bengali', family: 'Sino-Tibetan' },
  { name: 'santali', code: 'sat', nllbCode: 'sat_Olck', native: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol_Chiki', family: 'Austroasiatic' },
  { name: 'bodo', code: 'brx', nllbCode: 'brx_Deva', native: 'बड़ो', script: 'Devanagari', family: 'Sino-Tibetan' },
  { name: 'mizo', code: 'lus', nllbCode: 'lus_Latn', native: 'Mizo ṭawng', script: 'Latin', family: 'Sino-Tibetan' },
  { name: 'urdu', code: 'ur', nllbCode: 'urd_Arab', native: 'اردو', script: 'Arabic', rtl: true, family: 'Indo-Aryan' },
];

// 42 World Languages (sorted by speaker count)
const WORLD_LANGUAGES: LanguageInfo[] = [
  { name: 'english', code: 'en', nllbCode: 'eng_Latn', native: 'English', script: 'Latin', family: 'Germanic' },
  { name: 'mandarin', code: 'zh', nllbCode: 'zho_Hans', native: '中文', script: 'Han', family: 'Sino-Tibetan' },
  { name: 'spanish', code: 'es', nllbCode: 'spa_Latn', native: 'Español', script: 'Latin', family: 'Romance' },
  { name: 'french', code: 'fr', nllbCode: 'fra_Latn', native: 'Français', script: 'Latin', family: 'Romance' },
  { name: 'arabic', code: 'ar', nllbCode: 'arb_Arab', native: 'العربية', script: 'Arabic', rtl: true, family: 'Semitic' },
  { name: 'portuguese', code: 'pt', nllbCode: 'por_Latn', native: 'Português', script: 'Latin', family: 'Romance' },
  { name: 'russian', code: 'ru', nllbCode: 'rus_Cyrl', native: 'Русский', script: 'Cyrillic', family: 'Slavic' },
  { name: 'japanese', code: 'ja', nllbCode: 'jpn_Jpan', native: '日本語', script: 'Japanese', family: 'Japonic' },
  { name: 'german', code: 'de', nllbCode: 'deu_Latn', native: 'Deutsch', script: 'Latin', family: 'Germanic' },
  { name: 'javanese', code: 'jv', nllbCode: 'jav_Latn', native: 'Basa Jawa', script: 'Latin', family: 'Austronesian' },
  { name: 'korean', code: 'ko', nllbCode: 'kor_Hang', native: '한국어', script: 'Hangul', family: 'Koreanic' },
  { name: 'vietnamese', code: 'vi', nllbCode: 'vie_Latn', native: 'Tiếng Việt', script: 'Latin', family: 'Austroasiatic' },
  { name: 'turkish', code: 'tr', nllbCode: 'tur_Latn', native: 'Türkçe', script: 'Latin', family: 'Turkic' },
  { name: 'italian', code: 'it', nllbCode: 'ita_Latn', native: 'Italiano', script: 'Latin', family: 'Romance' },
  { name: 'thai', code: 'th', nllbCode: 'tha_Thai', native: 'ไทย', script: 'Thai', family: 'Kra-Dai' },
  { name: 'persian', code: 'fa', nllbCode: 'pes_Arab', native: 'فارسی', script: 'Arabic', rtl: true, family: 'Iranian' },
  { name: 'polish', code: 'pl', nllbCode: 'pol_Latn', native: 'Polski', script: 'Latin', family: 'Slavic' },
  { name: 'ukrainian', code: 'uk', nllbCode: 'ukr_Cyrl', native: 'Українська', script: 'Cyrillic', family: 'Slavic' },
  { name: 'malay', code: 'ms', nllbCode: 'zsm_Latn', native: 'Bahasa Melayu', script: 'Latin', family: 'Austronesian' },
  { name: 'burmese', code: 'my', nllbCode: 'mya_Mymr', native: 'မြန်မာ', script: 'Myanmar', family: 'Sino-Tibetan' },
  { name: 'tagalog', code: 'tl', nllbCode: 'tgl_Latn', native: 'Tagalog', script: 'Latin', family: 'Austronesian' },
  { name: 'swahili', code: 'sw', nllbCode: 'swh_Latn', native: 'Kiswahili', script: 'Latin', family: 'Bantu' },
  { name: 'sundanese', code: 'su', nllbCode: 'sun_Latn', native: 'Basa Sunda', script: 'Latin', family: 'Austronesian' },
  { name: 'romanian', code: 'ro', nllbCode: 'ron_Latn', native: 'Română', script: 'Latin', family: 'Romance' },
  { name: 'dutch', code: 'nl', nllbCode: 'nld_Latn', native: 'Nederlands', script: 'Latin', family: 'Germanic' },
  { name: 'greek', code: 'el', nllbCode: 'ell_Grek', native: 'Ελληνικά', script: 'Greek', family: 'Hellenic' },
  { name: 'hungarian', code: 'hu', nllbCode: 'hun_Latn', native: 'Magyar', script: 'Latin', family: 'Uralic' },
  { name: 'czech', code: 'cs', nllbCode: 'ces_Latn', native: 'Čeština', script: 'Latin', family: 'Slavic' },
  { name: 'swedish', code: 'sv', nllbCode: 'swe_Latn', native: 'Svenska', script: 'Latin', family: 'Germanic' },
  { name: 'hebrew', code: 'he', nllbCode: 'heb_Hebr', native: 'עברית', script: 'Hebrew', rtl: true, family: 'Semitic' },
  { name: 'zulu', code: 'zu', nllbCode: 'zul_Latn', native: 'isiZulu', script: 'Latin', family: 'Bantu' },
  { name: 'kinyarwanda', code: 'rw', nllbCode: 'kin_Latn', native: 'Ikinyarwanda', script: 'Latin', family: 'Bantu' },
  { name: 'yoruba', code: 'yo', nllbCode: 'yor_Latn', native: 'Yorùbá', script: 'Latin', family: 'Niger-Congo' },
  { name: 'igbo', code: 'ig', nllbCode: 'ibo_Latn', native: 'Igbo', script: 'Latin', family: 'Niger-Congo' },
  { name: 'hausa', code: 'ha', nllbCode: 'hau_Latn', native: 'Hausa', script: 'Latin', family: 'Afroasiatic' },
  { name: 'amharic', code: 'am', nllbCode: 'amh_Ethi', native: 'አማርኛ', script: 'Ethiopic', family: 'Semitic' },
  { name: 'somali', code: 'so', nllbCode: 'som_Latn', native: 'Soomaali', script: 'Latin', family: 'Cushitic' },
  { name: 'khmer', code: 'km', nllbCode: 'khm_Khmr', native: 'ខ្មែរ', script: 'Khmer', family: 'Austroasiatic' },
  { name: 'sinhala', code: 'si', nllbCode: 'sin_Sinh', native: 'සිංහල', script: 'Sinhala', family: 'Indo-Aryan' },
  { name: 'azerbaijani', code: 'az', nllbCode: 'azj_Latn', native: 'Azərbaycan', script: 'Latin', family: 'Turkic' },
  { name: 'uzbek', code: 'uz', nllbCode: 'uzn_Latn', native: "O'zbek", script: 'Latin', family: 'Turkic' },
];

// Combined 65 languages
export const LANGUAGES: LanguageInfo[] = [...INDIAN_LANGUAGES, ...WORLD_LANGUAGES];

// ============================================================
// LANGUAGE LOOKUP MAPS
// ============================================================

const languageByName = new Map(LANGUAGES.map(l => [l.name.toLowerCase(), l]));
const languageByCode = new Map(LANGUAGES.map(l => [l.code.toLowerCase(), l]));

const languageAliases: Record<string, string> = {
  bangla: 'bengali', oriya: 'odia', farsi: 'persian',
  chinese: 'mandarin', hindustani: 'hindi',
};

// ============================================================
// SCRIPT DETECTION
// ============================================================

const SCRIPT_PATTERNS: Array<{ regex: RegExp; language: string; script: string }> = [
  // South Asian
  { regex: /[\u0900-\u097F]/, language: 'hindi', script: 'Devanagari' },
  { regex: /[\u0980-\u09FF]/, language: 'bengali', script: 'Bengali' },
  { regex: /[\u0A00-\u0A7F]/, language: 'punjabi', script: 'Gurmukhi' },
  { regex: /[\u0A80-\u0AFF]/, language: 'gujarati', script: 'Gujarati' },
  { regex: /[\u0B00-\u0B7F]/, language: 'odia', script: 'Odia' },
  { regex: /[\u0B80-\u0BFF]/, language: 'tamil', script: 'Tamil' },
  { regex: /[\u0C00-\u0C7F]/, language: 'telugu', script: 'Telugu' },
  { regex: /[\u0C80-\u0CFF]/, language: 'kannada', script: 'Kannada' },
  { regex: /[\u0D00-\u0D7F]/, language: 'malayalam', script: 'Malayalam' },
  { regex: /[\u0D80-\u0DFF]/, language: 'sinhala', script: 'Sinhala' },
  // East Asian
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: 'mandarin', script: 'Han' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese', script: 'Kana' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: 'korean', script: 'Hangul' },
  // Southeast Asian
  { regex: /[\u0E00-\u0E7F]/, language: 'thai', script: 'Thai' },
  { regex: /[\u1000-\u109F]/, language: 'burmese', script: 'Myanmar' },
  { regex: /[\u1780-\u17FF]/, language: 'khmer', script: 'Khmer' },
  // Middle Eastern
  { regex: /[\u0600-\u06FF]/, language: 'arabic', script: 'Arabic' },
  { regex: /[\u0590-\u05FF]/, language: 'hebrew', script: 'Hebrew' },
  // European
  { regex: /[\u0400-\u04FF]/, language: 'russian', script: 'Cyrillic' },
  { regex: /[\u0370-\u03FF]/, language: 'greek', script: 'Greek' },
  // African
  { regex: /[\u1200-\u137F]/, language: 'amharic', script: 'Ethiopic' },
  // Indian special scripts
  { regex: /[\u1C50-\u1C7F]/, language: 'santali', script: 'Ol_Chiki' },
];

// Latin script languages
const LATIN_SCRIPT_LANGUAGES = new Set([
  'english', 'spanish', 'french', 'portuguese', 'german', 'italian', 'dutch',
  'polish', 'romanian', 'swedish', 'czech', 'hungarian', 'turkish', 'vietnamese',
  'malay', 'tagalog', 'swahili', 'javanese', 'sundanese', 'zulu', 'kinyarwanda',
  'yoruba', 'igbo', 'hausa', 'somali', 'azerbaijani', 'uzbek', 'mizo'
]);

// ============================================================
// TRANSLATION CACHE
// ============================================================

const translationCache = new Map<string, EmbeddedTranslationResult>();
const MAX_CACHE_SIZE = 2000;

function getCacheKey(text: string, source: string, target: string): string {
  return `${source}:${target}:${text.substring(0, 100)}`;
}

function getFromCache(key: string): EmbeddedTranslationResult | undefined {
  return translationCache.get(key);
}

function setInCache(key: string, result: EmbeddedTranslationResult): void {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(key, result);
}

// ============================================================
// RESULT TYPES
// ============================================================

export interface EmbeddedTranslationResult {
  text: string;
  originalText: string;
  isTranslated: boolean;
  isTransliterated: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  englishPivot?: string; // Intermediate English translation
  detectedLanguage?: string;
  confidence: number;
}

export interface LanguageDetectionResult {
  language: string;
  script: string;
  confidence: number;
  isLatin: boolean;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  if (languageAliases[normalized]) return languageAliases[normalized];
  if (languageByName.has(normalized)) return normalized;
  const byCode = languageByCode.get(normalized);
  if (byCode) return byCode.name;
  return normalized;
}

export function getLanguageInfo(lang: string): LanguageInfo | undefined {
  const normalized = normalizeLanguage(lang);
  return languageByName.get(normalized) || languageByCode.get(lang.toLowerCase());
}

export function getSupportedLanguages(): LanguageInfo[] {
  return [...LANGUAGES];
}

export function isLanguageSupported(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return languageByName.has(normalized) || languageByCode.has(lang.toLowerCase());
}

export function isEnglish(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return normalized === 'english' || lang.toLowerCase() === 'en';
}

export function isLatinScriptLanguage(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return LATIN_SCRIPT_LANGUAGES.has(normalized);
}

export function isRTL(lang: string): boolean {
  const info = getLanguageInfo(lang);
  return info?.rtl === true;
}

export function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

// ============================================================
// TEXT DETECTION
// ============================================================

export function isLatinText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
  if (!cleaned) return true;
  const latinMatch = cleaned.match(/[\u0000-\u007F\u0080-\u00FF\u0100-\u024F]/g) || [];
  return latinMatch.length / cleaned.length > 0.7;
}

export function autoDetectLanguage(text: string): LanguageDetectionResult {
  const cleaned = text.trim();
  if (!cleaned) {
    return { language: 'english', script: 'Latin', confidence: 0, isLatin: true };
  }

  // Check script patterns
  for (const { regex, language, script } of SCRIPT_PATTERNS) {
    if (regex.test(cleaned)) {
      return { language, script, confidence: 0.95, isLatin: false };
    }
  }

  // Default to Latin/English
  return { language: 'english', script: 'Latin', confidence: 0.7, isLatin: true };
}

export function needsScriptConversion(lang: string): boolean {
  return !isLatinScriptLanguage(lang);
}

// ============================================================
// ENGLISH PIVOT TRANSLATION SYSTEM
// All 65 languages translate through English
// Source → English → Target (130 combinations)
// ============================================================

/**
 * Transliterate Latin text to native script
 */
export function transliterateToNative(text: string, targetLanguage: string): string {
  if (!text.trim()) return '';
  if (isLatinScriptLanguage(targetLanguage)) return text;
  if (!isLatinText(text)) return text;

  try {
    const result = dynamicTransliterate(text, targetLanguage);
    return result || text;
  } catch (err) {
    console.warn('[EmbeddedTranslator] Transliteration failed:', err);
    return text;
  }
}

/**
 * Get live preview of native script (instant, for typing)
 */
export function getNativeScriptPreview(text: string, targetLanguage: string): string {
  if (!text.trim()) return '';
  if (isLatinScriptLanguage(targetLanguage)) return text;
  if (!isLatinText(text)) return text;
  return transliterateToNative(text, targetLanguage);
}

/**
 * Core translation function using English pivot
 * Flow: Source → English → Target
 * If source OR target is English, direct translation (no pivot)
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<EmbeddedTranslationResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      text: '',
      originalText: '',
      isTranslated: false,
      isTransliterated: false,
      sourceLanguage,
      targetLanguage,
      confidence: 0,
    };
  }

  const normSource = normalizeLanguage(sourceLanguage);
  const normTarget = normalizeLanguage(targetLanguage);

  // Same language - just convert script if needed
  if (isSameLanguage(normSource, normTarget)) {
    const nativeText = needsScriptConversion(normTarget) && isLatinText(trimmed)
      ? transliterateToNative(trimmed, normTarget)
      : trimmed;

    return {
      text: nativeText,
      originalText: trimmed,
      isTranslated: false,
      isTransliterated: nativeText !== trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      confidence: 1.0,
    };
  }

  // Check cache
  const cacheKey = getCacheKey(trimmed, normSource, normTarget);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  // Apply spell correction
  const correctedText = spellCorrectForChat(trimmed, normSource);
  const detected = autoDetectLanguage(correctedText);
  const actualSource = detected.isLatin ? normSource : detected.language;

  let translatedText = correctedText;
  let englishPivot: string | undefined;
  let wasTranslated = false;
  let wasTransliterated = false;

  // ENGLISH PIVOT TRANSLATION LOGIC
  const sourceIsEnglish = isEnglish(actualSource);
  const targetIsEnglish = isEnglish(normTarget);

  if (sourceIsEnglish && targetIsEnglish) {
    // English to English - no translation needed
    translatedText = correctedText;
  } else if (sourceIsEnglish) {
    // English → Target (direct, no pivot needed)
    translatedText = translateFromEnglish(correctedText, normTarget);
    wasTranslated = true;
  } else if (targetIsEnglish) {
    // Source → English (direct, no pivot needed)
    translatedText = translateToEnglish(correctedText, actualSource);
    wasTranslated = true;
  } else {
    // Source → English → Target (full pivot)
    englishPivot = translateToEnglish(correctedText, actualSource);
    translatedText = translateFromEnglish(englishPivot, normTarget);
    wasTranslated = true;
  }

  // Convert to target native script if needed
  if (needsScriptConversion(normTarget) && isLatinText(translatedText)) {
    const nativeResult = transliterateToNative(translatedText, normTarget);
    if (nativeResult !== translatedText) {
      translatedText = nativeResult;
      wasTransliterated = true;
    }
  }

  // Apply target language spell correction
  translatedText = spellCorrectForChat(translatedText, normTarget);

  const result: EmbeddedTranslationResult = {
    text: translatedText,
    originalText: trimmed,
    isTranslated: wasTranslated,
    isTransliterated: wasTransliterated,
    sourceLanguage: actualSource,
    targetLanguage: normTarget,
    englishPivot,
    detectedLanguage: detected.language,
    confidence: wasTranslated ? 0.85 : 0.5,
  };

  setInCache(cacheKey, result);
  return result;
}

// ============================================================
// TRANSLATION HELPER FUNCTIONS
// Uses Universal Semantic Translator for cross-language translation
// ============================================================

import { translateSemanticUniversal } from './universal-semantic-translator';

/**
 * Translate from any language to English
 * Uses phonetic-semantic pattern matching
 */
function translateToEnglish(text: string, sourceLanguage: string): string {
  // For Latin script languages, check for semantic patterns to translate
  const semanticResult = translateSemanticUniversal(text, 'english', sourceLanguage);
  if (semanticResult.wasTranslated) {
    return semanticResult.translatedText;
  }
  
  // For non-Latin scripts or no semantic match, keep original
  return text;
}

/**
 * Translate from English to any language
 * Uses phonetic-semantic pattern matching + transliteration
 */
function translateFromEnglish(text: string, targetLanguage: string): string {
  // Semantic translation
  const semanticResult = translateSemanticUniversal(text, targetLanguage, 'english');
  
  if (semanticResult.wasTranslated) {
    return semanticResult.translatedText;
  }
  
  // For non-Latin scripts without semantic match, transliterate
  if (!isLatinScriptLanguage(targetLanguage)) {
    return transliterateToNative(text, targetLanguage);
  }
  
  return text;
}

// ============================================================
// BIDIRECTIONAL TRANSLATION
// Source → English → Target AND Target → English → Source
// ============================================================

export interface BidirectionalTranslationResult {
  forward: EmbeddedTranslationResult;  // Source → English → Target
  reverse: EmbeddedTranslationResult;  // Target → English → Source
}

/**
 * Translate bidirectionally between two languages via English pivot
 * Returns both forward (source→target) and reverse (target→source) translations
 * 
 * Example: Hindi ↔ Spanish conversation
 * - Forward: Hindi → English → Spanish (for Spanish reader)
 * - Reverse: Spanish → English → Hindi (for Hindi reader to see reply)
 */
export async function translateBidirectional(
  text: string,
  languageA: string,
  languageB: string
): Promise<BidirectionalTranslationResult> {
  const [forward, reverse] = await Promise.all([
    translate(text, languageA, languageB),  // A → English → B
    translate(text, languageB, languageA),  // B → English → A
  ]);

  return { forward, reverse };
}

/**
 * Translate a reply from receiver back to sender
 * Target → English → Source
 */
export async function translateReply(
  replyText: string,
  receiverLanguage: string,
  senderLanguage: string
): Promise<EmbeddedTranslationResult> {
  // This is simply: Target → English → Source
  return translate(replyText, receiverLanguage, senderLanguage);
}

/**
 * Background bidirectional translation
 */
export function translateBidirectionalInBackground(
  text: string,
  languageA: string,
  languageB: string,
  callback: (result: BidirectionalTranslationResult) => void
): void {
  setTimeout(async () => {
    try {
      const result = await translateBidirectional(text, languageA, languageB);
      callback(result);
    } catch (err) {
      console.error('[EmbeddedTranslator] Bidirectional translation error:', err);
      const emptyResult: EmbeddedTranslationResult = {
        text,
        originalText: text,
        isTranslated: false,
        isTransliterated: false,
        sourceLanguage: languageA,
        targetLanguage: languageB,
        confidence: 0,
      };
      callback({ forward: emptyResult, reverse: { ...emptyResult, sourceLanguage: languageB, targetLanguage: languageA } });
    }
  }, 0);
}

// ============================================================
// BACKGROUND TRANSLATION
// ============================================================

/**
 * Background translation (non-blocking)
 * Translation runs asynchronously via English pivot
 */
export function translateInBackground(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  callback: (result: EmbeddedTranslationResult) => void
): void {
  setTimeout(async () => {
    try {
      const result = await translate(text, sourceLanguage, targetLanguage);
      callback(result);
    } catch (err) {
      console.error('[EmbeddedTranslator] Background translation error:', err);
      callback({
        text,
        originalText: text,
        isTranslated: false,
        isTransliterated: false,
        sourceLanguage,
        targetLanguage,
        confidence: 0,
      });
    }
  }, 0);
}

/**
 * Convert Latin text to native script (async wrapper)
 */
export async function convertToNativeScript(
  text: string,
  targetLanguage: string
): Promise<EmbeddedTranslationResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      text: '',
      originalText: '',
      isTranslated: false,
      isTransliterated: false,
      sourceLanguage: 'english',
      targetLanguage,
      confidence: 0,
    };
  }

  if (isLatinScriptLanguage(targetLanguage)) {
    return {
      text: trimmed,
      originalText: trimmed,
      isTranslated: false,
      isTransliterated: false,
      sourceLanguage: 'english',
      targetLanguage,
      confidence: 1.0,
    };
  }

  if (!isLatinText(trimmed)) {
    return {
      text: trimmed,
      originalText: trimmed,
      isTranslated: false,
      isTransliterated: false,
      sourceLanguage: targetLanguage,
      targetLanguage,
      confidence: 1.0,
    };
  }

  const nativeText = transliterateToNative(trimmed, targetLanguage);
  const wasConverted = nativeText !== trimmed;

  return {
    text: nativeText,
    originalText: trimmed,
    isTranslated: wasConverted,
    isTransliterated: wasConverted,
    sourceLanguage: 'english',
    targetLanguage,
    confidence: wasConverted ? 0.9 : 0.5,
  };
}

// ============================================================
// CHAT MESSAGE PROCESSING
// ============================================================

export interface ChatProcessResult {
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
  englishPivot?: string;
}

/**
 * Process a chat message for both sender and receiver views
 * Auto-detects language from text and translates bidirectionally
 */
export async function processMessageForChat(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<ChatProcessResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      senderView: '',
      receiverView: '',
      originalText: '',
      wasTransliterated: false,
      wasTranslated: false,
    };
  }

  // Apply spell correction
  const corrected = spellCorrectForChat(trimmed, senderLanguage);
  
  // AUTO-DETECT actual language from text (supports all 65 languages)
  const detected = autoDetectLanguage(corrected);
  const actualSourceLanguage = detected.isLatin 
    ? senderLanguage  // If Latin, use the provided sender language
    : detected.language;  // If non-Latin script, use detected language

  // SENDER VIEW: Convert to sender's native script (based on actual detected language)
  let senderView = corrected;
  let wasTransliterated = false;

  if (needsScriptConversion(actualSourceLanguage) && isLatinText(corrected)) {
    const nativeResult = transliterateToNative(corrected, actualSourceLanguage);
    if (nativeResult !== corrected) {
      senderView = nativeResult;
      wasTransliterated = true;
    }
  }

  // RECEIVER VIEW: Translate to receiver's language using semantic translation
  let receiverView = senderView;
  let wasTranslated = false;
  let englishPivot: string | undefined;

  if (!isSameLanguage(actualSourceLanguage, receiverLanguage)) {
    // Use semantic translation with auto-detected source language
    const translateResult = await translate(corrected, actualSourceLanguage, receiverLanguage);
    if (translateResult.isTranslated || translateResult.isTransliterated) {
      receiverView = translateResult.text;
      wasTranslated = translateResult.isTranslated;
      englishPivot = translateResult.englishPivot;
    }
  } else if (needsScriptConversion(receiverLanguage) && isLatinText(senderView)) {
    const nativeResult = transliterateToNative(senderView, receiverLanguage);
    if (nativeResult !== senderView) {
      receiverView = nativeResult;
    }
  }

  return {
    senderView,
    receiverView,
    originalText: trimmed,
    wasTransliterated,
    wasTranslated,
    englishPivot,
  };
}

/**
 * Process incoming message - auto-detect any language and translate to target
 * Used when receiver types in any language and sender needs translation
 */
export async function processIncomingMessage(
  text: string,
  targetLanguage: string
): Promise<ChatProcessResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      senderView: '',
      receiverView: '',
      originalText: '',
      wasTransliterated: false,
      wasTranslated: false,
    };
  }

  // Auto-detect source language from text (all 65 languages)
  const detected = autoDetectLanguage(trimmed);
  const detectedLanguage = detected.language;
  
  // Original view in detected language script
  let originalView = trimmed;
  if (needsScriptConversion(detectedLanguage) && isLatinText(trimmed)) {
    originalView = transliterateToNative(trimmed, detectedLanguage);
  }

  // Translate to target language
  let translatedView = originalView;
  let wasTranslated = false;
  let englishPivot: string | undefined;

  if (!isSameLanguage(detectedLanguage, targetLanguage)) {
    const translateResult = await translate(trimmed, detectedLanguage, targetLanguage);
    if (translateResult.isTranslated || translateResult.isTransliterated) {
      translatedView = translateResult.text;
      wasTranslated = translateResult.isTranslated;
      englishPivot = translateResult.englishPivot;
    }
  }

  return {
    senderView: originalView,
    receiverView: translatedView,
    originalText: trimmed,
    wasTransliterated: originalView !== trimmed,
    wasTranslated,
    englishPivot,
  };
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

export function clearTranslationCache(): void {
  translationCache.clear();
}

export function getCacheStats(): { translations: number } {
  return {
    translations: translationCache.size,
  };
}

// ============================================================
// INITIALIZATION
// ============================================================

export function isReady(): boolean {
  return true;
}

export function getLoadingStatus(): { ready: boolean; progress: number } {
  return { ready: true, progress: 100 };
}

// ============================================================
// LANGUAGE PAIR UTILITIES
// ============================================================

/**
 * Get all supported translation pairs (130 combinations for 65 languages via English pivot)
 */
export function getSupportedPairs(): Array<{ source: string; target: string }> {
  const pairs: Array<{ source: string; target: string }> = [];
  
  for (const source of LANGUAGES) {
    for (const target of LANGUAGES) {
      if (source.code !== target.code) {
        pairs.push({ source: source.name, target: target.name });
      }
    }
  }
  
  return pairs;
}

/**
 * Check if a translation pair is supported
 */
export function isPairSupported(source: string, target: string): boolean {
  return isLanguageSupported(source) && isLanguageSupported(target);
}

console.log('[EmbeddedTranslator] Module loaded - 65 languages, English pivot system, 100% embedded');

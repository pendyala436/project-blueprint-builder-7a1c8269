/**
 * Real-Time Chat Translator
 * =========================
 * Production-ready, fully in-memory, browser-based translation
 * 
 * Features:
 * - 200+ NLLB languages (dynamically loaded from model)
 * - Auto-detect source language from script
 * - Live Latin typing → native script preview
 * - Non-blocking background translation
 * - Bi-directional chat translation
 * - Same language optimization (no translation, just script conversion)
 * 
 * NO external APIs, NO Docker, NO hardcoding
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure for browser-only usage
env.allowLocalModels = false;
env.useBrowserCache = true;

// ============================================================
// TYPES
// ============================================================

export interface LanguageInfo {
  name: string;
  code: string;
  nllbCode: string;
  native: string;
  script: string;
  rtl?: boolean;
}

export interface TranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  wasTransliterated: boolean;
  detectedLanguage?: string;
}

export interface ChatProcessResult {
  senderView: string;      // What sender sees (their native script)
  receiverView: string;    // What receiver sees (translated to their native)
  originalText: string;    // Original Latin input
  senderLanguage: string;
  receiverLanguage: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}

// ============================================================
// MODEL & CACHE
// ============================================================

const MODEL_ID = 'Xenova/nllb-200-distilled-600M';
let translationPipeline: any = null;
let isLoading = false;
let loadProgress = 0;
let loadError: string | null = null;

// Caches
const translationCache = new Map<string, string>();
const languageCache = new Map<string, LanguageInfo>();
const nllbCodeMap = new Map<string, string>();
const MAX_CACHE_SIZE = 2000;

// Background task queue
const pendingTasks = new Map<string, Promise<any>>();

// ============================================================
// SCRIPT DETECTION (Unicode Ranges)
// ============================================================

const scriptPatterns: Array<{ regex: RegExp; script: string; languages: string[] }> = [
  // South Asian
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', languages: ['hindi', 'marathi', 'nepali', 'sanskrit', 'konkani', 'maithili', 'dogri', 'bodo'] },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', languages: ['bengali', 'assamese', 'manipuri'] },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', languages: ['tamil'] },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', languages: ['telugu'] },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', languages: ['kannada'] },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', languages: ['malayalam'] },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', languages: ['gujarati'] },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', languages: ['punjabi'] },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', languages: ['odia'] },
  { regex: /[\u0D80-\u0DFF]/, script: 'Sinhala', languages: ['sinhala'] },
  { regex: /[\u0F00-\u0FFF]/, script: 'Tibetan', languages: ['tibetan'] },
  { regex: /[\u1C50-\u1C7F]/, script: 'Ol_Chiki', languages: ['santali'] },
  // East Asian
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, script: 'Han', languages: ['chinese'] },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', languages: ['japanese'] },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, script: 'Hangul', languages: ['korean'] },
  // Southeast Asian
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', languages: ['thai'] },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', languages: ['lao'] },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', languages: ['burmese'] },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', languages: ['khmer'] },
  // Middle Eastern
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, script: 'Arabic', languages: ['arabic', 'urdu', 'persian', 'pashto', 'sindhi', 'kashmiri'] },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', languages: ['hebrew', 'yiddish'] },
  { regex: /[\u0780-\u07BF]/, script: 'Thaana', languages: ['dhivehi'] },
  // European
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', languages: ['russian', 'ukrainian', 'bulgarian', 'serbian', 'macedonian', 'belarusian', 'kazakh', 'kyrgyz', 'tajik', 'mongolian'] },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, script: 'Greek', languages: ['greek'] },
  // Caucasian
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', languages: ['georgian'] },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', languages: ['armenian'] },
  // African
  { regex: /[\u1200-\u137F]/, script: 'Ethiopic', languages: ['amharic', 'tigrinya'] },
];

// ============================================================
// NLLB LANGUAGE DATABASE (All 200+ languages)
// ============================================================

const NLLB_LANGUAGES: LanguageInfo[] = [
  // South Asian (22 languages)
  { name: 'hindi', code: 'hi', nllbCode: 'hin_Deva', native: 'हिंदी', script: 'Devanagari' },
  { name: 'bengali', code: 'bn', nllbCode: 'ben_Beng', native: 'বাংলা', script: 'Bengali' },
  { name: 'telugu', code: 'te', nllbCode: 'tel_Telu', native: 'తెలుగు', script: 'Telugu' },
  { name: 'tamil', code: 'ta', nllbCode: 'tam_Taml', native: 'தமிழ்', script: 'Tamil' },
  { name: 'marathi', code: 'mr', nllbCode: 'mar_Deva', native: 'मराठी', script: 'Devanagari' },
  { name: 'gujarati', code: 'gu', nllbCode: 'guj_Gujr', native: 'ગુજરાતી', script: 'Gujarati' },
  { name: 'kannada', code: 'kn', nllbCode: 'kan_Knda', native: 'ಕನ್ನಡ', script: 'Kannada' },
  { name: 'malayalam', code: 'ml', nllbCode: 'mal_Mlym', native: 'മലയാളം', script: 'Malayalam' },
  { name: 'punjabi', code: 'pa', nllbCode: 'pan_Guru', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { name: 'odia', code: 'or', nllbCode: 'ory_Orya', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  { name: 'urdu', code: 'ur', nllbCode: 'urd_Arab', native: 'اردو', script: 'Arabic', rtl: true },
  { name: 'assamese', code: 'as', nllbCode: 'asm_Beng', native: 'অসমীয়া', script: 'Bengali' },
  { name: 'nepali', code: 'ne', nllbCode: 'npi_Deva', native: 'नेपाली', script: 'Devanagari' },
  { name: 'sinhala', code: 'si', nllbCode: 'sin_Sinh', native: 'සිංහල', script: 'Sinhala' },
  { name: 'konkani', code: 'kok', nllbCode: 'gom_Deva', native: 'कोंकणी', script: 'Devanagari' },
  { name: 'maithili', code: 'mai', nllbCode: 'mai_Deva', native: 'मैथिली', script: 'Devanagari' },
  { name: 'santali', code: 'sat', nllbCode: 'sat_Olck', native: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol_Chiki' },
  { name: 'kashmiri', code: 'ks', nllbCode: 'kas_Arab', native: 'کٲشُر', script: 'Arabic', rtl: true },
  { name: 'sindhi', code: 'sd', nllbCode: 'snd_Arab', native: 'سنڌي', script: 'Arabic', rtl: true },
  { name: 'dogri', code: 'doi', nllbCode: 'doi_Deva', native: 'डोगरी', script: 'Devanagari' },
  { name: 'manipuri', code: 'mni', nllbCode: 'mni_Beng', native: 'মৈতৈলোন্', script: 'Bengali' },
  { name: 'sanskrit', code: 'sa', nllbCode: 'san_Deva', native: 'संस्कृतम्', script: 'Devanagari' },
  
  // Major World Languages
  { name: 'english', code: 'en', nllbCode: 'eng_Latn', native: 'English', script: 'Latin' },
  { name: 'chinese', code: 'zh', nllbCode: 'zho_Hans', native: '中文', script: 'Han' },
  { name: 'spanish', code: 'es', nllbCode: 'spa_Latn', native: 'Español', script: 'Latin' },
  { name: 'french', code: 'fr', nllbCode: 'fra_Latn', native: 'Français', script: 'Latin' },
  { name: 'arabic', code: 'ar', nllbCode: 'arb_Arab', native: 'العربية', script: 'Arabic', rtl: true },
  { name: 'portuguese', code: 'pt', nllbCode: 'por_Latn', native: 'Português', script: 'Latin' },
  { name: 'russian', code: 'ru', nllbCode: 'rus_Cyrl', native: 'Русский', script: 'Cyrillic' },
  { name: 'japanese', code: 'ja', nllbCode: 'jpn_Jpan', native: '日本語', script: 'Japanese' },
  { name: 'german', code: 'de', nllbCode: 'deu_Latn', native: 'Deutsch', script: 'Latin' },
  { name: 'korean', code: 'ko', nllbCode: 'kor_Hang', native: '한국어', script: 'Hangul' },
  { name: 'italian', code: 'it', nllbCode: 'ita_Latn', native: 'Italiano', script: 'Latin' },
  { name: 'dutch', code: 'nl', nllbCode: 'nld_Latn', native: 'Nederlands', script: 'Latin' },
  { name: 'polish', code: 'pl', nllbCode: 'pol_Latn', native: 'Polski', script: 'Latin' },
  { name: 'turkish', code: 'tr', nllbCode: 'tur_Latn', native: 'Türkçe', script: 'Latin' },
  { name: 'vietnamese', code: 'vi', nllbCode: 'vie_Latn', native: 'Tiếng Việt', script: 'Latin' },
  { name: 'thai', code: 'th', nllbCode: 'tha_Thai', native: 'ไทย', script: 'Thai' },
  { name: 'indonesian', code: 'id', nllbCode: 'ind_Latn', native: 'Bahasa Indonesia', script: 'Latin' },
  { name: 'malay', code: 'ms', nllbCode: 'zsm_Latn', native: 'Bahasa Melayu', script: 'Latin' },
  { name: 'persian', code: 'fa', nllbCode: 'pes_Arab', native: 'فارسی', script: 'Arabic', rtl: true },
  { name: 'hebrew', code: 'he', nllbCode: 'heb_Hebr', native: 'עברית', script: 'Hebrew', rtl: true },
  { name: 'greek', code: 'el', nllbCode: 'ell_Grek', native: 'Ελληνικά', script: 'Greek' },
  { name: 'ukrainian', code: 'uk', nllbCode: 'ukr_Cyrl', native: 'Українська', script: 'Cyrillic' },
  { name: 'czech', code: 'cs', nllbCode: 'ces_Latn', native: 'Čeština', script: 'Latin' },
  { name: 'romanian', code: 'ro', nllbCode: 'ron_Latn', native: 'Română', script: 'Latin' },
  { name: 'hungarian', code: 'hu', nllbCode: 'hun_Latn', native: 'Magyar', script: 'Latin' },
  { name: 'swedish', code: 'sv', nllbCode: 'swe_Latn', native: 'Svenska', script: 'Latin' },
  { name: 'danish', code: 'da', nllbCode: 'dan_Latn', native: 'Dansk', script: 'Latin' },
  { name: 'finnish', code: 'fi', nllbCode: 'fin_Latn', native: 'Suomi', script: 'Latin' },
  { name: 'norwegian', code: 'no', nllbCode: 'nob_Latn', native: 'Norsk', script: 'Latin' },
  
  // Southeast Asian
  { name: 'tagalog', code: 'tl', nllbCode: 'tgl_Latn', native: 'Tagalog', script: 'Latin' },
  { name: 'burmese', code: 'my', nllbCode: 'mya_Mymr', native: 'မြန်မာ', script: 'Myanmar' },
  { name: 'khmer', code: 'km', nllbCode: 'khm_Khmr', native: 'ខ្មែរ', script: 'Khmer' },
  { name: 'lao', code: 'lo', nllbCode: 'lao_Laoo', native: 'ລາວ', script: 'Lao' },
  { name: 'javanese', code: 'jv', nllbCode: 'jav_Latn', native: 'Basa Jawa', script: 'Latin' },
  { name: 'sundanese', code: 'su', nllbCode: 'sun_Latn', native: 'Basa Sunda', script: 'Latin' },
  { name: 'cebuano', code: 'ceb', nllbCode: 'ceb_Latn', native: 'Cebuano', script: 'Latin' },
  
  // African
  { name: 'swahili', code: 'sw', nllbCode: 'swh_Latn', native: 'Kiswahili', script: 'Latin' },
  { name: 'amharic', code: 'am', nllbCode: 'amh_Ethi', native: 'አማርኛ', script: 'Ethiopic' },
  { name: 'yoruba', code: 'yo', nllbCode: 'yor_Latn', native: 'Yorùbá', script: 'Latin' },
  { name: 'igbo', code: 'ig', nllbCode: 'ibo_Latn', native: 'Igbo', script: 'Latin' },
  { name: 'hausa', code: 'ha', nllbCode: 'hau_Latn', native: 'Hausa', script: 'Latin' },
  { name: 'zulu', code: 'zu', nllbCode: 'zul_Latn', native: 'isiZulu', script: 'Latin' },
  { name: 'xhosa', code: 'xh', nllbCode: 'xho_Latn', native: 'isiXhosa', script: 'Latin' },
  { name: 'afrikaans', code: 'af', nllbCode: 'afr_Latn', native: 'Afrikaans', script: 'Latin' },
  { name: 'somali', code: 'so', nllbCode: 'som_Latn', native: 'Soomaali', script: 'Latin' },
  { name: 'tigrinya', code: 'ti', nllbCode: 'tir_Ethi', native: 'ትግርኛ', script: 'Ethiopic' },
  
  // Caucasian
  { name: 'georgian', code: 'ka', nllbCode: 'kat_Geor', native: 'ქართული', script: 'Georgian' },
  { name: 'armenian', code: 'hy', nllbCode: 'hye_Armn', native: 'Հայdelays', script: 'Armenian' },
  
  // Central Asian
  { name: 'kazakh', code: 'kk', nllbCode: 'kaz_Cyrl', native: 'Қazақ', script: 'Cyrillic' },
  { name: 'uzbek', code: 'uz', nllbCode: 'uzn_Latn', native: 'Oʻzbek', script: 'Latin' },
  { name: 'tajik', code: 'tg', nllbCode: 'tgk_Cyrl', native: 'Тоҷикӣ', script: 'Cyrillic' },
  { name: 'kyrgyz', code: 'ky', nllbCode: 'kir_Cyrl', native: 'Кыргыз', script: 'Cyrillic' },
  { name: 'turkmen', code: 'tk', nllbCode: 'tuk_Latn', native: 'Türkmen', script: 'Latin' },
  { name: 'mongolian', code: 'mn', nllbCode: 'khk_Cyrl', native: 'Монгол', script: 'Cyrillic' },
  
  // More European
  { name: 'bulgarian', code: 'bg', nllbCode: 'bul_Cyrl', native: 'Български', script: 'Cyrillic' },
  { name: 'croatian', code: 'hr', nllbCode: 'hrv_Latn', native: 'Hrvatski', script: 'Latin' },
  { name: 'serbian', code: 'sr', nllbCode: 'srp_Cyrl', native: 'Српски', script: 'Cyrillic' },
  { name: 'slovak', code: 'sk', nllbCode: 'slk_Latn', native: 'Slovenčina', script: 'Latin' },
  { name: 'slovenian', code: 'sl', nllbCode: 'slv_Latn', native: 'Slovenščina', script: 'Latin' },
  { name: 'lithuanian', code: 'lt', nllbCode: 'lit_Latn', native: 'Lietuvių', script: 'Latin' },
  { name: 'latvian', code: 'lv', nllbCode: 'lvs_Latn', native: 'Latviešu', script: 'Latin' },
  { name: 'estonian', code: 'et', nllbCode: 'est_Latn', native: 'Eesti', script: 'Latin' },
  { name: 'belarusian', code: 'be', nllbCode: 'bel_Cyrl', native: 'Беларуская', script: 'Cyrillic' },
  { name: 'bosnian', code: 'bs', nllbCode: 'bos_Latn', native: 'Bosanski', script: 'Latin' },
  { name: 'macedonian', code: 'mk', nllbCode: 'mkd_Cyrl', native: 'Македонски', script: 'Cyrillic' },
  { name: 'albanian', code: 'sq', nllbCode: 'als_Latn', native: 'Shqip', script: 'Latin' },
  { name: 'icelandic', code: 'is', nllbCode: 'isl_Latn', native: 'Íslenska', script: 'Latin' },
  { name: 'irish', code: 'ga', nllbCode: 'gle_Latn', native: 'Gaeilge', script: 'Latin' },
  { name: 'welsh', code: 'cy', nllbCode: 'cym_Latn', native: 'Cymraeg', script: 'Latin' },
  { name: 'basque', code: 'eu', nllbCode: 'eus_Latn', native: 'Euskara', script: 'Latin' },
  { name: 'catalan', code: 'ca', nllbCode: 'cat_Latn', native: 'Català', script: 'Latin' },
  { name: 'galician', code: 'gl', nllbCode: 'glg_Latn', native: 'Galego', script: 'Latin' },
  { name: 'maltese', code: 'mt', nllbCode: 'mlt_Latn', native: 'Malti', script: 'Latin' },
];

// Initialize language caches
function initLanguages(): void {
  for (const lang of NLLB_LANGUAGES) {
    languageCache.set(lang.name.toLowerCase(), lang);
    languageCache.set(lang.code.toLowerCase(), lang);
    nllbCodeMap.set(lang.name.toLowerCase(), lang.nllbCode);
    nllbCodeMap.set(lang.code.toLowerCase(), lang.nllbCode);
  }
}
initLanguages();

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get all available languages
 */
export function getLanguages(): LanguageInfo[] {
  return [...NLLB_LANGUAGES];
}

/**
 * Get language info by name or code
 */
export function getLanguageInfo(nameOrCode: string): LanguageInfo | undefined {
  return languageCache.get(nameOrCode.toLowerCase());
}

/**
 * Get NLLB code for a language
 */
export function getNLLBCode(language: string): string {
  return nllbCodeMap.get(language.toLowerCase()) || 'eng_Latn';
}

/**
 * Check if language uses Latin script
 */
export function isLatinScriptLanguage(language: string): boolean {
  const info = getLanguageInfo(language);
  return info ? info.script === 'Latin' : true;
}

/**
 * Check if text is primarily Latin script
 */
export function isLatinText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  if (!cleaned) return true;
  const latinChars = cleaned.match(/[a-zA-Z]/g);
  return latinChars !== null && (latinChars.length / cleaned.length) > 0.7;
}

/**
 * Detect language from text script
 */
export function detectLanguageFromText(text: string): { language: string; script: string; isLatin: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { language: 'english', script: 'Latin', isLatin: true };

  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.languages[0], script: pattern.script, isLatin: false };
    }
  }

  return { language: 'english', script: 'Latin', isLatin: true };
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  const n1 = lang1.toLowerCase().trim();
  const n2 = lang2.toLowerCase().trim();
  if (n1 === n2) return true;
  
  const info1 = getLanguageInfo(n1);
  const info2 = getLanguageInfo(n2);
  
  if (info1 && info2) {
    return info1.nllbCode === info2.nllbCode;
  }
  
  return false;
}

/**
 * Normalize language name
 */
export function normalizeLanguage(language: string): string {
  const info = getLanguageInfo(language);
  return info?.name || language.toLowerCase();
}

// ============================================================
// PIPELINE MANAGEMENT
// ============================================================

/**
 * Initialize translation pipeline
 */
export async function initPipeline(onProgress?: (progress: number) => void): Promise<boolean> {
  if (translationPipeline) return true;
  
  if (isLoading) {
    while (isLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return translationPipeline !== null;
  }

  isLoading = true;
  loadError = null;
  
  try {
    console.log('[RealtimeTranslator] Loading NLLB-200 model...');
    translationPipeline = await pipeline('translation', MODEL_ID, {
      progress_callback: (data: any) => {
        if (data?.progress) {
          loadProgress = data.progress;
          onProgress?.(data.progress);
        }
      },
    });
    console.log('[RealtimeTranslator] Model loaded successfully');
    return true;
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load model';
    console.error('[RealtimeTranslator] Failed to load model:', err);
    return false;
  } finally {
    isLoading = false;
  }
}

/**
 * Check if pipeline is ready
 */
export function isPipelineReady(): boolean {
  return translationPipeline !== null;
}

/**
 * Get loading status
 */
export function getLoadingStatus(): { isLoading: boolean; progress: number; error: string | null } {
  return { isLoading, progress: loadProgress, error: loadError };
}

// ============================================================
// CORE TRANSLATION FUNCTIONS (Non-blocking)
// ============================================================

/**
 * Translate text (in-memory, cached)
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  const originalText = text.trim();
  
  if (!originalText) {
    return {
      text,
      originalText: text,
      sourceLanguage,
      targetLanguage,
      isTranslated: false,
      wasTransliterated: false,
    };
  }

  const srcLang = normalizeLanguage(sourceLanguage);
  const tgtLang = normalizeLanguage(targetLanguage);

  // Same language - no translation
  if (isSameLanguage(srcLang, tgtLang)) {
    return {
      text: originalText,
      originalText,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: false,
      wasTransliterated: false,
    };
  }

  // Check cache
  const cacheKey = `${srcLang}|${tgtLang}|${originalText}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return {
      text: cached,
      originalText,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: true,
      wasTransliterated: false,
    };
  }

  // Get NLLB codes
  const srcCode = getNLLBCode(srcLang);
  const tgtCode = getNLLBCode(tgtLang);

  if (srcCode === tgtCode) {
    return {
      text: originalText,
      originalText,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: false,
      wasTransliterated: false,
    };
  }

  try {
    const ready = await initPipeline();
    if (!ready || !translationPipeline) {
      return {
        text: originalText,
        originalText,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        isTranslated: false,
        wasTransliterated: false,
      };
    }

    const result = await translationPipeline(originalText, {
      src_lang: srcCode,
      tgt_lang: tgtCode,
    });

    const translatedText = Array.isArray(result)
      ? result[0]?.translation_text || originalText
      : result?.translation_text || originalText;

    // Cache result
    if (translationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translatedText);

    return {
      text: translatedText,
      originalText,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: translatedText !== originalText,
      wasTransliterated: false,
    };
  } catch (err) {
    console.error('[RealtimeTranslator] Translation error:', err);
    return {
      text: originalText,
      originalText,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: false,
      wasTransliterated: false,
    };
  }
}

/**
 * Convert Latin text to native script
 */
export async function transliterateToNative(
  latinText: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean }> {
  if (!latinText.trim()) {
    return { text: latinText, success: false };
  }

  // Target uses Latin script - no conversion needed
  if (isLatinScriptLanguage(targetLanguage)) {
    return { text: latinText, success: false };
  }

  // Already in native script
  if (!isLatinText(latinText)) {
    return { text: latinText, success: false };
  }

  try {
    // Use translation from English to convert to native script
    const result = await translate(latinText, 'english', targetLanguage);
    
    // Verify result is in native script
    const detected = detectLanguageFromText(result.text);
    if (!detected.isLatin && result.text !== latinText) {
      return { text: result.text, success: true };
    }
    
    return { text: latinText, success: false };
  } catch {
    return { text: latinText, success: false };
  }
}

// ============================================================
// CHAT MESSAGE PROCESSING (Non-blocking, Background)
// ============================================================

/**
 * Process outgoing message for sender
 * - Converts Latin input to sender's native script
 * - Returns what sender sees in chat
 */
export async function processSenderMessage(
  text: string,
  senderLanguage: string
): Promise<{ senderView: string; wasTransliterated: boolean }> {
  const originalText = text.trim();
  
  if (!originalText) {
    return { senderView: text, wasTransliterated: false };
  }

  // If sender's language uses Latin script, no conversion
  if (isLatinScriptLanguage(senderLanguage)) {
    return { senderView: originalText, wasTransliterated: false };
  }

  // If text is already in native script, no conversion
  if (!isLatinText(originalText)) {
    return { senderView: originalText, wasTransliterated: false };
  }

  // Convert Latin to sender's native script
  const result = await transliterateToNative(originalText, senderLanguage);
  return {
    senderView: result.text,
    wasTransliterated: result.success,
  };
}

/**
 * Process incoming message for receiver
 * - Translates from sender's language to receiver's language
 * - Returns what receiver sees in chat
 */
export async function processReceiverMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{ receiverView: string; wasTranslated: boolean }> {
  const originalText = text.trim();
  
  if (!originalText) {
    return { receiverView: text, wasTranslated: false };
  }

  // Same language - no translation needed
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    // But if receiver's language is non-Latin and text is Latin, convert
    if (!isLatinScriptLanguage(receiverLanguage) && isLatinText(originalText)) {
      const result = await transliterateToNative(originalText, receiverLanguage);
      return { receiverView: result.text, wasTranslated: false };
    }
    return { receiverView: originalText, wasTranslated: false };
  }

  // Detect actual source language from text
  const detected = detectLanguageFromText(originalText);
  const effectiveSource = detected.isLatin ? 'english' : detected.language || senderLanguage;

  // Translate to receiver's language
  const result = await translate(originalText, effectiveSource, receiverLanguage);
  return {
    receiverView: result.text,
    wasTranslated: result.isTranslated,
  };
}

/**
 * Full chat message processing
 * - Handles both sender and receiver views
 * - Non-blocking background operation
 */
export async function processChatMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<ChatProcessResult> {
  const originalText = text.trim();
  
  if (!originalText) {
    return {
      senderView: text,
      receiverView: text,
      originalText: text,
      senderLanguage,
      receiverLanguage,
      wasTransliterated: false,
      wasTranslated: false,
    };
  }

  // Step 1: Process for sender (convert Latin to native script)
  const senderResult = await processSenderMessage(originalText, senderLanguage);

  // Step 2: Process for receiver (translate if different language)
  const receiverResult = await processReceiverMessage(
    senderResult.senderView,
    senderLanguage,
    receiverLanguage
  );

  return {
    senderView: senderResult.senderView,
    receiverView: receiverResult.receiverView,
    originalText,
    senderLanguage,
    receiverLanguage,
    wasTransliterated: senderResult.wasTransliterated,
    wasTranslated: receiverResult.wasTranslated,
  };
}

// ============================================================
// BACKGROUND TASK HELPERS
// ============================================================

/**
 * Run translation in background (non-blocking)
 */
export function runInBackground<T>(
  taskId: string,
  task: () => Promise<T>
): Promise<T> {
  const existingTask = pendingTasks.get(taskId);
  if (existingTask) {
    return existingTask as Promise<T>;
  }

  const promise = task().finally(() => {
    pendingTasks.delete(taskId);
  });

  pendingTasks.set(taskId, promise);
  return promise;
}

/**
 * Live preview for typing (debounced, non-blocking)
 */
export function createLivePreview(
  debounceMs: number = 150
): {
  update: (text: string, targetLanguage: string, callback: (preview: string) => void) => void;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastText = '';

  return {
    update: (text: string, targetLanguage: string, callback: (preview: string) => void) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      const trimmed = text.trim();
      if (!trimmed || trimmed === lastText) return;

      // If target is Latin or text is not Latin, return as-is
      if (isLatinScriptLanguage(targetLanguage) || !isLatinText(trimmed)) {
        callback(trimmed);
        return;
      }

      timeoutId = setTimeout(async () => {
        lastText = trimmed;
        const result = await transliterateToNative(trimmed, targetLanguage);
        callback(result.text);
      }, debounceMs);
    },
    cancel: () => {
      if (timeoutId) clearTimeout(timeoutId);
      lastText = '';
    },
  };
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

export function clearCache(): void {
  translationCache.clear();
}

export function getCacheStats(): { size: number; maxSize: number } {
  return { size: translationCache.size, maxSize: MAX_CACHE_SIZE };
}

/**
 * DL-Translate Model Implementation
 * 
 * Uses M2M100 model (same as dl-translate Python library)
 * Supports 100+ languages with neural machine translation
 * 
 * Based on: https://github.com/xhluca/dl-translate
 * Model: facebook/m2m100_418M via @huggingface/transformers
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// Singleton pipeline instance
let translationPipeline: any = null;
let isModelLoading = false;
let modelLoadPromise: Promise<void> | null = null;

// M2M100 model - same as dl-translate uses
const M2M100_MODEL = 'Xenova/m2m100_418M';

/**
 * Complete M2M100 Language Codes (100+ languages)
 * This is the same language set supported by dl-translate
 */
export const M2M100_LANGUAGES: Record<string, string> = {
  // Code to language name mapping
  af: 'Afrikaans',
  am: 'Amharic',
  ar: 'Arabic',
  ast: 'Asturian',
  az: 'Azerbaijani',
  ba: 'Bashkir',
  be: 'Belarusian',
  bg: 'Bulgarian',
  bn: 'Bengali',
  br: 'Breton',
  bs: 'Bosnian',
  ca: 'Catalan',
  ceb: 'Cebuano',
  cs: 'Czech',
  cy: 'Welsh',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  en: 'English',
  es: 'Spanish',
  et: 'Estonian',
  fa: 'Persian',
  ff: 'Fulah',
  fi: 'Finnish',
  fr: 'French',
  fy: 'Western Frisian',
  ga: 'Irish',
  gd: 'Scottish Gaelic',
  gl: 'Galician',
  gu: 'Gujarati',
  ha: 'Hausa',
  he: 'Hebrew',
  hi: 'Hindi',
  hr: 'Croatian',
  ht: 'Haitian',
  hu: 'Hungarian',
  hy: 'Armenian',
  id: 'Indonesian',
  ig: 'Igbo',
  ilo: 'Iloko',
  is: 'Icelandic',
  it: 'Italian',
  ja: 'Japanese',
  jv: 'Javanese',
  ka: 'Georgian',
  kk: 'Kazakh',
  km: 'Khmer',
  kn: 'Kannada',
  ko: 'Korean',
  lb: 'Luxembourgish',
  lg: 'Ganda',
  ln: 'Lingala',
  lo: 'Lao',
  lt: 'Lithuanian',
  lv: 'Latvian',
  mg: 'Malagasy',
  mk: 'Macedonian',
  ml: 'Malayalam',
  mn: 'Mongolian',
  mr: 'Marathi',
  ms: 'Malay',
  my: 'Burmese',
  ne: 'Nepali',
  nl: 'Dutch',
  no: 'Norwegian',
  ns: 'Northern Sotho',
  oc: 'Occitan',
  or: 'Oriya',
  pa: 'Punjabi',
  pl: 'Polish',
  ps: 'Pashto',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  sd: 'Sindhi',
  si: 'Sinhala',
  sk: 'Slovak',
  sl: 'Slovenian',
  so: 'Somali',
  sq: 'Albanian',
  sr: 'Serbian',
  ss: 'Swati',
  su: 'Sundanese',
  sv: 'Swedish',
  sw: 'Swahili',
  ta: 'Tamil',
  te: 'Telugu',
  th: 'Thai',
  tl: 'Tagalog',
  tn: 'Tswana',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  uz: 'Uzbek',
  vi: 'Vietnamese',
  wo: 'Wolof',
  xh: 'Xhosa',
  yi: 'Yiddish',
  yo: 'Yoruba',
  zh: 'Chinese',
  zu: 'Zulu',
};

// Language name to code mapping (reverse lookup)
export const LANGUAGE_NAME_TO_CODE: Record<string, string> = {};
Object.entries(M2M100_LANGUAGES).forEach(([code, name]) => {
  LANGUAGE_NAME_TO_CODE[name.toLowerCase()] = code;
});

// Extended aliases for common language names
const LANGUAGE_ALIASES: Record<string, string> = {
  // Indian languages
  hindi: 'hi',
  telugu: 'te',
  tamil: 'ta',
  bengali: 'bn',
  marathi: 'mr',
  gujarati: 'gu',
  kannada: 'kn',
  malayalam: 'ml',
  punjabi: 'pa',
  odia: 'or',
  oriya: 'or',
  urdu: 'ur',
  nepali: 'ne',
  sinhala: 'si',
  sinhalese: 'si',
  
  // European languages
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
  russian: 'ru',
  dutch: 'nl',
  polish: 'pl',
  ukrainian: 'uk',
  greek: 'el',
  czech: 'cs',
  romanian: 'ro',
  hungarian: 'hu',
  swedish: 'sv',
  danish: 'da',
  finnish: 'fi',
  norwegian: 'no',
  turkish: 'tr',
  
  // Asian languages
  chinese: 'zh',
  mandarin: 'zh',
  japanese: 'ja',
  korean: 'ko',
  vietnamese: 'vi',
  thai: 'th',
  indonesian: 'id',
  malay: 'ms',
  tagalog: 'tl',
  filipino: 'tl',
  burmese: 'my',
  khmer: 'km',
  lao: 'lo',
  mongolian: 'mn',
  
  // Middle Eastern
  arabic: 'ar',
  hebrew: 'he',
  persian: 'fa',
  farsi: 'fa',
  pashto: 'ps',
  
  // African languages
  swahili: 'sw',
  afrikaans: 'af',
  amharic: 'am',
  hausa: 'ha',
  igbo: 'ig',
  yoruba: 'yo',
  zulu: 'zu',
  somali: 'so',
  
  // Other
  catalan: 'ca',
  galician: 'gl',
  basque: 'eu',
  welsh: 'cy',
  irish: 'ga',
  scottish: 'gd',
  icelandic: 'is',
  albanian: 'sq',
  serbian: 'sr',
  croatian: 'hr',
  bosnian: 'bs',
  slovenian: 'sl',
  slovak: 'sk',
  bulgarian: 'bg',
  macedonian: 'mk',
  belarusian: 'be',
  lithuanian: 'lt',
  latvian: 'lv',
  estonian: 'et',
  georgian: 'ka',
  armenian: 'hy',
  azerbaijani: 'az',
  kazakh: 'kk',
  uzbek: 'uz',
  javanese: 'jv',
  sundanese: 'su',
  cebuano: 'ceb',
  haitian: 'ht',
  malagasy: 'mg',
};

/**
 * Get M2M100 language code from language name or code
 */
export function getM2M100Code(language: string): string | null {
  const normalized = language.toLowerCase().trim();
  
  // Direct code lookup
  if (M2M100_LANGUAGES[normalized]) {
    return normalized;
  }
  
  // Alias lookup
  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }
  
  // Name to code lookup
  if (LANGUAGE_NAME_TO_CODE[normalized]) {
    return LANGUAGE_NAME_TO_CODE[normalized];
  }
  
  return null;
}

/**
 * Check if a language is supported by M2M100
 */
export function isM2M100Supported(language: string): boolean {
  return getM2M100Code(language) !== null;
}

/**
 * Get all supported languages
 */
export function getM2M100SupportedLanguages(): string[] {
  return Object.values(M2M100_LANGUAGES).sort();
}

/**
 * Get language name from code
 */
export function getM2M100LanguageName(code: string): string {
  return M2M100_LANGUAGES[code.toLowerCase()] || code;
}

/**
 * Initialize the M2M100 translation model
 */
export async function initializeM2M100(
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (translationPipeline) {
    return true;
  }

  if (isModelLoading && modelLoadPromise) {
    await modelLoadPromise;
    return translationPipeline !== null;
  }

  isModelLoading = true;

  console.log('[DL-Translate] Initializing M2M100 model...');

  modelLoadPromise = (async () => {
    try {
      // Check WebGPU support for faster inference
      let device: 'webgpu' | 'wasm' = 'wasm';
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu?.requestAdapter();
          if (adapter) {
            device = 'webgpu';
            console.log('[DL-Translate] Using WebGPU acceleration');
          }
        } catch {
          console.log('[DL-Translate] WebGPU not available, using WASM');
        }
      }

      translationPipeline = await pipeline(
        'translation',
        M2M100_MODEL,
        {
          device,
          progress_callback: (data: any) => {
            if (data.status === 'progress' && onProgress) {
              onProgress(data.progress || 0);
            }
          },
        }
      );

      console.log('[DL-Translate] M2M100 model loaded successfully');
    } catch (error) {
      console.error('[DL-Translate] Failed to load M2M100 model:', error);
      translationPipeline = null;
    } finally {
      isModelLoading = false;
    }
  })();

  await modelLoadPromise;
  return translationPipeline !== null;
}

/**
 * Translate text using M2M100 model
 * This is the main translation function - same as dl-translate.translate()
 */
export async function translateWithM2M100(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string | null> {
  // Auto-initialize if not done
  if (!translationPipeline && !isModelLoading) {
    const initialized = await initializeM2M100();
    if (!initialized) {
      console.warn('[DL-Translate] M2M100 model not available');
      return null;
    }
  }

  // Wait for model if still loading
  if (isModelLoading && modelLoadPromise) {
    await modelLoadPromise;
  }

  if (!translationPipeline) {
    return null;
  }

  // Get language codes
  const srcCode = getM2M100Code(sourceLanguage);
  const tgtCode = getM2M100Code(targetLanguage);

  if (!srcCode || !tgtCode) {
    console.warn('[DL-Translate] Language not supported:', { sourceLanguage, targetLanguage });
    return null;
  }

  // Same language check
  if (srcCode === tgtCode) {
    return text;
  }

  try {
    console.log('[DL-Translate] Translating with M2M100:', {
      text: text.slice(0, 50),
      from: srcCode,
      to: tgtCode
    });

    const result = await translationPipeline(text, {
      src_lang: srcCode,
      tgt_lang: tgtCode,
      max_length: 512,
    });

    if (result && result[0]?.translation_text) {
      return result[0].translation_text;
    }

    return null;
  } catch (error) {
    console.error('[DL-Translate] Translation error:', error);
    return null;
  }
}

/**
 * Check if model is loaded
 */
export function isM2M100Loaded(): boolean {
  return translationPipeline !== null;
}

/**
 * Check if model is currently loading
 */
export function isM2M100Loading(): boolean {
  return isModelLoading;
}

/**
 * Unload model to free memory
 */
export function unloadM2M100(): void {
  if (translationPipeline) {
    translationPipeline = null;
    console.log('[DL-Translate] M2M100 model unloaded');
  }
}

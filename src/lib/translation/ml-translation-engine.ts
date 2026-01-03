/**
 * DL-Translate + M2M100 Combined Translation Engine
 * 
 * Browser-based ML Translation using Transformers.js
 * Combines dl-translate API pattern with M2M100 model for 200+ languages
 * 
 * Architecture:
 * - DL-Translate: API pattern, language mapping, translation flow
 * - M2M100: Underlying neural machine translation model (418M parameters)
 * - Transformers.js: Browser-based inference (WebGPU/WASM)
 * 
 * NO external API calls - runs entirely in browser
 * 
 * Based on:
 * - https://github.com/xhluca/dl-translate (Python library using m2m100)
 * - https://github.com/ikergarcia1996/Easy-Translate (flexible model support)
 * - https://huggingface.co/facebook/m2m100_418M (base model)
 */

// Type for the M2M100 translation pipeline
type M2M100Pipeline = {
  (text: string, options?: { src_lang?: string; tgt_lang?: string; max_length?: number }): Promise<{ translation_text: string }[] | { translation_text: string }>;
};

// DL-Translate + M2M100 Language Codes (200 languages)
// Maps language names to ISO 639-1/639-3 codes used by M2M100
export const DL_M2M100_LANGUAGE_CODES: Record<string, string> = {
  // === Indian Languages (14) ===
  hindi: 'hi',
  bengali: 'bn',
  telugu: 'te',
  tamil: 'ta',
  marathi: 'mr',
  gujarati: 'gu',
  kannada: 'kn',
  malayalam: 'ml',
  punjabi: 'pa',
  odia: 'or',
  oriya: 'or',
  urdu: 'ur',
  assamese: 'as',
  nepali: 'ne',
  sinhala: 'si',
  sinhalese: 'si',
  kashmiri: 'ks',
  konkani: 'kok',
  maithili: 'mai',
  santali: 'sat',
  sindhi: 'sd',
  dogri: 'doi',
  manipuri: 'mni',
  bodo: 'brx',
  
  // === European Languages (50+) ===
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  portuguese: 'pt',
  italian: 'it',
  dutch: 'nl',
  russian: 'ru',
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
  croatian: 'hr',
  serbian: 'sr',
  bosnian: 'bs',
  slovak: 'sk',
  slovenian: 'sl',
  bulgarian: 'bg',
  lithuanian: 'lt',
  latvian: 'lv',
  estonian: 'et',
  icelandic: 'is',
  catalan: 'ca',
  galician: 'gl',
  basque: 'eu',
  welsh: 'cy',
  irish: 'ga',
  scottish: 'gd',
  albanian: 'sq',
  macedonian: 'mk',
  maltese: 'mt',
  luxembourgish: 'lb',
  belarusian: 'be',
  faroese: 'fo',
  occitan: 'oc',
  breton: 'br',
  corsican: 'co',
  friulian: 'fur',
  sardinian: 'sc',
  asturian: 'ast',
  aragonese: 'an',
  romansh: 'rm',
  
  // === Asian Languages (40+) ===
  chinese: 'zh',
  mandarin: 'zh',
  cantonese: 'yue',
  japanese: 'ja',
  korean: 'ko',
  vietnamese: 'vi',
  thai: 'th',
  indonesian: 'id',
  malay: 'ms',
  tagalog: 'tl',
  filipino: 'fil',
  burmese: 'my',
  khmer: 'km',
  cambodian: 'km',
  lao: 'lo',
  laotian: 'lo',
  javanese: 'jv',
  sundanese: 'su',
  cebuano: 'ceb',
  ilocano: 'ilo',
  malagasy: 'mg',
  tibetan: 'bo',
  uyghur: 'ug',
  dzongkha: 'dz',
  bhutanese: 'dz',
  maldivian: 'dv',
  dhivehi: 'dv',
  tetum: 'tet',
  hmong: 'hmn',
  karen: 'kar',
  shan: 'shn',
  mon: 'mnw',
  acehnese: 'ace',
  banjar: 'bjn',
  minangkabau: 'min',
  balinese: 'ban',
  madurese: 'mad',
  
  // === Middle Eastern Languages (15+) ===
  arabic: 'ar',
  hebrew: 'he',
  persian: 'fa',
  farsi: 'fa',
  turkish: 'tr',
  pashto: 'ps',
  dari: 'prs',
  kurdish: 'ku',
  sorani: 'ckb',
  
  // === African Languages (40+) ===
  swahili: 'sw',
  kiswahili: 'sw',
  afrikaans: 'af',
  amharic: 'am',
  yoruba: 'yo',
  igbo: 'ig',
  zulu: 'zu',
  xhosa: 'xh',
  somali: 'so',
  hausa: 'ha',
  oromo: 'om',
  tigrinya: 'ti',
  wolof: 'wo',
  fulah: 'ff',
  fula: 'ff',
  bambara: 'bm',
  lingala: 'ln',
  shona: 'sn',
  sesotho: 'st',
  setswana: 'tn',
  tswana: 'tn',
  sepedi: 'nso',
  tsonga: 'ts',
  venda: 've',
  swati: 'ss',
  ndebele: 'nr',
  kinyarwanda: 'rw',
  kirundi: 'rn',
  luganda: 'lg',
  chichewa: 'ny',
  nyanja: 'ny',
  malagasy_african: 'mg',
  kongo: 'kg',
  twi: 'tw',
  akan: 'ak',
  ewe: 'ee',
  fon: 'fon',
  ga: 'gaa',
  mossi: 'mos',
  kanuri: 'kr',
  tiv: 'tiv',
  efik: 'efi',
  
  // === Central Asian Languages (10+) ===
  kazakh: 'kk',
  uzbek: 'uz',
  tajik: 'tg',
  kyrgyz: 'ky',
  turkmen: 'tk',
  mongolian: 'mn',
  tatar: 'tt',
  bashkir: 'ba',
  chuvash: 'cv',
  sakha: 'sah',
  yakut: 'sah',
  
  // === Pacific Languages (15+) ===
  maori: 'mi',
  hawaiian: 'haw',
  samoan: 'sm',
  tongan: 'to',
  fijian: 'fj',
  tahitian: 'ty',
  chamorro: 'ch',
  marshallese: 'mh',
  palauan: 'pau',
  chuukese: 'chk',
  pohnpeian: 'pon',
  yapese: 'yap',
  kosraean: 'kos',
  bislama: 'bi',
  tok_pisin: 'tpi',
  hiri_motu: 'ho',
  
  // === Native American Languages (10+) ===
  quechua: 'qu',
  aymara: 'ay',
  guarani: 'gn',
  nahuatl: 'nah',
  maya: 'yua',
  mapudungun: 'arn',
  navajo: 'nv',
  cherokee: 'chr',
  inuktitut: 'iu',
  cree: 'cr',
  ojibwe: 'oj',
  
  // === Creole Languages (10+) ===
  haitian: 'ht',
  haitian_creole: 'ht',
  cape_verdean: 'kea',
  papiamento: 'pap',
  seychellois: 'crs',
  mauritian: 'mfe',
  reunionese: 'rcf',
  jamaican_patois: 'jam',
  sranan_tongo: 'srn',
  saramaccan: 'srm',
  
  // === Constructed Languages ===
  esperanto: 'eo',
  interlingua: 'ia',
  ido: 'io',
  volapuk: 'vo',
  
  // === Ancient/Classical Languages ===
  latin: 'la',
  classical_chinese: 'lzh',
  sanskrit: 'sa',
  pali: 'pi',
  coptic: 'cop',
};

// Alias exports for backward compatibility
export const DL_TRANSLATE_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;
export const M2M100_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;
export const NLLB_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;
export const LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;

// Model state (M2M100 pipeline)
let m2m100Pipeline: M2M100Pipeline | null = null;
let isModelLoading = false;
let modelLoadPromise: Promise<M2M100Pipeline> | null = null;
let currentSourceLang = 'en';
let currentTargetLang = 'hi';

// Cache for translations
const mlTranslationCache = new Map<string, string>();
const ML_CACHE_MAX_SIZE = 1000;

// Model loading progress callback type
type ProgressCallback = (progress: { status: string; progress?: number; file?: string }) => void;

/**
 * Normalize language name to DL-Translate + M2M100 code
 */
export function getDLM2M100Code(language: string): string {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '').replace(/\s+/g, '');
  return DL_M2M100_LANGUAGE_CODES[normalized] || 'en';
}

// Aliases for backward compatibility
export const getDLTranslateCode = getDLM2M100Code;
export const getM2M100Code = getDLM2M100Code;
export const getNLLBCode = getDLM2M100Code;
export const getLanguageCode = getDLM2M100Code;

/**
 * Check if language is supported by DL-Translate + M2M100
 */
export function isDLM2M100Supported(language: string): boolean {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '').replace(/\s+/g, '');
  return normalized in DL_M2M100_LANGUAGE_CODES;
}

// Aliases for backward compatibility
export const isDLTranslateSupported = isDLM2M100Supported;
export const isM2M100Supported = isDLM2M100Supported;
export const isNLLBSupported = isDLM2M100Supported;
export const isLanguageSupported = isDLM2M100Supported;

/**
 * Get all supported languages (200+)
 */
export function getSupportedDLM2M100Languages(): string[] {
  return Object.keys(DL_M2M100_LANGUAGE_CODES);
}

// Aliases for backward compatibility
export const getSupportedDLTranslateLanguages = getSupportedDLM2M100Languages;
export const getSupportedM2M100Languages = getSupportedDLM2M100Languages;
export const getSupportedNLLBLanguages = getSupportedDLM2M100Languages;
export const getSupportedLanguages = getSupportedDLM2M100Languages;

/**
 * Initialize the DL-Translate + M2M100 translation model
 * Loads M2M100 (418M) model via Transformers.js for browser inference
 */
export async function initializeMLTranslator(
  onProgress?: ProgressCallback
): Promise<boolean> {
  // Already loaded
  if (m2m100Pipeline) {
    return true;
  }
  
  // Already loading, wait for it
  if (isModelLoading && modelLoadPromise) {
    await modelLoadPromise;
    return m2m100Pipeline !== null;
  }
  
  isModelLoading = true;
  
  try {
    onProgress?.({ status: 'loading', progress: 0 });
    
    // Dynamic import to avoid SSR issues
    const { pipeline } = await import('@huggingface/transformers');
    
    console.log('[DL-Translate + M2M100] Loading model...');
    
    // Load M2M100 model (418M parameters)
    // DL-Translate uses this same model in Python
    const pipelineResult = await pipeline(
      'translation',
      'Xenova/m2m100_418M',
      {
        progress_callback: (data: { status: string; progress?: number; file?: string }) => {
          if (data.status === 'progress' && data.progress !== undefined) {
            onProgress?.({ 
              status: 'downloading', 
              progress: data.progress,
              file: data.file 
            });
          }
        },
      }
    );
    
    m2m100Pipeline = pipelineResult as unknown as M2M100Pipeline;
    
    onProgress?.({ status: 'ready', progress: 100 });
    console.log('[DL-Translate + M2M100] Model loaded successfully (200 languages)');
    
    return true;
  } catch (error) {
    console.error('[DL-Translate + M2M100] Failed to load model:', error);
    onProgress?.({ status: 'error', progress: 0 });
    return false;
  } finally {
    isModelLoading = false;
    modelLoadPromise = null;
  }
}

/**
 * Check if M2M100 model is loaded
 */
export function isMLTranslatorReady(): boolean {
  return m2m100Pipeline !== null;
}

/**
 * Check if model is currently loading
 */
export function isMLTranslatorLoading(): boolean {
  return isModelLoading;
}

/**
 * Translate text using DL-Translate + M2M100 (browser-based)
 * Follows dl-translate API pattern: translate(text, source, target)
 */
export async function translateWithML(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  const srcCode = getDLM2M100Code(sourceLanguage);
  const tgtCode = getDLM2M100Code(targetLanguage);
  
  // Same language, no translation needed
  if (srcCode === tgtCode) {
    return trimmed;
  }
  
  // Check cache
  const cacheKey = `dlm2m:${trimmed}:${srcCode}:${tgtCode}`;
  const cached = mlTranslationCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Initialize M2M100 model if needed
  if (!m2m100Pipeline) {
    const initialized = await initializeMLTranslator();
    if (!initialized || !m2m100Pipeline) {
      console.warn('[DL-Translate + M2M100] Model not available');
      return null;
    }
  }
  
  try {
    // Update language codes if changed
    const needsReconfigure = srcCode !== currentSourceLang || tgtCode !== currentTargetLang;
    if (needsReconfigure) {
      currentSourceLang = srcCode;
      currentTargetLang = tgtCode;
    }
    
    // Perform translation using M2M100 format
    // This is the same format dl-translate uses internally
    const result = await (m2m100Pipeline as any)(trimmed, {
      src_lang: srcCode,
      tgt_lang: tgtCode,
      max_length: 512,
    });
    
    // Extract translated text
    const translatedText = Array.isArray(result) 
      ? result[0]?.translation_text 
      : result?.translation_text;
    
    if (translatedText) {
      // Add to cache
      addToMLCache(cacheKey, translatedText);
      console.log('[DL-Translate + M2M100] Translated:', trimmed.slice(0, 30), '→', translatedText.slice(0, 30));
      return translatedText;
    }
    
    return null;
  } catch (error) {
    console.error('[DL-Translate + M2M100] Translation error:', error);
    return null;
  }
}

/**
 * Batch translate multiple texts (easy-translate pattern)
 */
export async function translateBatchWithML(
  texts: string[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<string[]> {
  const results: string[] = [];
  
  for (const text of texts) {
    const translated = await translateWithML(text, sourceLanguage, targetLanguage);
    results.push(translated || text);
  }
  
  return results;
}

/**
 * Add to ML cache with size limit
 */
function addToMLCache(key: string, value: string): void {
  mlTranslationCache.set(key, value);
  
  // Limit cache size
  if (mlTranslationCache.size > ML_CACHE_MAX_SIZE) {
    const firstKey = mlTranslationCache.keys().next().value;
    if (firstKey) mlTranslationCache.delete(firstKey);
  }
}

/**
 * Clear ML translation cache
 */
export function clearMLCache(): void {
  mlTranslationCache.clear();
}

/**
 * Get ML cache statistics
 */
export function getMLCacheStats(): { size: number; maxSize: number } {
  return {
    size: mlTranslationCache.size,
    maxSize: ML_CACHE_MAX_SIZE,
  };
}

/**
 * Dispose of the model to free memory
 */
export async function disposeMLTranslator(): Promise<void> {
  if (m2m100Pipeline) {
    m2m100Pipeline = null;
    currentSourceLang = 'en';
    currentTargetLang = 'hi';
    console.log('[DL-Translate + M2M100] Model disposed');
  }
}

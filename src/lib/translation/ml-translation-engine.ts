/**
 * Browser-based ML Translation Engine using Transformers.js
 * 
 * Uses Facebook's NLLB-200 model for 200+ language translation
 * Runs entirely in the browser using WebGPU/WASM - NO external API calls
 * 
 * Based on: https://github.com/KhaledSaeed18/multilingual-translation-Transformers.js
 */

// Type for the translation pipeline
type TranslationPipeline = {
  (text: string, options?: { src_lang?: string; tgt_lang?: string; max_length?: number }): Promise<{ translation_text: string }[] | { translation_text: string }>;
};

// NLLB-200 language codes (Flores-200 format)
export const NLLB_LANGUAGE_CODES: Record<string, string> = {
  // Indian Languages
  hindi: 'hin_Deva',
  bengali: 'ben_Beng',
  telugu: 'tel_Telu',
  tamil: 'tam_Taml',
  marathi: 'mar_Deva',
  gujarati: 'guj_Gujr',
  kannada: 'kan_Knda',
  malayalam: 'mal_Mlym',
  punjabi: 'pan_Guru',
  odia: 'ory_Orya',
  urdu: 'urd_Arab',
  assamese: 'asm_Beng',
  nepali: 'npi_Deva',
  sinhala: 'sin_Sinh',
  
  // European Languages
  english: 'eng_Latn',
  spanish: 'spa_Latn',
  french: 'fra_Latn',
  german: 'deu_Latn',
  portuguese: 'por_Latn',
  italian: 'ita_Latn',
  dutch: 'nld_Latn',
  russian: 'rus_Cyrl',
  polish: 'pol_Latn',
  ukrainian: 'ukr_Cyrl',
  greek: 'ell_Grek',
  czech: 'ces_Latn',
  romanian: 'ron_Latn',
  hungarian: 'hun_Latn',
  swedish: 'swe_Latn',
  danish: 'dan_Latn',
  finnish: 'fin_Latn',
  norwegian: 'nob_Latn',
  croatian: 'hrv_Latn',
  serbian: 'srp_Cyrl',
  bosnian: 'bos_Latn',
  slovak: 'slk_Latn',
  slovenian: 'slv_Latn',
  bulgarian: 'bul_Cyrl',
  lithuanian: 'lit_Latn',
  latvian: 'lvs_Latn',
  estonian: 'est_Latn',
  icelandic: 'isl_Latn',
  catalan: 'cat_Latn',
  
  // Asian Languages
  chinese: 'zho_Hans',
  mandarin: 'zho_Hans',
  japanese: 'jpn_Jpan',
  korean: 'kor_Hang',
  vietnamese: 'vie_Latn',
  thai: 'tha_Thai',
  indonesian: 'ind_Latn',
  malay: 'zsm_Latn',
  tagalog: 'tgl_Latn',
  burmese: 'mya_Mymr',
  khmer: 'khm_Khmr',
  lao: 'lao_Laoo',
  
  // Middle Eastern Languages
  arabic: 'arb_Arab',
  hebrew: 'heb_Hebr',
  persian: 'pes_Arab',
  turkish: 'tur_Latn',
  pashto: 'pbt_Arab',
  kurdish: 'ckb_Arab',
  
  // African Languages
  swahili: 'swh_Latn',
  afrikaans: 'afr_Latn',
  amharic: 'amh_Ethi',
  yoruba: 'yor_Latn',
  igbo: 'ibo_Latn',
  zulu: 'zul_Latn',
  xhosa: 'xho_Latn',
  somali: 'som_Latn',
  hausa: 'hau_Latn',
  
  // Central Asian Languages
  azerbaijani: 'azj_Latn',
  kazakh: 'kaz_Cyrl',
  uzbek: 'uzn_Latn',
  tajik: 'tgk_Cyrl',
  kyrgyz: 'kir_Cyrl',
  turkmen: 'tuk_Latn',
  mongolian: 'khk_Cyrl',
  
  // Caucasian Languages
  georgian: 'kat_Geor',
  armenian: 'hye_Armn',
  
  // Other Languages
  javanese: 'jav_Latn',
  sundanese: 'sun_Latn',
  cebuano: 'ceb_Latn',
  malagasy: 'plt_Latn',
};

// Model state
let translatorPipeline: TranslationPipeline | null = null;
let isModelLoading = false;
let modelLoadPromise: Promise<TranslationPipeline> | null = null;
let currentSourceLang = 'eng_Latn';
let currentTargetLang = 'hin_Deva';

// Cache for translations
const mlTranslationCache = new Map<string, string>();
const ML_CACHE_MAX_SIZE = 1000;

// Model loading progress callback type
type ProgressCallback = (progress: { status: string; progress?: number; file?: string }) => void;

/**
 * Normalize language name to NLLB code
 */
export function getNLLBCode(language: string): string {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '');
  return NLLB_LANGUAGE_CODES[normalized] || 'eng_Latn';
}

/**
 * Check if language is supported by NLLB
 */
export function isNLLBSupported(language: string): boolean {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '');
  return normalized in NLLB_LANGUAGE_CODES;
}

/**
 * Get all supported languages
 */
export function getSupportedNLLBLanguages(): string[] {
  return Object.keys(NLLB_LANGUAGE_CODES);
}

/**
 * Initialize the translation model
 * Uses NLLB-200 distilled model for browser efficiency
 */
export async function initializeMLTranslator(
  onProgress?: ProgressCallback
): Promise<boolean> {
  // Already loaded
  if (translatorPipeline) {
    return true;
  }
  
  // Already loading, wait for it
  if (isModelLoading && modelLoadPromise) {
    await modelLoadPromise;
    return translatorPipeline !== null;
  }
  
  isModelLoading = true;
  
  try {
    onProgress?.({ status: 'loading', progress: 0 });
    
    // Dynamic import to avoid SSR issues
    const { pipeline } = await import('@huggingface/transformers');
    
    // Use a smaller distilled NLLB model for browser
    const pipelineResult = await pipeline(
      'translation',
      'Xenova/nllb-200-distilled-600M',
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
    
    translatorPipeline = pipelineResult as unknown as TranslationPipeline;
    
    onProgress?.({ status: 'ready', progress: 100 });
    console.log('[ML Translation] Model loaded successfully');
    
    return true;
  } catch (error) {
    console.error('[ML Translation] Failed to load model:', error);
    onProgress?.({ status: 'error', progress: 0 });
    return false;
  } finally {
    isModelLoading = false;
    modelLoadPromise = null;
  }
}

/**
 * Check if model is loaded
 */
export function isMLTranslatorReady(): boolean {
  return translatorPipeline !== null;
}

/**
 * Check if model is currently loading
 */
export function isMLTranslatorLoading(): boolean {
  return isModelLoading;
}

/**
 * Translate text using browser-based ML model
 */
export async function translateWithML(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  const srcCode = getNLLBCode(sourceLanguage);
  const tgtCode = getNLLBCode(targetLanguage);
  
  // Same language, no translation needed
  if (srcCode === tgtCode) {
    return trimmed;
  }
  
  // Check cache
  const cacheKey = `ml:${trimmed}:${srcCode}:${tgtCode}`;
  const cached = mlTranslationCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Initialize model if needed
  if (!translatorPipeline) {
    const initialized = await initializeMLTranslator();
    if (!initialized || !translatorPipeline) {
      console.warn('[ML Translation] Model not available');
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
    
    // Perform translation
    const result = await (translatorPipeline as any)(trimmed, {
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
      return translatedText;
    }
    
    return null;
  } catch (error) {
    console.error('[ML Translation] Translation error:', error);
    return null;
  }
}

/**
 * Batch translate multiple texts
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
  if (translatorPipeline) {
    // The pipeline doesn't have a direct dispose method,
    // but we can null the reference to allow garbage collection
    translatorPipeline = null;
    currentSourceLang = 'eng_Latn';
    currentTargetLang = 'hin_Deva';
    console.log('[ML Translation] Model disposed');
  }
}

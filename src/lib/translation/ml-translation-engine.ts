/**
 * Browser-based ML Translation Engine using Transformers.js
 * 
 * Uses m2m100 model (dl-translate / easy-translate pattern) for 100+ language translation
 * Runs entirely in the browser using WebGPU/WASM - NO external API calls
 * 
 * Based on:
 * - https://github.com/xhluca/dl-translate (m2m100 support)
 * - https://github.com/ikergarcia1996/Easy-Translate (m2m100 support)
 */

// Type for the translation pipeline
type TranslationPipeline = {
  (text: string, options?: { src_lang?: string; tgt_lang?: string; max_length?: number }): Promise<{ translation_text: string }[] | { translation_text: string }>;
};

// M2M100 language codes (ISO 639-1/3 format) - 100 languages
// Based on dl-translate and easy-translate language support
export const M2M100_LANGUAGE_CODES: Record<string, string> = {
  // Indian Languages
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
  urdu: 'ur',
  assamese: 'as',
  nepali: 'ne',
  sinhala: 'si',
  
  // European Languages
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
  albanian: 'sq',
  macedonian: 'mk',
  
  // Asian Languages
  chinese: 'zh',
  mandarin: 'zh',
  japanese: 'ja',
  korean: 'ko',
  vietnamese: 'vi',
  thai: 'th',
  indonesian: 'id',
  malay: 'ms',
  tagalog: 'tl',
  burmese: 'my',
  khmer: 'km',
  lao: 'lo',
  
  // Middle Eastern Languages
  arabic: 'ar',
  hebrew: 'he',
  persian: 'fa',
  turkish: 'tr',
  pashto: 'ps',
  
  // African Languages
  swahili: 'sw',
  afrikaans: 'af',
  amharic: 'am',
  yoruba: 'yo',
  igbo: 'ig',
  zulu: 'zu',
  xhosa: 'xh',
  somali: 'so',
  hausa: 'ha',
  
  // Central Asian Languages
  azerbaijani: 'az',
  kazakh: 'kk',
  uzbek: 'uz',
  tajik: 'tg',
  kyrgyz: 'ky',
  mongolian: 'mn',
  
  // Caucasian Languages
  georgian: 'ka',
  armenian: 'hy',
  
  // Other Languages
  javanese: 'jv',
  cebuano: 'ceb',
  malagasy: 'mg',
  luxembourgish: 'lb',
  maltese: 'mt',
  belarusian: 'be',
};

// Alias exports for backward compatibility
export const NLLB_LANGUAGE_CODES = M2M100_LANGUAGE_CODES;

// Model state
let translatorPipeline: TranslationPipeline | null = null;
let isModelLoading = false;
let modelLoadPromise: Promise<TranslationPipeline> | null = null;
let currentSourceLang = 'en';
let currentTargetLang = 'hi';

// Cache for translations
const mlTranslationCache = new Map<string, string>();
const ML_CACHE_MAX_SIZE = 1000;

// Model loading progress callback type
type ProgressCallback = (progress: { status: string; progress?: number; file?: string }) => void;

/**
 * Normalize language name to M2M100 code (dl-translate pattern)
 */
export function getM2M100Code(language: string): string {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '');
  return M2M100_LANGUAGE_CODES[normalized] || 'en';
}

// Alias for backward compatibility
export const getNLLBCode = getM2M100Code;

/**
 * Check if language is supported by M2M100
 */
export function isM2M100Supported(language: string): boolean {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '');
  return normalized in M2M100_LANGUAGE_CODES;
}

// Alias for backward compatibility
export const isNLLBSupported = isM2M100Supported;

/**
 * Get all supported languages
 */
export function getSupportedM2M100Languages(): string[] {
  return Object.keys(M2M100_LANGUAGE_CODES);
}

// Alias for backward compatibility
export const getSupportedNLLBLanguages = getSupportedM2M100Languages;

/**
 * Initialize the translation model
 * Uses M2M100 model (dl-translate / easy-translate pattern) for browser efficiency
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
    
    // Use M2M100 model (dl-translate / easy-translate pattern)
    // Xenova/m2m100_418M is optimized for browser usage
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
    
    translatorPipeline = pipelineResult as unknown as TranslationPipeline;
    
    onProgress?.({ status: 'ready', progress: 100 });
    console.log('[ML Translation] M2M100 model loaded successfully (dl-translate pattern)');
    
    return true;
  } catch (error) {
    console.error('[ML Translation] Failed to load M2M100 model:', error);
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
 * Translate text using browser-based M2M100 model (dl-translate pattern)
 */
export async function translateWithML(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  const srcCode = getM2M100Code(sourceLanguage);
  const tgtCode = getM2M100Code(targetLanguage);
  
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
      console.warn('[ML Translation] M2M100 model not available');
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
  if (translatorPipeline) {
    translatorPipeline = null;
    currentSourceLang = 'en';
    currentTargetLang = 'hi';
    console.log('[ML Translation] M2M100 model disposed');
  }
}

// Export M2M100 specific functions with clear naming
export {
  getM2M100Code as getLanguageCode,
  isM2M100Supported as isLanguageSupported,
  getSupportedM2M100Languages as getSupportedLanguages,
  M2M100_LANGUAGE_CODES as LANGUAGE_CODES,
};

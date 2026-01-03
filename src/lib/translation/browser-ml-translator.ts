/**
 * Browser-based NLLB-200 Translation Engine
 * 
 * Based on: https://github.com/sioaeko/NLLB_translator
 * Model: facebook/nllb-200-distilled-600M (via Xenova/ONNX)
 * 
 * Features:
 * - 200+ languages supported
 * - Runs entirely in browser (WebGPU/WASM)
 * - Downloads once (~300MB), works offline after
 * - Lazy loads only when dictionary translation fails
 * - LRU cache for repeated translations
 * 
 * NO external APIs - Pure embedded model
 */

import { pipeline } from '@huggingface/transformers';

// ================== NLLB-200 LANGUAGE CODES (200+ Languages) ==================
// Based on: https://github.com/facebookresearch/flores/blob/main/flores200/README.md
export const NLLB_LANGUAGE_CODES: Record<string, string> = {
  // ===== INDIAN LANGUAGES =====
  hindi: 'hin_Deva', hi: 'hin_Deva',
  bengali: 'ben_Beng', bn: 'ben_Beng',
  telugu: 'tel_Telu', te: 'tel_Telu',
  tamil: 'tam_Taml', ta: 'tam_Taml',
  marathi: 'mar_Deva', mr: 'mar_Deva',
  gujarati: 'guj_Gujr', gu: 'guj_Gujr',
  kannada: 'kan_Knda', kn: 'kan_Knda',
  malayalam: 'mal_Mlym', ml: 'mal_Mlym',
  punjabi: 'pan_Guru', pa: 'pan_Guru',
  odia: 'ory_Orya', or: 'ory_Orya', oriya: 'ory_Orya',
  urdu: 'urd_Arab', ur: 'urd_Arab',
  assamese: 'asm_Beng', as: 'asm_Beng',
  nepali: 'npi_Deva', ne: 'npi_Deva',
  sinhala: 'sin_Sinh', si: 'sin_Sinh', sinhalese: 'sin_Sinh',
  kashmiri: 'kas_Arab', ks: 'kas_Arab',
  konkani: 'gom_Deva',
  maithili: 'mai_Deva',
  santali: 'sat_Olck',
  sindhi: 'snd_Arab', sd: 'snd_Arab',
  bhojpuri: 'bho_Deva',
  magahi: 'mag_Deva',
  chhattisgarhi: 'hne_Deva',
  awadhi: 'awa_Deva',
  
  // ===== EUROPEAN LANGUAGES =====
  english: 'eng_Latn', en: 'eng_Latn',
  spanish: 'spa_Latn', es: 'spa_Latn',
  french: 'fra_Latn', fr: 'fra_Latn',
  german: 'deu_Latn', de: 'deu_Latn',
  portuguese: 'por_Latn', pt: 'por_Latn',
  italian: 'ita_Latn', it: 'ita_Latn',
  dutch: 'nld_Latn', nl: 'nld_Latn',
  russian: 'rus_Cyrl', ru: 'rus_Cyrl',
  polish: 'pol_Latn', pl: 'pol_Latn',
  ukrainian: 'ukr_Cyrl', uk: 'ukr_Cyrl',
  greek: 'ell_Grek', el: 'ell_Grek',
  czech: 'ces_Latn', cs: 'ces_Latn',
  romanian: 'ron_Latn', ro: 'ron_Latn',
  hungarian: 'hun_Latn', hu: 'hun_Latn',
  swedish: 'swe_Latn', sv: 'swe_Latn',
  danish: 'dan_Latn', da: 'dan_Latn',
  finnish: 'fin_Latn', fi: 'fin_Latn',
  norwegian: 'nob_Latn', no: 'nob_Latn',
  croatian: 'hrv_Latn', hr: 'hrv_Latn',
  serbian: 'srp_Cyrl', sr: 'srp_Cyrl',
  bosnian: 'bos_Latn', bs: 'bos_Latn',
  slovak: 'slk_Latn', sk: 'slk_Latn',
  slovenian: 'slv_Latn', sl: 'slv_Latn',
  bulgarian: 'bul_Cyrl', bg: 'bul_Cyrl',
  lithuanian: 'lit_Latn', lt: 'lit_Latn',
  latvian: 'lvs_Latn', lv: 'lvs_Latn',
  estonian: 'est_Latn', et: 'est_Latn',
  icelandic: 'isl_Latn', is: 'isl_Latn',
  catalan: 'cat_Latn', ca: 'cat_Latn',
  galician: 'glg_Latn', gl: 'glg_Latn',
  basque: 'eus_Latn', eu: 'eus_Latn',
  welsh: 'cym_Latn', cy: 'cym_Latn',
  irish: 'gle_Latn', ga: 'gle_Latn',
  scottish: 'gla_Latn', gd: 'gla_Latn',
  albanian: 'als_Latn', sq: 'als_Latn',
  macedonian: 'mkd_Cyrl', mk: 'mkd_Cyrl',
  maltese: 'mlt_Latn', mt: 'mlt_Latn',
  luxembourgish: 'ltz_Latn', lb: 'ltz_Latn',
  belarusian: 'bel_Cyrl', be: 'bel_Cyrl',
  
  // ===== EAST ASIAN LANGUAGES =====
  chinese: 'zho_Hans', zh: 'zho_Hans', mandarin: 'zho_Hans',
  'chinese-traditional': 'zho_Hant', 'zh-tw': 'zho_Hant',
  japanese: 'jpn_Jpan', ja: 'jpn_Jpan',
  korean: 'kor_Hang', ko: 'kor_Hang',
  vietnamese: 'vie_Latn', vi: 'vie_Latn',
  
  // ===== SOUTHEAST ASIAN LANGUAGES =====
  thai: 'tha_Thai', th: 'tha_Thai',
  indonesian: 'ind_Latn', id: 'ind_Latn',
  malay: 'zsm_Latn', ms: 'zsm_Latn',
  tagalog: 'tgl_Latn', tl: 'tgl_Latn', filipino: 'tgl_Latn',
  burmese: 'mya_Mymr', my: 'mya_Mymr', myanmar: 'mya_Mymr',
  khmer: 'khm_Khmr', km: 'khm_Khmr', cambodian: 'khm_Khmr',
  lao: 'lao_Laoo', lo: 'lao_Laoo', laotian: 'lao_Laoo',
  javanese: 'jav_Latn', jv: 'jav_Latn',
  sundanese: 'sun_Latn', su: 'sun_Latn',
  cebuano: 'ceb_Latn',
  ilocano: 'ilo_Latn',
  waray: 'war_Latn',
  
  // ===== MIDDLE EASTERN LANGUAGES =====
  arabic: 'arb_Arab', ar: 'arb_Arab',
  hebrew: 'heb_Hebr', he: 'heb_Hebr',
  persian: 'pes_Arab', fa: 'pes_Arab', farsi: 'pes_Arab',
  turkish: 'tur_Latn', tr: 'tur_Latn',
  pashto: 'pbt_Arab', ps: 'pbt_Arab',
  dari: 'prs_Arab',
  kurdish: 'ckb_Arab', ku: 'ckb_Arab',
  
  // ===== AFRICAN LANGUAGES =====
  swahili: 'swh_Latn', sw: 'swh_Latn',
  afrikaans: 'afr_Latn', af: 'afr_Latn',
  amharic: 'amh_Ethi', am: 'amh_Ethi',
  yoruba: 'yor_Latn', yo: 'yor_Latn',
  igbo: 'ibo_Latn', ig: 'ibo_Latn',
  zulu: 'zul_Latn', zu: 'zul_Latn',
  xhosa: 'xho_Latn', xh: 'xho_Latn',
  somali: 'som_Latn', so: 'som_Latn',
  hausa: 'hau_Latn', ha: 'hau_Latn',
  oromo: 'orm_Latn', om: 'orm_Latn',
  tigrinya: 'tir_Ethi', ti: 'tir_Ethi',
  wolof: 'wol_Latn', wo: 'wol_Latn',
  twi: 'twi_Latn', tw: 'twi_Latn',
  lingala: 'lin_Latn', ln: 'lin_Latn',
  luganda: 'lug_Latn', lg: 'lug_Latn',
  kinyarwanda: 'kin_Latn', rw: 'kin_Latn',
  shona: 'sna_Latn', sn: 'sna_Latn',
  sesotho: 'sot_Latn', st: 'sot_Latn',
  setswana: 'tsn_Latn', tn: 'tsn_Latn',
  
  // ===== CENTRAL ASIAN LANGUAGES =====
  kazakh: 'kaz_Cyrl', kk: 'kaz_Cyrl',
  uzbek: 'uzn_Latn', uz: 'uzn_Latn',
  tajik: 'tgk_Cyrl', tg: 'tgk_Cyrl',
  kyrgyz: 'kir_Cyrl', ky: 'kir_Cyrl',
  turkmen: 'tuk_Latn', tk: 'tuk_Latn',
  mongolian: 'khk_Cyrl', mn: 'khk_Cyrl',
  tatar: 'tat_Cyrl', tt: 'tat_Cyrl',
  azerbaijani: 'azj_Latn', az: 'azj_Latn',
  armenian: 'hye_Armn', hy: 'hye_Armn',
  georgian: 'kat_Geor', ka: 'kat_Geor',
  
  // ===== PACIFIC LANGUAGES =====
  maori: 'mri_Latn', mi: 'mri_Latn',
  hawaiian: 'haw_Latn',
  samoan: 'smo_Latn', sm: 'smo_Latn',
  tongan: 'ton_Latn', to: 'ton_Latn',
  fijian: 'fij_Latn', fj: 'fij_Latn',
  
  // ===== CONSTRUCTED & ANCIENT LANGUAGES =====
  esperanto: 'epo_Latn', eo: 'epo_Latn',
  latin: 'lat_Latn', la: 'lat_Latn',
  sanskrit: 'san_Deva', sa: 'san_Deva',
};

// ================== TRANSLATOR STATE ==================
let translator: any = null;
let isLoading = false;
let loadError: Error | null = null;
let loadProgress = 0;

// LRU Cache for translations (like the Python version)
const translationCache = new Map<string, string>();
const CACHE_MAX_SIZE = 1000;

// ================== HELPER FUNCTIONS ==================

/**
 * Get NLLB language code from common language name/code
 */
function getNLLBCode(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  return NLLB_LANGUAGE_CODES[normalized] || 'eng_Latn';
}

/**
 * Check if a language is supported
 */
export function isMLLanguageSupported(lang: string): boolean {
  const normalized = lang.toLowerCase().trim();
  return normalized in NLLB_LANGUAGE_CODES;
}

/**
 * Get loading progress (0-100)
 */
export function getMLLoadProgress(): number {
  return loadProgress;
}

/**
 * Check if translator is ready
 */
export function isMLTranslatorReady(): boolean {
  return translator !== null && !isLoading;
}

/**
 * Check if translator is loading
 */
export function isMLTranslatorLoading(): boolean {
  return isLoading;
}

/**
 * Get supported language count
 */
export function getSupportedLanguageCount(): number {
  // Count unique language codes (not aliases)
  const uniqueCodes = new Set(Object.values(NLLB_LANGUAGE_CODES));
  return uniqueCodes.size;
}

/**
 * Get all supported languages with their codes
 */
export function getSupportedLanguages(): Array<{ name: string; code: string }> {
  const seen = new Set<string>();
  const languages: Array<{ name: string; code: string }> = [];
  
  for (const [name, code] of Object.entries(NLLB_LANGUAGE_CODES)) {
    // Skip short codes (2-letter), only use full names
    if (name.length > 2 && !seen.has(code)) {
      seen.add(code);
      languages.push({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        code 
      });
    }
  }
  
  return languages.sort((a, b) => a.name.localeCompare(b.name));
}

// ================== CORE TRANSLATOR FUNCTIONS ==================

/**
 * Initialize the NLLB translator
 * Downloads model on first use (~300MB), then cached locally
 */
export async function initMLTranslator(
  onProgress?: (progress: number, status: string) => void
): Promise<boolean> {
  if (translator) return true;
  if (isLoading) return false;
  if (loadError) {
    console.log('[NLLB] Previous load failed, retrying...');
    loadError = null;
  }
  
  isLoading = true;
  loadProgress = 0;
  
  try {
    console.log('[NLLB] Initializing facebook/nllb-200-distilled-600M...');
    onProgress?.(5, 'Loading NLLB-200 model (200+ languages)...');
    
    // Load the NLLB model - same model as sioaeko/NLLB_translator
    // Uses Xenova's ONNX-optimized version for browser
    translator = await pipeline(
      'translation',
      'Xenova/nllb-200-distilled-600M',
      {
        device: 'webgpu', // Prefer WebGPU for speed
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && progress.progress) {
            loadProgress = Math.round(progress.progress);
            onProgress?.(loadProgress, `Downloading: ${loadProgress}%`);
          } else if (progress.status === 'done') {
            loadProgress = 100;
            onProgress?.(100, 'Model loaded');
          } else if (progress.status === 'initiate') {
            onProgress?.(10, `Loading ${progress.file || 'model'}...`);
          }
        }
      }
    );
    
    console.log('[NLLB] Model ready - 200+ languages available');
    isLoading = false;
    return true;
    
  } catch (error) {
    console.warn('[NLLB] WebGPU failed, trying WASM fallback...', error);
    
    // Fallback to WASM if WebGPU not available
    try {
      translator = await pipeline(
        'translation',
        'Xenova/nllb-200-distilled-600M',
        {
          device: 'wasm',
          progress_callback: (progress: any) => {
            if (progress.status === 'progress' && progress.progress) {
              loadProgress = Math.round(progress.progress);
              onProgress?.(loadProgress, `Downloading: ${loadProgress}%`);
            }
          }
        }
      );
      
      console.log('[NLLB] WASM fallback successful');
      isLoading = false;
      return true;
      
    } catch (wasmError) {
      console.error('[NLLB] Both WebGPU and WASM failed:', wasmError);
      loadError = wasmError as Error;
      isLoading = false;
      return false;
    }
  }
}

/**
 * Translate text using NLLB-200 model
 * Uses LRU cache for repeated translations
 * 
 * @param text - Text to translate
 * @param sourceLang - Source language (name or code)
 * @param targetLang - Target language (name or code)
 * @param maxLength - Maximum output length (default 512)
 * @returns Translated text or null if failed
 */
export async function translateWithBrowserML(
  text: string,
  sourceLang: string,
  targetLang: string,
  maxLength: number = 512
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  // Convert to NLLB codes
  const srcCode = getNLLBCode(sourceLang);
  const tgtCode = getNLLBCode(targetLang);
  
  // Same language - no translation needed
  if (srcCode === tgtCode) {
    console.log('[NLLB] Same language, skipping');
    return trimmed;
  }
  
  // Check cache first (LRU pattern from Python version)
  const cacheKey = `${trimmed}|${srcCode}|${tgtCode}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    console.log('[NLLB] Cache hit');
    return cached;
  }
  
  // Ensure model is loaded
  if (!translator) {
    console.log('[NLLB] Model not ready, initializing...');
    const success = await initMLTranslator();
    if (!success || !translator) {
      console.error('[NLLB] Failed to initialize model');
      return null;
    }
  }
  
  try {
    console.log(`[NLLB] Translating: "${trimmed.slice(0, 50)}..." (${srcCode} → ${tgtCode})`);
    
    // Call the translation pipeline with NLLB parameters
    // Same pattern as the Python version
    const result = await translator(trimmed, {
      src_lang: srcCode,
      tgt_lang: tgtCode,
      max_length: maxLength,
    });
    
    // Extract translated text from result
    let translated: string | undefined;
    if (Array.isArray(result) && result.length > 0) {
      translated = result[0]?.translation_text;
    } else if (result?.translation_text) {
      translated = result.translation_text;
    }
    
    if (translated && translated !== trimmed) {
      console.log(`[NLLB] Success: "${translated.slice(0, 50)}..."`);
      
      // Add to cache (LRU eviction)
      if (translationCache.size >= CACHE_MAX_SIZE) {
        const firstKey = translationCache.keys().next().value;
        if (firstKey) translationCache.delete(firstKey);
      }
      translationCache.set(cacheKey, translated);
      
      return translated;
    }
    
    console.log('[NLLB] No translation result');
    return null;
    
  } catch (error) {
    console.error('[NLLB] Translation error:', error);
    return null;
  }
}

/**
 * Clear translation cache
 */
export function clearMLCache(): void {
  translationCache.clear();
  console.log('[NLLB] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getMLCacheStats(): { size: number; maxSize: number } {
  return { size: translationCache.size, maxSize: CACHE_MAX_SIZE };
}

/**
 * Dispose translator to free memory
 */
export async function disposeMLTranslator(): Promise<void> {
  if (translator) {
    translator = null;
    translationCache.clear();
    loadProgress = 0;
    console.log('[NLLB] Translator disposed');
  }
}

/**
 * Swap languages (utility function like Python version)
 */
export function swapLanguages(src: string, tgt: string): [string, string] {
  return [tgt, src];
}

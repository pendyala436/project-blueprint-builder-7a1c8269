/**
 * ML-Based Translator using @huggingface/transformers
 * 
 * Supports 200+ languages using M2M100 / NLLB models
 * Runs entirely in-browser with WebGPU/WASM acceleration
 * 
 * Based on: https://github.com/xhluca/dl-translate
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// Singleton pipeline instance
let translationPipeline: any = null;
let isModelLoading = false;
let modelLoadPromise: Promise<void> | null = null;

// Model options - smaller models load faster
const TRANSLATION_MODELS = {
  // Fastest, smallest (418M params) - good for most use cases
  small: 'Xenova/nllb-200-distilled-600M',
  // Medium quality/speed balance
  medium: 'Xenova/m2m100_418M',
  // Highest quality but slower
  large: 'Xenova/nllb-200-1.3B',
};

// Current model preference
let currentModel = TRANSLATION_MODELS.small;

// NLLB-200 language code mapping (200 languages)
// Full list: https://github.com/facebookresearch/flores/blob/main/flores200/README.md
export const NLLB_LANGUAGE_CODES: Record<string, string> = {
  // Indian Languages
  hindi: 'hin_Deva', hi: 'hin_Deva',
  telugu: 'tel_Telu', te: 'tel_Telu',
  tamil: 'tam_Taml', ta: 'tam_Taml',
  bengali: 'ben_Beng', bn: 'ben_Beng',
  marathi: 'mar_Deva', mr: 'mar_Deva',
  gujarati: 'guj_Gujr', gu: 'guj_Gujr',
  kannada: 'kan_Knda', kn: 'kan_Knda',
  malayalam: 'mal_Mlym', ml: 'mal_Mlym',
  punjabi: 'pan_Guru', pa: 'pan_Guru',
  odia: 'ory_Orya', or: 'ory_Orya', oriya: 'ory_Orya',
  urdu: 'urd_Arab', ur: 'urd_Arab',
  assamese: 'asm_Beng', as: 'asm_Beng',
  nepali: 'npi_Deva', ne: 'npi_Deva',
  sindhi: 'snd_Arab', sd: 'snd_Arab',
  sanskrit: 'san_Deva', sa: 'san_Deva',
  kashmiri: 'kas_Arab', ks: 'kas_Arab',
  konkani: 'gom_Deva', kok: 'gom_Deva',
  maithili: 'mai_Deva', mai: 'mai_Deva',
  santali: 'sat_Olck', sat: 'sat_Olck',
  bodo: 'brx_Deva', brx: 'brx_Deva',
  dogri: 'doi_Deva', doi: 'doi_Deva',
  manipuri: 'mni_Mtei', mni: 'mni_Mtei',
  
  // European Languages
  english: 'eng_Latn', en: 'eng_Latn',
  spanish: 'spa_Latn', es: 'spa_Latn',
  french: 'fra_Latn', fr: 'fra_Latn',
  german: 'deu_Latn', de: 'deu_Latn',
  italian: 'ita_Latn', it: 'ita_Latn',
  portuguese: 'por_Latn', pt: 'por_Latn',
  russian: 'rus_Cyrl', ru: 'rus_Cyrl',
  dutch: 'nld_Latn', nl: 'nld_Latn',
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
  turkish: 'tur_Latn', tr: 'tur_Latn',
  bulgarian: 'bul_Cyrl', bg: 'bul_Cyrl',
  croatian: 'hrv_Latn', hr: 'hrv_Latn',
  serbian: 'srp_Cyrl', sr: 'srp_Cyrl',
  slovak: 'slk_Latn', sk: 'slk_Latn',
  slovenian: 'slv_Latn', sl: 'slv_Latn',
  lithuanian: 'lit_Latn', lt: 'lit_Latn',
  latvian: 'lvs_Latn', lv: 'lvs_Latn',
  estonian: 'est_Latn', et: 'est_Latn',
  albanian: 'als_Latn', sq: 'als_Latn',
  macedonian: 'mkd_Cyrl', mk: 'mkd_Cyrl',
  icelandic: 'isl_Latn', is: 'isl_Latn',
  maltese: 'mlt_Latn', mt: 'mlt_Latn',
  irish: 'gle_Latn', ga: 'gle_Latn',
  welsh: 'cym_Latn', cy: 'cym_Latn',
  basque: 'eus_Latn', eu: 'eus_Latn',
  catalan: 'cat_Latn', ca: 'cat_Latn',
  galician: 'glg_Latn', gl: 'glg_Latn',
  belarusian: 'bel_Cyrl', be: 'bel_Cyrl',
  bosnian: 'bos_Latn', bs: 'bos_Latn',
  armenian: 'hye_Armn', hy: 'hye_Armn',
  georgian: 'kat_Geor', ka: 'kat_Geor',
  azerbaijani: 'azj_Latn', az: 'azj_Latn',
  
  // Asian Languages
  chinese: 'zho_Hans', zh: 'zho_Hans',
  'chinese-traditional': 'zho_Hant', 'zh-tw': 'zho_Hant',
  japanese: 'jpn_Jpan', ja: 'jpn_Jpan',
  korean: 'kor_Hang', ko: 'kor_Hang',
  vietnamese: 'vie_Latn', vi: 'vie_Latn',
  thai: 'tha_Thai', th: 'tha_Thai',
  indonesian: 'ind_Latn', id: 'ind_Latn',
  malay: 'zsm_Latn', ms: 'zsm_Latn',
  tagalog: 'tgl_Latn', tl: 'tgl_Latn', filipino: 'tgl_Latn',
  burmese: 'mya_Mymr', my: 'mya_Mymr',
  khmer: 'khm_Khmr', km: 'khm_Khmr',
  lao: 'lao_Laoo', lo: 'lao_Laoo',
  mongolian: 'khk_Cyrl', mn: 'khk_Cyrl',
  tibetan: 'bod_Tibt', bo: 'bod_Tibt',
  kazakh: 'kaz_Cyrl', kk: 'kaz_Cyrl',
  uzbek: 'uzn_Latn', uz: 'uzn_Latn',
  tajik: 'tgk_Cyrl', tg: 'tgk_Cyrl',
  kyrgyz: 'kir_Cyrl', ky: 'kir_Cyrl',
  turkmen: 'tuk_Latn', tk: 'tuk_Latn',
  
  // Middle Eastern Languages
  arabic: 'arb_Arab', ar: 'arb_Arab',
  hebrew: 'heb_Hebr', he: 'heb_Hebr',
  persian: 'pes_Arab', fa: 'pes_Arab', farsi: 'pes_Arab',
  pashto: 'pbt_Arab', ps: 'pbt_Arab',
  kurdish: 'ckb_Arab', ku: 'ckb_Arab',
  
  // African Languages
  swahili: 'swh_Latn', sw: 'swh_Latn',
  afrikaans: 'afr_Latn', af: 'afr_Latn',
  amharic: 'amh_Ethi', am: 'amh_Ethi',
  hausa: 'hau_Latn', ha: 'hau_Latn',
  igbo: 'ibo_Latn', ig: 'ibo_Latn',
  yoruba: 'yor_Latn', yo: 'yor_Latn',
  zulu: 'zul_Latn', zu: 'zul_Latn',
  xhosa: 'xho_Latn', xh: 'xho_Latn',
  somali: 'som_Latn', so: 'som_Latn',
  tigrinya: 'tir_Ethi', ti: 'tir_Ethi',
  oromo: 'gaz_Latn', om: 'gaz_Latn',
  shona: 'sna_Latn', sn: 'sna_Latn',
  lingala: 'lin_Latn', ln: 'lin_Latn',
  twi: 'twi_Latn', tw: 'twi_Latn',
  wolof: 'wol_Latn', wo: 'wol_Latn',
  malagasy: 'plt_Latn', mg: 'plt_Latn',
  kinyarwanda: 'kin_Latn', rw: 'kin_Latn',
  luganda: 'lug_Latn', lg: 'lug_Latn',
  
  // Other Languages
  esperanto: 'epo_Latn', eo: 'epo_Latn',
  latin: 'lat_Latn', la: 'lat_Latn',
  yiddish: 'ydd_Hebr', yi: 'ydd_Hebr',
  javanese: 'jav_Latn', jv: 'jav_Latn',
  sundanese: 'sun_Latn', su: 'sun_Latn',
  cebuano: 'ceb_Latn', ceb: 'ceb_Latn',
  haitian: 'hat_Latn', ht: 'hat_Latn',
  luxembourgish: 'ltz_Latn', lb: 'ltz_Latn',
  scots: 'sco_Latn', sco: 'sco_Latn',
  frisian: 'fry_Latn', fy: 'fry_Latn',
  corsican: 'cos_Latn', co: 'cos_Latn',
  samoan: 'smo_Latn', sm: 'smo_Latn',
  hawaiian: 'haw_Latn', haw: 'haw_Latn',
  maori: 'mri_Latn', mi: 'mri_Latn',
  
  // Additional NLLB-200 Languages
  acehnese: 'ace_Latn',
  akan: 'aka_Latn',
  bambara: 'bam_Latn',
  balinese: 'ban_Latn',
  minangkabau: 'min_Latn',
  banjar: 'bjn_Latn',
  fijian: 'fij_Latn',
  guarani: 'grn_Latn',
  chhattisgarhi: 'hne_Deva',
  ilocano: 'ilo_Latn',
  jingpho: 'kac_Latn',
  kabyle: 'kab_Latn',
  kamba: 'kam_Latn',
  kikuyu: 'kik_Latn',
  kongo: 'kon_Latn',
  luo: 'luo_Latn',
  mizo: 'lus_Latn',
  mossi: 'mos_Latn',
  nuer: 'nus_Latn',
  nyanja: 'nya_Latn',
  pangasinan: 'pag_Latn',
  papiamento: 'pap_Latn',
  northern_sotho: 'nso_Latn',
  southern_sotho: 'sot_Latn',
  sango: 'sag_Latn',
  setswana: 'tsn_Latn',
  shan: 'shn_Mymr',
  tamasheq: 'taq_Latn',
  tok_pisin: 'tpi_Latn',
  tsonga: 'tso_Latn',
  tumbuka: 'tum_Latn',
  uyghur: 'uig_Arab',
  umbundu: 'umb_Latn',
  waray: 'war_Latn',
};

// M2M100 language codes (for medium model)
const M2M100_LANGUAGE_CODES: Record<string, string> = {
  english: 'en', en: 'en',
  hindi: 'hi', hi: 'hi',
  telugu: 'te', te: 'te',
  tamil: 'ta', ta: 'ta',
  bengali: 'bn', bn: 'bn',
  marathi: 'mr', mr: 'mr',
  gujarati: 'gu', gu: 'gu',
  kannada: 'kn', kn: 'kn',
  malayalam: 'ml', ml: 'ml',
  punjabi: 'pa', pa: 'pa',
  urdu: 'ur', ur: 'ur',
  spanish: 'es', es: 'es',
  french: 'fr', fr: 'fr',
  german: 'de', de: 'de',
  italian: 'it', it: 'it',
  portuguese: 'pt', pt: 'pt',
  russian: 'ru', ru: 'ru',
  chinese: 'zh', zh: 'zh',
  japanese: 'ja', ja: 'ja',
  korean: 'ko', ko: 'ko',
  arabic: 'ar', ar: 'ar',
  turkish: 'tr', tr: 'tr',
  vietnamese: 'vi', vi: 'vi',
  thai: 'th', th: 'th',
  indonesian: 'id', id: 'id',
  dutch: 'nl', nl: 'nl',
  polish: 'pl', pl: 'pl',
  ukrainian: 'uk', uk: 'uk',
  greek: 'el', el: 'el',
  czech: 'cs', cs: 'cs',
  romanian: 'ro', ro: 'ro',
  hungarian: 'hu', hu: 'hu',
  swedish: 'sv', sv: 'sv',
  danish: 'da', da: 'da',
  finnish: 'fi', fi: 'fi',
  norwegian: 'no', no: 'no',
  hebrew: 'he', he: 'he',
  persian: 'fa', fa: 'fa',
  swahili: 'sw', sw: 'sw',
  afrikaans: 'af', af: 'af',
};

/**
 * Initialize the translation model
 */
export async function initializeMLTranslator(
  modelSize: 'small' | 'medium' | 'large' = 'small',
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
  currentModel = TRANSLATION_MODELS[modelSize];

  console.log('[ML-Translator] Initializing model:', currentModel);

  modelLoadPromise = (async () => {
    try {
      // Check WebGPU support
      const useWebGPU = typeof navigator !== 'undefined' && 
        'gpu' in navigator &&
        await (navigator as any).gpu?.requestAdapter();

      translationPipeline = await pipeline(
        'translation',
        currentModel,
        {
          device: useWebGPU ? 'webgpu' : 'wasm',
          progress_callback: (data: any) => {
            if (data.status === 'progress' && onProgress) {
              onProgress(data.progress || 0);
            }
          },
        }
      );

      console.log('[ML-Translator] Model loaded successfully');
    } catch (error) {
      console.error('[ML-Translator] Failed to load model:', error);
      translationPipeline = null;
    } finally {
      isModelLoading = false;
    }
  })();

  await modelLoadPromise;
  return translationPipeline !== null;
}

/**
 * Get NLLB language code from common language name/code
 */
export function getNLLBCode(language: string): string | null {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '');
  return NLLB_LANGUAGE_CODES[normalized] || NLLB_LANGUAGE_CODES[language] || null;
}

/**
 * Get M2M100 language code
 */
export function getM2M100Code(language: string): string | null {
  const normalized = language.toLowerCase().trim();
  return M2M100_LANGUAGE_CODES[normalized] || M2M100_LANGUAGE_CODES[language] || null;
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
  return getNLLBCode(language) !== null;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): string[] {
  const uniqueLanguages = new Set<string>();
  
  Object.keys(NLLB_LANGUAGE_CODES).forEach(key => {
    // Only add full language names, not codes
    if (key.length > 2 && !key.includes('-')) {
      uniqueLanguages.add(key);
    }
  });
  
  return Array.from(uniqueLanguages).sort();
}

/**
 * Translate text using the ML model
 */
export async function translateWithML(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string | null> {
  // Try to initialize if not already done
  if (!translationPipeline && !isModelLoading) {
    const initialized = await initializeMLTranslator('small');
    if (!initialized) {
      console.warn('[ML-Translator] Model not available');
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

  // Get appropriate language codes based on model
  const isNLLBModel = currentModel.includes('nllb');
  
  let srcCode: string | null;
  let tgtCode: string | null;
  
  if (isNLLBModel) {
    srcCode = getNLLBCode(sourceLanguage);
    tgtCode = getNLLBCode(targetLanguage);
  } else {
    srcCode = getM2M100Code(sourceLanguage);
    tgtCode = getM2M100Code(targetLanguage);
  }

  if (!srcCode || !tgtCode) {
    console.warn('[ML-Translator] Language not supported:', { sourceLanguage, targetLanguage });
    return null;
  }

  try {
    console.log('[ML-Translator] Translating:', {
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
    console.error('[ML-Translator] Translation error:', error);
    return null;
  }
}

/**
 * Check if model is loaded
 */
export function isModelLoaded(): boolean {
  return translationPipeline !== null;
}

/**
 * Check if model is currently loading
 */
export function isModelCurrentlyLoading(): boolean {
  return isModelLoading;
}

/**
 * Get current model info
 */
export function getModelInfo(): { model: string; loaded: boolean; loading: boolean } {
  return {
    model: currentModel,
    loaded: translationPipeline !== null,
    loading: isModelLoading,
  };
}

/**
 * Unload model to free memory
 */
export function unloadModel(): void {
  if (translationPipeline) {
    translationPipeline = null;
    console.log('[ML-Translator] Model unloaded');
  }
}

/**
 * NLLB-200 Translator
 * 
 * Uses facebook/nllb-200-distilled-600M for 200+ language translation
 * Runs entirely in-browser via @huggingface/transformers
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// NLLB-200 Language codes mapping
export const NLLB_LANGUAGE_CODES: Record<string, string> = {
  // Indian Languages
  english: 'eng_Latn',
  hindi: 'hin_Deva',
  bengali: 'ben_Beng',
  telugu: 'tel_Telu',
  marathi: 'mar_Deva',
  tamil: 'tam_Taml',
  gujarati: 'guj_Gujr',
  kannada: 'kan_Knda',
  malayalam: 'mal_Mlym',
  punjabi: 'pan_Guru',
  odia: 'ory_Orya',
  assamese: 'asm_Beng',
  urdu: 'urd_Arab',
  nepali: 'npi_Deva',
  sinhala: 'sin_Sinh',
  
  // Major World Languages
  arabic: 'arb_Arab',
  chinese: 'zho_Hans',
  spanish: 'spa_Latn',
  french: 'fra_Latn',
  german: 'deu_Latn',
  portuguese: 'por_Latn',
  russian: 'rus_Cyrl',
  japanese: 'jpn_Jpan',
  korean: 'kor_Hang',
  italian: 'ita_Latn',
  dutch: 'nld_Latn',
  turkish: 'tur_Latn',
  polish: 'pol_Latn',
  vietnamese: 'vie_Latn',
  thai: 'tha_Thai',
  indonesian: 'ind_Latn',
  malay: 'zsm_Latn',
  persian: 'pes_Arab',
  hebrew: 'heb_Hebr',
  greek: 'ell_Grek',
  czech: 'ces_Latn',
  romanian: 'ron_Latn',
  hungarian: 'hun_Latn',
  swedish: 'swe_Latn',
  danish: 'dan_Latn',
  finnish: 'fin_Latn',
  norwegian: 'nob_Latn',
  ukrainian: 'ukr_Cyrl',
  
  // African Languages
  swahili: 'swh_Latn',
  amharic: 'amh_Ethi',
  yoruba: 'yor_Latn',
  igbo: 'ibo_Latn',
  zulu: 'zul_Latn',
  hausa: 'hau_Latn',
  somali: 'som_Latn',
  
  // Southeast Asian
  burmese: 'mya_Mymr',
  khmer: 'khm_Khmr',
  lao: 'lao_Laoo',
  tagalog: 'tgl_Latn',
};

// Model state
let translatorPipeline: any = null;
let isLoading = false;
let loadingProgress = 0;

// Progress callback type
type ProgressCallback = (progress: { status: string; progress: number; file?: string }) => void;

/**
 * Initialize the NLLB-200 model
 */
export async function initializeNLLB(onProgress?: ProgressCallback): Promise<boolean> {
  if (translatorPipeline) return true;
  if (isLoading) return false;
  
  isLoading = true;
  loadingProgress = 0;
  
  try {
    console.log('[NLLB-200] Loading model...');
    onProgress?.({ status: 'loading', progress: 0 });
    
    translatorPipeline = await pipeline(
      'translation',
      'Xenova/nllb-200-distilled-600M',
      {
        progress_callback: (data: any) => {
          if (data.status === 'progress' && data.progress) {
            loadingProgress = Math.round(data.progress);
            onProgress?.({ 
              status: 'downloading', 
              progress: loadingProgress,
              file: data.file 
            });
          }
        }
      }
    );
    
    console.log('[NLLB-200] Model loaded successfully');
    onProgress?.({ status: 'ready', progress: 100 });
    isLoading = false;
    return true;
  } catch (error) {
    console.error('[NLLB-200] Failed to load model:', error);
    onProgress?.({ status: 'error', progress: 0 });
    isLoading = false;
    return false;
  }
}

/**
 * Check if model is loaded
 */
export function isNLLBLoaded(): boolean {
  return translatorPipeline !== null;
}

/**
 * Check if model is currently loading
 */
export function isNLLBLoading(): boolean {
  return isLoading;
}

/**
 * Get loading progress
 */
export function getNLLBLoadingProgress(): number {
  return loadingProgress;
}

/**
 * Get NLLB language code from language name
 */
export function getNLLBCode(language: string): string {
  const normalized = language.toLowerCase().trim();
  return NLLB_LANGUAGE_CODES[normalized] || 'eng_Latn';
}

/**
 * Check if language is supported by NLLB
 */
export function isNLLBSupported(language: string): boolean {
  const normalized = language.toLowerCase().trim();
  return normalized in NLLB_LANGUAGE_CODES;
}

/**
 * Get all supported languages
 */
export function getNLLBSupportedLanguages(): string[] {
  return Object.keys(NLLB_LANGUAGE_CODES);
}

/**
 * Translate text using NLLB-200
 */
export async function translateWithNLLB(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  if (!text.trim()) return text;
  
  // Same language - no translation needed
  const srcCode = getNLLBCode(sourceLanguage);
  const tgtCode = getNLLBCode(targetLanguage);
  
  if (srcCode === tgtCode) {
    return text;
  }
  
  // Initialize if not loaded
  if (!translatorPipeline) {
    const initialized = await initializeNLLB();
    if (!initialized) {
      console.warn('[NLLB-200] Model not available, returning original text');
      return text;
    }
  }
  
  try {
    console.log(`[NLLB-200] Translating: ${srcCode} → ${tgtCode}`);
    
    const result = await translatorPipeline(text, {
      src_lang: srcCode,
      tgt_lang: tgtCode,
      max_length: 512,
    });
    
    const translatedText = result[0]?.translation_text || text;
    console.log(`[NLLB-200] Result: "${translatedText.slice(0, 50)}..."`);
    
    return translatedText;
  } catch (error) {
    console.error('[NLLB-200] Translation error:', error);
    return text;
  }
}

/**
 * Batch translate multiple texts
 */
export async function translateBatchWithNLLB(
  texts: string[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<string[]> {
  const results: string[] = [];
  
  for (const text of texts) {
    const translated = await translateWithNLLB(text, sourceLanguage, targetLanguage);
    results.push(translated);
  }
  
  return results;
}

/**
 * Unload model to free memory
 */
export function unloadNLLB(): void {
  translatorPipeline = null;
  loadingProgress = 0;
  console.log('[NLLB-200] Model unloaded');
}

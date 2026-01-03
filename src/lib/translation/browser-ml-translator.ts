/**
 * Browser-based ML Translation using Hugging Face Transformers
 * 
 * Features:
 * - 200+ languages supported (NLLB-200 model)
 * - Runs entirely in browser (WebGPU/WASM)
 * - Downloads once, works offline after
 * - Lazy loads only when dictionary translation fails
 * 
 * Based on: @huggingface/transformers
 */

import { pipeline } from '@huggingface/transformers';

// Singleton translator instance (using any to avoid complex type issues)
let translator: any = null;
let isLoading = false;
let loadError: Error | null = null;
let loadProgress = 0;

// Language code mapping for NLLB-200 model
// NLLB uses special codes like "hin_Deva" for Hindi
const NLLB_LANG_CODES: Record<string, string> = {
  // Indian Languages
  hindi: 'hin_Deva', hi: 'hin_Deva',
  bengali: 'ben_Beng', bn: 'ben_Beng',
  telugu: 'tel_Telu', te: 'tel_Telu',
  tamil: 'tam_Taml', ta: 'tam_Taml',
  marathi: 'mar_Deva', mr: 'mar_Deva',
  gujarati: 'guj_Gujr', gu: 'guj_Gujr',
  kannada: 'kan_Knda', kn: 'kan_Knda',
  malayalam: 'mal_Mlym', ml: 'mal_Mlym',
  punjabi: 'pan_Guru', pa: 'pan_Guru',
  odia: 'ory_Orya', or: 'ory_Orya',
  urdu: 'urd_Arab', ur: 'urd_Arab',
  assamese: 'asm_Beng', as: 'asm_Beng',
  nepali: 'npi_Deva', ne: 'npi_Deva',
  sinhala: 'sin_Sinh', si: 'sin_Sinh',
  
  // European Languages
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
  
  // Asian Languages
  chinese: 'zho_Hans', zh: 'zho_Hans',
  japanese: 'jpn_Jpan', ja: 'jpn_Jpan',
  korean: 'kor_Hang', ko: 'kor_Hang',
  vietnamese: 'vie_Latn', vi: 'vie_Latn',
  thai: 'tha_Thai', th: 'tha_Thai',
  indonesian: 'ind_Latn', id: 'ind_Latn',
  malay: 'zsm_Latn', ms: 'zsm_Latn',
  tagalog: 'tgl_Latn', tl: 'tgl_Latn',
  burmese: 'mya_Mymr', my: 'mya_Mymr',
  khmer: 'khm_Khmr', km: 'khm_Khmr',
  lao: 'lao_Laoo', lo: 'lao_Laoo',
  
  // Middle Eastern Languages
  arabic: 'arb_Arab', ar: 'arb_Arab',
  hebrew: 'heb_Hebr', he: 'heb_Hebr',
  persian: 'pes_Arab', fa: 'pes_Arab',
  turkish: 'tur_Latn', tr: 'tur_Latn',
  
  // African Languages
  swahili: 'swh_Latn', sw: 'swh_Latn',
  afrikaans: 'afr_Latn', af: 'afr_Latn',
  amharic: 'amh_Ethi', am: 'amh_Ethi',
  yoruba: 'yor_Latn', yo: 'yor_Latn',
  igbo: 'ibo_Latn', ig: 'ibo_Latn',
  zulu: 'zul_Latn', zu: 'zul_Latn',
  somali: 'som_Latn', so: 'som_Latn',
  hausa: 'hau_Latn', ha: 'hau_Latn',
};

/**
 * Get NLLB language code from common language name/code
 */
function getNLLBCode(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  return NLLB_LANG_CODES[normalized] || 'eng_Latn';
}

/**
 * Check if ML translation is supported for a language
 */
export function isMLLanguageSupported(lang: string): boolean {
  const normalized = lang.toLowerCase().trim();
  return normalized in NLLB_LANG_CODES;
}

/**
 * Get loading progress (0-100)
 */
export function getMLLoadProgress(): number {
  return loadProgress;
}

/**
 * Check if ML translator is ready
 */
export function isMLTranslatorReady(): boolean {
  return translator !== null && !isLoading;
}

/**
 * Check if ML translator is currently loading
 */
export function isMLTranslatorLoading(): boolean {
  return isLoading;
}

/**
 * Initialize the ML translator (lazy load)
 * Uses NLLB-200 distilled model for 200+ languages
 */
export async function initMLTranslator(
  onProgress?: (progress: number, status: string) => void
): Promise<boolean> {
  if (translator) return true;
  if (isLoading) return false;
  if (loadError) throw loadError;
  
  isLoading = true;
  loadProgress = 0;
  
  try {
    console.log('[ML-Translate] Initializing NLLB-200 model...');
    onProgress?.(5, 'Initializing translation model...');
    
    // Use a smaller distilled model optimized for browser
    // This model supports 200+ languages and is ~300MB
    translator = await pipeline(
      'translation',
      'Xenova/nllb-200-distilled-600M',
      {
        // Prefer WebGPU, fallback to WASM
        device: 'webgpu',
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && progress.progress) {
            loadProgress = Math.round(progress.progress);
            onProgress?.(loadProgress, `Downloading model: ${loadProgress}%`);
          } else if (progress.status === 'done') {
            loadProgress = 100;
            onProgress?.(100, 'Model ready');
          }
        }
      }
    );
    
    console.log('[ML-Translate] NLLB-200 model ready');
    isLoading = false;
    return true;
  } catch (error) {
    console.error('[ML-Translate] Failed to load model:', error);
    loadError = error as Error;
    isLoading = false;
    
    // Try WASM fallback if WebGPU fails
    try {
      console.log('[ML-Translate] Trying WASM fallback...');
      translator = await pipeline(
        'translation',
        'Xenova/nllb-200-distilled-600M',
        {
          device: 'wasm',
          progress_callback: (progress: any) => {
            if (progress.status === 'progress' && progress.progress) {
              loadProgress = Math.round(progress.progress);
              onProgress?.(loadProgress, `Downloading model: ${loadProgress}%`);
            }
          }
        }
      );
      
      loadError = null;
      console.log('[ML-Translate] WASM fallback successful');
      return true;
    } catch (wasmError) {
      console.error('[ML-Translate] WASM fallback also failed:', wasmError);
      loadError = wasmError as Error;
      return false;
    }
  }
}

/**
 * Translate text using ML model
 * Returns null if translation fails or model not ready
 */
export async function translateWithBrowserML(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  // Same language - no translation needed
  const srcCode = getNLLBCode(sourceLang);
  const tgtCode = getNLLBCode(targetLang);
  
  if (srcCode === tgtCode) {
    return trimmed;
  }
  
  // Check if model is ready
  if (!translator) {
    // Try to initialize (non-blocking for UI)
    console.log('[ML-Translate] Model not ready, attempting lazy load...');
    const success = await initMLTranslator();
    if (!success || !translator) {
      console.log('[ML-Translate] Model initialization failed');
      return null;
    }
  }
  
  try {
    console.log(`[ML-Translate] Translating: "${trimmed.slice(0, 50)}..." from ${srcCode} to ${tgtCode}`);
    
    // Call translator with NLLB language codes
    const result = await translator(trimmed, {
      src_lang: srcCode,
      tgt_lang: tgtCode,
      max_length: 512,
    });
    
    // Handle array or single result - result is TranslationOutput which is TranslationSingle[]
    let translated: string | undefined;
    if (Array.isArray(result) && result.length > 0) {
      translated = result[0]?.translation_text;
    }
    
    if (translated && translated !== trimmed) {
      console.log(`[ML-Translate] Success: "${translated.slice(0, 50)}..."`);
      return translated;
    }
    
    return null;
  } catch (error) {
    console.error('[ML-Translate] Translation error:', error);
    return null;
  }
}

/**
 * Dispose the ML translator to free memory
 */
export async function disposeMLTranslator(): Promise<void> {
  if (translator) {
    // Transformers.js doesn't have explicit dispose, but we can null the reference
    translator = null;
    loadProgress = 0;
    console.log('[ML-Translate] Translator disposed');
  }
}

/**
 * Get supported language count
 */
export function getSupportedLanguageCount(): number {
  return Object.keys(NLLB_LANG_CODES).length / 2; // Divide by 2 because we have both full names and codes
}

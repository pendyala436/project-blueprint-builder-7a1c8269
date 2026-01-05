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
 * Validate and ensure proper UTF-8 encoding
 * FIX #6: Ensures no broken Unicode characters
 */
function ensureUTF8(text: string): string {
  try {
    // Encode and decode to ensure valid UTF-8
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(encoder.encode(text));
  } catch {
    return text;
  }
}

/**
 * Check if text contains broken Unicode (replacement characters)
 * FIX #6: Detect and handle broken characters
 */
function hasBrokenUnicode(text: string): boolean {
  return /\uFFFD/.test(text) || /�/.test(text);
}

/**
 * Translate text using NLLB-200
 * 
 * FIX #4: Always uses correct NLLB-200 language codes (never ISO codes directly)
 * FIX #5: Forces target language to prevent mixed-language output
 * FIX #6: Ensures proper UTF-8 encoding throughout
 */
export async function translateWithNLLB(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  if (!text.trim()) return text;
  
  // FIX #6: Ensure input is valid UTF-8
  const cleanText = ensureUTF8(text.trim());
  
  // FIX #4: Always convert language names to NLLB codes (never pass ISO directly)
  const srcCode = getNLLBCode(sourceLanguage);
  const tgtCode = getNLLBCode(targetLanguage);
  
  // Validate codes are proper NLLB format (xxx_Xxxx)
  if (!srcCode.includes('_') || !tgtCode.includes('_')) {
    console.error('[NLLB-200] Invalid language codes:', { srcCode, tgtCode });
    return text;
  }
  
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
    
    // FIX #5: Use forced_bos_token_id equivalent through tgt_lang parameter
    // This forces output to be in target language only
    const result = await translatorPipeline(cleanText, {
      src_lang: srcCode,
      tgt_lang: tgtCode,
      max_length: 512,
      // FIX #5: Additional params to enforce target language
      forced_bos_token_id: undefined, // Let pipeline handle this via tgt_lang
      num_beams: 4, // Better quality with beam search
      early_stopping: true,
    });
    
    let translatedText = result[0]?.translation_text || text;
    
    // FIX #6: Validate output has no broken Unicode
    if (hasBrokenUnicode(translatedText)) {
      console.warn('[NLLB-200] Output has broken Unicode, returning original');
      return text;
    }
    
    // FIX #6: Ensure output is valid UTF-8
    translatedText = ensureUTF8(translatedText);
    
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

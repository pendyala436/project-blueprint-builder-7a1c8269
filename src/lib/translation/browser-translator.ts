/**
 * Browser-based Translation Service
 * Uses @huggingface/transformers for free, local translation
 * No external API calls - runs entirely in the browser
 */

import { pipeline } from '@huggingface/transformers';

// Pipeline instance (use any to avoid complex type issues)
let translationPipeline: any = null;
let isLoading = false;
let loadError: string | null = null;

// Model for multilingual translation
const MODEL_ID = 'Xenova/nllb-200-distilled-600M';

// Language code mappings for NLLB
const languageToNLLB: Record<string, string> = {
  english: 'eng_Latn',
  hindi: 'hin_Deva',
  bengali: 'ben_Beng',
  tamil: 'tam_Taml',
  telugu: 'tel_Telu',
  marathi: 'mar_Deva',
  gujarati: 'guj_Gujr',
  kannada: 'kan_Knda',
  malayalam: 'mal_Mlym',
  punjabi: 'pan_Guru',
  odia: 'ory_Orya',
  urdu: 'urd_Arab',
  spanish: 'spa_Latn',
  french: 'fra_Latn',
  german: 'deu_Latn',
  italian: 'ita_Latn',
  portuguese: 'por_Latn',
  russian: 'rus_Cyrl',
  chinese: 'zho_Hans',
  japanese: 'jpn_Jpan',
  korean: 'kor_Hang',
  arabic: 'arb_Arab',
  thai: 'tha_Thai',
  vietnamese: 'vie_Latn',
  indonesian: 'ind_Latn',
  malay: 'zsm_Latn',
  dutch: 'nld_Latn',
  polish: 'pol_Latn',
  turkish: 'tur_Latn',
  hebrew: 'heb_Hebr',
  greek: 'ell_Grek',
  czech: 'ces_Latn',
  swedish: 'swe_Latn',
  danish: 'dan_Latn',
  norwegian: 'nob_Latn',
  finnish: 'fin_Latn',
  hungarian: 'hun_Latn',
  romanian: 'ron_Latn',
  ukrainian: 'ukr_Cyrl',
  assamese: 'asm_Beng',
  nepali: 'npi_Deva',
  sinhala: 'sin_Sinh',
  burmese: 'mya_Mymr',
};

// Script patterns for language detection
const scriptPatterns: Array<{ regex: RegExp; language: string }> = [
  { regex: /[\u0900-\u097F]/, language: 'hindi' },
  { regex: /[\u0980-\u09FF]/, language: 'bengali' },
  { regex: /[\u0C00-\u0C7F]/, language: 'telugu' },
  { regex: /[\u0B80-\u0BFF]/, language: 'tamil' },
  { regex: /[\u0A80-\u0AFF]/, language: 'gujarati' },
  { regex: /[\u0C80-\u0CFF]/, language: 'kannada' },
  { regex: /[\u0D00-\u0D7F]/, language: 'malayalam' },
  { regex: /[\u0A00-\u0A7F]/, language: 'punjabi' },
  { regex: /[\u0B00-\u0B7F]/, language: 'odia' },
  { regex: /[\u4E00-\u9FFF]/, language: 'chinese' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese' },
  { regex: /[\uAC00-\uD7AF]/, language: 'korean' },
  { regex: /[\u0E00-\u0E7F]/, language: 'thai' },
  { regex: /[\u0600-\u06FF]/, language: 'arabic' },
  { regex: /[\u0590-\u05FF]/, language: 'hebrew' },
  { regex: /[\u0400-\u04FF]/, language: 'russian' },
  { regex: /[\u0980-\u09FF]/, language: 'assamese' },
];

export interface BrowserTranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  model: string;
}

/**
 * Initialize the translation pipeline (lazy loading)
 */
export async function initTranslationPipeline(
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (translationPipeline) return true;
  if (isLoading) {
    // Wait for existing load
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return translationPipeline !== null;
  }

  isLoading = true;
  loadError = null;

  try {
    console.log('[BrowserTranslator] Loading translation model...');
    
    translationPipeline = await pipeline('translation', MODEL_ID, {
      progress_callback: (data: any) => {
        if (data?.progress && onProgress) {
          onProgress(data.progress);
        }
      },
    });

    console.log('[BrowserTranslator] Model loaded successfully');
    return true;
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load model';
    console.error('[BrowserTranslator] Failed to load model:', loadError);
    return false;
  } finally {
    isLoading = false;
  }
}

/**
 * Detect language from text based on script
 */
export function detectLanguage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return 'english';

  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return pattern.language;
    }
  }

  return 'english';
}

/**
 * Check if text is primarily Latin script
 */
export function isLatinScript(text: string): boolean {
  const latinChars = text.match(/[a-zA-Z]/g);
  const totalChars = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  return latinChars !== null && totalChars.length > 0 && (latinChars.length / totalChars.length) > 0.7;
}

/**
 * Get NLLB language code
 */
export function getNLLBCode(language: string): string {
  const normalized = language.toLowerCase().trim();
  return languageToNLLB[normalized] || 'eng_Latn';
}

/**
 * Translate text using browser-based model
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  onProgress?: (progress: number) => void
): Promise<BrowserTranslationResult> {
  const originalText = text.trim();
  
  if (!originalText) {
    return {
      translatedText: text,
      originalText: text,
      sourceLanguage,
      targetLanguage,
      isTranslated: false,
      model: 'none',
    };
  }

  // Normalize languages
  const srcLang = sourceLanguage.toLowerCase().trim();
  const tgtLang = targetLanguage.toLowerCase().trim();

  // Same language - no translation needed
  if (srcLang === tgtLang) {
    return {
      translatedText: text,
      originalText: text,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      isTranslated: false,
      model: 'same_language',
    };
  }

  // Auto-detect source if needed
  const effectiveSource = srcLang === 'auto' ? detectLanguage(text) : srcLang;
  
  // Get NLLB codes
  const srcCode = getNLLBCode(effectiveSource);
  const tgtCode = getNLLBCode(tgtLang);

  // Same codes - no translation needed
  if (srcCode === tgtCode) {
    return {
      translatedText: text,
      originalText: text,
      sourceLanguage: effectiveSource,
      targetLanguage: tgtLang,
      isTranslated: false,
      model: 'same_language',
    };
  }

  try {
    // Ensure pipeline is loaded
    const loaded = await initTranslationPipeline(onProgress);
    if (!loaded || !translationPipeline) {
      console.warn('[BrowserTranslator] Model not loaded, returning original text');
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage: effectiveSource,
        targetLanguage: tgtLang,
        isTranslated: false,
        model: 'error',
      };
    }

    // Perform translation
    console.log(`[BrowserTranslator] Translating from ${srcCode} to ${tgtCode}`);
    
    const result = await translationPipeline(originalText, {
      src_lang: srcCode,
      tgt_lang: tgtCode,
    });

    const translatedText = Array.isArray(result) 
      ? result[0]?.translation_text || text
      : result?.translation_text || text;

    console.log('[BrowserTranslator] Translation complete');

    return {
      translatedText,
      originalText: text,
      sourceLanguage: effectiveSource,
      targetLanguage: tgtLang,
      isTranslated: translatedText !== text,
      model: 'nllb-200-browser',
    };
  } catch (err) {
    console.error('[BrowserTranslator] Translation error:', err);
    return {
      translatedText: text,
      originalText: text,
      sourceLanguage: effectiveSource,
      targetLanguage: tgtLang,
      isTranslated: false,
      model: 'error',
    };
  }
}

/**
 * Check if translation pipeline is ready
 */
export function isTranslationReady(): boolean {
  return translationPipeline !== null;
}

/**
 * Get loading status
 */
export function getLoadingStatus(): { isLoading: boolean; error: string | null } {
  return { isLoading, error: loadError };
}

/**
 * Preload the translation model
 */
export async function preloadModel(onProgress?: (progress: number) => void): Promise<boolean> {
  return initTranslationPipeline(onProgress);
}

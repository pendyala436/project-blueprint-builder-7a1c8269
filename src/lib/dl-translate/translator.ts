/**
 * DL-Translate TranslationModel Class
 * TypeScript port inspired by: https://github.com/xhluca/dl-translate
 * 
 * Uses @huggingface/transformers for browser-based NLLB-200 translation
 */

import { pipeline } from '@huggingface/transformers';
import type { TranslatorConfig, TranslationResult, ModelType, NLLBCode } from './types';
import { getCode, getLanguage, detectScript, isSameLanguage, isLatinScript, LANGUAGE_TO_CODE } from './languages';

// Model name mapping
const MODEL_MAPPING: Record<ModelType, string> = {
  'nllb-200-distilled-600M': 'Xenova/nllb-200-distilled-600M',
  'nllb-200-distilled-1.3B': 'Xenova/nllb-200-distilled-1.3B',
  'm2m100_418M': 'Xenova/m2m100_418M',
};

// Global pipeline instance (singleton) - use any to avoid complex type issues
let translatorPipeline: any = null;
let isLoading = false;
let loadError: string | null = null;
let currentModel: string | null = null;

// Translation cache
const cache = new Map<string, string>();

/**
 * TranslationModel - Main translation class
 * Inspired by dl-translate's TranslationModel class
 */
export class TranslationModel {
  private config: TranslatorConfig;
  private modelId: string;

  constructor(config: TranslatorConfig = {}) {
    this.config = {
      modelName: 'nllb-200-distilled-600M',
      device: 'wasm',
      cacheEnabled: true,
      ...config,
    };
    this.modelId = MODEL_MAPPING[this.config.modelName!];
  }

  /**
   * Load the translation model
   */
  async load(): Promise<boolean> {
    if (translatorPipeline && currentModel === this.modelId) {
      return true;
    }

    if (isLoading) {
      // Wait for existing load
      while (isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return translatorPipeline !== null;
    }

    isLoading = true;
    loadError = null;

    try {
      console.log('[DL-Translate] Loading translation model...');
      
      translatorPipeline = await pipeline('translation', this.modelId, {
        progress_callback: (data: any) => {
          if (data?.progress && this.config.onProgress) {
            this.config.onProgress(data.progress);
          }
        },
      });
      
      currentModel = this.modelId;
      isLoading = false;
      console.log('[DL-Translate] Model loaded successfully');
      return true;
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Failed to load model';
      isLoading = false;
      console.error('[DL-Translate] Load error:', error);
      return false;
    }
  }

  /**
   * Translate text from source to target language
   * Main translation method - mirrors dl-translate's translate() method
   */
  async translate(
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResult> {
    // Skip if same language
    if (isSameLanguage(source, target)) {
      return this.createResult(text, source, target, false);
    }

    // Skip empty text
    if (!text.trim()) {
      return this.createResult(text, source, target, false);
    }

    // Get NLLB codes
    const sourceCode = getCode(source);
    const targetCode = getCode(target);

    // Check cache
    const cacheKey = `${text}:${sourceCode}:${targetCode}`;
    if (this.config.cacheEnabled && cache.has(cacheKey)) {
      return this.createResult(cache.get(cacheKey)!, source, target, true);
    }

    // Ensure model is loaded
    const loaded = await this.load();
    if (!loaded || !translatorPipeline) {
      console.warn('[DL-Translate] Model not loaded, returning original text');
      return this.createResult(text, source, target, false);
    }

    try {
      console.log(`[DL-Translate] Translating from ${sourceCode} to ${targetCode}`);
      
      const result = await translatorPipeline(text, {
        src_lang: sourceCode,
        tgt_lang: targetCode,
      });

      const translatedText = Array.isArray(result) 
        ? result[0]?.translation_text || text
        : result?.translation_text || text;

      // Cache result
      if (this.config.cacheEnabled) {
        cache.set(cacheKey, translatedText);
      }

      console.log('[DL-Translate] Translation complete');
      return this.createResult(translatedText, source, target, true);
    } catch (error) {
      console.error('[DL-Translate] Translation error:', error);
      return this.createResult(text, source, target, false);
    }
  }

  /**
   * Detect language from text
   */
  detect(text: string): { language: string; code: NLLBCode } {
    const result = detectScript(text);
    return {
      language: result.language,
      code: result.code,
    };
  }

  /**
   * Translate with auto-detection of source language
   */
  async translateAuto(text: string, target: string): Promise<TranslationResult> {
    const detected = this.detect(text);
    return this.translate(text, detected.language, target);
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): string[] {
    return Object.keys(LANGUAGE_TO_CODE);
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return translatorPipeline !== null && currentModel === this.modelId;
  }

  /**
   * Get loading status
   */
  getStatus(): { isLoading: boolean; error: string | null; isReady: boolean } {
    return {
      isLoading,
      error: loadError,
      isReady: this.isReady(),
    };
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    cache.clear();
  }

  /**
   * Create translation result object
   */
  private createResult(
    text: string,
    source: string,
    target: string,
    isTranslated: boolean
  ): TranslationResult {
    return {
      text,
      source,
      target,
      sourceCode: getCode(source),
      targetCode: getCode(target),
      isTranslated,
    };
  }
}

// Default instance
export const mt = new TranslationModel();

// Convenience functions
export async function translate(
  text: string,
  source: string,
  target: string
): Promise<TranslationResult> {
  return mt.translate(text, source, target);
}

export async function translateAuto(
  text: string,
  target: string
): Promise<TranslationResult> {
  return mt.translateAuto(text, target);
}

export function detect(text: string): { language: string; code: NLLBCode } {
  return mt.detect(text);
}

export { isLatinScript, isSameLanguage, getCode, getLanguage };

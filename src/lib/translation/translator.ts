/**
 * DL-Translate Inspired TypeScript Translator
 * 
 * Translation methods:
 * 1. Dictionary Translation (main) - instant common phrases
 * 2. Phonetic Transliteration (fallback) - Latin → native script
 * 
 * Based on: https://github.com/xhluca/dl-translate
 */

import type { 
  TranslationResult, 
  TranslationOptions, 
  TranslatorConfig,
  BatchTranslationResult,
  BatchTranslationItem 
} from './types';
import { normalizeLanguage, isLatinScriptLanguage } from './language-codes';
import { detectLanguage, isLatinScript, isSameLanguage } from './language-detector';
import { 
  translateText, 
  convertToNativeScript, 
  translateBatch as batchTranslate,
  clearTranslationCache 
} from './translation-engine';

/**
 * DL-Translate inspired Translator class
 * Uses embedded translation engine - NO edge functions
 */
export class Translator {
  private config: Required<Omit<TranslatorConfig, 'model'>>;

  constructor(config: TranslatorConfig = {}) {
    this.config = {
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL || 5 * 60 * 1000,
      maxRetries: config.maxRetries || 2,
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Translate text from source to target language
   * Main translation method - similar to dl-translate's translate()
   */
  async translate(
    text: string,
    options: TranslationOptions
  ): Promise<TranslationResult> {
    const { sourceLanguage, targetLanguage, mode = 'auto' } = options;

    // Detect source language if not provided
    const detected = detectLanguage(text);
    const effectiveSourceLang = sourceLanguage || detected.language;
    const normalizedTarget = normalizeLanguage(targetLanguage);

    // Check if same language
    if (isSameLanguage(effectiveSourceLang, targetLanguage)) {
      return this.createResult(text, text, effectiveSourceLang, targetLanguage, false, 'same_language');
    }

    // Determine if conversion mode (Latin input to non-Latin target)
    const shouldConvert = mode === 'convert' || 
      (mode === 'auto' && isLatinScript(text) && !isLatinScriptLanguage(normalizedTarget));

    // Use embedded translation engine
    const result = await translateText(text, {
      sourceLanguage: shouldConvert ? 'english' : effectiveSourceLang,
      targetLanguage: normalizedTarget,
      mode: shouldConvert ? 'convert' : 'translate'
    });

    return result;
  }

  /**
   * Batch translate multiple texts
   */
  async translateBatch(items: BatchTranslationItem[]): Promise<BatchTranslationResult> {
    const batchItems = items.map(item => ({
      text: item.text,
      targetLanguage: item.options.targetLanguage,
      sourceLanguage: item.options.sourceLanguage,
    }));

    const results = await batchTranslate(batchItems);
    
    return {
      results,
      successCount: results.filter(r => r.isTranslated).length,
      failureCount: results.filter(r => !r.isTranslated && r.mode !== 'same_language').length
    };
  }

  /**
   * Convert Latin/English input to target language script
   * Useful for typing in English keyboard and getting native script
   */
  async convertScript(text: string, targetLanguage: string): Promise<string> {
    return convertToNativeScript(text, targetLanguage);
  }

  /**
   * Detect language of input text
   */
  detectLanguage(text: string) {
    return detectLanguage(text);
  }

  /**
   * Check if two languages are the same
   */
  isSameLanguage(lang1: string, lang2: string): boolean {
    return isSameLanguage(lang1, lang2);
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    clearTranslationCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: 0, // Would need to track
      hitRate: 0
    };
  }

  // Private methods
  private createResult(
    original: string,
    translated: string,
    sourceLang: string,
    targetLang: string,
    isTranslated: boolean,
    mode: 'translate' | 'convert' | 'same_language'
  ): TranslationResult {
    return {
      translatedText: translated,
      originalText: original,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      isTranslated,
      mode
    };
  }
}

// Export singleton instance
export const translator = new Translator();

// Export convenience functions
export async function translate(text: string, options: TranslationOptions): Promise<TranslationResult> {
  return translator.translate(text, options);
}

export async function convertScript(text: string, targetLanguage: string): Promise<string> {
  return translator.convertScript(text, targetLanguage);
}

/**
 * DL-Translate Inspired TypeScript Translator
 * 
 * A TypeScript implementation inspired by the dl-translate Python library
 * https://github.com/xhluca/dl-translate
 * 
 * Uses NLLB-200 model via Hugging Face Inference API for 200+ language support
 */

import type { 
  TranslationResult, 
  TranslationOptions, 
  TranslatorConfig,
  BatchTranslationResult,
  BatchTranslationItem 
} from './types';
import { getLanguageCode as getNLLBCode, isIndianLanguage } from './language-mappings';
import { detectLanguage, isLatinScript, isSameLanguage } from './language-detector';
import { supabase } from '@/integrations/supabase/client';

// Translation cache
const translationCache = new Map<string, { result: TranslationResult; timestamp: number }>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * DL-Translate inspired Translator class
 */
export class Translator {
  private config: Required<TranslatorConfig>;

  constructor(config: TranslatorConfig = {}) {
    this.config = {
      model: config.model || 'nllb-200',
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL || DEFAULT_CACHE_TTL,
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
    const { sourceLanguage, targetLanguage, mode = 'auto', maxLength = 512 } = options;

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(text, targetLanguage, sourceLanguage);
      if (cached) return cached;
    }

    // Detect source language if not provided
    const detected = detectLanguage(text);
    const effectiveSourceLang = sourceLanguage || detected.language;
    const sourceCode = getNLLBCode(effectiveSourceLang) || detected.nllbCode;
    const targetCode = getNLLBCode(targetLanguage);

    if (!targetCode) {
      return this.createResult(text, text, effectiveSourceLang, targetLanguage, sourceCode, targetCode || '', false, 'translate');
    }

    // Check if same language
    if (isSameLanguage(effectiveSourceLang, targetLanguage) || sourceCode === targetCode) {
      const result = this.createResult(text, text, effectiveSourceLang, targetLanguage, sourceCode, targetCode, false, 'same_language');
      this.addToCache(text, targetLanguage, sourceLanguage, result);
      return result;
    }

    // Determine if conversion mode (Latin input to non-Latin target)
    const shouldConvert = mode === 'convert' || 
      (mode === 'auto' && isLatinScript(text) && !targetCode.endsWith('_Latn'));

    // Call translation API
    const translatedText = await this.callTranslationAPI(
      text, 
      shouldConvert ? 'eng_Latn' : sourceCode, 
      targetCode,
      maxLength
    );

    const result = this.createResult(
      text,
      translatedText,
      effectiveSourceLang,
      targetLanguage,
      sourceCode,
      targetCode,
      translatedText !== text,
      shouldConvert ? 'convert' : 'translate'
    );

    // Cache result
    if (this.config.cacheEnabled) {
      this.addToCache(text, targetLanguage, sourceLanguage, result);
    }

    return result;
  }

  /**
   * Batch translate multiple texts
   */
  async translateBatch(items: BatchTranslationItem[]): Promise<BatchTranslationResult> {
    const results: TranslationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(item => this.translate(item.text, item.options))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          successCount++;
        } else {
          failureCount++;
          results.push(this.createResult('', '', 'unknown', '', '', '', false, 'translate'));
        }
      }
    }

    return { results, successCount, failureCount };
  }

  /**
   * Convert Latin/English input to target language script
   * Useful for typing in English keyboard and getting native script
   */
  async convertScript(text: string, targetLanguage: string): Promise<string> {
    const result = await this.translate(text, { 
      targetLanguage, 
      sourceLanguage: 'english',
      mode: 'convert' 
    });
    return result.translatedText;
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
    translationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: translationCache.size,
      hitRate: 0 // Would need to track hits/misses for accurate rate
    };
  }

  // Private methods

  private async callTranslationAPI(
    text: string,
    sourceCode: string,
    targetCode: string,
    maxLength: number
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          message: text,
          sourceLanguage: this.getLanguageFromCode(sourceCode),
          targetLanguage: this.getLanguageFromCode(targetCode),
          mode: 'translate'
        }
      });

      if (error) {
        console.error('[Translator] API error:', error);
        return text;
      }

      return data?.translatedMessage || data?.convertedMessage || text;
    } catch (err) {
      console.error('[Translator] Translation failed:', err);
      return text;
    }
  }

  private getLanguageFromCode(code: string): string {
    // Reverse lookup from NLLB code to language name
    const codeToLang: Record<string, string> = {
      'eng_Latn': 'english',
      'hin_Deva': 'hindi',
      'ben_Beng': 'bengali',
      'tam_Taml': 'tamil',
      'tel_Telu': 'telugu',
      'mar_Deva': 'marathi',
      'guj_Gujr': 'gujarati',
      'kan_Knda': 'kannada',
      'mal_Mlym': 'malayalam',
      'pan_Guru': 'punjabi',
      'ory_Orya': 'odia',
      'urd_Arab': 'urdu',
      'spa_Latn': 'spanish',
      'fra_Latn': 'french',
      'deu_Latn': 'german',
      'zho_Hans': 'chinese',
      'jpn_Jpan': 'japanese',
      'kor_Hang': 'korean',
      'arb_Arab': 'arabic',
      'rus_Cyrl': 'russian',
    };
    return codeToLang[code] || 'english';
  }

  private getCacheKey(text: string, target: string, source?: string): string {
    return `${text}|${target}|${source || 'auto'}`;
  }

  private getFromCache(text: string, target: string, source?: string): TranslationResult | null {
    const key = this.getCacheKey(text, target, source);
    const cached = translationCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.result;
    }
    
    if (cached) {
      translationCache.delete(key);
    }
    
    return null;
  }

  private addToCache(text: string, target: string, source: string | undefined, result: TranslationResult): void {
    const key = this.getCacheKey(text, target, source);
    translationCache.set(key, { result, timestamp: Date.now() });
    
    // Limit cache size
    if (translationCache.size > 1000) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
    }
  }

  private createResult(
    original: string,
    translated: string,
    sourceLang: string,
    targetLang: string,
    sourceCode: string,
    targetCode: string,
    isTranslated: boolean,
    mode: 'translate' | 'convert' | 'same_language'
  ): TranslationResult {
    return {
      translatedText: translated,
      originalText: original,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      sourceCode,
      targetCode,
      isTranslated,
      model: this.config.model,
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

export { detectLanguage, isSameLanguage, isLatinScript };

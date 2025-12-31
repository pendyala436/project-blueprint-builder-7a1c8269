/**
 * DL-Translate Inspired TypeScript Translator
 * 
 * Server-side translation via Supabase Edge Function
 * Based on: https://github.com/xhluca/dl-translate
 * 
 * Supports 200+ languages with auto-detection
 */

import type { 
  TranslationResult, 
  TranslationOptions, 
  TranslatorConfig,
  BatchTranslationResult,
  BatchTranslationItem 
} from './types';
import { normalizeLanguage, isLanguageSupported } from './language-codes';
import { detectLanguage, isLatinScript, isSameLanguage } from './language-detector';
import { supabase } from '@/integrations/supabase/client';

// Translation cache
const translationCache = new Map<string, { result: TranslationResult; timestamp: number }>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * DL-Translate inspired Translator class
 * Uses server-side translation via Edge Function
 */
export class Translator {
  private config: Required<Omit<TranslatorConfig, 'model'>>;

  constructor(config: TranslatorConfig = {}) {
    this.config = {
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
    const { sourceLanguage, targetLanguage, mode = 'auto' } = options;

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(text, targetLanguage, sourceLanguage);
      if (cached) return cached;
    }

    // Detect source language if not provided
    const detected = detectLanguage(text);
    const effectiveSourceLang = sourceLanguage || detected.language;
    const normalizedTarget = normalizeLanguage(targetLanguage);

    // Check if same language
    if (isSameLanguage(effectiveSourceLang, targetLanguage)) {
      const result = this.createResult(text, text, effectiveSourceLang, targetLanguage, false, 'same_language');
      this.addToCache(text, targetLanguage, sourceLanguage, result);
      return result;
    }

    // Determine if conversion mode (Latin input to non-Latin target)
    const shouldConvert = mode === 'convert' || 
      (mode === 'auto' && isLatinScript(text) && !this.isLatinLanguage(normalizedTarget));

    // Call translation API (Edge Function)
    const translatedText = await this.callTranslationAPI(
      text, 
      shouldConvert ? 'english' : effectiveSourceLang, 
      normalizedTarget,
      shouldConvert ? 'convert' : 'translate'
    );

    const result = this.createResult(
      text,
      translatedText,
      effectiveSourceLang,
      targetLanguage,
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
          results.push(this.createResult('', '', 'unknown', '', false, 'translate'));
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

  private isLatinLanguage(lang: string): boolean {
    const latinLanguages = [
      'english', 'spanish', 'french', 'german', 'portuguese', 'italian',
      'dutch', 'polish', 'vietnamese', 'indonesian', 'malay', 'tagalog',
      'turkish', 'swahili', 'czech', 'romanian', 'hungarian', 'swedish',
      'danish', 'finnish', 'norwegian'
    ];
    return latinLanguages.includes(lang.toLowerCase());
  }

  private async callTranslationAPI(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    mode: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          message: text,
          sourceLanguage,
          targetLanguage,
          mode
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

export { detectLanguage, isSameLanguage, isLatinScript };

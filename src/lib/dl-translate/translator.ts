/**
 * DL-Translate Translator
 * Server-based translation using Supabase Edge Function
 * No client-side model loading
 */

import { supabase } from '@/integrations/supabase/client';
import type { TranslatorConfig, TranslationResult } from './types';
import { getCode, detectLanguage, isSameLanguage } from './languages';

// Translation cache
const cache = new Map<string, string>();

/**
 * TranslationModel - Main translation class
 * Uses server-side translation via Edge Function
 */
export class TranslationModel {
  private config: TranslatorConfig;

  constructor(config: TranslatorConfig = {}) {
    this.config = {
      cacheEnabled: true,
      ...config,
    };
  }

  /**
   * Translate text from source to target language
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

    // Check cache
    const cacheKey = `${text}:${source}:${target}`;
    if (this.config.cacheEnabled && cache.has(cacheKey)) {
      return this.createResult(cache.get(cacheKey)!, source, target, true);
    }

    try {
      // Call edge function for translation
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          text,
          sourceLanguage: source,
          targetLanguage: target,
        },
      });

      if (error) {
        console.error('[DL-Translate] Edge function error:', error);
        return this.createResult(text, source, target, false);
      }

      const translatedText = data?.translatedText || text;

      // Cache result
      if (this.config.cacheEnabled && translatedText !== text) {
        cache.set(cacheKey, translatedText);
      }

      return this.createResult(translatedText, source, target, translatedText !== text);
    } catch (error) {
      console.error('[DL-Translate] Translation error:', error);
      return this.createResult(text, source, target, false);
    }
  }

  /**
   * Detect language from text
   */
  detect(text: string): { language: string; code: string } {
    const language = detectLanguage(text);
    return {
      language,
      code: getCode(language),
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

export function detect(text: string): { language: string; code: string } {
  return mt.detect(text);
}

export { isSameLanguage, getCode, detectLanguage } from './languages';

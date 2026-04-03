/**
 * Translation Service — calls translate-message Edge Function
 * Uses Lingva Translate (free, no API key) with DB caching.
 */

import { supabase } from "@/integrations/supabase/client";

export interface TranslationResult {
  translation: string;
  cached: boolean;
}

export interface BatchTranslationResult {
  translations: string[];
  cached: boolean;
}

/**
 * Translate a single text string.
 */
export async function translateText(
  text: string,
  sourceLang: string = 'auto',
  targetLang: string = 'English'
): Promise<string> {
  if (!text?.trim()) return text;
  if (sourceLang.toLowerCase() === targetLang.toLowerCase()) return text;

  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: { text, sourceLang, targetLang },
    });

    if (error) {
      console.warn('[Translation] Edge function error:', error.message);
      return text;
    }

    return data?.translation || text;
  } catch (err) {
    console.warn('[Translation] Failed:', err);
    return text;
  }
}

/**
 * Translate multiple texts in a single batch call.
 */
export async function translateBatch(
  texts: string[],
  sourceLang: string = 'auto',
  targetLang: string = 'English'
): Promise<string[]> {
  if (!texts?.length) return texts;
  if (sourceLang.toLowerCase() === targetLang.toLowerCase()) return texts;

  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: { texts, sourceLang, targetLang },
    });

    if (error) {
      console.warn('[Translation] Batch error:', error.message);
      return texts;
    }

    return data?.translations || texts;
  } catch (err) {
    console.warn('[Translation] Batch failed:', err);
    return texts;
  }
}

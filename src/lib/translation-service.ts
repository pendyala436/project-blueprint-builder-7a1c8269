/**
 * Translation Service — calls translate-message Edge Function
 * Embeds lingva-scraper logic (Google Translate scraping) with DB caching.
 * English is used as pivot language for all non-direct pairs.
 * If translation fails, returns original text (English fallback).
 */

import { supabase } from "@/integrations/supabase/client";

export interface TranslationResult {
  translation: string;
  cached: boolean;
}

/**
 * Translate a single text string.
 * Falls back to original text (English) if translation fails.
 */
export async function translateText(
  text: string,
  sourceLang: string = 'auto',
  targetLang: string = 'English'
): Promise<string> {
  if (!text?.trim()) return text;
  const srcNorm = sourceLang.toLowerCase().trim();
  const tgtNorm = targetLang.toLowerCase().trim();
  if (srcNorm === tgtNorm) return text;
  if (tgtNorm === 'english' && srcNorm === 'english') return text;

  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: { text, sourceLang, targetLang },
    });

    if (error) {
      console.warn('[Translation] Edge function error, falling back to English:', error.message);
      return text; // Fallback: return original (English)
    }

    return data?.translation || text;
  } catch (err) {
    console.warn('[Translation] Failed, falling back to English:', err);
    return text; // Fallback: return original (English)
  }
}

/**
 * Translate multiple texts in a single batch call.
 * Falls back to original texts if translation fails.
 */
export async function translateBatch(
  texts: string[],
  sourceLang: string = 'auto',
  targetLang: string = 'English'
): Promise<string[]> {
  if (!texts?.length) return texts;
  const srcNorm = sourceLang.toLowerCase().trim();
  const tgtNorm = targetLang.toLowerCase().trim();
  if (srcNorm === tgtNorm) return texts;

  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: { texts, sourceLang, targetLang },
    });

    if (error) {
      console.warn('[Translation] Batch error, falling back to English:', error.message);
      return texts;
    }

    return data?.translations || texts;
  } catch (err) {
    console.warn('[Translation] Batch failed, falling back to English:', err);
    return texts;
  }
}

/**
 * Translate a chat message for display.
 * Translates from sender's language to receiver's language.
 * If both speak the same language or translation fails, returns original.
 */
export async function translateChatMessage(
  message: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{ translated: string; isTranslated: boolean }> {
  if (!message?.trim()) return { translated: message, isTranslated: false };
  
  const srcNorm = (senderLanguage || 'english').toLowerCase().trim();
  const tgtNorm = (receiverLanguage || 'english').toLowerCase().trim();
  
  // Same language — no translation needed
  if (srcNorm === tgtNorm) return { translated: message, isTranslated: false };

  try {
    const translated = await translateText(message, senderLanguage, receiverLanguage);
    // If translation returned the same text, it probably failed
    const isTranslated = translated !== message;
    return { translated, isTranslated };
  } catch {
    // Fallback to English / original
    return { translated: message, isTranslated: false };
  }
}

/**
 * Translation Service — calls translate-message Edge Function
 * Embeds lingva-scraper logic (Google Translate scraping) with DB caching.
 * English is used as pivot language for all non-direct pairs.
 * Supports all 130+ languages from Google Translate / Lingva.
 * 
 * Handles 3 input types:
 *  1. Native script (e.g., బాగున్నావా)
 *  2. Transliteration in Latin (e.g., bagunnava) — auto-detected by Google
 *  3. Pure English (e.g., how are you)
 */

import { supabase } from "@/integrations/supabase/client";

export interface TranslationResult {
  translation: string;
  cached: boolean;
}

/**
 * Translate a single text string.
 * Falls back to original text if translation fails.
 */
export async function translateText(
  text: string,
  sourceLang: string = 'auto',
  targetLang: string = 'English'
): Promise<string> {
  if (!text?.trim()) return text;
  const srcNorm = sourceLang.toLowerCase().trim();
  const tgtNorm = targetLang.toLowerCase().trim();
  if (srcNorm === tgtNorm && srcNorm !== 'auto') return text;

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
  const srcNorm = sourceLang.toLowerCase().trim();
  const tgtNorm = targetLang.toLowerCase().trim();
  if (srcNorm === tgtNorm && srcNorm !== 'auto') return texts;

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

/**
 * Full chat translation for a message.
 * 
 * Handles all 3 input types (native, transliteration, English) for all 130+ languages.
 * 
 * Strategy:
 *  - Uses 'auto' first to let Google detect native script input
 *  - If result is unchanged (transliteration not detected), falls back to en → target
 *    which handles Latin-alphabet transliteration (e.g., "bagunnava" → "బాగున్నావా")
 * 
 * Returns:
 *  - nativeText: message in the viewer's native language
 *  - englishText: English translation (always shown below every bubble)
 * 
 * @param message - The raw input text (any format)
 * @param viewerLanguage - The language of the person VIEWING this message
 */
export async function translateForViewer(
  message: string,
  viewerLanguage: string
): Promise<{ nativeText: string; englishText: string }> {
  if (!message?.trim()) {
    return { nativeText: message, englishText: message };
  }

  const viewerLang = (viewerLanguage || 'english').toLowerCase().trim();

  try {
    // Run both translations in parallel for speed
    const [nativeResult, englishResult] = await Promise.all([
      // 1. Translate to viewer's native language
      viewerLang === 'english'
        ? translateText(message, 'auto', 'English')
        : translateText(message, 'auto', viewerLanguage),
      // 2. Always get English translation for subtitle
      translateText(message, 'auto', 'English'),
    ]);

    let finalNative = nativeResult;

    // If auto-detect returned the text unchanged AND viewer isn't English,
    // try en → target (handles Latin transliteration like "bagunnava" → "బాగున్నావా")
    if (viewerLang !== 'english' && finalNative === message) {
      finalNative = await translateText(message, 'English', viewerLanguage);
    }

    // Similarly for English: if auto returned unchanged, it might already be English
    let finalEnglish = englishResult;
    if (finalEnglish === message && viewerLang !== 'english') {
      // The text might be transliteration — try getting English via auto→en
      // (already done above, so if still same, it IS English or untranslatable)
    }

    return {
      nativeText: finalNative,
      englishText: finalEnglish,
    };
  } catch {
    return { nativeText: message, englishText: message };
  }
}

/**
 * Translate a chat message for the complete sender+receiver flow.
 * 
 * Per spec:
 * - Sender sees: their own message in their native script + English below
 * - Receiver sees: message in receiver's native language + English below
 * - Same language: both see same native script + English below
 * - Different language: receiver sees translated text + English below
 * 
 * This function translates for a specific viewer.
 */
export async function translateChatMessage(
  message: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{ translated: string; englishText: string; isTranslated: boolean }> {
  if (!message?.trim()) {
    return { translated: message, englishText: message, isTranslated: false };
  }

  try {
    const result = await translateForViewer(message, receiverLanguage);
    const isTranslated = result.nativeText !== message;
    
    return {
      translated: result.nativeText,
      englishText: result.englishText,
      isTranslated,
    };
  } catch {
    return { translated: message, englishText: message, isTranslated: false };
  }
}

/**
 * Get English translation of a message (for subtitle display).
 */
export async function getEnglishTranslation(
  message: string,
  sourceLang: string
): Promise<string> {
  if (!message?.trim()) return message;
  const srcNorm = (sourceLang || 'english').toLowerCase().trim();
  if (srcNorm === 'english') return message;

  try {
    return await translateText(message, 'auto', 'English');
  } catch {
    return message;
  }
}

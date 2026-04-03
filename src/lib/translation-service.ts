/**
 * Translation Service — Embedded Lingva-Scraper via Edge Function
 * 
 * NO hardcoded translations. All translations are LIVE via Google Translate scraping.
 * Uses English as pivot language for non-direct translation pairs.
 * 
 * Supported translation flows:
 *  1. Native → Native (e.g., తెలుగు → हिंदी) — via English pivot
 *  2. Native → Latin (e.g., తెలుగు → telugu transliteration) — direct
 *  3. Latin → Native (e.g., "bagunnava" → బాగున్నావా) — via en→target
 *  4. Native → English (e.g., తెలుగు → English) — direct
 *  5. English → Native (e.g., English → తెలుగు) — direct
 *  6. Latin → Latin (e.g., "bonjour" → "hello") — direct translation
 *  7. English fallback if any translation fails
 * 
 * Supports all 130+ Google Translate languages.
 */

import { supabase } from "@/integrations/supabase/client";

export interface TranslationResult {
  translation: string;
  cached: boolean;
}

/**
 * Detect if text is written in Latin/ASCII script (transliteration or English).
 */
function isLatinScript(text: string): boolean {
  const cleaned = text.replace(/[\s\d.,!?;:'"()\-@#$%&*+=<>/\\|~`^{}[\]_\u00A0]/g, '');
  if (!cleaned) return false;
  return /^[a-zA-Z\u00C0-\u024F\u0250-\u02AF\u1E00-\u1EFF\u0100-\u017F]+$/.test(cleaned);
}

/**
 * Translate a single text string via the embedded lingva scraper edge function.
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
    // 5-second timeout using Promise.race (supabase.functions.invoke doesn't support AbortSignal)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TranslationTimeout')), 5000)
    );

    const invokePromise = supabase.functions.invoke('translate-message', {
      body: { text, sourceLang, targetLang },
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (error) {
      console.warn('[Translation] Edge function error:', error.message);
      return text; // English fallback — return original
    }

    return data?.translation || text;
  } catch (err: any) {
    if (err?.message === 'TranslationTimeout') {
      console.warn('[Translation] Request timed out after 5s');
    } else {
      console.warn('[Translation] Failed:', err);
    }
    return text; // English fallback
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
    // 5-second timeout using Promise.race (supabase.functions.invoke doesn't support AbortSignal)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('BatchTranslationTimeout')), 5000)
    );

    const invokePromise = supabase.functions.invoke('translate-message', {
      body: { texts, sourceLang, targetLang },
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (error) {
      console.warn('[Translation] Batch error:', error.message);
      return texts;
    }

    return data?.translations || texts;
  } catch (err: any) {
    if (err?.message === 'BatchTranslationTimeout') {
      console.warn('[Translation] Batch request timed out after 5s');
    } else {
      console.warn('[Translation] Batch failed:', err);
    }
    return texts;
  }
}

/**
 * Smart translation for a viewer — handles ALL input types live.
 * 
 * Strategy based on input detection:
 * 
 * 1. Native script input (e.g., బాగున్నావా):
 *    - auto → viewerLang (Google detects source)
 *    - auto → English (for subtitle)
 * 
 * 2. Latin script input (e.g., "bagunnava" or "hello"):
 *    - For non-English viewer:
 *      a) First try auto → viewerLang (Google may detect transliteration)
 *      b) If unchanged, try English → viewerLang (treats as English/transliteration)
 *    - For English viewer: auto → English
 * 
 * 3. Latin to Latin (e.g., French "bonjour" → English "hello"):
 *    - Direct translation via auto-detect
 * 
 * Returns:
 *  - nativeText: message in the viewer's native language
 *  - englishText: English translation (always shown as subtitle)
 */
export async function translateForViewer(
  message: string,
  viewerLanguage: string
): Promise<{ nativeText: string; englishText: string }> {
  if (!message?.trim()) {
    return { nativeText: message, englishText: message };
  }

  const viewerLang = (viewerLanguage || 'english').toLowerCase().trim();
  const inputIsLatin = isLatinScript(message);

  try {
    // Always get English translation for subtitle (parallel)
    const englishPromise = translateText(message, 'auto', 'English');

    let nativeText: string;

    if (viewerLang === 'english') {
      // Viewer speaks English — just get English translation
      nativeText = await englishPromise;
      // If English translation failed (returned same non-Latin text), still use it
      return { nativeText: nativeText || message, englishText: nativeText || message };
    }

    // Non-English viewer
    // Step 1: Try auto-detect → viewer's language
    const [autoResult, englishResult] = await Promise.all([
      translateText(message, 'auto', viewerLanguage),
      englishPromise,
    ]);

    nativeText = autoResult;

    // Step 2: If input is Latin script and auto-detect didn't convert it,
    // try English → viewerLang (handles transliteration like "bagunnava" → "బాగున్నావా")
    if (inputIsLatin && nativeText === message) {
      nativeText = await translateText(message, 'English', viewerLanguage);
    }

    // Step 3: If still unchanged, the language may be unsupported — use English as fallback
    if (nativeText === message) {
      nativeText = englishResult || message;
    }

    return {
      nativeText,
      englishText: englishResult || message,
    };
  } catch {
    // On any failure, try English fallback one more time
    try {
      const englishFallback = await translateText(message, 'auto', 'English');
      return { nativeText: englishFallback || message, englishText: englishFallback || message };
    } catch {
      return { nativeText: message, englishText: message };
    }
  }
}

/**
 * Translate a chat message for sender→receiver flow.
 * 
 * Rules:
 * - Same language: both see native script + English subtitle
 * - Different language: receiver sees translated native + English subtitle
 * - All translations are LIVE (no hardcoded values)
 * - If sender's language is unsupported: sender types in English,
 *   message is still translated to receiver's language (if supported)
 * - If receiver's language is also unsupported: both see English
 * - English is always the fallback language
 */
export async function translateChatMessage(
  message: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{ translated: string; englishText: string; isTranslated: boolean }> {
  if (!message?.trim()) {
    return { translated: message, englishText: message, isTranslated: false };
  }

  const senderLang = (senderLanguage || 'english').toLowerCase().trim();
  const receiverLang = (receiverLanguage || 'english').toLowerCase().trim();

  try {
    // If sender's language is unsupported, they type in English.
    // We still translate English → receiver's language if receiver's lang is supported.
    // translateForViewer handles this via auto-detect → target.
    const result = await translateForViewer(message, receiverLanguage);
    const isTranslated = result.nativeText !== message;

    // If receiver's language is also unsupported, nativeText will be English (fallback)
    return {
      translated: result.nativeText,
      englishText: result.englishText,
      isTranslated,
    };
  } catch {
    // English fallback — if everything fails, show original (English)
    return { translated: message, englishText: message, isTranslated: false };
  }
}

/**
 * Get English translation of a message (for subtitle display).
 * Live translation — no hardcoded values.
 */
export async function getEnglishTranslation(
  message: string,
  sourceLang: string
): Promise<string> {
  if (!message?.trim()) return message;
  const srcNorm = (sourceLang || 'english').toLowerCase().trim();
  if (srcNorm === 'english') {
    // If source is English, check if it's actually in another script
    if (!isLatinScript(message)) {
      // Non-Latin input marked as English — auto-detect instead
      return await translateText(message, 'auto', 'English');
    }
    return message;
  }

  try {
    return await translateText(message, 'auto', 'English');
  } catch {
    return message; // English fallback
  }
}

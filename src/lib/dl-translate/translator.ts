/**
 * DL-Translate Translator
 * Auto-detects languages and translates via Edge Function
 * Handles sender/receiver native language translation for chat
 */

import { supabase } from '@/integrations/supabase/client';
import type { TranslationResult, ChatTranslationOptions } from './types';
import { detectLanguage, isSameLanguage, isLatinScript, normalizeLanguage } from './languages';

// Translation cache
const cache = new Map<string, TranslationResult>();

/**
 * Generate cache key
 */
function getCacheKey(text: string, source: string, target: string): string {
  return `${text}:${normalizeLanguage(source)}:${normalizeLanguage(target)}`;
}

/**
 * Translate text between languages
 * Auto-detects source if not provided
 */
export async function translate(
  text: string,
  sourceLanguage?: string,
  targetLanguage?: string
): Promise<TranslationResult> {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      text: text,
      originalText: text,
      source: sourceLanguage || 'english',
      target: targetLanguage || 'english',
      isTranslated: false,
    };
  }

  // Auto-detect source language
  const detectedSource = detectLanguage(trimmed);
  const source = sourceLanguage || detectedSource;
  const target = targetLanguage || 'english';

  // Same language - no translation needed
  if (isSameLanguage(source, target)) {
    return {
      text: trimmed,
      originalText: trimmed,
      source,
      target,
      isTranslated: false,
      detectedLanguage: detectedSource,
    };
  }

  // Check cache
  const cacheKey = getCacheKey(trimmed, source, target);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text: trimmed,
        sourceLanguage: source,
        targetLanguage: target,
      },
    });

    if (error) {
      console.error('[dl-translate] Edge function error:', error);
      return {
        text: trimmed,
        originalText: trimmed,
        source,
        target,
        isTranslated: false,
        detectedLanguage: detectedSource,
      };
    }

    const result: TranslationResult = {
      text: data?.translatedText || trimmed,
      originalText: trimmed,
      source: data?.sourceLanguage || source,
      target: data?.targetLanguage || target,
      isTranslated: data?.isTranslated || false,
      detectedLanguage: data?.detectedLanguage || detectedSource,
    };

    // Cache successful translations
    if (result.isTranslated) {
      cache.set(cacheKey, result);
    }

    return result;
  } catch (error) {
    console.error('[dl-translate] Translation error:', error);
    return {
      text: trimmed,
      originalText: trimmed,
      source,
      target,
      isTranslated: false,
      detectedLanguage: detectedSource,
    };
  }
}

/**
 * Translate for chat: sender types in English, converts to receiver's native language
 * - If sender types Latin text, it gets translated to receiver's language
 * - If sender and receiver have same language, no translation
 * - Auto-detects the source language from the text
 */
export async function translateForChat(
  text: string,
  options: ChatTranslationOptions
): Promise<TranslationResult> {
  const { senderLanguage, receiverLanguage } = options;
  
  // Same language - no translation needed
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    return {
      text,
      originalText: text,
      source: senderLanguage,
      target: receiverLanguage,
      isTranslated: false,
    };
  }

  // Detect if sender is typing in Latin (English/romanized)
  const isTypingLatin = isLatinScript(text);
  const detectedSource = detectLanguage(text);

  // If typing in Latin and sender's native is non-Latin, assume English input
  // Translate to receiver's native language
  const effectiveSource = isTypingLatin ? 'english' : detectedSource;
  
  return translate(text, effectiveSource, receiverLanguage);
}

/**
 * Convert English/Latin text to sender's native script (for preview while typing)
 */
export async function convertToNativeScript(
  text: string,
  targetLanguage: string
): Promise<TranslationResult> {
  // Skip if already in target script or target is English
  if (!isLatinScript(text) || isSameLanguage(targetLanguage, 'english')) {
    return {
      text,
      originalText: text,
      source: 'english',
      target: targetLanguage,
      isTranslated: false,
    };
  }

  return translate(text, 'english', targetLanguage);
}

/**
 * Clear translation cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Detect language from text
 */
export function detect(text: string): { language: string; isLatin: boolean } {
  const language = detectLanguage(text);
  const isLatin = isLatinScript(text);
  return { language, isLatin };
}

// Re-export utilities
export { detectLanguage, isSameLanguage, isLatinScript } from './languages';

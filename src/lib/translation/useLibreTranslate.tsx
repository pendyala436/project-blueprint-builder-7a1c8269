/**
 * useLibreTranslate React Hook
 * Bidirectional translation with English as mandatory pivot
 */

import { useState, useCallback, useMemo } from 'react';
import { type Language, PIVOT, LANGUAGE_NAMES, isSupported, getLanguageCode } from './languages';

const EDGE_FUNCTION_URL = "https://tvneohngeracipjajzos.supabase.co/functions/v1/libre-translate";

/** Detect language from text using Unicode patterns */
function detectLanguage(text: string): Language {
  if (!text?.trim()) return "en";
  
  const patterns: [RegExp, Language][] = [
    [/[\u0900-\u097F]/, "hi"],
    [/[\u0C00-\u0C7F]/, "te"],
    [/[\u0B80-\u0BFF]/, "ta"],
    [/[\u0C80-\u0CFF]/, "kn"],
    [/[\u0D00-\u0D7F]/, "ml"],
    [/[\u0980-\u09FF]/, "bn"],
    [/[\u0A80-\u0AFF]/, "gu"],
    [/[\u0A00-\u0A7F]/, "pa"],
    [/[\u0B00-\u0B7F]/, "or"],
    [/[\u0600-\u06FF]/, "ar"],
    [/[\u4E00-\u9FFF]/, "zh"],
    [/[\u3040-\u30FF]/, "ja"],
    [/[\uAC00-\uD7AF]/, "ko"],
    [/[\u0E00-\u0E7F]/, "th"],
    [/[\u0590-\u05FF]/, "he"],
    [/[\u0400-\u04FF]/, "ru"],
  ];
  
  for (const [pattern, lang] of patterns) {
    if (pattern.test(text)) return lang;
  }
  
  return "en";
}

/** Check if text is Latin script */
function isLatinScript(text: string): boolean {
  if (!text?.trim()) return true;
  const latinPattern = /^[\x00-\x7F\u00C0-\u024F\u1E00-\u1EFF\s\p{P}\p{N}]+$/u;
  return latinPattern.test(text);
}

/** Normalize language name to code */
function normalizeLanguage(lang: string): Language {
  if (isSupported(lang)) return lang;
  return getLanguageCode(lang) || "en";
}

export interface TranslationResult {
  translated: string;
  source: Language;
  target: Language;
  pivot: Language | null;
}

export interface UseLibreTranslateOptions {
  userLanguage?: string;
  partnerLanguage?: string;
}

export interface UseLibreTranslateReturn {
  isTranslating: boolean;
  error: string | null;
  
  // Translation
  translate: (text: string, source?: Language, target?: Language) => Promise<TranslationResult>;
  translateForChat: (text: string, senderLang: string, receiverLang: string) => Promise<{
    senderView: string;
    receiverView: string;
  }>;
  
  // Utilities
  detect: (text: string) => Language;
  isLatin: (text: string) => boolean;
  normalize: (lang: string) => Language;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  getLanguageName: (code: Language) => string;
}

export function useLibreTranslate(options: UseLibreTranslateOptions = {}): UseLibreTranslateReturn {
  const { userLanguage = 'en', partnerLanguage = 'en' } = options;
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Call edge function for translation */
  const translate = useCallback(async (
    text: string,
    source?: Language,
    target?: Language
  ): Promise<TranslationResult> => {
    const tgt = target || normalizeLanguage(partnerLanguage);
    const src = source || detectLanguage(text);
    
    if (!text?.trim() || src === tgt) {
      return { translated: text, source: src, target: tgt, pivot: null };
    }
    
    setIsTranslating(true);
    setError(null);
    
    try {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: src, target: tgt }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const json = await res.json();
      return {
        translated: json.translated || text,
        source: json.source || src,
        target: tgt,
        pivot: json.pivot || null
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Translation failed';
      setError(msg);
      return { translated: text, source: src, target: tgt, pivot: null };
    } finally {
      setIsTranslating(false);
    }
  }, [partnerLanguage]);

  /** Translate for chat: returns both sender and receiver views */
  const translateForChat = useCallback(async (
    text: string,
    senderLang: string,
    receiverLang: string
  ) => {
    const srcLang = normalizeLanguage(senderLang);
    const tgtLang = normalizeLanguage(receiverLang);
    
    if (srcLang === tgtLang) {
      return { senderView: text, receiverView: text };
    }

    const result = await translate(text, srcLang, tgtLang);
    return { senderView: text, receiverView: result.translated };
  }, [translate]);

  const detect = useCallback((text: string) => detectLanguage(text), []);
  const isLatin = useCallback((text: string) => isLatinScript(text), []);
  const normalize = useCallback((lang: string) => normalizeLanguage(lang), []);
  
  const isSameLanguage = useCallback((lang1: string, lang2: string) => {
    return normalizeLanguage(lang1) === normalizeLanguage(lang2);
  }, []);
  
  const getLanguageName = useCallback((code: Language) => {
    return LANGUAGE_NAMES[code] || code;
  }, []);

  return useMemo(() => ({
    isTranslating,
    error,
    translate,
    translateForChat,
    detect,
    isLatin,
    normalize,
    isSameLanguage,
    getLanguageName
  }), [isTranslating, error, translate, translateForChat, detect, isLatin, normalize, isSameLanguage, getLanguageName]);
}

export default useLibreTranslate;

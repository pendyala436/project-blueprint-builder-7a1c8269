/**
 * React Hook for DL-Translate (Server-Side Only)
 * All translation via Edge Function - no client-side processing
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface TranslationResult {
  text: string;
  originalText: string;
  source: string;
  target: string;
  isTranslated: boolean;
  mode: 'translate' | 'convert' | 'passthrough';
}

export interface ChatTranslationOptions {
  senderLanguage: string;
  receiverLanguage: string;
}

interface UseDLTranslateReturn {
  translate: (text: string, source?: string, target?: string) => Promise<TranslationResult>;
  translateForChat: (text: string, options: ChatTranslationOptions) => Promise<TranslationResult>;
  convertToNative: (text: string, targetLanguage: string) => Promise<TranslationResult>;
  detect: (text: string) => { language: string; isLatin: boolean };
  detectLanguage: (text: string) => string;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  isLatinScript: (text: string) => boolean;
  getNativeName: (language: string) => string;
  isTranslating: boolean;
  error: string | null;
  clearCache: () => void;
}

// Utility functions
function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const lower = lang.toLowerCase().trim();
  const aliases: Record<string, string> = { bangla: 'bengali', oriya: 'odia', farsi: 'persian' };
  return aliases[lower] || lower;
}

function isLatinScriptFn(text: string): boolean {
  if (!text) return true;
  return /^[\u0000-\u024F\s\d\p{P}]+$/u.test(text.trim());
}

function isSameLanguageFn(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

const NATIVE_NAMES: Record<string, string> = {
  english: 'English', hindi: 'हिंदी', bengali: 'বাংলা', telugu: 'తెలుగు', 
  marathi: 'मराठी', tamil: 'தமிழ்', gujarati: 'ગુજરાતી', kannada: 'ಕನ್ನಡ',
  malayalam: 'മലയാളം', punjabi: 'ਪੰਜਾਬੀ', odia: 'ଓଡ଼ିଆ', urdu: 'اردو',
  arabic: 'العربية', spanish: 'Español', french: 'Français', german: 'Deutsch',
  chinese: '中文', japanese: '日本語', korean: '한국어', russian: 'Русский',
  portuguese: 'Português', italian: 'Italiano', dutch: 'Nederlands'
};

export function useDLTranslate(): UseDLTranslateReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Call edge function for translation
  const callEdgeFunction = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    mode: string
  ): Promise<TranslationResult> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('translate-message', {
        body: { text, sourceLanguage, targetLanguage, mode }
      });

      if (fnError) throw fnError;

      return {
        text: data?.translatedText || text,
        originalText: text,
        source: data?.sourceLanguage || sourceLanguage,
        target: data?.targetLanguage || targetLanguage,
        isTranslated: data?.isTranslated || false,
        mode: mode as 'translate' | 'convert' | 'passthrough'
      };
    } catch (err) {
      console.error('[DL-Translate] Edge function error:', err);
      throw err;
    }
  }, []);

  const translate = useCallback(async (
    text: string,
    source?: string,
    target?: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { text, originalText: text, source: source || 'english', target: target || 'english', isTranslated: false, mode: 'passthrough' };
    }

    const effectiveTarget = target || 'english';
    if (source && isSameLanguageFn(source, effectiveTarget)) {
      return { text: trimmed, originalText: trimmed, source, target: effectiveTarget, isTranslated: false, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      return await callEdgeFunction(trimmed, source || 'auto', effectiveTarget, 'translate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
      return { text: trimmed, originalText: trimmed, source: source || 'english', target: effectiveTarget, isTranslated: false, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, [callEdgeFunction]);

  const translateForChat = useCallback(async (
    text: string,
    options: ChatTranslationOptions
  ): Promise<TranslationResult> => {
    const { senderLanguage, receiverLanguage } = options;
    const trimmed = text.trim();

    if (!trimmed) {
      return { text, originalText: text, source: senderLanguage, target: receiverLanguage, isTranslated: false, mode: 'passthrough' };
    }

    if (isSameLanguageFn(senderLanguage, receiverLanguage)) {
      return { text: trimmed, originalText: trimmed, source: senderLanguage, target: receiverLanguage, isTranslated: false, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      return await callEdgeFunction(trimmed, senderLanguage, receiverLanguage, 'chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
      return { text: trimmed, originalText: trimmed, source: senderLanguage, target: receiverLanguage, isTranslated: false, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, [callEdgeFunction]);

  const convertToNative = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    if (!trimmed || !isLatinScriptFn(trimmed)) {
      return { text: trimmed || text, originalText: text, source: 'english', target: targetLanguage, isTranslated: false, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      return await callEdgeFunction(trimmed, 'english', targetLanguage, 'convert');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
      return { text: trimmed, originalText: trimmed, source: 'english', target: targetLanguage, isTranslated: false, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, [callEdgeFunction]);

  const detect = useCallback((text: string) => {
    const isLatin = isLatinScriptFn(text);
    return { language: isLatin ? 'english' : 'unknown', isLatin };
  }, []);

  const detectLanguage = useCallback((text: string) => {
    return isLatinScriptFn(text) ? 'english' : 'unknown';
  }, []);

  const getNativeName = useCallback((language: string) => {
    return NATIVE_NAMES[normalizeLanguage(language)] || language;
  }, []);

  const clearCache = useCallback(() => {
    // Cache is server-side, nothing to clear locally
  }, []);

  return {
    translate,
    translateForChat,
    convertToNative,
    detect,
    detectLanguage,
    isSameLanguage: isSameLanguageFn,
    isLatinScript: isLatinScriptFn,
    getNativeName,
    isTranslating,
    error,
    clearCache
  };
}

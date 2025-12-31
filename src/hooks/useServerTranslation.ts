/**
 * Server-Side Translation Hook (DL-Translate)
 * 
 * Pure server-side translation via Edge Function
 * - Translation between sender/receiver based on mother tongue
 * - Skip translation if same language
 * - Latin to native script conversion when typing
 * 
 * NO client-side translation - all via translate-message edge function
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface TranslationResult {
  text: string;
  originalText: string;
  isTranslated: boolean;
  source: string;
  target: string;
  mode: 'translate' | 'convert' | 'passthrough';
}

export interface UseServerTranslationOptions {
  userLanguage: string;
  partnerLanguage?: string;
  debounceMs?: number;
}

export interface UseServerTranslationReturn {
  // Core translation
  translate: (text: string, targetLanguage: string) => Promise<TranslationResult>;
  translateForChat: (text: string, senderLang: string, receiverLang: string) => Promise<TranslationResult>;
  convertToNative: (text: string, targetLanguage: string) => Promise<TranslationResult>;
  
  // Real-time typing conversion
  livePreview: string;
  updateLivePreview: (text: string) => void;
  clearLivePreview: () => void;
  
  // Message processing
  processOutgoing: (text: string) => Promise<TranslationResult>;
  processIncoming: (text: string, senderLanguage: string) => Promise<TranslationResult>;
  
  // Utilities
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  needsTranslation: (senderLang: string, receiverLang: string) => boolean;
  
  // State
  isTranslating: boolean;
  error: string | null;
}

// Language normalization
function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const lower = lang.toLowerCase().trim();
  
  // Handle aliases
  const aliases: Record<string, string> = {
    bangla: 'bengali',
    oriya: 'odia',
    farsi: 'persian',
    mandarin: 'chinese',
  };
  
  return aliases[lower] || lower;
}

// Check if Latin script
function isLatinScript(text: string): boolean {
  if (!text) return true;
  const latinPattern = /^[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\s\d\p{P}]+$/u;
  return latinPattern.test(text.trim());
}

// Non-Latin script languages
const NON_LATIN_LANGUAGES = new Set([
  'hindi', 'bengali', 'telugu', 'marathi', 'tamil', 'gujarati', 'kannada', 'malayalam',
  'punjabi', 'odia', 'urdu', 'nepali', 'sinhala', 'assamese', 'arabic', 'persian',
  'hebrew', 'chinese', 'japanese', 'korean', 'thai', 'burmese', 'khmer', 'lao',
  'russian', 'ukrainian', 'greek', 'georgian', 'armenian', 'amharic', 'tigrinya'
]);

function needsScriptConversion(language: string): boolean {
  return NON_LATIN_LANGUAGES.has(normalizeLanguage(language));
}

export function useServerTranslation(options: UseServerTranslationOptions): UseServerTranslationReturn {
  const { userLanguage, partnerLanguage, debounceMs = 300 } = options;
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState('');
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check if same language (no translation needed)
  const isSameLanguage = useCallback((lang1: string, lang2: string): boolean => {
    return normalizeLanguage(lang1) === normalizeLanguage(lang2);
  }, []);

  // Check if translation needed between two languages
  const needsTranslation = useCallback((senderLang: string, receiverLang: string): boolean => {
    return !isSameLanguage(senderLang, receiverLang);
  }, [isSameLanguage]);

  // Core translation via edge function
  const translate = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: 'english', target: targetLanguage, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('translate-message', {
        body: {
          text: trimmed,
          targetLanguage: normalizeLanguage(targetLanguage),
          mode: 'translate'
        }
      });

      if (fnError) {
        console.error('[ServerTranslation] Error:', fnError);
        return { text: trimmed, originalText: trimmed, isTranslated: false, source: 'english', target: targetLanguage, mode: 'passthrough' };
      }

      return {
        text: data?.translatedText || trimmed,
        originalText: trimmed,
        isTranslated: data?.isTranslated || false,
        source: data?.sourceLanguage || 'english',
        target: data?.targetLanguage || targetLanguage,
        mode: 'translate'
      };
    } catch (err) {
      console.error('[ServerTranslation] Error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: 'english', target: targetLanguage, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Chat translation (sender to receiver)
  const translateForChat = useCallback(async (
    text: string,
    senderLang: string,
    receiverLang: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const normSender = normalizeLanguage(senderLang);
    const normReceiver = normalizeLanguage(receiverLang);

    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: normSender, target: normReceiver, mode: 'passthrough' };
    }

    // Same language - no translation needed
    if (isSameLanguage(normSender, normReceiver)) {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normSender, target: normReceiver, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('translate-message', {
        body: {
          text: trimmed,
          sourceLanguage: normSender,
          targetLanguage: normReceiver,
          mode: 'chat'
        }
      });

      if (fnError) {
        console.error('[ServerTranslation] Chat error:', fnError);
        return { text: trimmed, originalText: trimmed, isTranslated: false, source: normSender, target: normReceiver, mode: 'passthrough' };
      }

      return {
        text: data?.translatedText || trimmed,
        originalText: trimmed,
        isTranslated: data?.isTranslated || false,
        source: normSender,
        target: normReceiver,
        mode: 'translate'
      };
    } catch (err) {
      console.error('[ServerTranslation] Chat error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normSender, target: normReceiver, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, [isSameLanguage]);

  // Convert Latin text to native script
  const convertToNative = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const normTarget = normalizeLanguage(targetLanguage);

    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: 'english', target: normTarget, mode: 'passthrough' };
    }

    // If target is Latin script language, no conversion needed
    if (!needsScriptConversion(normTarget)) {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: 'english', target: normTarget, mode: 'passthrough' };
    }

    // If already non-Latin, no conversion needed
    if (!isLatinScript(trimmed)) {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normTarget, target: normTarget, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('translate-message', {
        body: {
          text: trimmed,
          sourceLanguage: 'english',
          targetLanguage: normTarget,
          mode: 'convert'
        }
      });

      if (fnError) {
        console.error('[ServerTranslation] Convert error:', fnError);
        return { text: trimmed, originalText: trimmed, isTranslated: false, source: 'english', target: normTarget, mode: 'passthrough' };
      }

      return {
        text: data?.translatedText || trimmed,
        originalText: trimmed,
        isTranslated: data?.isTranslated || false,
        source: 'english',
        target: normTarget,
        mode: 'convert'
      };
    } catch (err) {
      console.error('[ServerTranslation] Convert error:', err);
      setError(err instanceof Error ? err.message : 'Conversion failed');
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: 'english', target: normTarget, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Update live preview with debounce (Latin → Native script)
  const updateLivePreview = useCallback((text: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const trimmed = text.trim();
    if (!trimmed) {
      setLivePreview('');
      return;
    }

    // If user's language doesn't need conversion, show as-is
    if (!needsScriptConversion(userLanguage)) {
      setLivePreview(trimmed);
      return;
    }

    // If already non-Latin, show as-is
    if (!isLatinScript(trimmed)) {
      setLivePreview(trimmed);
      return;
    }

    // Debounce the conversion
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await convertToNative(trimmed, userLanguage);
        setLivePreview(result.text);
      } catch {
        setLivePreview(trimmed);
      }
    }, debounceMs);
  }, [userLanguage, debounceMs, convertToNative]);

  // Clear live preview
  const clearLivePreview = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setLivePreview('');
  }, []);

  // Process outgoing message (convert to sender's native script if needed)
  const processOutgoing = useCallback(async (text: string): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const normUser = normalizeLanguage(userLanguage);

    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: normUser, target: normUser, mode: 'passthrough' };
    }

    // If user's language uses Latin script, no conversion needed
    if (!needsScriptConversion(normUser)) {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normUser, target: normUser, mode: 'passthrough' };
    }

    // If typing Latin, convert to native script
    if (isLatinScript(trimmed)) {
      return convertToNative(trimmed, normUser);
    }

    // Already in native script
    return { text: trimmed, originalText: trimmed, isTranslated: false, source: normUser, target: normUser, mode: 'passthrough' };
  }, [userLanguage, convertToNative]);

  // Process incoming message (translate to receiver's language)
  const processIncoming = useCallback(async (
    text: string,
    senderLanguage: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const normSender = normalizeLanguage(senderLanguage);
    const normUser = normalizeLanguage(userLanguage);

    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: normSender, target: normUser, mode: 'passthrough' };
    }

    // Same language - no translation needed
    if (isSameLanguage(normSender, normUser)) {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normSender, target: normUser, mode: 'passthrough' };
    }

    // Translate to user's language
    return translateForChat(trimmed, normSender, normUser);
  }, [userLanguage, isSameLanguage, translateForChat]);

  return {
    translate,
    translateForChat,
    convertToNative,
    livePreview,
    updateLivePreview,
    clearLivePreview,
    processOutgoing,
    processIncoming,
    isSameLanguage,
    needsTranslation,
    isTranslating,
    error
  };
}

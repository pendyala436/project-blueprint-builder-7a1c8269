/**
 * Server Translation Hook
 * Uses unified translator for instant dictionary + ICU translation
 * 
 * Features:
 * - Instant translation (no server calls needed)
 * - Live native preview
 * - 300+ language support
 * - Non-blocking
 */

import { useState, useCallback, useRef } from 'react';
import {
  getLivePreview,
  translate,
  translateAsync,
  transliterate,
  detectLanguage,
  getLanguageCode,
  isSameLanguage as isSameLang,
  isLatinScript,
} from '@/lib/translation/unified-translator';

// Types
export interface TranslationResult {
  text: string;
  originalText: string;
  isTranslated: boolean;
  source: string;
  target: string;
  mode: 'translate' | 'convert' | 'passthrough' | 'dictionary' | 'phonetic' | 'neural' | 'same_language';
}

export interface UseServerTranslationOptions {
  userLanguage: string;
  partnerLanguage?: string;
  debounceMs?: number;
}

export interface UseServerTranslationReturn {
  // Core translation
  translate: (text: string, targetLanguage?: string) => Promise<TranslationResult>;
  translateForChat: (text: string, senderLang?: string, receiverLang?: string) => Promise<TranslationResult>;
  convertToNative: (text: string, targetLanguage?: string) => Promise<TranslationResult>;
  
  // Auto-detection
  detectLanguage: (text: string) => string | null;
  
  // Real-time typing conversion
  livePreview: string;
  updateLivePreview: (text: string) => void;
  clearLivePreview: () => void;
  
  // Message processing
  processOutgoing: (text: string) => Promise<TranslationResult>;
  processIncoming: (text: string, senderLanguage?: string) => Promise<TranslationResult>;
  
  // Utilities
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  needsTranslation: (senderLang: string, receiverLang: string) => boolean;
  
  // State
  isTranslating: boolean;
  error: string | null;
}

function normalizeLanguage(lang: string): string {
  return lang?.toLowerCase().trim() || 'english';
}

export function useServerTranslation(options: UseServerTranslationOptions): UseServerTranslationReturn {
  const { userLanguage, partnerLanguage, debounceMs = 300 } = options;
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState('');
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Check if same language (no translation needed)
  const isSameLanguage = useCallback((lang1: string, lang2: string): boolean => {
    return isSameLang(lang1, lang2);
  }, []);

  // Check if translation needed between two languages
  const needsTranslation = useCallback((senderLang: string, receiverLang: string): boolean => {
    return !isSameLang(senderLang, receiverLang);
  }, []);

  // Core translation with auto-detection
  const translateText = useCallback(async (
    text: string,
    targetLanguage?: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const effectiveTarget = normalizeLanguage(targetLanguage || userLanguage);
    
    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: 'auto', target: effectiveTarget, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const detected = detectLanguage(trimmed, userLanguage);
      const result = translate(trimmed, detected.lang, effectiveTarget);

      return {
        text: result,
        originalText: trimmed,
        isTranslated: result !== trimmed,
        source: detected.lang,
        target: effectiveTarget,
        mode: result !== trimmed ? 'dictionary' : 'passthrough'
      };
    } catch (err) {
      console.error('[Translation] Error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: 'auto', target: effectiveTarget, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, [userLanguage]);

  // Chat translation (sender to receiver) with auto-detection
  const translateForChat = useCallback(async (
    text: string,
    senderLang?: string,
    receiverLang?: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const detected = detectLanguage(trimmed, senderLang || userLanguage);
    const normSender = normalizeLanguage(detected.lang);
    const normReceiver = normalizeLanguage(receiverLang || partnerLanguage || userLanguage);

    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: normSender, target: normReceiver, mode: 'passthrough' };
    }

    // Same language - no translation needed
    if (isSameLang(normSender, normReceiver)) {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normSender, target: normReceiver, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = translate(trimmed, normSender, normReceiver);

      return {
        text: result,
        originalText: trimmed,
        isTranslated: result !== trimmed,
        source: normSender,
        target: normReceiver,
        mode: result !== trimmed ? 'dictionary' : 'passthrough'
      };
    } catch (err) {
      console.error('[Translation] Chat error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normSender, target: normReceiver, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, [userLanguage, partnerLanguage]);

  // Convert Latin text to native script
  const convertToNative = useCallback(async (
    text: string,
    targetLanguage?: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const effectiveTarget = normalizeLanguage(targetLanguage || userLanguage);

    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: 'english', target: effectiveTarget, mode: 'passthrough' };
    }

    // If target is English, no conversion needed
    if (effectiveTarget === 'english' || effectiveTarget === 'en') {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: 'english', target: effectiveTarget, mode: 'passthrough' };
    }

    // If already non-Latin, no conversion needed
    if (!isLatinScript(trimmed)) {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: effectiveTarget, target: effectiveTarget, mode: 'passthrough' };
    }

    try {
      const converted = transliterate(trimmed, effectiveTarget);
      
      return {
        text: converted,
        originalText: trimmed,
        isTranslated: converted !== trimmed,
        source: 'english',
        target: effectiveTarget,
        mode: 'convert'
      };
    } catch (err) {
      console.error('[Translation] Convert error:', err);
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: 'english', target: effectiveTarget, mode: 'passthrough' };
    }
  }, [userLanguage]);

  // Update live preview INSTANTLY
  const updateLivePreview = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setLivePreview('');
      return;
    }

    const normUser = normalizeLanguage(userLanguage);
    
    // If user's language is English, no conversion needed
    if (normUser === 'english' || normUser === 'en') {
      setLivePreview(trimmed);
      return;
    }

    // If already non-Latin script, show as-is
    if (!isLatinScript(trimmed)) {
      setLivePreview(trimmed);
      return;
    }

    // INSTANT conversion using unified translator
    const preview = getLivePreview(trimmed, normUser);
    setLivePreview(preview);
  }, [userLanguage]);

  // Clear live preview
  const clearLivePreview = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setLivePreview('');
  }, []);

  // Process outgoing message
  const processOutgoing = useCallback(async (text: string): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const normUser = normalizeLanguage(userLanguage);

    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: normUser, target: normUser, mode: 'passthrough' };
    }

    // If user's language is English, no conversion needed
    if (normUser === 'english' || normUser === 'en') {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normUser, target: normUser, mode: 'passthrough' };
    }

    // If typing Latin, convert to native script
    if (isLatinScript(trimmed)) {
      return convertToNative(trimmed, normUser);
    }

    // Already in native script
    return { text: trimmed, originalText: trimmed, isTranslated: false, source: normUser, target: normUser, mode: 'passthrough' };
  }, [userLanguage, convertToNative]);

  // Process incoming message
  const processIncoming = useCallback(async (
    text: string,
    senderLanguage?: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const detected = detectLanguage(trimmed, senderLanguage || 'english');
    const normSender = normalizeLanguage(detected.lang);
    const normUser = normalizeLanguage(userLanguage);

    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: normSender, target: normUser, mode: 'passthrough' };
    }

    // Same language - no translation needed
    if (isSameLang(normSender, normUser)) {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normSender, target: normUser, mode: 'passthrough' };
    }

    // Translate to user's language
    return translateForChat(trimmed, normSender, normUser);
  }, [userLanguage, translateForChat]);

  // Expose detectLanguage utility
  const detectLang = useCallback((text: string): string | null => {
    const result = detectLanguage(text, userLanguage);
    return result.lang;
  }, [userLanguage]);

  return {
    translate: translateText,
    translateForChat,
    convertToNative,
    detectLanguage: detectLang,
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

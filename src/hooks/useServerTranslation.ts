/**
 * Translation Hook (DL-Translate)
 * 
 * Translation methods:
 * 1. Dictionary Translation (main) - instant common phrases
 * 2. Phonetic Transliteration (fallback) - Latin → native script
 * 3. DL-Translate HuggingFace API (fallback) - 200+ languages
 * 
 * Features:
 * - Translation between sender/receiver based on mother tongue
 * - Skip translation if same language
 * - Latin to native script conversion when typing
 */

import { useState, useCallback, useRef } from 'react';
import {
  translateText,
  convertToNativeScript,
  clearTranslationCache,
  detectLanguage as detectLang,
  isLatinScript,
  isSameLanguage as isSameLang,
  normalizeLanguage
} from '@/lib/translation/translation-engine';
import { isLatinScriptLanguage } from '@/lib/translation/language-codes';

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

// For client-side quick checks
function isEnglish(language: string): boolean {
  const norm = normalizeLanguage(language);
  return norm === 'english' || norm === 'en';
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
  const translate = useCallback(async (
    text: string,
    targetLanguage?: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const effectiveTarget = targetLanguage || userLanguage;
    
    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: 'auto', target: effectiveTarget, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateText(trimmed, {
        targetLanguage: normalizeLanguage(effectiveTarget),
        mode: 'translate'
      });

      return {
        text: result.translatedText,
        originalText: result.originalText,
        isTranslated: result.isTranslated,
        source: result.sourceLanguage,
        target: result.targetLanguage,
        mode: result.mode === 'same_language' ? 'passthrough' : result.mode
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
    const detectedSender = senderLang || detectLang(trimmed).language;
    const effectiveReceiver = receiverLang || partnerLanguage || userLanguage;
    
    const normSender = normalizeLanguage(detectedSender);
    const normReceiver = normalizeLanguage(effectiveReceiver);

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
      const result = await translateText(trimmed, {
        sourceLanguage: normSender,
        targetLanguage: normReceiver,
        mode: 'translate'
      });

      return {
        text: result.translatedText,
        originalText: result.originalText,
        isTranslated: result.isTranslated,
        source: result.sourceLanguage,
        target: result.targetLanguage,
        mode: result.mode === 'same_language' ? 'passthrough' : result.mode
      };
    } catch (err) {
      console.error('[Translation] Chat error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normSender, target: normReceiver, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, [userLanguage, partnerLanguage]);

  // Convert Latin text to native script OR translate to Latin-script language
  const convertToNative = useCallback(async (
    text: string,
    targetLanguage?: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const effectiveTarget = targetLanguage || userLanguage;
    const normTarget = normalizeLanguage(effectiveTarget);

    if (!trimmed) {
      return { text, originalText: text, isTranslated: false, source: 'english', target: normTarget, mode: 'passthrough' };
    }

    // If target is English, no conversion needed
    if (normTarget === 'english') {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: 'english', target: normTarget, mode: 'passthrough' };
    }

    // If already non-Latin, no conversion needed
    if (!isLatinScript(trimmed)) {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normTarget, target: normTarget, mode: 'passthrough' };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const converted = await convertToNativeScript(trimmed, normTarget);
      
      return {
        text: converted,
        originalText: trimmed,
        isTranslated: converted !== trimmed,
        source: 'english',
        target: normTarget,
        mode: 'convert'
      };
    } catch (err) {
      console.error('[Translation] Convert error:', err);
      setError(err instanceof Error ? err.message : 'Conversion failed');
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: 'english', target: normTarget, mode: 'passthrough' };
    } finally {
      setIsTranslating(false);
    }
  }, [userLanguage]);

  // Update live preview INSTANTLY using dictionary + ICU (no debounce needed)
  const updateLivePreview = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setLivePreview('');
      return;
    }

    const normUser = normalizeLanguage(userLanguage);
    
    // If user's language is English, no conversion needed - show as-is
    if (isEnglish(normUser)) {
      setLivePreview(trimmed);
      return;
    }

    // If already non-Latin script, show as-is (already in native)
    if (!isLatinScript(trimmed)) {
      setLivePreview(trimmed);
      return;
    }

    // INSTANT conversion using dictionary + ICU (synchronous for speed)
    // Import synchronously for instant preview
    import('@/lib/translation/dl-translate/transliteration').then(({ transliterate, isTransliterationSupported }) => {
      import('@/lib/translation/dl-translate/utils').then(({ resolveLangCode, normalizeLanguageInput }) => {
        const langCode = resolveLangCode(normalizeLanguageInput(normUser), 'nllb200');
        
        if (isTransliterationSupported(langCode)) {
          const converted = transliterate(trimmed, langCode);
          setLivePreview(converted);
        } else {
          // Fallback to ICU
          import('@/lib/translation/icu-transliterator').then(({ icuTransliterate, isICUTransliterationSupported }) => {
            if (isICUTransliterationSupported(normUser)) {
              const converted = icuTransliterate(trimmed, normUser);
              setLivePreview(converted);
            } else {
              setLivePreview(trimmed);
            }
          });
        }
      });
    });
  }, [userLanguage]);

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

    // If user's language is English, no conversion needed
    if (isEnglish(normUser)) {
      return { text: trimmed, originalText: trimmed, isTranslated: false, source: normUser, target: normUser, mode: 'passthrough' };
    }

    // If typing Latin, convert to native script
    if (isLatinScript(trimmed)) {
      return convertToNative(trimmed, normUser);
    }

    // Already in native script
    return { text: trimmed, originalText: trimmed, isTranslated: false, source: normUser, target: normUser, mode: 'passthrough' };
  }, [userLanguage, convertToNative]);

  // Process incoming message (translate to receiver's language) with auto-detection
  const processIncoming = useCallback(async (
    text: string,
    senderLanguage?: string
  ): Promise<TranslationResult> => {
    const trimmed = text.trim();
    const detectedSender = senderLanguage || detectLang(trimmed).language;
    const normSender = normalizeLanguage(detectedSender);
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
  const detectLanguage = useCallback((text: string): string | null => {
    const result = detectLang(text);
    return result.language;
  }, []);

  return {
    translate,
    translateForChat,
    convertToNative,
    detectLanguage,
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

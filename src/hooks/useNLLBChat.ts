/**
 * useNLLBChat Hook
 * 
 * Real-time multilingual chat with NLLB-200 translation
 * 
 * Features:
 * 1. Auto-detect source language
 * 2. Spell correction on Latin input
 * 3. Live transliteration preview (instant, non-blocking)
 * 4. Background translation with NLLB-200
 * 5. Sender sees native script
 * 6. Receiver sees their language
 * 7. Bi-directional support
 * 8. Non-blocking UI
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  initializeNLLB,
  translateWithNLLB,
  isNLLBLoaded,
  isNLLBLoading,
  getNLLBLoadingProgress,
  getNLLBCode,
  isNLLBSupported,
} from '@/lib/translation/nllb-translator';
import { correctSpelling, getSpellingSuggestion } from '@/lib/translation/spell-corrector';
import { phoneticTransliterate, isPhoneticTransliterationSupported } from '@/lib/translation/phonetic-transliterator';
import { detectLanguage } from '@/lib/translation/language-detector';

interface TransliterationState {
  input: string;
  correctedInput: string;
  nativePreview: string;
  isProcessing: boolean;
}

interface MessageResult {
  originalText: string;
  correctedText: string;
  senderNativeText: string;
  translatedText: string;
  isTranslated: boolean;
  detectedLanguage: string;
}

interface UseNLLBChatOptions {
  userLanguage: string;
  partnerLanguage: string;
  autoCorrectSpelling?: boolean;
  debounceMs?: number;
}

interface UseNLLBChatReturn {
  // State
  transliteration: TransliterationState;
  isModelLoading: boolean;
  isModelReady: boolean;
  modelLoadProgress: number;
  isTranslating: boolean;
  
  // Actions
  setInputText: (text: string) => void;
  initializeModel: () => Promise<boolean>;
  processOutgoing: (text: string) => Promise<MessageResult>;
  processIncoming: (text: string, senderLanguage: string) => Promise<MessageResult>;
  
  // Utilities
  detectLanguageFromText: (text: string) => string;
  getSpellingSuggestion: (text: string) => string | null;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
}

// Helper to check if text is Latin script
const isLatinScript = (text: string): boolean => /^[\x00-\x7F\u00A0-\u00FF\u0100-\u017F\s]*$/.test(text);

export function useNLLBChat(options: UseNLLBChatOptions): UseNLLBChatReturn {
  const {
    userLanguage,
    partnerLanguage,
    autoCorrectSpelling = true,
    debounceMs = 150
  } = options;

  // State
  const [transliteration, setTransliteration] = useState<TransliterationState>({
    input: '',
    correctedInput: '',
    nativePreview: '',
    isProcessing: false
  });
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);

  // Debounced input for transliteration
  const debouncedInput = useDebounce(transliteration.input, debounceMs);
  
  // Refs
  const abortRef = useRef<AbortController | null>(null);

  // Check model status on mount
  useEffect(() => {
    setIsModelReady(isNLLBLoaded());
    setIsModelLoading(isNLLBLoading());
  }, []);

  // Live transliteration preview (non-blocking)
  useEffect(() => {
    if (!debouncedInput.trim()) {
      setTransliteration(prev => ({
        ...prev,
        correctedInput: '',
        nativePreview: '',
        isProcessing: false
      }));
      return;
    }

    // Only process Latin input for non-Latin target languages
    if (!isLatinScript(debouncedInput) || userLanguage.toLowerCase() === 'english') {
      setTransliteration(prev => ({
        ...prev,
        correctedInput: debouncedInput,
        nativePreview: debouncedInput,
        isProcessing: false
      }));
      return;
    }

    // Cancel previous processing
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    
    setTransliteration(prev => ({ ...prev, isProcessing: true }));

    // Process asynchronously (non-blocking)
    const processInput = async () => {
      try {
        // Step 1: Correct spelling
        const corrected = autoCorrectSpelling 
          ? correctSpelling(debouncedInput) 
          : debouncedInput;

        // Step 2: Transliterate to native script (instant)
        let nativePreview = corrected;
        if (isPhoneticTransliterationSupported(userLanguage)) {
          const transliterated = phoneticTransliterate(corrected, userLanguage);
          if (transliterated && transliterated !== corrected) {
            nativePreview = transliterated;
          }
        }

        setTransliteration(prev => ({
          ...prev,
          correctedInput: corrected,
          nativePreview,
          isProcessing: false
        }));
      } catch (error) {
        console.error('[NLLB Chat] Transliteration error:', error);
        setTransliteration(prev => ({
          ...prev,
          correctedInput: debouncedInput,
          nativePreview: debouncedInput,
          isProcessing: false
        }));
      }
    };

    processInput();

    return () => {
      abortRef.current?.abort();
    };
  }, [debouncedInput, userLanguage, autoCorrectSpelling]);

  // Initialize NLLB model
  const initializeModel = useCallback(async (): Promise<boolean> => {
    if (isModelReady) return true;
    if (isModelLoading) return false;

    setIsModelLoading(true);
    setModelLoadProgress(0);

    const success = await initializeNLLB((progress) => {
      setModelLoadProgress(progress.progress);
      if (progress.status === 'ready') {
        setIsModelReady(true);
        setIsModelLoading(false);
      } else if (progress.status === 'error') {
        setIsModelLoading(false);
      }
    });

    return success;
  }, [isModelReady, isModelLoading]);

  // Set input text
  const setInputText = useCallback((text: string) => {
    setTransliteration(prev => ({ ...prev, input: text }));
  }, []);

  // Process outgoing message
  const processOutgoing = useCallback(async (text: string): Promise<MessageResult> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return {
        originalText: '',
        correctedText: '',
        senderNativeText: '',
        translatedText: '',
        isTranslated: false,
        detectedLanguage: userLanguage
      };
    }

    // Step 1: Correct spelling
    const correctedText = autoCorrectSpelling ? correctSpelling(trimmed) : trimmed;

    // Step 2: Convert to sender's native script
    let senderNativeText = correctedText;
    if (isLatinScript(correctedText) && isPhoneticTransliterationSupported(userLanguage)) {
      const transliterated = phoneticTransliterate(correctedText, userLanguage);
      if (transliterated && transliterated !== correctedText) {
        senderNativeText = transliterated;
      }
    }

    // Step 3: Translate for receiver (background, async)
    let translatedText = senderNativeText;
    let isTranslated = false;

    const srcCode = getNLLBCode(userLanguage);
    const tgtCode = getNLLBCode(partnerLanguage);

    if (srcCode !== tgtCode) {
      setIsTranslating(true);
      try {
        // Ensure model is loaded
        if (!isNLLBLoaded()) {
          await initializeModel();
        }

        const result = await translateWithNLLB(senderNativeText, userLanguage, partnerLanguage);
        if (result && result !== senderNativeText) {
          translatedText = result;
          isTranslated = true;
        }
      } catch (error) {
        console.error('[NLLB Chat] Translation error:', error);
      } finally {
        setIsTranslating(false);
      }
    }

    return {
      originalText: trimmed,
      correctedText,
      senderNativeText,
      translatedText,
      isTranslated,
      detectedLanguage: userLanguage
    };
  }, [userLanguage, partnerLanguage, autoCorrectSpelling, initializeModel]);

  // Process incoming message
  const processIncoming = useCallback(async (
    text: string,
    senderLanguage: string
  ): Promise<MessageResult> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return {
        originalText: '',
        correctedText: '',
        senderNativeText: '',
        translatedText: '',
        isTranslated: false,
        detectedLanguage: senderLanguage
      };
    }

    const srcCode = getNLLBCode(senderLanguage);
    const tgtCode = getNLLBCode(userLanguage);

    // Same language - no translation needed
    if (srcCode === tgtCode) {
      return {
        originalText: trimmed,
        correctedText: trimmed,
        senderNativeText: trimmed,
        translatedText: trimmed,
        isTranslated: false,
        detectedLanguage: senderLanguage
      };
    }

    // Translate to receiver's (current user's) language
    setIsTranslating(true);
    let translatedText = trimmed;
    let isTranslated = false;

    try {
      if (!isNLLBLoaded()) {
        await initializeModel();
      }

      const result = await translateWithNLLB(trimmed, senderLanguage, userLanguage);
      if (result && result !== trimmed) {
        translatedText = result;
        isTranslated = true;
      }
    } catch (error) {
      console.error('[NLLB Chat] Incoming translation error:', error);
    } finally {
      setIsTranslating(false);
    }

    return {
      originalText: trimmed,
      correctedText: trimmed,
      senderNativeText: trimmed,
      translatedText,
      isTranslated,
      detectedLanguage: senderLanguage
    };
  }, [userLanguage, initializeModel]);

  // Detect language from text
  const detectLanguageFromText = useCallback((text: string): string => {
    if (!text.trim()) return userLanguage;
    const result = detectLanguage(text);
    return result.language || userLanguage;
  }, [userLanguage]);

  // Get spelling suggestion
  const getSpellingSuggestionFn = useCallback((text: string): string | null => {
    return getSpellingSuggestion(text);
  }, []);

  // Check if same language
  const isSameLanguage = useCallback((lang1: string, lang2: string): boolean => {
    return getNLLBCode(lang1) === getNLLBCode(lang2);
  }, []);

  return {
    transliteration,
    isModelLoading,
    isModelReady,
    modelLoadProgress,
    isTranslating,
    setInputText,
    initializeModel,
    processOutgoing,
    processIncoming,
    detectLanguageFromText,
    getSpellingSuggestion: getSpellingSuggestionFn,
    isSameLanguage
  };
}

export default useNLLBChat;

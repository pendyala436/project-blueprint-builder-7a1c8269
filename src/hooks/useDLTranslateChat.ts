/**
 * Hook for DL-Translate Chat functionality (Fully Embedded)
 * 
 * FEATURES:
 * - Auto-detect source and target language
 * - Typing: Latin letters based on mother tongue
 * - Preview: Live transliteration to native script
 * - Send: Background translation, sender sees native text
 * - Receiver: Sees message in their mother tongue
 * - Bi-directional: Both users see messages in their own language
 * - Non-blocking: Typing not affected by translation
 * 
 * NO external APIs - all embedded in browser
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDLTranslate } from '@/lib/dl-translate';
import { useDebounce } from '@/hooks/useDebounce';
import { detectLanguage as detectLang } from '@/lib/translation/translation-engine';

interface TransliterationState {
  input: string;
  output: string;
  isProcessing: boolean;
}

interface MessageProcessResult {
  nativeScriptText: string;
  translatedText?: string;
  detectedLanguage: string;
  isTranslated: boolean;
}

interface UseDLTranslateChatOptions {
  userLanguage: string;
  partnerLanguage: string;
  autoTransliterate?: boolean;
  debounceMs?: number;
}

interface UseDLTranslateChatReturn {
  transliteration: TransliterationState;
  setInputText: (text: string) => void;
  processOutgoing: (text: string) => Promise<MessageProcessResult>;
  processIncoming: (text: string, senderLang: string) => Promise<MessageProcessResult>;
  detectLanguageFromText: (text: string) => string;
  willTranslate: (text: string) => boolean;
  getNativeLanguageName: (lang: string) => string;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  browserLanguage: string;
  isTranslating: boolean;
}

export function useDLTranslateChat(options: UseDLTranslateChatOptions): UseDLTranslateChatReturn {
  const { 
    userLanguage, 
    partnerLanguage, 
    autoTransliterate = true,
    debounceMs = 300 
  } = options;

  const { 
    convertToNative, 
    translateForChat, 
    detectLanguage, 
    isSameLanguage, 
    isLatinScript,
    getNativeName 
  } = useDLTranslate();

  const [inputText, setInputTextState] = useState('');
  const [transliteration, setTransliteration] = useState<TransliterationState>({
    input: '',
    output: '',
    isProcessing: false
  });
  const [browserLanguage] = useState(() => 
    navigator.language?.split('-')[0] || 'en'
  );

  const debouncedInput = useDebounce(inputText, debounceMs);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-transliterate when user types (Latin → Native)
  useEffect(() => {
    if (!autoTransliterate || !debouncedInput.trim()) {
      setTransliteration(prev => ({ ...prev, output: debouncedInput, isProcessing: false }));
      return;
    }

    // Only convert if typing Latin and user has non-Latin language
    if (!isLatinScript(debouncedInput)) {
      setTransliteration({ input: debouncedInput, output: debouncedInput, isProcessing: false });
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setTransliteration(prev => ({ ...prev, isProcessing: true }));

    convertToNative(debouncedInput, userLanguage)
      .then(result => {
        setTransliteration({
          input: debouncedInput,
          output: result.text,
          isProcessing: false
        });
      })
      .catch(() => {
        setTransliteration({
          input: debouncedInput,
          output: debouncedInput,
          isProcessing: false
        });
      });

    return () => {
      abortRef.current?.abort();
    };
  }, [debouncedInput, userLanguage, autoTransliterate, convertToNative, isLatinScript]);

  const setInputText = useCallback((text: string) => {
    setInputTextState(text);
    setTransliteration(prev => ({ ...prev, input: text }));
  }, []);

  const processOutgoing = useCallback(async (text: string): Promise<MessageProcessResult> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { nativeScriptText: '', detectedLanguage: userLanguage, isTranslated: false };
    }

    // Convert to native script if needed
    let nativeText = trimmed;
    if (isLatinScript(trimmed)) {
      const convertResult = await convertToNative(trimmed, userLanguage);
      nativeText = convertResult.text;
    }

    // If partner has different language, translate for them
    if (!isSameLanguage(userLanguage, partnerLanguage)) {
      const translateResult = await translateForChat(nativeText, {
        senderLanguage: userLanguage,
        receiverLanguage: partnerLanguage
      });

      return {
        nativeScriptText: nativeText,
        translatedText: translateResult.text,
        detectedLanguage: userLanguage,
        isTranslated: translateResult.isTranslated
      };
    }

    return { nativeScriptText: nativeText, detectedLanguage: userLanguage, isTranslated: false };
  }, [userLanguage, partnerLanguage, convertToNative, translateForChat, isLatinScript, isSameLanguage]);

  const processIncoming = useCallback(async (
    text: string,
    senderLang: string
  ): Promise<MessageProcessResult> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { nativeScriptText: '', detectedLanguage: senderLang, isTranslated: false };
    }

    // Same language - no translation needed
    if (isSameLanguage(senderLang, userLanguage)) {
      return { nativeScriptText: trimmed, detectedLanguage: senderLang, isTranslated: false };
    }

    // Translate to user's language
    const result = await translateForChat(trimmed, {
      senderLanguage: senderLang,
      receiverLanguage: userLanguage
    });

    return {
      nativeScriptText: trimmed,
      translatedText: result.text,
      detectedLanguage: senderLang,
      isTranslated: result.isTranslated
    };
  }, [userLanguage, translateForChat, isSameLanguage]);

  const willTranslate = useCallback((text: string): boolean => {
    return !isSameLanguage(userLanguage, partnerLanguage);
  }, [userLanguage, partnerLanguage, isSameLanguage]);

  const getNativeLanguageName = useCallback((lang: string) => {
    return getNativeName(lang);
  }, [getNativeName]);

  // Enhanced detectLanguageFromText using embedded language detector
  const detectLanguageFromText = useCallback((text: string): string => {
    if (!text.trim()) return userLanguage;
    const result = detectLang(text);
    return result.language || userLanguage;
  }, [userLanguage]);

  return {
    transliteration,
    setInputText,
    processOutgoing,
    processIncoming,
    detectLanguageFromText,
    willTranslate,
    getNativeLanguageName,
    isSameLanguage,
    browserLanguage,
    isTranslating: transliteration.isProcessing
  };
}

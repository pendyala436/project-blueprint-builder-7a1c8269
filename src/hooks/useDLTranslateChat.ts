/**
 * Hook for DL-Translate Chat functionality
 * 
 * Provides:
 * - Real-time transliteration as user types
 * - Auto language detection
 * - Conditional translation between different languages
 * - Message processing for sending/receiving
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  convertToNativeScript,
  processOutgoingMessage,
  processIncomingMessage,
  detectScript,
  detectLanguage,
  isLatinScript,
  isSameLanguage,
  getNativeName,
  LANGUAGES
} from '@/lib/dl-translate';
import { useDebounce } from '@/hooks/useDebounce';

interface TransliterationState {
  input: string;
  output: string;
  isProcessing: boolean;
  confidence?: number;
}

interface MessageProcessResult {
  nativeScriptText: string;
  translatedText?: string;
  detectedLanguage: string;
  isTranslated: boolean;
  confidence?: number;
}

interface UseDLTranslateChatOptions {
  userLanguage: string;
  partnerLanguage: string;
  autoTransliterate?: boolean;
  debounceMs?: number;
}

interface UseDLTranslateChatReturn {
  // Transliteration
  transliteration: TransliterationState;
  setInputText: (text: string) => void;
  
  // Message processing
  processOutgoing: (text: string) => Promise<MessageProcessResult>;
  processIncoming: (text: string, senderLang: string) => Promise<MessageProcessResult>;
  
  // Language detection
  detectLanguageFromText: (text: string) => string;
  detectScript: (text: string) => { language: string; script: string; isLatin: boolean };
  
  // Utilities
  willTranslate: (text: string) => boolean;
  getNativeLanguageName: (lang: string) => string;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  
  // Browser language
  browserLanguage: string;
}

export function useDLTranslateChat(options: UseDLTranslateChatOptions): UseDLTranslateChatReturn {
  const { 
    userLanguage, 
    partnerLanguage, 
    autoTransliterate = true,
    debounceMs = 300 
  } = options;

  // State
  const [inputText, setInputTextState] = useState('');
  const [transliteration, setTransliteration] = useState<TransliterationState>({
    input: '',
    output: '',
    isProcessing: false
  });
  const [browserLanguage, setBrowserLanguage] = useState('english');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedInput = useDebounce(inputText, debounceMs);

  // Detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    const matchedLang = LANGUAGES.find(l => l.code === browserLang);
    if (matchedLang) {
      setBrowserLanguage(matchedLang.name);
    }
  }, []);

  // Real-time transliteration
  useEffect(() => {
    if (!autoTransliterate) {
      setTransliteration({
        input: inputText,
        output: inputText,
        isProcessing: false
      });
      return;
    }

    if (!debouncedInput.trim()) {
      setTransliteration({
        input: '',
        output: '',
        isProcessing: false
      });
      return;
    }

    // Skip if input is already in native script
    if (!isLatinScript(debouncedInput)) {
      setTransliteration({
        input: debouncedInput,
        output: debouncedInput,
        isProcessing: false,
        confidence: 1
      });
      return;
    }

    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const performTransliteration = async () => {
      setTransliteration(prev => ({ ...prev, isProcessing: true }));

      try {
        const result = await convertToNativeScript(debouncedInput, userLanguage);
        
        setTransliteration({
          input: debouncedInput,
          output: result.isTranslated ? result.text : debouncedInput,
          isProcessing: false,
          confidence: result.isTranslated ? 0.9 : 1
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[useDLTranslateChat] Transliteration error:', error);
          setTransliteration({
            input: debouncedInput,
            output: debouncedInput,
            isProcessing: false
          });
        }
      }
    };

    performTransliteration();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [debouncedInput, userLanguage, autoTransliterate]);

  // Set input text
  const setInputText = useCallback((text: string) => {
    setInputTextState(text);
  }, []);

  // Process outgoing message
  const processOutgoing = useCallback(async (text: string): Promise<MessageProcessResult> => {
    // Step 1: Convert Latin to native script if needed
    const processed = await processOutgoingMessage(text, userLanguage);
    const nativeScriptText = processed.text;

    // Step 2: Detect actual language
    const detected = detectScript(nativeScriptText);
    const actualLanguage = detected.language !== 'english' ? detected.language : userLanguage;

    // Step 3: Translate for partner if languages differ
    let translatedText: string | undefined;
    let isTranslated = false;

    if (!isSameLanguage(actualLanguage, partnerLanguage)) {
      const translation = await processIncomingMessage(
        nativeScriptText,
        actualLanguage,
        partnerLanguage
      );
      if (translation.isTranslated) {
        translatedText = translation.text;
        isTranslated = true;
      }
    }

    return {
      nativeScriptText,
      translatedText,
      detectedLanguage: actualLanguage,
      isTranslated,
      confidence: 0.9
    };
  }, [userLanguage, partnerLanguage]);

  // Process incoming message
  const processIncoming = useCallback(async (
    text: string, 
    senderLang: string
  ): Promise<MessageProcessResult> => {
    const detected = detectScript(text);
    const actualSenderLang = detected.language !== 'english' ? detected.language : senderLang;

    // Check if translation needed
    if (isSameLanguage(actualSenderLang, userLanguage)) {
      return {
        nativeScriptText: text,
        detectedLanguage: actualSenderLang,
        isTranslated: false
      };
    }

    // Translate to user's language
    const result = await processIncomingMessage(text, actualSenderLang, userLanguage);

    return {
      nativeScriptText: text,
      translatedText: result.isTranslated ? result.text : undefined,
      detectedLanguage: actualSenderLang,
      isTranslated: result.isTranslated,
      confidence: 0.9
    };
  }, [userLanguage]);

  // Check if message will be translated
  const willTranslate = useCallback((text: string): boolean => {
    if (!text.trim()) return false;
    const detected = detectLanguage(text);
    return !isSameLanguage(detected, partnerLanguage);
  }, [partnerLanguage]);

  // Detect language from text
  const detectLanguageFromText = useCallback((text: string): string => {
    return detectLanguage(text);
  }, []);

  // Get native language name
  const getNativeLanguageName = useCallback((lang: string): string => {
    return getNativeName(lang) || lang;
  }, []);

  return {
    transliteration,
    setInputText,
    processOutgoing,
    processIncoming,
    detectLanguageFromText,
    detectScript,
    willTranslate,
    getNativeLanguageName,
    isSameLanguage,
    browserLanguage
  };
}

export default useDLTranslateChat;

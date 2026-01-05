/**
 * Hook for Chat Translation functionality
 * 
 * Uses unified translator: ICU + DICTIONARY for instant results
 * 
 * FEATURES:
 * - Auto-detect source and target language
 * - Typing: Latin letters → Live native script preview (ICU + dictionary)
 * - Send: Sender sees native text immediately
 * - Receiver: Sees message translated to their mother tongue
 * - Bi-directional: Both users see messages in their own language
 * - Non-blocking: Typing not affected by translation
 * - Sub-2ms: Aggressive caching for instant response
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  getLivePreview,
  getLivePreviewWithSuggestions,
  translate,
  transliterate,
  detectLanguage,
  getLanguageCode,
  isSameLanguage as checkSameLanguage,
  isLatinScript as checkLatinScript,
  processOutgoingMessage,
  processIncomingMessage,
  spellCheck,
  SpellSuggestion,
} from '@/lib/translation/unified-translator';

interface TransliterationState {
  input: string;
  output: string;
  isProcessing: boolean;
  spellCorrected?: boolean;
  spellSuggestions?: SpellSuggestion[];
}

interface MessageProcessResult {
  nativeScriptText: string;
  translatedText?: string;
  detectedLanguage: string;
  isTranslated: boolean;
  spellCorrected?: boolean;
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

// Native language names
const NATIVE_NAMES: Record<string, string> = {
  english: 'English', hindi: 'हिंदी', bengali: 'বাংলা', telugu: 'తెలుగు',
  marathi: 'मराठी', tamil: 'தமிழ்', gujarati: 'ગુજરાતી', kannada: 'ಕನ್ನಡ',
  malayalam: 'മലയാളം', punjabi: 'ਪੰਜਾਬੀ', odia: 'ଓଡ଼ିଆ', urdu: 'اردو',
  arabic: 'العربية', spanish: 'Español', french: 'Français', german: 'Deutsch',
  chinese: '中文', japanese: '日本語', korean: '한국어', russian: 'Русский',
};

export function useDLTranslateChat(options: UseDLTranslateChatOptions): UseDLTranslateChatReturn {
  const { userLanguage, partnerLanguage } = options;

  const normUserLang = useMemo(() => userLanguage.toLowerCase().trim(), [userLanguage]);
  const normPartnerLang = useMemo(() => partnerLanguage.toLowerCase().trim(), [partnerLanguage]);

  const [transliteration, setTransliteration] = useState<TransliterationState>({
    input: '',
    output: '',
    isProcessing: false
  });
  const [isTranslating, setIsTranslating] = useState(false);
  
  const browserLanguage = useMemo(() => navigator.language?.split('-')[0] || 'en', []);
  const prevInputRef = useRef('');

  // Set input text and update preview INSTANTLY with DICTIONARY-BASED spell check
  const setInputText = useCallback((text: string) => {
    // Skip if same as previous
    if (text === prevInputRef.current) return;
    prevInputRef.current = text;
    
    // DICTIONARY-BASED: Get preview with spell suggestions
    const previewResult = getLivePreviewWithSuggestions(text, normUserLang);
    
    setTransliteration({
      input: text,
      output: previewResult.nativeText,
      isProcessing: false,
      spellCorrected: previewResult.spellCorrected,
      spellSuggestions: previewResult.suggestions,
    });
  }, [normUserLang]);

  // Process outgoing message (sender side)
  const processOutgoing = useCallback(async (text: string): Promise<MessageProcessResult> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { nativeScriptText: '', detectedLanguage: normUserLang, isTranslated: false };
    }

    setIsTranslating(true);
    try {
      const result = processOutgoingMessage(trimmed, normUserLang, normPartnerLang);
      
      return {
        nativeScriptText: result.senderNativeText,
        translatedText: result.receiverNativeText,
        detectedLanguage: result.detectedLanguage,
        isTranslated: result.isTranslated
      };
    } finally {
      setIsTranslating(false);
    }
  }, [normUserLang, normPartnerLang]);

  // Process incoming message (receiver side)
  const processIncoming = useCallback(async (
    text: string,
    senderLang: string
  ): Promise<MessageProcessResult> => {
    const trimmed = text.trim();
    
    if (!trimmed) {
      return { nativeScriptText: '', detectedLanguage: senderLang, isTranslated: false };
    }

    // Same language - no translation needed
    if (checkSameLanguage(senderLang, normUserLang)) {
      return { 
        nativeScriptText: trimmed, 
        detectedLanguage: senderLang, 
        isTranslated: false 
      };
    }

    setIsTranslating(true);
    try {
      const translated = processIncomingMessage(trimmed, senderLang, normUserLang);
      
      return {
        nativeScriptText: trimmed,
        translatedText: translated,
        detectedLanguage: senderLang,
        isTranslated: translated !== trimmed
      };
    } finally {
      setIsTranslating(false);
    }
  }, [normUserLang]);

  const willTranslate = useCallback((): boolean => {
    return !checkSameLanguage(normUserLang, normPartnerLang);
  }, [normUserLang, normPartnerLang]);

  const getNativeLanguageName = useCallback((lang: string) => {
    return NATIVE_NAMES[lang.toLowerCase()] || lang;
  }, []);

  const isSameLanguage = useCallback((lang1: string, lang2: string): boolean => {
    return checkSameLanguage(lang1, lang2);
  }, []);

  const detectLanguageFromText = useCallback((text: string): string => {
    if (!text.trim()) return normUserLang;
    const result = detectLanguage(text, normUserLang);
    return result.lang || normUserLang;
  }, [normUserLang]);

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
    isTranslating
  };
}

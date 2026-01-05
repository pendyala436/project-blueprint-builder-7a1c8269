/**
 * Hook for Chat Translation functionality
 * 
 * Uses DICTIONARY-based translation for instant results (no ML models)
 * 
 * FEATURES:
 * - Auto-detect source and target language
 * - Typing: Latin letters → Live native script preview (dictionary + ICU)
 * - Send: Sender sees native text immediately
 * - Receiver: Sees message translated to their mother tongue (dictionary)
 * - Bi-directional: Both users see messages in their own language
 * - Non-blocking: Typing not affected by translation
 * - Sub-2ms: Aggressive caching for instant response
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { translateWithML, getLanguageCode } from '@/lib/translation/ml-translation-engine';
import { icuTransliterate, isICUTransliterationSupported } from '@/lib/translation/icu-transliterator';
import { transliterate, isTransliterationSupported } from '@/lib/translation/dl-translate/transliteration';
import { resolveLangCode, normalizeLanguageInput } from '@/lib/translation/dl-translate/utils';
import { isSameLanguage as checkSameLanguage, isLatinScript as checkLatinScript, detectLanguage as detectLang } from '@/lib/translation/dl-translate/language-detector';

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

// Native language names
const NATIVE_NAMES: Record<string, string> = {
  english: 'English', hindi: 'हिंदी', bengali: 'বাংলা', telugu: 'తెలుగు',
  marathi: 'मराठी', tamil: 'தமிழ்', gujarati: 'ગુજરાતી', kannada: 'ಕನ್ನಡ',
  malayalam: 'മലയാളം', punjabi: 'ਪੰਜਾਬੀ', odia: 'ଓଡ଼ିଆ', urdu: 'اردو',
  arabic: 'العربية', spanish: 'Español', french: 'Français', german: 'Deutsch',
  chinese: '中文', japanese: '日本語', korean: '한국어', russian: 'Русский',
};

// Preview cache for instant response
const previewCache = new Map<string, string>();
const MAX_PREVIEW_CACHE = 5000;

/**
 * Get native script preview using dictionary + ICU transliteration
 * INSTANT: Uses word-level dictionary first, then character-level ICU
 */
function getNativePreview(text: string, language: string): string {
  if (!text.trim()) return '';
  
  // Check cache
  const cacheKey = `${text}|${language}`;
  const cached = previewCache.get(cacheKey);
  if (cached) return cached;
  
  // Already non-Latin - return as-is
  if (!checkLatinScript(text)) {
    previewCache.set(cacheKey, text);
    return text;
  }
  
  const normLang = normalizeLanguageInput(language);
  const langCode = resolveLangCode(normLang, 'nllb200');
  
  let result: string;
  
  // PRIORITY 1: Use transliterate (has word-level dictionary)
  if (isTransliterationSupported(langCode)) {
    result = transliterate(text, langCode);
  } 
  // PRIORITY 2: Use ICU transliteration
  else if (isICUTransliterationSupported(normLang)) {
    result = icuTransliterate(text, normLang);
  } 
  // FALLBACK: Return original
  else {
    result = text;
  }
  
  // Cache with size limit
  if (previewCache.size > MAX_PREVIEW_CACHE) {
    const keysToDelete = Array.from(previewCache.keys()).slice(0, 1000);
    keysToDelete.forEach(k => previewCache.delete(k));
  }
  previewCache.set(cacheKey, result);
  
  return result;
}

export function useDLTranslateChat(options: UseDLTranslateChatOptions): UseDLTranslateChatReturn {
  const { 
    userLanguage, 
    partnerLanguage, 
  } = options;

  const normUserLang = useMemo(() => normalizeLanguageInput(userLanguage), [userLanguage]);
  const normPartnerLang = useMemo(() => normalizeLanguageInput(partnerLanguage), [partnerLanguage]);

  const [inputText, setInputTextState] = useState('');
  const [transliteration, setTransliteration] = useState<TransliterationState>({
    input: '',
    output: '',
    isProcessing: false
  });
  const [isTranslating, setIsTranslating] = useState(false);
  
  const browserLanguage = useMemo(() => navigator.language?.split('-')[0] || 'en', []);
  const prevInputRef = useRef('');

  // Set input text and update preview INSTANTLY
  const setInputText = useCallback((text: string) => {
    setInputTextState(text);
    
    // Skip if same as previous (no re-render needed)
    if (text === prevInputRef.current) return;
    prevInputRef.current = text;
    
    // INSTANT native preview using dictionary + ICU
    const nativePreview = getNativePreview(text, normUserLang);
    
    setTransliteration({
      input: text,
      output: nativePreview,
      isProcessing: false
    });
  }, [normUserLang]);

  // Process outgoing message (sender side)
  const processOutgoing = useCallback(async (text: string): Promise<MessageProcessResult> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { nativeScriptText: '', detectedLanguage: normUserLang, isTranslated: false };
    }

    // Get native text for sender display
    const nativeText = checkLatinScript(trimmed) 
      ? getNativePreview(trimmed, normUserLang)
      : trimmed;

    // If same language - no translation needed
    if (checkSameLanguage(normUserLang, normPartnerLang)) {
      return { 
        nativeScriptText: nativeText, 
        detectedLanguage: normUserLang, 
        isTranslated: false 
      };
    }

    // DICTIONARY translation for receiver
    setIsTranslating(true);
    try {
      const translated = await translateWithML(nativeText, normUserLang, normPartnerLang);
      
      return {
        nativeScriptText: nativeText,
        translatedText: translated || nativeText,
        detectedLanguage: normUserLang,
        isTranslated: translated !== null && translated !== nativeText
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
    const normSenderLang = normalizeLanguageInput(senderLang);
    
    if (!trimmed) {
      return { nativeScriptText: '', detectedLanguage: normSenderLang, isTranslated: false };
    }

    // Same language - no translation needed
    if (checkSameLanguage(normSenderLang, normUserLang)) {
      return { 
        nativeScriptText: trimmed, 
        detectedLanguage: normSenderLang, 
        isTranslated: false 
      };
    }

    // DICTIONARY translation to receiver's language
    setIsTranslating(true);
    try {
      const translated = await translateWithML(trimmed, normSenderLang, normUserLang);
      
      return {
        nativeScriptText: trimmed,
        translatedText: translated || trimmed,
        detectedLanguage: normSenderLang,
        isTranslated: translated !== null && translated !== trimmed
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
    return checkSameLanguage(normalizeLanguageInput(lang1), normalizeLanguageInput(lang2));
  }, []);

  const detectLanguageFromText = useCallback((text: string): string => {
    if (!text.trim()) return normUserLang;
    const result = detectLang(text, normUserLang);
    return result.language || normUserLang;
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

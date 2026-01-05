/**
 * useChatTranslation - Production Chat Translation Hook (300+ Languages)
 * ULTRA-FAST: Sub-2ms response with ICU transliteration and aggressive caching
 * 
 * Features:
 * - Auto-detect source/target language from user profiles (mother tongue)
 * - Type in Latin letters → Live preview in native script (ICU, <2ms)
 * - Spell correction on Latin input (300+ languages)
 * - Send: Translation happens in background (non-blocking)
 * - Sender sees: Their message in their native language in chat
 * - Receiver sees: Message translated to their native language
 * - Bi-directional: Works both ways
 * - Non-blocking: Typing is never affected by translation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getLivePreview,
  processOutgoingMessage as processOutgoingFn,
  processIncomingMessage as processIncomingFn,
  usersNeedTranslation,
  type ChatParticipant,
  type LiveTypingPreview,
} from '@/lib/translation/dl-translate/production-bidirectional-translator';
import { 
  isLatinScript as checkIsLatinScript, 
  isSameLanguage as checkIsSameLanguage,
  detectLanguage as detectLang 
} from '@/lib/translation/dl-translate/language-detector';
import { normalizeLanguageInput as normalizeLanguage } from '@/lib/translation/dl-translate/utils';

// Types
export interface TranslatedMessage {
  id: string;
  senderId: string;
  originalText: string;
  senderNativeText: string;
  receiverNativeText: string;
  displayText: string;
  isTranslated: boolean;
  senderLanguage: string;
  receiverLanguage: string;
  detectedLanguage?: string;
  createdAt: string;
}

export interface LivePreviewState {
  latinInput: string;
  nativePreview: string;
  isConverting: boolean;
  spellCorrected?: boolean;
}

export interface UseChatTranslationOptions {
  currentUserId: string;
  currentUserLanguage: string;
  partnerId: string;
  partnerLanguage: string;
  debounceMs?: number;
  autoDetectLanguage?: boolean;
}

export interface UseChatTranslationReturn {
  livePreview: LivePreviewState;
  updateLivePreview: (latinText: string) => void;
  clearLivePreview: () => void;
  processOutgoingMessage: (text: string) => Promise<{
    nativeText: string;
    originalLatin: string;
    translatedForReceiver: string;
  }>;
  processIncomingMessage: (
    text: string, 
    senderId: string, 
    senderLanguage?: string
  ) => Promise<TranslatedMessage>;
  translateForReceiver: (
    text: string, 
    senderLang: string, 
    receiverLang: string
  ) => Promise<string>;
  autoDetectLanguage: (text: string) => string;
  isLatinScript: (text: string) => boolean;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  needsTranslation: boolean;
  needsNativeConversion: boolean;
  isTranslating: boolean;
  error: string | null;
}

const isEnglish = (lang: string): boolean => {
  const norm = normalizeLanguage(lang).toLowerCase();
  return norm === 'english' || norm === 'en' || norm === 'eng_latn';
};

export function useChatTranslation(options: UseChatTranslationOptions): UseChatTranslationReturn {
  const {
    currentUserId,
    currentUserLanguage,
    partnerId,
    partnerLanguage,
    debounceMs = 16 // ~60fps for instant feedback
  } = options;

  const myLanguage = normalizeLanguage(currentUserLanguage);
  const theirLanguage = normalizeLanguage(partnerLanguage);

  const [livePreview, setLivePreview] = useState<LivePreviewState>({
    latinInput: '',
    nativePreview: '',
    isConverting: false,
    spellCorrected: false
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const needsTranslation = usersNeedTranslation(myLanguage, theirLanguage);
  const needsNativeConversion = !isEnglish(myLanguage);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // ============ ULTRA-FAST Live Preview (Sub-2ms with caching) ============
  const updateLivePreview = useCallback((latinText: string) => {
    const trimmed = latinText.trim();
    
    // Fast path: empty input
    if (!trimmed) {
      setLivePreview({ latinInput: '', nativePreview: '', isConverting: false, spellCorrected: false });
      return;
    }

    // INSTANT preview using optimized getLivePreview (cached, sub-2ms)
    const preview: LiveTypingPreview = getLivePreview(trimmed, myLanguage);
    
    setLivePreview({
      latinInput: latinText,
      nativePreview: preview.nativePreview,
      isConverting: false,
      spellCorrected: preview.spellCorrected
    });
  }, [myLanguage]);

  const clearLivePreview = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setLivePreview({ latinInput: '', nativePreview: '', isConverting: false, spellCorrected: false });
  }, []);

  // ============ Process Outgoing Message (Sender Side) ============
  const processOutgoingMessage = useCallback(async (text: string): Promise<{
    nativeText: string;
    originalLatin: string;
    translatedForReceiver: string;
  }> => {
    const trimmed = text.trim();
    
    if (!trimmed) {
      return { nativeText: '', originalLatin: '', translatedForReceiver: '' };
    }

    const senderParticipant: ChatParticipant = {
      id: currentUserId,
      motherTongue: myLanguage,
    };
    const receiverParticipant: ChatParticipant = {
      id: partnerId,
      motherTongue: theirLanguage,
    };

    let translatedForReceiver = '';
    
    setIsTranslating(true);
    setError(null);

    try {
      const message = await processOutgoingFn(
        trimmed,
        senderParticipant,
        receiverParticipant,
        {
          onReceiverViewReady: (messageId, translatedText) => {
            translatedForReceiver = translatedText;
          },
          onTranslationError: (messageId, err) => {
            setError(err.message);
          },
        }
      );

      return {
        nativeText: message.senderNativeText,
        originalLatin: message.inputScript === 'latin' ? message.originalInput : '',
        translatedForReceiver: message.receiverNativeText || translatedForReceiver || message.senderNativeText,
      };
    } catch (err) {
      console.error('[ChatTranslation] Processing error:', err);
      setError(err instanceof Error ? err.message : 'Processing failed');
      
      // Fallback: return original text
      return { nativeText: trimmed, originalLatin: '', translatedForReceiver: trimmed };
    } finally {
      setIsTranslating(false);
    }
  }, [currentUserId, partnerId, myLanguage, theirLanguage]);

  // ============ Translate for Receiver ============
  const translateForReceiver = useCallback(async (
    text: string,
    senderLang: string,
    receiverLang: string
  ): Promise<string> => {
    const normSender = normalizeLanguage(senderLang);
    const normReceiver = normalizeLanguage(receiverLang);

    if (checkIsSameLanguage(normSender, normReceiver)) {
      return text;
    }

    try {
      setIsTranslating(true);
      const result = await processIncomingFn(text, normSender, normReceiver);
      return result || text;
    } catch (err) {
      console.error('[ChatTranslation] Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // ============ Process Incoming Message (Receiver Side) ============
  const processIncomingMessage = useCallback(async (
    text: string,
    senderId: string,
    senderLanguage?: string
  ): Promise<TranslatedMessage> => {
    const trimmed = text.trim();
    const now = new Date().toISOString();
    
    const senderLang = senderLanguage 
      ? normalizeLanguage(senderLanguage) 
      : (senderId === currentUserId ? myLanguage : theirLanguage);
    
    const targetLang = myLanguage;

    const baseMessage: TranslatedMessage = {
      id: `msg-${Date.now()}`,
      senderId,
      originalText: trimmed,
      senderNativeText: trimmed,
      receiverNativeText: trimmed,
      displayText: trimmed,
      isTranslated: false,
      senderLanguage: senderLang,
      receiverLanguage: targetLang,
      createdAt: now
    };

    // If sender is current user, no translation needed
    if (senderId === currentUserId) {
      return baseMessage;
    }

    // If same language, no translation needed
    if (checkIsSameLanguage(senderLang, myLanguage)) {
      return baseMessage;
    }

    try {
      const translated = await processIncomingFn(trimmed, senderLang, myLanguage);
      return {
        ...baseMessage,
        receiverNativeText: translated,
        displayText: translated,
        isTranslated: translated !== trimmed
      };
    } catch (err) {
      console.error('[ChatTranslation] Incoming message error:', err);
      return baseMessage;
    }
  }, [currentUserId, myLanguage, theirLanguage]);

  // ============ Auto-detect Language ============
  const autoDetectLang = useCallback((text: string): string => {
    if (!text.trim()) return myLanguage;
    const result = detectLang(text, myLanguage);
    return result.language || myLanguage;
  }, [myLanguage]);

  // ============ Same Language Check ============
  const isSameLanguage = useCallback((lang1: string, lang2: string): boolean => {
    return checkIsSameLanguage(normalizeLanguage(lang1), normalizeLanguage(lang2));
  }, []);

  return {
    livePreview,
    updateLivePreview,
    clearLivePreview,
    processOutgoingMessage,
    processIncomingMessage,
    translateForReceiver,
    autoDetectLanguage: autoDetectLang,
    isLatinScript: checkIsLatinScript,
    isSameLanguage,
    needsTranslation,
    needsNativeConversion,
    isTranslating,
    error
  };
}

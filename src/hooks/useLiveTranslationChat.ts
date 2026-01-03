/**
 * Live Translation Chat Hook (DL-Translate + M2M100)
 * 
 * Flow:
 * 1. Typing: User types in Latin letters (phonetic input)
 * 2. Preview: Live transliteration into native script (debounced)
 * 3. Send: Translation happens in background, sender sees native text
 * 4. Receiver: Sees message in their mother tongue
 * 5. Bi-directional: Same flow for both users
 * 6. Dynamic: Supports 200 languages (DL-Translate + M2M100)
 * 7. Non-blocking: Typing is never affected by translation
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  translateText,
  convertToNativeScript,
  detectLanguage as detectLang,
  isLatinScript,
  isSameLanguage as checkSameLanguage,
  normalizeLanguage
} from '@/lib/translation/translation-engine';
import { isLatinScriptLanguage } from '@/lib/translation/language-codes';
import {
  getSupportedDLM2M100Languages,
  isDLM2M100Supported
} from '@/lib/translation/ml-translation-engine';

// ============ Types ============

export interface ChatMessage {
  id: string;
  text: string;                    // Original text (Latin input or native)
  nativeText: string;              // Text in sender's native script
  translatedText?: string;         // Translation for receiver
  senderLanguage: string;
  receiverLanguage?: string;
  senderId: string;
  timestamp: number;
  isTranslating?: boolean;
  translationFailed?: boolean;
}

export interface LivePreviewState {
  input: string;                   // Current Latin input
  preview: string;                 // Live native script preview
  isConverting: boolean;           // Converting in progress
}

export interface UseLiveTranslationChatOptions {
  userLanguage: string;            // User's mother tongue
  partnerLanguage?: string;        // Partner's mother tongue
  userId: string;                  // Current user ID
  debounceMs?: number;             // Debounce delay for live preview
}

export interface UseLiveTranslationChatReturn {
  // Live preview (non-blocking)
  livePreview: LivePreviewState;
  setInput: (text: string) => void;
  clearInput: () => void;
  
  // Message processing
  prepareOutgoing: () => Promise<{ nativeText: string; originalInput: string }>;
  translateForReceiver: (message: ChatMessage) => Promise<ChatMessage>;
  processIncoming: (message: ChatMessage) => Promise<ChatMessage>;
  
  // Utilities
  getSupportedLanguages: () => string[];
  isLanguageSupported: (lang: string) => boolean;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  detectLanguage: (text: string) => string;
  
  // State
  isTranslating: boolean;
}

// ============ Hook ============

export function useLiveTranslationChat(
  options: UseLiveTranslationChatOptions
): UseLiveTranslationChatReturn {
  const {
    userLanguage,
    partnerLanguage,
    userId,
    debounceMs = 150
  } = options;

  // Normalize languages once
  const normUserLang = useMemo(() => normalizeLanguage(userLanguage), [userLanguage]);
  const normPartnerLang = useMemo(
    () => partnerLanguage ? normalizeLanguage(partnerLanguage) : null,
    [partnerLanguage]
  );

  // ============ State ============
  
  const [livePreview, setLivePreview] = useState<LivePreviewState>({
    input: '',
    preview: '',
    isConverting: false
  });
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Debounce ref for non-blocking preview
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentInputRef = useRef<string>('');

  // ============ Live Preview (Non-blocking) ============

  /**
   * Update input with live transliteration preview
   * NON-BLOCKING: Typing is never delayed
   */
  const setInput = useCallback((text: string) => {
    currentInputRef.current = text;
    
    // Immediately update input (non-blocking)
    setLivePreview(prev => ({
      ...prev,
      input: text,
      isConverting: true
    }));

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = text.trim();
    
    // Empty input
    if (!trimmed) {
      setLivePreview({ input: text, preview: '', isConverting: false });
      return;
    }

    // User's language is English - no conversion needed
    if (normUserLang === 'english') {
      setLivePreview({ input: text, preview: trimmed, isConverting: false });
      return;
    }

    // Already in native script - show as-is
    if (!isLatinScript(trimmed)) {
      setLivePreview({ input: text, preview: trimmed, isConverting: false });
      return;
    }

    // Debounced conversion (non-blocking)
    debounceRef.current = setTimeout(async () => {
      // Check if input changed during debounce
      if (currentInputRef.current !== text) return;

      try {
        const converted = await convertToNativeScript(trimmed, normUserLang);
        
        // Check if input still matches
        if (currentInputRef.current === text) {
          setLivePreview({
            input: text,
            preview: converted,
            isConverting: false
          });
        }
      } catch {
        // Fallback to original on error
        if (currentInputRef.current === text) {
          setLivePreview({
            input: text,
            preview: trimmed,
            isConverting: false
          });
        }
      }
    }, debounceMs);
  }, [normUserLang, debounceMs]);

  /**
   * Clear input and preview
   */
  const clearInput = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    currentInputRef.current = '';
    setLivePreview({ input: '', preview: '', isConverting: false });
  }, []);

  // ============ Message Processing ============

  /**
   * Prepare outgoing message (called on send)
   * Converts Latin input to native script for sender display
   */
  const prepareOutgoing = useCallback(async (): Promise<{
    nativeText: string;
    originalInput: string;
  }> => {
    const input = currentInputRef.current.trim();
    
    if (!input) {
      return { nativeText: '', originalInput: '' };
    }

    // If already showing preview, use it
    if (livePreview.preview && !livePreview.isConverting) {
      clearInput();
      return { nativeText: livePreview.preview, originalInput: input };
    }

    // Convert now if needed
    if (normUserLang !== 'english' && isLatinScript(input)) {
      const converted = await convertToNativeScript(input, normUserLang);
      clearInput();
      return { nativeText: converted, originalInput: input };
    }

    clearInput();
    return { nativeText: input, originalInput: input };
  }, [livePreview, normUserLang, clearInput]);

  /**
   * Translate message for receiver (background, non-blocking)
   * Called after message is sent to sender
   */
  const translateForReceiver = useCallback(async (
    message: ChatMessage
  ): Promise<ChatMessage> => {
    const receiverLang = message.receiverLanguage || normPartnerLang;
    
    if (!receiverLang) {
      return message;
    }

    const senderLang = normalizeLanguage(message.senderLanguage);
    const targetLang = normalizeLanguage(receiverLang);

    // Same language - no translation needed
    if (checkSameLanguage(senderLang, targetLang)) {
      return {
        ...message,
        translatedText: message.nativeText
      };
    }

    setIsTranslating(true);

    try {
      const result = await translateText(message.nativeText, {
        sourceLanguage: senderLang,
        targetLanguage: targetLang,
        mode: 'translate'
      });

      return {
        ...message,
        translatedText: result.translatedText,
        isTranslating: false
      };
    } catch (error) {
      console.error('[LiveTranslation] Translation failed:', error);
      return {
        ...message,
        translatedText: message.nativeText,
        isTranslating: false,
        translationFailed: true
      };
    } finally {
      setIsTranslating(false);
    }
  }, [normPartnerLang]);

  /**
   * Process incoming message (translate to user's language)
   */
  const processIncoming = useCallback(async (
    message: ChatMessage
  ): Promise<ChatMessage> => {
    const senderLang = normalizeLanguage(message.senderLanguage);
    
    // Same language - no translation needed
    if (checkSameLanguage(senderLang, normUserLang)) {
      return {
        ...message,
        translatedText: message.nativeText
      };
    }

    // Already translated for this user
    if (message.translatedText && message.receiverLanguage === normUserLang) {
      return message;
    }

    setIsTranslating(true);

    try {
      const result = await translateText(message.nativeText, {
        sourceLanguage: senderLang,
        targetLanguage: normUserLang,
        mode: 'translate'
      });

      return {
        ...message,
        translatedText: result.translatedText,
        receiverLanguage: normUserLang,
        isTranslating: false
      };
    } catch (error) {
      console.error('[LiveTranslation] Incoming translation failed:', error);
      return {
        ...message,
        translatedText: message.nativeText,
        isTranslating: false,
        translationFailed: true
      };
    } finally {
      setIsTranslating(false);
    }
  }, [normUserLang]);

  // ============ Utilities ============

  const getSupportedLanguages = useCallback(() => {
    return getSupportedDLM2M100Languages();
  }, []);

  const isLanguageSupported = useCallback((lang: string) => {
    return isDLM2M100Supported(lang);
  }, []);

  const isSameLanguage = useCallback((lang1: string, lang2: string) => {
    return checkSameLanguage(lang1, lang2);
  }, []);

  const detectLanguage = useCallback((text: string) => {
    return detectLang(text).language;
  }, []);

  // ============ Return ============

  return {
    livePreview,
    setInput,
    clearInput,
    prepareOutgoing,
    translateForReceiver,
    processIncoming,
    getSupportedLanguages,
    isLanguageSupported,
    isSameLanguage,
    detectLanguage,
    isTranslating
  };
}

export default useLiveTranslationChat;

import { useCallback, useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationResult {
  translatedMessage: string;
  isTranslated: boolean;
  detectedLanguage?: string;
  sourceLanguageCode?: string;
  targetLanguageCode?: string;
}

interface LivePreviewResult {
  originalText: string;
  previewText: string;
  isConverting: boolean;
  targetLanguage: string;
}

interface UseMultilingualChatOptions {
  currentUserLanguage: string;
  partnerLanguage?: string;
  enabled?: boolean;
}

/**
 * Hook for handling multilingual chat with:
 * 1. Latin-to-native script conversion (when user types in English/Latin)
 * 2. Auto-translation to receiver's language
 * 
 * Workflow:
 * - User types in Latin (e.g., "namaste") → Converted to user's native script (e.g., "नमस्ते")
 * - Message stored in sender's language
 * - Receiver sees message translated to their native language
 * 
 * Uses facebook/nllb-200-distilled-600M for 200+ language support
 */
export const useMultilingualChat = ({
  currentUserLanguage,
  partnerLanguage = '',
  enabled = true
}: UseMultilingualChatOptions) => {
  const cacheRef = useRef<Map<string, TranslationResult>>(new Map());
  
  // Live preview state for sender's native language translation
  const [livePreview, setLivePreview] = useState<LivePreviewResult>({
    originalText: '',
    previewText: '',
    isConverting: false,
    targetLanguage: currentUserLanguage
  });
  
  // Debounce timer for live preview
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Check if sender and receiver share the same language (skip translation)
   */
  const isSameLanguage = useCallback((): boolean => {
    if (!partnerLanguage) return false;
    const senderLang = currentUserLanguage.toLowerCase().trim();
    const receiverLang = partnerLanguage.toLowerCase().trim();
    return senderLang === receiverLang;
  }, [currentUserLanguage, partnerLanguage]);
  
  // List of Latin-script languages (no conversion needed)
  const latinLanguages = [
    'english', 'spanish', 'french', 'german', 'portuguese', 'italian',
    'dutch', 'polish', 'romanian', 'swedish', 'danish', 'norwegian',
    'finnish', 'czech', 'hungarian', 'vietnamese', 'indonesian', 'malay',
    'tagalog', 'filipino', 'swahili', 'turkish', 'croatian', 'slovenian'
  ];

  /**
   * Check if a language uses Latin script
   */
  const isLatinLanguage = useCallback((lang: string): boolean => {
    return latinLanguages.includes(lang.toLowerCase().trim());
  }, []);

  /**
   * Check if text is primarily in Latin script
   */
  const isLatinText = useCallback((text: string): boolean => {
    if (!text.trim()) return true;
    const latinChars = text.match(/[a-zA-Z]/g);
    const totalChars = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
    if (!latinChars || !totalChars.length) return true;
    return (latinChars.length / totalChars.length) > 0.6;
  }, []);

  /**
   * Convert Latin text to user's native script (transliteration)
   * Called BEFORE sending a message
   * 
   * Example: "namaste" typed by Hindi user → "नमस्ते"
   */
  const convertToNativeScript = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<string> => {
    if (!enabled || !text.trim()) return text;
    
    // Skip if target language uses Latin script
    if (isLatinLanguage(targetLanguage)) return text;
    
    // Skip if text is already in non-Latin script
    if (!isLatinText(text)) return text;
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          message: text,
          targetLanguage: targetLanguage,
          mode: 'convert'
        }
      });

      if (error) {
        console.error('[MultilingualChat] Conversion error:', error);
        return text;
      }

      return data?.convertedMessage || data?.translatedMessage || text;
    } catch (err) {
      console.error('[MultilingualChat] Failed to convert:', err);
      return text;
    }
  }, [enabled, isLatinLanguage, isLatinText]);

  /**
   * Translate a message to a target language
   * Called when DISPLAYING messages to the receiver
   * 
   * Example: Hindi message "नमस्ते" displayed to Tamil user → "வணக்கம்"
   */
  const translateMessage = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    if (!enabled || !text.trim()) {
      return { translatedMessage: text, isTranslated: false };
    }

    // Check cache first
    const cacheKey = `translate:${targetLanguage}:${text}`;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)!;
    }

    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          message: text,
          targetLanguage: targetLanguage,
          mode: 'auto' // Auto-detect source and translate
        }
      });

      if (error) {
        console.error('[MultilingualChat] Translation error:', error);
        return { translatedMessage: text, isTranslated: false };
      }

      const result: TranslationResult = {
        translatedMessage: data?.translatedMessage || text,
        isTranslated: data?.isTranslated || false,
        detectedLanguage: data?.detectedLanguage,
        sourceLanguageCode: data?.sourceLanguageCode,
        targetLanguageCode: data?.targetLanguageCode
      };

      // Cache the result
      cacheRef.current.set(cacheKey, result);
      
      // Limit cache size
      if (cacheRef.current.size > 500) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }

      return result;
    } catch (err) {
      console.error('[MultilingualChat] Failed to translate:', err);
      return { translatedMessage: text, isTranslated: false };
    }
  }, [enabled]);

  /**
   * Update live preview as user types
   * Shows real-time translation to sender's native language
   * 
   * @param inputText - Current text in the input field
   */
  const updateLivePreview = useCallback((inputText: string) => {
    if (!enabled || !inputText.trim()) {
      setLivePreview(prev => ({
        ...prev,
        originalText: '',
        previewText: '',
        isConverting: false
      }));
      return;
    }

    // Skip preview for non-Latin input (already in native script)
    if (!isLatinText(inputText)) {
      setLivePreview(prev => ({
        ...prev,
        originalText: inputText,
        previewText: '',
        isConverting: false
      }));
      return;
    }

    // Skip preview for Latin languages (no conversion needed)
    if (isLatinLanguage(currentUserLanguage)) {
      setLivePreview(prev => ({
        ...prev,
        originalText: inputText,
        previewText: '',
        isConverting: false
      }));
      return;
    }

    // Set converting state
    setLivePreview(prev => ({
      ...prev,
      originalText: inputText,
      isConverting: true
    }));

    // Debounce the API call
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }

    previewDebounceRef.current = setTimeout(async () => {
      try {
        const converted = await convertToNativeScript(inputText, currentUserLanguage);
        
        // Only show preview if it's different from original
        if (converted !== inputText) {
          setLivePreview({
            originalText: inputText,
            previewText: converted,
            isConverting: false,
            targetLanguage: currentUserLanguage
          });
        } else {
          setLivePreview(prev => ({
            ...prev,
            previewText: '',
            isConverting: false
          }));
        }
      } catch (err) {
        console.error('[MultilingualChat] Live preview error:', err);
        setLivePreview(prev => ({
          ...prev,
          previewText: '',
          isConverting: false
        }));
      }
    }, 300); // 300ms debounce for smooth typing
  }, [enabled, currentUserLanguage, isLatinText, isLatinLanguage, convertToNativeScript]);

  /**
   * Clear live preview (call after sending message)
   */
  const clearLivePreview = useCallback(() => {
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }
    setLivePreview({
      originalText: '',
      previewText: '',
      isConverting: false,
      targetLanguage: currentUserLanguage
    });
  }, [currentUserLanguage]);

  /**
   * Process an outgoing message before sending:
   * 1. Convert Latin input to sender's native script
   * 
   * @param messageText - The raw text the user typed
   * @returns The message in sender's native script (ready to store)
   */
  const processOutgoingMessage = useCallback(async (
    messageText: string
  ): Promise<string> => {
    if (!enabled || !messageText.trim()) return messageText;

    // Convert Latin typing to user's native script
    const convertedMessage = await convertToNativeScript(messageText, currentUserLanguage);
    
    console.log('[MultilingualChat] Outgoing:', {
      original: messageText,
      converted: convertedMessage,
      userLanguage: currentUserLanguage,
      partnerLanguage,
      sameLanguage: isSameLanguage()
    });

    return convertedMessage;
  }, [enabled, currentUserLanguage, partnerLanguage, convertToNativeScript, isSameLanguage]);

  /**
   * Process an incoming message for display:
   * 1. Skip translation if same language
   * 2. Translate to current user's language if different
   * 
   * @param messageText - The stored message (in sender's language)
   * @param senderLanguage - Optional: explicit sender language for skip check
   * @returns Translation result with translated text
   */
  const processIncomingMessage = useCallback(async (
    messageText: string,
    senderLanguage?: string
  ): Promise<TranslationResult> => {
    if (!enabled || !messageText.trim()) {
      return { translatedMessage: messageText, isTranslated: false };
    }

    // Check if sender and receiver have same language - skip translation
    const senderLang = (senderLanguage || partnerLanguage).toLowerCase().trim();
    const receiverLang = currentUserLanguage.toLowerCase().trim();
    
    if (senderLang && senderLang === receiverLang) {
      console.log('[MultilingualChat] Same language, skipping translation:', senderLang);
      return { 
        translatedMessage: messageText, 
        isTranslated: false,
        detectedLanguage: senderLang
      };
    }

    // Translate to current user's language
    const result = await translateMessage(messageText, currentUserLanguage);
    
    console.log('[MultilingualChat] Incoming:', {
      original: messageText,
      translated: result.translatedMessage,
      isTranslated: result.isTranslated,
      userLanguage: currentUserLanguage,
      senderLanguage: senderLang
    });

    return result;
  }, [enabled, currentUserLanguage, partnerLanguage, translateMessage]);

  /**
   * Clear translation cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
    };
  }, []);

  return {
    // Core functions
    processOutgoingMessage,
    processIncomingMessage,
    convertToNativeScript,
    translateMessage,
    
    // Live preview for sender
    livePreview,
    updateLivePreview,
    clearLivePreview,
    
    // Utility functions
    clearCache,
    isLatinLanguage,
    isLatinText,
    isSameLanguage
  };
};

export default useMultilingualChat;

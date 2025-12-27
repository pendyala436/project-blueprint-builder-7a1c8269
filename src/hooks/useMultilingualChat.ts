import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationResult {
  translatedMessage: string;
  isTranslated: boolean;
  detectedLanguage?: string;
  sourceLanguageCode?: string;
  targetLanguageCode?: string;
}

interface UseMultilingualChatOptions {
  currentUserLanguage: string;
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
  enabled = true
}: UseMultilingualChatOptions) => {
  const cacheRef = useRef<Map<string, TranslationResult>>(new Map());
  
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
      userLanguage: currentUserLanguage
    });

    return convertedMessage;
  }, [enabled, currentUserLanguage, convertToNativeScript]);

  /**
   * Process an incoming message for display:
   * 1. Translate to current user's language
   * 
   * @param messageText - The stored message (in sender's language)
   * @returns Translation result with translated text
   */
  const processIncomingMessage = useCallback(async (
    messageText: string
  ): Promise<TranslationResult> => {
    if (!enabled || !messageText.trim()) {
      return { translatedMessage: messageText, isTranslated: false };
    }

    // Translate to current user's language
    const result = await translateMessage(messageText, currentUserLanguage);
    
    console.log('[MultilingualChat] Incoming:', {
      original: messageText,
      translated: result.translatedMessage,
      isTranslated: result.isTranslated,
      userLanguage: currentUserLanguage
    });

    return result;
  }, [enabled, currentUserLanguage, translateMessage]);

  /**
   * Clear translation cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    processOutgoingMessage,
    processIncomingMessage,
    convertToNativeScript,
    translateMessage,
    clearCache,
    isLatinLanguage,
    isLatinText
  };
};

export default useMultilingualChat;

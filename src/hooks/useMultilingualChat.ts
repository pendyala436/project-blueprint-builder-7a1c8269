/**
 * useMultilingualChat Hook
 * 
 * Refactored to use the dl-translate inspired translation module
 * Provides multilingual chat functionality with:
 * 1. Latin-to-native script conversion
 * 2. Auto-translation between languages
 * 3. Live preview for sender
 * 
 * Uses NLLB-200 model via Hugging Face for 200+ language support
 */

import { useCallback, useEffect } from 'react';
import { 
  useTranslator, 
  isSameLanguage as checkSameLanguage,
  isLatinScript,
  isLatinScriptLanguage 
} from '@/lib/translation';

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
  
  // Use the new translation hook
  const {
    translate,
    convertScript,
    livePreview: translatorLivePreview,
    updateLivePreview: translatorUpdatePreview,
    clearLivePreview: translatorClearPreview,
    clearCache: translatorClearCache,
    isTranslating
  } = useTranslator({
    userLanguage: currentUserLanguage,
    partnerLanguage,
    enableLivePreview: enabled,
    previewDebounceMs: 300
  });

  /**
   * Check if sender and receiver share the same language (skip translation)
   */
  const isSameLanguage = useCallback((): boolean => {
    if (!partnerLanguage) return false;
    return checkSameLanguage(currentUserLanguage, partnerLanguage);
  }, [currentUserLanguage, partnerLanguage]);

  /**
   * Check if a language uses Latin script
   */
  const isLatinLanguage = useCallback((lang: string): boolean => {
    return isLatinScriptLanguage(lang);
  }, []);

  /**
   * Check if text is primarily in Latin script
   */
  const isLatinText = useCallback((text: string): boolean => {
    return isLatinScript(text);
  }, []);

  /**
   * Convert Latin text to user's native script (transliteration)
   */
  const convertToNativeScript = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<string> => {
    if (!enabled || !text.trim()) return text;
    if (isLatinScriptLanguage(targetLanguage)) return text;
    if (!isLatinScript(text)) return text;
    
    try {
      return await convertScript(text, targetLanguage);
    } catch (err) {
      console.error('[MultilingualChat] Conversion error:', err);
      return text;
    }
  }, [enabled, convertScript]);

  /**
   * Translate a message to a target language
   */
  const translateMessage = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    if (!enabled || !text.trim()) {
      return { translatedMessage: text, isTranslated: false };
    }

    try {
      const result = await translate(text, { targetLanguage });
      
      return {
        translatedMessage: result.translatedText,
        isTranslated: result.isTranslated,
        detectedLanguage: result.sourceLanguage,
        sourceLanguageCode: result.sourceCode,
        targetLanguageCode: result.targetCode
      };
    } catch (err) {
      console.error('[MultilingualChat] Translation error:', err);
      return { translatedMessage: text, isTranslated: false };
    }
  }, [enabled, translate]);

  /**
   * Update live preview as user types
   */
  const updateLivePreview = useCallback((inputText: string) => {
    if (!enabled) return;
    translatorUpdatePreview(inputText);
  }, [enabled, translatorUpdatePreview]);

  /**
   * Clear live preview
   */
  const clearLivePreview = useCallback(() => {
    translatorClearPreview();
  }, [translatorClearPreview]);

  /**
   * Get live preview in the expected format
   */
  const livePreview: LivePreviewResult = {
    originalText: translatorLivePreview?.originalText || '',
    previewText: translatorLivePreview?.previewText || '',
    isConverting: translatorLivePreview?.isLoading || isTranslating,
    targetLanguage: currentUserLanguage
  };

  /**
   * Process an outgoing message before sending
   */
  const processOutgoingMessage = useCallback(async (
    messageText: string
  ): Promise<string> => {
    if (!enabled || !messageText.trim()) return messageText;

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
   * Process an incoming message for display
   */
  const processIncomingMessage = useCallback(async (
    messageText: string,
    senderLanguage?: string
  ): Promise<TranslationResult> => {
    if (!enabled || !messageText.trim()) {
      return { translatedMessage: messageText, isTranslated: false };
    }

    const senderLang = senderLanguage || partnerLanguage;
    
    if (senderLang && checkSameLanguage(senderLang, currentUserLanguage)) {
      console.log('[MultilingualChat] Same language, skipping translation:', senderLang);
      return { 
        translatedMessage: messageText, 
        isTranslated: false,
        detectedLanguage: senderLang
      };
    }

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
    translatorClearCache();
  }, [translatorClearCache]);

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

/**
 * useLibreTranslate React Hook
 * ============================
 * 
 * React hook for browser-based translation inspired by LibreTranslate.
 * Fetches mother tongue from user profiles automatically.
 * 
 * @example
 * ```tsx
 * import { useLibreTranslate } from '@/lib/libre-translate';
 * 
 * function ChatComponent() {
 *   const { translateForChat, getPreview, isTranslating } = useLibreTranslate();
 *   
 *   // Get instant preview while typing
 *   const preview = getPreview('namaste', 'hindi'); // "नमस्ते"
 *   
 *   // Translate message using user profiles
 *   const handleSend = async (text: string) => {
 *     const result = await translateForChat(text, senderId, receiverId, 'native');
 *     console.log(result.senderView, result.receiverView);
 *   };
 * }
 * ```
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  translate as coreTranslate,
  translateBidirectional as coreBidirectional,
  processChatMessage as coreProcessChat,
  processOutgoing,
  processIncoming,
  getInstantPreview,
  transliterateToNative,
  reverseTransliterate,
  clearCache,
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  detectScript,
} from './engine';
import {
  getUserMotherTongue,
  getChatParticipantLanguages,
  prefetchUserLanguages,
  invalidateUserLanguageCache,
  clearLanguageCache,
} from './profile-language';
import type {
  TranslationResult,
  ChatMessageViews,
  ChatProcessingOptions,
  BidirectionalResult,
  TypingMode,
} from './types';

export interface UseLibreTranslateReturn {
  // Core translation
  translate: (text: string, source: string, target: string) => Promise<TranslationResult>;
  translateBidirectional: (text: string, source: string, target: string) => Promise<BidirectionalResult>;
  
  // Chat processing with user IDs (fetches languages from profiles)
  translateForChat: (
    text: string,
    senderId: string,
    receiverId: string,
    typingMode: TypingMode,
    inputIsLatin?: boolean
  ) => Promise<ChatMessageViews>;
  
  // Chat processing with explicit languages (legacy/override)
  processChatMessage: (text: string, options: ChatProcessingOptions) => Promise<ChatMessageViews>;
  processOutgoing: (text: string, senderLanguage: string) => { senderView: string; wasTransliterated: boolean };
  processIncoming: (text: string, senderLanguage: string, receiverLanguage: string) => Promise<{ receiverView: string; wasTranslated: boolean }>;
  
  // Get user's mother tongue from profile
  getUserLanguage: (userId: string) => Promise<string>;
  getParticipantLanguages: (senderId: string, receiverId: string) => Promise<{ senderLanguage: string; receiverLanguage: string }>;
  
  // Prefetch languages for multiple users
  prefetchLanguages: (userIds: string[]) => Promise<void>;
  
  // Live preview (synchronous)
  getPreview: (text: string, targetLanguage: string) => string;
  
  // Transliteration
  transliterate: (text: string, targetLanguage: string) => string;
  reverseTransliterate: (text: string, sourceLanguage: string) => string;
  
  // Language utilities
  normalizeLanguage: (lang: string) => string;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  isEnglish: (lang: string) => boolean;
  isLatinScript: (text: string) => boolean;
  isLatinLanguage: (lang: string) => boolean;
  detectScript: typeof detectScript;
  
  // State
  isTranslating: boolean;
  error: string | null;
  
  // Cache
  clearCache: () => void;
  clearLanguageCache: () => void;
  invalidateUserLanguage: (userId: string) => void;
}

export function useLibreTranslate(): UseLibreTranslateReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wrapped translate with state management
  const translate = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await coreTranslate(text, source, target);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Translation failed';
      setError(errorMessage);
      return {
        text,
        originalText: text,
        sourceLanguage: source,
        targetLanguage: target,
        isTranslated: false,
        wasTransliterated: false,
        confidence: 0,
        mode: 'passthrough',
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Wrapped bidirectional with state management
  const translateBidirectional = useCallback(async (
    text: string,
    source: string,
    target: string
  ): Promise<BidirectionalResult> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      return await coreBidirectional(text, source, target);
    } catch (err: any) {
      setError(err.message || 'Translation failed');
      const fallback: TranslationResult = {
        text,
        originalText: text,
        sourceLanguage: source,
        targetLanguage: target,
        isTranslated: false,
        wasTransliterated: false,
        confidence: 0,
        mode: 'passthrough',
      };
      return { forward: fallback, backward: fallback };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Wrapped chat processing with state management (explicit languages)
  const processChatMessage = useCallback(async (
    text: string,
    options: ChatProcessingOptions
  ): Promise<ChatMessageViews> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      return await coreProcessChat(text, options);
    } catch (err: any) {
      setError(err.message || 'Processing failed');
      return {
        originalText: text,
        senderView: text,
        receiverView: text,
        wasTransliterated: false,
        wasTranslated: false,
        combination: 'same-native-native',
        typingMode: options.typingMode,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  /**
   * Translate for chat using user IDs
   * Automatically fetches mother tongue from profiles
   */
  const translateForChat = useCallback(async (
    text: string,
    senderId: string,
    receiverId: string,
    typingMode: TypingMode,
    inputIsLatin?: boolean
  ): Promise<ChatMessageViews> => {
    setIsTranslating(true);
    setError(null);
    
    try {
      // Fetch languages from user profiles
      const { senderLanguage, receiverLanguage } = await getChatParticipantLanguages(
        senderId,
        receiverId
      );
      
      // Process message with fetched languages
      return await coreProcessChat(text, {
        senderLanguage,
        receiverLanguage,
        typingMode,
        inputIsLatin,
      });
    } catch (err: any) {
      setError(err.message || 'Translation failed');
      return {
        originalText: text,
        senderView: text,
        receiverView: text,
        wasTransliterated: false,
        wasTranslated: false,
        combination: 'same-native-native',
        typingMode,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Get user's mother tongue
  const getUserLanguage = useCallback(async (userId: string): Promise<string> => {
    return getUserMotherTongue(userId);
  }, []);

  // Get languages for both participants
  const getParticipantLanguages = useCallback(async (
    senderId: string,
    receiverId: string
  ): Promise<{ senderLanguage: string; receiverLanguage: string }> => {
    return getChatParticipantLanguages(senderId, receiverId);
  }, []);

  // Prefetch languages for multiple users
  const prefetchLanguages = useCallback(async (userIds: string[]): Promise<void> => {
    return prefetchUserLanguages(userIds);
  }, []);

  // Memoized return object
  return useMemo(() => ({
    // Core translation
    translate,
    translateBidirectional,
    
    // Chat processing with user IDs
    translateForChat,
    
    // Chat processing with explicit languages
    processChatMessage,
    processOutgoing,
    processIncoming,
    
    // Profile language functions
    getUserLanguage,
    getParticipantLanguages,
    prefetchLanguages,
    
    // Live preview
    getPreview: getInstantPreview,
    
    // Transliteration
    transliterate: transliterateToNative,
    reverseTransliterate,
    
    // Language utilities
    normalizeLanguage,
    isSameLanguage,
    isEnglish,
    isLatinScript: isLatinText,
    isLatinLanguage: isLatinScriptLanguage,
    detectScript,
    
    // State
    isTranslating,
    error,
    
    // Cache
    clearCache,
    clearLanguageCache,
    invalidateUserLanguage: invalidateUserLanguageCache,
  }), [translate, translateBidirectional, translateForChat, processChatMessage, getUserLanguage, getParticipantLanguages, prefetchLanguages, isTranslating, error]);
}

export default useLibreTranslate;

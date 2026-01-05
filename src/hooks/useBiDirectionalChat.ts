/**
 * useBiDirectionalChat - Production-ready React hook for 300+ language chat
 * 
 * Complete bi-directional real-time translation:
 * 
 * ✅ AUTO-DETECT: Source/target language detection
 * ✅ LATIN TYPING: Type in Latin based on mother tongue
 * ✅ LIVE PREVIEW: Real-time native script preview
 * ✅ SAME LANGUAGE: No translation, both see native script
 * ✅ SENDER VIEW: Immediate native script display
 * ✅ RECEIVER VIEW: Translated message in their language
 * ✅ BI-DIRECTIONAL: Both sides type Latin → see native
 * ✅ NON-BLOCKING: All operations in background
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  getLivePreview,
  processOutgoingMessage,
  processIncomingMessage,
  usersNeedTranslation,
  getTranslatorState,
  initializeTranslator,
  cleanupTranslator,
  isLanguageSupportedByTranslator,
  getSupportedLanguageCount,
  getLanguageDisplay,
  autoDetect,
  isTextLatin,
  ChatParticipant,
  BiDirectionalMessage,
  LiveTypingPreview,
  TranslatorState,
  TranslationCallbacks,
} from '@/lib/translation/dl-translate/production-bidirectional-translator';

// ============================================================================
// Types
// ============================================================================

export interface UseBiDirectionalChatOptions {
  /** Current user (sender) */
  currentUser: ChatParticipant;
  /** Chat partner (receiver) */
  chatPartner: ChatParticipant;
  /** Preload translation model on mount */
  preloadModel?: boolean;
  /** Debounce time for live preview (ms) */
  previewDebounceMs?: number;
  /** Called when translation completes */
  onTranslationComplete?: (messageId: string, translatedText: string) => void;
  /** Called on translation error */
  onTranslationError?: (messageId: string, error: Error) => void;
}

export interface UseBiDirectionalChatReturn {
  // Input handling
  inputText: string;
  setInputText: (text: string) => void;
  clearInput: () => void;
  
  // Live preview (real-time, non-blocking)
  livePreview: LiveTypingPreview;
  
  // Message processing
  sendMessage: (text?: string) => Promise<BiDirectionalMessage | null>;
  receiveMessage: (message: string, senderLanguage: string) => Promise<string>;
  
  // Translation info
  needsTranslation: boolean;
  detectedLanguage: string | null;
  
  // System status
  translatorStatus: TranslatorState;
  isReady: boolean;
  
  // Language utilities
  getSenderDisplayText: (message: BiDirectionalMessage) => string;
  getReceiverDisplayText: (message: BiDirectionalMessage) => string;
  isLanguageSupported: (language: string) => boolean;
  getLanguageName: (language: string) => string;
  supportedLanguageCount: number;
  
  // Cleanup
  cleanup: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBiDirectionalChat(
  options: UseBiDirectionalChatOptions
): UseBiDirectionalChatReturn {
  const {
    currentUser,
    chatPartner,
    preloadModel = true,
    previewDebounceMs = 30, // Very fast for real-time feel
    onTranslationComplete,
    onTranslationError,
  } = options;

  // ============ State ============
  const [inputText, setInputTextState] = useState('');
  const [livePreview, setLivePreview] = useState<LiveTypingPreview>({
    currentInput: '',
    nativePreview: '',
    isLatinInput: false,
    detectedLanguage: null,
    isProcessing: false,
    spellCorrected: false,
  });
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [translatorStatus, setTranslatorStatus] = useState<TranslatorState>({
    isReady: false,
    isInitializing: false,
    initProgress: 0,
    pendingTranslations: 0,
    activeTranslations: 0,
    supportedLanguages: 300,
  });

  // ============ Refs ============
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastInputRef = useRef('');
  const isMountedRef = useRef(true);

  // ============ Computed ============
  const needsTranslation = useMemo(
    () => usersNeedTranslation(currentUser.motherTongue, chatPartner.motherTongue),
    [currentUser.motherTongue, chatPartner.motherTongue]
  );

  // ============ Initialize Translator ============
  useEffect(() => {
    isMountedRef.current = true;

    if (preloadModel) {
      setTranslatorStatus(prev => ({ ...prev, isInitializing: true }));

      initializeTranslator((progress) => {
        if (isMountedRef.current) {
          setTranslatorStatus(prev => ({ ...prev, initProgress: progress }));
        }
      })
        .then((success) => {
          if (isMountedRef.current) {
            setTranslatorStatus({
              isReady: success,
              isInitializing: false,
              initProgress: success ? 100 : 0,
              pendingTranslations: 0,
              activeTranslations: 0,
              supportedLanguages: getSupportedLanguageCount(),
            });
          }
        })
        .catch((error) => {
          console.error('[useBiDirectionalChat] Init failed:', error);
          if (isMountedRef.current) {
            setTranslatorStatus(prev => ({
              ...prev,
              isInitializing: false,
              isReady: false,
            }));
          }
        });
    }

    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [preloadModel]);

  // ============ Update Status Periodically ============
  useEffect(() => {
    const updateStatus = () => {
      if (isMountedRef.current) {
        const state = getTranslatorState();
        setTranslatorStatus(prev => ({
          ...prev,
          pendingTranslations: state.pendingTranslations,
          activeTranslations: state.activeTranslations,
          isReady: state.isReady,
        }));
      }
    };

    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // ============ Input Handler with Live Preview ============
  const setInputText = useCallback((text: string) => {
    lastInputRef.current = text;
    setInputTextState(text);

    // Mark as processing
    setLivePreview(prev => ({
      ...prev,
      currentInput: text,
      isProcessing: true,
    }));

    // Debounce preview calculation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!isMountedRef.current || text !== lastInputRef.current) return;

      // Get live preview (this is INSTANT, non-blocking)
      const preview = getLivePreview(text, currentUser.motherTongue);
      
      setLivePreview(preview);
      setDetectedLanguage(preview.detectedLanguage);
    }, previewDebounceMs);
  }, [currentUser.motherTongue, previewDebounceMs]);

  // ============ Clear Input ============
  const clearInput = useCallback(() => {
    setInputTextState('');
    lastInputRef.current = '';
    setLivePreview({
      currentInput: '',
      nativePreview: '',
      isLatinInput: false,
      detectedLanguage: null,
      isProcessing: false,
      spellCorrected: false,
    });
    setDetectedLanguage(null);
  }, []);

  // ============ Send Message ============
  const sendMessage = useCallback(async (
    text?: string
  ): Promise<BiDirectionalMessage | null> => {
    const messageText = text ?? inputText;
    
    if (!messageText.trim()) {
      return null;
    }

    // Process message (sender view is IMMEDIATE)
    const callbacks: TranslationCallbacks = {
      onSenderViewReady: (msgId, senderText) => {
        // Sender's view is ready (immediate)
      },
      onReceiverViewReady: (msgId, receiverText) => {
        // Translation complete, notify parent
        onTranslationComplete?.(msgId, receiverText);
      },
      onTranslationError: (msgId, error) => {
        onTranslationError?.(msgId, error);
      },
    };

    const message = await processOutgoingMessage(
      messageText,
      currentUser,
      chatPartner,
      callbacks
    );

    // Clear input after sending
    clearInput();

    return message;
  }, [inputText, currentUser, chatPartner, clearInput, onTranslationComplete, onTranslationError]);

  // ============ Receive Message ============
  const receiveMessage = useCallback(async (
    message: string,
    senderLanguage: string
  ): Promise<string> => {
    return processIncomingMessage(message, senderLanguage, currentUser.motherTongue);
  }, [currentUser.motherTongue]);

  // ============ Display Text Helpers ============
  const getSenderDisplayText = useCallback((message: BiDirectionalMessage): string => {
    return message.senderDisplayText;
  }, []);

  const getReceiverDisplayText = useCallback((message: BiDirectionalMessage): string => {
    return message.receiverDisplayText;
  }, []);

  // ============ Language Utilities ============
  const isLanguageSupported = useCallback((language: string): boolean => {
    return isLanguageSupportedByTranslator(language);
  }, []);

  const getLanguageName = useCallback((language: string): string => {
    return getLanguageDisplay(language);
  }, []);

  // ============ Cleanup ============
  const cleanup = useCallback(() => {
    clearInput();
    cleanupTranslator();
  }, [clearInput]);

  // ============ Return ============
  return {
    // Input handling
    inputText,
    setInputText,
    clearInput,
    
    // Live preview
    livePreview,
    
    // Message processing
    sendMessage,
    receiveMessage,
    
    // Translation info
    needsTranslation,
    detectedLanguage,
    
    // System status
    translatorStatus,
    isReady: translatorStatus.isReady,
    
    // Language utilities
    getSenderDisplayText,
    getReceiverDisplayText,
    isLanguageSupported,
    getLanguageName,
    supportedLanguageCount: translatorStatus.supportedLanguages,
    
    // Cleanup
    cleanup,
  };
}

// Re-export types
export type {
  ChatParticipant,
  BiDirectionalMessage,
  LiveTypingPreview,
  TranslatorState,
};

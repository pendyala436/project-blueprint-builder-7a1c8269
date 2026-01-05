/**
 * useRealtimeChatTranslation - Production React Hook
 * 
 * Real-time bi-directional chat translation with:
 * - Auto language detection
 * - Live Latin → Native script preview
 * - Same language = native script only (no translation)
 * - Background translation (non-blocking typing)
 * - Optimized for scale
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  getLiveNativePreview,
  processOutgoingMessage,
  processIncomingMessage,
  autoDetectLanguage,
  needsTranslation as checkNeedsTranslation,
  preloadTranslationModel,
  getTranslatorStatus,
  cleanup,
  type ChatUser,
  type ProcessedMessage,
  type LivePreview,
} from './realtime-chat-translator';
import { isLatinScript } from './language-detector';

// ============================================================================
// Types
// ============================================================================

export interface UseRealtimeChatOptions {
  currentUser: ChatUser;
  partner: ChatUser;
  preloadModel?: boolean;
  debounceMs?: number;
}

export interface UseRealtimeChatReturn {
  // Input handling
  inputText: string;
  setInputText: (text: string) => void;
  livePreview: LivePreview;
  
  // Message processing
  sendMessage: () => Promise<ProcessedMessage | null>;
  processIncoming: (message: string, senderLang: string) => Promise<string>;
  
  // Status
  isModelLoading: boolean;
  modelLoadProgress: number;
  needsTranslation: boolean;
  translatorStatus: ReturnType<typeof getTranslatorStatus>;
  
  // Language detection
  detectedLanguage: string | null;
  isTypingLatin: boolean;
  
  // Cleanup
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRealtimeChatTranslation(
  options: UseRealtimeChatOptions
): UseRealtimeChatReturn {
  const { currentUser, partner, preloadModel = true, debounceMs = 100 } = options;

  // State
  const [inputText, setInputTextState] = useState('');
  const [livePreview, setLivePreview] = useState<LivePreview>({
    input: '',
    nativePreview: '',
    isProcessing: false,
  });
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  // Refs for debouncing
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastInputRef = useRef<string>('');

  // Memoized values
  const needsTranslation = useMemo(
    () => checkNeedsTranslation(currentUser.language, partner.language),
    [currentUser.language, partner.language]
  );

  const isTypingLatin = useMemo(
    () => inputText.length > 0 && isLatinScript(inputText),
    [inputText]
  );

  // Preload model on mount
  useEffect(() => {
    if (preloadModel) {
      setIsModelLoading(true);
      preloadTranslationModel((progress) => {
        setModelLoadProgress(progress);
      })
        .then(() => {
          setIsModelLoading(false);
          setModelLoadProgress(100);
        })
        .catch((error) => {
          console.error('[useRealtimeChatTranslation] Preload failed:', error);
          setIsModelLoading(false);
        });
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [preloadModel]);

  // Update input with live preview (debounced, non-blocking)
  const setInputText = useCallback(
    (text: string) => {
      lastInputRef.current = text;
      setInputTextState(text);

      // Immediate preview state update
      setLivePreview((prev) => ({
        ...prev,
        input: text,
        isProcessing: true,
      }));

      // Debounce the actual preview calculation
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (text === lastInputRef.current) {
          // Calculate native preview
          const nativePreview = getLiveNativePreview(text, currentUser.language);

          // Auto-detect language
          if (text.trim().length > 2) {
            const detection = autoDetectLanguage(text, currentUser.language);
            setDetectedLanguage(detection.language);
          }

          setLivePreview({
            input: text,
            nativePreview,
            isProcessing: false,
          });
        }
      }, debounceMs);
    },
    [currentUser.language, debounceMs]
  );

  // Send message
  const sendMessage = useCallback(async (): Promise<ProcessedMessage | null> => {
    const text = inputText.trim();
    if (!text) return null;

    // Clear input immediately (non-blocking UX)
    setInputTextState('');
    setLivePreview({ input: '', nativePreview: '', isProcessing: false });
    lastInputRef.current = '';

    try {
      const message = await processOutgoingMessage(
        text,
        currentUser,
        partner,
        (receiverText) => {
          // This callback fires when translation completes
          // You can emit an event or update state here if needed
          console.log('[useRealtimeChatTranslation] Receiver text ready:', receiverText);
        }
      );

      return message;
    } catch (error) {
      console.error('[useRealtimeChatTranslation] Send failed:', error);
      return null;
    }
  }, [inputText, currentUser, partner]);

  // Process incoming message
  const processIncoming = useCallback(
    async (message: string, senderLang: string): Promise<string> => {
      return processIncomingMessage(message, senderLang, currentUser.language);
    },
    [currentUser.language]
  );

  // Get translator status
  const translatorStatus = useMemo(() => getTranslatorStatus(), []);

  // Reset hook state
  const reset = useCallback(() => {
    setInputTextState('');
    setLivePreview({ input: '', nativePreview: '', isProcessing: false });
    setDetectedLanguage(null);
    lastInputRef.current = '';
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  return {
    // Input handling
    inputText,
    setInputText,
    livePreview,

    // Message processing
    sendMessage,
    processIncoming,

    // Status
    isModelLoading,
    modelLoadProgress,
    needsTranslation,
    translatorStatus,

    // Language detection
    detectedLanguage,
    isTypingLatin,

    // Cleanup
    reset,
  };
}

// ============================================================================
// Export cleanup utility
// ============================================================================

export { cleanup as cleanupTranslator } from './realtime-chat-translator';
export type { ChatUser, ProcessedMessage, LivePreview } from './realtime-chat-translator';

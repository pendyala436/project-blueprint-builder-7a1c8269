/**
 * useProductionChatTranslation - Production-ready hook for real-time chat translation
 * ULTRA-FAST: Sub-2ms response with aggressive caching and ICU transliteration
 * 
 * This hook provides:
 * 1. Auto-detect source and target language (300+ languages)
 * 2. Latin typing → Live native script preview (ICU, non-blocking, <2ms)
 * 3. Spell correction for typing errors
 * 4. Same language = no translation, both see native script
 * 5. Sender sees native text immediately on their screen
 * 6. Receiver sees translated text in their native language
 * 7. Bi-directional: Both sides type Latin, see native
 * 8. Non-blocking: All translation runs in background
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  getLivePreview,
  processOutgoingMessage as processOutgoingFn,
  processIncomingMessage as processIncomingFn,
  usersNeedTranslation,
  getTranslatorState,
  initializeTranslator,
  cleanupTranslator,
  type ChatParticipant,
  type BiDirectionalMessage,
  type LiveTypingPreview,
} from '@/lib/translation/dl-translate/production-bidirectional-translator';
import { isLatinScript, isSameLanguage, detectLanguage } from '@/lib/translation/dl-translate/language-detector';
import { resolveLangCode, normalizeLanguageInput } from '@/lib/translation/dl-translate/utils';

// ============================================================================
// Types
// ============================================================================

export interface ChatUser {
  id: string;
  language: string; // Mother tongue (e.g., 'hindi', 'telugu', 'english')
  languageCode?: string; // NLLB code (e.g., 'hin_Deva', 'tel_Telu')
}

export interface TranslatedMessage {
  id: string;
  originalInput: string;           // What user typed (Latin or native)
  senderNativeText: string;        // Text in sender's native script
  receiverNativeText: string;      // Text for receiver (translated if needed)
  isTranslated: boolean;           // Was translation performed
  detectedSourceLang: string;      // Auto-detected input language
  senderLang: string;              // Sender's mother tongue
  receiverLang: string;            // Receiver's mother tongue
  timestamp: number;
  translationStatus: 'pending' | 'complete' | 'failed';
}

export interface LivePreviewState {
  inputText: string;               // Current input
  nativePreview: string;           // Native script preview
  isProcessing: boolean;           // Preview calculation in progress
  isLatinInput: boolean;           // Input is Latin script
  spellCorrected: boolean;         // Was spell correction applied
}

export interface TranslatorStatus {
  isModelLoaded: boolean;
  isModelLoading: boolean;
  loadProgress: number;
  pendingTranslations: number;
  activeTranslations: number;
}

export interface UseProductionChatTranslationOptions {
  sender: ChatUser;
  receiver: ChatUser;
  preloadModel?: boolean;
  previewDebounceMs?: number;
  onTranslationComplete?: (messageId: string, translatedText: string) => void;
  onTranslationError?: (messageId: string, error: Error) => void;
}

export interface UseProductionChatTranslationReturn {
  // Input state
  inputText: string;
  setInputText: (text: string) => void;
  clearInput: () => void;
  
  // Live preview (sub-2ms)
  livePreview: LivePreviewState;
  updateLivePreview: (text: string) => LiveTypingPreview;
  clearLivePreview: () => void;
  
  // Message processing
  processMessage: (input: string) => Promise<TranslatedMessage>;
  processOutgoingMessage: (input: string) => Promise<{ nativeText: string; originalLatin: string; senderNativeText: string }>;
  processIncomingMessage: (message: string, senderLang: string) => Promise<string>;
  translateForReceiver: (senderText: string) => Promise<string>;
  
  // Translation state
  needsTranslation: boolean;
  detectedLanguage: string | null;
  
  // Utilities
  isLatinScript: (text: string) => boolean;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  
  // Status
  status: TranslatorStatus;
  
  // Cleanup
  cleanup: () => void;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useProductionChatTranslation(
  options: UseProductionChatTranslationOptions
): UseProductionChatTranslationReturn {
  const {
    sender,
    receiver,
    preloadModel = true,
    previewDebounceMs = 16, // ~60fps for instant feedback
    onTranslationComplete,
    onTranslationError,
  } = options;

  // ============ State ============
  const [inputText, setInputTextState] = useState('');
  const [livePreview, setLivePreview] = useState<LivePreviewState>({
    inputText: '',
    nativePreview: '',
    isProcessing: false,
    isLatinInput: false,
    spellCorrected: false,
  });
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState({
    isLoaded: false,
    isLoading: false,
    loadProgress: 0,
  });

  // ============ Refs ============
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInputRef = useRef('');
  const pendingTranslationsRef = useRef<Map<string, TranslatedMessage>>(new Map());

  // ============ Memoized Values ============
  const needsTranslation = useMemo(
    () => usersNeedTranslation(sender.language, receiver.language),
    [sender.language, receiver.language]
  );

  // ============ Model Preloading ============
  useEffect(() => {
    if (!preloadModel) return;

    setModelStatus(prev => ({ ...prev, isLoading: true }));

    initializeTranslator((progress) => {
      setModelStatus(prev => ({ ...prev, loadProgress: progress }));
    })
      .then((loaded) => {
        setModelStatus({ isLoaded: loaded, isLoading: false, loadProgress: 100 });
      })
      .catch((error) => {
        console.error('[useProductionChatTranslation] Model preload failed:', error);
        setModelStatus({ isLoaded: false, isLoading: false, loadProgress: 0 });
      });

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [preloadModel]);

  // ============ ULTRA-FAST Live Preview (Sub-2ms) ============
  const updateLivePreview = useCallback((text: string): LiveTypingPreview => {
    // Direct call to optimized getLivePreview - cached, sub-2ms
    return getLivePreview(text, sender.language);
  }, [sender.language]);

  // ============ Clear Live Preview ============
  const clearLivePreview = useCallback(() => {
    setLivePreview({
      inputText: '',
      nativePreview: '',
      isProcessing: false,
      isLatinInput: false,
      spellCorrected: false,
    });
    setDetectedLanguage(null);
  }, []);

  // ============ Input Handler with Live Preview ============
  const setInputText = useCallback((text: string) => {
    lastInputRef.current = text;
    setInputTextState(text);

    // INSTANT preview update (sub-2ms with caching)
    const preview = getLivePreview(text, sender.language);
    
    setLivePreview({
      inputText: text,
      nativePreview: preview.nativePreview,
      isProcessing: false,
      isLatinInput: preview.isLatinInput,
      spellCorrected: preview.spellCorrected,
    });

    // Update detected language
    if (preview.detectedLanguage) {
      setDetectedLanguage(preview.detectedLanguage);
    }
  }, [sender.language]);

  // ============ Clear Input ============
  const clearInput = useCallback(() => {
    setInputTextState('');
    lastInputRef.current = '';
    clearLivePreview();
  }, [clearLivePreview]);

  // ============ Process Outgoing Message (Sender Side) ============
  const processOutgoingMessage = useCallback(async (input: string): Promise<{ 
    nativeText: string; 
    originalLatin: string; 
    senderNativeText: string 
  }> => {
    const senderParticipant: ChatParticipant = {
      id: sender.id,
      motherTongue: sender.language,
    };
    const receiverParticipant: ChatParticipant = {
      id: receiver.id,
      motherTongue: receiver.language,
    };

    const message = await processOutgoingFn(
      input,
      senderParticipant,
      receiverParticipant,
      {
        onReceiverViewReady: (messageId, translatedText) => {
          onTranslationComplete?.(messageId, translatedText);
        },
        onTranslationError: (messageId, error) => {
          onTranslationError?.(messageId, error);
        },
      }
    );

    return {
      nativeText: message.senderNativeText,
      originalLatin: message.originalInput,
      senderNativeText: message.senderNativeText,
    };
  }, [sender, receiver, onTranslationComplete, onTranslationError]);

  // ============ Process Full Message ============
  const processMessage = useCallback(async (input: string): Promise<TranslatedMessage> => {
    const senderParticipant: ChatParticipant = {
      id: sender.id,
      motherTongue: sender.language,
    };
    const receiverParticipant: ChatParticipant = {
      id: receiver.id,
      motherTongue: receiver.language,
    };

    const message = await processOutgoingFn(
      input,
      senderParticipant,
      receiverParticipant,
      {
        onReceiverViewReady: (messageId, translatedText) => {
          // Update pending translation
          const pending = pendingTranslationsRef.current.get(messageId);
          if (pending) {
            pending.receiverNativeText = translatedText;
            pending.translationStatus = 'complete';
          }
          onTranslationComplete?.(messageId, translatedText);
        },
        onTranslationError: (messageId, error) => {
          const pending = pendingTranslationsRef.current.get(messageId);
          if (pending) {
            pending.translationStatus = 'failed';
          }
          onTranslationError?.(messageId, error);
        },
      }
    );

    const result: TranslatedMessage = {
      id: message.id,
      originalInput: message.originalInput,
      senderNativeText: message.senderNativeText,
      receiverNativeText: message.receiverNativeText,
      isTranslated: message.needsTranslation,
      detectedSourceLang: message.detectedLanguage,
      senderLang: sender.language,
      receiverLang: receiver.language,
      timestamp: message.timestamp,
      translationStatus: message.translationStatus === 'not_needed' ? 'complete' : 
                        message.translationStatus === 'pending' ? 'pending' : 
                        message.translationStatus === 'complete' ? 'complete' : 'failed',
    };

    // Store for tracking
    pendingTranslationsRef.current.set(message.id, result);

    return result;
  }, [sender, receiver, onTranslationComplete, onTranslationError]);

  // ============ Process Incoming Message (Receiver Side) ============
  const processIncomingMessage = useCallback(async (
    messageText: string,
    senderLang: string
  ): Promise<string> => {
    return processIncomingFn(messageText, senderLang, receiver.language);
  }, [receiver.language]);

  // ============ Translate for Receiver ============
  const translateForReceiver = useCallback(async (senderText: string): Promise<string> => {
    if (!needsTranslation) {
      return senderText;
    }
    return processIncomingFn(senderText, sender.language, receiver.language);
  }, [sender.language, receiver.language, needsTranslation]);

  // ============ Get Current Status ============
  const status = useMemo((): TranslatorStatus => {
    const state = getTranslatorState();
    return {
      isModelLoaded: state.isReady,
      isModelLoading: state.isInitializing,
      loadProgress: state.initProgress,
      pendingTranslations: state.pendingTranslations,
      activeTranslations: state.activeTranslations,
    };
  }, [modelStatus]);

  // ============ Cleanup ============
  const cleanup = useCallback(() => {
    clearInput();
    pendingTranslationsRef.current.clear();
    cleanupTranslator();
  }, [clearInput]);

  // ============ Return ============
  return {
    // Input state
    inputText,
    setInputText,
    clearInput,
    
    // Live preview (sub-2ms)
    livePreview,
    updateLivePreview,
    clearLivePreview,
    
    // Message processing
    processMessage,
    processOutgoingMessage,
    processIncomingMessage,
    translateForReceiver,
    
    // Translation state
    needsTranslation,
    detectedLanguage,
    
    // Utilities
    isLatinScript,
    isSameLanguage,
    
    // Status
    status,
    
    // Cleanup
    cleanup,
  };
}

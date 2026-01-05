/**
 * useProductionChatTranslation - Production-ready hook for real-time chat translation
 * 
 * This hook provides:
 * 1. Auto-detect source and target language
 * 2. Latin typing → Live native script preview (non-blocking)
 * 3. Same language = no translation, both see native script
 * 4. Sender sees native text immediately on their screen
 * 5. Receiver sees translated text in their native language
 * 6. Bi-directional: Both sides type Latin, see native
 * 7. Non-blocking: All translation runs in background
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { detectLanguage, isLatinScript, isSameLanguage } from '@/lib/translation/dl-translate/language-detector';
import { transliterate, isTransliterationSupported, getLanguageDisplayName } from '@/lib/translation/dl-translate/transliteration';
import { resolveLangCode, normalizeLanguageInput } from '@/lib/translation/dl-translate/utils';
import { 
  initWorkerTranslator, 
  isWorkerReady, 
  queueTranslation, 
  getQueueStats,
  cleanupWorker 
} from '@/lib/translation/dl-translate/translation-worker';

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
  
  // Live preview
  livePreview: LivePreviewState;
  
  // Message processing
  processMessage: (input: string) => Promise<TranslatedMessage>;
  processIncomingMessage: (message: string, senderLang: string) => Promise<string>;
  
  // Translation state
  needsTranslation: boolean;
  detectedLanguage: string | null;
  
  // Status
  status: TranslatorStatus;
  
  // Utilities
  getSenderDisplayText: (message: TranslatedMessage) => string;
  getReceiverDisplayText: (message: TranslatedMessage) => string;
  
  // Cleanup
  cleanup: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getNativePreview(text: string, language: string): string {
  if (!text || !text.trim()) return '';
  
  // If already native script, return as-is
  if (!isLatinScript(text)) return text;
  
  const langCode = resolveLangCode(normalizeLanguageInput(language), 'nllb200');
  
  if (isTransliterationSupported(langCode)) {
    return transliterate(text, langCode);
  }
  
  return text;
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
    previewDebounceMs = 50,
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
    () => !isSameLanguage(sender.language, receiver.language),
    [sender.language, receiver.language]
  );

  const senderLangCode = useMemo(
    () => resolveLangCode(normalizeLanguageInput(sender.language), 'nllb200'),
    [sender.language]
  );

  const receiverLangCode = useMemo(
    () => resolveLangCode(normalizeLanguageInput(receiver.language), 'nllb200'),
    [receiver.language]
  );

  // ============ Model Preloading ============
  useEffect(() => {
    if (!preloadModel) return;

    setModelStatus(prev => ({ ...prev, isLoading: true }));

    initWorkerTranslator(undefined, (progress) => {
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

  // ============ Input Handler with Live Preview ============
  const setInputText = useCallback((text: string) => {
    lastInputRef.current = text;
    setInputTextState(text);

    // Start preview processing indicator
    setLivePreview(prev => ({
      ...prev,
      inputText: text,
      isProcessing: true,
      isLatinInput: isLatinScript(text),
    }));

    // Debounce the preview calculation (non-blocking)
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Only process if text hasn't changed
      if (text !== lastInputRef.current) return;

      // Calculate native preview
      const nativePreview = getNativePreview(text, sender.language);

      // Auto-detect language (for longer inputs)
      if (text.trim().length > 2) {
        const detection = detectLanguage(text, sender.language);
        setDetectedLanguage(detection.language);
      } else {
        setDetectedLanguage(null);
      }

      setLivePreview({
        inputText: text,
        nativePreview,
        isProcessing: false,
        isLatinInput: isLatinScript(text),
      });
    }, previewDebounceMs);
  }, [sender.language, previewDebounceMs]);

  // ============ Clear Input ============
  const clearInput = useCallback(() => {
    setInputTextState('');
    lastInputRef.current = '';
    setLivePreview({
      inputText: '',
      nativePreview: '',
      isProcessing: false,
      isLatinInput: false,
    });
    setDetectedLanguage(null);
  }, []);

  // ============ Process Outgoing Message ============
  const processMessage = useCallback(async (input: string): Promise<TranslatedMessage> => {
    const messageId = generateMessageId();
    const timestamp = Date.now();
    const trimmedInput = input.trim();

    // Detect input language and script
    const detection = detectLanguage(trimmedInput, sender.language);

    // Get sender's native text
    let senderNativeText = trimmedInput;
    if (detection.isLatinScript && isTransliterationSupported(senderLangCode)) {
      senderNativeText = transliterate(trimmedInput, senderLangCode);
    }

    // Create message object
    const message: TranslatedMessage = {
      id: messageId,
      originalInput: trimmedInput,
      senderNativeText,
      receiverNativeText: senderNativeText, // Initial placeholder
      isTranslated: needsTranslation,
      detectedSourceLang: detection.language,
      senderLang: sender.language,
      receiverLang: receiver.language,
      timestamp,
      translationStatus: needsTranslation ? 'pending' : 'complete',
    };

    // If same language, no translation needed
    if (!needsTranslation) {
      // Transliterate to receiver's script if needed
      if (detection.isLatinScript && isTransliterationSupported(receiverLangCode)) {
        message.receiverNativeText = transliterate(trimmedInput, receiverLangCode);
      }
      return message;
    }

    // Store pending translation
    pendingTranslationsRef.current.set(messageId, message);

    // Queue translation in background (non-blocking)
    // This happens after returning, so sender's view is instant
    translateInBackground(
      senderNativeText,
      sender.language,
      receiver.language,
      messageId
    );

    return message;
  }, [sender.language, receiver.language, senderLangCode, receiverLangCode, needsTranslation]);

  // ============ Background Translation ============
  const translateInBackground = useCallback(async (
    text: string,
    sourceLang: string,
    targetLang: string,
    messageId: string
  ) => {
    try {
      // Ensure worker is ready
      if (!isWorkerReady()) {
        await initWorkerTranslator();
      }

      // Queue translation with high priority for chat messages
      const translatedText = await queueTranslation(text, sourceLang, targetLang, 10);

      // Update message in pending map
      const message = pendingTranslationsRef.current.get(messageId);
      if (message) {
        message.receiverNativeText = translatedText;
        message.translationStatus = 'complete';
      }

      // Notify completion
      onTranslationComplete?.(messageId, translatedText);

    } catch (error) {
      console.error('[useProductionChatTranslation] Translation failed:', error);

      // Update status
      const message = pendingTranslationsRef.current.get(messageId);
      if (message) {
        message.translationStatus = 'failed';
      }

      // Notify error
      onTranslationError?.(messageId, error instanceof Error ? error : new Error('Translation failed'));
    }
  }, [onTranslationComplete, onTranslationError]);

  // ============ Process Incoming Message (Receiver Side) ============
  const processIncomingMessage = useCallback(async (
    messageText: string,
    senderLang: string
  ): Promise<string> => {
    // If same language, return as-is
    if (isSameLanguage(senderLang, receiver.language)) {
      return messageText;
    }

    try {
      if (!isWorkerReady()) {
        await initWorkerTranslator();
      }
      
      const translated = await queueTranslation(messageText, senderLang, receiver.language, 5);
      return translated;
    } catch (error) {
      console.error('[useProductionChatTranslation] Incoming translation failed:', error);
      return messageText; // Fallback to original
    }
  }, [receiver.language]);

  // ============ Display Text Helpers ============
  const getSenderDisplayText = useCallback((message: TranslatedMessage): string => {
    return message.senderNativeText;
  }, []);

  const getReceiverDisplayText = useCallback((message: TranslatedMessage): string => {
    return message.receiverNativeText;
  }, []);

  // ============ Get Current Status ============
  const status = useMemo((): TranslatorStatus => {
    const queueStats = getQueueStats();
    return {
      isModelLoaded: modelStatus.isLoaded,
      isModelLoading: modelStatus.isLoading,
      loadProgress: modelStatus.loadProgress,
      pendingTranslations: queueStats.pending,
      activeTranslations: queueStats.active,
    };
  }, [modelStatus]);

  // ============ Cleanup ============
  const cleanup = useCallback(() => {
    clearInput();
    pendingTranslationsRef.current.clear();
    cleanupWorker();
  }, [clearInput]);

  // ============ Return ============
  return {
    // Input state
    inputText,
    setInputText,
    clearInput,
    
    // Live preview
    livePreview,
    
    // Message processing
    processMessage,
    processIncomingMessage,
    
    // Translation state
    needsTranslation,
    detectedLanguage,
    
    // Status
    status,
    
    // Utilities
    getSenderDisplayText,
    getReceiverDisplayText,
    
    // Cleanup
    cleanup,
  };
}

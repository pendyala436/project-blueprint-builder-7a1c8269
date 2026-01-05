/**
 * useDLTranslate - React Hook for DL-Translate
 * 
 * Provides real-time translation and transliteration for chat
 * with auto-detection, live preview, and non-blocking updates.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  initializeTranslator,
  isTranslatorLoaded,
  isTranslatorLoading,
  getLoadingProgress,
  translate,
  translateForChat,
  getTransliterationPreview,
  detectLanguage,
  isSameLanguage,
  unloadTranslator,
  type TranslationResult,
  type ProgressCallback,
} from './index';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string;
  senderId: string;
  originalText: string;           // Original text as typed
  senderNativeText: string;       // Text in sender's native script
  receiverNativeText: string;     // Text translated to receiver's language
  originalLatin?: string;         // Latin input if phonetic
  isTranslated: boolean;
  timestamp: Date;
}

export interface LivePreviewState {
  latinInput: string;
  nativePreview: string;
  isConverting: boolean;
}

export interface UseDLTranslateOptions {
  currentUserLanguage: string;
  partnerLanguage: string;
  autoLoad?: boolean;
  debounceMs?: number;
}

export interface UseDLTranslateReturn {
  // Model state
  isLoaded: boolean;
  isLoading: boolean;
  loadProgress: number;
  loadModel: (onProgress?: ProgressCallback) => Promise<boolean>;
  unloadModel: () => void;
  
  // Live preview (for typing)
  livePreview: LivePreviewState;
  updateLivePreview: (text: string) => void;
  clearLivePreview: () => void;
  
  // Translation
  translateMessage: (text: string) => Promise<{
    senderNativeText: string;
    receiverNativeText: string;
    originalLatin: string;
    isTranslated: boolean;
  }>;
  
  // Receive translation
  translateIncoming: (
    text: string,
    senderLanguage: string
  ) => Promise<string>;
  
  // Utilities
  detectInputLanguage: (text: string) => ReturnType<typeof detectLanguage>;
  isSameAsPartner: (language: string) => boolean;
  needsTranslation: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDLTranslate(options: UseDLTranslateOptions): UseDLTranslateReturn {
  const {
    currentUserLanguage,
    partnerLanguage,
    autoLoad = false,
    debounceMs = 150,
  } = options;
  
  // State
  const [isLoaded, setIsLoaded] = useState(isTranslatorLoaded());
  const [isLoading, setIsLoading] = useState(isTranslatorLoading());
  const [loadProgress, setLoadProgress] = useState(getLoadingProgress());
  const [livePreview, setLivePreview] = useState<LivePreviewState>({
    latinInput: '',
    nativePreview: '',
    isConverting: false,
  });
  
  // Refs for debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInputRef = useRef<string>('');
  
  // Check if translation is needed
  const needsTranslation = useMemo(() => {
    return !isSameLanguage(currentUserLanguage, partnerLanguage);
  }, [currentUserLanguage, partnerLanguage]);
  
  // Load model
  const loadModel = useCallback(async (onProgress?: ProgressCallback): Promise<boolean> => {
    if (isTranslatorLoaded()) {
      setIsLoaded(true);
      return true;
    }
    
    setIsLoading(true);
    setLoadProgress(0);
    
    const success = await initializeTranslator(
      'Xenova/nllb-200-distilled-600M',
      (progress) => {
        if (progress.progress !== undefined) {
          setLoadProgress(progress.progress);
        }
        onProgress?.(progress);
      }
    );
    
    setIsLoaded(success);
    setIsLoading(false);
    setLoadProgress(success ? 100 : 0);
    
    return success;
  }, []);
  
  // Unload model
  const unloadModel = useCallback(() => {
    unloadTranslator();
    setIsLoaded(false);
    setLoadProgress(0);
  }, []);
  
  // Update live preview (debounced, non-blocking)
  const updateLivePreview = useCallback((text: string) => {
    lastInputRef.current = text;
    
    // Immediate update for responsiveness
    setLivePreview(prev => ({
      ...prev,
      latinInput: text,
      isConverting: true,
    }));
    
    // Debounce the actual transliteration
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (text === lastInputRef.current) {
        const preview = getTransliterationPreview(text, currentUserLanguage);
        setLivePreview({
          latinInput: text,
          nativePreview: preview,
          isConverting: false,
        });
      }
    }, debounceMs);
  }, [currentUserLanguage, debounceMs]);
  
  // Clear live preview
  const clearLivePreview = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    lastInputRef.current = '';
    setLivePreview({
      latinInput: '',
      nativePreview: '',
      isConverting: false,
    });
  }, []);
  
  // Translate outgoing message
  const translateMessage = useCallback(async (text: string) => {
    // Ensure model is loaded
    if (!isLoaded) {
      await loadModel();
    }
    
    return translateForChat(text, currentUserLanguage, partnerLanguage);
  }, [isLoaded, loadModel, currentUserLanguage, partnerLanguage]);
  
  // Translate incoming message
  const translateIncoming = useCallback(async (
    text: string,
    senderLanguage: string
  ): Promise<string> => {
    // Ensure model is loaded
    if (!isLoaded) {
      await loadModel();
    }
    
    // If same language, no translation needed
    if (isSameLanguage(senderLanguage, currentUserLanguage)) {
      return text;
    }
    
    try {
      const result = await translate(text, senderLanguage, currentUserLanguage) as TranslationResult;
      return result.translatedText;
    } catch (error) {
      console.error('Failed to translate incoming message:', error);
      return text;
    }
  }, [isLoaded, loadModel, currentUserLanguage]);
  
  // Detect input language
  const detectInputLanguage = useCallback((text: string) => {
    return detectLanguage(text, currentUserLanguage);
  }, [currentUserLanguage]);
  
  // Check if language is same as partner
  const isSameAsPartner = useCallback((language: string) => {
    return isSameLanguage(language, partnerLanguage);
  }, [partnerLanguage]);
  
  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && !isLoaded && !isLoading) {
      loadModel();
    }
  }, [autoLoad, isLoaded, isLoading, loadModel]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    // Model state
    isLoaded,
    isLoading,
    loadProgress,
    loadModel,
    unloadModel,
    
    // Live preview
    livePreview,
    updateLivePreview,
    clearLivePreview,
    
    // Translation
    translateMessage,
    translateIncoming,
    
    // Utilities
    detectInputLanguage,
    isSameAsPartner,
    needsTranslation,
  };
}

// ============================================================================
// Simplified Hook for Quick Translation
// ============================================================================

export interface UseQuickTranslateOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  autoLoad?: boolean;
}

export function useQuickTranslate(options: UseQuickTranslateOptions) {
  const { sourceLanguage, targetLanguage, autoLoad = true } = options;
  
  const [isReady, setIsReady] = useState(isTranslatorLoaded());
  const [isLoading, setIsLoading] = useState(false);
  
  // Load model on mount
  useEffect(() => {
    if (autoLoad && !isReady) {
      setIsLoading(true);
      initializeTranslator().then(success => {
        setIsReady(success);
        setIsLoading(false);
      });
    }
  }, [autoLoad, isReady]);
  
  // Translate function
  const translateText = useCallback(async (text: string): Promise<string> => {
    if (!isReady) {
      const loaded = await initializeTranslator();
      if (!loaded) return text;
      setIsReady(true);
    }
    
    try {
      const result = await translate(
        text,
        sourceLanguage || 'auto',
        targetLanguage,
        { autoDetect: !sourceLanguage }
      ) as TranslationResult;
      
      return result.translatedText;
    } catch (error) {
      console.error('Quick translate error:', error);
      return text;
    }
  }, [isReady, sourceLanguage, targetLanguage]);
  
  // Get preview (transliteration)
  const getPreview = useCallback((text: string): string => {
    return getTransliterationPreview(text, targetLanguage);
  }, [targetLanguage]);
  
  return {
    isReady,
    isLoading,
    translateText,
    getPreview,
    detectLanguage: (text: string) => detectLanguage(text, sourceLanguage),
  };
}

export default useDLTranslate;

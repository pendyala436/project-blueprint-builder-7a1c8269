/**
 * React Hook for Bidirectional Chat Translation
 * ==============================================
 * 
 * Provides meaning-based bidirectional translation for chat applications.
 * Works with user profiles to automatically determine translation direction.
 * 
 * OFFLINE ONLY - NO EXTERNAL APIs - NO NLLB-200
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  processMessage,
  generateLivePreview,
  getInstantNativePreview,
  extractMeaning,
  detectInputType,
  needsTranslation,
  type MeaningBasedMessage,
  type LivePreviewResult,
  type InputType,
  initializeEngine,
  isEngineReady,
  normalizeLanguage,
  isSameLanguage,
} from '@/lib/translation/meaning-based-chat';
import { type UserLanguageProfile } from '@/lib/offline-translation/types';

// ============================================================
// TYPES
// ============================================================

export interface UseBidirectionalChatOptions {
  senderProfile: UserLanguageProfile;
  receiverProfile: UserLanguageProfile;
  enableLivePreview?: boolean;
  previewDebounceMs?: number;
}

export interface UseBidirectionalChatReturn {
  // Message processing
  sendMessage: (text: string) => Promise<MeaningBasedMessage>;
  processIncoming: (text: string, fromLanguage: string) => Promise<MeaningBasedMessage>;
  
  // Live preview
  preview: LivePreviewResult | null;
  instantPreview: string;
  updatePreview: (text: string) => void;
  
  // Input handling
  detectInputType: (text: string) => InputType;
  
  // State
  isReady: boolean;
  isProcessing: boolean;
  error: string | null;
  
  // Configuration
  sameLanguage: boolean;
  senderLanguage: string;
  receiverLanguage: string;
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useBidirectionalChat(
  options: UseBidirectionalChatOptions
): UseBidirectionalChatReturn {
  const {
    senderProfile,
    receiverProfile,
    enableLivePreview = true,
    previewDebounceMs = 150,
  } = options;
  
  // State
  const [isReady, setIsReady] = useState(isEngineReady());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LivePreviewResult | null>(null);
  const [instantPreview, setInstantPreview] = useState('');
  
  // Refs
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Derived values
  const senderLanguage = useMemo(
    () => normalizeLanguage(senderProfile.motherTongue),
    [senderProfile.motherTongue]
  );
  const receiverLanguage = useMemo(
    () => normalizeLanguage(receiverProfile.motherTongue),
    [receiverProfile.motherTongue]
  );
  const sameLanguage = useMemo(
    () => isSameLanguage(senderLanguage, receiverLanguage),
    [senderLanguage, receiverLanguage]
  );
  
  // Initialize engine
  useEffect(() => {
    if (!isReady) {
      initializeEngine()
        .then(() => setIsReady(true))
        .catch((err) => setError(err.message));
    }
  }, [isReady]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);
  
  // Send message
  const sendMessage = useCallback(async (text: string): Promise<MeaningBasedMessage> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const message = await processMessage(text, senderProfile, receiverProfile);
      return message;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process message';
      setError(errorMsg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [senderProfile, receiverProfile]);
  
  // Process incoming message
  const processIncoming = useCallback(async (
    text: string,
    fromLanguage: string
  ): Promise<MeaningBasedMessage> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Create a temporary profile for the incoming sender
      const incomingProfile: UserLanguageProfile = {
        userId: 'incoming',
        gender: 'male',
        motherTongue: fromLanguage,
        scriptType: 'native',
      };
      
      const message = await processMessage(text, incomingProfile, senderProfile);
      return message;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process message';
      setError(errorMsg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [senderProfile]);
  
  // Update preview
  const updatePreview = useCallback((text: string) => {
    if (!enableLivePreview) return;
    
    // Instant native preview (synchronous)
    if (text.trim()) {
      setInstantPreview(getInstantNativePreview(text, senderLanguage));
    } else {
      setInstantPreview('');
      setPreview(null);
      return;
    }
    
    // Debounced full preview
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    previewTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await generateLivePreview(text, senderLanguage, receiverLanguage);
        setPreview(result);
      } catch (err) {
        console.error('[useBidirectionalChat] Preview error:', err);
      }
    }, previewDebounceMs);
  }, [enableLivePreview, senderLanguage, receiverLanguage, previewDebounceMs]);
  
  // Detect input type wrapper
  const detectType = useCallback((text: string): InputType => {
    return detectInputType(text, senderLanguage);
  }, [senderLanguage]);
  
  return {
    sendMessage,
    processIncoming,
    preview,
    instantPreview,
    updatePreview,
    detectInputType: detectType,
    isReady,
    isProcessing,
    error,
    sameLanguage,
    senderLanguage,
    receiverLanguage,
  };
}

// ============================================================
// SIMPLIFIED HOOK FOR QUICK USE
// ============================================================

export interface UseQuickTranslateOptions {
  myLanguage: string;
  partnerLanguage: string;
}

export function useQuickTranslate(options: UseQuickTranslateOptions) {
  const senderProfile: UserLanguageProfile = useMemo(() => ({
    userId: 'me',
    gender: 'male',
    motherTongue: options.myLanguage,
    scriptType: 'native',
  }), [options.myLanguage]);
  
  const receiverProfile: UserLanguageProfile = useMemo(() => ({
    userId: 'partner',
    gender: 'female',
    motherTongue: options.partnerLanguage,
    scriptType: 'native',
  }), [options.partnerLanguage]);
  
  return useBidirectionalChat({
    senderProfile,
    receiverProfile,
  });
}

// ============================================================
// EXPORTS
// ============================================================

export type {
  MeaningBasedMessage,
  LivePreviewResult,
  InputType,
  UserLanguageProfile,
};

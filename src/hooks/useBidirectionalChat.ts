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
  /** Current user's profile (they are the sender when typing) */
  myProfile: UserLanguageProfile;
  /** Partner's profile (they receive messages from current user) */
  partnerProfile: UserLanguageProfile;
  enableLivePreview?: boolean;
  previewDebounceMs?: number;
}

export interface UseBidirectionalChatReturn {
  // Message processing
  /** Send a message as the current user */
  sendMessage: (text: string) => Promise<MeaningBasedMessage>;
  /** Process a message received from partner */
  processIncoming: (text: string) => Promise<MeaningBasedMessage>;
  
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
  myLanguage: string;
  partnerLanguage: string;
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useBidirectionalChat(
  options: UseBidirectionalChatOptions
): UseBidirectionalChatReturn {
  const {
    myProfile,
    partnerProfile,
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
  
  // Derived values - symmetric naming
  const myLanguage = useMemo(
    () => normalizeLanguage(myProfile.motherTongue),
    [myProfile.motherTongue]
  );
  const partnerLanguage = useMemo(
    () => normalizeLanguage(partnerProfile.motherTongue),
    [partnerProfile.motherTongue]
  );
  const sameLanguage = useMemo(
    () => isSameLanguage(myLanguage, partnerLanguage),
    [myLanguage, partnerLanguage]
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
  
  /**
   * Send a message as the current user (I am sender, partner is receiver)
   * Message will be processed for display in both my language and partner's language
   */
  const sendMessage = useCallback(async (text: string): Promise<MeaningBasedMessage> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // I am the sender, partner is the receiver
      const message = await processMessage(text, myProfile, partnerProfile);
      return message;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process message';
      setError(errorMsg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [myProfile, partnerProfile]);
  
  /**
   * Process an incoming message from the partner
   * Partner is the sender, I am the receiver
   * This is the REVERSE direction of sendMessage - fully symmetric
   */
  const processIncoming = useCallback(async (text: string): Promise<MeaningBasedMessage> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Partner is the sender, I am the receiver - REVERSED roles
      const message = await processMessage(text, partnerProfile, myProfile);
      return message;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process message';
      setError(errorMsg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [partnerProfile, myProfile]);
  
  /**
   * Update live preview as user types
   * Preview shown in MY mother tongue (sender's perspective)
   */
  const updatePreview = useCallback((text: string) => {
    if (!enableLivePreview) return;
    
    // Instant native preview (synchronous) - in my language
    if (text.trim()) {
      setInstantPreview(getInstantNativePreview(text, myLanguage));
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
        const result = await generateLivePreview(text, myLanguage, partnerLanguage);
        setPreview(result);
      } catch (err) {
        console.error('[useBidirectionalChat] Preview error:', err);
      }
    }, previewDebounceMs);
  }, [enableLivePreview, myLanguage, partnerLanguage, previewDebounceMs]);
  
  // Detect input type wrapper - uses my language for detection
  const detectType = useCallback((text: string): InputType => {
    return detectInputType(text, myLanguage);
  }, [myLanguage]);
  
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
    myLanguage,
    partnerLanguage,
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
  const myProfile: UserLanguageProfile = useMemo(() => ({
    userId: 'me',
    gender: 'male',
    motherTongue: options.myLanguage,
    scriptType: 'native',
  }), [options.myLanguage]);
  
  const partnerProfile: UserLanguageProfile = useMemo(() => ({
    userId: 'partner',
    gender: 'female',
    motherTongue: options.partnerLanguage,
    scriptType: 'native',
  }), [options.partnerLanguage]);
  
  return useBidirectionalChat({
    myProfile,
    partnerProfile,
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

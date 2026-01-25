/**
 * Profile-Aware Translation Hook
 * ===============================
 * 
 * React hook that integrates user profiles with the translation engine.
 * Automatically fetches mother tongue from user profiles and applies
 * bidirectional translation based on sender/receiver languages.
 * 
 * OFFLINE ONLY - NO EXTERNAL APIs - NO NLLB-200 - NO HARDCODING
 * Uses English as semantic bridge between all 1000+ languages
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  getUserMotherTongue,
  getChatParticipantLanguages,
  createUserProfile,
  createChatParticipants,
  processChatMessage,
  generateProfileLivePreview,
  getProfileInstantPreview,
  translateWithProfile,
  translateBetweenUsers,
  initializeProfileTranslation,
  isEngineReady,
  invalidateLanguageCache,
  getSupportedLanguageCount,
  isLanguageSupported,
  getLanguageInfo,
  normalizeLanguage,
  isSameLanguage,
  isLatinScript,
  isRTL,
  type UserLanguageProfile,
  type ChatParticipants,
  type ProfileChatMessage,
} from '@/lib/translation/profile-translation-service';
import { type LivePreview } from '@/lib/translation/libre-translate-engine';

// ============================================================
// TYPES
// ============================================================

export interface UseProfileTranslationOptions {
  /** Current user ID */
  myUserId: string;
  /** Partner user ID for chat */
  partnerUserId?: string;
  /** Enable live preview as typing */
  enableLivePreview?: boolean;
  /** Preview debounce time in ms */
  previewDebounceMs?: number;
  /** Auto-initialize engine */
  autoInitialize?: boolean;
}

export interface UseProfileTranslationReturn {
  // Profile data
  myProfile: UserLanguageProfile | null;
  partnerProfile: UserLanguageProfile | null;
  myLanguage: string;
  partnerLanguage: string;
  sameLanguage: boolean;
  
  // Message processing
  sendMessage: (text: string) => Promise<ProfileChatMessage>;
  processIncoming: (text: string) => Promise<ProfileChatMessage>;
  
  // Live preview
  preview: LivePreview | null;
  updatePreview: (text: string) => void;
  instantPreview: (text: string) => string;
  
  // Translation
  translateToPartner: (text: string) => Promise<string>;
  translateFromPartner: (text: string) => Promise<string>;
  
  // State
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshProfiles: () => Promise<void>;
  clearError: () => void;
  
  // Language info
  languageCount: number;
  isLanguageSupported: (lang: string) => boolean;
  getLanguageInfo: typeof getLanguageInfo;
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useProfileTranslation(
  options: UseProfileTranslationOptions
): UseProfileTranslationReturn {
  const {
    myUserId,
    partnerUserId,
    enableLivePreview = true,
    previewDebounceMs = 150,
    autoInitialize = true,
  } = options;
  
  // State
  const [isReady, setIsReady] = useState(isEngineReady());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<UserLanguageProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserLanguageProfile | null>(null);
  const [preview, setPreview] = useState<LivePreview | null>(null);
  
  // Refs
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  const instantPreviewCacheRef = useRef<Map<string, string>>(new Map());
  
  // Derived values
  const myLanguage = useMemo(
    () => normalizeLanguage(myProfile?.motherTongue || 'english'),
    [myProfile?.motherTongue]
  );
  
  const partnerLanguage = useMemo(
    () => normalizeLanguage(partnerProfile?.motherTongue || 'english'),
    [partnerProfile?.motherTongue]
  );
  
  const sameLanguage = useMemo(
    () => isSameLanguage(myLanguage, partnerLanguage),
    [myLanguage, partnerLanguage]
  );
  
  // Initialize engine and load profiles
  useEffect(() => {
    if (!autoInitialize) return;
    
    const init = async () => {
      setIsLoading(true);
      try {
        await initializeProfileTranslation();
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!isReady) {
      init();
    }
  }, [autoInitialize, isReady]);
  
  // Load user profiles
  useEffect(() => {
    if (!isReady || !myUserId) return;
    
    const loadProfiles = async () => {
      setIsLoading(true);
      try {
        const profile = await createUserProfile(myUserId);
        setMyProfile(profile);
        
        if (partnerUserId) {
          const partner = await createUserProfile(partnerUserId);
          setPartnerProfile(partner);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profiles');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfiles();
  }, [isReady, myUserId, partnerUserId]);
  
  // Cleanup preview timeout
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);
  
  /**
   * Send a message (I am sender, partner is receiver)
   */
  const sendMessage = useCallback(async (text: string): Promise<ProfileChatMessage> => {
    if (!partnerUserId) {
      throw new Error('Partner user ID is required for chat');
    }
    
    setError(null);
    
    try {
      return await processChatMessage(text, myUserId, partnerUserId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process message';
      setError(errorMsg);
      throw err;
    }
  }, [myUserId, partnerUserId]);
  
  /**
   * Process incoming message (partner is sender, I am receiver)
   */
  const processIncoming = useCallback(async (text: string): Promise<ProfileChatMessage> => {
    if (!partnerUserId) {
      throw new Error('Partner user ID is required for chat');
    }
    
    setError(null);
    
    try {
      // REVERSE roles: partner is sender, I am receiver
      return await processChatMessage(text, partnerUserId, myUserId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process message';
      setError(errorMsg);
      throw err;
    }
  }, [myUserId, partnerUserId]);
  
  /**
   * Update live preview as user types
   */
  const updatePreview = useCallback((text: string) => {
    if (!enableLivePreview || !partnerUserId) return;
    
    if (!text.trim()) {
      setPreview(null);
      return;
    }
    
    // Debounced preview generation
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    previewTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await generateProfileLivePreview(text, myUserId, partnerUserId);
        setPreview(result);
      } catch (err) {
        console.error('[useProfileTranslation] Preview error:', err);
      }
    }, previewDebounceMs);
  }, [enableLivePreview, myUserId, partnerUserId, previewDebounceMs]);
  
  /**
   * Get instant preview (synchronous) using cached translations
   */
  const instantPreview = useCallback((text: string): string => {
    if (!text.trim()) return '';
    
    // Check cache
    const cacheKey = `${myLanguage}:${text}`;
    const cached = instantPreviewCacheRef.current.get(cacheKey);
    if (cached) return cached;
    
    // For non-English speakers, return text as-is initially
    // Full translation happens in async updatePreview
    return text;
  }, [myLanguage]);
  
  /**
   * Translate text to partner's language
   */
  const translateToPartner = useCallback(async (text: string): Promise<string> => {
    if (!partnerUserId) {
      throw new Error('Partner user ID is required');
    }
    
    const result = await translateBetweenUsers(text, myUserId, partnerUserId);
    return result.text;
  }, [myUserId, partnerUserId]);
  
  /**
   * Translate text from partner's language to mine
   */
  const translateFromPartner = useCallback(async (text: string): Promise<string> => {
    if (!partnerUserId) {
      throw new Error('Partner user ID is required');
    }
    
    // REVERSE: partner is source, I am target
    const result = await translateBetweenUsers(text, partnerUserId, myUserId);
    return result.text;
  }, [myUserId, partnerUserId]);
  
  /**
   * Refresh user profiles (invalidate cache and reload)
   */
  const refreshProfiles = useCallback(async () => {
    invalidateLanguageCache(myUserId);
    if (partnerUserId) {
      invalidateLanguageCache(partnerUserId);
    }
    
    setIsLoading(true);
    try {
      const profile = await createUserProfile(myUserId);
      setMyProfile(profile);
      
      if (partnerUserId) {
        const partner = await createUserProfile(partnerUserId);
        setPartnerProfile(partner);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh profiles');
    } finally {
      setIsLoading(false);
    }
  }, [myUserId, partnerUserId]);
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    // Profile data
    myProfile,
    partnerProfile,
    myLanguage,
    partnerLanguage,
    sameLanguage,
    
    // Message processing
    sendMessage,
    processIncoming,
    
    // Live preview
    preview,
    updatePreview,
    instantPreview,
    
    // Translation
    translateToPartner,
    translateFromPartner,
    
    // State
    isReady,
    isLoading,
    error,
    
    // Actions
    refreshProfiles,
    clearError,
    
    // Language info
    languageCount: getSupportedLanguageCount(),
    isLanguageSupported,
    getLanguageInfo,
  };
}

// ============================================================
// SIMPLIFIED HOOKS
// ============================================================

/**
 * Simple hook for single-direction translation
 */
export function useSimpleTranslation(userId: string) {
  const [motherTongue, setMotherTongue] = useState<string>('english');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    getUserMotherTongue(userId)
      .then(setMotherTongue)
      .finally(() => setIsLoading(false));
  }, [userId]);
  
  const translate = useCallback(async (text: string, targetLanguage: string) => {
    const result = await translateWithProfile(text, userId, targetLanguage);
    return result.text;
  }, [userId]);
  
  return { motherTongue, translate, isLoading };
}

/**
 * Hook for getting user's language only
 */
export function useUserLanguage(userId: string) {
  const [language, setLanguage] = useState<string>('english');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    getUserMotherTongue(userId)
      .then(setLanguage)
      .finally(() => setIsLoading(false));
  }, [userId]);
  
  return {
    language,
    isLoading,
    isRTL: isRTL(language),
    isLatinScript: isLatinScript(language),
    languageInfo: getLanguageInfo(language),
  };
}

/**
 * Hook for chat language pair
 */
export function useChatLanguages(senderId: string, receiverId: string) {
  const [languages, setLanguages] = useState<{
    senderLanguage: string;
    receiverLanguage: string;
    sameLanguage: boolean;
  }>({
    senderLanguage: 'english',
    receiverLanguage: 'english',
    sameLanguage: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    getChatParticipantLanguages(senderId, receiverId)
      .then(({ senderLanguage, receiverLanguage }) => {
        setLanguages({
          senderLanguage,
          receiverLanguage,
          sameLanguage: isSameLanguage(senderLanguage, receiverLanguage),
        });
      })
      .finally(() => setIsLoading(false));
  }, [senderId, receiverId]);
  
  return { ...languages, isLoading };
}

// ============================================================
// EXPORTS
// ============================================================

export type {
  UserLanguageProfile,
  ChatParticipants,
  ProfileChatMessage,
  LivePreview,
};

export {
  getUserMotherTongue,
  getChatParticipantLanguages,
  invalidateLanguageCache,
  getSupportedLanguageCount,
  isLanguageSupported,
  getLanguageInfo,
  normalizeLanguage,
  isSameLanguage,
  isLatinScript,
  isRTL,
};

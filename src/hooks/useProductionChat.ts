/**
 * Production Chat Translation Hook with NLLB-200
 * 
 * Scalable for handling lakhs of users with:
 * - Auto-detect source/target language from user profiles
 * - Latin input → Live native script preview (instant, non-blocking)
 * - Background translation with NLLB-200 (200+ languages)
 * - Sender sees their native language in chat
 * - Receiver sees translated message in their native language
 * - Bi-directional: Works both ways
 * - Non-blocking: Typing never affected by translation
 * - Spell correction on Latin input
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  initializeNLLB,
  translateWithNLLB,
  isNLLBLoaded,
  isNLLBLoading,
  getNLLBCode,
} from '@/lib/translation/nllb-translator';
import { correctSpelling } from '@/lib/translation/spell-corrector';
import { phoneticTransliterate, isPhoneticTransliterationSupported } from '@/lib/translation/phonetic-transliterator';
import { detectLanguage as detectLang, isLatinScript as checkLatinScript } from '@/lib/translation/language-detector';
import { normalizeLanguage } from '@/lib/translation/language-codes';

// Types
export interface TranslatedMessage {
  id: string;
  senderId: string;
  originalText: string;           // Original Latin input
  correctedText: string;          // Spell-corrected text
  senderNativeText: string;       // Text in sender's native script (what sender sees)
  receiverNativeText: string;     // Text translated to receiver's language (what receiver sees)
  isTranslated: boolean;
  senderLanguage: string;
  receiverLanguage: string;
  detectedLanguage?: string;
  createdAt: string;
}

export interface LivePreviewState {
  latinInput: string;
  correctedInput: string;
  nativePreview: string;
  isProcessing: boolean;
}

export interface UseProductionChatOptions {
  currentUserId: string;
  currentUserLanguage: string;    // Current user's mother tongue (from profile)
  partnerId: string;
  partnerLanguage: string;        // Partner's mother tongue (from profile)
  debounceMs?: number;
  autoCorrectSpelling?: boolean;
}

export interface UseProductionChatReturn {
  // Live preview for typing
  livePreview: LivePreviewState;
  updateLivePreview: (latinText: string) => void;
  clearLivePreview: () => void;
  
  // Message processing
  processOutgoingMessage: (text: string) => Promise<{
    senderNativeText: string;
    receiverTranslatedText: string;
    originalText: string;
    correctedText: string;
    isTranslated: boolean;
  }>;
  
  processIncomingMessage: (
    text: string, 
    senderId: string, 
    senderLanguage: string
  ) => Promise<{
    displayText: string;
    originalText: string;
    isTranslated: boolean;
  }>;
  
  // Auto-detection
  detectLanguage: (text: string) => string;
  
  // Model state
  isModelReady: boolean;
  isModelLoading: boolean;
  initializeModel: () => Promise<boolean>;
  
  // Utilities
  isLatinScript: (text: string) => boolean;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  needsTranslation: boolean;
  needsNativeConversion: boolean;
  
  // State
  isTranslating: boolean;
  error: string | null;
}

// Helper to check if language is English
const isEnglish = (lang: string): boolean => {
  const norm = normalizeLanguage(lang);
  return norm === 'english' || norm === 'en';
};

export function useProductionChat(options: UseProductionChatOptions): UseProductionChatReturn {
  const {
    currentUserId,
    currentUserLanguage,
    partnerId,
    partnerLanguage,
    debounceMs = 100,
    autoCorrectSpelling = true
  } = options;

  // Normalize languages
  const myLanguage = normalizeLanguage(currentUserLanguage);
  const theirLanguage = normalizeLanguage(partnerLanguage);

  // State
  const [livePreview, setLivePreview] = useState<LivePreviewState>({
    latinInput: '',
    correctedInput: '',
    nativePreview: '',
    isProcessing: false
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);

  // Refs for debouncing
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedRef = useRef<string>('');

  // Check if languages are same (no translation needed)
  const needsTranslation = getNLLBCode(myLanguage) !== getNLLBCode(theirLanguage);
  
  // Check if current user needs Latin → Native conversion
  const needsNativeConversion = !isEnglish(myLanguage);

  // Check model status
  useEffect(() => {
    setIsModelReady(isNLLBLoaded());
    setIsModelLoading(isNLLBLoading());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Initialize NLLB model
  const initializeModel = useCallback(async (): Promise<boolean> => {
    if (isModelReady) return true;
    if (isModelLoading) return false;

    setIsModelLoading(true);
    const success = await initializeNLLB((progress) => {
      if (progress.status === 'ready') {
        setIsModelReady(true);
        setIsModelLoading(false);
      } else if (progress.status === 'error') {
        setIsModelLoading(false);
      }
    });

    return success;
  }, [isModelReady, isModelLoading]);

  /**
   * Update live preview as user types in Latin
   * Non-blocking: Never delays typing
   */
  const updateLivePreview = useCallback((latinText: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = latinText.trim();
    
    // Update Latin input immediately (never block typing)
    setLivePreview(prev => ({ ...prev, latinInput: latinText }));

    if (!trimmed) {
      setLivePreview({ latinInput: '', correctedInput: '', nativePreview: '', isProcessing: false });
      lastProcessedRef.current = '';
      return;
    }

    // If user's language is English, no conversion needed
    if (!needsNativeConversion) {
      const corrected = autoCorrectSpelling ? correctSpelling(trimmed) : trimmed;
      setLivePreview(prev => ({ ...prev, correctedInput: corrected, nativePreview: corrected, isProcessing: false }));
      return;
    }

    // If already non-Latin, show as-is
    if (!checkLatinScript(trimmed)) {
      setLivePreview(prev => ({ ...prev, correctedInput: trimmed, nativePreview: trimmed, isProcessing: false }));
      lastProcessedRef.current = '';
      return;
    }

    // Skip if same as last processed
    if (lastProcessedRef.current === trimmed) {
      return;
    }

    // Show processing state
    setLivePreview(prev => ({ ...prev, isProcessing: true }));

    // Debounced conversion (non-blocking)
    debounceRef.current = setTimeout(async () => {
      try {
        lastProcessedRef.current = trimmed;

        // Step 1: Correct spelling
        const corrected = autoCorrectSpelling ? correctSpelling(trimmed) : trimmed;

        // Step 2: Transliterate to native script (instant)
        let nativePreview = corrected;
        if (isPhoneticTransliterationSupported(myLanguage)) {
          const transliterated = phoneticTransliterate(corrected, myLanguage);
          if (transliterated && transliterated !== corrected) {
            nativePreview = transliterated;
          }
        }

        setLivePreview(prev => ({
          ...prev,
          correctedInput: corrected,
          nativePreview,
          isProcessing: false
        }));
      } catch (err) {
        console.error('[ProductionChat] Preview error:', err);
        setLivePreview(prev => ({ 
          ...prev, 
          correctedInput: trimmed,
          nativePreview: trimmed, 
          isProcessing: false 
        }));
      }
    }, debounceMs);
  }, [myLanguage, needsNativeConversion, autoCorrectSpelling, debounceMs]);

  /**
   * Clear live preview (call on send)
   */
  const clearLivePreview = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setLivePreview({ latinInput: '', correctedInput: '', nativePreview: '', isProcessing: false });
    lastProcessedRef.current = '';
  }, []);

  /**
   * Process outgoing message before sending
   * 1. Correct spelling
   * 2. Convert to sender's native script (for sender display)
   * 3. Translate to receiver's language (background, non-blocking)
   */
  const processOutgoingMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    
    if (!trimmed) {
      return { 
        senderNativeText: '', 
        receiverTranslatedText: '', 
        originalText: '', 
        correctedText: '',
        isTranslated: false 
      };
    }

    // Step 1: Correct spelling
    const correctedText = autoCorrectSpelling ? correctSpelling(trimmed) : trimmed;

    // Step 2: Convert to sender's native script
    let senderNativeText = correctedText;
    if (needsNativeConversion && checkLatinScript(correctedText)) {
      // Check if we have ready preview
      if (livePreview.nativePreview && 
          livePreview.latinInput.trim() === trimmed &&
          !checkLatinScript(livePreview.nativePreview)) {
        senderNativeText = livePreview.nativePreview;
      } else if (isPhoneticTransliterationSupported(myLanguage)) {
        const transliterated = phoneticTransliterate(correctedText, myLanguage);
        if (transliterated && transliterated !== correctedText) {
          senderNativeText = transliterated;
        }
      }
    }

    // Step 3: Translate for receiver (background, async)
    let receiverTranslatedText = senderNativeText;
    let isTranslated = false;

    if (needsTranslation) {
      setIsTranslating(true);
      try {
        // Ensure model is loaded
        if (!isNLLBLoaded()) {
          await initializeModel();
        }

        const translated = await translateWithNLLB(senderNativeText, myLanguage, theirLanguage);
        if (translated && translated !== senderNativeText) {
          receiverTranslatedText = translated;
          isTranslated = true;
        }
      } catch (err) {
        console.error('[ProductionChat] Translation error:', err);
        setError(err instanceof Error ? err.message : 'Translation failed');
      } finally {
        setIsTranslating(false);
      }
    }

    return { 
      senderNativeText, 
      receiverTranslatedText, 
      originalText: trimmed,
      correctedText,
      isTranslated 
    };
  }, [myLanguage, theirLanguage, needsNativeConversion, needsTranslation, autoCorrectSpelling, livePreview, initializeModel]);

  /**
   * Process incoming message for display
   * Translates from sender's language to current user's language
   */
  const processIncomingMessage = useCallback(async (
    text: string,
    senderId: string,
    senderLanguage: string
  ) => {
    const trimmed = text.trim();
    const normSender = normalizeLanguage(senderLanguage);
    
    if (!trimmed) {
      return { displayText: '', originalText: '', isTranslated: false };
    }

    // If it's my own message, I see it as sent (already in my native)
    if (senderId === currentUserId) {
      return { displayText: trimmed, originalText: trimmed, isTranslated: false };
    }

    // If same language, no translation needed
    if (getNLLBCode(normSender) === getNLLBCode(myLanguage)) {
      return { displayText: trimmed, originalText: trimmed, isTranslated: false };
    }

    // Translate to my language
    setIsTranslating(true);
    let displayText = trimmed;
    let isTranslated = false;

    try {
      if (!isNLLBLoaded()) {
        await initializeModel();
      }

      const translated = await translateWithNLLB(trimmed, normSender, myLanguage);
      if (translated && translated !== trimmed) {
        displayText = translated;
        isTranslated = true;
      }
    } catch (err) {
      console.error('[ProductionChat] Incoming translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }

    return { displayText, originalText: trimmed, isTranslated };
  }, [currentUserId, myLanguage, initializeModel]);

  /**
   * Detect language from text
   */
  const detectLanguageFromText = useCallback((text: string): string => {
    if (!text.trim()) return myLanguage;
    const result = detectLang(text);
    return result.language || myLanguage;
  }, [myLanguage]);

  /**
   * Check if two languages are the same
   */
  const isSameLanguage = useCallback((lang1: string, lang2: string): boolean => {
    return getNLLBCode(normalizeLanguage(lang1)) === getNLLBCode(normalizeLanguage(lang2));
  }, []);

  return {
    livePreview,
    updateLivePreview,
    clearLivePreview,
    processOutgoingMessage,
    processIncomingMessage,
    detectLanguage: detectLanguageFromText,
    isModelReady,
    isModelLoading,
    initializeModel,
    isLatinScript: checkLatinScript,
    isSameLanguage,
    needsTranslation,
    needsNativeConversion,
    isTranslating,
    error
  };
}

export default useProductionChat;

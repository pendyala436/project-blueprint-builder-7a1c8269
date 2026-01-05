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
   * 
   * FIX #2: Correct spelling BEFORE transliteration (without changing meaning)
   * FIX #3: Transliteration ONLY at this stage (no translation)
   * FIX #7: Non-blocking - Never delays typing, runs instantly
   */
  const updateLivePreview = useCallback((latinText: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = latinText.trim();
    
    // FIX #7: Update Latin input IMMEDIATELY (never block typing)
    setLivePreview(prev => ({ ...prev, latinInput: latinText }));

    if (!trimmed) {
      setLivePreview({ latinInput: '', correctedInput: '', nativePreview: '', isProcessing: false });
      lastProcessedRef.current = '';
      return;
    }

    // If user's language is English, no conversion needed
    if (!needsNativeConversion) {
      // FIX #2: Still correct spelling for English
      const corrected = autoCorrectSpelling ? correctSpelling(trimmed) : trimmed;
      setLivePreview(prev => ({ ...prev, correctedInput: corrected, nativePreview: corrected, isProcessing: false }));
      return;
    }

    // If already non-Latin (native script), show as-is - no transliteration needed
    if (!checkLatinScript(trimmed)) {
      setLivePreview(prev => ({ ...prev, correctedInput: trimmed, nativePreview: trimmed, isProcessing: false }));
      lastProcessedRef.current = '';
      return;
    }

    // Skip if same as last processed
    if (lastProcessedRef.current === trimmed) {
      return;
    }

    // FIX #7: Perform transliteration synchronously for instant feedback
    // Only use setTimeout for very minimal debounce to avoid excessive calls
    debounceRef.current = setTimeout(() => {
      try {
        lastProcessedRef.current = trimmed;

        // FIX #2: Step 1 - Correct spelling FIRST (before transliteration)
        // This fixes misspelled Latin input without changing meaning
        const corrected = autoCorrectSpelling ? correctSpelling(trimmed) : trimmed;

        // FIX #3: Step 2 - ONLY transliterate (no translation here)
        // Convert Latin → Native script instantly
        let nativePreview = corrected;
        if (isPhoneticTransliterationSupported(myLanguage)) {
          const transliterated = phoneticTransliterate(corrected, myLanguage);
          // Only use transliteration if it actually produced native script
          if (transliterated && transliterated !== corrected && !checkLatinScript(transliterated)) {
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
    }, Math.min(debounceMs, 50)); // FIX #7: Cap debounce at 50ms for instant feel
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
   * 
   * FIX #2: Correct spelling BEFORE translation
   * FIX #3: Transliterate to native script (sender display)
   * FIX #7: Translation runs asynchronously in background (non-blocking)
   * FIX #8: Sender sees their native language, receiver sees translated
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

    // FIX #2: Step 1 - Correct spelling FIRST (before any conversion)
    const correctedText = autoCorrectSpelling ? correctSpelling(trimmed) : trimmed;

    // FIX #3 & #8: Step 2 - Convert to sender's native script
    // Sender will see this in their chat window
    let senderNativeText = correctedText;
    if (needsNativeConversion && checkLatinScript(correctedText)) {
      // Use cached preview if available and matches
      if (livePreview.nativePreview && 
          livePreview.latinInput.trim() === trimmed &&
          !checkLatinScript(livePreview.nativePreview)) {
        senderNativeText = livePreview.nativePreview;
      } else if (isPhoneticTransliterationSupported(myLanguage)) {
        const transliterated = phoneticTransliterate(correctedText, myLanguage);
        if (transliterated && transliterated !== correctedText && !checkLatinScript(transliterated)) {
          senderNativeText = transliterated;
        }
      }
    }

    // Same language = NO translation needed
    // FIX #8: Both see the same native script text
    if (!needsTranslation) {
      console.log('[ProductionChat] Same language - no translation needed');
      return { 
        senderNativeText, 
        receiverTranslatedText: senderNativeText, // Same text for both
        originalText: trimmed,
        correctedText,
        isTranslated: false 
      };
    }

    // FIX #7 & #8: Different languages - translate for receiver (background, async)
    // This runs in background without blocking the UI
    let receiverTranslatedText = senderNativeText;
    let isTranslated = false;
    
    setIsTranslating(true);
    try {
      if (!isNLLBLoaded()) {
        await initializeModel();
      }

      // FIX #4 & #5: Translation uses proper NLLB codes and forces target language
      const translated = await translateWithNLLB(senderNativeText, myLanguage, theirLanguage);
      if (translated && translated !== senderNativeText) {
        receiverTranslatedText = translated;
        isTranslated = true;
      }
    } catch (err) {
      console.error('[ProductionChat] Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      // On error, receiver sees sender's native text (graceful fallback)
    } finally {
      setIsTranslating(false);
    }

    return { 
      senderNativeText,        // FIX #8: Sender sees this (their native script)
      receiverTranslatedText,  // FIX #8: Receiver sees this (their native language)
      originalText: trimmed,
      correctedText,
      isTranslated 
    };
  }, [myLanguage, theirLanguage, needsNativeConversion, needsTranslation, autoCorrectSpelling, livePreview, initializeModel]);

  /**
   * Process incoming message for display
   * Translates from sender's language to current user's language
   * 
   * FIX #8: Bi-directional - receiver sees message in their native language
   * FIX #7: Translation runs asynchronously (non-blocking)
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

    // FIX #8: If same language, no translation needed - both see same native script
    if (getNLLBCode(normSender) === getNLLBCode(myLanguage)) {
      return { displayText: trimmed, originalText: trimmed, isTranslated: false };
    }

    // FIX #7 & #8: Translate to receiver's (my) language asynchronously
    setIsTranslating(true);
    let displayText = trimmed;
    let isTranslated = false;

    try {
      if (!isNLLBLoaded()) {
        await initializeModel();
      }

      // FIX #4 & #5: Uses proper NLLB codes and forces target language
      const translated = await translateWithNLLB(trimmed, normSender, myLanguage);
      if (translated && translated !== trimmed) {
        displayText = translated;
        isTranslated = true;
      }
    } catch (err) {
      console.error('[ProductionChat] Incoming translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
      // On error, show original message (graceful fallback)
    } finally {
      setIsTranslating(false);
    }

    // FIX #8: Receiver sees message in their native language
    return { displayText, originalText: trimmed, isTranslated };
  }, [currentUserId, myLanguage, initializeModel]);

  /**
   * Detect language from text
   * FIX #1: Falls back to user's profile language if confidence is low
   */
  const detectLanguageFromText = useCallback((text: string): string => {
    if (!text.trim()) return myLanguage;
    // Pass myLanguage as hint for low-confidence fallback
    const result = detectLang(text, myLanguage);
    // If confidence is low, use user's profile language
    if (result.confidence < 0.6) {
      return myLanguage;
    }
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

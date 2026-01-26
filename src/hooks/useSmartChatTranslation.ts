/**
 * Smart Chat Translation Hook
 * ============================
 * 
 * Combines auto-detection with semantic translation:
 * 1. Auto-detects input type (English, native, romanized, voice)
 * 2. Shows real-time preview in sender's mother tongue
 * 3. Translates for receiver in their mother tongue
 * 4. Handles bidirectional translation
 * 
 * NO HARDCODING - dynamic language detection
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAutoLanguageDetection, type DetectionResult } from './useAutoLanguageDetection';
import { translateText, translateForChat, getEnglishMeaning } from '@/lib/xenova-translate-sdk/engine';
import { normalizeLanguageCode, isEnglish, isSameLanguage } from '@/lib/xenova-translate-sdk/languages';

// ============================================================
// TYPES
// ============================================================

export interface SmartTranslationResult {
  // What sender sees (their mother tongue)
  senderView: string;
  // What receiver will see (their mother tongue)
  receiverView: string;
  // English meaning (semantic core)
  englishMeaning: string;
  // Original input
  originalInput: string;
  // Detection info
  detection: DetectionResult | null;
  // Translation status
  isTranslating: boolean;
  wasTranslated: boolean;
  confidence: number;
}

export interface UseSmartChatTranslationOptions {
  senderMotherTongue: string;
  receiverMotherTongue: string;
  enabled?: boolean;
  debounceMs?: number;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useSmartChatTranslation(options: UseSmartChatTranslationOptions) {
  const {
    senderMotherTongue,
    receiverMotherTongue,
    enabled = true,
    debounceMs = 200,
  } = options;

  const [result, setResult] = useState<SmartTranslationResult>({
    senderView: '',
    receiverView: '',
    englishMeaning: '',
    originalInput: '',
    detection: null,
    isTranslating: false,
    wasTranslated: false,
    confidence: 0,
  });

  const translateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInputRef = useRef<string>('');

  // Normalize language codes
  const senderLang = normalizeLanguageCode(senderMotherTongue);
  const receiverLang = normalizeLanguageCode(receiverMotherTongue);
  const isSameLang = isSameLanguage(senderLang, receiverLang);

  // Auto-detection for sender's input
  const { detect, detectVoice, detection, isDetecting, motherTongueCode } = 
    useAutoLanguageDetection({
      userMotherTongue: senderMotherTongue,
      fallbackLanguage: 'en',
      debounceMs: 100,
    });

  /**
   * Process input and generate translations
   */
  const processInput = useCallback(async (
    text: string,
    detectionResult: DetectionResult
  ): Promise<SmartTranslationResult> => {
    if (!text.trim()) {
      return {
        senderView: '',
        receiverView: '',
        englishMeaning: '',
        originalInput: '',
        detection: detectionResult,
        isTranslating: false,
        wasTranslated: false,
        confidence: 0,
      };
    }

    let senderView = text;
    let receiverView = text;
    let englishMeaning = text;
    let wasTranslated = false;

    try {
      const { inputType, detectedLanguage } = detectionResult;

      // CASE 1: Native script input (Gboard, native keyboard)
      if (inputType === 'native-script') {
        // Input is already in native script
        senderView = text;
        
        // Get English meaning for semantic pivot
        englishMeaning = await getEnglishMeaning(text, detectedLanguage);
        
        // Translate to receiver's language
        if (!isSameLang) {
          const receiverResult = await translateText(englishMeaning, 'en', receiverLang);
          receiverView = receiverResult.text;
          wasTranslated = receiverResult.isTranslated;
        } else {
          receiverView = text;
        }
      }
      // CASE 2: English input
      else if (inputType === 'english') {
        englishMeaning = text;
        
        // Generate sender's native view (if not English speaker)
        if (!isEnglish(senderLang)) {
          const senderResult = await translateText(text, 'en', senderLang);
          senderView = senderResult.text;
        } else {
          senderView = text;
        }
        
        // Generate receiver's native view
        if (!isEnglish(receiverLang)) {
          const receiverResult = await translateText(text, 'en', receiverLang);
          receiverView = receiverResult.text;
          wasTranslated = receiverResult.isTranslated;
        } else {
          receiverView = text;
        }
      }
      // CASE 3: Romanized input (English letters, native meaning)
      else if (inputType === 'romanized') {
        // Treat as sender's mother tongue typed in Latin
        // The meaning is in sender's language, just written in English letters
        
        // First, get the semantic meaning by treating input as sender's language
        // This might need transliteration + translation
        englishMeaning = await getEnglishMeaning(text, senderLang);
        
        // Generate sender's native script view
        const senderResult = await translateText(englishMeaning, 'en', senderLang);
        senderView = senderResult.text;
        
        // Generate receiver's view
        if (!isSameLang) {
          const receiverResult = await translateText(englishMeaning, 'en', receiverLang);
          receiverView = receiverResult.text;
          wasTranslated = receiverResult.isTranslated;
        } else {
          receiverView = senderView;
        }
      }
      // CASE 4: Voice input
      else if (inputType === 'voice') {
        // Voice can be in any language - use detected language
        if (isEnglish(detectedLanguage)) {
          englishMeaning = text;
          
          if (!isEnglish(senderLang)) {
            const senderResult = await translateText(text, 'en', senderLang);
            senderView = senderResult.text;
          }
          
          if (!isEnglish(receiverLang)) {
            const receiverResult = await translateText(text, 'en', receiverLang);
            receiverView = receiverResult.text;
            wasTranslated = receiverResult.isTranslated;
          }
        } else {
          // Voice in non-English language
          senderView = text;
          englishMeaning = await getEnglishMeaning(text, detectedLanguage);
          
          if (!isSameLang) {
            const receiverResult = await translateText(englishMeaning, 'en', receiverLang);
            receiverView = receiverResult.text;
            wasTranslated = receiverResult.isTranslated;
          } else {
            receiverView = text;
          }
        }
      }
      // CASE 5: Mixed or unknown
      else {
        // Default: try to extract English meaning and translate
        englishMeaning = await getEnglishMeaning(text, detectedLanguage);
        
        const senderResult = await translateText(englishMeaning, 'en', senderLang);
        senderView = senderResult.text;
        
        if (!isSameLang) {
          const receiverResult = await translateText(englishMeaning, 'en', receiverLang);
          receiverView = receiverResult.text;
          wasTranslated = receiverResult.isTranslated;
        } else {
          receiverView = senderView;
        }
      }
    } catch (error) {
      console.error('[SmartChat] Translation error:', error);
      // Fallback to original text
      senderView = text;
      receiverView = text;
      englishMeaning = text;
    }

    return {
      senderView,
      receiverView,
      englishMeaning,
      originalInput: text,
      detection: detectionResult,
      isTranslating: false,
      wasTranslated,
      confidence: detectionResult.confidence,
    };
  }, [senderLang, receiverLang, isSameLang]);

  /**
   * Translate input with auto-detection
   */
  const translateInput = useCallback((text: string, isVoice = false) => {
    if (!enabled) return;
    if (text === lastInputRef.current) return;
    lastInputRef.current = text;

    // Detect language
    if (isVoice) {
      detectVoice(text);
    } else {
      detect(text);
    }
  }, [enabled, detect, detectVoice]);

  /**
   * Translate voice input
   */
  const translateVoice = useCallback((text: string) => {
    translateInput(text, true);
  }, [translateInput]);

  /**
   * Get final translation for sending
   */
  const getFinalTranslation = useCallback(async (text: string): Promise<SmartTranslationResult> => {
    const currentDetection: DetectionResult = detection || {
      inputType: 'unknown' as const,
      inputMethod: 'standard' as const,
      detectedLanguage: 'en',
      detectedLanguageName: 'English',
      isLatinInput: true,
      isNativeInput: false,
      confidence: 0.5,
      script: 'Latin',
      metadata: {
        isGboard: false,
        isExternalKeyboard: false,
        isVoiceInput: false,
        isFontTool: false,
        isMixedInput: false,
        isIME: false,
        inputEventType: '',
        compositionActive: false,
        characterBurstDetected: false,
      },
    };

    return processInput(text, currentDetection);
  }, [detection, processInput]);

  // Process input when detection changes
  useEffect(() => {
    if (!detection || !lastInputRef.current.trim()) return;

    // Clear pending translation
    if (translateTimeoutRef.current) {
      clearTimeout(translateTimeoutRef.current);
    }

    setResult(prev => ({ ...prev, isTranslating: true }));

    // Debounced translation
    translateTimeoutRef.current = setTimeout(async () => {
      const newResult = await processInput(lastInputRef.current, detection);
      setResult(newResult);
    }, debounceMs);

    return () => {
      if (translateTimeoutRef.current) {
        clearTimeout(translateTimeoutRef.current);
      }
    };
  }, [detection, processInput, debounceMs]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (translateTimeoutRef.current) {
        clearTimeout(translateTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Main functions
    translateInput,
    translateVoice,
    getFinalTranslation,
    
    // Current state
    result,
    detection,
    isDetecting,
    isTranslating: result.isTranslating,
    
    // Language info
    senderLang,
    receiverLang,
    isSameLang,
  };
}

export default useSmartChatTranslation;

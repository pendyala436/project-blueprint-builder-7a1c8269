/**
 * Smart Chat Translation Hook
 * ============================
 * 
 * Combines auto-detection with semantic translation using edge function.
 * Browser-based models removed - uses server-side translation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAutoLanguageDetection, type DetectionResult } from './useAutoLanguageDetection';
import { supabase } from '@/integrations/supabase/client';

// ============================================================
// TYPES
// ============================================================

export interface SmartTranslationResult {
  senderView: string;
  receiverView: string;
  englishMeaning: string;
  originalInput: string;
  detection: DetectionResult | null;
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
// UTILITIES
// ============================================================

function normalizeLanguageCode(lang: string): string {
  if (!lang) return 'en';
  const code = lang.toLowerCase().trim();
  const codeMap: Record<string, string> = {
    'english': 'en', 'hindi': 'hi', 'telugu': 'te', 'tamil': 'ta',
    'kannada': 'kn', 'malayalam': 'ml', 'marathi': 'mr', 'gujarati': 'gu',
    'bengali': 'bn', 'punjabi': 'pa', 'urdu': 'ur', 'odia': 'or',
  };
  return codeMap[code] || code.slice(0, 2);
}

function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguageCode(lang1) === normalizeLanguageCode(lang2);
}

function isEnglish(lang: string): boolean {
  const code = normalizeLanguageCode(lang);
  return code === 'en' || code === 'english';
}

// ============================================================
// EDGE FUNCTION TRANSLATION
// ============================================================

async function translateWithEdgeFunction(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{
  senderView: string;
  receiverView: string;
  englishCore: string;
  wasTranslated: boolean;
}> {
  if (!text.trim()) {
    return { senderView: '', receiverView: '', englishCore: '', wasTranslated: false };
  }

  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        senderLanguage: normalizeLanguageCode(senderLanguage),
        receiverLanguage: normalizeLanguageCode(receiverLanguage),
        mode: 'bidirectional',
      },
    });

    if (error) throw error;

    return {
      senderView: data?.senderView || text,
      receiverView: data?.receiverView || text,
      englishCore: data?.englishCore || text,
      wasTranslated: data?.wasTranslated || false,
    };
  } catch (err) {
    console.error('[SmartChat] Edge function error:', err);
    return { senderView: text, receiverView: text, englishCore: text, wasTranslated: false };
  }
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

  const senderLang = normalizeLanguageCode(senderMotherTongue);
  const receiverLang = normalizeLanguageCode(receiverMotherTongue);
  const isSameLang = isSameLanguage(senderLang, receiverLang);

  const { detect, detectVoice, detection, isDetecting, motherTongueCode } = 
    useAutoLanguageDetection({
      userMotherTongue: senderMotherTongue,
      fallbackLanguage: 'en',
      debounceMs: 100,
    });

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

    try {
      const edgeResult = await translateWithEdgeFunction(text, senderLang, receiverLang);
      
      return {
        senderView: edgeResult.senderView,
        receiverView: edgeResult.receiverView,
        englishMeaning: edgeResult.englishCore,
        originalInput: text,
        detection: detectionResult,
        isTranslating: false,
        wasTranslated: edgeResult.wasTranslated,
        confidence: detectionResult.confidence,
      };
    } catch (error) {
      console.error('[SmartChat] Translation error:', error);
      return {
        senderView: text,
        receiverView: text,
        englishMeaning: text,
        originalInput: text,
        detection: detectionResult,
        isTranslating: false,
        wasTranslated: false,
        confidence: detectionResult.confidence,
      };
    }
  }, [senderLang, receiverLang]);

  const translateInput = useCallback((text: string, isVoice = false) => {
    if (!enabled) return;
    if (text === lastInputRef.current) return;
    lastInputRef.current = text;

    if (isVoice) {
      detectVoice(text);
    } else {
      detect(text);
    }
  }, [enabled, detect, detectVoice]);

  const translateVoice = useCallback((text: string) => {
    translateInput(text, true);
  }, [translateInput]);

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

  useEffect(() => {
    if (!detection || !lastInputRef.current.trim()) return;

    if (translateTimeoutRef.current) {
      clearTimeout(translateTimeoutRef.current);
    }

    setResult(prev => ({ ...prev, isTranslating: true }));

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

  useEffect(() => {
    return () => {
      if (translateTimeoutRef.current) {
        clearTimeout(translateTimeoutRef.current);
      }
    };
  }, []);

  return {
    translateInput,
    translateVoice,
    getFinalTranslation,
    result,
    detection,
    isDetecting,
    isTranslating: result.isTranslating,
    senderLang,
    receiverLang,
    isSameLang,
  };
}

export default useSmartChatTranslation;

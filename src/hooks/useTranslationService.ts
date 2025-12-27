/**
 * Translation Service Hook
 * Uses Supabase Edge Function for reliable NLLB-200 translation
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  model: string;
  usedPivot: boolean;
  pivotLanguage?: string;
  detectedLanguage?: string;
}

export interface ConversionResult {
  converted: string;
  isConverted: boolean;
}

export function useTranslationService() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Translate text via edge function
  const translate = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> => {
    if (!text.trim()) {
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        model: 'none',
        usedPivot: false,
      };
    }

    // Same language - no translation needed
    if (sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        model: 'none',
        usedPivot: false,
      };
    }

    setIsTranslating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('translate-message', {
        body: {
          message: text,
          sourceLanguage,
          targetLanguage,
          mode: 'translate',
        },
      });

      if (fnError) {
        console.error('[TranslationService] Function error:', fnError);
        throw new Error(fnError.message || 'Translation failed');
      }

      if (data?.error) {
        console.warn('[TranslationService] Translation warning:', data.error);
        // Return original text if service not configured
        return {
          translatedText: text,
          originalText: text,
          sourceLanguage,
          targetLanguage,
          isTranslated: false,
          model: 'none',
          usedPivot: false,
        };
      }

      return {
        translatedText: data.translatedMessage || text,
        originalText: text,
        sourceLanguage: data.detectedLanguage || sourceLanguage,
        targetLanguage,
        isTranslated: data.isTranslated || false,
        model: data.model || 'unknown',
        usedPivot: data.usedPivot || false,
        pivotLanguage: data.pivotLanguage,
        detectedLanguage: data.detectedLanguage,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      console.error('[TranslationService] Error:', message);
      setError(message);
      
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage,
        targetLanguage,
        isTranslated: false,
        model: 'error',
        usedPivot: false,
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Convert romanized text to native script via edge function
  const convertToNativeScript = useCallback(async (
    text: string,
    targetLanguage: string
  ): Promise<ConversionResult> => {
    if (!text.trim()) {
      return { converted: text, isConverted: false };
    }

    // Check if text is Latin script
    const latinChars = text.match(/[a-zA-Z]/g);
    const totalChars = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
    const isLatin = latinChars && totalChars.length > 0 && (latinChars.length / totalChars.length) > 0.8;

    if (!isLatin) {
      return { converted: text, isConverted: false };
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('translate-message', {
        body: {
          message: text,
          sourceLanguage: 'english',
          targetLanguage,
          mode: 'convert',
        },
      });

      if (fnError || data?.error) {
        return { converted: text, isConverted: false };
      }

      const converted = data.convertedMessage || data.translatedMessage || text;
      return {
        converted,
        isConverted: converted !== text && data.isConverted,
      };
    } catch {
      return { converted: text, isConverted: false };
    }
  }, []);

  // Detect language from text
  const detectLanguage = useCallback((text: string): { language: string; isLatin: boolean } => {
    const trimmed = text.trim();
    if (!trimmed) return { language: 'english', isLatin: true };

    // Script patterns for detection
    const patterns: Array<{ regex: RegExp; language: string }> = [
      { regex: /[\u0900-\u097F]/, language: 'hindi' },
      { regex: /[\u0980-\u09FF]/, language: 'bengali' },
      { regex: /[\u0C00-\u0C7F]/, language: 'telugu' },
      { regex: /[\u0B80-\u0BFF]/, language: 'tamil' },
      { regex: /[\u0A80-\u0AFF]/, language: 'gujarati' },
      { regex: /[\u0C80-\u0CFF]/, language: 'kannada' },
      { regex: /[\u0D00-\u0D7F]/, language: 'malayalam' },
      { regex: /[\u0A00-\u0A7F]/, language: 'punjabi' },
      { regex: /[\u4E00-\u9FFF]/, language: 'chinese' },
      { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese' },
      { regex: /[\uAC00-\uD7AF]/, language: 'korean' },
      { regex: /[\u0E00-\u0E7F]/, language: 'thai' },
      { regex: /[\u0600-\u06FF]/, language: 'arabic' },
      { regex: /[\u0590-\u05FF]/, language: 'hebrew' },
      { regex: /[\u0400-\u04FF]/, language: 'russian' },
      { regex: /[\u10A0-\u10FF]/, language: 'georgian' },
      { regex: /[\u0530-\u058F]/, language: 'armenian' },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(trimmed)) {
        return { language: pattern.language, isLatin: false };
      }
    }

    return { language: 'english', isLatin: true };
  }, []);

  return {
    translate,
    convertToNativeScript,
    detectLanguage,
    isTranslating,
    error,
  };
}

export default useTranslationService;

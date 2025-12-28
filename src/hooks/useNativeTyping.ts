/**
 * Native Typing Hook
 * Converts Latin/romanized text to native script in real-time as user types
 * Uses server-side dl-translate edge function for transliteration
 * 
 * Example: User types "bagunnava" → Shows "బాగున్నావా" (Telugu)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseNativeTypingOptions {
  targetLanguage: string;
  debounceMs?: number;
  enabled?: boolean;
}

interface NativeTypingResult {
  // The original Latin text user typed
  latinText: string;
  // The converted native script text
  nativeText: string;
  // Whether conversion is in progress
  isConverting: boolean;
  // Whether the text was successfully converted
  isConverted: boolean;
  // Any error that occurred
  error: string | null;
}

// Check if text contains primarily Latin characters
function isLatinScript(text: string): boolean {
  if (!text.trim()) return true;
  const latinChars = text.match(/[a-zA-Z]/g);
  const totalChars = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  return latinChars !== null && totalChars.length > 0 && (latinChars.length / totalChars.length) > 0.6;
}

// Check if language uses non-Latin script
function isNonLatinLanguage(language: string): boolean {
  const nonLatinLanguages = new Set([
    'hindi', 'bengali', 'telugu', 'tamil', 'marathi', 'gujarati', 'kannada',
    'malayalam', 'punjabi', 'odia', 'urdu', 'nepali', 'sinhala', 'assamese',
    'arabic', 'persian', 'hebrew', 'chinese', 'japanese', 'korean', 'thai',
    'burmese', 'khmer', 'lao', 'tibetan', 'russian', 'ukrainian', 'bulgarian',
    'greek', 'georgian', 'armenian', 'amharic', 'tigrinya', 'dhivehi'
  ]);
  return nonLatinLanguages.has(language.toLowerCase());
}

// Cache for conversions to reduce API calls
const conversionCache = new Map<string, string>();

export function useNativeTyping(options: UseNativeTypingOptions) {
  const { targetLanguage, debounceMs = 300, enabled = true } = options;
  
  const [result, setResult] = useState<NativeTypingResult>({
    latinText: '',
    nativeText: '',
    isConverting: false,
    isConverted: false,
    error: null,
  });
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const lastConvertedText = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Convert Latin text to native script
  const convertToNative = useCallback(async (latinText: string): Promise<string> => {
    const trimmed = latinText.trim();
    
    // Check cache first
    const cacheKey = `${trimmed}|${targetLanguage}`;
    if (conversionCache.has(cacheKey)) {
      console.log('[NativeTyping] Cache hit:', cacheKey);
      return conversionCache.get(cacheKey)!;
    }

    console.log(`[NativeTyping] Converting "${trimmed}" to ${targetLanguage}`);

    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          text: trimmed,
          sourceLanguage: 'english',
          targetLanguage: targetLanguage,
          mode: 'convert'
        },
      });

      if (error) {
        console.error('[NativeTyping] Conversion error:', error);
        return trimmed;
      }

      const converted = data?.translatedText || data?.translatedMessage || trimmed;
      
      // Cache the result
      if (converted !== trimmed) {
        conversionCache.set(cacheKey, converted);
        // Limit cache size
        if (conversionCache.size > 500) {
          const firstKey = conversionCache.keys().next().value;
          if (firstKey) conversionCache.delete(firstKey);
        }
      }

      console.log(`[NativeTyping] Converted: "${trimmed}" → "${converted}"`);
      return converted;
    } catch (err) {
      console.error('[NativeTyping] Error:', err);
      return trimmed;
    }
  }, [targetLanguage]);

  // Handle text input with debounced conversion
  const handleTextChange = useCallback((text: string) => {
    const trimmed = text.trim();
    
    // Update Latin text immediately
    setResult(prev => ({
      ...prev,
      latinText: text,
      nativeText: trimmed ? prev.nativeText : '', // Clear native if empty
      error: null,
    }));

    // Don't convert if disabled or empty
    if (!enabled || !trimmed) {
      setResult(prev => ({
        ...prev,
        latinText: text,
        nativeText: '',
        isConverting: false,
        isConverted: false,
      }));
      return;
    }

    // Don't convert if target is English/Latin script language
    if (!isNonLatinLanguage(targetLanguage)) {
      setResult(prev => ({
        ...prev,
        latinText: text,
        nativeText: text,
        isConverting: false,
        isConverted: false,
      }));
      return;
    }

    // Don't convert if input is not Latin script (already native)
    if (!isLatinScript(trimmed)) {
      setResult(prev => ({
        ...prev,
        latinText: text,
        nativeText: text,
        isConverting: false,
        isConverted: false,
      }));
      return;
    }

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Abort previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    // Check cache for immediate result
    const cacheKey = `${trimmed}|${targetLanguage}`;
    if (conversionCache.has(cacheKey)) {
      setResult(prev => ({
        ...prev,
        latinText: text,
        nativeText: conversionCache.get(cacheKey)!,
        isConverting: false,
        isConverted: true,
      }));
      return;
    }

    // Set converting state
    setResult(prev => ({
      ...prev,
      latinText: text,
      isConverting: true,
    }));

    // Debounce the conversion
    debounceTimer.current = setTimeout(async () => {
      abortController.current = new AbortController();
      
      try {
        const nativeText = await convertToNative(trimmed);
        
        // Only update if text hasn't changed
        setResult(prev => {
          if (prev.latinText.trim() === trimmed) {
            lastConvertedText.current = nativeText;
            return {
              ...prev,
              nativeText,
              isConverting: false,
              isConverted: nativeText !== trimmed,
            };
          }
          return prev;
        });
      } catch (err) {
        setResult(prev => ({
          ...prev,
          isConverting: false,
          error: err instanceof Error ? err.message : 'Conversion failed',
        }));
      }
    }, debounceMs);
  }, [targetLanguage, enabled, debounceMs, convertToNative]);

  // Get the text to display in the input (native if converted, otherwise Latin)
  const getDisplayText = useCallback((): string => {
    if (!enabled || !isNonLatinLanguage(targetLanguage)) {
      return result.latinText;
    }
    
    // Return native text if available and converted
    if (result.isConverted && result.nativeText) {
      return result.nativeText;
    }
    
    return result.latinText;
  }, [enabled, targetLanguage, result]);

  // Get the text to send (always the native/converted version)
  const getTextToSend = useCallback((): string => {
    if (!enabled || !isNonLatinLanguage(targetLanguage)) {
      return result.latinText.trim();
    }
    
    // Return native text if available
    if (result.isConverted && result.nativeText) {
      return result.nativeText.trim();
    }
    
    // Use last converted text or Latin text
    return lastConvertedText.current || result.latinText.trim();
  }, [enabled, targetLanguage, result]);

  // Clear the input
  const clear = useCallback(() => {
    setResult({
      latinText: '',
      nativeText: '',
      isConverting: false,
      isConverted: false,
      error: null,
    });
    lastConvertedText.current = '';
  }, []);

  return {
    // Current state
    latinText: result.latinText,
    nativeText: result.nativeText,
    displayText: getDisplayText(),
    textToSend: getTextToSend(),
    isConverting: result.isConverting,
    isConverted: result.isConverted,
    error: result.error,
    
    // Actions
    handleTextChange,
    clear,
    
    // Utils
    isNonLatinLanguage: isNonLatinLanguage(targetLanguage),
    isLatinInput: isLatinScript(result.latinText),
  };
}

export default useNativeTyping;

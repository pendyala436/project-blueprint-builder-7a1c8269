import { useState, useEffect, useRef, useCallback } from 'react';
import { convertToNativeScript, isLatinScript, normalizeLanguage } from '@/lib/translation/translation-engine';
import { isLatinScriptLanguage } from '@/lib/translation/language-codes';

interface TransliterationResult {
  original: string;
  converted: string;
  isConverting: boolean;
  error: string | null;
}

interface UseRealTimeTransliterationOptions {
  targetLanguage: string;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Hook for real-time transliteration of English/Latin text to native scripts.
 * Uses embedded translation engine (LibreTranslate, MyMemory, dictionaries)
 * NO edge functions - all logic in client code
 * 
 * Features:
 * - Debounced API calls to reduce load
 * - Caches converted text to avoid duplicate requests
 * - Shows original text while converting
 * - Falls back gracefully on errors
 */
export const useRealTimeTransliteration = ({
  targetLanguage,
  enabled = true,
  debounceMs = 300
}: UseRealTimeTransliterationOptions) => {
  const [result, setResult] = useState<TransliterationResult>({
    original: '',
    converted: '',
    isConverting: false,
    error: null
  });
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const lastInputRef = useRef<string>('');

  // Check if the language uses non-Latin script
  const isNonLatinLanguage = useCallback((lang: string): boolean => {
    return !isLatinScriptLanguage(normalizeLanguage(lang));
  }, []);

  // Check if text is primarily Latin script
  const isLatinText = useCallback((text: string): boolean => {
    return isLatinScript(text);
  }, []);

  // Convert text using embedded translation engine
  const convertText = useCallback(async (text: string): Promise<string> => {
    // Check cache first
    const cacheKey = `${targetLanguage}:${text}`;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)!;
    }

    try {
      const converted = await convertToNativeScript(text, targetLanguage);
      
      // Cache the result
      cacheRef.current.set(cacheKey, converted);
      
      // Limit cache size
      if (cacheRef.current.size > 1000) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }

      return converted;
    } catch (err) {
      console.error('Transliteration failed:', err);
      return text;
    }
  }, [targetLanguage]);

  // Main input handler with debouncing
  const handleInput = useCallback((text: string) => {
    lastInputRef.current = text;
    
    setResult(prev => ({
      ...prev,
      original: text,
      error: null
    }));

    // Skip if disabled or target is Latin-based language
    if (!enabled || !isNonLatinLanguage(targetLanguage)) {
      setResult(prev => ({
        ...prev,
        original: text,
        converted: text,
        isConverting: false
      }));
      return;
    }

    // Skip if input is already in non-Latin script
    if (!isLatinText(text)) {
      setResult(prev => ({
        ...prev,
        original: text,
        converted: text,
        isConverting: false
      }));
      return;
    }

    // Skip empty or very short input
    if (text.trim().length < 2) {
      setResult(prev => ({
        ...prev,
        original: text,
        converted: text,
        isConverting: false
      }));
      return;
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setResult(prev => ({ ...prev, isConverting: true }));

    // Debounce the conversion
    debounceRef.current = setTimeout(async () => {
      // Only convert the most recent word/phrase for real-time feel
      const words = text.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      
      // Check cache for last word
      const cacheKey = `${targetLanguage}:${lastWord}`;
      if (cacheRef.current.has(cacheKey)) {
        const cachedWord = cacheRef.current.get(cacheKey)!;
        words[words.length - 1] = cachedWord;
        const converted = words.join(' ');
        
        setResult({
          original: text,
          converted,
          isConverting: false,
          error: null
        });
        return;
      }

      // Convert last word only for faster response
      try {
        const convertedWord = await convertText(lastWord);
        
        // Only update if this is still the current input
        if (lastInputRef.current === text) {
          words[words.length - 1] = convertedWord;
          const converted = words.join(' ');
          
          setResult({
            original: text,
            converted,
            isConverting: false,
            error: null
          });
        }
      } catch (error) {
        setResult(prev => ({
          ...prev,
          isConverting: false,
          error: 'Conversion failed'
        }));
      }
    }, debounceMs);
  }, [enabled, targetLanguage, debounceMs, isNonLatinLanguage, isLatinText, convertText]);

  // Convert full message before sending
  const convertFullMessage = useCallback(async (text: string): Promise<string> => {
    if (!enabled || !isNonLatinLanguage(targetLanguage) || !isLatinText(text)) {
      return text;
    }
    
    return await convertText(text);
  }, [enabled, targetLanguage, isNonLatinLanguage, isLatinText, convertText]);

  // Clear cache when target language changes
  useEffect(() => {
    cacheRef.current.clear();
  }, [targetLanguage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    ...result,
    handleInput,
    convertFullMessage,
    clearCache: () => cacheRef.current.clear()
  };
};

export default useRealTimeTransliteration;

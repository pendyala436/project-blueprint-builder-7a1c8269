import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
 * Supports 200+ languages via NLLB-200 translation model.
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if the language uses non-Latin script
  const isNonLatinLanguage = useCallback((lang: string): boolean => {
    const latinLanguages = [
      'english', 'spanish', 'french', 'german', 'portuguese', 'italian',
      'dutch', 'polish', 'romanian', 'swedish', 'danish', 'norwegian',
      'finnish', 'czech', 'hungarian', 'vietnamese', 'indonesian', 'malay',
      'tagalog', 'filipino', 'swahili', 'turkish', 'croatian', 'slovenian'
    ];
    return !latinLanguages.includes(lang.toLowerCase().trim());
  }, []);

  // Check if text is primarily Latin script
  const isLatinText = useCallback((text: string): boolean => {
    if (!text.trim()) return true;
    const latinChars = text.match(/[a-zA-Z]/g);
    const totalChars = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
    if (!latinChars || !totalChars.length) return true;
    return (latinChars.length / totalChars.length) > 0.6;
  }, []);

  // Convert text using the translate-message edge function
  const convertText = useCallback(async (text: string): Promise<string> => {
    // Check cache first
    const cacheKey = `${targetLanguage}:${text}`;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)!;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          message: text,
          targetLanguage: targetLanguage,
          mode: 'convert'
        }
      });

      if (error) {
        console.error('Transliteration error:', error);
        return text;
      }

      const converted = data?.convertedMessage || data?.translatedMessage || text;
      
      // Cache the result
      cacheRef.current.set(cacheKey, converted);
      
      // Limit cache size
      if (cacheRef.current.size > 1000) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }

      return converted;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return text;
      }
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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

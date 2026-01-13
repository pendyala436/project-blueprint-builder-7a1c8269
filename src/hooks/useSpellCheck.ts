import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SpellCheckResult {
  corrected: string;
  wasChanged: boolean;
  original?: string;
}

interface UseSpellCheckOptions {
  language: string;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * AI-powered spell checker for 900+ languages
 * Checks phonetic Latin input before transliteration
 */
export function useSpellCheck({ language, enabled = true, debounceMs = 500 }: UseSpellCheckOptions) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastSuggestion, setLastSuggestion] = useState<SpellCheckResult | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, SpellCheckResult>>(new Map());
  const lastCheckedRef = useRef<string>('');

  const checkSpelling = useCallback(async (text: string): Promise<SpellCheckResult> => {
    // Skip if disabled, empty, too short, or non-Latin
    if (!enabled || !text || text.length < 3 || !/^[a-zA-Z\s]+$/.test(text.trim())) {
      return { corrected: text, wasChanged: false };
    }

    // Check cache first
    const cacheKey = `${language}:${text.toLowerCase()}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      setIsChecking(true);
      
      const { data, error } = await supabase.functions.invoke('spell-check', {
        body: { text, language }
      });

      if (error) {
        console.error('[useSpellCheck] Error:', error);
        return { corrected: text, wasChanged: false };
      }

      const result: SpellCheckResult = {
        corrected: data?.corrected || text,
        wasChanged: data?.wasChanged || false,
        original: text
      };

      // Cache the result
      cacheRef.current.set(cacheKey, result);
      
      // Limit cache size
      if (cacheRef.current.size > 100) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }

      return result;
    } catch (err) {
      console.error('[useSpellCheck] Exception:', err);
      return { corrected: text, wasChanged: false };
    } finally {
      setIsChecking(false);
    }
  }, [language, enabled]);

  /**
   * Check spelling with debounce - call this on input change
   */
  const checkSpellingDebounced = useCallback((text: string, onResult?: (result: SpellCheckResult) => void) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Skip if same as last checked
    if (text === lastCheckedRef.current) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      lastCheckedRef.current = text;
      const result = await checkSpelling(text);
      setLastSuggestion(result);
      onResult?.(result);
    }, debounceMs);
  }, [checkSpelling, debounceMs]);

  /**
   * Check spelling immediately - call this before send
   */
  const checkSpellingNow = useCallback(async (text: string): Promise<SpellCheckResult> => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    const result = await checkSpelling(text);
    setLastSuggestion(result);
    return result;
  }, [checkSpelling]);

  /**
   * Accept the spelling suggestion
   */
  const acceptSuggestion = useCallback(() => {
    const suggestion = lastSuggestion;
    setLastSuggestion(null);
    return suggestion?.corrected || null;
  }, [lastSuggestion]);

  /**
   * Dismiss the spelling suggestion
   */
  const dismissSuggestion = useCallback(() => {
    setLastSuggestion(null);
  }, []);

  /**
   * Clear the cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    lastCheckedRef.current = '';
  }, []);

  return {
    isChecking,
    lastSuggestion,
    checkSpellingDebounced,
    checkSpellingNow,
    acceptSuggestion,
    dismissSuggestion,
    clearCache
  };
}

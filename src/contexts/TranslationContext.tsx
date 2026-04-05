/**
 * Translation Context — Live multilingual translation
 * 
 * Uses Lingva Translate via the translate-message Edge Function.
 * Caches translations in Supabase for performance.
 * 
 * Usage:
 *   const { t, translateDynamic, currentLanguage, setLanguage } = useTranslation();
 *   t("greeting", "Hello") → translates "Hello" to user's language
 *   translateDynamic("some text") → returns translated string
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { translateText, translateBatch } from '@/lib/translation-service';

interface TranslationContextType {
  t: (key: string, fallback?: string) => string;
  translateDynamic: (text: string) => Promise<string>;
  translateDynamicBatch: (texts: string[]) => Promise<string[]>;
  currentLanguage: string;
  setLanguage: (language: string) => void;
  isLoading: boolean;
  syncUserLanguage: () => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// In-memory cache for UI string translations (key → translated)
const uiCache = new Map<string, string>();

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<string>('English');
  const [isLoading, setIsLoading] = useState(false);
  const pendingRef = useRef<Map<string, Promise<string>>>(new Map());

  // Clear cache when language changes
  const setLanguage = useCallback((language: string) => {
    if (language !== currentLanguage) {
      uiCache.clear();
      pendingRef.current.clear();
    }
    setCurrentLanguage(language);
  }, [currentLanguage]);

  // t() — synchronous lookup with async background fetch
  // Returns fallback immediately, triggers translation in background
  const t = useCallback((key: string, fallback?: string): string => {
    const text = fallback || key;

    // English or no language set → return as-is
    if (currentLanguage === 'English' || !currentLanguage) return text;

    // Check in-memory cache
    const cacheKey = `${currentLanguage}:${text}`;
    if (uiCache.has(cacheKey)) return uiCache.get(cacheKey)!;

    // Fire async translation (deduplicated)
    if (!pendingRef.current.has(cacheKey)) {
      const promise = translateText(text, 'English', currentLanguage)
        .then((translated) => {
          uiCache.set(cacheKey, translated);
          pendingRef.current.delete(cacheKey);
          return translated;
        })
        .catch(() => {
          pendingRef.current.delete(cacheKey);
          return text;
        });
      pendingRef.current.set(cacheKey, promise);
    }

    // Return fallback until translation arrives
    return text;
  }, [currentLanguage]);

  // translateDynamic — async, returns translated text
  const translateDynamic = useCallback(async (text: string): Promise<string> => {
    if (!text?.trim() || currentLanguage === 'English' || !currentLanguage) return text;
    return translateText(text, 'auto', currentLanguage);
  }, [currentLanguage]);

  // translateDynamicBatch — async batch translation
  const translateDynamicBatch = useCallback(async (texts: string[]): Promise<string[]> => {
    if (!texts?.length || currentLanguage === 'English' || !currentLanguage) return texts;
    return translateBatch(texts, 'auto', currentLanguage);
  }, [currentLanguage]);

  const syncUserLanguage = useCallback(async () => {
    // Could fetch from user profile in future
  }, []);

  // Memoize context value to prevent consumer re-renders
  const value = React.useMemo<TranslationContextType>(() => ({
    t,
    translateDynamic,
    translateDynamicBatch,
    currentLanguage,
    setLanguage,
    isLoading,
    syncUserLanguage,
  }), [t, translateDynamic, translateDynamicBatch, currentLanguage, setLanguage, isLoading, syncUserLanguage]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation(): TranslationContextType {
  const context = useContext(TranslationContext);
  if (!context) {
    // Fallback for components outside provider
    return {
      t: (key: string, fallback?: string) => fallback || key,
      translateDynamic: async (text: string) => text,
      translateDynamicBatch: async (texts: string[]) => texts,
      currentLanguage: 'English',
      setLanguage: () => {},
      isLoading: false,
      syncUserLanguage: async () => {},
    };
  }
  return context;
}

export default TranslationContext;

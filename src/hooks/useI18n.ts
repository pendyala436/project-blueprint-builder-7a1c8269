import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';
import { supportedLocales, loadLocale, type SupportedLocale } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced i18n hook that combines:
 * 1. Static UI translations via i18next (fast, pre-translated)
 * 2. Dynamic content translation via MT backend (for user-generated content like chat messages)
 */
export const useI18n = () => {
  const { t, i18n } = useI18nextTranslation();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Get current locale info
  const currentLocale = i18n.language as SupportedLocale;
  const currentLocaleInfo = supportedLocales[currentLocale] || supportedLocales.en;

  // Change language with dynamic loading
  const changeLanguage = useCallback(async (locale: SupportedLocale) => {
    if (locale === currentLocale) return;
    
    setIsChangingLanguage(true);
    try {
      // Load locale resources dynamically if not already loaded
      await loadLocale(locale);
      
      // Switch i18next to new language
      await i18n.changeLanguage(locale);
      
      // Persist to localStorage
      localStorage.setItem('meow_language', locale);
      
      // Update document direction for RTL languages
      document.documentElement.dir = supportedLocales[locale]?.dir || 'ltr';
      document.documentElement.lang = locale;
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChangingLanguage(false);
    }
  }, [currentLocale, i18n]);

  // Translate dynamic content (user messages, etc.) via MT backend
  const translateDynamic = useCallback(async (
    text: string,
    targetLanguage?: string
  ): Promise<string> => {
    if (!text) return text;
    
    const target = targetLanguage || currentLocaleInfo.name.toLowerCase();
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: { message: text, targetLanguage: target }
      });
      
      if (error) {
        console.error('Translation error:', error);
        return text;
      }
      
      return data?.translatedMessage || text;
    } catch (error) {
      console.error('Translation failed:', error);
      return text;
    }
  }, [currentLocaleInfo.name]);

  // Batch translate multiple texts
  const translateDynamicBatch = useCallback(async (
    texts: string[],
    targetLanguage?: string
  ): Promise<string[]> => {
    if (!texts.length) return texts;
    
    const target = targetLanguage || currentLocaleInfo.name.toLowerCase();
    
    // Translate in parallel with concurrency limit
    const results = await Promise.all(
      texts.map(text => translateDynamic(text, target))
    );
    
    return results;
  }, [translateDynamic, currentLocaleInfo.name]);

  // Get all supported locales for language selector
  const getLocales = useCallback(() => {
    return Object.entries(supportedLocales).map(([code, info]) => ({
      code: code as SupportedLocale,
      ...info
    }));
  }, []);

  return {
    // Static UI translations
    t,
    
    // Dynamic content translation (for chat messages etc.)
    translateDynamic,
    translateDynamicBatch,
    
    // Language management
    currentLocale,
    currentLocaleInfo,
    changeLanguage,
    isChangingLanguage,
    getLocales,
    
    // Utilities
    isRTL: currentLocaleInfo.dir === 'rtl',
    i18n,
  };
};

export default useI18n;

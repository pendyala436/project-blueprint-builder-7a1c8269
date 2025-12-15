import React, { Suspense, useEffect, memo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n, supportedLocales } from '@/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

// Minimal loading fallback - just render nothing to avoid flash
const I18nLoadingFallback = memo(() => null);
I18nLoadingFallback.displayName = 'I18nLoadingFallback';

/**
 * Optimized I18n Provider
 * - Minimal loading state
 * - Memoized for performance
 */
export const I18nProvider: React.FC<I18nProviderProps> = memo(({ children }) => {
  useEffect(() => {
    // Set document direction based on current language
    const currentLang = i18n.language as keyof typeof supportedLocales;
    const localeInfo = supportedLocales[currentLang] || supportedLocales.en;
    
    document.documentElement.dir = localeInfo.dir;
    document.documentElement.lang = i18n.language;
    
    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      const locale = lng as keyof typeof supportedLocales;
      const info = supportedLocales[locale] || supportedLocales.en;
      document.documentElement.dir = info.dir;
      document.documentElement.lang = lng;
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<I18nLoadingFallback />}>
        {children}
      </Suspense>
    </I18nextProvider>
  );
});

I18nProvider.displayName = 'I18nProvider';

export default I18nProvider;

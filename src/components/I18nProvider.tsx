import React, { Suspense, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n, supportedLocales } from '@/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

// Loading fallback component
const I18nLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

/**
 * I18n Provider component that wraps the app with i18next context
 * Handles initial locale detection and document direction setup
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
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
};

export default I18nProvider;

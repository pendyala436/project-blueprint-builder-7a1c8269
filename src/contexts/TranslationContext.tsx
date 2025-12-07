import React, { createContext, useContext, ReactNode } from 'react';

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

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  // Simple pass-through - no translation, just return fallback
  const t = (key: string, fallback?: string): string => fallback || key;
  
  const translateDynamic = async (text: string): Promise<string> => text;
  
  const translateDynamicBatch = async (texts: string[]): Promise<string[]> => texts;
  
  const setLanguage = () => {};
  
  const syncUserLanguage = async () => {};

  const value: TranslationContextType = {
    t,
    translateDynamic,
    translateDynamicBatch,
    currentLanguage: 'English',
    setLanguage,
    isLoading: false,
    syncUserLanguage,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    // Return default values if used outside provider
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
};

export default TranslationContext;
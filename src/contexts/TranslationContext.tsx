/**
 * TRANSLATION SYSTEM — DISABLED
 * 
 * The multilingual translation system is not active in this application.
 * This stub provides safe no-op implementations so existing components
 * that call useTranslation() continue to work without errors.
 * 
 * t("key", "fallback") always returns the fallback string (plain English).
 * translateDynamic/translateDynamicBatch return input unchanged.
 */

const noopT = (key: string, fallback?: string): string => fallback || key;

const defaultValue = {
  t: noopT,
  translateDynamic: async (text: string) => text,
  translateDynamicBatch: async (texts: string[]) => texts,
  currentLanguage: 'English',
  setLanguage: (_language: string) => {},
  isLoading: false,
  syncUserLanguage: async () => {},
};

export const useTranslation = () => defaultValue;
export default {};

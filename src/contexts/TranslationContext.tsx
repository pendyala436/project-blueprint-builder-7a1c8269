/**
 * Zero-cost Translation stub - no provider needed
 * Components can still call useTranslation() safely
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

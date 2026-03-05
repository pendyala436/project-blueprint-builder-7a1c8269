/**
 * Zero-cost i18n stub - no translation library overhead
 * All UI is plain English. Returns passthrough functions.
 */

const noopT = (key: string, fallback?: string): string => fallback || key;

const stub = {
  t: noopT,
  translateDynamic: async (text: string) => text,
  translateDynamicBatch: async (texts: string[]) => texts,
  currentLocale: 'en' as const,
  currentLocaleInfo: { name: 'English', nativeName: 'English', dir: 'ltr' as const },
  changeLanguage: async (_locale: string) => {},
  isChangingLanguage: false,
  getLocales: () => [{ code: 'en' as const, name: 'English', nativeName: 'English', dir: 'ltr' as const }],
  isRTL: false,
  i18n: null,
};

export const useI18n = () => stub;
export default useI18n;

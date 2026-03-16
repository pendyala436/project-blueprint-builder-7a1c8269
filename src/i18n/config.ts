// i18n config stub - no i18next initialization
// All UI is plain English, no translation overhead
export const supportedLocales = { en: { name: 'English', nativeName: 'English', dir: 'ltr' } } as const;
export type SupportedLocale = 'en';
export const loadLocale = async (_locale: string) => {};
export default {};

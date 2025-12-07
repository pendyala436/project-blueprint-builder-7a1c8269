import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Supported locales with their display names
export const supportedLocales = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  mr: { name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr' },
  th: { name: 'Thai', nativeName: 'ไทย', dir: 'ltr' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
} as const;

export type SupportedLocale = keyof typeof supportedLocales;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LocaleResources = Record<string, any>;

// Dynamic locale loader - fetches translations on demand to reduce bundle size
const loadLocaleResources = async (locale: string): Promise<LocaleResources> => {
  try {
    // Dynamic import for code splitting - each locale is a separate chunk
    const resources = await import(`./locales/${locale}.json`);
    return resources.default;
  } catch (error) {
    console.warn(`Failed to load locale ${locale}, falling back to English`);
    const fallback = await import('./locales/en.json');
    return fallback.default;
  }
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: Object.keys(supportedLocales),
    
    // Detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'meow_language',
    },
    
    // Namespace configuration
    ns: ['common', 'auth', 'chat', 'settings', 'admin'],
    defaultNS: 'common',
    
    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    // React-specific settings
    react: {
      useSuspense: true,
    },
    
    // Load resources lazily
    partialBundledLanguages: true,
    
    // Debug in development
    debug: import.meta.env.DEV,
  });

// Function to dynamically load and add locale resources
export const loadLocale = async (locale: string): Promise<void> => {
  if (!i18n.hasResourceBundle(locale, 'common')) {
    const resources = await loadLocaleResources(locale);
    i18n.addResourceBundle(locale, 'common', resources, true, true);
  }
};

// Preload English as default
loadLocale('en');

export default i18n;

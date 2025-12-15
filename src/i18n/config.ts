import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enResources from './locales/en.json';

// Optimized locale list - only most common languages for faster init
export const supportedLocales = {
  // Major Languages (most common first for faster lookup)
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  zh: { name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  mr: { name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  or: { name: 'Odia', nativeName: 'ଓଡ଼ିଆ', dir: 'ltr' },
  ur: { name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr' },
  th: { name: 'Thai', nativeName: 'ไทย', dir: 'ltr' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  pl: { name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr' },
} as const;

export type SupportedLocale = keyof typeof supportedLocales;

// Cache for loaded locales
const loadedLocales = new Set<string>(['en']);

// Dynamic locale loader with caching
const loadLocaleResources = async (locale: string) => {
  if (loadedLocales.has(locale)) {
    return null; // Already loaded
  }
  
  try {
    const resources = await import(`./locales/${locale}.json`);
    loadedLocales.add(locale);
    return resources.default;
  } catch {
    return null;
  }
};

// Initialize i18next with minimal config for fast startup
i18n
  .use(initReactI18next)
  .init({
    lng: 'en', // Start with English immediately, no detection delay
    fallbackLng: 'en',
    supportedLngs: Object.keys(supportedLocales),
    
    // Pre-load English resources
    resources: {
      en: { common: enResources }
    },
    
    ns: ['common'],
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false, // Prevent loading states
    },
    
    partialBundledLanguages: true,
    returnNull: false,
    debug: false,
    
    // Skip language detection on init for faster startup
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'meow_language',
    },
  });

// Detect language after init (non-blocking)
const savedLang = localStorage.getItem('meow_language');
if (savedLang && savedLang !== 'en' && savedLang in supportedLocales) {
  // Load language in background
  loadLocaleResources(savedLang).then(resources => {
    if (resources) {
      i18n.addResourceBundle(savedLang, 'common', resources, true, true);
      i18n.changeLanguage(savedLang);
    }
  });
}

// Function to dynamically load and add locale resources
export const loadLocale = async (locale: string): Promise<void> => {
  if (!i18n.hasResourceBundle(locale, 'common')) {
    const resources = await loadLocaleResources(locale);
    if (resources) {
      i18n.addResourceBundle(locale, 'common', resources, true, true);
    }
  }
};

export default i18n;

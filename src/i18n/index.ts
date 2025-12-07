import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';

// Language code mapping for user languages
export const languageCodeMap: Record<string, string> = {
  'English': 'en',
  'Hindi': 'hi',
  'Telugu': 'te',
  'Tamil': 'ta',
  'Kannada': 'kn',
  'Malayalam': 'ml',
  'Bengali': 'bn',
  'Marathi': 'mr',
  'Gujarati': 'gu',
  'Punjabi': 'pa',
  'Urdu': 'ur',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Portuguese': 'pt',
  'Italian': 'it',
  'Russian': 'ru',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Chinese': 'zh',
  'Arabic': 'ar',
};

// Reverse mapping
export const codeToLanguageMap: Record<string, string> = Object.entries(languageCodeMap).reduce(
  (acc, [lang, code]) => ({ ...acc, [code]: lang }),
  {}
);

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  te: { translation: te },
};

// Get saved language from localStorage
const getSavedLanguage = (): string => {
  try {
    const saved = localStorage.getItem('i18nextLng');
    if (saved && resources[saved as keyof typeof resources]) {
      return saved;
    }
    
    // Check for user language
    const userLang = localStorage.getItem('meow_user_language');
    if (userLang) {
      const code = languageCodeMap[userLang] || 'en';
      if (resources[code as keyof typeof resources]) {
        return code;
      }
    }
  } catch (e) {
    console.warn('Error reading saved language:', e);
  }
  return 'en';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

// Function to change language
export const changeLanguage = (langCode: string) => {
  const code = languageCodeMap[langCode] || langCode;
  if (resources[code as keyof typeof resources]) {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    localStorage.setItem('meow_user_language', codeToLanguageMap[code] || langCode);
  } else {
    // Fallback to English if language not available
    console.warn(`Language ${langCode} not available, falling back to English`);
    i18n.changeLanguage('en');
  }
};

// Get current language name
export const getCurrentLanguageName = (): string => {
  const code = i18n.language;
  return codeToLanguageMap[code] || 'English';
};

// Check if language is available
export const isLanguageAvailable = (langCode: string): boolean => {
  const code = languageCodeMap[langCode] || langCode;
  return !!resources[code as keyof typeof resources];
};

// Get all available languages
export const getAvailableLanguages = (): string[] => {
  return Object.keys(resources).map(code => codeToLanguageMap[code] || code);
};

export default i18n;

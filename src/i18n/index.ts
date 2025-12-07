import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { supabase } from '@/integrations/supabase/client';
import { ALL_NLLB200_LANGUAGES, NLLB200Language } from '@/data/nllb200Languages';

// Import static translation files
import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';

// Map NLLB-200 language names to i18n codes
export const languageCodeMap: Record<string, string> = {
  'English': 'en',
  'Hindi': 'hi',
  'Telugu': 'te',
};

// Reverse mapping
export const codeToLanguageMap: Record<string, string> = Object.entries(languageCodeMap).reduce(
  (acc, [lang, code]) => ({ ...acc, [code]: lang }),
  {}
);

// Static resources for available languages
const resources = {
  en: { translation: en },
  hi: { translation: hi },
  te: { translation: te },
};

// Helper to flatten nested translation object
const flattenTranslations = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
  const result: Record<string, string> = {};
  
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      result[newKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenTranslations(value as Record<string, unknown>, newKey));
    }
  }
  
  return result;
};

// Get flattened English translations for dynamic translation
const flatEnglishTranslations = flattenTranslations(en as Record<string, unknown>);

// Cache for dynamically translated languages
const translationCache: Record<string, Record<string, string>> = {};

// Get saved language from localStorage
const getSavedLanguage = (): string => {
  try {
    const saved = localStorage.getItem('i18nextLng');
    if (saved && resources[saved as keyof typeof resources]) {
      return saved;
    }
    
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

// Translate UI keys using NLLB-200 via edge function
export const translateWithNLLB200 = async (
  texts: string[],
  targetLanguage: string
): Promise<string[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('translate-ui', {
      body: {
        texts,
        targetLanguage,
        sourceLanguage: 'English'
      }
    });

    if (error) {
      console.error('Translation error:', error);
      return texts; // Return original texts on error
    }

    return data?.translations || texts;
  } catch (error) {
    console.error('Failed to translate:', error);
    return texts;
  }
};

// Set language with dynamic translation support for NLLB-200
export const changeLanguage = async (languageName: string): Promise<void> => {
  // Use static code if available
  const code = languageCodeMap[languageName] || languageName.toLowerCase().slice(0, 3);
  
  // If we have static translations, use them
  if (resources[code as keyof typeof resources]) {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    localStorage.setItem('meow_user_language', languageName);
    localStorage.setItem('app_language', languageName);
    return;
  }
  
  // Check if we already have cached translations for this language
  if (translationCache[code]) {
    if (!i18n.hasResourceBundle(code, 'translation')) {
      i18n.addResourceBundle(code, 'translation', translationCache[code]);
    }
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    localStorage.setItem('meow_user_language', languageName);
    localStorage.setItem('app_language', languageName);
    return;
  }
  
  // Dynamically translate using NLLB-200
  const keys = Object.keys(flatEnglishTranslations);
  const values = Object.values(flatEnglishTranslations);
  
  // Batch translate in chunks of 50 to avoid timeout
  const chunkSize = 50;
  const translatedValues: string[] = [];
  
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    const translated = await translateWithNLLB200(chunk, languageName);
    translatedValues.push(...translated);
  }
  
  // Build nested translation object
  const translations: Record<string, unknown> = {};
  keys.forEach((key, index) => {
    const parts = key.split('.');
    let current = translations;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    
    current[parts[parts.length - 1]] = translatedValues[index] || values[index];
  });
  
  translationCache[code] = translations as Record<string, string>;
  i18n.addResourceBundle(code, 'translation', translations);
  i18n.changeLanguage(code);
  localStorage.setItem('i18nextLng', code);
  localStorage.setItem('meow_user_language', languageName);
  localStorage.setItem('app_language', languageName);
};

// Get current language name
export const getCurrentLanguageName = (): string => {
  const saved = localStorage.getItem('meow_user_language') || localStorage.getItem('app_language');
  if (saved) return saved;
  
  const code = i18n.language;
  return codeToLanguageMap[code] || 'English';
};

// Check if language has static translations
export const hasStaticTranslations = (langCode: string): boolean => {
  return !!resources[langCode as keyof typeof resources];
};

// Get all available static languages
export const getStaticLanguages = (): string[] => {
  return Object.keys(resources).map(code => codeToLanguageMap[code] || code);
};

// Get NLLB language by name
export const getNLLBLanguage = (name: string): NLLB200Language | undefined => {
  return ALL_NLLB200_LANGUAGES.find(
    l => l.name.toLowerCase() === name.toLowerCase()
  );
};

export default i18n;

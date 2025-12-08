import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enResources from './locales/en.json';

// Comprehensive list of world languages with native names and text direction
// This supports 100+ languages covering all major world languages
export const supportedLocales = {
  // Major European Languages
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  pl: { name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
  ro: { name: 'Romanian', nativeName: 'Română', dir: 'ltr' },
  el: { name: 'Greek', nativeName: 'Ελληνικά', dir: 'ltr' },
  cs: { name: 'Czech', nativeName: 'Čeština', dir: 'ltr' },
  hu: { name: 'Hungarian', nativeName: 'Magyar', dir: 'ltr' },
  sv: { name: 'Swedish', nativeName: 'Svenska', dir: 'ltr' },
  da: { name: 'Danish', nativeName: 'Dansk', dir: 'ltr' },
  fi: { name: 'Finnish', nativeName: 'Suomi', dir: 'ltr' },
  no: { name: 'Norwegian', nativeName: 'Norsk', dir: 'ltr' },
  sk: { name: 'Slovak', nativeName: 'Slovenčina', dir: 'ltr' },
  sl: { name: 'Slovenian', nativeName: 'Slovenščina', dir: 'ltr' },
  hr: { name: 'Croatian', nativeName: 'Hrvatski', dir: 'ltr' },
  sr: { name: 'Serbian', nativeName: 'Српски', dir: 'ltr' },
  bs: { name: 'Bosnian', nativeName: 'Bosanski', dir: 'ltr' },
  mk: { name: 'Macedonian', nativeName: 'Македонски', dir: 'ltr' },
  bg: { name: 'Bulgarian', nativeName: 'Български', dir: 'ltr' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  be: { name: 'Belarusian', nativeName: 'Беларуская', dir: 'ltr' },
  lt: { name: 'Lithuanian', nativeName: 'Lietuvių', dir: 'ltr' },
  lv: { name: 'Latvian', nativeName: 'Latviešu', dir: 'ltr' },
  et: { name: 'Estonian', nativeName: 'Eesti', dir: 'ltr' },
  sq: { name: 'Albanian', nativeName: 'Shqip', dir: 'ltr' },
  is: { name: 'Icelandic', nativeName: 'Íslenska', dir: 'ltr' },
  ga: { name: 'Irish', nativeName: 'Gaeilge', dir: 'ltr' },
  cy: { name: 'Welsh', nativeName: 'Cymraeg', dir: 'ltr' },
  mt: { name: 'Maltese', nativeName: 'Malti', dir: 'ltr' },
  ca: { name: 'Catalan', nativeName: 'Català', dir: 'ltr' },
  eu: { name: 'Basque', nativeName: 'Euskara', dir: 'ltr' },
  gl: { name: 'Galician', nativeName: 'Galego', dir: 'ltr' },

  // Indian Languages
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  mr: { name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  or: { name: 'Odia', nativeName: 'ଓଡ଼ିଆ', dir: 'ltr' },
  as: { name: 'Assamese', nativeName: 'অসমীয়া', dir: 'ltr' },
  ur: { name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  ne: { name: 'Nepali', nativeName: 'नेपाली', dir: 'ltr' },
  si: { name: 'Sinhala', nativeName: 'සිංහල', dir: 'ltr' },
  sd: { name: 'Sindhi', nativeName: 'سنڌي', dir: 'rtl' },
  ks: { name: 'Kashmiri', nativeName: 'कॉशुर', dir: 'rtl' },
  sa: { name: 'Sanskrit', nativeName: 'संस्कृतम्', dir: 'ltr' },
  mai: { name: 'Maithili', nativeName: 'मैथिली', dir: 'ltr' },
  bho: { name: 'Bhojpuri', nativeName: 'भोजपुरी', dir: 'ltr' },
  doi: { name: 'Dogri', nativeName: 'डोगरी', dir: 'ltr' },
  kok: { name: 'Konkani', nativeName: 'कोंकणी', dir: 'ltr' },
  mni: { name: 'Manipuri', nativeName: 'মৈতৈলোন্', dir: 'ltr' },
  sat: { name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', dir: 'ltr' },
  brx: { name: 'Bodo', nativeName: 'बड़ो', dir: 'ltr' },

  // Middle Eastern & Central Asian
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  fa: { name: 'Persian', nativeName: 'فارسی', dir: 'rtl' },
  he: { name: 'Hebrew', nativeName: 'עברית', dir: 'rtl' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  ku: { name: 'Kurdish', nativeName: 'Kurdî', dir: 'ltr' },
  ps: { name: 'Pashto', nativeName: 'پښتو', dir: 'rtl' },
  az: { name: 'Azerbaijani', nativeName: 'Azərbaycan', dir: 'ltr' },
  uz: { name: 'Uzbek', nativeName: 'Oʻzbek', dir: 'ltr' },
  kk: { name: 'Kazakh', nativeName: 'Қазақ', dir: 'ltr' },
  ky: { name: 'Kyrgyz', nativeName: 'Кыргызча', dir: 'ltr' },
  tg: { name: 'Tajik', nativeName: 'Тоҷикӣ', dir: 'ltr' },
  tk: { name: 'Turkmen', nativeName: 'Türkmen', dir: 'ltr' },
  hy: { name: 'Armenian', nativeName: 'Հայdelays', dir: 'ltr' },
  ka: { name: 'Georgian', nativeName: 'ქართული', dir: 'ltr' },
  mn: { name: 'Mongolian', nativeName: 'Монгол', dir: 'ltr' },

  // East Asian Languages
  zh: { name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' },

  // Southeast Asian Languages
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr' },
  th: { name: 'Thai', nativeName: 'ไทย', dir: 'ltr' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr' },
  tl: { name: 'Filipino', nativeName: 'Tagalog', dir: 'ltr' },
  my: { name: 'Burmese', nativeName: 'မြန်မာ', dir: 'ltr' },
  km: { name: 'Khmer', nativeName: 'ភាសាខ្មែរ', dir: 'ltr' },
  lo: { name: 'Lao', nativeName: 'ລາວ', dir: 'ltr' },

  // African Languages
  sw: { name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', dir: 'ltr' },
  ha: { name: 'Hausa', nativeName: 'Hausa', dir: 'ltr' },
  yo: { name: 'Yoruba', nativeName: 'Yorùbá', dir: 'ltr' },
  ig: { name: 'Igbo', nativeName: 'Igbo', dir: 'ltr' },
  zu: { name: 'Zulu', nativeName: 'isiZulu', dir: 'ltr' },
  xh: { name: 'Xhosa', nativeName: 'isiXhosa', dir: 'ltr' },
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', dir: 'ltr' },
  so: { name: 'Somali', nativeName: 'Soomaali', dir: 'ltr' },
  rw: { name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', dir: 'ltr' },
  sn: { name: 'Shona', nativeName: 'chiShona', dir: 'ltr' },
  st: { name: 'Sotho', nativeName: 'Sesotho', dir: 'ltr' },
  tn: { name: 'Tswana', nativeName: 'Setswana', dir: 'ltr' },
  mg: { name: 'Malagasy', nativeName: 'Malagasy', dir: 'ltr' },
  ti: { name: 'Tigrinya', nativeName: 'ትግርኛ', dir: 'ltr' },
  om: { name: 'Oromo', nativeName: 'Afaan Oromoo', dir: 'ltr' },

  // Other Languages
  bo: { name: 'Tibetan', nativeName: 'བོད་སྐད', dir: 'ltr' },
  dz: { name: 'Dzongkha', nativeName: 'རྫོང་ཁ', dir: 'ltr' },
  ug: { name: 'Uyghur', nativeName: 'ئۇيغۇرچە', dir: 'rtl' },
  mi: { name: 'Maori', nativeName: 'Te Reo Māori', dir: 'ltr' },
  haw: { name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi', dir: 'ltr' },
  sm: { name: 'Samoan', nativeName: 'Gagana Samoa', dir: 'ltr' },
  fj: { name: 'Fijian', nativeName: 'Vosa Vakaviti', dir: 'ltr' },
  ht: { name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen', dir: 'ltr' },
  yi: { name: 'Yiddish', nativeName: 'ייִדיש', dir: 'rtl' },
  eo: { name: 'Esperanto', nativeName: 'Esperanto', dir: 'ltr' },
  la: { name: 'Latin', nativeName: 'Latina', dir: 'ltr' },
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
  } catch {
    // Fallback to English if locale fails to load
    const fallback = await import('./locales/en.json');
    return fallback.default;
  }
};

// Initialize i18next with resources bundled
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: Object.keys(supportedLocales),
    
    // Pre-load English resources to avoid "No backend" warning
    resources: {
      en: { common: enResources }
    },
    
    // Detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'meow_language',
    },
    
    // Namespace configuration
    ns: ['common'],
    defaultNS: 'common',
    
    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    // React-specific settings
    react: {
      useSuspense: false, // Disable suspense to prevent hydration issues
    },
    
    // Allow partial bundles for lazy loading
    partialBundledLanguages: true,
    
    // Return null for missing keys to use fallback
    returnNull: false,
    
    // Debug only in development
    debug: false,
  });

// Function to dynamically load and add locale resources
export const loadLocale = async (locale: string): Promise<void> => {
  if (!i18n.hasResourceBundle(locale, 'common')) {
    const resources = await loadLocaleResources(locale);
    i18n.addResourceBundle(locale, 'common', resources, true, true);
  }
};

export default i18n;

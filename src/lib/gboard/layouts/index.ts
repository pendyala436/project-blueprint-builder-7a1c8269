/**
 * GBoard Layouts Index
 * Exports all keyboard layouts organized by script family
 */

import { latinLayouts } from './latin';
import { devanagariLayouts } from './devanagari';
import { indicLayouts } from './indic';
import { arabicLayouts } from './arabic';
import { cyrillicLayouts } from './cyrillic';
import { asianLayouts } from './asian';
import { cjkLayouts } from './cjk';
import { otherLayouts } from './other';
import { KeyboardLayout, LanguageMapping } from '../types';

// Combined layouts map
export const allLayouts: Record<string, KeyboardLayout> = {
  ...latinLayouts,
  ...devanagariLayouts,
  ...indicLayouts,
  ...arabicLayouts,
  ...cyrillicLayouts,
  ...asianLayouts,
  ...cjkLayouts,
  ...otherLayouts,
};

// Language to layout mapping for 200+ languages
export const languageMappings: LanguageMapping[] = [
  // Latin Script Languages
  { code: 'en', name: 'English', nativeName: 'English', script: 'latin', layoutId: 'en' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', script: 'latin', layoutId: 'es' },
  { code: 'fr', name: 'French', nativeName: 'Français', script: 'latin', layoutId: 'fr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', script: 'latin', layoutId: 'de' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', script: 'latin', layoutId: 'pt' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', script: 'latin', layoutId: 'it' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', script: 'latin', layoutId: 'tr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', script: 'latin', layoutId: 'vi' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', script: 'latin', layoutId: 'pl' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', script: 'latin', layoutId: 'id' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', script: 'latin', layoutId: 'id' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', script: 'latin', layoutId: 'nl' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', script: 'latin', layoutId: 'ro' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', script: 'latin', layoutId: 'sv' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', script: 'latin', layoutId: 'no' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', script: 'latin', layoutId: 'da' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', script: 'latin', layoutId: 'fi' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', script: 'latin', layoutId: 'cs' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', script: 'latin', layoutId: 'hu' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', script: 'latin', layoutId: 'cs' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', script: 'latin', layoutId: 'en' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', script: 'latin', layoutId: 'en' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', script: 'latin', layoutId: 'en' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', script: 'latin', layoutId: 'en' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', script: 'latin', layoutId: 'en' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', script: 'latin', layoutId: 'en' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', script: 'latin', layoutId: 'en' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', script: 'latin', layoutId: 'en' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', script: 'latin', layoutId: 'en' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', script: 'latin', layoutId: 'en' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', script: 'latin', layoutId: 'en' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', script: 'latin', layoutId: 'en' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', script: 'latin', layoutId: 'en' },
  
  // Devanagari Script Languages
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'devanagari', layoutId: 'hi' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'devanagari', layoutId: 'mr' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', script: 'devanagari', layoutId: 'sa' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', script: 'devanagari', layoutId: 'ne' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', script: 'devanagari', layoutId: 'kok' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', script: 'devanagari', layoutId: 'mai' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', script: 'devanagari', layoutId: 'brx' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', script: 'devanagari', layoutId: 'doi' },
  
  // Other Indic Scripts
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'bengali', layoutId: 'bn' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'bengali', layoutId: 'as' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'tamil', layoutId: 'ta' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'telugu', layoutId: 'te' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'kannada', layoutId: 'kn' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'malayalam', layoutId: 'ml' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'gujarati', layoutId: 'gu' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'punjabi', layoutId: 'pa' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'odia', layoutId: 'or' },
  
  // Arabic Script Languages
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', script: 'arabic', layoutId: 'ar' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', script: 'arabic', layoutId: 'ur' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', script: 'arabic', layoutId: 'fa' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', script: 'arabic', layoutId: 'ps' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', script: 'arabic', layoutId: 'sd' },
  { code: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'کوردی', script: 'arabic', layoutId: 'ckb' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', script: 'arabic', layoutId: 'ar' },
  
  // Cyrillic Script Languages
  { code: 'ru', name: 'Russian', nativeName: 'Русский', script: 'cyrillic', layoutId: 'ru' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', script: 'cyrillic', layoutId: 'uk' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', script: 'cyrillic', layoutId: 'be' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', script: 'cyrillic', layoutId: 'bg' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', script: 'cyrillic', layoutId: 'sr' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', script: 'cyrillic', layoutId: 'mk' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', script: 'cyrillic', layoutId: 'kk' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', script: 'cyrillic', layoutId: 'ru' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', script: 'cyrillic', layoutId: 'ru' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', script: 'cyrillic', layoutId: 'ru' },
  
  // Asian Scripts
  { code: 'th', name: 'Thai', nativeName: 'ไทย', script: 'thai', layoutId: 'th' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', script: 'khmer', layoutId: 'km' },
  { code: 'my', name: 'Myanmar', nativeName: 'မြန်မာ', script: 'myanmar', layoutId: 'my' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', script: 'lao', layoutId: 'lo' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', script: 'sinhala', layoutId: 'si' },
  
  // CJK Languages
  { code: 'ja', name: 'Japanese', nativeName: '日本語', script: 'hiragana', layoutId: 'ja-hiragana' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', script: 'hangul', layoutId: 'ko' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', script: 'latin', layoutId: 'zh-pinyin' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', script: 'bopomofo', layoutId: 'zh-bopomofo' },
  
  // Other Scripts
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', script: 'greek', layoutId: 'el' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', script: 'hebrew', layoutId: 'he' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', script: 'georgian', layoutId: 'ka' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայdelays', script: 'armenian', layoutId: 'hy' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', script: 'ethiopic', layoutId: 'am' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', script: 'ethiopic', layoutId: 'am' },
];

// Get layout by language code
export function getLayoutForLanguage(languageCode: string): KeyboardLayout | null {
  const normalizedCode = languageCode.toLowerCase().split('-')[0];
  
  // Direct layout match
  if (allLayouts[normalizedCode]) {
    return allLayouts[normalizedCode];
  }
  
  // Find from mappings
  const mapping = languageMappings.find(
    m => m.code.toLowerCase() === normalizedCode || 
         m.code.toLowerCase().startsWith(normalizedCode)
  );
  
  if (mapping && allLayouts[mapping.layoutId]) {
    return allLayouts[mapping.layoutId];
  }
  
  // Fallback to English
  return allLayouts['en'];
}

// Get all supported language codes
export function getSupportedLanguages(): string[] {
  return languageMappings.map(m => m.code);
}

// Search languages by name
export function searchLanguages(query: string): LanguageMapping[] {
  const normalizedQuery = query.toLowerCase();
  return languageMappings.filter(
    m => m.name.toLowerCase().includes(normalizedQuery) ||
         m.nativeName.toLowerCase().includes(normalizedQuery) ||
         m.code.toLowerCase().includes(normalizedQuery)
  );
}

// Export individual layout collections
export { latinLayouts } from './latin';
export { devanagariLayouts } from './devanagari';
export { indicLayouts } from './indic';
export { arabicLayouts } from './arabic';
export { cyrillicLayouts } from './cyrillic';
export { asianLayouts } from './asian';
export { cjkLayouts } from './cjk';
export { otherLayouts } from './other';

// Export comprehensive language mappings (500+ languages)
export { 
  comprehensiveLanguageMappings,
  getLayoutIdForLanguage,
  getScriptForLanguage,
  getLanguagesForScript,
  searchLanguagesMappings,
  isRTLLanguage,
  scriptToLayoutFallback
} from '../language-mappings';

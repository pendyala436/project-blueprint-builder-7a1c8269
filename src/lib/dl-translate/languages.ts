/**
 * DL-Translate Language Utilities
 * Complete support for ALL world languages (200+)
 */

import type { LanguageInfo, ScriptDetectionResult } from './types';

// Complete language mappings with native names - ALL world languages
export const LANGUAGES: LanguageInfo[] = [
  // Major World Languages
  { name: 'english', code: 'en', native: 'English' },
  { name: 'chinese', code: 'zh', native: '中文' },
  { name: 'spanish', code: 'es', native: 'Español' },
  { name: 'arabic', code: 'ar', native: 'العربية' },
  { name: 'french', code: 'fr', native: 'Français' },
  { name: 'portuguese', code: 'pt', native: 'Português' },
  { name: 'russian', code: 'ru', native: 'Русский' },
  { name: 'japanese', code: 'ja', native: '日本語' },
  { name: 'german', code: 'de', native: 'Deutsch' },
  { name: 'korean', code: 'ko', native: '한국어' },
  
  // South Asian Languages
  { name: 'hindi', code: 'hi', native: 'हिंदी' },
  { name: 'bengali', code: 'bn', native: 'বাংলা' },
  { name: 'telugu', code: 'te', native: 'తెలుగు' },
  { name: 'marathi', code: 'mr', native: 'मराठी' },
  { name: 'tamil', code: 'ta', native: 'தமிழ்' },
  { name: 'gujarati', code: 'gu', native: 'ગુજરાતી' },
  { name: 'kannada', code: 'kn', native: 'ಕನ್ನಡ' },
  { name: 'malayalam', code: 'ml', native: 'മലയാളം' },
  { name: 'punjabi', code: 'pa', native: 'ਪੰਜਾਬੀ' },
  { name: 'odia', code: 'or', native: 'ଓଡ଼ିଆ' },
  { name: 'urdu', code: 'ur', native: 'اردو' },
  { name: 'nepali', code: 'ne', native: 'नेपाली' },
  { name: 'sinhala', code: 'si', native: 'සිංහල' },
  { name: 'assamese', code: 'as', native: 'অসমীয়া' },
  { name: 'maithili', code: 'mai', native: 'मैथिली' },
  { name: 'santali', code: 'sat', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { name: 'kashmiri', code: 'ks', native: 'कॉशुर' },
  { name: 'konkani', code: 'kok', native: 'कोंकणी' },
  { name: 'sindhi', code: 'sd', native: 'سنڌي' },
  { name: 'dogri', code: 'doi', native: 'डोगरी' },
  { name: 'bodo', code: 'brx', native: 'बड़ो' },
  { name: 'manipuri', code: 'mni', native: 'মৈতৈলোন্' },
  { name: 'sanskrit', code: 'sa', native: 'संस्कृतम्' },
  { name: 'bhojpuri', code: 'bho', native: 'भोजपुरी' },
  { name: 'rajasthani', code: 'raj', native: 'राजस्थानी' },
  { name: 'chhattisgarhi', code: 'hne', native: 'छत्तीसगढ़ी' },
  { name: 'magahi', code: 'mag', native: 'मगही' },
  { name: 'haryanvi', code: 'bgc', native: 'हरियाणवी' },
  { name: 'awadhi', code: 'awa', native: 'अवधी' },
  { name: 'marwari', code: 'mwr', native: 'मारवाड़ी' },
  { name: 'dhivehi', code: 'dv', native: 'ދިވެހި' },
  { name: 'dzongkha', code: 'dz', native: 'རྫོང་ཁ' },
  { name: 'tibetan', code: 'bo', native: 'བོད་སྐད་' },
  
  // Southeast Asian Languages
  { name: 'thai', code: 'th', native: 'ไทย' },
  { name: 'vietnamese', code: 'vi', native: 'Tiếng Việt' },
  { name: 'indonesian', code: 'id', native: 'Bahasa Indonesia' },
  { name: 'malay', code: 'ms', native: 'Bahasa Melayu' },
  { name: 'tagalog', code: 'tl', native: 'Tagalog' },
  { name: 'filipino', code: 'fil', native: 'Filipino' },
  { name: 'burmese', code: 'my', native: 'မြန်မာ' },
  { name: 'khmer', code: 'km', native: 'ខ្មែរ' },
  { name: 'lao', code: 'lo', native: 'ລາວ' },
  { name: 'javanese', code: 'jv', native: 'Basa Jawa' },
  { name: 'sundanese', code: 'su', native: 'Basa Sunda' },
  { name: 'cebuano', code: 'ceb', native: 'Cebuano' },
  { name: 'ilocano', code: 'ilo', native: 'Ilokano' },
  { name: 'hiligaynon', code: 'hil', native: 'Hiligaynon' },
  { name: 'waray', code: 'war', native: 'Winaray' },
  { name: 'maranao', code: 'mrw', native: 'Maranao' },
  { name: 'tausug', code: 'tsg', native: 'Bahasa Sūg' },
  { name: 'madurese', code: 'mad', native: 'Madhura' },
  { name: 'minangkabau', code: 'min', native: 'Baso Minangkabau' },
  { name: 'acehnese', code: 'ace', native: 'Bahsa Acèh' },
  { name: 'balinese', code: 'ban', native: 'Basa Bali' },
  { name: 'sasak', code: 'sas', native: 'Basa Sasak' },
  
  // Middle Eastern Languages
  { name: 'persian', code: 'fa', native: 'فارسی' },
  { name: 'turkish', code: 'tr', native: 'Türkçe' },
  { name: 'hebrew', code: 'he', native: 'עברית' },
  { name: 'kurdish', code: 'ku', native: 'Kurdî' },
  { name: 'pashto', code: 'ps', native: 'پښتو' },
  { name: 'dari', code: 'prs', native: 'دری' },
  { name: 'azerbaijani', code: 'az', native: 'Azərbaycan' },
  { name: 'uzbek', code: 'uz', native: 'Oʻzbek' },
  { name: 'kazakh', code: 'kk', native: 'Қазақ' },
  { name: 'turkmen', code: 'tk', native: 'Türkmen' },
  { name: 'kyrgyz', code: 'ky', native: 'Кыргыз' },
  { name: 'tajik', code: 'tg', native: 'Тоҷикӣ' },
  { name: 'uighur', code: 'ug', native: 'ئۇيغۇرچە' },
  
  // European Languages
  { name: 'italian', code: 'it', native: 'Italiano' },
  { name: 'dutch', code: 'nl', native: 'Nederlands' },
  { name: 'polish', code: 'pl', native: 'Polski' },
  { name: 'ukrainian', code: 'uk', native: 'Українська' },
  { name: 'czech', code: 'cs', native: 'Čeština' },
  { name: 'romanian', code: 'ro', native: 'Română' },
  { name: 'hungarian', code: 'hu', native: 'Magyar' },
  { name: 'swedish', code: 'sv', native: 'Svenska' },
  { name: 'danish', code: 'da', native: 'Dansk' },
  { name: 'finnish', code: 'fi', native: 'Suomi' },
  { name: 'norwegian', code: 'no', native: 'Norsk' },
  { name: 'greek', code: 'el', native: 'Ελληνικά' },
  { name: 'bulgarian', code: 'bg', native: 'Български' },
  { name: 'croatian', code: 'hr', native: 'Hrvatski' },
  { name: 'serbian', code: 'sr', native: 'Српски' },
  { name: 'slovak', code: 'sk', native: 'Slovenčina' },
  { name: 'slovenian', code: 'sl', native: 'Slovenščina' },
  { name: 'lithuanian', code: 'lt', native: 'Lietuvių' },
  { name: 'latvian', code: 'lv', native: 'Latviešu' },
  { name: 'estonian', code: 'et', native: 'Eesti' },
  { name: 'belarusian', code: 'be', native: 'Беларуская' },
  { name: 'bosnian', code: 'bs', native: 'Bosanski' },
  { name: 'macedonian', code: 'mk', native: 'Македонски' },
  { name: 'albanian', code: 'sq', native: 'Shqip' },
  { name: 'icelandic', code: 'is', native: 'Íslenska' },
  { name: 'irish', code: 'ga', native: 'Gaeilge' },
  { name: 'welsh', code: 'cy', native: 'Cymraeg' },
  { name: 'scottish_gaelic', code: 'gd', native: 'Gàidhlig' },
  { name: 'basque', code: 'eu', native: 'Euskara' },
  { name: 'catalan', code: 'ca', native: 'Català' },
  { name: 'galician', code: 'gl', native: 'Galego' },
  { name: 'maltese', code: 'mt', native: 'Malti' },
  { name: 'luxembourgish', code: 'lb', native: 'Lëtzebuergesch' },
  { name: 'faroese', code: 'fo', native: 'Føroyskt' },
  { name: 'romansh', code: 'rm', native: 'Rumantsch' },
  { name: 'occitan', code: 'oc', native: 'Occitan' },
  { name: 'breton', code: 'br', native: 'Brezhoneg' },
  { name: 'corsican', code: 'co', native: 'Corsu' },
  { name: 'frisian', code: 'fy', native: 'Frysk' },
  
  // Caucasian Languages
  { name: 'georgian', code: 'ka', native: 'ქართული' },
  { name: 'armenian', code: 'hy', native: 'Հայերdelays' },
  { name: 'chechen', code: 'ce', native: 'Нохчийн' },
  { name: 'avar', code: 'av', native: 'Магӏарул мацӏ' },
  { name: 'lezgian', code: 'lez', native: 'Лезги чӏал' },
  { name: 'abkhaz', code: 'ab', native: 'Аԥсуа' },
  { name: 'ossetian', code: 'os', native: 'Ирон' },
  
  // African Languages
  { name: 'swahili', code: 'sw', native: 'Kiswahili' },
  { name: 'amharic', code: 'am', native: 'አማርኛ' },
  { name: 'yoruba', code: 'yo', native: 'Yorùbá' },
  { name: 'igbo', code: 'ig', native: 'Igbo' },
  { name: 'hausa', code: 'ha', native: 'Hausa' },
  { name: 'zulu', code: 'zu', native: 'isiZulu' },
  { name: 'xhosa', code: 'xh', native: 'isiXhosa' },
  { name: 'afrikaans', code: 'af', native: 'Afrikaans' },
  { name: 'somali', code: 'so', native: 'Soomaali' },
  { name: 'oromo', code: 'om', native: 'Oromoo' },
  { name: 'tigrinya', code: 'ti', native: 'ትግርኛ' },
  { name: 'shona', code: 'sn', native: 'chiShona' },
  { name: 'setswana', code: 'tn', native: 'Setswana' },
  { name: 'sesotho', code: 'st', native: 'Sesotho' },
  { name: 'kinyarwanda', code: 'rw', native: 'Ikinyarwanda' },
  { name: 'kirundi', code: 'rn', native: 'Ikirundi' },
  { name: 'luganda', code: 'lg', native: 'Luganda' },
  { name: 'chichewa', code: 'ny', native: 'Chichewa' },
  { name: 'malagasy', code: 'mg', native: 'Malagasy' },
  { name: 'wolof', code: 'wo', native: 'Wolof' },
  { name: 'fulani', code: 'ff', native: 'Fulfulde' },
  { name: 'bambara', code: 'bm', native: 'Bamanankan' },
  { name: 'lingala', code: 'ln', native: 'Lingála' },
  { name: 'tsonga', code: 'ts', native: 'Xitsonga' },
  { name: 'venda', code: 've', native: 'Tshivenḓa' },
  { name: 'ndebele', code: 'nr', native: 'isiNdebele' },
  { name: 'swati', code: 'ss', native: 'SiSwati' },
  { name: 'twi', code: 'tw', native: 'Twi' },
  { name: 'ewe', code: 'ee', native: 'Eʋegbe' },
  { name: 'akan', code: 'ak', native: 'Akan' },
  { name: 'fon', code: 'fon', native: 'Fɔngbe' },
  { name: 'moore', code: 'mos', native: 'Mòoré' },
  { name: 'kikuyu', code: 'ki', native: 'Gĩkũyũ' },
  { name: 'luo', code: 'luo', native: 'Dholuo' },
  { name: 'tiv', code: 'tiv', native: 'Tiv' },
  { name: 'kanuri', code: 'kr', native: 'Kanuri' },
  { name: 'berber', code: 'ber', native: 'ⵜⴰⵎⴰⵣⵉⵖⵜ' },
  
  // American Languages
  { name: 'quechua', code: 'qu', native: 'Runasimi' },
  { name: 'guarani', code: 'gn', native: "Avañe'ẽ" },
  { name: 'aymara', code: 'ay', native: 'Aymar aru' },
  { name: 'nahuatl', code: 'nah', native: 'Nāhuatl' },
  { name: 'mayan', code: 'myn', native: 'Maya' },
  { name: 'mapudungun', code: 'arn', native: 'Mapudungun' },
  { name: 'cherokee', code: 'chr', native: 'ᏣᎳᎩ' },
  { name: 'navajo', code: 'nv', native: 'Diné bizaad' },
  { name: 'inuktitut', code: 'iu', native: 'ᐃᓄᒃᑎᑐᑦ' },
  { name: 'cree', code: 'cr', native: 'ᓀᐦᐃᔭᐍᐏᐣ' },
  { name: 'ojibwe', code: 'oj', native: 'ᐊᓂᔑᓈᐯᒧᐎᓐ' },
  { name: 'haitian_creole', code: 'ht', native: 'Kreyòl ayisyen' },
  { name: 'papiamento', code: 'pap', native: 'Papiamentu' },
  
  // Pacific Languages
  { name: 'hawaiian', code: 'haw', native: 'ʻŌlelo Hawaiʻi' },
  { name: 'maori', code: 'mi', native: 'Te Reo Māori' },
  { name: 'samoan', code: 'sm', native: 'Gagana Samoa' },
  { name: 'tongan', code: 'to', native: 'Lea faka-Tonga' },
  { name: 'fijian', code: 'fj', native: 'Vosa Vakaviti' },
  { name: 'tahitian', code: 'ty', native: 'Reo Tahiti' },
  { name: 'chamorro', code: 'ch', native: 'Chamoru' },
  { name: 'tok_pisin', code: 'tpi', native: 'Tok Pisin' },
  { name: 'bislama', code: 'bi', native: 'Bislama' },
  
  // Other Languages
  { name: 'esperanto', code: 'eo', native: 'Esperanto' },
  { name: 'interlingua', code: 'ia', native: 'Interlingua' },
  { name: 'latin', code: 'la', native: 'Latina' },
  { name: 'yiddish', code: 'yi', native: 'ייִדיש' },
  { name: 'ladino', code: 'lad', native: 'Judeo-Español' },
  { name: 'mongolian', code: 'mn', native: 'Монгол' },
];

// Language name to code mapping
export const LANGUAGE_TO_CODE: Record<string, string> = LANGUAGES.reduce(
  (acc, lang) => ({ ...acc, [lang.name]: lang.code }),
  {}
);

// Code to language name
export const CODE_TO_LANGUAGE: Record<string, string> = LANGUAGES.reduce(
  (acc, lang) => ({ ...acc, [lang.code]: lang.name }),
  {}
);

// Complete script patterns for auto-detection
const SCRIPT_PATTERNS: Array<{ regex: RegExp; script: string; language: string }> = [
  // South Asian scripts
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', language: 'hindi' },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', language: 'bengali' },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', language: 'tamil' },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', language: 'telugu' },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', language: 'kannada' },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', language: 'malayalam' },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', language: 'gujarati' },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', language: 'punjabi' },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', language: 'odia' },
  { regex: /[\u0D80-\u0DFF]/, script: 'Sinhala', language: 'sinhala' },
  { regex: /[\u0F00-\u0FFF]/, script: 'Tibetan', language: 'tibetan' },
  
  // East Asian scripts
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, script: 'Han', language: 'chinese' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', language: 'japanese' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, script: 'Hangul', language: 'korean' },
  
  // Southeast Asian scripts
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', language: 'thai' },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', language: 'lao' },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', language: 'burmese' },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', language: 'khmer' },
  { regex: /[\uA980-\uA9DF]/, script: 'Javanese', language: 'javanese' },
  { regex: /[\u1B00-\u1B7F]/, script: 'Balinese', language: 'balinese' },
  
  // Middle Eastern scripts
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, script: 'Arabic', language: 'arabic' },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', language: 'hebrew' },
  { regex: /[\u0700-\u074F]/, script: 'Syriac', language: 'syriac' },
  { regex: /[\u0780-\u07BF]/, script: 'Thaana', language: 'dhivehi' },
  
  // European scripts
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', language: 'russian' },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, script: 'Greek', language: 'greek' },
  
  // Caucasian scripts
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', language: 'georgian' },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', language: 'armenian' },
  
  // African scripts
  { regex: /[\u1200-\u137F\u1380-\u139F]/, script: 'Ethiopic', language: 'amharic' },
  { regex: /[\u2D30-\u2D7F]/, script: 'Tifinagh', language: 'berber' },
  { regex: /[\u07C0-\u07FF]/, script: 'Nko', language: 'bambara' },
  { regex: /[\uA6A0-\uA6FF]/, script: 'Bamum', language: 'bamum' },
  
  // Native American scripts
  { regex: /[\u1400-\u167F]/, script: 'Canadian Aboriginal', language: 'inuktitut' },
  { regex: /[\u13A0-\u13FF]/, script: 'Cherokee', language: 'cherokee' },
  
  // Other scripts
  { regex: /[\u1800-\u18AF]/, script: 'Mongolian', language: 'mongolian' },
];

// Language aliases for normalization
const LANGUAGE_ALIASES: Record<string, string> = {
  bangla: 'bengali',
  oriya: 'odia',
  farsi: 'persian',
  mandarin: 'chinese',
  cantonese: 'chinese',
  simplified_chinese: 'chinese',
  traditional_chinese: 'chinese',
  brazilian: 'portuguese',
  brazilian_portuguese: 'portuguese',
  mexican_spanish: 'spanish',
  castilian: 'spanish',
  flemish: 'dutch',
  burmese: 'myanmar',
  myanmar: 'burmese',
  khmer: 'cambodian',
  cambodian: 'khmer',
  tagalog: 'filipino',
  pilipino: 'filipino',
};

/**
 * Detect script and language from text (auto-detection)
 */
export function detectScript(text: string): ScriptDetectionResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { script: 'Latin', language: 'english', isLatin: true, confidence: 1 };
  }

  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      const matches = trimmed.match(pattern.regex) || [];
      const confidence = Math.min(matches.length / trimmed.replace(/\s/g, '').length, 1);
      return {
        script: pattern.script,
        language: pattern.language,
        isLatin: false,
        confidence,
      };
    }
  }

  // Check Latin script (includes extended Latin for European languages)
  const latinChars = trimmed.match(/[a-zA-ZÀ-ÿĀ-žƀ-ɏ]/g) || [];
  const totalChars = trimmed.replace(/\s/g, '').length;
  const isLatin = totalChars > 0 && latinChars.length / totalChars > 0.5;

  return {
    script: 'Latin',
    language: 'english',
    isLatin,
    confidence: isLatin ? latinChars.length / totalChars : 0.5,
  };
}

/**
 * Auto-detect language from text
 */
export function detectLanguage(text: string): string {
  return detectScript(text).language;
}

/**
 * Check if text is Latin script
 */
export function isLatinScript(text: string): boolean {
  return detectScript(text).isLatin;
}

/**
 * Normalize language name
 */
export function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim().replace(/[-_]/g, '_');
  return LANGUAGE_ALIASES[normalized] || normalized;
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

/**
 * Get language code from name
 */
export function getCode(language: string): string {
  const normalized = normalizeLanguage(language);
  return LANGUAGE_TO_CODE[normalized] || 'en';
}

/**
 * Get language name from code
 */
export function getLanguage(code: string): string {
  return CODE_TO_LANGUAGE[code] || 'english';
}

/**
 * Get native name for a language
 */
export function getNativeName(language: string): string {
  const normalized = normalizeLanguage(language);
  const lang = LANGUAGES.find(l => l.name === normalized);
  return lang?.native || language;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): LanguageInfo[] {
  return [...LANGUAGES];
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return LANGUAGES.some(l => l.name === normalized || l.code === normalized);
}

/**
 * Search languages by name, code, or native name
 */
export function searchLanguages(query: string): LanguageInfo[] {
  const q = query.toLowerCase().trim();
  if (!q) return LANGUAGES;
  
  return LANGUAGES.filter(lang => 
    lang.name.includes(q) || 
    lang.code.includes(q) || 
    lang.native.toLowerCase().includes(q)
  );
}

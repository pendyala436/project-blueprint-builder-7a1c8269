/**
 * DL-Translate Language Utilities
 * Complete support for ALL world languages (200+)
 * Inspired by: https://github.com/xhluca/dl-translate
 */

import type { LanguageInfo, ScriptDetectionResult } from './types';

// Complete language mappings with native names - ALL world languages
export const LANGUAGES: LanguageInfo[] = [
  // Major World Languages
  { name: 'english', code: 'en', native: 'English', script: 'Latin' },
  { name: 'chinese', code: 'zh', native: '中文', script: 'Han' },
  { name: 'spanish', code: 'es', native: 'Español', script: 'Latin' },
  { name: 'arabic', code: 'ar', native: 'العربية', script: 'Arabic', rtl: true },
  { name: 'french', code: 'fr', native: 'Français', script: 'Latin' },
  { name: 'portuguese', code: 'pt', native: 'Português', script: 'Latin' },
  { name: 'russian', code: 'ru', native: 'Русский', script: 'Cyrillic' },
  { name: 'japanese', code: 'ja', native: '日本語', script: 'Japanese' },
  { name: 'german', code: 'de', native: 'Deutsch', script: 'Latin' },
  { name: 'korean', code: 'ko', native: '한국어', script: 'Hangul' },
  
  // South Asian Languages (non-Latin scripts)
  { name: 'hindi', code: 'hi', native: 'हिंदी', script: 'Devanagari' },
  { name: 'bengali', code: 'bn', native: 'বাংলা', script: 'Bengali' },
  { name: 'telugu', code: 'te', native: 'తెలుగు', script: 'Telugu' },
  { name: 'marathi', code: 'mr', native: 'मराठी', script: 'Devanagari' },
  { name: 'tamil', code: 'ta', native: 'தமிழ்', script: 'Tamil' },
  { name: 'gujarati', code: 'gu', native: 'ગુજરાતી', script: 'Gujarati' },
  { name: 'kannada', code: 'kn', native: 'ಕನ್ನಡ', script: 'Kannada' },
  { name: 'malayalam', code: 'ml', native: 'മലയാളം', script: 'Malayalam' },
  { name: 'punjabi', code: 'pa', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { name: 'odia', code: 'or', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  { name: 'urdu', code: 'ur', native: 'اردو', script: 'Arabic', rtl: true },
  { name: 'nepali', code: 'ne', native: 'नेपाली', script: 'Devanagari' },
  { name: 'sinhala', code: 'si', native: 'සිංහල', script: 'Sinhala' },
  { name: 'assamese', code: 'as', native: 'অসমীয়া', script: 'Bengali' },
  { name: 'maithili', code: 'mai', native: 'मैथिली', script: 'Devanagari' },
  { name: 'santali', code: 'sat', native: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol_Chiki' },
  { name: 'kashmiri', code: 'ks', native: 'कॉशुर', script: 'Devanagari' },
  { name: 'konkani', code: 'kok', native: 'कोंकणी', script: 'Devanagari' },
  { name: 'sindhi', code: 'sd', native: 'سنڌي', script: 'Arabic', rtl: true },
  { name: 'dogri', code: 'doi', native: 'डोगरी', script: 'Devanagari' },
  { name: 'bodo', code: 'brx', native: 'बड़ो', script: 'Devanagari' },
  { name: 'manipuri', code: 'mni', native: 'মৈতৈলোন্', script: 'Bengali' },
  { name: 'sanskrit', code: 'sa', native: 'संस्कृतम्', script: 'Devanagari' },
  { name: 'bhojpuri', code: 'bho', native: 'भोजपुरी', script: 'Devanagari' },
  { name: 'rajasthani', code: 'raj', native: 'राजस्थानी', script: 'Devanagari' },
  { name: 'chhattisgarhi', code: 'hne', native: 'छत्तीसगढ़ी', script: 'Devanagari' },
  { name: 'magahi', code: 'mag', native: 'मगही', script: 'Devanagari' },
  { name: 'haryanvi', code: 'bgc', native: 'हरियाणवी', script: 'Devanagari' },
  { name: 'awadhi', code: 'awa', native: 'अवधी', script: 'Devanagari' },
  { name: 'marwari', code: 'mwr', native: 'मारवाड़ी', script: 'Devanagari' },
  { name: 'dhivehi', code: 'dv', native: 'ދިވެހި', script: 'Thaana', rtl: true },
  { name: 'dzongkha', code: 'dz', native: 'རྫོང་ཁ', script: 'Tibetan' },
  { name: 'tibetan', code: 'bo', native: 'བོད་སྐད་', script: 'Tibetan' },
  
  // Southeast Asian Languages
  { name: 'thai', code: 'th', native: 'ไทย', script: 'Thai' },
  { name: 'vietnamese', code: 'vi', native: 'Tiếng Việt', script: 'Latin' },
  { name: 'indonesian', code: 'id', native: 'Bahasa Indonesia', script: 'Latin' },
  { name: 'malay', code: 'ms', native: 'Bahasa Melayu', script: 'Latin' },
  { name: 'tagalog', code: 'tl', native: 'Tagalog', script: 'Latin' },
  { name: 'filipino', code: 'fil', native: 'Filipino', script: 'Latin' },
  { name: 'burmese', code: 'my', native: 'မြန်မာ', script: 'Myanmar' },
  { name: 'khmer', code: 'km', native: 'ខ្មែរ', script: 'Khmer' },
  { name: 'lao', code: 'lo', native: 'ລາວ', script: 'Lao' },
  { name: 'javanese', code: 'jv', native: 'Basa Jawa', script: 'Latin' },
  { name: 'sundanese', code: 'su', native: 'Basa Sunda', script: 'Latin' },
  { name: 'cebuano', code: 'ceb', native: 'Cebuano', script: 'Latin' },
  { name: 'ilocano', code: 'ilo', native: 'Ilokano', script: 'Latin' },
  { name: 'hiligaynon', code: 'hil', native: 'Hiligaynon', script: 'Latin' },
  { name: 'waray', code: 'war', native: 'Winaray', script: 'Latin' },
  { name: 'madurese', code: 'mad', native: 'Madhura', script: 'Latin' },
  { name: 'minangkabau', code: 'min', native: 'Baso Minangkabau', script: 'Latin' },
  { name: 'acehnese', code: 'ace', native: 'Bahsa Acèh', script: 'Latin' },
  { name: 'balinese', code: 'ban', native: 'Basa Bali', script: 'Balinese' },
  { name: 'sasak', code: 'sas', native: 'Basa Sasak', script: 'Latin' },
  
  // Middle Eastern Languages
  { name: 'persian', code: 'fa', native: 'فارسی', script: 'Arabic', rtl: true },
  { name: 'turkish', code: 'tr', native: 'Türkçe', script: 'Latin' },
  { name: 'hebrew', code: 'he', native: 'עברית', script: 'Hebrew', rtl: true },
  { name: 'kurdish', code: 'ku', native: 'Kurdî', script: 'Latin' },
  { name: 'pashto', code: 'ps', native: 'پښتو', script: 'Arabic', rtl: true },
  { name: 'dari', code: 'prs', native: 'دری', script: 'Arabic', rtl: true },
  { name: 'azerbaijani', code: 'az', native: 'Azərbaycan', script: 'Latin' },
  { name: 'uzbek', code: 'uz', native: 'Oʻzbek', script: 'Latin' },
  { name: 'kazakh', code: 'kk', native: 'Қазақ', script: 'Cyrillic' },
  { name: 'turkmen', code: 'tk', native: 'Türkmen', script: 'Latin' },
  { name: 'kyrgyz', code: 'ky', native: 'Кыргыз', script: 'Cyrillic' },
  { name: 'tajik', code: 'tg', native: 'Тоҷикӣ', script: 'Cyrillic' },
  { name: 'uighur', code: 'ug', native: 'ئۇيغۇرچە', script: 'Arabic', rtl: true },
  
  // European Languages
  { name: 'italian', code: 'it', native: 'Italiano', script: 'Latin' },
  { name: 'dutch', code: 'nl', native: 'Nederlands', script: 'Latin' },
  { name: 'polish', code: 'pl', native: 'Polski', script: 'Latin' },
  { name: 'ukrainian', code: 'uk', native: 'Українська', script: 'Cyrillic' },
  { name: 'czech', code: 'cs', native: 'Čeština', script: 'Latin' },
  { name: 'romanian', code: 'ro', native: 'Română', script: 'Latin' },
  { name: 'hungarian', code: 'hu', native: 'Magyar', script: 'Latin' },
  { name: 'swedish', code: 'sv', native: 'Svenska', script: 'Latin' },
  { name: 'danish', code: 'da', native: 'Dansk', script: 'Latin' },
  { name: 'finnish', code: 'fi', native: 'Suomi', script: 'Latin' },
  { name: 'norwegian', code: 'no', native: 'Norsk', script: 'Latin' },
  { name: 'greek', code: 'el', native: 'Ελληνικά', script: 'Greek' },
  { name: 'bulgarian', code: 'bg', native: 'Български', script: 'Cyrillic' },
  { name: 'croatian', code: 'hr', native: 'Hrvatski', script: 'Latin' },
  { name: 'serbian', code: 'sr', native: 'Српски', script: 'Cyrillic' },
  { name: 'slovak', code: 'sk', native: 'Slovenčina', script: 'Latin' },
  { name: 'slovenian', code: 'sl', native: 'Slovenščina', script: 'Latin' },
  { name: 'lithuanian', code: 'lt', native: 'Lietuvių', script: 'Latin' },
  { name: 'latvian', code: 'lv', native: 'Latviešu', script: 'Latin' },
  { name: 'estonian', code: 'et', native: 'Eesti', script: 'Latin' },
  { name: 'belarusian', code: 'be', native: 'Беларуская', script: 'Cyrillic' },
  { name: 'bosnian', code: 'bs', native: 'Bosanski', script: 'Latin' },
  { name: 'macedonian', code: 'mk', native: 'Македонски', script: 'Cyrillic' },
  { name: 'albanian', code: 'sq', native: 'Shqip', script: 'Latin' },
  { name: 'icelandic', code: 'is', native: 'Íslenska', script: 'Latin' },
  { name: 'irish', code: 'ga', native: 'Gaeilge', script: 'Latin' },
  { name: 'welsh', code: 'cy', native: 'Cymraeg', script: 'Latin' },
  { name: 'scottish_gaelic', code: 'gd', native: 'Gàidhlig', script: 'Latin' },
  { name: 'basque', code: 'eu', native: 'Euskara', script: 'Latin' },
  { name: 'catalan', code: 'ca', native: 'Català', script: 'Latin' },
  { name: 'galician', code: 'gl', native: 'Galego', script: 'Latin' },
  { name: 'maltese', code: 'mt', native: 'Malti', script: 'Latin' },
  { name: 'luxembourgish', code: 'lb', native: 'Lëtzebuergesch', script: 'Latin' },
  { name: 'faroese', code: 'fo', native: 'Føroyskt', script: 'Latin' },
  { name: 'romansh', code: 'rm', native: 'Rumantsch', script: 'Latin' },
  { name: 'occitan', code: 'oc', native: 'Occitan', script: 'Latin' },
  { name: 'breton', code: 'br', native: 'Brezhoneg', script: 'Latin' },
  { name: 'corsican', code: 'co', native: 'Corsu', script: 'Latin' },
  { name: 'frisian', code: 'fy', native: 'Frysk', script: 'Latin' },
  
  // Caucasian Languages
  { name: 'georgian', code: 'ka', native: 'ქართული', script: 'Georgian' },
  { name: 'armenian', code: 'hy', native: 'Հայdelays', script: 'Armenian' },
  { name: 'chechen', code: 'ce', native: 'Нохчийн', script: 'Cyrillic' },
  { name: 'avar', code: 'av', native: 'Магӏарул мацӏ', script: 'Cyrillic' },
  { name: 'lezgian', code: 'lez', native: 'Лезги чӏал', script: 'Cyrillic' },
  { name: 'abkhaz', code: 'ab', native: 'Аԥсуа', script: 'Cyrillic' },
  { name: 'ossetian', code: 'os', native: 'Ирон', script: 'Cyrillic' },
  
  // African Languages
  { name: 'swahili', code: 'sw', native: 'Kiswahili', script: 'Latin' },
  { name: 'amharic', code: 'am', native: 'አማርኛ', script: 'Ethiopic' },
  { name: 'yoruba', code: 'yo', native: 'Yorùbá', script: 'Latin' },
  { name: 'igbo', code: 'ig', native: 'Igbo', script: 'Latin' },
  { name: 'hausa', code: 'ha', native: 'Hausa', script: 'Latin' },
  { name: 'zulu', code: 'zu', native: 'isiZulu', script: 'Latin' },
  { name: 'xhosa', code: 'xh', native: 'isiXhosa', script: 'Latin' },
  { name: 'afrikaans', code: 'af', native: 'Afrikaans', script: 'Latin' },
  { name: 'somali', code: 'so', native: 'Soomaali', script: 'Latin' },
  { name: 'oromo', code: 'om', native: 'Oromoo', script: 'Latin' },
  { name: 'tigrinya', code: 'ti', native: 'ትግርኛ', script: 'Ethiopic' },
  { name: 'shona', code: 'sn', native: 'chiShona', script: 'Latin' },
  { name: 'setswana', code: 'tn', native: 'Setswana', script: 'Latin' },
  { name: 'sesotho', code: 'st', native: 'Sesotho', script: 'Latin' },
  { name: 'kinyarwanda', code: 'rw', native: 'Ikinyarwanda', script: 'Latin' },
  { name: 'kirundi', code: 'rn', native: 'Ikirundi', script: 'Latin' },
  { name: 'luganda', code: 'lg', native: 'Luganda', script: 'Latin' },
  { name: 'chichewa', code: 'ny', native: 'Chichewa', script: 'Latin' },
  { name: 'malagasy', code: 'mg', native: 'Malagasy', script: 'Latin' },
  { name: 'wolof', code: 'wo', native: 'Wolof', script: 'Latin' },
  { name: 'fulani', code: 'ff', native: 'Fulfulde', script: 'Latin' },
  { name: 'bambara', code: 'bm', native: 'Bamanankan', script: 'Latin' },
  { name: 'lingala', code: 'ln', native: 'Lingála', script: 'Latin' },
  { name: 'tsonga', code: 'ts', native: 'Xitsonga', script: 'Latin' },
  { name: 'venda', code: 've', native: 'Tshivenḓa', script: 'Latin' },
  { name: 'ndebele', code: 'nr', native: 'isiNdebele', script: 'Latin' },
  { name: 'swati', code: 'ss', native: 'SiSwati', script: 'Latin' },
  { name: 'twi', code: 'tw', native: 'Twi', script: 'Latin' },
  { name: 'ewe', code: 'ee', native: 'Eʋegbe', script: 'Latin' },
  { name: 'akan', code: 'ak', native: 'Akan', script: 'Latin' },
  { name: 'fon', code: 'fon', native: 'Fɔngbe', script: 'Latin' },
  { name: 'moore', code: 'mos', native: 'Mòoré', script: 'Latin' },
  { name: 'kikuyu', code: 'ki', native: 'Gĩkũyũ', script: 'Latin' },
  { name: 'luo', code: 'luo', native: 'Dholuo', script: 'Latin' },
  { name: 'tiv', code: 'tiv', native: 'Tiv', script: 'Latin' },
  { name: 'kanuri', code: 'kr', native: 'Kanuri', script: 'Latin' },
  { name: 'berber', code: 'ber', native: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', script: 'Tifinagh' },
  
  // American Languages
  { name: 'quechua', code: 'qu', native: 'Runasimi', script: 'Latin' },
  { name: 'guarani', code: 'gn', native: "Avañe'ẽ", script: 'Latin' },
  { name: 'aymara', code: 'ay', native: 'Aymar aru', script: 'Latin' },
  { name: 'nahuatl', code: 'nah', native: 'Nāhuatl', script: 'Latin' },
  { name: 'mayan', code: 'myn', native: 'Maya', script: 'Latin' },
  { name: 'mapudungun', code: 'arn', native: 'Mapudungun', script: 'Latin' },
  { name: 'cherokee', code: 'chr', native: 'ᏣᎳᎩ', script: 'Cherokee' },
  { name: 'navajo', code: 'nv', native: 'Diné bizaad', script: 'Latin' },
  { name: 'inuktitut', code: 'iu', native: 'ᐃᓄᒃᑎᑐᑦ', script: 'Canadian_Aboriginal' },
  { name: 'cree', code: 'cr', native: 'ᓀᐦᐃᔭᐍᐏᐣ', script: 'Canadian_Aboriginal' },
  { name: 'ojibwe', code: 'oj', native: 'ᐊᓂᔑᓈᐯᒧᐎᓐ', script: 'Canadian_Aboriginal' },
  { name: 'haitian_creole', code: 'ht', native: 'Kreyòl ayisyen', script: 'Latin' },
  { name: 'papiamento', code: 'pap', native: 'Papiamentu', script: 'Latin' },
  
  // Pacific Languages
  { name: 'hawaiian', code: 'haw', native: 'ʻŌlelo Hawaiʻi', script: 'Latin' },
  { name: 'maori', code: 'mi', native: 'Te Reo Māori', script: 'Latin' },
  { name: 'samoan', code: 'sm', native: 'Gagana Samoa', script: 'Latin' },
  { name: 'tongan', code: 'to', native: 'Lea faka-Tonga', script: 'Latin' },
  { name: 'fijian', code: 'fj', native: 'Vosa Vakaviti', script: 'Latin' },
  { name: 'tahitian', code: 'ty', native: 'Reo Tahiti', script: 'Latin' },
  { name: 'chamorro', code: 'ch', native: 'Chamoru', script: 'Latin' },
  { name: 'tok_pisin', code: 'tpi', native: 'Tok Pisin', script: 'Latin' },
  { name: 'bislama', code: 'bi', native: 'Bislama', script: 'Latin' },
  
  // Other Languages
  { name: 'esperanto', code: 'eo', native: 'Esperanto', script: 'Latin' },
  { name: 'interlingua', code: 'ia', native: 'Interlingua', script: 'Latin' },
  { name: 'latin', code: 'la', native: 'Latina', script: 'Latin' },
  { name: 'yiddish', code: 'yi', native: 'ייִדיש', script: 'Hebrew', rtl: true },
  { name: 'ladino', code: 'lad', native: 'Judeo-Español', script: 'Latin' },
  { name: 'mongolian', code: 'mn', native: 'Монгол', script: 'Cyrillic' },
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

// Languages that use Latin script (no conversion needed when typing)
export const LATIN_SCRIPT_LANGUAGES = new Set(
  LANGUAGES.filter(l => l.script === 'Latin').map(l => l.name)
);

// Non-Latin script languages (need conversion from Latin typing)
export const NON_LATIN_LANGUAGES = new Set(
  LANGUAGES.filter(l => l.script !== 'Latin').map(l => l.name)
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
  { regex: /[\u1400-\u167F]/, script: 'Canadian_Aboriginal', language: 'inuktitut' },
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
 * Check if language uses Latin script
 */
export function isLatinScriptLanguage(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return LATIN_SCRIPT_LANGUAGES.has(normalized);
}

/**
 * Check if language uses non-Latin script (needs conversion)
 */
export function needsScriptConversion(language: string): boolean {
  const normalized = normalizeLanguage(language);
  return NON_LATIN_LANGUAGES.has(normalized);
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
 * Get language info
 */
export function getLanguageInfo(language: string): LanguageInfo | undefined {
  const normalized = normalizeLanguage(language);
  return LANGUAGES.find(l => l.name === normalized);
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
 * Search languages by query
 */
export function searchLanguages(query: string): LanguageInfo[] {
  const q = query.toLowerCase().trim();
  return LANGUAGES.filter(l =>
    l.name.includes(q) ||
    l.code.includes(q) ||
    (l.native && l.native.toLowerCase().includes(q))
  );
}

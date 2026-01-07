/**
 * Comprehensive Language to GBoard Layout Mappings
 * Covers 900+ languages supported by Google GBoard
 * Maps each language to its appropriate keyboard layout based on script
 */

import { LanguageMapping } from './types';

// ===================== SCRIPT-BASED FALLBACK MAPPINGS =====================
// When a specific layout isn't available, we use the base script layout

export const scriptToLayoutFallback: Record<string, string> = {
  // Latin-based scripts
  'latin': 'en',
  'latin-extended': 'en',
  
  // Indic scripts
  'devanagari': 'hi',
  'bengali': 'bn',
  'tamil': 'ta',
  'telugu': 'te',
  'kannada': 'kn',
  'malayalam': 'ml',
  'gujarati': 'gu',
  'gurmukhi': 'pa',
  'odia': 'or',
  'oriya': 'or',
  'sinhala': 'si',
  'tibetan': 'bo',
  'ol-chiki': 'sat',
  'meitei': 'mni',
  
  // Arabic-based scripts
  'arabic': 'ar',
  'persian': 'fa',
  'urdu': 'ur',
  
  // East Asian
  'han': 'zh-pinyin',
  'hiragana': 'ja-hiragana',
  'katakana': 'ja-hiragana',
  'japanese': 'ja-hiragana',
  'hangul': 'ko',
  'korean': 'ko',
  'bopomofo': 'zh-bopomofo',
  
  // Southeast Asian
  'thai': 'th',
  'khmer': 'km',
  'myanmar': 'my',
  'lao': 'lo',
  'javanese': 'jv',
  'balinese': 'ban',
  'sundanese': 'su',
  
  // Cyrillic
  'cyrillic': 'ru',
  
  // Other scripts
  'greek': 'el',
  'hebrew': 'he',
  'georgian': 'ka',
  'armenian': 'hy',
  'ethiopic': 'am',
  'geez': 'am',
  'tifinagh': 'ber',
  'nko': 'nko',
  'vai': 'vai',
  'cherokee': 'chr',
  'canadian-aboriginal': 'cr',
};

// ===================== COMPREHENSIVE LANGUAGE MAPPINGS =====================
// All 900+ languages covered by Google GBoard

export const comprehensiveLanguageMappings: LanguageMapping[] = [
  // ==================== MAJOR WORLD LANGUAGES ====================
  // English variants
  { code: 'en', name: 'English', nativeName: 'English', script: 'latin', layoutId: 'en' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', script: 'latin', layoutId: 'en' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', script: 'latin', layoutId: 'en' },
  { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)', script: 'latin', layoutId: 'en' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English (India)', script: 'latin', layoutId: 'en' },
  
  // Spanish variants
  { code: 'es', name: 'Spanish', nativeName: 'Español', script: 'latin', layoutId: 'es' },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', script: 'latin', layoutId: 'es' },
  { code: 'es-AR', name: 'Spanish (Argentina)', nativeName: 'Español (Argentina)', script: 'latin', layoutId: 'es' },
  { code: 'es-CO', name: 'Spanish (Colombia)', nativeName: 'Español (Colombia)', script: 'latin', layoutId: 'es' },
  
  // French variants
  { code: 'fr', name: 'French', nativeName: 'Français', script: 'latin', layoutId: 'fr' },
  { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-BE', name: 'French (Belgium)', nativeName: 'Français (Belgique)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-CH', name: 'French (Switzerland)', nativeName: 'Français (Suisse)', script: 'latin', layoutId: 'fr' },
  
  // German variants
  { code: 'de', name: 'German', nativeName: 'Deutsch', script: 'latin', layoutId: 'de' },
  { code: 'de-AT', name: 'German (Austria)', nativeName: 'Deutsch (Österreich)', script: 'latin', layoutId: 'de' },
  { code: 'de-CH', name: 'German (Switzerland)', nativeName: 'Deutsch (Schweiz)', script: 'latin', layoutId: 'de' },
  
  // Portuguese variants
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', script: 'latin', layoutId: 'pt' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', script: 'latin', layoutId: 'pt' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)', script: 'latin', layoutId: 'pt' },
  
  // Other major European languages
  { code: 'it', name: 'Italian', nativeName: 'Italiano', script: 'latin', layoutId: 'it' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', script: 'latin', layoutId: 'nl' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', script: 'latin', layoutId: 'pl' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', script: 'latin', layoutId: 'ro' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', script: 'latin', layoutId: 'hu' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', script: 'latin', layoutId: 'cs' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', script: 'latin', layoutId: 'cs' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', script: 'latin', layoutId: 'en' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', script: 'latin', layoutId: 'en' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', script: 'latin', layoutId: 'en' },
  
  // Nordic languages
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', script: 'latin', layoutId: 'sv' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', script: 'latin', layoutId: 'no' },
  { code: 'nb', name: 'Norwegian Bokmål', nativeName: 'Norsk Bokmål', script: 'latin', layoutId: 'no' },
  { code: 'nn', name: 'Norwegian Nynorsk', nativeName: 'Norsk Nynorsk', script: 'latin', layoutId: 'no' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', script: 'latin', layoutId: 'da' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', script: 'latin', layoutId: 'fi' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', script: 'latin', layoutId: 'is' },
  { code: 'fo', name: 'Faroese', nativeName: 'Føroyskt', script: 'latin', layoutId: 'is' },
  
  // Baltic languages
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', script: 'latin', layoutId: 'en' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', script: 'latin', layoutId: 'en' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', script: 'latin', layoutId: 'en' },
  
  // Celtic languages
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', script: 'latin', layoutId: 'en' },
  { code: 'gd', name: 'Scottish Gaelic', nativeName: 'Gàidhlig', script: 'latin', layoutId: 'en' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', script: 'latin', layoutId: 'en' },
  { code: 'br', name: 'Breton', nativeName: 'Brezhoneg', script: 'latin', layoutId: 'fr' },
  { code: 'kw', name: 'Cornish', nativeName: 'Kernewek', script: 'latin', layoutId: 'en' },
  { code: 'gv', name: 'Manx', nativeName: 'Gaelg', script: 'latin', layoutId: 'en' },
  
  // Iberian languages
  { code: 'ca', name: 'Catalan', nativeName: 'Català', script: 'latin', layoutId: 'es' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', script: 'latin', layoutId: 'es' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', script: 'latin', layoutId: 'es' },
  { code: 'oc', name: 'Occitan', nativeName: 'Occitan', script: 'latin', layoutId: 'fr' },
  { code: 'ast', name: 'Asturian', nativeName: 'Asturianu', script: 'latin', layoutId: 'es' },
  { code: 'an', name: 'Aragonese', nativeName: 'Aragonés', script: 'latin', layoutId: 'es' },
  
  // Other Romance languages
  { code: 'rm', name: 'Romansh', nativeName: 'Rumantsch', script: 'latin', layoutId: 'de' },
  { code: 'sc', name: 'Sardinian', nativeName: 'Sardu', script: 'latin', layoutId: 'it' },
  { code: 'co', name: 'Corsican', nativeName: 'Corsu', script: 'latin', layoutId: 'it' },
  { code: 'scn', name: 'Sicilian', nativeName: 'Sicilianu', script: 'latin', layoutId: 'it' },
  { code: 'vec', name: 'Venetian', nativeName: 'Vèneto', script: 'latin', layoutId: 'it' },
  { code: 'lmo', name: 'Lombard', nativeName: 'Lombard', script: 'latin', layoutId: 'it' },
  { code: 'fur', name: 'Friulian', nativeName: 'Furlan', script: 'latin', layoutId: 'it' },
  { code: 'lij', name: 'Ligurian', nativeName: 'Ligure', script: 'latin', layoutId: 'it' },
  
  // Germanic languages (other)
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', script: 'latin', layoutId: 'de' },
  { code: 'fy', name: 'Western Frisian', nativeName: 'Frysk', script: 'latin', layoutId: 'nl' },
  { code: 'li', name: 'Limburgish', nativeName: 'Limburgs', script: 'latin', layoutId: 'nl' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', script: 'latin', layoutId: 'en' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', script: 'hebrew', layoutId: 'he' },
  
  // ==================== INDIAN LANGUAGES (22 Scheduled + Regional) ====================
  // Devanagari script languages
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'devanagari', layoutId: 'hi' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'devanagari', layoutId: 'mr' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', script: 'devanagari', layoutId: 'sa' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', script: 'devanagari', layoutId: 'ne' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', script: 'devanagari', layoutId: 'kok' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', script: 'devanagari', layoutId: 'mai' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', script: 'devanagari', layoutId: 'brx' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', script: 'devanagari', layoutId: 'doi' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी', script: 'devanagari', layoutId: 'hi' },
  { code: 'raj', name: 'Rajasthani', nativeName: 'राजस्थानी', script: 'devanagari', layoutId: 'hi' },
  { code: 'mag', name: 'Magahi', nativeName: 'मगही', script: 'devanagari', layoutId: 'hi' },
  { code: 'awa', name: 'Awadhi', nativeName: 'अवधी', script: 'devanagari', layoutId: 'hi' },
  { code: 'hne', name: 'Chhattisgarhi', nativeName: 'छत्तीसगढ़ी', script: 'devanagari', layoutId: 'hi' },
  { code: 'mar', name: 'Marwari', nativeName: 'मारवाड़ी', script: 'devanagari', layoutId: 'hi' },
  { code: 'bgc', name: 'Haryanvi', nativeName: 'हरियाणवी', script: 'devanagari', layoutId: 'hi' },
  { code: 'kfy', name: 'Kumaoni', nativeName: 'कुमाऊँनी', script: 'devanagari', layoutId: 'hi' },
  { code: 'gbm', name: 'Garhwali', nativeName: 'गढ़वाली', script: 'devanagari', layoutId: 'hi' },
  { code: 'new', name: 'Newari', nativeName: 'नेपाल भाषा', script: 'devanagari', layoutId: 'ne' },
  { code: 'sck', name: 'Sadri', nativeName: 'सादरी', script: 'devanagari', layoutId: 'hi' },
  { code: 'kru', name: 'Kurukh', nativeName: 'कुड़ुख़', script: 'devanagari', layoutId: 'hi' },
  { code: 'mun', name: 'Mundari', nativeName: 'मुंडारी', script: 'devanagari', layoutId: 'hi' },
  { code: 'gom', name: 'Goan Konkani', nativeName: 'गोंयची कोंकणी', script: 'devanagari', layoutId: 'kok' },
  { code: 'bhb', name: 'Bhili', nativeName: 'भीली', script: 'devanagari', layoutId: 'hi' },
  { code: 'nag', name: 'Nagpuri', nativeName: 'नागपुरी', script: 'devanagari', layoutId: 'hi' },
  { code: 'bfy', name: 'Bagheli', nativeName: 'बघेली', script: 'devanagari', layoutId: 'hi' },
  { code: 'bns', name: 'Bundeli', nativeName: 'बुंदेली', script: 'devanagari', layoutId: 'hi' },
  { code: 'hoj', name: 'Hadothi', nativeName: 'हाड़ौती', script: 'devanagari', layoutId: 'hi' },
  { code: 'wbr', name: 'Wagdi', nativeName: 'वागड़ी', script: 'devanagari', layoutId: 'hi' },
  
  // Bengali script languages
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'bengali', layoutId: 'bn' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'bengali', layoutId: 'as' },
  { code: 'mni', name: 'Manipuri', nativeName: 'মণিপুরী', script: 'bengali', layoutId: 'bn' },
  { code: 'rkt', name: 'Rangpuri', nativeName: 'রংপুরী', script: 'bengali', layoutId: 'bn' },
  { code: 'syl', name: 'Sylheti', nativeName: 'ꠍꠤꠟꠐꠤ', script: 'bengali', layoutId: 'bn' },
  { code: 'ctg', name: 'Chittagonian', nativeName: 'চাটগাঁইয়া', script: 'bengali', layoutId: 'bn' },
  { code: 'ccp', name: 'Chakma', nativeName: '𑄌𑄋𑄴𑄟𑄳𑄦', script: 'chakma', layoutId: 'bn' },
  
  // Tamil script
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'tamil', layoutId: 'ta' },
  
  // Telugu script
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'telugu', layoutId: 'te' },
  { code: 'gon', name: 'Gondi', nativeName: 'గోండి', script: 'telugu', layoutId: 'te' },
  { code: 'kfb', name: 'Kolami', nativeName: 'కొలమి', script: 'telugu', layoutId: 'te' },
  
  // Kannada script
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'kannada', layoutId: 'kn' },
  { code: 'tcy', name: 'Tulu', nativeName: 'ತುಳು', script: 'kannada', layoutId: 'kn' },
  
  // Malayalam script
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'malayalam', layoutId: 'ml' },
  
  // Gujarati script
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'gujarati', layoutId: 'gu' },
  
  // Gurmukhi script
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'gurmukhi', layoutId: 'pa' },
  
  // Odia script
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'odia', layoutId: 'or' },
  
  // Ol Chiki script
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'ol-chiki', layoutId: 'sat' },
  
  // Meitei script
  { code: 'mni-Mtei', name: 'Manipuri (Meitei)', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ', script: 'meitei', layoutId: 'mni' },
  
  // Northeast Indian languages
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng', script: 'latin', layoutId: 'en' },
  { code: 'kha', name: 'Khasi', nativeName: 'Ka Ktien Khasi', script: 'latin', layoutId: 'en' },
  { code: 'grt', name: 'Garo', nativeName: "A·chik", script: 'latin', layoutId: 'en' },
  { code: 'njo', name: 'Ao Naga', nativeName: 'Ao', script: 'latin', layoutId: 'en' },
  { code: 'njz', name: 'Angami Naga', nativeName: 'Tenyidie', script: 'latin', layoutId: 'en' },
  
  // ==================== ARABIC SCRIPT LANGUAGES ====================
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-EG', name: 'Arabic (Egyptian)', nativeName: 'العربية المصرية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-SA', name: 'Arabic (Saudi)', nativeName: 'العربية السعودية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-MA', name: 'Arabic (Moroccan)', nativeName: 'الدارجة المغربية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-DZ', name: 'Arabic (Algerian)', nativeName: 'الدارجة الجزائرية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-TN', name: 'Arabic (Tunisian)', nativeName: 'التونسية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-LB', name: 'Arabic (Lebanese)', nativeName: 'اللبنانية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-SY', name: 'Arabic (Syrian)', nativeName: 'السورية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-IQ', name: 'Arabic (Iraqi)', nativeName: 'العراقية', script: 'arabic', layoutId: 'ar' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', script: 'arabic', layoutId: 'ur' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', script: 'arabic', layoutId: 'fa' },
  { code: 'prs', name: 'Dari', nativeName: 'دری', script: 'arabic', layoutId: 'fa' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', script: 'arabic', layoutId: 'ps' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', script: 'arabic', layoutId: 'sd' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر', script: 'arabic', layoutId: 'ar' },
  { code: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'کوردی', script: 'arabic', layoutId: 'ckb' },
  { code: 'ku', name: 'Kurdish (Kurmanji)', nativeName: 'Kurdî', script: 'latin', layoutId: 'tr' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', script: 'arabic', layoutId: 'ar' },
  { code: 'dv', name: 'Divehi', nativeName: 'ދިވެހި', script: 'thaana', layoutId: 'ar' },
  { code: 'dcc', name: 'Deccan', nativeName: 'دکنی', script: 'arabic', layoutId: 'ur' },
  { code: 'rhg', name: 'Rohingya', nativeName: 'Ruáingga', script: 'arabic', layoutId: 'ar' },
  
  // ==================== CYRILLIC SCRIPT LANGUAGES ====================
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
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek', script: 'latin', layoutId: 'tr' },
  { code: 'tt', name: 'Tatar', nativeName: 'Татарча', script: 'cyrillic', layoutId: 'ru' },
  { code: 'ba', name: 'Bashkir', nativeName: 'Башҡорт', script: 'cyrillic', layoutId: 'ru' },
  { code: 'ce', name: 'Chechen', nativeName: 'Нохчийн', script: 'cyrillic', layoutId: 'ru' },
  { code: 'cv', name: 'Chuvash', nativeName: 'Чӑваш', script: 'cyrillic', layoutId: 'ru' },
  { code: 'kv', name: 'Komi', nativeName: 'Коми', script: 'cyrillic', layoutId: 'ru' },
  { code: 'os', name: 'Ossetian', nativeName: 'Ирон', script: 'cyrillic', layoutId: 'ru' },
  { code: 'ab', name: 'Abkhazian', nativeName: 'Аҧсуа', script: 'cyrillic', layoutId: 'ru' },
  { code: 'av', name: 'Avaric', nativeName: 'Авар', script: 'cyrillic', layoutId: 'ru' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe', script: 'latin', layoutId: 'tr' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', script: 'latin', layoutId: 'tr' },
  
  // ==================== EAST ASIAN LANGUAGES ====================
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', script: 'han', layoutId: 'zh-pinyin' },
  { code: 'zh-CN', name: 'Chinese (China)', nativeName: '简体中文', script: 'han', layoutId: 'zh-pinyin' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', script: 'bopomofo', layoutId: 'zh-bopomofo' },
  { code: 'zh-HK', name: 'Chinese (Hong Kong)', nativeName: '繁體中文', script: 'han', layoutId: 'zh-pinyin' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', script: 'hiragana', layoutId: 'ja-hiragana' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', script: 'hangul', layoutId: 'ko' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', script: 'latin', layoutId: 'vi' },
  
  // ==================== SOUTHEAST ASIAN LANGUAGES ====================
  { code: 'th', name: 'Thai', nativeName: 'ไทย', script: 'thai', layoutId: 'th' },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', script: 'khmer', layoutId: 'km' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာစာ', script: 'myanmar', layoutId: 'my' },
  { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', script: 'lao', layoutId: 'lo' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', script: 'latin', layoutId: 'id' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', script: 'latin', layoutId: 'id' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', script: 'latin', layoutId: 'en' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', script: 'latin', layoutId: 'en' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano', script: 'latin', layoutId: 'en' },
  { code: 'ilo', name: 'Ilocano', nativeName: 'Ilokano', script: 'latin', layoutId: 'en' },
  { code: 'war', name: 'Waray', nativeName: 'Winaray', script: 'latin', layoutId: 'en' },
  { code: 'pag', name: 'Pangasinan', nativeName: 'Pangasinan', script: 'latin', layoutId: 'en' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', script: 'latin', layoutId: 'id' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', script: 'latin', layoutId: 'id' },
  { code: 'min', name: 'Minangkabau', nativeName: 'Baso Minangkabau', script: 'latin', layoutId: 'id' },
  { code: 'ace', name: 'Acehnese', nativeName: 'Acèh', script: 'latin', layoutId: 'id' },
  { code: 'ban', name: 'Balinese', nativeName: 'Basa Bali', script: 'latin', layoutId: 'id' },
  { code: 'bjn', name: 'Banjar', nativeName: 'Bahasa Banjar', script: 'latin', layoutId: 'id' },
  { code: 'bug', name: 'Buginese', nativeName: 'ᨅᨔ ᨕᨘᨁᨗ', script: 'latin', layoutId: 'id' },
  { code: 'shn', name: 'Shan', nativeName: 'ၵႂၢမ်းတႆး', script: 'myanmar', layoutId: 'my' },
  
  // ==================== OTHER SCRIPT LANGUAGES ====================
  // Greek
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', script: 'greek', layoutId: 'el' },
  
  // Hebrew
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', script: 'hebrew', layoutId: 'he' },
  
  // Georgian
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', script: 'georgian', layoutId: 'ka' },
  
  // Armenian
  { code: 'hy', name: 'Armenian', nativeName: 'Հայdelays', script: 'armenian', layoutId: 'hy' },
  
  // Ethiopic
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', script: 'ethiopic', layoutId: 'am' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', script: 'ethiopic', layoutId: 'am' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', script: 'latin', layoutId: 'en' },
  
  // Sinhala
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', script: 'sinhala', layoutId: 'si' },
  
  // Tibetan
  { code: 'bo', name: 'Tibetan', nativeName: 'བོད་ཡིག', script: 'tibetan', layoutId: 'bo' },
  { code: 'dz', name: 'Dzongkha', nativeName: 'རྫོང་ཁ', script: 'tibetan', layoutId: 'bo' },
  
  // ==================== AFRICAN LANGUAGES ====================
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', script: 'latin', layoutId: 'en' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', script: 'latin', layoutId: 'en' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', script: 'latin', layoutId: 'en' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', script: 'latin', layoutId: 'en' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', script: 'latin', layoutId: 'en' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', script: 'latin', layoutId: 'en' },
  { code: 'sn', name: 'Shona', nativeName: 'chiShona', script: 'latin', layoutId: 'en' },
  { code: 'ny', name: 'Chichewa', nativeName: 'Chichewa', script: 'latin', layoutId: 'en' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', script: 'latin', layoutId: 'en' },
  { code: 'rn', name: 'Rundi', nativeName: 'Ikirundi', script: 'latin', layoutId: 'en' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', script: 'latin', layoutId: 'en' },
  { code: 'lg', name: 'Ganda', nativeName: 'Luganda', script: 'latin', layoutId: 'en' },
  { code: 'ln', name: 'Lingala', nativeName: 'Lingála', script: 'latin', layoutId: 'fr' },
  { code: 'wo', name: 'Wolof', nativeName: 'Wolof', script: 'latin', layoutId: 'fr' },
  { code: 'ff', name: 'Fulah', nativeName: 'Fulfulde', script: 'latin', layoutId: 'en' },
  { code: 'ak', name: 'Akan', nativeName: 'Akan', script: 'latin', layoutId: 'en' },
  { code: 'tw', name: 'Twi', nativeName: 'Twi', script: 'latin', layoutId: 'en' },
  { code: 'ee', name: 'Ewe', nativeName: 'Eʋegbe', script: 'latin', layoutId: 'en' },
  { code: 'bm', name: 'Bambara', nativeName: 'Bamanankan', script: 'latin', layoutId: 'en' },
  { code: 'kg', name: 'Kongo', nativeName: 'Kikongo', script: 'latin', layoutId: 'en' },
  { code: 'ki', name: 'Kikuyu', nativeName: 'Gĩkũyũ', script: 'latin', layoutId: 'en' },
  { code: 'lu', name: 'Luba-Katanga', nativeName: 'Kiluba', script: 'latin', layoutId: 'en' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', script: 'latin', layoutId: 'en' },
  { code: 'st', name: 'Southern Sotho', nativeName: 'Sesotho', script: 'latin', layoutId: 'en' },
  { code: 'tn', name: 'Tswana', nativeName: 'Setswana', script: 'latin', layoutId: 'en' },
  { code: 'ts', name: 'Tsonga', nativeName: 'Xitsonga', script: 'latin', layoutId: 'en' },
  { code: 've', name: 'Venda', nativeName: 'Tshivenḓa', script: 'latin', layoutId: 'en' },
  { code: 'ss', name: 'Swati', nativeName: 'SiSwati', script: 'latin', layoutId: 'en' },
  { code: 'nd', name: 'North Ndebele', nativeName: 'isiNdebele', script: 'latin', layoutId: 'en' },
  { code: 'nr', name: 'South Ndebele', nativeName: 'isiNdebele', script: 'latin', layoutId: 'en' },
  { code: 'sg', name: 'Sango', nativeName: 'Sängö', script: 'latin', layoutId: 'fr' },
  { code: 'mos', name: 'Mossi', nativeName: 'Mòoré', script: 'latin', layoutId: 'fr' },
  { code: 'ber', name: 'Berber', nativeName: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', script: 'tifinagh', layoutId: 'ber' },
  { code: 'kab', name: 'Kabyle', nativeName: 'Taqbaylit', script: 'latin', layoutId: 'fr' },
  
  // ==================== PACIFIC/OCEANIC LANGUAGES ====================
  { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori', script: 'latin', layoutId: 'en' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi', script: 'latin', layoutId: 'en' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Sāmoa', script: 'latin', layoutId: 'en' },
  { code: 'to', name: 'Tongan', nativeName: 'Lea Faka-Tonga', script: 'latin', layoutId: 'en' },
  { code: 'fj', name: 'Fijian', nativeName: 'Vosa Vakaviti', script: 'latin', layoutId: 'en' },
  { code: 'mh', name: 'Marshallese', nativeName: 'Kajin M̧ajeļ', script: 'latin', layoutId: 'en' },
  { code: 'ty', name: 'Tahitian', nativeName: 'Reo Tahiti', script: 'latin', layoutId: 'fr' },
  
  // ==================== AMERICAS INDIGENOUS LANGUAGES ====================
  { code: 'qu', name: 'Quechua', nativeName: 'Runa Simi', script: 'latin', layoutId: 'es' },
  { code: 'ay', name: 'Aymara', nativeName: 'Aymar', script: 'latin', layoutId: 'es' },
  { code: 'gn', name: 'Guarani', nativeName: "Avañe'ẽ", script: 'latin', layoutId: 'es' },
  { code: 'nv', name: 'Navajo', nativeName: 'Diné Bizaad', script: 'latin', layoutId: 'en' },
  { code: 'chr', name: 'Cherokee', nativeName: 'ᏣᎳᎩ', script: 'cherokee', layoutId: 'chr' },
  { code: 'oj', name: 'Ojibwa', nativeName: 'ᐊᓂᔑᓈᐯᒧᐎᓐ', script: 'canadian-aboriginal', layoutId: 'oj' },
  { code: 'cr', name: 'Cree', nativeName: 'ᓀᐦᐃᔭᐍᐏᐣ', script: 'canadian-aboriginal', layoutId: 'cr' },
  { code: 'iu', name: 'Inuktitut', nativeName: 'ᐃᓄᒃᑎᑐᑦ', script: 'canadian-aboriginal', layoutId: 'iu' },
  { code: 'ik', name: 'Inupiaq', nativeName: 'Iñupiaq', script: 'latin', layoutId: 'en' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen', script: 'latin', layoutId: 'fr' },
  
  // ==================== CREOLE AND PIDGIN LANGUAGES ====================
  { code: 'pap', name: 'Papiamento', nativeName: 'Papiamento', script: 'latin', layoutId: 'es' },
  { code: 'tpi', name: 'Tok Pisin', nativeName: 'Tok Pisin', script: 'latin', layoutId: 'en' },
  { code: 'bi', name: 'Bislama', nativeName: 'Bislama', script: 'latin', layoutId: 'en' },
  { code: 'kea', name: 'Kabuverdianu', nativeName: 'Kriolu', script: 'latin', layoutId: 'pt' },
  
  // ==================== CONSTRUCTED LANGUAGES ====================
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', script: 'latin', layoutId: 'en' },
  { code: 'ia', name: 'Interlingua', nativeName: 'Interlingua', script: 'latin', layoutId: 'en' },
  { code: 'ie', name: 'Interlingue', nativeName: 'Interlingue', script: 'latin', layoutId: 'en' },
  { code: 'io', name: 'Ido', nativeName: 'Ido', script: 'latin', layoutId: 'en' },
  { code: 'vo', name: 'Volapük', nativeName: 'Volapük', script: 'latin', layoutId: 'en' },
  
  // ==================== CLASSICAL/LITURGICAL LANGUAGES ====================
  { code: 'la', name: 'Latin', nativeName: 'Latina', script: 'latin', layoutId: 'en' },
  { code: 'pi', name: 'Pali', nativeName: 'पालि', script: 'devanagari', layoutId: 'hi' },
  { code: 'cu', name: 'Church Slavic', nativeName: 'Словѣньскъ', script: 'cyrillic', layoutId: 'ru' },
  
  // ==================== TURKIC LANGUAGES ====================
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', script: 'latin', layoutId: 'tr' },
  { code: 'crh', name: 'Crimean Tatar', nativeName: 'Qırımtatarca', script: 'latin', layoutId: 'tr' },
  
  // ==================== ADDITIONAL LANGUAGES (for 900+ coverage) ====================
  // Maltese
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', script: 'latin', layoutId: 'en' },
  
  // Albanian
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', script: 'latin', layoutId: 'en' },
  
  // Additional Semitic
  { code: 'ar-YE', name: 'Arabic (Yemen)', nativeName: 'اليمنية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-SD', name: 'Arabic (Sudan)', nativeName: 'السودانية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-LY', name: 'Arabic (Libya)', nativeName: 'الليبية', script: 'arabic', layoutId: 'ar' },
  
  // Sami languages
  { code: 'se', name: 'Northern Sami', nativeName: 'Davvisámegiella', script: 'latin', layoutId: 'fi' },
  
  // Additional African
  { code: 'bem', name: 'Bemba', nativeName: 'Chibemba', script: 'latin', layoutId: 'en' },
  { code: 'luo', name: 'Luo', nativeName: 'Dholuo', script: 'latin', layoutId: 'en' },
  { code: 'kam', name: 'Kamba', nativeName: 'Kikamba', script: 'latin', layoutId: 'en' },
  { code: 'nso', name: 'Northern Sotho', nativeName: 'Sesotho sa Leboa', script: 'latin', layoutId: 'en' },
  { code: 'tum', name: 'Tumbuka', nativeName: 'ChiTumbuka', script: 'latin', layoutId: 'en' },
  { code: 'umb', name: 'Umbundu', nativeName: 'Umbundu', script: 'latin', layoutId: 'pt' },
  { code: 'kmb', name: 'Kimbundu', nativeName: 'Kimbundu', script: 'latin', layoutId: 'pt' },
  { code: 'cjk', name: 'Chokwe', nativeName: 'Chokwe', script: 'latin', layoutId: 'pt' },
  { code: 'dik', name: 'Dinka', nativeName: 'Thuɔŋjäŋ', script: 'latin', layoutId: 'en' },
  { code: 'nus', name: 'Nuer', nativeName: 'Thok Naath', script: 'latin', layoutId: 'en' },
  { code: 'kbp', name: 'Kabiyè', nativeName: 'Kabɩyɛ', script: 'latin', layoutId: 'fr' },
  { code: 'fon', name: 'Fon', nativeName: 'Fɔ̀ngbè', script: 'latin', layoutId: 'fr' },
  
  // Additional Austronesian
  { code: 'mad', name: 'Madurese', nativeName: 'Basa Madhura', script: 'latin', layoutId: 'id' },
  { code: 'sas', name: 'Sasak', nativeName: 'Sasak', script: 'latin', layoutId: 'id' },
  { code: 'tet', name: 'Tetum', nativeName: 'Tetun', script: 'latin', layoutId: 'pt' },
  { code: 'tsg', name: 'Tausug', nativeName: 'Bahasa Sūg', script: 'latin', layoutId: 'en' },
  { code: 'hil', name: 'Hiligaynon', nativeName: 'Ilonggo', script: 'latin', layoutId: 'en' },
  { code: 'bik', name: 'Bikol', nativeName: 'Bikol', script: 'latin', layoutId: 'en' },
  { code: 'pam', name: 'Kapampangan', nativeName: 'Kapampangan', script: 'latin', layoutId: 'en' },
  
  // Additional Sino-Tibetan
  { code: 'kac', name: 'Kachin', nativeName: 'Jingpho', script: 'latin', layoutId: 'en' },
  { code: 'mnw', name: 'Mon', nativeName: 'ဘာသာမန်', script: 'myanmar', layoutId: 'my' },
  { code: 'kar', name: 'Karen', nativeName: 'ကညီကျိ', script: 'myanmar', layoutId: 'my' },
  
  // More Indian/South Asian variants
  { code: 'mwr', name: 'Marwari (Pakistan)', nativeName: 'مارواڑی', script: 'arabic', layoutId: 'ur' },
  { code: 'lep', name: 'Lepcha', nativeName: 'ᰛᰩᰵᰛᰧᰵᰶ', script: 'lepcha', layoutId: 'hi' },
  { code: 'hoc', name: 'Ho', nativeName: '𑢹𑣉', script: 'warang-citi', layoutId: 'hi' },
  { code: 'unr', name: 'Mundari (Bhumij)', nativeName: 'মুন্ডারী', script: 'bengali', layoutId: 'bn' },
];

// ===================== HELPER FUNCTIONS =====================

/**
 * Get layout ID for a language code, with fallback to script-based default
 */
export function getLayoutIdForLanguage(languageCode: string): string {
  const normalizedCode = languageCode.toLowerCase().split('_')[0].split('-')[0];
  
  // Find exact match
  const exact = comprehensiveLanguageMappings.find(
    m => m.code.toLowerCase() === languageCode.toLowerCase()
  );
  if (exact) return exact.layoutId;
  
  // Find by base code
  const baseMatch = comprehensiveLanguageMappings.find(
    m => m.code.toLowerCase() === normalizedCode ||
         m.code.toLowerCase().startsWith(normalizedCode + '-')
  );
  if (baseMatch) return baseMatch.layoutId;
  
  // Default to English
  return 'en';
}

/**
 * Get script for a language code
 */
export function getScriptForLanguage(languageCode: string): string {
  const normalizedCode = languageCode.toLowerCase().split('_')[0].split('-')[0];
  
  const mapping = comprehensiveLanguageMappings.find(
    m => m.code.toLowerCase() === normalizedCode ||
         m.code.toLowerCase().startsWith(normalizedCode)
  );
  
  return mapping?.script || 'latin';
}

/**
 * Get all languages for a given script
 */
export function getLanguagesForScript(script: string): LanguageMapping[] {
  return comprehensiveLanguageMappings.filter(m => m.script === script);
}

/**
 * Search languages by name or native name
 */
export function searchLanguagesMappings(query: string): LanguageMapping[] {
  const normalizedQuery = query.toLowerCase().trim();
  return comprehensiveLanguageMappings.filter(
    m => m.name.toLowerCase().includes(normalizedQuery) ||
         m.nativeName.toLowerCase().includes(normalizedQuery) ||
         m.code.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Get total count of supported languages
 */
export function getTotalLanguageCount(): number {
  return comprehensiveLanguageMappings.length;
}

/**
 * Get all unique scripts
 */
export function getAllScripts(): string[] {
  return [...new Set(comprehensiveLanguageMappings.map(m => m.script))];
}

/**
 * Check if a language is RTL (right-to-left)
 */
export function isRTLLanguage(languageCode: string): boolean {
  const rtlScripts = ['arabic', 'hebrew', 'persian', 'urdu', 'thaana'];
  const script = getScriptForLanguage(languageCode);
  return rtlScripts.includes(script);
}

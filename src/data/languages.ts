// Top 70 Languages by Native Speakers - 12 Indian + 58 World Languages
// Used for registration and profile selection

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  script?: string;
  speakers?: string;
  isIndian?: boolean;
  region?: string;
}

// Alias for backwards compatibility
export type NLLB200Language = Language;

// ==========================================
// 12 MAJOR INDIAN LANGUAGES
// ==========================================
export const INDIAN_LANGUAGES: Language[] = [
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", script: "Devanagari", speakers: "340M+", isIndian: true, region: "India" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", script: "Bengali", speakers: "230M+", isIndian: true, region: "India" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", script: "Telugu", speakers: "82M+", isIndian: true, region: "India" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", script: "Devanagari", speakers: "83M+", isIndian: true, region: "India" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", script: "Tamil", speakers: "75M+", isIndian: true, region: "India" },
  { code: "ur", name: "Urdu", nativeName: "اردو", script: "Arabic", speakers: "70M+", isIndian: true, region: "India" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", script: "Gujarati", speakers: "56M+", isIndian: true, region: "India" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", script: "Kannada", speakers: "44M+", isIndian: true, region: "India" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", script: "Odia", speakers: "36M+", isIndian: true, region: "India" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", script: "Gurmukhi", speakers: "92M+", isIndian: true, region: "India" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", script: "Malayalam", speakers: "35M+", isIndian: true, region: "India" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", script: "Bengali", speakers: "15M+", isIndian: true, region: "India" },
];

// ==========================================
// 58 TOP WORLD LANGUAGES (by native speakers)
// ==========================================
export const WORLD_LANGUAGES: Language[] = [
  // Top 10
  { code: "zh", name: "Mandarin Chinese", nativeName: "普通话", script: "Han", speakers: "920M+", region: "China" },
  { code: "es", name: "Spanish", nativeName: "Español", script: "Latin", speakers: "480M+", region: "Global" },
  { code: "en", name: "English", nativeName: "English", script: "Latin", speakers: "380M+", region: "Global" },
  { code: "pt", name: "Portuguese", nativeName: "Português", script: "Latin", speakers: "220M+", region: "Global" },
  { code: "ru", name: "Russian", nativeName: "Русский", script: "Cyrillic", speakers: "150M+", region: "Europe/Asia" },
  { code: "ja", name: "Japanese", nativeName: "日本語", script: "Japanese", speakers: "125M+", region: "Japan" },
  { code: "wuu", name: "Wu Chinese", nativeName: "吴语", script: "Han", speakers: "81M+", region: "China" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", script: "Latin", speakers: "80M+", region: "Turkey" },
  { code: "ko", name: "Korean", nativeName: "한국어", script: "Hangul", speakers: "77M+", region: "Korea" },
  { code: "fr", name: "French", nativeName: "Français", script: "Latin", speakers: "77M+", region: "Global" },
  // 11-20
  { code: "de", name: "German", nativeName: "Deutsch", script: "Latin", speakers: "76M+", region: "Europe" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", script: "Latin", speakers: "76M+", region: "Vietnam" },
  { code: "jv", name: "Javanese", nativeName: "Basa Jawa", script: "Latin", speakers: "68M+", region: "Indonesia" },
  { code: "it", name: "Italian", nativeName: "Italiano", script: "Latin", speakers: "67M+", region: "Europe" },
  { code: "arz", name: "Egyptian Arabic", nativeName: "مصري", script: "Arabic", speakers: "64M+", region: "Egypt" },
  { code: "fa", name: "Persian", nativeName: "فارسی", script: "Arabic", speakers: "52M+", region: "Iran" },
  { code: "bho", name: "Bhojpuri", nativeName: "भोजपुरी", script: "Devanagari", speakers: "51M+", region: "India" },
  { code: "nan", name: "Southern Min", nativeName: "閩南語", script: "Han", speakers: "50M+", region: "China" },
  { code: "hak", name: "Hakka", nativeName: "客家话", script: "Han", speakers: "48M+", region: "China" },
  { code: "cjy", name: "Jin Chinese", nativeName: "晋语", script: "Han", speakers: "45M+", region: "China" },
  // 21-30
  { code: "ha", name: "Hausa", nativeName: "Hausa", script: "Latin", speakers: "44M+", region: "Africa" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", script: "Latin", speakers: "43M+", region: "Indonesia" },
  { code: "pl", name: "Polish", nativeName: "Polski", script: "Latin", speakers: "40M+", region: "Europe" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá", script: "Latin", speakers: "40M+", region: "Africa" },
  { code: "hsn", name: "Xiang Chinese", nativeName: "湘语", script: "Han", speakers: "37M+", region: "China" },
  { code: "mai", name: "Maithili", nativeName: "मैथिली", script: "Devanagari", speakers: "34M+", region: "India" },
  { code: "my", name: "Burmese", nativeName: "မြန်မာဘာသာ", script: "Burmese", speakers: "33M+", region: "Myanmar" },
  { code: "su", name: "Sundanese", nativeName: "Basa Sunda", script: "Latin", speakers: "32M+", region: "Indonesia" },
  { code: "apd", name: "Sudanese Arabic", nativeName: "عربي سوداني", script: "Arabic", speakers: "32M+", region: "Sudan" },
  { code: "arq", name: "Algerian Arabic", nativeName: "الدارجة", script: "Arabic", speakers: "31M+", region: "Algeria" },
  // 31-40
  { code: "ary", name: "Moroccan Arabic", nativeName: "الدارجة المغربية", script: "Arabic", speakers: "30M+", region: "Morocco" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", script: "Cyrillic", speakers: "30M+", region: "Europe" },
  { code: "ig", name: "Igbo", nativeName: "Igbo", script: "Latin", speakers: "27M+", region: "Africa" },
  { code: "uz", name: "Uzbek", nativeName: "Oʻzbek", script: "Latin", speakers: "27M+", region: "Central Asia" },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي", script: "Arabic", speakers: "25M+", region: "Pakistan/India" },
  { code: "apc", name: "Levantine Arabic", nativeName: "عربي شامي", script: "Arabic", speakers: "25M+", region: "Middle East" },
  { code: "ro", name: "Romanian", nativeName: "Română", script: "Latin", speakers: "24M+", region: "Europe" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog", script: "Latin", speakers: "24M+", region: "Philippines" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", script: "Latin", speakers: "23M+", region: "Europe" },
  { code: "gan", name: "Gan Chinese", nativeName: "赣语", script: "Han", speakers: "22M+", region: "China" },
  // 41-50
  { code: "am", name: "Amharic", nativeName: "አማርኛ", script: "Ethiopic", speakers: "22M+", region: "Ethiopia" },
  { code: "ps", name: "Pashto", nativeName: "پښتو", script: "Arabic", speakers: "21M+", region: "Afghanistan/Pakistan" },
  { code: "mag", name: "Magahi", nativeName: "मगही", script: "Devanagari", speakers: "21M+", region: "India" },
  { code: "th", name: "Thai", nativeName: "ไทย", script: "Thai", speakers: "20M+", region: "Thailand" },
  { code: "skr", name: "Saraiki", nativeName: "سرائیکی", script: "Arabic", speakers: "20M+", region: "Pakistan" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", script: "Latin", speakers: "19M+", region: "Malaysia" },
  { code: "km", name: "Khmer", nativeName: "ភាសាខ្មែរ", script: "Khmer", speakers: "16M+", region: "Cambodia" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", script: "Devanagari", speakers: "16M+", region: "Nepal" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල", script: "Sinhala", speakers: "16M+", region: "Sri Lanka" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", script: "Latin", speakers: "13M+", region: "Europe" },
  // 51-58
  { code: "el", name: "Greek", nativeName: "Ελληνικά", script: "Greek", speakers: "13M+", region: "Europe" },
  { code: "cs", name: "Czech", nativeName: "Čeština", script: "Latin", speakers: "10M+", region: "Europe" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", script: "Latin", speakers: "10M+", region: "Europe" },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan", script: "Latin", speakers: "10M+", region: "Central Asia" },
  { code: "he", name: "Hebrew", nativeName: "עברית", script: "Hebrew", speakers: "9M+", region: "Israel" },
  { code: "ar", name: "Arabic (MSA)", nativeName: "العربية الفصحى", script: "Arabic", speakers: "300M+", region: "Middle East" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", script: "Latin", speakers: "16M+", region: "Africa" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu", script: "Latin", speakers: "12M+", region: "Africa" },
];

// ==========================================
// COMBINED LIST - ALL 70 LANGUAGES (12 Indian + 58 World)
// ==========================================
export const ALL_LANGUAGES: Language[] = [...INDIAN_LANGUAGES, ...WORLD_LANGUAGES];

// For backwards compatibility - simple format used by components
export const languages = ALL_LANGUAGES.map(lang => ({
  code: lang.code,
  name: lang.name,
  nativeName: lang.nativeName,
}));

// ==========================================
// BACKWARDS COMPATIBILITY ALIASES
// ==========================================
export const ALL_NLLB200_LANGUAGES = ALL_LANGUAGES;
export const INDIAN_NLLB200_LANGUAGES = INDIAN_LANGUAGES;
export const NON_INDIAN_NLLB200_LANGUAGES = WORLD_LANGUAGES;

// Helper to get language by code
export const getLanguageByCode = (code: string): Language | undefined => {
  return ALL_LANGUAGES.find(lang => lang.code === code);
};

// Helper to check if language is Indian
export const isIndianLanguage = (code: string): boolean => {
  return INDIAN_LANGUAGES.some(lang => lang.code === code);
};

// Get NLLB200 code (for backwards compatibility)
export const getNLLB200Code = (code: string): string | null => {
  const lang = ALL_LANGUAGES.find(l => l.code === code);
  return lang ? lang.code : null;
};

// Get total language count
export const getTotalLanguageCount = (): number => ALL_LANGUAGES.length;

// Get Indian language codes
export const INDIAN_LANGUAGE_CODES = INDIAN_LANGUAGES.map(l => l.code);

// Get all language codes
export const ALL_LANGUAGE_CODES = ALL_LANGUAGES.map(l => l.code);

// Language code to name mapping for quick lookup
export const LANGUAGE_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  ALL_LANGUAGES.map(l => [l.code, l.name])
);

// Language code to native name mapping
export const LANGUAGE_CODE_TO_NATIVE: Record<string, string> = Object.fromEntries(
  ALL_LANGUAGES.map(l => [l.code, l.nativeName])
);

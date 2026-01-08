// Complete language list - 23 Indian + 42 World Languages (65 total)
export const languages = [
  // Indian Languages (23)
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া" },
  { code: "mai", name: "Maithili", nativeName: "मैथिली" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्" },
  { code: "ks", name: "Kashmiri", nativeName: "कश्मीरी" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي" },
  { code: "kok", name: "Konkani", nativeName: "कोंकणी" },
  { code: "doi", name: "Dogri", nativeName: "डोगरी" },
  { code: "mni", name: "Manipuri", nativeName: "মণিপুরী" },
  { code: "sat", name: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { code: "brx", name: "Bodo", nativeName: "बड़ो" },
  { code: "lus", name: "Mizo", nativeName: "Mizo ṭawng" },
  { code: "ur", name: "Urdu", nativeName: "اردو" },

  // World Languages (42 - sorted by speaker count)
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Mandarin Chinese", nativeName: "中文" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "jv", name: "Javanese", nativeName: "Basa Jawa" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "fa", name: "Persian", nativeName: "فارسی" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "my", name: "Burmese", nativeName: "မြန်မာစာ" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "su", name: "Sundanese", nativeName: "Basa Sunda" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "he", name: "Hebrew", nativeName: "עברית" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu" },
  { code: "rw", name: "Kinyarwanda", nativeName: "Ikinyarwanda" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá" },
  { code: "ig", name: "Igbo", nativeName: "Igbo" },
  { code: "ha", name: "Hausa", nativeName: "Hausa" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "so", name: "Somali", nativeName: "Soomaali" },
  { code: "km", name: "Khmer", nativeName: "ភាសាខ្មែរ" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල" },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan" },
  { code: "uz", name: "Uzbek", nativeName: "Oʻzbek" },
];

// Helper function to get language name by code
export const getLanguageName = (code: string): string => {
  const language = languages.find(lang => lang.code === code);
  return language?.name || code;
};

// Helper function to get native name by code
export const getLanguageNativeName = (code: string): string => {
  const language = languages.find(lang => lang.code === code);
  return language?.nativeName || code;
};

// Get all Indian languages
export const getIndianLanguages = () => {
  const indianCodes = [
    "hi", "bn", "te", "mr", "ta", "gu", "kn", "ml", "or", "pa",
    "as", "mai", "sa", "ks", "ne", "sd", "kok", "doi", "mni", "sat", "brx", "lus", "ur"
  ];
  return languages.filter(lang => indianCodes.includes(lang.code));
};

// Get all world languages (non-Indian)
export const getWorldLanguages = () => {
  const indianCodes = [
    "hi", "bn", "te", "mr", "ta", "gu", "kn", "ml", "or", "pa",
    "as", "mai", "sa", "ks", "ne", "sd", "kok", "doi", "mni", "sat", "brx", "lus", "ur"
  ];
  return languages.filter(lang => !indianCodes.includes(lang.code));
};

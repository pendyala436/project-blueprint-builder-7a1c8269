// Supported Languages Data (for matching & visibility logic)

export interface SupportedLanguage {
  name: string;
  isIndian: boolean;
  script: string;
}

export const INDIAN_LANGUAGES: SupportedLanguage[] = [
  { name: "Hindi", isIndian: true, script: "Devanagari" },
  { name: "Bengali", isIndian: true, script: "Bengali" },
  { name: "Telugu", isIndian: true, script: "Telugu" },
  { name: "Tamil", isIndian: true, script: "Tamil" },
  { name: "Marathi", isIndian: true, script: "Devanagari" },
  { name: "Gujarati", isIndian: true, script: "Gujarati" },
  { name: "Kannada", isIndian: true, script: "Kannada" },
  { name: "Malayalam", isIndian: true, script: "Malayalam" },
  { name: "Punjabi", isIndian: true, script: "Gurmukhi" },
  { name: "Odia", isIndian: true, script: "Odia" },
  { name: "Assamese", isIndian: true, script: "Bengali" },
  { name: "Nepali", isIndian: true, script: "Devanagari" },
  { name: "Urdu", isIndian: true, script: "Arabic" },
  { name: "Konkani", isIndian: true, script: "Devanagari" },
  { name: "Maithili", isIndian: true, script: "Devanagari" },
  { name: "Santali", isIndian: true, script: "Ol Chiki" },
  { name: "Bodo", isIndian: true, script: "Devanagari" },
  { name: "Dogri", isIndian: true, script: "Devanagari" },
  { name: "Kashmiri", isIndian: true, script: "Arabic" },
  { name: "Sindhi", isIndian: true, script: "Arabic" },
  { name: "Manipuri", isIndian: true, script: "Bengali" },
  { name: "Sinhala", isIndian: true, script: "Sinhala" },
  { name: "Bhojpuri", isIndian: true, script: "Devanagari" },
];

export const NON_INDIAN_LANGUAGES: SupportedLanguage[] = [
  { name: "English", isIndian: false, script: "Latin" },
  { name: "Mandarin Chinese", isIndian: false, script: "Han" },
  { name: "Spanish", isIndian: false, script: "Latin" },
  { name: "Arabic", isIndian: false, script: "Arabic" },
  { name: "French", isIndian: false, script: "Latin" },
  { name: "Portuguese", isIndian: false, script: "Latin" },
  { name: "Russian", isIndian: false, script: "Cyrillic" },
  { name: "Indonesian", isIndian: false, script: "Latin" },
  { name: "German", isIndian: false, script: "Latin" },
  { name: "Japanese", isIndian: false, script: "Japanese" },
  { name: "Egyptian Arabic", isIndian: false, script: "Arabic" },
  { name: "Vietnamese", isIndian: false, script: "Latin" },
  { name: "Hausa", isIndian: false, script: "Latin" },
  { name: "Turkish", isIndian: false, script: "Latin" },
  { name: "Swahili", isIndian: false, script: "Latin" },
  { name: "Tagalog", isIndian: false, script: "Latin" },
  { name: "Cantonese", isIndian: false, script: "Han" },
  { name: "Wu Chinese", isIndian: false, script: "Han" },
  { name: "Persian", isIndian: false, script: "Arabic" },
  { name: "Korean", isIndian: false, script: "Hangul" },
  { name: "Thai", isIndian: false, script: "Thai" },
  { name: "Javanese", isIndian: false, script: "Latin" },
  { name: "Italian", isIndian: false, script: "Latin" },
  { name: "Levantine Arabic", isIndian: false, script: "Arabic" },
  { name: "Amharic", isIndian: false, script: "Ethiopic" },
  { name: "Burmese", isIndian: false, script: "Myanmar" },
  { name: "Sundanese", isIndian: false, script: "Latin" },
  { name: "Somali", isIndian: false, script: "Latin" },
  { name: "Malagasy", isIndian: false, script: "Latin" },
  { name: "Fula", isIndian: false, script: "Latin" },
  { name: "Romanian", isIndian: false, script: "Latin" },
  { name: "Azerbaijani", isIndian: false, script: "Latin" },
  { name: "Dutch", isIndian: false, script: "Latin" },
  { name: "Pashto", isIndian: false, script: "Arabic" },
  { name: "Oromo", isIndian: false, script: "Latin" },
  { name: "Yoruba", isIndian: false, script: "Latin" },
  { name: "Hakka", isIndian: false, script: "Han" },
  { name: "Kurdish", isIndian: false, script: "Arabic" },
  { name: "Uzbek", isIndian: false, script: "Latin" },
  { name: "Malay", isIndian: false, script: "Latin" },
  { name: "Min Nan Chinese", isIndian: false, script: "Han" },
  { name: "Xiang Chinese", isIndian: false, script: "Han" },
];

export const ALL_SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  ...INDIAN_LANGUAGES,
  ...NON_INDIAN_LANGUAGES,
];

export function isIndianLanguage(languageName: string): boolean {
  const normalized = languageName.toLowerCase().trim();
  return INDIAN_LANGUAGES.some(
    lang => lang.name.toLowerCase() === normalized
  );
}

export function getIndianLanguageNames(): string[] {
  return INDIAN_LANGUAGES.map(lang => lang.name);
}

export function getNonIndianLanguageNames(): string[] {
  return NON_INDIAN_LANGUAGES.map(lang => lang.name);
}

export function getTotalLanguageCount(): number {
  return ALL_SUPPORTED_LANGUAGES.length;
}

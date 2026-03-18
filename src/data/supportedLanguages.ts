/**
 * Supported Languages — used for matching & visibility rules.
 * NOT related to translation (translation is removed).
 */

export interface SupportedLanguage {
  name: string;
  code: string;
  isIndian: boolean;
}

export const INDIAN_LANGUAGES: SupportedLanguage[] = [
  { name: "Hindi", code: "hi", isIndian: true },
  { name: "Bengali", code: "bn", isIndian: true },
  { name: "Telugu", code: "te", isIndian: true },
  { name: "Marathi", code: "mr", isIndian: true },
  { name: "Tamil", code: "ta", isIndian: true },
  { name: "Urdu", code: "ur", isIndian: true },
  { name: "Gujarati", code: "gu", isIndian: true },
  { name: "Kannada", code: "kn", isIndian: true },
  { name: "Malayalam", code: "ml", isIndian: true },
  { name: "Odia", code: "or", isIndian: true },
  { name: "Punjabi", code: "pa", isIndian: true },
  { name: "Assamese", code: "as", isIndian: true },
  { name: "Maithili", code: "mai", isIndian: true },
  { name: "Sanskrit", code: "sa", isIndian: true },
  { name: "Nepali", code: "ne", isIndian: true },
  { name: "Konkani", code: "kok", isIndian: true },
  { name: "Manipuri", code: "mni", isIndian: true },
  { name: "Bodo", code: "brx", isIndian: true },
  { name: "Dogri", code: "doi", isIndian: true },
  { name: "Sindhi", code: "sd", isIndian: true },
  { name: "Santali", code: "sat", isIndian: true },
  { name: "Kashmiri", code: "ks", isIndian: true },
];

export const NON_INDIAN_LANGUAGES: SupportedLanguage[] = [
  { name: "English", code: "en", isIndian: false },
  { name: "Spanish", code: "es", isIndian: false },
  { name: "French", code: "fr", isIndian: false },
  { name: "German", code: "de", isIndian: false },
  { name: "Portuguese", code: "pt", isIndian: false },
  { name: "Russian", code: "ru", isIndian: false },
  { name: "Japanese", code: "ja", isIndian: false },
  { name: "Korean", code: "ko", isIndian: false },
  { name: "Chinese", code: "zh", isIndian: false },
  { name: "Arabic", code: "ar", isIndian: false },
  { name: "Turkish", code: "tr", isIndian: false },
  { name: "Italian", code: "it", isIndian: false },
  { name: "Dutch", code: "nl", isIndian: false },
  { name: "Polish", code: "pl", isIndian: false },
  { name: "Thai", code: "th", isIndian: false },
  { name: "Vietnamese", code: "vi", isIndian: false },
  { name: "Indonesian", code: "id", isIndian: false },
  { name: "Malay", code: "ms", isIndian: false },
  { name: "Filipino", code: "fil", isIndian: false },
  { name: "Swahili", code: "sw", isIndian: false },
];

export const ALL_SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  ...INDIAN_LANGUAGES,
  ...NON_INDIAN_LANGUAGES,
];

const indianLanguageNames = new Set(
  INDIAN_LANGUAGES.map(l => l.name.toLowerCase())
);

export function isIndianLanguage(language: string): boolean {
  return indianLanguageNames.has(language.toLowerCase());
}

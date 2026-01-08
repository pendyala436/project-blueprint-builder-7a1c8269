/**
 * Supported Languages for LibreTranslate
 * English (en) is the mandatory pivot language
 */

export const LANGUAGES = [
  // Pivot
  "en",
  // Indian Languages
  "hi", "te", "ta", "kn", "ml", "bn", "mr", "gu", "pa", "ur", "or",
  // European
  "es", "fr", "de", "it", "pt", "ru", "pl", "nl", "sv", "da", "fi", "no", "cs", "ro", "hu", "uk",
  // Asian
  "zh", "ja", "ko", "th", "vi", "id", "ms",
  // Middle Eastern
  "ar", "he", "fa", "tr",
  // African
  "sw", "am"
] as const;

export type Language = typeof LANGUAGES[number];

export const PIVOT: Language = "en";

/** Language name mappings */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  hi: "Hindi", te: "Telugu", ta: "Tamil", kn: "Kannada", ml: "Malayalam",
  bn: "Bengali", mr: "Marathi", gu: "Gujarati", pa: "Punjabi", ur: "Urdu", or: "Odia",
  es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese",
  ru: "Russian", pl: "Polish", nl: "Dutch", sv: "Swedish", da: "Danish",
  fi: "Finnish", no: "Norwegian", cs: "Czech", ro: "Romanian", hu: "Hungarian", uk: "Ukrainian",
  zh: "Chinese", ja: "Japanese", ko: "Korean", th: "Thai", vi: "Vietnamese",
  id: "Indonesian", ms: "Malay",
  ar: "Arabic", he: "Hebrew", fa: "Persian", tr: "Turkish",
  sw: "Swahili", am: "Amharic"
};

/** Get language code from name */
export function getLanguageCode(name: string): Language | undefined {
  const normalized = name.toLowerCase().trim();
  const entry = Object.entries(LANGUAGE_NAMES).find(
    ([, n]) => n.toLowerCase() === normalized
  );
  return entry?.[0] as Language | undefined;
}

/** Check if language is supported */
export function isSupported(lang: string): lang is Language {
  return LANGUAGES.includes(lang as Language);
}

/**
 * Supported Languages for LibreTranslate
 * English (en) is the mandatory pivot language
 * Organized by speaker count and region
 */

export const LANGUAGES = [
  // Pivot Language
  "en",   // English - 1,500M
  
  // Major World Languages
  "zh",   // Mandarin Chinese - 1,200M
  "hi",   // Hindi - 602M
  "es",   // Spanish - 558M
  "fr",   // French - 274M
  "ar",   // Arabic - 274M
  "bn",   // Bengali - 272M
  "ru",   // Russian - 258M
  "pt",   // Portuguese - 257M
  "ur",   // Urdu - 246M
  "id",   // Indonesian - 199M
  "de",   // German - 134M
  "ja",   // Japanese - 125M
  
  // Indian Languages (All 22 Scheduled + Major Regional)
  "mr",   // Marathi - 99M
  "te",   // Telugu - 96M
  "ta",   // Tamil - 86M
  "gu",   // Gujarati - 62M
  "kn",   // Kannada - 64M
  "ml",   // Malayalam - 38M
  "or",   // Odia (Oriya) - 37M
  "pa",   // Punjabi - 90M
  "as",   // Assamese - 15M
  "mai",  // Maithili - 15M
  "sd",   // Sindhi - 15M
  "ne",   // Nepali - 16M
  "bho",  // Bhojpuri - 52M
  "ks",   // Kashmiri
  "kok",  // Konkani
  "doi",  // Dogri
  "brx",  // Bodo
  "sat",  // Santali
  "mni",  // Manipuri (Meitei)
  "sa",   // Sanskrit
  
  // East Asian
  "ko",   // Korean - 82M
  "vi",   // Vietnamese - 85M
  "th",   // Thai - 71M
  "my",   // Burmese - 33M
  "km",   // Khmer - 17M
  "jv",   // Javanese - 69M
  "yue",  // Cantonese - 86M
  "wuu",  // Wu Chinese - 83M
  
  // Middle Eastern & Central Asian
  "fa",   // Persian (Farsi) - 83M
  "tr",   // Turkish - 91M
  "ps",   // Pashto - 40M
  "uz",   // Uzbek - 32M
  
  // European
  "it",   // Italian - 67M
  "ro",   // Romanian - 30M
  "pl",   // Polish
  "nl",   // Dutch
  "sv",   // Swedish
  "da",   // Danish
  "fi",   // Finnish
  "no",   // Norwegian
  "cs",   // Czech
  "hu",   // Hungarian
  "uk",   // Ukrainian
  "el",   // Greek
  
  // African
  "sw",   // Swahili - 87M
  "ha",   // Hausa - 94M
  "yo",   // Yoruba - 45M
  "ig",   // Igbo - 44M
  "am",   // Amharic - 32M
  "om",   // Oromo - 37M
  "so",   // Somali - 25M
  "ff",   // Fula (Fulani) - 25M
  "mg",   // Malagasy - 25M
  
  // Southeast Asian & Pacific
  "tl",   // Tagalog (Filipino) - 87M
  "ms",   // Malay
  
  // Semitic
  "he",   // Hebrew
] as const;

export type Language = typeof LANGUAGES[number];

export const PIVOT: Language = "en";

/** Language name mappings with speaker counts */
export const LANGUAGE_NAMES: Record<Language, string> = {
  // Pivot
  en: "English",
  
  // Major World Languages
  zh: "Chinese (Mandarin)",
  hi: "Hindi",
  es: "Spanish",
  fr: "French",
  ar: "Arabic",
  bn: "Bengali",
  ru: "Russian",
  pt: "Portuguese",
  ur: "Urdu",
  id: "Indonesian",
  de: "German",
  ja: "Japanese",
  
  // Indian Languages
  mr: "Marathi",
  te: "Telugu",
  ta: "Tamil",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  or: "Odia",
  pa: "Punjabi",
  as: "Assamese",
  mai: "Maithili",
  sd: "Sindhi",
  ne: "Nepali",
  bho: "Bhojpuri",
  ks: "Kashmiri",
  kok: "Konkani",
  doi: "Dogri",
  brx: "Bodo",
  sat: "Santali",
  mni: "Manipuri",
  sa: "Sanskrit",
  
  // East Asian
  ko: "Korean",
  vi: "Vietnamese",
  th: "Thai",
  my: "Burmese",
  km: "Khmer",
  jv: "Javanese",
  yue: "Cantonese",
  wuu: "Wu Chinese",
  
  // Middle Eastern & Central Asian
  fa: "Persian",
  tr: "Turkish",
  ps: "Pashto",
  uz: "Uzbek",
  
  // European
  it: "Italian",
  ro: "Romanian",
  pl: "Polish",
  nl: "Dutch",
  sv: "Swedish",
  da: "Danish",
  fi: "Finnish",
  no: "Norwegian",
  cs: "Czech",
  hu: "Hungarian",
  uk: "Ukrainian",
  el: "Greek",
  
  // African
  sw: "Swahili",
  ha: "Hausa",
  yo: "Yoruba",
  ig: "Igbo",
  am: "Amharic",
  om: "Oromo",
  so: "Somali",
  ff: "Fula",
  mg: "Malagasy",
  
  // Southeast Asian & Pacific
  tl: "Tagalog",
  ms: "Malay",
  
  // Semitic
  he: "Hebrew",
};

/** Speaker counts in millions */
export const SPEAKER_COUNTS: Partial<Record<Language, number>> = {
  en: 1500, zh: 1200, hi: 602, es: 558, fr: 274, ar: 274, bn: 272,
  ru: 258, pt: 257, ur: 246, id: 199, de: 134, ja: 125, mr: 99,
  te: 96, tr: 91, pa: 90, yue: 86, ta: 86, wuu: 83, fa: 83, ko: 82,
  vi: 85, ha: 94, sw: 87, tl: 87, jv: 69, it: 67, gu: 62, kn: 64,
  bho: 52, th: 71, my: 33, ml: 38, or: 37, om: 37, ps: 40, uz: 32,
  ro: 30, yo: 45, ig: 44, am: 32, so: 25, ff: 25, mg: 25, km: 17,
  as: 15, mai: 15, sd: 15, ne: 16
};

/** Get language code from name */
export function getLanguageCode(name: string): Language | undefined {
  const normalized = name.toLowerCase().trim();
  
  // Direct match
  const entry = Object.entries(LANGUAGE_NAMES).find(
    ([, n]) => n.toLowerCase() === normalized
  );
  if (entry) return entry[0] as Language;
  
  // Alias matching
  const aliases: Record<string, Language> = {
    "mandarin": "zh", "chinese": "zh", "cantonese": "yue",
    "odia": "or", "oriya": "or",
    "bengali": "bn", "bangla": "bn",
    "punjabi": "pa", "panjabi": "pa",
    "farsi": "fa", "persian": "fa",
    "filipino": "tl", "pilipino": "tl",
    "burmese": "my", "myanmar": "my",
    "fulani": "ff", "fula": "ff",
    "meitei": "mni", "meetei": "mni",
  };
  
  return aliases[normalized];
}

/** Check if language is supported */
export function isSupported(lang: string): lang is Language {
  return LANGUAGES.includes(lang as Language);
}

/** Get Indian languages only */
export function getIndianLanguages(): Language[] {
  return ["hi", "bn", "mr", "te", "ta", "gu", "kn", "ml", "or", "pa", "ur",
          "as", "mai", "sd", "ne", "bho", "ks", "kok", "doi", "brx", "sat", "mni", "sa"];
}

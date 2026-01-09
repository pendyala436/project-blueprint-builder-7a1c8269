// NLLB-200 Language Data
// Indian languages + Selected world languages by speaker count

export interface NLLB200Language {
  code: string; // NLLB-200 language code (e.g., "eng_Latn")
  name: string; // Human-readable name
  isIndian: boolean; // Whether this is an Indian language
  script: string; // Script used
}

// All Indian languages supported by NLLB-200
export const INDIAN_NLLB200_LANGUAGES: NLLB200Language[] = [
  { code: "hin_Deva", name: "Hindi", isIndian: true, script: "Devanagari" },
  { code: "ben_Beng", name: "Bengali", isIndian: true, script: "Bengali" },
  { code: "tel_Telu", name: "Telugu", isIndian: true, script: "Telugu" },
  { code: "tam_Taml", name: "Tamil", isIndian: true, script: "Tamil" },
  { code: "mar_Deva", name: "Marathi", isIndian: true, script: "Devanagari" },
  { code: "guj_Gujr", name: "Gujarati", isIndian: true, script: "Gujarati" },
  { code: "kan_Knda", name: "Kannada", isIndian: true, script: "Kannada" },
  { code: "mal_Mlym", name: "Malayalam", isIndian: true, script: "Malayalam" },
  { code: "pan_Guru", name: "Punjabi", isIndian: true, script: "Gurmukhi" },
  { code: "ory_Orya", name: "Odia", isIndian: true, script: "Odia" },
  { code: "asm_Beng", name: "Assamese", isIndian: true, script: "Bengali" },
  { code: "npi_Deva", name: "Nepali", isIndian: true, script: "Devanagari" },
  { code: "urd_Arab", name: "Urdu", isIndian: true, script: "Arabic" },
  { code: "gom_Deva", name: "Konkani", isIndian: true, script: "Devanagari" },
  { code: "mai_Deva", name: "Maithili", isIndian: true, script: "Devanagari" },
  { code: "sat_Olck", name: "Santali", isIndian: true, script: "Ol Chiki" },
  { code: "brx_Deva", name: "Bodo", isIndian: true, script: "Devanagari" },
  { code: "doi_Deva", name: "Dogri", isIndian: true, script: "Devanagari" },
  { code: "kas_Arab", name: "Kashmiri", isIndian: true, script: "Arabic" },
  { code: "snd_Arab", name: "Sindhi", isIndian: true, script: "Arabic" },
  { code: "mni_Beng", name: "Manipuri", isIndian: true, script: "Bengali" },
  { code: "sin_Sinh", name: "Sinhala", isIndian: true, script: "Sinhala" },
  { code: "bho_Deva", name: "Bhojpuri", isIndian: true, script: "Devanagari" },
];

// Selected world languages by speaker count (excluding duplicates with Indian languages)
export const NON_INDIAN_NLLB200_LANGUAGES: NLLB200Language[] = [
  // Top world languages
  { code: "eng_Latn", name: "English", isIndian: false, script: "Latin" },
  { code: "zho_Hans", name: "Mandarin Chinese", isIndian: false, script: "Han" },
  { code: "spa_Latn", name: "Spanish", isIndian: false, script: "Latin" },
  { code: "arb_Arab", name: "Arabic", isIndian: false, script: "Arabic" },
  { code: "fra_Latn", name: "French", isIndian: false, script: "Latin" },
  { code: "por_Latn", name: "Portuguese", isIndian: false, script: "Latin" },
  { code: "rus_Cyrl", name: "Russian", isIndian: false, script: "Cyrillic" },
  { code: "ind_Latn", name: "Indonesian", isIndian: false, script: "Latin" },
  { code: "deu_Latn", name: "German", isIndian: false, script: "Latin" },
  { code: "jpn_Jpan", name: "Japanese", isIndian: false, script: "Japanese" },
  { code: "arz_Arab", name: "Egyptian Arabic", isIndian: false, script: "Arabic" },
  { code: "vie_Latn", name: "Vietnamese", isIndian: false, script: "Latin" },
  { code: "hau_Latn", name: "Hausa", isIndian: false, script: "Latin" },
  { code: "tur_Latn", name: "Turkish", isIndian: false, script: "Latin" },
  { code: "swh_Latn", name: "Swahili", isIndian: false, script: "Latin" },
  { code: "tgl_Latn", name: "Tagalog", isIndian: false, script: "Latin" },
  { code: "yue_Hant", name: "Cantonese", isIndian: false, script: "Han" },
  { code: "wuu_Hans", name: "Wu Chinese", isIndian: false, script: "Han" },
  { code: "pes_Arab", name: "Persian", isIndian: false, script: "Arabic" },
  { code: "kor_Hang", name: "Korean", isIndian: false, script: "Hangul" },
  { code: "tha_Thai", name: "Thai", isIndian: false, script: "Thai" },
  { code: "jav_Latn", name: "Javanese", isIndian: false, script: "Latin" },
  { code: "ita_Latn", name: "Italian", isIndian: false, script: "Latin" },
  { code: "apc_Arab", name: "Levantine Arabic", isIndian: false, script: "Arabic" },
  { code: "amh_Ethi", name: "Amharic", isIndian: false, script: "Ethiopic" },
  { code: "mya_Mymr", name: "Burmese", isIndian: false, script: "Myanmar" },
  { code: "sun_Latn", name: "Sundanese", isIndian: false, script: "Latin" },
  { code: "som_Latn", name: "Somali", isIndian: false, script: "Latin" },
  { code: "plt_Latn", name: "Malagasy", isIndian: false, script: "Latin" },
  { code: "ful_Latn", name: "Fula", isIndian: false, script: "Latin" },
  { code: "ron_Latn", name: "Romanian", isIndian: false, script: "Latin" },
  { code: "azj_Latn", name: "Azerbaijani", isIndian: false, script: "Latin" },
  { code: "nld_Latn", name: "Dutch", isIndian: false, script: "Latin" },
  { code: "pbt_Arab", name: "Pashto", isIndian: false, script: "Arabic" },
  { code: "orm_Latn", name: "Oromo", isIndian: false, script: "Latin" },
  { code: "yor_Latn", name: "Yoruba", isIndian: false, script: "Latin" },
  { code: "hak_Hans", name: "Hakka", isIndian: false, script: "Han" },
  { code: "kur_Arab", name: "Kurdish", isIndian: false, script: "Arabic" },
  { code: "uzn_Latn", name: "Uzbek", isIndian: false, script: "Latin" },
  { code: "zsm_Latn", name: "Malay", isIndian: false, script: "Latin" },
  { code: "nan_Hans", name: "Min Nan Chinese", isIndian: false, script: "Han" },
  { code: "hsn_Hans", name: "Xiang Chinese", isIndian: false, script: "Han" },
];

// All NLLB-200 languages combined
export const ALL_NLLB200_LANGUAGES: NLLB200Language[] = [
  ...INDIAN_NLLB200_LANGUAGES,
  ...NON_INDIAN_NLLB200_LANGUAGES,
];

// Helper functions
export function isIndianLanguage(languageName: string): boolean {
  const normalized = languageName.toLowerCase().trim();
  return INDIAN_NLLB200_LANGUAGES.some(
    lang => lang.name.toLowerCase() === normalized
  );
}

export function getNLLB200Code(languageName: string): string | null {
  const normalized = languageName.toLowerCase().trim();
  const found = ALL_NLLB200_LANGUAGES.find(
    lang => lang.name.toLowerCase() === normalized
  );
  return found?.code || null;
}

export function getLanguageByCode(code: string): NLLB200Language | null {
  return ALL_NLLB200_LANGUAGES.find(lang => lang.code === code) || null;
}

export function getIndianLanguageNames(): string[] {
  return INDIAN_NLLB200_LANGUAGES.map(lang => lang.name);
}

export function getNonIndianLanguageNames(): string[] {
  return NON_INDIAN_NLLB200_LANGUAGES.map(lang => lang.name);
}

// Get total language count
export function getTotalLanguageCount(): number {
  return ALL_NLLB200_LANGUAGES.length;
}

// Map common language name variations to NLLB-200 codes
export const LANGUAGE_NAME_ALIASES: Record<string, string> = {
  "mandarin": "zho_Hans",
  "chinese": "zho_Hans",
  "cantonese": "yue_Hant",
  "farsi": "pes_Arab",
  "bangla": "ben_Beng",
  "oriya": "ory_Orya",
  "filipino": "tgl_Latn",
  "burmese": "mya_Mymr",
  "malay": "zsm_Latn",
};

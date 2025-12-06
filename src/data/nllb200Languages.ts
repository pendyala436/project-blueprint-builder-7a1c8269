// NLLB-200 Language Data with Indian/Non-Indian classification
// Based on Facebook's NLLB-200 model supported languages

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
];

// Non-Indian languages supported by NLLB-200
export const NON_INDIAN_NLLB200_LANGUAGES: NLLB200Language[] = [
  // Major world languages
  { code: "eng_Latn", name: "English", isIndian: false, script: "Latin" },
  { code: "spa_Latn", name: "Spanish", isIndian: false, script: "Latin" },
  { code: "fra_Latn", name: "French", isIndian: false, script: "Latin" },
  { code: "deu_Latn", name: "German", isIndian: false, script: "Latin" },
  { code: "por_Latn", name: "Portuguese", isIndian: false, script: "Latin" },
  { code: "ita_Latn", name: "Italian", isIndian: false, script: "Latin" },
  { code: "nld_Latn", name: "Dutch", isIndian: false, script: "Latin" },
  { code: "rus_Cyrl", name: "Russian", isIndian: false, script: "Cyrillic" },
  { code: "pol_Latn", name: "Polish", isIndian: false, script: "Latin" },
  { code: "ukr_Cyrl", name: "Ukrainian", isIndian: false, script: "Cyrillic" },
  
  // Asian languages (non-Indian)
  { code: "zho_Hans", name: "Chinese (Simplified)", isIndian: false, script: "Han" },
  { code: "zho_Hant", name: "Chinese (Traditional)", isIndian: false, script: "Han" },
  { code: "jpn_Jpan", name: "Japanese", isIndian: false, script: "Japanese" },
  { code: "kor_Hang", name: "Korean", isIndian: false, script: "Hangul" },
  { code: "vie_Latn", name: "Vietnamese", isIndian: false, script: "Latin" },
  { code: "tha_Thai", name: "Thai", isIndian: false, script: "Thai" },
  { code: "ind_Latn", name: "Indonesian", isIndian: false, script: "Latin" },
  { code: "zsm_Latn", name: "Malay", isIndian: false, script: "Latin" },
  { code: "tgl_Latn", name: "Tagalog", isIndian: false, script: "Latin" },
  { code: "mya_Mymr", name: "Burmese", isIndian: false, script: "Myanmar" },
  { code: "khm_Khmr", name: "Khmer", isIndian: false, script: "Khmer" },
  { code: "lao_Laoo", name: "Lao", isIndian: false, script: "Lao" },
  
  // Middle Eastern languages
  { code: "arb_Arab", name: "Arabic", isIndian: false, script: "Arabic" },
  { code: "pes_Arab", name: "Persian", isIndian: false, script: "Arabic" },
  { code: "tur_Latn", name: "Turkish", isIndian: false, script: "Latin" },
  { code: "heb_Hebr", name: "Hebrew", isIndian: false, script: "Hebrew" },
  
  // African languages
  { code: "swh_Latn", name: "Swahili", isIndian: false, script: "Latin" },
  { code: "amh_Ethi", name: "Amharic", isIndian: false, script: "Ethiopic" },
  { code: "yor_Latn", name: "Yoruba", isIndian: false, script: "Latin" },
  { code: "ibo_Latn", name: "Igbo", isIndian: false, script: "Latin" },
  { code: "hau_Latn", name: "Hausa", isIndian: false, script: "Latin" },
  { code: "zul_Latn", name: "Zulu", isIndian: false, script: "Latin" },
  { code: "xho_Latn", name: "Xhosa", isIndian: false, script: "Latin" },
  { code: "afr_Latn", name: "Afrikaans", isIndian: false, script: "Latin" },
  
  // European languages
  { code: "ell_Grek", name: "Greek", isIndian: false, script: "Greek" },
  { code: "ces_Latn", name: "Czech", isIndian: false, script: "Latin" },
  { code: "ron_Latn", name: "Romanian", isIndian: false, script: "Latin" },
  { code: "hun_Latn", name: "Hungarian", isIndian: false, script: "Latin" },
  { code: "swe_Latn", name: "Swedish", isIndian: false, script: "Latin" },
  { code: "dan_Latn", name: "Danish", isIndian: false, script: "Latin" },
  { code: "fin_Latn", name: "Finnish", isIndian: false, script: "Latin" },
  { code: "nob_Latn", name: "Norwegian", isIndian: false, script: "Latin" },
  { code: "cat_Latn", name: "Catalan", isIndian: false, script: "Latin" },
  { code: "hrv_Latn", name: "Croatian", isIndian: false, script: "Latin" },
  { code: "srp_Cyrl", name: "Serbian", isIndian: false, script: "Cyrillic" },
  { code: "slk_Latn", name: "Slovak", isIndian: false, script: "Latin" },
  { code: "slv_Latn", name: "Slovenian", isIndian: false, script: "Latin" },
  { code: "bul_Cyrl", name: "Bulgarian", isIndian: false, script: "Cyrillic" },
  { code: "lit_Latn", name: "Lithuanian", isIndian: false, script: "Latin" },
  { code: "lvs_Latn", name: "Latvian", isIndian: false, script: "Latin" },
  { code: "est_Latn", name: "Estonian", isIndian: false, script: "Latin" },
  { code: "als_Latn", name: "Albanian", isIndian: false, script: "Latin" },
  { code: "mkd_Cyrl", name: "Macedonian", isIndian: false, script: "Cyrillic" },
  { code: "bos_Latn", name: "Bosnian", isIndian: false, script: "Latin" },
  
  // Central Asian languages
  { code: "kat_Geor", name: "Georgian", isIndian: false, script: "Georgian" },
  { code: "hye_Armn", name: "Armenian", isIndian: false, script: "Armenian" },
  { code: "azj_Latn", name: "Azerbaijani", isIndian: false, script: "Latin" },
  { code: "kaz_Cyrl", name: "Kazakh", isIndian: false, script: "Cyrillic" },
  { code: "uzn_Latn", name: "Uzbek", isIndian: false, script: "Latin" },
  { code: "khk_Cyrl", name: "Mongolian", isIndian: false, script: "Cyrillic" },
  { code: "bod_Tibt", name: "Tibetan", isIndian: false, script: "Tibetan" },
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

// Map common language name variations to NLLB-200 codes
export const LANGUAGE_NAME_ALIASES: Record<string, string> = {
  "mandarin": "zho_Hans",
  "chinese": "zho_Hans",
  "cantonese": "zho_Hant",
  "farsi": "pes_Arab",
  "bangla": "ben_Beng",
  "oriya": "ory_Orya",
  "filipino": "tgl_Latn",
  "norwegian bokmål": "nob_Latn",
  "serbian latin": "srp_Cyrl",
  "malay standard": "zsm_Latn",
};

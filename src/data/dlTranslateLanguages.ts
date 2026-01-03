// DL-Translate Complete Language Data
// All 200+ languages supported by dictionary-based translation
// Pattern: https://github.com/xhluca/dl-translate

export interface DLTranslateLanguage {
  code: string; // Language code (e.g., "eng_Latn")
  name: string; // Human-readable name
  isIndian: boolean; // Whether this is an Indian language
  script: string; // Script used
}

// All Indian languages supported (22 languages)
export const INDIAN_LANGUAGES: DLTranslateLanguage[] = [
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

// All Non-Indian languages (180+ languages)
export const NON_INDIAN_LANGUAGES: DLTranslateLanguage[] = [
  // Major World Languages
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
  
  // East Asian Languages
  { code: "zho_Hans", name: "Chinese (Simplified)", isIndian: false, script: "Han" },
  { code: "zho_Hant", name: "Chinese (Traditional)", isIndian: false, script: "Han" },
  { code: "jpn_Jpan", name: "Japanese", isIndian: false, script: "Japanese" },
  { code: "kor_Hang", name: "Korean", isIndian: false, script: "Hangul" },
  { code: "vie_Latn", name: "Vietnamese", isIndian: false, script: "Latin" },
  
  // Southeast Asian Languages
  { code: "tha_Thai", name: "Thai", isIndian: false, script: "Thai" },
  { code: "ind_Latn", name: "Indonesian", isIndian: false, script: "Latin" },
  { code: "zsm_Latn", name: "Malay", isIndian: false, script: "Latin" },
  { code: "tgl_Latn", name: "Tagalog", isIndian: false, script: "Latin" },
  { code: "ceb_Latn", name: "Cebuano", isIndian: false, script: "Latin" },
  { code: "ilo_Latn", name: "Ilocano", isIndian: false, script: "Latin" },
  { code: "war_Latn", name: "Waray", isIndian: false, script: "Latin" },
  { code: "mya_Mymr", name: "Burmese", isIndian: false, script: "Myanmar" },
  { code: "khm_Khmr", name: "Khmer", isIndian: false, script: "Khmer" },
  { code: "lao_Laoo", name: "Lao", isIndian: false, script: "Lao" },
  { code: "jav_Latn", name: "Javanese", isIndian: false, script: "Latin" },
  { code: "sun_Latn", name: "Sundanese", isIndian: false, script: "Latin" },
  { code: "min_Latn", name: "Minangkabau", isIndian: false, script: "Latin" },
  { code: "ace_Latn", name: "Acehnese", isIndian: false, script: "Latin" },
  { code: "ban_Latn", name: "Balinese", isIndian: false, script: "Latin" },
  { code: "bjn_Latn", name: "Banjar", isIndian: false, script: "Latin" },
  
  // Middle Eastern Languages
  { code: "arb_Arab", name: "Arabic", isIndian: false, script: "Arabic" },
  { code: "arz_Arab", name: "Egyptian Arabic", isIndian: false, script: "Arabic" },
  { code: "acm_Arab", name: "Mesopotamian Arabic", isIndian: false, script: "Arabic" },
  { code: "acq_Arab", name: "Ta'izzi-Adeni Arabic", isIndian: false, script: "Arabic" },
  { code: "apc_Arab", name: "Levantine Arabic", isIndian: false, script: "Arabic" },
  { code: "ary_Arab", name: "Moroccan Arabic", isIndian: false, script: "Arabic" },
  { code: "ars_Arab", name: "Najdi Arabic", isIndian: false, script: "Arabic" },
  { code: "pes_Arab", name: "Persian", isIndian: false, script: "Arabic" },
  { code: "prs_Arab", name: "Dari", isIndian: false, script: "Arabic" },
  { code: "tur_Latn", name: "Turkish", isIndian: false, script: "Latin" },
  { code: "heb_Hebr", name: "Hebrew", isIndian: false, script: "Hebrew" },
  { code: "kur_Arab", name: "Kurdish (Sorani)", isIndian: false, script: "Arabic" },
  { code: "kmr_Latn", name: "Kurdish (Kurmanji)", isIndian: false, script: "Latin" },
  { code: "pbt_Arab", name: "Pashto (Southern)", isIndian: false, script: "Arabic" },
  { code: "azj_Latn", name: "Azerbaijani (North)", isIndian: false, script: "Latin" },
  { code: "azb_Arab", name: "Azerbaijani (South)", isIndian: false, script: "Arabic" },
  
  // African Languages
  { code: "swh_Latn", name: "Swahili", isIndian: false, script: "Latin" },
  { code: "amh_Ethi", name: "Amharic", isIndian: false, script: "Ethiopic" },
  { code: "yor_Latn", name: "Yoruba", isIndian: false, script: "Latin" },
  { code: "ibo_Latn", name: "Igbo", isIndian: false, script: "Latin" },
  { code: "hau_Latn", name: "Hausa", isIndian: false, script: "Latin" },
  { code: "zul_Latn", name: "Zulu", isIndian: false, script: "Latin" },
  { code: "xho_Latn", name: "Xhosa", isIndian: false, script: "Latin" },
  { code: "afr_Latn", name: "Afrikaans", isIndian: false, script: "Latin" },
  { code: "som_Latn", name: "Somali", isIndian: false, script: "Latin" },
  { code: "orm_Latn", name: "Oromo", isIndian: false, script: "Latin" },
  { code: "tir_Ethi", name: "Tigrinya", isIndian: false, script: "Ethiopic" },
  { code: "wol_Latn", name: "Wolof", isIndian: false, script: "Latin" },
  { code: "ful_Latn", name: "Fulah", isIndian: false, script: "Latin" },
  { code: "sna_Latn", name: "Shona", isIndian: false, script: "Latin" },
  { code: "nya_Latn", name: "Nyanja", isIndian: false, script: "Latin" },
  { code: "lin_Latn", name: "Lingala", isIndian: false, script: "Latin" },
  { code: "lug_Latn", name: "Ganda", isIndian: false, script: "Latin" },
  { code: "luo_Latn", name: "Luo", isIndian: false, script: "Latin" },
  { code: "kam_Latn", name: "Kamba", isIndian: false, script: "Latin" },
  { code: "kik_Latn", name: "Kikuyu", isIndian: false, script: "Latin" },
  { code: "nso_Latn", name: "Northern Sotho", isIndian: false, script: "Latin" },
  { code: "sot_Latn", name: "Southern Sotho", isIndian: false, script: "Latin" },
  { code: "ssw_Latn", name: "Swati", isIndian: false, script: "Latin" },
  { code: "tsn_Latn", name: "Tswana", isIndian: false, script: "Latin" },
  { code: "tso_Latn", name: "Tsonga", isIndian: false, script: "Latin" },
  { code: "ven_Latn", name: "Venda", isIndian: false, script: "Latin" },
  { code: "nde_Latn", name: "Northern Ndebele", isIndian: false, script: "Latin" },
  { code: "run_Latn", name: "Rundi", isIndian: false, script: "Latin" },
  { code: "kin_Latn", name: "Kinyarwanda", isIndian: false, script: "Latin" },
  { code: "kon_Latn", name: "Kongo", isIndian: false, script: "Latin" },
  { code: "twi_Latn", name: "Twi", isIndian: false, script: "Latin" },
  { code: "aka_Latn", name: "Akan", isIndian: false, script: "Latin" },
  { code: "ewe_Latn", name: "Ewe", isIndian: false, script: "Latin" },
  { code: "fon_Latn", name: "Fon", isIndian: false, script: "Latin" },
  { code: "mos_Latn", name: "Mossi", isIndian: false, script: "Latin" },
  { code: "bam_Latn", name: "Bambara", isIndian: false, script: "Latin" },
  { code: "lua_Latn", name: "Luba-Kasai", isIndian: false, script: "Latin" },
  { code: "umb_Latn", name: "Umbundu", isIndian: false, script: "Latin" },
  { code: "kea_Latn", name: "Kabuverdianu", isIndian: false, script: "Latin" },
  { code: "plt_Latn", name: "Malagasy", isIndian: false, script: "Latin" },
  
  // European Languages
  { code: "ell_Grek", name: "Greek", isIndian: false, script: "Greek" },
  { code: "ces_Latn", name: "Czech", isIndian: false, script: "Latin" },
  { code: "ron_Latn", name: "Romanian", isIndian: false, script: "Latin" },
  { code: "hun_Latn", name: "Hungarian", isIndian: false, script: "Latin" },
  { code: "swe_Latn", name: "Swedish", isIndian: false, script: "Latin" },
  { code: "dan_Latn", name: "Danish", isIndian: false, script: "Latin" },
  { code: "fin_Latn", name: "Finnish", isIndian: false, script: "Latin" },
  { code: "nob_Latn", name: "Norwegian Bokmål", isIndian: false, script: "Latin" },
  { code: "nno_Latn", name: "Norwegian Nynorsk", isIndian: false, script: "Latin" },
  { code: "isl_Latn", name: "Icelandic", isIndian: false, script: "Latin" },
  { code: "cat_Latn", name: "Catalan", isIndian: false, script: "Latin" },
  { code: "glg_Latn", name: "Galician", isIndian: false, script: "Latin" },
  { code: "eus_Latn", name: "Basque", isIndian: false, script: "Latin" },
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
  { code: "bel_Cyrl", name: "Belarusian", isIndian: false, script: "Cyrillic" },
  { code: "mlt_Latn", name: "Maltese", isIndian: false, script: "Latin" },
  { code: "cym_Latn", name: "Welsh", isIndian: false, script: "Latin" },
  { code: "gle_Latn", name: "Irish", isIndian: false, script: "Latin" },
  { code: "gla_Latn", name: "Scottish Gaelic", isIndian: false, script: "Latin" },
  { code: "bre_Latn", name: "Breton", isIndian: false, script: "Latin" },
  { code: "oci_Latn", name: "Occitan", isIndian: false, script: "Latin" },
  { code: "ast_Latn", name: "Asturian", isIndian: false, script: "Latin" },
  { code: "ltz_Latn", name: "Luxembourgish", isIndian: false, script: "Latin" },
  { code: "fry_Latn", name: "Western Frisian", isIndian: false, script: "Latin" },
  { code: "lim_Latn", name: "Limburgish", isIndian: false, script: "Latin" },
  { code: "scn_Latn", name: "Sicilian", isIndian: false, script: "Latin" },
  { code: "srd_Latn", name: "Sardinian", isIndian: false, script: "Latin" },
  { code: "fur_Latn", name: "Friulian", isIndian: false, script: "Latin" },
  { code: "lmo_Latn", name: "Lombard", isIndian: false, script: "Latin" },
  { code: "vec_Latn", name: "Venetian", isIndian: false, script: "Latin" },
  { code: "szl_Latn", name: "Silesian", isIndian: false, script: "Latin" },
  
  // Central Asian Languages
  { code: "kat_Geor", name: "Georgian", isIndian: false, script: "Georgian" },
  { code: "hye_Armn", name: "Armenian", isIndian: false, script: "Armenian" },
  { code: "kaz_Cyrl", name: "Kazakh", isIndian: false, script: "Cyrillic" },
  { code: "uzn_Latn", name: "Uzbek", isIndian: false, script: "Latin" },
  { code: "kir_Cyrl", name: "Kyrgyz", isIndian: false, script: "Cyrillic" },
  { code: "tgk_Cyrl", name: "Tajik", isIndian: false, script: "Cyrillic" },
  { code: "tuk_Latn", name: "Turkmen", isIndian: false, script: "Latin" },
  { code: "khk_Cyrl", name: "Mongolian", isIndian: false, script: "Cyrillic" },
  { code: "bod_Tibt", name: "Tibetan", isIndian: false, script: "Tibetan" },
  { code: "uig_Arab", name: "Uyghur", isIndian: false, script: "Arabic" },
  { code: "tat_Cyrl", name: "Tatar", isIndian: false, script: "Cyrillic" },
  { code: "bak_Cyrl", name: "Bashkir", isIndian: false, script: "Cyrillic" },
  
  // Pacific & Oceanic Languages
  { code: "mri_Latn", name: "Maori", isIndian: false, script: "Latin" },
  { code: "haw_Latn", name: "Hawaiian", isIndian: false, script: "Latin" },
  { code: "smo_Latn", name: "Samoan", isIndian: false, script: "Latin" },
  { code: "ton_Latn", name: "Tongan", isIndian: false, script: "Latin" },
  { code: "fij_Latn", name: "Fijian", isIndian: false, script: "Latin" },
  { code: "pag_Latn", name: "Pangasinan", isIndian: false, script: "Latin" },
  
  // Creole & Pidgin Languages
  { code: "hat_Latn", name: "Haitian Creole", isIndian: false, script: "Latin" },
  { code: "pap_Latn", name: "Papiamento", isIndian: false, script: "Latin" },
  { code: "tpi_Latn", name: "Tok Pisin", isIndian: false, script: "Latin" },
  
  // South American Indigenous Languages
  { code: "ayr_Latn", name: "Aymara", isIndian: false, script: "Latin" },
  { code: "quy_Latn", name: "Quechua (Ayacucho)", isIndian: false, script: "Latin" },
  { code: "grn_Latn", name: "Guarani", isIndian: false, script: "Latin" },
  
  // Additional Asian Languages
  { code: "dzo_Tibt", name: "Dzongkha", isIndian: false, script: "Tibetan" },
  { code: "shn_Mymr", name: "Shan", isIndian: false, script: "Myanmar" },
  
  // Nigerian Languages
  { code: "fuv_Latn", name: "Nigerian Fulfulde", isIndian: false, script: "Latin" },
  { code: "taq_Latn", name: "Tamasheq", isIndian: false, script: "Latin" },
  { code: "knc_Latn", name: "Kanuri", isIndian: false, script: "Latin" },
  
  // Other Languages
  { code: "cjk_Latn", name: "Chokwe", isIndian: false, script: "Latin" },
  { code: "bem_Latn", name: "Bemba", isIndian: false, script: "Latin" },
  { code: "tum_Latn", name: "Tumbuka", isIndian: false, script: "Latin" },
  { code: "lus_Latn", name: "Mizo", isIndian: false, script: "Latin" },
  { code: "dik_Latn", name: "Dinka", isIndian: false, script: "Latin" },
  { code: "nus_Latn", name: "Nuer", isIndian: false, script: "Latin" },
  { code: "kbp_Latn", name: "Kabiyè", isIndian: false, script: "Latin" },
  { code: "sag_Latn", name: "Sango", isIndian: false, script: "Latin" },
  { code: "awa_Deva", name: "Awadhi", isIndian: false, script: "Devanagari" },
  { code: "bho_Deva", name: "Bhojpuri", isIndian: false, script: "Devanagari" },
  { code: "hne_Deva", name: "Chhattisgarhi", isIndian: false, script: "Devanagari" },
  { code: "mag_Deva", name: "Magahi", isIndian: false, script: "Devanagari" },
  { code: "lij_Latn", name: "Ligurian", isIndian: false, script: "Latin" },
  { code: "bug_Latn", name: "Buginese", isIndian: false, script: "Latin" },
  { code: "crh_Latn", name: "Crimean Tatar", isIndian: false, script: "Latin" },
  { code: "gaz_Latn", name: "West Central Oromo", isIndian: false, script: "Latin" },
  { code: "tzm_Tfng", name: "Central Atlas Tamazight", isIndian: false, script: "Tifinagh" },
  { code: "zgh_Tfng", name: "Standard Moroccan Tamazight", isIndian: false, script: "Tifinagh" },
  { code: "kab_Latn", name: "Kabyle", isIndian: false, script: "Latin" },
];

// All languages combined
export const ALL_LANGUAGES: DLTranslateLanguage[] = [
  ...INDIAN_LANGUAGES,
  ...NON_INDIAN_LANGUAGES,
];

// Helper functions
export function isIndianLanguage(languageName: string): boolean {
  const normalized = languageName.toLowerCase().trim();
  return INDIAN_LANGUAGES.some(
    lang => lang.name.toLowerCase() === normalized
  );
}

export function getLanguageCode(languageName: string): string | null {
  const normalized = languageName.toLowerCase().trim();
  const found = ALL_LANGUAGES.find(
    lang => lang.name.toLowerCase() === normalized
  );
  return found?.code || null;
}

export function getLanguageByCode(code: string): DLTranslateLanguage | null {
  return ALL_LANGUAGES.find(lang => lang.code === code) || null;
}

export function getIndianLanguageNames(): string[] {
  return INDIAN_LANGUAGES.map(lang => lang.name);
}

export function getNonIndianLanguageNames(): string[] {
  return NON_INDIAN_LANGUAGES.map(lang => lang.name);
}

// Get total language count
export function getTotalLanguageCount(): number {
  return ALL_LANGUAGES.length;
}

// Map common language name variations to codes
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
};

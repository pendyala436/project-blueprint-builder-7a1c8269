/**
 * DL-Translate Model Language Codes
 * Official references from: https://github.com/xhluca/dl-translate
 * 
 * This file contains the exact language codes for each supported model:
 * - NLLB-200: 200+ languages (format: eng_Latn, hin_Deva)
 * - M2M-100: 100 languages (format: en, hi, te)
 * - mBART50: 50 languages (format: ar_AR, en_XX)
 */

// ============================================================
// M2M-100 Language Codes (ISO 639-1 format)
// Source: https://huggingface.co/facebook/m2m100_1.2B
// ============================================================
export const M2M100_CODES: Record<string, string> = {
  // Major world languages
  'english': 'en',
  'chinese': 'zh',
  'spanish': 'es',
  'arabic': 'ar',
  'french': 'fr',
  'portuguese': 'pt',
  'russian': 'ru',
  'japanese': 'ja',
  'german': 'de',
  'korean': 'ko',
  'italian': 'it',
  'turkish': 'tr',
  'vietnamese': 'vi',
  'polish': 'pl',
  'dutch': 'nl',
  'thai': 'th',
  'indonesian': 'id',
  'czech': 'cs',
  'romanian': 'ro',
  'greek': 'el',
  'hungarian': 'hu',
  'swedish': 'sv',
  'danish': 'da',
  'finnish': 'fi',
  'norwegian': 'no',
  'ukrainian': 'uk',
  'hebrew': 'he',
  'persian': 'fa',
  
  // Indian languages
  'hindi': 'hi',
  'bengali': 'bn',
  'telugu': 'te',
  'marathi': 'mr',
  'tamil': 'ta',
  'gujarati': 'gu',
  'kannada': 'kn',
  'malayalam': 'ml',
  'punjabi': 'pa',
  'urdu': 'ur',
  'nepali': 'ne',
  'odia': 'or',
  'assamese': 'as',
  'sinhala': 'si',
  'sindhi': 'sd',
  
  // Southeast Asian
  'burmese': 'my',
  'khmer': 'km',
  'lao': 'lo',
  'tagalog': 'tl',
  'malay': 'ms',
  'javanese': 'jv',
  'sundanese': 'su',
  'cebuano': 'ceb',
  'ilocano': 'ilo',
  
  // African
  'swahili': 'sw',
  'afrikaans': 'af',
  'amharic': 'am',
  'hausa': 'ha',
  'yoruba': 'yo',
  'zulu': 'zu',
  'xhosa': 'xh',
  'somali': 'so',
  'igbo': 'ig',
  'fulah': 'ff',
  'ganda': 'lg',
  'lingala': 'ln',
  'wolof': 'wo',
  'tswana': 'tn',
  
  // European
  'lithuanian': 'lt',
  'latvian': 'lv',
  'estonian': 'et',
  'slovenian': 'sl',
  'croatian': 'hr',
  'serbian': 'sr',
  'slovak': 'sk',
  'bulgarian': 'bg',
  'macedonian': 'mk',
  'albanian': 'sq',
  'bosnian': 'bs',
  'icelandic': 'is',
  'catalan': 'ca',
  'galician': 'gl',
  'basque': 'eu',
  'welsh': 'cy',
  'irish': 'ga',
  'scottish_gaelic': 'gd',
  'breton': 'br',
  'frisian': 'fy',
  'occitan': 'oc',
  'asturian': 'ast',
  'belarusian': 'be',
  
  // Central Asian
  'kazakh': 'kk',
  'uzbek': 'uz',
  'azerbaijani': 'az',
  'turkmen': 'tk',
  'tajik': 'tg',
  'kyrgyz': 'ky',
  'mongolian': 'mn',
  'pashto': 'ps',
  'bashkir': 'ba',
  
  // Caucasus
  'georgian': 'ka',
  'armenian': 'hy',
  'maltese': 'mt',
  'luxembourgish': 'lb',
  
  // Other
  'haitian_creole': 'ht',
  'yiddish': 'yi',
  'esperanto': 'eo',
  'latin': 'la',
};

// ============================================================
// mBART50 Language Codes (locale format: lang_COUNTRY)
// Source: https://huggingface.co/facebook/mbart-large-50
// ============================================================
export const MBART50_CODES: Record<string, string> = {
  'arabic': 'ar_AR',
  'czech': 'cs_CZ',
  'german': 'de_DE',
  'english': 'en_XX',
  'spanish': 'es_XX',
  'estonian': 'et_EE',
  'finnish': 'fi_FI',
  'french': 'fr_XX',
  'gujarati': 'gu_IN',
  'hindi': 'hi_IN',
  'italian': 'it_IT',
  'japanese': 'ja_XX',
  'kazakh': 'kk_KZ',
  'korean': 'ko_KR',
  'lithuanian': 'lt_LT',
  'latvian': 'lv_LV',
  'burmese': 'my_MM',
  'nepali': 'ne_NP',
  'dutch': 'nl_XX',
  'romanian': 'ro_RO',
  'russian': 'ru_RU',
  'sinhala': 'si_LK',
  'turkish': 'tr_TR',
  'vietnamese': 'vi_VN',
  'chinese': 'zh_CN',
  'afrikaans': 'af_ZA',
  'azerbaijani': 'az_AZ',
  'bengali': 'bn_IN',
  'persian': 'fa_IR',
  'hebrew': 'he_IL',
  'croatian': 'hr_HR',
  'indonesian': 'id_ID',
  'georgian': 'ka_GE',
  'khmer': 'km_KH',
  'macedonian': 'mk_MK',
  'malayalam': 'ml_IN',
  'mongolian': 'mn_MN',
  'marathi': 'mr_IN',
  'polish': 'pl_PL',
  'pashto': 'ps_AF',
  'portuguese': 'pt_XX',
  'swedish': 'sv_SE',
  'swahili': 'sw_KE',
  'tamil': 'ta_IN',
  'telugu': 'te_IN',
  'thai': 'th_TH',
  'tagalog': 'tl_XX',
  'ukrainian': 'uk_UA',
  'urdu': 'ur_PK',
  'xhosa': 'xh_ZA',
  'galician': 'gl_ES',
  'slovenian': 'sl_SI',
};

// ============================================================
// NLLB-200 Language Codes (lang_Script format)
// Source: https://github.com/facebookresearch/fairseq/tree/nllb
// ============================================================
export const NLLB200_CODES: Record<string, string> = {
  // Major world languages
  'english': 'eng_Latn',
  'chinese': 'zho_Hans',
  'chinese_simplified': 'zho_Hans',
  'chinese_traditional': 'zho_Hant',
  'cantonese': 'yue_Hant',
  'spanish': 'spa_Latn',
  'french': 'fra_Latn',
  'german': 'deu_Latn',
  'portuguese': 'por_Latn',
  'russian': 'rus_Cyrl',
  'japanese': 'jpn_Jpan',
  'korean': 'kor_Hang',
  'italian': 'ita_Latn',
  'dutch': 'nld_Latn',
  'polish': 'pol_Latn',
  'turkish': 'tur_Latn',
  'vietnamese': 'vie_Latn',
  'thai': 'tha_Thai',
  'indonesian': 'ind_Latn',
  'greek': 'ell_Grek',
  'czech': 'ces_Latn',
  'romanian': 'ron_Latn',
  'hungarian': 'hun_Latn',
  'swedish': 'swe_Latn',
  'danish': 'dan_Latn',
  'finnish': 'fin_Latn',
  'norwegian': 'nob_Latn',
  'ukrainian': 'ukr_Cyrl',
  'hebrew': 'heb_Hebr',
  
  // Arabic varieties
  'arabic': 'arb_Arab',
  'egyptian_arabic': 'arz_Arab',
  'moroccan_arabic': 'ary_Arab',
  'tunisian_arabic': 'aeb_Arab',
  
  // Persian/Iranian
  'persian': 'pes_Arab',
  'dari': 'prs_Arab',
  'pashto': 'pbt_Arab',
  
  // South Asian - Indian languages
  'hindi': 'hin_Deva',
  'bengali': 'ben_Beng',
  'telugu': 'tel_Telu',
  'marathi': 'mar_Deva',
  'tamil': 'tam_Taml',
  'gujarati': 'guj_Gujr',
  'kannada': 'kan_Knda',
  'malayalam': 'mal_Mlym',
  'punjabi': 'pan_Guru',
  'odia': 'ory_Orya',
  'assamese': 'asm_Beng',
  'urdu': 'urd_Arab',
  'nepali': 'npi_Deva',
  'maithili': 'mai_Deva',
  'santali': 'sat_Olck',
  'kashmiri': 'kas_Arab',
  'konkani': 'kok_Deva',
  'sindhi': 'snd_Arab',
  'dogri': 'doi_Deva',
  'manipuri': 'mni_Beng',
  'bodo': 'brx_Deva',
  'sanskrit': 'san_Deva',
  'bhojpuri': 'bho_Deva',
  'awadhi': 'awa_Deva',
  'magahi': 'mag_Deva',
  'chhattisgarhi': 'hne_Deva',
  'sinhala': 'sin_Sinh',
  
  // Southeast Asian
  'burmese': 'mya_Mymr',
  'khmer': 'khm_Khmr',
  'lao': 'lao_Laoo',
  'tagalog': 'tgl_Latn',
  'javanese': 'jav_Latn',
  'sundanese': 'sun_Latn',
  'cebuano': 'ceb_Latn',
  'ilocano': 'ilo_Latn',
  'malay': 'zsm_Latn',
  'minangkabau': 'min_Latn',
  'acehnese': 'ace_Latn',
  'balinese': 'ban_Latn',
  'banjar': 'bjn_Latn',
  'buginese': 'bug_Latn',
  
  // East Asian
  'tibetan': 'bod_Tibt',
  
  // European
  'lithuanian': 'lit_Latn',
  'latvian': 'lvs_Latn',
  'estonian': 'est_Latn',
  'slovenian': 'slv_Latn',
  'croatian': 'hrv_Latn',
  'serbian': 'srp_Cyrl',
  'slovak': 'slk_Latn',
  'bulgarian': 'bul_Cyrl',
  'macedonian': 'mkd_Cyrl',
  'albanian': 'als_Latn',
  'bosnian': 'bos_Latn',
  'icelandic': 'isl_Latn',
  'faroese': 'fao_Latn',
  'catalan': 'cat_Latn',
  'galician': 'glg_Latn',
  'basque': 'eus_Latn',
  'welsh': 'cym_Latn',
  'irish': 'gle_Latn',
  'scottish_gaelic': 'gla_Latn',
  'breton': 'bre_Latn',
  'occitan': 'oci_Latn',
  'maltese': 'mlt_Latn',
  'belarusian': 'bel_Cyrl',
  'luxembourgish': 'ltz_Latn',
  'esperanto': 'epo_Latn',
  
  // Central Asian/Turkic
  'kazakh': 'kaz_Cyrl',
  'uzbek': 'uzn_Latn',
  'azerbaijani': 'azj_Latn',
  'turkmen': 'tuk_Latn',
  'tajik': 'tgk_Cyrl',
  'kyrgyz': 'kir_Cyrl',
  'tatar': 'tat_Cyrl',
  'uighur': 'uig_Arab',
  
  // Caucasian
  'georgian': 'kat_Geor',
  'armenian': 'hye_Armn',
  
  // Mongolian
  'mongolian': 'khk_Cyrl',
  
  // African
  'swahili': 'swh_Latn',
  'afrikaans': 'afr_Latn',
  'amharic': 'amh_Ethi',
  'tigrinya': 'tir_Ethi',
  'hausa': 'hau_Latn',
  'yoruba': 'yor_Latn',
  'igbo': 'ibo_Latn',
  'zulu': 'zul_Latn',
  'xhosa': 'xho_Latn',
  'somali': 'som_Latn',
  'oromo': 'gaz_Latn',
  'wolof': 'wol_Latn',
  'fulah': 'fuv_Latn',
  'bambara': 'bam_Latn',
  'lingala': 'lin_Latn',
  'kongo': 'kon_Latn',
  'luganda': 'lug_Latn',
  'kinyarwanda': 'kin_Latn',
  'kirundi': 'run_Latn',
  'shona': 'sna_Latn',
  'nyanja': 'nya_Latn',
  'tswana': 'tsn_Latn',
  'tsonga': 'tso_Latn',
  'swati': 'ssw_Latn',
  'sesotho': 'sot_Latn',
  'akan': 'aka_Latn',
  'twi': 'twi_Latn',
  'ewe': 'ewe_Latn',
  'fon': 'fon_Latn',
  'bemba': 'bem_Latn',
  'luo': 'luo_Latn',
  'kikuyu': 'kik_Latn',
  'malagasy': 'plt_Latn',
  
  // Pacific
  'fijian': 'fij_Latn',
  'samoan': 'smo_Latn',
  'tok_pisin': 'tpi_Latn',
  
  // Berber
  'tamazight': 'tzm_Tfng',
  'kabyle': 'kab_Latn',
  
  // Kurdish
  'kurdish': 'kmr_Latn',
  'sorani': 'ckb_Arab',
  
  // Other
  'haitian_creole': 'hat_Latn',
  'yiddish': 'ydd_Hebr',
  'guarani': 'grn_Latn',
  'quechua': 'quy_Latn',
  'dzongkha': 'dzo_Tibt',
  'mizo': 'lus_Latn',
};

/**
 * Get language code for a specific model
 */
export function getModelCode(language: string, model: 'nllb200' | 'm2m100' | 'mbart50'): string | null {
  const normalized = language.toLowerCase().trim().replace(/[\s-]+/g, '_');
  
  switch (model) {
    case 'nllb200':
      return NLLB200_CODES[normalized] || null;
    case 'm2m100':
      return M2M100_CODES[normalized] || null;
    case 'mbart50':
      return MBART50_CODES[normalized] || null;
  }
}

/**
 * Check if a language is supported by a specific model
 */
export function isModelSupported(language: string, model: 'nllb200' | 'm2m100' | 'mbart50'): boolean {
  return getModelCode(language, model) !== null;
}

/**
 * Get all supported languages for a model
 */
export function getModelLanguages(model: 'nllb200' | 'm2m100' | 'mbart50'): string[] {
  switch (model) {
    case 'nllb200':
      return Object.keys(NLLB200_CODES);
    case 'm2m100':
      return Object.keys(M2M100_CODES);
    case 'mbart50':
      return Object.keys(MBART50_CODES);
  }
}

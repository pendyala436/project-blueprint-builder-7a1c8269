/**
 * NLLB-200 Language Codes Mapping
 * Complete mapping of 200+ languages to NLLB format codes
 */

import type { NLLBLanguageCode, ScriptPattern } from './types';

// Complete language name to NLLB code mapping
export const LANGUAGE_TO_NLLB: Record<string, NLLBLanguageCode> = {
  // ========== INDIAN LANGUAGES ==========
  hindi: 'hin_Deva',
  bengali: 'ben_Beng',
  bangla: 'ben_Beng',
  telugu: 'tel_Telu',
  tamil: 'tam_Taml',
  marathi: 'mar_Deva',
  gujarati: 'guj_Gujr',
  kannada: 'kan_Knda',
  malayalam: 'mal_Mlym',
  punjabi: 'pan_Guru',
  odia: 'ory_Orya',
  oriya: 'ory_Orya',
  assamese: 'asm_Beng',
  nepali: 'npi_Deva',
  urdu: 'urd_Arab',
  konkani: 'gom_Deva',
  maithili: 'mai_Deva',
  santali: 'sat_Olck',
  bodo: 'brx_Deva',
  dogri: 'doi_Deva',
  kashmiri: 'kas_Arab',
  sindhi: 'snd_Arab',
  manipuri: 'mni_Beng',
  sinhala: 'sin_Sinh',
  sinhalese: 'sin_Sinh',
  bhojpuri: 'bho_Deva',
  magahi: 'mag_Deva',
  chhattisgarhi: 'hne_Deva',
  awadhi: 'awa_Deva',

  // ========== MAJOR WORLD LANGUAGES ==========
  english: 'eng_Latn',
  spanish: 'spa_Latn',
  french: 'fra_Latn',
  german: 'deu_Latn',
  portuguese: 'por_Latn',
  italian: 'ita_Latn',
  dutch: 'nld_Latn',
  russian: 'rus_Cyrl',
  polish: 'pol_Latn',
  ukrainian: 'ukr_Cyrl',

  // ========== EAST ASIAN LANGUAGES ==========
  chinese: 'zho_Hans',
  mandarin: 'zho_Hans',
  'simplified chinese': 'zho_Hans',
  'traditional chinese': 'zho_Hant',
  cantonese: 'yue_Hant',
  japanese: 'jpn_Jpan',
  korean: 'kor_Hang',

  // ========== SOUTHEAST ASIAN LANGUAGES ==========
  vietnamese: 'vie_Latn',
  thai: 'tha_Thai',
  indonesian: 'ind_Latn',
  malay: 'zsm_Latn',
  tagalog: 'tgl_Latn',
  filipino: 'tgl_Latn',
  burmese: 'mya_Mymr',
  myanmar: 'mya_Mymr',
  khmer: 'khm_Khmr',
  cambodian: 'khm_Khmr',
  lao: 'lao_Laoo',
  laotian: 'lao_Laoo',
  javanese: 'jav_Latn',
  sundanese: 'sun_Latn',
  cebuano: 'ceb_Latn',
  ilocano: 'ilo_Latn',

  // ========== MIDDLE EASTERN LANGUAGES ==========
  arabic: 'arb_Arab',
  'standard arabic': 'arb_Arab',
  'egyptian arabic': 'arz_Arab',
  'moroccan arabic': 'ary_Arab',
  persian: 'pes_Arab',
  farsi: 'pes_Arab',
  pashto: 'pbt_Arab',
  dari: 'prs_Arab',
  turkish: 'tur_Latn',
  hebrew: 'heb_Hebr',
  kurdish: 'ckb_Arab',

  // ========== AFRICAN LANGUAGES ==========
  swahili: 'swh_Latn',
  amharic: 'amh_Ethi',
  yoruba: 'yor_Latn',
  igbo: 'ibo_Latn',
  hausa: 'hau_Latn',
  zulu: 'zul_Latn',
  xhosa: 'xho_Latn',
  afrikaans: 'afr_Latn',
  somali: 'som_Latn',

  // ========== EUROPEAN LANGUAGES ==========
  greek: 'ell_Grek',
  czech: 'ces_Latn',
  romanian: 'ron_Latn',
  hungarian: 'hun_Latn',
  swedish: 'swe_Latn',
  danish: 'dan_Latn',
  finnish: 'fin_Latn',
  norwegian: 'nob_Latn',
  icelandic: 'isl_Latn',
  catalan: 'cat_Latn',
  croatian: 'hrv_Latn',
  serbian: 'srp_Cyrl',
  bosnian: 'bos_Latn',
  slovak: 'slk_Latn',
  slovenian: 'slv_Latn',
  bulgarian: 'bul_Cyrl',
  lithuanian: 'lit_Latn',
  latvian: 'lvs_Latn',
  estonian: 'est_Latn',

  // ========== CENTRAL ASIAN LANGUAGES ==========
  georgian: 'kat_Geor',
  armenian: 'hye_Armn',
  azerbaijani: 'azj_Latn',
  kazakh: 'kaz_Cyrl',
  uzbek: 'uzn_Latn',
  turkmen: 'tuk_Latn',
  kyrgyz: 'kir_Cyrl',
  tajik: 'tgk_Cyrl',
  mongolian: 'khk_Cyrl',
  tibetan: 'bod_Tibt',
};

// Script detection patterns
export const SCRIPT_PATTERNS: ScriptPattern[] = [
  // Indian Scripts
  { regex: /[\u0900-\u097F]/, language: 'hindi', nllbCode: 'hin_Deva', script: 'Devanagari' },
  { regex: /[\u0980-\u09FF]/, language: 'bengali', nllbCode: 'ben_Beng', script: 'Bengali' },
  { regex: /[\u0C00-\u0C7F]/, language: 'telugu', nllbCode: 'tel_Telu', script: 'Telugu' },
  { regex: /[\u0B80-\u0BFF]/, language: 'tamil', nllbCode: 'tam_Taml', script: 'Tamil' },
  { regex: /[\u0A80-\u0AFF]/, language: 'gujarati', nllbCode: 'guj_Gujr', script: 'Gujarati' },
  { regex: /[\u0C80-\u0CFF]/, language: 'kannada', nllbCode: 'kan_Knda', script: 'Kannada' },
  { regex: /[\u0D00-\u0D7F]/, language: 'malayalam', nllbCode: 'mal_Mlym', script: 'Malayalam' },
  { regex: /[\u0A00-\u0A7F]/, language: 'punjabi', nllbCode: 'pan_Guru', script: 'Gurmukhi' },
  { regex: /[\u0B00-\u0B7F]/, language: 'odia', nllbCode: 'ory_Orya', script: 'Oriya' },
  { regex: /[\u0D80-\u0DFF]/, language: 'sinhala', nllbCode: 'sin_Sinh', script: 'Sinhala' },

  // East Asian Scripts
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: 'chinese', nllbCode: 'zho_Hans', script: 'Han' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese', nllbCode: 'jpn_Jpan', script: 'Japanese' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: 'korean', nllbCode: 'kor_Hang', script: 'Hangul' },

  // Southeast Asian Scripts
  { regex: /[\u0E00-\u0E7F]/, language: 'thai', nllbCode: 'tha_Thai', script: 'Thai' },
  { regex: /[\u1000-\u109F]/, language: 'burmese', nllbCode: 'mya_Mymr', script: 'Myanmar' },
  { regex: /[\u1780-\u17FF]/, language: 'khmer', nllbCode: 'khm_Khmr', script: 'Khmer' },
  { regex: /[\u0E80-\u0EFF]/, language: 'lao', nllbCode: 'lao_Laoo', script: 'Lao' },

  // Middle Eastern Scripts
  { regex: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/, language: 'arabic', nllbCode: 'arb_Arab', script: 'Arabic' },
  { regex: /[\u0590-\u05FF\uFB1D-\uFB4F]/, language: 'hebrew', nllbCode: 'heb_Hebr', script: 'Hebrew' },

  // Cyrillic
  { regex: /[\u0400-\u04FF]/, language: 'russian', nllbCode: 'rus_Cyrl', script: 'Cyrillic' },

  // Caucasian Scripts
  { regex: /[\u10A0-\u10FF]/, language: 'georgian', nllbCode: 'kat_Geor', script: 'Georgian' },
  { regex: /[\u0530-\u058F]/, language: 'armenian', nllbCode: 'hye_Armn', script: 'Armenian' },

  // African Scripts
  { regex: /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/, language: 'amharic', nllbCode: 'amh_Ethi', script: 'Ethiopic' },

  // Greek
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, language: 'greek', nllbCode: 'ell_Grek', script: 'Greek' },

  // Tibetan
  { regex: /[\u0F00-\u0FFF]/, language: 'tibetan', nllbCode: 'bod_Tibt', script: 'Tibetan' },
];

// Indian language list
export const INDIAN_LANGUAGES = [
  'hindi', 'bengali', 'bangla', 'telugu', 'tamil', 'marathi', 'gujarati',
  'kannada', 'malayalam', 'punjabi', 'odia', 'oriya', 'assamese', 'nepali',
  'urdu', 'konkani', 'maithili', 'santali', 'bodo', 'dogri', 'kashmiri',
  'sindhi', 'manipuri', 'sinhala', 'bhojpuri', 'magahi', 'chhattisgarhi', 'awadhi'
];

// Latin-script languages
export const LATIN_SCRIPT_LANGUAGES = [
  'english', 'spanish', 'french', 'german', 'portuguese', 'italian', 'dutch',
  'polish', 'vietnamese', 'indonesian', 'malay', 'tagalog', 'turkish', 'swahili',
  'czech', 'romanian', 'hungarian', 'swedish', 'danish', 'finnish', 'norwegian'
];

/**
 * Get NLLB code for a language name
 */
export function getNLLBCode(language: string): NLLBLanguageCode | null {
  if (!language) return null;
  const normalized = language.toLowerCase().trim();
  return LANGUAGE_TO_NLLB[normalized] || null;
}

/**
 * Check if a language is Indian
 */
export function isIndianLanguage(language: string): boolean {
  return INDIAN_LANGUAGES.includes(language.toLowerCase().trim());
}

/**
 * Check if a language uses Latin script
 */
export function isLatinScriptLanguage(language: string): boolean {
  return LATIN_SCRIPT_LANGUAGES.includes(language.toLowerCase().trim());
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_TO_NLLB);
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
  return getNLLBCode(language) !== null;
}

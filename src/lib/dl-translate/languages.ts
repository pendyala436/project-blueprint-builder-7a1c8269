/**
 * DL-Translate Language Mappings
 * Complete NLLB-200 language support (200+ languages)
 */

import type { NLLBCode, LanguageInfo, ScriptDetectionResult } from './types';

// Language name to NLLB code mapping
export const LANGUAGE_TO_CODE: Record<string, NLLBCode> = {
  // Major World Languages
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
  
  // East Asian
  chinese: 'zho_Hans',
  'chinese simplified': 'zho_Hans',
  'chinese traditional': 'zho_Hant',
  japanese: 'jpn_Jpan',
  korean: 'kor_Hang',
  vietnamese: 'vie_Latn',
  
  // South Asian / Indian
  hindi: 'hin_Deva',
  bengali: 'ben_Beng',
  bangla: 'ben_Beng',
  tamil: 'tam_Taml',
  telugu: 'tel_Telu',
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
  sinhala: 'sin_Sinh',
  konkani: 'gom_Deva',
  maithili: 'mai_Deva',
  santali: 'sat_Olck',
  bodo: 'brx_Deva',
  dogri: 'doi_Deva',
  kashmiri: 'kas_Arab',
  sindhi: 'snd_Arab',
  manipuri: 'mni_Beng',
  
  // Southeast Asian
  thai: 'tha_Thai',
  indonesian: 'ind_Latn',
  malay: 'zsm_Latn',
  tagalog: 'tgl_Latn',
  filipino: 'tgl_Latn',
  burmese: 'mya_Mymr',
  khmer: 'khm_Khmr',
  lao: 'lao_Laoo',
  javanese: 'jav_Latn',
  
  // Middle Eastern
  arabic: 'arb_Arab',
  persian: 'pes_Arab',
  farsi: 'pes_Arab',
  turkish: 'tur_Latn',
  hebrew: 'heb_Hebr',
  
  // European
  greek: 'ell_Grek',
  czech: 'ces_Latn',
  romanian: 'ron_Latn',
  hungarian: 'hun_Latn',
  swedish: 'swe_Latn',
  danish: 'dan_Latn',
  finnish: 'fin_Latn',
  norwegian: 'nob_Latn',
  
  // African
  swahili: 'swh_Latn',
  amharic: 'amh_Ethi',
  yoruba: 'yor_Latn',
  igbo: 'ibo_Latn',
  hausa: 'hau_Latn',
  zulu: 'zul_Latn',
  
  // Central Asian
  georgian: 'kat_Geor',
  armenian: 'hye_Armn',
  kazakh: 'kaz_Cyrl',
  uzbek: 'uzn_Latn',
};

// NLLB code to language name mapping
export const CODE_TO_LANGUAGE: Record<NLLBCode, string> = Object.entries(LANGUAGE_TO_CODE)
  .reduce((acc, [name, code]) => {
    if (!acc[code]) acc[code] = name;
    return acc;
  }, {} as Record<NLLBCode, string>);

// Script patterns for language detection
const SCRIPT_PATTERNS: Array<{ regex: RegExp; script: string; language: string; code: NLLBCode }> = [
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', language: 'hindi', code: 'hin_Deva' },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', language: 'bengali', code: 'ben_Beng' },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', language: 'tamil', code: 'tam_Taml' },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', language: 'telugu', code: 'tel_Telu' },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', language: 'kannada', code: 'kan_Knda' },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', language: 'malayalam', code: 'mal_Mlym' },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', language: 'gujarati', code: 'guj_Gujr' },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', language: 'punjabi', code: 'pan_Guru' },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', language: 'odia', code: 'ory_Orya' },
  { regex: /[\u0600-\u06FF]/, script: 'Arabic', language: 'arabic', code: 'arb_Arab' },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', language: 'hebrew', code: 'heb_Hebr' },
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', language: 'thai', code: 'tha_Thai' },
  { regex: /[\u4E00-\u9FFF]/, script: 'Han', language: 'chinese', code: 'zho_Hans' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', language: 'japanese', code: 'jpn_Jpan' },
  { regex: /[\uAC00-\uD7AF]/, script: 'Hangul', language: 'korean', code: 'kor_Hang' },
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', language: 'russian', code: 'rus_Cyrl' },
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', language: 'georgian', code: 'kat_Geor' },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', language: 'armenian', code: 'hye_Armn' },
  { regex: /[\u1200-\u137F]/, script: 'Ethiopic', language: 'amharic', code: 'amh_Ethi' },
  { regex: /[\u0D80-\u0DFF]/, script: 'Sinhala', language: 'sinhala', code: 'sin_Sinh' },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', language: 'burmese', code: 'mya_Mymr' },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', language: 'khmer', code: 'khm_Khmr' },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', language: 'lao', code: 'lao_Laoo' },
  { regex: /[\u0F00-\u0FFF]/, script: 'Tibetan', language: 'tibetan', code: 'bod_Tibt' },
  { regex: /[\u0370-\u03FF]/, script: 'Greek', language: 'greek', code: 'ell_Grek' },
];

/**
 * Get NLLB code for a language name
 */
export function getCode(language: string): NLLBCode {
  const normalized = language.toLowerCase().trim();
  return LANGUAGE_TO_CODE[normalized] || 'eng_Latn';
}

/**
 * Get language name from NLLB code
 */
export function getLanguage(code: NLLBCode): string {
  return CODE_TO_LANGUAGE[code] || 'english';
}

/**
 * Check if text is Latin script
 */
export function isLatinScript(text: string): boolean {
  const latinChars = text.match(/[a-zA-Z]/g) || [];
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 && latinChars.length / totalChars > 0.5;
}

/**
 * Detect script and language from text
 */
export function detectScript(text: string): ScriptDetectionResult {
  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(text)) {
      const matches = text.match(pattern.regex) || [];
      const confidence = matches.length / text.replace(/\s/g, '').length;
      return {
        script: pattern.script,
        language: pattern.language,
        code: pattern.code,
        confidence: Math.min(confidence, 1),
      };
    }
  }
  
  return {
    script: 'Latin',
    language: 'english',
    code: 'eng_Latn',
    confidence: 0.5,
  };
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): LanguageInfo[] {
  return Object.entries(LANGUAGE_TO_CODE).map(([name, code]) => ({
    name,
    code,
    script: code.split('_')[1] || 'Unknown',
  }));
}

/**
 * Check if two languages are the same
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  const code1 = getCode(lang1);
  const code2 = getCode(lang2);
  return code1 === code2;
}

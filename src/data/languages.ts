// Master Language Data - 300+ Languages Worldwide
// Synced with dlTranslateLanguages.ts for translation support
// Used across registration, profile, and settings

import { ALL_LANGUAGES, DLTranslateLanguage } from './dlTranslateLanguages';

// Standard language interface for app usage
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  isIndian?: boolean;
  script?: string;
  region?: string;
}

// Convert DLTranslateLanguage to standard Language format
function toLanguage(lang: DLTranslateLanguage): Language {
  return {
    code: lang.code,
    name: lang.name,
    nativeName: lang.nativeName,
    isIndian: lang.isIndian,
    script: lang.script,
    region: lang.region,
  };
}

// Export all languages in standard format
export const languages: Language[] = ALL_LANGUAGES.map(toLanguage);

// Get Indian languages only
export const indianLanguages: Language[] = languages.filter(l => l.isIndian);

// Get world (non-Indian) languages only
export const worldLanguages: Language[] = languages.filter(l => !l.isIndian);

// Helper functions
export function getLanguageByCode(code: string): Language | undefined {
  return languages.find(l => l.code === code);
}

export function getLanguageByName(name: string): Language | undefined {
  const normalized = name.toLowerCase().trim();
  return languages.find(l => l.name.toLowerCase() === normalized);
}

export function searchLanguages(query: string): Language[] {
  if (!query.trim()) return languages;
  const q = query.toLowerCase();
  return languages.filter(l =>
    l.name.toLowerCase().includes(q) ||
    l.nativeName.toLowerCase().includes(q) ||
    l.code.toLowerCase().includes(q) ||
    (l.region && l.region.toLowerCase().includes(q))
  );
}

export function getLanguagesByRegion(region: string): Language[] {
  return languages.filter(l => l.region?.toLowerCase() === region.toLowerCase());
}

// Language count stats
export function getLanguageStats() {
  return {
    total: languages.length,
    indian: indianLanguages.length,
    world: worldLanguages.length,
  };
}

// Common aliases for registration forms
export const REGISTRATION_LANGUAGES = [
  "English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil",
  "Gujarati", "Kannada", "Malayalam", "Punjabi", "Odia", "Urdu",
  "Spanish", "French", "German", "Portuguese", "Italian", "Russian",
  "Chinese (Simplified)", "Japanese", "Korean", "Arabic", "Turkish"
];

// Get registration languages as full objects
export function getRegistrationLanguages(): Language[] {
  return REGISTRATION_LANGUAGES.map(name => getLanguageByName(name)).filter(Boolean) as Language[];
}

// ISO 639-1 to NLLB code mapping
export const ISO_TO_NLLB: Record<string, string> = {
  "en": "eng_Latn",
  "es": "spa_Latn",
  "fr": "fra_Latn",
  "de": "deu_Latn",
  "pt": "por_Latn",
  "it": "ita_Latn",
  "nl": "nld_Latn",
  "ru": "rus_Cyrl",
  "pl": "pol_Latn",
  "uk": "ukr_Cyrl",
  "zh": "zho_Hans",
  "ja": "jpn_Jpan",
  "ko": "kor_Hang",
  "vi": "vie_Latn",
  "th": "tha_Thai",
  "id": "ind_Latn",
  "ms": "zsm_Latn",
  "tl": "tgl_Latn",
  "ar": "arb_Arab",
  "fa": "pes_Arab",
  "tr": "tur_Latn",
  "he": "heb_Hebr",
  "hi": "hin_Deva",
  "bn": "ben_Beng",
  "te": "tel_Telu",
  "mr": "mar_Deva",
  "ta": "tam_Taml",
  "gu": "guj_Gujr",
  "kn": "kan_Knda",
  "ml": "mal_Mlym",
  "pa": "pan_Guru",
  "or": "ory_Orya",
  "as": "asm_Beng",
  "ur": "urd_Arab",
  "ne": "npi_Deva",
  "si": "sin_Sinh",
  "sw": "swh_Latn",
  "am": "amh_Ethi",
  "yo": "yor_Latn",
  "ig": "ibo_Latn",
  "ha": "hau_Latn",
  "zu": "zul_Latn",
  "xh": "xho_Latn",
  "af": "afr_Latn",
  "el": "ell_Grek",
  "cs": "ces_Latn",
  "ro": "ron_Latn",
  "hu": "hun_Latn",
  "sv": "swe_Latn",
  "da": "dan_Latn",
  "fi": "fin_Latn",
  "nb": "nob_Latn",
  "nn": "nno_Latn",
  "is": "isl_Latn",
  "ca": "cat_Latn",
  "gl": "glg_Latn",
  "eu": "eus_Latn",
  "hr": "hrv_Latn",
  "sr": "srp_Cyrl",
  "sk": "slk_Latn",
  "sl": "slv_Latn",
  "bg": "bul_Cyrl",
  "lt": "lit_Latn",
  "lv": "lvs_Latn",
  "et": "est_Latn",
  "sq": "als_Latn",
  "mk": "mkd_Cyrl",
  "bs": "bos_Latn",
  "be": "bel_Cyrl",
  "mt": "mlt_Latn",
  "cy": "cym_Latn",
  "ga": "gle_Latn",
  "gd": "gla_Latn",
  "ka": "kat_Geor",
  "hy": "hye_Armn",
  "kk": "kaz_Cyrl",
  "uz": "uzn_Latn",
  "ky": "kir_Cyrl",
  "tg": "tgk_Cyrl",
  "tk": "tuk_Latn",
  "mn": "khk_Cyrl",
  "bo": "bod_Tibt",
  "my": "mya_Mymr",
  "km": "khm_Khmr",
  "lo": "lao_Laoo",
  "jv": "jav_Latn",
  "su": "sun_Latn",
  "mi": "mri_Latn",
  "ht": "hat_Latn",
  "mg": "plt_Latn",
  "rw": "kin_Latn",
  "rn": "run_Latn",
  "lg": "lug_Latn",
  "ln": "lin_Latn",
  "sn": "sna_Latn",
  "ny": "nya_Latn",
  "so": "som_Latn",
  "ti": "tir_Ethi",
  "wo": "wol_Latn",
  "ff": "ful_Latn",
  "om": "gaz_Latn",
  "tn": "tsn_Latn",
  "ts": "tso_Latn",
  "ss": "ssw_Latn",
  "st": "sot_Latn",
  "ve": "ven_Latn",
  "nd": "nde_Latn",
  "ay": "ayr_Latn",
  "qu": "quy_Latn",
  "gn": "grn_Latn",
  "eo": "epo_Latn",
  "yi": "ydd_Hebr",
  "la": "lat_Latn",
  "sa": "san_Deva",
  "sd": "snd_Arab",
  "ks": "kas_Arab",
};

// NLLB to ISO 639-1 reverse mapping
export const NLLB_TO_ISO: Record<string, string> = Object.fromEntries(
  Object.entries(ISO_TO_NLLB).map(([iso, nllb]) => [nllb, iso])
);

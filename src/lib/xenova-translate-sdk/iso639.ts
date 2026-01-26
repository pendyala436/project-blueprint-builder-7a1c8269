/**
 * ISO-639 Language Code Mapping
 * Maps codes to language names and NLLB codes
 */

// Standard ISO-639-1/2 to NLLB-200 code mapping
export const ISO_TO_NLLB: Record<string, string> = {
  // Major world languages
  en: 'eng_Latn',
  hi: 'hin_Deva',
  zh: 'zho_Hans',
  es: 'spa_Latn',
  ar: 'arb_Arab',
  bn: 'ben_Beng',
  pt: 'por_Latn',
  ru: 'rus_Cyrl',
  ja: 'jpn_Jpan',
  pa: 'pan_Guru',
  de: 'deu_Latn',
  ko: 'kor_Hang',
  fr: 'fra_Latn',
  te: 'tel_Telu',
  mr: 'mar_Deva',
  tr: 'tur_Latn',
  ta: 'tam_Taml',
  vi: 'vie_Latn',
  ur: 'urd_Arab',
  it: 'ita_Latn',
  th: 'tha_Thai',
  gu: 'guj_Gujr',
  fa: 'pes_Arab',
  pl: 'pol_Latn',
  uk: 'ukr_Cyrl',
  ml: 'mal_Mlym',
  kn: 'kan_Knda',
  or: 'ory_Orya',
  my: 'mya_Mymr',
  sw: 'swh_Latn',
  uz: 'uzn_Latn',
  sd: 'snd_Arab',
  am: 'amh_Ethi',
  ha: 'hau_Latn',
  yo: 'yor_Latn',
  ig: 'ibo_Latn',
  ne: 'npi_Deva',
  nl: 'nld_Latn',
  ro: 'ron_Latn',
  el: 'ell_Grek',
  hu: 'hun_Latn',
  cs: 'ces_Latn',
  sv: 'swe_Latn',
  he: 'heb_Hebr',
  az: 'azj_Latn',
  kk: 'kaz_Cyrl',
  be: 'bel_Cyrl',
  sr: 'srp_Cyrl',
  bg: 'bul_Cyrl',
  sk: 'slk_Latn',
  da: 'dan_Latn',
  fi: 'fin_Latn',
  no: 'nob_Latn',
  hr: 'hrv_Latn',
  id: 'ind_Latn',
  ms: 'zsm_Latn',
  tl: 'tgl_Latn',
  zu: 'zul_Latn',
  xh: 'xho_Latn',
  af: 'afr_Latn',
  km: 'khm_Khmr',
  lo: 'lao_Laoo',
  si: 'sin_Sinh',
  ka: 'kat_Geor',
  
  // Indian languages
  as: 'asm_Beng',
  mai: 'mai_Deva',
  sat: 'sat_Olck',
  ks: 'kas_Arab',
  kok: 'kok_Deva',
  doi: 'doi_Deva',
  mni: 'mni_Beng',
  brx: 'brx_Deva',
  sa: 'san_Deva',
  bho: 'bho_Deva',
  
  // African languages
  rw: 'kin_Latn',
  sn: 'sna_Latn',
  so: 'som_Latn',
  mg: 'plt_Latn',
  ny: 'nya_Latn',
  wo: 'wol_Latn',
  ff: 'fuv_Latn',
  
  // Southeast Asian
  jv: 'jav_Latn',
  su: 'sun_Latn',
  ceb: 'ceb_Latn',
  ilo: 'ilo_Latn',
  min: 'min_Latn',
  
  // European
  ca: 'cat_Latn',
  gl: 'glg_Latn',
  eu: 'eus_Latn',
  cy: 'cym_Latn',
  ga: 'gle_Latn',
  gd: 'gla_Latn',
  is: 'isl_Latn',
  lb: 'ltz_Latn',
  mt: 'mlt_Latn',
  et: 'est_Latn',
  lv: 'lvs_Latn',
  lt: 'lit_Latn',
  sl: 'slv_Latn',
  mk: 'mkd_Cyrl',
  sq: 'als_Latn',
  bs: 'bos_Latn',
  
  // Central/West Asian
  hy: 'hye_Armn',
  ps: 'pbt_Arab',
  tg: 'tgk_Cyrl',
  ky: 'kir_Cyrl',
  tk: 'tuk_Latn',
  mn: 'khk_Cyrl',
  
  // Other
  eo: 'epo_Latn',
  la: 'lat_Latn',
  dv: 'div_Thaa',
  bo: 'bod_Tibt',
};

// M2M-100 language codes (simpler format)
export const ISO_TO_M2M: Record<string, string> = {
  en: 'en',
  hi: 'hi',
  zh: 'zh',
  es: 'es',
  ar: 'ar',
  bn: 'bn',
  pt: 'pt',
  ru: 'ru',
  ja: 'ja',
  de: 'de',
  ko: 'ko',
  fr: 'fr',
  tr: 'tr',
  vi: 'vi',
  it: 'it',
  th: 'th',
  pl: 'pl',
  uk: 'uk',
  nl: 'nl',
  ro: 'ro',
  el: 'el',
  hu: 'hu',
  cs: 'cs',
  sv: 'sv',
  he: 'he',
  da: 'da',
  fi: 'fi',
  no: 'nb',
  hr: 'hr',
  id: 'id',
  ms: 'ms',
  tl: 'tl',
  af: 'af',
};

/**
 * Get NLLB code for a language
 */
export function getNLLBCode(isoCode: string): string | null {
  return ISO_TO_NLLB[isoCode.toLowerCase()] || null;
}

/**
 * Get M2M code for a language
 */
export function getM2MCode(isoCode: string): string | null {
  return ISO_TO_M2M[isoCode.toLowerCase()] || null;
}

/**
 * Check if language is supported by NLLB
 */
export function isNLLBSupported(isoCode: string): boolean {
  return isoCode.toLowerCase() in ISO_TO_NLLB;
}

/**
 * Check if language is supported by M2M
 */
export function isM2MSupported(isoCode: string): boolean {
  return isoCode.toLowerCase() in ISO_TO_M2M;
}

/**
 * Get language name from ISO code
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    te: 'Telugu',
    ta: 'Tamil',
    kn: 'Kannada',
    ml: 'Malayalam',
    mr: 'Marathi',
    gu: 'Gujarati',
    bn: 'Bengali',
    pa: 'Punjabi',
    ur: 'Urdu',
    or: 'Odia',
    as: 'Assamese',
    ne: 'Nepali',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic',
  };
  return names[code.toLowerCase()] || `Language (${code})`;
}

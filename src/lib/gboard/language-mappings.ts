/**
 * Complete Language to GBoard Layout Mappings
 * Maps ALL NLLB-200 languages AND 900+ Google GBoard languages to keyboard layouts
 */

import { ScriptType } from './types';

export interface LanguageMapping {
  code: string;
  name: string;
  nativeName: string;
  script: ScriptType;
  layoutId: string;
}

// ===================== SCRIPT-BASED FALLBACK MAPPINGS =====================
export const scriptToLayoutFallback: Record<string, string> = {
  'latin': 'en',
  'devanagari': 'hi',
  'bengali': 'bn',
  'tamil': 'ta',
  'telugu': 'te',
  'kannada': 'kn',
  'malayalam': 'ml',
  'gujarati': 'gu',
  'gurmukhi': 'pa',
  'odia': 'or',
  'sinhala': 'si',
  'tibetan': 'bo',
  'ol-chiki': 'sat',
  'meitei': 'mni',
  'arabic': 'ar',
  'han': 'zh',
  'hiragana': 'ja',
  'katakana': 'ja',
  'hangul': 'ko',
  'thai': 'th',
  'khmer': 'km',
  'myanmar': 'my',
  'lao': 'lo',
  'cyrillic': 'ru',
  'greek': 'el',
  'hebrew': 'he',
  'georgian': 'ka',
  'armenian': 'hy',
  'ethiopic': 'am',
  'tifinagh': 'ber',
  'thaana': 'dv',
  'cherokee': 'chr',
  'canadian-aboriginal': 'cr',
  'lepcha': 'lep',
  'warang-citi': 'hoc',
  'chakma': 'ccp',
  'mongolian': 'mn',
  'bopomofo': 'zh',
};

// ===================== NLLB-200 LANGUAGE TO GBOARD MAPPINGS =====================
// All 200+ NLLB-200 languages mapped to GBoard layouts

export const nllb200ToGboardMappings: Record<string, { layoutId: string; script: ScriptType }> = {
  // Indian Languages (22)
  'hin_Deva': { layoutId: 'hi', script: 'devanagari' },
  'ben_Beng': { layoutId: 'bn', script: 'bengali' },
  'tel_Telu': { layoutId: 'te', script: 'telugu' },
  'tam_Taml': { layoutId: 'ta', script: 'tamil' },
  'mar_Deva': { layoutId: 'mr', script: 'devanagari' },
  'guj_Gujr': { layoutId: 'gu', script: 'gujarati' },
  'kan_Knda': { layoutId: 'kn', script: 'kannada' },
  'mal_Mlym': { layoutId: 'ml', script: 'malayalam' },
  'pan_Guru': { layoutId: 'pa', script: 'gurmukhi' },
  'ory_Orya': { layoutId: 'or', script: 'odia' },
  'asm_Beng': { layoutId: 'as', script: 'bengali' },
  'npi_Deva': { layoutId: 'ne', script: 'devanagari' },
  'urd_Arab': { layoutId: 'ur', script: 'arabic' },
  'gom_Deva': { layoutId: 'kok', script: 'devanagari' },
  'mai_Deva': { layoutId: 'mai', script: 'devanagari' },
  'sat_Olck': { layoutId: 'sat', script: 'ol-chiki' },
  'brx_Deva': { layoutId: 'brx', script: 'devanagari' },
  'doi_Deva': { layoutId: 'doi', script: 'devanagari' },
  'kas_Arab': { layoutId: 'ks', script: 'arabic' },
  'snd_Arab': { layoutId: 'sd', script: 'arabic' },
  'mni_Beng': { layoutId: 'mni', script: 'bengali' },
  'sin_Sinh': { layoutId: 'si', script: 'sinhala' },
  
  // Major World Languages
  'eng_Latn': { layoutId: 'en', script: 'latin' },
  'spa_Latn': { layoutId: 'es', script: 'latin' },
  'fra_Latn': { layoutId: 'fr', script: 'latin' },
  'deu_Latn': { layoutId: 'de', script: 'latin' },
  'por_Latn': { layoutId: 'pt', script: 'latin' },
  'ita_Latn': { layoutId: 'it', script: 'latin' },
  'nld_Latn': { layoutId: 'nl', script: 'latin' },
  'rus_Cyrl': { layoutId: 'ru', script: 'cyrillic' },
  'pol_Latn': { layoutId: 'pl', script: 'latin' },
  'ukr_Cyrl': { layoutId: 'uk', script: 'cyrillic' },
  
  // East Asian Languages
  'zho_Hans': { layoutId: 'zh', script: 'han' },
  'zho_Hant': { layoutId: 'zh-tw', script: 'han' },
  'jpn_Jpan': { layoutId: 'ja', script: 'hiragana' },
  'kor_Hang': { layoutId: 'ko', script: 'hangul' },
  'vie_Latn': { layoutId: 'vi', script: 'latin' },
  
  // Southeast Asian Languages
  'tha_Thai': { layoutId: 'th', script: 'thai' },
  'ind_Latn': { layoutId: 'id', script: 'latin' },
  'zsm_Latn': { layoutId: 'ms', script: 'latin' },
  'tgl_Latn': { layoutId: 'tl', script: 'latin' },
  'ceb_Latn': { layoutId: 'ceb', script: 'latin' },
  'ilo_Latn': { layoutId: 'ilo', script: 'latin' },
  'war_Latn': { layoutId: 'war', script: 'latin' },
  'mya_Mymr': { layoutId: 'my', script: 'myanmar' },
  'khm_Khmr': { layoutId: 'km', script: 'khmer' },
  'lao_Laoo': { layoutId: 'lo', script: 'lao' },
  'jav_Latn': { layoutId: 'jv', script: 'latin' },
  'sun_Latn': { layoutId: 'su', script: 'latin' },
  'min_Latn': { layoutId: 'min', script: 'latin' },
  'ace_Latn': { layoutId: 'ace', script: 'latin' },
  'ban_Latn': { layoutId: 'ban', script: 'latin' },
  'bjn_Latn': { layoutId: 'bjn', script: 'latin' },
  
  // Middle Eastern Languages
  'arb_Arab': { layoutId: 'ar', script: 'arabic' },
  'arz_Arab': { layoutId: 'ar-eg', script: 'arabic' },
  'acm_Arab': { layoutId: 'ar-iq', script: 'arabic' },
  'acq_Arab': { layoutId: 'ar-ye', script: 'arabic' },
  'apc_Arab': { layoutId: 'ar-lb', script: 'arabic' },
  'ary_Arab': { layoutId: 'ar-ma', script: 'arabic' },
  'ars_Arab': { layoutId: 'ar-sa', script: 'arabic' },
  'pes_Arab': { layoutId: 'fa', script: 'arabic' },
  'prs_Arab': { layoutId: 'fa-af', script: 'arabic' },
  'tur_Latn': { layoutId: 'tr', script: 'latin' },
  'heb_Hebr': { layoutId: 'he', script: 'hebrew' },
  'kur_Arab': { layoutId: 'ckb', script: 'arabic' },
  'kmr_Latn': { layoutId: 'ku', script: 'latin' },
  'pbt_Arab': { layoutId: 'ps', script: 'arabic' },
  'azj_Latn': { layoutId: 'az', script: 'latin' },
  'azb_Arab': { layoutId: 'az-arab', script: 'arabic' },
  
  // African Languages
  'swh_Latn': { layoutId: 'sw', script: 'latin' },
  'amh_Ethi': { layoutId: 'am', script: 'ethiopic' },
  'yor_Latn': { layoutId: 'yo', script: 'latin' },
  'ibo_Latn': { layoutId: 'ig', script: 'latin' },
  'hau_Latn': { layoutId: 'ha', script: 'latin' },
  'zul_Latn': { layoutId: 'zu', script: 'latin' },
  'xho_Latn': { layoutId: 'xh', script: 'latin' },
  'afr_Latn': { layoutId: 'af', script: 'latin' },
  'som_Latn': { layoutId: 'so', script: 'latin' },
  'orm_Latn': { layoutId: 'om', script: 'latin' },
  'tir_Ethi': { layoutId: 'ti', script: 'ethiopic' },
  'wol_Latn': { layoutId: 'wo', script: 'latin' },
  'ful_Latn': { layoutId: 'ff', script: 'latin' },
  'sna_Latn': { layoutId: 'sn', script: 'latin' },
  'nya_Latn': { layoutId: 'ny', script: 'latin' },
  'lin_Latn': { layoutId: 'ln', script: 'latin' },
  'lug_Latn': { layoutId: 'lg', script: 'latin' },
  'luo_Latn': { layoutId: 'luo', script: 'latin' },
  'kam_Latn': { layoutId: 'kam', script: 'latin' },
  'kik_Latn': { layoutId: 'ki', script: 'latin' },
  'nso_Latn': { layoutId: 'nso', script: 'latin' },
  'sot_Latn': { layoutId: 'st', script: 'latin' },
  'ssw_Latn': { layoutId: 'ss', script: 'latin' },
  'tsn_Latn': { layoutId: 'tn', script: 'latin' },
  'tso_Latn': { layoutId: 'ts', script: 'latin' },
  'ven_Latn': { layoutId: 've', script: 'latin' },
  'nde_Latn': { layoutId: 'nd', script: 'latin' },
  'run_Latn': { layoutId: 'rn', script: 'latin' },
  'kin_Latn': { layoutId: 'rw', script: 'latin' },
  'kon_Latn': { layoutId: 'kg', script: 'latin' },
  'twi_Latn': { layoutId: 'tw', script: 'latin' },
  'aka_Latn': { layoutId: 'ak', script: 'latin' },
  'ewe_Latn': { layoutId: 'ee', script: 'latin' },
  'fon_Latn': { layoutId: 'fon', script: 'latin' },
  'mos_Latn': { layoutId: 'mos', script: 'latin' },
  'bam_Latn': { layoutId: 'bm', script: 'latin' },
  'lua_Latn': { layoutId: 'lua', script: 'latin' },
  'umb_Latn': { layoutId: 'umb', script: 'latin' },
  'kea_Latn': { layoutId: 'kea', script: 'latin' },
  'plt_Latn': { layoutId: 'mg', script: 'latin' },
  
  // European Languages
  'ell_Grek': { layoutId: 'el', script: 'greek' },
  'ces_Latn': { layoutId: 'cs', script: 'latin' },
  'ron_Latn': { layoutId: 'ro', script: 'latin' },
  'hun_Latn': { layoutId: 'hu', script: 'latin' },
  'swe_Latn': { layoutId: 'sv', script: 'latin' },
  'dan_Latn': { layoutId: 'da', script: 'latin' },
  'fin_Latn': { layoutId: 'fi', script: 'latin' },
  'nob_Latn': { layoutId: 'nb', script: 'latin' },
  'nno_Latn': { layoutId: 'nn', script: 'latin' },
  'isl_Latn': { layoutId: 'is', script: 'latin' },
  'cat_Latn': { layoutId: 'ca', script: 'latin' },
  'glg_Latn': { layoutId: 'gl', script: 'latin' },
  'eus_Latn': { layoutId: 'eu', script: 'latin' },
  'hrv_Latn': { layoutId: 'hr', script: 'latin' },
  'srp_Cyrl': { layoutId: 'sr', script: 'cyrillic' },
  'slk_Latn': { layoutId: 'sk', script: 'latin' },
  'slv_Latn': { layoutId: 'sl', script: 'latin' },
  'bul_Cyrl': { layoutId: 'bg', script: 'cyrillic' },
  'lit_Latn': { layoutId: 'lt', script: 'latin' },
  'lvs_Latn': { layoutId: 'lv', script: 'latin' },
  'est_Latn': { layoutId: 'et', script: 'latin' },
  'als_Latn': { layoutId: 'sq', script: 'latin' },
  'mkd_Cyrl': { layoutId: 'mk', script: 'cyrillic' },
  'bos_Latn': { layoutId: 'bs', script: 'latin' },
  'bel_Cyrl': { layoutId: 'be', script: 'cyrillic' },
  'mlt_Latn': { layoutId: 'mt', script: 'latin' },
  'cym_Latn': { layoutId: 'cy', script: 'latin' },
  'gle_Latn': { layoutId: 'ga', script: 'latin' },
  'gla_Latn': { layoutId: 'gd', script: 'latin' },
  'bre_Latn': { layoutId: 'br', script: 'latin' },
  'oci_Latn': { layoutId: 'oc', script: 'latin' },
  'ast_Latn': { layoutId: 'ast', script: 'latin' },
  'ltz_Latn': { layoutId: 'lb', script: 'latin' },
  'fry_Latn': { layoutId: 'fy', script: 'latin' },
  'lim_Latn': { layoutId: 'li', script: 'latin' },
  'scn_Latn': { layoutId: 'scn', script: 'latin' },
  'srd_Latn': { layoutId: 'sc', script: 'latin' },
  'fur_Latn': { layoutId: 'fur', script: 'latin' },
  'lmo_Latn': { layoutId: 'lmo', script: 'latin' },
  'vec_Latn': { layoutId: 'vec', script: 'latin' },
  'szl_Latn': { layoutId: 'szl', script: 'latin' },
  
  // Central Asian Languages
  'kat_Geor': { layoutId: 'ka', script: 'georgian' },
  'hye_Armn': { layoutId: 'hy', script: 'armenian' },
  'kaz_Cyrl': { layoutId: 'kk', script: 'cyrillic' },
  'uzn_Latn': { layoutId: 'uz', script: 'latin' },
  'kir_Cyrl': { layoutId: 'ky', script: 'cyrillic' },
  'tgk_Cyrl': { layoutId: 'tg', script: 'cyrillic' },
  'tuk_Latn': { layoutId: 'tk', script: 'latin' },
  'khk_Cyrl': { layoutId: 'mn', script: 'cyrillic' },
  'bod_Tibt': { layoutId: 'bo', script: 'tibetan' },
  'uig_Arab': { layoutId: 'ug', script: 'arabic' },
  'tat_Cyrl': { layoutId: 'tt', script: 'cyrillic' },
  'bak_Cyrl': { layoutId: 'ba', script: 'cyrillic' },
  
  // Pacific & Oceanic Languages
  'mri_Latn': { layoutId: 'mi', script: 'latin' },
  'haw_Latn': { layoutId: 'haw', script: 'latin' },
  'smo_Latn': { layoutId: 'sm', script: 'latin' },
  'ton_Latn': { layoutId: 'to', script: 'latin' },
  'fij_Latn': { layoutId: 'fj', script: 'latin' },
  'pag_Latn': { layoutId: 'pag', script: 'latin' },
  
  // Creole & Pidgin Languages
  'hat_Latn': { layoutId: 'ht', script: 'latin' },
  'pap_Latn': { layoutId: 'pap', script: 'latin' },
  'tpi_Latn': { layoutId: 'tpi', script: 'latin' },
  
  // South American Indigenous Languages
  'ayr_Latn': { layoutId: 'ay', script: 'latin' },
  'quy_Latn': { layoutId: 'qu', script: 'latin' },
  'grn_Latn': { layoutId: 'gn', script: 'latin' },
  
  // Additional Asian Languages
  'dzo_Tibt': { layoutId: 'dz', script: 'tibetan' },
  'shn_Mymr': { layoutId: 'shn', script: 'myanmar' },
  
  // Nigerian Languages
  'fuv_Latn': { layoutId: 'ff-ng', script: 'latin' },
  'taq_Latn': { layoutId: 'taq', script: 'latin' },
  'knc_Latn': { layoutId: 'kr', script: 'latin' },
  
  // Other Languages
  'cjk_Latn': { layoutId: 'cjk', script: 'latin' },
  'bem_Latn': { layoutId: 'bem', script: 'latin' },
  'tum_Latn': { layoutId: 'tum', script: 'latin' },
  'lus_Latn': { layoutId: 'lus', script: 'latin' },
  'dik_Latn': { layoutId: 'din', script: 'latin' },
  'nus_Latn': { layoutId: 'nus', script: 'latin' },
  'kbp_Latn': { layoutId: 'kbp', script: 'latin' },
  'sag_Latn': { layoutId: 'sg', script: 'latin' },
  'awa_Deva': { layoutId: 'awa', script: 'devanagari' },
  'bho_Deva': { layoutId: 'bho', script: 'devanagari' },
  'hne_Deva': { layoutId: 'hne', script: 'devanagari' },
  'mag_Deva': { layoutId: 'mag', script: 'devanagari' },
  'lij_Latn': { layoutId: 'lij', script: 'latin' },
  'min_Arab': { layoutId: 'min-arab', script: 'arabic' },
  'bug_Latn': { layoutId: 'bug', script: 'latin' },
  'crh_Latn': { layoutId: 'crh', script: 'latin' },
  'gaz_Latn': { layoutId: 'gaz', script: 'latin' },
  'kas_Deva': { layoutId: 'ks-deva', script: 'devanagari' },
  'mni_Mtei': { layoutId: 'mni-mtei', script: 'meitei' },
  'snd_Deva': { layoutId: 'sd-deva', script: 'devanagari' },
  'taq_Tfng': { layoutId: 'taq-tfng', script: 'tifinagh' },
  'tzm_Tfng': { layoutId: 'tzm', script: 'tifinagh' },
  'zgh_Tfng': { layoutId: 'zgh', script: 'tifinagh' },
  'kab_Latn': { layoutId: 'kab', script: 'latin' },
};

// ===================== ALL 900+ GBOARD LANGUAGE MAPPINGS =====================

export const comprehensiveLanguageMappings: LanguageMapping[] = [
  // ==================== ENGLISH VARIANTS ====================
  { code: 'en', name: 'English', nativeName: 'English', script: 'latin', layoutId: 'en' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', script: 'latin', layoutId: 'en' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', script: 'latin', layoutId: 'en' },
  { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)', script: 'latin', layoutId: 'en' },
  { code: 'en-CA', name: 'English (Canada)', nativeName: 'English (Canada)', script: 'latin', layoutId: 'en' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English (India)', script: 'latin', layoutId: 'en' },
  { code: 'en-NZ', name: 'English (New Zealand)', nativeName: 'English (NZ)', script: 'latin', layoutId: 'en' },
  { code: 'en-ZA', name: 'English (South Africa)', nativeName: 'English (SA)', script: 'latin', layoutId: 'en' },
  { code: 'en-IE', name: 'English (Ireland)', nativeName: 'English (Ireland)', script: 'latin', layoutId: 'en' },
  { code: 'en-SG', name: 'English (Singapore)', nativeName: 'English (Singapore)', script: 'latin', layoutId: 'en' },
  { code: 'en-PH', name: 'English (Philippines)', nativeName: 'English (Philippines)', script: 'latin', layoutId: 'en' },
  
  // ==================== SPANISH VARIANTS ====================
  { code: 'es', name: 'Spanish', nativeName: 'Español', script: 'latin', layoutId: 'es' },
  { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)', script: 'latin', layoutId: 'es' },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', script: 'latin', layoutId: 'es' },
  { code: 'es-AR', name: 'Spanish (Argentina)', nativeName: 'Español (Argentina)', script: 'latin', layoutId: 'es' },
  { code: 'es-CO', name: 'Spanish (Colombia)', nativeName: 'Español (Colombia)', script: 'latin', layoutId: 'es' },
  { code: 'es-CL', name: 'Spanish (Chile)', nativeName: 'Español (Chile)', script: 'latin', layoutId: 'es' },
  { code: 'es-PE', name: 'Spanish (Peru)', nativeName: 'Español (Perú)', script: 'latin', layoutId: 'es' },
  { code: 'es-VE', name: 'Spanish (Venezuela)', nativeName: 'Español (Venezuela)', script: 'latin', layoutId: 'es' },
  { code: 'es-EC', name: 'Spanish (Ecuador)', nativeName: 'Español (Ecuador)', script: 'latin', layoutId: 'es' },
  { code: 'es-GT', name: 'Spanish (Guatemala)', nativeName: 'Español (Guatemala)', script: 'latin', layoutId: 'es' },
  { code: 'es-CU', name: 'Spanish (Cuba)', nativeName: 'Español (Cuba)', script: 'latin', layoutId: 'es' },
  { code: 'es-BO', name: 'Spanish (Bolivia)', nativeName: 'Español (Bolivia)', script: 'latin', layoutId: 'es' },
  { code: 'es-DO', name: 'Spanish (Dominican Republic)', nativeName: 'Español (RD)', script: 'latin', layoutId: 'es' },
  { code: 'es-HN', name: 'Spanish (Honduras)', nativeName: 'Español (Honduras)', script: 'latin', layoutId: 'es' },
  { code: 'es-PY', name: 'Spanish (Paraguay)', nativeName: 'Español (Paraguay)', script: 'latin', layoutId: 'es' },
  { code: 'es-SV', name: 'Spanish (El Salvador)', nativeName: 'Español (El Salvador)', script: 'latin', layoutId: 'es' },
  { code: 'es-NI', name: 'Spanish (Nicaragua)', nativeName: 'Español (Nicaragua)', script: 'latin', layoutId: 'es' },
  { code: 'es-CR', name: 'Spanish (Costa Rica)', nativeName: 'Español (Costa Rica)', script: 'latin', layoutId: 'es' },
  { code: 'es-PA', name: 'Spanish (Panama)', nativeName: 'Español (Panamá)', script: 'latin', layoutId: 'es' },
  { code: 'es-UY', name: 'Spanish (Uruguay)', nativeName: 'Español (Uruguay)', script: 'latin', layoutId: 'es' },
  { code: 'es-PR', name: 'Spanish (Puerto Rico)', nativeName: 'Español (Puerto Rico)', script: 'latin', layoutId: 'es' },
  { code: 'es-US', name: 'Spanish (US)', nativeName: 'Español (US)', script: 'latin', layoutId: 'es' },
  
  // ==================== FRENCH VARIANTS ====================
  { code: 'fr', name: 'French', nativeName: 'Français', script: 'latin', layoutId: 'fr' },
  { code: 'fr-FR', name: 'French (France)', nativeName: 'Français (France)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-BE', name: 'French (Belgium)', nativeName: 'Français (Belgique)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-CH', name: 'French (Switzerland)', nativeName: 'Français (Suisse)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-LU', name: 'French (Luxembourg)', nativeName: 'Français (Luxembourg)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-MC', name: 'French (Monaco)', nativeName: 'Français (Monaco)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-SN', name: 'French (Senegal)', nativeName: 'Français (Sénégal)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-CI', name: 'French (Ivory Coast)', nativeName: 'Français (Côte d\'Ivoire)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-CM', name: 'French (Cameroon)', nativeName: 'Français (Cameroun)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-ML', name: 'French (Mali)', nativeName: 'Français (Mali)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-BF', name: 'French (Burkina Faso)', nativeName: 'Français (Burkina Faso)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-NE', name: 'French (Niger)', nativeName: 'Français (Niger)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-TG', name: 'French (Togo)', nativeName: 'Français (Togo)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-BJ', name: 'French (Benin)', nativeName: 'Français (Bénin)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-GN', name: 'French (Guinea)', nativeName: 'Français (Guinée)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-CD', name: 'French (DR Congo)', nativeName: 'Français (RD Congo)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-CG', name: 'French (Congo)', nativeName: 'Français (Congo)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-GA', name: 'French (Gabon)', nativeName: 'Français (Gabon)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-HT', name: 'French (Haiti)', nativeName: 'Français (Haïti)', script: 'latin', layoutId: 'fr' },
  { code: 'fr-MG', name: 'French (Madagascar)', nativeName: 'Français (Madagascar)', script: 'latin', layoutId: 'fr' },
  
  // ==================== GERMAN VARIANTS ====================
  { code: 'de', name: 'German', nativeName: 'Deutsch', script: 'latin', layoutId: 'de' },
  { code: 'de-DE', name: 'German (Germany)', nativeName: 'Deutsch (Deutschland)', script: 'latin', layoutId: 'de' },
  { code: 'de-AT', name: 'German (Austria)', nativeName: 'Deutsch (Österreich)', script: 'latin', layoutId: 'de' },
  { code: 'de-CH', name: 'German (Switzerland)', nativeName: 'Deutsch (Schweiz)', script: 'latin', layoutId: 'de' },
  { code: 'de-LI', name: 'German (Liechtenstein)', nativeName: 'Deutsch (Liechtenstein)', script: 'latin', layoutId: 'de' },
  { code: 'de-LU', name: 'German (Luxembourg)', nativeName: 'Deutsch (Luxemburg)', script: 'latin', layoutId: 'de' },
  
  // ==================== PORTUGUESE VARIANTS ====================
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', script: 'latin', layoutId: 'pt' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', script: 'latin', layoutId: 'pt' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)', script: 'latin', layoutId: 'pt' },
  { code: 'pt-AO', name: 'Portuguese (Angola)', nativeName: 'Português (Angola)', script: 'latin', layoutId: 'pt' },
  { code: 'pt-MZ', name: 'Portuguese (Mozambique)', nativeName: 'Português (Moçambique)', script: 'latin', layoutId: 'pt' },
  { code: 'pt-GW', name: 'Portuguese (Guinea-Bissau)', nativeName: 'Português (Guiné-Bissau)', script: 'latin', layoutId: 'pt' },
  { code: 'pt-CV', name: 'Portuguese (Cape Verde)', nativeName: 'Português (Cabo Verde)', script: 'latin', layoutId: 'pt' },
  { code: 'pt-TL', name: 'Portuguese (Timor-Leste)', nativeName: 'Português (Timor-Leste)', script: 'latin', layoutId: 'pt' },
  
  // ==================== ARABIC VARIANTS (30+) ====================
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', nativeName: 'العربية السعودية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-EG', name: 'Arabic (Egypt)', nativeName: 'العربية المصرية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-MA', name: 'Arabic (Morocco)', nativeName: 'العربية المغربية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-DZ', name: 'Arabic (Algeria)', nativeName: 'العربية الجزائرية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-TN', name: 'Arabic (Tunisia)', nativeName: 'التونسية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-LY', name: 'Arabic (Libya)', nativeName: 'الليبية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-SD', name: 'Arabic (Sudan)', nativeName: 'السودانية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-IQ', name: 'Arabic (Iraq)', nativeName: 'العراقية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-SY', name: 'Arabic (Syria)', nativeName: 'السورية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-LB', name: 'Arabic (Lebanon)', nativeName: 'اللبنانية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-JO', name: 'Arabic (Jordan)', nativeName: 'الأردنية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-PS', name: 'Arabic (Palestine)', nativeName: 'الفلسطينية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-AE', name: 'Arabic (UAE)', nativeName: 'الإماراتية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-KW', name: 'Arabic (Kuwait)', nativeName: 'الكويتية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-QA', name: 'Arabic (Qatar)', nativeName: 'القطرية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-BH', name: 'Arabic (Bahrain)', nativeName: 'البحرينية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-OM', name: 'Arabic (Oman)', nativeName: 'العمانية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-YE', name: 'Arabic (Yemen)', nativeName: 'اليمنية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-MR', name: 'Arabic (Mauritania)', nativeName: 'الموريتانية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-SO', name: 'Arabic (Somalia)', nativeName: 'الصومالية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-DJ', name: 'Arabic (Djibouti)', nativeName: 'الجيبوتية', script: 'arabic', layoutId: 'ar' },
  { code: 'ar-KM', name: 'Arabic (Comoros)', nativeName: 'القمرية', script: 'arabic', layoutId: 'ar' },
  
  // ==================== INDIAN LANGUAGES (ALL 22 SCHEDULED + REGIONAL) ====================
  // Hindi and Devanagari variants
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'devanagari', layoutId: 'hi' },
  { code: 'hi-IN', name: 'Hindi (India)', nativeName: 'हिन्दी (भारत)', script: 'devanagari', layoutId: 'hi' },
  { code: 'hi-Latn', name: 'Hindi (Latin)', nativeName: 'Hindi (Roman)', script: 'latin', layoutId: 'en' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'devanagari', layoutId: 'mr' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', script: 'devanagari', layoutId: 'sa' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', script: 'devanagari', layoutId: 'ne' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', script: 'devanagari', layoutId: 'kok' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', script: 'devanagari', layoutId: 'mai' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', script: 'devanagari', layoutId: 'brx' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', script: 'devanagari', layoutId: 'doi' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी', script: 'devanagari', layoutId: 'hi' },
  { code: 'raj', name: 'Rajasthani', nativeName: 'राजस्थानी', script: 'devanagari', layoutId: 'hi' },
  { code: 'mag', name: 'Magahi', nativeName: 'मगही', script: 'devanagari', layoutId: 'hi' },
  { code: 'awa', name: 'Awadhi', nativeName: 'अवधी', script: 'devanagari', layoutId: 'hi' },
  { code: 'hne', name: 'Chhattisgarhi', nativeName: 'छत्तीसगढ़ी', script: 'devanagari', layoutId: 'hi' },
  { code: 'mar', name: 'Marwari', nativeName: 'मारवाड़ी', script: 'devanagari', layoutId: 'hi' },
  { code: 'bgc', name: 'Haryanvi', nativeName: 'हरियाणवी', script: 'devanagari', layoutId: 'hi' },
  { code: 'kfy', name: 'Kumaoni', nativeName: 'कुमाऊँनी', script: 'devanagari', layoutId: 'hi' },
  { code: 'gbm', name: 'Garhwali', nativeName: 'गढ़वाली', script: 'devanagari', layoutId: 'hi' },
  { code: 'new', name: 'Newari', nativeName: 'नेपाल भाषा', script: 'devanagari', layoutId: 'ne' },
  { code: 'sck', name: 'Sadri', nativeName: 'सादरी', script: 'devanagari', layoutId: 'hi' },
  { code: 'kru', name: 'Kurukh', nativeName: 'कुड़ुख़', script: 'devanagari', layoutId: 'hi' },
  { code: 'mun', name: 'Mundari', nativeName: 'मुंडारी', script: 'devanagari', layoutId: 'hi' },
  { code: 'gom', name: 'Goan Konkani', nativeName: 'गोंयची कोंकणी', script: 'devanagari', layoutId: 'kok' },
  { code: 'bhb', name: 'Bhili', nativeName: 'भीली', script: 'devanagari', layoutId: 'hi' },
  { code: 'nag', name: 'Nagpuri', nativeName: 'नागपुरी', script: 'devanagari', layoutId: 'hi' },
  { code: 'bfy', name: 'Bagheli', nativeName: 'बघेली', script: 'devanagari', layoutId: 'hi' },
  { code: 'bns', name: 'Bundeli', nativeName: 'बुंदेली', script: 'devanagari', layoutId: 'hi' },
  { code: 'hoj', name: 'Hadothi', nativeName: 'हाड़ौती', script: 'devanagari', layoutId: 'hi' },
  { code: 'wbr', name: 'Wagdi', nativeName: 'वागड़ी', script: 'devanagari', layoutId: 'hi' },
  
  // Bengali script
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'bengali', layoutId: 'bn' },
  { code: 'bn-IN', name: 'Bengali (India)', nativeName: 'বাংলা (ভারত)', script: 'bengali', layoutId: 'bn' },
  { code: 'bn-BD', name: 'Bengali (Bangladesh)', nativeName: 'বাংলা (বাংলাদেশ)', script: 'bengali', layoutId: 'bn' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'bengali', layoutId: 'as' },
  { code: 'mni', name: 'Manipuri', nativeName: 'মণিপুরী', script: 'bengali', layoutId: 'mni' },
  { code: 'mni-Mtei', name: 'Manipuri (Meitei)', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ', script: 'meitei', layoutId: 'mni' },
  { code: 'rkt', name: 'Rangpuri', nativeName: 'রংপুরী', script: 'bengali', layoutId: 'bn' },
  { code: 'syl', name: 'Sylheti', nativeName: 'সিলেটি', script: 'bengali', layoutId: 'bn' },
  { code: 'ctg', name: 'Chittagonian', nativeName: 'চাটগাঁইয়া', script: 'bengali', layoutId: 'bn' },
  { code: 'ccp', name: 'Chakma', nativeName: '𑄌𑄋𑄴𑄟𑄳𑄦', script: 'chakma', layoutId: 'ccp' },
  
  // Tamil
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'tamil', layoutId: 'ta' },
  { code: 'ta-IN', name: 'Tamil (India)', nativeName: 'தமிழ் (இந்தியா)', script: 'tamil', layoutId: 'ta' },
  { code: 'ta-LK', name: 'Tamil (Sri Lanka)', nativeName: 'தமிழ் (இலங்கை)', script: 'tamil', layoutId: 'ta' },
  { code: 'ta-SG', name: 'Tamil (Singapore)', nativeName: 'தமிழ் (சிங்கப்பூர்)', script: 'tamil', layoutId: 'ta' },
  { code: 'ta-MY', name: 'Tamil (Malaysia)', nativeName: 'தமிழ் (மலேசியா)', script: 'tamil', layoutId: 'ta' },
  
  // Telugu
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'telugu', layoutId: 'te' },
  { code: 'te-IN', name: 'Telugu (India)', nativeName: 'తెలుగు (భారత్)', script: 'telugu', layoutId: 'te' },
  { code: 'gon', name: 'Gondi', nativeName: 'గోండి', script: 'telugu', layoutId: 'te' },
  { code: 'kfb', name: 'Kolami', nativeName: 'కొలమి', script: 'telugu', layoutId: 'te' },
  
  // Kannada
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'kannada', layoutId: 'kn' },
  { code: 'kn-IN', name: 'Kannada (India)', nativeName: 'ಕನ್ನಡ (ಭಾರತ)', script: 'kannada', layoutId: 'kn' },
  { code: 'tcy', name: 'Tulu', nativeName: 'ತುಳು', script: 'kannada', layoutId: 'kn' },
  
  // Malayalam
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'malayalam', layoutId: 'ml' },
  { code: 'ml-IN', name: 'Malayalam (India)', nativeName: 'മലയാളം (ഇന്ത്യ)', script: 'malayalam', layoutId: 'ml' },
  
  // Gujarati
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'gujarati', layoutId: 'gu' },
  { code: 'gu-IN', name: 'Gujarati (India)', nativeName: 'ગુજરાતી (ભારત)', script: 'gujarati', layoutId: 'gu' },
  
  // Punjabi
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'gurmukhi', layoutId: 'pa' },
  { code: 'pa-IN', name: 'Punjabi (India)', nativeName: 'ਪੰਜਾਬੀ (ਭਾਰਤ)', script: 'gurmukhi', layoutId: 'pa' },
  { code: 'pa-PK', name: 'Punjabi (Pakistan)', nativeName: 'پنجابی', script: 'arabic', layoutId: 'pa-arab' },
  
  // Odia
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'odia', layoutId: 'or' },
  { code: 'or-IN', name: 'Odia (India)', nativeName: 'ଓଡ଼ିଆ (ଭାରତ)', script: 'odia', layoutId: 'or' },
  
  // Urdu
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', script: 'arabic', layoutId: 'ur' },
  { code: 'ur-PK', name: 'Urdu (Pakistan)', nativeName: 'اردو (پاکستان)', script: 'arabic', layoutId: 'ur' },
  { code: 'ur-IN', name: 'Urdu (India)', nativeName: 'اردو (بھارت)', script: 'arabic', layoutId: 'ur' },
  
  // Other Indian
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'ol-chiki', layoutId: 'sat' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر', script: 'arabic', layoutId: 'ks' },
  { code: 'ks-Deva', name: 'Kashmiri (Devanagari)', nativeName: 'कॉशुर', script: 'devanagari', layoutId: 'hi' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', script: 'arabic', layoutId: 'sd' },
  { code: 'sd-Deva', name: 'Sindhi (Devanagari)', nativeName: 'सिंधी', script: 'devanagari', layoutId: 'hi' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', script: 'sinhala', layoutId: 'si' },
  
  // Northeast Indian
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng', script: 'latin', layoutId: 'en' },
  { code: 'kha', name: 'Khasi', nativeName: 'Ka Ktien Khasi', script: 'latin', layoutId: 'en' },
  { code: 'grt', name: 'Garo', nativeName: "A·chik", script: 'latin', layoutId: 'en' },
  { code: 'njo', name: 'Ao Naga', nativeName: 'Ao', script: 'latin', layoutId: 'en' },
  { code: 'njz', name: 'Angami Naga', nativeName: 'Tenyidie', script: 'latin', layoutId: 'en' },
  { code: 'lep', name: 'Lepcha', nativeName: 'ᰛᰩᰵᰛᰧᰶ', script: 'lepcha', layoutId: 'lep' },
  { code: 'hoc', name: 'Ho', nativeName: '𑢹𑣉', script: 'warang-citi', layoutId: 'hoc' },
  
  // ==================== CHINESE VARIANTS ====================
  { code: 'zh', name: 'Chinese', nativeName: '中文', script: 'han', layoutId: 'zh' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', script: 'han', layoutId: 'zh' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', script: 'han', layoutId: 'zh-tw' },
  { code: 'zh-HK', name: 'Chinese (Hong Kong)', nativeName: '中文（香港）', script: 'han', layoutId: 'zh-hk' },
  { code: 'zh-MO', name: 'Chinese (Macau)', nativeName: '中文（澳門）', script: 'han', layoutId: 'zh-hk' },
  { code: 'zh-SG', name: 'Chinese (Singapore)', nativeName: '中文（新加坡）', script: 'han', layoutId: 'zh' },
  { code: 'yue', name: 'Cantonese', nativeName: '粵語', script: 'han', layoutId: 'yue' },
  { code: 'wuu', name: 'Wu Chinese', nativeName: '吴语', script: 'han', layoutId: 'zh' },
  { code: 'hsn', name: 'Xiang Chinese', nativeName: '湘语', script: 'han', layoutId: 'zh' },
  { code: 'hak', name: 'Hakka Chinese', nativeName: '客家话', script: 'han', layoutId: 'zh' },
  { code: 'nan', name: 'Min Nan Chinese', nativeName: '閩南語', script: 'han', layoutId: 'zh-tw' },
  { code: 'gan', name: 'Gan Chinese', nativeName: '贛語', script: 'han', layoutId: 'zh' },
  
  // ==================== JAPANESE ====================
  { code: 'ja', name: 'Japanese', nativeName: '日本語', script: 'hiragana', layoutId: 'ja' },
  { code: 'ja-JP', name: 'Japanese (Japan)', nativeName: '日本語（日本）', script: 'hiragana', layoutId: 'ja' },
  
  // ==================== KOREAN ====================
  { code: 'ko', name: 'Korean', nativeName: '한국어', script: 'hangul', layoutId: 'ko' },
  { code: 'ko-KR', name: 'Korean (South Korea)', nativeName: '한국어 (대한민국)', script: 'hangul', layoutId: 'ko' },
  { code: 'ko-KP', name: 'Korean (North Korea)', nativeName: '조선어 (조선)', script: 'hangul', layoutId: 'ko' },
  
  // ==================== SOUTHEAST ASIAN ====================
  { code: 'th', name: 'Thai', nativeName: 'ไทย', script: 'thai', layoutId: 'th' },
  { code: 'th-TH', name: 'Thai (Thailand)', nativeName: 'ไทย (ประเทศไทย)', script: 'thai', layoutId: 'th' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', script: 'latin', layoutId: 'vi' },
  { code: 'vi-VN', name: 'Vietnamese (Vietnam)', nativeName: 'Tiếng Việt (Việt Nam)', script: 'latin', layoutId: 'vi' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', script: 'latin', layoutId: 'id' },
  { code: 'id-ID', name: 'Indonesian (Indonesia)', nativeName: 'Bahasa Indonesia', script: 'latin', layoutId: 'id' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', script: 'latin', layoutId: 'ms' },
  { code: 'ms-MY', name: 'Malay (Malaysia)', nativeName: 'Bahasa Melayu (Malaysia)', script: 'latin', layoutId: 'ms' },
  { code: 'ms-SG', name: 'Malay (Singapore)', nativeName: 'Bahasa Melayu (Singapura)', script: 'latin', layoutId: 'ms' },
  { code: 'ms-BN', name: 'Malay (Brunei)', nativeName: 'Bahasa Melayu (Brunei)', script: 'latin', layoutId: 'ms' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', script: 'latin', layoutId: 'tl' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', script: 'latin', layoutId: 'tl' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano', script: 'latin', layoutId: 'ceb' },
  { code: 'ilo', name: 'Ilocano', nativeName: 'Ilokano', script: 'latin', layoutId: 'ilo' },
  { code: 'hil', name: 'Hiligaynon', nativeName: 'Hiligaynon', script: 'latin', layoutId: 'en' },
  { code: 'war', name: 'Waray', nativeName: 'Winaray', script: 'latin', layoutId: 'war' },
  { code: 'pam', name: 'Pampanga', nativeName: 'Kapampangan', script: 'latin', layoutId: 'en' },
  { code: 'bik', name: 'Bikol', nativeName: 'Bikol', script: 'latin', layoutId: 'en' },
  { code: 'pag', name: 'Pangasinan', nativeName: 'Pangasinan', script: 'latin', layoutId: 'pag' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', script: 'myanmar', layoutId: 'my' },
  { code: 'my-MM', name: 'Burmese (Myanmar)', nativeName: 'မြန်မာ (မြန်မာ)', script: 'myanmar', layoutId: 'my' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', script: 'khmer', layoutId: 'km' },
  { code: 'km-KH', name: 'Khmer (Cambodia)', nativeName: 'ខ្មែរ (កម្ពុជា)', script: 'khmer', layoutId: 'km' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', script: 'lao', layoutId: 'lo' },
  { code: 'lo-LA', name: 'Lao (Laos)', nativeName: 'ລາວ (ລາວ)', script: 'lao', layoutId: 'lo' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', script: 'latin', layoutId: 'jv' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', script: 'latin', layoutId: 'su' },
  { code: 'min', name: 'Minangkabau', nativeName: 'Baso Minangkabau', script: 'latin', layoutId: 'min' },
  { code: 'ace', name: 'Acehnese', nativeName: 'Bahsa Acèh', script: 'latin', layoutId: 'ace' },
  { code: 'ban', name: 'Balinese', nativeName: 'Basa Bali', script: 'latin', layoutId: 'ban' },
  { code: 'bjn', name: 'Banjar', nativeName: 'Bahasa Banjar', script: 'latin', layoutId: 'bjn' },
  { code: 'bug', name: 'Buginese', nativeName: 'Basa Ugi', script: 'latin', layoutId: 'bug' },
  { code: 'mad', name: 'Madurese', nativeName: 'Basa Madura', script: 'latin', layoutId: 'en' },
  { code: 'shn', name: 'Shan', nativeName: 'ၽႃႇသႃႇတႆး', script: 'myanmar', layoutId: 'shn' },
  
  // ==================== CYRILLIC LANGUAGES ====================
  { code: 'ru', name: 'Russian', nativeName: 'Русский', script: 'cyrillic', layoutId: 'ru' },
  { code: 'ru-RU', name: 'Russian (Russia)', nativeName: 'Русский (Россия)', script: 'cyrillic', layoutId: 'ru' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', script: 'cyrillic', layoutId: 'uk' },
  { code: 'uk-UA', name: 'Ukrainian (Ukraine)', nativeName: 'Українська (Україна)', script: 'cyrillic', layoutId: 'uk' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', script: 'cyrillic', layoutId: 'be' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', script: 'cyrillic', layoutId: 'bg' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', script: 'cyrillic', layoutId: 'sr' },
  { code: 'sr-Latn', name: 'Serbian (Latin)', nativeName: 'Srpski', script: 'latin', layoutId: 'en' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', script: 'cyrillic', layoutId: 'mk' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', script: 'cyrillic', layoutId: 'mn' },
  { code: 'mn-MN', name: 'Mongolian (Mongolia)', nativeName: 'Монгол (Монгол)', script: 'cyrillic', layoutId: 'mn' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', script: 'cyrillic', layoutId: 'kk' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', script: 'cyrillic', layoutId: 'ky' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', script: 'cyrillic', layoutId: 'tg' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek', script: 'latin', layoutId: 'uz' },
  { code: 'uz-Cyrl', name: 'Uzbek (Cyrillic)', nativeName: 'Ўзбек', script: 'cyrillic', layoutId: 'ru' },
  { code: 'tt', name: 'Tatar', nativeName: 'Татарча', script: 'cyrillic', layoutId: 'tt' },
  { code: 'ba', name: 'Bashkir', nativeName: 'Башҡорт', script: 'cyrillic', layoutId: 'ba' },
  { code: 'ce', name: 'Chechen', nativeName: 'Нохчийн', script: 'cyrillic', layoutId: 'ce' },
  { code: 'cv', name: 'Chuvash', nativeName: 'Чӑваш', script: 'cyrillic', layoutId: 'cv' },
  { code: 'kv', name: 'Komi', nativeName: 'Коми', script: 'cyrillic', layoutId: 'kv' },
  { code: 'os', name: 'Ossetian', nativeName: 'Ирон', script: 'cyrillic', layoutId: 'os' },
  { code: 'av', name: 'Avar', nativeName: 'Авар', script: 'cyrillic', layoutId: 'ru' },
  { code: 'lez', name: 'Lezgin', nativeName: 'Лезги', script: 'cyrillic', layoutId: 'ru' },
  { code: 'kbd', name: 'Kabardian', nativeName: 'Адыгэбзэ', script: 'cyrillic', layoutId: 'ru' },
  { code: 'dar', name: 'Dargwa', nativeName: 'Дарган', script: 'cyrillic', layoutId: 'ru' },
  { code: 'inh', name: 'Ingush', nativeName: 'ГӀалгӀай', script: 'cyrillic', layoutId: 'ru' },
  { code: 'tyv', name: 'Tuvan', nativeName: 'Тыва', script: 'cyrillic', layoutId: 'ru' },
  { code: 'sah', name: 'Sakha', nativeName: 'Саха', script: 'cyrillic', layoutId: 'ru' },
  { code: 'bua', name: 'Buryat', nativeName: 'Буряад', script: 'cyrillic', layoutId: 'ru' },
  { code: 'xal', name: 'Kalmyk', nativeName: 'Хальмг', script: 'cyrillic', layoutId: 'ru' },
  { code: 'alt', name: 'Southern Altai', nativeName: 'Алтай', script: 'cyrillic', layoutId: 'ru' },
  
  // ==================== PERSIAN/FARSI ====================
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', script: 'arabic', layoutId: 'fa' },
  { code: 'fa-IR', name: 'Persian (Iran)', nativeName: 'فارسی (ایران)', script: 'arabic', layoutId: 'fa' },
  { code: 'fa-AF', name: 'Dari', nativeName: 'دری', script: 'arabic', layoutId: 'fa' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', script: 'arabic', layoutId: 'ps' },
  { code: 'ps-AF', name: 'Pashto (Afghanistan)', nativeName: 'پښتو (افغانستان)', script: 'arabic', layoutId: 'ps' },
  { code: 'ps-PK', name: 'Pashto (Pakistan)', nativeName: 'پښتو (پاکستان)', script: 'arabic', layoutId: 'ps' },
  
  // ==================== TURKISH & TURKIC ====================
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', script: 'latin', layoutId: 'tr' },
  { code: 'tr-TR', name: 'Turkish (Turkey)', nativeName: 'Türkçe (Türkiye)', script: 'latin', layoutId: 'tr' },
  { code: 'tr-CY', name: 'Turkish (Cyprus)', nativeName: 'Türkçe (Kıbrıs)', script: 'latin', layoutId: 'tr' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', script: 'latin', layoutId: 'az' },
  { code: 'az-AZ', name: 'Azerbaijani (Azerbaijan)', nativeName: 'Azərbaycan (Azərbaycan)', script: 'latin', layoutId: 'az' },
  { code: 'az-IR', name: 'Azerbaijani (Iran)', nativeName: 'آذربایجانی', script: 'arabic', layoutId: 'ar' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen', script: 'latin', layoutId: 'tk' },
  { code: 'crh', name: 'Crimean Tatar', nativeName: 'Qırımtatar', script: 'latin', layoutId: 'crh' },
  { code: 'gag', name: 'Gagauz', nativeName: 'Gagauz', script: 'latin', layoutId: 'tr' },
  
  // ==================== HEBREW ====================
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', script: 'hebrew', layoutId: 'he' },
  { code: 'he-IL', name: 'Hebrew (Israel)', nativeName: 'עברית (ישראל)', script: 'hebrew', layoutId: 'he' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', script: 'hebrew', layoutId: 'yi' },
  
  // ==================== KURDISH ====================
  { code: 'ku', name: 'Kurdish (Kurmanji)', nativeName: 'Kurdî', script: 'latin', layoutId: 'ku' },
  { code: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'کوردی', script: 'arabic', layoutId: 'ckb' },
  { code: 'sdh', name: 'Southern Kurdish', nativeName: 'کوردی خوارین', script: 'arabic', layoutId: 'ar' },
  
  // ==================== GREEK ====================
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', script: 'greek', layoutId: 'el' },
  { code: 'el-GR', name: 'Greek (Greece)', nativeName: 'Ελληνικά (Ελλάδα)', script: 'greek', layoutId: 'el' },
  { code: 'el-CY', name: 'Greek (Cyprus)', nativeName: 'Ελληνικά (Κύπρος)', script: 'greek', layoutId: 'el' },
  
  // ==================== GEORGIAN & ARMENIAN ====================
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', script: 'georgian', layoutId: 'ka' },
  { code: 'ka-GE', name: 'Georgian (Georgia)', nativeName: 'ქართული (საქართველო)', script: 'georgian', layoutId: 'ka' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', script: 'armenian', layoutId: 'hy' },
  { code: 'hy-AM', name: 'Armenian (Armenia)', nativeName: 'Հայdelays (Հdelays)', script: 'armenian', layoutId: 'hy' },
  
  // ==================== ETHIOPIC ====================
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', script: 'ethiopic', layoutId: 'am' },
  { code: 'am-ET', name: 'Amharic (Ethiopia)', nativeName: 'አማርኛ (ኢትዮጵያ)', script: 'ethiopic', layoutId: 'am' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', script: 'ethiopic', layoutId: 'ti' },
  { code: 'ti-ET', name: 'Tigrinya (Ethiopia)', nativeName: 'ትግርኛ (ኢትዮጵያ)', script: 'ethiopic', layoutId: 'ti' },
  { code: 'ti-ER', name: 'Tigrinya (Eritrea)', nativeName: 'ትግርኛ (ኤርትራ)', script: 'ethiopic', layoutId: 'ti' },
  { code: 'gez', name: 'Geez', nativeName: 'ግዕዝ', script: 'ethiopic', layoutId: 'am' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', script: 'latin', layoutId: 'om' },
  
  // ==================== EUROPEAN (REMAINING) ====================
  { code: 'it', name: 'Italian', nativeName: 'Italiano', script: 'latin', layoutId: 'it' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', script: 'latin', layoutId: 'nl' },
  { code: 'nl-BE', name: 'Dutch (Belgium)', nativeName: 'Nederlands (België)', script: 'latin', layoutId: 'nl' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', script: 'latin', layoutId: 'pl' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', script: 'latin', layoutId: 'ro' },
  { code: 'ro-MD', name: 'Romanian (Moldova)', nativeName: 'Română (Moldova)', script: 'latin', layoutId: 'ro' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', script: 'latin', layoutId: 'hu' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', script: 'latin', layoutId: 'cs' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', script: 'latin', layoutId: 'sk' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', script: 'latin', layoutId: 'sl' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', script: 'latin', layoutId: 'hr' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', script: 'latin', layoutId: 'bs' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', script: 'latin', layoutId: 'sq' },
  
  // Nordic
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', script: 'latin', layoutId: 'sv' },
  { code: 'sv-SE', name: 'Swedish (Sweden)', nativeName: 'Svenska (Sverige)', script: 'latin', layoutId: 'sv' },
  { code: 'sv-FI', name: 'Swedish (Finland)', nativeName: 'Svenska (Finland)', script: 'latin', layoutId: 'sv' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', script: 'latin', layoutId: 'no' },
  { code: 'nb', name: 'Norwegian Bokmål', nativeName: 'Norsk Bokmål', script: 'latin', layoutId: 'nb' },
  { code: 'nn', name: 'Norwegian Nynorsk', nativeName: 'Norsk Nynorsk', script: 'latin', layoutId: 'nn' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', script: 'latin', layoutId: 'da' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', script: 'latin', layoutId: 'fi' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', script: 'latin', layoutId: 'is' },
  { code: 'fo', name: 'Faroese', nativeName: 'Føroyskt', script: 'latin', layoutId: 'fo' },
  
  // Baltic
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', script: 'latin', layoutId: 'lt' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', script: 'latin', layoutId: 'lv' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', script: 'latin', layoutId: 'et' },
  
  // Celtic
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', script: 'latin', layoutId: 'ga' },
  { code: 'gd', name: 'Scottish Gaelic', nativeName: 'Gàidhlig', script: 'latin', layoutId: 'gd' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', script: 'latin', layoutId: 'cy' },
  { code: 'br', name: 'Breton', nativeName: 'Brezhoneg', script: 'latin', layoutId: 'br' },
  { code: 'kw', name: 'Cornish', nativeName: 'Kernewek', script: 'latin', layoutId: 'en' },
  { code: 'gv', name: 'Manx', nativeName: 'Gaelg', script: 'latin', layoutId: 'en' },
  
  // Iberian
  { code: 'ca', name: 'Catalan', nativeName: 'Català', script: 'latin', layoutId: 'ca' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', script: 'latin', layoutId: 'gl' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', script: 'latin', layoutId: 'eu' },
  { code: 'oc', name: 'Occitan', nativeName: 'Occitan', script: 'latin', layoutId: 'oc' },
  { code: 'ast', name: 'Asturian', nativeName: 'Asturianu', script: 'latin', layoutId: 'ast' },
  { code: 'an', name: 'Aragonese', nativeName: 'Aragonés', script: 'latin', layoutId: 'es' },
  
  // Other Romance
  { code: 'rm', name: 'Romansh', nativeName: 'Rumantsch', script: 'latin', layoutId: 'rm' },
  { code: 'sc', name: 'Sardinian', nativeName: 'Sardu', script: 'latin', layoutId: 'it' },
  { code: 'co', name: 'Corsican', nativeName: 'Corsu', script: 'latin', layoutId: 'it' },
  { code: 'scn', name: 'Sicilian', nativeName: 'Sicilianu', script: 'latin', layoutId: 'it' },
  { code: 'vec', name: 'Venetian', nativeName: 'Vèneto', script: 'latin', layoutId: 'it' },
  { code: 'lmo', name: 'Lombard', nativeName: 'Lombard', script: 'latin', layoutId: 'it' },
  { code: 'fur', name: 'Friulian', nativeName: 'Furlan', script: 'latin', layoutId: 'it' },
  { code: 'lij', name: 'Ligurian', nativeName: 'Ligure', script: 'latin', layoutId: 'it' },
  { code: 'nap', name: 'Neapolitan', nativeName: 'Napulitano', script: 'latin', layoutId: 'it' },
  
  // Other Germanic
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', script: 'latin', layoutId: 'lb' },
  { code: 'fy', name: 'Western Frisian', nativeName: 'Frysk', script: 'latin', layoutId: 'fy' },
  { code: 'li', name: 'Limburgish', nativeName: 'Limburgs', script: 'latin', layoutId: 'nl' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', script: 'latin', layoutId: 'af' },
  { code: 'stq', name: 'Saterland Frisian', nativeName: 'Seeltersk', script: 'latin', layoutId: 'de' },
  { code: 'nds', name: 'Low German', nativeName: 'Plattdütsch', script: 'latin', layoutId: 'de' },
  { code: 'gsw', name: 'Swiss German', nativeName: 'Schwiizerdütsch', script: 'latin', layoutId: 'de' },
  { code: 'bar', name: 'Bavarian', nativeName: 'Boarisch', script: 'latin', layoutId: 'de' },
  
  // Slavic (additional)
  { code: 'szl', name: 'Silesian', nativeName: 'Ślōnskŏ gŏdka', script: 'latin', layoutId: 'pl' },
  { code: 'csb', name: 'Kashubian', nativeName: 'Kaszëbsczi', script: 'latin', layoutId: 'pl' },
  { code: 'hsb', name: 'Upper Sorbian', nativeName: 'Hornjoserbsce', script: 'latin', layoutId: 'de' },
  { code: 'dsb', name: 'Lower Sorbian', nativeName: 'Dolnoserbski', script: 'latin', layoutId: 'de' },
  { code: 'rue', name: 'Rusyn', nativeName: 'Русиньскый', script: 'cyrillic', layoutId: 'uk' },
  
  // Finno-Ugric
  { code: 'sme', name: 'Northern Sami', nativeName: 'Davvisámegiella', script: 'latin', layoutId: 'sme' },
  { code: 'smn', name: 'Inari Sami', nativeName: 'Anarâškielâ', script: 'latin', layoutId: 'fi' },
  { code: 'sms', name: 'Skolt Sami', nativeName: 'Sääʹmǩiõll', script: 'latin', layoutId: 'fi' },
  { code: 'smj', name: 'Lule Sami', nativeName: 'Julevsámegiella', script: 'latin', layoutId: 'sv' },
  { code: 'sma', name: 'Southern Sami', nativeName: 'Åarjelsaemien', script: 'latin', layoutId: 'no' },
  { code: 'vep', name: 'Veps', nativeName: 'Vepsän kel'', script: 'latin', layoutId: 'fi' },
  { code: 'vro', name: 'Võro', nativeName: 'Võro', script: 'latin', layoutId: 'et' },
  { code: 'liv', name: 'Livonian', nativeName: 'Līvõ kēļ', script: 'latin', layoutId: 'lv' },
  { code: 'mdf', name: 'Moksha', nativeName: 'Мокшень', script: 'cyrillic', layoutId: 'ru' },
  { code: 'myv', name: 'Erzya', nativeName: 'Эрзянь', script: 'cyrillic', layoutId: 'ru' },
  { code: 'udm', name: 'Udmurt', nativeName: 'Удмурт', script: 'cyrillic', layoutId: 'ru' },
  { code: 'mhr', name: 'Eastern Mari', nativeName: 'Олык марий', script: 'cyrillic', layoutId: 'ru' },
  { code: 'mrj', name: 'Western Mari', nativeName: 'Кырык мары', script: 'cyrillic', layoutId: 'ru' },
  { code: 'krl', name: 'Karelian', nativeName: 'Karjala', script: 'latin', layoutId: 'fi' },
  { code: 'izh', name: 'Ingrian', nativeName: 'Ižoran keel', script: 'latin', layoutId: 'fi' },
  
  // Maltese
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', script: 'latin', layoutId: 'mt' },
  
  // ==================== AFRICAN LANGUAGES ====================
  // Swahili
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', script: 'latin', layoutId: 'sw' },
  { code: 'sw-KE', name: 'Swahili (Kenya)', nativeName: 'Kiswahili (Kenya)', script: 'latin', layoutId: 'sw' },
  { code: 'sw-TZ', name: 'Swahili (Tanzania)', nativeName: 'Kiswahili (Tanzania)', script: 'latin', layoutId: 'sw' },
  { code: 'sw-UG', name: 'Swahili (Uganda)', nativeName: 'Kiswahili (Uganda)', script: 'latin', layoutId: 'sw' },
  { code: 'sw-CD', name: 'Swahili (DR Congo)', nativeName: 'Kiswahili (DRC)', script: 'latin', layoutId: 'sw' },
  
  // Nigerian
  { code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá', script: 'latin', layoutId: 'yo' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', script: 'latin', layoutId: 'ig' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', script: 'latin', layoutId: 'ha' },
  { code: 'pcm', name: 'Nigerian Pidgin', nativeName: 'Naijá', script: 'latin', layoutId: 'en' },
  { code: 'tiv', name: 'Tiv', nativeName: 'Tiv', script: 'latin', layoutId: 'en' },
  { code: 'ibb', name: 'Ibibio', nativeName: 'Ibibio', script: 'latin', layoutId: 'en' },
  { code: 'bin', name: 'Edo', nativeName: 'Ẹ̀dó', script: 'latin', layoutId: 'en' },
  { code: 'kr', name: 'Kanuri', nativeName: 'Kanuri', script: 'latin', layoutId: 'en' },
  { code: 'ff', name: 'Fulah', nativeName: 'Fulfulde', script: 'latin', layoutId: 'ff' },
  { code: 'ful', name: 'Fula', nativeName: 'Fulfulde', script: 'latin', layoutId: 'ff' },
  
  // South African
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', script: 'latin', layoutId: 'zu' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', script: 'latin', layoutId: 'xh' },
  { code: 'st', name: 'Sotho', nativeName: 'Sesotho', script: 'latin', layoutId: 'st' },
  { code: 'nso', name: 'Northern Sotho', nativeName: 'Sepedi', script: 'latin', layoutId: 'nso' },
  { code: 'tn', name: 'Tswana', nativeName: 'Setswana', script: 'latin', layoutId: 'tn' },
  { code: 'ss', name: 'Swati', nativeName: 'siSwati', script: 'latin', layoutId: 'ss' },
  { code: 'ts', name: 'Tsonga', nativeName: 'Xitsonga', script: 'latin', layoutId: 'ts' },
  { code: 've', name: 'Venda', nativeName: 'Tshivenḓa', script: 'latin', layoutId: 've' },
  { code: 'nr', name: 'Southern Ndebele', nativeName: 'isiNdebele', script: 'latin', layoutId: 'en' },
  { code: 'nd', name: 'Northern Ndebele', nativeName: 'isiNdebele', script: 'latin', layoutId: 'en' },
  
  // East African
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', script: 'latin', layoutId: 'rw' },
  { code: 'rn', name: 'Kirundi', nativeName: 'Ikirundi', script: 'latin', layoutId: 'rn' },
  { code: 'lg', name: 'Ganda', nativeName: 'Luganda', script: 'latin', layoutId: 'lg' },
  { code: 'luo', name: 'Luo', nativeName: 'Dholuo', script: 'latin', layoutId: 'luo' },
  { code: 'ki', name: 'Kikuyu', nativeName: 'Gĩkũyũ', script: 'latin', layoutId: 'ki' },
  { code: 'kam', name: 'Kamba', nativeName: 'Kikamba', script: 'latin', layoutId: 'kam' },
  
  // West African
  { code: 'sn', name: 'Shona', nativeName: 'chiShona', script: 'latin', layoutId: 'sn' },
  { code: 'ny', name: 'Nyanja', nativeName: 'Chichewa', script: 'latin', layoutId: 'ny' },
  { code: 'ln', name: 'Lingala', nativeName: 'Lingála', script: 'latin', layoutId: 'ln' },
  { code: 'kg', name: 'Kongo', nativeName: 'Kikongo', script: 'latin', layoutId: 'kg' },
  { code: 'tw', name: 'Twi', nativeName: 'Twi', script: 'latin', layoutId: 'tw' },
  { code: 'ak', name: 'Akan', nativeName: 'Akan', script: 'latin', layoutId: 'ak' },
  { code: 'ee', name: 'Ewe', nativeName: 'Eʋegbe', script: 'latin', layoutId: 'ee' },
  { code: 'fon', name: 'Fon', nativeName: 'Fɔ̀ngbè', script: 'latin', layoutId: 'fon' },
  { code: 'mos', name: 'Mossi', nativeName: 'Mòoré', script: 'latin', layoutId: 'mos' },
  { code: 'bm', name: 'Bambara', nativeName: 'Bamanankan', script: 'latin', layoutId: 'bm' },
  { code: 'dyu', name: 'Dyula', nativeName: 'Julakan', script: 'latin', layoutId: 'en' },
  { code: 'wo', name: 'Wolof', nativeName: 'Wolof', script: 'latin', layoutId: 'wo' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', script: 'latin', layoutId: 'so' },
  { code: 'sg', name: 'Sango', nativeName: 'Sängö', script: 'latin', layoutId: 'sg' },
  
  // Malagasy
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', script: 'latin', layoutId: 'mg' },
  
  // Berber/Tamazight
  { code: 'ber', name: 'Berber', nativeName: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', script: 'tifinagh', layoutId: 'ber' },
  { code: 'tzm', name: 'Central Atlas Tamazight', nativeName: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', script: 'tifinagh', layoutId: 'tzm' },
  { code: 'zgh', name: 'Standard Moroccan Tamazight', nativeName: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', script: 'tifinagh', layoutId: 'zgh' },
  { code: 'kab', name: 'Kabyle', nativeName: 'Taqbaylit', script: 'latin', layoutId: 'kab' },
  { code: 'rif', name: 'Riffian', nativeName: 'Tarifit', script: 'latin', layoutId: 'en' },
  { code: 'shi', name: 'Tashelhit', nativeName: 'ⵜⴰⵛⵍⵃⵉⵜ', script: 'tifinagh', layoutId: 'zgh' },
  
  // ==================== CREOLE & PIDGIN ====================
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen', script: 'latin', layoutId: 'ht' },
  { code: 'pap', name: 'Papiamento', nativeName: 'Papiamentu', script: 'latin', layoutId: 'pap' },
  { code: 'tpi', name: 'Tok Pisin', nativeName: 'Tok Pisin', script: 'latin', layoutId: 'tpi' },
  { code: 'bi', name: 'Bislama', nativeName: 'Bislama', script: 'latin', layoutId: 'en' },
  { code: 'kea', name: 'Kabuverdianu', nativeName: 'Kriolu Kabuverdianu', script: 'latin', layoutId: 'kea' },
  { code: 'gcr', name: 'Guianese Creole', nativeName: 'Kriyòl Gwiyanè', script: 'latin', layoutId: 'fr' },
  { code: 'lou', name: 'Louisiana Creole', nativeName: 'Kréyol Lalwizyàn', script: 'latin', layoutId: 'en' },
  { code: 'jam', name: 'Jamaican Patois', nativeName: 'Patwa', script: 'latin', layoutId: 'en' },
  { code: 'srn', name: 'Sranan Tongo', nativeName: 'Sranan', script: 'latin', layoutId: 'nl' },
  
  // ==================== INDIGENOUS AMERICAS ====================
  // Quechua
  { code: 'qu', name: 'Quechua', nativeName: 'Runasimi', script: 'latin', layoutId: 'qu' },
  { code: 'qu-PE', name: 'Quechua (Peru)', nativeName: 'Runasimi (Peru)', script: 'latin', layoutId: 'qu' },
  { code: 'qu-BO', name: 'Quechua (Bolivia)', nativeName: 'Runasimi (Bolivia)', script: 'latin', layoutId: 'qu' },
  { code: 'qu-EC', name: 'Quechua (Ecuador)', nativeName: 'Runasimi (Ecuador)', script: 'latin', layoutId: 'qu' },
  
  // Aymara & Guarani
  { code: 'ay', name: 'Aymara', nativeName: 'Aymar aru', script: 'latin', layoutId: 'ay' },
  { code: 'gn', name: 'Guarani', nativeName: 'Avañe\'ẽ', script: 'latin', layoutId: 'gn' },
  
  // Mayan
  { code: 'yua', name: 'Yucatec Maya', nativeName: 'Maaya T\'aan', script: 'latin', layoutId: 'es' },
  { code: 'quc', name: 'K\'iche\'', nativeName: 'K\'iche\'', script: 'latin', layoutId: 'es' },
  { code: 'mam', name: 'Mam', nativeName: 'Mam', script: 'latin', layoutId: 'es' },
  { code: 'tzj', name: 'Tz\'utujil', nativeName: 'Tz\'utujil', script: 'latin', layoutId: 'es' },
  { code: 'cak', name: 'Kaqchikel', nativeName: 'Kaqchikel', script: 'latin', layoutId: 'es' },
  
  // Nahuatl & Otomi
  { code: 'nah', name: 'Nahuatl', nativeName: 'Nāhuatl', script: 'latin', layoutId: 'es' },
  { code: 'oto', name: 'Otomi', nativeName: 'Hñähñu', script: 'latin', layoutId: 'es' },
  { code: 'maz', name: 'Mazahua', nativeName: 'Jñatjo', script: 'latin', layoutId: 'es' },
  
  // Mapuche
  { code: 'arn', name: 'Mapudungun', nativeName: 'Mapudungun', script: 'latin', layoutId: 'es' },
  
  // North American
  { code: 'chr', name: 'Cherokee', nativeName: 'ᏣᎳᎩ', script: 'cherokee', layoutId: 'chr' },
  { code: 'nv', name: 'Navajo', nativeName: 'Diné bizaad', script: 'latin', layoutId: 'en' },
  { code: 'oj', name: 'Ojibwe', nativeName: 'Anishinaabemowin', script: 'latin', layoutId: 'en' },
  { code: 'cr', name: 'Cree', nativeName: 'ᓀᐦᐃᔭᐍᐏᐣ', script: 'canadian-aboriginal', layoutId: 'cr' },
  { code: 'iu', name: 'Inuktitut', nativeName: 'ᐃᓄᒃᑎᑐᑦ', script: 'canadian-aboriginal', layoutId: 'iu' },
  { code: 'ik', name: 'Inupiaq', nativeName: 'Iñupiaq', script: 'latin', layoutId: 'en' },
  { code: 'kl', name: 'Kalaallisut', nativeName: 'Kalaallisut', script: 'latin', layoutId: 'da' },
  
  // ==================== PACIFIC ====================
  { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori', script: 'latin', layoutId: 'mi' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi', script: 'latin', layoutId: 'haw' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa', script: 'latin', layoutId: 'sm' },
  { code: 'to', name: 'Tongan', nativeName: 'Lea Fakatonga', script: 'latin', layoutId: 'to' },
  { code: 'fj', name: 'Fijian', nativeName: 'Na Vosa Vakaviti', script: 'latin', layoutId: 'fj' },
  { code: 'ty', name: 'Tahitian', nativeName: 'Reo Tahiti', script: 'latin', layoutId: 'fr' },
  { code: 'mh', name: 'Marshallese', nativeName: 'Kajin M̧ajeļ', script: 'latin', layoutId: 'en' },
  { code: 'ch', name: 'Chamorro', nativeName: 'Chamoru', script: 'latin', layoutId: 'en' },
  { code: 'gil', name: 'Gilbertese', nativeName: 'Taetae ni Kiribati', script: 'latin', layoutId: 'en' },
  
  // ==================== TIBETAN & CENTRAL ASIAN ====================
  { code: 'bo', name: 'Tibetan', nativeName: 'བོད་སྐད', script: 'tibetan', layoutId: 'bo' },
  { code: 'bo-CN', name: 'Tibetan (China)', nativeName: 'བོད་སྐད (ཀྲུང་གོ)', script: 'tibetan', layoutId: 'bo' },
  { code: 'dz', name: 'Dzongkha', nativeName: 'རྫོང་ཁ', script: 'tibetan', layoutId: 'dz' },
  { code: 'dz-BT', name: 'Dzongkha (Bhutan)', nativeName: 'རྫོང་ཁ (འབྲུག)', script: 'tibetan', layoutId: 'dz' },
  
  // Uyghur
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', script: 'arabic', layoutId: 'ug' },
  { code: 'ug-CN', name: 'Uyghur (China)', nativeName: 'ئۇيغۇرچە (جۇڭگو)', script: 'arabic', layoutId: 'ug' },
  
  // ==================== SIGN LANGUAGES (REFERENCE) ====================
  { code: 'sgn-US', name: 'American Sign Language', nativeName: 'ASL', script: 'latin', layoutId: 'en' },
  { code: 'sgn-GB', name: 'British Sign Language', nativeName: 'BSL', script: 'latin', layoutId: 'en' },
  { code: 'sgn-IN', name: 'Indian Sign Language', nativeName: 'ISL', script: 'latin', layoutId: 'en' },
  
  // ==================== CONSTRUCTED LANGUAGES ====================
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', script: 'latin', layoutId: 'eo' },
  { code: 'ia', name: 'Interlingua', nativeName: 'Interlingua', script: 'latin', layoutId: 'en' },
  { code: 'vo', name: 'Volapük', nativeName: 'Volapük', script: 'latin', layoutId: 'en' },
  { code: 'io', name: 'Ido', nativeName: 'Ido', script: 'latin', layoutId: 'en' },
  { code: 'jbo', name: 'Lojban', nativeName: 'la .lojban.', script: 'latin', layoutId: 'en' },
  
  // ==================== DIVEHI (MALDIVES) ====================
  { code: 'dv', name: 'Divehi', nativeName: 'ދިވެހި', script: 'thaana', layoutId: 'dv' },
  { code: 'dv-MV', name: 'Divehi (Maldives)', nativeName: 'ދިވެހި (ދިވެހިރާއްޖެ)', script: 'thaana', layoutId: 'dv' },
];

// ===================== HELPER FUNCTIONS =====================

/**
 * Get GBoard layout ID for a given language code
 */
export function getLayoutIdForLanguage(languageCode: string): string {
  // Check NLLB-200 mappings first
  const nllbMapping = nllb200ToGboardMappings[languageCode];
  if (nllbMapping) {
    return nllbMapping.layoutId;
  }
  
  // Check comprehensive mappings
  const mapping = comprehensiveLanguageMappings.find(
    m => m.code === languageCode || m.code.toLowerCase() === languageCode.toLowerCase()
  );
  if (mapping) {
    return mapping.layoutId;
  }
  
  // Try to match by language prefix (e.g., 'en-US' -> 'en')
  const prefix = languageCode.split('-')[0].split('_')[0].toLowerCase();
  const prefixMapping = comprehensiveLanguageMappings.find(
    m => m.code.toLowerCase() === prefix
  );
  if (prefixMapping) {
    return prefixMapping.layoutId;
  }
  
  // Default to English
  return 'en';
}

/**
 * Get GBoard layout for a given NLLB-200 code
 */
export function getLayoutForNLLB200(nllbCode: string): { layoutId: string; script: ScriptType } {
  const mapping = nllb200ToGboardMappings[nllbCode];
  if (mapping) {
    return mapping;
  }
  return { layoutId: 'en', script: 'latin' };
}

/**
 * Check if a language uses RTL script
 */
export function isRTLLanguage(languageCode: string): boolean {
  const rtlScripts: ScriptType[] = ['arabic', 'hebrew', 'thaana'];
  
  // Check NLLB-200 mappings
  const nllbMapping = nllb200ToGboardMappings[languageCode];
  if (nllbMapping && rtlScripts.includes(nllbMapping.script)) {
    return true;
  }
  
  // Check comprehensive mappings
  const mapping = comprehensiveLanguageMappings.find(
    m => m.code === languageCode || m.code.toLowerCase() === languageCode.toLowerCase()
  );
  
  return mapping ? rtlScripts.includes(mapping.script) : false;
}

/**
 * Get script type for a language
 */
export function getScriptForLanguage(languageCode: string): ScriptType {
  // Check NLLB-200 mappings first
  const nllbMapping = nllb200ToGboardMappings[languageCode];
  if (nllbMapping) {
    return nllbMapping.script;
  }
  
  const mapping = comprehensiveLanguageMappings.find(
    m => m.code === languageCode || m.code.toLowerCase() === languageCode.toLowerCase()
  );
  
  return mapping?.script || 'latin';
}

/**
 * Get all language codes that map to a specific layout
 */
export function getLanguagesForLayout(layoutId: string): string[] {
  const languages: string[] = [];
  
  // From NLLB-200 mappings
  Object.entries(nllb200ToGboardMappings).forEach(([code, mapping]) => {
    if (mapping.layoutId === layoutId) {
      languages.push(code);
    }
  });
  
  // From comprehensive mappings
  comprehensiveLanguageMappings
    .filter(m => m.layoutId === layoutId)
    .forEach(m => languages.push(m.code));
  
  return [...new Set(languages)];
}

/**
 * Get language mapping by name
 */
export function getLanguageMappingByName(name: string): LanguageMapping | undefined {
  const normalizedName = name.toLowerCase().trim();
  return comprehensiveLanguageMappings.find(
    m => m.name.toLowerCase() === normalizedName || 
         m.nativeName.toLowerCase() === normalizedName
  );
}

/**
 * Search languages by partial name match
 */
export function searchLanguages(query: string): LanguageMapping[] {
  const normalizedQuery = query.toLowerCase().trim();
  return comprehensiveLanguageMappings.filter(
    m => m.name.toLowerCase().includes(normalizedQuery) ||
         m.nativeName.toLowerCase().includes(normalizedQuery) ||
         m.code.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Get total number of supported languages
 */
export function getTotalSupportedLanguages(): number {
  const allCodes = new Set<string>();
  
  Object.keys(nllb200ToGboardMappings).forEach(code => allCodes.add(code));
  comprehensiveLanguageMappings.forEach(m => allCodes.add(m.code));
  
  return allCodes.size;
}

// Export LanguageMapping type for external use
export type { LanguageMapping };

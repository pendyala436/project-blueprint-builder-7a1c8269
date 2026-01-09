/**
 * NLLB-200 Language Codes Mapping
 * Complete mapping of 300+ languages to NLLB format codes
 * Supports all languages from src/data/languages.ts
 */

import type { NLLBLanguageCode, ScriptPattern } from './types';

// ============================================================
// COMPLETE NLLB-200 LANGUAGE CODE MAPPINGS (300+ languages)
// ============================================================

export const LANGUAGE_TO_NLLB: Record<string, NLLBLanguageCode> = {
  // ========== INDIAN LANGUAGES (22 Scheduled + Regional) ==========
  hindi: 'hin_Deva', hi: 'hin_Deva', hin: 'hin_Deva',
  bengali: 'ben_Beng', bn: 'ben_Beng', ben: 'ben_Beng', bangla: 'ben_Beng',
  telugu: 'tel_Telu', te: 'tel_Telu', tel: 'tel_Telu',
  tamil: 'tam_Taml', ta: 'tam_Taml', tam: 'tam_Taml',
  marathi: 'mar_Deva', mr: 'mar_Deva', mar: 'mar_Deva',
  gujarati: 'guj_Gujr', gu: 'guj_Gujr', guj: 'guj_Gujr',
  kannada: 'kan_Knda', kn: 'kan_Knda', kan: 'kan_Knda',
  malayalam: 'mal_Mlym', ml: 'mal_Mlym', mal: 'mal_Mlym',
  punjabi: 'pan_Guru', pa: 'pan_Guru', pan: 'pan_Guru',
  odia: 'ory_Orya', or: 'ory_Orya', ory: 'ory_Orya', oriya: 'ory_Orya',
  urdu: 'urd_Arab', ur: 'urd_Arab', urd: 'urd_Arab',
  assamese: 'asm_Beng', as: 'asm_Beng', asm: 'asm_Beng',
  nepali: 'npi_Deva', ne: 'npi_Deva', npi: 'npi_Deva',
  sinhala: 'sin_Sinh', si: 'sin_Sinh', sin: 'sin_Sinh', sinhalese: 'sin_Sinh',
  konkani: 'gom_Deva', kok: 'gom_Deva', gom: 'gom_Deva',
  maithili: 'mai_Deva', mai: 'mai_Deva',
  santali: 'sat_Olck', sat: 'sat_Olck',
  kashmiri: 'kas_Arab', ks: 'kas_Arab', kas: 'kas_Arab',
  sindhi: 'snd_Arab', sd: 'snd_Arab', snd: 'snd_Arab',
  dogri: 'doi_Deva', doi: 'doi_Deva',
  bodo: 'brx_Deva', brx: 'brx_Deva',
  manipuri: 'mni_Beng', mni: 'mni_Beng',
  sanskrit: 'san_Deva', sa: 'san_Deva', san: 'san_Deva',
  
  // Indian Regional Languages (NLLB fallbacks)
  bhojpuri: 'bho_Deva', bho: 'bho_Deva',
  magahi: 'mag_Deva', mag: 'mag_Deva',
  awadhi: 'awa_Deva', awa: 'awa_Deva',
  chhattisgarhi: 'hne_Deva', hne: 'hne_Deva',
  marwari: 'hin_Deva', // Fallback to Hindi
  rajasthani: 'hin_Deva', raj: 'hin_Deva',
  haryanvi: 'hin_Deva', bgc: 'hin_Deva',
  kumaoni: 'hin_Deva', kfy: 'hin_Deva',
  garhwali: 'hin_Deva', gbm: 'hin_Deva',
  tulu: 'kan_Knda', tcy: 'kan_Knda', // Fallback to Kannada
  mizo: 'lus_Latn', lus: 'lus_Latn',

  // ========== MAJOR WORLD LANGUAGES ==========
  english: 'eng_Latn', en: 'eng_Latn', eng: 'eng_Latn',
  chinese: 'zho_Hans', zh: 'zho_Hans', zho: 'zho_Hans',
  'chinese (simplified)': 'zho_Hans',
  'chinese (traditional)': 'zho_Hant', zht: 'zho_Hant',
  mandarin: 'zho_Hans',
  'simplified chinese': 'zho_Hans',
  'traditional chinese': 'zho_Hant',
  spanish: 'spa_Latn', es: 'spa_Latn', spa: 'spa_Latn',
  french: 'fra_Latn', fr: 'fra_Latn', fra: 'fra_Latn',
  arabic: 'arb_Arab', ar: 'arb_Arab', ara: 'arb_Arab', arb: 'arb_Arab',
  portuguese: 'por_Latn', pt: 'por_Latn', por: 'por_Latn',
  russian: 'rus_Cyrl', ru: 'rus_Cyrl', rus: 'rus_Cyrl',
  japanese: 'jpn_Jpan', ja: 'jpn_Jpan', jpn: 'jpn_Jpan',
  german: 'deu_Latn', de: 'deu_Latn', deu: 'deu_Latn',
  korean: 'kor_Hang', ko: 'kor_Hang', kor: 'kor_Hang',
  italian: 'ita_Latn', it: 'ita_Latn', ita: 'ita_Latn',
  dutch: 'nld_Latn', nl: 'nld_Latn', nld: 'nld_Latn',
  polish: 'pol_Latn', pl: 'pol_Latn', pol: 'pol_Latn',
  turkish: 'tur_Latn', tr: 'tur_Latn', tur: 'tur_Latn',
  vietnamese: 'vie_Latn', vi: 'vie_Latn', vie: 'vie_Latn',
  thai: 'tha_Thai', th: 'tha_Thai', tha: 'tha_Thai',
  indonesian: 'ind_Latn', id: 'ind_Latn', ind: 'ind_Latn',
  malay: 'zsm_Latn', ms: 'zsm_Latn', zsm: 'zsm_Latn', 'standard malay': 'zsm_Latn',
  persian: 'pes_Arab', fa: 'pes_Arab', pes: 'pes_Arab', farsi: 'pes_Arab',
  hebrew: 'heb_Hebr', he: 'heb_Hebr', heb: 'heb_Hebr',
  greek: 'ell_Grek', el: 'ell_Grek', ell: 'ell_Grek',
  ukrainian: 'ukr_Cyrl', uk: 'ukr_Cyrl', ukr: 'ukr_Cyrl',
  czech: 'ces_Latn', cs: 'ces_Latn', ces: 'ces_Latn',
  romanian: 'ron_Latn', ro: 'ron_Latn', ron: 'ron_Latn',
  hungarian: 'hun_Latn', hu: 'hun_Latn', hun: 'hun_Latn',
  swedish: 'swe_Latn', sv: 'swe_Latn', swe: 'swe_Latn',
  danish: 'dan_Latn', da: 'dan_Latn', dan: 'dan_Latn',
  finnish: 'fin_Latn', fi: 'fin_Latn', fin: 'fin_Latn',
  norwegian: 'nob_Latn', no: 'nob_Latn', nor: 'nob_Latn', nb: 'nob_Latn', nob: 'nob_Latn',
  'norwegian bokmål': 'nob_Latn',
  'norwegian nynorsk': 'nno_Latn', nn: 'nno_Latn',

  // ========== EAST ASIAN ==========
  cantonese: 'yue_Hant', yue: 'yue_Hant',
  'wu chinese': 'wuu_Hans', wuu: 'wuu_Hans',
  'min nan chinese': 'nan_Latn', nan: 'nan_Latn',
  'hakka chinese': 'hak_Hans', hak: 'hak_Hans',

  // ========== SOUTHEAST ASIAN ==========
  tagalog: 'tgl_Latn', tl: 'tgl_Latn', tgl: 'tgl_Latn',
  filipino: 'tgl_Latn', fil: 'tgl_Latn',
  burmese: 'mya_Mymr', my: 'mya_Mymr', mya: 'mya_Mymr', myanmar: 'mya_Mymr', 'myanmar (burmese)': 'mya_Mymr',
  khmer: 'khm_Khmr', km: 'khm_Khmr', khm: 'khm_Khmr', cambodian: 'khm_Khmr',
  lao: 'lao_Laoo', lo: 'lao_Laoo', laotian: 'lao_Laoo',
  javanese: 'jav_Latn', jv: 'jav_Latn', jav: 'jav_Latn',
  sundanese: 'sun_Latn', su: 'sun_Latn', sun: 'sun_Latn',
  cebuano: 'ceb_Latn', ceb: 'ceb_Latn',
  ilocano: 'ilo_Latn', ilo: 'ilo_Latn',
  pangasinan: 'pag_Latn', pag: 'pag_Latn',
  waray: 'war_Latn', war: 'war_Latn',
  minangkabau: 'min_Latn', min: 'min_Latn',
  balinese: 'ban_Latn', ban: 'ban_Latn',
  acehnese: 'ace_Latn', ace: 'ace_Latn',
  banjar: 'bjn_Latn', bjn: 'bjn_Latn',
  buginese: 'bug_Latn', bug: 'bug_Latn',
  shan: 'shn_Mymr', shn: 'shn_Mymr',
  hmong: 'hmn_Latn', hmn: 'hmn_Latn',

  // ========== MIDDLE EASTERN ==========
  'standard arabic': 'arb_Arab',
  'modern standard arabic': 'arb_Arab',
  'egyptian arabic': 'arz_Arab', arz: 'arz_Arab',
  'moroccan arabic': 'ary_Arab', ary: 'ary_Arab',
  'mesopotamian arabic': 'acm_Arab', acm: 'acm_Arab',
  'tunisian arabic': 'aeb_Arab', aeb: 'aeb_Arab',
  'south levantine arabic': 'ajp_Arab', ajp: 'ajp_Arab',
  'north levantine arabic': 'apc_Arab', apc: 'apc_Arab',
  "ta'izzi-adeni arabic": 'acq_Arab', acq: 'acq_Arab',
  'najdi arabic': 'ars_Arab', ars: 'ars_Arab',
  'western persian': 'pes_Arab',
  pashto: 'pbt_Arab', ps: 'pbt_Arab', pbt: 'pbt_Arab', 'southern pashto': 'pbt_Arab',
  dari: 'prs_Arab', prs: 'prs_Arab',
  kurdish: 'ckb_Arab', ku: 'ckb_Arab', ckb: 'ckb_Arab', 'central kurdish': 'ckb_Arab',

  // ========== AFRICAN LANGUAGES ==========
  swahili: 'swh_Latn', sw: 'swh_Latn', swh: 'swh_Latn',
  amharic: 'amh_Ethi', am: 'amh_Ethi', amh: 'amh_Ethi',
  yoruba: 'yor_Latn', yo: 'yor_Latn', yor: 'yor_Latn',
  igbo: 'ibo_Latn', ig: 'ibo_Latn', ibo: 'ibo_Latn',
  hausa: 'hau_Latn', ha: 'hau_Latn', hau: 'hau_Latn',
  zulu: 'zul_Latn', zu: 'zul_Latn', zul: 'zul_Latn',
  xhosa: 'xho_Latn', xh: 'xho_Latn', xho: 'xho_Latn',
  afrikaans: 'afr_Latn', af: 'afr_Latn', afr: 'afr_Latn',
  somali: 'som_Latn', so: 'som_Latn', som: 'som_Latn',
  tigrinya: 'tir_Ethi', ti: 'tir_Ethi', tir: 'tir_Ethi',
  oromo: 'gaz_Latn', om: 'gaz_Latn', gaz: 'gaz_Latn', 'west central oromo': 'gaz_Latn',
  shona: 'sna_Latn', sn: 'sna_Latn', sna: 'sna_Latn',
  kinyarwanda: 'kin_Latn', rw: 'kin_Latn', kin: 'kin_Latn',
  rundi: 'run_Latn', rn: 'run_Latn', run: 'run_Latn',
  chichewa: 'nya_Latn', ny: 'nya_Latn', nya: 'nya_Latn', nyanja: 'nya_Latn',
  luganda: 'lug_Latn', lg: 'lug_Latn', lug: 'lug_Latn', ganda: 'lug_Latn',
  lingala: 'lin_Latn', ln: 'lin_Latn', lin: 'lin_Latn',
  tswana: 'tsn_Latn', tn: 'tsn_Latn', tsn: 'tsn_Latn',
  tsonga: 'tso_Latn', ts: 'tso_Latn', tso: 'tso_Latn',
  'southern sotho': 'sot_Latn', st: 'sot_Latn', sot: 'sot_Latn',
  'northern sotho': 'nso_Latn', nso: 'nso_Latn',
  swazi: 'ssw_Latn', ss: 'ssw_Latn', ssw: 'ssw_Latn', swati: 'ssw_Latn',
  wolof: 'wol_Latn', wo: 'wol_Latn', wol: 'wol_Latn',
  fulah: 'fuv_Latn', ff: 'fuv_Latn', fuv: 'fuv_Latn', 'nigerian fulfulde': 'fuv_Latn',
  bambara: 'bam_Latn', bm: 'bam_Latn', bam: 'bam_Latn',
  ewe: 'ewe_Latn', ee: 'ewe_Latn',
  kikuyu: 'kik_Latn', ki: 'kik_Latn', kik: 'kik_Latn', gikuyu: 'kik_Latn',
  luo: 'luo_Latn',
  kamba: 'kam_Latn', kam: 'kam_Latn',
  umbundu: 'umb_Latn', umb: 'umb_Latn',
  kimbundu: 'kmb_Latn', kmb: 'kmb_Latn',
  kongo: 'kon_Latn', kg: 'kon_Latn', kon: 'kon_Latn',
  'luba-kasai': 'lua_Latn', lua: 'lua_Latn',
  'luba-katanga': 'lub_Latn', lu: 'lub_Latn',
  tumbuka: 'tum_Latn', tum: 'tum_Latn',
  bemba: 'bem_Latn', bem: 'bem_Latn',
  chokwe: 'cjk_Latn', cjk: 'cjk_Latn',
  'central kanuri': 'knc_Latn', knc: 'knc_Latn', kanuri: 'knc_Latn',
  mossi: 'mos_Latn', mos: 'mos_Latn',
  kabiyè: 'kbp_Latn', kbp: 'kbp_Latn',
  dyula: 'dyu_Latn', dyu: 'dyu_Latn',
  akan: 'aka_Latn', ak: 'aka_Latn', aka: 'aka_Latn',
  twi: 'twi_Latn', tw: 'twi_Latn',
  sango: 'sag_Latn', sg: 'sag_Latn', sag: 'sag_Latn',
  soga: 'xog_Latn', xog: 'xog_Latn',
  nuer: 'nus_Latn', nus: 'nus_Latn',
  'southwestern dinka': 'dik_Latn', dik: 'dik_Latn',

  // ========== EUROPEAN LANGUAGES ==========
  catalan: 'cat_Latn', ca: 'cat_Latn', cat: 'cat_Latn',
  croatian: 'hrv_Latn', hr: 'hrv_Latn', hrv: 'hrv_Latn',
  serbian: 'srp_Cyrl', sr: 'srp_Cyrl', srp: 'srp_Cyrl',
  bosnian: 'bos_Latn', bs: 'bos_Latn', bos: 'bos_Latn',
  slovak: 'slk_Latn', sk: 'slk_Latn', slk: 'slk_Latn',
  slovenian: 'slv_Latn', sl: 'slv_Latn', slv: 'slv_Latn',
  bulgarian: 'bul_Cyrl', bg: 'bul_Cyrl', bul: 'bul_Cyrl',
  lithuanian: 'lit_Latn', lt: 'lit_Latn', lit: 'lit_Latn',
  latvian: 'lvs_Latn', lv: 'lvs_Latn', lav: 'lvs_Latn', lvs: 'lvs_Latn', 'standard latvian': 'lvs_Latn',
  estonian: 'est_Latn', et: 'est_Latn', est: 'est_Latn',
  belarusian: 'bel_Cyrl', be: 'bel_Cyrl', bel: 'bel_Cyrl',
  macedonian: 'mkd_Cyrl', mk: 'mkd_Cyrl', mkd: 'mkd_Cyrl',
  albanian: 'als_Latn', sq: 'als_Latn', als: 'als_Latn', 'tosk albanian': 'als_Latn',
  icelandic: 'isl_Latn', is: 'isl_Latn', isl: 'isl_Latn',
  irish: 'gle_Latn', ga: 'gle_Latn', gle: 'gle_Latn',
  welsh: 'cym_Latn', cy: 'cym_Latn', cym: 'cym_Latn',
  'scottish gaelic': 'gla_Latn', gd: 'gla_Latn', gla: 'gla_Latn',
  basque: 'eus_Latn', eu: 'eus_Latn', eus: 'eus_Latn',
  galician: 'glg_Latn', gl: 'glg_Latn', glg: 'glg_Latn',
  maltese: 'mlt_Latn', mt: 'mlt_Latn', mlt: 'mlt_Latn',
  luxembourgish: 'ltz_Latn', lb: 'ltz_Latn', ltz: 'ltz_Latn',
  faroese: 'fao_Latn', fo: 'fao_Latn', fao: 'fao_Latn',
  occitan: 'oci_Latn', oc: 'oci_Latn', oci: 'oci_Latn',
  asturian: 'ast_Latn', ast: 'ast_Latn',
  breton: 'bre_Latn', br: 'bre_Latn', bre: 'bre_Latn',
  corsican: 'cos_Latn', co: 'cos_Latn',
  sardinian: 'srd_Latn', sc: 'srd_Latn', srd: 'srd_Latn',
  friulian: 'fur_Latn', fur: 'fur_Latn',
  ligurian: 'lij_Latn', lij: 'lij_Latn',
  lombard: 'lmo_Latn', lmo: 'lmo_Latn',
  sicilian: 'scn_Latn', scn: 'scn_Latn',
  venetian: 'vec_Latn', vec: 'vec_Latn',
  latgalian: 'ltg_Latn', ltg: 'ltg_Latn',
  silesian: 'szl_Latn', szl: 'szl_Latn',
  'western frisian': 'fry_Latn', fy: 'fry_Latn', fry: 'fry_Latn',
  limburgish: 'lim_Latn', li: 'lim_Latn', lim: 'lim_Latn',

  // ========== CAUCASIAN LANGUAGES ==========
  georgian: 'kat_Geor', ka: 'kat_Geor', kat: 'kat_Geor',
  armenian: 'hye_Armn', hy: 'hye_Armn', hye: 'hye_Armn',

  // ========== CENTRAL ASIAN LANGUAGES ==========
  kazakh: 'kaz_Cyrl', kk: 'kaz_Cyrl', kaz: 'kaz_Cyrl',
  uzbek: 'uzn_Latn', uz: 'uzn_Latn', uzn: 'uzn_Latn', uzb: 'uzn_Latn',
  tajik: 'tgk_Cyrl', tg: 'tgk_Cyrl', tgk: 'tgk_Cyrl',
  kyrgyz: 'kir_Cyrl', ky: 'kir_Cyrl', kir: 'kir_Cyrl',
  turkmen: 'tuk_Latn', tk: 'tuk_Latn', tuk: 'tuk_Latn',
  mongolian: 'khk_Cyrl', mn: 'khk_Cyrl', mon: 'khk_Cyrl', khk: 'khk_Cyrl',
  tibetan: 'bod_Tibt', bo: 'bod_Tibt', bod: 'bod_Tibt',
  uyghur: 'uig_Arab', ug: 'uig_Arab', uig: 'uig_Arab',
  azerbaijani: 'azj_Latn', az: 'azj_Latn', azj: 'azj_Latn', 'north azerbaijani': 'azj_Latn',
  tatar: 'tat_Cyrl', tt: 'tat_Cyrl', tat: 'tat_Cyrl',
  bashkir: 'bak_Cyrl', ba: 'bak_Cyrl', bak: 'bak_Cyrl',
  'crimean tatar': 'crh_Latn', crh: 'crh_Latn',
  kachin: 'kac_Latn', kac: 'kac_Latn',

  // ========== BERBER/TAMAZIGHT ==========
  berber: 'tzm_Tfng', ber: 'tzm_Tfng',
  'central atlas tamazight': 'tzm_Tfng', tzm: 'tzm_Tfng',
  kabyle: 'kab_Latn', kab: 'kab_Latn',
  tamasheq: 'taq_Latn', taq: 'taq_Latn',

  // ========== PACIFIC LANGUAGES ==========
  maori: 'mri_Latn', mi: 'mri_Latn', mri: 'mri_Latn',
  samoan: 'smo_Latn', sm: 'smo_Latn', smo: 'smo_Latn',
  tongan: 'ton_Latn', to: 'ton_Latn', ton: 'ton_Latn',
  fijian: 'fij_Latn', fj: 'fij_Latn', fij: 'fij_Latn',
  hawaiian: 'haw_Latn', haw: 'haw_Latn',
  malagasy: 'plt_Latn', mg: 'plt_Latn', plt: 'plt_Latn', 'plateau malagasy': 'plt_Latn',
  'tok pisin': 'tpi_Latn', tpi: 'tpi_Latn',
  chamorro: 'cha_Latn', ch: 'cha_Latn',

  // ========== CREOLE LANGUAGES ==========
  'haitian creole': 'hat_Latn', ht: 'hat_Latn', hat: 'hat_Latn',
  papiamento: 'pap_Latn', pap: 'pap_Latn',
  kabuverdianu: 'kea_Latn', kea: 'kea_Latn',
  hunsrik: 'hrx_Latn', hrx: 'hrx_Latn',

  // ========== CONSTRUCTED LANGUAGES ==========
  esperanto: 'epo_Latn', eo: 'epo_Latn', epo: 'epo_Latn',

  // ========== OTHER ISO CODES FROM languages.ts ==========
  afar: 'aar_Latn', aa: 'aar_Latn',
  abkhazian: 'abk_Cyrl', ab: 'abk_Cyrl',
  aragonese: 'arg_Latn', an: 'arg_Latn',
  avaric: 'ava_Cyrl', av: 'ava_Cyrl',
  aymara: 'aym_Latn', ay: 'aym_Latn',
  bihari: 'bho_Deva', bh: 'bho_Deva',
  bislama: 'bis_Latn', bi: 'bis_Latn',
  chechen: 'che_Cyrl', ce: 'che_Cyrl',
  'church slavic': 'chu_Cyrl', cu: 'chu_Cyrl',
  chuvash: 'chv_Cyrl', cv: 'chv_Cyrl',
  cree: 'cre_Cans', cr: 'cre_Cans',
  divehi: 'div_Thaa', dv: 'div_Thaa',
  dzongkha: 'dzo_Tibt', dz: 'dzo_Tibt',
  guarani: 'grn_Latn', gn: 'grn_Latn', grn: 'grn_Latn',
  manx: 'glv_Latn', gv: 'glv_Latn',
  herero: 'her_Latn', hz: 'her_Latn',
  interlingua: 'ina_Latn', ia: 'ina_Latn',
  interlingue: 'ile_Latn', ie: 'ile_Latn',
  'sichuan yi': 'iii_Yiii', ii: 'iii_Yiii',
  inupiaq: 'ipk_Latn', ik: 'ipk_Latn',
  ido: 'ido_Latn', io: 'ido_Latn',
  inuktitut: 'iku_Cans', iu: 'iku_Cans',
  kuanyama: 'kua_Latn', kj: 'kua_Latn',
  kalaallisut: 'kal_Latn', kl: 'kal_Latn',
  komi: 'kom_Cyrl', kv: 'kom_Cyrl',
  cornish: 'cor_Latn', kw: 'cor_Latn',
  latin: 'lat_Latn', la: 'lat_Latn',
  marshallese: 'mah_Latn', mh: 'mah_Latn',
  nauru: 'nau_Latn', na: 'nau_Latn',
  'north ndebele': 'nde_Latn', nd: 'nde_Latn',
  ndonga: 'ndo_Latn', ng: 'ndo_Latn',
  'south ndebele': 'nbl_Latn', nr: 'nbl_Latn',
  navajo: 'nav_Latn', nv: 'nav_Latn',
  ojibwa: 'oji_Cans', oj: 'oji_Cans',
  ossetian: 'oss_Cyrl', os: 'oss_Cyrl',
  pali: 'pli_Deva', pi: 'pli_Deva',
  quechua: 'quy_Latn', qu: 'quy_Latn', 'ayacucho quechua': 'quy_Latn',
  romansh: 'roh_Latn', rm: 'roh_Latn',
  'northern sami': 'sme_Latn', se: 'sme_Latn',
  tahitian: 'tah_Latn', ty: 'tah_Latn',
  venda: 'ven_Latn', ve: 'ven_Latn',
  volapük: 'vol_Latn', vo: 'vol_Latn',
  walloon: 'wln_Latn', wa: 'wln_Latn',
  yiddish: 'ydd_Hebr', yi: 'ydd_Hebr',
  zhuang: 'zha_Latn', za: 'zha_Latn',

  // ========== ADDITIONAL NLLB-200 SPECIFIC CODES ==========
  // South Asian additional
  chakma: 'ccp_Cakm', ccp: 'ccp_Cakm',
  rohingya: 'rhg_Arab', rhg: 'rhg_Arab',
  sylheti: 'syl_Beng', syl: 'syl_Beng',
  chittagonian: 'ctg_Beng', ctg: 'ctg_Beng',
  rangpuri: 'rkt_Beng', rkt: 'rkt_Beng',
  deccan: 'dcc_Arab', dcc: 'dcc_Arab',
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
  { regex: /[\u1C50-\u1C7F]/, language: 'santali', nllbCode: 'sat_Olck', script: 'Ol_Chiki' },
  { regex: /[\u11100-\u1114F]/, language: 'chakma', nllbCode: 'ccp_Cakm', script: 'Chakma' },

  // East Asian Scripts
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: 'chinese', nllbCode: 'zho_Hans', script: 'Han' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese', nllbCode: 'jpn_Jpan', script: 'Japanese' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: 'korean', nllbCode: 'kor_Hang', script: 'Hangul' },

  // Southeast Asian Scripts
  { regex: /[\u0E00-\u0E7F]/, language: 'thai', nllbCode: 'tha_Thai', script: 'Thai' },
  { regex: /[\u1000-\u109F]/, language: 'burmese', nllbCode: 'mya_Mymr', script: 'Myanmar' },
  { regex: /[\u1780-\u17FF]/, language: 'khmer', nllbCode: 'khm_Khmr', script: 'Khmer' },
  { regex: /[\u0E80-\u0EFF]/, language: 'lao', nllbCode: 'lao_Laoo', script: 'Lao' },
  { regex: /[\u1980-\u19DF]/, language: 'tai_le', nllbCode: 'shn_Mymr', script: 'Tai_Le' },

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
  { regex: /[\u2D30-\u2D7F]/, language: 'berber', nllbCode: 'tzm_Tfng', script: 'Tifinagh' },

  // Greek
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, language: 'greek', nllbCode: 'ell_Grek', script: 'Greek' },

  // Tibetan
  { regex: /[\u0F00-\u0FFF]/, language: 'tibetan', nllbCode: 'bod_Tibt', script: 'Tibetan' },

  // Thaana (Divehi/Maldivian)
  { regex: /[\u0780-\u07BF]/, language: 'divehi', nllbCode: 'div_Thaa', script: 'Thaana' },

  // Canadian Aboriginal
  { regex: /[\u1400-\u167F]/, language: 'inuktitut', nllbCode: 'iku_Cans', script: 'Canadian_Aboriginal' },
];

// Indian language list
export const INDIAN_LANGUAGES = [
  'hindi', 'bengali', 'bangla', 'telugu', 'tamil', 'marathi', 'gujarati',
  'kannada', 'malayalam', 'punjabi', 'odia', 'oriya', 'assamese', 'nepali',
  'urdu', 'konkani', 'maithili', 'santali', 'bodo', 'dogri', 'kashmiri',
  'sindhi', 'manipuri', 'sinhala', 'bhojpuri', 'magahi', 'chhattisgarhi', 'awadhi',
  'rajasthani', 'marwari', 'haryanvi', 'kumaoni', 'garhwali', 'tulu', 'mizo'
];

// Latin-script languages
export const LATIN_SCRIPT_LANGUAGES = [
  'english', 'spanish', 'french', 'german', 'portuguese', 'italian', 'dutch',
  'polish', 'vietnamese', 'indonesian', 'malay', 'tagalog', 'turkish', 'swahili',
  'czech', 'romanian', 'hungarian', 'swedish', 'danish', 'finnish', 'norwegian',
  'croatian', 'slovak', 'slovenian', 'latvian', 'lithuanian', 'estonian', 'bosnian',
  'albanian', 'icelandic', 'irish', 'welsh', 'basque', 'catalan', 'galician',
  'maltese', 'afrikaans', 'yoruba', 'igbo', 'hausa', 'zulu', 'xhosa', 'somali',
  'uzbek', 'turkmen', 'javanese', 'sundanese', 'cebuano', 'ilocano', 'maori',
  'samoan', 'tongan', 'fijian', 'hawaiian', 'haitian creole', 'esperanto'
];

/**
 * Get NLLB code for a language name or code
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

/**
 * Get language count
 */
export function getSupportedLanguageCount(): number {
  const uniqueCodes = new Set(Object.values(LANGUAGE_TO_NLLB));
  return uniqueCodes.size;
}

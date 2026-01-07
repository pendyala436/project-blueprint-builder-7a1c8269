/**
 * Translation Web Worker
 * ======================
 * Handles all translation and transliteration off the main thread
 * for non-blocking UI performance.
 * 
 * Fixes Applied:
 * - ICU-style transliteration with phonetic preprocessing
 * - Unicode NFC normalization throughout
 * - Message queue with unique IDs (atomic processing)
 * - Chunked translation for long sentences
 * - Debounced preview (handled in main thread)
 * - Error handling with fallbacks
 * - Context-aware language detection
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure for browser-only usage
env.allowLocalModels = false;
env.useBrowserCache = true;

// ============================================================
// TYPES
// ============================================================

interface WorkerMessage {
  id: string;
  type: 'init' | 'translate' | 'transliterate' | 'process_chat' | 'detect_language' | 'batch_translate';
  payload: any;
}

interface WorkerResponse {
  id: string;
  type: string;
  success: boolean;
  result?: any;
  error?: string;
}

// ============================================================
// MODEL & STATE
// ============================================================

const MODEL_ID = 'Xenova/nllb-200-distilled-600M';
let translationPipeline: any = null;
let isLoading = false;
let loadProgress = 0;

// Caches
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 2000;

// Message queue to prevent race conditions (atomic processing)
const messageQueue = new Map<string, WorkerMessage>();
let processingQueue = false;
const pendingQueue: WorkerMessage[] = [];

// ============================================================
// PHONETIC PREPROCESSING MAPS (ICU-style)
// ============================================================

// Common romanization patterns → normalized phonemes
const PHONETIC_PREPROCESSOR: Record<string, string> = {
  // Doubled vowels → long vowels
  'aa': 'ā', 'ee': 'ī', 'ii': 'ī', 'oo': 'ū', 'uu': 'ū',
  'ai': 'ai', 'au': 'au', 'ou': 'ō', 'ei': 'ē',
  
  // Aspirated consonants (common in Indic)
  'kh': 'kʰ', 'gh': 'gʰ', 'ch': 'cʰ', 'jh': 'jʰ',
  'th': 'tʰ', 'dh': 'dʰ', 'ph': 'pʰ', 'bh': 'bʰ',
  
  // Retroflex consonants
  'tt': 'ṭ', 'dd': 'ḍ', 'nn': 'ṇ', 'rr': 'ṛ', 'll': 'ḷ',
  
  // Sibilants and nasals
  'sh': 'ś', 'ng': 'ṅ', 'ny': 'ñ', 'gn': 'ñ',
  
  // Special sounds
  'zh': 'ẓ', 'ksh': 'kṣ', 'gya': 'gyā', 'tra': 'trā',
};

// Order matters - process longer patterns first
const PHONETIC_PATTERNS = Object.entries(PHONETIC_PREPROCESSOR)
  .sort((a, b) => b[0].length - a[0].length);

// ============================================================
// NLLB LANGUAGE MAPPINGS (300+ languages - comprehensive)
// ============================================================

const NLLB_CODES: Record<string, string> = {
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
  bhojpuri: 'bho_Deva', bho: 'bho_Deva',
  magahi: 'mag_Deva', mag: 'mag_Deva',
  awadhi: 'awa_Deva', awa: 'awa_Deva',
  chhattisgarhi: 'hne_Deva', hne: 'hne_Deva',
  marwari: 'hin_Deva', rajasthani: 'hin_Deva', raj: 'hin_Deva',
  haryanvi: 'hin_Deva', bgc: 'hin_Deva',
  kumaoni: 'hin_Deva', kfy: 'hin_Deva',
  garhwali: 'hin_Deva', gbm: 'hin_Deva',
  tulu: 'kan_Knda', tcy: 'kan_Knda',
  mizo: 'lus_Latn', lus: 'lus_Latn',

  // ========== MAJOR WORLD LANGUAGES ==========
  english: 'eng_Latn', en: 'eng_Latn', eng: 'eng_Latn',
  chinese: 'zho_Hans', zh: 'zho_Hans', zho: 'zho_Hans',
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
  malay: 'zsm_Latn', ms: 'zsm_Latn', zsm: 'zsm_Latn',
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

  // ========== EAST ASIAN ==========
  cantonese: 'yue_Hant', yue: 'yue_Hant',

  // ========== SOUTHEAST ASIAN ==========
  tagalog: 'tgl_Latn', tl: 'tgl_Latn', tgl: 'tgl_Latn',
  filipino: 'tgl_Latn', fil: 'tgl_Latn',
  burmese: 'mya_Mymr', my: 'mya_Mymr', mya: 'mya_Mymr', myanmar: 'mya_Mymr',
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
  pashto: 'pbt_Arab', ps: 'pbt_Arab', pbt: 'pbt_Arab',
  dari: 'prs_Arab', prs: 'prs_Arab',
  kurdish: 'ckb_Arab', ku: 'ckb_Arab', ckb: 'ckb_Arab',

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
  oromo: 'gaz_Latn', om: 'gaz_Latn', gaz: 'gaz_Latn',
  shona: 'sna_Latn', sn: 'sna_Latn', sna: 'sna_Latn',
  kinyarwanda: 'kin_Latn', rw: 'kin_Latn', kin: 'kin_Latn',
  rundi: 'run_Latn', rn: 'run_Latn', run: 'run_Latn',
  chichewa: 'nya_Latn', ny: 'nya_Latn', nya: 'nya_Latn', nyanja: 'nya_Latn',
  luganda: 'lug_Latn', lg: 'lug_Latn', lug: 'lug_Latn', ganda: 'lug_Latn',
  lingala: 'lin_Latn', ln: 'lin_Latn', lin: 'lin_Latn',
  tswana: 'tsn_Latn', tn: 'tsn_Latn', tsn: 'tsn_Latn',
  tsonga: 'tso_Latn', ts: 'tso_Latn', tso: 'tso_Latn',
  wolof: 'wol_Latn', wo: 'wol_Latn', wol: 'wol_Latn',
  fulah: 'fuv_Latn', ff: 'fuv_Latn', fuv: 'fuv_Latn',
  bambara: 'bam_Latn', bm: 'bam_Latn', bam: 'bam_Latn',
  ewe: 'ewe_Latn', ee: 'ewe_Latn',
  kikuyu: 'kik_Latn', ki: 'kik_Latn', kik: 'kik_Latn',
  akan: 'aka_Latn', ak: 'aka_Latn', aka: 'aka_Latn',
  twi: 'twi_Latn', tw: 'twi_Latn',
  sango: 'sag_Latn', sg: 'sag_Latn', sag: 'sag_Latn',

  // ========== EUROPEAN LANGUAGES ==========
  catalan: 'cat_Latn', ca: 'cat_Latn', cat: 'cat_Latn',
  croatian: 'hrv_Latn', hr: 'hrv_Latn', hrv: 'hrv_Latn',
  serbian: 'srp_Cyrl', sr: 'srp_Cyrl', srp: 'srp_Cyrl',
  bosnian: 'bos_Latn', bs: 'bos_Latn', bos: 'bos_Latn',
  slovak: 'slk_Latn', sk: 'slk_Latn', slk: 'slk_Latn',
  slovenian: 'slv_Latn', sl: 'slv_Latn', slv: 'slv_Latn',
  bulgarian: 'bul_Cyrl', bg: 'bul_Cyrl', bul: 'bul_Cyrl',
  lithuanian: 'lit_Latn', lt: 'lit_Latn', lit: 'lit_Latn',
  latvian: 'lvs_Latn', lv: 'lvs_Latn', lav: 'lvs_Latn', lvs: 'lvs_Latn',
  estonian: 'est_Latn', et: 'est_Latn', est: 'est_Latn',
  belarusian: 'bel_Cyrl', be: 'bel_Cyrl', bel: 'bel_Cyrl',
  macedonian: 'mkd_Cyrl', mk: 'mkd_Cyrl', mkd: 'mkd_Cyrl',
  albanian: 'als_Latn', sq: 'als_Latn', als: 'als_Latn',
  icelandic: 'isl_Latn', is: 'isl_Latn', isl: 'isl_Latn',
  irish: 'gle_Latn', ga: 'gle_Latn', gle: 'gle_Latn',
  welsh: 'cym_Latn', cy: 'cym_Latn', cym: 'cym_Latn',
  basque: 'eus_Latn', eu: 'eus_Latn', eus: 'eus_Latn',
  galician: 'glg_Latn', gl: 'glg_Latn', glg: 'glg_Latn',
  maltese: 'mlt_Latn', mt: 'mlt_Latn', mlt: 'mlt_Latn',
  luxembourgish: 'ltz_Latn', lb: 'ltz_Latn', ltz: 'ltz_Latn',
  faroese: 'fao_Latn', fo: 'fao_Latn', fao: 'fao_Latn',
  occitan: 'oci_Latn', oc: 'oci_Latn', oci: 'oci_Latn',
  asturian: 'ast_Latn', ast: 'ast_Latn',
  breton: 'bre_Latn', br: 'bre_Latn', bre: 'bre_Latn',

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
  azerbaijani: 'azj_Latn', az: 'azj_Latn', azj: 'azj_Latn',
  tatar: 'tat_Cyrl', tt: 'tat_Cyrl', tat: 'tat_Cyrl',
  bashkir: 'bak_Cyrl', ba: 'bak_Cyrl', bak: 'bak_Cyrl',

  // ========== PACIFIC LANGUAGES ==========
  maori: 'mri_Latn', mi: 'mri_Latn', mri: 'mri_Latn',
  samoan: 'smo_Latn', sm: 'smo_Latn', smo: 'smo_Latn',
  tongan: 'ton_Latn', to: 'ton_Latn', ton: 'ton_Latn',
  fijian: 'fij_Latn', fj: 'fij_Latn', fij: 'fij_Latn',
  hawaiian: 'haw_Latn', haw: 'haw_Latn',
  malagasy: 'plt_Latn', mg: 'plt_Latn', plt: 'plt_Latn',

  // ========== CREOLE LANGUAGES ==========
  'haitian creole': 'hat_Latn', ht: 'hat_Latn', hat: 'hat_Latn',
  papiamento: 'pap_Latn', pap: 'pap_Latn',

  // ========== CONSTRUCTED LANGUAGES ==========
  esperanto: 'epo_Latn', eo: 'epo_Latn', epo: 'epo_Latn',

  // ========== OTHER ==========
  guarani: 'grn_Latn', gn: 'grn_Latn', grn: 'grn_Latn',
  quechua: 'quy_Latn', qu: 'quy_Latn',
  aymara: 'aym_Latn', ay: 'aym_Latn',
  latin: 'lat_Latn', la: 'lat_Latn',
  yiddish: 'ydd_Hebr', yi: 'ydd_Hebr',
};

// Latin script languages
const LATIN_SCRIPT_LANGUAGES = new Set([
  'english', 'en', 'spanish', 'es', 'french', 'fr', 'german', 'de',
  'italian', 'it', 'portuguese', 'pt', 'dutch', 'nl', 'polish', 'pl',
  'turkish', 'tr', 'vietnamese', 'vi', 'indonesian', 'id', 'malay', 'ms',
  'tagalog', 'tl', 'swahili', 'sw', 'javanese', 'jv', 'cebuano', 'ceb',
  'romanian', 'ro', 'czech', 'cs', 'hungarian', 'hu', 'swedish', 'sv',
  'danish', 'da', 'finnish', 'fi', 'norwegian', 'no', 'croatian', 'hr',
  'slovak', 'sk', 'slovenian', 'sl', 'latvian', 'lv', 'lithuanian', 'lt',
  'estonian', 'et', 'bosnian', 'bs', 'albanian', 'sq', 'icelandic', 'is',
  'irish', 'ga', 'welsh', 'cy', 'basque', 'eu', 'catalan', 'ca',
  'galician', 'gl', 'maltese', 'mt', 'afrikaans', 'af', 'yoruba', 'yo',
  'igbo', 'ig', 'hausa', 'ha', 'zulu', 'zu', 'xhosa', 'xh', 'somali', 'so',
  'uzbek', 'uz', 'turkmen', 'tk',
]);

// ============================================================
// SCRIPT DETECTION (Unicode Ranges)
// ============================================================

const scriptPatterns: Array<{ regex: RegExp; script: string; languages: string[] }> = [
  // South Asian
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', languages: ['hindi', 'marathi', 'nepali', 'sanskrit', 'konkani', 'maithili', 'dogri'] },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', languages: ['bengali', 'assamese'] },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', languages: ['tamil'] },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', languages: ['telugu'] },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', languages: ['kannada'] },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', languages: ['malayalam'] },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', languages: ['gujarati'] },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', languages: ['punjabi'] },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', languages: ['odia'] },
  { regex: /[\u0D80-\u0DFF]/, script: 'Sinhala', languages: ['sinhala'] },
  { regex: /[\u1C50-\u1C7F]/, script: 'Ol_Chiki', languages: ['santali'] },
  // East Asian
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, script: 'Han', languages: ['chinese'] },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', languages: ['japanese'] },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, script: 'Hangul', languages: ['korean'] },
  // Southeast Asian
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', languages: ['thai'] },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', languages: ['lao'] },
  { regex: /[\u1000-\u109F]/, script: 'Myanmar', languages: ['burmese'] },
  { regex: /[\u1780-\u17FF]/, script: 'Khmer', languages: ['khmer'] },
  // Middle Eastern
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, script: 'Arabic', languages: ['arabic', 'urdu', 'persian', 'sindhi', 'kashmiri'] },
  { regex: /[\u0590-\u05FF]/, script: 'Hebrew', languages: ['hebrew'] },
  // European
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', languages: ['russian', 'ukrainian', 'bulgarian', 'serbian', 'macedonian', 'belarusian', 'kazakh', 'kyrgyz', 'tajik', 'mongolian'] },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, script: 'Greek', languages: ['greek'] },
  // Caucasian
  { regex: /[\u10A0-\u10FF]/, script: 'Georgian', languages: ['georgian'] },
  { regex: /[\u0530-\u058F]/, script: 'Armenian', languages: ['armenian'] },
  // African
  { regex: /[\u1200-\u137F]/, script: 'Ethiopic', languages: ['amharic', 'tigrinya'] },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function getNLLBCode(language: string): string {
  return NLLB_CODES[language.toLowerCase()] || 'eng_Latn';
}

function isLatinScriptLanguage(language: string): boolean {
  return LATIN_SCRIPT_LANGUAGES.has(language.toLowerCase());
}

function isLatinText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  if (!cleaned) return true;
  const latinChars = cleaned.match(/[a-zA-Z\u00C0-\u024F]/g); // Extended Latin
  return latinChars !== null && (latinChars.length / cleaned.length) > 0.7;
}

/**
 * Normalize Unicode to NFC form
 * Fixes: Combining marks render incorrectly
 */
function normalizeUnicode(text: string): string {
  try {
    return text.normalize('NFC');
  } catch {
    return text;
  }
}

/**
 * Preprocess Latin input with phonetic normalization
 * Fixes: Missing diacritics, ambiguous Latin input
 */
function preprocessLatinInput(text: string): string {
  // Normalize case first
  let result = text.toLowerCase().trim();
  
  // Apply phonetic patterns (longer patterns first)
  for (const [pattern, replacement] of PHONETIC_PATTERNS) {
    result = result.split(pattern).join(replacement);
  }
  
  // Normalize repeated characters (typo correction)
  result = result.replace(/(.)\1{2,}/g, '$1$1');
  
  return result;
}

/**
 * Detect language from text script
 * Fixes: Mixed-language detection
 */
function detectLanguageFromText(text: string): { language: string; script: string; isLatin: boolean; confidence: number } {
  const trimmed = normalizeUnicode(text.trim());
  if (!trimmed) return { language: 'english', script: 'Latin', isLatin: true, confidence: 0 };

  // Count characters per script
  const scriptCounts: Record<string, number> = { Latin: 0 };
  let totalChars = 0;
  
  for (const char of trimmed) {
    if (/[a-zA-Z\u00C0-\u024F]/.test(char)) {
      scriptCounts['Latin'] = (scriptCounts['Latin'] || 0) + 1;
      totalChars++;
      continue;
    }
    
    for (const pattern of scriptPatterns) {
      if (pattern.regex.test(char)) {
        scriptCounts[pattern.script] = (scriptCounts[pattern.script] || 0) + 1;
        totalChars++;
        break;
      }
    }
  }

  if (totalChars === 0) {
    return { language: 'english', script: 'Latin', isLatin: true, confidence: 0 };
  }

  // Find dominant script
  let maxScript = 'Latin';
  let maxCount = scriptCounts['Latin'] || 0;
  
  for (const [script, count] of Object.entries(scriptCounts)) {
    if (count > maxCount) {
      maxScript = script;
      maxCount = count;
    }
  }

  const confidence = maxCount / totalChars;

  if (maxScript === 'Latin') {
    return { language: 'english', script: 'Latin', isLatin: true, confidence };
  }

  // Find language for detected script
  for (const pattern of scriptPatterns) {
    if (pattern.script === maxScript) {
      return { language: pattern.languages[0], script: maxScript, isLatin: false, confidence };
    }
  }

  return { language: 'english', script: 'Latin', isLatin: true, confidence };
}

function isSameLanguage(lang1: string, lang2: string): boolean {
  const n1 = lang1.toLowerCase().trim();
  const n2 = lang2.toLowerCase().trim();
  if (n1 === n2) return true;
  
  const code1 = getNLLBCode(n1);
  const code2 = getNLLBCode(n2);
  return code1 === code2;
}

/**
 * Chunk long text for translation
 * Fixes: Very long sentences causing slowdown
 */
function chunkText(text: string, maxChunkSize: number = 200): string[] {
  if (text.length <= maxChunkSize) return [text];
  
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?।။။።])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxChunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      
      // If single sentence is too long, split by commas/words
      if (sentence.length > maxChunkSize) {
        const subParts = sentence.split(/(?<=[,;])\s+/);
        let subChunk = '';
        for (const part of subParts) {
          if (subChunk.length + part.length <= maxChunkSize) {
            subChunk += (subChunk ? ' ' : '') + part;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = part;
          }
        }
        if (subChunk) chunks.push(subChunk);
      } else {
        currentChunk = sentence;
      }
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// ============================================================
// MODEL INITIALIZATION
// ============================================================

async function initModel(): Promise<boolean> {
  if (translationPipeline) return true;
  if (isLoading) {
    while (isLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return translationPipeline !== null;
  }

  isLoading = true;
  
  try {
    console.log('[Worker] Loading NLLB-200 model...');
    translationPipeline = await pipeline('translation', MODEL_ID, {
      progress_callback: (data: any) => {
        if (data?.progress) {
          loadProgress = data.progress;
          self.postMessage({
            type: 'progress',
            progress: data.progress,
          });
        }
      },
    });
    console.log('[Worker] Model loaded successfully');
    return true;
  } catch (err) {
    console.error('[Worker] Failed to load model:', err);
    return false;
  } finally {
    isLoading = false;
  }
}

// ============================================================
// CORE TRANSLATION FUNCTIONS
// ============================================================

async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean; cached: boolean }> {
  const originalText = normalizeUnicode(text.trim());
  
  if (!originalText) {
    return { text, success: false, cached: false };
  }

  // Same language - no translation
  if (isSameLanguage(sourceLanguage, targetLanguage)) {
    return { text: originalText, success: true, cached: false };
  }

  // Check cache
  const cacheKey = `${sourceLanguage}|${targetLanguage}|${originalText}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return { text: normalizeUnicode(cached), success: true, cached: true };
  }

  // Get NLLB codes
  const srcCode = getNLLBCode(sourceLanguage);
  const tgtCode = getNLLBCode(targetLanguage);

  if (srcCode === tgtCode) {
    return { text: originalText, success: true, cached: false };
  }

  try {
    const ready = await initModel();
    if (!ready || !translationPipeline) {
      return { text: originalText, success: false, cached: false };
    }

    // Chunk long text
    const chunks = chunkText(originalText);
    const translatedChunks: string[] = [];
    
    for (const chunk of chunks) {
      const result = await translationPipeline(chunk, {
        src_lang: srcCode,
        tgt_lang: tgtCode,
      });

      const translatedChunk = Array.isArray(result)
        ? result[0]?.translation_text || chunk
        : result?.translation_text || chunk;
      
      translatedChunks.push(normalizeUnicode(translatedChunk));
    }

    const translatedText = normalizeUnicode(translatedChunks.join(' '));

    // Cache result
    if (translationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translatedText);

    return { text: translatedText, success: true, cached: false };
  } catch (err) {
    console.error('[Worker] Translation error:', err);
    return { text: originalText, success: false, cached: false };
  }
}

async function transliterateToNative(
  latinText: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean }> {
  const originalText = latinText.trim();
  
  if (!originalText) {
    return { text: latinText, success: false };
  }

  // Target uses Latin script - no conversion needed
  if (isLatinScriptLanguage(targetLanguage)) {
    return { text: originalText, success: false };
  }

  // Already in native script
  if (!isLatinText(originalText)) {
    return { text: normalizeUnicode(originalText), success: false };
  }

  try {
    // Preprocess with phonetic normalization
    const preprocessed = preprocessLatinInput(originalText);
    
    // Use translation from English to convert to native script
    const result = await translateText(preprocessed, 'english', targetLanguage);
    
    // Verify result is in native script
    const detected = detectLanguageFromText(result.text);
    if (!detected.isLatin && result.text !== preprocessed && detected.confidence > 0.5) {
      return { text: normalizeUnicode(result.text), success: true };
    }
    
    // Fallback: return original with NFC normalization
    return { text: normalizeUnicode(originalText), success: false };
  } catch {
    return { text: normalizeUnicode(latinText), success: false };
  }
}

async function processSenderMessage(
  text: string,
  senderLanguage: string
): Promise<{ senderView: string; wasTransliterated: boolean }> {
  const originalText = normalizeUnicode(text.trim());
  
  if (!originalText) {
    return { senderView: text, wasTransliterated: false };
  }

  // If sender's language uses Latin script, no conversion
  if (isLatinScriptLanguage(senderLanguage)) {
    return { senderView: originalText, wasTransliterated: false };
  }

  // If text is already in native script, no conversion
  if (!isLatinText(originalText)) {
    return { senderView: originalText, wasTransliterated: false };
  }

  // Convert Latin to sender's native script
  const result = await transliterateToNative(originalText, senderLanguage);
  return {
    senderView: result.text,
    wasTransliterated: result.success,
  };
}

async function processReceiverMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{ receiverView: string; wasTranslated: boolean }> {
  const originalText = normalizeUnicode(text.trim());
  
  if (!originalText) {
    return { receiverView: text, wasTranslated: false };
  }

  // Same language - no translation needed
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    // But if receiver's language is non-Latin and text is Latin, convert
    if (!isLatinScriptLanguage(receiverLanguage) && isLatinText(originalText)) {
      const result = await transliterateToNative(originalText, receiverLanguage);
      return { receiverView: result.text, wasTranslated: false };
    }
    return { receiverView: originalText, wasTranslated: false };
  }

  // Detect actual source language from text
  const detected = detectLanguageFromText(originalText);
  const effectiveSource = detected.isLatin 
    ? senderLanguage 
    : (detected.confidence > 0.7 ? detected.language : senderLanguage);

  // Translate to receiver's language
  const result = await translateText(originalText, effectiveSource, receiverLanguage);
  return {
    receiverView: result.text,
    wasTranslated: result.success && result.text !== originalText,
  };
}

async function processChatMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}> {
  const originalText = normalizeUnicode(text.trim());
  
  if (!originalText) {
    return {
      senderView: text,
      receiverView: text,
      originalText: text,
      wasTransliterated: false,
      wasTranslated: false,
    };
  }

  // Step 1: Process for sender (convert Latin to native script)
  const senderResult = await processSenderMessage(originalText, senderLanguage);

  // Step 2: Process for receiver (translate if different language)
  const receiverResult = await processReceiverMessage(
    senderResult.senderView,
    senderLanguage,
    receiverLanguage
  );

  return {
    senderView: senderResult.senderView,
    receiverView: receiverResult.receiverView,
    originalText,
    wasTransliterated: senderResult.wasTransliterated,
    wasTranslated: receiverResult.wasTranslated,
  };
}

/**
 * Batch translate multiple texts
 * Fixes: Multi-user scenario message overlap
 */
async function batchTranslate(
  items: Array<{ id: string; text: string; sourceLanguage: string; targetLanguage: string }>
): Promise<Array<{ id: string; text: string; success: boolean }>> {
  const results: Array<{ id: string; text: string; success: boolean }> = [];
  
  for (const item of items) {
    try {
      const result = await translateText(item.text, item.sourceLanguage, item.targetLanguage);
      results.push({ id: item.id, text: result.text, success: result.success });
    } catch {
      results.push({ id: item.id, text: item.text, success: false });
    }
  }
  
  return results;
}

// ============================================================
// MESSAGE HANDLER (Atomic queue processing)
// ============================================================

async function processMessage(msg: WorkerMessage): Promise<WorkerResponse> {
  const { id, type, payload } = msg;
  
  let response: WorkerResponse = {
    id,
    type,
    success: false,
  };

  try {
    switch (type) {
      case 'init':
        const initSuccess = await initModel();
        response = { id, type, success: initSuccess, result: { ready: initSuccess } };
        break;

      case 'translate':
        const translateResult = await translateText(
          payload.text,
          payload.sourceLanguage,
          payload.targetLanguage
        );
        response = { id, type, success: translateResult.success, result: translateResult };
        break;

      case 'transliterate':
        const translitResult = await transliterateToNative(
          payload.text,
          payload.targetLanguage
        );
        response = { id, type, success: translitResult.success, result: translitResult };
        break;

      case 'process_chat':
        const chatResult = await processChatMessage(
          payload.text,
          payload.senderLanguage,
          payload.receiverLanguage
        );
        response = { id, type, success: true, result: chatResult };
        break;

      case 'detect_language':
        const detected = detectLanguageFromText(payload.text);
        response = { id, type, success: true, result: detected };
        break;

      case 'batch_translate':
        const batchResult = await batchTranslate(payload.items);
        response = { id, type, success: true, result: batchResult };
        break;

      default:
        response = { id, type, success: false, error: `Unknown message type: ${type}` };
    }
  } catch (err) {
    response = {
      id,
      type,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  return response;
}

/**
 * Process queue atomically to prevent race conditions
 */
async function processQueue(): Promise<void> {
  if (processingQueue) return;
  processingQueue = true;
  
  while (pendingQueue.length > 0) {
    const msg = pendingQueue.shift();
    if (msg) {
      const response = await processMessage(msg);
      messageQueue.delete(msg.id);
      self.postMessage(response);
    }
  }
  
  processingQueue = false;
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;
  
  // Add to tracking map
  messageQueue.set(msg.id, msg);
  
  // Add to processing queue
  pendingQueue.push(msg);
  
  // Process queue
  processQueue();
};

// Notify that worker is ready
self.postMessage({ type: 'ready', success: true });

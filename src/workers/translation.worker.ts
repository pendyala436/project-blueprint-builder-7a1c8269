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
// COMPREHENSIVE PHONETIC PREPROCESSING (ICU-style for 300+ languages)
// ============================================================

// Language-specific phonetic mappings
const INDIC_PHONETIC_MAP: Record<string, string> = {
  // Long vowels (doubled)
  'aa': 'ā', 'ee': 'ī', 'ii': 'ī', 'oo': 'ū', 'uu': 'ū',
  'ai': 'ai', 'au': 'au', 'ou': 'ō', 'ei': 'ē', 'ae': 'æ',
  
  // Aspirated consonants
  'kh': 'kʰ', 'gh': 'gʰ', 'ch': 'cʰ', 'jh': 'jʰ',
  'th': 'tʰ', 'dh': 'dʰ', 'ph': 'pʰ', 'bh': 'bʰ',
  
  // Retroflex consonants
  'tt': 'ṭ', 'dd': 'ḍ', 'nn': 'ṇ', 'rr': 'ṛ', 'll': 'ḷ',
  'nd': 'ṇḍ', 'nt': 'ṇṭ',
  
  // Sibilants and nasals
  'sh': 'ś', 'ng': 'ṅ', 'ny': 'ñ', 'gn': 'ñ', 'nh': 'ṇh',
  
  // Special combinations
  'zh': 'ẓ', 'ksh': 'kṣ', 'ks': 'kṣ', 'gya': 'gyā', 'tra': 'trā',
  'chh': 'cch', 'tth': 'ṭṭh', 'ddh': 'ḍḍh',
  
  // Telugu/Kannada specific
  'lh': 'ḷh', 'mh': 'mh',
  
  // Tamil specific  
  'zha': 'ழ', 'nha': 'ன',
  
  // Nasal combinations
  'nk': 'ṅk', 'nc': 'ñc', 'nch': 'ñcʰ', 'nj': 'ñj',
};

const ARABIC_PHONETIC_MAP: Record<string, string> = {
  // Emphatic consonants
  'dh': 'ḍ', 'th': 'ṯ', 'gh': 'ġ', 'kh': 'ḫ',
  'aa': 'ā', 'ee': 'ī', 'oo': 'ū', 'ai': 'ay', 'au': 'aw',
  'sh': 'š', 'zh': 'ž',
  // Hamza
  "'": 'ʾ', "''": 'ʿ',
  // Pharyngeal
  'hh': 'ḥ', 'ss': 'ṣ', 'tt': 'ṭ', 'zz': 'ẓ',
};

const CJK_PHONETIC_MAP: Record<string, string> = {
  // Pinyin tones (for typing without tone marks)
  'ü': 'ü', 'v': 'ü', 'lv': 'lü', 'nv': 'nü',
  // Japanese romaji
  'shi': 'し', 'chi': 'ち', 'tsu': 'つ', 'fu': 'ふ',
  'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
  'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
  // Korean (basic)
  'eo': 'ə', 'eu': 'ɯ',
};

const CYRILLIC_PHONETIC_MAP: Record<string, string> = {
  'sh': 'ш', 'ch': 'ч', 'ts': 'ц', 'zh': 'ж',
  'shch': 'щ', 'ya': 'я', 'yu': 'ю', 'ye': 'е',
  'yo': 'ё', 'kh': 'х',
};

const THAI_PHONETIC_MAP: Record<string, string> = {
  'kh': 'ข', 'ng': 'ง', 'ch': 'ช', 'th': 'ท',
  'ph': 'พ', 'aa': 'า', 'ee': 'ี', 'oo': 'ู',
};

const ETHIOPIC_PHONETIC_MAP: Record<string, string> = {
  'sh': 'ሽ', 'ch': 'ች', 'ts': 'ፅ', 'zh': 'ዥ',
  'ny': 'ኝ', 'ng': 'ንግ',
};

// Combine all phonetic maps with priority
const PHONETIC_PREPROCESSOR: Record<string, string> = {
  ...INDIC_PHONETIC_MAP,
  ...ARABIC_PHONETIC_MAP,
  ...CYRILLIC_PHONETIC_MAP,
  ...ETHIOPIC_PHONETIC_MAP,
};

// Order matters - process longer patterns first
const PHONETIC_PATTERNS = Object.entries(PHONETIC_PREPROCESSOR)
  .sort((a, b) => b[0].length - a[0].length);

// Language-specific pattern sets
const LANGUAGE_PHONETIC_MAPS: Record<string, Record<string, string>> = {
  hindi: INDIC_PHONETIC_MAP,
  marathi: INDIC_PHONETIC_MAP,
  nepali: INDIC_PHONETIC_MAP,
  sanskrit: INDIC_PHONETIC_MAP,
  bengali: INDIC_PHONETIC_MAP,
  gujarati: INDIC_PHONETIC_MAP,
  punjabi: INDIC_PHONETIC_MAP,
  odia: INDIC_PHONETIC_MAP,
  tamil: INDIC_PHONETIC_MAP,
  telugu: INDIC_PHONETIC_MAP,
  kannada: INDIC_PHONETIC_MAP,
  malayalam: INDIC_PHONETIC_MAP,
  sinhala: INDIC_PHONETIC_MAP,
  urdu: ARABIC_PHONETIC_MAP,
  arabic: ARABIC_PHONETIC_MAP,
  persian: ARABIC_PHONETIC_MAP,
  farsi: ARABIC_PHONETIC_MAP,
  pashto: ARABIC_PHONETIC_MAP,
  sindhi: ARABIC_PHONETIC_MAP,
  kashmiri: ARABIC_PHONETIC_MAP,
  chinese: CJK_PHONETIC_MAP,
  japanese: CJK_PHONETIC_MAP,
  korean: CJK_PHONETIC_MAP,
  russian: CYRILLIC_PHONETIC_MAP,
  ukrainian: CYRILLIC_PHONETIC_MAP,
  bulgarian: CYRILLIC_PHONETIC_MAP,
  serbian: CYRILLIC_PHONETIC_MAP,
  macedonian: CYRILLIC_PHONETIC_MAP,
  belarusian: CYRILLIC_PHONETIC_MAP,
  kazakh: CYRILLIC_PHONETIC_MAP,
  kyrgyz: CYRILLIC_PHONETIC_MAP,
  tajik: CYRILLIC_PHONETIC_MAP,
  mongolian: CYRILLIC_PHONETIC_MAP,
  thai: THAI_PHONETIC_MAP,
  amharic: ETHIOPIC_PHONETIC_MAP,
  tigrinya: ETHIOPIC_PHONETIC_MAP,
};

/**
 * Get language-specific phonetic patterns
 */
function getLanguagePhoneticPatterns(language: string): Array<[string, string]> {
  const langLower = language.toLowerCase();
  const specificMap = LANGUAGE_PHONETIC_MAPS[langLower];
  if (specificMap) {
    return Object.entries(specificMap).sort((a, b) => b[0].length - a[0].length);
  }
  return PHONETIC_PATTERNS;
}

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

// Latin script languages (comprehensive for all 300+ languages)
const LATIN_SCRIPT_LANGUAGES = new Set([
  // Major European languages
  'english', 'en', 'eng', 'spanish', 'es', 'spa', 'french', 'fr', 'fra',
  'german', 'de', 'deu', 'italian', 'it', 'ita', 'portuguese', 'pt', 'por',
  'dutch', 'nl', 'nld', 'polish', 'pl', 'pol', 'romanian', 'ro', 'ron',
  'czech', 'cs', 'ces', 'hungarian', 'hu', 'hun', 'swedish', 'sv', 'swe',
  'danish', 'da', 'dan', 'finnish', 'fi', 'fin', 'norwegian', 'no', 'nob',
  'croatian', 'hr', 'hrv', 'slovak', 'sk', 'slk', 'slovenian', 'sl', 'slv',
  'latvian', 'lv', 'lvs', 'lithuanian', 'lt', 'lit', 'estonian', 'et', 'est',
  'bosnian', 'bs', 'bos', 'albanian', 'sq', 'als', 'icelandic', 'is', 'isl',
  'irish', 'ga', 'gle', 'welsh', 'cy', 'cym', 'basque', 'eu', 'eus',
  'catalan', 'ca', 'cat', 'galician', 'gl', 'glg', 'maltese', 'mt', 'mlt',
  'luxembourgish', 'lb', 'ltz', 'faroese', 'fo', 'fao', 'breton', 'br', 'bre',
  'occitan', 'oc', 'oci', 'asturian', 'ast', 'scottish gaelic', 'gd', 'gla',
  // Asian Latin-script languages
  'turkish', 'tr', 'tur', 'vietnamese', 'vi', 'vie', 'indonesian', 'id', 'ind',
  'malay', 'ms', 'zsm', 'tagalog', 'tl', 'tgl', 'filipino', 'fil',
  'javanese', 'jv', 'jav', 'sundanese', 'su', 'sun', 'cebuano', 'ceb',
  'ilocano', 'ilo', 'pangasinan', 'pag', 'waray', 'war',
  'uzbek', 'uz', 'uzn', 'turkmen', 'tk', 'tuk', 'azerbaijani', 'az', 'azj',
  'acehnese', 'ace', 'balinese', 'ban', 'banjar', 'bjn', 'buginese', 'bug',
  'minangkabau', 'min', 'hmong', 'hmn',
  // African Latin-script languages
  'swahili', 'sw', 'swh', 'afrikaans', 'af', 'afr', 'yoruba', 'yo', 'yor',
  'igbo', 'ig', 'ibo', 'hausa', 'ha', 'hau', 'zulu', 'zu', 'zul',
  'xhosa', 'xh', 'xho', 'somali', 'so', 'som', 'shona', 'sn', 'sna',
  'kinyarwanda', 'rw', 'kin', 'rundi', 'rn', 'run', 'lingala', 'ln', 'lin',
  'wolof', 'wo', 'wol', 'bambara', 'bm', 'bam', 'ewe', 'ee',
  'luganda', 'lg', 'lug', 'chichewa', 'ny', 'nya', 'oromo', 'om', 'gaz',
  'tswana', 'tn', 'tsn', 'tsonga', 'ts', 'tso', 'malagasy', 'mg', 'plt',
  'kikuyu', 'ki', 'kik', 'akan', 'ak', 'aka', 'twi', 'tw', 'sango', 'sg', 'sag',
  'fulah', 'ff', 'fuv',
  // Pacific languages
  'maori', 'mi', 'mri', 'samoan', 'sm', 'smo', 'tongan', 'to', 'ton',
  'fijian', 'fj', 'fij', 'hawaiian', 'haw', 'tok pisin', 'tpi',
  // Creole languages
  'haitian creole', 'ht', 'hat', 'papiamento', 'pap',
  // Other Latin-script languages
  'esperanto', 'eo', 'epo', 'latin', 'la', 'lat',
  'guarani', 'gn', 'grn', 'quechua', 'qu', 'quy', 'aymara', 'ay', 'aym',
  'mizo', 'lus',
]);

// ============================================================
// SCRIPT DETECTION (Unicode Ranges) - Comprehensive for 300+ languages
// ============================================================

const scriptPatterns: Array<{ regex: RegExp; script: string; languages: string[] }> = [
  // South Asian Scripts
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', languages: ['hindi', 'marathi', 'nepali', 'sanskrit', 'konkani', 'maithili', 'dogri', 'bodo', 'bhojpuri', 'magahi', 'awadhi', 'chhattisgarhi'] },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', languages: ['bengali', 'assamese', 'manipuri', 'sylheti', 'chittagonian'] },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', languages: ['tamil'] },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', languages: ['telugu'] },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', languages: ['kannada', 'tulu'] },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', languages: ['malayalam'] },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', languages: ['gujarati'] },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', languages: ['punjabi'] },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', languages: ['odia', 'oriya'] },
  { regex: /[\u0D80-\u0DFF]/, script: 'Sinhala', languages: ['sinhala', 'sinhalese'] },
  { regex: /[\u1C50-\u1C7F]/, script: 'Ol_Chiki', languages: ['santali'] },
  { regex: /[\uABC0-\uABFF]/, script: 'Meetei_Mayek', languages: ['meitei', 'manipuri'] },
  { regex: /[\u11100-\u1114F]/, script: 'Chakma', languages: ['chakma'] },
  
  // East Asian Scripts
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF\u20000-\u2A6DF]/, script: 'Han', languages: ['chinese', 'mandarin', 'cantonese'] },
  { regex: /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/, script: 'Japanese', languages: ['japanese'] },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/, script: 'Hangul', languages: ['korean'] },
  
  // Southeast Asian Scripts
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', languages: ['thai'] },
  { regex: /[\u0E80-\u0EFF]/, script: 'Lao', languages: ['lao', 'laotian'] },
  { regex: /[\u1000-\u109F\uAA60-\uAA7F]/, script: 'Myanmar', languages: ['burmese', 'shan', 'mon', 'karen'] },
  { regex: /[\u1780-\u17FF\u19E0-\u19FF]/, script: 'Khmer', languages: ['khmer', 'cambodian'] },
  { regex: /[\u1980-\u19DF]/, script: 'Tai_Le', languages: ['tai_le'] },
  { regex: /[\u1A20-\u1AAF]/, script: 'Tai_Tham', languages: ['lanna', 'tai_lue'] },
  { regex: /[\uA980-\uA9DF]/, script: 'Javanese', languages: ['javanese'] },
  { regex: /[\u1B00-\u1B7F]/, script: 'Balinese', languages: ['balinese'] },
  { regex: /[\u1B80-\u1BBF]/, script: 'Sundanese', languages: ['sundanese'] },
  { regex: /[\u1A00-\u1A1F]/, script: 'Buginese', languages: ['buginese'] },
  
  // Middle Eastern Scripts
  { regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/, script: 'Arabic', languages: ['arabic', 'urdu', 'persian', 'farsi', 'pashto', 'sindhi', 'kashmiri', 'uyghur', 'kurdish'] },
  { regex: /[\u0590-\u05FF\uFB1D-\uFB4F]/, script: 'Hebrew', languages: ['hebrew', 'yiddish'] },
  { regex: /[\u0700-\u074F]/, script: 'Syriac', languages: ['syriac', 'assyrian'] },
  { regex: /[\u0780-\u07BF]/, script: 'Thaana', languages: ['dhivehi', 'maldivian'] },
  
  // European Scripts
  { regex: /[\u0400-\u04FF\u0500-\u052F]/, script: 'Cyrillic', languages: ['russian', 'ukrainian', 'bulgarian', 'serbian', 'macedonian', 'belarusian', 'kazakh', 'kyrgyz', 'tajik', 'mongolian', 'tatar', 'bashkir', 'chuvash', 'chechen'] },
  { regex: /[\u0370-\u03FF\u1F00-\u1FFF]/, script: 'Greek', languages: ['greek'] },
  
  // Caucasian Scripts
  { regex: /[\u10A0-\u10FF\u2D00-\u2D2F]/, script: 'Georgian', languages: ['georgian', 'mingrelian', 'laz'] },
  { regex: /[\u0530-\u058F\uFB13-\uFB17]/, script: 'Armenian', languages: ['armenian'] },
  
  // African Scripts
  { regex: /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/, script: 'Ethiopic', languages: ['amharic', 'tigrinya', 'oromo', 'geez'] },
  { regex: /[\u2D30-\u2D7F]/, script: 'Tifinagh', languages: ['berber', 'tamazight', 'kabyle'] },
  { regex: /[\u07C0-\u07FF]/, script: 'NKo', languages: ['mandinka', 'bambara', 'dyula'] },
  { regex: /[\uA500-\uA63F]/, script: 'Vai', languages: ['vai'] },
  { regex: /[\u1E900-\u1E95F]/, script: 'Adlam', languages: ['fulani', 'fula'] },
  
  // Central Asian Scripts
  { regex: /[\u0F00-\u0FFF]/, script: 'Tibetan', languages: ['tibetan', 'dzongkha'] },
  { regex: /[\u1800-\u18AF]/, script: 'Mongolian', languages: ['mongolian'] },
  
  // Canadian Aboriginal
  { regex: /[\u1400-\u167F]/, script: 'Canadian_Aboriginal', languages: ['cree', 'inuktitut', 'ojibwe'] },
  { regex: /[\u13A0-\u13FF]/, script: 'Cherokee', languages: ['cherokee'] },
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
 * Preprocess Latin input with language-specific phonetic normalization
 * Fixes: Missing diacritics, ambiguous Latin input, language-specific patterns
 */
function preprocessLatinInput(text: string, targetLanguage?: string): string {
  // Normalize case first (preserve original for some languages)
  let result = text.trim();
  const lowerResult = result.toLowerCase();
  
  // Get language-specific patterns
  const patterns = targetLanguage 
    ? getLanguagePhoneticPatterns(targetLanguage)
    : PHONETIC_PATTERNS;
  
  // Apply phonetic patterns (longer patterns first)
  let processed = lowerResult;
  for (const [pattern, replacement] of patterns) {
    processed = processed.split(pattern).join(replacement);
  }
  
  // Fix common typos
  // Normalize repeated characters (typo correction: aaaa → aa, not aaa → aa → a)
  processed = processed.replace(/(.)\1{2,}/g, '$1$1');
  
  // Handle common Latin ambiguities for specific scripts
  if (targetLanguage) {
    const langLower = targetLanguage.toLowerCase();
    
    // For Indic languages: handle schwa deletion ambiguity
    if (['hindi', 'marathi', 'nepali', 'sanskrit', 'bengali', 'gujarati', 'punjabi'].includes(langLower)) {
      // Add implicit 'a' vowel handling hints (schwa)
      processed = processed.replace(/([kgcjṭḍtdpb])([kgcjṭḍtdpbmnlrsśṣhy])/g, '$1a$2');
    }
    
    // For Arabic script: handle sun/moon letter assimilation
    if (['arabic', 'urdu', 'persian', 'farsi', 'pashto'].includes(langLower)) {
      processed = processed.replace(/al([tdszšṣnlr])/g, 'a$1$1');
    }
  }
  
  return processed;
}

/**
 * Normalize and fix common input issues
 */
function normalizeInput(text: string): string {
  let result = text.trim();
  
  // Unicode NFC normalization
  result = normalizeUnicode(result);
  
  // Fix zero-width characters that can cause display issues
  result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Normalize multiple spaces
  result = result.replace(/\s+/g, ' ');
  
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

// ============================================================
// PHONETIC TRANSLITERATION MAPS (Sound-based, not meaning-based)
// ============================================================

// Telugu phonetic map (Latin sounds → Telugu script)
const TELUGU_TRANSLITERATION: Record<string, string> = {
  // Vowels
  'a': 'అ', 'aa': 'ఆ', 'i': 'ఇ', 'ii': 'ఈ', 'ee': 'ఈ', 
  'u': 'ఉ', 'uu': 'ఊ', 'oo': 'ఊ', 'e': 'ఎ', 'ai': 'ఐ',
  'o': 'ఒ', 'au': 'ఔ', 'ou': 'ఔ',
  // Consonants with inherent 'a'
  'ka': 'క', 'kha': 'ఖ', 'ga': 'గ', 'gha': 'ఘ', 'nga': 'ఙ',
  'cha': 'చ', 'chha': 'ఛ', 'ja': 'జ', 'jha': 'ఝ', 'nya': 'ఞ',
  'ta': 'ట', 'tha': 'ఠ', 'da': 'డ', 'dha': 'ఢ', 'na': 'న',
  'tta': 'త', 'ttha': 'థ', 'dda': 'ద', 'ddha': 'ధ', 'nna': 'ణ',
  'pa': 'ప', 'pha': 'ఫ', 'ba': 'బ', 'bha': 'భ', 'ma': 'మ',
  'ya': 'య', 'ra': 'ర', 'la': 'ల', 'va': 'వ', 'wa': 'వ',
  'sha': 'శ', 'ssa': 'ష', 'sa': 'స', 'ha': 'హ', 'lla': 'ళ',
  // Common combinations (consonant + vowel)
  'he': 'హె', 'ho': 'హో', 'hu': 'హు',
  'ki': 'కి', 'ke': 'కె', 'ko': 'కో', 'ku': 'కు',
  'gi': 'గి', 'ge': 'గె', 'go': 'గో', 'gu': 'గు',
  'ji': 'జి', 'je': 'జె', 'jo': 'జో', 'ju': 'జు',
  'ti': 'టి', 'te': 'టె', 'to': 'టో', 'tu': 'టు',
  'di': 'డి', 'de': 'డె', 'do': 'డో', 'du': 'డు',
  'ni': 'ని', 'ne': 'నె', 'no': 'నో', 'nu': 'ను',
  'pi': 'పి', 'pe': 'పె', 'po': 'పో', 'pu': 'పు',
  'bi': 'బి', 'be': 'బె', 'bo': 'బో', 'bu': 'బు',
  'mi': 'మి', 'me': 'మె', 'mo': 'మో', 'mu': 'ము',
  'yi': 'యి', 'ye': 'యె', 'yo': 'యో', 'yu': 'యు',
  'ri': 'రి', 're': 'రె', 'ro': 'రో', 'ru': 'రు',
  'li': 'లి', 'le': 'లె', 'lo': 'లో', 'lu': 'లు',
  'vi': 'వి', 've': 'వె', 'vo': 'వో', 'vu': 'వు',
  'si': 'సి', 'se': 'సె', 'so': 'సో', 'su': 'సు',
  // Single consonants (end of word)
  'k': 'క్', 'g': 'గ్', 'j': 'జ్', 't': 'ట్', 'd': 'డ్',
  'n': 'న్', 'p': 'ప్', 'b': 'బ్', 'm': 'మ్', 'y': 'య్',
  'r': 'ర్', 'l': 'ల్', 'v': 'వ్', 's': 'స్', 'h': 'హ్',
  // Common words (priority - checked first via exact match)
  'hello': 'హలో', 'hi': 'హాయ్', 'bye': 'బై', 'ok': 'ఓకే', 'yes': 'యెస్',
  'thanks': 'థాంక్స్', 'please': 'ప్లీజ్', 'sorry': 'సారీ',
};

// Hindi phonetic map (Latin sounds → Devanagari script)
const HINDI_TRANSLITERATION: Record<string, string> = {
  // Vowels
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'ee': 'ई',
  'u': 'उ', 'uu': 'ऊ', 'oo': 'ऊ', 'e': 'ए', 'ai': 'ऐ',
  'o': 'ओ', 'au': 'औ', 'ou': 'औ',
  // Consonants with inherent 'a'
  'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ', 'nga': 'ङ',
  'cha': 'च', 'chha': 'छ', 'ja': 'ज', 'jha': 'झ', 'nya': 'ञ',
  'ta': 'ट', 'tha': 'ठ', 'da': 'ड', 'dha': 'ढ', 'na': 'न',
  'tta': 'त', 'ttha': 'थ', 'dda': 'द', 'ddha': 'ध', 'nna': 'ण',
  'pa': 'प', 'pha': 'फ', 'ba': 'ब', 'bha': 'भ', 'ma': 'म',
  'ya': 'य', 'ra': 'र', 'la': 'ल', 'va': 'व', 'wa': 'व',
  'sha': 'श', 'ssa': 'ष', 'sa': 'स', 'ha': 'ह',
  // Common combinations (consonant + vowel)
  'he': 'हे', 'ho': 'हो', 'hu': 'हु',
  'ki': 'कि', 'ke': 'के', 'ko': 'को', 'ku': 'कु',
  'gi': 'गि', 'ge': 'गे', 'go': 'गो', 'gu': 'गु',
  'ji': 'जि', 'je': 'जे', 'jo': 'जो', 'ju': 'जु',
  'ni': 'नि', 'ne': 'ने', 'no': 'नो', 'nu': 'नु',
  'mi': 'मि', 'me': 'मे', 'mo': 'मो', 'mu': 'मु',
  // Single consonants
  'k': 'क्', 'g': 'ग्', 'j': 'ज्', 't': 'ट्', 'd': 'ड्',
  'n': 'न्', 'p': 'प्', 'b': 'ब्', 'm': 'म्', 'y': 'य्',
  'r': 'र्', 'l': 'ल्', 'v': 'व्', 's': 'स्', 'h': 'ह्',
  // Common words (priority - checked first via exact match)
  'hello': 'हेलो', 'hi': 'हाय', 'bye': 'बाय', 'ok': 'ओके', 'yes': 'येस',
  'thanks': 'थैंक्स', 'please': 'प्लीज', 'sorry': 'सॉरी',
};

// Tamil phonetic map
const TAMIL_TRANSLITERATION: Record<string, string> = {
  'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'ee': 'ஈ',
  'u': 'உ', 'uu': 'ஊ', 'oo': 'ஊ', 'e': 'எ', 'ai': 'ஐ',
  'o': 'ஒ', 'au': 'ஔ',
  'ka': 'க', 'ga': 'க', 'cha': 'ச', 'ja': 'ஜ',
  'ta': 'ட', 'da': 'ட', 'na': 'ந', 'pa': 'ப', 'ba': 'ப',
  'ma': 'ம', 'ya': 'ய', 'ra': 'ர', 'la': 'ல', 'va': 'வ',
  'sha': 'ஷ', 'sa': 'ச', 'ha': 'ஹ',
  'he': 'ஹெ', 'ho': 'ஹோ',
  // Common words
  'hello': 'ஹலோ', 'hi': 'ஹாய்', 'bye': 'பை', 'ok': 'ஓகே',
};

// Kannada phonetic map
const KANNADA_TRANSLITERATION: Record<string, string> = {
  'a': 'ಅ', 'aa': 'ಆ', 'i': 'ಇ', 'ii': 'ಈ', 'ee': 'ಈ',
  'u': 'ಉ', 'uu': 'ಊ', 'oo': 'ಊ', 'e': 'ಎ', 'ai': 'ಐ',
  'o': 'ಒ', 'au': 'ಔ',
  'ka': 'ಕ', 'kha': 'ಖ', 'ga': 'ಗ', 'gha': 'ಘ',
  'cha': 'ಚ', 'ja': 'ಜ', 'ta': 'ಟ', 'da': 'ಡ', 'na': 'ನ',
  'pa': 'ಪ', 'pha': 'ಫ', 'ba': 'ಬ', 'bha': 'ಭ', 'ma': 'ಮ',
  'ya': 'ಯ', 'ra': 'ರ', 'la': 'ಲ', 'va': 'ವ',
  'sha': 'ಶ', 'sa': 'ಸ', 'ha': 'ಹ',
  'he': 'ಹೆ', 'ho': 'ಹೋ',
  // Common words
  'hello': 'ಹಲೋ', 'hi': 'ಹಾಯ್', 'bye': 'ಬೈ', 'ok': 'ಓಕೆ',
};

// Malayalam phonetic map
const MALAYALAM_TRANSLITERATION: Record<string, string> = {
  'a': 'അ', 'aa': 'ആ', 'i': 'ഇ', 'ii': 'ഈ', 'ee': 'ഈ',
  'u': 'ഉ', 'uu': 'ഊ', 'oo': 'ഊ', 'e': 'എ', 'ai': 'ഐ',
  'o': 'ഒ', 'au': 'ഔ',
  'ka': 'ക', 'kha': 'ഖ', 'ga': 'ഗ', 'gha': 'ഘ',
  'cha': 'ച', 'ja': 'ജ', 'ta': 'ട', 'da': 'ഡ', 'na': 'ന',
  'pa': 'പ', 'pha': 'ഫ', 'ba': 'ബ', 'bha': 'ഭ', 'ma': 'മ',
  'ya': 'യ', 'ra': 'ര', 'la': 'ല', 'va': 'വ',
  'sha': 'ശ', 'sa': 'സ', 'ha': 'ഹ',
  'he': 'ഹെ', 'ho': 'ഹോ',
  // Common words
  'hello': 'ഹലോ', 'hi': 'ഹായ്', 'bye': 'ബൈ', 'ok': 'ഓകെ',
};

// Bengali phonetic map
const BENGALI_TRANSLITERATION: Record<string, string> = {
  'a': 'অ', 'aa': 'আ', 'i': 'ই', 'ii': 'ঈ', 'ee': 'ঈ',
  'u': 'উ', 'uu': 'ঊ', 'oo': 'ঊ', 'e': 'এ', 'ai': 'ঐ',
  'o': 'ও', 'au': 'ঔ',
  'ka': 'ক', 'kha': 'খ', 'ga': 'গ', 'gha': 'ঘ',
  'cha': 'চ', 'ja': 'জ', 'ta': 'ট', 'da': 'ড', 'na': 'ন',
  'pa': 'প', 'pha': 'ফ', 'ba': 'ব', 'bha': 'ভ', 'ma': 'ম',
  'ya': 'য', 'ra': 'র', 'la': 'ল', 'va': 'ভ',
  'sha': 'শ', 'sa': 'স', 'ha': 'হ',
  'he': 'হে', 'ho': 'হো',
  // Common words
  'hello': 'হ্যালো', 'hi': 'হাই', 'bye': 'বাই', 'ok': 'ওকে',
};

// Gujarati phonetic map
const GUJARATI_TRANSLITERATION: Record<string, string> = {
  'a': 'અ', 'aa': 'આ', 'i': 'ઇ', 'ii': 'ઈ', 'ee': 'ઈ',
  'u': 'ઉ', 'uu': 'ઊ', 'oo': 'ઊ', 'e': 'એ', 'ai': 'ઐ',
  'o': 'ઓ', 'au': 'ઔ',
  'ka': 'ક', 'kha': 'ખ', 'ga': 'ગ', 'gha': 'ઘ',
  'cha': 'ચ', 'ja': 'જ', 'ta': 'ટ', 'da': 'ડ', 'na': 'ન',
  'pa': 'પ', 'pha': 'ફ', 'ba': 'બ', 'bha': 'ભ', 'ma': 'મ',
  'ya': 'ય', 'ra': 'ર', 'la': 'લ', 'va': 'વ',
  'sha': 'શ', 'sa': 'સ', 'ha': 'હ',
  'he': 'હે', 'ho': 'હો',
  // Common words
  'hello': 'હેલો', 'hi': 'હાય', 'bye': 'બાય', 'ok': 'ઓકે',
};

// Marathi uses Devanagari, same as Hindi
const MARATHI_TRANSLITERATION = HINDI_TRANSLITERATION;

// Language to transliteration map lookup
const TRANSLITERATION_MAPS: Record<string, Record<string, string>> = {
  telugu: TELUGU_TRANSLITERATION,
  te: TELUGU_TRANSLITERATION,
  hindi: HINDI_TRANSLITERATION,
  hi: HINDI_TRANSLITERATION,
  marathi: MARATHI_TRANSLITERATION,
  mr: MARATHI_TRANSLITERATION,
  tamil: TAMIL_TRANSLITERATION,
  ta: TAMIL_TRANSLITERATION,
  kannada: KANNADA_TRANSLITERATION,
  kn: KANNADA_TRANSLITERATION,
  malayalam: MALAYALAM_TRANSLITERATION,
  ml: MALAYALAM_TRANSLITERATION,
  bengali: BENGALI_TRANSLITERATION,
  bn: BENGALI_TRANSLITERATION,
  gujarati: GUJARATI_TRANSLITERATION,
  gu: GUJARATI_TRANSLITERATION,
};

/**
 * Apply phonetic transliteration (sound-based, not meaning-based)
 */
function applyPhoneticTransliteration(text: string, targetLanguage: string): string | null {
  const langLower = targetLanguage.toLowerCase();
  const map = TRANSLITERATION_MAPS[langLower];
  
  if (!map) return null;
  
  const lowerText = text.toLowerCase().trim();
  
  // First try exact word match
  if (map[lowerText]) {
    return map[lowerText];
  }
  
  // Build result by matching patterns (longest first)
  const patterns = Object.keys(map).sort((a, b) => b.length - a.length);
  let result = '';
  let i = 0;
  
  while (i < lowerText.length) {
    let matched = false;
    
    // Try to match longest pattern first
    for (const pattern of patterns) {
      if (lowerText.substring(i, i + pattern.length) === pattern) {
        result += map[pattern];
        i += pattern.length;
        matched = true;
        break;
      }
    }
    
    // If no pattern matched, keep original character
    if (!matched) {
      // Check for single char
      const char = lowerText[i];
      if (map[char]) {
        result += map[char];
      } else {
        result += lowerText[i];
      }
      i++;
    }
  }
  
  return result !== lowerText ? result : null;
}

async function transliterateToNative(
  latinText: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean }> {
  const originalText = normalizeInput(latinText);
  
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
    // FIRST: Try phonetic transliteration (sound-based, instant)
    const phoneticResult = applyPhoneticTransliteration(originalText, targetLanguage);
    if (phoneticResult) {
      console.log('[Worker] Phonetic transliteration:', originalText, '→', phoneticResult);
      return { text: normalizeUnicode(phoneticResult), success: true };
    }
    
    // FALLBACK: Use translation model for longer/complex text
    const preprocessed = preprocessLatinInput(originalText, targetLanguage);
    
    // Use translation from English to convert to native script
    const result = await translateText(preprocessed, 'english', targetLanguage);
    
    // Verify result is in native script
    const detected = detectLanguageFromText(result.text);
    if (!detected.isLatin && result.text !== preprocessed && detected.confidence > 0.5) {
      return { text: normalizeUnicode(result.text), success: true };
    }
    
    // Try with original text as well (in case preprocessing was too aggressive)
    if (preprocessed !== originalText.toLowerCase()) {
      const fallbackResult = await translateText(originalText.toLowerCase(), 'english', targetLanguage);
      const fallbackDetected = detectLanguageFromText(fallbackResult.text);
      if (!fallbackDetected.isLatin && fallbackResult.text !== originalText.toLowerCase() && fallbackDetected.confidence > 0.5) {
        return { text: normalizeUnicode(fallbackResult.text), success: true };
      }
    }
    
    // Fallback: return original with NFC normalization
    return { text: normalizeUnicode(originalText), success: false };
  } catch (err) {
    console.error('[Worker] Transliteration error:', err);
    return { text: normalizeUnicode(latinText), success: false };
  }
}

async function processSenderMessage(
  text: string,
  senderLanguage: string
): Promise<{ senderView: string; wasTransliterated: boolean }> {
  const originalText = normalizeInput(text);
  
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
  const originalText = normalizeInput(text);
  
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

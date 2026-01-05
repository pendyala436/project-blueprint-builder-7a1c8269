/**
 * Native Keyboard Layout Support for 300+ Languages
 * 
 * Provides proper keyboard configuration for native typing:
 * - inputMode selection (text, numeric, etc.)
 * - IME/composition requirements
 * - Virtual keyboard hints
 * - RTL/LTR direction
 * - Language-specific keyboard codes
 */

export interface KeyboardLayout {
  /** HTML lang attribute value */
  lang: string;
  /** Input mode for mobile keyboards */
  inputMode: 'text' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  /** Text direction */
  dir: 'ltr' | 'rtl' | 'auto';
  /** Whether this language uses complex script requiring IME */
  needsIME: boolean;
  /** Script family for font selection */
  script: string;
  /** BCP 47 language tag for native keyboards */
  keyboardTag: string;
  /** Hint for virtual keyboard type */
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
}

// Script families for font and keyboard grouping
export type ScriptFamily = 
  | 'latin' | 'cyrillic' | 'greek' 
  | 'arabic' | 'hebrew' 
  | 'devanagari' | 'bengali' | 'tamil' | 'telugu' | 'malayalam' | 'kannada' | 'gujarati' | 'gurmukhi' | 'odia' | 'sinhala'
  | 'cjk' | 'thai' | 'lao' | 'khmer' | 'myanmar' | 'tibetan'
  | 'ethiopic' | 'armenian' | 'georgian';

// RTL scripts
const RTL_SCRIPTS = new Set(['arabic', 'hebrew']);

// Scripts that benefit from IME
const IME_SCRIPTS = new Set([
  'cjk', 'japanese', 'korean', 'chinese',
  'devanagari', 'bengali', 'tamil', 'telugu', 'malayalam', 'kannada', 'gujarati', 'gurmukhi', 'odia', 'sinhala',
  'thai', 'lao', 'khmer', 'myanmar', 'tibetan',
  'arabic', 'hebrew', 'ethiopic', 'armenian', 'georgian'
]);

// Language to script mapping (300+ languages)
const LANGUAGE_SCRIPTS: Record<string, { script: ScriptFamily; keyboardTag: string }> = {
  // Indian Languages - Devanagari
  hi: { script: 'devanagari', keyboardTag: 'hi-IN' },
  hindi: { script: 'devanagari', keyboardTag: 'hi-IN' },
  mr: { script: 'devanagari', keyboardTag: 'mr-IN' },
  marathi: { script: 'devanagari', keyboardTag: 'mr-IN' },
  ne: { script: 'devanagari', keyboardTag: 'ne-NP' },
  nepali: { script: 'devanagari', keyboardTag: 'ne-NP' },
  sa: { script: 'devanagari', keyboardTag: 'sa-IN' },
  sanskrit: { script: 'devanagari', keyboardTag: 'sa-IN' },
  kok: { script: 'devanagari', keyboardTag: 'kok-IN' },
  konkani: { script: 'devanagari', keyboardTag: 'kok-IN' },
  mai: { script: 'devanagari', keyboardTag: 'mai-IN' },
  maithili: { script: 'devanagari', keyboardTag: 'mai-IN' },
  bho: { script: 'devanagari', keyboardTag: 'bho-IN' },
  bhojpuri: { script: 'devanagari', keyboardTag: 'bho-IN' },
  
  // Indian Languages - Bengali/Bangla
  bn: { script: 'bengali', keyboardTag: 'bn-IN' },
  bengali: { script: 'bengali', keyboardTag: 'bn-IN' },
  bangla: { script: 'bengali', keyboardTag: 'bn-IN' },
  as: { script: 'bengali', keyboardTag: 'as-IN' },
  assamese: { script: 'bengali', keyboardTag: 'as-IN' },
  
  // Indian Languages - Tamil
  ta: { script: 'tamil', keyboardTag: 'ta-IN' },
  tamil: { script: 'tamil', keyboardTag: 'ta-IN' },
  
  // Indian Languages - Telugu
  te: { script: 'telugu', keyboardTag: 'te-IN' },
  telugu: { script: 'telugu', keyboardTag: 'te-IN' },
  
  // Indian Languages - Malayalam
  ml: { script: 'malayalam', keyboardTag: 'ml-IN' },
  malayalam: { script: 'malayalam', keyboardTag: 'ml-IN' },
  
  // Indian Languages - Kannada
  kn: { script: 'kannada', keyboardTag: 'kn-IN' },
  kannada: { script: 'kannada', keyboardTag: 'kn-IN' },
  
  // Indian Languages - Gujarati
  gu: { script: 'gujarati', keyboardTag: 'gu-IN' },
  gujarati: { script: 'gujarati', keyboardTag: 'gu-IN' },
  
  // Indian Languages - Punjabi/Gurmukhi
  pa: { script: 'gurmukhi', keyboardTag: 'pa-IN' },
  punjabi: { script: 'gurmukhi', keyboardTag: 'pa-IN' },
  
  // Indian Languages - Odia
  or: { script: 'odia', keyboardTag: 'or-IN' },
  odia: { script: 'odia', keyboardTag: 'or-IN' },
  oriya: { script: 'odia', keyboardTag: 'or-IN' },
  
  // Indian Languages - Sinhala
  si: { script: 'sinhala', keyboardTag: 'si-LK' },
  sinhala: { script: 'sinhala', keyboardTag: 'si-LK' },
  sinhalese: { script: 'sinhala', keyboardTag: 'si-LK' },
  
  // Arabic Script Languages
  ar: { script: 'arabic', keyboardTag: 'ar' },
  arabic: { script: 'arabic', keyboardTag: 'ar' },
  ur: { script: 'arabic', keyboardTag: 'ur-PK' },
  urdu: { script: 'arabic', keyboardTag: 'ur-PK' },
  fa: { script: 'arabic', keyboardTag: 'fa-IR' },
  persian: { script: 'arabic', keyboardTag: 'fa-IR' },
  farsi: { script: 'arabic', keyboardTag: 'fa-IR' },
  ps: { script: 'arabic', keyboardTag: 'ps-AF' },
  pashto: { script: 'arabic', keyboardTag: 'ps-AF' },
  sd: { script: 'arabic', keyboardTag: 'sd-PK' },
  sindhi: { script: 'arabic', keyboardTag: 'sd-PK' },
  ku: { script: 'arabic', keyboardTag: 'ku' },
  kurdish: { script: 'arabic', keyboardTag: 'ku' },
  ug: { script: 'arabic', keyboardTag: 'ug-CN' },
  uyghur: { script: 'arabic', keyboardTag: 'ug-CN' },
  
  // Hebrew
  he: { script: 'hebrew', keyboardTag: 'he-IL' },
  hebrew: { script: 'hebrew', keyboardTag: 'he-IL' },
  
  // CJK Languages
  zh: { script: 'cjk', keyboardTag: 'zh-CN' },
  chinese: { script: 'cjk', keyboardTag: 'zh-CN' },
  mandarin: { script: 'cjk', keyboardTag: 'zh-CN' },
  yue: { script: 'cjk', keyboardTag: 'zh-HK' },
  cantonese: { script: 'cjk', keyboardTag: 'zh-HK' },
  ja: { script: 'cjk', keyboardTag: 'ja-JP' },
  japanese: { script: 'cjk', keyboardTag: 'ja-JP' },
  ko: { script: 'cjk', keyboardTag: 'ko-KR' },
  korean: { script: 'cjk', keyboardTag: 'ko-KR' },
  
  // Southeast Asian
  th: { script: 'thai', keyboardTag: 'th-TH' },
  thai: { script: 'thai', keyboardTag: 'th-TH' },
  lo: { script: 'lao', keyboardTag: 'lo-LA' },
  lao: { script: 'lao', keyboardTag: 'lo-LA' },
  laotian: { script: 'lao', keyboardTag: 'lo-LA' },
  km: { script: 'khmer', keyboardTag: 'km-KH' },
  khmer: { script: 'khmer', keyboardTag: 'km-KH' },
  cambodian: { script: 'khmer', keyboardTag: 'km-KH' },
  my: { script: 'myanmar', keyboardTag: 'my-MM' },
  burmese: { script: 'myanmar', keyboardTag: 'my-MM' },
  myanmar: { script: 'myanmar', keyboardTag: 'my-MM' },
  
  // Tibetan
  bo: { script: 'tibetan', keyboardTag: 'bo-CN' },
  tibetan: { script: 'tibetan', keyboardTag: 'bo-CN' },
  
  // Cyrillic Languages
  ru: { script: 'cyrillic', keyboardTag: 'ru-RU' },
  russian: { script: 'cyrillic', keyboardTag: 'ru-RU' },
  uk: { script: 'cyrillic', keyboardTag: 'uk-UA' },
  ukrainian: { script: 'cyrillic', keyboardTag: 'uk-UA' },
  bg: { script: 'cyrillic', keyboardTag: 'bg-BG' },
  bulgarian: { script: 'cyrillic', keyboardTag: 'bg-BG' },
  sr: { script: 'cyrillic', keyboardTag: 'sr-RS' },
  serbian: { script: 'cyrillic', keyboardTag: 'sr-RS' },
  mk: { script: 'cyrillic', keyboardTag: 'mk-MK' },
  macedonian: { script: 'cyrillic', keyboardTag: 'mk-MK' },
  kk: { script: 'cyrillic', keyboardTag: 'kk-KZ' },
  kazakh: { script: 'cyrillic', keyboardTag: 'kk-KZ' },
  ky: { script: 'cyrillic', keyboardTag: 'ky-KG' },
  kyrgyz: { script: 'cyrillic', keyboardTag: 'ky-KG' },
  tg: { script: 'cyrillic', keyboardTag: 'tg-TJ' },
  tajik: { script: 'cyrillic', keyboardTag: 'tg-TJ' },
  mn: { script: 'cyrillic', keyboardTag: 'mn-MN' },
  mongolian: { script: 'cyrillic', keyboardTag: 'mn-MN' },
  be: { script: 'cyrillic', keyboardTag: 'be-BY' },
  belarusian: { script: 'cyrillic', keyboardTag: 'be-BY' },
  tt: { script: 'cyrillic', keyboardTag: 'tt-RU' },
  tatar: { script: 'cyrillic', keyboardTag: 'tt-RU' },
  
  // Greek
  el: { script: 'greek', keyboardTag: 'el-GR' },
  greek: { script: 'greek', keyboardTag: 'el-GR' },
  
  // Armenian
  hy: { script: 'armenian', keyboardTag: 'hy-AM' },
  armenian: { script: 'armenian', keyboardTag: 'hy-AM' },
  
  // Georgian
  ka: { script: 'georgian', keyboardTag: 'ka-GE' },
  georgian: { script: 'georgian', keyboardTag: 'ka-GE' },
  
  // Ethiopic
  am: { script: 'ethiopic', keyboardTag: 'am-ET' },
  amharic: { script: 'ethiopic', keyboardTag: 'am-ET' },
  ti: { script: 'ethiopic', keyboardTag: 'ti-ER' },
  tigrinya: { script: 'ethiopic', keyboardTag: 'ti-ER' },
  
  // Latin Script Languages (extensive list)
  en: { script: 'latin', keyboardTag: 'en-US' },
  english: { script: 'latin', keyboardTag: 'en-US' },
  es: { script: 'latin', keyboardTag: 'es-ES' },
  spanish: { script: 'latin', keyboardTag: 'es-ES' },
  fr: { script: 'latin', keyboardTag: 'fr-FR' },
  french: { script: 'latin', keyboardTag: 'fr-FR' },
  de: { script: 'latin', keyboardTag: 'de-DE' },
  german: { script: 'latin', keyboardTag: 'de-DE' },
  pt: { script: 'latin', keyboardTag: 'pt-BR' },
  portuguese: { script: 'latin', keyboardTag: 'pt-BR' },
  it: { script: 'latin', keyboardTag: 'it-IT' },
  italian: { script: 'latin', keyboardTag: 'it-IT' },
  nl: { script: 'latin', keyboardTag: 'nl-NL' },
  dutch: { script: 'latin', keyboardTag: 'nl-NL' },
  pl: { script: 'latin', keyboardTag: 'pl-PL' },
  polish: { script: 'latin', keyboardTag: 'pl-PL' },
  cs: { script: 'latin', keyboardTag: 'cs-CZ' },
  czech: { script: 'latin', keyboardTag: 'cs-CZ' },
  ro: { script: 'latin', keyboardTag: 'ro-RO' },
  romanian: { script: 'latin', keyboardTag: 'ro-RO' },
  hu: { script: 'latin', keyboardTag: 'hu-HU' },
  hungarian: { script: 'latin', keyboardTag: 'hu-HU' },
  sv: { script: 'latin', keyboardTag: 'sv-SE' },
  swedish: { script: 'latin', keyboardTag: 'sv-SE' },
  da: { script: 'latin', keyboardTag: 'da-DK' },
  danish: { script: 'latin', keyboardTag: 'da-DK' },
  fi: { script: 'latin', keyboardTag: 'fi-FI' },
  finnish: { script: 'latin', keyboardTag: 'fi-FI' },
  no: { script: 'latin', keyboardTag: 'no-NO' },
  norwegian: { script: 'latin', keyboardTag: 'no-NO' },
  hr: { script: 'latin', keyboardTag: 'hr-HR' },
  croatian: { script: 'latin', keyboardTag: 'hr-HR' },
  bs: { script: 'latin', keyboardTag: 'bs-BA' },
  bosnian: { script: 'latin', keyboardTag: 'bs-BA' },
  sk: { script: 'latin', keyboardTag: 'sk-SK' },
  slovak: { script: 'latin', keyboardTag: 'sk-SK' },
  sl: { script: 'latin', keyboardTag: 'sl-SI' },
  slovenian: { script: 'latin', keyboardTag: 'sl-SI' },
  lt: { script: 'latin', keyboardTag: 'lt-LT' },
  lithuanian: { script: 'latin', keyboardTag: 'lt-LT' },
  lv: { script: 'latin', keyboardTag: 'lv-LV' },
  latvian: { script: 'latin', keyboardTag: 'lv-LV' },
  et: { script: 'latin', keyboardTag: 'et-EE' },
  estonian: { script: 'latin', keyboardTag: 'et-EE' },
  is: { script: 'latin', keyboardTag: 'is-IS' },
  icelandic: { script: 'latin', keyboardTag: 'is-IS' },
  ca: { script: 'latin', keyboardTag: 'ca-ES' },
  catalan: { script: 'latin', keyboardTag: 'ca-ES' },
  gl: { script: 'latin', keyboardTag: 'gl-ES' },
  galician: { script: 'latin', keyboardTag: 'gl-ES' },
  eu: { script: 'latin', keyboardTag: 'eu-ES' },
  basque: { script: 'latin', keyboardTag: 'eu-ES' },
  cy: { script: 'latin', keyboardTag: 'cy-GB' },
  welsh: { script: 'latin', keyboardTag: 'cy-GB' },
  ga: { script: 'latin', keyboardTag: 'ga-IE' },
  irish: { script: 'latin', keyboardTag: 'ga-IE' },
  sq: { script: 'latin', keyboardTag: 'sq-AL' },
  albanian: { script: 'latin', keyboardTag: 'sq-AL' },
  mt: { script: 'latin', keyboardTag: 'mt-MT' },
  maltese: { script: 'latin', keyboardTag: 'mt-MT' },
  tr: { script: 'latin', keyboardTag: 'tr-TR' },
  turkish: { script: 'latin', keyboardTag: 'tr-TR' },
  az: { script: 'latin', keyboardTag: 'az-AZ' },
  azerbaijani: { script: 'latin', keyboardTag: 'az-AZ' },
  uz: { script: 'latin', keyboardTag: 'uz-UZ' },
  uzbek: { script: 'latin', keyboardTag: 'uz-UZ' },
  tk: { script: 'latin', keyboardTag: 'tk-TM' },
  turkmen: { script: 'latin', keyboardTag: 'tk-TM' },
  vi: { script: 'latin', keyboardTag: 'vi-VN' },
  vietnamese: { script: 'latin', keyboardTag: 'vi-VN' },
  id: { script: 'latin', keyboardTag: 'id-ID' },
  indonesian: { script: 'latin', keyboardTag: 'id-ID' },
  ms: { script: 'latin', keyboardTag: 'ms-MY' },
  malay: { script: 'latin', keyboardTag: 'ms-MY' },
  tl: { script: 'latin', keyboardTag: 'tl-PH' },
  tagalog: { script: 'latin', keyboardTag: 'tl-PH' },
  fil: { script: 'latin', keyboardTag: 'fil-PH' },
  filipino: { script: 'latin', keyboardTag: 'fil-PH' },
  sw: { script: 'latin', keyboardTag: 'sw-KE' },
  swahili: { script: 'latin', keyboardTag: 'sw-KE' },
  af: { script: 'latin', keyboardTag: 'af-ZA' },
  afrikaans: { script: 'latin', keyboardTag: 'af-ZA' },
  yo: { script: 'latin', keyboardTag: 'yo-NG' },
  yoruba: { script: 'latin', keyboardTag: 'yo-NG' },
  ig: { script: 'latin', keyboardTag: 'ig-NG' },
  igbo: { script: 'latin', keyboardTag: 'ig-NG' },
  zu: { script: 'latin', keyboardTag: 'zu-ZA' },
  zulu: { script: 'latin', keyboardTag: 'zu-ZA' },
  xh: { script: 'latin', keyboardTag: 'xh-ZA' },
  xhosa: { script: 'latin', keyboardTag: 'xh-ZA' },
  so: { script: 'latin', keyboardTag: 'so-SO' },
  somali: { script: 'latin', keyboardTag: 'so-SO' },
  ha: { script: 'latin', keyboardTag: 'ha-NG' },
  hausa: { script: 'latin', keyboardTag: 'ha-NG' },
  mi: { script: 'latin', keyboardTag: 'mi-NZ' },
  maori: { script: 'latin', keyboardTag: 'mi-NZ' },
  sm: { script: 'latin', keyboardTag: 'sm-WS' },
  samoan: { script: 'latin', keyboardTag: 'sm-WS' },
  to: { script: 'latin', keyboardTag: 'to-TO' },
  tongan: { script: 'latin', keyboardTag: 'to-TO' },
  fj: { script: 'latin', keyboardTag: 'fj-FJ' },
  fijian: { script: 'latin', keyboardTag: 'fj-FJ' },
  eo: { script: 'latin', keyboardTag: 'eo' },
  esperanto: { script: 'latin', keyboardTag: 'eo' },
  la: { script: 'latin', keyboardTag: 'la' },
  latin: { script: 'latin', keyboardTag: 'la' },
};

// Default layout for unknown languages
const DEFAULT_LAYOUT: KeyboardLayout = {
  lang: 'en',
  inputMode: 'text',
  dir: 'ltr',
  needsIME: false,
  script: 'latin',
  keyboardTag: 'en-US',
  enterKeyHint: 'send',
};

/**
 * Get keyboard layout configuration for a language
 */
export function getKeyboardLayout(language: string): KeyboardLayout {
  const normalizedLang = language.toLowerCase().trim();
  const config = LANGUAGE_SCRIPTS[normalizedLang];
  
  if (!config) {
    return DEFAULT_LAYOUT;
  }
  
  const isRTL = RTL_SCRIPTS.has(config.script);
  const needsIME = IME_SCRIPTS.has(config.script);
  
  // Get short code for lang attribute
  const shortCode = getShortCode(normalizedLang);
  
  return {
    lang: shortCode,
    inputMode: 'text',
    dir: isRTL ? 'rtl' : 'ltr',
    needsIME,
    script: config.script,
    keyboardTag: config.keyboardTag,
    enterKeyHint: 'send',
  };
}

/**
 * Get short language code (2-3 letter)
 */
function getShortCode(language: string): string {
  const mapping: Record<string, string> = {
    hindi: 'hi', bengali: 'bn', telugu: 'te', tamil: 'ta',
    marathi: 'mr', gujarati: 'gu', kannada: 'kn', malayalam: 'ml',
    punjabi: 'pa', odia: 'or', oriya: 'or', urdu: 'ur',
    arabic: 'ar', hebrew: 'he', persian: 'fa', farsi: 'fa',
    chinese: 'zh', mandarin: 'zh', japanese: 'ja', korean: 'ko',
    russian: 'ru', ukrainian: 'uk', greek: 'el',
    thai: 'th', vietnamese: 'vi', indonesian: 'id',
    spanish: 'es', french: 'fr', german: 'de', portuguese: 'pt',
    italian: 'it', dutch: 'nl', polish: 'pl', turkish: 'tr',
    english: 'en',
  };
  
  return mapping[language] || (language.length <= 3 ? language : 'en');
}

/**
 * Check if a language uses RTL direction
 */
export function isRTLLanguage(language: string): boolean {
  const layout = getKeyboardLayout(language);
  return layout.dir === 'rtl';
}

/**
 * Check if a language requires IME for proper input
 */
export function languageNeedsIME(language: string): boolean {
  const layout = getKeyboardLayout(language);
  return layout.needsIME;
}

/**
 * Get script family for a language
 */
export function getScriptFamily(language: string): ScriptFamily {
  const config = LANGUAGE_SCRIPTS[language.toLowerCase()];
  return config?.script || 'latin';
}

/**
 * Get BCP 47 keyboard tag for native keyboard hints
 */
export function getKeyboardTag(language: string): string {
  const layout = getKeyboardLayout(language);
  return layout.keyboardTag;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_SCRIPTS);
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
  return language.toLowerCase() in LANGUAGE_SCRIPTS;
}

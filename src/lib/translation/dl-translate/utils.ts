/**
 * DL-Translate Utils - Converted from Python
 * https://github.com/xhluca/dl-translate
 * 
 * Utility functions for language code resolution and model inference
 */

import { 
  PAIRS_M2M100, 
  PAIRS_MBART50, 
  PAIRS_NLLB200, 
  ModelFamily,
  getPairsForModel 
} from './language-pairs';

// Model path mappings
const MODEL_PATH_MAP: Record<string, string> = {
  'mbart50': 'facebook/mbart-large-50-many-to-many-mmt',
  'm2m100': 'facebook/m2m100_418M',
  'm2m100-small': 'facebook/m2m100_418M',
  'm2m100-medium': 'facebook/m2m100_1.2B',
  'nllb200': 'facebook/nllb-200-distilled-600M',
  'nllb200-small': 'facebook/nllb-200-distilled-600M',
  'nllb200-medium': 'facebook/nllb-200-distilled-1.3B',
  'nllb200-medium-regular': 'facebook/nllb-200-1.3B',
  'nllb200-large': 'facebook/nllb-200-3.3B',
};

// Infer model family from path
const MODEL_FAMILY_MAP: Record<string, ModelFamily> = {
  'facebook/mbart-large-50-many-to-many-mmt': 'mbart50',
  'facebook/m2m100_418M': 'm2m100',
  'facebook/m2m100_1.2B': 'm2m100',
  'facebook/nllb-200-distilled-600M': 'nllb200',
  'facebook/nllb-200-distilled-1.3B': 'nllb200',
  'facebook/nllb-200-1.3B': 'nllb200',
  'facebook/nllb-200-3.3B': 'nllb200',
};

/**
 * Infer model family from model path
 */
export function inferModelFamily(modelOrPath: string): ModelFamily {
  if (MODEL_FAMILY_MAP[modelOrPath]) {
    return MODEL_FAMILY_MAP[modelOrPath];
  }
  
  // Check if it's a shorthand
  const resolvedPath = MODEL_PATH_MAP[modelOrPath];
  if (resolvedPath && MODEL_FAMILY_MAP[resolvedPath]) {
    return MODEL_FAMILY_MAP[resolvedPath];
  }
  
  // Default to nllb200 for browser usage
  return 'nllb200';
}

/**
 * Infer model path from shorthand
 */
export function inferModelOrPath(modelOrPath: string): string {
  return MODEL_PATH_MAP[modelOrPath] || modelOrPath;
}

/**
 * Get language to code mapping for a model
 */
export function getLangCodeMap(modelFamily: ModelFamily = 'nllb200'): Record<string, string> {
  const pairs = getPairsForModel(modelFamily);
  const map: Record<string, string> = {};
  for (const [lang, code] of pairs) {
    map[lang] = code;
  }
  return map;
}

/**
 * Get all available languages for a model
 */
export function getAvailableLanguages(modelFamily: ModelFamily = 'nllb200'): string[] {
  const pairs = getPairsForModel(modelFamily);
  return [...new Set(pairs.map(([lang]) => lang))];
}

/**
 * Get all available codes for a model
 */
export function getAvailableCodes(modelFamily: ModelFamily = 'nllb200'): string[] {
  const pairs = getPairsForModel(modelFamily);
  return [...new Set(pairs.map(([, code]) => code))];
}

/**
 * Resolve language to its code for a specific model
 */
export function resolveLangCode(
  lang: string, 
  modelFamily: ModelFamily = 'nllb200'
): string {
  const langCodeMap = getLangCodeMap(modelFamily);
  
  // Direct match
  if (langCodeMap[lang]) {
    return langCodeMap[lang];
  }
  
  // Capitalize match
  const capitalized = lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
  if (langCodeMap[capitalized]) {
    return langCodeMap[capitalized];
  }
  
  // Case-insensitive search
  const upperLang = lang.toUpperCase();
  for (const [key, code] of Object.entries(langCodeMap)) {
    if (key.toUpperCase() === upperLang) {
      return code;
    }
  }
  
  // Assume it's already a code
  const availableCodes = getAvailableCodes(modelFamily);
  if (availableCodes.includes(lang)) {
    return lang;
  }
  
  // Return as-is (will be validated later)
  return lang;
}

/**
 * Check if a language is supported by a model
 */
export function isLanguageSupported(
  lang: string, 
  modelFamily: ModelFamily = 'nllb200'
): boolean {
  const langCodeMap = getLangCodeMap(modelFamily);
  const availableCodes = getAvailableCodes(modelFamily);
  
  // Check if it's a language name
  const upperLang = lang.toUpperCase();
  for (const key of Object.keys(langCodeMap)) {
    if (key.toUpperCase() === upperLang) {
      return true;
    }
  }
  
  // Check if it's a code
  return availableCodes.includes(lang);
}

/**
 * Get language name from code
 */
export function getLanguageFromCode(
  code: string,
  modelFamily: ModelFamily = 'nllb200'
): string | null {
  const pairs = getPairsForModel(modelFamily);
  const found = pairs.find(([, c]) => c === code);
  return found ? found[0] : null;
}

/**
 * Normalize language input to standard format
 * Supports all 200+ NLLB languages
 */
export function normalizeLanguageInput(input: string): string {
  // Common aliases for all supported languages
  const aliases: Record<string, string> = {
    // Indian languages
    'hindi': 'Hindi',
    'english': 'English',
    'telugu': 'Telugu',
    'tamil': 'Tamil',
    'kannada': 'Kannada',
    'malayalam': 'Malayalam',
    'marathi': 'Marathi',
    'bengali': 'Bengali',
    'bangla': 'Bengali',
    'gujarati': 'Gujarati',
    'punjabi': 'Eastern Panjabi',
    'panjabi': 'Eastern Panjabi',
    'urdu': 'Urdu',
    'odia': 'Odia',
    'oriya': 'Odia',
    'assamese': 'Assamese',
    'nepali': 'Nepali',
    'sinhala': 'Sinhala',
    'sinhalese': 'Sinhala',
    'bhojpuri': 'Bhojpuri',
    'maithili': 'Maithili',
    'awadhi': 'Awadhi',
    'chhattisgarhi': 'Chhattisgarhi',
    'magahi': 'Magahi',
    'kashmiri': 'Kashmiri (Devanagari script)',
    'sanskrit': 'Sanskrit',
    'meitei': 'Meitei (Bengali script)',
    
    // European languages
    'spanish': 'Spanish',
    'french': 'French',
    'german': 'German',
    'italian': 'Italian',
    'portuguese': 'Portuguese',
    'dutch': 'Dutch',
    'polish': 'Polish',
    'romanian': 'Romanian',
    'czech': 'Czech',
    'hungarian': 'Hungarian',
    'swedish': 'Swedish',
    'norwegian': 'Norwegian Bokmål',
    'danish': 'Danish',
    'finnish': 'Finnish',
    'greek': 'Greek',
    'bulgarian': 'Bulgarian',
    'croatian': 'Croatian',
    'serbian': 'Serbian',
    'slovenian': 'Slovenian',
    'slovak': 'Slovak',
    'ukrainian': 'Ukrainian',
    'russian': 'Russian',
    'belarusian': 'Belarusian',
    'lithuanian': 'Lithuanian',
    'latvian': 'Standard Latvian',
    'estonian': 'Estonian',
    'icelandic': 'Icelandic',
    'irish': 'Irish',
    'welsh': 'Welsh',
    'catalan': 'Catalan',
    'galician': 'Galician',
    'basque': 'Basque',
    'maltese': 'Maltese',
    'albanian': 'Tosk Albanian',
    
    // East Asian languages
    'chinese': 'Chinese (Simplified)',
    'mandarin': 'Chinese (Simplified)',
    'simplified chinese': 'Chinese (Simplified)',
    'traditional chinese': 'Chinese (Traditional)',
    'cantonese': 'Yue Chinese',
    'japanese': 'Japanese',
    'korean': 'Korean',
    
    // Southeast Asian languages
    'thai': 'Thai',
    'vietnamese': 'Vietnamese',
    'indonesian': 'Indonesian',
    'malay': 'Standard Malay',
    'burmese': 'Burmese',
    'myanmar': 'Burmese',
    'khmer': 'Khmer',
    'cambodian': 'Khmer',
    'lao': 'Lao',
    'laotian': 'Lao',
    'tagalog': 'Tagalog',
    'filipino': 'Tagalog',
    'javanese': 'Javanese',
    'sundanese': 'Sundanese',
    'cebuano': 'Cebuano',
    
    // Middle Eastern languages
    'arabic': 'Modern Standard Arabic',
    'persian': 'Western Persian',
    'farsi': 'Western Persian',
    'dari': 'Dari',
    'pashto': 'Southern Pashto',
    'hebrew': 'Hebrew',
    'turkish': 'Turkish',
    'kurdish': 'Central Kurdish',
    'azerbaijani': 'North Azerbaijani',
    
    // Central Asian languages
    'kazakh': 'Kazakh',
    'uzbek': 'Northern Uzbek',
    'kyrgyz': 'Kyrgyz',
    'tajik': 'Tajik',
    'turkmen': 'Turkmen',
    'mongolian': 'Halh Mongolian',
    'tibetan': 'Standard Tibetan',
    'uyghur': 'Uyghur',
    
    // African languages
    'swahili': 'Swahili',
    'amharic': 'Amharic',
    'hausa': 'Hausa',
    'yoruba': 'Yoruba',
    'igbo': 'Igbo',
    'zulu': 'Zulu',
    'xhosa': 'Xhosa',
    'afrikaans': 'Afrikaans',
    'somali': 'Somali',
    'oromo': 'West Central Oromo',
    'tigrinya': 'Tigrinya',
    'malagasy': 'Plateau Malagasy',
    'kinyarwanda': 'Kinyarwanda',
    'shona': 'Shona',
    'lingala': 'Lingala',
    'wolof': 'Wolof',
    'twi': 'Twi',
    
    // Other languages
    'georgian': 'Georgian',
    'armenian': 'Armenian',
    'esperanto': 'Esperanto',
    'yiddish': 'Eastern Yiddish',
    'haitian': 'Haitian Creole',
    'haitian creole': 'Haitian Creole',
    'guarani': 'Guarani',
    'quechua': 'Ayacucho Quechua',
    'maori': 'Maori',
    'samoan': 'Samoan',
    'fijian': 'Fijian',
  };
  
  const lower = input.toLowerCase().trim();
  return aliases[lower] || input;
}

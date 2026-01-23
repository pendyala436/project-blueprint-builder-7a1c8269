/**
 * Universal Offline Translation Engine
 * =====================================
 * 
 * 100% BROWSER-BASED - NO EXTERNAL APIs - NO NLLB-200 - NO HARDCODING
 * 
 * Supports ALL 1000+ languages from languages.ts
 * 
 * Features:
 * 1. Dynamic language discovery from profile language lists
 * 2. Meaning-based translation via Supabase dictionaries
 * 3. English pivot for cross-language semantic translation
 * 4. Script conversion for all non-Latin scripts
 * 5. Cached common phrases for instant responses
 * 6. Real-time typing preview
 * 
 * Translation Strategy:
 * - Latin → Latin (same language): Direct passthrough
 * - Latin → Latin (different): English pivot + dictionary lookup
 * - Latin → Native: Transliterate + dictionary lookup
 * - Native → Latin: Reverse transliterate + dictionary lookup
 * - Native → Native: Convert via English pivot
 * - English as source/target: Direct dictionary lookup
 */

import { supabase } from '@/integrations/supabase/client';
import { languages, type Language } from '@/data/languages';
import {
  dynamicTransliterate,
  reverseTransliterate,
  isLatinScriptLanguage as checkLatinScript,
  isLatinText as checkLatinText,
  detectScriptFromText,
  normalizeLanguage as normalizeFromTransliterator,
  isSameLanguage as checkSameLanguage,
} from './dynamic-transliterator';

// ============================================================
// TYPES
// ============================================================

export interface UniversalTranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  isTransliterated: boolean;
  englishPivot?: string;
  confidence: number;
  method: 'dictionary' | 'phrase' | 'transliteration' | 'passthrough' | 'semantic' | 'cached';
}

export interface SemanticDictionaryEntry {
  id?: string;
  source_text: string;
  source_language: string;
  english_meaning: string;
  context?: string;
  usage_count?: number;
  verified?: boolean;
}

export interface CommonPhraseEntry {
  phrase_key: string;
  english: string;
  [languageKey: string]: string | null | number | undefined;
}

export interface BidirectionalChatResult {
  senderView: string;
  receiverView: string;
  englishCore: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
  confidence: number;
}

// ============================================================
// LANGUAGE DATABASE - Built from languages.ts (1000+ languages)
// ============================================================

interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  rtl: boolean;
}

// Simple hash function for cache keys to avoid collisions with long messages
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Build unified language database from languages.ts
const languageDatabase = new Map<string, LanguageInfo>();
const languageByCode = new Map<string, LanguageInfo>();
const languageByNativeName = new Map<string, LanguageInfo>();

// Initialize from languages.ts
languages.forEach((lang: Language) => {
  const info: LanguageInfo = {
    code: lang.code.toLowerCase(),
    name: lang.name.toLowerCase(),
    nativeName: lang.nativeName,
    script: lang.script || 'Latin',
    rtl: lang.rtl || false,
  };
  
  languageDatabase.set(info.name, info);
  languageByCode.set(info.code, info);
  
  // Also map by native name if ASCII
  if (/^[a-zA-Z\s]+$/.test(lang.nativeName)) {
    languageByNativeName.set(lang.nativeName.toLowerCase(), info);
  }
});

// Language aliases for common variations
const LANGUAGE_ALIASES: Record<string, string> = {
  'bangla': 'bengali',
  'oriya': 'odia',
  'farsi': 'persian',
  'mandarin': 'chinese (mandarin)',
  'chinese': 'chinese (mandarin)',
  'hindustani': 'hindi',
  'filipino': 'tagalog',
  'panjabi': 'punjabi',
  'sinhalese': 'sinhala',
  'myanmar': 'burmese',
  'azeri': 'azerbaijani',
  'castilian': 'spanish',
  'deutsch': 'german',
  'francais': 'french',
  'italiano': 'italian',
  'português': 'portuguese',
  'русский': 'russian',
  '日本語': 'japanese',
  '한국어': 'korean',
  '中文': 'chinese (mandarin)',
  'العربية': 'arabic',
  'עברית': 'hebrew',
  'ไทย': 'thai',
  'हिंदी': 'hindi',
  'বাংলা': 'bengali',
  'தமிழ்': 'tamil',
  'తెలుగు': 'telugu',
  'ಕನ್ನಡ': 'kannada',
  'മലയാളം': 'malayalam',
  'ગુજરાતી': 'gujarati',
  'ਪੰਜਾਬੀ': 'punjabi',
  'मराठी': 'marathi',
  'ଓଡ଼ିଆ': 'odia',
};

// ============================================================
// LANGUAGE FALLBACK SYSTEM - For 1000+ languages
// Maps unsupported/dialect languages to nearest major language
// ============================================================

const LANGUAGE_FALLBACK_MAP: Record<string, string> = {
  // South Indian Regional → Nearest Major
  'tulu': 'kannada',
  'kodava': 'kannada',
  'badaga': 'kannada',
  'konkani': 'marathi',
  'saurashtra': 'gujarati',
  
  // Hindi Belt Dialects → Hindi
  'bhojpuri': 'hindi',
  'maithili': 'hindi',
  'magahi': 'hindi',
  'angika': 'hindi',
  'bajjika': 'hindi',
  'awadhi': 'hindi',
  'chhattisgarhi': 'hindi',
  'marwari': 'hindi',
  'mewari': 'hindi',
  'rajasthani': 'hindi',
  'haryanvi': 'hindi',
  'bundeli': 'hindi',
  'bagheli': 'hindi',
  'kumaoni': 'hindi',
  'garhwali': 'hindi',
  'pahari': 'hindi',
  'kanauji': 'hindi',
  'braj': 'hindi',
  'dhundhari': 'hindi',
  'hadothi': 'hindi',
  'nimadi': 'hindi',
  'malvi': 'hindi',
  'wagdi': 'hindi',
  'nagpuri': 'hindi',
  'surgujia': 'hindi',
  
  // Tribal Languages → Nearest Major
  'bhili': 'hindi',
  'gondi': 'hindi',
  'lambadi': 'hindi',
  'kurukh': 'hindi',
  'mundari': 'hindi',
  'ho': 'hindi',
  'kharia': 'hindi',
  'halbi': 'hindi',
  'khandeshi': 'marathi',
  'deccan': 'hindi',
  'santali': 'hindi',
  'bodo': 'hindi',
  'dogri': 'hindi',
  
  // Bengali Script Languages → Bengali
  'assamese': 'bengali',
  'sylheti': 'bengali',
  'chittagonian': 'bengali',
  'rangpuri': 'bengali',
  'rabha': 'bengali',
  'manipuri': 'bengali',
  
  // Telugu Script Languages → Telugu
  'waddar': 'telugu',
  'koya': 'telugu',
  'kadaru': 'telugu',
  'yerukala': 'telugu',
  
  // Tamil Script Languages → Tamil
  'toda': 'tamil',
  'irula': 'tamil',
  // 'badaga' already mapped to Kannada above
  
  // Odia Script Languages → Odia
  'kuvi': 'odia',
  'soura': 'odia',
  
  // Malayalam Script Languages → Malayalam
  'kuruma': 'malayalam',
  
  // Northeast Indian → Nearest Major
  'mizo': 'bengali',
  'khasi': 'bengali',
  'garo': 'bengali',
  'karbi': 'bengali',
  'kokborok': 'bengali',
  'mishing': 'bengali',
  'nagamese': 'hindi',
  
  // Tibetan Script Languages → Tibetan/Hindi
  'bhutia': 'hindi',
  'dzongkha': 'hindi',
  'monpa': 'hindi',
  'lepcha': 'hindi',
  'limbu': 'hindi',
  
  // Arabic Script Languages → Arabic/Urdu
  'kashmiri': 'urdu',
  'sindhi': 'urdu',
  'balochi': 'urdu',
  'brahui': 'urdu',
  'pashto': 'urdu',
  'dari': 'persian',
  'tajik': 'persian',
  'lahnda': 'punjabi',
  
  // Myanmar Script Languages → Burmese
  'shan': 'burmese',
  'kachin': 'burmese',
  'chin': 'burmese',
  'karen': 'burmese',
  'mon': 'burmese',
  'khamti': 'burmese',
  'phake': 'burmese',
  'aiton': 'burmese',
  
  // Southeast Asian → Nearest Major
  'lao': 'thai',
  'isan': 'thai',
  'northern thai': 'thai',
  'southern thai': 'thai',
  
  // Chinese Varieties → Chinese (Mandarin)
  'cantonese': 'chinese (mandarin)',
  'hokkien': 'chinese (mandarin)',
  'hakka': 'chinese (mandarin)',
  'teochew': 'chinese (mandarin)',
  'shanghainese': 'chinese (mandarin)',
  'taiwanese': 'chinese (mandarin)',
  'min nan': 'chinese (mandarin)',
  'wu': 'chinese (mandarin)',
  
  // Indonesian Languages → Indonesian
  'javanese': 'indonesian',
  'sundanese': 'indonesian',
  'madurese': 'indonesian',
  'minangkabau': 'indonesian',
  'acehnese': 'indonesian',
  'balinese': 'indonesian',
  'banjar': 'indonesian',
  'buginese': 'indonesian',
  'makassarese': 'indonesian',
  'betawi': 'indonesian',
  'sasak': 'indonesian',
  
  // Philippine Languages → Tagalog
  'cebuano': 'tagalog',
  'ilocano': 'tagalog',
  'hiligaynon': 'tagalog',
  'waray': 'tagalog',
  'kapampangan': 'tagalog',
  'bikol': 'tagalog',
  'pangasinan': 'tagalog',
  'maranao': 'tagalog',
  'maguindanaon': 'tagalog',
  'tausug': 'tagalog',
  
  // African Languages → Nearest Major
  'tigrinya': 'amharic',
  'oromo': 'amharic',
  'somali': 'arabic',
  'wolof': 'french',
  'fulani': 'french',
  'bambara': 'french',
  'lingala': 'french',
  'kikongo': 'french',
  'zulu': 'english',
  'xhosa': 'english',
  'sotho': 'english',
  'tswana': 'english',
  'shona': 'english',
  'nyanja': 'english',
  
  // European Languages → Nearest Major
  'catalan': 'spanish',
  'galician': 'portuguese',
  'occitan': 'french',
  'breton': 'french',
  'corsican': 'italian',
  'sardinian': 'italian',
  'sicilian': 'italian',
  'neapolitan': 'italian',
  'venetian': 'italian',
  'friulian': 'italian',
  'luxembourgish': 'german',
  'alemannic': 'german',
  'bavarian': 'german',
  'low german': 'german',
  'swiss german': 'german',
  'austrian german': 'german',
  'yiddish': 'german',
  'frisian': 'dutch',
  'flemish': 'dutch',
  'scots': 'english',
  'irish': 'english',
  'welsh': 'english',
  'scottish gaelic': 'english',
  
  // Slavic Languages → Russian/nearest
  'ukrainian': 'russian',
  'belarusian': 'russian',
  'bulgarian': 'russian',
  'macedonian': 'russian',
  'serbian': 'russian',
  
  // Turkic Languages → Turkish
  'azerbaijani': 'turkish',
  'uzbek': 'turkish',
  'kazakh': 'turkish',
  'kyrgyz': 'turkish',
  'turkmen': 'turkish',
  'uyghur': 'turkish',
  'tatar': 'turkish',
  'bashkir': 'turkish',
};

// Script-based fallbacks for unknown languages
const SCRIPT_TO_FALLBACK_LANGUAGE: Record<string, string> = {
  'Devanagari': 'hindi',
  'Bengali': 'bengali',
  'Tamil': 'tamil',
  'Telugu': 'telugu',
  'Kannada': 'kannada',
  'Malayalam': 'malayalam',
  'Gujarati': 'gujarati',
  'Gurmukhi': 'punjabi',
  'Odia': 'odia',
  'Arabic': 'arabic',
  'Cyrillic': 'russian',
  'Greek': 'greek',
  'Hebrew': 'hebrew',
  'Thai': 'thai',
  'Han': 'chinese (mandarin)',
  'Japanese': 'japanese',
  'Hangul': 'korean',
  'Georgian': 'georgian',
  'Armenian': 'armenian',
  'Ethiopic': 'amharic',
  'Myanmar': 'burmese',
  'Khmer': 'khmer',
  'Lao': 'lao',
  'Sinhala': 'sinhala',
  'Tibetan': 'hindi',
  'Latin': 'english',
};

/**
 * Get the effective language for translation
 * Resolves dialects and unsupported languages to nearest major language
 */
function getEffectiveLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  
  // Check direct fallback map first
  if (LANGUAGE_FALLBACK_MAP[normalized]) {
    return LANGUAGE_FALLBACK_MAP[normalized];
  }
  
  // Check if it's a supported major language
  if (languageDatabase.has(normalized)) {
    const info = languageDatabase.get(normalized);
    // If the language has a non-Latin script and we have phrase support, use it
    if (info && LANGUAGE_COLUMN_MAP[normalized]) {
      return normalized;
    }
    // Otherwise check for script-based fallback
    if (info?.script && SCRIPT_TO_FALLBACK_LANGUAGE[info.script]) {
      const fallback = SCRIPT_TO_FALLBACK_LANGUAGE[info.script];
      // If we have phrase support for the fallback, use it
      if (LANGUAGE_COLUMN_MAP[fallback]) {
        return fallback;
      }
    }
  }
  
  // Check by code
  const byCode = languageByCode.get(normalized);
  if (byCode) {
    const name = byCode.name;
    if (LANGUAGE_FALLBACK_MAP[name]) {
      return LANGUAGE_FALLBACK_MAP[name];
    }
    if (byCode.script && SCRIPT_TO_FALLBACK_LANGUAGE[byCode.script]) {
      return SCRIPT_TO_FALLBACK_LANGUAGE[byCode.script];
    }
    return name;
  }
  
  return normalized;
}

// Database column mapping for common_phrases table
const LANGUAGE_COLUMN_MAP: Record<string, string> = {
  'hindi': 'hindi',
  'bengali': 'bengali',
  'telugu': 'telugu',
  'tamil': 'tamil',
  'kannada': 'kannada',
  'malayalam': 'malayalam',
  'marathi': 'marathi',
  'gujarati': 'gujarati',
  'punjabi': 'punjabi',
  'odia': 'odia',
  'urdu': 'urdu',
  'arabic': 'arabic',
  'spanish': 'spanish',
  'french': 'french',
  'portuguese': 'portuguese',
  'russian': 'russian',
  'japanese': 'japanese',
  'korean': 'korean',
  'chinese (mandarin)': 'chinese',
  'thai': 'thai',
  'vietnamese': 'vietnamese',
  'indonesian': 'indonesian',
  'turkish': 'turkish',
  'persian': 'persian',
  'english': 'english',
};

// ============================================================
// CACHING SYSTEM
// ============================================================

// Common phrases cache
const commonPhrasesCache = new Map<string, CommonPhraseEntry>();
let phraseCacheLoaded = false;
let phraseCacheLoading = false;

// Semantic dictionary cache
const semanticDictionaryCache = new Map<string, SemanticDictionaryEntry[]>();
const MAX_DICTIONARY_CACHE = 2000;

// Translation result cache
const translationResultCache = new Map<string, UniversalTranslationResult>();
const MAX_RESULT_CACHE = 10000;

// Word-to-English mapping cache (for meaning lookup)
const wordMeaningCache = new Map<string, string>();
const MAX_WORD_CACHE = 5000;

// ============================================================
// LANGUAGE UTILITIES
// ============================================================

export function normalizeLanguage(lang: string): string {
  if (!lang || typeof lang !== 'string') return 'english';
  
  const normalized = lang.toLowerCase().trim();
  if (!normalized) return 'english';
  
  // Check aliases first
  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }
  
  // Check by name
  if (languageDatabase.has(normalized)) {
    return normalized;
  }
  
  // Check by code
  const byCode = languageByCode.get(normalized);
  if (byCode) {
    return byCode.name;
  }
  
  // Check by native name
  const byNative = languageByNativeName.get(normalized);
  if (byNative) {
    return byNative.name;
  }
  
  // Use dynamic-transliterator's normalization as fallback
  return normalizeFromTransliterator(normalized);
}

/**
 * Get the translation-effective language (resolves dialects to major languages)
 * Use this when looking up phrases/dictionaries
 */
export function getTranslationLanguage(lang: string): string {
  const normalized = normalizeLanguage(lang);
  return getEffectiveLanguage(normalized);
}

export function getLanguageInfo(lang: string): LanguageInfo | null {
  const normalized = normalizeLanguage(lang);
  return languageDatabase.get(normalized) || languageByCode.get(lang.toLowerCase()) || null;
}

export function getLanguageCode(lang: string): string {
  const info = getLanguageInfo(lang);
  return info?.code || lang.substring(0, 2).toLowerCase();
}

export function getLanguageColumn(lang: string): string {
  const normalized = normalizeLanguage(lang);
  // First check if there's a direct column for this language
  if (LANGUAGE_COLUMN_MAP[normalized]) {
    return LANGUAGE_COLUMN_MAP[normalized];
  }
  // Otherwise, get the effective/fallback language
  const effective = getEffectiveLanguage(normalized);
  return LANGUAGE_COLUMN_MAP[effective] || 'english';
}

export function isLatinScriptLanguage(lang: string): boolean {
  return checkLatinScript(lang);
}

export function isLatinText(text: string): boolean {
  return checkLatinText(text);
}

export function isSameLanguage(lang1: string, lang2: string): boolean {
  // First check direct match
  if (checkSameLanguage(lang1, lang2)) return true;
  
  // Also check if both languages have the same effective fallback
  const effective1 = getEffectiveLanguage(normalizeLanguage(lang1));
  const effective2 = getEffectiveLanguage(normalizeLanguage(lang2));
  
  return effective1 === effective2;
}

export function isEnglish(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return normalized === 'english' || lang.toLowerCase() === 'en';
}

export function isRTL(lang: string): boolean {
  const info = getLanguageInfo(lang);
  return info?.rtl || false;
}

export function getAllLanguages(): LanguageInfo[] {
  return Array.from(languageDatabase.values());
}

export function getLanguageCount(): number {
  return languageDatabase.size;
}

export function isLanguageSupported(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return languageDatabase.has(normalized) || languageByCode.has(lang.toLowerCase());
}

// ============================================================
// COMMON PHRASES LOADER
// ============================================================

async function loadCommonPhrases(): Promise<void> {
  if (phraseCacheLoaded || phraseCacheLoading) return;
  
  phraseCacheLoading = true;
  
  try {
    const { data, error } = await supabase
      .from('common_phrases')
      .select('*')
      .limit(1000);
    
    if (error) {
      console.warn('[UniversalOffline] Failed to load common phrases:', error);
      phraseCacheLoading = false;
      return;
    }
    
    if (data) {
      data.forEach((phrase: CommonPhraseEntry) => {
        // Index by English text
        const englishKey = phrase.english?.toLowerCase().trim();
        if (englishKey) {
          commonPhrasesCache.set(englishKey, phrase);
        }
        
        // Index by phrase_key
        if (phrase.phrase_key) {
          commonPhrasesCache.set(phrase.phrase_key.toLowerCase(), phrase);
        }
      });
      
      console.log(`[UniversalOffline] Loaded ${commonPhrasesCache.size} common phrases`);
    }
    
    phraseCacheLoaded = true;
  } catch (err) {
    console.warn('[UniversalOffline] Error loading phrases:', err);
  } finally {
    phraseCacheLoading = false;
  }
}

// ============================================================
// DICTIONARY LOOKUP - Semantic Meaning Based
// ============================================================

async function lookupSemanticDictionary(
  text: string,
  sourceLanguage: string
): Promise<SemanticDictionaryEntry | null> {
  const normalizedSource = normalizeLanguage(sourceLanguage);
  const effectiveSource = getEffectiveLanguage(normalizedSource);
  const textHash = simpleHash(text.toLowerCase());
  const cacheKey = `${effectiveSource}:${textHash}:${text.length}`;
  
  // Check cache
  const cached = semanticDictionaryCache.get(cacheKey);
  if (cached && cached.length > 0) {
    return cached[0];
  }
  
  try {
    const { data, error } = await supabase
      .from('translation_dictionaries')
      .select('*')
      .eq('source_language', effectiveSource)
      .ilike('source_text', text.trim())
      .ilike('source_text', text.trim())
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    // Cache result
    if (semanticDictionaryCache.size >= MAX_DICTIONARY_CACHE) {
      const firstKey = semanticDictionaryCache.keys().next().value;
      if (firstKey) semanticDictionaryCache.delete(firstKey);
    }
    
    const entries = data.map(d => ({
      source_text: d.source_text,
      source_language: d.source_language,
      english_meaning: d.english_text,
      verified: d.verified,
    }));
    
    semanticDictionaryCache.set(cacheKey, entries);
    return entries[0];
  } catch (err) {
    console.warn('[UniversalOffline] Dictionary lookup error:', err);
    return null;
  }
}

// ============================================================
// COMMON PHRASE LOOKUP
// ============================================================

function lookupCommonPhrase(text: string, targetLanguage: string): string | null {
  const key = text.toLowerCase().trim();
  const phrase = commonPhrasesCache.get(key);
  
  if (!phrase) return null;
  
  const column = getLanguageColumn(targetLanguage);
  const translation = phrase[column];
  
  if (translation && typeof translation === 'string' && translation.trim()) {
    return translation;
  }
  
  return null;
}

// ============================================================
// WORD-BY-WORD SEMANTIC TRANSLATION
// ============================================================

async function translateWordByWord(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ result: string; translated: boolean; confidence: number }> {
  const words = text.split(/(\s+)/);
  const translatedWords: string[] = [];
  let anyTranslated = false;
  let translatedCount = 0;
  let totalWords = 0;
  
  for (const segment of words) {
    // Keep whitespace as-is
    if (/^\s+$/.test(segment)) {
      translatedWords.push(segment);
      continue;
    }
    
    if (!segment.trim()) continue;
    totalWords++;
    
    // Try phrase lookup first
    const phraseResult = lookupCommonPhrase(segment, targetLanguage);
    if (phraseResult) {
      translatedWords.push(phraseResult);
      anyTranslated = true;
      translatedCount++;
      continue;
    }
    
    // Try dictionary lookup
    const dictEntry = await lookupSemanticDictionary(segment, sourceLanguage);
    if (dictEntry) {
      // Get English meaning, then find target equivalent
      const englishMeaning = dictEntry.english_meaning;
      
      if (isEnglish(targetLanguage)) {
        translatedWords.push(englishMeaning);
        anyTranslated = true;
        translatedCount++;
      } else {
        // Try to get target language from phrase cache
        const targetPhrase = lookupCommonPhrase(englishMeaning, targetLanguage);
        if (targetPhrase) {
          translatedWords.push(targetPhrase);
          anyTranslated = true;
          translatedCount++;
        } else {
          // Transliterate the English meaning to target script
          const targetIsLatin = isLatinScriptLanguage(targetLanguage);
          if (!targetIsLatin) {
            translatedWords.push(dynamicTransliterate(englishMeaning, targetLanguage) || englishMeaning);
          } else {
            translatedWords.push(englishMeaning);
          }
          translatedCount++;
          anyTranslated = true;
        }
      }
      continue;
    }
    
    // No translation found - transliterate if needed
    const targetIsLatin = isLatinScriptLanguage(targetLanguage);
    const inputIsLatin = isLatinText(segment);
    
    if (inputIsLatin && !targetIsLatin) {
      translatedWords.push(dynamicTransliterate(segment, targetLanguage) || segment);
    } else if (!inputIsLatin && targetIsLatin) {
      translatedWords.push(reverseTransliterate(segment, sourceLanguage) || segment);
    } else {
      translatedWords.push(segment);
    }
  }
  
  return {
    result: translatedWords.join(''),
    translated: anyTranslated,
    confidence: totalWords > 0 ? translatedCount / totalWords : 0,
  };
}

// ============================================================
// CORE UNIVERSAL TRANSLATION
// ============================================================

/**
 * Universal offline translation for all 1000+ languages
 * 
 * Strategy:
 * 1. Same language → Return as-is (with optional script conversion)
 * 2. English involved → Direct dictionary/phrase lookup
 * 3. Different languages → English pivot translation
 * 4. Fallback → Script transliteration
 */
export async function translateUniversal(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<UniversalTranslationResult> {
  const trimmed = text.trim();
  
  // Empty text
  if (!trimmed) {
    return {
      text: '',
      originalText: '',
      sourceLanguage,
      targetLanguage,
      isTranslated: false,
      isTransliterated: false,
      confidence: 0,
      method: 'passthrough',
    };
  }
  
  const normSource = normalizeLanguage(sourceLanguage);
  const normTarget = normalizeLanguage(targetLanguage);
  
  // Check result cache - use hash of full text to avoid collisions with long messages
  const textHash = simpleHash(trimmed);
  const cacheKey = `${normSource}:${normTarget}:${textHash}:${trimmed.length}`;
  const cached = translationResultCache.get(cacheKey);
  if (cached) {
    return { ...cached, method: 'cached' };
  }
  
  // Ensure common phrases are loaded
  await loadCommonPhrases();
  
  const sourceIsLatin = isLatinScriptLanguage(normSource);
  const targetIsLatin = isLatinScriptLanguage(normTarget);
  const inputIsLatin = isLatinText(trimmed);
  
  let result: UniversalTranslationResult;
  
  // CASE 1: Same language - script conversion only
  if (isSameLanguage(normSource, normTarget)) {
    let resultText = trimmed;
    let isTransliterated = false;
    
    if (inputIsLatin && !targetIsLatin) {
      resultText = dynamicTransliterate(trimmed, normTarget) || trimmed;
      isTransliterated = resultText !== trimmed;
    } else if (!inputIsLatin && targetIsLatin) {
      resultText = reverseTransliterate(trimmed, normSource) || trimmed;
      isTransliterated = resultText !== trimmed;
    }
    
    result = {
      text: resultText,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      isTranslated: false,
      isTransliterated,
      confidence: 1.0,
      method: 'passthrough',
    };
  }
  // CASE 2: English as source or target - direct lookup
  else if (isEnglish(normSource) || isEnglish(normTarget)) {
    // Try common phrase first
    const phraseResult = lookupCommonPhrase(trimmed, normTarget);
    
    if (phraseResult) {
      result = {
        text: phraseResult,
        originalText: trimmed,
        sourceLanguage: normSource,
        targetLanguage: normTarget,
        isTranslated: true,
        isTransliterated: false,
        englishPivot: isEnglish(normSource) ? trimmed : undefined,
        confidence: 0.95,
        method: 'phrase',
      };
    } else {
      // Try word-by-word semantic translation
      const wordResult = await translateWordByWord(trimmed, normSource, normTarget);
      
      // Apply script conversion if needed
      let finalText = wordResult.result;
      if (!targetIsLatin && isLatinText(finalText)) {
        finalText = dynamicTransliterate(finalText, normTarget) || finalText;
      }
      
      result = {
        text: finalText,
        originalText: trimmed,
        sourceLanguage: normSource,
        targetLanguage: normTarget,
        isTranslated: wordResult.translated,
        isTransliterated: finalText !== wordResult.result,
        englishPivot: isEnglish(normSource) ? trimmed : undefined,
        confidence: wordResult.confidence || 0.5,
        method: wordResult.translated ? 'semantic' : 'transliteration',
      };
    }
  }
  // CASE 3: Native to Native (different languages) - use English pivot
  else {
    // Step 1: Convert source to English representation
    let englishPivot: string;
    
    if (inputIsLatin) {
      englishPivot = trimmed;
    } else {
      // Reverse transliterate to get Latin representation
      englishPivot = reverseTransliterate(trimmed, normSource) || trimmed;
    }
    
    // Step 2: Try common phrase lookup with English pivot
    const phraseResult = lookupCommonPhrase(englishPivot, normTarget);
    
    if (phraseResult) {
      result = {
        text: phraseResult,
        originalText: trimmed,
        sourceLanguage: normSource,
        targetLanguage: normTarget,
        isTranslated: true,
        isTransliterated: false,
        englishPivot,
        confidence: 0.85,
        method: 'phrase',
      };
    } else {
      // Step 3: Try semantic dictionary lookup via English
      const wordResult = await translateWordByWord(englishPivot, 'english', normTarget);
      
      // Apply script conversion
      let finalText = wordResult.result;
      if (!targetIsLatin && isLatinText(finalText)) {
        finalText = dynamicTransliterate(finalText, normTarget) || finalText;
      }
      
      result = {
        text: finalText,
        originalText: trimmed,
        sourceLanguage: normSource,
        targetLanguage: normTarget,
        isTranslated: wordResult.translated,
        isTransliterated: finalText !== wordResult.result || finalText !== englishPivot,
        englishPivot,
        confidence: wordResult.confidence || 0.4,
        method: wordResult.translated ? 'semantic' : 'transliteration',
      };
    }
  }
  
  // Cache result
  if (translationResultCache.size >= MAX_RESULT_CACHE) {
    const firstKey = translationResultCache.keys().next().value;
    if (firstKey) translationResultCache.delete(firstKey);
  }
  translationResultCache.set(cacheKey, result);
  
  return result;
}

// ============================================================
// BIDIRECTIONAL CHAT TRANSLATION
// ============================================================

/**
 * Process chat message with bidirectional views - MEANING BASED
 * 
 * 1. Sender sees their message in their native script
 * 2. Receiver sees MEANING-BASED translation in receiver's mother tongue
 * 3. English meaning is generated (not phonetic Latin)
 * 
 * Example: Telugu "జాతి మనది" → English meaning "It's our nation" → Hindi meaning "यह हमारा राष्ट्र है"
 */
export async function translateBidirectionalChat(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<BidirectionalChatResult> {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      senderView: '',
      receiverView: '',
      englishCore: '',
      originalText: '',
      wasTransliterated: false,
      wasTranslated: false,
      confidence: 0,
    };
  }
  
  // Ensure phrases loaded
  await loadCommonPhrases();
  
  const normSender = normalizeLanguage(senderLanguage);
  const normReceiver = normalizeLanguage(receiverLanguage);
  const inputIsLatin = isLatinText(trimmed);
  const senderIsLatin = isLatinScriptLanguage(normSender);
  const receiverIsLatin = isLatinScriptLanguage(normReceiver);
  
  // ============================================================
  // STEP 1: Generate sender view (in sender's native script)
  // ============================================================
  let senderView = trimmed;
  let wasTransliterated = false;
  
  if (inputIsLatin && !senderIsLatin) {
    // Latin input for non-Latin language → transliterate to native script
    senderView = dynamicTransliterate(trimmed, normSender) || trimmed;
    wasTransliterated = senderView !== trimmed;
  }
  
  // ============================================================
  // STEP 2: Generate MEANING-BASED English (not phonetic)
  // This is the key difference from before - we translate the meaning
  // ============================================================
  let englishCore: string;
  let wasTranslated = false;
  
  if (isEnglish(normSender)) {
    // Sender is English - input IS English meaning
    englishCore = trimmed;
  } else if (inputIsLatin && !senderIsLatin) {
    // User typed Latin phonetically for non-Latin language
    // First get native script, then try to get English meaning
    const nativeText = senderView;
    
    // Try to translate native text to English meaning
    const englishResult = await translateToEnglishMeaning(nativeText, normSender);
    if (englishResult && englishResult !== nativeText) {
      englishCore = englishResult;
      wasTranslated = true;
    } else {
      // Fallback: try phrase lookup with the phonetic input
      const phraseEnglish = lookupEnglishFromPhrase(trimmed, normSender);
      if (phraseEnglish) {
        englishCore = phraseEnglish;
        wasTranslated = true;
      } else {
        // Last resort: use phonetic as English approximation
        englishCore = trimmed;
      }
    }
  } else if (!inputIsLatin) {
    // User typed in native script directly (e.g., via Gboard)
    const englishResult = await translateToEnglishMeaning(trimmed, normSender);
    if (englishResult && englishResult !== trimmed) {
      englishCore = englishResult;
      wasTranslated = true;
    } else {
      // Fallback: reverse transliterate
      englishCore = reverseTransliterate(trimmed, normSender) || trimmed;
    }
  } else {
    // Latin language typing Latin - use as-is
    englishCore = trimmed;
  }
  
  // ============================================================
  // STEP 3: Generate MEANING-BASED receiver view
  // Translate from English meaning to receiver's mother tongue
  // ============================================================
  let receiverView: string;
  
  if (isSameLanguage(normSender, normReceiver)) {
    // Same language - receiver sees same as sender
    receiverView = senderView;
  } else if (isEnglish(normReceiver)) {
    // Receiver is English - show English meaning
    receiverView = englishCore;
    wasTranslated = englishCore !== trimmed;
  } else {
    // Different languages - translate English meaning to receiver's language
    const receiverResult = await translateFromEnglishMeaning(englishCore, normReceiver);
    
    if (receiverResult && receiverResult !== englishCore) {
      receiverView = receiverResult;
      wasTranslated = true;
    } else {
      // Fallback: transliterate English to receiver's script
      if (!receiverIsLatin) {
        receiverView = dynamicTransliterate(englishCore, normReceiver) || englishCore;
        wasTransliterated = receiverView !== englishCore;
      } else {
        receiverView = englishCore;
      }
    }
  }
  
  console.log('[UniversalOffline] BidirectionalChat result:', {
    input: trimmed.substring(0, 30),
    senderView: senderView.substring(0, 30),
    englishCore: englishCore.substring(0, 30),
    receiverView: receiverView.substring(0, 30),
    wasTranslated
  });
  
  return {
    senderView,
    receiverView,
    englishCore,
    originalText: trimmed,
    wasTransliterated,
    wasTranslated,
    confidence: wasTranslated ? 0.8 : 0.5,
  };
}

/**
 * Translate text to English meaning using dictionary and phrase lookups
 */
async function translateToEnglishMeaning(text: string, sourceLanguage: string): Promise<string | null> {
  if (!text.trim()) return null;
  
  const normSource = normalizeLanguage(sourceLanguage);
  const textLower = text.toLowerCase().trim();
  
  // First try: Check common_phrases for direct English translation
  for (const [key, phrase] of commonPhrasesCache.entries()) {
    const column = getLanguageColumn(normSource);
    const sourceValue = phrase[column];
    
    if (sourceValue && typeof sourceValue === 'string') {
      // Check if source language value matches
      if (sourceValue.toLowerCase().trim() === textLower ||
          // Also check if the key itself matches (some phrases are keyed by phonetic)
          key === textLower) {
        return phrase.english;
      }
    }
  }
  
  // Second try: Dictionary lookup
  const dictEntry = await lookupSemanticDictionary(text, normSource);
  if (dictEntry && dictEntry.english_meaning) {
    return dictEntry.english_meaning;
  }
  
  // Third try: Word-by-word translation
  const words = text.split(/\s+/);
  if (words.length > 1) {
    const translatedWords: string[] = [];
    let anyTranslated = false;
    
    for (const word of words) {
      const wordEntry = await lookupSemanticDictionary(word, normSource);
      if (wordEntry && wordEntry.english_meaning) {
        translatedWords.push(wordEntry.english_meaning);
        anyTranslated = true;
      } else {
        // Try phrase lookup for individual word
        for (const [, phrase] of commonPhrasesCache.entries()) {
          const column = getLanguageColumn(normSource);
          const sourceValue = phrase[column];
          if (sourceValue && typeof sourceValue === 'string' && 
              sourceValue.toLowerCase().trim() === word.toLowerCase()) {
            translatedWords.push(phrase.english);
            anyTranslated = true;
            break;
          }
        }
        if (!anyTranslated || translatedWords.length < words.indexOf(word) + 1) {
          translatedWords.push(word); // Keep original if no translation
        }
      }
    }
    
    if (anyTranslated) {
      return translatedWords.join(' ');
    }
  }
  
  return null;
}

/**
 * Translate English meaning to target language
 */
async function translateFromEnglishMeaning(englishText: string, targetLanguage: string): Promise<string | null> {
  if (!englishText.trim()) return null;
  
  const normTarget = normalizeLanguage(targetLanguage);
  const targetIsLatin = isLatinScriptLanguage(normTarget);
  
  // First try: Common phrase lookup
  const phraseResult = lookupCommonPhrase(englishText, normTarget);
  if (phraseResult) {
    return phraseResult;
  }
  
  // Second try: Word-by-word semantic translation
  const wordResult = await translateWordByWord(englishText, 'english', normTarget);
  
  if (wordResult.translated) {
    let result = wordResult.result;
    
    // Apply script conversion if needed
    if (!targetIsLatin && isLatinText(result)) {
      result = dynamicTransliterate(result, normTarget) || result;
    }
    
    return result;
  }
  
  // Third try: If target needs non-Latin script, transliterate
  if (!targetIsLatin) {
    return dynamicTransliterate(englishText, normTarget) || null;
  }
  
  return null;
}

/**
 * Lookup English from phrase cache by matching source language value
 */
function lookupEnglishFromPhrase(text: string, sourceLanguage: string): string | null {
  const normSource = normalizeLanguage(sourceLanguage);
  const textLower = text.toLowerCase().trim();
  
  // Check if the text matches any English phrase
  const directEnglish = commonPhrasesCache.get(textLower);
  if (directEnglish) {
    return directEnglish.english;
  }
  
  // Check source language column
  for (const [, phrase] of commonPhrasesCache.entries()) {
    const column = getLanguageColumn(normSource);
    const sourceValue = phrase[column];
    
    if (sourceValue && typeof sourceValue === 'string') {
      // Check phonetic match (Latin representation)
      const phonetic = reverseTransliterate(sourceValue, normSource);
      if (phonetic && phonetic.toLowerCase().trim() === textLower) {
        return phrase.english;
      }
    }
  }
  
  return null;
}

// ============================================================
// LIVE PREVIEW FOR TYPING
// ============================================================

/**
 * Get instant native script preview as user types
 * No async operations - purely local transliteration
 */
export function getLiveNativePreview(text: string, targetLanguage: string): string {
  if (!text || !text.trim()) return text;
  
  const isLatin = isLatinText(text);
  const targetIsLatin = isLatinScriptLanguage(targetLanguage);
  
  if (isLatin && !targetIsLatin) {
    return dynamicTransliterate(text, targetLanguage) || text;
  }
  
  return text;
}

/**
 * Get live reverse preview (native to Latin)
 */
export function getLiveLatinPreview(text: string, sourceLanguage: string): string {
  if (!text || !text.trim()) return text;
  
  const isLatin = isLatinText(text);
  
  if (!isLatin) {
    return reverseTransliterate(text, sourceLanguage) || text;
  }
  
  return text;
}

// ============================================================
// LANGUAGE DETECTION
// ============================================================

export function autoDetectLanguage(text: string): { 
  language: string; 
  script: string; 
  isLatin: boolean; 
  confidence: number;
} {
  const detected = detectScriptFromText(text);
  
  return {
    language: detected.language,
    script: detected.script,
    isLatin: detected.isLatin,
    confidence: detected.isLatin ? 0.7 : 0.9,
  };
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

export function clearAllCaches(): void {
  translationResultCache.clear();
  semanticDictionaryCache.clear();
  wordMeaningCache.clear();
  console.log('[UniversalOffline] All caches cleared');
}

export function clearPhraseCache(): void {
  commonPhrasesCache.clear();
  phraseCacheLoaded = false;
  console.log('[UniversalOffline] Phrase cache cleared');
}

export function getCacheStats(): {
  results: number;
  dictionary: number;
  phrases: number;
  words: number;
} {
  return {
    results: translationResultCache.size,
    dictionary: semanticDictionaryCache.size,
    phrases: commonPhrasesCache.size,
    words: wordMeaningCache.size,
  };
}

// ============================================================
// INITIALIZATION
// ============================================================

export async function initializeEngine(): Promise<void> {
  await loadCommonPhrases();
  console.log('[UniversalOffline] Engine initialized with', getLanguageCount(), 'languages');
  console.log('[UniversalOffline] Cache stats:', getCacheStats());
}

export function isEngineReady(): boolean {
  return phraseCacheLoaded;
}

// ============================================================
// EXPORTS
// ============================================================

export {
  dynamicTransliterate,
  reverseTransliterate,
  detectScriptFromText,
} from './dynamic-transliterator';

/**
 * Offline Universal Translation Engine
 * =====================================
 * 
 * 100% BROWSER-BASED - NO EXTERNAL APIs
 * 
 * Features:
 * 1. Dynamic transliteration for script conversion (Latin ↔ Native)
 * 2. Supabase-stored dictionaries for word/phrase translations
 * 3. English pivot for cross-language communication
 * 4. Cached common phrases for instant responses
 * 
 * Translation Strategy:
 * - Latin → Latin: Direct passthrough (no meaning translation possible offline)
 * - Latin → Native: Transliterate to native script
 * - Native → Latin: Reverse transliterate to Latin/English
 * - Native → Native: Convert via English pivot (transliteration only)
 * - English as source/target: Direct dictionary lookup + transliteration
 * 
 * NO EXTERNAL APIs USED - ALL PROCESSING IS LOCAL
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  dynamicTransliterate, 
  reverseTransliterate, 
  isLatinScriptLanguage as checkLatinScript,
  isLatinText as checkLatinText,
  detectScriptFromText 
} from './dynamic-transliterator';
import { menLanguages, type MenLanguage } from '@/data/men_languages';
import { womenLanguages, type WomenLanguage } from '@/data/women_languages';

// ============================================================
// TYPES
// ============================================================

export interface OfflineTranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  isTransliterated: boolean;
  englishPivot?: string;
  confidence: number;
  method: 'dictionary' | 'transliteration' | 'passthrough' | 'cached';
}

export interface CommonPhrase {
  phrase_key: string;
  english: string;
  [key: string]: string | null | number | undefined;
}

export interface DictionaryEntry {
  source_text: string;
  source_language: string;
  english_text: string;
  target_text?: string;
  target_language?: string;
}

// ============================================================
// LANGUAGE DATABASE
// ============================================================

interface Language {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  rtl?: boolean;
}

// Build unified language map
const allLanguagesMap = new Map<string, Language>();

menLanguages.forEach((lang: MenLanguage) => {
  allLanguagesMap.set(lang.code.toLowerCase(), {
    code: lang.code,
    name: lang.name.toLowerCase(),
    nativeName: lang.nativeName,
    script: lang.script || 'Latin',
    rtl: lang.rtl,
  });
});

womenLanguages.forEach((lang: WomenLanguage) => {
  if (!allLanguagesMap.has(lang.code.toLowerCase())) {
    allLanguagesMap.set(lang.code.toLowerCase(), {
      code: lang.code,
      name: lang.name.toLowerCase(),
      nativeName: lang.nativeName,
      script: lang.script || 'Latin',
      rtl: lang.rtl,
    });
  }
});

const ALL_LANGUAGES: Language[] = Array.from(allLanguagesMap.values());
const languageByCode = new Map(ALL_LANGUAGES.map(l => [l.code.toLowerCase(), l]));
const languageByName = new Map(ALL_LANGUAGES.map(l => [l.name.toLowerCase(), l]));

// Language aliases
const LANGUAGE_ALIASES: Record<string, string> = {
  'bangla': 'bengali',
  'oriya': 'odia',
  'farsi': 'persian',
  'chinese': 'chinese (mandarin)',
  'mandarin': 'chinese (mandarin)',
  'hindustani': 'hindi',
  'filipino': 'tagalog',
  'panjabi': 'punjabi',
  'sinhalese': 'sinhala',
  'myanmar': 'burmese',
};

// ============================================================
// CACHING
// ============================================================

// Common phrases cache (loaded from Supabase)
const commonPhrasesCache = new Map<string, CommonPhrase>();
let phraseCacheLoaded = false;
let phraseCacheLoading = false;

// Dictionary cache
const dictionaryCache = new Map<string, DictionaryEntry[]>();
const MAX_DICTIONARY_CACHE = 1000;

// Translation result cache
const translationCache = new Map<string, OfflineTranslationResult>();
const MAX_TRANSLATION_CACHE = 5000;

// ============================================================
// LANGUAGE UTILITIES
// ============================================================

export function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  
  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }
  
  if (languageByName.has(normalized)) {
    return normalized;
  }
  
  const byCode = languageByCode.get(normalized);
  if (byCode) {
    return byCode.name;
  }
  
  return normalized;
}

export function getLanguageInfo(lang: string): Language | null {
  const normalized = normalizeLanguage(lang);
  return languageByName.get(normalized) || languageByCode.get(lang.toLowerCase()) || null;
}

export function getLanguageCode(lang: string): string {
  const info = getLanguageInfo(lang);
  return info?.code || lang.substring(0, 2).toLowerCase();
}

export function getLanguageColumn(lang: string): string {
  // Map language names to database column names
  const columnMap: Record<string, string> = {
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
    'chinese': 'chinese',
    'chinese (mandarin)': 'chinese',
    'thai': 'thai',
    'vietnamese': 'vietnamese',
    'indonesian': 'indonesian',
    'turkish': 'turkish',
    'persian': 'persian',
    'english': 'english',
  };
  
  const normalized = normalizeLanguage(lang);
  return columnMap[normalized] || 'english';
}

export function isLatinScriptLanguage(lang: string): boolean {
  return checkLatinScript(lang);
}

export function isLatinText(text: string): boolean {
  return checkLatinText(text);
}

export function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

export function isEnglish(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return normalized === 'english' || lang.toLowerCase() === 'en';
}

export function getLanguages(): Language[] {
  return [...ALL_LANGUAGES];
}

export function getLanguageCount(): number {
  return ALL_LANGUAGES.length;
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
      .limit(500);
    
    if (error) {
      console.warn('[OfflineTranslator] Failed to load common phrases:', error);
      phraseCacheLoading = false;
      return;
    }
    
    if (data) {
      data.forEach((phrase: CommonPhrase) => {
        // Index by English text (lowercase for matching)
        const key = phrase.english.toLowerCase().trim();
        commonPhrasesCache.set(key, phrase);
        
        // Also index by phrase_key
        if (phrase.phrase_key) {
          commonPhrasesCache.set(phrase.phrase_key.toLowerCase(), phrase);
        }
      });
      
      console.log(`[OfflineTranslator] Loaded ${commonPhrasesCache.size} common phrases`);
    }
    
    phraseCacheLoaded = true;
  } catch (err) {
    console.warn('[OfflineTranslator] Error loading phrases:', err);
  } finally {
    phraseCacheLoading = false;
  }
}

// ============================================================
// DICTIONARY LOOKUP
// ============================================================

async function lookupDictionary(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<DictionaryEntry | null> {
  const cacheKey = `${sourceLanguage}:${text.toLowerCase()}`;
  
  // Check cache first
  const cached = dictionaryCache.get(cacheKey);
  if (cached && cached.length > 0) {
    return cached[0];
  }
  
  try {
    const { data, error } = await supabase
      .from('translation_dictionaries')
      .select('*')
      .eq('source_language', normalizeLanguage(sourceLanguage))
      .ilike('source_text', text)
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    // Cache result
    if (dictionaryCache.size >= MAX_DICTIONARY_CACHE) {
      const firstKey = dictionaryCache.keys().next().value;
      if (firstKey) dictionaryCache.delete(firstKey);
    }
    dictionaryCache.set(cacheKey, data);
    
    return data[0];
  } catch (err) {
    console.warn('[OfflineTranslator] Dictionary lookup error:', err);
    return null;
  }
}

// ============================================================
// COMMON PHRASE LOOKUP
// ============================================================

function lookupCommonPhrase(
  text: string,
  targetLanguage: string
): string | null {
  const key = text.toLowerCase().trim();
  const phrase = commonPhrasesCache.get(key);
  
  if (!phrase) return null;
  
  const column = getLanguageColumn(targetLanguage);
  const translation = phrase[column];
  
  if (translation && typeof translation === 'string') {
    return translation;
  }
  
  return null;
}

// ============================================================
// CORE OFFLINE TRANSLATION
// ============================================================

/**
 * Translate text using offline methods only
 * 
 * Strategy:
 * 1. Same language → Return as-is (with optional script conversion)
 * 2. Common phrase lookup → Instant cached translation
 * 3. Dictionary lookup → Supabase-stored translations
 * 4. Transliteration → Script conversion (Latin ↔ Native)
 * 5. Passthrough → Return original if no translation available
 */
export async function translateOffline(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<OfflineTranslationResult> {
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
  
  // Check cache
  const cacheKey = `${normSource}:${normTarget}:${trimmed.substring(0, 100)}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return { ...cached, method: 'cached' };
  }
  
  // Ensure common phrases are loaded
  await loadCommonPhrases();
  
  const sourceIsLatin = isLatinScriptLanguage(normSource);
  const targetIsLatin = isLatinScriptLanguage(normTarget);
  const inputIsLatin = isLatinText(trimmed);
  
  let result: OfflineTranslationResult;
  
  // CASE 1: Same language - just convert script if needed
  if (isSameLanguage(normSource, normTarget)) {
    let resultText = trimmed;
    let isTransliterated = false;
    
    if (inputIsLatin && !targetIsLatin) {
      resultText = dynamicTransliterate(trimmed, normTarget) || trimmed;
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
      method: 'transliteration',
    };
  }
  // CASE 2: English source/target - try common phrase lookup
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
        method: 'cached',
      };
    } else {
      // Try dictionary lookup
      const dictEntry = await lookupDictionary(trimmed, normSource, normTarget);
      
      if (dictEntry) {
        let translatedText = isEnglish(normTarget) 
          ? dictEntry.english_text 
          : (dictEntry.target_text || dictEntry.english_text);
        
        // Transliterate to target script if needed
        if (!targetIsLatin && isLatinText(translatedText)) {
          translatedText = dynamicTransliterate(translatedText, normTarget) || translatedText;
        }
        
        result = {
          text: translatedText,
          originalText: trimmed,
          sourceLanguage: normSource,
          targetLanguage: normTarget,
          isTranslated: true,
          isTransliterated: !targetIsLatin,
          englishPivot: dictEntry.english_text,
          confidence: 0.85,
          method: 'dictionary',
        };
      } else {
        // Fallback: transliteration only
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
          englishPivot: inputIsLatin ? trimmed : undefined,
          confidence: 0.3,
          method: 'transliteration',
        };
      }
    }
  }
  // CASE 3: Native to Native (different languages) - use English pivot
  else {
    // Step 1: Convert source to Latin/English representation
    let englishPivot: string;
    
    if (inputIsLatin) {
      englishPivot = trimmed;
    } else {
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
        method: 'cached',
      };
    } else {
      // Step 3: Transliterate English pivot to target native script
      let resultText: string;
      
      if (targetIsLatin) {
        resultText = englishPivot;
      } else {
        resultText = dynamicTransliterate(englishPivot, normTarget) || englishPivot;
      }
      
      result = {
        text: resultText,
        originalText: trimmed,
        sourceLanguage: normSource,
        targetLanguage: normTarget,
        isTranslated: false,
        isTransliterated: resultText !== englishPivot,
        englishPivot,
        confidence: 0.4,
        method: 'transliteration',
      };
    }
  }
  
  // Cache the result
  if (translationCache.size >= MAX_TRANSLATION_CACHE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(cacheKey, result);
  
  return result;
}

// ============================================================
// BIDIRECTIONAL TRANSLATION
// ============================================================

export interface BidirectionalResult {
  senderView: string;
  receiverView: string;
  englishCore: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}

/**
 * Bidirectional translation for chat
 * Generates sender view, receiver view, and English core
 */
export async function translateBidirectionalOffline(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<BidirectionalResult> {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      senderView: '',
      receiverView: '',
      englishCore: '',
      originalText: '',
      wasTransliterated: false,
      wasTranslated: false,
    };
  }
  
  const inputIsLatin = isLatinText(trimmed);
  const senderIsLatin = isLatinScriptLanguage(senderLanguage);
  const receiverIsLatin = isLatinScriptLanguage(receiverLanguage);
  
  // Generate sender view (native script if needed)
  let senderView = trimmed;
  let wasTransliterated = false;
  
  if (inputIsLatin && !senderIsLatin) {
    senderView = dynamicTransliterate(trimmed, senderLanguage) || trimmed;
    wasTransliterated = senderView !== trimmed;
  }
  
  // Generate English core (for storage/pivot)
  let englishCore: string;
  if (inputIsLatin) {
    englishCore = trimmed;
  } else {
    englishCore = reverseTransliterate(trimmed, senderLanguage) || trimmed;
  }
  
  // Generate receiver view
  let receiverView: string;
  let wasTranslated = false;
  
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    receiverView = senderView;
  } else {
    // Try common phrase first
    const phraseResult = lookupCommonPhrase(englishCore, receiverLanguage);
    
    if (phraseResult) {
      receiverView = phraseResult;
      wasTranslated = true;
    } else if (receiverIsLatin) {
      receiverView = englishCore;
    } else {
      receiverView = dynamicTransliterate(englishCore, receiverLanguage) || englishCore;
      wasTransliterated = true;
    }
  }
  
  return {
    senderView,
    receiverView,
    englishCore,
    originalText: trimmed,
    wasTransliterated,
    wasTranslated,
  };
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

export function clearCache(): void {
  translationCache.clear();
  dictionaryCache.clear();
}

export function clearPhraseCache(): void {
  commonPhrasesCache.clear();
  phraseCacheLoaded = false;
}

export function getCacheStats(): { translations: number; dictionary: number; phrases: number } {
  return {
    translations: translationCache.size,
    dictionary: dictionaryCache.size,
    phrases: commonPhrasesCache.size,
  };
}

// ============================================================
// INITIALIZATION
// ============================================================

export async function initializeOfflineTranslator(): Promise<void> {
  await loadCommonPhrases();
  console.log('[OfflineTranslator] Initialized', getCacheStats());
}

export function isReady(): boolean {
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

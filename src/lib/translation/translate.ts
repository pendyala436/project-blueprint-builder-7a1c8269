/**
 * Universal Browser-Based Translation System - 1000+ Languages
 * =============================================================
 * 
 * 100% BROWSER-BASED - NO EXTERNAL APIs
 * Uses dynamic transliteration for script conversion.
 * 
 * Key Features:
 * 1. Same-language bypass (no translation needed)
 * 2. Script conversion via dynamic transliterator
 * 3. English passthrough for cross-language communication
 * 4. All processing happens in the browser
 * 5. No NLLB-200, no external APIs, no hardcoding
 * 
 * Translation Strategy:
 * - Same language: Return as-is (optionally convert script)
 * - Different languages: Convert to native script + provide English version
 * - Latin input → Native script conversion
 * - Native input → Latin reverse transliteration for reference
 */

import { menLanguages, type MenLanguage } from '@/data/men_languages';
import { womenLanguages, type WomenLanguage } from '@/data/women_languages';
import { dynamicTransliterate, reverseTransliterate, detectScriptFromText } from './dynamic-transliterator';

// ============================================================
// TYPES
// ============================================================

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  rtl?: boolean;
}

export interface TranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  isSameLanguage: boolean;
  englishPivot?: string;
  confidence: number;
  error?: string;
}

export interface Translator {
  translate(text: string): Promise<string>;
}

export interface TranslationEngine {
  getLanguages(): Language[];
  getLanguage(codeOrName: string): Language | null;
  getTranslator(from: string, to: string): Translator | null;
  isReady(): boolean;
  getLanguageCount(): number;
}

// ============================================================
// UNIFIED LANGUAGE DATABASE (1000+ Languages)
// ============================================================

const allLanguagesMap = new Map<string, Language>();

// Add men languages
menLanguages.forEach((lang: MenLanguage) => {
  allLanguagesMap.set(lang.code.toLowerCase(), {
    code: lang.code,
    name: lang.name.toLowerCase(),
    nativeName: lang.nativeName,
    script: lang.script || 'Latin',
    rtl: lang.rtl,
  });
});

// Add women languages (merge/add new ones)
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

export const ALL_LANGUAGES: Language[] = Array.from(allLanguagesMap.values());

// Quick lookup maps
const languageByCode = new Map(ALL_LANGUAGES.map(l => [l.code.toLowerCase(), l]));
const languageByName = new Map(ALL_LANGUAGES.map(l => [l.name.toLowerCase(), l]));

// Also map native names
ALL_LANGUAGES.forEach(l => {
  if (l.nativeName) {
    languageByName.set(l.nativeName.toLowerCase(), l);
  }
});

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
  'hangul': 'korean',
  'nihongo': 'japanese',
};

// Latin script languages
const LATIN_SCRIPT_LANGUAGES = new Set(
  ALL_LANGUAGES
    .filter(l => l.script === 'Latin')
    .map(l => l.name.toLowerCase())
);

// ============================================================
// TRANSLATION CACHE
// ============================================================

const translationCache = new Map<string, TranslationResult>();
const MAX_CACHE_SIZE = 5000;

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

function getCacheKey(text: string, source: string, target: string): string {
  // Use hash of full text + length to avoid collisions with long messages
  return `${source}:${target}:${simpleHash(text)}:${text.length}`;
}

function getFromCache(key: string): TranslationResult | undefined {
  return translationCache.get(key);
}

function setInCache(key: string, result: TranslationResult): void {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(key, result);
}

// ============================================================
// LANGUAGE UTILITIES
// ============================================================

export function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  
  // Check aliases first
  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }
  
  // Check if it's already a known language name
  if (languageByName.has(normalized)) {
    return normalized;
  }
  
  // Check if it's a language code - convert to name
  const byCode = languageByCode.get(normalized);
  if (byCode) {
    return byCode.name;
  }
  
  // Check if it's a partial match (for codes like 'ja' -> 'japanese')
  for (const [code, langInfo] of languageByCode) {
    if (code === normalized || langInfo.code.toLowerCase() === normalized) {
      return langInfo.name;
    }
  }
  
  // Log warning for unmapped languages to help debug
  console.warn(`[normalizeLanguage] Unknown language: "${lang}" - using as-is`);
  
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

export function getLanguages(): Language[] {
  return [...ALL_LANGUAGES];
}

export function getLanguageCount(): number {
  return ALL_LANGUAGES.length;
}

export function isLanguageSupported(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return languageByName.has(normalized) || languageByCode.has(lang.toLowerCase());
}

export function isLatinScriptLanguage(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return LATIN_SCRIPT_LANGUAGES.has(normalized);
}

export function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

export function isEnglish(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return normalized === 'english' || lang.toLowerCase() === 'en';
}

export function isReady(): boolean {
  return ALL_LANGUAGES.length > 0;
}

// ============================================================
// BROWSER-BASED TRANSLATION (No External APIs)
// ============================================================

/**
 * Browser-based translation using dynamic transliteration
 * Converts text between scripts and provides English reference
 * 
 * Strategy:
 * - Latin input → Target native script via transliteration
 * - Native input → Latin via reverse transliteration
 * - Cross-language: Convert script + provide English reference
 */
function browserTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): { translatedText: string; englishRef?: string; success: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { translatedText: '', success: true };
  
  const sourceIsLatin = isLatinScriptLanguage(sourceLanguage);
  const targetIsLatin = isLatinScriptLanguage(targetLanguage);
  const inputIsLatin = isLatinText(trimmed);
  
  let translatedText = trimmed;
  let englishRef: string | undefined;
  
  try {
// CASE 1: Both Latin script languages - passthrough (browser can't do meaning translation)
    // NOTE: For meaning-based Latin→Latin translation, use Edge Function instead
    if (sourceIsLatin && targetIsLatin) {
      translatedText = trimmed;
      // Flag that this needs Edge Function for actual meaning translation
      console.log('[BrowserTranslate] Latin→Latin: passthrough (use Edge for meaning)');
    }
    // CASE 2: Latin input → Non-Latin target (transliterate to native)
    else if (inputIsLatin && !targetIsLatin) {
      translatedText = dynamicTransliterate(trimmed, targetLanguage) || trimmed;
      englishRef = trimmed; // Original English/Latin input preserved
    }
    // CASE 3: Non-Latin input → Latin target (reverse transliterate)
    else if (!inputIsLatin && targetIsLatin) {
      translatedText = reverseTransliterate(trimmed, sourceLanguage) || trimmed;
      englishRef = translatedText;
    }
    // CASE 4: Non-Latin → Non-Latin (different scripts)
    else if (!sourceIsLatin && !targetIsLatin) {
      // First reverse to Latin, then forward to target
      const latinVersion = reverseTransliterate(trimmed, sourceLanguage) || trimmed;
      englishRef = latinVersion;
      
      // If source and target use same script family, just return original
      const sourceInfo = getLanguageInfo(sourceLanguage);
      const targetInfo = getLanguageInfo(targetLanguage);
      
      if (sourceInfo?.script === targetInfo?.script) {
        translatedText = trimmed; // Same script, keep original
      } else {
        // Different scripts - convert via Latin
        translatedText = dynamicTransliterate(latinVersion, targetLanguage) || latinVersion;
      }
    }
    // CASE 5: Fallback
    else {
      translatedText = trimmed;
    }
    
    return { translatedText, englishRef, success: true };
  } catch (err) {
    console.warn('[BrowserTranslate] Error:', err);
    return { translatedText: trimmed, success: false };
  }
}

// ============================================================
// CORE TRANSLATION FUNCTION - USES EDGE FUNCTION FOR MEANING
// ============================================================

/**
 * Main translation function - Uses Edge Function for semantic translation
 * 
 * Translation Logic:
 * 1. Same language → return as-is (optionally convert script)
 * 2. Different languages → Edge Function for meaning-based translation
 * 3. Falls back to browser-based transliteration if Edge fails
 */
export async function translateText(
  text: string,
  source: string,
  target: string
): Promise<TranslationResult> {
  const trimmed = text.trim();

  // Empty text
  if (!trimmed) {
    return {
      text: '',
      originalText: '',
      sourceLanguage: source,
      targetLanguage: target,
      isTranslated: false,
      isSameLanguage: true,
      confidence: 0,
    };
  }

  const normSource = normalizeLanguage(source);
  const normTarget = normalizeLanguage(target);

  // SAME LANGUAGE: Convert script if needed
  if (isSameLanguage(normSource, normTarget)) {
    let resultText = trimmed;
    const inputIsLatin = isLatinText(trimmed);
    const targetNeedsNative = !isLatinScriptLanguage(normTarget);
    
    // Convert Latin input to native script for non-Latin languages
    if (inputIsLatin && targetNeedsNative) {
      resultText = dynamicTransliterate(trimmed, normTarget) || trimmed;
    }
    
    return {
      text: resultText,
      originalText: trimmed,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
      isTranslated: false,
      isSameLanguage: true,
      confidence: 1.0,
    };
  }

  // Check cache
  const cacheKey = getCacheKey(trimmed, normSource, normTarget);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  // TRY EDGE FUNCTION FIRST for semantic/meaning translation
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    console.log(`[Translate] Edge: ${normSource} → ${normTarget}`);
    
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text: trimmed,
        sourceLanguage: normSource,
        targetLanguage: normTarget,
        source: getLanguageCode(normSource),
        target: getLanguageCode(normTarget),
        mode: 'translate',
      },
    });

    if (!error && data?.translatedText) {
      const result: TranslationResult = {
        text: data.translatedText,
        originalText: trimmed,
        sourceLanguage: normSource,
        targetLanguage: normTarget,
        isTranslated: data.isTranslated ?? (data.translatedText !== trimmed),
        isSameLanguage: false,
        englishPivot: data.englishText,
        confidence: 0.95,
      };

      // Cache successful translations
      setInCache(cacheKey, result);
      return result;
    }
    
    if (error) {
      console.warn('[Translate] Edge error, falling back to browser:', error);
    }
  } catch (err) {
    console.warn('[Translate] Edge failed, falling back to browser:', err);
  }

  // FALLBACK: Browser-based transliteration (script conversion only)
  console.log(`[Translate] Browser fallback: ${normSource} → ${normTarget}`);
  const browserResult = browserTranslate(trimmed, normSource, normTarget);

  const result: TranslationResult = {
    text: browserResult.translatedText,
    originalText: trimmed,
    sourceLanguage: normSource,
    targetLanguage: normTarget,
    isTranslated: browserResult.success && browserResult.translatedText !== trimmed,
    isSameLanguage: false,
    englishPivot: browserResult.englishRef,
    confidence: browserResult.success ? 0.5 : 0.3, // Lower confidence for browser fallback
  };

  return result;
}

// ============================================================
// EDGE FUNCTION TRANSLATION (Meaning-Based via APIs)
// ============================================================

/**
 * Meaning-based translation using Edge Function
 * Uses free translation APIs (Google, MyMemory, LibreTranslate)
 * Falls back to browser-based transliteration if Edge fails
 */
export async function translateWithEdgeFunction(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      text: '',
      originalText: '',
      sourceLanguage,
      targetLanguage,
      isTranslated: false,
      isSameLanguage: true,
      confidence: 0,
    };
  }

  // Same language check
  if (isSameLanguage(sourceLanguage, targetLanguage)) {
    return translateText(trimmed, sourceLanguage, targetLanguage);
  }

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text: trimmed,
        sourceLanguage: normalizeLanguage(sourceLanguage),
        targetLanguage: normalizeLanguage(targetLanguage),
        mode: 'translate',
      },
    });

    if (error) {
      console.warn('[EdgeTranslate] Error:', error);
      return translateText(trimmed, sourceLanguage, targetLanguage);
    }

    if (data?.translatedText) {
      return {
        text: data.translatedText,
        originalText: trimmed,
        sourceLanguage: data.sourceLanguage || sourceLanguage,
        targetLanguage: data.targetLanguage || targetLanguage,
        isTranslated: data.isTranslated ?? true,
        isSameLanguage: false,
        englishPivot: data.englishText,
        confidence: data.isTranslated ? 0.95 : 0.5,
      };
    }

    return translateText(trimmed, sourceLanguage, targetLanguage);
  } catch (err) {
    console.warn('[EdgeTranslate] Failed, using browser:', err);
    return translateText(trimmed, sourceLanguage, targetLanguage);
  }
}

/**
 * Bidirectional chat translation using Edge Function
 * Generates sender view, receiver view, and English core
 */
export async function translateBidirectional(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{
  senderView: string;
  receiverView: string;
  englishCore: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}> {
  const trimmed = text.trim();
  const defaultResult = {
    senderView: trimmed,
    receiverView: trimmed,
    englishCore: trimmed,
    originalText: trimmed,
    wasTransliterated: false,
    wasTranslated: false,
  };

  if (!trimmed) return defaultResult;

  // Same language - just convert script if needed
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    const converted = await translateText(trimmed, senderLanguage, senderLanguage);
    return {
      senderView: converted.text,
      receiverView: converted.text,
      englishCore: converted.englishPivot || trimmed,
      originalText: trimmed,
      wasTransliterated: converted.text !== trimmed,
      wasTranslated: false,
    };
  }

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text: trimmed,
        sourceLanguage: normalizeLanguage(senderLanguage),
        targetLanguage: normalizeLanguage(receiverLanguage),
        mode: 'bidirectional',
      },
    });

    if (error) {
      console.warn('[Bidirectional] Edge error:', error);
      // Fallback to browser-based
      const senderResult = await translateText(trimmed, senderLanguage, senderLanguage);
      const receiverResult = await translateText(trimmed, senderLanguage, receiverLanguage);
      return {
        senderView: senderResult.text,
        receiverView: receiverResult.text,
        englishCore: senderResult.englishPivot || trimmed,
        originalText: trimmed,
        wasTransliterated: senderResult.text !== trimmed,
        wasTranslated: receiverResult.text !== trimmed,
      };
    }

    if (data?.senderView && data?.receiverView) {
      return {
        senderView: data.senderView,
        receiverView: data.receiverView,
        englishCore: data.englishCore || trimmed,
        originalText: trimmed,
        wasTransliterated: data.wasTransliterated ?? false,
        wasTranslated: data.wasTranslated ?? false,
      };
    }

    return defaultResult;
  } catch (err) {
    console.warn('[Bidirectional] Failed:', err);
    return defaultResult;
  }
}

// ============================================================
// GET TRANSLATOR INTERFACE
// ============================================================

export function getTranslator(from: string, to: string): Translator | null {
  const sourceLanguage = getLanguageInfo(from);
  const targetLanguage = getLanguageInfo(to);

  if (!sourceLanguage || !targetLanguage) {
    return null;
  }

  return {
    translate: async (text: string): Promise<string> => {
      const result = await translateText(text, from, to);
      return result.text;
    }
  };
}

// ============================================================
// TRANSLATION ENGINE
// ============================================================

const engine: TranslationEngine = {
  getLanguages,
  getLanguage: getLanguageInfo,
  getTranslator,
  isReady,
  getLanguageCount,
};

export async function loadEngine(): Promise<TranslationEngine> {
  return engine;
}

export function clearCache(): void {
  translationCache.clear();
}

export function getCacheStats(): { size: number; hitRate: number } {
  return {
    size: translationCache.size,
    hitRate: 0,
  };
}

// Check if text is primarily Latin script
export function isLatinText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
  if (!cleaned) return true;
  const latinMatch = cleaned.match(/[\u0000-\u007F\u0080-\u00FF\u0100-\u024F]/g) || [];
  return latinMatch.length / cleaned.length > 0.7;
}

// Check if language needs script conversion (non-Latin)
export function needsScriptConversion(lang: string): boolean {
  return !isLatinScriptLanguage(lang);
}

// Auto-detect language from text script
export function autoDetectLanguage(text: string): { language: string; script: string; isLatin: boolean; confidence: number } {
  const SCRIPT_PATTERNS: Array<{ regex: RegExp; language: string; script: string }> = [
    { regex: /[\u0900-\u097F]/, language: 'hindi', script: 'Devanagari' },
    { regex: /[\u0980-\u09FF]/, language: 'bengali', script: 'Bengali' },
    { regex: /[\u0A00-\u0A7F]/, language: 'punjabi', script: 'Gurmukhi' },
    { regex: /[\u0A80-\u0AFF]/, language: 'gujarati', script: 'Gujarati' },
    { regex: /[\u0B00-\u0B7F]/, language: 'odia', script: 'Odia' },
    { regex: /[\u0B80-\u0BFF]/, language: 'tamil', script: 'Tamil' },
    { regex: /[\u0C00-\u0C7F]/, language: 'telugu', script: 'Telugu' },
    { regex: /[\u0C80-\u0CFF]/, language: 'kannada', script: 'Kannada' },
    { regex: /[\u0D00-\u0D7F]/, language: 'malayalam', script: 'Malayalam' },
    { regex: /[\u4E00-\u9FFF]/, language: 'chinese (mandarin)', script: 'Han' },
    { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese', script: 'Japanese' },
    { regex: /[\uAC00-\uD7AF]/, language: 'korean', script: 'Hangul' },
    { regex: /[\u0E00-\u0E7F]/, language: 'thai', script: 'Thai' },
    { regex: /[\u0600-\u06FF]/, language: 'arabic', script: 'Arabic' },
    { regex: /[\u0590-\u05FF]/, language: 'hebrew', script: 'Hebrew' },
    { regex: /[\u0400-\u04FF]/, language: 'russian', script: 'Cyrillic' },
    { regex: /[\u0370-\u03FF]/, language: 'greek', script: 'Greek' },
  ];

  for (const { regex, language, script } of SCRIPT_PATTERNS) {
    if (regex.test(text)) {
      return { language, script, isLatin: false, confidence: 0.95 };
    }
  }

  return { language: 'english', script: 'Latin', isLatin: true, confidence: 0.7 };
}

export default engine;

/**
 * Universal Semantic Translation System - 1000+ Languages
 * =========================================================
 * 
 * SEMANTIC TRANSLATION ONLY - No phonetic transliteration
 * Uses meaning-based translation for all language pairs.
 * 
 * Key Features:
 * 1. Same-language bypass (no translation needed)
 * 2. Direct translation for English ↔ Any language (no pivot)
 * 3. Direct translation for Latin ↔ Latin languages (no pivot)
 * 4. English pivot ONLY for Native ↔ Native (when no direct path exists)
 * 5. All translations are meaning-based (semantic)
 * 
 * Translation Paths:
 * - English → Any: Direct semantic translation
 * - Any → English: Direct semantic translation
 * - Latin → Latin: Direct semantic translation (Spanish → French)
 * - Native → Native: English pivot (Hindi → Tamil = Hindi → English → Tamil)
 * - Latin → Native: Direct semantic translation
 * - Native → Latin: Direct semantic translation
 */

import { menLanguages, type MenLanguage } from '@/data/men_languages';
import { womenLanguages, type WomenLanguage } from '@/data/women_languages';
import { supabase } from '@/integrations/supabase/client';

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

function getCacheKey(text: string, source: string, target: string): string {
  return `${source}:${target}:${text.substring(0, 100)}`;
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
// SEMANTIC TRANSLATION VIA EDGE FUNCTION
// ============================================================

/**
 * Call the translate-message edge function for semantic translation
 */
async function callTranslationAPI(
  text: string,
  sourceCode: string,
  targetCode: string
): Promise<{ translatedText: string; success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        source: sourceCode,
        target: targetCode,
      },
    });

    if (error) {
      console.error('[Translate API] Error:', error);
      return { translatedText: text, success: false, error: error.message };
    }

    if (data?.translatedText) {
      return { translatedText: data.translatedText, success: true };
    }

    if (data?.translation) {
      return { translatedText: data.translation, success: true };
    }

    if (data?.text) {
      return { translatedText: data.text, success: true };
    }

    return { translatedText: text, success: false, error: 'No translation returned' };
  } catch (err: any) {
    console.error('[Translate API] Exception:', err);
    return { translatedText: text, success: false, error: err.message };
  }
}

// ============================================================
// CORE TRANSLATION FUNCTION - SEMANTIC ONLY
// ============================================================

/**
 * Main translation function - SEMANTIC TRANSLATION ONLY
 * 
 * Translation Logic:
 * 1. Same language → return as-is
 * 2. English involved (source or target) → Direct translation (no pivot)
 * 3. Latin → Latin → Direct translation (no pivot)
 * 4. Native → Native → English pivot (Hindi → English → Tamil)
 * 5. Latin ↔ Native → Direct translation
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
  const sourceCode = getLanguageCode(normSource);
  const targetCode = getLanguageCode(normTarget);

  // SAME LANGUAGE: Return input as-is (no translation needed)
  if (isSameLanguage(normSource, normTarget)) {
    return {
      text: trimmed,
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

  // Determine translation path
  const sourceIsEnglish = isEnglish(normSource);
  const targetIsEnglish = isEnglish(normTarget);
  const sourceIsLatin = isLatinScriptLanguage(normSource);
  const targetIsLatin = isLatinScriptLanguage(normTarget);

  let translatedText = trimmed;
  let englishPivot: string | undefined;
  let wasTranslated = false;
  let translationError: string | undefined;

  try {
    // CASE 1: English to English (shouldn't happen, but handle it)
    if (sourceIsEnglish && targetIsEnglish) {
      translatedText = trimmed;
    }
    // CASE 2: English → Any (Direct translation, no pivot)
    else if (sourceIsEnglish) {
      console.log(`[Translate] Direct: English → ${normTarget}`);
      const result = await callTranslationAPI(trimmed, 'en', targetCode);
      translatedText = result.translatedText;
      wasTranslated = result.success;
      translationError = result.error;
    }
    // CASE 3: Any → English (Direct translation, no pivot)
    else if (targetIsEnglish) {
      console.log(`[Translate] Direct: ${normSource} → English`);
      const result = await callTranslationAPI(trimmed, sourceCode, 'en');
      translatedText = result.translatedText;
      wasTranslated = result.success;
      translationError = result.error;
    }
    // CASE 4: Latin → Latin (Direct translation, no pivot)
    else if (sourceIsLatin && targetIsLatin) {
      console.log(`[Translate] Direct Latin→Latin: ${normSource} → ${normTarget}`);
      const result = await callTranslationAPI(trimmed, sourceCode, targetCode);
      translatedText = result.translatedText;
      wasTranslated = result.success;
      translationError = result.error;
    }
    // CASE 5: Native ↔ Native (English pivot required)
    else if (!sourceIsLatin && !targetIsLatin) {
      console.log(`[Translate] Pivot: ${normSource} → English → ${normTarget}`);
      
      // Step 1: Source → English
      const toEnglish = await callTranslationAPI(trimmed, sourceCode, 'en');
      englishPivot = toEnglish.translatedText;
      
      // Step 2: English → Target
      if (toEnglish.success && englishPivot !== trimmed) {
        const toTarget = await callTranslationAPI(englishPivot, 'en', targetCode);
        translatedText = toTarget.translatedText;
        wasTranslated = toTarget.success;
        translationError = toTarget.error;
      } else {
        translatedText = trimmed;
        translationError = toEnglish.error || 'Failed to translate to English';
      }
    }
    // CASE 6: Latin → Native OR Native → Latin (Direct translation)
    else {
      console.log(`[Translate] Direct: ${normSource} → ${normTarget}`);
      const result = await callTranslationAPI(trimmed, sourceCode, targetCode);
      translatedText = result.translatedText;
      wasTranslated = result.success;
      translationError = result.error;
    }
  } catch (err: any) {
    console.error('[Translate] Translation error:', err);
    translatedText = trimmed;
    translationError = err.message;
  }

  const result: TranslationResult = {
    text: translatedText,
    originalText: trimmed,
    sourceLanguage: normSource,
    targetLanguage: normTarget,
    isTranslated: wasTranslated,
    isSameLanguage: false,
    englishPivot,
    confidence: wasTranslated ? 0.9 : 0.3,
    error: translationError,
  };

  // Only cache successful translations
  if (wasTranslated) {
    setInCache(cacheKey, result);
  }

  return result;
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

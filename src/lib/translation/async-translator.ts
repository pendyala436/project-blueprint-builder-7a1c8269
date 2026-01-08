/**
 * Async Translation Service - Edge Function Only
 * ===============================================
 * Clean, simple translation using Supabase Edge Function only.
 * NO browser-based NLLB model - all translation via server.
 * 
 * FEATURES:
 * 1. Supports ALL 200+ NLLB languages via Edge Function
 * 2. Auto-detect source language from script
 * 3. Live native script preview (instant, via dynamic transliterator)
 * 4. Background translation via Edge Function
 * 5. Caching for performance
 */

import { supabase } from '@/integrations/supabase/client';
import { dynamicTransliterate } from '@/lib/translation/dynamic-transliterator';

// ============================================================
// TYPES
// ============================================================

export interface AsyncTranslationResult {
  text: string;
  originalText: string;
  isTranslated: boolean;
  sourceLanguage?: string;
  targetLanguage?: string;
  detectedLanguage?: string;
  error?: string;
}

export interface AutoDetectedLanguage {
  language: string;
  script: string;
  isLatin: boolean;
  confidence: number;
}

// ============================================================
// TRANSLATION CACHE (In-memory LRU)
// ============================================================

interface CacheEntry {
  result: AsyncTranslationResult;
  timestamp: number;
  hits: number;
}

const translationCache = new Map<string, CacheEntry>();
const nativeScriptCache = new Map<string, string>();
const detectionCache = new Map<string, AutoDetectedLanguage>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 5000;

function getCacheKey(text: string, source: string, target: string): string {
  return `${source.toLowerCase()}:${target.toLowerCase()}:${text.slice(0, 100)}`;
}

function getFromCache(key: string): AsyncTranslationResult | null {
  const entry = translationCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    entry.hits++;
    return entry.result;
  }
  return null;
}

function setInCache(key: string, result: AsyncTranslationResult): void {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const oldest = [...translationCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) translationCache.delete(oldest[0]);
  }
  translationCache.set(key, { result, timestamp: Date.now(), hits: 0 });
}

// ============================================================
// LANGUAGE UTILITIES (Sync, instant)
// ============================================================

const LATIN_SCRIPT_LANGUAGES = new Set([
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
  'turkish', 'tr', 'tur', 'vietnamese', 'vi', 'vie', 'indonesian', 'id', 'ind',
  'malay', 'ms', 'zsm', 'tagalog', 'tl', 'tgl', 'filipino', 'fil',
  'javanese', 'jv', 'jav', 'sundanese', 'su', 'sun', 'cebuano', 'ceb',
  'swahili', 'sw', 'swh', 'afrikaans', 'af', 'afr', 'yoruba', 'yo', 'yor',
  'igbo', 'ig', 'ibo', 'hausa', 'ha', 'hau', 'zulu', 'zu', 'zul',
  'somali', 'so', 'som', 'malagasy', 'mg', 'plt',
]);

export function isLatinScriptLanguage(language: string): boolean {
  return LATIN_SCRIPT_LANGUAGES.has(language.toLowerCase().trim());
}

export function isLatinText(text: string): boolean {
  if (!text.trim()) return true;
  const latinChars = text.match(/[a-zA-Z]/g)?.length || 0;
  const totalAlpha = text.match(/\p{L}/gu)?.length || 1;
  return latinChars / totalAlpha > 0.5;
}

export function normalizeLanguage(lang: string): string {
  const l = lang.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'en': 'english', 'eng': 'english',
    'hi': 'hindi', 'hin': 'hindi',
    'te': 'telugu', 'tel': 'telugu',
    'ta': 'tamil', 'tam': 'tamil',
    'kn': 'kannada', 'kan': 'kannada',
    'ml': 'malayalam', 'mal': 'malayalam',
    'bn': 'bengali', 'ben': 'bengali',
    'mr': 'marathi', 'mar': 'marathi',
    'gu': 'gujarati', 'guj': 'gujarati',
    'pa': 'punjabi', 'pan': 'punjabi',
    'or': 'odia', 'ori': 'odia', 'oriya': 'odia',
    'ur': 'urdu', 'urd': 'urdu',
    'es': 'spanish', 'spa': 'spanish',
    'fr': 'french', 'fra': 'french',
    'de': 'german', 'deu': 'german',
    'zh': 'chinese', 'zho': 'chinese',
    'ja': 'japanese', 'jpn': 'japanese',
    'ko': 'korean', 'kor': 'korean',
    'ar': 'arabic', 'ara': 'arabic',
    'ru': 'russian', 'rus': 'russian',
    'pt': 'portuguese', 'por': 'portuguese',
    'th': 'thai', 'tha': 'thai',
    'vi': 'vietnamese', 'vie': 'vietnamese',
    'tr': 'turkish', 'tur': 'turkish',
  };
  return aliases[l] || l;
}

export function isSameLanguage(lang1: string, lang2: string): boolean {
  return normalizeLanguage(lang1) === normalizeLanguage(lang2);
}

export function needsScriptConversion(language: string): boolean {
  return !isLatinScriptLanguage(language);
}

// ============================================================
// AUTO-DETECT LANGUAGE (Sync, instant)
// ============================================================

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
  { regex: /[\u0D80-\u0DFF]/, language: 'sinhala', script: 'Sinhala' },
  { regex: /[\u4E00-\u9FFF]/, language: 'chinese', script: 'Han' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese', script: 'Kana' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: 'korean', script: 'Hangul' },
  { regex: /[\u0E00-\u0E7F]/, language: 'thai', script: 'Thai' },
  { regex: /[\u0E80-\u0EFF]/, language: 'lao', script: 'Lao' },
  { regex: /[\u1000-\u109F]/, language: 'burmese', script: 'Myanmar' },
  { regex: /[\u1780-\u17FF]/, language: 'khmer', script: 'Khmer' },
  { regex: /[\u0600-\u06FF]/, language: 'arabic', script: 'Arabic' },
  { regex: /[\u0590-\u05FF]/, language: 'hebrew', script: 'Hebrew' },
  { regex: /[\u0400-\u04FF]/, language: 'russian', script: 'Cyrillic' },
  { regex: /[\u0370-\u03FF]/, language: 'greek', script: 'Greek' },
  { regex: /[\u10A0-\u10FF]/, language: 'georgian', script: 'Georgian' },
  { regex: /[\u0530-\u058F]/, language: 'armenian', script: 'Armenian' },
  { regex: /[\u1200-\u137F]/, language: 'amharic', script: 'Ethiopic' },
];

export function autoDetectLanguageSync(text: string): AutoDetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) {
    return { language: 'english', script: 'Latin', isLatin: true, confidence: 0 };
  }

  const cacheKey = trimmed.slice(0, 50);
  const cached = detectionCache.get(cacheKey);
  if (cached) return cached;

  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      const result: AutoDetectedLanguage = {
        language: pattern.language,
        script: pattern.script,
        isLatin: false,
        confidence: 0.95,
      };
      if (detectionCache.size >= MAX_CACHE_SIZE) {
        const firstKey = detectionCache.keys().next().value;
        if (firstKey) detectionCache.delete(firstKey);
      }
      detectionCache.set(cacheKey, result);
      return result;
    }
  }

  const result: AutoDetectedLanguage = {
    language: 'english',
    script: 'Latin',
    isLatin: true,
    confidence: 0.6,
  };
  detectionCache.set(cacheKey, result);
  return result;
}

// ============================================================
// NATIVE SCRIPT PREVIEW (Instant, uses dynamic transliterator)
// ============================================================

export function getNativeScriptPreview(text: string, targetLanguage: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  if (isLatinScriptLanguage(targetLanguage)) {
    return trimmed;
  }

  if (!isLatinText(trimmed)) {
    return trimmed;
  }

  const cacheKey = `${targetLanguage}:${trimmed.slice(0, 50)}`;
  const cached = nativeScriptCache.get(cacheKey);
  if (cached) return cached;

  try {
    const result = dynamicTransliterate(trimmed, targetLanguage);
    if (result && result !== trimmed) {
      if (nativeScriptCache.size >= MAX_CACHE_SIZE) {
        const firstKey = nativeScriptCache.keys().next().value;
        if (firstKey) nativeScriptCache.delete(firstKey);
      }
      nativeScriptCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('[AsyncTranslator] Transliteration failed:', err);
  }

  return trimmed;
}

// ============================================================
// EDGE FUNCTION TRANSLATION (Server-side NLLB)
// ============================================================

export async function translateAsync(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  autoDetect: boolean = false
): Promise<AsyncTranslationResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    return { text: '', originalText: '', isTranslated: false };
  }

  let normSource = normalizeLanguage(sourceLanguage);
  const normTarget = normalizeLanguage(targetLanguage);

  // Auto-detect source language from text if enabled or if source is 'auto' or 'english' for non-Latin text
  if (autoDetect || sourceLanguage === 'auto') {
    const detected = autoDetectLanguageSync(trimmed);
    if (!detected.isLatin && detected.confidence > 0.8) {
      normSource = detected.language;
      console.log(`[AsyncTranslator] Auto-detected source: ${normSource}`);
    }
  }

  if (isSameLanguage(normSource, normTarget)) {
    return {
      text: trimmed,
      originalText: trimmed,
      isTranslated: false,
      sourceLanguage: normSource,
      targetLanguage: normTarget,
    };
  }

  const cacheKey = getCacheKey(trimmed, normSource, normTarget);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[AsyncTranslator] Cache hit');
    return cached;
  }

  console.log('[AsyncTranslator] Calling Edge Function translate-message:', {
    text: trimmed.substring(0, 30),
    source: normSource,
    target: normTarget,
    autoDetect,
  });

  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text: trimmed,
        sourceLanguage: normSource,
        targetLanguage: normTarget,
        mode: 'translate',
      },
    });

    if (error) {
      console.error('[AsyncTranslator] Edge function error:', error);
      return { text: trimmed, originalText: trimmed, isTranslated: false, error: error.message };
    }

    const result: AsyncTranslationResult = {
      text: data?.translatedText || trimmed,
      originalText: trimmed,
      isTranslated: data?.isTranslated || false,
      sourceLanguage: data?.sourceLanguage || normSource,
      targetLanguage: data?.targetLanguage || normTarget,
      detectedLanguage: data?.detectedLanguage,
    };

    if (result.isTranslated) {
      setInCache(cacheKey, result);
    }

    console.log('[AsyncTranslator] Edge function result:', {
      translated: result.text?.substring(0, 30),
      isTranslated: result.isTranslated,
    });

    return result;
  } catch (err) {
    console.error('[AsyncTranslator] Translation error:', err);
    return {
      text: trimmed,
      originalText: trimmed,
      isTranslated: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================
// BACKGROUND TRANSLATION (Non-blocking)
// ============================================================

export function translateInBackground(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  callback: (result: AsyncTranslationResult) => void
): void {
  console.log('[AsyncTranslator] translateInBackground:', {
    text: text.substring(0, 30),
    source: sourceLanguage,
    target: targetLanguage,
  });

  translateAsync(text, sourceLanguage, targetLanguage)
    .then(callback)
    .catch((err) => {
      console.error('[AsyncTranslator] Background translation error:', err);
      callback({
        text,
        originalText: text,
        isTranslated: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });
}

// ============================================================
// NATIVE SCRIPT CONVERSION (Via Edge Function)
// ============================================================

export async function convertToNativeScriptAsync(
  text: string,
  targetLanguage: string
): Promise<AsyncTranslationResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    return { text: '', originalText: '', isTranslated: false };
  }

  if (isLatinScriptLanguage(targetLanguage)) {
    return { text: trimmed, originalText: trimmed, isTranslated: false };
  }

  if (!isLatinText(trimmed)) {
    return { text: trimmed, originalText: trimmed, isTranslated: false };
  }

  // Try instant transliteration first
  const instant = getNativeScriptPreview(trimmed, targetLanguage);
  if (instant && instant !== trimmed) {
    return {
      text: instant,
      originalText: trimmed,
      isTranslated: true,
      targetLanguage,
    };
  }

  // Fallback to Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text: trimmed,
        sourceLanguage: 'english',
        targetLanguage,
        mode: 'convert',
      },
    });

    if (!error && data?.translatedText && data?.isTranslated) {
      return {
        text: data.translatedText,
        originalText: trimmed,
        isTranslated: true,
        targetLanguage,
      };
    }
  } catch (err) {
    console.warn('[AsyncTranslator] Edge convert failed:', err);
  }

  return { text: trimmed, originalText: trimmed, isTranslated: false };
}

// ============================================================
// PROCESS MESSAGE FOR CHAT (Full flow)
// ============================================================

export async function processMessageForChat(
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
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      senderView: '',
      receiverView: '',
      originalText: '',
      wasTransliterated: false,
      wasTranslated: false,
    };
  }

  let senderView = trimmed;
  let wasTransliterated = false;

  // Convert to sender's native script if typing Latin
  if (needsScriptConversion(senderLanguage) && isLatinText(trimmed)) {
    const nativeResult = await convertToNativeScriptAsync(trimmed, senderLanguage);
    if (nativeResult.isTranslated) {
      senderView = nativeResult.text;
      wasTransliterated = true;
    }
  }

  // Translate to receiver's language
  let receiverView = senderView;
  let wasTranslated = false;

  if (!isSameLanguage(senderLanguage, receiverLanguage)) {
    const translateResult = await translateAsync(senderView, senderLanguage, receiverLanguage);
    if (translateResult.isTranslated) {
      receiverView = translateResult.text;
      wasTranslated = true;

      // Convert to receiver's native script if needed
      if (needsScriptConversion(receiverLanguage) && isLatinText(receiverView)) {
        const nativeResult = await convertToNativeScriptAsync(receiverView, receiverLanguage);
        if (nativeResult.isTranslated) {
          receiverView = nativeResult.text;
        }
      }
    }
  }

  return {
    senderView,
    receiverView,
    originalText: trimmed,
    wasTransliterated,
    wasTranslated,
  };
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

export function clearTranslationCache(): void {
  translationCache.clear();
  nativeScriptCache.clear();
  detectionCache.clear();
  console.log('[AsyncTranslator] Cache cleared');
}

export function getCacheStats(): { size: number; hitRate: number } {
  let totalHits = 0;
  translationCache.forEach((entry) => {
    totalHits += entry.hits;
  });
  return {
    size: translationCache.size,
    hitRate: translationCache.size > 0 ? totalHits / translationCache.size : 0,
  };
}

/**
 * DL-Translate Translator (Unified)
 * ==================================
 * 
 * SINGLE SOURCE: Uses translateText from @/lib/translation/translate
 * All translations go through the unified translate.ts system
 * 
 * Features:
 * 1. Auto-detect source language from text script
 * 2. Convert Latin typing to user's native script
 * 3. Translate messages between chat partners
 * 4. Skip translation when same language
 * 5. Support for 1000+ languages
 */

import {
  translateText,
  isSameLanguage,
  isLatinText,
  isLatinScriptLanguage,
  needsScriptConversion,
  normalizeLanguage,
  getLanguageCode,
  autoDetectLanguage,
  type TranslationResult as CoreTranslationResult,
} from '@/lib/translation/translate';
import { dynamicTransliterate } from '@/lib/translation/dynamic-transliterator';
import type { 
  TranslationResult, 
  ChatTranslationOptions, 
  CacheEntry,
  BatchTranslationItem,
  BatchTranslationResult,
  TranslatorConfig
} from './types';

// Default configuration
const DEFAULT_CONFIG: TranslatorConfig = {
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  maxRetries: 2,
  timeout: 10000,
  debugMode: false
};

// Translation cache with TTL
const cache = new Map<string, CacheEntry>();

function getCacheKey(text: string, source: string, target: string, mode: string): string {
  return `${mode}:${normalizeLanguage(source)}:${normalizeLanguage(target)}:${text.substring(0, 100)}`;
}

function isCacheValid(entry: CacheEntry, ttl: number): boolean {
  return Date.now() - entry.timestamp < ttl;
}

function getFromCache(key: string, ttl: number): TranslationResult | null {
  const entry = cache.get(key);
  if (entry && isCacheValid(entry, ttl)) {
    entry.hits++;
    return entry.result;
  }
  return null;
}

function setInCache(key: string, result: TranslationResult): void {
  cache.set(key, {
    result,
    timestamp: Date.now(),
    hits: 0
  });
}

/**
 * Main translate function - uses translateText from translate.ts
 */
export async function translate(
  text: string,
  sourceLanguage?: string,
  targetLanguage?: string,
  config: TranslatorConfig = DEFAULT_CONFIG
): Promise<TranslationResult> {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      text,
      originalText: text,
      source: sourceLanguage || 'english',
      target: targetLanguage || 'english',
      isTranslated: false,
      mode: 'passthrough'
    };
  }

  const detected = autoDetectLanguage(trimmed);
  const effectiveSource = sourceLanguage || detected.language;
  const effectiveTarget = targetLanguage || 'english';

  if (isSameLanguage(effectiveSource, effectiveTarget)) {
    return {
      text: trimmed,
      originalText: trimmed,
      source: effectiveSource,
      target: effectiveTarget,
      isTranslated: false,
      detectedLanguage: detected.language,
      detectedScript: detected.script,
      mode: 'passthrough'
    };
  }

  const cacheKey = getCacheKey(trimmed, effectiveSource, effectiveTarget, 'translate');
  if (config.cacheEnabled) {
    const cached = getFromCache(cacheKey, config.cacheTTL || DEFAULT_CONFIG.cacheTTL!);
    if (cached) {
      if (config.debugMode) console.log('[dl-translate] Cache hit:', cacheKey);
      return cached;
    }
  }

  try {
    // Use unified translateText
    const coreResult = await translateText(trimmed, effectiveSource, effectiveTarget);

    const result: TranslationResult = {
      text: coreResult.text,
      originalText: trimmed,
      source: coreResult.sourceLanguage,
      target: coreResult.targetLanguage,
      sourceCode: getLanguageCode(effectiveSource),
      targetCode: getLanguageCode(effectiveTarget),
      isTranslated: coreResult.isTranslated,
      detectedLanguage: detected.language,
      detectedScript: detected.script,
      mode: 'translate'
    };

    if (result.isTranslated && config.cacheEnabled) {
      setInCache(cacheKey, result);
    }

    return result;
  } catch (error) {
    console.error('[dl-translate] Translation error:', error);
    return {
      text: trimmed,
      originalText: trimmed,
      source: effectiveSource,
      target: effectiveTarget,
      isTranslated: false,
      detectedLanguage: detected.language,
      mode: 'passthrough'
    };
  }
}

/**
 * Convert Latin text to user's native script using dynamic transliterator
 */
export async function convertToNativeScript(
  text: string,
  targetLanguage: string,
  config: TranslatorConfig = DEFAULT_CONFIG
): Promise<TranslationResult> {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      text,
      originalText: text,
      source: 'english',
      target: targetLanguage,
      isTranslated: false,
      mode: 'passthrough'
    };
  }

  if (isLatinScriptLanguage(targetLanguage)) {
    return {
      text: trimmed,
      originalText: trimmed,
      source: 'english',
      target: targetLanguage,
      isTranslated: false,
      mode: 'passthrough'
    };
  }

  if (!isLatinText(trimmed)) {
    return {
      text: trimmed,
      originalText: trimmed,
      source: autoDetectLanguage(trimmed).language,
      target: targetLanguage,
      isTranslated: false,
      mode: 'passthrough'
    };
  }

  const cacheKey = getCacheKey(trimmed, 'english', targetLanguage, 'convert');
  if (config.cacheEnabled) {
    const cached = getFromCache(cacheKey, config.cacheTTL || DEFAULT_CONFIG.cacheTTL!);
    if (cached) {
      return cached;
    }
  }

  // Use dynamic transliterator
  const dynamicResult = dynamicTransliterate(trimmed, targetLanguage);
  
  if (dynamicResult && dynamicResult !== trimmed) {
    const result: TranslationResult = {
      text: dynamicResult,
      originalText: trimmed,
      source: 'english',
      target: targetLanguage,
      sourceCode: 'en',
      targetCode: getLanguageCode(targetLanguage),
      isTranslated: true,
      mode: 'convert'
    };
    
    if (config.cacheEnabled) {
      setInCache(cacheKey, result);
    }
    
    return result;
  }

  return {
    text: trimmed,
    originalText: trimmed,
    source: 'english',
    target: targetLanguage,
    isTranslated: false,
    mode: 'passthrough'
  };
}

/**
 * Translate for chat
 */
export async function translateForChat(
  text: string,
  options: ChatTranslationOptions
): Promise<TranslationResult> {
  const { senderLanguage, receiverLanguage } = options;
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      text,
      originalText: text,
      source: senderLanguage,
      target: receiverLanguage,
      isTranslated: false,
      mode: 'passthrough'
    };
  }

  const isLatin = isLatinText(trimmed);
  const detected = autoDetectLanguage(trimmed);

  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    if (isLatin && needsScriptConversion(senderLanguage)) {
      return convertToNativeScript(trimmed, senderLanguage);
    }
    return {
      text: trimmed,
      originalText: trimmed,
      source: senderLanguage,
      target: receiverLanguage,
      isTranslated: false,
      detectedLanguage: detected.language,
      mode: 'passthrough'
    };
  }

  const effectiveSource = isLatin ? senderLanguage : (detected.language !== 'english' ? detected.language : senderLanguage);
  return translate(trimmed, effectiveSource, receiverLanguage);
}

/**
 * Process outgoing message for sender
 */
export async function processOutgoingMessage(
  text: string,
  userLanguage: string
): Promise<TranslationResult> {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      text,
      originalText: text,
      source: userLanguage,
      target: userLanguage,
      isTranslated: false,
      mode: 'passthrough'
    };
  }

  if (isLatinScriptLanguage(userLanguage)) {
    return {
      text: trimmed,
      originalText: trimmed,
      source: userLanguage,
      target: userLanguage,
      isTranslated: false,
      mode: 'passthrough'
    };
  }

  if (isLatinText(trimmed)) {
    return convertToNativeScript(trimmed, userLanguage);
  }

  return {
    text: trimmed,
    originalText: trimmed,
    source: userLanguage,
    target: userLanguage,
    isTranslated: false,
    mode: 'passthrough'
  };
}

/**
 * Process incoming message for receiver
 */
export async function processIncomingMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<TranslationResult> {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      text,
      originalText: text,
      source: senderLanguage,
      target: receiverLanguage,
      isTranslated: false,
      mode: 'passthrough'
    };
  }

  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    return {
      text: trimmed,
      originalText: trimmed,
      source: senderLanguage,
      target: receiverLanguage,
      isTranslated: false,
      mode: 'passthrough'
    };
  }

  const detected = autoDetectLanguage(trimmed);
  const effectiveSource = detected.language !== 'english' ? detected.language : senderLanguage;

  return translate(trimmed, effectiveSource, receiverLanguage);
}

/**
 * Batch translate multiple texts
 */
export async function translateBatch(
  items: BatchTranslationItem[],
  config: TranslatorConfig = DEFAULT_CONFIG
): Promise<BatchTranslationResult> {
  const results: TranslationResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  const batchSize = 5;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => translate(item.text, item.sourceLanguage, item.targetLanguage, config))
    );
    
    batchResults.forEach(result => {
      results.push(result);
      if (result.isTranslated) successCount++;
      else failureCount++;
    });
  }

  return {
    results,
    successCount,
    failureCount,
    totalTime: 0
  };
}

// Cache management
export function clearCache(): void {
  cache.clear();
}

export function getCacheStats(): { size: number; hitRate: number } {
  let totalHits = 0;
  cache.forEach(entry => { totalHits += entry.hits; });
  return {
    size: cache.size,
    hitRate: cache.size > 0 ? totalHits / cache.size : 0
  };
}

// Re-export utilities from translate.ts
export const detect = (text: string) => {
  const result = autoDetectLanguage(text);
  return {
    language: result.language,
    isLatin: result.isLatin,
    script: result.script
  };
};

export {
  isSameLanguage,
  isLatinText as isLatinScript,
  isLatinScriptLanguage,
  needsScriptConversion,
  normalizeLanguage,
  getLanguageCode as getCode,
} from '@/lib/translation/translate';

export const detectLanguage = (text: string) => autoDetectLanguage(text).language;
export const detectScript = autoDetectLanguage;
export const getNativeName = (lang: string) => normalizeLanguage(lang);

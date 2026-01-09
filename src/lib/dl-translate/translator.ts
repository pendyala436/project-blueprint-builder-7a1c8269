/**
 * DL-Translate Translator
 * Inspired by: https://github.com/xhluca/dl-translate
 * 
 * Auto-detects languages and translates via Edge Function
 * Handles bidirectional chat translation with native script support
 * 
 * Features:
 * 1. Auto-detect source language from text script
 * 2. Convert Latin typing to user's native script
 * 3. Translate messages between chat partners
 * 4. Skip translation when same language
 * 5. Support for 200+ languages
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  TranslationResult, 
  ChatTranslationOptions, 
  CacheEntry,
  BatchTranslationItem,
  BatchTranslationResult,
  TranslatorConfig
} from './types';
import { 
  detectLanguage, 
  detectScript,
  isSameLanguage, 
  isLatinScript, 
  isLatinScriptLanguage,
  needsScriptConversion,
  normalizeLanguage,
  getCode,
  getNativeName
} from './languages';

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

/**
 * Generate cache key
 */
function getCacheKey(text: string, source: string, target: string, mode: string): string {
  return `${mode}:${normalizeLanguage(source)}:${normalizeLanguage(target)}:${text.substring(0, 100)}`;
}

/**
 * Check if cache entry is valid
 */
function isCacheValid(entry: CacheEntry, ttl: number): boolean {
  return Date.now() - entry.timestamp < ttl;
}

/**
 * Get from cache
 */
function getFromCache(key: string, ttl: number): TranslationResult | null {
  const entry = cache.get(key);
  if (entry && isCacheValid(entry, ttl)) {
    entry.hits++;
    return entry.result;
  }
  return null;
}

/**
 * Set in cache
 */
function setInCache(key: string, result: TranslationResult): void {
  cache.set(key, {
    result,
    timestamp: Date.now(),
    hits: 0
  });
}

/**
 * Main translate function
 * Auto-detects source language and translates to target
 */
export async function translate(
  text: string,
  sourceLanguage?: string,
  targetLanguage?: string,
  config: TranslatorConfig = DEFAULT_CONFIG
): Promise<TranslationResult> {
  const trimmed = text.trim();
  
  // Empty text - passthrough
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

  // Auto-detect source language from text script
  const detected = detectScript(trimmed);
  const effectiveSource = sourceLanguage || detected.language;
  const effectiveTarget = targetLanguage || 'english';

  // Same language - no translation needed
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

  // Check cache
  const cacheKey = getCacheKey(trimmed, effectiveSource, effectiveTarget, 'translate');
  if (config.cacheEnabled) {
    const cached = getFromCache(cacheKey, config.cacheTTL || DEFAULT_CONFIG.cacheTTL!);
    if (cached) {
      if (config.debugMode) console.log('[dl-translate] Cache hit:', cacheKey);
      return cached;
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text: trimmed,
        sourceLanguage: effectiveSource,
        targetLanguage: effectiveTarget,
        mode: 'translate'
      },
    });

    if (error) {
      console.error('[dl-translate] Edge function error:', error);
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

    const result: TranslationResult = {
      text: data?.translatedText || trimmed,
      originalText: trimmed,
      source: data?.sourceLanguage || effectiveSource,
      target: data?.targetLanguage || effectiveTarget,
      sourceCode: getCode(effectiveSource),
      targetCode: getCode(effectiveTarget),
      isTranslated: data?.isTranslated || false,
      detectedLanguage: data?.detectedLanguage || detected.language,
      detectedScript: detected.script,
      mode: 'translate'
    };

    // Cache successful translations
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
 * Convert Latin text to user's native script
 * Used when user types in English/romanized text but their native language uses non-Latin script
 * 
 * Example: User types "namaste" → Converted to "नमस्ते" (if user's language is Hindi)
 * 
 * CRITICAL: Uses dynamic transliteration as INSTANT fallback for 300+ languages
 * NO hardcoded words - pure phonetic algorithm
 */
export async function convertToNativeScript(
  text: string,
  targetLanguage: string,
  config: TranslatorConfig = DEFAULT_CONFIG
): Promise<TranslationResult> {
  const trimmed = text.trim();
  
  // Empty text
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

  // Target is English or Latin-script language - no conversion needed
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

  // Already in non-Latin script - no conversion needed
  if (!isLatinScript(trimmed)) {
    return {
      text: trimmed,
      originalText: trimmed,
      source: detectLanguage(trimmed),
      target: targetLanguage,
      isTranslated: false,
      mode: 'passthrough'
    };
  }

  // Check cache
  const cacheKey = getCacheKey(trimmed, 'english', targetLanguage, 'convert');
  if (config.cacheEnabled) {
    const cached = getFromCache(cacheKey, config.cacheTTL || DEFAULT_CONFIG.cacheTTL!);
    if (cached) {
      if (config.debugMode) console.log('[dl-translate] Convert cache hit:', cacheKey);
      return cached;
    }
  }

  // INSTANT FALLBACK: Use dynamic transliteration FIRST for immediate preview
  // This ensures 300+ language support without any edge function dependency
  try {
    const { dynamicTransliterate } = await import('@/lib/translation/dynamic-transliterator');
    const dynamicResult = dynamicTransliterate(trimmed, targetLanguage);
    
    if (dynamicResult && dynamicResult !== trimmed) {
      const result: TranslationResult = {
        text: dynamicResult,
        originalText: trimmed,
        source: 'english',
        target: targetLanguage,
        sourceCode: 'en',
        targetCode: getCode(targetLanguage),
        isTranslated: true,
        mode: 'convert'
      };
      
      // Cache successful conversions
      if (config.cacheEnabled) {
        setInCache(cacheKey, result);
      }
      
      return result;
    }
  } catch (err) {
    console.warn('[dl-translate] Dynamic transliteration error:', err);
  }

  // Try Edge Function as secondary (for potentially better quality)
  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text: trimmed,
        sourceLanguage: 'english',
        targetLanguage,
        mode: 'convert'
      },
    });

    if (!error && data?.translatedText && data?.isTranslated) {
      const result: TranslationResult = {
        text: data.translatedText,
        originalText: trimmed,
        source: 'english',
        target: targetLanguage,
        sourceCode: 'en',
        targetCode: getCode(targetLanguage),
        isTranslated: true,
        mode: 'convert'
      };

      // Cache successful conversions
      if (config.cacheEnabled) {
        setInCache(cacheKey, result);
      }

      return result;
    }
  } catch (error) {
    console.warn('[dl-translate] Edge function conversion error:', error);
  }

  // Final fallback - return original
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
 * Translate for chat: handles bidirectional translation between sender and receiver
 * 
 * Workflow:
 * 1. Sender types in Latin (English/romanized) → Converts to sender's native script
 * 2. When message is sent, it's stored in sender's native language
 * 3. Receiver sees message translated to their native language
 * 4. If both users have same language → No translation, just native script display
 * 
 * @param text - Message text
 * @param options - Chat translation options with sender/receiver languages
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

  // Detect if text is in Latin script
  const isLatin = isLatinScript(trimmed);
  const detected = detectScript(trimmed);

  // Same language - no translation needed
  // But if sender is typing Latin and their language is non-Latin, convert to native script
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    if (isLatin && needsScriptConversion(senderLanguage)) {
      // Convert Latin to sender's native script (also receiver's since same language)
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

  // Different languages - need translation
  // IMPORTANT: Use sender's language, NOT auto-detect for Latin scripts
  // Because German, French, Spanish etc. all use Latin script
  // If sender's profile says "german", trust that over script detection
  let effectiveSource: string;
  
  if (isLatin) {
    // Typing in Latin script - use sender's language from their profile
    // This handles German, French, Spanish, English, etc. correctly
    effectiveSource = senderLanguage;
  } else {
    // Typing in native script (Hindi, Telugu, Arabic, etc.)
    // Use detected language or fall back to sender's language
    effectiveSource = detected.language !== 'english' ? detected.language : senderLanguage;
  }

  // Translate to receiver's language
  return translate(trimmed, effectiveSource, receiverLanguage);
}

/**
 * Process outgoing message for sender
 * - If typing Latin and user's language is non-Latin → Convert to native script
 * - Otherwise pass through
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

  // If user's language uses Latin script, no conversion needed
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

  // If typing in Latin and user has non-Latin language, convert
  if (isLatinScript(trimmed)) {
    return convertToNativeScript(trimmed, userLanguage);
  }

  // Already in native script
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
 * - Translate from sender's language to receiver's language
 * - Skip if same language
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

  // Same language - no translation needed
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

  // Auto-detect the actual source language from the text
  const detected = detectScript(trimmed);
  const effectiveSource = detected.language !== 'english' ? detected.language : senderLanguage;

  // Translate to receiver's language
  return translate(trimmed, effectiveSource, receiverLanguage);
}

/**
 * Batch translate multiple texts
 */
export async function translateBatch(
  items: BatchTranslationItem[],
  config: TranslatorConfig = DEFAULT_CONFIG
): Promise<BatchTranslationResult> {
  const startTime = Date.now();
  const results: TranslationResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Process in parallel with concurrency limit
  const BATCH_SIZE = 5;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          const result = await translate(item.text, item.sourceLanguage, item.targetLanguage, config);
          if (result.isTranslated) successCount++;
          return result;
        } catch {
          failureCount++;
          return {
            text: item.text,
            originalText: item.text,
            source: item.sourceLanguage || 'english',
            target: item.targetLanguage,
            isTranslated: false,
            mode: 'passthrough' as const
          };
        }
      })
    );
    results.push(...batchResults);
  }

  return {
    results,
    successCount,
    failureCount,
    totalTime: Date.now() - startTime
  };
}

/**
 * Clear translation cache
 */
export function clearCache(): void {
  cache.clear();
  console.log('[dl-translate] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; hitRate: number } {
  let totalHits = 0;
  cache.forEach(entry => {
    totalHits += entry.hits;
  });
  return {
    size: cache.size,
    hitRate: cache.size > 0 ? totalHits / cache.size : 0
  };
}

/**
 * Detect language from text
 */
export function detect(text: string): { language: string; isLatin: boolean; script: string } {
  const result = detectScript(text);
  return { 
    language: result.language, 
    isLatin: result.isLatin,
    script: result.script
  };
}

// Re-export utilities
export { 
  detectLanguage, 
  detectScript,
  isSameLanguage, 
  isLatinScript,
  isLatinScriptLanguage,
  needsScriptConversion,
  normalizeLanguage,
  getCode,
  getNativeName
} from './languages';

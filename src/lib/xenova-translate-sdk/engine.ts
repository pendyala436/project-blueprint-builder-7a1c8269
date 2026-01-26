/**
 * Translation Engine - Browser-Based Semantic Translation
 * =========================================================
 * 
 * Core translation using Xenova/HuggingFace NLLB-200 and M2M-100 models
 * Runs entirely in-browser via WebAssembly - zero server dependency
 * 
 * FEATURES:
 * - Semantic translation (meaning-based, not phonetic)
 * - Bidirectional sender/receiver chat translation
 * - English pivot for cross-language pairs
 * - Lazy model loading with caching
 * - All input types: English, native script, voice, Gboard, font tools
 */

import { loadM2M, loadNLLB, loadDetector } from './modelLoader';
import { route } from './router';
import { getNLLBCode, getM2MCode } from './iso639';
import { normalizeLanguageCode, isEnglish, isSameLanguage } from './languages';
import type { TranslationResult, ChatTranslationResult, TranslationPath } from './types';

// Translation cache for performance
interface CacheEntry {
  result: TranslationResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cache key
 */
function getCacheKey(text: string, src: string, tgt: string): string {
  return `${src}:${tgt}:${text.substring(0, 100)}`;
}

/**
 * Check cache for existing translation
 */
function getFromCache(key: string): TranslationResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return entry.result;
}

/**
 * Add translation to cache
 */
function addToCache(key: string, result: TranslationResult): void {
  // Evict oldest entries if cache is full
  if (cache.size >= CACHE_MAX_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  
  cache.set(key, { result, timestamp: Date.now() });
}

/**
 * Detect language of text
 */
export async function detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
  if (!text.trim()) {
    return { language: 'en', confidence: 0 };
  }
  
  try {
    const detector = await loadDetector();
    const result = await detector(text.substring(0, 500));
    
    if (result && result.length > 0) {
      // Extract language code from label (e.g., "__label__en" → "en")
      const label = result[0].label || '';
      const code = label.replace('__label__', '').toLowerCase();
      return {
        language: normalizeLanguageCode(code),
        confidence: result[0].score || 0.5,
      };
    }
  } catch (error) {
    console.warn('[XenovaEngine] Detection failed:', error);
  }
  
  return { language: 'en', confidence: 0.5 };
}

/**
 * Translate text using M2M-100 (Latin scripts)
 */
async function translateWithM2M(text: string, src: string, tgt: string): Promise<string> {
  const translator = await loadM2M();
  
  const srcCode = getM2MCode(src) || src;
  const tgtCode = getM2MCode(tgt) || tgt;
  
  console.log(`[XenovaEngine] M2M semantic: ${srcCode} → ${tgtCode}`);
  
  const result = await translator(text, {
    src_lang: srcCode,
    tgt_lang: tgtCode,
  });
  
  const output = result[0]?.translation_text || text;
  console.log(`[XenovaEngine] M2M result: "${text.substring(0, 30)}" → "${output.substring(0, 30)}"`);
  return output;
}

/**
 * Translate text using NLLB-200 (non-Latin scripts) - SEMANTIC TRANSLATION
 * This is the PRIMARY method for semantic meaning-based translation
 */
async function translateWithNLLB(text: string, src: string, tgt: string): Promise<string> {
  const translator = await loadNLLB();
  
  // Get proper NLLB codes with script tags (e.g., "hi" → "hin_Deva", "te" → "tel_Telu")
  const srcCode = getNLLBCode(src);
  const tgtCode = getNLLBCode(tgt);
  
  if (!srcCode || !tgtCode) {
    console.warn(`[XenovaEngine] Missing NLLB code: src=${src}→${srcCode}, tgt=${tgt}→${tgtCode}`);
    // Fallback to M2M if available
    if (getM2MCode(src) && getM2MCode(tgt)) {
      console.log('[XenovaEngine] Falling back to M2M for:', src, '→', tgt);
      return translateWithM2M(text, src, tgt);
    }
    return text;
  }
  
  console.log(`[XenovaEngine] NLLB semantic: ${srcCode} → ${tgtCode}`);
  
  // NLLB requires specific parameter format for proper semantic translation
  const result = await translator(text, {
    src_lang: srcCode,
    tgt_lang: tgtCode,
  });
  
  const output = result[0]?.translation_text || text;
  console.log(`[XenovaEngine] NLLB result: "${text.substring(0, 30)}" → "${output.substring(0, 30)}"`);
  return output;
}

/**
 * Main translation function - SEMANTIC MEANING-BASED
 * Works for ANY input type: typed English, native script, voice, Gboard, font tools
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult> {
  const originalText = text;
  const src = normalizeLanguageCode(sourceLang);
  const tgt = normalizeLanguageCode(targetLang);
  
  console.log(`[XenovaEngine] translateText: "${text.substring(0, 40)}" | ${sourceLang}→${src} | ${targetLang}→${tgt}`);
  
  // Empty text
  if (!text.trim()) {
    console.log('[XenovaEngine] Empty text, returning empty result');
    return {
      text: '',
      originalText: '',
      sourceLang: src,
      targetLang: tgt,
      path: 'SAME',
      isTranslated: false,
    };
  }
  
  // Same language check
  if (isSameLanguage(src, tgt)) {
    console.log('[XenovaEngine] Same language, no translation needed');
    return {
      text: originalText,
      originalText,
      sourceLang: src,
      targetLang: tgt,
      path: 'SAME',
      isTranslated: false,
    };
  }
  
  // Check cache
  const cacheKey = getCacheKey(text, src, tgt);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log(`[XenovaEngine] Cache hit: ${src} → ${tgt}`);
    return cached;
  }
  
  // Determine translation path
  const path = route(src, tgt);
  console.log(`[XenovaEngine] Translation path: ${path}`);
  
  let translatedText = text;
  
  try {
    switch (path) {
      case 'SAME':
        // No translation needed
        break;
        
      case 'DIRECT_M2M':
        translatedText = await translateWithM2M(text, src, tgt);
        break;
        
      case 'DIRECT_NLLB':
        translatedText = await translateWithNLLB(text, src, tgt);
        break;
        
      case 'PIVOT_EN':
        // SEMANTIC PIVOT: Source → English (get meaning) → Target (express meaning)
        console.log(`[XenovaEngine] Pivot translation: ${src} → en → ${tgt}`);
        const englishMeaning = await translateWithNLLB(text, src, 'en');
        console.log(`[XenovaEngine] Step 1 (${src}→en): "${text.substring(0, 20)}" → "${englishMeaning.substring(0, 20)}"`);
        translatedText = await translateWithNLLB(englishMeaning, 'en', tgt);
        console.log(`[XenovaEngine] Step 2 (en→${tgt}): "${englishMeaning.substring(0, 20)}" → "${translatedText.substring(0, 20)}"`);
        break;
        
      case 'FALLBACK':
        console.warn(`[XenovaEngine] Fallback for unsupported: ${src} → ${tgt}`);
        break;
    }
  } catch (error) {
    console.error('[XenovaEngine] Translation error:', error);
    // Return original on error
    return {
      text: originalText,
      originalText,
      sourceLang: src,
      targetLang: tgt,
      path: 'FALLBACK',
      isTranslated: false,
    };
  }
  
  const isActuallyTranslated = path !== 'SAME' && path !== 'FALLBACK' && translatedText !== originalText;
  
  const result: TranslationResult = {
    text: translatedText,
    originalText,
    sourceLang: src,
    targetLang: tgt,
    path,
    isTranslated: isActuallyTranslated,
  };
  
  // Cache successful translations
  if (isActuallyTranslated) {
    addToCache(cacheKey, result);
  }
  
  console.log(`[XenovaEngine] RESULT: ${src}→${tgt}: "${originalText.substring(0, 25)}" → "${translatedText.substring(0, 25)}" (translated=${isActuallyTranslated})`);
  
  return result;
}

/**
 * Translate for bidirectional chat - generates views for both sender and receiver
 * 
 * FLOW (as per user requirement):
 * 1. ANY input (English, romanized, native script, voice) → Extract English meaning
 * 2. English meaning → Sender's mother tongue (for preview + sent view)
 * 3. English meaning → Receiver's mother tongue (for receiver view)
 * 
 * Examples:
 * - Telugu sender types "How are you?" → senderView: "మీరు ఎలా ఉన్నారు?", receiverView: depends on receiver lang
 * - Telugu sender types "Bagunnava?" → senderView: "బాగున్నావా?", receiverView: translated to receiver's lang
 */
export async function translateForChat(
  text: string,
  senderLang: string,
  receiverLang: string
): Promise<ChatTranslationResult> {
  const originalText = text;
  const sender = normalizeLanguageCode(senderLang);
  const receiver = normalizeLanguageCode(receiverLang);
  
  console.log(`[XenovaEngine] translateForChat: "${text.substring(0, 40)}" | sender=${senderLang}→${sender} | receiver=${receiverLang}→${receiver}`);
  
  // Empty text
  if (!text.trim()) {
    return {
      senderView: '',
      receiverView: '',
      englishCore: '',
      originalText: '',
      path: 'SAME',
      isTranslated: false,
    };
  }
  
  let senderView = text;
  let receiverView = text;
  let englishCore = text;
  let path: TranslationPath = 'SAME';
  
  try {
    // ============================================
    // STEP 1: ALWAYS extract English meaning first
    // This works for any input: English, romanized, native script
    // ============================================
    
    // Detect input language
    const detected = await detectLanguage(text);
    console.log(`[XenovaEngine] Detected input language: ${detected.language} (confidence: ${detected.confidence})`);
    
    // Get English meaning from input
    if (isEnglish(detected.language) || /^[a-zA-Z\s.,!?'"-]+$/.test(text.trim())) {
      // Input is English or Latin characters - use as English meaning
      englishCore = text;
      console.log('[XenovaEngine] Input is English/Latin, using as englishCore');
    } else {
      // Input is in some other language/script - translate to English
      const enResult = await translateText(text, detected.language || sender, 'en');
      englishCore = enResult.text;
      console.log(`[XenovaEngine] Extracted English meaning: "${englishCore.substring(0, 40)}"`);
    }
    
    // ============================================
    // STEP 2: Translate English → Sender's mother tongue
    // Sender ALWAYS sees their message in their mother tongue
    // ============================================
    
    if (isEnglish(sender)) {
      // Sender's mother tongue IS English - show English
      senderView = englishCore;
      console.log('[XenovaEngine] Sender is English speaker, senderView = englishCore');
    } else {
      // Translate English to sender's mother tongue
      const senderResult = await translateText(englishCore, 'en', sender);
      senderView = senderResult.text;
      path = senderResult.path;
      console.log(`[XenovaEngine] SenderView (${sender}): "${senderView.substring(0, 40)}"`);
    }
    
    // ============================================
    // STEP 3: Translate English → Receiver's mother tongue
    // Receiver ALWAYS sees message in their mother tongue
    // ============================================
    
    if (isSameLanguage(sender, receiver)) {
      // Same language - receiver sees same as sender
      receiverView = senderView;
      console.log('[XenovaEngine] Same language pair, receiverView = senderView');
    } else if (isEnglish(receiver)) {
      // Receiver's mother tongue IS English - show English
      receiverView = englishCore;
      console.log('[XenovaEngine] Receiver is English speaker, receiverView = englishCore');
    } else {
      // Translate English to receiver's mother tongue
      const receiverResult = await translateText(englishCore, 'en', receiver);
      receiverView = receiverResult.text;
      path = 'PIVOT_EN';
      console.log(`[XenovaEngine] ReceiverView (${receiver}): "${receiverView.substring(0, 40)}"`);
    }
    
  } catch (error) {
    console.error('[XenovaEngine] Chat translation error:', error);
    return {
      senderView: text,
      receiverView: text,
      englishCore: text,
      originalText,
      path: 'FALLBACK',
      isTranslated: false,
    };
  }
  
  const isActuallyTranslated = senderView !== originalText || receiverView !== originalText;
  
  console.log(`[XenovaEngine] CHAT RESULT:
    Original input: "${originalText.substring(0, 30)}"
    English meaning: "${englishCore.substring(0, 30)}"
    Sender (${sender}) sees: "${senderView.substring(0, 30)}"
    Receiver (${receiver}) sees: "${receiverView.substring(0, 30)}"
    Translated: ${isActuallyTranslated}`);
  
  return {
    senderView,
    receiverView,
    englishCore,
    originalText,
    path,
    isTranslated: isActuallyTranslated,
  };
}

/**
 * Get English semantic meaning of any text
 * Used for displaying English translation below messages
 */
export async function getEnglishMeaning(text: string, sourceLang: string): Promise<string> {
  if (!text.trim()) return '';
  
  const src = normalizeLanguageCode(sourceLang);
  
  if (isEnglish(src)) {
    return text;
  }
  
  console.log(`[XenovaEngine] Getting English meaning from ${src}:`, text.substring(0, 40));
  
  const result = await translateText(text, src, 'en');
  console.log('[XenovaEngine] English meaning result:', result.text.substring(0, 40));
  return result.text;
}

/**
 * Clear translation cache
 */
export function clearCache(): void {
  cache.clear();
  console.log('[XenovaEngine] Cache cleared');
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: cache.size,
    maxSize: CACHE_MAX_SIZE,
  };
}

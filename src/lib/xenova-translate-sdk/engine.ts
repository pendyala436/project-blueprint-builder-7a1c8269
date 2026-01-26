/**
 * Translation Engine
 * Core translation logic using Xenova/HuggingFace models
 */

import { loadM2M, loadNLLB, loadDetector } from './modelLoader';
import { route } from './router';
import { getNLLBCode, getM2MCode } from './iso639';
import { normalizeLanguageCode, isEnglish } from './languages';
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
  
  const result = await translator(text, {
    src_lang: srcCode,
    tgt_lang: tgtCode,
  });
  
  return result[0]?.translation_text || text;
}

/**
 * Translate text using NLLB-200 (non-Latin scripts)
 */
async function translateWithNLLB(text: string, src: string, tgt: string): Promise<string> {
  const translator = await loadNLLB();
  
  const srcCode = getNLLBCode(src) || `${src}_Latn`;
  const tgtCode = getNLLBCode(tgt) || `${tgt}_Latn`;
  
  const result = await translator(text, {
    src_lang: srcCode,
    tgt_lang: tgtCode,
  });
  
  return result[0]?.translation_text || text;
}

/**
 * Main translation function
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult> {
  const originalText = text;
  const src = normalizeLanguageCode(sourceLang);
  const tgt = normalizeLanguageCode(targetLang);
  
  // Empty text
  if (!text.trim()) {
    return {
      text: '',
      originalText: '',
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
    console.log('[XenovaEngine] Cache hit');
    return cached;
  }
  
  // Determine translation path
  const path = route(src, tgt);
  
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
        // Step 1: Source → English
        const english = await translateWithNLLB(text, src, 'en');
        // Step 2: English → Target
        translatedText = await translateWithNLLB(english, 'en', tgt);
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
  
  const result: TranslationResult = {
    text: translatedText,
    originalText,
    sourceLang: src,
    targetLang: tgt,
    path,
    isTranslated: path !== 'SAME' && path !== 'FALLBACK' && translatedText !== originalText,
  };
  
  // Cache successful translations
  if (result.isTranslated) {
    addToCache(cacheKey, result);
  }
  
  console.log(`[XenovaEngine] ${src} → ${tgt}: "${originalText.substring(0, 30)}" → "${translatedText.substring(0, 30)}"`);
  
  return result;
}

/**
 * Translate for chat - generates views for both sender and receiver
 */
export async function translateForChat(
  text: string,
  senderLang: string,
  receiverLang: string
): Promise<ChatTranslationResult> {
  const originalText = text;
  const sender = normalizeLanguageCode(senderLang);
  const receiver = normalizeLanguageCode(receiverLang);
  
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
    // Same language - no translation
    if (sender === receiver) {
      // Still get English for reference if not English
      if (!isEnglish(sender)) {
        const enResult = await translateText(text, sender, 'en');
        englishCore = enResult.text;
      }
      return {
        senderView: text,
        receiverView: text,
        englishCore,
        originalText,
        path: 'SAME',
        isTranslated: false,
      };
    }
    
    // Sender typed in English
    if (isEnglish(sender)) {
      englishCore = text;
      
      // Translate English → receiver's language
      const receiverResult = await translateText(text, 'en', receiver);
      receiverView = receiverResult.text;
      path = receiverResult.path;
      
    } else if (isEnglish(receiver)) {
      // Receiver speaks English - translate sender's native to English
      const enResult = await translateText(text, sender, 'en');
      englishCore = enResult.text;
      receiverView = enResult.text;
      path = enResult.path;
      
    } else {
      // Both non-English - pivot through English
      // Step 1: sender → English
      const enResult = await translateText(text, sender, 'en');
      englishCore = enResult.text;
      
      // Step 2: English → receiver
      const receiverResult = await translateText(englishCore, 'en', receiver);
      receiverView = receiverResult.text;
      path = 'PIVOT_EN';
    }
    
    // Sender view is the original text (in their language)
    senderView = text;
    
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
  
  console.log(`[XenovaEngine] Chat: ${sender} → ${receiver}`);
  console.log(`  Sender sees: "${senderView.substring(0, 30)}"`);
  console.log(`  Receiver sees: "${receiverView.substring(0, 30)}"`);
  console.log(`  English core: "${englishCore.substring(0, 30)}"`);
  
  return {
    senderView,
    receiverView,
    englishCore,
    originalText,
    path,
    isTranslated: path !== 'SAME' && path !== 'FALLBACK',
  };
}

/**
 * Get English meaning of any text
 */
export async function getEnglishMeaning(text: string, sourceLang: string): Promise<string> {
  if (!text.trim()) return '';
  
  const src = normalizeLanguageCode(sourceLang);
  
  if (isEnglish(src)) {
    return text;
  }
  
  const result = await translateText(text, src, 'en');
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

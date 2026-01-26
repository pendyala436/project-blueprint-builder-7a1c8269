/**
 * Translation Client - Main Thread with Smart Queuing
 * ====================================================
 * Ensures browser-based translation ALWAYS works by:
 * 1. Queuing translations while models load
 * 2. Waiting for models to be ready before translating
 * 3. Only falling back to edge function after absolute failure
 */

import { waitForTranslationReady, isTranslationReady, startModelPreload, isPreloadStarted } from '@/hooks/useTranslationPreload';

// Maximum time to wait for models before giving up (60 seconds)
const MAX_MODEL_WAIT_MS = 60000;

// Translation queue for requests that come in before models are ready
interface QueuedTranslation {
  id: string;
  type: 'translate' | 'chat' | 'english' | 'detect';
  args: any[];
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

const translationQueue: QueuedTranslation[] = [];
let isProcessingQueue = false;

/**
 * Process queued translations once models are ready
 */
async function processQueue() {
  if (isProcessingQueue || translationQueue.length === 0) return;
  
  isProcessingQueue = true;
  console.log(`[TranslationClient] 📋 Processing ${translationQueue.length} queued translations`);
  
  while (translationQueue.length > 0) {
    const item = translationQueue.shift()!;
    
    // Skip if too old (more than 30 seconds)
    if (Date.now() - item.timestamp > 30000) {
      console.warn('[TranslationClient] ⏱️ Skipping old queued translation');
      item.reject(new Error('Translation request timed out in queue'));
      continue;
    }
    
    try {
      let result;
      switch (item.type) {
        case 'translate':
          result = await doTranslate(item.args[0], item.args[1], item.args[2]);
          break;
        case 'chat':
          result = await doChatTranslate(item.args[0], item.args[1], item.args[2]);
          break;
        case 'english':
          result = await doToEnglish(item.args[0], item.args[1]);
          break;
        case 'detect':
          result = await doDetect(item.args[0]);
          break;
      }
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    }
  }
  
  isProcessingQueue = false;
}

/**
 * Actual translation implementation (called after models ready)
 */
async function doTranslate(text: string, source: string, target: string): Promise<any> {
  const { translateText } = await import('./engine');
  const { normalizeLanguageCode } = await import('./languages');
  return translateText(text, normalizeLanguageCode(source), normalizeLanguageCode(target));
}

async function doChatTranslate(text: string, senderLang: string, receiverLang: string): Promise<any> {
  const { translateForChat } = await import('./engine');
  const { normalizeLanguageCode } = await import('./languages');
  return translateForChat(text, normalizeLanguageCode(senderLang), normalizeLanguageCode(receiverLang));
}

async function doToEnglish(text: string, source: string): Promise<string> {
  const { getEnglishMeaning } = await import('./engine');
  const { normalizeLanguageCode } = await import('./languages');
  return getEnglishMeaning(text, normalizeLanguageCode(source));
}

async function doDetect(text: string): Promise<{ language: string; confidence: number }> {
  const { detectLanguage } = await import('./engine');
  return detectLanguage(text);
}

/**
 * Translate text - waits for models to be ready
 */
export async function translateInWorker(
  text: string,
  source: string,
  target: string
): Promise<any> {
  console.log('[TranslationClient] 🔄 Translating:', { text: text.substring(0, 20), source, target });
  
  // Start preload if not already started
  if (!isPreloadStarted()) {
    console.log('[TranslationClient] 🚀 Triggering model preload');
    startModelPreload().catch(() => {});
  }
  
  // If models are ready, translate immediately
  if (isTranslationReady()) {
    try {
      const result = await doTranslate(text, source, target);
      console.log('[TranslationClient] ✅ Translation complete');
      return result;
    } catch (err) {
      console.error('[TranslationClient] Translation error:', err);
      throw err;
    }
  }
  
  // Wait for models with timeout
  console.log('[TranslationClient] ⏳ Waiting for models to load...');
  const isReady = await waitForTranslationReady(MAX_MODEL_WAIT_MS);
  
  if (isReady) {
    try {
      const result = await doTranslate(text, source, target);
      console.log('[TranslationClient] ✅ Translation complete (after wait)');
      return result;
    } catch (err) {
      console.error('[TranslationClient] Translation error after wait:', err);
      throw err;
    }
  }
  
  // Models failed to load - throw error to trigger fallback
  console.error('[TranslationClient] ❌ Models failed to load within timeout');
  throw new Error('Translation models failed to load');
}

/**
 * Chat translation - waits for models to be ready
 */
export async function translateChatInWorker(
  text: string,
  senderLang: string,
  receiverLang: string
): Promise<any> {
  console.log('[TranslationClient] 🔄 Chat translating');
  
  // Start preload if not already started
  if (!isPreloadStarted()) {
    startModelPreload().catch(() => {});
  }
  
  // If models are ready, translate immediately
  if (isTranslationReady()) {
    try {
      const result = await doChatTranslate(text, senderLang, receiverLang);
      console.log('[TranslationClient] ✅ Chat translation complete');
      return result;
    } catch (err) {
      console.error('[TranslationClient] Chat translation error:', err);
      throw err;
    }
  }
  
  // Wait for models with timeout
  console.log('[TranslationClient] ⏳ Waiting for models for chat...');
  const isReady = await waitForTranslationReady(MAX_MODEL_WAIT_MS);
  
  if (isReady) {
    try {
      const result = await doChatTranslate(text, senderLang, receiverLang);
      console.log('[TranslationClient] ✅ Chat translation complete (after wait)');
      return result;
    } catch (err) {
      console.error('[TranslationClient] Chat translation error after wait:', err);
      throw err;
    }
  }
  
  throw new Error('Translation models failed to load');
}

/**
 * Get English meaning - waits for models to be ready
 */
export async function toEnglishInWorker(
  text: string,
  source: string
): Promise<string> {
  console.log('[TranslationClient] 🔄 Getting English meaning');
  
  // Start preload if not already started
  if (!isPreloadStarted()) {
    startModelPreload().catch(() => {});
  }
  
  // If models are ready, translate immediately
  if (isTranslationReady()) {
    try {
      const result = await doToEnglish(text, source);
      console.log('[TranslationClient] ✅ English translation complete');
      return result;
    } catch (err) {
      console.error('[TranslationClient] English translation error:', err);
      throw err;
    }
  }
  
  // Wait for models with timeout
  const isReady = await waitForTranslationReady(MAX_MODEL_WAIT_MS);
  
  if (isReady) {
    try {
      const result = await doToEnglish(text, source);
      console.log('[TranslationClient] ✅ English translation complete (after wait)');
      return result;
    } catch (err) {
      console.error('[TranslationClient] English translation error after wait:', err);
      throw err;
    }
  }
  
  throw new Error('Translation models failed to load');
}

/**
 * Detect language - fast fallback for ASCII, waits for models otherwise
 */
export async function detectInWorker(
  text: string
): Promise<{ language: string; confidence: number }> {
  console.log('[TranslationClient] 🔄 Detecting language');
  
  // Quick regex-based detection for ASCII (likely English)
  const hasNonAscii = /[^\x00-\x7F]/.test(text);
  if (!hasNonAscii) {
    console.log('[TranslationClient] ✅ Quick detection: English (ASCII text)');
    return { language: 'en', confidence: 0.8 };
  }
  
  // Start preload if not already started
  if (!isPreloadStarted()) {
    startModelPreload().catch(() => {});
  }
  
  // If models are ready, detect immediately
  if (isTranslationReady()) {
    try {
      const result = await doDetect(text);
      console.log('[TranslationClient] ✅ Detection complete:', result.language);
      return result;
    } catch (err) {
      console.warn('[TranslationClient] Detection failed, defaulting to English:', err);
      return { language: 'en', confidence: 0.5 };
    }
  }
  
  // Wait for models with shorter timeout for detection
  const isReady = await waitForTranslationReady(15000);
  
  if (isReady) {
    try {
      const result = await doDetect(text);
      console.log('[TranslationClient] ✅ Detection complete (after wait):', result.language);
      return result;
    } catch (err) {
      console.warn('[TranslationClient] Detection failed after wait:', err);
      return { language: 'en', confidence: 0.5 };
    }
  }
  
  // Fallback - try to detect from script patterns
  console.warn('[TranslationClient] ⚠️ Using script-based detection fallback');
  return detectByScript(text);
}

/**
 * Script-based language detection fallback
 */
function detectByScript(text: string): { language: string; confidence: number } {
  // Devanagari script (Hindi, Marathi, Sanskrit, etc.)
  if (/[\u0900-\u097F]/.test(text)) return { language: 'hi', confidence: 0.6 };
  
  // Bengali script
  if (/[\u0980-\u09FF]/.test(text)) return { language: 'bn', confidence: 0.6 };
  
  // Tamil script
  if (/[\u0B80-\u0BFF]/.test(text)) return { language: 'ta', confidence: 0.6 };
  
  // Telugu script
  if (/[\u0C00-\u0C7F]/.test(text)) return { language: 'te', confidence: 0.6 };
  
  // Kannada script
  if (/[\u0C80-\u0CFF]/.test(text)) return { language: 'kn', confidence: 0.6 };
  
  // Malayalam script
  if (/[\u0D00-\u0D7F]/.test(text)) return { language: 'ml', confidence: 0.6 };
  
  // Gujarati script
  if (/[\u0A80-\u0AFF]/.test(text)) return { language: 'gu', confidence: 0.6 };
  
  // Punjabi (Gurmukhi) script
  if (/[\u0A00-\u0A7F]/.test(text)) return { language: 'pa', confidence: 0.6 };
  
  // Odia script
  if (/[\u0B00-\u0B7F]/.test(text)) return { language: 'or', confidence: 0.6 };
  
  // Arabic script (includes Urdu, Persian)
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return { language: 'ar', confidence: 0.5 };
  
  // Chinese characters
  if (/[\u4E00-\u9FFF]/.test(text)) return { language: 'zh', confidence: 0.6 };
  
  // Japanese (Hiragana + Katakana)
  if (/[\u3040-\u30FF]/.test(text)) return { language: 'ja', confidence: 0.6 };
  
  // Korean (Hangul)
  if (/[\uAC00-\uD7AF]/.test(text)) return { language: 'ko', confidence: 0.6 };
  
  // Thai script
  if (/[\u0E00-\u0E7F]/.test(text)) return { language: 'th', confidence: 0.6 };
  
  // Cyrillic script (Russian, etc.)
  if (/[\u0400-\u04FF]/.test(text)) return { language: 'ru', confidence: 0.5 };
  
  // Greek script
  if (/[\u0370-\u03FF]/.test(text)) return { language: 'el', confidence: 0.6 };
  
  // Hebrew script
  if (/[\u0590-\u05FF]/.test(text)) return { language: 'he', confidence: 0.6 };
  
  // Default to English
  return { language: 'en', confidence: 0.3 };
}

/**
 * No-op for backwards compatibility
 */
export function terminateWorker(): void {
  // No worker to terminate
}

/**
 * No-op for backwards compatibility
 */
export function resetWorker(): void {
  // No worker to reset
}

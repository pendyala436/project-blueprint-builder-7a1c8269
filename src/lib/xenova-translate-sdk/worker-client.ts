/**
 * Web Worker Client for Xenova Translation
 * =========================================
 * Provides async API to translation worker with fallback to main thread
 * 
 * STRATEGY:
 * 1. Try to use Web Worker for non-blocking translation
 * 2. If worker fails/times out, fallback to main thread (still works, may block slightly)
 * 3. For simple English detection, use quick regex check as instant response
 */

let worker: Worker | null = null;
let workerFailed = false; // Track if worker has failed to avoid repeated failures
let messageId = 0;
const pendingMessages = new Map<string, {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}>();

// Shorter timeout for worker operations (5 seconds)
const WORKER_TIMEOUT = 5000;

/**
 * Initialize worker with error handling
 */
function getWorker(): Worker | null {
  // If worker previously failed, don't try again
  if (workerFailed) {
    return null;
  }

  if (!worker) {
    try {
      worker = new Worker(
        new URL('../../workers/translation.worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      worker.onmessage = (event) => {
        const { id, success, result, error } = event.data;
        const pending = pendingMessages.get(id);
        
        if (pending) {
          pendingMessages.delete(id);
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error || 'Translation failed'));
          }
        }
      };
      
      worker.onerror = (error) => {
        console.error('[WorkerClient] Worker error:', error);
        workerFailed = true;
        // Reject all pending messages on worker error
        pendingMessages.forEach((pending, id) => {
          pending.reject(new Error('Worker crashed'));
          pendingMessages.delete(id);
        });
        // Clean up
        if (worker) {
          worker.terminate();
          worker = null;
        }
      };
      
      console.log('[WorkerClient] Translation worker initialized');
    } catch (e) {
      console.error('[WorkerClient] Failed to create worker:', e);
      workerFailed = true;
      return null;
    }
  }
  
  return worker;
}

/**
 * Send message to worker and get promise with timeout
 */
function sendToWorker<T>(type: string, payload: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    
    if (!w) {
      reject(new Error('Worker not available'));
      return;
    }

    const id = `msg_${++messageId}`;
    const timeoutId = setTimeout(() => {
      pendingMessages.delete(id);
      reject(new Error('Translation timeout'));
    }, WORKER_TIMEOUT);
    
    pendingMessages.set(id, {
      resolve: (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
    
    try {
      w.postMessage({ id, type, payload });
    } catch (err) {
      pendingMessages.delete(id);
      clearTimeout(timeoutId);
      reject(err);
    }
  });
}

/**
 * Fallback translation using main thread (blocking but guaranteed to work)
 */
async function fallbackTranslate(text: string, source: string, target: string): Promise<any> {
  console.log('[WorkerClient] Using main thread fallback for translation');
  const { translateText } = await import('./engine');
  const { normalizeLanguageCode } = await import('./languages');
  return translateText(text, normalizeLanguageCode(source), normalizeLanguageCode(target));
}

async function fallbackTranslateChat(text: string, senderLang: string, receiverLang: string): Promise<any> {
  console.log('[WorkerClient] Using main thread fallback for chat translation');
  const { translateForChat } = await import('./engine');
  const { normalizeLanguageCode } = await import('./languages');
  return translateForChat(text, normalizeLanguageCode(senderLang), normalizeLanguageCode(receiverLang));
}

async function fallbackToEnglish(text: string, source: string): Promise<string> {
  console.log('[WorkerClient] Using main thread fallback for English meaning');
  const { getEnglishMeaning } = await import('./engine');
  const { normalizeLanguageCode } = await import('./languages');
  return getEnglishMeaning(text, normalizeLanguageCode(source));
}

async function fallbackDetect(text: string): Promise<{ language: string; confidence: number }> {
  // Quick regex-based detection as fallback (instant, no ML)
  const hasNonAscii = /[^\x00-\x7F]/.test(text);
  if (!hasNonAscii) {
    // Likely English or romanized
    return { language: 'en', confidence: 0.7 };
  }
  
  // Try ML detection on main thread
  try {
    const { detectLanguage } = await import('./engine');
    return detectLanguage(text);
  } catch {
    return { language: 'en', confidence: 0.5 };
  }
}

/**
 * Translate text via worker with fallback
 */
export async function translateInWorker(
  text: string,
  source: string,
  target: string
): Promise<any> {
  console.log('[WorkerClient] 🔄 Translating:', { text: text.substring(0, 20), source, target });
  
  try {
    const result = await sendToWorker('translate', { text, source, target });
    console.log('[WorkerClient] ✅ Worker translation complete');
    return result;
  } catch (err) {
    console.warn('[WorkerClient] Worker failed, using fallback:', err);
    return fallbackTranslate(text, source, target);
  }
}

/**
 * Chat translation via worker with fallback
 */
export async function translateChatInWorker(
  text: string,
  senderLang: string,
  receiverLang: string
): Promise<any> {
  console.log('[WorkerClient] 🔄 Chat translating');
  
  try {
    const result = await sendToWorker('translate_chat', { text, senderLang, receiverLang });
    console.log('[WorkerClient] ✅ Worker chat translation complete');
    return result;
  } catch (err) {
    console.warn('[WorkerClient] Worker failed, using fallback:', err);
    return fallbackTranslateChat(text, senderLang, receiverLang);
  }
}

/**
 * Get English meaning via worker with fallback
 */
export async function toEnglishInWorker(
  text: string,
  source: string
): Promise<string> {
  console.log('[WorkerClient] 🔄 Getting English meaning');
  
  try {
    const result = await sendToWorker<string>('to_english', { text, source });
    console.log('[WorkerClient] ✅ Worker English translation complete');
    return result;
  } catch (err) {
    console.warn('[WorkerClient] Worker failed, using fallback:', err);
    return fallbackToEnglish(text, source);
  }
}

/**
 * Detect language via worker with fallback
 */
export async function detectInWorker(
  text: string
): Promise<{ language: string; confidence: number }> {
  console.log('[WorkerClient] 🔄 Detecting language');
  
  try {
    const result = await sendToWorker<{ language: string; confidence: number }>('detect', { text });
    console.log('[WorkerClient] ✅ Worker detection complete:', result.language);
    return result;
  } catch (err) {
    console.warn('[WorkerClient] Worker failed, using fallback:', err);
    return fallbackDetect(text);
  }
}

/**
 * Terminate worker
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    pendingMessages.clear();
  }
}

/**
 * Reset worker state (for testing/debugging)
 */
export function resetWorker(): void {
  terminateWorker();
  workerFailed = false;
}
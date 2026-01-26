/**
 * Web Worker Client for Xenova Translation
 * =========================================
 * Provides async API to translation worker
 * All ML runs in worker thread - main thread stays responsive
 */

let worker: Worker | null = null;
let messageId = 0;
const pendingMessages = new Map<string, {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}>();

/**
 * Initialize worker
 */
function getWorker(): Worker {
  if (!worker) {
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
      // Reject all pending messages on worker error
      pendingMessages.forEach((pending, id) => {
        pending.reject(new Error('Worker crashed'));
        pendingMessages.delete(id);
      });
    };
    
    console.log('[WorkerClient] Translation worker initialized');
  }
  
  return worker;
}

/**
 * Send message to worker and get promise
 */
function sendToWorker<T>(type: string, payload: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = `msg_${++messageId}`;
    const timeoutId = setTimeout(() => {
      pendingMessages.delete(id);
      reject(new Error('Translation timeout'));
    }, 30000); // 30 second timeout
    
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
      getWorker().postMessage({ id, type, payload });
    } catch (err) {
      pendingMessages.delete(id);
      clearTimeout(timeoutId);
      reject(err);
    }
  });
}

/**
 * Translate text via worker
 */
export async function translateInWorker(
  text: string,
  source: string,
  target: string
): Promise<any> {
  console.log('[WorkerClient] 🔄 Sending translation to worker:', { text: text.substring(0, 20), source, target });
  const result = await sendToWorker('translate', { text, source, target });
  console.log('[WorkerClient] ✅ Translation received from worker');
  return result;
}

/**
 * Chat translation via worker
 */
export async function translateChatInWorker(
  text: string,
  senderLang: string,
  receiverLang: string
): Promise<any> {
  console.log('[WorkerClient] 🔄 Sending chat translation to worker');
  const result = await sendToWorker('translate_chat', { text, senderLang, receiverLang });
  console.log('[WorkerClient] ✅ Chat translation received from worker');
  return result;
}

/**
 * Get English meaning via worker
 */
export async function toEnglishInWorker(
  text: string,
  source: string
): Promise<string> {
  console.log('[WorkerClient] 🔄 Sending English translation to worker');
  const result = await sendToWorker<string>('to_english', { text, source });
  console.log('[WorkerClient] ✅ English translation received from worker');
  return result;
}

/**
 * Detect language via worker
 */
export async function detectInWorker(
  text: string
): Promise<{ language: string; confidence: number }> {
  console.log('[WorkerClient] 🔄 Sending language detection to worker');
  const result = await sendToWorker<{ language: string; confidence: number }>('detect', { text });
  console.log('[WorkerClient] ✅ Language detection received from worker');
  return result;
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
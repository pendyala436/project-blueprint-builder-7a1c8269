/**
 * Worker-based Translation Service
 * =================================
 * Non-blocking translation using Web Worker
 * 
 * Features:
 * - All translation/transliteration happens in Web Worker (off main thread)
 * - Message queue with unique IDs to prevent race conditions
 * - Debounced live preview for typing
 * - Unicode NFC normalization
 * - Error handling with fallbacks
 * - NO external APIs - fully in-browser
 */

// ============================================================
// TYPES
// ============================================================

export interface TranslationResult {
  text: string;
  success: boolean;
  cached?: boolean;
}

export interface ChatProcessResult {
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}

export interface LanguageDetectionResult {
  language: string;
  script: string;
  isLatin: boolean;
}

type MessageHandler = (result: any) => void;
type ProgressHandler = (progress: number) => void;

// ============================================================
// WORKER MANAGEMENT
// ============================================================

let worker: Worker | null = null;
let isWorkerReady = false;
let isWorkerLoading = false;
let workerLoadProgress = 0;
let workerError: string | null = null;

const pendingMessages = new Map<string, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}>();

const progressHandlers = new Set<ProgressHandler>();

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize the translation worker
 */
export async function initWorker(onProgress?: ProgressHandler): Promise<boolean> {
  if (isWorkerReady) return true;
  
  if (isWorkerLoading) {
    // Wait for existing load to complete
    return new Promise((resolve) => {
      const checkReady = setInterval(() => {
        if (isWorkerReady) {
          clearInterval(checkReady);
          resolve(true);
        }
        if (workerError) {
          clearInterval(checkReady);
          resolve(false);
        }
      }, 100);
    });
  }

  isWorkerLoading = true;
  workerError = null;

  if (onProgress) {
    progressHandlers.add(onProgress);
  }

  try {
    // Create worker
    worker = new Worker(
      new URL('../../workers/translation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle worker messages
    worker.onmessage = (event) => {
      const data = event.data;

      if (data.type === 'ready') {
        console.log('[WorkerTranslator] Worker ready');
        return;
      }

      if (data.type === 'progress') {
        workerLoadProgress = data.progress;
        progressHandlers.forEach(h => h(data.progress));
        return;
      }

      // Handle response to pending message
      const pending = pendingMessages.get(data.id);
      if (pending) {
        pendingMessages.delete(data.id);
        if (data.success) {
          pending.resolve(data.result);
        } else {
          pending.reject(new Error(data.error || 'Unknown error'));
        }
      }
    };

    worker.onerror = (error) => {
      console.error('[WorkerTranslator] Worker error:', error);
      workerError = error.message;
    };

    // Initialize the model in worker
    const result = await sendToWorker('init', {});
    isWorkerReady = result.ready;
    
    return isWorkerReady;
  } catch (err) {
    workerError = err instanceof Error ? err.message : 'Failed to initialize worker';
    console.error('[WorkerTranslator] Init error:', err);
    return false;
  } finally {
    isWorkerLoading = false;
    if (onProgress) {
      progressHandlers.delete(onProgress);
    }
  }
}

/**
 * Send message to worker and wait for response
 */
async function sendToWorker(type: string, payload: any, timeout = 30000): Promise<any> {
  if (!worker) {
    // Try to init worker first
    const ready = await initWorker();
    if (!ready || !worker) {
      throw new Error('Worker not available');
    }
  }

  return new Promise((resolve, reject) => {
    const id = generateMessageId();
    const timeoutId = setTimeout(() => {
      pendingMessages.delete(id);
      reject(new Error('Worker request timeout'));
    }, timeout);

    pendingMessages.set(id, {
      resolve: (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });

    worker!.postMessage({ id, type, payload });
  });
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Check if worker is ready
 */
export function isReady(): boolean {
  return isWorkerReady;
}

/**
 * Get loading status
 */
export function getLoadingStatus(): {
  isLoading: boolean;
  progress: number;
  error: string | null;
  isReady: boolean;
} {
  return {
    isLoading: isWorkerLoading,
    progress: workerLoadProgress,
    error: workerError,
    isReady: isWorkerReady,
  };
}

/**
 * Translate text (non-blocking, runs in worker)
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  try {
    return await sendToWorker('translate', {
      text,
      sourceLanguage,
      targetLanguage,
    });
  } catch (err) {
    console.error('[WorkerTranslator] Translate error:', err);
    return { text, success: false };
  }
}

/**
 * Transliterate Latin text to native script (non-blocking)
 */
export async function transliterateToNative(
  text: string,
  targetLanguage: string
): Promise<TranslationResult> {
  try {
    return await sendToWorker('transliterate', {
      text,
      targetLanguage,
    });
  } catch (err) {
    console.error('[WorkerTranslator] Transliterate error:', err);
    return { text, success: false };
  }
}

/**
 * Process chat message for both sender and receiver views (non-blocking)
 */
export async function processChatMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<ChatProcessResult> {
  try {
    return await sendToWorker('process_chat', {
      text,
      senderLanguage,
      receiverLanguage,
    });
  } catch (err) {
    console.error('[WorkerTranslator] Process chat error:', err);
    return {
      senderView: text,
      receiverView: text,
      originalText: text,
      wasTransliterated: false,
      wasTranslated: false,
    };
  }
}

/**
 * Detect language from text script
 */
export async function detectLanguage(text: string): Promise<LanguageDetectionResult> {
  try {
    return await sendToWorker('detect_language', { text });
  } catch (err) {
    return { language: 'english', script: 'Latin', isLatin: true };
  }
}

// ============================================================
// DEBOUNCED LIVE PREVIEW
// ============================================================

/**
 * Create debounced live preview handler
 * For real-time typing → native script preview
 */
export function createDebouncedPreview(
  debounceMs: number = 100
): {
  update: (text: string, targetLanguage: string) => Promise<string>;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastText = '';
  let currentPromise: Promise<string> | null = null;

  return {
    update: async (text: string, targetLanguage: string): Promise<string> => {
      const trimmed = text.trim();
      
      // If same as last, return cached
      if (trimmed === lastText && currentPromise) {
        return currentPromise;
      }

      // Cancel previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return new Promise((resolve) => {
        timeoutId = setTimeout(async () => {
          lastText = trimmed;
          
          if (!trimmed) {
            resolve('');
            return;
          }

          try {
            const result = await transliterateToNative(trimmed, targetLanguage);
            resolve(result.text);
          } catch {
            resolve(trimmed);
          }
        }, debounceMs);
      });
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastText = '';
      currentPromise = null;
    },
  };
}

// ============================================================
// UTILITY FUNCTIONS (sync, for quick checks without worker)
// ============================================================

const LATIN_SCRIPT_LANGUAGES = new Set([
  'english', 'en', 'spanish', 'es', 'french', 'fr', 'german', 'de',
  'italian', 'it', 'portuguese', 'pt', 'dutch', 'nl', 'polish', 'pl',
  'turkish', 'tr', 'vietnamese', 'vi', 'indonesian', 'id', 'malay', 'ms',
]);

/**
 * Check if language uses Latin script (sync)
 */
export function isLatinScriptLanguage(language: string): boolean {
  return LATIN_SCRIPT_LANGUAGES.has(language.toLowerCase());
}

/**
 * Check if text is primarily Latin (sync)
 */
export function isLatinText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  if (!cleaned) return true;
  const latinChars = cleaned.match(/[a-zA-Z]/g);
  return latinChars !== null && (latinChars.length / cleaned.length) > 0.7;
}

/**
 * Check if two languages are the same (sync)
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  const n1 = lang1.toLowerCase().trim();
  const n2 = lang2.toLowerCase().trim();
  return n1 === n2;
}

/**
 * Normalize Unicode to NFC (sync)
 */
export function normalizeUnicode(text: string): string {
  try {
    return text.normalize('NFC');
  } catch {
    return text;
  }
}

// ============================================================
// CLEANUP
// ============================================================

/**
 * Terminate worker (cleanup)
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    isWorkerReady = false;
    isWorkerLoading = false;
    pendingMessages.clear();
  }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    terminateWorker();
  });
}

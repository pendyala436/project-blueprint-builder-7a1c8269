/**
 * Worker-based Translation Service
 * =================================
 * Non-blocking translation using Web Worker
 * 
 * Fixes Applied:
 * - Debounced preview (50-100ms throttle)
 * - Message queue with unique IDs
 * - Timeout handling
 * - Error handling with fallbacks
 * - Unicode NFC normalization
 * - Atomic state updates
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
  confidence: number;
}

export interface BatchTranslateItem {
  id: string;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface BatchTranslateResult {
  id: string;
  text: string;
  success: boolean;
}

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
  timeout: ReturnType<typeof setTimeout>;
}>();

const progressHandlers = new Set<ProgressHandler>();

// Message ID counter for uniqueness
let messageIdCounter = 0;

/**
 * Generate unique message ID
 * Fixes: Message overlap in multi-user scenario
 */
function generateMessageId(): string {
  messageIdCounter++;
  return `${Date.now()}-${messageIdCounter}-${Math.random().toString(36).substr(2, 6)}`;
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
      
      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        resolve(false);
      }, 60000);
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
        clearTimeout(pending.timeout);
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
      
      // Reject all pending messages
      pendingMessages.forEach((pending, id) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Worker crashed'));
        pendingMessages.delete(id);
      });
    };

    // Initialize the model in worker
    const result = await sendToWorker('init', {}, 120000); // 2 min timeout for model load
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
 * Fixes: Timeout handling, unique message IDs
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
      reject(new Error(`Worker request timeout after ${timeout}ms`));
    }, timeout);

    pendingMessages.set(id, {
      resolve: (result) => {
        resolve(result);
      },
      reject: (error) => {
        reject(error);
      },
      timeout: timeoutId,
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
 * Check if translator is available (ready or loading)
 */
export function isTranslatorReady(): boolean {
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
    return { language: 'english', script: 'Latin', isLatin: true, confidence: 0 };
  }
}

/**
 * Batch translate multiple items
 * Fixes: Multi-user scenario with overlapping messages
 */
export async function batchTranslate(items: BatchTranslateItem[]): Promise<BatchTranslateResult[]> {
  try {
    return await sendToWorker('batch_translate', { items }, 60000);
  } catch (err) {
    console.error('[WorkerTranslator] Batch translate error:', err);
    return items.map(item => ({ id: item.id, text: item.text, success: false }));
  }
}

// ============================================================
// DEBOUNCED LIVE PREVIEW
// Fixes: Preview lags during typing, flickering
// ============================================================

interface DebouncedPreviewHandler {
  update: (text: string, targetLanguage: string) => Promise<string>;
  cancel: () => void;
}

/**
 * Create debounced live preview handler
 * For real-time typing → native script preview
 * 
 * @param debounceMs - Debounce delay (50-100ms recommended)
 */
export function createDebouncedPreview(debounceMs: number = 75): DebouncedPreviewHandler {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastText = '';
  let lastResult = '';
  let pendingResolve: ((value: string) => void) | null = null;

  return {
    update: async (text: string, targetLanguage: string): Promise<string> => {
      const trimmed = text.trim();
      
      // If empty, return empty
      if (!trimmed) {
        lastText = '';
        lastResult = '';
        return '';
      }
      
      // If same as last, return cached result
      if (trimmed === lastText && lastResult) {
        return lastResult;
      }

      // Cancel previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Cancel previous pending resolve
      if (pendingResolve) {
        pendingResolve(trimmed);
        pendingResolve = null;
      }

      return new Promise((resolve) => {
        pendingResolve = resolve;
        
        timeoutId = setTimeout(async () => {
          lastText = trimmed;
          
          try {
            // Quick check if target is Latin script
            if (isLatinScriptLanguage(targetLanguage)) {
              lastResult = trimmed;
              resolve(trimmed);
              return;
            }
            
            // Check if text is already in native script
            if (!isLatinText(trimmed)) {
              lastResult = normalizeUnicode(trimmed);
              resolve(lastResult);
              return;
            }
            
            const result = await transliterateToNative(trimmed, targetLanguage);
            lastResult = result.text;
            resolve(result.text);
          } catch {
            lastResult = trimmed;
            resolve(trimmed);
          } finally {
            pendingResolve = null;
          }
        }, debounceMs);
      });
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (pendingResolve) {
        pendingResolve(lastText);
        pendingResolve = null;
      }
      lastText = '';
      lastResult = '';
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
  'tagalog', 'tl', 'swahili', 'sw', 'javanese', 'jv', 'cebuano', 'ceb',
  'romanian', 'ro', 'czech', 'cs', 'hungarian', 'hu', 'swedish', 'sv',
  'danish', 'da', 'finnish', 'fi', 'norwegian', 'no', 'croatian', 'hr',
  'slovak', 'sk', 'slovenian', 'sl', 'latvian', 'lv', 'lithuanian', 'lt',
  'estonian', 'et', 'bosnian', 'bs', 'albanian', 'sq', 'icelandic', 'is',
  'irish', 'ga', 'welsh', 'cy', 'basque', 'eu', 'catalan', 'ca',
  'galician', 'gl', 'maltese', 'mt', 'afrikaans', 'af', 'yoruba', 'yo',
  'igbo', 'ig', 'hausa', 'ha', 'zulu', 'zu', 'xhosa', 'xh', 'somali', 'so',
  'uzbek', 'uz', 'turkmen', 'tk',
]);

/**
 * Check if language uses Latin script (sync)
 */
export function isLatinScriptLanguage(language: string): boolean {
  return LATIN_SCRIPT_LANGUAGES.has(language.toLowerCase());
}

/**
 * Check if text is primarily Latin (sync)
 * Fixes: Extended Latin characters support
 */
export function isLatinText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  if (!cleaned) return true;
  const latinChars = cleaned.match(/[a-zA-Z\u00C0-\u024F]/g);
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
 * Fixes: Combining marks render incorrectly
 */
export function normalizeUnicode(text: string): string {
  try {
    return text.normalize('NFC');
  } catch {
    return text;
  }
}

/**
 * Sync language detection (for quick UI checks)
 */
export function detectLanguageSync(text: string): { language: string; script: string; isLatin: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { language: 'english', script: 'Latin', isLatin: true };
  
  // Quick script patterns
  const patterns = [
    { regex: /[\u0900-\u097F]/, language: 'hindi', script: 'Devanagari' },
    { regex: /[\u0980-\u09FF]/, language: 'bengali', script: 'Bengali' },
    { regex: /[\u0B80-\u0BFF]/, language: 'tamil', script: 'Tamil' },
    { regex: /[\u0C00-\u0C7F]/, language: 'telugu', script: 'Telugu' },
    { regex: /[\u0C80-\u0CFF]/, language: 'kannada', script: 'Kannada' },
    { regex: /[\u0D00-\u0D7F]/, language: 'malayalam', script: 'Malayalam' },
    { regex: /[\u0A80-\u0AFF]/, language: 'gujarati', script: 'Gujarati' },
    { regex: /[\u0A00-\u0A7F]/, language: 'punjabi', script: 'Gurmukhi' },
    { regex: /[\u0600-\u06FF]/, language: 'arabic', script: 'Arabic' },
    { regex: /[\u0400-\u04FF]/, language: 'russian', script: 'Cyrillic' },
    { regex: /[\u4E00-\u9FFF]/, language: 'chinese', script: 'Han' },
    { regex: /[\uAC00-\uD7AF]/, language: 'korean', script: 'Hangul' },
    { regex: /[\u0E00-\u0E7F]/, language: 'thai', script: 'Thai' },
  ];
  
  for (const { regex, language, script } of patterns) {
    if (regex.test(trimmed)) {
      return { language, script, isLatin: false };
    }
  }
  
  return { language: 'english', script: 'Latin', isLatin: true };
}

// ============================================================
// CLEANUP
// ============================================================

/**
 * Terminate worker (cleanup)
 */
export function terminateWorker(): void {
  if (worker) {
    // Clear all pending messages
    pendingMessages.forEach((pending, id) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Worker terminated'));
    });
    pendingMessages.clear();
    
    worker.terminate();
    worker = null;
    isWorkerReady = false;
    isWorkerLoading = false;
    workerLoadProgress = 0;
    workerError = null;
    messageIdCounter = 0;
  }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    terminateWorker();
  });
}

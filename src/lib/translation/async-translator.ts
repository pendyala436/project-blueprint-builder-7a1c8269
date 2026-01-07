/**
 * Async Translation Service
 * =========================
 * High-performance, non-blocking translation for massive scale
 * 
 * Features:
 * 1. Supports 300+ NLLB languages
 * 2. Non-blocking async operations (Web Worker based)
 * 3. Background translation queue
 * 4. Optimistic UI updates
 * 5. Parallel processing for lakhs of users
 * 6. Live native script preview (sender side)
 * 7. Background translation (receiver side)
 * 8. Fully browser-side - NO external API calls
 */

import {
  translate as workerTranslate,
  transliterateToNative as workerTransliterate,
  initWorker,
  isReady as isWorkerReady,
  isSameLanguage as workerIsSameLanguage,
  isLatinScriptLanguage as workerIsLatinScriptLanguage,
  isLatinText as workerIsLatinText,
} from './worker-translator';

// ============================================================
// TYPES
// ============================================================

export interface AsyncTranslationResult {
  text: string;
  originalText: string;
  isTranslated: boolean;
  sourceLanguage?: string;
  targetLanguage?: string;
  error?: string;
}

export interface TranslationTask {
  id: string;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
  resolve: (result: AsyncTranslationResult) => void;
  reject: (error: Error) => void;
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
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 2000;

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
  // LRU eviction if needed
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const oldest = [...translationCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) translationCache.delete(oldest[0]);
  }
  translationCache.set(key, { result, timestamp: Date.now(), hits: 0 });
}

// ============================================================
// UTILITY FUNCTIONS (SYNC - No blocking) - Use worker utilities
// ============================================================

/**
 * Check if language uses Latin script (sync, instant)
 */
export function isLatinScriptLanguage(language: string): boolean {
  return workerIsLatinScriptLanguage(language);
}

/**
 * Check if text is primarily Latin script (sync, instant)
 */
export function isLatinText(text: string): boolean {
  return workerIsLatinText(text);
}

/**
 * Normalize language code for comparison (sync, instant)
 */
export function normalizeLanguage(lang: string): string {
  const l = lang.toLowerCase().trim();
  
  // Common aliases
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
    'zh': 'chinese', 'zho': 'chinese', 'mandarin': 'chinese',
    'ja': 'japanese', 'jpn': 'japanese',
    'ko': 'korean', 'kor': 'korean',
    'ar': 'arabic', 'ara': 'arabic',
    'ru': 'russian', 'rus': 'russian',
    'pt': 'portuguese', 'por': 'portuguese',
  };
  
  return aliases[l] || l;
}

/**
 * Check if two languages are the same (sync, instant)
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  return workerIsSameLanguage(lang1, lang2);
}

/**
 * Check if script conversion is needed (sync, instant)
 */
export function needsScriptConversion(language: string): boolean {
  return !isLatinScriptLanguage(language);
}

// ============================================================
// BACKGROUND TRANSLATION QUEUE (Uses Web Worker)
// ============================================================

class TranslationQueue {
  private queue: TranslationTask[] = [];
  private isProcessing = false;
  private concurrentLimit = 10; // Process 10 translations in parallel (browser-side is fast)
  private activeCount = 0;
  private workerInitialized = false;

  private async ensureWorkerReady(): Promise<boolean> {
    if (this.workerInitialized && isWorkerReady()) {
      return true;
    }
    try {
      this.workerInitialized = await initWorker();
      return this.workerInitialized;
    } catch {
      return false;
    }
  }

  async add(task: Omit<TranslationTask, 'id' | 'timestamp' | 'resolve' | 'reject'>): Promise<AsyncTranslationResult> {
    return new Promise((resolve, reject) => {
      const fullTask: TranslationTask = {
        ...task,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        resolve,
        reject,
      };
      
      // Priority queue - high priority first
      if (task.priority === 'high') {
        this.queue.unshift(fullTask);
      } else {
        this.queue.push(fullTask);
      }
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.activeCount >= this.concurrentLimit) return;
    
    this.isProcessing = true;
    
    // Ensure worker is ready
    await this.ensureWorkerReady();
    
    while (this.queue.length > 0 && this.activeCount < this.concurrentLimit) {
      const task = this.queue.shift();
      if (!task) continue;
      
      this.activeCount++;
      
      // Process in background - don't await
      this.processTask(task).finally(() => {
        this.activeCount--;
        // Continue processing if more tasks
        if (this.queue.length > 0) {
          this.processQueue();
        }
      });
    }
    
    this.isProcessing = false;
  }

  private async processTask(task: TranslationTask): Promise<void> {
    try {
      const result = await translateViaBrowserWorker(
        task.text,
        task.sourceLanguage,
        task.targetLanguage
      );
      task.resolve(result);
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  get pendingCount(): number {
    return this.queue.length;
  }
}

// Singleton queue instance
const translationQueue = new TranslationQueue();

// ============================================================
// BROWSER-SIDE TRANSLATION (Uses Web Worker - No API calls)
// ============================================================

async function translateViaBrowserWorker(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<AsyncTranslationResult> {
  try {
    // Non-blocking worker check - if not ready, start init but queue for later
    if (!isWorkerReady()) {
      // Fire and forget init - let the queue handle retries
      initWorker().catch(() => {});
      // Return original for now - caller can retry
      return { text, originalText: text, isTranslated: false };
    }

    const result = await workerTranslate(
      text,
      normalizeLanguage(sourceLanguage),
      normalizeLanguage(targetLanguage)
    );

    return {
      text: result.text || text,
      originalText: text,
      isTranslated: result.success && result.text !== text,
      sourceLanguage,
      targetLanguage,
    };
  } catch (error) {
    console.error('[AsyncTranslator] Browser worker error:', error);
    return { text, originalText: text, isTranslated: false, error: String(error) };
  }
}

async function transliterateViaBrowserWorker(
  text: string,
  targetLanguage: string
): Promise<AsyncTranslationResult> {
  try {
    // Non-blocking worker check - if not ready, return original (don't wait)
    if (!isWorkerReady()) {
      // Try to init in background, but don't block
      initWorker().catch(() => {}); // Fire and forget
      return { text, originalText: text, isTranslated: false };
    }

    const result = await workerTransliterate(text, normalizeLanguage(targetLanguage));

    return {
      text: result.text || text,
      originalText: text,
      isTranslated: result.success && result.text !== text,
      sourceLanguage: 'english',
      targetLanguage,
    };
  } catch (error) {
    console.error('[AsyncTranslator] Transliteration error:', error);
    return { text, originalText: text, isTranslated: false, error: String(error) };
  }
}

// ============================================================
// PUBLIC API - NON-BLOCKING TRANSLATION
// ============================================================

/**
 * Translate text asynchronously (non-blocking, queued)
 * Used for receiver-side translation
 */
export async function translateAsync(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<AsyncTranslationResult> {
  const trimmed = text.trim();
  
  // Empty text - instant return
  if (!trimmed) {
    return { text, originalText: text, isTranslated: false };
  }
  
  // Same language - instant return
  if (isSameLanguage(sourceLanguage, targetLanguage)) {
    return { text: trimmed, originalText: trimmed, isTranslated: false };
  }
  
  // Check cache - instant return if hit
  const cacheKey = getCacheKey(trimmed, sourceLanguage, targetLanguage);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[AsyncTranslator] Cache hit');
    return cached;
  }
  
  // Queue for background processing
  const result = await translationQueue.add({
    text: trimmed,
    sourceLanguage,
    targetLanguage,
    priority
  });
  
  // Cache successful translations
  if (result.isTranslated) {
    setInCache(cacheKey, result);
  }
  
  return result;
}

/**
 * Convert Latin text to native script (for live preview)
 * Non-blocking, uses browser-side worker
 */
export async function convertToNativeScriptAsync(
  text: string,
  targetLanguage: string
): Promise<AsyncTranslationResult> {
  const trimmed = text.trim();
  
  // Empty text
  if (!trimmed) {
    return { text, originalText: text, isTranslated: false };
  }
  
  // Latin script language - no conversion needed
  if (isLatinScriptLanguage(targetLanguage)) {
    return { text: trimmed, originalText: trimmed, isTranslated: false };
  }
  
  // Already in non-Latin - no conversion needed
  if (!isLatinText(trimmed)) {
    return { text: trimmed, originalText: trimmed, isTranslated: false };
  }
  
  // Check cache
  const cacheKey = getCacheKey(trimmed, 'english', targetLanguage);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Use browser-side worker for transliteration
  const result = await transliterateViaBrowserWorker(trimmed, targetLanguage);
  
  if (result.isTranslated) {
    setInCache(cacheKey, result);
  }
  
  return result;
}

/**
 * Process incoming message for receiver (background, non-blocking)
 * Returns immediately with original, updates via callback when translated
 */
export function translateInBackground(
  text: string,
  senderLanguage: string,
  receiverLanguage: string,
  onComplete: (result: AsyncTranslationResult) => void
): void {
  // Same language - no translation needed, callback immediately
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    onComplete({ text, originalText: text, isTranslated: false });
    return;
  }
  
  // Check cache first
  const cacheKey = getCacheKey(text, senderLanguage, receiverLanguage);
  const cached = getFromCache(cacheKey);
  if (cached) {
    onComplete(cached);
    return;
  }
  
  // Queue translation in background - don't block
  translateAsync(text, senderLanguage, receiverLanguage, 'normal')
    .then(onComplete)
    .catch(() => onComplete({ text, originalText: text, isTranslated: false }));
}

/**
 * Create a debounced live preview function
 * For real-time typing feedback without blocking
 */
export function createLivePreviewHandler(
  debounceMs: number = 300
): {
  update: (text: string, targetLanguage: string) => void;
  cancel: () => void;
  getPreview: () => { text: string; isLoading: boolean };
} {
  let timeoutId: NodeJS.Timeout | null = null;
  let currentPreview = { text: '', isLoading: false };
  let onPreviewUpdate: ((preview: { text: string; isLoading: boolean }) => void) | null = null;
  
  const update = (text: string, targetLanguage: string) => {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Skip if no text or Latin language
    if (!text.trim() || isLatinScriptLanguage(targetLanguage) || !isLatinText(text)) {
      currentPreview = { text: '', isLoading: false };
      onPreviewUpdate?.(currentPreview);
      return;
    }
    
    // Set loading state
    currentPreview = { text: currentPreview.text, isLoading: true };
    onPreviewUpdate?.(currentPreview);
    
    // Debounced conversion
    timeoutId = setTimeout(async () => {
      const result = await convertToNativeScriptAsync(text, targetLanguage);
      currentPreview = { 
        text: result.isTranslated ? result.text : '', 
        isLoading: false 
      };
      onPreviewUpdate?.(currentPreview);
    }, debounceMs);
  };
  
  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    currentPreview = { text: '', isLoading: false };
  };
  
  const getPreview = () => currentPreview;
  
  return { update, cancel, getPreview };
}

/**
 * Batch translate multiple messages (for loading history)
 * Parallel processing, non-blocking
 */
export async function batchTranslateAsync(
  messages: Array<{ id: string; text: string; senderId: string }>,
  currentUserId: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<Map<string, AsyncTranslationResult>> {
  const results = new Map<string, AsyncTranslationResult>();
  
  // Same language - no translation needed
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    messages.forEach(m => {
      results.set(m.id, { text: m.text, originalText: m.text, isTranslated: false });
    });
    return results;
  }
  
  // Only translate partner's messages, not own messages
  const toTranslate = messages.filter(m => m.senderId !== currentUserId);
  const ownMessages = messages.filter(m => m.senderId === currentUserId);
  
  // Own messages - no translation
  ownMessages.forEach(m => {
    results.set(m.id, { text: m.text, originalText: m.text, isTranslated: false });
  });
  
  // Partner messages - translate in parallel
  const translationPromises = toTranslate.map(async m => {
    const result = await translateAsync(m.text, senderLanguage, receiverLanguage, 'low');
    results.set(m.id, result);
  });
  
  await Promise.all(translationPromises);
  
  return results;
}

/**
 * Get queue status (for debugging)
 */
export function getQueueStatus(): { pending: number; cacheSize: number } {
  return {
    pending: translationQueue.pendingCount,
    cacheSize: translationCache.size
  };
}

/**
 * Clear translation cache
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

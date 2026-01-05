/**
 * Translation Worker - Background processing for non-blocking operations
 * Handles translation queue with priority and concurrent requests
 */

import { pipeline } from '@huggingface/transformers';
import { ModelFamily } from './language-pairs';
import { resolveLangCode, normalizeLanguageInput } from './utils';

// Worker state - use any to avoid complex union types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let translatorPipeline: any = null;
let isInitializing = false;
let modelFamily: ModelFamily = 'nllb200';

// Translation queue for managing concurrent requests
interface TranslationJob {
  id: string;
  text: string;
  sourceCode: string;
  targetCode: string;
  priority: number;
  resolve: (result: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

const jobQueue: TranslationJob[] = [];
let isProcessing = false;
const MAX_CONCURRENT = 3;
let activeJobs = 0;

/**
 * Initialize translator in background
 */
export async function initWorkerTranslator(
  modelPath: string = 'Xenova/nllb-200-distilled-600M',
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (translatorPipeline) return true;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return translatorPipeline !== null;
  }

  isInitializing = true;

  try {
    const pipelineInstance = await pipeline('translation', modelPath, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress_callback: (progressInfo: any) => {
        if (progressInfo && typeof progressInfo === 'object' && 'progress' in progressInfo) {
          const progress = progressInfo.progress;
          if (typeof progress === 'number') {
            onProgress?.(progress);
          }
        }
      },
    });
    translatorPipeline = pipelineInstance;
    modelFamily = 'nllb200';
    return true;
  } catch (error) {
    console.error('[TranslationWorker] Init failed:', error);
    return false;
  } finally {
    isInitializing = false;
  }
}

/**
 * Check if worker is ready
 */
export function isWorkerReady(): boolean {
  return translatorPipeline !== null;
}

/**
 * Add translation job to queue
 */
export function queueTranslation(
  text: string,
  source: string,
  target: string,
  priority: number = 0
): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return new Promise((resolve, reject) => {
    const sourceCode = resolveLangCode(normalizeLanguageInput(source), modelFamily);
    const targetCode = resolveLangCode(normalizeLanguageInput(target), modelFamily);

    const job: TranslationJob = {
      id,
      text,
      sourceCode,
      targetCode,
      priority,
      resolve,
      reject,
      timestamp: Date.now(),
    };

    // Insert by priority (higher priority first)
    const insertIndex = jobQueue.findIndex(j => j.priority < priority);
    if (insertIndex === -1) {
      jobQueue.push(job);
    } else {
      jobQueue.splice(insertIndex, 0, job);
    }

    processQueue();
  });
}

/**
 * Process translation queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing || activeJobs >= MAX_CONCURRENT || jobQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (jobQueue.length > 0 && activeJobs < MAX_CONCURRENT) {
    const job = jobQueue.shift();
    if (!job) continue;

    activeJobs++;
    
    // Process in background without blocking queue
    processJob(job).finally(() => {
      activeJobs--;
      if (jobQueue.length > 0) {
        processQueue();
      }
    });
  }

  isProcessing = false;
}

/**
 * Process single translation job
 */
async function processJob(job: TranslationJob): Promise<void> {
  try {
    if (!translatorPipeline) {
      const loaded = await initWorkerTranslator();
      if (!loaded) {
        job.reject(new Error('Translation model not available'));
        return;
      }
    }

    const output = await translatorPipeline(job.text, {
      src_lang: job.sourceCode,
      tgt_lang: job.targetCode,
      max_new_tokens: 512,
    });

    // Extract translated text from output
    let translatedText: string;
    if (Array.isArray(output)) {
      const firstResult = output[0];
      translatedText = typeof firstResult === 'object' && firstResult !== null && 'translation_text' in firstResult
        ? (firstResult as { translation_text: string }).translation_text
        : String(firstResult);
    } else if (typeof output === 'object' && output !== null && 'translation_text' in output) {
      translatedText = (output as { translation_text: string }).translation_text;
    } else {
      translatedText = String(output);
    }

    job.resolve(translatedText);
  } catch (error) {
    console.error('[TranslationWorker] Job failed:', job.id, error);
    job.reject(error instanceof Error ? error : new Error('Translation failed'));
  }
}

/**
 * Cancel pending jobs for a user/session
 */
export function cancelPendingJobs(filter?: (job: TranslationJob) => boolean): number {
  if (!filter) {
    const count = jobQueue.length;
    jobQueue.forEach(job => job.reject(new Error('Cancelled')));
    jobQueue.length = 0;
    return count;
  }

  let cancelled = 0;
  for (let i = jobQueue.length - 1; i >= 0; i--) {
    if (filter(jobQueue[i])) {
      jobQueue[i].reject(new Error('Cancelled'));
      jobQueue.splice(i, 1);
      cancelled++;
    }
  }
  return cancelled;
}

/**
 * Get queue stats
 */
export function getQueueStats(): {
  pending: number;
  active: number;
  ready: boolean;
} {
  return {
    pending: jobQueue.length,
    active: activeJobs,
    ready: translatorPipeline !== null,
  };
}

/**
 * Cleanup worker
 */
export function cleanupWorker(): void {
  cancelPendingJobs();
  translatorPipeline = null;
}

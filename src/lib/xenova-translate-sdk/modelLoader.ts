/**
 * Lazy Model Loader for Xenova Translation
 * Loads models only when needed for optimal performance
 */

import { pipeline, env } from '@huggingface/transformers';
import type { ModelLoadProgress } from './types';

// Configure transformers.js for browser
env.allowLocalModels = false;
env.useBrowserCache = true;

// Model instances (lazy loaded)
let m2mPipeline: any = null;
let nllbPipeline: any = null;
let detectorPipeline: any = null;

// Loading state
let m2mLoading = false;
let nllbLoading = false;
let detectorLoading = false;

// Progress callbacks
type ProgressCallback = (progress: ModelLoadProgress) => void;
const progressCallbacks: ProgressCallback[] = [];

/**
 * Subscribe to model loading progress
 */
export function onProgress(callback: ProgressCallback): () => void {
  progressCallbacks.push(callback);
  return () => {
    const idx = progressCallbacks.indexOf(callback);
    if (idx >= 0) progressCallbacks.splice(idx, 1);
  };
}

/**
 * Emit progress to all subscribers
 */
function emitProgress(progress: ModelLoadProgress): void {
  progressCallbacks.forEach(cb => cb(progress));
}

/**
 * Configure thread count based on device
 */
export function configureThreads(isMobile: boolean): void {
  try {
    // Set number of threads based on device
    const threads = isMobile ? 1 : Math.min(navigator.hardwareConcurrency || 4, 4);
    console.log(`[XenovaLoader] Configured ${threads} threads (mobile: ${isMobile})`);
  } catch (e) {
    console.warn('[XenovaLoader] Could not configure threads:', e);
  }
}

/**
 * Load M2M-100 model for Latin ↔ Latin translation
 */
export async function loadM2M(): Promise<any> {
  if (m2mPipeline) return m2mPipeline;
  if (m2mLoading) {
    // Wait for existing load
    while (m2mLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return m2mPipeline;
  }
  
  m2mLoading = true;
  emitProgress({ status: 'loading', progress: 0, model: 'm2m100' });
  
  try {
    console.log('[XenovaLoader] Loading M2M-100 model...');
    
    m2mPipeline = await pipeline(
      'translation',
      'Xenova/m2m100_418M',
      {
        progress_callback: (progress: any) => {
          const pct = Math.round((progress.loaded / progress.total) * 100) || 0;
          emitProgress({ status: 'loading', progress: pct, model: 'm2m100' });
        },
      }
    );
    
    emitProgress({ status: 'ready', progress: 100, model: 'm2m100' });
    console.log('[XenovaLoader] M2M-100 model loaded');
    return m2mPipeline;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    emitProgress({ status: 'error', progress: 0, model: 'm2m100', error: msg });
    console.error('[XenovaLoader] Failed to load M2M-100:', error);
    throw error;
  } finally {
    m2mLoading = false;
  }
}

/**
 * Load NLLB-200 model for non-Latin translation
 */
export async function loadNLLB(): Promise<any> {
  if (nllbPipeline) return nllbPipeline;
  if (nllbLoading) {
    while (nllbLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return nllbPipeline;
  }
  
  nllbLoading = true;
  emitProgress({ status: 'loading', progress: 0, model: 'nllb200' });
  
  try {
    console.log('[XenovaLoader] Loading NLLB-200 model...');
    
    nllbPipeline = await pipeline(
      'translation',
      'Xenova/nllb-200-distilled-600M',
      {
        progress_callback: (progress: any) => {
          const pct = Math.round((progress.loaded / progress.total) * 100) || 0;
          emitProgress({ status: 'loading', progress: pct, model: 'nllb200' });
        },
      }
    );
    
    emitProgress({ status: 'ready', progress: 100, model: 'nllb200' });
    console.log('[XenovaLoader] NLLB-200 model loaded');
    return nllbPipeline;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    emitProgress({ status: 'error', progress: 0, model: 'nllb200', error: msg });
    console.error('[XenovaLoader] Failed to load NLLB-200:', error);
    throw error;
  } finally {
    nllbLoading = false;
  }
}

/**
 * Load language detection model
 */
export async function loadDetector(): Promise<any> {
  if (detectorPipeline) return detectorPipeline;
  if (detectorLoading) {
    while (detectorLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return detectorPipeline;
  }
  
  detectorLoading = true;
  emitProgress({ status: 'loading', progress: 0, model: 'detector' });
  
  try {
    console.log('[XenovaLoader] Loading language detector...');
    
    detectorPipeline = await pipeline(
      'text-classification',
      'Xenova/mbert-base-ft-language-identification',
      {
        progress_callback: (progress: any) => {
          const pct = Math.round((progress.loaded / progress.total) * 100) || 0;
          emitProgress({ status: 'loading', progress: pct, model: 'detector' });
        },
      }
    );
    
    emitProgress({ status: 'ready', progress: 100, model: 'detector' });
    console.log('[XenovaLoader] Language detector loaded');
    return detectorPipeline;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    emitProgress({ status: 'error', progress: 0, model: 'detector', error: msg });
    console.error('[XenovaLoader] Failed to load detector:', error);
    throw error;
  } finally {
    detectorLoading = false;
  }
}

/**
 * Check if any model is currently loading
 */
export function isLoading(): boolean {
  return m2mLoading || nllbLoading || detectorLoading;
}

/**
 * Check if models are ready
 */
export function getModelStatus(): { m2m: boolean; nllb: boolean; detector: boolean } {
  return {
    m2m: !!m2mPipeline,
    nllb: !!nllbPipeline,
    detector: !!detectorPipeline,
  };
}

/**
 * Preload all models (optional - for eager loading)
 */
export async function preloadAll(): Promise<void> {
  await Promise.all([
    loadM2M().catch(e => console.warn('M2M preload failed:', e)),
    loadNLLB().catch(e => console.warn('NLLB preload failed:', e)),
    loadDetector().catch(e => console.warn('Detector preload failed:', e)),
  ]);
}

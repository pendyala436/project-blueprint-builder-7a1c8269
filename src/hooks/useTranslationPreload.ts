/**
 * Translation Model Preloading Hook
 * ==================================
 * 
 * Preloads Xenova translation models in background on app startup.
 * Implements message queuing to ensure browser-based translation
 * always works, even during initial model loading.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  preloadAll, 
  onProgress, 
  isLoading as checkIsLoading, 
  getModelStatus,
  configureThreads,
  type ModelLoadProgress 
} from '@/lib/xenova-translate-sdk/modelLoader';

export interface TranslationReadinessState {
  /** Whether all translation models are loaded and ready */
  isReady: boolean;
  /** Whether models are currently loading */
  isLoading: boolean;
  /** Current loading progress (0-100) */
  progress: number;
  /** Which model is currently loading */
  currentModel: string | null;
  /** Any error that occurred during loading */
  error: string | null;
  /** Individual model status */
  modelStatus: {
    m2m: boolean;
    nllb: boolean;
    detector: boolean;
  };
  /** Manually trigger preload (if not auto-started) */
  startPreload: () => void;
}

// Singleton state to persist across component mounts
let globalState = {
  isReady: false,
  isLoading: false,
  progress: 0,
  currentModel: null as string | null,
  error: null as string | null,
  preloadStarted: false,
  preloadPromise: null as Promise<void> | null,
};

// Subscribers for state updates
const subscribers = new Set<(state: typeof globalState) => void>();

function notifySubscribers() {
  subscribers.forEach(cb => cb({ ...globalState }));
}

function updateGlobalState(updates: Partial<typeof globalState>) {
  globalState = { ...globalState, ...updates };
  notifySubscribers();
}

/**
 * Start preloading models (can be called from anywhere)
 * Returns a promise that resolves when models are ready
 */
export async function startModelPreload(): Promise<void> {
  // If already ready, return immediately
  if (globalState.isReady) {
    console.log('[TranslationPreload] Models already ready');
    return;
  }

  // If already loading, wait for the existing promise
  if (globalState.preloadStarted && globalState.preloadPromise) {
    console.log('[TranslationPreload] Already loading, waiting...');
    return globalState.preloadPromise;
  }

  // Start new preload
  const preloadPromise = (async () => {
    updateGlobalState({ preloadStarted: true, isLoading: true, error: null });
    console.log('[TranslationPreload] 🚀 Starting model preload...');

    // Configure for device type
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    configureThreads(isMobile);
    console.log(`[TranslationPreload] Configured for ${isMobile ? 'mobile' : 'desktop'}`);

    try {
      await preloadAll();
      
      const status = getModelStatus();
      const allReady = status.m2m && status.nllb && status.detector;
      
      updateGlobalState({
        isReady: allReady,
        isLoading: false,
        progress: 100,
        currentModel: null,
      });
      
      console.log('[TranslationPreload] ✅ Models loaded successfully:', status);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load translation models';
      console.error('[TranslationPreload] ❌ Failed to load models:', error);
      
      updateGlobalState({
        isLoading: false,
        error: errorMsg,
        preloadStarted: false, // Allow retry
      });
      throw error;
    }
  })();

  updateGlobalState({ preloadPromise });
  return preloadPromise;
}

/**
 * Wait for translation to be ready with timeout
 * Returns true if ready, false if timed out
 */
export async function waitForTranslationReady(timeoutMs: number = 60000): Promise<boolean> {
  // Already ready
  if (globalState.isReady) {
    return true;
  }

  // Start preload if not started
  if (!globalState.preloadStarted) {
    startModelPreload().catch(() => {});
  }

  // Wait with timeout
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (globalState.isReady) {
      return true;
    }
    
    // If loading failed, try to restart once
    if (globalState.error && !globalState.isLoading && !globalState.preloadStarted) {
      console.log('[TranslationPreload] Retrying after error...');
      startModelPreload().catch(() => {});
    }
    
    // Check every 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn(`[TranslationPreload] ⏱️ Timeout after ${timeoutMs}ms`);
  return false;
}

/**
 * Get a promise that resolves when models are ready
 * Use this to queue operations that need translation
 */
export function getReadyPromise(): Promise<void> {
  if (globalState.isReady) {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    // Start preload if needed
    if (!globalState.preloadStarted) {
      startModelPreload().catch(() => {});
    }
    
    const checkReady = () => {
      if (globalState.isReady) {
        subscribers.delete(checkReady);
        resolve();
      } else if (globalState.error && !globalState.isLoading) {
        subscribers.delete(checkReady);
        reject(new Error(globalState.error));
      }
    };
    
    subscribers.add(checkReady);
    
    // Also check immediately
    checkReady();
  });
}

/**
 * Hook to track translation model readiness
 */
export function useTranslationPreload(autoStart = false): TranslationReadinessState {
  const [state, setState] = useState({
    isReady: globalState.isReady,
    isLoading: globalState.isLoading,
    progress: globalState.progress,
    currentModel: globalState.currentModel,
    error: globalState.error,
  });

  useEffect(() => {
    // Subscribe to global state updates
    const handleUpdate = (newState: typeof globalState) => {
      setState({
        isReady: newState.isReady,
        isLoading: newState.isLoading,
        progress: newState.progress,
        currentModel: newState.currentModel,
        error: newState.error,
      });
    };

    subscribers.add(handleUpdate);

    // Subscribe to progress events from modelLoader
    const unsubscribe = onProgress((progress: ModelLoadProgress) => {
      updateGlobalState({
        progress: progress.progress,
        currentModel: progress.model,
        isLoading: progress.status === 'loading',
        isReady: progress.status === 'ready' && progress.progress === 100,
        error: progress.error || null,
      });
    });

    // Auto-start preloading if enabled
    if (autoStart && !globalState.preloadStarted && !globalState.isReady) {
      startModelPreload();
    }

    return () => {
      subscribers.delete(handleUpdate);
      unsubscribe();
    };
  }, [autoStart]);

  const startPreload = useCallback(() => {
    startModelPreload();
  }, []);

  return {
    isReady: state.isReady,
    isLoading: state.isLoading,
    progress: state.progress,
    currentModel: state.currentModel,
    error: state.error,
    modelStatus: getModelStatus(),
    startPreload,
  };
}

/**
 * Simple check if translation is ready (no hook needed)
 */
export function isTranslationReady(): boolean {
  return globalState.isReady;
}

/**
 * Get current loading progress (no hook needed)
 */
export function getTranslationProgress(): number {
  return globalState.progress;
}

/**
 * Check if preload has started
 */
export function isPreloadStarted(): boolean {
  return globalState.preloadStarted;
}

export default useTranslationPreload;

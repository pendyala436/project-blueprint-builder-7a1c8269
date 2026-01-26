/**
 * Translation Model Preloading Hook
 * ==================================
 * 
 * Preloads Xenova translation models in background on app startup.
 * Shows loading state until models are ready for translation.
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
 */
export async function startModelPreload(): Promise<void> {
  if (globalState.preloadStarted || globalState.isReady) {
    console.log('[TranslationPreload] Already started or ready, skipping');
    return;
  }

  updateGlobalState({ preloadStarted: true, isLoading: true, error: null });
  console.log('[TranslationPreload] Starting model preload...');

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
    
    console.log('[TranslationPreload] Models loaded successfully:', status);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to load translation models';
    console.error('[TranslationPreload] Failed to load models:', error);
    
    updateGlobalState({
      isLoading: false,
      error: errorMsg,
    });
  }
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

export default useTranslationPreload;

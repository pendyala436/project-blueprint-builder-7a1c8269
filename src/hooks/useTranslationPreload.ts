/**
 * Translation Model Preloading Hook (Stub)
 * ==========================================
 * 
 * Browser-based translation removed. This is a stub for compatibility.
 */

import { useState, useCallback } from 'react';

export interface TranslationReadinessState {
  isReady: boolean;
  isLoading: boolean;
  progress: number;
  currentModel: string | null;
  error: string | null;
  modelStatus: {
    m2m: boolean;
    nllb: boolean;
    detector: boolean;
  };
  startPreload: () => void;
}

/**
 * Start preloading models (no-op stub)
 */
export async function startModelPreload(): Promise<void> {
  console.log('[TranslationPreload] Browser-based models removed - using edge function');
  return Promise.resolve();
}

/**
 * Wait for translation ready (always ready - uses edge function)
 */
export async function waitForTranslationReady(timeoutMs: number = 60000): Promise<boolean> {
  return true;
}

/**
 * Get ready promise (resolves immediately)
 */
export function getReadyPromise(): Promise<void> {
  return Promise.resolve();
}

/**
 * Hook stub - always ready
 */
export function useTranslationPreload(autoStart = false): TranslationReadinessState {
  const [state] = useState({
    isReady: true,
    isLoading: false,
    progress: 100,
    currentModel: null as string | null,
    error: null as string | null,
  });

  const startPreload = useCallback(() => {
    // No-op - edge function handles translation
  }, []);

  return {
    isReady: true,
    isLoading: false,
    progress: 100,
    currentModel: null,
    error: null,
    modelStatus: { m2m: true, nllb: true, detector: true },
    startPreload,
  };
}

export function isTranslationReady(): boolean {
  return true;
}

export function getTranslationProgress(): number {
  return 100;
}

export function isPreloadStarted(): boolean {
  return true;
}

export default useTranslationPreload;

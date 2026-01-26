/**
 * Translation Loading Indicator
 * ==============================
 * 
 * Shows loading progress for translation models.
 * Displays in corner of screen until models are ready.
 */

import React from 'react';
import { useTranslationPreload } from '@/hooks/useTranslationPreload';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, AlertCircle, Languages } from 'lucide-react';

interface TranslationLoadingIndicatorProps {
  /** Show even after models are loaded (briefly) */
  showOnReady?: boolean;
  /** Compact mode - just an icon */
  compact?: boolean;
}

export function TranslationLoadingIndicator({ 
  showOnReady = false,
  compact = false 
}: TranslationLoadingIndicatorProps) {
  const { isReady, isLoading, progress, currentModel, error } = useTranslationPreload();
  const [showSuccess, setShowSuccess] = React.useState(false);

  // Show success briefly then hide
  React.useEffect(() => {
    if (isReady && showOnReady) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isReady, showOnReady]);

  // Don't show anything if ready and not showing success
  if (isReady && !showSuccess) {
    return null;
  }

  // Don't show if not loading and no error
  if (!isLoading && !error && !showSuccess) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {isLoading && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{progress}%</span>
          </>
        )}
        {isReady && showSuccess && (
          <CheckCircle className="h-3 w-3 text-success" />
        )}
        {error && (
          <AlertCircle className="h-3 w-3 text-destructive" />
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border rounded-lg shadow-lg p-3 min-w-[200px] max-w-[280px]">
      <div className="flex items-center gap-2 mb-2">
        {isLoading && (
          <>
            <Languages className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium">Loading Translation</span>
          </>
        )}
        {isReady && showSuccess && (
          <>
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">Translation Ready!</span>
          </>
        )}
        {error && (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Translation Error</span>
          </>
        )}
      </div>

      {isLoading && (
        <>
          <Progress value={progress} className="h-1.5 mb-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {currentModel === 'm2m100' && 'Loading M2M model...'}
              {currentModel === 'nllb200' && 'Loading NLLB model...'}
              {currentModel === 'detector' && 'Loading detector...'}
              {!currentModel && 'Initializing...'}
            </span>
            <span>{progress}%</span>
          </div>
        </>
      )}

      {error && (
        <p className="text-xs text-muted-foreground mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export default TranslationLoadingIndicator;

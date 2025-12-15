/**
 * VoiceRecordButton.tsx
 * 
 * A button component for voice-to-text recording.
 * Uses open source Whisper model via @huggingface/transformers.
 * 
 * Features:
 * - Press and hold to record
 * - Visual feedback during recording
 * - Loading state while transcribing
 * - Model loading progress indicator
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceToText } from '@/hooks/useVoiceToText';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceRecordButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceRecordButton = ({
  onTranscription,
  disabled = false,
  className
}: VoiceRecordButtonProps) => {
  const {
    isRecording,
    isTranscribing,
    isLoadingModel,
    modelLoadProgress,
    startRecording,
    stopRecording,
    cancelRecording,
    recordingDuration
  } = useVoiceToText();

  const [showHint, setShowHint] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // Format recording duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle mouse/touch down - start recording after short delay
  const handlePressStart = useCallback(() => {
    if (disabled || isTranscribing) return;

    isLongPressRef.current = false;
    
    // Start recording after 200ms (long press detection)
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      startRecording();
    }, 200);
  }, [disabled, isTranscribing, startRecording]);

  // Handle mouse/touch up - stop recording and transcribe
  const handlePressEnd = useCallback(async () => {
    // Clear long press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    // If it was a long press and we're recording, stop and transcribe
    if (isLongPressRef.current && isRecording) {
      const text = await stopRecording();
      if (text && text.trim()) {
        onTranscription(text.trim());
      }
    } else if (!isLongPressRef.current && !isRecording) {
      // Short tap - show hint
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2000);
    }
  }, [isRecording, stopRecording, onTranscription]);

  // Handle cancel (e.g., dragging away)
  const handleCancel = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (isRecording) {
      cancelRecording();
    }
  }, [isRecording, cancelRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  // Determine button state and appearance
  const isLoading = isTranscribing || isLoadingModel;
  const showProgress = isLoadingModel && modelLoadProgress > 0 && modelLoadProgress < 100;

  return (
    <TooltipProvider>
      <Tooltip open={showHint}>
        <TooltipTrigger asChild>
          <div className={cn("relative", className)}>
            {/* Recording duration indicator */}
            {isRecording && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap animate-pulse">
                <span className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
                {formatDuration(recordingDuration)}
              </div>
            )}

            {/* Model loading progress */}
            {showProgress && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                Loading {modelLoadProgress}%
              </div>
            )}

            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "ghost"}
              className={cn(
                "rounded-full w-10 h-10 transition-all",
                isRecording && "scale-110 ring-4 ring-destructive/30",
                isLoading && "opacity-80"
              )}
              disabled={disabled || isLoading}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handleCancel}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handleCancel}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRecording ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-foreground text-background">
          <p>Hold to record voice message</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VoiceRecordButton;

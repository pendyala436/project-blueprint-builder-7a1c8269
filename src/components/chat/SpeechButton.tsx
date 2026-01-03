/**
 * SpeechButton - Voice input button for chat
 * 
 * Supports two modes:
 * - Speech-to-Text: Convert voice to text message
 * - Speech-to-Speech: Convert voice to translated audio (for receiver)
 */

import React, { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Square, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechService } from '@/hooks/useSpeechService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SpeechButtonProps {
  /** Callback when speech is converted to text */
  onSpeechToText?: (text: string, detectedLanguage?: string) => void;
  /** Callback when speech-to-speech translation completes */
  onSpeechToSpeech?: (result: {
    originalText: string;
    translatedText: string;
    audio: string;
    sourceLanguage?: string;
    targetLanguage: string;
  }) => void;
  /** Source language for speech recognition */
  sourceLanguage?: string;
  /** Target language for speech-to-speech translation */
  targetLanguage?: string;
  /** Mode of operation */
  mode?: 'speech-to-text' | 'speech-to-speech';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export const SpeechButton: React.FC<SpeechButtonProps> = memo(({
  onSpeechToText,
  onSpeechToSpeech,
  sourceLanguage,
  targetLanguage = 'english',
  mode = 'speech-to-text',
  disabled = false,
  className,
  size = 'md'
}) => {
  const {
    isRecording,
    isProcessing,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    speechToText,
    speechToSpeech,
    playAudio
  } = useSpeechService();

  const [showHint, setShowHint] = useState(false);

  // Format recording duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle recording start
  const handlePressStart = useCallback(async () => {
    if (disabled || isProcessing) return;
    await startRecording();
  }, [disabled, isProcessing, startRecording]);

  // Handle recording stop and process
  const handlePressEnd = useCallback(async () => {
    if (!isRecording) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2000);
      return;
    }

    const result = await stopRecording();
    if (!result?.audio) return;

    if (mode === 'speech-to-text') {
      // Speech to text mode
      const sttResult = await speechToText(result.audio, sourceLanguage);
      if (sttResult?.text && onSpeechToText) {
        onSpeechToText(sttResult.text, sttResult.detectedLanguage);
      }
    } else {
      // Speech to speech mode
      const s2sResult = await speechToSpeech(result.audio, targetLanguage, sourceLanguage);
      if (s2sResult) {
        // Play the translated audio
        if (s2sResult.audio) {
          await playAudio(s2sResult.audio);
        }
        
        if (onSpeechToSpeech) {
          onSpeechToSpeech({
            originalText: s2sResult.text || '',
            translatedText: s2sResult.translatedText || '',
            audio: s2sResult.audio || '',
            sourceLanguage: s2sResult.detectedLanguage,
            targetLanguage
          });
        }
      }
    }
  }, [
    isRecording, 
    stopRecording, 
    mode, 
    speechToText, 
    speechToSpeech,
    playAudio,
    sourceLanguage, 
    targetLanguage, 
    onSpeechToText, 
    onSpeechToSpeech
  ]);

  // Handle cancel (e.g., dragging away)
  const handleCancel = useCallback(() => {
    if (isRecording) {
      cancelRecording();
    }
  }, [isRecording, cancelRecording]);

  // Size classes
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const isLoading = isProcessing;
  const isSpeechToSpeech = mode === 'speech-to-speech';

  return (
    <TooltipProvider>
      <Tooltip open={showHint}>
        <TooltipTrigger asChild>
          <div className={cn("relative", className)}>
            {/* Recording duration indicator */}
            {isRecording && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap animate-pulse z-10">
                <span className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
                {formatDuration(recordingDuration)}
              </div>
            )}

            {/* Processing indicator */}
            {isLoading && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap z-10">
                {isSpeechToSpeech ? 'Translating...' : 'Processing...'}
              </div>
            )}

            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "ghost"}
              className={cn(
                "rounded-full transition-all",
                sizeClasses[size],
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
                <Loader2 className={cn(iconSizeClasses[size], "animate-spin")} />
              ) : isRecording ? (
                <Square className={cn(iconSizeClasses[size], "fill-current")} />
              ) : isSpeechToSpeech ? (
                <Volume2 className={iconSizeClasses[size]} />
              ) : (
                <Mic className={iconSizeClasses[size]} />
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-foreground text-background">
          <p>{isSpeechToSpeech ? 'Hold to translate voice' : 'Hold to record voice'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

SpeechButton.displayName = 'SpeechButton';

export default SpeechButton;

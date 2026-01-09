/**
 * useVoiceToText.ts
 * 
 * Custom hook for voice-to-text functionality.
 * Currently returns a stub implementation.
 * Voice-to-text requires external API integration.
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface UseVoiceToTextReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  isLoadingModel: boolean;
  modelLoadProgress: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  recordingDuration: number;
}

export const useVoiceToText = (): UseVoiceToTextReturn => {
  const { toast } = useToast();
  
  const [isRecording] = useState(false);
  const [isTranscribing] = useState(false);
  const [isLoadingModel] = useState(false);
  const [modelLoadProgress] = useState(0);
  const [recordingDuration] = useState(0);

  const startRecording = useCallback(async () => {
    toast({
      title: 'Voice-to-Text Unavailable',
      description: 'Voice transcription requires external API integration.',
      variant: 'destructive'
    });
  }, [toast]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return null;
  }, []);

  const cancelRecording = useCallback(() => {
    // No-op
  }, []);

  return {
    isRecording,
    isTranscribing,
    isLoadingModel,
    modelLoadProgress,
    startRecording,
    stopRecording,
    cancelRecording,
    recordingDuration
  };
};

export default useVoiceToText;

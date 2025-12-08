/**
 * useVoiceRecorder.ts
 * 
 * Custom hook for recording voice messages.
 * Records audio up to 5 minutes and returns a Blob for upload.
 */

import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

const MAX_RECORDING_SECONDS = 300; // 5 minutes

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
  audioLevel: number;
}

export const useVoiceRecorder = (): UseVoiceRecorderReturn => {
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Analyze audio levels for visualization
   */
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average level
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1
    
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  }, [isRecording]);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      streamRef.current = stream;

      // Setup audio analysis for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Create MediaRecorder with best available codec
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingDuration(0);

      // Start audio level analysis
      analyzeAudio();

      // Update duration every second
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          
          // Auto-stop at max duration
          if (newDuration >= MAX_RECORDING_SECONDS) {
            toast({
              title: 'Maximum duration reached',
              description: 'Voice message limited to 5 minutes',
            });
            stopRecordingInternal();
          }
          
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive'
      });
    }
  }, [toast, analyzeAudio]);

  /**
   * Internal stop function (called by timer or manually)
   */
  const stopRecordingInternal = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setAudioLevel(0);
  }, []);

  /**
   * Stop recording and return audio blob
   */
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    stopRecordingInternal();

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = () => {
        setIsRecording(false);

        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());

        // Check minimum duration
        if (recordingDuration < 1) {
          toast({
            title: 'Recording too short',
            description: 'Please record at least 1 second',
            variant: 'destructive'
          });
          setRecordingDuration(0);
          resolve(null);
          return;
        }

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });

        setRecordingDuration(0);
        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  }, [isRecording, recordingDuration, stopRecordingInternal, toast]);

  /**
   * Cancel recording without saving
   */
  const cancelRecording = useCallback(() => {
    stopRecordingInternal();
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  }, [isRecording, stopRecordingInternal]);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    audioLevel
  };
};

export default useVoiceRecorder;

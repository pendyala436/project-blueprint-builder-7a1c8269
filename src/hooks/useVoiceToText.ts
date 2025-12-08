/**
 * useVoiceToText.ts
 * 
 * Custom hook for voice-to-text functionality using open source Whisper model
 * via @huggingface/transformers running in the browser with WebGPU.
 * 
 * Features:
 * - Records audio from microphone
 * - Transcribes using Whisper model locally in browser
 * - No API keys required - runs entirely client-side
 */

import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Type for the transcriber pipeline
type TranscriberPipeline = (audio: Float32Array | string, options?: { language?: string }) => Promise<{ text: string }>;

// Global variable to cache the pipeline
let cachedPipeline: TranscriberPipeline | null = null;
let isLoadingPipeline = false;
let pipelineLoadPromise: Promise<TranscriberPipeline> | null = null;

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
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  /**
   * Load the Whisper transcription pipeline
   * Uses singleton pattern to avoid loading multiple times
   */
  const loadTranscriber = useCallback(async (): Promise<TranscriberPipeline> => {
    // Return cached pipeline if available
    if (cachedPipeline) {
      return cachedPipeline;
    }

    // Wait for existing load operation
    if (isLoadingPipeline && pipelineLoadPromise) {
      return pipelineLoadPromise;
    }

    // Start loading
    isLoadingPipeline = true;
    setIsLoadingModel(true);
    setModelLoadProgress(0);

    pipelineLoadPromise = (async () => {
      try {
        // Dynamic import to avoid loading on page load
        const { pipeline } = await import('@huggingface/transformers');
        
        // Use whisper-tiny for fast transcription
        // Other options: whisper-small, whisper-base (larger = more accurate but slower)
        const transcriber = await pipeline(
          'automatic-speech-recognition',
          'onnx-community/whisper-tiny.en',
          {
            device: 'webgpu',
            progress_callback: (progress: any) => {
              if (progress && typeof progress.progress === 'number') {
                setModelLoadProgress(Math.round(progress.progress));
              }
            }
          }
        ) as unknown as TranscriberPipeline;
        cachedPipeline = transcriber;
        setModelLoadProgress(100);
        return transcriber;
      } catch (error) {
        console.error('Failed to load Whisper model:', error);
        
        // Fallback to CPU if WebGPU not available
        try {
          const { pipeline } = await import('@huggingface/transformers');
          const transcriber = await pipeline(
            'automatic-speech-recognition',
            'onnx-community/whisper-tiny.en'
          ) as unknown as TranscriberPipeline;
          
          cachedPipeline = transcriber;
          setModelLoadProgress(100);
          return transcriber;
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          throw fallbackError;
        }
      } finally {
        isLoadingPipeline = false;
        setIsLoadingModel(false);
      }
    })();

    return pipelineLoadPromise;
  }, []);

  /**
   * Convert audio blob to Float32Array for Whisper
   */
  const audioToFloat32Array = async (audioBlob: Blob): Promise<Float32Array> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get mono channel data
    const channelData = audioBuffer.getChannelData(0);
    
    // Resample to 16kHz if needed (Whisper requires 16kHz)
    if (audioBuffer.sampleRate !== 16000) {
      const ratio = audioBuffer.sampleRate / 16000;
      const newLength = Math.round(channelData.length / ratio);
      const resampled = new Float32Array(newLength);
      
      for (let i = 0; i < newLength; i++) {
        const srcIndex = Math.round(i * ratio);
        resampled[i] = channelData[Math.min(srcIndex, channelData.length - 1)];
      }
      
      return resampled;
    }
    
    return channelData;
  };

  /**
   * Start recording audio from microphone
   */
  const startRecording = useCallback(async () => {
    try {
      // Preload the model in background
      loadTranscriber().catch(console.error);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Update duration every 100ms
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive'
      });
    }
  }, [loadTranscriber, toast]);

  /**
   * Stop recording and transcribe audio
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        try {
          setIsTranscribing(true);
          setIsRecording(false);

          // Stop all tracks
          streamRef.current?.getTracks().forEach(track => track.stop());

          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorder.mimeType 
          });

          // Check minimum duration (at least 0.5 seconds)
          const duration = (Date.now() - startTimeRef.current) / 1000;
          if (duration < 0.5) {
            toast({
              title: 'Recording too short',
              description: 'Please hold longer to record',
              variant: 'destructive'
            });
            setIsTranscribing(false);
            setRecordingDuration(0);
            resolve(null);
            return;
          }

          // Convert to Float32Array
          const audioData = await audioToFloat32Array(audioBlob);

          // Load and run transcriber
          const transcriber = await loadTranscriber();
          const result = await transcriber(audioData);

          const transcribedText = result.text?.trim() || '';
          
          setIsTranscribing(false);
          setRecordingDuration(0);
          resolve(transcribedText);

        } catch (error) {
          console.error('Transcription error:', error);
          toast({
            title: 'Transcription Failed',
            description: 'Could not transcribe audio. Please try again.',
            variant: 'destructive'
          });
          setIsTranscribing(false);
          setRecordingDuration(0);
          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, [isRecording, loadTranscriber, toast]);

  /**
   * Cancel recording without transcribing
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  }, [isRecording]);

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

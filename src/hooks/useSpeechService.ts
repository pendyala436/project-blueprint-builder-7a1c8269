/**
 * useSpeechService - Speech-to-Text and Speech-to-Speech hook
 * 
 * Uses SeamlessM4T via HuggingFace for:
 * - Speech-to-text with auto language detection
 * - Speech-to-speech translation (audio in → translated audio out)
 */

import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SpeechResult {
  text: string;
  detectedLanguage?: string;
  translatedText?: string;
  audio?: string; // Base64 encoded audio
}

export interface UseSpeechServiceReturn {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  
  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<SpeechResult | null>;
  cancelRecording: () => void;
  
  // Speech-to-text
  speechToText: (audio: string, sourceLanguage?: string) => Promise<{ text: string; detectedLanguage?: string } | null>;
  
  // Speech-to-speech
  speechToSpeech: (audio: string, targetLanguage: string, sourceLanguage?: string) => Promise<SpeechResult | null>;
  
  // Text-to-speech
  textToSpeech: (text: string, language: string) => Promise<string | null>;
  
  // Audio playback
  playAudio: (base64Audio: string) => Promise<void>;
}

export const useSpeechService = (): UseSpeechServiceReturn => {
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Convert audio blob to base64
   */
  const audioToBase64 = async (audioBlob: Blob): Promise<string> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  };

  /**
   * Start recording audio from microphone
   */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      streamRef.current = stream;

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

      mediaRecorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();

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
  }, [toast]);

  /**
   * Stop recording and return base64 audio
   */
  const stopRecording = useCallback(async (): Promise<SpeechResult | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        try {
          setIsRecording(false);
          streamRef.current?.getTracks().forEach(track => track.stop());

          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorder.mimeType 
          });

          const duration = (Date.now() - startTimeRef.current) / 1000;
          if (duration < 0.5) {
            toast({
              title: 'Recording too short',
              description: 'Please hold longer to record',
              variant: 'destructive'
            });
            setRecordingDuration(0);
            resolve(null);
            return;
          }

          const base64Audio = await audioToBase64(audioBlob);
          setRecordingDuration(0);
          
          resolve({ text: '', audio: base64Audio });

        } catch (error) {
          console.error('Error processing recording:', error);
          setRecordingDuration(0);
          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, [isRecording, toast]);

  /**
   * Cancel recording without processing
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

  /**
   * Speech-to-text using SeamlessM4T
   */
  const speechToText = useCallback(async (
    audio: string,
    sourceLanguage?: string
  ): Promise<{ text: string; detectedLanguage?: string } | null> => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('seamlessm4t-speech', {
        body: {
          action: 'speech-to-text',
          audio,
          sourceLanguage
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        return {
          text: data.text,
          detectedLanguage: data.detectedLanguage
        };
      }
      
      return null;
    } catch (error) {
      console.error('Speech-to-text error:', error);
      toast({
        title: 'Speech Recognition Failed',
        description: 'Could not convert speech to text. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Speech-to-speech translation using SeamlessM4T
   */
  const speechToSpeech = useCallback(async (
    audio: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<SpeechResult | null> => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('seamlessm4t-speech', {
        body: {
          action: 'speech-to-speech',
          audio,
          sourceLanguage,
          targetLanguage
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        return {
          text: data.originalText,
          translatedText: data.translatedText,
          audio: data.audio,
          detectedLanguage: data.sourceLanguage
        };
      }
      
      return null;
    } catch (error) {
      console.error('Speech-to-speech error:', error);
      toast({
        title: 'Speech Translation Failed',
        description: 'Could not translate speech. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Text-to-speech using SeamlessM4T
   */
  const textToSpeech = useCallback(async (
    text: string,
    language: string
  ): Promise<string | null> => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('seamlessm4t-speech', {
        body: {
          action: 'text-to-speech',
          text,
          targetLanguage: language
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        return data.audio;
      }
      
      return null;
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast({
        title: 'Text-to-Speech Failed',
        description: 'Could not convert text to speech. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Play base64 encoded audio
   */
  const playAudio = useCallback(async (base64Audio: string): Promise<void> => {
    try {
      // Decode base64 to array buffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const audioContext = audioContextRef.current;
      
      // Decode and play audio
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      
    } catch (error) {
      console.error('Audio playback error:', error);
      
      // Fallback: use Audio element
      try {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        await audio.play();
      } catch (fallbackError) {
        console.error('Fallback audio playback error:', fallbackError);
        toast({
          title: 'Audio Playback Failed',
          description: 'Could not play audio.',
          variant: 'destructive'
        });
      }
    }
  }, [toast]);

  return {
    isRecording,
    isProcessing,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    speechToText,
    speechToSpeech,
    textToSpeech,
    playAudio
  };
};

export default useSpeechService;

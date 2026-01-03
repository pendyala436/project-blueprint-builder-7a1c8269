/**
 * useSpeechService - Browser-based Speech-to-Text and Speech-to-Speech
 * 
 * Uses @huggingface/transformers for local Whisper STT and Web Speech API for TTS.
 * No external API calls - runs entirely in the browser.
 * 
 * Features:
 * - Speech-to-text with Whisper (local)
 * - Text-to-speech with Web Speech API (native)
 * - Speech-to-speech translation (STT + translate + TTS)
 */

import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { translateText, detectLanguage } from '@/lib/translation/translation-engine';

// ============================================================================
// Types
// ============================================================================

export interface SpeechResult {
  text: string;
  detectedLanguage?: string;
  translatedText?: string;
  audio?: string; // Base64 encoded audio (for compatibility)
}

export interface UseSpeechServiceReturn {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  isLoadingModel: boolean;
  modelLoadProgress: number;
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
  
  // Direct TTS playback (uses Web Speech API)
  speak: (text: string, language?: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
}

// ============================================================================
// Whisper Pipeline Cache (Singleton)
// ============================================================================

type TranscriberPipeline = (audio: Float32Array | string, options?: { language?: string }) => Promise<{ text: string }>;

let cachedPipeline: TranscriberPipeline | null = null;
let isLoadingPipeline = false;
let pipelineLoadPromise: Promise<TranscriberPipeline> | null = null;

// ============================================================================
// Language Code Mapping for Web Speech API
// ============================================================================

const WEB_SPEECH_LANGUAGE_CODES: Record<string, string> = {
  english: 'en-US',
  hindi: 'hi-IN',
  telugu: 'te-IN',
  tamil: 'ta-IN',
  bengali: 'bn-IN',
  marathi: 'mr-IN',
  gujarati: 'gu-IN',
  kannada: 'kn-IN',
  malayalam: 'ml-IN',
  punjabi: 'pa-IN',
  odia: 'or-IN',
  urdu: 'ur-PK',
  chinese: 'zh-CN',
  japanese: 'ja-JP',
  korean: 'ko-KR',
  arabic: 'ar-SA',
  russian: 'ru-RU',
  spanish: 'es-ES',
  french: 'fr-FR',
  german: 'de-DE',
  italian: 'it-IT',
  portuguese: 'pt-BR',
  dutch: 'nl-NL',
  polish: 'pl-PL',
  turkish: 'tr-TR',
  thai: 'th-TH',
  vietnamese: 'vi-VN',
  indonesian: 'id-ID',
  greek: 'el-GR',
  ukrainian: 'uk-UA',
  hebrew: 'he-IL',
};

const LANGUAGE_ALIASES: Record<string, string> = {
  bangla: 'bengali', oriya: 'odia', mandarin: 'chinese',
  en: 'english', hi: 'hindi', te: 'telugu', ta: 'tamil', bn: 'bengali',
  mr: 'marathi', gu: 'gujarati', kn: 'kannada', ml: 'malayalam', pa: 'punjabi',
  or: 'odia', ur: 'urdu', zh: 'chinese', ja: 'japanese', ko: 'korean',
  ar: 'arabic', ru: 'russian', es: 'spanish', fr: 'french', de: 'german',
  it: 'italian', pt: 'portuguese', nl: 'dutch', pl: 'polish', tr: 'turkish',
  th: 'thai', vi: 'vietnamese', id: 'indonesian', el: 'greek', uk: 'ukrainian',
  he: 'hebrew',
};

function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] || normalized;
}

function getWebSpeechCode(language: string): string {
  return WEB_SPEECH_LANGUAGE_CODES[normalizeLanguage(language)] || 'en-US';
}

// ============================================================================
// Hook Implementation
// ============================================================================

export const useSpeechService = (): UseSpeechServiceReturn => {
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ============================================================================
  // Whisper Model Loading
  // ============================================================================

  const loadTranscriber = useCallback(async (): Promise<TranscriberPipeline> => {
    if (cachedPipeline) {
      return cachedPipeline;
    }

    if (isLoadingPipeline && pipelineLoadPromise) {
      return pipelineLoadPromise;
    }

    isLoadingPipeline = true;
    setIsLoadingModel(true);
    setModelLoadProgress(0);

    pipelineLoadPromise = (async () => {
      try {
        const { pipeline } = await import('@huggingface/transformers');
        
        // Use whisper-tiny for fast transcription
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
        console.error('Failed to load Whisper model with WebGPU:', error);
        
        // Fallback to CPU
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

  // ============================================================================
  // Audio Utilities
  // ============================================================================

  const audioToFloat32Array = async (audioBlob: Blob): Promise<Float32Array> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    
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

  const base64ToBlob = (base64: string, mimeType: string = 'audio/wav'): Blob => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  };

  // ============================================================================
  // Recording Functions
  // ============================================================================

  const startRecording = useCallback(async () => {
    try {
      // Preload model in background
      loadTranscriber().catch(console.error);

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
  }, [loadTranscriber, toast]);

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
          setIsProcessing(true);
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
            setIsProcessing(false);
            resolve(null);
            return;
          }

          // Transcribe locally
          const audioData = await audioToFloat32Array(audioBlob);
          const transcriber = await loadTranscriber();
          const result = await transcriber(audioData);
          
          const transcribedText = result.text?.trim() || '';
          const detectedLang = detectLanguage(transcribedText);
          
          setRecordingDuration(0);
          setIsProcessing(false);
          
          resolve({ 
            text: transcribedText, 
            detectedLanguage: detectedLang.language 
          });

        } catch (error) {
          console.error('Error processing recording:', error);
          setRecordingDuration(0);
          setIsProcessing(false);
          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, [isRecording, loadTranscriber, toast]);

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

  // ============================================================================
  // Speech-to-Text (from base64 audio)
  // ============================================================================

  const speechToText = useCallback(async (
    audio: string,
    sourceLanguage?: string
  ): Promise<{ text: string; detectedLanguage?: string } | null> => {
    setIsProcessing(true);
    
    try {
      const audioBlob = base64ToBlob(audio);
      const audioData = await audioToFloat32Array(audioBlob);
      const transcriber = await loadTranscriber();
      const result = await transcriber(audioData);
      
      const text = result.text?.trim() || '';
      const detected = detectLanguage(text);
      
      return {
        text,
        detectedLanguage: detected.language || sourceLanguage
      };
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
  }, [loadTranscriber, toast]);

  // ============================================================================
  // Text-to-Speech (Web Speech API)
  // ============================================================================

  const speak = useCallback((text: string, language: string = 'english') => {
    if (!('speechSynthesis' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Text-to-speech is not supported in this browser.',
        variant: 'destructive'
      });
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getWebSpeechCode(language);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [toast]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const textToSpeech = useCallback(async (
    text: string,
    language: string
  ): Promise<string | null> => {
    setIsProcessing(true);
    
    try {
      // Use Web Speech API directly (no audio data returned)
      speak(text, language);
      return 'spoken'; // Indicate success
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
  }, [speak, toast]);

  // ============================================================================
  // Speech-to-Speech (STT + Translate + TTS)
  // ============================================================================

  const speechToSpeech = useCallback(async (
    audio: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<SpeechResult | null> => {
    setIsProcessing(true);
    
    try {
      // Step 1: Speech to text (local)
      const sttResult = await speechToText(audio, sourceLanguage);
      if (!sttResult?.text) {
        return null;
      }
      
      const detectedLang = sttResult.detectedLanguage || sourceLanguage || 'english';
      
      // Step 2: Translate text (local)
      const translatedResult = await translateText(sttResult.text, {
        sourceLanguage: detectedLang,
        targetLanguage: targetLanguage
      });
      
      const translatedText = translatedResult.translatedText || sttResult.text;
      
      // Step 3: Text to speech (Web Speech API)
      speak(translatedText, targetLanguage);
      
      return {
        text: sttResult.text,
        translatedText: translatedText,
        detectedLanguage: detectedLang,
        audio: 'spoken' // Indicate TTS was triggered
      };
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
  }, [speechToText, speak, toast]);

  // ============================================================================
  // Audio Playback (for base64 audio data)
  // ============================================================================

  const playAudio = useCallback(async (base64Audio: string): Promise<void> => {
    if (base64Audio === 'spoken') {
      // Already spoken via Web Speech API
      return;
    }
    
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const audioContext = audioContextRef.current;
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      
    } catch (error) {
      console.error('Audio playback error:', error);
      
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
    isLoadingModel,
    modelLoadProgress,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    speechToText,
    speechToSpeech,
    textToSpeech,
    playAudio,
    speak,
    stopSpeaking,
    isSpeaking
  };
};

export default useSpeechService;

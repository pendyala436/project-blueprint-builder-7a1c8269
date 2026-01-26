/**
 * Voice-to-Text Hook with Auto-Detection
 * =======================================
 * 
 * Uses Web Speech API for voice input with automatic language detection.
 * Works with both browser's native STT and Xenova's language detection.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { normalizeLanguageCode } from '@/lib/xenova-translate-sdk/languages';

// ============================================================
// TYPES
// ============================================================

export interface VoiceInputResult {
  text: string;
  isFinal: boolean;
  confidence: number;
  detectedLanguage: string;
}

export interface UseVoiceInputOptions {
  language?: string;              // Preferred language for recognition
  continuous?: boolean;           // Keep listening after speech ends
  interimResults?: boolean;       // Show partial results
  onResult?: (result: VoiceInputResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

// Check browser support
const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
};

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const {
    language,
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onStart,
    onEnd,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // Check support on mount
  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      console.warn('[VoiceInput] Speech recognition not supported');
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
    
    const recognition = new SpeechRecognition();
    
    // Configuration
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;
    
    // Set language (if specified) or use browser default
    if (language) {
      const langCode = normalizeLanguageCode(language);
      // Map to BCP-47 format for Speech API
      const bcp47Map: Record<string, string> = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'te': 'te-IN',
        'ta': 'ta-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'mr': 'mr-IN',
        'gu': 'gu-IN',
        'bn': 'bn-IN',
        'pa': 'pa-IN',
        'ur': 'ur-PK',
        'or': 'or-IN',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'zh': 'zh-CN',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'ar': 'ar-SA',
        'ru': 'ru-RU',
      };
      recognition.lang = bcp47Map[langCode] || langCode;
    }

    // Event handlers
    recognition.onstart = () => {
      console.log('[VoiceInput] Started listening');
      setIsListening(true);
      setError(null);
      startTimeRef.current = Date.now();
      onStart?.();
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let tempInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          tempInterim += transcriptText;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript('');
        
        onResult?.({
          text: finalTranscript,
          isFinal: true,
          confidence: event.results[event.results.length - 1][0].confidence || 0.8,
          detectedLanguage: recognition.lang?.split('-')[0] || 'en',
        });
      } else {
        setInterimTranscript(tempInterim);
        
        onResult?.({
          text: tempInterim,
          isFinal: false,
          confidence: 0.5,
          detectedLanguage: recognition.lang?.split('-')[0] || 'en',
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[VoiceInput] Error:', event.error);
      const errorMessage = getErrorMessage(event.error);
      setError(errorMessage);
      setIsListening(false);
      onError?.(errorMessage);
    };

    recognition.onend = () => {
      console.log('[VoiceInput] Stopped listening');
      setIsListening(false);
      onEnd?.();
    };

    return recognition;
  }, [language, continuous, interimResults, onResult, onError, onStart, onEnd]);

  /**
   * Start voice recognition
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice input not supported in this browser');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    setTranscript('');
    setInterimTranscript('');
    setError(null);

    const recognition = initRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        console.error('[VoiceInput] Start error:', e);
        setError('Failed to start voice recognition');
      }
    }
  }, [isSupported, initRecognition]);

  /**
   * Stop voice recognition
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  /**
   * Toggle listening state
   */
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Clear transcript
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    fullTranscript: transcript + interimTranscript,
    error,
    
    // Actions
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}

/**
 * Map error codes to user-friendly messages
 */
function getErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    'no-speech': 'No speech detected. Please try again.',
    'audio-capture': 'Microphone not available. Please check permissions.',
    'not-allowed': 'Microphone access denied. Please allow microphone access.',
    'network': 'Network error. Please check your connection.',
    'aborted': 'Voice input cancelled.',
    'language-not-supported': 'Language not supported for voice input.',
  };
  return messages[errorCode] || `Voice input error: ${errorCode}`;
}

export default useVoiceInput;

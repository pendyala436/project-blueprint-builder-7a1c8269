/**
 * Speech-to-Text using Web Speech API
 */

import { normalizeLanguageCode } from '../languages';

// Check for SpeechRecognition support
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// Language to BCP 47 locale mapping
const LANG_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  pa: 'pa-IN',
  ur: 'ur-PK',
  or: 'or-IN',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  ru: 'ru-RU',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
};

/**
 * Get BCP 47 locale for a language code
 */
function getLocale(langCode: string): string {
  const code = normalizeLanguageCode(langCode);
  return LANG_TO_LOCALE[code] || `${code}-${code.toUpperCase()}`;
}

/**
 * Check if STT is supported
 */
export function isSTTSupported(): boolean {
  return !!SpeechRecognition;
}

export interface STTOptions {
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

/**
 * Listen for speech input
 */
export function listen(
  langCode: string,
  onResult: (result: STTResult) => void,
  options?: STTOptions
): { stop: () => void } | null {
  if (!isSTTSupported()) {
    console.warn('[STT] Speech recognition not supported');
    return null;
  }
  
  const recognition = new SpeechRecognition();
  recognition.lang = getLocale(langCode);
  recognition.continuous = options?.continuous ?? false;
  recognition.interimResults = options?.interimResults ?? true;
  recognition.maxAlternatives = options?.maxAlternatives ?? 1;
  
  recognition.onresult = (event: any) => {
    const result = event.results[event.results.length - 1];
    const alt = result[0];
    
    onResult({
      transcript: alt.transcript,
      confidence: alt.confidence || 0.5,
      isFinal: result.isFinal,
    });
  };
  
  recognition.onerror = (event: any) => {
    console.error('[STT] Recognition error:', event.error);
  };
  
  recognition.start();
  
  return {
    stop: () => recognition.stop(),
  };
}

/**
 * Listen for a single phrase
 */
export function listenOnce(
  langCode: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const listener = listen(langCode, (result) => {
      if (result.isFinal) {
        listener?.stop();
        resolve(result.transcript);
      }
    });
    
    if (!listener) {
      reject(new Error('Speech recognition not supported'));
    }
  });
}

/**
 * Text-to-Speech using Web Speech API
 */

import { normalizeLanguageCode } from '../languages';

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
  as: 'as-IN',
  ne: 'ne-NP',
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
 * Check if TTS is supported
 */
export function isTTSSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Get available voices for a language
 */
export function getVoicesForLanguage(langCode: string): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return [];
  
  const locale = getLocale(langCode);
  const voices = speechSynthesis.getVoices();
  
  return voices.filter(voice => 
    voice.lang.startsWith(locale.split('-')[0]) ||
    voice.lang === locale
  );
}

/**
 * Speak text in specified language
 */
export function speakText(
  text: string,
  langCode: string,
  options?: {
    rate?: number;    // 0.1 to 10, default 1
    pitch?: number;   // 0 to 2, default 1
    volume?: number;  // 0 to 1, default 1
    voice?: SpeechSynthesisVoice;
  }
): void {
  if (!isTTSSupported()) {
    console.warn('[TTS] Speech synthesis not supported');
    return;
  }
  
  // Cancel any ongoing speech
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getLocale(langCode);
  
  if (options?.rate) utterance.rate = options.rate;
  if (options?.pitch) utterance.pitch = options.pitch;
  if (options?.volume) utterance.volume = options.volume;
  if (options?.voice) utterance.voice = options.voice;
  
  // Find best voice for language
  const voices = getVoicesForLanguage(langCode);
  if (voices.length > 0 && !options?.voice) {
    utterance.voice = voices[0];
  }
  
  utterance.onerror = (event) => {
    console.error('[TTS] Speech error:', event.error);
  };
  
  speechSynthesis.speak(utterance);
}

/**
 * Stop speaking
 */
export function stopSpeaking(): void {
  if (isTTSSupported()) {
    speechSynthesis.cancel();
  }
}

/**
 * Check if currently speaking
 */
export function isSpeaking(): boolean {
  return isTTSSupported() && speechSynthesis.speaking;
}

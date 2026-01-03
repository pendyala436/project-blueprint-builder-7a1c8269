/**
 * DL-Translate Hugging Face Space API Client
 * 
 * Connects to: https://huggingface.co/spaces/kintong3000/dl-translate
 * Uses Gradio API for real ML translation with NLLB model
 * 
 * Language support: 200+ languages via Meta's NLLB model
 */

// DL-Translate Hugging Face Space API endpoint
const DL_TRANSLATE_SPACE_URL = 'https://kintong3000-dl-translate.hf.space';

// Timeout for API calls (10 seconds)
const API_TIMEOUT = 10000;

// Translation cache to avoid duplicate calls
const apiCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Language name mapping for DL-Translate API
// The API uses full language names as inputs
export const DL_TRANSLATE_LANGUAGES: Record<string, string> = {
  // Common languages
  en: 'English', english: 'English',
  hi: 'Hindi', hindi: 'Hindi',
  te: 'Telugu', telugu: 'Telugu',
  ta: 'Tamil', tamil: 'Tamil',
  bn: 'Bengali', bengali: 'Bengali',
  mr: 'Marathi', marathi: 'Marathi',
  gu: 'Gujarati', gujarati: 'Gujarati',
  kn: 'Kannada', kannada: 'Kannada',
  ml: 'Malayalam', malayalam: 'Malayalam',
  pa: 'Punjabi', punjabi: 'Punjabi',
  or: 'Odia', odia: 'Odia', oriya: 'Odia',
  ur: 'Urdu', urdu: 'Urdu',
  as: 'Assamese', assamese: 'Assamese',
  ne: 'Nepali', nepali: 'Nepali',
  
  // European languages
  es: 'Spanish', spanish: 'Spanish',
  fr: 'French', french: 'French',
  de: 'German', german: 'German',
  it: 'Italian', italian: 'Italian',
  pt: 'Portuguese', portuguese: 'Portuguese',
  ru: 'Russian', russian: 'Russian',
  nl: 'Dutch', dutch: 'Dutch',
  pl: 'Polish', polish: 'Polish',
  uk: 'Ukrainian', ukrainian: 'Ukrainian',
  el: 'Greek', greek: 'Greek',
  cs: 'Czech', czech: 'Czech',
  ro: 'Romanian', romanian: 'Romanian',
  hu: 'Hungarian', hungarian: 'Hungarian',
  sv: 'Swedish', swedish: 'Swedish',
  da: 'Danish', danish: 'Danish',
  fi: 'Finnish', finnish: 'Finnish',
  no: 'Norwegian', norwegian: 'Norwegian',
  tr: 'Turkish', turkish: 'Turkish',
  
  // Asian languages
  zh: 'Chinese', chinese: 'Chinese', mandarin: 'Chinese',
  ja: 'Japanese', japanese: 'Japanese',
  ko: 'Korean', korean: 'Korean',
  vi: 'Vietnamese', vietnamese: 'Vietnamese',
  th: 'Thai', thai: 'Thai',
  id: 'Indonesian', indonesian: 'Indonesian',
  ms: 'Malay', malay: 'Malay',
  tl: 'Tagalog', tagalog: 'Tagalog', filipino: 'Tagalog',
  
  // Middle Eastern
  ar: 'Arabic', arabic: 'Arabic',
  he: 'Hebrew', hebrew: 'Hebrew',
  fa: 'Persian', persian: 'Persian', farsi: 'Persian',
  
  // African languages
  sw: 'Swahili', swahili: 'Swahili',
  af: 'Afrikaans', afrikaans: 'Afrikaans',
};

/**
 * Get the DL-Translate language name from code
 */
export function getDLTranslateLanguageName(langCode: string): string {
  const normalized = langCode.toLowerCase().trim();
  return DL_TRANSLATE_LANGUAGES[normalized] || langCode;
}

/**
 * Check if language is supported by DL-Translate API
 */
export function isDLTranslateSupported(langCode: string): boolean {
  const normalized = langCode.toLowerCase().trim();
  return normalized in DL_TRANSLATE_LANGUAGES;
}

/**
 * Translate text using DL-Translate Hugging Face Space API
 * 
 * @param text - Text to translate
 * @param fromLang - Source language (code or name)
 * @param toLang - Target language (code or name)
 * @returns Translated text or null if failed
 */
export async function translateWithDLTranslate(
  text: string,
  fromLang: string,
  toLang: string
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  // Get proper language names for the API
  const sourceLang = getDLTranslateLanguageName(fromLang);
  const targetLang = getDLTranslateLanguageName(toLang);
  
  // Same language - no translation needed
  if (sourceLang.toLowerCase() === targetLang.toLowerCase()) {
    return trimmed;
  }
  
  // Check cache
  const cacheKey = `${trimmed}|${sourceLang}|${targetLang}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[DL-Translate API] Cache hit');
    return cached.result;
  }
  
  try {
    console.log('[DL-Translate API] Calling:', { 
      text: trimmed.slice(0, 50), 
      from: sourceLang, 
      to: targetLang 
    });
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    // Call the Gradio API using the predict endpoint
    const response = await fetch(`${DL_TRANSLATE_SPACE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [trimmed, sourceLang, targetLang],
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('[DL-Translate API] HTTP error:', response.status);
      return null;
    }
    
    const result = await response.json();
    
    // Gradio API returns { data: [result] }
    const translatedText = result?.data?.[0];
    
    if (translatedText && typeof translatedText === 'string') {
      console.log('[DL-Translate API] Success:', translatedText.slice(0, 50));
      
      // Cache the result
      apiCache.set(cacheKey, { result: translatedText, timestamp: Date.now() });
      
      // Cleanup old cache entries
      if (apiCache.size > 500) {
        const oldestKey = apiCache.keys().next().value;
        if (oldestKey) apiCache.delete(oldestKey);
      }
      
      return translatedText;
    }
    
    console.warn('[DL-Translate API] No valid translation in response');
    return null;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[DL-Translate API] Request timeout');
    } else {
      console.error('[DL-Translate API] Error:', error);
    }
    return null;
  }
}

/**
 * Clear the API translation cache
 */
export function clearDLTranslateCache(): void {
  apiCache.clear();
  console.log('[DL-Translate API] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getDLTranslateCacheStats(): { size: number } {
  return { size: apiCache.size };
}

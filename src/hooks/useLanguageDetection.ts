/**
 * Auto Language Detection Hook
 * 
 * Detects language from text input and browser/profile settings
 * Supports 200+ languages with confidence scoring
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  detectScript, 
  detectLanguage,
  LANGUAGES,
  normalizeLanguage,
  getNativeName,
  getCode,
  isLatinScript
} from '@/lib/dl-translate/languages';

interface LanguageDetectionResult {
  language: string;
  languageCode: string;
  nativeName: string;
  script: string;
  isRTL: boolean;
  confidence: number;
  isLatin: boolean;
}

interface UseLanguageDetectionReturn {
  detectFromText: (text: string) => LanguageDetectionResult;
  detectFromBrowser: () => LanguageDetectionResult;
  getBrowserLanguages: () => string[];
  getLanguageInfo: (language: string) => LanguageDetectionResult | null;
  isSameLanguage: (lang1: string, lang2: string) => boolean;
  allLanguages: typeof LANGUAGES;
}

// Browser language to our language name mapping
const BROWSER_LANG_MAP: Record<string, string> = {
  'en': 'english',
  'en-US': 'english',
  'en-GB': 'english',
  'hi': 'hindi',
  'hi-IN': 'hindi',
  'bn': 'bengali',
  'bn-IN': 'bengali',
  'te': 'telugu',
  'te-IN': 'telugu',
  'ta': 'tamil',
  'ta-IN': 'tamil',
  'mr': 'marathi',
  'mr-IN': 'marathi',
  'gu': 'gujarati',
  'gu-IN': 'gujarati',
  'kn': 'kannada',
  'kn-IN': 'kannada',
  'ml': 'malayalam',
  'ml-IN': 'malayalam',
  'pa': 'punjabi',
  'pa-IN': 'punjabi',
  'or': 'odia',
  'or-IN': 'odia',
  'ur': 'urdu',
  'ur-PK': 'urdu',
  'ar': 'arabic',
  'ar-SA': 'arabic',
  'zh': 'chinese',
  'zh-CN': 'chinese',
  'zh-TW': 'chinese',
  'ja': 'japanese',
  'ja-JP': 'japanese',
  'ko': 'korean',
  'ko-KR': 'korean',
  'es': 'spanish',
  'es-ES': 'spanish',
  'es-MX': 'spanish',
  'fr': 'french',
  'fr-FR': 'french',
  'de': 'german',
  'de-DE': 'german',
  'pt': 'portuguese',
  'pt-BR': 'portuguese',
  'pt-PT': 'portuguese',
  'ru': 'russian',
  'ru-RU': 'russian',
  'it': 'italian',
  'it-IT': 'italian',
  'nl': 'dutch',
  'nl-NL': 'dutch',
  'pl': 'polish',
  'pl-PL': 'polish',
  'tr': 'turkish',
  'tr-TR': 'turkish',
  'th': 'thai',
  'th-TH': 'thai',
  'vi': 'vietnamese',
  'vi-VN': 'vietnamese',
  'id': 'indonesian',
  'id-ID': 'indonesian',
  'ms': 'malay',
  'ms-MY': 'malay',
  'tl': 'tagalog',
  'fil': 'filipino',
  'sw': 'swahili',
  'sw-KE': 'swahili',
  'he': 'hebrew',
  'he-IL': 'hebrew',
  'fa': 'persian',
  'fa-IR': 'persian',
  'uk': 'ukrainian',
  'uk-UA': 'ukrainian',
  'el': 'greek',
  'el-GR': 'greek',
  'ne': 'nepali',
  'ne-NP': 'nepali',
  'si': 'sinhala',
  'si-LK': 'sinhala',
  'my': 'burmese',
  'my-MM': 'burmese',
  'km': 'khmer',
  'km-KH': 'khmer',
  'lo': 'lao',
  'lo-LA': 'lao',
  'am': 'amharic',
  'am-ET': 'amharic',
  'ka': 'georgian',
  'ka-GE': 'georgian',
  'hy': 'armenian',
  'hy-AM': 'armenian'
};

export function useLanguageDetection(): UseLanguageDetectionReturn {
  
  // Detect language from text content
  const detectFromText = useCallback((text: string): LanguageDetectionResult => {
    if (!text.trim()) {
      return {
        language: 'english',
        languageCode: 'en',
        nativeName: 'English',
        script: 'Latin',
        isRTL: false,
        confidence: 0,
        isLatin: true
      };
    }

    const detected = detectScript(text);
    const langInfo = LANGUAGES.find(l => l.name === detected.language);

    return {
      language: detected.language,
      languageCode: langInfo?.code || 'en',
      nativeName: langInfo?.native || detected.language,
      script: detected.script,
      isRTL: langInfo?.rtl || false,
      confidence: detected.isLatin ? 0.7 : 0.95, // Lower confidence for Latin (could be any Latin-script language)
      isLatin: detected.isLatin
    };
  }, []);

  // Detect from browser settings
  const detectFromBrowser = useCallback((): LanguageDetectionResult => {
    const browserLangs = navigator.languages || [navigator.language];
    const primaryLang = browserLangs[0] || 'en';
    
    // Try exact match first, then base language
    const mappedLang = BROWSER_LANG_MAP[primaryLang] || 
                       BROWSER_LANG_MAP[primaryLang.split('-')[0]] || 
                       'english';
    
    const langInfo = LANGUAGES.find(l => l.name === mappedLang);

    return {
      language: mappedLang,
      languageCode: langInfo?.code || 'en',
      nativeName: langInfo?.native || 'English',
      script: langInfo?.script || 'Latin',
      isRTL: langInfo?.rtl || false,
      confidence: 0.9,
      isLatin: langInfo?.script === 'Latin'
    };
  }, []);

  // Get all browser languages
  const getBrowserLanguages = useCallback((): string[] => {
    const browserLangs = navigator.languages || [navigator.language];
    return browserLangs.map(lang => {
      const mapped = BROWSER_LANG_MAP[lang] || BROWSER_LANG_MAP[lang.split('-')[0]];
      return mapped || 'english';
    }).filter((v, i, a) => a.indexOf(v) === i); // Unique
  }, []);

  // Get info for a specific language
  const getLanguageInfo = useCallback((language: string): LanguageDetectionResult | null => {
    const normalized = normalizeLanguage(language);
    const langInfo = LANGUAGES.find(l => l.name === normalized || l.code === normalized);
    
    if (!langInfo) return null;

    return {
      language: langInfo.name,
      languageCode: langInfo.code,
      nativeName: langInfo.native,
      script: langInfo.script,
      isRTL: langInfo.rtl || false,
      confidence: 1,
      isLatin: langInfo.script === 'Latin'
    };
  }, []);

  // Check if two languages are the same
  const isSameLanguage = useCallback((lang1: string, lang2: string): boolean => {
    return normalizeLanguage(lang1) === normalizeLanguage(lang2);
  }, []);

  return {
    detectFromText,
    detectFromBrowser,
    getBrowserLanguages,
    getLanguageInfo,
    isSameLanguage,
    allLanguages: LANGUAGES
  };
}

export default useLanguageDetection;

/**
 * Semantic Translation API Client
 * ================================
 * 
 * Calls the Supabase edge function for TRUE meaning-based translation.
 * Uses free APIs (LibreTranslate, MyMemory, Google Translate) via edge function.
 * 
 * NO NLLB-200, NO hardcoding - just API calls through edge function.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SemanticTranslationResult {
  translatedText: string;
  originalText: string;
  englishText?: string;
  senderView?: string;
  receiverView?: string;
  englishCore?: string;
  isTranslated: boolean;
  wasTransliterated?: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface BidirectionalTranslationResult {
  senderView: string;
  receiverView: string;
  englishCore: string;
  originalText: string;
  senderLanguage: string;
  receiverLanguage: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}

/**
 * Translate text using the Supabase edge function
 * This provides TRUE meaning-based translation via free APIs
 */
export async function translateSemantic(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<SemanticTranslationResult> {
  if (!text.trim()) {
    return {
      translatedText: '',
      originalText: '',
      isTranslated: false,
      sourceLanguage,
      targetLanguage,
      confidence: 0,
    };
  }

  try {
    console.log('[SemanticTranslateAPI] Calling edge function:', { 
      text: text.substring(0, 50), 
      source: sourceLanguage, 
      target: targetLanguage 
    });

    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        source: sourceLanguage.toLowerCase(),
        target: targetLanguage.toLowerCase(),
        mode: 'translate',
      },
    });

    if (error) {
      console.error('[SemanticTranslateAPI] Edge function error:', error);
      throw error;
    }

    console.log('[SemanticTranslateAPI] Result:', {
      original: text.substring(0, 30),
      translated: data?.translatedText?.substring(0, 30),
      isTranslated: data?.isTranslated,
    });

    return {
      translatedText: data?.translatedText || data?.translatedMessage || text,
      originalText: text,
      englishText: data?.englishText,
      isTranslated: data?.isTranslated || false,
      wasTransliterated: data?.wasTransliterated || false,
      sourceLanguage: data?.sourceLanguage || sourceLanguage,
      targetLanguage: data?.targetLanguage || targetLanguage,
      confidence: data?.isTranslated ? 0.9 : 0.5,
    };
  } catch (err) {
    console.error('[SemanticTranslateAPI] Exception:', err);
    // Fallback to original text on error
    return {
      translatedText: text,
      originalText: text,
      isTranslated: false,
      sourceLanguage,
      targetLanguage,
      confidence: 0,
    };
  }
}

/**
 * Bidirectional translation for chat - generates views for both sender and receiver
 */
export async function translateBidirectional(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<BidirectionalTranslationResult> {
  if (!text.trim()) {
    return {
      senderView: '',
      receiverView: '',
      englishCore: '',
      originalText: '',
      senderLanguage,
      receiverLanguage,
      wasTransliterated: false,
      wasTranslated: false,
    };
  }

  try {
    console.log('[SemanticTranslateAPI] Bidirectional translation:', {
      text: text.substring(0, 50),
      senderLang: senderLanguage,
      receiverLang: receiverLanguage,
    });

    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        senderLanguage: senderLanguage.toLowerCase(),
        receiverLanguage: receiverLanguage.toLowerCase(),
        mode: 'bidirectional',
      },
    });

    if (error) {
      console.error('[SemanticTranslateAPI] Bidirectional error:', error);
      throw error;
    }

    console.log('[SemanticTranslateAPI] Bidirectional result:', {
      senderView: data?.senderView?.substring(0, 30),
      receiverView: data?.receiverView?.substring(0, 30),
      englishCore: data?.englishCore?.substring(0, 30),
    });

    return {
      senderView: data?.senderView || text,
      receiverView: data?.receiverView || text,
      englishCore: data?.englishCore || text,
      originalText: text,
      senderLanguage: data?.senderLanguage || senderLanguage,
      receiverLanguage: data?.receiverLanguage || receiverLanguage,
      wasTransliterated: data?.wasTransliterated || false,
      wasTranslated: data?.wasTranslated || false,
    };
  } catch (err) {
    console.error('[SemanticTranslateAPI] Bidirectional exception:', err);
    return {
      senderView: text,
      receiverView: text,
      englishCore: text,
      originalText: text,
      senderLanguage,
      receiverLanguage,
      wasTransliterated: false,
      wasTranslated: false,
    };
  }
}

/**
 * Get English meaning from any language text
 */
export async function getEnglishMeaning(
  text: string,
  sourceLanguage: string
): Promise<string> {
  if (!text.trim()) return '';
  
  // If source is already English, return as-is
  const normalizedSource = sourceLanguage.toLowerCase().trim();
  if (normalizedSource === 'english' || normalizedSource === 'en') {
    return text;
  }

  const result = await translateSemantic(text, sourceLanguage, 'english');
  return result.translatedText;
}

/**
 * Check if two languages are the same (including dialect fallbacks)
 */
export function isSameLanguageCheck(lang1: string, lang2: string): boolean {
  const n1 = lang1.toLowerCase().trim();
  const n2 = lang2.toLowerCase().trim();
  
  if (n1 === n2) return true;
  
  // Common dialect mappings
  const fallbacks: Record<string, string> = {
    'bangla': 'bengali',
    'oriya': 'odia',
    'mandarin': 'chinese',
    'filipino': 'tagalog',
    'farsi': 'persian',
  };
  
  const e1 = fallbacks[n1] || n1;
  const e2 = fallbacks[n2] || n2;
  
  return e1 === e2;
}

/**
 * Check if a language is English
 */
export function isEnglishLanguage(lang: string): boolean {
  const n = lang.toLowerCase().trim();
  return n === 'english' || n === 'en';
}

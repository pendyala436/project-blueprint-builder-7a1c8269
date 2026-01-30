/**
 * Translation Engine
 * ===================
 * 
 * Handles all translation via self-hosted servers:
 * - LibreTranslate (194.163.175.245:80) - Latin/Global languages
 * - IndicTrans2 (194.163.175.245:8000) - Indian languages
 * 
 * English is the BIDIRECTIONAL MIDDLEWARE for cross-language translation.
 */

import { supabase } from '@/integrations/supabase/client';

export interface TranslationResult {
  text: string;
  success: boolean;
  pivotUsed?: boolean;
  englishMeaning?: string;
}

/**
 * Translate any text TO English
 * Uses edge function which routes to appropriate backend
 */
export async function translateToEnglish(
  text: string,
  sourceLang: string
): Promise<TranslationResult> {
  if (!text.trim()) {
    return { text: '', success: true };
  }
  
  // If already English, return as-is
  const srcNorm = sourceLang.toLowerCase().trim();
  if (srcNorm === 'en' || srcNorm === 'english') {
    return { text, success: true };
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        sourceLanguage: sourceLang,
        targetLanguage: 'english',
        mode: 'translate'
      }
    });
    
    if (error) {
      console.error('[translateEngine] Error translating to English:', error);
      return { text, success: false };
    }
    
    const translated = data?.translatedText || data?.text || text;
    return { 
      text: translated.trim(), 
      success: translated !== text 
    };
  } catch (err) {
    console.error('[translateEngine] Exception:', err);
    return { text, success: false };
  }
}

/**
 * Translate English TO any language
 * Uses edge function which routes to appropriate backend
 */
export async function translateFromEnglish(
  englishText: string,
  targetLang: string
): Promise<TranslationResult> {
  if (!englishText.trim()) {
    return { text: '', success: true };
  }
  
  // If target is English, return as-is
  const tgtNorm = targetLang.toLowerCase().trim();
  if (tgtNorm === 'en' || tgtNorm === 'english') {
    return { text: englishText, success: true };
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text: englishText,
        sourceLanguage: 'english',
        targetLanguage: targetLang,
        mode: 'translate'
      }
    });
    
    if (error) {
      console.error('[translateEngine] Error translating from English:', error);
      return { text: englishText, success: false };
    }
    
    const translated = data?.translatedText || data?.text || englishText;
    return { 
      text: translated.trim(), 
      success: translated !== englishText 
    };
  } catch (err) {
    console.error('[translateEngine] Exception:', err);
    return { text: englishText, success: false };
  }
}

/**
 * Full bidirectional translation via edge function
 * Returns senderView, receiverView, and englishCore
 */
export async function translateBidirectional(
  text: string,
  senderMT: string,
  receiverMT: string
): Promise<{
  senderView: string;
  receiverView: string;
  englishCore: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
  success: boolean;
}> {
  if (!text.trim()) {
    return {
      senderView: '',
      receiverView: '',
      englishCore: '',
      wasTransliterated: false,
      wasTranslated: false,
      success: true
    };
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('translate-message', {
      body: {
        text,
        senderLanguage: senderMT,
        receiverLanguage: receiverMT,
        mode: 'bidirectional'
      }
    });
    
    if (error) {
      console.error('[translateEngine] Bidirectional error:', error);
      return {
        senderView: text,
        receiverView: text,
        englishCore: text,
        wasTransliterated: false,
        wasTranslated: false,
        success: false
      };
    }
    
    return {
      senderView: data?.senderView || text,
      receiverView: data?.receiverView || text,
      englishCore: data?.englishCore || text,
      wasTransliterated: data?.wasTransliterated || false,
      wasTranslated: data?.wasTranslated || false,
      success: true
    };
  } catch (err) {
    console.error('[translateEngine] Bidirectional exception:', err);
    return {
      senderView: text,
      receiverView: text,
      englishCore: text,
      wasTransliterated: false,
      wasTranslated: false,
      success: false
    };
  }
}

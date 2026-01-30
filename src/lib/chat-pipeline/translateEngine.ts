/**
 * Translation Engine
 * ===================
 * 
 * Self-Hosted Translation Infrastructure:
 * 
 * PORT 80 - LibreTranslate:
 *   - URL: http://194.163.175.245:80/translate
 *   - Use: Latin/Global languages, English ↔ Any direct translations
 *   - Format: { q: text, source: "en", target: "hi", format: "text" }
 * 
 * PORT 8000 - IndicTrans2 + DL-Translate (same port, different engines):
 *   - URL: http://194.163.175.245:8000/translate
 *   
 *   IndicTrans2 (engine: "indictrans"):
 *     - Best for: 22 Indian languages + English
 *     - Format: { text, src_lang: "eng_Latn", tgt_lang: "hin_Deva", engine: "indictrans" }
 *     - Uses NLLB codes: eng_Latn, hin_Deva, tel_Telu, tam_Taml, etc.
 *   
 *   DL-Translate (engine: "dltranslate"):
 *     - Best for: 200+ world languages, fallback for IndicTrans2
 *     - Format: { text, src_lang: "English", tgt_lang: "Hindi", engine: "dltranslate" }
 *     - Uses full language names: English, Hindi, Telugu, Tamil, etc.
 * 
 * Translation Priority Chain:
 *   1. IndicTrans2 (for Indian languages)
 *   2. DL-Translate (fallback if IndicTrans2 fails)
 *   3. LibreTranslate (for Latin/global languages)
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

/**
 * Universal Translation System - 1000+ Languages
 * ===============================================
 * 
 * SINGLE SOURCE OF TRUTH: translate.ts
 * All translations use translateText() from translate.ts
 * 
 * Key Features:
 * 1. Same-language bypass (source = target → return input as-is)
 * 2. Different-language translation via English pivot
 * 3. Dynamic language discovery (no hardcoding)
 * 4. Native script conversion via dynamic-transliterator
 * 5. Real-time typing preview
 * 
 * @example
 * ```tsx
 * import { 
 *   translateText, 
 *   getLanguages, 
 *   isReady,
 *   isSameLanguage 
 * } from '@/lib/translation';
 * 
 * // Same language returns input as-is
 * const result1 = await translateText('Hello', 'english', 'english');
 * // result1.text === 'Hello', result1.isSameLanguage === true
 * 
 * // Different languages use semantic translation
 * const result2 = await translateText('Hello friend', 'english', 'hindi');
 * // result2.text === 'नमस्ते दोस्त', result2.isTranslated === true
 * ```
 */

// ============================================================
// CORE 1000+ LANGUAGE TRANSLATION API (Primary - from translate.ts)
// ============================================================

export {
  // Main translation function - THE SINGLE SOURCE OF TRUTH
  translateText,
  
  // Language discovery
  getLanguages,
  getLanguageCount,
  getLanguageInfo,
  getLanguageCode,
  getTranslator,
  loadEngine,
  
  // Status
  isReady,
  clearCache,
  getCacheStats,
  
  // Language utilities
  normalizeLanguage,
  isLanguageSupported,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  needsScriptConversion,
  autoDetectLanguage,
  
  // Constants - All 1000+ languages
  ALL_LANGUAGES,
  
  // Types
  type Language,
  type TranslationResult,
  type Translator,
  type TranslationEngine,
} from './translate';

// ============================================================
// DYNAMIC TRANSLITERATOR - Script conversion for 1000+ languages
// ============================================================

export {
  dynamicTransliterate,
  reverseTransliterate,
  detectScriptFromText,
  getScriptForLanguage,
} from './dynamic-transliterator';

// ============================================================
// CONVENIENCE ALIASES
// ============================================================

import { translateText, isLatinText as checkLatinText, autoDetectLanguage, normalizeLanguage } from './translate';
import { dynamicTransliterate } from './dynamic-transliterator';

// Legacy function aliases pointing to translate.ts
export const translate = translateText;
export const semanticTranslate = translateText;
export const semanticTranslateBatch = async (items: Array<{ text: string; source: string; target: string }>) => {
  return Promise.all(items.map(item => translateText(item.text, item.source, item.target)));
};

// Transliteration helpers using dynamic-transliterator
export const transliterateToNative = (text: string, targetLanguage: string): string => {
  return dynamicTransliterate(text, targetLanguage) || text;
};

export const convertToNativeScript = (text: string, targetLanguage: string): string => {
  return dynamicTransliterate(text, targetLanguage) || text;
};

export const getNativeScriptPreview = (text: string, targetLanguage: string): string => {
  return dynamicTransliterate(text, targetLanguage) || text;
};

// Process message for chat (uses translateText internally)
export interface ChatProcessResult {
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}

export async function processMessageForChat(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<ChatProcessResult> {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return {
      senderView: '',
      receiverView: '',
      originalText: '',
      wasTransliterated: false,
      wasTranslated: false,
    };
  }

  const { isSameLanguage, isLatinScriptLanguage, isLatinText, needsScriptConversion } = await import('./translate');
  
  let senderView = trimmed;
  let wasTransliterated = false;

  // Convert Latin input to sender's native script if needed
  if (needsScriptConversion(senderLanguage) && isLatinText(trimmed)) {
    senderView = transliterateToNative(trimmed, senderLanguage);
    wasTransliterated = senderView !== trimmed;
  }

  // Same language - receiver sees same as sender
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    return {
      senderView,
      receiverView: senderView,
      originalText: trimmed,
      wasTransliterated,
      wasTranslated: false,
    };
  }

  // Translate using translateText
  let receiverView = senderView;
  let wasTranslated = false;

  try {
    const result = await translateText(senderView, senderLanguage, receiverLanguage);
    if (result.isTranslated && result.text !== senderView) {
      receiverView = result.text;
      wasTranslated = true;
    }
  } catch (err) {
    console.error('[processMessageForChat] Translation error:', err);
  }

  return {
    senderView,
    receiverView,
    originalText: trimmed,
    wasTransliterated,
    wasTranslated,
  };
}

// Bidirectional translation helper
export interface BidirectionalResult {
  forward: string;
  backward: string;
  pivot?: string;
}

export async function translateBidirectional(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<BidirectionalResult> {
  const forward = await translateText(text, sourceLanguage, targetLanguage);
  const backward = await translateText(forward.text, targetLanguage, sourceLanguage);
  
  return {
    forward: forward.text,
    backward: backward.text,
    pivot: forward.englishPivot,
  };
}

export const semanticTranslateBidirectional = translateBidirectional;
export const translateReply = async (text: string, from: string, to: string) => {
  const result = await translateText(text, from, to);
  return result.text;
};

// Status helpers
export const getLoadingStatus = () => ({ ready: true, progress: 100 });
export const isRTL = (lang: string) => {
  const rtlLangs = ['arabic', 'hebrew', 'persian', 'urdu', 'pashto', 'sindhi'];
  return rtlLangs.includes(normalizeLanguage(lang));
};

// Utility exports
export const initWorker = () => Promise.resolve();
export const terminateWorker = () => {};
export const normalizeUnicode = (text: string) => text.normalize('NFC');
export const isLatinScript = (text: string) => checkLatinText(text);
export const detectLanguage = autoDetectLanguage;

// Legacy compatibility - all point to translate.ts functions
export const getSupportedLanguages = () => import('./translate').then(m => m.getLanguages());
export const isPairSupported = () => true; // All pairs supported via English pivot
export const getTotalLanguageCount = () => import('./translate').then(m => m.getLanguageCount());
export const getSupportedPairs = () => [];
export const clearTranslationCache = () => import('./translate').then(m => m.clearCache());
export const getProxyLanguage = (lang: string) => normalizeLanguage(lang);
export const getEffectiveTargetLanguage = (lang: string) => normalizeLanguage(lang);
export const translateInBackground = translateText;
export const translateBidirectionalInBackground = translateBidirectional;
export const translateTargetToSource = async (text: string, target: string, source: string) => {
  const result = await translateText(text, target, source);
  return result.text;
};

// Types for backward compatibility
export type EmbeddedTranslationResult = {
  text: string;
  originalText: string;
  isTranslated: boolean;
  isTransliterated?: boolean;
  source?: string;
  target?: string;
};

export type LanguageDetectionResult = ReturnType<typeof autoDetectLanguage>;
export type AutoDetectedLanguage = LanguageDetectionResult;
export type LanguageInfo = {
  name: string;
  code: string;
  nativeName: string;
  script: string;
  rtl?: boolean;
};
export type BidirectionalTranslationResult = BidirectionalResult;
export type SemanticTranslationResult = Awaited<ReturnType<typeof translateText>>;

// Constants placeholder
export const LANGUAGES = {} as Record<string, LanguageInfo>;

// ============================================================
// HOOKS (Recommended)
// ============================================================

export { useSemanticTranslation, useTranslate, useChatTranslation } from '@/hooks/useSemanticTranslation';
export { useRealtimeChatTranslation } from '@/hooks/useRealtimeChatTranslation';
export { useRealtimeTranslation, type TypingIndicator } from './useRealtimeTranslation';
export type { ChatMessageResult, LivePreviewResult } from '@/hooks/useRealtimeChatTranslation';

// ============================================================
// LIBRE-TRANSLATE (Browser-Based Translation Engine)
// ============================================================

export {
  useLibreTranslate,
  processChatMessage,
  getInstantPreview,
  hasTransliteration,
  type TypingMode,
  type TranslationCombination,
  type ChatMessageViews,
  type ChatProcessingOptions,
} from '@/lib/libre-translate';

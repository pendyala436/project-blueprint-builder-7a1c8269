/**
 * Translation Types - Unified TypeScript interfaces
 * For embedded translation system with multi-model fallback
 */

// ============================================================================
// Language Types
// ============================================================================

export type LanguageCode = string;

export interface ScriptPattern {
  regex: RegExp;
  language: string;
  script: string;
}

// ============================================================================
// Translation Types
// ============================================================================

export interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  mode?: 'auto' | 'translate' | 'convert';
  preferredModel?: 'dictionary' | 'api';  // dictionary = local, api = DL-Translate HuggingFace
}

export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  isTranslated: boolean;
  mode: 'translate' | 'convert' | 'same_language' | 'dictionary' | 'phonetic' | 'neural';
  model?: string | null;
}

export interface BatchTranslationItem {
  text: string;
  options: TranslationOptions;
}

export interface BatchTranslationResult {
  results: TranslationResult[];
  successCount: number;
  failureCount: number;
}

// ============================================================================
// Detection Types
// ============================================================================

export interface LanguageDetectionResult {
  language: string;
  isLatin: boolean;
  confidence: number;
  isPhonetic?: boolean;
  script?: string;
}

// ============================================================================
// Config Types
// ============================================================================

export interface TranslatorConfig {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  maxRetries?: number;
  timeout?: number;
}

// ============================================================================
// Hook Types
// ============================================================================

export interface LivePreviewState {
  latinInput: string;
  nativePreview: string;
  isConverting: boolean;
}

export interface ChatTranslationOptions {
  currentUserId: string;
  currentUserLanguage: string;
  partnerId: string;
  partnerLanguage: string;
  debounceMs?: number;
}

export interface ProcessedMessage {
  nativeText: string;
  originalLatin: string;
}

export interface TranslatedMessage {
  id: string;
  senderId: string;
  originalText: string;
  senderNativeText: string;
  receiverNativeText: string;
  displayText: string;
  isTranslated: boolean;
  senderLanguage: string;
  receiverLanguage: string;
  createdAt: string;
}

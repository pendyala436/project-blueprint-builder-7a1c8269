/**
 * Universal Translation Bridge
 * =============================
 * 
 * Bridges the offline translation system with existing chat components.
 * Provides a unified API for translation across the application.
 * 
 * Based on LibreTranslate architecture:
 * - Local only (no external APIs)
 * - Dynamic language handling from languages.ts
 * - English as universal pivot
 * - Profile-based automatic translation direction
 */

// Re-export everything from offline-translation
export * from '@/lib/offline-translation';

// Import for convenience
import {
  translate as offlineTranslate,
  translateSimple as offlineTranslateChat,
  translateForChat as translateForProfiles,
  getNativePreview,
  getEnglishPreview,
  initializeEngine,
  isEngineReady,
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  detectLanguage,
  transliterateToNative,
  reverseTransliterate,
  type TranslationResult,
  type ChatMessageViews,
  type UserLanguageProfile,
} from '@/lib/offline-translation';

// ============================================================
// COMPATIBILITY LAYER
// ============================================================

/**
 * Translate text using the universal offline engine
 * This is the main entry point for all translation
 */
export async function universalTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  return offlineTranslate(text, sourceLanguage, targetLanguage);
}

/**
 * Translate for chat display (sender and receiver views)
 */
export async function translateForChatDisplay(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<ChatMessageViews> {
  return offlineTranslateChat(text, senderLanguage, receiverLanguage);
}

/**
 * Create user profile for translation
 */
export function createUserProfile(
  userId: string,
  gender: 'male' | 'female',
  motherTongue: string
): UserLanguageProfile {
  return {
    userId,
    gender,
    motherTongue: normalizeLanguage(motherTongue),
    scriptType: isLatinScriptLanguage(motherTongue) ? 'latin' : 'native',
  };
}

/**
 * Get instant preview while typing
 */
export function getTypingPreview(text: string, language: string): string {
  return getNativePreview(text, language);
}

/**
 * Get English meaning for text
 */
export async function getEnglishMeaning(text: string, language: string): Promise<string> {
  return getEnglishPreview(text, language);
}

/**
 * Initialize the translation engine
 * Call this early in the app lifecycle
 */
export async function initializeTranslation(): Promise<void> {
  if (!isEngineReady()) {
    await initializeEngine();
    console.log('[UniversalTranslation] Engine ready');
  }
}

/**
 * Check if translation engine is ready
 */
export function isTranslationReady(): boolean {
  return isEngineReady();
}

// ============================================================
// TRANSLATION DIRECTION HELPER
// ============================================================

export type TranslationDirection = 
  | 'native-to-native'
  | 'native-to-latin'
  | 'latin-to-native'
  | 'latin-to-latin'
  | 'english-source'
  | 'english-target'
  | 'passthrough';

/**
 * Determine translation direction based on languages
 */
export function getTranslationDirection(
  sourceLanguage: string,
  targetLanguage: string
): TranslationDirection {
  const source = normalizeLanguage(sourceLanguage);
  const target = normalizeLanguage(targetLanguage);
  
  if (isSameLanguage(source, target)) return 'passthrough';
  if (isEnglish(source)) return 'english-source';
  if (isEnglish(target)) return 'english-target';
  
  const sourceIsLatin = isLatinScriptLanguage(source);
  const targetIsLatin = isLatinScriptLanguage(target);
  
  if (sourceIsLatin && targetIsLatin) return 'latin-to-latin';
  if (sourceIsLatin) return 'latin-to-native';
  if (targetIsLatin) return 'native-to-latin';
  return 'native-to-native';
}

/**
 * Check if English pivot is needed
 */
export function needsEnglishPivot(direction: TranslationDirection): boolean {
  return [
    'native-to-native',
    'native-to-latin',
    'latin-to-native',
  ].includes(direction);
}

// ============================================================
// SCRIPT UTILITIES
// ============================================================

export {
  normalizeLanguage,
  isLatinScriptLanguage,
  isLatinText,
  isSameLanguage,
  isEnglish,
  detectLanguage,
  transliterateToNative,
  reverseTransliterate,
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default universalTranslate;

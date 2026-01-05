/**
 * DL-Translate TypeScript Port
 * ============================
 * Inspired by: https://github.com/xhluca/dl-translate
 * 
 * Complete translation solution for chat applications supporting 200+ languages
 * with auto-detection, native script conversion, and bidirectional translation.
 * 
 * Key Features:
 * 1. Auto-detect source language from text script
 * 2. Convert Latin typing to user's native script (real-time preview)
 * 3. Bidirectional chat translation (sender → receiver, receiver → sender)
 * 4. Same language optimization (native script works, no translation)
 * 5. Support for 200+ languages worldwide
 * 
 * Chat Translation Workflow:
 * -------------------------
 * 1. User A (Hindi speaker) types in English: "Hello, how are you?"
 * 2. Live preview shows: "हैलो, हाउ आर यू?" (in Hindi script)
 * 3. On send, message stored in Hindi script
 * 4. User B (Telugu speaker) receives: "హలో, మీరు ఎలా ఉన్నారు?" (in Telugu)
 * 5. If both users speak same language, no translation - just native script
 * 
 * @example
 * ```tsx
 * import { 
 *   translate, 
 *   translateForChat, 
 *   convertToNativeScript,
 *   useDLTranslate 
 * } from '@/lib/dl-translate';
 * 
 * // Basic translation
 * const result = await translate('Hello world', undefined, 'hindi');
 * console.log(result.text); // "नमस्ते दुनिया"
 * 
 * // Chat translation (sender → receiver)
 * const chatResult = await translateForChat('How are you?', {
 *   senderLanguage: 'english',
 *   receiverLanguage: 'hindi',
 * });
 * console.log(chatResult.text); // "आप कैसे हैं?"
 * 
 * // Using React hook
 * const { 
 *   processOutgoing, 
 *   processIncoming, 
 *   livePreview,
 *   updateLivePreview 
 * } = useDLTranslate({
 *   userLanguage: 'hindi',
 *   partnerLanguage: 'telugu'
 * });
 * ```
 */

// Types
export type {
  TranslationResult,
  LanguageInfo,
  ChatTranslationOptions,
  ScriptDetectionResult,
  ChatMessage,
  LivePreview,
  CacheEntry,
  TranslatorConfig,
  BatchTranslationItem,
  BatchTranslationResult,
} from './types';

// Core translation functions
export {
  translate,
  translateForChat,
  convertToNativeScript,
  processOutgoingMessage,
  processIncomingMessage,
  translateBatch,
  detect,
  clearCache,
  getCacheStats,
} from './translator';

// Language utilities
export {
  LANGUAGES,
  LANGUAGE_TO_CODE,
  CODE_TO_LANGUAGE,
  LATIN_SCRIPT_LANGUAGES,
  NON_LATIN_LANGUAGES,
  getSupportedLanguages,
  detectScript,
  detectLanguage,
  isLatinScript,
  isLatinScriptLanguage,
  needsScriptConversion,
  isSameLanguage,
  normalizeLanguage,
  getCode,
  getLanguage,
  getNativeName,
  getLanguageInfo,
  isLanguageSupported,
  searchLanguages,
} from './languages';

// React hook
export { useDLTranslate } from './useDLTranslate';
export { useDLTranslate as default } from './useDLTranslate';

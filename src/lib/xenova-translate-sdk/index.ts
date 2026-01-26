/**
 * Xenova Translation SDK
 * =======================
 * 
 * Browser-based translation supporting 1000+ languages
 * Zero server dependency - fully client-side
 * 
 * Features:
 * - Lazy model loading
 * - Mobile-safe mode
 * - Translation caching
 * - Chat translation with sender/receiver views
 * - Language detection
 * - Text-to-Speech & Speech-to-Text
 * 
 * @example
 * ```tsx
 * import { XenovaTranslateSDK } from '@/lib/xenova-translate-sdk';
 * 
 * // Translate text
 * const result = await XenovaTranslateSDK.translate("Hello", "en", "hi");
 * console.log(result.text); // "नमस्ते"
 * 
 * // Chat translation
 * const chat = await XenovaTranslateSDK.translateForChat("How are you?", "en", "te");
 * console.log(chat.receiverView); // "మీరు ఎలా ఉన్నారు?"
 * 
 * // Speak text
 * XenovaTranslateSDK.speak("नमस्ते", "hi");
 * 
 * // Listen for speech
 * XenovaTranslateSDK.listen("en", text => console.log(text));
 * ```
 */

// Types
export type {
  TranslationPath,
  ScriptType,
  Language,
  UserProfile,
  TranslationResult,
  ChatTranslationResult,
  ModelLoadProgress,
  TranslatorConfig,
  WorkerMessage,
  WorkerResponse,
} from './types';

// Translation engine
export {
  translateText,
  translateForChat,
  getEnglishMeaning,
  detectLanguage,
  clearCache,
  getCacheStats,
} from './engine';

// Model loader
export {
  loadM2M,
  loadNLLB,
  loadDetector,
  configureThreads,
  onProgress,
  isLoading,
  getModelStatus,
  preloadAll,
} from './modelLoader';

// Router
export {
  route,
  describePath,
} from './router';

// Language utilities
export {
  LANGUAGES,
  getLanguage,
  isLatinLanguage,
  isLanguageSupported,
  getCodeFromName,
  normalizeLanguageCode,
  isSameLanguage,
  isEnglish,
} from './languages';

// ISO-639 utilities
export {
  getNLLBCode,
  getM2MCode,
  isNLLBSupported,
  isM2MSupported,
  getLanguageName,
} from './iso639';

// Speech
export { speakText, stopSpeaking, isSpeaking, isTTSSupported, getVoicesForLanguage } from './speech/tts';
export { listen, listenOnce, isSTTSupported, type STTResult, type STTOptions } from './speech/stt';

// React hooks
export { useXenovaTranslate, useChatTranslate, type UseXenovaTranslateOptions, type UseXenovaTranslateReturn, type UseChatTranslateOptions } from './useXenovaTranslate';

// Web Worker client for non-blocking ML
export { 
  translateInWorker,
  translateChatInWorker,
  toEnglishInWorker,
  detectInWorker,
  terminateWorker
} from './worker-client';

// SDK singleton for convenience
import { translateText, translateForChat, getEnglishMeaning, detectLanguage, clearCache } from './engine';
import { configureThreads, preloadAll, onProgress } from './modelLoader';
import { speakText, stopSpeaking } from './speech/tts';
import { listen, listenOnce } from './speech/stt';

export const XenovaTranslateSDK = {
  // Translation
  translate: translateText,
  translateForChat,
  getEnglishMeaning,
  detectLanguage,
  
  // Model management
  configureThreads,
  preloadModels: preloadAll,
  onProgress,
  
  // Speech
  speak: speakText,
  stopSpeaking,
  listen,
  listenOnce,
  
  // Cache
  clearCache,
  
  // Initialize for mobile
  initMobile: () => configureThreads(true),
  initDesktop: () => configureThreads(false),
};

export default XenovaTranslateSDK;

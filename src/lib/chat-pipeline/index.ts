/**
 * Chat Pipeline - Clean Translation Architecture
 * ================================================
 * 
 * Production-ready, meaning-based chat translation system.
 * 
 * Features:
 * - Supports ALL languages (via languages.ts)
 * - Any typing method (native, latin, mixed, Gboard, voice)
 * - Meaning-based translation
 * - English as bidirectional middleware
 * - Preview in mother tongue
 * - After send: Sender sees MT + English (small)
 * - Receiver sees their MT + English (small)
 * - Works both directions automatically
 * 
 * @example
 * ```tsx
 * import { processChatMessage, getTypingPreview } from '@/lib/chat-pipeline';
 * 
 * // Full message processing
 * const result = await processChatMessage('hello', 'english', 'telugu');
 * console.log(result.sender.main);   // "hello"
 * console.log(result.receiver.main); // "హలో"
 * console.log(result.sender.english); // "hello"
 * 
 * // Quick preview while typing
 * const preview = await getTypingPreview('namaste', 'hindi', 'english');
 * console.log(preview.preview); // "नमस्ते"
 * console.log(preview.english); // "hello"
 * ```
 */

// ============================================================
// NORMALIZE EXPORTS
// ============================================================

export {
  normalizeText,
  isLatinText,
  isNonLatinScript,
  isSameLanguage,
  isEnglish,
  looksLikeEnglish,
  getLanguageInfo,
} from './normalize';

// ============================================================
// TRANSLATION ENGINE EXPORTS
// ============================================================

export {
  translateToEnglish,
  translateFromEnglish,
  translateBidirectional,
  type TranslationResult,
} from './translateEngine';

// ============================================================
// MESSAGE PIPELINE EXPORTS
// ============================================================

export {
  processChatMessage,
  getTypingPreview,
  type MessageViews,
} from './messagePipeline';

/**
 * Chat Pipeline - Clean Translation Architecture
 * ================================================
 * 
 * Production-ready, meaning-based chat translation system.
 * 
 * Supports ALL 12 Input Methods:
 * 1. Pure English typing - "How are you?"
 * 2. Manual native-script typing - "బాగున్నావా"
 * 3. English transliteration - "bagunnava" → "బాగున్నావా"
 * 4. Mixed/code-mixed - "Bagunnava bro?"
 * 5. Gboard/phonetic keyboard
 * 6. Keyboard layout (INSCRIPT, Phonetic)
 * 7. Virtual keyboard (on-screen)
 * 8. Font-based (legacy, non-Unicode)
 * 9. Voice-to-Text (single language)
 * 10. Voice-to-Text (mixed language)
 * 11. AI-assisted/predictive typing
 * 12. Accessibility typing
 * 
 * Features:
 * - Supports ALL languages (via languages.ts)
 * - Any typing method (native, latin, mixed, Gboard, voice)
 * - Meaning-based translation (not phonetic)
 * - English as bidirectional middleware
 * - Preview in mother tongue
 * - Fire-and-forget mode (never blocks typing)
 * - After send: Sender sees MT + English (small)
 * - Receiver sees their MT + English (small)
 * - Works both directions automatically
 * 
 * @example
 * ```tsx
 * import { processChatMessage, getTypingPreview, analyzeInput } from '@/lib/chat-pipeline';
 * 
 * // Analyze input method
 * const analysis = analyzeInput('bagunnava', 'telugu');
 * console.log(analysis.method); // "transliteration"
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
// INPUT NORMALIZER EXPORTS (All 12 input methods)
// ============================================================

export {
  analyzeAndNormalizeInput as analyzeInput,
  detectInputMethod,
  detectScripts,
  isEnglishText,
  isRomanizedNative,
  normalizeUnicodeText,
  hasLegacyFontEncoding,
  getInputMethodDescription,
  needsTransliteration,
  type InputMethod,
  type InputAnalysis,
} from './inputNormalizer';

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

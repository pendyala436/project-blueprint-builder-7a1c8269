/**
 * Translation Web Worker
 * ======================
 * Handles all translation and transliteration off the main thread
 * for non-blocking UI performance.
 * 
 * Features:
 * - NLLB-200 model loading and caching
 * - Latin → Native script transliteration
 * - Full translation between 200+ languages
 * - Unicode NFC normalization
 * - Message queuing with unique IDs
 * - Error handling with fallbacks
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure for browser-only usage
env.allowLocalModels = false;
env.useBrowserCache = true;

// ============================================================
// TYPES
// ============================================================

interface WorkerMessage {
  id: string;
  type: 'init' | 'translate' | 'transliterate' | 'process_chat' | 'detect_language';
  payload: any;
}

interface WorkerResponse {
  id: string;
  type: string;
  success: boolean;
  result?: any;
  error?: string;
}

// ============================================================
// MODEL & STATE
// ============================================================

const MODEL_ID = 'Xenova/nllb-200-distilled-600M';
let translationPipeline: any = null;
let isLoading = false;
let loadProgress = 0;

// Caches
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 2000;

// Message queue to prevent race conditions
const messageQueue = new Map<string, WorkerMessage>();

// ============================================================
// NLLB LANGUAGE MAPPINGS
// ============================================================

const NLLB_CODES: Record<string, string> = {
  // South Asian
  'hindi': 'hin_Deva', 'hi': 'hin_Deva',
  'bengali': 'ben_Beng', 'bn': 'ben_Beng',
  'telugu': 'tel_Telu', 'te': 'tel_Telu',
  'tamil': 'tam_Taml', 'ta': 'tam_Taml',
  'marathi': 'mar_Deva', 'mr': 'mar_Deva',
  'gujarati': 'guj_Gujr', 'gu': 'guj_Gujr',
  'kannada': 'kan_Knda', 'kn': 'kan_Knda',
  'malayalam': 'mal_Mlym', 'ml': 'mal_Mlym',
  'punjabi': 'pan_Guru', 'pa': 'pan_Guru',
  'odia': 'ory_Orya', 'or': 'ory_Orya',
  'urdu': 'urd_Arab', 'ur': 'urd_Arab',
  'assamese': 'asm_Beng', 'as': 'asm_Beng',
  'nepali': 'npi_Deva', 'ne': 'npi_Deva',
  'sinhala': 'sin_Sinh', 'si': 'sin_Sinh',
  'konkani': 'gom_Deva', 'kok': 'gom_Deva',
  'maithili': 'mai_Deva', 'mai': 'mai_Deva',
  'santali': 'sat_Olck', 'sat': 'sat_Olck',
  'kashmiri': 'kas_Arab', 'ks': 'kas_Arab',
  'sindhi': 'snd_Arab', 'sd': 'snd_Arab',
  'dogri': 'doi_Deva', 'doi': 'doi_Deva',
  
  // Major World Languages
  'english': 'eng_Latn', 'en': 'eng_Latn',
  'chinese': 'zho_Hans', 'zh': 'zho_Hans',
  'spanish': 'spa_Latn', 'es': 'spa_Latn',
  'french': 'fra_Latn', 'fr': 'fra_Latn',
  'arabic': 'arb_Arab', 'ar': 'arb_Arab',
  'portuguese': 'por_Latn', 'pt': 'por_Latn',
  'russian': 'rus_Cyrl', 'ru': 'rus_Cyrl',
  'japanese': 'jpn_Jpan', 'ja': 'jpn_Jpan',
  'german': 'deu_Latn', 'de': 'deu_Latn',
  'korean': 'kor_Hang', 'ko': 'kor_Hang',
  'italian': 'ita_Latn', 'it': 'ita_Latn',
  'dutch': 'nld_Latn', 'nl': 'nld_Latn',
  'polish': 'pol_Latn', 'pl': 'pol_Latn',
  'turkish': 'tur_Latn', 'tr': 'tur_Latn',
  'vietnamese': 'vie_Latn', 'vi': 'vie_Latn',
  'thai': 'tha_Thai', 'th': 'tha_Thai',
  'indonesian': 'ind_Latn', 'id': 'ind_Latn',
  'malay': 'zsm_Latn', 'ms': 'zsm_Latn',
  'persian': 'pes_Arab', 'fa': 'pes_Arab',
  'hebrew': 'heb_Hebr', 'he': 'heb_Hebr',
  'greek': 'ell_Grek', 'el': 'ell_Grek',
  'ukrainian': 'ukr_Cyrl', 'uk': 'ukr_Cyrl',
  
  // Southeast Asian
  'tagalog': 'tgl_Latn', 'tl': 'tgl_Latn',
  'burmese': 'mya_Mymr', 'my': 'mya_Mymr',
  'khmer': 'khm_Khmr', 'km': 'khm_Khmr',
  'lao': 'lao_Laoo', 'lo': 'lao_Laoo',
  
  // African
  'swahili': 'swh_Latn', 'sw': 'swh_Latn',
  'amharic': 'amh_Ethi', 'am': 'amh_Ethi',
};

// Latin script languages
const LATIN_SCRIPT_LANGUAGES = new Set([
  'english', 'en', 'spanish', 'es', 'french', 'fr', 'german', 'de',
  'italian', 'it', 'portuguese', 'pt', 'dutch', 'nl', 'polish', 'pl',
  'turkish', 'tr', 'vietnamese', 'vi', 'indonesian', 'id', 'malay', 'ms',
  'tagalog', 'tl', 'swahili', 'sw', 'javanese', 'jv', 'cebuano', 'ceb',
  'romanian', 'ro', 'czech', 'cs', 'hungarian', 'hu', 'swedish', 'sv',
  'danish', 'da', 'finnish', 'fi', 'norwegian', 'no', 'croatian', 'hr',
  'slovak', 'sk', 'slovenian', 'sl', 'latvian', 'lv', 'lithuanian', 'lt',
  'estonian', 'et', 'bosnian', 'bs', 'albanian', 'sq', 'icelandic', 'is',
  'irish', 'ga', 'welsh', 'cy', 'basque', 'eu', 'catalan', 'ca',
]);

// ============================================================
// SCRIPT DETECTION (Unicode Ranges)
// ============================================================

const scriptPatterns: Array<{ regex: RegExp; script: string; languages: string[] }> = [
  { regex: /[\u0900-\u097F]/, script: 'Devanagari', languages: ['hindi', 'marathi', 'nepali', 'sanskrit'] },
  { regex: /[\u0980-\u09FF]/, script: 'Bengali', languages: ['bengali', 'assamese'] },
  { regex: /[\u0B80-\u0BFF]/, script: 'Tamil', languages: ['tamil'] },
  { regex: /[\u0C00-\u0C7F]/, script: 'Telugu', languages: ['telugu'] },
  { regex: /[\u0C80-\u0CFF]/, script: 'Kannada', languages: ['kannada'] },
  { regex: /[\u0D00-\u0D7F]/, script: 'Malayalam', languages: ['malayalam'] },
  { regex: /[\u0A80-\u0AFF]/, script: 'Gujarati', languages: ['gujarati'] },
  { regex: /[\u0A00-\u0A7F]/, script: 'Gurmukhi', languages: ['punjabi'] },
  { regex: /[\u0B00-\u0B7F]/, script: 'Odia', languages: ['odia'] },
  { regex: /[\u0600-\u06FF]/, script: 'Arabic', languages: ['arabic', 'urdu', 'persian'] },
  { regex: /[\u0400-\u04FF]/, script: 'Cyrillic', languages: ['russian', 'ukrainian', 'bulgarian'] },
  { regex: /[\u4E00-\u9FFF]/, script: 'Han', languages: ['chinese'] },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, script: 'Japanese', languages: ['japanese'] },
  { regex: /[\uAC00-\uD7AF]/, script: 'Hangul', languages: ['korean'] },
  { regex: /[\u0E00-\u0E7F]/, script: 'Thai', languages: ['thai'] },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function getNLLBCode(language: string): string {
  return NLLB_CODES[language.toLowerCase()] || 'eng_Latn';
}

function isLatinScriptLanguage(language: string): boolean {
  return LATIN_SCRIPT_LANGUAGES.has(language.toLowerCase());
}

function isLatinText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  if (!cleaned) return true;
  const latinChars = cleaned.match(/[a-zA-Z]/g);
  return latinChars !== null && (latinChars.length / cleaned.length) > 0.7;
}

function normalizeUnicode(text: string): string {
  try {
    return text.normalize('NFC');
  } catch {
    return text;
  }
}

function normalizeLatinInput(text: string): string {
  // Normalize case and handle common romanization patterns
  return text
    .toLowerCase()
    // Handle doubled vowels (aa → ā, etc.)
    .replace(/aa/g, 'ā')
    .replace(/ee/g, 'ī')
    .replace(/oo/g, 'ū')
    .replace(/ii/g, 'ī')
    // Handle common consonant combinations
    .replace(/sh/g, 'ś')
    .replace(/ch/g, 'c')
    .replace(/th/g, 'ṭ')
    .replace(/dh/g, 'ḍ')
    .replace(/ph/g, 'f')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/bh/g, 'b')
    .replace(/jh/g, 'j');
}

function detectLanguageFromText(text: string): { language: string; script: string; isLatin: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { language: 'english', script: 'Latin', isLatin: true };

  for (const pattern of scriptPatterns) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.languages[0], script: pattern.script, isLatin: false };
    }
  }

  return { language: 'english', script: 'Latin', isLatin: true };
}

function isSameLanguage(lang1: string, lang2: string): boolean {
  const n1 = lang1.toLowerCase().trim();
  const n2 = lang2.toLowerCase().trim();
  if (n1 === n2) return true;
  
  const code1 = getNLLBCode(n1);
  const code2 = getNLLBCode(n2);
  return code1 === code2;
}

// ============================================================
// MODEL INITIALIZATION
// ============================================================

async function initModel(): Promise<boolean> {
  if (translationPipeline) return true;
  if (isLoading) {
    while (isLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return translationPipeline !== null;
  }

  isLoading = true;
  
  try {
    console.log('[Worker] Loading NLLB-200 model...');
    translationPipeline = await pipeline('translation', MODEL_ID, {
      progress_callback: (data: any) => {
        if (data?.progress) {
          loadProgress = data.progress;
          self.postMessage({
            type: 'progress',
            progress: data.progress,
          });
        }
      },
    });
    console.log('[Worker] Model loaded successfully');
    return true;
  } catch (err) {
    console.error('[Worker] Failed to load model:', err);
    return false;
  } finally {
    isLoading = false;
  }
}

// ============================================================
// CORE TRANSLATION FUNCTIONS
// ============================================================

async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean; cached: boolean }> {
  const originalText = normalizeUnicode(text.trim());
  
  if (!originalText) {
    return { text, success: false, cached: false };
  }

  // Same language - no translation
  if (isSameLanguage(sourceLanguage, targetLanguage)) {
    return { text: originalText, success: true, cached: false };
  }

  // Check cache
  const cacheKey = `${sourceLanguage}|${targetLanguage}|${originalText}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return { text: cached, success: true, cached: true };
  }

  // Get NLLB codes
  const srcCode = getNLLBCode(sourceLanguage);
  const tgtCode = getNLLBCode(targetLanguage);

  if (srcCode === tgtCode) {
    return { text: originalText, success: true, cached: false };
  }

  try {
    const ready = await initModel();
    if (!ready || !translationPipeline) {
      return { text: originalText, success: false, cached: false };
    }

    const result = await translationPipeline(originalText, {
      src_lang: srcCode,
      tgt_lang: tgtCode,
    });

    const translatedText = normalizeUnicode(
      Array.isArray(result)
        ? result[0]?.translation_text || originalText
        : result?.translation_text || originalText
    );

    // Cache result
    if (translationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translatedText);

    return { text: translatedText, success: true, cached: false };
  } catch (err) {
    console.error('[Worker] Translation error:', err);
    return { text: originalText, success: false, cached: false };
  }
}

async function transliterateToNative(
  latinText: string,
  targetLanguage: string
): Promise<{ text: string; success: boolean }> {
  const normalized = normalizeLatinInput(latinText.trim());
  
  if (!normalized) {
    return { text: latinText, success: false };
  }

  // Target uses Latin script - no conversion needed
  if (isLatinScriptLanguage(targetLanguage)) {
    return { text: latinText, success: false };
  }

  // Already in native script
  if (!isLatinText(normalized)) {
    return { text: normalizeUnicode(latinText), success: false };
  }

  try {
    // Use translation from English to convert to native script
    const result = await translateText(normalized, 'english', targetLanguage);
    
    // Verify result is in native script
    const detected = detectLanguageFromText(result.text);
    if (!detected.isLatin && result.text !== normalized) {
      return { text: normalizeUnicode(result.text), success: true };
    }
    
    return { text: latinText, success: false };
  } catch {
    return { text: latinText, success: false };
  }
}

async function processSenderMessage(
  text: string,
  senderLanguage: string
): Promise<{ senderView: string; wasTransliterated: boolean }> {
  const originalText = normalizeUnicode(text.trim());
  
  if (!originalText) {
    return { senderView: text, wasTransliterated: false };
  }

  // If sender's language uses Latin script, no conversion
  if (isLatinScriptLanguage(senderLanguage)) {
    return { senderView: originalText, wasTransliterated: false };
  }

  // If text is already in native script, no conversion
  if (!isLatinText(originalText)) {
    return { senderView: originalText, wasTransliterated: false };
  }

  // Convert Latin to sender's native script
  const result = await transliterateToNative(originalText, senderLanguage);
  return {
    senderView: result.text,
    wasTransliterated: result.success,
  };
}

async function processReceiverMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{ receiverView: string; wasTranslated: boolean }> {
  const originalText = normalizeUnicode(text.trim());
  
  if (!originalText) {
    return { receiverView: text, wasTranslated: false };
  }

  // Same language - no translation needed
  if (isSameLanguage(senderLanguage, receiverLanguage)) {
    // But if receiver's language is non-Latin and text is Latin, convert
    if (!isLatinScriptLanguage(receiverLanguage) && isLatinText(originalText)) {
      const result = await transliterateToNative(originalText, receiverLanguage);
      return { receiverView: result.text, wasTranslated: false };
    }
    return { receiverView: originalText, wasTranslated: false };
  }

  // Detect actual source language from text
  const detected = detectLanguageFromText(originalText);
  const effectiveSource = detected.isLatin ? 'english' : detected.language || senderLanguage;

  // Translate to receiver's language
  const result = await translateText(originalText, effectiveSource, receiverLanguage);
  return {
    receiverView: result.text,
    wasTranslated: result.success && result.text !== originalText,
  };
}

async function processChatMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<{
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}> {
  const originalText = normalizeUnicode(text.trim());
  
  if (!originalText) {
    return {
      senderView: text,
      receiverView: text,
      originalText: text,
      wasTransliterated: false,
      wasTranslated: false,
    };
  }

  // Step 1: Process for sender (convert Latin to native script)
  const senderResult = await processSenderMessage(originalText, senderLanguage);

  // Step 2: Process for receiver (translate if different language)
  const receiverResult = await processReceiverMessage(
    senderResult.senderView,
    senderLanguage,
    receiverLanguage
  );

  return {
    senderView: senderResult.senderView,
    receiverView: receiverResult.receiverView,
    originalText,
    wasTransliterated: senderResult.wasTransliterated,
    wasTranslated: receiverResult.wasTranslated,
  };
}

// ============================================================
// MESSAGE HANDLER
// ============================================================

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;
  
  // Add to queue
  messageQueue.set(id, event.data);
  
  let response: WorkerResponse = {
    id,
    type,
    success: false,
  };

  try {
    switch (type) {
      case 'init':
        const initSuccess = await initModel();
        response = { id, type, success: initSuccess, result: { ready: initSuccess } };
        break;

      case 'translate':
        const translateResult = await translateText(
          payload.text,
          payload.sourceLanguage,
          payload.targetLanguage
        );
        response = { id, type, success: translateResult.success, result: translateResult };
        break;

      case 'transliterate':
        const translitResult = await transliterateToNative(
          payload.text,
          payload.targetLanguage
        );
        response = { id, type, success: translitResult.success, result: translitResult };
        break;

      case 'process_chat':
        const chatResult = await processChatMessage(
          payload.text,
          payload.senderLanguage,
          payload.receiverLanguage
        );
        response = { id, type, success: true, result: chatResult };
        break;

      case 'detect_language':
        const detected = detectLanguageFromText(payload.text);
        response = { id, type, success: true, result: detected };
        break;

      default:
        response = { id, type, success: false, error: `Unknown message type: ${type}` };
    }
  } catch (err) {
    response = {
      id,
      type,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  } finally {
    messageQueue.delete(id);
  }

  self.postMessage(response);
};

// Notify that worker is ready
self.postMessage({ type: 'ready', success: true });

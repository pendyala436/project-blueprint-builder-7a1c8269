/**
 * Worker-based Translation Service
 * =================================
 * Non-blocking translation using Web Worker
 * 
 * Fixes Applied:
 * - Debounced preview (50-100ms throttle)
 * - Message queue with unique IDs
 * - Timeout handling
 * - Error handling with fallbacks
 * - Unicode NFC normalization
 * - Atomic state updates
 * - NO external APIs - fully in-browser
 */

// ============================================================
// TYPES
// ============================================================

export interface TranslationResult {
  text: string;
  success: boolean;
  cached?: boolean;
}

export interface ChatProcessResult {
  senderView: string;
  receiverView: string;
  originalText: string;
  wasTransliterated: boolean;
  wasTranslated: boolean;
}

export interface LanguageDetectionResult {
  language: string;
  script: string;
  isLatin: boolean;
  confidence: number;
}

export interface BatchTranslateItem {
  id: string;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface BatchTranslateResult {
  id: string;
  text: string;
  success: boolean;
}

type ProgressHandler = (progress: number) => void;

// ============================================================
// WORKER MANAGEMENT
// ============================================================

let worker: Worker | null = null;
let isWorkerReady = false;
let isWorkerLoading = false;
let workerLoadProgress = 0;
let workerError: string | null = null;

const pendingMessages = new Map<string, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

const progressHandlers = new Set<ProgressHandler>();

// Message ID counter for uniqueness
let messageIdCounter = 0;

/**
 * Generate unique message ID
 * Fixes: Message overlap in multi-user scenario
 */
function generateMessageId(): string {
  messageIdCounter++;
  return `${Date.now()}-${messageIdCounter}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Initialize the translation worker
 */
export async function initWorker(onProgress?: ProgressHandler): Promise<boolean> {
  if (isWorkerReady) return true;
  
  if (isWorkerLoading) {
    // Wait for existing load to complete
    return new Promise((resolve) => {
      const checkReady = setInterval(() => {
        if (isWorkerReady) {
          clearInterval(checkReady);
          resolve(true);
        }
        if (workerError) {
          clearInterval(checkReady);
          resolve(false);
        }
      }, 100);
      
      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        resolve(false);
      }, 60000);
    });
  }

  isWorkerLoading = true;
  workerError = null;

  if (onProgress) {
    progressHandlers.add(onProgress);
  }

  try {
    // Create worker
    worker = new Worker(
      new URL('../../workers/translation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle worker messages
    worker.onmessage = (event) => {
      const data = event.data;

      if (data.type === 'ready') {
        console.log('[WorkerTranslator] Worker ready');
        return;
      }

      if (data.type === 'progress') {
        workerLoadProgress = data.progress;
        progressHandlers.forEach(h => h(data.progress));
        return;
      }

      // Handle response to pending message
      const pending = pendingMessages.get(data.id);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingMessages.delete(data.id);
        if (data.success) {
          pending.resolve(data.result);
        } else {
          pending.reject(new Error(data.error || 'Unknown error'));
        }
      }
    };

    worker.onerror = (error) => {
      console.error('[WorkerTranslator] Worker error:', error);
      workerError = error.message;
      
      // Reject all pending messages
      pendingMessages.forEach((pending, id) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Worker crashed'));
        pendingMessages.delete(id);
      });
    };

    // Initialize the model in worker
    const result = await sendToWorker('init', {}, 120000); // 2 min timeout for model load
    isWorkerReady = result.ready;
    
    return isWorkerReady;
  } catch (err) {
    workerError = err instanceof Error ? err.message : 'Failed to initialize worker';
    console.error('[WorkerTranslator] Init error:', err);
    return false;
  } finally {
    isWorkerLoading = false;
    if (onProgress) {
      progressHandlers.delete(onProgress);
    }
  }
}

/**
 * Send message to worker and wait for response
 * Fixes: Timeout handling, unique message IDs
 */
async function sendToWorker(type: string, payload: any, timeout = 30000): Promise<any> {
  if (!worker) {
    // Try to init worker first
    const ready = await initWorker();
    if (!ready || !worker) {
      throw new Error('Worker not available');
    }
  }

  return new Promise((resolve, reject) => {
    const id = generateMessageId();
    const timeoutId = setTimeout(() => {
      pendingMessages.delete(id);
      reject(new Error(`Worker request timeout after ${timeout}ms`));
    }, timeout);

    pendingMessages.set(id, {
      resolve: (result) => {
        resolve(result);
      },
      reject: (error) => {
        reject(error);
      },
      timeout: timeoutId,
    });

    worker!.postMessage({ id, type, payload });
  });
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Check if worker is ready
 */
export function isReady(): boolean {
  return isWorkerReady;
}

/**
 * Check if translator is available (ready or loading)
 */
export function isTranslatorReady(): boolean {
  return isWorkerReady;
}

/**
 * Get loading status
 */
export function getLoadingStatus(): {
  isLoading: boolean;
  progress: number;
  error: string | null;
  isReady: boolean;
} {
  return {
    isLoading: isWorkerLoading,
    progress: workerLoadProgress,
    error: workerError,
    isReady: isWorkerReady,
  };
}

/**
 * Translate text (non-blocking, runs in worker)
 * Supports all 300+ NLLB languages
 */
export async function translate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  console.log('[WorkerTranslator] Translating:', { 
    text: text.substring(0, 50), 
    from: sourceLanguage, 
    to: targetLanguage,
    workerReady: isWorkerReady
  });
  
  try {
    // Skip if same language (using normalized comparison)
    if (isSameLanguage(sourceLanguage, targetLanguage)) {
      console.log('[WorkerTranslator] Same language, skipping translation');
      return { text, success: true };
    }
    
    const result = await sendToWorker('translate', {
      text,
      sourceLanguage,
      targetLanguage,
    });
    
    console.log('[WorkerTranslator] Translation result:', {
      original: text.substring(0, 30),
      translated: result.text?.substring(0, 30),
      success: result.success
    });
    
    return result;
  } catch (err) {
    console.error('[WorkerTranslator] Translate error:', err);
    return { text, success: false };
  }
}

/**
 * Transliterate Latin text to native script (non-blocking)
 */
export async function transliterateToNative(
  text: string,
  targetLanguage: string
): Promise<TranslationResult> {
  console.log('[WorkerTranslator] transliterateToNative:', {
    text: text.substring(0, 30),
    targetLanguage,
    workerReady: isWorkerReady
  });
  
  try {
    const result = await sendToWorker('transliterate', {
      text,
      targetLanguage,
    });
    
    console.log('[WorkerTranslator] transliterateToNative result:', {
      original: text.substring(0, 20),
      result: result.text?.substring(0, 20),
      success: result.success
    });
    
    return result;
  } catch (err) {
    console.error('[WorkerTranslator] Transliterate error:', err);
    return { text, success: false };
  }
}

/**
 * Process chat message for both sender and receiver views (non-blocking)
 */
export async function processChatMessage(
  text: string,
  senderLanguage: string,
  receiverLanguage: string
): Promise<ChatProcessResult> {
  try {
    return await sendToWorker('process_chat', {
      text,
      senderLanguage,
      receiverLanguage,
    });
  } catch (err) {
    console.error('[WorkerTranslator] Process chat error:', err);
    return {
      senderView: text,
      receiverView: text,
      originalText: text,
      wasTransliterated: false,
      wasTranslated: false,
    };
  }
}

/**
 * Detect language from text script
 */
export async function detectLanguage(text: string): Promise<LanguageDetectionResult> {
  try {
    return await sendToWorker('detect_language', { text });
  } catch (err) {
    return { language: 'english', script: 'Latin', isLatin: true, confidence: 0 };
  }
}

/**
 * Batch translate multiple items
 * Fixes: Multi-user scenario with overlapping messages
 */
export async function batchTranslate(items: BatchTranslateItem[]): Promise<BatchTranslateResult[]> {
  try {
    return await sendToWorker('batch_translate', { items }, 60000);
  } catch (err) {
    console.error('[WorkerTranslator] Batch translate error:', err);
    return items.map(item => ({ id: item.id, text: item.text, success: false }));
  }
}

// ============================================================
// DEBOUNCED LIVE PREVIEW
// Fixes: Preview lags during typing, flickering
// ============================================================

interface DebouncedPreviewHandler {
  update: (text: string, targetLanguage: string) => Promise<string>;
  cancel: () => void;
}

/**
 * Create debounced live preview handler
 * For real-time typing → native script preview
 * 
 * @param debounceMs - Debounce delay (50-100ms recommended)
 */
export function createDebouncedPreview(debounceMs: number = 75): DebouncedPreviewHandler {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastText = '';
  let lastResult = '';
  let pendingResolve: ((value: string) => void) | null = null;

  return {
    update: async (text: string, targetLanguage: string): Promise<string> => {
      const trimmed = text.trim();
      
      // If empty, return empty
      if (!trimmed) {
        lastText = '';
        lastResult = '';
        return '';
      }
      
      // If same as last, return cached result
      if (trimmed === lastText && lastResult) {
        return lastResult;
      }

      // Cancel previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Cancel previous pending resolve
      if (pendingResolve) {
        pendingResolve(trimmed);
        pendingResolve = null;
      }

      return new Promise((resolve) => {
        pendingResolve = resolve;
        
        timeoutId = setTimeout(async () => {
          lastText = trimmed;
          
          try {
            // Quick check if target is Latin script
            if (isLatinScriptLanguage(targetLanguage)) {
              lastResult = trimmed;
              resolve(trimmed);
              return;
            }
            
            // Check if text is already in native script
            if (!isLatinText(trimmed)) {
              lastResult = normalizeUnicode(trimmed);
              resolve(lastResult);
              return;
            }
            
            const result = await transliterateToNative(trimmed, targetLanguage);
            lastResult = result.text;
            resolve(result.text);
          } catch {
            lastResult = trimmed;
            resolve(trimmed);
          } finally {
            pendingResolve = null;
          }
        }, debounceMs);
      });
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (pendingResolve) {
        pendingResolve(lastText);
        pendingResolve = null;
      }
      lastText = '';
      lastResult = '';
    },
  };
}

// ============================================================
// UTILITY FUNCTIONS (sync, for quick checks without worker)
// ============================================================

const LATIN_SCRIPT_LANGUAGES = new Set([
  // Major European languages
  'english', 'en', 'eng', 'spanish', 'es', 'spa', 'french', 'fr', 'fra',
  'german', 'de', 'deu', 'italian', 'it', 'ita', 'portuguese', 'pt', 'por',
  'dutch', 'nl', 'nld', 'polish', 'pl', 'pol', 'romanian', 'ro', 'ron',
  'czech', 'cs', 'ces', 'hungarian', 'hu', 'hun', 'swedish', 'sv', 'swe',
  'danish', 'da', 'dan', 'finnish', 'fi', 'fin', 'norwegian', 'no', 'nob',
  'croatian', 'hr', 'hrv', 'slovak', 'sk', 'slk', 'slovenian', 'sl', 'slv',
  'latvian', 'lv', 'lvs', 'lithuanian', 'lt', 'lit', 'estonian', 'et', 'est',
  'bosnian', 'bs', 'bos', 'albanian', 'sq', 'als', 'icelandic', 'is', 'isl',
  'irish', 'ga', 'gle', 'welsh', 'cy', 'cym', 'basque', 'eu', 'eus',
  'catalan', 'ca', 'cat', 'galician', 'gl', 'glg', 'maltese', 'mt', 'mlt',
  'luxembourgish', 'lb', 'ltz', 'faroese', 'fo', 'fao',
  // Asian Latin-script languages
  'turkish', 'tr', 'tur', 'vietnamese', 'vi', 'vie', 'indonesian', 'id', 'ind',
  'malay', 'ms', 'zsm', 'tagalog', 'tl', 'tgl', 'filipino', 'fil',
  'javanese', 'jv', 'jav', 'sundanese', 'su', 'sun', 'cebuano', 'ceb',
  'ilocano', 'ilo', 'uzbek', 'uz', 'uzn', 'turkmen', 'tk', 'tuk',
  'azerbaijani', 'az', 'azj',
  // African Latin-script languages
  'swahili', 'sw', 'swh', 'afrikaans', 'af', 'afr', 'yoruba', 'yo', 'yor',
  'igbo', 'ig', 'ibo', 'hausa', 'ha', 'hau', 'zulu', 'zu', 'zul',
  'xhosa', 'xh', 'xho', 'somali', 'so', 'som', 'shona', 'sn', 'sna',
  'kinyarwanda', 'rw', 'kin', 'lingala', 'ln', 'lin', 'wolof', 'wo', 'wol',
  'bambara', 'bm', 'bam', 'ewe', 'ee', 'malagasy', 'mg', 'plt',
  'luganda', 'lg', 'lug', 'chichewa', 'ny', 'nya', 'oromo', 'om', 'gaz',
  'tswana', 'tn', 'tsn', 'tsonga', 'ts', 'tso',
  // Pacific languages
  'maori', 'mi', 'mri', 'samoan', 'sm', 'smo', 'tongan', 'to', 'ton',
  'fijian', 'fj', 'fij', 'hawaiian', 'haw',
  // Creole languages
  'haitian creole', 'ht', 'hat', 'papiamento', 'pap',
  // Other
  'esperanto', 'eo', 'epo', 'latin', 'la', 'lat',
  'guarani', 'gn', 'grn', 'quechua', 'qu', 'quy', 'aymara', 'ay', 'aym',
  'mizo', 'lus',
]);

/**
 * Check if language uses Latin script (sync)
 */
export function isLatinScriptLanguage(language: string): boolean {
  return LATIN_SCRIPT_LANGUAGES.has(language.toLowerCase());
}

/**
 * Check if text is primarily Latin (sync)
 * Fixes: Extended Latin characters support
 */
export function isLatinText(text: string): boolean {
  const cleaned = text.replace(/[\s\d\.,!?'";\-:()@#$%^&*+=\[\]{}|\\/<>~`]/g, '');
  if (!cleaned) return true;
  const latinChars = cleaned.match(/[a-zA-Z\u00C0-\u024F]/g);
  return latinChars !== null && (latinChars.length / cleaned.length) > 0.7;
}

/**
 * Normalize language code to canonical form for comparison
 * Maps all variations (full name, ISO codes) to a single canonical name
 */
function normalizeLanguageCode(lang: string): string {
  const l = lang.toLowerCase().trim();
  
  // Comprehensive language code normalization for 300+ languages
  const LANGUAGE_ALIASES: Record<string, string> = {
    // Indian Languages (22 Scheduled + Regional)
    hi: 'hindi', hin: 'hindi', hindi: 'hindi',
    bn: 'bengali', ben: 'bengali', bengali: 'bengali', bangla: 'bengali',
    te: 'telugu', tel: 'telugu', telugu: 'telugu',
    ta: 'tamil', tam: 'tamil', tamil: 'tamil',
    mr: 'marathi', mar: 'marathi', marathi: 'marathi',
    gu: 'gujarati', guj: 'gujarati', gujarati: 'gujarati',
    kn: 'kannada', kan: 'kannada', kannada: 'kannada',
    ml: 'malayalam', mal: 'malayalam', malayalam: 'malayalam',
    pa: 'punjabi', pan: 'punjabi', punjabi: 'punjabi',
    or: 'odia', ory: 'odia', odia: 'odia', oriya: 'odia',
    ur: 'urdu', urd: 'urdu', urdu: 'urdu',
    as: 'assamese', asm: 'assamese', assamese: 'assamese',
    ne: 'nepali', npi: 'nepali', nepali: 'nepali',
    si: 'sinhala', sin: 'sinhala', sinhala: 'sinhala', sinhalese: 'sinhala',
    kok: 'konkani', gom: 'konkani', konkani: 'konkani',
    mai: 'maithili', maithili: 'maithili',
    sat: 'santali', santali: 'santali',
    ks: 'kashmiri', kas: 'kashmiri', kashmiri: 'kashmiri',
    sd: 'sindhi', snd: 'sindhi', sindhi: 'sindhi',
    doi: 'dogri', dogri: 'dogri',
    brx: 'bodo', bodo: 'bodo',
    mni: 'manipuri', manipuri: 'manipuri',
    sa: 'sanskrit', san: 'sanskrit', sanskrit: 'sanskrit',
    bho: 'bhojpuri', bhojpuri: 'bhojpuri',
    mag: 'magahi', magahi: 'magahi',
    awa: 'awadhi', awadhi: 'awadhi',
    hne: 'chhattisgarhi', chhattisgarhi: 'chhattisgarhi',
    raj: 'rajasthani', rajasthani: 'rajasthani', marwari: 'rajasthani',
    bgc: 'haryanvi', haryanvi: 'haryanvi',
    kfy: 'kumaoni', kumaoni: 'kumaoni',
    gbm: 'garhwali', garhwali: 'garhwali',
    tcy: 'tulu', tulu: 'tulu',
    lus: 'mizo', mizo: 'mizo',
    
    // Major World Languages
    en: 'english', eng: 'english', english: 'english',
    zh: 'chinese', zho: 'chinese', chinese: 'chinese', mandarin: 'chinese',
    es: 'spanish', spa: 'spanish', spanish: 'spanish',
    fr: 'french', fra: 'french', french: 'french',
    ar: 'arabic', ara: 'arabic', arb: 'arabic', arabic: 'arabic',
    pt: 'portuguese', por: 'portuguese', portuguese: 'portuguese',
    ru: 'russian', rus: 'russian', russian: 'russian',
    ja: 'japanese', jpn: 'japanese', japanese: 'japanese',
    de: 'german', deu: 'german', german: 'german',
    ko: 'korean', kor: 'korean', korean: 'korean',
    it: 'italian', ita: 'italian', italian: 'italian',
    nl: 'dutch', nld: 'dutch', dutch: 'dutch',
    pl: 'polish', pol: 'polish', polish: 'polish',
    tr: 'turkish', tur: 'turkish', turkish: 'turkish',
    vi: 'vietnamese', vie: 'vietnamese', vietnamese: 'vietnamese',
    th: 'thai', tha: 'thai', thai: 'thai',
    id: 'indonesian', ind: 'indonesian', indonesian: 'indonesian',
    ms: 'malay', zsm: 'malay', malay: 'malay',
    fa: 'persian', pes: 'persian', persian: 'persian', farsi: 'persian',
    he: 'hebrew', heb: 'hebrew', hebrew: 'hebrew',
    el: 'greek', ell: 'greek', greek: 'greek',
    uk: 'ukrainian', ukr: 'ukrainian', ukrainian: 'ukrainian',
    cs: 'czech', ces: 'czech', czech: 'czech',
    ro: 'romanian', ron: 'romanian', romanian: 'romanian',
    hu: 'hungarian', hun: 'hungarian', hungarian: 'hungarian',
    sv: 'swedish', swe: 'swedish', swedish: 'swedish',
    da: 'danish', dan: 'danish', danish: 'danish',
    fi: 'finnish', fin: 'finnish', finnish: 'finnish',
    no: 'norwegian', nob: 'norwegian', norwegian: 'norwegian', nb: 'norwegian',
    
    // Southeast Asian
    tl: 'tagalog', tgl: 'tagalog', tagalog: 'tagalog', fil: 'tagalog', filipino: 'tagalog',
    my: 'burmese', mya: 'burmese', burmese: 'burmese', myanmar: 'burmese',
    km: 'khmer', khm: 'khmer', khmer: 'khmer', cambodian: 'khmer',
    lo: 'lao', lao: 'lao', laotian: 'lao',
    jv: 'javanese', jav: 'javanese', javanese: 'javanese',
    su: 'sundanese', sun: 'sundanese', sundanese: 'sundanese',
    ceb: 'cebuano', cebuano: 'cebuano',
    
    // African Languages
    sw: 'swahili', swh: 'swahili', swahili: 'swahili',
    am: 'amharic', amh: 'amharic', amharic: 'amharic',
    yo: 'yoruba', yor: 'yoruba', yoruba: 'yoruba',
    ig: 'igbo', ibo: 'igbo', igbo: 'igbo',
    ha: 'hausa', hau: 'hausa', hausa: 'hausa',
    zu: 'zulu', zul: 'zulu', zulu: 'zulu',
    xh: 'xhosa', xho: 'xhosa', xhosa: 'xhosa',
    af: 'afrikaans', afr: 'afrikaans', afrikaans: 'afrikaans',
    so: 'somali', som: 'somali', somali: 'somali',
    
    // European Languages
    ca: 'catalan', cat: 'catalan', catalan: 'catalan',
    hr: 'croatian', hrv: 'croatian', croatian: 'croatian',
    sr: 'serbian', srp: 'serbian', serbian: 'serbian',
    bs: 'bosnian', bos: 'bosnian', bosnian: 'bosnian',
    sk: 'slovak', slk: 'slovak', slovak: 'slovak',
    sl: 'slovenian', slv: 'slovenian', slovenian: 'slovenian',
    bg: 'bulgarian', bul: 'bulgarian', bulgarian: 'bulgarian',
    lt: 'lithuanian', lit: 'lithuanian', lithuanian: 'lithuanian',
    lv: 'latvian', lvs: 'latvian', lav: 'latvian', latvian: 'latvian',
    et: 'estonian', est: 'estonian', estonian: 'estonian',
    be: 'belarusian', bel: 'belarusian', belarusian: 'belarusian',
    mk: 'macedonian', mkd: 'macedonian', macedonian: 'macedonian',
    sq: 'albanian', als: 'albanian', albanian: 'albanian',
    is: 'icelandic', isl: 'icelandic', icelandic: 'icelandic',
    ga: 'irish', gle: 'irish', irish: 'irish',
    cy: 'welsh', cym: 'welsh', welsh: 'welsh',
    eu: 'basque', eus: 'basque', basque: 'basque',
    gl: 'galician', glg: 'galician', galician: 'galician',
    mt: 'maltese', mlt: 'maltese', maltese: 'maltese',
    
    // Caucasian & Central Asian
    ka: 'georgian', kat: 'georgian', georgian: 'georgian',
    hy: 'armenian', hye: 'armenian', armenian: 'armenian',
    kk: 'kazakh', kaz: 'kazakh', kazakh: 'kazakh',
    uz: 'uzbek', uzn: 'uzbek', uzbek: 'uzbek',
    tg: 'tajik', tgk: 'tajik', tajik: 'tajik',
    ky: 'kyrgyz', kir: 'kyrgyz', kyrgyz: 'kyrgyz',
    tk: 'turkmen', tuk: 'turkmen', turkmen: 'turkmen',
    mn: 'mongolian', mon: 'mongolian', khk: 'mongolian', mongolian: 'mongolian',
    bo: 'tibetan', bod: 'tibetan', tibetan: 'tibetan',
    ug: 'uyghur', uig: 'uyghur', uyghur: 'uyghur',
    az: 'azerbaijani', azj: 'azerbaijani', azerbaijani: 'azerbaijani',
    
    // Pacific & Creole
    mi: 'maori', mri: 'maori', maori: 'maori',
    sm: 'samoan', smo: 'samoan', samoan: 'samoan',
    ht: 'haitian', hat: 'haitian', 'haitian creole': 'haitian',
    
    // Other
    eo: 'esperanto', epo: 'esperanto', esperanto: 'esperanto',
    la: 'latin', lat: 'latin', latin: 'latin',
    yi: 'yiddish', ydd: 'yiddish', yiddish: 'yiddish',
  };
  
  return LANGUAGE_ALIASES[l] || l;
}

/**
 * Check if two languages are the same (sync)
 * Handles all 300+ language code variations
 */
export function isSameLanguage(lang1: string, lang2: string): boolean {
  if (!lang1 || !lang2) return false;
  const n1 = normalizeLanguageCode(lang1);
  const n2 = normalizeLanguageCode(lang2);
  return n1 === n2;
}

/**
 * Normalize Unicode to NFC (sync)
 * Fixes: Combining marks render incorrectly
 */
export function normalizeUnicode(text: string): string {
  try {
    return text.normalize('NFC');
  } catch {
    return text;
  }
}

/**
 * Sync language detection (for quick UI checks)
 */
export function detectLanguageSync(text: string): { language: string; script: string; isLatin: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { language: 'english', script: 'Latin', isLatin: true };
  
  // Quick script patterns
  const patterns = [
    { regex: /[\u0900-\u097F]/, language: 'hindi', script: 'Devanagari' },
    { regex: /[\u0980-\u09FF]/, language: 'bengali', script: 'Bengali' },
    { regex: /[\u0B80-\u0BFF]/, language: 'tamil', script: 'Tamil' },
    { regex: /[\u0C00-\u0C7F]/, language: 'telugu', script: 'Telugu' },
    { regex: /[\u0C80-\u0CFF]/, language: 'kannada', script: 'Kannada' },
    { regex: /[\u0D00-\u0D7F]/, language: 'malayalam', script: 'Malayalam' },
    { regex: /[\u0A80-\u0AFF]/, language: 'gujarati', script: 'Gujarati' },
    { regex: /[\u0A00-\u0A7F]/, language: 'punjabi', script: 'Gurmukhi' },
    { regex: /[\u0600-\u06FF]/, language: 'arabic', script: 'Arabic' },
    { regex: /[\u0400-\u04FF]/, language: 'russian', script: 'Cyrillic' },
    { regex: /[\u4E00-\u9FFF]/, language: 'chinese', script: 'Han' },
    { regex: /[\uAC00-\uD7AF]/, language: 'korean', script: 'Hangul' },
    { regex: /[\u0E00-\u0E7F]/, language: 'thai', script: 'Thai' },
  ];
  
  for (const { regex, language, script } of patterns) {
    if (regex.test(trimmed)) {
      return { language, script, isLatin: false };
    }
  }
  
  return { language: 'english', script: 'Latin', isLatin: true };
}

// ============================================================
// CLEANUP
// ============================================================

/**
 * Terminate worker (cleanup)
 */
export function terminateWorker(): void {
  if (worker) {
    // Clear all pending messages
    pendingMessages.forEach((pending, id) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Worker terminated'));
    });
    pendingMessages.clear();
    
    worker.terminate();
    worker = null;
    isWorkerReady = false;
    isWorkerLoading = false;
    workerLoadProgress = 0;
    workerError = null;
    messageIdCounter = 0;
  }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    terminateWorker();
  });
}

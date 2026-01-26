/**
 * Translation Web Worker
 * ======================
 * Full Xenova ML translation running in Worker thread
 * Keeps UI thread completely unblocked during translation
 * 
 * NOTE: Web Workers have limited access to DOM and some browser APIs
 * The @huggingface/transformers library may not work fully in workers
 * If models fail to load, the worker-client will fallback to main thread
 */

// Dynamic imports to handle potential module resolution issues in workers
let translateText: any = null;
let translateForChat: any = null;
let getEnglishMeaning: any = null;
let detectLanguage: any = null;
let normalizeLanguageCode: any = null;

let initialized = false;
let initError: Error | null = null;

interface WorkerMessage {
  id: string;
  type: 'translate' | 'translate_chat' | 'to_english' | 'detect' | 'init';
  payload: {
    text: string;
    source?: string;
    target?: string;
    senderLang?: string;
    receiverLang?: string;
  };
}

async function initialize() {
  if (initialized) return;
  if (initError) throw initError;
  
  try {
    console.log('[TranslationWorker] Initializing...');
    
    // Dynamic imports
    const engine = await import('../lib/xenova-translate-sdk/engine');
    const languages = await import('../lib/xenova-translate-sdk/languages');
    const { configureThreads } = await import('../lib/xenova-translate-sdk/modelLoader');
    
    translateText = engine.translateText;
    translateForChat = engine.translateForChat;
    getEnglishMeaning = engine.getEnglishMeaning;
    detectLanguage = engine.detectLanguage;
    normalizeLanguageCode = languages.normalizeLanguageCode;
    
    // Configure for worker environment - limit threads
    configureThreads(true); // Mobile-safe mode in worker
    
    initialized = true;
    console.log('[TranslationWorker] Initialized successfully');
  } catch (error) {
    console.error('[TranslationWorker] Initialization failed:', error);
    initError = error instanceof Error ? error : new Error('Init failed');
    throw initError;
  }
}

// Handle incoming messages
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    // Initialize on first message
    await initialize();
    
    switch (type) {
      case 'init': {
        self.postMessage({
          id,
          type,
          success: true,
          result: { initialized: true },
        });
        break;
      }

      case 'translate': {
        const { text, source, target } = payload;
        if (!text || !source || !target) {
          throw new Error('Missing required parameters');
        }
        console.log('[TranslationWorker] Translating:', text.substring(0, 20), source, '→', target);
        const result = await translateText(
          text,
          normalizeLanguageCode(source),
          normalizeLanguageCode(target)
        );
        console.log('[TranslationWorker] Result:', result?.text?.substring(0, 20));
        self.postMessage({
          id,
          type,
          success: true,
          result,
        });
        break;
      }

      case 'translate_chat': {
        const { text, senderLang, receiverLang } = payload;
        if (!text || !senderLang || !receiverLang) {
          throw new Error('Missing required parameters');
        }
        console.log('[TranslationWorker] Chat translating:', senderLang, '→', receiverLang);
        const result = await translateForChat(
          text,
          normalizeLanguageCode(senderLang),
          normalizeLanguageCode(receiverLang)
        );
        console.log('[TranslationWorker] Chat result:', result?.receiverView?.substring(0, 20));
        self.postMessage({
          id,
          type,
          success: true,
          result,
        });
        break;
      }

      case 'to_english': {
        const { text, source } = payload;
        if (!text || !source) {
          throw new Error('Missing required parameters');
        }
        console.log('[TranslationWorker] To English:', text.substring(0, 20), 'from', source);
        const result = await getEnglishMeaning(
          text,
          normalizeLanguageCode(source)
        );
        console.log('[TranslationWorker] English result:', result?.substring(0, 20));
        self.postMessage({
          id,
          type,
          success: true,
          result,
        });
        break;
      }

      case 'detect': {
        const { text } = payload;
        if (!text) {
          throw new Error('Missing text parameter');
        }
        console.log('[TranslationWorker] Detecting language:', text.substring(0, 20));
        const result = await detectLanguage(text);
        console.log('[TranslationWorker] Detected:', result?.language);
        self.postMessage({
          id,
          type,
          success: true,
          result,
        });
        break;
      }

      default:
        self.postMessage({
          id,
          type,
          success: false,
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    console.error('[TranslationWorker] Error:', error);
    self.postMessage({
      id,
      type,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

console.log('[TranslationWorker] Worker script loaded');

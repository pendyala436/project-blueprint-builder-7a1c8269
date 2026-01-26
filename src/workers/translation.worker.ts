/**
 * Translation Web Worker
 * ======================
 * Full Xenova ML translation running in Worker thread
 * Keeps UI thread completely unblocked during translation
 */

import { 
  translateText, 
  translateForChat,
  getEnglishMeaning,
  detectLanguage,
} from '../lib/xenova-translate-sdk/engine';
import { configureThreads } from '../lib/xenova-translate-sdk/modelLoader';
import { normalizeLanguageCode } from '../lib/xenova-translate-sdk/languages';

// Configure for worker environment - limit threads
configureThreads(true); // Mobile-safe mode in worker

interface WorkerMessage {
  id: string;
  type: 'translate' | 'translate_chat' | 'to_english' | 'detect';
  payload: {
    text: string;
    source?: string;
    target?: string;
    senderLang?: string;
    receiverLang?: string;
  };
}

interface WorkerResponse {
  id: string;
  type: string;
  success: boolean;
  result?: any;
  error?: string;
}

// Handle incoming messages
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'translate': {
        const { text, source, target } = payload;
        if (!text || !source || !target) {
          throw new Error('Missing required parameters');
        }
        const result = await translateText(
          text,
          normalizeLanguageCode(source),
          normalizeLanguageCode(target)
        );
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
        const result = await translateForChat(
          text,
          normalizeLanguageCode(senderLang),
          normalizeLanguageCode(receiverLang)
        );
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
        const result = await getEnglishMeaning(
          text,
          normalizeLanguageCode(source)
        );
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
        const result = await detectLanguage(text);
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

console.log('[TranslationWorker] Initialized with Xenova ML models');

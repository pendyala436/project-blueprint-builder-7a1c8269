/**
 * Translation Web Worker
 * ======================
 * Stub implementation - translation is handled by embedded translator
 * This worker is kept for API compatibility
 */

// Worker message types
interface WorkerMessage {
  id: string;
  type: 'init' | 'translate' | 'transliterate' | 'process_chat' | 'detect_language' | 'batch_translate' | 'live_preview';
  payload: any;
}

interface WorkerResponse {
  id: string;
  type: string;
  success: boolean;
  result?: any;
  error?: string;
}

// Send response back to main thread
function sendResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

// Handle incoming messages
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'init':
        // Always ready - no model to load
        sendResponse({
          id,
          type: 'init',
          success: true,
          result: { ready: true, progress: 100 }
        });
        break;

      case 'translate':
      case 'transliterate':
      case 'process_chat':
      case 'batch_translate':
      case 'live_preview':
        // Return original text - actual translation happens in main thread
        sendResponse({
          id,
          type,
          success: true,
          result: {
            text: payload?.text || '',
            originalText: payload?.text || '',
            isTranslated: false,
            isTransliterated: false,
            message: 'Translation handled by embedded translator'
          }
        });
        break;

      case 'detect_language':
        // Basic detection - return English as default
        sendResponse({
          id,
          type: 'detect_language',
          success: true,
          result: {
            language: 'english',
            script: 'Latin',
            isLatin: true,
            confidence: 0.5
          }
        });
        break;

      default:
        sendResponse({
          id,
          type,
          success: false,
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    sendResponse({
      id,
      type,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Export empty to make this a module
export {};

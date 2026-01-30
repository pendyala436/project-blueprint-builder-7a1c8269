/**
 * Message Pipeline - THE HEART
 * =============================
 * 
 * Processes all chat messages through meaning-based translation:
 * 
 * FLOW:
 * 1. Sender types ANYTHING (native, roman, mixed, voice, Gboard)
 * 2. Normalize input
 * 3. Pivot to English (extract MEANING)
 * 4. Translate to sender's mother tongue (senderView)
 * 5. Translate to receiver's mother tongue (receiverView)
 * 
 * RESULT:
 * - Sender sees: Mother Tongue + English (small)
 * - Receiver sees: Their Mother Tongue + English (small)
 * - Bidirectional - works both ways automatically
 */

import { normalizeText, isSameLanguage, isEnglish } from './normalize';
import { translateBidirectional } from './translateEngine';

export interface MessageViews {
  sender: {
    main: string;      // Sender's mother tongue
    english: string;   // English meaning
  };
  receiver: {
    main: string;      // Receiver's mother tongue
    english: string;   // English meaning
  };
  metadata: {
    originalText: string;
    wasTransliterated: boolean;
    wasTranslated: boolean;
    senderLanguage: string;
    receiverLanguage: string;
  };
}

/**
 * Process a chat message through the full translation pipeline
 * 
 * @param rawText - What the user typed (any input method)
 * @param senderMT - Sender's mother tongue (from profile)
 * @param receiverMT - Receiver's mother tongue (from profile)
 * @returns MessageViews with both sender and receiver displays
 */
export async function processChatMessage(
  rawText: string,
  senderMT: string,
  receiverMT: string
): Promise<MessageViews> {
  // 1. Normalize input
  const normalized = await normalizeText(rawText, senderMT);
  
  if (!normalized) {
    return {
      sender: { main: '', english: '' },
      receiver: { main: '', english: '' },
      metadata: {
        originalText: rawText,
        wasTransliterated: false,
        wasTranslated: false,
        senderLanguage: senderMT,
        receiverLanguage: receiverMT
      }
    };
  }
  
  // 2. Same language optimization
  if (isSameLanguage(senderMT, receiverMT)) {
    // If both speak the same language, just normalize
    const english = isEnglish(senderMT) ? normalized : normalized;
    
    return {
      sender: { main: normalized, english },
      receiver: { main: normalized, english },
      metadata: {
        originalText: rawText,
        wasTransliterated: false,
        wasTranslated: false,
        senderLanguage: senderMT,
        receiverLanguage: receiverMT
      }
    };
  }
  
  // 3. Full bidirectional translation via edge function
  const result = await translateBidirectional(normalized, senderMT, receiverMT);
  
  return {
    sender: {
      main: result.senderView,
      english: result.englishCore
    },
    receiver: {
      main: result.receiverView,
      english: result.englishCore
    },
    metadata: {
      originalText: rawText,
      wasTransliterated: result.wasTransliterated,
      wasTranslated: result.wasTranslated,
      senderLanguage: senderMT,
      receiverLanguage: receiverMT
    }
  };
}

/**
 * Get a quick preview while typing
 * Returns the sender's native view (what they'll see after send)
 */
export async function getTypingPreview(
  rawText: string,
  senderMT: string,
  receiverMT: string
): Promise<{ preview: string; english: string }> {
  if (!rawText.trim()) {
    return { preview: '', english: '' };
  }
  
  const result = await processChatMessage(rawText, senderMT, receiverMT);
  
  return {
    preview: result.sender.main,
    english: result.sender.english
  };
}

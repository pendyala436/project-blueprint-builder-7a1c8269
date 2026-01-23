/**
 * Content Moderation Utility
 * 
 * Strictly blocks sharing of contact information including:
 * - Phone numbers
 * - Email addresses
 * - Social media accounts (WhatsApp, Instagram, Facebook, Telegram, etc.)
 */

// Number words for detection (supports multiple languages)
const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred',
  // Hindi number words
  'ek', 'do', 'teen', 'char', 'paanch', 'panch', 'chhe', 'saat', 'aath', 'nau', 'das',
  // Common variations
  'nol', 'nil', 'first', 'second', 'third'
];

// Build regex pattern for 4+ consecutive number words
const numberWordsPattern = new RegExp(
  `\\b(${NUMBER_WORDS.join('|')})(\\s*[-,./]?\\s*(${NUMBER_WORDS.join('|')})){3,}\\b`,
  'gi'
);

// Patterns for detecting prohibited content
const PHONE_PATTERNS = [
  // International formats
  /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  // Simple number sequences (7+ digits)
  /\b\d{7,15}\b/g,
  // Spaced out numbers to evade detection
  /\b\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d+/g,
  // Written numbers - more than 3 consecutive number words
  numberWordsPattern,
];

const EMAIL_PATTERNS = [
  // Standard email
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  // Obfuscated email
  /[a-zA-Z0-9._%+-]+\s*[@\[\(]\s*[a-zA-Z0-9.-]+\s*[.\[\(]\s*[a-zA-Z]{2,}/gi,
  // "at" written out
  /[a-zA-Z0-9._%+-]+\s*(at|@|AT)\s*[a-zA-Z0-9.-]+\s*(dot|\.)\s*[a-zA-Z]{2,}/gi,
];

const SOCIAL_MEDIA_PATTERNS = [
  // Platform names with handles
  /\b(whatsapp|whats\s*app|wa|watsapp|wapp)\s*[:\-#@]?\s*[\w.+-]+/gi,
  /\b(instagram|insta|ig)\s*[:\-#@]?\s*[\w.+-]+/gi,
  /\b(facebook|fb)\s*[:\-#@]?\s*[\w.+-]+/gi,
  /\b(telegram|tg|telgram)\s*[:\-#@]?\s*[\w.+-]+/gi,
  /\b(snapchat|snap)\s*[:\-#@]?\s*[\w.+-]+/gi,
  /\b(twitter|x\.com|@)\s*[:\-#@]?\s*[\w.+-]+/gi,
  /\b(tiktok|tik\s*tok)\s*[:\-#@]?\s*[\w.+-]+/gi,
  /\b(wechat|we\s*chat)\s*[:\-#@]?\s*[\w.+-]+/gi,
  /\b(line|viber|signal|discord)\s*[:\-#@]?\s*[\w.+-]+/gi,
  /\b(skype)\s*[:\-#@]?\s*[\w.+-]+/gi,
  
  // Just platform mentions (to catch "add me on whatsapp")
  /\b(add|contact|reach|text|message|call|dm|msg)\s*(me|us)?\s*(on|at|via)?\s*(whatsapp|whats\s*app|instagram|insta|facebook|fb|telegram|tg|snapchat|snap|twitter|tiktok|wechat|line|viber|signal|discord|skype)/gi,
  
  // URLs
  /\b(wa\.me|t\.me|m\.me|bit\.ly|tinyurl|goo\.gl)\s*\/?\s*\S*/gi,
  /https?:\/\/[^\s]+/gi,
  
  // ID sharing patterns
  /\b(my|add|contact)\s*(id|username|handle|number|num|no)\s*(is|:)?\s*[\w.@+-]+/gi,
];

// Keywords that indicate contact sharing intent
const CONTACT_INTENT_PATTERNS = [
  /\b(contact|reach|text|message|call)\s*(me|us)\s*(outside|privately|directly|on|at|via)/gi,
  /\b(give|send|share)\s*(me|you|your|my)\s*(number|phone|mobile|cell|email|id|contact)/gi,
  /\b(here'?s?|this is)\s*(my|the)\s*(number|phone|mobile|email|id|contact|whatsapp|instagram)/gi,
  /\b(dm|private message|pm)\s*(me|you)/gi,
];

export interface ModerationResult {
  isBlocked: boolean;
  reason?: string;
  detectedType?: 'phone' | 'email' | 'social_media' | 'contact_intent';
  sanitizedMessage?: string;
}

/**
 * Check if message contains prohibited content
 */
export function moderateMessage(message: string): ModerationResult {
  if (!message || typeof message !== 'string') {
    return { isBlocked: false };
  }

  const normalizedMessage = message.toLowerCase().replace(/\s+/g, ' ');

  // Check for phone numbers
  for (const pattern of PHONE_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    if (pattern.test(message) || pattern.test(normalizedMessage)) {
      return {
        isBlocked: true,
        reason: 'Sharing phone numbers is not allowed for your safety.',
        detectedType: 'phone',
      };
    }
  }

  // Check for emails
  for (const pattern of EMAIL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(message) || pattern.test(normalizedMessage)) {
      return {
        isBlocked: true,
        reason: 'Sharing email addresses is not allowed for your safety.',
        detectedType: 'email',
      };
    }
  }

  // Check for social media
  for (const pattern of SOCIAL_MEDIA_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(message) || pattern.test(normalizedMessage)) {
      return {
        isBlocked: true,
        reason: 'Sharing social media accounts is not allowed for your safety.',
        detectedType: 'social_media',
      };
    }
  }

  // Check for contact sharing intent
  for (const pattern of CONTACT_INTENT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(message) || pattern.test(normalizedMessage)) {
      return {
        isBlocked: true,
        reason: 'Sharing contact information outside the app is not allowed.',
        detectedType: 'contact_intent',
      };
    }
  }

  return { isBlocked: false };
}

/**
 * Quick check - returns true if blocked
 */
export function isMessageBlocked(message: string): boolean {
  return moderateMessage(message).isBlocked;
}

/**
 * Get user-friendly error message
 */
export function getBlockedMessageError(result: ModerationResult): string {
  return result.reason || 'This message contains prohibited content.';
}

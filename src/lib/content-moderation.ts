/**
 * Content Moderation Utility
 * 
 * Blocks:
 * 1. Sexual/explicit content (all languages)
 * 2. Contact information sharing (phone, email, social media)
 */

// ========================================
// SEXUAL CONTENT DETECTION (ALL LANGUAGES)
// ========================================

const SEXUAL_CONTENT_PATTERNS = [
  // English
  /\b(sex|nude[s]?|naked|porn|xxx|nsfw|erotic|orgasm|masturbat|blowjob|handjob|anal\s*sex|oral\s*sex|threesome|gangbang|fetish|bondage|bdsm|strip\s*tease|lap\s*dance|one\s*night\s*stand|hookup|hook\s*up|booty\s*call|f[*\s]?u[*\s]?c[*\s]?k|d[*\s]?i[*\s]?c[*\s]?k|p[*\s]?u[*\s]?s[*\s]?s[*\s]?y|c[*\s]?o[*\s]?c[*\s]?k|a[*\s]?s[*\s]?s\s*h[*\s]?o[*\s]?l[*\s]?e|cum\s*shot|creampie|milf|dildo|vibrator|slutt?y?|whor[e]?|bitch)\b/gi,
  /\b(send\s*(me\s*)?(nudes?|pics?|photos?|body\s*pics?))\b/gi,
  /\b(show\s*(me\s*)?(your\s*)?(body|boobs?|tits?|ass|butt|privates?))\b/gi,
  /\b(let'?s?\s*(have\s*)?sex|wanna\s*(f[*]?ck|bang|smash|screw))\b/gi,
  /\b(horny|turned\s*on|get\s*laid|make\s*love|sleep\s*with\s*me)\b/gi,

  // Hindi / Urdu (Romanized + Devanagari)
  /\b(chod|chud|lund|gaand|bhosdi|randi|chut|maderchod|behenchod|chudai|jhaant|muth|hilana)\b/gi,
  /\b(चोद|चूत|लंड|गांड|भोसडी|रंडी|चुदाई|मादरचोद|बहनचोद|मूठ|हिलाना)\b/g,

  // Tamil (Romanized + Tamil script)
  /\b(otha|thevdiya|pundai|sunni|oombu|koothi|myiru)\b/gi,
  /\b(ஓத்தா|தேவடியா|புண்டை|சுன்னி|ஊம்பு|கூதி)\b/g,

  // Telugu (Romanized + Telugu script)
  /\b(dengey|modda|gudda|lanja|pooku|sulli)\b/gi,
  /\b(దెంగేయ్|మొడ్డ|గుద్ద|లంజ|పూకు|సుల్లి)\b/g,

  // Bengali (Romanized + Bengali script)
  /\b(choda|baal|magir?|gud|dhon|magi|chudi)\b/gi,
  /\b(চোদা|বাল|মাগি|গুদ|ধোন|চুদি)\b/g,

  // Kannada (Romanized + Kannada script)
  /\b(tunne|tull|sule|bolimaga|ninge)\b/gi,
  /\b(ತುನ್ನೆ|ತುಳ್ಳ|ಸೂಳೆ|ಬೋಳಿಮಗ)\b/g,

  // Malayalam (Romanized + Malayalam script)
  /\b(kunna|pooru|thendi|myiru|poorr)\b/gi,
  /\b(കുണ്ണ|പൂറ്|തെണ്ടി|മൈര്)\b/g,

  // Marathi (Romanized + Devanagari)
  /\b(zavadya|jhavla|madharchod|zhavne|randya)\b/gi,
  /\b(झवाड्या|झवला|मादरचोद|झवणे|रांडया)\b/g,

  // Gujarati (Romanized + Gujarati script)
  /\b(chodu|chodvu|gand|lodo|bhosad)\b/gi,
  /\b(ચોદુ|ગાંડ|લોડો|ભોસડ)\b/g,

  // Punjabi (Romanized + Gurmukhi)
  /\b(lann|phuddi|kanjri|chod|bhosad|kutti)\b/gi,
  /\b(ਲੰਨ|ਫੁੱਦੀ|ਕੰਜਰੀ|ਚੋਦ|ਕੁੱਤੀ)\b/g,

  // Arabic (Romanized + Arabic script)
  /\b(kos|ayre|sharmouta|nikni|zobb|teezi|manyak|sharmoot)\b/gi,
  /\b(كس|زب|شرموطة|طيزي|منيك)\b/g,

  // Spanish
  /\b(puta|verga|coger|chingar|pendejo|culo|polla|follar|coño|mierda)\b/gi,

  // French
  /\b(putain|baise[r]?|salope|niquer|enculer|merde|couilles|bite)\b/gi,

  // Portuguese
  /\b(foder|puta|buceta|caralho|porra|merda|safado)\b/gi,

  // Chinese (common sexual terms)
  /[操肏屌屄婊鸡巴逼骚淫荡]/g,

  // Japanese
  /[ちんこまんこセックスエッチオナニー]/g,

  // Korean
  /\b(씨발|존나|보지|자지|씹|좆)\b/g,

  // Indonesian/Malay
  /\b(kontol|memek|ngentot|pepek|jembut|bangsat)\b/gi,

  // Turkish
  /\b(sik|amcık|orospu|götveren|sikis|yarrak)\b/gi,

  // Russian (Romanized)
  /\b(blyad|suka|huy|pizda|yebat|nahui|mudak)\b/gi,
  // Russian (Cyrillic)
  /\b(блядь|сука|хуй|пизда|ебать|нахуй|мудак)\b/g,

  // Thai
  /\b(เย็ด|หี|ควย|อีสัตว์|อีเหี้ย)\b/g,

  // Vietnamese
  /\b(địt|lồn|cặc|đụ|đĩ)\b/gi,

  // German
  /\b(ficken|hurensohn|schlampe|schwanz|fotze|wichser)\b/gi,

  // Obfuscation attempts (leetspeak, spacing, symbols)
  /\b(s[3e]x|n[u0]d[3e]|p[o0]rn|fck|f[*#@]ck|sh[!1]t|d[!1]ck|p[*#@]ssy|c[*#@]ck)\b/gi,
  /\b[s$][e3][xX]|[nN][uU][dD][eE3][sS$]?\b/gi,
];

// ========================================
// CONTACT SHARING DETECTION
// ========================================

// Number words for detection (supports multiple languages)
const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred',
  'ek', 'do', 'teen', 'char', 'paanch', 'panch', 'chhe', 'saat', 'aath', 'nau', 'das',
  'nol', 'nil', 'first', 'second', 'third'
];

const numberWordsPattern = new RegExp(
  `\\b(${NUMBER_WORDS.join('|')})(\\s*[-,./]?\\s*(${NUMBER_WORDS.join('|')})){3,}\\b`,
  'gi'
);

const PHONE_PATTERNS = [
  /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  /\b\d{7,15}\b/g,
  /\b\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d+/g,
  numberWordsPattern,
];

const EMAIL_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  /[a-zA-Z0-9._%+-]+\s*[@\[\(]\s*[a-zA-Z0-9.-]+\s*[.\[\(]\s*[a-zA-Z]{2,}/gi,
  /[a-zA-Z0-9._%+-]+\s*(at|@|AT)\s*[a-zA-Z0-9.-]+\s*(dot|\.)\s*[a-zA-Z]{2,}/gi,
];

const SOCIAL_MEDIA_PATTERNS = [
  /\b(whatsapp|whats\s*app|watsapp|wapp)\s*[:\-#@]\s*[\w.+-]+/gi,
  /\b(instagram|insta)\s*[:\-#@]\s*[\w.+-]+/gi,
  /\b(facebook|fb)\s*[:\-#@]\s*[\w.+-]+/gi,
  /\b(telegram|tg|telgram)\s*[:\-#@]\s*[\w.+-]+/gi,
  /\b(snapchat|snap)\s*[:\-#@]\s*[\w.+-]+/gi,
  /\b(tiktok|tik\s*tok)\s*[:\-#@]\s*[\w.+-]+/gi,
  /\b(wechat|we\s*chat)\s*[:\-#@]\s*[\w.+-]+/gi,
  /\b(discord)\s*[:\-#@]\s*[\w.+-]+/gi,
  /\b(skype)\s*[:\-#@]\s*[\w.+-]+/gi,
  /\btwitter\s*[:\-#@]\s*[\w.+-]+/gi,
  /\bx\.com\/[\w.+-]+/gi,
  /\b(add|contact|reach|text|message|dm|msg)\s+me\s+(on|at|via)\s+(whatsapp|whats\s*app|instagram|insta|facebook|fb|telegram|tg|snapchat|snap|tiktok|wechat|discord|skype)\b/gi,
  /\b(wa\.me|t\.me|m\.me)\/\S+/gi,
  /\b(my|add)\s+(whatsapp|instagram|telegram|snapchat|facebook)\s+(id|username|handle|number)\s*(is|:)\s*[\w.@+-]+/gi,
];

const CONTACT_INTENT_PATTERNS = [
  /\b(contact|reach|text|message|call)\s*(me|us)\s*(outside|privately|directly|on|at|via)/gi,
  /\b(give|send|share)\s*(me|you|your|my)\s*(number|phone|mobile|cell|email|id|contact)/gi,
  /\b(here'?s?|this is)\s*(my|the)\s*(number|phone|mobile|email|id|contact|whatsapp|instagram)/gi,
  /\b(dm|private message|pm)\s*(me|you)/gi,
];

export interface ModerationResult {
  isBlocked: boolean;
  reason?: string;
  detectedType?: 'phone' | 'email' | 'social_media' | 'contact_intent' | 'sexual_content';
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

  // Check for sexual content FIRST (highest priority)
  for (const pattern of SEXUAL_CONTENT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(message) || pattern.test(normalizedMessage)) {
      return {
        isBlocked: true,
        reason: 'Sexual or explicit content is strictly prohibited.',
        detectedType: 'sexual_content',
      };
    }
  }

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

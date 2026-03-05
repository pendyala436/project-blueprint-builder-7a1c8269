/**
 * Content Moderation Utility
 * 
 * Blocks:
 * 1. Sexual/explicit content (all languages)
 * 2. Contact information sharing (phone, email, social media)
 * 3. Harmful/threatening content
 * 4. Numbers in word/symbol form
 * 5. File attachments containing contact info
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
  // Hindi/Urdu
  /\b(chod|chud|lund|gaand|bhosdi|randi|chut|maderchod|behenchod|chudai|jhaant|muth|hilana)\b/gi,
  /\b(चोद|चूत|लंड|गांड|भोसडी|रंडी|चुदाई|मादरचोद|बहनचोद|मूठ|हिलाना)\b/g,
  // Tamil
  /\b(otha|thevdiya|pundai|sunni|oombu|koothi|myiru)\b/gi,
  /\b(ஓத்தா|தேவடியா|புண்டை|சுன்னி|ஊம்பு|கூதி)\b/g,
  // Telugu
  /\b(dengey|modda|gudda|lanja|pooku|sulli)\b/gi,
  /\b(దెంగేయ్|మొడ్డ|గుద్ద|లంజ|పూకు|సుల్లి)\b/g,
  // Bengali
  /\b(choda|baal|magir?|gud|dhon|magi|chudi)\b/gi,
  /\b(চোদা|বাল|মাগি|গুদ|ধোন|চুদি)\b/g,
  // Kannada
  /\b(tunne|tull|sule|bolimaga|ninge)\b/gi,
  /\b(ತುನ್ನೆ|ತುಳ್ಳ|ಸೂಳೆ|ಬೋಳಿಮಗ)\b/g,
  // Malayalam
  /\b(kunna|pooru|thendi|myiru|poorr)\b/gi,
  /\b(കുണ്ണ|പൂറ്|തെണ്ടി|മൈര്)\b/g,
  // Marathi
  /\b(zavadya|jhavla|madharchod|zhavne|randya)\b/gi,
  /\b(झवाड्या|झवला|मादरचोद|झवणे|रांडया)\b/g,
  // Gujarati
  /\b(chodu|chodvu|gand|lodo|bhosad)\b/gi,
  /\b(ચોદુ|ગાંડ|લોડો|ભોસડ)\b/g,
  // Punjabi
  /\b(lann|phuddi|kanjri|chod|bhosad|kutti)\b/gi,
  /\b(ਲੰਨ|ਫੁੱਦੀ|ਕੰਜਰੀ|ਚੋਦ|ਕੁੱਤੀ)\b/g,
  // Arabic
  /\b(kos|ayre|sharmouta|nikni|zobb|teezi|manyak|sharmoot)\b/gi,
  /\b(كس|زب|شرموطة|طيزي|منيك)\b/g,
  // Spanish
  /\b(puta|verga|coger|chingar|pendejo|culo|polla|follar|coño|mierda)\b/gi,
  // French
  /\b(putain|baise[r]?|salope|niquer|enculer|merde|couilles|bite)\b/gi,
  // Portuguese
  /\b(foder|puta|buceta|caralho|porra|merda|safado)\b/gi,
  // Chinese
  /[操肏屌屄婊鸡巴逼骚淫荡]/g,
  // Japanese
  /[ちんこまんこセックスエッチオナニー]/g,
  // Korean
  /\b(씨발|존나|보지|자지|씹|좆)\b/g,
  // Indonesian/Malay
  /\b(kontol|memek|ngentot|pepek|jembut|bangsat)\b/gi,
  // Turkish
  /\b(sik|amcık|orospu|götveren|sikis|yarrak)\b/gi,
  // Russian
  /\b(blyad|suka|huy|pizda|yebat|nahui|mudak)\b/gi,
  /\b(блядь|сука|хуй|пизда|ебать|нахуй|мудак)\b/g,
  // Thai
  /\b(เย็ด|หี|ควย|อีสัตว์|อีเหี้ย)\b/g,
  // Vietnamese
  /\b(địt|lồn|cặc|đụ|đĩ)\b/gi,
  // German
  /\b(ficken|hurensohn|schlampe|schwanz|fotze|wichser)\b/gi,
  // Obfuscation/leetspeak
  /\b(s[3e]x|n[u0]d[3e]|p[o0]rn|fck|f[*#@]ck|sh[!1]t|d[!1]ck|p[*#@]ssy|c[*#@]ck)\b/gi,
  /\b[s$][e3][xX]|[nN][uU][dD][eE3][sS$]?\b/gi,
];

// ========================================
// HARMFUL CONTENT DETECTION
// ========================================

const HARMFUL_CONTENT_PATTERNS = [
  // Threats and violence
  /\b(i('?ll| will)\s*(kill|murder|hurt|harm|stab|shoot|beat|destroy|rape)\s*(you|him|her|them|myself|yourself))\b/gi,
  /\b(kill\s*(yourself|urself|u|your\s*self)|go\s*die|hope\s*you\s*die)\b/gi,
  /\b(i('?m| am)\s*going\s*to\s*(kill|murder|hurt|harm|attack|rape))\b/gi,
  /\b(death\s*threat|bomb\s*threat|i('?ll| will)\s*bomb)\b/gi,
  /\b(suicide|cut\s*yourself|harm\s*yourself|end\s*your\s*life)\b/gi,
  // Harassment
  /\b(i('?ll| will)\s*(find|track|stalk|hunt)\s*(you|your\s*(house|home|family|address)))\b/gi,
  /\b(you('?re| are)\s*(worthless|garbage|trash|nothing|dead))\b/gi,
  /\b(kys|k\.y\.s|kill\s*your\s*self)\b/gi,
  // Blackmail/extortion
  /\b(i('?ll| will)\s*(expose|leak|share)\s*(your|ur)\s*(photos?|pics?|videos?|nudes?))\b/gi,
  /\b(pay\s*me\s*or|send\s*money\s*or\s*i('?ll| will))\b/gi,
];

// ========================================
// CONTACT SHARING DETECTION
// ========================================

// Number words in multiple languages
const NUMBER_WORDS_EN = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred',
];

const NUMBER_WORDS_HINDI = [
  'ek', 'do', 'teen', 'char', 'paanch', 'panch', 'chhe', 'saat', 'aath', 'nau', 'das',
  'gyarah', 'barah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'athaarah', 'unnis', 'bees',
  'nol', 'nil', 'shunya',
];

const NUMBER_WORDS_ARABIC = [
  'wahid', 'ithnayn', 'thalatha', 'arba', 'khamsa', 'sitta', 'saba', 'thamaniya', 'tisa', 'ashara',
  'sifr',
];

const ALL_NUMBER_WORDS = [...NUMBER_WORDS_EN, ...NUMBER_WORDS_HINDI, ...NUMBER_WORDS_ARABIC];

// 4+ number words in sequence = likely phone number
const numberWordsPattern = new RegExp(
  `\\b(${ALL_NUMBER_WORDS.join('|')})(\\s*[-,./\\s]?\\s*(${ALL_NUMBER_WORDS.join('|')})){3,}\\b`,
  'gi'
);

// Symbol-encoded numbers: z3r0, 0ne, tw0, thr33, f0ur, f1ve, s1x, etc.
const SYMBOL_NUMBER_PATTERNS = [
  /\b(z[3e]r[o0]|[o0]n[e3]|tw[o0]|thr[3e]{2}|f[o0]ur|f[1i]v[e3]|s[1i]x|s[3e]v[3e]n|[3e][1i]ght|n[1i]n[e3])\b/gi,
];

const PHONE_PATTERNS = [
  // Standard phone formats
  /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  // 7+ consecutive digits
  /\b\d{7,15}\b/g,
  // Digits separated by spaces/dots/dashes (e.g., "9 8 7 6 5 4 3 2 1 0")
  /\b\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d[\s.-]*\d+/g,
  // Number words in sequence
  numberWordsPattern,
  // Symbol/leet-speak numbers in sequence (4+)
  ...SYMBOL_NUMBER_PATTERNS,
  // Digits mixed with letters to obfuscate: "my num is nine8seven6five4three2one0"
  /\b(my|mera|call|ring|dial|phone|number|no|num|mob|mobile)\b.{0,20}\d/gi,
  // Hindi number words in Devanagari
  /\b(एक|दो|तीन|चार|पांच|छः|सात|आठ|नौ|दस|शून्य)(\s*(एक|दो|तीन|चार|पांच|छः|सात|आठ|नौ|दस|शून्य)){3,}\b/g,
];

const EMAIL_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  // Obfuscated: user [at] domain [dot] com
  /[a-zA-Z0-9._%+-]+\s*[@\[\(]\s*[a-zA-Z0-9.-]+\s*[.\[\(]\s*[a-zA-Z]{2,}/gi,
  /[a-zA-Z0-9._%+-]+\s*(at|@|AT|अट|ऐट)\s*[a-zA-Z0-9.-]+\s*(dot|\.|\s*डॉट)\s*[a-zA-Z]{2,}/gi,
  // Gmail/yahoo/hotmail mentions with username
  /\b(gmail|yahoo|hotmail|outlook|proton\s*mail|mail)\s*[-:]\s*[a-zA-Z0-9._]+/gi,
  /\b[a-zA-Z0-9._]+\s*(gmail|yahoo|hotmail|outlook)\b/gi,
];

// ========================================
// SOCIAL MEDIA - BLOCK APP NAMES + IDs
// ========================================

const SOCIAL_MEDIA_APPS = [
  'whatsapp', 'whats\\s*app', 'watsapp', 'wapp', 'wa',
  'instagram', 'insta', 'ig',
  'facebook', 'fb', 'messenger',
  'telegram', 'tg', 'telgram',
  'snapchat', 'snap', 'sc',
  'tiktok', 'tik\\s*tok',
  'wechat', 'we\\s*chat',
  'discord', 'dc',
  'skype',
  'twitter', 'x\\.com',
  'signal',
  'viber',
  'line',
  'imo',
  'kik',
  'hike',
  'kakaotalk', 'kakao',
  'zalo',
  'threads',
  'linkedin',
  'pinterest',
  'reddit',
  'tumblr',
  'youtube', 'yt',
  'twitch',
];

const socialAppsJoined = SOCIAL_MEDIA_APPS.join('|');

const SOCIAL_MEDIA_PATTERNS = [
  // App name followed by handle/id/number
  new RegExp(`\\b(${socialAppsJoined})\\s*[:\\-#@]?\\s*[\\w.+-]+`, 'gi'),
  // "add/contact/reach me on [app]"
  new RegExp(`\\b(add|contact|reach|text|message|dm|msg|ping|hit\\s*me|find\\s*me|follow)\\s+(me\\s+)?(on|at|via|in)\\s+(${socialAppsJoined})\\b`, 'gi'),
  // "[app] id/username/handle/number is..."
  new RegExp(`\\b(${socialAppsJoined})\\s+(id|username|handle|number|no|num|account|profile)\\s*(is|:|-|=)\\s*[\\w.@+-]+`, 'gi'),
  // "my [app] is..."
  new RegExp(`\\b(my|mera|meri)\\s+(${socialAppsJoined})\\s*(is|hai|:|-|=)\\s*[\\w.@+-]+`, 'gi'),
  // Direct links
  /\b(wa\.me|t\.me|m\.me|bit\.ly|tinyurl\.com|goo\.gl)\/\S+/gi,
  // Standalone social media app names (block even mentioning them)
  new RegExp(`\\b(${socialAppsJoined})\\b`, 'gi'),
];

const CONTACT_INTENT_PATTERNS = [
  /\b(contact|reach|text|message|call|ring)\s*(me|us)\s*(outside|privately|directly|on|at|via|off\s*this|off\s*app)/gi,
  /\b(give|send|share|tell)\s*(me|you|your|my|ur)\s*(number|phone|mobile|cell|email|id|contact|address)/gi,
  /\b(here'?s?|this is)\s*(my|the)\s*(number|phone|mobile|email|id|contact)/gi,
  /\b(dm|private message|pm|inbox)\s*(me|you)/gi,
  /\b(let'?s?\s*(talk|chat|meet)\s*(outside|off|privately|on\s*(another|other)\s*app))/gi,
  /\b(meet\s*me|come\s*to|visit\s*me)\s*(at|in|on)/gi,
  /\b(outside\s*(this\s*)?app|off\s*platform|another\s*app|other\s*app)/gi,
];

// ========================================
// FILE / ATTACHMENT BLOCKING
// ========================================

/**
 * List of file extensions that could contain contact info
 * Images with text, documents, etc.
 */
const BLOCKED_ATTACHMENT_EXTENSIONS = [
  // Documents that can contain text with contact info
  '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
  '.xls', '.xlsx', '.csv',
  '.ppt', '.pptx',
  // vCards / contacts
  '.vcf', '.vcard',
  // Web files
  '.html', '.htm',
];

/**
 * Check if a filename suggests contact sharing
 */
const CONTACT_FILENAME_PATTERNS = [
  /contact/i,
  /phone/i,
  /number/i,
  /my\s*id/i,
  /whatsapp/i,
  /instagram/i,
  /email/i,
  /snap/i,
  /telegram/i,
  /facebook/i,
  /vcf/i,
  /vcard/i,
];

// ========================================
// TYPES
// ========================================

export type ViolationType = 'phone' | 'email' | 'social_media' | 'contact_intent' | 'sexual_content' | 'harmful_content' | 'blocked_attachment' | 'number_words';

export interface ModerationResult {
  isBlocked: boolean;
  reason?: string;
  detectedType?: ViolationType;
  sanitizedMessage?: string;
}

// ========================================
// MAIN MODERATION FUNCTION
// ========================================

/**
 * Check if message contains prohibited content
 */
export function moderateMessage(message: string): ModerationResult {
  if (!message || typeof message !== 'string') {
    return { isBlocked: false };
  }

  const normalizedMessage = message.toLowerCase().replace(/\s+/g, ' ').trim();

  // 1. Sexual content (highest priority)
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

  // 2. Harmful/threatening content
  for (const pattern of HARMFUL_CONTENT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(message) || pattern.test(normalizedMessage)) {
      return {
        isBlocked: true,
        reason: 'Threatening or harmful content is not allowed.',
        detectedType: 'harmful_content',
      };
    }
  }

  // 3. Phone numbers (digits, words, symbols)
  for (const pattern of PHONE_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(message) || pattern.test(normalizedMessage)) {
      return {
        isBlocked: true,
        reason: 'Sharing phone numbers is not allowed for your safety.',
        detectedType: 'phone',
      };
    }
  }

  // 4. Emails
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

  // 5. Social media app names and handles
  for (const pattern of SOCIAL_MEDIA_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(message) || pattern.test(normalizedMessage)) {
      return {
        isBlocked: true,
        reason: 'Mentioning social media apps or sharing accounts is not allowed.',
        detectedType: 'social_media',
      };
    }
  }

  // 6. Contact sharing intent
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

// ========================================
// ATTACHMENT MODERATION
// ========================================

/**
 * Check if a file attachment should be blocked
 * Blocks documents, vCards, and files with suspicious names
 */
export function moderateAttachment(fileName: string, fileType?: string): ModerationResult {
  if (!fileName) return { isBlocked: false };

  const lowerName = fileName.toLowerCase();

  // Block vCard files (contact sharing)
  if (lowerName.endsWith('.vcf') || lowerName.endsWith('.vcard')) {
    return {
      isBlocked: true,
      reason: 'Sharing contact files is not allowed.',
      detectedType: 'blocked_attachment',
    };
  }

  // Block documents that can embed contact info
  const ext = '.' + lowerName.split('.').pop();
  if (BLOCKED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    return {
      isBlocked: true,
      reason: 'Sending documents is not allowed. Only images are permitted.',
      detectedType: 'blocked_attachment',
    };
  }

  // Block filenames that suggest contact sharing
  for (const pattern of CONTACT_FILENAME_PATTERNS) {
    if (pattern.test(lowerName)) {
      return {
        isBlocked: true,
        reason: 'This file appears to contain contact information and is blocked.',
        detectedType: 'blocked_attachment',
      };
    }
  }

  // Block suspicious MIME types
  if (fileType) {
    const blockedMimeTypes = [
      'text/vcard', 'text/x-vcard',
      'text/plain', 'text/html', 'text/csv',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
    ];
    if (blockedMimeTypes.some(mime => fileType.startsWith(mime))) {
      return {
        isBlocked: true,
        reason: 'This file type is not allowed. Only images are permitted.',
        detectedType: 'blocked_attachment',
      };
    }
  }

  return { isBlocked: false };
}

/**
 * Check if an image might contain text with contact info
 * This checks the OCR-extracted text or image filename
 */
export function moderateImageText(extractedText: string): ModerationResult {
  if (!extractedText) return { isBlocked: false };
  // Run full message moderation on any text extracted from images
  return moderateMessage(extractedText);
}

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

/**
 * Quick check - returns true if blocked
 */
export function isMessageBlocked(message: string): boolean {
  return moderateMessage(message).isBlocked;
}

/**
 * Quick check for attachments
 */
export function isAttachmentBlocked(fileName: string, fileType?: string): boolean {
  return moderateAttachment(fileName, fileType).isBlocked;
}

/**
 * Get user-friendly error message
 */
export function getBlockedMessageError(result: ModerationResult): string {
  return result.reason || 'This message contains prohibited content.';
}

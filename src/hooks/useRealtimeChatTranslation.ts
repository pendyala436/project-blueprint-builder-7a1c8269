/**
 * Ultra-Fast Real-Time Chat Translation Hook
 * ============================================
 * Production-ready, < 3ms UI response time
 * 
 * Features:
 * - Non-blocking: All heavy work in Web Worker
 * - Auto-detect source/target language
 * - Live Latin → Native preview (debounced 50ms)
 * - Bi-directional translation
 * - Same language = no translation, just script conversion
 * - Sender sees native script in their language
 * - Receiver sees translated message in their language
 * 
 * All 300+ NLLB languages supported
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  initWorker,
  isReady as isWorkerReady,
  getLoadingStatus,
  transliterateToNative,
  translate,
  processChatMessage,
  detectLanguage,
  isLatinText,
  isLatinScriptLanguage,
  isSameLanguage,
  normalizeUnicode,
  terminateWorker,
} from '@/lib/translation';

// ============================================================
// TYPES
// ============================================================

export interface ChatMessageResult {
  senderView: string;       // What sender sees (native script)
  receiverView: string;     // What receiver sees (translated + native script)
  originalText: string;     // Raw Latin input
  wasTransliterated: boolean;
  wasTranslated: boolean;
  processingTime: number;   // ms
}

export interface LivePreviewResult {
  preview: string;          // Native script preview
  isLatin: boolean;         // Input is Latin
  processingTime: number;   // ms (target < 3ms for UI)
}

export interface AutoDetectedLanguage {
  language: string;
  script: string;
  isLatin: boolean;
  confidence: number;
}

// ============================================================
// OPTIMIZED CACHES (in-memory, instant access)
// ============================================================

const previewCache = new Map<string, string>();
const transliterationCache = new Map<string, string>();
const MAX_CACHE = 500;

function getCacheKey(text: string, lang: string): string {
  return `${lang}:${text}`;
}

function addToCache(cache: Map<string, string>, key: string, value: string): void {
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, value);
}

// ============================================================
// ULTRA-FAST SYNC TRANSLITERATION (< 1ms)
// For instant preview while typing - no worker needed
// ============================================================

const QUICK_TRANSLITERATION: Record<string, Record<string, string>> = {
  // Hindi (Devanagari)
  hindi: {
    'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ',
    'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',
    'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ', 'na': 'न',
    'cha': 'च', 'chha': 'छ', 'ja': 'ज', 'jha': 'झ',
    'ta': 'त', 'tha': 'थ', 'da': 'द', 'dha': 'ध',
    'pa': 'प', 'pha': 'फ', 'ba': 'ब', 'bha': 'भ', 'ma': 'म',
    'ya': 'य', 'ra': 'र', 'la': 'ल', 'va': 'व', 'wa': 'व',
    'sha': 'श', 'sa': 'स', 'ha': 'ह',
    'k': 'क्', 'kh': 'ख्', 'g': 'ग्', 'gh': 'घ्', 'n': 'न्',
    'ch': 'च्', 'j': 'ज्', 'jh': 'झ्',
    't': 'त्', 'th': 'थ्', 'd': 'द्', 'dh': 'ध्',
    'p': 'प्', 'ph': 'फ्', 'b': 'ब्', 'bh': 'भ्', 'm': 'म्',
    'y': 'य्', 'r': 'र्', 'l': 'ल्', 'v': 'व्', 'w': 'व्',
    'sh': 'श्', 's': 'स्', 'h': 'ह्',
    'namaste': 'नमस्ते', 'kaise': 'कैसे', 'ho': 'हो', 'main': 'मैं',
    'aap': 'आप', 'haan': 'हाँ', 'nahi': 'नहीं', 'theek': 'ठीक',
    'dhanyavad': 'धन्यवाद', 'shukriya': 'शुक्रिया', 'kya': 'क्या',
    'hai': 'है', 'hain': 'हैं', 'aur': 'और', 'mera': 'मेरा', 'tera': 'तेरा',
  },
  marathi: {
    'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ',
    'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',
    'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ', 'na': 'न',
    'namaskar': 'नमस्कार', 'kasa': 'कसा', 'aahe': 'आहे', 'mi': 'मी',
    'tumhi': 'तुम्ही', 'dhanyavad': 'धन्यवाद',
  },
  nepali: {
    'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ',
    'namaste': 'नमस्ते', 'dhanyabad': 'धन्यवाद', 'ma': 'म', 'timi': 'तिमी',
  },
  // Telugu
  telugu: {
    'a': 'అ', 'aa': 'ఆ', 'i': 'ఇ', 'ee': 'ఈ', 'u': 'ఉ', 'oo': 'ఊ',
    'e': 'ఎ', 'ai': 'ఐ', 'o': 'ఒ', 'au': 'ఔ',
    'ka': 'క', 'kha': 'ఖ', 'ga': 'గ', 'gha': 'ఘ', 'na': 'న',
    'cha': 'చ', 'ja': 'జ', 'ta': 'త', 'tha': 'థ', 'da': 'ద', 'dha': 'ధ',
    'pa': 'ప', 'pha': 'ఫ', 'ba': 'బ', 'bha': 'భ', 'ma': 'మ',
    'ya': 'య', 'ra': 'ర', 'la': 'ల', 'va': 'వ', 'wa': 'వ',
    'sha': 'శ', 'sa': 'స', 'ha': 'హ',
    'bagunnava': 'బాగున్నావా', 'nenu': 'నేను', 'meeru': 'మీరు',
    'namaskaram': 'నమస్కారం', 'dhanyavadalu': 'ధన్యవాదాలు',
    'ela': 'ఎలా', 'undi': 'ఉంది', 'unnavu': 'ఉన్నావు',
  },
  // Tamil
  tamil: {
    'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ee': 'ஈ', 'u': 'உ', 'oo': 'ஊ',
    'e': 'எ', 'ai': 'ஐ', 'o': 'ஒ', 'au': 'ஔ',
    'ka': 'க', 'nga': 'ங', 'cha': 'ச', 'ja': 'ஜ',
    'ta': 'த', 'na': 'ந', 'pa': 'ப', 'ma': 'ம',
    'ya': 'ய', 'ra': 'ர', 'la': 'ல', 'va': 'வ', 'zha': 'ழ',
    'sha': 'ஷ', 'sa': 'ஸ', 'ha': 'ஹ',
    'vanakkam': 'வணக்கம்', 'nandri': 'நன்றி', 'naan': 'நான்',
    'eppadi': 'எப்படி', 'irukkirai': 'இருக்கிறாய்', 'irukken': 'இருக்கேன்',
  },
  // Bengali
  bengali: {
    'a': 'অ', 'aa': 'আ', 'i': 'ই', 'ee': 'ঈ', 'u': 'উ', 'oo': 'ঊ',
    'e': 'এ', 'ai': 'ঐ', 'o': 'ও', 'au': 'ঔ',
    'ka': 'ক', 'kha': 'খ', 'ga': 'গ', 'gha': 'ঘ', 'na': 'ন',
    'cha': 'চ', 'ja': 'জ', 'ta': 'ত', 'tha': 'থ', 'da': 'দ', 'dha': 'ধ',
    'pa': 'প', 'pha': 'ফ', 'ba': 'ব', 'bha': 'ভ', 'ma': 'ম',
    'ya': 'য', 'ra': 'র', 'la': 'ল', 'sha': 'শ', 'sa': 'স', 'ha': 'হ',
    'namaskar': 'নমস্কার', 'dhanyabad': 'ধন্যবাদ', 'ami': 'আমি',
    'tumi': 'তুমি', 'kemon': 'কেমন', 'acho': 'আছো', 'achi': 'আছি',
  },
  // Kannada
  kannada: {
    'a': 'ಅ', 'aa': 'ಆ', 'i': 'ಇ', 'ee': 'ಈ', 'u': 'ಉ', 'oo': 'ಊ',
    'e': 'ಎ', 'ai': 'ಐ', 'o': 'ಒ', 'au': 'ಔ',
    'ka': 'ಕ', 'kha': 'ಖ', 'ga': 'ಗ', 'gha': 'ಘ', 'na': 'ನ',
    'namaskara': 'ನಮಸ್ಕಾರ', 'dhanyavadagalu': 'ಧನ್ಯವಾದಗಳು', 'naanu': 'ನಾನು',
    'neevu': 'ನೀವು', 'hegidira': 'ಹೇಗಿದ್ದೀರಾ', 'chennagide': 'ಚೆನ್ನಾಗಿದೆ',
  },
  // Malayalam
  malayalam: {
    'a': 'അ', 'aa': 'ആ', 'i': 'ഇ', 'ee': 'ഈ', 'u': 'ഉ', 'oo': 'ഊ',
    'e': 'എ', 'ai': 'ഐ', 'o': 'ഒ', 'au': 'ഔ',
    'ka': 'ക', 'kha': 'ഖ', 'ga': 'ഗ', 'gha': 'ഘ', 'na': 'ന',
    'namaskkaram': 'നമസ്കാരം', 'nandi': 'നന്ദി', 'njan': 'ഞാൻ',
    'ningal': 'നിങ്ങൾ', 'sugham': 'സുഖം', 'aano': 'ആണോ',
  },
  // Gujarati
  gujarati: {
    'a': 'અ', 'aa': 'આ', 'i': 'ઇ', 'ee': 'ઈ', 'u': 'ઉ', 'oo': 'ઊ',
    'e': 'એ', 'ai': 'ઐ', 'o': 'ઓ', 'au': 'ઔ',
    'ka': 'ક', 'kha': 'ખ', 'ga': 'ગ', 'gha': 'ઘ', 'na': 'ન',
    'namaste': 'નમસ્તે', 'dhanyavad': 'ધન્યવાદ', 'hu': 'હું',
    'tame': 'તમે', 'kem': 'કેમ', 'cho': 'છો', 'chhu': 'છું',
  },
  // Punjabi (Gurmukhi)
  punjabi: {
    'a': 'ਅ', 'aa': 'ਆ', 'i': 'ਇ', 'ee': 'ਈ', 'u': 'ਉ', 'oo': 'ਊ',
    'e': 'ਏ', 'ai': 'ਐ', 'o': 'ਓ', 'au': 'ਔ',
    'ka': 'ਕ', 'kha': 'ਖ', 'ga': 'ਗ', 'gha': 'ਘ', 'na': 'ਨ',
    'sat sri akal': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'dhanyavad': 'ਧੰਨਵਾਦ', 'main': 'ਮੈਂ',
    'tusi': 'ਤੁਸੀਂ', 'ki': 'ਕੀ', 'hal': 'ਹਾਲ', 'hai': 'ਹੈ',
  },
  // Odia
  odia: {
    'a': 'ଅ', 'aa': 'ଆ', 'i': 'ଇ', 'ee': 'ଈ', 'u': 'ଉ', 'oo': 'ଊ',
    'e': 'ଏ', 'ai': 'ଐ', 'o': 'ଓ', 'au': 'ଔ',
    'namaskar': 'ନମସ୍କାର', 'dhanyabad': 'ଧନ୍ୟବାଦ', 'mu': 'ମୁଁ',
  },
  // Arabic
  arabic: {
    'a': 'ا', 'b': 'ب', 't': 'ت', 'th': 'ث', 'j': 'ج', 'h': 'ح',
    'kh': 'خ', 'd': 'د', 'dh': 'ذ', 'r': 'ر', 'z': 'ز', 's': 'س',
    'sh': 'ش', 'ss': 'ص', 'dd': 'ض', 'tt': 'ط', 'zz': 'ظ',
    'aa': 'ع', 'gh': 'غ', 'f': 'ف', 'q': 'ق', 'k': 'ك', 'l': 'ل',
    'm': 'م', 'n': 'ن', 'w': 'و', 'y': 'ي',
    'marhaba': 'مرحبا', 'shukran': 'شكرا', 'ahlan': 'أهلا',
    'salam': 'سلام', 'assalamu': 'السلام', 'alaikum': 'عليكم',
    'kaif': 'كيف', 'halak': 'حالك', 'ana': 'أنا', 'anta': 'أنت',
  },
  // Urdu
  urdu: {
    'a': 'ا', 'b': 'ب', 'p': 'پ', 't': 'ت', 'th': 'ٹھ', 'j': 'ج',
    'ch': 'چ', 'h': 'ح', 'kh': 'خ', 'd': 'د', 'dh': 'ڈھ', 'r': 'ر',
    'z': 'ز', 's': 'س', 'sh': 'ش', 'f': 'ف', 'q': 'ق', 'k': 'ک',
    'g': 'گ', 'l': 'ل', 'm': 'م', 'n': 'ن', 'w': 'و', 'y': 'ی',
    'assalamu alaikum': 'السلام علیکم', 'shukriya': 'شکریہ', 'main': 'میں',
    'aap': 'آپ', 'kaise': 'کیسے', 'hain': 'ہیں', 'theek': 'ٹھیک',
  },
  // Russian
  russian: {
    'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
    'yo': 'ё', 'zh': 'ж', 'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к',
    'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р',
    's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'kh': 'х', 'ts': 'ц',
    'ch': 'ч', 'sh': 'ш', 'shch': 'щ', 'ya': 'я', 'yu': 'ю',
    'privet': 'привет', 'spasibo': 'спасибо', 'da': 'да', 'net': 'нет',
    'kak': 'как', 'dela': 'дела', 'horosho': 'хорошо', 'ya': 'я',
  },
  // Ukrainian
  ukrainian: {
    'a': 'а', 'b': 'б', 'v': 'в', 'h': 'г', 'g': 'ґ', 'd': 'д', 'e': 'е',
    'ye': 'є', 'zh': 'ж', 'z': 'з', 'y': 'и', 'i': 'і', 'yi': 'ї',
    'pryvit': 'привіт', 'dyakuyu': 'дякую', 'tak': 'так', 'ni': 'ні',
  },
  // Greek
  greek: {
    'a': 'α', 'b': 'β', 'g': 'γ', 'd': 'δ', 'e': 'ε', 'z': 'ζ',
    'i': 'η', 'th': 'θ', 'k': 'κ', 'l': 'λ', 'm': 'μ', 'n': 'ν',
    'x': 'ξ', 'o': 'ο', 'p': 'π', 'r': 'ρ', 's': 'σ', 't': 'τ',
    'yassou': 'γειά σου', 'efharisto': 'ευχαριστώ', 'ne': 'ναι', 'ohi': 'όχι',
  },
  // Japanese (Hiragana basics)
  japanese: {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を', 'n': 'ん',
    'konnichiwa': 'こんにちは', 'arigatou': 'ありがとう', 'hai': 'はい', 'iie': 'いいえ',
  },
  // Korean (basic)
  korean: {
    'annyeonghaseyo': '안녕하세요', 'gamsahamnida': '감사합니다', 
    'ne': '네', 'aniyo': '아니요', 'jal': '잘', 'jinae': '지내',
  },
  // Thai
  thai: {
    'sawadee': 'สวัสดี', 'khob khun': 'ขอบคุณ', 'chai': 'ใช่', 'mai': 'ไม่',
    'sabai': 'สบาย', 'dee': 'ดี', 'mai': 'ไหม', 'krab': 'ครับ', 'ka': 'ค่ะ',
  },
  // Chinese (Pinyin to simplified)
  chinese: {
    'nihao': '你好', 'xiexie': '谢谢', 'shi': '是', 'bushi': '不是',
    'wo': '我', 'ni': '你', 'ta': '他', 'hao': '好', 'zaijian': '再见',
  },
  // Vietnamese (with diacritics hints)
  vietnamese: {
    'xin chao': 'xin chào', 'cam on': 'cảm ơn', 'vang': 'vâng', 'khong': 'không',
  },
  // Indonesian/Malay
  indonesian: {
    'selamat pagi': 'selamat pagi', 'terima kasih': 'terima kasih', 
    'ya': 'ya', 'tidak': 'tidak', 'apa kabar': 'apa kabar',
  },
  malay: {
    'selamat pagi': 'selamat pagi', 'terima kasih': 'terima kasih',
    'ya': 'ya', 'tidak': 'tidak',
  },
  // Swahili
  swahili: {
    'jambo': 'jambo', 'habari': 'habari', 'asante': 'asante',
    'ndiyo': 'ndiyo', 'hapana': 'hapana',
  },
  // Hebrew
  hebrew: {
    'shalom': 'שלום', 'toda': 'תודה', 'ken': 'כן', 'lo': 'לא',
    'mah nishma': 'מה נשמע', 'bevakasha': 'בבקשה',
  },
  // Persian/Farsi
  persian: {
    'salam': 'سلام', 'mersi': 'مرسی', 'bale': 'بله', 'na': 'نه',
    'chetori': 'چطوری', 'khubam': 'خوبم', 'mamnun': 'ممنون',
  },
  farsi: {
    'salam': 'سلام', 'mersi': 'مرسی', 'bale': 'بله', 'na': 'نه',
  },
};

/**
 * Ultra-fast sync transliteration (< 1ms)
 * For instant preview - no async, no worker
 */
function quickTransliterate(text: string, language: string): string {
  const lang = language.toLowerCase();
  const map = QUICK_TRANSLITERATION[lang];
  if (!map) return text;

  const normalized = text.toLowerCase().normalize('NFC');
  
  // Check full word first
  if (map[normalized]) {
    return map[normalized];
  }

  // Split and transliterate each word
  const words = normalized.split(/\s+/);
  const transliterated = words.map(word => {
    if (map[word]) return map[word];
    
    // Character by character with pattern matching
    let result = '';
    let i = 0;
    while (i < word.length) {
      let matched = false;
      // Try longer patterns first (4, 3, 2, 1 chars)
      for (let len = Math.min(4, word.length - i); len > 0; len--) {
        const pattern = word.substring(i, i + len);
        if (map[pattern]) {
          result += map[pattern];
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result += word[i];
        i++;
      }
    }
    return result;
  });

  return transliterated.join(' ');
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useRealtimeChatTranslation() {
  const [isReady, setIsReady] = useState(isWorkerReady());
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Debounce timers
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Last values for cache hit detection
  const lastPreviewRef = useRef<{ text: string; lang: string; result: string }>({ text: '', lang: '', result: '' });

  // Initialize worker (lazy, in background)
  useEffect(() => {
    if (!isReady && !isLoading) {
      const status = getLoadingStatus();
      if (!status.isLoading && !status.isReady) {
        setIsLoading(true);
        initWorker((progress) => setLoadProgress(progress))
          .then((success) => {
            setIsReady(success);
            setIsLoading(false);
            if (!success) setError('Failed to load translation model');
          });
      } else if (status.isReady) {
        setIsReady(true);
      }
    }

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      if (translationTimerRef.current) clearTimeout(translationTimerRef.current);
    };
  }, [isReady, isLoading]);

  /**
   * Get live preview while typing (< 3ms UI response)
   * Uses sync transliteration for instant feedback
   * Falls back to worker for accuracy
   */
  const getLivePreview = useCallback((
    text: string,
    senderLanguage: string
  ): LivePreviewResult => {
    const start = performance.now();
    const trimmed = text.trim();

    // Empty text
    if (!trimmed) {
      return { preview: '', isLatin: true, processingTime: 0 };
    }

    // Check if Latin input
    const isLatin = isLatinText(trimmed);

    // If sender uses Latin script, no conversion needed
    if (isLatinScriptLanguage(senderLanguage)) {
      return { 
        preview: normalizeUnicode(trimmed), 
        isLatin, 
        processingTime: performance.now() - start 
      };
    }

    // Already in native script
    if (!isLatin) {
      return { 
        preview: normalizeUnicode(trimmed), 
        isLatin: false, 
        processingTime: performance.now() - start 
      };
    }

    // Check cache
    const cacheKey = getCacheKey(trimmed, senderLanguage);
    const cached = previewCache.get(cacheKey);
    if (cached) {
      return { 
        preview: cached, 
        isLatin: true, 
        processingTime: performance.now() - start 
      };
    }

    // Check if same as last preview (optimization)
    if (lastPreviewRef.current.text === trimmed && lastPreviewRef.current.lang === senderLanguage) {
      return { 
        preview: lastPreviewRef.current.result, 
        isLatin: true, 
        processingTime: performance.now() - start 
      };
    }

    // INSTANT: Use sync quick transliteration (< 1ms)
    const preview = quickTransliterate(trimmed, senderLanguage);
    
    // Cache result
    addToCache(previewCache, cacheKey, preview);
    lastPreviewRef.current = { text: trimmed, lang: senderLanguage, result: preview };

    // Fire async worker for better accuracy (doesn't block UI)
    if (isReady) {
      transliterateToNative(trimmed, senderLanguage)
        .then(result => {
          if (result.success && result.text !== preview) {
            addToCache(previewCache, cacheKey, result.text);
            lastPreviewRef.current = { text: trimmed, lang: senderLanguage, result: result.text };
          }
        })
        .catch(() => { /* ignore */ });
    }

    return { 
      preview: normalizeUnicode(preview), 
      isLatin: true, 
      processingTime: performance.now() - start 
    };
  }, [isReady]);

  /**
   * Auto-detect language from text (sync for UI, async for accuracy)
   */
  const autoDetectLanguage = useCallback(async (text: string): Promise<AutoDetectedLanguage> => {
    const trimmed = normalizeUnicode(text.trim());
    if (!trimmed) {
      return { language: 'english', script: 'Latin', isLatin: true, confidence: 0 };
    }

    try {
      if (isReady) {
        return await detectLanguage(trimmed);
      }
    } catch {
      // Fallback to sync detection
    }

    // Quick sync detection
    const isLatin = isLatinText(trimmed);
    if (!isLatin) {
      // Non-Latin - detect script
      if (/[\u0900-\u097F]/.test(trimmed)) return { language: 'hindi', script: 'Devanagari', isLatin: false, confidence: 0.9 };
      if (/[\u0C00-\u0C7F]/.test(trimmed)) return { language: 'telugu', script: 'Telugu', isLatin: false, confidence: 0.9 };
      if (/[\u0B80-\u0BFF]/.test(trimmed)) return { language: 'tamil', script: 'Tamil', isLatin: false, confidence: 0.9 };
      if (/[\u0980-\u09FF]/.test(trimmed)) return { language: 'bengali', script: 'Bengali', isLatin: false, confidence: 0.9 };
      if (/[\u0600-\u06FF]/.test(trimmed)) return { language: 'arabic', script: 'Arabic', isLatin: false, confidence: 0.9 };
      if (/[\u0400-\u04FF]/.test(trimmed)) return { language: 'russian', script: 'Cyrillic', isLatin: false, confidence: 0.9 };
      if (/[\u4E00-\u9FFF]/.test(trimmed)) return { language: 'chinese', script: 'Han', isLatin: false, confidence: 0.9 };
      if (/[\uAC00-\uD7AF]/.test(trimmed)) return { language: 'korean', script: 'Hangul', isLatin: false, confidence: 0.9 };
      if (/[\u0E00-\u0E7F]/.test(trimmed)) return { language: 'thai', script: 'Thai', isLatin: false, confidence: 0.9 };
    }

    return { language: 'english', script: 'Latin', isLatin: true, confidence: 0.5 };
  }, [isReady]);

  /**
   * Process message for sending
   * Returns sender view + receiver view
   * Non-blocking - heavy work in worker
   */
  const processMessage = useCallback(async (
    text: string,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<ChatMessageResult> => {
    const start = performance.now();
    const trimmed = normalizeUnicode(text.trim());

    if (!trimmed) {
      return {
        senderView: text,
        receiverView: text,
        originalText: text,
        wasTransliterated: false,
        wasTranslated: false,
        processingTime: 0,
      };
    }

    // Same language = no translation needed
    const sameLanguage = isSameLanguage(senderLanguage, receiverLanguage);

    try {
      if (isReady) {
        const result = await processChatMessage(trimmed, senderLanguage, receiverLanguage);
        return {
          ...result,
          processingTime: performance.now() - start,
        };
      }

      // Fallback: sync processing
      const isLatin = isLatinText(trimmed);
      const senderUsesLatin = isLatinScriptLanguage(senderLanguage);
      const receiverUsesLatin = isLatinScriptLanguage(receiverLanguage);

      let senderView = trimmed;
      let receiverView = trimmed;
      let wasTransliterated = false;

      // If sender uses non-Latin and text is Latin, transliterate for sender
      if (!senderUsesLatin && isLatin) {
        senderView = quickTransliterate(trimmed, senderLanguage);
        wasTransliterated = senderView !== trimmed;
      }

      // If same language
      if (sameLanguage) {
        if (!receiverUsesLatin && isLatin) {
          receiverView = quickTransliterate(trimmed, receiverLanguage);
        } else {
          receiverView = senderView;
        }
        return {
          senderView,
          receiverView,
          originalText: trimmed,
          wasTransliterated,
          wasTranslated: false,
          processingTime: performance.now() - start,
        };
      }

      // Different languages - translation would happen in worker
      // For now, return best effort
      return {
        senderView,
        receiverView: senderView, // Will be translated async
        originalText: trimmed,
        wasTransliterated,
        wasTranslated: false,
        processingTime: performance.now() - start,
      };
    } catch (err) {
      console.error('[RealtimeChatTranslation] Error:', err);
      return {
        senderView: trimmed,
        receiverView: trimmed,
        originalText: trimmed,
        wasTransliterated: false,
        wasTranslated: false,
        processingTime: performance.now() - start,
      };
    }
  }, [isReady]);

  /**
   * Translate text between languages (async, worker-based)
   */
  const translateText = useCallback(async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<{ text: string; success: boolean }> => {
    const trimmed = normalizeUnicode(text.trim());
    if (!trimmed) return { text, success: false };

    if (isSameLanguage(sourceLanguage, targetLanguage)) {
      return { text: trimmed, success: true };
    }

    try {
      if (isReady) {
        return await translate(trimmed, sourceLanguage, targetLanguage);
      }
      return { text: trimmed, success: false };
    } catch {
      return { text: trimmed, success: false };
    }
  }, [isReady]);

  /**
   * Clear all caches
   */
  const clearCaches = useCallback(() => {
    previewCache.clear();
    transliterationCache.clear();
    lastPreviewRef.current = { text: '', lang: '', result: '' };
  }, []);

  return {
    // Core functions
    getLivePreview,
    processMessage,
    translateText,
    autoDetectLanguage,

    // Utilities
    isLatinText,
    isLatinScriptLanguage,
    isSameLanguage,
    normalizeUnicode,
    clearCaches,

    // State
    isReady,
    isLoading,
    loadProgress,
    error,
  };
}

export default useRealtimeChatTranslation;

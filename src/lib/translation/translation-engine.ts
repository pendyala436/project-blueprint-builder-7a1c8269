/**
 * Embedded Translation Engine (DL-Translate Pattern)
 * 
 * Pure dictionary-based translation with optional ML fallback:
 * - Embedded phrase dictionaries (common phrases - instant)
 * - Transliteration dictionaries (phonetic → native script - instant)
 * - Phonetic transliterator (syllable-based - instant)
 * - Browser ML fallback (200+ languages, lazy-loaded, offline after first use)
 * 
 * Based on: 
 * - https://github.com/xhluca/dl-translate (API pattern)
 * - https://github.com/Goutam245/Language-Translator-Web-Application (pure JS)
 * - @huggingface/transformers (browser ML fallback)
 */

import { SCRIPT_PATTERNS, normalizeLanguage, isLatinScriptLanguage } from './language-codes';
import { detectLanguage, isLatinScript, isSameLanguage } from './language-detector';
import type { TranslationResult, TranslationOptions } from './types';
import { translateWithML as translateWithDictionary } from './ml-translation-engine';
import { phoneticTransliterate, isPhoneticTransliterationSupported } from './phonetic-transliterator';
import { translateWithBrowserML, isMLLanguageSupported } from './browser-ml-translator';

// Flag to enable/disable ML fallback (can be configured at runtime)
let enableMLFallback = true;

// Cache for translations
const translationCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Common phrases dictionary for accurate translation (expanded)
// Bidirectional: Both English key → Native AND Native key → English
const ROMANTIC_PHRASES: Record<string, Record<string, string>> = {
  // Greetings
  'hello': {
    hindi: 'नमस्ते', telugu: 'హలో', tamil: 'வணக்கம்', bengali: 'হ্যালো',
    marathi: 'नमस्कार', gujarati: 'નમસ્તે', kannada: 'ನಮಸ್ಕಾರ', malayalam: 'ഹലോ',
    punjabi: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', spanish: 'Hola', french: 'Bonjour', german: 'Hallo',
    arabic: 'مرحبا', chinese: '你好', japanese: 'こんにちは', korean: '안녕하세요',
    russian: 'Привет', portuguese: 'Olá', italian: 'Ciao', english: 'Hello',
  },
  'hi': {
    hindi: 'हाय', telugu: 'హాయ్', tamil: 'ஹாய்', bengali: 'হাই',
    marathi: 'हाय', gujarati: 'હાય', kannada: 'ಹಾಯ್', malayalam: 'ഹായ്',
    spanish: 'Hola', french: 'Salut', german: 'Hi', chinese: '嗨', japanese: 'やあ', english: 'Hi',
  },
  'good morning': {
    hindi: 'सुप्रभात', telugu: 'శుభోదయం', tamil: 'காலை வணக்கம்', bengali: 'সুপ্রভাত',
    marathi: 'शुभ प्रभात', gujarati: 'શુભ સવાર', kannada: 'ಶುಭೋದಯ', malayalam: 'സുപ്രഭാതം',
    punjabi: 'ਸ਼ੁਭ ਸਵੇਰ', spanish: 'Buenos días', french: 'Bonjour', german: 'Guten Morgen',
    arabic: 'صباح الخير', chinese: '早上好', japanese: 'おはようございます', korean: '좋은 아침', english: 'Good morning',
  },
  'good night': {
    hindi: 'शुभ रात्रि', telugu: 'శుభ రాత్రి', tamil: 'இனிய இரவு', bengali: 'শুভ রাত্রি',
    marathi: 'शुभ रात्री', gujarati: 'શુભ રાત્રિ', kannada: 'ಶುಭ ರಾತ್ರಿ', malayalam: 'ശുഭ രാത്രി',
    spanish: 'Buenas noches', french: 'Bonne nuit', german: 'Gute Nacht',
    arabic: 'تصبح على خير', chinese: '晚安', japanese: 'おやすみなさい', korean: '잘 자', english: 'Good night',
  },
  'good evening': {
    hindi: 'शुभ संध्या', telugu: 'శుభ సాయంత్రం', tamil: 'மாலை வணக்கம்', bengali: 'শুভ সন্ধ্যা',
    spanish: 'Buenas tardes', french: 'Bonsoir', german: 'Guten Abend', english: 'Good evening',
  },
  'goodbye': {
    hindi: 'अलविदा', telugu: 'వీడ్కోలు', tamil: 'பிரியாவிடை', bengali: 'বিদায়',
    spanish: 'Adiós', french: 'Au revoir', german: 'Auf Wiedersehen',
    chinese: '再见', japanese: 'さようなら', korean: '안녕히 가세요', english: 'Goodbye',
  },
  'bye': {
    hindi: 'बाय', telugu: 'బై', tamil: 'பை', bengali: 'বাই',
    spanish: 'Adiós', french: 'Salut', german: 'Tschüss', english: 'Bye',
  },
  // Common questions
  'how are you': {
    hindi: 'आप कैसे हैं', telugu: 'మీరు ఎలా ఉన్నారు', tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்',
    bengali: 'আপনি কেমন আছেন', marathi: 'तुम्ही कसे आहात', gujarati: 'તમે કેમ છો',
    kannada: 'ನೀವು ಹೇಗಿದ್ದೀರಿ', malayalam: 'സുഖമാണോ', punjabi: 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ',
    spanish: '¿Cómo estás?', french: 'Comment allez-vous?', german: 'Wie geht es dir?',
    arabic: 'كيف حالك', chinese: '你好吗', japanese: 'お元気ですか', korean: '어떻게 지내세요', english: 'How are you',
  },
  // Common romanized Hindi input (phonetic)
  'aap kaise ho': {
    hindi: 'आप कैसे हो', telugu: 'మీరు ఎలా ఉన్నారు', tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்',
    bengali: 'আপনি কেমন আছেন', marathi: 'तुम्ही कसे आहात', gujarati: 'તમે કેમ છો',
    kannada: 'ನೀವು ಹೇಗಿದ್ದೀರಿ', malayalam: 'സുഖമാണോ', punjabi: 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ',
    spanish: '¿Cómo estás?', french: 'Comment allez-vous?', german: 'Wie geht es dir?',
    arabic: 'كيف حالك', chinese: '你好吗', japanese: 'お元気ですか', korean: '어떻게 지내세요', english: 'How are you',
  },
  'what is your name': {
    hindi: 'आपका नाम क्या है', telugu: 'మీ పేరు ఏమిటి', tamil: 'உங்கள் பெயர் என்ன',
    bengali: 'আপনার নাম কি', spanish: '¿Cómo te llamas?', french: 'Comment vous appelez-vous?', english: 'What is your name',
  },
  'where are you from': {
    hindi: 'आप कहाँ से हैं', telugu: 'మీరు ఎక్కడ నుండి వచ్చారు', tamil: 'நீங்கள் எங்கிருந்து வருகிறீர்கள்',
    spanish: '¿De dónde eres?', french: 'D\'où venez-vous?', english: 'Where are you from',
  },
  // Responses
  'i am fine': {
    hindi: 'मैं ठीक हूं', telugu: 'నేను బాగున్నాను', tamil: 'நான் நலமாக இருக்கிறேன்',
    bengali: 'আমি ভালো আছি', spanish: 'Estoy bien', french: 'Je vais bien', english: 'I am fine',
  },
  'thank you': {
    hindi: 'धन्यवाद', telugu: 'ధన్యవాదాలు', tamil: 'நன்றி', bengali: 'ধন্যবাদ',
    marathi: 'धन्यवाद', gujarati: 'આભાર', kannada: 'ಧನ್ಯವಾದ', malayalam: 'നന്ദി',
    punjabi: 'ਧੰਨਵਾਦ', spanish: 'Gracias', french: 'Merci', german: 'Danke',
    arabic: 'شكرا', chinese: '谢谢', japanese: 'ありがとう', korean: '감사합니다', english: 'Thank you',
  },
  'thanks': {
    hindi: 'धन्यवाद', telugu: 'థాంక్స్', tamil: 'நன்றி', bengali: 'ধন্যবাদ',
    spanish: 'Gracias', french: 'Merci', german: 'Danke', english: 'Thanks',
  },
  'yes': {
    hindi: 'हाँ', telugu: 'అవును', tamil: 'ஆம்', bengali: 'হ্যাঁ',
    marathi: 'होय', gujarati: 'હા', kannada: 'ಹೌದು', malayalam: 'അതെ',
    spanish: 'Sí', french: 'Oui', german: 'Ja', arabic: 'نعم', chinese: '是', japanese: 'はい', english: 'Yes',
  },
  'no': {
    hindi: 'नहीं', telugu: 'లేదు', tamil: 'இல்லை', bengali: 'না',
    marathi: 'नाही', gujarati: 'ના', kannada: 'ಇಲ್ಲ', malayalam: 'ഇല്ല',
    spanish: 'No', french: 'Non', german: 'Nein', arabic: 'لا', chinese: '不', japanese: 'いいえ', english: 'No',
  },
  'ok': {
    hindi: 'ठीक है', telugu: 'సరే', tamil: 'சரி', bengali: 'ঠিক আছে',
    marathi: 'ठीक आहे', gujarati: 'ઠીક છે', spanish: 'Vale', french: "D'accord", english: 'OK',
  },
  'sorry': {
    hindi: 'माफ़ कीजिए', telugu: 'క్షమించండి', tamil: 'மன்னிக்கவும்', bengali: 'দুঃখিত',
    spanish: 'Lo siento', french: 'Désolé', german: 'Entschuldigung',
    arabic: 'آسف', chinese: '对不起', japanese: 'ごめんなさい', english: 'Sorry',
  },
  'please': {
    hindi: 'कृपया', telugu: 'దయచేసి', tamil: 'தயவுசெய்து', bengali: 'অনুগ্রহ করে',
    spanish: 'Por favor', french: "S'il vous plaît", german: 'Bitte', english: 'Please',
  },
  // Love & emotions
  'i love you': {
    hindi: 'मैं तुमसे प्यार करता हूं', telugu: 'నేను నిన్ను ప్రేమిస్తున్నాను',
    tamil: 'நான் உன்னை காதலிக்கிறேன்', bengali: 'আমি তোমাকে ভালোবাসি',
    marathi: 'मी तुझ्यावर प्रेम करतो', gujarati: 'હું તને પ્રેમ કરું છું',
    kannada: 'ನಾನು ನಿನ್ನನ್ನು ಪ್ರೀತಿಸುತ್ತೇನೆ', malayalam: 'ഞാൻ നിന്നെ സ്നേഹിക്കുന്നു',
    punjabi: 'ਮੈਂ ਤੈਨੂੰ ਪਿਆਰ ਕਰਦਾ ਹਾਂ', spanish: 'Te amo', french: "Je t'aime",
    german: 'Ich liebe dich', arabic: 'أنا أحبك', chinese: '我爱你',
    japanese: '愛してる', korean: '사랑해', russian: 'Я тебя люблю',
    portuguese: 'Eu te amo', italian: 'Ti amo', english: 'I love you',
  },
  'i miss you': {
    hindi: 'मुझे तुम्हारी याद आती है', telugu: 'నీవు లేకుండా నాకు బాధగా ఉంది',
    tamil: 'உன்னை நினைக்கிறேன்', bengali: 'তোমার জন্য মন খারাপ',
    spanish: 'Te extraño', french: 'Tu me manques', german: 'Ich vermisse dich',
    chinese: '我想你', japanese: '会いたい', korean: '보고 싶어', english: 'I miss you',
  },
  'i like you': {
    hindi: 'मुझे तुम पसंद हो', telugu: 'నాకు నువ్వు ఇష్టం', tamil: 'நான் உன்னை விரும்புகிறேன்',
    spanish: 'Me gustas', french: 'Je t\'aime bien', chinese: '我喜欢你', english: 'I like you',
  },
  // Common chat phrases
  'what are you doing': {
    hindi: 'तुम क्या कर रहे हो', telugu: 'ఏం చేస్తున్నావ్', tamil: 'என்ன செய்கிறாய்',
    bengali: 'তুমি কি করছ', spanish: '¿Qué estás haciendo?', french: 'Que fais-tu?', english: 'What are you doing',
  },
  'where are you': {
    hindi: 'तुम कहाँ हो', telugu: 'నువ్వు ఎక్కడ ఉన్నావ్', tamil: 'நீ எங்கே இருக்கிறாய்',
    spanish: '¿Dónde estás?', french: 'Où es-tu?', english: 'Where are you',
  },
  'see you later': {
    hindi: 'फिर मिलते हैं', telugu: 'తర్వాత కలుద్దాం', tamil: 'பிறகு சந்திப்போம்',
    spanish: 'Hasta luego', french: 'À plus tard', german: 'Bis später', english: 'See you later',
  },
  'take care': {
    hindi: 'अपना ख्याल रखना', telugu: 'జాగ్రత్తగా ఉండు', tamil: 'கவனமாக இரு',
    spanish: 'Cuídate', french: 'Prends soin de toi', english: 'Take care',
  },
  'nice to meet you': {
    hindi: 'आपसे मिलकर अच्छा लगा', telugu: 'మిమ్మల్ని కలిసినందుకు సంతోషం',
    tamil: 'உங்களை சந்தித்ததில் மகிழ்ச்சி', spanish: 'Encantado de conocerte',
    french: 'Enchanté', german: 'Freut mich', english: 'Nice to meet you',
  },
  // Native script keys for reverse lookup (receiver translation)
  'नमस्ते': { english: 'Hello', hindi: 'नमस्ते', telugu: 'హలో', tamil: 'வணக்கம்' },
  'హలో': { english: 'Hello', hindi: 'नमस्ते', telugu: 'హలో', tamil: 'வணக்கம்' },
  'வணக்கம்': { english: 'Hello', hindi: 'नमस्ते', telugu: 'హలో', tamil: 'வணக்கம்' },
  'धन्यवाद': { english: 'Thank you', hindi: 'धन्यवाद', telugu: 'ధన్యవాదాలు', tamil: 'நன்றி' },
  'ధన్యవాదాలు': { english: 'Thank you', hindi: 'धन्यवाद', telugu: 'ధన్యవాదాలు', tamil: 'நன்றி' },
  'நன்றி': { english: 'Thank you', hindi: 'धन्यवाद', telugu: 'ధన్యవాదాలు', tamil: 'நன்றி' },
  'आप कैसे हैं': { english: 'How are you', hindi: 'आप कैसे हैं', telugu: 'మీరు ఎలా ఉన్నారు', tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்' },
  'आप कैसे हो': {
    hindi: 'आप कैसे हो', telugu: 'మీరు ఎలా ఉన్నారు', tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்',
    bengali: 'আপনি কেমন আছেন', marathi: 'तुम्ही कसे आहात', gujarati: 'તમે કેમ છો',
    kannada: 'ನೀವು ಹೇಗಿದ್ದೀರಿ', malayalam: 'സുഖമാണോ', punjabi: 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ',
    spanish: '¿Cómo estás?', french: 'Comment allez-vous?', german: 'Wie geht es dir?',
    arabic: 'كيف حالك', chinese: '你好吗', japanese: 'お元気ですか', korean: '어떻게 지내세요', english: 'How are you',
  },
  'మీరు ఎలా ఉన్నారు': { english: 'How are you', hindi: 'आप कैसे हैं', telugu: 'మీరు ఎలా ఉన్నారు', tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்' },
  'मैं ठीक हूं': { english: 'I am fine', hindi: 'मैं ठीक हूं', telugu: 'నేను బాగున్నాను', tamil: 'நான் நலமாக இருக்கிறேன்' },
  'నేను బాగున్నాను': { english: 'I am fine', hindi: 'मैं ठीक हूं', telugu: 'నేను బాగున్నాను', tamil: 'நான் நலமாக இருக்கிறேன்' },
  'हाँ': { english: 'Yes', hindi: 'हाँ', telugu: 'అవును', tamil: 'ஆம்' },
  'అవును': { english: 'Yes', hindi: 'हाँ', telugu: 'అవును', tamil: 'ஆம்' },
  'नहीं': { english: 'No', hindi: 'नहीं', telugu: 'లేదు', tamil: 'இல்லை' },
  'లేదు': { english: 'No', hindi: 'नहीं', telugu: 'లేదు', tamil: 'இல்லை' },
  'ठीक है': { english: 'OK', hindi: 'ठीक है', telugu: 'సరే', tamil: 'சரி' },
  'సరే': { english: 'OK', hindi: 'ठीक है', telugu: 'సరే', tamil: 'சரி' },
};

// Transliteration dictionary for common words
const TRANSLITERATION_MAP: Record<string, Record<string, string>> = {
  hindi: {
    namaste: 'नमस्ते', namaskar: 'नमस्कार', dhanyavad: 'धन्यवाद',
    pyar: 'प्यार', dil: 'दिल', mohabbat: 'मोहब्बत', ishq: 'इश्क',
    khush: 'खुश', acha: 'अच्छा', theek: 'ठीक', haan: 'हाँ', nahi: 'नहीं',
    kya: 'क्या', kaise: 'कैसे', kab: 'कब', kahan: 'कहाँ', kyun: 'क्यों',
    aap: 'आप', tum: 'तुम', main: 'मैं', hum: 'हम', wo: 'वो',
    subah: 'सुबह', shaam: 'शाम', raat: 'रात', din: 'दिन',
    shukriya: 'शुक्रिया', hello: 'हैलो', hi: 'हाय', bye: 'बाय', ok: 'ओके',
    yes: 'हाँ', no: 'नहीं', what: 'क्या', why: 'क्यों',
    love: 'प्यार', miss: 'याद', happy: 'खुश', sad: 'उदास',
    good: 'अच्छा', bad: 'बुरा', beautiful: 'सुंदर', cute: 'क्यूट',
    friend: 'दोस्त', brother: 'भाई', bhai: 'भाई', sister: 'बहन', behen: 'बहन',
    mother: 'माँ', maa: 'माँ', father: 'पापा', papa: 'पापा',
    bahut: 'बहुत', thoda: 'थोड़ा', abhi: 'अभी', kal: 'कल', aaj: 'आज',
    // Multi-word phrases (quoted keys)
    'kaise ho': 'कैसे हो', 'kaisa hai': 'कैसा है', 'theek hoon': 'ठीक हूँ',
    'bahut accha': 'बहुत अच्छा', 'maaf karo': 'माफ करो',
  },
  telugu: {
    namaste: 'నమస్తే', namaskar: 'నమస్కారం', dhanyavad: 'ధన్యవాదాలు',
    prema: 'ప్రేమ', priya: 'ప్రియ', snehithudu: 'స్నేహితుడు',
    manchidi: 'మంచిది', avunu: 'అవును', ledu: 'లేదు',
    ela: 'ఎలా', emi: 'ఏమి', eppudu: 'ఎప్పుడు', ekkada: 'ఎక్కడ',
    nenu: 'నేను', nuvvu: 'నువ్వు', meeru: 'మీరు',
    bagunnava: 'బాగున్నావా', bagunnanu: 'బాగున్నాను', bagundi: 'బాగుంది',
    subhodayam: 'శుభోదయం', subharatri: 'శుభరాత్రి',
    thanks: 'ధన్యవాదాలు', sorry: 'క్షమించండి', please: 'దయచేసి',
    hello: 'హలో', hi: 'హాయ్', bye: 'బై', ok: 'సరే',
    yes: 'అవును', no: 'లేదు', what: 'ఏమిటి', why: 'ఎందుకు',
    love: 'ప్రేమ', miss: 'మిస్సు', happy: 'సంతోషం', sad: 'బాధ',
    good: 'మంచి', bad: 'చెడు', beautiful: 'అందమైన', cute: 'క్యూట్',
    friend: 'స్నేహితుడు', brother: 'అన్నయ్య', sister: 'అక్క',
    mother: 'అమ్మ', father: 'నాన్న', amma: 'అమ్మ', nanna: 'నాన్న',
    chala: 'చాలా', konchem: 'కొంచెం', inka: 'ఇంకా',
    // Multi-word phrases (quoted keys)
    'nenu bagunnanu': 'నేను బాగున్నాను', 'ela unnav': 'ఎలా ఉన్నావ్',
    'ela unnaru': 'ఎలా ఉన్నారు',
  },
  tamil: {
    vanakkam: 'வணக்கம்', nandri: 'நன்றி', anbu: 'அன்பு',
    kadhal: 'காதல்', nalla: 'நல்ல', aama: 'ஆமா', illa: 'இல்ல',
    eppadi: 'எப்படி', enna: 'என்ன', eppo: 'எப்போ', enga: 'எங்கே',
    naan: 'நான்', nee: 'நீ', neengal: 'நீங்கள்',
  },
  bengali: {
    namaskar: 'নমস্কার', dhonnobad: 'ধন্যবাদ', bhalobashi: 'ভালোবাসি',
    bhalo: 'ভালো', haan: 'হ্যাঁ', na: 'না',
    kemon: 'কেমন', ki: 'কি', kokhon: 'কখন', kothay: 'কোথায়',
    ami: 'আমি', tumi: 'তুমি', apni: 'আপনি',
  },
  arabic: {
    marhaba: 'مرحبا', shukran: 'شكرا', habibi: 'حبيبي',
    ahlan: 'أهلاً', naam: 'نعم', la: 'لا',
    kayf: 'كيف', mata: 'متى', ayna: 'أين',
    ana: 'أنا', anta: 'أنت', huwa: 'هو',
  },
};

/**
 * Check and return phrase from dictionary
 * Supports both lowercase English and native script keys
 */
function checkPhraseDictionary(text: string, targetLanguage: string): string | null {
  const trimmed = text.trim();
  const lowerText = trimmed.toLowerCase();
  const normTarget = normalizeLanguage(targetLanguage);

  // Also try punctuation-stripped keys so inputs like "how are you?" and "आप कैसे हो?" match.
  const cleanedLower = lowerText
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanedExact = trimmed
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  const candidates: string[] = [lowerText, trimmed];
  if (cleanedLower && cleanedLower !== lowerText) candidates.push(cleanedLower);
  if (cleanedExact && cleanedExact !== trimmed) candidates.push(cleanedExact);

  for (const key of candidates) {
    const entry = ROMANTIC_PHRASES[key];
    if (entry?.[normTarget]) return entry[normTarget];
  }

  return null;
}

/**
 * Check and return transliteration from dictionary
 */
function checkTransliterationDictionary(text: string, targetLanguage: string): string | null {
  const trimmed = text.trim();
  const lowerText = trimmed.toLowerCase();
  const normTarget = normalizeLanguage(targetLanguage);
  const langMap = TRANSLITERATION_MAP[normTarget];

  if (!langMap) return null;

  // Exact match (fast path)
  if (langMap[lowerText]) {
    return langMap[lowerText];
  }

  // Whole-string match but ignore punctuation (e.g. "kaise ho?" → "kaise ho")
  const cleanedWhole = lowerText
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanedWhole && cleanedWhole !== lowerText && langMap[cleanedWhole]) {
    const trailing = trimmed.match(/[^\p{L}\p{N}\s]+$/u)?.[0] ?? '';
    return `${langMap[cleanedWhole]}${trailing}`;
  }

  // Token-based transliteration with punctuation preservation.
  // Handles: "Aap kaise ho?" => "आप कैसे हो?"
  const tokens = trimmed.split(/\s+/).map(t => t.toLowerCase());

  const parsed = tokens.map(tok => {
    const m = tok.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}]+)([^\p{L}\p{N}]*)$/u);
    if (!m) return { prefix: '', core: tok, suffix: '', raw: tok, hasCore: false };
    return { prefix: m[1], core: m[2], suffix: m[3], raw: tok, hasCore: true };
  });

  let changed = false;
  const maxPhraseLen = 3;
  const out: string[] = [];

  for (let i = 0; i < parsed.length; ) {
    const current = parsed[i];

    if (!current.hasCore) {
      out.push(current.raw);
      i += 1;
      continue;
    }

    let matched = false;

    for (let len = Math.min(maxPhraseLen, parsed.length - i); len >= 2; len--) {
      const window = parsed.slice(i, i + len);
      if (window.some(w => !w.hasCore)) continue;

      const key = window.map(w => w.core).join(' ');
      const phrase = langMap[key];

      if (phrase) {
        out.push(`${window[0].prefix}${phrase}${window[window.length - 1].suffix}`);
        changed = true;
        i += len;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const mapped = langMap[current.core] || current.core;
    if (mapped !== current.core) changed = true;
    out.push(`${current.prefix}${mapped}${current.suffix}`);
    i += 1;
  }

  if (!changed) return null;
  return out.join(' ');
}

/**
 * Get from cache
 */
function getFromCache(key: string): string | null {
  const cached = translationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  if (cached) {
    translationCache.delete(key);
  }
  return null;
}

/**
 * Add to cache
 */
function addToCache(key: string, result: string): void {
  translationCache.set(key, { result, timestamp: Date.now() });
  
  // Limit cache size
  if (translationCache.size > 500) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
}

/**
 * Convert Latin text to native script using embedded dictionary + phonetic fallback
 */
function convertWithDictionary(text: string, targetLanguage: string): string {
  console.log('[DL-Translate] convertWithDictionary:', { text: text.slice(0, 30), target: targetLanguage });
  
  // First check transliteration dictionary (exact word matches)
  const dictResult = checkTransliterationDictionary(text, targetLanguage);
  if (dictResult) {
    console.log('[DL-Translate] Transliteration match:', dictResult);
    return dictResult;
  }
  
  // Check phrase dictionary (common phrases)
  const phraseResult = checkPhraseDictionary(text, targetLanguage);
  if (phraseResult) {
    console.log('[DL-Translate] Phrase match:', phraseResult);
    return phraseResult;
  }
  
  // Fallback to phonetic transliteration for Indian languages
  // This handles arbitrary text like "emi chesthunnavu" → "ఏమి చేస్తున్నావు"
  if (isPhoneticTransliterationSupported(targetLanguage)) {
    const phoneticResult = phoneticTransliterate(text, targetLanguage);
    if (phoneticResult && phoneticResult !== text) {
      console.log('[DL-Translate] Phonetic transliteration:', phoneticResult);
      return phoneticResult;
    }
  }
  
  console.log('[DL-Translate] No dictionary/phonetic match found');
  return text;
}

/**
 * Main translation function - FULLY EMBEDDED (NO external APIs)
 * 
 * Flow:
 * 1. Same language check → skip all processing
 * 2. Check cache first (instant)
 * 3. Check phrase dictionary (common phrases - instant)
 * 4. DL-Translate Dictionary (MAIN - instant, word-by-word)
 * 5. Phonetic transliteration (instant)
 * 6. NLLB-200 ML Model (FALLBACK - 200+ languages, lazy-loaded)
 * 
 * Translation is NON-BLOCKING for typing
 * Based on: https://github.com/Goutam245/Language-Translator-Web-Application
 */
export async function translateText(
  text: string,
  options: TranslationOptions
): Promise<TranslationResult> {
  const { sourceLanguage, targetLanguage, mode = 'auto' } = options;
  const trimmed = text.trim();
  
  if (!trimmed) {
    return createResult(text, text, 'unknown', targetLanguage, false, 'translate');
  }
  
  // Detect source language if not provided
  const detected = detectLanguage(trimmed);
  const effectiveSource = sourceLanguage || detected.language;
  const normSource = normalizeLanguage(effectiveSource);
  const normTarget = normalizeLanguage(targetLanguage);
  
  console.log('[DL-Translate] translateText called:', { 
    text: trimmed.slice(0, 50), 
    from: normSource, 
    to: normTarget,
    mode,
    isLatin: isLatinScript(trimmed)
  });
  
  // ========== SAME LANGUAGE CHECK (CRITICAL) ==========
  if (isSameLanguage(normSource, normTarget)) {
    console.log('[DL-Translate] ✓ Same language detected - skipping translation');
    return createResult(trimmed, trimmed, normSource, normTarget, false, 'same_language');
  }
  
  // Check cache
  const cacheKey = `${trimmed}|${normSource}|${normTarget}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[DL-Translate] Cache hit');
    return createResult(trimmed, cached, normSource, normTarget, true, 'translate');
  }
  
  // ========== MAIN: Phrase Dictionary (instant) ==========
  const phraseResult = checkPhraseDictionary(trimmed, normTarget);
  if (phraseResult) {
    console.log('[DL-Translate] Phrase dictionary match:', phraseResult);
    addToCache(cacheKey, phraseResult);
    return createResult(trimmed, phraseResult, normSource, normTarget, true, 'translate');
  }
  
  // Determine if conversion mode (Latin input to non-Latin target)
  const isConvertMode = mode === 'convert' || 
    (mode === 'auto' && isLatinScript(trimmed) && !isLatinScriptLanguage(normTarget));
  
  if (isConvertMode) {
    // For conversion, use dictionary-based transliteration (instant)
    const converted = convertWithDictionary(trimmed, normTarget);
    if (converted !== trimmed) {
      console.log('[DL-Translate] Dictionary conversion:', converted);
      addToCache(cacheKey, converted);
      return createResult(trimmed, converted, normSource, normTarget, true, 'convert');
    }
  }
  
  // ========== MAIN: DL-Translate Dictionary Translation (instant) ==========
  console.log('[DL-Translate] Using dictionary translation (main)...');
  const translated = await translateWithDictionary(trimmed, normSource, normTarget);
  if (translated && translated !== trimmed) {
    console.log('[DL-Translate] Dictionary translation result:', translated.slice(0, 50));
    addToCache(cacheKey, translated);
    return createResult(trimmed, translated, normSource, normTarget, true, 'translate');
  }
  
  // ========== Dictionary-based Conversion ==========
  const dictResult = convertWithDictionary(trimmed, normTarget);
  if (dictResult !== trimmed) {
    console.log('[DL-Translate] Dictionary conversion:', dictResult.slice(0, 50));
    addToCache(cacheKey, dictResult);
    return createResult(trimmed, dictResult, normSource, normTarget, true, 'translate');
  }
  
  // ========== Reverse Dictionary Lookup ==========
  const reversePhraseResult = checkPhraseDictionary(trimmed, normSource);
  if (reversePhraseResult) {
    const targetPhrase = checkPhraseDictionary(reversePhraseResult.toLowerCase(), normTarget);
    if (targetPhrase) {
      console.log('[DL-Translate] Reverse dictionary match:', targetPhrase);
      addToCache(cacheKey, targetPhrase);
      return createResult(trimmed, targetPhrase, normSource, normTarget, true, 'translate');
    }
  }
  
  // ========== FALLBACK: NLLB-200 ML Model (200+ languages) ==========
  // Only used when dictionary fails - downloads ~300MB model on first use
  if (enableMLFallback && isMLLanguageSupported(normSource) && isMLLanguageSupported(normTarget)) {
    console.log('[DL-Translate] Fallback: Using NLLB-200 ML model...');
    try {
      const mlResult = await translateWithBrowserML(trimmed, normSource, normTarget);
      if (mlResult && mlResult !== trimmed) {
        console.log('[DL-Translate] ML fallback success:', mlResult.slice(0, 50));
        addToCache(cacheKey, mlResult);
        return createResult(trimmed, mlResult, normSource, normTarget, true, 'translate');
      }
    } catch (error) {
      console.log('[DL-Translate] ML fallback failed:', error);
    }
  }
  
  console.log('[DL-Translate] No translation available, returning original');
  return createResult(trimmed, trimmed, normSource, normTarget, false, 'translate');
}

/**
 * Enable or disable ML fallback translation
 * ML fallback downloads a ~300MB model on first use
 */
export function setMLFallbackEnabled(enabled: boolean): void {
  enableMLFallback = enabled;
  console.log(`[DL-Translate] ML fallback ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if ML fallback is enabled
 */
export function isMLFallbackEnabled(): boolean {
  return enableMLFallback;
}

/**
 * Convert Latin text to native script
 */
export async function convertToNativeScript(
  text: string,
  targetLanguage: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  console.log('[DL-Translate] convertToNativeScript called:', {
    text: trimmed.slice(0, 50),
    target: targetLanguage,
    isLatin: isLatinScript(trimmed)
  });
  
  // Already non-Latin, no conversion needed
  if (!isLatinScript(trimmed)) {
    console.log('[DL-Translate] Already non-Latin, returning as-is');
    return trimmed;
  }
  
  const normTarget = normalizeLanguage(targetLanguage);
  console.log('[DL-Translate] Normalized target:', normTarget);
  
  // If target uses Latin script, translate instead
  if (isLatinScriptLanguage(normTarget)) {
    const result = await translateText(trimmed, {
      sourceLanguage: 'english',
      targetLanguage: normTarget,
      mode: 'translate'
    });
    return result.translatedText;
  }
  
  // Check dictionary first (common phrases and words)
  const dictResult = convertWithDictionary(trimmed, normTarget);
  if (dictResult !== trimmed) {
    console.log('[DL-Translate] Dictionary/phonetic result:', dictResult);
    return dictResult;
  }
  
  // As a final fallback, try phonetic transliteration directly
  if (isPhoneticTransliterationSupported(normTarget)) {
    const phoneticResult = phoneticTransliterate(trimmed, normTarget);
    if (phoneticResult && phoneticResult !== trimmed) {
      console.log('[DL-Translate] Direct phonetic result:', phoneticResult);
      return phoneticResult;
    }
  }
  
  // Try translation APIs for script conversion
  const result = await translateText(trimmed, {
    sourceLanguage: 'english',
    targetLanguage: normTarget,
    mode: 'convert'
  });
  
  return result.translatedText;
}

/**
 * Batch translate multiple texts
 */
export async function translateBatch(
  items: Array<{ text: string; targetLanguage: string; sourceLanguage?: string }>
): Promise<TranslationResult[]> {
  const results = await Promise.allSettled(
    items.map(item =>
      translateText(item.text, {
        sourceLanguage: item.sourceLanguage,
        targetLanguage: item.targetLanguage,
      })
    )
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return createResult(
      items[index].text,
      items[index].text,
      items[index].sourceLanguage || 'unknown',
      items[index].targetLanguage,
      false,
      'translate'
    );
  });
}

/**
 * Clear translation cache
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number } {
  return { size: translationCache.size };
}

// Helper function to create result
function createResult(
  original: string,
  translated: string,
  sourceLang: string,
  targetLang: string,
  isTranslated: boolean,
  mode: 'translate' | 'convert' | 'same_language'
): TranslationResult {
  return {
    translatedText: translated,
    originalText: original,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    isTranslated,
    mode
  };
}

// Re-export utilities
export { detectLanguage, isLatinScript, isSameLanguage, normalizeLanguage };

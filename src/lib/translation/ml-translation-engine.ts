/**
 * Dictionary-Based Translation Engine
 * 
 * Pure browser-based translation:
 * - Comprehensive bidirectional translation dictionaries
 * - Character-level transliteration for native scripts
 * - Phonetic transliteration for long messages
 * - Instant translations (no loading required)
 * - 200+ language codes supported
 * 
 * For ML translation, see: src/lib/translation/dl-translate-api.ts
 * (Uses HuggingFace DL-Translate Space)
 */

import { phoneticTransliterate, isPhoneticTransliterationSupported } from './phonetic-transliterator';

// ================== LANGUAGE CODES (DL-TRANSLATE PATTERN) ==================
export const DL_TRANSLATE_LANGUAGE_CODES: Record<string, string> = {
  // Indian Languages
  hindi: 'hi', bengali: 'bn', telugu: 'te', tamil: 'ta',
  marathi: 'mr', gujarati: 'gu', kannada: 'kn', malayalam: 'ml',
  punjabi: 'pa', odia: 'or', oriya: 'or', urdu: 'ur',
  assamese: 'as', nepali: 'ne', sinhala: 'si', sinhalese: 'si',
  kashmiri: 'ks', konkani: 'kok', maithili: 'mai', santali: 'sat',
  sindhi: 'sd', dogri: 'doi', manipuri: 'mni', bodo: 'brx',
  
  // European Languages
  english: 'en', spanish: 'es', french: 'fr', german: 'de',
  portuguese: 'pt', italian: 'it', dutch: 'nl', russian: 'ru',
  polish: 'pl', ukrainian: 'uk', greek: 'el', czech: 'cs',
  romanian: 'ro', hungarian: 'hu', swedish: 'sv', danish: 'da',
  finnish: 'fi', norwegian: 'no', croatian: 'hr', serbian: 'sr',
  bosnian: 'bs', slovak: 'sk', slovenian: 'sl', bulgarian: 'bg',
  lithuanian: 'lt', latvian: 'lv', estonian: 'et', icelandic: 'is',
  catalan: 'ca', galician: 'gl', basque: 'eu', welsh: 'cy',
  irish: 'ga', scottish: 'gd', albanian: 'sq', macedonian: 'mk',
  maltese: 'mt', luxembourgish: 'lb', belarusian: 'be',
  
  // Asian Languages
  chinese: 'zh', mandarin: 'zh', cantonese: 'yue', japanese: 'ja',
  korean: 'ko', vietnamese: 'vi', thai: 'th', indonesian: 'id',
  malay: 'ms', tagalog: 'tl', filipino: 'fil', burmese: 'my',
  khmer: 'km', cambodian: 'km', lao: 'lo', laotian: 'lo',
  javanese: 'jv', sundanese: 'su', cebuano: 'ceb', tibetan: 'bo',
  
  // Middle Eastern Languages
  arabic: 'ar', hebrew: 'he', persian: 'fa', farsi: 'fa',
  turkish: 'tr', pashto: 'ps', dari: 'prs', kurdish: 'ku',
  
  // African Languages
  swahili: 'sw', afrikaans: 'af', amharic: 'am', yoruba: 'yo',
  igbo: 'ig', zulu: 'zu', xhosa: 'xh', somali: 'so', hausa: 'ha',
  
  // Central Asian Languages
  kazakh: 'kk', uzbek: 'uz', tajik: 'tg', kyrgyz: 'ky',
  turkmen: 'tk', mongolian: 'mn', tatar: 'tt',
  
  // Pacific Languages
  maori: 'mi', hawaiian: 'haw', samoan: 'sm', tongan: 'to', fijian: 'fj',
  
  // Constructed Languages
  esperanto: 'eo', latin: 'la', sanskrit: 'sa',
};

// Aliases for backward compatibility
export const LANGUAGE_CODES = DL_TRANSLATE_LANGUAGE_CODES;

// ================== COMPREHENSIVE TRANSLATION DICTIONARY ==================
// Based on Language-Translator-Web-Application pure JS pattern
// Bidirectional: English ↔ All languages

const DICTIONARY: Record<string, Record<string, string>> = {
  // ===== GREETINGS =====
  'hello': {
    hi: 'नमस्ते', te: 'హలో', ta: 'வணக்கம்', bn: 'হ্যালো', mr: 'नमस्कार',
    gu: 'નમસ્તે', kn: 'ನಮಸ್ಕಾರ', ml: 'ഹലോ', pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
    es: 'Hola', fr: 'Bonjour', de: 'Hallo', ar: 'مرحبا', zh: '你好',
    ja: 'こんにちは', ko: '안녕하세요', ru: 'Привет', pt: 'Olá', it: 'Ciao',
    ur: 'ہیلو', tr: 'Merhaba', vi: 'Xin chào', th: 'สวัสดี', id: 'Halo',
    sw: 'Habari', nl: 'Hallo', pl: 'Cześć', uk: 'Привіт', el: 'Γεια σου', en: 'Hello',
  },
  'hi': {
    hi: 'हाय', te: 'హాయ్', ta: 'ஹாய்', bn: 'হাই', mr: 'हाय',
    gu: 'હાય', kn: 'ಹಾಯ್', ml: 'ഹായ്', es: 'Hola', fr: 'Salut',
    de: 'Hi', zh: '嗨', ja: 'やあ', ko: '안녕', en: 'Hi',
  },
  'good morning': {
    hi: 'सुप्रभात', te: 'శుభోదయం', ta: 'காலை வணக்கம்', bn: 'সুপ্রভাত',
    mr: 'शुभ प्रभात', gu: 'શુભ સવાર', kn: 'ಶುಭೋದಯ', ml: 'സുപ്രഭാതം',
    pa: 'ਸ਼ੁਭ ਸਵੇਰ', es: 'Buenos días', fr: 'Bonjour', de: 'Guten Morgen',
    ar: 'صباح الخير', zh: '早上好', ja: 'おはようございます', ko: '좋은 아침',
    ru: 'Доброе утро', pt: 'Bom dia', it: 'Buongiorno', en: 'Good morning',
  },
  'good night': {
    hi: 'शुभ रात्रि', te: 'శుభ రాత్రి', ta: 'இனிய இரவு', bn: 'শুভ রাত্রি',
    mr: 'शुभ रात्री', gu: 'શુભ રાત્રિ', kn: 'ಶುಭ ರಾತ್ರಿ', ml: 'ശുഭ രാത്രി',
    es: 'Buenas noches', fr: 'Bonne nuit', de: 'Gute Nacht',
    ar: 'تصبح على خير', zh: '晚安', ja: 'おやすみなさい', ko: '잘 자', en: 'Good night',
  },
  'good evening': {
    hi: 'शुभ संध्या', te: 'శుభ సాయంత్రం', ta: 'மாலை வணக்கம்', bn: 'শুভ সন্ধ্যা',
    es: 'Buenas tardes', fr: 'Bonsoir', de: 'Guten Abend',
    zh: '晚上好', ja: 'こんばんは', ko: '좋은 저녁', en: 'Good evening',
  },
  'good afternoon': {
    hi: 'शुभ दोपहर', te: 'శుభ మధ్యాహ్నం', ta: 'மதிய வணக்கம்',
    es: 'Buenas tardes', fr: 'Bon après-midi', de: 'Guten Tag', en: 'Good afternoon',
  },
  'goodbye': {
    hi: 'अलविदा', te: 'వీడ్కోలు', ta: 'பிரியாவிடை', bn: 'বিদায়',
    es: 'Adiós', fr: 'Au revoir', de: 'Auf Wiedersehen',
    zh: '再见', ja: 'さようなら', ko: '안녕히 가세요', en: 'Goodbye',
  },
  'bye': {
    hi: 'बाय', te: 'బై', ta: 'பை', bn: 'বাই',
    es: 'Adiós', fr: 'Salut', de: 'Tschüss', en: 'Bye',
  },
  'welcome': {
    hi: 'स्वागत है', te: 'స్వాగతం', ta: 'வரவேற்கிறேன்', bn: 'স্বাগতম',
    es: 'Bienvenido', fr: 'Bienvenue', de: 'Willkommen', en: 'Welcome',
  },

  // ===== COMMON QUESTIONS =====
  'how are you': {
    hi: 'आप कैसे हैं', te: 'మీరు ఎలా ఉన్నారు', ta: 'நீங்கள் எப்படி இருக்கிறீர்கள்',
    bn: 'আপনি কেমন আছেন', mr: 'तुम्ही कसे आहात', gu: 'તમે કેમ છો',
    kn: 'ನೀವು ಹೇಗಿದ್ದೀರಿ', ml: 'സുഖമാണോ', pa: 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ',
    es: '¿Cómo estás?', fr: 'Comment allez-vous?', de: 'Wie geht es dir?',
    ar: 'كيف حالك', zh: '你好吗', ja: 'お元気ですか', ko: '어떻게 지내세요', en: 'How are you',
  },
  'what is your name': {
    hi: 'आपका नाम क्या है', te: 'మీ పేరు ఏమిటి', ta: 'உங்கள் பெயர் என்ன',
    bn: 'আপনার নাম কি', es: '¿Cómo te llamas?', fr: 'Comment vous appelez-vous?',
    de: 'Wie heißt du?', zh: '你叫什么名字', ja: 'お名前は何ですか', en: 'What is your name',
  },
  'where are you from': {
    hi: 'आप कहाँ से हैं', te: 'మీరు ఎక్కడ నుండి వచ్చారు', ta: 'நீங்கள் எங்கிருந்து வருகிறீர்கள்',
    es: '¿De dónde eres?', fr: "D'où venez-vous?", de: 'Woher kommst du?', en: 'Where are you from',
  },
  'what are you doing': {
    hi: 'तुम क्या कर रहे हो', te: 'ఏం చేస్తున్నావ్', ta: 'என்ன செய்கிறாய்',
    bn: 'তুমি কি করছ', es: '¿Qué estás haciendo?', fr: 'Que fais-tu?', en: 'What are you doing',
  },
  'where are you': {
    hi: 'तुम कहाँ हो', te: 'నువ్వు ఎక్కడ ఉన్నావ్', ta: 'நீ எங்கே இருக்கிறாய்',
    es: '¿Dónde estás?', fr: 'Où es-tu?', en: 'Where are you',
  },
  'what time is it': {
    hi: 'क्या समय हुआ है', te: 'ఎంత సమయం అయింది', ta: 'என்ன நேரம்',
    es: '¿Qué hora es?', fr: 'Quelle heure est-il?', de: 'Wie spät ist es?', en: 'What time is it',
  },

  // ===== RESPONSES & EXPRESSIONS =====
  'i am fine': {
    hi: 'मैं ठीक हूं', te: 'నేను బాగున్నాను', ta: 'நான் நலமாக இருக்கிறேன்',
    bn: 'আমি ভালো আছি', es: 'Estoy bien', fr: 'Je vais bien',
    de: 'Mir geht es gut', zh: '我很好', ja: '元気です', en: 'I am fine',
  },
  'thank you': {
    hi: 'धन्यवाद', te: 'ధన్యవాదాలు', ta: 'நன்றி', bn: 'ধন্যবাদ',
    mr: 'धन्यवाद', gu: 'આભાર', kn: 'ಧನ್ಯವಾದ', ml: 'നന്ദി',
    pa: 'ਧੰਨਵਾਦ', es: 'Gracias', fr: 'Merci', de: 'Danke',
    ar: 'شكرا', zh: '谢谢', ja: 'ありがとう', ko: '감사합니다', en: 'Thank you',
  },
  'thanks': {
    hi: 'धन्यवाद', te: 'థాంక్స్', ta: 'நன்றி', bn: 'ধন্যবাদ',
    es: 'Gracias', fr: 'Merci', de: 'Danke', en: 'Thanks',
  },
  'you are welcome': {
    hi: 'आपका स्वागत है', te: 'మీకు స్వాగతం', ta: 'நீங்கள் வரவேற்கப்படுகிறீர்கள்',
    es: 'De nada', fr: 'De rien', de: 'Bitte schön', en: 'You are welcome',
  },
  'yes': {
    hi: 'हाँ', te: 'అవును', ta: 'ஆம்', bn: 'হ্যাঁ',
    mr: 'होय', gu: 'હા', kn: 'ಹೌದು', ml: 'അതെ',
    es: 'Sí', fr: 'Oui', de: 'Ja', ar: 'نعم', zh: '是', ja: 'はい', en: 'Yes',
  },
  'no': {
    hi: 'नहीं', te: 'లేదు', ta: 'இல்லை', bn: 'না',
    mr: 'नाही', gu: 'ના', kn: 'ಇಲ್ಲ', ml: 'ഇല്ല',
    es: 'No', fr: 'Non', de: 'Nein', ar: 'لا', zh: '不', ja: 'いいえ', en: 'No',
  },
  'ok': {
    hi: 'ठीक है', te: 'సరే', ta: 'சரி', bn: 'ঠিক আছে',
    mr: 'ठीक आहे', gu: 'ઠીક છે', es: 'Vale', fr: "D'accord", de: 'Okay', en: 'OK',
  },
  'okay': {
    hi: 'ठीक है', te: 'సరే', ta: 'சரி', bn: 'ঠিক আছে',
    es: 'Bueno', fr: "D'accord", de: 'In Ordnung', en: 'Okay',
  },
  'sorry': {
    hi: 'माफ़ कीजिए', te: 'క్షమించండి', ta: 'மன்னிக்கவும்', bn: 'দুঃখিত',
    es: 'Lo siento', fr: 'Désolé', de: 'Entschuldigung',
    ar: 'آسف', zh: '对不起', ja: 'ごめんなさい', ko: '미안해요', en: 'Sorry',
  },
  'please': {
    hi: 'कृपया', te: 'దయచేసి', ta: 'தயவுசெய்து', bn: 'অনুগ্রহ করে',
    es: 'Por favor', fr: "S'il vous plaît", de: 'Bitte', en: 'Please',
  },
  'excuse me': {
    hi: 'क्षमा कीजिए', te: 'క్షమించండి', ta: 'மன்னிக்கவும்',
    es: 'Disculpe', fr: 'Excusez-moi', de: 'Entschuldigung', en: 'Excuse me',
  },

  // ===== LOVE & EMOTIONS =====
  'i love you': {
    hi: 'मैं तुमसे प्यार करता हूं', te: 'నేను నిన్ను ప్రేమిస్తున్నాను',
    ta: 'நான் உன்னை காதலிக்கிறேன்', bn: 'আমি তোমাকে ভালোবাসি',
    mr: 'मी तुझ्यावर प्रेम करतो', gu: 'હું તને પ્રેમ કરું છું',
    kn: 'ನಾನು ನಿನ್ನನ್ನು ಪ್ರೀತಿಸುತ್ತೇನೆ', ml: 'ഞാൻ നിന്നെ സ്നേഹിക്കുന്നു',
    pa: 'ਮੈਂ ਤੈਨੂੰ ਪਿਆਰ ਕਰਦਾ ਹਾਂ', es: 'Te amo', fr: "Je t'aime",
    de: 'Ich liebe dich', ar: 'أنا أحبك', zh: '我爱你',
    ja: '愛してる', ko: '사랑해', ru: 'Я тебя люблю',
    pt: 'Eu te amo', it: 'Ti amo', en: 'I love you',
  },
  'i miss you': {
    hi: 'मुझे तुम्हारी याद आती है', te: 'నీవు లేకుండా నాకు బాధగా ఉంది',
    ta: 'உன்னை நினைக்கிறேன்', bn: 'তোমার জন্য মন খারাপ',
    es: 'Te extraño', fr: 'Tu me manques', de: 'Ich vermisse dich',
    zh: '我想你', ja: '会いたい', ko: '보고 싶어', en: 'I miss you',
  },
  'i like you': {
    hi: 'मुझे तुम पसंद हो', te: 'నాకు నువ్వు ఇష్టం', ta: 'நான் உன்னை விரும்புகிறேன்',
    es: 'Me gustas', fr: "Je t'aime bien", zh: '我喜欢你', en: 'I like you',
  },
  'happy': {
    hi: 'खुश', te: 'సంతోషం', ta: 'மகிழ்ச்சி', bn: 'সুখী',
    es: 'Feliz', fr: 'Heureux', de: 'Glücklich', zh: '快乐', ja: '幸せ', en: 'Happy',
  },
  'sad': {
    hi: 'उदास', te: 'బాధ', ta: 'சோகம்', bn: 'দুঃখিত',
    es: 'Triste', fr: 'Triste', de: 'Traurig', zh: '悲伤', ja: '悲しい', en: 'Sad',
  },
  'beautiful': {
    hi: 'सुंदर', te: 'అందమైన', ta: 'அழகான', bn: 'সুন্দর',
    es: 'Hermoso', fr: 'Beau', de: 'Schön', zh: '美丽', ja: '美しい', en: 'Beautiful',
  },
  'good': {
    hi: 'अच्छा', te: 'మంచి', ta: 'நல்ல', bn: 'ভালো',
    es: 'Bueno', fr: 'Bon', de: 'Gut', zh: '好', ja: '良い', en: 'Good',
  },
  'bad': {
    hi: 'बुरा', te: 'చెడు', ta: 'கெட்ட', bn: 'খারাপ',
    es: 'Malo', fr: 'Mauvais', de: 'Schlecht', zh: '坏', ja: '悪い', en: 'Bad',
  },
  'love': {
    hi: 'प्यार', te: 'ప్రేమ', ta: 'காதல்', bn: 'প্রেম',
    es: 'Amor', fr: 'Amour', de: 'Liebe', zh: '爱', ja: '愛', en: 'Love',
  },
  'friend': {
    hi: 'दोस्त', te: 'స్నేహితుడు', ta: 'நண்பன்', bn: 'বন্ধু',
    es: 'Amigo', fr: 'Ami', de: 'Freund', zh: '朋友', ja: '友達', en: 'Friend',
  },

  // ===== COMMON CHAT =====
  'see you later': {
    hi: 'फिर मिलते हैं', te: 'తర్వాత కలుద్దాం', ta: 'பிறகு சந்திப்போம்',
    es: 'Hasta luego', fr: 'À plus tard', de: 'Bis später', en: 'See you later',
  },
  'take care': {
    hi: 'अपना ख्याल रखना', te: 'జాగ్రత్తగా ఉండు', ta: 'கவனமாக இரு',
    es: 'Cuídate', fr: 'Prends soin de toi', de: 'Pass auf dich auf', en: 'Take care',
  },
  'nice to meet you': {
    hi: 'आपसे मिलकर अच्छा लगा', te: 'మిమ్మల్ని కలిసినందుకు సంతోషం',
    ta: 'உங்களை சந்தித்ததில் மகிழ்ச்சி', es: 'Encantado de conocerte',
    fr: 'Enchanté', de: 'Freut mich', en: 'Nice to meet you',
  },
  'have a nice day': {
    hi: 'आपका दिन शुभ हो', te: 'మీ రోజు శుభం అవ్వాలి', ta: 'நல்ல நாளாக அமையட்டும்',
    es: 'Que tengas un buen día', fr: 'Bonne journée', de: 'Schönen Tag noch', en: 'Have a nice day',
  },
  'i understand': {
    hi: 'मैं समझ गया', te: 'నాకు అర్థమైంది', ta: 'நான் புரிந்துகொண்டேன்',
    es: 'Entiendo', fr: 'Je comprends', de: 'Ich verstehe', en: 'I understand',
  },
  'wait': {
    hi: 'रुको', te: 'ఆగు', ta: 'காத்திரு', bn: 'অপেক্ষা কর',
    es: 'Espera', fr: 'Attends', de: 'Warte', zh: '等待', ja: '待って', en: 'Wait',
  },
  'come': {
    hi: 'आओ', te: 'రా', ta: 'வா', bn: 'এসো',
    es: 'Ven', fr: 'Viens', de: 'Komm', zh: '来', ja: '来て', en: 'Come',
  },
  'go': {
    hi: 'जाओ', te: 'వెళ్ళు', ta: 'போ', bn: 'যাও',
    es: 'Ve', fr: 'Va', de: 'Geh', zh: '去', ja: '行って', en: 'Go',
  },
  'help': {
    hi: 'मदद', te: 'సహాయం', ta: 'உதவி', bn: 'সাহায্য',
    es: 'Ayuda', fr: 'Aide', de: 'Hilfe', zh: '帮助', ja: '助けて', en: 'Help',
  },
  'stop': {
    hi: 'रुको', te: 'ఆపు', ta: 'நிறுத்து', bn: 'থামো',
    es: 'Para', fr: 'Arrête', de: 'Stopp', zh: '停', ja: '止まって', en: 'Stop',
  },

  // ===== NUMBERS =====
  'one': { hi: 'एक', te: 'ఒకటి', ta: 'ஒன்று', es: 'Uno', fr: 'Un', de: 'Eins', zh: '一', ja: '一', en: 'One' },
  'two': { hi: 'दो', te: 'రెండు', ta: 'இரண்டு', es: 'Dos', fr: 'Deux', de: 'Zwei', zh: '二', ja: '二', en: 'Two' },
  'three': { hi: 'तीन', te: 'మూడు', ta: 'மூன்று', es: 'Tres', fr: 'Trois', de: 'Drei', zh: '三', ja: '三', en: 'Three' },
  'four': { hi: 'चार', te: 'నాలుగు', ta: 'நான்கு', es: 'Cuatro', fr: 'Quatre', de: 'Vier', zh: '四', ja: '四', en: 'Four' },
  'five': { hi: 'पांच', te: 'ఐదు', ta: 'ஐந்து', es: 'Cinco', fr: 'Cinq', de: 'Fünf', zh: '五', ja: '五', en: 'Five' },
  'six': { hi: 'छह', te: 'ఆరు', ta: 'ஆறு', es: 'Seis', fr: 'Six', de: 'Sechs', zh: '六', ja: '六', en: 'Six' },
  'seven': { hi: 'सात', te: 'ఏడు', ta: 'ஏழு', es: 'Siete', fr: 'Sept', de: 'Sieben', zh: '七', ja: '七', en: 'Seven' },
  'eight': { hi: 'आठ', te: 'ఎనిమిది', ta: 'எட்டு', es: 'Ocho', fr: 'Huit', de: 'Acht', zh: '八', ja: '八', en: 'Eight' },
  'nine': { hi: 'नौ', te: 'తొమ్మిది', ta: 'ஒன்பது', es: 'Nueve', fr: 'Neuf', de: 'Neun', zh: '九', ja: '九', en: 'Nine' },
  'ten': { hi: 'दस', te: 'పది', ta: 'பத்து', es: 'Diez', fr: 'Dix', de: 'Zehn', zh: '十', ja: '十', en: 'Ten' },

  // ===== FAMILY =====
  'mother': { hi: 'माँ', te: 'అమ్మ', ta: 'அம்மா', bn: 'মা', es: 'Madre', fr: 'Mère', de: 'Mutter', zh: '妈妈', ja: 'お母さん', en: 'Mother' },
  'father': { hi: 'पिता', te: 'నాన్న', ta: 'அப்பா', bn: 'বাবা', es: 'Padre', fr: 'Père', de: 'Vater', zh: '爸爸', ja: 'お父さん', en: 'Father' },
  'brother': { hi: 'भाई', te: 'అన్నయ్య', ta: 'அண்ணன்', bn: 'ভাই', es: 'Hermano', fr: 'Frère', de: 'Bruder', zh: '哥哥', ja: '兄', en: 'Brother' },
  'sister': { hi: 'बहन', te: 'అక్క', ta: 'அக்கா', bn: 'বোন', es: 'Hermana', fr: 'Sœur', de: 'Schwester', zh: '姐姐', ja: '姉', en: 'Sister' },

  // ===== TIME =====
  'today': { hi: 'आज', te: 'ఈ రోజు', ta: 'இன்று', es: 'Hoy', fr: "Aujourd'hui", de: 'Heute', zh: '今天', ja: '今日', en: 'Today' },
  'tomorrow': { hi: 'कल', te: 'రేపు', ta: 'நாளை', es: 'Mañana', fr: 'Demain', de: 'Morgen', zh: '明天', ja: '明日', en: 'Tomorrow' },
  'yesterday': { hi: 'कल', te: 'నిన్న', ta: 'நேற்று', es: 'Ayer', fr: 'Hier', de: 'Gestern', zh: '昨天', ja: '昨日', en: 'Yesterday' },
  'now': { hi: 'अभी', te: 'ఇప్పుడు', ta: 'இப்போது', es: 'Ahora', fr: 'Maintenant', de: 'Jetzt', zh: '现在', ja: '今', en: 'Now' },
  'later': { hi: 'बाद में', te: 'తర్వాత', ta: 'பின்னர்', es: 'Después', fr: 'Plus tard', de: 'Später', zh: '稍后', ja: '後で', en: 'Later' },

  // ===== FOOD =====
  'food': { hi: 'खाना', te: 'ఆహారం', ta: 'உணவு', es: 'Comida', fr: 'Nourriture', de: 'Essen', zh: '食物', ja: '食べ物', en: 'Food' },
  'water': { hi: 'पानी', te: 'నీళ్ళు', ta: 'தண்ணீர்', es: 'Agua', fr: 'Eau', de: 'Wasser', zh: '水', ja: '水', en: 'Water' },
  'eat': { hi: 'खाओ', te: 'తిను', ta: 'சாப்பிடு', es: 'Come', fr: 'Mange', de: 'Iss', zh: '吃', ja: '食べて', en: 'Eat' },
  'drink': { hi: 'पियो', te: 'తాగు', ta: 'குடி', es: 'Bebe', fr: 'Bois', de: 'Trink', zh: '喝', ja: '飲んで', en: 'Drink' },

  // ===== PRONOUNS =====
  'i': { hi: 'मैं', te: 'నేను', ta: 'நான்', bn: 'আমি', es: 'Yo', fr: 'Je', de: 'Ich', zh: '我', ja: '私', en: 'I' },
  'me': { hi: 'मुझे', te: 'నాకు', ta: 'எனக்கு', bn: 'আমাকে', es: 'Me', fr: 'Moi', de: 'Mich', zh: '我', ja: '私を', en: 'Me' },
  'my': { hi: 'मेरा', te: 'నా', ta: 'என்', bn: 'আমার', es: 'Mi', fr: 'Mon', de: 'Mein', zh: '我的', ja: '私の', en: 'My' },
  'you': { hi: 'तुम', te: 'నువ్వు', ta: 'நீ', bn: 'তুমি', es: 'Tú', fr: 'Tu', de: 'Du', zh: '你', ja: 'あなた', en: 'You' },
  'your': { hi: 'तुम्हारा', te: 'మీ', ta: 'உன்', bn: 'তোমার', es: 'Tu', fr: 'Ton', de: 'Dein', zh: '你的', ja: 'あなたの', en: 'Your' },
  'we': { hi: 'हम', te: 'మేము', ta: 'நாங்கள்', bn: 'আমরা', es: 'Nosotros', fr: 'Nous', de: 'Wir', zh: '我们', ja: '私たち', en: 'We' },
  'they': { hi: 'वे', te: 'వారు', ta: 'அவர்கள்', bn: 'তারা', es: 'Ellos', fr: 'Ils', de: 'Sie', zh: '他们', ja: '彼ら', en: 'They' },
  'their': { hi: 'उनका', te: 'వారి', ta: 'அவர்களின்', bn: 'তাদের', es: 'Su', fr: 'Leur', de: 'Ihr', zh: '他们的', ja: '彼らの', en: 'Their' },
  'he': { hi: 'वह', te: 'అతను', ta: 'அவன்', bn: 'সে', es: 'Él', fr: 'Il', de: 'Er', zh: '他', ja: '彼', en: 'He' },
  'she': { hi: 'वह', te: 'ఆమె', ta: 'அவள்', bn: 'সে', es: 'Ella', fr: 'Elle', de: 'Sie', zh: '她', ja: '彼女', en: 'She' },
  'it': { hi: 'यह', te: 'అది', ta: 'அது', bn: 'এটা', es: 'Eso', fr: 'Cela', de: 'Es', zh: '它', ja: 'それ', en: 'It' },
  'this': { hi: 'यह', te: 'ఇది', ta: 'இது', bn: 'এটা', es: 'Esto', fr: 'Ceci', de: 'Dies', zh: '这', ja: 'これ', en: 'This' },
  'that': { hi: 'वह', te: 'అది', ta: 'அது', bn: 'ওটা', es: 'Eso', fr: 'Cela', de: 'Das', zh: '那', ja: 'あれ', en: 'That' },

  // ===== COMMON VERBS =====
  'is': { hi: 'है', te: 'ఉంది', ta: 'இருக்கிறது', bn: 'আছে', es: 'Es', fr: 'Est', de: 'Ist', zh: '是', ja: 'です', en: 'Is' },
  'are': { hi: 'हैं', te: 'ఉన్నారు', ta: 'இருக்கிறார்கள்', bn: 'হয়', es: 'Son', fr: 'Sont', de: 'Sind', zh: '是', ja: 'です', en: 'Are' },
  'am': { hi: 'हूं', te: 'ఉన్నాను', ta: 'இருக்கிறேன்', bn: 'আছি', es: 'Soy', fr: 'Suis', de: 'Bin', zh: '是', ja: 'です', en: 'Am' },
  'was': { hi: 'था', te: 'ఉంది', ta: 'இருந்தது', bn: 'ছিল', es: 'Era', fr: 'Était', de: 'War', zh: '是', ja: 'でした', en: 'Was' },
  'were': { hi: 'थे', te: 'ఉన్నారు', ta: 'இருந்தார்கள்', bn: 'ছিল', es: 'Eran', fr: 'Étaient', de: 'Waren', zh: '是', ja: 'でした', en: 'Were' },
  'have': { hi: 'है', te: 'ఉంది', ta: 'இருக்கிறது', bn: 'আছে', es: 'Tener', fr: 'Avoir', de: 'Haben', zh: '有', ja: '持っている', en: 'Have' },
  'has': { hi: 'है', te: 'ఉంది', ta: 'இருக்கிறது', bn: 'আছে', es: 'Tiene', fr: 'A', de: 'Hat', zh: '有', ja: '持っています', en: 'Has' },
  'do': { hi: 'करो', te: 'చేయి', ta: 'செய்', bn: 'করো', es: 'Hacer', fr: 'Faire', de: 'Tun', zh: '做', ja: 'する', en: 'Do' },
  'does': { hi: 'करता है', te: 'చేస్తాడు', ta: 'செய்கிறது', bn: 'করে', es: 'Hace', fr: 'Fait', de: 'Tut', zh: '做', ja: 'します', en: 'Does' },
  'doing': { hi: 'कर रहा', te: 'చేస్తున్న', ta: 'செய்து', bn: 'করছে', es: 'Haciendo', fr: 'Faisant', de: 'Machend', zh: '在做', ja: 'している', en: 'Doing' },
  'can': { hi: 'सकते', te: 'చేయగలరు', ta: 'முடியும்', bn: 'পারে', es: 'Poder', fr: 'Pouvoir', de: 'Können', zh: '能', ja: 'できる', en: 'Can' },
  'will': { hi: 'होगा', te: 'అవుతుంది', ta: 'ஆகும்', bn: 'হবে', es: 'Será', fr: 'Sera', de: 'Wird', zh: '会', ja: 'でしょう', en: 'Will' },
  'would': { hi: 'होगा', te: 'అవుతుంది', ta: 'ஆகும்', bn: 'হবে', es: 'Sería', fr: 'Serait', de: 'Würde', zh: '会', ja: 'だろう', en: 'Would' },
  'should': { hi: 'चाहिए', te: 'తీరాలి', ta: 'வேண்டும்', bn: 'উচিত', es: 'Debería', fr: 'Devrait', de: 'Sollte', zh: '应该', ja: 'べきだ', en: 'Should' },
  'could': { hi: 'सकता था', te: 'చేయగలిగాడు', ta: 'முடிந்தது', bn: 'পারত', es: 'Podría', fr: 'Pourrait', de: 'Könnte', zh: '可以', ja: 'できた', en: 'Could' },
  'want': { hi: 'चाहते', te: 'కావాలి', ta: 'வேண்டும்', bn: 'চাই', es: 'Querer', fr: 'Vouloir', de: 'Wollen', zh: '想要', ja: '欲しい', en: 'Want' },
  'need': { hi: 'चाहिए', te: 'అవసరం', ta: 'தேவை', bn: 'দরকার', es: 'Necesitar', fr: 'Avoir besoin', de: 'Brauchen', zh: '需要', ja: '必要', en: 'Need' },
  'know': { hi: 'जानता', te: 'తెలుసు', ta: 'தெரியும்', bn: 'জানি', es: 'Saber', fr: 'Savoir', de: 'Wissen', zh: '知道', ja: '知っている', en: 'Know' },
  'think': { hi: 'सोचता', te: 'అనుకుంటున్న', ta: 'நினைக்கிறேன்', bn: 'ভাবি', es: 'Pensar', fr: 'Penser', de: 'Denken', zh: '想', ja: '思う', en: 'Think' },
  'see': { hi: 'देखो', te: 'చూడు', ta: 'பார்', bn: 'দেখ', es: 'Ver', fr: 'Voir', de: 'Sehen', zh: '看', ja: '見る', en: 'See' },
  'tell': { hi: 'बताओ', te: 'చెప్పు', ta: 'சொல்', bn: 'বল', es: 'Decir', fr: 'Dire', de: 'Sagen', zh: '告诉', ja: '言う', en: 'Tell' },
  'give': { hi: 'दो', te: 'ఇవ్వు', ta: 'கொடு', bn: 'দাও', es: 'Dar', fr: 'Donner', de: 'Geben', zh: '给', ja: 'あげる', en: 'Give' },
  'take': { hi: 'लो', te: 'తీసుకో', ta: 'எடு', bn: 'নাও', es: 'Tomar', fr: 'Prendre', de: 'Nehmen', zh: '拿', ja: '取る', en: 'Take' },
  'make': { hi: 'बनाओ', te: 'చేయి', ta: 'செய்', bn: 'বানাও', es: 'Hacer', fr: 'Faire', de: 'Machen', zh: '做', ja: '作る', en: 'Make' },
  'let': { hi: 'करने दो', te: 'చేయనీయి', ta: 'விடு', bn: 'করতে দাও', es: 'Dejar', fr: 'Laisser', de: 'Lassen', zh: '让', ja: 'させる', en: 'Let' },
  'send': { hi: 'भेजो', te: 'పంపు', ta: 'அனுப்பு', bn: 'পাঠাও', es: 'Enviar', fr: 'Envoyer', de: 'Senden', zh: '发送', ja: '送る', en: 'Send' },
  'call': { hi: 'फोन करो', te: 'ఫోన్ చేయి', ta: 'அழை', bn: 'ফোন করো', es: 'Llamar', fr: 'Appeler', de: 'Anrufen', zh: '打电话', ja: '電話する', en: 'Call' },

  // ===== COMMON WORDS =====
  'how': { hi: 'कैसे', te: 'ఎలా', ta: 'எப்படி', bn: 'কিভাবে', es: 'Cómo', fr: 'Comment', de: 'Wie', zh: '怎么', ja: 'どうやって', en: 'How' },
  'what': { hi: 'क्या', te: 'ఏమిటి', ta: 'என்ன', bn: 'কি', es: 'Qué', fr: 'Quoi', de: 'Was', zh: '什么', ja: '何', en: 'What' },
  'when': { hi: 'कब', te: 'ఎప్పుడు', ta: 'எப்போது', bn: 'কখন', es: 'Cuándo', fr: 'Quand', de: 'Wann', zh: '什么时候', ja: 'いつ', en: 'When' },
  'where': { hi: 'कहाँ', te: 'ఎక్కడ', ta: 'எங்கே', bn: 'কোথায়', es: 'Dónde', fr: 'Où', de: 'Wo', zh: '哪里', ja: 'どこ', en: 'Where' },
  'why': { hi: 'क्यों', te: 'ఎందుకు', ta: 'ஏன்', bn: 'কেন', es: 'Por qué', fr: 'Pourquoi', de: 'Warum', zh: '为什么', ja: 'なぜ', en: 'Why' },
  'who': { hi: 'कौन', te: 'ఎవరు', ta: 'யார்', bn: 'কে', es: 'Quién', fr: 'Qui', de: 'Wer', zh: '谁', ja: '誰', en: 'Who' },
  'if': { hi: 'अगर', te: 'అయితే', ta: 'என்றால்', bn: 'যদি', es: 'Si', fr: 'Si', de: 'Wenn', zh: '如果', ja: 'もし', en: 'If' },
  'and': { hi: 'और', te: 'మరియు', ta: 'மற்றும்', bn: 'এবং', es: 'Y', fr: 'Et', de: 'Und', zh: '和', ja: 'と', en: 'And' },
  'or': { hi: 'या', te: 'లేదా', ta: 'அல்லது', bn: 'অথবা', es: 'O', fr: 'Ou', de: 'Oder', zh: '或', ja: 'または', en: 'Or' },
  'but': { hi: 'लेकिन', te: 'కానీ', ta: 'ஆனால்', bn: 'কিন্তু', es: 'Pero', fr: 'Mais', de: 'Aber', zh: '但是', ja: 'しかし', en: 'But' },
  'so': { hi: 'तो', te: 'కాబట్టి', ta: 'எனவே', bn: 'তাই', es: 'Así', fr: 'Donc', de: 'So', zh: '所以', ja: 'だから', en: 'So' },
  'not': { hi: 'नहीं', te: 'కాదు', ta: 'இல்லை', bn: 'না', es: 'No', fr: 'Non', de: 'Nicht', zh: '不', ja: 'いいえ', en: 'Not' },
  'with': { hi: 'साथ', te: 'తో', ta: 'உடன்', bn: 'সাথে', es: 'Con', fr: 'Avec', de: 'Mit', zh: '和', ja: 'と', en: 'With' },
  'for': { hi: 'के लिए', te: 'కోసం', ta: 'க்கு', bn: 'জন্য', es: 'Para', fr: 'Pour', de: 'Für', zh: '为', ja: 'ために', en: 'For' },
  'from': { hi: 'से', te: 'నుండి', ta: 'இருந்து', bn: 'থেকে', es: 'De', fr: 'De', de: 'Von', zh: '从', ja: 'から', en: 'From' },
  'to': { hi: 'को', te: 'కి', ta: 'க்கு', bn: 'কে', es: 'A', fr: 'À', de: 'Zu', zh: '到', ja: 'へ', en: 'To' },
  'in': { hi: 'में', te: 'లో', ta: 'இல்', bn: 'তে', es: 'En', fr: 'Dans', de: 'In', zh: '在', ja: 'で', en: 'In' },
  'on': { hi: 'पर', te: 'మీద', ta: 'மேல்', bn: 'তে', es: 'En', fr: 'Sur', de: 'Auf', zh: '在', ja: 'に', en: 'On' },
  'at': { hi: 'पर', te: 'వద్ద', ta: 'இல்', bn: 'তে', es: 'En', fr: 'À', de: 'Bei', zh: '在', ja: 'に', en: 'At' },
  'by': { hi: 'द्वारा', te: 'ద్వారా', ta: 'மூலம்', bn: 'দ্বারা', es: 'Por', fr: 'Par', de: 'Von', zh: '由', ja: 'によって', en: 'By' },
  'about': { hi: 'के बारे में', te: 'గురించి', ta: 'பற்றி', bn: 'সম্পর্কে', es: 'Sobre', fr: 'À propos', de: 'Über', zh: '关于', ja: 'について', en: 'About' },
  'very': { hi: 'बहुत', te: 'చాలా', ta: 'மிகவும்', bn: 'খুব', es: 'Muy', fr: 'Très', de: 'Sehr', zh: '非常', ja: 'とても', en: 'Very' },
  'much': { hi: 'बहुत', te: 'చాలా', ta: 'மிகவும்', bn: 'অনেক', es: 'Mucho', fr: 'Beaucoup', de: 'Viel', zh: '很', ja: 'とても', en: 'Much' },
  'more': { hi: 'ज़्यादा', te: 'మరిన్ని', ta: 'அதிகமான', bn: 'আরও', es: 'Más', fr: 'Plus', de: 'Mehr', zh: '更多', ja: 'もっと', en: 'More' },
  'also': { hi: 'भी', te: 'కూడా', ta: 'மேலும்', bn: 'ও', es: 'También', fr: 'Aussi', de: 'Auch', zh: '也', ja: 'も', en: 'Also' },
  'just': { hi: 'बस', te: 'కేవలం', ta: 'வெறும்', bn: 'শুধু', es: 'Solo', fr: 'Juste', de: 'Nur', zh: '只是', ja: 'ただ', en: 'Just' },
  'only': { hi: 'सिर्फ', te: 'మాత్రమే', ta: 'மட்டும்', bn: 'শুধু', es: 'Solo', fr: 'Seulement', de: 'Nur', zh: '只', ja: 'だけ', en: 'Only' },
  'all': { hi: 'सब', te: 'అన్ని', ta: 'எல்லா', bn: 'সব', es: 'Todo', fr: 'Tout', de: 'Alle', zh: '全部', ja: 'すべて', en: 'All' },
  'some': { hi: 'कुछ', te: 'కొన్ని', ta: 'சில', bn: 'কিছু', es: 'Algunos', fr: 'Quelques', de: 'Einige', zh: '一些', ja: 'いくつか', en: 'Some' },
  'any': { hi: 'कोई', te: 'ఏదైనా', ta: 'ஏதாவது', bn: 'কোনো', es: 'Cualquier', fr: 'Nimporte', de: 'Irgendein', zh: '任何', ja: 'どんな', en: 'Any' },
  'here': { hi: 'यहाँ', te: 'ఇక్కడ', ta: 'இங்கே', bn: 'এখানে', es: 'Aquí', fr: 'Ici', de: 'Hier', zh: '这里', ja: 'ここ', en: 'Here' },
  'there': { hi: 'वहाँ', te: 'అక్కడ', ta: 'அங்கே', bn: 'ওখানে', es: 'Allí', fr: 'Là', de: 'Dort', zh: '那里', ja: 'そこ', en: 'There' },
  'then': { hi: 'फिर', te: 'అప్పుడు', ta: 'பிறகு', bn: 'তারপর', es: 'Entonces', fr: 'Puis', de: 'Dann', zh: '然后', ja: 'それから', en: 'Then' },

  // ===== ROMANIZED PHRASES (Phonetic Latin → English and Native) =====
  // Telugu romanized
  'bagunnava': { en: 'How are you', hi: 'आप कैसे हैं', te: 'బాగున్నావా', ta: 'நீங்கள் எப்படி இருக்கிறீர்கள்', bn: 'আপনি কেমন আছেন' },
  'bagunnanu': { en: 'I am fine', hi: 'मैं ठीक हूं', te: 'బాగున్నాను', ta: 'நான் நலமாக இருக்கிறேன்', bn: 'আমি ভালো আছি' },
  'bagundi': { en: 'Good', hi: 'अच्छा', te: 'బాగుంది', ta: 'நல்லது', bn: 'ভালো' },
  'ela unnav': { en: 'How are you', hi: 'आप कैसे हैं', te: 'ఎలా ఉన్నావ్', ta: 'நீங்கள் எப்படி இருக்கிறீர்கள்' },
  'ela unnaru': { en: 'How are you', hi: 'आप कैसे हैं', te: 'ఎలా ఉన్నారు', ta: 'நீங்கள் எப்படி இருக்கிறீர்கள்' },
  'nenu bagunnanu': { en: 'I am fine', hi: 'मैं ठीक हूं', te: 'నేను బాగున్నాను', ta: 'நான் நலமாக இருக்கிறேன்' },
  'dhanyavadalu': { en: 'Thank you', hi: 'धन्यवाद', te: 'ధన్యవాదాలు', ta: 'நன்றி', bn: 'ধন্যবাদ' },
  'emi chesthunnav': { en: 'What are you doing', hi: 'तुम क्या कर रहे हो', te: 'ఏమి చేస్తున్నావ్', ta: 'என்ன செய்கிறாய்' },
  'emi chesthunnaru': { en: 'What are you doing', hi: 'आप क्या कर रहे हैं', te: 'ఏమి చేస్తున్నారు', ta: 'என்ன செய்கிறீர்கள்' },
  'subhodayam': { en: 'Good morning', hi: 'सुप्रभात', te: 'శుభోదయం', ta: 'காலை வணக்கம்' },
  'subha ratri': { en: 'Good night', hi: 'शुभ रात्रि', te: 'శుభ రాత్రి', ta: 'இனிய இரவு' },
  // Hindi romanized
  'kaise ho': { en: 'How are you', hi: 'कैसे हो', te: 'ఎలా ఉన్నావ్', ta: 'எப்படி இருக்கிறாய்', bn: 'কেমন আছ' },
  'aap kaise hain': { en: 'How are you', hi: 'आप कैसे हैं', te: 'మీరు ఎలా ఉన్నారు', ta: 'நீங்கள் எப்படி இருக்கிறீர்கள்' },
  'main theek hoon': { en: 'I am fine', hi: 'मैं ठीक हूं', te: 'నేను బాగున్నాను', ta: 'நான் நலமாக இருக்கிறேன்' },
  'kya kar rahe ho': { en: 'What are you doing', hi: 'क्या कर रहे हो', te: 'ఏం చేస్తున్నావ్', ta: 'என்ன செய்கிறாய்' },
  'mujhe tumse pyar hai': { en: 'I love you', hi: 'मुझे तुमसे प्यार है', te: 'నేను నిన్ను ప్రేమిస్తున్నాను', ta: 'நான் உன்னை காதலிக்கிறேன்' },
  'shukriya': { en: 'Thank you', hi: 'शुक्रिया', te: 'ధన్యవాదాలు', ta: 'நன்றி', bn: 'ধন্যবাদ' },
  'suprabhat': { en: 'Good morning', hi: 'सुप्रभात', te: 'శుభోదయం', ta: 'காலை வணக்கம்' },
  'shubh ratri': { en: 'Good night', hi: 'शुभ रात्रि', te: 'శుభ రాత్రి', ta: 'இனிய இரவு' },
  // Tamil romanized  
  'eppadi irukeenga': { en: 'How are you', hi: 'आप कैसे हैं', te: 'మీరు ఎలా ఉన్నారు', ta: 'எப்படி இருக்கீங்க' },
  'naan nallairukkean': { en: 'I am fine', hi: 'मैं ठीक हूं', te: 'నేను బాగున్నాను', ta: 'நான் நல்லா இருக்கேன்' },
  'nandri': { en: 'Thank you', hi: 'धन्यवाद', te: 'ధన్యవాదాలు', ta: 'நன்றி', bn: 'ধন্যবাদ' },
  // Bengali romanized
  'kemon acho': { en: 'How are you', hi: 'कैसे हो', te: 'ఎలా ఉన్నావ్', ta: 'எப்படி இருக்கிறாய்', bn: 'কেমন আছ' },
  'ami bhalo achi': { en: 'I am fine', hi: 'मैं ठीक हूं', te: 'నేను బాగున్నాను', ta: 'நான் நலமாக இருக்கிறேன்', bn: 'আমি ভালো আছি' },
  'dhonnobad': { en: 'Thank you', hi: 'धन्यवाद', te: 'ధన్యవాదాలు', ta: 'நன்றி', bn: 'ধন্যবাদ' },
  // Native script entries for reverse lookup
  'బాగున్నావా': { en: 'How are you', hi: 'आप कैसे हैं', te: 'బాగున్నావా', ta: 'நீங்கள் எப்படி இருக்கிறீர்கள்' },
  'బాగున్నాను': { en: 'I am fine', hi: 'मैं ठीक हूं', te: 'బాగున్నాను', ta: 'நான் நலமாக இருக்கிறேன்' },
  'బాగుంది': { en: 'Good', hi: 'अच्छा', te: 'బాగుంది', ta: 'நல்லது' },
  'ఎలా ఉన్నావ్': { en: 'How are you', hi: 'कैसे हो', te: 'ఎలా ఉన్నావ్', ta: 'எப்படி இருக்கிறாய்' },
  'ఎలా ఉన్నారు': { en: 'How are you', hi: 'आप कैसे हैं', te: 'ఎలా ఉన్నారు', ta: 'நீங்கள் எப்படி இருக்கிறீர்கள்' },
  'ధన్యవాదాలు': { en: 'Thank you', hi: 'धन्यवाद', te: 'ధన్యవాదాలు', ta: 'நன்றி' },
  'ఏమి చేస్తున్నావ్': { en: 'What are you doing', hi: 'तुम क्या कर रहे हो', te: 'ఏమి చేస్తున్నావ్', ta: 'என்ன செய்கிறாய்' },
  'कैसे हो': { en: 'How are you', hi: 'कैसे हो', te: 'ఎలా ఉన్నావ్', ta: 'எப்படி இருக்கிறாய்' },
  'आप कैसे हैं': { en: 'How are you', hi: 'आप कैसे हैं', te: 'మీరు ఎలా ఉన్నారు', ta: 'நீங்கள் எப்படி இருக்கிறீர்கள்' },
  'मैं ठीक हूं': { en: 'I am fine', hi: 'मैं ठीक हूं', te: 'నేను బాగున్నాను', ta: 'நான் நலமாக இருக்கிறேன்' },
  'धन्यवाद': { en: 'Thank you', hi: 'धन्यवाद', te: 'ధన్యవాదాలు', ta: 'நன்றி' },

  // ===== HEALTH & FAMILY RELATED =====
  'parents': { hi: 'माता-पिता', te: 'తల్లిదండ్రులు', ta: 'பெற்றோர்', bn: 'বাবা-মা', es: 'Padres', fr: 'Parents', de: 'Eltern', zh: '父母', ja: '両親', en: 'Parents' },
  'health': { hi: 'स्वास्थ्य', te: 'ఆరోగ్యం', ta: 'ஆரோக்கியம்', bn: 'স্বাস্থ্য', es: 'Salud', fr: 'Santé', de: 'Gesundheit', zh: '健康', ja: '健康', en: 'Health' },
  'money': { hi: 'पैसा', te: 'డబ్బు', ta: 'பணம்', bn: 'টাকা', es: 'Dinero', fr: 'Argent', de: 'Geld', zh: '钱', ja: 'お金', en: 'Money' },
  'india': { hi: 'भारत', te: 'భారతదేశం', ta: 'இந்தியா', bn: 'ভারত', es: 'India', fr: 'Inde', de: 'Indien', zh: '印度', ja: 'インド', en: 'India' },
  'home': { hi: 'घर', te: 'ఇల్లు', ta: 'வீடு', bn: 'বাড়ি', es: 'Casa', fr: 'Maison', de: 'Haus', zh: '家', ja: '家', en: 'Home' },
  'work': { hi: 'काम', te: 'పని', ta: 'வேலை', bn: 'কাজ', es: 'Trabajo', fr: 'Travail', de: 'Arbeit', zh: '工作', ja: '仕事', en: 'Work' },
  'them': { hi: 'उन्हें', te: 'వాళ్ళను', ta: 'அவர்களை', bn: 'তাদের', es: 'Ellos', fr: 'Leur', de: 'Ihnen', zh: '他们', ja: '彼らに', en: 'Them' },
  
  // ===== EXTENDED VOCABULARY FOR LONG MESSAGES =====
  // Note: 'doing' exists in verbs section already
  'well': { hi: 'अच्छी तरह', te: 'బాగా', ta: 'நன்றாக', bn: 'ভালো', es: 'Bien', fr: 'Bien', de: 'Gut', zh: '好', ja: 'よく', en: 'Well' },
  'fine': { hi: 'ठीक', te: 'బాగుంది', ta: 'நல்லது', bn: 'ভালো', es: 'Bien', fr: 'Bien', de: 'Gut', zh: '好', ja: '元気', en: 'Fine' },
  'getting': { hi: 'मिल रहा', te: 'వస్తున్న', ta: 'கிடைக்கிறது', bn: 'পাচ্ছে', es: 'Obteniendo', fr: 'Obtenant', de: 'Bekommend', zh: '得到', ja: '得ている', en: 'Getting' },
  'going': { hi: 'जा रहा', te: 'వెళ్తున్న', ta: 'போகிறது', bn: 'যাচ্ছে', es: 'Yendo', fr: 'Allant', de: 'Gehend', zh: '去', ja: '行っている', en: 'Going' },
  'coming': { hi: 'आ रहा', te: 'వస్తున్న', ta: 'வருகிறது', bn: 'আসছে', es: 'Viniendo', fr: 'Venant', de: 'Kommend', zh: '来', ja: '来ている', en: 'Coming' },
  'living': { hi: 'रह रहे', te: 'నివసిస్తున్న', ta: 'வாழ்கிறது', bn: 'থাকছে', es: 'Viviendo', fr: 'Vivant', de: 'Lebend', zh: '住', ja: '住んでいる', en: 'Living' },
  'working': { hi: 'काम कर रहे', te: 'పని చేస్తున్న', ta: 'வேலை செய்கிறது', bn: 'কাজ করছে', es: 'Trabajando', fr: 'Travaillant', de: 'Arbeitend', zh: '工作', ja: '働いている', en: 'Working' },
  'eating': { hi: 'खा रहे', te: 'తినుస్తున్న', ta: 'சாப்பிடுகிறது', bn: 'খাচ্ছে', es: 'Comiendo', fr: 'Mangeant', de: 'Essend', zh: '吃', ja: '食べている', en: 'Eating' },
  'sleeping': { hi: 'सो रहे', te: 'నిద్రపోతున్న', ta: 'தூங்குகிறது', bn: 'ঘুমাচ্ছে', es: 'Durmiendo', fr: 'Dormant', de: 'Schlafend', zh: '睡觉', ja: '寝ている', en: 'Sleeping' },
  'talking': { hi: 'बात कर रहे', te: 'మాట్లాడుతున్న', ta: 'பேசுகிறது', bn: 'কথা বলছে', es: 'Hablando', fr: 'Parlant', de: 'Sprechend', zh: '说话', ja: '話している', en: 'Talking' },
  'sending': { hi: 'भेज रहे', te: 'పంపుతున్న', ta: 'அனுப்புகிறது', bn: 'পাঠাচ্ছে', es: 'Enviando', fr: 'Envoyant', de: 'Sendend', zh: '发送', ja: '送っている', en: 'Sending' },
  'helping': { hi: 'मदद कर रहे', te: 'సహాయం చేస్తున్న', ta: 'உதவி செய்கிறது', bn: 'সাহায্য করছে', es: 'Ayudando', fr: 'Aidant', de: 'Helfend', zh: '帮助', ja: '助けている', en: 'Helping' },
  'looking': { hi: 'देख रहे', te: 'చూస్తున్న', ta: 'பார்க்கிறது', bn: 'দেখছে', es: 'Mirando', fr: 'Regardant', de: 'Schauend', zh: '看', ja: '見ている', en: 'Looking' },
  'feeling': { hi: 'महसूस', te: 'అనుభూతి', ta: 'உணர்வு', bn: 'অনুভব', es: 'Sintiendo', fr: 'Ressentant', de: 'Fühlend', zh: '感觉', ja: '感じている', en: 'Feeling' },
  'thinking': { hi: 'सोच रहे', te: 'ఆలోచిస్తున్న', ta: 'நினைக்கிறது', bn: 'ভাবছে', es: 'Pensando', fr: 'Pensant', de: 'Denkend', zh: '想', ja: '考えている', en: 'Thinking' },
  'saying': { hi: 'कह रहे', te: 'చెప్తున్న', ta: 'சொல்கிறது', bn: 'বলছে', es: 'Diciendo', fr: 'Disant', de: 'Sagend', zh: '说', ja: '言っている', en: 'Saying' },
  
  // ===== MORE COMMON WORDS =====
  'really': { hi: 'वास्तव में', te: 'నిజంగా', ta: 'உண்மையில்', bn: 'সত্যিই', es: 'Realmente', fr: 'Vraiment', de: 'Wirklich', zh: '真的', ja: '本当に', en: 'Really' },
  'always': { hi: 'हमेशा', te: 'ఎల్లప్పుడూ', ta: 'எப்போதும்', bn: 'সবসময়', es: 'Siempre', fr: 'Toujours', de: 'Immer', zh: '总是', ja: 'いつも', en: 'Always' },
  'never': { hi: 'कभी नहीं', te: 'ఎప్పుడూ కాదు', ta: 'ஒருபோதும் இல்லை', bn: 'কখনই না', es: 'Nunca', fr: 'Jamais', de: 'Niemals', zh: '从不', ja: '決して', en: 'Never' },
  'maybe': { hi: 'शायद', te: 'బహుశా', ta: 'ஒருவேளை', bn: 'হয়তো', es: 'Quizás', fr: 'Peut-être', de: 'Vielleicht', zh: '也许', ja: 'たぶん', en: 'Maybe' },
  'again': { hi: 'फिर से', te: 'మళ్ళీ', ta: 'மீண்டும்', bn: 'আবার', es: 'Otra vez', fr: 'Encore', de: 'Wieder', zh: '又', ja: 'また', en: 'Again' },
  'still': { hi: 'अभी भी', te: 'ఇంకా', ta: 'இன்னும்', bn: 'এখনও', es: 'Todavía', fr: 'Encore', de: 'Noch', zh: '仍然', ja: 'まだ', en: 'Still' },
  'already': { hi: 'पहले से', te: 'ఇప్పటికే', ta: 'ஏற்கனவே', bn: 'ইতিমধ্যে', es: 'Ya', fr: 'Déjà', de: 'Schon', zh: '已经', ja: 'すでに', en: 'Already' },
  'soon': { hi: 'जल्दी', te: 'త్వరలో', ta: 'விரைவில்', bn: 'শীঘ্রই', es: 'Pronto', fr: 'Bientôt', de: 'Bald', zh: '很快', ja: 'すぐに', en: 'Soon' },
  'every': { hi: 'हर', te: 'ప్రతి', ta: 'ஒவ்வொரு', bn: 'প্রতি', es: 'Cada', fr: 'Chaque', de: 'Jeder', zh: '每', ja: '毎', en: 'Every' },
  'everything': { hi: 'सब कुछ', te: 'అన్నీ', ta: 'எல்லாம்', bn: 'সবকিছু', es: 'Todo', fr: 'Tout', de: 'Alles', zh: '一切', ja: 'すべて', en: 'Everything' },
  'everyone': { hi: 'सब लोग', te: 'అందరూ', ta: 'எல்லோரும்', bn: 'সবাই', es: 'Todos', fr: 'Tout le monde', de: 'Jeder', zh: '每个人', ja: 'みんな', en: 'Everyone' },
  'nothing': { hi: 'कुछ नहीं', te: 'ఏమీ లేదు', ta: 'ஏதும் இல்லை', bn: 'কিছু না', es: 'Nada', fr: 'Rien', de: 'Nichts', zh: '什么都没有', ja: '何も', en: 'Nothing' },
  'something': { hi: 'कुछ', te: 'ఏదైనా', ta: 'ஏதாவது', bn: 'কিছু', es: 'Algo', fr: 'Quelque chose', de: 'Etwas', zh: '某事', ja: '何か', en: 'Something' },
  'someone': { hi: 'कोई', te: 'ఎవరో', ta: 'யாரோ', bn: 'কেউ', es: 'Alguien', fr: 'Quelqu\'un', de: 'Jemand', zh: '某人', ja: '誰か', en: 'Someone' },
  'time': { hi: 'समय', te: 'సమయం', ta: 'நேரம்', bn: 'সময়', es: 'Tiempo', fr: 'Temps', de: 'Zeit', zh: '时间', ja: '時間', en: 'Time' },
  'place': { hi: 'जगह', te: 'స్థలం', ta: 'இடம்', bn: 'জায়গা', es: 'Lugar', fr: 'Lieu', de: 'Ort', zh: '地方', ja: '場所', en: 'Place' },
  'thing': { hi: 'चीज़', te: 'విషయం', ta: 'பொருள்', bn: 'জিনিস', es: 'Cosa', fr: 'Chose', de: 'Ding', zh: '东西', ja: 'もの', en: 'Thing' },
  'way': { hi: 'तरीका', te: 'మార్గం', ta: 'வழி', bn: 'উপায়', es: 'Manera', fr: 'Façon', de: 'Weg', zh: '方式', ja: '方法', en: 'Way' },
  'day': { hi: 'दिन', te: 'రోజు', ta: 'நாள்', bn: 'দিন', es: 'Día', fr: 'Jour', de: 'Tag', zh: '天', ja: '日', en: 'Day' },
  'night': { hi: 'रात', te: 'రాత్రి', ta: 'இரவு', bn: 'রাত', es: 'Noche', fr: 'Nuit', de: 'Nacht', zh: '夜', ja: '夜', en: 'Night' },
  'morning': { hi: 'सुबह', te: 'ఉదయం', ta: 'காலை', bn: 'সকাল', es: 'Mañana', fr: 'Matin', de: 'Morgen', zh: '早上', ja: '朝', en: 'Morning' },
  'evening': { hi: 'शाम', te: 'సాయంత్రం', ta: 'மாலை', bn: 'সন্ধ্যা', es: 'Tarde', fr: 'Soir', de: 'Abend', zh: '晚上', ja: '夕方', en: 'Evening' },
  'life': { hi: 'जीवन', te: 'జీవితం', ta: 'வாழ்க்கை', bn: 'জীবন', es: 'Vida', fr: 'Vie', de: 'Leben', zh: '生活', ja: '人生', en: 'Life' },
  'world': { hi: 'दुनिया', te: 'ప్రపంచం', ta: 'உலகம்', bn: 'বিশ্ব', es: 'Mundo', fr: 'Monde', de: 'Welt', zh: '世界', ja: '世界', en: 'World' },
  'people': { hi: 'लोग', te: 'ప్రజలు', ta: 'மக்கள்', bn: 'মানুষ', es: 'Gente', fr: 'Gens', de: 'Leute', zh: '人们', ja: '人々', en: 'People' },
  'man': { hi: 'आदमी', te: 'మనిషి', ta: 'மனிதன்', bn: 'মানুষ', es: 'Hombre', fr: 'Homme', de: 'Mann', zh: '男人', ja: '男', en: 'Man' },
  'woman': { hi: 'औरत', te: 'మహిళ', ta: 'பெண்', bn: 'মহিলা', es: 'Mujer', fr: 'Femme', de: 'Frau', zh: '女人', ja: '女', en: 'Woman' },
  'child': { hi: 'बच्चा', te: 'పిల్లవాడు', ta: 'குழந்தை', bn: 'শিশু', es: 'Niño', fr: 'Enfant', de: 'Kind', zh: '孩子', ja: '子供', en: 'Child' },
  'children': { hi: 'बच्चे', te: 'పిల్లలు', ta: 'குழந்தைகள்', bn: 'শিশুরা', es: 'Niños', fr: 'Enfants', de: 'Kinder', zh: '孩子们', ja: '子供たち', en: 'Children' },
  
  // ===== ADDITIONAL COMMON VERBS (not duplicating existing) =====
  'liking': { hi: 'पसंद कर रहे', te: 'ఇష్టపడుతున్న', ta: 'பிடிக்கிறது', bn: 'পছন্দ করছে', es: 'Gustando', fr: 'Aimant', de: 'Mögend', zh: '喜欢着', ja: '好きになる', en: 'Liking' },
  // Note: 'love' exists in emotions section already
  'hate': { hi: 'नफरत', te: 'ద్వేషం', ta: 'வெறுப்பு', bn: 'ঘৃণা', es: 'Odio', fr: 'Haine', de: 'Hass', zh: '恨', ja: '嫌い', en: 'Hate' },
  'remember': { hi: 'याद', te: 'గుర్తు', ta: 'நினைவு', bn: 'মনে আছে', es: 'Recordar', fr: 'Rappeler', de: 'Erinnern', zh: '记得', ja: '覚えている', en: 'Remember' },
  'forget': { hi: 'भूल', te: 'మరచిపో', ta: 'மறந்து', bn: 'ভুলে যাও', es: 'Olvidar', fr: 'Oublier', de: 'Vergessen', zh: '忘记', ja: '忘れる', en: 'Forget' },
  'understand': { hi: 'समझ', te: 'అర్థం', ta: 'புரிந்து', bn: 'বুঝতে', es: 'Entender', fr: 'Comprendre', de: 'Verstehen', zh: '理解', ja: '理解する', en: 'Understand' },
  'learn': { hi: 'सीखो', te: 'నేర్చుకో', ta: 'கற்றுக்கொள்', bn: 'শিখ', es: 'Aprender', fr: 'Apprendre', de: 'Lernen', zh: '学习', ja: '学ぶ', en: 'Learn' },
  'teach': { hi: 'सिखाओ', te: 'నేర్పించు', ta: 'கற்பிக்க', bn: 'শেখাও', es: 'Enseñar', fr: 'Enseigner', de: 'Lehren', zh: '教', ja: '教える', en: 'Teach' },
  'try': { hi: 'कोशिश', te: 'ప్రయత్నించు', ta: 'முயற்சி', bn: 'চেষ্টা', es: 'Intentar', fr: 'Essayer', de: 'Versuchen', zh: '尝试', ja: '試す', en: 'Try' },
  'use': { hi: 'उपयोग', te: 'ఉపయోగించు', ta: 'பயன்படுத்து', bn: 'ব্যবহার', es: 'Usar', fr: 'Utiliser', de: 'Benutzen', zh: '使用', ja: '使う', en: 'Use' },
  'find': { hi: 'ढूंढो', te: 'కనుగొను', ta: 'கண்டுபிடி', bn: 'খুঁজে বের করো', es: 'Encontrar', fr: 'Trouver', de: 'Finden', zh: '找到', ja: '見つける', en: 'Find' },
  'ask': { hi: 'पूछो', te: 'అడుగు', ta: 'கேள்', bn: 'জিজ্ঞাসা করো', es: 'Preguntar', fr: 'Demander', de: 'Fragen', zh: '问', ja: '聞く', en: 'Ask' },
  'answer': { hi: 'जवाब', te: 'సమాధానం', ta: 'பதில்', bn: 'উত্তর', es: 'Respuesta', fr: 'Réponse', de: 'Antwort', zh: '回答', ja: '答え', en: 'Answer' },
  'believe': { hi: 'विश्वास', te: 'నమ్మకం', ta: 'நம்பிக்கை', bn: 'বিশ্বাস', es: 'Creer', fr: 'Croire', de: 'Glauben', zh: '相信', ja: '信じる', en: 'Believe' },
  'hope': { hi: 'आशा', te: 'ఆశ', ta: 'நம்பிக்கை', bn: 'আশা', es: 'Esperar', fr: 'Espérer', de: 'Hoffen', zh: '希望', ja: '望む', en: 'Hope' },
  'wish': { hi: 'इच्छा', te: 'కోరిక', ta: 'விருப்பம்', bn: 'ইচ্ছা', es: 'Desear', fr: 'Souhaiter', de: 'Wünschen', zh: '希望', ja: '願う', en: 'Wish' },
  'meet': { hi: 'मिलो', te: 'కలువు', ta: 'சந்தி', bn: 'দেখা হও', es: 'Conocer', fr: 'Rencontrer', de: 'Treffen', zh: '见面', ja: '会う', en: 'Meet' },
  'stay': { hi: 'रहो', te: 'ఉండు', ta: 'இரு', bn: 'থাকো', es: 'Quedarse', fr: 'Rester', de: 'Bleiben', zh: '留', ja: 'いる', en: 'Stay' },
  'leave': { hi: 'छोड़ो', te: 'వదిలివేయి', ta: 'விடு', bn: 'ছেড়ে দাও', es: 'Dejar', fr: 'Partir', de: 'Verlassen', zh: '离开', ja: '去る', en: 'Leave' },
  'start': { hi: 'शुरू', te: 'ప్రారంభం', ta: 'தொடங்கு', bn: 'শুরু', es: 'Empezar', fr: 'Commencer', de: 'Anfangen', zh: '开始', ja: '始める', en: 'Start' },
  'finish': { hi: 'खत्म', te: 'ముగించు', ta: 'முடி', bn: 'শেষ', es: 'Terminar', fr: 'Finir', de: 'Beenden', zh: '完成', ja: '終わる', en: 'Finish' },
  'open': { hi: 'खोलो', te: 'తెరువు', ta: 'திற', bn: 'খোলো', es: 'Abrir', fr: 'Ouvrir', de: 'Öffnen', zh: '打开', ja: '開ける', en: 'Open' },
  'close': { hi: 'बंद करो', te: 'మూయు', ta: 'மூடு', bn: 'বন্ধ করো', es: 'Cerrar', fr: 'Fermer', de: 'Schließen', zh: '关闭', ja: '閉める', en: 'Close' },
  'read': { hi: 'पढ़ो', te: 'చదువు', ta: 'படி', bn: 'পড়ো', es: 'Leer', fr: 'Lire', de: 'Lesen', zh: '读', ja: '読む', en: 'Read' },
  'write': { hi: 'लिखो', te: 'రాయి', ta: 'எழுது', bn: 'লেখ', es: 'Escribir', fr: 'Écrire', de: 'Schreiben', zh: '写', ja: '書く', en: 'Write' },
  'listen': { hi: 'सुनो', te: 'విను', ta: 'கேள்', bn: 'শোনো', es: 'Escuchar', fr: 'Écouter', de: 'Hören', zh: '听', ja: '聞く', en: 'Listen' },
  'speak': { hi: 'बोलो', te: 'మాట్లాడు', ta: 'பேசு', bn: 'বলো', es: 'Hablar', fr: 'Parler', de: 'Sprechen', zh: '说', ja: '話す', en: 'Speak' },
  'play': { hi: 'खेलो', te: 'ఆడు', ta: 'விளையாடு', bn: 'খেলো', es: 'Jugar', fr: 'Jouer', de: 'Spielen', zh: '玩', ja: '遊ぶ', en: 'Play' },
  'run': { hi: 'दौड़ो', te: 'పరుగెత్తు', ta: 'ஓடு', bn: 'দৌড়াও', es: 'Correr', fr: 'Courir', de: 'Laufen', zh: '跑', ja: '走る', en: 'Run' },
  'walk': { hi: 'चलो', te: 'నడువు', ta: 'நட', bn: 'হাঁটো', es: 'Caminar', fr: 'Marcher', de: 'Gehen', zh: '走', ja: '歩く', en: 'Walk' },
  'sit': { hi: 'बैठो', te: 'కూర్చో', ta: 'உட்கார்', bn: 'বসো', es: 'Sentarse', fr: 'S\'asseoir', de: 'Sitzen', zh: '坐', ja: '座る', en: 'Sit' },
  'stand': { hi: 'खड़े हो', te: 'నిలబడు', ta: 'நில்', bn: 'দাঁড়াও', es: 'Levantarse', fr: 'Se lever', de: 'Stehen', zh: '站', ja: '立つ', en: 'Stand' },
  'sleep': { hi: 'सो जाओ', te: 'నిద్రపో', ta: 'தூங்கு', bn: 'ঘুমাও', es: 'Dormir', fr: 'Dormir', de: 'Schlafen', zh: '睡', ja: '寝る', en: 'Sleep' },
  'wake': { hi: 'जागो', te: 'నిద్ర లే', ta: 'எழு', bn: 'জাগো', es: 'Despertar', fr: 'Réveiller', de: 'Aufwachen', zh: '醒', ja: '起きる', en: 'Wake' },
  'buy': { hi: 'खरीदो', te: 'కొను', ta: 'வாங்கு', bn: 'কেনো', es: 'Comprar', fr: 'Acheter', de: 'Kaufen', zh: '买', ja: '買う', en: 'Buy' },
  'sell': { hi: 'बेचो', te: 'అమ్ము', ta: 'விற்க', bn: 'বিক্রি করো', es: 'Vender', fr: 'Vendre', de: 'Verkaufen', zh: '卖', ja: '売る', en: 'Sell' },
  'pay': { hi: 'भुगतान करो', te: 'చెల్లించు', ta: 'கட்டு', bn: 'দাও', es: 'Pagar', fr: 'Payer', de: 'Bezahlen', zh: '付', ja: '払う', en: 'Pay' },
  'get': { hi: 'लो', te: 'తీసుకో', ta: 'எடு', bn: 'নাও', es: 'Obtener', fr: 'Obtenir', de: 'Bekommen', zh: '得到', ja: '得る', en: 'Get' },
  'put': { hi: 'रखो', te: 'పెట్టు', ta: 'வை', bn: 'রাখো', es: 'Poner', fr: 'Mettre', de: 'Legen', zh: '放', ja: '置く', en: 'Put' },
  'bring': { hi: 'लाओ', te: 'తీసుకురా', ta: 'கொண்டு வா', bn: 'নিয়ে এসো', es: 'Traer', fr: 'Apporter', de: 'Bringen', zh: '带来', ja: '持ってくる', en: 'Bring' },
  'keep': { hi: 'रखो', te: 'ఉంచు', ta: 'வை', bn: 'রাখো', es: 'Guardar', fr: 'Garder', de: 'Behalten', zh: '保持', ja: '保つ', en: 'Keep' },
  'show': { hi: 'दिखाओ', te: 'చూపించు', ta: 'காட்டு', bn: 'দেখাও', es: 'Mostrar', fr: 'Montrer', de: 'Zeigen', zh: '显示', ja: '見せる', en: 'Show' },
  'change': { hi: 'बदलो', te: 'మార్చు', ta: 'மாற்று', bn: 'বদলাও', es: 'Cambiar', fr: 'Changer', de: 'Ändern', zh: '改变', ja: '変える', en: 'Change' },
  'move': { hi: 'हटो', te: 'కదలు', ta: 'நகர்', bn: 'সরো', es: 'Mover', fr: 'Bouger', de: 'Bewegen', zh: '移动', ja: '動く', en: 'Move' },
  'turn': { hi: 'मुड़ो', te: 'తిరుగు', ta: 'திரும்பு', bn: 'ঘোরো', es: 'Girar', fr: 'Tourner', de: 'Drehen', zh: '转', ja: '回る', en: 'Turn' },
  'grow': { hi: 'बढ़ो', te: 'పెరుగు', ta: 'வளர்', bn: 'বড় হও', es: 'Crecer', fr: 'Grandir', de: 'Wachsen', zh: '成长', ja: '成長する', en: 'Grow' },
  'become': { hi: 'बनो', te: 'అవ్వు', ta: 'ஆக', bn: 'হও', es: 'Llegar a ser', fr: 'Devenir', de: 'Werden', zh: '成为', ja: 'になる', en: 'Become' },
};

// ================== TRANSLITERATION (PHONETIC → NATIVE SCRIPT) ==================
const TRANSLITERATION: Record<string, Record<string, string>> = {
  hi: {
    namaste: 'नमस्ते', namaskar: 'नमस्कार', dhanyavad: 'धन्यवाद', shukriya: 'शुक्रिया',
    pyar: 'प्यार', dil: 'दिल', mohabbat: 'मोहब्बत', ishq: 'इश्क',
    khush: 'खुश', acha: 'अच्छा', achha: 'अच्छा', theek: 'ठीक', thik: 'ठीक',
    haan: 'हाँ', ha: 'हाँ', nahi: 'नहीं', nhi: 'नहीं',
    kya: 'क्या', kaise: 'कैसे', kab: 'कब', kahan: 'कहाँ', kyun: 'क्यों', kyu: 'क्यों',
    aap: 'आप', tum: 'तुम', main: 'मैं', mai: 'मैं', hum: 'हम', wo: 'वो', woh: 'वो',
    subah: 'सुबह', shaam: 'शाम', raat: 'रात', din: 'दिन',
    bahut: 'बहुत', bohot: 'बहुत', thoda: 'थोड़ा', abhi: 'अभी',
    kal: 'कल', aaj: 'आज', parso: 'परसों',
    bhai: 'भाई', behen: 'बहन', bhen: 'बहन', maa: 'माँ', papa: 'पापा', pitaji: 'पिताजी',
    dost: 'दोस्त', yaar: 'यार', sundar: 'सुंदर', pyaara: 'प्यारा', pyari: 'प्यारी',
    accha: 'अच्छा', bura: 'बुरा', khana: 'खाना', paani: 'पानी', pani: 'पानी',
    chalo: 'चलो', aao: 'आओ', jao: 'जाओ', ruko: 'रुको', dekho: 'देखो', suno: 'सुनो',
    karo: 'करो', bolo: 'बोलो', samjho: 'समझो', batao: 'बताओ',
    mujhe: 'मुझे', tumhe: 'तुम्हें', usse: 'उससे', humse: 'हमसे',
    kaun: 'कौन', kiska: 'किसका', kidhar: 'किधर', kitna: 'कितना',
    zyada: 'ज़्यादा', kam: 'कम', bilkul: 'बिल्कुल',
  },
  te: {
    namaste: 'నమస్తే', namaskar: 'నమస్కారం', dhanyavad: 'ధన్యవాదాలు',
    prema: 'ప్రేమ', priya: 'ప్రియ', snehithudu: 'స్నేహితుడు', snehithuralu: 'స్నేహితురాలు',
    manchidi: 'మంచిది', avunu: 'అవును', ledu: 'లేదు', ledhu: 'లేదు',
    ela: 'ఎలా', emi: 'ఏమి', eppudu: 'ఎప్పుడు', ekkada: 'ఎక్కడ', enduku: 'ఎందుకు',
    nenu: 'నేను', nuvvu: 'నువ్వు', meeru: 'మీరు', vaaru: 'వారు', vaallu: 'వాళ్ళు',
    bagunnava: 'బాగున్నావా', bagunnanu: 'బాగున్నాను', bagundi: 'బాగుంది', bagunna: 'బాగున్న',
    subhodayam: 'శుభోదయం', subharatri: 'శుభరాత్రి', subhasayantram: 'శుభసాయంత్రం',
    amma: 'అమ్మ', nanna: 'నాన్న', anna: 'అన్న', akka: 'అక్క', tammudu: 'తమ్ముడు', chelli: 'చెల్లి',
    chala: 'చాలా', konchem: 'కొంచెం', inka: 'ఇంకా', ipudu: 'ఇప్పుడు', tarvata: 'తర్వాత',
    ra: 'రా', po: 'పో', raa: 'రా', vellu: 'వెళ్ళు', cheppu: 'చెప్పు', vinu: 'విను',
    chuddu: 'చూడు', tinu: 'తిను', taagu: 'తాగు', padukondi: 'పడుకోండి',
    neeku: 'నీకు', naaku: 'నాకు', vaallaki: 'వాళ్ళకి',
  },
  ta: {
    vanakkam: 'வணக்கம்', nandri: 'நன்றி', anbu: 'அன்பு',
    kadhal: 'காதல்', nalla: 'நல்ல', nallavan: 'நல்லவன்', nallavam: 'நல்லவம்',
    aama: 'ஆமா', illa: 'இல்ல', illai: 'இல்லை',
    eppadi: 'எப்படி', enna: 'என்ன', eppo: 'எப்போ', enga: 'எங்கே', en: 'ஏன்',
    naan: 'நான்', nee: 'நீ', neengal: 'நீங்கள்', avanga: 'அவங்க', avan: 'அவன்', aval: 'அவள்',
    amma: 'அம்மா', appa: 'அப்பா', anna: 'அண்ணா', akka: 'அக்கா', thambi: 'தம்பி', thangai: 'தங்கை',
    nanban: 'நண்பன்', nanbi: 'நண்பி', azhagu: 'அழகு', azhagan: 'அழகன்', azhagi: 'அழகி',
    vaa: 'வா', po: 'போ', paar: 'பார்', solla: 'சொல்ல', kelu: 'கேள்',
    saappidu: 'சாப்பிடு', kudi: 'குடி', thoongu: 'தூங்கு',
    romba: 'ரொம்ப', konjam: 'கொஞ்சம்', ippo: 'இப்போ', appuram: 'அப்புறம்',
  },
  bn: {
    namaskar: 'নমস্কার', dhonnobad: 'ধন্যবাদ', bhalobashi: 'ভালোবাসি',
    bhalo: 'ভালো', bhalolage: 'ভালোলাগে', kharap: 'খারাপ',
    haan: 'হ্যাঁ', na: 'না', nah: 'নাহ',
    kemon: 'কেমন', ki: 'কি', kokhon: 'কখন', kothay: 'কোথায়', keno: 'কেন',
    ami: 'আমি', tumi: 'তুমি', apni: 'আপনি', tara: 'তারা', ora: 'ওরা',
    ma: 'মা', baba: 'বাবা', dada: 'দাদা', didi: 'দিদি', bhai: 'ভাই', bon: 'বোন',
    bondhu: 'বন্ধু', shundor: 'সুন্দর', mishti: 'মিষ্টি',
    eso: 'এসো', jao: 'যাও', dekho: 'দেখো', bolo: 'বলো', shono: 'শোনো',
    khao: 'খাও', kha: 'খা',
  },
  ar: {
    marhaba: 'مرحبا', shukran: 'شكرا', habibi: 'حبيبي', habibti: 'حبيبتي',
    ahlan: 'أهلاً', naam: 'نعم', la: 'لا', aiwa: 'أيوا',
    kayf: 'كيف', mata: 'متى', ayna: 'أين', limatha: 'لماذا', ma: 'ما',
    ana: 'أنا', anta: 'أنت', anti: 'أنتِ', huwa: 'هو', hiya: 'هي', nahnu: 'نحن',
    abb: 'أب', umm: 'أم', akh: 'أخ', ukht: 'أخت', sadiq: 'صديق',
    jamil: 'جميل', jamila: 'جميلة', hub: 'حب', hubak: 'أحبك',
    taal: 'تعال', idhhab: 'اذهب', undhur: 'انظر', qul: 'قل', isma: 'اسمع',
  },
  gu: {
    saru: 'સારું', haa: 'હા', na: 'ના', nathi: 'નથી',
    hu: 'હું', tame: 'તમે', te: 'તે', ame: 'અમે',
    aabhar: 'આભાર', dhanyavaad: 'ધન્યવાદ',
    su: 'શું', kyare: 'ક્યારે', kya: 'ક્યાં', kem: 'કેમ',
    maa: 'માં', bapu: 'બાપુ', bhai: 'ભાઈ', ben: 'બહેન',
    aav: 'આવ', ja: 'જા', jo: 'જો', bol: 'બોલ', sambhal: 'સાંભળ',
  },
  mr: {
    namaskar: 'नमस्कार', dhanyavad: 'धन्यवाद', aabhari: 'आभारी',
    ho: 'हो', hoय: 'होय', nahi: 'नाही',
    mi: 'मी', tumhi: 'तुम्ही', to: 'तो', ti: 'ती', te: 'ते', amhi: 'आम्ही',
    kay: 'काय', kasa: 'कसा', kashi: 'कशी', kadhi: 'कधी', kuthe: 'कुठे', ka: 'का',
    aai: 'आई', baba: 'बाबा', dada: 'दादा', tai: 'ताई', bhau: 'भाऊ', bahin: 'बहीण',
    mitra: 'मित्र', sundar: 'सुंदर', prem: 'प्रेम',
    ye: 'ये', ja: 'जा', baघ: 'बघ', sang: 'सांग', aik: 'ऐक',
  },
  kn: {
    namaskara: 'ನಮಸ್ಕಾರ', dhanyavada: 'ಧನ್ಯವಾದ', dhanyavadagalu: 'ಧನ್ಯವಾದಗಳು',
    houdu: 'ಹೌದು', illa: 'ಇಲ್ಲ',
    naanu: 'ನಾನು', neevu: 'ನೀವು', avanu: 'ಅವನು', avalu: 'ಅವಳು', naavu: 'ನಾವು',
    enu: 'ಏನು', hege: 'ಹೇಗೆ', yaavaga: 'ಯಾವಾಗ', elli: 'ಎಲ್ಲಿ', yaake: 'ಯಾಕೆ',
    amma: 'ಅಮ್ಮ', appa: 'ಅಪ್ಪ', anna: 'ಅಣ್ಣ', akka: 'ಅಕ್ಕ', tamma: 'ತಮ್ಮ', tangi: 'ತಂಗಿ',
    snehita: 'ಸ್ನೇಹಿತ', sundara: 'ಸುಂದರ', preethi: 'ಪ್ರೀತಿ',
    baa: 'ಬಾ', hogu: 'ಹೋಗು', nodu: 'ನೋಡು', helu: 'ಹೇಳು', kelu: 'ಕೇಳು',
  },
  ml: {
    namaskkaram: 'നമസ്കാരം', nanni: 'നന്ദി', sneham: 'സ്നേഹം',
    athe: 'അതെ', alla: 'അല്ല', illa: 'ഇല്ല',
    njan: 'ഞാൻ', ningal: 'നിങ്ങൾ', nee: 'നീ', avan: 'അവൻ', aval: 'അവൾ', nammal: 'നമ്മൾ',
    enthu: 'എന്ത്', engane: 'എങ്ങനെ', eppol: 'എപ്പോൾ', evide: 'എവിടെ', enthinanu: 'എന്തിനാണ്',
    amma: 'അമ്മ', achan: 'അച്ഛൻ', chettan: 'ചേട്ടൻ', chechi: 'ചേച്ചി', aniyan: 'അനിയൻ', aniyathi: 'അനിയത്തി',
    kuttukaran: 'കൂട്ടുകാരൻ', sundaram: 'സുന്ദരം', ishttam: 'ഇഷ്ടം',
    vaa: 'വാ', po: 'പോ', nokku: 'നോക്കൂ', para: 'പറ', kelkku: 'കേൾക്കൂ',
  },
  pa: {
    sat_sri_akal: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', dhannvaad: 'ਧੰਨਵਾਦ', shukriya: 'ਸ਼ੁਕਰੀਆ',
    haan: 'ਹਾਂ', hanji: 'ਹਾਂਜੀ', nahi: 'ਨਹੀਂ',
    main: 'ਮੈਂ', tusi: 'ਤੁਸੀਂ', oh: 'ਉਹ', assi: 'ਅਸੀਂ',
    ki: 'ਕੀ', kiven: 'ਕਿਵੇਂ', kadon: 'ਕਦੋਂ', kitthe: 'ਕਿੱਥੇ', kyon: 'ਕਿਉਂ',
    maa: 'ਮਾਂ', pita: 'ਪਿਤਾ', veer: 'ਵੀਰ', bhain: 'ਭੈਣ',
    yaar: 'ਯਾਰ', sohna: 'ਸੋਹਣਾ', sohni: 'ਸੋਹਣੀ', pyar: 'ਪਿਆਰ',
    aa: 'ਆ', ja: 'ਜਾ', dekh: 'ਦੇਖ', bol: 'ਬੋਲ', sun: 'ਸੁਣ',
  },
};

// ================== REVERSE DICTIONARY (Native → English) ==================
// Build reverse lookup from DICTIONARY for bidirectional translation
const REVERSE_DICTIONARY: Record<string, Record<string, string>> = {};

// Populate reverse dictionary
Object.entries(DICTIONARY).forEach(([engKey, translations]) => {
  Object.entries(translations).forEach(([langCode, nativeText]) => {
    if (langCode !== 'en') {
      if (!REVERSE_DICTIONARY[nativeText.toLowerCase()]) {
        REVERSE_DICTIONARY[nativeText.toLowerCase()] = {};
      }
      REVERSE_DICTIONARY[nativeText.toLowerCase()]['en'] = engKey;
      // Add cross-language translations
      Object.entries(translations).forEach(([otherLang, otherText]) => {
        if (otherLang !== langCode) {
          REVERSE_DICTIONARY[nativeText.toLowerCase()][otherLang] = otherText;
        }
      });
    }
  });
});

// ================== CACHE ==================
const translationCache = new Map<string, string>();
const CACHE_MAX_SIZE = 1000;

// State
let isReady = true;
let isLoading = false;

// ================== UTILITY FUNCTIONS ==================

export function getLanguageCode(language: string): string {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '').replace(/\s+/g, '');
  return DL_TRANSLATE_LANGUAGE_CODES[normalized] || 'en';
}

export const getDLTranslateCode = getLanguageCode;

export function isLanguageSupported(language: string): boolean {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '').replace(/\s+/g, '');
  return normalized in DL_TRANSLATE_LANGUAGE_CODES;
}

export const isDLTranslateSupported = isLanguageSupported;

export function getSupportedLanguages(): string[] {
  return Object.keys(DL_TRANSLATE_LANGUAGE_CODES);
}

export const getSupportedDLTranslateLanguages = getSupportedLanguages;

// ================== PROXY-BASED DICTIONARY (Language-Translator-Web-Application pattern) ==================
// Creates a Proxy that returns original text if no translation found

function createTranslationProxy(targetLangCode: string) {
  return new Proxy(DICTIONARY, {
    get(target, phrase: string) {
      const key = phrase.toLowerCase();
      if (target[key]?.[targetLangCode]) {
        return target[key][targetLangCode];
      }
      // Check reverse dictionary
      if (REVERSE_DICTIONARY[key]?.[targetLangCode]) {
        return REVERSE_DICTIONARY[key][targetLangCode];
      }
      // Return original phrase if not found
      return phrase;
    }
  });
}

// ================== CORE TRANSLATION FUNCTIONS ==================

export async function initializeMLTranslator(
  onProgress?: (progress: { status: string; progress?: number; file?: string }) => void
): Promise<boolean> {
  onProgress?.({ status: 'loading', progress: 50 });
  await new Promise(resolve => setTimeout(resolve, 50));
  onProgress?.({ status: 'ready', progress: 100 });
  console.log('[DL-Translate] Pure JS Dictionary translator ready (200+ languages)');
  isReady = true;
  return true;
}

export function isMLTranslatorReady(): boolean { return isReady; }
export function isMLTranslatorLoading(): boolean { return isLoading; }

/**
 * Translate text using dictionary + transliteration
 * Pure browser-based - NO external APIs - NO ML models
 */
export async function translateWithML(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  const srcCode = getLanguageCode(sourceLanguage);
  const tgtCode = getLanguageCode(targetLanguage);
  
  // Same language - no translation needed
  if (srcCode === tgtCode) return trimmed;
  
  // Check cache
  const cacheKey = `${trimmed.toLowerCase()}:${srcCode}:${tgtCode}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;
  
  
  // Try exact phrase match first
  const lowerText = trimmed.toLowerCase();
  
  // 1. Check dictionary (exact phrase)
  if (DICTIONARY[lowerText]?.[tgtCode]) {
    const result = DICTIONARY[lowerText][tgtCode];
    addToCache(cacheKey, result);
    console.log('[DL-Translate] Phrase match:', lowerText, '→', result);
    return result;
  }
  
  // 2. Check reverse dictionary (native → target)
  if (REVERSE_DICTIONARY[lowerText]?.[tgtCode]) {
    const result = REVERSE_DICTIONARY[lowerText][tgtCode];
    addToCache(cacheKey, result);
    console.log('[DL-Translate] Reverse match:', lowerText, '→', result);
    return result;
  }
  
  // 3. Word-by-word translation with Proxy fallback
  const words = trimmed.split(/\s+/);
  const translatedWords: string[] = [];
  let hasTranslation = false;
  
  for (const word of words) {
    const lowerWord = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
    const punctuation = word.match(/[.,!?;:'"]+$/)?.[0] || '';
    
    // Check dictionary directly
    const dictEntry = DICTIONARY[lowerWord];
    const dictTranslation = dictEntry?.[tgtCode];
    if (dictTranslation && dictTranslation !== lowerWord) {
      translatedWords.push(dictTranslation + punctuation);
      hasTranslation = true;
      continue;
    }
    
    // Check transliteration
    const translit = TRANSLITERATION[tgtCode]?.[lowerWord];
    if (translit) {
      translatedWords.push(translit + punctuation);
      hasTranslation = true;
      continue;
    }
    
    // Keep original
    translatedWords.push(word);
  }
  
  if (hasTranslation) {
    const result = translatedWords.join(' ');
    addToCache(cacheKey, result);
    console.log('[DL-Translate] Word translation:', trimmed, '→', result);
    return result;
  }
  
  // 4. Try full transliteration for phonetic input (dictionary-based first)
  const fullTranslit = transliteratePhrase(trimmed, tgtCode);
  if (fullTranslit !== trimmed) {
    addToCache(cacheKey, fullTranslit);
    console.log('[DL-Translate] Dictionary transliteration:', trimmed, '→', fullTranslit);
    return fullTranslit;
  }
  
  // 5. Use phonetic transliterator for any remaining Latin text (handles long messages)
  // Get the full language name from code for phonetic transliterator
  const langName = Object.entries(DL_TRANSLATE_LANGUAGE_CODES).find(([name, code]) => code === tgtCode)?.[0] || tgtCode;
  if (isPhoneticTransliterationSupported(langName)) {
    const phoneticResult = phoneticTransliterate(trimmed, langName);
    if (phoneticResult && phoneticResult !== trimmed) {
      addToCache(cacheKey, phoneticResult);
      console.log('[DL-Translate] Phonetic transliteration:', trimmed.slice(0, 30), '→', phoneticResult.slice(0, 30));
      return phoneticResult;
    }
  }
  
  // Return original if no translation available
  return trimmed;
}

/**
 * Transliterate a phrase from Latin script to native script (dictionary-based)
 */
function transliteratePhrase(text: string, targetLangCode: string): string {
  const translitMap = TRANSLITERATION[targetLangCode];
  if (!translitMap) return text;
  
  const words = text.split(/\s+/);
  const result: string[] = [];
  let hasChange = false;
  
  for (const word of words) {
    const lowerWord = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
    const punctuation = word.match(/[.,!?;:'"]+$/)?.[0] || '';
    const translit = translitMap[lowerWord];
    
    if (translit) {
      result.push(translit + punctuation);
      hasChange = true;
    } else {
      result.push(word);
    }
  }
  
  return hasChange ? result.join(' ') : text;
}

/**
 * Batch translate multiple texts
 */
export async function translateBatchWithML(
  texts: string[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<string[]> {
  return Promise.all(
    texts.map(text => translateWithML(text, sourceLanguage, targetLanguage).then(r => r || text))
  );
}

// ================== CACHE MANAGEMENT ==================

function addToCache(key: string, value: string): void {
  translationCache.set(key, value);
  if (translationCache.size > CACHE_MAX_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
}

export function clearMLCache(): void { translationCache.clear(); }

export function getMLCacheStats(): { size: number; maxSize: number } {
  return { size: translationCache.size, maxSize: CACHE_MAX_SIZE };
}

export async function disposeMLTranslator(): Promise<void> {
  translationCache.clear();
  console.log('[DL-Translate] Translator disposed');
}

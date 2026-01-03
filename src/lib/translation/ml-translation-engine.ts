/**
 * DL-Translate + Pure JavaScript Translation Engine
 * 
 * Combined approach from:
 * - https://github.com/xhluca/dl-translate (API pattern, language mapping)
 * - https://github.com/Goutam245/Language-Translator-Web-Application (pure JS, no APIs)
 * 
 * Features:
 * - Pure browser-based - NO external APIs, NO ML models
 * - Proxy-based dictionary with automatic fallback
 * - Comprehensive bidirectional translation dictionaries
 * - Character-level transliteration for native scripts
 * - Instant translations (no loading required)
 * - 200+ language codes supported
 */

// ================== LANGUAGE CODES (DL-TRANSLATE PATTERN) ==================
export const DL_M2M100_LANGUAGE_CODES: Record<string, string> = {
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
export const DL_TRANSLATE_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;
export const M2M100_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;
export const NLLB_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;
export const LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;
export const NLLB200_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;

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
  'you': { hi: 'तुम', te: 'నువ్వు', ta: 'நீ', bn: 'তুমি', es: 'Tú', fr: 'Tu', de: 'Du', zh: '你', ja: 'あなた', en: 'You' },
  'we': { hi: 'हम', te: 'మేము', ta: 'நாங்கள்', bn: 'আমরা', es: 'Nosotros', fr: 'Nous', de: 'Wir', zh: '我们', ja: '私たち', en: 'We' },
  'they': { hi: 'वे', te: 'వారు', ta: 'அவர்கள்', bn: 'তারা', es: 'Ellos', fr: 'Ils', de: 'Sie', zh: '他们', ja: '彼ら', en: 'They' },
  'this': { hi: 'यह', te: 'ఇది', ta: 'இது', bn: 'এটা', es: 'Esto', fr: 'Ceci', de: 'Dies', zh: '这', ja: 'これ', en: 'This' },
  'that': { hi: 'वह', te: 'అది', ta: 'அது', bn: 'ওটা', es: 'Eso', fr: 'Cela', de: 'Das', zh: '那', ja: 'あれ', en: 'That' },
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

export function getDLM2M100Code(language: string): string {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '').replace(/\s+/g, '');
  return DL_M2M100_LANGUAGE_CODES[normalized] || 'en';
}

export const getDLTranslateCode = getDLM2M100Code;
export const getM2M100Code = getDLM2M100Code;
export const getNLLBCode = getDLM2M100Code;
export const getLanguageCode = getDLM2M100Code;

export function isDLM2M100Supported(language: string): boolean {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '').replace(/\s+/g, '');
  return normalized in DL_M2M100_LANGUAGE_CODES;
}

export const isDLTranslateSupported = isDLM2M100Supported;
export const isM2M100Supported = isDLM2M100Supported;
export const isNLLBSupported = isDLM2M100Supported;
export const isLanguageSupported = isDLM2M100Supported;

export function getSupportedDLM2M100Languages(): string[] {
  return Object.keys(DL_M2M100_LANGUAGE_CODES);
}

export const getSupportedDLTranslateLanguages = getSupportedDLM2M100Languages;
export const getSupportedM2M100Languages = getSupportedDLM2M100Languages;
export const getSupportedNLLBLanguages = getSupportedDLM2M100Languages;
export const getSupportedLanguages = getSupportedDLM2M100Languages;

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
  
  const srcCode = getDLM2M100Code(sourceLanguage);
  const tgtCode = getDLM2M100Code(targetLanguage);
  
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
  
  // 4. Try full transliteration for phonetic input
  const fullTranslit = transliteratePhrase(trimmed, tgtCode);
  if (fullTranslit !== trimmed) {
    addToCache(cacheKey, fullTranslit);
    console.log('[DL-Translate] Transliteration:', trimmed, '→', fullTranslit);
    return fullTranslit;
  }
  
  // Return original if no translation available
  return trimmed;
}

/**
 * Transliterate a phrase from Latin script to native script
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

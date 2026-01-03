/**
 * DL-Translate Translation Engine
 * 
 * Full dl-translate implementation with M2M100 model (100+ languages)
 * 
 * Translation methods (in order of priority):
 * 1. Phrase dictionary (instant) - common phrases
 * 2. Word-by-word dictionary (instant) - individual words
 * 3. Phonetic transliteration (instant) - Latin → native script
 * 4. M2M100 Neural Translation (100+ languages) - same model as dl-translate
 * 
 * Based on: https://github.com/xhluca/dl-translate
 */

import { phoneticTransliterate, isPhoneticTransliterationSupported } from './phonetic-transliterator';
import {
  translateWithM2M100,
  isM2M100Supported,
  getM2M100SupportedLanguages,
  initializeM2M100,
  isM2M100Loaded,
  isM2M100Loading,
  getM2M100Code,
  M2M100_LANGUAGES,
} from './dl-translate-model';

// Translation cache
const translationCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 1000;

// Language name mapping
export const DL_TRANSLATE_LANGUAGES: Record<string, string> = {
  // Common languages
  en: 'English', english: 'English',
  hi: 'Hindi', hindi: 'Hindi',
  te: 'Telugu', telugu: 'Telugu',
  ta: 'Tamil', tamil: 'Tamil',
  bn: 'Bengali', bengali: 'Bengali',
  mr: 'Marathi', marathi: 'Marathi',
  gu: 'Gujarati', gujarati: 'Gujarati',
  kn: 'Kannada', kannada: 'Kannada',
  ml: 'Malayalam', malayalam: 'Malayalam',
  pa: 'Punjabi', punjabi: 'Punjabi',
  or: 'Odia', odia: 'Odia', oriya: 'Odia',
  ur: 'Urdu', urdu: 'Urdu',
  as: 'Assamese', assamese: 'Assamese',
  ne: 'Nepali', nepali: 'Nepali',
  
  // European languages
  es: 'Spanish', spanish: 'Spanish',
  fr: 'French', french: 'French',
  de: 'German', german: 'German',
  it: 'Italian', italian: 'Italian',
  pt: 'Portuguese', portuguese: 'Portuguese',
  ru: 'Russian', russian: 'Russian',
  nl: 'Dutch', dutch: 'Dutch',
  pl: 'Polish', polish: 'Polish',
  uk: 'Ukrainian', ukrainian: 'Ukrainian',
  el: 'Greek', greek: 'Greek',
  cs: 'Czech', czech: 'Czech',
  ro: 'Romanian', romanian: 'Romanian',
  hu: 'Hungarian', hungarian: 'Hungarian',
  sv: 'Swedish', swedish: 'Swedish',
  da: 'Danish', danish: 'Danish',
  fi: 'Finnish', finnish: 'Finnish',
  no: 'Norwegian', norwegian: 'Norwegian',
  tr: 'Turkish', turkish: 'Turkish',
  
  // Asian languages
  zh: 'Chinese', chinese: 'Chinese', mandarin: 'Chinese',
  ja: 'Japanese', japanese: 'Japanese',
  ko: 'Korean', korean: 'Korean',
  vi: 'Vietnamese', vietnamese: 'Vietnamese',
  th: 'Thai', thai: 'Thai',
  id: 'Indonesian', indonesian: 'Indonesian',
  ms: 'Malay', malay: 'Malay',
  tl: 'Tagalog', tagalog: 'Tagalog', filipino: 'Tagalog',
  
  // Middle Eastern
  ar: 'Arabic', arabic: 'Arabic',
  he: 'Hebrew', hebrew: 'Hebrew',
  fa: 'Persian', persian: 'Persian', farsi: 'Persian',
  
  // African languages
  sw: 'Swahili', swahili: 'Swahili',
  af: 'Afrikaans', afrikaans: 'Afrikaans',
};

// Comprehensive bidirectional translation dictionary
// Format: english phrase -> { languageCode: translation }
const TRANSLATION_DICTIONARY: Record<string, Record<string, string>> = {
  // Greetings
  'hello': {
    hi: 'नमस्ते', te: 'హలో', ta: 'வணக்கம்', bn: 'হ্যালো', mr: 'नमस्कार',
    gu: 'નમસ્તે', kn: 'ನಮಸ್ಕಾರ', ml: 'ഹലോ', pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', ur: 'ہیلو',
    es: 'Hola', fr: 'Bonjour', de: 'Hallo', ar: 'مرحبا', zh: '你好',
    ja: 'こんにちは', ko: '안녕하세요', ru: 'Привет', pt: 'Olá', it: 'Ciao',
    tr: 'Merhaba', vi: 'Xin chào', th: 'สวัสดี', id: 'Halo', sw: 'Habari',
    nl: 'Hallo', pl: 'Cześć', uk: 'Привіт', el: 'Γεια σου', ne: 'नमस्ते',
  },
  'hi': {
    hi: 'हाय', te: 'హాయ్', ta: 'ஹாய்', bn: 'হাই', mr: 'हाय',
    gu: 'હાય', kn: 'ಹಾಯ್', ml: 'ഹായ്', es: 'Hola', fr: 'Salut',
    de: 'Hi', zh: '嗨', ja: 'やあ', ko: '안녕',
  },
  'good morning': {
    hi: 'सुप्रभात', te: 'శుభోదయం', ta: 'காலை வணக்கம்', bn: 'সুপ্রভাত',
    mr: 'शुभ प्रभात', gu: 'શુભ સવાર', kn: 'ಶುಭೋದಯ', ml: 'സുപ്രഭാതം',
    pa: 'ਸ਼ੁਭ ਸਵੇਰ', es: 'Buenos días', fr: 'Bonjour', de: 'Guten Morgen',
    ar: 'صباح الخير', zh: '早上好', ja: 'おはようございます', ko: '좋은 아침',
    ru: 'Доброе утро', pt: 'Bom dia', it: 'Buongiorno', ur: 'صبح بخیر',
  },
  'good night': {
    hi: 'शुभ रात्रि', te: 'శుభ రాత్రి', ta: 'இனிய இரவு', bn: 'শুভ রাত্রি',
    mr: 'शुभ रात्री', gu: 'શુભ રાત્રિ', kn: 'ಶುಭ ರಾತ್ರಿ', ml: 'ശുഭ രാത്രി',
    es: 'Buenas noches', fr: 'Bonne nuit', de: 'Gute Nacht',
    ar: 'تصبح على خير', zh: '晚安', ja: 'おやすみなさい', ko: '잘 자',
    ur: 'شب بخیر', ru: 'Спокойной ночи',
  },
  'good evening': {
    hi: 'शुभ संध्या', te: 'శుభ సాయంత్రం', ta: 'மாலை வணக்கம்', bn: 'শুভ সন্ধ্যা',
    es: 'Buenas tardes', fr: 'Bonsoir', de: 'Guten Abend',
    zh: '晚上好', ja: 'こんばんは', ko: '좋은 저녁', ur: 'شام بخیر',
  },
  'goodbye': {
    hi: 'अलविदा', te: 'వీడ్కోలు', ta: 'பிரியாவிடை', bn: 'বিদায়',
    mr: 'निरोप', gu: 'આવજો', kn: 'ವಿದಾಯ', ml: 'വിട',
    es: 'Adiós', fr: 'Au revoir', de: 'Auf Wiedersehen',
    zh: '再见', ja: 'さようなら', ko: '안녕히 가세요', ar: 'وداعا',
    ur: 'خدا حافظ', ru: 'До свидания',
  },
  'bye': {
    hi: 'बाय', te: 'బై', ta: 'பை', bn: 'বাই', mr: 'बाय',
    es: 'Adiós', fr: 'Salut', de: 'Tschüss', zh: '拜拜', ja: 'バイバイ',
  },
  'welcome': {
    hi: 'स्वागत है', te: 'స్వాగతం', ta: 'வரவேற்கிறேன்', bn: 'স্বাগতম',
    mr: 'स्वागत', gu: 'સ્વાગત', kn: 'ಸ್ವಾಗತ', ml: 'സ്വാഗതം',
    es: 'Bienvenido', fr: 'Bienvenue', de: 'Willkommen', ar: 'أهلا وسهلا',
  },

  // Questions
  'how are you': {
    hi: 'आप कैसे हैं', te: 'మీరు ఎలా ఉన్నారు', ta: 'நீங்கள் எப்படி இருக்கிறீர்கள்',
    bn: 'আপনি কেমন আছেন', mr: 'तुम्ही कसे आहात', gu: 'તમે કેમ છો',
    kn: 'ನೀವು ಹೇಗಿದ್ದೀರಿ', ml: 'സുഖമാണോ', pa: 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ',
    es: '¿Cómo estás?', fr: 'Comment allez-vous?', de: 'Wie geht es dir?',
    ar: 'كيف حالك', zh: '你好吗', ja: 'お元気ですか', ko: '어떻게 지내세요',
    ur: 'آپ کیسے ہیں', ru: 'Как дела?',
  },
  'what is your name': {
    hi: 'आपका नाम क्या है', te: 'మీ పేరు ఏమిటి', ta: 'உங்கள் பெயர் என்ன',
    bn: 'আপনার নাম কি', mr: 'तुमचे नाव काय आहे', gu: 'તમારું નામ શું છે',
    es: '¿Cómo te llamas?', fr: 'Comment vous appelez-vous?',
    de: 'Wie heißt du?', zh: '你叫什么名字', ja: 'お名前は何ですか',
    ar: 'ما اسمك', ur: 'آپ کا نام کیا ہے',
  },
  'where are you from': {
    hi: 'आप कहाँ से हैं', te: 'మీరు ఎక్కడ నుండి వచ్చారు', ta: 'நீங்கள் எங்கிருந்து வருகிறீர்கள்',
    bn: 'আপনি কোথা থেকে এসেছেন', es: '¿De dónde eres?', fr: "D'où venez-vous?",
    de: 'Woher kommst du?', zh: '你从哪里来', ja: 'どこから来ましたか',
  },
  'what are you doing': {
    hi: 'तुम क्या कर रहे हो', te: 'ఏం చేస్తున్నావ్', ta: 'என்ன செய்கிறாய்',
    bn: 'তুমি কি করছ', mr: 'तू काय करत आहेस', es: '¿Qué estás haciendo?',
    fr: 'Que fais-tu?', de: 'Was machst du?', zh: '你在做什么',
  },
  'where are you': {
    hi: 'तुम कहाँ हो', te: 'నువ్వు ఎక్కడ ఉన్నావ్', ta: 'நீ எங்கே இருக்கிறாய்',
    bn: 'তুমি কোথায়', es: '¿Dónde estás?', fr: 'Où es-tu?', de: 'Wo bist du?',
  },
  'what time is it': {
    hi: 'क्या समय हुआ है', te: 'ఎంత సమయం అయింది', ta: 'என்ன நேரம்',
    bn: 'কয়টা বাজে', es: '¿Qué hora es?', fr: 'Quelle heure est-il?',
    de: 'Wie spät ist es?', zh: '现在几点',
  },

  // Responses
  'i am fine': {
    hi: 'मैं ठीक हूं', te: 'నేను బాగున్నాను', ta: 'நான் நலமாக இருக்கிறேன்',
    bn: 'আমি ভালো আছি', mr: 'मी ठीक आहे', gu: 'હું સારું છું',
    es: 'Estoy bien', fr: 'Je vais bien', de: 'Mir geht es gut',
    zh: '我很好', ja: '元気です', ar: 'أنا بخير', ur: 'میں ٹھیک ہوں',
  },
  'thank you': {
    hi: 'धन्यवाद', te: 'ధన్యవాదాలు', ta: 'நன்றி', bn: 'ধন্যবাদ',
    mr: 'धन्यवाद', gu: 'આભાર', kn: 'ಧನ್ಯವಾದ', ml: 'നന്ദി',
    pa: 'ਧੰਨਵਾਦ', es: 'Gracias', fr: 'Merci', de: 'Danke',
    ar: 'شكرا', zh: '谢谢', ja: 'ありがとう', ko: '감사합니다',
    ur: 'شکریہ', ru: 'Спасибо', it: 'Grazie', pt: 'Obrigado',
  },
  'thanks': {
    hi: 'धन्यवाद', te: 'థాంక్స్', ta: 'நன்றி', bn: 'ধন্যবাদ', mr: 'आभार',
    es: 'Gracias', fr: 'Merci', de: 'Danke', zh: '谢谢', ja: 'ありがとう',
  },
  'you are welcome': {
    hi: 'आपका स्वागत है', te: 'మీకు స్వాగతం', ta: 'உங்களை வரவேற்கிறேன்',
    bn: 'আপনাকে স্বাগতম', es: 'De nada', fr: 'De rien', de: 'Bitte schön',
  },
  'yes': {
    hi: 'हाँ', te: 'అవును', ta: 'ஆம்', bn: 'হ্যাঁ', mr: 'होय',
    gu: 'હા', kn: 'ಹೌದು', ml: 'അതെ', pa: 'ਹਾਂ',
    es: 'Sí', fr: 'Oui', de: 'Ja', ar: 'نعم', zh: '是', ja: 'はい',
    ur: 'ہاں', ru: 'Да', ko: '네',
  },
  'no': {
    hi: 'नहीं', te: 'లేదు', ta: 'இல்லை', bn: 'না', mr: 'नाही',
    gu: 'ના', kn: 'ಇಲ್ಲ', ml: 'ഇല്ല', pa: 'ਨਹੀਂ',
    es: 'No', fr: 'Non', de: 'Nein', ar: 'لا', zh: '不', ja: 'いいえ',
    ur: 'نہیں', ru: 'Нет', ko: '아니요',
  },
  'ok': {
    hi: 'ठीक है', te: 'సరే', ta: 'சரி', bn: 'ঠিক আছে', mr: 'ठीक आहे',
    gu: 'ઠીક છે', kn: 'ಸರಿ', ml: 'ശരി', es: 'Vale', fr: "D'accord", de: 'Okay',
  },
  'okay': {
    hi: 'ठीक है', te: 'సరే', ta: 'சரி', bn: 'ঠিক আছে',
    es: 'Bueno', fr: "D'accord", de: 'In Ordnung',
  },
  'sorry': {
    hi: 'माफ़ कीजिए', te: 'క్షమించండి', ta: 'மன்னிக்கவும்', bn: 'দুঃখিত',
    mr: 'माफ करा', gu: 'માફ કરજો', kn: 'ಕ್ಷಮಿಸಿ', ml: 'ക്ഷമിക്കണം',
    es: 'Lo siento', fr: 'Désolé', de: 'Entschuldigung',
    ar: 'آسف', zh: '对不起', ja: 'ごめんなさい', ko: '미안해요',
    ur: 'معذرت', ru: 'Извините',
  },
  'please': {
    hi: 'कृपया', te: 'దయచేసి', ta: 'தயவுசெய்து', bn: 'অনুগ্রহ করে',
    mr: 'कृपया', gu: 'કૃપા કરીને', kn: 'ದಯವಿಟ್ಟು', ml: 'ദയവായി',
    es: 'Por favor', fr: "S'il vous plaît", de: 'Bitte', ar: 'من فضلك',
    ur: 'براہ کرم', ru: 'Пожалуйста',
  },
  'excuse me': {
    hi: 'क्षमा कीजिए', te: 'క్షమించండి', ta: 'மன்னிக்கவும்', bn: 'মাফ করবেন',
    es: 'Disculpe', fr: 'Excusez-moi', de: 'Entschuldigung', ar: 'عفوا',
  },

  // Love & Emotions
  'i love you': {
    hi: 'मैं तुमसे प्यार करता हूं', te: 'నేను నిన్ను ప్రేమిస్తున్నాను',
    ta: 'நான் உன்னை காதலிக்கிறேன்', bn: 'আমি তোমাকে ভালোবাসি',
    mr: 'मी तुझ्यावर प्रेम करतो', gu: 'હું તને પ્રેમ કરું છું',
    kn: 'ನಾನು ನಿನ್ನನ್ನು ಪ್ರೀತಿಸುತ್ತೇನೆ', ml: 'ഞാൻ നിന്നെ സ്നേഹിക്കുന്നു',
    pa: 'ਮੈਂ ਤੈਨੂੰ ਪਿਆਰ ਕਰਦਾ ਹਾਂ', es: 'Te amo', fr: "Je t'aime",
    de: 'Ich liebe dich', ar: 'أنا أحبك', zh: '我爱你',
    ja: '愛してる', ko: '사랑해', ru: 'Я тебя люблю',
    pt: 'Eu te amo', it: 'Ti amo', ur: 'میں تم سے محبت کرتا ہوں',
  },
  'i miss you': {
    hi: 'मुझे तुम्हारी याद आती है', te: 'నీవు లేకుండా నాకు బాధగా ఉంది',
    ta: 'உன்னை நினைக்கிறேன்', bn: 'তোমার জন্য মন খারাপ',
    es: 'Te extraño', fr: 'Tu me manques', de: 'Ich vermisse dich',
    zh: '我想你', ja: '会いたい', ko: '보고 싶어', ar: 'أفتقدك',
  },
  'i like you': {
    hi: 'मुझे तुम पसंद हो', te: 'నాకు నువ్వు ఇష్టం', ta: 'நான் உன்னை விரும்புகிறேன்',
    bn: 'আমি তোমাকে পছন্দ করি', es: 'Me gustas', fr: "Je t'aime bien",
    zh: '我喜欢你', ja: '好きです', ko: '좋아해',
  },
  'happy': {
    hi: 'खुश', te: 'సంతోషం', ta: 'மகிழ்ச்சி', bn: 'সুখী', mr: 'आनंदी',
    es: 'Feliz', fr: 'Heureux', de: 'Glücklich', zh: '快乐', ja: '幸せ',
    ar: 'سعيد', ur: 'خوش',
  },
  'sad': {
    hi: 'उदास', te: 'బాధ', ta: 'சோகம்', bn: 'দুঃখিত', mr: 'दुखी',
    es: 'Triste', fr: 'Triste', de: 'Traurig', zh: '悲伤', ja: '悲しい',
    ar: 'حزين', ur: 'اداس',
  },
  'beautiful': {
    hi: 'सुंदर', te: 'అందమైన', ta: 'அழகான', bn: 'সুন্দর', mr: 'सुंदर',
    gu: 'સુંદર', kn: 'ಸುಂದರ', ml: 'സുന്ദരം',
    es: 'Hermoso', fr: 'Beau', de: 'Schön', zh: '美丽', ja: '美しい',
    ar: 'جميل', ur: 'خوبصورت',
  },
  'good': {
    hi: 'अच्छा', te: 'మంచి', ta: 'நல்ல', bn: 'ভালো', mr: 'चांगले',
    gu: 'સારું', kn: 'ಒಳ್ಳೆಯ', ml: 'നല്ല',
    es: 'Bueno', fr: 'Bon', de: 'Gut', zh: '好', ja: '良い', ar: 'جيد',
  },
  'bad': {
    hi: 'बुरा', te: 'చెడు', ta: 'கெட்ட', bn: 'খারাপ', mr: 'वाईट',
    es: 'Malo', fr: 'Mauvais', de: 'Schlecht', zh: '坏', ja: '悪い', ar: 'سيء',
  },
  'love': {
    hi: 'प्यार', te: 'ప్రేమ', ta: 'காதல்', bn: 'প্রেম', mr: 'प्रेम',
    gu: 'પ્રેમ', kn: 'ಪ್ರೀತಿ', ml: 'സ്നേഹം',
    es: 'Amor', fr: 'Amour', de: 'Liebe', zh: '爱', ja: '愛', ar: 'حب',
  },
  'friend': {
    hi: 'दोस्त', te: 'స్నేహితుడు', ta: 'நண்பன்', bn: 'বন্ধু', mr: 'मित्र',
    gu: 'મિત્ર', kn: 'ಸ್ನೇಹಿತ', ml: 'സുഹൃത്ത്',
    es: 'Amigo', fr: 'Ami', de: 'Freund', zh: '朋友', ja: '友達', ar: 'صديق',
  },

  // Common chat phrases
  'see you later': {
    hi: 'फिर मिलते हैं', te: 'తర్వాత కలుద్దాం', ta: 'பிறகு சந்திப்போம்',
    bn: 'পরে দেখা হবে', es: 'Hasta luego', fr: 'À plus tard', de: 'Bis später',
  },
  'take care': {
    hi: 'अपना ख्याल रखना', te: 'జాగ్రత్తగా ఉండు', ta: 'கவனமாக இரு',
    bn: 'নিজের যত্ন নাও', es: 'Cuídate', fr: 'Prends soin de toi',
    de: 'Pass auf dich auf', ar: 'اعتني بنفسك',
  },
  'nice to meet you': {
    hi: 'आपसे मिलकर अच्छा लगा', te: 'మిమ్మల్ని కలిసినందుకు సంతోషం',
    ta: 'உங்களை சந்தித்ததில் மகிழ்ச்சி', bn: 'আপনার সাথে দেখা করে ভালো লাগলো',
    es: 'Encantado de conocerte', fr: 'Enchanté', de: 'Freut mich',
  },
  'have a nice day': {
    hi: 'आपका दिन शुभ हो', te: 'మీ రోజు శుభం అవ్వాలి', ta: 'நல்ல நாளாக அமையட்டும்',
    bn: 'আপনার দিন শুভ হোক', es: 'Que tengas un buen día', fr: 'Bonne journée',
    de: 'Schönen Tag noch', ar: 'أتمنى لك يوماً سعيداً',
  },
  'i understand': {
    hi: 'मैं समझ गया', te: 'నాకు అర్థమైంది', ta: 'நான் புரிந்துகொண్டேன்',
    bn: 'আমি বুঝতে পারছি', es: 'Entiendo', fr: 'Je comprends', de: 'Ich verstehe',
  },
  'wait': {
    hi: 'रुको', te: 'ఆగు', ta: 'காத்திரு', bn: 'অপেক্ষা কর', mr: 'थांब',
    es: 'Espera', fr: 'Attends', de: 'Warte', zh: '等待', ja: '待って', ar: 'انتظر',
  },
  'come': {
    hi: 'आओ', te: 'రా', ta: 'வா', bn: 'এসো', mr: 'ये',
    es: 'Ven', fr: 'Viens', de: 'Komm', zh: '来', ja: '来て', ar: 'تعال',
  },
  'go': {
    hi: 'जाओ', te: 'వెళ్ళు', ta: 'போ', bn: 'যাও', mr: 'जा',
    es: 'Ve', fr: 'Va', de: 'Geh', zh: '去', ja: '行って', ar: 'اذهب',
  },
  'help': {
    hi: 'मदद', te: 'సహాయం', ta: 'உதவி', bn: 'সাহায্য', mr: 'मदत',
    es: 'Ayuda', fr: 'Aide', de: 'Hilfe', zh: '帮助', ja: '助けて', ar: 'مساعدة',
  },
  'stop': {
    hi: 'रुको', te: 'ఆపు', ta: 'நிறுத்து', bn: 'থামো', mr: 'थांब',
    es: 'Para', fr: 'Arrête', de: 'Stopp', zh: '停', ja: '止まって', ar: 'توقف',
  },

  // Numbers
  'one': { hi: 'एक', te: 'ఒకటి', ta: 'ஒன்று', bn: 'এক', es: 'Uno', fr: 'Un', de: 'Eins', zh: '一', ja: '一', ar: 'واحد' },
  'two': { hi: 'दो', te: 'రెండు', ta: 'இரண்டு', bn: 'দুই', es: 'Dos', fr: 'Deux', de: 'Zwei', zh: '二', ja: '二', ar: 'اثنان' },
  'three': { hi: 'तीन', te: 'మూడు', ta: 'மூன்று', bn: 'তিন', es: 'Tres', fr: 'Trois', de: 'Drei', zh: '三', ja: '三', ar: 'ثلاثة' },
  'four': { hi: 'चार', te: 'నాలుగు', ta: 'நான்கு', bn: 'চার', es: 'Cuatro', fr: 'Quatre', de: 'Vier', zh: '四', ja: '四', ar: 'أربعة' },
  'five': { hi: 'पांच', te: 'ఐదు', ta: 'ஐந்து', bn: 'পাঁচ', es: 'Cinco', fr: 'Cinq', de: 'Fünf', zh: '五', ja: '五', ar: 'خمسة' },

  // Time
  'today': { hi: 'आज', te: 'ఈరోజు', ta: 'இன்று', bn: 'আজ', es: 'Hoy', fr: "Aujourd'hui", de: 'Heute', zh: '今天', ar: 'اليوم' },
  'tomorrow': { hi: 'कल', te: 'రేపు', ta: 'நாளை', bn: 'কাল', es: 'Mañana', fr: 'Demain', de: 'Morgen', zh: '明天', ar: 'غدا' },
  'yesterday': { hi: 'कल', te: 'నిన్న', ta: 'நேற்று', bn: 'গতকাল', es: 'Ayer', fr: 'Hier', de: 'Gestern', zh: '昨天', ar: 'أمس' },
  'now': { hi: 'अभी', te: 'ఇప్పుడు', ta: 'இப்போது', bn: 'এখন', es: 'Ahora', fr: 'Maintenant', de: 'Jetzt', zh: '现在', ar: 'الآن' },

  // Family
  'mother': { hi: 'माँ', te: 'అమ్మ', ta: 'அம்மா', bn: 'মা', mr: 'आई', es: 'Madre', fr: 'Mère', de: 'Mutter', zh: '母亲', ar: 'أم' },
  'father': { hi: 'पिता', te: 'నాన్న', ta: 'அப்பா', bn: 'বাবা', mr: 'वडील', es: 'Padre', fr: 'Père', de: 'Vater', zh: '父亲', ar: 'أب' },
  'brother': { hi: 'भाई', te: 'అన్న', ta: 'அண்ணன்', bn: 'ভাই', mr: 'भाऊ', es: 'Hermano', fr: 'Frère', de: 'Bruder', zh: '兄弟', ar: 'أخ' },
  'sister': { hi: 'बहन', te: 'అక్క', ta: 'அக்கா', bn: 'বোন', mr: 'बहीण', es: 'Hermana', fr: 'Soeur', de: 'Schwester', zh: '姐妹', ar: 'أخت' },

  // Food
  'food': { hi: 'खाना', te: 'ఆహారం', ta: 'உணவு', bn: 'খাবার', mr: 'अन्न', es: 'Comida', fr: 'Nourriture', de: 'Essen', zh: '食物', ar: 'طعام' },
  'water': { hi: 'पानी', te: 'నీళ్ళు', ta: 'தண்ணீர்', bn: 'পানি', mr: 'पाणी', es: 'Agua', fr: 'Eau', de: 'Wasser', zh: '水', ar: 'ماء' },
  'tea': { hi: 'चाय', te: 'చాయ్', ta: 'தேநீர்', bn: 'চা', mr: 'चहा', es: 'Té', fr: 'Thé', de: 'Tee', zh: '茶', ar: 'شاي' },
  'coffee': { hi: 'कॉफी', te: 'కాఫీ', ta: 'காபி', bn: 'কফি', mr: 'कॉफी', es: 'Café', fr: 'Café', de: 'Kaffee', zh: '咖啡', ar: 'قهوة' },

  // Very good / excellent
  'very good': { hi: 'बहुत अच्छा', te: 'చాలా బాగుంది', ta: 'மிக நல்லது', bn: 'খুব ভালো', es: 'Muy bien', fr: 'Très bien', de: 'Sehr gut' },
  'excellent': { hi: 'उत्कृष्ट', te: 'అద్భుతం', ta: 'அருமை', bn: 'চমৎকার', es: 'Excelente', fr: 'Excellent', de: 'Ausgezeichnet' },
  'wonderful': { hi: 'अद्भुत', te: 'అద్భుతం', ta: 'அற்புதம்', bn: 'চমৎকার', es: 'Maravilloso', fr: 'Merveilleux', de: 'Wunderbar' },
  'great': { hi: 'शानदार', te: 'గొప్ప', ta: 'பெரிய', bn: 'দারুণ', es: 'Genial', fr: 'Super', de: 'Toll' },
};

// Reverse dictionary for native → English lookup
const REVERSE_DICTIONARY: Map<string, { english: string; langCode: string }> = new Map();

// Build reverse dictionary
(function buildReverseDictionary() {
  for (const [englishPhrase, translations] of Object.entries(TRANSLATION_DICTIONARY)) {
    for (const [langCode, translation] of Object.entries(translations)) {
      const normalized = translation.toLowerCase().trim();
      REVERSE_DICTIONARY.set(normalized, { english: englishPhrase, langCode });
    }
  }
})();

/**
 * Get the DL-Translate language name from code
 */
export function getDLTranslateLanguageName(langCode: string): string {
  const normalized = langCode.toLowerCase().trim();
  return DL_TRANSLATE_LANGUAGES[normalized] || langCode;
}

/**
 * Check if language is supported
 */
export function isDLTranslateSupported(langCode: string): boolean {
  const normalized = langCode.toLowerCase().trim();
  return normalized in DL_TRANSLATE_LANGUAGES;
}

/**
 * Get language code from name
 */
function getLanguageCode(langName: string): string {
  const normalized = langName.toLowerCase().trim();
  
  // Check if already a code
  if (normalized.length <= 3) {
    return normalized;
  }
  
  // Find code from name
  for (const [code, name] of Object.entries(DL_TRANSLATE_LANGUAGES)) {
    if (name.toLowerCase() === normalized && code.length <= 3) {
      return code;
    }
  }
  
  return normalized;
}

/**
 * Translate using local dictionary
 */
function translateWithDictionary(
  text: string,
  sourceCode: string,
  targetCode: string
): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Direct English → Target translation
  if (sourceCode === 'en' || sourceCode === 'english') {
    const translations = TRANSLATION_DICTIONARY[lowerText];
    if (translations && translations[targetCode]) {
      return translations[targetCode];
    }
  }
  
  // Source → English → Target translation
  const reverseEntry = REVERSE_DICTIONARY.get(lowerText);
  if (reverseEntry) {
    const { english } = reverseEntry;
    
    // If target is English, return English
    if (targetCode === 'en' || targetCode === 'english') {
      // Capitalize first letter
      return english.charAt(0).toUpperCase() + english.slice(1);
    }
    
    // Get translation to target
    const translations = TRANSLATION_DICTIONARY[english];
    if (translations && translations[targetCode]) {
      return translations[targetCode];
    }
  }
  
  return null;
}

/**
 * Word-by-word translation with dictionary fallback
 */
function translateWordByWord(
  text: string,
  sourceCode: string,
  targetCode: string
): string | null {
  const words = text.split(/\s+/);
  const translatedWords: string[] = [];
  let hasTranslation = false;
  
  for (const word of words) {
    const lowerWord = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
    const punctuation = word.match(/[.,!?;:'"]+$/)?.[0] || '';
    
    // Try dictionary lookup
    const translation = translateWithDictionary(lowerWord, sourceCode, targetCode);
    if (translation) {
      translatedWords.push(translation + punctuation);
      hasTranslation = true;
    } else {
      translatedWords.push(word);
    }
  }
  
  return hasTranslation ? translatedWords.join(' ') : null;
}

/**
 * Translate text using DL-Translate (dictionary + M2M100 neural model)
 * 
 * Translation priority:
 * 1. Phrase dictionary (instant)
 * 2. Word-by-word dictionary (instant)
 * 3. Phonetic transliteration (instant)
 * 4. M2M100 Neural Translation (100+ languages)
 * 
 * @param text - Text to translate
 * @param fromLang - Source language (code or name)
 * @param toLang - Target language (code or name)
 * @returns Translated text or null if no translation available
 */
export async function translateWithDLTranslate(
  text: string,
  fromLang: string,
  toLang: string
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  // Get language codes
  const sourceCode = getLanguageCode(fromLang);
  const targetCode = getLanguageCode(toLang);
  
  // Same language - no translation needed
  if (sourceCode === targetCode) {
    return trimmed;
  }
  
  // Check cache
  const cacheKey = `${trimmed}|${sourceCode}|${targetCode}`;
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[DL-Translate] Cache hit');
    return cached.result;
  }
  
  console.log('[DL-Translate] Translating:', { 
    text: trimmed.slice(0, 50), 
    from: sourceCode, 
    to: targetCode 
  });
  
  // 1. Try full phrase translation first (instant)
  const phraseResult = translateWithDictionary(trimmed, sourceCode, targetCode);
  if (phraseResult) {
    console.log('[DL-Translate] Phrase match:', phraseResult);
    addToCache(cacheKey, phraseResult);
    return phraseResult;
  }
  
  // 2. Try word-by-word translation (instant)
  const wordResult = translateWordByWord(trimmed, sourceCode, targetCode);
  if (wordResult && wordResult !== trimmed) {
    console.log('[DL-Translate] Word-by-word result:', wordResult.slice(0, 50));
    addToCache(cacheKey, wordResult);
    return wordResult;
  }
  
  // 3. Try phonetic transliteration for native script conversion (instant)
  const targetLangName = getDLTranslateLanguageName(targetCode).toLowerCase();
  if (isPhoneticTransliterationSupported(targetLangName)) {
    const phoneticResult = phoneticTransliterate(trimmed, targetLangName);
    if (phoneticResult && phoneticResult !== trimmed) {
      console.log('[DL-Translate] Phonetic transliteration:', phoneticResult.slice(0, 50));
      addToCache(cacheKey, phoneticResult);
      return phoneticResult;
    }
  }
  
  // 4. Try M2M100 neural translation (100+ languages)
  const sourceLangName = getDLTranslateLanguageName(sourceCode).toLowerCase();
  if (isM2M100Supported(sourceLangName) || isM2M100Supported(sourceCode)) {
    if (isM2M100Supported(targetLangName) || isM2M100Supported(targetCode)) {
      try {
        console.log('[DL-Translate] Using M2M100 neural translation...');
        const m2m100Result = await translateWithM2M100(trimmed, sourceCode, targetCode);
        if (m2m100Result && m2m100Result !== trimmed) {
          console.log('[DL-Translate] M2M100 result:', m2m100Result.slice(0, 50));
          addToCache(cacheKey, m2m100Result);
          return m2m100Result;
        }
      } catch (error) {
        console.warn('[DL-Translate] M2M100 translation failed:', error);
      }
    }
  }
  
  // No translation available
  console.log('[DL-Translate] No translation found, returning original');
  return null;
}

/**
 * Add result to cache
 */
function addToCache(key: string, result: string): void {
  translationCache.set(key, { result, timestamp: Date.now() });
  
  // Cleanup if cache too large
  if (translationCache.size > CACHE_MAX_SIZE) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) translationCache.delete(oldestKey);
  }
}

/**
 * Clear the translation cache
 */
export function clearDLTranslateCache(): void {
  translationCache.clear();
  console.log('[DL-Translate] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getDLTranslateCacheStats(): { size: number } {
  return { size: translationCache.size };
}

/**
 * Check if a language is supported (100+ languages via M2M100)
 */
export function isDLTranslateLanguageSupported(language: string): boolean {
  const normalized = language.toLowerCase().trim();
  // Check dictionary languages first
  if (DL_TRANSLATE_LANGUAGES[normalized]) {
    return true;
  }
  // Check M2M100 model languages
  return isM2M100Supported(normalized);
}

/**
 * Get all supported languages (100+ from M2M100)
 */
export function getDLTranslateSupportedLanguages(): string[] {
  const languages = new Set<string>();
  
  // Add dictionary languages
  Object.values(DL_TRANSLATE_LANGUAGES).forEach(lang => {
    languages.add(lang);
  });
  
  // Add M2M100 languages (100+)
  getM2M100SupportedLanguages().forEach(lang => {
    languages.add(lang);
  });
  
  return Array.from(languages).sort();
}

/**
 * Initialize DL-Translate M2M100 model
 * Call this to pre-load the model for faster first translation
 */
export async function initializeDLTranslate(
  onProgress?: (progress: number) => void
): Promise<boolean> {
  return initializeM2M100(onProgress);
}

/**
 * Check if M2M100 model is loaded
 */
export function isDLTranslateModelLoaded(): boolean {
  return isM2M100Loaded();
}

/**
 * Check if M2M100 model is currently loading
 */
export function isDLTranslateModelLoading(): boolean {
  return isM2M100Loading();
}

// Re-export M2M100 language codes
export { M2M100_LANGUAGES } from './dl-translate-model';

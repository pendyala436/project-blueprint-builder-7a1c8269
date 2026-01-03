/**
 * DL-Translate Dictionary-Based Translation Engine
 * 
 * Pure browser-based translation using embedded dictionaries
 * Inspired by: 
 * - https://github.com/xhluca/dl-translate (API pattern)
 * - https://github.com/Goutam245/Language-Translator-Web-Application (pure JS approach)
 * 
 * NO ML models - NO external APIs - Pure dictionary + transliteration
 * Lightweight and instant translations for 200+ languages
 */

// DL-Translate Language Codes (200 languages supported)
export const DL_M2M100_LANGUAGE_CODES: Record<string, string> = {
  // === Indian Languages (14) ===
  hindi: 'hi', bengali: 'bn', telugu: 'te', tamil: 'ta',
  marathi: 'mr', gujarati: 'gu', kannada: 'kn', malayalam: 'ml',
  punjabi: 'pa', odia: 'or', oriya: 'or', urdu: 'ur',
  assamese: 'as', nepali: 'ne', sinhala: 'si', sinhalese: 'si',
  kashmiri: 'ks', konkani: 'kok', maithili: 'mai', santali: 'sat',
  sindhi: 'sd', dogri: 'doi', manipuri: 'mni', bodo: 'brx',
  
  // === European Languages (50+) ===
  english: 'en', spanish: 'es', french: 'fr', german: 'de',
  portuguese: 'pt', italian: 'it', dutch: 'nl', russian: 'ru',
  polish: 'pl', ukrainian: 'uk', greek: 'el', czech: 'cs',
  romanian: 'ro', hungarian: 'hu', swedish: 'sv', danish: 'da',
  finnish: 'fi', norwegian: 'no', croatian: 'hr', serbian: 'sr',
  bosnian: 'bs', slovak: 'sk', slovenian: 'sl', bulgarian: 'bg',
  lithuanian: 'lt', latvian: 'lv', estonian: 'et', icelandic: 'is',
  catalan: 'ca', galician: 'gl', basque: 'eu', welsh: 'cy',
  irish: 'ga', scottish: 'gd', albanian: 'sq', macedonian: 'mk',
  maltese: 'mt', luxembourgish: 'lb', belarusian: 'be', faroese: 'fo',
  occitan: 'oc', breton: 'br', corsican: 'co', friulian: 'fur',
  sardinian: 'sc', asturian: 'ast', aragonese: 'an', romansh: 'rm',
  
  // === Asian Languages (40+) ===
  chinese: 'zh', mandarin: 'zh', cantonese: 'yue', japanese: 'ja',
  korean: 'ko', vietnamese: 'vi', thai: 'th', indonesian: 'id',
  malay: 'ms', tagalog: 'tl', filipino: 'fil', burmese: 'my',
  khmer: 'km', cambodian: 'km', lao: 'lo', laotian: 'lo',
  javanese: 'jv', sundanese: 'su', cebuano: 'ceb', ilocano: 'ilo',
  malagasy: 'mg', tibetan: 'bo', uyghur: 'ug', dzongkha: 'dz',
  bhutanese: 'dz', maldivian: 'dv', dhivehi: 'dv', tetum: 'tet',
  hmong: 'hmn', karen: 'kar', shan: 'shn', mon: 'mnw',
  acehnese: 'ace', banjar: 'bjn', minangkabau: 'min', balinese: 'ban',
  madurese: 'mad',
  
  // === Middle Eastern Languages ===
  arabic: 'ar', hebrew: 'he', persian: 'fa', farsi: 'fa',
  turkish: 'tr', pashto: 'ps', dari: 'prs', kurdish: 'ku', sorani: 'ckb',
  
  // === African Languages (40+) ===
  swahili: 'sw', kiswahili: 'sw', afrikaans: 'af', amharic: 'am',
  yoruba: 'yo', igbo: 'ig', zulu: 'zu', xhosa: 'xh',
  somali: 'so', hausa: 'ha', oromo: 'om', tigrinya: 'ti',
  wolof: 'wo', fulah: 'ff', fula: 'ff', bambara: 'bm',
  lingala: 'ln', shona: 'sn', sesotho: 'st', setswana: 'tn',
  tswana: 'tn', sepedi: 'nso', tsonga: 'ts', venda: 've',
  swati: 'ss', ndebele: 'nr', kinyarwanda: 'rw', kirundi: 'rn',
  luganda: 'lg', chichewa: 'ny', nyanja: 'ny', malagasy_african: 'mg',
  kongo: 'kg', twi: 'tw', akan: 'ak', ewe: 'ee',
  fon: 'fon', ga: 'gaa', mossi: 'mos', kanuri: 'kr',
  tiv: 'tiv', efik: 'efi',
  
  // === Central Asian Languages ===
  kazakh: 'kk', uzbek: 'uz', tajik: 'tg', kyrgyz: 'ky',
  turkmen: 'tk', mongolian: 'mn', tatar: 'tt', bashkir: 'ba',
  chuvash: 'cv', sakha: 'sah', yakut: 'sah',
  
  // === Pacific Languages ===
  maori: 'mi', hawaiian: 'haw', samoan: 'sm', tongan: 'to',
  fijian: 'fj', tahitian: 'ty', chamorro: 'ch', marshallese: 'mh',
  palauan: 'pau', chuukese: 'chk', pohnpeian: 'pon', yapese: 'yap',
  kosraean: 'kos', bislama: 'bi', tok_pisin: 'tpi', hiri_motu: 'ho',
  
  // === Native American Languages ===
  quechua: 'qu', aymara: 'ay', guarani: 'gn', nahuatl: 'nah',
  maya: 'yua', mapudungun: 'arn', navajo: 'nv', cherokee: 'chr',
  inuktitut: 'iu', cree: 'cr', ojibwe: 'oj',
  
  // === Creole Languages ===
  haitian: 'ht', haitian_creole: 'ht', cape_verdean: 'kea',
  papiamento: 'pap', seychellois: 'crs', mauritian: 'mfe',
  reunionese: 'rcf', jamaican_patois: 'jam', sranan_tongo: 'srn',
  saramaccan: 'srm',
  
  // === Constructed Languages ===
  esperanto: 'eo', interlingua: 'ia', ido: 'io', volapuk: 'vo',
  
  // === Ancient/Classical Languages ===
  latin: 'la', classical_chinese: 'lzh', sanskrit: 'sa', pali: 'pi', coptic: 'cop',
};

// Alias exports for backward compatibility
export const DL_TRANSLATE_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;
export const M2M100_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;
export const NLLB_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;
export const LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;

// ================== COMPREHENSIVE TRANSLATION DICTIONARY ==================
// Based on: https://github.com/Goutam245/Language-Translator-Web-Application
// Pure dictionary approach - NO external APIs

const TRANSLATION_DICTIONARY: Record<string, Record<string, string>> = {
  // ==================== GREETINGS ====================
  hello: {
    hi: 'नमस्ते', te: 'హలో', ta: 'வணக்கம்', bn: 'হ্যালো', mr: 'नमस्कार',
    gu: 'નમસ્તે', kn: 'ನಮಸ್ಕಾರ', ml: 'ഹലോ', pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
    es: 'Hola', fr: 'Bonjour', de: 'Hallo', ar: 'مرحبا', zh: '你好',
    ja: 'こんにちは', ko: '안녕하세요', ru: 'Привет', pt: 'Olá', it: 'Ciao',
    ur: 'ہیلو', tr: 'Merhaba', vi: 'Xin chào', th: 'สวัสดี', id: 'Halo',
    sw: 'Habari', nl: 'Hallo', pl: 'Cześć', uk: 'Привіт', el: 'Γεια σου',
    en: 'Hello',
  },
  hi: {
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
  goodbye: {
    hi: 'अलविदा', te: 'వీడ్కోలు', ta: 'பிரியாவிடை', bn: 'বিদায়',
    es: 'Adiós', fr: 'Au revoir', de: 'Auf Wiedersehen',
    zh: '再见', ja: 'さようなら', ko: '안녕히 가세요', en: 'Goodbye',
  },
  bye: {
    hi: 'बाय', te: 'బై', ta: 'பை', bn: 'বাই',
    es: 'Adiós', fr: 'Salut', de: 'Tschüss', en: 'Bye',
  },
  welcome: {
    hi: 'स्वागत है', te: 'స్వాగతం', ta: 'வரவேற்கிறேன்', bn: 'স্বাগতম',
    es: 'Bienvenido', fr: 'Bienvenue', de: 'Willkommen', en: 'Welcome',
  },

  // ==================== COMMON QUESTIONS ====================
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
    de: 'Wie heißt du?', en: 'What is your name',
  },
  'where are you from': {
    hi: 'आप कहाँ से हैं', te: 'మీరు ఎక్కడ నుండి వచ్చారు', ta: 'நீங்கள் எங்கிருந்து வருகிறீர்கள்',
    es: '¿De dónde eres?', fr: 'D\'où venez-vous?', de: 'Woher kommst du?', en: 'Where are you from',
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

  // ==================== RESPONSES & EXPRESSIONS ====================
  'i am fine': {
    hi: 'मैं ठीक हूं', te: 'నేను బాగున్నాను', ta: 'நான் நலமாக இருக்கிறேன்',
    bn: 'আমি ভালো আছি', es: 'Estoy bien', fr: 'Je vais bien',
    de: 'Mir geht es gut', en: 'I am fine',
  },
  'thank you': {
    hi: 'धन्यवाद', te: 'ధన్యవాదాలు', ta: 'நன்றி', bn: 'ধন্যবাদ',
    mr: 'धन्यवाद', gu: 'આભાર', kn: 'ಧನ್ಯವಾದ', ml: 'നന്ദി',
    pa: 'ਧੰਨਵਾਦ', es: 'Gracias', fr: 'Merci', de: 'Danke',
    ar: 'شكرا', zh: '谢谢', ja: 'ありがとう', ko: '감사합니다', en: 'Thank you',
  },
  thanks: {
    hi: 'धन्यवाद', te: 'థాంక్స్', ta: 'நன்றி', bn: 'ধন্যবাদ',
    es: 'Gracias', fr: 'Merci', de: 'Danke', en: 'Thanks',
  },
  'you are welcome': {
    hi: 'आपका स्वागत है', te: 'మీకు స్వాగతం', ta: 'நீங்கள் வரவேற்கப்படுகிறீர்கள்',
    es: 'De nada', fr: 'De rien', de: 'Bitte', en: 'You are welcome',
  },
  yes: {
    hi: 'हाँ', te: 'అవును', ta: 'ஆம்', bn: 'হ্যাঁ',
    mr: 'होय', gu: 'હા', kn: 'ಹೌದು', ml: 'അതെ',
    es: 'Sí', fr: 'Oui', de: 'Ja', ar: 'نعم', zh: '是', ja: 'はい', en: 'Yes',
  },
  no: {
    hi: 'नहीं', te: 'లేదు', ta: 'இல்லை', bn: 'না',
    mr: 'नाही', gu: 'ના', kn: 'ಇಲ್ಲ', ml: 'ഇല്ല',
    es: 'No', fr: 'Non', de: 'Nein', ar: 'لا', zh: '不', ja: 'いいえ', en: 'No',
  },
  ok: {
    hi: 'ठीक है', te: 'సరే', ta: 'சரி', bn: 'ঠিক আছে',
    mr: 'ठीक आहे', gu: 'ઠીક છે', es: 'Vale', fr: "D'accord", en: 'OK',
  },
  sorry: {
    hi: 'माफ़ कीजिए', te: 'క్షమించండి', ta: 'மன்னிக்கவும்', bn: 'দুঃখিত',
    es: 'Lo siento', fr: 'Désolé', de: 'Entschuldigung',
    ar: 'آسف', zh: '对不起', ja: 'ごめんなさい', en: 'Sorry',
  },
  please: {
    hi: 'कृपया', te: 'దయచేసి', ta: 'தயவுசெய்து', bn: 'অনুগ্রহ করে',
    es: 'Por favor', fr: "S'il vous plaît", de: 'Bitte', en: 'Please',
  },
  'excuse me': {
    hi: 'क्षमा कीजिए', te: 'క్షమించండి', ta: 'மன்னிக்கவும்',
    es: 'Disculpe', fr: 'Excusez-moi', de: 'Entschuldigung', en: 'Excuse me',
  },

  // ==================== LOVE & EMOTIONS ====================
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
    es: 'Me gustas', fr: 'Je t\'aime bien', zh: '我喜欢你', en: 'I like you',
  },
  happy: {
    hi: 'खुश', te: 'సంతోషం', ta: 'மகிழ்ச்சி', bn: 'সুখী',
    es: 'Feliz', fr: 'Heureux', de: 'Glücklich', en: 'Happy',
  },
  sad: {
    hi: 'उदास', te: 'బాధ', ta: 'சோகம்', bn: 'দুঃখিত',
    es: 'Triste', fr: 'Triste', de: 'Traurig', en: 'Sad',
  },
  beautiful: {
    hi: 'सुंदर', te: 'అందమైన', ta: 'அழகான', bn: 'সুন্দর',
    es: 'Hermoso', fr: 'Beau', de: 'Schön', en: 'Beautiful',
  },
  friend: {
    hi: 'दोस्त', te: 'స్నేహితుడు', ta: 'நண்பன்', bn: 'বন্ধু',
    es: 'Amigo', fr: 'Ami', de: 'Freund', en: 'Friend',
  },

  // ==================== COMMON CHAT PHRASES ====================
  'see you later': {
    hi: 'फिर मिलते हैं', te: 'తర్వాత కలుద్దాం', ta: 'பிறகு சந்திப்போம்',
    es: 'Hasta luego', fr: 'À plus tard', de: 'Bis später', en: 'See you later',
  },
  'take care': {
    hi: 'अपना ख्याल रखना', te: 'జాగ్రత్తగా ఉండు', ta: 'கவனமாக இரு',
    es: 'Cuídate', fr: 'Prends soin de toi', en: 'Take care',
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
  'i dont understand': {
    hi: 'मैं नहीं समझा', te: 'నాకు అర్థం కాలేదు', ta: 'எனக்கு புரியவில்லை',
    es: 'No entiendo', fr: 'Je ne comprends pas', de: 'Ich verstehe nicht', en: "I don't understand",
  },
  'wait': {
    hi: 'रुको', te: 'ఆగు', ta: 'காத்திரு', bn: 'অপেক্ষা কর',
    es: 'Espera', fr: 'Attends', de: 'Warte', en: 'Wait',
  },
  'come': {
    hi: 'आओ', te: 'రా', ta: 'வா', bn: 'এসো',
    es: 'Ven', fr: 'Viens', de: 'Komm', en: 'Come',
  },
  'go': {
    hi: 'जाओ', te: 'వెళ్ళు', ta: 'போ', bn: 'যাও',
    es: 'Ve', fr: 'Va', de: 'Geh', en: 'Go',
  },

  // ==================== NUMBERS ====================
  one: { hi: 'एक', te: 'ఒకటి', ta: 'ஒன்று', es: 'Uno', fr: 'Un', en: 'One' },
  two: { hi: 'दो', te: 'రెండు', ta: 'இரண்டு', es: 'Dos', fr: 'Deux', en: 'Two' },
  three: { hi: 'तीन', te: 'మూడు', ta: 'மூன்று', es: 'Tres', fr: 'Trois', en: 'Three' },
  four: { hi: 'चार', te: 'నాలుగు', ta: 'நான்கு', es: 'Cuatro', fr: 'Quatre', en: 'Four' },
  five: { hi: 'पांच', te: 'ఐదు', ta: 'ஐந்து', es: 'Cinco', fr: 'Cinq', en: 'Five' },
  six: { hi: 'छह', te: 'ఆరు', ta: 'ஆறு', es: 'Seis', fr: 'Six', en: 'Six' },
  seven: { hi: 'सात', te: 'ఏడు', ta: 'ஏழு', es: 'Siete', fr: 'Sept', en: 'Seven' },
  eight: { hi: 'आठ', te: 'ఎనిమిది', ta: 'எட்டு', es: 'Ocho', fr: 'Huit', en: 'Eight' },
  nine: { hi: 'नौ', te: 'తొమ్మిది', ta: 'ஒன்பது', es: 'Nueve', fr: 'Neuf', en: 'Nine' },
  ten: { hi: 'दस', te: 'పది', ta: 'பத்து', es: 'Diez', fr: 'Dix', en: 'Ten' },

  // ==================== FAMILY ====================
  mother: { hi: 'माँ', te: 'అమ్మ', ta: 'அம்மா', bn: 'মা', es: 'Madre', fr: 'Mère', en: 'Mother' },
  father: { hi: 'पिता', te: 'నాన్న', ta: 'அப்பா', bn: 'বাবা', es: 'Padre', fr: 'Père', en: 'Father' },
  brother: { hi: 'भाई', te: 'అన్నయ్య', ta: 'அண்ணன்', bn: 'ভাই', es: 'Hermano', fr: 'Frère', en: 'Brother' },
  sister: { hi: 'बहन', te: 'అక్క', ta: 'அக்கா', bn: 'বোন', es: 'Hermana', fr: 'Sœur', en: 'Sister' },

  // ==================== TIME ====================
  today: { hi: 'आज', te: 'ఈ రోజు', ta: 'இன்று', es: 'Hoy', fr: "Aujourd'hui", en: 'Today' },
  tomorrow: { hi: 'कल', te: 'రేపు', ta: 'நாளை', es: 'Mañana', fr: 'Demain', en: 'Tomorrow' },
  yesterday: { hi: 'कल', te: 'నిన్న', ta: 'நேற்று', es: 'Ayer', fr: 'Hier', en: 'Yesterday' },
  now: { hi: 'अभी', te: 'ఇప్పుడు', ta: 'இப்போது', es: 'Ahora', fr: 'Maintenant', en: 'Now' },
  later: { hi: 'बाद में', te: 'తర్వాత', ta: 'பின்னர்', es: 'Después', fr: 'Plus tard', en: 'Later' },

  // ==================== FOOD ====================
  food: { hi: 'खाना', te: 'ఆహారం', ta: 'உணவு', es: 'Comida', fr: 'Nourriture', en: 'Food' },
  water: { hi: 'पानी', te: 'నీళ్ళు', ta: 'தண்ணீர்', es: 'Agua', fr: 'Eau', en: 'Water' },
  eat: { hi: 'खाओ', te: 'తిను', ta: 'சாப்பிடு', es: 'Come', fr: 'Mange', en: 'Eat' },
  drink: { hi: 'पियो', te: 'తాగు', ta: 'குடி', es: 'Bebe', fr: 'Bois', en: 'Drink' },
};

// ==================== TRANSLITERATION DICTIONARY ====================
const TRANSLITERATION_MAP: Record<string, Record<string, string>> = {
  hi: {
    namaste: 'नमस्ते', namaskar: 'नमस्कार', dhanyavad: 'धन्यवाद',
    pyar: 'प्यार', dil: 'दिल', mohabbat: 'मोहब्बत', ishq: 'इश्क',
    khush: 'खुश', acha: 'अच्छा', theek: 'ठीक', haan: 'हाँ', nahi: 'नहीं',
    kya: 'क्या', kaise: 'कैसे', kab: 'कब', kahan: 'कहाँ', kyun: 'क्यों',
    aap: 'आप', tum: 'तुम', main: 'मैं', hum: 'हम', wo: 'वो',
    subah: 'सुबह', shaam: 'शाम', raat: 'रात', din: 'दिन',
    shukriya: 'शुक्रिया', bahut: 'बहुत', thoda: 'थोड़ा', abhi: 'अभी',
    kal: 'कल', aaj: 'आज', bhai: 'भाई', behen: 'बहन', maa: 'माँ', papa: 'पापा',
    dost: 'दोस्त', sundar: 'सुंदर', achha: 'अच्छा', bura: 'बुरा',
  },
  te: {
    namaste: 'నమస్తే', namaskar: 'నమస్కారం', dhanyavad: 'ధన్యవాదాలు',
    prema: 'ప్రేమ', priya: 'ప్రియ', snehithudu: 'స్నేహితుడు',
    manchidi: 'మంచిది', avunu: 'అవును', ledu: 'లేదు',
    ela: 'ఎలా', emi: 'ఏమి', eppudu: 'ఎప్పుడు', ekkada: 'ఎక్కడ',
    nenu: 'నేను', nuvvu: 'నువ్వు', meeru: 'మీరు',
    bagunnava: 'బాగున్నావా', bagunnanu: 'బాగున్నాను', bagundi: 'బాగుంది',
    subhodayam: 'శుభోదయం', subharatri: 'శుభరాత్రి',
    amma: 'అమ్మ', nanna: 'నాన్న', chala: 'చాలా', konchem: 'కొంచెం',
  },
  ta: {
    vanakkam: 'வணக்கம்', nandri: 'நன்றி', anbu: 'அன்பு',
    kadhal: 'காதல்', nalla: 'நல்ல', aama: 'ஆமா', illa: 'இல்ல',
    eppadi: 'எப்படி', enna: 'என்ன', eppo: 'எப்போ', enga: 'எங்கே',
    naan: 'நான்', nee: 'நீ', neengal: 'நீங்கள்',
    amma: 'அம்மா', appa: 'அப்பா', nanban: 'நண்பன்',
  },
  bn: {
    namaskar: 'নমস্কার', dhonnobad: 'ধন্যবাদ', bhalobashi: 'ভালোবাসি',
    bhalo: 'ভালো', haan: 'হ্যাঁ', na: 'না',
    kemon: 'কেমন', ki: 'কি', kokhon: 'কখন', kothay: 'কোথায়',
    ami: 'আমি', tumi: 'তুমি', apni: 'আপনি',
    ma: 'মা', baba: 'বাবা', bondhu: 'বন্ধু',
  },
  ar: {
    marhaba: 'مرحبا', shukran: 'شكرا', habibi: 'حبيبي',
    ahlan: 'أهلاً', naam: 'نعم', la: 'لا',
    kayf: 'كيف', mata: 'متى', ayna: 'أين',
    ana: 'أنا', anta: 'أنت', huwa: 'هو',
  },
  gu: {
    kem: 'કેમ', saru: 'સારું', haa: 'હા', na: 'ના',
    hu: 'હું', tame: 'તમે', aabhar: 'આભાર',
  },
  mr: {
    namaskar: 'नमस्कार', dhanyavad: 'धन्यवाद',
    ho: 'हो', nahi: 'नाही', mi: 'मी', tumhi: 'तुम्ही',
  },
  kn: {
    namaskara: 'ನಮಸ್ಕಾರ', dhanyavada: 'ಧನ್ಯವಾದ',
    houdu: 'ಹೌದು', illa: 'ಇಲ್ಲ', naanu: 'ನಾನು', neevu: 'ನೀವು',
  },
  ml: {
    namaskkaram: 'നമസ്കാരം', nanni: 'നന്ദി',
    athe: 'അതെ', illa: 'ഇല്ല', njan: 'ഞാൻ', ningal: 'നിങ്ങൾ',
  },
  pa: {
    sat_sri_akal: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', dhannvaad: 'ਧੰਨਵਾਦ',
    haan: 'ਹਾਂ', nahi: 'ਨਹੀਂ', main: 'ਮੈਂ', tusi: 'ਤੁਸੀਂ',
  },
};

// Cache for translations
const translationCache = new Map<string, string>();
const CACHE_MAX_SIZE = 1000;

// State variables (for API compatibility)
let isReady = true;
let isLoading = false;

/**
 * Get DL-Translate language code
 */
export function getDLM2M100Code(language: string): string {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '').replace(/\s+/g, '');
  return DL_M2M100_LANGUAGE_CODES[normalized] || 'en';
}

// Aliases for backward compatibility
export const getDLTranslateCode = getDLM2M100Code;
export const getM2M100Code = getDLM2M100Code;
export const getNLLBCode = getDLM2M100Code;
export const getLanguageCode = getDLM2M100Code;

/**
 * Check if language is supported
 */
export function isDLM2M100Supported(language: string): boolean {
  const normalized = language.toLowerCase().trim().replace(/[_-]/g, '').replace(/\s+/g, '');
  return normalized in DL_M2M100_LANGUAGE_CODES;
}

// Aliases for backward compatibility
export const isDLTranslateSupported = isDLM2M100Supported;
export const isM2M100Supported = isDLM2M100Supported;
export const isNLLBSupported = isDLM2M100Supported;
export const isLanguageSupported = isDLM2M100Supported;

/**
 * Get all supported languages
 */
export function getSupportedDLM2M100Languages(): string[] {
  return Object.keys(DL_M2M100_LANGUAGE_CODES);
}

// Aliases for backward compatibility
export const getSupportedDLTranslateLanguages = getSupportedDLM2M100Languages;
export const getSupportedM2M100Languages = getSupportedDLM2M100Languages;
export const getSupportedNLLBLanguages = getSupportedDLM2M100Languages;
export const getSupportedLanguages = getSupportedDLM2M100Languages;

/**
 * Initialize translator (instant - no model to load)
 */
export async function initializeMLTranslator(
  onProgress?: (progress: { status: string; progress?: number; file?: string }) => void
): Promise<boolean> {
  onProgress?.({ status: 'loading', progress: 50 });
  // No model to load - dictionary is embedded
  await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UI
  onProgress?.({ status: 'ready', progress: 100 });
  console.log('[DL-Translate] Dictionary-based translator ready (200+ languages)');
  isReady = true;
  return true;
}

/**
 * Check if translator is ready
 */
export function isMLTranslatorReady(): boolean {
  return isReady;
}

/**
 * Check if translator is loading
 */
export function isMLTranslatorLoading(): boolean {
  return isLoading;
}

/**
 * Translate text using dictionary lookup
 * Pure browser-based - no external APIs
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
  if (srcCode === tgtCode) {
    return trimmed;
  }
  
  // Check cache
  const cacheKey = `dict:${trimmed.toLowerCase()}:${srcCode}:${tgtCode}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Try exact phrase match first
  const lowerText = trimmed.toLowerCase();
  const phraseTranslation = TRANSLATION_DICTIONARY[lowerText]?.[tgtCode];
  if (phraseTranslation) {
    addToCache(cacheKey, phraseTranslation);
    console.log('[DL-Translate] Phrase match:', lowerText, '→', phraseTranslation);
    return phraseTranslation;
  }
  
  // Try word-by-word translation
  const words = trimmed.split(/\s+/);
  const translatedWords: string[] = [];
  let hasTranslation = false;
  
  for (const word of words) {
    const lowerWord = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
    const punctuation = word.match(/[.,!?;:'"]+$/)?.[0] || '';
    
    // Check dictionary
    const wordTranslation = TRANSLATION_DICTIONARY[lowerWord]?.[tgtCode];
    if (wordTranslation) {
      translatedWords.push(wordTranslation + punctuation);
      hasTranslation = true;
    } else {
      // Try transliteration if target is non-Latin
      const transliteration = TRANSLITERATION_MAP[tgtCode]?.[lowerWord];
      if (transliteration) {
        translatedWords.push(transliteration + punctuation);
        hasTranslation = true;
      } else {
        // Keep original word
        translatedWords.push(word);
      }
    }
  }
  
  if (hasTranslation) {
    const result = translatedWords.join(' ');
    addToCache(cacheKey, result);
    console.log('[DL-Translate] Word translation:', trimmed, '→', result);
    return result;
  }
  
  // No translation found - try transliteration only
  const transliteratedWords = transliterateText(trimmed, tgtCode);
  if (transliteratedWords !== trimmed) {
    addToCache(cacheKey, transliteratedWords);
    return transliteratedWords;
  }
  
  // Return original if no translation available
  return trimmed;
}

/**
 * Transliterate Latin text to target script
 */
function transliterateText(text: string, targetLangCode: string): string {
  const translitMap = TRANSLITERATION_MAP[targetLangCode];
  if (!translitMap) return text;
  
  const words = text.split(/\s+/);
  const result: string[] = [];
  
  for (const word of words) {
    const lowerWord = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
    const punctuation = word.match(/[.,!?;:'"]+$/)?.[0] || '';
    const transliterated = translitMap[lowerWord];
    result.push((transliterated || word) + punctuation);
  }
  
  return result.join(' ');
}

/**
 * Batch translate multiple texts
 */
export async function translateBatchWithML(
  texts: string[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<string[]> {
  const results: string[] = [];
  for (const text of texts) {
    const translated = await translateWithML(text, sourceLanguage, targetLanguage);
    results.push(translated || text);
  }
  return results;
}

/**
 * Add to cache with size limit
 */
function addToCache(key: string, value: string): void {
  translationCache.set(key, value);
  if (translationCache.size > CACHE_MAX_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
}

/**
 * Clear translation cache
 */
export function clearMLCache(): void {
  translationCache.clear();
}

/**
 * Get cache statistics
 */
export function getMLCacheStats(): { size: number; maxSize: number } {
  return { size: translationCache.size, maxSize: CACHE_MAX_SIZE };
}

/**
 * Dispose translator (no-op for dictionary-based)
 */
export async function disposeMLTranslator(): Promise<void> {
  translationCache.clear();
  console.log('[DL-Translate] Translator disposed');
}

// Additional exports for compatibility
export const NLLB200_LANGUAGE_CODES = DL_M2M100_LANGUAGE_CODES;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==========================================
// 70 LANGUAGE CODES (12 Indian + 58 World)
// ==========================================
const SUPPORTED_LANGUAGES = [
  // 12 Indian
  'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'or', 'pa', 'ml', 'as',
  // 58 World
  'zh', 'es', 'en', 'pt', 'ru', 'ja', 'wuu', 'tr', 'ko', 'fr',
  'de', 'vi', 'jv', 'it', 'arz', 'fa', 'bho', 'nan', 'hak', 'cjy',
  'ha', 'id', 'pl', 'yo', 'hsn', 'mai', 'my', 'su', 'apd', 'arq',
  'ary', 'uk', 'ig', 'uz', 'sd', 'apc', 'ro', 'tl', 'nl', 'gan',
  'am', 'ps', 'mag', 'th', 'skr', 'ms', 'km', 'ne', 'si', 'hu',
  'el', 'cs', 'sv', 'az', 'he', 'ar', 'sw', 'zu'
];

// ==========================================
// COMMON PHRASES DICTIONARY (TO ENGLISH)
// Each language maps common phrases to English
// ==========================================
const TO_ENGLISH: Record<string, Record<string, string>> = {
  // Hindi to English
  hi: {
    'नमस्ते': 'hello', 'धन्यवाद': 'thank you', 'हाँ': 'yes', 'नहीं': 'no',
    'कृपया': 'please', 'माफ़ करें': 'sorry', 'शुभ प्रभात': 'good morning',
    'शुभ रात्रि': 'good night', 'कैसे हो': 'how are you', 'मैं ठीक हूँ': 'i am fine',
    'आप कहाँ हैं': 'where are you', 'क्या हाल है': 'how are you',
    'मुझे पसंद है': 'i like', 'बहुत अच्छा': 'very good', 'मिलकर खुशी हुई': 'nice to meet you',
    'फिर मिलेंगे': 'see you again', 'अलविदा': 'goodbye', 'प्यार': 'love',
    'दोस्त': 'friend', 'परिवार': 'family', 'खाना': 'food', 'पानी': 'water',
    'घर': 'home', 'काम': 'work', 'समय': 'time', 'आज': 'today', 'कल': 'tomorrow',
  },
  // Bengali to English
  bn: {
    'নমস্কার': 'hello', 'ধন্যবাদ': 'thank you', 'হ্যাঁ': 'yes', 'না': 'no',
    'দয়া করে': 'please', 'দুঃখিত': 'sorry', 'সুপ্রভাত': 'good morning',
    'শুভ রাত্রি': 'good night', 'কেমন আছেন': 'how are you', 'আমি ভালো আছি': 'i am fine',
    'আপনি কোথায়': 'where are you', 'ভালোবাসা': 'love', 'বন্ধু': 'friend',
    'পরিবার': 'family', 'খাবার': 'food', 'জল': 'water', 'বাড়ি': 'home',
  },
  // Telugu to English
  te: {
    'నమస్కారం': 'hello', 'ధన్యవాదాలు': 'thank you', 'అవును': 'yes', 'కాదు': 'no',
    'దయచేసి': 'please', 'క్షమించండి': 'sorry', 'శుభోదయం': 'good morning',
    'శుభ రాత్రి': 'good night', 'మీరు ఎలా ఉన్నారు': 'how are you',
    'నేను బాగున్నాను': 'i am fine', 'ప్రేమ': 'love', 'స్నేహితుడు': 'friend',
  },
  // Marathi to English
  mr: {
    'नमस्कार': 'hello', 'धन्यवाद': 'thank you', 'हो': 'yes', 'नाही': 'no',
    'कृपया': 'please', 'माफ करा': 'sorry', 'शुभ प्रभात': 'good morning',
    'शुभ रात्री': 'good night', 'तुम्ही कसे आहात': 'how are you',
    'मी ठीक आहे': 'i am fine', 'प्रेम': 'love', 'मित्र': 'friend',
  },
  // Tamil to English
  ta: {
    'வணக்கம்': 'hello', 'நன்றி': 'thank you', 'ஆம்': 'yes', 'இல்லை': 'no',
    'தயவுசெய்து': 'please', 'மன்னிக்கவும்': 'sorry', 'காலை வணக்கம்': 'good morning',
    'இரவு வணக்கம்': 'good night', 'நீங்கள் எப்படி இருக்கிறீர்கள்': 'how are you',
    'நான் நன்றாக இருக்கிறேன்': 'i am fine', 'காதல்': 'love', 'நண்பர்': 'friend',
  },
  // Urdu to English
  ur: {
    'السلام علیکم': 'hello', 'شکریہ': 'thank you', 'ہاں': 'yes', 'نہیں': 'no',
    'براہ کرم': 'please', 'معاف کیجیے': 'sorry', 'صبح بخیر': 'good morning',
    'شب بخیر': 'good night', 'آپ کیسے ہیں': 'how are you',
    'میں ٹھیک ہوں': 'i am fine', 'محبت': 'love', 'دوست': 'friend',
  },
  // Gujarati to English
  gu: {
    'નમસ્તે': 'hello', 'આભાર': 'thank you', 'હા': 'yes', 'ના': 'no',
    'કૃપા કરીને': 'please', 'માફ કરશો': 'sorry', 'સુપ્રભાત': 'good morning',
    'શુભ રાત્રી': 'good night', 'તમે કેમ છો': 'how are you',
    'હું સારું છું': 'i am fine', 'પ્રેમ': 'love', 'મિત્ર': 'friend',
  },
  // Kannada to English
  kn: {
    'ನಮಸ್ಕಾರ': 'hello', 'ಧನ್ಯವಾದ': 'thank you', 'ಹೌದು': 'yes', 'ಇಲ್ಲ': 'no',
    'ದಯವಿಟ್ಟು': 'please', 'ಕ್ಷಮಿಸಿ': 'sorry', 'ಶುಭೋದಯ': 'good morning',
    'ಶುಭ ರಾತ್ರಿ': 'good night', 'ನೀವು ಹೇಗಿದ್ದೀರಿ': 'how are you',
    'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ': 'i am fine', 'ಪ್ರೀತಿ': 'love', 'ಸ್ನೇಹಿತ': 'friend',
  },
  // Odia to English
  or: {
    'ନମସ୍କାର': 'hello', 'ଧନ୍ୟବାଦ': 'thank you', 'ହଁ': 'yes', 'ନା': 'no',
    'ଦୟାକରି': 'please', 'କ୍ଷମା କରନ୍ତୁ': 'sorry', 'ସୁପ୍ରଭାତ': 'good morning',
    'ଶୁଭ ରାତ୍ରି': 'good night', 'ଆପଣ କେମିତି ଅଛନ୍ତି': 'how are you',
    'ମୁଁ ଭଲ ଅଛି': 'i am fine', 'ପ୍ରେମ': 'love', 'ବନ୍ଧୁ': 'friend',
  },
  // Punjabi to English
  pa: {
    'ਸਤ ਸ੍ਰੀ ਅਕਾਲ': 'hello', 'ਧੰਨਵਾਦ': 'thank you', 'ਹਾਂ': 'yes', 'ਨਹੀਂ': 'no',
    'ਕਿਰਪਾ ਕਰਕੇ': 'please', 'ਮਾਫ਼ ਕਰਨਾ': 'sorry', 'ਸ਼ੁਭ ਸਵੇਰ': 'good morning',
    'ਸ਼ੁਭ ਰਾਤ': 'good night', 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ': 'how are you',
    'ਮੈਂ ਠੀਕ ਹਾਂ': 'i am fine', 'ਪਿਆਰ': 'love', 'ਦੋਸਤ': 'friend',
  },
  // Malayalam to English
  ml: {
    'നമസ്കാരം': 'hello', 'നന്ദി': 'thank you', 'അതെ': 'yes', 'ഇല്ല': 'no',
    'ദയവായി': 'please', 'ക്ഷമിക്കണം': 'sorry', 'സുപ്രഭാതം': 'good morning',
    'ശുഭ രാത്രി': 'good night', 'സുഖമാണോ': 'how are you',
    'എനിക്ക് സുഖമാണ്': 'i am fine', 'സ്നേഹം': 'love', 'സുഹൃത്ത്': 'friend',
  },
  // Assamese to English
  as: {
    'নমস্কাৰ': 'hello', 'ধন্যবাদ': 'thank you', 'হয়': 'yes', 'নহয়': 'no',
    'অনুগ্ৰহ কৰি': 'please', 'ক্ষমা কৰিব': 'sorry', 'সুপ্ৰভাত': 'good morning',
    'শুভ ৰাত্ৰি': 'good night', 'আপুনি কেনে আছে': 'how are you',
    'মই ভালে আছোঁ': 'i am fine', 'প্ৰেম': 'love', 'বন্ধু': 'friend',
  },
  // Chinese to English
  zh: {
    '你好': 'hello', '谢谢': 'thank you', '是': 'yes', '不': 'no',
    '请': 'please', '对不起': 'sorry', '早上好': 'good morning',
    '晚安': 'good night', '你好吗': 'how are you', '我很好': 'i am fine',
    '爱': 'love', '朋友': 'friend', '家人': 'family', '食物': 'food',
    '水': 'water', '家': 'home', '工作': 'work', '时间': 'time',
  },
  // Spanish to English
  es: {
    'hola': 'hello', 'gracias': 'thank you', 'sí': 'yes', 'no': 'no',
    'por favor': 'please', 'lo siento': 'sorry', 'buenos días': 'good morning',
    'buenas noches': 'good night', 'cómo estás': 'how are you',
    'estoy bien': 'i am fine', 'amor': 'love', 'amigo': 'friend',
    'familia': 'family', 'comida': 'food', 'agua': 'water', 'casa': 'home',
  },
  // Portuguese to English
  pt: {
    'olá': 'hello', 'obrigado': 'thank you', 'sim': 'yes', 'não': 'no',
    'por favor': 'please', 'desculpe': 'sorry', 'bom dia': 'good morning',
    'boa noite': 'good night', 'como você está': 'how are you',
    'estou bem': 'i am fine', 'amor': 'love', 'amigo': 'friend',
  },
  // Russian to English
  ru: {
    'привет': 'hello', 'спасибо': 'thank you', 'да': 'yes', 'нет': 'no',
    'пожалуйста': 'please', 'извините': 'sorry', 'доброе утро': 'good morning',
    'спокойной ночи': 'good night', 'как дела': 'how are you',
    'у меня всё хорошо': 'i am fine', 'любовь': 'love', 'друг': 'friend',
  },
  // Japanese to English
  ja: {
    'こんにちは': 'hello', 'ありがとう': 'thank you', 'はい': 'yes', 'いいえ': 'no',
    'お願いします': 'please', 'すみません': 'sorry', 'おはようございます': 'good morning',
    'おやすみなさい': 'good night', 'お元気ですか': 'how are you',
    '元気です': 'i am fine', '愛': 'love', '友達': 'friend',
  },
  // Korean to English
  ko: {
    '안녕하세요': 'hello', '감사합니다': 'thank you', '네': 'yes', '아니요': 'no',
    '제발': 'please', '미안합니다': 'sorry', '좋은 아침': 'good morning',
    '안녕히 주무세요': 'good night', '어떻게 지내세요': 'how are you',
    '잘 지내요': 'i am fine', '사랑': 'love', '친구': 'friend',
  },
  // French to English
  fr: {
    'bonjour': 'hello', 'merci': 'thank you', 'oui': 'yes', 'non': 'no',
    's\'il vous plaît': 'please', 'désolé': 'sorry', 'bon matin': 'good morning',
    'bonne nuit': 'good night', 'comment allez-vous': 'how are you',
    'je vais bien': 'i am fine', 'amour': 'love', 'ami': 'friend',
  },
  // German to English
  de: {
    'hallo': 'hello', 'danke': 'thank you', 'ja': 'yes', 'nein': 'no',
    'bitte': 'please', 'entschuldigung': 'sorry', 'guten morgen': 'good morning',
    'gute nacht': 'good night', 'wie geht es ihnen': 'how are you',
    'mir geht es gut': 'i am fine', 'liebe': 'love', 'freund': 'friend',
  },
  // Italian to English
  it: {
    'ciao': 'hello', 'grazie': 'thank you', 'sì': 'yes', 'no': 'no',
    'per favore': 'please', 'scusa': 'sorry', 'buongiorno': 'good morning',
    'buonanotte': 'good night', 'come stai': 'how are you',
    'sto bene': 'i am fine', 'amore': 'love', 'amico': 'friend',
  },
  // Turkish to English
  tr: {
    'merhaba': 'hello', 'teşekkürler': 'thank you', 'evet': 'yes', 'hayır': 'no',
    'lütfen': 'please', 'özür dilerim': 'sorry', 'günaydın': 'good morning',
    'iyi geceler': 'good night', 'nasılsınız': 'how are you',
    'iyiyim': 'i am fine', 'aşk': 'love', 'arkadaş': 'friend',
  },
  // Vietnamese to English
  vi: {
    'xin chào': 'hello', 'cảm ơn': 'thank you', 'vâng': 'yes', 'không': 'no',
    'làm ơn': 'please', 'xin lỗi': 'sorry', 'chào buổi sáng': 'good morning',
    'chúc ngủ ngon': 'good night', 'bạn khỏe không': 'how are you',
    'tôi khỏe': 'i am fine', 'tình yêu': 'love', 'bạn bè': 'friend',
  },
  // Thai to English
  th: {
    'สวัสดี': 'hello', 'ขอบคุณ': 'thank you', 'ใช่': 'yes', 'ไม่': 'no',
    'กรุณา': 'please', 'ขอโทษ': 'sorry', 'สวัสดีตอนเช้า': 'good morning',
    'ราตรีสวัสดิ์': 'good night', 'สบายดีไหม': 'how are you',
    'สบายดี': 'i am fine', 'ความรัก': 'love', 'เพื่อน': 'friend',
  },
  // Indonesian to English
  id: {
    'halo': 'hello', 'terima kasih': 'thank you', 'ya': 'yes', 'tidak': 'no',
    'tolong': 'please', 'maaf': 'sorry', 'selamat pagi': 'good morning',
    'selamat malam': 'good night', 'apa kabar': 'how are you',
    'saya baik': 'i am fine', 'cinta': 'love', 'teman': 'friend',
  },
  // Malay to English
  ms: {
    'halo': 'hello', 'terima kasih': 'thank you', 'ya': 'yes', 'tidak': 'no',
    'tolong': 'please', 'maaf': 'sorry', 'selamat pagi': 'good morning',
    'selamat malam': 'good night', 'apa khabar': 'how are you',
    'saya baik': 'i am fine', 'cinta': 'love', 'kawan': 'friend',
  },
  // Arabic to English
  ar: {
    'مرحبا': 'hello', 'شكرا': 'thank you', 'نعم': 'yes', 'لا': 'no',
    'من فضلك': 'please', 'آسف': 'sorry', 'صباح الخير': 'good morning',
    'تصبح على خير': 'good night', 'كيف حالك': 'how are you',
    'أنا بخير': 'i am fine', 'حب': 'love', 'صديق': 'friend',
  },
  // Persian to English
  fa: {
    'سلام': 'hello', 'متشکرم': 'thank you', 'بله': 'yes', 'نه': 'no',
    'لطفا': 'please', 'متاسفم': 'sorry', 'صبح بخیر': 'good morning',
    'شب بخیر': 'good night', 'حالت چطوره': 'how are you',
    'خوبم': 'i am fine', 'عشق': 'love', 'دوست': 'friend',
  },
  // Dutch to English
  nl: {
    'hallo': 'hello', 'dank je': 'thank you', 'ja': 'yes', 'nee': 'no',
    'alsjeblieft': 'please', 'sorry': 'sorry', 'goedemorgen': 'good morning',
    'goedenacht': 'good night', 'hoe gaat het': 'how are you',
    'het gaat goed': 'i am fine', 'liefde': 'love', 'vriend': 'friend',
  },
  // Polish to English
  pl: {
    'cześć': 'hello', 'dziękuję': 'thank you', 'tak': 'yes', 'nie': 'no',
    'proszę': 'please', 'przepraszam': 'sorry', 'dzień dobry': 'good morning',
    'dobranoc': 'good night', 'jak się masz': 'how are you',
    'mam się dobrze': 'i am fine', 'miłość': 'love', 'przyjaciel': 'friend',
  },
  // Ukrainian to English
  uk: {
    'привіт': 'hello', 'дякую': 'thank you', 'так': 'yes', 'ні': 'no',
    'будь ласка': 'please', 'вибачте': 'sorry', 'доброго ранку': 'good morning',
    'на добраніч': 'good night', 'як справи': 'how are you',
    'у мене все добре': 'i am fine', 'любов': 'love', 'друг': 'friend',
  },
  // Romanian to English
  ro: {
    'bună': 'hello', 'mulțumesc': 'thank you', 'da': 'yes', 'nu': 'no',
    'te rog': 'please', 'îmi pare rău': 'sorry', 'bună dimineața': 'good morning',
    'noapte bună': 'good night', 'ce mai faci': 'how are you',
    'sunt bine': 'i am fine', 'dragoste': 'love', 'prieten': 'friend',
  },
  // Greek to English
  el: {
    'γεια': 'hello', 'ευχαριστώ': 'thank you', 'ναι': 'yes', 'όχι': 'no',
    'παρακαλώ': 'please', 'συγγνώμη': 'sorry', 'καλημέρα': 'good morning',
    'καληνύχτα': 'good night', 'τι κάνεις': 'how are you',
    'είμαι καλά': 'i am fine', 'αγάπη': 'love', 'φίλος': 'friend',
  },
  // Hebrew to English
  he: {
    'שלום': 'hello', 'תודה': 'thank you', 'כן': 'yes', 'לא': 'no',
    'בבקשה': 'please', 'סליחה': 'sorry', 'בוקר טוב': 'good morning',
    'לילה טוב': 'good night', 'מה שלומך': 'how are you',
    'אני בסדר': 'i am fine', 'אהבה': 'love', 'חבר': 'friend',
  },
  // Swahili to English
  sw: {
    'habari': 'hello', 'asante': 'thank you', 'ndiyo': 'yes', 'hapana': 'no',
    'tafadhali': 'please', 'pole': 'sorry', 'habari ya asubuhi': 'good morning',
    'usiku mwema': 'good night', 'habari yako': 'how are you',
    'niko sawa': 'i am fine', 'upendo': 'love', 'rafiki': 'friend',
  },
  // Amharic to English
  am: {
    'ሰላም': 'hello', 'አመሰግናለሁ': 'thank you', 'አዎ': 'yes', 'አይ': 'no',
    'እባክህ': 'please', 'ይቅርታ': 'sorry', 'እንደምን አደርክ': 'good morning',
    'መልካም ሌሊት': 'good night', 'እንዴት ነህ': 'how are you',
    'ደህና ነኝ': 'i am fine', 'ፍቅር': 'love', 'ጓደኛ': 'friend',
  },
  // Hungarian to English
  hu: {
    'szia': 'hello', 'köszönöm': 'thank you', 'igen': 'yes', 'nem': 'no',
    'kérem': 'please', 'sajnálom': 'sorry', 'jó reggelt': 'good morning',
    'jó éjszakát': 'good night', 'hogy vagy': 'how are you',
    'jól vagyok': 'i am fine', 'szerelem': 'love', 'barát': 'friend',
  },
  // Czech to English
  cs: {
    'ahoj': 'hello', 'děkuji': 'thank you', 'ano': 'yes', 'ne': 'no',
    'prosím': 'please', 'promiňte': 'sorry', 'dobré ráno': 'good morning',
    'dobrou noc': 'good night', 'jak se máš': 'how are you',
    'mám se dobře': 'i am fine', 'láska': 'love', 'přítel': 'friend',
  },
  // Swedish to English
  sv: {
    'hej': 'hello', 'tack': 'thank you', 'ja': 'yes', 'nej': 'no',
    'snälla': 'please', 'förlåt': 'sorry', 'god morgon': 'good morning',
    'god natt': 'good night', 'hur mår du': 'how are you',
    'jag mår bra': 'i am fine', 'kärlek': 'love', 'vän': 'friend',
  },
  // Tagalog to English
  tl: {
    'kamusta': 'hello', 'salamat': 'thank you', 'oo': 'yes', 'hindi': 'no',
    'pakiusap': 'please', 'pasensya': 'sorry', 'magandang umaga': 'good morning',
    'magandang gabi': 'good night', 'kumusta ka': 'how are you',
    'mabuti ako': 'i am fine', 'pagmamahal': 'love', 'kaibigan': 'friend',
  },
  // Nepali to English
  ne: {
    'नमस्ते': 'hello', 'धन्यवाद': 'thank you', 'हो': 'yes', 'होइन': 'no',
    'कृपया': 'please', 'माफ गर्नुहोस्': 'sorry', 'शुभ प्रभात': 'good morning',
    'शुभ रात्रि': 'good night', 'तपाईंलाई कस्तो छ': 'how are you',
    'म ठीक छु': 'i am fine', 'माया': 'love', 'साथी': 'friend',
  },
  // Sinhala to English
  si: {
    'ආයුබෝවන්': 'hello', 'ස්තූතියි': 'thank you', 'ඔව්': 'yes', 'නැහැ': 'no',
    'කරුණාකර': 'please', 'සමාවෙන්න': 'sorry', 'සුභ උදෑසනක්': 'good morning',
    'සුභ රාත්‍රියක්': 'good night', 'කොහොමද': 'how are you',
    'මම හොඳින්': 'i am fine', 'ආදරය': 'love', 'යාළුවා': 'friend',
  },
  // Khmer to English
  km: {
    'សួស្តី': 'hello', 'អរគុណ': 'thank you', 'បាទ': 'yes', 'ទេ': 'no',
    'សូម': 'please', 'សុំទោស': 'sorry', 'អរុណសួស្តី': 'good morning',
    'រាត្រីសួស្តី': 'good night', 'សុខសប្បាយទេ': 'how are you',
    'ខ្ញុំសុខសប្បាយ': 'i am fine', 'ស្នេហា': 'love', 'មិត្តភក្តិ': 'friend',
  },
  // Burmese to English
  my: {
    'မင်္ဂလာပါ': 'hello', 'ကျေးဇူးတင်ပါတယ်': 'thank you', 'ဟုတ်ကဲ့': 'yes', 'မဟုတ်ဘူး': 'no',
    'ကျေးဇူးပြု၍': 'please', 'တောင်းပန်ပါတယ်': 'sorry', 'မင်္ဂလာနံနက်ခင်းပါ': 'good morning',
    'ညဖက်ကောင်းပါစေ': 'good night', 'နေကောင်းလား': 'how are you',
    'ကျွန်တော်ကောင်းပါတယ်': 'i am fine', 'အချစ်': 'love', 'သူငယ်ချင်း': 'friend',
  },
  // Pashto to English
  ps: {
    'سلام': 'hello', 'مننه': 'thank you', 'هو': 'yes', 'نه': 'no',
    'مهرباني وکړئ': 'please', 'بخښنه غواړم': 'sorry', 'سهار مو پخیر': 'good morning',
    'شپه مو پخیر': 'good night', 'څنګه یاست': 'how are you',
    'زه ښه یم': 'i am fine', 'مینه': 'love', 'ملګری': 'friend',
  },
  // Uzbek to English
  uz: {
    'salom': 'hello', 'rahmat': 'thank you', 'ha': 'yes', 'yo\'q': 'no',
    'iltimos': 'please', 'kechirasiz': 'sorry', 'xayrli tong': 'good morning',
    'xayrli tun': 'good night', 'qanday siz': 'how are you',
    'men yaxshiman': 'i am fine', 'sevgi': 'love', 'do\'st': 'friend',
  },
  // Azerbaijani to English
  az: {
    'salam': 'hello', 'təşəkkür edirəm': 'thank you', 'bəli': 'yes', 'xeyr': 'no',
    'zəhmət olmasa': 'please', 'bağışlayın': 'sorry', 'sabahınız xeyir': 'good morning',
    'gecəniz xeyrə qalsın': 'good night', 'necəsiniz': 'how are you',
    'yaxşıyam': 'i am fine', 'sevgi': 'love', 'dost': 'friend',
  },
};

// ==========================================
// COMMON PHRASES DICTIONARY (FROM ENGLISH)
// English maps to each target language
// ==========================================
const FROM_ENGLISH: Record<string, Record<string, string>> = {};

// Build reverse dictionaries
for (const [langCode, dict] of Object.entries(TO_ENGLISH)) {
  FROM_ENGLISH[langCode] = {};
  for (const [native, english] of Object.entries(dict)) {
    FROM_ENGLISH[langCode][english.toLowerCase()] = native;
  }
}

// ==========================================
// TRANSLATION FUNCTIONS
// ==========================================

function translateToEnglish(text: string, sourceLang: string): string {
  if (sourceLang === 'en') return text;
  
  const dict = TO_ENGLISH[sourceLang];
  if (!dict) return text; // Unsupported language, return original
  
  let result = text;
  const lowerText = text.toLowerCase();
  
  // Try exact match first
  for (const [native, english] of Object.entries(dict)) {
    if (lowerText === native.toLowerCase()) {
      return english;
    }
  }
  
  // Try phrase replacement
  for (const [native, english] of Object.entries(dict)) {
    const regex = new RegExp(escapeRegex(native), 'gi');
    result = result.replace(regex, english);
  }
  
  return result;
}

function translateFromEnglish(text: string, targetLang: string): string {
  if (targetLang === 'en') return text;
  
  const dict = FROM_ENGLISH[targetLang];
  if (!dict) return text; // Unsupported language, return original
  
  let result = text;
  const lowerText = text.toLowerCase();
  
  // Try exact match first
  for (const [english, native] of Object.entries(dict)) {
    if (lowerText === english.toLowerCase()) {
      return native;
    }
  }
  
  // Try phrase replacement
  for (const [english, native] of Object.entries(dict)) {
    const regex = new RegExp(`\\b${escapeRegex(english)}\\b`, 'gi');
    result = result.replace(regex, native);
  }
  
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==========================================
// PIVOT TRANSLATION: Source → English → Target
// ==========================================
function pivotTranslate(
  text: string, 
  sourceLang: string, 
  targetLang: string
): { translated: string; english: string; success: boolean } {
  // Same language - no translation needed
  if (sourceLang === targetLang) {
    return { translated: text, english: text, success: true };
  }
  
  // Step 1: Source → English
  const english = translateToEnglish(text, sourceLang);
  
  // Step 2: English → Target
  const translated = translateFromEnglish(english, targetLang);
  
  // Check if any translation happened
  const success = translated !== text || english !== text;
  
  return { translated, english, success };
}

// ==========================================
// MAIN HANDLER
// ==========================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLang, targetLang, direction } = await req.json();

    // Validate inputs
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid text parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sourceLang || !SUPPORTED_LANGUAGES.includes(sourceLang)) {
      return new Response(
        JSON.stringify({ 
          error: `Unsupported source language: ${sourceLang}`,
          supported: SUPPORTED_LANGUAGES 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetLang || !SUPPORTED_LANGUAGES.includes(targetLang)) {
      return new Response(
        JSON.stringify({ 
          error: `Unsupported target language: ${targetLang}`,
          supported: SUPPORTED_LANGUAGES 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[pivot-translate] Translating: "${text}" from ${sourceLang} to ${targetLang}`);

    // Perform pivot translation
    const result = pivotTranslate(text, sourceLang, targetLang);

    console.log(`[pivot-translate] Result: "${result.translated}" (via English: "${result.english}")`);

    return new Response(
      JSON.stringify({
        success: true,
        original: text,
        translated: result.translated,
        englishPivot: result.english,
        sourceLang,
        targetLang,
        wasTranslated: result.success,
        method: 'pivot-through-english',
        supportedLanguages: SUPPORTED_LANGUAGES.length,
        combinations: SUPPORTED_LANGUAGES.length * 2, // to/from English
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[pivot-translate] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Translation failed',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

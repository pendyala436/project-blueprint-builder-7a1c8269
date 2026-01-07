// LibreTranslate-inspired Edge Function
// Self-contained translation system - no external APIs
// Supports bidirectional translation: Source ↔ English ↔ Target

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==========================================
// LANGUAGE CODES & METADATA
// ==========================================
const SUPPORTED_LANGUAGES: Record<string, { name: string; nativeName: string; rtl?: boolean }> = {
  'en': { name: 'English', nativeName: 'English' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी' },
  'bn': { name: 'Bengali', nativeName: 'বাংলা' },
  'te': { name: 'Telugu', nativeName: 'తెలుగు' },
  'ta': { name: 'Tamil', nativeName: 'தமிழ்' },
  'mr': { name: 'Marathi', nativeName: 'मराठी' },
  'gu': { name: 'Gujarati', nativeName: 'ગુજરાતી' },
  'kn': { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  'ml': { name: 'Malayalam', nativeName: 'മലയാളം' },
  'pa': { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  'or': { name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  'as': { name: 'Assamese', nativeName: 'অসমীয়া' },
  'ur': { name: 'Urdu', nativeName: 'اردو', rtl: true },
  'es': { name: 'Spanish', nativeName: 'Español' },
  'fr': { name: 'French', nativeName: 'Français' },
  'de': { name: 'German', nativeName: 'Deutsch' },
  'it': { name: 'Italian', nativeName: 'Italiano' },
  'pt': { name: 'Portuguese', nativeName: 'Português' },
  'ru': { name: 'Russian', nativeName: 'Русский' },
  'zh': { name: 'Chinese', nativeName: '中文' },
  'ja': { name: 'Japanese', nativeName: '日本語' },
  'ko': { name: 'Korean', nativeName: '한국어' },
  'ar': { name: 'Arabic', nativeName: 'العربية', rtl: true },
  'th': { name: 'Thai', nativeName: 'ไทย' },
  'vi': { name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  'id': { name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  'ms': { name: 'Malay', nativeName: 'Bahasa Melayu' },
  'tr': { name: 'Turkish', nativeName: 'Türkçe' },
  'nl': { name: 'Dutch', nativeName: 'Nederlands' },
  'pl': { name: 'Polish', nativeName: 'Polski' },
  'uk': { name: 'Ukrainian', nativeName: 'Українська' },
  'cs': { name: 'Czech', nativeName: 'Čeština' },
  'ro': { name: 'Romanian', nativeName: 'Română' },
  'hu': { name: 'Hungarian', nativeName: 'Magyar' },
  'el': { name: 'Greek', nativeName: 'Ελληνικά' },
  'sv': { name: 'Swedish', nativeName: 'Svenska' },
  'da': { name: 'Danish', nativeName: 'Dansk' },
  'fi': { name: 'Finnish', nativeName: 'Suomi' },
  'no': { name: 'Norwegian', nativeName: 'Norsk' },
  'he': { name: 'Hebrew', nativeName: 'עברית', rtl: true },
  'fa': { name: 'Persian', nativeName: 'فارسی', rtl: true },
  'sw': { name: 'Swahili', nativeName: 'Kiswahili' },
  'tl': { name: 'Tagalog', nativeName: 'Tagalog' },
  'ne': { name: 'Nepali', nativeName: 'नेपाली' },
  'si': { name: 'Sinhala', nativeName: 'සිංහල' },
  'my': { name: 'Burmese', nativeName: 'မြန်မာစာ' },
  'km': { name: 'Khmer', nativeName: 'ភាសាខ្មែរ' },
  'lo': { name: 'Lao', nativeName: 'ພາສາລາວ' },
  'am': { name: 'Amharic', nativeName: 'አማርኛ' },
  'ka': { name: 'Georgian', nativeName: 'ქართული' },
  'hy': { name: 'Armenian', nativeName: 'Հdelays' },
  'az': { name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  'kk': { name: 'Kazakh', nativeName: 'Қазақша' },
  'uz': { name: 'Uzbek', nativeName: 'Oʻzbek' },
  'mn': { name: 'Mongolian', nativeName: 'Монгол' },
  'bo': { name: 'Tibetan', nativeName: 'བོད་ཡིག' },
};

// ==========================================
// COMPREHENSIVE TRANSLATION DICTIONARIES
// Chat-optimized phrases and common words
// ==========================================

// Hindi Dictionary
const HINDI_TO_ENGLISH: Record<string, string> = {
  // Greetings
  'नमस्ते': 'hello', 'नमस्कार': 'greetings', 'हाय': 'hi', 'हैलो': 'hello',
  'सुप्रभात': 'good morning', 'शुभ रात्रि': 'good night', 'शुभ संध्या': 'good evening',
  'अलविदा': 'goodbye', 'फिर मिलेंगे': 'see you again', 'बाय': 'bye',
  
  // Common phrases
  'आप कैसे हैं': 'how are you', 'कैसे हो': 'how are you', 'क्या हाल है': 'how are you',
  'मैं ठीक हूं': 'i am fine', 'मैं अच्छा हूं': 'i am good', 'बहुत अच्छा': 'very good',
  'धन्यवाद': 'thank you', 'शुक्रिया': 'thanks', 'कृपया': 'please',
  'माफ कीजिए': 'sorry', 'क्षमा करें': 'excuse me', 'कोई बात नहीं': 'no problem',
  
  // Questions
  'क्या': 'what', 'कौन': 'who', 'कहां': 'where', 'कब': 'when', 'क्यों': 'why', 'कैसे': 'how',
  'कितना': 'how much', 'कितने': 'how many', 'किसका': 'whose', 'कौन सा': 'which',
  'आपका नाम क्या है': 'what is your name', 'आप कहां से हैं': 'where are you from',
  
  // Pronouns
  'मैं': 'i', 'तुम': 'you', 'आप': 'you', 'वह': 'he/she', 'वे': 'they',
  'हम': 'we', 'यह': 'this', 'वो': 'that', 'ये': 'these',
  
  // Common words
  'हां': 'yes', 'नहीं': 'no', 'शायद': 'maybe', 'ठीक है': 'okay', 'अच्छा': 'good',
  'बुरा': 'bad', 'बड़ा': 'big', 'छोटा': 'small', 'नया': 'new', 'पुराना': 'old',
  'सुंदर': 'beautiful', 'प्यारा': 'lovely', 'खुश': 'happy', 'दुखी': 'sad',
  
  // Time
  'आज': 'today', 'कल': 'tomorrow/yesterday', 'अभी': 'now', 'बाद में': 'later',
  'सुबह': 'morning', 'दोपहर': 'afternoon', 'शाम': 'evening', 'रात': 'night',
  
  // Numbers
  'एक': 'one', 'दो': 'two', 'तीन': 'three', 'चार': 'four', 'पांच': 'five',
  'छह': 'six', 'सात': 'seven', 'आठ': 'eight', 'नौ': 'nine', 'दस': 'ten',
  
  // Verbs
  'है': 'is', 'हूं': 'am', 'हैं': 'are', 'था': 'was', 'थे': 'were',
  'करना': 'to do', 'जाना': 'to go', 'आना': 'to come', 'खाना': 'to eat', 'पीना': 'to drink',
  'देखना': 'to see', 'सुनना': 'to hear', 'बोलना': 'to speak', 'लिखना': 'to write', 'पढ़ना': 'to read',
  'सोना': 'to sleep', 'जागना': 'to wake', 'चलना': 'to walk', 'दौड़ना': 'to run',
  
  // Chat specific
  'मुझे पसंद है': 'i like', 'मुझे बहुत पसंद है': 'i love', 'बहुत अच्छा लगा': 'i liked it very much',
  'मिलकर खुशी हुई': 'nice to meet you', 'आपसे बात करके अच्छा लगा': 'nice talking to you',
  'क्या कर रहे हो': 'what are you doing', 'मैं इंतजार कर रहा हूं': 'i am waiting',
};

// Bengali Dictionary
const BENGALI_TO_ENGLISH: Record<string, string> = {
  'নমস্কার': 'hello', 'হ্যালো': 'hello', 'হাই': 'hi',
  'সুপ্রভাত': 'good morning', 'শুভ রাত্রি': 'good night', 'শুভ সন্ধ্যা': 'good evening',
  'বিদায়': 'goodbye', 'আবার দেখা হবে': 'see you again',
  'কেমন আছেন': 'how are you', 'কেমন আছো': 'how are you', 'আমি ভালো আছি': 'i am fine',
  'ধন্যবাদ': 'thank you', 'দয়া করে': 'please', 'মাফ করবেন': 'sorry',
  'হ্যাঁ': 'yes', 'না': 'no', 'ঠিক আছে': 'okay',
  'আমি': 'i', 'তুমি': 'you', 'আপনি': 'you', 'সে': 'he/she', 'তারা': 'they', 'আমরা': 'we',
  'কি': 'what', 'কে': 'who', 'কোথায়': 'where', 'কখন': 'when', 'কেন': 'why', 'কিভাবে': 'how',
  'ভালো': 'good', 'খারাপ': 'bad', 'সুন্দর': 'beautiful', 'বড়': 'big', 'ছোট': 'small',
  'আজ': 'today', 'কাল': 'tomorrow/yesterday', 'এখন': 'now', 'পরে': 'later',
  'এক': 'one', 'দুই': 'two', 'তিন': 'three', 'চার': 'four', 'পাঁচ': 'five',
  'আপনার নাম কি': 'what is your name', 'আপনি কোথা থেকে': 'where are you from',
  'আমি তোমাকে ভালোবাসি': 'i love you', 'তোমার সাথে দেখা করে ভালো লাগলো': 'nice to meet you',
};

// Telugu Dictionary
const TELUGU_TO_ENGLISH: Record<string, string> = {
  'నమస్కారం': 'hello', 'హాయ్': 'hi', 'హలో': 'hello',
  'శుభోదయం': 'good morning', 'శుభ రాత్రి': 'good night', 'శుభ సాయంత్రం': 'good evening',
  'వీడ్కోలు': 'goodbye', 'మళ్ళీ కలుద్దాం': 'see you again',
  'మీరు ఎలా ఉన్నారు': 'how are you', 'నేను బాగున్నాను': 'i am fine',
  'ధన్యవాదాలు': 'thank you', 'దయచేసి': 'please', 'క్షమించండి': 'sorry',
  'అవును': 'yes', 'కాదు': 'no', 'సరే': 'okay',
  'నేను': 'i', 'నీవు': 'you', 'మీరు': 'you', 'అతను': 'he', 'ఆమె': 'she', 'వారు': 'they', 'మేము': 'we',
  'ఏమిటి': 'what', 'ఎవరు': 'who', 'ఎక్కడ': 'where', 'ఎప్పుడు': 'when', 'ఎందుకు': 'why', 'ఎలా': 'how',
  'మంచి': 'good', 'చెడ్డ': 'bad', 'అందమైన': 'beautiful', 'పెద్ద': 'big', 'చిన్న': 'small',
  'ఈ రోజు': 'today', 'రేపు': 'tomorrow', 'నిన్న': 'yesterday', 'ఇప్పుడు': 'now',
  'ఒకటి': 'one', 'రెండు': 'two', 'మూడు': 'three', 'నాలుగు': 'four', 'ఐదు': 'five',
  'మీ పేరు ఏమిటి': 'what is your name', 'మీరు ఎక్కడ నుండి వచ్చారు': 'where are you from',
  'నేను నిన్ను ప్రేమిస్తున్నాను': 'i love you', 'కలిసినందుకు సంతోషం': 'nice to meet you',
};

// Tamil Dictionary
const TAMIL_TO_ENGLISH: Record<string, string> = {
  'வணக்கம்': 'hello', 'ஹாய்': 'hi', 'ஹலோ': 'hello',
  'காலை வணக்கம்': 'good morning', 'இரவு வணக்கம்': 'good night', 'மாலை வணக்கம்': 'good evening',
  'போய் வருகிறேன்': 'goodbye', 'மீண்டும் சந்திப்போம்': 'see you again',
  'எப்படி இருக்கிறீர்கள்': 'how are you', 'நான் நலமாக இருக்கிறேன்': 'i am fine',
  'நன்றி': 'thank you', 'தயவுசெய்து': 'please', 'மன்னிக்கவும்': 'sorry',
  'ஆம்': 'yes', 'இல்லை': 'no', 'சரி': 'okay',
  'நான்': 'i', 'நீ': 'you', 'நீங்கள்': 'you', 'அவன்': 'he', 'அவள்': 'she', 'அவர்கள்': 'they', 'நாங்கள்': 'we',
  'என்ன': 'what', 'யார்': 'who', 'எங்கே': 'where', 'எப்போது': 'when', 'ஏன்': 'why', 'எப்படி': 'how',
  'நல்ல': 'good', 'கெட்ட': 'bad', 'அழகான': 'beautiful', 'பெரிய': 'big', 'சிறிய': 'small',
  'இன்று': 'today', 'நாளை': 'tomorrow', 'நேற்று': 'yesterday', 'இப்போது': 'now',
  'ஒன்று': 'one', 'இரண்டு': 'two', 'மூன்று': 'three', 'நான்கு': 'four', 'ஐந்து': 'five',
  'உங்கள் பெயர் என்ன': 'what is your name', 'நீங்கள் எங்கிருந்து வருகிறீர்கள்': 'where are you from',
  'நான் உன்னை காதலிக்கிறேன்': 'i love you', 'சந்தித்ததில் மகிழ்ச்சி': 'nice to meet you',
};

// Spanish Dictionary
const SPANISH_TO_ENGLISH: Record<string, string> = {
  'hola': 'hello', 'buenos días': 'good morning', 'buenas noches': 'good night', 'buenas tardes': 'good afternoon',
  'adiós': 'goodbye', 'hasta luego': 'see you later', 'hasta pronto': 'see you soon',
  'cómo estás': 'how are you', 'cómo está': 'how are you', 'estoy bien': 'i am fine', 'muy bien': 'very good',
  'gracias': 'thank you', 'muchas gracias': 'thank you very much', 'por favor': 'please', 'lo siento': 'sorry', 'perdón': 'excuse me',
  'sí': 'yes', 'no': 'no', 'tal vez': 'maybe', 'vale': 'okay', 'de acuerdo': 'agreed',
  'yo': 'i', 'tú': 'you', 'usted': 'you', 'él': 'he', 'ella': 'she', 'ellos': 'they', 'nosotros': 'we',
  'qué': 'what', 'quién': 'who', 'dónde': 'where', 'cuándo': 'when', 'por qué': 'why', 'cómo': 'how',
  'bueno': 'good', 'malo': 'bad', 'hermoso': 'beautiful', 'grande': 'big', 'pequeño': 'small',
  'hoy': 'today', 'mañana': 'tomorrow', 'ayer': 'yesterday', 'ahora': 'now', 'después': 'later',
  'uno': 'one', 'dos': 'two', 'tres': 'three', 'cuatro': 'four', 'cinco': 'five',
  'cómo te llamas': 'what is your name', 'de dónde eres': 'where are you from',
  'te quiero': 'i love you', 'te amo': 'i love you', 'mucho gusto': 'nice to meet you', 'encantado': 'pleased to meet you',
};

// French Dictionary
const FRENCH_TO_ENGLISH: Record<string, string> = {
  'bonjour': 'hello', 'salut': 'hi', 'bonsoir': 'good evening', 'bonne nuit': 'good night',
  'au revoir': 'goodbye', 'à bientôt': 'see you soon', 'à plus tard': 'see you later',
  'comment allez-vous': 'how are you', 'comment vas-tu': 'how are you', 'je vais bien': 'i am fine', 'très bien': 'very good',
  'merci': 'thank you', 'merci beaucoup': 'thank you very much', 's\'il vous plaît': 'please', 'désolé': 'sorry', 'pardon': 'excuse me',
  'oui': 'yes', 'non': 'no', 'peut-être': 'maybe', 'd\'accord': 'okay',
  'je': 'i', 'tu': 'you', 'vous': 'you', 'il': 'he', 'elle': 'she', 'ils': 'they', 'nous': 'we',
  'quoi': 'what', 'qui': 'who', 'où': 'where', 'quand': 'when', 'pourquoi': 'why', 'comment': 'how',
  'bon': 'good', 'mauvais': 'bad', 'beau': 'beautiful', 'belle': 'beautiful', 'grand': 'big', 'petit': 'small',
  'aujourd\'hui': 'today', 'demain': 'tomorrow', 'hier': 'yesterday', 'maintenant': 'now', 'plus tard': 'later',
  'un': 'one', 'deux': 'two', 'trois': 'three', 'quatre': 'four', 'cinq': 'five',
  'comment t\'appelles-tu': 'what is your name', 'd\'où viens-tu': 'where are you from',
  'je t\'aime': 'i love you', 'enchanté': 'nice to meet you', 'ravi de vous rencontrer': 'pleased to meet you',
};

// German Dictionary
const GERMAN_TO_ENGLISH: Record<string, string> = {
  'hallo': 'hello', 'guten tag': 'good day', 'guten morgen': 'good morning', 'guten abend': 'good evening', 'gute nacht': 'good night',
  'auf wiedersehen': 'goodbye', 'tschüss': 'bye', 'bis später': 'see you later', 'bis bald': 'see you soon',
  'wie geht es dir': 'how are you', 'wie geht es ihnen': 'how are you', 'mir geht es gut': 'i am fine', 'sehr gut': 'very good',
  'danke': 'thank you', 'danke schön': 'thank you very much', 'vielen dank': 'many thanks', 'bitte': 'please', 'entschuldigung': 'sorry',
  'ja': 'yes', 'nein': 'no', 'vielleicht': 'maybe', 'okay': 'okay', 'einverstanden': 'agreed',
  'ich': 'i', 'du': 'you', 'sie': 'you/she/they', 'er': 'he', 'wir': 'we',
  'was': 'what', 'wer': 'who', 'wo': 'where', 'wann': 'when', 'warum': 'why', 'wie': 'how',
  'gut': 'good', 'schlecht': 'bad', 'schön': 'beautiful', 'groß': 'big', 'klein': 'small',
  'heute': 'today', 'morgen': 'tomorrow', 'gestern': 'yesterday', 'jetzt': 'now', 'später': 'later',
  'eins': 'one', 'zwei': 'two', 'drei': 'three', 'vier': 'four', 'fünf': 'five',
  'wie heißt du': 'what is your name', 'woher kommst du': 'where are you from',
  'ich liebe dich': 'i love you', 'freut mich': 'nice to meet you',
};

// Arabic Dictionary
const ARABIC_TO_ENGLISH: Record<string, string> = {
  'مرحبا': 'hello', 'أهلا': 'hi', 'السلام عليكم': 'peace be upon you',
  'صباح الخير': 'good morning', 'مساء الخير': 'good evening', 'تصبح على خير': 'good night',
  'مع السلامة': 'goodbye', 'إلى اللقاء': 'see you',
  'كيف حالك': 'how are you', 'أنا بخير': 'i am fine', 'الحمد لله': 'thank god',
  'شكرا': 'thank you', 'شكرا جزيلا': 'thank you very much', 'من فضلك': 'please', 'آسف': 'sorry', 'عفوا': 'excuse me',
  'نعم': 'yes', 'لا': 'no', 'ربما': 'maybe', 'حسنا': 'okay',
  'أنا': 'i', 'أنت': 'you', 'هو': 'he', 'هي': 'she', 'هم': 'they', 'نحن': 'we',
  'ماذا': 'what', 'من': 'who', 'أين': 'where', 'متى': 'when', 'لماذا': 'why', 'كيف': 'how',
  'جيد': 'good', 'سيء': 'bad', 'جميل': 'beautiful', 'كبير': 'big', 'صغير': 'small',
  'اليوم': 'today', 'غدا': 'tomorrow', 'أمس': 'yesterday', 'الآن': 'now', 'لاحقا': 'later',
  'واحد': 'one', 'اثنان': 'two', 'ثلاثة': 'three', 'أربعة': 'four', 'خمسة': 'five',
  'ما اسمك': 'what is your name', 'من أين أنت': 'where are you from',
  'أحبك': 'i love you', 'تشرفنا': 'nice to meet you',
};

// Chinese Dictionary
const CHINESE_TO_ENGLISH: Record<string, string> = {
  '你好': 'hello', '嗨': 'hi', '您好': 'hello (formal)',
  '早上好': 'good morning', '晚上好': 'good evening', '晚安': 'good night',
  '再见': 'goodbye', '拜拜': 'bye', '回头见': 'see you later',
  '你好吗': 'how are you', '我很好': 'i am fine', '很好': 'very good',
  '谢谢': 'thank you', '非常感谢': 'thank you very much', '请': 'please', '对不起': 'sorry', '不好意思': 'excuse me',
  '是': 'yes', '不是': 'no', '也许': 'maybe', '好的': 'okay', '好': 'good',
  '我': 'i', '你': 'you', '您': 'you (formal)', '他': 'he', '她': 'she', '他们': 'they', '我们': 'we',
  '什么': 'what', '谁': 'who', '哪里': 'where', '什么时候': 'when', '为什么': 'why', '怎么': 'how',
  '坏': 'bad', '美丽': 'beautiful', '大': 'big', '小': 'small',
  '今天': 'today', '明天': 'tomorrow', '昨天': 'yesterday', '现在': 'now', '以后': 'later',
  '一': 'one', '二': 'two', '三': 'three', '四': 'four', '五': 'five',
  '你叫什么名字': 'what is your name', '你从哪里来': 'where are you from',
  '我爱你': 'i love you', '很高兴认识你': 'nice to meet you',
};

// Japanese Dictionary
const JAPANESE_TO_ENGLISH: Record<string, string> = {
  'こんにちは': 'hello', 'おはよう': 'good morning', 'おはようございます': 'good morning (formal)',
  'こんばんは': 'good evening', 'おやすみなさい': 'good night', 'おやすみ': 'good night',
  'さようなら': 'goodbye', 'またね': 'see you', 'じゃあね': 'bye',
  'お元気ですか': 'how are you', '元気': 'fine', '元気です': 'i am fine',
  'ありがとう': 'thank you', 'ありがとうございます': 'thank you very much', 'どうも': 'thanks',
  'お願いします': 'please', 'すみません': 'excuse me', 'ごめんなさい': 'sorry',
  'はい': 'yes', 'いいえ': 'no', '多分': 'maybe', 'いいですよ': 'okay', 'わかりました': 'understood',
  '私': 'i', 'あなた': 'you', '彼': 'he', '彼女': 'she', '彼ら': 'they', '私たち': 'we',
  '何': 'what', '誰': 'who', 'どこ': 'where', 'いつ': 'when', 'なぜ': 'why', 'どう': 'how',
  'いい': 'good', '悪い': 'bad', '美しい': 'beautiful', '大きい': 'big', '小さい': 'small',
  '今日': 'today', '明日': 'tomorrow', '昨日': 'yesterday', '今': 'now', '後で': 'later',
  '一': 'one', '二': 'two', '三': 'three', '四': 'four', '五': 'five',
  'お名前は': 'what is your name', 'どこから来ましたか': 'where are you from',
  '愛してる': 'i love you', 'はじめまして': 'nice to meet you', 'よろしくお願いします': 'please take care of me',
};

// Korean Dictionary
const KOREAN_TO_ENGLISH: Record<string, string> = {
  '안녕하세요': 'hello', '안녕': 'hi', '여보세요': 'hello (phone)',
  '좋은 아침': 'good morning', '좋은 저녁': 'good evening', '안녕히 주무세요': 'good night',
  '안녕히 가세요': 'goodbye', '다음에 봐요': 'see you next time', '잘 가': 'bye',
  '어떻게 지내세요': 'how are you', '잘 지내요': 'i am fine', '좋아요': 'good',
  '감사합니다': 'thank you', '고마워요': 'thanks', '제발': 'please', '미안해요': 'sorry', '실례합니다': 'excuse me',
  '네': 'yes', '아니요': 'no', '아마도': 'maybe', '괜찮아요': 'okay',
  '나': 'i', '저': 'i (formal)', '너': 'you', '당신': 'you', '그': 'he', '그녀': 'she', '그들': 'they', '우리': 'we',
  '뭐': 'what', '누구': 'who', '어디': 'where', '언제': 'when', '왜': 'why', '어떻게': 'how',
  '좋은': 'good', '나쁜': 'bad', '아름다운': 'beautiful', '큰': 'big', '작은': 'small',
  '오늘': 'today', '내일': 'tomorrow', '어제': 'yesterday', '지금': 'now', '나중에': 'later',
  '하나': 'one', '둘': 'two', '셋': 'three', '넷': 'four', '다섯': 'five',
  '이름이 뭐예요': 'what is your name', '어디서 오셨어요': 'where are you from',
  '사랑해요': 'i love you', '만나서 반가워요': 'nice to meet you',
};

// Russian Dictionary
const RUSSIAN_TO_ENGLISH: Record<string, string> = {
  'привет': 'hello', 'здравствуйте': 'hello (formal)', 'приветствую': 'greetings',
  'доброе утро': 'good morning', 'добрый вечер': 'good evening', 'спокойной ночи': 'good night',
  'до свидания': 'goodbye', 'пока': 'bye', 'до встречи': 'see you',
  'как дела': 'how are you', 'как вы': 'how are you', 'хорошо': 'fine', 'я в порядке': 'i am fine', 'отлично': 'excellent',
  'спасибо': 'thank you', 'большое спасибо': 'thank you very much', 'пожалуйста': 'please', 'извините': 'sorry', 'простите': 'excuse me',
  'да': 'yes', 'нет': 'no', 'может быть': 'maybe', 'ладно': 'okay',
  'я': 'i', 'ты': 'you', 'вы': 'you (formal)', 'он': 'he', 'она': 'she', 'они': 'they', 'мы': 'we',
  'что': 'what', 'кто': 'who', 'где': 'where', 'когда': 'when', 'почему': 'why', 'как': 'how',
  'плохо': 'bad', 'красивый': 'beautiful', 'большой': 'big', 'маленький': 'small',
  'сегодня': 'today', 'завтра': 'tomorrow', 'вчера': 'yesterday', 'сейчас': 'now', 'потом': 'later',
  'один': 'one', 'два': 'two', 'три': 'three', 'четыре': 'four', 'пять': 'five',
  'как тебя зовут': 'what is your name', 'откуда ты': 'where are you from',
  'я люблю тебя': 'i love you', 'приятно познакомиться': 'nice to meet you',
};

// Portuguese Dictionary
const PORTUGUESE_TO_ENGLISH: Record<string, string> = {
  'olá': 'hello', 'oi': 'hi', 'bom dia': 'good morning', 'boa tarde': 'good afternoon', 'boa noite': 'good night',
  'adeus': 'goodbye', 'tchau': 'bye', 'até logo': 'see you later', 'até mais': 'see you',
  'como está': 'how are you', 'como vai': 'how are you', 'estou bem': 'i am fine', 'muito bem': 'very good',
  'obrigado': 'thank you', 'obrigada': 'thank you (f)', 'muito obrigado': 'thank you very much', 'por favor': 'please', 'desculpe': 'sorry',
  'sim': 'yes', 'não': 'no', 'talvez': 'maybe', 'tudo bem': 'okay',
  'eu': 'i', 'você': 'you', 'ele': 'he', 'ela': 'she', 'eles': 'they', 'nós': 'we',
  'o que': 'what', 'quem': 'who', 'onde': 'where', 'quando': 'when', 'por que': 'why', 'como': 'how',
  'bom': 'good', 'mau': 'bad', 'bonito': 'beautiful', 'grande': 'big', 'pequeno': 'small',
  'hoje': 'today', 'amanhã': 'tomorrow', 'ontem': 'yesterday', 'agora': 'now', 'depois': 'later',
  'um': 'one', 'dois': 'two', 'três': 'three', 'quatro': 'four', 'cinco': 'five',
  'qual é o seu nome': 'what is your name', 'de onde você é': 'where are you from',
  'eu te amo': 'i love you', 'prazer em conhecê-lo': 'nice to meet you',
};

// Italian Dictionary
const ITALIAN_TO_ENGLISH: Record<string, string> = {
  'ciao': 'hello/goodbye', 'salve': 'hello', 'buongiorno': 'good morning', 'buonasera': 'good evening', 'buonanotte': 'good night',
  'arrivederci': 'goodbye', 'a presto': 'see you soon', 'a dopo': 'see you later',
  'come stai': 'how are you', 'come sta': 'how are you (formal)', 'sto bene': 'i am fine', 'molto bene': 'very good',
  'grazie': 'thank you', 'grazie mille': 'thank you very much', 'per favore': 'please', 'scusa': 'sorry', 'mi scusi': 'excuse me',
  'sì': 'yes', 'no': 'no', 'forse': 'maybe', 'va bene': 'okay',
  'io': 'i', 'tu': 'you', 'lei': 'you (formal)/she', 'lui': 'he', 'loro': 'they', 'noi': 'we',
  'cosa': 'what', 'chi': 'who', 'dove': 'where', 'quando': 'when', 'perché': 'why', 'come': 'how',
  'buono': 'good', 'cattivo': 'bad', 'bello': 'beautiful', 'grande': 'big', 'piccolo': 'small',
  'oggi': 'today', 'domani': 'tomorrow', 'ieri': 'yesterday', 'adesso': 'now', 'dopo': 'later',
  'uno': 'one', 'due': 'two', 'tre': 'three', 'quattro': 'four', 'cinque': 'five',
  'come ti chiami': 'what is your name', 'di dove sei': 'where are you from',
  'ti amo': 'i love you', 'piacere di conoscerti': 'nice to meet you',
};

// Marathi Dictionary
const MARATHI_TO_ENGLISH: Record<string, string> = {
  'नमस्कार': 'hello', 'नमस्ते': 'hello', 'हाय': 'hi',
  'सुप्रभात': 'good morning', 'शुभ रात्री': 'good night', 'शुभ संध्याकाळ': 'good evening',
  'पुन्हा भेटू': 'see you again', 'बाय': 'bye',
  'तुम्ही कसे आहात': 'how are you', 'कसे आहात': 'how are you', 'मी ठीक आहे': 'i am fine', 'छान': 'nice',
  'धन्यवाद': 'thank you', 'कृपया': 'please', 'माफ करा': 'sorry',
  'हो': 'yes', 'नाही': 'no', 'ठीक आहे': 'okay',
  'मी': 'i', 'तू': 'you', 'तुम्ही': 'you (formal)', 'तो': 'he', 'ती': 'she', 'ते': 'they', 'आम्ही': 'we',
  'काय': 'what', 'कोण': 'who', 'कुठे': 'where', 'केव्हा': 'when', 'का': 'why', 'कसे': 'how',
  'चांगले': 'good', 'वाईट': 'bad', 'सुंदर': 'beautiful', 'मोठे': 'big', 'लहान': 'small',
  'आज': 'today', 'उद्या': 'tomorrow', 'काल': 'yesterday', 'आता': 'now', 'नंतर': 'later',
  'एक': 'one', 'दोन': 'two', 'तीन': 'three', 'चार': 'four', 'पाच': 'five',
  'तुमचे नाव काय': 'what is your name', 'तुम्ही कुठून आहात': 'where are you from',
  'मला तुझ्यावर प्रेम आहे': 'i love you', 'भेटून आनंद झाला': 'nice to meet you',
};

// Gujarati Dictionary
const GUJARATI_TO_ENGLISH: Record<string, string> = {
  'નમસ્તે': 'hello', 'નમસ્કાર': 'greetings', 'હાય': 'hi',
  'સુપ્રભાત': 'good morning', 'શુભ રાત્રી': 'good night', 'શુભ સાંજ': 'good evening',
  'આવજો': 'goodbye', 'ફરી મળીશું': 'see you again',
  'કેમ છો': 'how are you', 'તમે કેમ છો': 'how are you', 'હું સારો છું': 'i am fine', 'સારું': 'good',
  'આભાર': 'thank you', 'ધન્યવાદ': 'thank you', 'કૃપા કરીને': 'please', 'માફ કરશો': 'sorry',
  'હા': 'yes', 'ના': 'no', 'બરાબર': 'okay',
  'હું': 'i', 'તું': 'you', 'તમે': 'you (formal)', 'તે': 'he/she', 'તેઓ': 'they', 'અમે': 'we',
  'શું': 'what', 'કોણ': 'who', 'ક્યાં': 'where', 'ક્યારે': 'when', 'કેમ': 'why', 'કેવી રીતે': 'how',
  'ખરાબ': 'bad', 'સુંદર': 'beautiful', 'મોટું': 'big', 'નાનું': 'small',
  'આજે': 'today', 'કાલે': 'tomorrow', 'ગઈ કાલે': 'yesterday', 'હવે': 'now', 'પછી': 'later',
  'એક': 'one', 'બે': 'two', 'ત્રણ': 'three', 'ચાર': 'four', 'પાંચ': 'five',
  'તમારું નામ શું છે': 'what is your name', 'તમે ક્યાંથી છો': 'where are you from',
  'હું તને પ્રેમ કરું છું': 'i love you', 'મળીને આનંદ થયો': 'nice to meet you',
};

// Create reverse dictionaries (English to other languages)
function createReverseDictionary(dict: Record<string, string>): Record<string, string> {
  const reverse: Record<string, string> = {};
  for (const [key, value] of Object.entries(dict)) {
    // Handle multiple meanings separated by /
    const meanings = value.split('/');
    for (const meaning of meanings) {
      const trimmed = meaning.trim().toLowerCase();
      if (!reverse[trimmed]) {
        reverse[trimmed] = key;
      }
    }
  }
  return reverse;
}

// All dictionaries mapped by language code
const DICTIONARIES: Record<string, Record<string, string>> = {
  'hi': HINDI_TO_ENGLISH,
  'bn': BENGALI_TO_ENGLISH,
  'te': TELUGU_TO_ENGLISH,
  'ta': TAMIL_TO_ENGLISH,
  'mr': MARATHI_TO_ENGLISH,
  'gu': GUJARATI_TO_ENGLISH,
  'es': SPANISH_TO_ENGLISH,
  'fr': FRENCH_TO_ENGLISH,
  'de': GERMAN_TO_ENGLISH,
  'ar': ARABIC_TO_ENGLISH,
  'zh': CHINESE_TO_ENGLISH,
  'ja': JAPANESE_TO_ENGLISH,
  'ko': KOREAN_TO_ENGLISH,
  'ru': RUSSIAN_TO_ENGLISH,
  'pt': PORTUGUESE_TO_ENGLISH,
  'it': ITALIAN_TO_ENGLISH,
};

// Reverse dictionaries (English to other languages)
const REVERSE_DICTIONARIES: Record<string, Record<string, string>> = {};
for (const [lang, dict] of Object.entries(DICTIONARIES)) {
  REVERSE_DICTIONARIES[lang] = createReverseDictionary(dict);
}

// ==========================================
// SCRIPT DETECTION
// ==========================================
const SCRIPT_PATTERNS: { pattern: RegExp; lang: string }[] = [
  { pattern: /[\u0900-\u097F]/, lang: 'hi' }, // Devanagari (Hindi, Marathi, Sanskrit, etc.)
  { pattern: /[\u0980-\u09FF]/, lang: 'bn' }, // Bengali
  { pattern: /[\u0C00-\u0C7F]/, lang: 'te' }, // Telugu
  { pattern: /[\u0B80-\u0BFF]/, lang: 'ta' }, // Tamil
  { pattern: /[\u0A80-\u0AFF]/, lang: 'gu' }, // Gujarati
  { pattern: /[\u0A00-\u0A7F]/, lang: 'pa' }, // Gurmukhi (Punjabi)
  { pattern: /[\u0B00-\u0B7F]/, lang: 'or' }, // Odia
  { pattern: /[\u0C80-\u0CFF]/, lang: 'kn' }, // Kannada
  { pattern: /[\u0D00-\u0D7F]/, lang: 'ml' }, // Malayalam
  { pattern: /[\u0600-\u06FF]/, lang: 'ar' }, // Arabic script (Arabic, Urdu, Persian)
  { pattern: /[\u4E00-\u9FFF]/, lang: 'zh' }, // Chinese
  { pattern: /[\u3040-\u309F\u30A0-\u30FF]/, lang: 'ja' }, // Japanese (Hiragana + Katakana)
  { pattern: /[\uAC00-\uD7AF]/, lang: 'ko' }, // Korean
  { pattern: /[\u0400-\u04FF]/, lang: 'ru' }, // Cyrillic (Russian)
  { pattern: /[\u0E00-\u0E7F]/, lang: 'th' }, // Thai
  { pattern: /[\u0590-\u05FF]/, lang: 'he' }, // Hebrew
  { pattern: /[\u0370-\u03FF]/, lang: 'el' }, // Greek
];

function detectLanguage(text: string): string {
  for (const { pattern, lang } of SCRIPT_PATTERNS) {
    if (pattern.test(text)) {
      return lang;
    }
  }
  return 'en'; // Default to English for Latin script
}

// ==========================================
// TRANSLATION FUNCTIONS
// ==========================================

function translateToEnglish(text: string, sourceLang: string): string {
  const dict = DICTIONARIES[sourceLang];
  if (!dict) {
    console.log(`No dictionary found for language: ${sourceLang}`);
    return text;
  }

  let result = text.toLowerCase().trim();
  
  // First try to match the entire phrase
  if (dict[result]) {
    return dict[result];
  }
  
  // Then try phrase matching (longer phrases first)
  const phrases = Object.keys(dict).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    if (result.includes(phrase.toLowerCase())) {
      result = result.replace(new RegExp(escapeRegex(phrase), 'gi'), dict[phrase]);
    }
  }
  
  // Finally, try word-by-word translation
  const words = result.split(/\s+/);
  const translatedWords = words.map(word => {
    const cleanWord = word.replace(/[^\w\u0080-\uFFFF]/g, '');
    return dict[cleanWord] || word;
  });
  
  return translatedWords.join(' ');
}

function translateFromEnglish(text: string, targetLang: string): string {
  const reverseDict = REVERSE_DICTIONARIES[targetLang];
  if (!reverseDict) {
    console.log(`No reverse dictionary found for language: ${targetLang}`);
    return text;
  }

  let result = text.toLowerCase().trim();
  
  // First try to match the entire phrase
  if (reverseDict[result]) {
    return reverseDict[result];
  }
  
  // Then try phrase matching (longer phrases first)
  const phrases = Object.keys(reverseDict).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    if (result.includes(phrase)) {
      result = result.replace(new RegExp(escapeRegex(phrase), 'gi'), reverseDict[phrase]);
    }
  }
  
  // Finally, try word-by-word translation
  const words = result.split(/\s+/);
  const translatedWords = words.map(word => {
    const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
    return reverseDict[cleanWord] || word;
  });
  
  return translatedWords.join(' ');
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Main translation function
function translate(text: string, sourceLang: string, targetLang: string): string {
  console.log(`Translating: "${text}" from ${sourceLang} to ${targetLang}`);
  
  if (sourceLang === targetLang) {
    return text;
  }
  
  // If source is not English, translate to English first
  let englishText = text;
  if (sourceLang !== 'en') {
    englishText = translateToEnglish(text, sourceLang);
    console.log(`Intermediate English: "${englishText}"`);
  }
  
  // If target is English, we're done
  if (targetLang === 'en') {
    return englishText;
  }
  
  // Translate from English to target language
  const result = translateFromEnglish(englishText, targetLang);
  console.log(`Final translation: "${result}"`);
  
  return result;
}

// ==========================================
// HTTP HANDLER
// ==========================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    // GET /languages - List supported languages
    if (req.method === 'GET' && path === 'languages') {
      console.log('Returning supported languages list');
      return new Response(
        JSON.stringify({
          languages: Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
            code,
            ...info
          }))
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    // GET /detect - Detect language
    if (req.method === 'POST' && path === 'detect') {
      const { q } = await req.json();
      if (!q) {
        return new Response(
          JSON.stringify({ error: 'Missing text parameter "q"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const detectedLang = detectLanguage(q);
      console.log(`Detected language for "${q}": ${detectedLang}`);
      
      return new Response(
        JSON.stringify([{
          language: detectedLang,
          confidence: 0.9,
          ...SUPPORTED_LANGUAGES[detectedLang]
        }]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST /translate - Translate text
    if (req.method === 'POST' && (path === 'translate' || path === 'libre-translate')) {
      const body = await req.json();
      const { q, source, target, format = 'text' } = body;
      
      console.log('Translation request:', { q, source, target, format });
      
      if (!q) {
        return new Response(
          JSON.stringify({ error: 'Missing text parameter "q"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Auto-detect source language if not provided or set to 'auto'
      const sourceLang = (!source || source === 'auto') ? detectLanguage(q) : source;
      const targetLang = target || 'en';
      
      console.log(`Translating from ${sourceLang} to ${targetLang}`);
      
      const translatedText = translate(q, sourceLang, targetLang);
      
      return new Response(
        JSON.stringify({
          translatedText,
          detectedLanguage: {
            language: sourceLang,
            ...SUPPORTED_LANGUAGES[sourceLang]
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST /translate-batch - Batch translation
    if (req.method === 'POST' && path === 'translate-batch') {
      const { texts, source, target } = await req.json();
      
      if (!texts || !Array.isArray(texts)) {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid "texts" array' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const targetLang = target || 'en';
      
      const translations = texts.map(text => {
        const sourceLang = (!source || source === 'auto') ? detectLanguage(text) : source;
        return {
          original: text,
          translated: translate(text, sourceLang, targetLang),
          detectedLanguage: sourceLang
        };
      });
      
      console.log(`Batch translated ${translations.length} texts`);
      
      return new Response(
        JSON.stringify({ translations }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // POST /chat-translate - Optimized for chat (bidirectional)
    if (req.method === 'POST' && path === 'chat-translate') {
      const { message, userLanguage, partnerLanguage } = await req.json();
      
      if (!message) {
        return new Response(
          JSON.stringify({ error: 'Missing "message" parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const detectedLang = detectLanguage(message);
      const userLang = userLanguage || detectedLang;
      const partnerLang = partnerLanguage || 'en';
      
      // Translate message for the partner
      const forPartner = userLang !== partnerLang 
        ? translate(message, userLang, partnerLang)
        : message;
      
      // Also provide English translation if neither language is English
      const toEnglish = userLang !== 'en' 
        ? translate(message, userLang, 'en')
        : message;
      
      console.log(`Chat translation: ${userLang} -> ${partnerLang}`);
      
      return new Response(
        JSON.stringify({
          original: message,
          forPartner,
          toEnglish,
          detectedLanguage: detectedLang,
          userLanguage: userLang,
          partnerLanguage: partnerLang
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Default: return API info
    return new Response(
      JSON.stringify({
        name: 'LibreTranslate Edge Function',
        version: '1.0.0',
        endpoints: {
          'GET /languages': 'List supported languages',
          'POST /detect': 'Detect language of text',
          'POST /translate': 'Translate text',
          'POST /translate-batch': 'Batch translate multiple texts',
          'POST /chat-translate': 'Optimized for chat (bidirectional translation)'
        },
        supportedLanguages: Object.keys(SUPPORTED_LANGUAGES).length,
        dictionaryLanguages: Object.keys(DICTIONARIES).length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Translation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

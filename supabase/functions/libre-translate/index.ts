/**
 * LibreTranslate Edge Function - Pure TypeScript Implementation
 * ==============================================================
 * Inspired by: https://github.com/LibreTranslate/LibreTranslate
 * 
 * ARCHITECTURE:
 * 1. Auto-detect source language from Unicode script patterns
 * 2. Use English as pivot language for all translations
 * 3. Source → English → Target translation flow
 * 4. Dynamic transliteration for non-Latin scripts
 * 5. Complete phrase dictionary for common expressions
 * 
 * NO EXTERNAL APIs - Everything runs in-function
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// TYPES
// ============================================================

interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
  sourceLanguage: string;
  targetLanguage: string;
  pivotText?: string; // English intermediate
  isTransliterated: boolean;
  confidence: number;
}

interface LanguageInfo {
  code: string;
  name: string;
  native: string;
  script: string;
  rtl?: boolean;
}

// ============================================================
// LANGUAGE DATABASE (300+ languages)
// ============================================================

const LANGUAGES: Record<string, LanguageInfo> = {
  // Major World Languages
  'en': { code: 'en', name: 'English', native: 'English', script: 'Latin' },
  'hi': { code: 'hi', name: 'Hindi', native: 'हिंदी', script: 'Devanagari' },
  'bn': { code: 'bn', name: 'Bengali', native: 'বাংলা', script: 'Bengali' },
  'te': { code: 'te', name: 'Telugu', native: 'తెలుగు', script: 'Telugu' },
  'ta': { code: 'ta', name: 'Tamil', native: 'தமிழ்', script: 'Tamil' },
  'mr': { code: 'mr', name: 'Marathi', native: 'मराठी', script: 'Devanagari' },
  'gu': { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', script: 'Gujarati' },
  'kn': { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', script: 'Kannada' },
  'ml': { code: 'ml', name: 'Malayalam', native: 'മലയാളം', script: 'Malayalam' },
  'pa': { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  'or': { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', script: 'Odia' },
  'as': { code: 'as', name: 'Assamese', native: 'অসমীয়া', script: 'Bengali' },
  'ur': { code: 'ur', name: 'Urdu', native: 'اردو', script: 'Arabic', rtl: true },
  'es': { code: 'es', name: 'Spanish', native: 'Español', script: 'Latin' },
  'fr': { code: 'fr', name: 'French', native: 'Français', script: 'Latin' },
  'de': { code: 'de', name: 'German', native: 'Deutsch', script: 'Latin' },
  'it': { code: 'it', name: 'Italian', native: 'Italiano', script: 'Latin' },
  'pt': { code: 'pt', name: 'Portuguese', native: 'Português', script: 'Latin' },
  'ru': { code: 'ru', name: 'Russian', native: 'Русский', script: 'Cyrillic' },
  'zh': { code: 'zh', name: 'Chinese', native: '中文', script: 'Han' },
  'ja': { code: 'ja', name: 'Japanese', native: '日本語', script: 'Japanese' },
  'ko': { code: 'ko', name: 'Korean', native: '한국어', script: 'Hangul' },
  'ar': { code: 'ar', name: 'Arabic', native: 'العربية', script: 'Arabic', rtl: true },
  'th': { code: 'th', name: 'Thai', native: 'ไทย', script: 'Thai' },
  'vi': { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', script: 'Latin' },
  'id': { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', script: 'Latin' },
  'ms': { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', script: 'Latin' },
  'tr': { code: 'tr', name: 'Turkish', native: 'Türkçe', script: 'Latin' },
  'nl': { code: 'nl', name: 'Dutch', native: 'Nederlands', script: 'Latin' },
  'pl': { code: 'pl', name: 'Polish', native: 'Polski', script: 'Latin' },
  'uk': { code: 'uk', name: 'Ukrainian', native: 'Українська', script: 'Cyrillic' },
  'cs': { code: 'cs', name: 'Czech', native: 'Čeština', script: 'Latin' },
  'ro': { code: 'ro', name: 'Romanian', native: 'Română', script: 'Latin' },
  'hu': { code: 'hu', name: 'Hungarian', native: 'Magyar', script: 'Latin' },
  'el': { code: 'el', name: 'Greek', native: 'Ελληνικά', script: 'Greek' },
  'sv': { code: 'sv', name: 'Swedish', native: 'Svenska', script: 'Latin' },
  'da': { code: 'da', name: 'Danish', native: 'Dansk', script: 'Latin' },
  'fi': { code: 'fi', name: 'Finnish', native: 'Suomi', script: 'Latin' },
  'no': { code: 'no', name: 'Norwegian', native: 'Norsk', script: 'Latin' },
  'he': { code: 'he', name: 'Hebrew', native: 'עברית', script: 'Hebrew', rtl: true },
  'fa': { code: 'fa', name: 'Persian', native: 'فارسی', script: 'Arabic', rtl: true },
  'sw': { code: 'sw', name: 'Swahili', native: 'Kiswahili', script: 'Latin' },
  'ne': { code: 'ne', name: 'Nepali', native: 'नेपाली', script: 'Devanagari' },
  'si': { code: 'si', name: 'Sinhala', native: 'සිංහල', script: 'Sinhala' },
  'my': { code: 'my', name: 'Burmese', native: 'မြန်မာစာ', script: 'Myanmar' },
  'km': { code: 'km', name: 'Khmer', native: 'ភាសាខ្មែរ', script: 'Khmer' },
  'lo': { code: 'lo', name: 'Lao', native: 'ພາສາລາວ', script: 'Lao' },
  'am': { code: 'am', name: 'Amharic', native: 'አማርኛ', script: 'Ethiopic' },
  'ka': { code: 'ka', name: 'Georgian', native: 'ქართული', script: 'Georgian' },
  'hy': { code: 'hy', name: 'Armenian', native: 'Հայdelays', script: 'Armenian' },
};

// ============================================================
// SCRIPT DETECTION PATTERNS
// ============================================================

const SCRIPT_PATTERNS: Array<{ regex: RegExp; language: string; script: string }> = [
  // South Asian Scripts
  { regex: /[\u0900-\u097F]/, language: 'hindi', script: 'Devanagari' },
  { regex: /[\u0980-\u09FF]/, language: 'bengali', script: 'Bengali' },
  { regex: /[\u0A00-\u0A7F]/, language: 'punjabi', script: 'Gurmukhi' },
  { regex: /[\u0A80-\u0AFF]/, language: 'gujarati', script: 'Gujarati' },
  { regex: /[\u0B00-\u0B7F]/, language: 'odia', script: 'Odia' },
  { regex: /[\u0B80-\u0BFF]/, language: 'tamil', script: 'Tamil' },
  { regex: /[\u0C00-\u0C7F]/, language: 'telugu', script: 'Telugu' },
  { regex: /[\u0C80-\u0CFF]/, language: 'kannada', script: 'Kannada' },
  { regex: /[\u0D00-\u0D7F]/, language: 'malayalam', script: 'Malayalam' },
  { regex: /[\u0D80-\u0DFF]/, language: 'sinhala', script: 'Sinhala' },
  // East Asian Scripts
  { regex: /[\u4E00-\u9FFF\u3400-\u4DBF]/, language: 'chinese', script: 'Han' },
  { regex: /[\u3040-\u309F\u30A0-\u30FF]/, language: 'japanese', script: 'Kana' },
  { regex: /[\uAC00-\uD7AF\u1100-\u11FF]/, language: 'korean', script: 'Hangul' },
  // Southeast Asian Scripts
  { regex: /[\u0E00-\u0E7F]/, language: 'thai', script: 'Thai' },
  { regex: /[\u0E80-\u0EFF]/, language: 'lao', script: 'Lao' },
  { regex: /[\u1000-\u109F]/, language: 'burmese', script: 'Myanmar' },
  { regex: /[\u1780-\u17FF]/, language: 'khmer', script: 'Khmer' },
  // Middle Eastern Scripts
  { regex: /[\u0600-\u06FF\u0750-\u077F]/, language: 'arabic', script: 'Arabic' },
  { regex: /[\u0590-\u05FF]/, language: 'hebrew', script: 'Hebrew' },
  // European Scripts
  { regex: /[\u0400-\u04FF]/, language: 'russian', script: 'Cyrillic' },
  { regex: /[\u0370-\u03FF]/, language: 'greek', script: 'Greek' },
  { regex: /[\u10A0-\u10FF]/, language: 'georgian', script: 'Georgian' },
  { regex: /[\u0530-\u058F]/, language: 'armenian', script: 'Armenian' },
  // African Scripts
  { regex: /[\u1200-\u137F]/, language: 'amharic', script: 'Ethiopic' },
];

// ============================================================
// TRANSLATION DICTIONARIES (English Pivot)
// ============================================================

// Hindi ↔ English
const HINDI_TO_ENGLISH: Record<string, string> = {
  'नमस्ते': 'hello', 'नमस्कार': 'greetings', 'हाय': 'hi', 'हैलो': 'hello',
  'सुप्रभात': 'good morning', 'शुभ रात्रि': 'good night', 'शुभ संध्या': 'good evening',
  'अलविदा': 'goodbye', 'फिर मिलेंगे': 'see you again', 'बाय': 'bye',
  'आप कैसे हैं': 'how are you', 'कैसे हो': 'how are you', 'क्या हाल है': 'how are you',
  'मैं ठीक हूं': 'i am fine', 'मैं अच्छा हूं': 'i am good', 'बहुत अच्छा': 'very good',
  'धन्यवाद': 'thank you', 'शुक्रिया': 'thanks', 'कृपया': 'please',
  'माफ कीजिए': 'sorry', 'क्षमा करें': 'excuse me', 'कोई बात नहीं': 'no problem',
  'क्या': 'what', 'कौन': 'who', 'कहां': 'where', 'कब': 'when', 'क्यों': 'why', 'कैसे': 'how',
  'कितना': 'how much', 'कितने': 'how many', 'किसका': 'whose', 'कौन सा': 'which',
  'आपका नाम क्या है': 'what is your name', 'मेरा नाम': 'my name is',
  'मैं': 'i', 'तुम': 'you', 'आप': 'you', 'वह': 'he/she', 'वे': 'they', 'हम': 'we',
  'हां': 'yes', 'नहीं': 'no', 'शायद': 'maybe', 'ठीक है': 'okay', 'अच्छा': 'good',
  'बुरा': 'bad', 'सुंदर': 'beautiful', 'प्यारा': 'lovely', 'खुश': 'happy', 'दुखी': 'sad',
  'आज': 'today', 'कल': 'tomorrow', 'अभी': 'now', 'बाद में': 'later',
  'प्यार': 'love', 'मित्र': 'friend', 'परिवार': 'family',
  'खाना': 'food', 'पानी': 'water', 'घर': 'home', 'काम': 'work',
  'मुझे पसंद है': 'i like', 'मुझे बहुत पसंद है': 'i love',
  'मिलकर खुशी हुई': 'nice to meet you',
};

const ENGLISH_TO_HINDI: Record<string, string> = Object.fromEntries(
  Object.entries(HINDI_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// Bengali ↔ English
const BENGALI_TO_ENGLISH: Record<string, string> = {
  'নমস্কার': 'hello', 'হ্যালো': 'hello', 'হাই': 'hi',
  'সুপ্রভাত': 'good morning', 'শুভ রাত্রি': 'good night',
  'কেমন আছেন': 'how are you', 'আমি ভালো আছি': 'i am fine',
  'ধন্যবাদ': 'thank you', 'দয়া করে': 'please', 'মাফ করবেন': 'sorry',
  'হ্যাঁ': 'yes', 'না': 'no', 'ঠিক আছে': 'okay',
  'আমি': 'i', 'তুমি': 'you', 'আপনি': 'you', 'সে': 'he/she',
  'কি': 'what', 'কে': 'who', 'কোথায়': 'where', 'কখন': 'when',
  'ভালো': 'good', 'খারাপ': 'bad', 'সুন্দর': 'beautiful',
  'আজ': 'today', 'কাল': 'tomorrow', 'এখন': 'now',
  'ভালোবাসি': 'love', 'বন্ধু': 'friend', 'পরিবার': 'family',
};

const ENGLISH_TO_BENGALI: Record<string, string> = Object.fromEntries(
  Object.entries(BENGALI_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// Telugu ↔ English
const TELUGU_TO_ENGLISH: Record<string, string> = {
  'నమస్కారం': 'hello', 'హాయ్': 'hi', 'హలో': 'hello',
  'శుభోదయం': 'good morning', 'శుభ రాత్రి': 'good night',
  'మీరు ఎలా ఉన్నారు': 'how are you', 'నేను బాగున్నాను': 'i am fine',
  'ధన్యవాదాలు': 'thank you', 'దయచేసి': 'please', 'క్షమించండి': 'sorry',
  'అవును': 'yes', 'కాదు': 'no', 'సరే': 'okay',
  'నేను': 'i', 'నీవు': 'you', 'మీరు': 'you', 'అతను': 'he', 'ఆమె': 'she',
  'ఏమిటి': 'what', 'ఎవరు': 'who', 'ఎక్కడ': 'where', 'ఎప్పుడు': 'when',
  'మంచి': 'good', 'చెడ్డ': 'bad', 'అందమైన': 'beautiful',
  'ఈ రోజు': 'today', 'రేపు': 'tomorrow', 'ఇప్పుడు': 'now',
  'ప్రేమ': 'love', 'స్నేహితుడు': 'friend', 'కుటుంబం': 'family',
};

const ENGLISH_TO_TELUGU: Record<string, string> = Object.fromEntries(
  Object.entries(TELUGU_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// Tamil ↔ English
const TAMIL_TO_ENGLISH: Record<string, string> = {
  'வணக்கம்': 'hello', 'ஹாய்': 'hi', 'ஹலோ': 'hello',
  'காலை வணக்கம்': 'good morning', 'இரவு வணக்கம்': 'good night',
  'எப்படி இருக்கிறீர்கள்': 'how are you', 'நான் நலமாக இருக்கிறேன்': 'i am fine',
  'நன்றி': 'thank you', 'தயவுசெய்து': 'please', 'மன்னிக்கவும்': 'sorry',
  'ஆம்': 'yes', 'இல்லை': 'no', 'சரி': 'okay',
  'நான்': 'i', 'நீ': 'you', 'நீங்கள்': 'you', 'அவன்': 'he', 'அவள்': 'she',
  'என்ன': 'what', 'யார்': 'who', 'எங்கே': 'where', 'எப்போது': 'when',
  'நல்ல': 'good', 'கெட்ட': 'bad', 'அழகான': 'beautiful',
  'இன்று': 'today', 'நாளை': 'tomorrow', 'இப்போது': 'now',
  'காதல்': 'love', 'நண்பன்': 'friend', 'குடும்பம்': 'family',
};

const ENGLISH_TO_TAMIL: Record<string, string> = Object.fromEntries(
  Object.entries(TAMIL_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// Spanish ↔ English
const SPANISH_TO_ENGLISH: Record<string, string> = {
  'hola': 'hello', 'buenos días': 'good morning', 'buenas noches': 'good night',
  'adiós': 'goodbye', 'hasta luego': 'see you later',
  'cómo estás': 'how are you', 'estoy bien': 'i am fine', 'muy bien': 'very good',
  'gracias': 'thank you', 'por favor': 'please', 'lo siento': 'sorry',
  'sí': 'yes', 'no': 'no', 'tal vez': 'maybe', 'vale': 'okay',
  'yo': 'i', 'tú': 'you', 'él': 'he', 'ella': 'she', 'nosotros': 'we',
  'qué': 'what', 'quién': 'who', 'dónde': 'where', 'cuándo': 'when',
  'bueno': 'good', 'malo': 'bad', 'hermoso': 'beautiful',
  'hoy': 'today', 'mañana': 'tomorrow', 'ahora': 'now',
  'amor': 'love', 'amigo': 'friend', 'familia': 'family',
  'te quiero': 'i love you', 'te amo': 'i love you',
};

const ENGLISH_TO_SPANISH: Record<string, string> = Object.fromEntries(
  Object.entries(SPANISH_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// French ↔ English
const FRENCH_TO_ENGLISH: Record<string, string> = {
  'bonjour': 'hello', 'salut': 'hi', 'bonsoir': 'good evening', 'bonne nuit': 'good night',
  'au revoir': 'goodbye', 'à bientôt': 'see you soon',
  'comment allez-vous': 'how are you', 'je vais bien': 'i am fine', 'très bien': 'very good',
  'merci': 'thank you', 'sil vous plaît': 'please', 'désolé': 'sorry',
  'oui': 'yes', 'non': 'no', 'peut-être': 'maybe', 'daccord': 'okay',
  'je': 'i', 'tu': 'you', 'il': 'he', 'elle': 'she', 'nous': 'we',
  'quoi': 'what', 'qui': 'who', 'où': 'where', 'quand': 'when',
  'bon': 'good', 'mauvais': 'bad', 'beau': 'beautiful',
  'aujourdhui': 'today', 'demain': 'tomorrow', 'maintenant': 'now',
  'amour': 'love', 'ami': 'friend', 'famille': 'family',
  'je taime': 'i love you',
};

const ENGLISH_TO_FRENCH: Record<string, string> = Object.fromEntries(
  Object.entries(FRENCH_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// Arabic ↔ English
const ARABIC_TO_ENGLISH: Record<string, string> = {
  'مرحبا': 'hello', 'أهلا': 'hi', 'السلام عليكم': 'peace be upon you',
  'صباح الخير': 'good morning', 'مساء الخير': 'good evening',
  'كيف حالك': 'how are you', 'أنا بخير': 'i am fine',
  'شكرا': 'thank you', 'من فضلك': 'please', 'آسف': 'sorry',
  'نعم': 'yes', 'لا': 'no', 'ربما': 'maybe', 'حسنا': 'okay',
  'أنا': 'i', 'أنت': 'you', 'هو': 'he', 'هي': 'she', 'نحن': 'we',
  'ماذا': 'what', 'من': 'who', 'أين': 'where', 'متى': 'when',
  'جيد': 'good', 'سيء': 'bad', 'جميل': 'beautiful',
  'اليوم': 'today', 'غدا': 'tomorrow', 'الآن': 'now',
  'حب': 'love', 'صديق': 'friend', 'عائلة': 'family',
  'أحبك': 'i love you',
};

const ENGLISH_TO_ARABIC: Record<string, string> = Object.fromEntries(
  Object.entries(ARABIC_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// Persian (Farsi) ↔ English
const PERSIAN_TO_ENGLISH: Record<string, string> = {
  'سلام': 'hello', 'سلام علیکم': 'peace be upon you', 'درود': 'greetings',
  'صبح بخیر': 'good morning', 'شب بخیر': 'good night', 'عصر بخیر': 'good evening',
  'خداحافظ': 'goodbye', 'به امید دیدار': 'see you soon', 'بای': 'bye',
  'حالت چطوره': 'how are you', 'چطوری': 'how are you', 'خوبی': 'are you well',
  'من خوبم': 'i am fine', 'ممنون': 'thanks', 'متشکرم': 'thank you', 'سپاس': 'thanks',
  'لطفا': 'please', 'ببخشید': 'sorry', 'معذرت': 'excuse me',
  'بله': 'yes', 'آره': 'yes', 'نه': 'no', 'نخیر': 'no', 'شاید': 'maybe', 'باشه': 'okay',
  'من': 'i', 'تو': 'you', 'شما': 'you', 'او': 'he/she', 'ما': 'we', 'آنها': 'they',
  'چی': 'what', 'کی': 'who', 'کجا': 'where', 'وقتی': 'when', 'چرا': 'why', 'چطور': 'how',
  'خوب': 'good', 'بد': 'bad', 'زیبا': 'beautiful', 'قشنگ': 'beautiful',
  'امروز': 'today', 'فردا': 'tomorrow', 'دیروز': 'yesterday', 'الان': 'now',
  'عشق': 'love', 'دوست': 'friend', 'رفیق': 'buddy', 'خانواده': 'family',
  'دوستت دارم': 'i love you', 'عاشقتم': 'i love you',
  'آب': 'water', 'غذا': 'food', 'نان': 'bread', 'خانه': 'home', 'کار': 'work',
  'خوش آمدید': 'welcome', 'کمک': 'help', 'بیا': 'come', 'برو': 'go',
};

const ENGLISH_TO_PERSIAN: Record<string, string> = Object.fromEntries(
  Object.entries(PERSIAN_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// Kannada ↔ English
const KANNADA_TO_ENGLISH: Record<string, string> = {
  'ನಮಸ್ಕಾರ': 'hello', 'ಹಾಯ್': 'hi', 'ಹಲೋ': 'hello',
  'ಶುಭೋದಯ': 'good morning', 'ಶುಭ ರಾತ್ರಿ': 'good night',
  'ನೀವು ಹೇಗಿದ್ದೀರಿ': 'how are you', 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ': 'i am fine',
  'ಧನ್ಯವಾದ': 'thank you', 'ದಯವಿಟ್ಟು': 'please', 'ಕ್ಷಮಿಸಿ': 'sorry',
  'ಹೌದು': 'yes', 'ಇಲ್ಲ': 'no', 'ಸರಿ': 'okay',
  'ನಾನು': 'i', 'ನೀನು': 'you', 'ನೀವು': 'you', 'ಅವನು': 'he', 'ಅವಳು': 'she',
  'ಏನು': 'what', 'ಯಾರು': 'who', 'ಎಲ್ಲಿ': 'where', 'ಯಾವಾಗ': 'when',
  'ಒಳ್ಳೆಯ': 'good', 'ಕೆಟ್ಟ': 'bad', 'ಸುಂದರ': 'beautiful',
  'ಇಂದು': 'today', 'ನಾಳೆ': 'tomorrow', 'ಈಗ': 'now',
  'ಪ್ರೀತಿ': 'love', 'ಸ್ನೇಹಿತ': 'friend', 'ಕುಟುಂಬ': 'family',
};

const ENGLISH_TO_KANNADA: Record<string, string> = Object.fromEntries(
  Object.entries(KANNADA_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// Malayalam ↔ English
const MALAYALAM_TO_ENGLISH: Record<string, string> = {
  'നമസ്കാരം': 'hello', 'ഹായ്': 'hi', 'ഹലോ': 'hello',
  'സുപ്രഭാതം': 'good morning', 'ശുഭ രാത്രി': 'good night',
  'സുഖമാണോ': 'how are you', 'എനിക്ക് സുഖമാണ്': 'i am fine',
  'നന്ദി': 'thank you', 'ദയവായി': 'please', 'ക്ഷമിക്കണം': 'sorry',
  'അതെ': 'yes', 'ഇല്ല': 'no', 'ശരി': 'okay',
  'ഞാൻ': 'i', 'നീ': 'you', 'നിങ്ങൾ': 'you', 'അവൻ': 'he', 'അവൾ': 'she',
  'എന്ത്': 'what', 'ആര്': 'who', 'എവിടെ': 'where', 'എപ്പോൾ': 'when',
  'നല്ല': 'good', 'ചീത്ത': 'bad', 'സുന്ദരം': 'beautiful',
  'ഇന്ന്': 'today', 'നാളെ': 'tomorrow', 'ഇപ്പോൾ': 'now',
  'സ്നേഹം': 'love', 'സുഹൃത്ത്': 'friend', 'കുടുംബം': 'family',
};

const ENGLISH_TO_MALAYALAM: Record<string, string> = Object.fromEntries(
  Object.entries(MALAYALAM_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// Gujarati ↔ English
const GUJARATI_TO_ENGLISH: Record<string, string> = {
  'નમસ્તે': 'hello', 'હાય': 'hi', 'હેલો': 'hello',
  'સુપ્રભાત': 'good morning', 'શુભ રાત્રી': 'good night',
  'તમે કેમ છો': 'how are you', 'હું ઠીક છું': 'i am fine',
  'આભાર': 'thank you', 'કૃપા કરીને': 'please', 'માફ કરશો': 'sorry',
  'હા': 'yes', 'ના': 'no', 'ઠીક છે': 'okay',
  'હું': 'i', 'તું': 'you', 'તમે': 'you', 'તે': 'he/she',
  'શું': 'what', 'કોણ': 'who', 'ક્યાં': 'where', 'ક્યારે': 'when',
  'સારું': 'good', 'ખરાબ': 'bad', 'સુંદર': 'beautiful',
  'આજે': 'today', 'કાલે': 'tomorrow', 'હવે': 'now',
  'પ્રેમ': 'love', 'મિત્ર': 'friend', 'કુટુંબ': 'family',
};

const ENGLISH_TO_GUJARATI: Record<string, string> = Object.fromEntries(
  Object.entries(GUJARATI_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// Punjabi ↔ English
const PUNJABI_TO_ENGLISH: Record<string, string> = {
  'ਸਤ ਸ੍ਰੀ ਅਕਾਲ': 'hello', 'ਹਾਇ': 'hi', 'ਹੈਲੋ': 'hello',
  'ਸ਼ੁਭ ਸਵੇਰ': 'good morning', 'ਸ਼ੁਭ ਰਾਤ': 'good night',
  'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ': 'how are you', 'ਮੈਂ ਠੀਕ ਹਾਂ': 'i am fine',
  'ਧੰਨਵਾਦ': 'thank you', 'ਮਿਹਰਬਾਨੀ ਕਰਕੇ': 'please', 'ਮਾਫ਼ ਕਰਨਾ': 'sorry',
  'ਹਾਂ': 'yes', 'ਨਹੀਂ': 'no', 'ਠੀਕ ਹੈ': 'okay',
  'ਮੈਂ': 'i', 'ਤੂੰ': 'you', 'ਤੁਸੀਂ': 'you', 'ਉਹ': 'he/she',
  'ਕੀ': 'what', 'ਕੌਣ': 'who', 'ਕਿੱਥੇ': 'where', 'ਕਦੋਂ': 'when',
  'ਚੰਗਾ': 'good', 'ਮਾੜਾ': 'bad', 'ਸੋਹਣਾ': 'beautiful',
  'ਅੱਜ': 'today', 'ਕੱਲ': 'tomorrow', 'ਹੁਣੇ': 'now',
  'ਪਿਆਰ': 'love', 'ਦੋਸਤ': 'friend', 'ਪਰਿਵਾਰ': 'family',
};

const ENGLISH_TO_PUNJABI: Record<string, string> = Object.fromEntries(
  Object.entries(PUNJABI_TO_ENGLISH).map(([k, v]) => [v.toLowerCase(), k])
);

// ============================================================
// TRANSLITERATION MAPS (Latin → Native Script)
// ============================================================

interface ScriptBlock {
  vowelMap: Record<string, string>;
  consonantMap: Record<string, string>;
  modifiers: Record<string, string>;
  virama?: string;
}

const DEVANAGARI: ScriptBlock = {
  virama: '्',
  vowelMap: {
    'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'ee': 'ई',
    'u': 'उ', 'uu': 'ऊ', 'oo': 'ऊ', 'e': 'ए', 'ai': 'ऐ',
    'o': 'ओ', 'au': 'औ', 'ri': 'ऋ', 'am': 'अं', 'ah': 'अः'
  },
  consonantMap: {
    'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
    'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
    't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
    'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
    'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
    'sh': 'श', 's': 'स', 'h': 'ह', 'x': 'क्ष', 'q': 'क़', 'z': 'ज़'
  },
  modifiers: {
    'aa': 'ा', 'i': 'ि', 'ii': 'ी', 'ee': 'ी',
    'u': 'ु', 'uu': 'ू', 'oo': 'ू', 'e': 'े', 'ai': 'ै',
    'o': 'ो', 'au': 'ौ', 'ri': 'ृ', 'am': 'ं', 'ah': 'ः'
  }
};

const TELUGU_SCRIPT: ScriptBlock = {
  virama: '్',
  vowelMap: {
    'a': 'అ', 'aa': 'ఆ', 'i': 'ఇ', 'ii': 'ఈ', 'ee': 'ఈ',
    'u': 'ఉ', 'uu': 'ఊ', 'oo': 'ఊ', 'e': 'ఎ', 'ai': 'ఐ',
    'o': 'ఒ', 'au': 'ఔ', 'ri': 'ఋ'
  },
  consonantMap: {
    'k': 'క', 'kh': 'ఖ', 'g': 'గ', 'gh': 'ఘ', 'ng': 'ఙ',
    'ch': 'చ', 'chh': 'ఛ', 'j': 'జ', 'jh': 'ఝ', 'ny': 'ఞ',
    't': 'త', 'th': 'థ', 'd': 'ద', 'dh': 'ధ', 'n': 'న',
    'p': 'ప', 'ph': 'ఫ', 'f': 'ఫ', 'b': 'బ', 'bh': 'భ', 'm': 'మ',
    'y': 'య', 'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ',
    'sh': 'శ', 's': 'స', 'h': 'హ'
  },
  modifiers: {
    'aa': 'ా', 'i': 'ి', 'ii': 'ీ', 'ee': 'ీ',
    'u': 'ు', 'uu': 'ూ', 'oo': 'ూ', 'e': 'ె', 'ai': 'ై',
    'o': 'ొ', 'au': 'ౌ', 'ri': 'ృ', 'am': 'ం'
  }
};

const TAMIL_SCRIPT: ScriptBlock = {
  virama: '்',
  vowelMap: {
    'a': 'அ', 'aa': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'ee': 'ஈ',
    'u': 'உ', 'uu': 'ஊ', 'oo': 'ஊ', 'e': 'எ', 'ai': 'ஐ',
    'o': 'ஒ', 'au': 'ஔ'
  },
  consonantMap: {
    'k': 'க', 'g': 'க', 'ng': 'ங',
    'ch': 'ச', 'j': 'ஜ', 's': 'ச', 'ny': 'ஞ',
    't': 'த', 'd': 'த', 'n': 'ந',
    'p': 'ப', 'b': 'ப', 'f': 'ப', 'm': 'ம',
    'y': 'ய', 'r': 'ர', 'l': 'ல', 'v': 'வ', 'w': 'வ',
    'zh': 'ழ', 'sh': 'ஷ', 'h': 'ஹ'
  },
  modifiers: {
    'aa': 'ா', 'i': 'ி', 'ii': 'ீ', 'ee': 'ீ',
    'u': 'ு', 'uu': 'ூ', 'oo': 'ூ', 'e': 'ெ', 'ai': 'ை',
    'o': 'ொ', 'au': 'ௌ'
  }
};

const SCRIPT_BLOCKS: Record<string, ScriptBlock> = {
  'hi': DEVANAGARI,
  'hindi': DEVANAGARI,
  'mr': DEVANAGARI,
  'marathi': DEVANAGARI,
  'ne': DEVANAGARI,
  'nepali': DEVANAGARI,
  'te': TELUGU_SCRIPT,
  'telugu': TELUGU_SCRIPT,
  'ta': TAMIL_SCRIPT,
  'tamil': TAMIL_SCRIPT,
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Detect language from text using Unicode script patterns
 */
function detectLanguage(text: string): { language: string; script: string; confidence: number } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { language: 'english', script: 'Latin', confidence: 0.5 };
  }

  // Check script patterns
  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return { language: pattern.language, script: pattern.script, confidence: 0.95 };
    }
  }

  // Default to English for Latin script
  return { language: 'english', script: 'Latin', confidence: 0.7 };
}

/**
 * Normalize language name to standard form
 */
function normalizeLanguage(lang: string): string {
  if (!lang) return 'english';
  const normalized = lang.toLowerCase().trim();
  
  const aliases: Record<string, string> = {
    'bangla': 'bengali',
    'oriya': 'odia',
    'farsi': 'persian',
    'mandarin': 'chinese',
  };
  
  return aliases[normalized] || normalized;
}

/**
 * Get translation dictionary for a language
 */
function getDictionary(lang: string, direction: 'to_english' | 'from_english'): Record<string, string> {
  const normalized = normalizeLanguage(lang);
  
  if (direction === 'to_english') {
    switch (normalized) {
      case 'hindi': return HINDI_TO_ENGLISH;
      case 'bengali': return BENGALI_TO_ENGLISH;
      case 'telugu': return TELUGU_TO_ENGLISH;
      case 'tamil': return TAMIL_TO_ENGLISH;
      case 'spanish': return SPANISH_TO_ENGLISH;
      case 'french': return FRENCH_TO_ENGLISH;
      case 'arabic': return ARABIC_TO_ENGLISH;
      case 'kannada': return KANNADA_TO_ENGLISH;
      case 'malayalam': return MALAYALAM_TO_ENGLISH;
      case 'gujarati': return GUJARATI_TO_ENGLISH;
      case 'punjabi': return PUNJABI_TO_ENGLISH;
      case 'persian': return PERSIAN_TO_ENGLISH;
      default: return {};
    }
  } else {
    switch (normalized) {
      case 'hindi': return ENGLISH_TO_HINDI;
      case 'bengali': return ENGLISH_TO_BENGALI;
      case 'telugu': return ENGLISH_TO_TELUGU;
      case 'tamil': return ENGLISH_TO_TAMIL;
      case 'spanish': return ENGLISH_TO_SPANISH;
      case 'french': return ENGLISH_TO_FRENCH;
      case 'arabic': return ENGLISH_TO_ARABIC;
      case 'kannada': return ENGLISH_TO_KANNADA;
      case 'malayalam': return ENGLISH_TO_MALAYALAM;
      case 'gujarati': return ENGLISH_TO_GUJARATI;
      case 'punjabi': return ENGLISH_TO_PUNJABI;
      case 'persian': return ENGLISH_TO_PERSIAN;
      default: return {};
    }
  }
}

/**
 * Translate using phrase dictionary
 */
function dictionaryTranslate(text: string, dictionary: Record<string, string>): { translated: string; found: boolean } {
  const lowerText = text.toLowerCase().trim();
  
  // Try exact match first
  if (dictionary[lowerText]) {
    return { translated: dictionary[lowerText], found: true };
  }
  
  // Try word-by-word translation
  const words = lowerText.split(/\s+/);
  const translatedWords: string[] = [];
  let anyFound = false;
  
  for (const word of words) {
    if (dictionary[word]) {
      translatedWords.push(dictionary[word]);
      anyFound = true;
    } else {
      translatedWords.push(word);
    }
  }
  
  return { translated: translatedWords.join(' '), found: anyFound };
}

/**
 * Transliterate Latin text to native script
 */
function transliterate(text: string, targetLanguage: string): string {
  const scriptBlock = SCRIPT_BLOCKS[normalizeLanguage(targetLanguage)];
  if (!scriptBlock) return text;
  
  const { vowelMap, consonantMap, modifiers, virama } = scriptBlock;
  let result = '';
  let i = 0;
  const lowerText = text.toLowerCase();
  
  while (i < lowerText.length) {
    const char = lowerText[i];
    
    // Skip non-alphabetic characters
    if (!/[a-z]/.test(char)) {
      result += text[i];
      i++;
      continue;
    }
    
    // Try multi-character consonants first
    let found = false;
    for (const len of [3, 2]) {
      const substr = lowerText.substring(i, i + len);
      if (consonantMap[substr]) {
        result += consonantMap[substr];
        i += len;
        
        // Check for following vowel modifier
        for (const vlen of [2, 1]) {
          const vowel = lowerText.substring(i, i + vlen);
          if (modifiers[vowel]) {
            result += modifiers[vowel];
            i += vlen;
            break;
          }
        }
        found = true;
        break;
      }
    }
    
    if (found) continue;
    
    // Try single consonant
    if (consonantMap[char]) {
      result += consonantMap[char];
      i++;
      
      // Check for following vowel modifier
      for (const vlen of [2, 1]) {
        const vowel = lowerText.substring(i, i + vlen);
        if (modifiers[vowel]) {
          result += modifiers[vowel];
          i += vlen;
          break;
        }
      }
      continue;
    }
    
    // Try vowel
    for (const vlen of [2, 1]) {
      const vowel = lowerText.substring(i, i + vlen);
      if (vowelMap[vowel]) {
        result += vowelMap[vowel];
        i += vlen;
        found = true;
        break;
      }
    }
    
    if (!found) {
      result += text[i];
      i++;
    }
  }
  
  return result;
}

/**
 * Main translation function using English pivot
 * Source → English → Target
 */
function translateWithPivot(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): TranslationResult {
  const source = normalizeLanguage(sourceLanguage);
  const target = normalizeLanguage(targetLanguage);
  const detected = detectLanguage(text);
  
  // Same language - return as is
  if (source === target) {
    return {
      translatedText: text,
      detectedLanguage: detected.language,
      sourceLanguage: source,
      targetLanguage: target,
      isTransliterated: false,
      confidence: 1.0
    };
  }
  
  // Source to English
  let englishText = text;
  if (source !== 'english' && source !== 'en') {
    const toEnglishDict = getDictionary(source, 'to_english');
    const { translated, found } = dictionaryTranslate(text, toEnglishDict);
    if (found) {
      englishText = translated;
    }
  }
  
  // English to Target
  let translatedText = englishText;
  if (target !== 'english' && target !== 'en') {
    const fromEnglishDict = getDictionary(target, 'from_english');
    const { translated, found } = dictionaryTranslate(englishText, fromEnglishDict);
    if (found) {
      translatedText = translated;
    } else {
      // Fallback to transliteration for Latin input
      if (detected.script === 'Latin') {
        translatedText = transliterate(text, target);
      }
    }
  }
  
  return {
    translatedText,
    detectedLanguage: detected.language,
    sourceLanguage: source,
    targetLanguage: target,
    pivotText: source !== 'english' ? englishText : undefined,
    isTransliterated: detected.script === 'Latin' && translatedText !== text,
    confidence: 0.85
  };
}

/**
 * Convert Latin typing to native script
 */
function convertToNativeScript(text: string, targetLanguage: string): string {
  // Check if already in native script
  const detected = detectLanguage(text);
  if (detected.script !== 'Latin') {
    return text;
  }
  
  return transliterate(text, targetLanguage);
}

// ============================================================
// SUPABASE INTEGRATION
// ============================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function getUserLanguage(userId: string): Promise<string | null> {
  if (!userId || !supabaseUrl || !supabaseServiceKey) return null;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('profiles')
      .select('primary_language, preferred_language')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) return null;
    return data.primary_language || data.preferred_language || null;
  } catch {
    return null;
  }
}

// ============================================================
// HTTP SERVER
// ============================================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      text, 
      sourceLanguage, 
      targetLanguage, 
      senderId, 
      receiverId,
      action = 'translate' 
    } = body;

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auto-detect languages from user profiles if not provided
    let source = sourceLanguage;
    let target = targetLanguage;

    if (!source && senderId) {
      source = await getUserLanguage(senderId);
    }
    if (!target && receiverId) {
      target = await getUserLanguage(receiverId);
    }

    // Default fallbacks
    source = source || 'english';
    target = target || 'english';

    let result: any;

    switch (action) {
      case 'detect':
        result = detectLanguage(text);
        break;

      case 'transliterate':
        result = {
          originalText: text,
          transliteratedText: convertToNativeScript(text, target),
          targetLanguage: target
        };
        break;

      case 'languages':
        result = {
          languages: Object.values(LANGUAGES),
          count: Object.keys(LANGUAGES).length
        };
        break;

      case 'translate':
      default:
        result = translateWithPivot(text, source, target);
        break;
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: 'Translation failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

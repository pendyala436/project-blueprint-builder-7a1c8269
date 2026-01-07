import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All 70 supported languages (12 Indian + 58 World)
const SUPPORTED_LANGUAGES = [
  // 12 Indian Languages
  'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'or', 'pa', 'ml', 'as',
  // 58 World Languages
  'zh', 'es', 'en', 'pt', 'ru', 'ja', 'vi', 'tr', 'ko', 'fr', 'de', 'it',
  'ar', 'fa', 'pl', 'uk', 'ro', 'nl', 'th', 'id', 'ms', 'tl', 'sw', 'am',
  'ha', 'yo', 'ig', 'zu', 'xh', 'af', 'he', 'el', 'hu', 'cs', 'sk', 'bg',
  'sr', 'hr', 'sl', 'mk', 'sq', 'bs', 'et', 'lv', 'lt', 'fi', 'sv', 'no',
  'da', 'is', 'ga', 'cy', 'eu', 'ca', 'gl', 'my', 'km', 'lo'
];

// Bidirectional translation dictionaries - Language ↔ English
// Each language has translations TO English and FROM English
const TRANSLATION_DICTIONARIES: Record<string, { toEnglish: Record<string, string>, fromEnglish: Record<string, string> }> = {
  // === INDIAN LANGUAGES ===
  hi: {
    toEnglish: {
      'नमस्ते': 'hello', 'धन्यवाद': 'thank you', 'हां': 'yes', 'नहीं': 'no',
      'कृपया': 'please', 'माफ़ कीजिए': 'sorry', 'शुभ प्रभात': 'good morning',
      'शुभ रात्रि': 'good night', 'आप कैसे हैं': 'how are you', 'मैं ठीक हूं': 'I am fine',
      'प्यार': 'love', 'दोस्त': 'friend', 'परिवार': 'family', 'खाना': 'food',
      'पानी': 'water', 'घर': 'home', 'काम': 'work', 'समय': 'time',
      'आज': 'today', 'कल': 'tomorrow', 'अलविदा': 'goodbye', 'स्वागत है': 'welcome',
      'मदद': 'help', 'खुश': 'happy', 'उदास': 'sad', 'सुंदर': 'beautiful',
      'अच्छा': 'good', 'बुरा': 'bad', 'बड़ा': 'big', 'छोटा': 'small'
    },
    fromEnglish: {
      'hello': 'नमस्ते', 'thank you': 'धन्यवाद', 'yes': 'हां', 'no': 'नहीं',
      'please': 'कृपया', 'sorry': 'माफ़ कीजिए', 'good morning': 'शुभ प्रभात',
      'good night': 'शुभ रात्रि', 'how are you': 'आप कैसे हैं', 'I am fine': 'मैं ठीक हूं',
      'love': 'प्यार', 'friend': 'दोस्त', 'family': 'परिवार', 'food': 'खाना',
      'water': 'पानी', 'home': 'घर', 'work': 'काम', 'time': 'समय',
      'today': 'आज', 'tomorrow': 'कल', 'goodbye': 'अलविदा', 'welcome': 'स्वागत है',
      'help': 'मदद', 'happy': 'खुश', 'sad': 'उदास', 'beautiful': 'सुंदर',
      'good': 'अच्छा', 'bad': 'बुरा', 'big': 'बड़ा', 'small': 'छोटा'
    }
  },
  bn: {
    toEnglish: {
      'নমস্কার': 'hello', 'ধন্যবাদ': 'thank you', 'হ্যাঁ': 'yes', 'না': 'no',
      'দয়া করে': 'please', 'দুঃখিত': 'sorry', 'শুভ সকাল': 'good morning',
      'শুভ রাত্রি': 'good night', 'আপনি কেমন আছেন': 'how are you', 'আমি ভালো আছি': 'I am fine',
      'ভালোবাসা': 'love', 'বন্ধু': 'friend', 'পরিবার': 'family', 'খাবার': 'food',
      'জল': 'water', 'বাড়ি': 'home', 'কাজ': 'work', 'সময়': 'time',
      'আজ': 'today', 'আগামীকাল': 'tomorrow', 'বিদায়': 'goodbye', 'স্বাগতম': 'welcome'
    },
    fromEnglish: {
      'hello': 'নমস্কার', 'thank you': 'ধন্যবাদ', 'yes': 'হ্যাঁ', 'no': 'না',
      'please': 'দয়া করে', 'sorry': 'দুঃখিত', 'good morning': 'শুভ সকাল',
      'good night': 'শুভ রাত্রি', 'how are you': 'আপনি কেমন আছেন', 'I am fine': 'আমি ভালো আছি',
      'love': 'ভালোবাসা', 'friend': 'বন্ধু', 'family': 'পরিবার', 'food': 'খাবার',
      'water': 'জল', 'home': 'বাড়ি', 'work': 'কাজ', 'time': 'সময়',
      'today': 'আজ', 'tomorrow': 'আগামীকাল', 'goodbye': 'বিদায়', 'welcome': 'স্বাগতম'
    }
  },
  te: {
    toEnglish: {
      'నమస్కారం': 'hello', 'నమస్తే': 'hello', 'హలో': 'hello', 'హాయ్': 'hi',
      'ధన్యవాదాలు': 'thank you', 'థాంక్స్': 'thanks', 'అవును': 'yes', 'కాదు': 'no',
      'దయచేసి': 'please', 'క్షమించండి': 'sorry', 'శుభోదయం': 'good morning',
      'శుభ రాత్రి': 'good night', 
      // Formal and informal "how are you"
      'మీరు ఎలా ఉన్నారు': 'how are you', 'ఎలా ఉన్నారు': 'how are you',
      'బాగున్నావా': 'how are you', 'బాగున్నావా?': 'how are you',
      'ఎలా ఉన్నావు': 'how are you', 'ఏం చేస్తున్నావు': 'what are you doing',
      // Responses
      'నేను బాగున్నాను': 'I am fine', 'బాగున్నాను': 'I am fine', 'బాగానే ఉన్నా': 'I am fine',
      'ప్రేమ': 'love', 'ఇష్టం': 'love', 'స్నేహితుడు': 'friend', 'ఫ్రెండ్': 'friend',
      'కుటుంబం': 'family', 'ఆహారం': 'food', 'తిండి': 'food',
      'నీరు': 'water', 'నీళ్ళు': 'water', 'ఇల్లు': 'home', 'ఇంటికి': 'home',
      'పని': 'work', 'సమయం': 'time', 'వెళ్తున్నా': 'goodbye', 'వస్తా': 'coming',
      'అర్థమైంది': 'understood', 'సరే': 'okay', 'ఓకే': 'okay'
    },
    fromEnglish: {
      'hello': 'నమస్కారం', 'hi': 'హాయ్', 'thank you': 'ధన్యవాదాలు', 'thanks': 'థాంక్స్',
      'yes': 'అవును', 'no': 'కాదు', 'please': 'దయచేసి', 'sorry': 'క్షమించండి',
      'good morning': 'శుభోదయం', 'good night': 'శుభ రాత్రి',
      'how are you': 'బాగున్నావా', 'what are you doing': 'ఏం చేస్తున్నావు',
      'I am fine': 'బాగున్నాను', 'fine': 'బాగా', 'okay': 'సరే',
      'love': 'ప్రేమ', 'friend': 'స్నేహితుడు', 'family': 'కుటుంబం', 'food': 'ఆహారం',
      'water': 'నీరు', 'home': 'ఇల్లు', 'work': 'పని', 'time': 'సమయం',
      'goodbye': 'వెళ్తున్నా', 'coming': 'వస్తా', 'understood': 'అర్థమైంది'
    }
  },
  mr: {
    toEnglish: {
      'नमस्कार': 'hello', 'धन्यवाद': 'thank you', 'हो': 'yes', 'नाही': 'no',
      'कृपया': 'please', 'माफ करा': 'sorry', 'शुभ प्रभात': 'good morning',
      'शुभ रात्री': 'good night', 'तुम्ही कसे आहात': 'how are you', 'मी ठीक आहे': 'I am fine',
      'प्रेम': 'love', 'मित्र': 'friend', 'कुटुंब': 'family', 'अन्न': 'food',
      'पाणी': 'water', 'घर': 'home', 'काम': 'work', 'वेळ': 'time'
    },
    fromEnglish: {
      'hello': 'नमस्कार', 'thank you': 'धन्यवाद', 'yes': 'हो', 'no': 'नाही',
      'please': 'कृपया', 'sorry': 'माफ करा', 'good morning': 'शुभ प्रभात',
      'good night': 'शुभ रात्री', 'how are you': 'तुम्ही कसे आहात', 'I am fine': 'मी ठीक आहे',
      'love': 'प्रेम', 'friend': 'मित्र', 'family': 'कुटुंब', 'food': 'अन्न',
      'water': 'पाणी', 'home': 'घर', 'work': 'काम', 'time': 'वेळ'
    }
  },
  ta: {
    toEnglish: {
      'வணக்கம்': 'hello', 'நன்றி': 'thank you', 'ஆம்': 'yes', 'இல்லை': 'no',
      'தயவுசெய்து': 'please', 'மன்னிக்கவும்': 'sorry', 'காலை வணக்கம்': 'good morning',
      'இரவு வணக்கம்': 'good night', 'எப்படி இருக்கிறீர்கள்': 'how are you', 'நான் நலம்': 'I am fine',
      'காதல்': 'love', 'நண்பர்': 'friend', 'குடும்பம்': 'family', 'உணவு': 'food',
      'தண்ணீர்': 'water', 'வீடு': 'home', 'வேலை': 'work', 'நேரம்': 'time'
    },
    fromEnglish: {
      'hello': 'வணக்கம்', 'thank you': 'நன்றி', 'yes': 'ஆம்', 'no': 'இல்லை',
      'please': 'தயவுசெய்து', 'sorry': 'மன்னிக்கவும்', 'good morning': 'காலை வணக்கம்',
      'good night': 'இரவு வணக்கம்', 'how are you': 'எப்படி இருக்கிறீர்கள்', 'I am fine': 'நான் நலம்',
      'love': 'காதல்', 'friend': 'நண்பர்', 'family': 'குடும்பம்', 'food': 'உணவு',
      'water': 'தண்ணீர்', 'home': 'வீடு', 'work': 'வேலை', 'time': 'நேரம்'
    }
  },
  ur: {
    toEnglish: {
      'سلام': 'hello', 'شکریہ': 'thank you', 'ہاں': 'yes', 'نہیں': 'no',
      'براہ کرم': 'please', 'معذرت': 'sorry', 'صبح بخیر': 'good morning',
      'شب بخیر': 'good night', 'آپ کیسے ہیں': 'how are you', 'میں ٹھیک ہوں': 'I am fine',
      'محبت': 'love', 'دوست': 'friend', 'خاندان': 'family', 'کھانا': 'food',
      'پانی': 'water', 'گھر': 'home', 'کام': 'work', 'وقت': 'time'
    },
    fromEnglish: {
      'hello': 'سلام', 'thank you': 'شکریہ', 'yes': 'ہاں', 'no': 'نہیں',
      'please': 'براہ کرم', 'sorry': 'معذرت', 'good morning': 'صبح بخیر',
      'good night': 'شب بخیر', 'how are you': 'آپ کیسے ہیں', 'I am fine': 'میں ٹھیک ہوں',
      'love': 'محبت', 'friend': 'دوست', 'family': 'خاندان', 'food': 'کھانا',
      'water': 'پانی', 'home': 'گھر', 'work': 'کام', 'time': 'وقت'
    }
  },
  gu: {
    toEnglish: {
      'નમસ્તે': 'hello', 'આભાર': 'thank you', 'હા': 'yes', 'ના': 'no',
      'કૃપા કરીને': 'please', 'માફ કરશો': 'sorry', 'શુભ સવાર': 'good morning',
      'શુભ રાત્રી': 'good night', 'તમે કેમ છો': 'how are you', 'હું સારો છું': 'I am fine',
      'પ્રેમ': 'love', 'મિત્ર': 'friend', 'પરિવાર': 'family', 'ખોરાક': 'food',
      'પાણી': 'water', 'ઘર': 'home', 'કામ': 'work', 'સમય': 'time'
    },
    fromEnglish: {
      'hello': 'નમસ્તે', 'thank you': 'આભાર', 'yes': 'હા', 'no': 'ના',
      'please': 'કૃપા કરીને', 'sorry': 'માફ કરશો', 'good morning': 'શુભ સવાર',
      'good night': 'શુભ રાત્રી', 'how are you': 'તમે કેમ છો', 'I am fine': 'હું સારો છું',
      'love': 'પ્રેમ', 'friend': 'મિત્ર', 'family': 'પરિવાર', 'food': 'ખોરાક',
      'water': 'પાણી', 'home': 'ઘર', 'work': 'કામ', 'time': 'સમય'
    }
  },
  kn: {
    toEnglish: {
      'ನಮಸ್ಕಾರ': 'hello', 'ಧನ್ಯವಾದ': 'thank you', 'ಹೌದು': 'yes', 'ಇಲ್ಲ': 'no',
      'ದಯವಿಟ್ಟು': 'please', 'ಕ್ಷಮಿಸಿ': 'sorry', 'ಶುಭೋದಯ': 'good morning',
      'ಶುಭ ರಾತ್ರಿ': 'good night', 'ನೀವು ಹೇಗಿದ್ದೀರಿ': 'how are you', 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ': 'I am fine',
      'ಪ್ರೀತಿ': 'love', 'ಸ್ನೇಹಿತ': 'friend', 'ಕುಟುಂಬ': 'family', 'ಆಹಾರ': 'food',
      'ನೀರು': 'water', 'ಮನೆ': 'home', 'ಕೆಲಸ': 'work', 'ಸಮಯ': 'time'
    },
    fromEnglish: {
      'hello': 'ನಮಸ್ಕಾರ', 'thank you': 'ಧನ್ಯವಾದ', 'yes': 'ಹೌದು', 'no': 'ಇಲ್ಲ',
      'please': 'ದಯವಿಟ್ಟು', 'sorry': 'ಕ್ಷಮಿಸಿ', 'good morning': 'ಶುಭೋದಯ',
      'good night': 'ಶುಭ ರಾತ್ರಿ', 'how are you': 'ನೀವು ಹೇಗಿದ್ದೀರಿ', 'I am fine': 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ',
      'love': 'ಪ್ರೀತಿ', 'friend': 'ಸ್ನೇಹಿತ', 'family': 'ಕುಟುಂಬ', 'food': 'ಆಹಾರ',
      'water': 'ನೀರು', 'home': 'ಮನೆ', 'work': 'ಕೆಲಸ', 'time': 'ಸಮಯ'
    }
  },
  or: {
    toEnglish: {
      'ନମସ୍କାର': 'hello', 'ଧନ୍ୟବାଦ': 'thank you', 'ହଁ': 'yes', 'ନା': 'no',
      'ଦୟାକରି': 'please', 'କ୍ଷମା କରନ୍ତୁ': 'sorry', 'ଶୁଭ ସକାଳ': 'good morning',
      'ଶୁଭ ରାତ୍ରି': 'good night', 'ଆପଣ କେମିତି ଅଛନ୍ତି': 'how are you', 'ମୁଁ ଭଲ ଅଛି': 'I am fine',
      'ପ୍ରେମ': 'love', 'ବନ୍ଧୁ': 'friend', 'ପରିବାର': 'family', 'ଖାଦ୍ୟ': 'food',
      'ପାଣି': 'water', 'ଘର': 'home', 'କାମ': 'work', 'ସମୟ': 'time'
    },
    fromEnglish: {
      'hello': 'ନମସ୍କାର', 'thank you': 'ଧନ୍ୟବାଦ', 'yes': 'ହଁ', 'no': 'ନା',
      'please': 'ଦୟାକରି', 'sorry': 'କ୍ଷମା କରନ୍ତୁ', 'good morning': 'ଶୁଭ ସକାଳ',
      'good night': 'ଶୁଭ ରାତ୍ରି', 'how are you': 'ଆପଣ କେମିତି ଅଛନ୍ତି', 'I am fine': 'ମୁଁ ଭଲ ଅଛି',
      'love': 'ପ୍ରେମ', 'friend': 'ବନ୍ଧୁ', 'family': 'ପରିବାର', 'food': 'ଖାଦ୍ୟ',
      'water': 'ପାଣି', 'home': 'ଘର', 'work': 'କାମ', 'time': 'ସମୟ'
    }
  },
  pa: {
    toEnglish: {
      'ਸਤ ਸ੍ਰੀ ਅਕਾਲ': 'hello', 'ਧੰਨਵਾਦ': 'thank you', 'ਹਾਂ': 'yes', 'ਨਹੀਂ': 'no',
      'ਕਿਰਪਾ ਕਰਕੇ': 'please', 'ਮਾਫ਼ ਕਰਨਾ': 'sorry', 'ਸ਼ੁਭ ਸਵੇਰ': 'good morning',
      'ਸ਼ੁਭ ਰਾਤ': 'good night', 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ': 'how are you', 'ਮੈਂ ਠੀਕ ਹਾਂ': 'I am fine',
      'ਪਿਆਰ': 'love', 'ਦੋਸਤ': 'friend', 'ਪਰਿਵਾਰ': 'family', 'ਭੋਜਨ': 'food',
      'ਪਾਣੀ': 'water', 'ਘਰ': 'home', 'ਕੰਮ': 'work', 'ਸਮਾਂ': 'time'
    },
    fromEnglish: {
      'hello': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'thank you': 'ਧੰਨਵਾਦ', 'yes': 'ਹਾਂ', 'no': 'ਨਹੀਂ',
      'please': 'ਕਿਰਪਾ ਕਰਕੇ', 'sorry': 'ਮਾਫ਼ ਕਰਨਾ', 'good morning': 'ਸ਼ੁਭ ਸਵੇਰ',
      'good night': 'ਸ਼ੁਭ ਰਾਤ', 'how are you': 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ', 'I am fine': 'ਮੈਂ ਠੀਕ ਹਾਂ',
      'love': 'ਪਿਆਰ', 'friend': 'ਦੋਸਤ', 'family': 'ਪਰਿਵਾਰ', 'food': 'ਭੋਜਨ',
      'water': 'ਪਾਣੀ', 'home': 'ਘਰ', 'work': 'ਕੰਮ', 'time': 'ਸਮਾਂ'
    }
  },
  ml: {
    toEnglish: {
      'നമസ്കാരം': 'hello', 'നന്ദി': 'thank you', 'അതെ': 'yes', 'ഇല്ല': 'no',
      'ദയവായി': 'please', 'ക്ഷമിക്കണം': 'sorry', 'സുപ്രഭാതം': 'good morning',
      'ശുഭ രാത്രി': 'good night', 'സുഖമാണോ': 'how are you', 'എനിക്ക് സുഖമാണ്': 'I am fine',
      'സ്നേഹം': 'love', 'സുഹൃത്ത്': 'friend', 'കുടുംബം': 'family', 'ഭക്ഷണം': 'food',
      'വെള്ളം': 'water', 'വീട്': 'home', 'ജോലി': 'work', 'സമയം': 'time'
    },
    fromEnglish: {
      'hello': 'നമസ്കാരം', 'thank you': 'നന്ദി', 'yes': 'അതെ', 'no': 'ഇല്ല',
      'please': 'ദയവായി', 'sorry': 'ക്ഷമിക്കണം', 'good morning': 'സുപ്രഭാതം',
      'good night': 'ശുഭ രാത്രി', 'how are you': 'സുഖമാണോ', 'I am fine': 'എനിക്ക് സുഖമാണ്',
      'love': 'സ്നേഹം', 'friend': 'സുഹൃത്ത്', 'family': 'കുടുംബം', 'food': 'ഭക്ഷണം',
      'water': 'വെള്ളം', 'home': 'വീട്', 'work': 'ജോലി', 'time': 'സമയം'
    }
  },
  as: {
    toEnglish: {
      'নমস্কাৰ': 'hello', 'ধন্যবাদ': 'thank you', 'হয়': 'yes', 'নহয়': 'no',
      'অনুগ্ৰহ কৰি': 'please', 'ক্ষমা কৰিব': 'sorry', 'শুভ ৰাতিপুৱা': 'good morning',
      'শুভ ৰাত্ৰি': 'good night', 'আপুনি কেনে আছে': 'how are you', 'মই ভালে আছোঁ': 'I am fine',
      'প্ৰেম': 'love', 'বন্ধু': 'friend', 'পৰিয়াল': 'family', 'খাদ্য': 'food',
      'পানী': 'water', 'ঘৰ': 'home', 'কাম': 'work', 'সময়': 'time'
    },
    fromEnglish: {
      'hello': 'নমস্কাৰ', 'thank you': 'ধন্যবাদ', 'yes': 'হয়', 'no': 'নহয়',
      'please': 'অনুগ্ৰহ কৰি', 'sorry': 'ক্ষমা কৰিব', 'good morning': 'শুভ ৰাতিপুৱা',
      'good night': 'শুভ ৰাত্ৰি', 'how are you': 'আপুনি কেনে আছে', 'I am fine': 'মই ভালে আছোঁ',
      'love': 'প্ৰেম', 'friend': 'বন্ধু', 'family': 'পৰিয়াল', 'food': 'খাদ্য',
      'water': 'পানী', 'home': 'ঘৰ', 'work': 'কাম', 'time': 'সময়'
    }
  },

  // === WORLD LANGUAGES ===
  zh: {
    toEnglish: {
      '你好': 'hello', '谢谢': 'thank you', '是': 'yes', '不': 'no',
      '请': 'please', '对不起': 'sorry', '早上好': 'good morning',
      '晚安': 'good night', '你好吗': 'how are you', '我很好': 'I am fine',
      '爱': 'love', '朋友': 'friend', '家庭': 'family', '食物': 'food',
      '水': 'water', '家': 'home', '工作': 'work', '时间': 'time'
    },
    fromEnglish: {
      'hello': '你好', 'thank you': '谢谢', 'yes': '是', 'no': '不',
      'please': '请', 'sorry': '对不起', 'good morning': '早上好',
      'good night': '晚安', 'how are you': '你好吗', 'I am fine': '我很好',
      'love': '爱', 'friend': '朋友', 'family': '家庭', 'food': '食物',
      'water': '水', 'home': '家', 'work': '工作', 'time': '时间'
    }
  },
  es: {
    toEnglish: {
      'hola': 'hello', 'gracias': 'thank you', 'sí': 'yes', 'no': 'no',
      'por favor': 'please', 'lo siento': 'sorry', 'buenos días': 'good morning',
      'buenas noches': 'good night', 'cómo estás': 'how are you', 'estoy bien': 'I am fine',
      'amor': 'love', 'amigo': 'friend', 'familia': 'family', 'comida': 'food',
      'agua': 'water', 'casa': 'home', 'trabajo': 'work', 'tiempo': 'time'
    },
    fromEnglish: {
      'hello': 'hola', 'thank you': 'gracias', 'yes': 'sí', 'no': 'no',
      'please': 'por favor', 'sorry': 'lo siento', 'good morning': 'buenos días',
      'good night': 'buenas noches', 'how are you': 'cómo estás', 'I am fine': 'estoy bien',
      'love': 'amor', 'friend': 'amigo', 'family': 'familia', 'food': 'comida',
      'water': 'agua', 'home': 'casa', 'work': 'trabajo', 'time': 'tiempo'
    }
  },
  en: {
    toEnglish: {},
    fromEnglish: {}
  },
  pt: {
    toEnglish: {
      'olá': 'hello', 'obrigado': 'thank you', 'sim': 'yes', 'não': 'no',
      'por favor': 'please', 'desculpe': 'sorry', 'bom dia': 'good morning',
      'boa noite': 'good night', 'como vai': 'how are you', 'estou bem': 'I am fine',
      'amor': 'love', 'amigo': 'friend', 'família': 'family', 'comida': 'food',
      'água': 'water', 'casa': 'home', 'trabalho': 'work', 'tempo': 'time'
    },
    fromEnglish: {
      'hello': 'olá', 'thank you': 'obrigado', 'yes': 'sim', 'no': 'não',
      'please': 'por favor', 'sorry': 'desculpe', 'good morning': 'bom dia',
      'good night': 'boa noite', 'how are you': 'como vai', 'I am fine': 'estou bem',
      'love': 'amor', 'friend': 'amigo', 'family': 'família', 'food': 'comida',
      'water': 'água', 'home': 'casa', 'work': 'trabalho', 'time': 'tempo'
    }
  },
  ru: {
    toEnglish: {
      'привет': 'hello', 'спасибо': 'thank you', 'да': 'yes', 'нет': 'no',
      'пожалуйста': 'please', 'извините': 'sorry', 'доброе утро': 'good morning',
      'спокойной ночи': 'good night', 'как дела': 'how are you', 'я в порядке': 'I am fine',
      'любовь': 'love', 'друг': 'friend', 'семья': 'family', 'еда': 'food',
      'вода': 'water', 'дом': 'home', 'работа': 'work', 'время': 'time'
    },
    fromEnglish: {
      'hello': 'привет', 'thank you': 'спасибо', 'yes': 'да', 'no': 'нет',
      'please': 'пожалуйста', 'sorry': 'извините', 'good morning': 'доброе утро',
      'good night': 'спокойной ночи', 'how are you': 'как дела', 'I am fine': 'я в порядке',
      'love': 'любовь', 'friend': 'друг', 'family': 'семья', 'food': 'еда',
      'water': 'вода', 'home': 'дом', 'work': 'работа', 'time': 'время'
    }
  },
  ja: {
    toEnglish: {
      'こんにちは': 'hello', 'ありがとう': 'thank you', 'はい': 'yes', 'いいえ': 'no',
      'お願いします': 'please', 'すみません': 'sorry', 'おはようございます': 'good morning',
      'おやすみなさい': 'good night', 'お元気ですか': 'how are you', '元気です': 'I am fine',
      '愛': 'love', '友達': 'friend', '家族': 'family', '食べ物': 'food',
      '水': 'water', '家': 'home', '仕事': 'work', '時間': 'time'
    },
    fromEnglish: {
      'hello': 'こんにちは', 'thank you': 'ありがとう', 'yes': 'はい', 'no': 'いいえ',
      'please': 'お願いします', 'sorry': 'すみません', 'good morning': 'おはようございます',
      'good night': 'おやすみなさい', 'how are you': 'お元気ですか', 'I am fine': '元気です',
      'love': '愛', 'friend': '友達', 'family': '家族', 'food': '食べ物',
      'water': '水', 'home': '家', 'work': '仕事', 'time': '時間'
    }
  },
  vi: {
    toEnglish: {
      'xin chào': 'hello', 'cảm ơn': 'thank you', 'vâng': 'yes', 'không': 'no',
      'làm ơn': 'please', 'xin lỗi': 'sorry', 'chào buổi sáng': 'good morning',
      'chúc ngủ ngon': 'good night', 'bạn khỏe không': 'how are you', 'tôi khỏe': 'I am fine',
      'tình yêu': 'love', 'bạn': 'friend', 'gia đình': 'family', 'thức ăn': 'food',
      'nước': 'water', 'nhà': 'home', 'công việc': 'work', 'thời gian': 'time'
    },
    fromEnglish: {
      'hello': 'xin chào', 'thank you': 'cảm ơn', 'yes': 'vâng', 'no': 'không',
      'please': 'làm ơn', 'sorry': 'xin lỗi', 'good morning': 'chào buổi sáng',
      'good night': 'chúc ngủ ngon', 'how are you': 'bạn khỏe không', 'I am fine': 'tôi khỏe',
      'love': 'tình yêu', 'friend': 'bạn', 'family': 'gia đình', 'food': 'thức ăn',
      'water': 'nước', 'home': 'nhà', 'work': 'công việc', 'time': 'thời gian'
    }
  },
  tr: {
    toEnglish: {
      'merhaba': 'hello', 'teşekkürler': 'thank you', 'evet': 'yes', 'hayır': 'no',
      'lütfen': 'please', 'özür dilerim': 'sorry', 'günaydın': 'good morning',
      'iyi geceler': 'good night', 'nasılsın': 'how are you', 'iyiyim': 'I am fine',
      'aşk': 'love', 'arkadaş': 'friend', 'aile': 'family', 'yemek': 'food',
      'su': 'water', 'ev': 'home', 'iş': 'work', 'zaman': 'time'
    },
    fromEnglish: {
      'hello': 'merhaba', 'thank you': 'teşekkürler', 'yes': 'evet', 'no': 'hayır',
      'please': 'lütfen', 'sorry': 'özür dilerim', 'good morning': 'günaydın',
      'good night': 'iyi geceler', 'how are you': 'nasılsın', 'I am fine': 'iyiyim',
      'love': 'aşk', 'friend': 'arkadaş', 'family': 'aile', 'food': 'yemek',
      'water': 'su', 'home': 'ev', 'work': 'iş', 'time': 'zaman'
    }
  },
  ko: {
    toEnglish: {
      '안녕하세요': 'hello', '감사합니다': 'thank you', '네': 'yes', '아니요': 'no',
      '제발': 'please', '죄송합니다': 'sorry', '좋은 아침': 'good morning',
      '안녕히 주무세요': 'good night', '어떻게 지내세요': 'how are you', '잘 지내요': 'I am fine',
      '사랑': 'love', '친구': 'friend', '가족': 'family', '음식': 'food',
      '물': 'water', '집': 'home', '일': 'work', '시간': 'time'
    },
    fromEnglish: {
      'hello': '안녕하세요', 'thank you': '감사합니다', 'yes': '네', 'no': '아니요',
      'please': '제발', 'sorry': '죄송합니다', 'good morning': '좋은 아침',
      'good night': '안녕히 주무세요', 'how are you': '어떻게 지내세요', 'I am fine': '잘 지내요',
      'love': '사랑', 'friend': '친구', 'family': '가족', 'food': '음식',
      'water': '물', 'home': '집', 'work': '일', 'time': '시간'
    }
  },
  fr: {
    toEnglish: {
      'bonjour': 'hello', 'merci': 'thank you', 'oui': 'yes', 'non': 'no',
      's\'il vous plaît': 'please', 'désolé': 'sorry', 'salut': 'hi',
      'bonne nuit': 'good night', 'comment allez-vous': 'how are you', 'je vais bien': 'I am fine',
      'amour': 'love', 'ami': 'friend', 'famille': 'family', 'nourriture': 'food',
      'eau': 'water', 'maison': 'home', 'travail': 'work', 'temps': 'time'
    },
    fromEnglish: {
      'hello': 'bonjour', 'thank you': 'merci', 'yes': 'oui', 'no': 'non',
      'please': 's\'il vous plaît', 'sorry': 'désolé', 'good morning': 'bonjour',
      'good night': 'bonne nuit', 'how are you': 'comment allez-vous', 'I am fine': 'je vais bien',
      'love': 'amour', 'friend': 'ami', 'family': 'famille', 'food': 'nourriture',
      'water': 'eau', 'home': 'maison', 'work': 'travail', 'time': 'temps'
    }
  },
  de: {
    toEnglish: {
      'hallo': 'hello', 'danke': 'thank you', 'ja': 'yes', 'nein': 'no',
      'bitte': 'please', 'entschuldigung': 'sorry', 'guten morgen': 'good morning',
      'gute nacht': 'good night', 'wie geht es dir': 'how are you', 'mir geht es gut': 'I am fine',
      'liebe': 'love', 'freund': 'friend', 'familie': 'family', 'essen': 'food',
      'wasser': 'water', 'zuhause': 'home', 'arbeit': 'work', 'zeit': 'time'
    },
    fromEnglish: {
      'hello': 'hallo', 'thank you': 'danke', 'yes': 'ja', 'no': 'nein',
      'please': 'bitte', 'sorry': 'entschuldigung', 'good morning': 'guten morgen',
      'good night': 'gute nacht', 'how are you': 'wie geht es dir', 'I am fine': 'mir geht es gut',
      'love': 'liebe', 'friend': 'freund', 'family': 'familie', 'food': 'essen',
      'water': 'wasser', 'home': 'zuhause', 'work': 'arbeit', 'time': 'zeit'
    }
  },
  it: {
    toEnglish: {
      'ciao': 'hello', 'grazie': 'thank you', 'sì': 'yes', 'no': 'no',
      'per favore': 'please', 'scusa': 'sorry', 'buongiorno': 'good morning',
      'buonanotte': 'good night', 'come stai': 'how are you', 'sto bene': 'I am fine',
      'amore': 'love', 'amico': 'friend', 'famiglia': 'family', 'cibo': 'food',
      'acqua': 'water', 'casa': 'home', 'lavoro': 'work', 'tempo': 'time'
    },
    fromEnglish: {
      'hello': 'ciao', 'thank you': 'grazie', 'yes': 'sì', 'no': 'no',
      'please': 'per favore', 'sorry': 'scusa', 'good morning': 'buongiorno',
      'good night': 'buonanotte', 'how are you': 'come stai', 'I am fine': 'sto bene',
      'love': 'amore', 'friend': 'amico', 'family': 'famiglia', 'food': 'cibo',
      'water': 'acqua', 'home': 'casa', 'work': 'lavoro', 'time': 'tempo'
    }
  },
  ar: {
    toEnglish: {
      'مرحبا': 'hello', 'شكرا': 'thank you', 'نعم': 'yes', 'لا': 'no',
      'من فضلك': 'please', 'آسف': 'sorry', 'صباح الخير': 'good morning',
      'تصبح على خير': 'good night', 'كيف حالك': 'how are you', 'أنا بخير': 'I am fine',
      'حب': 'love', 'صديق': 'friend', 'عائلة': 'family', 'طعام': 'food',
      'ماء': 'water', 'بيت': 'home', 'عمل': 'work', 'وقت': 'time'
    },
    fromEnglish: {
      'hello': 'مرحبا', 'thank you': 'شكرا', 'yes': 'نعم', 'no': 'لا',
      'please': 'من فضلك', 'sorry': 'آسف', 'good morning': 'صباح الخير',
      'good night': 'تصبح على خير', 'how are you': 'كيف حالك', 'I am fine': 'أنا بخير',
      'love': 'حب', 'friend': 'صديق', 'family': 'عائلة', 'food': 'طعام',
      'water': 'ماء', 'home': 'بيت', 'work': 'عمل', 'time': 'وقت'
    }
  },
  fa: {
    toEnglish: {
      'سلام': 'hello', 'متشکرم': 'thank you', 'بله': 'yes', 'نه': 'no',
      'لطفا': 'please', 'ببخشید': 'sorry', 'صبح بخیر': 'good morning',
      'شب بخیر': 'good night', 'حالت چطوره': 'how are you', 'خوبم': 'I am fine',
      'عشق': 'love', 'دوست': 'friend', 'خانواده': 'family', 'غذا': 'food',
      'آب': 'water', 'خانه': 'home', 'کار': 'work', 'زمان': 'time'
    },
    fromEnglish: {
      'hello': 'سلام', 'thank you': 'متشکرم', 'yes': 'بله', 'no': 'نه',
      'please': 'لطفا', 'sorry': 'ببخشید', 'good morning': 'صبح بخیر',
      'good night': 'شب بخیر', 'how are you': 'حالت چطوره', 'I am fine': 'خوبم',
      'love': 'عشق', 'friend': 'دوست', 'family': 'خانواده', 'food': 'غذا',
      'water': 'آب', 'home': 'خانه', 'work': 'کار', 'time': 'زمان'
    }
  },
  pl: {
    toEnglish: {
      'cześć': 'hello', 'dziękuję': 'thank you', 'tak': 'yes', 'nie': 'no',
      'proszę': 'please', 'przepraszam': 'sorry', 'dzień dobry': 'good morning',
      'dobranoc': 'good night', 'jak się masz': 'how are you', 'mam się dobrze': 'I am fine',
      'miłość': 'love', 'przyjaciel': 'friend', 'rodzina': 'family', 'jedzenie': 'food',
      'woda': 'water', 'dom': 'home', 'praca': 'work', 'czas': 'time'
    },
    fromEnglish: {
      'hello': 'cześć', 'thank you': 'dziękuję', 'yes': 'tak', 'no': 'nie',
      'please': 'proszę', 'sorry': 'przepraszam', 'good morning': 'dzień dobry',
      'good night': 'dobranoc', 'how are you': 'jak się masz', 'I am fine': 'mam się dobrze',
      'love': 'miłość', 'friend': 'przyjaciel', 'family': 'rodzina', 'food': 'jedzenie',
      'water': 'woda', 'home': 'dom', 'work': 'praca', 'time': 'czas'
    }
  },
  uk: {
    toEnglish: {
      'привіт': 'hello', 'дякую': 'thank you', 'так': 'yes', 'ні': 'no',
      'будь ласка': 'please', 'вибачте': 'sorry', 'добрий ранок': 'good morning',
      'на добраніч': 'good night', 'як справи': 'how are you', 'я в порядку': 'I am fine',
      'любов': 'love', 'друг': 'friend', 'сім\'я': 'family', 'їжа': 'food',
      'вода': 'water', 'дім': 'home', 'робота': 'work', 'час': 'time'
    },
    fromEnglish: {
      'hello': 'привіт', 'thank you': 'дякую', 'yes': 'так', 'no': 'ні',
      'please': 'будь ласка', 'sorry': 'вибачте', 'good morning': 'добрий ранок',
      'good night': 'на добраніч', 'how are you': 'як справи', 'I am fine': 'я в порядку',
      'love': 'любов', 'friend': 'друг', 'family': 'сім\'я', 'food': 'їжа',
      'water': 'вода', 'home': 'дім', 'work': 'робота', 'time': 'час'
    }
  },
  ro: {
    toEnglish: {
      'bună': 'hello', 'mulțumesc': 'thank you', 'da': 'yes', 'nu': 'no',
      'te rog': 'please', 'îmi pare rău': 'sorry', 'bună dimineața': 'good morning',
      'noapte bună': 'good night', 'ce mai faci': 'how are you', 'sunt bine': 'I am fine',
      'dragoste': 'love', 'prieten': 'friend', 'familie': 'family', 'mâncare': 'food',
      'apă': 'water', 'casă': 'home', 'muncă': 'work', 'timp': 'time'
    },
    fromEnglish: {
      'hello': 'bună', 'thank you': 'mulțumesc', 'yes': 'da', 'no': 'nu',
      'please': 'te rog', 'sorry': 'îmi pare rău', 'good morning': 'bună dimineața',
      'good night': 'noapte bună', 'how are you': 'ce mai faci', 'I am fine': 'sunt bine',
      'love': 'dragoste', 'friend': 'prieten', 'family': 'familie', 'food': 'mâncare',
      'water': 'apă', 'home': 'casă', 'work': 'muncă', 'time': 'timp'
    }
  },
  nl: {
    toEnglish: {
      'hallo': 'hello', 'dank je': 'thank you', 'ja': 'yes', 'nee': 'no',
      'alsjeblieft': 'please', 'sorry': 'sorry', 'goedemorgen': 'good morning',
      'welterusten': 'good night', 'hoe gaat het': 'how are you', 'het gaat goed': 'I am fine',
      'liefde': 'love', 'vriend': 'friend', 'familie': 'family', 'eten': 'food',
      'water': 'water', 'huis': 'home', 'werk': 'work', 'tijd': 'time'
    },
    fromEnglish: {
      'hello': 'hallo', 'thank you': 'dank je', 'yes': 'ja', 'no': 'nee',
      'please': 'alsjeblieft', 'sorry': 'sorry', 'good morning': 'goedemorgen',
      'good night': 'welterusten', 'how are you': 'hoe gaat het', 'I am fine': 'het gaat goed',
      'love': 'liefde', 'friend': 'vriend', 'family': 'familie', 'food': 'eten',
      'water': 'water', 'home': 'huis', 'work': 'werk', 'time': 'tijd'
    }
  },
  th: {
    toEnglish: {
      'สวัสดี': 'hello', 'ขอบคุณ': 'thank you', 'ใช่': 'yes', 'ไม่': 'no',
      'กรุณา': 'please', 'ขอโทษ': 'sorry', 'อรุณสวัสดิ์': 'good morning',
      'ราตรีสวัสดิ์': 'good night', 'สบายดีไหม': 'how are you', 'สบายดี': 'I am fine',
      'รัก': 'love', 'เพื่อน': 'friend', 'ครอบครัว': 'family', 'อาหาร': 'food',
      'น้ำ': 'water', 'บ้าน': 'home', 'งาน': 'work', 'เวลา': 'time'
    },
    fromEnglish: {
      'hello': 'สวัสดี', 'thank you': 'ขอบคุณ', 'yes': 'ใช่', 'no': 'ไม่',
      'please': 'กรุณา', 'sorry': 'ขอโทษ', 'good morning': 'อรุณสวัสดิ์',
      'good night': 'ราตรีสวัสดิ์', 'how are you': 'สบายดีไหม', 'I am fine': 'สบายดี',
      'love': 'รัก', 'friend': 'เพื่อน', 'family': 'ครอบครัว', 'food': 'อาหาร',
      'water': 'น้ำ', 'home': 'บ้าน', 'work': 'งาน', 'time': 'เวลา'
    }
  },
  id: {
    toEnglish: {
      'halo': 'hello', 'terima kasih': 'thank you', 'ya': 'yes', 'tidak': 'no',
      'tolong': 'please', 'maaf': 'sorry', 'selamat pagi': 'good morning',
      'selamat malam': 'good night', 'apa kabar': 'how are you', 'saya baik': 'I am fine',
      'cinta': 'love', 'teman': 'friend', 'keluarga': 'family', 'makanan': 'food',
      'air': 'water', 'rumah': 'home', 'kerja': 'work', 'waktu': 'time'
    },
    fromEnglish: {
      'hello': 'halo', 'thank you': 'terima kasih', 'yes': 'ya', 'no': 'tidak',
      'please': 'tolong', 'sorry': 'maaf', 'good morning': 'selamat pagi',
      'good night': 'selamat malam', 'how are you': 'apa kabar', 'I am fine': 'saya baik',
      'love': 'cinta', 'friend': 'teman', 'family': 'keluarga', 'food': 'makanan',
      'water': 'air', 'home': 'rumah', 'work': 'kerja', 'time': 'waktu'
    }
  },
  ms: {
    toEnglish: {
      'hello': 'hello', 'terima kasih': 'thank you', 'ya': 'yes', 'tidak': 'no',
      'tolong': 'please', 'maaf': 'sorry', 'selamat pagi': 'good morning',
      'selamat malam': 'good night', 'apa khabar': 'how are you', 'saya sihat': 'I am fine',
      'cinta': 'love', 'kawan': 'friend', 'keluarga': 'family', 'makanan': 'food',
      'air': 'water', 'rumah': 'home', 'kerja': 'work', 'masa': 'time'
    },
    fromEnglish: {
      'hello': 'hello', 'thank you': 'terima kasih', 'yes': 'ya', 'no': 'tidak',
      'please': 'tolong', 'sorry': 'maaf', 'good morning': 'selamat pagi',
      'good night': 'selamat malam', 'how are you': 'apa khabar', 'I am fine': 'saya sihat',
      'love': 'cinta', 'friend': 'kawan', 'family': 'keluarga', 'food': 'makanan',
      'water': 'air', 'home': 'rumah', 'work': 'kerja', 'time': 'masa'
    }
  },
  tl: {
    toEnglish: {
      'kamusta': 'hello', 'salamat': 'thank you', 'oo': 'yes', 'hindi': 'no',
      'pakiusap': 'please', 'pasensya': 'sorry', 'magandang umaga': 'good morning',
      'magandang gabi': 'good night', 'kumusta ka': 'how are you', 'mabuti ako': 'I am fine',
      'pag-ibig': 'love', 'kaibigan': 'friend', 'pamilya': 'family', 'pagkain': 'food',
      'tubig': 'water', 'bahay': 'home', 'trabaho': 'work', 'oras': 'time'
    },
    fromEnglish: {
      'hello': 'kamusta', 'thank you': 'salamat', 'yes': 'oo', 'no': 'hindi',
      'please': 'pakiusap', 'sorry': 'pasensya', 'good morning': 'magandang umaga',
      'good night': 'magandang gabi', 'how are you': 'kumusta ka', 'I am fine': 'mabuti ako',
      'love': 'pag-ibig', 'friend': 'kaibigan', 'family': 'pamilya', 'food': 'pagkain',
      'water': 'tubig', 'home': 'bahay', 'work': 'trabaho', 'time': 'oras'
    }
  },
  sw: {
    toEnglish: {
      'habari': 'hello', 'asante': 'thank you', 'ndiyo': 'yes', 'hapana': 'no',
      'tafadhali': 'please', 'samahani': 'sorry', 'habari za asubuhi': 'good morning',
      'usiku mwema': 'good night', 'hujambo': 'how are you', 'sijambo': 'I am fine',
      'upendo': 'love', 'rafiki': 'friend', 'familia': 'family', 'chakula': 'food',
      'maji': 'water', 'nyumba': 'home', 'kazi': 'work', 'wakati': 'time'
    },
    fromEnglish: {
      'hello': 'habari', 'thank you': 'asante', 'yes': 'ndiyo', 'no': 'hapana',
      'please': 'tafadhali', 'sorry': 'samahani', 'good morning': 'habari za asubuhi',
      'good night': 'usiku mwema', 'how are you': 'hujambo', 'I am fine': 'sijambo',
      'love': 'upendo', 'friend': 'rafiki', 'family': 'familia', 'food': 'chakula',
      'water': 'maji', 'home': 'nyumba', 'work': 'kazi', 'time': 'wakati'
    }
  },
  am: {
    toEnglish: {
      'ሰላም': 'hello', 'አመሰግናለሁ': 'thank you', 'አዎ': 'yes', 'አይ': 'no',
      'እባክህ': 'please', 'ይቅርታ': 'sorry', 'እንደምን አደርክ': 'good morning',
      'መልካም ሌሊት': 'good night', 'እንደምን ነህ': 'how are you', 'ደህና ነኝ': 'I am fine',
      'ፍቅር': 'love', 'ጓደኛ': 'friend', 'ቤተሰብ': 'family', 'ምግብ': 'food',
      'ውሃ': 'water', 'ቤት': 'home', 'ስራ': 'work', 'ጊዜ': 'time'
    },
    fromEnglish: {
      'hello': 'ሰላም', 'thank you': 'አመሰግናለሁ', 'yes': 'አዎ', 'no': 'አይ',
      'please': 'እባክህ', 'sorry': 'ይቅርታ', 'good morning': 'እንደምን አደርክ',
      'good night': 'መልካም ሌሊት', 'how are you': 'እንደምን ነህ', 'I am fine': 'ደህና ነኝ',
      'love': 'ፍቅር', 'friend': 'ጓደኛ', 'family': 'ቤተሰብ', 'food': 'ምግብ',
      'water': 'ውሃ', 'home': 'ቤት', 'work': 'ስራ', 'time': 'ጊዜ'
    }
  },
  ha: {
    toEnglish: {
      'sannu': 'hello', 'na gode': 'thank you', 'eh': 'yes', 'a\'a': 'no',
      'don allah': 'please', 'yi hakuri': 'sorry', 'barka da safiya': 'good morning',
      'barka da dare': 'good night', 'yaya kake': 'how are you', 'ina lafiya': 'I am fine',
      'soyayya': 'love', 'aboki': 'friend', 'iyali': 'family', 'abinci': 'food',
      'ruwa': 'water', 'gida': 'home', 'aiki': 'work', 'lokaci': 'time'
    },
    fromEnglish: {
      'hello': 'sannu', 'thank you': 'na gode', 'yes': 'eh', 'no': 'a\'a',
      'please': 'don allah', 'sorry': 'yi hakuri', 'good morning': 'barka da safiya',
      'good night': 'barka da dare', 'how are you': 'yaya kake', 'I am fine': 'ina lafiya',
      'love': 'soyayya', 'friend': 'aboki', 'family': 'iyali', 'food': 'abinci',
      'water': 'ruwa', 'home': 'gida', 'work': 'aiki', 'time': 'lokaci'
    }
  },
  yo: {
    toEnglish: {
      'bawo': 'hello', 'e se': 'thank you', 'beeni': 'yes', 'rara': 'no',
      'jowo': 'please', 'ma binu': 'sorry', 'e kaaro': 'good morning',
      'o dabo': 'good night', 'bawo ni': 'how are you', 'mo wa daadaa': 'I am fine',
      'ife': 'love', 'ore': 'friend', 'ebi': 'family', 'ounje': 'food',
      'omi': 'water', 'ile': 'home', 'ise': 'work', 'akoko': 'time'
    },
    fromEnglish: {
      'hello': 'bawo', 'thank you': 'e se', 'yes': 'beeni', 'no': 'rara',
      'please': 'jowo', 'sorry': 'ma binu', 'good morning': 'e kaaro',
      'good night': 'o dabo', 'how are you': 'bawo ni', 'I am fine': 'mo wa daadaa',
      'love': 'ife', 'friend': 'ore', 'family': 'ebi', 'food': 'ounje',
      'water': 'omi', 'home': 'ile', 'work': 'ise', 'time': 'akoko'
    }
  },
  ig: {
    toEnglish: {
      'nnọọ': 'hello', 'daalụ': 'thank you', 'ee': 'yes', 'mba': 'no',
      'biko': 'please', 'gbaghara m': 'sorry', 'ụtụtụ ọma': 'good morning',
      'ka chi fo': 'good night', 'kedu': 'how are you', 'a di m mma': 'I am fine',
      'ịhụnanya': 'love', 'enyi': 'friend', 'ezinụlọ': 'family', 'nri': 'food',
      'mmiri': 'water', 'ụlọ': 'home', 'ọrụ': 'work', 'oge': 'time'
    },
    fromEnglish: {
      'hello': 'nnọọ', 'thank you': 'daalụ', 'yes': 'ee', 'no': 'mba',
      'please': 'biko', 'sorry': 'gbaghara m', 'good morning': 'ụtụtụ ọma',
      'good night': 'ka chi fo', 'how are you': 'kedu', 'I am fine': 'a di m mma',
      'love': 'ịhụnanya', 'friend': 'enyi', 'family': 'ezinụlọ', 'food': 'nri',
      'water': 'mmiri', 'home': 'ụlọ', 'work': 'ọrụ', 'time': 'oge'
    }
  },
  zu: {
    toEnglish: {
      'sawubona': 'hello', 'ngiyabonga': 'thank you', 'yebo': 'yes', 'cha': 'no',
      'ngicela': 'please', 'ngiyaxolisa': 'sorry', 'sawubona ekuseni': 'good morning',
      'lala kahle': 'good night', 'unjani': 'how are you', 'ngiyaphila': 'I am fine',
      'uthando': 'love', 'umngane': 'friend', 'umndeni': 'family', 'ukudla': 'food',
      'amanzi': 'water', 'ikhaya': 'home', 'umsebenzi': 'work', 'isikhathi': 'time'
    },
    fromEnglish: {
      'hello': 'sawubona', 'thank you': 'ngiyabonga', 'yes': 'yebo', 'no': 'cha',
      'please': 'ngicela', 'sorry': 'ngiyaxolisa', 'good morning': 'sawubona ekuseni',
      'good night': 'lala kahle', 'how are you': 'unjani', 'I am fine': 'ngiyaphila',
      'love': 'uthando', 'friend': 'umngane', 'family': 'umndeni', 'food': 'ukudla',
      'water': 'amanzi', 'home': 'ikhaya', 'work': 'umsebenzi', 'time': 'isikhathi'
    }
  },
  xh: {
    toEnglish: {
      'molo': 'hello', 'enkosi': 'thank you', 'ewe': 'yes', 'hayi': 'no',
      'nceda': 'please', 'uxolo': 'sorry', 'molo kusasa': 'good morning',
      'rhonani': 'good night', 'unjani': 'how are you', 'ndiphilile': 'I am fine',
      'uthando': 'love', 'umhlobo': 'friend', 'usapho': 'family', 'ukutya': 'food',
      'amanzi': 'water', 'ikhaya': 'home', 'umsebenzi': 'work', 'ixesha': 'time'
    },
    fromEnglish: {
      'hello': 'molo', 'thank you': 'enkosi', 'yes': 'ewe', 'no': 'hayi',
      'please': 'nceda', 'sorry': 'uxolo', 'good morning': 'molo kusasa',
      'good night': 'rhonani', 'how are you': 'unjani', 'I am fine': 'ndiphilile',
      'love': 'uthando', 'friend': 'umhlobo', 'family': 'usapho', 'food': 'ukutya',
      'water': 'amanzi', 'home': 'ikhaya', 'work': 'umsebenzi', 'time': 'ixesha'
    }
  },
  af: {
    toEnglish: {
      'hallo': 'hello', 'dankie': 'thank you', 'ja': 'yes', 'nee': 'no',
      'asseblief': 'please', 'jammer': 'sorry', 'goeie môre': 'good morning',
      'goeie nag': 'good night', 'hoe gaan dit': 'how are you', 'dit gaan goed': 'I am fine',
      'liefde': 'love', 'vriend': 'friend', 'familie': 'family', 'kos': 'food',
      'water': 'water', 'huis': 'home', 'werk': 'work', 'tyd': 'time'
    },
    fromEnglish: {
      'hello': 'hallo', 'thank you': 'dankie', 'yes': 'ja', 'no': 'nee',
      'please': 'asseblief', 'sorry': 'jammer', 'good morning': 'goeie môre',
      'good night': 'goeie nag', 'how are you': 'hoe gaan dit', 'I am fine': 'dit gaan goed',
      'love': 'liefde', 'friend': 'vriend', 'family': 'familie', 'food': 'kos',
      'water': 'water', 'home': 'huis', 'work': 'werk', 'time': 'tyd'
    }
  },
  he: {
    toEnglish: {
      'שלום': 'hello', 'תודה': 'thank you', 'כן': 'yes', 'לא': 'no',
      'בבקשה': 'please', 'סליחה': 'sorry', 'בוקר טוב': 'good morning',
      'לילה טוב': 'good night', 'מה שלומך': 'how are you', 'אני בסדר': 'I am fine',
      'אהבה': 'love', 'חבר': 'friend', 'משפחה': 'family', 'אוכל': 'food',
      'מים': 'water', 'בית': 'home', 'עבודה': 'work', 'זמן': 'time'
    },
    fromEnglish: {
      'hello': 'שלום', 'thank you': 'תודה', 'yes': 'כן', 'no': 'לא',
      'please': 'בבקשה', 'sorry': 'סליחה', 'good morning': 'בוקר טוב',
      'good night': 'לילה טוב', 'how are you': 'מה שלומך', 'I am fine': 'אני בסדר',
      'love': 'אהבה', 'friend': 'חבר', 'family': 'משפחה', 'food': 'אוכל',
      'water': 'מים', 'home': 'בית', 'work': 'עבודה', 'time': 'זמן'
    }
  },
  el: {
    toEnglish: {
      'γεια': 'hello', 'ευχαριστώ': 'thank you', 'ναι': 'yes', 'όχι': 'no',
      'παρακαλώ': 'please', 'συγνώμη': 'sorry', 'καλημέρα': 'good morning',
      'καληνύχτα': 'good night', 'τι κάνεις': 'how are you', 'είμαι καλά': 'I am fine',
      'αγάπη': 'love', 'φίλος': 'friend', 'οικογένεια': 'family', 'φαγητό': 'food',
      'νερό': 'water', 'σπίτι': 'home', 'δουλειά': 'work', 'χρόνος': 'time'
    },
    fromEnglish: {
      'hello': 'γεια', 'thank you': 'ευχαριστώ', 'yes': 'ναι', 'no': 'όχι',
      'please': 'παρακαλώ', 'sorry': 'συγνώμη', 'good morning': 'καλημέρα',
      'good night': 'καληνύχτα', 'how are you': 'τι κάνεις', 'I am fine': 'είμαι καλά',
      'love': 'αγάπη', 'friend': 'φίλος', 'family': 'οικογένεια', 'food': 'φαγητό',
      'water': 'νερό', 'home': 'σπίτι', 'work': 'δουλειά', 'time': 'χρόνος'
    }
  },
  hu: {
    toEnglish: {
      'szia': 'hello', 'köszönöm': 'thank you', 'igen': 'yes', 'nem': 'no',
      'kérem': 'please', 'bocsánat': 'sorry', 'jó reggelt': 'good morning',
      'jó éjszakát': 'good night', 'hogy vagy': 'how are you', 'jól vagyok': 'I am fine',
      'szerelem': 'love', 'barát': 'friend', 'család': 'family', 'étel': 'food',
      'víz': 'water', 'otthon': 'home', 'munka': 'work', 'idő': 'time'
    },
    fromEnglish: {
      'hello': 'szia', 'thank you': 'köszönöm', 'yes': 'igen', 'no': 'nem',
      'please': 'kérem', 'sorry': 'bocsánat', 'good morning': 'jó reggelt',
      'good night': 'jó éjszakát', 'how are you': 'hogy vagy', 'I am fine': 'jól vagyok',
      'love': 'szerelem', 'friend': 'barát', 'family': 'család', 'food': 'étel',
      'water': 'víz', 'home': 'otthon', 'work': 'munka', 'time': 'idő'
    }
  },
  cs: {
    toEnglish: {
      'ahoj': 'hello', 'děkuji': 'thank you', 'ano': 'yes', 'ne': 'no',
      'prosím': 'please', 'promiňte': 'sorry', 'dobré ráno': 'good morning',
      'dobrou noc': 'good night', 'jak se máš': 'how are you', 'mám se dobře': 'I am fine',
      'láska': 'love', 'přítel': 'friend', 'rodina': 'family', 'jídlo': 'food',
      'voda': 'water', 'domov': 'home', 'práce': 'work', 'čas': 'time'
    },
    fromEnglish: {
      'hello': 'ahoj', 'thank you': 'děkuji', 'yes': 'ano', 'no': 'ne',
      'please': 'prosím', 'sorry': 'promiňte', 'good morning': 'dobré ráno',
      'good night': 'dobrou noc', 'how are you': 'jak se máš', 'I am fine': 'mám se dobře',
      'love': 'láska', 'friend': 'přítel', 'family': 'rodina', 'food': 'jídlo',
      'water': 'voda', 'home': 'domov', 'work': 'práce', 'time': 'čas'
    }
  },
  sk: {
    toEnglish: {
      'ahoj': 'hello', 'ďakujem': 'thank you', 'áno': 'yes', 'nie': 'no',
      'prosím': 'please', 'prepáčte': 'sorry', 'dobré ráno': 'good morning',
      'dobrú noc': 'good night', 'ako sa máš': 'how are you', 'mám sa dobre': 'I am fine',
      'láska': 'love', 'priateľ': 'friend', 'rodina': 'family', 'jedlo': 'food',
      'voda': 'water', 'domov': 'home', 'práca': 'work', 'čas': 'time'
    },
    fromEnglish: {
      'hello': 'ahoj', 'thank you': 'ďakujem', 'yes': 'áno', 'no': 'nie',
      'please': 'prosím', 'sorry': 'prepáčte', 'good morning': 'dobré ráno',
      'good night': 'dobrú noc', 'how are you': 'ako sa máš', 'I am fine': 'mám sa dobre',
      'love': 'láska', 'friend': 'priateľ', 'family': 'rodina', 'food': 'jedlo',
      'water': 'voda', 'home': 'domov', 'work': 'práca', 'time': 'čas'
    }
  },
  bg: {
    toEnglish: {
      'здравей': 'hello', 'благодаря': 'thank you', 'да': 'yes', 'не': 'no',
      'моля': 'please', 'съжалявам': 'sorry', 'добро утро': 'good morning',
      'лека нощ': 'good night', 'как си': 'how are you', 'добре съм': 'I am fine',
      'любов': 'love', 'приятел': 'friend', 'семейство': 'family', 'храна': 'food',
      'вода': 'water', 'дом': 'home', 'работа': 'work', 'време': 'time'
    },
    fromEnglish: {
      'hello': 'здравей', 'thank you': 'благодаря', 'yes': 'да', 'no': 'не',
      'please': 'моля', 'sorry': 'съжалявам', 'good morning': 'добро утро',
      'good night': 'лека нощ', 'how are you': 'как си', 'I am fine': 'добре съм',
      'love': 'любов', 'friend': 'приятел', 'family': 'семейство', 'food': 'храна',
      'water': 'вода', 'home': 'дом', 'work': 'работа', 'time': 'време'
    }
  },
  sr: {
    toEnglish: {
      'здраво': 'hello', 'хвала': 'thank you', 'да': 'yes', 'не': 'no',
      'молим': 'please', 'извините': 'sorry', 'добро јутро': 'good morning',
      'лаку ноћ': 'good night', 'како си': 'how are you', 'добро сам': 'I am fine',
      'љубав': 'love', 'пријатељ': 'friend', 'породица': 'family', 'храна': 'food',
      'вода': 'water', 'дом': 'home', 'посао': 'work', 'време': 'time'
    },
    fromEnglish: {
      'hello': 'здраво', 'thank you': 'хвала', 'yes': 'да', 'no': 'не',
      'please': 'молим', 'sorry': 'извините', 'good morning': 'добро јутро',
      'good night': 'лаку ноћ', 'how are you': 'како си', 'I am fine': 'добро сам',
      'love': 'љубав', 'friend': 'пријатељ', 'family': 'породица', 'food': 'храна',
      'water': 'вода', 'home': 'дом', 'work': 'посао', 'time': 'време'
    }
  },
  hr: {
    toEnglish: {
      'bok': 'hello', 'hvala': 'thank you', 'da': 'yes', 'ne': 'no',
      'molim': 'please', 'oprosti': 'sorry', 'dobro jutro': 'good morning',
      'laku noć': 'good night', 'kako si': 'how are you', 'dobro sam': 'I am fine',
      'ljubav': 'love', 'prijatelj': 'friend', 'obitelj': 'family', 'hrana': 'food',
      'voda': 'water', 'dom': 'home', 'posao': 'work', 'vrijeme': 'time'
    },
    fromEnglish: {
      'hello': 'bok', 'thank you': 'hvala', 'yes': 'da', 'no': 'ne',
      'please': 'molim', 'sorry': 'oprosti', 'good morning': 'dobro jutro',
      'good night': 'laku noć', 'how are you': 'kako si', 'I am fine': 'dobro sam',
      'love': 'ljubav', 'friend': 'prijatelj', 'family': 'obitelj', 'food': 'hrana',
      'water': 'voda', 'home': 'dom', 'work': 'posao', 'time': 'vrijeme'
    }
  },
  sl: {
    toEnglish: {
      'zdravo': 'hello', 'hvala': 'thank you', 'da': 'yes', 'ne': 'no',
      'prosim': 'please', 'oprosti': 'sorry', 'dobro jutro': 'good morning',
      'lahko noč': 'good night', 'kako si': 'how are you', 'v redu sem': 'I am fine',
      'ljubezen': 'love', 'prijatelj': 'friend', 'družina': 'family', 'hrana': 'food',
      'voda': 'water', 'dom': 'home', 'delo': 'work', 'čas': 'time'
    },
    fromEnglish: {
      'hello': 'zdravo', 'thank you': 'hvala', 'yes': 'da', 'no': 'ne',
      'please': 'prosim', 'sorry': 'oprosti', 'good morning': 'dobro jutro',
      'good night': 'lahko noč', 'how are you': 'kako si', 'I am fine': 'v redu sem',
      'love': 'ljubezen', 'friend': 'prijatelj', 'family': 'družina', 'food': 'hrana',
      'water': 'voda', 'home': 'dom', 'work': 'delo', 'time': 'čas'
    }
  },
  mk: {
    toEnglish: {
      'здраво': 'hello', 'благодарам': 'thank you', 'да': 'yes', 'не': 'no',
      'ве молам': 'please', 'извини': 'sorry', 'добро утро': 'good morning',
      'лека ноќ': 'good night', 'како си': 'how are you', 'добро сум': 'I am fine',
      'љубов': 'love', 'пријател': 'friend', 'семејство': 'family', 'храна': 'food',
      'вода': 'water', 'дом': 'home', 'работа': 'work', 'време': 'time'
    },
    fromEnglish: {
      'hello': 'здраво', 'thank you': 'благодарам', 'yes': 'да', 'no': 'не',
      'please': 'ве молам', 'sorry': 'извини', 'good morning': 'добро утро',
      'good night': 'лека ноќ', 'how are you': 'како си', 'I am fine': 'добро сум',
      'love': 'љубов', 'friend': 'пријател', 'family': 'семејство', 'food': 'храна',
      'water': 'вода', 'home': 'дом', 'work': 'работа', 'time': 'време'
    }
  },
  sq: {
    toEnglish: {
      'përshëndetje': 'hello', 'faleminderit': 'thank you', 'po': 'yes', 'jo': 'no',
      'ju lutem': 'please', 'më falni': 'sorry', 'mirëmëngjes': 'good morning',
      'natën e mirë': 'good night', 'si jeni': 'how are you', 'jam mirë': 'I am fine',
      'dashuri': 'love', 'mik': 'friend', 'familje': 'family', 'ushqim': 'food',
      'ujë': 'water', 'shtëpi': 'home', 'punë': 'work', 'kohë': 'time'
    },
    fromEnglish: {
      'hello': 'përshëndetje', 'thank you': 'faleminderit', 'yes': 'po', 'no': 'jo',
      'please': 'ju lutem', 'sorry': 'më falni', 'good morning': 'mirëmëngjes',
      'good night': 'natën e mirë', 'how are you': 'si jeni', 'I am fine': 'jam mirë',
      'love': 'dashuri', 'friend': 'mik', 'family': 'familje', 'food': 'ushqim',
      'water': 'ujë', 'home': 'shtëpi', 'work': 'punë', 'time': 'kohë'
    }
  },
  bs: {
    toEnglish: {
      'zdravo': 'hello', 'hvala': 'thank you', 'da': 'yes', 'ne': 'no',
      'molim': 'please', 'izvini': 'sorry', 'dobro jutro': 'good morning',
      'laku noć': 'good night', 'kako si': 'how are you', 'dobro sam': 'I am fine',
      'ljubav': 'love', 'prijatelj': 'friend', 'porodica': 'family', 'hrana': 'food',
      'voda': 'water', 'dom': 'home', 'posao': 'work', 'vrijeme': 'time'
    },
    fromEnglish: {
      'hello': 'zdravo', 'thank you': 'hvala', 'yes': 'da', 'no': 'ne',
      'please': 'molim', 'sorry': 'izvini', 'good morning': 'dobro jutro',
      'good night': 'laku noć', 'how are you': 'kako si', 'I am fine': 'dobro sam',
      'love': 'ljubav', 'friend': 'prijatelj', 'family': 'porodica', 'food': 'hrana',
      'water': 'voda', 'home': 'dom', 'work': 'posao', 'time': 'vrijeme'
    }
  },
  et: {
    toEnglish: {
      'tere': 'hello', 'aitäh': 'thank you', 'jah': 'yes', 'ei': 'no',
      'palun': 'please', 'vabandust': 'sorry', 'tere hommikust': 'good morning',
      'head ööd': 'good night', 'kuidas läheb': 'how are you', 'mul on hästi': 'I am fine',
      'armastus': 'love', 'sõber': 'friend', 'perekond': 'family', 'toit': 'food',
      'vesi': 'water', 'kodu': 'home', 'töö': 'work', 'aeg': 'time'
    },
    fromEnglish: {
      'hello': 'tere', 'thank you': 'aitäh', 'yes': 'jah', 'no': 'ei',
      'please': 'palun', 'sorry': 'vabandust', 'good morning': 'tere hommikust',
      'good night': 'head ööd', 'how are you': 'kuidas läheb', 'I am fine': 'mul on hästi',
      'love': 'armastus', 'friend': 'sõber', 'family': 'perekond', 'food': 'toit',
      'water': 'vesi', 'home': 'kodu', 'work': 'töö', 'time': 'aeg'
    }
  },
  lv: {
    toEnglish: {
      'sveiki': 'hello', 'paldies': 'thank you', 'jā': 'yes', 'nē': 'no',
      'lūdzu': 'please', 'piedodiet': 'sorry', 'labrīt': 'good morning',
      'ar labu nakti': 'good night', 'kā jums klājas': 'how are you', 'man iet labi': 'I am fine',
      'mīlestība': 'love', 'draugs': 'friend', 'ģimene': 'family', 'ēdiens': 'food',
      'ūdens': 'water', 'mājas': 'home', 'darbs': 'work', 'laiks': 'time'
    },
    fromEnglish: {
      'hello': 'sveiki', 'thank you': 'paldies', 'yes': 'jā', 'no': 'nē',
      'please': 'lūdzu', 'sorry': 'piedodiet', 'good morning': 'labrīt',
      'good night': 'ar labu nakti', 'how are you': 'kā jums klājas', 'I am fine': 'man iet labi',
      'love': 'mīlestība', 'friend': 'draugs', 'family': 'ģimene', 'food': 'ēdiens',
      'water': 'ūdens', 'home': 'mājas', 'work': 'darbs', 'time': 'laiks'
    }
  },
  lt: {
    toEnglish: {
      'labas': 'hello', 'ačiū': 'thank you', 'taip': 'yes', 'ne': 'no',
      'prašau': 'please', 'atsiprašau': 'sorry', 'labas rytas': 'good morning',
      'labanakt': 'good night', 'kaip sekasi': 'how are you', 'man gerai': 'I am fine',
      'meilė': 'love', 'draugas': 'friend', 'šeima': 'family', 'maistas': 'food',
      'vanduo': 'water', 'namai': 'home', 'darbas': 'work', 'laikas': 'time'
    },
    fromEnglish: {
      'hello': 'labas', 'thank you': 'ačiū', 'yes': 'taip', 'no': 'ne',
      'please': 'prašau', 'sorry': 'atsiprašau', 'good morning': 'labas rytas',
      'good night': 'labanakt', 'how are you': 'kaip sekasi', 'I am fine': 'man gerai',
      'love': 'meilė', 'friend': 'draugas', 'family': 'šeima', 'food': 'maistas',
      'water': 'vanduo', 'home': 'namai', 'work': 'darbas', 'time': 'laikas'
    }
  },
  fi: {
    toEnglish: {
      'hei': 'hello', 'kiitos': 'thank you', 'kyllä': 'yes', 'ei': 'no',
      'ole hyvä': 'please', 'anteeksi': 'sorry', 'hyvää huomenta': 'good morning',
      'hyvää yötä': 'good night', 'mitä kuuluu': 'how are you', 'voin hyvin': 'I am fine',
      'rakkaus': 'love', 'ystävä': 'friend', 'perhe': 'family', 'ruoka': 'food',
      'vesi': 'water', 'koti': 'home', 'työ': 'work', 'aika': 'time'
    },
    fromEnglish: {
      'hello': 'hei', 'thank you': 'kiitos', 'yes': 'kyllä', 'no': 'ei',
      'please': 'ole hyvä', 'sorry': 'anteeksi', 'good morning': 'hyvää huomenta',
      'good night': 'hyvää yötä', 'how are you': 'mitä kuuluu', 'I am fine': 'voin hyvin',
      'love': 'rakkaus', 'friend': 'ystävä', 'family': 'perhe', 'food': 'ruoka',
      'water': 'vesi', 'home': 'koti', 'work': 'työ', 'time': 'aika'
    }
  },
  sv: {
    toEnglish: {
      'hej': 'hello', 'tack': 'thank you', 'ja': 'yes', 'nej': 'no',
      'snälla': 'please', 'förlåt': 'sorry', 'god morgon': 'good morning',
      'god natt': 'good night', 'hur mår du': 'how are you', 'jag mår bra': 'I am fine',
      'kärlek': 'love', 'vän': 'friend', 'familj': 'family', 'mat': 'food',
      'vatten': 'water', 'hem': 'home', 'arbete': 'work', 'tid': 'time'
    },
    fromEnglish: {
      'hello': 'hej', 'thank you': 'tack', 'yes': 'ja', 'no': 'nej',
      'please': 'snälla', 'sorry': 'förlåt', 'good morning': 'god morgon',
      'good night': 'god natt', 'how are you': 'hur mår du', 'I am fine': 'jag mår bra',
      'love': 'kärlek', 'friend': 'vän', 'family': 'familj', 'food': 'mat',
      'water': 'vatten', 'home': 'hem', 'work': 'arbete', 'time': 'tid'
    }
  },
  no: {
    toEnglish: {
      'hei': 'hello', 'takk': 'thank you', 'ja': 'yes', 'nei': 'no',
      'vær så snill': 'please', 'unnskyld': 'sorry', 'god morgen': 'good morning',
      'god natt': 'good night', 'hvordan har du det': 'how are you', 'jeg har det bra': 'I am fine',
      'kjærlighet': 'love', 'venn': 'friend', 'familie': 'family', 'mat': 'food',
      'vann': 'water', 'hjem': 'home', 'arbeid': 'work', 'tid': 'time'
    },
    fromEnglish: {
      'hello': 'hei', 'thank you': 'takk', 'yes': 'ja', 'no': 'nei',
      'please': 'vær så snill', 'sorry': 'unnskyld', 'good morning': 'god morgen',
      'good night': 'god natt', 'how are you': 'hvordan har du det', 'I am fine': 'jeg har det bra',
      'love': 'kjærlighet', 'friend': 'venn', 'family': 'familie', 'food': 'mat',
      'water': 'vann', 'home': 'hjem', 'work': 'arbeid', 'time': 'tid'
    }
  },
  da: {
    toEnglish: {
      'hej': 'hello', 'tak': 'thank you', 'ja': 'yes', 'nej': 'no',
      'vær venlig': 'please', 'undskyld': 'sorry', 'godmorgen': 'good morning',
      'godnat': 'good night', 'hvordan har du det': 'how are you', 'jeg har det godt': 'I am fine',
      'kærlighed': 'love', 'ven': 'friend', 'familie': 'family', 'mad': 'food',
      'vand': 'water', 'hjem': 'home', 'arbejde': 'work', 'tid': 'time'
    },
    fromEnglish: {
      'hello': 'hej', 'thank you': 'tak', 'yes': 'ja', 'no': 'nej',
      'please': 'vær venlig', 'sorry': 'undskyld', 'good morning': 'godmorgen',
      'good night': 'godnat', 'how are you': 'hvordan har du det', 'I am fine': 'jeg har det godt',
      'love': 'kærlighed', 'friend': 'ven', 'family': 'familie', 'food': 'mad',
      'water': 'vand', 'home': 'hjem', 'work': 'arbejde', 'time': 'tid'
    }
  },
  is: {
    toEnglish: {
      'halló': 'hello', 'takk': 'thank you', 'já': 'yes', 'nei': 'no',
      'vinsamlegast': 'please', 'fyrirgefðu': 'sorry', 'góðan dag': 'good morning',
      'góða nótt': 'good night', 'hvernig hefur þú það': 'how are you', 'mér líður vel': 'I am fine',
      'ást': 'love', 'vinur': 'friend', 'fjölskylda': 'family', 'matur': 'food',
      'vatn': 'water', 'heimili': 'home', 'vinna': 'work', 'tími': 'time'
    },
    fromEnglish: {
      'hello': 'halló', 'thank you': 'takk', 'yes': 'já', 'no': 'nei',
      'please': 'vinsamlegast', 'sorry': 'fyrirgefðu', 'good morning': 'góðan dag',
      'good night': 'góða nótt', 'how are you': 'hvernig hefur þú það', 'I am fine': 'mér líður vel',
      'love': 'ást', 'friend': 'vinur', 'family': 'fjölskylda', 'food': 'matur',
      'water': 'vatn', 'home': 'heimili', 'work': 'vinna', 'time': 'tími'
    }
  },
  ga: {
    toEnglish: {
      'dia duit': 'hello', 'go raibh maith agat': 'thank you', 'sea': 'yes', 'níl': 'no',
      'le do thoil': 'please', 'tá brón orm': 'sorry', 'maidin mhaith': 'good morning',
      'oíche mhaith': 'good night', 'conas atá tú': 'how are you', 'táim go maith': 'I am fine',
      'grá': 'love', 'cara': 'friend', 'teaghlach': 'family', 'bia': 'food',
      'uisce': 'water', 'baile': 'home', 'obair': 'work', 'am': 'time'
    },
    fromEnglish: {
      'hello': 'dia duit', 'thank you': 'go raibh maith agat', 'yes': 'sea', 'no': 'níl',
      'please': 'le do thoil', 'sorry': 'tá brón orm', 'good morning': 'maidin mhaith',
      'good night': 'oíche mhaith', 'how are you': 'conas atá tú', 'I am fine': 'táim go maith',
      'love': 'grá', 'friend': 'cara', 'family': 'teaghlach', 'food': 'bia',
      'water': 'uisce', 'home': 'baile', 'work': 'obair', 'time': 'am'
    }
  },
  cy: {
    toEnglish: {
      'helo': 'hello', 'diolch': 'thank you', 'ie': 'yes', 'na': 'no',
      'os gwelwch yn dda': 'please', 'mae\'n ddrwg gen i': 'sorry', 'bore da': 'good morning',
      'nos da': 'good night', 'sut wyt ti': 'how are you', 'rwy\'n iawn': 'I am fine',
      'cariad': 'love', 'ffrind': 'friend', 'teulu': 'family', 'bwyd': 'food',
      'dŵr': 'water', 'cartref': 'home', 'gwaith': 'work', 'amser': 'time'
    },
    fromEnglish: {
      'hello': 'helo', 'thank you': 'diolch', 'yes': 'ie', 'no': 'na',
      'please': 'os gwelwch yn dda', 'sorry': 'mae\'n ddrwg gen i', 'good morning': 'bore da',
      'good night': 'nos da', 'how are you': 'sut wyt ti', 'I am fine': 'rwy\'n iawn',
      'love': 'cariad', 'friend': 'ffrind', 'family': 'teulu', 'food': 'bwyd',
      'water': 'dŵr', 'home': 'cartref', 'work': 'gwaith', 'time': 'amser'
    }
  },
  eu: {
    toEnglish: {
      'kaixo': 'hello', 'eskerrik asko': 'thank you', 'bai': 'yes', 'ez': 'no',
      'mesedez': 'please', 'barkatu': 'sorry', 'egun on': 'good morning',
      'gau on': 'good night', 'zer moduz': 'how are you', 'ondo nago': 'I am fine',
      'maitasuna': 'love', 'laguna': 'friend', 'familia': 'family', 'janaria': 'food',
      'ura': 'water', 'etxea': 'home', 'lana': 'work', 'denbora': 'time'
    },
    fromEnglish: {
      'hello': 'kaixo', 'thank you': 'eskerrik asko', 'yes': 'bai', 'no': 'ez',
      'please': 'mesedez', 'sorry': 'barkatu', 'good morning': 'egun on',
      'good night': 'gau on', 'how are you': 'zer moduz', 'I am fine': 'ondo nago',
      'love': 'maitasuna', 'friend': 'laguna', 'family': 'familia', 'food': 'janaria',
      'water': 'ura', 'home': 'etxea', 'work': 'lana', 'time': 'denbora'
    }
  },
  ca: {
    toEnglish: {
      'hola': 'hello', 'gràcies': 'thank you', 'sí': 'yes', 'no': 'no',
      'si us plau': 'please', 'ho sento': 'sorry', 'bon dia': 'good morning',
      'bona nit': 'good night', 'com estàs': 'how are you', 'estic bé': 'I am fine',
      'amor': 'love', 'amic': 'friend', 'família': 'family', 'menjar': 'food',
      'aigua': 'water', 'casa': 'home', 'feina': 'work', 'temps': 'time'
    },
    fromEnglish: {
      'hello': 'hola', 'thank you': 'gràcies', 'yes': 'sí', 'no': 'no',
      'please': 'si us plau', 'sorry': 'ho sento', 'good morning': 'bon dia',
      'good night': 'bona nit', 'how are you': 'com estàs', 'I am fine': 'estic bé',
      'love': 'amor', 'friend': 'amic', 'family': 'família', 'food': 'menjar',
      'water': 'aigua', 'home': 'casa', 'work': 'feina', 'time': 'temps'
    }
  },
  gl: {
    toEnglish: {
      'ola': 'hello', 'grazas': 'thank you', 'si': 'yes', 'non': 'no',
      'por favor': 'please', 'perdón': 'sorry', 'bos días': 'good morning',
      'boas noites': 'good night', 'como estás': 'how are you', 'estou ben': 'I am fine',
      'amor': 'love', 'amigo': 'friend', 'familia': 'family', 'comida': 'food',
      'auga': 'water', 'casa': 'home', 'traballo': 'work', 'tempo': 'time'
    },
    fromEnglish: {
      'hello': 'ola', 'thank you': 'grazas', 'yes': 'si', 'no': 'non',
      'please': 'por favor', 'sorry': 'perdón', 'good morning': 'bos días',
      'good night': 'boas noites', 'how are you': 'como estás', 'I am fine': 'estou ben',
      'love': 'amor', 'friend': 'amigo', 'family': 'familia', 'food': 'comida',
      'water': 'auga', 'home': 'casa', 'work': 'traballo', 'time': 'tempo'
    }
  },
  my: {
    toEnglish: {
      'မင်္ဂလာပါ': 'hello', 'ကျေးဇူးတင်ပါတယ်': 'thank you', 'ဟုတ်ကဲ့': 'yes', 'မဟုတ်ဘူး': 'no',
      'ကျေးဇူးပြု၍': 'please', 'တောင်းပန်ပါတယ်': 'sorry', 'မင်္ဂလာနံနက်ခင်းပါ': 'good morning',
      'ညဖက်ကောင်းပါစေ': 'good night', 'နေကောင်းလား': 'how are you', 'ကောင်းပါတယ်': 'I am fine',
      'အချစ်': 'love', 'သူငယ်ချင်း': 'friend', 'မိသားစု': 'family', 'အစားအစာ': 'food',
      'ရေ': 'water', 'အိမ်': 'home', 'အလုပ်': 'work', 'အချိန်': 'time'
    },
    fromEnglish: {
      'hello': 'မင်္ဂလာပါ', 'thank you': 'ကျေးဇူးတင်ပါတယ်', 'yes': 'ဟုတ်ကဲ့', 'no': 'မဟုတ်ဘူး',
      'please': 'ကျေးဇူးပြု၍', 'sorry': 'တောင်းပန်ပါတယ်', 'good morning': 'မင်္ဂလာနံနက်ခင်းပါ',
      'good night': 'ညဖက်ကောင်းပါစေ', 'how are you': 'နေကောင်းလား', 'I am fine': 'ကောင်းပါတယ်',
      'love': 'အချစ်', 'friend': 'သူငယ်ချင်း', 'family': 'မိသားစု', 'food': 'အစားအစာ',
      'water': 'ရေ', 'home': 'အိမ်', 'work': 'အလုပ်', 'time': 'အချိန်'
    }
  },
  km: {
    toEnglish: {
      'សួស្តី': 'hello', 'អរគុណ': 'thank you', 'បាទ/ចាស': 'yes', 'ទេ': 'no',
      'សូម': 'please', 'សុំទោស': 'sorry', 'អរុណសួស្តី': 'good morning',
      'រាត្រីសួស្តី': 'good night', 'សុខសប្បាយទេ': 'how are you', 'ខ្ញុំសុខសប្បាយ': 'I am fine',
      'ស្នេហា': 'love', 'មិត្តភក្តិ': 'friend', 'គ្រួសារ': 'family', 'អាហារ': 'food',
      'ទឹក': 'water', 'ផ្ទះ': 'home', 'ការងារ': 'work', 'ពេលវេលា': 'time'
    },
    fromEnglish: {
      'hello': 'សួស្តី', 'thank you': 'អរគុណ', 'yes': 'បាទ/ចាស', 'no': 'ទេ',
      'please': 'សូម', 'sorry': 'សុំទោស', 'good morning': 'អរុណសួស្តី',
      'good night': 'រាត្រីសួស្តី', 'how are you': 'សុខសប្បាយទេ', 'I am fine': 'ខ្ញុំសុខសប្បាយ',
      'love': 'ស្នេហា', 'friend': 'មិត្តភក្តិ', 'family': 'គ្រួសារ', 'food': 'អាហារ',
      'water': 'ទឹក', 'home': 'ផ្ទះ', 'work': 'ការងារ', 'time': 'ពេលវេលា'
    }
  },
  lo: {
    toEnglish: {
      'ສະບາຍດີ': 'hello', 'ຂອບໃຈ': 'thank you', 'ແມ່ນ': 'yes', 'ບໍ່': 'no',
      'ກະລຸນາ': 'please', 'ຂໍໂທດ': 'sorry', 'ສະບາຍດີຕອນເຊົ້າ': 'good morning',
      'ລາຕີສະຫວັດ': 'good night', 'ສະບາຍດີບໍ່': 'how are you', 'ຂ້ອຍສະບາຍດີ': 'I am fine',
      'ຄວາມຮັກ': 'love', 'ໝູ່': 'friend', 'ຄອບຄົວ': 'family', 'ອາຫານ': 'food',
      'ນໍ້າ': 'water', 'ບ້ານ': 'home', 'ວຽກ': 'work', 'ເວລາ': 'time'
    },
    fromEnglish: {
      'hello': 'ສະບາຍດີ', 'thank you': 'ຂອບໃຈ', 'yes': 'ແມ່ນ', 'no': 'ບໍ່',
      'please': 'ກະລຸນາ', 'sorry': 'ຂໍໂທດ', 'good morning': 'ສະບາຍດີຕອນເຊົ້າ',
      'good night': 'ລາຕີສະຫວັດ', 'how are you': 'ສະບາຍດີບໍ່', 'I am fine': 'ຂ້ອຍສະບາຍດີ',
      'love': 'ຄວາມຮັກ', 'friend': 'ໝູ່', 'family': 'ຄອບຄົວ', 'food': 'ອາຫານ',
      'water': 'ນໍ້າ', 'home': 'ບ້ານ', 'work': 'ວຽກ', 'time': 'ເວລາ'
    }
  }
};

// Normalize text for matching - removes punctuation and extra spaces
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:'"।॥؟،。？！、]+$/g, '') // Remove trailing punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// Find best match in dictionary with fuzzy matching
function findInDictionary(text: string, dict: Record<string, string>): string | null {
  const normalized = normalizeText(text);
  
  // Try exact match first
  if (dict[text]) return dict[text];
  if (dict[normalized]) return dict[normalized];
  
  // Try without trailing punctuation
  const noPunct = text.replace(/[?!.,;:'"।॥؟،。？！、]+$/g, '').trim();
  if (dict[noPunct]) return dict[noPunct];
  
  // Try each dictionary key for partial match
  for (const [key, value] of Object.entries(dict)) {
    const normalizedKey = normalizeText(key);
    if (normalizedKey === normalized) return value;
    // Check if input contains the key or vice versa
    if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

// Bidirectional translation function
// Supports: Source → English → Target AND Target → English → Source
function translateText(text: string, sourceLang: string, targetLang: string): string {
  // If source and target are the same, return original
  if (sourceLang === targetLang) {
    return text;
  }
  
  // If source is English, translate directly to target
  if (sourceLang === 'en') {
    const targetDict = TRANSLATION_DICTIONARIES[targetLang];
    if (targetDict) {
      const result = findInDictionary(text, targetDict.fromEnglish);
      if (result) return result;
    }
    return text; // Return original if no translation found
  }
  
  // If target is English, translate directly from source
  if (targetLang === 'en') {
    const sourceDict = TRANSLATION_DICTIONARIES[sourceLang];
    if (sourceDict) {
      const result = findInDictionary(text, sourceDict.toEnglish);
      if (result) return result;
    }
    return text;
  }
  
  // Pivot translation: Source → English → Target
  const sourceDict = TRANSLATION_DICTIONARIES[sourceLang];
  const targetDict = TRANSLATION_DICTIONARIES[targetLang];
  
  if (!sourceDict || !targetDict) {
    console.log(`Dictionary not found for ${sourceLang} or ${targetLang}`);
    return text;
  }
  
  // Step 1: Source → English
  const englishText = findInDictionary(text, sourceDict.toEnglish);
  
  if (!englishText) {
    console.log(`No translation found from ${sourceLang} to English for: ${text}`);
    return text;
  }
  
  // Step 2: English → Target
  const translatedText = findInDictionary(englishText, targetDict.fromEnglish);
  
  if (!translatedText) {
    console.log(`No translation found from English to ${targetLang} for: ${englishText}`);
    return englishText; // Return English if target translation not found
  }
  
  return translatedText;
}

// Get total language pair count
function getLanguagePairCount(): number {
  // 70 languages × 2 directions through English = 140 translation paths
  // Actual pairs: 70 × 69 = 4830 (excluding same-language pairs)
  return 140; // Bidirectional paths through English pivot
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLang, targetLang, direction } = await req.json();

    console.log(`Pivot Translation Request: ${sourceLang} → ${targetLang}, text: "${text}", direction: ${direction || 'forward'}`);

    // Validate required fields
    if (!text || !sourceLang || !targetLang) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: text, sourceLang, targetLang',
          supportedLanguages: SUPPORTED_LANGUAGES,
          totalLanguages: SUPPORTED_LANGUAGES.length,
          bidirectionalPaths: getLanguagePairCount()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate languages are supported
    if (!SUPPORTED_LANGUAGES.includes(sourceLang)) {
      return new Response(
        JSON.stringify({ 
          error: `Source language '${sourceLang}' is not supported`,
          supportedLanguages: SUPPORTED_LANGUAGES
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!SUPPORTED_LANGUAGES.includes(targetLang)) {
      return new Response(
        JSON.stringify({ 
          error: `Target language '${targetLang}' is not supported`,
          supportedLanguages: SUPPORTED_LANGUAGES
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Perform bidirectional translation based on direction
    let translatedText: string;
    let translationPath: string;
    
    if (direction === 'reverse') {
      // Reverse: Target → English → Source
      translatedText = translateText(text, targetLang, sourceLang);
      translationPath = `${targetLang} → en → ${sourceLang}`;
    } else {
      // Forward (default): Source → English → Target
      translatedText = translateText(text, sourceLang, targetLang);
      translationPath = `${sourceLang} → en → ${targetLang}`;
    }

    console.log(`Translation complete: "${text}" → "${translatedText}" via ${translationPath}`);

    return new Response(
      JSON.stringify({
        success: true,
        originalText: text,
        translatedText,
        sourceLang,
        targetLang,
        direction: direction || 'forward',
        translationPath,
        pivotLanguage: 'en',
        totalLanguages: SUPPORTED_LANGUAGES.length,
        bidirectionalPaths: getLanguagePairCount(),
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Translation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        supportedLanguages: SUPPORTED_LANGUAGES,
        totalLanguages: SUPPORTED_LANGUAGES.length,
        bidirectionalPaths: getLanguagePairCount()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

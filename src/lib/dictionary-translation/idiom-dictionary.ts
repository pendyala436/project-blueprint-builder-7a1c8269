/**
 * Idiom Dictionary
 * =================
 * 
 * Contains common idioms and their translations across languages.
 * Idioms cannot be translated word-by-word and need special handling.
 */

import type { IdiomEntry } from './types';

// ============================================================
// ENGLISH IDIOMS WITH TRANSLATIONS
// ============================================================

export const IDIOM_DATABASE: IdiomEntry[] = [
  // ============================================================
  // COMMON EVERYDAY IDIOMS
  // ============================================================
  {
    phrase: 'kick the bucket',
    normalizedPhrase: 'kick the bucket',
    meaning: 'to die',
    translations: {
      spanish: 'estirar la pata',
      french: 'casser sa pipe',
      german: 'ins Gras beißen',
      italian: 'tirare le cuoia',
      portuguese: 'bater as botas',
      hindi: 'चल बसना',
      arabic: 'انتقل إلى رحمة الله',
      chinese: '翘辫子',
      japanese: '亡くなる',
      korean: '세상을 떠나다',
      russian: 'сыграть в ящик',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'break a leg',
    normalizedPhrase: 'break a leg',
    meaning: 'good luck (especially in performing arts)',
    translations: {
      spanish: 'mucha mierda',
      french: 'merde',
      german: 'Hals- und Beinbruch',
      italian: 'in bocca al lupo',
      portuguese: 'boa sorte',
      hindi: 'शुभकामनाएं',
      arabic: 'حظ سعيد',
      chinese: '祝你好运',
      japanese: '頑張って',
      korean: '행운을 빌어요',
      russian: 'ни пуха, ни пера',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'piece of cake',
    normalizedPhrase: 'piece of cake',
    meaning: 'something very easy',
    translations: {
      spanish: 'pan comido',
      french: "c'est du gâteau",
      german: 'ein Kinderspiel',
      italian: 'una passeggiata',
      portuguese: 'moleza',
      hindi: 'बाएं हाथ का खेल',
      arabic: 'سهل جداً',
      chinese: '小菜一碟',
      japanese: '朝飯前',
      korean: '식은 죽 먹기',
      russian: 'пара пустяков',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'raining cats and dogs',
    normalizedPhrase: 'raining cats and dogs',
    meaning: 'raining very heavily',
    translations: {
      spanish: 'llueve a cántaros',
      french: 'il pleut des cordes',
      german: 'es regnet in Strömen',
      italian: 'piove a catinelle',
      portuguese: 'chovendo canivetes',
      hindi: 'मूसलाधार बारिश',
      arabic: 'تمطر بغزارة',
      chinese: '倾盆大雨',
      japanese: '土砂降り',
      korean: '비가 억수같이 오다',
      russian: 'льёт как из ведра',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'cost an arm and a leg',
    normalizedPhrase: 'cost an arm and a leg',
    meaning: 'very expensive',
    translations: {
      spanish: 'costar un ojo de la cara',
      french: 'coûter les yeux de la tête',
      german: 'ein Vermögen kosten',
      italian: 'costare un occhio della testa',
      portuguese: 'custar os olhos da cara',
      hindi: 'बहुत महंगा',
      arabic: 'يكلف ثروة',
      chinese: '价值连城',
      japanese: '目の玉が飛び出るほど高い',
      korean: '팔다리가 빠지는 값',
      russian: 'стоить целое состояние',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'hit the nail on the head',
    normalizedPhrase: 'hit the nail on the head',
    meaning: 'to be exactly right',
    translations: {
      spanish: 'dar en el clavo',
      french: 'mettre le doigt dessus',
      german: 'den Nagel auf den Kopf treffen',
      italian: 'colpire nel segno',
      portuguese: 'acertar na mosca',
      hindi: 'बिल्कुल सही कहना',
      arabic: 'أصاب كبد الحقيقة',
      chinese: '一针见血',
      japanese: '的を射る',
      korean: '정곡을 찌르다',
      russian: 'попасть в точку',
    },
    category: 'idiom',
    register: 'neutral',
  },
  {
    phrase: 'beat around the bush',
    normalizedPhrase: 'beat around the bush',
    meaning: 'to avoid getting to the point',
    translations: {
      spanish: 'andarse por las ramas',
      french: 'tourner autour du pot',
      german: 'um den heißen Brei herumreden',
      italian: 'menare il can per l\'aia',
      portuguese: 'enrolar',
      hindi: 'इधर-उधर की बात करना',
      arabic: 'يلف ويدور',
      chinese: '拐弯抹角',
      japanese: '遠回しに言う',
      korean: '빙빙 돌려 말하다',
      russian: 'ходить вокруг да около',
    },
    category: 'idiom',
    register: 'neutral',
  },
  {
    phrase: 'once in a blue moon',
    normalizedPhrase: 'once in a blue moon',
    meaning: 'very rarely',
    translations: {
      spanish: 'de higos a brevas',
      french: 'tous les trente-six du mois',
      german: 'alle Jubeljahre',
      italian: 'una volta ogni morte di papa',
      portuguese: 'de vez em quando',
      hindi: 'कभी-कभार',
      arabic: 'نادراً جداً',
      chinese: '千载难逢',
      japanese: 'ごく稀に',
      korean: '아주 드물게',
      russian: 'в кои-то веки',
    },
    category: 'idiom',
    register: 'neutral',
  },
  {
    phrase: 'let the cat out of the bag',
    normalizedPhrase: 'let the cat out of the bag',
    meaning: 'to reveal a secret',
    translations: {
      spanish: 'descubrir el pastel',
      french: 'vendre la mèche',
      german: 'die Katze aus dem Sack lassen',
      italian: 'vuotare il sacco',
      portuguese: 'soltar a língua',
      hindi: 'राज़ खोलना',
      arabic: 'كشف السر',
      chinese: '泄露秘密',
      japanese: '秘密をばらす',
      korean: '비밀을 누설하다',
      russian: 'проболтаться',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'under the weather',
    normalizedPhrase: 'under the weather',
    meaning: 'feeling ill or unwell',
    translations: {
      spanish: 'estar pachucho',
      french: 'être patraque',
      german: 'angeschlagen sein',
      italian: 'sentirsi poco bene',
      portuguese: 'estar adoentado',
      hindi: 'तबीयत ठीक नहीं',
      arabic: 'أشعر بتوعك',
      chinese: '身体不适',
      japanese: '体調が悪い',
      korean: '몸이 안 좋다',
      russian: 'неважно себя чувствовать',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'the ball is in your court',
    normalizedPhrase: 'the ball is in your court',
    meaning: 'it is your decision or responsibility now',
    translations: {
      spanish: 'la pelota está en tu tejado',
      french: 'la balle est dans ton camp',
      german: 'der Ball liegt bei dir',
      italian: 'la palla è nel tuo campo',
      portuguese: 'a bola está no seu campo',
      hindi: 'अब यह तुम पर निर्भर है',
      arabic: 'الكرة في ملعبك',
      chinese: '轮到你了',
      japanese: 'あなた次第です',
      korean: '당신 차례입니다',
      russian: 'мяч на твоей стороне',
    },
    category: 'idiom',
    register: 'neutral',
  },
  {
    phrase: 'bite off more than you can chew',
    normalizedPhrase: 'bite off more than you can chew',
    meaning: 'to take on more than you can handle',
    translations: {
      spanish: 'abarcar más de lo que puedes',
      french: 'avoir les yeux plus gros que le ventre',
      german: 'sich übernehmen',
      italian: 'fare il passo più lungo della gamba',
      portuguese: 'dar um passo maior que a perna',
      hindi: 'अपनी हद से ज़्यादा लेना',
      arabic: 'يحمل أكثر من طاقته',
      chinese: '贪多嚼不烂',
      japanese: '無理をする',
      korean: '무리하다',
      russian: 'откусить больше, чем можешь прожевать',
    },
    category: 'idiom',
    register: 'neutral',
  },
  {
    phrase: 'get out of hand',
    normalizedPhrase: 'get out of hand',
    meaning: 'to get out of control',
    translations: {
      spanish: 'írsele de las manos',
      french: 'échapper à tout contrôle',
      german: 'außer Kontrolle geraten',
      italian: 'sfuggire di mano',
      portuguese: 'sair do controle',
      hindi: 'हाथ से निकल जाना',
      arabic: 'يخرج عن السيطرة',
      chinese: '失控',
      japanese: '手に負えなくなる',
      korean: '통제불능이 되다',
      russian: 'выйти из-под контроля',
    },
    category: 'idiom',
    register: 'neutral',
  },
  {
    phrase: 'add insult to injury',
    normalizedPhrase: 'add insult to injury',
    meaning: 'to make a bad situation worse',
    translations: {
      spanish: 'para colmo de males',
      french: 'ajouter l\'insulte à l\'injure',
      german: 'noch eins draufsetzen',
      italian: 'oltre al danno la beffa',
      portuguese: 'para piorar as coisas',
      hindi: 'जले पर नमक छिड़कना',
      arabic: 'زاد الطين بلة',
      chinese: '雪上加霜',
      japanese: '泣きっ面に蜂',
      korean: '설상가상',
      russian: 'подливать масла в огонь',
    },
    category: 'idiom',
    register: 'neutral',
  },
  {
    phrase: 'back to square one',
    normalizedPhrase: 'back to square one',
    meaning: 'back to the beginning',
    translations: {
      spanish: 'volver a empezar de cero',
      french: 'retour à la case départ',
      german: 'wieder bei null anfangen',
      italian: 'tornare al punto di partenza',
      portuguese: 'voltar à estaca zero',
      hindi: 'फिर से शुरू करना',
      arabic: 'العودة إلى نقطة البداية',
      chinese: '回到原点',
      japanese: '振り出しに戻る',
      korean: '원점으로 돌아가다',
      russian: 'вернуться к исходной точке',
    },
    category: 'idiom',
    register: 'neutral',
  },
  
  // ============================================================
  // COMMON GREETINGS & EXPRESSIONS
  // ============================================================
  {
    phrase: 'how are you',
    normalizedPhrase: 'how are you',
    meaning: 'asking about wellbeing',
    translations: {
      spanish: '¿cómo estás?',
      french: 'comment allez-vous?',
      german: 'wie geht es dir?',
      italian: 'come stai?',
      portuguese: 'como você está?',
      hindi: 'आप कैसे हैं?',
      bengali: 'আপনি কেমন আছেন?',
      tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்?',
      telugu: 'మీరు ఎలా ఉన్నారు?',
      kannada: 'ನೀವು ಹೇಗಿದ್ದೀರಿ?',
      malayalam: 'നിങ്ങൾ എങ്ങനെയുണ്ട്?',
      gujarati: 'તમે કેમ છો?',
      marathi: 'तुम्ही कसे आहात?',
      punjabi: 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?',
      arabic: 'كيف حالك؟',
      chinese: '你好吗？',
      japanese: 'お元気ですか？',
      korean: '어떻게 지내세요?',
      russian: 'как дела?',
      turkish: 'nasılsınız?',
      thai: 'สบายดีไหม?',
      vietnamese: 'bạn khỏe không?',
      indonesian: 'apa kabar?',
    },
    category: 'colloquial',
    register: 'neutral',
  },
  {
    phrase: 'thank you very much',
    normalizedPhrase: 'thank you very much',
    meaning: 'expressing gratitude',
    translations: {
      spanish: 'muchas gracias',
      french: 'merci beaucoup',
      german: 'vielen Dank',
      italian: 'grazie mille',
      portuguese: 'muito obrigado',
      hindi: 'बहुत धन्यवाद',
      bengali: 'অনেক ধন্যবাদ',
      tamil: 'மிக்க நன்றி',
      telugu: 'చాలా ధన్యవాదాలు',
      kannada: 'ತುಂಬಾ ಧನ್ಯವಾದಗಳು',
      malayalam: 'വളരെ നന്ദി',
      gujarati: 'ખૂબ ખૂબ આભાર',
      marathi: 'खूप खूप धन्यवाद',
      punjabi: 'ਬਹੁਤ ਧੰਨਵਾਦ',
      arabic: 'شكرا جزيلا',
      chinese: '非常感谢',
      japanese: 'どうもありがとうございます',
      korean: '대단히 감사합니다',
      russian: 'большое спасибо',
      turkish: 'çok teşekkür ederim',
      thai: 'ขอบคุณมาก',
      vietnamese: 'cảm ơn rất nhiều',
      indonesian: 'terima kasih banyak',
    },
    category: 'colloquial',
    register: 'neutral',
  },
  {
    phrase: 'i love you',
    normalizedPhrase: 'i love you',
    meaning: 'expressing love',
    translations: {
      spanish: 'te quiero',
      french: 'je t\'aime',
      german: 'ich liebe dich',
      italian: 'ti amo',
      portuguese: 'eu te amo',
      hindi: 'मैं तुमसे प्यार करता हूं',
      bengali: 'আমি তোমাকে ভালোবাসি',
      tamil: 'நான் உன்னை காதலிக்கிறேன்',
      telugu: 'నేను నిన్ను ప్రేమిస్తున్నాను',
      kannada: 'ನಾನು ನಿನ್ನನ್ನು ಪ್ರೀತಿಸುತ್ತೇನೆ',
      malayalam: 'ഞാൻ നിന്നെ സ്നേഹിക്കുന്നു',
      gujarati: 'હું તને પ્રેમ કરું છું',
      marathi: 'मी तुझ्यावर प्रेम करतो',
      punjabi: 'ਮੈਂ ਤੈਨੂੰ ਪਿਆਰ ਕਰਦਾ ਹਾਂ',
      urdu: 'میں تم سے محبت کرتا ہوں',
      arabic: 'أنا أحبك',
      chinese: '我爱你',
      japanese: '愛してる',
      korean: '사랑해요',
      russian: 'я тебя люблю',
      turkish: 'seni seviyorum',
      thai: 'ฉันรักคุณ',
      vietnamese: 'tôi yêu bạn',
      indonesian: 'aku cinta kamu',
    },
    category: 'colloquial',
    register: 'informal',
  },
  {
    phrase: 'good morning',
    normalizedPhrase: 'good morning',
    meaning: 'morning greeting',
    translations: {
      spanish: 'buenos días',
      french: 'bonjour',
      german: 'guten Morgen',
      italian: 'buongiorno',
      portuguese: 'bom dia',
      hindi: 'सुप्रभात',
      bengali: 'সুপ্রভাত',
      tamil: 'காலை வணக்கம்',
      telugu: 'శుభోదయం',
      kannada: 'ಶುಭೋದಯ',
      malayalam: 'സുപ്രഭാതം',
      gujarati: 'સુપ્રભાત',
      marathi: 'सुप्रभात',
      punjabi: 'ਸ਼ੁਭ ਸਵੇਰ',
      arabic: 'صباح الخير',
      chinese: '早上好',
      japanese: 'おはようございます',
      korean: '좋은 아침이에요',
      russian: 'доброе утро',
      turkish: 'günaydın',
      thai: 'สวัสดีตอนเช้า',
      vietnamese: 'chào buổi sáng',
      indonesian: 'selamat pagi',
    },
    category: 'colloquial',
    register: 'neutral',
  },
  {
    phrase: 'good night',
    normalizedPhrase: 'good night',
    meaning: 'night farewell',
    translations: {
      spanish: 'buenas noches',
      french: 'bonne nuit',
      german: 'gute Nacht',
      italian: 'buonanotte',
      portuguese: 'boa noite',
      hindi: 'शुभ रात्रि',
      bengali: 'শুভ রাত্রি',
      tamil: 'இனிய இரவு',
      telugu: 'శుభ రాత్రి',
      kannada: 'ಶುಭ ರಾತ್ರಿ',
      malayalam: 'ശുഭരാത്രി',
      gujarati: 'શુભ રાત્રી',
      marathi: 'शुभ रात्री',
      punjabi: 'ਸ਼ੁਭ ਰਾਤ',
      arabic: 'تصبح على خير',
      chinese: '晚安',
      japanese: 'おやすみなさい',
      korean: '좋은 밤 되세요',
      russian: 'спокойной ночи',
      turkish: 'iyi geceler',
      thai: 'ราตรีสวัสดิ์',
      vietnamese: 'chúc ngủ ngon',
      indonesian: 'selamat malam',
    },
    category: 'colloquial',
    register: 'neutral',
  },
];

// ============================================================
// IDIOM LOOKUP FUNCTIONS
// ============================================================

// Build lookup index for fast matching
const idiomIndex = new Map<string, IdiomEntry>();
IDIOM_DATABASE.forEach(entry => {
  idiomIndex.set(entry.normalizedPhrase, entry);
});

/**
 * Look up an idiom in the database
 */
export function lookupIdiom(phrase: string): IdiomEntry | null {
  const normalized = phrase.toLowerCase().trim();
  return idiomIndex.get(normalized) || null;
}

/**
 * Get translation of an idiom for a specific language
 */
export function getIdiomTranslation(phrase: string, targetLanguage: string): string | null {
  const entry = lookupIdiom(phrase);
  if (!entry) return null;
  
  const lang = targetLanguage.toLowerCase();
  return entry.translations[lang] || null;
}

/**
 * Check if text contains any known idioms
 */
export function findIdiomsInText(text: string): Array<{ phrase: string; entry: IdiomEntry; start: number; end: number }> {
  const results: Array<{ phrase: string; entry: IdiomEntry; start: number; end: number }> = [];
  const lowerText = text.toLowerCase();
  
  for (const entry of IDIOM_DATABASE) {
    const idx = lowerText.indexOf(entry.normalizedPhrase);
    if (idx !== -1) {
      results.push({
        phrase: entry.phrase,
        entry,
        start: idx,
        end: idx + entry.normalizedPhrase.length,
      });
    }
  }
  
  // Sort by position
  return results.sort((a, b) => a.start - b.start);
}

/**
 * Replace idioms in text with target language equivalents
 */
export function replaceIdiomsInText(text: string, targetLanguage: string): { text: string; replacements: string[] } {
  const idioms = findIdiomsInText(text);
  const replacements: string[] = [];
  
  if (idioms.length === 0) {
    return { text, replacements };
  }
  
  let result = text;
  // Process from end to start to maintain correct indices
  for (let i = idioms.length - 1; i >= 0; i--) {
    const { entry, start, end } = idioms[i];
    const translation = entry.translations[targetLanguage.toLowerCase()];
    
    if (translation) {
      result = result.slice(0, start) + translation + result.slice(end);
      replacements.push(`"${entry.phrase}" → "${translation}"`);
    }
  }
  
  return { text: result, replacements };
}

/**
 * Get all idioms for a specific language
 */
export function getIdiomsForLanguage(language: string): IdiomEntry[] {
  const lang = language.toLowerCase();
  return IDIOM_DATABASE.filter(entry => entry.translations[lang] !== undefined);
}

/**
 * Get idiom count
 */
export function getIdiomCount(): number {
  return IDIOM_DATABASE.length;
}

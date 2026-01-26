import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Seed Translation Data Edge Function
 * ====================================
 * 
 * Seeds the translation database tables with initial data.
 * This should be called once during setup to populate:
 * - translation_idioms
 * - translation_grammar_rules
 * - translation_word_senses
 */

// Idiom data to seed
const IDIOMS = [
  {
    phrase: 'kick the bucket',
    normalized_phrase: 'kick the bucket',
    meaning: 'to die',
    translations: {
      spanish: 'estirar la pata',
      french: 'casser sa pipe',
      german: 'ins Gras beißen',
      hindi: 'चल बसना',
      chinese: '翘辫子',
      japanese: '亡くなる',
      arabic: 'انتقل إلى رحمة الله',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'piece of cake',
    normalized_phrase: 'piece of cake',
    meaning: 'something very easy',
    translations: {
      spanish: 'pan comido',
      french: "c'est du gâteau",
      german: 'ein Kinderspiel',
      hindi: 'बाएं हाथ का खेल',
      chinese: '小菜一碟',
      japanese: '朝飯前',
      arabic: 'سهل جداً',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'break a leg',
    normalized_phrase: 'break a leg',
    meaning: 'good luck',
    translations: {
      spanish: 'mucha mierda',
      french: 'merde',
      german: 'Hals- und Beinbruch',
      hindi: 'शुभकामनाएं',
      chinese: '祝你好运',
      japanese: '頑張って',
      arabic: 'حظ سعيد',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'raining cats and dogs',
    normalized_phrase: 'raining cats and dogs',
    meaning: 'raining heavily',
    translations: {
      spanish: 'llueve a cántaros',
      french: 'il pleut des cordes',
      german: 'es regnet in Strömen',
      hindi: 'मूसलाधार बारिश',
      chinese: '倾盆大雨',
      japanese: '土砂降り',
      arabic: 'تمطر بغزارة',
    },
    category: 'idiom',
    register: 'informal',
  },
  {
    phrase: 'how are you',
    normalized_phrase: 'how are you',
    meaning: 'greeting',
    translations: {
      spanish: '¿cómo estás?',
      french: 'comment allez-vous?',
      german: 'wie geht es dir?',
      hindi: 'आप कैसे हैं?',
      bengali: 'আপনি কেমন আছেন?',
      tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்?',
      telugu: 'మీరు ఎలా ఉన్నారు?',
      kannada: 'ನೀವು ಹೇಗಿದ್ದೀರಿ?',
      malayalam: 'നിങ്ങൾ എങ്ങനെയുണ്ട്?',
      chinese: '你好吗？',
      japanese: 'お元気ですか？',
      korean: '어떻게 지내세요?',
      arabic: 'كيف حالك؟',
    },
    category: 'colloquial',
    register: 'neutral',
  },
  {
    phrase: 'i love you',
    normalized_phrase: 'i love you',
    meaning: 'expressing love',
    translations: {
      spanish: 'te quiero',
      french: "je t'aime",
      german: 'ich liebe dich',
      hindi: 'मैं तुमसे प्यार करता हूं',
      bengali: 'আমি তোমাকে ভালোবাসি',
      tamil: 'நான் உன்னை காதலிக்கிறேன்',
      telugu: 'నేను నిన్ను ప్రేమిస్తున్నాను',
      chinese: '我爱你',
      japanese: '愛してる',
      korean: '사랑해요',
      arabic: 'أنا أحبك',
    },
    category: 'colloquial',
    register: 'informal',
  },
  {
    phrase: 'good morning',
    normalized_phrase: 'good morning',
    meaning: 'morning greeting',
    translations: {
      spanish: 'buenos días',
      french: 'bonjour',
      german: 'guten Morgen',
      hindi: 'सुप्रभात',
      bengali: 'সুপ্রভাত',
      tamil: 'காலை வணக்கம்',
      telugu: 'శుభోదయం',
      chinese: '早上好',
      japanese: 'おはようございます',
      korean: '좋은 아침이에요',
      arabic: 'صباح الخير',
    },
    category: 'colloquial',
    register: 'neutral',
  },
  {
    phrase: 'thank you',
    normalized_phrase: 'thank you',
    meaning: 'expressing gratitude',
    translations: {
      spanish: 'gracias',
      french: 'merci',
      german: 'danke',
      hindi: 'धन्यवाद',
      bengali: 'ধন্যবাদ',
      tamil: 'நன்றி',
      telugu: 'ధన్యవాదాలు',
      chinese: '谢谢',
      japanese: 'ありがとう',
      korean: '감사합니다',
      arabic: 'شكرا',
    },
    category: 'colloquial',
    register: 'neutral',
  },
];

// Grammar rules to seed
const GRAMMAR_RULES = [
  { language_code: 'en', language_name: 'English', word_order: 'SVO', has_gender: false, has_articles: true, adjective_position: 'before', uses_postpositions: false, subject_dropping: false, has_cases: false, has_honorific: false },
  { language_code: 'es', language_name: 'Spanish', word_order: 'SVO', has_gender: true, has_articles: true, adjective_position: 'after', uses_postpositions: false, subject_dropping: true, has_cases: false, has_honorific: true },
  { language_code: 'fr', language_name: 'French', word_order: 'SVO', has_gender: true, has_articles: true, adjective_position: 'after', uses_postpositions: false, subject_dropping: false, has_cases: false, has_honorific: true },
  { language_code: 'de', language_name: 'German', word_order: 'SVO', has_gender: true, has_articles: true, adjective_position: 'before', uses_postpositions: false, subject_dropping: false, has_cases: true, has_honorific: true },
  { language_code: 'hi', language_name: 'Hindi', word_order: 'SOV', has_gender: true, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'bn', language_name: 'Bengali', word_order: 'SOV', has_gender: false, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'ta', language_name: 'Tamil', word_order: 'SOV', has_gender: true, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'te', language_name: 'Telugu', word_order: 'SOV', has_gender: true, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'kn', language_name: 'Kannada', word_order: 'SOV', has_gender: true, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'ml', language_name: 'Malayalam', word_order: 'SOV', has_gender: false, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'gu', language_name: 'Gujarati', word_order: 'SOV', has_gender: true, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'mr', language_name: 'Marathi', word_order: 'SOV', has_gender: true, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'pa', language_name: 'Punjabi', word_order: 'SOV', has_gender: true, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'ur', language_name: 'Urdu', word_order: 'SOV', has_gender: true, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'zh', language_name: 'Chinese', word_order: 'SVO', has_gender: false, has_articles: false, adjective_position: 'before', uses_postpositions: false, subject_dropping: true, has_cases: false, has_honorific: true },
  { language_code: 'ja', language_name: 'Japanese', word_order: 'SOV', has_gender: false, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true, sentence_end_particle: 'です/ます' },
  { language_code: 'ko', language_name: 'Korean', word_order: 'SOV', has_gender: false, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'ar', language_name: 'Arabic', word_order: 'VSO', has_gender: true, has_articles: true, adjective_position: 'after', uses_postpositions: false, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'ru', language_name: 'Russian', word_order: 'SVO', has_gender: true, has_articles: false, adjective_position: 'before', uses_postpositions: false, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'tr', language_name: 'Turkish', word_order: 'SOV', has_gender: false, has_articles: false, adjective_position: 'before', uses_postpositions: true, subject_dropping: true, has_cases: true, has_honorific: true },
  { language_code: 'th', language_name: 'Thai', word_order: 'SVO', has_gender: false, has_articles: false, adjective_position: 'after', uses_postpositions: false, subject_dropping: true, has_cases: false, has_honorific: true },
  { language_code: 'vi', language_name: 'Vietnamese', word_order: 'SVO', has_gender: false, has_articles: false, adjective_position: 'after', uses_postpositions: false, subject_dropping: true, has_cases: false, has_honorific: true },
  { language_code: 'id', language_name: 'Indonesian', word_order: 'SVO', has_gender: false, has_articles: false, adjective_position: 'after', uses_postpositions: false, subject_dropping: true, has_cases: false, has_honorific: true },
];

// Word senses for disambiguation
const WORD_SENSES = [
  { word: 'bank', sense_id: 'bank_financial', meaning: 'financial institution', context_clues: ['money', 'account', 'deposit', 'withdraw', 'loan', 'credit', 'atm', 'savings'], translations: { spanish: 'banco', french: 'banque', german: 'Bank', hindi: 'बैंक', chinese: '银行' } },
  { word: 'bank', sense_id: 'bank_river', meaning: 'side of a river', context_clues: ['river', 'water', 'stream', 'fish', 'shore', 'riverside'], translations: { spanish: 'orilla', french: 'rive', german: 'Ufer', hindi: 'किनारा', chinese: '河岸' } },
  { word: 'bat', sense_id: 'bat_animal', meaning: 'flying mammal', context_clues: ['fly', 'night', 'cave', 'vampire', 'wing', 'nocturnal'], translations: { spanish: 'murciélago', french: 'chauve-souris', german: 'Fledermaus', hindi: 'चमगादड़', chinese: '蝙蝠' } },
  { word: 'bat', sense_id: 'bat_sports', meaning: 'sports equipment', context_clues: ['baseball', 'cricket', 'hit', 'ball', 'swing', 'game'], translations: { spanish: 'bate', french: 'batte', german: 'Schläger', hindi: 'बल्ला', chinese: '球棒' } },
  { word: 'hot', sense_id: 'hot_temperature', meaning: 'high temperature', context_clues: ['weather', 'sun', 'summer', 'heat', 'warm', 'fire'], translations: { spanish: 'caliente', french: 'chaud', german: 'heiß', hindi: 'गर्म', chinese: '热的' } },
  { word: 'hot', sense_id: 'hot_spicy', meaning: 'spicy food', context_clues: ['food', 'pepper', 'spicy', 'chili', 'taste', 'curry'], translations: { spanish: 'picante', french: 'épicé', german: 'scharf', hindi: 'तीखा', chinese: '辣' } },
  { word: 'cold', sense_id: 'cold_temperature', meaning: 'low temperature', context_clues: ['weather', 'winter', 'freeze', 'ice', 'snow'], translations: { spanish: 'frío', french: 'froid', german: 'kalt', hindi: 'ठंडा', chinese: '冷' } },
  { word: 'cold', sense_id: 'cold_illness', meaning: 'common illness', context_clues: ['sick', 'flu', 'sneeze', 'cough', 'fever', 'medicine'], translations: { spanish: 'resfriado', french: 'rhume', german: 'Erkältung', hindi: 'सर्दी', chinese: '感冒' } },
  { word: 'light', sense_id: 'light_illumination', meaning: 'electromagnetic radiation', context_clues: ['sun', 'lamp', 'bright', 'dark', 'shine', 'bulb'], translations: { spanish: 'luz', french: 'lumière', german: 'Licht', hindi: 'रोशनी', chinese: '光' } },
  { word: 'light', sense_id: 'light_weight', meaning: 'not heavy', context_clues: ['weight', 'heavy', 'carry', 'lift', 'feather'], translations: { spanish: 'ligero', french: 'léger', german: 'leicht', hindi: 'हल्का', chinese: '轻' } },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      idioms: { inserted: 0, errors: 0 },
      grammar: { inserted: 0, errors: 0 },
      wordSenses: { inserted: 0, errors: 0 },
    };

    // Seed idioms
    for (const idiom of IDIOMS) {
      const { error } = await supabase
        .from('translation_idioms')
        .upsert(idiom, { onConflict: 'phrase' });
      
      if (error) {
        console.error('Error inserting idiom:', error);
        results.idioms.errors++;
      } else {
        results.idioms.inserted++;
      }
    }

    // Seed grammar rules
    for (const rule of GRAMMAR_RULES) {
      const { error } = await supabase
        .from('translation_grammar_rules')
        .upsert(rule, { onConflict: 'language_code' });
      
      if (error) {
        console.error('Error inserting grammar rule:', error);
        results.grammar.errors++;
      } else {
        results.grammar.inserted++;
      }
    }

    // Seed word senses
    for (const sense of WORD_SENSES) {
      const { error } = await supabase
        .from('translation_word_senses')
        .upsert(sense, { onConflict: 'word,sense_id' });
      
      if (error) {
        console.error('Error inserting word sense:', error);
        results.wordSenses.errors++;
      } else {
        results.wordSenses.inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Translation data seeded successfully',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error seeding translation data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

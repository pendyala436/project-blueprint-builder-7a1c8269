/**
 * Word Sense Disambiguation (WSD) Module
 * =======================================
 * 
 * Resolves ambiguous words based on context.
 * Uses simple heuristics and context clues.
 */

import type { DisambiguationContext } from './types';

// ============================================================
// AMBIGUOUS WORD DATABASE
// ============================================================

interface WordSenseEntry {
  word: string;
  senses: Array<{
    id: string;
    meaning: string;
    contextClues: string[];
    translations: Record<string, string>;
  }>;
}

const AMBIGUOUS_WORDS: WordSenseEntry[] = [
  {
    word: 'bank',
    senses: [
      {
        id: 'bank_financial',
        meaning: 'financial institution',
        contextClues: ['money', 'account', 'deposit', 'withdraw', 'loan', 'credit', 'atm', 'savings', 'interest', 'mortgage', 'finance', 'banking', 'teller'],
        translations: {
          spanish: 'banco',
          french: 'banque',
          german: 'Bank',
          hindi: 'बैंक',
          chinese: '银行',
          japanese: '銀行',
          arabic: 'بنك',
        },
      },
      {
        id: 'bank_river',
        meaning: 'side of a river',
        contextClues: ['river', 'water', 'stream', 'fish', 'shore', 'riverside', 'lake', 'pond', 'creek', 'flow'],
        translations: {
          spanish: 'orilla',
          french: 'rive',
          german: 'Ufer',
          hindi: 'किनारा',
          chinese: '河岸',
          japanese: '岸',
          arabic: 'ضفة',
        },
      },
    ],
  },
  {
    word: 'bat',
    senses: [
      {
        id: 'bat_animal',
        meaning: 'flying mammal',
        contextClues: ['fly', 'night', 'cave', 'vampire', 'wing', 'nocturnal', 'animal', 'mammal', 'echo', 'blind'],
        translations: {
          spanish: 'murciélago',
          french: 'chauve-souris',
          german: 'Fledermaus',
          hindi: 'चमगादड़',
          chinese: '蝙蝠',
          japanese: 'コウモリ',
          arabic: 'خفاش',
        },
      },
      {
        id: 'bat_sports',
        meaning: 'sports equipment',
        contextClues: ['baseball', 'cricket', 'hit', 'ball', 'swing', 'game', 'player', 'sport', 'innings', 'pitch', 'home run'],
        translations: {
          spanish: 'bate',
          french: 'batte',
          german: 'Schläger',
          hindi: 'बल्ला',
          chinese: '球棒',
          japanese: 'バット',
          arabic: 'مضرب',
        },
      },
    ],
  },
  {
    word: 'hot',
    senses: [
      {
        id: 'hot_temperature',
        meaning: 'high temperature',
        contextClues: ['weather', 'sun', 'summer', 'heat', 'warm', 'cold', 'temperature', 'fire', 'burning', 'boiling', 'sweat'],
        translations: {
          spanish: 'caliente',
          french: 'chaud',
          german: 'heiß',
          hindi: 'गर्म',
          chinese: '热的',
          japanese: '暑い',
          arabic: 'حار',
        },
      },
      {
        id: 'hot_spicy',
        meaning: 'spicy food',
        contextClues: ['food', 'pepper', 'spicy', 'chili', 'taste', 'mouth', 'eat', 'curry', 'sauce', 'dish'],
        translations: {
          spanish: 'picante',
          french: 'épicé',
          german: 'scharf',
          hindi: 'तीखा',
          chinese: '辣',
          japanese: '辛い',
          arabic: 'حار',
        },
      },
      {
        id: 'hot_attractive',
        meaning: 'sexually attractive (slang)',
        contextClues: ['sexy', 'attractive', 'look', 'person', 'girl', 'guy', 'model', 'gorgeous', 'beautiful'],
        translations: {
          spanish: 'guapo',
          french: 'sexy',
          german: 'heiß',
          hindi: 'आकर्षक',
          chinese: '性感',
          japanese: 'セクシー',
          arabic: 'جذاب',
        },
      },
    ],
  },
  {
    word: 'run',
    senses: [
      {
        id: 'run_movement',
        meaning: 'move quickly on foot',
        contextClues: ['fast', 'jog', 'sprint', 'marathon', 'race', 'exercise', 'leg', 'foot', 'athlete', 'track'],
        translations: {
          spanish: 'correr',
          french: 'courir',
          german: 'laufen',
          hindi: 'दौड़ना',
          chinese: '跑',
          japanese: '走る',
          arabic: 'يركض',
        },
      },
      {
        id: 'run_operate',
        meaning: 'operate or manage',
        contextClues: ['business', 'company', 'manage', 'operate', 'machine', 'program', 'software', 'engine'],
        translations: {
          spanish: 'operar',
          french: 'gérer',
          german: 'betreiben',
          hindi: 'चलाना',
          chinese: '运行',
          japanese: '運営する',
          arabic: 'يشغل',
        },
      },
    ],
  },
  {
    word: 'light',
    senses: [
      {
        id: 'light_illumination',
        meaning: 'electromagnetic radiation',
        contextClues: ['sun', 'lamp', 'bright', 'dark', 'shine', 'bulb', 'switch', 'ray', 'beam', 'glow'],
        translations: {
          spanish: 'luz',
          french: 'lumière',
          german: 'Licht',
          hindi: 'रोशनी',
          chinese: '光',
          japanese: '光',
          arabic: 'ضوء',
        },
      },
      {
        id: 'light_weight',
        meaning: 'not heavy',
        contextClues: ['weight', 'heavy', 'carry', 'lift', 'feather', 'kg', 'pound', 'portable'],
        translations: {
          spanish: 'ligero',
          french: 'léger',
          german: 'leicht',
          hindi: 'हल्का',
          chinese: '轻',
          japanese: '軽い',
          arabic: 'خفيف',
        },
      },
    ],
  },
  {
    word: 'spring',
    senses: [
      {
        id: 'spring_season',
        meaning: 'season after winter',
        contextClues: ['season', 'winter', 'summer', 'flower', 'bloom', 'april', 'march', 'weather'],
        translations: {
          spanish: 'primavera',
          french: 'printemps',
          german: 'Frühling',
          hindi: 'वसंत',
          chinese: '春天',
          japanese: '春',
          arabic: 'ربيع',
        },
      },
      {
        id: 'spring_water',
        meaning: 'water source',
        contextClues: ['water', 'natural', 'mineral', 'fountain', 'source', 'fresh', 'drink'],
        translations: {
          spanish: 'manantial',
          french: 'source',
          german: 'Quelle',
          hindi: 'झरना',
          chinese: '泉水',
          japanese: '泉',
          arabic: 'نبع',
        },
      },
      {
        id: 'spring_coil',
        meaning: 'elastic device',
        contextClues: ['coil', 'bounce', 'mattress', 'metal', 'elastic', 'jump', 'mechanical'],
        translations: {
          spanish: 'resorte',
          french: 'ressort',
          german: 'Feder',
          hindi: 'स्प्रिंग',
          chinese: '弹簧',
          japanese: 'ばね',
          arabic: 'نابض',
        },
      },
    ],
  },
  {
    word: 'cold',
    senses: [
      {
        id: 'cold_temperature',
        meaning: 'low temperature',
        contextClues: ['weather', 'winter', 'freeze', 'ice', 'snow', 'warm', 'hot', 'temperature'],
        translations: {
          spanish: 'frío',
          french: 'froid',
          german: 'kalt',
          hindi: 'ठंडा',
          chinese: '冷',
          japanese: '寒い',
          arabic: 'بارد',
        },
      },
      {
        id: 'cold_illness',
        meaning: 'common illness',
        contextClues: ['sick', 'flu', 'sneeze', 'cough', 'fever', 'medicine', 'doctor', 'symptom', 'nose'],
        translations: {
          spanish: 'resfriado',
          french: 'rhume',
          german: 'Erkältung',
          hindi: 'सर्दी',
          chinese: '感冒',
          japanese: '風邪',
          arabic: 'زكام',
        },
      },
    ],
  },
  {
    word: 'present',
    senses: [
      {
        id: 'present_gift',
        meaning: 'a gift',
        contextClues: ['gift', 'birthday', 'christmas', 'wrap', 'give', 'receive', 'box', 'surprise'],
        translations: {
          spanish: 'regalo',
          french: 'cadeau',
          german: 'Geschenk',
          hindi: 'उपहार',
          chinese: '礼物',
          japanese: 'プレゼント',
          arabic: 'هدية',
        },
      },
      {
        id: 'present_time',
        meaning: 'current time',
        contextClues: ['now', 'current', 'today', 'time', 'moment', 'past', 'future', 'tense'],
        translations: {
          spanish: 'presente',
          french: 'présent',
          german: 'Gegenwart',
          hindi: 'वर्तमान',
          chinese: '现在',
          japanese: '現在',
          arabic: 'حاضر',
        },
      },
    ],
  },
  {
    word: 'fair',
    senses: [
      {
        id: 'fair_just',
        meaning: 'just and equitable',
        contextClues: ['justice', 'equal', 'unfair', 'right', 'honest', 'treatment', 'judge'],
        translations: {
          spanish: 'justo',
          french: 'juste',
          german: 'fair',
          hindi: 'निष्पक्ष',
          chinese: '公平',
          japanese: '公正な',
          arabic: 'عادل',
        },
      },
      {
        id: 'fair_event',
        meaning: 'carnival or exhibition',
        contextClues: ['carnival', 'exhibition', 'ride', 'booth', 'festival', 'county', 'fun'],
        translations: {
          spanish: 'feria',
          french: 'foire',
          german: 'Messe',
          hindi: 'मेला',
          chinese: '集市',
          japanese: 'フェア',
          arabic: 'معرض',
        },
      },
      {
        id: 'fair_light',
        meaning: 'light colored (skin/hair)',
        contextClues: ['skin', 'hair', 'complexion', 'light', 'pale', 'blonde', 'color'],
        translations: {
          spanish: 'claro',
          french: 'clair',
          german: 'hell',
          hindi: 'गोरा',
          chinese: '白皙',
          japanese: '色白の',
          arabic: 'فاتح',
        },
      },
    ],
  },
];

// Build index for fast lookup
const wordSenseIndex = new Map<string, WordSenseEntry>();
AMBIGUOUS_WORDS.forEach(entry => {
  wordSenseIndex.set(entry.word.toLowerCase(), entry);
});

// ============================================================
// DISAMBIGUATION FUNCTIONS
// ============================================================

/**
 * Check if a word is ambiguous
 */
export function isAmbiguousWord(word: string): boolean {
  return wordSenseIndex.has(word.toLowerCase());
}

/**
 * Get all senses for an ambiguous word
 */
export function getWordSenses(word: string): WordSenseEntry | null {
  return wordSenseIndex.get(word.toLowerCase()) || null;
}

/**
 * Disambiguate a word based on context
 */
export function disambiguateWord(
  word: string,
  context: DisambiguationContext
): { senseId: string; translation: string | null; confidence: number } | null {
  const entry = wordSenseIndex.get(word.toLowerCase());
  if (!entry) return null;
  
  // Score each sense based on context clues
  const scores: Array<{ sense: typeof entry.senses[0]; score: number }> = [];
  
  const contextText = [
    ...context.surroundingWords,
    context.sentence,
    context.previousSentence || '',
  ].join(' ').toLowerCase();
  
  for (const sense of entry.senses) {
    let score = 0;
    
    // Check how many context clues match
    for (const clue of sense.contextClues) {
      if (contextText.includes(clue.toLowerCase())) {
        score += 1;
      }
    }
    
    // Domain bonus
    if (context.domain) {
      const domainKeywords: Record<string, string[]> = {
        sports: ['game', 'player', 'team', 'score', 'win', 'lose'],
        finance: ['money', 'account', 'payment', 'bank', 'credit'],
        casual: ['friend', 'chat', 'fun', 'like', 'love'],
      };
      
      const keywords = domainKeywords[context.domain] || [];
      if (keywords.some(k => contextText.includes(k))) {
        if (sense.contextClues.some(c => keywords.includes(c))) {
          score += 2;
        }
      }
    }
    
    scores.push({ sense, score });
  }
  
  // Sort by score
  scores.sort((a, b) => b.score - a.score);
  
  if (scores.length === 0 || scores[0].score === 0) {
    // No context clues matched, return first sense as default
    const defaultSense = entry.senses[0];
    return {
      senseId: defaultSense.id,
      translation: null,
      confidence: 0.5,
    };
  }
  
  const topSense = scores[0];
  const confidence = Math.min(0.95, 0.5 + (topSense.score * 0.1));
  
  return {
    senseId: topSense.sense.id,
    translation: null, // Translation retrieved separately
    confidence,
  };
}

/**
 * Get translation for a specific word sense
 */
export function getTranslationForSense(
  word: string,
  senseId: string,
  targetLanguage: string
): string | null {
  const entry = wordSenseIndex.get(word.toLowerCase());
  if (!entry) return null;
  
  const sense = entry.senses.find(s => s.id === senseId);
  if (!sense) return null;
  
  return sense.translations[targetLanguage.toLowerCase()] || null;
}

/**
 * Disambiguate and translate a word
 */
export function disambiguateAndTranslate(
  word: string,
  context: DisambiguationContext,
  targetLanguage: string
): { translation: string; senseId: string; confidence: number } | null {
  const result = disambiguateWord(word, context);
  if (!result) return null;
  
  const translation = getTranslationForSense(word, result.senseId, targetLanguage);
  if (!translation) return null;
  
  return {
    translation,
    senseId: result.senseId,
    confidence: result.confidence,
  };
}

/**
 * Get list of all ambiguous words
 */
export function getAllAmbiguousWords(): string[] {
  return Array.from(wordSenseIndex.keys());
}

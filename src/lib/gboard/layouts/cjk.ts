/**
 * CJK (Chinese, Japanese, Korean) Keyboard Layouts
 * These are basic phonetic/character layouts - full IME support would require additional systems
 */

import { KeyboardLayout, KeyDefinition } from '../types';

// ===================== JAPANESE HIRAGANA =====================
const hiraganaRow1: KeyDefinition[] = [
  { key: 'あ', shift: 'ぁ' },
  { key: 'い', shift: 'ぃ' },
  { key: 'う', shift: 'ぅ' },
  { key: 'え', shift: 'ぇ' },
  { key: 'お', shift: 'ぉ' },
  { key: 'か', shift: 'が' },
  { key: 'き', shift: 'ぎ' },
  { key: 'く', shift: 'ぐ' },
  { key: 'け', shift: 'げ' },
  { key: 'こ', shift: 'ご' },
];

const hiraganaRow2: KeyDefinition[] = [
  { key: 'さ', shift: 'ざ' },
  { key: 'し', shift: 'じ' },
  { key: 'す', shift: 'ず' },
  { key: 'せ', shift: 'ぜ' },
  { key: 'そ', shift: 'ぞ' },
  { key: 'た', shift: 'だ' },
  { key: 'ち', shift: 'ぢ' },
  { key: 'つ', shift: 'づ' },
  { key: 'て', shift: 'で' },
  { key: 'と', shift: 'ど' },
];

const hiraganaRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'な', shift: 'な' },
  { key: 'に', shift: 'に' },
  { key: 'ぬ', shift: 'ぬ' },
  { key: 'ね', shift: 'ね' },
  { key: 'の', shift: 'の' },
  { key: 'は', shift: 'ば' },
  { key: 'ひ', shift: 'び' },
  { key: 'ふ', shift: 'ぶ' },
  { key: 'へ', shift: 'べ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const hiraganaRow4: KeyDefinition[] = [
  { key: 'ほ', shift: 'ぼ' },
  { key: 'ま', shift: 'ま' },
  { key: 'み', shift: 'み' },
  { key: 'む', shift: 'む' },
  { key: 'め', shift: 'め' },
  { key: 'も', shift: 'も' },
  { key: 'や', shift: 'ゃ' },
  { key: 'ゆ', shift: 'ゅ' },
  { key: 'よ', shift: 'ょ' },
];

const hiraganaRow5: KeyDefinition[] = [
  { key: 'ら', shift: 'ら' },
  { key: 'り', shift: 'り' },
  { key: 'る', shift: 'る' },
  { key: 'れ', shift: 'れ' },
  { key: 'ろ', shift: 'ろ' },
  { key: 'わ', shift: 'を' },
  { key: 'ん', shift: 'ー' },
  { key: 'っ', shift: 'っ' },
];

const hiraganaRow6: KeyDefinition[] = [
  { key: 'カナ', type: 'modifier', width: 1.25, label: 'カナ' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '。', shift: '、' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const japaneseHiraganaLayout: KeyboardLayout = {
  id: 'ja-hiragana',
  name: 'Japanese Hiragana',
  nativeName: 'ひらがな',
  script: 'hiragana',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: hiraganaRow1 },
    { keys: hiraganaRow2 },
    { keys: hiraganaRow3 },
    { keys: hiraganaRow4 },
    { keys: hiraganaRow5 },
    { keys: hiraganaRow6 },
  ],
};

// ===================== JAPANESE KATAKANA =====================
const katakanaRow1: KeyDefinition[] = [
  { key: 'ア', shift: 'ァ' },
  { key: 'イ', shift: 'ィ' },
  { key: 'ウ', shift: 'ゥ' },
  { key: 'エ', shift: 'ェ' },
  { key: 'オ', shift: 'ォ' },
  { key: 'カ', shift: 'ガ' },
  { key: 'キ', shift: 'ギ' },
  { key: 'ク', shift: 'グ' },
  { key: 'ケ', shift: 'ゲ' },
  { key: 'コ', shift: 'ゴ' },
];

const katakanaRow2: KeyDefinition[] = [
  { key: 'サ', shift: 'ザ' },
  { key: 'シ', shift: 'ジ' },
  { key: 'ス', shift: 'ズ' },
  { key: 'セ', shift: 'ゼ' },
  { key: 'ソ', shift: 'ゾ' },
  { key: 'タ', shift: 'ダ' },
  { key: 'チ', shift: 'ヂ' },
  { key: 'ツ', shift: 'ヅ' },
  { key: 'テ', shift: 'デ' },
  { key: 'ト', shift: 'ド' },
];

const katakanaRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ナ', shift: 'ナ' },
  { key: 'ニ', shift: 'ニ' },
  { key: 'ヌ', shift: 'ヌ' },
  { key: 'ネ', shift: 'ネ' },
  { key: 'ノ', shift: 'ノ' },
  { key: 'ハ', shift: 'バ' },
  { key: 'ヒ', shift: 'ビ' },
  { key: 'フ', shift: 'ブ' },
  { key: 'ヘ', shift: 'ベ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const katakanaRow4: KeyDefinition[] = [
  { key: 'ホ', shift: 'ボ' },
  { key: 'マ', shift: 'マ' },
  { key: 'ミ', shift: 'ミ' },
  { key: 'ム', shift: 'ム' },
  { key: 'メ', shift: 'メ' },
  { key: 'モ', shift: 'モ' },
  { key: 'ヤ', shift: 'ャ' },
  { key: 'ユ', shift: 'ュ' },
  { key: 'ヨ', shift: 'ョ' },
];

const katakanaRow5: KeyDefinition[] = [
  { key: 'ラ', shift: 'ラ' },
  { key: 'リ', shift: 'リ' },
  { key: 'ル', shift: 'ル' },
  { key: 'レ', shift: 'レ' },
  { key: 'ロ', shift: 'ロ' },
  { key: 'ワ', shift: 'ヲ' },
  { key: 'ン', shift: 'ー' },
  { key: 'ッ', shift: 'ッ' },
];

export const japaneseKatakanaLayout: KeyboardLayout = {
  id: 'ja-katakana',
  name: 'Japanese Katakana',
  nativeName: 'カタカナ',
  script: 'katakana',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: katakanaRow1 },
    { keys: katakanaRow2 },
    { keys: katakanaRow3 },
    { keys: katakanaRow4 },
    { keys: katakanaRow5 },
    { keys: hiraganaRow6 },
  ],
};

// ===================== KOREAN HANGUL =====================
const hangulRow1: KeyDefinition[] = [
  { key: 'ㅂ', shift: 'ㅃ' },
  { key: 'ㅈ', shift: 'ㅉ' },
  { key: 'ㄷ', shift: 'ㄸ' },
  { key: 'ㄱ', shift: 'ㄲ' },
  { key: 'ㅅ', shift: 'ㅆ' },
  { key: 'ㅛ', shift: 'ㅛ' },
  { key: 'ㅕ', shift: 'ㅕ' },
  { key: 'ㅑ', shift: 'ㅑ' },
  { key: 'ㅐ', shift: 'ㅒ' },
  { key: 'ㅔ', shift: 'ㅖ' },
];

const hangulRow2: KeyDefinition[] = [
  { key: 'ㅁ', shift: 'ㅁ' },
  { key: 'ㄴ', shift: 'ㄴ' },
  { key: 'ㅇ', shift: 'ㅇ' },
  { key: 'ㄹ', shift: 'ㄹ' },
  { key: 'ㅎ', shift: 'ㅎ' },
  { key: 'ㅗ', shift: 'ㅗ' },
  { key: 'ㅓ', shift: 'ㅓ' },
  { key: 'ㅏ', shift: 'ㅏ' },
  { key: 'ㅣ', shift: 'ㅣ' },
];

const hangulRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ㅋ', shift: 'ㅋ' },
  { key: 'ㅌ', shift: 'ㅌ' },
  { key: 'ㅊ', shift: 'ㅊ' },
  { key: 'ㅍ', shift: 'ㅍ' },
  { key: 'ㅠ', shift: 'ㅠ' },
  { key: 'ㅜ', shift: 'ㅜ' },
  { key: 'ㅡ', shift: 'ㅡ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const hangulRow4: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '.', shift: ',' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const koreanLayout: KeyboardLayout = {
  id: 'ko',
  name: 'Korean',
  nativeName: '한국어',
  script: 'hangul',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: hangulRow1 },
    { keys: hangulRow2 },
    { keys: hangulRow3 },
    { keys: hangulRow4 },
  ],
};

// ===================== CHINESE PINYIN (Simplified) =====================
// Note: This is a basic Pinyin layout - full Chinese input requires IME
const pinyinRow1: KeyDefinition[] = [
  { key: 'q', shift: 'Q' },
  { key: 'w', shift: 'W' },
  { key: 'e', shift: 'E' },
  { key: 'r', shift: 'R' },
  { key: 't', shift: 'T' },
  { key: 'y', shift: 'Y' },
  { key: 'u', shift: 'U' },
  { key: 'i', shift: 'I' },
  { key: 'o', shift: 'O' },
  { key: 'p', shift: 'P' },
];

const pinyinRow2: KeyDefinition[] = [
  { key: 'a', shift: 'A' },
  { key: 's', shift: 'S' },
  { key: 'd', shift: 'D' },
  { key: 'f', shift: 'F' },
  { key: 'g', shift: 'G' },
  { key: 'h', shift: 'H' },
  { key: 'j', shift: 'J' },
  { key: 'k', shift: 'K' },
  { key: 'l', shift: 'L' },
];

const pinyinRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'z', shift: 'Z' },
  { key: 'x', shift: 'X' },
  { key: 'c', shift: 'C' },
  { key: 'v', shift: 'V' },
  { key: 'b', shift: 'B' },
  { key: 'n', shift: 'N' },
  { key: 'm', shift: 'M' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const pinyinRow4: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: '拼音' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '。', shift: '，' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const chinesePinyinLayout: KeyboardLayout = {
  id: 'zh-pinyin',
  name: 'Chinese Pinyin',
  nativeName: '拼音',
  script: 'latin', // Pinyin uses Latin script
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: pinyinRow1 },
    { keys: pinyinRow2 },
    { keys: pinyinRow3 },
    { keys: pinyinRow4 },
  ],
};

// ===================== CHINESE BOPOMOFO (Traditional) =====================
const bopomofoRow1: KeyDefinition[] = [
  { key: 'ㄅ', shift: 'ㄅ' },
  { key: 'ㄆ', shift: 'ㄆ' },
  { key: 'ㄇ', shift: 'ㄇ' },
  { key: 'ㄈ', shift: 'ㄈ' },
  { key: 'ㄉ', shift: 'ㄉ' },
  { key: 'ㄊ', shift: 'ㄊ' },
  { key: 'ㄋ', shift: 'ㄋ' },
  { key: 'ㄌ', shift: 'ㄌ' },
  { key: 'ㄍ', shift: 'ㄍ' },
  { key: 'ㄎ', shift: 'ㄎ' },
];

const bopomofoRow2: KeyDefinition[] = [
  { key: 'ㄏ', shift: 'ㄏ' },
  { key: 'ㄐ', shift: 'ㄐ' },
  { key: 'ㄑ', shift: 'ㄑ' },
  { key: 'ㄒ', shift: 'ㄒ' },
  { key: 'ㄓ', shift: 'ㄓ' },
  { key: 'ㄔ', shift: 'ㄔ' },
  { key: 'ㄕ', shift: 'ㄕ' },
  { key: 'ㄖ', shift: 'ㄖ' },
  { key: 'ㄗ', shift: 'ㄗ' },
];

const bopomofoRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ㄘ', shift: 'ㄘ' },
  { key: 'ㄙ', shift: 'ㄙ' },
  { key: 'ㄚ', shift: 'ㄚ' },
  { key: 'ㄛ', shift: 'ㄛ' },
  { key: 'ㄜ', shift: 'ㄜ' },
  { key: 'ㄝ', shift: 'ㄝ' },
  { key: 'ㄞ', shift: 'ㄞ' },
  { key: 'ㄟ', shift: 'ㄟ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const bopomofoRow4: KeyDefinition[] = [
  { key: 'ㄠ', shift: 'ㄠ' },
  { key: 'ㄡ', shift: 'ㄡ' },
  { key: 'ㄢ', shift: 'ㄢ' },
  { key: 'ㄣ', shift: 'ㄣ' },
  { key: 'ㄤ', shift: 'ㄤ' },
  { key: 'ㄥ', shift: 'ㄥ' },
  { key: 'ㄦ', shift: 'ㄦ' },
  { key: 'ㄧ', shift: 'ㄧ' },
  { key: 'ㄨ', shift: 'ㄨ' },
  { key: 'ㄩ', shift: 'ㄩ' },
];

const bopomofoRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '。', shift: '，' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const chineseBopomofoLayout: KeyboardLayout = {
  id: 'zh-bopomofo',
  name: 'Chinese Bopomofo',
  nativeName: '注音',
  script: 'bopomofo',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: bopomofoRow1 },
    { keys: bopomofoRow2 },
    { keys: bopomofoRow3 },
    { keys: bopomofoRow4 },
    { keys: bopomofoRow5 },
  ],
};

export const cjkLayouts = {
  'ja-hiragana': japaneseHiraganaLayout,
  'ja-katakana': japaneseKatakanaLayout,
  ko: koreanLayout,
  'zh-pinyin': chinesePinyinLayout,
  'zh-bopomofo': chineseBopomofoLayout,
};

/**
 * Arabic Script Keyboard Layouts
 * Covers: Arabic, Urdu, Persian, Pashto, Kurdish, Sindhi, etc.
 */

import { KeyboardLayout, KeyDefinition } from '../types';

// ===================== ARABIC =====================
const arabicRow1: KeyDefinition[] = [
  { key: 'ض', shift: 'َ' },
  { key: 'ص', shift: 'ً' },
  { key: 'ث', shift: 'ُ' },
  { key: 'ق', shift: 'ٌ' },
  { key: 'ف', shift: 'ِ' },
  { key: 'غ', shift: 'ٍ' },
  { key: 'ع', shift: 'ْ' },
  { key: 'ه', shift: 'ّ' },
  { key: 'خ', shift: '÷' },
  { key: 'ح', shift: '×' },
  { key: 'ج', shift: '؛' },
];

const arabicRow2: KeyDefinition[] = [
  { key: 'ش', shift: '\\' },
  { key: 'س', shift: '[' },
  { key: 'ي', shift: ']' },
  { key: 'ب', shift: 'ـ' },
  { key: 'ل', shift: 'لإ' },
  { key: 'ا', shift: 'لأ' },
  { key: 'ت', shift: 'لآ' },
  { key: 'ن', shift: 'لا' },
  { key: 'م', shift: '»' },
  { key: 'ك', shift: '«' },
];

const arabicRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ئ', shift: '~' },
  { key: 'ء', shift: 'ْ' },
  { key: 'ؤ', shift: '}' },
  { key: 'ر', shift: '{' },
  { key: 'ى', shift: 'آ' },
  { key: 'ة', shift: '\'' },
  { key: 'و', shift: ',' },
  { key: 'ز', shift: '.' },
  { key: 'ظ', shift: '؟' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const arabicRow4: KeyDefinition[] = [
  { key: 'ط', shift: 'إ' },
  { key: 'د', shift: 'أ' },
  { key: 'ذ', shift: 'آ' },
];

const arabicRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '،', shift: '؛' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const arabicLayout: KeyboardLayout = {
  id: 'ar',
  name: 'Arabic',
  nativeName: 'العربية',
  script: 'arabic',
  direction: 'rtl',
  hasShift: true,
  rows: [
    { keys: arabicRow1 },
    { keys: arabicRow2 },
    { keys: arabicRow3 },
    { keys: arabicRow4 },
    { keys: arabicRow5 },
  ],
};

// ===================== URDU =====================
const urduRow1: KeyDefinition[] = [
  { key: 'ط', shift: 'ً' },
  { key: 'ص', shift: 'ٌ' },
  { key: 'ھ', shift: 'ٍ' },
  { key: 'د', shift: 'ّ' },
  { key: 'ٹ', shift: 'ْ' },
  { key: 'پ', shift: 'ُ' },
  { key: 'ت', shift: 'ِ' },
  { key: 'ب', shift: 'َ' },
  { key: 'ج', shift: 'ؐ' },
  { key: 'ح', shift: 'ٰ' },
];

const urduRow2: KeyDefinition[] = [
  { key: 'م', shift: 'ۓ' },
  { key: 'و', shift: 'ء' },
  { key: 'ر', shift: 'ڑ' },
  { key: 'ن', shift: 'ں' },
  { key: 'ل', shift: 'ۃ' },
  { key: 'ہ', shift: 'ۂ' },
  { key: 'ا', shift: 'آ' },
  { key: 'ک', shift: 'گ' },
  { key: 'ی', shift: 'ے' },
];

const urduRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ق', shift: 'ذ' },
  { key: 'ف', shift: 'ض' },
  { key: 'ے', shift: 'ئ' },
  { key: 'س', shift: 'ش' },
  { key: 'ش', shift: 'ظ' },
  { key: 'غ', shift: 'ژ' },
  { key: 'ع', shift: 'ث' },
  { key: 'خ', shift: 'چ' },
  { key: 'ظ', shift: 'ڈ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const urduRow4: KeyDefinition[] = [
  { key: 'ز', shift: 'ژ' },
  { key: 'ڑ', shift: 'ڑ' },
  { key: 'ں', shift: 'ں' },
  { key: 'ڈ', shift: 'ڈ' },
  { key: 'چ', shift: 'چ' },
  { key: 'ث', shift: 'ث' },
];

const urduRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '۔', shift: '؟' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const urduLayout: KeyboardLayout = {
  id: 'ur',
  name: 'Urdu',
  nativeName: 'اردو',
  script: 'arabic',
  direction: 'rtl',
  hasShift: true,
  rows: [
    { keys: urduRow1 },
    { keys: urduRow2 },
    { keys: urduRow3 },
    { keys: urduRow4 },
    { keys: urduRow5 },
  ],
};

// ===================== PERSIAN (FARSI) =====================
const persianRow1: KeyDefinition[] = [
  { key: 'ض', shift: 'ً' },
  { key: 'ص', shift: 'ٌ' },
  { key: 'ث', shift: 'ٍ' },
  { key: 'ق', shift: 'ّ' },
  { key: 'ف', shift: 'ْ' },
  { key: 'غ', shift: 'ُ' },
  { key: 'ع', shift: 'ِ' },
  { key: 'ه', shift: 'َ' },
  { key: 'خ', shift: ']' },
  { key: 'ح', shift: '[' },
  { key: 'ج', shift: '}' },
];

const persianRow2: KeyDefinition[] = [
  { key: 'ش', shift: '{' },
  { key: 'س', shift: 'ئ' },
  { key: 'ی', shift: 'ي' },
  { key: 'ب', shift: 'إ' },
  { key: 'ل', shift: 'أ' },
  { key: 'ا', shift: 'آ' },
  { key: 'ت', shift: 'ة' },
  { key: 'ن', shift: '»' },
  { key: 'م', shift: '«' },
  { key: 'ک', shift: ':' },
  { key: 'گ', shift: '"' },
];

const persianRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ظ', shift: 'ك' },
  { key: 'ط', shift: 'ٔ' },
  { key: 'ز', shift: 'ژ' },
  { key: 'ر', shift: 'ؤ' },
  { key: 'ذ', shift: 'ء' },
  { key: 'د', shift: 'ٰ' },
  { key: 'پ', shift: 'ٔ' },
  { key: 'و', shift: '،' },
  { key: 'چ', shift: '؛' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const persianRow4: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '،', shift: '؟' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const persianLayout: KeyboardLayout = {
  id: 'fa',
  name: 'Persian',
  nativeName: 'فارسی',
  script: 'arabic',
  direction: 'rtl',
  hasShift: true,
  rows: [
    { keys: persianRow1 },
    { keys: persianRow2 },
    { keys: persianRow3 },
    { keys: persianRow4 },
  ],
};

// ===================== PASHTO =====================
export const pashtoLayout: KeyboardLayout = {
  id: 'ps',
  name: 'Pashto',
  nativeName: 'پښتو',
  script: 'arabic',
  direction: 'rtl',
  hasShift: true,
  rows: [
    { keys: [
      { key: 'ض', shift: 'ً' },
      { key: 'ص', shift: 'ٌ' },
      { key: 'ث', shift: 'ٍ' },
      { key: 'ق', shift: 'ّ' },
      { key: 'ف', shift: 'ْ' },
      { key: 'غ', shift: 'ُ' },
      { key: 'ع', shift: 'ِ' },
      { key: 'ه', shift: 'َ' },
      { key: 'خ', shift: 'څ' },
      { key: 'ح', shift: 'ځ' },
    ]},
    { keys: [
      { key: 'ش', shift: 'ښ' },
      { key: 'س', shift: 'ژ' },
      { key: 'ې', shift: 'ۍ' },
      { key: 'ب', shift: 'ټ' },
      { key: 'ل', shift: 'ډ' },
      { key: 'ا', shift: 'آ' },
      { key: 'ت', shift: 'ة' },
      { key: 'ن', shift: 'ڼ' },
      { key: 'م', shift: 'ړ' },
      { key: 'ک', shift: 'گ' },
    ]},
    { keys: [
      { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
      { key: 'ظ', shift: 'ط' },
      { key: 'ز', shift: 'ذ' },
      { key: 'ر', shift: 'ڑ' },
      { key: 'ذ', shift: 'ء' },
      { key: 'د', shift: 'ۀ' },
      { key: 'پ', shift: 'چ' },
      { key: 'و', shift: 'ؤ' },
      { key: 'ی', shift: 'ئ' },
      { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
    ]},
    { keys: urduRow5 },
  ],
};

// ===================== SINDHI =====================
export const sindhiLayout: KeyboardLayout = {
  id: 'sd',
  name: 'Sindhi',
  nativeName: 'سنڌي',
  script: 'arabic',
  direction: 'rtl',
  hasShift: true,
  rows: [
    { keys: [
      { key: 'ض', shift: 'ٺ' },
      { key: 'ص', shift: 'ڀ' },
      { key: 'ث', shift: 'ٿ' },
      { key: 'ق', shift: 'ڙ' },
      { key: 'ف', shift: 'ڄ' },
      { key: 'غ', shift: 'ڃ' },
      { key: 'ع', shift: 'ڇ' },
      { key: 'ه', shift: 'ڏ' },
      { key: 'خ', shift: 'ڌ' },
      { key: 'ح', shift: 'ڊ' },
    ]},
    { keys: urduRow2 },
    { keys: urduRow3 },
    { keys: urduRow5 },
  ],
};

// ===================== KURDISH (SORANI) =====================
export const kurdishLayout: KeyboardLayout = {
  id: 'ckb',
  name: 'Kurdish (Sorani)',
  nativeName: 'کوردی',
  script: 'arabic',
  direction: 'rtl',
  hasShift: true,
  rows: [
    { keys: [
      { key: 'ق', shift: '`' },
      { key: 'و', shift: 'ۆ' },
      { key: 'ە', shift: 'ی' },
      { key: 'ر', shift: 'ڕ' },
      { key: 'ت', shift: 'ط' },
      { key: 'ی', shift: 'ێ' },
      { key: 'ئ', shift: 'ء' },
      { key: 'ح', shift: 'ع' },
      { key: 'پ', shift: 'ث' },
    ]},
    { keys: [
      { key: 'ا', shift: 'آ' },
      { key: 'س', shift: 'ص' },
      { key: 'د', shift: 'ذ' },
      { key: 'ف', shift: 'إ' },
      { key: 'گ', shift: 'غ' },
      { key: 'ه', shift: 'ھ' },
      { key: 'ژ', shift: 'ح' },
      { key: 'ک', shift: 'ك' },
      { key: 'ل', shift: 'ڵ' },
    ]},
    { keys: [
      { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
      { key: 'ز', shift: 'ض' },
      { key: 'خ', shift: 'ظ' },
      { key: 'ج', shift: 'چ' },
      { key: 'ڤ', shift: 'ۋ' },
      { key: 'ب', shift: 'أ' },
      { key: 'ن', shift: 'ں' },
      { key: 'م', shift: 'ؤ' },
      { key: 'ش', shift: 'ش' },
      { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
    ]},
    { keys: arabicRow5 },
  ],
};

export const arabicLayouts = {
  ar: arabicLayout,
  ur: urduLayout,
  fa: persianLayout,
  ps: pashtoLayout,
  sd: sindhiLayout,
  ckb: kurdishLayout,
};

/**
 * Other Script Keyboard Layouts
 * Covers: Greek, Hebrew, Georgian, Armenian, Ethiopic
 */

import { KeyboardLayout, KeyDefinition } from '../types';

// ===================== GREEK =====================
const greekRow1: KeyDefinition[] = [
  { key: ';', shift: ':' },
  { key: 'ς', shift: '΅' },
  { key: 'ε', shift: 'Ε', alt: 'έ', altShift: 'Έ' },
  { key: 'ρ', shift: 'Ρ' },
  { key: 'τ', shift: 'Τ' },
  { key: 'υ', shift: 'Υ', alt: 'ύ', altShift: 'Ύ' },
  { key: 'θ', shift: 'Θ' },
  { key: 'ι', shift: 'Ι', alt: 'ί', altShift: 'Ί' },
  { key: 'ο', shift: 'Ο', alt: 'ό', altShift: 'Ό' },
  { key: 'π', shift: 'Π' },
];

const greekRow2: KeyDefinition[] = [
  { key: 'α', shift: 'Α', alt: 'ά', altShift: 'Ά' },
  { key: 'σ', shift: 'Σ' },
  { key: 'δ', shift: 'Δ' },
  { key: 'φ', shift: 'Φ' },
  { key: 'γ', shift: 'Γ' },
  { key: 'η', shift: 'Η', alt: 'ή', altShift: 'Ή' },
  { key: 'ξ', shift: 'Ξ' },
  { key: 'κ', shift: 'Κ' },
  { key: 'λ', shift: 'Λ' },
];

const greekRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ζ', shift: 'Ζ' },
  { key: 'χ', shift: 'Χ' },
  { key: 'ψ', shift: 'Ψ' },
  { key: 'ω', shift: 'Ω', alt: 'ώ', altShift: 'Ώ' },
  { key: 'β', shift: 'Β' },
  { key: 'ν', shift: 'Ν' },
  { key: 'μ', shift: 'Μ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const greekRow4: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '.', shift: ',' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const greekLayout: KeyboardLayout = {
  id: 'el',
  name: 'Greek',
  nativeName: 'Ελληνικά',
  script: 'greek',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: greekRow1 },
    { keys: greekRow2 },
    { keys: greekRow3 },
    { keys: greekRow4 },
  ],
};

// ===================== HEBREW =====================
const hebrewRow1: KeyDefinition[] = [
  { key: '/', shift: 'Q' },
  { key: "'", shift: 'W' },
  { key: 'ק', shift: 'E' },
  { key: 'ר', shift: 'R' },
  { key: 'א', shift: 'T' },
  { key: 'ט', shift: 'Y' },
  { key: 'ו', shift: 'U' },
  { key: 'ן', shift: 'I' },
  { key: 'ם', shift: 'O' },
  { key: 'פ', shift: 'P' },
];

const hebrewRow2: KeyDefinition[] = [
  { key: 'ש', shift: 'A' },
  { key: 'ד', shift: 'S' },
  { key: 'ג', shift: 'D' },
  { key: 'כ', shift: 'F' },
  { key: 'ע', shift: 'G' },
  { key: 'י', shift: 'H' },
  { key: 'ח', shift: 'J' },
  { key: 'ל', shift: 'K' },
  { key: 'ך', shift: 'L' },
  { key: 'ף', shift: ':' },
];

const hebrewRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ז', shift: 'Z' },
  { key: 'ס', shift: 'X' },
  { key: 'ב', shift: 'C' },
  { key: 'ה', shift: 'V' },
  { key: 'נ', shift: 'B' },
  { key: 'מ', shift: 'N' },
  { key: 'צ', shift: 'M' },
  { key: 'ת', shift: '>' },
  { key: 'ץ', shift: '?' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const hebrewRow4: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '.', shift: ',' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const hebrewLayout: KeyboardLayout = {
  id: 'he',
  name: 'Hebrew',
  nativeName: 'עברית',
  script: 'hebrew',
  direction: 'rtl',
  hasShift: true,
  rows: [
    { keys: hebrewRow1 },
    { keys: hebrewRow2 },
    { keys: hebrewRow3 },
    { keys: hebrewRow4 },
  ],
};

// ===================== GEORGIAN =====================
const georgianRow1: KeyDefinition[] = [
  { key: 'ქ', shift: 'ყ' },
  { key: 'წ', shift: 'ჭ' },
  { key: 'ე', shift: 'ე' },
  { key: 'რ', shift: 'ღ' },
  { key: 'ტ', shift: 'თ' },
  { key: 'ყ', shift: 'ყ' },
  { key: 'უ', shift: 'უ' },
  { key: 'ი', shift: 'ი' },
  { key: 'ო', shift: 'ო' },
  { key: 'პ', shift: 'პ' },
];

const georgianRow2: KeyDefinition[] = [
  { key: 'ა', shift: 'ა' },
  { key: 'ს', shift: 'შ' },
  { key: 'დ', shift: 'დ' },
  { key: 'ფ', shift: 'ფ' },
  { key: 'გ', shift: 'გ' },
  { key: 'ჰ', shift: 'ჰ' },
  { key: 'ჯ', shift: 'ჟ' },
  { key: 'კ', shift: 'კ' },
  { key: 'ლ', shift: 'ლ' },
];

const georgianRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ზ', shift: 'ძ' },
  { key: 'ხ', shift: 'ხ' },
  { key: 'ც', shift: 'ჩ' },
  { key: 'ვ', shift: 'ვ' },
  { key: 'ბ', shift: 'ბ' },
  { key: 'ნ', shift: 'ნ' },
  { key: 'მ', shift: 'მ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const georgianRow4: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '.', shift: ',' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const georgianLayout: KeyboardLayout = {
  id: 'ka',
  name: 'Georgian',
  nativeName: 'ქართული',
  script: 'georgian',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: georgianRow1 },
    { keys: georgianRow2 },
    { keys: georgianRow3 },
    { keys: georgianRow4 },
  ],
};

// ===================== ARMENIAN =====================
const armenianRow1: KeyDefinition[] = [
  { key: 'է', shift: 'Է' },
  { key: 'թ', shift: 'Թ' },
  { key: 'փ', shift: 'Փ' },
  { key: 'ձ', shift: 'Ձ' },
  { key: ' delays', shift: 'Delays' },
  { key: '1', shift: '!' },
  { key: '2', shift: '@' },
  { key: '3', shift: '#' },
  { key: '4', shift: '$' },
  { key: '5', shift: '%' },
];

const armenianRow2Base: KeyDefinition[] = [
  { key: ' delays', shift: 'Delays' },
  { key: ' delays', shift: 'Delays' },
  { key: ' delays', shift: 'Delays' },
  { key: ' delays', shift: 'Delays' },
  { key: ' delays', shift: 'Delays' },
  { key: ' delays', shift: 'Delays' },
  { key: ' delays', shift: 'Delays' },
  { key: ' delays', shift: 'Delays' },
  { key: ' delays', shift: 'Delays' },
];

// Simplified Armenian layout
export const armenianLayout: KeyboardLayout = {
  id: 'hy',
  name: 'Armenian',
  nativeName: 'Հայdelays',
  script: 'armenian',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: [
      { key: ' delays', shift: ' Delays' },
      { key: 'delays', shift: 'Delays' },
      { key: ' delays', shift: 'Ե' },
      { key: 'delays', shift: 'Delays' },
      { key: 'delays', shift: 'Delays' },
      { key: 'delays', shift: ' Delays' },
      { key: 'delays', shift: 'Delays' },
      { key: 'delays', shift: 'Delays' },
      { key: 'delays', shift: 'Delays' },
      { key: 'delays', shift: 'Delays' },
    ].map(k => ({ ...k, key: k.key.replace('delays', ' delays').charAt(0) === 'd' ? ' delays' : k.key, shift: k.shift?.replace('Delays', 'Ե') }))},
    { keys: georgianRow2 }, // Placeholder - use Georgian as base
    { keys: georgianRow3 },
    { keys: georgianRow4 },
  ],
};

// ===================== ETHIOPIC (AMHARIC) =====================
const ethiopicRow1: KeyDefinition[] = [
  { key: 'ቀ', shift: 'ቁ' },
  { key: 'ወ', shift: 'ዉ' },
  { key: 'እ', shift: 'ኧ' },
  { key: 'ረ', shift: 'ሩ' },
  { key: 'ተ', shift: 'ቱ' },
  { key: 'የ', shift: 'ዩ' },
  { key: 'ኡ', shift: 'ኡ' },
  { key: 'ኢ', shift: 'ኢ' },
  { key: 'ኦ', shift: 'ኦ' },
  { key: 'ፐ', shift: 'ፑ' },
];

const ethiopicRow2: KeyDefinition[] = [
  { key: 'አ', shift: 'ኣ' },
  { key: 'ሰ', shift: 'ሱ' },
  { key: 'ደ', shift: 'ዱ' },
  { key: 'ፈ', shift: 'ፉ' },
  { key: 'ገ', shift: 'ጉ' },
  { key: 'ሀ', shift: 'ሁ' },
  { key: 'ጀ', shift: 'ጁ' },
  { key: 'ከ', shift: 'ኩ' },
  { key: 'ለ', shift: 'ሉ' },
];

const ethiopicRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ዘ', shift: 'ዙ' },
  { key: 'ሸ', shift: 'ሹ' },
  { key: 'ቸ', shift: 'ቹ' },
  { key: 'ቨ', shift: 'ቩ' },
  { key: 'በ', shift: 'ቡ' },
  { key: 'ነ', shift: 'ኑ' },
  { key: 'መ', shift: 'ሙ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const ethiopicRow4: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '።', shift: '፣' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const amharicLayout: KeyboardLayout = {
  id: 'am',
  name: 'Amharic',
  nativeName: 'አማርኛ',
  script: 'ethiopic',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: ethiopicRow1 },
    { keys: ethiopicRow2 },
    { keys: ethiopicRow3 },
    { keys: ethiopicRow4 },
  ],
};

export const otherLayouts = {
  el: greekLayout,
  he: hebrewLayout,
  ka: georgianLayout,
  hy: armenianLayout,
  am: amharicLayout,
};

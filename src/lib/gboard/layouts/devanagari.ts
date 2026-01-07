/**
 * Devanagari Script Keyboard Layouts
 * Covers: Hindi, Marathi, Sanskrit, Nepali, Konkani, Bodo, Maithili, etc.
 */

import { KeyboardLayout, KeyDefinition } from '../types';

// Hindi vowels and consonants
const hindiRow1: KeyDefinition[] = [
  { key: 'औ', shift: 'ॐ' },
  { key: 'ऐ', shift: 'ऐ' },
  { key: 'आ', shift: 'आ' },
  { key: 'ई', shift: 'ई' },
  { key: 'ऊ', shift: 'ऊ' },
  { key: 'भ', shift: 'भ' },
  { key: 'ङ', shift: 'ङ' },
  { key: 'घ', shift: 'घ' },
  { key: 'ध', shift: 'ध' },
  { key: 'झ', shift: 'झ' },
];

const hindiRow2: KeyDefinition[] = [
  { key: 'ो', shift: 'ओ' },
  { key: 'े', shift: 'ए' },
  { key: 'ा', shift: 'अ' },
  { key: 'ि', shift: 'इ' },
  { key: 'ु', shift: 'उ' },
  { key: 'प', shift: 'फ' },
  { key: 'र', shift: 'ऱ' },
  { key: 'क', shift: 'ख' },
  { key: 'त', shift: 'थ' },
  { key: 'च', shift: 'छ' },
];

const hindiRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ं', shift: 'ँ' },
  { key: 'म', shift: 'ण' },
  { key: 'न', shift: 'ऩ' },
  { key: 'व', shift: 'ऴ' },
  { key: 'ल', shift: 'ळ' },
  { key: 'स', shift: 'श' },
  { key: 'य', shift: 'ञ' },
  { key: '्', shift: 'ः' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const hindiRow4: KeyDefinition[] = [
  { key: 'ज', shift: 'ज़' },
  { key: 'ड', shift: 'ड़' },
  { key: 'ब', shift: 'ब' },
  { key: 'ग', shift: 'ग़' },
  { key: 'द', shift: 'द' },
  { key: 'ट', shift: 'ठ' },
  { key: 'ष', shift: 'क्ष' },
  { key: 'ह', shift: 'ह' },
];

const hindiRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '।', shift: '॥' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const hindiLayout: KeyboardLayout = {
  id: 'hi',
  name: 'Hindi',
  nativeName: 'हिन्दी',
  script: 'devanagari',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: hindiRow1 },
    { keys: hindiRow2 },
    { keys: hindiRow3 },
    { keys: hindiRow4 },
    { keys: hindiRow5 },
  ],
};

// Marathi uses same Devanagari with some variations
export const marathiLayout: KeyboardLayout = {
  id: 'mr',
  name: 'Marathi',
  nativeName: 'मराठी',
  script: 'devanagari',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: hindiRow1 },
    { keys: hindiRow2 },
    { keys: [
      { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
      { key: 'ं', shift: 'ँ' },
      { key: 'म', shift: 'ण' },
      { key: 'न', shift: 'ऩ' },
      { key: 'व', shift: 'ऴ' },
      { key: 'ल', shift: 'ळ' },
      { key: 'स', shift: 'श' },
      { key: 'य', shift: 'ञ' },
      { key: '्', shift: 'ः' },
      { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
    ]},
    { keys: hindiRow4 },
    { keys: hindiRow5 },
  ],
};

// Sanskrit (same Devanagari)
export const sanskritLayout: KeyboardLayout = {
  id: 'sa',
  name: 'Sanskrit',
  nativeName: 'संस्कृतम्',
  script: 'devanagari',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: [
      { key: 'ॐ', shift: 'ऋ' },
      { key: 'ऐ', shift: 'ॠ' },
      { key: 'आ', shift: 'ऌ' },
      { key: 'ई', shift: 'ॡ' },
      { key: 'ऊ', shift: 'ऽ' },
      { key: 'भ', shift: 'भ' },
      { key: 'ङ', shift: 'ङ' },
      { key: 'घ', shift: 'घ' },
      { key: 'ध', shift: 'ध' },
      { key: 'झ', shift: 'झ' },
    ]},
    { keys: hindiRow2 },
    { keys: hindiRow3 },
    { keys: hindiRow4 },
    { keys: hindiRow5 },
  ],
};

// Nepali (Devanagari)
export const nepaliLayout: KeyboardLayout = {
  id: 'ne',
  name: 'Nepali',
  nativeName: 'नेपाली',
  script: 'devanagari',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: hindiRow1 },
    { keys: hindiRow2 },
    { keys: hindiRow3 },
    { keys: hindiRow4 },
    { keys: hindiRow5 },
  ],
};

// Konkani (Devanagari variant)
export const konkaniLayout: KeyboardLayout = {
  id: 'kok',
  name: 'Konkani',
  nativeName: 'कोंकणी',
  script: 'devanagari',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: hindiRow1 },
    { keys: hindiRow2 },
    { keys: hindiRow3 },
    { keys: hindiRow4 },
    { keys: hindiRow5 },
  ],
};

// Maithili (Devanagari)
export const maithiliLayout: KeyboardLayout = {
  id: 'mai',
  name: 'Maithili',
  nativeName: 'मैथिली',
  script: 'devanagari',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: hindiRow1 },
    { keys: hindiRow2 },
    { keys: hindiRow3 },
    { keys: hindiRow4 },
    { keys: hindiRow5 },
  ],
};

// Bodo (Devanagari)
export const bodoLayout: KeyboardLayout = {
  id: 'brx',
  name: 'Bodo',
  nativeName: 'बड़ो',
  script: 'devanagari',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: hindiRow1 },
    { keys: hindiRow2 },
    { keys: hindiRow3 },
    { keys: hindiRow4 },
    { keys: hindiRow5 },
  ],
};

// Dogri (Devanagari)
export const dogriLayout: KeyboardLayout = {
  id: 'doi',
  name: 'Dogri',
  nativeName: 'डोगरी',
  script: 'devanagari',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: hindiRow1 },
    { keys: hindiRow2 },
    { keys: hindiRow3 },
    { keys: hindiRow4 },
    { keys: hindiRow5 },
  ],
};

export const devanagariLayouts = {
  hi: hindiLayout,
  mr: marathiLayout,
  sa: sanskritLayout,
  ne: nepaliLayout,
  kok: konkaniLayout,
  mai: maithiliLayout,
  brx: bodoLayout,
  doi: dogriLayout,
};

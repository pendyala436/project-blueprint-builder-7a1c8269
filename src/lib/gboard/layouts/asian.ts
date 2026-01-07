/**
 * Asian Script Keyboard Layouts
 * Covers: Thai, Khmer, Myanmar, Lao, Tibetan, Sinhala, etc.
 */

import { KeyboardLayout, KeyDefinition } from '../types';

// ===================== THAI =====================
const thaiRow1: KeyDefinition[] = [
  { key: 'ๆ', shift: '๐' },
  { key: 'ไ', shift: '"' },
  { key: 'ำ', shift: 'ฎ' },
  { key: 'พ', shift: 'ฑ' },
  { key: 'ะ', shift: 'ธ' },
  { key: 'ั', shift: 'ํ' },
  { key: 'ี', shift: '๊' },
  { key: 'ร', shift: 'ณ' },
  { key: 'น', shift: 'ฯ' },
  { key: 'ย', shift: 'ญ' },
  { key: 'บ', shift: 'ฐ' },
];

const thaiRow2: KeyDefinition[] = [
  { key: 'ฟ', shift: 'ฤ' },
  { key: 'ห', shift: 'ฆ' },
  { key: 'ก', shift: 'ฏ' },
  { key: 'ด', shift: 'โ' },
  { key: 'เ', shift: 'ฌ' },
  { key: '้', shift: '็' },
  { key: '่', shift: '๋' },
  { key: 'า', shift: 'ษ' },
  { key: 'ส', shift: 'ศ' },
  { key: 'ว', shift: 'ซ' },
  { key: 'ง', shift: '.' },
];

const thaiRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ผ', shift: '(' },
  { key: 'ป', shift: ')' },
  { key: 'แ', shift: 'ฉ' },
  { key: 'อ', shift: 'ฮ' },
  { key: 'ิ', shift: 'ฺ' },
  { key: 'ื', shift: '์' },
  { key: 'ท', shift: '?' },
  { key: 'ม', shift: 'ฒ' },
  { key: 'ใ', shift: 'ฬ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const thaiRow4: KeyDefinition[] = [
  { key: 'ฝ', shift: 'ฦ' },
  { key: 'ช', shift: 'ฅ' },
  { key: 'ข', shift: 'ฃ' },
  { key: 'ถ', shift: 'ภ' },
  { key: 'ุ', shift: 'ู' },
  { key: 'ค', shift: 'ฅ' },
  { key: 'ต', shift: 'ฐ' },
  { key: 'จ', shift: 'ฎ' },
  { key: 'ล', shift: 'ฬ' },
];

const thaiRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: 'ฯ', shift: 'ๆ' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const thaiLayout: KeyboardLayout = {
  id: 'th',
  name: 'Thai',
  nativeName: 'ไทย',
  script: 'thai',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: thaiRow1 },
    { keys: thaiRow2 },
    { keys: thaiRow3 },
    { keys: thaiRow4 },
    { keys: thaiRow5 },
  ],
};

// ===================== KHMER =====================
const khmerRow1: KeyDefinition[] = [
  { key: 'ឆ', shift: 'ឈ' },
  { key: 'ឹ', shift: 'ឺ' },
  { key: 'េ', shift: 'ែ' },
  { key: 'រ', shift: 'ឬ' },
  { key: 'ត', shift: 'ទ' },
  { key: 'យ', shift: 'ួ' },
  { key: 'ុ', shift: 'ូ' },
  { key: 'ិ', shift: 'ី' },
  { key: 'ោ', shift: 'ៅ' },
  { key: 'ផ', shift: 'ភ' },
];

const khmerRow2: KeyDefinition[] = [
  { key: 'ា', shift: 'ាំ' },
  { key: 'ស', shift: 'ៃ' },
  { key: 'ដ', shift: 'ឌ' },
  { key: 'ថ', shift: 'ធ' },
  { key: 'ង', shift: 'អ' },
  { key: 'ហ', shift: 'ះ' },
  { key: 'ញ', shift: 'ឋ' },
  { key: 'ក', shift: 'គ' },
  { key: 'ល', shift: 'ឡ' },
];

const khmerRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ឃ', shift: 'ឍ' },
  { key: 'ខ', shift: 'ឃ' },
  { key: 'ច', shift: 'ជ' },
  { key: 'វ', shift: 'វ្រ' },
  { key: 'ប', shift: 'ព' },
  { key: 'ន', shift: 'ណ' },
  { key: 'ម', shift: 'ំ' },
  { key: '់', shift: '៌' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const khmerRow4: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '។', shift: '៕' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const khmerLayout: KeyboardLayout = {
  id: 'km',
  name: 'Khmer',
  nativeName: 'ខ្មែរ',
  script: 'khmer',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: khmerRow1 },
    { keys: khmerRow2 },
    { keys: khmerRow3 },
    { keys: khmerRow4 },
  ],
};

// ===================== MYANMAR (BURMESE) =====================
const myanmarRow1: KeyDefinition[] = [
  { key: 'ဆ', shift: 'ဇ' },
  { key: 'တ', shift: 'ဋ' },
  { key: 'န', shift: 'ဏ' },
  { key: 'မ', shift: 'ဩ' },
  { key: 'အ', shift: 'ဪ' },
  { key: 'ပ', shift: 'ဖ' },
  { key: 'က', shift: 'ခ' },
  { key: 'င', shift: 'ဃ' },
  { key: 'သ', shift: 'ဌ' },
  { key: 'စ', shift: 'ဈ' },
];

const myanmarRow2: KeyDefinition[] = [
  { key: 'ေ', shift: 'ဧ' },
  { key: 'ျ', shift: 'ျ' },
  { key: 'ိ', shift: 'ဣ' },
  { key: '်', shift: '္' },
  { key: 'ါ', shift: 'ါ' },
  { key: '့', shift: 'ံ' },
  { key: 'ု', shift: 'ူ' },
  { key: 'ှ', shift: 'ှ' },
  { key: 'ြ', shift: 'ြ' },
];

const myanmarRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ဒ', shift: 'ဓ' },
  { key: 'ထ', shift: 'ဌ' },
  { key: 'ခ', shift: 'ဆ' },
  { key: 'ရ', shift: 'ၐ' },
  { key: 'လ', shift: 'ဠ' },
  { key: 'ဝ', shift: 'ဝ' },
  { key: 'ည', shift: 'ဉ' },
  { key: 'ယ', shift: 'ဥ' },
  { key: 'ဘ', shift: 'ဗ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const myanmarRow4: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '။', shift: '၊' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const myanmarLayout: KeyboardLayout = {
  id: 'my',
  name: 'Myanmar',
  nativeName: 'မြန်မာ',
  script: 'myanmar',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: myanmarRow1 },
    { keys: myanmarRow2 },
    { keys: myanmarRow3 },
    { keys: myanmarRow4 },
  ],
};

// ===================== LAO =====================
const laoRow1: KeyDefinition[] = [
  { key: 'ຜ', shift: '໑' },
  { key: 'ຟ', shift: '໒' },
  { key: 'ໂ', shift: '໓' },
  { key: 'ຖ', shift: '໔' },
  { key: 'ຸ', shift: 'ູ' },
  { key: 'ູ', shift: '໕' },
  { key: 'ຄ', shift: '໖' },
  { key: 'ຕ', shift: '໗' },
  { key: 'ຈ', shift: '໘' },
  { key: 'ຂ', shift: '໙' },
  { key: 'ຊ', shift: '໐' },
];

const laoRow2: KeyDefinition[] = [
  { key: 'ັ', shift: 'ົ' },
  { key: 'ີ', shift: 'ິ' },
  { key: 'ຳ', shift: 'ຳ' },
  { key: 'ພ', shift: 'ຟ' },
  { key: 'ະ', shift: 'ັ' },
  { key: 'ິ', shift: 'ີ' },
  { key: 'ື', shift: 'ື' },
  { key: 'ທ', shift: 'ທ' },
  { key: 'ສ', shift: 'ສ' },
  { key: 'ວ', shift: 'ວ' },
];

const laoRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ເ', shift: 'ແ' },
  { key: 'ແ', shift: 'ໂ' },
  { key: 'ໃ', shift: 'ໄ' },
  { key: 'ໄ', shift: 'ໃ' },
  { key: 'ຍ', shift: 'ຽ' },
  { key: 'ບ', shift: 'ປ' },
  { key: 'ລ', shift: 'ຫ' },
  { key: 'ຫ', shift: 'ອ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const laoRow4: KeyDefinition[] = [
  { key: 'ກ', shift: 'ງ' },
  { key: 'ດ', shift: 'ນ' },
  { key: 'ຮ', shift: 'ໜ' },
  { key: 'ນ', shift: 'ໝ' },
  { key: 'ຣ', shift: 'ຣ' },
  { key: 'ມ', shift: 'ມ' },
  { key: 'ໜ', shift: 'ຢ' },
  { key: 'ໝ', shift: 'ວ' },
];

const laoRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: 'ໆ', shift: 'ຯ' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const laoLayout: KeyboardLayout = {
  id: 'lo',
  name: 'Lao',
  nativeName: 'ລາວ',
  script: 'lao',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: laoRow1 },
    { keys: laoRow2 },
    { keys: laoRow3 },
    { keys: laoRow4 },
    { keys: laoRow5 },
  ],
};

// ===================== SINHALA =====================
const sinhalaRow1: KeyDefinition[] = [
  { key: 'ඔ', shift: 'ඖ' },
  { key: 'ඇ', shift: 'ඈ' },
  { key: 'ඉ', shift: 'ඊ' },
  { key: 'උ', shift: 'ඌ' },
  { key: 'ඍ', shift: 'ඎ' },
  { key: 'එ', shift: 'ඒ' },
  { key: 'ඓ', shift: 'ඓ' },
  { key: 'ඐ', shift: 'ඐ' },
  { key: 'ඕ', shift: 'ඖ' },
];

const sinhalaRow2: KeyDefinition[] = [
  { key: 'අ', shift: 'ආ' },
  { key: 'ක', shift: 'ඛ' },
  { key: 'ග', shift: 'ඝ' },
  { key: 'ච', shift: 'ඡ' },
  { key: 'ජ', shift: 'ඣ' },
  { key: 'ට', shift: 'ඨ' },
  { key: 'ඩ', shift: 'ඪ' },
  { key: 'ණ', shift: 'ණ' },
  { key: 'ත', shift: 'ථ' },
];

const sinhalaRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ද', shift: 'ධ' },
  { key: 'න', shift: 'න' },
  { key: 'ප', shift: 'ඵ' },
  { key: 'බ', shift: 'භ' },
  { key: 'ම', shift: 'ම' },
  { key: 'ය', shift: 'ය' },
  { key: 'ර', shift: 'ර' },
  { key: 'ල', shift: 'ළ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const sinhalaRow4: KeyDefinition[] = [
  { key: 'ව', shift: 'ව' },
  { key: 'ස', shift: 'ෂ' },
  { key: 'හ', shift: 'හ' },
  { key: 'ෆ', shift: 'ෆ' },
  { key: 'ං', shift: 'ඃ' },
  { key: '්', shift: '්' },
  { key: 'ා', shift: 'ැ' },
  { key: 'ෑ', shift: 'ි' },
  { key: 'ී', shift: 'ු' },
  { key: 'ූ', shift: 'ෘ' },
];

const sinhalaRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '।', shift: '॥' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const sinhalaLayout: KeyboardLayout = {
  id: 'si',
  name: 'Sinhala',
  nativeName: 'සිංහල',
  script: 'sinhala',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: sinhalaRow1 },
    { keys: sinhalaRow2 },
    { keys: sinhalaRow3 },
    { keys: sinhalaRow4 },
    { keys: sinhalaRow5 },
  ],
};

export const asianLayouts = {
  th: thaiLayout,
  km: khmerLayout,
  my: myanmarLayout,
  lo: laoLayout,
  si: sinhalaLayout,
};

/**
 * Indic Script Keyboard Layouts (Non-Devanagari)
 * Covers: Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Odia
 */

import { KeyboardLayout, KeyDefinition } from '../types';

// ===================== BENGALI =====================
const bengaliRow1: KeyDefinition[] = [
  { key: 'ঔ', shift: 'ঐ' },
  { key: 'আ', shift: 'অ' },
  { key: 'ই', shift: 'ঈ' },
  { key: 'উ', shift: 'ঊ' },
  { key: 'ঋ', shift: 'ৠ' },
  { key: 'এ', shift: 'ঐ' },
  { key: 'ও', shift: 'ঔ' },
  { key: 'ক', shift: 'খ' },
  { key: 'গ', shift: 'ঘ' },
  { key: 'ঙ', shift: 'ঙ' },
];

const bengaliRow2: KeyDefinition[] = [
  { key: 'চ', shift: 'ছ' },
  { key: 'জ', shift: 'ঝ' },
  { key: 'ঞ', shift: 'ঞ' },
  { key: 'ট', shift: 'ঠ' },
  { key: 'ড', shift: 'ঢ' },
  { key: 'ণ', shift: 'ণ' },
  { key: 'ত', shift: 'থ' },
  { key: 'দ', shift: 'ধ' },
  { key: 'ন', shift: 'ন' },
];

const bengaliRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'প', shift: 'ফ' },
  { key: 'ব', shift: 'ভ' },
  { key: 'ম', shift: 'ম' },
  { key: 'য', shift: 'য়' },
  { key: 'র', shift: 'ড়' },
  { key: 'ল', shift: 'ল' },
  { key: 'শ', shift: 'ষ' },
  { key: 'স', shift: 'হ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const bengaliRow4: KeyDefinition[] = [
  { key: 'া', shift: 'ি' },
  { key: 'ী', shift: 'ু' },
  { key: 'ূ', shift: 'ৃ' },
  { key: 'ে', shift: 'ৈ' },
  { key: 'ো', shift: 'ৌ' },
  { key: '্', shift: 'ং' },
  { key: 'ঃ', shift: 'ঁ' },
];

const bengaliRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '।', shift: '॥' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const bengaliLayout: KeyboardLayout = {
  id: 'bn',
  name: 'Bengali',
  nativeName: 'বাংলা',
  script: 'bengali',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: bengaliRow1 },
    { keys: bengaliRow2 },
    { keys: bengaliRow3 },
    { keys: bengaliRow4 },
    { keys: bengaliRow5 },
  ],
};

// Assamese (uses Bengali script with some extras)
export const assameseLayout: KeyboardLayout = {
  id: 'as',
  name: 'Assamese',
  nativeName: 'অসমীয়া',
  script: 'bengali',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: [
      ...bengaliRow1.slice(0, 6),
      { key: 'ৱ', shift: 'ৱ' },
      ...bengaliRow1.slice(7),
    ]},
    { keys: bengaliRow2 },
    { keys: bengaliRow3 },
    { keys: bengaliRow4 },
    { keys: bengaliRow5 },
  ],
};

// ===================== TAMIL =====================
const tamilRow1: KeyDefinition[] = [
  { key: 'ஔ', shift: 'ஐ' },
  { key: 'ஆ', shift: 'அ' },
  { key: 'இ', shift: 'ஈ' },
  { key: 'உ', shift: 'ஊ' },
  { key: 'எ', shift: 'ஏ' },
  { key: 'ஒ', shift: 'ஓ' },
  { key: 'க', shift: 'க்' },
  { key: 'ங', shift: 'ங்' },
  { key: 'ச', shift: 'ச்' },
  { key: 'ஞ', shift: 'ஞ்' },
];

const tamilRow2: KeyDefinition[] = [
  { key: 'ட', shift: 'ட்' },
  { key: 'ண', shift: 'ண்' },
  { key: 'த', shift: 'த்' },
  { key: 'ந', shift: 'ந்' },
  { key: 'ப', shift: 'ப்' },
  { key: 'ம', shift: 'ம்' },
  { key: 'ய', shift: 'ய்' },
  { key: 'ர', shift: 'ர்' },
  { key: 'ல', shift: 'ல்' },
];

const tamilRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'வ', shift: 'வ்' },
  { key: 'ழ', shift: 'ழ்' },
  { key: 'ள', shift: 'ள்' },
  { key: 'ற', shift: 'ற்' },
  { key: 'ன', shift: 'ன்' },
  { key: 'ஜ', shift: 'ஜ்' },
  { key: 'ஷ', shift: 'ஷ்' },
  { key: 'ஸ', shift: 'ஸ்' },
  { key: 'ஹ', shift: 'ஹ்' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const tamilRow4: KeyDefinition[] = [
  { key: 'ா', shift: 'ி' },
  { key: 'ீ', shift: 'ு' },
  { key: 'ூ', shift: 'ெ' },
  { key: 'ே', shift: 'ை' },
  { key: 'ொ', shift: 'ோ' },
  { key: 'ௌ', shift: '்' },
  { key: 'ஂ', shift: 'ஃ' },
];

const tamilRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '।', shift: '॥' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const tamilLayout: KeyboardLayout = {
  id: 'ta',
  name: 'Tamil',
  nativeName: 'தமிழ்',
  script: 'tamil',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: tamilRow1 },
    { keys: tamilRow2 },
    { keys: tamilRow3 },
    { keys: tamilRow4 },
    { keys: tamilRow5 },
  ],
};

// ===================== TELUGU =====================
const teluguRow1: KeyDefinition[] = [
  { key: 'ఔ', shift: 'ఐ' },
  { key: 'ఆ', shift: 'అ' },
  { key: 'ఇ', shift: 'ఈ' },
  { key: 'ఉ', shift: 'ఊ' },
  { key: 'ఋ', shift: 'ౠ' },
  { key: 'ఎ', shift: 'ఏ' },
  { key: 'ఒ', shift: 'ఓ' },
  { key: 'క', shift: 'ఖ' },
  { key: 'గ', shift: 'ఘ' },
  { key: 'ఙ', shift: 'ఙ' },
];

const teluguRow2: KeyDefinition[] = [
  { key: 'చ', shift: 'ఛ' },
  { key: 'జ', shift: 'ఝ' },
  { key: 'ఞ', shift: 'ఞ' },
  { key: 'ట', shift: 'ఠ' },
  { key: 'డ', shift: 'ఢ' },
  { key: 'ణ', shift: 'ణ' },
  { key: 'త', shift: 'థ' },
  { key: 'ద', shift: 'ధ' },
  { key: 'న', shift: 'న' },
];

const teluguRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ప', shift: 'ఫ' },
  { key: 'బ', shift: 'భ' },
  { key: 'మ', shift: 'మ' },
  { key: 'య', shift: 'య' },
  { key: 'ర', shift: 'ఱ' },
  { key: 'ల', shift: 'ళ' },
  { key: 'వ', shift: 'వ' },
  { key: 'శ', shift: 'ష' },
  { key: 'స', shift: 'హ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const teluguRow4: KeyDefinition[] = [
  { key: 'ా', shift: 'ి' },
  { key: 'ీ', shift: 'ు' },
  { key: 'ూ', shift: 'ృ' },
  { key: 'ె', shift: 'ే' },
  { key: 'ొ', shift: 'ో' },
  { key: 'ౌ', shift: '్' },
  { key: 'ం', shift: 'ః' },
];

const teluguRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '।', shift: '॥' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const teluguLayout: KeyboardLayout = {
  id: 'te',
  name: 'Telugu',
  nativeName: 'తెలుగు',
  script: 'telugu',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: teluguRow1 },
    { keys: teluguRow2 },
    { keys: teluguRow3 },
    { keys: teluguRow4 },
    { keys: teluguRow5 },
  ],
};

// ===================== KANNADA =====================
const kannadaRow1: KeyDefinition[] = [
  { key: 'ಔ', shift: 'ಐ' },
  { key: 'ಆ', shift: 'ಅ' },
  { key: 'ಇ', shift: 'ಈ' },
  { key: 'ಉ', shift: 'ಊ' },
  { key: 'ಋ', shift: 'ೠ' },
  { key: 'ಎ', shift: 'ಏ' },
  { key: 'ಒ', shift: 'ಓ' },
  { key: 'ಕ', shift: 'ಖ' },
  { key: 'ಗ', shift: 'ಘ' },
  { key: 'ಙ', shift: 'ಙ' },
];

const kannadaRow2: KeyDefinition[] = [
  { key: 'ಚ', shift: 'ಛ' },
  { key: 'ಜ', shift: 'ಝ' },
  { key: 'ಞ', shift: 'ಞ' },
  { key: 'ಟ', shift: 'ಠ' },
  { key: 'ಡ', shift: 'ಢ' },
  { key: 'ಣ', shift: 'ಣ' },
  { key: 'ತ', shift: 'ಥ' },
  { key: 'ದ', shift: 'ಧ' },
  { key: 'ನ', shift: 'ನ' },
];

const kannadaRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ಪ', shift: 'ಫ' },
  { key: 'ಬ', shift: 'ಭ' },
  { key: 'ಮ', shift: 'ಮ' },
  { key: 'ಯ', shift: 'ಯ' },
  { key: 'ರ', shift: 'ಱ' },
  { key: 'ಲ', shift: 'ಳ' },
  { key: 'ವ', shift: 'ವ' },
  { key: 'ಶ', shift: 'ಷ' },
  { key: 'ಸ', shift: 'ಹ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const kannadaRow4: KeyDefinition[] = [
  { key: 'ಾ', shift: 'ಿ' },
  { key: 'ೀ', shift: 'ು' },
  { key: 'ೂ', shift: 'ೃ' },
  { key: 'ೆ', shift: 'ೇ' },
  { key: 'ೊ', shift: 'ೋ' },
  { key: 'ೌ', shift: '್' },
  { key: 'ಂ', shift: 'ಃ' },
];

const kannadaRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '।', shift: '॥' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const kannadaLayout: KeyboardLayout = {
  id: 'kn',
  name: 'Kannada',
  nativeName: 'ಕನ್ನಡ',
  script: 'kannada',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: kannadaRow1 },
    { keys: kannadaRow2 },
    { keys: kannadaRow3 },
    { keys: kannadaRow4 },
    { keys: kannadaRow5 },
  ],
};

// ===================== MALAYALAM =====================
const malayalamRow1: KeyDefinition[] = [
  { key: 'ഔ', shift: 'ഐ' },
  { key: 'ആ', shift: 'അ' },
  { key: 'ഇ', shift: 'ഈ' },
  { key: 'ഉ', shift: 'ഊ' },
  { key: 'ഋ', shift: 'ൠ' },
  { key: 'എ', shift: 'ഏ' },
  { key: 'ഒ', shift: 'ഓ' },
  { key: 'ക', shift: 'ഖ' },
  { key: 'ഗ', shift: 'ഘ' },
  { key: 'ങ', shift: 'ങ' },
];

const malayalamRow2: KeyDefinition[] = [
  { key: 'ച', shift: 'ഛ' },
  { key: 'ജ', shift: 'ഝ' },
  { key: 'ഞ', shift: 'ഞ' },
  { key: 'ട', shift: 'ഠ' },
  { key: 'ഡ', shift: 'ഢ' },
  { key: 'ണ', shift: 'ണ' },
  { key: 'ത', shift: 'ഥ' },
  { key: 'ദ', shift: 'ധ' },
  { key: 'ന', shift: 'ന' },
];

const malayalamRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'പ', shift: 'ഫ' },
  { key: 'ബ', shift: 'ഭ' },
  { key: 'മ', shift: 'മ' },
  { key: 'യ', shift: 'യ' },
  { key: 'ര', shift: 'റ' },
  { key: 'ല', shift: 'ള' },
  { key: 'വ', shift: 'ഴ' },
  { key: 'ശ', shift: 'ഷ' },
  { key: 'സ', shift: 'ഹ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const malayalamRow4: KeyDefinition[] = [
  { key: 'ാ', shift: 'ി' },
  { key: 'ീ', shift: 'ു' },
  { key: 'ൂ', shift: 'ൃ' },
  { key: 'െ', shift: 'േ' },
  { key: 'ൊ', shift: 'ോ' },
  { key: 'ൗ', shift: '്' },
  { key: 'ം', shift: 'ഃ' },
];

const malayalamRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '।', shift: '॥' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const malayalamLayout: KeyboardLayout = {
  id: 'ml',
  name: 'Malayalam',
  nativeName: 'മലയാളം',
  script: 'malayalam',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: malayalamRow1 },
    { keys: malayalamRow2 },
    { keys: malayalamRow3 },
    { keys: malayalamRow4 },
    { keys: malayalamRow5 },
  ],
};

// ===================== GUJARATI =====================
const gujaratiRow1: KeyDefinition[] = [
  { key: 'ઔ', shift: 'ઐ' },
  { key: 'આ', shift: 'અ' },
  { key: 'ઇ', shift: 'ઈ' },
  { key: 'ઉ', shift: 'ઊ' },
  { key: 'ઋ', shift: 'ૠ' },
  { key: 'એ', shift: 'ઍ' },
  { key: 'ઓ', shift: 'ઑ' },
  { key: 'ક', shift: 'ખ' },
  { key: 'ગ', shift: 'ઘ' },
  { key: 'ઙ', shift: 'ઙ' },
];

const gujaratiRow2: KeyDefinition[] = [
  { key: 'ચ', shift: 'છ' },
  { key: 'જ', shift: 'ઝ' },
  { key: 'ઞ', shift: 'ઞ' },
  { key: 'ટ', shift: 'ઠ' },
  { key: 'ડ', shift: 'ઢ' },
  { key: 'ણ', shift: 'ણ' },
  { key: 'ત', shift: 'થ' },
  { key: 'દ', shift: 'ધ' },
  { key: 'ન', shift: 'ન' },
];

const gujaratiRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'પ', shift: 'ફ' },
  { key: 'બ', shift: 'ભ' },
  { key: 'મ', shift: 'મ' },
  { key: 'ય', shift: 'ય' },
  { key: 'ર', shift: 'ર' },
  { key: 'લ', shift: 'ળ' },
  { key: 'વ', shift: 'વ' },
  { key: 'શ', shift: 'ષ' },
  { key: 'સ', shift: 'હ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const gujaratiRow4: KeyDefinition[] = [
  { key: 'ા', shift: 'િ' },
  { key: 'ી', shift: 'ુ' },
  { key: 'ૂ', shift: 'ૃ' },
  { key: 'ે', shift: 'ૈ' },
  { key: 'ો', shift: 'ૌ' },
  { key: '્', shift: 'ં' },
  { key: 'ઃ', shift: 'ઁ' },
];

const gujaratiRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '।', shift: '॥' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const gujaratiLayout: KeyboardLayout = {
  id: 'gu',
  name: 'Gujarati',
  nativeName: 'ગુજરાતી',
  script: 'gujarati',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: gujaratiRow1 },
    { keys: gujaratiRow2 },
    { keys: gujaratiRow3 },
    { keys: gujaratiRow4 },
    { keys: gujaratiRow5 },
  ],
};

// ===================== PUNJABI (GURMUKHI) =====================
const punjabiRow1: KeyDefinition[] = [
  { key: 'ਔ', shift: 'ਐ' },
  { key: 'ਆ', shift: 'ਅ' },
  { key: 'ਇ', shift: 'ਈ' },
  { key: 'ਉ', shift: 'ਊ' },
  { key: 'ਏ', shift: 'ਏ' },
  { key: 'ਓ', shift: 'ਓ' },
  { key: 'ਕ', shift: 'ਖ' },
  { key: 'ਗ', shift: 'ਘ' },
  { key: 'ਙ', shift: 'ਙ' },
];

const punjabiRow2: KeyDefinition[] = [
  { key: 'ਚ', shift: 'ਛ' },
  { key: 'ਜ', shift: 'ਝ' },
  { key: 'ਞ', shift: 'ਞ' },
  { key: 'ਟ', shift: 'ਠ' },
  { key: 'ਡ', shift: 'ਢ' },
  { key: 'ਣ', shift: 'ਣ' },
  { key: 'ਤ', shift: 'ਥ' },
  { key: 'ਦ', shift: 'ਧ' },
  { key: 'ਨ', shift: 'ਨ' },
];

const punjabiRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ਪ', shift: 'ਫ' },
  { key: 'ਬ', shift: 'ਭ' },
  { key: 'ਮ', shift: 'ਮ' },
  { key: 'ਯ', shift: 'ਯ' },
  { key: 'ਰ', shift: 'ੜ' },
  { key: 'ਲ', shift: 'ਲ਼' },
  { key: 'ਵ', shift: 'ਵ' },
  { key: 'ਸ਼', shift: 'ਸ' },
  { key: 'ਹ', shift: 'ਹ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const punjabiRow4: KeyDefinition[] = [
  { key: 'ਾ', shift: 'ਿ' },
  { key: 'ੀ', shift: 'ੁ' },
  { key: 'ੂ', shift: 'ੂ' },
  { key: 'ੇ', shift: 'ੈ' },
  { key: 'ੋ', shift: 'ੌ' },
  { key: '੍', shift: 'ਂ' },
  { key: 'ਃ', shift: 'ੰ' },
];

const punjabiRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '।', shift: '॥' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const punjabiLayout: KeyboardLayout = {
  id: 'pa',
  name: 'Punjabi',
  nativeName: 'ਪੰਜਾਬੀ',
  script: 'punjabi',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: punjabiRow1 },
    { keys: punjabiRow2 },
    { keys: punjabiRow3 },
    { keys: punjabiRow4 },
    { keys: punjabiRow5 },
  ],
};

// ===================== ODIA =====================
const odiaRow1: KeyDefinition[] = [
  { key: 'ଔ', shift: 'ଐ' },
  { key: 'ଆ', shift: 'ଅ' },
  { key: 'ଇ', shift: 'ଈ' },
  { key: 'ଉ', shift: 'ଊ' },
  { key: 'ଋ', shift: 'ୠ' },
  { key: 'ଏ', shift: 'ଏ' },
  { key: 'ଓ', shift: 'ଓ' },
  { key: 'କ', shift: 'ଖ' },
  { key: 'ଗ', shift: 'ଘ' },
  { key: 'ଙ', shift: 'ଙ' },
];

const odiaRow2: KeyDefinition[] = [
  { key: 'ଚ', shift: 'ଛ' },
  { key: 'ଜ', shift: 'ଝ' },
  { key: 'ଞ', shift: 'ଞ' },
  { key: 'ଟ', shift: 'ଠ' },
  { key: 'ଡ', shift: 'ଢ' },
  { key: 'ଣ', shift: 'ଣ' },
  { key: 'ତ', shift: 'ଥ' },
  { key: 'ଦ', shift: 'ଧ' },
  { key: 'ନ', shift: 'ନ' },
];

const odiaRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'ପ', shift: 'ଫ' },
  { key: 'ବ', shift: 'ଭ' },
  { key: 'ମ', shift: 'ମ' },
  { key: 'ଯ', shift: 'ୟ' },
  { key: 'ର', shift: 'ର' },
  { key: 'ଲ', shift: 'ଳ' },
  { key: 'ଵ', shift: 'ଵ' },
  { key: 'ଶ', shift: 'ଷ' },
  { key: 'ସ', shift: 'ହ' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const odiaRow4: KeyDefinition[] = [
  { key: 'ା', shift: 'ି' },
  { key: 'ୀ', shift: 'ୁ' },
  { key: 'ୂ', shift: 'ୃ' },
  { key: 'େ', shift: 'ୈ' },
  { key: 'ୋ', shift: 'ୌ' },
  { key: '୍', shift: 'ଂ' },
  { key: 'ଃ', shift: 'ଁ' },
];

const odiaRow5: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '।', shift: '॥' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const odiaLayout: KeyboardLayout = {
  id: 'or',
  name: 'Odia',
  nativeName: 'ଓଡ଼ିଆ',
  script: 'odia',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: odiaRow1 },
    { keys: odiaRow2 },
    { keys: odiaRow3 },
    { keys: odiaRow4 },
    { keys: odiaRow5 },
  ],
};

export const indicLayouts = {
  bn: bengaliLayout,
  as: assameseLayout,
  ta: tamilLayout,
  te: teluguLayout,
  kn: kannadaLayout,
  ml: malayalamLayout,
  gu: gujaratiLayout,
  pa: punjabiLayout,
  or: odiaLayout,
};

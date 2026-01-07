/**
 * Latin Script Keyboard Layouts
 * Covers: English, Spanish, French, German, Portuguese, Italian, 
 * Dutch, Polish, Romanian, Vietnamese, Turkish, Indonesian, etc.
 */

import { KeyboardLayout, KeyDefinition } from '../types';

// Standard QWERTY base
const qwertyRow1: KeyDefinition[] = [
  { key: 'q', shift: 'Q' },
  { key: 'w', shift: 'W' },
  { key: 'e', shift: 'E', alt: 'é', altShift: 'É' },
  { key: 'r', shift: 'R' },
  { key: 't', shift: 'T' },
  { key: 'y', shift: 'Y' },
  { key: 'u', shift: 'U', alt: 'ú', altShift: 'Ú' },
  { key: 'i', shift: 'I', alt: 'í', altShift: 'Í' },
  { key: 'o', shift: 'O', alt: 'ó', altShift: 'Ó' },
  { key: 'p', shift: 'P' },
];

const qwertyRow2: KeyDefinition[] = [
  { key: 'a', shift: 'A', alt: 'á', altShift: 'Á' },
  { key: 's', shift: 'S', alt: 'ß' },
  { key: 'd', shift: 'D' },
  { key: 'f', shift: 'F' },
  { key: 'g', shift: 'G' },
  { key: 'h', shift: 'H' },
  { key: 'j', shift: 'J' },
  { key: 'k', shift: 'K' },
  { key: 'l', shift: 'L' },
];

const qwertyRow3: KeyDefinition[] = [
  { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
  { key: 'z', shift: 'Z' },
  { key: 'x', shift: 'X' },
  { key: 'c', shift: 'C', alt: 'ç', altShift: 'Ç' },
  { key: 'v', shift: 'V' },
  { key: 'b', shift: 'B' },
  { key: 'n', shift: 'N', alt: 'ñ', altShift: 'Ñ' },
  { key: 'm', shift: 'M' },
  { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
];

const qwertyRow4: KeyDefinition[] = [
  { key: '123', type: 'modifier', width: 1.25, label: '123' },
  { key: '🌐', type: 'modifier', width: 1, label: 'Lang' },
  { key: ' ', type: 'space', width: 5, label: 'Space' },
  { key: '.', shift: ',' },
  { key: '↵', type: 'action', width: 1.75, label: 'Return' },
];

export const englishLayout: KeyboardLayout = {
  id: 'en',
  name: 'English',
  nativeName: 'English',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: qwertyRow1 },
    { keys: qwertyRow2 },
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Spanish Layout
export const spanishLayout: KeyboardLayout = {
  id: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: qwertyRow1 },
    { keys: [...qwertyRow2, { key: 'ñ', shift: 'Ñ' }] },
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// French Layout (AZERTY)
export const frenchLayout: KeyboardLayout = {
  id: 'fr',
  name: 'French',
  nativeName: 'Français',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: [
      { key: 'a', shift: 'A', alt: 'à', altShift: 'À' },
      { key: 'z', shift: 'Z' },
      { key: 'e', shift: 'E', alt: 'é', altShift: 'É' },
      { key: 'r', shift: 'R' },
      { key: 't', shift: 'T' },
      { key: 'y', shift: 'Y' },
      { key: 'u', shift: 'U', alt: 'ù', altShift: 'Ù' },
      { key: 'i', shift: 'I', alt: 'î', altShift: 'Î' },
      { key: 'o', shift: 'O', alt: 'ô', altShift: 'Ô' },
      { key: 'p', shift: 'P' },
    ]},
    { keys: [
      { key: 'q', shift: 'Q' },
      { key: 's', shift: 'S' },
      { key: 'd', shift: 'D' },
      { key: 'f', shift: 'F' },
      { key: 'g', shift: 'G' },
      { key: 'h', shift: 'H' },
      { key: 'j', shift: 'J' },
      { key: 'k', shift: 'K' },
      { key: 'l', shift: 'L' },
      { key: 'm', shift: 'M' },
    ]},
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// German Layout (QWERTZ)
export const germanLayout: KeyboardLayout = {
  id: 'de',
  name: 'German',
  nativeName: 'Deutsch',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: [
      { key: 'q', shift: 'Q' },
      { key: 'w', shift: 'W' },
      { key: 'e', shift: 'E', alt: 'é' },
      { key: 'r', shift: 'R' },
      { key: 't', shift: 'T' },
      { key: 'z', shift: 'Z' },
      { key: 'u', shift: 'U', alt: 'ü', altShift: 'Ü' },
      { key: 'i', shift: 'I' },
      { key: 'o', shift: 'O', alt: 'ö', altShift: 'Ö' },
      { key: 'p', shift: 'P' },
    ]},
    { keys: [
      { key: 'a', shift: 'A', alt: 'ä', altShift: 'Ä' },
      { key: 's', shift: 'S', alt: 'ß' },
      { key: 'd', shift: 'D' },
      { key: 'f', shift: 'F' },
      { key: 'g', shift: 'G' },
      { key: 'h', shift: 'H' },
      { key: 'j', shift: 'J' },
      { key: 'k', shift: 'K' },
      { key: 'l', shift: 'L' },
    ]},
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Portuguese Layout
export const portugueseLayout: KeyboardLayout = {
  id: 'pt',
  name: 'Portuguese',
  nativeName: 'Português',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: [
      { key: 'q', shift: 'Q' },
      { key: 'w', shift: 'W' },
      { key: 'e', shift: 'E', alt: 'é', altShift: 'É' },
      { key: 'r', shift: 'R' },
      { key: 't', shift: 'T' },
      { key: 'y', shift: 'Y' },
      { key: 'u', shift: 'U', alt: 'ú', altShift: 'Ú' },
      { key: 'i', shift: 'I', alt: 'í', altShift: 'Í' },
      { key: 'o', shift: 'O', alt: 'ó', altShift: 'Ó' },
      { key: 'p', shift: 'P' },
    ]},
    { keys: [
      { key: 'a', shift: 'A', alt: 'ã', altShift: 'Ã' },
      { key: 's', shift: 'S' },
      { key: 'd', shift: 'D' },
      { key: 'f', shift: 'F' },
      { key: 'g', shift: 'G' },
      { key: 'h', shift: 'H' },
      { key: 'j', shift: 'J' },
      { key: 'k', shift: 'K' },
      { key: 'l', shift: 'L' },
      { key: 'ç', shift: 'Ç' },
    ]},
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Italian Layout
export const italianLayout: KeyboardLayout = {
  id: 'it',
  name: 'Italian',
  nativeName: 'Italiano',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: [
      { key: 'q', shift: 'Q' },
      { key: 'w', shift: 'W' },
      { key: 'e', shift: 'E', alt: 'è', altShift: 'È' },
      { key: 'r', shift: 'R' },
      { key: 't', shift: 'T' },
      { key: 'y', shift: 'Y' },
      { key: 'u', shift: 'U', alt: 'ù', altShift: 'Ù' },
      { key: 'i', shift: 'I', alt: 'ì', altShift: 'Ì' },
      { key: 'o', shift: 'O', alt: 'ò', altShift: 'Ò' },
      { key: 'p', shift: 'P' },
    ]},
    { keys: [
      { key: 'a', shift: 'A', alt: 'à', altShift: 'À' },
      { key: 's', shift: 'S' },
      { key: 'd', shift: 'D' },
      { key: 'f', shift: 'F' },
      { key: 'g', shift: 'G' },
      { key: 'h', shift: 'H' },
      { key: 'j', shift: 'J' },
      { key: 'k', shift: 'K' },
      { key: 'l', shift: 'L' },
    ]},
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Turkish Layout
export const turkishLayout: KeyboardLayout = {
  id: 'tr',
  name: 'Turkish',
  nativeName: 'Türkçe',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: [
      { key: 'q', shift: 'Q' },
      { key: 'w', shift: 'W' },
      { key: 'e', shift: 'E' },
      { key: 'r', shift: 'R' },
      { key: 't', shift: 'T' },
      { key: 'y', shift: 'Y' },
      { key: 'u', shift: 'U' },
      { key: 'ı', shift: 'I' },
      { key: 'o', shift: 'O' },
      { key: 'p', shift: 'P' },
    ]},
    { keys: [
      { key: 'a', shift: 'A' },
      { key: 's', shift: 'S', alt: 'ş', altShift: 'Ş' },
      { key: 'd', shift: 'D' },
      { key: 'f', shift: 'F' },
      { key: 'g', shift: 'G', alt: 'ğ', altShift: 'Ğ' },
      { key: 'h', shift: 'H' },
      { key: 'j', shift: 'J' },
      { key: 'k', shift: 'K' },
      { key: 'l', shift: 'L' },
      { key: 'i', shift: 'İ' },
    ]},
    { keys: [
      { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
      { key: 'z', shift: 'Z' },
      { key: 'x', shift: 'X' },
      { key: 'c', shift: 'C', alt: 'ç', altShift: 'Ç' },
      { key: 'v', shift: 'V' },
      { key: 'b', shift: 'B' },
      { key: 'n', shift: 'N' },
      { key: 'm', shift: 'M' },
      { key: 'ö', shift: 'Ö' },
      { key: 'ü', shift: 'Ü' },
      { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
    ]},
    { keys: qwertyRow4 },
  ],
};

// Vietnamese Layout
export const vietnameseLayout: KeyboardLayout = {
  id: 'vi',
  name: 'Vietnamese',
  nativeName: 'Tiếng Việt',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: [
      { key: 'q', shift: 'Q' },
      { key: 'w', shift: 'W' },
      { key: 'e', shift: 'E', alt: 'ê', altShift: 'Ê' },
      { key: 'r', shift: 'R' },
      { key: 't', shift: 'T' },
      { key: 'y', shift: 'Y' },
      { key: 'u', shift: 'U', alt: 'ư', altShift: 'Ư' },
      { key: 'i', shift: 'I' },
      { key: 'o', shift: 'O', alt: 'ơ', altShift: 'Ơ' },
      { key: 'p', shift: 'P' },
    ]},
    { keys: [
      { key: 'a', shift: 'A', alt: 'ă', altShift: 'Ă' },
      { key: 's', shift: 'S' },
      { key: 'd', shift: 'D', alt: 'đ', altShift: 'Đ' },
      { key: 'f', shift: 'F' },
      { key: 'g', shift: 'G' },
      { key: 'h', shift: 'H' },
      { key: 'j', shift: 'J' },
      { key: 'k', shift: 'K' },
      { key: 'l', shift: 'L' },
      { key: 'â', shift: 'Â' },
    ]},
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Polish Layout
export const polishLayout: KeyboardLayout = {
  id: 'pl',
  name: 'Polish',
  nativeName: 'Polski',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: [
      { key: 'q', shift: 'Q' },
      { key: 'w', shift: 'W' },
      { key: 'e', shift: 'E', alt: 'ę', altShift: 'Ę' },
      { key: 'r', shift: 'R' },
      { key: 't', shift: 'T' },
      { key: 'y', shift: 'Y' },
      { key: 'u', shift: 'U' },
      { key: 'i', shift: 'I' },
      { key: 'o', shift: 'O', alt: 'ó', altShift: 'Ó' },
      { key: 'p', shift: 'P' },
    ]},
    { keys: [
      { key: 'a', shift: 'A', alt: 'ą', altShift: 'Ą' },
      { key: 's', shift: 'S', alt: 'ś', altShift: 'Ś' },
      { key: 'd', shift: 'D' },
      { key: 'f', shift: 'F' },
      { key: 'g', shift: 'G' },
      { key: 'h', shift: 'H' },
      { key: 'j', shift: 'J' },
      { key: 'k', shift: 'K' },
      { key: 'l', shift: 'L', alt: 'ł', altShift: 'Ł' },
    ]},
    { keys: [
      { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
      { key: 'z', shift: 'Z', alt: 'ż', altShift: 'Ż' },
      { key: 'x', shift: 'X', alt: 'ź', altShift: 'Ź' },
      { key: 'c', shift: 'C', alt: 'ć', altShift: 'Ć' },
      { key: 'v', shift: 'V' },
      { key: 'b', shift: 'B' },
      { key: 'n', shift: 'N', alt: 'ń', altShift: 'Ń' },
      { key: 'm', shift: 'M' },
      { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
    ]},
    { keys: qwertyRow4 },
  ],
};

// Indonesian/Malay Layout
export const indonesianLayout: KeyboardLayout = {
  id: 'id',
  name: 'Indonesian',
  nativeName: 'Bahasa Indonesia',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: qwertyRow1 },
    { keys: qwertyRow2 },
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Dutch Layout
export const dutchLayout: KeyboardLayout = {
  id: 'nl',
  name: 'Dutch',
  nativeName: 'Nederlands',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: qwertyRow1 },
    { keys: [...qwertyRow2, { key: 'ij', shift: 'IJ' }] },
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Romanian Layout
export const romanianLayout: KeyboardLayout = {
  id: 'ro',
  name: 'Romanian',
  nativeName: 'Română',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: [
      { key: 'q', shift: 'Q' },
      { key: 'w', shift: 'W' },
      { key: 'e', shift: 'E' },
      { key: 'r', shift: 'R' },
      { key: 't', shift: 'T', alt: 'ț', altShift: 'Ț' },
      { key: 'y', shift: 'Y' },
      { key: 'u', shift: 'U' },
      { key: 'i', shift: 'I', alt: 'î', altShift: 'Î' },
      { key: 'o', shift: 'O' },
      { key: 'p', shift: 'P' },
    ]},
    { keys: [
      { key: 'a', shift: 'A', alt: 'ă', altShift: 'Ă' },
      { key: 's', shift: 'S', alt: 'ș', altShift: 'Ș' },
      { key: 'd', shift: 'D' },
      { key: 'f', shift: 'F' },
      { key: 'g', shift: 'G' },
      { key: 'h', shift: 'H' },
      { key: 'j', shift: 'J' },
      { key: 'k', shift: 'K' },
      { key: 'l', shift: 'L' },
      { key: 'â', shift: 'Â' },
    ]},
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Swedish Layout
export const swedishLayout: KeyboardLayout = {
  id: 'sv',
  name: 'Swedish',
  nativeName: 'Svenska',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: qwertyRow1 },
    { keys: [...qwertyRow2, { key: 'ö', shift: 'Ö' }, { key: 'ä', shift: 'Ä' }] },
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Norwegian Layout
export const norwegianLayout: KeyboardLayout = {
  id: 'no',
  name: 'Norwegian',
  nativeName: 'Norsk',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: qwertyRow1 },
    { keys: [...qwertyRow2, { key: 'ø', shift: 'Ø' }, { key: 'æ', shift: 'Æ' }] },
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Danish Layout
export const danishLayout: KeyboardLayout = {
  id: 'da',
  name: 'Danish',
  nativeName: 'Dansk',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: qwertyRow1 },
    { keys: [...qwertyRow2, { key: 'æ', shift: 'Æ' }, { key: 'ø', shift: 'Ø' }] },
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Finnish Layout
export const finnishLayout: KeyboardLayout = {
  id: 'fi',
  name: 'Finnish',
  nativeName: 'Suomi',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  rows: [
    { keys: qwertyRow1 },
    { keys: [...qwertyRow2, { key: 'ö', shift: 'Ö' }, { key: 'ä', shift: 'Ä' }] },
    { keys: qwertyRow3 },
    { keys: qwertyRow4 },
  ],
};

// Czech Layout
export const czechLayout: KeyboardLayout = {
  id: 'cs',
  name: 'Czech',
  nativeName: 'Čeština',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: [
      { key: 'q', shift: 'Q' },
      { key: 'w', shift: 'W' },
      { key: 'e', shift: 'E', alt: 'ě', altShift: 'Ě' },
      { key: 'r', shift: 'R', alt: 'ř', altShift: 'Ř' },
      { key: 't', shift: 'T', alt: 'ť', altShift: 'Ť' },
      { key: 'y', shift: 'Y', alt: 'ý', altShift: 'Ý' },
      { key: 'u', shift: 'U', alt: 'ú', altShift: 'Ú' },
      { key: 'i', shift: 'I', alt: 'í', altShift: 'Í' },
      { key: 'o', shift: 'O', alt: 'ó', altShift: 'Ó' },
      { key: 'p', shift: 'P' },
    ]},
    { keys: [
      { key: 'a', shift: 'A', alt: 'á', altShift: 'Á' },
      { key: 's', shift: 'S', alt: 'š', altShift: 'Š' },
      { key: 'd', shift: 'D', alt: 'ď', altShift: 'Ď' },
      { key: 'f', shift: 'F' },
      { key: 'g', shift: 'G' },
      { key: 'h', shift: 'H' },
      { key: 'j', shift: 'J' },
      { key: 'k', shift: 'K' },
      { key: 'l', shift: 'L' },
      { key: 'ů', shift: 'Ů' },
    ]},
    { keys: [
      { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
      { key: 'z', shift: 'Z', alt: 'ž', altShift: 'Ž' },
      { key: 'x', shift: 'X' },
      { key: 'c', shift: 'C', alt: 'č', altShift: 'Č' },
      { key: 'v', shift: 'V' },
      { key: 'b', shift: 'B' },
      { key: 'n', shift: 'N', alt: 'ň', altShift: 'Ň' },
      { key: 'm', shift: 'M' },
      { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
    ]},
    { keys: qwertyRow4 },
  ],
};

// Hungarian Layout
export const hungarianLayout: KeyboardLayout = {
  id: 'hu',
  name: 'Hungarian',
  nativeName: 'Magyar',
  script: 'latin',
  direction: 'ltr',
  hasShift: true,
  hasAlt: true,
  rows: [
    { keys: [
      { key: 'q', shift: 'Q' },
      { key: 'w', shift: 'W' },
      { key: 'e', shift: 'E', alt: 'é', altShift: 'É' },
      { key: 'r', shift: 'R' },
      { key: 't', shift: 'T' },
      { key: 'z', shift: 'Z' },
      { key: 'u', shift: 'U', alt: 'ú', altShift: 'Ú' },
      { key: 'i', shift: 'I', alt: 'í', altShift: 'Í' },
      { key: 'o', shift: 'O', alt: 'ó', altShift: 'Ó' },
      { key: 'p', shift: 'P' },
    ]},
    { keys: [
      { key: 'a', shift: 'A', alt: 'á', altShift: 'Á' },
      { key: 's', shift: 'S' },
      { key: 'd', shift: 'D' },
      { key: 'f', shift: 'F' },
      { key: 'g', shift: 'G' },
      { key: 'h', shift: 'H' },
      { key: 'j', shift: 'J' },
      { key: 'k', shift: 'K' },
      { key: 'l', shift: 'L' },
      { key: 'ö', shift: 'Ö', alt: 'ő', altShift: 'Ő' },
      { key: 'ü', shift: 'Ü', alt: 'ű', altShift: 'Ű' },
    ]},
    { keys: [
      { key: '⇧', type: 'modifier', width: 1.5, label: 'Shift' },
      { key: 'y', shift: 'Y' },
      { key: 'x', shift: 'X' },
      { key: 'c', shift: 'C' },
      { key: 'v', shift: 'V' },
      { key: 'b', shift: 'B' },
      { key: 'n', shift: 'N' },
      { key: 'm', shift: 'M' },
      { key: '⌫', type: 'action', width: 1.5, label: 'Delete' },
    ]},
    { keys: qwertyRow4 },
  ],
};

export const latinLayouts = {
  en: englishLayout,
  es: spanishLayout,
  fr: frenchLayout,
  de: germanLayout,
  pt: portugueseLayout,
  it: italianLayout,
  tr: turkishLayout,
  vi: vietnameseLayout,
  pl: polishLayout,
  id: indonesianLayout,
  nl: dutchLayout,
  ro: romanianLayout,
  sv: swedishLayout,
  no: norwegianLayout,
  da: danishLayout,
  fi: finnishLayout,
  cs: czechLayout,
  hu: hungarianLayout,
};

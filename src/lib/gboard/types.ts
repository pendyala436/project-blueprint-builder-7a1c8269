/**
 * GBoard TypeScript Implementation
 * Inspired by: https://github.com/ManDay/gboard
 * 
 * Flexible on-screen keyboard supporting 200+ languages
 */

export interface KeyDefinition {
  key: string;           // Primary character
  shift?: string;        // Shift character
  alt?: string;          // Alt/Option character
  altShift?: string;     // Alt+Shift character
  width?: number;        // Key width multiplier (default: 1)
  type?: 'char' | 'modifier' | 'action' | 'space';
  label?: string;        // Display label (if different from key)
}

export interface KeyboardRow {
  keys: KeyDefinition[];
}

export interface KeyboardLayout {
  id: string;
  name: string;
  nativeName: string;
  script: ScriptType;
  direction: 'ltr' | 'rtl';
  rows: KeyboardRow[];
  hasShift?: boolean;
  hasAlt?: boolean;
}

export type ScriptType = 
  | 'latin'
  | 'devanagari'
  | 'arabic'
  | 'cyrillic'
  | 'greek'
  | 'hebrew'
  | 'bengali'
  | 'tamil'
  | 'telugu'
  | 'kannada'
  | 'malayalam'
  | 'gujarati'
  | 'punjabi'
  | 'gurmukhi'
  | 'odia'
  | 'thai'
  | 'khmer'
  | 'myanmar'
  | 'lao'
  | 'tibetan'
  | 'georgian'
  | 'armenian'
  | 'ethiopic'
  | 'hangul'
  | 'hiragana'
  | 'katakana'
  | 'bopomofo'
  | 'sinhala'
  | 'mongolian'
  | 'han'
  | 'chakma'
  | 'ol-chiki'
  | 'meitei'
  | 'thaana'
  | 'tifinagh'
  | 'cherokee'
  | 'canadian-aboriginal'
  | 'lepcha'
  | 'warang-citi';

export interface GBoardState {
  isOpen: boolean;
  currentLayout: string;
  shiftActive: boolean;
  altActive: boolean;
  capsLock: boolean;
}

export interface GBoardConfig {
  defaultLayout?: string;
  theme?: 'light' | 'dark' | 'system';
  size?: 'small' | 'medium' | 'large';
  hapticFeedback?: boolean;
  soundFeedback?: boolean;
  autoCapitalize?: boolean;
  showSuggestions?: boolean;
}

// Language to layout mapping
export interface LanguageMapping {
  code: string;
  name: string;
  nativeName: string;
  script: ScriptType;
  layoutId: string;
}

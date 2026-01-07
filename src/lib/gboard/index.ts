/**
 * GBoard - Lightweight On-Screen Keyboard
 * ========================================
 * Inspired by: https://github.com/ManDay/gboard
 * 
 * A flexible, multi-language virtual keyboard supporting 200+ languages
 * with proper script support for Latin, Devanagari, Arabic, Cyrillic,
 * CJK, and many other writing systems.
 * 
 * Features:
 * - 200+ language layouts
 * - RTL/LTR support
 * - Shift and Alt modifiers
 * - Custom key actions
 * - Mobile-friendly design
 * - Theming support
 * 
 * @example
 * ```tsx
 * import { GBoard, useGBoard } from '@/lib/gboard';
 * 
 * function ChatInput() {
 *   const { isOpen, toggle, currentLayout } = useGBoard({
 *     defaultLayout: 'hi', // Hindi
 *   });
 * 
 *   return (
 *     <div>
 *       <input />
 *       <button onClick={toggle}>⌨️</button>
 *       {isOpen && <GBoard layout={currentLayout} onKeyPress={handleKey} />}
 *     </div>
 *   );
 * }
 * ```
 */

// Types
export type {
  KeyDefinition,
  KeyboardRow,
  KeyboardLayout,
  ScriptType,
  GBoardState,
  GBoardConfig,
  LanguageMapping,
} from './types';

// Layouts
export {
  allLayouts,
  languageMappings,
  getLayoutForLanguage,
  getSupportedLanguages,
  searchLanguages,
  latinLayouts,
  devanagariLayouts,
  indicLayouts,
  arabicLayouts,
  cyrillicLayouts,
  asianLayouts,
  cjkLayouts,
  otherLayouts,
} from './layouts';

// React Components and Hooks (will be created separately)
// export { GBoard } from '@/components/GBoard';
// export { useGBoard } from '@/hooks/useGBoard';

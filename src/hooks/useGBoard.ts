/**
 * useGBoard Hook
 * Manages GBoard keyboard state and operations
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  GBoardState, 
  GBoardConfig, 
  KeyboardLayout,
  KeyDefinition 
} from '@/lib/gboard/types';
import { getLayoutForLanguage, allLayouts } from '@/lib/gboard/layouts';

interface UseGBoardOptions extends GBoardConfig {
  onKeyPress?: (key: string) => void;
  onBackspace?: () => void;
  onEnter?: () => void;
  onLanguageChange?: (layoutId: string) => void;
}

interface UseGBoardReturn {
  // State
  isOpen: boolean;
  currentLayout: KeyboardLayout;
  shiftActive: boolean;
  altActive: boolean;
  capsLock: boolean;
  
  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  setLayout: (layoutId: string) => void;
  setLayoutByLanguage: (languageCode: string) => void;
  toggleShift: () => void;
  toggleAlt: () => void;
  toggleCapsLock: () => void;
  handleKeyPress: (keyDef: KeyDefinition) => void;
  
  // Helpers
  getDisplayKey: (keyDef: KeyDefinition) => string;
  availableLayouts: string[];
}

export function useGBoard(options: UseGBoardOptions = {}): UseGBoardReturn {
  const {
    defaultLayout = 'en',
    onKeyPress,
    onBackspace,
    onEnter,
    onLanguageChange,
  } = options;

  const [state, setState] = useState<GBoardState>({
    isOpen: false,
    currentLayout: defaultLayout,
    shiftActive: false,
    altActive: false,
    capsLock: false,
  });

  // Get current layout object
  const currentLayout = useMemo(() => {
    return allLayouts[state.currentLayout] || allLayouts['en'];
  }, [state.currentLayout]);

  // Available layout IDs
  const availableLayouts = useMemo(() => Object.keys(allLayouts), []);

  // Open keyboard
  const open = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }));
  }, []);

  // Close keyboard
  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Toggle keyboard
  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  // Set layout by ID
  const setLayout = useCallback((layoutId: string) => {
    if (allLayouts[layoutId]) {
      setState(prev => ({ ...prev, currentLayout: layoutId }));
      onLanguageChange?.(layoutId);
    }
  }, [onLanguageChange]);

  // Set layout by language code
  const setLayoutByLanguage = useCallback((languageCode: string) => {
    const layout = getLayoutForLanguage(languageCode);
    if (layout) {
      setState(prev => ({ ...prev, currentLayout: layout.id }));
      onLanguageChange?.(layout.id);
    }
  }, [onLanguageChange]);

  // Toggle shift
  const toggleShift = useCallback(() => {
    setState(prev => ({ ...prev, shiftActive: !prev.shiftActive }));
  }, []);

  // Toggle alt
  const toggleAlt = useCallback(() => {
    setState(prev => ({ ...prev, altActive: !prev.altActive }));
  }, []);

  // Toggle caps lock
  const toggleCapsLock = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      capsLock: !prev.capsLock,
      shiftActive: !prev.capsLock 
    }));
  }, []);

  // Get display key based on current modifiers
  const getDisplayKey = useCallback((keyDef: KeyDefinition): string => {
    if (keyDef.type === 'modifier' || keyDef.type === 'action' || keyDef.type === 'space') {
      return keyDef.label || keyDef.key;
    }

    const { shiftActive, altActive } = state;
    
    if (altActive && shiftActive && keyDef.altShift) {
      return keyDef.altShift;
    }
    if (altActive && keyDef.alt) {
      return keyDef.alt;
    }
    if (shiftActive && keyDef.shift) {
      return keyDef.shift;
    }
    
    return keyDef.key;
  }, [state.shiftActive, state.altActive]);

  // Handle key press
  const handleKeyPress = useCallback((keyDef: KeyDefinition) => {
    const { type, key } = keyDef;

    switch (type) {
      case 'modifier':
        if (key === '⇧' || key === 'Shift') {
          toggleShift();
        } else if (key === '🌐' || key === 'Lang') {
          // Cycle through layouts or show language picker
          const currentIndex = availableLayouts.indexOf(state.currentLayout);
          const nextIndex = (currentIndex + 1) % Math.min(availableLayouts.length, 10); // Limit cycling
          setLayout(availableLayouts[nextIndex]);
        } else if (key === 'Alt') {
          toggleAlt();
        } else if (key === '123') {
          // TODO: Switch to numeric/symbol layout
        }
        break;
        
      case 'action':
        if (key === '⌫' || key === 'Delete' || key === 'Backspace') {
          onBackspace?.();
        } else if (key === '↵' || key === 'Return' || key === 'Enter') {
          onEnter?.();
        }
        break;
        
      case 'space':
        onKeyPress?.(' ');
        break;
        
      default:
        // Regular character key
        const displayKey = getDisplayKey(keyDef);
        onKeyPress?.(displayKey);
        
        // Auto-release shift after typing (unless caps lock)
        if (state.shiftActive && !state.capsLock) {
          setState(prev => ({ ...prev, shiftActive: false }));
        }
        break;
    }
  }, [
    state.currentLayout,
    state.shiftActive,
    state.capsLock,
    availableLayouts,
    getDisplayKey,
    toggleShift,
    toggleAlt,
    setLayout,
    onKeyPress,
    onBackspace,
    onEnter,
  ]);

  return {
    // State
    isOpen: state.isOpen,
    currentLayout,
    shiftActive: state.shiftActive,
    altActive: state.altActive,
    capsLock: state.capsLock,
    
    // Actions
    open,
    close,
    toggle,
    setLayout,
    setLayoutByLanguage,
    toggleShift,
    toggleAlt,
    toggleCapsLock,
    handleKeyPress,
    
    // Helpers
    getDisplayKey,
    availableLayouts,
  };
}

export default useGBoard;

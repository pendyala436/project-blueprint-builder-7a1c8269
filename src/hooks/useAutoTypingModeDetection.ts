/**
 * Auto Typing Mode Detection Hook
 * ================================
 * 
 * Detects keyboard input type and automatically switches typing mode:
 * 1. If user types in native script (e.g., Gboard Hindi keyboard) → Switch to 'native' mode
 * 2. If user types in Latin/English → Keep current mode or switch based on context
 * 
 * Priority: External keyboard (Gboard native) > Manual mode selection
 * 
 * Detection logic:
 * - Analyzes first few characters of input
 * - Detects Unicode script ranges (Devanagari, Arabic, CJK, etc.)
 * - If non-Latin script detected, auto-switches to 'native' mode
 * - If Latin detected after native, keeps mode (user might be typing English words)
 */

import { useCallback, useRef, useState } from 'react';
import { TypingMode } from '@/components/chat/TypingModeSelector';

// Unicode ranges for common scripts
const SCRIPT_RANGES = {
  // Latin scripts
  latin: /[\u0041-\u007A\u00C0-\u024F\u1E00-\u1EFF]/,
  
  // Indic scripts
  devanagari: /[\u0900-\u097F]/,      // Hindi, Marathi, Sanskrit
  bengali: /[\u0980-\u09FF]/,          // Bengali, Assamese
  gurmukhi: /[\u0A00-\u0A7F]/,         // Punjabi
  gujarati: /[\u0A80-\u0AFF]/,         // Gujarati
  oriya: /[\u0B00-\u0B7F]/,            // Odia
  tamil: /[\u0B80-\u0BFF]/,            // Tamil
  telugu: /[\u0C00-\u0C7F]/,           // Telugu
  kannada: /[\u0C80-\u0CFF]/,          // Kannada
  malayalam: /[\u0D00-\u0D7F]/,        // Malayalam
  sinhala: /[\u0D80-\u0DFF]/,          // Sinhala
  
  // Middle Eastern
  arabic: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/,
  hebrew: /[\u0590-\u05FF]/,
  persian: /[\u0600-\u06FF]/,
  
  // East Asian
  chinese: /[\u4E00-\u9FFF\u3400-\u4DBF]/,
  japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
  korean: /[\uAC00-\uD7AF\u1100-\u11FF]/,
  
  // Southeast Asian
  thai: /[\u0E00-\u0E7F]/,
  lao: /[\u0E80-\u0EFF]/,
  myanmar: /[\u1000-\u109F]/,
  khmer: /[\u1780-\u17FF]/,
  
  // Other
  cyrillic: /[\u0400-\u04FF\u0500-\u052F]/,
  greek: /[\u0370-\u03FF\u1F00-\u1FFF]/,
  armenian: /[\u0530-\u058F]/,
  georgian: /[\u10A0-\u10FF]/,
  ethiopic: /[\u1200-\u137F]/,
};

export interface DetectionResult {
  detectedScript: string;
  isNativeScript: boolean;
  isLatinScript: boolean;
  suggestedMode: TypingMode;
  confidence: number;
}

interface UseAutoTypingModeDetectionOptions {
  userLanguage: string;
  currentMode: TypingMode;
  onModeChange: (mode: TypingMode) => void;
  enabled?: boolean;
  autoSwitchEnabled?: boolean;
  minCharsToDetect?: number;
}

/**
 * Detect the primary script in given text
 */
export const detectScript = (text: string): { script: string; isLatin: boolean } => {
  if (!text || text.trim().length === 0) {
    return { script: 'unknown', isLatin: true };
  }

  // Count characters per script
  const scriptCounts: Record<string, number> = {};
  let totalScriptChars = 0;

  for (const char of text) {
    // Skip whitespace, numbers, punctuation
    if (/[\s\d\p{P}]/u.test(char)) continue;

    for (const [scriptName, regex] of Object.entries(SCRIPT_RANGES)) {
      if (regex.test(char)) {
        scriptCounts[scriptName] = (scriptCounts[scriptName] || 0) + 1;
        totalScriptChars++;
        break;
      }
    }
  }

  if (totalScriptChars === 0) {
    return { script: 'unknown', isLatin: true };
  }

  // Find dominant script
  let dominantScript = 'latin';
  let maxCount = 0;

  for (const [script, count] of Object.entries(scriptCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantScript = script;
    }
  }

  return {
    script: dominantScript,
    isLatin: dominantScript === 'latin',
  };
};

/**
 * Check if text contains significant native (non-Latin) script
 */
export const hasNativeScript = (text: string): boolean => {
  if (!text) return false;
  
  const { isLatin } = detectScript(text);
  return !isLatin;
};

/**
 * Hook for auto-detecting typing mode based on input script
 */
export const useAutoTypingModeDetection = ({
  userLanguage,
  currentMode,
  onModeChange,
  enabled = true,
  autoSwitchEnabled = true,
  minCharsToDetect = 2,
}: UseAutoTypingModeDetectionOptions) => {
  const [lastDetection, setLastDetection] = useState<DetectionResult | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const lastInputRef = useRef<string>('');
  const modeLockedRef = useRef(false);

  /**
   * Analyze input and determine if mode switch is needed
   */
  const analyzeInput = useCallback((input: string): DetectionResult => {
    const { script, isLatin } = detectScript(input);
    
    let suggestedMode: TypingMode = 'english-meaning';
    let confidence = 1;

    // Always use english-meaning mode
    return {
      detectedScript: script,
      isNativeScript: !isLatin,
      isLatinScript: isLatin,
      suggestedMode,
      confidence,
    };
  }, []);

  /**
   * Handle input change and detect script
   */
  const handleInputChange = useCallback((input: string) => {
    if (!enabled || !autoSwitchEnabled) return;
    if (modeLockedRef.current) return;

    // Only analyze if input changed significantly
    if (input === lastInputRef.current) return;
    lastInputRef.current = input;

    // Don't analyze empty or very short input
    if (input.trim().length < minCharsToDetect) return;

    const detection = analyzeInput(input);
    setLastDetection(detection);

    // Auto-switch disabled - single mode only
  }, [enabled, autoSwitchEnabled, analyzeInput]);

  /**
   * Lock mode to prevent auto-switching (user manually selected)
   */
  const lockMode = useCallback(() => {
    modeLockedRef.current = true;
    setIsAutoMode(false);
  }, []);

  /**
   * Unlock mode to allow auto-switching
   */
  const unlockMode = useCallback(() => {
    modeLockedRef.current = false;
  }, []);

  /**
   * Reset detection state
   */
  const resetDetection = useCallback(() => {
    lastInputRef.current = '';
    setLastDetection(null);
    modeLockedRef.current = false;
    setIsAutoMode(false);
  }, []);

  /**
   * Manual mode change (locks auto-switching temporarily)
   */
  const manualModeChange = useCallback((mode: TypingMode) => {
    lockMode();
    onModeChange(mode);
    
    // Unlock after 5 seconds to allow auto-detection again
    setTimeout(() => {
      unlockMode();
    }, 5000);
  }, [lockMode, unlockMode, onModeChange]);

  return {
    // Core detection
    handleInputChange,
    lastDetection,
    isAutoMode,
    
    // Mode control
    manualModeChange,
    lockMode,
    unlockMode,
    resetDetection,
    
    // Utilities
    detectScript,
    hasNativeScript,
  };
};

export default useAutoTypingModeDetection;

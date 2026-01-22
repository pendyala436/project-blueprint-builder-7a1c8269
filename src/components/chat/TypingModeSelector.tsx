/**
 * Typing Mode Selector
 * ====================
 * 
 * Allows users to choose between 3 typing modes:
 * 1. Native Mode - Type in mother tongue (native/Latin script)
 * 2. English Core - Type English, display English, receiver sees native
 * 3. English (Meaning-Based) - Type English, preview/display as native translation
 * 
 * AUTO-DETECTION: Detects Gboard/external keyboard input and switches mode automatically
 * Priority: External keyboard native input > Manual selection
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  Languages, 
  Globe, 
  MessageSquareText, 
  Check, 
  ChevronDown,
  Pencil,
  Save,
  Wand2,
  Keyboard
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

// The 3 typing modes
export type TypingMode = 'native' | 'english-core' | 'english-meaning';

export interface TypingModeInfo {
  id: TypingMode;
  name: string;
  description: string;
  icon: React.ReactNode;
  preview: string;
  afterSend: string;
  receiverSees: string;
}

interface TypingModeSelectorProps {
  currentMode: TypingMode;
  onModeChange: (mode: TypingMode) => void;
  userLanguage: string;
  receiverLanguage?: string;
  compact?: boolean;
  className?: string;
  showAutoDetect?: boolean;
  isAutoMode?: boolean;
}

// Storage keys for persisting mode and auto-detect preference
const TYPING_MODE_STORAGE_KEY = 'chat_typing_mode';
const AUTO_DETECT_STORAGE_KEY = 'chat_auto_detect_mode';

/**
 * Get saved typing mode from localStorage
 * Default: english-meaning (Type English → display as native)
 */
export const getSavedTypingMode = (): TypingMode => {
  try {
    const saved = localStorage.getItem(TYPING_MODE_STORAGE_KEY);
    if (saved && ['native', 'english-core', 'english-meaning'].includes(saved)) {
      return saved as TypingMode;
    }
  } catch (e) {
    console.error('[TypingModeSelector] Error reading saved mode:', e);
  }
  return 'english-meaning'; // Default: Type English, display as native
};

/**
 * Save typing mode to localStorage
 */
export const saveTypingMode = (mode: TypingMode): void => {
  try {
    localStorage.setItem(TYPING_MODE_STORAGE_KEY, mode);
  } catch (e) {
    console.error('[TypingModeSelector] Error saving mode:', e);
  }
};

/**
 * Get auto-detect preference
 */
export const getAutoDetectEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(AUTO_DETECT_STORAGE_KEY);
    return saved !== 'false'; // Default: enabled
  } catch (e) {
    return true;
  }
};

/**
 * Save auto-detect preference
 */
export const saveAutoDetectEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(AUTO_DETECT_STORAGE_KEY, String(enabled));
  } catch (e) {
    console.error('[TypingModeSelector] Error saving auto-detect:', e);
  }
};

// Unicode ranges for script detection
const SCRIPT_RANGES = {
  latin: /[\u0041-\u007A\u00C0-\u024F\u1E00-\u1EFF]/,
  devanagari: /[\u0900-\u097F]/,
  bengali: /[\u0980-\u09FF]/,
  gurmukhi: /[\u0A00-\u0A7F]/,
  gujarati: /[\u0A80-\u0AFF]/,
  oriya: /[\u0B00-\u0B7F]/,
  tamil: /[\u0B80-\u0BFF]/,
  telugu: /[\u0C00-\u0C7F]/,
  kannada: /[\u0C80-\u0CFF]/,
  malayalam: /[\u0D00-\u0D7F]/,
  arabic: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/,
  hebrew: /[\u0590-\u05FF]/,
  chinese: /[\u4E00-\u9FFF\u3400-\u4DBF]/,
  japanese: /[\u3040-\u309F\u30A0-\u30FF]/,
  korean: /[\uAC00-\uD7AF\u1100-\u11FF]/,
  thai: /[\u0E00-\u0E7F]/,
  cyrillic: /[\u0400-\u04FF]/,
  greek: /[\u0370-\u03FF]/,
};

/**
 * Detect if text contains non-Latin (native) script
 */
export const detectNativeScript = (text: string): { isNative: boolean; script: string } => {
  if (!text || text.trim().length === 0) {
    return { isNative: false, script: 'latin' };
  }

  for (const [scriptName, regex] of Object.entries(SCRIPT_RANGES)) {
    if (scriptName === 'latin') continue;
    
    const matches = text.match(regex);
    if (matches && matches.length >= 2) {
      return { isNative: true, script: scriptName };
    }
  }

  return { isNative: false, script: 'latin' };
};

/**
 * Hook to manage typing mode with persistence and auto-detection
 * 
 * Auto-detection logic:
 * - If user types native script (Gboard, etc.) → Switch to 'native' mode
 * - If user types Latin/English after being in native → Switch to 'english-meaning' (default)
 * - Default mode: 'english-meaning'
 */
export const useTypingMode = () => {
  const [mode, setModeState] = useState<TypingMode>(() => getSavedTypingMode());
  const [autoDetectEnabled, setAutoDetectEnabledState] = useState(() => getAutoDetectEnabled());
  const [isAutoMode, setIsAutoMode] = useState(false);
  const lastManualModeRef = useRef<TypingMode>(mode);
  const modeLockedUntilRef = useRef<number>(0);
  const lastDetectedScriptRef = useRef<'latin' | 'native'>('latin');

  const setMode = useCallback((newMode: TypingMode, isAuto = false) => {
    setModeState(newMode);
    saveTypingMode(newMode);
    setIsAutoMode(isAuto);
    
    if (!isAuto) {
      lastManualModeRef.current = newMode;
      // Lock auto-detection for 3 seconds after manual change
      modeLockedUntilRef.current = Date.now() + 3000;
    }
  }, []);

  const setAutoDetect = useCallback((enabled: boolean) => {
    setAutoDetectEnabledState(enabled);
    saveAutoDetectEnabled(enabled);
  }, []);

  /**
   * Handle input and auto-detect script to switch mode
   * - Native script → 'native' mode
   * - Latin script (when in native mode) → 'english-meaning' mode (default)
   */
  const handleInputForAutoDetect = useCallback((input: string) => {
    if (!autoDetectEnabled) return;
    if (Date.now() < modeLockedUntilRef.current) return;
    if (input.trim().length < 2) return;

    const { isNative, script } = detectNativeScript(input);
    
    // Detect script change and switch mode accordingly
    if (isNative) {
      // Native script detected (Gboard native keyboard, etc.)
      if (mode !== 'native') {
        console.log('[TypingMode] Auto-detected native script:', script, '→ switching to native mode');
        setModeState('native');
        saveTypingMode('native');
        setIsAutoMode(true);
      }
      lastDetectedScriptRef.current = 'native';
    } else {
      // Latin/English detected
      if (lastDetectedScriptRef.current === 'native' && mode === 'native') {
        // User switched from native keyboard to Latin - switch to default English mode
        console.log('[TypingMode] Auto-detected Latin input after native → switching to english-meaning');
        setModeState('english-meaning');
        saveTypingMode('english-meaning');
        setIsAutoMode(true);
      }
      lastDetectedScriptRef.current = 'latin';
    }
  }, [autoDetectEnabled, mode]);

  /**
   * Reset to last manual mode
   */
  const resetToManualMode = useCallback(() => {
    if (isAutoMode) {
      setModeState(lastManualModeRef.current);
      saveTypingMode(lastManualModeRef.current);
      setIsAutoMode(false);
    }
  }, [isAutoMode]);

  /**
   * Reset detection state (call when input is cleared)
   */
  const resetDetection = useCallback(() => {
    lastDetectedScriptRef.current = 'latin';
  }, []);

  return { 
    mode, 
    setMode, 
    autoDetectEnabled, 
    setAutoDetect, 
    isAutoMode,
    handleInputForAutoDetect,
    resetToManualMode,
    resetDetection,
  };
};

export const TypingModeSelector: React.FC<TypingModeSelectorProps> = memo(({
  currentMode,
  onModeChange,
  userLanguage,
  receiverLanguage = 'their language',
  compact = false,
  className,
  showAutoDetect = true,
  isAutoMode = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [autoDetect, setAutoDetect] = useState(() => getAutoDetectEnabled());

  // Define the 3 modes with their behaviors
  const modes: TypingModeInfo[] = [
    {
      id: 'native',
      name: t('chat.mode.native', 'Type in Mother Tongue'),
      description: t('chat.mode.nativeDesc', 'Type using your native language keyboard or Latin letters'),
      icon: <Languages className="h-4 w-4" />,
      preview: `Shows in ${userLanguage}`,
      afterSend: `You see: ${userLanguage}`,
      receiverSees: `Partner sees: ${receiverLanguage}`,
    },
    {
      id: 'english-core',
      name: t('chat.mode.englishCore', 'Type & See English'),
      description: t('chat.mode.englishCoreDesc', 'You type and see English, partner sees their language'),
      icon: <Globe className="h-4 w-4" />,
      preview: 'Shows in English',
      afterSend: 'You see: English',
      receiverSees: `Partner sees: ${receiverLanguage}`,
    },
    {
      id: 'english-meaning',
      name: t('chat.mode.englishMeaning', 'Type English → Show Native'),
      description: t('chat.mode.englishMeaningDesc', 'Type in English, message displays in your native language'),
      icon: <MessageSquareText className="h-4 w-4" />,
      preview: `Shows in ${userLanguage}`,
      afterSend: `You see: ${userLanguage}`,
      receiverSees: `Partner sees: ${receiverLanguage}`,
    },
  ];

  const currentModeInfo = modes.find(m => m.id === currentMode) || modes[0];

  const handleSelectMode = useCallback((mode: TypingMode) => {
    onModeChange(mode);
    setIsOpen(false);
  }, [onModeChange]);

  const handleAutoDetectToggle = useCallback((enabled: boolean) => {
    setAutoDetect(enabled);
    saveAutoDetectEnabled(enabled);
  }, []);

  if (compact) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 px-3 gap-2 text-xs',
              isAutoMode && 'ring-1 ring-primary/50',
              className
            )}
          >
            {isAutoMode ? <Wand2 className="h-3.5 w-3.5 text-primary" /> : currentModeInfo.icon}
            <span className="hidden sm:inline">{currentModeInfo.name}</span>
            {isAutoMode && <Badge variant="secondary" className="h-4 text-[9px] px-1">AUTO</Badge>}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-80 bg-popover border border-border shadow-xl z-[10000]"
          sideOffset={5}
        >
          {/* Auto-detect toggle */}
          {showAutoDetect && (
            <>
              <div className="p-3 flex items-center justify-between gap-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      {t('chat.autoDetect', 'Auto-detect Keyboard')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('chat.autoDetectDesc', 'Switch mode when Gboard/native keyboard detected')}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={autoDetect}
                  onCheckedChange={handleAutoDetectToggle}
                />
              </div>
            </>
          )}
          
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('chat.selectTypingMode', 'Select Typing Mode')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {modes.map((mode) => (
            <DropdownMenuItem
              key={mode.id}
              onClick={() => handleSelectMode(mode.id)}
              className={cn(
                'flex items-start gap-3 p-3 cursor-pointer',
                currentMode === mode.id && 'bg-primary/10'
              )}
            >
              <div className="flex-shrink-0 mt-0.5">{mode.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{mode.name}</span>
                  {currentMode === mode.id && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                  {isAutoMode && currentMode === mode.id && (
                    <Badge variant="outline" className="h-4 text-[9px] px-1">Auto</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mode.description}
                </p>
                <div className="text-xs text-muted-foreground/70 mt-1.5 space-y-0.5">
                  <div>Preview: <span className="text-foreground/80">{mode.preview}</span></div>
                  <div>After Send: <span className="text-foreground/80">{mode.afterSend}</span></div>
                  <div>Receiver: <span className="text-foreground/80">{mode.receiverSees}</span></div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Full mode selector (for settings panel)
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {t('chat.typingMode', 'Typing Mode')}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Pencil className="h-3 w-3" />
          {t('common.edit', 'Edit')}
        </Button>
      </div>

      {/* Current mode display */}
      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            {currentModeInfo.icon}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{currentModeInfo.name}</div>
            <p className="text-xs text-muted-foreground">{currentModeInfo.description}</p>
          </div>
          <Check className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Mode selection grid */}
      {isOpen && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleSelectMode(mode.id)}
              className={cn(
                'w-full p-3 rounded-lg border text-left transition-all',
                currentMode === mode.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-md',
                  currentMode === mode.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {mode.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{mode.name}</span>
                    {currentMode === mode.id && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mode.description}
                  </p>
                  
                  {/* Behavior breakdown */}
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="p-1.5 rounded bg-muted/50">
                      <div className="text-muted-foreground">Preview</div>
                      <div className="font-medium truncate">{mode.preview}</div>
                    </div>
                    <div className="p-1.5 rounded bg-muted/50">
                      <div className="text-muted-foreground">Send</div>
                      <div className="font-medium truncate">{mode.afterSend}</div>
                    </div>
                    <div className="p-1.5 rounded bg-muted/50">
                      <div className="text-muted-foreground">Receiver</div>
                      <div className="font-medium truncate">{mode.receiverSees}</div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
          
          <Button 
            onClick={() => setIsOpen(false)} 
            className="w-full mt-2 gap-2"
            size="sm"
          >
            <Save className="h-3.5 w-3.5" />
            {t('common.save', 'Save')}
          </Button>
        </div>
      )}
    </div>
  );
});

TypingModeSelector.displayName = 'TypingModeSelector';

export default TypingModeSelector;

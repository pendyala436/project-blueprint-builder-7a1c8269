/**
 * Typing Mode Selector
 * ====================
 * 
 * Allows users to choose between 3 typing modes:
 * 1. Native Mode - Type in mother tongue (native/Latin script)
 * 2. English Core - Type English, display English, receiver sees native
 * 3. English (Meaning-Based) - Type English, preview/display as native translation
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
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
  Save
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

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
}

// Storage key for persisting mode
const TYPING_MODE_STORAGE_KEY = 'chat_typing_mode';

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
 * Hook to manage typing mode with persistence
 */
export const useTypingMode = () => {
  const [mode, setMode] = useState<TypingMode>(() => getSavedTypingMode());

  const changeMode = useCallback((newMode: TypingMode) => {
    setMode(newMode);
    saveTypingMode(newMode);
  }, []);

  return { mode, setMode: changeMode };
};

export const TypingModeSelector: React.FC<TypingModeSelectorProps> = memo(({
  currentMode,
  onModeChange,
  userLanguage,
  receiverLanguage = 'their language',
  compact = false,
  className,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

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

  if (compact) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 px-3 gap-2 text-xs',
              className
            )}
          >
            {currentModeInfo.icon}
            <span className="hidden sm:inline">{currentModeInfo.name}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-72 bg-popover border border-border shadow-lg z-50"
        >
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

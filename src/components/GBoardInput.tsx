/**
 * GBoardInput Component
 * Chat input with integrated on-screen keyboard
 */

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GBoard } from './GBoard';
import { useGBoard } from '@/hooks/useGBoard';
import { Send, Keyboard, X } from 'lucide-react';

interface GBoardInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  language?: string;
  className?: string;
  showKeyboardToggle?: boolean;
}

export const GBoardInput = memo(({
  value,
  onChange,
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  language = 'en',
  className,
  showKeyboardToggle = true,
}: GBoardInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Handle key press from virtual keyboard
  const handleKeyPress = useCallback((key: string) => {
    const before = value.slice(0, cursorPosition);
    const after = value.slice(cursorPosition);
    const newValue = before + key + after;
    onChange(newValue);
    setCursorPosition(cursorPosition + key.length);
  }, [value, cursorPosition, onChange]);

  // Handle backspace
  const handleBackspace = useCallback(() => {
    if (cursorPosition > 0) {
      const before = value.slice(0, cursorPosition - 1);
      const after = value.slice(cursorPosition);
      onChange(before + after);
      setCursorPosition(cursorPosition - 1);
    }
  }, [value, cursorPosition, onChange]);

  // Handle enter
  const handleEnter = useCallback(() => {
    if (value.trim()) {
      onSend();
    }
  }, [value, onSend]);

  // Initialize GBoard
  const {
    isOpen,
    currentLayout,
    shiftActive,
    altActive,
    capsLock,
    toggle,
    close,
    setLayoutByLanguage,
    handleKeyPress: gboardKeyPress,
    getDisplayKey,
  } = useGBoard({
    defaultLayout: language,
    onKeyPress: handleKeyPress,
    onBackspace: handleBackspace,
    onEnter: handleEnter,
  });

  // Update layout when language changes
  useEffect(() => {
    setLayoutByLanguage(language);
  }, [language, setLayoutByLanguage]);

  // Track cursor position
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  }, [onChange]);

  const handleInputClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    setCursorPosition(input.selectionStart || 0);
  }, []);

  const handleInputKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    setCursorPosition(input.selectionStart || 0);
  }, []);

  // Handle physical keyboard enter
  const handlePhysicalKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnter();
    }
  }, [handleEnter]);

  return (
    <div className={cn('relative', className)}>
      {/* Input row */}
      <div className="flex items-center gap-2 p-2 border-t border-border bg-background">
        {showKeyboardToggle && (
          <Button
            type="button"
            variant={isOpen ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={toggle}
            aria-label={isOpen ? 'Close keyboard' : 'Open keyboard'}
          >
            {isOpen ? <X className="h-4 w-4" /> : <Keyboard className="h-4 w-4" />}
          </Button>
        )}

        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onKeyUp={handleInputKeyUp}
          onKeyDown={handlePhysicalKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          dir="auto"
          lang={language}
          className="flex-1"
        />

        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onSend}
          disabled={!value.trim() || disabled}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Virtual keyboard */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 z-50">
          <GBoard
            layout={currentLayout}
            shiftActive={shiftActive}
            altActive={altActive}
            capsLock={capsLock}
            onKeyPress={gboardKeyPress}
            getDisplayKey={getDisplayKey}
            size="medium"
          />
        </div>
      )}
    </div>
  );
});

GBoardInput.displayName = 'GBoardInput';

export default GBoardInput;

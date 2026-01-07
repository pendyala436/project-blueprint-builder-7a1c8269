/**
 * GBoard Component
 * A flexible, multi-language on-screen keyboard
 * Inspired by: https://github.com/ManDay/gboard
 */

import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { KeyboardLayout, KeyDefinition, KeyboardRow } from '@/lib/gboard/types';
import { Button } from '@/components/ui/button';

interface GBoardProps {
  layout: KeyboardLayout;
  shiftActive?: boolean;
  altActive?: boolean;
  capsLock?: boolean;
  onKeyPress: (keyDef: KeyDefinition) => void;
  getDisplayKey: (keyDef: KeyDefinition) => string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

// Key button component
const KeyButton = memo(({
  keyDef,
  displayKey,
  shiftActive,
  altActive,
  onClick,
  size,
}: {
  keyDef: KeyDefinition;
  displayKey: string;
  shiftActive: boolean;
  altActive: boolean;
  onClick: () => void;
  size: 'small' | 'medium' | 'large';
}) => {
  const width = keyDef.width || 1;
  const isModifier = keyDef.type === 'modifier';
  const isAction = keyDef.type === 'action';
  const isSpace = keyDef.type === 'space';
  const isActive = (keyDef.key === '⇧' && shiftActive) || 
                   (keyDef.key === 'Alt' && altActive);

  const sizeClasses = {
    small: 'h-8 text-sm min-w-[28px]',
    medium: 'h-10 text-base min-w-[36px]',
    large: 'h-12 text-lg min-w-[44px]',
  };

  return (
    <Button
      type="button"
      variant={isActive ? 'default' : isModifier || isAction ? 'secondary' : 'outline'}
      className={cn(
        sizeClasses[size],
        'px-1 font-normal transition-all active:scale-95',
        isSpace && 'flex-1',
        isModifier && 'bg-muted hover:bg-muted/80',
        isAction && keyDef.key === '⌫' && 'text-destructive',
        isAction && keyDef.key === '↵' && 'bg-primary text-primary-foreground',
      )}
      style={{ 
        flex: isSpace ? undefined : width,
        minWidth: isSpace ? undefined : `${width * (size === 'small' ? 28 : size === 'medium' ? 36 : 44)}px`,
      }}
      onClick={onClick}
    >
      {displayKey}
    </Button>
  );
});

KeyButton.displayName = 'KeyButton';

// Row component
const KeyboardRowComponent = memo(({
  row,
  shiftActive,
  altActive,
  onKeyPress,
  getDisplayKey,
  size,
}: {
  row: KeyboardRow;
  shiftActive: boolean;
  altActive: boolean;
  onKeyPress: (keyDef: KeyDefinition) => void;
  getDisplayKey: (keyDef: KeyDefinition) => string;
  size: 'small' | 'medium' | 'large';
}) => {
  return (
    <div className="flex gap-1 justify-center">
      {row.keys.map((keyDef, index) => (
        <KeyButton
          key={`${keyDef.key}-${index}`}
          keyDef={keyDef}
          displayKey={getDisplayKey(keyDef)}
          shiftActive={shiftActive}
          altActive={altActive}
          onClick={() => onKeyPress(keyDef)}
          size={size}
        />
      ))}
    </div>
  );
});

KeyboardRowComponent.displayName = 'KeyboardRowComponent';

// Main GBoard component
export const GBoard = memo(({
  layout,
  shiftActive = false,
  altActive = false,
  capsLock = false,
  onKeyPress,
  getDisplayKey,
  className,
  size = 'medium',
}: GBoardProps) => {
  return (
    <div
      className={cn(
        'p-2 bg-background border-t border-border rounded-t-lg shadow-lg',
        'space-y-1',
        layout.direction === 'rtl' && 'direction-rtl',
        className
      )}
      dir={layout.direction}
    >
      {/* Language indicator */}
      <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
        <span>{layout.nativeName}</span>
        <span className="opacity-50">{layout.name}</span>
      </div>

      {/* Keyboard rows */}
      {layout.rows.map((row, index) => (
        <KeyboardRowComponent
          key={index}
          row={row}
          shiftActive={shiftActive || capsLock}
          altActive={altActive}
          onKeyPress={onKeyPress}
          getDisplayKey={getDisplayKey}
          size={size}
        />
      ))}
    </div>
  );
});

GBoard.displayName = 'GBoard';

export default GBoard;

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send, Smile, Languages, Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useNativeTyping } from '@/hooks/useNativeTyping';

interface ChatMessageInputProps {
  onSendMessage: (message: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  showTranslationPreview?: boolean;
  translatedPreview?: string;
  className?: string;
  userLanguage?: string;
  enableNativeTyping?: boolean;
}

export const ChatMessageInput: React.FC<ChatMessageInputProps> = memo(({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder,
  showTranslationPreview = false,
  translatedPreview,
  className,
  userLanguage = 'english',
  enableNativeTyping = true,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  const [rawInput, setRawInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Native typing hook for real-time transliteration
  const {
    nativeText,
    isConverting,
    isConverted,
    isNonLatinLanguage,
    handleTextChange: handleNativeTyping,
    clear: clearNativeTyping,
    textToSend,
  } = useNativeTyping({
    targetLanguage: userLanguage,
    debounceMs: 400,
    enabled: enableNativeTyping,
  });

  // Handle typing indicator
  const handleTyping = useCallback((value: string) => {
    if (onTyping) {
      if (value.length > 0) {
        onTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      } else {
        onTyping(false);
      }
    }
  }, [onTyping]);

  // Handle message change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRawInput(value);
    handleNativeTyping(value);
    handleTyping(value);
  }, [handleNativeTyping, handleTyping]);

  // Handle send
  const handleSend = useCallback(() => {
    const messageToSend = textToSend || rawInput.trim();
    
    if (messageToSend && !disabled && !isComposing) {
      console.log('[ChatInput] Sending:', messageToSend);
      onSendMessage(messageToSend);
      setRawInput('');
      clearNativeTyping();
      onTyping?.(false);
      textareaRef.current?.focus();
    }
  }, [textToSend, rawInput, disabled, isComposing, onSendMessage, clearNativeTyping, onTyping]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [isComposing, handleSend]);

  // IME composition handlers
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [rawInput]);

  const defaultPlaceholder = t('chat.typeMessage');

  // Determine what to show in the textarea
  // Show native text if converted, otherwise show raw input
  const displayValue = isConverted && nativeText ? nativeText : rawInput;

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      {/* Native script preview - shows while converting */}
      {enableNativeTyping && isNonLatinLanguage && rawInput && (
        <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Languages className="h-3 w-3" />
            <span>{t('chat.nativePreview', 'Native script')}:</span>
            {isConverting && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
          <p className="text-sm text-foreground/80 mt-1 unicode-text font-medium" dir="auto">
            {isConverting ? (
              <span className="text-muted-foreground italic">
                {t('chat.converting', 'Converting...')}
              </span>
            ) : nativeText || rawInput}
          </p>
          {isConverted && nativeText && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('chat.typedAs', 'You typed')}: <span className="font-mono">{rawInput}</span>
            </p>
          )}
        </div>
      )}

      {/* Translation preview for recipient */}
      {showTranslationPreview && translatedPreview && rawInput && (
        <div className="px-4 py-2 border-b border-border/50 bg-accent/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Languages className="h-3 w-3" />
            <span>{t('chat.recipientSees', 'Recipient will see')}:</span>
          </div>
          <p className="text-sm text-foreground/80 mt-1 unicode-text" dir="auto">
            {translatedPreview}
          </p>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 flex items-end gap-2">
        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={rawInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled}
            lang={userLanguage}
            dir="auto"
            className={cn(
              'min-h-[44px] max-h-[120px] resize-none unicode-text',
              'py-3 px-4 pr-12',
              'rounded-xl border-muted-foreground/20',
              'focus-visible:ring-primary/50',
              isComposing && 'ime-composing',
              isConverting && 'opacity-70'
            )}
            aria-label={t('chat.typeMessage')}
          />

          {/* Converting indicator */}
          {isConverting && (
            <div className="absolute end-12 bottom-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}

          {/* Emoji button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute end-2 bottom-2 h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={t('chat.emoji', 'Add emoji')}
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!rawInput.trim() || disabled}
          size="icon"
          className={cn(
            'h-11 w-11 rounded-full flex-shrink-0',
            'bg-primary hover:bg-primary/90',
            'transition-transform active:scale-95',
            isRTL && 'rtl:flip'
          )}
          aria-label={t('chat.send')}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
});

ChatMessageInput.displayName = 'ChatMessageInput';

export default ChatMessageInput;

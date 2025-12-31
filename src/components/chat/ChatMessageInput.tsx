import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send, Smile, Languages } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useServerTranslation } from '@/hooks/useServerTranslation';

interface ChatMessageInputProps {
  onSendMessage: (message: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  showTranslationPreview?: boolean;
  translatedPreview?: string;
  className?: string;
  userLanguage?: string;
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
}) => {
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastLatinInputRef = useRef<string>(''); // Track Latin input to prevent loops
  const isUpdatingFromPreviewRef = useRef(false); // Flag to prevent re-triggering

  // Use server translation for real-time native script conversion
  const { livePreview, updateLivePreview, clearLivePreview, isTranslating } = useServerTranslation({
    userLanguage,
    debounceMs: 200
  });

  // Handle typing indicator
  const handleTyping = useCallback((value: string) => {
    if (onTyping) {
      if (value.length > 0) {
        onTyping(true);
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      } else {
        onTyping(false);
      }
    }
  }, [onTyping]);

  // Check if text is Latin script
  const isLatinScript = useCallback((text: string): boolean => {
    if (!text) return true;
    const latinPattern = /^[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\s\d\p{P}]+$/u;
    return latinPattern.test(text.trim());
  }, []);

  // Handle message change with real-time native script conversion
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // If this change is from the livePreview update, just set message without re-triggering
    if (isUpdatingFromPreviewRef.current) {
      isUpdatingFromPreviewRef.current = false;
      setMessage(value);
      handleTyping(value);
      return;
    }
    
    setMessage(value);
    handleTyping(value);
    
    // Only trigger conversion if typing Latin script
    if (isLatinScript(value)) {
      lastLatinInputRef.current = value;
      updateLivePreview(value);
    }
  }, [handleTyping, updateLivePreview, isLatinScript]);

  // When livePreview updates (native script ready), replace message with it
  useEffect(() => {
    // Only update if:
    // 1. livePreview exists and is different from message
    // 2. Not currently translating
    // 3. livePreview is not the same as what we sent (Latin input)
    if (
      livePreview && 
      livePreview !== message && 
      !isTranslating &&
      livePreview !== lastLatinInputRef.current
    ) {
      isUpdatingFromPreviewRef.current = true;
      setMessage(livePreview);
      
      // Update cursor position to end
      if (textareaRef.current) {
        const len = livePreview.length;
        setTimeout(() => {
          textareaRef.current?.setSelectionRange(len, len);
        }, 0);
      }
    }
  }, [livePreview, isTranslating]);

  // Handle send
  const handleSend = useCallback(() => {
    if (message.trim() && !disabled && !isComposing) {
      onSendMessage(message.trim());
      setMessage('');
      lastLatinInputRef.current = '';
      clearLivePreview();
      onTyping?.(false);
      textareaRef.current?.focus();
    }
  }, [message, disabled, isComposing, onSendMessage, onTyping, clearLivePreview]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't send during IME composition
    if (isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [isComposing, handleSend]);

  // IME composition handlers for CJK languages
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
  }, [message]);

  const defaultPlaceholder = t('chat.typeMessage');

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      {/* Translation preview */}
      {showTranslationPreview && translatedPreview && message && (
        <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Languages className="h-3 w-3" />
            <span>{t('chat.preview', 'Preview')}:</span>
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
            value={message}
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
              isComposing && 'ime-composing'
            )}
            aria-label={t('chat.typeMessage')}
          />

          {/* Emoji button (placeholder) */}
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
          disabled={!message.trim() || disabled}
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

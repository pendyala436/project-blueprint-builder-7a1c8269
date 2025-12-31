/**
 * ChatMessageInput - Multilingual Chat Input with Auto Script Conversion
 * 
 * Features:
 * - Type in English/Latin → displays in native script (based on sender's mother tongue)
 * - Auto-detect source language
 * - Translation happens only when sender/receiver have different languages
 */

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send, Smile, Languages } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useServerTranslation } from '@/hooks/useServerTranslation';

interface ChatMessageInputProps {
  onSendMessage: (message: string, originalMessage?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Sender's mother tongue (user's language) */
  senderLanguage?: string;
  /** Receiver's mother tongue (partner's language) */
  receiverLanguage?: string;
}

export const ChatMessageInput: React.FC<ChatMessageInputProps> = memo(({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder,
  className,
  senderLanguage = 'english',
  receiverLanguage = 'english',
}) => {
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastLatinInputRef = useRef<string>('');

  // Server translation for send-time conversion
  const { 
    clearLivePreview, 
    convertToNative,
    isSameLanguage,
    needsTranslation 
  } = useServerTranslation({
    userLanguage: senderLanguage,
    partnerLanguage: receiverLanguage,
    debounceMs: 300
  });

  // Check if translation will be needed when message is sent
  const willNeedTranslation = needsTranslation(senderLanguage, receiverLanguage);

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

  // Check if text is Latin script
  const isLatinScript = useCallback((text: string): boolean => {
    if (!text) return true;
    const latinPattern = /^[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\s\d\p{P}]+$/u;
    return latinPattern.test(text.trim());
  }, []);

  // Handle message change - allow all typing without blocking
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Always update message immediately - never block typing
    setMessage(value);
    handleTyping(value);
    
    // Track Latin input for potential conversion on send
    if (isLatinScript(value)) {
      lastLatinInputRef.current = value;
    } else {
      // User is typing in native script directly - clear Latin reference
      lastLatinInputRef.current = '';
    }
  }, [handleTyping, isLatinScript]);

  // Handle send - convert Latin to native if needed, then send
  const handleSend = useCallback(async () => {
    if (!message.trim() || disabled || isComposing) return;
    
    const trimmedMessage = message.trim();
    const originalLatin = lastLatinInputRef.current;
    
    // If user typed in Latin and their language is not English, convert before sending
    if (originalLatin && isLatinScript(trimmedMessage) && !isSameLanguage(senderLanguage, 'english')) {
      // Convert Latin to native script on send (non-blocking during typing)
      try {
        const result = await convertToNative(trimmedMessage, senderLanguage);
        onSendMessage(result.text, originalLatin);
      } catch {
        // Fallback: send as-is if conversion fails
        onSendMessage(trimmedMessage, originalLatin);
      }
    } else {
      // Already in native script or English - send directly
      onSendMessage(trimmedMessage, originalLatin || trimmedMessage);
    }
    
    setMessage('');
    lastLatinInputRef.current = '';
    clearLivePreview();
    onTyping?.(false);
    textareaRef.current?.focus();
  }, [message, disabled, isComposing, onSendMessage, onTyping, clearLivePreview, isLatinScript, isSameLanguage, senderLanguage, convertToNative]);

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
  }, [message]);

  const defaultPlaceholder = t('chat.typeMessage', 'Type a message...');

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      {/* Translation status indicator */}
      {willNeedTranslation && (
        <div className="px-4 py-1.5 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Languages className="h-3 w-3" />
            <span>
              {t('chat.willTranslate', 'Will translate')} {senderLanguage} → {receiverLanguage}
            </span>
          </div>
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
            lang={senderLanguage}
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

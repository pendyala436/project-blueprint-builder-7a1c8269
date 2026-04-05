import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Send, Loader2 } from 'lucide-react';
import { chatRateLimiter } from '@/lib/validation';
import { translateText } from '@/lib/translation-service';

// Dynamic labels — translated live via Lingva, no hardcoded values
const DEFAULT_LABELS = { placeholder: 'Type a message...', send: 'Send', preview: 'Preview' };

// Cache for translated labels to avoid re-fetching on every render
const labelCache = new Map<string, { placeholder: string; send: string; preview: string }>();

export function getNativeLabels(language?: string) {
  if (!language) return DEFAULT_LABELS;
  const key = language.toLowerCase().trim();
  if (key === 'english') return DEFAULT_LABELS;
  return labelCache.get(key) || DEFAULT_LABELS;
}

// isLatinScript is now imported from translation-service (single source of truth)

interface ChatMessageInputProps {
  onSendMessage: (message: string) => void;
  onTyping?: (isTyping: boolean) => void;
  onInputChange?: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  userLanguage?: string;
  maxLength?: number;
}

export const ChatMessageInput: React.FC<ChatMessageInputProps> = memo(({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder,
  className,
  userLanguage,
  maxLength = 2000,
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [dynamicLabels, setDynamicLabels] = useState(DEFAULT_LABELS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const langNorm = (userLanguage || 'english').toLowerCase().trim();
  const isNonEnglish = langNorm !== 'english';

  // Fetch translated UI labels via live Lingva translation (no hardcoding)
  useEffect(() => {
    if (!isNonEnglish || !userLanguage) {
      setDynamicLabels(DEFAULT_LABELS);
      return;
    }

    const cacheKey = langNorm;
    if (labelCache.has(cacheKey)) {
      setDynamicLabels(labelCache.get(cacheKey)!);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [placeholderResult, sendResult, previewResult] = await Promise.allSettled([
          translateText('Type a message...', 'English', userLanguage),
          translateText('Send', 'English', userLanguage),
          translateText('Preview', 'English', userLanguage),
        ]);

        if (cancelled) return;

        const translated = {
          placeholder: placeholderResult.status === 'fulfilled' ? placeholderResult.value : DEFAULT_LABELS.placeholder,
          send: sendResult.status === 'fulfilled' ? sendResult.value : DEFAULT_LABELS.send,
          preview: previewResult.status === 'fulfilled' ? previewResult.value : DEFAULT_LABELS.preview,
        };

        labelCache.set(cacheKey, translated);
        setDynamicLabels(translated);
      } catch {
        // Fallback to English
      }
    })();

    return () => { cancelled = true; };
  }, [userLanguage, isNonEnglish, langNorm]);

  const labels = dynamicLabels;

  // iOS keyboard height detection
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handleResize = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height);
      document.documentElement.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
    };
    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, []);


  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length > maxLength) return;
    setMessage(value);

    if (onTyping) {
      onTyping(value.length > 0);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
  }, [onTyping, maxLength]);

  const handleSend = useCallback(async () => {
    const text = message.trim().replace(/<[^>]*>/g, "");
    if (!text || disabled || isSending) return;

    if (!chatRateLimiter.canProceed()) {
      return;
    }

    setIsSending(true);
    try {
      setMessage('');
      onTyping?.(false);
      textareaRef.current?.focus();
      await onSendMessage(text);
    } finally {
      setIsSending(false);
    }
  }, [message, disabled, isSending, onSendMessage, onTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      <div className="p-3 pt-2 flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || labels.placeholder}
            disabled={disabled || isSending}
            dir="auto"
            spellCheck={true}
            autoComplete="off"
            autoCorrect="on"
            className={cn(
              'min-h-[44px] max-h-[120px] resize-none unicode-text',
              'py-3 px-4 pr-12',
              'rounded-xl border-muted-foreground/20',
              'focus-visible:ring-primary/50',
              'text-lg',
            )}
            aria-label={labels.placeholder}
          />
          {/* CHT-08 FIX: Removed non-functional emoji button */}
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isSending}
          size="icon"
          className={cn(
            'h-11 w-11 rounded-full flex-shrink-0',
            'bg-primary hover:bg-primary/90',
            'transition-transform active:scale-95',
          )}
          aria-label={labels.send}
          title={labels.send}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
});

ChatMessageInput.displayName = 'ChatMessageInput';

export default ChatMessageInput;

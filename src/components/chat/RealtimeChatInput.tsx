/**
 * Real-Time Chat Input with Non-Blocking Transliteration
 * =======================================================
 * Zero-lag typing experience for all 900+ languages
 * 
 * Features:
 * - Non-blocking transliteration (runs in background via requestIdleCallback)
 * - Instant typing response - never blocks user input
 * - Latin → Native script conversion based on profile mother tongue
 * - Works identically for sender AND receiver
 * - All 900+ languages from profile language list
 */

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send, Loader2 } from 'lucide-react';
import { useRealtimeChatTranslation } from '@/hooks/useRealtimeChatTranslation';

interface RealtimeChatInputProps {
  onSendMessage: (message: string, senderView: string, receiverView: string) => void;
  onTyping?: (isTyping: boolean) => void;
  senderLanguage: string; // User's mother tongue from profile
  receiverLanguage: string; // Partner's mother tongue from profile
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// Use requestIdleCallback with fallback for non-blocking background work
const scheduleBackground = (callback: () => void) => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, { timeout: 16 });
  } else {
    requestAnimationFrame(callback);
  }
};

export const RealtimeChatInput: React.FC<RealtimeChatInputProps> = memo(({
  onSendMessage,
  onTyping,
  senderLanguage,
  receiverLanguage,
  disabled = false,
  placeholder,
  className,
}) => {
  const { t } = useTranslation();
  const {
    getLivePreview,
    processMessage,
    isLatinText,
    isLatinScriptLanguage,
  } = useRealtimeChatTranslation();

  // State - rawInput is what user types, displayText is transliterated version
  const [rawInput, setRawInput] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const transliterationRef = useRef<number>(0); // Track latest transliteration request

  // Check if user's mother tongue uses non-Latin script
  const needsTransliteration = !isLatinScriptLanguage(senderLanguage);

  /**
   * Background transliteration - never blocks typing
   * Runs via requestIdleCallback for zero-lag experience
   */
  const transliterateInBackground = useCallback((text: string, requestId: number) => {
    scheduleBackground(() => {
      // Skip if newer request exists (user typed more)
      if (requestId !== transliterationRef.current) return;
      
      if (!text.trim()) {
        setDisplayText('');
        return;
      }

      // Only transliterate if text is Latin and language needs it
      if (needsTransliteration && isLatinText(text)) {
        const result = getLivePreview(text, senderLanguage);
        // Double-check we're still on the same request
        if (requestId === transliterationRef.current) {
          setDisplayText(result.preview || text);
        }
      } else {
        // No transliteration needed - user typing in native script or Latin language
        if (requestId === transliterationRef.current) {
          setDisplayText(text);
        }
      }
    });
  }, [needsTransliteration, isLatinText, getLivePreview, senderLanguage]);

  /**
   * Handle input change - instantly updates raw input, transliterates in background
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Instant: update raw input (never blocks)
    setRawInput(value);
    
    // Background: transliterate without blocking typing
    const requestId = ++transliterationRef.current;
    transliterateInBackground(value, requestId);

    // Typing indicator
    if (onTyping) {
      onTyping(value.length > 0);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  }, [transliterateInBackground, onTyping]);

  /**
   * Handle send - sends native script text, translates for receiver in background
   */
  const handleSend = useCallback(async () => {
    // Use displayText (native script) if available, otherwise rawInput
    const messageToSend = (displayText || rawInput).trim();
    if (!messageToSend || disabled || isComposing || isSending) return;

    setIsSending(true);

    // Clear input immediately for responsive feel
    const savedMessage = messageToSend;
    setRawInput('');
    setDisplayText('');
    onTyping?.(false);

    try {
      // Process message in background - translate for receiver
      const result = await processMessage(savedMessage, senderLanguage, receiverLanguage);

      // Send: original (native script), senderView, receiverView (translated)
      onSendMessage(savedMessage, result.senderView, result.receiverView);
      textareaRef.current?.focus();
    } catch (err) {
      console.error('[RealtimeChatInput] Send error:', err);
      // Fallback: send original text
      onSendMessage(savedMessage, savedMessage, savedMessage);
    } finally {
      setIsSending(false);
    }
  }, [displayText, rawInput, disabled, isComposing, isSending, processMessage, senderLanguage, receiverLanguage, onSendMessage, onTyping]);

  /**
   * Handle key press
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [isComposing, handleSend]);

  // IME handlers for CJK input
  const handleCompositionStart = useCallback(() => setIsComposing(true), []);
  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [displayText || rawInput]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Show displayText (native script) if available, otherwise show rawInput
  const shownText = displayText || rawInput;
  const defaultPlaceholder = needsTransliteration 
    ? t('chat.typeInLatin', 'Type in English letters...')
    : t('chat.typeMessage', 'Type a message...');

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      {/* Hint for non-Latin languages */}
      {needsTransliteration && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground/70 flex items-center gap-1.5 border-b border-border/30">
          <span>✨</span>
          <span>{t('chat.transliterationHint', 'Type in English - auto-converts to your language')}</span>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={shownText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled || isSending}
            lang={senderLanguage}
            dir="auto"
            className={cn(
              'min-h-[44px] max-h-[120px] resize-none unicode-text',
              'py-3 px-4',
              'rounded-xl border-muted-foreground/20',
              'focus-visible:ring-primary/50',
              'text-lg',
              isComposing && 'ring-2 ring-primary/30'
            )}
            aria-label={t('chat.typeMessage')}
          />
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!shownText.trim() || disabled || isSending}
          size="icon"
          className={cn(
            'h-11 w-11 rounded-full flex-shrink-0',
            'bg-primary hover:bg-primary/90',
            'transition-transform active:scale-95'
          )}
          aria-label={t('chat.send', 'Send')}
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

RealtimeChatInput.displayName = 'RealtimeChatInput';

export default RealtimeChatInput;

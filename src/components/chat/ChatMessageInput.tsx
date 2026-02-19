import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send, Smile, Loader2, Languages, Globe } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
// Translation removed - messages sent as plain text
const dynamicTransliterate = (text: string, _lang: string): string => text;
const isLatinScriptLanguage = (_lang: string): boolean => true;

interface ChatMessageInputProps {
  onSendMessage: (message: string, nativeText?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  showTranslationPreview?: boolean;
  translatedPreview?: string;
  className?: string;
  userLanguage?: string;
}

/**
 * Quick check if text contains only Latin characters
 */
const isLatinText = (text: string): boolean => {
  if (!text) return true;
  const latinPattern = /^[\x00-\x7F\u00C0-\u024F\s\d.,!?'"()\-:;@#$%^&*+=\[\]{}|\\/<>~`]+$/;
  return latinPattern.test(text);
};

type TypingMode = 'native' | 'english';

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
  
  // State for raw Latin input and transliterated native text
  const [rawInput, setRawInput] = useState('');
  const [nativeText, setNativeText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Toggle between English and Native typing mode
  const [typingMode, setTypingMode] = useState<TypingMode>('native');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Check if user's language needs transliteration (non-Latin script)
  const needsTransliteration = !isLatinScriptLanguage(userLanguage);
  const isEnglishLanguage = userLanguage.toLowerCase() === 'english';

  /**
   * INSTANT offline transliteration - pure TypeScript, < 2ms
   * Converts Latin → Native script using Gboard input codes
   */
  const transliterateInstant = useCallback((latinText: string): string => {
    if (!latinText.trim()) return '';
    
    if (needsTransliteration && isLatinText(latinText)) {
      try {
        const result = dynamicTransliterate(latinText, userLanguage);
        return result || latinText;
      } catch (e) {
        console.error('[ChatMessageInput] Transliteration error:', e);
        return latinText;
      }
    }
    
    return latinText;
  }, [needsTransliteration, userLanguage]);

  /**
   * Toggle typing mode between English and Native
   */
  const toggleTypingMode = useCallback(() => {
    setTypingMode(prev => prev === 'native' ? 'english' : 'native');
  }, []);

  /**
   * Handle input change with instant Gboard-style transliteration
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // If in English mode, just keep raw text - no transliteration
    if (typingMode === 'english') {
      setRawInput(value);
      setNativeText(value); // In English mode, native = raw
      
      // Typing indicator
      if (onTyping) {
        onTyping(value.length > 0);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
      }
      return;
    }
    
    // Native mode with transliteration
    if (needsTransliteration) {
      // Check if user is using native keyboard (GBoard) - contains non-Latin chars
      const hasNativeChars = /[^\x00-\x7F\u00C0-\u024F]/.test(value);
      
      if (hasNativeChars) {
        // Native keyboard detected - use directly without transliteration
        setRawInput(value);
        setNativeText(value);
      } else if (value === '' || isLatinText(value)) {
        // Pure Latin input - apply instant transliteration
        setRawInput(value);
        
        if (value.trim()) {
          const native = transliterateInstant(value);
          setNativeText(native);
        } else {
          setNativeText('');
        }
      } else {
        // Mixed - pass through
        setRawInput(value);
        setNativeText(value);
      }
    } else {
      // Latin-script language - no transliteration needed
      setRawInput(value);
      setNativeText(value);
    }

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
  }, [transliterateInstant, needsTransliteration, typingMode, onTyping]);

  // Handle send
  const handleSend = useCallback(() => {
    const messageToSend = typingMode === 'english' 
      ? rawInput.trim() 
      : (nativeText || rawInput).trim();
    
    if (!messageToSend || disabled || isComposing || isSending) return;

    setIsSending(true);
    
    try {
      // Send both the native text and original for reference
      onSendMessage(messageToSend, typingMode === 'english' ? undefined : nativeText || undefined);
      setRawInput('');
      setNativeText('');
      onTyping?.(false);
      textareaRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  }, [nativeText, rawInput, disabled, isComposing, isSending, typingMode, onSendMessage, onTyping]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [isComposing, handleSend]);

  // IME composition handlers for CJK languages
  const handleCompositionStart = useCallback(() => setIsComposing(true), []);
  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

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
  }, [rawInput, nativeText]);

  const displayText = typingMode === 'english' ? rawInput : (needsTransliteration ? rawInput : nativeText);
  
  const defaultPlaceholder = typingMode === 'english'
    ? t('chat.typeInEnglish', 'Type in English...')
    : needsTransliteration 
      ? t('chat.typeInLatin', 'Type in English letters → auto-converts')
      : t('chat.typeMessage');

  // Show toggle only for non-English languages
  const showModeToggle = !isEnglishLanguage;

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      {/* Typing mode toggle for non-English languages */}
      {showModeToggle && (
        <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={typingMode === 'native' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypingMode('native')}
              className="h-7 px-3 text-xs gap-1.5"
            >
              <Languages className="h-3.5 w-3.5" />
              {userLanguage}
            </Button>
            <Button
              variant={typingMode === 'english' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypingMode('english')}
              className="h-7 px-3 text-xs gap-1.5"
            >
              <Globe className="h-3.5 w-3.5" />
              English
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {typingMode === 'english' 
              ? t('chat.typingInEnglish', 'Typing in English')
              : t('chat.typingInNative', `Typing in ${userLanguage}`)}
          </span>
        </div>
      )}

      {/* Native script preview for non-Latin languages (only in native mode) */}
      {typingMode === 'native' && needsTransliteration && nativeText && nativeText !== rawInput && (
        <div className="px-4 py-2 border-b border-border/50 bg-primary/5">
          <div className="text-xs text-muted-foreground mb-1">
            {userLanguage}:
          </div>
          <p className="text-base text-foreground unicode-text" dir="auto">
            {nativeText}
          </p>
        </div>
      )}

      {/* Translation preview (for receiver's language) */}
      {showTranslationPreview && translatedPreview && displayText && (
        <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>🌐</span>
            <span>{t('chat.preview', 'Preview')}:</span>
          </div>
          <p className="text-sm text-foreground/80 mt-1 unicode-text" dir="auto">
            {translatedPreview}
          </p>
        </div>
      )}

      {/* Gboard hint for non-Latin languages (only in native mode) */}
      {typingMode === 'native' && needsTransliteration && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground/70 flex items-center gap-1.5">
          <span>✨</span>
          <span>{t('chat.gboardHint', 'Type English letters → auto-converts to')} {userLanguage}</span>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 pt-2 flex items-end gap-2">
        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={displayText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled || isSending}
            lang={typingMode === 'english' ? 'en' : (needsTransliteration ? 'en' : userLanguage)}
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
              isComposing && 'ring-2 ring-primary/30'
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
          disabled={!(nativeText || rawInput).trim() || disabled || isSending}
          size="icon"
          className={cn(
            'h-11 w-11 rounded-full flex-shrink-0',
            'bg-primary hover:bg-primary/90',
            'transition-transform active:scale-95',
            isRTL && 'rtl:flip'
          )}
          aria-label={t('chat.send')}
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

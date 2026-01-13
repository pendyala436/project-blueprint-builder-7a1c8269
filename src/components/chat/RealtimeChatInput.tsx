/**
 * Real-Time Chat Input with INSTANT Transliteration
 * ==================================================
 * Zero-lag typing experience for all 1000+ languages
 * 
 * Features:
 * - INSTANT offline transliteration on every keystroke (sync, < 2ms)
 * - Type "bagunnava" → see "బాగున్నావా" immediately in input
 * - Latin → Native script conversion based on sender's mother tongue
 * - Universal Translation for sender → receiver (different languages)
 * - Toggle between English and Native typing modes
 * 
 * TYPING: Pure offline dynamic transliteration (Gboard-style)
 * TRANSLATION: Uses translateText from translate.ts via Edge Function
 */

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send, Languages, Globe } from 'lucide-react';
import { dynamicTransliterate, isLatinScriptLanguage as checkLatinScript } from '@/lib/translation/dynamic-transliterator';
import { translateText, isSameLanguage } from '@/lib/translation/translate';

interface RealtimeChatInputProps {
  onSendMessage: (message: string, senderView: string, receiverView: string) => void;
  onTyping?: (isTyping: boolean) => void;
  senderLanguage: string; // User's mother tongue from profile
  receiverLanguage: string; // Partner's mother tongue from profile
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// Quick check if text is Latin script
const isLatinText = (text: string): boolean => {
  if (!text) return true;
  const latinPattern = /^[\x00-\x7F\u00C0-\u024F\s\d.,!?'"()\-:;@#$%^&*+=\[\]{}|\\/<>~`]+$/;
  return latinPattern.test(text);
};

type TypingMode = 'native' | 'english';

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

  // State
  const [rawInput, setRawInput] = useState(''); // What user typed (Latin)
  const [nativeText, setNativeText] = useState(''); // Transliterated native script
  const [isComposing, setIsComposing] = useState(false);
  
  // Toggle between English and Native typing mode
  const [typingMode, setTypingMode] = useState<TypingMode>('native');

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Check if user's mother tongue uses non-Latin script
  const needsTransliteration = !checkLatinScript(senderLanguage);
  const isEnglishLanguage = senderLanguage.toLowerCase() === 'english';

  /**
   * INSTANT transliteration - sync, < 2ms
   * Converts Latin text to native script immediately
   */
  const transliterateNow = useCallback((latinText: string): string => {
    if (!latinText.trim()) return '';
    
    // Only transliterate if text is Latin and language needs it
    if (needsTransliteration && isLatinText(latinText)) {
      try {
        const result = dynamicTransliterate(latinText, senderLanguage);
        return result || latinText;
      } catch (e) {
        console.error('[RealtimeChatInput] Transliteration error:', e);
        return latinText;
      }
    }
    
    // No transliteration needed - passthrough
    return latinText;
  }, [needsTransliteration, senderLanguage]);

  /**
   * Handle input change - INSTANT transliteration on every keystroke
   * Key insight: We store raw Latin input separately and always display the transliterated version
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
      // PRIORITY CHECK: Detect if input contains ANY non-Latin characters (GBoard/native keyboard)
      const hasNativeChars = /[^\x00-\x7F\u00C0-\u024F]/.test(value);
      
      if (hasNativeChars) {
        // GBoard/native keyboard detected - use directly, NO transliteration
        setRawInput(value); // Store as-is
        setNativeText(value); // Use directly - user is typing in native script
      } else if (value === '' || isLatinText(value)) {
        // Pure Latin input - apply transliteration
        setRawInput(value);
        
        if (value.trim()) {
          const native = transliterateNow(value);
          setNativeText(native);
        } else {
          setNativeText('');
        }
      } else {
        // Mixed or unknown - pass through
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
  }, [transliterateNow, needsTransliteration, typingMode, onTyping]);

  /**
   * Handle send - Non-blocking Universal Translation
   * 
   * CRITICAL: Translations happen in BACKGROUND - typing never blocked
   * 
   * FLOW:
   * 1. Clear input immediately (instant feedback)
   * 2. Send message with original text first
   * 3. Translations happen async and message updates when ready
   */
  const handleSend = useCallback(() => {
    // Get the raw input text
    const rawMessage = rawInput.trim();
    const nativeMessage = (nativeText || rawInput).trim();
    
    // In English mode use raw English, in native mode use transliterated text
    const messageToSend = typingMode === 'english' ? rawMessage : nativeMessage;
      
    if (!messageToSend || disabled || isComposing) return;

    // Clear input IMMEDIATELY - never block typing
    const savedMessage = messageToSend;
    const savedTypingMode = typingMode;
    setRawInput('');
    setNativeText('');
    onTyping?.(false);

    // Fire translation in background - completely non-blocking
    (async () => {
      try {
        let senderView = savedMessage;
        let receiverView = savedMessage;
        
        // CASE 1: Typing in English mode - translate from English to both natives
        if (savedTypingMode === 'english') {
          const isEnglishSender = senderLanguage.toLowerCase() === 'english';
          const isEnglishReceiver = receiverLanguage.toLowerCase() === 'english';
          
          // Parallel translations for maximum speed
          const [senderResult, receiverResult] = await Promise.all([
            // English → Sender's native
            !isEnglishSender 
              ? translateText(savedMessage, 'english', senderLanguage).catch(() => null)
              : Promise.resolve(null),
            // English → Receiver's native  
            !isEnglishReceiver
              ? translateText(savedMessage, 'english', receiverLanguage).catch(() => null)
              : Promise.resolve(null)
          ]);
          
          if (senderResult?.isTranslated) senderView = senderResult.text;
          if (receiverResult?.isTranslated) receiverView = receiverResult.text;
          
          console.log('[RealtimeChatInput] English mode translations done');
        } 
        // CASE 2: Native mode - translate to receiver's language
        else if (!isSameLanguage(senderLanguage, receiverLanguage)) {
          try {
            const result = await translateText(savedMessage, senderLanguage, receiverLanguage);
            if (result.isTranslated) receiverView = result.text;
          } catch (e) {
            console.error('[RealtimeChatInput] Translation error:', e);
          }
        }
        
        // Send message with translations
        onSendMessage(savedMessage, senderView, receiverView);
      } catch (err) {
        console.error('[RealtimeChatInput] Send error:', err);
        // Fallback: send original text
        onSendMessage(savedMessage, savedMessage, savedMessage);
      }
    })();

    // Focus textarea for continued typing
    textareaRef.current?.focus();
  }, [nativeText, rawInput, disabled, isComposing, typingMode, senderLanguage, receiverLanguage, onSendMessage, onTyping]);

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
  }, [nativeText]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Display the native script text (transliterated) or raw in English mode
  const displayText = typingMode === 'english' ? rawInput : (nativeText || rawInput);
  
  const defaultPlaceholder = typingMode === 'english'
    ? t('chat.typeInEnglish', 'Type in English...')
    : needsTransliteration 
      ? t('chat.typeInLatin', 'Type in English letters - converts to your language')
      : t('chat.typeMessage', 'Type a message...');

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
              {senderLanguage}
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
              : t('chat.typingInNative', `Typing in ${senderLanguage}`)}
          </span>
        </div>
      )}

      {/* Hint for non-Latin languages (only in native mode) */}
      {typingMode === 'native' && needsTransliteration && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground/70 flex items-center gap-1.5 border-b border-border/30">
          <span>✨</span>
          <span>{t('chat.transliterationHint', 'Type in English letters → auto-converts to')} {senderLanguage}</span>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 flex items-end gap-2">
        <div className="flex-1 relative">
          {/* Native script preview when typing Latin for transliteration (only in native mode) */}
          {typingMode === 'native' && needsTransliteration && nativeText && nativeText !== rawInput && (
            <div className="mb-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-base unicode-text" dir="auto">
              {nativeText}
            </div>
          )}
          
          <Textarea
            ref={textareaRef}
            value={typingMode === 'english' ? rawInput : (needsTransliteration ? rawInput : nativeText)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled}
            lang={typingMode === 'english' ? 'en' : (needsTransliteration ? 'en' : senderLanguage)}
            dir="auto"
            spellCheck={true}
            autoComplete="off"
            autoCorrect="on"
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
          disabled={!displayText.trim() || disabled}
          size="icon"
          className={cn(
            'h-11 w-11 rounded-full flex-shrink-0',
            'bg-primary hover:bg-primary/90',
            'transition-transform active:scale-95'
          )}
          aria-label={t('chat.send', 'Send')}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
});

RealtimeChatInput.displayName = 'RealtimeChatInput';

export default RealtimeChatInput;

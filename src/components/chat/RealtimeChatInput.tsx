/**
 * Real-Time Chat Input with INSTANT Transliteration
 * ==================================================
 * Zero-lag typing experience for all 900+ languages
 * 
 * Features:
 * - INSTANT transliteration on every keystroke (sync, < 2ms)
 * - Type "bagunnava" → see "బాగున్నావా" immediately in input
 * - Latin → Native script conversion based on sender's mother tongue
 * - Works identically for sender AND receiver
 * - All 900+ languages from profile language list
 */

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send, Loader2 } from 'lucide-react';
import { dynamicTransliterate, isLatinScriptLanguage as checkLatinScript } from '@/lib/translation/dynamic-transliterator';

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
  const [isSending, setIsSending] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Check if user's mother tongue uses non-Latin script
  const needsTransliteration = !checkLatinScript(senderLanguage);

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
    
    // Detect if user is typing Latin characters (phonetic input)
    // We compare the new value against what we expect
    const lastChar = value.slice(-1);
    const isTypingLatin = lastChar ? /[a-zA-Z\s\d.,!?'"()\-:;]/.test(lastChar) : true;
    
    if (needsTransliteration) {
      if (isTypingLatin || isLatinText(value)) {
        // User typing phonetically in Latin → store raw, show transliterated
        setRawInput(value);
        
        // INSTANT transliteration
        if (value.trim()) {
          const native = transliterateNow(value);
          console.log('[RealtimeChatInput] Transliterate:', value, '→', native, 'lang:', senderLanguage);
          setNativeText(native);
        } else {
          setNativeText('');
        }
      } else {
        // User typing in native script directly (e.g., using native keyboard)
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
  }, [transliterateNow, needsTransliteration, senderLanguage, onTyping]);

  /**
   * Handle send - sends native script text, translates for receiver
   */
  const handleSend = useCallback(async () => {
    // Use native text (transliterated) if available
    const messageToSend = (nativeText || rawInput).trim();
    if (!messageToSend || disabled || isComposing || isSending) return;

    setIsSending(true);

    // Clear input immediately for responsive feel
    const savedMessage = messageToSend;
    const savedRaw = rawInput;
    setRawInput('');
    setNativeText('');
    onTyping?.(false);

    try {
      // For receiver, transliterate to their language
      let receiverView = savedMessage;
      
      if (!checkLatinScript(receiverLanguage)) {
        // Receiver needs native script - transliterate from Latin if we have it
        if (savedRaw && isLatinText(savedRaw)) {
          try {
            receiverView = dynamicTransliterate(savedRaw, receiverLanguage) || savedMessage;
          } catch (e) {
            console.error('[RealtimeChatInput] Receiver transliteration error:', e);
          }
        }
      }

      // Send: original message, sender's view (native), receiver's view
      onSendMessage(savedMessage, savedMessage, receiverView);
      textareaRef.current?.focus();
    } catch (err) {
      console.error('[RealtimeChatInput] Send error:', err);
      // Fallback: send original text
      onSendMessage(savedMessage, savedMessage, savedMessage);
    } finally {
      setIsSending(false);
    }
  }, [nativeText, rawInput, disabled, isComposing, isSending, receiverLanguage, onSendMessage, onTyping]);

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

  // Display the native script text (transliterated)
  const displayText = nativeText || rawInput;
  const defaultPlaceholder = needsTransliteration 
    ? t('chat.typeInLatin', 'Type in English letters - converts to your language')
    : t('chat.typeMessage', 'Type a message...');

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      {/* Hint for non-Latin languages */}
      {needsTransliteration && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground/70 flex items-center gap-1.5 border-b border-border/30">
          <span>✨</span>
          <span>{t('chat.transliterationHint', 'Type in English letters → auto-converts to')} {senderLanguage}</span>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 flex items-end gap-2">
        <div className="flex-1 relative">
          {/* Hidden input for raw Latin text */}
          <input 
            type="hidden" 
            value={rawInput} 
            aria-hidden="true"
          />
          
          <Textarea
            ref={textareaRef}
            value={nativeText || ''}
            onChange={(e) => {
              // When native text shown, map back to raw input logic
              const newValue = e.target.value;
              
              // If user is deleting, remove one Latin char at a time from rawInput
              if (newValue.length < (nativeText?.length || 0)) {
                // Delete one Latin character at a time from rawInput
                const newRaw = rawInput.slice(0, -1);
                setRawInput(newRaw);
                if (newRaw.trim() && needsTransliteration) {
                  setNativeText(transliterateNow(newRaw));
                } else {
                  setNativeText(newRaw);
                }
              } else {
                // User is adding - figure out what was added
                const addedNative = newValue.slice(nativeText?.length || 0);
                
                // Check if added text is Latin (phonetic typing)
                if (isLatinText(addedNative)) {
                  const newRaw = rawInput + addedNative;
                  setRawInput(newRaw);
                  if (needsTransliteration) {
                    const native = transliterateNow(newRaw);
                    console.log('[Input] Latin typed:', addedNative, '| Raw:', newRaw, '→ Native:', native);
                    setNativeText(native);
                  } else {
                    setNativeText(newRaw);
                  }
                } else {
                  // Native text typed directly
                  setRawInput(newValue);
                  setNativeText(newValue);
                }
              }
              
              // Typing indicator
              if (onTyping) {
                onTyping(newValue.length > 0);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
              }
            }}
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
          disabled={!displayText.trim() || disabled || isSending}
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

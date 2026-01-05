/**
 * ChatMessageInput - Multilingual Chat Input with Auto Script Conversion
 * 
 * Flow:
 * 1. User types in Latin letters based on their mother tongue
 * 2. Live transliteration preview shows text in native script
 * 3. On send: Text is converted to sender's native script (non-blocking)
 * 4. Receiver sees message translated to their mother tongue
 * 5. Bi-directional: Works both ways seamlessly
 * 6. Non-blocking: Typing is never affected by translation
 */

import React, { memo, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send, Smile, Languages, Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useChatTranslation } from '@/hooks/useChatTranslation';
import { SpeechButton } from './SpeechButton';
import { getKeyboardLayout, type ScriptFamily } from '@/lib/translation/keyboard-layouts';

// Font family mapping by script
const SCRIPT_FONTS: Record<ScriptFamily | string, string> = {
  latin: "'Inter', 'Noto Sans', -apple-system, system-ui, sans-serif",
  cyrillic: "'Noto Sans', 'Arial', -apple-system, system-ui, sans-serif",
  greek: "'Noto Sans', 'Arial', -apple-system, system-ui, sans-serif",
  arabic: "'Noto Sans Arabic', 'Noto Naskh Arabic', 'Arabic Typesetting', -apple-system, sans-serif",
  hebrew: "'Noto Sans Hebrew', 'Arial Hebrew', -apple-system, sans-serif",
  devanagari: "'Noto Sans Devanagari', 'Mangal', 'Sanskrit Text', -apple-system, sans-serif",
  bengali: "'Noto Sans Bengali', 'Vrinda', 'Bangla MN', -apple-system, sans-serif",
  tamil: "'Noto Sans Tamil', 'Latha', 'Tamil MN', -apple-system, sans-serif",
  telugu: "'Noto Sans Telugu', 'Gautami', 'Telugu MN', -apple-system, sans-serif",
  malayalam: "'Noto Sans Malayalam', 'Kartika', 'Malayalam MN', -apple-system, sans-serif",
  kannada: "'Noto Sans Kannada', 'Tunga', 'Kannada MN', -apple-system, sans-serif",
  gujarati: "'Noto Sans Gujarati', 'Shruti', 'Gujarati MT', -apple-system, sans-serif",
  gurmukhi: "'Noto Sans Gurmukhi', 'Raavi', 'Gurmukhi MN', -apple-system, sans-serif",
  odia: "'Noto Sans Oriya', 'Kalinga', 'Oriya MN', -apple-system, sans-serif",
  sinhala: "'Noto Sans Sinhala', 'Iskoola Pota', 'Sinhala MN', -apple-system, sans-serif",
  cjk: "'Noto Sans SC', 'Noto Sans JP', 'Noto Sans KR', 'PingFang SC', 'Hiragino Sans', -apple-system, sans-serif",
  thai: "'Noto Sans Thai', 'Tahoma', 'Leelawadee UI', -apple-system, sans-serif",
  lao: "'Noto Sans Lao', 'DokChampa', -apple-system, sans-serif",
  khmer: "'Noto Sans Khmer', 'Khmer UI', -apple-system, sans-serif",
  myanmar: "'Noto Sans Myanmar', 'Myanmar Text', 'Padauk', -apple-system, sans-serif",
  tibetan: "'Noto Sans Tibetan', 'Microsoft Himalaya', -apple-system, sans-serif",
  ethiopic: "'Noto Sans Ethiopic', 'Nyala', -apple-system, sans-serif",
  armenian: "'Noto Sans Armenian', 'Sylfaen', -apple-system, sans-serif",
  georgian: "'Noto Sans Georgian', 'Sylfaen', -apple-system, sans-serif",
};

function getFontFamily(script: string): string {
  return SCRIPT_FONTS[script] || SCRIPT_FONTS.latin;
}

interface ChatMessageInputProps {
  onSendMessage: (message: string, originalMessage?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Current user ID */
  currentUserId?: string;
  /** Sender's mother tongue (user's language) */
  senderLanguage?: string;
  /** Partner's user ID */
  partnerId?: string;
  /** Receiver's mother tongue (partner's language) */
  receiverLanguage?: string;
}

export const ChatMessageInput: React.FC<ChatMessageInputProps> = memo(({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder,
  className,
  currentUserId = '',
  senderLanguage = 'english',
  partnerId = '',
  receiverLanguage = 'english',
}) => {
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Chat translation hook with live preview
  const { 
    livePreview,
    updateLivePreview,
    clearLivePreview,
    processOutgoingMessage,
    isLatinScript,
    isSameLanguage,
    needsTranslation,
    needsNativeConversion
  } = useChatTranslation({
    currentUserId,
    currentUserLanguage: senderLanguage,
    partnerId,
    partnerLanguage: receiverLanguage,
    debounceMs: 150
  });

  // Get keyboard layout for sender's language
  const keyboardLayout = useMemo(() => getKeyboardLayout(senderLanguage), [senderLanguage]);

  // Check if translation will be needed when message is sent
  const willNeedTranslation = needsTranslation;

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

  // Handle message change - allow all typing without blocking
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Always update message immediately - never block typing
    setMessage(value);
    handleTyping(value);
    
    // Update live preview for transliteration
    if (needsNativeConversion && isLatinScript(value)) {
      updateLivePreview(value);
    } else {
      // User is typing in native script directly or is English speaker
      clearLivePreview();
    }
  }, [handleTyping, isLatinScript, needsNativeConversion, updateLivePreview, clearLivePreview]);

  // Handle send - convert on-send in background
  const handleSend = useCallback(async () => {
    if (disabled || isComposing || isSending) return;

    const rawValue = textareaRef.current?.value ?? message;
    if (!rawValue.trim()) return;

    const trimmedMessage = rawValue.trim();

    // Clear UI immediately so fast typers aren't blocked
    setMessage('');
    clearLivePreview();
    onTyping?.(false);
    textareaRef.current?.focus();
    setIsSending(true);

    try {
      // Process outgoing message - converts to native script if needed
      const { nativeText, originalLatin } = await processOutgoingMessage(trimmedMessage);
      onSendMessage(nativeText, originalLatin || trimmedMessage);
    } catch {
      // On error, send original message
      onSendMessage(trimmedMessage, trimmedMessage);
    } finally {
      setIsSending(false);
    }
  }, [disabled, isComposing, isSending, message, clearLivePreview, onTyping, processOutgoingMessage, onSendMessage]);

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
  
  // Show native preview if available and different from input
  const showPreview = livePreview.nativePreview && 
                      livePreview.nativePreview !== message && 
                      needsNativeConversion;

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
        {/* Speech-to-Text button */}
        <SpeechButton
          mode="speech-to-text"
          sourceLanguage={senderLanguage}
          onSpeechToText={(text) => {
            setMessage(prev => prev ? `${prev} ${text}` : text);
          }}
          disabled={disabled || isSending}
          size="sm"
          className="flex-shrink-0"
        />

        {/* Speech-to-Speech button */}
        <SpeechButton
          mode="speech-to-speech"
          sourceLanguage={senderLanguage}
          targetLanguage={receiverLanguage}
          onSpeechToSpeech={(result) => {
            // Insert the original text as message
            if (result.originalText) {
              setMessage(prev => prev ? `${prev} ${result.originalText}` : result.originalText);
            }
          }}
          disabled={disabled || isSending}
          size="sm"
          className="flex-shrink-0"
        />

        {/* Message input */}
        <div className="flex-1 relative">
          {/* Native script preview - shown above input when converting */}
          {showPreview && (
            <div className="absolute -top-8 left-0 right-0 p-1.5 bg-primary/10 rounded text-xs text-muted-foreground border border-primary/20 z-10">
              <span className="text-[10px] text-muted-foreground/70">
                {livePreview.isConverting ? (
                  <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                ) : 'Preview: '}
              </span>
              <span className="text-foreground font-medium">{livePreview.nativePreview}</span>
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled || isSending}
            lang={keyboardLayout.keyboardTag}
            dir={keyboardLayout.dir}
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck="true"
            inputMode={keyboardLayout.inputMode}
            enterKeyHint={keyboardLayout.enterKeyHint}
            data-keyboard={keyboardLayout.keyboardTag}
            className={cn(
              'min-h-[44px] max-h-[120px] resize-none',
              'unicode-text',
              'py-3 px-4 pr-12',
              'rounded-xl border-muted-foreground/20',
              'focus-visible:ring-primary/50',
              'placeholder:text-muted-foreground/60',
              isComposing && 'ime-composing',
              keyboardLayout.dir === 'rtl' && 'text-right'
            )}
            style={{
              fontFamily: getFontFamily(keyboardLayout.script),
              unicodeBidi: keyboardLayout.dir === 'rtl' ? 'embed' : 'plaintext',
              writingMode: 'horizontal-tb',
            }}
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
          disabled={!message.trim() || disabled || isSending}
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

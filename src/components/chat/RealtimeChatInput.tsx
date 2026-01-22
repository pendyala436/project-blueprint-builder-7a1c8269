/**
 * Real-Time Chat Input with INSTANT Transliteration
 * ==================================================
 * Zero-lag typing experience for all 1000+ languages
 * 
 * 3 TYPING MODES:
 * 1. Native Mode - Type in mother tongue (native/Latin script)
 * 2. English Core - Type English, display English, receiver sees native
 * 3. English (Meaning-Based) - Type English, preview/display as native translation
 * 
 * TYPING: Pure offline dynamic transliteration (Gboard-style)
 * TRANSLATION: Uses translateText from translate.ts via Edge Function
 */

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';
import { dynamicTransliterate, isLatinScriptLanguage as checkLatinScript } from '@/lib/translation/dynamic-transliterator';
import { translateText, isSameLanguage } from '@/lib/translation/translate';
import { 
  TypingModeSelector, 
  type TypingMode, 
  useTypingMode,
  getSavedTypingMode 
} from './TypingModeSelector';

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
  const [nativeText, setNativeText] = useState(''); // Transliterated/translated native script
  const [previewText, setPreviewText] = useState(''); // Preview text for meaning-based mode
  const [isComposing, setIsComposing] = useState(false);
  const [isTranslatingPreview, setIsTranslatingPreview] = useState(false);
  
  // Use persistent typing mode hook
  const { mode: typingMode, setMode: setTypingMode } = useTypingMode();

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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
   * Generate preview for English (Meaning-Based) mode
   * Translates English input to sender's native language
   */
  const generateMeaningPreview = useCallback(async (englishText: string) => {
    if (!englishText.trim() || typingMode !== 'english-meaning') {
      setPreviewText('');
      return;
    }

    setIsTranslatingPreview(true);
    try {
      const result = await translateText(englishText, 'english', senderLanguage);
      if (result?.text) {
        setPreviewText(result.text);
      }
    } catch (e) {
      console.error('[RealtimeChatInput] Preview translation error:', e);
    } finally {
      setIsTranslatingPreview(false);
    }
  }, [typingMode, senderLanguage]);

  /**
   * Handle input change - behavior depends on typing mode
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRawInput(value);

    // Mode 1: Native Mode - transliterate if needed
    if (typingMode === 'native') {
      if (needsTransliteration) {
        const hasNativeChars = /[^\x00-\x7F\u00C0-\u024F]/.test(value);
        
        if (hasNativeChars) {
          setNativeText(value);
        } else if (value === '' || isLatinText(value)) {
          const native = value.trim() ? transliterateNow(value) : '';
          setNativeText(native);
        } else {
          setNativeText(value);
        }
      } else {
        setNativeText(value);
      }
      setPreviewText('');
    }
    // Mode 2: English Core - keep as English
    else if (typingMode === 'english-core') {
      setNativeText(value);
      setPreviewText('');
    }
    // Mode 3: English (Meaning-Based) - translate preview
    else if (typingMode === 'english-meaning') {
      setNativeText(value);
      
      // Debounced preview translation
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
      if (value.trim()) {
        previewTimeoutRef.current = setTimeout(() => {
          generateMeaningPreview(value);
        }, 500);
      } else {
        setPreviewText('');
      }
    }

    // Typing indicator
    if (onTyping) {
      onTyping(value.length > 0);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
  }, [typingMode, needsTransliteration, transliterateNow, generateMeaningPreview, onTyping]);

  /**
   * Handle send - behavior depends on typing mode
   */
  const handleSend = useCallback(() => {
    const rawMessage = rawInput.trim();
    if (!rawMessage || disabled || isComposing) return;

    // Clear input IMMEDIATELY
    const savedRaw = rawMessage;
    const savedNative = (nativeText || rawMessage).trim();
    const savedPreview = previewText.trim();
    const savedMode = typingMode;
    
    setRawInput('');
    setNativeText('');
    setPreviewText('');
    onTyping?.(false);

    // Process based on mode
    (async () => {
      let messageToStore = savedRaw;
      let senderView = savedRaw;
      let receiverView = savedRaw;

      try {
        const isEnglishSender = senderLanguage.toLowerCase() === 'english';
        const isEnglishReceiver = receiverLanguage.toLowerCase() === 'english';
        const sameLanguage = isSameLanguage(senderLanguage, receiverLanguage);

        // MODE 1: Native Mode
        if (savedMode === 'native') {
          messageToStore = savedNative;
          senderView = savedNative;
          
          if (!sameLanguage) {
            const result = await translateText(savedNative, senderLanguage, receiverLanguage);
            receiverView = result?.text || savedNative;
          } else {
            receiverView = savedNative;
          }
        }
        // MODE 2: English Core
        else if (savedMode === 'english-core') {
          messageToStore = savedRaw; // Store English
          senderView = savedRaw; // Display English to sender
          
          // Translate to receiver's language
          if (!isEnglishReceiver) {
            const result = await translateText(savedRaw, 'english', receiverLanguage);
            receiverView = result?.text || savedRaw;
          } else {
            receiverView = savedRaw;
          }
        }
        // MODE 3: English (Meaning-Based)
        else if (savedMode === 'english-meaning') {
          // Use preview if available, otherwise translate
          if (savedPreview) {
            senderView = savedPreview;
            messageToStore = savedPreview;
          } else if (!isEnglishSender) {
            const result = await translateText(savedRaw, 'english', senderLanguage);
            senderView = result?.text || savedRaw;
            messageToStore = senderView;
          } else {
            senderView = savedRaw;
            messageToStore = savedRaw;
          }
          
          // Translate to receiver's language
          if (!sameLanguage) {
            const result = await translateText(savedRaw, 'english', receiverLanguage);
            receiverView = result?.text || savedRaw;
          } else {
            receiverView = senderView;
          }
        }
      } catch (err) {
        console.error('[RealtimeChatInput] Translation error:', err);
      }

      onSendMessage(messageToStore, senderView, receiverView);
    })();

    textareaRef.current?.focus();
  }, [rawInput, nativeText, previewText, typingMode, disabled, isComposing, senderLanguage, receiverLanguage, onSendMessage, onTyping]);

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

  // IME handlers
  const handleCompositionStart = useCallback(() => setIsComposing(true), []);
  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [nativeText, rawInput]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  // Display text based on mode
  const getDisplayText = () => {
    if (typingMode === 'native' && needsTransliteration) {
      return rawInput; // Show Latin, preview shows native
    }
    return rawInput;
  };

  // Get placeholder based on mode
  const getPlaceholder = () => {
    switch (typingMode) {
      case 'native':
        return needsTransliteration 
          ? t('chat.typeInLatin', 'Type in English letters → converts to your language')
          : t('chat.typeMessage', 'Type a message...');
      case 'english-core':
        return t('chat.typeInEnglish', 'Type in English...');
      case 'english-meaning':
        return t('chat.typeEnglishMeaning', 'Type in English → shows as your language');
      default:
        return t('chat.typeMessage', 'Type a message...');
    }
  };

  // Show mode selector only for non-English users
  const showModeSelector = !isEnglishLanguage;

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur-sm', className)}>
      {/* Typing mode selector */}
      {showModeSelector && (
        <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
          <TypingModeSelector
            currentMode={typingMode}
            onModeChange={setTypingMode}
            userLanguage={senderLanguage}
            receiverLanguage={receiverLanguage}
            compact
          />
          <span className="text-xs text-muted-foreground max-w-[200px] truncate">
            {typingMode === 'native' && t('chat.typingInNative', `You & partner see native scripts`)}
            {typingMode === 'english-core' && t('chat.typingEnglishCore', `You see English → Partner sees ${receiverLanguage}`)}
            {typingMode === 'english-meaning' && t('chat.typingEnglishMeaning', `Type English → Both see native`)}
          </span>
        </div>
      )}

      {/* Native preview (Mode 1 with transliteration) */}
      {typingMode === 'native' && needsTransliteration && nativeText && nativeText !== rawInput && (
        <div className="px-4 py-2 border-b border-border/30">
          <div className="px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-base unicode-text" dir="auto">
            {nativeText}
          </div>
        </div>
      )}

      {/* Meaning-based preview (Mode 3) */}
      {typingMode === 'english-meaning' && (previewText || isTranslatingPreview) && (
        <div className="px-4 py-2 border-b border-border/30">
          <div className="px-3 py-2 bg-accent/30 border border-accent/50 rounded-lg text-base unicode-text" dir="auto">
            {isTranslatingPreview ? (
              <span className="text-muted-foreground italic">{t('chat.translating', 'Translating...')}</span>
            ) : (
              previewText
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {t('chat.meaningPreview', 'Preview (meaning-based translation)')}
          </div>
        </div>
      )}

      {/* Hint for transliteration */}
      {typingMode === 'native' && needsTransliteration && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground/70 flex items-center gap-1.5 border-b border-border/30">
          <span>✨</span>
          <span>{t('chat.transliterationHint', 'Type in English letters → auto-converts to')} {senderLanguage}</span>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={getDisplayText()}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder || getPlaceholder()}
            disabled={disabled}
            lang={typingMode === 'native' && !needsTransliteration ? senderLanguage : 'en'}
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
          disabled={!rawInput.trim() || disabled}
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

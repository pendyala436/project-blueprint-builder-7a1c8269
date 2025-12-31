/**
 * Multilingual Chat Input Component
 * Real-time Latin → native script transliteration while typing
 * Based on dl-translate (https://github.com/xhluca/dl-translate)
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LivePreview } from '@/hooks/useMultilingualChatSystem';
import { getLanguageInfo, isLatinScriptLanguage, isLatinScript, convertToNativeScript, translate } from '@/lib/dl-translate';

interface MultilingualChatInputProps {
  inputText: string;
  onInputChange: (text: string) => void;
  livePreview: LivePreview;
  onSend: () => void;
  isSending: boolean;
  userLanguage: string;
  placeholder?: string;
  disabled?: boolean;
}

export function MultilingualChatInput({
  inputText,
  onInputChange,
  livePreview,
  onSend,
  isSending,
  userLanguage,
  placeholder = 'Type your message...',
  disabled = false,
}: MultilingualChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isConverting, setIsConverting] = useState(false);
  const transliterationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const languageInfo = getLanguageInfo(userLanguage);
  // Only skip conversion if mother tongue is English - all other languages need conversion
  const needsNativeConversion = userLanguage.toLowerCase() !== 'english' && userLanguage.toLowerCase() !== 'en';

  // Real-time transliteration: Convert typing to native language
  useEffect(() => {
    // Skip if no conversion needed or empty input
    if (!needsNativeConversion || !inputText.trim()) {
      return;
    }

    // For non-Latin languages, skip if already in native script
    const isNonLatinLanguage = !isLatinScriptLanguage(userLanguage);
    if (isNonLatinLanguage && !isLatinScript(inputText)) {
      return;
    }

    // Debounce the conversion
    if (transliterationTimeoutRef.current) {
      clearTimeout(transliterationTimeoutRef.current);
    }

    setIsConverting(true);
    transliterationTimeoutRef.current = setTimeout(async () => {
      try {
        let result;
        if (isNonLatinLanguage) {
          // For non-Latin languages (Hindi, Arabic, etc.) - convert script
          result = await convertToNativeScript(inputText, userLanguage);
        } else {
          // For Latin languages (French, Spanish, etc.) - translate
          result = await translate(inputText, 'english', userLanguage);
        }
        
        if (result.isTranslated && result.text) {
          onInputChange(result.text); // Update input with native language
        }
      } catch (error) {
        console.error('Transliteration error:', error);
      } finally {
        setIsConverting(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (transliterationTimeoutRef.current) {
        clearTimeout(transliterationTimeoutRef.current);
      }
    };
  }, [inputText, needsNativeConversion, userLanguage, onInputChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isSending && inputText.trim()) {
        onSend();
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  return (
    <div className="space-y-2">
      {/* Input area */}
      <div className="relative flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={needsNativeConversion ? 'Type in English...' : placeholder}
            disabled={disabled || isSending}
            className={cn(
              "min-h-[44px] max-h-[200px] resize-none pr-10",
              "transition-all duration-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            dir={languageInfo?.rtl ? 'rtl' : 'ltr'}
            rows={1}
          />
          
          {/* Converting indicator */}
          {isConverting && (
            <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-muted-foreground" />
          )}
        </div>

        {/* Send button */}
        <Button
          onClick={onSend}
          disabled={disabled || isSending || !inputText.trim()}
          size="icon"
          className="h-[44px] w-[44px] shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground text-center">
        {needsNativeConversion 
          ? 'Type in English • Auto-converts to your language • Press Enter to send'
          : 'Press Enter to send • Shift+Enter for new line'
        }
      </p>
    </div>
  );
}

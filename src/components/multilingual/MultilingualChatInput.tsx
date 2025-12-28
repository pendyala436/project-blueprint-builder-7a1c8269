/**
 * Multilingual Chat Input Component
 * Real-time Latin → native script transliteration while typing
 * Based on dl-translate (https://github.com/xhluca/dl-translate)
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Languages, Type, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LivePreview } from '@/hooks/useMultilingualChatSystem';
import { getNativeName, getLanguageInfo } from '@/lib/dl-translate/languages';

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
  const [showPreview, setShowPreview] = useState(true);
  
  const languageInfo = getLanguageInfo(userLanguage);
  const nativeName = getNativeName(userLanguage);
  const showNativePreview = livePreview.nativeText && 
    livePreview.nativeText !== livePreview.inputText;

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
      {/* Live transliteration preview */}
      {showNativePreview && showPreview && (
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <Languages className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs font-normal">
                  {nativeName}
                </Badge>
                {livePreview.isConverting && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <p className="text-sm font-medium text-foreground break-words"
                 dir={languageInfo?.rtl ? 'rtl' : 'ltr'}>
                {livePreview.nativeText}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setShowPreview(false)}
            >
              <Type className="h-3 w-3" />
            </Button>
          </div>
          {livePreview.detectedScript && (
            <span className="absolute -top-2 right-2 px-1.5 py-0.5 text-[10px] bg-background border rounded">
              {livePreview.detectedScript}
            </span>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="relative flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              "min-h-[44px] max-h-[200px] resize-none pr-10",
              "transition-all duration-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            rows={1}
          />
          
          {/* Language indicator */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {languageInfo && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0.5 h-auto"
              >
                <Keyboard className="h-2.5 w-2.5 mr-1" />
                {languageInfo.code.toUpperCase()}
              </Badge>
            )}
          </div>
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
        Type in any language • Press Enter to send • Shift+Enter for new line
      </p>
    </div>
  );
}

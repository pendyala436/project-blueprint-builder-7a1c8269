/**
 * Multilingual Message Component
 * Displays chat messages with translation support
 * Based on dl-translate (https://github.com/xhluca/dl-translate)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Languages, Eye, EyeOff, Loader2, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getNativeName, getLanguageInfo } from '@/lib/dl-translate/languages';
import type { MultilingualMessage as MessageType } from '@/hooks/useMultilingualChatSystem';

interface MultilingualMessageProps {
  message: MessageType;
  isOwnMessage: boolean;
  onTranslate?: (messageId: string) => Promise<void>;
  isTranslating?: boolean;
  showOriginal?: boolean;
}

export function MultilingualMessage({
  message,
  isOwnMessage,
  onTranslate,
  isTranslating = false,
  showOriginal: initialShowOriginal = false,
}: MultilingualMessageProps) {
  const [showOriginal, setShowOriginal] = useState(initialShowOriginal);
  
  const languageInfo = getLanguageInfo(message.senderLanguage);
  const nativeName = getNativeName(message.senderLanguage);
  const isRtl = languageInfo?.rtl || false;
  
  // Display text based on translation state
  const displayText = showOriginal || !message.translatedMessage
    ? message.originalMessage
    : message.translatedMessage;
  
  const hasTranslation = !!message.translatedMessage;
  const showTranslationBadge = message.isTranslated && !isOwnMessage;

  return (
    <div
      className={cn(
        "flex flex-col max-w-[85%] sm:max-w-[70%]",
        isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      {/* Message bubble */}
      <div
        className={cn(
          "relative px-4 py-2.5 rounded-2xl",
          "transition-all duration-200",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm"
        )}
      >
        {/* Language badge */}
        {!isOwnMessage && (
          <div className="flex items-center gap-1.5 mb-1">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] px-1.5 py-0 h-4",
                isOwnMessage 
                  ? "border-primary-foreground/30 text-primary-foreground/80"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {nativeName}
            </Badge>
            {showTranslationBadge && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0 h-4 gap-0.5"
              >
                <Languages className="h-2.5 w-2.5" />
                Translated
              </Badge>
            )}
          </div>
        )}

        {/* Message text */}
        <p
          className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap break-words",
            isRtl && !isOwnMessage && "text-right"
          )}
          dir={isRtl && !showOriginal ? 'rtl' : 'ltr'}
        >
          {displayText}
        </p>

        {/* Original text toggle (for translated messages) */}
        {hasTranslation && !isOwnMessage && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-current/10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 px-2 text-xs gap-1",
                      isOwnMessage 
                        ? "hover:bg-primary-foreground/10 text-primary-foreground/70"
                        : "hover:bg-foreground/5"
                    )}
                    onClick={() => setShowOriginal(!showOriginal)}
                  >
                    {showOriginal ? (
                      <>
                        <EyeOff className="h-3 w-3" />
                        Hide original
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" />
                        Show original
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showOriginal ? 'Show translated text' : 'Show original text'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Translate button (for untranslated incoming messages) */}
        {!hasTranslation && !isOwnMessage && onTranslate && (
          <div className="mt-2 pt-2 border-t border-current/10">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={() => onTranslate(message.id)}
              disabled={isTranslating}
            >
              {isTranslating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Languages className="h-3 w-3" />
                  Translate
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Timestamp and status */}
      <div className={cn(
        "flex items-center gap-1.5 mt-1 px-1",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}>
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(message.createdAt), 'HH:mm')}
        </span>
        {isOwnMessage && (
          <Check className="h-3 w-3 text-muted-foreground" />
        )}
        {message.detectedLanguage && message.detectedLanguage !== message.senderLanguage && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3">
            Detected: {message.detectedLanguage}
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * TranslatedTypingIndicator Component
 * DL-200 STRICT: Display ONLY viewer's language text
 * 
 * Shows typing indicator with real-time translation to recipient's language
 * NO original text shown, NO language names, NO prefixes/suffixes
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TypingIndicator } from '@/lib/translation/useRealtimeTranslation';

interface TranslatedTypingIndicatorProps {
  indicator: TypingIndicator;
  partnerName?: string;
  className?: string;
}

export function TranslatedTypingIndicator({
  indicator,
  partnerName = 'Partner',
  className
}: TranslatedTypingIndicatorProps) {
  const { originalText, translatedText, isTranslating, senderLanguage, recipientLanguage } = indicator;
  
  // DL-200 STRICT: Show ONLY viewer's language
  // If same language, show original; otherwise show translated
  const isSameLanguage = senderLanguage.toLowerCase() === recipientLanguage.toLowerCase();
  const displayText = isSameLanguage ? originalText : (translatedText || originalText);

  return (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50 animate-pulse",
      className
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {partnerName} is typing...
          </span>
          {isTranslating && (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          )}
        </div>
        
        {/* DL-200 STRICT: Display ONLY viewer's language text */}
        {/* NO original text, NO language indicators */}
        <p className="text-sm text-foreground/80 break-words">
          {displayText}
          <span className="inline-flex items-center ml-1">
            <span className="w-1 h-4 bg-primary/60 animate-pulse rounded-full" />
            <span className="w-1 h-4 bg-primary/40 animate-pulse rounded-full ml-0.5" style={{ animationDelay: '0.2s' }} />
            <span className="w-1 h-4 bg-primary/20 animate-pulse rounded-full ml-0.5" style={{ animationDelay: '0.4s' }} />
          </span>
        </p>
      </div>
    </div>
  );
}

/**
 * Simple typing dots indicator
 */
export function TypingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
    </div>
  );
}

/**
 * Typing Indicator with Translation Preview
 * Shows partner's typing status with real-time transliterated text
 */

import { Badge } from '@/components/ui/badge';
import { Languages, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNativeName, getLanguageInfo } from '@/lib/dl-translate/languages';
import type { TypingIndicator as TypingIndicatorType } from '@/hooks/useMultilingualChatSystem';

interface TypingIndicatorProps {
  indicator: TypingIndicatorType;
  partnerName?: string;
}

export function TypingIndicator({
  indicator,
  partnerName = 'Partner',
}: TypingIndicatorProps) {
  if (!indicator.isTyping) return null;

  const languageInfo = indicator.language ? getLanguageInfo(indicator.language) : null;
  const nativeName = indicator.language ? getNativeName(indicator.language) : null;
  const isRtl = languageInfo?.rtl || false;

  return (
    <div className="flex flex-col max-w-[70%] mr-auto items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-muted/50 border border-muted">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground font-medium">
            {partnerName} is typing
          </span>
          {nativeName && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {nativeName}
            </Badge>
          )}
        </div>

        {indicator.previewText ? (
          <p
            className="text-sm text-foreground/80"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {indicator.previewText}
          </p>
        ) : (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}

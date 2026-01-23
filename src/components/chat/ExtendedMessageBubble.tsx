/**
 * Extended Message Bubble with Dual Display
 * ==========================================
 * 
 * Shows BOTH native message AND English meaning for all messages
 * 
 * DISPLAY FORMAT:
 * ┌─────────────────────────────┐
 * │ Native message (large)      │
 * │ 🌐 English meaning (small)  │
 * │                      12:34 ✓│
 * └─────────────────────────────┘
 */

import React, { memo, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Globe } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

export interface ExtendedMessageData {
  originalInput?: string;
  detectedLanguage?: string;
  englishMeaning?: string;
  senderNativeText?: string;
  senderEnglishHint?: string;
  receiverNativeText?: string;
  receiverEnglishHint?: string;
}

interface ExtendedMessageBubbleProps {
  id: string;
  // Core content
  message: string;              // Primary message text
  englishMeaning?: string;      // English meaning to show below
  // Extended data
  messageData?: ExtendedMessageData;
  // Metadata
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  currentUserId: string;
  // State
  timestamp: string;
  isRead?: boolean;
  isDelivered?: boolean;
  // Options
  showEnglishMeaning?: boolean; // Whether to show English hint
  className?: string;
}

export const ExtendedMessageBubble: React.FC<ExtendedMessageBubbleProps> = memo(({
  id,
  message,
  englishMeaning,
  messageData,
  senderId,
  senderName,
  senderAvatar,
  currentUserId,
  timestamp,
  isRead,
  isDelivered,
  showEnglishMeaning = true,
  className,
}) => {
  const isSentByMe = senderId === currentUserId;

  // Determine what to display
  const { primaryText, englishHint } = useMemo(() => {
    if (messageData) {
      if (isSentByMe) {
        // Sender sees their native text + English hint
        return {
          primaryText: messageData.senderNativeText || message,
          englishHint: messageData.senderEnglishHint || messageData.englishMeaning || englishMeaning,
        };
      } else {
        // Receiver sees their native text + English hint
        return {
          primaryText: messageData.receiverNativeText || message,
          englishHint: messageData.receiverEnglishHint || messageData.englishMeaning || englishMeaning,
        };
      }
    }
    
    return {
      primaryText: message,
      englishHint: englishMeaning,
    };
  }, [isSentByMe, message, englishMeaning, messageData]);

  // Format timestamp
  const formattedTime = useMemo(() => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    }
    return format(date, 'MMM d, HH:mm');
  }, [timestamp]);

  // Initials for avatar
  const initials = useMemo(() => {
    return senderName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [senderName]);

  // Should we show the English hint?
  const shouldShowEnglishHint = showEnglishMeaning && 
    englishHint && 
    englishHint !== primaryText &&
    englishHint.toLowerCase() !== primaryText.toLowerCase();

  return (
    <div
      className={cn(
        'flex gap-2 px-4 py-1',
        isSentByMe ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar (only for received messages) */}
      {!isSentByMe && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={senderAvatar || undefined} alt={senderName} />
          <AvatarFallback className="text-xs bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isSentByMe
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        )}
      >
        {/* Sender name (for received messages) */}
        {!isSentByMe && (
          <p className="text-xs font-medium opacity-70 mb-1">
            {senderName}
          </p>
        )}

        {/* Primary message content (native language) */}
        <p
          className="text-sm unicode-text whitespace-pre-wrap break-words leading-relaxed"
          dir="auto"
        >
          {primaryText}
        </p>

        {/* English meaning hint (small, below message) */}
        {shouldShowEnglishHint && (
          <div className={cn(
            'mt-1.5 pt-1.5 border-t flex items-start gap-1',
            isSentByMe 
              ? 'border-primary-foreground/20' 
              : 'border-foreground/10'
          )}>
            <Globe className={cn(
              'h-3 w-3 flex-shrink-0 mt-0.5',
              isSentByMe ? 'text-primary-foreground/50' : 'text-muted-foreground'
            )} />
            <p className={cn(
              'text-xs unicode-text whitespace-pre-wrap break-words leading-relaxed',
              isSentByMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )} dir="auto">
              {englishHint}
            </p>
          </div>
        )}

        {/* Timestamp and status */}
        <div className={cn(
          'flex items-center gap-1.5 mt-1.5',
          isSentByMe ? 'justify-end' : 'justify-start'
        )}>
          {/* Timestamp */}
          <span className={cn(
            'text-[10px]',
            isSentByMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )}>
            {formattedTime}
          </span>

          {/* Read/Delivered status (for sent messages) */}
          {isSentByMe && (
            <span className="text-primary-foreground/60">
              {isRead ? (
                <CheckCheck className="h-3.5 w-3.5" />
              ) : isDelivered ? (
                <Check className="h-3.5 w-3.5" />
              ) : null}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

ExtendedMessageBubble.displayName = 'ExtendedMessageBubble';

export default ExtendedMessageBubble;

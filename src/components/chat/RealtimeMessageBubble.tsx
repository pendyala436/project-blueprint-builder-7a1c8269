/**
 * Real-Time Message Bubble with Translation Display
 * ===================================================
 * Shows sender/receiver views based on mother tongue
 * Supports all 300+ languages with proper fonts
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Languages, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface RealtimeMessageBubbleProps {
  id: string;
  // Content views
  originalText: string;         // Raw input (Latin)
  senderView: string;           // What sender sees (native script)
  receiverView: string;         // What receiver sees (translated)
  // Metadata
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  senderLanguage?: string;
  currentUserId: string;
  currentUserLanguage: string;
  // State
  timestamp: string;
  isRead?: boolean;
  isDelivered?: boolean;
  wasTranslated?: boolean;
  wasTransliterated?: boolean;
  // Options
  showTranslationToggle?: boolean;
  className?: string;
}

export const RealtimeMessageBubble: React.FC<RealtimeMessageBubbleProps> = memo(({
  id,
  originalText,
  senderView,
  receiverView,
  senderId,
  senderName,
  senderAvatar,
  senderLanguage,
  currentUserId,
  currentUserLanguage,
  timestamp,
  isRead,
  isDelivered,
  wasTranslated,
  wasTransliterated,
  showTranslationToggle = true,
  className,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  
  const isSentByMe = senderId === currentUserId;

  // Determine which view to show based on who is viewing
  const displayContent = useMemo(() => {
    if (isSentByMe) {
      // I'm the sender - show my native view
      return showOriginal ? originalText : senderView;
    } else {
      // I'm the receiver - show translated view in my language
      return showOriginal ? senderView : receiverView;
    }
  }, [isSentByMe, showOriginal, originalText, senderView, receiverView]);

  // Language for display (for font rendering)
  const displayLanguage = useMemo(() => {
    if (isSentByMe) {
      return senderLanguage || currentUserLanguage;
    }
    return showOriginal ? senderLanguage : currentUserLanguage;
  }, [isSentByMe, showOriginal, senderLanguage, currentUserLanguage]);

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

  // Toggle original/translated
  const handleToggle = useCallback(() => {
    setShowOriginal(prev => !prev);
  }, []);

  // Initials for avatar
  const initials = useMemo(() => {
    return senderName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [senderName]);

  // Show translation toggle if message was translated
  const canToggle = showTranslationToggle && (wasTranslated || wasTransliterated);

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
          'max-w-[75%] rounded-2xl px-4 py-2',
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

        {/* Message content */}
        <p
          className="text-sm unicode-text whitespace-pre-wrap break-words leading-relaxed"
          dir="auto"
          lang={displayLanguage}
        >
          {displayContent}
        </p>

        {/* Translation toggle & metadata */}
        <div className={cn(
          'flex items-center gap-2 mt-1',
          isSentByMe ? 'justify-end' : 'justify-start'
        )}>
          {/* Translation toggle */}
          {canToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className={cn(
                'h-5 px-1.5 text-[10px] gap-0.5',
                isSentByMe 
                  ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
              )}
            >
              <Languages className="h-3 w-3" />
              {showOriginal ? (
                <>
                  <span>Translated</span>
                  <ChevronDown className="h-3 w-3" />
                </>
              ) : (
                <>
                  <span>Original</span>
                  <ChevronUp className="h-3 w-3" />
                </>
              )}
            </Button>
          )}

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

RealtimeMessageBubble.displayName = 'RealtimeMessageBubble';

export default RealtimeMessageBubble;

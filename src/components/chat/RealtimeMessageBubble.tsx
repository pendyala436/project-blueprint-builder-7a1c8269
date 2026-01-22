/**
 * Real-Time Message Bubble with 9-Combination Mode Support
 * =========================================================
 * 
 * Shows different views based on:
 * - Who is viewing (sender vs receiver)
 * - Viewer's typing mode preference (native, english-core, english-meaning)
 * 
 * 9 COMBINATIONS:
 * Sender Mode × Receiver Mode = 9 display scenarios
 * 
 * Message Data:
 * - originalEnglish: English text for English Core mode
 * - senderNative: Sender's native language view
 * - receiverNative: Receiver's native language view
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Languages, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { type TypingMode, getSavedTypingMode } from './TypingModeSelector';

/**
 * Extended message views for 9-combination support
 */
export interface MessageViewData {
  originalEnglish?: string;   // English text
  senderNative?: string;      // Sender's native language
  receiverNative?: string;    // Receiver's native language
  senderMode?: TypingMode;    // What mode sender used
}

interface RealtimeMessageBubbleProps {
  id: string;
  // Content views
  originalText: string;         // Raw input (Latin)
  senderView: string;           // What sender sees (native script)
  receiverView: string;         // What receiver sees (translated)
  // Extended views for 9 combinations
  messageViews?: MessageViewData;
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
  messageViews,
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
  const [showAlternateView, setShowAlternateView] = useState(false);
  
  const isSentByMe = senderId === currentUserId;
  
  // Get receiver's current typing mode preference
  const viewerMode = useMemo(() => getSavedTypingMode(), []);

  /**
   * Determine display content based on:
   * 1. Who is viewing (sender vs receiver)
   * 2. Viewer's typing mode preference
   * 
   * 9 COMBINATIONS:
   * ---------------
   * Sender Mode | Receiver Mode | Receiver Sees
   * ------------|---------------|---------------
   * native      | native        | receiverNative
   * native      | english-core  | originalEnglish
   * native      | english-meaning| receiverNative
   * english-core| native        | receiverNative
   * english-core| english-core  | originalEnglish
   * english-core| english-meaning| receiverNative
   * english-meaning| native     | receiverNative
   * english-meaning| english-core| originalEnglish
   * english-meaning| english-meaning| receiverNative
   */
  const displayContent = useMemo(() => {
    // SENDER viewing their own message
    if (isSentByMe) {
      // When toggled, show English version if available
      if (showAlternateView) {
        return messageViews?.originalEnglish || originalText;
      }
      // Show sender's primary view based on their mode
      return senderView;
    }
    
    // RECEIVER viewing the message
    // Check if we have extended message views
    if (messageViews) {
      const { originalEnglish, receiverNative } = messageViews;
      
      // Receiver's view depends on their mode preference
      switch (viewerMode) {
        case 'english-core':
          // Receiver prefers English - show English version
          if (showAlternateView) {
            return receiverNative || receiverView;
          }
          return originalEnglish || receiverView;
          
        case 'native':
        case 'english-meaning':
        default:
          // Receiver prefers native language
          if (showAlternateView) {
            return originalEnglish || senderView;
          }
          return receiverNative || receiverView;
      }
    }
    
    // Fallback for legacy messages without extended views
    if (showAlternateView) {
      return senderView;
    }
    return receiverView;
  }, [isSentByMe, showAlternateView, viewerMode, senderView, receiverView, originalText, messageViews]);

  // Secondary text (shown smaller below primary)
  const secondaryContent = useMemo(() => {
    if (!messageViews) return null;
    
    // For receivers in english-core mode, show native as secondary
    if (!isSentByMe && viewerMode === 'english-core' && !showAlternateView) {
      const native = messageViews.receiverNative || receiverView;
      const english = messageViews.originalEnglish;
      if (native !== english) {
        return native;
      }
    }
    
    // For receivers in native mode, show English as secondary (dual display)
    if (!isSentByMe && viewerMode !== 'english-core' && !showAlternateView) {
      const english = messageViews.originalEnglish;
      const native = messageViews.receiverNative || receiverView;
      if (english && english !== native) {
        return english;
      }
    }
    
    return null;
  }, [isSentByMe, viewerMode, showAlternateView, messageViews, receiverView]);

  // Language for display (for font rendering)
  const displayLanguage = useMemo(() => {
    if (isSentByMe) {
      return senderLanguage || currentUserLanguage;
    }
    
    // Receiver's display language based on their mode
    if (viewerMode === 'english-core' && !showAlternateView) {
      return 'english';
    }
    return showAlternateView ? senderLanguage : currentUserLanguage;
  }, [isSentByMe, showAlternateView, viewerMode, senderLanguage, currentUserLanguage]);

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

  // Toggle alternate view
  const handleToggle = useCallback(() => {
    setShowAlternateView(prev => !prev);
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

  // Show translation toggle if message has multiple views
  const canToggle = showTranslationToggle && (
    wasTranslated || 
    wasTransliterated || 
    (messageViews?.originalEnglish && messageViews.originalEnglish !== (messageViews.receiverNative || receiverView))
  );

  // Toggle button label based on current view
  const toggleLabel = useMemo(() => {
    if (isSentByMe) {
      return showAlternateView ? 'Native' : 'English';
    }
    if (viewerMode === 'english-core') {
      return showAlternateView ? 'English' : 'Native';
    }
    return showAlternateView ? 'Native' : 'English';
  }, [isSentByMe, viewerMode, showAlternateView]);

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

        {/* Primary message content */}
        <p
          className="text-sm unicode-text whitespace-pre-wrap break-words leading-relaxed"
          dir="auto"
          lang={displayLanguage}
        >
          {displayContent}
        </p>

        {/* Secondary content (dual display) */}
        {secondaryContent && (
          <div className={cn(
            'mt-1.5 pt-1.5 border-t flex items-start gap-1',
            isSentByMe 
              ? 'border-primary-foreground/20' 
              : 'border-foreground/10'
          )}>
            <Globe className={cn(
              'h-3 w-3 mt-0.5 flex-shrink-0',
              isSentByMe ? 'text-primary-foreground/50' : 'text-muted-foreground'
            )} />
            <p className={cn(
              'text-xs unicode-text whitespace-pre-wrap break-words',
              isSentByMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )} dir="auto">
              {secondaryContent}
            </p>
          </div>
        )}

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
              {showAlternateView ? (
                <>
                  <span>{toggleLabel}</span>
                  <ChevronDown className="h-3 w-3" />
                </>
              ) : (
                <>
                  <span>{toggleLabel}</span>
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

/**
 * Bidirectional Message Bubble Component
 * =======================================
 * 
 * Displays messages with:
 * - Primary text in viewer's mother tongue (native or Latin script)
 * - English meaning below in small text
 * - Translation status indicators
 * - Support for RTL languages
 */

import React, { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Globe, Languages, Eye, EyeOff, Check, CheckCheck } from 'lucide-react';
import {
  type MeaningBasedMessage,
  formatMessageTime,
  getTextDirection,
  isSameLanguage,
  normalizeLanguage,
} from '@/lib/translation/meaning-based-chat';

// ============================================================
// TYPES
// ============================================================

export interface BidirectionalMessageBubbleProps {
  message: MeaningBasedMessage;
  viewerLanguage: string;
  isMe: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  showEnglishMeaning?: boolean; // DEPRECATED: English is never shown to users
  showOriginalToggle?: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
  className?: string;
}

// ============================================================
// MESSAGE STATUS
// ============================================================

const MessageStatus = memo<{ isDelivered?: boolean; isRead?: boolean; isMe: boolean }>(
  ({ isDelivered, isRead, isMe }) => {
    if (!isMe) return null;
    
    if (isRead) {
      return <CheckCheck className="h-3.5 w-3.5 text-primary" aria-label="Read" />;
    }
    if (isDelivered) {
      return <Check className="h-3.5 w-3.5 text-muted-foreground" aria-label="Delivered" />;
    }
    return null;
  }
);
MessageStatus.displayName = 'MessageStatus';

// ============================================================
// TRANSLATION BADGE
// ============================================================

const TranslationBadge = memo<{ 
  wasTranslated: boolean; 
  wasTransliterated: boolean; 
  confidence: number;
  isMe: boolean;
}>(({ wasTranslated, wasTransliterated, confidence, isMe }) => {
  if (!wasTranslated && !wasTransliterated) return null;
  
  return (
    <div className={cn(
      'flex items-center gap-1 text-[9px]',
      isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
    )}>
      <Languages className="h-2.5 w-2.5" />
      <span>
        {wasTranslated ? 'Translated' : 'Script converted'}
        {' • '}
        {Math.round(confidence * 100)}%
      </span>
    </div>
  );
});
TranslationBadge.displayName = 'TranslationBadge';

// ============================================================
// MAIN COMPONENT
// ============================================================

export const BidirectionalMessageBubble: React.FC<BidirectionalMessageBubbleProps> = memo(({
  message,
  viewerLanguage,
  isMe,
  senderName,
  senderAvatar,
  showEnglishMeaning = true,
  showOriginalToggle = true,
  isDelivered,
  isRead,
  className,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  
  // Determine which view to show based on viewer's role
  const normViewer = normalizeLanguage(viewerLanguage);
  const isSenderView = isSameLanguage(normViewer, message.senderLanguage);
  
  // Get display text
  const primaryText = isSenderView ? message.senderView : message.receiverView;
  const originalText = message.originalInput;
  const englishText = message.extractedMeaning;
  
  // Get text direction
  const textDir = isSenderView 
    ? getTextDirection(message.senderLanguage)
    : getTextDirection(message.receiverLanguage);
  
  // Should show English meaning?
  const shouldShowEnglish = showEnglishMeaning && 
    englishText && 
    englishText.toLowerCase() !== primaryText.toLowerCase();
  
  // Can toggle original?
  const canToggleOriginal = showOriginalToggle && 
    originalText !== primaryText &&
    originalText.toLowerCase() !== primaryText.toLowerCase();
  
  // Toggle handler
  const handleToggleOriginal = useCallback(() => {
    setShowOriginal(prev => !prev);
  }, []);
  
  // Display text
  const displayText = showOriginal ? originalText : primaryText;
  const displayDir = showOriginal ? 'auto' : textDir;
  
  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%] sm:max-w-[75%] animate-fade-in',
        isMe ? 'ms-auto flex-row-reverse' : 'me-auto',
        className
      )}
    >
      {/* Avatar for received messages */}
      {!isMe && senderAvatar !== undefined && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={senderAvatar || undefined} alt={senderName || 'User'} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {(senderName || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
        {/* Sender name for received messages */}
        {!isMe && senderName && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {senderName}
          </span>
        )}
        
        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isMe
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          {/* Primary text */}
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap break-words unicode-text"
            dir={displayDir}
          >
            {displayText}
          </p>
          
          {/* English meaning - ALWAYS shown below in small letters */}
          {englishText && !showOriginal && (
            <div className={cn(
              'mt-1.5 pt-1 border-t flex items-start gap-1',
              isMe 
                ? 'border-primary-foreground/20' 
                : 'border-foreground/10'
            )}>
              <Globe className={cn(
                'h-2.5 w-2.5 flex-shrink-0 mt-0.5',
                isMe ? 'text-primary-foreground/50' : 'text-muted-foreground'
              )} />
              <p className={cn(
                'text-[10px] whitespace-pre-wrap break-words leading-relaxed',
                isMe ? 'text-primary-foreground/60' : 'text-muted-foreground/80'
              )}>
                {englishText}
              </p>
            </div>
          )}
          
          {/* Toggle original button */}
          {canToggleOriginal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleOriginal}
              className={cn(
                'h-auto p-0 mt-2 text-xs font-normal gap-1',
                isMe
                  ? 'text-primary-foreground/60 hover:text-primary-foreground hover:bg-transparent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
              )}
            >
              {showOriginal ? (
                <>
                  <Eye className="h-3 w-3" />
                  Show translated
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" />
                  Show original
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Footer: Timestamp, status, translation badge */}
        <div className={cn(
          'flex items-center gap-2 mt-0.5 px-1',
          isMe ? 'flex-row-reverse' : ''
        )}>
          <span className="text-[10px] text-muted-foreground">
            {formatMessageTime(message.timestamp)}
          </span>
          
          <MessageStatus isDelivered={isDelivered} isRead={isRead} isMe={isMe} />
          
          <TranslationBadge
            wasTranslated={message.wasTranslated}
            wasTransliterated={message.wasTransliterated}
            confidence={message.confidence}
            isMe={isMe}
          />
        </div>
      </div>
    </div>
  );
});

BidirectionalMessageBubble.displayName = 'BidirectionalMessageBubble';

export default BidirectionalMessageBubble;

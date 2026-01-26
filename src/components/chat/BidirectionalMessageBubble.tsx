/**
 * Bidirectional Message Bubble Component - Mother Tongue First
 * =============================================================
 * 
 * Displays messages with:
 * - PRIMARY: Viewer's mother tongue (native script) - LARGE
 * - SECONDARY: English meaning below in small text
 * 
 * RULES:
 * - Sender sees: Their mother tongue (senderView) + English meaning below
 * - Receiver sees: Their mother tongue (receiverView) + English meaning below
 * - NO English as primary display - only as meaning reference
 */

import React, { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Globe, Eye, EyeOff, Check, CheckCheck, Languages } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface MeaningBasedMessage {
  id: string;
  originalInput: string;
  extractedMeaning: string;
  confidence: number;
  senderView: string;
  senderScript: 'native' | 'latin';
  receiverView: string;
  receiverScript: 'native' | 'latin';
  senderLanguage: string;
  receiverLanguage: string;
  timestamp: string;
  wasTranslated: boolean;
  wasTransliterated: boolean;
  sameLanguage: boolean;
}

export interface BidirectionalMessageBubbleProps {
  message: MeaningBasedMessage;
  viewerLanguage: string;
  isMe: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  showEnglishMeaning?: boolean;
  showOriginalToggle?: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
  className?: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function normalizeLanguage(lang: string): string {
  if (!lang || typeof lang !== 'string') return 'english';
  return lang.toLowerCase().trim() || 'english';
}

function isSameLanguage(lang1: string, lang2: string): boolean {
  const n1 = normalizeLanguage(lang1);
  const n2 = normalizeLanguage(lang2);
  if (n1 === n2) return true;
  const aliases: Record<string, string> = { 'bangla': 'bengali', 'oriya': 'odia' };
  return (aliases[n1] || n1) === (aliases[n2] || n2);
}

function formatMessageTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getTextDirection(lang: string): 'ltr' | 'rtl' {
  const rtlLanguages = new Set(['arabic', 'hebrew', 'persian', 'urdu', 'farsi', 'pashto', 'sindhi', 'kashmiri']);
  return rtlLanguages.has(normalizeLanguage(lang)) ? 'rtl' : 'ltr';
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
  const normSender = normalizeLanguage(message.senderLanguage);
  const isSenderViewer = isSameLanguage(normViewer, normSender);
  
  // PRIMARY TEXT: Viewer's mother tongue (senderView if viewer is sender, receiverView if viewer is receiver)
  const primaryText = isSenderViewer ? message.senderView : message.receiverView;
  const originalText = message.originalInput;
  const englishText = message.extractedMeaning;
  
  // Get text direction
  const textDir = isSenderViewer 
    ? getTextDirection(message.senderLanguage)
    : getTextDirection(message.receiverLanguage);
  
  // Show English meaning only if different from primary text
  const shouldShowEnglish = showEnglishMeaning && 
    englishText && 
    englishText.toLowerCase().trim() !== primaryText.toLowerCase().trim();
  
  // Can toggle original (only if original is different from display)
  const canToggleOriginal = showOriginalToggle && 
    originalText !== primaryText &&
    originalText.toLowerCase().trim() !== primaryText.toLowerCase().trim();
  
  // Toggle handler
  const handleToggleOriginal = useCallback(() => {
    setShowOriginal(prev => !prev);
  }, []);
  
  // What to display
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

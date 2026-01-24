/**
 * Bidirectional Chat Container Component
 * =======================================
 * 
 * Complete chat interface with:
 * - Multi-input support (keyboard, voice, phonetic, native, mixed)
 * - Meaning-based translation
 * - Bidirectional message display
 * - English meaning always visible
 * 
 * OFFLINE ONLY - Uses Universal Translation System
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Languages, Settings2, ChevronDown } from 'lucide-react';
import { BidirectionalChatInput } from './BidirectionalChatInput';
import { BidirectionalMessageBubble } from './BidirectionalMessageBubble';
import { type MeaningBasedMessage } from '@/lib/translation/meaning-based-chat';
import { type UserLanguageProfile } from '@/lib/offline-translation/types';
import {
  normalizeLanguage,
  isSameLanguage,
} from '@/lib/translation/universal-offline-engine';

// ============================================================
// TYPES
// ============================================================

export interface BidirectionalChatContainerProps {
  senderProfile: UserLanguageProfile;
  receiverProfile: UserLanguageProfile;
  messages: MeaningBasedMessage[];
  onSendMessage: (message: MeaningBasedMessage) => void;
  onTyping?: (isTyping: boolean) => void;
  partnerName?: string;
  partnerAvatar?: string | null;
  partnerIsTyping?: boolean;
  showEnglishMeaning?: boolean;
  disabled?: boolean;
  className?: string;
}

// ============================================================
// TYPING INDICATOR
// ============================================================

const TypingIndicator = memo<{ name?: string }>(({ name }) => (
  <div className="flex items-center gap-2 px-4 py-2">
    <div className="flex gap-1">
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
    <span className="text-xs text-muted-foreground">
      {name ? `${name} is typing...` : 'Typing...'}
    </span>
  </div>
));
TypingIndicator.displayName = 'TypingIndicator';

// ============================================================
// DATE SEPARATOR
// ============================================================

const DateSeparator = memo<{ date: string }>(({ date }) => (
  <div className="flex items-center justify-center my-4" role="separator">
    <div className="bg-muted/50 px-3 py-1 rounded-full">
      <span className="text-xs text-muted-foreground font-medium">
        {date}
      </span>
    </div>
  </div>
));
DateSeparator.displayName = 'DateSeparator';

// ============================================================
// LANGUAGE INDICATOR
// ============================================================

const LanguageIndicator = memo<{
  senderLanguage: string;
  receiverLanguage: string;
  sameLanguage: boolean;
}>(({ senderLanguage, receiverLanguage, sameLanguage }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b">
    <Languages className="h-4 w-4 text-muted-foreground" />
    <div className="flex items-center gap-1.5 text-xs">
      <Badge variant="secondary" className="h-5 text-[10px]">
        {senderLanguage}
      </Badge>
      {!sameLanguage && (
        <>
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline" className="h-5 text-[10px]">
            {receiverLanguage}
          </Badge>
        </>
      )}
    </div>
    {sameLanguage && (
      <span className="text-[10px] text-muted-foreground">
        (Same language - no translation)
      </span>
    )}
  </div>
));
LanguageIndicator.displayName = 'LanguageIndicator';

// ============================================================
// SCROLL TO BOTTOM BUTTON
// ============================================================

const ScrollToBottomButton = memo<{ onClick: () => void; visible: boolean }>(
  ({ onClick, visible }) => {
    if (!visible) return null;
    
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className="absolute bottom-20 right-4 rounded-full shadow-lg z-10 gap-1"
      >
        <ChevronDown className="h-4 w-4" />
        New messages
      </Button>
    );
  }
);
ScrollToBottomButton.displayName = 'ScrollToBottomButton';

// ============================================================
// GROUP MESSAGES BY DATE
// ============================================================

function groupMessagesByDate(messages: MeaningBasedMessage[]): Map<string, MeaningBasedMessage[]> {
  const groups = new Map<string, MeaningBasedMessage[]>();
  
  for (const message of messages) {
    const date = new Date(message.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateKey: string;
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Yesterday';
    } else {
      dateKey = date.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(message);
  }
  
  return groups;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export const BidirectionalChatContainer: React.FC<BidirectionalChatContainerProps> = memo(({
  senderProfile,
  receiverProfile,
  messages,
  onSendMessage,
  onTyping,
  partnerName,
  partnerAvatar,
  partnerIsTyping = false,
  showEnglishMeaning = true,
  disabled = false,
  className,
}) => {
  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // State
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Derived
  const senderLanguage = normalizeLanguage(senderProfile.motherTongue);
  const receiverLanguage = normalizeLanguage(receiverProfile.motherTongue);
  const sameLanguage = isSameLanguage(senderLanguage, receiverLanguage);
  const groupedMessages = groupMessagesByDate(messages);
  
  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  }, []);
  
  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);
  
  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
    setAutoScroll(isNearBottom);
  }, []);
  
  // Handle send message
  const handleSendMessage = useCallback((message: MeaningBasedMessage) => {
    onSendMessage(message);
    setAutoScroll(true);
  }, [onSendMessage]);
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Language Indicator */}
      <LanguageIndicator
        senderLanguage={senderProfile.motherTongue}
        receiverLanguage={receiverProfile.motherTongue}
        sameLanguage={sameLanguage}
      />
      
      {/* Messages Area */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea
          className="h-full"
          onScrollCapture={handleScroll}
        >
          <div className="p-4 space-y-3" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <Languages className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  Start a conversation
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Type in any way you like - phonetic, native script, or mixed. 
                  Messages will be translated automatically.
                </p>
              </div>
            ) : (
              <>
                {Array.from(groupedMessages.entries()).map(([date, dateMessages]) => (
                  <div key={date}>
                    <DateSeparator date={date} />
                    <div className="space-y-2">
                      {dateMessages.map((message) => (
                        <BidirectionalMessageBubble
                          key={message.id}
                          message={message}
                          viewerLanguage={senderProfile.motherTongue}
                          isMe={isSameLanguage(
                            normalizeLanguage(message.senderLanguage),
                            senderLanguage
                          )}
                          senderName={
                            isSameLanguage(
                              normalizeLanguage(message.senderLanguage),
                              senderLanguage
                            )
                              ? undefined
                              : partnerName
                          }
                          senderAvatar={
                            isSameLanguage(
                              normalizeLanguage(message.senderLanguage),
                              senderLanguage
                            )
                              ? undefined
                              : partnerAvatar
                          }
                          showEnglishMeaning={showEnglishMeaning}
                          showOriginalToggle={true}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {/* Typing indicator */}
            {partnerIsTyping && (
              <TypingIndicator name={partnerName} />
            )}
            
            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        
        {/* Scroll to bottom button */}
        <ScrollToBottomButton
          onClick={scrollToBottom}
          visible={showScrollButton}
        />
      </div>
      
      {/* Input Area */}
      <div className="border-t bg-background">
        <BidirectionalChatInput
          senderProfile={senderProfile}
          receiverProfile={receiverProfile}
          onSendMessage={handleSendMessage}
          onTyping={onTyping}
          disabled={disabled}
        />
      </div>
    </div>
  );
});

BidirectionalChatContainer.displayName = 'BidirectionalChatContainer';

export default BidirectionalChatContainer;

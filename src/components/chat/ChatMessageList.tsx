import React, { memo, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Languages } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

export interface ChatMessage {
  id: string;
  content: string;
  translatedContent?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  senderLanguage?: string;
  timestamp: string;
  isRead?: boolean;
  isDelivered?: boolean;
  showOriginal?: boolean;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  className?: string;
  showTranslations?: boolean;
  onToggleTranslation?: (messageId: string) => void;
}

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return format(date, 'HH:mm');
};

const formatDateHeader = (timestamp: string) => {
  const date = new Date(timestamp);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

const MessageStatus = memo(({ isDelivered, isRead }: { isDelivered?: boolean; isRead?: boolean }) => {
  if (isRead) {
    return <CheckCheck className="h-3.5 w-3.5 text-primary" aria-label="Read" />;
  }
  if (isDelivered) {
    return <Check className="h-3.5 w-3.5 text-muted-foreground" aria-label="Delivered" />;
  }
  return null;
});
MessageStatus.displayName = 'MessageStatus';

const MessageBubble = memo(({
  message,
  isOwn,
  showTranslation,
  onToggleTranslation,
}: {
  message: ChatMessage;
  isOwn: boolean;
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
}) => {
  const { t } = useTranslation();
  // DL-200 STRICT RULE: Always display ONLY translated content in viewer's language
  // NO original text shown, NO language indicators, NO prefixes/suffixes
  // translatedContent is ALWAYS in viewer's language (or content if same language)
  const displayContent = message.translatedContent || message.content;

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%] sm:max-w-[75%] animate-fade-in',
        isOwn ? 'ms-auto flex-row-reverse' : 'me-auto'
      )}
    >
      {/* Avatar for received messages */}
      {!isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.senderAvatar || undefined} alt={message.senderName} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name for received messages - no language shown per DL-200 */}
        {!isOwn && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {message.senderName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 unicode-text',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md chat-message-sent'
              : 'bg-muted text-foreground rounded-bl-md chat-message-received'
          )}
          dir="auto"
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {displayContent}
          </p>
          {/* DL-200: No "show original" toggle - viewer sees ONLY their language */}
        </div>

        {/* Timestamp and status */}
        <div className={cn(
          'flex items-center gap-1 mt-0.5 px-1',
          isOwn ? 'flex-row-reverse' : ''
        )}>
          <span className="text-[10px] text-muted-foreground">
            {formatMessageTime(message.timestamp)}
          </span>
          {isOwn && (
            <MessageStatus isDelivered={message.isDelivered} isRead={message.isRead} />
          )}
        </div>
      </div>
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

export const ChatMessageList: React.FC<ChatMessageListProps> = memo(({
  messages,
  currentUserId,
  className,
  showTranslations = true,
  onToggleTranslation,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const dateKey = formatDateHeader(message.timestamp);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <ScrollArea className={cn('flex-1', className)} ref={scrollRef}>
      <div className="p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4" role="separator">
              <div className="bg-muted/50 px-3 py-1 rounded-full">
                <span className="text-xs text-muted-foreground font-medium">
                  {date}
                </span>
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {dateMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === currentUserId}
                  showTranslation={showTranslations}
                  onToggleTranslation={() => onToggleTranslation?.(message.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Languages className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-medium text-foreground mb-1">
              {t('chat.noMessages')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('chat.startConversation')}
            </p>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
});

ChatMessageList.displayName = 'ChatMessageList';

export default ChatMessageList;

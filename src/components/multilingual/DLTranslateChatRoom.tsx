/**
 * DL-Translate Chat Room Component
 * Complete multilingual chat implementation
 * Based on dl-translate (https://github.com/xhluca/dl-translate)
 * 
 * Features:
 * 1. Real-time transliteration while typing
 * 2. Auto language detection
 * 3. Conditional translation (only when languages differ)
 * 4. 200+ language support
 * 5. Realtime message updates
 */

import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Languages, 
  Globe, 
  ArrowLeftRight, 
  Loader2,
  RefreshCw,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useMultilingualChatSystem } from '@/hooks/useMultilingualChatSystem';
import { MultilingualChatInput } from './MultilingualChatInput';
import { MultilingualMessage } from './MultilingualMessage';
import { TypingIndicator } from './TypingIndicator';
import { getNativeName } from '@/lib/dl-translate/languages';

interface DLTranslateChatRoomProps {
  chatId: string;
  currentUserId: string;
  currentUserLanguage: string;
  currentUserName?: string;
  partnerUserId: string;
  partnerLanguage: string;
  partnerName?: string;
  partnerPhoto?: string;
  onClose?: () => void;
  className?: string;
}

export function DLTranslateChatRoom({
  chatId,
  currentUserId,
  currentUserLanguage,
  currentUserName = 'You',
  partnerUserId,
  partnerLanguage,
  partnerName = 'Partner',
  partnerPhoto,
  onClose,
  className,
}: DLTranslateChatRoomProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const {
    messages,
    isLoadingMessages,
    inputText,
    setInputText,
    livePreview,
    sendMessage,
    translateMessage,
    partnerTyping,
    senderLanguageInfo,
    receiverLanguageInfo,
    needsTranslation,
    isTranslating,
    isSending,
    error,
  } = useMultilingualChatSystem({
    chatId,
    currentUserId,
    currentUserLanguage,
    partnerUserId,
    partnerLanguage,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, partnerTyping, autoScroll]);

  // Handle scroll events to detect manual scrolling
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const senderNativeName = getNativeName(currentUserLanguage);
  const receiverNativeName = getNativeName(partnerLanguage);

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            {partnerName}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>

        {/* Language bar */}
        <div className="flex items-center justify-center gap-3 py-2 px-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="font-normal">
              {senderNativeName}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            {needsTranslation ? (
              <>
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                <Badge variant="secondary" className="text-xs">
                  <Languages className="h-3 w-3 mr-1" />
                  Auto-translate
                </Badge>
              </>
            ) : (
              <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                Same language
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="font-normal">
              {receiverNativeName}
            </Badge>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Messages area */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea 
          ref={scrollRef}
          className="h-full px-4 py-4"
          onScrollCapture={handleScroll}
        >
          {/* Loading state */}
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Languages className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-foreground mb-1">Start the conversation</h3>
              <p className="text-sm text-muted-foreground max-w-[250px]">
                Type in any language. Messages will be automatically translated to {receiverNativeName}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MultilingualMessage
                  key={message.id}
                  message={message}
                  isOwnMessage={message.senderId === currentUserId}
                  onTranslate={translateMessage}
                  isTranslating={isTranslating}
                />
              ))}

              {/* Typing indicator */}
              {partnerTyping && (
                <TypingIndicator
                  indicator={partnerTyping}
                  partnerName={partnerName}
                />
              )}
            </div>
          )}
        </ScrollArea>

        {/* Scroll to bottom button */}
        {!autoScroll && messages.length > 0 && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
            <Button
              variant="secondary"
              size="sm"
              className="shadow-lg"
              onClick={() => {
                setAutoScroll(true);
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              New messages
            </Button>
          </div>
        )}
      </CardContent>

      <Separator />

      {/* Error alert */}
      {error && (
        <Alert variant="destructive" className="mx-4 my-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Input area */}
      <div className="p-4">
        <MultilingualChatInput
          inputText={inputText}
          onInputChange={setInputText}
          livePreview={livePreview}
          onSend={sendMessage}
          isSending={isSending}
          userLanguage={currentUserLanguage}
          placeholder={`Type in ${senderNativeName}...`}
        />
      </div>
    </Card>
  );
}

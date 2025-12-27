import React, { memo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { Menu, Users, Globe, Settings, X } from 'lucide-react';
import { ChatMessageList, type ChatMessage } from './ChatMessageList';
import { ChatMessageInput } from './ChatMessageInput';
import { ChatUserList, type ChatUser } from './ChatUserList';
import { I18nLanguageSelector } from '@/components/I18nLanguageSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MultilingualChatRoomProps {
  chatId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserLanguage: string;
  currentUserAvatar?: string | null;
  className?: string;
  onClose?: () => void;
}

export const MultilingualChatRoom: React.FC<MultilingualChatRoomProps> = memo(({
  chatId,
  currentUserId,
  currentUserName,
  currentUserLanguage,
  currentUserAvatar,
  className,
  onClose,
}) => {
  const { t } = useTranslation();
  const { isRTL, translateDynamic } = useI18n();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showTranslations, setShowTranslations] = useState(true);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      if (data) {
        // Get sender profiles
        const senderIds = [...new Set(data.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, photo_url, primary_language')
          .in('user_id', senderIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const formattedMessages: ChatMessage[] = data.map(msg => {
          const profile = profileMap.get(msg.sender_id);
          return {
            id: msg.id,
            content: msg.message,
            translatedContent: msg.translated_message || undefined,
            senderId: msg.sender_id,
            senderName: profile?.full_name || 'Unknown',
            senderAvatar: profile?.photo_url,
            senderLanguage: profile?.primary_language,
            timestamp: msg.created_at,
            isRead: msg.is_read || false,
            isDelivered: true,
          };
        });

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  // Load users (mock for now - in real app would fetch from session participants)
  const loadUsers = useCallback(() => {
    // Add current user
    const mockUsers: ChatUser[] = [
      {
        id: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar,
        language: currentUserLanguage,
        languageCode: currentUserLanguage.toLowerCase().slice(0, 2),
        isOnline: true,
      },
    ];
    setUsers(mockUsers);
  }, [currentUserId, currentUserName, currentUserAvatar, currentUserLanguage]);

  // Subscribe to real-time messages
  useEffect(() => {
    loadMessages();
    loadUsers();

    const channel = supabase
      .channel(`chat-room-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Get sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, photo_url, primary_language')
            .eq('user_id', newMsg.sender_id)
            .maybeSingle();

          const message: ChatMessage = {
            id: newMsg.id,
            content: newMsg.message,
            translatedContent: newMsg.translated_message,
            senderId: newMsg.sender_id,
            senderName: profile?.full_name || 'Unknown',
            senderAvatar: profile?.photo_url,
            senderLanguage: profile?.primary_language,
            timestamp: newMsg.created_at,
            isDelivered: true,
          };

          setMessages(prev => [...prev, message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, loadMessages, loadUsers]);

  // Send message with translation
  const handleSendMessage = useCallback(async (content: string) => {
    try {
      // Translate message for storage
      let translatedContent: string | undefined;
      try {
        translatedContent = await translateDynamic(content, 'English');
      } catch {
        // Translation failed, continue without
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: currentUserId, // Will be updated in real implementation
          message: content,
          translated_message: translatedContent,
          is_translated: !!translatedContent,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: t('errors.unknown'),
        description: t('chat.sendFailed', 'Failed to send message'),
        variant: 'destructive',
      });
    }
  }, [chatId, currentUserId, translateDynamic, toast, t]);

  // Toggle message translation
  const handleToggleTranslation = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, showOriginal: !msg.showOriginal }
          : msg
      )
    );
  }, []);

  // Handle typing indicator
  const handleTyping = useCallback((isTyping: boolean) => {
    // Broadcast typing status via presence channel
    // Implementation would use Supabase Realtime presence
  }, []);

  return (
    <Card className={cn(
      'flex flex-col h-full border-border/50 overflow-hidden',
      className
    )}>
      {/* Header */}
      <CardHeader className="flex-shrink-0 p-3 sm:p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile sidebar toggle */}
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden flex-shrink-0"
                  aria-label={t('chat.showParticipants', 'Show participants')}
                >
                  <Users className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRTL ? 'right' : 'left'} className="p-0 w-80">
                <ChatUserList
                  users={users}
                  currentUserId={currentUserId}
                  title={t('chat.participants', 'Participants')}
                />
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <h2 className="font-semibold text-foreground truncate">
                {t('chat.room', 'Chat Room')}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" />
                <span>{users.length} {t('chat.participants', 'participants')}</span>
                {typingUsers.length > 0 && (
                  <Badge variant="secondary" className="h-4 text-[10px]">
                    {t('chat.typing')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Language selector */}
            <I18nLanguageSelector variant="compact" />

            {/* Translation toggle */}
            <Button
              variant={showTranslations ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setShowTranslations(!showTranslations)}
              className="flex-shrink-0"
              aria-label={showTranslations 
                ? t('chat.hideTranslations', 'Hide translations')
                : t('chat.showTranslations', 'Show translations')
              }
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Close button */}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="flex-shrink-0"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1 p-0 flex overflow-hidden">
        {/* Sidebar - desktop */}
        <div className="hidden lg:flex w-64 border-e border-border flex-shrink-0">
          <ChatUserList
            users={users}
            currentUserId={currentUserId}
            className="w-full"
          />
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">
                {t('common.loading')}
              </div>
            </div>
          ) : (
            <ChatMessageList
              messages={messages}
              currentUserId={currentUserId}
              showTranslations={showTranslations}
              onToggleTranslation={handleToggleTranslation}
              className="flex-1"
            />
          )}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-2 text-sm text-muted-foreground animate-pulse">
              {typingUsers.join(', ')} {t('chat.typing')}
            </div>
          )}

          {/* Message input */}
          <ChatMessageInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            userLanguage={currentUserLanguage}
          />
        </div>
      </CardContent>
    </Card>
  );
});

MultilingualChatRoom.displayName = 'MultilingualChatRoom';

export default MultilingualChatRoom;

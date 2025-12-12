import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, Users } from 'lucide-react';
import { format } from 'date-fns';

interface GroupMessage {
  id: string;
  sender_id: string;
  message: string;
  translated_message: string | null;
  created_at: string;
  sender_name?: string;
  sender_photo?: string;
}

interface GroupChatWindowProps {
  group: {
    id: string;
    name: string;
    participant_count: number;
  };
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
  onClose: () => void;
  isOwner: boolean;
}

export function GroupChatWindow({ 
  group, 
  currentUserId, 
  userName, 
  userPhoto, 
  onClose,
  isOwner 
}: GroupChatWindowProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<Map<string, { name: string; photo: string | null }>>(new Map());

  useEffect(() => {
    fetchMessages();
    fetchMembers();

    // Subscribe to new messages
    const channel = supabase
      .channel(`group-chat-${group.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${group.id}`
      }, (payload) => {
        const newMsg = payload.new as GroupMessage;
        setMessages(prev => [...prev, newMsg]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const fetchMembers = async () => {
    // Fetch member profiles
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('user_id')
      .eq('group_id', group.id)
      .eq('has_access', true);

    if (memberships) {
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, photo_url')
        .in('user_id', userIds);

      if (profiles) {
        const memberMap = new Map<string, { name: string; photo: string | null }>();
        profiles.forEach(p => {
          memberMap.set(p.user_id, { name: p.full_name || 'User', photo: p.photo_url });
        });
        setMembers(memberMap);
      }
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: group.id,
          sender_id: currentUserId,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const getSenderInfo = (senderId: string) => {
    if (senderId === currentUserId) {
      return { name: userName, photo: userPhoto };
    }
    return members.get(senderId) || { name: 'User', photo: null };
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] z-50 shadow-xl flex flex-col">
      <CardHeader className="pb-2 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {group.name}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {group.participant_count}
            </span>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              const sender = getSenderInfo(msg.sender_id);
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={sender.photo || undefined} />
                    <AvatarFallback>{sender.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <p className="text-xs text-muted-foreground mb-1">{sender.name}</p>
                    )}
                    <div
                      className={`px-3 py-2 rounded-lg text-sm ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.translated_message || msg.message}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        <div className="p-4 border-t flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button size="icon" onClick={handleSendMessage} disabled={isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

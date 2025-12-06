import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, ChevronRight, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ChatPartner {
  oderId: string;
  fullName: string;
  photoUrl: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

interface ActiveChatsSectionProps {
  maxDisplay?: number;
}

export const ActiveChatsSection = ({ maxDisplay = 5 }: ActiveChatsSectionProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeChats, setActiveChats] = useState<ChatPartner[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadActiveChats();
  }, []);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('active-chats-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          loadActiveChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const loadActiveChats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Get all unique chat partners from messages
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!messages || messages.length === 0) {
        setActiveChats([]);
        setIsLoading(false);
        return;
      }

      // Group messages by partner and get the latest one
      const partnerMap = new Map<string, {
        lastMessage: string;
        lastMessageTime: string;
        unreadCount: number;
      }>();

      messages.forEach(msg => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, {
            lastMessage: msg.message,
            lastMessageTime: msg.created_at,
            unreadCount: 0
          });
        }
        
        // Count unread messages from partner
        if (msg.receiver_id === user.id && !msg.is_read) {
          const existing = partnerMap.get(partnerId)!;
          existing.unreadCount++;
        }
      });

      // Get partner profiles
      const partnerIds = Array.from(partnerMap.keys());
      
      if (partnerIds.length === 0) {
        setActiveChats([]);
        setIsLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url")
        .in("user_id", partnerIds);

      // Get online statuses
      const { data: statuses } = await supabase
        .from("user_status")
        .select("user_id, is_online")
        .in("user_id", partnerIds);

      const statusMap = new Map(statuses?.map(s => [s.user_id, s.is_online]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Build active chats list
      const chats: ChatPartner[] = partnerIds
        .map(partnerId => {
          const partner = partnerMap.get(partnerId)!;
          const profile = profileMap.get(partnerId);
          
          return {
            oderId: partnerId,
            fullName: profile?.full_name || "Anonymous",
            photoUrl: profile?.photo_url || null,
            lastMessage: partner.lastMessage.replace(/\n?\[attachment:.*?\]/, '').trim() || "📎 Attachment",
            lastMessageTime: partner.lastMessageTime,
            unreadCount: partner.unreadCount,
            isOnline: statusMap.get(partnerId) || false
          };
        })
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
        .slice(0, maxDisplay);

      setActiveChats(chats);
    } catch (error) {
      console.error("Error loading active chats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const truncateMessage = (message: string, maxLength = 40) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Recent Chats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activeChats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Recent Chats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active chats yet</p>
            <p className="text-xs mt-1">Start chatting with your matches!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Recent Chats
          </CardTitle>
          {activeChats.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => navigate("/match-discovery")}
            >
              See All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeChats.map((chat) => (
          <div
            key={chat.oderId}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
              "hover:bg-muted/50 active:bg-muted",
              chat.unreadCount > 0 && "bg-primary/5"
            )}
            onClick={() => navigate(`/chat/${chat.oderId}`)}
          >
            <div className="relative">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={chat.photoUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-rose-500/20 text-sm">
                  {chat.fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {chat.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "font-medium text-sm truncate",
                  chat.unreadCount > 0 && "font-semibold"
                )}>
                  {chat.fullName}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatTime(chat.lastMessageTime)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className={cn(
                  "text-xs truncate",
                  chat.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {truncateMessage(chat.lastMessage)}
                </p>
                {chat.unreadCount > 0 && (
                  <Badge className="h-5 min-w-[20px] text-[10px] px-1.5 bg-primary">
                    {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeamsContactsSidebar } from "./TeamsContactsSidebar";
import TeamsStyleChatWindow from "./TeamsStyleChatWindow";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MessageCircle, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/TranslationContext";

interface ActiveChat {
  id: string;
  chatId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  partnerLanguage: string;
  isPartnerOnline: boolean;
  ratePerMinute: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface TeamsChatLayoutProps {
  currentUserId: string;
  currentUserLanguage: string;
  userGender: "male" | "female";
  className?: string;
}

export function TeamsChatLayout({
  currentUserId,
  currentUserLanguage,
  userGender,
  className
}: TeamsChatLayoutProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ActiveChat | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    
    loadActiveChats();
    const unsubscribe = subscribeToChats();

    return () => {
      unsubscribe?.();
    };
  }, [currentUserId]);

  const loadActiveChats = async () => {
    const query = userGender === "male"
      ? supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("man_user_id", currentUserId)
          .eq("status", "active")
      : supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("woman_user_id", currentUserId)
          .eq("status", "active");

    const { data: sessions } = await query;

    if (!sessions || sessions.length === 0) {
      setActiveChats([]);
      if (selectedChat) {
        // Check if selected chat is still active
        const stillActive = sessions?.some(s => s.chat_id === selectedChat.chatId);
        if (!stillActive) {
          setSelectedChat(null);
        }
      }
      return;
    }

    const partnerIds = sessions.map(s => 
      userGender === "male" ? s.woman_user_id : s.man_user_id
    );

    // Fetch partner profiles, statuses, and last messages in parallel
    const [profilesRes, statusesRes, messagesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, primary_language")
        .in("user_id", partnerIds),
      supabase
        .from("user_status")
        .select("user_id, is_online")
        .in("user_id", partnerIds),
      supabase
        .from("chat_messages")
        .select("chat_id, message, created_at, receiver_id, is_read")
        .in("chat_id", sessions.map(s => s.chat_id))
        .order("created_at", { ascending: false })
    ]);

    const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
    const statusMap = new Map(statusesRes.data?.map(s => [s.user_id, s.is_online]) || []);
    
    // Group messages by chat and get last message + unread count
    const messagesByChat = new Map<string, { lastMessage: string; lastTime: string; unread: number }>();
    messagesRes.data?.forEach(msg => {
      if (!messagesByChat.has(msg.chat_id)) {
        messagesByChat.set(msg.chat_id, { 
          lastMessage: msg.message, 
          lastTime: msg.created_at,
          unread: 0
        });
      }
      // Count unread messages for current user
      if (msg.receiver_id === currentUserId && !msg.is_read) {
        const existing = messagesByChat.get(msg.chat_id)!;
        existing.unread++;
      }
    });

    const chats: ActiveChat[] = sessions.map(session => {
      const partnerId = userGender === "male" ? session.woman_user_id : session.man_user_id;
      const profile = profileMap.get(partnerId);
      const msgData = messagesByChat.get(session.chat_id);
      
      return {
        id: session.id,
        chatId: session.chat_id,
        partnerId,
        partnerName: profile?.full_name || "Anonymous",
        partnerPhoto: profile?.photo_url || null,
        partnerLanguage: profile?.primary_language || "Unknown",
        isPartnerOnline: statusMap.get(partnerId) || false,
        ratePerMinute: session.rate_per_minute || 5,
        lastMessage: msgData?.lastMessage,
        lastMessageTime: msgData?.lastTime,
        unreadCount: msgData?.unread || 0
      };
    });

    // Sort by last message time
    chats.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    setActiveChats(chats);

    // Auto-select first chat if none selected
    if (!selectedChat && chats.length > 0) {
      setSelectedChat(chats[0]);
    }

    // Update selected chat if it still exists
    if (selectedChat) {
      const updatedSelected = chats.find(c => c.chatId === selectedChat.chatId);
      if (updatedSelected) {
        setSelectedChat(updatedSelected);
      } else {
        setSelectedChat(chats[0] || null);
      }
    }
  };

  const subscribeToChats = () => {
    const channel = supabase
      .channel(`teams-layout-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_chat_sessions'
        },
        () => {
          loadActiveChats();
        }
      )
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status'
        },
        () => {
          loadActiveChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSelectChat = (chat: ActiveChat) => {
    setSelectedChat(chat);
    
    // Mark messages as read
    supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("chat_id", chat.chatId)
      .eq("receiver_id", currentUserId)
      .then(() => {
        loadActiveChats();
      });
  };

  const handleCloseChat = () => {
    setSelectedChat(null);
    loadActiveChats();
  };

  if (activeChats.length === 0) {
    return null; // Don't render anything if no active chats
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-40 flex shadow-2xl rounded-lg overflow-hidden border bg-background",
      isExpanded ? "inset-4" : "h-[500px]",
      className
    )}>
      {/* Sidebar */}
      <TeamsContactsSidebar
        currentUserId={currentUserId}
        userGender={userGender}
        activeChats={activeChats}
        selectedChatId={selectedChat?.chatId || null}
        onSelectChat={handleSelectChat}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Chat Window */}
      {selectedChat ? (
        <div className="flex-1 flex">
          <TeamsStyleChatWindow
            chatId={selectedChat.chatId}
            sessionId={selectedChat.id}
            partnerId={selectedChat.partnerId}
            partnerName={selectedChat.partnerName}
            partnerPhoto={selectedChat.partnerPhoto}
            partnerLanguage={selectedChat.partnerLanguage}
            isPartnerOnline={selectedChat.isPartnerOnline}
            currentUserId={currentUserId}
            currentUserLanguage={currentUserLanguage}
            userGender={userGender}
            ratePerMinute={selectedChat.ratePerMinute}
            onClose={handleCloseChat}
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-muted/10 min-w-[300px]">
          <div className="text-center text-muted-foreground">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">{t('selectAChat', 'Select a chat')}</p>
            <p className="text-sm mt-1">{t('chooseFromSidebar', 'Choose a conversation from the sidebar')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamsChatLayout;

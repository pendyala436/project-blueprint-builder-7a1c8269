import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import MiniChatWindow from "./MiniChatWindow";

interface ActiveChat {
  id: string;
  chatId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  partnerLanguage: string;
  isPartnerOnline: boolean;
  ratePerMinute: number;
}

interface ParallelChatsContainerProps {
  currentUserId: string;
  userGender: "male" | "female";
  currentUserLanguage?: string;
  currentUserName?: string;
}

const ParallelChatsContainer = ({ 
  currentUserId, 
  userGender, 
  currentUserLanguage = "English",
  currentUserName = "Me"
}: ParallelChatsContainerProps) => {
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);

  useEffect(() => {
    if (!currentUserId) return;
    
    loadActiveChats();
    subscribeToChats();
  }, [currentUserId]);

  const loadActiveChats = async () => {
    // Get active sessions based on user gender
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
      return;
    }

    // Get partner IDs
    const partnerIds = sessions.map(s => 
      userGender === "male" ? s.woman_user_id : s.man_user_id
    );

    // Fetch partner profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, photo_url, primary_language")
      .in("user_id", partnerIds);

    // Fetch online statuses
    const { data: statuses } = await supabase
      .from("user_status")
      .select("user_id, is_online")
      .in("user_id", partnerIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const statusMap = new Map(statuses?.map(s => [s.user_id, s.is_online]) || []);

    const chats: ActiveChat[] = sessions.map(session => {
      const partnerId = userGender === "male" ? session.woman_user_id : session.man_user_id;
      const profile = profileMap.get(partnerId);
      
      return {
        id: session.id,
        chatId: session.chat_id,
        partnerId,
        partnerName: profile?.full_name || "Anonymous",
        partnerPhoto: profile?.photo_url || null,
        partnerLanguage: profile?.primary_language || "Unknown",
        isPartnerOnline: statusMap.get(partnerId) || false,
        ratePerMinute: session.rate_per_minute || 5
      };
    });

    setActiveChats(chats);
  };

  const subscribeToChats = () => {
    // Optimized channel for scalability - filter by user to reduce broadcast load
    const filterColumn = userGender === "male" ? "man_user_id" : "woman_user_id";
    
    const channel = supabase
      .channel(`user-chats:${currentUserId}`, {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_chat_sessions',
          filter: `${filterColumn}=eq.${currentUserId}`
        },
        (payload) => {
          console.log('[RealTime] Chat session update:', payload.eventType);
          loadActiveChats();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[RealTime] Subscribed to user chats: ${currentUserId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCloseChat = (chatId: string) => {
    setActiveChats(prev => prev.filter(c => c.chatId !== chatId));
  };

  if (activeChats.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-2 left-2 sm:left-auto sm:right-4 z-50 flex flex-row flex-wrap-reverse sm:flex-nowrap justify-end gap-2 sm:gap-3 items-end max-w-full overflow-x-auto">
      {activeChats.slice(0, 3).map((chat) => (
        <MiniChatWindow
          key={chat.chatId}
          chatId={chat.chatId}
          sessionId={chat.id}
          partnerId={chat.partnerId}
          partnerName={chat.partnerName}
          partnerPhoto={chat.partnerPhoto}
          partnerLanguage={chat.partnerLanguage}
          isPartnerOnline={chat.isPartnerOnline}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserLanguage={currentUserLanguage}
          userGender={userGender}
          ratePerMinute={chat.ratePerMinute}
          onClose={() => handleCloseChat(chat.chatId)}
        />
      ))}
    </div>
  );
};

export default ParallelChatsContainer;
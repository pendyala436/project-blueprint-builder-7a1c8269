import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import DraggableMiniChatWindow from "./DraggableMiniChatWindow";

interface ActiveChat {
  id: string;
  chatId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  partnerLanguage: string;
  isPartnerOnline: boolean;
  ratePerMinute: number;
  earningRatePerMinute: number;
}

interface ParallelChatsContainerProps {
  currentUserId: string;
  userGender: "male" | "female";
  currentUserLanguage?: string;
}

const ParallelChatsContainer = ({ currentUserId, userGender, currentUserLanguage = "English" }: ParallelChatsContainerProps) => {
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const isLoadingRef = useRef(false);
  const lastLoadRef = useRef(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // OPTIMIZED: Load with throttling for high concurrency
  const loadActiveChats = useCallback(async () => {
    if (!currentUserId || isLoadingRef.current) return;
    
    // Throttle: min 500ms between loads
    const now = Date.now();
    if (now - lastLoadRef.current < 500) return;
    lastLoadRef.current = now;
    isLoadingRef.current = true;

    try {
      const column = userGender === "male" ? "man_user_id" : "woman_user_id";
      const partnerColumn = userGender === "male" ? "woman_user_id" : "man_user_id";

      // OPTIMIZED: Select only needed columns with limit
      const { data: sessions, error } = await supabase
        .from("active_chat_sessions")
        .select(`id, chat_id, ${partnerColumn}, rate_per_minute`)
        .eq(column, currentUserId)
        .eq("status", "active")
        .limit(10);

      if (error || !sessions || sessions.length === 0) {
        setActiveChats([]);
        return;
      }

      // Get unique partner IDs
      const partnerIds = [...new Set(sessions.map(s => s[partnerColumn as keyof typeof s] as string))];

      // PARALLEL batch queries for efficiency
      const [profilesResult, statusesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, primary_language")
          .in("user_id", partnerIds),
        supabase
          .from("user_status")
          .select("user_id, is_online")
          .in("user_id", partnerIds)
      ]);

      const profileMap = new Map(profilesResult.data?.map(p => [p.user_id, p]) || []);
      const statusMap = new Map(statusesResult.data?.map(s => [s.user_id, s.is_online]) || []);

      const chats: ActiveChat[] = sessions.map(session => {
        const partnerId = session[partnerColumn as keyof typeof session] as string;
        const profile = profileMap.get(partnerId);
        const rate = session.rate_per_minute || 5;
        
        return {
          id: session.id,
          chatId: session.chat_id,
          partnerId,
          partnerName: profile?.full_name || "Anonymous",
          partnerPhoto: profile?.photo_url || null,
          partnerLanguage: profile?.primary_language || "Unknown",
          isPartnerOnline: statusMap.get(partnerId) || false,
          ratePerMinute: rate,
          earningRatePerMinute: rate * 0.6 // Women earn 60% of rate
        };
      });

      setActiveChats(chats);
    } catch (error) {
      console.error("[ParallelChats] Error:", error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [currentUserId, userGender]);

  // Debounced load for real-time updates
  const debouncedLoad = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadActiveChats(), 300);
  }, [loadActiveChats]);

  useEffect(() => {
    if (!currentUserId) return;
    
    loadActiveChats();

    // OPTIMIZED: User-scoped channel with filter
    const column = userGender === "male" ? "man_user_id" : "woman_user_id";
    const channelName = `parallel-${currentUserId}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_chat_sessions',
          filter: `${column}=eq.${currentUserId}`
        },
        () => debouncedLoad()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, userGender, loadActiveChats, debouncedLoad]);

  const handleCloseChat = (chatId: string) => {
    setActiveChats(prev => prev.filter(c => c.chatId !== chatId));
  };

  if (activeChats.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {activeChats.slice(0, 3).map((chat, index) => (
        <div key={chat.chatId} className="pointer-events-auto">
          <DraggableMiniChatWindow
            chatId={chat.chatId}
            sessionId={chat.id}
            partnerId={chat.partnerId}
            partnerName={chat.partnerName}
            partnerPhoto={chat.partnerPhoto}
            partnerLanguage={chat.partnerLanguage}
            isPartnerOnline={chat.isPartnerOnline}
            currentUserId={currentUserId}
            currentUserLanguage={currentUserLanguage}
            userGender={userGender}
            ratePerMinute={chat.ratePerMinute}
            earningRatePerMinute={chat.earningRatePerMinute}
            onClose={() => handleCloseChat(chat.chatId)}
            initialPosition={{ x: window.innerWidth - 340 - (index * 20), y: window.innerHeight - 420 - (index * 20) }}
            zIndex={50 + index}
          />
        </div>
      ))}
    </div>
  );
};

export default ParallelChatsContainer;
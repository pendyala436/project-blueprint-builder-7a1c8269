import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import MiniChatWindow from "./MiniChatWindow";
import IncomingChatPopup from "./IncomingChatPopup";
import ParallelChatSettingsPanel from "./ParallelChatSettingsPanel";
import { useParallelChatSettings } from "@/hooks/useParallelChatSettings";
import { useIncomingChats } from "@/hooks/useIncomingChats";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ActiveChat {
  id: string;
  chatId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  partnerLanguage: string;
  isPartnerOnline: boolean;
  ratePerMinute: number;
  startedAt: string;
}

interface EnhancedParallelChatsContainerProps {
  currentUserId: string;
  userGender: "male" | "female";
  currentUserLanguage?: string;
}

// Calculate window width based on number of max chats to fit side by side
const getWindowWidth = (maxChats: number): string => {
  // Fit windows in available space (accounting for gaps and padding)
  if (maxChats === 1) return "w-80";
  if (maxChats === 2) return "w-72";
  return "w-64"; // 3 chats
};

const EnhancedParallelChatsContainer = ({ 
  currentUserId, 
  userGender, 
  currentUserLanguage = "English" 
}: EnhancedParallelChatsContainerProps) => {
  const { toast } = useToast();
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const acceptedSessionsRef = useRef<Set<string>>(new Set());
  
  // Get user's parallel chat settings
  const { maxParallelChats, setMaxParallelChats, isLoading: settingsLoading } = 
    useParallelChatSettings(currentUserId);

  // Get incoming chat notifications
  const { incomingChats, acceptChat, rejectChat } = useIncomingChats(currentUserId, userGender);

  // Load active chats
  const loadActiveChats = useCallback(async () => {
    if (!currentUserId) return;

    // Get active sessions based on user gender
    const query = userGender === "male"
      ? supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("man_user_id", currentUserId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
      : supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("woman_user_id", currentUserId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

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

    // Check which sessions have messages from current user (accepted chats)
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("chat_id, sender_id")
      .in("chat_id", sessions.map(s => s.chat_id))
      .eq("sender_id", currentUserId);

    const chatsWithUserMessages = new Set(messages?.map(m => m.chat_id) || []);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const statusMap = new Map(statuses?.map(s => [s.user_id, s.is_online]) || []);

    const chats: ActiveChat[] = sessions
      .filter(session => {
        // Only include chats that user has responded to (accepted)
        return chatsWithUserMessages.has(session.chat_id) || 
               acceptedSessionsRef.current.has(session.id);
      })
      .map(session => {
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
          ratePerMinute: session.rate_per_minute || 2,
          startedAt: session.created_at
        };
      });

    setActiveChats(chats);
  }, [currentUserId, userGender]);

  // Subscribe to chat changes
  useEffect(() => {
    if (!currentUserId) return;
    
    loadActiveChats();

    const channel = supabase
      .channel(`enhanced-parallel-chats-${currentUserId}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadActiveChats]);

  // Handle accepting incoming chat
  const handleAcceptChat = useCallback((sessionId: string) => {
    acceptedSessionsRef.current.add(sessionId);
    acceptChat(sessionId);
    
    // Check if we need to remove old chats
    if (activeChats.length >= maxParallelChats) {
      // Find oldest chat to close
      const oldestChat = activeChats[activeChats.length - 1];
      if (oldestChat) {
        handleCloseChat(oldestChat.chatId, oldestChat.id, true);
      }
    }
    
    loadActiveChats();
  }, [acceptChat, activeChats, maxParallelChats, loadActiveChats]);

  // Handle rejecting incoming chat
  const handleRejectChat = useCallback(async (sessionId: string) => {
    await rejectChat(sessionId);
  }, [rejectChat]);

  // Handle closing a chat
  const handleCloseChat = useCallback(async (chatId: string, sessionId?: string, silent = false) => {
    try {
      if (sessionId) {
        await supabase
          .from("active_chat_sessions")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            end_reason: userGender === "male" ? "man_closed" : "woman_closed"
          })
          .eq("id", sessionId);
      }
      
      acceptedSessionsRef.current.delete(sessionId || "");
      setActiveChats(prev => prev.filter(c => c.chatId !== chatId));
      
      if (!silent) {
        loadActiveChats();
      }
    } catch (error) {
      console.error("Error closing chat:", error);
    }
  }, [userGender, loadActiveChats]);

  // Limit displayed chats to max setting
  const displayedChats = activeChats.slice(0, maxParallelChats);

  // Filter incoming chats that aren't already accepted
  const pendingIncomingChats = incomingChats.filter(
    ic => !acceptedSessionsRef.current.has(ic.sessionId) &&
          !activeChats.some(ac => ac.id === ic.sessionId)
  );

  // Calculate window width class based on max chats
  const windowWidthClass = getWindowWidth(maxParallelChats);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 max-w-[calc(100vw-2rem)]">
      {/* Settings and chat count button */}
      <div className="flex items-center gap-2">
        {displayedChats.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full text-xs font-medium">
            <MessageSquare className="h-3 w-3 text-primary" />
            <span>{displayedChats.length}/{maxParallelChats}</span>
          </div>
        )}
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur-sm",
                "hover:bg-primary/10 transition-all",
                activeChats.length > 0 && "border-primary"
              )}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <ParallelChatSettingsPanel
              currentValue={maxParallelChats}
              onSave={setMaxParallelChats}
              isLoading={settingsLoading}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Incoming chat popups */}
      <div className="flex flex-col gap-2">
        {pendingIncomingChats.map((incoming) => (
          <IncomingChatPopup
            key={incoming.sessionId}
            sessionId={incoming.sessionId}
            chatId={incoming.chatId}
            partnerId={incoming.partnerId}
            partnerName={incoming.partnerName}
            partnerPhoto={incoming.partnerPhoto}
            partnerLanguage={incoming.partnerLanguage}
            ratePerMinute={incoming.ratePerMinute}
            startedAt={incoming.startedAt}
            userGender={userGender}
            onAccept={handleAcceptChat}
            onReject={handleRejectChat}
          />
        ))}
      </div>

      {/* Active chat windows - side by side layout */}
      <div className="flex flex-row-reverse gap-2 items-end">
        {displayedChats.map((chat) => (
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
            currentUserLanguage={currentUserLanguage}
            userGender={userGender}
            ratePerMinute={chat.ratePerMinute}
            onClose={() => handleCloseChat(chat.chatId, chat.id)}
            windowWidthClass={windowWidthClass}
          />
        ))}
      </div>
    </div>
  );
};

export default EnhancedParallelChatsContainer;

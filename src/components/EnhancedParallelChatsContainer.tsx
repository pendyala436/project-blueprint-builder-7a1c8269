import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import DraggableMiniChatWindow from "./DraggableMiniChatWindow";
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
  earningRatePerMinute: number;
  startedAt: string;
  position: { x: number; y: number };
  zIndex: number;
}

interface EnhancedParallelChatsContainerProps {
  currentUserId: string;
  userGender: "male" | "female";
  currentUserLanguage?: string;
}

// Calculate initial positions for windows - spread horizontally from right
const getInitialPosition = (index: number): { x: number; y: number } => {
  if (typeof window === 'undefined') return { x: 20, y: 100 };
  
  const windowWidth = window.innerWidth;
  const chatWidth = windowWidth < 640 ? 290 : 330; // Match responsive chat window width
  const gap = 12;
  
  // Position from right side, staggered horizontally
  const x = Math.max(10, windowWidth - ((index + 1) * (chatWidth + gap)));
  const y = 100; // Fixed distance from top
  
  return { x, y };
};

const EnhancedParallelChatsContainer = ({ 
  currentUserId, 
  userGender, 
  currentUserLanguage = "English" 
}: EnhancedParallelChatsContainerProps) => {
  const { toast } = useToast();
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedChatId, setFocusedChatId] = useState<string | null>(null);
  const acceptedSessionsRef = useRef<Set<string>>(new Set());
  const existingPartnersRef = useRef<Set<string>>(new Set());
  const nextZIndexRef = useRef(50);
  
  // Get user's parallel chat settings
  const { maxParallelChats, setMaxParallelChats, isLoading: settingsLoading } = 
    useParallelChatSettings(currentUserId);

  // Get incoming chat notifications
  const { incomingChats, acceptChat, rejectChat } = useIncomingChats(currentUserId, userGender);

  // Load active chats - ensuring ONE window per man-woman pair
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
      existingPartnersRef.current.clear();
      return;
    }

    // Get pricing
    const { data: pricing } = await supabase
      .from("chat_pricing")
      .select("rate_per_minute, women_earning_rate")
      .eq("is_active", true)
      .maybeSingle();

    const ratePerMinute = pricing?.rate_per_minute || 2;
    const earningRatePerMinute = pricing?.women_earning_rate || 2;

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

    // CRITICAL: Strictly ONE window per partner - use Map to deduplicate
    const partnerToSession = new Map<string, typeof sessions[0]>();
    
    sessions.forEach(session => {
      const partnerId = userGender === "male" ? session.woman_user_id : session.man_user_id;
      
      // For MEN: Show chat window immediately (they initiate)
      // For WOMEN: Only show if they have accepted (sent a message or clicked accept)
      const isAccepted = userGender === "male" 
        ? true // Men always see their initiated chats
        : (chatsWithUserMessages.has(session.chat_id) || acceptedSessionsRef.current.has(session.id));
      
      if (!isAccepted) return;
      
      // Keep only the most recent session per partner (prevent duplicate windows)
      const existing = partnerToSession.get(partnerId);
      if (!existing || new Date(session.created_at) > new Date(existing.created_at)) {
        partnerToSession.set(partnerId, session);
      }
    });
    
    // Update existing partners set
    existingPartnersRef.current = new Set(partnerToSession.keys());
    
    // Build chat objects with positions
    const chats: ActiveChat[] = Array.from(partnerToSession.entries()).map(([partnerId, session], index) => {
      const profile = profileMap.get(partnerId);
      
      // Find existing chat to preserve position
      const existingChat = activeChats.find(c => c.partnerId === partnerId);
      
      return {
        id: session.id,
        chatId: session.chat_id,
        partnerId,
        partnerName: profile?.full_name || "Anonymous",
        partnerPhoto: profile?.photo_url || null,
        partnerLanguage: profile?.primary_language || "Unknown",
        isPartnerOnline: statusMap.get(partnerId) || false,
        ratePerMinute: session.rate_per_minute || ratePerMinute,
        earningRatePerMinute,
        startedAt: session.created_at,
        position: existingChat?.position || getInitialPosition(index),
        zIndex: existingChat?.zIndex || nextZIndexRef.current++
      };
    });

    setActiveChats(chats);
  }, [currentUserId, userGender, activeChats]);

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

  // Handle accepting incoming chat - check for duplicate partner
  const handleAcceptChat = useCallback((sessionId: string) => {
    // Find the incoming chat to get partner ID
    const incomingChat = incomingChats.find(ic => ic.sessionId === sessionId);
    
    if (incomingChat) {
      // CRITICAL: Check if we already have a chat with this partner
      if (existingPartnersRef.current.has(incomingChat.partnerId)) {
        toast({
          title: "Chat Already Active",
          description: `You already have an active chat with ${incomingChat.partnerName}`,
          variant: "destructive"
        });
        rejectChat(sessionId);
        return;
      }
    }
    
    acceptedSessionsRef.current.add(sessionId);
    acceptChat(sessionId);
    
    // Check if we need to remove old chats to stay within limit
    if (activeChats.length >= maxParallelChats) {
      // Find oldest chat to close
      const oldestChat = activeChats[activeChats.length - 1];
      if (oldestChat) {
        handleCloseChat(oldestChat.chatId, oldestChat.id, true);
        toast({
          title: "Chat Limit Reached",
          description: `Closed oldest chat to accept new one`,
        });
      }
    }
    
    loadActiveChats();
  }, [acceptChat, activeChats, maxParallelChats, loadActiveChats, incomingChats, rejectChat, toast]);

  // Handle rejecting incoming chat - trigger fallback search
  const handleRejectChat = useCallback(async (sessionId: string) => {
    await rejectChat(sessionId);
    
    // For men: the system will automatically try to find another match
    // This is handled by the chat-manager edge function
  }, [rejectChat]);

  // Handle closing a chat
  const handleCloseChat = useCallback(async (chatId: string, sessionId?: string, silent = false) => {
    try {
      if (sessionId) {
        // Find the chat to get partner ID
        const chat = activeChats.find(c => c.id === sessionId);
        if (chat) {
          existingPartnersRef.current.delete(chat.partnerId);
        }
        
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
  }, [userGender, loadActiveChats, activeChats]);

  // Handle focusing a chat window (bring to front)
  const handleFocusChat = useCallback((chatId: string) => {
    setFocusedChatId(chatId);
    setActiveChats(prev => prev.map(chat => 
      chat.chatId === chatId 
        ? { ...chat, zIndex: nextZIndexRef.current++ }
        : chat
    ));
  }, []);

  // Limit displayed chats to max setting
  const displayedChats = activeChats.slice(0, maxParallelChats);

  // Filter incoming chats - exclude those for existing partners
  const pendingIncomingChats = incomingChats.filter(
    ic => !acceptedSessionsRef.current.has(ic.sessionId) &&
          !activeChats.some(ac => ac.id === ic.sessionId) &&
          !existingPartnersRef.current.has(ic.partnerId) // Don't show popup if already chatting
  );

  // Debug logging
  console.log(`[EnhancedParallelChats] User: ${userGender}, Active: ${activeChats.length}, Incoming: ${incomingChats.length}, Pending Popups: ${pendingIncomingChats.length}`);

  return (
    <>
      {/* Settings button - fixed position */}
      <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2">
        {displayedChats.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full text-xs font-medium backdrop-blur-sm">
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
          <PopoverContent className="w-80 p-0" align="start">
            <ParallelChatSettingsPanel
              currentValue={maxParallelChats}
              onSave={setMaxParallelChats}
              isLoading={settingsLoading}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Incoming chat popups - fixed position, highest z-index */}
      <div className="fixed bottom-20 left-4 z-[9999] flex flex-col gap-2">
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

      {/* Active chat windows - freely draggable with absolute positioning */}
      {displayedChats.map((chat, index) => (
        <DraggableMiniChatWindow
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
          earningRatePerMinute={chat.earningRatePerMinute}
          onClose={() => handleCloseChat(chat.chatId, chat.id)}
          initialPosition={chat.position}
          zIndex={chat.zIndex}
          onFocus={() => handleFocusChat(chat.chatId)}
        />
      ))}
    </>
  );
};

export default EnhancedParallelChatsContainer;

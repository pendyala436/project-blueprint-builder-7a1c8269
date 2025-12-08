/**
 * useConnectionManager Hook
 * 
 * Manages chat connections with:
 * - Auto-reconnect when woman disconnects/closes
 * - Parallel connection handling (max 3)
 * - Load-balanced matching
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ActiveChat {
  chatId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string;
  role: "man" | "woman";
  startedAt: string;
  status: "active" | "ended";
}

export interface ConnectionManagerResult {
  activeChats: ActiveChat[];
  isConnecting: boolean;
  canAddMoreChats: boolean;
  maxChats: number;
  
  // Actions
  startChat: (womanUserId: string) => Promise<{ success: boolean; chatId?: string; error?: string }>;
  endChat: (chatId: string, reason?: string) => Promise<void>;
  autoReconnect: (excludeUserIds?: string[]) => Promise<{ success: boolean; newPartnerId?: string }>;
  refreshActiveChats: () => Promise<void>;
}

const MAX_PARALLEL_CHATS = 3;

export function useConnectionManager(currentUserId: string): ConnectionManagerResult {
  const { toast } = useToast();
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Refresh active chats from backend
  const refreshActiveChats = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "get_active_chats",
          user_id: currentUserId
        }
      });

      if (error) throw error;

      if (data?.success) {
        const chats: ActiveChat[] = data.active_chats.map((chat: any) => ({
          chatId: chat.chat_id,
          partnerId: chat.partner?.user_id,
          partnerName: chat.partner?.full_name || "User",
          partnerPhoto: chat.partner?.photo_url,
          role: chat.role,
          startedAt: chat.started_at,
          status: chat.status
        }));
        setActiveChats(chats);
      }
    } catch (error) {
      console.error("Error refreshing active chats:", error);
    }
  }, [currentUserId]);

  // Setup real-time subscription for session changes
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`user-sessions-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_chat_sessions',
          filter: `man_user_id=eq.${currentUserId}`
        },
        async (payload) => {
          console.log("Session change detected:", payload);
          
          // If session ended by woman, trigger auto-reconnect
          if (payload.eventType === 'UPDATE') {
            const session = payload.new as any;
            if (session.status === 'ended' && session.end_reason === 'woman_closed') {
              console.log("Woman closed chat, triggering auto-reconnect");
              await autoReconnect([session.woman_user_id]);
            }
          }
          
          await refreshActiveChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_chat_sessions',
          filter: `woman_user_id=eq.${currentUserId}`
        },
        async () => {
          await refreshActiveChats();
        }
      )
      .subscribe();

    // Initial load
    refreshActiveChats();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refreshActiveChats]);

  // Start a new chat with a woman
  const startChat = useCallback(async (womanUserId: string) => {
    if (!currentUserId || isConnecting) {
      return { success: false, error: "Not ready" };
    }

    // Check if already at max capacity
    if (activeChats.length >= MAX_PARALLEL_CHATS) {
      toast({
        title: "Maximum Chats Reached",
        description: `You can have up to ${MAX_PARALLEL_CHATS} parallel chats`,
        variant: "destructive"
      });
      return { success: false, error: "Maximum parallel chats reached" };
    }

    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "start_chat",
          man_user_id: currentUserId,
          woman_user_id: womanUserId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Connected!",
          description: "Chat started successfully"
        });
        await refreshActiveChats();
        return { success: true, chatId: data.chat_id };
      } else if (data?.message === "This user is at maximum chat capacity") {
        // Woman is busy, try auto-reconnect
        toast({
          title: "User Busy",
          description: "Finding another available user..."
        });
        const reconnectResult = await autoReconnect([womanUserId]);
        return reconnectResult.success 
          ? { success: true, chatId: reconnectResult.newPartnerId }
          : { success: false, error: "No available users" };
      } else {
        return { success: false, error: data?.message || "Failed to start chat" };
      }
    } catch (error: any) {
      console.error("Error starting chat:", error);
      return { success: false, error: error.message };
    } finally {
      setIsConnecting(false);
    }
  }, [currentUserId, isConnecting, activeChats.length, toast, refreshActiveChats]);

  // End a chat session
  const endChat = useCallback(async (chatId: string, reason?: string) => {
    try {
      const { error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "end_chat",
          chat_id: chatId,
          end_reason: reason || "user_ended"
        }
      });

      if (error) throw error;

      toast({
        title: "Chat Ended",
        description: "You can start a new chat anytime"
      });
      
      await refreshActiveChats();
    } catch (error) {
      console.error("Error ending chat:", error);
      toast({
        title: "Error",
        description: "Failed to end chat",
        variant: "destructive"
      });
    }
  }, [toast, refreshActiveChats]);

  // Auto-reconnect to another woman when current one disconnects/is busy
  const autoReconnect = useCallback(async (excludeUserIds?: string[]) => {
    if (!currentUserId) {
      return { success: false };
    }

    if (reconnectAttempts.current >= maxReconnectAttempts) {
      toast({
        title: "Connection Failed",
        description: "Unable to find available users. Please try again later."
      });
      reconnectAttempts.current = 0;
      return { success: false };
    }

    reconnectAttempts.current++;
    setIsConnecting(true);

    try {
      // Find a new match
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "auto_reconnect",
          man_user_id: currentUserId,
          exclude_user_ids: excludeUserIds || []
        }
      });

      if (error) throw error;

      if (data?.success && data.woman_user_id) {
        // Start chat with new woman
        const chatResult = await startChat(data.woman_user_id);
        
        if (chatResult.success) {
          reconnectAttempts.current = 0;
          toast({
            title: "Reconnected!",
            description: `Connected to ${data.profile?.full_name || "a new user"}`
          });
          return { success: true, newPartnerId: data.woman_user_id };
        }
      }

      // Retry if not successful
      if (reconnectAttempts.current < maxReconnectAttempts) {
        return await autoReconnect([...(excludeUserIds || []), data?.woman_user_id].filter(Boolean));
      }

      return { success: false };
    } catch (error) {
      console.error("Auto-reconnect error:", error);
      return { success: false };
    } finally {
      setIsConnecting(false);
    }
  }, [currentUserId, startChat, toast]);

  return {
    activeChats,
    isConnecting,
    canAddMoreChats: activeChats.length < MAX_PARALLEL_CHATS,
    maxChats: MAX_PARALLEL_CHATS,
    startChat,
    endChat,
    autoReconnect,
    refreshActiveChats
  };
}

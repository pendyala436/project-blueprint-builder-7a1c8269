import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface IncomingChat {
  sessionId: string;
  chatId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  partnerLanguage: string;
  ratePerMinute: number;
  startedAt: string;
}

interface UseIncomingChatsResult {
  incomingChats: IncomingChat[];
  acceptChat: (sessionId: string) => void;
  rejectChat: (sessionId: string) => Promise<void>;
  clearChat: (sessionId: string) => void;
}

// Create audio context for sounds
let buzzAudioContext: AudioContext | null = null;
let buzzIntervalId: NodeJS.Timeout | null = null;

const playBuzzSound = () => {
  try {
    if (!buzzAudioContext) {
      buzzAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const oscillator = buzzAudioContext.createOscillator();
    const gainNode = buzzAudioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(buzzAudioContext.destination);

    oscillator.frequency.value = 440; // A4 note
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, buzzAudioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, buzzAudioContext.currentTime + 0.3);

    oscillator.start(buzzAudioContext.currentTime);
    oscillator.stop(buzzAudioContext.currentTime + 0.3);
  } catch (error) {
    console.error("Error playing buzz sound:", error);
  }
};

// Small notification sound for men (single beep, not looping)
const playSmallNotificationSound = () => {
  try {
    if (!buzzAudioContext) {
      buzzAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const oscillator = buzzAudioContext.createOscillator();
    const gainNode = buzzAudioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(buzzAudioContext.destination);

    oscillator.frequency.value = 520; // Higher pitch for notification
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.15, buzzAudioContext.currentTime); // Quieter
    gainNode.gain.exponentialRampToValueAtTime(0.01, buzzAudioContext.currentTime + 0.15);

    oscillator.start(buzzAudioContext.currentTime);
    oscillator.stop(buzzAudioContext.currentTime + 0.15);
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
};

const startBuzzLoop = () => {
  if (buzzIntervalId) return;
  
  playBuzzSound();
  buzzIntervalId = setInterval(() => {
    playBuzzSound();
  }, 2000); // Buzz every 2 seconds
};

const stopBuzzLoop = () => {
  if (buzzIntervalId) {
    clearInterval(buzzIntervalId);
    buzzIntervalId = null;
  }
};

export const useIncomingChats = (
  currentUserId: string | null,
  userGender: "male" | "female"
): UseIncomingChatsResult => {
  const [incomingChats, setIncomingChats] = useState<IncomingChat[]>([]);
  const acceptedChatsRef = useRef<Set<string>>(new Set());
  const previousCountRef = useRef<number>(0);

  // Start/stop buzz sound based on incoming chats - ONLY for women
  useEffect(() => {
    if (userGender === "female") {
      // Women get continuous buzz until they reply or cancel
      if (incomingChats.length > 0) {
        startBuzzLoop();
      } else {
        stopBuzzLoop();
      }
    } else {
      // Men get a small notification sound only when new chats arrive
      if (incomingChats.length > previousCountRef.current && incomingChats.length > 0) {
        playSmallNotificationSound();
      }
      stopBuzzLoop(); // Always stop buzz loop for men
    }
    
    previousCountRef.current = incomingChats.length;

    return () => {
      stopBuzzLoop();
    };
  }, [incomingChats.length, userGender]);

  // Subscribe to new incoming chat sessions - OPTIMIZED for lakhs of users
  useEffect(() => {
    if (!currentUserId) return;

    let isCheckingRef = false;
    let lastCheckTime = 0;
    const MIN_CHECK_INTERVAL = 500; // Throttle to max 2 checks per second

    const checkForNewChats = async () => {
      // Prevent concurrent checks and throttle
      const now = Date.now();
      if (isCheckingRef || now - lastCheckTime < MIN_CHECK_INTERVAL) return;
      isCheckingRef = true;
      lastCheckTime = now;

      try {
        console.log(`[useIncomingChats] Checking for new chats for ${userGender} user: ${currentUserId}`);
        
        const column = userGender === "male" ? "man_user_id" : "woman_user_id";
        const partnerColumn = userGender === "male" ? "woman_user_id" : "man_user_id";
        
        // OPTIMIZED: Single query with limit
        const { data: sessions, error: sessionsError } = await supabase
          .from("active_chat_sessions")
          .select(`id, chat_id, ${partnerColumn}, rate_per_minute, created_at`)
          .eq(column, currentUserId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(10);

        if (sessionsError || !sessions || sessions.length === 0) {
          isCheckingRef = false;
          return;
        }

        // Filter out already accepted sessions first
        const pendingSessions = sessions.filter(s => !acceptedChatsRef.current.has(s.id));
        if (pendingSessions.length === 0) {
          isCheckingRef = false;
          return;
        }

        // BATCH: Get message counts for all pending sessions at once
        const chatIds = pendingSessions.map(s => s.chat_id);
        const { data: userMessages } = await supabase
          .from("chat_messages")
          .select("chat_id")
          .in("chat_id", chatIds)
          .eq("sender_id", currentUserId);

        const chatsWithMessages = new Set(userMessages?.map(m => m.chat_id) || []);

        // Filter sessions where user hasn't sent any message
        const incomingSessions = pendingSessions.filter(s => !chatsWithMessages.has(s.chat_id));
        if (incomingSessions.length === 0) {
          isCheckingRef = false;
          return;
        }

        // BATCH: Get all partner profiles at once
        const partnerIds = incomingSessions.map(s => s[partnerColumn as keyof typeof s] as string);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, primary_language")
          .in("user_id", partnerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        // Build incoming chats
        const newIncomingChats: IncomingChat[] = [];
        for (const session of incomingSessions) {
          const partnerId = session[partnerColumn as keyof typeof session] as string;
          const profile = profileMap.get(partnerId);

          const newChat: IncomingChat = {
            sessionId: session.id,
            chatId: session.chat_id,
            partnerId,
            partnerName: profile?.full_name || "User",
            partnerPhoto: profile?.photo_url || null,
            partnerLanguage: profile?.primary_language || "English",
            ratePerMinute: session.rate_per_minute || 2,
            startedAt: session.created_at
          };

          newIncomingChats.push(newChat);
        }

        if (newIncomingChats.length > 0) {
          setIncomingChats(prev => {
            const existingIds = new Set(prev.map(c => c.sessionId));
            const uniqueNew = newIncomingChats.filter(c => !existingIds.has(c.sessionId));
            return [...prev, ...uniqueNew];
          });
        }
      } catch (error) {
        console.error("[useIncomingChats] Error checking chats:", error);
      } finally {
        isCheckingRef = false;
      }
    };

    // Check immediately
    checkForNewChats();

    // User-scoped channel for efficient message routing at scale
    const channelName = `incoming-${currentUserId}-${Date.now()}`;
    const column = userGender === "male" ? "man_user_id" : "woman_user_id";

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'active_chat_sessions',
          filter: `${column}=eq.${currentUserId}`
        },
        () => checkForNewChats()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_chat_sessions',
          filter: `${column}=eq.${currentUserId}`
        },
        (payload) => {
          const session = payload.new as any;
          if (session.status === "ended") {
            setIncomingChats(prev => prev.filter(c => c.sessionId !== session.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, userGender]);

  const acceptChat = useCallback((sessionId: string) => {
    acceptedChatsRef.current.add(sessionId);
    setIncomingChats(prev => prev.filter(c => c.sessionId !== sessionId));
  }, []);

  const rejectChat = useCallback(async (sessionId: string) => {
    try {
      await supabase
        .from("active_chat_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          end_reason: userGender === "male" ? "man_rejected" : "woman_rejected"
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error rejecting chat:", error);
    }
    
    setIncomingChats(prev => prev.filter(c => c.sessionId !== sessionId));
  }, [userGender]);

  const clearChat = useCallback((sessionId: string) => {
    acceptedChatsRef.current.add(sessionId);
    setIncomingChats(prev => prev.filter(c => c.sessionId !== sessionId));
  }, []);

  return {
    incomingChats,
    acceptChat,
    rejectChat,
    clearChat
  };
};

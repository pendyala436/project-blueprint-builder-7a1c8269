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

  // Subscribe to new incoming chat sessions
  useEffect(() => {
    if (!currentUserId) return;

    const checkForNewChats = async () => {
      console.log(`[useIncomingChats] Checking for new chats for ${userGender} user: ${currentUserId}`);
      
      // Get recent active sessions where this user is the target
      const column = userGender === "male" ? "man_user_id" : "woman_user_id";
      const partnerColumn = userGender === "male" ? "woman_user_id" : "man_user_id";
      
      const { data: sessions, error: sessionsError } = await supabase
        .from("active_chat_sessions")
        .select("*")
        .eq(column, currentUserId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      console.log(`[useIncomingChats] Found ${sessions?.length || 0} active sessions`, sessionsError);

      if (!sessions || sessions.length === 0) return;

      // Check if any session has no messages from this user (incoming)
      for (const session of sessions) {
        if (acceptedChatsRef.current.has(session.id)) {
          console.log(`[useIncomingChats] Session ${session.id} already accepted`);
          continue;
        }

        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", session.chat_id)
          .eq("sender_id", currentUserId);

        console.log(`[useIncomingChats] Session ${session.id} has ${count} messages from current user`);

        // If user hasn't sent any message, it's an incoming chat
        if (count === 0) {
          const partnerId = session[partnerColumn];
          
          // Get partner info
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, photo_url, primary_language")
            .eq("user_id", partnerId)
            .maybeSingle();

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

          console.log(`[useIncomingChats] Adding incoming chat:`, newChat);

          setIncomingChats(prev => {
            if (prev.some(c => c.sessionId === newChat.sessionId)) return prev;
            return [...prev, newChat];
          });
        }
      }
    };

    // Check immediately
    checkForNewChats();

    // Subscribe to new sessions
    const channel = supabase
      .channel(`incoming-chats-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'active_chat_sessions'
        },
        (payload) => {
          const session = payload.new;
          const column = userGender === "male" ? "man_user_id" : "woman_user_id";
          
          if (session[column] === currentUserId) {
            checkForNewChats();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_chat_sessions'
        },
        (payload) => {
          const session = payload.new;
          
          // Remove from incoming if chat ended
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

import { useState, useEffect } from "react";
import { IndianRupee, Clock, TrendingUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ChatEarningsDisplayProps {
  chatPartnerId: string;
  currentUserId: string;
  userGender: "male" | "female";
}

const ChatEarningsDisplay = ({ 
  chatPartnerId, 
  currentUserId, 
  userGender 
}: ChatEarningsDisplayProps) => {
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [activeChats, setActiveChats] = useState(0);
  const [currentSessionEarnings, setCurrentSessionEarnings] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    loadEarningsData();
    
    // Update timer every second
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    // Subscribe to earnings updates
    const channel = supabase
      .channel(`earnings-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'women_earnings',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          setCurrentSessionEarnings(prev => prev + payload.new.amount);
          setTodayEarnings(prev => prev + payload.new.amount);
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Only women see earnings (they earn from chats)
  if (userGender !== "female") {
    return null;
  }

  const loadEarningsData = async () => {
    try {
      // Get today's earnings
      const today = new Date().toISOString().split("T")[0];
      const { data: earnings } = await supabase
        .from("women_earnings")
        .select("amount")
        .eq("user_id", currentUserId)
        .gte("created_at", `${today}T00:00:00`);

      const total = earnings?.reduce((acc, e) => acc + Number(e.amount), 0) || 0;
      setTodayEarnings(total);

      // Get active chat count
      const { count } = await supabase
        .from("active_chat_sessions")
        .select("*", { count: "exact", head: true })
        .eq("woman_user_id", currentUserId)
        .eq("status", "active");

      setActiveChats(count || 0);

      // Get current session earnings
      const { data: currentSession } = await supabase
        .from("active_chat_sessions")
        .select("total_earned")
        .eq("woman_user_id", currentUserId)
        .eq("man_user_id", chatPartnerId)
        .eq("status", "active")
        .maybeSingle();

      if (currentSession) {
        setCurrentSessionEarnings(currentSession.total_earned);
      }
    } catch (error) {
      console.error("Error loading earnings:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2 text-sm bg-emerald-500/10 border-b border-emerald-500/20">
      {/* Session Duration */}
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-emerald-600" />
        <span className="font-mono">{formatTime(elapsedSeconds)}</span>
      </div>

      {/* This Chat Earnings */}
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-muted-foreground">This chat:</span>
        <span className="font-medium text-emerald-600">₹{currentSessionEarnings.toFixed(2)}</span>
      </div>

      {/* Today's Total */}
      <div className="flex items-center gap-1.5 ml-auto">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-muted-foreground">Today:</span>
        <span className="font-bold text-emerald-600">₹{todayEarnings.toFixed(0)}</span>
      </div>

      {/* Active Chats Badge */}
      {activeChats > 1 && (
        <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 text-xs font-medium">
          {activeChats} active
        </div>
      )}
    </div>
  );
};

export default ChatEarningsDisplay;

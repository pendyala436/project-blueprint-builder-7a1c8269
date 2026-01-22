import { useState, useEffect, useCallback, useRef } from "react";
import { IndianRupee, Clock, TrendingUp, Sparkles, Circle, Star, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ChatEarningsDisplayProps {
  chatPartnerId: string;
  currentUserId: string;
  userGender: "male" | "female";
  onSessionEnd?: (reason: string) => void;
}

const ChatEarningsDisplay = ({ 
  chatPartnerId, 
  currentUserId, 
  userGender,
  onSessionEnd 
}: ChatEarningsDisplayProps) => {
  const { toast } = useToast();
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [activeChats, setActiveChats] = useState(0);
  const [currentSessionEarnings, setCurrentSessionEarnings] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [earningRate, setEarningRate] = useState(2.00);
  const [userStatus, setUserStatus] = useState<"online" | "busy" | "offline">("online");
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isEarningEligible, setIsEarningEligible] = useState<boolean | null>(null);
  const [earningBadgeType, setEarningBadgeType] = useState<string | null>(null);
  const inactivityInterval = useRef<NodeJS.Timeout | null>(null);
  
  const INACTIVITY_TIMEOUT = 180000; // 3 minutes in ms

  // Only women see this component
  if (userGender !== "female") {
    return null;
  }

  // Define loadEarningsData BEFORE useEffect
  const loadEarningsData = useCallback(async () => {
    try {
      // First check earning eligibility from female_profiles or profiles
      const { data: femaleProfile } = await supabase
        .from("female_profiles")
        .select("is_earning_eligible, earning_badge_type, is_indian, country")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (femaleProfile) {
        setIsEarningEligible(femaleProfile.is_earning_eligible ?? false);
        setEarningBadgeType(femaleProfile.earning_badge_type);
      } else {
        // Fallback to profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_earning_eligible, earning_badge_type, is_indian, country")
          .eq("user_id", currentUserId)
          .maybeSingle();
        
        if (profile) {
          setIsEarningEligible(profile.is_earning_eligible ?? false);
          setEarningBadgeType(profile.earning_badge_type);
        }
      }

      // Get admin-set earning rate for women
      const { data: pricing } = await supabase
        .from("chat_pricing")
        .select("women_earning_rate")
        .eq("is_active", true)
        .maybeSingle();
      
      if (pricing) {
        setEarningRate(pricing.women_earning_rate);
      }

      // Only fetch earnings if eligible
      if (isEarningEligible) {
        // Get today's earnings
        const today = new Date().toISOString().split("T")[0];
        const { data: earnings } = await supabase
          .from("women_earnings")
          .select("amount")
          .eq("user_id", currentUserId)
          .gte("created_at", `${today}T00:00:00`);

        const total = earnings?.reduce((acc, e) => acc + Number(e.amount), 0) || 0;
        setTodayEarnings(total);
      }

      // Get active chat count
      const { count } = await supabase
        .from("active_chat_sessions")
        .select("*", { count: "exact", head: true })
        .eq("woman_user_id", currentUserId)
        .eq("status", "active");

      const chatCount = count || 0;
      setActiveChats(chatCount);

      // Update status based on chat count
      if (chatCount >= 3) {
        setUserStatus("busy");
      } else if (chatCount > 0) {
        setUserStatus("online");
      } else {
        setUserStatus("online");
      }

      // Get current session
      const { data: currentSession } = await supabase
        .from("active_chat_sessions")
        .select("total_earned, started_at, chat_id")
        .eq("woman_user_id", currentUserId)
        .eq("man_user_id", chatPartnerId)
        .eq("status", "active")
        .maybeSingle();

      if (currentSession) {
        setCurrentChatId(currentSession.chat_id);
        const sessionDurationMs = Date.now() - new Date(currentSession.started_at).getTime();
        setElapsedSeconds(Math.floor(sessionDurationMs / 1000));
        
        // Only calculate earnings if eligible
        if (isEarningEligible) {
          const sessionMinutes = sessionDurationMs / (1000 * 60);
          const womenEarnings = sessionMinutes * (pricing?.women_earning_rate || 2);
          setCurrentSessionEarnings(womenEarnings);
        }
      }
    } catch (error) {
      console.error("Error loading earnings:", error);
    }
  }, [currentUserId, chatPartnerId, isEarningEligible]);

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivityTime(Date.now());
  }, []);

  // Add activity listeners
  useEffect(() => {
    const handleActivity = () => updateActivity();
    
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [updateActivity]);

  // Check inactivity and end session if no activity for 3 minutes
  useEffect(() => {
    if (!currentChatId) return;

    inactivityInterval.current = setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      
      if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
        // Session ended due to inactivity (woman)
        
        try {
          await supabase.functions.invoke("chat-manager", {
            body: { action: "end_chat", chat_id: currentChatId, end_reason: "inactivity_timeout" }
          });
        } catch (error) {
          console.error("Error ending inactive chat:", error);
        }
        
        if (inactivityInterval.current) clearInterval(inactivityInterval.current);
        setCurrentChatId(null);
        onSessionEnd?.("inactivity_timeout");
        
        toast({
          title: "Chat Ended",
          description: "Session ended due to 3 minutes of inactivity. Earnings for this session have been saved.",
        });
        
        // Reload earnings data
        loadEarningsData();
      }
    }, 10000); // Check every 10 seconds

    return () => {
      if (inactivityInterval.current) clearInterval(inactivityInterval.current);
    };
  }, [currentChatId, lastActivityTime, onSessionEnd, toast, loadEarningsData]);

  useEffect(() => {
    loadEarningsData();
    
    // Update timer and estimated earnings every second (only if eligible)
    const timer = setInterval(() => {
      setElapsedSeconds(prev => {
        const newSeconds = prev + 1;
        // Only update earnings if eligible
        if (isEarningEligible) {
          const minutes = newSeconds / 60;
          setCurrentSessionEarnings(minutes * earningRate);
        }
        return newSeconds;
      });
    }, 1000);

    // Subscribe to earnings updates (only if eligible)
    let channel: any = null;
    if (isEarningEligible) {
      channel = supabase
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
            setTodayEarnings(prev => prev + (payload.new as any).amount);
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentUserId, chatPartnerId, loadEarningsData, earningRate, isEarningEligible]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Show different UI based on earning eligibility
  if (isEarningEligible === false) {
    // Non-earning user (non-Indian or over limit)
    return (
      <div className="flex items-center gap-4 px-4 py-2 text-sm bg-muted/50 border-b border-border">
        {/* User Status */}
        <div className="flex items-center gap-1.5">
          <Circle className={cn(
            "h-2.5 w-2.5 fill-current",
            userStatus === "online" && "text-emerald-500",
            userStatus === "busy" && "text-amber-500",
            userStatus === "offline" && "text-muted-foreground"
          )} />
          <span className={cn(
            "text-xs font-medium capitalize",
            userStatus === "online" && "text-emerald-600",
            userStatus === "busy" && "text-amber-600",
            userStatus === "offline" && "text-muted-foreground"
          )}>
            {userStatus}
          </span>
        </div>

        {/* Free Chat Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted">
          <Ban className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Free Chat Mode</span>
        </div>

        {/* Session Duration */}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-muted-foreground">{formatTime(elapsedSeconds)}</span>
        </div>

        {/* Info message */}
        <div className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
          <span>No earnings - chat freely without restrictions</span>
        </div>

        {/* Active Chats Badge */}
        <div className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          activeChats >= 3 ? "bg-amber-500/20 text-amber-700" : "bg-muted text-muted-foreground"
        )}>
          {activeChats}/3 active
        </div>
      </div>
    );
  }

  // Earning-eligible user (Indian women with earning slot)
  return (
    <div className="flex items-center gap-4 px-4 py-2 text-sm bg-emerald-500/10 border-b border-emerald-500/20">
      {/* Star Badge for Earning Users */}
      {earningBadgeType === "star" && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20">
          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
          <span className="text-xs font-medium text-amber-700">Earner</span>
        </div>
      )}

      {/* User Status */}
      <div className="flex items-center gap-1.5">
        <Circle className={cn(
          "h-2.5 w-2.5 fill-current",
          userStatus === "online" && "text-emerald-500",
          userStatus === "busy" && "text-amber-500",
          userStatus === "offline" && "text-muted-foreground"
        )} />
        <span className={cn(
          "text-xs font-medium capitalize",
          userStatus === "online" && "text-emerald-600",
          userStatus === "busy" && "text-amber-600",
          userStatus === "offline" && "text-muted-foreground"
        )}>
          {userStatus}
        </span>
      </div>

      {/* Earning Rate - Per Chat */}
      <div className="flex items-center gap-1.5">
        <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
        <span className="font-medium text-emerald-600">₹{earningRate}/min</span>
      </div>

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
      <div className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium",
        activeChats >= 3 ? "bg-amber-500/20 text-amber-700" : "bg-emerald-500/20 text-emerald-700"
      )}>
        {activeChats}/3 active
      </div>
    </div>
  );
};

export default ChatEarningsDisplay;

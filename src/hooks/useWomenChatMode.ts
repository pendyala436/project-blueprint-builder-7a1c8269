import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WomenChatMode = "paid" | "free" | "exclusive_free";

interface WomenChatModeState {
  currentMode: WomenChatMode;
  isIndian: boolean;
  freeMinutesUsed: number;
  freeMinutesLimit: number;
  exclusiveFreeLockedUntil: string | null;
  isLoading: boolean;
  canSwitchToPaid: boolean;
  canSwitchToFree: boolean;
  canSwitchToExclusiveFree: boolean;
  freeTimeRemaining: number; // in seconds
  switchMode: (newMode: WomenChatMode) => Promise<boolean>;
  trackFreeMinute: () => Promise<void>;
}

export const useWomenChatMode = (userId: string | null, isIndianUser?: boolean): WomenChatModeState => {
  const isIndian = isIndianUser ?? false;
  const defaultMode: WomenChatMode = isIndian ? "paid" : "free";
  const [currentMode, setCurrentMode] = useState<WomenChatMode>(defaultMode);
  const [freeMinutesUsed, setFreeMinutesUsed] = useState(0);
  const [freeMinutesLimit, setFreeMinutesLimit] = useState(60);
  const [exclusiveFreeLockedUntil, setExclusiveFreeLockedUntil] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load current mode from DB
  useEffect(() => {
    if (!userId) return;

    const loadMode = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("women_chat_modes")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.error("[useWomenChatMode] Error:", error);
          setIsLoading(false);
          return;
        }

        if (data) {
          const today = new Date().toISOString().split("T")[0];
          const lastReset = data.last_free_reset_date;

          // Reset free minutes if it's a new day
          if (lastReset !== today) {
            await supabase
              .from("women_chat_modes")
              .update({
                free_minutes_used_today: 0,
                last_free_reset_date: today,
                // If exclusive free lock expired, reset to default mode
                ...(data.exclusive_free_locked_until && 
                  new Date(data.exclusive_free_locked_until) <= new Date() 
                  ? { current_mode: defaultMode, exclusive_free_locked_until: null }
                  : {}
                )
              })
              .eq("user_id", userId);
            
            setFreeMinutesUsed(0);
            
            // Check if exclusive free lock expired
            if (data.exclusive_free_locked_until && 
                new Date(data.exclusive_free_locked_until) <= new Date()) {
              setCurrentMode(defaultMode);
              setExclusiveFreeLockedUntil(null);
            } else {
              setCurrentMode(data.current_mode as WomenChatMode);
              setExclusiveFreeLockedUntil(data.exclusive_free_locked_until);
            }
          } else {
            setCurrentMode(data.current_mode as WomenChatMode);
            setFreeMinutesUsed(Number(data.free_minutes_used_today) || 0);
            setExclusiveFreeLockedUntil(data.exclusive_free_locked_until);
          }
          setFreeMinutesLimit(Number(data.free_minutes_limit) || 60);
        } else {
          // Create default record - Indian women default to paid, non-Indian to free
          await supabase.from("women_chat_modes").insert({
            user_id: userId,
            current_mode: defaultMode,
            free_minutes_used_today: 0,
            free_minutes_limit: 60,
            last_free_reset_date: new Date().toISOString().split("T")[0]
          });
          setCurrentMode(defaultMode);
        }
      } catch (err) {
        console.error("[useWomenChatMode] Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMode();
  }, [userId]);

  // Determine what modes can be switched to
  const isExclusiveFreeLocked = exclusiveFreeLockedUntil && 
    new Date(exclusiveFreeLockedUntil) > new Date();

  const canSwitchToPaid = currentMode !== "paid" && !isExclusiveFreeLocked;
  const canSwitchToFree = currentMode !== "free" && !isExclusiveFreeLocked && freeMinutesUsed < freeMinutesLimit;
  const canSwitchToExclusiveFree = currentMode !== "exclusive_free" && !isExclusiveFreeLocked;

  const freeTimeRemaining = Math.max(0, (freeMinutesLimit - freeMinutesUsed) * 60);

  const switchMode = useCallback(async (newMode: WomenChatMode): Promise<boolean> => {
    if (!userId) return false;

    // Validate switch
    if (newMode === "paid" && isExclusiveFreeLocked) {
      return false;
    }

    if (newMode === "free" && freeMinutesUsed >= freeMinutesLimit) {
      return false;
    }

    try {
      const updateData: Record<string, any> = {
        current_mode: newMode,
        mode_switched_at: new Date().toISOString(),
      };

      if (newMode === "exclusive_free") {
        // Lock for 24 hours
        const lockUntil = new Date();
        lockUntil.setHours(lockUntil.getHours() + 24);
        updateData.exclusive_free_locked_until = lockUntil.toISOString();
        setExclusiveFreeLockedUntil(lockUntil.toISOString());
      }

      if (newMode === "paid") {
        updateData.exclusive_free_locked_until = null;
        setExclusiveFreeLockedUntil(null);
      }

      const { error } = await supabase
        .from("women_chat_modes")
        .update(updateData)
        .eq("user_id", userId);

      if (error) {
        console.error("[useWomenChatMode] Switch error:", error);
        return false;
      }

      setCurrentMode(newMode);

      // If switching from free/exclusive_free to paid, end active chats with non-recharged men
      if (newMode === "paid" && (currentMode === "free" || currentMode === "exclusive_free")) {
        // End sessions with zero-balance men
        await endChatsWithNonRechargedMen(userId);
      }

      // If switching to free/exclusive_free from paid, end chats with premium men
      if ((newMode === "free" || newMode === "exclusive_free") && currentMode === "paid") {
        await endChatsWithRechargedMen(userId);
      }

      return true;
    } catch (err) {
      console.error("[useWomenChatMode] Error:", err);
      return false;
    }
  }, [userId, currentMode, isExclusiveFreeLocked, freeMinutesUsed, freeMinutesLimit]);

  // Track free minutes usage
  const trackFreeMinute = useCallback(async () => {
    if (!userId || currentMode === "paid") return;

    const newUsed = freeMinutesUsed + 1;
    setFreeMinutesUsed(newUsed);

    await supabase
      .from("women_chat_modes")
      .update({ free_minutes_used_today: newUsed })
      .eq("user_id", userId);

    // Auto-end chats when free time expires (only for free mode, not exclusive_free)
    if (currentMode === "free" && newUsed >= freeMinutesLimit) {
      // Auto-switch to default mode (paid for Indian, free stays for non-Indian but ends chats)
      await switchMode(defaultMode);
    }
  }, [userId, currentMode, freeMinutesUsed, freeMinutesLimit, switchMode]);

  return {
    currentMode,
    isIndian,
    freeMinutesUsed,
    freeMinutesLimit,
    exclusiveFreeLockedUntil,
    isLoading,
    canSwitchToPaid,
    canSwitchToFree,
    canSwitchToExclusiveFree,
    freeTimeRemaining,
    switchMode,
    trackFreeMinute,
  };
};

// Helper: End chats with non-recharged men
async function endChatsWithNonRechargedMen(userId: string) {
  try {
    // Get active sessions
    const { data: sessions } = await supabase
      .from("active_chat_sessions")
      .select("id, man_user_id")
      .eq("woman_user_id", userId)
      .eq("status", "active");

    if (!sessions?.length) return;

    const manIds = sessions.map(s => s.man_user_id);
    const { data: wallets } = await supabase
      .from("wallets")
      .select("user_id, balance")
      .in("user_id", manIds);

    const walletMap = new Map(wallets?.map(w => [w.user_id, w.balance]) || []);

    // End sessions with men who have zero balance
    for (const session of sessions) {
      const balance = walletMap.get(session.man_user_id) || 0;
      if (balance <= 0) {
        await supabase
          .from("active_chat_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString(), end_reason: "mode_switch" })
          .eq("id", session.id);
      }
    }
  } catch (err) {
    console.error("[endChatsWithNonRechargedMen] Error:", err);
  }
}

// Helper: End chats with recharged men
async function endChatsWithRechargedMen(userId: string) {
  try {
    const { data: sessions } = await supabase
      .from("active_chat_sessions")
      .select("id, man_user_id")
      .eq("woman_user_id", userId)
      .eq("status", "active");

    if (!sessions?.length) return;

    const manIds = sessions.map(s => s.man_user_id);
    const { data: wallets } = await supabase
      .from("wallets")
      .select("user_id, balance")
      .in("user_id", manIds);

    const walletMap = new Map(wallets?.map(w => [w.user_id, w.balance]) || []);

    // End sessions with men who have balance > 0
    for (const session of sessions) {
      const balance = walletMap.get(session.man_user_id) || 0;
      if (balance > 0) {
        await supabase
          .from("active_chat_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString(), end_reason: "mode_switch" })
          .eq("id", session.id);
      }
    }
  } catch (err) {
    console.error("[endChatsWithRechargedMen] Error:", err);
  }
}

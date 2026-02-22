import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MenFreeMinutesState {
  hasFreeMinutes: boolean;
  freeMinutesRemaining: number;
  freeMinutesTotal: number;
  freeMinutesUsed: number;
  nextResetDate: string | null;
  isLoading: boolean;
  useFreeMinute: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export const useMenFreeMinutes = (userId: string | null): MenFreeMinutesState => {
  const [hasFreeMinutes, setHasFreeMinutes] = useState(false);
  const [freeMinutesRemaining, setFreeMinutesRemaining] = useState(0);
  const [freeMinutesTotal, setFreeMinutesTotal] = useState(10);
  const [freeMinutesUsed, setFreeMinutesUsed] = useState(0);
  const [nextResetDate, setNextResetDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllowance = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("check_men_free_minutes", {
        p_user_id: userId,
      });

      if (error) {
        console.error("[useMenFreeMinutes] Error:", error);
        return;
      }

      if (data && typeof data === "object" && !Array.isArray(data)) {
        const d = data as Record<string, any>;
        setHasFreeMinutes(d.has_free_minutes);
        setFreeMinutesRemaining(d.free_minutes_remaining);
        setFreeMinutesTotal(d.free_minutes_total);
        setFreeMinutesUsed(d.free_minutes_used);
        setNextResetDate(d.next_reset_date);
      }
    } catch (err) {
      console.error("[useMenFreeMinutes] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAllowance();
  }, [loadAllowance]);

  const useFreeMinute = useCallback(async (): Promise<boolean> => {
    if (!userId || !hasFreeMinutes) return false;

    try {
      const { data, error } = await supabase.rpc("use_men_free_minute", {
        p_user_id: userId,
      });

      const d = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, any>) : null;

      if (error || !d?.success) {
        console.error("[useMenFreeMinutes] Use error:", error || d?.error);
        return false;
      }

      setFreeMinutesRemaining(d.remaining);
      setFreeMinutesUsed((prev) => prev + 1);
      setHasFreeMinutes(d.remaining > 0);
      return true;
    } catch (err) {
      console.error("[useMenFreeMinutes] Error:", err);
      return false;
    }
  }, [userId, hasFreeMinutes]);

  return {
    hasFreeMinutes,
    freeMinutesRemaining,
    freeMinutesTotal,
    freeMinutesUsed,
    nextResetDate,
    isLoading,
    useFreeMinute,
    refresh: loadAllowance,
  };
};

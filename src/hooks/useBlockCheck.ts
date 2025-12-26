import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BlockStatus {
  isBlockedByMe: boolean;
  isBlockedByThem: boolean;
  isBlocked: boolean; // Either direction
  isLoading: boolean;
}

export const useBlockCheck = (currentUserId: string | null, targetUserId: string | null) => {
  const [blockStatus, setBlockStatus] = useState<BlockStatus>({
    isBlockedByMe: false,
    isBlockedByThem: false,
    isBlocked: false,
    isLoading: true
  });

  const checkBlockStatus = useCallback(async () => {
    if (!currentUserId || !targetUserId) {
      setBlockStatus({
        isBlockedByMe: false,
        isBlockedByThem: false,
        isBlocked: false,
        isLoading: false
      });
      return;
    }

    try {
      // Check if I blocked them
      const { data: blockedByMe } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocked_by", currentUserId)
        .eq("blocked_user_id", targetUserId)
        .maybeSingle();

      // Check if they blocked me
      const { data: blockedByThem } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocked_by", targetUserId)
        .eq("blocked_user_id", currentUserId)
        .maybeSingle();

      const isBlockedByMe = !!blockedByMe;
      const isBlockedByThem = !!blockedByThem;

      setBlockStatus({
        isBlockedByMe,
        isBlockedByThem,
        isBlocked: isBlockedByMe || isBlockedByThem,
        isLoading: false
      });
    } catch (error) {
      console.error("Error checking block status:", error);
      setBlockStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [currentUserId, targetUserId]);

  useEffect(() => {
    checkBlockStatus();
  }, [checkBlockStatus]);

  // Subscribe to real-time block changes
  useEffect(() => {
    if (!currentUserId || !targetUserId) return;

    const channel = supabase
      .channel(`block-check-${currentUserId}-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_blocks'
        },
        (payload: any) => {
          // Check if this affects our relationship
          const { blocked_by, blocked_user_id } = payload.new || payload.old || {};
          if (
            (blocked_by === currentUserId && blocked_user_id === targetUserId) ||
            (blocked_by === targetUserId && blocked_user_id === currentUserId)
          ) {
            checkBlockStatus();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, targetUserId, checkBlockStatus]);

  return {
    ...blockStatus,
    refresh: checkBlockStatus
  };
};

export default useBlockCheck;

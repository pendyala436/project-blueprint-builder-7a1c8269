import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VideoAccessState {
  hasAccess: boolean;
  isOwner: boolean;
  remainingSeconds: number;
  accessExpiresAt: string | null;
  groupLanguage: string | null;
  minGiftAmount: number;
  isLoading: boolean;
  error: string | null;
}

interface UseGroupVideoAccessProps {
  groupId: string;
  userId: string;
  onAccessExpired?: () => void;
}

export function useGroupVideoAccess({ 
  groupId, 
  userId, 
  onAccessExpired 
}: UseGroupVideoAccessProps) {
  const [state, setState] = useState<VideoAccessState>({
    hasAccess: false,
    isOwner: false,
    remainingSeconds: 0,
    accessExpiresAt: null,
    groupLanguage: null,
    minGiftAmount: 0,
    isLoading: true,
    error: null,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Safe state setter
  const safeSetState = useCallback((updater: (prev: VideoAccessState) => VideoAccessState) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const checkAccess = useCallback(async () => {
    if (!groupId || !userId) {
      safeSetState(prev => ({ ...prev, isLoading: false }));
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('check_group_video_access', {
        p_user_id: userId,
        p_group_id: groupId,
      });

      if (error) throw error;

      if (!mountedRef.current) return false;

      const result = data as {
        has_access: boolean;
        is_owner: boolean;
        remaining_seconds: number;
        access_expires_at?: string;
        group_language?: string;
        min_gift_amount?: number;
      };

      safeSetState(prev => ({
        ...prev,
        hasAccess: result.has_access,
        isOwner: result.is_owner,
        remainingSeconds: Math.max(0, result.remaining_seconds),
        accessExpiresAt: result.access_expires_at || null,
        groupLanguage: result.group_language || null,
        minGiftAmount: result.min_gift_amount || 0,
        isLoading: false,
        error: null,
      }));

      // If has access and not owner, start countdown timer
      if (result.has_access && !result.is_owner && result.remaining_seconds > 0) {
        startCountdown(result.remaining_seconds);
      } else {
        clearTimers();
      }

      return result.has_access;
    } catch (error: any) {
      console.error('Error checking video access:', error);
      safeSetState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error.message || 'Failed to check access'
      }));
      return false;
    }
  }, [groupId, userId, safeSetState, clearTimers]);

  const startCountdown = useCallback((seconds: number) => {
    // Clear existing timers
    clearTimers();

    if (seconds <= 0 || !mountedRef.current) return;

    // Set expiry timer
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        safeSetState(prev => ({ ...prev, hasAccess: false, remainingSeconds: 0 }));
        onAccessExpired?.();
      }
    }, seconds * 1000);

    // Start countdown interval
    countdownRef.current = setInterval(() => {
      safeSetState(prev => {
        const newSeconds = Math.max(0, prev.remainingSeconds - 1);
        if (newSeconds === 0) {
          clearTimers();
        }
        return { ...prev, remainingSeconds: newSeconds };
      });
    }, 1000);
  }, [onAccessExpired, safeSetState, clearTimers]);

  const sendGiftForAccess = useCallback(async (giftId: string) => {
    if (!groupId || !userId) {
      return { success: false, error: 'Invalid group or user' };
    }

    try {
      const { data, error } = await supabase.rpc('process_group_video_gift', {
        p_sender_id: userId,
        p_group_id: groupId,
        p_gift_id: giftId,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        gift_name?: string;
        gift_emoji?: string;
        gift_price?: number;
        women_share?: number;
        admin_share?: number;
        new_balance?: number;
        access_expires_at?: string;
        access_duration_minutes?: number;
        group_language?: string;
      };

      if (result.success && mountedRef.current) {
        // Refresh access state
        await checkAccess();
      }

      return result;
    } catch (error: any) {
      console.error('Error sending gift for access:', error);
      return { success: false, error: error.message || 'Failed to send gift' };
    }
  }, [groupId, userId, checkAccess]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Initial access check
  useEffect(() => {
    mountedRef.current = true;
    checkAccess();

    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [checkAccess, clearTimers]);

  return {
    ...state,
    checkAccess,
    sendGiftForAccess,
    formatTime,
  };
}

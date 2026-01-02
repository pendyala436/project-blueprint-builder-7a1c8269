import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PrivateCallState {
  hasAccess: boolean;
  isInitiator: boolean;
  remainingSeconds: number;
  accessExpiresAt: string | null;
  callId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UsePrivateVideoCallProps {
  callId: string | null;
  userId: string;
  onAccessExpired?: () => void;
}

export function usePrivateVideoCall({ 
  callId, 
  userId, 
  onAccessExpired 
}: UsePrivateVideoCallProps) {
  const [state, setState] = useState<PrivateCallState>({
    hasAccess: false,
    isInitiator: false,
    remainingSeconds: 0,
    accessExpiresAt: null,
    callId: null,
    isLoading: true,
    error: null,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const safeSetState = useCallback((updater: (prev: PrivateCallState) => PrivateCallState) => {
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
    if (!callId || !userId) {
      safeSetState(prev => ({ ...prev, isLoading: false }));
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('check_private_call_access', {
        p_call_id: callId,
        p_user_id: userId,
      });

      if (error) throw error;

      if (!mountedRef.current) return false;

      const result = data as {
        has_access: boolean;
        is_caller?: boolean;
        remaining_seconds?: number;
        access_expires_at?: string;
        call_id?: string;
        expired?: boolean;
        error?: string;
      };

      if (result.expired) {
        safeSetState(prev => ({
          ...prev,
          hasAccess: false,
          remainingSeconds: 0,
          isLoading: false,
        }));
        onAccessExpired?.();
        return false;
      }

      safeSetState(prev => ({
        ...prev,
        hasAccess: result.has_access,
        isInitiator: result.is_caller || false,
        remainingSeconds: Math.max(0, result.remaining_seconds || 0),
        accessExpiresAt: result.access_expires_at || null,
        callId: result.call_id || callId,
        isLoading: false,
        error: result.error || null,
      }));

      if (result.has_access && result.remaining_seconds && result.remaining_seconds > 0) {
        startCountdown(result.remaining_seconds);
      } else {
        clearTimers();
      }

      return result.has_access;
    } catch (error: any) {
      console.error('Error checking private call access:', error);
      safeSetState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error.message || 'Failed to check access'
      }));
      return false;
    }
  }, [callId, userId, onAccessExpired, safeSetState, clearTimers]);

  const startCountdown = useCallback((seconds: number) => {
    clearTimers();

    if (seconds <= 0 || !mountedRef.current) return;

    timerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        safeSetState(prev => ({ ...prev, hasAccess: false, remainingSeconds: 0 }));
        onAccessExpired?.();
      }
    }, seconds * 1000);

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

  const sendGiftForCall = useCallback(async (
    receiverId: string, 
    giftId: string, 
    invitationId?: string
  ) => {
    if (!userId) {
      return { success: false, error: 'Invalid user' };
    }

    try {
      const { data, error } = await supabase.rpc('process_private_call_gift', {
        p_sender_id: userId,
        p_receiver_id: receiverId,
        p_gift_id: giftId,
        p_invitation_id: invitationId || null,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        call_id?: string;
        gift_name?: string;
        gift_emoji?: string;
        gift_price?: number;
        women_share?: number;
        admin_share?: number;
        new_balance?: number;
        access_expires_at?: string;
        access_duration_minutes?: number;
        receiver_language?: string;
      };

      if (result.success && mountedRef.current && result.call_id) {
        safeSetState(prev => ({
          ...prev,
          hasAccess: true,
          callId: result.call_id!,
          remainingSeconds: (result.access_duration_minutes || 30) * 60,
          accessExpiresAt: result.access_expires_at || null,
        }));
        startCountdown((result.access_duration_minutes || 30) * 60);
      }

      return result;
    } catch (error: any) {
      console.error('Error sending gift for private call:', error);
      return { success: false, error: error.message || 'Failed to send gift' };
    }
  }, [userId, safeSetState, startCountdown]);

  const endCall = useCallback(async () => {
    if (!state.callId) return;

    try {
      await supabase
        .from('private_calls')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString() 
        })
        .eq('id', state.callId);
      
      clearTimers();
      safeSetState(prev => ({ ...prev, hasAccess: false, remainingSeconds: 0 }));
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [state.callId, clearTimers, safeSetState]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (callId) {
      checkAccess();
    } else {
      safeSetState(prev => ({ ...prev, isLoading: false }));
    }

    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [callId, userId]);

  return {
    ...state,
    checkAccess,
    sendGiftForCall,
    endCall,
    formatTime,
  };
}

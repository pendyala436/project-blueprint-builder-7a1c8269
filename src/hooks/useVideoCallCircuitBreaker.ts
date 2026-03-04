import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CircuitBreakerState {
  active: boolean;
  reason?: string;
  resumesAt?: string;
  loading: boolean;
}

/**
 * Hook to check if video calls are disabled due to high server resource utilization.
 * When CPU or memory > 95%, all video calls are blocked for 2 hours.
 */
export const useVideoCallCircuitBreaker = () => {
  const [state, setState] = useState<CircuitBreakerState>({
    active: false,
    loading: true,
  });

  const checkStatus = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('video-call-circuit-breaker', {
        body: { action: 'check_status' },
      });

      setState({
        active: data?.active ?? false,
        reason: data?.reason,
        resumesAt: data?.resumes_at,
        loading: false,
      });
    } catch (err) {
      console.error('[CircuitBreaker] Check failed:', err);
      // Fail open — don't block calls if we can't check
      setState({ active: false, loading: false });
    }
  }, []);

  useEffect(() => {
    checkStatus();
    // Re-check every 2 minutes
    const interval = setInterval(checkStatus, 120_000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    isVideoCallsDisabled: state.active,
    reason: state.reason,
    resumesAt: state.resumesAt,
    loading: state.loading,
    refresh: checkStatus,
  };
};

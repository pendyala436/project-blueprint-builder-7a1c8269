import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CircuitBreakerState {
  active: boolean;
  permanentlyDisabled: boolean;
  reason?: string;
  resumesAt?: string;
  loading: boolean;
}

/**
 * Hook to check if video calls are disabled due to:
 * 1. High server resource utilization (circuit breaker - auto-resumes after 2h)
 * 2. Admin permanent disable toggle
 */
export const useVideoCallCircuitBreaker = () => {
  const [state, setState] = useState<CircuitBreakerState>({
    active: false,
    permanentlyDisabled: false,
    loading: true,
  });

  const checkStatus = useCallback(async () => {
    try {
      // Check both flags in parallel
      const [cbResult, permResult] = await Promise.all([
        supabase.functions.invoke('video-call-circuit-breaker', {
          body: { action: 'check_status' },
        }),
        supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'video_calls_permanently_disabled')
          .maybeSingle(),
      ]);

      let permanentlyDisabled = false;
      if (permResult.data) {
        try {
          const val = typeof permResult.data.setting_value === 'string'
            ? JSON.parse(permResult.data.setting_value)
            : permResult.data.setting_value;
          permanentlyDisabled = val?.disabled ?? false;
        } catch { /* ignore */ }
      }

      setState({
        active: cbResult.data?.active ?? false,
        permanentlyDisabled,
        reason: cbResult.data?.reason,
        resumesAt: cbResult.data?.resumes_at,
        loading: false,
      });
    } catch (err) {
      console.error('[CircuitBreaker] Check failed:', err);
      setState({ active: false, permanentlyDisabled: false, loading: false });
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 120_000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    isVideoCallsDisabled: state.active || state.permanentlyDisabled,
    isPermanentlyDisabled: state.permanentlyDisabled,
    isCircuitBreakerActive: state.active,
    reason: state.permanentlyDisabled ? 'Permanently disabled by admin' : state.reason,
    resumesAt: state.resumesAt,
    loading: state.loading,
    refresh: checkStatus,
  };
};

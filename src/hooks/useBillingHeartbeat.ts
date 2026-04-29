/**
 * useBillingHeartbeat — drop-in per-minute billing for chat/audio/video.
 * For private group calls use useGroupCallHeartbeat instead.
 */
import { useEffect, useRef } from 'react';
import { billMinute, type SessionType } from '@/services/billing.service';

interface HeartbeatOptions {
  sessionId: string;
  sessionType: SessionType;
  manId: string;
  womanId: string;
  intervalMs?: number;
  enabled?: boolean;
  onInsufficientBalance?: () => void;
  onError?: (msg: string) => void;
}

export function useBillingHeartbeat({
  sessionId, sessionType, manId, womanId,
  intervalMs = 60_000, enabled = true,
  onInsufficientBalance, onError,
}: HeartbeatOptions) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId || !manId || !womanId) return;
    const tick = async () => {
      const r = await billMinute(sessionId, sessionType, 1.0, manId, womanId);
      if (!r.success) {
        if (r.error?.includes('Insufficient balance')) onInsufficientBalance?.();
        else if (!r.duplicate_skipped) onError?.(r.error ?? 'Billing error');
      }
    };
    timerRef.current = setInterval(tick, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionType, manId, womanId, intervalMs, enabled]);
}

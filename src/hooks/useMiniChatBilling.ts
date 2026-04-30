/**
 * useMiniChatBilling — chat per-minute billing via unified billing.service.
 * Mounts a heartbeat that fires bill_session_minute('chat', 1.0, manId, womanId)
 * once per minute while the chat is active.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { billChatMinute } from '@/services/billing.service';

interface UseMiniChatBillingProps {
  chatId: string | null;
  isActive: boolean;
  onInsufficientBalance?: () => void;
  sessionId?: string | null;
  manId?: string;       // profile.id of the man
  womanId?: string;     // profile.id of the woman
  sessionType?: 'chat' | 'audio_call' | 'video_call'; // unused — chat only
}

export function useMiniChatBilling({
  chatId,
  isActive,
  onInsufficientBalance,
  sessionId,
  manId,
  womanId,
}: UseMiniChatBillingProps) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const [minutesBilled, setMinutesBilled] = useState(0);
  const [totalCharged, setTotalCharged] = useState(0);
  const [isBilling, setIsBilling] = useState(false);

  const reset = useCallback(() => {
    setMinutesBilled(0);
    setTotalCharged(0);
  }, []);

  useEffect(() => {
    const sId = sessionId || chatId;
    if (!isActive || !sId || !manId || !womanId) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setIsBilling(false);
      }
      return;
    }

    startTimeRef.current = Date.now();
    setIsBilling(true);

    // Heartbeat every 5s — bill_session_minute is idempotent on minute_index,
    // so 12 ticks/minute collapse to a single statement row per minute.
    const tick = async () => {
      const minuteIdx = Math.floor((Date.now() - startTimeRef.current) / 60_000);
      const r = await billChatMinute(sId, 1.0, manId, womanId, minuteIdx);
      if (r.success && !r.duplicate_skipped) {
        setMinutesBilled(m => m + 1);
        setTotalCharged(t => t + (r.charged ?? 0));
      } else if (r.error?.includes('Insufficient balance')) {
        onInsufficientBalance?.();
      }
    };

    timerRef.current = setInterval(tick, 5_000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsBilling(false);
    };
  }, [isActive, chatId, sessionId, manId, womanId, onInsufficientBalance]);

  return { minutesBilled, totalCharged, isBilling, reset };
}

export default useMiniChatBilling;

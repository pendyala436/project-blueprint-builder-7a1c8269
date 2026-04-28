/**
 * useMiniChatBilling — Per-minute billing ticker for active chat sessions.
 *
 * Behaviour:
 *  - Starts a 60s interval the moment a session becomes active.
 *  - Each tick calls `ledger_bill_session` (full minute).
 *  - On stop (session ends / unmount) it bills the remaining partial seconds
 *    so short chats (e.g. 25s, 90s) are still charged accurately.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { billSession, PRICING } from '@/services/ledger-wallet.service';

interface UseMiniChatBillingProps {
  sessionId: string | null;
  manId: string;
  womanId: string;
  isActive: boolean;
  sessionType?: 'chat' | 'audio_call' | 'video_call';
  onInsufficientBalance?: () => void;
}

export function useMiniChatBilling({
  sessionId,
  manId,
  womanId,
  isActive,
  sessionType = 'chat',
  onInsufficientBalance,
}: UseMiniChatBillingProps) {
  const [minutesBilled, setMinutesBilled] = useState(0);
  const [totalCharged, setTotalCharged] = useState(0);
  const [isBilling, setIsBilling] = useState(false);
  const minuteRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickAtRef = useRef<number>(0);
  const sessionRef = useRef<{ id: string; man: string; woman: string } | null>(null);

  const billTick = useCallback(async (durationSeconds: number) => {
    const ctx = sessionRef.current;
    if (!ctx) return;
    if (durationSeconds <= 0) return;

    minuteRef.current += 1;
    const result = await billSession(
      ctx.id,
      sessionType,
      ctx.man,
      ctx.woman,
      minuteRef.current,
      durationSeconds,
    );

    if (result.success) {
      if (!result.duplicate_skipped) {
        setMinutesBilled(prev => prev + Math.round((durationSeconds / 60) * 100) / 100);
        setTotalCharged(prev => prev + (result.charged ?? PRICING[sessionType].man * (durationSeconds / 60)));
      }
    } else if (result.error?.includes('Insufficient balance')) {
      onInsufficientBalance?.();
    }
  }, [sessionType, onInsufficientBalance]);

  useEffect(() => {
    if (isActive && sessionId && manId && womanId) {
      sessionRef.current = { id: sessionId, man: manId, woman: womanId };
      lastTickAtRef.current = Date.now();
      setIsBilling(true);

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.round((now - lastTickAtRef.current) / 1000);
        lastTickAtRef.current = now;
        // Bill full ticks (≈60s); use actual elapsed for accuracy across throttled tabs
        void billTick(elapsed);
      }, 60_000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Settle remaining partial seconds since the last tick
        const remaining = Math.round((Date.now() - lastTickAtRef.current) / 1000);
        if (remaining > 0 && sessionRef.current) {
          void billTick(remaining);
        }
        sessionRef.current = null;
        setIsBilling(false);
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsBilling(false);
    }
  }, [isActive, sessionId, manId, womanId, billTick]);

  const reset = useCallback(() => {
    minuteRef.current = 0;
    setMinutesBilled(0);
    setTotalCharged(0);
  }, []);

  return { minutesBilled, totalCharged, isBilling, reset };
}

export default useMiniChatBilling;

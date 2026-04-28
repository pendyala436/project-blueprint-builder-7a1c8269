/**
 * useMiniChatBilling — Drives canonical chat billing via the `chat-manager`
 * edge function (Single Source of Truth: `process_chat_billing` RPC writing to
 * `wallet_transactions`).
 *
 * Behaviour:
 *  - Pings `action: "heartbeat"` every 60s while the session is active.
 *  - On unmount / session end, fires a final heartbeat to settle the
 *    elapsed seconds since the last tick. (The `end_chat` action also
 *    runs final billing server-side, so this is belt-and-braces.)
 *  - Detects insufficient-balance responses and notifies the caller.
 *
 * Does NOT call `ledger_bill_session` (non-canonical, removed).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseMiniChatBillingProps {
  chatId: string | null;
  isActive: boolean;
  onInsufficientBalance?: () => void;
  /** kept for backwards-compat with existing call sites */
  sessionId?: string | null;
  manId?: string;
  womanId?: string;
  sessionType?: 'chat' | 'audio_call' | 'video_call';
}

interface HeartbeatResponse {
  success: boolean;
  message?: string;
  men_charged?: number;
  women_earned?: number;
  minutes_elapsed?: number;
  remaining_balance?: number;
}

export function useMiniChatBilling({
  chatId,
  isActive,
  onInsufficientBalance,
}: UseMiniChatBillingProps) {
  const [minutesBilled, setMinutesBilled] = useState(0);
  const [totalCharged, setTotalCharged] = useState(0);
  const [isBilling, setIsBilling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatIdRef = useRef<string | null>(null);

  const sendHeartbeat = useCallback(async () => {
    const cid = chatIdRef.current;
    if (!cid) return;
    try {
      const { data, error } = await supabase.functions.invoke('chat-manager', {
        body: { action: 'heartbeat', chat_id: cid },
      });
      if (error) {
        console.warn('[chat-billing] heartbeat error:', error.message);
        return;
      }
      const r = (data ?? {}) as HeartbeatResponse;
      if (r.success === false && /insufficient/i.test(r.message ?? '')) {
        onInsufficientBalance?.();
        return;
      }
      if (typeof r.minutes_elapsed === 'number' && r.minutes_elapsed > 0) {
        setMinutesBilled(prev => prev + r.minutes_elapsed!);
      }
      if (typeof r.men_charged === 'number' && r.men_charged > 0) {
        setTotalCharged(prev => prev + r.men_charged!);
      }
    } catch (e) {
      console.warn('[chat-billing] heartbeat failed:', e);
    }
  }, [onInsufficientBalance]);

  useEffect(() => {
    if (isActive && chatId) {
      chatIdRef.current = chatId;
      setIsBilling(true);
      // Tick every 60s; canonical RPC handles fractional minutes server-side.
      intervalRef.current = setInterval(() => { void sendHeartbeat(); }, 60_000);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Final settle on stop (server `end_chat` also settles — idempotent).
        void sendHeartbeat();
        chatIdRef.current = null;
        setIsBilling(false);
      };
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsBilling(false);
  }, [isActive, chatId, sendHeartbeat]);

  const reset = useCallback(() => {
    setMinutesBilled(0);
    setTotalCharged(0);
  }, []);

  return { minutesBilled, totalCharged, isBilling, reset };
}

export default useMiniChatBilling;

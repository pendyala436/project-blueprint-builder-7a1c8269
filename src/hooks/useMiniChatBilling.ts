/**
 * useMiniChatBilling — DISABLED (billing logic removed).
 * Kept as a no-op stub so existing call sites continue to compile.
 * Returns zero counters; performs no heartbeats and no RPC calls.
 */
import { useCallback } from 'react';

interface UseMiniChatBillingProps {
  chatId: string | null;
  isActive: boolean;
  onInsufficientBalance?: () => void;
  sessionId?: string | null;
  manId?: string;
  womanId?: string;
  sessionType?: 'chat' | 'audio_call' | 'video_call';
}

export function useMiniChatBilling(_props: UseMiniChatBillingProps) {
  const reset = useCallback(() => {}, []);
  return { minutesBilled: 0, totalCharged: 0, isBilling: false, reset };
}

export default useMiniChatBilling;

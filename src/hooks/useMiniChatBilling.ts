/**
 * useMiniChatBilling — Per-minute billing ticker for active chat sessions.
 * Calls ledger_bill_session RPC every 60 seconds while chat is active.
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

  const billOneMinute = useCallback(async () => {
    if (!sessionId || !manId || !womanId) return;
    
    minuteRef.current += 1;
    const result = await billSession(sessionId, sessionType, manId, womanId, minuteRef.current);
    
    if (result.success) {
      if (!result.duplicate_skipped) {
        setMinutesBilled(prev => prev + 1);
        setTotalCharged(prev => prev + (result.charged || PRICING[sessionType].man));
      }
    } else if (result.error?.includes('Insufficient balance')) {
      onInsufficientBalance?.();
    }
  }, [sessionId, manId, womanId, sessionType, onInsufficientBalance]);

  useEffect(() => {
    if (isActive && sessionId) {
      setIsBilling(true);
      // Bill first minute immediately after 60s
      intervalRef.current = setInterval(billOneMinute, 60_000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsBilling(false);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsBilling(false);
    }
  }, [isActive, sessionId, billOneMinute]);

  const reset = useCallback(() => {
    minuteRef.current = 0;
    setMinutesBilled(0);
    setTotalCharged(0);
  }, []);

  return { minutesBilled, totalCharged, isBilling, reset };
}

export default useMiniChatBilling;

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const IDLE_CLOSE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes idle → auto-close session
const IDLE_WARNING_MS = 1 * 60 * 1000; // 1 minute → show warning

interface UseMiniChatBillingOptions {
  chatId: string;
  sessionId: string;
  currentUserId: string;
  userGender: "male" | "female";
  ratePerMinute: number;
  earningRatePerMinute: number;
  isEarningEligible: boolean;
  messages: { senderId: string }[];
  onClose: () => void;
}

export const useMiniChatBilling = ({
  chatId,
  sessionId,
  currentUserId,
  userGender,
  ratePerMinute,
  earningRatePerMinute,
  isEarningEligible,
  messages,
  onClose,
}: UseMiniChatBillingOptions) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [billingStarted, setBillingStarted] = useState(false);
  const [isBillingPaused, setIsBillingPaused] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [walletBalance, setWalletBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [inactiveWarning, setInactiveWarning] = useState<string | null>(null);
  const [lastUserMessageTime, setLastUserMessageTime] = useState<number>(Date.now());
  const [lastPartnerMessageTime, setLastPartnerMessageTime] = useState<number>(Date.now());

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const billingPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startBilling = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    heartbeatRef.current = setInterval(async () => {
      try {
        await supabase.functions.invoke("chat-manager", {
          body: { action: "heartbeat", chat_id: chatId, session_id: sessionId },
        });

        if (userGender === "male") {
          const { data: wallet } = await supabase
            .from("users_wallet")
            .select("balance")
            .eq("user_id", currentUserId)
            .maybeSingle();

          if (wallet) {
            setWalletBalance(wallet.balance);
          }
        }
      } catch (error) {
        console.error("Heartbeat error:", error);
      }
    }, 62000); // 62s to compensate for JS timer drift
  }, [chatId, sessionId, currentUserId, userGender, ratePerMinute]);

  const stopBillingTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
  }, []);

  // Effect 1: Billing start check — fires when both parties have exchanged messages
  useEffect(() => {
    const hasSentMessage = messages.some((m) => m.senderId === currentUserId);
    const hasReceivedMessage = messages.some((m) => m.senderId !== currentUserId);

    if (hasSentMessage && hasReceivedMessage && !billingStarted) {
      setBillingStarted(true);
      setLastActivityTime(Date.now());
      startBilling();
    }
  }, [messages, currentUserId, billingStarted, startBilling]);

  // Effect 2: Track last message times per party AND reset activity timer
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const now = Date.now();
      if (lastMsg.senderId === currentUserId) {
        setLastUserMessageTime(now);
      } else {
        setLastPartnerMessageTime(now);
      }
      // Reset activity timer on ANY new message to prevent premature timeout
      if (billingStarted) {
        setLastActivityTime(now);
      }
    }
  }, [messages, currentUserId, billingStarted]);

  // Effect 3: Inactivity warning and auto-close after 2 minutes idle
  useEffect(() => {
    if (!billingStarted) return;

    const warningInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      if (timeSinceActivity > IDLE_WARNING_MS && timeSinceActivity < IDLE_CLOSE_TIMEOUT_MS) {
        const remainingSeconds = Math.ceil((IDLE_CLOSE_TIMEOUT_MS - timeSinceActivity) / 1000);
        setInactiveWarning(`Chat closes in ${remainingSeconds}s - send a message!`);
      } else {
        setInactiveWarning(null);
      }
    }, 1000);

    // Auto-close session after 2 minutes idle
    if (billingPauseTimeoutRef.current) clearTimeout(billingPauseTimeoutRef.current);
    billingPauseTimeoutRef.current = setTimeout(async () => {
      setInactiveWarning(null);
      stopBillingTimers();
      try {
        await supabase
          .from("active_chat_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString(), end_reason: "inactivity_timeout" })
          .eq("id", sessionId);
      } catch (error) {
        console.error("Error during inactivity close:", error);
      }
      onClose();
    }, IDLE_CLOSE_TIMEOUT_MS);

    return () => {
      clearInterval(warningInterval);
      if (billingPauseTimeoutRef.current) clearTimeout(billingPauseTimeoutRef.current);
    };
  }, [lastActivityTime, billingStarted, sessionId, onClose, stopBillingTimers]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      stopBillingTimers();
      if (billingPauseTimeoutRef.current) clearTimeout(billingPauseTimeoutRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
    };
  }, [stopBillingTimers]);

  const estimatedCost = billingStarted ? (elapsedSeconds / 60) * ratePerMinute : 0;
  const estimatedEarning = billingStarted && isEarningEligible ? (elapsedSeconds / 60) * earningRatePerMinute : 0;

  return {
    elapsedSeconds,
    billingStarted,
    isBillingPaused,
    walletBalance,
    setWalletBalance,
    todayEarnings,
    setTodayEarnings,
    inactiveWarning,
    lastActivityTime,
    setLastActivityTime,
    estimatedCost,
    estimatedEarning,
    stopBillingTimers,
  };
};

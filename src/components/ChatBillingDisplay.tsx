import { useState, useEffect, useRef } from "react";
import { IndianRupee, Clock, AlertTriangle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatBillingDisplayProps {
  chatPartnerId: string;
  currentUserId: string;
  userGender: "male" | "female";
  onSessionEnd?: (reason: string) => void;
}

interface ChatSession {
  chatId: string;
  ratePerMinute: number;
  totalMinutes: number;
  totalSpent: number;
  remainingBalance: number;
  isActive: boolean;
}

const ChatBillingDisplay = ({ 
  chatPartnerId, 
  currentUserId, 
  userGender,
  onSessionEnd 
}: ChatBillingDisplayProps) => {
  const { toast } = useToast();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ratePerMinute, setRatePerMinute] = useState(4.00);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLowBalance, setIsLowBalance] = useState(false);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPricingAndWallet();
    
    return () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, []);

  // Only men see the billing (they are charged)
  if (userGender !== "male") {
    return null;
  }

  const loadPricingAndWallet = async () => {
    try {
      // Get current pricing
      const { data: pricing } = await supabase
        .from("chat_pricing")
        .select("rate_per_minute")
        .eq("is_active", true)
        .maybeSingle();
      
      if (pricing) {
        setRatePerMinute(pricing.rate_per_minute);
      }

      // Get wallet balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", currentUserId)
        .maybeSingle();
      
      if (wallet) {
        setWalletBalance(wallet.balance);
        setIsLowBalance(wallet.balance < ratePerMinute * 5); // Less than 5 minutes worth
      }

      // Check for existing active session
      const { data: existingSession } = await supabase
        .from("active_chat_sessions")
        .select("*")
        .eq("man_user_id", currentUserId)
        .eq("woman_user_id", chatPartnerId)
        .eq("status", "active")
        .maybeSingle();

      if (existingSession) {
        setSession({
          chatId: existingSession.chat_id,
          ratePerMinute: existingSession.rate_per_minute,
          totalMinutes: existingSession.total_minutes,
          totalSpent: existingSession.total_earned,
          remainingBalance: wallet?.balance || 0,
          isActive: true
        });
        startHeartbeat(existingSession.chat_id);
        startTimer();
      }
    } catch (error) {
      console.error("Error loading billing info:", error);
    }
  };

  const startTimer = () => {
    timerInterval.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  const startHeartbeat = (chatId: string) => {
    // Send heartbeat every 60 seconds to update billing
    heartbeatInterval.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("chat-manager", {
          body: { action: "heartbeat", chat_id: chatId }
        });

        if (error) throw error;

        if (data.end_chat) {
          // Chat ended due to insufficient balance
          toast({
            title: "Chat Ended",
            description: "Insufficient balance. Please recharge to continue.",
            variant: "destructive"
          });
          onSessionEnd?.("insufficient_balance");
          if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
          if (timerInterval.current) clearInterval(timerInterval.current);
          return;
        }

        // Update session info
        setSession(prev => prev ? {
          ...prev,
          totalMinutes: prev.totalMinutes + (data.minutes_elapsed || 0),
          totalSpent: prev.totalSpent + (data.men_charged || 0),
          remainingBalance: data.remaining_balance || 0
        } : null);

        setWalletBalance(data.remaining_balance || 0);
        setIsLowBalance(data.remaining_balance < ratePerMinute * 5);

      } catch (error) {
        console.error("Heartbeat error:", error);
      }
    }, 60000); // Every 60 seconds
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const estimatedCost = (elapsedSeconds / 60) * ratePerMinute;

  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-2 text-sm border-b",
      isLowBalance ? "bg-destructive/10 border-destructive/30" : "bg-primary/5 border-primary/20"
    )}>
      {/* Rate Display */}
      <div className="flex items-center gap-1.5">
        <IndianRupee className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium">{ratePerMinute}/min</span>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono">{formatTime(elapsedSeconds)}</span>
      </div>

      {/* Estimated Cost */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Cost:</span>
        <span className="font-medium text-primary">₹{estimatedCost.toFixed(2)}</span>
      </div>

      {/* Balance */}
      <div className={cn(
        "flex items-center gap-1.5 ml-auto",
        isLowBalance && "text-destructive"
      )}>
        {isLowBalance && <AlertTriangle className="h-3.5 w-3.5" />}
        <Wallet className="h-3.5 w-3.5" />
        <span className="font-medium">₹{walletBalance.toFixed(0)}</span>
      </div>
    </div>
  );
};

export default ChatBillingDisplay;

import { useState, useEffect, useRef, useCallback } from "react";
import { IndianRupee, Clock, AlertTriangle, Wallet, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface ChatBillingDisplayProps {
  chatPartnerId: string;
  currentUserId: string;
  userGender: "male" | "female";
  onSessionEnd?: (reason: string) => void;
}

interface ChatSession {
  chatId: string;
  sessionId: string;
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
  const navigate = useNavigate();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ratePerMinute, setRatePerMinute] = useState(5.00);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLowBalance, setIsLowBalance] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const inactivityInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionStarted = useRef(false);

  const INACTIVITY_TIMEOUT = 180000; // 3 minutes in ms

  // Only men see the billing (they are charged)
  if (userGender !== "male") {
    return null;
  }

  const loadPricingAndWallet = useCallback(async () => {
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
        const rate = pricing?.rate_per_minute || 5;
        setIsLowBalance(wallet.balance < rate * 5); // Less than 5 minutes worth
        
        // Check if balance is zero or negative
        if (wallet.balance <= 0) {
          setShowRechargeDialog(true);
        }
      } else {
        // No wallet found, show recharge
        setShowRechargeDialog(true);
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
          sessionId: existingSession.id,
          ratePerMinute: existingSession.rate_per_minute,
          totalMinutes: existingSession.total_minutes,
          totalSpent: existingSession.total_earned,
          remainingBalance: wallet?.balance || 0,
          isActive: true
        });
        setIsSessionActive(true);
        sessionStarted.current = true;
        startHeartbeat(existingSession.chat_id);
        startTimer();
        startInactivityCheck(existingSession.chat_id);
      } else if (wallet && wallet.balance > 0 && !sessionStarted.current) {
        // Start a new session if balance is available
        await startChatSession();
      }
    } catch (error) {
      console.error("Error loading billing info:", error);
    }
  }, [currentUserId, chatPartnerId]);

  const startChatSession = async () => {
    if (sessionStarted.current) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: { 
          action: "start_chat", 
          man_user_id: currentUserId,
          woman_user_id: chatPartnerId
        }
      });

      if (error) throw error;

      if (data.success) {
        sessionStarted.current = true;
        setIsSessionActive(true);
        setSession({
          chatId: data.chat_id,
          sessionId: data.session?.id,
          ratePerMinute: data.rate_per_minute,
          totalMinutes: 0,
          totalSpent: 0,
          remainingBalance: walletBalance,
          isActive: true
        });
        startHeartbeat(data.chat_id);
        startTimer();
        startInactivityCheck(data.chat_id);
        
        toast({
          title: "Chat Started",
          description: `You're being charged ₹${data.rate_per_minute}/min`,
        });
      } else {
        if (data.message === "Insufficient balance") {
          setShowRechargeDialog(true);
        } else {
          toast({
            title: "Could not start chat",
            description: data.message,
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error("Error starting chat session:", error);
      toast({
        title: "Error",
        description: "Failed to start billing session",
        variant: "destructive"
      });
    }
  };

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivityTime(Date.now());
  }, []);

  // Add activity listeners
  useEffect(() => {
    const handleActivity = () => updateActivity();
    
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [updateActivity]);

  // Check inactivity and end session if no activity for 3 minutes
  const startInactivityCheck = useCallback((chatId: string) => {
    if (inactivityInterval.current) clearInterval(inactivityInterval.current);
    
    inactivityInterval.current = setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      
      if (timeSinceActivity >= INACTIVITY_TIMEOUT && isSessionActive) {
        // Session ended due to inactivity
        
        try {
          await supabase.functions.invoke("chat-manager", {
            body: { action: "end_chat", chat_id: chatId, end_reason: "inactivity_timeout" }
          });
        } catch (error) {
          console.error("Error ending inactive chat:", error);
        }
        
        if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        if (timerInterval.current) clearInterval(timerInterval.current);
        if (inactivityInterval.current) clearInterval(inactivityInterval.current);
        
        setIsSessionActive(false);
        sessionStarted.current = false;
        onSessionEnd?.("inactivity_timeout");
        
        toast({
          title: "Chat Disconnected",
          description: "Session ended due to 3 minutes of inactivity.",
          variant: "destructive"
        });
      }
    }, 10000); // Check every 10 seconds
  }, [lastActivityTime, isSessionActive, onSessionEnd, toast]);

  useEffect(() => {
    loadPricingAndWallet();
    
    return () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (inactivityInterval.current) clearInterval(inactivityInterval.current);
    };
  }, [loadPricingAndWallet]);

  const startTimer = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerInterval.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  const endChatDueToBalance = async (chatId: string) => {
    try {
      await supabase.functions.invoke("chat-manager", {
        body: { action: "end_chat", chat_id: chatId, end_reason: "insufficient_balance" }
      });
    } catch (error) {
      console.error("Error ending chat:", error);
    }
    
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    if (timerInterval.current) clearInterval(timerInterval.current);
    setIsSessionActive(false);
    sessionStarted.current = false;
  };

  const startHeartbeat = (chatId: string) => {
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    
    // Send heartbeat every 60 seconds to update billing
    heartbeatInterval.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("chat-manager", {
          body: { action: "heartbeat", chat_id: chatId }
        });

        if (error) throw error;

        if (data.end_chat || data.remaining_balance <= 0) {
          // Chat ended due to insufficient balance - AUTO DISCONNECT
          await endChatDueToBalance(chatId);
          setShowRechargeDialog(true);
          onSessionEnd?.("insufficient_balance");
          
          toast({
            title: "Chat Disconnected",
            description: "Your wallet balance is zero. Recharge to continue chatting.",
            variant: "destructive"
          });
          return;
        }

        // Update session info
        setSession(prev => prev ? {
          ...prev,
          totalMinutes: prev.totalMinutes + (data.minutes_elapsed || 0),
          totalSpent: prev.totalSpent + (data.men_charged || 0),
          remainingBalance: data.remaining_balance || 0
        } : null);

        const newBalance = data.remaining_balance || 0;
        setWalletBalance(newBalance);
        setIsLowBalance(newBalance < ratePerMinute * 5);
        
        // Check if balance is critically low
        if (newBalance <= 0) {
          setShowRechargeDialog(true);
        }

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

  const handleRecharge = () => {
    setShowRechargeDialog(false);
    navigate("/wallet");
  };

  const estimatedCost = (elapsedSeconds / 60) * ratePerMinute;

  return (
    <>
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

      {/* Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-destructive" />
              Insufficient Balance
            </DialogTitle>
            <DialogDescription>
              Your wallet balance is too low to continue chatting. Recharge now to keep the conversation going!
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">₹{walletBalance.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">Current Balance</p>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>Chat rate: ₹{ratePerMinute}/minute</p>
              <p>Time chatted: {formatTime(elapsedSeconds)}</p>
              <p>Total spent: ₹{estimatedCost.toFixed(2)}</p>
            </div>
          </div>
          
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              variant="gradient" 
              className="w-full gap-2" 
              onClick={handleRecharge}
            >
              <CreditCard className="h-4 w-4" />
              Recharge Wallet
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                setShowRechargeDialog(false);
                onSessionEnd?.("user_declined_recharge");
              }}
            >
              End Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatBillingDisplay;

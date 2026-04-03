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
  const [ratePerMinute, setRatePerMinute] = useState(4.00);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLowBalance, setIsLowBalance] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [billingStarted, setBillingStarted] = useState(false);
  const [waitingFor, setWaitingFor] = useState<string>("both parties to send first message");
  const [manHasMessaged, setManHasMessaged] = useState(false);
  const [womanHasMessaged, setWomanHasMessaged] = useState(false);
  const [lastManMessageTime, setLastManMessageTime] = useState<number | null>(null);
  const [lastWomanMessageTime, setLastWomanMessageTime] = useState<number | null>(null);
  const [inactiveWarning, setInactiveWarning] = useState<string | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const messageCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionStarted = useRef(false);
  const loadInProgress = useRef(false);

  const MESSAGE_INACTIVITY_TIMEOUT = 180000; // 3 minutes in ms
  const WARNING_THRESHOLD = 120000; // 2 minutes - show warning

  // Gender check moved after all hooks - render null at the bottom
  const isWrongGender = userGender !== "male";

  const loadPricingAndWallet = useCallback(async () => {
    if (loadInProgress.current || isWrongGender) return;
    loadInProgress.current = true;
    // Clear any existing intervals before (re)starting to prevent duplicates
    if (heartbeatInterval.current) { clearInterval(heartbeatInterval.current); heartbeatInterval.current = null; }
    if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
    if (messageCheckInterval.current) { clearInterval(messageCheckInterval.current); messageCheckInterval.current = null; }
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

      // Get wallet balance from the same table the backend writes to
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", currentUserId)
        .maybeSingle();
      
      if (walletData) {
        setWalletBalance(walletData.balance);
        const rate = pricing?.rate_per_minute || 4;
        setIsLowBalance(walletData.balance < rate * 5);
        
        if (walletData.balance <= 0) {
          // Balance is zero — show recharge dialog and skip session attachment
          setShowRechargeDialog(true);
          return;
        }
      } else {
        // No wallet found — show recharge dialog and skip session attachment
        setShowRechargeDialog(true);
        return;
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
          remainingBalance: walletData?.balance || 0,
          isActive: true
        });
        setIsSessionActive(true);
        sessionStarted.current = true;
        startHeartbeat(existingSession.chat_id);
        startTimer();
        startMessageCheck(existingSession.chat_id);
      } else {
        // No active session found — do NOT create one here.
        // Session creation is handled by the chat initiator (Dashboard/ProfileDetail).
        // This component only attaches to existing sessions for billing display.
        console.log("ChatBillingDisplay: No active session found, waiting for session to be created by initiator.");
      }
    } catch (error) {
      console.error("Error loading billing info:", error);
      toast({ title: "Billing info unavailable", description: "Unable to load billing details. Please refresh.", variant: "destructive" });
    } finally {
      loadInProgress.current = false;
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
        startMessageCheck(data.chat_id);
        
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

  // Check message-based inactivity - monitors if either party hasn't messaged for 3 mins
  const startMessageCheck = useCallback((chatId: string) => {
    if (messageCheckInterval.current) clearInterval(messageCheckInterval.current);
    
    messageCheckInterval.current = setInterval(async () => {
      try {
        // Get last message from each party (2 queries: 1 per sender, limit 1 each)
        const [{ data: manMsgs }, { data: womanMsgs }] = await Promise.all([
          supabase
            .from("chat_messages")
            .select("created_at")
            .eq("chat_id", chatId)
            .eq("sender_id", currentUserId)
            .order("created_at", { ascending: false })
            .limit(1),
          supabase
            .from("chat_messages")
            .select("created_at")
            .eq("chat_id", chatId)
            .eq("sender_id", chatPartnerId)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

        const now = Date.now();
        const manLastMsg = manMsgs?.[0] ? new Date(manMsgs[0].created_at).getTime() : null;
        const womanLastMsg = womanMsgs?.[0] ? new Date(womanMsgs[0].created_at).getTime() : null;

        setLastManMessageTime(manLastMsg);
        setLastWomanMessageTime(womanLastMsg);
        setManHasMessaged(!!manLastMsg);
        setWomanHasMessaged(!!womanLastMsg);

        // Check for inactivity warnings and auto-disconnect
        if (manLastMsg && womanLastMsg) {
          const manInactive = now - manLastMsg;
          const womanInactive = now - womanLastMsg;

          // Show warning at 2 minutes
          if (womanInactive >= WARNING_THRESHOLD && womanInactive < MESSAGE_INACTIVITY_TIMEOUT) {
            const remainingSecs = Math.ceil((MESSAGE_INACTIVITY_TIMEOUT - womanInactive) / 1000);
            setInactiveWarning(`Partner hasn't replied. Chat will end in ${remainingSecs}s`);
          } else if (manInactive >= WARNING_THRESHOLD && manInactive < MESSAGE_INACTIVITY_TIMEOUT) {
            const remainingSecs = Math.ceil((MESSAGE_INACTIVITY_TIMEOUT - manInactive) / 1000);
            setInactiveWarning(`You haven't replied. Chat will end in ${remainingSecs}s`);
          } else {
            setInactiveWarning(null);
          }
        }
      } catch (error) {
        console.error("Error checking message activity:", error);
      }
    }, 30000); // Check every 30 seconds (reduced from 5s to minimize DB load)
  }, [currentUserId, chatPartnerId]);

  useEffect(() => {
    loadPricingAndWallet();
    
    return () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (messageCheckInterval.current) clearInterval(messageCheckInterval.current);
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
      toast.error("Chat not ended", { description: "Unable to close the chat session. Please refresh the page." });
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

        // Check if billing has started - requires BOTH parties to have messaged
        if (data.billing_started === false) {
          setBillingStarted(false);
          setManHasMessaged(data.man_has_messaged || false);
          setWomanHasMessaged(data.woman_has_messaged || false);
          setWaitingFor(data.waiting_for || "both parties to message");
          return;
        }

        // Check if chat ended due to inactivity
        if (data.end_chat) {
          if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
          if (timerInterval.current) clearInterval(timerInterval.current);
          if (messageCheckInterval.current) clearInterval(messageCheckInterval.current);
          setIsSessionActive(false);
          sessionStarted.current = false;
          
          const reason = data.end_reason || "inactivity";
          onSessionEnd?.(reason);
          
          toast({
            title: "Chat Disconnected",
            description: data.message || "Chat ended due to inactivity (3 min no reply).",
            variant: "destructive"
          });
          return;
        }

        setBillingStarted(true);

        if (data.remaining_balance !== undefined && data.remaining_balance <= 0 && !data.waiting_for_full_minute) {
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
    }, 62000); // Every 62 seconds — 2s buffer for JS timer drift to ensure server sees >=60s elapsed
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

  // Only men see the billing - guard after all hooks
  if (isWrongGender) return null;

  return (
    <>
      <div className={cn(
        "flex items-center gap-4 px-4 py-2 text-sm border-b",
        inactiveWarning ? "bg-destructive/10 border-destructive/30" :
        !billingStarted ? "bg-muted/50 border-muted" : 
        isLowBalance ? "bg-destructive/10 border-destructive/30" : "bg-primary/5 border-primary/20"
      )}>
        {inactiveWarning ? (
          <>
            <div className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{inactiveWarning}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <Wallet className="h-3.5 w-3.5" />
              <span className="font-medium">₹{walletBalance.toFixed(0)}</span>
            </div>
          </>
        ) : !billingStarted ? (
          <>
            {/* Not billing yet - waiting for two-way conversation */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">Waiting for {waitingFor}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              <span className="font-medium">₹{walletBalance.toFixed(0)}</span>
            </div>
          </>
        ) : (
          <>

            {/* Timer */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono">{formatTime(elapsedSeconds)}</span>
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
          </>
        )}
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
              <p>Time chatted: {formatTime(elapsedSeconds)}</p>
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

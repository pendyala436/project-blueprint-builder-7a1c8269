import { useState } from "react";
import { registerOutgoingCall } from "@/hooks/useIncomingCalls";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Wallet, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DraggableVideoCallWindow from "./DraggableVideoCallWindow";
import { useChatPricing } from "@/hooks/useChatPricing";
import { useVideoCallCircuitBreaker } from "@/hooks/useVideoCallCircuitBreaker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DirectVideoCallButtonProps {
  currentUserId: string;
  targetUserId: string;
  targetName: string;
  targetPhoto: string | null;
  walletBalance: number;
  onBalanceChange?: (newBalance: number) => void;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "aurora" | "auroraOutline" | "ghost" | "outline";
  iconOnly?: boolean;
}

const DirectVideoCallButton = ({
  currentUserId,
  targetUserId,
  targetName,
  targetPhoto,
  walletBalance,
  onBalanceChange,
  size = "sm",
  variant = "auroraOutline",
  iconOnly = true,
}: DirectVideoCallButtonProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pricing } = useChatPricing();
  const { isVideoCallsDisabled, reason: circuitBreakerReason } = useVideoCallCircuitBreaker();
  const [isSearching, setIsSearching] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeMessage, setRechargeMessage] = useState("");
  const [activeCall, setActiveCall] = useState<{
    callId: string;
  } | null>(null);

  const startDirectVideoCall = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Circuit breaker check
    if (isVideoCallsDisabled) {
      toast({
        title: "Video Calls Temporarily Disabled",
        description: circuitBreakerReason
          ? `Server under high load (${circuitBreakerReason}). Video calls will resume automatically in ~2 hours.`
          : "Video calls are temporarily disabled due to high server load. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    // Check super user
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || '';
    const isSuperUser = /^(female|male|admin)([1-9]|1[0-5])@meow-meow\.com$/i.test(userEmail);

    if (!isSuperUser) {
      const minBalance = pricing.videoRatePerMinute * 2;
      if (walletBalance <= 0) {
        setRechargeMessage("Your wallet balance is ₹0. Recharge is mandatory to start video calls.");
        setShowRechargeDialog(true);
        return;
      } else if (walletBalance < minBalance) {
        setRechargeMessage(`You need at least ₹${minBalance} to start a video call (₹${pricing.videoRatePerMinute}/min). Your current balance is ₹${walletBalance}.`);
        setShowRechargeDialog(true);
        return;
      }
    }

    setIsSearching(true);
    try {
      // Check if target user is online and idle
      const { data: targetStatus } = await supabase
        .from('user_status')
        .select('is_online')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (!targetStatus?.is_online) {
        toast({
          title: "User Offline",
          description: `${targetName} is not online right now.`,
          variant: "destructive",
        });
        return;
      }

      // Check if target is in active call
      const { data: activeCalls } = await supabase
        .from('video_call_sessions')
        .select('call_id')
        .or(`man_user_id.eq.${targetUserId},woman_user_id.eq.${targetUserId}`)
        .in('status', ['active', 'connecting', 'ringing'])
        .limit(1);

      if (activeCalls && activeCalls.length > 0) {
        toast({
          title: "User Busy",
          description: `${targetName} is currently in another call.`,
          variant: "destructive",
        });
        return;
      }

      // Create call session via edge function (bypasses RLS)
      const callId = `call_${currentUserId}_${targetUserId}_${Date.now()}`;
      registerOutgoingCall(callId);
      
      // Determine man/woman roles based on gender
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('gender')
        .eq('user_id', currentUserId)
        .maybeSingle();

      const isMale = currentProfile?.gender?.toLowerCase() === 'male';
      
      const { error: sessionError } = await supabase.functions.invoke('ai-women-manager', {
        body: {
          action: 'create_direct_call',
          data: {
            call_id: callId,
            man_user_id: isMale ? currentUserId : targetUserId,
            woman_user_id: isMale ? targetUserId : currentUserId,
            rate_per_minute: pricing.videoRatePerMinute,
          }
        }
      });

      // Fallback: create session directly if edge function doesn't support direct call
      if (sessionError) {
        const { error: directError } = await supabase
          .from('video_call_sessions')
          .insert({
            call_id: callId,
            man_user_id: isMale ? currentUserId : targetUserId,
            woman_user_id: isMale ? targetUserId : currentUserId,
            status: 'ringing',
            rate_per_minute: pricing.videoRatePerMinute,
          });

        if (directError) {
          console.error("Error creating call session:", directError);
          toast({
            title: "Error",
            description: "Failed to start video call. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      setActiveCall({ callId });

      toast({
        title: "Calling...",
        description: `Connecting to ${targetName}`,
      });
    } catch (error) {
      console.error("Error starting direct video call:", error);
      toast({
        title: "Error",
        description: "Failed to start video call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleEndCall = async () => {
    if (activeCall) {
      await supabase
        .from('video_call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          end_reason: 'user_ended',
        })
        .eq('call_id', activeCall.callId);
    }
    setActiveCall(null);
  };

  return (
    <>
      <Button
        onClick={startDirectVideoCall}
        disabled={isSearching || !!activeCall || isVideoCallsDisabled}
        variant={variant}
        size={size}
        className={iconOnly ? "h-8 w-8 p-0" : "gap-1 text-xs h-8"}
        title={isVideoCallsDisabled ? "Video calls temporarily disabled (server overload)" : `Video Call ${targetName}`}
      >
        {isSearching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isVideoCallsDisabled ? (
          <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <>
            <Video className="w-3.5 h-3.5" />
            {!iconOnly && "Video"}
          </>
        )}
      </Button>

      {activeCall && (
        <DraggableVideoCallWindow
          callId={activeCall.callId}
          remoteUserId={targetUserId}
          remoteName={targetName}
          remotePhoto={targetPhoto}
          isInitiator={true}
          currentUserId={currentUserId}
          onClose={handleEndCall}
          initialPosition={{ x: window.innerWidth - 400, y: 80 }}
          zIndex={70}
          ratePerMinute={pricing.videoRatePerMinute}
        />
      )}

      <AlertDialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-destructive" />
              Recharge Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              {rechargeMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/wallet')}>
              Recharge Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DirectVideoCallButton;

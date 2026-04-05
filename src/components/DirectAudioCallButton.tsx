import { useState, useEffect } from "react";
import { registerOutgoingCall } from "@/hooks/useIncomingCalls";
import { registerSession, unregisterSession } from "@/hooks/useSessionPriority";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, Loader2, Wallet, ShieldAlert } from "lucide-react";
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

interface DirectAudioCallButtonProps {
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

const DirectAudioCallButton = ({
  currentUserId,
  targetUserId,
  targetName,
  targetPhoto,
  walletBalance,
  onBalanceChange,
  size = "sm",
  variant = "auroraOutline",
  iconOnly = true,
}: DirectAudioCallButtonProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pricing } = useChatPricing();
  const { isVideoCallsDisabled, reason: circuitBreakerReason } = useVideoCallCircuitBreaker();
  const [isSearching, setIsSearching] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeMessage, setRechargeMessage] = useState("");
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    stream: MediaStream | null;
  } | null>(null);

  const audioRate = pricing.audioRatePerMinute || 6;

  const startDirectAudioCall = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isVideoCallsDisabled) {
      toast({
        title: "Calls Temporarily Disabled",
        description: circuitBreakerReason
          ? `Server under high load. Calls will resume automatically in ~2 hours.`
          : "Calls are temporarily disabled due to high server load.",
        variant: "destructive",
      });
      return;
    }

    // Check super user
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || '';
    const isSuperUser = /^(female|male|admin)([1-9]|1[0-5])@meow-meow\.com$/i.test(userEmail);

    if (!isSuperUser) {
      const minBalance = audioRate * 2;
      if (walletBalance <= 0) {
        setRechargeMessage("Your wallet balance is ₹0. Recharge is mandatory to start audio calls.");
        setShowRechargeDialog(true);
        return;
      } else if (walletBalance < minBalance) {
        setRechargeMessage(`Insufficient balance to start an audio call. Please recharge your wallet.`);
        setShowRechargeDialog(true);
        return;
      }
    }

    setIsSearching(true);
    
    // Acquire audio-only stream in click handler (user gesture context)
    let preStream: MediaStream | null = null;
    try {
      preStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (mediaErr) {
      console.error('[DirectAudioCall] Pre-acquire media failed:', mediaErr);
      toast({ title: "Microphone Error", description: "Please allow microphone access.", variant: "destructive" });
      setIsSearching(false);
      return;
    }

    try {
      // Check if target user is online
      const { data: targetStatus } = await supabase
        .from('user_status')
        .select('is_online')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (!targetStatus?.is_online) {
        preStream?.getTracks().forEach(t => t.stop());
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
        preStream?.getTracks().forEach(t => t.stop());
        toast({
          title: "User Busy",
          description: `${targetName} is currently in another call.`,
          variant: "destructive",
        });
        return;
      }

      // Create call session
      const callId = `call_${currentUserId}_${targetUserId}_${Date.now()}`;
      registerOutgoingCall(callId);
      
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
            rate_per_minute: audioRate,
            call_type: 'audio',
          }
        }
      });

      if (sessionError) {
        const { error: directError } = await supabase
          .from('video_call_sessions')
          .insert({
            call_id: callId,
            man_user_id: isMale ? currentUserId : targetUserId,
            woman_user_id: isMale ? targetUserId : currentUserId,
            status: 'ringing',
            rate_per_minute: audioRate,
            call_type: 'audio',
          });

        if (directError) {
          console.error("Error creating audio call session:", directError);
          preStream?.getTracks().forEach(t => t.stop());
          toast({
            title: "Error",
            description: "Failed to start audio call. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      setActiveCall({ callId, stream: preStream });
      registerSession('audio_call', callId);

      toast({
        title: "Calling...",
        description: `Audio calling ${targetName}`,
      });
    } catch (error) {
      console.error("Error starting direct audio call:", error);
      preStream?.getTracks().forEach(t => t.stop());
      toast({
        title: "Error",
        description: "Failed to start audio call. Please try again.",
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
        onClick={startDirectAudioCall}
        disabled={isSearching || !!activeCall || isVideoCallsDisabled}
        variant={variant}
        size={size}
        className={iconOnly ? "h-8 w-8 p-0" : "gap-1 text-xs h-8"}
        title={isVideoCallsDisabled ? "Calls temporarily disabled" : `Audio Call ${targetName}`}
      >
        {isSearching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isVideoCallsDisabled ? (
          <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <>
            <Phone className="w-3.5 h-3.5" />
            {!iconOnly && "Audio"}
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
          zIndex={130}
          ratePerMinute={audioRate}
          preAcquiredStream={activeCall.stream}
          audioOnly={true}
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

export default DirectAudioCallButton;

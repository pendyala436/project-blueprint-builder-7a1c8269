import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DraggableVideoCallWindow from "./DraggableVideoCallWindow";
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

interface VideoCallMiniButtonProps {
  currentUserId: string;
  userLanguage: string;
  walletBalance: number;
  onBalanceChange?: (newBalance: number) => void;
}

interface ActiveVideoCall {
  callId: string;
  womanUserId: string;
  womanName: string;
  womanPhoto: string | null;
}

const VideoCallMiniButton = ({ 
  currentUserId, 
  userLanguage, 
  walletBalance,
  onBalanceChange 
}: VideoCallMiniButtonProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeMessage, setRechargeMessage] = useState("");
  const [activeCall, setActiveCall] = useState<ActiveVideoCall | null>(null);

  const startVideoCall = async () => {
    // Get current user email to check if super user
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || '';
    
    // Super users (matching email pattern) bypass balance check entirely
    const isSuperUser = /^(female|male|admin)([1-9]|1[0-5])@meow-meow\.com$/i.test(userEmail);
    
    if (!isSuperUser) {
      // Minimum balance required to start video call
      const minBalance = 16;
      
      if (walletBalance <= 0) {
        setRechargeMessage("Your wallet balance is ₹0. Recharge is mandatory to start video calls.");
        setShowRechargeDialog(true);
        return;
      } else if (walletBalance < minBalance) {
        setRechargeMessage(`You need at least ₹${minBalance} to start a video call. Your current balance is ₹${walletBalance}. Please recharge your wallet.`);
        setShowRechargeDialog(true);
        return;
      }
    }

    setIsSearching(true);

    try {
      // Use AI to find available woman for video call with same language
      // Pass man_user_id so edge function can create the session server-side (bypasses RLS)
      const { data: result, error } = await supabase.functions.invoke('ai-women-manager', {
        body: {
          action: 'distribute_for_call',
          data: { language: userLanguage, man_user_id: currentUserId }
        }
      });

      if (error) throw error;

      if (!result.success || !result.woman) {
        toast({
          title: "No Available Users",
          description: result.reason || `No women speaking ${userLanguage} are available for video calls right now. Video calls require same language.`,
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      // Session is created server-side; use the returned call_id
      const callId = result.call_id;
      if (!callId) {
        throw new Error('Server failed to create video call session');
      }

      // Set active call - will show draggable window
      setActiveCall({
        callId,
        womanUserId: result.woman.user_id,
        womanName: result.woman.full_name || 'User',
        womanPhoto: result.woman.photo_url
      });

      toast({
        title: "Calling...",
        description: `Connecting to ${result.woman.full_name}`,
      });

    } catch (error) {
      console.error("Error starting video call:", error);
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
          end_reason: 'user_ended'
        })
        .eq('call_id', activeCall.callId);
    }
    setActiveCall(null);
  };

  return (
    <>
      <Button
        onClick={startVideoCall}
        disabled={isSearching || !!activeCall}
        variant="aurora"
        size="lg"
        className="gap-2"
      >
        {isSearching ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding...
          </>
        ) : activeCall ? (
          <>
            <Video className="w-4 h-4" />
            In Call
          </>
        ) : (
          <>
            <Video className="w-4 h-4" />
            Video Call
          </>
        )}
      </Button>

      {/* Draggable Video Call Window */}
      {activeCall && (
        <DraggableVideoCallWindow
          callId={activeCall.callId}
          remoteUserId={activeCall.womanUserId}
          remoteName={activeCall.womanName}
          remotePhoto={activeCall.womanPhoto}
          isInitiator={true}
          currentUserId={currentUserId}
          onClose={handleEndCall}
          initialPosition={{ x: window.innerWidth - 400, y: 80 }}
          zIndex={70}
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

export default VideoCallMiniButton;

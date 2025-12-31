import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Wallet, X, Phone } from "lucide-react";
import VideoCallModal from "./VideoCallModal";
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
import { useVideoCallWithFailover } from "@/hooks/useVideoCallWithFailover";
import { useState } from "react";

interface VideoCallButtonProps {
  currentUserId: string;
  userLanguage: string;
  walletBalance: number;
  onBalanceChange?: (newBalance: number) => void;
}

const VideoCallButton = ({ 
  currentUserId, 
  userLanguage, 
  walletBalance,
  onBalanceChange 
}: VideoCallButtonProps) => {
  const navigate = useNavigate();
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeMessage, setRechargeMessage] = useState("");

  const {
    isSearching,
    isRinging,
    isConnected,
    callSession,
    attemptCount,
    startVideoCall,
    endCall,
    cancelSearch,
    isActive
  } = useVideoCallWithFailover({
    currentUserId,
    userLanguage,
    walletBalance,
    maxRetries: 5
  });

  const handleStartCall = async () => {
    const result = await startVideoCall();
    if (result?.needsRecharge) {
      setRechargeMessage(result.message);
      setShowRechargeDialog(true);
    }
  };

  const getButtonContent = () => {
    if (isSearching) {
      return (
        <span className="flex items-center gap-2 text-white font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Finding... {attemptCount > 1 ? `(${attemptCount})` : ''}</span>
        </span>
      );
    }
    if (isRinging) {
      return (
        <span className="flex items-center gap-2 text-white font-medium">
          <Phone className="w-5 h-5 animate-pulse" />
          <span>Ringing...</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-2 text-white font-medium">
        <Video className="w-5 h-5" />
        <span>Video Call</span>
      </span>
    );
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          onClick={handleStartCall}
          disabled={isActive}
          variant="aurora"
          size="lg"
          className="gap-2 min-w-[140px] px-5 py-3 shadow-lg"
        >
          {getButtonContent()}
        </Button>

        {(isSearching || isRinging) && (
          <Button
            onClick={cancelSearch}
            variant="destructive"
            size="icon"
            className="h-11 w-11 rounded-full shadow-md"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {callSession && (isRinging || isConnected) && (
        <VideoCallModal
          isOpen={true}
          onClose={endCall}
          callId={callSession.callId}
          remoteUserId={callSession.womanUserId}
          remoteName={callSession.womanName}
          remotePhoto={callSession.womanPhoto}
          isInitiator={true}
          currentUserId={currentUserId}
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

export default VideoCallButton;

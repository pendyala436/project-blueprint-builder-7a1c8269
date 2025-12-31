import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Wallet, X, Phone } from "lucide-react";
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
import { useVideoCallWithFailover } from "@/hooks/useVideoCallWithFailover";

interface VideoCallMiniButtonProps {
  currentUserId: string;
  userLanguage: string;
  walletBalance: number;
  onBalanceChange?: (newBalance: number) => void;
}

const VideoCallMiniButton = ({ 
  currentUserId, 
  userLanguage, 
  walletBalance,
  onBalanceChange 
}: VideoCallMiniButtonProps) => {
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
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Finding... {attemptCount > 1 ? `(${attemptCount})` : ''}
        </>
      );
    }
    if (isRinging) {
      return (
        <>
          <Phone className="w-4 h-4 animate-pulse" />
          Ringing...
        </>
      );
    }
    if (isConnected) {
      return (
        <>
          <Video className="w-4 h-4" />
          In Call
        </>
      );
    }
    return (
      <>
        <Video className="w-4 h-4" />
        Video Call
      </>
    );
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleStartCall}
          disabled={isActive}
          variant="aurora"
          size="lg"
          className="gap-2"
        >
          {getButtonContent()}
        </Button>

        {(isSearching || isRinging) && (
          <Button
            onClick={cancelSearch}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-destructive/20"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Draggable Video Call Window */}
      {callSession && isConnected && (
        <DraggableVideoCallWindow
          callId={callSession.callId}
          remoteUserId={callSession.womanUserId}
          remoteName={callSession.womanName}
          remotePhoto={callSession.womanPhoto}
          isInitiator={true}
          currentUserId={currentUserId}
          onClose={endCall}
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

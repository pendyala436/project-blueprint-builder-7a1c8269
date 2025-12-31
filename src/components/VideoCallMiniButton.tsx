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
    console.log('[VideoCallMiniButton] handleStartCall clicked');
    const result = await startVideoCall();
    console.log('[VideoCallMiniButton] startVideoCall result:', result);
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
    if (isConnected) {
      return (
        <span className="flex items-center gap-2 text-white font-medium">
          <Video className="w-5 h-5" />
          <span>In Call</span>
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

      {/* Draggable Video Call Window - show during ringing AND connected states */}
      {callSession && (isRinging || isConnected) && (
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
          ratePerMinute={callSession.ratePerMinute}
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

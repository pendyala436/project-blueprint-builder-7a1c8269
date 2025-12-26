import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff,
  Loader2
} from "lucide-react";
import { useMediaServerCall } from "@/hooks/useMediaServerCall";
import { ChatRelationshipActions } from "@/components/ChatRelationshipActions";
import { useBlockCheck } from "@/hooks/useBlockCheck";
import { useToast } from "@/hooks/use-toast";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  remoteUserId: string;
  remoteName: string;
  remotePhoto: string | null;
  isInitiator: boolean;
  currentUserId: string;
}

const VideoCallModal = ({
  isOpen,
  onClose,
  callId,
  remoteUserId,
  remoteName,
  remotePhoto,
  isInitiator,
  currentUserId
}: VideoCallModalProps) => {
  const { toast } = useToast();
  const {
    callStatus,
    callDuration,
    totalCost,
    isVideoEnabled,
    isAudioEnabled,
    localVideoRef,
    remoteVideoRef,
    endCall,
    toggleVideo,
    toggleAudio,
  } = useMediaServerCall({
    callId,
    currentUserId,
    remoteUserId,
    isInitiator,
    ratePerMinute: 5,
    onCallEnded: onClose,
  });

  // Check block status - auto-close if blocked
  const { isBlocked, isBlockedByThem } = useBlockCheck(currentUserId, remoteUserId);

  // Auto-close call if blocked
  useEffect(() => {
    if (isBlocked) {
      toast({
        title: "Call Ended",
        description: isBlockedByThem 
          ? "This user has blocked you" 
          : "You have blocked this user",
        variant: "destructive"
      });
      handleEndCall();
    }
  }, [isBlocked]);

  // Connect refs to video elements
  const localVideoElement = useRef<HTMLVideoElement>(null);
  const remoteVideoElement = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoElement.current) {
      (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = localVideoElement.current;
    }
    if (remoteVideoElement.current) {
      (remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = remoteVideoElement.current;
    }
  }, [localVideoRef, remoteVideoRef]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    await endCall();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleEndCall()}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden bg-black">
        <div className="relative w-full h-full flex flex-col">
          {/* Remote Video (Full screen) */}
          <div className="flex-1 relative bg-gray-900">
            {callStatus === 'ringing' || callStatus === 'connecting' || callStatus === 'idle' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Avatar className="w-32 h-32 mb-4">
                  <AvatarImage src={remotePhoto || undefined} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-accent">
                    {remoteName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-semibold mb-2">{remoteName}</h2>
                <div className="flex items-center gap-2 text-gray-300">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>
                    {callStatus === 'idle' && 'Initializing...'}
                    {callStatus === 'ringing' && 'Ringing...'}
                    {callStatus === 'connecting' && 'Connecting...'}
                  </span>
                </div>
              </div>
            ) : (
              <video
                ref={remoteVideoElement}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {/* Local Video (Picture-in-picture) */}
            <div className="absolute bottom-20 right-4 w-40 h-28 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
              <video
                ref={localVideoElement}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Call Info */}
            {callStatus === 'active' && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono">{formatDuration(callDuration)}</span>
                  <span className="text-sm text-gray-300">₹{totalCost}</span>
                </div>
              </div>
            )}

            {/* Connection Status Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    callStatus === 'active' ? 'bg-green-500' : 
                    callStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                    'bg-gray-500'
                  }`} />
                  <span className="text-xs text-white capitalize">{callStatus}</span>
                </div>
              </div>
              {/* Relationship Actions */}
              <ChatRelationshipActions
                currentUserId={currentUserId}
                targetUserId={remoteUserId}
                targetUserName={remoteName}
                onBlock={handleEndCall}
                className="bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 ${!isAudioEnabled ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-primary/20 border-primary/30 text-primary-foreground hover:bg-primary/30'}`}
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 ${!isVideoEnabled ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-primary/20 border-primary/30 text-primary-foreground hover:bg-primary/30'}`}
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>

              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-7 h-7" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;

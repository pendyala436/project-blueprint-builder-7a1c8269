import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff,
  Loader2,
  Radio,
  Users
} from "lucide-react";
import { useSRSCall } from "@/hooks/useSRSCall";

interface SRSVideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  remoteUserId: string;
  remoteName: string;
  remotePhoto: string | null;
  isInitiator: boolean;
  currentUserId: string;
  mode?: 'call' | 'stream';
}

const SRSVideoCallModal = ({
  isOpen,
  onClose,
  callId,
  remoteUserId,
  remoteName,
  remotePhoto,
  isInitiator,
  currentUserId,
  mode = 'call'
}: SRSVideoCallModalProps) => {
  const {
    callStatus,
    callDuration,
    totalCost,
    isVideoEnabled,
    isAudioEnabled,
    isLiveStreaming,
    viewerCount,
    localVideoRef,
    remoteVideoRef,
    endCall,
    toggleVideo,
    toggleAudio,
  } = useSRSCall({
    callId,
    currentUserId,
    remoteUserId,
    isInitiator,
    ratePerMinute: 5,
    mode,
    onCallEnded: onClose,
  });

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

  const getStatusText = () => {
    switch (callStatus) {
      case 'idle': return 'Initializing...';
      case 'publishing': return isLiveStreaming ? 'Starting stream...' : 'Connecting...';
      case 'playing': return 'Joining...';
      case 'active': return isLiveStreaming ? 'Live' : 'Connected';
      case 'ended': return 'Ended';
      default: return callStatus;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleEndCall()}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden bg-black">
        <div className="relative w-full h-full flex flex-col">
          {/* Remote Video (Full screen) */}
          <div className="flex-1 relative bg-gray-900">
            {callStatus === 'publishing' || callStatus === 'playing' || callStatus === 'idle' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Avatar className="w-32 h-32 mb-4">
                  <AvatarImage src={remotePhoto || undefined} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-pink-500 to-purple-600">
                    {remoteName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-semibold mb-2">{remoteName}</h2>
                <div className="flex items-center gap-2 text-gray-300">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{getStatusText()}</span>
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
                  {!isLiveStreaming && (
                    <span className="text-sm text-gray-300">₹{totalCost}</span>
                  )}
                </div>
              </div>
            )}

            {/* Live Streaming Badge */}
            {isLiveStreaming && callStatus === 'active' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-destructive text-destructive-foreground animate-pulse flex items-center gap-2 px-4 py-1">
                  <Radio className="w-4 h-4" />
                  LIVE
                </Badge>
              </div>
            )}

            {/* Viewer Count (for streaming) */}
            {isLiveStreaming && callStatus === 'active' && (
              <div className="absolute top-4 right-16 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                <div className="flex items-center gap-2 text-white">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{viewerCount}</span>
                </div>
              </div>
            )}

            {/* Connection Status Badge */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  callStatus === 'active' ? 'bg-online' : 
                  callStatus === 'publishing' || callStatus === 'playing' ? 'bg-warning animate-pulse' : 
                  'bg-muted-foreground'
                }`} />
                <span className="text-xs text-white">{getStatusText()}</span>
              </div>
            </div>

            {/* SRS Server Info (for debugging) */}
            <div className="absolute bottom-20 left-4 text-xs text-white/50">
              SRS Media Server
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 ${!isAudioEnabled ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 ${!isVideoEnabled ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
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

export default SRSVideoCallModal;

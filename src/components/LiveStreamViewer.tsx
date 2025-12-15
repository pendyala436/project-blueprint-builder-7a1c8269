import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  X, 
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Users,
  Radio,
  Loader2
} from "lucide-react";
import { useSRSCall } from "@/hooks/useSRSCall";

interface LiveStreamViewerProps {
  streamId: string;
  streamerUserId: string;
  streamerName: string;
  streamerPhoto: string | null;
  currentUserId: string;
  onClose: () => void;
}

const LiveStreamViewer = ({
  streamId,
  streamerUserId,
  streamerName,
  streamerPhoto,
  currentUserId,
  onClose,
}: LiveStreamViewerProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    callStatus,
    viewerCount,
    remoteVideoRef,
    watchStream,
    cleanup,
  } = useSRSCall({
    callId: streamId,
    currentUserId,
    remoteUserId: streamerUserId,
    isInitiator: false,
    mode: 'stream',
  });

  useEffect(() => {
    if (videoRef.current) {
      (remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = videoRef.current;
    }
    
    // Start watching the stream
    watchStream(streamerUserId);

    return () => {
      cleanup();
    };
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-lg overflow-hidden"
    >
      {/* Video */}
      {callStatus === 'active' ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <Avatar className="w-24 h-24 mb-4">
            <AvatarImage src={streamerPhoto || undefined} />
            <AvatarFallback className="text-3xl bg-gradient-to-br from-pink-500 to-purple-600">
              {streamerName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-xl font-semibold mb-2">{streamerName}</h3>
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Connecting to stream...</span>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 ring-2 ring-red-500">
              <AvatarImage src={streamerPhoto || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600">
                {streamerName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium">{streamerName}</p>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500 text-white text-xs animate-pulse">
                  <Radio className="w-3 h-3 mr-1" />
                  LIVE
                </Badge>
                <span className="text-gray-400 text-xs flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {viewerCount}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary/20"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary/20"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </div>

          <div className="text-white text-sm">
            SRS Media Server
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamViewer;

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  X,
  Maximize2,
  Minimize2,
  Clock,
  IndianRupee,
  Loader2,
  GripVertical,
  Move,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff
} from "lucide-react";
import { useP2PCall } from "@/hooks/useP2PCall";
import { useBlockCheck } from "@/hooks/useBlockCheck";
import { ChatRelationshipActions } from "@/components/ChatRelationshipActions";

interface DraggableVideoCallWindowProps {
  callId: string;
  remoteUserId: string;
  remoteName: string;
  remotePhoto: string | null;
  isInitiator: boolean;
  currentUserId: string;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  ratePerMinute?: number;
}

const DraggableVideoCallWindow = ({
  callId,
  remoteUserId,
  remoteName,
  remotePhoto,
  isInitiator,
  currentUserId,
  onClose,
  initialPosition = { x: 20, y: 20 },
  zIndex = 60,
  onFocus,
  ratePerMinute = 5
}: DraggableVideoCallWindowProps) => {
  const { toast } = useToast();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // P2P Call hook
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
  } = useP2PCall({
    callId,
    currentUserId,
    remoteUserId,
    isInitiator,
    ratePerMinute,
    onCallEnded: onClose,
  });

  // Check block status - auto-close if blocked
  const { isBlocked, isBlockedByThem } = useBlockCheck(currentUserId, remoteUserId);

  // Dragging state
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Responsive size - smaller on mobile
  const getResponsiveSize = () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth < 1024;
      if (isMobile) return { width: 280, height: 320 };
      if (isTablet) return { width: 320, height: 360 };
      return { width: 380, height: 420 };
    }
    return { width: 380, height: 420 };
  };
  
  const [size, setSize] = useState(getResponsiveSize);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startWidth: number; startHeight: number; startX: number; startY: number } | null>(null);

  // Video refs
  const localVideoElement = useRef<HTMLVideoElement>(null);
  const remoteVideoElement = useRef<HTMLVideoElement>(null);

  // Auto-close if blocked
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
  useEffect(() => {
    if (localVideoElement.current) {
      (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = localVideoElement.current;
    }
    if (remoteVideoElement.current) {
      (remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = remoteVideoElement.current;
    }
  }, [localVideoRef, remoteVideoRef]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setSize(getResponsiveSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dragging handlers - supports both mouse and touch
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startPosX: position.x,
      startPosY: position.y
    };
    onFocus?.();
  }, [position, isMaximized, onFocus]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragRef.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - dragRef.current.startX;
      const deltaY = clientY - dragRef.current.startY;
      
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      
      setPosition({
        x: Math.max(0, Math.min(maxX, dragRef.current.startPosX + deltaX)),
        y: Math.max(0, Math.min(maxY, dragRef.current.startPosY + deltaY))
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, size]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    resizeRef.current = {
      startWidth: size.width,
      startHeight: size.height,
      startX: clientX,
      startY: clientY
    };
  }, [size]);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizing || !resizeRef.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - resizeRef.current.startX;
      const deltaY = clientY - resizeRef.current.startY;
      
      setSize({
        width: Math.max(260, Math.min(600, resizeRef.current.startWidth + deltaX)),
        height: Math.max(280, Math.min(600, resizeRef.current.startHeight + deltaY))
      });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      document.addEventListener("touchmove", handleResizeMove, { passive: false });
      document.addEventListener("touchend", handleResizeEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.removeEventListener("touchmove", handleResizeMove);
      document.removeEventListener("touchend", handleResizeEnd);
    };
  }, [isResizing]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    await endCall();
    onClose();
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'active': return 'bg-success';
      case 'connecting': return 'bg-warning animate-pulse';
      case 'ringing': return 'bg-primary animate-pulse';
      default: return 'bg-muted';
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'active': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'ringing': return 'Ringing...';
      case 'ended': return 'Ended';
      default: return 'Initializing...';
    }
  };

  // Determine if position is within container (for flex layout) or absolute
  const isInFlexContainer = initialPosition.x === 0 && initialPosition.y === 0;

  return (
    <Card
      ref={windowRef}
      className={cn(
        "bg-background/95 backdrop-blur-sm border border-border shadow-2xl overflow-hidden flex flex-col select-none",
        isDragging && "cursor-grabbing opacity-90",
        isResizing && "opacity-90",
        isMaximized && "!fixed !inset-0 !w-full !h-full !rounded-none z-[100]"
      )}
      style={isMaximized ? undefined : {
        width: size.width,
        height: isMinimized ? 52 : size.height,
        position: isInFlexContainer ? 'relative' : 'fixed',
        left: isInFlexContainer ? undefined : position.x,
        top: isInFlexContainer ? undefined : position.y,
        zIndex,
        transition: isDragging || isResizing ? 'none' : 'height 0.2s ease-out'
      }}
      onClick={onFocus}
    >
      {/* Header - Draggable */}
      <div
        className={cn(
          "flex items-center justify-between p-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border cursor-grab shrink-0",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Move className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="relative">
            <Avatar className="w-8 h-8">
              <AvatarImage src={remotePhoto || undefined} />
              <AvatarFallback className="text-xs bg-primary/20">
                {remoteName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background", getStatusColor())} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate max-w-[100px]">{remoteName}</p>
            <div className="flex items-center gap-1.5">
              <Video className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{getStatusText()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Call duration and cost */}
          {callStatus === 'active' && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-muted/50 rounded text-xs">
              <Clock className="w-3 h-3" />
              <span className="font-mono">{formatDuration(callDuration)}</span>
              <IndianRupee className="w-3 h-3 ml-1" />
              <span>{totalCost}</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleEndCall();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Content - Collapsible */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col overflow-hidden bg-black relative">
          {/* Remote Video (Full area) */}
          {callStatus === 'ringing' || callStatus === 'connecting' || callStatus === 'idle' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white bg-gradient-to-br from-gray-900 to-gray-800">
              <Avatar className="w-20 h-20 mb-3">
                <AvatarImage src={remotePhoto || undefined} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-accent">
                  {remoteName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold mb-1">{remoteName}</h3>
              <div className="flex items-center gap-2 text-gray-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{getStatusText()}</span>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={remoteVideoElement}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local Video (Picture-in-picture) */}
              <div className="absolute bottom-14 right-2 w-24 h-18 sm:w-28 sm:h-20 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                <video
                  ref={localVideoElement}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <VideoOff className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full w-10 h-10",
                  !isAudioEnabled ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-primary/20 border-primary/30 text-primary-foreground hover:bg-primary/30'
                )}
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full w-10 h-10",
                  !isVideoEnabled ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-primary/20 border-primary/30 text-primary-foreground hover:bg-primary/30'
                )}
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="rounded-full w-12 h-12"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-5 h-5" />
              </Button>

              <ChatRelationshipActions
                currentUserId={currentUserId}
                targetUserId={remoteUserId}
                targetUserName={remoteName}
                onBlock={handleEndCall}
                className="bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 rounded-full w-10 h-10"
              />
            </div>
          </div>
        </div>
      )}

      {/* Resize handle */}
      {!isMinimized && !isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize touch-none"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground rotate-[-45deg] absolute bottom-0.5 right-0.5" />
        </div>
      )}
    </Card>
  );
};

export default DraggableVideoCallWindow;

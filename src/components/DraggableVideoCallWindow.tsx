import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  UserPlus,
  UserMinus,
  Shield,
  ShieldOff,
  Gift,
  Square
} from "lucide-react";
import { useP2PCall } from "@/hooks/useP2PCall";
import { useBlockCheck } from "@/hooks/useBlockCheck";
import { GiftSendButton } from "@/components/GiftSendButton";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  preAcquiredStream?: MediaStream | null;
  audioOnly?: boolean;
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
  ratePerMinute = 8,
  preAcquiredStream = null,
  audioOnly = false,
}: DraggableVideoCallWindowProps) => {
  const { toast } = useToast();
  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
  const effectiveZIndex = Math.max(zIndex, 120);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(isMobileDevice);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isPendingFriend, setIsPendingFriend] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // P2P Call hook
  const {
    callStatus,
    callDuration,
    totalCost,
    isVideoEnabled,
    isAudioEnabled,
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    bindStreamToVideo,
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
    preAcquiredStream,
    audioOnly,
  });

  // Ring-back tone for caller while waiting for callee to answer
  useEffect(() => {
    if (!isInitiator) return;
    if (callStatus !== 'ringing' && callStatus !== 'connecting' && callStatus !== 'idle') return;

    let ctx: AudioContext | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const playTone = () => {
      try {
        if (!ctx || ctx.state === 'closed') {
          ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(450, ctx.currentTime + 0.2);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch (_) {}
    };

    playTone();
    intervalId = setInterval(playTone, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (ctx && ctx.state !== 'closed') {
        try { ctx.close(); } catch (_) {}
      }
    };
  }, [isInitiator, callStatus]);

  // Check block status
  const { isBlocked: isBlockedByEither, isBlockedByThem } = useBlockCheck(currentUserId, remoteUserId);

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
      if (isMobile) return { width: 300, height: 380 };
      if (isTablet) return { width: 340, height: 420 };
      return { width: 400, height: 480 };
    }
    return { width: 400, height: 480 };
  };
  
  const [size, setSize] = useState(getResponsiveSize);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startWidth: number; startHeight: number; startX: number; startY: number } | null>(null);

  // Callback refs: bind streams to video elements when they mount
  const setLocalVideoEl = useCallback((el: HTMLVideoElement | null) => {
    (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    if (el && localStream) {
      bindStreamToVideo(el, localStream);
    }
  }, [localVideoRef, localStream, bindStreamToVideo]);

  const setRemoteVideoEl = useCallback((el: HTMLVideoElement | null) => {
    (remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    if (el && remoteStream) {
      bindStreamToVideo(el, remoteStream);
    }
  }, [remoteVideoRef, remoteStream, bindStreamToVideo]);

  const loadRelationshipStatus = async () => {
    try {
      const { data: blockData } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocked_by", currentUserId)
        .eq("blocked_user_id", remoteUserId)
        .maybeSingle();
      setIsBlocked(!!blockData);

      const { data: friendData } = await supabase
        .from("user_friends")
        .select("id, status")
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${remoteUserId}),and(user_id.eq.${remoteUserId},friend_id.eq.${currentUserId})`)
        .maybeSingle();

      if (friendData) {
        setIsFriend(friendData.status === "accepted");
        setIsPendingFriend(friendData.status === "pending");
      } else {
        setIsFriend(false);
        setIsPendingFriend(false);
      }
    } catch (error) {
      console.error("Error loading relationship:", error);
    }
  };

  const swallowControlEvent = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleControlPointerDown = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  // Load relationship status
  useEffect(() => {
    if (currentUserId && remoteUserId) {
      loadRelationshipStatus();
    }
  }, [currentUserId, remoteUserId]);

  // Auto-close if blocked from either side
  useEffect(() => {
    if (isBlockedByEither) {
      toast({
        title: "Call Ended",
        description: isBlockedByThem ? "This user has blocked you" : "You blocked this user",
        variant: "destructive",
      });
      void handleEndCall();
    }
  }, [isBlockedByEither, isBlockedByThem]);

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

    const target = e.target as HTMLElement | null;
    const interactive = target?.closest?.(
      'button, a, input, textarea, select, [role="button"], [data-no-drag]'
    );
    if (interactive) return;

    e.preventDefault();
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startPosX: position.x,
      startPosY: position.y,
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
        width: Math.max(280, Math.min(700, resizeRef.current.startWidth + deltaX)),
        height: Math.max(320, Math.min(700, resizeRef.current.startHeight + deltaY))
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
    console.log('[VideoCall] handleEndCall triggered');
    try {
      await endCall();

      await supabase
        .from('active_chat_sessions')
        .update({
          status: 'active',
          end_reason: null
        })
        .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`)
        .eq('status', 'paused')
        .eq('end_reason', 'video_call_priority');
    } catch (error) {
      console.error("[VideoCall] Error ending call:", error);
      toast.error("Call not ended", { description: "Unable to end the call properly. Please refresh if the call appears stuck." });
    }
    onClose();
  };

  const handleBlock = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from("user_blocks")
        .insert({
          blocked_by: currentUserId,
          blocked_user_id: remoteUserId,
          block_type: "permanent",
          reason: "Blocked during video call",
        });

      if (error) throw error;

      await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${remoteUserId}),and(user_id.eq.${remoteUserId},friend_id.eq.${currentUserId})`);

      await supabase
        .from("active_chat_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          end_reason: "user_blocked"
        })
        .or(`and(man_user_id.eq.${currentUserId},woman_user_id.eq.${remoteUserId}),and(man_user_id.eq.${remoteUserId},woman_user_id.eq.${currentUserId})`)
        .in("status", ["active", "pending", "paused", "billing_paused"]);

      await supabase
        .from('video_call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          end_reason: 'user_blocked'
        })
        .or(`and(man_user_id.eq.${currentUserId},woman_user_id.eq.${remoteUserId}),and(man_user_id.eq.${remoteUserId},woman_user_id.eq.${currentUserId})`)
        .in('status', ['ringing', 'active', 'connecting']);

      setIsBlocked(true);
      setIsFriend(false);
      setIsPendingFriend(false);
      setShowBlockDialog(false);

      toast({
        title: "User Blocked",
        description: `${remoteName} has been blocked`
      });

      await handleEndCall();
    } catch (error: any) {
      console.error("Error blocking user:", error);
      toast({
        title: "Error",
        description: error?.message?.includes('duplicate') ? 'User is already blocked' : 'Failed to block user',
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocked_by", currentUserId)
        .eq("blocked_user_id", remoteUserId);

      if (error) throw error;

      setIsBlocked(false);
      toast({
        title: "User Unblocked",
        description: `${remoteName} has been unblocked`
      });
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (isActionLoading || isBlocked) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase.rpc('send_friend_request', {
        p_target_user_id: remoteUserId,
      });

      if (error) throw error;

      setIsPendingFriend(true);
      toast({
        title: "Friend Request Sent",
        description: `A friend request has been sent to ${remoteName}.`
      });
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      const msg = error?.message?.includes('already')
        ? 'A friend request already exists.'
        : 'Failed to send friend request';
      toast({
        title: "Error",
        description: msg,
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${remoteUserId}),and(user_id.eq.${remoteUserId},friend_id.eq.${currentUserId})`);

      if (error) throw error;

      setIsFriend(false);
      setIsPendingFriend(false);
      setShowUnfriendDialog(false);
      toast({
        title: "Unfriended",
        description: `${remoteName} has been removed from your friends`
      });
    } catch (error) {
      console.error("Error unfriending user:", error);
      toast({
        title: "Error",
        description: "Failed to unfriend user",
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
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

  const isInFlexContainer = initialPosition.x === 0 && initialPosition.y === 0;

  return (
    <TooltipProvider>
      <Card
        ref={windowRef}
        className={cn(
          "bg-background/95 backdrop-blur-sm border border-border shadow-2xl overflow-hidden flex flex-col select-none",
          isDragging && "cursor-grabbing opacity-90",
          isResizing && "opacity-90",
          isMaximized && "!fixed !inset-0 !w-full !h-full !rounded-none"
        )}
        style={isMaximized
          ? { zIndex: effectiveZIndex }
          : {
              width: size.width,
              height: isMinimized ? 52 : size.height,
              position: isInFlexContainer ? 'relative' : 'fixed',
              left: isInFlexContainer ? undefined : position.x,
              top: isInFlexContainer ? undefined : position.y,
              zIndex: effectiveZIndex,
              transition: isDragging || isResizing ? 'none' : 'height 0.2s ease-out'
            }}
        onClick={onFocus}
      >
        {/* Header - Draggable */}
        <div
          className={cn(
            "relative z-20 flex items-center justify-between p-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border shrink-0",
            isDragging && "cursor-grabbing"
          )}
        >
          <div
            className="flex items-center gap-2 overflow-hidden cursor-grab"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
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

          <div
            className="flex items-center gap-1 shrink-0"
            data-no-drag
            onPointerDown={handleControlPointerDown}
            onMouseDown={handleControlPointerDown}
            onTouchStart={handleControlPointerDown}
            onClick={(e) => e.stopPropagation()}
          >
            {callStatus === 'active' && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-muted/50 rounded text-xs" data-no-drag>
                <Clock className="w-3 h-3" />
                <span className="font-mono">{formatDuration(callDuration)}</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              data-no-drag
              onPointerDown={handleControlPointerDown}
              onMouseDown={handleControlPointerDown}
              onTouchStart={handleControlPointerDown}
              onClick={(e) => {
                swallowControlEvent(e);
                if (isMaximized) {
                  setIsMaximized(false);
                } else {
                  setIsMinimized(!isMinimized);
                }
              }}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>

            {!isMinimized && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                data-no-drag
                onPointerDown={handleControlPointerDown}
                onMouseDown={handleControlPointerDown}
                onTouchStart={handleControlPointerDown}
                onClick={(e) => {
                  swallowControlEvent(e);
                  setIsMaximized(!isMaximized);
                }}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              data-no-drag
              onPointerDown={handleControlPointerDown}
              onMouseDown={handleControlPointerDown}
              onTouchStart={handleControlPointerDown}
              onClick={async (e) => {
                swallowControlEvent(e);
                await handleEndCall();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex-1 flex flex-col overflow-hidden bg-black relative">
            {callStatus === 'ringing' || callStatus === 'connecting' || callStatus === 'idle' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white bg-gradient-to-br from-gray-900 to-gray-800 pointer-events-none">
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
                  ref={setRemoteVideoEl}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover pointer-events-none select-none"
                />

                <div className="pointer-events-none absolute bottom-20 right-2 z-10 w-24 h-18 sm:w-28 sm:h-20 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                  <video
                    ref={setLocalVideoEl}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover pointer-events-none select-none"
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <VideoOff className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
              </>
            )}

            <div
              className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto p-2 bg-gradient-to-t from-black/90 via-black/70 to-transparent"
              data-no-drag
              onPointerDown={handleControlPointerDown}
              onMouseDown={handleControlPointerDown}
              onTouchStart={handleControlPointerDown}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-20 flex items-center justify-center gap-2 mb-2" data-no-drag>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "rounded-full w-10 h-10",
                        !isAudioEnabled ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                      )}
                      data-no-drag
                      onPointerDown={handleControlPointerDown}
                      onMouseDown={handleControlPointerDown}
                      onTouchStart={handleControlPointerDown}
                      onClick={(e) => {
                        swallowControlEvent(e);
                        toggleAudio();
                      }}
                    >
                      {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isAudioEnabled ? 'Mute' : 'Unmute'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "rounded-full w-10 h-10",
                        !isVideoEnabled ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                      )}
                      data-no-drag
                      onPointerDown={handleControlPointerDown}
                      onMouseDown={handleControlPointerDown}
                      onTouchStart={handleControlPointerDown}
                      onClick={(e) => {
                        swallowControlEvent(e);
                        toggleVideo();
                      }}
                    >
                      {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isVideoEnabled ? 'Stop Video' : 'Start Video'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-full w-12 h-12"
                      data-no-drag
                      onPointerDown={handleControlPointerDown}
                      onMouseDown={handleControlPointerDown}
                      onTouchStart={handleControlPointerDown}
                      onClick={async (e) => {
                        swallowControlEvent(e);
                        await handleEndCall();
                      }}
                    >
                      <PhoneOff className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>End Call</TooltipContent>
                </Tooltip>
              </div>

              <div className="relative z-20 flex items-center justify-center gap-2" data-no-drag>
                {isFriend ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-9 h-9 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        data-no-drag
                        onPointerDown={handleControlPointerDown}
                        onMouseDown={handleControlPointerDown}
                        onTouchStart={handleControlPointerDown}
                        onClick={(e) => {
                          swallowControlEvent(e);
                          setShowUnfriendDialog(true);
                        }}
                        disabled={isActionLoading}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Unfriend</TooltipContent>
                  </Tooltip>
                ) : isPendingFriend ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-9 h-9 bg-warning/20 border-warning/30 text-warning hover:bg-warning/30"
                        disabled
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Request Pending</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-9 h-9 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        data-no-drag
                        onPointerDown={handleControlPointerDown}
                        onMouseDown={handleControlPointerDown}
                        onTouchStart={handleControlPointerDown}
                        onClick={(e) => {
                          swallowControlEvent(e);
                          void handleAddFriend();
                        }}
                        disabled={isActionLoading || isBlocked}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Friend</TooltipContent>
                  </Tooltip>
                )}

                {isBlocked ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-9 h-9 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        data-no-drag
                        onPointerDown={handleControlPointerDown}
                        onMouseDown={handleControlPointerDown}
                        onTouchStart={handleControlPointerDown}
                        onClick={(e) => {
                          swallowControlEvent(e);
                          void handleUnblock();
                        }}
                        disabled={isActionLoading}
                      >
                        <ShieldOff className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Unblock</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-9 h-9 bg-white/10 border-white/20 text-destructive hover:bg-destructive/20"
                        data-no-drag
                        onPointerDown={handleControlPointerDown}
                        onMouseDown={handleControlPointerDown}
                        onTouchStart={handleControlPointerDown}
                        onClick={(e) => {
                          swallowControlEvent(e);
                          setShowBlockDialog(true);
                        }}
                        disabled={isActionLoading}
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Block User</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Resize handle */}
        {!isMinimized && !isMaximized && (
          <div
            className="absolute bottom-0 right-0 z-30 w-4 h-4 cursor-se-resize touch-none"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          >
            <GripVertical className="w-3 h-3 text-muted-foreground rotate-[-45deg] absolute bottom-0.5 right-0.5" />
          </div>
        )}
      </Card>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {remoteName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the video call immediately. 
              {isFriend && " Your friendship will also be removed."}
              {" "}They won't be able to message or call you until unblocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unfriend Confirmation Dialog */}
      <AlertDialog open={showUnfriendDialog} onOpenChange={setShowUnfriendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {remoteName} from friends?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {remoteName} from your friends list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnfriend}>
              Unfriend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default DraggableVideoCallWindow;

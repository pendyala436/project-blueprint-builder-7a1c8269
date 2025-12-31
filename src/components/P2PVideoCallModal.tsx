import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff,
  Loader2,
  UserPlus,
  UserMinus,
  Shield,
  ShieldOff
} from "lucide-react";
import { useP2PCall } from "@/hooks/useP2PCall";
import { useBlockCheck } from "@/hooks/useBlockCheck";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GiftSendButton } from "@/components/GiftSendButton";

interface P2PVideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  remoteUserId: string;
  remoteName: string;
  remotePhoto: string | null;
  isInitiator: boolean;
  currentUserId: string;
}

const P2PVideoCallModal = ({
  isOpen,
  onClose,
  callId,
  remoteUserId,
  remoteName,
  remotePhoto,
  isInitiator,
  currentUserId
}: P2PVideoCallModalProps) => {
  const { toast } = useToast();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isPendingFriend, setIsPendingFriend] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);

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
    ratePerMinute: 5,
    onCallEnded: onClose,
  });

  // Check block status - auto-close if blocked
  const { isBlocked: isBlockedByEither, isBlockedByThem } = useBlockCheck(currentUserId, remoteUserId);

  // Load relationship status
  useEffect(() => {
    if (currentUserId && remoteUserId) {
      loadRelationshipStatus();
    }
  }, [currentUserId, remoteUserId]);

  // Subscribe to real-time relationship changes
  useEffect(() => {
    if (!currentUserId || !remoteUserId) return;

    const channel = supabase
      .channel(`p2p-call-relationships-${currentUserId}-${remoteUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_blocks' },
        () => loadRelationshipStatus()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_friends' },
        () => loadRelationshipStatus()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, remoteUserId]);

  const loadRelationshipStatus = async () => {
    try {
      // Check if blocked by me
      const { data: blockData } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocked_by", currentUserId)
        .eq("blocked_user_id", remoteUserId)
        .maybeSingle();
      setIsBlocked(!!blockData);

      // Check friendship status
      const { data: friendData } = await supabase
        .from("user_friends")
        .select("id, status, user_id")
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

  // Auto-close call if blocked
  useEffect(() => {
    if (isBlockedByEither) {
      toast({
        title: "Call Ended",
        description: isBlockedByThem 
          ? "This user has blocked you" 
          : "You have blocked this user",
        variant: "destructive"
      });
      handleEndCall();
    }
  }, [isBlockedByEither]);

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

  const handleBlock = async () => {
    setIsActionLoading(true);
    try {
      await supabase
        .from("user_blocks")
        .insert({
          blocked_by: currentUserId,
          blocked_user_id: remoteUserId
        });

      // Remove friendship if exists
      await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${remoteUserId}),and(user_id.eq.${remoteUserId},friend_id.eq.${currentUserId})`);

      // End video call session
      await supabase
        .from("video_call_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          end_reason: "user_blocked"
        })
        .eq("call_id", callId);

      setIsBlocked(true);
      setIsFriend(false);
      setShowBlockDialog(false);
      
      toast({
        title: "User Blocked",
        description: `${remoteName} has been blocked`
      });
      
      handleEndCall();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnblock = async () => {
    setIsActionLoading(true);
    try {
      await supabase
        .from("user_blocks")
        .delete()
        .eq("blocked_by", currentUserId)
        .eq("blocked_user_id", remoteUserId);

      setIsBlocked(false);
      toast({
        title: "User Unblocked",
        description: `${remoteName} has been unblocked`
      });
    } catch (error) {
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
    setIsActionLoading(true);
    try {
      await supabase
        .from("user_friends")
        .insert({
          user_id: currentUserId,
          friend_id: remoteUserId,
          status: "pending",
          created_by: currentUserId
        });

      setIsPendingFriend(true);
      toast({
        title: "Friend Request Sent",
        description: `Friend request sent to ${remoteName}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setIsActionLoading(true);
    try {
      await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${remoteUserId}),and(user_id.eq.${remoteUserId},friend_id.eq.${currentUserId})`);

      setIsFriend(false);
      setIsPendingFriend(false);
      setShowUnfriendDialog(false);
      toast({
        title: "Unfriended",
        description: `${remoteName} has been removed from your friends`
      });
    } catch (error) {
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
      case 'active': return 'bg-green-500';
      case 'connecting': case 'ringing': return 'bg-yellow-500 animate-pulse';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'idle': return 'Initializing...';
      case 'ringing': return 'Ringing...';
      case 'connecting': return 'Connecting...';
      case 'active': return 'Connected';
      case 'ended': return 'Ended';
      default: return callStatus;
    }
  };

  return (
    <TooltipProvider>
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
                    <span>{getStatusText()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">P2P WebRTC Connection</p>
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
                    <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                    <span className="text-xs text-white">{getStatusText()}</span>
                  </div>
                </div>
              </div>

              {/* P2P indicator */}
              <div className="absolute bottom-20 left-4 text-xs text-white/50">
                P2P WebRTC
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              {/* Main controls row */}
              <div className="flex items-center justify-center gap-4 mb-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      className={`rounded-full w-14 h-14 ${!isAudioEnabled ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-primary/20 border-primary/30 text-primary-foreground hover:bg-primary/30'}`}
                      onClick={toggleAudio}
                    >
                      {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isAudioEnabled ? 'Mute' : 'Unmute'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      className={`rounded-full w-14 h-14 ${!isVideoEnabled ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-primary/20 border-primary/30 text-primary-foreground hover:bg-primary/30'}`}
                      onClick={toggleVideo}
                    >
                      {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isVideoEnabled ? 'Stop Video' : 'Start Video'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="lg"
                      className="rounded-full w-16 h-16"
                      onClick={handleEndCall}
                    >
                      <PhoneOff className="w-7 h-7" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>End Call</TooltipContent>
                </Tooltip>

                {/* Gift Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <GiftSendButton
                        senderId={currentUserId}
                        receiverId={remoteUserId}
                        receiverName={remoteName}
                        className="rounded-full w-14 h-14 bg-primary/20 border border-primary/30 text-primary-foreground hover:bg-primary/30"
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Send Gift</TooltipContent>
                </Tooltip>
              </div>

              {/* Secondary controls row */}
              <div className="flex items-center justify-center gap-3">
                {/* Friend/Unfriend Button */}
                {isFriend ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-10 h-10 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        onClick={() => setShowUnfriendDialog(true)}
                        disabled={isActionLoading}
                      >
                        <UserMinus className="w-5 h-5" />
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
                        className="rounded-full w-10 h-10 bg-yellow-500/20 border-yellow-500/30 text-yellow-500"
                        disabled
                      >
                        <UserPlus className="w-5 h-5" />
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
                        className="rounded-full w-10 h-10 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        onClick={handleAddFriend}
                        disabled={isActionLoading || isBlocked}
                      >
                        <UserPlus className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Friend</TooltipContent>
                  </Tooltip>
                )}

                {/* Block/Unblock Button */}
                {isBlocked ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-10 h-10 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        onClick={handleUnblock}
                        disabled={isActionLoading}
                      >
                        <ShieldOff className="w-5 h-5" />
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
                        className="rounded-full w-10 h-10 bg-white/10 border-white/20 text-destructive hover:bg-destructive/20"
                        onClick={() => setShowBlockDialog(true)}
                        disabled={isActionLoading}
                      >
                        <Shield className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Block User</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

export default P2PVideoCallModal;

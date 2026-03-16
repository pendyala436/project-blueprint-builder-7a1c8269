import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  UserPlus, 
  UserMinus, 
  ShieldOff, 
  Shield, 
  MoreVertical,
  Check,
  X,
  Clock,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatRelationshipActionsProps {
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
  onBlock?: () => void;
  onUnblock?: () => void;
  className?: string;
}

interface FriendshipStatus {
  isFriend: boolean;
  isPending: boolean;
  isRequested: boolean;
}

export const ChatRelationshipActions = ({
  currentUserId,
  targetUserId,
  targetUserName,
  onBlock,
  onUnblock,
  className
}: ChatRelationshipActionsProps) => {
  const { toast } = useToast();
  const [isBlocked, setIsBlocked] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>({
    isFriend: false,
    isPending: false,
    isRequested: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);

  useEffect(() => {
    if (currentUserId && targetUserId) {
      loadUserRelationship();
    }
  }, [currentUserId, targetUserId]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!currentUserId || !targetUserId) return;

    const channel = supabase
      .channel(`chat-relationship-${currentUserId}-${targetUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_blocks' },
        () => loadUserRelationship()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_friends' },
        () => loadUserRelationship()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, targetUserId]);

  const loadUserRelationship = async () => {
    try {
      // Check if blocked
      const { data: blockData } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocked_by", currentUserId)
        .eq("blocked_user_id", targetUserId)
        .maybeSingle();

      setIsBlocked(!!blockData);

      // Check friendship status
      const { data: friendData } = await supabase
        .from("user_friends")
        .select("id, status, user_id")
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`)
        .maybeSingle();

      if (friendData) {
        setFriendshipStatus({
          isFriend: friendData.status === "accepted",
          isPending: friendData.status === "pending" && friendData.user_id === currentUserId,
          isRequested: friendData.status === "pending" && friendData.user_id === targetUserId
        });
      } else {
        setFriendshipStatus({ isFriend: false, isPending: false, isRequested: false });
      }
    } catch (error) {
      console.error("Error loading user relationship:", error);
    }
  };

  const handleBlock = async () => {
    setIsLoading(true);
    try {
      // Insert block record
      await supabase
        .from("user_blocks")
        .insert({
          blocked_by: currentUserId,
          blocked_user_id: targetUserId
        });

      // Remove friendship if exists
      await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`);

      // End any active chat sessions
      await supabase
        .from("active_chat_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          end_reason: "user_blocked"
        })
        .or(`and(man_user_id.eq.${currentUserId},woman_user_id.eq.${targetUserId}),and(man_user_id.eq.${targetUserId},woman_user_id.eq.${currentUserId})`)
        .eq("status", "active");

      // End any active video call sessions
      await supabase
        .from("video_call_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          end_reason: "user_blocked"
        })
        .or(`and(man_user_id.eq.${currentUserId},woman_user_id.eq.${targetUserId}),and(man_user_id.eq.${targetUserId},woman_user_id.eq.${currentUserId})`)
        .in("status", ["ringing", "active", "connecting"]);

      setIsBlocked(true);
      setFriendshipStatus({ isFriend: false, isPending: false, isRequested: false });
      setShowBlockDialog(false);
      
      toast({
        title: "User Blocked",
        description: `${targetUserName} has been blocked. Chat and video calls have ended.`
      });
      
      onBlock?.();
    } catch (error) {
      console.error("Error blocking user:", error);
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from("user_blocks")
        .delete()
        .eq("blocked_by", currentUserId)
        .eq("blocked_user_id", targetUserId);

      setIsBlocked(false);
      toast({
        title: "User Unblocked",
        description: `${targetUserName} has been unblocked`
      });
      
      onUnblock?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (isBlocked) return;
    setIsLoading(true);
    try {
      await supabase
        .from("user_friends")
        .insert({
          user_id: currentUserId,
          friend_id: targetUserId,
          status: "pending",
          created_by: currentUserId
        });

      setFriendshipStatus({ isFriend: false, isPending: true, isRequested: false });
      toast({
        title: "Friend Request Sent",
        description: `Friend request sent to ${targetUserName}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from("user_friends")
        .update({ status: "accepted" })
        .eq("user_id", targetUserId)
        .eq("friend_id", currentUserId);

      setFriendshipStatus({ isFriend: true, isPending: false, isRequested: false });
      toast({
        title: "Friend Request Accepted",
        description: `You are now friends with ${targetUserName}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from("user_friends")
        .delete()
        .eq("user_id", targetUserId)
        .eq("friend_id", currentUserId);

      setFriendshipStatus({ isFriend: false, isPending: false, isRequested: false });
      toast({
        title: "Friend Request Rejected",
        description: "Friend request has been rejected"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`);

      setFriendshipStatus({ isFriend: false, isPending: false, isRequested: false });
      setShowUnfriendDialog(false);
      toast({
        title: "Unfriended",
        description: `${targetUserName} has been removed from your friends`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unfriend user",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from("user_friends")
        .delete()
        .eq("user_id", currentUserId)
        .eq("friend_id", targetUserId);

      setFriendshipStatus({ isFriend: false, isPending: false, isRequested: false });
      toast({
        title: "Request Cancelled",
        description: "Friend request has been cancelled"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={cn("hover:bg-muted", className)} disabled={isLoading} title="More actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {/* Friendship Actions */}
          {friendshipStatus.isFriend ? (
            <DropdownMenuItem onClick={() => setShowUnfriendDialog(true)}>
              <UserMinus className="mr-2 h-4 w-4" />
              Unfriend
            </DropdownMenuItem>
          ) : friendshipStatus.isPending ? (
            <DropdownMenuItem onClick={handleCancelRequest}>
              <X className="mr-2 h-4 w-4" />
              Cancel Request
            </DropdownMenuItem>
          ) : friendshipStatus.isRequested ? (
            <>
              <DropdownMenuItem onClick={handleAcceptFriendRequest}>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Accept Request
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRejectFriendRequest}>
                <X className="mr-2 h-4 w-4 text-red-500" />
                Reject Request
              </DropdownMenuItem>
            </>
          ) : !isBlocked && (
            <DropdownMenuItem onClick={handleSendFriendRequest}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Friend
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Block Actions */}
          {isBlocked ? (
            <DropdownMenuItem onClick={handleUnblock}>
              <ShieldOff className="mr-2 h-4 w-4" />
              Unblock
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="text-destructive focus:text-destructive">
              <Shield className="mr-2 h-4 w-4" />
              Block
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {targetUserName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end any active chats and video calls immediately. 
              {friendshipStatus.isFriend && " Your friendship will also be removed."}
              {" "}They won't be able to message you or call you until unblocked.
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
            <AlertDialogTitle>Remove {targetUserName} from friends?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {targetUserName} from your friends list?
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
    </>
  );
};

export default ChatRelationshipActions;

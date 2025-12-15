import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useTranslation } from "@/contexts/TranslationContext";

interface UserActionButtonsProps {
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
  variant?: "default" | "compact" | "dropdown";
  onActionComplete?: () => void;
}

interface FriendshipStatus {
  isFriend: boolean;
  isPending: boolean;
  isRequested: boolean;
}

export const UserActionButtons = ({
  currentUserId,
  targetUserId,
  targetUserName,
  variant = "default",
  onActionComplete
}: UserActionButtonsProps) => {
  const { t } = useTranslation();
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

  const loadUserRelationship = async () => {
    try {
      // Check if blocked (using correct column names: blocked_by, blocked_user_id)
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
      await supabase
        .from("user_blocks")
        .insert({
          blocked_by: currentUserId,
          blocked_user_id: targetUserId
        });

      setIsBlocked(true);
      setShowBlockDialog(false);
      toast({
        title: t('userBlocked', 'User Blocked'),
        description: t('userBlockedDesc', `${targetUserName} has been blocked`)
      });
      onActionComplete?.();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('blockFailed', 'Failed to block user'),
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
        title: t('userUnblocked', 'User Unblocked'),
        description: t('userUnblockedDesc', `${targetUserName} has been unblocked`)
      });
      onActionComplete?.();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('unblockFailed', 'Failed to unblock user'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
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
        title: t('requestSent', 'Friend Request Sent'),
        description: t('requestSentDesc', `Friend request sent to ${targetUserName}`)
      });
      onActionComplete?.();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('requestFailed', 'Failed to send friend request'),
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
        title: t('requestAccepted', 'Friend Request Accepted'),
        description: t('nowFriends', `You are now friends with ${targetUserName}`)
      });
      onActionComplete?.();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('acceptFailed', 'Failed to accept friend request'),
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
        title: t('requestRejected', 'Friend Request Rejected'),
        description: t('requestRejectedDesc', 'Friend request has been rejected')
      });
      onActionComplete?.();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('rejectFailed', 'Failed to reject friend request'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setIsLoading(true);
    try {
      // Delete from both directions
      await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`);

      setFriendshipStatus({ isFriend: false, isPending: false, isRequested: false });
      setShowUnfriendDialog(false);
      toast({
        title: t('unfriended', 'Unfriended'),
        description: t('unfriendedDesc', `${targetUserName} has been removed from your friends`)
      });
      onActionComplete?.();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('unfriendFailed', 'Failed to unfriend user'),
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
        title: t('requestCancelled', 'Request Cancelled'),
        description: t('requestCancelledDesc', 'Friend request has been cancelled')
      });
      onActionComplete?.();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('cancelFailed', 'Failed to cancel request'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Dropdown variant
  if (variant === "dropdown") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {friendshipStatus.isFriend ? (
              <DropdownMenuItem onClick={() => setShowUnfriendDialog(true)}>
                <UserMinus className="mr-2 h-4 w-4" />
                {t('unfriend', 'Unfriend')}
              </DropdownMenuItem>
            ) : friendshipStatus.isPending ? (
              <DropdownMenuItem onClick={handleCancelRequest}>
                <X className="mr-2 h-4 w-4" />
                {t('cancelRequest', 'Cancel Request')}
              </DropdownMenuItem>
            ) : friendshipStatus.isRequested ? (
              <>
                <DropdownMenuItem onClick={handleAcceptFriendRequest}>
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  {t('acceptRequest', 'Accept Request')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRejectFriendRequest}>
                  <X className="mr-2 h-4 w-4 text-red-500" />
                  {t('rejectRequest', 'Reject Request')}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={handleSendFriendRequest} disabled={isBlocked}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('addFriend', 'Add Friend')}
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {isBlocked ? (
              <DropdownMenuItem onClick={handleUnblock}>
                <ShieldOff className="mr-2 h-4 w-4" />
                {t('unblock', 'Unblock')}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="text-destructive">
                <Shield className="mr-2 h-4 w-4" />
                {t('block', 'Block')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('blockUser', 'Block User?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('blockUserDesc', `Are you sure you want to block ${targetUserName}? They won't be able to message you or see your profile.`)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground">
                {t('block', 'Block')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showUnfriendDialog} onOpenChange={setShowUnfriendDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('unfriendUser', 'Remove Friend?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('unfriendUserDesc', `Are you sure you want to remove ${targetUserName} from your friends?`)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnfriend}>
                {t('unfriend', 'Unfriend')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1">
        {friendshipStatus.isFriend ? (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <Users className="w-3 h-3 mr-1" />
            {t('friend', 'Friend')}
          </Badge>
        ) : friendshipStatus.isPending ? (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            {t('pending', 'Pending')}
          </Badge>
        ) : friendshipStatus.isRequested ? (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleAcceptFriendRequest} disabled={isLoading}>
              <Check className="w-4 h-4 text-green-500" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleRejectFriendRequest} disabled={isLoading}>
              <X className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ) : !isBlocked ? (
          <Button size="sm" variant="ghost" onClick={handleSendFriendRequest} disabled={isLoading}>
            <UserPlus className="w-4 h-4" />
          </Button>
        ) : null}

        {isBlocked && (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <Shield className="w-3 h-3 mr-1" />
            {t('blocked', 'Blocked')}
          </Badge>
        )}
      </div>
    );
  }

  // Default variant - full buttons
  return (
    <div className="flex flex-wrap gap-2">
      {friendshipStatus.isFriend ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUnfriendDialog(true)}
          disabled={isLoading}
          className="border-green-500/30 text-green-600"
        >
          <Users className="w-4 h-4 mr-2" />
          {t('friends', 'Friends')}
        </Button>
      ) : friendshipStatus.isPending ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelRequest}
          disabled={isLoading}
        >
          <Clock className="w-4 h-4 mr-2" />
          {t('requestPending', 'Request Pending')}
        </Button>
      ) : friendshipStatus.isRequested ? (
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleAcceptFriendRequest}
            disabled={isLoading}
          >
            <Check className="w-4 h-4 mr-2" />
            {t('accept', 'Accept')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRejectFriendRequest}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            {t('reject', 'Reject')}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendFriendRequest}
          disabled={isLoading || isBlocked}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {t('addFriend', 'Add Friend')}
        </Button>
      )}

      {isBlocked ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnblock}
          disabled={isLoading}
        >
          <ShieldOff className="w-4 h-4 mr-2" />
          {t('unblock', 'Unblock')}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBlockDialog(true)}
          disabled={isLoading}
          className="text-destructive border-destructive/30"
        >
          <Shield className="w-4 h-4 mr-2" />
          {t('block', 'Block')}
        </Button>
      )}

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('blockUser', 'Block User?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('blockUserDesc', `Are you sure you want to block ${targetUserName}? They won't be able to message you or see your profile.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground">
              {t('block', 'Block')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnfriendDialog} onOpenChange={setShowUnfriendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('unfriendUser', 'Remove Friend?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('unfriendUserDesc', `Are you sure you want to remove ${targetUserName} from your friends?`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnfriend}>
              {t('unfriend', 'Unfriend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserActionButtons;

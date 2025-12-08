import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  MessageCircle, 
  StopCircle, 
  Ban, 
  Shield, 
  UserPlus, 
  UserMinus, 
  Check, 
  X,
  Phone,
  PhoneOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";

interface ChatRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto: string | null;
  fromUserLanguage: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

interface ActivePartner {
  id: string;
  chatId: string;
  userId: string;
  userName: string;
  userPhoto: string | null;
  userLanguage: string;
  isBlocked: boolean;
  isFriend: boolean;
}

interface ChatInterfaceProps {
  userGender: "male" | "female";
  currentUserId: string;
  currentUserLanguage: string;
}

export const ChatInterface = ({ 
  userGender, 
  currentUserId, 
  currentUserLanguage 
}: ChatInterfaceProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [pendingRequests, setPendingRequests] = useState<ChatRequest[]>([]);
  const [activePartner, setActivePartner] = useState<ActivePartner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    targetUserId: string;
    targetUserName: string;
  }>({ open: false, action: "", targetUserId: "", targetUserName: "" });

  useEffect(() => {
    if (currentUserId) {
      loadChatData();
      subscribeToChanges();
    }
  }, [currentUserId]);

  const subscribeToChanges = () => {
    const channel = supabase
      .channel('chat-interface-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_chat_sessions'
        },
        () => {
          loadChatData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_friends'
        },
        () => {
          loadChatData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_blocks'
        },
        () => {
          loadChatData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadChatData = async () => {
    try {
      // Load active chat session
      const { data: activeSessions } = await supabase
        .from("active_chat_sessions")
        .select("*")
        .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`)
        .eq("status", "active")
        .limit(1);

      if (activeSessions && activeSessions.length > 0) {
        const session = activeSessions[0];
        const partnerId = session.man_user_id === currentUserId 
          ? session.woman_user_id 
          : session.man_user_id;

        // Get partner profile
        const { data: partnerProfile } = await supabase
          .from("profiles")
          .select("full_name, photo_url, primary_language")
          .eq("user_id", partnerId)
          .maybeSingle();

        // Check if blocked
        const { data: blockData } = await supabase
          .from("user_blocks")
          .select("id")
          .eq("blocked_by", currentUserId)
          .eq("blocked_user_id", partnerId)
          .maybeSingle();

        // Check if friend
        const { data: friendData } = await supabase
          .from("user_friends")
          .select("id, status")
          .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
          .or(`user_id.eq.${partnerId},friend_id.eq.${partnerId}`)
          .eq("status", "accepted")
          .maybeSingle();

        setActivePartner({
          id: session.id,
          chatId: session.chat_id,
          userId: partnerId,
          userName: partnerProfile?.full_name || "Anonymous",
          userPhoto: partnerProfile?.photo_url,
          userLanguage: partnerProfile?.primary_language || "Unknown",
          isBlocked: !!blockData,
          isFriend: !!friendData
        });
      } else {
        setActivePartner(null);
      }

      // For women: load pending chat requests (from matches table with pending status)
      if (userGender === "female") {
        const { data: pendingMatches } = await supabase
          .from("matches")
          .select("*")
          .eq("matched_user_id", currentUserId)
          .eq("status", "pending");

        if (pendingMatches && pendingMatches.length > 0) {
          const userIds = pendingMatches.map(m => m.user_id);
          
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, photo_url, primary_language")
            .in("user_id", userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

          const requests: ChatRequest[] = pendingMatches.map(match => {
            const profile = profileMap.get(match.user_id);
            return {
              id: match.id,
              fromUserId: match.user_id,
              fromUserName: profile?.full_name || "Anonymous",
              fromUserPhoto: profile?.photo_url || null,
              fromUserLanguage: profile?.primary_language || "Unknown",
              status: "pending",
              createdAt: match.created_at
            };
          });

          setPendingRequests(requests);
        } else {
          setPendingRequests([]);
        }
      }
    } catch {
      // Error loading chat data - silently handled
    }
  };

  const handleStartChat = async (targetUserId: string) => {
    setIsLoading(true);
    try {
      // Create a match request
      const { error } = await supabase
        .from("matches")
        .insert({
          user_id: currentUserId,
          matched_user_id: targetUserId,
          status: "pending"
        });

      if (error) throw error;

      toast({
        title: t('chatRequestSent', 'Chat Request Sent'),
        description: t('waitingForAcceptance', 'Waiting for acceptance...'),
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        title: t('error', 'Error'),
        description: t('failedToStartChat', 'Failed to start chat'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptChat = async (request: ChatRequest) => {
    setIsLoading(true);
    try {
      // Get chat pricing rate from admin settings
      const { data: pricing } = await supabase
        .from("chat_pricing")
        .select("rate_per_minute, women_earning_rate")
        .eq("is_active", true)
        .maybeSingle();

      const ratePerMinute = pricing?.rate_per_minute || 5;

      // Update match status
      await supabase
        .from("matches")
        .update({ status: "accepted" })
        .eq("id", request.id);

      // Create active chat session with admin-set rate
      const chatId = `chat_${request.fromUserId}_${currentUserId}_${Date.now()}`;
      const { error: sessionError } = await supabase
        .from("active_chat_sessions")
        .insert({
          chat_id: chatId,
          man_user_id: request.fromUserId,
          woman_user_id: currentUserId,
          status: "active",
          rate_per_minute: ratePerMinute
        });

      if (sessionError) throw sessionError;

      toast({
        title: t('chatAccepted', 'Chat Accepted'),
        description: t('chatSessionStarted', 'Chat session started!'),
      });

      // Navigate to chat
      navigate(`/chat/${request.fromUserId}`);
    } catch (error) {
      console.error("Error accepting chat:", error);
      toast({
        title: t('error', 'Error'),
        description: t('failedToAcceptChat', 'Failed to accept chat'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectChat = async (request: ChatRequest) => {
    setIsLoading(true);
    try {
      await supabase
        .from("matches")
        .update({ status: "rejected" })
        .eq("id", request.id);

      toast({
        title: t('chatRejected', 'Chat Rejected'),
        description: t('chatRequestDeclined', 'Chat request declined'),
      });

      loadChatData();
    } catch (error) {
      console.error("Error rejecting chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopChat = async () => {
    if (!activePartner) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from("active_chat_sessions")
        .update({ 
          status: "ended",
          ended_at: new Date().toISOString(),
          end_reason: "user_ended"
        })
        .eq("id", activePartner.id);

      toast({
        title: t('chatEnded', 'Chat Ended'),
        description: t('chatSessionEnded', 'Chat session has ended'),
      });

      setActivePartner(null);
    } catch (error) {
      console.error("Error stopping chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!activePartner) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from("user_blocks")
        .insert({
          blocked_by: currentUserId,
          blocked_user_id: activePartner.userId,
          block_type: "manual",
          reason: "User blocked"
        });

      toast({
        title: t('userBlocked', 'User Blocked'),
        description: t('userBlockedDescription', 'You will no longer receive messages from this user'),
      });

      loadChatData();
    } catch (error) {
      console.error("Error blocking user:", error);
    } finally {
      setIsLoading(false);
      setConfirmDialog({ open: false, action: "", targetUserId: "", targetUserName: "" });
    }
  };

  const handleUnblock = async () => {
    if (!activePartner) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from("user_blocks")
        .delete()
        .eq("blocked_by", currentUserId)
        .eq("blocked_user_id", activePartner.userId);

      toast({
        title: t('userUnblocked', 'User Unblocked'),
        description: t('userUnblockedDescription', 'You can now receive messages from this user'),
      });

      loadChatData();
    } catch (error) {
      console.error("Error unblocking user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!activePartner) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from("user_friends")
        .insert({
          user_id: currentUserId,
          friend_id: activePartner.userId,
          status: "accepted",
          created_by: currentUserId
        });

      toast({
        title: t('friendAdded', 'Friend Added'),
        description: t('friendAddedDescription', 'User added to your friends list'),
      });

      loadChatData();
    } catch (error) {
      console.error("Error adding friend:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!activePartner) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from("user_friends")
        .delete()
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .or(`user_id.eq.${activePartner.userId},friend_id.eq.${activePartner.userId}`);

      toast({
        title: t('friendRemoved', 'Friend Removed'),
        description: t('friendRemovedDescription', 'User removed from your friends list'),
      });

      loadChatData();
    } catch (error) {
      console.error("Error removing friend:", error);
    } finally {
      setIsLoading(false);
      setConfirmDialog({ open: false, action: "", targetUserId: "", targetUserName: "" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Pending Chat Requests (for women) */}
      {userGender === "female" && pendingRequests.length > 0 && (
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5 text-amber-500" />
              {t('incomingChatRequests', 'Incoming Chat Requests')}
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div 
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.fromUserPhoto || undefined} />
                    <AvatarFallback>{request.fromUserName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{request.fromUserName}</p>
                    <p className="text-xs text-muted-foreground">{request.fromUserLanguage}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => handleAcceptChat(request)}
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {t('accept', 'Accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRejectChat(request)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t('reject', 'Reject')}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Chat Controls */}
      {activePartner && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              {t('activeChat', 'Active Chat')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  <AvatarImage src={activePartner.userPhoto || undefined} />
                  <AvatarFallback className="bg-primary/20">
                    {activePartner.userName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{activePartner.userName}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {activePartner.userLanguage}
                    </Badge>
                    {activePartner.isFriend && (
                      <Badge variant="secondary" className="text-xs">
                        {t('friend', 'Friend')}
                      </Badge>
                    )}
                    {activePartner.isBlocked && (
                      <Badge variant="destructive" className="text-xs">
                        {t('blocked', 'Blocked')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate(`/chat/${activePartner.userId}`)}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                {t('openChat', 'Open Chat')}
              </Button>
            </div>

            {/* Chat Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopChat}
                disabled={isLoading}
              >
                <StopCircle className="h-4 w-4 mr-1" />
                {t('stopChat', 'Stop Chat')}
              </Button>

              {activePartner.isBlocked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnblock}
                  disabled={isLoading}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  {t('unblock', 'Unblock')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDialog({
                    open: true,
                    action: "block",
                    targetUserId: activePartner.userId,
                    targetUserName: activePartner.userName
                  })}
                  disabled={isLoading}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  {t('block', 'Block')}
                </Button>
              )}

              {activePartner.isFriend ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDialog({
                    open: true,
                    action: "unfriend",
                    targetUserId: activePartner.userId,
                    targetUserName: activePartner.userName
                  })}
                  disabled={isLoading}
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  {t('unfriend', 'Unfriend')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFriend}
                  disabled={isLoading}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {t('addFriend', 'Friend')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Chat - Start Chat (for men) */}
      {userGender === "male" && !activePartner && (
        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20">
                  <Phone className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('startNewChat', 'Start New Chat')}</p>
                  <p className="text-sm text-muted-foreground">{t('findWomenOnline', 'Find women online to chat with')}</p>
                </div>
              </div>
              <Button
                variant="gradient"
                onClick={() => navigate("/online-users")}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                {t('findUsers', 'Find Users')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => 
        setConfirmDialog({ ...confirmDialog, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "block" 
                ? t('confirmBlock', 'Confirm Block') 
                : t('confirmUnfriend', 'Confirm Unfriend')}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "block" 
                ? t('blockConfirmMessage', `Are you sure you want to block ${confirmDialog.targetUserName}? They will no longer be able to contact you.`)
                : t('unfriendConfirmMessage', `Are you sure you want to remove ${confirmDialog.targetUserName} from your friends?`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, action: "", targetUserId: "", targetUserName: "" })}
            >
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDialog.action === "block" ? handleBlock : handleRemoveFriend}
              disabled={isLoading}
            >
              {confirmDialog.action === "block" ? t('block', 'Block') : t('unfriend', 'Unfriend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatInterface;

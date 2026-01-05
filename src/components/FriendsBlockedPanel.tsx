import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Users, 
  ShieldOff, 
  UserMinus, 
  ArrowLeft,
  Loader2,
  UserX,
  Heart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Friend {
  id: string;
  friendId: string;
  fullName: string;
  photoUrl: string | null;
  status: string;
  isOnline: boolean;
}

interface BlockedUser {
  id: string;
  blockedUserId: string;
  fullName: string;
  photoUrl: string | null;
  blockedAt: string;
}

interface FriendsBlockedPanelProps {
  currentUserId: string;
  userGender: "male" | "female";
  onClose: () => void;
}

export const FriendsBlockedPanel = ({
  currentUserId,
  userGender,
  onClose
}: FriendsBlockedPanelProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedBlocked, setSelectedBlocked] = useState<BlockedUser | null>(null);
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadFriends(), loadBlockedUsers()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      // Get friend relationships where user is either user_id or friend_id
      const { data: friendsData, error } = await supabase
        .from("user_friends")
        .select("*")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .eq("status", "accepted");

      if (error) throw error;

      if (!friendsData || friendsData.length === 0) {
        setFriends([]);
        return;
      }

      // Get friend user IDs
      const friendUserIds = friendsData.map(f => 
        f.user_id === currentUserId ? f.friend_id : f.user_id
      );

      // Fetch profiles for friends
      const profileTable = userGender === "male" ? "female_profiles" : "male_profiles";
      const { data: profiles } = await supabase
        .from(profileTable)
        .select("user_id, full_name, photo_url, last_active_at")
        .in("user_id", friendUserIds);

      const friendsList: Friend[] = friendsData.map(f => {
        const friendUserId = f.user_id === currentUserId ? f.friend_id : f.user_id;
        const profile = profiles?.find(p => p.user_id === friendUserId);
        const lastActive = profile?.last_active_at ? new Date(profile.last_active_at) : null;
        const isOnline = lastActive ? (Date.now() - lastActive.getTime()) < 5 * 60 * 1000 : false;

        return {
          id: f.id,
          friendId: friendUserId,
          fullName: profile?.full_name || "Unknown",
          photoUrl: profile?.photo_url || null,
          status: f.status,
          isOnline
        };
      });

      setFriends(friendsList);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      const { data: blocksData, error } = await supabase
        .from("user_blocks")
        .select("*")
        .eq("blocked_by", currentUserId);

      if (error) throw error;

      if (!blocksData || blocksData.length === 0) {
        setBlockedUsers([]);
        return;
      }

      const blockedUserIds = blocksData.map(b => b.blocked_user_id);

      // Try to fetch from both profile tables
      const { data: maleProfiles } = await supabase
        .from("male_profiles")
        .select("user_id, full_name, photo_url")
        .in("user_id", blockedUserIds);

      const { data: femaleProfiles } = await supabase
        .from("female_profiles")
        .select("user_id, full_name, photo_url")
        .in("user_id", blockedUserIds);

      const allProfiles = [...(maleProfiles || []), ...(femaleProfiles || [])];

      const blockedList: BlockedUser[] = blocksData.map(b => {
        const profile = allProfiles.find(p => p.user_id === b.blocked_user_id);
        return {
          id: b.id,
          blockedUserId: b.blocked_user_id,
          fullName: profile?.full_name || "Unknown User",
          photoUrl: profile?.photo_url || null,
          blockedAt: b.created_at
        };
      });

      setBlockedUsers(blockedList);
    } catch (error) {
      console.error("Error loading blocked users:", error);
    }
  };

  const handleUnfriend = async () => {
    if (!selectedFriend) return;
    setActionLoading(true);
    try {
      await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${selectedFriend.friendId}),and(user_id.eq.${selectedFriend.friendId},friend_id.eq.${currentUserId})`);

      setFriends(prev => prev.filter(f => f.friendId !== selectedFriend.friendId));
      setShowUnfriendDialog(false);
      setSelectedFriend(null);
      
      toast({
        title: "Unfriended",
        description: `${selectedFriend.fullName} has been removed from your friends`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unfriend user",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!selectedBlocked) return;
    setActionLoading(true);
    try {
      await supabase
        .from("user_blocks")
        .delete()
        .eq("blocked_by", currentUserId)
        .eq("blocked_user_id", selectedBlocked.blockedUserId);

      setBlockedUsers(prev => prev.filter(b => b.blockedUserId !== selectedBlocked.blockedUserId));
      setShowUnblockDialog(false);
      setSelectedBlocked(null);
      
      toast({
        title: "User Unblocked",
        description: `${selectedBlocked.fullName} has been unblocked`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Friends & Blocked Users</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <Tabs defaultValue="friends" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="friends" className="gap-2">
              <Users className="h-4 w-4" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="blocked" className="gap-2">
              <UserX className="h-4 w-4" />
              Blocked ({blockedUsers.length})
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  Your Friends
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm">No friends yet</p>
                      <p className="text-xs mt-1">Add friends from chat to see them here</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {friends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={friend.photoUrl || undefined} />
                                <AvatarFallback className="bg-primary/10">
                                  {friend.fullName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className={cn(
                                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                                friend.isOnline ? "bg-green-500" : "bg-muted-foreground"
                              )} />
                            </div>
                            <div>
                              <p className="font-medium">{friend.fullName}</p>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  friend.isOnline ? "border-green-500/30 text-green-600" : ""
                                )}
                              >
                                {friend.isOnline ? "Online" : "Offline"}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              setSelectedFriend(friend);
                              setShowUnfriendDialog(true);
                            }}
                          >
                            <UserMinus className="h-4 w-4" />
                            Unfriend
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blocked Tab */}
          <TabsContent value="blocked" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserX className="h-4 w-4 text-destructive" />
                  Blocked Users
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : blockedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <ShieldOff className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm">No blocked users</p>
                      <p className="text-xs mt-1">Users you block will appear here</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {blockedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user.photoUrl || undefined} />
                              <AvatarFallback className="bg-destructive/10">
                                {user.fullName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                Blocked {new Date(user.blockedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                              setSelectedBlocked(user);
                              setShowUnblockDialog(true);
                            }}
                          >
                            <ShieldOff className="h-4 w-4" />
                            Unblock
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Unfriend Dialog */}
      <AlertDialog open={showUnfriendDialog} onOpenChange={setShowUnfriendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedFriend?.fullName} from friends?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unfriend {selectedFriend?.fullName}? You can add them back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnfriend} 
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Unfriend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock Dialog */}
      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {selectedBlocked?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow {selectedBlocked?.fullName} to message you and call you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FriendsBlockedPanel;

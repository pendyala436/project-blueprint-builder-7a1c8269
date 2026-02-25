import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
  Heart,
  MessageCircle,
  UserPlus,
  ShieldBan,
  Search
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

interface BrowseUser {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  age: number | null;
  country: string | null;
  primaryLanguage: string | null;
  isOnline: boolean;
  isFriend: boolean;
  isBlocked: boolean;
}

interface FriendsBlockedPanelProps {
  currentUserId: string;
  userGender: "male" | "female";
  onClose: () => void;
  onStartChat?: (targetUserId: string, targetName: string) => void;
}

export const FriendsBlockedPanel = ({
  currentUserId,
  userGender,
  onClose,
  onStartChat
}: FriendsBlockedPanelProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [browseUsers, setBrowseUsers] = useState<BrowseUser[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedBlocked, setSelectedBlocked] = useState<BlockedUser | null>(null);
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [selectedBrowseUser, setSelectedBrowseUser] = useState<BrowseUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [chatStarting, setChatStarting] = useState<string | null>(null);

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

      const friendUserIds = friendsData.map(f => 
        f.user_id === currentUserId ? f.friend_id : f.user_id
      );

      // Get profiles from opposite gender table
      const profileTable = userGender === "male" ? "female_profiles" : "male_profiles";
      const { data: profiles } = await supabase
        .from(profileTable)
        .select("user_id, full_name, photo_url, last_active_at")
        .in("user_id", friendUserIds);

      // Also check user_status for online status
      const { data: statusData } = await supabase
        .from("user_status")
        .select("user_id, is_online")
        .in("user_id", friendUserIds);

      const statusMap = new Map(statusData?.map(s => [s.user_id, s.is_online]) || []);

      const friendsList: Friend[] = friendsData.map(f => {
        const friendUserId = f.user_id === currentUserId ? f.friend_id : f.user_id;
        const profile = profiles?.find(p => p.user_id === friendUserId);
        const isOnline = statusMap.get(friendUserId) ?? false;

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

  const loadBrowseUsers = useCallback(async () => {
    setBrowseLoading(true);
    try {
      const profileTable = userGender === "male" ? "female_profiles" : "male_profiles";
      
      // Get opposite gender profiles
      const { data: profiles, error } = await supabase
        .from(profileTable)
        .select("user_id, full_name, photo_url, age, country, primary_language")
        .neq("user_id", currentUserId)
        .eq("account_status", "active")
        .limit(200);

      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        setBrowseUsers([]);
        return;
      }

      const userIds = profiles.map(p => p.user_id);

      // Get online status
      const { data: statusData } = await supabase
        .from("user_status")
        .select("user_id, is_online")
        .in("user_id", userIds);

      // Get existing friends
      const { data: existingFriends } = await supabase
        .from("user_friends")
        .select("user_id, friend_id")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .eq("status", "accepted");

      // Get existing blocks
      const { data: existingBlocks } = await supabase
        .from("user_blocks")
        .select("blocked_user_id")
        .eq("blocked_by", currentUserId);

      const statusMap = new Map(statusData?.map(s => [s.user_id, s.is_online]) || []);
      const friendIds = new Set(
        existingFriends?.map(f => f.user_id === currentUserId ? f.friend_id : f.user_id) || []
      );
      const blockedIds = new Set(existingBlocks?.map(b => b.blocked_user_id) || []);

      const browseList: BrowseUser[] = profiles.map(p => ({
        userId: p.user_id,
        fullName: p.full_name || "Unknown",
        photoUrl: p.photo_url,
        age: p.age,
        country: p.country,
        primaryLanguage: p.primary_language,
        isOnline: statusMap.get(p.user_id) ?? false,
        isFriend: friendIds.has(p.user_id),
        isBlocked: blockedIds.has(p.user_id),
      }));

      // Sort: online first, then by name
      browseList.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return a.fullName.localeCompare(b.fullName);
      });

      setBrowseUsers(browseList);
    } catch (error) {
      console.error("Error loading browse users:", error);
    } finally {
      setBrowseLoading(false);
    }
  }, [currentUserId, userGender]);

  const handleAddFriend = async (targetUser: BrowseUser) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("user_friends")
        .insert({
          user_id: currentUserId,
          friend_id: targetUser.userId,
          status: "accepted",
          created_by: currentUserId
        });

      if (error) throw error;

      // Update local state
      setBrowseUsers(prev => prev.map(u => 
        u.userId === targetUser.userId ? { ...u, isFriend: true } : u
      ));

      // Refresh friends list
      await loadFriends();

      toast({
        title: "Friend Added",
        description: `${targetUser.fullName} has been added to your friends`
      });
    } catch (error: any) {
      console.error("Error adding friend:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add friend",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedBrowseUser) return;
    setActionLoading(true);
    try {
      // Remove friendship first if exists
      await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${selectedBrowseUser.userId}),and(user_id.eq.${selectedBrowseUser.userId},friend_id.eq.${currentUserId})`);

      // Add block
      const { error } = await supabase
        .from("user_blocks")
        .insert({
          blocked_by: currentUserId,
          blocked_user_id: selectedBrowseUser.userId,
          block_type: "manual"
        });

      if (error) throw error;

      // Update local state
      setBrowseUsers(prev => prev.map(u => 
        u.userId === selectedBrowseUser.userId ? { ...u, isBlocked: true, isFriend: false } : u
      ));

      // Refresh lists
      await Promise.all([loadFriends(), loadBlockedUsers()]);

      setShowBlockDialog(false);
      toast({
        title: "User Blocked",
        description: `${selectedBrowseUser.fullName} has been blocked`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
      setSelectedBrowseUser(null);
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
      
      // Update browse list too
      setBrowseUsers(prev => prev.map(u => 
        u.userId === selectedFriend.friendId ? { ...u, isFriend: false } : u
      ));

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
      
      // Update browse list too
      setBrowseUsers(prev => prev.map(u => 
        u.userId === selectedBlocked.blockedUserId ? { ...u, isBlocked: false } : u
      ));

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

  const handleStartChat = async (friend: Friend) => {
    if (!friend.isOnline) {
      toast({
        title: "User Offline",
        description: `${friend.fullName} is currently offline`,
        variant: "destructive"
      });
      return;
    }

    setChatStarting(friend.friendId);
    try {
      if (onStartChat) {
        onStartChat(friend.friendId, friend.fullName);
        onClose();
        return;
      }

      // Fallback: use chat-manager edge function
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "start_chat",
          user_id: currentUserId,
          ...(userGender === "male" 
            ? { woman_user_id: friend.friendId }
            : { man_user_id: friend.friendId }
          )
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Chat Started",
          description: `Chat with ${friend.fullName} has been started`
        });
        onClose();
      } else {
        throw new Error(data?.error || "Failed to start chat");
      }
    } catch (error: any) {
      console.error("Error starting chat:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to start chat",
        variant: "destructive"
      });
    } finally {
      setChatStarting(null);
    }
  };

  // Filter browse users by search query
  const filteredBrowseUsers = browseUsers.filter(u => 
    !searchQuery || u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.primaryLanguage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Tabs defaultValue="friends" className="h-full flex flex-col" onValueChange={(val) => {
          if (val === "browse" && browseUsers.length === 0) {
            loadBrowseUsers();
          }
        }}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="friends" className="gap-1 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="blocked" className="gap-1 text-xs sm:text-sm">
              <UserX className="h-4 w-4" />
              Blocked ({blockedUsers.length})
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-1 text-xs sm:text-sm">
              <Search className="h-4 w-4" />
              Browse
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
                      <p className="text-xs mt-1">Go to Browse tab to find and add friends</p>
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
                                friend.isOnline ? "bg-online" : "bg-muted-foreground"
                              )} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{friend.fullName}</p>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  friend.isOnline ? "border-online/30 text-online" : ""
                                )}
                              >
                                {friend.isOnline ? "Online" : "Offline"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Chat button - only for online friends */}
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-1.5"
                              disabled={!friend.isOnline || chatStarting === friend.friendId}
                              onClick={() => handleStartChat(friend)}
                            >
                              {chatStarting === friend.friendId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MessageCircle className="h-4 w-4" />
                              )}
                              Chat
                            </Button>
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
                            </Button>
                          </div>
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

          {/* Browse Tab */}
          <TabsContent value="browse" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader className="pb-2 space-y-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Browse {userGender === "male" ? "Women" : "Men"}
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, country, or language..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  {browseLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredBrowseUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm">No users found</p>
                      {searchQuery && <p className="text-xs mt-1">Try a different search term</p>}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredBrowseUsers.map((user) => (
                        <div
                          key={user.userId}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-shrink-0">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={user.photoUrl || undefined} />
                                <AvatarFallback className="bg-primary/10">
                                  {user.fullName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className={cn(
                                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                                user.isOnline ? "bg-online" : "bg-muted-foreground"
                              )} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{user.fullName}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {user.age && (
                                  <span className="text-xs text-muted-foreground">{user.age}y</span>
                                )}
                                {user.country && (
                                  <span className="text-xs text-muted-foreground truncate">{user.country}</span>
                                )}
                                {user.primaryLanguage && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {user.primaryLanguage}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {user.isBlocked ? (
                              <Badge variant="destructive" className="text-xs">Blocked</Badge>
                            ) : user.isFriend ? (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Heart className="h-3 w-3" />
                                Friend
                              </Badge>
                            ) : (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="gap-1 text-xs h-8"
                                  disabled={actionLoading}
                                  onClick={() => handleAddFriend(user)}
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Add
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs h-8 text-destructive hover:bg-destructive/10"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    setSelectedBrowseUser(user);
                                    setShowBlockDialog(true);
                                  }}
                                >
                                  <ShieldBan className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
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

      {/* Block Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {selectedBrowseUser?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBrowseUser?.fullName} will not be able to message or call you. Any existing friendship will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBlockUser} 
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FriendsBlockedPanel;

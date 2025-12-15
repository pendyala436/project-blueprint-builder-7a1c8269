import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BlockedUser {
  id: string;
  blockedUserId: string;
  blockedName: string;
  blockedPhoto: string | null;
  blockedAt: string;
}

interface Friend {
  id: string;
  friendId: string;
  friendName: string;
  friendPhoto: string | null;
  status: string;
  isOnline: boolean;
  addedAt: string;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto: string | null;
  requestedAt: string;
}

export const useUserRelationships = (userId: string | null) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadRelationships = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Load blocked users (using correct column names: blocked_by, blocked_user_id)
      const { data: blocksData } = await supabase
        .from("user_blocks")
        .select("id, blocked_user_id, created_at")
        .eq("blocked_by", userId);

      if (blocksData && blocksData.length > 0) {
        const blockedIds = blocksData.map(b => b.blocked_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", blockedIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setBlockedUsers(blocksData.map(block => ({
          id: block.id,
          blockedUserId: block.blocked_user_id,
          blockedName: profileMap.get(block.blocked_user_id)?.full_name || "Unknown",
          blockedPhoto: profileMap.get(block.blocked_user_id)?.photo_url || null,
          blockedAt: block.created_at
        })));
      } else {
        setBlockedUsers([]);
      }

      // Load friends (accepted) - using correct columns
      const { data: friendsData } = await supabase
        .from("user_friends")
        .select("id, user_id, friend_id, status, created_at")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq("status", "accepted");

      if (friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map(f => 
          f.user_id === userId ? f.friend_id : f.user_id
        );

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", friendIds);

        const { data: onlineStatus } = await supabase
          .from("user_status")
          .select("user_id, is_online")
          .in("user_id", friendIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const onlineMap = new Map(onlineStatus?.map(s => [s.user_id, s.is_online]) || []);

        setFriends(friendsData.map(friend => {
          const friendId = friend.user_id === userId ? friend.friend_id : friend.user_id;
          return {
            id: friend.id,
            friendId,
            friendName: profileMap.get(friendId)?.full_name || "Unknown",
            friendPhoto: profileMap.get(friendId)?.photo_url || null,
            status: friend.status,
            isOnline: onlineMap.get(friendId) || false,
            addedAt: friend.created_at
          };
        }));
      } else {
        setFriends([]);
      }

      // Load pending friend requests (received)
      const { data: pendingData } = await supabase
        .from("user_friends")
        .select("id, user_id, created_at")
        .eq("friend_id", userId)
        .eq("status", "pending");

      if (pendingData && pendingData.length > 0) {
        const requesterIds = pendingData.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", requesterIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setPendingRequests(pendingData.map(req => ({
          id: req.id,
          fromUserId: req.user_id,
          fromUserName: profileMap.get(req.user_id)?.full_name || "Unknown",
          fromUserPhoto: profileMap.get(req.user_id)?.photo_url || null,
          requestedAt: req.created_at
        })));
      } else {
        setPendingRequests([]);
      }

      // Load sent requests
      const { data: sentData } = await supabase
        .from("user_friends")
        .select("friend_id")
        .eq("user_id", userId)
        .eq("status", "pending");

      setSentRequests(sentData?.map(s => s.friend_id) || []);

    } catch (error) {
      console.error("Error loading relationships:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-relationships-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_blocks' },
        () => loadRelationships()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_friends' },
        () => loadRelationships()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadRelationships]);

  const isBlocked = useCallback((targetUserId: string) => {
    return blockedUsers.some(b => b.blockedUserId === targetUserId);
  }, [blockedUsers]);

  const isFriend = useCallback((targetUserId: string) => {
    return friends.some(f => f.friendId === targetUserId);
  }, [friends]);

  const hasPendingRequest = useCallback((targetUserId: string) => {
    return pendingRequests.some(r => r.fromUserId === targetUserId);
  }, [pendingRequests]);

  const hasSentRequest = useCallback((targetUserId: string) => {
    return sentRequests.includes(targetUserId);
  }, [sentRequests]);

  return {
    blockedUsers,
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    isBlocked,
    isFriend,
    hasPendingRequest,
    hasSentRequest,
    refresh: loadRelationships
  };
};

export default useUserRelationships;

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Lock, Unlock, Gift, MessageCircle, Video, Users, Radio, Clock } from 'lucide-react';
import { GroupChatWindow } from './GroupChatWindow';
import { PrivateGroupCallWindow } from './PrivateGroupCallWindow';
import { MAX_PARTICIPANTS, MAX_DURATION_MINUTES } from '@/hooks/usePrivateGroupCall';

interface PrivateGroup {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  min_gift_amount: number;
  access_type: string;
  is_active: boolean;
  is_live: boolean;
  stream_id: string | null;
  participant_count: number;
  owner_name?: string;
  owner_photo?: string;
}

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

interface AvailableGroupsSectionProps {
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
}

export function AvailableGroupsSection({ currentUserId, userName, userPhoto }: AvailableGroupsSectionProps) {
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [myMemberships, setMyMemberships] = useState<Map<string, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<PrivateGroup | null>(null);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [activeGroupChat, setActiveGroupChat] = useState<PrivateGroup | null>(null);
  const [activeGroupVideo, setActiveGroupVideo] = useState<PrivateGroup | null>(null);

  useEffect(() => {
    fetchGroups();
    fetchMyMemberships();
    fetchWalletBalance();

    // Subscribe to realtime updates - including owner online status
    const channel = supabase
      .channel('available-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_groups' }, () => {
        fetchGroups();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_memberships' }, () => {
        fetchMyMemberships();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_status' }, () => {
        // Re-fetch groups when any user's online status changes (owner might go offline)
        fetchGroups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchGroups = async () => {
    try {
      // Step 1: Get all live groups
      const { data, error } = await supabase
        .from('private_groups')
        .select('*')
        .eq('is_active', true)
        .eq('is_live', true)
        .neq('owner_id', currentUserId)
        .order('participant_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const ownerIds = [...new Set(data.map(g => g.owner_id))];
        
        // Step 2: Check which owners are ONLINE (strict mode)
        const { data: onlineOwners } = await supabase
          .from('user_status')
          .select('user_id')
          .in('user_id', ownerIds)
          .eq('is_online', true);
        
        const onlineOwnerSet = new Set(onlineOwners?.map(o => o.user_id) || []);
        
        // Step 3: Filter groups to only those with ONLINE owners
        const liveGroups = data.filter(g => onlineOwnerSet.has(g.owner_id));
        
        if (liveGroups.length === 0) {
          setGroups([]);
          setIsLoading(false);
          return;
        }
        
        // Step 4: Fetch owner profiles using secure function
        const liveOwnerIds = [...new Set(liveGroups.map(g => g.owner_id))];
        const profilePromises = liveOwnerIds.map(async (ownerId) => {
          const { data: profileData } = await supabase.rpc('get_group_owner_profile', {
            owner_user_id: ownerId
          });
          return profileData?.[0] || null;
        });
        
        const profileResults = await Promise.all(profilePromises);
        const profileMap = new Map(
          profileResults
            .filter(p => p !== null)
            .map(p => [p.user_id, p])
        );
        
        const enrichedGroups = liveGroups.map(group => ({
          ...group,
          owner_name: profileMap.get(group.owner_id)?.full_name || 'Anonymous',
          owner_photo: profileMap.get(group.owner_id)?.photo_url
        }));
        
        setGroups(enrichedGroups);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select('group_id, has_access')
        .eq('user_id', currentUserId)
        .eq('has_access', true);

      if (error) throw error;

      const membershipMap = new Map<string, boolean>();
      data?.forEach(m => membershipMap.set(m.group_id, m.has_access));
      setMyMemberships(membershipMap);
    } catch (error) {
      console.error('Error fetching memberships:', error);
    }
  };

  const fetchWalletBalance = async () => {
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', currentUserId)
      .single();
    
    if (data) setWalletBalance(data.balance);
  };

  const fetchGifts = async (minAmount: number) => {
    const { data } = await supabase
      .from('gifts')
      .select('id, name, emoji, price')
      .eq('is_active', true)
      .gte('price', minAmount)
      .order('price', { ascending: true });

    setGifts(data || []);
  };

  const handleUnlockGroup = async (group: PrivateGroup) => {
    // Free entry - no gift required
    await handleFreeJoin(group);
  };

  const handleFreeJoin = async (group: PrivateGroup) => {
    try {
      const { error } = await supabase
        .from('group_memberships')
        .upsert({
          group_id: group.id,
          user_id: currentUserId,
          has_access: true,
          gift_amount_paid: 0
        }, { onConflict: 'group_id,user_id' });

      if (error) throw error;

      // Update participant count
      await supabase
        .from('private_groups')
        .update({ participant_count: group.participant_count + 1 })
        .eq('id', group.id);

      toast.success(`You joined ${group.name}!`);
      fetchMyMemberships();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group');
    }
  };

  const handleSendGift = async (gift: GiftItem) => {
    if (!selectedGroup) return;
    
    if (walletBalance < gift.price) {
      toast.error('Insufficient balance. Please recharge your wallet.');
      return;
    }

    setIsSendingGift(true);
    try {
      const { data, error } = await supabase.rpc('process_group_gift', {
        p_sender_id: currentUserId,
        p_group_id: selectedGroup.id,
        p_gift_id: gift.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; gift_emoji?: string; gift_name?: string; women_share?: number; admin_share?: number };
      
      if (result.success) {
        toast.success(`Gift sent! You now have access to ${selectedGroup.name}`, {
          description: `${result.gift_emoji} ${result.gift_name} - ₹${gift.price} (50% to creator, 50% to admin)`
        });
        setShowGiftDialog(false);
        fetchMyMemberships();
        fetchWalletBalance();
      } else {
        toast.error(result.error || 'Failed to send gift');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send gift');
    } finally {
      setIsSendingGift(false);
    }
  };

  const hasAccess = (groupId: string) => myMemberships.get(groupId) === true;

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Private Rooms
        </h3>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No private rooms available</p>
            <p className="text-sm">Check back later!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const unlocked = hasAccess(group.id);
            return (
              <Card key={group.id} className="relative overflow-hidden">
                {group.is_live && (
                  <Badge variant="destructive" className="absolute top-2 right-2 gap-1 z-10">
                    <Radio className="h-3 w-3 animate-pulse" />
                    LIVE
                  </Badge>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={group.owner_photo || undefined} />
                      <AvatarFallback>{group.owner_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{group.owner_name}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={unlocked ? 'default' : 'secondary'} className="gap-1">
                      {unlocked ? (
                        <>
                          <Unlock className="h-3 w-3" />
                          Joined
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3 w-3" />
                          Free Entry
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
                      {group.participant_count}/{MAX_PARTICIPANTS}
                    </Badge>
                    {group.is_live && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {MAX_DURATION_MINUTES}min
                      </Badge>
                    )}
                  </div>

                  {unlocked ? (
                    <div className="flex gap-2 pt-2">
                      {(group.access_type === 'chat' || group.access_type === 'both') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => setActiveGroupChat(group)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Chat
                        </Button>
                      )}
                      {(group.access_type === 'video' || group.access_type === 'both') && (
                        <Button 
                          size="sm" 
                          variant="default"
                          className="flex-1 gap-2"
                          onClick={() => setActiveGroupVideo(group)}
                          disabled={!group.is_live || group.participant_count >= MAX_PARTICIPANTS}
                        >
                          <Video className="h-4 w-4" />
                          {group.participant_count >= MAX_PARTICIPANTS ? 'Full' : group.is_live ? 'Join Call' : 'Offline'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button 
                      className="w-full gap-2" 
                      onClick={() => handleUnlockGroup(group)}
                    >
                      <Users className="h-4 w-4" />
                      Join (₹4/min)
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Gift/Tip Selection Dialog - kept for backward compat but no longer used for entry */}

      {/* Group Chat Window */}
      {activeGroupChat && (
        <GroupChatWindow
          group={activeGroupChat}
          currentUserId={currentUserId}
          userName={userName}
          userPhoto={userPhoto}
          onClose={() => setActiveGroupChat(null)}
          isOwner={false}
        />
      )}

      {/* Private Group Call Window (Host-only video, participants audio-only) */}
      {activeGroupVideo && (
        <PrivateGroupCallWindow
          group={{
            ...activeGroupVideo,
            owner_id: activeGroupVideo.owner_id
          }}
          currentUserId={currentUserId}
          userName={userName}
          userPhoto={userPhoto}
          onClose={() => setActiveGroupVideo(null)}
          isOwner={false}
        />
      )}
    </div>
  );
}

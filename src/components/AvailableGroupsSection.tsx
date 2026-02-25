import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Users, Video, Radio, Loader2, RefreshCw } from 'lucide-react';
import { PrivateGroupCallWindow } from './PrivateGroupCallWindow';
import { MAX_PARTICIPANTS } from '@/hooks/usePrivateGroupCall';

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
  current_host_id: string | null;
  current_host_name: string | null;
  owner_name?: string;
  owner_photo?: string;
}

interface AvailableGroupsSectionProps {
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
}

const FLOWER_EMOJIS: Record<string, string> = {
  Rose: '🌹',
  Lily: '🌸',
  Jasmine: '🌼',
  Orchid: '🌺',
};

const MIN_BALANCE_MINUTES = 5;
const RATE_PER_MINUTE = 4; // ₹4/min

export function AvailableGroupsSection({ currentUserId, userName, userPhoto }: AvailableGroupsSectionProps) {
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupVideo, setActiveGroupVideo] = useState<PrivateGroup | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    fetchGroups();
    fetchWalletBalance();

    const channel = supabase
      .channel('available-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_groups' }, (payload) => {
        // If a group we're watching goes offline, auto-close
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          if (!updated.is_live && activeGroupVideo?.id === updated.id) {
            toast.info('Host ended the live session');
            setActiveGroupVideo(null);
          }
        }
        fetchGroups();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${currentUserId}` }, () => {
        fetchWalletBalance();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeGroupVideo?.id]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('private_groups')
        .select('*')
        .eq('is_active', true)
        .eq('is_live', true)
        .not('current_host_id', 'is', null)
        .order('name', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const enrichedGroups = data.map(group => ({
          ...group,
          owner_id: group.current_host_id || group.owner_id,
          owner_name: group.current_host_name || 'Host',
        }));
        setGroups(enrichedGroups as PrivateGroup[]);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
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

  const handleJoinGroup = async (group: PrivateGroup) => {
    const minBalance = RATE_PER_MINUTE * MIN_BALANCE_MINUTES; // ₹20

    if (walletBalance < minBalance) {
      toast.error(`Insufficient balance. You need at least ₹${minBalance} (${MIN_BALANCE_MINUTES} minutes) to join.`);
      return;
    }

    if (group.participant_count >= MAX_PARTICIPANTS) {
      toast.error('This group is full (max 50 participants)');
      return;
    }

    setJoiningGroupId(group.id);
    try {
      // Add membership
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

      // Open call window directly
      setActiveGroupVideo(group);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleLeaveGroup = () => {
    if (activeGroupVideo) {
      // Decrement participant count
      supabase
        .from('private_groups')
        .update({ participant_count: Math.max(0, activeGroupVideo.participant_count - 1) })
        .eq('id', activeGroupVideo.id)
        .then(() => fetchGroups());

      // Remove membership
      supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', activeGroupVideo.id)
        .eq('user_id', currentUserId);
    }
    setActiveGroupVideo(null);
  };

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No private groups live</p>
          <p className="text-sm">Check back later when a host goes live!</p>
        </CardContent>
      </Card>
    );
  }

  const minBalance = RATE_PER_MINUTE * MIN_BALANCE_MINUTES;
  const hasEnoughBalance = walletBalance >= minBalance;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Private Groups
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIsLoading(true); fetchGroups(); fetchWalletBalance(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="text-xs">
            {groups.length} Live
          </Badge>
        </div>
      </div>

      {!hasEnoughBalance && (
        <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive border border-destructive/20">
          <p className="font-medium">⚠️ Insufficient balance</p>
          <p className="text-xs mt-1">You need at least ₹{minBalance} to join a private room. Please recharge your wallet.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          const isFull = group.participant_count >= MAX_PARTICIPANTS;
          const isJoining = joiningGroupId === group.id;

          return (
            <Card key={group.id} className="relative overflow-hidden border-destructive/30">
              <Badge variant="destructive" className="absolute top-2 right-2 gap-1 z-10">
                <Radio className="h-3 w-3 animate-pulse" />
                LIVE
              </Badge>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{FLOWER_EMOJIS[group.name] || '🌸'}</div>
                  <div>
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Host: {group.current_host_name || group.owner_name}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {group.participant_count}/{MAX_PARTICIPANTS}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    💰 ₹{RATE_PER_MINUTE}/min
                  </Badge>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={() => handleJoinGroup(group)}
                  disabled={!hasEnoughBalance || isFull || isJoining}
                >
                  {isJoining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  {isFull ? 'Full' : !hasEnoughBalance ? `Need ₹${minBalance}+` : isJoining ? 'Joining...' : 'Join Call'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Private Group Call Window */}
      {activeGroupVideo && (
        <PrivateGroupCallWindow
          group={{
            ...activeGroupVideo,
            owner_id: activeGroupVideo.current_host_id || activeGroupVideo.owner_id,
          }}
          currentUserId={currentUserId}
          userName={userName}
          userPhoto={userPhoto}
          onClose={handleLeaveGroup}
          isOwner={false}
        />
      )}
    </div>
  );
}

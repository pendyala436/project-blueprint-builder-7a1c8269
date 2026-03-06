import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Video, MessageCircle, LayoutGrid, DollarSign, Radio, Square, RefreshCw } from 'lucide-react';
import { PrivateGroupCallWindow } from './PrivateGroupCallWindow';
import { MAX_PARTICIPANTS } from '@/hooks/usePrivateGroupCall';

const TIP_INFO = 'Men are charged ₹4/min. Women earn ₹2/min per man. Tips are optional — 50% reaches host.';

const FLOWER_EMOJIS: Record<string, string> = {
  Rose: '🌹',
  Lily: '🌸',
  Jasmine: '🌼',
  Orchid: '🌺',
  Sunflower: '🌻',
  Tulip: '🌷',
  Lotus: '🪷',
  Daisy: '🌼',
  Lavender: '💜',
  Marigold: '🏵️',
};

interface PrivateGroup {
  id: string;
  name: string;
  description: string | null;
  min_gift_amount: number;
  access_type: string;
  is_active: boolean;
  is_live: boolean;
  stream_id: string | null;
  participant_count: number;
  created_at: string;
  current_host_id: string | null;
  current_host_name: string | null;
  owner_id: string;
  owner_language: string | null;
  updated_at: string;
}

interface PrivateGroupsSectionProps {
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
}

export function PrivateGroupsSection({ currentUserId, userName, userPhoto }: PrivateGroupsSectionProps) {
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<PrivateGroup | null>(null);
  const [goingLive, setGoingLive] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();

    const channel = supabase
      .channel('private-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_groups' }, () => {
        fetchGroups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('private_groups')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setGroups((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoLive = async (group: PrivateGroup) => {
    if (group.is_live) {
      toast.error('This group is already live');
      return;
    }

    // Check if user is already live in another group
    const alreadyLive = groups.find(g => g.current_host_id === currentUserId && g.is_live);
    if (alreadyLive) {
      toast.error(`You are already live in ${alreadyLive.name}. Stop that first.`);
      return;
    }

    setGoingLive(group.id);
    try {
      // Add owner as member first
      await supabase.from('group_memberships').upsert({
        group_id: group.id,
        user_id: currentUserId,
        has_access: true,
        gift_amount_paid: 0,
      }, { onConflict: 'group_id,user_id' });

      // Just open the call window - the hook's goLive() will handle
      // all DB updates (is_live, current_host_id, signaling, media, etc.)
      // This prevents the race condition of double DB updates.
      const updatedGroup = { ...group, participant_count: 1 };
      setActiveGroup(updatedGroup);
    } catch (error: any) {
      toast.error(error.message || 'Failed to go live');
    } finally {
      setGoingLive(null);
    }
  };

  const handleStopLive = async (group: PrivateGroup) => {
    try {
      // Update DB to mark group as not live
      const { error } = await supabase
        .from('private_groups')
        .update({
          is_live: false,
          stream_id: null,
          current_host_id: null,
          current_host_name: null,
          participant_count: 0,
        })
        .eq('id', group.id);

      if (error) throw error;

      // Clean up memberships
      await supabase.from('group_memberships').delete().eq('group_id', group.id);

      // Restore host availability
      const [{ count: chatCount }, { count: videoCount }] = await Promise.all([
        supabase.from('active_chat_sessions').select('*', { count: 'exact', head: true })
          .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`).eq('status', 'active'),
        supabase.from('video_call_sessions').select('*', { count: 'exact', head: true })
          .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`).eq('status', 'active'),
      ]);
      
      const totalVideo = videoCount || 0;
      const totalChats = chatCount || 0;
      const newStatus = totalVideo > 0 ? 'busy' : totalChats >= 3 ? 'busy' : 'online';
      
      await Promise.all([
        supabase.from('user_status')
          .update({ status_text: newStatus, last_seen: new Date().toISOString() })
          .eq('user_id', currentUserId),
        supabase.from('women_availability')
          .update({ 
            is_available: totalChats < 3 && totalVideo === 0,
            is_available_for_calls: totalVideo === 0,
          })
          .eq('user_id', currentUserId),
      ]);

      toast.success(`Stopped live in ${group.name}`);
      setActiveGroup(null);
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop');
    }
  };

  // Auto-fix stale groups that are marked live but have no host
  useEffect(() => {
    const staleGroups = groups.filter(g => g.is_live && !g.current_host_id);
    staleGroups.forEach(async (g) => {
      await supabase.from('private_groups').update({
        is_live: false, stream_id: null, current_host_id: null, current_host_name: null, participant_count: 0,
      }).eq('id', g.id);
    });
    if (staleGroups.length > 0) fetchGroups();
  }, [groups]);

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  const isHostOfAny = groups.some(g => g.current_host_id === currentUserId && g.is_live);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Private Groups
        </h3>
        <Badge variant="outline" className="text-xs">
          {groups.filter(g => g.is_live).length}/{groups.length} Live
        </Badge>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIsLoading(true); fetchGroups(); }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">💰 How it works</p>
        <p>{TIP_INFO}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const isMyHost = group.current_host_id === currentUserId;
          // A group is truly live only if it has both is_live flag AND a host
          const isLive = group.is_live && !!group.current_host_id;
          const canGoLive = !isLive && !isHostOfAny;

          return (
            <Card key={group.id} className={`relative ${isLive ? 'border-destructive/50 shadow-md' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-xl">{FLOWER_EMOJIS[group.name] || '🌸'}</span>
                    {group.name}
                  </CardTitle>
                  {isLive && (
                    <Badge variant="destructive" className="gap-1 animate-pulse">
                      <Radio className="h-3 w-3" />
                      LIVE
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.description && (
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                )}

                {isLive && group.current_host_name && (
                  <p className="text-sm font-medium text-primary">
                    Host: {isMyHost ? 'You' : group.current_host_name}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <DollarSign className="h-3 w-3" />
                    ₹4/min per man
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {group.participant_count}/{MAX_PARTICIPANTS}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    ⏱️ No time limit
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <MessageCircle className="h-3 w-3" /> Chat
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Video className="h-3 w-3" /> Video
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  {isMyHost && isLive ? (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 gap-2"
                        onClick={() => setActiveGroup(group)}
                      >
                        <LayoutGrid className="h-4 w-4" />
                        Open Group
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => handleStopLive(group)}
                      >
                        <Square className="h-4 w-4" />
                        Stop
                      </Button>
                    </>
                  ) : canGoLive ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 gap-2"
                      disabled={goingLive === group.id}
                      onClick={() => handleGoLive(group)}
                    >
                      <Radio className="h-4 w-4" />
                      {goingLive === group.id ? 'Going Live...' : 'Go Live'}
                    </Button>
                  ) : isLive && !isMyHost ? (
                    <p className="text-sm text-muted-foreground italic">
                      Currently hosted by {group.current_host_name}
                    </p>
                  ) : isHostOfAny && !isMyHost ? (
                    <p className="text-sm text-muted-foreground italic">
                      Stop your current live first
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeGroup && (
        <PrivateGroupCallWindow
          group={activeGroup}
          currentUserId={currentUserId}
          userName={userName}
          userPhoto={userPhoto}
          onClose={() => {
            // Capture group ref before state changes clear it
            const groupToStop = activeGroup;
            setActiveGroup(null);
            if (groupToStop) {
              handleStopLive(groupToStop);
            }
          }}
          isOwner={true}
        />
      )}
    </div>
  );
}

import { classifyError, ERROR_MESSAGES, logError } from "@/lib/errors";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Video, MessageCircle, Radio, Square, RefreshCw, ChevronRight } from 'lucide-react';
import { PrivateGroupCallWindow } from './PrivateGroupCallWindow';
import { MAX_PARTICIPANTS } from '@/hooks/usePrivateGroupCall';
import { cn } from '@/lib/utils';

const TIP_INFO = 'Tips are optional — 50% reaches host.';

const FLOWER_EMOJIS: Record<string, string> = {
  Rose: '🌹', Lily: '🌸', Jasmine: '🌼', Orchid: '🌺', Sunflower: '🌻',
  Tulip: '🌷', Lotus: '🪷', Daisy: '🌼', Lavender: '💜', Marigold: '🏵️',
};

interface PrivateGroup {
  id: string; name: string; description: string | null; min_gift_amount: number;
  access_type: string; is_active: boolean; is_live: boolean; stream_id: string | null;
  participant_count: number; created_at: string; current_host_id: string | null;
  current_host_name: string | null; owner_id: string; owner_language: string | null;
  updated_at: string;
}

interface PrivateGroupsSectionProps {
  currentUserId: string; userName: string; userPhoto: string | null;
}

export function PrivateGroupsSection({ currentUserId, userName, userPhoto }: PrivateGroupsSectionProps) {
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<PrivateGroup | null>(null);
  const [activeGroupStream, setActiveGroupStream] = useState<MediaStream | null>(null);
  const [goingLive, setGoingLive] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
    const channel = supabase
      .channel('private-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_groups' }, () => { fetchGroups(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('private_groups').select('*').eq('is_active', true)
        .order('is_live', { ascending: false }).order('name', { ascending: true });
      if (error) throw error;
      setGroups((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Groups unavailable', { description: 'Unable to load your groups. Please refresh the page.' });
    } finally { setIsLoading(false); }
  };

  const handleGoLive = async (group: PrivateGroup) => {
    const latestGroup = groups.find(g => g.id === group.id);
    const groupData = latestGroup || group;
    if (groupData.is_live && !!groupData.current_host_id) { toast.error('This group is already live'); return; }
    const alreadyLive = groups.find(g => g.current_host_id === currentUserId && g.is_live);
    if (alreadyLive) { toast.error(`You are already live in ${alreadyLive.name}. Stop that first.`); return; }
    setGoingLive(group.id);
    let preStream: MediaStream | null = null;
    try {
      preStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (mediaErr) {
      console.error('[PrivateGroups] Pre-acquire media failed:', mediaErr);
      toast.error('Could not access camera/microphone. Please allow access.');
      setGoingLive(null); return;
    }
    try {
      if (group.access_type === 'gift' && group.min_gift_amount > 0) {
        const { data: existingMembership } = await supabase
          .from('group_memberships').select('gift_amount_paid')
          .eq('group_id', group.id).eq('user_id', currentUserId).maybeSingle();
        if (group.owner_id !== currentUserId) {
          const paid = existingMembership?.gift_amount_paid ?? 0;
          if (paid < group.min_gift_amount) {
            toast.error(`Gift requirement not met. Minimum: ₹${group.min_gift_amount}`);
            preStream.getTracks().forEach(t => t.stop()); setGoingLive(null); return;
          }
        }
      }
      await supabase.from('group_memberships').upsert({
        group_id: group.id, user_id: currentUserId, has_access: true, gift_amount_paid: 0,
      }, { onConflict: 'group_id,user_id' });
      const updatedGroup = { ...groupData, participant_count: 1, is_live: false, current_host_id: null };
      setActiveGroupStream(preStream);
      setActiveGroup(updatedGroup);
    } catch (error: any) {
      preStream.getTracks().forEach(t => t.stop());
      toast.error('Unable to go live', { description: classifyError(error, 'start the live stream').message });
    } finally { setGoingLive(null); }
  };

  const handleStopLive = async (group: PrivateGroup) => {
    setGroups(prev => prev.map(g =>
      g.id === group.id ? { ...g, is_live: false, stream_id: null, current_host_id: null, current_host_name: null, participant_count: 0 } : g
    ));
    if (activeGroupStream) { activeGroupStream.getTracks().forEach(t => t.stop()); setActiveGroupStream(null); }
    try {
      const { error: stopError } = await supabase.rpc('stop_live_safe', { p_group_id: group.id });
      if (stopError) throw stopError;
      const [{ count: chatCount }, { count: videoCount }] = await Promise.all([
        supabase.from('active_chat_sessions').select('*', { count: 'exact', head: true })
          .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`).eq('status', 'active'),
        supabase.from('video_call_sessions').select('*', { count: 'exact', head: true })
          .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`).eq('status', 'active'),
      ]);
      const totalVideo = videoCount || 0;
      const totalChats = chatCount || 0;
      const maxChats = 3;
      const newStatus = totalVideo > 0 ? 'busy' : totalChats >= maxChats ? 'busy' : 'online';
      await Promise.all([
        supabase.from('user_status').update({ status_text: newStatus, last_seen: new Date().toISOString() }).eq('user_id', currentUserId),
        supabase.from('women_availability').update({
          is_available: totalChats < maxChats && totalVideo === 0,
          is_available_for_calls: totalVideo === 0,
        }).eq('user_id', currentUserId),
      ]);
      toast.success(`Stopped live in ${group.name}`);
      fetchGroups();
    } catch (error: any) {
      toast.error('Unable to stop', { description: classifyError(error, 'stop the stream').message });
      fetchGroups();
    }
  };

  const staleFixedRef = useRef(false);
  useEffect(() => {
    if (staleFixedRef.current || groups.length === 0) return;
    const staleGroups = groups.filter(g => g.is_live && !g.current_host_id);
    if (staleGroups.length === 0) return;
    staleFixedRef.current = true;
    Promise.all(staleGroups.map(g =>
      supabase.from('private_groups').update({
        is_live: false, stream_id: null, current_host_id: null, current_host_name: null, participant_count: 0,
      }).eq('id', g.id)
    )).then(() => fetchGroups());
  }, [groups]);

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted/30 rounded-lg" />;
  }

  const isHostOfAny = groups.some(g => g.current_host_id === currentUserId && g.is_live);
  const liveGroups = groups.filter(g => g.is_live && !!g.current_host_id);
  const offlineGroups = groups.filter(g => !(g.is_live && !!g.current_host_id));

  return (
    <div className="space-y-3">
      {/* WhatsApp-style header */}
      <div className="flex items-center justify-between bg-[#075E54] text-white px-4 py-2.5 rounded-t-xl -mx-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Private Groups
        </h3>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/20 text-white border-0 text-[10px] h-5">
            {liveGroups.length} Live
          </Badge>
          <button onClick={() => { setIsLoading(true); fetchGroups(); }} className="hover:bg-white/10 rounded-full p-1.5 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tip info banner */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#DCF8C6] rounded-lg text-[11px] text-[#303030] border border-[#B2DFAB]">
        <span className="text-sm">💰</span>
        <span>{TIP_INFO}</span>
      </div>

      {/* Group list - WhatsApp chat-list style */}
      <div className="divide-y divide-border/50 bg-card rounded-xl overflow-hidden border border-border/60">
        {groups.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No groups available</p>
          </div>
        )}
        {groups.map((group) => {
          const isMyHost = group.current_host_id === currentUserId;
          const isLive = group.is_live && !!group.current_host_id;
          const canGoLive = !isLive && !isHostOfAny;

          return (
            <div
              key={group.id}
              className={cn(
                "flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40",
                isLive && "bg-[#DCF8C6]/20"
              )}
            >
              {/* Flower avatar */}
              <div className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0",
                isLive ? "bg-[#128C7E]/10 ring-2 ring-[#25D366]" : "bg-muted"
              )}>
                {FLOWER_EMOJIS[group.name] || '🌸'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-foreground truncate">{group.name}</span>
                  {isLive && (
                    <Badge className="bg-[#25D366] text-white text-[9px] h-4 px-1.5 border-0 gap-0.5 shrink-0">
                      <Radio className="h-2 w-2 animate-pulse" /> LIVE
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {isLive && group.current_host_name && (
                    <span className="text-xs text-[#128C7E] font-medium truncate">
                      {isMyHost ? '📹 You are hosting' : `Host: ${group.current_host_name}`}
                    </span>
                  )}
                  {!isLive && (
                    <span className="text-xs text-muted-foreground">Offline</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Users className="h-2.5 w-2.5" /> {group.participant_count}/{MAX_PARTICIPANTS}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MessageCircle className="h-2.5 w-2.5" /> Chat
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Video className="h-2.5 w-2.5" /> Video
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="shrink-0">
                {isMyHost && isLive ? (
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      className="h-7 text-[11px] bg-[#128C7E] hover:bg-[#075E54] text-white gap-1"
                      onClick={() => setActiveGroup(group)}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => handleStopLive(group)}
                    >
                      <Square className="h-3 w-3" /> Stop
                    </Button>
                  </div>
                ) : canGoLive ? (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white gap-1 rounded-full px-4"
                    disabled={goingLive === group.id}
                    onClick={() => handleGoLive(group)}
                  >
                    <Radio className="h-3 w-3" />
                    {goingLive === group.id ? '...' : 'Go Live'}
                  </Button>
                ) : isLive && !isMyHost ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : isHostOfAny && !isMyHost ? (
                  <span className="text-[10px] text-muted-foreground italic">In use</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {activeGroup && (
        <PrivateGroupCallWindow
          group={activeGroup}
          currentUserId={currentUserId}
          userName={userName}
          userPhoto={userPhoto}
          preAcquiredStream={activeGroupStream}
          onClose={() => {
            const groupToStop = activeGroup;
            setActiveGroup(null);
            setActiveGroupStream(null);
            if (groupToStop) handleStopLive(groupToStop);
          }}
          isOwner={true}
        />
      )}
    </div>
  );
}

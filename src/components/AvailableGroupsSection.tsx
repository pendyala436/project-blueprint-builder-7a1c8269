import { classifyError, ERROR_MESSAGES, logError } from "@/lib/errors";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Video, Radio, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatPricing } from '@/hooks/useChatPricing';
import { PrivateGroupCallWindow } from './PrivateGroupCallWindow';
import { MAX_PARTICIPANTS } from '@/hooks/usePrivateGroupCall';

interface PrivateGroup {
  id: string; owner_id: string; name: string; description: string | null;
  min_gift_amount: number; access_type: string; is_active: boolean; is_live: boolean;
  stream_id: string | null; participant_count: number; current_host_id: string | null;
  current_host_name: string | null; owner_language: string | null; updated_at: string;
  created_at: string; owner_name?: string; owner_photo?: string;
}

interface AvailableGroupsSectionProps {
  currentUserId: string; userName: string; userPhoto: string | null;
}

const FLOWER_EMOJIS: Record<string, string> = {
  Rose: '🌹', Lily: '🌸', Jasmine: '🌼', Orchid: '🌺', Sunflower: '🌻',
  Tulip: '🌷', Lotus: '🪷', Daisy: '🌼', Lavender: '💜', Marigold: '🏵️',
};

const MIN_BALANCE_MINUTES = 5;

export function AvailableGroupsSection({ currentUserId, userName, userPhoto }: AvailableGroupsSectionProps) {
  const { pricing } = useChatPricing();
  const RATE_PER_MINUTE = pricing.groupCallRatePerMinute || 4;
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupVideo, setActiveGroupVideo] = useState<PrivateGroup | null>(null);
  const [activeGroupStream, setActiveGroupStream] = useState<MediaStream | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);

  const activeGroupVideoRef = useRef(activeGroupVideo);
  activeGroupVideoRef.current = activeGroupVideo;

  useEffect(() => {
    fetchGroups();
    fetchWalletBalance();
    const channel = supabase
      .channel('available-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_groups' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as PrivateGroup;
          if (!updated.is_live && activeGroupVideoRef.current?.id === updated.id) {
            toast.info('Host ended the live session');
            setActiveGroupVideo(null);
          }
        }
        fetchGroups();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users_wallet', filter: `user_id=eq.${currentUserId}` }, () => {
        fetchWalletBalance();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('private_groups').select('*').eq('is_active', true).eq('is_live', true)
        .not('current_host_id', 'is', null).order('name', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        setGroups(data.map(group => ({ ...group, owner_name: group.current_host_name || 'Host' })));
      } else { setGroups([]); }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Groups unavailable', { description: 'Unable to load available groups. Please refresh the page.' });
    } finally { setIsLoading(false); }
  };

  const fetchWalletBalance = async () => {
    try {
      const { data } = await supabase.from('users_wallet').select('balance').eq('user_id', currentUserId).single();
      if (data) setWalletBalance(data.balance);
    } catch (err) { console.error('[AvailableGroups] fetchWalletBalance error:', err); }
  };

  const handleJoinGroup = async (group: PrivateGroup) => {
    const minBalance = RATE_PER_MINUTE * MIN_BALANCE_MINUTES;
    if (walletBalance < minBalance) { toast.error(`Insufficient balance. You need at least ₹${minBalance} (${MIN_BALANCE_MINUTES} minutes) to join.`); return; }
    if (group.participant_count >= MAX_PARTICIPANTS) { toast.error(`This group is full (max ${MAX_PARTICIPANTS} participants)`); return; }
    setJoiningGroupId(group.id);
    let preStream: MediaStream | null = null;
    try {
      preStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: { echoCancellation: true, noiseSuppression: true } });
      preStream.getAudioTracks().forEach(t => { t.enabled = false; });
    } catch (mediaErr) {
      console.error('[AvailableGroups] Pre-acquire audio failed:', mediaErr);
      toast.error('Could not access microphone. Please allow access.');
      setJoiningGroupId(null); return;
    }
    try {
      const { data: joinResult, error: joinError } = await supabase.rpc('join_group_atomic', {
        p_group_id: group.id, p_user_id: currentUserId, p_max_participants: MAX_PARTICIPANTS,
      });
      if (joinError) throw joinError;
      const result = joinResult as { success: boolean; error?: string; participant_count?: number };
      if (!result.success) { toast.error(result.error || 'Could not join group'); preStream.getTracks().forEach(t => t.stop()); setJoiningGroupId(null); return; }
      setActiveGroupStream(preStream);
      setActiveGroupVideo(group);
    } catch (error: any) {
      preStream.getTracks().forEach(t => t.stop());
      toast.error('Could not join group', { description: classifyError(error, 'join the group').message });
    } finally { setJoiningGroupId(null); }
  };

  const handleLeaveGroup = async () => {
    if (activeGroupVideo) {
      if (activeGroupStream) { activeGroupStream.getTracks().forEach(t => t.stop()); setActiveGroupStream(null); }
      const groupId = activeGroupVideo.id;
      try {
        const { error } = await supabase.rpc('leave_group_atomic', { p_group_id: groupId, p_user_id: currentUserId });
        if (error) {
          console.warn('[AvailableGroups] leave_group_atomic RPC failed, using fallback:', error);
          await supabase.from('group_memberships').update({ has_access: false }).eq('group_id', groupId).eq('user_id', currentUserId);
        }
      } catch (e) { console.error('[AvailableGroups] Leave group error:', e); }
      fetchGroups();
    }
    setActiveGroupVideo(null);
  };

  if (isLoading) return <div className="animate-pulse h-32 bg-muted/30 rounded-lg" />;

  const minBalance = RATE_PER_MINUTE * MIN_BALANCE_MINUTES;
  const hasEnoughBalance = walletBalance >= minBalance;

  return (
    <div className="space-y-3">
      {/* WhatsApp-style header */}
      <div className="flex items-center justify-between bg-primary text-primary-foreground px-4 py-2.5 rounded-t-xl -mx-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Video className="h-4 w-4" />
          Live Groups
        </h3>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-[10px] h-5">
            {groups.length} Live
          </Badge>
          <button onClick={() => { setIsLoading(true); fetchGroups(); fetchWalletBalance(); }} className="hover:bg-primary-foreground/10 rounded-full p-1.5 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Balance warning */}
      {!hasEnoughBalance && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-lg text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          <span>⚠️</span>
          <span>Need at least ₹{minBalance} to join. Please recharge.</span>
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="py-10 text-center bg-card rounded-xl border border-border/60">
          <div className="w-14 h-14 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
            <Video className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No live groups right now</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Groups will appear when a host goes live</p>
        </div>
      )}

      {/* Group list - WhatsApp chat-list style */}
      {groups.length > 0 && (
        <div className="divide-y divide-border/50 bg-card rounded-xl overflow-hidden border border-border/60">
          {groups.map((group) => {
            const isFull = group.participant_count >= MAX_PARTICIPANTS;
            const isJoining = joiningGroupId === group.id;

            return (
              <div
                key={group.id}
                className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
              >
                {/* Flower avatar with live ring */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl bg-primary/10 ring-2 ring-accent">
                    {FLOWER_EMOJIS[group.name] || '🌸'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                    <Radio className="h-2 w-2 text-accent-foreground animate-pulse" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-foreground truncate">{group.name}</span>
                    <Badge className="bg-accent text-accent-foreground text-[9px] h-4 px-1.5 border-0 shrink-0">
                      LIVE
                    </Badge>
                  </div>
                  <p className="text-xs text-[#128C7E] font-medium truncate mt-0.5">
                    📹 {group.current_host_name || group.owner_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Users className="h-2.5 w-2.5" /> {group.participant_count}/{MAX_PARTICIPANTS}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      💰 ₹{RATE_PER_MINUTE}/min
                    </span>
                  </div>
                </div>

                {/* Join button */}
                <div className="shrink-0">
                  <Button
                    size="sm"
                    className={cn(
                      "h-8 text-xs rounded-full px-4 gap-1",
                      isFull || !hasEnoughBalance
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-[#25D366] hover:bg-[#128C7E] text-white"
                    )}
                    onClick={() => handleJoinGroup(group)}
                    disabled={!hasEnoughBalance || isFull || isJoining}
                  >
                    {isJoining ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Video className="h-3 w-3" />
                    )}
                    {isFull ? 'Full' : !hasEnoughBalance ? `₹${minBalance}+` : isJoining ? '...' : 'Join'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeGroupVideo && (
        <PrivateGroupCallWindow
          group={activeGroupVideo}
          currentUserId={currentUserId}
          userName={userName}
          userPhoto={userPhoto}
          preAcquiredStream={activeGroupStream}
          onClose={handleLeaveGroup}
          isOwner={false}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Video, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { PrivateCallInvitation } from './PrivateCallInvitation';
import { formatDistanceToNow } from 'date-fns';

interface PendingInvitation {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: string;
  min_gift_amount: number;
  caller_language: string | null;
  created_at: string;
  expires_at: string;
  callerName: string;
  callerPhoto: string | null;
}

interface MenPrivateCallSectionProps {
  currentUserId: string;
  currentUserLanguage: string;
}

export function MenPrivateCallSection({
  currentUserId,
  currentUserLanguage,
}: MenPrivateCallSectionProps) {
  const [loading, setLoading] = useState(true);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPendingInvitations();
  }, [currentUserId]);

  // Real-time subscription
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('men-private-call-section')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_call_invitations',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => fetchPendingInvitations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchPendingInvitations = async () => {
    try {
      const { data: invitations } = await supabase
        .from('private_call_invitations')
        .select('*')
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (invitations && invitations.length > 0) {
        // Fetch caller profiles
        const callerIds = invitations.map(inv => inv.caller_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, photo_url')
          .in('user_id', callerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const enrichedInvitations: PendingInvitation[] = invitations.map(inv => ({
          ...inv,
          callerName: profileMap.get(inv.caller_id)?.full_name || 'Someone',
          callerPhoto: profileMap.get(inv.caller_id)?.photo_url || null,
        }));

        setPendingInvitations(enrichedInvitations);
      } else {
        setPendingInvitations([]);
      }
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPendingInvitations();
  };

  const handleInvitationAccept = (invitationId: string, callId: string) => {
    console.log('Call accepted:', { invitationId, callId });
    fetchPendingInvitations();
  };

  const handleInvitationDecline = async (invitationId: string) => {
    await supabase
      .from('private_call_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId);
    fetchPendingInvitations();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            1-to-1 Private Video Calls
            {pendingInvitations.length > 0 && (
              <Badge variant="destructive" className="ml-2 animate-pulse">
                {pendingInvitations.length} new
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Accept invitations from women for exclusive 30-minute video calls. Send the required gift to join!
        </p>
      </CardHeader>
      <CardContent>
        {pendingInvitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending invitations</p>
            <p className="text-xs">Women will invite you for private 1-on-1 calls</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 rounded-lg bg-background/50 border border-primary/20 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      <AvatarImage src={invitation.callerPhoto || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-lg">
                        {invitation.callerName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{invitation.callerName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{invitation.caller_language}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-sm font-semibold">
                      ₹{invitation.min_gift_amount}+
                    </Badge>
                  </div>
                  
                  <div className="bg-muted/30 rounded p-2 text-xs text-center text-muted-foreground">
                    30-minute exclusive video call • Send gift to accept
                  </div>

                  {/* Accept/Reject Buttons */}
                  <PrivateCallInvitation
                    invitation={invitation}
                    currentUserId={currentUserId}
                    onAccept={handleInvitationAccept}
                    onDecline={() => handleInvitationDecline(invitation.id)}
                    onClose={() => {}}
                    inline
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

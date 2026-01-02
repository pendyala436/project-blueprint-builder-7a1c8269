import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, Phone, Crown, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { SendPrivateCallButton } from './SendPrivateCallButton';
import { PrivateCallInvitation } from './PrivateCallInvitation';

interface OnlineUser {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  language: string;
  walletBalance?: number;
}

interface PendingInvitation {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: string;
  min_gift_amount: number;
  caller_language: string | null;
  created_at: string;
  expires_at: string;
  callerName?: string;
  callerPhoto?: string | null;
}

interface PrivateCallSectionProps {
  currentUserId: string;
  currentUserLanguage: string;
  userGender: 'male' | 'female';
}

export function PrivateCallSection({
  currentUserId,
  currentUserLanguage,
  userGender,
}: PrivateCallSectionProps) {
  const [loading, setLoading] = useState(true);
  const [sameLanguageUsers, setSameLanguageUsers] = useState<OnlineUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userGender === 'female') {
      fetchSameLanguageMen();
    } else {
      fetchPendingInvitations();
    }
  }, [currentUserId, currentUserLanguage, userGender]);

  // Real-time subscription
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('private-call-section')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_call_invitations',
        },
        () => {
          if (userGender === 'male') {
            fetchPendingInvitations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
        },
        () => {
          if (userGender === 'female') {
            fetchSameLanguageMen();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, userGender]);

  const fetchSameLanguageMen = async () => {
    try {
      // Get online men with same language using RPC
      const { data: onlineMenData } = await supabase.rpc('get_online_men_dashboard');

      if (onlineMenData) {
        const sameLanguage = onlineMenData
          .filter((man: any) => {
            const manLanguage = man.mother_tongue || man.primary_language || man.preferred_language || '';
            return manLanguage.toLowerCase() === currentUserLanguage.toLowerCase();
          })
          .map((man: any) => ({
            userId: man.user_id,
            fullName: man.full_name || 'Anonymous',
            photoUrl: man.photo_url,
            language: man.mother_tongue || man.primary_language || '',
            walletBalance: Number(man.wallet_balance) || 0,
          }));

        setSameLanguageUsers(sameLanguage);
      }
    } catch (error) {
      console.error('Error fetching same language men:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

        const enrichedInvitations = invitations.map(inv => ({
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
    if (userGender === 'female') {
      fetchSameLanguageMen();
    } else {
      fetchPendingInvitations();
    }
  };

  const handleInvitationAccept = () => {
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
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Women's view - show same-language online men
  if (userGender === 'female') {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              1-to-1 Private Calls
              <Badge variant="secondary" className="ml-2">
                {currentUserLanguage}
              </Badge>
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
            Invite same-language men for exclusive video calls. Higher gift prices for 1-on-1 time!
          </p>
        </CardHeader>
        <CardContent>
          {sameLanguageUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No {currentUserLanguage} speaking men online</p>
              <p className="text-xs">Check back later!</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {sameLanguageUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background transition-colors border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoUrl || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {user.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {(user.walletBalance || 0) > 1000 && (
                          <Crown className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          ₹{(user.walletBalance || 0).toFixed(0)} balance
                        </p>
                      </div>
                    </div>
                    <SendPrivateCallButton
                      currentUserId={currentUserId}
                      currentUserLanguage={currentUserLanguage}
                      targetUserId={user.userId}
                      targetUserName={user.fullName}
                      targetUserLanguage={user.language}
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

  // Men's view - show pending invitations from women
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Private Call Invitations
            {pendingInvitations.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingInvitations.length}
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
          Women inviting you for exclusive 1-on-1 video calls. Send a gift to join!
        </p>
      </CardHeader>
      <CardContent>
        {pendingInvitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending invitations</p>
            <p className="text-xs">Women will invite you for private calls</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={invitation.callerPhoto || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {invitation.callerName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{invitation.callerName}</p>
                      <p className="text-xs text-muted-foreground">
                        Min gift: ₹{invitation.min_gift_amount} • {invitation.caller_language}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <PrivateCallInvitation
                      invitation={invitation}
                      currentUserId={currentUserId}
                      onAccept={handleInvitationAccept}
                      onDecline={() => handleInvitationDecline(invitation.id)}
                      onClose={() => {}}
                      inline
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

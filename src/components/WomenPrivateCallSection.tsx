import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, Crown, RefreshCw, Users, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { SendPrivateCallButton } from './SendPrivateCallButton';
import { toast } from 'sonner';

interface OnlineMan {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  language: string;
  walletBalance: number;
  isFree: boolean; // Not in any private call
}

interface WomenPrivateCallSectionProps {
  currentUserId: string;
  currentUserLanguage: string;
}

export function WomenPrivateCallSection({
  currentUserId,
  currentUserLanguage,
}: WomenPrivateCallSectionProps) {
  const [loading, setLoading] = useState(true);
  const [sameLanguageMen, setSameLanguageMen] = useState<OnlineMan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isWomanBusy, setIsWomanBusy] = useState(false); // Is current woman in an active private call

  useEffect(() => {
    fetchSameLanguageMen();
    checkWomanBusyStatus();
  }, [currentUserId, currentUserLanguage]);

  // Real-time subscription
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('women-private-call-section')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status' },
        () => fetchSameLanguageMen()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'private_calls' },
        () => {
          fetchSameLanguageMen();
          checkWomanBusyStatus();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'private_call_invitations' },
        () => fetchSameLanguageMen()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, currentUserLanguage]);

  const checkWomanBusyStatus = async () => {
    // Check if the current woman is already in an active private call
    const { data: activeCalls } = await supabase
      .from('private_calls')
      .select('id')
      .eq('caller_id', currentUserId)
      .eq('status', 'active')
      .limit(1);
    
    setIsWomanBusy((activeCalls?.length || 0) > 0);
  };

  const fetchSameLanguageMen = async () => {
    try {
      // Get online men with same language using RPC
      const { data: onlineMenData } = await supabase.rpc('get_online_men_dashboard');

      // Get men currently in active private calls
      const { data: activeCalls } = await supabase
        .from('private_calls')
        .select('receiver_id')
        .eq('status', 'active');

      const menInCalls = new Set(activeCalls?.map(c => c.receiver_id) || []);

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
            isFree: !menInCalls.has(man.user_id),
          }))
          // Sort: free men first, then by wallet balance
          .sort((a: OnlineMan, b: OnlineMan) => {
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
            return b.walletBalance - a.walletBalance;
          });

        setSameLanguageMen(sameLanguage);
      }
    } catch (error) {
      console.error('Error fetching same language men:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSameLanguageMen();
    checkWomanBusyStatus();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
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

  // If woman is currently in a call, show locked state
  if (isWomanBusy) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              1-to-1 Private Video Calls
              <Badge variant="destructive" className="ml-2 gap-1">
                <Lock className="h-3 w-3" />
                In Call
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
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">You're in an active private call</p>
            <p className="text-xs mt-1">Complete current call to invite new men</p>
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
            <Video className="h-5 w-5 text-primary" />
            1-to-1 Private Video Calls
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
          Invite FREE same-language men for exclusive 30-minute video calls. Set gift: ₹200-1000. Earn 50%!
        </p>
      </CardHeader>
      <CardContent>
        {sameLanguageMen.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {currentUserLanguage} speaking men online</p>
            <p className="text-xs">Check back later!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>Only <span className="text-success font-medium">Free</span> men can accept your invitation</span>
            </div>
            <ScrollArea className="h-[260px]">
              <div className="space-y-2">
                {sameLanguageMen.map((user) => (
                  <div
                    key={user.userId}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background transition-colors border",
                      user.isFree ? "border-success/30" : "border-destructive/30 opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoUrl || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {user.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {user.walletBalance > 1000 && (
                          <Crown className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{user.fullName}</p>
                          {user.isFree ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-success border-success/30">
                              Free
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
                              In Call
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ₹{user.walletBalance.toFixed(0)} balance
                        </p>
                      </div>
                    </div>
                    {user.isFree ? (
                      <SendPrivateCallButton
                        currentUserId={currentUserId}
                        currentUserLanguage={currentUserLanguage}
                        targetUserId={user.userId}
                        targetUserName={user.fullName}
                        targetUserLanguage={user.language}
                      />
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        <Lock className="h-3 w-3 mr-1" />
                        Busy
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}

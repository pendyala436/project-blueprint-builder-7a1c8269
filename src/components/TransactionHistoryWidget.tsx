import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowUpRight, 
  ArrowDownLeft,
  MessageCircle,
  Video,
  Gift,
  Wallet,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface UnifiedTransaction {
  id: string;
  type: 'recharge' | 'chat' | 'video' | 'gift' | 'withdrawal' | 'earning' | 'other';
  amount: number;
  description: string;
  created_at: string;
  status: string;
  counterparty?: string;
  balance_after?: number;
  is_credit: boolean;
  icon: 'wallet' | 'chat' | 'video' | 'gift' | 'arrow';
  duration?: number;
  rate?: number;
}

interface TransactionHistoryWidgetProps {
  userId: string;
  userGender: 'male' | 'female';
  maxItems?: number;
  showViewAll?: boolean;
  compact?: boolean;
}

export const TransactionHistoryWidget = ({
  userId,
  userGender,
  maxItems = 10,
  showViewAll = true,
  compact = false
}: TransactionHistoryWidgetProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [earningRates, setEarningRates] = useState<{ chatRate: number; videoRate: number } | null>(null);

  useEffect(() => {
    if (userId) {
      loadTransactions();
      if (userGender === 'female') {
        loadEarningRates();
      }
    }
  }, [userId, userGender]);

  const loadEarningRates = async () => {
    const { data } = await supabase
      .from("chat_pricing")
      .select("women_earning_rate, video_women_earning_rate")
      .eq("is_active", true)
      .maybeSingle();
    
    if (data) {
      setEarningRates({
        chatRate: Number(data.women_earning_rate) || 0,
        videoRate: Number(data.video_women_earning_rate) || 0
      });
    }
  };

  // Real-time updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`transaction-widget-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_transactions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'women_earnings' }, () => loadTransactions())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const unified: UnifiedTransaction[] = [];

      // Get wallet and balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (wallet) {
        setCurrentBalance(Number(wallet.balance) || 0);

        // Get wallet transactions
        const { data: txData } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(maxItems * 2);

        // Calculate running balances
        const sortedTx = [...(txData || [])].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        let calculatedBalance = 0;
        const balanceMap = new Map<string, number>();
        sortedTx.forEach(tx => {
          if (tx.type === 'credit') {
            calculatedBalance += Number(tx.amount);
          } else {
            calculatedBalance -= Number(tx.amount);
          }
          balanceMap.set(tx.id, calculatedBalance);
        });

        txData?.forEach(tx => {
          const isRecharge = tx.description?.toLowerCase().includes('recharge') || 
                            tx.description?.toLowerCase().includes('wallet recharge');
          const isGift = tx.description?.toLowerCase().includes('gift');
          const isChat = tx.description?.toLowerCase().includes('chat');
          const isVideo = tx.description?.toLowerCase().includes('video');
          const isWithdrawal = tx.description?.toLowerCase().includes('withdrawal');

          let type: UnifiedTransaction['type'] = 'other';
          let icon: UnifiedTransaction['icon'] = 'arrow';

          if (isRecharge) { type = 'recharge'; icon = 'wallet'; }
          else if (isGift) { type = 'gift'; icon = 'gift'; }
          else if (isChat) { type = 'chat'; icon = 'chat'; }
          else if (isVideo) { type = 'video'; icon = 'video'; }
          else if (isWithdrawal) { type = 'withdrawal'; icon = 'wallet'; }

          unified.push({
            id: tx.id,
            type,
            amount: Number(tx.amount),
            description: tx.description || (tx.type === 'credit' ? 'Credit' : 'Debit'),
            created_at: tx.created_at,
            status: tx.status,
            balance_after: balanceMap.get(tx.id),
            is_credit: tx.type === 'credit',
            icon
          });
        });
      }

      // Get gift transactions
      const { data: giftsData } = await supabase
        .from("gift_transactions")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(maxItems);

      if (giftsData?.length) {
        const giftIds = [...new Set(giftsData.map(g => g.gift_id))];
        const partnerIds = [...new Set(giftsData.map(g => 
          g.sender_id === userId ? g.receiver_id : g.sender_id
        ))];

        const [{ data: gifts }, { data: profiles }] = await Promise.all([
          supabase.from("gifts").select("id, name, emoji").in("id", giftIds),
          supabase.from("profiles").select("user_id, full_name").in("user_id", partnerIds)
        ]);

        const giftMap = new Map(gifts?.map(g => [g.id, g]) || []);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        giftsData.forEach(g => {
          const isSender = g.sender_id === userId;
          const giftInfo = giftMap.get(g.gift_id);
          const partnerName = profileMap.get(isSender ? g.receiver_id : g.sender_id) || "Anonymous";
          
          // Only add if not already in wallet transactions
          if (!unified.some(u => u.id === g.id)) {
            unified.push({
              id: `gift-${g.id}`,
              type: 'gift',
              amount: Number(g.price_paid),
              description: isSender 
                ? `${giftInfo?.emoji || '🎁'} Sent ${giftInfo?.name || 'Gift'} to ${partnerName}`
                : `${giftInfo?.emoji || '🎁'} Received ${giftInfo?.name || 'Gift'} from ${partnerName}`,
              created_at: g.created_at,
              status: g.status,
              counterparty: partnerName,
              is_credit: !isSender,
              icon: 'gift'
            });
          }
        });
      }

      // For women: Get earnings with chat/call session details and counterparty
      if (userGender === 'female') {
        const [{ data: earnings }, { data: chatSessions }, { data: videoSessions }] = await Promise.all([
          supabase
            .from("women_earnings")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(maxItems),
          supabase
            .from("active_chat_sessions")
            .select("id, man_user_id, total_minutes, rate_per_minute, total_earned, status, end_reason, created_at")
            .eq("woman_user_id", userId)
            .order("created_at", { ascending: false })
            .limit(maxItems),
          supabase
            .from("video_call_sessions")
            .select("id, man_user_id, total_minutes, total_earned, status, created_at")
            .eq("woman_user_id", userId)
            .order("created_at", { ascending: false })
            .limit(maxItems)
        ]);

        // Get all man user IDs to fetch their profiles
        const manUserIds = new Set<string>();
        chatSessions?.forEach(s => manUserIds.add(s.man_user_id));
        videoSessions?.forEach(s => manUserIds.add(s.man_user_id));

        let profileMap = new Map<string, string>();
        if (manUserIds.size > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", Array.from(manUserIds));
          profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name || 'User']) || []);
        }

        const chatSessionMap = new Map(chatSessions?.map(s => [s.id, s]) || []);
        const videoSessionMap = new Map(videoSessions?.map(s => [s.id, s]) || []);

        earnings?.forEach(e => {
          let description = e.description || `${e.earning_type} earnings`;
          let counterparty: string | undefined;
          let duration: number | undefined;
          let rate: number | undefined;
          
          const chatSession = e.chat_session_id ? chatSessionMap.get(e.chat_session_id) : null;
          
          // Build description with user, duration, and rate
          if (e.earning_type === 'chat' && chatSession) {
            counterparty = profileMap.get(chatSession.man_user_id) || 'User';
            rate = earningRates?.chatRate || Number(chatSession.rate_per_minute) || 0;
            duration = Number(chatSession.total_minutes) || 0;
            description = `💬 Chat with ${counterparty}`;
          } else if (e.earning_type === 'video_call') {
            // Find matching video session
            const videoSession = Array.from(videoSessionMap.values()).find(v => 
              Math.abs(new Date(v.created_at).getTime() - new Date(e.created_at).getTime()) < 300000
            );
            if (videoSession) {
              counterparty = profileMap.get(videoSession.man_user_id) || 'User';
              duration = Number(videoSession.total_minutes) || 0;
            }
            rate = earningRates?.videoRate || 0;
            description = `📹 Video call${counterparty ? ` with ${counterparty}` : ''}`;
          } else if (e.earning_type === 'gift') {
            description = `🎁 Gift earnings`;
          } else if (e.earning_type === 'chat') {
            rate = earningRates?.chatRate || 0;
            description = `💬 Chat earnings`;
          }

          unified.push({
            id: `earning-${e.id}`,
            type: 'earning',
            amount: Number(e.amount),
            description,
            created_at: e.created_at,
            status: 'completed',
            is_credit: true,
            icon: e.earning_type === 'chat' ? 'chat' : e.earning_type === 'video_call' ? 'video' : 'gift',
            counterparty,
            duration,
            rate
          });
        });
      }

      // Sort by date and limit
      unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(unified.slice(0, maxItems));
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (icon: string, isCredit: boolean) => {
    const className = cn("w-4 h-4", isCredit ? "text-success" : "text-destructive");
    switch (icon) {
      case 'wallet': return <Wallet className={className} />;
      case 'chat': return <MessageCircle className={className} />;
      case 'video': return <Video className={className} />;
      case 'gift': return <Gift className={className} />;
      default: return isCredit ? <ArrowDownLeft className={className} /> : <ArrowUpRight className={className} />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      recharge: { label: "Recharge", variant: "default" },
      chat: { label: "Chat", variant: "secondary" },
      video: { label: "Video", variant: "secondary" },
      gift: { label: "Gift", variant: "outline" },
      earning: { label: "Earning", variant: "default" },
      withdrawal: { label: "Withdrawal", variant: "outline" },
      other: { label: "Transaction", variant: "outline" }
    };
    const config = variants[type] || variants.other;
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Transaction History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              ₹{currentBalance.toLocaleString()}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadTransactions}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {userGender === 'female' && earningRates && (
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>Earning Rates:</span>
            <Badge variant="outline" className="text-xs">Chat: ₹{earningRates.chatRate}/min</Badge>
            <Badge variant="outline" className="text-xs">Video: ₹{earningRates.videoRate}/min</Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No transactions yet
          </div>
        ) : (
          <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    tx.is_credit ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    {getIcon(tx.icon, tx.is_credit)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      {!compact && getTypeBadge(tx.type)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>{format(new Date(tx.created_at), "MMM d, h:mm a")}</span>
                      {tx.counterparty && (
                        <span className="text-foreground/70 font-medium">
                          • {tx.counterparty}
                        </span>
                      )}
                      {tx.duration !== undefined && tx.rate !== undefined && (
                        <span className="text-primary/80">
                          • {tx.duration.toFixed(1)} min × ₹{tx.rate}/min
                        </span>
                      )}
                      {tx.balance_after !== undefined && (
                        <span className="text-muted-foreground/70">
                          • Bal: ₹{tx.balance_after.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "text-sm font-semibold whitespace-nowrap",
                    tx.is_credit ? "text-success" : "text-destructive"
                  )}>
                    {tx.is_credit ? "+" : "-"}₹{tx.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {showViewAll && transactions.length > 0 && (
          <Button 
            variant="ghost" 
            className="w-full mt-2 text-sm"
            onClick={() => navigate(userGender === 'female' ? "/women-transactions" : "/transactions")}
          >
            View All Transactions
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistoryWidget;

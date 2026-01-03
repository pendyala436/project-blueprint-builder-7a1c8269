import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowUpRight, 
  ArrowDownLeft,
  MessageCircle,
  Clock,
  IndianRupee,
  RefreshCw,
  Calendar,
  Video,
  Gift,
  Wallet
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import NavigationHeader from "@/components/NavigationHeader";

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  reference_id: string | null;
  balance_after?: number;
}

interface ChatSession {
  id: string;
  chat_id: string;
  man_user_id: string;
  woman_user_id: string;
  total_earned: number;
  total_minutes: number;
  rate_per_minute: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  end_reason: string | null;
  partner_name?: string;
  partner_photo?: string;
}

// Private calls are gift-based only - no separate video call sessions for men

interface GiftTransaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  gift_id: string;
  price_paid: number;
  currency: string;
  status: string;
  created_at: string;
  message: string | null;
  gift_name?: string;
  gift_emoji?: string;
  partner_name?: string;
}

interface UnifiedTransaction {
  id: string;
  type: 'recharge' | 'chat' | 'gift' | 'private_call' | 'group_call' | 'withdrawal' | 'other';
  amount: number;
  description: string;
  created_at: string;
  status: string;
  counterparty?: string;
  balance_after?: number;
  is_credit: boolean;
  icon: 'wallet' | 'chat' | 'gift' | 'arrow';
  details?: string;
}

const TransactionHistoryScreen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [giftTransactions, setGiftTransactions] = useState<GiftTransaction[]>([]);
  const [unifiedTransactions, setUnifiedTransactions] = useState<UnifiedTransaction[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  // Real-time subscription for transactions and sessions
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel('men-transaction-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_transactions' },
        () => { loadData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_chat_sessions' },
        () => { loadData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_call_sessions' },
        () => { loadData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gift_transactions' },
        () => { loadData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUserId(user.id);

      // Fetch wallet and current balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) {
        setCurrentBalance(Number(wallet.balance) || 0);
        
        const { data: txData } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", wallet.id)
          .order("created_at", { ascending: false })
          .limit(200);

        // Recalculate balance from oldest to newest
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

        const enrichedTx = (txData || []).map(tx => ({
          ...tx,
          balance_after: balanceMap.get(tx.id) || 0
        }));

        setWalletTransactions(enrichedTx);
      }

      // Fetch gift transactions sent by this user
      const { data: giftsData } = await supabase
        .from("gift_transactions")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (giftsData && giftsData.length > 0) {
        const giftIds = [...new Set(giftsData.map(g => g.gift_id))];
        const { data: gifts } = await supabase
          .from("gifts")
          .select("id, name, emoji")
          .in("id", giftIds);
        
        const giftMap = new Map(gifts?.map(g => [g.id, g]) || []);

        const receiverIds = [...new Set(giftsData.map(g => g.receiver_id))];
        const { data: receiverProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", receiverIds);
        
        const receiverMap = new Map(receiverProfiles?.map(p => [p.user_id, p.full_name]) || []);

        const enrichedGifts: GiftTransaction[] = giftsData.map(g => ({
          ...g,
          gift_name: giftMap.get(g.gift_id)?.name || "Gift",
          gift_emoji: giftMap.get(g.gift_id)?.emoji || "🎁",
          partner_name: receiverMap.get(g.receiver_id) || "Anonymous"
        }));

        setGiftTransactions(enrichedGifts);
      }

      // Fetch chat sessions for men
      const { data: sessions } = await supabase
        .from("active_chat_sessions")
        .select("*")
        .eq("man_user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(100);

      if (sessions && sessions.length > 0) {
        const partnerIds = sessions.map(s => s.woman_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", partnerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enrichedSessions = sessions.map(s => ({
          ...s,
          partner_name: profileMap.get(s.woman_user_id)?.full_name || "Anonymous",
          partner_photo: profileMap.get(s.woman_user_id)?.photo_url
        }));

        setChatSessions(enrichedSessions);
      }

      // Private calls are gift-based - no separate video sessions to fetch

    } catch (error) {
      console.error("Error loading transaction data:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildUnifiedTransactions = (
    walletTx: WalletTransaction[],
    gifts: GiftTransaction[]
  ) => {
    const unified: UnifiedTransaction[] = [];

    // Add wallet transactions
    walletTx.forEach(tx => {
      const isRecharge = tx.type === 'credit' && tx.description?.toLowerCase().includes('recharge');
      const isWithdrawal = tx.description?.toLowerCase().includes('withdrawal');
      const isGift = tx.description?.toLowerCase().includes('gift') || tx.description?.toLowerCase().includes('video') || tx.description?.toLowerCase().includes('private');
      const isChat = tx.description?.toLowerCase().includes('chat');

      let type: UnifiedTransaction['type'] = 'other';
      let icon: UnifiedTransaction['icon'] = 'arrow';

      if (isRecharge) { type = 'recharge'; icon = 'wallet'; }
      else if (isWithdrawal) { type = 'withdrawal'; icon = 'wallet'; }
      else if (isGift) { type = 'gift'; icon = 'gift'; }
      else if (isChat) { type = 'chat'; icon = 'chat'; }

      unified.push({
        id: tx.id,
        type,
        amount: Number(tx.amount),
        description: tx.description || (tx.type === 'credit' ? 'Credit' : 'Debit'),
        created_at: tx.created_at,
        status: tx.status,
        balance_after: tx.balance_after,
        is_credit: tx.type === 'credit',
        icon,
        details: tx.reference_id ? `Ref: ${tx.reference_id}` : undefined
      });
    });

    // Add gift transactions (sent by men)
    gifts.forEach(g => {
      unified.push({
        id: `gift-${g.id}`,
        type: 'gift',
        amount: Number(g.price_paid),
        description: `${g.gift_emoji} ${g.gift_name} sent to ${g.partner_name}`,
        created_at: g.created_at,
        status: g.status,
        counterparty: g.partner_name,
        is_credit: false,
        icon: 'gift',
        details: g.message || undefined
      });
    });

    // Sort by date descending
    unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setUnifiedTransactions(unified);
  };

  useEffect(() => {
    if (!loading) {
      buildUnifiedTransactions(walletTransactions, giftTransactions);
    }
  }, [walletTransactions, giftTransactions, loading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "ended":
        return <Badge variant="secondary" className="bg-success/20 text-success">Completed</Badge>;
      case "active":
        return <Badge className="bg-primary/20 text-primary">Active</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-warning border-warning/30">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEndReasonText = (reason: string | null) => {
    if (!reason) return null;
    switch (reason) {
      case "insufficient_balance": return "Ended - Low balance";
      case "inactivity_timeout": return "Ended - Inactivity";
      case "user_disconnected": return "User disconnected";
      case "woman_disconnected": return "Partner disconnected";
      default: return reason;
    }
  };

  const getTransactionIcon = (icon: UnifiedTransaction['icon'], isCredit: boolean) => {
    const colorClass = isCredit ? "text-success" : "text-destructive";
    const bgClass = isCredit ? "bg-success/10" : "bg-destructive/10";
    
    switch (icon) {
      case 'wallet':
        return (
          <div className={cn("p-2 rounded-full", bgClass)}>
            <Wallet className={cn("h-4 w-4", colorClass)} />
          </div>
        );
      case 'chat':
        return (
          <div className={cn("p-2 rounded-full", bgClass)}>
            <MessageCircle className={cn("h-4 w-4", colorClass)} />
          </div>
        );
      case 'gift':
        return (
          <div className="p-2 rounded-full bg-amber-500/10">
            <Gift className="h-4 w-4 text-amber-500" />
          </div>
        );
      default:
        return (
          <div className={cn("p-2 rounded-full", bgClass)}>
            {isCredit ? (
              <ArrowDownLeft className={cn("h-4 w-4", colorClass)} />
            ) : (
              <ArrowUpRight className={cn("h-4 w-4", colorClass)} />
            )}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <NavigationHeader
            title="Transaction History"
            showBack={true}
            showHome={true}
            showForward={false}
            rightContent={
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-semibold text-primary">₹{currentBalance.toFixed(2)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-full"
                >
                  <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
                </Button>
              </div>
            }
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-2 text-center">
            <p className="text-xs text-muted-foreground">Chats</p>
            <p className="text-lg font-bold">{chatSessions.length}</p>
          </Card>
          <Card className="p-2 text-center">
            <p className="text-xs text-muted-foreground">Gifts Sent</p>
            <p className="text-lg font-bold">{giftTransactions.length}</p>
          </Card>
          <Card className="p-2 text-center">
            <p className="text-xs text-muted-foreground">Txns</p>
            <p className="text-lg font-bold">{walletTransactions.length}</p>
          </Card>
        </div>

        {/* Transaction Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="chats" className="text-xs">Chats</TabsTrigger>
            <TabsTrigger value="gifts" className="text-xs">Gifts</TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs">Wallet</TabsTrigger>
          </TabsList>

          {/* All Transactions */}
          <TabsContent value="all" className="space-y-3">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {unifiedTransactions.map((tx) => (
                  <Card key={tx.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getTransactionIcon(tx.icon, tx.is_credit)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate text-sm">
                              {tx.description}
                            </span>
                            <span className={cn(
                              "font-semibold whitespace-nowrap",
                              tx.is_credit ? "text-success" : "text-destructive"
                            )}>
                              {tx.is_credit ? "+" : "-"}₹{tx.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                            {tx.balance_after !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                Bal: ₹{tx.balance_after.toFixed(2)}
                              </p>
                            )}
                          </div>
                          {tx.details && (
                            <p className="text-xs text-muted-foreground mt-1">{tx.details}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {unifiedTransactions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No transactions yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Chat Sessions */}
          <TabsContent value="chats" className="space-y-3">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {chatSessions.map((session) => (
                  <Card key={session.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-destructive/10">
                          <MessageCircle className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                Chat with {session.partner_name}
                              </span>
                              {getStatusBadge(session.status)}
                            </div>
                            <span className="font-semibold text-destructive whitespace-nowrap">
                              -₹{Number(session.total_earned).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(Number(session.total_minutes))}
                            </span>
                            <span className="flex items-center gap-1">
                              <IndianRupee className="h-3 w-3" />
                              {session.rate_per_minute}/min
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(session.started_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {session.end_reason && (
                            <p className="text-xs text-warning mt-1">
                              {getEndReasonText(session.end_reason)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {chatSessions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No chat sessions yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Gift Transactions */}
          <TabsContent value="gifts" className="space-y-3">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {giftTransactions.map((gift) => (
                  <Card key={gift.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-amber-500/10">
                          <span className="text-lg">{gift.gift_emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {gift.gift_name} to {gift.partner_name}
                              </span>
                              {getStatusBadge(gift.status)}
                            </div>
                            <span className="font-semibold text-destructive whitespace-nowrap">
                              -₹{Number(gift.price_paid).toFixed(2)}
                            </span>
                          </div>
                          {gift.message && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              "{gift.message}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(gift.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {giftTransactions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No gift transactions yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Wallet Transactions */}
          <TabsContent value="wallet" className="space-y-3">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {walletTransactions.map((tx) => (
                  <Card key={tx.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          tx.type === "credit" ? "bg-success/10" : "bg-destructive/10"
                        )}>
                          {tx.type === "credit" ? (
                            <ArrowDownLeft className="h-4 w-4 text-success" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {tx.description || (tx.type === "credit" ? "Wallet Recharge" : "Payment")}
                              </span>
                              {getStatusBadge(tx.status)}
                            </div>
                            <span className={cn(
                              "font-semibold whitespace-nowrap",
                              tx.type === "credit" ? "text-success" : "text-destructive"
                            )}>
                              {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                            {tx.balance_after !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                Balance: ₹{tx.balance_after.toFixed(2)}
                              </p>
                            )}
                          </div>
                          {tx.reference_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Ref: {tx.reference_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {walletTransactions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <IndianRupee className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No transactions yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TransactionHistoryScreen;

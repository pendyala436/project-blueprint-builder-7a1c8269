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
  ArrowLeft, 
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
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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

interface VideoCallSession {
  id: string;
  call_id: string;
  man_user_id: string;
  woman_user_id: string;
  total_earned: number;
  total_minutes: number;
  rate_per_minute: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  partner_name?: string;
  partner_photo?: string;
}

interface WomenEarning {
  id: string;
  amount: number;
  earning_type: string;
  description: string | null;
  created_at: string;
  chat_session_id: string | null;
  partner_name?: string;
}

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
  is_sender: boolean;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
}

interface UnifiedTransaction {
  id: string;
  type: 'recharge' | 'chat' | 'video' | 'gift' | 'withdrawal' | 'other';
  amount: number;
  description: string;
  created_at: string;
  status: string;
  counterparty?: string;
  balance_after?: number;
  is_credit: boolean;
  icon: 'wallet' | 'chat' | 'video' | 'gift' | 'arrow';
  details?: string;
}

const TransactionHistoryScreen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [videoCallSessions, setVideoCallSessions] = useState<VideoCallSession[]>([]);
  const [womenEarnings, setWomenEarnings] = useState<WomenEarning[]>([]);
  const [giftTransactions, setGiftTransactions] = useState<GiftTransaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [unifiedTransactions, setUnifiedTransactions] = useState<UnifiedTransaction[]>([]);
  const [privateCalls, setPrivateCalls] = useState<any[]>([]);
  const [chatPricing, setChatPricing] = useState<{ ratePerMinute: number; videoRatePerMinute: number; womenEarningRate: number; videoWomenEarningRate: number } | null>(null);
  const [activeTab, setActiveTab] = useState("chats");

  useEffect(() => {
    loadData();
  }, []);

  // Real-time subscription for transactions and sessions
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`transaction-updates-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_chat_sessions' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_call_sessions' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'women_earnings' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_transactions' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_calls' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_pricing' }, () => { loadData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadData = async () => {
    try {
      // Fetch chat pricing first (ACID-compliant rates)
      const { data: pricingData } = await supabase
        .from("chat_pricing")
        .select("rate_per_minute, video_rate_per_minute, women_earning_rate, video_women_earning_rate")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pricingData) {
        setChatPricing({
          ratePerMinute: Number(pricingData.rate_per_minute) || 4,
          videoRatePerMinute: Number(pricingData.video_rate_per_minute) || 8,
          womenEarningRate: Number(pricingData.women_earning_rate) || 2,
          videoWomenEarningRate: Number(pricingData.video_women_earning_rate) || 4,
        });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUserId(user.id);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("gender")
        .eq("user_id", user.id)
        .maybeSingle();

      const gender = profile?.gender?.toLowerCase() || null;
      setUserGender(gender);

      // Fetch wallet and current balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) {
        // For men: use wallet balance. For women: calculate from earnings - debits
        if (gender === 'male') {
          setCurrentBalance(Number(wallet.balance) || 0);
        } else {
          const [{ data: allEarnings }, { data: allDebits }] = await Promise.all([
            supabase.from("women_earnings").select("amount").eq("user_id", user.id),
            supabase.from("wallet_transactions").select("amount").eq("user_id", user.id).eq("type", "debit")
          ]);
          const totalEarnings = allEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
          const totalDebits = allDebits?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          setCurrentBalance(totalEarnings - totalDebits);
        }
        
        const { data: txData } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", wallet.id)
          .order("created_at", { ascending: false })
          .limit(200);

        // Recalculate running balance from oldest to newest
        const sortedTx = [...(txData || [])].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        let calculatedBalance = 0;
        // For women: start running balance from earnings before first wallet tx
        if (gender === 'female' && sortedTx.length > 0) {
          const firstTxDate = sortedTx[0].created_at;
          const { data: priorEarnings } = await supabase
            .from("women_earnings")
            .select("amount")
            .eq("user_id", user.id)
            .lt("created_at", firstTxDate);
          calculatedBalance = priorEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        }
        
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

      // Fetch gift transactions (both sent and received)
      const { data: giftsData } = await supabase
        .from("gift_transactions")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (giftsData && giftsData.length > 0) {
        // Get gift details
        const giftIds = [...new Set(giftsData.map(g => g.gift_id))];
        const { data: gifts } = await supabase
          .from("gifts")
          .select("id, name, emoji")
          .in("id", giftIds);
        
        const giftMap = new Map(gifts?.map(g => [g.id, g]) || []);

        // Get partner profiles
        const partnerIds = [...new Set(giftsData.map(g => 
          g.sender_id === user.id ? g.receiver_id : g.sender_id
        ))];
        const { data: partnerProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", partnerIds);
        
        const partnerMap = new Map(partnerProfiles?.map(p => [p.user_id, p.full_name]) || []);

        const enrichedGifts: GiftTransaction[] = giftsData.map(g => ({
          ...g,
          gift_name: giftMap.get(g.gift_id)?.name || "Gift",
          gift_emoji: giftMap.get(g.gift_id)?.emoji || "🎁",
          partner_name: partnerMap.get(g.sender_id === user.id ? g.receiver_id : g.sender_id) || "Anonymous",
          is_sender: g.sender_id === user.id
        }));

        setGiftTransactions(enrichedGifts);
      }

      // Fetch chat sessions based on gender
      const chatField = gender === "male" ? "man_user_id" : "woman_user_id";
      const partnerField = gender === "male" ? "woman_user_id" : "man_user_id";
      
      const { data: sessions } = await supabase
        .from("active_chat_sessions")
        .select("*")
        .eq(chatField, user.id)
        .order("started_at", { ascending: false })
        .limit(100);

      if (sessions && sessions.length > 0) {
        const partnerIds = sessions.map(s => s[partnerField as keyof typeof s] as string);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", partnerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enrichedSessions = sessions.map(s => ({
          ...s,
          partner_name: profileMap.get(s[partnerField as keyof typeof s] as string)?.full_name || "Anonymous",
          partner_photo: profileMap.get(s[partnerField as keyof typeof s] as string)?.photo_url
        }));

        setChatSessions(enrichedSessions);
      }

      // Fetch video call sessions
      const { data: videoCalls } = await supabase
        .from("video_call_sessions")
        .select("*")
        .eq(chatField, user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (videoCalls && videoCalls.length > 0) {
        const partnerIds = videoCalls.map(s => s[partnerField as keyof typeof s] as string);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", partnerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enrichedCalls = videoCalls.map(s => ({
          ...s,
          partner_name: profileMap.get(s[partnerField as keyof typeof s] as string)?.full_name || "Anonymous",
          partner_photo: profileMap.get(s[partnerField as keyof typeof s] as string)?.photo_url
        }));

        setVideoCallSessions(enrichedCalls);
      }

      // For women: Fetch earnings
      if (gender === "female") {
        const { data: earnings } = await supabase
          .from("women_earnings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (earnings && earnings.length > 0) {
          const sessionIds = earnings.filter(e => e.chat_session_id).map(e => e.chat_session_id);
          
          if (sessionIds.length > 0) {
            const { data: sessions } = await supabase
              .from("active_chat_sessions")
              .select("id, man_user_id")
              .in("id", sessionIds);

            if (sessions && sessions.length > 0) {
              const manIds = sessions.map(s => s.man_user_id);
              const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, full_name")
                .in("user_id", manIds);

              const sessionMap = new Map(sessions.map(s => [s.id, s.man_user_id]));
              const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

              const enrichedEarnings = earnings.map(e => {
                const manId = e.chat_session_id ? sessionMap.get(e.chat_session_id) : null;
                return {
                  ...e,
                  partner_name: manId ? profileMap.get(manId) || "Anonymous" : undefined
                };
              });

              setWomenEarnings(enrichedEarnings);
            } else {
              setWomenEarnings(earnings);
            }
          } else {
            setWomenEarnings(earnings);
          }
        }
      }

      // Fetch withdrawal requests
      const { data: withdrawals } = await supabase
        .from("withdrawal_requests")
        .select("id, amount, status, payment_method, created_at, processed_at, rejection_reason")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setWithdrawalRequests(withdrawals || []);

      // Fetch private calls (1-to-1 video calls via gift)
      const privateCallField = gender === "male" ? "receiver_id" : "caller_id";
      const privatePartnerField = gender === "male" ? "caller_id" : "receiver_id";
      
      const { data: privateCallsData } = await supabase
        .from("private_calls")
        .select("*")
        .eq(privateCallField, user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (privateCallsData && privateCallsData.length > 0) {
        const partnerIds = privateCallsData.map(pc => pc[privatePartnerField as keyof typeof pc] as string);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", partnerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enrichedPrivateCalls = privateCallsData.map(pc => ({
          ...pc,
          partner_name: profileMap.get(pc[privatePartnerField as keyof typeof pc] as string)?.full_name || "Anonymous",
        }));

        setPrivateCalls(enrichedPrivateCalls);
      } else {
        setPrivateCalls([]);
      }

    } catch (error) {
      console.error("Error loading transaction data:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildUnifiedTransactions = (
    walletTx: WalletTransaction[],
    chats: ChatSession[],
    videos: VideoCallSession[],
    gifts: GiftTransaction[],
    isMale: boolean
  ) => {
    const unified: UnifiedTransaction[] = [];
    const giftTxIds = new Set(gifts.map(g => g.id));

    // Add wallet transactions — skip gift-related ones to avoid duplicates
    walletTx.forEach(tx => {
      const desc = tx.description?.toLowerCase() || '';
      const isRecharge = tx.type === 'credit' && desc.includes('recharge');
      const isWithdrawal = desc.includes('withdrawal');
      const isGift = desc.includes('gift');
      const isChat = desc.includes('chat');
      const isVideo = desc.includes('video');

      // Skip gift wallet entries — they'll come from gift_transactions
      if (isGift) return;

      let type: UnifiedTransaction['type'] = 'other';
      let icon: UnifiedTransaction['icon'] = 'arrow';

      if (isRecharge) { type = 'recharge'; icon = 'wallet'; }
      else if (isWithdrawal) { type = 'withdrawal'; icon = 'wallet'; }
      else if (isChat) { type = 'chat'; icon = 'chat'; }
      else if (isVideo) { type = 'video'; icon = 'video'; }

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

    // Add gift transactions (single source — no duplicates)
    gifts.forEach(g => {
      // For women receiving gifts: skip here since earnings are tracked in women_earnings
      if (!g.is_sender && !isMale) return;
      
      unified.push({
        id: `gift-${g.id}`,
        type: 'gift',
        amount: g.is_sender ? Number(g.price_paid) : Number(g.price_paid) * 0.5,
        description: `${g.gift_emoji} ${g.gift_name} ${g.is_sender ? 'sent to' : 'received from'} ${g.partner_name}`,
        created_at: g.created_at,
        status: g.status,
        counterparty: g.partner_name,
        is_credit: !g.is_sender,
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
      buildUnifiedTransactions(
        walletTransactions,
        chatSessions,
        videoCallSessions,
        giftTransactions,
        userGender === "male"
      );
    }
  }, [walletTransactions, chatSessions, videoCallSessions, giftTransactions, userGender, loading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDuration = (minutes: number) => {
    const totalSeconds = Math.round(minutes * 60);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "ended":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-700">Completed</Badge>;
      case "active":
        return <Badge className="bg-primary/20 text-primary">Active</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>;
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
    const colorClass = isCredit ? "text-green-600" : "text-destructive";
    const bgClass = isCredit ? "bg-green-500/10" : "bg-destructive/10";
    
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
      case 'video':
        return (
          <div className={cn("p-2 rounded-full", isCredit ? "bg-pink-500/10" : "bg-purple-500/10")}>
            <Video className={cn("h-4 w-4", isCredit ? "text-pink-500" : "text-purple-500")} />
          </div>
        );
      case 'gift':
        return (
          <div className={cn("p-2 rounded-full", isCredit ? "bg-amber-500/10" : "bg-amber-500/10")}>
            <Gift className={cn("h-4 w-4 text-amber-500")} />
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

  const isMale = userGender === "male";

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
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="auroraGhost"
              size="icon"
              onClick={() => window.history.length > 1 ? navigate(-1) : navigate(isMale ? '/dashboard' : '/women-dashboard')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Transaction History</h1>
              <p className="text-xs text-muted-foreground">
                {isMale ? "Your spending & activity" : "Your earnings & activity"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="font-semibold text-primary">
                ₹{(
                  (isMale 
                    ? currentBalance 
                    : womenEarnings.reduce((sum, e) => sum + Number(e.amount), 0) - 
                      walletTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + Number(t.amount), 0)
                  )
                ).toFixed(2)}
              </p>
            </div>
            <Button
              variant="auroraGhost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-full"
            >
              <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Summary Stats - Total amounts per category */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="p-3 text-center bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <MessageCircle className="h-4 w-4 mx-auto mb-1 text-blue-600" />
            <p className="text-xs text-muted-foreground">Chats</p>
            <p className="text-lg font-bold text-blue-600">
              ₹{(isMale 
                ? walletTransactions.filter(t => t.type === 'debit' && (t.description?.toLowerCase().includes('chat'))).reduce((sum, t) => sum + Number(t.amount), 0)
                : womenEarnings.filter(e => e.earning_type === 'chat').reduce((sum, e) => sum + Number(e.amount), 0)
              ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {chatSessions.length} sessions • {isMale ? 'Spend' : 'Earn'}: ₹{chatPricing ? (isMale ? chatPricing.ratePerMinute : chatPricing.womenEarningRate) : (isMale ? 4 : 2)}/min (₹{((chatPricing ? (isMale ? chatPricing.ratePerMinute : chatPricing.womenEarningRate) : (isMale ? 4 : 2)) / 60).toFixed(4)}/sec)
            </p>
          </Card>
          <Card className="p-3 text-center bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
            <Video className="h-4 w-4 mx-auto mb-1 text-purple-600" />
            <p className="text-xs text-muted-foreground">Video Calls</p>
            <p className="text-lg font-bold text-purple-600">
              ₹{(isMale
                ? walletTransactions.filter(t => t.type === 'debit' && (t.description?.toLowerCase().includes('video'))).reduce((sum, t) => sum + Number(t.amount), 0)
                : womenEarnings.filter(e => e.earning_type === 'video_call' || e.earning_type === 'private_call').reduce((sum, e) => sum + Number(e.amount), 0)
              ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {videoCallSessions.length + privateCalls.length} calls • {isMale ? 'Spend' : 'Earn'}: ₹{chatPricing ? (isMale ? chatPricing.videoRatePerMinute : chatPricing.videoWomenEarningRate) : (isMale ? 8 : 4)}/min (₹{((chatPricing ? (isMale ? chatPricing.videoRatePerMinute : chatPricing.videoWomenEarningRate) : (isMale ? 8 : 4)) / 60).toFixed(4)}/sec)
            </p>
          </Card>
          <Card className="p-3 text-center bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
            <Gift className="h-4 w-4 mx-auto mb-1 text-amber-600" />
            <p className="text-xs text-muted-foreground">Gifts</p>
            <p className="text-lg font-bold text-amber-600">
              ₹{(isMale
                ? giftTransactions.filter(g => g.is_sender).reduce((sum, g) => sum + Number(g.price_paid), 0)
                : womenEarnings.filter(e => e.earning_type === 'gift').reduce((sum, e) => sum + Number(e.amount), 0)
              ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground">{giftTransactions.length} gifts</p>
          </Card>
          {isMale ? (
            <>
              <Card className="p-3 text-center bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20 col-span-2 sm:col-span-4">
                <Wallet className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Total Recharges</p>
                <p className="text-xl font-bold text-emerald-600">
                  ₹{walletTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + Number(t.amount), 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">{walletTransactions.filter(t => t.type === 'credit').length} deposits</p>
              </Card>
              <Card className="p-3 text-center bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20 col-span-2 sm:col-span-4">
                <ArrowUpRight className="h-4 w-4 mx-auto mb-1 text-red-600" />
                <p className="text-xs text-muted-foreground">Total Spending</p>
                <p className="text-xl font-bold text-red-600">
                  ₹{walletTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + Number(t.amount), 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {walletTransactions.filter(t => t.type === 'debit').length} transactions (ACID-verified)
                </p>
              </Card>
            </>
          ) : (
            <>
              <Card className="p-3 text-center bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
                <Wallet className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Total Earnings</p>
                <p className="text-lg font-bold text-emerald-600">
                  ₹{womenEarnings.reduce((sum, e) => sum + Number(e.amount), 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">{womenEarnings.length} entries</p>
              </Card>
              <Card className="p-3 text-center bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20 col-span-2 sm:col-span-4">
                <ArrowUpRight className="h-4 w-4 mx-auto mb-1 text-red-600" />
                <p className="text-xs text-muted-foreground">Total Withdrawals</p>
                <p className="text-lg font-bold text-red-600">
                  ₹{walletTransactions
                    .filter(t => t.type === 'debit')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">{walletTransactions.filter(t => t.type === 'debit').length} transactions</p>
              </Card>
            </>
          )}
        </div>

        {/* Combined Total */}
        <Card className="p-3 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <p className="text-xs text-muted-foreground">{isMale ? "Total Spending (Chats + Videos + Gifts + Private Calls)" : "Total Earnings (Chats + Videos + Gifts + Private Calls)"}</p>
          <p className="text-xl font-bold text-primary">
            ₹{(
              (isMale 
                ? walletTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + Number(t.amount), 0)
                : womenEarnings.reduce((sum, e) => sum + Number(e.amount), 0)
              )
            ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isMale 
              ? `${walletTransactions.filter(t => t.type === 'debit').length} total debits` 
              : `${womenEarnings.length} total earnings`}
          </p>
          {!isMale && (
            <div className="mt-2 pt-2 border-t border-primary/10">
              <p className="text-xs text-muted-foreground">Total Withdrawals</p>
              <p className="text-lg font-bold text-destructive">
                ₹{withdrawalRequests
                  .filter(w => w.status !== 'rejected')
                  .reduce((sum, w) => sum + Number(w.amount), 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </Card>

        {/* Transaction Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn("grid w-full mb-4", isMale ? "grid-cols-4" : "grid-cols-5")}>
            <TabsTrigger value="chats" className="text-xs">Chats</TabsTrigger>
            <TabsTrigger value="video" className="text-xs">Video</TabsTrigger>
            <TabsTrigger value="private" className="text-xs">Private</TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs">Gifts</TabsTrigger>
            {!isMale && <TabsTrigger value="withdrawals" className="text-xs">Withdrawals</TabsTrigger>}
          </TabsList>



          {/* Chat Sessions */}
          <TabsContent value="chats" className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">Total: {chatSessions.length} entries</p>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-3 pr-4">
                {chatSessions.map((session) => (
                  <Card key={session.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          isMale ? "bg-destructive/10" : "bg-green-500/10"
                        )}>
                          <MessageCircle className={cn(
                            "h-4 w-4",
                            isMale ? "text-destructive" : "text-green-600"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                Chat with {session.partner_name}
                              </span>
                              {getStatusBadge(session.status)}
                            </div>
                            <span className={cn(
                              "font-semibold whitespace-nowrap",
                              isMale ? "text-destructive" : "text-green-600"
                            )}>
                            {(() => {
                              const ratePerMin = isMale ? (chatPricing?.ratePerMinute || 4) : (chatPricing?.womenEarningRate || 2);
                              const totalSeconds = Math.round(Number(session.total_minutes) * 60);
                              const amount = (totalSeconds / 60) * ratePerMin;
                              return `${isMale ? "-" : "+"}₹${amount.toFixed(2)}`;
                            })()}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(Number(session.total_minutes))}
                            </span>
                            <span className="flex items-center gap-1">
                              <IndianRupee className="h-3 w-3" />
                              ₹{isMale ? (chatPricing?.ratePerMinute || 4) : (chatPricing?.womenEarningRate || 2)}/min • ₹{((isMale ? (chatPricing?.ratePerMinute || 4) : (chatPricing?.womenEarningRate || 2)) / 60).toFixed(4)}/sec
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(session.started_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {session.end_reason && (
                            <p className="text-xs text-amber-600 mt-1">
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

          {/* Video Call Sessions */}
          <TabsContent value="video" className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">Total: {videoCallSessions.length} entries</p>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-3 pr-4">
                {videoCallSessions.map((session) => (
                  <Card key={session.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          isMale ? "bg-purple-500/10" : "bg-pink-500/10"
                        )}>
                          <Video className={cn(
                            "h-4 w-4",
                            isMale ? "text-purple-500" : "text-pink-500"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                Video with {session.partner_name}
                              </span>
                              {getStatusBadge(session.status)}
                            </div>
                            <span className={cn(
                              "font-semibold whitespace-nowrap",
                              isMale ? "text-purple-600" : "text-pink-600"
                            )}>
                            {(() => {
                              const ratePerMin = isMale ? (chatPricing?.videoRatePerMinute || 8) : (chatPricing?.videoWomenEarningRate || 4);
                              const totalSeconds = Math.round(Number(session.total_minutes) * 60);
                              const amount = (totalSeconds / 60) * ratePerMin;
                              return `${isMale ? "-" : "+"}₹${amount.toFixed(2)}`;
                            })()}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(Number(session.total_minutes))}
                            </span>
                            <span className="flex items-center gap-1">
                              <IndianRupee className="h-3 w-3" />
                              ₹{isMale ? (chatPricing?.videoRatePerMinute || 8) : (chatPricing?.videoWomenEarningRate || 4)}/min • ₹{((isMale ? (chatPricing?.videoRatePerMinute || 8) : (chatPricing?.videoWomenEarningRate || 4)) / 60).toFixed(4)}/sec
                            </span>
                            {session.started_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(session.started_at), "MMM d, h:mm a")}
                              </span>
                            )}
                          </div>
                          {session.end_reason && (
                            <p className="text-xs text-amber-600 mt-1">
                              {getEndReasonText(session.end_reason)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {videoCallSessions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No video calls yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>


          {/* Private Calls */}
          <TabsContent value="private" className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">Total: {privateCalls.length} entries</p>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-3 pr-4">
                {privateCalls.map((pc: any) => (
                  <Card key={pc.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          isMale ? "bg-pink-500/10" : "bg-emerald-500/10"
                        )}>
                          <Video className={cn(
                            "h-4 w-4",
                            isMale ? "text-pink-500" : "text-emerald-600"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                Private call with {pc.partner_name}
                              </span>
                              {getStatusBadge(pc.status)}
                            </div>
                            <span className={cn(
                              "font-semibold whitespace-nowrap",
                              isMale ? "text-pink-600" : "text-emerald-600"
                            )}>
                              {isMale ? `-₹${Number(pc.gift_amount).toFixed(2)}` : `+₹${Number(pc.woman_earnings || 0).toFixed(2)}`}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {pc.duration_seconds ? formatDuration(pc.duration_seconds / 60) : "30 min access"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Gift className="h-3 w-3" />
                              Gift: ₹{Number(pc.gift_amount).toFixed(0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(pc.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {privateCalls.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No private calls yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Gift Transactions */}
          <TabsContent value="wallet" className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">Total: {giftTransactions.length} entries</p>
            <ScrollArea className="h-[calc(100vh-300px)]">
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
                                {gift.gift_name} {gift.is_sender ? "to" : "from"} {gift.partner_name}
                              </span>
                              {getStatusBadge(gift.status)}
                            </div>
                            <span className={cn(
                              "font-semibold whitespace-nowrap",
                              gift.is_sender ? "text-destructive" : "text-green-600"
                            )}>
                              {gift.is_sender ? "-" : "+"}₹{(gift.is_sender ? Number(gift.price_paid) : Number(gift.price_paid) * 0.5).toFixed(2)}
                            </span>
                          </div>
                          {!gift.is_sender && (
                            <p className="text-xs text-muted-foreground mt-1">
                              (50% of ₹{Number(gift.price_paid).toFixed(2)} gift value)
                            </p>
                          )}
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

          {/* Withdrawals */}
          <TabsContent value="withdrawals" className="space-y-3">
            <p className="text-xs text-muted-foreground mb-2">Total: {withdrawalRequests.length} entries</p>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-3 pr-4">
                {withdrawalRequests.map((wr) => (
                  <Card key={wr.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-red-500/10">
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">Withdrawal</span>
                              {getStatusBadge(wr.status)}
                            </div>
                            <span className="font-semibold text-red-600 whitespace-nowrap">
                              -₹{Number(wr.amount).toFixed(2)}
                            </span>
                          </div>
                          {wr.payment_method && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Via {wr.payment_method}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Requested: {format(new Date(wr.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {wr.processed_at && (
                            <p className="text-xs text-muted-foreground">
                              Processed: {format(new Date(wr.processed_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          )}
                          {wr.rejection_reason && (
                            <p className="text-xs text-destructive mt-1">
                              Reason: {wr.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {withdrawalRequests.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No withdrawal requests yet</p>
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

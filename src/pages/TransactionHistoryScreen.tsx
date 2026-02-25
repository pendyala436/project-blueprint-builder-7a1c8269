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
  Wallet,
  Home,
  Users
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
  created_at: string;
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
  const [activeTab, setActiveTab] = useState("statement");
  const [openingBalance, setOpeningBalance] = useState<number>(0);

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
          ratePerMinute: Number(pricingData.rate_per_minute) || 0,
          videoRatePerMinute: Number(pricingData.video_rate_per_minute) || 0,
          womenEarningRate: Number(pricingData.women_earning_rate) || 0,
          videoWomenEarningRate: Number(pricingData.video_women_earning_rate) || 0,
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
        const walletBalance = Number(wallet.balance) || 0;

        // For men: use wallet balance. For women: calculate from earnings - debits
        if (gender === 'male') {
          setCurrentBalance(walletBalance);
        } else {
          const [{ data: allEarnings }, { data: allDebits }] = await Promise.all([
            supabase.from("women_earnings").select("amount").eq("user_id", user.id),
            supabase.from("wallet_transactions").select("amount").eq("user_id", user.id).eq("type", "debit")
          ]);
          const totalEarnings = allEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
          const totalDebits = allDebits?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          setCurrentBalance(totalEarnings - totalDebits);
        }

        // Fetch ALL wallet transactions (no limit)
        const { data: txData } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", wallet.id)
          .order("created_at", { ascending: false });

        // Calculate opening balance anchored to wallet.balance for men
        const currentMonthStart = new Date();
        currentMonthStart.setDate(1);
        currentMonthStart.setHours(0, 0, 0, 0);
        const monthStartISO = currentMonthStart.toISOString();

        let calcOpeningBal = 0;

        if (gender === 'male') {
          // Anchor to wallet.balance: openingBal = walletBalance - thisMonthCredits + thisMonthDebits
          let thisMonthCredits = 0, thisMonthDebits = 0;
          txData?.forEach(tx => {
            if (new Date(tx.created_at) >= currentMonthStart) {
              if (tx.type === 'credit') thisMonthCredits += Number(tx.amount);
              else thisMonthDebits += Number(tx.amount);
            }
          });
          calcOpeningBal = walletBalance - thisMonthCredits + thisMonthDebits;
        } else {
          // For women: sum prior wallet_transactions + prior earnings
          const { data: priorWalletTx } = await supabase
            .from("wallet_transactions")
            .select("type, amount")
            .eq("user_id", user.id)
            .lt("created_at", monthStartISO);

          priorWalletTx?.forEach(tx => {
            if (tx.type === 'credit') calcOpeningBal += Number(tx.amount);
            else calcOpeningBal -= Number(tx.amount);
          });

          const { data: priorEarningsForOpening } = await supabase
            .from("women_earnings")
            .select("amount")
            .eq("user_id", user.id)
            .lt("created_at", monthStartISO);
          priorEarningsForOpening?.forEach(e => {
            calcOpeningBal += Number(e.amount);
          });
        }

        setOpeningBalance(calcOpeningBal);

        // Calculate running balance anchored to wallet.balance for men
        const sortedTx = [...(txData || [])].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // For men: work backwards from wallet.balance to assign running balances
        // For women: work forwards from earnings
        const balanceMap = new Map<string, number>();
        
        if (gender === 'male') {
          // Reverse iterate: start from walletBalance, subtract credits / add debits going backwards
          let bal = walletBalance;
          for (let i = sortedTx.length - 1; i >= 0; i--) {
            const tx = sortedTx[i];
            balanceMap.set(tx.id, bal);
            // Undo this transaction to get balance before it
            if (tx.type === 'credit') {
              bal -= Number(tx.amount);
            } else {
              bal += Number(tx.amount);
            }
          }
        } else {
          let calculatedBalance = 0;
          if (sortedTx.length > 0) {
            const firstTxDate = sortedTx[0].created_at;
            const { data: priorEarnings } = await supabase
              .from("women_earnings")
              .select("amount")
              .eq("user_id", user.id)
              .lt("created_at", firstTxDate);
            calculatedBalance = priorEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
          }
          sortedTx.forEach(tx => {
            if (tx.type === 'credit') {
              calculatedBalance += Number(tx.amount);
            } else {
              calculatedBalance -= Number(tx.amount);
            }
            balanceMap.set(tx.id, calculatedBalance);
          });
        }

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
    const seenIds = new Set<string>(); // Prevent duplicates

    // For men: wallet_transactions is the SINGLE source of truth
    // For women: wallet_transactions has debits, women_earnings has credits (earnings)

    // Build a gift lookup map for enriching descriptions
    const giftLookup = new Map<string, GiftTransaction>();
    gifts.forEach(g => {
      giftLookup.set(g.id, g);
    });

    // Add wallet_transactions (both genders)
    walletTx.forEach(tx => {
      if (seenIds.has(tx.id)) return;
      seenIds.add(tx.id);

      const desc = tx.description?.toLowerCase() || '';
      const isRecharge = tx.type === 'credit' && desc.includes('recharge');
      const isWithdrawal = desc.includes('withdrawal');
      const isGift = desc.includes('gift');
      const isChat = desc.includes('chat');
      const isVideo = desc.includes('video');

      let type: UnifiedTransaction['type'] = 'other';
      let icon: UnifiedTransaction['icon'] = 'arrow';

      if (isRecharge) { type = 'recharge'; icon = 'wallet'; }
      else if (isWithdrawal) { type = 'withdrawal'; icon = 'wallet'; }
      else if (isGift) { type = 'gift'; icon = 'gift'; }
      else if (isChat) { type = 'chat'; icon = 'chat'; }
      else if (isVideo) { type = 'video'; icon = 'video'; }

      // Try to enrich gift descriptions with gift name/emoji
      let description = tx.description || (tx.type === 'credit' ? 'Credit' : 'Debit');
      if (isGift) {
        const matchingGift = gifts.find(g => 
          Math.abs(new Date(g.created_at).getTime() - new Date(tx.created_at).getTime()) < 3000
        );
        if (matchingGift) {
          description = `${matchingGift.gift_emoji} ${matchingGift.is_sender ? 'Sent' : 'Received'} ${matchingGift.gift_name} ${matchingGift.is_sender ? 'to' : 'from'} ${matchingGift.partner_name}`;
        }
      }

      unified.push({
        id: tx.id,
        type,
        amount: Number(tx.amount),
        description,
        created_at: tx.created_at,
        status: tx.status,
        balance_after: tx.balance_after,
        is_credit: tx.type === 'credit',
        icon,
        details: tx.reference_id ? `Ref: ${tx.reference_id}` : undefined
      });
    });

    // For women: add earnings from women_earnings as deposits (single source of truth for credits)
    if (!isMale) {
      womenEarnings.forEach(earning => {
        const earningId = `earning-${earning.id}`;
        if (seenIds.has(earningId)) return;
        seenIds.add(earningId);

        const earningType = earning.earning_type?.toLowerCase() || '';
        let type: UnifiedTransaction['type'] = 'other';
        let icon: UnifiedTransaction['icon'] = 'arrow';
        let description = earning.description || 'Earning';

        if (earningType.includes('chat')) {
          type = 'chat'; icon = 'chat';
          description = earning.description || `Chat earning${earning.partner_name ? ` from ${earning.partner_name}` : ''}`;
        } else if (earningType.includes('video')) {
          type = 'video'; icon = 'video';
          description = earning.description || `Video call earning${earning.partner_name ? ` from ${earning.partner_name}` : ''}`;
        } else if (earningType.includes('gift')) {
          type = 'gift'; icon = 'gift';
          description = earning.description || `Gift earning${earning.partner_name ? ` from ${earning.partner_name}` : ''}`;
        } else if (earningType.includes('private')) {
          type = 'video'; icon = 'video';
          description = earning.description || `Private call earning${earning.partner_name ? ` from ${earning.partner_name}` : ''}`;
        }

        unified.push({
          id: earningId,
          type,
          amount: Number(earning.amount),
          description,
          created_at: earning.created_at,
          status: 'completed',
          is_credit: true,
          icon,
        });
      });
    }

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
  }, [walletTransactions, chatSessions, videoCallSessions, giftTransactions, womenEarnings, userGender, loading]);

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
          <div className="flex items-center gap-2">
            <Button
              variant="auroraGhost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="auroraGhost"
              size="icon"
              onClick={() => navigate(isMale ? '/dashboard' : '/women-dashboard')}
              className="rounded-full"
            >
              <Home className="h-5 w-5" />
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
                ₹{currentBalance.toFixed(2)}
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
        {/* Opening Balance Carry Forward */}
        <Card className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <div>
                <p className="text-xs font-semibold">Opening Balance (Carry Forward)</p>
                <p className="text-[10px] text-muted-foreground">
                  Net balance carried from previous month on 1st 00:00 AM • ACID verified
                </p>
              </div>
            </div>
            <p className="text-lg font-bold text-primary">
              ₹{openingBalance.toFixed(2)}
            </p>
          </div>
        </Card>

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
              {chatSessions.length} sessions • from transaction records
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
              {videoCallSessions.length + privateCalls.length} calls • from transaction records
            </p>
          </Card>
          <Card className="p-3 text-center bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
            <Gift className="h-4 w-4 mx-auto mb-1 text-amber-600" />
            <p className="text-xs text-muted-foreground">Gifts & Tips</p>
            <p className="text-lg font-bold text-amber-600">
              ₹{(isMale
                ? walletTransactions.filter(t => t.type === 'debit' && (t.description?.toLowerCase().includes('gift') || t.description?.toLowerCase().includes('tip'))).reduce((sum, t) => sum + Number(t.amount), 0)
                : womenEarnings.filter(e => e.earning_type === 'gift').reduce((sum, e) => sum + Number(e.amount), 0)
              ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground">{giftTransactions.length} gifts/tips</p>
          </Card>
          <Card className="p-3 text-center bg-gradient-to-br from-teal-500/5 to-teal-500/10 border-teal-500/20">
            <Users className="h-4 w-4 mx-auto mb-1 text-teal-600" />
            <p className="text-xs text-muted-foreground">Group Calls</p>
            <p className="text-lg font-bold text-teal-600">
              ₹{(isMale
                ? walletTransactions.filter(t => t.type === 'debit' && t.description?.toLowerCase().includes('group')).reduce((sum, t) => sum + Number(t.amount), 0)
                : womenEarnings.filter(e => e.description?.toLowerCase().includes('group')).reduce((sum, e) => sum + Number(e.amount), 0)
              ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isMale 
                ? `${walletTransactions.filter(t => t.type === 'debit' && t.description?.toLowerCase().includes('group')).length} entries`
                : `${womenEarnings.filter(e => e.description?.toLowerCase().includes('group')).length} entries`}
            </p>
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
                <p className="text-xs text-muted-foreground">Total Debits</p>
                <p className="text-lg font-bold text-red-600">
                  ₹{walletTransactions
                    .filter(t => t.type === 'debit')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <div className="mt-1 space-y-0.5">
                  {walletTransactions.filter(t => t.type === 'debit').map(t => (
                    <p key={t.id} className="text-[10px] text-muted-foreground truncate">
                      {t.description || 'Debit'} — ₹{Number(t.amount).toLocaleString()}
                    </p>
                  ))}
                </div>
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
          <TabsList className={cn("grid w-full mb-4", isMale ? "grid-cols-6" : "grid-cols-7")}>
            <TabsTrigger value="statement" className="text-xs">Statement</TabsTrigger>
            <TabsTrigger value="chats" className="text-xs">Chats</TabsTrigger>
            <TabsTrigger value="video" className="text-xs">Video</TabsTrigger>
            <TabsTrigger value="group" className="text-xs">Group</TabsTrigger>
            <TabsTrigger value="private" className="text-xs">Private</TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs">Gifts</TabsTrigger>
            {!isMale && <TabsTrigger value="withdrawals" className="text-xs">Withdrawals</TabsTrigger>}
          </TabsList>

          {/* Bank Statement */}
          <TabsContent value="statement" className="space-y-3">
            {/* Statement Header */}
            <Card className="p-4 border-primary/20">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Company:</span><span className="font-semibold">Meow-meow</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Account Status:</span><span className="font-semibold text-green-600">Active</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Nominee Details:</span><span className="font-semibold">Not Registered</span></div>
              </div>
            </Card>

            <p className="text-xs text-muted-foreground mb-2">Total: {unifiedTransactions.length} entries</p>
            <ScrollArea className="h-[calc(100vh-400px)]">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-muted/50 rounded-t-lg text-[10px] font-semibold text-muted-foreground sticky top-0 z-10">
                <div className="col-span-2">Date</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-right text-destructive">Withdrawal</div>
                <div className="col-span-2 text-right text-green-600">Deposit</div>
                <div className="col-span-2 text-right">Balance</div>
              </div>

              {/* Opening Balance Row */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 border-b border-border text-xs bg-primary/5">
                <div className="col-span-2 text-muted-foreground">
                  {format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "dd/MM")}
                </div>
                <div className="col-span-4 font-medium">Opening Balance (C/F)</div>
                <div className="col-span-2"></div>
                <div className="col-span-2"></div>
                <div className="col-span-2 text-right font-semibold">₹{openingBalance.toFixed(2)}</div>
              </div>

              {/* Transaction Rows */}
              <div className="space-y-0">
                {unifiedTransactions.map((tx) => (
                  <div key={tx.id} className="grid grid-cols-12 gap-1 px-3 py-2 border-b border-border/50 text-xs hover:bg-muted/30 transition-colors">
                    <div className="col-span-2 text-muted-foreground">
                      {format(new Date(tx.created_at), "dd/MM HH:mm")}
                    </div>
                    <div className="col-span-4 truncate" title={tx.description}>
                      {tx.description}
                    </div>
                    <div className="col-span-2 text-right text-destructive font-medium">
                      {!tx.is_credit ? `₹${tx.amount.toFixed(2)}` : ''}
                    </div>
                    <div className="col-span-2 text-right text-green-600 font-medium">
                      {tx.is_credit ? `₹${tx.amount.toFixed(2)}` : ''}
                    </div>
                    <div className="col-span-2 text-right font-semibold">
                      {tx.balance_after !== undefined ? `₹${tx.balance_after.toFixed(2)}` : '-'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Closing Balance */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-primary/5 rounded-b-lg text-xs border-t border-primary/20">
                <div className="col-span-2 text-muted-foreground">Today</div>
                <div className="col-span-4 font-semibold">Closing Balance</div>
                <div className="col-span-2"></div>
                <div className="col-span-2"></div>
                <div className="col-span-2 text-right font-bold text-primary">₹{currentBalance.toFixed(2)}</div>
              </div>

              {unifiedTransactions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No transactions yet</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>


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
                              // For men: find matching wallet_transaction debit for this session (ACID source of truth)
                              // For women: use total_earned from session
                              if (isMale) {
                                const matchingDebit = walletTransactions.find(t => 
                                  t.type === 'debit' && 
                                  t.description?.toLowerCase().includes('chat') &&
                                  Math.abs(new Date(t.created_at).getTime() - new Date(session.started_at).getTime()) < 60000
                                );
                                if (matchingDebit) return `-₹${Number(matchingDebit.amount).toFixed(2)}`;
                                // Fallback: sum all chat debits matching this session timeframe
                                const sessionDebits = walletTransactions.filter(t =>
                                  t.type === 'debit' &&
                                  t.description?.toLowerCase().includes('chat') &&
                                  new Date(t.created_at) >= new Date(session.started_at) &&
                                  (!session.ended_at || new Date(t.created_at) <= new Date(session.ended_at))
                                );
                                const totalDebited = sessionDebits.reduce((sum, t) => sum + Number(t.amount), 0);
                                return `-₹${totalDebited.toFixed(2)}`;
                              } else {
                                const amount = Number(session.total_earned) || 0;
                                return `+₹${amount.toFixed(2)}`;
                              }
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
                              ₹{Number(session.rate_per_minute) || 0}/min (session rate)
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
                              // For men: find matching wallet_transaction debit for this video session (ACID source of truth)
                              // For women: use total_earned from session
                              if (isMale) {
                                const matchingDebit = walletTransactions.find(t => 
                                  t.type === 'debit' && 
                                  t.description?.toLowerCase().includes('video') &&
                                  Math.abs(new Date(t.created_at).getTime() - new Date(session.started_at || session.created_at).getTime()) < 60000
                                );
                                if (matchingDebit) return `-₹${Number(matchingDebit.amount).toFixed(2)}`;
                                const sessionDebits = walletTransactions.filter(t =>
                                  t.type === 'debit' &&
                                  t.description?.toLowerCase().includes('video') &&
                                  new Date(t.created_at) >= new Date(session.started_at || session.created_at) &&
                                  (!session.ended_at || new Date(t.created_at) <= new Date(session.ended_at))
                                );
                                const totalDebited = sessionDebits.reduce((sum, t) => sum + Number(t.amount), 0);
                                return `-₹${totalDebited.toFixed(2)}`;
                              } else {
                                const amount = Number(session.total_earned) || 0;
                                return `+₹${amount.toFixed(2)}`;
                              }
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
                              ₹{Number(session.rate_per_minute) || 0}/min (session rate)
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

          {/* Group Calls & Tips */}
          <TabsContent value="group" className="space-y-3">
            {(() => {
              const groupSpending = isMale 
                ? walletTransactions.filter(t => t.type === 'debit' && t.description?.toLowerCase().includes('group'))
                : [];
              const groupEarnings = !isMale 
                ? womenEarnings.filter(e => e.description?.toLowerCase().includes('group'))
                : [];
              const groupTips = isMale
                ? walletTransactions.filter(t => t.type === 'debit' && t.description?.toLowerCase().includes('group tip'))
                : womenEarnings.filter(e => e.description?.toLowerCase().includes('group tip'));
              const groupCallEntries = isMale
                ? walletTransactions.filter(t => t.type === 'debit' && t.description?.toLowerCase().includes('private group call'))
                : womenEarnings.filter(e => e.description?.toLowerCase().includes('private group call'));

              const totalAmount = isMale
                ? groupSpending.reduce((sum, t) => sum + Number(t.amount), 0)
                : groupEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
              const tipAmount = groupTips.reduce((sum, t) => sum + Number(t.amount), 0);
              const callAmount = groupCallEntries.reduce((sum, t) => sum + Number(t.amount), 0);

              return (
                <>
                  {/* Group Summary */}
                  <div className="grid grid-cols-3 gap-2">
                    <Card className="p-3 text-center bg-gradient-to-br from-teal-500/5 to-teal-500/10 border-teal-500/20">
                      <p className="text-[10px] text-muted-foreground">{isMale ? 'Total Spent' : 'Total Earned'}</p>
                      <p className="text-lg font-bold text-teal-600">₹{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    </Card>
                    <Card className="p-3 text-center bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                      <p className="text-[10px] text-muted-foreground">Call {isMale ? 'Charges' : 'Earnings'}</p>
                      <p className="text-lg font-bold text-blue-600">₹{callAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-muted-foreground">{groupCallEntries.length} entries</p>
                    </Card>
                    <Card className="p-3 text-center bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
                      <p className="text-[10px] text-muted-foreground">Tips {isMale ? 'Sent' : 'Received'}</p>
                      <p className="text-lg font-bold text-amber-600">₹{tipAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-muted-foreground">{groupTips.length} tips</p>
                    </Card>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {isMale ? `Men pay ₹${chatPricing?.ratePerMinute || 4}/min per group call` : `Host earns ₹${chatPricing?.womenEarningRate || 2}/min per participant`} • Tips: {isMale ? 'full deducted' : '50% credited'}
                  </p>

                  {/* Group Call Entries */}
                  {groupCallEntries.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground mt-2">📞 Group Call {isMale ? 'Charges' : 'Earnings'}</p>
                      <ScrollArea className="max-h-[300px]">
                        <div className="space-y-2">
                          {groupCallEntries.map((entry: any) => (
                            <Card key={entry.id} className="overflow-hidden">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("p-1.5 rounded-full", isMale ? "bg-destructive/10" : "bg-green-500/10")}>
                                      <Users className={cn("h-3.5 w-3.5", isMale ? "text-destructive" : "text-green-600")} />
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium truncate max-w-[200px]">{entry.description}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {format(new Date(entry.created_at), "MMM d, h:mm a")}
                                      </p>
                                    </div>
                                  </div>
                                  <span className={cn("text-sm font-semibold", isMale ? "text-destructive" : "text-green-600")}>
                                    {isMale ? '-' : '+'}₹{Number(entry.amount).toFixed(2)}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  )}

                  {/* Tip Entries */}
                  {groupTips.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground mt-2">🎫 Group Tips</p>
                      <ScrollArea className="max-h-[300px]">
                        <div className="space-y-2">
                          {groupTips.map((entry: any) => (
                            <Card key={entry.id} className="overflow-hidden">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("p-1.5 rounded-full", isMale ? "bg-amber-500/10" : "bg-amber-500/10")}>
                                      <Gift className={cn("h-3.5 w-3.5 text-amber-600")} />
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium truncate max-w-[200px]">{entry.description}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {format(new Date(entry.created_at), "MMM d, h:mm a")}
                                      </p>
                                    </div>
                                  </div>
                                  <span className={cn("text-sm font-semibold", isMale ? "text-destructive" : "text-green-600")}>
                                    {isMale ? '-' : '+'}₹{Number(entry.amount).toFixed(2)}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  )}

                  {groupCallEntries.length === 0 && groupTips.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No group call transactions yet</p>
                    </div>
                  )}
                </>
              );
            })()}
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
                              {isMale 
                                ? `-₹${Number(pc.gift_amount).toFixed(2)}` 
                                : `+₹${Number(pc.woman_earnings || 0).toFixed(2)}`}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {pc.duration_seconds 
                                ? formatDuration(pc.duration_seconds / 60) 
                                : pc.access_expires_at 
                                  ? `${Math.round((new Date(pc.access_expires_at).getTime() - new Date(pc.created_at).getTime()) / 60000)} min access`
                                  : "N/A"}
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
                              {gift.is_sender 
                                ? `-₹${Number(gift.price_paid).toFixed(2)}`
                                : (() => {
                                    // Find actual earning from women_earnings for this gift
                                    const matchingEarning = womenEarnings.find(e => 
                                      e.earning_type === 'gift' && 
                                      Math.abs(new Date(e.created_at).getTime() - new Date(gift.created_at).getTime()) < 5000
                                    );
                                    return `+₹${(matchingEarning ? Number(matchingEarning.amount) : Number(gift.price_paid)).toFixed(2)}`;
                                  })()
                              }
                            </span>
                          </div>
                          {!gift.is_sender && (() => {
                            const matchingEarning = womenEarnings.find(e => 
                              e.earning_type === 'gift' && 
                              Math.abs(new Date(e.created_at).getTime() - new Date(gift.created_at).getTime()) < 5000
                            );
                            const earnedAmount = matchingEarning ? Number(matchingEarning.amount) : null;
                            const percentage = earnedAmount ? Math.round((earnedAmount / Number(gift.price_paid)) * 100) : null;
                            return percentage ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                ({percentage}% of ₹{Number(gift.price_paid).toFixed(2)} gift value)
                              </p>
                            ) : null;
                          })()}
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

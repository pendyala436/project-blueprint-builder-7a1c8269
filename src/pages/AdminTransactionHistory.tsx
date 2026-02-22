/**
 * AdminTransactionHistory.tsx
 * 
 * PURPOSE: Admin view of all platform transactions with ACID compliance
 * Shows wallet transactions, chat sessions, video calls, gifts, earnings, withdrawals
 * 
 * ACID COMPLIANCE:
 * - All data fetched directly from database (no hardcoded values)
 * - Real-time subscriptions for live updates
 * - Uses atomic transaction functions for any operations
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminNav from "@/components/AdminNav";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft,
  MessageCircle,
  Clock,
  IndianRupee,
  RefreshCw,
  Calendar,
  User,
  Search,
  Video,
  Gift,
  Wallet,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  reference_id: string | null;
  user_name?: string;
  user_gender?: string;
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
  man_name?: string;
  woman_name?: string;
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
  man_name?: string;
  woman_name?: string;
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
  sender_name?: string;
  receiver_name?: string;
  gift_name?: string;
}

interface WomenEarning {
  id: string;
  user_id: string;
  amount: number;
  earning_type: string;
  description: string | null;
  created_at: string;
  shift_id?: string;
  chat_id?: string;
  user_name?: string;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  processed_at: string | null;
  user_name?: string;
}

interface PlatformStats {
  totalRevenue: number;
  totalEarningsPaid: number;
  totalWithdrawals: number;
  platformProfit: number;
  totalTransactions: number;
  totalChatSessions: number;
  totalVideoCalls: number;
  totalGiftsSent: number;
}

const AdminTransactionHistory = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("statement");
  const [dateRange, setDateRange] = useState("7");
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "men" | "women">("all");
  
  // Data states
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [videoCallSessions, setVideoCallSessions] = useState<VideoCallSession[]>([]);
  const [giftTransactions, setGiftTransactions] = useState<GiftTransaction[]>([]);
  const [womenEarnings, setWomenEarnings] = useState<WomenEarning[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<PlatformStats>({
    totalRevenue: 0,
    totalEarningsPaid: 0,
    totalWithdrawals: 0,
    platformProfit: 0,
    totalTransactions: 0,
    totalChatSessions: 0,
    totalVideoCalls: 0,
    totalGiftsSent: 0
  });
  const [menStats, setMenStats] = useState({ transactions: 0, spent: 0, giftsSent: 0 });
  const [womenStats, setWomenStats] = useState({ transactions: 0, earned: 0, withdrawals: 0 });

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      loadAllData();
    }
  }, [adminLoading, isAdmin, dateRange]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('admin-transaction-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_chat_sessions' }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_call_sessions' }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_transactions' }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_earnings' }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => loadAllData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAllData = async () => {
    try {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days)).toISOString();

      // Fetch all data in parallel for efficiency
      const [
        walletTxnsResult,
        chatSessionsResult,
        videoCallsResult,
        giftsResult,
        earningsResult,
        withdrawalsResult
      ] = await Promise.all([
        supabase
          .from("wallet_transactions")
          .select("*")
          .gte("created_at", startDate)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("active_chat_sessions")
          .select("*")
          .gte("started_at", startDate)
          .order("started_at", { ascending: false })
          .limit(500),
        supabase
          .from("video_call_sessions")
          .select("*")
          .gte("created_at", startDate)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("gift_transactions")
          .select("*")
          .gte("created_at", startDate)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("shift_earnings")
          .select("*")
          .gte("created_at", startDate)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("withdrawal_requests")
          .select("*")
          .gte("created_at", startDate)
          .order("created_at", { ascending: false })
          .limit(500)
      ]);

      // Extract user IDs for profile enrichment
      const allUserIds = new Set<string>();
      
      walletTxnsResult.data?.forEach(t => allUserIds.add(t.user_id));
      chatSessionsResult.data?.forEach(s => {
        allUserIds.add(s.man_user_id);
        allUserIds.add(s.woman_user_id);
      });
      videoCallsResult.data?.forEach(s => {
        allUserIds.add(s.man_user_id);
        allUserIds.add(s.woman_user_id);
      });
      giftsResult.data?.forEach(g => {
        allUserIds.add(g.sender_id);
        allUserIds.add(g.receiver_id);
      });
      earningsResult.data?.forEach(e => allUserIds.add(e.user_id));
      withdrawalsResult.data?.forEach(w => allUserIds.add(w.user_id));

      // Fetch profiles for enrichment
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, gender")
        .in("user_id", Array.from(allUserIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch gift names
      const giftIds = giftsResult.data?.map(g => g.gift_id) || [];
      const { data: gifts } = await supabase
        .from("gifts")
        .select("id, name")
        .in("id", giftIds);
      const giftMap = new Map(gifts?.map(g => [g.id, g.name]) || []);

      // Enrich data with profile info
      const enrichedWalletTxns = (walletTxnsResult.data || []).map(t => ({
        ...t,
        user_name: profileMap.get(t.user_id)?.full_name || "Unknown",
        user_gender: profileMap.get(t.user_id)?.gender || "Unknown"
      }));

      const enrichedChatSessions = (chatSessionsResult.data || []).map(s => ({
        ...s,
        man_name: profileMap.get(s.man_user_id)?.full_name || "Unknown",
        woman_name: profileMap.get(s.woman_user_id)?.full_name || "Unknown"
      }));

      const enrichedVideoCalls = (videoCallsResult.data || []).map(s => ({
        ...s,
        man_name: profileMap.get(s.man_user_id)?.full_name || "Unknown",
        woman_name: profileMap.get(s.woman_user_id)?.full_name || "Unknown"
      }));

      const enrichedGifts = (giftsResult.data || []).map(g => ({
        ...g,
        sender_name: profileMap.get(g.sender_id)?.full_name || "Unknown",
        receiver_name: profileMap.get(g.receiver_id)?.full_name || "Unknown",
        gift_name: giftMap.get(g.gift_id) || "Unknown Gift"
      }));

      const enrichedEarnings = (earningsResult.data || []).map(e => ({
        ...e,
        user_name: profileMap.get(e.user_id)?.full_name || "Unknown"
      }));

      const enrichedWithdrawals = (withdrawalsResult.data || []).map(w => ({
        ...w,
        user_name: profileMap.get(w.user_id)?.full_name || "Unknown"
      }));

      setWalletTransactions(enrichedWalletTxns);
      setChatSessions(enrichedChatSessions);
      setVideoCallSessions(enrichedVideoCalls);
      setGiftTransactions(enrichedGifts);
      setWomenEarnings(enrichedEarnings);
      setWalletTransactions(enrichedWalletTxns);
      setChatSessions(enrichedChatSessions);
      setVideoCallSessions(enrichedVideoCalls);
      setGiftTransactions(enrichedGifts);
      setWomenEarnings(enrichedEarnings);
      setWithdrawalRequests(enrichedWithdrawals);

      // Calculate stats from REAL database data only - no defaults or fallbacks
      const creditTxns = enrichedWalletTxns.filter(t => t.type === "credit" && t.status === "completed");
      const debitTxns = enrichedWalletTxns.filter(t => t.type === "debit" && t.status === "completed");
      
      const totalCredits = creditTxns.length > 0 
        ? creditTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
        : 0;
      
      const totalDebits = debitTxns.length > 0
        ? debitTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
        : 0;

      const totalEarningsPaid = enrichedEarnings.length > 0
        ? enrichedEarnings.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
        : 0;

      const completedWithdrawalsList = enrichedWithdrawals.filter(w => w.status === "completed");
      const completedWithdrawals = completedWithdrawalsList.length > 0
        ? completedWithdrawalsList.reduce((sum, w) => sum + (Number(w.amount) || 0), 0)
        : 0;

      // Calculate men stats (debits = spending)
      const menTxns = enrichedWalletTxns.filter(t => t.user_gender?.toLowerCase() === "male");
      const menDebitTxns = menTxns.filter(t => t.type === "debit" && t.status === "completed");
      const menSpent = menDebitTxns.length > 0
        ? menDebitTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
        : 0;
      
      setMenStats({
        transactions: menTxns.length,
        spent: menSpent,
        giftsSent: enrichedGifts.length
      });

      // Calculate women stats (earnings)
      const womenTxns = enrichedWalletTxns.filter(t => t.user_gender?.toLowerCase() === "female");
      setWomenStats({
        transactions: womenTxns.length,
        earned: totalEarningsPaid,
        withdrawals: completedWithdrawals
      });

      // Set all stats - only from real data
      // Men deposit money, women withdraw money
      // Profit = Total Deposits - Total Withdrawals
      setStats({
        totalRevenue: totalCredits, // Men's deposits
        totalEarningsPaid: totalEarningsPaid,
        totalWithdrawals: completedWithdrawals, // Women's withdrawals
        platformProfit: totalCredits - completedWithdrawals, // Deposits - Withdrawals
        totalTransactions: enrichedWalletTxns.length,
        totalChatSessions: enrichedChatSessions.length,
        totalVideoCalls: enrichedVideoCalls.length,
        totalGiftsSent: enrichedGifts.length
      });
      
      console.log("Admin Transaction Stats (real data):", {
        creditTransactions: creditTxns.length,
        debitTransactions: debitTxns.length,
        totalCredits,
        totalDebits,
        totalEarningsPaid,
        completedWithdrawals
      });

    } catch (error) {
      console.error("Error loading admin transaction data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "ended":
        return <Badge variant="success">Completed</Badge>;
      case "active":
        return <Badge className="bg-primary/20 text-primary">Active</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "failed":
      case "rejected":
        return <Badge variant="destructive">Failed</Badge>;
      case "ringing":
        return <Badge variant="info">Ringing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes < 1) return "< 1 min";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const filterBySearch = <T extends { user_name?: string; man_name?: string; woman_name?: string; sender_name?: string; receiver_name?: string; user_gender?: string }>(
    items: T[]
  ): T[] => {
    let filtered = items;
    
    // Filter by user group
    if (userFilter !== "all") {
      filtered = filtered.filter(item => {
        const gender = (item as any).user_gender?.toLowerCase();
        if (userFilter === "men") return gender === "male";
        if (userFilter === "women") return gender === "female";
        return true;
      });
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.user_name?.toLowerCase().includes(query) ||
        item.man_name?.toLowerCase().includes(query) ||
        item.woman_name?.toLowerCase().includes(query) ||
        item.sender_name?.toLowerCase().includes(query) ||
        item.receiver_name?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  if (adminLoading || loading) {
    return (
      <AdminNav>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AdminNav>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold text-destructive">Access Denied</h2>
          <p className="text-muted-foreground mt-2">Admin access required</p>
          <Button className="mt-4" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <AdminNav>
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="auroraGhost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Transaction History</h1>
                <p className="text-muted-foreground">Complete platform transaction records</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={userFilter} onValueChange={(v) => setUserFilter(v as "all" | "men" | "women")}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="User Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="men">Men Only</SelectItem>
                  <SelectItem value="women">Women Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Today</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="auroraGhost" size="icon" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Deposits (Men)</p>
                    <p className="text-xl font-bold text-success">₹{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Withdrawals (Women)</p>
                    <p className="text-xl font-bold text-destructive">₹{stats.totalWithdrawals.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Profit (Deposits − Withdrawals)</p>
                    <p className={cn(
                      "text-xl font-bold",
                      stats.platformProfit >= 0 ? "text-success" : "text-destructive"
                    )}>₹{stats.platformProfit.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">{stats.totalTransactions}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Chat Sessions</p>
              <p className="text-2xl font-bold">{stats.totalChatSessions}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Video Calls</p>
              <p className="text-2xl font-bold">{stats.totalVideoCalls}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Gifts Sent</p>
              <p className="text-2xl font-bold">{stats.totalGiftsSent}</p>
            </Card>
          </div>

          {/* Men & Women Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-male/30 bg-male/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-male" />
                  Men Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-lg font-bold">{menStats.transactions}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-bold text-destructive">₹{menStats.spent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gifts Sent</p>
                  <p className="text-lg font-bold">{menStats.giftsSent}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-female/30 bg-female/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-female" />
                  Women Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-lg font-bold">{womenStats.transactions}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                  <p className="text-lg font-bold text-green-600">₹{womenStats.earned.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Withdrawals</p>
                  <p className="text-lg font-bold">₹{womenStats.withdrawals.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user name, transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Transaction Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="statement">Statement</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
              <TabsTrigger value="chats">Chats</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="gifts">Gifts</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            </TabsList>

            {/* Statement Tab - Bank Statement Format */}
            <TabsContent value="statement">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <IndianRupee className="h-4 w-4" />
                    All Users Transaction Statement
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold">Transaction Date</TableHead>
                          <TableHead className="font-bold">Value Date</TableHead>
                          <TableHead className="font-bold">User</TableHead>
                          <TableHead className="font-bold">Description</TableHead>
                          <TableHead className="font-bold">Reference Number</TableHead>
                          <TableHead className="font-bold text-destructive">Withdrawals</TableHead>
                          <TableHead className="font-bold text-green-600">Deposits</TableHead>
                          <TableHead className="font-bold">Running Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          // Merge all wallet transactions sorted by date ascending for running balance
                          const filtered = filterBySearch(walletTransactions);
                          const sorted = [...filtered].sort(
                            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                          );
                          let runningBalance = 0;
                          return sorted.map(tx => {
                            const isDebit = tx.type === "debit";
                            const amount = Number(tx.amount);
                            if (isDebit) {
                              runningBalance -= amount;
                            } else {
                              runningBalance += amount;
                            }
                            const txDate = new Date(tx.created_at);
                            return (
                              <TableRow key={tx.id}>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {format(txDate, "dd MMM yyyy, HH:mm")}
                                </TableCell>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {format(txDate, "dd MMM yyyy")}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{tx.user_name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{tx.user_gender}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-48 text-sm">
                                  {tx.description || "-"}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground font-mono">
                                  {tx.reference_id || tx.id.slice(0, 8).toUpperCase()}
                                </TableCell>
                                <TableCell className="font-semibold text-destructive">
                                  {isDebit ? `₹${amount.toFixed(2)}` : ""}
                                </TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  {!isDebit ? `₹${amount.toFixed(2)}` : ""}
                                </TableCell>
                                <TableCell className={cn(
                                  "font-bold",
                                  runningBalance >= 0 ? "text-foreground" : "text-destructive"
                                )}>
                                  ₹{runningBalance.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                        {filterBySearch(walletTransactions).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Recent Wallet Transactions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Wallet className="h-4 w-4" />
                      Recent Wallet Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {walletTransactions.slice(0, 10).map(tx => (
                          <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50">
                            <div className="flex items-center gap-2">
                              {tx.type === "credit" ? (
                                <ArrowDownLeft className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-destructive" />
                              )}
                              <div>
                                <p className="text-sm font-medium">{tx.user_name}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-40">{tx.description}</p>
                              </div>
                            </div>
                            <span className={cn(
                              "font-semibold",
                              tx.type === "credit" ? "text-green-600" : "text-destructive"
                            )}>
                              {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Recent Chat Sessions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageCircle className="h-4 w-4" />
                      Recent Chat Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {chatSessions.slice(0, 10).map(session => (
                          <div key={session.id} className="flex items-center justify-between py-2 border-b border-border/50">
                            <div>
                              <p className="text-sm font-medium">{session.man_name} → {session.woman_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDuration(Number(session.total_minutes))} • {getStatusBadge(session.status)}
                              </p>
                            </div>
                            <span className="font-semibold text-primary">
                              ₹{Number(session.total_earned).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterBySearch(walletTransactions).map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tx.user_name}</p>
                              <p className="text-xs text-muted-foreground">{tx.user_gender}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.type === "credit" ? "default" : "secondary"}>
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn(
                            "font-semibold",
                            tx.type === "credit" ? "text-green-600" : "text-destructive"
                          )}>
                            {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="max-w-48 truncate">{tx.description}</TableCell>
                          <TableCell>{getStatusBadge(tx.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(tx.created_at), "MMM d, HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Chats Tab */}
            <TabsContent value="chats">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Man</TableHead>
                        <TableHead>Woman</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterBySearch(chatSessions).map(session => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.man_name}</TableCell>
                          <TableCell className="font-medium">{session.woman_name}</TableCell>
                          <TableCell>{formatDuration(Number(session.total_minutes))}</TableCell>
                          <TableCell>₹{session.rate_per_minute}/min</TableCell>
                          <TableCell className="font-semibold text-primary">
                            ₹{Number(session.total_earned).toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(session.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(session.started_at), "MMM d, HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Video Tab */}
            <TabsContent value="video">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Man</TableHead>
                        <TableHead>Woman</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterBySearch(videoCallSessions).map(call => (
                        <TableRow key={call.id}>
                          <TableCell className="font-medium">{call.man_name}</TableCell>
                          <TableCell className="font-medium">{call.woman_name}</TableCell>
                          <TableCell>{formatDuration(Number(call.total_minutes))}</TableCell>
                          <TableCell>₹{call.rate_per_minute}/min</TableCell>
                          <TableCell className="font-semibold text-primary">
                            ₹{Number(call.total_earned).toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(call.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {call.started_at ? format(new Date(call.started_at), "MMM d, HH:mm") : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gifts Tab */}
            <TabsContent value="gifts">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sender</TableHead>
                        <TableHead>Receiver</TableHead>
                        <TableHead>Gift</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterBySearch(giftTransactions).map(gift => (
                        <TableRow key={gift.id}>
                          <TableCell className="font-medium">{gift.sender_name}</TableCell>
                          <TableCell className="font-medium">{gift.receiver_name}</TableCell>
                          <TableCell>{gift.gift_name}</TableCell>
                          <TableCell className="font-semibold">₹{Number(gift.price_paid).toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(gift.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(gift.created_at), "MMM d, HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Withdrawals Tab */}
            <TabsContent value="withdrawals">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Processed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterBySearch(withdrawalRequests).map(withdrawal => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="font-medium">{withdrawal.user_name}</TableCell>
                          <TableCell className="font-semibold">₹{Number(withdrawal.amount).toFixed(2)}</TableCell>
                          <TableCell>{withdrawal.payment_method || "N/A"}</TableCell>
                          <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(withdrawal.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {withdrawal.processed_at ? format(new Date(withdrawal.processed_at), "MMM d, HH:mm") : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminNav>
  );
};

export default AdminTransactionHistory;

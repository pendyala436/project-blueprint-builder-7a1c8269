import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  User,
  Filter,
  Video
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

const TransactionHistoryScreen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [videoCallSessions, setVideoCallSessions] = useState<VideoCallSession[]>([]);
  const [womenEarnings, setWomenEarnings] = useState<WomenEarning[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  // Real-time subscription for transactions and sessions
  useEffect(() => {
    const channel = supabase
      .channel('transaction-updates')
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
        { event: '*', schema: 'public', table: 'women_earnings' },
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

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("gender")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.gender) {
        setUserGender(profile.gender.toLowerCase());
      }

      // Fetch wallet and transactions
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) {
        const { data: txData } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", wallet.id)
          .order("created_at", { ascending: false })
          .limit(100);

        setWalletTransactions(txData || []);
      }

      // Fetch chat sessions based on gender
      if (profile?.gender?.toLowerCase() === "male") {
        // For men: Fetch sessions where they paid
        const { data: sessions } = await supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("man_user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(50);

        if (sessions && sessions.length > 0) {
          // Get partner info
          const womanIds = sessions.map(s => s.woman_user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, photo_url")
            .in("user_id", womanIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
          
          const enrichedSessions = sessions.map(s => ({
            ...s,
            partner_name: profileMap.get(s.woman_user_id)?.full_name || "Anonymous",
            partner_photo: profileMap.get(s.woman_user_id)?.photo_url
          }));

          setChatSessions(enrichedSessions);
        }

        // Fetch video call sessions for men
        const { data: videoCalls } = await supabase
          .from("video_call_sessions")
          .select("*")
          .eq("man_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (videoCalls && videoCalls.length > 0) {
          const womanIds = videoCalls.map(s => s.woman_user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, photo_url")
            .in("user_id", womanIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
          
          const enrichedCalls = videoCalls.map(s => ({
            ...s,
            partner_name: profileMap.get(s.woman_user_id)?.full_name || "Anonymous",
            partner_photo: profileMap.get(s.woman_user_id)?.photo_url
          }));

          setVideoCallSessions(enrichedCalls);
        }
      } else if (profile?.gender?.toLowerCase() === "female") {
        // For women: Fetch earnings
        const { data: earnings } = await supabase
          .from("women_earnings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (earnings && earnings.length > 0) {
          // Get session info for chat earnings
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

        // Also fetch sessions for women
        const { data: sessions } = await supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("woman_user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(50);

        if (sessions && sessions.length > 0) {
          const manIds = sessions.map(s => s.man_user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, photo_url")
            .in("user_id", manIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
          
          const enrichedSessions = sessions.map(s => ({
            ...s,
            partner_name: profileMap.get(s.man_user_id)?.full_name || "Anonymous",
            partner_photo: profileMap.get(s.man_user_id)?.photo_url
          }));

          setChatSessions(enrichedSessions);
        }

        // Fetch video call sessions for women
        const { data: videoCalls } = await supabase
          .from("video_call_sessions")
          .select("*")
          .eq("woman_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (videoCalls && videoCalls.length > 0) {
          const manIds = videoCalls.map(s => s.man_user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, photo_url")
            .in("user_id", manIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
          
          const enrichedCalls = videoCalls.map(s => ({
            ...s,
            partner_name: profileMap.get(s.man_user_id)?.full_name || "Anonymous",
            partner_photo: profileMap.get(s.man_user_id)?.photo_url
          }));

          setVideoCallSessions(enrichedCalls);
        }
      }

    } catch (error) {
      console.error("Error loading transaction data:", error);
    } finally {
      setLoading(false);
    }
  };

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
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Transaction History</h1>
              <p className="text-xs text-muted-foreground">
                {isMale ? "Your chat spending details" : "Your earnings & chat history"}
              </p>
            </div>
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
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
            <TabsTrigger value="chats" className="text-sm">Chats</TabsTrigger>
            <TabsTrigger value="video" className="text-sm">Video</TabsTrigger>
            <TabsTrigger value="wallet" className="text-sm">
              {isMale ? "Recharges" : "Earnings"}
            </TabsTrigger>
          </TabsList>

          {/* All Transactions */}
          <TabsContent value="all" className="space-y-3">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3 pr-4">
                {/* Show chat sessions */}
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
                              {isMale ? "-" : "+"}₹{Number(session.total_earned).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(Number(session.total_minutes))}
                            </span>
                            <span>₹{session.rate_per_minute}/min</span>
                            {session.end_reason && (
                              <span className="text-amber-600">
                                {getEndReasonText(session.end_reason)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(session.started_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Show wallet transactions */}
                {walletTransactions.map((tx) => (
                  <Card key={tx.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          tx.type === "credit" ? "bg-green-500/10" : "bg-destructive/10"
                        )}>
                          {tx.type === "credit" ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {tx.description || (tx.type === "credit" ? "Wallet Recharge" : "Withdrawal")}
                              </span>
                              {getStatusBadge(tx.status)}
                            </div>
                            <span className={cn(
                              "font-semibold whitespace-nowrap",
                              tx.type === "credit" ? "text-green-600" : "text-destructive"
                            )}>
                              {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                            </span>
                          </div>
                          {tx.reference_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Ref: {tx.reference_id}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Show video call sessions in all tab */}
                {videoCallSessions.map((session) => (
                  <Card key={`video-${session.id}`} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-full", isMale ? "bg-purple-500/10" : "bg-pink-500/10")}>
                          <Video className={cn("h-4 w-4", isMale ? "text-purple-500" : "text-pink-500")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">Video with {session.partner_name}</span>
                            <span className={cn("font-semibold", isMale ? "text-purple-600" : "text-pink-600")}>
                              {isMale ? "-" : "+"}₹{Number(session.total_earned).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{formatDuration(Number(session.total_minutes))}</span>
                            <span>₹{session.rate_per_minute}/min</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {chatSessions.length === 0 && videoCallSessions.length === 0 && walletTransactions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Your chat sessions and {isMale ? "recharges" : "earnings"} will appear here</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Chat Sessions Only */}
          <TabsContent value="chats" className="space-y-3">
            <ScrollArea className="h-[calc(100vh-200px)]">
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
                                {session.partner_name}
                              </span>
                              {getStatusBadge(session.status)}
                            </div>
                            <span className={cn(
                              "font-semibold whitespace-nowrap",
                              isMale ? "text-destructive" : "text-green-600"
                            )}>
                              {isMale ? "-" : "+"}₹{Number(session.total_earned).toFixed(2)}
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
            <ScrollArea className="h-[calc(100vh-200px)]">
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
                                {session.partner_name}
                              </span>
                              {getStatusBadge(session.status)}
                            </div>
                            <span className={cn(
                              "font-semibold whitespace-nowrap",
                              isMale ? "text-purple-600" : "text-pink-600"
                            )}>
                              {isMale ? "-" : "+"}₹{Number(session.total_earned).toFixed(2)}
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

          {/* Wallet Transactions / Earnings */}
          <TabsContent value="wallet" className="space-y-3">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3 pr-4">
                {/* For women: Show earnings */}
                {!isMale && womenEarnings.map((earning) => (
                  <Card key={earning.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-green-500/10">
                          <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              {earning.earning_type === "chat" ? "Chat Earnings" : earning.earning_type}
                              {earning.partner_name && ` with ${earning.partner_name}`}
                            </span>
                            <span className="font-semibold text-green-600 whitespace-nowrap">
                              +₹{earning.amount.toFixed(2)}
                            </span>
                          </div>
                          {earning.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {earning.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(earning.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* For men: Show wallet transactions */}
                {isMale && walletTransactions.map((tx) => (
                  <Card key={tx.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          tx.type === "credit" ? "bg-green-500/10" : "bg-destructive/10"
                        )}>
                          {tx.type === "credit" ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {tx.description || (tx.type === "credit" ? "Wallet Recharge" : "Chat Payment")}
                              </span>
                              {getStatusBadge(tx.status)}
                            </div>
                            <span className={cn(
                              "font-semibold whitespace-nowrap",
                              tx.type === "credit" ? "text-green-600" : "text-destructive"
                            )}>
                              {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                            </span>
                          </div>
                          {tx.reference_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Ref: {tx.reference_id}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {((isMale && walletTransactions.length === 0) || (!isMale && womenEarnings.length === 0)) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <IndianRupee className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No {isMale ? "recharges" : "earnings"} yet</p>
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

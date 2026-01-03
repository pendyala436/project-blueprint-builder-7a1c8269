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
}

const WomenTransactionHistoryScreen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [videoCallSessions, setVideoCallSessions] = useState<VideoCallSession[]>([]);
  const [womenEarnings, setWomenEarnings] = useState<WomenEarning[]>([]);
  const [giftTransactions, setGiftTransactions] = useState<GiftTransaction[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  // Real-time subscription for transactions and sessions
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel('women-transaction-updates')
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

      // Fetch gift transactions received
      const { data: giftsData } = await supabase
        .from("gift_transactions")
        .select("*")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (giftsData && giftsData.length > 0) {
        const giftIds = [...new Set(giftsData.map(g => g.gift_id))];
        const { data: gifts } = await supabase
          .from("gifts")
          .select("id, name, emoji")
          .in("id", giftIds);
        
        const giftMap = new Map(gifts?.map(g => [g.id, g]) || []);

        const senderIds = [...new Set(giftsData.map(g => g.sender_id))];
        const { data: senderProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", senderIds);
        
        const senderMap = new Map(senderProfiles?.map(p => [p.user_id, p.full_name]) || []);

        const enrichedGifts: GiftTransaction[] = giftsData.map(g => ({
          ...g,
          gift_name: giftMap.get(g.gift_id)?.name || "Gift",
          gift_emoji: giftMap.get(g.gift_id)?.emoji || "🎁",
          partner_name: senderMap.get(g.sender_id) || "Anonymous"
        }));

        setGiftTransactions(enrichedGifts);
      }

      // Fetch chat sessions
      const { data: sessions } = await supabase
        .from("active_chat_sessions")
        .select("*")
        .eq("woman_user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(100);

      if (sessions && sessions.length > 0) {
        const partnerIds = sessions.map(s => s.man_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", partnerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enrichedSessions = sessions.map(s => ({
          ...s,
          partner_name: profileMap.get(s.man_user_id)?.full_name || "Anonymous",
          partner_photo: profileMap.get(s.man_user_id)?.photo_url
        }));

        setChatSessions(enrichedSessions);
      }

      // Fetch video call sessions
      const { data: videoCalls } = await supabase
        .from("video_call_sessions")
        .select("*")
        .eq("woman_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (videoCalls && videoCalls.length > 0) {
        const partnerIds = videoCalls.map(s => s.man_user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", partnerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enrichedCalls = videoCalls.map(s => ({
          ...s,
          partner_name: profileMap.get(s.man_user_id)?.full_name || "Anonymous",
          partner_photo: profileMap.get(s.man_user_id)?.photo_url
        }));

        setVideoCallSessions(enrichedCalls);
      }

      // Fetch earnings
      const { data: earnings } = await supabase
        .from("women_earnings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (earnings && earnings.length > 0) {
        // Calculate total earnings
        const total = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
        setTotalEarnings(total);

        const sessionIds = earnings.filter(e => e.chat_session_id).map(e => e.chat_session_id);
        
        if (sessionIds.length > 0) {
          const { data: sessionData } = await supabase
            .from("active_chat_sessions")
            .select("id, man_user_id")
            .in("id", sessionIds);

          if (sessionData && sessionData.length > 0) {
            const manIds = sessionData.map(s => s.man_user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", manIds);

            const sessionMap = new Map(sessionData.map(s => [s.id, s.man_user_id]));
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
            title="Earnings History"
            showBack={true}
            showHome={true}
            showForward={false}
            rightContent={
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                  <p className="font-semibold text-success">₹{totalEarnings.toFixed(2)}</p>
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
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-2 text-center">
            <p className="text-xs text-muted-foreground">Chats</p>
            <p className="text-lg font-bold">{chatSessions.length}</p>
          </Card>
          <Card className="p-2 text-center">
            <p className="text-xs text-muted-foreground">Video</p>
            <p className="text-lg font-bold">{videoCallSessions.length}</p>
          </Card>
          <Card className="p-2 text-center">
            <p className="text-xs text-muted-foreground">Gifts</p>
            <p className="text-lg font-bold">{giftTransactions.length}</p>
          </Card>
          <Card className="p-2 text-center">
            <p className="text-xs text-muted-foreground">Earnings</p>
            <p className="text-lg font-bold">{womenEarnings.length}</p>
          </Card>
        </div>

        {/* Transaction Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="chats" className="text-xs">Chats</TabsTrigger>
            <TabsTrigger value="video" className="text-xs">Video</TabsTrigger>
            <TabsTrigger value="gifts" className="text-xs">Gifts</TabsTrigger>
          </TabsList>

          {/* All Earnings */}
          <TabsContent value="all" className="space-y-3">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {womenEarnings.map((earning) => (
                  <Card key={earning.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-success/10">
                          {earning.earning_type === "chat" ? (
                            <MessageCircle className="h-4 w-4 text-success" />
                          ) : earning.earning_type === "video_call" ? (
                            <Video className="h-4 w-4 text-pink-500" />
                          ) : earning.earning_type === "gift" ? (
                            <Gift className="h-4 w-4 text-amber-500" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4 text-success" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate text-sm">
                              {earning.earning_type === "chat" ? "Chat Earnings" : 
                               earning.earning_type === "video_call" ? "Video Call Earnings" :
                               earning.earning_type === "gift" ? "Gift Received" : 
                               earning.earning_type === "private_call" ? "Private Call" : earning.earning_type}
                              {earning.partner_name && ` with ${earning.partner_name}`}
                            </span>
                            <span className="font-semibold text-success whitespace-nowrap">
                              +₹{Number(earning.amount).toFixed(2)}
                            </span>
                          </div>
                          {earning.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {earning.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(earning.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {womenEarnings.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No earnings yet</p>
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
                        <div className="p-2 rounded-full bg-success/10">
                          <MessageCircle className="h-4 w-4 text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                Chat with {session.partner_name}
                              </span>
                              {getStatusBadge(session.status)}
                            </div>
                            <span className="font-semibold text-success whitespace-nowrap">
                              +₹{Number(session.total_earned).toFixed(2)}
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

          {/* Video Call Sessions */}
          <TabsContent value="video" className="space-y-3">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-4">
                {videoCallSessions.map((session) => (
                  <Card key={session.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-pink-500/10">
                          <Video className="h-4 w-4 text-pink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                Video with {session.partner_name}
                              </span>
                              {getStatusBadge(session.status)}
                            </div>
                            <span className="font-semibold text-pink-600 whitespace-nowrap">
                              +₹{Number(session.total_earned).toFixed(2)}
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
                            <p className="text-xs text-warning mt-1">
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
                                {gift.gift_name} from {gift.partner_name}
                              </span>
                              {getStatusBadge(gift.status)}
                            </div>
                            <span className="font-semibold text-success whitespace-nowrap">
                              +₹{(Number(gift.price_paid) * 0.5).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            (50% of ₹{Number(gift.price_paid).toFixed(2)} gift value)
                          </p>
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
                    <p>No gifts received yet</p>
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

export default WomenTransactionHistoryScreen;

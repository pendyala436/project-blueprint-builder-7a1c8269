import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowUpRight, 
  ArrowDownLeft,
  MessageCircle,
  Video,
  Gift,
  Wallet,
  RefreshCw,
  Search,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AdminTransaction {
  id: string;
  type: 'recharge' | 'chat' | 'video' | 'gift' | 'withdrawal' | 'earning' | 'other';
  amount: number;
  description: string;
  created_at: string;
  status: string;
  user_id: string;
  user_name?: string;
  user_photo?: string;
  counterparty?: string;
  counterparty_id?: string;
  is_credit: boolean;
  icon: 'wallet' | 'chat' | 'video' | 'gift' | 'arrow';
}

interface UserProfile {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  gender: string;
}

export const AdminTransactionHistoryWidget = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    loadUsers();
    loadTransactions();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [selectedUserId, filterType]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-transaction-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_transactions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'women_earnings' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_revenue_transactions' }, () => loadTransactions())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, photo_url, gender")
      .order("full_name");
    
    if (data) {
      setUsers(data as UserProfile[]);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const unified: AdminTransaction[] = [];

      // Get all wallet transactions
      let txQuery = supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (selectedUserId !== "all") {
        txQuery = txQuery.eq("user_id", selectedUserId);
      }

      const { data: txData } = await txQuery;

      // Get user profiles for mapping
      const userIds = new Set<string>();
      txData?.forEach(tx => userIds.add(tx.user_id));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url")
        .in("user_id", Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      txData?.forEach(tx => {
        const profile = profileMap.get(tx.user_id);
        const isRecharge = tx.description?.toLowerCase().includes('recharge');
        const isGift = tx.description?.toLowerCase().includes('gift');
        const isChat = tx.description?.toLowerCase().includes('chat');
        const isVideo = tx.description?.toLowerCase().includes('video');
        const isWithdrawal = tx.description?.toLowerCase().includes('withdrawal');

        let type: AdminTransaction['type'] = 'other';
        let icon: AdminTransaction['icon'] = 'arrow';

        if (isRecharge) { type = 'recharge'; icon = 'wallet'; }
        else if (isGift) { type = 'gift'; icon = 'gift'; }
        else if (isChat) { type = 'chat'; icon = 'chat'; }
        else if (isVideo) { type = 'video'; icon = 'video'; }
        else if (isWithdrawal) { type = 'withdrawal'; icon = 'wallet'; }

        if (filterType !== "all" && type !== filterType) return;

        unified.push({
          id: tx.id,
          type,
          amount: Number(tx.amount),
          description: tx.description || (tx.type === 'credit' ? 'Credit' : 'Debit'),
          created_at: tx.created_at,
          status: tx.status,
          user_id: tx.user_id,
          user_name: profile?.full_name || "Unknown",
          user_photo: profile?.photo_url || null,
          is_credit: tx.type === 'credit',
          icon
        });
      });

      // Get gift transactions
      let giftQuery = supabase
        .from("gift_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (selectedUserId !== "all") {
        giftQuery = giftQuery.or(`sender_id.eq.${selectedUserId},receiver_id.eq.${selectedUserId}`);
      }

      const { data: giftsData } = await giftQuery;

      if (giftsData?.length && (filterType === "all" || filterType === "gift")) {
        const giftIds = [...new Set(giftsData.map(g => g.gift_id))];
        const allUserIds = [...new Set(giftsData.flatMap(g => [g.sender_id, g.receiver_id]))];

        const [{ data: gifts }, { data: giftProfiles }] = await Promise.all([
          supabase.from("gifts").select("id, name, emoji").in("id", giftIds),
          supabase.from("profiles").select("user_id, full_name, photo_url").in("user_id", allUserIds)
        ]);

        const giftMap = new Map(gifts?.map(g => [g.id, g]) || []);
        const giftProfileMap = new Map(giftProfiles?.map(p => [p.user_id, p]) || []);

        giftsData.forEach(g => {
          const senderProfile = giftProfileMap.get(g.sender_id);
          const receiverProfile = giftProfileMap.get(g.receiver_id);
          const giftInfo = giftMap.get(g.gift_id);

          // Add sender debit
          if (!unified.some(u => u.id === `gift-send-${g.id}`)) {
            unified.push({
              id: `gift-send-${g.id}`,
              type: 'gift',
              amount: Number(g.price_paid),
              description: `${giftInfo?.emoji || '🎁'} ${senderProfile?.full_name || 'Unknown'} sent ${giftInfo?.name || 'Gift'} to ${receiverProfile?.full_name || 'Unknown'}`,
              created_at: g.created_at,
              status: g.status,
              user_id: g.sender_id,
              user_name: senderProfile?.full_name || "Unknown",
              user_photo: senderProfile?.photo_url || null,
              counterparty: receiverProfile?.full_name,
              counterparty_id: g.receiver_id,
              is_credit: false,
              icon: 'gift'
            });
          }
        });
      }

      // Get women earnings
      let earningsQuery = supabase
        .from("women_earnings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (selectedUserId !== "all") {
        earningsQuery = earningsQuery.eq("user_id", selectedUserId);
      }

      const { data: earningsData } = await earningsQuery;

      if (earningsData?.length && (filterType === "all" || filterType === "earning")) {
        const earningUserIds = [...new Set(earningsData.map(e => e.user_id))];
        const { data: earningProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", earningUserIds);

        const earningProfileMap = new Map(earningProfiles?.map(p => [p.user_id, p]) || []);

        earningsData.forEach(e => {
          const profile = earningProfileMap.get(e.user_id);
          unified.push({
            id: `earning-${e.id}`,
            type: 'earning',
            amount: Number(e.amount),
            description: e.description || `${e.earning_type} earnings`,
            created_at: e.created_at,
            status: 'completed',
            user_id: e.user_id,
            user_name: profile?.full_name || "Unknown",
            user_photo: profile?.photo_url || null,
            is_credit: true,
            icon: e.earning_type === 'chat' ? 'chat' : e.earning_type === 'video_call' ? 'video' : 'gift'
          });
        });
      }

      // Sort by date
      unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Filter by search
      const filtered = searchQuery 
        ? unified.filter(t => 
            t.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.counterparty?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : unified;

      setTransactions(filtered.slice(0, 100));
    } catch (error) {
      console.error("Error loading admin transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (icon: string, isCredit: boolean) => {
    const className = cn("w-4 h-4", isCredit ? "text-green-500" : "text-red-500");
    switch (icon) {
      case 'wallet': return <Wallet className={className} />;
      case 'chat': return <MessageCircle className={className} />;
      case 'video': return <Video className={className} />;
      case 'gift': return <Gift className={className} />;
      default: return isCredit ? <ArrowDownLeft className={className} /> : <ArrowUpRight className={className} />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      recharge: { label: "Recharge", variant: "default" },
      chat: { label: "Chat", variant: "secondary" },
      video: { label: "Video", variant: "secondary" },
      gift: { label: "Gift", variant: "outline" },
      earning: { label: "Earning", variant: "default" },
      withdrawal: { label: "Withdrawal", variant: "destructive" },
      other: { label: "Other", variant: "outline" }
    };
    const config = variants[type] || variants.other;
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  if (loading && transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            All User Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-20" />
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            All User Transactions
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadTransactions}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map(user => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  {user.full_name || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="recharge">Recharge</SelectItem>
              <SelectItem value="chat">Chat</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="gift">Gift</SelectItem>
              <SelectItem value="earning">Earning</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={tx.user_photo || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {tx.user_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    tx.is_credit ? "bg-green-500/10" : "bg-red-500/10"
                  )}>
                    {getIcon(tx.icon, tx.is_credit)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{tx.user_name}</p>
                      {getTypeBadge(tx.type)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground/70">
                      {format(new Date(tx.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div className={cn(
                    "text-sm font-semibold whitespace-nowrap",
                    tx.is_credit ? "text-green-600" : "text-red-600"
                  )}>
                    {tx.is_credit ? "+" : "-"}₹{tx.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminTransactionHistoryWidget;

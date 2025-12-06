import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MeowLogo from "@/components/MeowLogo";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  Users, 
  Bell, 
  MessageCircle, 
  Settings,
  Circle,
  LogOut,
  Wallet,
  Clock,
  IndianRupee,
  Crown,
  Sparkles,
  MapPin,
  ChevronRight,
  Search,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface OnlineMan {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  country: string | null;
  state: string | null;
  preferredLanguage: string | null;
  walletBalance: number;
  hasRecharged: boolean;
  lastSeen: string;
}

interface DashboardStats {
  totalOnlineMen: number;
  rechargedMen: number;
  nonRechargedMen: number;
  matchCount: number;
  unreadNotifications: number;
  todayEarnings: number;
}

const WomenDashboardScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [userName, setUserName] = useState("");
  const [rechargedMen, setRechargedMen] = useState<OnlineMan[]>([]);
  const [nonRechargedMen, setNonRechargedMen] = useState<OnlineMan[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOnlineMen: 0,
    rechargedMen: 0,
    nonRechargedMen: 0,
    matchCount: 0,
    unreadNotifications: 0,
    todayEarnings: 0
  });

  const quickActions = [
    { 
      icon: <Search className="w-6 h-6" />, 
      label: "Discover", 
      color: "from-primary to-rose-400",
      action: () => navigate("/online-users")
    },
    { 
      icon: <MessageCircle className="w-6 h-6" />, 
      label: "Messages", 
      color: "from-blue-500 to-blue-400",
      action: () => navigate("/match-discovery")
    },
    { 
      icon: <Heart className="w-6 h-6" />, 
      label: "Matches", 
      color: "from-rose-500 to-pink-400",
      action: () => navigate("/match-discovery")
    },
    { 
      icon: <User className="w-6 h-6" />, 
      label: "Profile", 
      color: "from-violet-500 to-purple-400",
      action: () => toast({ title: "Profile", description: "Coming soon!" })
    },
  ];

  useEffect(() => {
    loadDashboardData();
    updateUserOnlineStatus(true);

    return () => {
      updateUserOnlineStatus(false);
    };
  }, []);

  // Real-time subscription for online users
  useEffect(() => {
    const channel = supabase
      .channel('online-men-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status'
        },
        () => {
          fetchOnlineMen();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, gender")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.full_name) {
        setUserName(profile.full_name.split(" ")[0]);
      }

      // Redirect men to regular dashboard
      if (profile?.gender === "male") {
        navigate("/dashboard");
        return;
      }

      // Fetch all data
      await Promise.all([
        fetchOnlineMen(),
        fetchMatchCount(user.id),
        fetchNotifications(user.id),
        fetchTodayEarnings(user.id)
      ]);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOnlineMen = async () => {
    try {
      // Get all online male users with their profiles and wallet info
      const { data: onlineStatuses } = await supabase
        .from("user_status")
        .select("user_id, last_seen")
        .eq("is_online", true);

      if (!onlineStatuses || onlineStatuses.length === 0) {
        setRechargedMen([]);
        setNonRechargedMen([]);
        setStats(prev => ({ ...prev, totalOnlineMen: 0, rechargedMen: 0, nonRechargedMen: 0 }));
        return;
      }

      const onlineUserIds = onlineStatuses.map(s => s.user_id);

      // Fetch profiles of online users who are male
      const { data: maleProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, country, state, preferred_language, gender")
        .in("user_id", onlineUserIds)
        .eq("gender", "male");

      if (!maleProfiles || maleProfiles.length === 0) {
        setRechargedMen([]);
        setNonRechargedMen([]);
        setStats(prev => ({ ...prev, totalOnlineMen: 0, rechargedMen: 0, nonRechargedMen: 0 }));
        return;
      }

      const maleUserIds = maleProfiles.map(p => p.user_id);

      // Fetch wallet balances
      const { data: wallets } = await supabase
        .from("wallets")
        .select("user_id, balance")
        .in("user_id", maleUserIds);

      // Map wallet balances to users
      const walletMap = new Map(wallets?.map(w => [w.user_id, Number(w.balance)]) || []);
      const lastSeenMap = new Map(onlineStatuses.map(s => [s.user_id, s.last_seen]));

      // Create online men list
      const onlineMen: OnlineMan[] = maleProfiles.map(profile => ({
        userId: profile.user_id,
        fullName: profile.full_name || "Anonymous",
        photoUrl: profile.photo_url,
        country: profile.country,
        state: profile.state,
        preferredLanguage: profile.preferred_language,
        walletBalance: walletMap.get(profile.user_id) || 0,
        hasRecharged: (walletMap.get(profile.user_id) || 0) > 0,
        lastSeen: lastSeenMap.get(profile.user_id) || new Date().toISOString()
      }));

      // Separate and sort
      const recharged = onlineMen
        .filter(m => m.hasRecharged)
        .sort((a, b) => b.walletBalance - a.walletBalance); // High to low balance

      const nonRecharged = onlineMen.filter(m => !m.hasRecharged);

      setRechargedMen(recharged);
      setNonRechargedMen(nonRecharged);
      setStats(prev => ({
        ...prev,
        totalOnlineMen: onlineMen.length,
        rechargedMen: recharged.length,
        nonRechargedMen: nonRecharged.length
      }));

    } catch (error) {
      console.error("Error fetching online men:", error);
    }
  };

  const fetchMatchCount = async (userId: string) => {
    const { count } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
      .eq("status", "accepted");

    setStats(prev => ({ ...prev, matchCount: count || 0 }));
  };

  const fetchNotifications = async (userId: string) => {
    const { data, count } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5);

    setNotifications(data || []);
    setStats(prev => ({ ...prev, unreadNotifications: count || 0 }));
  };

  const fetchTodayEarnings = async (userId: string) => {
    const today = new Date().toISOString().split("T")[0];
    
    const { data: shifts } = await supabase
      .from("shifts")
      .select("earnings, bonus_earnings")
      .eq("user_id", userId)
      .gte("start_time", `${today}T00:00:00`)
      .eq("status", "completed");

    const todayTotal = shifts?.reduce((acc, s) => acc + Number(s.earnings) + Number(s.bonus_earnings), 0) || 0;
    setStats(prev => ({ ...prev, todayEarnings: todayTotal }));
  };

  const updateUserOnlineStatus = async (online: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: updateError } = await supabase
        .from("user_status")
        .update({
          is_online: online,
          last_seen: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        await supabase
          .from("user_status")
          .insert({
            user_id: user.id,
            is_online: online,
            last_seen: new Date().toISOString(),
          });
      }

      setIsOnline(online);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleLogout = async () => {
    await updateUserOnlineStatus(false);
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "See you soon!",
    });
    navigate("/");
  };

  const handleChatWithUser = (userId: string) => {
    navigate(`/chat/${userId}`);
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const UserCard = ({ user, showBalance = false }: { user: OnlineMan; showBalance?: boolean }) => (
    <Card 
      className={cn(
        "group hover:shadow-lg transition-all duration-300 cursor-pointer",
        showBalance && user.walletBalance > 1000 && "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent"
      )}
      onClick={() => handleViewProfile(user.userId)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-14 w-14 border-2 border-background shadow-md">
              <AvatarImage src={user.photoUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-rose-500 text-white text-lg">
                {user.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
            {showBalance && user.walletBalance > 1000 && (
              <div className="absolute -top-1 -right-1">
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{user.fullName}</h3>
              {showBalance && user.walletBalance > 500 && (
                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">
                  Premium
                </Badge>
              )}
            </div>
            
            {(user.state || user.country) && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {[user.state, user.country].filter(Boolean).join(", ")}
              </p>
            )}

            {showBalance && (
              <div className="flex items-center gap-1 mt-1">
                <IndianRupee className="h-3 w-3 text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  ₹{user.walletBalance.toFixed(0)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); handleChatWithUser(user.userId); }}
              className="bg-primary hover:bg-primary/90"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <MeowLogo size="sm" />
          
          <div className="flex items-center gap-3">
            <button 
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
              onClick={() => navigate("/shift-management")}
            >
              <Clock className="w-5 h-5 text-muted-foreground" />
            </button>

            <button 
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
              onClick={() => toast({ title: "Notifications", description: "Coming soon!" })}
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {stats.unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {stats.unreadNotifications > 9 ? "9+" : stats.unreadNotifications}
                </span>
              )}
            </button>

            <button 
              className="p-2 rounded-full hover:bg-muted transition-colors"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>

            <button 
              className="p-2 rounded-full hover:bg-muted transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Circle className={`w-3 h-3 ${isOnline ? "fill-emerald-500 text-emerald-500" : "fill-muted text-muted"}`} />
            <span className="text-sm text-muted-foreground">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{userName ? `, ${userName}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats.totalOnlineMen} men online right now
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.rechargedMen}</p>
                <p className="text-xs text-muted-foreground">Premium Men</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/20">
                <IndianRupee className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold">₹{stats.todayEarnings.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Today's Earnings</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20">
                <Heart className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.matchCount}</p>
                <p className="text-xs text-muted-foreground">Matches</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 cursor-pointer"
            onClick={() => navigate("/shift-management")}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Shift</p>
                <p className="text-xs text-muted-foreground">Manage →</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Online Men Tabs */}
        <Tabs defaultValue="recharged" className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recharged" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Premium ({stats.rechargedMen})
            </TabsTrigger>
            <TabsTrigger value="non-recharged" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Regular ({stats.nonRechargedMen})
            </TabsTrigger>
          </TabsList>

          {/* Recharged Men - Sorted by balance high to low */}
          <TabsContent value="recharged" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Sorted by wallet balance (highest first)
              </p>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Priority
              </Badge>
            </div>

            {rechargedMen.length === 0 ? (
              <Card className="p-8 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No premium men online</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later for users with wallet balance
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {rechargedMen.map((user, index) => (
                  <div 
                    key={user.userId}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <UserCard user={user} showBalance={true} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Non-Recharged Men */}
          <TabsContent value="non-recharged" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Users without wallet balance
            </p>

            {nonRechargedMen.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No regular users online</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {nonRechargedMen.map((user, index) => (
                  <div 
                    key={user.userId}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <UserCard user={user} showBalance={false} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <p className="text-sm font-medium text-foreground">{action.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <button className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className="p-4 flex items-start gap-4 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className={`p-2 rounded-full ${
                    notification.type === "match" ? "bg-rose-500/10 text-rose-500" :
                    notification.type === "message" ? "bg-blue-500/10 text-blue-500" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {notification.type === "match" ? <Heart className="w-5 h-5" /> :
                     notification.type === "message" ? <MessageCircle className="w-5 h-5" /> :
                     <Bell className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No new activity yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start chatting to get matches and notifications!
              </p>
              <Button 
                variant="gradient" 
                className="mt-4"
                onClick={() => navigate("/online-users")}
              >
                <Search className="w-4 h-4 mr-2" />
                Find Users
              </Button>
            </Card>
          )}
        </div>

        {/* Shift CTA Card */}
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-rose-500/10 border-primary/20 animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Start your shift</p>
                <p className="text-sm text-muted-foreground">Track earnings automatically</p>
              </div>
            </div>
            <Button onClick={() => navigate("/shift-management")}>
              Go <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>

        {/* CTA Banner */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 via-rose-500/10 to-violet-500/10 border-primary/20 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-rose-500 text-white">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Boost your profile!</h3>
              <p className="text-sm text-muted-foreground">Get more visibility with premium features</p>
            </div>
            <Button variant="gradient" size="sm">
              Upgrade
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default WomenDashboardScreen;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  Users, 
  Bell, 
  MessageCircle, 
  Search, 
  Settings,
  User,
  Sparkles,
  ChevronRight,
  Circle,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface DashboardStats {
  onlineUsersCount: number;
  matchCount: number;
  unreadNotifications: number;
}

const DashboardScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [userName, setUserName] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    onlineUsersCount: 0,
    matchCount: 0,
    unreadNotifications: 0,
  });

  useEffect(() => {
    loadDashboardData();
    updateUserOnlineStatus(true);

    // Cleanup: set offline when leaving
    return () => {
      updateUserOnlineStatus(false);
    };
  }, []);

  // Real-time subscription for online users
  useEffect(() => {
    const channel = supabase
      .channel('online-users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status'
        },
        () => {
          fetchOnlineUsersCount();
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
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.full_name) {
        setUserName(profile.full_name.split(" ")[0]);
      }

      // Fetch stats in parallel
      await Promise.all([
        fetchOnlineUsersCount(),
        fetchMatchCount(user.id),
        fetchNotifications(user.id),
      ]);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOnlineUsersCount = async () => {
    const { count } = await supabase
      .from("user_status")
      .select("*", { count: "exact", head: true })
      .eq("is_online", true);

    setStats(prev => ({ ...prev, onlineUsersCount: count || 0 }));
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

  const updateUserOnlineStatus = async (online: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First try to update existing record
      const { error: updateError } = await supabase
        .from("user_status")
        .update({
          is_online: online,
          last_seen: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      // If no rows were updated, insert a new record
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

  const quickActions = [
    { 
      icon: <Search className="w-6 h-6" />, 
      label: "Discover", 
      color: "from-primary to-rose-400",
      action: () => toast({ title: "Discover", description: "Coming soon!" })
    },
    { 
      icon: <MessageCircle className="w-6 h-6" />, 
      label: "Messages", 
      color: "from-blue-500 to-blue-400",
      action: () => toast({ title: "Messages", description: "Coming soon!" })
    },
    { 
      icon: <Heart className="w-6 h-6" />, 
      label: "Matches", 
      color: "from-rose-500 to-pink-400",
      action: () => toast({ title: "Matches", description: "Coming soon!" })
    },
    { 
      icon: <User className="w-6 h-6" />, 
      label: "Profile", 
      color: "from-violet-500 to-purple-400",
      action: () => toast({ title: "Profile", description: "Coming soon!" })
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <MeowLogo size="sm" />
          
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button 
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
              onClick={() => toast({ title: "Notifications", description: "Coming soon!" })}
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {stats.unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {stats.unreadNotifications > 9 ? "9+" : stats.unreadNotifications}
                </span>
              )}
            </button>

            {/* Settings */}
            <button 
              className="p-2 rounded-full hover:bg-muted transition-colors"
              onClick={() => toast({ title: "Settings", description: "Coming soon!" })}
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Logout */}
            <button 
              className="p-2 rounded-full hover:bg-muted transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Circle className={`w-3 h-3 ${isOnline ? "fill-emerald-500 text-emerald-500" : "fill-muted text-muted"}`} />
            <span className="text-sm text-muted-foreground">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back{userName ? `, ${userName}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to make new connections today?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {/* Online Users */}
          <Card className="p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.onlineUsersCount}</p>
                <p className="text-sm text-muted-foreground">Online Now</p>
              </div>
            </div>
          </Card>

          {/* Matches */}
          <Card className="p-5 bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/20">
                <Heart className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.matchCount}</p>
                <p className="text-sm text-muted-foreground">Matches</p>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:shadow-lg transition-all col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Bell className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.unreadNotifications}</p>
                <p className="text-sm text-muted-foreground">Notifications</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
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
                Start exploring to get matches and notifications!
              </p>
              <Button 
                variant="gradient" 
                className="mt-4"
                onClick={() => toast({ title: "Discover", description: "Coming soon!" })}
              >
                <Search className="w-4 h-4 mr-2" />
                Start Exploring
              </Button>
            </Card>
          )}
        </div>

        {/* CTA Banner */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 via-rose-500/10 to-violet-500/10 border-primary/20 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-rose-500 text-white">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Boost your profile!</h3>
              <p className="text-sm text-muted-foreground">Get more matches with premium features</p>
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

export default DashboardScreen;
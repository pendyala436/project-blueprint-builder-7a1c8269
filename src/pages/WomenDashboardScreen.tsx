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
  User,
  Languages,
  Globe,
  Filter
} from "lucide-react";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { isIndianLanguage, INDIAN_NLLB200_LANGUAGES, NON_INDIAN_NLLB200_LANGUAGES } from "@/data/nllb200Languages";
import { MatchFiltersPanel, MatchFilters } from "@/components/MatchFiltersPanel";
import { ActiveChatsSection } from "@/components/ActiveChatsSection";

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
  age: number | null;
  photoUrl: string | null;
  country: string | null;
  state: string | null;
  motherTongue: string;
  preferredLanguage: string | null;
  walletBalance: number;
  hasRecharged: boolean;
  lastSeen: string;
  isSameLanguage: boolean;
  isNllbLanguage: boolean;
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
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [matchFilters, setMatchFilters] = useState<MatchFilters>({
    ageRange: [18, 60],
    heightRange: [140, 200],
    bodyType: "all",
    educationLevel: "all",
    occupation: "all",
    religion: "all",
    maritalStatus: "all",
    hasChildren: "all",
    country: "all",
    language: "all",
    distanceRange: [0, 15000],
    smokingHabit: "all",
    drinkingHabit: "all",
    dietaryPreference: "all",
    fitnessLevel: "all",
    petPreference: "all",
    travelFrequency: "all",
    zodiacSign: "all",
    personalityType: "all",
    onlineNow: false,
    verifiedOnly: false,
    premiumOnly: false,
    newUsersOnly: false,
    hasPhoto: false,
    hasBio: false,
  });

  const quickActions = [
    { 
      icon: <MessageCircle className="w-6 h-6" />, 
      label: "Messages", 
      color: "from-blue-500 to-blue-400",
      action: () => navigate("/match-discovery")
    },
    { 
      icon: <Wallet className="w-6 h-6" />, 
      label: "Withdraw", 
      color: "from-green-500 to-emerald-400",
      action: () => navigate("/women-wallet")
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
      action: () => setProfileEditOpen(true)
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
          fetchOnlineMen(undefined, currentWomanLanguage, currentWomanCountry);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [currentWomanLanguage, setCurrentWomanLanguage] = useState<string>("");
  const [currentWomanCountry, setCurrentWomanCountry] = useState<string>("");

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      // Fetch user profile including country
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, gender, country, primary_language, preferred_language")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.full_name) {
        setUserName(profile.full_name.split(" ")[0]);
      }

      // Note: Gender check removed for testing - women dashboard accessible to all users

      // Get woman's mother tongue
      const { data: womanLanguages } = await supabase
        .from("user_languages")
        .select("language_name")
        .eq("user_id", user.id)
        .limit(1);

      const womanLanguage = womanLanguages?.[0]?.language_name || 
                           profile?.primary_language || 
                           profile?.preferred_language || 
                           "English";
      setCurrentWomanLanguage(womanLanguage);
      setCurrentWomanCountry(profile?.country || "");

      // Fetch all data with woman's language context
      await Promise.all([
        fetchOnlineMen(user.id, womanLanguage, profile?.country || ""),
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

  const fetchOnlineMen = async (womanUserId?: string, womanLanguage?: string, womanCountry?: string) => {
    try {
      const effectiveWomanLanguage = womanLanguage || currentWomanLanguage;

      // Get all NLLB-200 language names for checking
      const allNllbLanguages = [...INDIAN_NLLB200_LANGUAGES, ...NON_INDIAN_NLLB200_LANGUAGES];
      const nllbLanguageNames = new Set(allNllbLanguages.map(l => l.name.toLowerCase()));
      const nonIndianNllbNames = new Set(NON_INDIAN_NLLB200_LANGUAGES.map(l => l.name.toLowerCase()));
      const indianNllbNames = new Set(INDIAN_NLLB200_LANGUAGES.map(l => l.name.toLowerCase()));

      // Get all online male users with their profiles and wallet info
      const { data: onlineStatuses } = await supabase
        .from("user_status")
        .select("user_id, last_seen")
        .eq("is_online", true);

      // Also fetch sample users who are online males
      const { data: sampleUsers } = await supabase
        .from("sample_users")
        .select("*")
        .eq("is_online", true)
        .eq("is_active", true)
        .or("gender.eq.male,gender.eq.Male");

      const onlineMen: OnlineMan[] = [];

      // Process real users
      if (onlineStatuses && onlineStatuses.length > 0) {
        const onlineUserIds = onlineStatuses.map(s => s.user_id);

        // Fetch profiles of online users who are male
        const { data: maleProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, country, state, preferred_language, primary_language, gender, age")
          .in("user_id", onlineUserIds)
          .or("gender.eq.male,gender.eq.Male");

        if (maleProfiles && maleProfiles.length > 0) {
          const maleUserIds = maleProfiles.map(p => p.user_id);

          // Fetch wallet balances
          const { data: wallets } = await supabase
            .from("wallets")
            .select("user_id, balance")
            .in("user_id", maleUserIds);

          // Fetch languages for each man
          const { data: userLanguages } = await supabase
            .from("user_languages")
            .select("user_id, language_name")
            .in("user_id", maleUserIds);

          const walletMap = new Map(wallets?.map(w => [w.user_id, Number(w.balance)]) || []);
          const lastSeenMap = new Map(onlineStatuses.map(s => [s.user_id, s.last_seen]));
          const languageMap = new Map(userLanguages?.map(l => [l.user_id, l.language_name]) || []);

          // Process real male profiles
          maleProfiles.forEach(profile => {
            const manLanguage = languageMap.get(profile.user_id) || 
                               profile.primary_language || 
                               profile.preferred_language || 
                               "Unknown";
            const manCountry = profile.country?.toLowerCase() || "";
            const isManIndian = manCountry === "india";
            
            const isSameLanguage = effectiveWomanLanguage.toLowerCase() === manLanguage.toLowerCase();
            const isManNllbLanguage = nllbLanguageNames.has(manLanguage.toLowerCase());
            const isManNonIndianNllb = nonIndianNllbNames.has(manLanguage.toLowerCase());
            const walletBalance = walletMap.get(profile.user_id) || 0;
            const hasRecharged = walletBalance > 0;

            // Filter: Only show non-Indian men with NLLB-200 languages who have recharged
            // OR same language men who have recharged
            if (!hasRecharged) return; // Must have recharged
            if (!isManNllbLanguage) return; // Must speak NLLB-200 language
            if (isManIndian && !isSameLanguage) return; // Indian men only if same language

            onlineMen.push({
              userId: profile.user_id,
              fullName: profile.full_name || "Anonymous",
              age: profile.age,
              photoUrl: profile.photo_url,
              country: profile.country,
              state: profile.state,
              motherTongue: manLanguage,
              preferredLanguage: profile.preferred_language,
              walletBalance,
              hasRecharged,
              lastSeen: lastSeenMap.get(profile.user_id) || new Date().toISOString(),
              isSameLanguage,
              isNllbLanguage: isManNllbLanguage,
            });
          });
        }
      }

      // Process sample users (treat as having recharged with mock balance)
      if (sampleUsers && sampleUsers.length > 0) {
        sampleUsers.forEach(sample => {
          const manLanguage = sample.language || "Unknown";
          const manCountry = sample.country?.toLowerCase() || "";
          const isManIndian = manCountry === "india";
          
          const isSameLanguage = effectiveWomanLanguage.toLowerCase() === manLanguage.toLowerCase();
          const isManNllbLanguage = nllbLanguageNames.has(manLanguage.toLowerCase());
          
          // Filter: Only show non-Indian men with NLLB-200 languages
          // OR same language men
          if (!isManNllbLanguage) return;
          if (isManIndian && !isSameLanguage) return;

          onlineMen.push({
            userId: sample.id,
            fullName: sample.name || "Anonymous",
            age: sample.age,
            photoUrl: sample.photo_url,
            country: sample.country,
            state: null,
            motherTongue: manLanguage,
            preferredLanguage: null,
            walletBalance: 500, // Mock balance for sample users
            hasRecharged: true, // Sample users are treated as recharged
            lastSeen: sample.updated_at || new Date().toISOString(),
            isSameLanguage,
            isNllbLanguage: isManNllbLanguage,
          });
        });
      }

      // Sort: same language first, then by wallet balance
      const sortedMen = onlineMen.sort((a, b) => {
        if (a.isSameLanguage !== b.isSameLanguage) {
          return a.isSameLanguage ? -1 : 1;
        }
        return b.walletBalance - a.walletBalance;
      });

      // Separate recharged (with balance) and non-recharged
      const recharged = sortedMen.filter(m => m.hasRecharged);
      const nonRecharged = sortedMen.filter(m => !m.hasRecharged);

      setRechargedMen(recharged);
      setNonRechargedMen(nonRecharged);
      setStats(prev => ({
        ...prev,
        totalOnlineMen: sortedMen.length,
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

  const UserCard = ({ user }: { user: OnlineMan }) => (
    <Card 
      className={cn(
        "group hover:shadow-lg transition-all duration-300 cursor-pointer",
        user.isSameLanguage && "ring-2 ring-primary/50",
        user.walletBalance > 1000 && "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent"
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
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            {user.walletBalance > 1000 && (
              <div className="absolute -top-1 -right-1">
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{user.fullName}</h3>
              {user.age && (
                <Badge variant="outline" className="text-xs font-medium">
                  {user.age} yrs
                </Badge>
              )}
              {user.isSameLanguage && (
                <Badge variant="default" className="text-[10px] bg-primary/90">
                  Same Language
                </Badge>
              )}
            </div>
            
            {/* Wallet Balance - Always visible and prominent */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
                <IndianRupee className="h-4 w-4 text-green-600" />
                <span className="text-sm font-bold text-green-600">
                  ₹{user.walletBalance.toFixed(0)}
                </span>
              </div>
              {user.isNllbLanguage && !user.isSameLanguage && (
                <Badge variant="outline" className="text-[10px]">
                  <Globe className="h-2.5 w-2.5 mr-1" />
                  Auto-translate
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mt-1">
              <div className="flex items-center gap-1">
                <Languages className="h-3 w-3" />
                <span>{user.motherTongue}</span>
              </div>
              {(user.state || user.country) && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />
                    {[user.state, user.country].filter(Boolean).join(", ")}
                  </div>
                </>
              )}
            </div>
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

  // Max parallel sessions allowed
  const MAX_PARALLEL_CHATS = 3;

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
        {/* Welcome Section with Filter */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
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
            <MatchFiltersPanel 
              filters={matchFilters} 
              onFiltersChange={setMatchFilters}
              userCountry={currentWomanCountry}
            />
          </div>
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

        {/* Active Chats Section */}
        <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <ActiveChatsSection maxDisplay={5} />
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

          {/* Recharged Men - Sorted by same language first, then balance */}
          <TabsContent value="recharged" className="space-y-3 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                Same language first, then by wallet balance
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  <Languages className="h-3 w-3 mr-1" />
                  {currentWomanLanguage}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Priority
                </Badge>
              </div>
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
                    <UserCard user={user} />
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
                    <UserCard user={user} />
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

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        open={profileEditOpen}
        onOpenChange={setProfileEditOpen}
        onProfileUpdated={() => loadDashboardData()}
      />
    </div>
  );
};

export default WomenDashboardScreen;

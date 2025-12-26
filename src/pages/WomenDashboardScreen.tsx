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
  MapPin,
  ChevronRight,
  Search,
  User,
  Languages,
  Globe,
  Filter,
  Power
} from "lucide-react";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { isIndianLanguage, INDIAN_NLLB200_LANGUAGES, NON_INDIAN_NLLB200_LANGUAGES, ALL_NLLB200_LANGUAGES } from "@/data/nllb200Languages";
import { MatchFiltersPanel, MatchFilters } from "@/components/MatchFiltersPanel";
// ActiveChatsSection removed - chats now handled via EnhancedParallelChatsContainer
// RandomChatButton removed - Women cannot initiate chats
// TeamsChatLayout removed - chats now handled via EnhancedParallelChatsContainer only
import EnhancedParallelChatsContainer from "@/components/EnhancedParallelChatsContainer";
import IncomingCallModal from "@/components/IncomingCallModal";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import { PrivateGroupsSection } from "@/components/PrivateGroupsSection";
import { useTranslation } from "@/contexts/TranslationContext";
import { useActivityBasedStatus } from "@/hooks/useActivityBasedStatus";
import { LanguageGroupChat } from "@/components/LanguageGroupChat";
import AIShiftDisplay from "@/components/AIShiftDisplay";
import LanguageGroupShiftsPanel from "@/components/LanguageGroupShiftsPanel";
import { AIElectionPanel } from "@/components/AIElectionPanel";
import { TransactionHistoryWidget } from "@/components/TransactionHistoryWidget";

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
  activeChatCount?: number; // 0=Free (green), 1-2=Busy (yellow), 3=Full (red)
}

interface DashboardStats {
  totalOnlineMen: number;
  rechargedMen: number;
  nonRechargedMen: number;
  matchCount: number;
  unreadNotifications: number;
  todayEarnings: number;
}

interface BiggestEarner {
  name: string;
  amount: number;
  photoUrl?: string;
}

const WomenDashboardScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, translateDynamicBatch, currentLanguage, setLanguage, isLoading: isTranslating } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [userName, setUserName] = useState("");
  const { incomingCall, clearIncomingCall } = useIncomingCalls(currentUserId || null);
  const [rechargedMen, setRechargedMen] = useState<OnlineMan[]>([]);
  const [nonRechargedMen, setNonRechargedMen] = useState<OnlineMan[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeChatCount, setActiveChatCount] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalOnlineMen: 0,
    rechargedMen: 0,
    nonRechargedMen: 0,
    matchCount: 0,
    unreadNotifications: 0,
    todayEarnings: 0
  });
  const [myTodayEarnings, setMyTodayEarnings] = useState(0);
  const [biggestEarner, setBiggestEarner] = useState<BiggestEarner | null>(null);
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
      label: t('messages', 'Messages'), 
      color: "from-primary to-primary/80",
      action: () => navigate("/match-discovery")
    },
    { 
      icon: <Wallet className="w-6 h-6" />, 
      label: t('withdraw', 'Withdraw'), 
      color: "from-success to-success/80",
      action: () => navigate("/women-wallet")
    },
    { 
      icon: <Heart className="w-6 h-6" />, 
      label: t('matches', 'Matches'), 
      color: "from-accent to-accent/80",
      action: () => navigate("/match-discovery")
    },
    { 
      icon: <User className="w-6 h-6" />, 
      label: t('profile', 'Profile'), 
      color: "from-secondary to-secondary/80",
      action: () => setProfileEditOpen(true)
    },
  ];

  useEffect(() => {
    loadDashboardData();
    updateUserOnlineStatus(true);
    loadActiveChatCount();

    return () => {
      updateUserOnlineStatus(false);
    };
  }, []);

  const [currentWomanLanguage, setCurrentWomanLanguage] = useState<string>("");
  const [currentWomanLanguageCode, setCurrentWomanLanguageCode] = useState<string>("eng_Latn");
  const [currentWomanCountry, setCurrentWomanCountry] = useState<string>("");
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);

  // Activity-based online/offline status (10 min inactivity = offline)
  const { 
    isOnline, 
    isManuallyOffline,
    toggleOnlineStatus 
  } = useActivityBasedStatus({
    userId: currentUserId,
    inactivityTimeout: 10 * 60 * 1000, // 10 minutes
    onStatusChange: (online) => {
      if (!online) {
        toast({
          title: t('autoOffline', 'Gone Offline'),
          description: t('inactivityMessage', 'You went offline due to inactivity'),
        });
      }
    }
  });

  // Real-time subscription for online users, chat sessions, video calls, and earnings
  useEffect(() => {
    if (!currentUserId) return;
    
    const channel = supabase
      .channel('women-dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status' },
        () => { fetchOnlineMen(undefined, currentWomanLanguage, currentWomanCountry); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_chat_sessions' },
        () => { loadActiveChatCount(); loadDashboardData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_call_sessions' },
        () => { loadActiveChatCount(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'women_earnings' },
        () => { loadDashboardData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        () => { loadDashboardData(); }
      )
      // Note: We don't listen to all male_profiles changes as that would cause
      // cross-dashboard interference. The men list is refreshed when:
      // 1. user_status changes (online/offline)
      // 2. THIS woman's language changes (user_languages or female_profiles)
      // Men changing their language affects their visibility to women based on
      // the woman's language filter - which is recalculated on user_status changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        () => { 
          if (currentUserId) {
            fetchNotifications(currentUserId);
          }
        }
      )
      // Listen for language changes in user_languages table (INSERT events - no filter for new records)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_languages' },
        async (payload) => {
          const record = payload.new as { user_id?: string; language_name?: string; language_code?: string };
          // Only process if this is our user's language change
          if (record?.user_id === currentUserId && record?.language_name) {
            console.log("[WomenDashboard] user_languages INSERT:", record.language_name);
            setCurrentWomanLanguage(record.language_name);
            setCurrentWomanLanguageCode(record.language_code || "eng_Latn");
            fetchOnlineMen(undefined, record.language_name, currentWomanCountry);
          }
        }
      )
      // Listen for language updates in user_languages table
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_languages', filter: `user_id=eq.${currentUserId}` },
        async (payload) => {
          const newLanguage = (payload.new as { language_name?: string })?.language_name;
          const newCode = (payload.new as { language_code?: string })?.language_code || "eng_Latn";
          console.log("[WomenDashboard] user_languages UPDATE:", newLanguage);
          if (newLanguage) {
            setCurrentWomanLanguage(newLanguage);
            setCurrentWomanLanguageCode(newCode);
            fetchOnlineMen(undefined, newLanguage, currentWomanCountry);
          }
        }
      )
      // Listen for language changes in female_profiles table
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'female_profiles', filter: `user_id=eq.${currentUserId}` },
        async (payload) => {
          const newProfile = payload.new as { primary_language?: string; preferred_language?: string };
          const newLanguage = newProfile?.primary_language || newProfile?.preferred_language;
          console.log("[WomenDashboard] female_profiles language changed:", newLanguage);
          if (newLanguage) {
            setCurrentWomanLanguage(newLanguage);
            fetchOnlineMen(undefined, newLanguage, currentWomanCountry);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, currentWomanLanguage, currentWomanCountry]);

  const loadActiveChatCount = async () => {
    if (!currentUserId) return;
    
    const { count } = await supabase
      .from("active_chat_sessions")
      .select("*", { count: "exact", head: true })
      .eq("woman_user_id", currentUserId)
      .eq("status", "active");
    
    setActiveChatCount(count || 0);
  };

  const getStatusText = () => {
    if (activeChatCount === 0) return t('available', 'Available');
    if (activeChatCount >= 3) return t('busy', 'Busy') + "(3)";
    return t('busy', 'Busy') + `(${activeChatCount})`;
  };

  const getStatusColor = () => {
    // Green = Available, Yellow/Amber = 1-2 chats, Red = 3 chats (full)
    if (activeChatCount === 0) return "bg-green-500";
    if (activeChatCount >= 3) return "bg-red-500";
    return "bg-amber-500";
  };

  const getStatusDotColor = () => {
    if (activeChatCount === 0) return "bg-green-500";
    if (activeChatCount >= 3) return "bg-red-500";
    return "bg-amber-500";
  };

  const MAX_PARALLEL_CHATS = 3;
  const canStartNewChat = activeChatCount < MAX_PARALLEL_CHATS;

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      setCurrentUserId(user.id);

      // First check gender and approval from main profiles table for redirection
      const { data: mainProfile } = await supabase
        .from("profiles")
        .select("gender, approval_status, full_name, date_of_birth, primary_language, preferred_language, country")
        .eq("user_id", user.id)
        .maybeSingle();

      // Check if female user needs approval (case-insensitive check)
      if (mainProfile?.gender?.toLowerCase() === "female" && mainProfile?.approval_status !== "approved") {
        navigate("/approval-pending");
        return;
      }

      // Use data from main profiles table (single source of truth)
      // mainProfile already fetched above contains all needed fields

      // Use name from main profiles table
      const fullName = mainProfile?.full_name;
      if (fullName) {
        setUserName(fullName.split(" ")[0]);
      }

      // Get woman's mother tongue - use main profiles table first
      const { data: womanLanguages } = await supabase
        .from("user_languages")
        .select("language_name, language_code")
        .eq("user_id", user.id)
        .limit(1);

      const womanLanguage = womanLanguages?.[0]?.language_name || 
                           mainProfile?.primary_language ||
                           mainProfile?.preferred_language ||
                           "English";
      const womanLanguageCode = womanLanguages?.[0]?.language_code || "eng_Latn";
      setCurrentWomanLanguage(womanLanguage);
      setCurrentWomanLanguageCode(womanLanguageCode);
      
      // Use country from main profiles table
      const userCountryValue = mainProfile?.country || "";
      setCurrentWomanCountry(userCountryValue);
      
      // Set all supported NLLB languages for women
      setSupportedLanguages(ALL_NLLB200_LANGUAGES.map(l => l.name));

      // Fetch all data with woman's language context
      await Promise.all([
        fetchOnlineMen(user.id, womanLanguage, userCountryValue),
        fetchMatchCount(user.id),
        fetchNotifications(user.id),
        fetchTodayEarnings(user.id)
      ]);

    } catch {
      // Error loading dashboard - silently handled
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOnlineMen = async (womanUserId?: string, womanLanguage?: string, womanCountry?: string) => {
    try {
      const effectiveWomanLanguage = womanLanguage || currentWomanLanguage;

      // Get ONLY online male users - strict online check
      const { data: onlineStatuses } = await supabase
        .from("user_status")
        .select("user_id, last_seen")
        .eq("is_online", true);

      // If no users online, show empty lists
      if (!onlineStatuses || onlineStatuses.length === 0) {
        console.log("[WomenDashboard] No online men found");
        setRechargedMen([]);
        setNonRechargedMen([]);
        setStats(prev => ({ ...prev, totalOnlineMen: 0, rechargedMen: 0, nonRechargedMen: 0 }));
        return;
      }

      const onlineUserIds = onlineStatuses.map(s => s.user_id);
      const onlineMen: OnlineMan[] = [];

      // Fetch ONLY online male profiles
      const { data: maleProfiles } = await supabase
        .from("male_profiles")
        .select("user_id, full_name, photo_url, country, state, preferred_language, primary_language, age")
        .in("user_id", onlineUserIds)
        .not("photo_url", "is", null)
        .neq("photo_url", "");

      // Also check main profiles table for online men
      const { data: mainProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, country, state, preferred_language, primary_language, age")
        .or("gender.eq.male,gender.eq.Male")
        .in("user_id", onlineUserIds)
        .not("photo_url", "is", null)
        .neq("photo_url", "");

      // Combine profiles (deduplicate)
      const allMaleProfiles = [...(maleProfiles || [])];
      const existingUserIds = new Set(allMaleProfiles.map(p => p.user_id));
      mainProfiles?.forEach(p => {
        if (!existingUserIds.has(p.user_id)) {
          allMaleProfiles.push(p);
        }
      });

      if (allMaleProfiles.length === 0) {
        console.log("[WomenDashboard] No online male profiles found");
        setRechargedMen([]);
        setNonRechargedMen([]);
        setStats(prev => ({ ...prev, totalOnlineMen: 0, rechargedMen: 0, nonRechargedMen: 0 }));
        return;
      }

      const maleUserIds = allMaleProfiles.map(p => p.user_id);

      // Fetch wallet balances, languages, chat counts in parallel
      const [walletsRes, languagesRes, chatCountsRes] = await Promise.all([
        supabase.from("wallets").select("user_id, balance").in("user_id", maleUserIds),
        supabase.from("user_languages").select("user_id, language_name").in("user_id", maleUserIds),
        supabase.from("active_chat_sessions").select("man_user_id").in("man_user_id", maleUserIds).eq("status", "active")
      ]);

      const walletMap = new Map(walletsRes.data?.map(w => [w.user_id, Number(w.balance)]) || []);
      const lastSeenMap = new Map(onlineStatuses.map(s => [s.user_id, s.last_seen]));
      const languageMap = new Map(languagesRes.data?.map(l => [l.user_id, l.language_name]) || []);

      // Count active chats per man for load balancing
      const chatCountMap = new Map<string, number>();
      chatCountsRes.data?.forEach(chat => {
        const count = chatCountMap.get(chat.man_user_id) || 0;
        chatCountMap.set(chat.man_user_id, count + 1);
      });

      // Process male profiles
      allMaleProfiles.forEach(profile => {
        const manLanguage = languageMap.get(profile.user_id) || 
                           profile.primary_language || 
                           profile.preferred_language || 
                           "Unknown";
        
        const isSameLanguage = effectiveWomanLanguage.toLowerCase() === manLanguage.toLowerCase();
        const walletBalance = walletMap.get(profile.user_id) || 0;
        const hasRecharged = walletBalance > 0;
        const activeChatCount = chatCountMap.get(profile.user_id) || 0;

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
          isNllbLanguage: true, // All languages supported with translation
          activeChatCount
        });
      });

      // Sort by load: lowest chat count first, then same language, then wallet balance
      const sortedMen = onlineMen.sort((a, b) => {
        // First: by active chat count (load balancing - lower is better)
        if (a.activeChatCount !== b.activeChatCount) {
          return a.activeChatCount - b.activeChatCount;
        }
        // Second: same language preference
        if (a.isSameLanguage !== b.isSameLanguage) {
          return a.isSameLanguage ? -1 : 1;
        }
        // Third: by wallet balance (higher is better for women)
        return b.walletBalance - a.walletBalance;
      });

      // Separate recharged (with balance) and non-recharged
      const recharged = sortedMen.filter(m => m.hasRecharged);
      const nonRecharged = sortedMen.filter(m => !m.hasRecharged);

      console.log("[WomenDashboard] Online recharged men:", recharged.length);
      console.log("[WomenDashboard] Online non-recharged men:", nonRecharged.length);

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
      setRechargedMen([]);
      setNonRechargedMen([]);
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
    // Get today's start in local time
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    
    // Fetch current user's earnings today from women_earnings table
    const { data: myEarnings, error: myError } = await supabase
      .from("women_earnings")
      .select("amount")
      .eq("user_id", userId)
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd);

    console.log("[Earnings] My earnings query:", { myEarnings, myError, todayStart, todayEnd });
    
    const myTotal = myEarnings?.reduce((acc, e) => acc + Number(e.amount), 0) || 0;
    setMyTodayEarnings(myTotal);
    setStats(prev => ({ ...prev, todayEarnings: myTotal }));

    // Use secure RPC function to get top earner (bypasses RLS safely)
    const { data: topEarnerData, error: topError } = await supabase
      .rpc('get_top_earner_today');
    
    console.log("[Earnings] Top earner query:", { topEarnerData, topError });

    if (topEarnerData && topEarnerData.length > 0) {
      const topEarner = topEarnerData[0];
      setBiggestEarner({
        name: topEarner.full_name || "Top Earner",
        amount: Number(topEarner.total_amount) || 0
      });
    } else {
      setBiggestEarner(null);
    }
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
    } catch {
      // Error updating status - silently handled
    }
  };

  const handleLogout = async () => {
    await updateUserOnlineStatus(false);
    await supabase.auth.signOut();
    toast({
      title: t('loggedOut', 'Logged out'),
      description: t('seeYouSoon', 'See you soon!'),
    });
    navigate("/");
  };

  const handleChatWithUser = async (userId: string) => {
    // Check if there's already an active session with this user
    const { data: existingSession } = await supabase
      .from("active_chat_sessions")
      .select("id")
      .eq("man_user_id", userId)
      .eq("woman_user_id", currentUserId)
      .eq("status", "active")
      .maybeSingle();

    if (existingSession) {
      // Chat already exists - parallel chat container will show it
      toast({
        title: t('chatActive', 'Chat Active'),
        description: t('chatAlreadyActive', 'This chat is already active'),
      });
      return;
    }

    // Check parallel chat limit for women (max 3)
    const { count: activeChats } = await supabase
      .from("active_chat_sessions")
      .select("*", { count: "exact", head: true })
      .eq("woman_user_id", currentUserId)
      .eq("status", "active");

    if ((activeChats || 0) >= MAX_PARALLEL_CHATS) {
      toast({
        title: t('maxChatsReached', 'Max Chats Reached'),
        description: t('canOnlyHave3Chats', 'You can only have 3 active chats at a time. End a chat to start a new one.'),
        variant: "destructive",
      });
      return;
    }

    // Stay on dashboard - incoming chat popup handles new chat requests
    toast({
      title: t('viewingProfile', 'Profile'),
      description: t('waitForChatRequest', 'Wait for this user to send a chat request'),
    });
  };

  // Women cannot initiate chats - they can only respond to incoming chats from men
  // This function is disabled for women users
  const handleStartChatWithUser = async (userId: string) => {
    toast({
      title: t('actionNotAllowed', 'Action Not Allowed'),
      description: t('womenCannotInitiateChat', 'Women cannot initiate chats. Please wait for men to start a conversation with you.'),
      variant: "destructive",
    });
    return;
  };

  const handleViewProfile = (userId: string) => {
    // Stay on dashboard - profile info shown in UserCard, chats handled by parallel container
    toast({
      title: t('viewingProfile', 'Profile'),
      description: t('waitForChatRequest', 'Wait for this user to send you a chat request'),
    });
  };

  const UserCard = ({ user }: { user: OnlineMan }) => (
    <Card 
      className={cn(
        "group hover:shadow-lg transition-all duration-300 cursor-pointer",
        user.isSameLanguage && "ring-2 ring-primary/50",
        user.walletBalance > 1000 && "border-warning/30 bg-gradient-to-br from-warning/5 to-transparent"
      )}
      onClick={() => handleViewProfile(user.userId)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-14 w-14 border-2 border-background shadow-md">
              <AvatarImage src={user.photoUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-lg">
                {user.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Status indicator: Green=Available, Yellow=1-2 chats, Red=Full */}
            <div className={cn(
              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
              (user.activeChatCount || 0) === 0 ? "bg-green-500" :
              (user.activeChatCount || 0) >= 3 ? "bg-red-500" : "bg-amber-500"
            )} title={
              (user.activeChatCount || 0) === 0 ? "Available" :
              (user.activeChatCount || 0) >= 3 ? "Busy (3/3)" : `Busy (${user.activeChatCount}/3)`
            } />
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
                  {user.age} {t('yearsOld', 'yrs')}
                </Badge>
              )}
              {user.isSameLanguage && (
                <Badge variant="default" className="text-[10px] bg-primary/90">
                  {t('sameLanguage', 'Same Language')}
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
                  {t('autoTranslateMessages', 'Auto-translate')}
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
              variant="auroraOutline"
              onClick={(e) => { e.stopPropagation(); handleViewProfile(user.userId); }}
              title={t('viewProfile', 'View Profile')}
            >
              <User className="h-4 w-4 mr-1" />
              {t('viewProfile', 'View')}
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
        {/* Section 1: Welcome & Status */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isOnline}
                    onCheckedChange={(checked) => {
                      toggleOnlineStatus(checked);
                      toast({
                        title: checked ? t('youAreOnline', 'You are now online') : t('youAreOffline', 'You are now offline'),
                        description: checked ? t('usersCanSeeYou', 'Other users can see you') : t('usersCannotSeeYou', 'You are hidden from other users'),
                      });
                    }}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Power className={`w-4 h-4 ${isOnline ? "text-emerald-500" : "text-muted-foreground"}`} />
                  <span className="text-sm text-muted-foreground">
                    {isOnline ? t('online', 'Online') : t('offline', 'Offline')}
                  </span>
                </div>
                <Badge className={cn("text-xs text-white flex items-center gap-1.5", getStatusColor())}>
                  <span className={cn("w-2 h-2 rounded-full animate-pulse", 
                    activeChatCount === 0 ? "bg-green-300" : 
                    activeChatCount >= 3 ? "bg-red-300" : "bg-amber-300"
                  )} />
                  {getStatusText()}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {t('welcome', 'Welcome back')}{userName ? `, ${userName}` : ""}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                {stats.totalOnlineMen} {t('onlineMen', 'men online right now')}
              </p>
            </div>
            <MatchFiltersPanel 
              filters={matchFilters} 
              onFiltersChange={setMatchFilters}
              userCountry={currentWomanCountry}
            />
          </div>
        </div>

        {/* Today's Earnings Summary */}
        <div className="animate-fade-in" style={{ animationDelay: "0.03s" }}>
          <div className="grid grid-cols-2 gap-3">
            {/* My Today's Earnings */}
            <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('myEarningsToday', 'My Earnings Today')}</p>
                  <p className="text-xl font-bold text-emerald-600">₹{myTodayEarnings.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            {/* Biggest Earner Today */}
            <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20">
                  <Crown className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('topEarnerToday', 'Top Earner Today')}</p>
                  {biggestEarner ? (
                    <>
                      <p className="text-sm font-semibold text-foreground truncate">{biggestEarner.name}</p>
                      <p className="text-lg font-bold text-amber-600">₹{biggestEarner.amount.toLocaleString()}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('noEarningsYet', 'No earnings yet')}</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="recharged" className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recharged" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              {t('premium', 'Premium')} ({stats.rechargedMen})
            </TabsTrigger>
            <TabsTrigger value="non-recharged" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('regularUsers', 'Regular')} ({stats.nonRechargedMen})
            </TabsTrigger>
          </TabsList>

          {/* Recharged Men - Sorted by same language first, then balance */}
          <TabsContent value="recharged" className="space-y-3 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                {t('sameLanguageFirst', 'Same language first, then by wallet balance')}
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  <Languages className="h-3 w-3 mr-1" />
                  {currentWomanLanguage}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  {t('priority', 'Priority')}
                </Badge>
              </div>
            </div>

            {rechargedMen.length === 0 ? (
              <Card className="p-8 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('noPremiumMenOnline', 'No premium men online')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('checkBackLaterForWalletUsers', 'Check back later for users with wallet balance')}
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
              {t('usersWithoutBalance', 'Users without wallet balance')}
            </p>

            {nonRechargedMen.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('noRegularUsersOnline', 'No regular users online')}</p>
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

        {/* Section 3: Key Stats */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <Card className="p-4 bg-gradient-aurora border-primary/30 shadow-glow">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.rechargedMen}</p>
                <p className="text-xs text-muted-foreground">{t('premiumUsers', 'Premium Men')}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-aurora border-accent/30 shadow-glow">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/20">
                <IndianRupee className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-bold">₹{stats.todayEarnings.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{t('todayEarnings', "Today's Earnings")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-aurora border-primary/30 shadow-glow">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.matchCount}</p>
                <p className="text-xs text-muted-foreground">{t('matches', 'Matches')}</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-4 bg-gradient-aurora border-accent/30 shadow-glow cursor-pointer col-span-2"
            onClick={() => navigate("/shift-management")}
          >
            <AIShiftDisplay userId={currentUserId} compact />
          </Card>
        </div>

        {/* Section 2.5: Language Group 24/7 Coverage */}
        <div className="animate-fade-in" style={{ animationDelay: "0.09s" }}>
          <LanguageGroupShiftsPanel 
            userId={currentUserId} 
            language={currentWomanLanguage}
          />
        </div>

        {/* Section 3: Active Chats Info - Women can only reply to existing chats */}
        <div className="animate-fade-in" style={{ animationDelay: "0.12s" }}>
          <Card className="p-4 bg-gradient-aurora border-primary/30 shadow-glow">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{t('chatMode', 'Reply Mode')}</p>
                <p className="text-xs text-muted-foreground">{t('womenCanOnlyReply', 'You can reply to messages from men who start chats with you')}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {activeChatCount} {t('activeChats', 'active')}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Active Chats now handled via EnhancedParallelChatsContainer at bottom of screen */}

        {/* Transaction History for Women */}
        {currentUserId && (
          <div className="animate-fade-in" style={{ animationDelay: "0.155s" }}>
            <TransactionHistoryWidget
              userId={currentUserId}
              userGender="female"
              maxItems={8}
              showViewAll={true}
            />
          </div>
        )}

        {/* Language Community Group Chat */}
        <div className="animate-fade-in" style={{ animationDelay: "0.16s" }}>
          {currentWomanLanguage && currentUserId && (
            <LanguageGroupChat
              currentUserId={currentUserId}
              languageCode={currentWomanLanguageCode}
              languageName={currentWomanLanguage}
              userName={userName || 'User'}
              userPhoto={null}
            />
          )}
        </div>

        {/* AI Election Panel */}
        <div className="animate-fade-in" style={{ animationDelay: "0.18s" }}>
          {currentWomanLanguage && currentUserId && (
            <Card className="p-4">
              <AIElectionPanel
                currentUserId={currentUserId}
                languageCode={currentWomanLanguage}
                members={[]}
              />
            </Card>
          )}
        </div>

        {/* Private Groups Section */}
        <div className="animate-fade-in" style={{ animationDelay: "0.17s" }}>
          <PrivateGroupsSection
            currentUserId={currentUserId}
            userName={userName || 'User'}
            userPhoto={null}
          />
        </div>

        {/* Section 5: Quick Actions */}
        <div className="animate-fade-in" style={{ animationDelay: "0.18s" }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('quickActions', 'Quick Actions')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="group p-6 rounded-2xl bg-gradient-aurora border border-primary/20 hover:border-primary/40 hover:shadow-glow transition-all duration-300"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary/80 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <p className="text-sm font-medium text-foreground">{action.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Section 7: Recent Notifications */}
        <div className="animate-fade-in" style={{ animationDelay: "0.28s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{t('recentActivity', 'Recent Activity')}</h2>
            <button className="text-sm text-primary hover:underline flex items-center gap-1">
              {t('viewAll', 'View all')} <ChevronRight className="w-4 h-4" />
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
              <Heart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No new activity yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start chatting to get matches and notifications!
              </p>
              <Button 
                variant="aurora" 
                className="mt-4"
                onClick={() => navigate("/online-users")}
              >
                <Search className="w-4 h-4 mr-2" />
                Find Users
              </Button>
            </Card>
          )}
        </div>

        {/* Section 8: Shift CTA Card */}
        <Card className="p-4 bg-gradient-aurora border-primary/30 shadow-glow animate-fade-in" style={{ animationDelay: "0.32s" }}>
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
            <Button variant="aurora" onClick={() => navigate("/shift-management")}>
              Go <ChevronRight className="h-4 w-4 ml-1" />
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

      {/* TeamsChatLayout removed - all chats handled via EnhancedParallelChatsContainer */}

      {/* Enhanced Parallel Chat Windows */}
      {currentUserId && (
        <EnhancedParallelChatsContainer
          currentUserId={currentUserId}
          userGender="female"
          currentUserLanguage={currentWomanLanguage || "English"}
        />
      )}

      {/* Incoming Video Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={!!incomingCall}
          onClose={clearIncomingCall}
          callId={incomingCall.callId}
          callerUserId={incomingCall.callerUserId}
          callerName={incomingCall.callerName}
          callerPhoto={incomingCall.callerPhoto}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};

export default WomenDashboardScreen;

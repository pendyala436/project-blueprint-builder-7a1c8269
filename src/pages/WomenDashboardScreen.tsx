import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MeowLogo from "@/components/MeowLogo";
import { useToast } from "@/hooks/use-toast";
import { RandomChatButton } from "@/components/RandomChatButton";
import { 
  Heart, 
  Users, 
  Bell, 
  MessageCircle, 
  Settings,
  FileCheck,
  Circle,
  LogOut,
  Wallet,
  
  IndianRupee,
  Crown,
  MapPin,
  ChevronRight,
  Search,
  User,
  Languages,
  Globe,
  Globe2,
  Filter,
  Power,
  Users2,
  Star,
  Loader2,
  MessageCircle as MessageCircleIcon,
  Video,
  Eye,
  Sparkles,
  Mail,
  Shield,
  ChevronUp,
  ChevronDown,
  RefreshCw
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FriendsBlockedPanel } from "@/components/FriendsBlockedPanel";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
// ActiveChatsSection removed - chats now handled via EnhancedParallelChatsContainer
// RandomChatButton removed - Women cannot initiate chats
// TeamsChatLayout removed - chats now handled via EnhancedParallelChatsContainer only
import EnhancedParallelChatsContainer from "@/components/EnhancedParallelChatsContainer";
import IncomingVideoCallWindow from "@/components/IncomingVideoCallWindow";
import WomenChatModeSwitcher from "@/components/WomenChatModeSwitcher";
import { useWomenChatMode } from "@/hooks/useWomenChatMode";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import { PrivateGroupsSection } from "@/components/PrivateGroupsSection";
import { UserAdminChat } from "@/components/UserAdminChat";
import { AdminMessagesWidget } from "@/components/AdminMessagesWidget";
import { useActivityBasedStatus } from "@/hooks/useActivityBasedStatus";
import { LanguageGroupChat } from "@/components/LanguageGroupChat";
import DirectVideoCallButton from "@/components/DirectVideoCallButton";

import { MatchFiltersPanel, MatchFilters } from "@/components/MatchFiltersPanel";

import { WomenKYCForm } from "@/components/WomenKYCForm";

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
  isLanguageSupported: boolean;
  activeChatCount?: number; // 0=Free (green), 1-2=Busy (yellow), 3=Full (red)
}

interface MatchedMan {
  matchId: string;
  userId: string;
  fullName: string;
  photoUrl: string | null;
  age: number | null;
  country: string | null;
  primaryLanguage: string | null;
  isOnline: boolean;
  matchedAt: string;
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

// Extracted to top-level to avoid Hooks violation (Rules of Hooks)
const ScrollableUserList = ({ children }: { children: React.ReactNode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 10);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    // Use ResizeObserver to re-check when content size changes (replaces deps spread)
    const observer = new ResizeObserver(() => checkScroll());
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  const scrollBy = (direction: 'up' | 'down') => {
    scrollRef.current?.scrollBy({ top: direction === 'up' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {canScrollUp && (
        <div className="sticky top-0 z-10 flex justify-center pb-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 w-7 rounded-full shadow-md p-0"
            onClick={() => scrollBy('up')}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div
        ref={scrollRef}
        className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scroll-smooth"
      >
        {children}
      </div>
      {canScrollDown && (
        <div className="sticky bottom-0 z-10 flex justify-center pt-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 w-7 rounded-full shadow-md p-0"
            onClick={() => scrollBy('down')}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

const WomenDashboardScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Plain English helper - no translation, returns fallback directly
  const t = useCallback((_key: string, fallback: string) => fallback, []);
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null); // User's photo for chat validation
  const { incomingCall, clearIncomingCall } = useIncomingCalls(currentUserId || null, "female");
  const [rechargedMen, setRechargedMen] = useState<OnlineMan[]>([]);
  const [nonRechargedMen, setNonRechargedMen] = useState<OnlineMan[]>([]);
  const [sameLanguageMen, setSameLanguageMen] = useState<OnlineMan[]>([]);
  const [otherLanguageMen, setOtherLanguageMen] = useState<OnlineMan[]>([]);
  const [matchedMen, setMatchedMen] = useState<MatchedMan[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
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
  const [myWalletBalance, setMyWalletBalance] = useState(0);
  const [biggestEarner, setBiggestEarner] = useState<BiggestEarner | null>(null);
  const [hasGoldenBadge, setHasGoldenBadge] = useState(false);
  const [goldenBadgeExpiry, setGoldenBadgeExpiry] = useState<string | null>(null);
  const [isPurchasingBadge, setIsPurchasingBadge] = useState(false);
  const [goldenBadgePrice, setGoldenBadgePrice] = useState(1000);
  const [isIndianWoman, setIsIndianWoman] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [showAdminChat, setShowAdminChat] = useState(false);
  const [showAdminMessages, setShowAdminMessages] = useState(false);
  const [showKYCForm, setShowKYCForm] = useState(false);
  
  // Women Chat Mode (paid/free/exclusive_free)
  const chatMode = useWomenChatMode(currentUserId || null, isIndianWoman);
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
      label: t('messages', 'Chats'), 
      color: "from-primary to-primary/80",
      action: () => navigate("/match-discovery")
    },
    { 
      icon: <Wallet className="w-6 h-6" />, 
      label: t('withdraw', 'Earnings'), 
      color: "from-primary/90 to-primary/70",
      action: () => navigate("/women-wallet")
    },
    { 
      icon: <Heart className="w-6 h-6" />, 
      label: t('matches', 'Matches'), 
      color: "from-primary/80 to-primary/60",
      action: () => navigate("/match-discovery")
    },
    { 
      icon: <User className="w-6 h-6" />, 
      label: t('profile', 'My Profile'), 
      color: "from-primary/70 to-primary/50",
      action: () => setProfileEditOpen(true)
    },
  ];

  useEffect(() => {
    let mounted = true;
    let loadingTimeoutId: NodeJS.Timeout;
    
    // Safety timeout - force loading complete after 12 seconds to prevent stuck state
    loadingTimeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('[WomenDashboard] Loading timed out - forcing complete');
        setIsLoading(false);
      }
    }, 12000);

    // Quick approval check before loading heavy dashboard data
    // Use getSession() first to restore from localStorage (prevents refresh logout)
    const initDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (!session?.user) { 
          // Don't redirect - ProtectedRoute handles auth.
          clearTimeout(loadingTimeoutId);
          setIsLoading(false);
          return; 
        }
        const user = session.user;
        
        // Quick approval gate - redirect immediately if not approved
        const { data: profile } = await supabase
          .from("profiles")
          .select("gender, approval_status")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (!mounted) return;
        
        if (profile?.gender?.toLowerCase() === "female" && profile?.approval_status !== "approved") {
          clearTimeout(loadingTimeoutId);
          navigate("/approval-pending");
          return;
        }

        // Only load heavy data after approval confirmed
        await loadDashboardData();
        updateUserOnlineStatus(true);
        loadActiveChatCount();
      } catch (error) {
        console.error('[WomenDashboard] Init error:', error);
        toast({ title: 'Dashboard unavailable', description: 'Unable to load your dashboard. Please refresh the page.', variant: 'destructive' });
        if (mounted) setIsLoading(false);
      } finally {
        if (mounted) clearTimeout(loadingTimeoutId);
      }
    };
    
    initDashboard();

    return () => {
      mounted = false;
      clearTimeout(loadingTimeoutId);
      if (fetchMenTimeoutRef.current) clearTimeout(fetchMenTimeoutRef.current);
      updateUserOnlineStatus(false);
    };
  }, []);

  const [currentWomanLanguage, setCurrentWomanLanguage] = useState<string>("");
  const currentWomanLanguageRef = useRef(currentWomanLanguage);
  const [currentWomanLanguageCode, setCurrentWomanLanguageCode] = useState<string>("eng_Latn");
  const [currentWomanCountry, setCurrentWomanCountry] = useState<string>("");
  const currentWomanCountryRef = useRef(currentWomanCountry);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);

  // Keep refs in sync so throttled callback always has latest values
  useEffect(() => { currentWomanLanguageRef.current = currentWomanLanguage; }, [currentWomanLanguage]);
  useEffect(() => { currentWomanCountryRef.current = currentWomanCountry; }, [currentWomanCountry]);

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
  // Use refs for throttled callbacks to avoid excessive refetching
  const lastFetchMenRef = useRef<number>(0);
  const fetchMenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledFetchOnlineMen = useCallback(() => {
    const now = Date.now();
    const lang = currentWomanLanguageRef.current;
    const country = currentWomanCountryRef.current;
    if (now - lastFetchMenRef.current < 5000) {
      if (fetchMenTimeoutRef.current) clearTimeout(fetchMenTimeoutRef.current);
      fetchMenTimeoutRef.current = setTimeout(() => {
        lastFetchMenRef.current = Date.now();
        fetchOnlineMen(currentWomanLanguageRef.current, currentWomanCountryRef.current);
      }, 3000);
      return;
    }
    lastFetchMenRef.current = now;
    fetchOnlineMen(lang, country);
  }, []); // stable — reads from refs, no stale closure

  useEffect(() => {
    if (!currentUserId) return;
    
    const channel = supabase
      .channel('women-dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status' },
        () => { throttledFetchOnlineMen(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_chat_sessions' },
        // Only refresh chat count - full loadDashboardData is too expensive on every chat event
        () => { loadActiveChatCount(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_call_sessions' },
        () => { loadActiveChatCount(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'women_earnings' },
        // Only refresh wallet/earnings, not full dashboard reload
        () => { if (currentUserId) { fetchWalletBalance(currentUserId); fetchTopEarnerLeaderboard(currentUserId); } }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users_wallet' },
        // Only refresh wallet balance
        () => { if (currentUserId) { fetchWalletBalance(currentUserId); } }
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
            fetchOnlineMen(record.language_name, currentWomanCountry);
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
            fetchOnlineMen(newLanguage, currentWomanCountry);
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
            fetchOnlineMen(newLanguage, currentWomanCountry);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]); // stable — throttledFetchOnlineMen reads from refs; language handlers fetch directly

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
    if (activeChatCount >= 3) return t('busy', 'Busy') + "(3)";
    return t('available', 'Available');
  };

  const getStatusColor = () => {
    // Green = Online/Available, Red = Full (3 chats)
    if (activeChatCount >= 3) return "bg-destructive";
    return "bg-online";
  };

  const MAX_PARALLEL_CHATS = 3;
  const canStartNewChat = activeChatCount < MAX_PARALLEL_CHATS;

  const loadDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Don't redirect — ProtectedRoute handles auth guard.
        // Just stop loading to avoid stuck spinner on token refresh race.
        setIsLoading(false);
        return;
      }
      const user = session.user;

      setCurrentUserId(user.id);

      // Wrap profile fetch in timeout to prevent hang
      const profilePromise = supabase
        .from("profiles")
        .select("gender, approval_status, full_name, date_of_birth, primary_language, preferred_language, country, photo_url, is_indian, has_golden_badge, golden_badge_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      
      const profileTimeout = new Promise<{ data: null, error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      let mainProfile: { gender?: string | null; approval_status?: string | null; full_name?: string | null; date_of_birth?: string | null; primary_language?: string | null; preferred_language?: string | null; country?: string | null; photo_url?: string | null; is_indian?: boolean | null; has_golden_badge?: boolean | null; golden_badge_expires_at?: string | null } | null = null;
      try {
        const result = await Promise.race([profilePromise, profileTimeout]);
        mainProfile = result.data;
      } catch {
        console.warn('[WomenDashboard] Profile fetch timed out or failed');
      }
        
      // Store user's photo for chat validation
      setUserPhoto(mainProfile?.photo_url || null);
      
      // Check golden badge status
      const isIndian = mainProfile?.is_indian === true || 
        mainProfile?.country?.toLowerCase().includes('india');
      setIsIndianWoman(isIndian && mainProfile?.gender?.toLowerCase() === 'female');
      
      const badgeActive = mainProfile?.has_golden_badge === true && 
        mainProfile?.golden_badge_expires_at && 
        new Date(mainProfile.golden_badge_expires_at) > new Date();
      setHasGoldenBadge(!!badgeActive);
      if (mainProfile?.golden_badge_expires_at) {
        setGoldenBadgeExpiry(mainProfile.golden_badge_expires_at);
      }

      // Fetch golden badge price from app_settings
      const { data: badgePriceSetting } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "golden_badge_price")
        .eq("is_public", true)
        .maybeSingle();
      if (badgePriceSetting?.setting_value) {
        setGoldenBadgePrice(Number(badgePriceSetting.setting_value) || 1000);
      }

      // Check if female user needs approval (case-insensitive check)
      if (mainProfile?.gender?.toLowerCase() === "female" && mainProfile?.approval_status !== "approved") {
        navigate("/approval-pending");
        return;
      }

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
      const { ALL_SUPPORTED_LANGUAGES } = await import("@/data/supportedLanguages");
      setSupportedLanguages(ALL_SUPPORTED_LANGUAGES.map(l => l.name));

      // Fetch all data with woman's language context - using allSettled for resilience
      await Promise.allSettled([
        fetchOnlineMen(womanLanguage, userCountryValue),
        fetchMatchCount(user.id),
        fetchNotifications(user.id),
        fetchTopEarnerLeaderboard(user.id),
        fetchWalletBalance(user.id)
      ]);

    } catch (error) {
      console.error('[WomenDashboard] Error loading dashboard:', error);
      toast({ title: 'Dashboard unavailable', description: 'Unable to load your dashboard. Please refresh.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOnlineMen = async (womanLanguage?: string, womanCountry?: string) => {
    try {
      const effectiveWomanLanguage = womanLanguage || currentWomanLanguage;

      // Use secure RPC function that bypasses RLS to get wallet balances
      const { data: onlineMenData, error } = await supabase.rpc('get_online_men_dashboard');

      if (error) {
        console.error("[WomenDashboard] RPC error:", error);
        // Non-critical RPC error in stats calculation
        setRechargedMen([]);
        setNonRechargedMen([]);
        setStats(prev => ({ ...prev, totalOnlineMen: 0, rechargedMen: 0, nonRechargedMen: 0 }));
        return;
      }

      if (!onlineMenData || onlineMenData.length === 0) {
        console.log("[WomenDashboard] No online men found");
        setRechargedMen([]);
        setNonRechargedMen([]);
        setStats(prev => ({ ...prev, totalOnlineMen: 0, rechargedMen: 0, nonRechargedMen: 0 }));
        return;
      }

      // Process the RPC results
      const onlineMen: OnlineMan[] = onlineMenData.map((man: {
        user_id: string;
        full_name: string;
        photo_url: string | null;
        country: string | null;
        state: string | null;
        preferred_language: string | null;
        primary_language: string | null;
        age: number | null;
        mother_tongue: string;
        wallet_balance: number;
        last_seen: string;
        active_chat_count: number;
      }) => {
        const manLanguage = man.mother_tongue || man.primary_language || man.preferred_language || "Unknown";
        const isSameLanguage = effectiveWomanLanguage.toLowerCase() === manLanguage.toLowerCase();
        const walletBalance = Number(man.wallet_balance) || 0;
        // Premium users have wallet balance > 0 (recharged), regular users have 0
        const hasRecharged = walletBalance > 0;

        return {
          userId: man.user_id,
          fullName: man.full_name || "Anonymous",
          age: man.age,
          photoUrl: man.photo_url,
          country: man.country,
          state: man.state,
          motherTongue: manLanguage,
          preferredLanguage: man.preferred_language,
          walletBalance,
          hasRecharged,
          lastSeen: man.last_seen || new Date().toISOString(),
          isSameLanguage,
          isLanguageSupported: true, // All languages supported with translation
          activeChatCount: man.active_chat_count || 0
        };
      });

      // Apply match filters client-side
      const filteredMen = onlineMen.filter(m => {
        if (matchFilters.ageRange && m.age != null) {
          if (m.age < matchFilters.ageRange[0] || m.age > matchFilters.ageRange[1]) return false;
        }
        if (matchFilters.country && matchFilters.country !== "all" && m.country) {
          if (m.country.toLowerCase() !== matchFilters.country.toLowerCase()) return false;
        }
        if (matchFilters.language && matchFilters.language !== "all" && m.motherTongue) {
          if (m.motherTongue.toLowerCase() !== matchFilters.language.toLowerCase()) return false;
        }
        if (matchFilters.religion && matchFilters.religion !== "all") return true; // no religion field from RPC
        if (matchFilters.premiumOnly && !m.hasRecharged) return false;
        if (matchFilters.verifiedOnly) return true; // no verified field from RPC
        return true;
      });

      // Sort by load: lowest chat count first, then same language, then wallet balance
      const sortedMen = filteredMen.sort((a, b) => {
        if (a.activeChatCount !== b.activeChatCount) {
          return (a.activeChatCount || 0) - (b.activeChatCount || 0);
        }
        if (a.isSameLanguage !== b.isSameLanguage) {
          return a.isSameLanguage ? -1 : 1;
        }
        return b.walletBalance - a.walletBalance;
      });

      // Separate premium (balance > 0) and regular (balance = 0)
      const recharged = sortedMen.filter(m => m.hasRecharged);
      const nonRecharged = sortedMen.filter(m => !m.hasRecharged);

      // Sort premium men by wallet balance descending (highest balance first)
      const sortedRecharged = recharged.sort((a, b) => b.walletBalance - a.walletBalance);

      // Split by same language / other language (like men's dashboard)
      const sameLanguage = sortedMen.filter(m => m.isSameLanguage);
      const otherLanguage = sortedMen.filter(m => !m.isSameLanguage);

      console.log("[WomenDashboard] Online same-language men:", sameLanguage.length);
      console.log("[WomenDashboard] Online other-language men:", otherLanguage.length);

      setRechargedMen(sortedRecharged);
      setNonRechargedMen(nonRecharged);
      setSameLanguageMen(sameLanguage);
      setOtherLanguageMen(otherLanguage);
      setStats(prev => ({
        ...prev,
        totalOnlineMen: sortedMen.length,
        rechargedMen: sortedRecharged.length,
        nonRechargedMen: nonRecharged.length
      }));

    } catch (error) {
      console.error("[WomenDashboard] Error fetching online men:", error);
      // Non-critical - online users list
      setRechargedMen([]);
      setNonRechargedMen([]);
      setSameLanguageMen([]);
      setOtherLanguageMen([]);
      setStats(prev => ({ ...prev, totalOnlineMen: 0, rechargedMen: 0, nonRechargedMen: 0 }));
    }
  };

  const fetchMatchCount = async (userId: string) => {
    try {
      const { count } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
        .eq("status", "accepted");

      setStats(prev => ({ ...prev, matchCount: count || 0 }));
      
      // Also fetch matched men profiles
      await fetchMatchedMen(userId);
    } catch (error) {
      console.error('[WomenDashboard] fetchMatchCount error:', error);
    }
  };

  const fetchMatchedMen = async (userId: string) => {
    setLoadingMatches(true);
    try {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, matched_user_id, user_id, matched_at, status")
        .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
        .order("matched_at", { ascending: false })
        .limit(50);

      if (!matches || matches.length === 0) {
        setMatchedMen([]);
        setLoadingMatches(false);
        return;
      }

      const otherUserIds = matches.map(m => 
        m.user_id === userId ? m.matched_user_id : m.user_id
      );

      const [profilesRes, statusesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, age, country, primary_language, gender")
          .in("user_id", otherUserIds),
        supabase
          .from("user_status")
          .select("user_id, is_online")
          .in("user_id", otherUserIds)
      ]);

      const statusMap = new Map(statusesRes.data?.map(s => [s.user_id, s.is_online]) || []);
      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);

      const matched: MatchedMan[] = matches
        .map(m => {
          const otherId = m.user_id === userId ? m.matched_user_id : m.user_id;
          const profile = profileMap.get(otherId);
          if (!profile || profile.gender?.toLowerCase() !== 'male') return null;
          return {
            matchId: m.id,
            userId: otherId,
            fullName: profile.full_name || 'Anonymous',
            photoUrl: profile.photo_url,
            age: profile.age,
            country: profile.country,
            primaryLanguage: profile.primary_language,
            isOnline: statusMap.get(otherId) || false,
            matchedAt: m.matched_at,
          };
        })
        .filter(Boolean) as MatchedMan[];

      setMatchedMen(matched);
    } catch (error) {
      console.error("Error fetching matched men:", error);
      // Non-critical - matches list
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchNotifications = async (userId: string) => {
    try {
      const { data, count } = await supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      setNotifications(data || []);
      setStats(prev => ({ ...prev, unreadNotifications: count || 0 }));
    } catch (error) {
      console.error('[WomenDashboard] fetchNotifications error:', error);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setStats(prev => ({
        ...prev,
        unreadNotifications: Math.max(0, prev.unreadNotifications - 1),
      }));
    } catch (err) {
      console.warn('[WomenDashboard] Failed to mark notification read:', err);
    }
  };

  const fetchWalletBalance = async (userId: string) => {
    try {
      // Use server-side RPC to avoid Supabase 1000-row limit on client queries.
      // This single call returns both available_balance AND today_earnings — no need
      // for a separate fetchTodayEarnings call that would hit the same RPC twice.
      const { data, error } = await supabase.rpc('get_women_wallet_balance', {
        p_user_id: userId
      });

      if (error) {
        console.error("Error fetching wallet balance:", error);
        // Non-critical - balance shown as 0
        return;
      }

      if (data) {
        const balanceData = data as Record<string, number>;
        setMyWalletBalance(Number(balanceData.available_balance) || 0);
        // Set today's earnings from the same response
        const todayEarnings = Number(balanceData.today_earnings) || 0;
        setStats(prev => ({ ...prev, todayEarnings }));
      }
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      // Non-critical - balance shown as 0
    }
  };

  const fetchTopEarnerLeaderboard = async (userId: string) => {
    // Fetches the top earner for the leaderboard display.
    // Wallet balance + today_earnings are handled by fetchWalletBalance via a single RPC call.

    // Use secure RPC function to get top earner (bypasses RLS safely)
    const { data: topEarnerData, error: topError } = await supabase
      .rpc('get_top_earner_today');
    
    if (topError) {
      console.error('[WomenDashboard] Top earner RPC error:', topError);
      // Non-critical - leaderboard simply won't show
    }

    if (!topError && topEarnerData && topEarnerData.length > 0) {
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;

      // Use upsert so that new users get a row inserted and existing users get updated.
      // update() returns no error when 0 rows are matched, so insert would never fire.
      const { error } = await supabase
        .from("user_status")
        .upsert(
          {
            user_id: user.id,
            is_online: online,
            last_seen: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Error upserting user status:", error);
      }
    } catch {
      // Error updating status - silently handled
    }
  };

  const handleLogout = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = currentUserId || session?.user?.id || '';
      if (uid) {
        const { cleanupAllUserSessions } = await import('@/services/session-cleanup.service');
        await cleanupAllUserSessions(uid);
      }
    } catch (err) {
      console.warn('[Logout] Session cleanup failed (continuing):', err);
    }
    await supabase.auth.signOut();
    toast({
      title: t('loggedOut', 'Logged out'),
      description: t('seeYouSoon', 'See you soon!'),
    });
    navigate('/', { replace: true });
  };


  // Women cannot initiate chats - UNLESS they have Golden Badge
  const handleStartChatWithUser = async (userId: string) => {
    if (!hasGoldenBadge) {
      toast({
        title: t('actionNotAllowed', 'Action Not Allowed'),
        description: t('womenCannotInitiateChat', 'Women cannot initiate chats. Purchase a Golden Badge to unlock this feature.'),
        variant: "destructive",
      });
      return;
    }

    // Golden badge holder - initiate chat
    try {
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "start_chat",
          man_user_id: userId,
          woman_user_id: currentUserId,
          golden_badge_override: true
        }
      });

      if (error) throw error;
      if (!data.success) {
        toast({
          title: t('cannotStartChat', 'Cannot Start Chat'),
          description: data.message || "Unable to start chat",
          variant: "destructive",
        });
        return;
      }

      // Send initial message so the incoming chat hook doesn't treat it as "incoming" for the woman
      if (data.chat_id) {
        await supabase.from("chat_messages").insert({
          chat_id: data.chat_id,
          sender_id: currentUserId,
          receiver_id: userId,
          message: "👋 Hi!"
        });
      }

      toast({
        title: t('chatStarted', 'Chat Started!'),
        description: t('chatInitiated', 'Chat session started successfully'),
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start chat",
        variant: "destructive",
      });
    }
  };

  const handlePurchaseGoldenBadge = async () => {
    setIsPurchasingBadge(true);
    try {
      const { data, error } = await supabase.rpc('purchase_golden_badge', {
        p_user_id: currentUserId
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        setHasGoldenBadge(true);
        setGoldenBadgeExpiry(result.expires_at);
        toast({
          title: "🌟 Golden Badge Activated!",
          description: "You can now initiate chats with men for 30 days!",
        });
        // Refresh only wallet balance — badge state already updated above
        fetchWalletBalance(currentUserId);
      } else {
        toast({
          title: "Purchase Failed",
          description: result?.error || "Could not purchase badge",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to purchase badge",
        variant: "destructive",
      });
    } finally {
      setIsPurchasingBadge(false);
    }
  };

  const handleViewProfile = (userId: string) => {
    toast({
      title: t('viewingProfile', 'Profile'),
      description: hasGoldenBadge 
        ? t('useButtonsToChat', 'Use the Chat or Video buttons to connect')
        : t('waitForChatRequest', 'Wait for this user to send you a chat request'),
    });
  };

  // ScrollableUserList extracted to top-level component to avoid Hooks violation

  const renderUserCard = (user: OnlineMan, isPremium = false) => (
    <Card 
      className={cn(
        "group hover:shadow-lg transition-all duration-300 cursor-pointer",
        user.isSameLanguage && "ring-2 ring-primary/50",
        user.walletBalance > 1000 && "border-warning/30 bg-gradient-to-br from-warning/5 to-transparent"
      )}
      onClick={() => handleViewProfile(user.userId)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <Avatar className="h-11 w-11 sm:h-14 sm:w-14 border-2 border-background shadow-md">
              <AvatarImage src={user.photoUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm sm:text-lg">
                {user.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Status indicator: Green=Online, Red=Full */}
            <div className={cn(
              "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background",
              (user.activeChatCount || 0) >= 3 ? "bg-destructive" : "bg-online"
            )} title={
              (user.activeChatCount || 0) >= 3 ? "Busy (3/3)" : "Available"
            } />
            {user.walletBalance > 1000 && (
              <div className="absolute -top-1 -right-1">
                <Crown className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-sm sm:text-base text-foreground truncate max-w-[100px] sm:max-w-none">{user.fullName}</h3>
              {user.age && (
                <Badge variant="outline" className="text-[10px] sm:text-xs font-medium px-1.5">
                  {user.age}
                </Badge>
              )}
              {user.isSameLanguage && (
                <Badge variant="default" className="text-[9px] sm:text-[10px] bg-primary/90 px-1.5 hidden xs:inline-flex">
                  Same
                </Badge>
              )}
            </div>
            
            {/* Wallet Balance */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                <IndianRupee className="h-3 w-3 text-primary" />
                <span className="text-xs font-bold text-primary">
                  ₹{user.walletBalance.toFixed(0)}
                </span>
              </div>
              {isPremium && (
                <Badge variant="outline" className="text-[9px] bg-primary/10 border-primary/30 text-primary px-1">
                  <Crown className="h-2.5 w-2.5 mr-0.5" />
                  Pro
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mt-1">
              <div className="flex items-center gap-0.5">
                <Languages className="h-3 w-3" />
                <span className="truncate max-w-[60px] sm:max-w-none">{user.motherTongue}</span>
              </div>
              {(user.state || user.country) && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-0.5 truncate">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate max-w-[80px] sm:max-w-none">{[user.state, user.country].filter(Boolean).join(", ")}</span>
                  </div>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 mt-2 flex-wrap">
              {hasGoldenBadge && (
                <>
                  <Button 
                    size="sm" 
                    variant="aurora"
                    className="h-7 text-xs gap-1 px-2"
                    onClick={(e) => { e.stopPropagation(); handleStartChatWithUser(user.userId); }}
                    title="Start Chat (Golden Badge)"
                  >
                    <MessageCircleIcon className="h-3.5 w-3.5" />
                    Chat
                  </Button>
                  {/* Video call: Golden Badge + Indian woman + Indian man + same language */}
                  {user.isSameLanguage && isIndianWoman && user.country?.toLowerCase().includes('india') && (
                    <DirectVideoCallButton
                      currentUserId={currentUserId}
                      targetUserId={user.userId}
                      targetName={user.fullName}
                      targetPhoto={user.photoUrl}
                      walletBalance={myWalletBalance}
                      onBalanceChange={(newBalance) => setMyWalletBalance(newBalance)}
                      iconOnly={true}
                    />
                  )}
                </>
              )}
              {/* Show disabled video call hint for women without golden badge */}
              {!hasGoldenBadge && isIndianWoman && user.isSameLanguage && user.country?.toLowerCase().includes('india') && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="opacity-50 gap-1 text-[10px] h-7 px-2"
                  title="Purchase Golden Badge to enable video calls"
                >
                  <Video className="h-3 w-3" />
                  🔒
                </Button>
              )}
              <Button 
                size="sm" 
                variant="auroraOutline"
                className="h-7 text-xs gap-1 px-2"
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.userId}`); }}
                title={t('viewProfile', 'View Profile')}
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>
            </div>
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
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MeowLogo size="sm" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-tight">Meow Meow</p>
              <p className="text-[10px] text-muted-foreground">Connect & Earn</p>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Admin Messages */}
            <button 
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-accent/80 transition-all duration-200"
              onClick={() => setShowAdminMessages(true)}
              aria-label="Admin Messages"
            >
              <Mail className="w-[18px] h-[18px] text-primary" />
            </button>

            {/* Admin Chat */}
            <button 
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-accent/80 transition-all duration-200"
              onClick={() => setShowAdminChat(true)}
              aria-label="Chat with Admin"
            >
              <Shield className="w-[18px] h-[18px] text-primary" />
            </button>

            {/* KYC - Indian Women Only */}
            {isIndianWoman && (
              <button 
                className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-accent/80 transition-all duration-200"
                onClick={() => setShowKYCForm(true)}
                aria-label="Bank KYC for Payouts"
              >
                <FileCheck className="w-[18px] h-[18px] text-primary" />
              </button>
            )}

            {/* Friends & Blocked */}
            <button 
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-accent/80 transition-all duration-200"
              onClick={() => setShowFriendsPanel(true)}
              aria-label="Friends and Blocked Users"
            >
              <Users2 className="w-[18px] h-[18px] text-primary" />
            </button>

            <button 
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-accent/80 transition-all duration-200"
              onClick={() => navigate("/settings")}
              aria-label="Settings"
            >
              <Settings className="w-[18px] h-[18px] text-primary" />
            </button>

            <button 
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-all duration-200"
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LogOut className="w-[18px] h-[18px] text-destructive/70" />
            </button>
          </div>
        </div>
      </header>


      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Section 1: Welcome & Status */}
        <div className="animate-fade-in">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={isOnline}
                      onCheckedChange={(checked) => {
                        toggleOnlineStatus(checked);
                        toast({
                          title: checked ? t('youAreOnline', 'You are now online') : t('youAreOffline', 'You are now offline'),
                          description: checked ? t('usersCanSeeYou', 'Other users can see you') : t('usersCannotSeeYou', 'You are hidden from other users'),
                        });
                      }}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Power className={`w-4 h-4 shrink-0 ${isOnline ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                      {isOnline ? t('online', 'Online') : t('offline', 'Offline')}
                    </span>
                  </div>
                  <Badge className={cn("text-[10px] sm:text-xs text-primary-foreground flex items-center gap-1", getStatusColor())}>
                    <span className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse", 
                      activeChatCount >= 3 ? "bg-destructive-foreground/60" : "bg-online/60"
                    )} />
                    {getStatusText()}
                  </Badge>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">
                  {t('welcome', 'Welcome back')}{userName ? `, ${userName}` : ""}! 👋
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
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
        </div>

        {/* Quick Actions: Chat & Private Groups */}
        <div className="grid grid-cols-2 gap-2 animate-fade-in" style={{ animationDelay: "0.025s" }}>
          {hasGoldenBadge ? (
            <RandomChatButton
              userGender="female"
              userLanguage={currentWomanLanguage}
              userCountry={currentWomanCountry}
              variant="aurora"
              size="lg"
              hasGoldenBadge={true}
              chatMode={chatMode.currentMode}
              className="w-full"
            />
          ) : (
            <Button
              variant="aurora"
              size="lg"
              className="gap-2 w-full"
              onClick={handlePurchaseGoldenBadge}
              disabled={isPurchasingBadge}
            >
              {isPurchasingBadge ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Star className="h-5 w-5" />
                  Get Badge to Chat
                </>
              )}
            </Button>
          )}
          <Button
            variant="aurora"
            size="lg"
            className="gap-2 w-full"
            onClick={() => {
              const el = document.getElementById('women-private-groups-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Video className="h-5 w-5" />
            Private Groups
          </Button>
        </div>

        {/* Wallet Balance & Today's Earnings Summary */}
        <div className="animate-fade-in" style={{ animationDelay: "0.03s" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Wallet Balance (Total Earnings - Total Withdrawals) */}
            <Card 
              className="p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate("/women-wallet")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('walletBalance', 'Wallet Balance')}</p>
                  <p className="text-xl font-bold text-primary">₹{myWalletBalance.toLocaleString()}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3 gap-2 text-primary border-primary/30 hover:bg-primary/10"
                onClick={(e) => { e.stopPropagation(); navigate("/women-wallet"); }}
              >
                <IndianRupee className="w-3.5 h-3.5" />
                {t('withdraw', 'Withdraw')}
              </Button>
            </Card>
            {/* My Today's Earnings */}
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20">
                  <IndianRupee className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('myEarningsToday', 'My Earnings Today')}</p>
                  <p className="text-xl font-bold text-primary">₹{stats.todayEarnings.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            {/* Biggest Earner Today */}
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('topEarnerToday', 'Top Earner Today')}</p>
                  {biggestEarner ? (
                    <>
                      <p className="text-sm font-semibold text-foreground truncate">{biggestEarner.name}</p>
                      <p className="text-lg font-bold text-primary">₹{biggestEarner.amount.toLocaleString()}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('noEarningsYet', 'No earnings yet')}</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Key Stats - moved to top */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 animate-fade-in" style={{ animationDelay: "0.035s" }}>
          <Card className="p-3 bg-gradient-aurora border-primary/30 shadow-glow">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Crown className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.rechargedMen}</p>
                <p className="text-[10px] text-muted-foreground">{t('premiumUsers', 'Premium Men')}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 bg-gradient-aurora border-accent/30 shadow-glow">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/20">
                <IndianRupee className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-lg font-bold">₹{stats.todayEarnings.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">{t('todayEarnings', "Today's Earnings")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 bg-gradient-aurora border-primary/30 shadow-glow">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Heart className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.matchCount}</p>
                <p className="text-[10px] text-muted-foreground">{t('matches', 'Matches')}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 bg-gradient-aurora border-info/30 shadow-glow">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.rechargedMen + stats.nonRechargedMen}</p>
                <p className="text-[10px] text-muted-foreground">{t('allMen', 'All Men')}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 bg-gradient-aurora border-success/30 shadow-glow">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Globe2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{sameLanguageMen.length + otherLanguageMen.length}</p>
                <p className="text-[10px] text-muted-foreground">{t('onlineMen', 'Online Men')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Golden Badge Info Section */}
        {isIndianWoman && (
          <div className="animate-fade-in" style={{ animationDelay: "0.04s" }}>
            {hasGoldenBadge ? (
              <Card className="p-3 sm:p-4 bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 rounded-xl bg-primary/20 shrink-0">
                    <Star className="w-5 h-5 sm:w-6 sm:h-6 text-primary fill-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-foreground">🌟 Golden Badge Active</p>
                      <Badge className="bg-primary text-primary-foreground text-[10px]">PRO</Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      You can initiate chats & video calls with Indian men who speak your language
                    </p>
                    {goldenBadgeExpiry && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        Expires: {new Date(goldenBadgeExpiry).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-3 sm:p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">🌟 Golden Badge</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Buy for ₹{goldenBadgePrice.toLocaleString()}/month to initiate chats & video calls with men
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Chat Mode Switcher */}
        <div className="animate-fade-in" style={{ animationDelay: "0.045s" }}>
          <WomenChatModeSwitcher
            currentMode={chatMode.currentMode}
            freeMinutesUsed={chatMode.freeMinutesUsed}
            freeMinutesLimit={chatMode.freeMinutesLimit}
            freeTimeRemaining={chatMode.freeTimeRemaining}
            exclusiveFreeLockedUntil={chatMode.exclusiveFreeLockedUntil}
            canSwitchToPaid={chatMode.canSwitchToPaid}
            canSwitchToFree={chatMode.canSwitchToFree}
            canSwitchToExclusiveFree={chatMode.canSwitchToExclusiveFree}
            isLoading={chatMode.isLoading}
            isIndian={chatMode.isIndian}
            onSwitchMode={chatMode.switchMode}
            isForceFreeActive={chatMode.isForceFreeActive}
            forceFreeMinutesUsed={chatMode.forceFreeMinutesUsed}
            forceFreeMinutesLimit={chatMode.forceFreeMinutesLimit}
            forceFreeTimeRemaining={chatMode.forceFreeTimeRemaining}
            onToggleForceFree={chatMode.toggleForceFree}
          />
        </div>

        {/* Section 2: Men Online - Same Language / Other Language split */}
        <div className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-1.5">
              <Globe2 className="w-4 h-4 text-primary" />
              {t('onlineMen', 'Men Online')}
              <Badge variant="outline" className="text-[9px] font-normal ml-1">{sameLanguageMen.length + otherLanguageMen.length}</Badge>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchOnlineMen(currentWomanLanguage, currentWomanCountry)}
              className="gap-1 h-7 text-xs px-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Same Language Men */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <span className="text-sm font-medium text-primary">{t('sameLanguage', 'Same Language')}</span>
                <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                  {currentWomanLanguage}
                </span>
                <span className="text-xs text-muted-foreground">({sameLanguageMen.length})</span>
              </div>
              
              {sameLanguageMen.length > 0 ? (
                <>
                  {/* Same Language - Premium Men */}
                  {sameLanguageMen.filter(m => m.hasRecharged).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Crown className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Premium Men</span>
                        <Badge variant="outline" className="text-[9px]">{sameLanguageMen.filter(m => m.hasRecharged).length}</Badge>
                      </div>
                      <ScrollableUserList>
                        {sameLanguageMen.filter(m => m.hasRecharged).map((user, index) => (
                          <div key={user.userId} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                            {renderUserCard(user, true)}
                          </div>
                        ))}
                      </ScrollableUserList>
                    </div>
                  )}

                  {/* Same Language - Regular Men */}
                  {sameLanguageMen.filter(m => !m.hasRecharged).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">Regular Men</span>
                        <Badge variant="outline" className="text-[9px]">{sameLanguageMen.filter(m => !m.hasRecharged).length}</Badge>
                      </div>
                      <ScrollableUserList>
                        {sameLanguageMen.filter(m => !m.hasRecharged).map((user, index) => (
                          <div key={user.userId} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                            {renderUserCard(user, false)}
                          </div>
                        ))}
                      </ScrollableUserList>
                    </div>
                  )}
                </>
              ) : (
                <Card className="p-6 text-center">
                  <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('noSameLanguageMen', 'No men speaking')} {currentWomanLanguage}</p>
                </Card>
              )}
            </div>

            {/* Other Language Men */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <span className="text-sm font-medium text-primary">{t('otherLanguages', 'Other Languages')}</span>
                <span className="text-xs text-muted-foreground">({otherLanguageMen.length})</span>
              </div>
              
              {otherLanguageMen.length > 0 ? (
                <>
                  {/* Other Language - Premium Men */}
                  {otherLanguageMen.filter(m => m.hasRecharged).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Crown className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Premium Men</span>
                        <Badge variant="outline" className="text-[9px]">{otherLanguageMen.filter(m => m.hasRecharged).length}</Badge>
                      </div>
                      <ScrollableUserList>
                        {otherLanguageMen.filter(m => m.hasRecharged).map((user, index) => (
                          <div key={user.userId} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                            {renderUserCard(user, true)}
                          </div>
                        ))}
                      </ScrollableUserList>
                    </div>
                  )}

                  {/* Other Language - Regular Men */}
                  {otherLanguageMen.filter(m => !m.hasRecharged).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">Regular Men</span>
                        <Badge variant="outline" className="text-[9px]">{otherLanguageMen.filter(m => !m.hasRecharged).length}</Badge>
                      </div>
                      <ScrollableUserList>
                        {otherLanguageMen.filter(m => !m.hasRecharged).map((user, index) => (
                          <div key={user.userId} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                            {renderUserCard(user, false)}
                          </div>
                        ))}
                      </ScrollableUserList>
                    </div>
                  )}
                </>
              ) : (
                <Card className="p-6 text-center">
                  <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('noOtherMen', 'No men speaking other languages available')}</p>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Your Matches Section */}
        <div className="animate-fade-in" style={{ animationDelay: "0.07s" }}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-primary" />
              {t('yourMatches', 'Your Matches')}
              <span className="text-[10px] text-muted-foreground">({matchedMen.length})</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => currentUserId && fetchMatchedMen(currentUserId)}
              disabled={loadingMatches}
              className="gap-1 h-7 text-xs px-2"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loadingMatches && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {loadingMatches ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : matchedMen.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 sm:gap-3 max-h-[350px] overflow-y-auto pr-1">
              {matchedMen.map((man) => (
                <Card
                  key={man.matchId}
                  className="p-2 sm:p-3 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => navigate(`/profile/${man.userId}`)}
                >
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <div className="relative">
                      <Avatar className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-primary/20">
                        <AvatarImage src={man.photoUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                          {man.fullName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {man.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-online" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-xs sm:text-sm text-foreground truncate max-w-[80px] sm:max-w-[120px]">
                        {man.fullName || "User"}
                      </p>
                      {man.age && (
                        <p className="text-[10px] text-muted-foreground">{man.age} yrs</p>
                      )}
                    </div>
                    {hasGoldenBadge ? (
                      <Button
                        variant="aurora"
                        size="sm"
                        className="w-full h-7 text-[10px] sm:text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartChatWithUser(man.userId);
                        }}
                      >
                        <MessageCircle className="w-3 h-3" />
                        Chat
                      </Button>
                    ) : (
                      <Button
                        variant="auroraOutline"
                        size="sm"
                        className="w-full h-7 text-[10px] sm:text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${man.userId}`);
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-5 sm:p-8 text-center">
              <Heart className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">{t('noMatchesYet', 'No matches yet')}</p>
              <Button
                variant="aurora"
                size="sm"
                className="mt-3 gap-1"
                onClick={() => navigate("/match-discovery")}
              >
                <Search className="w-4 h-4" />
                {t('discoverMatches', 'Discover Matches')}
              </Button>
            </Card>
          )}
        </div>

        {/* Private Groups Section */}
        {currentUserId && (
          <div id="women-private-groups-section" className="animate-fade-in" style={{ animationDelay: "0.17s" }}>
            <PrivateGroupsSection
              currentUserId={currentUserId}
              userName={userName || 'User'}
              userPhoto={userPhoto}
            />
          </div>
        )}

        {/* Section 5: Quick Actions */}
        <div className="animate-fade-in" style={{ animationDelay: "0.18s" }}>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('quickActions', 'Quick Actions')}
          </h2>
          <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="group flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-2xl bg-card hover:bg-accent/50 border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center text-primary-foreground shadow-md group-hover:scale-105 group-hover:shadow-lg transition-all duration-200`}>
                  {action.icon}
                </div>
                <p className="text-[11px] sm:text-xs font-medium text-foreground text-center leading-tight">{action.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Section 7: Recent Notifications */}
        <div className="animate-fade-in" style={{ animationDelay: "0.28s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{t('recentActivity', 'Recent Activity')}</h2>
            <button className="text-sm text-primary hover:underline flex items-center gap-1" onClick={() => currentUserId && fetchNotifications(currentUserId)}>
              {t('viewAll', 'View all')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className="p-4 flex items-start gap-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <div className={`p-2 rounded-full ${
                    notification.type === "match" ? "bg-primary/10 text-primary" :
                    notification.type === "message" ? "bg-primary/10 text-primary" :
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
        {/* Language Group Chat - Women of same language chat with each other */}
        {currentUserId && currentWomanLanguage && (
          <div className="animate-fade-in mt-6" style={{ animationDelay: "0.3s" }}>
            <LanguageGroupChat
              currentUserId={currentUserId}
              languageCode={currentWomanLanguageCode || "eng_Latn"}
              languageName={currentWomanLanguage}
              userName={userName || 'User'}
              userPhoto={userPhoto}
            />
          </div>
        )}

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
          currentUserName={userName}
        />
      )}

      {/* Incoming Video Call Window - Draggable like mini chat */}
      {incomingCall && (
        <IncomingVideoCallWindow
          callId={incomingCall.callId}
          callerUserId={incomingCall.callerUserId}
          callerName={incomingCall.callerName}
          callerPhoto={incomingCall.callerPhoto}
          currentUserId={currentUserId}
          onClose={clearIncomingCall}
        />
      )}

      {/* Friends & Blocked Panel */}
      {showFriendsPanel && currentUserId && (
        <FriendsBlockedPanel
          currentUserId={currentUserId}
          userGender="female"
          onClose={() => setShowFriendsPanel(false)}
        />
      )}

      {/* Admin Messages Sheet */}
      <Sheet open={showAdminMessages} onOpenChange={setShowAdminMessages}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Admin Messages
            </SheetTitle>
          </SheetHeader>
          {currentUserId && (
            <div className="mt-4">
              <AdminMessagesWidget currentUserId={currentUserId} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Admin Chat Sheet */}
      <Sheet open={showAdminChat} onOpenChange={setShowAdminChat}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Chat with Admin
            </SheetTitle>
          </SheetHeader>
          {currentUserId && (
            <div className="mt-4">
              <UserAdminChat currentUserId={currentUserId} userName={userName || 'User'} embedded />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* KYC Form Sheet - Indian Women Only */}
      <Sheet open={showKYCForm} onOpenChange={setShowKYCForm}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              Bank KYC — Payout Verification
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 pb-8">
            <WomenKYCForm />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default WomenDashboardScreen;

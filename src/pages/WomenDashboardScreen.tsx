import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  LogOut,
  Wallet,
  IndianRupee,
  Crown,
  ChevronRight,
  User,
  Video,
  Eye,
  Mail,
  Shield,
  RefreshCw,
  Phone
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
// Chat mode removed - all women are in paid mode by default
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import { PrivateGroupsSection } from "@/components/PrivateGroupsSection";
import { UserAdminChat } from "@/components/UserAdminChat";
import { AdminMessagesWidget } from "@/components/AdminMessagesWidget";
import { useActivityBasedStatus } from "@/hooks/useActivityBasedStatus";
import { useAppSettings } from "@/hooks/useAppSettings";
import { LanguageGroupChat } from "@/components/LanguageGroupChat";
// DirectVideoCallButton removed - women cannot initiate calls

import { MatchFiltersPanel, MatchFilters } from "@/components/MatchFiltersPanel";
import { WhatsAppHeader } from "@/components/WhatsAppHeader";
import { WhatsAppBottomTabs, getWomenTabs } from "@/components/WhatsAppBottomTabs";
import { WhatsAppUserCard } from "@/components/WhatsAppUserCard";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { WomenKYCForm } from "@/components/WomenKYCForm";
import { CallHistoryTab } from "@/components/CallHistoryTab";

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

// ScrollableUserList extracted to shared component
import ScrollableUserList from "@/components/ScrollableUserList";

const WomenDashboardScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Plain English helper - no translation, returns fallback directly
  
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
  const [isIndianWoman, setIsIndianWoman] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [showAdminChat, setShowAdminChat] = useState(false);
  const [showAdminMessages, setShowAdminMessages] = useState(false);
  const [showKYCForm, setShowKYCForm] = useState(false);
  const [activeTab, setActiveTab] = useState("online");
  const matchesFetchedRef = useRef(false);
  const [onlineSubTab, setOnlineSubTab] = useState<"recharged" | "nobalance">("recharged");
  const [womenActiveChats, setWomenActiveChats] = useState<Array<{
    chatId: string;
    partnerId: string;
    partnerName: string;
    partnerPhoto: string | null;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
  }>>([]);
  const [loadingWomenChats, setLoadingWomenChats] = useState(false);
  
  // All women are in paid mode by default - no mode switching needed
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

  // Format chat timestamps with date context
  const formatChatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayMs = 86400000;
    if (diff < dayMs && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 2 * dayMs && now.getDate() - date.getDate() === 1) return 'Yesterday';
    if (diff < 7 * dayMs) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Format currency display (dynamic, not hardcoded ₹)
  const formatLocalCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

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
          title: 'Gone Offline',
          description: 'You went offline due to inactivity',
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
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${currentUserId}` },
        () => { fetchWomenActiveChats(); }
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
      .in("status", ["active", "pending"]);
    
    setActiveChatCount(count || 0);
    fetchWomenActiveChats();
  };

  const fetchWomenActiveChats = async () => {
    if (!currentUserId) return;
    setLoadingWomenChats(true);
    try {
      const { data: sessions } = await supabase
        .from("active_chat_sessions")
        .select("chat_id, man_user_id, started_at, last_activity_at, status, total_earned")
        .eq("woman_user_id", currentUserId)
        .in("status", ["active", "pending"])
        .order("last_activity_at", { ascending: false });

      if (!sessions || sessions.length === 0) {
        setWomenActiveChats([]);
        setLoadingWomenChats(false);
        return;
      }

      const partnerIds = sessions.map(s => s.man_user_id);
      
      const { fetchPublicProfiles } = await import("@/lib/profile-queries");
      const [profiles, lastMessages] = await Promise.all([
        fetchPublicProfiles(partnerIds),
        Promise.all(sessions.map(async (s) => {
          const { data } = await supabase
            .from("chat_messages")
            .select("message, created_at")
            .eq("chat_id", s.chat_id)
            .order("created_at", { ascending: false })
            .limit(1);
          
          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("chat_id", s.chat_id)
            .eq("receiver_id", currentUserId)
            .eq("is_read", false);
          
          return {
            chatId: s.chat_id,
            lastMessage: data?.[0]?.message || "",
            lastMessageAt: data?.[0]?.created_at || s.last_activity_at,
            unreadCount: count || 0,
          };
        }))
      ]);

      const profileMap = new Map((profiles as any[] || []).map(p => [p.user_id, p]));
      const messageMap = new Map(lastMessages.map(m => [m.chatId, m]));

      const chats = sessions.map(s => {
        const profile = profileMap.get(s.man_user_id);
        const msg = messageMap.get(s.chat_id);
        return {
          chatId: s.chat_id,
          partnerId: s.man_user_id,
          partnerName: profile?.full_name || "User",
          partnerPhoto: profile?.photo_url || null,
          lastMessage: msg?.lastMessage || "",
          lastMessageAt: msg?.lastMessageAt || s.last_activity_at,
          unreadCount: msg?.unreadCount || 0,
        };
      });

      setWomenActiveChats(chats);
    } catch (error) {
      console.error("[WomenDashboard] Error fetching active chats:", error);
    } finally {
      setLoadingWomenChats(false);
    }
  };

  const getStatusText = () => {
    if (isManuallyOffline) return 'Offline';
    if (!isOnline) return 'Away';
    return 'Available';
  };

  const getStatusColor = () => {
    if (isManuallyOffline) return 'bg-muted-foreground';
    if (!isOnline) return 'bg-amber-500';
    return 'bg-online';
  };

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
        .select("gender, approval_status, full_name, date_of_birth, primary_language, preferred_language, country, photo_url, is_indian")
        .eq("user_id", user.id)
        .maybeSingle();
      
      const profileTimeout = new Promise<{ data: null, error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timeout') }), 5000)
      );
      
      let mainProfile: { gender?: string | null; approval_status?: string | null; full_name?: string | null; date_of_birth?: string | null; primary_language?: string | null; preferred_language?: string | null; country?: string | null; photo_url?: string | null; is_indian?: boolean | null } | null = null;
      try {
        const result = await Promise.race([profilePromise, profileTimeout]);
        mainProfile = result.data;
      } catch {
        console.warn('[WomenDashboard] Profile fetch timed out or failed');
      }
        
      // Store user's photo for chat validation
      setUserPhoto(mainProfile?.photo_url || null);
      
      // Check if Indian woman
      const isIndian = mainProfile?.is_indian === true || 
        mainProfile?.country?.toLowerCase().includes('india');
      setIsIndianWoman(isIndian && mainProfile?.gender?.toLowerCase() === 'female');

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

      // Only show men with wallet balance > 0 to women
      const menWithBalance = sortedMen.filter(m => m.walletBalance > 0);
      const menWithoutBalance = sortedMen.filter(m => m.walletBalance <= 0);

      // Sort by wallet balance descending (highest balance first)
      const sortedRecharged = menWithBalance.sort((a, b) => b.walletBalance - a.walletBalance);

      // Split by same language / other language (like men's dashboard)
      // Only men with balance are visible to women
      const sameLanguage = menWithBalance.filter(m => m.isSameLanguage);
      const otherLanguage = menWithBalance.filter(m => !m.isSameLanguage);

      console.log("[WomenDashboard] Visible same-language men (with balance):", sameLanguage.length);
      console.log("[WomenDashboard] Visible other-language men (with balance):", otherLanguage.length);
      console.log("[WomenDashboard] Hidden men (no balance):", menWithoutBalance.length);

      setRechargedMen(sortedRecharged);
      setNonRechargedMen(menWithoutBalance); // Show men without balance in separate tab
      setSameLanguageMen(sameLanguage);
      setOtherLanguageMen(otherLanguage);
      setStats(prev => ({
        ...prev,
        totalOnlineMen: sortedMen.length,
        rechargedMen: sortedRecharged.length,
        nonRechargedMen: menWithoutBalance.length
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

      const otherUserIds = [...new Set(matches.map(m => 
        m.user_id === userId ? m.matched_user_id : m.user_id
      ))] as string[];

      const { fetchPublicProfiles } = await import("@/lib/profile-queries");
      const [profiles, statusesRes] = await Promise.all([
        fetchPublicProfiles(otherUserIds),
        supabase
          .from("user_status")
          .select("user_id, is_online")
          .in("user_id", otherUserIds)
      ]);

      const statusMap = new Map((statusesRes.data as any[] || []).map(s => [s.user_id, s.is_online]));
      const profileMap = new Map((profiles as any[] || []).map(p => [p.user_id, p]));

      const seenUserIds = new Set<string>();
      const matched: MatchedMan[] = matches
        .map(m => {
          const otherId = m.user_id === userId ? m.matched_user_id : m.user_id;
          if (seenUserIds.has(otherId)) return null;
          seenUserIds.add(otherId);
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
      title: 'Logged out',
      description: 'See you soon!',
    });
    navigate('/', { replace: true });
  };


  // Women can initiate chats freely
  const handleStartChatWithUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "start_chat",
          man_user_id: userId,
          woman_user_id: currentUserId,
        }
      });

      if (error) throw error;

      // Mark as self-initiated to prevent incoming chat popup
      if (data?.session_id || data?.chat_id) {
        const { markChatAsSelfInitiated } = await import("@/hooks/useIncomingChats");
        markChatAsSelfInitiated(data.session_id, data.chat_id);
      }
      if (!data.success) {
        toast({
          title: 'Cannot Start Chat',
          description: data.message || "Unable to start chat",
          variant: "destructive",
        });
        return;
      }

      // Send initial message
      if (data.chat_id) {
        await supabase.from("chat_messages").insert({
          chat_id: data.chat_id,
          sender_id: currentUserId,
          receiver_id: userId,
          message: "👋 Hi!"
        });
      }

      navigate(`/chat/${userId}`);

      toast({
        title: 'Chat Started!',
        description: 'Chat session started successfully',
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start chat",
        variant: "destructive",
      });
    }
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  // ScrollableUserList extracted to top-level component to avoid Hooks violation

  // renderUserCard removed — replaced by WhatsAppUserCard component

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

  const onlineMenCount = sameLanguageMen.length + otherLanguageMen.length;
  const womenTabs = getWomenTabs(onlineMenCount || undefined, activeChatCount || undefined, matchedMen.length || undefined);

  const renderOnlineUsersTab = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Status bar */}
      <div className="px-4 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px] text-primary-foreground", getStatusColor())}>
            {getStatusText()}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatLocalCurrency(myWalletBalance)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MatchFiltersPanel filters={matchFilters} onFiltersChange={setMatchFilters} userCountry={currentWomanCountry} />
          <Button variant="ghost" size="sm" onClick={() => fetchOnlineMen(currentWomanLanguage, currentWomanCountry)} className="h-7 w-7 p-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Sub-tabs: Recharged / No Balance */}
      <div className="flex border-b border-border/30">
        <button
          className={cn("flex-1 py-2 text-xs font-semibold text-center transition-colors", onlineSubTab === "recharged" ? "text-primary border-b-2 border-primary" : "text-muted-foreground")}
          onClick={() => setOnlineSubTab("recharged")}
        >
          💰 Recharged ({rechargedMen.length})
        </button>
        <button
          className={cn("flex-1 py-2 text-xs font-semibold text-center transition-colors", onlineSubTab === "nobalance" ? "text-primary border-b-2 border-primary" : "text-muted-foreground")}
          onClick={() => setOnlineSubTab("nobalance")}
        >
          No Balance ({nonRechargedMen.length})
        </button>
      </div>


      {/* Notifications */}
      {notifications.length > 0 && (
        <div>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer border-b border-border/30"
              onClick={() => markNotificationRead(notification.id)}
            >
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary")}>
                {notification.type === "match" ? <Heart className="w-5 h-5" /> :
                 notification.type === "message" ? <MessageCircle className="w-5 h-5" /> :
                 <Bell className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground truncate">{notification.title}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                    {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                  {!notification.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 ml-2" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recharged sub-tab content */}
      {onlineSubTab === "recharged" && (
        <>
          {sameLanguageMen.length > 0 && (
            <>
              <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
                <span className="text-xs font-semibold text-primary">{currentWomanLanguage}</span>
                <span className="text-[10px] text-muted-foreground ml-1">({sameLanguageMen.length})</span>
              </div>
              {sameLanguageMen.map((user) => (
                <WhatsAppUserCard
                  key={user.userId}
                  name={user.fullName}
                  photoUrl={user.photoUrl}
                  age={user.age}
                  language={user.motherTongue}
                  country={user.country}
                  state={user.state}
                  isPremium={user.hasRecharged}
                  walletBalance={user.walletBalance}
                  activeChatCount={user.activeChatCount}
                  onClick={() => handleViewProfile(user.userId)}
                  actions={
                    <div className="flex items-center gap-1">
                      <Button variant="aurora" size="sm" className="h-7 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); handleStartChatWithUser(user.userId); }}>
                        <MessageCircle className="w-3 h-3 mr-0.5" />Chat
                      </Button>
                      {/* Women cannot initiate audio/video calls — they only receive */}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.userId}`); }}>
                        <Eye className="w-3.5 h-3.5 text-primary" />
                      </Button>
                    </div>
                  }
                />
              ))}
            </>
          )}

          {otherLanguageMen.length > 0 && (
            <>
              <div className="px-4 py-2 bg-muted/30 border-b border-border/30">
                <span className="text-xs font-semibold text-muted-foreground">Other Languages</span>
                <span className="text-[10px] text-muted-foreground ml-1">({otherLanguageMen.length})</span>
              </div>
              {otherLanguageMen.map((user) => (
                <WhatsAppUserCard
                  key={user.userId}
                  name={user.fullName}
                  photoUrl={user.photoUrl}
                  age={user.age}
                  language={user.motherTongue}
                  country={user.country}
                  state={user.state}
                  isPremium={user.hasRecharged}
                  walletBalance={user.walletBalance}
                  activeChatCount={user.activeChatCount}
                  subtitle={`${user.motherTongue} → ${currentWomanLanguage}`}
                  onClick={() => handleViewProfile(user.userId)}
                  actions={
                    <div className="flex items-center gap-1">
                      <Button variant="aurora" size="sm" className="h-7 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); handleStartChatWithUser(user.userId); }}>
                        <MessageCircle className="w-3 h-3 mr-0.5" />Chat
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.userId}`); }}>
                        <Eye className="w-3.5 h-3.5 text-primary" />
                      </Button>
                    </div>
                  }
                />
              ))}
            </>
          )}

          {sameLanguageMen.length === 0 && otherLanguageMen.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No recharged men online</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Only men with wallet balance are shown here</p>
            </div>
          )}
        </>
      )}

      {/* No Balance sub-tab content */}
      {onlineSubTab === "nobalance" && (
        <>
          {nonRechargedMen.length > 0 ? (
            nonRechargedMen.map((user) => (
              <WhatsAppUserCard
                key={user.userId}
                name={user.fullName}
                photoUrl={user.photoUrl}
                age={user.age}
                language={user.motherTongue}
                country={user.country}
                state={user.state}
                activeChatCount={user.activeChatCount}
                onClick={() => handleViewProfile(user.userId)}
                actions={
                  <div className="flex items-center gap-1">
                    <Button variant="aurora" size="sm" className="h-7 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); handleStartChatWithUser(user.userId); }}>
                      <MessageCircle className="w-3 h-3 mr-0.5" />5 min Free
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.userId}`); }}>
                      <Eye className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  </div>
                }
              />
            ))
          ) : (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No men without balance online</p>
            </div>
          )}
        </>
      )}

    </div>
  );

  const renderChatsTab = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-primary" />
          Active Chats ({womenActiveChats.length})
        </span>
        <Button variant="ghost" size="sm" onClick={fetchWomenActiveChats} disabled={loadingWomenChats} className="h-7 w-7 p-0">
          <RefreshCw className={cn("w-3.5 h-3.5", loadingWomenChats && "animate-spin")} />
        </Button>
      </div>
      {loadingWomenChats ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : womenActiveChats.length > 0 ? (
        womenActiveChats.map((chat) => (
          <div
            key={chat.chatId}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer border-b border-border/30"
            onClick={() => navigate(`/chat/${chat.partnerId}`)}
          >
            <div className="relative flex-shrink-0">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarImage src={chat.partnerPhoto || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                  {chat.partnerName?.charAt(0) || <User className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground truncate">{chat.partnerName}</span>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                  {formatChatTime(chat.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "No messages yet"}</p>
                {chat.unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0 ml-2">
                    {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-16">
          <MessageCircle className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No active chats</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Start a chat from the Online tab</p>
        </div>
      )}
    </div>
  );

  const renderGroupsTab = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Video className="h-4 w-4 text-primary" />
          Private Groups
        </span>
      </div>
      {currentUserId ? (
        <div className="px-4 py-3">
          <PrivateGroupsSection currentUserId={currentUserId} userName={userName || 'User'} userPhoto={userPhoto} />
        </div>
      ) : (
        <div className="text-center py-10">
          <Video className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading groups...</p>
        </div>
      )}
    </div>
  );

  const renderMatchesTab = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Heart className="h-4 w-4 text-primary" />
          Your Matches ({matchedMen.length})
        </span>
        <Button variant="ghost" size="sm" onClick={() => currentUserId && fetchMatchedMen(currentUserId)} disabled={loadingMatches} className="h-7 w-7 p-0">
          <RefreshCw className={cn("w-3.5 h-3.5", loadingMatches && "animate-spin")} />
        </Button>
      </div>
      {loadingMatches ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : matchedMen.length > 0 ? (
        matchedMen.map((man) => (
          <WhatsAppUserCard
            key={man.matchId}
            name={man.fullName || "User"}
            photoUrl={man.photoUrl}
            age={man.age}
            language={man.primaryLanguage}
            country={man.country}
            isOnline={man.isOnline}
            onClick={() => navigate(`/profile/${man.userId}`)}
            actions={
              <div className="flex items-center gap-1">
                <Button variant="aurora" size="sm" className="h-7 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); handleStartChatWithUser(man.userId); }}>
                  <MessageCircle className="w-3 h-3 mr-0.5" />Chat
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${man.userId}`); }}>
                  <Eye className="w-3.5 h-3.5 text-primary" />
                </Button>
              </div>
            }
          />
        ))
      ) : (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No matches yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Matches will appear here when men connect with you</p>
        </div>
      )}
    </div>
  );

  const renderCommunityTab = () => (
    <div className="flex-1 overflow-hidden">
      {currentUserId && currentWomanLanguage ? (
        <div className="h-full">
          <LanguageGroupChat
            currentUserId={currentUserId}
            languageCode={currentWomanLanguageCode || "eng_Latn"}
            languageName={currentWomanLanguage}
            userName={userName || 'User'}
            userPhoto={userPhoto}
          />
        </div>
      ) : (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading community...</p>
        </div>
      )}
    </div>
  );

  const renderEarningsTab = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Wallet Balance */}
      <div className="px-4 py-4 border-b border-border/30 bg-gradient-to-br from-primary/5 to-transparent" onClick={() => navigate("/women-wallet")}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-2xl font-bold text-primary">{formatLocalCurrency(myWalletBalance)}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1 text-primary border-primary/30" onClick={(e) => { e.stopPropagation(); navigate("/women-wallet"); }}>
            <IndianRupee className="w-3.5 h-3.5" />Withdraw
          </Button>
        </div>
      </div>

      {/* Today's Earnings */}
      <div className="grid grid-cols-2 gap-0 border-b border-border/30">
        <div className="text-center py-4 border-r border-border/30">
          <p className="text-xl font-bold text-primary">{formatLocalCurrency(stats.todayEarnings)}</p>
          <p className="text-[10px] text-muted-foreground">Today's Earnings</p>
        </div>
        <div className="text-center py-4">
          <p className="text-xl font-bold text-foreground">{stats.rechargedMen}</p>
          <p className="text-[10px] text-muted-foreground">Premium Men</p>
        </div>
      </div>

      {/* Top Earner */}
      {biggestEarner && (
        <div className="px-4 py-3 flex items-center gap-3 border-b border-border/30">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Top Earner Today</p>
            <p className="text-sm font-semibold text-foreground">{biggestEarner.name}</p>
          </div>
          <span className="text-lg font-bold text-primary">{formatLocalCurrency(biggestEarner.amount)}</span>
        </div>
      )}


      {/* Stats */}
      <div className="grid grid-cols-3 gap-0 border-b border-border/30">
        <div className="text-center py-4 border-r border-border/30">
          <p className="text-xl font-bold text-foreground">{stats.matchCount}</p>
          <p className="text-[10px] text-muted-foreground">Matches</p>
        </div>
        <div className="text-center py-4 border-r border-border/30">
          <p className="text-xl font-bold text-foreground">{sameLanguageMen.length + otherLanguageMen.length}</p>
          <p className="text-[10px] text-muted-foreground">Online Men</p>
        </div>
        <div className="text-center py-4">
          <p className="text-xl font-bold text-foreground">{activeChatCount}</p>
          <p className="text-[10px] text-muted-foreground">Active Chats</p>
        </div>
      </div>

      {/* Quick links */}
      {[
        { icon: <Wallet className="w-5 h-5 text-primary" />, label: "Wallet & Withdrawals", onClick: () => navigate("/women-wallet") },
        { icon: <Heart className="w-5 h-5 text-primary" />, label: "Discover Matches", onClick: () => navigate("/match-discovery") },
      ].map((item, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-border/30 hover:bg-muted/50 cursor-pointer" onClick={item.onClick}>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">{item.icon}</div>
          <span className="text-sm font-medium text-foreground">{item.label}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
      ))}
    </div>
  );

  const renderProfileTab = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 flex flex-col items-center border-b border-border/30">
        <Avatar className="w-20 h-20 border-4 border-primary/20 shadow-lg mb-3">
          <AvatarImage src={userPhoto || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl font-bold">
            {userName?.charAt(0) || <User className="w-8 h-8" />}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-bold text-foreground">{userName || "User"}</h2>
        <p className="text-xs text-muted-foreground">{currentWomanLanguage} • {currentWomanCountry}</p>
        <Badge className={cn("mt-2 text-[10px] text-primary-foreground", getStatusColor())}>
          {getStatusText()}
        </Badge>
        
      </div>

      {[
        { icon: <User className="w-5 h-5 text-primary" />, label: "Edit Profile", onClick: () => setProfileEditOpen(true) },
        { icon: <Wallet className="w-5 h-5 text-primary" />, label: "Earnings & Wallet", onClick: () => navigate("/women-wallet") },
        { icon: <Heart className="w-5 h-5 text-primary" />, label: "Discover Matches", onClick: () => navigate("/match-discovery") },
        { icon: <Eye className="w-5 h-5 text-primary" />, label: "Online Users", onClick: () => navigate("/online-users") },
        ...(isIndianWoman ? [{ icon: <FileCheck className="w-5 h-5 text-primary" />, label: "Bank KYC", onClick: () => setShowKYCForm(true) }] : []),
        { icon: <Settings className="w-5 h-5 text-primary" />, label: "Settings", onClick: () => navigate("/settings") },
      ].map((item, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-border/30 hover:bg-muted/50 cursor-pointer" onClick={item.onClick}>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">{item.icon}</div>
          <span className="text-sm font-medium text-foreground">{item.label}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <WhatsAppHeader
        isOnline={isOnline}
        onToggleOnline={(checked) => {
          toggleOnlineStatus(checked);
          toast({
            title: checked ? 'You are now Online' : 'You are now Offline',
            description: checked ? 'Men can see you' : 'You are hidden from others',
          });
        }}
        onAdminMessages={() => setShowAdminMessages(true)}
        onAdminChat={() => setShowAdminChat(true)}
        onFriends={() => setShowFriendsPanel(true)}
        onSettings={() => navigate('/settings')}
        onLogout={handleLogout}
        unreadNotifications={stats.unreadNotifications}
        onNotifications={() => setActiveTab("online")}
        showKYC={isIndianWoman}
        onKYC={() => setShowKYCForm(true)}
      />

      {activeTab === "online" && renderOnlineUsersTab()}
      {activeTab === "chats" && renderChatsTab()}
      {activeTab === "history" && <CallHistoryTab currentUserId={currentUserId} userGender="female" />}
      {activeTab === "matches" && renderMatchesTab()}
      {activeTab === "community" && renderCommunityTab()}
      {activeTab === "groups" && renderGroupsTab()}
      {activeTab === "earnings" && renderEarningsTab()}
      {activeTab === "profile" && renderProfileTab()}

      <WhatsAppBottomTabs tabs={womenTabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Profile Edit Dialog */}
      <ProfileEditDialog open={profileEditOpen} onOpenChange={setProfileEditOpen} onProfileUpdated={() => loadDashboardData()} />

      {/* Chat windows removed — chats are async (WhatsApp-style), accessed via Chats tab */}

      {/* Incoming Video Call */}
      {incomingCall && (
        <IncomingVideoCallWindow callId={incomingCall.callId} callerUserId={incomingCall.callerUserId} callerName={incomingCall.callerName} callerPhoto={incomingCall.callerPhoto} currentUserId={currentUserId} onClose={clearIncomingCall} />
      )}

      {/* Friends & Blocked Panel */}
      {showFriendsPanel && currentUserId && (
        <FriendsBlockedPanel currentUserId={currentUserId} userGender="female" onClose={() => setShowFriendsPanel(false)} />
      )}

      {/* Admin Messages Sheet */}
      <Sheet open={showAdminMessages} onOpenChange={setShowAdminMessages}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" />Admin Messages</SheetTitle></SheetHeader>
          {currentUserId && <div className="mt-4"><AdminMessagesWidget currentUserId={currentUserId} /></div>}
        </SheetContent>
      </Sheet>

      {/* Admin Chat Sheet */}
      <Sheet open={showAdminChat} onOpenChange={setShowAdminChat}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Chat with Admin</SheetTitle></SheetHeader>
          {currentUserId && <div className="mt-4"><UserAdminChat currentUserId={currentUserId} userName={userName || 'User'} embedded /></div>}
        </SheetContent>
      </Sheet>

      {/* KYC Form Sheet */}
      <Sheet open={showKYCForm} onOpenChange={setShowKYCForm}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><FileCheck className="w-5 h-5 text-primary" />Bank KYC — Payout Verification</SheetTitle></SheetHeader>
          <div className="mt-4 pb-8"><WomenKYCForm /></div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default WomenDashboardScreen;

import { classifyError, ERROR_MESSAGES, logError } from "@/lib/errors";
import { countries } from "@/data/countries";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MeowLogo from "@/components/MeowLogo";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  Users, 
  Bell, 
  MessageCircle, 
  Settings,
  Sparkles,
  ChevronRight,
  LogOut,
  Wallet,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Eye,
  Users2,
  Compass,
  UserCircle,
  BellRing,
  Globe2,
  Video,
  Gift,
  Shield,
  Mail,
  ChevronUp,
  ChevronDown,
  Phone
} from "lucide-react";
import { FriendsBlockedPanel } from "@/components/FriendsBlockedPanel";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
// ActiveChatsSection removed - chats now handled via EnhancedParallelChatsContainer
import { RandomChatButton } from "@/components/RandomChatButton";
import VideoCallMiniButton from "@/components/VideoCallMiniButton";
import DirectVideoCallButton from "@/components/DirectVideoCallButton";
import DirectAudioCallButton from "@/components/DirectAudioCallButton";
// TeamsChatLayout removed - chats now handled via EnhancedParallelChatsContainer only
import EnhancedParallelChatsContainer from "@/components/EnhancedParallelChatsContainer";
import { AvailableGroupsSection } from "@/components/AvailableGroupsSection";
import { UserAdminChat } from "@/components/UserAdminChat";
import { AdminMessagesWidget } from "@/components/AdminMessagesWidget";
// MenFreeMinutesBadge removed - free minutes feature removed
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import IncomingVideoCallWindow from "@/components/IncomingVideoCallWindow";
// LanguageCommunityPanel removed - language chat is women-only

import { useChatPricing } from "@/hooks/useChatPricing";
import { useAutoReconnect } from "@/hooks/useAutoReconnect";
import { useAtomicTransaction } from "@/hooks/useAtomicTransaction";
import { useActivityBasedStatus } from "@/hooks/useActivityBasedStatus";
import { useAppSettings } from "@/hooks/useAppSettings";
import { MatchFiltersPanel, MatchFilters } from "@/components/MatchFiltersPanel";
import { WhatsAppHeader } from "@/components/WhatsAppHeader";
import { WhatsAppBottomTabs, getMenTabs } from "@/components/WhatsAppBottomTabs";
import { WhatsAppUserCard } from "@/components/WhatsAppUserCard";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { CallHistoryTab } from "@/components/CallHistoryTab";
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface OnlineWoman {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  age: number | null;
  country: string | null;
  primary_language: string | null;
  active_chat_count?: number; // 0=Free (green), 1-2=Busy (yellow), 3=Full (red)
  is_available?: boolean;
  max_chats?: number;
  is_earning_eligible?: boolean; // Badged women shown at top
}

interface MatchedWoman {
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
  onlineUsersCount: number;
  matchCount: number;
  unreadNotifications: number;
}

interface PaymentGateway {
  id: string;
  name: string;
  logo: string;
  description: string;
  features?: string[];
}

// Payment gateways for men's wallet recharge
const INDIAN_GATEWAYS: PaymentGateway[] = [
  { id: "cashfree", name: "Cashfree", logo: "⚡", description: "Cards, UPI, Netbanking", features: ["Cards", "UPI", "Netbanking"] },
  { id: "razorpay", name: "Razorpay", logo: "💳", description: "Cards, UPI, Wallets, EMI", features: ["Cards", "UPI", "Wallets", "EMI"] },
];

const INTERNATIONAL_GATEWAYS: PaymentGateway[] = [];

const ALL_PAYMENT_GATEWAYS: PaymentGateway[] = [...INDIAN_GATEWAYS, ...INTERNATIONAL_GATEWAYS];

// Extracted outside to avoid hooks-in-render violations
const ScrollableUserList = ({ children }: { children: React.ReactNode }) => {
  const listScrollRef = useRef<HTMLDivElement>(null);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = listScrollRef.current;
    if (!el) return;
    setCanUp(el.scrollTop > 10);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
  }, []);

  useEffect(() => {
    const el = listScrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const observer = new ResizeObserver(() => checkScroll());
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className="relative">
      {canUp && (
        <div className="sticky top-0 z-10 flex justify-center pb-1">
          <Button size="sm" variant="secondary" className="h-7 w-7 rounded-full shadow-md p-0" onClick={() => listScrollRef.current?.scrollBy({ top: -200, behavior: 'smooth' })}>
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div ref={listScrollRef} className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scroll-smooth" onScroll={checkScroll}>
        {children}
      </div>
      {canDown && (
        <div className="sticky bottom-0 z-10 flex justify-center pt-1">
          <Button size="sm" variant="secondary" className="h-7 w-7 rounded-full shadow-md p-0" onClick={() => listScrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' })}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

const DashboardScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Plain English helper - no translation, returns fallback directly
  const t = useCallback((_key: string, fallback: string) => fallback, []);
  
  const { creditWallet } = useAtomicTransaction();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null); // User's photo for chat validation
  const { incomingCall, clearIncomingCall } = useIncomingCalls(currentUserId || null, "male");
  const [userCountry, setUserCountry] = useState("IN");
  const [userCountryName, setUserCountryName] = useState(""); // Full country name for language feature
  const [userLanguage, setUserLanguage] = useState("English"); // User's primary language
  const userLanguageRef = useRef(userLanguage);
  const [userLanguageCode, setUserLanguageCode] = useState("eng_Latn"); // Language language code
  const [walletBalance, setWalletBalance] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sameLanguageWomen, setSameLanguageWomen] = useState<OnlineWoman[]>([]);
  const [indianTranslatedWomen, setIndianTranslatedWomen] = useState<OnlineWoman[]>([]);
  const [loadingOnlineWomen, setLoadingOnlineWomen] = useState(false);
  const [matchedWomen, setMatchedWomen] = useState<MatchedWoman[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [isNonIndianUser, setIsNonIndianUser] = useState(false); // Is man's language non-Indian but Language supported
  const [activeChatCount, setActiveChatCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    onlineUsersCount: 0,
    matchCount: 0,
    unreadNotifications: 0,
  });
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [showAdminChat, setShowAdminChat] = useState(false);
  const [showAdminMessages, setShowAdminMessages] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState("cashfree");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [privateGroupsRefreshKey, setPrivateGroupsRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("online");
  const [activeChats, setActiveChats] = useState<Array<{
    chatId: string;
    partnerId: string;
    partnerName: string;
    partnerPhoto: string | null;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
  }>>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  // App settings (currency rates, payment gateways, recharge amounts - all from database)
  const { settings } = useAppSettings();
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

  // Chat pricing from admin settings
  const { pricing, calculateCost, hasSufficientBalance, formatPrice } = useChatPricing();
  
  // Auto-reconnect functionality
  const { 
    isReconnecting, 
    findNextAvailableWoman, 
    initiateReconnect 
  } = useAutoReconnect(currentUserId, userLanguage);

  // Men's free chat minutes removed - feature deprecated

  // ScrollableUserList extracted to avoid hooks-in-render violations - see below

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

  // Derived values from settings (dynamic, not hardcoded)
  const CURRENCY_RATES = settings.currencyRates;
  const RECHARGE_AMOUNTS_INR = settings.rechargeAmounts;
  // Payment gateways are defined as constants above, not from app_settings
  const ALL_GATEWAYS = ALL_PAYMENT_GATEWAYS;

  // Get currency info based on user's country
  const getCurrencyInfo = () => {
    return CURRENCY_RATES[userCountry] || CURRENCY_RATES.DEFAULT || { rate: 0.012, symbol: "$", code: "USD" };
  };

  // Convert INR to local currency
  const convertToLocal = (amountINR: number) => {
    const currency = getCurrencyInfo();
    const converted = amountINR * currency.rate;
    // Round appropriately based on currency
    if (currency.code === "JPY" || currency.code === "KRW") {
      return Math.round(converted);
    }
    return Math.round(converted * 100) / 100;
  };

  // Format currency display
  const formatLocalCurrency = (amountINR: number) => {
    const currency = getCurrencyInfo();
    const converted = convertToLocal(amountINR);
    return `${currency.symbol}${converted.toLocaleString()}`;
  };

  const wentOnlineRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let loadingTimeoutId: NodeJS.Timeout;
    
    // Safety timeout - show error state after 12 seconds instead of silently rendering empty
    loadingTimeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('[Dashboard] Loading timed out after 12s');
        setIsLoading(false);
        toast({ 
          title: 'Dashboard load timeout', 
          description: 'Some data may not have loaded. Tap refresh to try again.', 
          variant: 'destructive' 
        });
      }
    }, 12000);

    // Wait for session to be restored from localStorage before checking auth
    // This prevents false redirects to "/" on page refresh
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (!session?.user) {
          // Don't redirect - ProtectedRoute handles auth.
          // Just stop loading to avoid stuck state on token refresh race.
          clearTimeout(loadingTimeoutId);
          setIsLoading(false);
          return;
        }
        await loadDashboardData(session.user);
        updateUserOnlineStatus(true);
        wentOnlineRef.current = true;
        loadActiveChatCount();
      } catch (error) {
        console.error('[Dashboard] Init error:', error);
        toast({ title: 'Dashboard error', description: 'Unable to load your dashboard. Please refresh the page.', variant: 'destructive' });
        if (mounted) setIsLoading(false);
      } finally {
        if (mounted) clearTimeout(loadingTimeoutId);
      }
    };
    init();

    // Cleanup: only set offline if we successfully went online
    return () => {
      mounted = false;
      clearTimeout(loadingTimeoutId);
      if (wentOnlineRef.current) {
        wentOnlineRef.current = false;
        updateUserOnlineStatus(false);
      }
    };
  }, []);

  // Real-time subscription with throttled callbacks to avoid excessive DB calls
  const lastFetchWomenRef = useRef<number>(0);
  const fetchWomenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with state so throttled callback always has latest value
  useEffect(() => {
    userLanguageRef.current = userLanguage;
  }, [userLanguage]);

  const throttledFetchOnlineWomen = useCallback(() => {
    const now = Date.now();
    const lang = userLanguageRef.current;
    if (now - lastFetchWomenRef.current < 5000) {
      if (fetchWomenTimeoutRef.current) clearTimeout(fetchWomenTimeoutRef.current);
      fetchWomenTimeoutRef.current = setTimeout(() => {
        lastFetchWomenRef.current = Date.now();
        fetchOnlineUsersCount();
        if (userLanguageRef.current) fetchOnlineWomen(userLanguageRef.current);
      }, 3000);
      return;
    }
    lastFetchWomenRef.current = now;
    fetchOnlineUsersCount();
    if (lang) fetchOnlineWomen(lang);
  }, []); // stable — reads from ref, no stale closure

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status' },
        () => { throttledFetchOnlineWomen(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_chat_sessions' },
        () => { loadActiveChatCount(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users_wallet' },
        () => { loadWalletBalance(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'women_availability' },
        () => { throttledFetchOnlineWomen(); }
      )
      // Note: We don't listen to all female_profiles changes as that would cause
      // cross-dashboard interference. The women list is refreshed when:
      // 1. user_status changes (online/offline)
      // 2. women_availability changes (availability status)
      // 3. THIS man's language changes (user_languages or male_profiles)
      // Women changing their language affects their visibility to men based on
      // the man's language filter - which is recalculated on user_status changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_call_sessions' },
        () => { loadActiveChatCount(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        () => { 
          if (currentUserId) {
            fetchNotifications(currentUserId);
          }
        }
      )
      // Listen for user's language changes in user_languages table (INSERT events - no filter for new records)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_languages' },
        async (payload) => {
          const record = payload.new as { user_id?: string; language_name?: string; language_code?: string };
          // Only process if this is our user's language change
          if (record?.user_id === currentUserId && record?.language_name) {
            console.log("[Dashboard] user_languages INSERT:", record.language_name);
            setUserLanguage(record.language_name);
            setUserLanguageCode(record.language_code || "eng_Latn");
            fetchOnlineWomen(record.language_name);
          }
        }
      )
      // Listen for user's language updates in user_languages table
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_languages', filter: `user_id=eq.${currentUserId}` },
        async (payload) => {
          const newLanguage = (payload.new as { language_name?: string })?.language_name;
          const newCode = (payload.new as { language_code?: string })?.language_code || "eng_Latn";
          console.log("[Dashboard] user_languages UPDATE:", newLanguage);
          if (newLanguage) {
            setUserLanguage(newLanguage);
            setUserLanguageCode(newCode);
            fetchOnlineWomen(newLanguage);
          }
        }
      )
      // Listen for profile language changes in male_profiles table
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'male_profiles', filter: `user_id=eq.${currentUserId}` },
        async (payload) => {
          const newProfile = payload.new as { primary_language?: string; preferred_language?: string };
          const newLanguage = newProfile?.primary_language || newProfile?.preferred_language;
          console.log("[Dashboard] male_profiles language changed:", newLanguage);
          if (newLanguage) {
            setUserLanguage(newLanguage);
            fetchOnlineWomen(newLanguage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]); // stable — throttledFetchOnlineWomen reads from refs; language handlers fetch directly

  const loadWalletBalance = async () => {
    if (!currentUserId) return;
    const { data } = await supabase.rpc('get_men_wallet_balance', {
      p_user_id: currentUserId
    });
    if (data) {
      const bd = data as Record<string, number>;
      setWalletBalance(Number(bd.balance) || 0);
    }
  };

  const loadActiveChatCount = async () => {
    if (!currentUserId) return;
    
    const { count } = await supabase
      .from("active_chat_sessions")
      .select("*", { count: "exact", head: true })
      .eq("man_user_id", currentUserId)
      .in("status", ["active", "pending"]);
    
    setActiveChatCount(count || 0);
    
    // Also fetch active chat details for the Chats tab
    fetchActiveChats();
  };

  const fetchActiveChats = async () => {
    if (!currentUserId) return;
    setLoadingChats(true);
    try {
      const { data: sessions } = await supabase
        .from("active_chat_sessions")
        .select("chat_id, woman_user_id, started_at, last_activity_at, status")
        .eq("man_user_id", currentUserId)
        .in("status", ["active", "pending"])
        .order("last_activity_at", { ascending: false });

      if (!sessions || sessions.length === 0) {
        setActiveChats([]);
        setLoadingChats(false);
        return;
      }

      const partnerIds = sessions.map(s => s.woman_user_id);
      
      // Fetch partner profiles and last messages in parallel
      const { fetchPublicProfiles } = await import("@/lib/profile-queries");
      const [profiles, lastMessages] = await Promise.all([
        fetchPublicProfiles(partnerIds),
        Promise.all(sessions.map(async (s) => {
          const { data } = await supabase
            .from("chat_messages")
            .select("message, created_at, sender_id, is_read")
            .eq("chat_id", s.chat_id)
            .order("created_at", { ascending: false })
            .limit(1);
          
          // Count unread
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
        const profile = profileMap.get(s.woman_user_id);
        const msg = messageMap.get(s.chat_id);
        return {
          chatId: s.chat_id,
          partnerId: s.woman_user_id,
          partnerName: profile?.full_name || "User",
          partnerPhoto: profile?.photo_url || null,
          lastMessage: msg?.lastMessage || "",
          lastMessageAt: msg?.lastMessageAt || s.last_activity_at,
          unreadCount: msg?.unreadCount || 0,
        };
      });

      setActiveChats(chats);
    } catch (error) {
      console.error("[Dashboard] Error fetching active chats:", error);
    } finally {
      setLoadingChats(false);
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

  const getStatusDotColor = () => {
    if (isManuallyOffline) return 'bg-muted-foreground';
    if (!isOnline) return 'bg-amber-500';
    return 'bg-online';
  };

  const loadDashboardData = async (userOrNull?: import('@supabase/supabase-js').User) => {
    try {
      let user = userOrNull;
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          return;
        }
        user = session.user;
      }

      setCurrentUserId(user.id);

      // Wrap profile fetch in timeout to prevent hang
      const profilePromise = supabase
        .from("profiles")
        .select("gender, full_name, date_of_birth, primary_language, preferred_language, country, photo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      
      const profileTimeout = new Promise<{ data: null, error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timeout') }), 5000)
      );
      
      let mainProfile: { gender?: string | null; full_name?: string | null; date_of_birth?: string | null; primary_language?: string | null; preferred_language?: string | null; country?: string | null; photo_url?: string | null } | null = null;
      try {
        const result = await Promise.race([profilePromise, profileTimeout]);
        mainProfile = result.data;
      } catch {
        console.warn('[Dashboard] Profile fetch timed out or failed');
      }
      
      // Store user's photo for chat validation
      setUserPhoto(mainProfile?.photo_url || null);

      // Redirect women to their dashboard (case-insensitive check)
      if (mainProfile?.gender?.toLowerCase() === "female") {
        navigate("/women-dashboard");
        return;
      }

      // Also check female_profiles in case user registered as female but no main profile
      const { data: femaleProfile } = await supabase
        .from("female_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (femaleProfile) {
        navigate("/women-dashboard");
        return;
      }

      // Fetch user's languages
      const { data: userLanguages } = await supabase
        .from("user_languages")
        .select("language_name, language_code")
        .eq("user_id", user.id)
        .limit(1);

      // Use main profiles table (single source of truth)
      const motherTongue = userLanguages?.[0]?.language_name || 
                          mainProfile?.primary_language ||
                          mainProfile?.preferred_language ||
                          "English";
      const languageCode = userLanguages?.[0]?.language_code || "eng_Latn";
      setUserLanguage(motherTongue);
      setUserLanguageCode(languageCode);

      // Use name from main profiles table
      const fullName = mainProfile?.full_name;
      if (fullName) {
        setUserName(fullName.split(" ")[0]);
      }
      
      // Use country from main profiles table
      const userCountryValue = mainProfile?.country;
      if (userCountryValue) {
        setUserCountryName(userCountryValue);
        // Look up country code from the full countries dataset
        const match = countries.find(c => c.name.toLowerCase() === userCountryValue.toLowerCase());
        setUserCountry(match?.code || "IN");
      }

      // Fetch wallet balance via server-side RPC (with timeout)
      try {
        const { data: walletRpc } = await supabase.rpc('get_men_wallet_balance', {
          p_user_id: user.id
        });

        if (walletRpc) {
          const wd = walletRpc as Record<string, number>;
          setWalletBalance(Number(wd.balance) || 0);
        }
      } catch {
        console.warn('[Dashboard] Wallet balance fetch failed');
      }

      // Fetch stats in parallel - each with individual error handling
      await Promise.allSettled([
        fetchOnlineUsersCount(),
        fetchMatchCount(user.id),
        fetchNotifications(user.id),
        fetchOnlineWomen(motherTongue),
      ]);

    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast({ title: "Dashboard unavailable", description: "Unable to load dashboard data. Please refresh.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOnlineUsersCount = async () => {
    try {
      const { count, error } = await supabase
        .from("user_status")
        .select("*", { count: "exact", head: true })
        .eq("is_online", true);

      if (error) {
        console.warn('[Dashboard] Error fetching online users count:', error);
        return;
      }

      setStats(prev => ({ ...prev, onlineUsersCount: count || 0 }));
    } catch (error) {
      console.warn('[Dashboard] Failed to fetch online users count:', error);
    }
  };

  // Handle starting chat with a woman - with auto-reconnect if woman is busy (max 2 retries)
  const handleStartChatWithWoman = async (womanUserId: string, womanName: string, _reconnectDepth = 0) => {
    if (isConnecting) return;
    setIsConnecting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;

      // Route through chat-manager edge function for proper security checks
      // (balance verification, block check, parallel chat limits, super user bypass)
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "start_chat",
          man_user_id: user.id,
          woman_user_id: womanUserId
        }
      });

      if (error) throw error;

      // Mark as self-initiated to prevent incoming chat popup
      if (data?.session_id || data?.chat_id) {
        const { markChatAsSelfInitiated } = await import("@/hooks/useIncomingChats");
        markChatAsSelfInitiated(data.session_id, data.chat_id);
      }

      if (!data.success) {
        // If woman is busy, try auto-reconnect
        if (data.message?.includes("capacity") || data.message?.includes("Maximum")) {
          toast({
            title: t('userBusy', 'User Busy'),
            description: t('findingAnotherUser', 'Finding another available user...'),
          });

          const nextWoman = _reconnectDepth < 2 ? await initiateReconnect(womanUserId) : null;
          if (nextWoman) {
            await handleStartChatWithWoman(nextWoman.userId, nextWoman.fullName, _reconnectDepth + 1);
          } else {
            toast({
              title: t('noOneAvailable', 'No One Available'),
              description: t('tryAgainLater', 'All users are busy. Please try again later.'),
              variant: "destructive",
            });
          }
          return;
        }

        // Insufficient balance - show recharge dialog
        if (data.message?.includes("balance") || data.message?.includes("Insufficient")) {
          toast({
            title: t('insufficientBalance', 'Insufficient Balance'),
            description: data.message,
            variant: "destructive",
          });
          setRechargeDialogOpen(true);
          return;
        }

        toast({
          title: t('cannotStartChat', 'Cannot Start Chat'),
          description: data.message || "Unable to start chat session",
          variant: "destructive",
        });
        return;
      }

      // Send initial message so the incoming chat hook doesn't show popup for the initiator
      if (data.chat_id) {
        await supabase.from("chat_messages").insert({
          chat_id: data.chat_id,
          sender_id: user.id,
          receiver_id: womanUserId,
          message: "👋 Hi!"
        });
      }

      toast({
        title: t('chatStarted', 'Chat Started'),
        description: `${t('startingChatWith', 'Starting chat with')} ${womanName} (${formatPrice(data.rate_per_minute || pricing.ratePerMinute)}/min)`,
      });

      // Navigate to full-screen WhatsApp-style chat view
      navigate(`/chat/${womanUserId}`);
    } catch (error: any) {
      console.error("Error starting chat:", error);
      
      // On error, try to auto-reconnect to another woman
      const nextWoman = _reconnectDepth < 2 ? await initiateReconnect(womanUserId) : null;
      if (nextWoman) {
        await handleStartChatWithWoman(nextWoman.userId, nextWoman.fullName, _reconnectDepth + 1);
      } else {
        toast({
          title: t('error', 'Error'),
          description: classifyError(error, 'start the chat').message,
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchOnlineWomen = async (language: string) => {
    console.log("[Dashboard] fetchOnlineWomen called with language:", language);
    setLoadingOnlineWomen(true);
    try {
      // Get ONLY online user IDs - strict online check
      const { data: onlineUsers } = await supabase
        .from("user_status")
        .select("user_id")
        .eq("is_online", true);

      const onlineUserIds = onlineUsers?.map(u => u.user_id) || [];
      
      // If no users online, show empty lists
      if (onlineUserIds.length === 0) {
        console.log("[Dashboard] No online users found");
        setSameLanguageWomen([]);
        setIndianTranslatedWomen([]);
        setLoadingOnlineWomen(false);
        return;
      }

      // Fetch ONLY online women from female_profiles table with earning eligibility
      const { data: femaleProfiles } = await supabase
        .from("female_profiles")
        .select("id, user_id, full_name, photo_url, age, country, primary_language, is_earning_eligible")
        .eq("approval_status", "approved")
        .eq("account_status", "active")
        .in("user_id", onlineUserIds)
        .limit(50);

      const onlineWomenList: OnlineWoman[] = femaleProfiles || [];

      if (onlineWomenList.length === 0) {
        console.log("[Dashboard] No online women found");
        setSameLanguageWomen([]);
        setIndianTranslatedWomen([]);
        setLoadingOnlineWomen(false);
        return;
      }

      // Get active chat counts for load balancing
      const womenUserIds = onlineWomenList.map(w => w.user_id);
      const { data: chatCounts } = await supabase
        .from("active_chat_sessions")
        .select("woman_user_id, status")
        .in("woman_user_id", womenUserIds)
        .in("status", ["active", "pending"]);

      const chatCountMap = new Map<string, number>();
      chatCounts?.forEach(chat => {
        const count = chatCountMap.get(chat.woman_user_id) || 0;
        chatCountMap.set(chat.woman_user_id, count + 1);
      });

      // Get availability data
      const { data: availabilityData } = await supabase
        .from("women_availability")
        .select("user_id, is_available, current_chat_count, max_concurrent_chats")
        .in("user_id", womenUserIds);

      const availabilityMap = new Map(
        (availabilityData as any[] || []).map(a => [a.user_id, a])
      );

      // Get languages
      const { data: userLanguages } = await supabase
        .from("user_languages")
        .select("user_id, language_name")
        .in("user_id", womenUserIds);

      const languageMap = new Map((userLanguages as any[] || []).map(l => [l.user_id, l.language_name as string]));

      const womenWithChatCount = onlineWomenList.map(w => {
        const avail = availabilityMap.get(w.user_id);
        const chatCount = avail?.current_chat_count || chatCountMap.get(w.user_id) || 0;
        const womanLanguage = languageMap.get(w.user_id) || w.primary_language || "Unknown";
        return {
          ...w,
          primary_language: womanLanguage,
          active_chat_count: chatCount,
          is_available: avail?.is_available !== false,
          max_chats: avail?.max_concurrent_chats || 3,
          is_earning_eligible: w.is_earning_eligible || false,
        };
      });

      // Sort: Badged (earning eligible) women first, then by availability and load
      const sortByBadgeAndLoad = (a: typeof womenWithChatCount[0], b: typeof womenWithChatCount[0]) => {
        // First: Badged (earning eligible) women on top
        if (a.is_earning_eligible !== b.is_earning_eligible) {
          return a.is_earning_eligible ? -1 : 1;
        }
        // Second: available vs not available
        if (a.is_available !== b.is_available) return a.is_available ? -1 : 1;
        // Third: not at max capacity
        const aAtMax = a.active_chat_count >= a.max_chats;
        const bAtMax = b.active_chat_count >= b.max_chats;
        if (aAtMax !== bAtMax) return aAtMax ? 1 : -1;
        // Fourth: by chat count (lower first = less load)
        return a.active_chat_count - b.active_chat_count;
      };

      // Split: same language first, others second
      const sameLanguage = womenWithChatCount
        .filter(w => w.primary_language?.toLowerCase() === language.toLowerCase())
        .sort(sortByBadgeAndLoad);

      const otherWomen = womenWithChatCount
        .filter(w => w.primary_language?.toLowerCase() !== language.toLowerCase())
        .sort(sortByBadgeAndLoad);

      console.log("[Dashboard] Online same-language women:", sameLanguage.length);
      console.log("[Dashboard] Online other-language women:", otherWomen.length);
      setSameLanguageWomen(sameLanguage.slice(0, 10));
      setIndianTranslatedWomen(otherWomen.slice(0, 15));
    } catch (error) {
      console.error("Error fetching online women:", error);
      // Non-critical - online users list, will retry
      setSameLanguageWomen([]);
      setIndianTranslatedWomen([]);
    } finally {
      setLoadingOnlineWomen(false);
    }
  };

  // Quick connect: Automatically find and connect to the best available woman
  const handleQuickConnect = async () => {
    if (isConnecting || isReconnecting) return;
    
    // Note: Photo validation not needed at runtime - photos are mandatory during registration

    // Check balance first
    if (!hasSufficientBalance(walletBalance, 2)) {
      toast({
        title: t('insufficientBalance', 'Insufficient Balance'),
        description: t('pleaseRechargeToChat', 'Please recharge your wallet to start chatting'),
        variant: "destructive",
      });
      setRechargeDialogOpen(true);
      return;
    }

    setIsConnecting(true);
    toast({
      title: t('searchingForMatch', 'Searching...'),
      description: t('findingBestMatch', 'Finding the best available match for you'),
    });

    try {
      const bestMatch = await findNextAvailableWoman();
      
      if (bestMatch) {
        await handleStartChatWithWoman(bestMatch.userId, bestMatch.fullName);
      } else {
        toast({
          title: t('noOneAvailable', 'No One Available'),
          description: t('tryAgainLater', 'All users are busy. Please try again later.'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Quick connect error:", error);
      toast({
        title: t('error', 'Error'),
        description: t('failedToConnect', 'Failed to connect. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchMatchCount = async (userId: string) => {
    const { count } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
      .eq("status", "accepted");

    setStats(prev => ({ ...prev, matchCount: count || 0 }));
    
    // Also fetch matched women profiles
    await fetchMatchedWomen(userId);
  };

  const fetchMatchedWomen = async (userId: string) => {
    setLoadingMatches(true);
    try {
      // Fetch all matches (both pending and accepted) where this man is involved
      const { data: matches } = await supabase
        .from("matches")
        .select("id, matched_user_id, user_id, matched_at, status")
        .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
        .order("matched_at", { ascending: false })
        .limit(50);

      if (!matches || matches.length === 0) {
        setMatchedWomen([]);
        setLoadingMatches(false);
        return;
      }

      // Get unique other user IDs from each match (deduplicate)
      const otherUserIds = [...new Set(matches.map(m => 
        m.user_id === userId ? m.matched_user_id : m.user_id
      ))] as string[];

      // Fetch profiles for matched users via secure RPC
      const { fetchPublicProfiles } = await import("@/lib/profile-queries");
      const profiles = await fetchPublicProfiles(otherUserIds);

      // Fetch online status
      const { data: statuses } = await supabase
        .from("user_status")
        .select("user_id, is_online")
        .in("user_id", otherUserIds);

      const statusMap = new Map((statuses as any[] || []).map(s => [s.user_id, s.is_online]));
      const profileMap = new Map((profiles as any[] || []).map(p => [p.user_id, p]));

      const seenUserIds = new Set<string>();
      const matched: MatchedWoman[] = matches
        .map(m => {
          const otherId = m.user_id === userId ? m.matched_user_id : m.user_id;
          if (seenUserIds.has(otherId)) return null;
          seenUserIds.add(otherId);
          const profile = profileMap.get(otherId);
          if (!profile || profile.gender?.toLowerCase() !== 'female') return null;
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
        .filter(Boolean) as MatchedWoman[];

      setMatchedWomen(matched);
    } catch (error) {
      console.error("Error fetching matched women:", error);
      // Non-critical - matches list, will retry
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

      // Display notifications as-is (no translation)
      setNotifications(data || []);
      setStats(prev => ({ ...prev, unreadNotifications: count || 0 }));
    } catch (error) {
      console.error('[Dashboard] fetchNotifications error:', error);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      // Update local state immediately for instant UI feedback
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setStats(prev => ({
        ...prev,
        unreadNotifications: Math.max(0, prev.unreadNotifications - 1),
      }));
    } catch (err) {
      console.warn('[Dashboard] Failed to mark notification read:', err);
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
    } catch (error) {
      console.error("Error updating status:", error);
      // Non-critical background status update
    }
  };

  const handleLogout = async () => {
    try {
      // Use currentUserId or fall back to the Supabase auth session uid
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

  // Handle Cashfree payment return from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const orderId = params.get('order_id');
    if (paymentStatus && orderId) {
      // Verify with backend
      const verifyPayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('cashfree-payment/verify', {
            body: { orderId }
          });
          if (error) throw error;
          if (data?.credited) {
            toast({ title: "Payment Successful! 🎉", description: `₹${data.amount} added to your wallet.` });
            loadWalletBalance();
          } else if (data?.status === 'PAID' && data?.alreadyCredited) {
            toast({ title: "Already Credited", description: "This payment was already processed." });
          } else {
            toast({ title: "Payment Not Completed", description: `Status: ${data?.status || 'Unknown'}. No amount charged.`, variant: "destructive" });
          }
        } catch (err) {
          console.error('[Payment Verify]', err);
          toast({ title: "Verification Failed", description: "Please check your wallet balance.", variant: "destructive" });
        }
      };
      verifyPayment();
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  const handleRecharge = async (amountINR: number) => {
    if (processingPayment || amountINR < 1) return;
    setSelectedAmount(amountINR);
    setProcessingPayment(true);
    
    const gateway = ALL_GATEWAYS.find(g => g.id === selectedGateway);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Session expired");

      if (selectedGateway === 'cashfree') {
        const returnUrl = `${window.location.origin}/dashboard?payment={order_status}&order_id={order_id}`;
        const { data, error } = await supabase.functions.invoke('cashfree-payment', {
          body: { amount: amountINR, userId: session.user.id, returnUrl }
        });

        if (error) throw error;
        if (!data?.success || !data?.paymentSessionId) {
          throw new Error(data?.error || 'Failed to create payment order');
        }

        // Load Cashfree JS SDK and redirect
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.onload = () => {
          const cashfree = (window as any).Cashfree({ mode: "production" });
          cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
        };
        script.onerror = () => {
          toast({ title: "Payment Error", description: "Failed to load payment gateway. Please try again.", variant: "destructive" });
          setProcessingPayment(false);
          setSelectedAmount(null);
        };
        document.head.appendChild(script);
        return; // Don't reset state — user is being redirected
      } else {
        // Razorpay — placeholder
        toast({
          title: "Razorpay Coming Soon",
          description: `Razorpay integration is in progress. Please use Cashfree.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Recharge error:", error);
      toast({
        title: "Recharge Failed",
        description: "Payment could not be processed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSelectedAmount(null);
      setProcessingPayment(false);
    }
  };

  const quickActions = [
    { 
      icon: <Compass className="w-6 h-6" />, 
      label: t('findMatch', 'Discover'), 
      color: "from-primary to-primary/80",
      action: () => navigate("/match-discovery")
    },
    { 
      icon: <MessageCircle className="w-6 h-6" />, 
      label: t('messages', 'Chats'), 
      color: "from-primary/90 to-primary/70",
      action: () => {
        const el = document.getElementById('parallel-chats-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
      }
    },
    { 
      icon: <UserCircle className="w-6 h-6" />, 
      label: t('profile', 'My Profile'), 
      color: "from-primary/80 to-primary/60",
      action: () => setProfileEditOpen(true)
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">{t('loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // activeTab state is declared at top of component

  const onlineCount = sameLanguageWomen.length + indianTranslatedWomen.length;
  const menTabs = getMenTabs(onlineCount || undefined, activeChatCount || undefined, matchedWomen.length || undefined);

  const renderOnlineUsersTab = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Active status bar */}
      <div className="px-4 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px] text-primary-foreground", getStatusColor())}>
            {getStatusText()}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatLocalCurrency(walletBalance)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MatchFiltersPanel filters={matchFilters} onFiltersChange={setMatchFilters} userCountry={userCountry} />
          <Button variant="ghost" size="sm" onClick={() => userLanguage && fetchOnlineWomen(userLanguage)} disabled={loadingOnlineWomen} className="h-7 w-7 p-0">
            <RefreshCw className={cn("w-3.5 h-3.5", loadingOnlineWomen && "animate-spin")} />
          </Button>
        </div>
      </div>


      {/* Notifications */}
      {notifications.length > 0 && (
        <div id="notifications-section">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer border-b border-border/30"
              onClick={() => markNotificationRead(notification.id)}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                "bg-primary/10 text-primary"
              )}>
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
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 ml-2" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Women Online - Same Language */}
      {loadingOnlineWomen ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {sameLanguageWomen.length > 0 && (
            <>
              <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
                <span className="text-xs font-semibold text-primary">{userLanguage}</span>
                <span className="text-[10px] text-muted-foreground ml-1">({sameLanguageWomen.length})</span>
              </div>
              {sameLanguageWomen.map((woman) => (
                <WhatsAppUserCard
                  key={woman.id}
                  name={woman.full_name || "Anonymous"}
                  photoUrl={woman.photo_url}
                  age={woman.age}
                  language={woman.primary_language}
                  country={woman.country}
                  activeChatCount={woman.active_chat_count}
                  onClick={() => handleStartChatWithWoman(woman.user_id, woman.full_name || "User")}
                  actions={
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${woman.user_id}`); }}>
                        <Eye className="w-3.5 h-3.5 text-primary" />
                      </Button>
                      {/* Audio Call - same language only */}
                      {userCountry === "IN" && (woman.country === 'IN' || woman.country?.toLowerCase().includes('india')) && woman.primary_language === userLanguage && (
                        <DirectAudioCallButton
                          currentUserId={currentUserId}
                          targetUserId={woman.user_id}
                          targetName={woman.full_name || "User"}
                          targetPhoto={woman.photo_url}
                          walletBalance={walletBalance}
                          onBalanceChange={(newBalance) => setWalletBalance(newBalance)}
                          size="sm"
                          variant="ghost"
                          iconOnly={true}
                        />
                      )}
                      {/* Video Call - same language only */}
                      {userCountry === "IN" && (woman.country === 'IN' || woman.country?.toLowerCase().includes('india')) && woman.primary_language === userLanguage && (
                        <DirectVideoCallButton
                          currentUserId={currentUserId}
                          targetUserId={woman.user_id}
                          targetName={woman.full_name || "User"}
                          targetPhoto={woman.photo_url}
                          walletBalance={walletBalance}
                          onBalanceChange={(newBalance) => setWalletBalance(newBalance)}
                          iconOnly={true}
                        />
                      )}
                      <Button
                        variant="aurora"
                        size="sm"
                        className="h-7 px-2 text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartChatWithWoman(woman.user_id, woman.full_name || "User");
                        }}
                      >
                        <MessageCircle className="w-3 h-3 mr-0.5" />
                        Chat
                      </Button>
                    </div>
                  }
                />
              ))}
            </>
          )}

          {/* Other Languages Section */}
          {indianTranslatedWomen.length > 0 && (
            <>
              <div className="px-4 py-2 bg-muted/30 border-b border-border/30">
                <span className="text-xs font-semibold text-muted-foreground">Other Languages</span>
                <span className="text-[10px] text-muted-foreground ml-1">({indianTranslatedWomen.length})</span>
              </div>
              {indianTranslatedWomen.map((woman) => (
                <WhatsAppUserCard
                  key={woman.id}
                  name={woman.full_name || "Anonymous"}
                  photoUrl={woman.photo_url}
                  age={woman.age}
                  language={woman.primary_language}
                  country={woman.country}
                  activeChatCount={woman.active_chat_count}
                  subtitle={`${woman.primary_language} → ${userLanguage}`}
                  onClick={() => handleStartChatWithWoman(woman.user_id, woman.full_name || "User")}
                  actions={
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${woman.user_id}`); }}>
                        <Eye className="w-3.5 h-3.5 text-primary" />
                      </Button>
                      <Button
                        variant="aurora"
                        size="sm"
                        className="h-7 px-2 text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartChatWithWoman(woman.user_id, woman.full_name || "User");
                        }}
                      >
                        <MessageCircle className="w-3 h-3 mr-0.5" />
                        Chat
                      </Button>
                    </div>
                  }
                />
              ))}
            </>
          )}

          {sameLanguageWomen.length === 0 && indianTranslatedWomen.length === 0 && notifications.length === 0 && (
            <div className="text-center py-16">
              <MessageCircle className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No women online right now</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Check back later</p>
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
          Active Chats ({activeChats.length})
        </span>
        <Button variant="ghost" size="sm" onClick={fetchActiveChats} disabled={loadingChats} className="h-7 w-7 p-0">
          <RefreshCw className={cn("w-3.5 h-3.5", loadingChats && "animate-spin")} />
        </Button>
      </div>
      {loadingChats ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : activeChats.length > 0 ? (
        activeChats.map((chat) => (
          <div
            key={chat.chatId}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer border-b border-border/30"
            onClick={() => navigate(`/chat/${chat.partnerId}`)}
          >
            <div className="relative flex-shrink-0">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarImage src={chat.partnerPhoto || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                  {chat.partnerName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-online" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground truncate">{chat.partnerName}</span>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                  {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        <Button variant="outline" size="sm" onClick={() => setPrivateGroupsRefreshKey(prev => prev + 1)} className="h-7 text-xs px-2">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>
      {currentUserId ? (
        <div className="px-4 py-3">
          <AvailableGroupsSection
            key={privateGroupsRefreshKey}
            currentUserId={currentUserId}
            userName={userName || 'User'}
            userPhoto={userPhoto}
          />
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
        <span className="text-sm font-semibold text-foreground">Your Matches ({matchedWomen.length})</span>
        <Button variant="ghost" size="sm" onClick={() => currentUserId && fetchMatchedWomen(currentUserId)} disabled={loadingMatches} className="h-7 w-7 p-0">
          <RefreshCw className={cn("w-3.5 h-3.5", loadingMatches && "animate-spin")} />
        </Button>
      </div>
      {loadingMatches ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : matchedWomen.length > 0 ? (
        matchedWomen.map((woman) => (
          <WhatsAppUserCard
            key={woman.matchId}
            name={woman.fullName || "User"}
            photoUrl={woman.photoUrl}
            age={woman.age}
            language={woman.primaryLanguage}
            country={woman.country}
            isOnline={woman.isOnline}
            onClick={() => navigate(`/profile/${woman.userId}`)}
            actions={
              <Button
                variant="aurora"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => handleStartChatWithWoman(woman.userId, woman.fullName || "User")}
              >
                <MessageCircle className="w-3 h-3 mr-0.5" />
                Chat
              </Button>
            }
          />
        ))
      ) : (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No matches yet</p>
          <Button variant="aurora" size="sm" className="mt-3 gap-1" onClick={() => navigate("/match-discovery")}>
            <Compass className="w-4 h-4" /> Discover
          </Button>
        </div>
      )}
    </div>
  );

  const renderProfileTab = () => (
    <div className="flex-1 overflow-y-auto">
      {/* Profile card */}
      <div className="px-4 py-6 flex flex-col items-center border-b border-border/30">
        <Avatar className="w-20 h-20 border-4 border-primary/20 shadow-lg mb-3">
          <AvatarImage src={userPhoto || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl font-bold">
            {userName?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-bold text-foreground">{userName || "User"}</h2>
        <p className="text-xs text-muted-foreground">{userLanguage} • {userCountryName || userCountry}</p>
        <Badge className={cn("mt-2 text-[10px] text-primary-foreground", getStatusColor())}>
          {getStatusText()}
        </Badge>
      </div>

      {/* Wallet */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/30 hover:bg-muted/50 cursor-pointer" onClick={() => setRechargeDialogOpen(true)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Wallet Balance</p>
            <p className="text-xs text-muted-foreground">Tap to recharge</p>
          </div>
        </div>
        <span className="text-lg font-bold text-primary">{formatLocalCurrency(walletBalance)}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0 border-b border-border/30">
        <div className="text-center py-4 border-r border-border/30">
          <p className="text-xl font-bold text-foreground">{stats.onlineUsersCount}</p>
          <p className="text-[10px] text-muted-foreground">Online</p>
        </div>
        <div className="text-center py-4 border-r border-border/30">
          <p className="text-xl font-bold text-foreground">{stats.matchCount}</p>
          <p className="text-[10px] text-muted-foreground">Matches</p>
        </div>
        <div className="text-center py-4">
          <p className="text-xl font-bold text-foreground">{activeChatCount}</p>
          <p className="text-[10px] text-muted-foreground">Active Chats</p>
        </div>
      </div>

      {/* Quick links */}
      {[
        { icon: <UserCircle className="w-5 h-5 text-primary" />, label: "Edit Profile", onClick: () => setProfileEditOpen(true) },
        { icon: <Compass className="w-5 h-5 text-primary" />, label: "Discover Matches", onClick: () => navigate("/match-discovery") },
        { icon: <Eye className="w-5 h-5 text-primary" />, label: "Online Users", onClick: () => navigate("/online-users") },
        { icon: <Gift className="w-5 h-5 text-primary" />, label: "Send Gift", onClick: () => navigate("/match-discovery") },
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
      {/* WhatsApp-style Header */}
      <WhatsAppHeader
        isOnline={isOnline}
        onToggleOnline={(checked) => {
          toggleOnlineStatus(checked);
          toast({
            title: checked ? 'You are now Online' : 'You are now Offline',
            description: checked ? 'Women can see you' : 'You are hidden from others',
          });
        }}
        onAdminMessages={() => setShowAdminMessages(true)}
        onAdminChat={() => setShowAdminChat(true)}
        onFriends={() => setShowFriendsPanel(true)}
        onSettings={() => navigate('/settings')}
        onLogout={handleLogout}
        unreadNotifications={stats.unreadNotifications}
        onNotifications={() => {
          setActiveTab("online");
          setTimeout(() => document.getElementById('notifications-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
        }}
      />

      {/* Tab Content */}
      {activeTab === "online" && renderOnlineUsersTab()}
      {activeTab === "chats" && renderChatsTab()}
      {activeTab === "history" && <CallHistoryTab currentUserId={currentUserId} userGender="male" />}
      {activeTab === "groups" && renderGroupsTab()}
      {activeTab === "matches" && renderMatchesTab()}
      {activeTab === "profile" && renderProfileTab()}

      {/* WhatsApp-style Bottom Tabs */}
      <WhatsAppBottomTabs tabs={menTabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Recharge Dialog */}
      <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {t('rechargeWallet', 'Recharge Wallet')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="text-muted-foreground">
                {t('yourCurrency', 'Your currency')}: <span className="font-semibold text-foreground">{getCurrencyInfo().code}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('pricesShownInLocal', 'Prices shown in your local currency (stored as INR)')}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                🇮🇳 {t('indianPaymentMethods', 'Indian Payment Methods')}
              </Label>
              <RadioGroup value={selectedGateway} onValueChange={setSelectedGateway} className="grid grid-cols-2 gap-3">
                {INDIAN_GATEWAYS.map((gateway) => (
                  <div key={gateway.id} className="relative">
                    <RadioGroupItem value={gateway.id} id={`gateway-${gateway.id}`} className="peer sr-only" />
                    <Label htmlFor={`gateway-${gateway.id}`} className={cn("flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5", selectedGateway === gateway.id ? "border-primary bg-primary/10" : "border-border")}>
                      <span className="text-2xl mb-1">{gateway.logo}</span>
                      <span className="font-semibold text-sm">{gateway.name}</span>
                      <span className="text-[10px] text-muted-foreground text-center mt-1">{gateway.description}</span>
                      {selectedGateway === gateway.id && <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-primary" />}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium block">Select Amount</Label>
              <Select value={selectedAmount?.toString() || ""} onValueChange={(value) => { if (value === "custom") { setSelectedAmount(null); } else { setSelectedAmount(Number(value)); setCustomAmount(""); } }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose recharge amount" /></SelectTrigger>
                <SelectContent>
                  {RECHARGE_AMOUNTS_INR.map((amountINR) => (<SelectItem key={amountINR} value={amountINR.toString()}>{formatLocalCurrency(amountINR)} (₹{amountINR})</SelectItem>))}
                  <SelectItem value="custom">Custom Amount</SelectItem>
                </SelectContent>
              </Select>
              {(!selectedAmount || customAmount) && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <input type="number" min="10" max="100000" placeholder="Enter custom amount" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); const val = Number(e.target.value); if (val >= 10) setSelectedAmount(val); else setSelectedAmount(null); }} className="w-full pl-8 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              )}
              <Button variant="aurora" className="w-full gap-2" onClick={() => selectedAmount && handleRecharge(selectedAmount)} disabled={!selectedAmount || processingPayment}>
                {processingPayment ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><CreditCard className="h-4 w-4" />{selectedAmount ? `Pay ${formatLocalCurrency(selectedAmount)}` : "Select Amount"}</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">Secure payment via {ALL_GATEWAYS.find(g => g.id === selectedGateway)?.name}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <ProfileEditDialog open={profileEditOpen} onOpenChange={setProfileEditOpen} onProfileUpdated={() => loadDashboardData()} />

      {/* Chat windows removed — chats are async (WhatsApp-style), accessed via Chats tab */}

      {/* Incoming Video Call Window */}
      {incomingCall && (
        <IncomingVideoCallWindow callId={incomingCall.callId} callerUserId={incomingCall.callerUserId} callerName={incomingCall.callerName} callerPhoto={incomingCall.callerPhoto} currentUserId={currentUserId} onClose={clearIncomingCall} />
      )}

      {/* Friends & Blocked Panel */}
      {showFriendsPanel && currentUserId && (
        <FriendsBlockedPanel currentUserId={currentUserId} userGender="male" onClose={() => setShowFriendsPanel(false)} />
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
    </div>
  );
};

export default DashboardScreen;
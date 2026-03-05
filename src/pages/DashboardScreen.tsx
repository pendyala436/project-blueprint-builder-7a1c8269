import { useState, useEffect } from "react";
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
  Search, 
  Settings,
  User,
  Sparkles,
  ChevronRight,
  Circle,
  LogOut,
  Wallet,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Filter,
  Eye,
  Power,
  Users2,
  Compass,
  UserCircle,
  BellRing,
  WalletCards,
  Zap,
  Globe2,
  Video,
  Gift,
  Shield,
  Sliders,
  Mail,
  FileText,
  History,
  ArrowLeft,
  Home
} from "lucide-react";
import { FriendsBlockedPanel } from "@/components/FriendsBlockedPanel";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MatchFiltersPanel, MatchFilters } from "@/components/MatchFiltersPanel";
// ActiveChatsSection removed - chats now handled via EnhancedParallelChatsContainer
import { RandomChatButton } from "@/components/RandomChatButton";
import VideoCallMiniButton from "@/components/VideoCallMiniButton";
import DirectVideoCallButton from "@/components/DirectVideoCallButton";
// TeamsChatLayout removed - chats now handled via EnhancedParallelChatsContainer only
import EnhancedParallelChatsContainer from "@/components/EnhancedParallelChatsContainer";
import { TransactionHistoryWidget } from "@/components/TransactionHistoryWidget";
import { RecentActivityWidget } from "@/components/RecentActivityWidget";
import { AvailableGroupsSection } from "@/components/AvailableGroupsSection";
import { UserAdminChat } from "@/components/UserAdminChat";
import { AdminMessagesWidget } from "@/components/AdminMessagesWidget";
import MenFreeMinutesBadge from "@/components/MenFreeMinutesBadge";
import { useMenFreeMinutes } from "@/hooks/useMenFreeMinutes";


import { isIndianLanguage, INDIAN_LANGUAGES as INDIAN_NLLB200_LANGUAGES, NON_INDIAN_LANGUAGES as NON_INDIAN_NLLB200_LANGUAGES, ALL_SUPPORTED_LANGUAGES as ALL_NLLB200_LANGUAGES } from "@/data/supportedLanguages";
import { useChatPricing } from "@/hooks/useChatPricing";
import { useAutoReconnect } from "@/hooks/useAutoReconnect";
import { useAtomicTransaction } from "@/hooks/useAtomicTransaction";
import { useActivityBasedStatus } from "@/hooks/useActivityBasedStatus";
import { useAppSettings } from "@/hooks/useAppSettings";

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

// Note: Currency rates and payment gateways are now loaded dynamically from app_settings
// via useAppSettings hook - no hardcoded values

interface PaymentGateway {
  id: string;
  name: string;
  logo: string;
  description: string;
  features?: string[];
}

const DashboardScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Plain English helper - no translation, returns fallback directly
  const t = (_key: string, fallback: string) => fallback;
  
  const { creditWallet } = useAtomicTransaction();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null); // User's photo for chat validation
  const [userCountry, setUserCountry] = useState("IN");
  const [userCountryName, setUserCountryName] = useState(""); // Full country name for NLLB feature
  const [userLanguage, setUserLanguage] = useState("English"); // User's primary language
  const [userLanguageCode, setUserLanguageCode] = useState("eng_Latn"); // NLLB-200 language code
  const [walletBalance, setWalletBalance] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sameLanguageWomen, setSameLanguageWomen] = useState<OnlineWoman[]>([]);
  const [indianTranslatedWomen, setIndianTranslatedWomen] = useState<OnlineWoman[]>([]);
  const [loadingOnlineWomen, setLoadingOnlineWomen] = useState(false);
  const [matchedWomen, setMatchedWomen] = useState<MatchedWoman[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [isNonIndianNLLBUser, setIsNonIndianNLLBUser] = useState(false); // Is man's language non-Indian but NLLB-200 supported
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
  const [selectedGateway, setSelectedGateway] = useState("stripe");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
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

  // App settings (currency rates, payment gateways, recharge amounts - all from database)
  const { settings } = useAppSettings();

  // Chat pricing from admin settings
  const { pricing, calculateCost, hasSufficientBalance, formatPrice } = useChatPricing();
  
  // Auto-reconnect functionality
  const { 
    isReconnecting, 
    findNextAvailableWoman, 
    initiateReconnect 
  } = useAutoReconnect(currentUserId, userLanguage);

  // Men's free chat minutes (10 min every 15 days)
  const menFreeMinutes = useMenFreeMinutes(currentUserId || null);

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
  const INDIAN_GATEWAYS = settings.paymentGateways.indian;
  const INTERNATIONAL_GATEWAYS = settings.paymentGateways.international;
  const ALL_GATEWAYS = [...INDIAN_GATEWAYS, ...INTERNATIONAL_GATEWAYS];

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

  useEffect(() => {
    loadDashboardData();
    updateUserOnlineStatus(true);
    loadActiveChatCount();

    // Cleanup: set offline when leaving
    return () => {
      updateUserOnlineStatus(false);
    };
  }, []);

  // Real-time subscription for online users, chat sessions, wallet, women availability, and language changes
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status' },
        () => { 
          fetchOnlineUsersCount(); 
          // Refresh women list when any user's online status changes
          if (userLanguage) {
            fetchOnlineWomen(userLanguage);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_chat_sessions' },
        () => { loadActiveChatCount(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        () => { loadWalletBalance(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'women_availability' },
        () => { 
          if (userLanguage) {
            fetchOnlineWomen(userLanguage);
          }
        }
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
  }, [currentUserId, userLanguage, userCountryName]);

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
      .eq("status", "active");
    
    setActiveChatCount(count || 0);
  };

  const getStatusText = () => {
    if (activeChatCount >= 3) return t('busy', 'Busy') + "(3)";
    return t('available', 'Available');
  };

  const getStatusColor = () => {
    // Green = online/available, Red = at max capacity (3 chats)
    if (activeChatCount >= 3) return "bg-destructive";
    return "bg-online";
  };

  const getStatusDotColor = () => {
    if (activeChatCount >= 3) return "bg-destructive";
    return "bg-online";
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

      // First check gender from main profiles table for redirection
      const { data: mainProfile } = await supabase
        .from("profiles")
        .select("gender, full_name, date_of_birth, primary_language, preferred_language, country, photo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      
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

      // Use data from main profiles table (single source of truth)
      // mainProfile already fetched above contains all needed fields

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
        setUserCountryName(userCountryValue); // Store full country name for NLLB feature
        // Map country name to code
        const countryCodeMap: Record<string, string> = {
          "India": "IN", "United States": "US", "United Kingdom": "GB",
          "Australia": "AU", "Canada": "CA", "Germany": "EU", "France": "EU",
          "Japan": "JP", "Singapore": "SG", "Malaysia": "MY", "Philippines": "PH",
          "Thailand": "TH", "Saudi Arabia": "SA", "UAE": "AE", "Qatar": "QA",
          "Kuwait": "KW", "Bangladesh": "BD", "Pakistan": "PK", "Nepal": "NP",
          "Sri Lanka": "LK"
        };
        setUserCountry(countryCodeMap[userCountryValue] || "IN");
      }

      // Fetch wallet balance via server-side RPC
      const { data: walletRpc } = await supabase.rpc('get_men_wallet_balance', {
        p_user_id: user.id
      });

      if (walletRpc) {
        const wd = walletRpc as Record<string, number>;
        setWalletBalance(Number(wd.balance) || 0);
      }

      // Fetch stats in parallel
      await Promise.all([
        fetchOnlineUsersCount(),
        fetchMatchCount(user.id),
        fetchNotifications(user.id),
        fetchOnlineWomen(motherTongue),
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

  // Handle starting chat with a woman - with auto-reconnect if woman is busy
  const handleStartChatWithWoman = async (womanUserId: string, womanName: string) => {
    if (isConnecting) return;
    setIsConnecting(true);

    try {
      // Get current user email to check if super user
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || '';
      
      // Super users (matching email pattern) bypass balance check entirely
      const isSuperUser = /^(female|male|admin)([1-9]|1[0-5])@meow-meow\.com$/i.test(userEmail);
      
      // Note: Photo validation not needed at runtime - photos are mandatory during registration

      // Check wallet balance using admin-configured pricing (skip for super users)
      if (!isSuperUser) {
        const minBalance = pricing.ratePerMinute * 2; // Need at least 2 minutes worth
        if (!hasSufficientBalance(walletBalance, 2)) {
          toast({
            title: t('insufficientBalance', 'Insufficient Balance'),
            description: t('pleaseRechargeToChat', `Please recharge at least ${formatPrice(minBalance)} to start chatting`),
            variant: "destructive",
          });
          setRechargeDialogOpen(true);
          setIsConnecting(false);
          return;
        }
      }

      // Check if already in active chat with this user
      const { data: existingChat } = await supabase
        .from("active_chat_sessions")
        .select("id")
        .eq("man_user_id", currentUserId)
        .eq("woman_user_id", womanUserId)
        .eq("status", "active")
        .maybeSingle();

      if (existingChat) {
        // Chat already exists - parallel chat container will show it
        toast({
          title: t('chatActive', 'Chat Active'),
          description: `${t('alreadyChattingWith', 'Already chatting with')} ${womanName}`,
        });
        setIsConnecting(false);
        return;
      }

      // Check parallel chat limit - use constant from LIMITS
      const MAX_PARALLEL_CHATS = 3; // Maximum allowed parallel chats
      const { count: activeChats } = await supabase
        .from("active_chat_sessions")
        .select("*", { count: "exact", head: true })
        .eq("man_user_id", currentUserId)
        .eq("status", "active");

      const currentActiveCount = activeChats || 0;
      console.log(`[ParallelChats] Current active: ${currentActiveCount}, Max allowed: ${MAX_PARALLEL_CHATS}`);

      if (currentActiveCount >= MAX_PARALLEL_CHATS) {
        toast({
          title: t('maxChatsReached', 'Max Chats Reached'),
          description: t('canOnlyHave3Chats', `You can only have ${MAX_PARALLEL_CHATS} active chats at a time. Close an existing chat to start a new one.`),
          variant: "destructive",
        });
        setIsConnecting(false);
        return;
      }

      // Check if selected woman is available (not busy)
      const { data: womanAvailability } = await supabase
        .from("women_availability")
        .select("current_chat_count, max_concurrent_chats, is_available")
        .eq("user_id", womanUserId)
        .maybeSingle();

      const maxChats = womanAvailability?.max_concurrent_chats || 3;
      const currentChats = womanAvailability?.current_chat_count || 0;
      const isAvailable = womanAvailability?.is_available !== false;

      // If woman is busy, auto-reconnect to another available woman
      if (!isAvailable || currentChats >= maxChats) {
        toast({
          title: t('userBusy', 'User Busy'),
          description: t('findingAnotherUser', 'Finding another available user...'),
        });

        // Use auto-reconnect to find next available woman
        const nextWoman = await initiateReconnect(womanUserId);
        
        if (nextWoman) {
          // Recursively try with the new woman
          await handleStartChatWithWoman(nextWoman.userId, nextWoman.fullName);
        } else {
          toast({
            title: t('noOneAvailable', 'No One Available'),
            description: t('tryAgainLater', 'All users are busy. Please try again later.'),
            variant: "destructive",
          });
        }
        setIsConnecting(false);
        return;
      }

      // Use admin-configured rate per minute
      const ratePerMinute = pricing.ratePerMinute;

      // Create active chat session
      const chatId = `chat_${currentUserId}_${womanUserId}_${Date.now()}`;
      const { error: sessionError } = await supabase
        .from("active_chat_sessions")
        .insert({
          chat_id: chatId,
          man_user_id: currentUserId,
          woman_user_id: womanUserId,
          status: "active",
          rate_per_minute: ratePerMinute
        });

      if (sessionError) throw sessionError;

      // Update woman's chat count
      await supabase
        .from("women_availability")
        .update({ 
          current_chat_count: currentChats + 1,
          last_assigned_at: new Date().toISOString()
        })
        .eq("user_id", womanUserId);

      toast({
        title: t('chatStarted', 'Chat Started'),
        description: `${t('startingChatWith', 'Starting chat with')} ${womanName} (${formatPrice(ratePerMinute)}/min)`,
      });

      // Chat session created - parallel chat container will display it automatically
      // No navigation needed - stay on dashboard
    } catch (error) {
      console.error("Error starting chat:", error);
      
      // On error, try to auto-reconnect to another woman
      const nextWoman = await initiateReconnect(womanUserId);
      if (nextWoman) {
        await handleStartChatWithWoman(nextWoman.userId, nextWoman.fullName);
      } else {
        toast({
          title: t('error', 'Error'),
          description: t('failedToStartChat', 'Failed to start chat'),
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

      let onlineWomenList: OnlineWoman[] = femaleProfiles || [];

      // Also fetch from main profiles table for online women
      const { data: mainProfiles } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, photo_url, age, country, primary_language, is_earning_eligible")
        .or("gender.eq.female,gender.eq.Female")
        .eq("approval_status", "approved")
        .in("user_id", onlineUserIds)
        .limit(50);

      if (mainProfiles && mainProfiles.length > 0) {
        const existingUserIds = new Set(onlineWomenList.map(w => w.user_id));
        mainProfiles.forEach(p => {
          if (!existingUserIds.has(p.user_id)) {
            onlineWomenList.push(p);
          }
        });
      }

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
        .select("woman_user_id")
        .in("woman_user_id", womenUserIds)
        .eq("status", "active");

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
        availabilityData?.map(a => [a.user_id, a]) || []
      );

      // Get languages
      const { data: userLanguages } = await supabase
        .from("user_languages")
        .select("user_id, language_name")
        .in("user_id", womenUserIds);

      const languageMap = new Map(userLanguages?.map(l => [l.user_id, l.language_name]) || []);

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

    // Check chat limit
    if (activeChatCount >= 3) {
      toast({
        title: t('maxChatsReached', 'Max Chats Reached'),
        description: t('canOnlyHave3Chats', 'You can only have 3 active chats at a time'),
        variant: "destructive",
      });
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
        description: t('failedToConnect', 'Failed to connect'),
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

      // Get the other user's ID from each match
      const otherUserIds = matches.map(m => 
        m.user_id === userId ? m.matched_user_id : m.user_id
      );

      // Fetch profiles for matched users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, age, country, primary_language, gender")
        .in("user_id", otherUserIds);

      // Fetch online status
      const { data: statuses } = await supabase
        .from("user_status")
        .select("user_id, is_online")
        .in("user_id", otherUserIds);

      const statusMap = new Map(statuses?.map(s => [s.user_id, s.is_online]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const matched: MatchedWoman[] = matches
        .map(m => {
          const otherId = m.user_id === userId ? m.matched_user_id : m.user_id;
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
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchNotifications = async (userId: string) => {
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
    } catch (error) {
      console.error("Error updating status:", error);
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

  const handleRecharge = async (amountINR: number) => {
    setSelectedAmount(amountINR);
    setProcessingPayment(true);
    
    const gateway = ALL_GATEWAYS.find(g => g.id === selectedGateway);
    toast({
      title: "Processing Payment",
      description: `Opening ${gateway?.name} for ${formatLocalCurrency(amountINR)}...`,
    });

    // Use atomic transaction for ACID compliance
    setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Use atomic transaction function
        const result = await creditWallet(
          user.id,
          amountINR,
          `Recharge via ${gateway?.name} (${formatLocalCurrency(amountINR)})`,
          `${selectedGateway.toUpperCase()}_${Date.now()}`
        );

        if (result.success) {
          setWalletBalance(result.newBalance || walletBalance + amountINR);
          setRechargeDialogOpen(false);
          
          toast({
            title: "Recharge Successful!",
            description: `${formatLocalCurrency(amountINR)} added to your wallet`,
          });
        } else {
          throw new Error(result.error || "Recharge failed");
        }
      } catch (error) {
        console.error("Recharge error:", error);
        toast({
          title: "Recharge Failed",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setSelectedAmount(null);
        setProcessingPayment(false);
      }
    }, 2000);
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
      action: () => navigate("/match-discovery")
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/20 shadow-sm">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MeowLogo size="sm" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-tight">Meow Meow</p>
              <p className="text-[10px] text-muted-foreground">Connect & Chat</p>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5">
            {/* Transaction Statement */}
            <button 
              className="relative p-2 rounded-lg hover:bg-accent/80 transition-all duration-200"
              onClick={() => navigate('/transaction-history?tab=statement')}
              title="Transaction Statement"
            >
              <FileText className="w-[18px] h-[18px] text-foreground/70" />
            </button>

            {/* Transaction History */}
            <button 
              className="relative p-2 rounded-lg hover:bg-accent/80 transition-all duration-200"
              onClick={() => navigate('/transaction-history?tab=chats')}
              title="Transaction History"
            >
              <History className="w-[18px] h-[18px] text-foreground/70" />
            </button>

            {/* Admin Messages */}
            <button 
              className="relative p-2 rounded-lg hover:bg-accent/80 transition-all duration-200"
              onClick={() => navigate('/admin/messaging')}
              title="Admin Messages"
            >
              <Mail className="w-[18px] h-[18px] text-foreground/70" />
            </button>

            {/* Admin Chat */}
            <button 
              className="relative p-2 rounded-lg hover:bg-accent/80 transition-all duration-200"
              onClick={() => navigate('/admin/messaging?view=chat')}
              title="Chat with Admin"
            >
              <Shield className="w-[18px] h-[18px] text-foreground/70" />
            </button>

            {/* Notifications */}
            <button 
              className="relative p-2 rounded-lg hover:bg-accent/80 transition-all duration-200"
              title="Notifications"
            >
              <BellRing className="w-[18px] h-[18px] text-foreground/70" />
              {stats.unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              )}
            </button>

            {/* Friends & Blocked */}
            <button 
              className="relative p-2 rounded-lg hover:bg-accent/80 transition-all duration-200"
              onClick={() => setShowFriendsPanel(true)}
              title="Friends & Blocked Users"
            >
              <Users2 className="w-[18px] h-[18px] text-foreground/70" />
            </button>

            {/* Settings */}
            <button 
              className="p-2 rounded-lg hover:bg-accent/80 transition-all duration-200"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-[18px] h-[18px] text-foreground/70" />
            </button>

            {/* Logout */}
            <button 
              className="p-2 rounded-lg hover:bg-destructive/10 transition-all duration-200"
              onClick={handleLogout}
            >
              <LogOut className="w-[18px] h-[18px] text-destructive/70" />
            </button>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="px-3 py-3 space-y-4 sm:max-w-4xl sm:mx-auto sm:px-6 sm:py-8 sm:space-y-8">
        {/* Section 1: Welcome & Status */}
        <div className="animate-fade-in">
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={isOnline}
                      onCheckedChange={(checked) => {
                        toggleOnlineStatus(checked);
                        toast({
                          title: checked ? t('youAreOnline', 'You are now online') : t('youAreOffline', 'You are now offline'),
                          description: checked ? t('usersCanSeeYou', 'Other users can see you') : t('usersCannotSeeYou', 'You are hidden from other users'),
                        });
                      }}
                      className="data-[state=checked]:bg-primary scale-90"
                    />
                    <Power className={`w-3.5 h-3.5 shrink-0 ${isOnline ? "text-online" : "text-muted-foreground"}`} />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {isOnline ? t('online', 'Online') : t('offline', 'Offline')}
                    </span>
                  </div>
                  <Badge className={cn("text-[9px] px-1.5 py-0.5 text-white flex items-center gap-0.5", getStatusColor())}>
                    <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                      activeChatCount >= 3 ? "bg-destructive-foreground/60" : "bg-online/60"
                    )} />
                    {getStatusText()}
                  </Badge>
                </div>
                <h1 className="text-base sm:text-3xl font-bold text-foreground leading-tight">
                  {t('welcome', 'Welcome')}{userName ? `, ${userName}` : ""}! 👋
                </h1>
                <p className="text-xs sm:text-base text-muted-foreground mt-0.5">
                  {t('readyToConnect', 'Ready to make new connections today?')}
                </p>
              </div>
              <MatchFiltersPanel 
                filters={matchFilters} 
                onFiltersChange={setMatchFilters}
                userCountry={userCountryName}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Online Women */}
        <div className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-1.5">
              <Globe2 className="w-4 h-4 text-primary" />
              {t('onlineWomen', 'Women Online')}
              <Badge variant="outline" className="text-[9px] font-normal ml-1">{sameLanguageWomen.length + indianTranslatedWomen.length}</Badge>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchOnlineWomen(userLanguage)}
              disabled={loadingOnlineWomen}
              className="gap-1 h-7 text-xs px-2"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loadingOnlineWomen && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {loadingOnlineWomen ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* Left Column: Same Language Women */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <span className="text-sm font-medium text-success">{t('sameLanguage', 'Same Language')}</span>
                  <span className="px-2 py-0.5 text-xs bg-success/20 text-success rounded-full">
                    {userLanguage}
                  </span>
                  <span className="text-xs text-muted-foreground">({sameLanguageWomen.length})</span>
                </div>
                
                {sameLanguageWomen.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {sameLanguageWomen.map((woman) => (
                      <Card
                        key={woman.id}
                        className="p-3 hover:shadow-lg transition-all cursor-pointer group ring-2 ring-success/50 bg-success/5"
                        onClick={() => handleStartChatWithWoman(woman.user_id, woman.full_name || "User")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10 border-2 border-background shadow-md">
                              <AvatarImage src={woman.photo_url || undefined} alt={woman.full_name || "User"} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm">
                                {woman.full_name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                              (woman.active_chat_count || 0) >= 3 ? "bg-destructive" : "bg-online"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-foreground truncate">
                                {woman.full_name || "Anonymous"}
                              </p>
                              {woman.age && (
                                <span className="text-xs text-muted-foreground">{woman.age} yrs</span>
                              )}
                            </div>
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-success/20 text-success rounded-full">
                              {woman.primary_language}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap shrink-0">
                            <Button
                              variant="auroraOutline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${woman.user_id}`);
                              }}
                              title="View Profile"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            {/* Video call: Indian man + Indian woman + same language (already in same-language section) */}
                            {userCountry === "IN" && woman.country?.toLowerCase().includes('india') && (
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
                              className={cn(
                                "gap-1 text-[11px] h-7 px-2",
                                (woman.active_chat_count || 0) >= 3 && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={(woman.active_chat_count || 0) >= 3}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartChatWithWoman(woman.user_id, woman.full_name || "User");
                              }}
                            >
                              <MessageCircle className="w-3 h-3" />
                              {(woman.active_chat_count || 0) >= 3 ? "Busy" : "Chat"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-6 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t('noSameLanguageWomen', 'No women speaking')} {userLanguage}</p>
                  </Card>
                )}
              </div>

              {/* Right Column: Other Language Women */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <span className="text-sm font-medium text-info">{t('otherLanguages', 'Other Languages')}</span>
                  <span className="text-xs text-muted-foreground">({indianTranslatedWomen.length})</span>
                </div>
                
                {indianTranslatedWomen.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {indianTranslatedWomen.map((woman) => (
                      <Card
                        key={woman.id}
                        className="p-3 hover:shadow-lg transition-all cursor-pointer group ring-2 ring-info/30 bg-info/5"
                        onClick={() => handleStartChatWithWoman(woman.user_id, woman.full_name || "User")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10 border-2 border-background shadow-md">
                              <AvatarImage src={woman.photo_url || undefined} alt={woman.full_name || "User"} />
                              <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-white text-sm">
                                {woman.full_name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                              (woman.active_chat_count || 0) >= 3 ? "bg-destructive" : "bg-online"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-foreground truncate">
                                {woman.full_name || "Anonymous"}
                              </p>
                              {woman.age && (
                                <span className="text-xs text-muted-foreground">{woman.age} yrs</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-info/20 text-info rounded-full">
                                {woman.primary_language}
                              </span>
                              <span className="text-[10px] text-muted-foreground">→</span>
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary rounded-full">
                                {userLanguage}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap shrink-0">
                            <Button
                              variant="auroraOutline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${woman.user_id}`);
                              }}
                              title="View Profile"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="aurora"
                              size="sm"
                              className={cn(
                                "gap-1 text-[11px] h-7 px-2",
                                (woman.active_chat_count || 0) >= 3 && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={(woman.active_chat_count || 0) >= 3}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartChatWithWoman(woman.user_id, woman.full_name || "User");
                              }}
                            >
                              <MessageCircle className="w-3 h-3" />
                              {(woman.active_chat_count || 0) >= 3 ? "Busy" : "Chat"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-6 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t('noOtherWomen', 'No women speaking other languages available')}</p>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Matches Section */}
        <div className="animate-fade-in" style={{ animationDelay: "0.07s" }}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-primary" />
              {t('yourMatches', 'Your Matches')}
              <span className="text-[10px] text-muted-foreground">({matchedWomen.length})</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => currentUserId && fetchMatchedWomen(currentUserId)}
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
          ) : matchedWomen.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 sm:gap-3 max-h-[350px] overflow-y-auto pr-1">
              {matchedWomen.map((woman) => (
                <Card
                  key={woman.matchId}
                  className="p-2.5 hover:shadow-lg transition-all cursor-pointer group border-primary/20"
                  onClick={() => navigate(`/profile/${woman.userId}`)}
                >
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <div className="relative">
                      <Avatar className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-primary/30 shadow-md">
                        <AvatarImage src={woman.photoUrl || undefined} alt={woman.fullName} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm sm:text-lg">
                          {woman.fullName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
                        woman.isOnline ? "bg-online" : "bg-muted-foreground/40"
                      )} />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="font-medium text-sm text-foreground truncate">
                        {woman.fullName}
                      </p>
                      {woman.age && (
                        <span className="text-xs text-muted-foreground">{woman.age} yrs</span>
                      )}
                      {woman.primaryLanguage && (
                        <span className="block px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full mt-1 truncate">
                          {woman.primaryLanguage}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 w-full">
                      <Button
                        variant="aurora"
                        size="sm"
                        className="flex-1 gap-1 text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartChatWithWoman(woman.userId, woman.fullName);
                        }}
                      >
                        <MessageCircle className="w-3 h-3" />
                        {t('chat', 'Chat')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${woman.userId}`);
                        }}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <Heart className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('noMatchesYet', 'No matches yet')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('likeProfilesToMatch', 'Like profiles to start matching!')}</p>
            </Card>
          )}
        </div>

        {/* Section 3: Key Stats */}
        <div className="grid grid-cols-3 gap-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {/* Online Users */}
          <Card className="p-2 sm:p-4 text-center bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex flex-col items-center gap-1">
              <div className="p-1.5 sm:p-2.5 rounded-full bg-primary/15">
                <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-base sm:text-xl font-bold text-foreground">{stats.onlineUsersCount}</p>
                <p className="text-[9px] sm:text-[11px] text-muted-foreground">{t('onlineNow', 'Online')}</p>
              </div>
            </div>
          </Card>

          {/* Matches */}
          <Card className="p-2 sm:p-4 text-center bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex flex-col items-center gap-1">
              <div className="p-1.5 sm:p-2.5 rounded-full bg-primary/15">
                <Heart className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-base sm:text-xl font-bold text-foreground">{stats.matchCount}</p>
                <p className="text-[9px] sm:text-[11px] text-muted-foreground">{t('matches', 'Matches')}</p>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-2 sm:p-4 text-center bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex flex-col items-center gap-1">
              <div className="p-1.5 sm:p-2.5 rounded-full bg-primary/15">
                <BellRing className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-base sm:text-xl font-bold text-foreground">{stats.unreadNotifications}</p>
                <p className="text-[9px] sm:text-[11px] text-muted-foreground">{t('notifications', 'Alerts')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 3: Wallet & Primary Actions */}
        <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <Card className="p-2.5 sm:p-5 bg-gradient-to-br from-primary/8 to-accent/5 border-primary/20">
            <div className="flex flex-col items-center gap-3">
              {/* Balance */}
              <div className="flex items-center gap-2.5">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <WalletCards className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <p className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('walletBalance', 'Wallet Balance')}</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">
                    ₹{walletBalance.toLocaleString()}
                    <span className="text-[9px] sm:text-sm font-normal text-muted-foreground ml-1 block sm:inline">
                      ({formatLocalCurrency(walletBalance)})
                    </span>
                  </p>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full">
                <RandomChatButton 
                  userGender="male"
                  userLanguage={userLanguage}
                  userCountry={userCountryName}
                  walletBalance={walletBalance}
                  variant="aurora"
                  size="lg"
                  onInsufficientBalance={() => setRechargeDialogOpen(true)}
                  className="w-full"
                />
                {userCountry === "IN" && (
                  <VideoCallMiniButton
                    currentUserId={currentUserId}
                    userLanguage={userLanguage}
                    walletBalance={walletBalance}
                    onBalanceChange={(newBalance) => setWalletBalance(newBalance)}
                  />
                )}
                <Button 
                  variant="aurora" 
                  size="default"
                  onClick={() => setRechargeDialogOpen(true)}
                  className="gap-1.5 w-full text-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  {t('rechargeWallet', 'Recharge')}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 4: Quick Actions */}
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-sm sm:text-lg font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-primary" />
            {t('quickActions', 'Quick Actions')}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="group flex flex-col items-center gap-1 p-2 sm:p-4 rounded-xl bg-card hover:bg-accent/50 border border-border/30 hover:border-primary/30 transition-all duration-200"
              >
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-all duration-200`}>
                  {action.icon}
                </div>
                <p className="text-[10px] sm:text-xs font-medium text-foreground text-center leading-tight">{action.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Active Chats now handled via EnhancedParallelChatsContainer at bottom of screen */}

        {/* Men's Free Chat Minutes */}
        {currentUserId && (
          <div className="animate-fade-in" style={{ animationDelay: "0.23s" }}>
            <MenFreeMinutesBadge
              hasFreeMinutes={menFreeMinutes.hasFreeMinutes}
              freeMinutesRemaining={menFreeMinutes.freeMinutesRemaining}
              freeMinutesTotal={menFreeMinutes.freeMinutesTotal}
              nextResetDate={menFreeMinutes.nextResetDate}
              isLoading={menFreeMinutes.isLoading}
            />
          </div>
        )}





        {/* Private Groups Section */}
        <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-1.5">
              <Video className="h-4 w-4 text-primary" />
              Private Groups
            </h2>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 text-[11px] sm:text-sm text-muted-foreground mb-3 border border-border/20">
            <p className="font-medium text-foreground mb-0.5 text-xs">💰 How to Join</p>
            <p>Join any live private group call at <span className="font-semibold text-primary">₹{pricing?.ratePerMinute || 4}/min</span>. Min 5 min balance required.</p>
          </div>
          <AvailableGroupsSection
            currentUserId={currentUserId}
            userName={userName || 'User'}
            userPhoto={null}
          />
        </div>

        {/* Section 7: Recent Notifications */}
        <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm sm:text-lg font-semibold text-foreground">{t('recentActivity', 'Recent Activity')}</h2>
            <button className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className="p-2.5 sm:p-4 flex items-start gap-2.5 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className={`p-1.5 rounded-full shrink-0 ${
                    notification.type === "match" ? "bg-female/10 text-female" :
                    notification.type === "message" ? "bg-info/10 text-info" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {notification.type === "match" ? <Heart className="w-4 h-4" /> :
                     notification.type === "message" ? <MessageCircle className="w-4 h-4" /> :
                     <Bell className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm text-foreground truncate">{notification.title}</p>
                    <p className="text-[11px] sm:text-sm text-muted-foreground line-clamp-1">{notification.message}</p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0 mt-1" />
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-5 sm:p-8 text-center">
              <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">{t('noNotifications', 'No new activity yet')}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">
                {t('startExploringToGetMatches', 'Start exploring to get matches and notifications!')}
              </p>
            </Card>
          )}
        </div>

        {/* Section 8: CTA Banner */}
        <Card className="p-2.5 sm:p-5 bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 border-primary/20 animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shrink-0">
              <Sparkles className="w-4 h-4 sm:w-7 sm:h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-[11px] sm:text-sm">{t('boostYourProfile', '✨ Boost your profile!')}</h3>
              <p className="text-[9px] sm:text-xs text-muted-foreground">{t('getMoreMatchesWithPremium', 'Recharge for more connections')}</p>
            </div>
            <Button variant="aurora" size="sm" className="rounded-lg shadow-sm shrink-0 text-[11px] sm:text-sm h-8 px-2.5" onClick={() => setRechargeDialogOpen(true)}>
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Recharge
            </Button>
          </div>
        </Card>
      </main>

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
            {/* Currency Info */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="text-muted-foreground">
                {t('yourCurrency', 'Your currency')}: <span className="font-semibold text-foreground">{getCurrencyInfo().code}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('pricesShownInLocal', 'Prices shown in your local currency (stored as INR)')}
              </p>
            </div>

            {/* Indian Payment Gateways */}
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                🇮🇳 {t('indianPaymentMethods', 'Indian Payment Methods')}
              </Label>
              <RadioGroup
                value={selectedGateway}
                onValueChange={setSelectedGateway}
                className="grid grid-cols-2 gap-3"
              >
                {INDIAN_GATEWAYS.map((gateway) => (
                  <div key={gateway.id} className="relative">
                    <RadioGroupItem
                      value={gateway.id}
                      id={`gateway-${gateway.id}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`gateway-${gateway.id}`}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                        "hover:border-primary/50 hover:bg-primary/5",
                        selectedGateway === gateway.id
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      )}
                    >
                      <span className="text-2xl mb-1">{gateway.logo}</span>
                      <span className="font-semibold text-sm">{gateway.name}</span>
                      <span className="text-[10px] text-muted-foreground text-center mt-1">{gateway.description}</span>
                      {selectedGateway === gateway.id && (
                        <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-primary" />
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* International Payment Gateways */}
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                🌍 {t('internationalPaymentMethods', 'International Payment Methods')}
              </Label>
              <RadioGroup
                value={selectedGateway}
                onValueChange={setSelectedGateway}
                className="grid grid-cols-2 gap-3"
              >
                {INTERNATIONAL_GATEWAYS.map((gateway) => (
                  <div key={gateway.id} className="relative">
                    <RadioGroupItem
                      value={gateway.id}
                      id={`gateway-${gateway.id}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`gateway-${gateway.id}`}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                        "hover:border-primary/50 hover:bg-muted/50",
                        selectedGateway === gateway.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <span className="text-2xl mb-1">{gateway.logo}</span>
                      <span className="font-semibold text-sm">{gateway.name}</span>
                      <span className="text-[10px] text-muted-foreground text-center mt-1">{gateway.description}</span>
                      {selectedGateway === gateway.id && (
                        <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-primary" />
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Recharge Amounts Dropdown */}
            <div className="space-y-3">
              <Label className="text-sm font-medium block">Select Amount</Label>
              <Select
                value={selectedAmount?.toString() || ""}
                onValueChange={(value) => setSelectedAmount(Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose recharge amount" />
                </SelectTrigger>
                <SelectContent>
                  {RECHARGE_AMOUNTS_INR.map((amountINR) => (
                    <SelectItem key={amountINR} value={amountINR.toString()}>
                      {formatLocalCurrency(amountINR)} (₹{amountINR})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="aurora"
                className="w-full gap-2"
                onClick={() => selectedAmount && handleRecharge(selectedAmount)}
                disabled={!selectedAmount || processingPayment}
              >
                {processingPayment ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    {selectedAmount ? `Pay ${formatLocalCurrency(selectedAmount)}` : "Select Amount"}
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Secure payment via {ALL_GATEWAYS.find(g => g.id === selectedGateway)?.name}
            </p>
          </div>
        </DialogContent>
      </Dialog>

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
          userGender="male"
          currentUserLanguage={userLanguage}
        />
      )}

      {/* Friends & Blocked Panel */}
      {showFriendsPanel && currentUserId && (
        <FriendsBlockedPanel
          currentUserId={currentUserId}
          userGender="male"
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
    </div>
  );
};

export default DashboardScreen;
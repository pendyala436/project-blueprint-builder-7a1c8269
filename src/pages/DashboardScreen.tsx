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
  Power
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MatchFiltersPanel, MatchFilters } from "@/components/MatchFiltersPanel";
import { ActiveChatsSection } from "@/components/ActiveChatsSection";
import { RandomChatButton } from "@/components/RandomChatButton";
import ParallelChatsContainer from "@/components/ParallelChatsContainer";
import VideoCallButton from "@/components/VideoCallButton";
import { AvailableGroupsSection } from "@/components/AvailableGroupsSection";

import { useTranslation } from "@/contexts/TranslationContext";
import { isIndianLanguage, INDIAN_NLLB200_LANGUAGES, NON_INDIAN_NLLB200_LANGUAGES, ALL_NLLB200_LANGUAGES } from "@/data/nllb200Languages";
import { useChatPricing } from "@/hooks/useChatPricing";
import { useAutoReconnect } from "@/hooks/useAutoReconnect";
import { useAtomicTransaction } from "@/hooks/useAtomicTransaction";
import { useActivityBasedStatus } from "@/hooks/useActivityBasedStatus";

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
}

interface DashboardStats {
  onlineUsersCount: number;
  matchCount: number;
  unreadNotifications: number;
}

// Currency conversion rates (base: INR)
const CURRENCY_RATES: Record<string, { rate: number; symbol: string; code: string }> = {
  IN: { rate: 1, symbol: "₹", code: "INR" },
  US: { rate: 0.012, symbol: "$", code: "USD" },
  GB: { rate: 0.0095, symbol: "£", code: "GBP" },
  EU: { rate: 0.011, symbol: "€", code: "EUR" },
  AE: { rate: 0.044, symbol: "د.إ", code: "AED" },
  AU: { rate: 0.018, symbol: "A$", code: "AUD" },
  CA: { rate: 0.016, symbol: "C$", code: "CAD" },
  JP: { rate: 1.79, symbol: "¥", code: "JPY" },
  SG: { rate: 0.016, symbol: "S$", code: "SGD" },
  MY: { rate: 0.053, symbol: "RM", code: "MYR" },
  PH: { rate: 0.67, symbol: "₱", code: "PHP" },
  TH: { rate: 0.41, symbol: "฿", code: "THB" },
  SA: { rate: 0.045, symbol: "﷼", code: "SAR" },
  QA: { rate: 0.044, symbol: "ر.ق", code: "QAR" },
  KW: { rate: 0.0037, symbol: "د.ك", code: "KWD" },
  BD: { rate: 1.31, symbol: "৳", code: "BDT" },
  PK: { rate: 3.34, symbol: "Rs", code: "PKR" },
  NP: { rate: 1.59, symbol: "रू", code: "NPR" },
  LK: { rate: 3.66, symbol: "Rs", code: "LKR" },
  DEFAULT: { rate: 0.012, symbol: "$", code: "USD" },
};

// Generate recharge amounts (multiples of 200 and 300 up to 1000 INR)
const generateRechargeAmounts = (): number[] => {
  const amounts = new Set<number>();
  // Multiples of 200
  for (let i = 200; i <= 1000; i += 200) {
    amounts.add(i);
  }
  // Multiples of 300
  for (let i = 300; i <= 1000; i += 300) {
    amounts.add(i);
  }
  return Array.from(amounts).sort((a, b) => a - b);
};

const RECHARGE_AMOUNTS_INR = generateRechargeAmounts();

interface PaymentGateway {
  id: string;
  name: string;
  logo: string;
  description: string;
  features?: string[];
}

const INDIAN_GATEWAYS: PaymentGateway[] = [
  { 
    id: "razorpay", 
    name: "Razorpay", 
    logo: "🇮🇳", 
    description: "UPI, Cards, Netbanking",
    features: ["UPI", "Debit/Credit Cards", "Netbanking", "Wallets"]
  },
  { 
    id: "ccavenue", 
    name: "CCAvenue", 
    logo: "🏦", 
    description: "Cards, Wallets, EMI",
    features: ["Cards", "EMI", "Wallets", "Netbanking"]
  },
];

const INTERNATIONAL_GATEWAYS: PaymentGateway[] = [
  { 
    id: "stripe", 
    name: "Stripe", 
    logo: "💎", 
    description: "Cards, Apple Pay, Google Pay",
    features: ["Cards", "Apple Pay", "Google Pay", "Bank Transfers"]
  },
  { 
    id: "paypal", 
    name: "PayPal", 
    logo: "🅿️", 
    description: "200+ countries supported",
    features: ["PayPal Balance", "Cards", "Bank Account"]
  },
  { 
    id: "wise", 
    name: "Wise", 
    logo: "💸", 
    description: "International Transfers",
    features: ["Bank Transfer", "Low Fees", "Multi-currency"]
  },
  { 
    id: "adyen", 
    name: "Adyen", 
    logo: "🌐", 
    description: "Global Payments",
    features: ["Cards", "Local Methods", "Digital Wallets"]
  },
];

const ALL_GATEWAYS = [...INDIAN_GATEWAYS, ...INTERNATIONAL_GATEWAYS];

const DashboardScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, translateDynamicBatch, currentLanguage } = useTranslation();
  const { creditWallet } = useAtomicTransaction();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userCountry, setUserCountry] = useState("IN");
  const [userCountryName, setUserCountryName] = useState(""); // Full country name for NLLB feature
  const [userLanguage, setUserLanguage] = useState("English"); // User's primary language
  const [userLanguageCode, setUserLanguageCode] = useState("eng_Latn"); // NLLB-200 language code
  const [walletBalance, setWalletBalance] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sameLanguageWomen, setSameLanguageWomen] = useState<OnlineWoman[]>([]);
  const [indianTranslatedWomen, setIndianTranslatedWomen] = useState<OnlineWoman[]>([]);
  const [loadingOnlineWomen, setLoadingOnlineWomen] = useState(false);
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

  // Chat pricing from admin settings
  const { pricing, calculateCost, hasSufficientBalance, formatPrice } = useChatPricing();
  
  // Auto-reconnect functionality
  const { 
    isReconnecting, 
    findNextAvailableWoman, 
    initiateReconnect 
  } = useAutoReconnect(currentUserId, userLanguage);

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

  // Get currency info based on user's country
  const getCurrencyInfo = () => {
    return CURRENCY_RATES[userCountry] || CURRENCY_RATES.DEFAULT;
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
    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", currentUserId)
      .maybeSingle();
    if (data) setWalletBalance(data.balance || 0);
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

      // First check gender from main profiles table for redirection
      const { data: mainProfile } = await supabase
        .from("profiles")
        .select("gender, full_name, date_of_birth, primary_language, preferred_language, country")
        .eq("user_id", user.id)
        .maybeSingle();

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

      // Fetch user profile from male_profiles table
      const { data: maleProfile } = await supabase
        .from("male_profiles")
        .select("full_name, country, primary_language, preferred_language, date_of_birth")
        .eq("user_id", user.id)
        .maybeSingle();

      // Fetch user's languages
      const { data: userLanguages } = await supabase
        .from("user_languages")
        .select("language_name, language_code")
        .eq("user_id", user.id)
        .limit(1);

      // Use main profiles table first (registration data), then fall back to male_profiles
      const motherTongue = userLanguages?.[0]?.language_name || 
                          mainProfile?.primary_language ||
                          mainProfile?.preferred_language ||
                          maleProfile?.primary_language || 
                          maleProfile?.preferred_language || 
                          "English";
      const languageCode = userLanguages?.[0]?.language_code || "eng_Latn";
      setUserLanguage(motherTongue);
      setUserLanguageCode(languageCode);

      // Use name from main profiles table first (registration data), then fall back to male_profiles
      const fullName = mainProfile?.full_name || maleProfile?.full_name;
      if (fullName) {
        setUserName(fullName.split(" ")[0]);
      }
      
      // Use country from main profiles table first (registration data), then fall back to male_profiles
      const userCountryValue = mainProfile?.country || maleProfile?.country;
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

      // Fetch wallet balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) {
        setWalletBalance(wallet.balance);
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
        navigate(`/chat/${womanUserId}`);
        setIsConnecting(false);
        return;
      }

      // Check parallel chat limit
      const { count: activeChats } = await supabase
        .from("active_chat_sessions")
        .select("*", { count: "exact", head: true })
        .eq("man_user_id", currentUserId)
        .eq("status", "active");

      if ((activeChats || 0) >= 3) {
        toast({
          title: t('maxChatsReached', 'Max Chats Reached'),
          description: t('canOnlyHave3Chats', 'You can only have 3 active chats at a time'),
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

      navigate(`/chat/${womanUserId}`);
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
      const userHasIndianLanguage = isIndianLanguage(language);
      const indianLanguageNames = INDIAN_NLLB200_LANGUAGES.map(l => l.name.toLowerCase());
      const nonIndianNLLBNames = NON_INDIAN_NLLB200_LANGUAGES.map(l => l.name.toLowerCase());
      
      // Check if user's language is a non-Indian NLLB-200 language
      const isUserNonIndianNLLB = nonIndianNLLBNames.includes(language.toLowerCase());
      setIsNonIndianNLLBUser(isUserNonIndianNLLB);

      // Get online user IDs
      const { data: onlineUsers } = await supabase
        .from("user_status")
        .select("user_id")
        .eq("is_online", true);

      const onlineUserIds = onlineUsers?.map(u => u.user_id) || [];

      // Fetch women from all sources
      let allWomen: OnlineWoman[] = [];

      // Fetch from female_profiles table - only users with photos
      const { data: femaleProfiles } = await supabase
        .from("female_profiles")
        .select("id, user_id, full_name, photo_url, age, country, primary_language")
        .eq("approval_status", "approved")
        .eq("account_status", "active")
        .not("photo_url", "is", null)
        .neq("photo_url", "")
        .limit(50);

      if (femaleProfiles && femaleProfiles.length > 0) {
        allWomen = [...femaleProfiles];
      }

      // Note: Only real authenticated users from database are shown - no sample/mock data fallback

      // Filter by online status if we have online user IDs
      const onlineWomenList = onlineUserIds.length > 0 
        ? allWomen.filter(w => onlineUserIds.includes(w.user_id))
        : allWomen;

      // Get active chat counts for all women
      const womenUserIds = onlineWomenList.map(w => w.user_id);
      const { data: chatCounts } = await supabase
        .from("active_chat_sessions")
        .select("woman_user_id")
        .in("woman_user_id", womenUserIds)
        .eq("status", "active");

      // Count chats per woman
      const chatCountMap = new Map<string, number>();
      chatCounts?.forEach(chat => {
        const count = chatCountMap.get(chat.woman_user_id) || 0;
        chatCountMap.set(chat.woman_user_id, count + 1);
      });

      // Add chat count to each woman and get availability
      const { data: availabilityData } = await supabase
        .from("women_availability")
        .select("user_id, is_available, current_chat_count, max_concurrent_chats")
        .in("user_id", womenUserIds);

      const availabilityMap = new Map(
        availabilityData?.map(a => [a.user_id, a]) || []
      );

      const womenWithChatCount = onlineWomenList.map(w => {
        const avail = availabilityMap.get(w.user_id);
        const chatCount = avail?.current_chat_count || chatCountMap.get(w.user_id) || 0;
        return {
          ...w,
          active_chat_count: chatCount,
          is_available: avail?.is_available !== false,
          max_chats: avail?.max_concurrent_chats || 3
        };
      });

      // Sort women: Free (0 chats) first, then by chat count ascending
      const sortByAvailability = (a: typeof womenWithChatCount[0], b: typeof womenWithChatCount[0]) => {
        // First: available vs not available
        if (a.is_available !== b.is_available) return a.is_available ? -1 : 1;
        // Second: not at max capacity
        const aAtMax = a.active_chat_count >= a.max_chats;
        const bAtMax = b.active_chat_count >= b.max_chats;
        if (aAtMax !== bAtMax) return aAtMax ? 1 : -1;
        // Third: by chat count (lower first = more available)
        return a.active_chat_count - b.active_chat_count;
      };

      // Split women into two categories:
      // 1. Same language women (sorted by availability)
      const sameLanguage = womenWithChatCount
        .filter(w => w.primary_language?.toLowerCase() === language.toLowerCase())
        .sort(sortByAvailability);

      // 2. All other NLLB-200 language women (for auto-translate) - NOT same as user's language
      const allNLLBNames = ALL_NLLB200_LANGUAGES.map(l => l.name.toLowerCase());
      
      // For non-Indian language users, only show Indian women
      const userHasNonIndianLanguage = !userHasIndianLanguage;
      
      const otherNLLBWomen = womenWithChatCount
        .filter(w => {
          const womenLang = w.primary_language?.toLowerCase() || "";
          // Must be NLLB-200 supported language and NOT same as user's language
          const isNLLB = allNLLBNames.includes(womenLang);
          const isDifferentLang = womenLang !== language.toLowerCase();
          
          // If user has non-Indian language, only show Indian women
          if (userHasNonIndianLanguage) {
            return isNLLB && isDifferentLang && indianLanguageNames.includes(womenLang);
          }
          
          return isNLLB && isDifferentLang;
        })
        .sort(sortByAvailability);

      console.log("[Dashboard] Same language women found:", sameLanguage.length, "for language:", language);
      console.log("[Dashboard] Other NLLB women found:", otherNLLBWomen.length);
      setSameLanguageWomen(sameLanguage.slice(0, 10));
      setIndianTranslatedWomen(otherNLLBWomen.slice(0, 15));
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
  };

  const fetchNotifications = async (userId: string) => {
    const { data, count } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5);

    // Translate notification titles and messages based on current language
    if (data && data.length > 0 && currentLanguage !== 'English') {
      const textsToTranslate = data.flatMap(n => [n.title, n.message]);
      const translated = await translateDynamicBatch(textsToTranslate);
      
      const translatedData = data.map((n, i) => ({
        ...n,
        title: translated[i * 2] || n.title,
        message: translated[i * 2 + 1] || n.message,
      }));
      setNotifications(translatedData);
    } else {
      setNotifications(data || []);
    }
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
      icon: <Search className="w-6 h-6" />, 
      label: t('findMatch', 'Find Match'), 
      color: "from-primary to-rose-400",
      action: () => navigate("/find-match")
    },
    { 
      icon: <MessageCircle className="w-6 h-6" />, 
      label: t('messages', 'Messages'), 
      color: "from-blue-500 to-blue-400",
      action: () => navigate("/match-discovery")
    },
    { 
      icon: <Heart className="w-6 h-6" />, 
      label: t('matches', 'Matches'), 
      color: "from-rose-500 to-pink-400",
      action: () => navigate("/match-discovery")
    },
    { 
      icon: <User className="w-6 h-6" />, 
      label: t('profile', 'Profile'), 
      color: "from-violet-500 to-purple-400",
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
              <h1 className="text-3xl font-bold text-foreground">
                {t('welcome', 'Welcome')}{userName ? `, ${userName}` : ""}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
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

        {/* Section 2: Online Women - Two Columns (Moved to top) */}
        <div className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              {t('onlineWomen', 'Women Online')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchOnlineWomen(userLanguage)}
              disabled={loadingOnlineWomen}
              className="gap-1"
            >
              <RefreshCw className={cn("w-4 h-4", loadingOnlineWomen && "animate-spin")} />
              {t('refresh', 'Refresh')}
            </Button>
          </div>

          {loadingOnlineWomen ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Same Language Women */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <span className="text-sm font-medium text-emerald-600">{t('sameLanguage', 'Same Language')}</span>
                  <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-600 rounded-full">
                    {userLanguage}
                  </span>
                  <span className="text-xs text-muted-foreground">({sameLanguageWomen.length})</span>
                </div>
                
                {sameLanguageWomen.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {sameLanguageWomen.map((woman) => (
                      <Card
                        key={woman.id}
                        className="p-3 text-center hover:shadow-lg transition-all cursor-pointer group ring-2 ring-emerald-500/50 bg-emerald-500/5"
                        onClick={() => navigate(`/profile/${woman.user_id}`)}
                      >
                        <div className="relative mx-auto mb-2">
                          <Avatar className="w-12 h-12 mx-auto border-2 border-background shadow-md">
                            <AvatarImage src={woman.photo_url || undefined} alt={woman.full_name || "User"} />
                            <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white text-sm">
                              {woman.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background",
                            (woman.active_chat_count || 0) === 0 ? "bg-green-500" :
                            (woman.active_chat_count || 0) >= 3 ? "bg-red-500" : "bg-amber-500"
                          )} />
                        </div>
                        <p className="font-medium text-xs text-foreground truncate">
                          {woman.full_name || "Anonymous"}
                        </p>
                        {woman.age && (
                          <p className="text-[10px] text-muted-foreground">{woman.age} yrs</p>
                        )}
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/20 text-emerald-600 rounded-full">
                          {woman.primary_language}
                        </span>
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="aurora"
                            size="sm"
                            className={cn(
                              "flex-1 gap-1 text-xs h-7",
                              (woman.active_chat_count || 0) >= 3 && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={(woman.active_chat_count || 0) >= 3}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartChatWithWoman(woman.user_id, woman.full_name || "User");
                            }}
                          >
                            <MessageCircle className="w-3 h-3" />
                            {(woman.active_chat_count || 0) >= 3 ? t('busy', 'Busy') : t('chat', 'Chat')}
                          </Button>
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

              {/* Right Column: All NLLB-200 Women with Auto-Translation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <span className="text-sm font-medium text-blue-600">{t('otherLanguages', 'Other Languages')}</span>
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-600 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {t('autoTranslate', 'Auto-Translate')}
                  </span>
                  <span className="text-xs text-muted-foreground">({indianTranslatedWomen.length})</span>
                </div>
                
                {indianTranslatedWomen.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                    {indianTranslatedWomen.map((woman) => (
                      <Card
                        key={woman.id}
                        className="p-3 text-center hover:shadow-lg transition-all cursor-pointer group ring-2 ring-blue-500/30 bg-blue-500/5"
                        onClick={() => navigate(`/profile/${woman.user_id}`)}
                      >
                        <div className="relative mx-auto mb-2">
                          <Avatar className="w-12 h-12 mx-auto border-2 border-background shadow-md">
                            <AvatarImage src={woman.photo_url || undefined} alt={woman.full_name || "User"} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-sm">
                              {woman.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background",
                            (woman.active_chat_count || 0) === 0 ? "bg-green-500" :
                            (woman.active_chat_count || 0) >= 3 ? "bg-red-500" : "bg-amber-500"
                          )} />
                        </div>
                        <p className="font-medium text-xs text-foreground truncate">
                          {woman.full_name || "Anonymous"}
                        </p>
                        {woman.age && (
                          <p className="text-[10px] text-muted-foreground">{woman.age} yrs</p>
                        )}
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <span className="px-1.5 py-0.5 text-[9px] font-medium bg-blue-500/20 text-blue-600 rounded-full">
                            {woman.primary_language}
                          </span>
                          <span className="text-[9px] text-muted-foreground">→</span>
                          <span className="px-1.5 py-0.5 text-[9px] font-medium bg-primary/20 text-primary rounded-full">
                            {userLanguage}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="aurora"
                            size="sm"
                            className={cn(
                              "flex-1 gap-1 text-xs h-7",
                              (woman.active_chat_count || 0) >= 3 && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={(woman.active_chat_count || 0) >= 3}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartChatWithWoman(woman.user_id, woman.full_name || "User");
                            }}
                          >
                            <MessageCircle className="w-3 h-3" />
                            {(woman.active_chat_count || 0) >= 3 ? t('busy', 'Busy') : t('chat', 'Chat')}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-6 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t('noTranslateWomen', 'No women with auto-translate available')}</p>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {/* Online Users */}
          <Card className="p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.onlineUsersCount}</p>
                <p className="text-sm text-muted-foreground">{t('onlineNow', 'Online Now')}</p>
              </div>
            </div>
          </Card>

          {/* Matches */}
          <Card className="p-5 bg-gradient-aurora border-primary/30 hover:shadow-glow transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.matchCount}</p>
                <p className="text-sm text-muted-foreground">{t('matches', 'Matches')}</p>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-5 bg-gradient-aurora border-accent/30 hover:shadow-glow transition-all col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent/20">
                <Bell className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.unreadNotifications}</p>
                <p className="text-sm text-muted-foreground">{t('notifications', 'Notifications')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 3: Wallet & Primary Actions */}
        <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('walletBalance', 'Wallet Balance')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    ₹{walletBalance.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({formatLocalCurrency(walletBalance)})
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <RandomChatButton 
                  userGender="male"
                  userLanguage={userLanguage}
                  userCountry={userCountryName}
                  walletBalance={walletBalance}
                  variant="aurora"
                  size="lg"
                  onInsufficientBalance={() => setRechargeDialogOpen(true)}
                />
                <VideoCallButton
                  currentUserId={currentUserId}
                  userLanguage={userLanguage}
                  walletBalance={walletBalance}
                  onBalanceChange={setWalletBalance}
                />
                <Button 
                  variant="aurora" 
                  size="lg"
                  onClick={() => setRechargeDialogOpen(true)}
                  className="gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  {t('rechargeWallet', 'Recharge')}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 4: Quick Actions */}
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
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

        {/* Section 5: Active Chats */}
        <div className="animate-fade-in" style={{ animationDelay: "0.22s" }}>
          <ActiveChatsSection maxDisplay={5} />
        </div>



        {/* Private Rooms Section */}
        <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <AvailableGroupsSection
            currentUserId={currentUserId}
            userName={userName || 'User'}
            userPhoto={null}
          />
        </div>

        {/* Section 7: Recent Notifications */}
        <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
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
              <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">{t('noNotifications', 'No new activity yet')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('startExploringToGetMatches', 'Start exploring to get matches and notifications!')}
              </p>
            </Card>
          )}
        </div>

        {/* Section 8: CTA Banner */}
        <Card className="p-6 bg-gradient-aurora border-primary/30 shadow-glow animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary/80 text-white">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{t('boostYourProfile', 'Boost your profile!')}</h3>
              <p className="text-sm text-muted-foreground">{t('getMoreMatchesWithPremium', 'Get more matches with premium features')}</p>
            </div>
            <Button variant="aurora" size="sm" onClick={() => navigate("/wallet")}>
              {t('upgrade', 'Upgrade')}
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
                        "hover:border-orange-500/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/20",
                        selectedGateway === gateway.id
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                          : "border-border"
                      )}
                    >
                      <span className="text-2xl mb-1">{gateway.logo}</span>
                      <span className="font-semibold text-sm">{gateway.name}</span>
                      <span className="text-[10px] text-muted-foreground text-center mt-1">{gateway.description}</span>
                      {selectedGateway === gateway.id && (
                        <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-orange-500" />
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
        profileType="male"
      />

      {/* Parallel Mini Chat Windows */}
      {currentUserId && (
        <ParallelChatsContainer
          currentUserId={currentUserId}
          userGender="male"
          currentUserLanguage={userLanguage}
        />
      )}
    </div>
  );
};

export default DashboardScreen;
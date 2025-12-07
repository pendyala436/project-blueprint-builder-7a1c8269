import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Languages
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MatchFiltersPanel, MatchFilters } from "@/components/MatchFiltersPanel";
import { ActiveChatsSection } from "@/components/ActiveChatsSection";
import { RandomChatButton } from "@/components/RandomChatButton";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/contexts/TranslationContext";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [userName, setUserName] = useState("");
  const [userCountry, setUserCountry] = useState("IN");
  const [userCountryName, setUserCountryName] = useState(""); // Full country name for NLLB feature
  const [userLanguage, setUserLanguage] = useState("English"); // User's primary language
  const [userLanguageCode, setUserLanguageCode] = useState("eng_Latn"); // NLLB-200 language code
  const [walletBalance, setWalletBalance] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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

      // Fetch user profile including country and gender
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, country, gender, primary_language, preferred_language")
        .eq("user_id", user.id)
        .maybeSingle();

      // Fetch user's languages
      const { data: userLanguages } = await supabase
        .from("user_languages")
        .select("language_name, language_code")
        .eq("user_id", user.id)
        .limit(1);

      const motherTongue = userLanguages?.[0]?.language_name || 
                          profile?.primary_language || 
                          profile?.preferred_language || 
                          "English";
      const languageCode = userLanguages?.[0]?.language_code || "eng_Latn";
      setUserLanguage(motherTongue);
      setUserLanguageCode(languageCode);

      // Redirect women to their dashboard
      if (profile?.gender === "Female") {
        navigate("/women-dashboard");
        return;
      }

      if (profile?.full_name) {
        setUserName(profile.full_name.split(" ")[0]);
      }
      if (profile?.country) {
        setUserCountryName(profile.country); // Store full country name for NLLB feature
        // Map country name to code
        const countryCodeMap: Record<string, string> = {
          "India": "IN", "United States": "US", "United Kingdom": "GB",
          "Australia": "AU", "Canada": "CA", "Germany": "EU", "France": "EU",
          "Japan": "JP", "Singapore": "SG", "Malaysia": "MY", "Philippines": "PH",
          "Thailand": "TH", "Saudi Arabia": "SA", "UAE": "AE", "Qatar": "QA",
          "Kuwait": "KW", "Bangladesh": "BD", "Pakistan": "PK", "Nepal": "NP",
          "Sri Lanka": "LK"
        };
        setUserCountry(countryCodeMap[profile.country] || "IN");
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

      setIsOnline(online);
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

    // Simulate payment processing
    setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get or create wallet
        let { data: wallet } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!wallet) {
          const { data: newWallet } = await supabase
            .from("wallets")
            .insert({ user_id: user.id })
            .select()
            .single();
          wallet = newWallet;
        }

        if (!wallet) return;

        // Update wallet balance (store in INR)
        const newBalance = (wallet.balance || 0) + amountINR;
        await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("id", wallet.id);

        // Create transaction record
        await supabase
          .from("wallet_transactions")
          .insert({
            wallet_id: wallet.id,
            user_id: user.id,
            type: "credit",
            amount: amountINR,
            description: `Recharge via ${gateway?.name} (${formatLocalCurrency(amountINR)})`,
            reference_id: `${selectedGateway.toUpperCase()}_${Date.now()}`,
            status: "completed"
          });

        setWalletBalance(newBalance);
        setRechargeDialogOpen(false);
        
        toast({
          title: "Recharge Successful!",
          description: `${formatLocalCurrency(amountINR)} added to your wallet`,
        });
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
        {/* Welcome Section with Filter */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Circle className={`w-3 h-3 ${isOnline ? "fill-emerald-500 text-emerald-500" : "fill-muted text-muted"}`} />
                <span className="text-sm text-muted-foreground">
                  {isOnline ? t('online', 'Online') : t('offline', 'Offline')}
                </span>
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

        {/* Language Selection Card */}
        <div className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Languages className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">{t('appLanguage', 'Your Language')}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('languageDescription', "You'll be connected with women who speak")} {userLanguage}. {t('autoTranslateMessages', 'Messages are auto-translated.')}
                </p>
                <LanguageSelector
                  selectedLanguage={userLanguage}
                  selectedLanguageCode={userLanguageCode}
                  onLanguageChange={(lang, code) => {
                    setUserLanguage(lang);
                    setUserLanguageCode(code);
                  }}
                  showAllLanguages={false}
                  label=""
                />
              </div>
            </div>
          </Card>
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
                <p className="text-sm text-muted-foreground">{t('onlineNow', 'Online Now')}</p>
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
                <p className="text-sm text-muted-foreground">{t('matches', 'Matches')}</p>
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
                <p className="text-sm text-muted-foreground">{t('notifications', 'Notifications')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Wallet & Recharge Section */}
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
                  variant="hero"
                  size="lg"
                />
                <Button 
                  variant="gradient" 
                  size="lg"
                  onClick={() => setRechargeDialogOpen(true)}
                  className="gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Recharge
                </Button>
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

        {/* Active Chats Section */}
        <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <ActiveChatsSection maxDisplay={5} />
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
                onClick={() => navigate("/find-match")}
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
            <Button variant="gradient" size="sm" onClick={() => navigate("/wallet")}>
              Upgrade
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
              Recharge Wallet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Currency Info */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="text-muted-foreground">
                Your currency: <span className="font-semibold text-foreground">{getCurrencyInfo().code}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Prices shown in your local currency (stored as INR)
              </p>
            </div>

            {/* Indian Payment Gateways */}
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                🇮🇳 Indian Payment Methods
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
                🌍 International Payment Methods
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
                variant="gradient"
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
    </div>
  );
};

export default DashboardScreen;
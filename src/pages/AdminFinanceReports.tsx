import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Download, Users, TrendingUp, TrendingDown, Globe, Languages, IndianRupee, Calendar, BarChart3, DollarSign, Clock, Timer, RefreshCw, Home } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import { countries } from "@/data/countries";
import { languages } from "@/data/languages";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

interface MenSpending {
  user_id: string;
  full_name: string;
  country: string;
  language: string;
  total_spent: number;
  chat_spending: number;
  gift_spending: number;
  month: string;
}

interface WomenEarning {
  user_id: string;
  full_name: string;
  country: string;
  language: string;
  total_earned: number;
  chat_earnings: number;
  gift_earnings: number;
  month: string;
}

interface CountrySummary {
  country: string;
  men_spending: number;
  women_earnings: number;
  profit: number;
  user_count: number;
}

interface LanguageSummary {
  language: string;
  men_spending: number;
  women_earnings: number;
  profit: number;
  user_count: number;
}

interface MonthlyTrend {
  month: string;
  monthLabel: string;
  menSpending: number;
  womenEarnings: number;
  chatSpending: number;
  giftSpending: number;
  profit: number;
  activeUsers: number;
}

interface QueueStats {
  country: string;
  language: string;
  waitingCount: number;
  avgWaitTime: number;
  flag?: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const date = subMonths(new Date(), i);
  return {
    value: format(date, "yyyy-MM"),
    label: format(date, "MMMM yyyy"),
  };
});

// Use complete world lists
const ALL_COUNTRIES = countries.map(c => ({ name: c.name, flag: c.flag }));
const ALL_LANGUAGES = languages.map(l => l.name);

const AdminFinanceReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  
  const [menSpending, setMenSpending] = useState<MenSpending[]>([]);
  const [womenEarnings, setWomenEarnings] = useState<WomenEarning[]>([]);
  const [countrySummary, setCountrySummary] = useState<CountrySummary[]>([]);
  const [languageSummary, setLanguageSummary] = useState<LanguageSummary[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [queueByCountry, setQueueByCountry] = useState<QueueStats[]>([]);
  const [queueByLanguage, setQueueByLanguage] = useState<QueueStats[]>([]);
  
  const [totals, setTotals] = useState({
    totalMenSpending: 0,
    totalWomenEarnings: 0,
    totalProfit: 0,
    totalMen: 0,
    totalWomen: 0,
  });

  const loadAllData = useCallback(() => {
    loadReportData();
    loadTrendData();
    loadQueueStats();
  }, [selectedMonth, selectedCountry, selectedLanguage]);

  // Real-time subscriptions for finance-related tables
  useMultipleRealtimeSubscriptions(
    [
      "wallet_transactions",
      "women_earnings",
      "gift_transactions",
      "active_chat_sessions",
      "video_call_sessions",
      "chat_wait_queue",
      "withdrawal_requests",
      "profiles"
    ],
    loadAllData,
    true
  );

  useEffect(() => {
    loadAllData();
  }, [selectedMonth, selectedCountry, selectedLanguage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const loadQueueStats = async () => {
    try {
      // Load chat wait queue data
      const { data: queueData } = await supabase
        .from("chat_wait_queue")
        .select("user_id, preferred_language, status, wait_time_seconds, joined_at")
        .eq("status", "waiting");

      // Load profiles for country data
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, country, primary_language");

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Group by country
      const countryQueue = new Map<string, { count: number; totalWait: number; flag: string }>();
      // Group by language
      const langQueue = new Map<string, { count: number; totalWait: number }>();

      queueData?.forEach(q => {
        const profile = profileMap.get(q.user_id);
        const country = profile?.country || "Unknown";
        const language = q.preferred_language || profile?.primary_language || "Unknown";
        const waitTime = q.wait_time_seconds || Math.floor((Date.now() - new Date(q.joined_at).getTime()) / 1000);

        // Find country flag
        const countryData = ALL_COUNTRIES.find(c => c.name === country);
        const flag = countryData?.flag || "🌍";

        // Update country stats
        const existingCountry = countryQueue.get(country) || { count: 0, totalWait: 0, flag };
        existingCountry.count += 1;
        existingCountry.totalWait += waitTime;
        countryQueue.set(country, existingCountry);

        // Update language stats
        const existingLang = langQueue.get(language) || { count: 0, totalWait: 0 };
        existingLang.count += 1;
        existingLang.totalWait += waitTime;
        langQueue.set(language, existingLang);
      });

      // Convert to arrays
      const countryStats: QueueStats[] = Array.from(countryQueue.entries())
        .map(([country, data]) => ({
          country,
          language: "",
          waitingCount: data.count,
          avgWaitTime: data.count > 0 ? Math.round(data.totalWait / data.count) : 0,
          flag: data.flag,
        }))
        .sort((a, b) => b.waitingCount - a.waitingCount);

      const langStats: QueueStats[] = Array.from(langQueue.entries())
        .map(([language, data]) => ({
          country: "",
          language,
          waitingCount: data.count,
          avgWaitTime: data.count > 0 ? Math.round(data.totalWait / data.count) : 0,
        }))
        .sort((a, b) => b.waitingCount - a.waitingCount);

      setQueueByCountry(countryStats);
      setQueueByLanguage(langStats);
    } catch (error) {
      console.error("Error loading queue stats:", error);
    }
  };

  const formatWaitTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const loadTrendData = async () => {
    try {
      // Load last 6 months of trend data
      const trends: MonthlyTrend[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, "yyyy-MM");
        const monthLabel = format(date, "MMM yy");
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);

        // Get wallet transactions for this month
        const { data: walletTxns } = await supabase
          .from("wallet_transactions")
          .select("user_id, amount, type")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .in("type", ["chat_payment", "gift_purchase", "debit"]);

        // Get women earnings for this month
        const { data: womenEarningsData } = await supabase
          .from("women_earnings")
          .select("amount")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        // Get active chat sessions for this month
        const { data: chatSessions } = await supabase
          .from("active_chat_sessions")
          .select("total_earned")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        const menSpendingTotal = (walletTxns || []).reduce((sum, t) => sum + Math.abs(t.amount), 0) +
          (chatSessions || []).reduce((sum, s) => sum + s.total_earned, 0);
        
        const chatSpending = (walletTxns || [])
          .filter(t => t.type === "chat_payment")
          .reduce((sum, t) => sum + Math.abs(t.amount), 0) +
          (chatSessions || []).reduce((sum, s) => sum + s.total_earned, 0);
        
        const giftSpending = (walletTxns || [])
          .filter(t => t.type === "gift_purchase")
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const womenEarningsTotal = (womenEarningsData || []).reduce((sum, e) => sum + e.amount, 0);

        const uniqueUsers = new Set([
          ...(walletTxns || []).map(t => t.user_id),
        ]);

        trends.push({
          month: monthKey,
          monthLabel,
          menSpending: menSpendingTotal,
          womenEarnings: womenEarningsTotal,
          chatSpending,
          giftSpending,
          profit: menSpendingTotal - womenEarningsTotal,
          activeUsers: uniqueUsers.size,
        });
      }

      setMonthlyTrends(trends);
    } catch (error) {
      console.error("Error loading trend data:", error);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split("-");
      const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const endDate = endOfMonth(startDate);

      // Load men's spending data
      const { data: walletTxns } = await supabase
        .from("wallet_transactions")
        .select("user_id, amount, type, created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .in("type", ["chat_payment", "gift_purchase", "debit"]);

      const { data: giftTxns } = await supabase
        .from("gift_transactions")
        .select("sender_id, price_paid, created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const { data: chatSessions } = await supabase
        .from("active_chat_sessions")
        .select("man_user_id, total_earned, created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Load women's earnings
      const { data: womenEarningsData } = await supabase
        .from("women_earnings")
        .select("user_id, amount, earning_type, created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Load all profiles for name/country/language lookup
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, country, primary_language, gender");

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Aggregate men spending
      const menSpendingMap = new Map<string, MenSpending>();
      
      walletTxns?.forEach(txn => {
        const profile = profileMap.get(txn.user_id);
        if (!profile || profile.gender?.toLowerCase() !== "male") return;
        
        const existing = menSpendingMap.get(txn.user_id) || {
          user_id: txn.user_id,
          full_name: profile.full_name || "Unknown",
          country: profile.country || "Unknown",
          language: profile.primary_language || "Unknown",
          total_spent: 0,
          chat_spending: 0,
          gift_spending: 0,
          month: selectedMonth,
        };
        
        const amount = Math.abs(txn.amount);
        existing.total_spent += amount;
        if (txn.type === "chat_payment") existing.chat_spending += amount;
        if (txn.type === "gift_purchase") existing.gift_spending += amount;
        
        menSpendingMap.set(txn.user_id, existing);
      });

      chatSessions?.forEach(session => {
        const profile = profileMap.get(session.man_user_id);
        if (!profile) return;
        
        const existing = menSpendingMap.get(session.man_user_id) || {
          user_id: session.man_user_id,
          full_name: profile.full_name || "Unknown",
          country: profile.country || "Unknown",
          language: profile.primary_language || "Unknown",
          total_spent: 0,
          chat_spending: 0,
          gift_spending: 0,
          month: selectedMonth,
        };
        
        existing.chat_spending += session.total_earned;
        existing.total_spent += session.total_earned;
        menSpendingMap.set(session.man_user_id, existing);
      });

      // Aggregate women earnings
      const womenEarningsMap = new Map<string, WomenEarning>();
      
      womenEarningsData?.forEach(earning => {
        const profile = profileMap.get(earning.user_id);
        if (!profile) return;
        
        const existing = womenEarningsMap.get(earning.user_id) || {
          user_id: earning.user_id,
          full_name: profile.full_name || "Unknown",
          country: profile.country || "Unknown",
          language: profile.primary_language || "Unknown",
          total_earned: 0,
          chat_earnings: 0,
          gift_earnings: 0,
          month: selectedMonth,
        };
        
        existing.total_earned += earning.amount;
        if (earning.earning_type === "chat") existing.chat_earnings += earning.amount;
        if (earning.earning_type === "gift") existing.gift_earnings += earning.amount;
        
        womenEarningsMap.set(earning.user_id, existing);
      });

      // Convert to arrays and apply filters
      let menList = Array.from(menSpendingMap.values());
      let womenList = Array.from(womenEarningsMap.values());

      if (selectedCountry !== "all") {
        menList = menList.filter(m => m.country === selectedCountry);
        womenList = womenList.filter(w => w.country === selectedCountry);
      }

      if (selectedLanguage !== "all") {
        menList = menList.filter(m => m.language === selectedLanguage);
        womenList = womenList.filter(w => w.language === selectedLanguage);
      }

      // Sort by total spent/earned
      menList.sort((a, b) => b.total_spent - a.total_spent);
      womenList.sort((a, b) => b.total_earned - a.total_earned);

      // Calculate country summary
      const countryMap = new Map<string, CountrySummary>();
      menList.forEach(m => {
        const existing = countryMap.get(m.country) || { country: m.country, men_spending: 0, women_earnings: 0, profit: 0, user_count: 0 };
        existing.men_spending += m.total_spent;
        existing.user_count += 1;
        countryMap.set(m.country, existing);
      });
      womenList.forEach(w => {
        const existing = countryMap.get(w.country) || { country: w.country, men_spending: 0, women_earnings: 0, profit: 0, user_count: 0 };
        existing.women_earnings += w.total_earned;
        existing.user_count += 1;
        countryMap.set(w.country, existing);
      });
      // Calculate profit for each country
      countryMap.forEach((value, key) => {
        value.profit = value.men_spending - value.women_earnings;
        countryMap.set(key, value);
      });

      // Calculate language summary
      const langMap = new Map<string, LanguageSummary>();
      menList.forEach(m => {
        const existing = langMap.get(m.language) || { language: m.language, men_spending: 0, women_earnings: 0, profit: 0, user_count: 0 };
        existing.men_spending += m.total_spent;
        existing.user_count += 1;
        langMap.set(m.language, existing);
      });
      womenList.forEach(w => {
        const existing = langMap.get(w.language) || { language: w.language, men_spending: 0, women_earnings: 0, profit: 0, user_count: 0 };
        existing.women_earnings += w.total_earned;
        existing.user_count += 1;
        langMap.set(w.language, existing);
      });
      // Calculate profit for each language
      langMap.forEach((value, key) => {
        value.profit = value.men_spending - value.women_earnings;
        langMap.set(key, value);
      });

      // Country and language data is now from imported complete lists
      setMenSpending(menList);
      setWomenEarnings(womenList);
      setCountrySummary(Array.from(countryMap.values()).sort((a, b) => b.men_spending - a.men_spending));
      setLanguageSummary(Array.from(langMap.values()).sort((a, b) => b.men_spending - a.men_spending));
      
      const totalMenSpend = menList.reduce((sum, m) => sum + m.total_spent, 0);
      const totalWomenEarn = womenList.reduce((sum, w) => sum + w.total_earned, 0);
      
      setTotals({
        totalMenSpending: totalMenSpend,
        totalWomenEarnings: totalWomenEarn,
        totalProfit: totalMenSpend - totalWomenEarn,
        totalMen: menList.length,
        totalWomen: womenList.length,
      });

    } catch (error) {
      console.error("Error loading report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const exportMenSpending = () => {
    const headers = ["User ID", "Name", "Country", "Language", "Chat Spending", "Gift Spending", "Total Spent", "Month"];
    const rows = menSpending.map(m => [
      m.user_id,
      m.full_name,
      m.country,
      m.language,
      m.chat_spending.toFixed(2),
      m.gift_spending.toFixed(2),
      m.total_spent.toFixed(2),
      m.month,
    ]);
    downloadCSV([headers, ...rows], `men_spending_${selectedMonth}.csv`);
    toast.success("Men spending report exported");
  };

  const exportWomenEarnings = () => {
    const headers = ["User ID", "Name", "Country", "Language", "Chat Earnings", "Gift Earnings", "Total Earned", "Month"];
    const rows = womenEarnings.map(w => [
      w.user_id,
      w.full_name,
      w.country,
      w.language,
      w.chat_earnings.toFixed(2),
      w.gift_earnings.toFixed(2),
      w.total_earned.toFixed(2),
      w.month,
    ]);
    downloadCSV([headers, ...rows], `women_earnings_${selectedMonth}.csv`);
    toast.success("Women earnings report exported");
  };

  const exportCountrySummary = () => {
    const headers = ["Country", "Men Spending", "Women Earnings", "Profit", "User Count"];
    const rows = countrySummary.map(c => [
      c.country,
      c.men_spending.toFixed(2),
      c.women_earnings.toFixed(2),
      c.profit.toFixed(2),
      c.user_count.toString(),
    ]);
    downloadCSV([headers, ...rows], `country_summary_${selectedMonth}.csv`);
    toast.success("Country summary exported");
  };

  const exportLanguageSummary = () => {
    const headers = ["Language", "Men Spending", "Women Earnings", "Profit", "User Count"];
    const rows = languageSummary.map(l => [
      l.language,
      l.men_spending.toFixed(2),
      l.women_earnings.toFixed(2),
      l.profit.toFixed(2),
      l.user_count.toString(),
    ]);
    downloadCSV([headers, ...rows], `language_summary_${selectedMonth}.csv`);
    toast.success("Language summary exported");
  };

  const downloadCSV = (data: string[][], filename: string) => {
    const csvContent = data.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Navigation */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Finance Reports
              </h1>
              <p className="text-muted-foreground text-sm">Monthly spending & earnings analysis - Real-time data</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-60">
                      <SelectItem value="all">All Countries</SelectItem>
                      {ALL_COUNTRIES.map(c => (
                        <SelectItem key={c.name} value={c.name}>{c.flag} {c.name}</SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-60">
                      <SelectItem value="all">All Languages</SelectItem>
                      {ALL_LANGUAGES.map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-male/10 rounded-lg">
                  <Users className="h-6 w-6 text-male" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Men</p>
                  <p className="text-2xl font-bold">{totals.totalMen}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-female/10 rounded-lg">
                  <Users className="h-6 w-6 text-female" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Women</p>
                  <p className="text-2xl font-bold">{totals.totalWomen}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Men Spending</p>
                  <p className="text-2xl font-bold">₹{totals.totalMenSpending.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <IndianRupee className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Women Earnings</p>
                  <p className="text-2xl font-bold">₹{totals.totalWomenEarnings.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={totals.totalProfit >= 0 ? "border-success/50" : "border-destructive/50"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${totals.totalProfit >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                  <DollarSign className={`h-6 w-6 ${totals.totalProfit >= 0 ? "text-success" : "text-destructive"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Platform Profit</p>
                  <p className={`text-2xl font-bold ${totals.totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
                    {totals.totalProfit >= 0 ? "+" : ""}₹{totals.totalProfit.toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending vs Earnings Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                6-Month Spending vs Earnings Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthLabel" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      formatter={(value: number) => [`₹${value.toFixed(2)}`, ""]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="menSpending"
                      name="Men Spending"
                      stroke="hsl(0, 84%, 60%)"
                      fill="hsl(0, 84%, 60%)"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="womenEarnings"
                      name="Women Earnings"
                      stroke="hsl(142, 76%, 36%)"
                      fill="hsl(142, 76%, 36%)"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chat vs Gift Spending */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Chat vs Gift Spending Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthLabel" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      formatter={(value: number) => [`₹${value.toFixed(2)}`, ""]}
                    />
                    <Legend />
                    <Bar dataKey="chatSpending" name="Chat Spending" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="giftSpending" name="Gift Spending" fill="hsl(316, 73%, 52%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Profit Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                6-Month Profit/Loss Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthLabel" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      formatter={(value: number) => [`₹${value.toFixed(2)}`, ""]}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Platform Profit"
                      stroke="hsl(142, 76%, 36%)"
                      fill="hsl(142, 76%, 36%)"
                      fillOpacity={0.4}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Wait Queue Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Queue by Country */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Chat Wait Queue by Country
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queueByCountry.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No users currently waiting in queue
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead className="text-right">Waiting</TableHead>
                        <TableHead className="text-right">Avg Wait</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueByCountry.map(q => (
                        <TableRow key={q.country}>
                          <TableCell className="font-medium">
                            <span className="mr-2">{q.flag}</span>
                            {q.country}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{q.waitingCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Timer className="h-3 w-3 text-muted-foreground" />
                              {formatWaitTime(q.avgWaitTime)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Queue by Language */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-secondary-foreground" />
                Chat Wait Queue by Language
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queueByLanguage.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No users currently waiting in queue
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Language</TableHead>
                        <TableHead className="text-right">Waiting</TableHead>
                        <TableHead className="text-right">Avg Wait</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueByLanguage.map(q => (
                        <TableRow key={q.language}>
                          <TableCell className="font-medium">{q.language}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{q.waitingCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Timer className="h-3 w-3 text-muted-foreground" />
                              {formatWaitTime(q.avgWaitTime)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="men" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="men">Men Spending</TabsTrigger>
            <TabsTrigger value="women">Women Earnings</TabsTrigger>
            <TabsTrigger value="country">By Country</TabsTrigger>
            <TabsTrigger value="language">By Language</TabsTrigger>
          </TabsList>

          {/* Men Spending Tab */}
          <TabsContent value="men">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Men Spending - {MONTHS.find(m => m.value === selectedMonth)?.label}</CardTitle>
                <Button onClick={exportMenSpending} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead className="text-right">Chat Spending</TableHead>
                      <TableHead className="text-right">Gift Spending</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menSpending.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No spending data for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      menSpending.map(m => (
                        <TableRow key={m.user_id}>
                          <TableCell className="font-medium">{m.full_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{m.country}</Badge>
                          </TableCell>
                          <TableCell>{m.language}</TableCell>
                          <TableCell className="text-right">₹{m.chat_spending.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{m.gift_spending.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold">₹{m.total_spent.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Women Earnings Tab */}
          <TabsContent value="women">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Women Earnings - {MONTHS.find(m => m.value === selectedMonth)?.label}</CardTitle>
                <Button onClick={exportWomenEarnings} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead className="text-right">Chat Earnings</TableHead>
                      <TableHead className="text-right">Gift Earnings</TableHead>
                      <TableHead className="text-right">Total Earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {womenEarnings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No earnings data for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      womenEarnings.map(w => (
                        <TableRow key={w.user_id}>
                          <TableCell className="font-medium">{w.full_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{w.country}</Badge>
                          </TableCell>
                          <TableCell>{w.language}</TableCell>
                          <TableCell className="text-right">₹{w.chat_earnings.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{w.gift_earnings.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-success">₹{w.total_earned.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Country Summary Tab */}
          <TabsContent value="country">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Country-wise Summary - {MONTHS.find(m => m.value === selectedMonth)?.label}</CardTitle>
                <Button onClick={exportCountrySummary} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Men Spending</TableHead>
                      <TableHead className="text-right">Women Earnings</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Users</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countrySummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No data for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      countrySummary.map(c => (
                        <TableRow key={c.country}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              {c.country}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">₹{c.men_spending.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{c.women_earnings.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-bold ${c.profit >= 0 ? "text-success" : "text-destructive"}`}>
                            {c.profit >= 0 ? "+" : ""}₹{c.profit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">{c.user_count}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Language Summary Tab */}
          <TabsContent value="language">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Language-wise Summary - {MONTHS.find(m => m.value === selectedMonth)?.label}</CardTitle>
                <Button onClick={exportLanguageSummary} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Language</TableHead>
                      <TableHead className="text-right">Men Spending</TableHead>
                      <TableHead className="text-right">Women Earnings</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Users</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {languageSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No data for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      languageSummary.map(l => (
                        <TableRow key={l.language}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Languages className="h-4 w-4 text-muted-foreground" />
                              {l.language}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">₹{l.men_spending.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{l.women_earnings.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-bold ${l.profit >= 0 ? "text-success" : "text-destructive"}`}>
                            {l.profit >= 0 ? "+" : ""}₹{l.profit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">{l.user_count}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminFinanceReports;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Users, TrendingUp, Globe, Languages, IndianRupee, Calendar, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
  user_count: number;
}

interface LanguageSummary {
  language: string;
  men_spending: number;
  women_earnings: number;
  user_count: number;
}

interface MonthlyTrend {
  month: string;
  monthLabel: string;
  menSpending: number;
  womenEarnings: number;
  chatSpending: number;
  giftSpending: number;
  activeUsers: number;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const date = subMonths(new Date(), i);
  return {
    value: format(date, "yyyy-MM"),
    label: format(date, "MMMM yyyy"),
  };
});

const AdminFinanceReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  
  const [menSpending, setMenSpending] = useState<MenSpending[]>([]);
  const [womenEarnings, setWomenEarnings] = useState<WomenEarning[]>([]);
  const [countrySummary, setCountrySummary] = useState<CountrySummary[]>([]);
  const [languageSummary, setLanguageSummary] = useState<LanguageSummary[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  
  const [totals, setTotals] = useState({
    totalMenSpending: 0,
    totalWomenEarnings: 0,
    totalMen: 0,
    totalWomen: 0,
  });

  useEffect(() => {
    loadReportData();
    loadTrendData();
  }, [selectedMonth, selectedCountry, selectedLanguage]);

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
        const existing = countryMap.get(m.country) || { country: m.country, men_spending: 0, women_earnings: 0, user_count: 0 };
        existing.men_spending += m.total_spent;
        existing.user_count += 1;
        countryMap.set(m.country, existing);
      });
      womenList.forEach(w => {
        const existing = countryMap.get(w.country) || { country: w.country, men_spending: 0, women_earnings: 0, user_count: 0 };
        existing.women_earnings += w.total_earned;
        existing.user_count += 1;
        countryMap.set(w.country, existing);
      });

      // Calculate language summary
      const langMap = new Map<string, LanguageSummary>();
      menList.forEach(m => {
        const existing = langMap.get(m.language) || { language: m.language, men_spending: 0, women_earnings: 0, user_count: 0 };
        existing.men_spending += m.total_spent;
        existing.user_count += 1;
        langMap.set(m.language, existing);
      });
      womenList.forEach(w => {
        const existing = langMap.get(w.language) || { language: w.language, men_spending: 0, women_earnings: 0, user_count: 0 };
        existing.women_earnings += w.total_earned;
        existing.user_count += 1;
        langMap.set(w.language, existing);
      });

      // Get unique countries and languages for filters
      const allCountries = new Set<string>();
      const allLanguages = new Set<string>();
      profiles?.forEach(p => {
        if (p.country) allCountries.add(p.country);
        if (p.primary_language) allLanguages.add(p.primary_language);
      });

      setCountries(Array.from(allCountries).sort());
      setLanguages(Array.from(allLanguages).sort());
      setMenSpending(menList);
      setWomenEarnings(womenList);
      setCountrySummary(Array.from(countryMap.values()).sort((a, b) => b.men_spending - a.men_spending));
      setLanguageSummary(Array.from(langMap.values()).sort((a, b) => b.men_spending - a.men_spending));
      
      setTotals({
        totalMenSpending: menList.reduce((sum, m) => sum + m.total_spent, 0),
        totalWomenEarnings: womenList.reduce((sum, w) => sum + w.total_earned, 0),
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
    const headers = ["Country", "Men Spending", "Women Earnings", "User Count"];
    const rows = countrySummary.map(c => [
      c.country,
      c.men_spending.toFixed(2),
      c.women_earnings.toFixed(2),
      c.user_count.toString(),
    ]);
    downloadCSV([headers, ...rows], `country_summary_${selectedMonth}.csv`);
    toast.success("Country summary exported");
  };

  const exportLanguageSummary = () => {
    const headers = ["Language", "Men Spending", "Women Earnings", "User Count"];
    const rows = languageSummary.map(l => [
      l.language,
      l.men_spending.toFixed(2),
      l.women_earnings.toFixed(2),
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
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/finance")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Finance Reports</h1>
              <p className="text-muted-foreground">Monthly spending & earnings analysis</p>
            </div>
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
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
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
                    <SelectItem value="all">All Languages</SelectItem>
                    {languages.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-blue-500" />
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
                <div className="p-3 bg-pink-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-pink-500" />
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
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-red-500" />
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
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <IndianRupee className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Women Earnings</p>
                  <p className="text-2xl font-bold">₹{totals.totalWomenEarnings.toFixed(0)}</p>
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
                          <TableCell className="text-right font-bold text-green-600">₹{w.total_earned.toFixed(2)}</TableCell>
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
                      <TableHead className="text-right">Users</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countrySummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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
                          <TableCell className="text-right text-red-600">₹{c.men_spending.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-green-600">₹{c.women_earnings.toFixed(2)}</TableCell>
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
                      <TableHead className="text-right">Users</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {languageSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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
                          <TableCell className="text-right text-red-600">₹{l.men_spending.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-green-600">₹{l.women_earnings.toFixed(2)}</TableCell>
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

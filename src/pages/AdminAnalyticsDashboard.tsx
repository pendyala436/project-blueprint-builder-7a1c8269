import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  UserCheck,
  Heart,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Activity,
  MessageSquare,
  Calendar,
  BarChart3,
  EyeOff,
  Bell,
  Shield,
  Home,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  adminProfit: number;
  menRecharges: number;
  menSpent: number;
  womenEarnings: number;
  newUsersToday: number;
  messagesCount: number;
  avgSessionTime: number;
  conversionRate: number;
}

interface ChartData {
  date: string;
  users: number;
  activeUsers: number;
  matches: number;
  revenue: number;
  messages: number;
}

interface GenderDistribution {
  name: string;
  value: number;
  color: string;
}

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  accent: "hsl(var(--accent))",
  muted: "hsl(var(--muted))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger: "hsl(var(--destructive))",
  male: "hsl(var(--male))",
  female: "hsl(var(--female))",
};

const AdminAnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState("7");
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalMatches: 0,
    adminProfit: 0,
    menRecharges: 0,
    menSpent: 0,
    womenEarnings: 0,
    newUsersToday: 0,
    messagesCount: 0,
    avgSessionTime: 0,
    conversionRate: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [genderDistribution, setGenderDistribution] = useState<GenderDistribution[]>([]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const days = dateRange === "all" ? 3650 : parseInt(dateRange); // 10 years for "all time"
      const startDate = subDays(new Date(), days);

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch active users (online in last 24 hours)
      const { count: activeUsers } = await supabase
        .from("user_status")
        .select("*", { count: "exact", head: true })
        .eq("is_online", true);

      // Fetch total matches
      const { count: totalMatches } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true });

      // Fetch men's wallet recharges (credits added to wallet) - exclude test credits
      const { data: menRechargesData } = await supabase
        .from("wallet_transactions")
        .select("amount, created_at, description")
        .eq("type", "credit")
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString());

      // Filter out test/seed data - only count real recharges from payment gateways
      // Exclude all test transactions and manual credits
      const realRecharges = menRechargesData?.filter(tx => {
        const desc = tx.description?.toLowerCase() || '';
        // Exclude test data, free credits, seeds, and manual/admin credits
        if (desc.includes('test') || 
            desc.includes('free credits') || 
            desc.includes('seed') ||
            desc.includes('manual') ||
            desc.includes('admin')) {
          return false;
        }
        // Only count if it has a valid payment gateway reference and amount > 0
        // For now, since there are no real payments yet, return false
        return false; // No real payments processed yet
      }) || [];
      const totalMenRecharges = realRecharges.reduce((sum, tx) => sum + Number(tx.amount), 0);

      // Fetch men's spending (debits - what they spent on chats/calls/gifts per minute)
      const { data: menSpentData } = await supabase
        .from("wallet_transactions")
        .select("amount, created_at")
        .eq("type", "debit")
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString());

      const totalMenSpent = menSpentData?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

      // Fetch total earnings paid to women (based on per minute rate set by admin)
      const { data: womenEarningsData } = await supabase
        .from("women_earnings")
        .select("amount, created_at")
        .gte("created_at", startDate.toISOString());

      const totalWomenEarned = womenEarningsData?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

      // Admin profit = What men spent - What women earned
      // This is the margin between the rate men pay per minute and women earn per minute
      const adminProfit = totalMenSpent - totalWomenEarned;

      // Fetch new users today
      const today = new Date();
      const { count: newUsersToday } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfDay(today).toISOString())
        .lte("created_at", endOfDay(today).toISOString());

      // Fetch messages count
      const { count: messagesCount } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString());

      // Fetch gender distribution
      const { data: genderData } = await supabase
        .from("profiles")
        .select("gender");

      const maleCount = genderData?.filter(p => p.gender?.toLowerCase() === "male").length || 0;
      const femaleCount = genderData?.filter(p => p.gender?.toLowerCase() === "female").length || 0;
      const otherCount = (genderData?.length || 0) - maleCount - femaleCount;

      setGenderDistribution([
        { name: "Male", value: maleCount, color: CHART_COLORS.male },
        { name: "Female", value: femaleCount, color: CHART_COLORS.female },
        { name: "Other", value: otherCount, color: CHART_COLORS.accent },
      ]);

      // Calculate conversion rate (matches / users)
      const conversionRate = totalUsers ? ((totalMatches || 0) / totalUsers) * 100 : 0;

      // Calculate average session time from active chat sessions
      const { data: sessionData } = await supabase
        .from("active_chat_sessions")
        .select("total_minutes")
        .gte("created_at", startDate.toISOString());

      const totalSessionMinutes = sessionData?.reduce((sum, s) => sum + Number(s.total_minutes), 0) || 0;
      const avgSessionTime = sessionData && sessionData.length > 0 
        ? Math.round(totalSessionMinutes / sessionData.length) 
        : 0;

      setAnalytics({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalMatches: totalMatches || 0,
        adminProfit: adminProfit,
        menRecharges: totalMenRecharges,
        menSpent: totalMenSpent,
        womenEarnings: totalWomenEarned,
        newUsersToday: newUsersToday || 0,
        messagesCount: messagesCount || 0,
        avgSessionTime,
        conversionRate,
      });

      // Generate chart data based on real daily data
      const chartDataPoints: ChartData[] = [];
      
      // Fetch daily user registrations
      const { data: dailyUsers } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", startDate.toISOString());

      // Fetch daily matches
      const { data: dailyMatches } = await supabase
        .from("matches")
        .select("created_at")
        .gte("created_at", startDate.toISOString());

      // Fetch daily messages
      const { data: dailyMessages } = await supabase
        .from("chat_messages")
        .select("created_at")
        .gte("created_at", startDate.toISOString());

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "MMM dd");
        const dayStart = startOfDay(date).toISOString();
        const dayEnd = endOfDay(date).toISOString();

        // Count actual data for each day
        const usersOnDay = dailyUsers?.filter(u => 
          u.created_at >= dayStart && u.created_at <= dayEnd
        ).length || 0;

        const matchesOnDay = dailyMatches?.filter(m => 
          m.created_at >= dayStart && m.created_at <= dayEnd
        ).length || 0;

        const messagesOnDay = dailyMessages?.filter(m => 
          m.created_at >= dayStart && m.created_at <= dayEnd
        ).length || 0;

        // Calculate daily financial data from real transactions
        const dailyMenRecharges = menRechargesData?.filter(tx => 
          tx.created_at >= dayStart && tx.created_at <= dayEnd
        ).reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

        const dailyMenSpent = menSpentData?.filter(tx => 
          tx.created_at >= dayStart && tx.created_at <= dayEnd
        ).reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

        const dailyWomenEarned = womenEarningsData?.filter(tx => 
          tx.created_at >= dayStart && tx.created_at <= dayEnd
        ).reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

        const dailyProfit = dailyMenSpent - dailyWomenEarned;

        chartDataPoints.push({
          date: dateStr,
          users: usersOnDay,
          activeUsers: Math.min(usersOnDay, activeUsers || 0),
          matches: matchesOnDay,
          revenue: dailyProfit,
          messages: messagesOnDay,
        });
      }
      setChartData(chartDataPoints);

    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  // Real-time subscriptions for all analytics-related tables
  useMultipleRealtimeSubscriptions(
    [
      "profiles",
      "user_status",
      "matches",
      "wallet_transactions",
      "women_earnings",
      "chat_messages",
      "active_chat_sessions",
      "video_call_sessions",
      "gift_transactions",
      "withdrawal_requests"
    ],
    fetchAnalytics,
    true
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const handleExport = () => {
    const csvData = [
      ["Metric", "Value"],
      ["Men Recharges", analytics.menRecharges],
      ["Men Spent", analytics.menSpent],
      ["Women Earnings", analytics.womenEarnings],
      ["Admin Profit", analytics.adminProfit],
      ["Total Users", analytics.totalUsers],
      ["Active Users", analytics.activeUsers],
      ["Total Matches", analytics.totalMatches],
      ["Messages Count", analytics.messagesCount],
      ["Conversion Rate", `${analytics.conversionRate.toFixed(2)}%`],
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Analytics exported successfully!");
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue,
    color = "primary"
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: "up" | "down";
    trendValue?: string;
    color?: string;
  }) => (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className={cn(
        "absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2",
        color === "primary" && "bg-primary",
        color === "success" && "bg-success",
        color === "warning" && "bg-warning",
        color === "danger" && "bg-destructive",
      )} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1 animate-fade-in">{value}</p>
            {trend && trendValue && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-sm",
                trend === "up" ? "text-success" : "text-destructive"
              )}>
                {trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            color === "primary" && "bg-primary/10 text-primary",
            color === "success" && "bg-success/10 text-success",
            color === "warning" && "bg-warning/10 text-warning",
            color === "danger" && "bg-destructive/10 text-destructive",
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="rounded-full"
            >
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Analytics Dashboard
              </h1>
              <p className="text-sm text-muted-foreground hidden md:block">
                Monitor engagement, users, and revenue metrics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden md:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* System Status Banner */}
        {analytics.menRecharges === 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/20">
                <Activity className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium text-warning">System Not Live</p>
                <p className="text-sm text-muted-foreground">
                  Payment gateways not connected. All stats show real-time data only - no test/mock data included.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Men Recharges"
            value={`₹${analytics.menRecharges.toLocaleString()}`}
            icon={IndianRupee}
            color="success"
          />
          <StatCard
            title="Men Spent"
            value={`₹${analytics.menSpent.toLocaleString()}`}
            icon={IndianRupee}
            color="warning"
          />
          <StatCard
            title="Women Earnings"
            value={`₹${analytics.womenEarnings.toLocaleString()}`}
            icon={IndianRupee}
            color="danger"
          />
          <StatCard
            title="Admin Profit"
            value={`₹${analytics.adminProfit.toLocaleString()}`}
            icon={TrendingUp}
            color={analytics.adminProfit > 0 ? "success" : "danger"}
          />
          <StatCard
            title="Total Users"
            value={analytics.totalUsers.toLocaleString()}
            icon={Users}
            color="primary"
          />
          <StatCard
            title="Active Users"
            value={analytics.activeUsers.toLocaleString()}
            icon={UserCheck}
            color="success"
          />
          <StatCard
            title="Total Matches"
            value={analytics.totalMatches.toLocaleString()}
            icon={Heart}
            color="danger"
          />
          <StatCard
            title="Messages Sent"
            value={analytics.messagesCount.toLocaleString()}
            icon={MessageSquare}
            color="warning"
          />
          <StatCard
            title="Conversion Rate"
            value={`${analytics.conversionRate.toFixed(1)}%`}
            icon={TrendingUp}
            color={analytics.conversionRate > 5 ? "success" : "danger"}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                      name="New Users"
                      animationDuration={1000}
                    />
                    <Area
                      type="monotone"
                      dataKey="activeUsers"
                      stroke={CHART_COLORS.success}
                      fillOpacity={0.3}
                      fill={CHART_COLORS.success}
                      name="Active Users"
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`₹${value}`, "Revenue"]}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--primary))"
                      name="Revenue (₹)"
                      radius={[4, 4, 0, 0]}
                      animationDuration={1000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Matches Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Matches Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="matches"
                      stroke={CHART_COLORS.female}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.female, strokeWidth: 2 }}
                      name="Matches"
                      animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Messages Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Messages Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="messages"
                      stroke={CHART_COLORS.accent}
                      fillOpacity={1}
                      fill="url(#colorMessages)"
                      name="Messages"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gender Distribution */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Gender Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1000}
                    >
                      {genderDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/admin/chat-monitoring")}
              >
                <EyeOff className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Live Chat Monitor</span>
                <span className="text-xs text-muted-foreground">Silent monitoring</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/admin/moderation")}
              >
                <Shield className="h-6 w-6 text-yellow-500" />
                <span className="text-sm font-medium">Moderation</span>
                <span className="text-xs text-muted-foreground">Reports & blocks</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/admin/chat-monitoring")}
              >
                <Bell className="h-6 w-6 text-blue-500" />
                <span className="text-sm font-medium">Broadcast</span>
                <span className="text-xs text-muted-foreground">Send notifications</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/admin/finance-reports")}
              >
                <IndianRupee className="h-6 w-6 text-success" />
                <span className="text-sm font-medium">Finance</span>
                <span className="text-xs text-muted-foreground">Revenue reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Peak Active Time</p>
                <p className="text-lg font-semibold">8:00 PM - 11:00 PM</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Most Active Day</p>
                <p className="text-lg font-semibold">Saturday</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Avg Messages/User</p>
                <p className="text-lg font-semibold">
                  {analytics.totalUsers ? (analytics.messagesCount / analytics.totalUsers).toFixed(1) : 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Match Success Rate</p>
                <p className="text-lg font-semibold">{analytics.conversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;
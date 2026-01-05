import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { 
  ArrowLeft, 
  TrendingUp, 
  Wallet, 
  CreditCard,
  Download,
  RefreshCw,
  IndianRupee,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  FileText,
  Home
} from "lucide-react";

interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
}

interface GiftTransaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  gift_id: string;
  price_paid: number;
  currency: string;
  status: string;
  created_at: string;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  transactions: number;
}

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const AdminFinanceDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [giftTransactions, setGiftTransactions] = useState<GiftTransaction[]>([]);
  const [totalWallets, setTotalWallets] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<{ name: string; value: number }[]>([]);

  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    try {
      const days = dateRange === "all" ? 3650 : parseInt(dateRange); // 10 years for "all time"
      const startDate = startOfDay(subDays(new Date(), days)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();
      // Load wallet transactions
      const { data: walletTxns, error: walletError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (walletError) throw walletError;
      setWalletTransactions(walletTxns || []);

      // Load gift transactions
      const { data: giftTxns, error: giftError } = await supabase
        .from("gift_transactions")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (giftError) throw giftError;
      setGiftTransactions(giftTxns || []);

      // Load wallet stats
      const { data: wallets, error: walletsError } = await supabase
        .from("wallets")
        .select("id, balance");

      if (walletsError) throw walletsError;
      setTotalWallets(wallets?.length || 0);
      setTotalBalance(wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0);

      // Calculate daily revenue
      const revenueByDay: Record<string, { revenue: number; transactions: number }> = {};
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        revenueByDay[date] = { revenue: 0, transactions: 0 };
      }

      // Add wallet transaction credits as revenue (exclude test/seed data)
      walletTxns?.forEach((txn) => {
        if (txn.type === "credit" && txn.status === "completed") {
          // Skip test/seed data
          const desc = (txn.description || '').toLowerCase();
          if (desc.includes('test') || desc.includes('free credits') || desc.includes('seed')) {
            return;
          }
          const date = format(new Date(txn.created_at), "yyyy-MM-dd");
          if (revenueByDay[date]) {
            revenueByDay[date].revenue += Number(txn.amount);
            revenueByDay[date].transactions += 1;
          }
        }
      });

      // Add gift transactions as revenue
      giftTxns?.forEach((txn) => {
        if (txn.status === "completed") {
          const date = format(new Date(txn.created_at), "yyyy-MM-dd");
          if (revenueByDay[date]) {
            revenueByDay[date].revenue += Number(txn.price_paid);
            revenueByDay[date].transactions += 1;
          }
        }
      });

      const dailyData = Object.entries(revenueByDay).map(([date, data]) => ({
        date: format(new Date(date), "MMM d"),
        revenue: data.revenue,
        transactions: data.transactions,
      }));
      setDailyRevenue(dailyData);

      // Calculate transaction type distribution
      const typeCount: Record<string, number> = {};
      walletTxns?.forEach((txn) => {
        const type = txn.type || "other";
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      giftTxns?.forEach(() => {
        typeCount["gift"] = (typeCount["gift"] || 0) + 1;
      });
      setTransactionTypes(Object.entries(typeCount).map(([name, value]) => ({ name, value })));

    } catch (error) {
      console.error("Error loading finance data:", error);
      toast({
        title: "Error",
        description: "Failed to load finance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  // Real-time subscriptions for finance data
  useMultipleRealtimeSubscriptions(
    ["wallet_transactions", "gift_transactions", "wallets", "women_earnings", "withdrawal_requests"],
    loadFinanceData,
    true
  );

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const exportCSV = () => {
    // Combine all transactions for export
    const allTransactions = [
      ...walletTransactions.map((t) => ({
        type: "wallet",
        transaction_type: t.type,
        amount: t.amount,
        status: t.status,
        description: t.description,
        user_id: t.user_id,
        created_at: t.created_at,
      })),
      ...giftTransactions.map((t) => ({
        type: "gift",
        transaction_type: "gift_purchase",
        amount: t.price_paid,
        status: t.status,
        description: `Gift from ${t.sender_id.slice(0, 8)} to ${t.receiver_id.slice(0, 8)}`,
        user_id: t.sender_id,
        created_at: t.created_at,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Generate CSV
    const headers = ["Type", "Transaction Type", "Amount", "Status", "Description", "User ID", "Date"];
    const rows = allTransactions.map((t) => [
      t.type,
      t.transaction_type,
      t.amount,
      t.status,
      t.description || "",
      t.user_id,
      format(new Date(t.created_at), "yyyy-MM-dd HH:mm:ss"),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Success", description: "CSV exported successfully" });
  };

  const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0);
  const totalTransactions = walletTransactions.length + giftTransactions.length;
  const giftRevenue = giftTransactions.reduce((sum, t) => sum + Number(t.price_paid), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
              >
                <Home className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Finance Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={loadFinanceData} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={exportCSV} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => navigate("/admin/finance-reports")} className="gap-2">
                <FileText className="h-4 w-4" />
                Monthly Reports
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* System Status Banner */}
        {totalRevenue === 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">System Not Live</p>
                <p className="text-sm text-muted-foreground">
                  Payment gateways are not connected. All financial stats show real-time data - currently ₹0 as no actual recharges have occurred.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-5 w-5" />
                    {totalRevenue.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Real transactions only</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "50ms" }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gift Revenue</p>
                  <p className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-5 w-5" />
                    {giftRevenue.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">From gift transactions</p>
                </div>
                <div className="p-3 bg-pink-500/10 rounded-full">
                  <Gift className="h-6 w-6 text-pink-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "100ms" }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Wallets</p>
                  <p className="text-2xl font-bold">{totalWallets}</p>
                  <p className="text-xs text-muted-foreground mt-1">User wallet count</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Wallet className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "150ms" }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-5 w-5" />
                    {totalBalance.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Sum of all wallets</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <CreditCard className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="md:col-span-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "200ms" }}>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyRevenue}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fill="url(#revenueGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Type Distribution */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "250ms" }}>
            <CardHeader>
              <CardTitle>Transaction Types</CardTitle>
              <CardDescription>Distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={transactionTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {transactionTypes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {transactionTypes.map((type, index) => (
                  <Badge
                    key={type.name}
                    variant="outline"
                    className="gap-1"
                    style={{ borderColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    {type.name}: {type.value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Volume Chart */}
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <CardTitle>Transaction Volume</CardTitle>
            <CardDescription>Number of transactions per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="transactions" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "350ms" }}>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest {Math.min(totalTransactions, 20)} transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...walletTransactions.slice(0, 10).map((t) => ({
                    id: t.id,
                    type: t.type,
                    amount: t.amount,
                    status: t.status,
                    description: t.description,
                    created_at: t.created_at,
                    isGift: false,
                  })), ...giftTransactions.slice(0, 10).map((t) => ({
                    id: t.id,
                    type: "gift",
                    amount: t.price_paid,
                    status: t.status,
                    description: "Gift purchase",
                    created_at: t.created_at,
                    isGift: true,
                  }))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20).map((txn, index) => (
                    <TableRow 
                      key={txn.id}
                      className="animate-in fade-in slide-in-from-left-2 duration-200"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {txn.type === "credit" ? (
                            <ArrowDownRight className="h-4 w-4 text-green-500" />
                          ) : txn.type === "debit" ? (
                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                          ) : (
                            <Gift className="h-4 w-4 text-pink-500" />
                          )}
                          <span className="capitalize">{txn.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${txn.type === "credit" ? "text-green-600" : txn.type === "debit" ? "text-red-600" : "text-pink-600"}`}>
                          {txn.type === "credit" ? "+" : txn.type === "debit" ? "-" : ""}₹{Number(txn.amount).toLocaleString("en-IN")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={txn.status === "completed" ? "default" : "secondary"}>
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {txn.description || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(txn.created_at), "MMM d, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {totalTransactions === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No transactions found in this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminFinanceDashboard;

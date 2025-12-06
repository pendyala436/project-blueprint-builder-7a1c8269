import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  IndianRupee, 
  Wallet,
  TrendingUp,
  Clock,
  ArrowDownToLine,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Earning {
  id: string;
  amount: number;
  earning_type: string;
  description: string | null;
  created_at: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
}

interface ChatPricing {
  min_withdrawal_balance: number;
}

const WomenWalletScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [minWithdrawal, setMinWithdrawal] = useState(10000);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      // Fetch pricing config
      const { data: pricing } = await supabase
        .from("chat_pricing")
        .select("min_withdrawal_balance")
        .eq("is_active", true)
        .maybeSingle();

      if (pricing) {
        setMinWithdrawal(pricing.min_withdrawal_balance);
      }

      // Fetch earnings
      const { data: earningsData } = await supabase
        .from("women_earnings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setEarnings(earningsData || []);
      const total = earningsData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      setTotalEarnings(total);

      // Fetch withdrawal requests
      const { data: withdrawalsData } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setWithdrawals(withdrawalsData || []);
      const pending = withdrawalsData
        ?.filter(w => w.status === "pending" || w.status === "approved")
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      setPendingWithdrawals(pending);

      // Calculate completed withdrawals
      const completed = withdrawalsData
        ?.filter(w => w.status === "completed")
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      setAvailableBalance(total - pending - completed);

    } catch (error) {
      console.error("Error loading wallet data:", error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    if (amount > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this withdrawal",
        variant: "destructive"
      });
      return;
    }

    if (availableBalance < minWithdrawal) {
      toast({
        title: "Minimum Not Met",
        description: `You need at least ₹${minWithdrawal.toLocaleString()} to withdraw`,
        variant: "destructive"
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: user.id,
          amount: amount,
          payment_method: paymentMethod,
          status: "pending"
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your withdrawal request has been submitted for approval"
      });

      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      setPaymentMethod("");
      loadData();
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const canWithdraw = availableBalance >= minWithdrawal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">My Wallet</h1>
            <p className="text-sm text-muted-foreground">Earnings & Withdrawals</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/20">
                <Wallet className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-xl font-bold">₹{availableBalance.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Earned</p>
                <p className="text-xl font-bold">₹{totalEarnings.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Withdraw Button */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Withdraw Funds</h3>
              <p className="text-sm text-muted-foreground">
                {canWithdraw 
                  ? "Request a withdrawal to your bank account"
                  : `Minimum balance: ₹${minWithdrawal.toLocaleString()}`
                }
              </p>
            </div>
            <Button 
              onClick={() => setWithdrawDialogOpen(true)}
              disabled={!canWithdraw}
              className="gap-2"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Withdraw
            </Button>
          </div>
          {!canWithdraw && (
            <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-sm text-amber-600">
                You need ₹{(minWithdrawal - availableBalance).toLocaleString()} more to withdraw
              </p>
            </div>
          )}
        </Card>

        {/* Tabs for History */}
        <Tabs defaultValue="earnings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="earnings" className="gap-2">
              <IndianRupee className="h-4 w-4" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-2">
              <History className="h-4 w-4" />
              Withdrawals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-3">
            {earnings.length === 0 ? (
              <Card className="p-8 text-center">
                <IndianRupee className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No earnings yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start chatting to earn money!
                </p>
              </Card>
            ) : (
              earnings.map((earning) => (
                <Card key={earning.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium capitalize">{earning.earning_type} Earning</p>
                      <p className="text-sm text-muted-foreground">
                        {earning.description || "Chat earnings"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(earning.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-500">
                      +₹{Number(earning.amount).toFixed(2)}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-3">
            {withdrawals.length === 0 ? (
              <Card className="p-8 text-center">
                <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No withdrawal requests</p>
              </Card>
            ) : (
              withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Withdrawal Request</p>
                        {getStatusBadge(withdrawal.status)}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        via {withdrawal.payment_method || "Bank Transfer"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(withdrawal.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                      {withdrawal.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">
                          Reason: {withdrawal.rejection_reason}
                        </p>
                      )}
                    </div>
                    <p className="text-lg font-bold">
                      ₹{Number(withdrawal.amount).toLocaleString()}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Request Withdrawal
            </DialogTitle>
            <DialogDescription>
              Available balance: ₹{availableBalance.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (INR)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  className="pl-10"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  max={availableBalance}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="paytm">Paytm Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full" 
              onClick={handleWithdraw}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WomenWalletScreen;

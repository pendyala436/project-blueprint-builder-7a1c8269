import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { 
  IndianRupee, 
  Wallet,
  TrendingUp,
  Clock,
  ArrowDownToLine,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  Zap,
  Building2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAtomicTransaction } from "@/hooks/useAtomicTransaction";
import NavigationHeader from "@/components/NavigationHeader";

interface PayoutMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  regions: string;
  color: string;
}

const PAYOUT_METHODS: PayoutMethod[] = [
  {
    id: "payoneer",
    name: "Payoneer",
    description: "Global payout for all countries",
    icon: <Globe className="h-5 w-5" />,
    features: ["200+ countries", "Multi-currency", "Low fees"],
    regions: "Worldwide",
    color: "from-orange-500/10 to-orange-500/5 border-orange-500/20"
  },
  {
    id: "wise",
    name: "Wise",
    description: "Fast & cheap international transfers",
    icon: <Zap className="h-5 w-5" />,
    features: ["Best exchange rates", "Fast transfers", "Transparent fees"],
    regions: "Worldwide",
    color: "from-green-500/10 to-green-500/5 border-green-500/20"
  },
  {
    id: "cashfree",
    name: "Cashfree",
    description: "Instant INR payout for India",
    icon: <Building2 className="h-5 w-5" />,
    features: ["Instant UPI", "Bank transfer", "IMPS/NEFT"],
    regions: "India Only",
    color: "from-purple-500/10 to-purple-500/5 border-purple-500/20"
  }
];

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
  const { t, translateDynamicBatch, currentLanguage } = useTranslation();
  const { requestWithdrawal, isProcessing: transactionProcessing } = useAtomicTransaction();
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setCurrentUserId(user.id);

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
        title: t('error', 'Error'),
        description: t('failedToLoadWallet', 'Failed to load wallet data'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time subscriptions
  useRealtimeSubscription({
    table: "women_earnings",
    onUpdate: loadData
  });

  useRealtimeSubscription({
    table: "withdrawal_requests",
    onUpdate: loadData
  });

  useRealtimeSubscription({
    table: "chat_pricing",
    onUpdate: loadData
  });
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: t('invalidAmount', 'Invalid Amount'),
        description: t('pleaseEnterValidAmount', 'Please enter a valid amount'),
        variant: "destructive"
      });
      return;
    }

    if (amount > availableBalance) {
      toast({
        title: t('insufficientBalance', 'Insufficient Balance'),
        description: t('youNeedMore', "You don't have enough balance for this withdrawal"),
        variant: "destructive"
      });
      return;
    }

    if (availableBalance < minWithdrawal) {
      toast({
        title: t('minimumNotMet', 'Minimum Not Met'),
        description: `${t('youNeedMore', 'You need at least')} ₹${minWithdrawal.toLocaleString()} ${t('withdraw', 'to withdraw')}`,
        variant: "destructive"
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: t('paymentMethodRequired', 'Payment Method Required'),
        description: t('pleaseSelectPaymentMethod', 'Please select a payment method'),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!currentUserId) {
        toast({
          title: t('error', 'Error'),
          description: t('notLoggedIn', 'Not logged in'),
          variant: "destructive"
        });
        return;
      }

      // Use ACID-compliant atomic transaction for withdrawal
      const result = await requestWithdrawal(currentUserId, amount, paymentMethod);
      
      if (!result.success) {
        toast({
          title: t('error', 'Error'),
          description: result.error || t('failedToSubmitWithdrawal', 'Failed to submit withdrawal request'),
          variant: "destructive"
        });
        return;
      }

      toast({
        title: t('requestSubmitted', 'Request Submitted'),
        description: t('withdrawalRequestSubmitted', 'Your withdrawal request has been submitted for approval')
      });

      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      setPaymentMethod("");
      loadData();
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast({
        title: t('error', 'Error'),
        description: t('failedToSubmitWithdrawal', 'Failed to submit withdrawal request'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warningOutline"><Clock className="h-3 w-3 mr-1" /> {t('pending', 'Pending')}</Badge>;
      case "approved":
        return <Badge variant="infoOutline"><CheckCircle2 className="h-3 w-3 mr-1" /> {t('approved', 'Approved')}</Badge>;
      case "completed":
        return <Badge variant="successOutline"><CheckCircle2 className="h-3 w-3 mr-1" /> {t('completed', 'Completed')}</Badge>;
      case "rejected":
        return <Badge variant="destructiveOutline"><XCircle className="h-3 w-3 mr-1" /> {t('rejected', 'Rejected')}</Badge>;
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
        <div className="max-w-4xl mx-auto px-6 py-2">
          <NavigationHeader
            title={t('myWallet', 'My Wallet')}
            showBack={true}
            showHome={true}
            showForward={false}
            homePath="/women-dashboard"
            rightContent={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/transaction-history")}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                History
              </Button>
            }
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Section 1: Balance Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-success/20">
                <Wallet className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('availableBalance', 'Available Balance')}</p>
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
                <p className="text-xs text-muted-foreground">{t('totalEarned', 'Total Earned')}</p>
                <p className="text-xl font-bold">₹{totalEarnings.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 2: Pending Withdrawals Info */}
        {pendingWithdrawals > 0 && (
          <Card className="p-4 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-warning/20">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('pendingWithdrawals', 'Pending Withdrawals')}</p>
                <p className="text-xl font-bold text-warning">₹{pendingWithdrawals.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Section 3: Withdraw Action */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t('withdrawFunds', 'Withdraw Funds')}</h3>
              <p className="text-sm text-muted-foreground">
                {canWithdraw 
                  ? t('requestWithdrawal', 'Request a withdrawal to your bank account')
                  : `${t('minimumBalance', 'Minimum balance')}: ₹${minWithdrawal.toLocaleString()}`
                }
              </p>
            </div>
            <Button 
              onClick={() => setWithdrawDialogOpen(true)}
              disabled={!canWithdraw}
              className="gap-2"
            >
              <ArrowDownToLine className="h-4 w-4" />
              {t('withdraw', 'Withdraw')}
            </Button>
          </div>
          {!canWithdraw && (
            <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
              <p className="text-sm text-warning">
                {t('youNeedMore', 'You need')} ₹{(minWithdrawal - availableBalance).toLocaleString()} {t('more', 'more')} {t('withdraw', 'to withdraw')}
              </p>
            </div>
          )}
        </Card>

        {/* Section 4: Transaction History Tabs */}
        <Tabs defaultValue="earnings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="earnings" className="gap-2">
              <IndianRupee className="h-4 w-4" />
              {t('earnings', 'Earnings')}
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-2">
              <History className="h-4 w-4" />
              {t('withdrawals', 'Withdrawals')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-3">
            {earnings.length === 0 ? (
              <Card className="p-8 text-center">
                <IndianRupee className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('noEarningsYet', 'No earnings yet')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('startChattingToEarn', 'Start chatting to earn money!')}
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
                <p className="text-muted-foreground">{t('noWithdrawalRequests', 'No withdrawal requests')}</p>
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
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        via {PAYOUT_METHODS.find(m => m.id === withdrawal.payment_method)?.name || withdrawal.payment_method || "Bank Transfer"}
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

            <div className="space-y-3">
              <Label>Choose Payout Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                {PAYOUT_METHODS.map((method) => (
                  <div key={method.id} className="relative">
                    <RadioGroupItem
                      value={method.id}
                      id={`payout-${method.id}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`payout-${method.id}`}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        `bg-gradient-to-br ${method.color}`,
                        "hover:shadow-md",
                        paymentMethod === method.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        method.id === "payoneer" && "bg-orange-500/20 text-orange-600",
                        method.id === "wise" && "bg-green-500/20 text-green-600",
                        method.id === "cashfree" && "bg-purple-500/20 text-purple-600"
                      )}>
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{method.name}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {method.regions}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {method.features.map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px]">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {paymentMethod === method.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary absolute top-2 right-2" />
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button 
              className="w-full" 
              onClick={handleWithdraw}
              disabled={isSubmitting || !paymentMethod}
            >
              {isSubmitting ? "Submitting..." : "Submit Withdrawal Request"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Minimum withdrawal: ₹{minWithdrawal.toLocaleString()} • Processing: 1-3 business days
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WomenWalletScreen;

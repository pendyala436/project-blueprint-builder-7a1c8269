import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  RefreshCw,
  CreditCard,
  History,
  IndianRupee,
  DollarSign,
  Euro,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WalletData {
  id: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
}

interface PaymentGateway {
  id: string;
  name: string;
  logo: string;
  description: string;
  supportedCurrencies: string[];
}

const PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: "razorpay",
    name: "Razorpay",
    logo: "🇮🇳",
    description: "UPI, Cards, Netbanking",
    supportedCurrencies: ["INR"]
  },
  {
    id: "paytm",
    name: "Paytm",
    logo: "💳",
    description: "Paytm Wallet, UPI",
    supportedCurrencies: ["INR"]
  },
  {
    id: "stripe",
    name: "Stripe",
    logo: "💎",
    description: "Cards, Apple Pay, Google Pay",
    supportedCurrencies: ["USD", "EUR", "GBP", "INR"]
  },
  {
    id: "paypal",
    name: "PayPal",
    logo: "🅿️",
    description: "PayPal Balance, Cards",
    supportedCurrencies: ["USD", "EUR", "GBP"]
  },
  {
    id: "adyen",
    name: "Adyen",
    logo: "🌐",
    description: "Global Payments",
    supportedCurrencies: ["USD", "EUR", "GBP", "INR"]
  },
  {
    id: "ccavenue",
    name: "CCAvenue",
    logo: "🏦",
    description: "Cards, Netbanking, Wallets",
    supportedCurrencies: ["INR"]
  }
];

const RECHARGE_AMOUNTS = [100, 500, 1000, 2000, 5000];

const CURRENCY_SYMBOLS: Record<string, React.ReactNode> = {
  INR: <IndianRupee className="h-5 w-5" />,
  USD: <DollarSign className="h-5 w-5" />,
  EUR: <Euro className="h-5 w-5" />,
};

const WalletScreen = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string>("razorpay");
  const [isAnimating, setIsAnimating] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch or create wallet
      let { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      if (!walletData) {
        // Create wallet if doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from("wallets")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        walletData = newWallet;
      }

      setWallet(walletData);

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", walletData.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (txError) throw txError;
      setTransactions(txData || []);

    } catch (error) {
      console.error("Error fetching wallet:", error);
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setIsAnimating(true);
    await fetchWalletData();
    setTimeout(() => setIsAnimating(false), 500);
    setRefreshing(false);
  };

  const handleRecharge = async (amount: number) => {
    if (!selectedGateway) {
      toast.error("Please select a payment method");
      return;
    }

    const gateway = PAYMENT_GATEWAYS.find(g => g.id === selectedGateway);
    if (!gateway) return;

    setSelectedAmount(amount);
    setProcessingPayment(true);
    
    toast.info(`Opening ${gateway.name} for ₹${amount}...`);
    
    // Simulating payment gateway redirect and callback
    setTimeout(async () => {
      try {
        if (!wallet) return;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Update wallet balance
        const newBalance = wallet.balance + amount;
        const { error: updateError } = await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("id", wallet.id);

        if (updateError) throw updateError;

        // Create transaction record with gateway info
        const { error: txError } = await supabase
          .from("wallet_transactions")
          .insert({
            wallet_id: wallet.id,
            user_id: user.id,
            type: "credit",
            amount: amount,
            description: `Wallet recharge via ${gateway.name}`,
            reference_id: `${gateway.id.toUpperCase()}_${Date.now()}`,
            status: "completed"
          });

        if (txError) throw txError;

        setIsAnimating(true);
        await fetchWalletData();
        setTimeout(() => setIsAnimating(false), 500);
        
        toast.success(`₹${amount} added via ${gateway.name}!`);
      } catch (error) {
        console.error("Recharge error:", error);
        toast.error("Recharge failed. Please try again.");
      } finally {
        setSelectedAmount(null);
        setProcessingPayment(false);
      }
    }, 2000);
  };

  const formatCurrency = (amount: number, currency: string = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">My Wallet</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full"
          >
            <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Balance Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-primary-foreground/80 font-medium text-sm">
              <Wallet className="h-4 w-4" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "flex items-center gap-2 transition-all duration-500",
              isAnimating && "scale-110"
            )}>
              {CURRENCY_SYMBOLS[wallet?.currency || "INR"]}
              <span className="text-4xl font-bold tracking-tight">
                {wallet ? formatCurrency(wallet.balance, wallet.currency).replace(/[₹$€]/g, "") : "0.00"}
              </span>
            </div>
            <p className="text-primary-foreground/60 text-sm mt-2">
              Currency: {wallet?.currency || "INR"}
            </p>
          </CardContent>
        </Card>

        {/* Payment Gateway Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedGateway}
              onValueChange={setSelectedGateway}
              className="grid grid-cols-2 gap-3"
            >
              {PAYMENT_GATEWAYS.map((gateway) => (
                <div key={gateway.id} className="relative">
                  <RadioGroupItem
                    value={gateway.id}
                    id={gateway.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={gateway.id}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200",
                      "hover:border-primary/50 hover:bg-muted/50",
                      selectedGateway === gateway.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <span className="text-2xl mb-1">{gateway.logo}</span>
                    <span className="font-medium text-sm">{gateway.name}</span>
                    <span className="text-[10px] text-muted-foreground text-center">
                      {gateway.description}
                    </span>
                    {selectedGateway === gateway.id && (
                      <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Quick Recharge */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Select Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {RECHARGE_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  className={cn(
                    "h-14 text-lg font-semibold transition-all duration-200",
                    selectedAmount === amount && "scale-95"
                  )}
                  onClick={() => handleRecharge(amount)}
                  disabled={processingPayment}
                >
                  {processingPayment && selectedAmount === amount ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    `₹${amount}`
                  )}
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-14 text-lg font-semibold border-dashed"
                onClick={() => toast.info("Custom amount feature coming soon!")}
                disabled={processingPayment}
              >
                Other
              </Button>
            </div>
            
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="h-3 w-3" />
              <span>
                Paying via {PAYMENT_GATEWAYS.find(g => g.id === selectedGateway)?.name || "selected gateway"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No transactions yet</p>
                <p className="text-sm">Recharge your wallet to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, index) => (
                  <div
                    key={tx.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-all duration-300",
                      "animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        tx.type === "credit" 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-red-500/10 text-red-500"
                      )}>
                        {tx.type === "credit" ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">
                          {tx.description || (tx.type === "credit" ? "Money Added" : "Payment")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), "MMM dd, yyyy • HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-semibold",
                        tx.type === "credit" ? "text-green-500" : "text-red-500"
                      )}>
                        {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                      </p>
                      <Badge 
                        variant={tx.status === "completed" ? "default" : "secondary"}
                        className="text-[10px] px-1.5"
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WalletScreen;

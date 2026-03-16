/**
 * WalletScreen.tsx — Men only
 * Shows: Wallet Balance + Recharge
 * Hidden: Transaction history (admin-only via /admin/statements)
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAtomicTransaction } from "@/hooks/useAtomicTransaction";
import { classifyError, ERROR_MESSAGES } from "@/lib/errors";
import { toast } from "sonner";
import {
  ArrowLeft, Home, RefreshCw, Wallet,
  CreditCard, Plus, CheckCircle2, IndianRupee,
  DollarSign, Euro,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

// ─── Types ───────────────────────────────────────────────────────────────────
interface WalletData {
  balance: number;
  currency: string;
}

interface PaymentGateway {
  id: string;
  name: string;
  logo: string;
  description: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const INDIAN_GATEWAYS: PaymentGateway[] = [
  { id: "ccavenue",  name: "CCAvenue",          logo: "🇮🇳", description: "Cards, Netbanking, Wallets" },
  { id: "billdesk",  name: "BillDesk",          logo: "🏦", description: "Netbanking, Cards, EMI" },
  { id: "upi",       name: "UPI Payments",      logo: "📱", description: "Google Pay, PhonePe, Paytm" },
];

const INTERNATIONAL_GATEWAYS: PaymentGateway[] = [
  { id: "payu",      name: "PayU",              logo: "💳", description: "Cards, EMI, Wallets" },
  { id: "adyen",     name: "Adyen",             logo: "🌐", description: "Global Payments, 250+ methods" },
  { id: "cashfree",  name: "Cashfree Payments", logo: "⚡", description: "Cards, UPI, Netbanking" },
  { id: "payglobal", name: "PayGlobal",         logo: "🌍", description: "International Wire & Cards" },
];

const ALL_GATEWAYS: PaymentGateway[] = [...INDIAN_GATEWAYS, ...INTERNATIONAL_GATEWAYS];

const CURRENCY_SYMBOLS: Record<string, React.ReactNode> = {
  INR: <IndianRupee className="h-5 w-5" />,
  USD: <DollarSign className="h-5 w-5" />,
  EUR: <Euro className="h-5 w-5" />,
};

// ─── Component ───────────────────────────────────────────────────────────────
const WalletScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const { creditWallet, isProcessing: transactionProcessing } = useAtomicTransaction();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedGateway, setSelectedGateway] = useState("ccavenue");
  const [isAnimating, setIsAnimating] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const RECHARGE_AMOUNTS = settings.rechargeAmounts;

  // ── Load wallet balance ───────────────────────────────────────────────────
  const loadWallet = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/"); return; }
      setUserId(session.user.id);

      const { data: walletData, error } = await supabase
        .from("users_wallet")
        .select("balance, currency")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) throw error;

      let balance = walletData?.balance || 0;
      // Server-side RPC for accuracy
      const { data: rpcData } = await supabase.rpc("get_men_wallet_balance", { p_user_id: session.user.id });
      const bd = rpcData as Record<string, number> | null;
      if (bd?.balance !== undefined) balance = Number(bd.balance);

      setWallet({ balance, currency: walletData?.currency || "INR" });
    } catch (err) {
      toast.error("Wallet unavailable", { description: classifyError(err).message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadWallet(); }, []);

  useRealtimeSubscription({ table: "users_wallet", onUpdate: loadWallet });

  // ── Recharge ──────────────────────────────────────────────────────────────
  const handleRecharge = async (amount: number) => {
    if (!userId) { toast.error("Please log in to recharge"); return; }
    setSelectedAmount(amount);
    setProcessingPayment(true);
    try {
      const gateway = ALL_GATEWAYS.find(g => g.id === selectedGateway);
      const result = await creditWallet(
        userId,
        amount,
        `Wallet recharge via ${gateway?.name}`,
        `RC_${selectedGateway.toUpperCase()}_${Date.now()}`
      );
      if (result.success) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);
        toast.success(`₹${amount} added to your wallet!`);
        loadWallet();
      } else {
        toast.error(result.error || "Recharge failed. Please try again.");
      }
    } catch (err) {
      toast.error("Recharge failed", { description: ERROR_MESSAGES.wallet.rechargeFailed });
    } finally {
      setProcessingPayment(false);
      setSelectedAmount(null);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWallet();
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="auroraGhost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button variant="auroraGhost" size="icon" onClick={() => navigate("/dashboard")} className="rounded-full">
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">{t("myWallet", "My Wallet")}</h1>
          </div>
          <Button variant="auroraGhost" size="icon" onClick={handleRefresh} disabled={refreshing} className="rounded-full">
            <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">

        {/* Balance Card */}
        <Card className="relative overflow-hidden gradient-aurora text-primary-foreground border-0 shadow-glow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-primary-foreground/80 font-medium text-sm">
              <Wallet className="h-4 w-4" />
              {t("availableBalance", "Available Balance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("flex items-center gap-2 transition-all duration-500", isAnimating && "scale-110")}>
              {CURRENCY_SYMBOLS[wallet?.currency || "INR"]}
              <span className="text-4xl font-bold tracking-tight">
                {wallet ? Number(wallet.balance).toFixed(2) : "0.00"}
              </span>
            </div>
            <p className="text-primary-foreground/60 text-sm mt-2">
              {t("currency", "Currency")}: {wallet?.currency || "INR"}
            </p>
          </CardContent>
        </Card>

        {/* Payment Gateway Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              {t("paymentMethod", "Payment Method")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Indian Gateways */}
            <div>
              <Label className="text-sm font-medium mb-3 block">🇮🇳 {t("indianGateways", "Indian Payment Gateways")}</Label>
              <RadioGroup value={selectedGateway} onValueChange={setSelectedGateway} className="grid grid-cols-2 gap-3">
                {INDIAN_GATEWAYS.map((gateway) => (
                  <div key={gateway.id} className="relative">
                    <RadioGroupItem value={gateway.id} id={gateway.id} className="peer sr-only" />
                    <Label
                      htmlFor={gateway.id}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200",
                        "hover:border-primary/50 hover:bg-muted/50",
                        selectedGateway === gateway.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <span className="text-2xl mb-1">{gateway.logo}</span>
                      <span className="font-medium text-sm">{gateway.name}</span>
                      <span className="text-[10px] text-muted-foreground text-center">{gateway.description}</span>
                      {selectedGateway === gateway.id && (
                        <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* International Gateways */}
            <div>
              <Label className="text-sm font-medium mb-3 block">🌍 {t("internationalGateways", "International Payment Gateways")}</Label>
              <RadioGroup value={selectedGateway} onValueChange={setSelectedGateway} className="grid grid-cols-2 gap-3">
                {INTERNATIONAL_GATEWAYS.map((gateway) => (
                  <div key={gateway.id} className="relative">
                    <RadioGroupItem value={gateway.id} id={gateway.id} className="peer sr-only" />
                    <Label
                      htmlFor={gateway.id}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200",
                        "hover:border-primary/50 hover:bg-muted/50",
                        selectedGateway === gateway.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <span className="text-2xl mb-1">{gateway.logo}</span>
                      <span className="font-medium text-sm">{gateway.name}</span>
                      <span className="text-[10px] text-muted-foreground text-center">{gateway.description}</span>
                      {selectedGateway === gateway.id && (
                        <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Recharge Amounts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              {t("rechargeAmount", "Recharge Amount")}
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
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <CreditCard className="h-3 w-3" />
              {t("payingVia", "Paying via")}{" "}
              {ALL_GATEWAYS.find(g => g.id === selectedGateway)?.name || t("selectedGateway", "selected gateway")}
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default WalletScreen;

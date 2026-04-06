/**
 * WalletScreen.tsx — Men only
 * Shows: Wallet Balance + Recharge
 * Hidden: Transaction history (admin-only via /admin/statements)
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Skeleton } from "@/components/ui/skeleton";
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
const PAYMENT_GATEWAYS: PaymentGateway[] = [
  { id: "cashfree",  name: "Cashfree",          logo: "⚡", description: "Cards, UPI, Netbanking" },
  { id: "razorpay",  name: "Razorpay",          logo: "💳", description: "Cards, UPI, Wallets, EMI" },
];

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
  const { isProcessing: transactionProcessing } = useAtomicTransaction();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedGateway, setSelectedGateway] = useState("cashfree");
  const [isAnimating, setIsAnimating] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [rechargeConsent, setRechargeConsent] = useState(false);

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

  // ── Recharge via Cashfree ───────────────────────────────────────────────
  const handleRecharge = async (amount: number) => {
    if (!userId || amount < 10) { toast.error("Please enter a valid amount (min ₹10)"); return; }
    setSelectedAmount(amount);
    setProcessingPayment(true);
    try {
      const returnUrl = `${window.location.origin}/wallet?payment={order_status}&order_id={order_id}`;
      const { data, error } = await supabase.functions.invoke('cashfree-payment', {
        body: { amount, userId, returnUrl }
      });

      if (error) throw error;
      if (!data?.success || !data?.paymentSessionId) {
        throw new Error(data?.error || 'Failed to create payment order');
      }

      // Load Cashfree SDK and redirect
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => {
        const cashfree = (window as any).Cashfree({ mode: "production" });
        cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
      };
      script.onerror = () => {
        toast.error("Failed to load payment gateway");
        setProcessingPayment(false);
        setSelectedAmount(null);
      };
      document.head.appendChild(script);
    } catch (err) {
      console.error('[Cashfree Recharge Error]', err);
      toast.error("Recharge failed", { description: ERROR_MESSAGES.wallet.rechargeFailed });
      setProcessingPayment(false);
      setSelectedAmount(null);
    }
  };

  // Handle payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const orderId = params.get('order_id');
    if (paymentStatus && orderId) {
      const verifyPayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('cashfree-payment/verify', {
            body: { orderId }
          });
          if (error) throw error;
          if (data?.credited) {
            toast.success('Payment successful! 🎉', { description: `₹${data.amount} added to your wallet.` });
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 2000);
            loadWallet();
          } else if (data?.alreadyCredited) {
            toast.info('Already processed', { description: 'This payment was already credited.' });
          } else {
            toast.error('Payment not completed', { description: `Status: ${data?.status || 'Unknown'}` });
          }
        } catch (err) {
          console.error('[Payment Verify]', err);
          toast.error('Verification failed', { description: 'Please check your balance.' });
        }
      };
      verifyPayment();
      window.history.replaceState({}, '', '/wallet');
    }
  }, []);

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

        {/* Payment Gateway */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              {t("paymentMethod", "Payment Method")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {PAYMENT_GATEWAYS.map((gw) => (
                <div
                  key={gw.id}
                  onClick={() => setSelectedGateway(gw.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                    selectedGateway === gw.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{gw.logo}</span>
                  <div>
                    <span className="font-medium">{gw.name}</span>
                    <p className="text-xs text-muted-foreground">{gw.description}</p>
                  </div>
                  {selectedGateway === gw.id && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
                </div>
              ))}
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
            {/* Consent checkbox */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 mb-4">
              <Checkbox
                id="recharge-consent"
                checked={rechargeConsent}
                onCheckedChange={(v) => setRechargeConsent(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="recharge-consent" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                I agree that wallet recharges are non-refundable. A 3% transaction fee applies. Balance can only be used for in-app services (chat, calls, gifts). I have read and accept the <a href="/legal-documents/terms-of-service" className="text-primary underline">Terms of Service</a>.
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {RECHARGE_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount && !customAmount ? "default" : "outline"}
                  className={cn(
                    "h-14 text-lg font-semibold transition-all duration-200",
                    selectedAmount === amount && !customAmount && "scale-95"
                  )}
                  onClick={() => { setCustomAmount(""); handleRecharge(amount); }}
                  disabled={processingPayment || !rechargeConsent}
                >
                  {processingPayment && selectedAmount === amount ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    `₹${amount}`
                  )}
                </Button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">{t("customAmount", "Custom Amount")}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    placeholder="Enter amount (min ₹10)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button
                  variant="default"
                  onClick={() => {
                    const val = Number(customAmount);
                    if (val >= 10) handleRecharge(val);
                    else toast.error("Minimum amount is ₹10");
                  }}
                  disabled={processingPayment || !customAmount || Number(customAmount) < 10 || !rechargeConsent}
                >
                  {processingPayment && customAmount ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Pay"}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <CreditCard className="h-3 w-3" />
              {t("payingVia", "Paying via")} {PAYMENT_GATEWAYS.find(g => g.id === selectedGateway)?.name ?? 'Cashfree'} — Secure Payment
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <IndianRupee className="h-3 w-3" />
              3% transaction fee applies on all recharges
            </p>
          </CardContent>
        </Card>

        {/* Statement link */}
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => navigate("/statement")} className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            View Transaction Statement
          </Button>
        </div>

      </div>
    </div>
  );
};

export default WalletScreen;

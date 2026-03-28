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

  // ── Recharge via PayU ───────────────────────────────────────────────────
  const handleRecharge = async (amount: number) => {
    if (!userId) { toast.error("Please log in to recharge"); return; }
    setSelectedAmount(amount);
    setProcessingPayment(true);
    try {
      // Call edge function to get PayU payment data
      const returnUrl = `${window.location.origin}/wallet?payment=success`;
      const failureUrl = `${window.location.origin}/wallet?payment=failed`;
      const { data: result, error } = await supabase.functions.invoke('payu-payment', {
        body: { amount, userId, returnUrl, failureUrl }
      });

      if (error) throw error;
      if (!result?.success || !result?.paymentData) {
        throw new Error(result?.error || 'Failed to initiate payment');
      }

      const pd = result.paymentData;

      // Create and submit PayU form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = pd.payuUrl;
      form.style.display = 'none';

      const fields = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'hash'];
      fields.forEach(field => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = field;
        input.value = pd[field] || '';
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error('[PayU Recharge Error]', err);
      toast.error("Recharge failed", { description: ERROR_MESSAGES.wallet.rechargeFailed });
      setProcessingPayment(false);
      setSelectedAmount(null);
    }
  };

  // Handle payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const txnId = params.get('txnid');
    if (paymentStatus === 'success') {
      toast.success('Payment successful!', { description: `Transaction ${txnId} completed. Balance will update shortly.` });
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
      loadWallet();
      window.history.replaceState({}, '', '/wallet');
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed', { description: 'Your payment was not completed. No amount was charged.' });
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              {t("payingVia", "Paying via")} {PAYMENT_GATEWAYS.find(g => g.id === selectedGateway)?.name ?? 'Cashfree'} — Secure Payment
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default WalletScreen;

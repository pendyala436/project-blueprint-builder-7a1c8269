/**
 * WomenWalletScreen.tsx — Women only
 * Shows: Earned Balance + Withdraw button
 * Hidden: Transaction/earnings history (admin-only via /admin/statements)
 *
 * Earnings come from women_earnings table:
 *   Text chat  → ₹2/min per man chatting
 *   Video call → ₹4/min
 *   Group call → ₹2/min per man in call
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAtomicTransaction } from "@/hooks/useAtomicTransaction";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { classifyError } from "@/lib/errors";
import { toast } from "sonner";
import {
  ArrowLeft, Home, Wallet, TrendingUp, Clock,
  ArrowDownToLine, CheckCircle2, AlertCircle,
  Globe, Zap, Building2, IndianRupee, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Payout methods ───────────────────────────────────────────────────────────
interface PayoutMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  regions: string;
  color: string;
}

const PAYOUT_METHODS: PayoutMethod[] = [
  {
    id: "cashfree", name: "Cashfree Payments",
    description: "Instant INR payout to bank account — India only",
    icon: <Building2 className="h-5 w-5" />,
    regions: "India Only",
    color: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
const WomenWalletScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { requestWithdrawal } = useAtomicTransaction();

  const [isLoading,        setIsLoading]        = useState(true);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [totalEarnings,    setTotalEarnings]    = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [minWithdrawal,    setMinWithdrawal]    = useState(10000);
  const [currentUserId,    setCurrentUserId]    = useState<string | null>(null);

  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount,     setWithdrawAmount]     = useState("");
  const [paymentMethod,      setPaymentMethod]      = useState("");
  const [isSubmitting,       setIsSubmitting]       = useState(false);

  // ── Load balance (no transaction list) ──────────────────────────────────
  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/"); return; }
      setCurrentUserId(session.user.id);

      // Fetch min withdrawal from pricing
      const { data: pricing } = await supabase
        .from("chat_pricing")
        .select("min_withdrawal_balance")
        .eq("is_active", true)
        .maybeSingle();
      if (pricing) setMinWithdrawal(Number(pricing.min_withdrawal_balance) || 5000);

      // users_wallet.balance is the single source of truth for women's wallet.
      // It is incremented directly on every session earning credit (chat, video, group call).
      // No history list shown — only balance + pending withdrawals.
      const { data: balanceData, error: balanceError } = await supabase.rpc(
        "get_women_wallet_balance", { p_user_id: session.user.id }
      );
      if (balanceError) {
        toast.error("Balance unavailable", { description: "Unable to load wallet balance. Please refresh." });
        return;
      }
      const bd = balanceData as Record<string, number> | null;
      // balance = users_wallet.balance (direct, not computed from women_earnings sum)
      setTotalEarnings(Number(bd?.total_earnings) || 0);
      setAvailableBalance(Number(bd?.available_balance) || 0);
      setPendingWithdrawals(Number(bd?.pending_withdrawals) || 0);

    } catch (err) {
      toast.error("Failed to load wallet", { description: classifyError(err).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Realtime: refresh when wallet balance changes (triggered by billing RPCs)
  useRealtimeSubscription({ table: "users_wallet",           onUpdate: loadData });
  useRealtimeSubscription({ table: "withdrawal_requests",  onUpdate: loadData });
  useRealtimeSubscription({ table: "chat_pricing",         onUpdate: loadData });

  // ── Withdraw handler ─────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error(t("invalidAmount", "Invalid Amount"), { description: t("pleaseEnterValidAmount", "Please enter a valid amount") });
      return;
    }
    if (amount > availableBalance) {
      toast.error(t("insufficientBalance", "Insufficient Balance"), { description: t("youNeedMore", "You don't have enough available balance") });
      return;
    }
    if (availableBalance < minWithdrawal) {
      toast.error(t("minimumNotMet", "Minimum Not Met"), { description: `Minimum withdrawal is ₹${minWithdrawal.toLocaleString()}` });
      return;
    }
    if (!paymentMethod) {
      toast.error(t("paymentMethodRequired", "Payment Method Required"), { description: t("pleaseSelectPaymentMethod", "Please select a payout method") });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestWithdrawal(currentUserId!, amount, paymentMethod);
      if (!result.success) {
        toast.error(t("error", "Error"), { description: result.error || t("failedToSubmitWithdrawal", "Failed to submit withdrawal request") });
        return;
      }
      toast.success(t("requestSubmitted", "Request Submitted"), { description: t("withdrawalRequestSubmitted", "Your withdrawal request has been submitted for approval") });
      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      setPaymentMethod("");
      loadData();
    } catch (err) {
      toast.error(t("error", "Error"), { description: classifyError(err).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canWithdraw = availableBalance >= minWithdrawal;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="auroraGhost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button variant="auroraGhost" size="icon" onClick={() => navigate("/women-dashboard")} className="rounded-full">
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t("myWallet", "My Wallet")}</h1>
              <p className="text-sm text-muted-foreground">{t("earnings", "Earnings")} &amp; {t("withdrawals", "Withdrawals")}</p>
            </div>
          </div>
          <Button variant="auroraGhost" size="icon" onClick={loadData} className="rounded-full">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-success/20">
                <Wallet className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("availableBalance", "Available Balance")}</p>
                <p className="text-xl font-bold">₹{availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("totalEarned", "Total Earned")}</p>
                <p className="text-xl font-bold">₹{totalEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Earning rates info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <IndianRupee className="h-3.5 w-3.5 text-primary shrink-0" />
              {t("earningRates", "Earnings are calculated per minute for text chats, video calls, and group calls.")}
            </p>
          </CardContent>
        </Card>

        {/* Pending Withdrawals */}
        {pendingWithdrawals > 0 && (
          <Card className="p-4 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-warning/20">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("pendingWithdrawals", "Pending Withdrawals")}</p>
                <p className="text-xl font-bold text-warning">₹{pendingWithdrawals.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Withdraw Action */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t("withdrawFunds", "Withdraw Funds")}</h3>
              <p className="text-sm text-muted-foreground">
                {canWithdraw
                  ? t("requestWithdrawal", "Request a withdrawal to your account")
                  : `${t("minimumBalance", "Minimum")}: ₹${minWithdrawal.toLocaleString()}`}
              </p>
            </div>
            <Button onClick={() => setWithdrawDialogOpen(true)} disabled={!canWithdraw} className="gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              {t("withdraw", "Withdraw")}
            </Button>
          </div>
          {!canWithdraw && (
            <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-sm text-warning">
                {t("youNeedMore", "You need")} ₹{(minWithdrawal - availableBalance).toLocaleString()} {t("more", "more to reach the minimum")}
              </p>
            </div>
          )}
        </Card>

      </main>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              {t("requestWithdrawal", "Request Withdrawal")}
            </DialogTitle>
            <DialogDescription>
              {t("availableBalance", "Available balance")}: ₹{availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount input */}
            <div className="space-y-2">
              <Label htmlFor="amount">{t("amount", "Amount")} (INR)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  className="pl-10"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder={t("enterAmount", "Enter amount")}
                  max={availableBalance}
                />
              </div>
            </div>

            {/* Payout method */}
            <div className="space-y-2">
              <Label>{t("payoutMethod", "Payout Method")}</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                {PAYOUT_METHODS.map(method => (
                  <div key={method.id} className="relative">
                    <RadioGroupItem value={method.id} id={`payout-${method.id}`} className="peer sr-only" />
                    <Label
                      htmlFor={`payout-${method.id}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200",
                        "hover:border-primary/50",
                        paymentMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg bg-gradient-to-br", method.color)}>
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{method.name}</p>
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{method.regions}</Badge>
                      {paymentMethod === method.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={isSubmitting || !withdrawAmount || !paymentMethod}
              className="w-full gap-2"
            >
              {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
              {isSubmitting
                ? t("submitting", "Submitting...")
                : `${t("withdraw", "Withdraw")} ₹${withdrawAmount || "0"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default WomenWalletScreen;

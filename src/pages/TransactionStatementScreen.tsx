/**
 * TransactionStatementScreen.tsx — User-facing monthly statement
 * Rates fetched dynamically from chat_pricing table (single source of truth)
 * Uses get_my_statement_summary + get_my_statement_detail RPCs
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";
import {
  ArrowLeft, Home, FileText, IndianRupee, RefreshCw,
  TrendingDown, TrendingUp, Calendar, Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const ALLOWED_MONTHS: { year: number; month: number }[] = [];
for (let i = 0; i < 6; i++) {
  const d = new Date(CURRENT_YEAR, CURRENT_MONTH - 1 - i, 1);
  ALLOWED_MONTHS.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
}
const YEARS = [...new Set(ALLOWED_MONTHS.map(m => m.year))];

// ─── Pricing (fetched from DB) ─────────────────────────────────────────────
interface ChatPricing {
  rate_per_minute: number;
  women_earning_rate: number;
  video_rate_per_minute: number;
  video_women_earning_rate: number;
  audio_rate_per_minute: number;
  audio_women_earning_rate: number;
  group_call_rate_per_minute: number;
  group_call_women_earning_rate: number;
  gift_women_percent: number;
}

const DEFAULT_PRICING: ChatPricing = {
  rate_per_minute: 4, women_earning_rate: 2,
  video_rate_per_minute: 8, video_women_earning_rate: 4,
  audio_rate_per_minute: 6, audio_women_earning_rate: 3,
  group_call_rate_per_minute: 4, group_call_women_earning_rate: 0.50,
  gift_women_percent: 50,
};

function buildRateLabels(p: ChatPricing, isMale: boolean): Record<string, string> {
  // Shared labels used by both genders
  const shared: Record<string, string> = {
    opening_balance: "Opening Balance",
    monthly_closing: "Monthly Closing",
  };

  if (isMale) {
    return {
      ...shared,
      // Ledger types (actual DB values)
      chat_charge: `Chat — ₹${p.rate_per_minute}/min`,
      video_call_charge: `Video Call — ₹${p.video_rate_per_minute}/min`,
      audio_call_charge: `Audio Call — ₹${p.audio_rate_per_minute}/min`,
      group_call_charge: `Group Call — ₹${p.group_call_rate_per_minute}/min (each man)`,
      recharge: "Wallet Recharge",
      // Alternate naming from different sources
      chat_debit: `Chat — ₹${p.rate_per_minute}/min`,
      video_debit: `Video Call — ₹${p.video_rate_per_minute}/min`,
      audio_debit: `Audio Call — ₹${p.audio_rate_per_minute}/min`,
      // Gift/tip (men send)
      gift_charge: "Gift Sent — 100% deducted",
      gift_debit: "Gift Sent — 100% deducted",
      gift: "Gift Sent — 100% deducted",
      tip_charge: "Tip Sent — 100% deducted",
      tip: "Tip Sent — 100% deducted",
      // wallet_transactions fallback (type='debit' with no transaction_type)
      debit: "Session Charge",
      credit: "Wallet Recharge",
      // earning type should not appear for men but handle gracefully
      earning: "Adjustment Credit",
    };
  }
  return {
    ...shared,
    // Primary ledger type for women earnings
    earning: "Session Earning",
    // women_earnings earning_type values
    chat: `Chat Earning — ₹${p.women_earning_rate}/min`,
    chat_earning: `Chat Earning — ₹${p.women_earning_rate}/min`,
    chat_credit: `Chat Earning — ₹${p.women_earning_rate}/min`,
    video_call: `Video Call Earning — ₹${p.video_women_earning_rate}/min`,
    video_earning: `Video Call Earning — ₹${p.video_women_earning_rate}/min`,
    video_credit: `Video Call Earning — ₹${p.video_women_earning_rate}/min`,
    audio_call: `Audio Call Earning — ₹${p.audio_women_earning_rate}/min`,
    audio_earning: `Audio Call Earning — ₹${p.audio_women_earning_rate}/min`,
    audio_credit: `Audio Call Earning — ₹${p.audio_women_earning_rate}/min`,
    group_call: `Group Call Earning — ₹${p.group_call_women_earning_rate}/min × men`,
    group_call_earning: `Group Call Earning — ₹${p.group_call_women_earning_rate}/min × men`,
    // Gift/tip (women receive)
    gift: `Gift Received — ${p.gift_women_percent}% credited`,
    gift_earning: `Gift Received — ${p.gift_women_percent}% credited`,
    gift_credit: `Gift Received — ${p.gift_women_percent}% credited`,
    tip: `Tip Received — ${p.gift_women_percent}% credited`,
    tip_earning: `Tip Received — ${p.gift_women_percent}% credited`,
    // Withdrawals
    withdrawal: "Bank Withdrawal",
    payout: "Bank Withdrawal",
    // wallet_transactions fallback
    debit: "Withdrawal / Deduction",
    credit: "Session Earning",
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface Summary {
  success: boolean;
  gender: string;
  year: number;
  month: number;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  error?: string;
}

interface TxRow {
  txn_date: string;
  transaction_id: string;
  session_id: string | null;
  txn_type: string;
  description: string | null;
  duration_seconds: number | null;
  rate_per_minute: number | null;
  debit: number;
  credit: number;
  running_balance: number;
  start_time: string | null;
  end_time: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtINR = (v: number) => `₹${Number(v).toFixed(2)}`;
const fmtDuration = (sec: number | null) => {
  if (!sec || sec <= 0) return "—";
  const totalMin = Math.ceil(sec / 60);
  return `${totalMin} min`;
};
const fmtTimeIST = (dateStr: string | null) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit" });
};

// ─── Component ──────────────────────────────────────────────────────────────
const TransactionStatementScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [gender, setGender] = useState<string | null>(null);
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(CURRENT_MONTH));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pricing, setPricing] = useState<ChatPricing>(DEFAULT_PRICING);

  // Detect gender + fetch pricing on mount
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/"); return; }

      const [profileRes, pricingRes] = await Promise.all([
        supabase.from("profiles").select("gender").eq("user_id", session.user.id).single(),
        supabase.from("chat_pricing")
          .select("rate_per_minute, women_earning_rate, video_rate_per_minute, video_women_earning_rate, audio_rate_per_minute, audio_women_earning_rate, group_call_rate_per_minute, group_call_women_earning_rate, gift_women_percent")
          .eq("is_active", true).limit(1).maybeSingle(),
      ]);

      if (profileRes.data?.gender) setGender(profileRes.data.gender);
      if (pricingRes.data) setPricing(pricingRes.data as ChatPricing);
    })();
  }, [navigate]);

  const isMale = gender === "male";
  const rateLabels = buildRateLabels(pricing, isMale);
  const typeLabel = (txnType: string, description?: string | null, rate?: number | null) => {
    // For generic "earning" type, infer from description or rate (women)
    if (txnType === "earning" && !isMale) {
      if (description) {
        const dl = description.toLowerCase();
        if (dl.includes("video")) return `Video Call Earning — ₹${pricing.video_women_earning_rate}/min`;
        if (dl.includes("audio")) return `Audio Call Earning — ₹${pricing.audio_women_earning_rate}/min`;
        if (dl.includes("group")) return `Group Call Earning — ₹${pricing.group_call_women_earning_rate}/min × men`;
        if (dl.includes("gift")) return `Gift Received — ${pricing.gift_women_percent}% credited`;
        if (dl.includes("chat")) return `Chat Earning — ₹${pricing.women_earning_rate}/min`;
      }
      if (rate) {
        if (rate === pricing.video_women_earning_rate) return `Video Call Earning — ₹${rate}/min`;
        if (rate === pricing.audio_women_earning_rate) return `Audio Call Earning — ₹${rate}/min`;
        if (rate === pricing.group_call_women_earning_rate) return `Group Call Earning — ₹${rate}/min × men`;
        if (rate === pricing.women_earning_rate) return `Chat Earning — ₹${rate}/min`;
      }
      return "Session Earning";
    }
    // For generic "debit"/"credit" from wallet_transactions, infer from description
    if ((txnType === "debit" || txnType === "credit") && description) {
      const dl = description.toLowerCase();
      if (dl.includes("gift") || dl.includes("tip")) return isMale ? "Gift/Tip Sent" : "Gift/Tip Received";
      if (dl.includes("recharge")) return "Wallet Recharge";
      if (dl.includes("withdrawal")) return "Bank Withdrawal";
      if (dl.includes("video")) return isMale ? `Video Call — ₹${pricing.video_rate_per_minute}/min` : `Video Earning`;
      if (dl.includes("audio")) return isMale ? `Audio Call — ₹${pricing.audio_rate_per_minute}/min` : `Audio Earning`;
      if (dl.includes("group")) return isMale ? `Group Call — ₹${pricing.group_call_rate_per_minute}/min` : `Group Earning`;
      if (dl.includes("chat")) return isMale ? `Chat — ₹${pricing.rate_per_minute}/min` : `Chat Earning`;
    }
    return rateLabels[txnType] || txnType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const menRateText = `Chat ₹${pricing.rate_per_minute}/min · Video ₹${pricing.video_rate_per_minute}/min · Audio ₹${pricing.audio_rate_per_minute}/min · Group ₹${pricing.group_call_rate_per_minute}/min (each man) · Gift/Tip 100%`;
  const womenRateText = `Chat ₹${pricing.women_earning_rate}/min · Video ₹${pricing.video_women_earning_rate}/min · Audio ₹${pricing.audio_women_earning_rate}/min · Group ₹${pricing.group_call_women_earning_rate}/min×men · Gift/Tip ${pricing.gift_women_percent}% (platform keeps ${100 - pricing.gift_women_percent}%)`;

  // Load statement
  const loadStatement = useCallback(async () => {
    if (!gender) return;
    setLoading(true);
    setDetailLoading(true);
    setSummary(null);
    setRows([]);

    try {
      const [sumRes, detRes] = await Promise.all([
        supabase.rpc("get_my_statement_summary", {
          p_year: parseInt(year),
          p_month: parseInt(month),
        }),
        supabase.rpc("get_my_statement_detail", {
          p_year: parseInt(year),
          p_month: parseInt(month),
        }),
      ]);

      if (sumRes.error) throw sumRes.error;
      const sumData = sumRes.data as Summary;
      if (!sumData.success) {
        toast.error(sumData.error || "Failed to load statement");
        setSummary(null);
        setRows([]);
        return;
      }

      if (detRes.error) {
        setSummary(null);
        setRows([]);
        throw detRes.error;
      }

      setSummary(sumData);
      setRows((detRes.data as TxRow[]) || []);
    } catch (err: any) {
      toast.error("Failed to load statement", { description: err.message });
    } finally {
      setLoading(false);
      setDetailLoading(false);
    }
  }, [gender, year, month]);

  useEffect(() => { loadStatement(); }, [loadStatement]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isMale ? "/dashboard" : "/women-dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isMale ? "Wallet Statement" : "Earnings Statement"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isMale
                ? "All charges and recharges — exact rates, no overcharging"
                : "All earnings and withdrawals — exact rates, no undercharging"}
            </p>
          </div>
          <Badge variant={isMale ? "default" : "secondary"} className="text-xs">
            {isMale ? "Man" : "Woman"}
          </Badge>
        </div>

        {/* Rate reference — dynamic from DB */}
        <Card className={cn(
          "border text-xs",
          isMale
            ? "bg-red-50/50 border-red-200/50 dark:bg-red-950/20 dark:border-red-800/30"
            : "bg-green-50/50 border-green-200/50 dark:bg-green-950/20 dark:border-green-800/30"
        )}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="h-3.5 w-3.5" />
              <span className="font-semibold">{isMale ? "Billing Rates (debited from wallet)" : "Earning Rates (credited to you)"}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-muted-foreground">
              {isMale ? (
                <>
                  <span>💬 Chat: ₹{pricing.rate_per_minute}/min</span>
                  <span>📹 Video: ₹{pricing.video_rate_per_minute}/min</span>
                  <span>📞 Audio: ₹{pricing.audio_rate_per_minute}/min</span>
                  <span>👥 Group: ₹{pricing.group_call_rate_per_minute}/min (each man)</span>
                  <span>🎁 Gift: 100%</span>
                  <span>💰 Tip: 100%</span>
                </>
              ) : (
                <>
                  <span>💬 Chat: ₹{pricing.women_earning_rate}/min</span>
                  <span>📹 Video: ₹{pricing.video_women_earning_rate}/min</span>
                  <span>📞 Audio: ₹{pricing.audio_women_earning_rate}/min</span>
                  <span>👥 Group: ₹{pricing.group_call_women_earning_rate}/min×men</span>
                  <span>🎁 Gift: {pricing.gift_women_percent}% (platform {100 - pricing.gift_women_percent}%)</span>
                  <span>💰 Tip: {pricing.gift_women_percent}% (platform {100 - pricing.gift_women_percent}%)</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Period selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALLOWED_MONTHS
                      .filter(am => am.year === Number(year))
                      .map(am => (
                        <SelectItem key={am.month} value={String(am.month)}>{MONTH_NAMES[am.month - 1]}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" onClick={loadStatement} disabled={loading} className="h-8 gap-1">
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Opening Balance",
                value: summary.opening_balance,
                icon: <Wallet className="h-4 w-4" />,
                color: "text-foreground",
              },
              {
                label: isMale ? "Total Charged" : "Total Earned",
                value: isMale ? summary.total_debit : summary.total_credit,
                icon: isMale ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />,
                color: isMale ? "text-destructive" : "text-green-600",
              },
              {
                label: isMale ? "Total Recharged" : "Withdrawals",
                value: isMale ? summary.total_credit : summary.total_debit,
                icon: isMale ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
                color: isMale ? "text-green-600" : "text-destructive",
              },
              {
                label: "Closing Balance",
                value: summary.closing_balance,
                icon: <Calendar className="h-4 w-4" />,
                color: summary.closing_balance >= 0 ? "text-green-600" : "text-destructive",
              },
            ].map(card => (
              <Card key={card.label} className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  {card.icon}
                  <span className="text-[10px] uppercase tracking-wider">{card.label}</span>
                </div>
                <p className={cn("text-lg font-bold", card.color)}>{fmtINR(card.value)}</p>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Transaction detail table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {isMale ? "Transaction Details" : "Earnings & Withdrawals"}
              <Badge variant="outline" className="text-xs ml-auto">{rows.length} rows</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {detailLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm space-y-2">
                <FileText className="h-10 w-10 mx-auto opacity-20" />
                <p className="font-medium">No transactions for {MONTH_NAMES[parseInt(month) - 1]} {year}</p>
                <p className="text-xs">
                  {isMale
                    ? "Recharges and session charges will appear here."
                    : "Earnings from chats, calls, gifts and withdrawals will appear here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">Date & Time (IST)</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Start</TableHead>
                      <TableHead className="text-xs">End</TableHead>
                      <TableHead className="text-xs">Duration (min)</TableHead>
                      <TableHead className="text-xs">Rate</TableHead>
                      {isMale ? (
                        <>
                          <TableHead className="text-xs text-right text-destructive">Debit (₹)</TableHead>
                          <TableHead className="text-xs text-right text-green-600">Credit (₹)</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-xs text-right text-green-600">Earned (₹)</TableHead>
                          <TableHead className="text-xs text-right text-destructive">Deduction (₹)</TableHead>
                        </>
                      )}
                      <TableHead className="text-xs text-right">Balance (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Opening balance row */}
                    {summary && (
                      <TableRow className="bg-muted/20">
                        <TableCell className="text-xs text-muted-foreground" colSpan={6}>
                          Opening Balance — {MONTH_NAMES[parseInt(month) - 1]} {year}
                        </TableCell>
                        <TableCell className="text-xs text-right">—</TableCell>
                        <TableCell className="text-xs text-right">—</TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {fmtINR(summary.opening_balance)}
                        </TableCell>
                      </TableRow>
                    )}

                    {rows.map((row, i) => {
                      const istDateStr = new Date(row.txn_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

                      return (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="text-xs whitespace-nowrap">
                            {istDateStr}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">
                              {typeLabel(row.txn_type, row.description, row.rate_per_minute)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtTimeIST(row.start_time) || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtTimeIST(row.end_time) || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtDuration(row.duration_seconds)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.rate_per_minute ? `₹${Number(row.rate_per_minute).toFixed(2)}/min` : "—"}
                          </TableCell>
                          {isMale ? (
                            <>
                              <TableCell className="text-xs text-right font-medium text-destructive">
                                {Number(row.debit) > 0 ? fmtINR(row.debit) : "—"}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-green-600">
                                {Number(row.credit) > 0 ? fmtINR(row.credit) : "—"}
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-xs text-right font-medium text-green-600">
                                {Number(row.credit) > 0 ? fmtINR(row.credit) : "—"}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-destructive">
                                {Number(row.debit) > 0 ? fmtINR(row.debit) : "—"}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-xs text-right font-semibold">
                            {fmtINR(row.running_balance)}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Totals footer */}
                    {rows.length > 0 && (
                      <TableRow className="bg-muted/60 font-semibold border-t-2">
                        <TableCell colSpan={6} className="text-xs text-right pr-2">
                          Totals:
                        </TableCell>
                        {isMale ? (
                          <>
                            <TableCell className="text-xs text-right text-destructive">
                              {fmtINR(rows.reduce((s, r) => s + Number(r.debit), 0))}
                            </TableCell>
                            <TableCell className="text-xs text-right text-green-600">
                              {fmtINR(rows.reduce((s, r) => s + Number(r.credit), 0))}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-xs text-right text-green-600">
                              {fmtINR(rows.reduce((s, r) => s + Number(r.credit), 0))}
                            </TableCell>
                            <TableCell className="text-xs text-right text-destructive">
                              {fmtINR(rows.reduce((s, r) => s + Number(r.debit), 0))}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-xs text-right">
                          {summary ? fmtINR(summary.closing_balance) : "—"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Footer disclaimer */}
            <div className="px-4 py-3 border-t text-[10px] text-muted-foreground text-center space-y-0.5">
              <p>System-generated statement. Currency: INR. All timestamps shown in IST (UTC+5:30). Duration in minutes.</p>
              <p>Rates: {isMale ? menRateText : womenRateText}.</p>
              <p>{isMale
                ? "No overcharging — exact session duration × rate."
                : "No undercharging — exact session duration × rate."}</p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-center gap-4 pb-8">
          <Button variant="outline" onClick={() => navigate(isMale ? "/dashboard" : "/women-dashboard")} className="gap-2">
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransactionStatementScreen;

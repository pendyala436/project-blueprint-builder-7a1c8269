/**
 * TransactionStatementScreen.tsx — User-facing monthly statement
 * Men tab  → ledger_transactions (debits: chat/video/audio/group/gift/tip, credits: recharges)
 * Women tab → women_earnings (credits) + withdrawal_requests (debits)
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

// ─── Rate labels ────────────────────────────────────────────────────────────
const RATE_INFO_MEN: Record<string, string> = {
  chat_charge:       "Chat — ₹4/min",
  video_call_charge: "Video Call — ₹8/min",
  audio_call_charge: "Audio Call — ₹6/min",
  group_call_charge: "Group Call — ₹4/min per man",
  gift_charge:       "Gift — 100% deducted",
  tip_charge:        "Tip — 100% deducted",
  recharge:          "Wallet Recharge",
  opening_balance:   "Opening Balance",
};

const RATE_INFO_WOMEN: Record<string, string> = {
  chat:       "Chat Earning — ₹2/min",
  video_call: "Video Call Earning — ₹4/min",
  audio_call: "Audio Call Earning — ₹3/min",
  group_call: "Group Call — ₹0.50/min × men",
  gift:       "Gift Received — 50% credited",
  tip:        "Tip Received — 50% credited",
  withdrawal: "Bank Withdrawal",
};

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
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtINR = (v: number) => `₹${Number(v).toFixed(2)}`;
const fmtDuration = (sec: number | null) => {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
const typeLabel = (t: string, isMale: boolean) => {
  const map = isMale ? RATE_INFO_MEN : RATE_INFO_WOMEN;
  return map[t] || t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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

  // Detect gender on mount
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("gender")
        .eq("user_id", session.user.id)
        .single();
      if (data?.gender) setGender(data.gender);
    })();
  }, [navigate]);

  // Load statement
  const loadStatement = useCallback(async () => {
    if (!gender) return;
    setLoading(true);
    setDetailLoading(true);
    setSummary(null);
    setRows([]);

    try {
      // Parallel fetch summary + detail
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
        return;
      }
      setSummary(sumData);

      if (detRes.error) throw detRes.error;
      setRows((detRes.data as TxRow[]) || []);
    } catch (err: any) {
      toast.error("Failed to load statement", { description: err.message });
    } finally {
      setLoading(false);
      setDetailLoading(false);
    }
  }, [gender, year, month]);

  useEffect(() => { loadStatement(); }, [loadStatement]);

  const isMale = gender === "male";

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

        {/* Rate reference */}
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
                  <span>💬 Chat: ₹4/min</span>
                  <span>📹 Video: ₹8/min</span>
                  <span>📞 Audio: ₹6/min</span>
                  <span>👥 Group: ₹4/min</span>
                  <span>🎁 Gift: 100%</span>
                  <span>💰 Tip: 100%</span>
                </>
              ) : (
                <>
                  <span>💬 Chat: ₹2/min</span>
                  <span>📹 Video: ₹4/min</span>
                  <span>📞 Audio: ₹3/min</span>
                  <span>👥 Group: ₹0.50/min×men</span>
                  <span>🎁 Gift: 50%</span>
                  <span>💰 Tip: 50%</span>
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
                    {MONTH_NAMES.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
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
                      <TableHead className="text-xs">Duration</TableHead>
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
                        <TableCell className="text-xs text-muted-foreground" colSpan={4}>
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
                      // Convert UTC to IST for display
                      const istDate = new Date(new Date(row.txn_date).getTime() + 5.5 * 60 * 60 * 1000);

                      return (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(istDate, "dd MMM yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">
                              {typeLabel(row.txn_type, isMale)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
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
                        <TableCell colSpan={4} className="text-xs text-right pr-2">
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
              <p>System-generated statement. Currency: INR. All timestamps shown in IST (UTC+5:30).</p>
              <p>
                {isMale
                  ? "Rates: Chat ₹4/min · Video ₹8/min · Audio ₹6/min · Group ₹4/min · Gift/Tip 100%. No overcharging — exact session duration × rate."
                  : "Rates: Chat ₹2/min · Video ₹4/min · Audio ₹3/min · Group ₹0.50/min×men · Gift/Tip 50%. No undercharging — exact session duration × rate."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-center gap-3 pb-6">
          <Button variant="outline" size="sm" onClick={() => navigate(isMale ? "/wallet" : "/women-wallet")} className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            {isMale ? "Back to Wallet" : "Back to Earnings"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(isMale ? "/dashboard" : "/women-dashboard")} className="gap-1.5">
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransactionStatementScreen;

/**
 * TransactionStatementTab — Embeddable transaction statement for dashboard tabs
 * Supports PDF, Word, and Excel export
 * Rates fetched dynamically from chat_pricing table (single source of truth)
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  FileText, IndianRupee, RefreshCw, TrendingDown, TrendingUp,
  Calendar, Wallet, Download, FileSpreadsheet, FileType,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const ALLOWED_MONTHS: { year: number; month: number }[] = [];
for (let i = 0; i < 6; i++) {
  const d = new Date(CURRENT_YEAR, CURRENT_MONTH - 1 - i, 1);
  ALLOWED_MONTHS.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
}
const YEARS = [...new Set(ALLOWED_MONTHS.map(m => m.year))];

// ─── Pricing state (fetched from DB) ─────────────────────────────────────────
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
  if (isMale) {
    return {
      chat_charge: `Chat — ₹${p.rate_per_minute}/min`,
      chat_debit: `Chat — ₹${p.rate_per_minute}/min`,
      video_call_charge: `Video Call — ₹${p.video_rate_per_minute}/min`,
      video_debit: `Video Call — ₹${p.video_rate_per_minute}/min`,
      audio_call_charge: `Audio Call — ₹${p.audio_rate_per_minute}/min`,
      audio_debit: `Audio Call — ₹${p.audio_rate_per_minute}/min`,
      group_call_charge: `Group Call — ₹${p.group_call_rate_per_minute}/min per man`,
      gift_charge: "Gift Sent — 100% deducted",
      gift_debit: "Gift Sent — 100% deducted",
      tip_charge: "Tip Sent — 100% deducted",
      recharge: "Wallet Recharge",
      opening_balance: "Opening Balance",
    };
  }
  return {
    chat: `Chat Earning — ₹${p.women_earning_rate}/min`,
    chat_credit: `Chat Earning — ₹${p.women_earning_rate}/min`,
    video_call: `Video Call Earning — ₹${p.video_women_earning_rate}/min`,
    video_credit: `Video Call Earning — ₹${p.video_women_earning_rate}/min`,
    audio_call: `Audio Call Earning — ₹${p.audio_women_earning_rate}/min`,
    audio_credit: `Audio Call Earning — ₹${p.audio_women_earning_rate}/min`,
    group_call_earning: `Group Call Earning — ₹${p.group_call_women_earning_rate}/min × men`,
    group_call: `Group Call Earning — ₹${p.group_call_women_earning_rate}/min × men`,
    gift_earning: `Gift Received — ${p.gift_women_percent}% credited (platform keeps ${100 - p.gift_women_percent}%)`,
    gift_credit: `Gift Received — ${p.gift_women_percent}% credited (platform keeps ${100 - p.gift_women_percent}%)`,
    tip_earning: `Tip Received — ${p.gift_women_percent}% credited (platform keeps ${100 - p.gift_women_percent}%)`,
    withdrawal: "Bank Withdrawal",
    payout: "Bank Withdrawal",
  };
}

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

const fmtINR = (v: number) => `₹${Number(v).toFixed(2)}`;
const fmtDuration = (sec: number | null) => {
  if (!sec || sec <= 0) return "—";
  const totalSec = Math.round(sec);
  const totalMin = Math.floor(totalSec / 60);
  const remainSec = totalSec % 60;
  if (totalMin === 0) return `${remainSec} sec`;
  if (remainSec === 0) return `${totalMin} min`;
  return `${totalMin} min ${remainSec} sec`;
};
const fmtTimeIST = (dateStr: string | null) => {
  if (!dateStr) return null;
  const ist = new Date(new Date(dateStr).getTime() + 5.5 * 60 * 60 * 1000);
  return format(ist, "HH:mm:ss");
};

interface TransactionStatementTabProps {
  gender: "male" | "female";
}

const TransactionStatementTab = ({ gender }: TransactionStatementTabProps) => {
  const isMale = gender === "male";
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(CURRENT_MONTH));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pricing, setPricing] = useState<ChatPricing>(DEFAULT_PRICING);

  // Fetch pricing from DB once
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("chat_pricing")
        .select("rate_per_minute, women_earning_rate, video_rate_per_minute, video_women_earning_rate, audio_rate_per_minute, audio_women_earning_rate, group_call_rate_per_minute, group_call_women_earning_rate, gift_women_percent")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (data) setPricing(data as ChatPricing);
    })();
  }, []);

  const rateLabels = buildRateLabels(pricing, isMale);
  const typeLabel = (t: string) => rateLabels[t] || t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const loadStatement = useCallback(async () => {
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
  }, [year, month]);

  useEffect(() => { loadStatement(); }, [loadStatement]);

  // ─── Rate display helpers ─────────────────────────────────────────────────
  const menRateText = `Chat ₹${pricing.rate_per_minute}/min · Video ₹${pricing.video_rate_per_minute}/min · Audio ₹${pricing.audio_rate_per_minute}/min · Group ₹${pricing.group_call_rate_per_minute}/min · Gift/Tip 100%`;
  const womenRateText = `Chat ₹${pricing.women_earning_rate}/min · Video ₹${pricing.video_women_earning_rate}/min · Audio ₹${pricing.audio_women_earning_rate}/min · Group ₹${pricing.group_call_women_earning_rate}/min×men · Gift/Tip ${pricing.gift_women_percent}% (platform keeps ${100 - pricing.gift_women_percent}%)`;

  // ─── Export helpers ───────────────────────────────────────────────────

  const getExportData = () => {
    const monthName = MONTH_NAMES[parseInt(month) - 1];
    const title = isMale ? "Wallet Statement" : "Earnings Statement";
    const header = `${title} — ${monthName} ${year}`;

    const headerRow = ["Date & Time (IST)", "Type", "Description", "Start Time", "End Time", "Duration", "Rate", "Debit (₹)", "Credit (₹)", "Balance (₹)"];

    const dataRows = rows.map(row => {
      const istDate = new Date(new Date(row.txn_date).getTime() + 5.5 * 60 * 60 * 1000);
      return [
        format(istDate, "dd MMM yyyy HH:mm"),
        typeLabel(row.txn_type),
        row.description || "—",
        fmtTimeIST(row.start_time) || "—",
        fmtTimeIST(row.end_time) || "—",
        fmtDuration(row.duration_seconds),
        row.rate_per_minute ? `₹${Number(row.rate_per_minute).toFixed(2)}/min` : "—",
        Number(row.debit) > 0 ? Number(row.debit).toFixed(2) : "—",
        Number(row.credit) > 0 ? Number(row.credit).toFixed(2) : "—",
        Number(row.running_balance).toFixed(2),
      ];
    });

    return { header, headerRow, dataRows, monthName, title };
  };

  const exportToCSV = () => {
    if (rows.length === 0) { toast.error("No data to export"); return; }
    setExporting(true);
    try {
      const { header, headerRow, dataRows } = getExportData();
      const csvContent = [
        [header],
        [],
        summary ? [`Opening Balance: ${fmtINR(summary.opening_balance)}`] : [],
        headerRow,
        ...dataRows,
        [],
        summary ? [`Closing Balance: ${fmtINR(summary.closing_balance)}`] : [],
      ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

      downloadFile(csvContent, `statement_${year}_${month}.csv`, "text/csv");
      toast.success("Excel-compatible CSV exported");
    } finally { setExporting(false); }
  };

  const exportToPDF = () => {
    if (rows.length === 0) { toast.error("No data to export"); return; }
    setExporting(true);
    try {
      const { header, headerRow, dataRows, monthName } = getExportData();

      const htmlContent = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${header}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; color: #1a1a1a; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 16px; }
  .summary { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .summary-card { border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; min-width: 140px; }
  .summary-card .label { font-size: 10px; text-transform: uppercase; color: #888; }
  .summary-card .value { font-size: 16px; font-weight: bold; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f5f5f5; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; font-size: 10px; text-transform: uppercase; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
  tr:nth-child(even) { background: #fafafa; }
  .text-right { text-align: right; }
  .debit { color: #dc2626; }
  .credit { color: #16a34a; }
  .footer { margin-top: 16px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
  .totals { font-weight: bold; background: #f0f0f0 !important; border-top: 2px solid #ccc; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<h1>${isMale ? "💰 Wallet Statement" : "💰 Earnings Statement"}</h1>
<div class="subtitle">${monthName} ${year} • Currency: INR • Timestamps in IST (UTC+5:30)</div>

${summary ? `
<div class="summary">
  <div class="summary-card"><div class="label">Opening Balance</div><div class="value">${fmtINR(summary.opening_balance)}</div></div>
  <div class="summary-card"><div class="label">${isMale ? "Total Charged" : "Total Earned"}</div><div class="value ${isMale ? "debit" : "credit"}">${fmtINR(isMale ? summary.total_debit : summary.total_credit)}</div></div>
  <div class="summary-card"><div class="label">${isMale ? "Total Recharged" : "Withdrawals"}</div><div class="value ${isMale ? "credit" : "debit"}">${fmtINR(isMale ? summary.total_credit : summary.total_debit)}</div></div>
  <div class="summary-card"><div class="label">Closing Balance</div><div class="value">${fmtINR(summary.closing_balance)}</div></div>
</div>` : ""}

<table>
<thead><tr>${headerRow.map(h => `<th${h.includes("₹") || h.includes("Balance") ? ' class="text-right"' : ""}>${h}</th>`).join("")}</tr></thead>
<tbody>
${dataRows.map(r => `<tr>${r.map((c, i) => `<td${i >= 5 ? ' class="text-right ' + (i === 5 ? (isMale ? "debit" : "credit") : i === 6 ? (isMale ? "credit" : "debit") : "") + '"' : ""}>${c}</td>`).join("")}</tr>`).join("\n")}
${rows.length > 0 ? `<tr class="totals">
  <td colspan="5" class="text-right">Totals:</td>
  <td class="text-right ${isMale ? "debit" : "credit"}">${Number(rows.reduce((s, r) => s + Number(r.debit), 0)).toFixed(2)}</td>
  <td class="text-right ${isMale ? "credit" : "debit"}">${Number(rows.reduce((s, r) => s + Number(r.credit), 0)).toFixed(2)}</td>
  <td class="text-right">${summary ? fmtINR(summary.closing_balance) : "—"}</td>
</tr>` : ""}
</tbody>
</table>

<div class="footer">
  <p>System-generated statement. Currency: INR. All timestamps shown in IST (UTC+5:30). Duration = exact seconds ÷ 60.</p>
  <p>Rates: ${isMale ? menRateText : womenRateText}.</p>
  <p>${isMale ? "No overcharging — exact session duration × rate." : "No undercharging — exact session duration × rate."}</p>
</div>
</body></html>`;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
        toast.success("PDF print dialog opened");
      } else {
        toast.error("Pop-up blocked. Please allow pop-ups to export PDF.");
      }
    } finally { setExporting(false); }
  };

  const exportToWord = () => {
    if (rows.length === 0) { toast.error("No data to export"); return; }
    setExporting(true);
    try {
      const { header, headerRow, dataRows, monthName } = getExportData();

      const wordHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${header}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 30px; font-size: 11pt; }
  h1 { font-size: 16pt; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; font-size: 9pt; }
  th { background-color: #f0f0f0; }
  .text-right { text-align: right; }
</style></head><body>
<h1>${isMale ? "Wallet Statement" : "Earnings Statement"}</h1>
<p>${monthName} ${year} • Currency: INR • IST (UTC+5:30)</p>
${summary ? `<p><b>Opening:</b> ${fmtINR(summary.opening_balance)} | <b>${isMale ? "Charged" : "Earned"}:</b> ${fmtINR(isMale ? summary.total_debit : summary.total_credit)} | <b>${isMale ? "Recharged" : "Withdrawn"}:</b> ${fmtINR(isMale ? summary.total_credit : summary.total_debit)} | <b>Closing:</b> ${fmtINR(summary.closing_balance)}</p>` : ""}
<table><thead><tr>${headerRow.map(h => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>${dataRows.map(r => `<tr>${r.map((c, i) => `<td${i >= 4 ? ' class="text-right"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
<p style="font-size:8pt;color:#999;margin-top:12px;">Rates: ${isMale ? menRateText : womenRateText}. Duration = exact seconds ÷ 60.</p>
</body></html>`;

      const blob = new Blob(["\ufeff", wordHtml], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statement_${year}_${month}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Word document exported");
    } finally { setExporting(false); }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 px-1">
      {/* Title */}
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">{isMale ? "Wallet Statement" : "Earnings Statement"}</h2>
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
                <span>👥 Group: ₹{pricing.group_call_rate_per_minute}/min</span>
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

      {/* Period selector + Export */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-4 gap-3 items-end">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="default" disabled={exporting || rows.length === 0} className="h-8 gap-1">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToWord}>
                  <FileType className="h-4 w-4 mr-2" />
                  Export as Word
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            { label: "Opening Balance", value: summary.opening_balance, icon: <Wallet className="h-4 w-4" />, color: "text-foreground" },
            { label: isMale ? "Total Charged" : "Total Earned", value: isMale ? summary.total_debit : summary.total_credit, icon: isMale ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />, color: isMale ? "text-destructive" : "text-green-600" },
            { label: isMale ? "Total Recharged" : "Withdrawals", value: isMale ? summary.total_credit : summary.total_debit, icon: isMale ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />, color: isMale ? "text-green-600" : "text-destructive" },
            { label: "Closing Balance", value: summary.closing_balance, icon: <Calendar className="h-4 w-4" />, color: summary.closing_balance >= 0 ? "text-green-600" : "text-destructive" },
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
                     <TableHead className="text-xs">Description</TableHead>
                     <TableHead className="text-xs">Start</TableHead>
                     <TableHead className="text-xs">End</TableHead>
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
                   {summary && (
                     <TableRow className="bg-muted/20">
                       <TableCell className="text-xs text-muted-foreground" colSpan={7}>
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
                     const istDate = new Date(new Date(row.txn_date).getTime() + 5.5 * 60 * 60 * 1000);
                     return (
                       <TableRow key={i} className="hover:bg-muted/30">
                         <TableCell className="text-xs whitespace-nowrap">
                           {format(istDate, "dd MMM yyyy HH:mm")}
                         </TableCell>
                         <TableCell className="text-xs">
                           <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">
                             {typeLabel(row.txn_type)}
                           </Badge>
                         </TableCell>
                         <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={row.description || ""}>
                           {row.description || "—"}
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

                  {rows.length > 0 && (
                    <TableRow className="bg-muted/60 font-semibold border-t-2">
                      <TableCell colSpan={7} className="text-xs text-right pr-2">Totals:</TableCell>
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

          <div className="px-4 py-3 border-t text-[10px] text-muted-foreground text-center space-y-0.5">
            <p>System-generated statement. Currency: INR. All timestamps shown in IST (UTC+5:30). Duration = exact seconds ÷ 60.</p>
            <p>Rates: {isMale ? menRateText : womenRateText}.</p>
            <p>{isMale
              ? "No overcharging — exact session duration × rate."
              : "No undercharging — exact session duration × rate."}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionStatementTab;

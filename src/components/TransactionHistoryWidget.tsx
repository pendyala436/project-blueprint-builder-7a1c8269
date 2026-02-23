import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Wallet,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  FileDown,
  FileSpreadsheet
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface UnifiedTransaction {
  id: string;
  type: 'recharge' | 'chat' | 'video' | 'gift' | 'withdrawal' | 'earning' | 'other';
  amount: number;
  description: string;
  created_at: string;
  status: string;
  counterparty?: string;
  balance_after?: number;
  is_credit: boolean;
  reference_id?: string;
  duration?: number;
  rate?: number;
}

interface TransactionHistoryWidgetProps {
  userId: string;
  userGender: 'male' | 'female';
  maxItems?: number;
  showViewAll?: boolean;
  compact?: boolean;
}

export const TransactionHistoryWidget = ({
  userId,
  userGender,
  maxItems = 50,
  showViewAll = true,
  compact = false
}: TransactionHistoryWidgetProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [pricingRates, setPricingRates] = useState<{ chatRate: number; videoRate: number; menChatRate: number; menVideoRate: number } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (userId) {
      supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle()
        .then(({ data }) => setUserName(data?.full_name || "User"));
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadTransactions();
      loadPricingRates();
    }
  }, [userId, userGender, selectedMonth]);

  const loadPricingRates = async () => {
    const { data } = await supabase
      .from("chat_pricing")
      .select("rate_per_minute, video_rate_per_minute, women_earning_rate, video_women_earning_rate")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setPricingRates({
        chatRate: Number(data.women_earning_rate) || 2,
        videoRate: Number(data.video_women_earning_rate) || 4,
        menChatRate: Number(data.rate_per_minute) || 4,
        menVideoRate: Number(data.video_rate_per_minute) || 8,
      });
    }
  };

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`transaction-widget-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_transactions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'women_earnings' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_chat_sessions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_call_sessions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_calls' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_pricing' }, () => loadTransactions())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const monthStart = startOfMonth(selectedMonth).toISOString();
  const monthEnd = endOfMonth(selectedMonth).toISOString();

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const unified: UnifiedTransaction[] = [];
      let openingBalance = 0;

      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (wallet) {
        // For men: use wallet balance directly. For women: calculate from earnings - debits
        if (userGender === 'male') {
          setCurrentBalance(Number(wallet.balance) || 0);
        }

        // Calculate opening balance: all prior credits - all prior debits from wallet_transactions
        const { data: priorTxData } = await supabase
          .from("wallet_transactions")
          .select("type, amount")
          .eq("user_id", userId)
          .lt("created_at", monthStart);

        priorTxData?.forEach(tx => {
          if (tx.type === 'credit') openingBalance += Number(tx.amount);
          else openingBalance -= Number(tx.amount);
        });

        // For women: add prior earnings (these are separate from wallet_transactions)
        if (userGender === 'female') {
          const { data: priorEarnings } = await supabase
            .from("women_earnings")
            .select("amount")
            .eq("user_id", userId)
            .lt("created_at", monthStart);

          priorEarnings?.forEach(e => {
            openingBalance += Number(e.amount);
          });
        }

        const { data: txData } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
          .order("created_at", { ascending: true });

        txData?.forEach(tx => {
          const desc = tx.description?.toLowerCase() || '';
          let type: UnifiedTransaction['type'] = 'other';
          if (desc.includes('recharge')) type = 'recharge';
          else if (desc.includes('gift')) type = 'gift';
          else if (desc.includes('chat')) type = 'chat';
          else if (desc.includes('video')) type = 'video';
          else if (desc.includes('withdrawal')) type = 'withdrawal';
          else if (desc.includes('golden badge')) type = 'other';

          unified.push({
            id: tx.id,
            type,
            amount: Number(tx.amount),
            description: tx.description || (tx.type === 'credit' ? 'Credit' : 'Debit'),
            created_at: tx.created_at,
            status: tx.status,
            is_credit: tx.type === 'credit',
            reference_id: tx.reference_id || tx.id.slice(0, 8).toUpperCase(),
          });
        });
      }

      // Get gift transactions for this month — only for enriching descriptions
      // The actual debit/credit amounts are already in wallet_transactions (for men) or women_earnings (for women)
      const { data: giftsData } = await supabase
        .from("gift_transactions")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)
        .order("created_at", { ascending: false });

      if (giftsData?.length) {
        const giftIds = [...new Set(giftsData.map(g => g.gift_id))];
        const partnerIds = [...new Set(giftsData.map(g => 
          g.sender_id === userId ? g.receiver_id : g.sender_id
        ))];

        const [{ data: gifts }, { data: profiles }] = await Promise.all([
          supabase.from("gifts").select("id, name, emoji").in("id", giftIds),
          supabase.from("profiles").select("user_id, full_name").in("user_id", partnerIds)
        ]);

        const giftMap = new Map(gifts?.map(g => [g.id, g]) || []);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        // Enrich existing wallet_transactions that are gift-related with better descriptions
        giftsData.forEach(g => {
          const isSender = g.sender_id === userId;
          const giftInfo = giftMap.get(g.gift_id);
          const partnerName = profileMap.get(isSender ? g.receiver_id : g.sender_id) || "Anonymous";

          // For senders: find matching wallet_transaction debit and enrich description
          if (isSender) {
            const matchingTx = unified.find(u => 
              u.type === 'gift' && !u.is_credit && 
              Math.abs(new Date(u.created_at).getTime() - new Date(g.created_at).getTime()) < 2000
            );
            if (matchingTx) {
              matchingTx.description = `${giftInfo?.emoji || '🎁'} Sent ${giftInfo?.name || 'Gift'} to ${partnerName}`;
              matchingTx.counterparty = partnerName;
            }
          }
          // For women receiving gifts: already in women_earnings, skip
          // For men receiving gifts: add as credit if not already in wallet_transactions
          if (!isSender && userGender === 'male') {
            if (!unified.some(u => u.id === g.id || u.id === `gift-${g.id}`)) {
              unified.push({
                id: `gift-${g.id}`,
                type: 'gift',
                amount: Number(g.price_paid),
                description: `${giftInfo?.emoji || '🎁'} Received ${giftInfo?.name || 'Gift'} from ${partnerName}`,
                created_at: g.created_at,
                status: g.status,
                counterparty: partnerName,
                is_credit: true,
                reference_id: g.id.slice(0, 8).toUpperCase(),
              });
            }
          }
        });
      }

      // For women: Get ALL earnings this month and calculate correct balance
      if (userGender === 'female') {
        const [{ data: earnings }, { data: allEarnings }, { data: allDebits }, { data: chatSessions }] = await Promise.all([
          supabase
            .from("women_earnings")
            .select("*")
            .eq("user_id", userId)
            .gte("created_at", monthStart)
            .lte("created_at", monthEnd)
            .order("created_at", { ascending: false }),
          supabase
            .from("women_earnings")
            .select("amount")
            .eq("user_id", userId),
          supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("user_id", userId)
            .eq("type", "debit"),
          supabase
            .from("active_chat_sessions")
            .select("*")
            .eq("woman_user_id", userId)
            .gte("started_at", monthStart)
            .lte("started_at", monthEnd)
            .order("started_at", { ascending: false })
        ]);

        // Set correct balance for women: total earnings - total debits
        const totalEarnings = allEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const totalDebits = allDebits?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        setCurrentBalance(totalEarnings - totalDebits);

        // Track earning IDs to avoid duplicates
        const earningSessionIds = new Set<string>();

        earnings?.forEach(e => {
          let description = e.description || `${e.earning_type} earnings`;
          if (e.earning_type === 'chat') description = `💬 Chat earnings`;
          else if (e.earning_type === 'video_call') description = `📹 Video call earnings`;
          else if (e.earning_type === 'gift') description = `🎁 Gift earnings`;
          else if (e.earning_type === 'private_call') description = `📞 Private call earnings`;

          if (e.chat_session_id) earningSessionIds.add(e.chat_session_id);

          unified.push({
            id: `earning-${e.id}`,
            type: 'earning',
            amount: Number(e.amount),
            description,
            created_at: e.created_at,
            status: 'completed',
            is_credit: true,
            reference_id: e.id.slice(0, 8).toUpperCase(),
          });
        });

        // Get man profile names for chat sessions
        const manIds = [...new Set(chatSessions?.map(s => s.man_user_id) || [])];
        let manProfileMap = new Map<string, string>();
        if (manIds.length > 0) {
          const { data: manProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", manIds);
          manProfileMap = new Map(manProfiles?.map(p => [p.user_id, p.full_name || 'Unknown']) || []);
        }

        // Add ALL chat sessions to statement — always include regardless of earnings
        chatSessions?.forEach(session => {
          // Only skip if there's a direct match by session ID in earnings
          if (earningSessionIds.has(session.id) || earningSessionIds.has(session.chat_id)) return;

          const manName = manProfileMap.get(session.man_user_id) || 'Unknown';
          const startTime = new Date(session.started_at);
          const endTime = session.ended_at ? new Date(session.ended_at) : startTime;
          const durationSeconds = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 1000));
          
          // Calculate earning using per-second precision from admin rate
          const ratePerMin = pricingRates?.chatRate || Number(session.rate_per_minute) / 2 || 2;
          const calculatedAmount = (durationSeconds / 60) * ratePerMin;

          unified.push({
            id: `session-${session.id}`,
            type: 'chat',
            amount: calculatedAmount,
            description: `💬 Chat with ${manName} (${durationSeconds}s @ ₹${ratePerMin}/min)`,
            created_at: session.started_at,
            status: session.status,
            is_credit: true,
            reference_id: session.id.slice(0, 8).toUpperCase(),
            duration: durationSeconds,
            rate: ratePerMin,
          });
        });
      }

      // For men: include chat sessions from active_chat_sessions
      if (userGender === 'male') {
        const { data: chatSessions } = await supabase
          .from("active_chat_sessions")
          .select("*")
          .eq("man_user_id", userId)
          .gte("started_at", monthStart)
          .lte("started_at", monthEnd)
          .order("started_at", { ascending: false });

        const womanIds = [...new Set(chatSessions?.map(s => s.woman_user_id) || [])];
        let womanProfileMap = new Map<string, string>();
        if (womanIds.length > 0) {
          const { data: womanProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", womanIds);
          womanProfileMap = new Map(womanProfiles?.map(p => [p.user_id, p.full_name || 'Unknown']) || []);
        }

        // Add ALL chat sessions to statement for men — always include
        chatSessions?.forEach(session => {
          const womanName = womanProfileMap.get(session.woman_user_id) || 'Unknown';
          const startTime = new Date(session.started_at);
          const endTime = session.ended_at ? new Date(session.ended_at) : startTime;
          const durationSeconds = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 1000));
          
          const ratePerMin = pricingRates?.menChatRate || Number(session.rate_per_minute) || 4;
          const calculatedAmount = (durationSeconds / 60) * ratePerMin;

          unified.push({
            id: `session-${session.id}`,
            type: 'chat',
            amount: calculatedAmount,
            description: `💬 Chat with ${womanName} (${durationSeconds}s @ ₹${ratePerMin}/min)`,
            created_at: session.started_at,
            status: session.status,
            is_credit: false,
            reference_id: session.id.slice(0, 8).toUpperCase(),
            duration: durationSeconds,
            rate: ratePerMin,
          });
        });
      }

      // Sort chronologically to calculate running balance
      unified.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      // ACID: Calculate running balance starting from opening balance (carry forward from previous month)
      setOpeningBalance(openingBalance);
      let runningBal = openingBalance;
      unified.forEach(tx => {
        if (tx.is_credit) {
          runningBal += tx.amount;
        } else {
          runningBal -= tx.amount;
        }
        tx.balance_after = runningBal;
      });

      // Reverse for display (newest first)
      unified.reverse();
      setTransactions(unified);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = useCallback(() => {
    if (!transactions.length) return;
    const monthLabel = format(selectedMonth, "MMMM yyyy");
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8">
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>Statement</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <style>
      td, th { mso-number-format:\\@; padding: 5px 8px; font-family: Calibri, sans-serif; font-size: 11pt; }
      .header-row { background: #7c3aed; color: #ffffff; font-weight: bold; font-size: 10pt; text-transform: uppercase; }
      .brand { background: #7c3aed; color: #ffffff; font-size: 16pt; font-weight: bold; padding: 10px; }
      .brand-sub { background: #7c3aed; color: #e9d5ff; font-size: 10pt; }
      .info-label { background: #f8fafc; color: #64748b; font-size: 10pt; }
      .info-value { background: #f8fafc; font-weight: bold; font-size: 10pt; }
      .balance-label { background: #f0fdf4; color: #15803d; font-size: 10pt; }
      .balance-value { background: #f0fdf4; color: #15803d; font-size: 14pt; font-weight: bold; }
      .red { color: #dc2626; font-weight: bold; }
      .green { color: #16a34a; font-weight: bold; }
      .even { background: #f8fafc; }
      .right { text-align: right; }
      .mono { font-family: Courier New; font-size: 9pt; color: #64748b; }
      .footer { color: #94a3b8; font-size: 9pt; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    </style></head><body>
    <table>
      <tr><td colspan="7" class="brand">🐱 Meow-meow</td></tr>
      <tr><td colspan="7" class="brand-sub">Transaction Statement — ${monthLabel}</td></tr>
      <tr><td colspan="7"></td></tr>
      <tr><td colspan="2" class="info-label">Company</td><td colspan="2" class="info-value">Meow-meow</td><td class="info-label">Statement Period</td><td colspan="2" class="info-value">${monthLabel}</td></tr>
      <tr><td colspan="2" class="info-label">Joint Holder</td><td colspan="2" class="info-value">${userName}</td><td class="info-label">Generated On</td><td colspan="2" class="info-value">${format(new Date(), "dd MMM yyyy, hh:mm a")}</td></tr>
      <tr><td colspan="2" class="info-label">Nominee Details</td><td colspan="2" class="info-value">Not Registered</td><td class="info-label">Account Status</td><td colspan="2" class="info-value" style="color:#16a34a;">● Active</td></tr>
      <tr><td colspan="7"></td></tr>
      <tr><td colspan="5" class="balance-label">Current Balance</td><td colspan="2" class="balance-value right">₹${currentBalance.toLocaleString()}</td></tr>
      <tr><td colspan="7"></td></tr>
      <tr class="header-row"><th>Transaction Date</th><th>Value Date</th><th>Description</th><th>Ref No.</th><th class="right">Withdrawals</th><th class="right">Deposits</th><th class="right">Running Balance</th></tr>
      <tr style="background:#ede9fe;font-weight:bold;">
        <td>${format(startOfMonth(selectedMonth), "dd/MM/yyyy")} 12:00 AM</td>
        <td>${format(startOfMonth(selectedMonth), "dd/MM/yyyy")}</td>
        <td>📋 Opening Balance (Carry Forward from ${format(subMonths(selectedMonth, 1), "MMM yyyy")})</td>
        <td class="mono">CF</td>
        <td>—</td>
        <td>—</td>
        <td class="right">₹${openingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
      </tr>`;

    transactions.forEach((tx, i) => {
      const rowClass = i % 2 === 0 ? '' : 'even';
      html += `<tr class="${rowClass}">
        <td>${format(new Date(tx.created_at), "dd/MM/yyyy hh:mm a")}</td>
        <td>${format(new Date(tx.created_at), "dd/MM/yyyy")}</td>
        <td>${tx.description}</td>
        <td class="mono">${tx.reference_id || '—'}</td>
        <td class="right ${!tx.is_credit ? 'red' : ''}">${!tx.is_credit ? `₹${tx.amount.toLocaleString()}` : '—'}</td>
        <td class="right ${tx.is_credit ? 'green' : ''}">${tx.is_credit ? `₹${tx.amount.toLocaleString()}` : '—'}</td>
        <td class="right">${tx.balance_after !== undefined ? `₹${tx.balance_after.toLocaleString()}` : '—'}</td>
      </tr>`;
    });
    html += `<tr><td colspan="7"></td></tr>
    <tr><td colspan="7" class="footer">This is a computer-generated statement from Meow-meow. No signature required.</td></tr>
    </table></body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Meowmeow_Statement_${format(selectedMonth, "MMM_yyyy")}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions, selectedMonth, currentBalance, userName, openingBalance]);

  const exportToPDF = useCallback(() => {
    if (!transactions.length) return;
    const monthLabel = format(selectedMonth, "MMMM yyyy");
    let html = `<html><head><title>Meow-meow Transaction Statement - ${monthLabel}</title>
    <style>
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; padding: 24px; color: #1e293b; }
      .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 16px; }
      .header h1 { margin: 0 0 4px 0; font-size: 22px; font-weight: 700; }
      .header p { margin: 0; font-size: 12px; opacity: 0.9; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 11px; }
      .info-label { color: #64748b; }
      .info-value { font-weight: 600; text-align: right; }
      .balance-bar { display: flex; justify-content: space-between; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 16px; margin-bottom: 16px; }
      .balance-bar .label { color: #15803d; font-size: 11px; }
      .balance-bar .value { color: #15803d; font-size: 16px; font-weight: 700; }
      table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 8px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
      th { background: #7c3aed; color: #fff; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
      td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
      tr:nth-child(even) td { background: #f8fafc; }
      tr:last-child td { border-bottom: none; }
      .red { color: #dc2626; font-weight: 600; }
      .green { color: #16a34a; font-weight: 600; }
      .right { text-align: right; }
      .mono { font-family: 'Courier New', monospace; font-size: 10px; color: #64748b; }
      .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    </style></head><body>
    <div class="header">
      <h1>🐱 Meow-meow</h1>
      <p>Transaction Statement — ${monthLabel}</p>
    </div>
    <div class="info-grid">
      <span class="info-label">Company</span><span class="info-value">Meow-meow</span>
      <span class="info-label">Joint Holder</span><span class="info-value">${userName}</span>
      <span class="info-label">Nominee Details</span><span class="info-value">Not Registered</span>
      <span class="info-label">Account Status</span><span class="info-value" style="color:#16a34a;">● Active</span>
      <span class="info-label">Statement Period</span><span class="info-value">${monthLabel}</span>
      <span class="info-label">Generated On</span><span class="info-value">${format(new Date(), "dd MMM yyyy, hh:mm a")}</span>
    </div>
    <div class="balance-bar">
      <div><span class="label">Current Balance</span></div>
      <div><span class="value">₹${currentBalance.toLocaleString()}</span></div>
    </div>
    <table>
    <tr><th>Transaction Date</th><th>Value Date</th><th>Description</th><th>Ref No.</th><th class="right">Withdrawals</th><th class="right">Deposits</th><th class="right">Running Balance</th></tr>
    <tr style="background:#ede9fe;font-weight:bold;">
      <td>${format(startOfMonth(selectedMonth), "dd/MM/yyyy")} 12:00 AM</td>
      <td>${format(startOfMonth(selectedMonth), "dd/MM/yyyy")}</td>
      <td>📋 Opening Balance (Carry Forward from ${format(subMonths(selectedMonth, 1), "MMM yyyy")})</td>
      <td class="mono">CF</td>
      <td>—</td>
      <td>—</td>
      <td class="right">₹${openingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
    </tr>`;
    
    transactions.forEach(tx => {
      html += `<tr>
        <td>${format(new Date(tx.created_at), "dd/MM/yyyy hh:mm a")}</td>
        <td>${format(new Date(tx.created_at), "dd/MM/yyyy")}</td>
        <td>${tx.description}</td>
        <td class="mono">${tx.reference_id || '—'}</td>
        <td class="right ${!tx.is_credit ? 'red' : ''}">${!tx.is_credit ? `₹${tx.amount.toLocaleString()}` : '—'}</td>
        <td class="right ${tx.is_credit ? 'green' : ''}">${tx.is_credit ? `₹${tx.amount.toLocaleString()}` : '—'}</td>
        <td class="right">${tx.balance_after !== undefined ? `₹${tx.balance_after.toLocaleString()}` : '—'}</td>
      </tr>`;
    });
    html += `</table>
    <div class="footer">This is a computer-generated statement from Meow-meow. No signature required.</div>
    </body></html>`;
    
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }, [transactions, selectedMonth, currentBalance, userName, openingBalance]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Transaction Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-full h-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Transaction Statement
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              Balance: ₹{currentBalance.toLocaleString()}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadTransactions}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold">
            {format(selectedMonth, "MMMM yyyy")}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
            disabled={startOfMonth(addMonths(selectedMonth, 1)) > startOfMonth(new Date())}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Account Info Header */}
        <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Company:</span><span className="font-medium">Meow-meow</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Joint Holder:</span><span className="font-medium">{userName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Nominee Details:</span><span className="font-medium">Not Registered</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Account Status:</span><Badge variant="successOutline" className="text-[10px] h-4">Active</Badge></div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!transactions.length}>
            <FileDown className="w-3.5 h-3.5 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!transactions.length}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            Excel
          </Button>
        </div>

        {pricingRates && (
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>Rates ({userGender === 'female' ? 'Earning' : 'Spending'}):</span>
            {userGender === 'female' ? (
              <>
                <Badge variant="outline" className="text-xs">Chat: ₹{pricingRates.chatRate}/min (₹{(pricingRates.chatRate / 60).toFixed(4)}/sec)</Badge>
                <Badge variant="outline" className="text-xs">Video: ₹{pricingRates.videoRate}/min (₹{(pricingRates.videoRate / 60).toFixed(4)}/sec)</Badge>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-xs">Chat: ₹{pricingRates.menChatRate}/min (₹{(pricingRates.menChatRate / 60).toFixed(4)}/sec)</Badge>
                <Badge variant="outline" className="text-xs">Video: ₹{pricingRates.menVideoRate}/min (₹{(pricingRates.menVideoRate / 60).toFixed(4)}/sec)</Badge>
              </>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No transactions for {format(selectedMonth, "MMMM yyyy")}
          </div>
        ) : (
          <ScrollArea className={compact ? "h-[250px]" : "h-[400px]"}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Transaction Date</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Value Date</TableHead>
                  <TableHead className="text-xs font-semibold">Description</TableHead>
                  <TableHead className="text-xs font-semibold whitespace-nowrap">Ref No.</TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap text-destructive">Withdrawals</TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap text-green-600">Deposits</TableHead>
                  <TableHead className="text-xs font-semibold text-right whitespace-nowrap">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Opening Balance Carry Forward Row */}
                <TableRow className="bg-primary/5 border-b-2 border-primary/20">
                  <TableCell className="whitespace-nowrap py-2 text-xs font-semibold">
                    {format(startOfMonth(selectedMonth), "dd/MM/yyyy")}
                    <div className="text-muted-foreground text-[10px]">12:00 AM</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-2 text-xs">
                    {format(startOfMonth(selectedMonth), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="py-2 text-xs">
                    <span className="font-bold">📋 Opening Balance (Carry Forward)</span>
                    <span className="text-muted-foreground text-[10px] block">
                      Net balance from {format(subMonths(selectedMonth, 1), "MMMM yyyy")}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-2 font-mono text-muted-foreground text-xs">CF</TableCell>
                  <TableCell className="text-right whitespace-nowrap py-2 text-xs">—</TableCell>
                  <TableCell className="text-right whitespace-nowrap py-2 text-xs">—</TableCell>
                  <TableCell className="text-right whitespace-nowrap py-2 font-bold text-xs text-primary">
                    ₹{openingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="text-xs">
                    <TableCell className="whitespace-nowrap py-2">
                      {format(new Date(tx.created_at), "dd/MM/yyyy")}
                      <div className="text-muted-foreground text-[10px]">
                        {format(new Date(tx.created_at), "hh:mm a")}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2">
                      {format(new Date(tx.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="py-2 max-w-[200px]">
                      <span className="font-medium block truncate">{tx.description}</span>
                      {tx.duration !== undefined && tx.rate !== undefined && (
                        <span className="text-muted-foreground text-[10px] block">
                          {Math.round(tx.duration * 60)}s × ₹{(tx.rate / 60).toFixed(4)}/sec = ₹{(tx.duration * tx.rate).toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2 font-mono text-muted-foreground">
                      {tx.reference_id || '—'}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right whitespace-nowrap py-2 font-semibold",
                      !tx.is_credit ? "text-destructive" : ""
                    )}>
                      {!tx.is_credit ? `₹${tx.amount.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right whitespace-nowrap py-2 font-semibold",
                      tx.is_credit ? "text-green-600" : ""
                    )}>
                      {tx.is_credit ? `₹${tx.amount.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap py-2 font-bold">
                      {tx.balance_after !== undefined ? `₹${tx.balance_after.toLocaleString()}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
        
        {showViewAll && transactions.length > 0 && (
          <Button 
            variant="ghost" 
            className="w-full mt-2 text-sm"
            onClick={() => navigate("/transactions")}
          >
            View All Transactions
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistoryWidget;

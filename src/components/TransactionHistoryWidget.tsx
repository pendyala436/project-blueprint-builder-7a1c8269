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
  const [earningRates, setEarningRates] = useState<{ chatRate: number; videoRate: number } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    if (userId) {
      loadTransactions();
      if (userGender === 'female') {
        loadEarningRates();
      }
    }
  }, [userId, userGender, selectedMonth]);

  const loadEarningRates = async () => {
    const { data } = await supabase
      .from("chat_pricing")
      .select("women_earning_rate, video_women_earning_rate")
      .eq("is_active", true)
      .maybeSingle();
    
    if (data) {
      setEarningRates({
        chatRate: Number(data.women_earning_rate) || 0,
        videoRate: Number(data.video_women_earning_rate) || 0
      });
    }
  };

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`transaction-widget-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_transactions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'women_earnings' }, () => loadTransactions())
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

      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (wallet) {
        setCurrentBalance(Number(wallet.balance) || 0);

        const { data: txData } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
          .order("created_at", { ascending: true })
          .limit(500);

        // Calculate running balance by getting all transactions before this month
        const { data: priorTx } = await supabase
          .from("wallet_transactions")
          .select("type, amount")
          .eq("user_id", userId)
          .lt("created_at", monthStart)
          .order("created_at", { ascending: true });

        let runningBalance = 0;
        priorTx?.forEach(tx => {
          if (tx.type === 'credit') {
            runningBalance += Number(tx.amount);
          } else {
            runningBalance -= Number(tx.amount);
          }
        });

        txData?.forEach(tx => {
          if (tx.type === 'credit') {
            runningBalance += Number(tx.amount);
          } else {
            runningBalance -= Number(tx.amount);
          }

          const desc = tx.description?.toLowerCase() || '';
          let type: UnifiedTransaction['type'] = 'other';
          if (desc.includes('recharge')) type = 'recharge';
          else if (desc.includes('gift')) type = 'gift';
          else if (desc.includes('chat')) type = 'chat';
          else if (desc.includes('video')) type = 'video';
          else if (desc.includes('withdrawal')) type = 'withdrawal';

          unified.push({
            id: tx.id,
            type,
            amount: Number(tx.amount),
            description: tx.description || (tx.type === 'credit' ? 'Credit' : 'Debit'),
            created_at: tx.created_at,
            status: tx.status,
            balance_after: runningBalance,
            is_credit: tx.type === 'credit',
            reference_id: tx.reference_id || tx.id.slice(0, 8).toUpperCase(),
          });
        });
      }

      // Get gift transactions for this month
      const { data: giftsData } = await supabase
        .from("gift_transactions")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)
        .order("created_at", { ascending: false })
        .limit(maxItems);

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

        giftsData.forEach(g => {
          const isSender = g.sender_id === userId;
          const giftInfo = giftMap.get(g.gift_id);
          const partnerName = profileMap.get(isSender ? g.receiver_id : g.sender_id) || "Anonymous";
          
          if (!unified.some(u => u.id === g.id)) {
            unified.push({
              id: `gift-${g.id}`,
              type: 'gift',
              amount: Number(g.price_paid),
              description: isSender 
                ? `${giftInfo?.emoji || '🎁'} Sent ${giftInfo?.name || 'Gift'} to ${partnerName}`
                : `${giftInfo?.emoji || '🎁'} Received ${giftInfo?.name || 'Gift'} from ${partnerName}`,
              created_at: g.created_at,
              status: g.status,
              counterparty: partnerName,
              is_credit: !isSender,
              reference_id: g.id.slice(0, 8).toUpperCase(),
            });
          }
        });
      }

      // For women: Get earnings this month
      if (userGender === 'female') {
        const { data: earnings } = await supabase
          .from("women_earnings")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
          .order("created_at", { ascending: false })
          .limit(maxItems);

        earnings?.forEach(e => {
          let description = e.description || `${e.earning_type} earnings`;
          if (e.earning_type === 'chat') description = `💬 Chat earnings`;
          else if (e.earning_type === 'video_call') description = `📹 Video call earnings`;
          else if (e.earning_type === 'gift') description = `🎁 Gift earnings`;
          else if (e.earning_type === 'private_call') description = `📞 Private call earnings`;

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
      }

      // Sort by date descending for display
      unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(unified);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = useCallback(() => {
    if (!transactions.length) return;
    const headers = ["Transaction Date", "Value Date", "Description", "Reference Number", "Withdrawals", "Deposits", "Running Balance"];
    const rows = transactions.map(tx => [
      format(new Date(tx.created_at), "dd/MM/yyyy hh:mm a"),
      format(new Date(tx.created_at), "dd/MM/yyyy"),
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.reference_id || '',
      !tx.is_credit ? tx.amount.toString() : '',
      tx.is_credit ? tx.amount.toString() : '',
      tx.balance_after !== undefined ? tx.balance_after.toString() : ''
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${format(selectedMonth, "MMM_yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions, selectedMonth]);

  const exportToPDF = useCallback(() => {
    if (!transactions.length) return;
    const monthLabel = format(selectedMonth, "MMMM yyyy");
    let html = `<html><head><title>Transactions - ${monthLabel}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
      h2 { text-align: center; margin-bottom: 4px; }
      h4 { text-align: center; color: #666; margin-top: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #f0f0f0; font-size: 11px; }
      .red { color: #dc2626; }
      .green { color: #16a34a; }
      .right { text-align: right; }
      .mono { font-family: monospace; }
    </style></head><body>
    <h2>Transaction Statement</h2>
    <h4>${monthLabel} | Balance: ₹${currentBalance.toLocaleString()}</h4>
    <table>
    <tr><th>Transaction Date</th><th>Value Date</th><th>Description</th><th>Ref No.</th><th class="right">Withdrawals</th><th class="right">Deposits</th><th class="right">Running Balance</th></tr>`;
    
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
    html += `</table></body></html>`;
    
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }, [transactions, selectedMonth, currentBalance]);

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

        {userGender === 'female' && earningRates && (
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>Earning Rates:</span>
            <Badge variant="outline" className="text-xs">Chat: ₹{earningRates.chatRate}/min</Badge>
            <Badge variant="outline" className="text-xs">Video: ₹{earningRates.videoRate}/min</Badge>
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
                          {tx.duration.toFixed(1)} min × ₹{tx.rate}/min
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

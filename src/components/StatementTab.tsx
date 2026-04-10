/**
 * StatementTab — Inline transaction statement for dashboard.
 * Per spec §11.6: duration is read from stored integer, NEVER recomputed.
 * Per spec §6.3: shows opening/closing balance, date, type, duration, amount.
 */
import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, ArrowDownLeft, ArrowUpRight, Wallet, RefreshCw, Download } from 'lucide-react';
import { getStatement, type StatementRow } from '@/services/ledger-wallet.service';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';

interface StatementTabProps {
  userId: string;
}

const SESSION_TYPES = ['chat_charge', 'audio_call_charge', 'video_call_charge', 'group_call_charge',
  'chat_earning', 'audio_call_earning', 'video_call_earning', 'group_call_earning'];

const CREDIT_TYPES = ['credit', 'recharge', 'refund', 'chat_earning', 'audio_call_earning', 'video_call_earning', 'group_call_earning', 'gift_received'];

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    recharge: 'Recharge', credit: 'Credit', refund: 'Refund',
    chat_charge: 'Chat', audio_call_charge: 'Audio Call', video_call_charge: 'Video Call',
    group_call_charge: 'Group Call', debit: 'Debit', withdrawal: 'Withdrawal',
    gift: 'Gift Sent', gift_received: 'Gift Received',
    chat_earning: 'Chat Earning', audio_call_earning: 'Audio Earning',
    video_call_earning: 'Video Earning', group_call_earning: 'Group Earning',
  };
  return labels[type] || type?.replace(/_/g, ' ');
};

const isCredit = (type: string) => CREDIT_TYPES.includes(type);

/** Per spec §11.6: read stored duration_seconds, FLOOR to minutes. Gifts/recharges show "—". */
const getDurationDisplay = (row: StatementRow): string => {
  if (!SESSION_TYPES.includes(row.transaction_type)) return '—';
  if (row.duration_seconds == null) return '—';
  const minutes = Math.floor(row.duration_seconds / 60);
  return `${minutes} min`;
};

export const StatementTab: React.FC<StatementTabProps> = ({ userId }) => {
  const [statement, setStatement] = useState<StatementRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const loadStatement = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const data = await getStatement(userId, dateRange.from, dateRange.to);
      setStatement(data);
    } catch { /* fallback empty */ }
    setIsLoading(false);
  }, [userId, dateRange.from, dateRange.to]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const exportPDF = () => {
    if (!statement.length) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Title
    doc.setFontSize(16);
    doc.text('Transaction Statement', 14, 18);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, 14, 25);

    // Opening / Closing
    const cb = statement.length > 0 ? statement[0].running_balance : 0;
    const ob = statement.length > 0
      ? statement[statement.length - 1].running_balance - statement[statement.length - 1].credit + statement[statement.length - 1].debit
      : 0;
    doc.text(`Opening Balance: ₹${ob.toFixed(0)}`, 14, 32);
    doc.text(`Closing Balance: ₹${cb.toFixed(0)}`, 100, 32);

    // Table
    const rows = statement.map((row, i) => [
      String(i + 1),
      format(new Date(row.created_at), 'dd MMM yyyy, hh:mm a'),
      getTypeLabel(row.transaction_type),
      getDurationDisplay(row),
      row.description || '—',
      isCredit(row.transaction_type) ? `+₹${(row.credit || 0).toFixed(0)}` : `-₹${(row.debit || 0).toFixed(0)}`,
      `₹${row.running_balance?.toFixed(0) || '—'}`,
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['#', 'Date', 'Type', 'Duration', 'Description', 'Amount', 'Balance']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [99, 102, 241] },
      columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } },
    });

    doc.save(`statement-${dateRange.from}-to-${dateRange.to}.pdf`);
  };

  // Per spec §6.4: Opening = first row's running_balance + debit - credit, Closing = last row's running_balance
  const closingBalance = statement.length > 0 ? statement[0].running_balance : 0;
  const openingBalance = statement.length > 0
    ? statement[statement.length - 1].running_balance - statement[statement.length - 1].credit + statement[statement.length - 1].debit
    : 0;

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Transaction Statement</h2>
          <p className="text-xs text-muted-foreground">{statement.length} transactions</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportPDF} disabled={!statement.length} title="Download PDF">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadStatement}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="px-4 py-2 flex gap-2 items-center border-b border-border/30">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input type="date" value={dateRange.from}
          onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
          className="h-8 text-xs flex-1" />
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="date" value={dateRange.to}
          onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
          className="h-8 text-xs flex-1" />
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={loadStatement}>Go</Button>
      </div>

      {/* Opening / Closing Balance (spec §6.3) */}
      {statement.length > 0 && (
        <div className="grid grid-cols-2 gap-0 border-b border-border/30">
          <div className="text-center py-3 border-r border-border/30">
            <p className="text-[10px] text-muted-foreground">Opening Balance</p>
            <p className="text-sm font-bold text-foreground">₹{openingBalance.toFixed(0)}</p>
          </div>
          <div className="text-center py-3">
            <p className="text-[10px] text-muted-foreground">Closing Balance</p>
            <p className="text-sm font-bold text-foreground">₹{closingBalance.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="px-4 pb-20 space-y-0">
        {statement.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No transactions found</p>
          </div>
        ) : (
          statement.map(row => {
            const duration = getDurationDisplay(row);
            return (
              <div key={row.id} className="flex items-center gap-3 py-3 border-b border-border/30">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                  isCredit(row.transaction_type) ? 'bg-green-500/10' : 'bg-red-500/10'
                )}>
                  {isCredit(row.transaction_type)
                    ? <ArrowDownLeft className="w-4 h-4 text-green-600" />
                    : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{getTypeLabel(row.transaction_type)}</p>
                    {duration !== '—' && (
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">{duration}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{row.description || '—'}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(row.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('text-sm font-semibold', isCredit(row.transaction_type) ? 'text-green-600' : 'text-red-500')}>
                    {isCredit(row.transaction_type) ? '+' : '-'}₹{(row.credit || row.debit || 0).toFixed(0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Bal: ₹{row.running_balance?.toFixed(0) || '—'}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StatementTab;

/**
 * StatementTab — Inline transaction statement for dashboard wallet tabs.
 * Fetches ledger statement and displays with date filter.
 */
import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, ArrowDownLeft, ArrowUpRight, Wallet, RefreshCw } from 'lucide-react';
import { getStatement, type StatementRow } from '@/services/ledger-wallet.service';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface StatementTabProps {
  userId: string;
}

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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadStatement}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Date Filter */}
      <div className="px-4 py-2 flex gap-2 items-center border-b border-border/30">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          type="date"
          value={dateRange.from}
          onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
          className="h-8 text-xs flex-1"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateRange.to}
          onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
          className="h-8 text-xs flex-1"
        />
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={loadStatement}>Go</Button>
      </div>

      {/* Transaction List */}
      <div className="px-4 pb-20 space-y-0">
        {statement.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No transactions found</p>
          </div>
        ) : (
          statement.map(row => (
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
                <p className="text-sm font-medium text-foreground truncate">{getTypeLabel(row.transaction_type)}</p>
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
          ))
        )}
      </div>
    </div>
  );
};

export default StatementTab;

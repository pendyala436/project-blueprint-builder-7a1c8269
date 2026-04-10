/**
 * WomenWalletScreen — Women's Wallet with earnings breakdown and transaction statement.
 * Statement reads stored duration_minutes, never recomputes at display time (spec §11.6).
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Wallet, IndianRupee, ArrowDownLeft, ArrowUpRight, RefreshCw, Filter, TrendingUp, MessageCircle, Video as VideoIcon, Phone } from 'lucide-react';
import { getStatement, getWomenBalance, type StatementRow } from '@/services/ledger-wallet.service';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const WomenWalletScreen = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [balance, setBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [statement, setStatement] = useState<StatementRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      setUserId(user.id);
      await loadData(user.id);
    })();
  }, []);

  const loadData = async (uid: string) => {
    setIsLoading(true);
    try {
      const [walletData, stmtRes] = await Promise.all([
        getWomenBalance(uid),
        getStatement(uid, dateRange.from, dateRange.to),
      ]);
      setBalance(walletData.balance);
      setTodayEarnings(walletData.todayEarnings);
      setStatement(stmtRes);
    } catch { /* fallback */ }
    setIsLoading(false);
  };

  const refresh = () => userId && loadData(userId);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      chat: 'Chat Earning', audio_call: 'Audio Call', video_call: 'Video Call',
      group_call: 'Group Call', gift_credit: 'Gift Received',
      credit: 'Credit', recharge: 'Credit', withdrawal: 'Withdrawal',
      debit: 'Debit', refund: 'Refund',
    };
    return labels[type] || type?.replace(/_/g, ' ');
  };

  const isCredit = (type: string) => ['credit', 'recharge', 'refund', 'chat', 'audio_call', 'video_call', 'group_call', 'gift_credit'].includes(type);

  // Calculate earnings breakdown from statement
  const chatEarnings = statement.filter(r => r.transaction_type?.includes('chat')).reduce((s, r) => s + (r.credit || 0), 0);
  const callEarnings = statement.filter(r => r.transaction_type?.includes('audio') || r.transaction_type?.includes('video')).reduce((s, r) => s + (r.credit || 0), 0);
  const giftEarnings = statement.filter(r => r.transaction_type?.includes('gift')).reduce((s, r) => s + (r.credit || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold flex-1">Wallet</h1>
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={refresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Balance Card */}
      <div className="p-4">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-80">Total Balance</p>
              <p className="text-3xl font-bold">₹{balance.toFixed(0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 bg-primary-foreground/10 rounded-lg px-3 py-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Today's Earnings: ₹{todayEarnings.toFixed(0)}</span>
          </div>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: <MessageCircle className="w-4 h-4" />, label: 'Chat', amount: chatEarnings },
          { icon: <Phone className="w-4 h-4" />, label: 'Calls', amount: callEarnings },
          { icon: <IndianRupee className="w-4 h-4" />, label: 'Gifts', amount: giftEarnings },
        ].map((item, i) => (
          <Card key={i} className="p-3 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1 text-primary">{item.icon}</div>
            <p className="text-lg font-bold text-foreground">₹{item.amount.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </Card>
        ))}
      </div>

      {/* Date Filter */}
      <div className="px-4 pb-2 flex gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} className="h-8 text-xs flex-1" />
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} className="h-8 text-xs flex-1" />
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={refresh}>Go</Button>
      </div>

      {/* Statement */}
      <div className="px-4 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Transaction History</h2>
        <p className="text-xs text-muted-foreground">{statement.length} transactions</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-2">
        {statement.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No transactions found</p>
          </div>
        ) : (
          statement.map(row => (
            <div key={row.id} className="flex items-center gap-3 py-3 border-b border-border/30">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center',
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
              <div className="text-right">
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

export default WomenWalletScreen;

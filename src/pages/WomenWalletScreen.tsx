/**
 * WomenWalletScreen — Women's Wallet with earnings balance and breakdown.
 * Transaction history is in the separate Statement tab.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Wallet, IndianRupee, TrendingUp, RefreshCw } from 'lucide-react';
import { getWomenBalance } from '@/services/ledger-wallet.service';

const WomenWalletScreen = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [balance, setBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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
      const walletData = await getWomenBalance(uid);
      setBalance(walletData.balance);
      setTodayEarnings(walletData.todayEarnings);
    } catch { /* fallback */ }
    setIsLoading(false);
  };

  const refresh = () => userId && loadData(userId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
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
    </div>
  );
};

export default WomenWalletScreen;

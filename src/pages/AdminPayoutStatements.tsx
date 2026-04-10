/**
 * AdminPayoutStatements — Admin page for viewing/triggering payout snapshots.
 * Spec §7: Payouts on 1st and 16th, with bank details and Excel/CSV export.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminNav from '@/components/AdminNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCw, Loader2, IndianRupee, Users, Calendar } from 'lucide-react';
import { triggerPayoutSnapshot, getPayoutSnapshots } from '@/services/ledger-wallet.service';
import { format } from 'date-fns';

interface PayoutRecord {
  id: string;
  user_id: string;
  full_name: string;
  bank_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  gross_earned: number;
  withdrawal_fee_amount: number;
  net_payable: number;
  already_paid: number;
  incremental_payable: number;
  wallet_balance_at_snapshot: number;
  payment_status: string;
  snapshot_type: string;
  ist_month: string;
  ist_year: number;
  snapshot_ist_date: string;
  created_at: string;
}

const AdminPayoutStatements = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<PayoutRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => { loadRecords(); }, [monthFilter]);

  const loadRecords = async () => {
    setIsLoading(true);
    const data = await getPayoutSnapshots(monthFilter);
    setRecords(data as PayoutRecord[]);
    setIsLoading(false);
  };

  const handleGenerate = async (type: 'mid_month' | 'end_month') => {
    setIsGenerating(true);
    const result = await triggerPayoutSnapshot(type);
    if (result.success) {
      toast({ title: 'Payout Generated', description: `${result.count} women processed.` });
      loadRecords();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsGenerating(false);
  };

  const exportCSV = () => {
    if (!records.length) return;
    const headers = ['S.No', 'Name', 'Bank Name', 'IFSC Code', 'Account Number', 'Gross Earned', 'Fee', 'Net Payable', 'Already Paid', 'Incremental', 'Status'];
    const rows = records.map((r, i) => [
      i + 1, r.full_name, r.bank_name || '', r.ifsc_code || '', r.bank_account_number || '',
      r.gross_earned, r.withdrawal_fee_amount, r.net_payable, r.already_paid, r.incremental_payable, r.payment_status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payout-${monthFilter}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPayable = records.reduce((s, r) => s + Number(r.incremental_payable || 0), 0);
  const totalGross = records.reduce((s, r) => s + Number(r.gross_earned || 0), 0);

  return (
    <AdminNav>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payout Statements</h1>
            <p className="text-sm text-muted-foreground">Bi-monthly payout snapshots (1st & 16th)</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input
              type="month"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="w-40"
            />
            <Button variant="outline" size="sm" onClick={loadRecords} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!records.length}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{records.length}</p>
                <p className="text-xs text-muted-foreground">Women in Payout</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <IndianRupee className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">₹{totalGross.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Gross Earned</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <IndianRupee className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">₹{totalPayable.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Net Payable</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Generate Buttons */}
        <Card className="p-4 flex flex-wrap gap-3 items-center">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Generate Payout:</span>
          <Button size="sm" onClick={() => handleGenerate('mid_month')} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Mid Month (16th)
          </Button>
          <Button size="sm" onClick={() => handleGenerate('end_month')} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            End Month (1st)
          </Button>
        </Card>

        {/* Table */}
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>IFSC</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
                <TableHead className="text-right">Incremental</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No payout records for this period</TableCell></TableRow>
              ) : (
                records.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell className="text-xs">{r.bank_name || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.ifsc_code || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.bank_account_number ? '****' + r.bank_account_number.slice(-4) : '—'}</TableCell>
                    <TableCell className="text-right">₹{Number(r.gross_earned).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-red-500">₹{Number(r.withdrawal_fee_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">₹{Number(r.net_payable).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">₹{Number(r.incremental_payable).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={r.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {r.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.snapshot_ist_date ? format(new Date(r.snapshot_ist_date), 'dd MMM') : '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminNav>
  );
};

export default AdminPayoutStatements;

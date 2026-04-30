/**
 * AdminPayoutStatements — Admin page for viewing/triggering payout snapshots.
 * Spec §7: KYC-based payout statement (10 columns from Bank KYC).
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminNav from '@/components/AdminNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCw, Loader2, IndianRupee, Users, Calendar, FileText, FileSpreadsheet, Archive, ArchiveRestore } from 'lucide-react';
import { generatePayoutSnapshot, getPayoutSnapshots } from '@/services/ledger-wallet.service';
import { generatePayoutSnapshotNow } from '@/services/billing.service';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface PayoutRecord {
  id: string;
  user_id: string;
  app_sno: number | null;
  beneficiary_purpose: string | null;
  account_holder_name: string | null;
  full_name: string;
  mobile_number: string | null;
  email_address: string | null;
  address: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  upi_vpa: string | null;
  wallet_balance_at_snapshot: number;
  payment_status: string;
  snapshot_type: string;
  ist_month: string;
  ist_year: number;
  snapshot_ist_date: string;
  created_at: string;
}

// Spec §7 — 10 columns sourced from Bank KYC
const PAYOUT_HEADERS = [
  'Beneficiary ID / S.No',
  'Beneficiary Purpose',
  'Name',
  'Phone Number',
  'Email ID',
  'Address',
  'Account Number',
  'IFSC Code',
  'UPI VPA',
  'Amount (₹)',
];

const AdminPayoutStatements = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<PayoutRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => { loadRecords(); }, [monthFilter]);

  // Realtime: refresh when snapshots change
  useEffect(() => {
    const channel = supabase
      .channel('admin-payout-snapshots-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'women_payout_snapshots' }, () => {
        loadRecords();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await getPayoutSnapshots(monthFilter);
      setRecords(data as PayoutRecord[]);
    } catch (err: any) {
      console.error('[Payouts] load failed:', err);
      toast({ title: 'Failed to load payouts', description: err?.message || 'Please retry', variant: 'destructive' });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // 1) Run both DB snapshot RPCs
      const [legacy, unified] = await Promise.all([
        generatePayoutSnapshot(),
        generatePayoutSnapshotNow(),
      ]);
      if (!legacy.success) {
        toast({ title: 'Error', description: legacy.error, variant: 'destructive' });
        return;
      }

      // 2) Re-fetch the freshly generated snapshot rows for THIS month
      const fresh = (await getPayoutSnapshots(monthFilter)) as PayoutRecord[];
      setRecords(fresh);

      // 3) Build Excel from fresh rows (don't depend on async state)
      const rows = fresh.map((r, i) => ({
        sno: r.app_sno ?? i + 1,
        purpose: r.beneficiary_purpose || 'Earnings Payout',
        name: r.account_holder_name || r.full_name || '—',
        phone: r.mobile_number || '—',
        email: r.email_address || '—',
        address: r.address || '—',
        account: r.bank_account_number || '—',
        ifsc: r.ifsc_code || '—',
        upi: r.upi_vpa || '—',
        amount: Number(r.wallet_balance_at_snapshot).toFixed(2),
      }));
      const total = fresh.reduce((s, r) => s + Number(r.wallet_balance_at_snapshot || 0), 0);

      // Timestamp in IST → YYYY-MM-DD_HH-mm-ss
      const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${istNow.getFullYear()}-${pad(istNow.getMonth() + 1)}-${pad(istNow.getDate())}_${pad(istNow.getHours())}-${pad(istNow.getMinutes())}-${pad(istNow.getSeconds())}`;
      const filename = `payout-${stamp}.xlsx`;

      const wsData = [
        ['Payout Statement'],
        [`Period: ${monthFilter}`, '', 'Currency: INR', '', `Women: ${fresh.length}`, '', `Total: ₹${total.toFixed(2)}`, '', `Generated (IST): ${stamp}`],
        [],
        PAYOUT_HEADERS,
        ...rows.map(r => [r.sno, r.purpose, r.name, r.phone, r.email, r.address, r.account, r.ifsc, r.upi, r.amount]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payouts');

      // 4) Upload to Supabase Storage (never overwrite — unique filename)
      const arrayBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
      const blob = new Blob([arrayBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const storagePath = `${monthFilter}/${filename}`;
      const { error: upErr } = await supabase.storage
        .from('payout-exports')
        .upload(storagePath, blob, { contentType: blob.type, upsert: false });
      if (upErr) console.warn('[Payouts] archive upload failed:', upErr.message);

      // 5) Auto-download to admin device
      XLSX.writeFile(wb, filename);

      const skipMsg = legacy.skipped ? ` • ${legacy.skipped} skipped (no KYC)` : '';
      const unifiedMsg = unified.success ? ` • ${unified.count ?? 0} unified statements` : '';
      const archiveMsg = upErr ? ' • archive failed' : ' • archived';
      toast({ title: 'Payout Generated', description: `${legacy.count} women${skipMsg}${unifiedMsg}${archiveMsg}.` });
      loadArchives();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Generation failed', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Archived Exports (Storage) ───
  // Active = files in `payout-exports` bucket
  // Archived = files moved to `payout-exports-archive` bucket
  const [archives, setArchives] = useState<{ name: string; path: string; created_at?: string }[]>([]);
  const [view, setView] = useState<'active' | 'archived'>('active');
  const bucketName = view === 'active' ? 'payout-exports' : 'payout-exports-archive';

  const loadArchives = async () => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(monthFilter, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) { setArchives([]); return; }
    setArchives((data || []).filter(f => f.name.endsWith('.xlsx')).map(f => ({
      name: f.name,
      path: `${monthFilter}/${f.name}`,
      created_at: (f as any).created_at,
    })));
  };
  useEffect(() => { loadArchives(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [monthFilter, view]);

  const downloadArchive = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from(bucketName).download(path);
    if (error || !data) { toast({ title: 'Download failed', description: error?.message, variant: 'destructive' }); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  // Move file between active ↔ archive bucket (download + upload + delete original)
  const moveFile = async (path: string, from: string, to: string) => {
    const { data: file, error: dlErr } = await supabase.storage.from(from).download(path);
    if (dlErr || !file) throw new Error(dlErr?.message || 'Download failed');
    const { error: upErr } = await supabase.storage.from(to).upload(path, file, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    });
    if (upErr) throw new Error(upErr.message);
    const { error: rmErr } = await supabase.storage.from(from).remove([path]);
    if (rmErr) throw new Error(rmErr.message);
  };

  const archiveFile = async (path: string, name: string) => {
    try {
      await moveFile(path, 'payout-exports', 'payout-exports-archive');
      toast({ title: 'Archived', description: name });
      loadArchives();
    } catch (e: any) {
      toast({ title: 'Archive failed', description: e?.message, variant: 'destructive' });
    }
  };

  const restoreFile = async (path: string, name: string) => {
    try {
      await moveFile(path, 'payout-exports-archive', 'payout-exports');
      toast({ title: 'Restored', description: name });
      loadArchives();
    } catch (e: any) {
      toast({ title: 'Restore failed', description: e?.message, variant: 'destructive' });
    }
  };

  const buildRows = () => records.map((r, i) => ({
    sno: r.app_sno ?? i + 1,
    purpose: r.beneficiary_purpose || 'Earnings Payout',
    name: r.account_holder_name || r.full_name || '—',
    phone: r.mobile_number || '—',
    email: r.email_address || '—',
    address: r.address || '—',
    account: r.bank_account_number || '—',
    ifsc: r.ifsc_code || '—',
    upi: r.upi_vpa || '—',
    amount: Number(r.wallet_balance_at_snapshot).toFixed(2),
  }));

  const totalAmount = records.reduce((s, r) => s + Number(r.wallet_balance_at_snapshot || 0), 0);

  // ─── CSV Export ───
  const exportCSV = () => {
    if (!records.length) return;
    const rows = buildRows();
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      PAYOUT_HEADERS.join(','),
      ...rows.map(r => [r.sno, escape(r.purpose), escape(r.name), escape(r.phone), escape(r.email), escape(r.address), escape(r.account), r.ifsc, escape(r.upi), r.amount].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payout-${monthFilter}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── PDF Export ───
  const exportPDF = () => {
    if (!records.length) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(18);
    doc.text('Payout Statement', 14, 16);
    doc.setFontSize(10);
    doc.text(`Period: ${monthFilter}  •  Currency: INR  •  Women: ${records.length}  •  Total: ₹${totalAmount.toFixed(2)}`, 14, 23);

    const rows = buildRows().map(r => [String(r.sno), r.purpose, r.name, r.phone, r.email, r.address, r.account, r.ifsc, r.upi, r.amount]);

    autoTable(doc, {
      startY: 30,
      head: [PAYOUT_HEADERS],
      body: rows,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [99, 102, 241], fontSize: 7 },
      columnStyles: { 9: { halign: 'right' } },
    });

    doc.save(`payout-${monthFilter}.pdf`);
  };

  // ─── Excel Export ───
  const exportExcel = () => {
    if (!records.length) return;
    const rows = buildRows();
    const wsData = [
      ['Payout Statement'],
      [`Period: ${monthFilter}`, '', 'Currency: INR', '', `Women: ${records.length}`, '', `Total: ₹${totalAmount.toFixed(2)}`],
      [],
      PAYOUT_HEADERS,
      ...rows.map(r => [r.sno, r.purpose, r.name, r.phone, r.email, r.address, r.account, r.ifsc, r.upi, r.amount]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payouts');
    XLSX.writeFile(wb, `payout-${monthFilter}.xlsx`);
  };

  // ─── Word Export ───
  const exportWord = () => {
    if (!records.length) return;
    const rows = buildRows();
    const tableRows = rows.map(r =>
      `<tr><td>${r.sno}</td><td>${r.purpose}</td><td>${r.name}</td><td>${r.phone}</td><td>${r.email}</td><td>${r.address}</td><td>${r.account}</td><td>${r.ifsc}</td><td>${r.upi}</td><td style="text-align:right">${r.amount}</td></tr>`
    ).join('');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><style>body{font-family:Arial;font-size:11pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;font-size:9pt}th{background:#6366F1;color:#fff}h1{font-size:18pt}</style></head><body>
<h1>Payout Statement</h1><p>Period: ${monthFilter} • Currency: INR • Women: ${records.length} • Total: ₹${totalAmount.toFixed(2)}</p>
<table><thead><tr>${PAYOUT_HEADERS.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payout-${monthFilter}.doc`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminNav>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payout Statements</h1>
            <p className="text-sm text-muted-foreground">Monthly payout snapshots — sourced from Bank KYC</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-40" />
            <Button variant="outline" size="sm" onClick={loadRecords} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!records.length}>
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportPDF}>
                  <FileText className="w-4 h-4 mr-2" /> Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportCSV}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportWord}>
                  <FileText className="w-4 h-4 mr-2" /> Export Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <IndianRupee className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Payout Amount</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Generate Button — captures all women's current wallet balance + Bank KYC */}
        <Card className="p-4 flex flex-wrap gap-3 items-center">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Generate a payout snapshot for all eligible women (closing wallet balance at this moment, sourced from Bank KYC):
          </span>
          <Button size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Generate Now
          </Button>
        </Card>

        {/* Archived Excel snapshots — never overwritten */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-foreground">Archived Excel Snapshots</h2>
              <p className="text-xs text-muted-foreground">Every Generate click and the 1st-of-month auto-run save a new timestamped .xlsx — older files are preserved.</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadArchives}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
          {archives.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No archives yet for {monthFilter}.</p>
          ) : (
            <ul className="divide-y">
              {archives.map(a => (
                <li key={a.path} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-mono truncate">{a.name}</span>
                    {a.created_at && <span className="text-xs text-muted-foreground ml-2">{format(new Date(a.created_at), 'dd MMM yyyy HH:mm')}</span>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => downloadArchive(a.path, a.name)}>
                    <Download className="w-4 h-4 mr-1" /> Download
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Table — Spec §7: 10 columns from Bank KYC */}
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beneficiary ID / S.No</TableHead>
                <TableHead>Beneficiary Purpose</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Email ID</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>IFSC Code</TableHead>
                <TableHead>UPI VPA</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead>Status</TableHead>
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
                    <TableCell className="font-mono text-xs">{r.app_sno ?? i + 1}</TableCell>
                    <TableCell className="text-xs">{r.beneficiary_purpose || 'Earnings Payout'}</TableCell>
                    <TableCell className="font-medium">{r.account_holder_name || r.full_name || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.mobile_number || '—'}</TableCell>
                    <TableCell className="text-xs">{r.email_address || '—'}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={r.address || ''}>{r.address || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.bank_account_number ? '****' + r.bank_account_number.slice(-4) : '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.ifsc_code || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{r.upi_vpa || '—'}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">₹{Number(r.wallet_balance_at_snapshot).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={r.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {r.payment_status}
                      </Badge>
                    </TableCell>
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

/**
 * AdminStatementsPage.tsx
 * Admin-only: Monthly statements — Men and Women shown separately
 *
 * MEN  → wallet_transactions (debits: chat/video/group charges, credits: recharges)
 * WOMEN → women_earnings (credits: chat/video/group earnings)
 *
 * Search by User · Month · Year
 * Generate statement for any user/period
 * Download PDF / Excel when available
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import AdminNav from '@/components/AdminNav';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  ArrowLeft, Download, RefreshCw, Search, FileText,
  IndianRupee, Users, User, ChevronRight, Calendar,
  TrendingDown, TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Constants ──────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2023 + 1 }, (_, i) => CURRENT_YEAR - i);

// ─── Types ───────────────────────────────────────────────────────────────────
interface Statement {
  statement_id: string;
  user_id:      string;
  full_name:    string;
  gender:       string;
  year:         number;
  month:        number;
  opening_balance: number;
  total_debit:     number;
  total_credit:    number;
  closing_balance: number;
  pdf_url:    string | null;
  excel_url:  string | null;
  created_at: string;
}

interface TxRow {
  txn_date:        string;
  transaction_id:  string;
  session_id:      string | null;
  txn_type:        string;
  duration_minutes: number | null;
  rate_per_minute:  number | null;
  debit:           number;
  credit:          number;
  balance_after:   number | null;
  description:     string | null;
}

interface UserOpt { id: string; full_name: string; gender: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtINR = (v: number) => `₹${Number(v).toFixed(2)}`;
const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ─── Component ───────────────────────────────────────────────────────────────
const AdminStatementsPage = () => {
  const navigate     = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();

  const [genderTab,    setGenderTab]    = useState<'male' | 'female'>('male');
  const [menUsers,     setMenUsers]     = useState<UserOpt[]>([]);
  const [womenUsers,   setWomenUsers]   = useState<UserOpt[]>([]);
  const [statements,   setStatements]   = useState<Statement[]>([]);
  const [detailRows,   setDetailRows]   = useState<TxRow[]>([]);
  const [selectedStmt, setSelectedStmt] = useState<Statement | null>(null);

  // filters
  const [userFilter,  setUserFilter]  = useState('all');
  const [yearFilter,  setYearFilter]  = useState(String(CURRENT_YEAR));
  const [monthFilter, setMonthFilter] = useState('all');
  const [nameSearch,  setNameSearch]  = useState('');

  // loading states
  const [loading,     setLoading]     = useState(false);
  const [detailLoad,  setDetailLoad]  = useState(false);
  const [generating,  setGenerating]  = useState(false);

  // ── Auth guard
  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate('/admin');
  }, [isAdmin, adminLoading]);

  // ── Load user lists once
  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('profiles').select('user_id, full_name, gender').order('full_name').then(({ data }) => {
      if (!data) return;
      setMenUsers(data.filter(u => u.gender === 'male').map(u => ({ id: u.user_id, full_name: u.full_name || 'Unknown', gender: u.gender || 'male' })));
      setWomenUsers(data.filter(u => u.gender === 'female').map(u => ({ id: u.user_id, full_name: u.full_name || 'Unknown', gender: u.gender || 'female' })));
    });
  }, [isAdmin]);

  // ── Reset user filter when tab switches
  useEffect(() => { setUserFilter('all'); setSelectedStmt(null); setDetailRows([]); }, [genderTab]);

  // ── Search statements
  const search = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setSelectedStmt(null);
    setDetailRows([]);
    try {
      const { data, error } = await supabase.rpc('admin_search_statements', {
        p_user_id: userFilter && userFilter !== 'all' ? userFilter : null,
        p_year:    yearFilter !== 'all' ? parseInt(yearFilter) : null,
        p_month:   monthFilter !== 'all' ? parseInt(monthFilter) : null,
        p_limit:   200,
        p_offset:  0,
      });
      if (error) throw error;
      // Filter to current gender tab
      setStatements(((data as Statement[]) || []).filter(s => s.gender === genderTab));
    } catch {
      toast.error('Search failed', { description: 'Unable to load statements.' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, genderTab, userFilter, yearFilter, monthFilter]);

  useEffect(() => { search(); }, [search]);

  // ── View detail rows
  const viewDetail = async (stmt: Statement) => {
    setSelectedStmt(stmt);
    setDetailLoad(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_statement_detail', {
        p_user_id: stmt.user_id,
        p_year:    stmt.year,
        p_month:   stmt.month,
      });
      if (error) throw error;
      setDetailRows((data as TxRow[]) || []);
    } catch {
      toast.error('Could not load statement detail.');
    } finally {
      setDetailLoad(false);
    }
  };

  // ── Generate one statement
  const generate = async (userId: string, year: number, month: number) => {
    setGenerating(true);
    try {
      const { error } = await supabase.rpc('generate_monthly_statement', {
        p_user_id: userId, p_year: year, p_month: month,
      });
      if (error) throw error;
      toast.success('Statement generated');
      search();
    } catch {
      toast.error('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // ── Bulk generate previous month for all users of current gender tab
  const bulkGenerate = async () => {
    const now   = new Date();
    const m     = now.getMonth() === 0 ? 12 : now.getMonth();
    const y     = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const users = genderTab === 'male' ? menUsers : womenUsers;
    setGenerating(true);
    let count = 0;
    for (const u of users) {
      try { await supabase.rpc('generate_monthly_statement', { p_user_id: u.id, p_year: y, p_month: m }); count++; }
      catch { /* skip */ }
    }
    toast.success(`Generated ${count} ${genderTab === 'male' ? 'men' : 'women'} statements for ${MONTH_NAMES[m-1]} ${y}`);
    setGenerating(false);
    search();
  };

  // ── Filtered list
  const filtered = statements.filter(s =>
    !nameSearch || s.full_name?.toLowerCase().includes(nameSearch.toLowerCase())
  );

  const currentUsers = genderTab === 'male' ? menUsers : womenUsers;

  if (adminLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!isAdmin) return null;

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────
  if (selectedStmt) {
    const isMale = selectedStmt.gender === 'male';
    return (
      <div className="min-h-screen bg-background">
        <AdminNav>
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
          {/* Back */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedStmt(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {selectedStmt.full_name}
                <Badge variant={isMale ? 'default' : 'secondary'} className="text-xs">
                  {isMale ? 'Man' : 'Woman'}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                {MONTH_NAMES[selectedStmt.month - 1]} {selectedStmt.year} Statement
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              {selectedStmt.pdf_url && (
                <Button size="sm" variant="outline" onClick={() => window.open(selectedStmt.pdf_url!, '_blank')}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
              )}
              {selectedStmt.excel_url && (
                <Button size="sm" variant="outline" onClick={() => window.open(selectedStmt.excel_url!, '_blank')}>
                  <Download className="h-4 w-4 mr-1" /> Excel
                </Button>
              )}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Opening Balance', value: selectedStmt.opening_balance, color: 'text-foreground' },
              { label: isMale ? 'Total Charged (Debit)' : 'Total Earned (Credit)',
                value: isMale ? selectedStmt.total_debit : selectedStmt.total_credit,
                color: isMale ? 'text-red-600' : 'text-green-600' },
              { label: isMale ? 'Total Recharged (Credit)' : 'Deductions (Debit)',
                value: isMale ? selectedStmt.total_credit : selectedStmt.total_debit,
                color: isMale ? 'text-green-600' : 'text-red-600' },
              { label: 'Closing Balance', value: selectedStmt.closing_balance,
                color: selectedStmt.closing_balance >= 0 ? 'text-green-600' : 'text-red-600' },
            ].map(card => (
              <Card key={card.label} className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p className={cn('text-lg font-bold', card.color)}>{fmtINR(card.value)}</p>
              </Card>
            ))}
          </div>

          {/* Transaction rows */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {isMale ? 'Wallet Transactions' : 'Earnings Transactions'}
                <Badge variant="outline" className="text-xs ml-auto">{detailRows.length} rows</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {detailLoad ? (
                <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : detailRows.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No transactions found for this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Date & Time</TableHead>
                        <TableHead className="text-xs">Txn ID</TableHead>
                        <TableHead className="text-xs">Session ID</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        {isMale ? (
                          <>
                            <TableHead className="text-xs text-right text-red-600">Debit (₹)</TableHead>
                            <TableHead className="text-xs text-right text-green-600">Credit (₹)</TableHead>
                            <TableHead className="text-xs text-right">Balance After (₹)</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="text-xs text-right text-green-600">Earned (₹)</TableHead>
                            <TableHead className="text-xs text-right text-red-600">Deduction (₹)</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailRows.map((row, i) => (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(row.txn_date), 'dd MMM yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-[10px] text-muted-foreground">
                            {row.transaction_id.slice(0, 8)}…
                          </TableCell>
                          <TableCell className="text-xs font-mono text-[10px] text-muted-foreground">
                            {row.session_id ? row.session_id.slice(0, 8) + '…' : '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {typeLabel(row.txn_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-52 truncate">
                            {row.description || '—'}
                          </TableCell>
                          {isMale ? (
                            <>
                              <TableCell className="text-xs text-right font-medium text-red-600">
                                {Number(row.debit) > 0 ? fmtINR(row.debit) : '—'}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-green-600">
                                {Number(row.credit) > 0 ? fmtINR(row.credit) : '—'}
                              </TableCell>
                              <TableCell className="text-xs text-right text-muted-foreground">
                                {row.balance_after != null ? fmtINR(row.balance_after) : '—'}
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-xs text-right font-medium text-green-600">
                                {Number(row.credit) > 0 ? fmtINR(row.credit) : '—'}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-red-600">
                                {Number(row.debit) > 0 ? fmtINR(row.debit) : '—'}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                      {/* Totals footer row */}
                      {detailRows.length > 0 && (
                        <TableRow className="bg-muted/60 font-semibold border-t-2">
                          <TableCell colSpan={isMale ? 5 : 5} className="text-xs text-right pr-2">
                            Totals:
                          </TableCell>
                          {isMale ? (
                            <>
                              <TableCell className="text-xs text-right text-red-600">
                                {fmtINR(detailRows.reduce((s, r) => s + Number(r.debit), 0))}
                              </TableCell>
                              <TableCell className="text-xs text-right text-green-600">
                                {fmtINR(detailRows.reduce((s, r) => s + Number(r.credit), 0))}
                              </TableCell>
                              <TableCell />
                            </>
                          ) : (
                            <>
                              <TableCell className="text-xs text-right text-green-600">
                                {fmtINR(detailRows.reduce((s, r) => s + Number(r.credit), 0))}
                              </TableCell>
                              <TableCell className="text-xs text-right text-red-600">
                                {fmtINR(detailRows.reduce((s, r) => s + Number(r.debit), 0))}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="px-4 py-3 border-t text-[10px] text-muted-foreground text-center">
                This is a system generated wallet statement. Currency: INR.
                All transactions follow an ACID-compliant ledger system.
                {isMale
                  ? ' Men are charged ₹4/min (chat & group) or ₹8/min (video).'
                  : ' Women earn ₹2/min per man (chat & group) or ₹4/min (video).'}
              </div>
            </CardContent>
          </Card>
        </div>
        </AdminNav>
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <AdminNav>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Monthly Statements
            </h1>
            <p className="text-sm text-muted-foreground">Admin-only — search, view and generate user statements</p>
          </div>
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={bulkGenerate} disabled={generating} className="gap-2">
              <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
              Generate Last Month ({genderTab === 'male' ? 'All Men' : 'All Women'})
            </Button>
          </div>
        </div>

        {/* Gender Tabs */}
        <Tabs value={genderTab} onValueChange={(v) => setGenderTab(v as 'male' | 'female')}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="male" className="gap-2">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              Men ({menUsers.length})
            </TabsTrigger>
            <TabsTrigger value="female" className="gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              Women ({womenUsers.length})
            </TabsTrigger>
          </TabsList>

          {(['male', 'female'] as const).map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4 mt-4">

              {/* Info banner */}
              <div className={cn(
                "rounded-lg border px-4 py-2.5 text-xs flex items-center gap-3",
                tab === 'male'
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-green-50 border-green-200 text-green-800"
              )}>
                <IndianRupee className="h-4 w-4 shrink-0" />
                {tab === 'male'
                  ? 'Men: wallet_transactions rows — debits (chat ₹4/min, video ₹8/min, group ₹4/min per man) and recharge credits. Each row tied to a session_id. 6-month window.'
                  : 'Women: women_earnings rows — chat ₹2/min/man, video ₹4/min, group ₹2/min/man (Indian women only). Debits = approved withdrawal_requests. 6-month window.'}
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{tab === 'male' ? 'Man' : 'Woman'}</Label>
                      <Select value={userFilter} onValueChange={setUserFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All users" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All {tab === 'male' ? 'Men' : 'Women'}</SelectItem>
                          {currentUsers.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Year</Label>
                      <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Years</SelectItem>
                          {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Month</Label>
                      <Select value={monthFilter} onValueChange={setMonthFilter}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Months</SelectItem>
                          {MONTH_NAMES.map((m, i) => (
                            <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Search Name</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input className="h-8 pl-7 text-xs" placeholder="Name…"
                          value={nameSearch} onChange={e => setNameSearch(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statements table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {tab === 'male' ? "Men's Statements" : "Women's Statements"}
                    <Badge variant="outline" className="text-xs ml-1">{filtered.length}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground font-normal">
                      Click any row to view details
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                  ) : filtered.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground space-y-3">
                      <FileText className="h-10 w-10 mx-auto opacity-20" />
                      <p className="text-sm font-medium">No statements found</p>
                      <p className="text-xs max-w-md mx-auto">
                        Statements are generated on demand — they are not created automatically.
                        Use the <strong>"Generate Last Month"</strong> button above to create statements
                        for all {tab === 'male' ? 'men' : 'women'}, or select a specific user, year, and month first.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 gap-2"
                        onClick={bulkGenerate}
                        disabled={generating}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
                        Generate Last Month ({tab === 'male' ? 'All Men' : 'All Women'})
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Period</TableHead>
                            <TableHead className="text-xs text-right">Opening (₹)</TableHead>
                            {tab === 'male' ? (
                              <>
                                <TableHead className="text-xs text-right text-red-600">Charged (₹)</TableHead>
                                <TableHead className="text-xs text-right text-green-600">Recharged (₹)</TableHead>
                              </>
                            ) : (
                              <>
                                <TableHead className="text-xs text-right text-green-600">Earned (₹)</TableHead>
                                <TableHead className="text-xs text-right text-red-600">Deductions (₹)</TableHead>
                              </>
                            )}
                            <TableHead className="text-xs text-right">Closing (₹)</TableHead>
                            <TableHead className="text-xs">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map(s => (
                            <TableRow
                              key={s.statement_id}
                              className="cursor-pointer hover:bg-muted/50 group"
                              onClick={() => viewDetail(s)}
                            >
                              <TableCell className="text-xs font-medium">{s.full_name}</TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {MONTH_NAMES[s.month - 1]} {s.year}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-right">{fmtINR(s.opening_balance)}</TableCell>
                              {tab === 'male' ? (
                                <>
                                  <TableCell className="text-xs text-right text-red-600 font-medium">
                                    {Number(s.total_debit) > 0 ? fmtINR(s.total_debit) : '—'}
                                  </TableCell>
                                  <TableCell className="text-xs text-right text-green-600 font-medium">
                                    {Number(s.total_credit) > 0 ? fmtINR(s.total_credit) : '—'}
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className="text-xs text-right text-green-600 font-medium">
                                    {Number(s.total_credit) > 0 ? fmtINR(s.total_credit) : '—'}
                                  </TableCell>
                                  <TableCell className="text-xs text-right text-red-600 font-medium">
                                    {Number(s.total_debit) > 0 ? fmtINR(s.total_debit) : '—'}
                                  </TableCell>
                                </>
                              )}
                              <TableCell className={cn(
                                "text-xs text-right font-semibold",
                                Number(s.closing_balance) >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {fmtINR(s.closing_balance)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {s.pdf_url && (
                                    <Button size="icon" variant="ghost" className="h-6 w-6"
                                      onClick={e => { e.stopPropagation(); window.open(s.pdf_url!, '_blank'); }}>
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2 opacity-0 group-hover:opacity-100"
                                    onClick={e => { e.stopPropagation(); generate(s.user_id, s.year, s.month); }}
                                    disabled={generating}>
                                    Refresh
                                  </Button>
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>
          ))}
        </Tabs>
      </div>
      </AdminNav>
    </div>
  );
};

export default AdminStatementsPage;

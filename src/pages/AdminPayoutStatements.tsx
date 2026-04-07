/**
 * AdminPayoutStatements — Women Payout Statements
 * YES Bank statement format, bi-monthly snapshots, Excel export, bulk pay
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminNav from "@/components/AdminNav";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Download, RefreshCw, CheckCircle2, Clock,
  Calendar, ArrowLeft, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface PayoutSnapshot {
  id: string;
  snapshot_type: "mid_month" | "end_month";
  snapshot_ist_datetime: string;
  snapshot_ist_date: string;
  ist_month: string;
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
  payment_status: "pending" | "processed" | "failed";
  processed_at: string | null;
  bank_reference: string | null;
}

const formatIST = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

const getMonthOptions = () => {
  const opts = [];
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }),
    });
  }
  return opts;
};

export default function AdminPayoutStatements() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const [snapshots, setSnapshots] = useState<PayoutSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [activeTab, setActiveTab] = useState<"mid_month" | "end_month" | "all">("mid_month");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [payDialog, setPayDialog] = useState<{ open: boolean; snapshot: PayoutSnapshot | null }>({
    open: false, snapshot: null,
  });
  const [bankRef, setBankRef] = useState("");

  const monthOptions = getMonthOptions();

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("women_payout_snapshots")
        .select("*")
        .eq("ist_month", selectedMonth)
        .order("full_name", { ascending: true });

      if (activeTab !== "all") query = query.eq("snapshot_type", activeTab);

      const { data, error } = await query;
      if (error) throw error;
      setSnapshots((data as unknown as PayoutSnapshot[]) ?? []);
    } catch (err: any) {
      toast.error("Failed to load snapshots", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, activeTab]);

  useEffect(() => { if (isAdmin) fetchSnapshots(); }, [isAdmin, fetchSnapshots]);

  const handleCapture = async (type: "mid_month" | "end_month") => {
    setIsCapturing(true);
    try {
      const { data, error } = await supabase.functions.invoke("payout-snapshot", {
        body: { snapshot_type: type },
      });
      if (error || !data?.success) throw new Error(data?.error ?? error?.message);
      toast.success(`${type === "mid_month" ? "15th" : "Month-End"} snapshot captured`,
        { description: `${data.result?.women_processed ?? 0} women processed` });
      fetchSnapshots();
    } catch (err: any) {
      toast.error("Snapshot failed", { description: err.message });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleResetWallets = async () => {
    if (!confirm("This will reset ALL women wallet balances to ₹0. Are you sure?")) return;
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("payout-snapshot", {
        body: { action: "reset_wallets" },
      });
      if (error || !data?.success) throw new Error(data?.error ?? error?.message);
      toast.success("Women wallets reset to ₹0",
        { description: `${data.result?.wallets_reset ?? 0} wallets reset` });
    } catch (err: any) {
      toast.error("Reset failed", { description: err.message });
    } finally {
      setIsResetting(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!payDialog.snapshot || !bankRef.trim()) return;
    try {
      const { error } = await supabase
        .from("women_payout_snapshots")
        .update({
          payment_status: "processed",
          processed_at: new Date().toISOString(),
          bank_reference: bankRef.trim(),
        } as any)
        .eq("id", payDialog.snapshot.id);
      if (error) throw error;
      toast.success("Marked as paid", { description: `UTR: ${bankRef.trim()}` });
      setPayDialog({ open: false, snapshot: null });
      setBankRef("");
      fetchSnapshots();
    } catch (err: any) {
      toast.error("Update failed", { description: err.message });
    }
  };

  const handleExport = () => {
    const filtered = activeTab === "all"
      ? snapshots
      : snapshots.filter(s => s.snapshot_type === activeTab);

    if (filtered.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const period = activeTab === "mid_month" ? "15th" : activeTab === "end_month" ? "MonthEnd" : "All";
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label ?? selectedMonth;

    const headerRows = [
      [`Statement of Account : GOLDEN ELITE SOFTWARE SOLUTIONS PRIVATE LIMITED`],
      [`Statement Type : ${period} Payout — ${monthLabel}`],
      [`Generated At : ${formatIST(new Date().toISOString())} IST`],
      [`Account : 012461900004405`],
      [`Bank : YES BANK LTD - VIJAYWADA`],
      [`IFSC : YESB0000124`],
      [],
      [
        "Snapshot Date (IST)", "Snapshot Time (IST)", "Period", "Month",
        "Full Name", "Bank Name", "Account Number", "IFSC Code",
        "Gross Earned (INR)", "5% Fee (INR)", "Net Payable (INR)",
        "Already Paid (INR)", "Incremental Payable (INR)", "Wallet Balance",
        "Payment Status", "Bank Reference / UTR", "Processed At (IST)",
      ],
    ];

    const rows = filtered.map(s => {
      const ist = new Date(s.snapshot_ist_datetime)
        .toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const parts = ist.split(", ");
      return [
        parts[0] || ist, parts[1] || "",
        s.snapshot_type === "mid_month" ? "1st–15th" : "16th–Month End",
        monthOptions.find(m => m.value === s.ist_month)?.label ?? s.ist_month,
        s.full_name, s.bank_name ?? "—", s.bank_account_number ?? "—",
        s.ifsc_code ?? "—", s.gross_earned, s.withdrawal_fee_amount,
        s.net_payable, s.already_paid, s.incremental_payable,
        s.wallet_balance_at_snapshot, s.payment_status.toUpperCase(),
        s.bank_reference ?? "—",
        s.processed_at ? formatIST(s.processed_at) : "—",
      ];
    });

    const totalNet = filtered.reduce((a, s) => a + s.incremental_payable, 0);
    rows.push(["", "", "", "", "TOTAL", "", "", "",
      filtered.reduce((a, s) => a + s.gross_earned, 0),
      filtered.reduce((a, s) => a + s.withdrawal_fee_amount, 0),
      filtered.reduce((a, s) => a + s.net_payable, 0),
      filtered.reduce((a, s) => a + s.already_paid, 0),
      totalNet, "", "", "", ""] as any);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...rows]);
    ws["!cols"] = [
      { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
      { wch: 30 }, { wch: 22 }, { wch: 22 }, { wch: 14 },
      { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
      { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, `${period}_${selectedMonth}`);
    XLSX.writeFile(wb, `PayoutStatement_${period}_${selectedMonth}.xlsx`);
    toast.success("Excel exported");
  };

  const visible = activeTab === "all" ? snapshots : snapshots.filter(s => s.snapshot_type === activeTab);
  const totalIncremental = visible.reduce((a, s) => a + s.incremental_payable, 0);
  const totalPending = visible.filter(s => s.payment_status === "pending").length;
  const totalProcessed = visible.filter(s => s.payment_status === "processed").length;

  if (adminLoading) return <AdminNav><div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="animate-spin w-8 h-8" /></div></AdminNav>;
  if (!isAdmin) return <AdminNav><div className="flex items-center justify-center min-h-[60vh] text-destructive">Admin access required</div></AdminNav>;

  return (
    <AdminNav>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Women Payout Statements</h1>
            <p className="text-sm text-muted-foreground">
              Bi-monthly snapshots — 15th and month-end — in IST. Export for bank payment.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-52">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => handleCapture("mid_month")} disabled={isCapturing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isCapturing ? "animate-spin" : ""}`} />
            Capture 15th
          </Button>
          <Button variant="outline" onClick={() => handleCapture("end_month")} disabled={isCapturing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isCapturing ? "animate-spin" : ""}`} />
            Capture Month-End
          </Button>
          <Button variant="destructive" onClick={handleResetWallets} disabled={isResetting}>
            <RotateCcw className={`w-4 h-4 mr-2 ${isResetting ? "animate-spin" : ""}`} />
            Reset Women Wallets to ₹0
          </Button>
          <Button onClick={handleExport} className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total To Pay</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-primary">₹{formatINR(totalIncremental)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-orange-500">{totalPending} women</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Processed</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{totalProcessed} paid</p></CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="mid_month">15th (1st–15th)</TabsTrigger>
            <TabsTrigger value="end_month">Month End (16th–End)</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          {(["mid_month", "end_month", "all"] as const).map(tab => (
            <TabsContent key={tab} value={tab}>
              {isLoading ? (
                <div className="flex justify-center py-12"><RefreshCw className="animate-spin w-6 h-6" /></div>
              ) : visible.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No snapshots for this period. Click "Capture" to generate.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Snapshot (IST)</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Account No.</TableHead>
                        <TableHead>IFSC</TableHead>
                        <TableHead className="text-right">Gross (₹)</TableHead>
                        <TableHead className="text-right">5% Fee (₹)</TableHead>
                        <TableHead className="text-right">Net (₹)</TableHead>
                        <TableHead className="text-right">Incremental (₹)</TableHead>
                        <TableHead className="text-right">Wallet Bal (₹)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>UTR</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map(s => (
                        <TableRow key={s.id} className={s.payment_status === "processed" ? "opacity-60" : ""}>
                          <TableCell className="text-xs whitespace-nowrap">{formatIST(s.snapshot_ist_datetime)}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline">
                              {s.snapshot_type === "mid_month" ? "1st–15th" : "16th–End"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{s.full_name}</TableCell>
                          <TableCell className="text-xs">{s.bank_name ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{s.bank_account_number ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{s.ifsc_code ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono">{formatINR(s.gross_earned)}</TableCell>
                          <TableCell className="text-right font-mono text-destructive">-{formatINR(s.withdrawal_fee_amount)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatINR(s.net_payable)}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">{formatINR(s.incremental_payable)}</TableCell>
                          <TableCell className="text-right font-mono">{formatINR(s.wallet_balance_at_snapshot)}</TableCell>
                          <TableCell>
                            <Badge variant={s.payment_status === "processed" ? "default" : "secondary"}
                              className={s.payment_status === "processed" ? "bg-green-600" : "bg-orange-100 text-orange-700"}>
                              {s.payment_status === "processed" ? (
                                <><CheckCircle2 className="w-3 h-3 mr-1" />Paid</>
                              ) : (
                                <><Clock className="w-3 h-3 mr-1" />Pending</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{s.bank_reference ?? "—"}</TableCell>
                          <TableCell>
                            {s.payment_status === "pending" && s.incremental_payable > 0 && (
                              <Button size="sm" onClick={() => { setPayDialog({ open: true, snapshot: s }); setBankRef(""); }}>
                                Mark Paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Mark Paid Dialog */}
      <Dialog open={payDialog.open} onOpenChange={open => setPayDialog(p => ({ ...p, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid — {payDialog.snapshot?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank:</span>
                <span className="font-medium">{payDialog.snapshot?.bank_name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account:</span>
                <span className="font-mono">{payDialog.snapshot?.bank_account_number ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IFSC:</span>
                <span className="font-mono">{payDialog.snapshot?.ifsc_code ?? "—"}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                <span>Amount to Transfer:</span>
                <span className="text-primary">₹{formatINR(payDialog.snapshot?.incremental_payable ?? 0)}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Bank Reference / UTR Number</label>
              <Input
                placeholder="e.g. YESB026084954536 or UPI ref"
                value={bankRef}
                onChange={e => setBankRef(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog({ open: false, snapshot: null })}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} disabled={!bankRef.trim()}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminNav>
  );
}

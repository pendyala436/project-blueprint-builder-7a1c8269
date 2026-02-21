import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "@/components/AdminNav";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  FileCheck,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  Download,
  Users,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface KYCRecord {
  id: string;
  user_id: string;
  full_name_as_per_bank: string;
  date_of_birth: string;
  gender: string | null;
  country_of_residence: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  aadhaar_number: string | null;
  aadhaar_front_url: string | null;
  aadhaar_back_url: string | null;
  id_type: string;
  id_number: string;
  id_proof_front_url: string | null;
  id_proof_back_url: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  verification_status: string;
  rejection_reason: string | null;
  consent_given: boolean;
  created_at: string;
  updated_at: string;
}

interface IndianWoman {
  user_id: string;
  full_name: string | null;
  country: string | null;
  primary_language: string | null;
  photo_url: string | null;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "rejected":
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getIdTypeLabel = (type: string) => {
  switch (type) {
    case "pan": return "PAN Card";
    case "passport": return "Passport";
    case "voter_id": return "Voter ID";
    case "aadhaar": return "Aadhaar Card";
    default: return type;
  }
};

const AdminKYCManagement = () => {
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [indianWomen, setIndianWomen] = useState<IndianWoman[]>([]);
  const [filteredWomen, setFilteredWomen] = useState<IndianWoman[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedKYC, setSelectedKYC] = useState<KYCRecord | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    if (isAdmin) {
      loadIndianWomen();
      loadStats();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterWomen();
  }, [searchQuery, indianWomen]);

  const loadStats = async () => {
    const { data } = await supabase.from("women_kyc").select("verification_status");
    if (data) {
      setStats({
        total: data.length,
        pending: data.filter(k => k.verification_status === "pending").length,
        approved: data.filter(k => k.verification_status === "approved").length,
        rejected: data.filter(k => k.verification_status === "rejected").length,
      });
    }
  };

  const loadIndianWomen = async () => {
    setLoading(true);
    try {
      // Get all Indian women profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, country, primary_language, photo_url")
        .ilike("gender", "female")
        .or("country.ilike.%india%,country.ilike.%in%,country.ilike.%ind%");

      if (error) throw error;
      setIndianWomen((profiles || []) as IndianWoman[]);
      setFilteredWomen((profiles || []) as IndianWoman[]);
    } catch (error) {
      console.error("Error loading Indian women:", error);
      toast.error("Failed to load Indian women profiles");
    } finally {
      setLoading(false);
    }
  };

  const filterWomen = () => {
    let filtered = indianWomen;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        w.full_name?.toLowerCase().includes(q) ||
        w.user_id.toLowerCase().includes(q) ||
        w.primary_language?.toLowerCase().includes(q)
      );
    }
    setFilteredWomen(filtered);
  };

  const loadKYCForUser = async (userId: string) => {
    setKycLoading(true);
    setSelectedUserId(userId);
    try {
      const { data, error } = await supabase
        .from("women_kyc")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setSelectedKYC(data as KYCRecord | null);
    } catch (error) {
      console.error("Error loading KYC:", error);
      toast.error("Failed to load KYC data");
    } finally {
      setKycLoading(false);
    }
  };

  const handleSelectUser = async (userId: string) => {
    await loadKYCForUser(userId);
  };

  const handleViewDetails = (kyc: KYCRecord) => {
    setDetailDialogOpen(true);
  };

  const handleApproveKYC = async () => {
    if (!selectedKYC) return;
    try {
      const { error } = await supabase
        .from("women_kyc")
        .update({
          verification_status: "approved",
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedKYC.id);

      if (error) throw error;

      // Also update profile verification
      await supabase
        .from("profiles")
        .update({ is_verified: true, updated_at: new Date().toISOString() })
        .eq("user_id", selectedKYC.user_id);

      toast.success("KYC approved successfully");
      setSelectedKYC({ ...selectedKYC, verification_status: "approved" });
      loadStats();
    } catch (error) {
      console.error("Error approving KYC:", error);
      toast.error("Failed to approve KYC");
    }
  };

  const handleRejectKYC = async () => {
    if (!selectedKYC) return;
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      const { error } = await supabase
        .from("women_kyc")
        .update({
          verification_status: "rejected",
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedKYC.id);

      if (error) throw error;

      toast.success("KYC rejected");
      setSelectedKYC({ ...selectedKYC, verification_status: "rejected", rejection_reason: reason });
      loadStats();
    } catch (error) {
      console.error("Error rejecting KYC:", error);
      toast.error("Failed to reject KYC");
    }
  };

  if (adminLoading || loading) {
    return (
      <AdminNav>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminNav>
    );
  }

  if (!isAdmin) return null;

  const selectedWoman = indianWomen.find(w => w.user_id === selectedUserId);

  return (
    <AdminNav>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            KYC Management — Indian Women
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View, search, approve, or reject KYC submissions from Indian female users.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total KYC</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: User List / Search / Dropdown */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Indian Women
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredWomen.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
                ) : (
                  filteredWomen.map((woman) => (
                    <button
                      key={woman.user_id}
                      onClick={() => handleSelectUser(woman.user_id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 ${
                        selectedUserId === woman.user_id ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {woman.photo_url ? (
                          <img src={woman.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{woman.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {woman.primary_language || "N/A"} • {woman.country}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Panel: KYC Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                {selectedWoman
                  ? `KYC Details — ${selectedWoman.full_name || "Unknown"}`
                  : "Select a user to view KYC"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedUserId && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mb-4 opacity-50" />
                  <p>Select an Indian woman from the list to view her KYC details.</p>
                </div>
              )}

              {selectedUserId && kycLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-32 w-full" />
                </div>
              )}

              {selectedUserId && !kycLoading && !selectedKYC && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">No KYC submitted yet</p>
                  <p className="text-sm">This user has not submitted KYC information.</p>
                </div>
              )}

              {selectedUserId && !kycLoading && selectedKYC && (
                <div className="space-y-6">
                  {/* Status & Actions */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedKYC.verification_status)}
                      {selectedKYC.rejection_reason && (
                        <span className="text-xs text-destructive">({selectedKYC.rejection_reason})</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {selectedKYC.verification_status !== "approved" && (
                        <Button size="sm" onClick={handleApproveKYC} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                      )}
                      {selectedKYC.verification_status !== "rejected" && (
                        <Button size="sm" variant="destructive" onClick={handleRejectKYC}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Basic Details */}
                  <div>
                    <h4 className="font-semibold mb-3">Basic Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground text-xs">Full Name</Label>
                        <p className="font-medium">{selectedKYC.full_name_as_per_bank}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Date of Birth</Label>
                        <p className="font-medium">{selectedKYC.date_of_birth}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Gender</Label>
                        <p className="font-medium">{selectedKYC.gender || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Country</Label>
                        <p className="font-medium">{selectedKYC.country_of_residence}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Submitted</Label>
                        <p className="font-medium">{new Date(selectedKYC.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Bank Details */}
                  <div>
                    <h4 className="font-semibold mb-3">Bank Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground text-xs">Bank Name</Label>
                        <p className="font-medium">{selectedKYC.bank_name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Account Holder</Label>
                        <p className="font-medium">{selectedKYC.account_holder_name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Account Number</Label>
                        <p className="font-medium">{selectedKYC.account_number}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">IFSC Code</Label>
                        <p className="font-medium">{selectedKYC.ifsc_code}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Address Proof - Aadhaar */}
                  <div>
                    <h4 className="font-semibold mb-3">Address Proof — Aadhaar</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <Label className="text-muted-foreground text-xs">Aadhaar Number</Label>
                        <p className="font-medium font-mono">{selectedKYC.aadhaar_number || "N/A"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedKYC.aadhaar_front_url && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Aadhaar Front</Label>
                          <a href={selectedKYC.aadhaar_front_url} target="_blank" rel="noopener noreferrer"
                            className="mt-1 block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                            <img src={selectedKYC.aadhaar_front_url} alt="Aadhaar Front" className="w-full h-32 object-cover" />
                          </a>
                        </div>
                      )}
                      {selectedKYC.aadhaar_back_url && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Aadhaar Back</Label>
                          <a href={selectedKYC.aadhaar_back_url} target="_blank" rel="noopener noreferrer"
                            className="mt-1 block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                            <img src={selectedKYC.aadhaar_back_url} alt="Aadhaar Back" className="w-full h-32 object-cover" />
                          </a>
                        </div>
                      )}
                      {!selectedKYC.aadhaar_front_url && !selectedKYC.aadhaar_back_url && (
                        <p className="text-sm text-muted-foreground col-span-2">No Aadhaar documents uploaded</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* ID Proof */}
                  <div>
                    <h4 className="font-semibold mb-3">ID Proof</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <Label className="text-muted-foreground text-xs">ID Type</Label>
                        <p className="font-medium">{getIdTypeLabel(selectedKYC.id_type)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">ID Number</Label>
                        <p className="font-medium font-mono">{selectedKYC.id_number}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedKYC.id_proof_front_url && (
                        <div>
                          <Label className="text-muted-foreground text-xs">ID Front</Label>
                          <a href={selectedKYC.id_proof_front_url} target="_blank" rel="noopener noreferrer"
                            className="mt-1 block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                            <img src={selectedKYC.id_proof_front_url} alt="ID Front" className="w-full h-32 object-cover" />
                          </a>
                        </div>
                      )}
                      {selectedKYC.id_proof_back_url && (
                        <div>
                          <Label className="text-muted-foreground text-xs">ID Back</Label>
                          <a href={selectedKYC.id_proof_back_url} target="_blank" rel="noopener noreferrer"
                            className="mt-1 block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                            <img src={selectedKYC.id_proof_back_url} alt="ID Back" className="w-full h-32 object-cover" />
                          </a>
                        </div>
                      )}
                      {!selectedKYC.id_proof_front_url && !selectedKYC.id_proof_back_url && (
                        // Fallback to legacy document fields
                        <>
                          {selectedKYC.document_front_url && (
                            <div>
                              <Label className="text-muted-foreground text-xs">Document Front</Label>
                              <a href={selectedKYC.document_front_url} target="_blank" rel="noopener noreferrer"
                                className="mt-1 block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                                <img src={selectedKYC.document_front_url} alt="Doc Front" className="w-full h-32 object-cover" />
                              </a>
                            </div>
                          )}
                          {selectedKYC.document_back_url && (
                            <div>
                              <Label className="text-muted-foreground text-xs">Document Back</Label>
                              <a href={selectedKYC.document_back_url} target="_blank" rel="noopener noreferrer"
                                className="mt-1 block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                                <img src={selectedKYC.document_back_url} alt="Doc Back" className="w-full h-32 object-cover" />
                              </a>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Selfie */}
                  <div>
                    <h4 className="font-semibold mb-3">Selfie / Liveness</h4>
                    {selectedKYC.selfie_url ? (
                      <a href={selectedKYC.selfie_url} target="_blank" rel="noopener noreferrer"
                        className="block w-32 h-32 border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                        <img src={selectedKYC.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">No selfie uploaded</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminNav>
  );
};

export default AdminKYCManagement;

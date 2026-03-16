import { classifyError, ERROR_MESSAGES, logError } from "@/lib/errors";
import AdminNav from "@/components/AdminNav";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useProductionMode } from "@/hooks/useProductionMode";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  FileText, 
  Upload, 
  Download, 
  RefreshCw, 
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  Calendar,
  Loader2,
  File,
  FileCheck,
  AlertTriangle,
  Home
} from "lucide-react";
import { format } from "date-fns";

interface LegalDocument {
  id: string;
  name: string;
  document_type: string;
  version: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  is_active: boolean;
  uploaded_by: string | null;
  effective_date: string | null;
  created_at: string;
  updated_at: string;
}

const documentTypes = [
  { value: "terms", label: "Terms of Service" },
  { value: "terms_of_service", label: "Terms of Service" },
  { value: "privacy", label: "Privacy Policy" },
  { value: "privacy_policy", label: "Privacy Policy" },
  { value: "security_policy", label: "Security Policy" },
  { value: "gdpr", label: "GDPR Compliance" },
  { value: "gdpr_compliance", label: "GDPR Compliance" },
  { value: "ccpa", label: "CCPA Compliance" },
  { value: "dpdp", label: "DPDP Compliance" },
  { value: "data_storage_policy", label: "Data Storage Policy" },
  { value: "user_guidelines", label: "User Guidelines" },
  { value: "anti_sexual_content", label: "Anti-Sexual Content Policy" },
  { value: "payments_policy", label: "Payments & Payouts" },
  { value: "content_moderation", label: "Content Moderation" },
  { value: "age_verification", label: "Age Verification" },
  { value: "ai_disclosure", label: "AI Usage Disclosure" },
  { value: "data_retention", label: "Data Retention" },
  { value: "cookie", label: "Cookie Policy" },
  { value: "refund", label: "Refund Policy" },
  { value: "other", label: "Other" },
];

const AdminLegalDocuments = () => {
  const navigate = useNavigate();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isProduction } = useProductionMode();
  
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocument, setNewDocument] = useState({
    name: "",
    document_type: "terms",
    version: "1.0",
    description: "",
    effective_date: "",
    is_active: false,
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast.error("Error", { description: "Failed to load legal documents" });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
    toast.success("Refreshed", { description: "Document list updated" });
  };

  const handleSeedDocuments = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-legal-documents');
      
      if (error) throw error;
      
      toast.success("Documents Seeded", { description: `Successfully seeded ${data?.results?.filter((r: any) => r.status === 'created').length || 0} documents` });
      
      await fetchDocuments();
    } catch (error: any) {
      console.error("Error seeding documents:", error);
      toast.error("Seeding Failed", { description: classifyError(error, "seed default documents").message });
    } finally {
      setSeeding(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newDocument.name) {
        setNewDocument(prev => ({
          ...prev,
          name: file.name.replace(/\.[^/.]+$/, ""),
        }));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("No file selected", { description: "Please select a file to upload" });
      return;
    }

    if (!newDocument.name.trim()) {
      toast.error("Name required", { description: "Please enter a document name" });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${newDocument.document_type}/${Date.now()}_${newDocument.version}.${fileExt}`;
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(fileName, selectedFile);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(95);

      // Create document record
      const { error: insertError } = await supabase
        .from('legal_documents')
        .insert({
          name: newDocument.name,
          document_type: newDocument.document_type,
          version: newDocument.version,
          description: newDocument.description || null,
          file_path: fileName,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          is_active: newDocument.is_active,
          uploaded_by: user?.id,
          effective_date: newDocument.effective_date || null,
        });

      if (insertError) throw insertError;

      setUploadProgress(100);

      toast.success("Document uploaded", { description: `${newDocument.name} has been uploaded successfully` });

      // Reset form
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setNewDocument({
        name: "",
        document_type: "terms",
        version: "1.0",
        description: "",
        effective_date: "",
        is_active: false,
      });
      setUploadProgress(0);
      
      await fetchDocuments();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error("Upload failed", { description: classifyError(error, "upload the document").message });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: LegalDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('legal-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.name}_v${document.version}.${document.file_path.split('.').pop()}`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Download started", { description: `Downloading ${document.name}` });
    } catch (error: any) {
      console.error("Error downloading document:", error);
      toast({
        title: "Download failed",
        description: classifyError(error, "download the document").message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (document: LegalDocument) => {
    try {
      const { error } = await supabase
        .from('legal_documents')
        .update({ is_active: !document.is_active })
        .eq('id', document.id);

      if (error) throw error;

      toast({
        title: document.is_active ? "Deactivated" : "Activated",
        description: `${document.name} is now ${document.is_active ? 'inactive' : 'active'}`,
      });

      await fetchDocuments();
    } catch (error: any) {
      console.error("Error toggling document status:", error);
      toast({
        title: "Error",
        description: "Failed to update document status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (document: LegalDocument) => {
    if (!confirm(`Are you sure you want to delete "${document.name}"?`)) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('legal-documents')
        .remove([document.file_path]);

      // Delete from database
      const { error } = await supabase
        .from('legal_documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;

      toast({
        title: "Document deleted",
        description: `${document.name} has been deleted`,
      });

      await fetchDocuments();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete failed",
        description: classifyError(error, "delete the document").message,
        variant: "destructive",
      });
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "—";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getTypeLabel = (type: string) => {
    return documentTypes.find(t => t.value === type)?.label || type;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: documents.length,
    active: documents.filter(d => d.is_active).length,
    types: [...new Set(documents.map(d => d.document_type))].length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading legal documents...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminNav>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Legal Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage terms, privacy, and compliance documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isProduction && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDocuments}
              disabled={seeding}
              className="border-warning/50 text-warning hover:bg-warning/10"
            >
              <FileCheck className={`w-4 h-4 mr-2 ${seeding ? 'animate-pulse' : ''}`} />
              {seeding ? 'Seeding...' : 'Seed Defaults'}
              <Badge variant="warningOutline" className="ml-2 text-xs">
                Dev
              </Badge>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setUploadDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Documents</p>
                  <p className="text-2xl font-bold text-success">{stats.active}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Document Types</p>
                  <p className="text-2xl font-bold text-foreground">{stats.types}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                  <File className="w-6 h-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[200px] bg-muted/50 border-border">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {documentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Documents</CardTitle>
            <CardDescription>
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No documents found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || typeFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Click \"Upload Document\" to add your first document"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map((doc, index) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-all duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          doc.is_active ? "bg-success/10" : "bg-muted"
                        }`}>
                          <FileCheck className={`w-6 h-6 ${doc.is_active ? "text-success" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-foreground truncate">{doc.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              v{doc.version}
                            </Badge>
                            <Badge className={`text-xs ${
                              doc.is_active 
                                ? "bg-success/20 text-success border-success/30" 
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {doc.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getTypeLabel(doc.document_type)}
                          </p>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {doc.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(doc.created_at), "MMM dd, yyyy")}
                            </span>
                            {doc.file_size && (
                              <span className="flex items-center gap-1">
                                <File className="w-3 h-3" />
                                {formatBytes(doc.file_size)}
                              </span>
                            )}
                            {doc.effective_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Effective: {format(new Date(doc.effective_date), "MMM dd, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2 mr-2">
                          <Switch
                            checked={doc.is_active}
                            onCheckedChange={() => handleToggleActive(doc)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(doc)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Upload Legal Document</DialogTitle>
            <DialogDescription>
              Upload a new legal document for your application
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>Document File</Label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.html"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    <span className="text-sm text-foreground">{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, DOCX, TXT, HTML
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                value={newDocument.name}
                onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Terms of Service"
                className="bg-muted/50 border-border"
              />
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select 
                value={newDocument.document_type} 
                onValueChange={(value) => setNewDocument(prev => ({ ...prev, document_type: value }))}
              >
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Version */}
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={newDocument.version}
                onChange={(e) => setNewDocument(prev => ({ ...prev, version: e.target.value }))}
                placeholder="e.g., 1.0"
                className="bg-muted/50 border-border"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newDocument.description}
                onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of changes..."
                className="bg-muted/50 border-border resize-none"
                rows={2}
              />
            </div>

            {/* Effective Date */}
            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date (Optional)</Label>
              <Input
                id="effective_date"
                type="date"
                value={newDocument.effective_date}
                onChange={(e) => setNewDocument(prev => ({ ...prev, effective_date: e.target.value }))}
                className="bg-muted/50 border-border"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Set as Active</Label>
                <p className="text-xs text-muted-foreground">
                  Make this document visible to users
                </p>
              </div>
              <Switch
                checked={newDocument.is_active}
                onCheckedChange={(checked) => setNewDocument(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="bg-primary hover:bg-primary/90"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminNav>
  );
};

export default AdminLegalDocuments;
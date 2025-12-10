import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  Shield,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Eye,
  Ban,
  Send,
  Search,
  Filter,
  Scan,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PolicyAlert {
  id: string;
  user_id: string;
  alert_type: string;
  violation_type: string;
  severity: string;
  content: string | null;
  source_message_id: string | null;
  source_chat_id: string | null;
  detected_by: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  action_taken: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  gender: string | null;
  photo_url: string | null;
}

const AdminPolicyAlerts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [alerts, setAlerts] = useState<PolicyAlert[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("pending");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [violationTypeFilter, setViolationTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog state
  const [selectedAlert, setSelectedAlert] = useState<PolicyAlert | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("");

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    reviewing: 0,
    resolved: 0,
    critical: 0,
    high: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator"])
        .maybeSingle();

      if (!roleData) {
        toast.error("Access denied. Admin or Moderator privileges required.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/dashboard");
    }
  };

  const loadStats = useCallback(async () => {
    try {
      const { data: allAlerts } = await supabase
        .from("policy_violation_alerts")
        .select("status, severity");

      if (allAlerts) {
        setStats({
          pending: allAlerts.filter(a => a.status === "pending").length,
          reviewing: allAlerts.filter(a => a.status === "reviewing").length,
          resolved: allAlerts.filter(a => a.status === "resolved").length,
          critical: allAlerts.filter(a => a.severity === "critical").length,
          high: allAlerts.filter(a => a.severity === "high").length,
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      let query = supabase
        .from("policy_violation_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }
      if (violationTypeFilter !== "all") {
        query = query.eq("violation_type", violationTypeFilter);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      setAlerts(data || []);

      // Load user profiles for alerts
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, gender, photo_url")
          .in("user_id", userIds);

        const profileMap: Record<string, UserProfile> = {};
        profiles?.forEach(p => {
          profileMap[p.user_id] = p;
        });
        setUserProfiles(profileMap);
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, severityFilter, violationTypeFilter]);

  // Real-time subscription for policy alerts
  useRealtimeSubscription({
    table: "policy_violation_alerts",
    onUpdate: () => {
      loadAlerts();
      loadStats();
    },
    enabled: isAdmin
  });

  useEffect(() => {
    if (isAdmin) {
      loadAlerts();
      loadStats();
    }
  }, [isAdmin, loadAlerts, loadStats]);
    setRefreshing(true);
    loadAlerts();
    loadStats();
  };

  const handleScanMessages = async () => {
    setScanning(true);
    try {
      const response = await fetch(
        "https://tvneohngeracipjajzos.supabase.co/functions/v1/content-moderation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmVvaG5nZXJhY2lwamFqem9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODgxNDEsImV4cCI6MjA4MDU2NDE0MX0.3YgATF-HMODDQe5iJbpiUuL2SlycM5Z5XmAdKbnjg_A`,
          },
          body: JSON.stringify({ action: "scan_recent_messages" }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(`Scan complete: ${data.flagged} violations found in ${data.scanned} messages`);
        loadAlerts();
        loadStats();
      } else {
        toast.error("Scan failed: " + data.error);
      }
    } catch (error) {
      console.error("Error scanning messages:", error);
      toast.error("Failed to scan messages");
    } finally {
      setScanning(false);
    }
  };

  const openAlertDetails = (alert: PolicyAlert) => {
    setSelectedAlert(alert);
    setAdminNotes(alert.admin_notes || "");
    setActionTaken(alert.action_taken || "");
    setAlertDialogOpen(true);
  };

  const openMessageDialog = (alert: PolicyAlert) => {
    setSelectedAlert(alert);
    setMessageContent("");
    setMessageDialogOpen(true);
  };

  const handleUpdateAlert = async (newStatus: string) => {
    if (!selectedAlert) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("policy_violation_alerts")
        .update({
          status: newStatus,
          admin_notes: adminNotes,
          action_taken: actionTaken,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedAlert.id);

      if (error) throw error;

      toast.success(`Alert marked as ${newStatus}`);
      setAlertDialogOpen(false);
      loadAlerts();
      loadStats();
    } catch (error) {
      console.error("Error updating alert:", error);
      toast.error("Failed to update alert");
    }
  };

  const handleSendMessage = async () => {
    if (!selectedAlert || !messageContent.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Insert notification for the user
      const { error } = await supabase.from("notifications").insert({
        user_id: selectedAlert.user_id,
        title: "Policy Violation Warning",
        message: messageContent,
        type: "warning",
      });

      if (error) throw error;

      // Update alert with action taken
      await supabase
        .from("policy_violation_alerts")
        .update({
          action_taken: `Warning message sent: ${messageContent.substring(0, 100)}...`,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedAlert.id);

      toast.success("Warning message sent to user");
      setMessageDialogOpen(false);
      loadAlerts();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: "blocked", updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("User blocked successfully");
      
      // Update alert
      if (selectedAlert) {
        await supabase
          .from("policy_violation_alerts")
          .update({
            action_taken: "User blocked",
            status: "resolved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedAlert.id);
      }

      setAlertDialogOpen(false);
      loadAlerts();
      loadStats();
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Failed to block user");
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="animate-pulse"><AlertCircle className="h-3 w-3 mr-1" />Critical</Badge>;
      case "high":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-orange-500">Pending</Badge>;
      case "reviewing":
        return <Badge className="bg-blue-500">Reviewing</Badge>;
      case "resolved":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case "dismissed":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getViolationTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      sexual_content: "bg-pink-500",
      harassment: "bg-red-500",
      hate_speech: "bg-red-700",
      spam: "bg-gray-500",
      scam: "bg-orange-500",
      contact_sharing: "bg-blue-500",
      tos_violation: "bg-purple-500",
      guidelines_violation: "bg-indigo-500",
    };
    return <Badge className={colors[type] || "bg-gray-500"}>{type.replace(/_/g, " ")}</Badge>;
  };

  const filteredAlerts = alerts.filter(alert => {
    if (!searchQuery) return true;
    const profile = userProfiles[alert.user_id];
    return (
      profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.violation_type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="auroraGhost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                Policy Violation Alerts
              </h1>
              <p className="text-sm text-muted-foreground hidden md:block">
                Monitor and respond to policy violations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="auroraOutline" onClick={handleScanMessages} disabled={scanning}>
              <Scan className={cn("h-4 w-4 mr-2", scanning && "animate-spin")} />
              {scanning ? "Scanning..." : "Scan Messages"}
            </Button>
            <Button variant="auroraOutline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className={cn(stats.pending > 0 && "border-orange-500")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Reviewing</p>
              <p className="text-2xl font-bold text-blue-500">{stats.reviewing}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
            </CardContent>
          </Card>
          <Card className={cn(stats.critical > 0 && "border-red-500 animate-pulse")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-red-500">{stats.critical}</p>
            </CardContent>
          </Card>
          <Card className={cn(stats.high > 0 && "border-red-400")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">High Severity</p>
              <p className="text-2xl font-bold text-red-400">{stats.high}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, content, or violation type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={violationTypeFilter} onValueChange={setViolationTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Violation Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sexual_content">Sexual Content</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="hate_speech">Hate Speech</SelectItem>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="scam">Scam</SelectItem>
                    <SelectItem value="contact_sharing">Contact Sharing</SelectItem>
                    <SelectItem value="tos_violation">TOS Violation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Violation Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Violation</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Content Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No alerts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlerts.map((alert) => {
                      const profile = userProfiles[alert.user_id];
                      return (
                        <TableRow key={alert.id} className={cn(
                          alert.severity === "critical" && "bg-red-500/10",
                          alert.severity === "high" && "bg-red-500/5"
                        )}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                                {profile?.photo_url ? (
                                  <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-xs">
                                    {profile?.full_name?.[0] || "?"}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{profile?.full_name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{profile?.gender}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getViolationTypeBadge(alert.violation_type)}</TableCell>
                          <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                          <TableCell>
                            <p className="text-sm truncate max-w-[200px]" title={alert.content || ""}>
                              {alert.content?.substring(0, 50) || "N/A"}...
                            </p>
                          </TableCell>
                          <TableCell>{getStatusBadge(alert.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(alert.created_at), "MMM dd, HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openAlertDetails(alert)} title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openMessageDialog(alert)} title="Send Warning">
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Details Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Alert Details
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p className="font-medium">{userProfiles[selectedAlert.user_id]?.full_name || "Unknown"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Violation Type</Label>
                  <div>{getViolationTypeBadge(selectedAlert.violation_type)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Severity</Label>
                  <div>{getSeverityBadge(selectedAlert.severity)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Detected By</Label>
                  <p>{selectedAlert.detected_by}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Flagged Content</Label>
                <div className="p-3 bg-muted rounded-lg mt-1">
                  <p className="text-sm whitespace-pre-wrap">{selectedAlert.content || "No content"}</p>
                </div>
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this alert..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Action Taken</Label>
                <Select value={actionTaken} onValueChange={setActionTaken}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning_sent">Warning Sent</SelectItem>
                    <SelectItem value="user_suspended">User Suspended</SelectItem>
                    <SelectItem value="user_blocked">User Blocked</SelectItem>
                    <SelectItem value="content_removed">Content Removed</SelectItem>
                    <SelectItem value="false_positive">False Positive</SelectItem>
                    <SelectItem value="no_action">No Action Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="destructive" onClick={() => handleBlockUser(selectedAlert!.user_id)}>
              <Ban className="h-4 w-4 mr-2" />
              Block User
            </Button>
            <Button variant="outline" onClick={() => handleUpdateAlert("dismissed")}>
              Dismiss
            </Button>
            <Button variant="outline" onClick={() => handleUpdateAlert("reviewing")}>
              Mark Reviewing
            </Button>
            <Button onClick={() => handleUpdateAlert("resolved")}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Send Warning Message
            </DialogTitle>
            <DialogDescription>
              Send a warning notification to {userProfiles[selectedAlert?.user_id || ""]?.full_name || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Violation</Label>
              <div className="mt-1">{selectedAlert && getViolationTypeBadge(selectedAlert.violation_type)}</div>
            </div>
            <div>
              <Label>Warning Message</Label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Your account has been flagged for violating our community guidelines..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={!messageContent.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPolicyAlerts;

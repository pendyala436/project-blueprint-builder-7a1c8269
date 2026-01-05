import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Users,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Pause,
  Play,
  Settings,
  Languages,
  Bot,
  Zap,
  Heart,
  HeartOff,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  gender: string | null;
  country: string | null;
  state: string | null;
  verification_status: boolean | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  primary_language: string | null;
  performance_score: number;
  ai_approved: boolean;
  ai_disapproval_reason: string | null;
  account_status: string;
  approval_status: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface LanguageGroup {
  id: string;
  name: string;
  languages: string[];
  max_women_users: number;
  current_women_count: number;
  is_active: boolean;
}

const ITEMS_PER_PAGE = 10;

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    gender: "",
    country: "",
    verification_status: false,
  });
  
  // Language group management
  const [languageGroups, setLanguageGroups] = useState<LanguageGroup[]>([]);
  const [languageGroupDialogOpen, setLanguageGroupDialogOpen] = useState(false);
  const [selectedLanguageGroup, setSelectedLanguageGroup] = useState<LanguageGroup | null>(null);
  const [maxWomenInput, setMaxWomenInput] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    suspendedUsers: 0,
    pendingApproval: 0,
    approvedWomen: 0,
    aiApprovedWomen: 0,
  });
  
  const [runningAI, setRunningAI] = useState(false);

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
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/dashboard");
    }
  };

  const loadStats = async () => {
    try {
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("account_status, approval_status, gender, ai_approved");

      if (allProfiles) {
        setStats({
          totalUsers: allProfiles.length,
          activeUsers: allProfiles.filter(p => p.account_status === "active").length,
          blockedUsers: allProfiles.filter(p => p.account_status === "blocked").length,
          suspendedUsers: allProfiles.filter(p => p.account_status === "suspended").length,
          pendingApproval: allProfiles.filter(p => p.approval_status === "pending" && p.gender?.toLowerCase() === "female").length,
          approvedWomen: allProfiles.filter(p => p.approval_status === "approved" && p.gender?.toLowerCase() === "female").length,
          aiApprovedWomen: allProfiles.filter(p => p.ai_approved === true && p.gender?.toLowerCase() === "female").length,
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };
  
  const runAIApproval = async () => {
    setRunningAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-women-approval', {});
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(`AI Approval completed: ${data.results.approved} approved, ${data.results.disapproved} disapproved, ${data.results.rotatedOut} rotated out`);
        fetchUsers();
        loadStats();
        loadLanguageGroups();
      } else {
        toast.error("AI Approval failed: " + data.error);
      }
    } catch (error) {
      console.error("Error running AI approval:", error);
      toast.error("Failed to run AI approval");
    } finally {
      setRunningAI(false);
    }
  };

  const loadLanguageGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("language_groups")
        .select("id, name, languages, max_women_users, current_women_count, is_active")
        .order("name");

      if (error) throw error;
      setLanguageGroups((data || []) as LanguageGroup[]);
    } catch (error) {
      console.error("Error loading language groups:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" });

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,country.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`);
      }

      if (genderFilter !== "all") {
        query = query.eq("gender", genderFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("verification_status", statusFilter === "verified");
      }

      if (accountStatusFilter !== "all") {
        query = query.eq("account_status", accountStatusFilter);
      }

      if (approvalFilter !== "all") {
        query = query.eq("approval_status", approvalFilter);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setUsers((data || []) as UserProfile[]);
      setTotalCount(count || 0);

      if (data && data.length > 0) {
        const userIds = data.map(u => u.user_id);
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        const rolesMap: Record<string, string> = {};
        rolesData?.forEach(r => {
          rolesMap[r.user_id] = r.role;
        });
        setUserRoles(rolesMap);
      }

    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      loadLanguageGroups();
      loadStats();
    }
  }, [isAdmin, currentPage, searchQuery, genderFilter, statusFilter, accountStatusFilter, approvalFilter]);

  // Real-time subscriptions for user data
  useMultipleRealtimeSubscriptions(
    ["profiles", "user_roles", "language_groups"],
    () => {
      if (isAdmin) {
        fetchUsers();
        loadLanguageGroups();
        loadStats();
      }
    },
    isAdmin
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
    loadLanguageGroups();
    loadStats();
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || "",
      gender: user.gender || "",
      country: user.country || "",
      verification_status: user.verification_status || false,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          gender: editForm.gender,
          country: editForm.country,
          verification_status: editForm.verification_status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("User updated successfully");
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      fetchUsers();
      loadStats();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleToggleVerification = async (user: UserProfile) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          verification_status: !user.verification_status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`User ${user.verification_status ? "unverified" : "verified"} successfully`);
      fetchUsers();
    } catch (error) {
      console.error("Error toggling verification:", error);
      toast.error("Failed to update verification status");
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole as "admin" | "moderator" | "user" })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: newRole as "admin" | "moderator" | "user",
          });

        if (error) throw error;
      }

      toast.success("Role updated successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error("Failed to update role");
    }
  };

  // Block/Unblock user
  const handleBlockUser = async (user: UserProfile) => {
    try {
      const newStatus = user.account_status === "blocked" ? "active" : "blocked";
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`User ${newStatus === "blocked" ? "blocked" : "unblocked"} successfully`);
      fetchUsers();
      loadStats();
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Failed to update block status");
    }
  };

  // Suspend/Unsuspend user
  const handleSuspendUser = async (user: UserProfile) => {
    try {
      const newStatus = user.account_status === "suspended" ? "active" : "suspended";
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`User ${newStatus === "suspended" ? "suspended" : "unsuspended"} successfully`);
      fetchUsers();
      loadStats();
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error("Failed to update suspend status");
    }
  };

  // Approve/Disapprove user (mainly for women)
  const handleApproveUser = async (user: UserProfile, approve: boolean) => {
    try {
      const newStatus = approve ? "approved" : "disapproved";
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`User ${approve ? "approved" : "disapproved"} successfully`);
      fetchUsers();
      loadStats();
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to update approval status");
    }
  };

  // Friend/Unfriend users (admin can create friendships between any two users)
  const [friendDialogOpen, setFriendDialogOpen] = useState(false);
  const [friendTargetUser, setFriendTargetUser] = useState<UserProfile | null>(null);
  const [friendWithUserId, setFriendWithUserId] = useState("");

  const handleOpenFriendDialog = (user: UserProfile) => {
    setFriendTargetUser(user);
    setFriendWithUserId("");
    setFriendDialogOpen(true);
  };

  const handleCreateFriendship = async () => {
    if (!friendTargetUser || !friendWithUserId) return;

    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from("user_friends")
        .select("id")
        .or(`and(user_id.eq.${friendTargetUser.user_id},friend_id.eq.${friendWithUserId}),and(user_id.eq.${friendWithUserId},friend_id.eq.${friendTargetUser.user_id})`)
        .maybeSingle();

      if (existing) {
        toast.error("Friendship already exists between these users");
        return;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("user_friends")
        .insert({
          user_id: friendTargetUser.user_id,
          friend_id: friendWithUserId,
          status: "accepted",
          created_by: currentUser?.id,
        });

      if (error) throw error;

      toast.success("Friendship created successfully");
      setFriendDialogOpen(false);
    } catch (error) {
      console.error("Error creating friendship:", error);
      toast.error("Failed to create friendship");
    }
  };

  const handleUnfriend = async (userId: string, friendId: string) => {
    try {
      const { error } = await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

      if (error) throw error;

      toast.success("Friendship removed successfully");
    } catch (error) {
      console.error("Error removing friendship:", error);
      toast.error("Failed to remove friendship");
    }
  };

  // Update language group max women
  const handleUpdateLanguageGroupLimit = async () => {
    if (!selectedLanguageGroup || !maxWomenInput) return;

    try {
      const { error } = await supabase
        .from("language_groups")
        .update({ max_women_users: parseInt(maxWomenInput), updated_at: new Date().toISOString() })
        .eq("id", selectedLanguageGroup.id);

      if (error) throw error;

      toast.success("Language group limit updated successfully");
      setLanguageGroupDialogOpen(false);
      loadLanguageGroups();
    } catch (error) {
      console.error("Error updating language group:", error);
      toast.error("Failed to update language group");
    }
  };

  const openLanguageGroupDialog = (group: LanguageGroup) => {
    setSelectedLanguageGroup(group);
    setMaxWomenInput(group.max_women_users.toString());
    setLanguageGroupDialogOpen(true);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getAccountStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case "blocked":
        return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Blocked</Badge>;
      case "suspended":
        return <Badge variant="warning"><Pause className="h-3 w-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getApprovalStatusBadge = (user: UserProfile) => {
    const { approval_status, gender, ai_approved, ai_disapproval_reason, performance_score } = user;
    
    // Men are auto-approved
    if (gender?.toLowerCase() === "male") {
      return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Auto-Approved</Badge>;
    }
    
    switch (approval_status) {
      case "approved":
        return (
          <div className="flex flex-col gap-1">
            <Badge className={ai_approved ? "bg-secondary text-secondary-foreground" : "bg-success text-success-foreground"}>
              {ai_approved ? <Bot className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
              {ai_approved ? "AI Approved" : "Approved"}
            </Badge>
            <span className="text-xs text-muted-foreground">Score: {performance_score}/100</span>
          </div>
        );
      case "disapproved":
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Disapproved</Badge>
            {ai_disapproval_reason && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={ai_disapproval_reason}>
                {ai_disapproval_reason}
              </span>
            )}
          </div>
        );
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{approval_status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                User Management
              </h1>
              <p className="text-sm text-muted-foreground hidden md:block">
                Manage users, approvals, blocks, and language group limits
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Admin
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="language-groups">Language Group Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* AI Approval Section */}
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Bot className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">AI Women Approval System</h3>
                      <p className="text-sm text-muted-foreground">
                        Auto-approves women up to 150 per language. Monitors performance and removes inactive users (30+ days).
                      </p>
                    </div>
                  </div>
                  <Button onClick={runAIApproval} disabled={runningAI}>
                    <Zap className={cn("h-4 w-4 mr-2", runningAI && "animate-pulse")} />
                    {runningAI ? "Running AI..." : "Run AI Approval"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-success">{stats.activeUsers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Blocked</p>
                  <p className="text-2xl font-bold text-destructive">{stats.blockedUsers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Suspended</p>
                  <p className="text-2xl font-bold text-warning">{stats.suspendedUsers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.pendingApproval}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Approved Women</p>
                  <p className="text-2xl font-bold text-pink-500">{stats.approvedWomen}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">AI Approved</p>
                  <p className="text-2xl font-bold text-purple-500">{stats.aiApprovedWomen}</p>
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
                      placeholder="Search by name, country, or state..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <Select
                      value={genderFilter}
                      onValueChange={(value) => {
                        setGenderFilter(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[130px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={accountStatusFilter}
                      onValueChange={(value) => {
                        setAccountStatusFilter(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Account Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={approvalFilter}
                      onValueChange={(value) => {
                        setApprovalFilter(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Approval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Approval</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="disapproved">Disapproved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Registered Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Account Status</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user, index) => (
                          <TableRow
                            key={user.id}
                            className={cn(
                              "transition-all duration-200 hover:bg-muted/50 animate-fade-in",
                            )}
                            style={{ animationDelay: `${index * 30}ms` }}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
                                  {user.photo_url ? (
                                    <img
                                      src={user.photo_url}
                                      alt={user.full_name || "User"}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                      <Users className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{user.full_name || "Unknown"}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {user.primary_language || "No language"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  user.gender?.toLowerCase() === "male" && "border-blue-500 text-blue-500",
                                  user.gender?.toLowerCase() === "female" && "border-pink-500 text-pink-500"
                                )}
                              >
                                {user.gender || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{user.country || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">{user.state}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={userRoles[user.user_id] || "user"}
                                onValueChange={(value) => handleChangeRole(user.user_id, value)}
                              >
                                <SelectTrigger className="w-[110px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" /> User
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="moderator">
                                    <span className="flex items-center gap-1">
                                      <ShieldAlert className="h-3 w-3" /> Moderator
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <span className="flex items-center gap-1">
                                      <ShieldCheck className="h-3 w-3" /> Admin
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {getAccountStatusBadge(user.account_status)}
                            </TableCell>
                            <TableCell>
                              {getApprovalStatusBadge(user)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(user.created_at), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleVerification(user)}
                                  >
                                    {user.verification_status ? (
                                      <><UserX className="h-4 w-4 mr-2" /> Unverify</>
                                    ) : (
                                      <><UserCheck className="h-4 w-4 mr-2" /> Verify</>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  
                                  {/* Block/Unblock */}
                                  <DropdownMenuItem onClick={() => handleBlockUser(user)}>
                                    {user.account_status === "blocked" ? (
                                      <><Play className="h-4 w-4 mr-2" /> Unblock</>
                                    ) : (
                                      <><Ban className="h-4 w-4 mr-2" /> Block</>
                                    )}
                                  </DropdownMenuItem>
                                  
                                  {/* Suspend/Unsuspend */}
                                  <DropdownMenuItem onClick={() => handleSuspendUser(user)}>
                                    {user.account_status === "suspended" ? (
                                      <><Play className="h-4 w-4 mr-2" /> Unsuspend</>
                                    ) : (
                                      <><Pause className="h-4 w-4 mr-2" /> Suspend</>
                                    )}
                                  </DropdownMenuItem>
                                  
                                  {/* Approve/Disapprove (only for women) */}
                                  {user.gender?.toLowerCase() === "female" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      {user.approval_status !== "approved" && (
                                        <DropdownMenuItem onClick={() => handleApproveUser(user, true)}>
                                          <CheckCircle className="h-4 w-4 mr-2" /> Approve
                                        </DropdownMenuItem>
                                      )}
                                      {user.approval_status !== "disapproved" && (
                                        <DropdownMenuItem onClick={() => handleApproveUser(user, false)}>
                                          <XCircle className="h-4 w-4 mr-2" /> Disapprove
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Friend Management */}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleOpenFriendDialog(user)}>
                                    <UserPlus className="h-4 w-4 mr-2" /> Add Friend
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-red-500 focus:text-red-500"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} users
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="language-groups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Language Group Women Limits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Set the maximum number of women users allowed per language group. Women need admin approval to join.
                </p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Language Group</TableHead>
                        <TableHead>Languages</TableHead>
                        <TableHead>Current Women</TableHead>
                        <TableHead>Max Women</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {languageGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No language groups found
                          </TableCell>
                        </TableRow>
                      ) : (
                        languageGroups.map((group) => (
                          <TableRow key={group.id}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {group.languages.slice(0, 3).map((lang, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {lang}
                                  </Badge>
                                ))}
                                {group.languages.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{group.languages.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "font-medium",
                                group.current_women_count >= group.max_women_users && "text-red-500"
                              )}>
                                {group.current_women_count}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{group.max_women_users}</Badge>
                            </TableCell>
                            <TableCell>
                              {group.current_women_count >= group.max_women_users ? (
                                <Badge variant="destructive">Full</Badge>
                              ) : (
                                <Badge className="bg-green-500">Available</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openLanguageGroupDialog(group)}
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                Set Limit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender">Gender</Label>
              <Select
                value={editForm.gender}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-country">Country</Label>
              <Input
                id="edit-country"
                value={editForm.country}
                onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-verified"
                checked={editForm.verification_status}
                onChange={(e) => setEditForm(prev => ({ ...prev, verification_status: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-verified">Verified User</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              User: <strong>{selectedUser?.full_name || "Unknown"}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Language Group Limit Dialog */}
      <Dialog open={languageGroupDialogOpen} onOpenChange={setLanguageGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Maximum Women Users</DialogTitle>
            <DialogDescription>
              Set the maximum number of women users allowed for {selectedLanguageGroup?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="max-women">Maximum Women Users</Label>
              <Input
                id="max-women"
                type="number"
                min="0"
                value={maxWomenInput}
                onChange={(e) => setMaxWomenInput(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Current count: {selectedLanguageGroup?.current_women_count || 0} women
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLanguageGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLanguageGroupLimit}>Save Limit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Friend Dialog */}
      <Dialog open={friendDialogOpen} onOpenChange={setFriendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Add Friend for {friendTargetUser?.full_name || "User"}
            </DialogTitle>
            <DialogDescription>
              Create a friendship between this user and another user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="friend-user-id">Friend's User ID</Label>
              <Input
                id="friend-user-id"
                placeholder="Enter the user_id of the friend"
                value={friendWithUserId}
                onChange={(e) => setFriendWithUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You can find the user_id in the user table. Enter the UUID of the user to friend.
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Current User:</strong> {friendTargetUser?.full_name || "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                ID: {friendTargetUser?.user_id}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFriendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFriendship} disabled={!friendWithUserId}>
              <Heart className="h-4 w-4 mr-2" />
              Create Friendship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;

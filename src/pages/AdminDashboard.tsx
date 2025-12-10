import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "@/components/AdminNav";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import {
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Shield,
  FileText,
  Clock,
  DollarSign,
  Bell,
  Activity,
  Gift,
  Globe,
  Database,
  AlertTriangle,
  Languages,
  ChevronRight,
  TrendingUp,
  UserCheck,
  MessageCircle
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  onlineUsers: number;
  totalChats: number;
  activeChats: number;
  todayEarnings: number;
  pendingApprovals: number;
  policyAlerts: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isLoading, isAdmin, adminEmail } = useAdminAccess();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    onlineUsers: 0,
    totalChats: 0,
    activeChats: 0,
    todayEarnings: 0,
    pendingApprovals: 0,
    policyAlerts: 0
  });

  const adminModules = [
    {
      title: "User Management",
      description: "Manage users, roles, and permissions",
      icon: <Users className="h-6 w-6" />,
      path: "/admin/users",
      color: "from-blue-500 to-blue-600",
      badge: stats.pendingApprovals > 0 ? `${stats.pendingApprovals} pending` : undefined
    },
    {
      title: "Analytics Dashboard",
      description: "View platform analytics and insights",
      icon: <BarChart3 className="h-6 w-6" />,
      path: "/admin/analytics",
      color: "from-green-500 to-green-600"
    },
    {
      title: "Chat Monitoring",
      description: "Monitor active chats and conversations",
      icon: <MessageSquare className="h-6 w-6" />,
      path: "/admin/chat-monitoring",
      color: "from-purple-500 to-purple-600",
      badge: stats.activeChats > 0 ? `${stats.activeChats} active` : undefined
    },
    {
      title: "Finance Dashboard",
      description: "Revenue, transactions, and payouts",
      icon: <DollarSign className="h-6 w-6" />,
      path: "/admin/finance",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      title: "Chat Pricing",
      description: "Configure chat and video call rates",
      icon: <Clock className="h-6 w-6" />,
      path: "/admin/chat-pricing",
      color: "from-amber-500 to-amber-600"
    },
    {
      title: "Gift Management",
      description: "Manage virtual gifts and pricing",
      icon: <Gift className="h-6 w-6" />,
      path: "/admin/gifts",
      color: "from-pink-500 to-pink-600"
    },
    {
      title: "Language Groups",
      description: "Manage language-based user groups",
      icon: <Globe className="h-6 w-6" />,
      path: "/admin/languages",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      title: "Language Limits",
      description: "Set language capacity limits",
      icon: <Languages className="h-6 w-6" />,
      path: "/admin/language-limits",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      title: "Content Moderation",
      description: "Review flagged content and reports",
      icon: <Shield className="h-6 w-6" />,
      path: "/admin/moderation",
      color: "from-red-500 to-red-600"
    },
    {
      title: "Policy Alerts",
      description: "View policy violation alerts",
      icon: <AlertTriangle className="h-6 w-6" />,
      path: "/admin/policy-alerts",
      color: "from-orange-500 to-orange-600",
      badge: stats.policyAlerts > 0 ? `${stats.policyAlerts} alerts` : undefined
    },
    {
      title: "Sample Users",
      description: "Manage sample/demo users",
      icon: <UserCheck className="h-6 w-6" />,
      path: "/admin/sample-users",
      color: "from-violet-500 to-violet-600"
    },
    {
      title: "Performance",
      description: "System performance metrics",
      icon: <Activity className="h-6 w-6" />,
      path: "/admin/performance",
      color: "from-teal-500 to-teal-600"
    },
    {
      title: "Finance Reports",
      description: "Detailed financial reports",
      icon: <FileText className="h-6 w-6" />,
      path: "/admin/finance-reports",
      color: "from-slate-500 to-slate-600"
    },
    {
      title: "Legal Documents",
      description: "Manage terms, policies, and legal docs",
      icon: <FileText className="h-6 w-6" />,
      path: "/admin/legal-documents",
      color: "from-gray-500 to-gray-600"
    },
    {
      title: "Backup Management",
      description: "Database backups and restoration",
      icon: <Database className="h-6 w-6" />,
      path: "/admin/backups",
      color: "from-stone-500 to-stone-600"
    },
    {
      title: "Audit Logs",
      description: "View admin activity logs",
      icon: <Clock className="h-6 w-6" />,
      path: "/admin/audit-logs",
      color: "from-zinc-500 to-zinc-600"
    },
    {
      title: "Admin Settings",
      description: "Platform configuration settings",
      icon: <Settings className="h-6 w-6" />,
      path: "/admin/settings",
      color: "from-neutral-500 to-neutral-600"
    }
  ];

  const loadStats = useCallback(async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get online users
      const { count: onlineUsers } = await supabase
        .from("user_status")
        .select("*", { count: "exact", head: true })
        .eq("is_online", true);

      // Get active chats
      const { count: activeChats } = await supabase
        .from("active_chat_sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Get pending approvals
      const { count: pendingApprovals } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("approval_status", "pending")
        .eq("gender", "Female");

      // Get policy alerts
      const { count: policyAlerts } = await supabase
        .from("policy_violation_alerts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Get today's earnings
      const today = new Date().toISOString().split("T")[0];
      const { data: todayTransactions } = await supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("type", "credit")
        .gte("created_at", `${today}T00:00:00`);

      const todayEarnings = todayTransactions?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0,
        totalChats: 0,
        activeChats: activeChats || 0,
        todayEarnings,
        pendingApprovals: pendingApprovals || 0,
        policyAlerts: policyAlerts || 0
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  // Real-time subscriptions for dashboard stats
  useMultipleRealtimeSubscriptions(
    ["profiles", "user_status", "active_chat_sessions", "policy_violation_alerts", "wallet_transactions"],
    loadStats,
    isAdmin
  );

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin, loadStats]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminNav>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor the Meow Meow platform • {adminEmail}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.onlineUsers}</p>
                <p className="text-xs text-muted-foreground">Online Now</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20">
                <MessageCircle className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeChats}</p>
                <p className="text-xs text-muted-foreground">Active Chats</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{stats.todayEarnings}</p>
                <p className="text-xs text-muted-foreground">Today's Revenue</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Admin Modules Grid */}
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Admin Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {adminModules.map((module) => (
              <Card
                key={module.path}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/30"
                onClick={() => navigate(module.path)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${module.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      {module.icon}
                    </div>
                    {module.badge && (
                      <Badge variant="destructive" className="text-xs">
                        {module.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {module.description}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Alerts Section */}
        {(stats.pendingApprovals > 0 || stats.policyAlerts > 0) && (
          <Card className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Bell className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Pending Actions Required</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingApprovals > 0 && `${stats.pendingApprovals} user approvals pending. `}
                  {stats.policyAlerts > 0 && `${stats.policyAlerts} policy alerts to review.`}
                </p>
              </div>
              <div className="flex gap-2">
                {stats.pendingApprovals > 0 && (
                  <Button size="sm" variant="outline" onClick={() => navigate("/admin/users")}>
                    Review Users
                  </Button>
                )}
                {stats.policyAlerts > 0 && (
                  <Button size="sm" variant="outline" onClick={() => navigate("/admin/policy-alerts")}>
                    View Alerts
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </AdminNav>
  );
};

export default AdminDashboard;

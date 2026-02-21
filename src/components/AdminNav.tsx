import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import MeowLogo from "@/components/MeowLogo";
import {
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Shield,
  FileText,
  Clock,
  DollarSign,
  Activity,
  Gift,
  Globe,
  Database,
  AlertTriangle,
  Languages,
  LogOut,
  Menu,
  Home,
  UserCheck,
  History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface AdminNavProps {
  children: React.ReactNode;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

const AdminNav = ({ children }: AdminNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [policyAlerts, setPolicyAlerts] = useState(0);

  const navItems: NavItem[] = [
    { title: "Dashboard", path: "/admin", icon: <Home className="h-4 w-4" /> },
    { title: "User Management", path: "/admin/users", icon: <Users className="h-4 w-4" />, badge: pendingApprovals },
    { title: "Analytics", path: "/admin/analytics", icon: <BarChart3 className="h-4 w-4" /> },
    { title: "Chat Monitoring", path: "/admin/chat-monitoring", icon: <MessageSquare className="h-4 w-4" /> },
    { title: "Finance", path: "/admin/finance", icon: <DollarSign className="h-4 w-4" /> },
    { title: "Transaction History", path: "/admin/transactions", icon: <History className="h-4 w-4" /> },
    { title: "Finance Reports", path: "/admin/finance-reports", icon: <FileText className="h-4 w-4" /> },
    { title: "Chat Pricing", path: "/admin/chat-pricing", icon: <Clock className="h-4 w-4" /> },
    { title: "Gift Management", path: "/admin/gifts", icon: <Gift className="h-4 w-4" /> },
    { title: "Language Groups", path: "/admin/languages", icon: <Globe className="h-4 w-4" /> },
    { title: "Language Limits", path: "/admin/language-limits", icon: <Languages className="h-4 w-4" /> },
    { title: "KYC Management", path: "/admin/kyc", icon: <UserCheck className="h-4 w-4" /> },
    { title: "Moderation", path: "/admin/moderation", icon: <Shield className="h-4 w-4" /> },
    { title: "Policy Alerts", path: "/admin/policy-alerts", icon: <AlertTriangle className="h-4 w-4" />, badge: policyAlerts },
    
    { title: "Performance", path: "/admin/performance", icon: <Activity className="h-4 w-4" /> },
    { title: "Legal Documents", path: "/admin/legal-documents", icon: <FileText className="h-4 w-4" /> },
    { title: "Backups", path: "/admin/backups", icon: <Database className="h-4 w-4" /> },
    { title: "Audit Logs", path: "/admin/audit-logs", icon: <Clock className="h-4 w-4" /> },
    { title: "Settings", path: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
  ];

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    const { count: approvals } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("approval_status", "pending")
      .eq("gender", "Female");

    const { count: alerts } = await supabase
      .from("policy_violation_alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    setPendingApprovals(approvals || 0);
    setPolicyAlerts(alerts || 0);
  };

  const handleLogout = async () => {
    // Get current user to set offline status
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const now = new Date().toISOString();
      await supabase
        .from('user_status')
        .update({ is_online: false, last_seen: now })
        .eq('user_id', user.id);
    }
    await supabase.auth.signOut();
    navigate("/");
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <MeowLogo size="sm" />
          <Badge variant="destructive" className="font-semibold text-xs">
            <Shield className="w-3 h-3 mr-1" />
            ADMIN
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.title}</span>
              {item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button
          variant="auroraGhost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="auroraGhost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <NavContent />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <MeowLogo size="sm" />
            <Badge variant="destructive" className="text-xs">ADMIN</Badge>
          </div>

          <Button variant="auroraGhost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-card">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-64">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminNav;

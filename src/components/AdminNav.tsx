/**
 * AdminNav.tsx — WhatsApp-Styled Admin Navigation
 *
 * CHANGES from original:
 * - Header background: #075E54 (WhatsApp dark green)
 * - Active sidebar item: #128C7E bg with left green border
 * - Alert badges: #25D366 green
 * - Desktop sidebar: #1E2126 dark background (WhatsApp dark)
 * - Mobile header: WhatsApp-style with search + dots menu
 * - Logout cleared admin cache before signing out
 */

import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import MeowLogo from "@/components/MeowLogo";
import {
  Users, MessageSquare, BarChart3, Settings, Shield, FileText, Clock,
  DollarSign, Activity, Gift, Globe, Database, AlertTriangle, Languages,
  LogOut, Menu, Home, UserCheck, History, Search, ClipboardList, Megaphone,
  MoreVertical, Bell, RefreshCw,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { clearAdminCache } from "@/hooks/useAdminAccess";

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

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin" || location.pathname === "/admin/"
      : location.pathname.startsWith(path);

  const navItems: NavItem[] = [
    { title: "Dashboard",         path: "/admin",                icon: <Home className="h-4 w-4" /> },
    { title: "User Management",   path: "/admin/users",          icon: <Users className="h-4 w-4" />, badge: pendingApprovals },
    { title: "Analytics",         path: "/admin/analytics",      icon: <BarChart3 className="h-4 w-4" /> },
    { title: "Chat Monitoring",   path: "/admin/chat-monitoring", icon: <MessageSquare className="h-4 w-4" /> },
    { title: "Finance",           path: "/admin/finance",        icon: <DollarSign className="h-4 w-4" /> },
    { title: "Transaction History",path: "/admin/transactions",  icon: <History className="h-4 w-4" /> },
    { title: "Statements",        path: "/admin/statements",     icon: <FileText className="h-4 w-4" /> },
    { title: "Finance Reports",   path: "/admin/finance-reports",icon: <FileText className="h-4 w-4" /> },
    { title: "Chat Pricing",      path: "/admin/chat-pricing",   icon: <Clock className="h-4 w-4" /> },
    { title: "Gift Management",   path: "/admin/gifts",          icon: <Gift className="h-4 w-4" /> },
    { title: "Language Groups",   path: "/admin/languages",      icon: <Globe className="h-4 w-4" /> },
    { title: "Language Limits",   path: "/admin/language-limits",icon: <Languages className="h-4 w-4" /> },
    { title: "KYC Management",    path: "/admin/kyc",            icon: <UserCheck className="h-4 w-4" /> },
    { title: "User Lookup",       path: "/admin/user-lookup",    icon: <Search className="h-4 w-4" /> },
    { title: "Moderation",        path: "/admin/moderation",     icon: <Shield className="h-4 w-4" /> },
    { title: "Policy Alerts",     path: "/admin/policy-alerts",  icon: <AlertTriangle className="h-4 w-4" />, badge: policyAlerts },
    { title: "Performance",       path: "/admin/performance",    icon: <Activity className="h-4 w-4" /> },
    { title: "Legal Documents",   path: "/admin/legal-documents",icon: <FileText className="h-4 w-4" /> },
    { title: "Backups",           path: "/admin/backups",        icon: <Database className="h-4 w-4" /> },
    { title: "Audit Logs",        path: "/admin/audit-logs",     icon: <ClipboardList className="h-4 w-4" /> }, // FIX #15/#31: was Clock
    { title: "Messaging",         path: "/admin/messaging",      icon: <Megaphone className="h-4 w-4" /> },     // FIX #32: was MessageSquare
    { title: "Settings",          path: "/admin/settings",       icon: <Settings className="h-4 w-4" /> },
  ];

  const activeItem = navItems.find((item) => isActive(item.path)) || navItems[0];

  useEffect(() => {
    loadCounts();
    // FIX #4: Use realtime subscription for live badge counts
    const channel = supabase
      .channel("admin-nav-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "female_profiles" }, loadCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "policy_violation_alerts" }, loadCounts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadCounts = async () => {
    try {
      // FIX #2: Use female_profiles consistently (was 'profiles' in AdminDashboard)
      const [approvalsRes, alertsRes] = await Promise.all([
        supabase
          .from("female_profiles")
          .select("*", { count: "exact", head: true })
          .eq("approval_status", "pending"),
        supabase
          .from("policy_violation_alerts")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      setPendingApprovals(approvalsRes.count || 0);
      setPolicyAlerts(alertsRes.count || 0);
    } catch (error) {
      console.error("[AdminNav] loadCounts failed:", error);
    }
  };

  const handleLogout = async () => {
    // FIX #23/#30: Clear admin cache BEFORE sign-out
    clearAdminCache();

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from("user_status")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("user_id", session.user.id);
    }
    await supabase.auth.signOut();
    window.history.replaceState(null, "", "/");
    navigate("/", { replace: true });
  };

  // ─── WhatsApp-styled Nav Item ──────────────────────────────────────────────
  const NavItemButton = ({ item, onClick }: { item: NavItem; onClick: () => void }) => {
    const active = isActive(item.path);
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors relative",
          active
            ? "bg-[#128C7E] text-white border-l-4 border-[#25D366]"
            : "text-white/70 hover:bg-white/10 hover:text-white border-l-4 border-transparent"
        )}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.title}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <Badge
            className="text-[10px] px-1.5 py-0.5 bg-[#25D366] text-white border-0 font-bold"
          >
            {item.badge}
          </Badge>
        )}
      </button>
    );
  };

  // ─── Sidebar header (WhatsApp dark green) ─────────────────────────────────
  const SidebarHeader = () => (
    <div className="p-4 bg-[#075E54]">
      <div className="flex items-center gap-3">
        <MeowLogo size="sm" />
        <div className="flex flex-col">
          <span className="text-white font-bold text-sm tracking-tight">Meow Admin</span>
          <span className="text-[#25D366] text-[10px] font-medium">● ADMIN PANEL</span>
        </div>
      </div>
    </div>
  );

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#1E2126]">
      <SidebarHeader />
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <NavItemButton
              key={item.path}
              item={item}
              onClick={() => {
                navigate(item.path);
                setIsOpen(false);
              }}
            />
          ))}
        </nav>
      </ScrollArea>
      <div className="p-3 border-t border-white/10 bg-[#1E2126]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/60 hover:text-red-400 hover:bg-white/5 transition-colors text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#ECE5DD] wa-admin">
      {/* ── Mobile Header (WhatsApp style) ─────────────────────── */}
      <header className="lg:hidden sticky top-0 z-50 bg-[#075E54] pt-[env(safe-area-inset-top)] shadow-md">
        <div className="flex items-center justify-between px-3 py-2.5">
          {/* Left: Hamburger */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-0">
              <NavContent />
            </SheetContent>
          </Sheet>

          {/* Center: Logo + Page Title */}
          <div className="flex items-center gap-2">
            <MeowLogo size="sm" />
            <span className="text-white font-bold text-sm">{activeItem.title}</span>
          </div>

          {/* Right: Search + Dots */}
          <div className="flex items-center gap-1">
            {/* FIX #12: Add search icon to mobile header */}
            <button
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Search"
              onClick={() => navigate("/admin/user-lookup")}
            >
              <Search className="h-5 w-5" />
            </button>
            {/* FIX #12: Add overflow dots menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="More options"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={loadCounts}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh Counts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/messaging")}>
                  <Bell className="h-4 w-4 mr-2" /> Messaging
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── Desktop Sidebar (WhatsApp dark) ────────────────────── */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#1E2126] shadow-xl">
          <NavContent />
        </aside>

        {/* ── Main Content ────────────────────────────────────────── */}
        <main className="flex-1 lg:pl-64">
          <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminNav;

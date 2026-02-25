/**
 * AdminModerationScreen.tsx
 * 
 * PURPOSE: Admin interface for monitoring and moderating user behavior,
 * reviewing reports, managing flagged content, and blocking/warning users.
 * 
 * KEY FEATURES:
 * - View and resolve user reports
 * - Monitor flagged chat messages
 * - Block/unblock users (temporary or permanent)
 * - Send warnings to users
 * - Real-time updates via Supabase subscriptions
 * 
 * DATABASE TABLES USED:
 * - moderation_reports: User-submitted reports
 * - chat_messages: For flagged message review
 * - user_blocks: Blocked user records
 * - user_warnings: Warning records
 * - profiles: User profile data
 * 
 * ACCESS CONTROL:
 * - Requires admin or moderator role (enforced via RLS)
 */

// ============= IMPORTS SECTION =============
import React, { useState, useEffect } from 'react';
// Navigation hook for page redirects
import { useNavigate } from 'react-router-dom';
// Supabase client for all database operations
import { supabase } from '@/integrations/supabase/client';
// UI Components from shadcn/ui
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Toast for notifications
import { toast } from 'sonner';
// Lucide icons
import { 
  ArrowLeft,           // Back navigation
  Shield,              // Moderation/security icon
  AlertTriangle,       // Warning icon
  Ban,                 // Block icon
  MessageSquareWarning,// Warning message icon
  Search,              // Search input icon
  RefreshCw,           // Refresh button icon
  Eye,                 // View/review icon
  CheckCircle,         // Resolved/cleared status
  XCircle,             // Removed/failed status
  Clock,               // Pending status
  Users,               // Users icon
  Flag,                // Report flag icon
  MessageSquare,       // Message icon
  Home                 // Home navigation icon
} from 'lucide-react';

/**
 * Report Interface
 * 
 * Defines structure for user reports submitted through the app.
 */
interface Report {
  id: string;                    // UUID of report
  reporter_id: string;           // UUID of user who submitted report
  reported_user_id: string;      // UUID of reported user
  report_type: string;           // Category (harassment, spam, etc.)
  content: string | null;        // Optional description
  status: string;                // pending, resolved, dismissed
  action_taken: string | null;   // What action was taken
  created_at: string;            // When report was submitted
}

/**
 * FlaggedMessage Interface
 * 
 * Chat messages that have been flagged for review.
 */
interface FlaggedMessage {
  id: string;                        // Message UUID
  sender_id: string;                 // Who sent the message
  receiver_id: string;               // Who received it
  message: string;                   // Message content
  flag_reason: string | null;        // Why it was flagged
  moderation_status: string | null;  // pending, cleared, removed
  created_at: string;                // When sent
}

/**
 * UserBlock Interface
 * 
 * Records of blocked users.
 */
interface UserBlock {
  id: string;                    // Block record UUID
  blocked_user_id: string;       // Who is blocked
  reason: string | null;         // Why they were blocked
  block_type: string;            // temporary or permanent
  expires_at: string | null;     // When block expires (if temporary)
  created_at: string;            // When blocked
}

/**
 * Profile Interface
 * 
 * Minimal profile data for displaying user names.
 */
interface Profile {
  user_id: string;           // User UUID
  full_name: string | null;  // Display name
  photo_url: string | null;  // Avatar URL
}

/**
 * AdminModerationScreen Component
 * 
 * Main admin moderation interface with tabs for:
 * - Reports: User-submitted reports
 * - Flagged: Auto-flagged chat messages
 * - Blocked: Currently blocked users
 */
const AdminModerationScreen = () => {
  // ============= HOOKS =============
  const navigate = useNavigate();
  
  // ============= STATE =============
  
  // Data arrays from database
  const [reports, setReports] = useState<Report[]>([]);
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserBlock[]>([]);
  
  // Profile cache for user names
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  
  // Loading state
  const [loading, setLoading] = useState(true);
  
  // Search/filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states for actions
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<FlaggedMessage | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  
  // Form input states
  const [actionReason, setActionReason] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [blockType, setBlockType] = useState('temporary');
  const [targetUserId, setTargetUserId] = useState('');

  /**
   * useEffect: Load Data and Setup Realtime
   * 
   * On mount:
   * 1. Load all moderation data
   * 2. Subscribe to real-time updates
   */
  useEffect(() => {
    loadData();
    
    // ============= REALTIME SUBSCRIPTIONS =============
    
    // Subscribe to new/updated reports
    const reportsChannel = supabase
      .channel('moderation-reports')
      .on('postgres_changes', {
        event: '*',  // All events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'moderation_reports'
      }, () => {
        loadReports(); // Reload reports on any change
      })
      .subscribe();

    // Subscribe to flagged message updates
    const messagesChannel = supabase
      .channel('flagged-messages')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: 'flagged=eq.true'
      }, () => {
        loadFlaggedMessages(); // Reload flagged messages
      })
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  /**
   * loadData Function
   * 
   * Loads all moderation data in parallel.
   */
  const loadData = async () => {
    setLoading(true);
    // Load all data types concurrently
    await Promise.all([loadReports(), loadFlaggedMessages(), loadBlockedUsers()]);
    setLoading(false);
  };

  /**
   * loadReports Function
   * 
   * Fetches all moderation reports from database.
   * Also loads profiles for reporter and reported users.
   */
  const loadReports = async () => {
    const { data, error } = await supabase
      .from('moderation_reports')
      .select('*')
      .order('created_at', { ascending: false }); // Newest first

    if (error) {
      console.error('Error loading reports:', error);
      return;
    }

    setReports(data || []);
    
    // Collect user IDs for profile lookup
    const userIds = new Set<string>();
    data?.forEach(r => {
      userIds.add(r.reporter_id);
      userIds.add(r.reported_user_id);
    });
    await loadProfiles(Array.from(userIds));
  };

  /**
   * loadFlaggedMessages Function
   * 
   * Fetches chat messages marked as flagged.
   */
  const loadFlaggedMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('flagged', true)  // Only flagged messages
      .order('created_at', { ascending: false })
      .limit(100);  // Limit for performance

    if (error) {
      console.error('Error loading flagged messages:', error);
      return;
    }

    setFlaggedMessages(data || []);
    
    // Load profiles for senders and receivers
    const userIds = new Set<string>();
    data?.forEach(m => {
      userIds.add(m.sender_id);
      userIds.add(m.receiver_id);
    });
    await loadProfiles(Array.from(userIds));
  };

  /**
   * loadBlockedUsers Function
   * 
   * Fetches all currently blocked users.
   */
  const loadBlockedUsers = async () => {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading blocked users:', error);
      return;
    }

    setBlockedUsers(data || []);
    
    // Load profiles for blocked users
    const userIds = data?.map(b => b.blocked_user_id) || [];
    await loadProfiles(userIds);
  };

  /**
   * loadProfiles Function
   * 
   * Batch loads user profiles for display names.
   * Updates profile cache Map.
   * 
   * @param userIds - Array of user UUIDs to load
   */
  const loadProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, photo_url')
      .in('user_id', userIds);

    if (error) {
      console.error('Error loading profiles:', error);
      return;
    }

    // Add to existing profile cache
    const newProfiles = new Map(profiles);
    data?.forEach(p => newProfiles.set(p.user_id, p));
    setProfiles(newProfiles);
  };

  /**
   * getUserName Function
   * 
   * Retrieves display name from profile cache.
   * 
   * @param userId - User UUID to look up
   * @returns Display name or "Unknown User"
   */
  const getUserName = (userId: string) => {
    return profiles.get(userId)?.full_name || 'Unknown User';
  };

  /**
   * handleResolveReport Function
   * 
   * Resolves a report with specified action.
   * Updates report status in database.
   * 
   * @param reportId - Report UUID
   * @param action - Action taken (e.g., "warned", "blocked", "dismissed")
   */
  const handleResolveReport = async (reportId: string, action: string) => {
    // Get current admin user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Update report in database
    const { error } = await supabase
      .from('moderation_reports')
      .update({
        status: 'resolved',
        action_taken: action,
        action_reason: actionReason,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (error) {
      toast.error('Failed to update report');
      return;
    }

    toast.success('Report resolved successfully');
    // Reset dialog state
    setActionDialogOpen(false);
    setSelectedReport(null);
    setActionReason('');
    loadReports(); // Refresh list
  };

  /**
   * handleBlockUser Function
   * 
   * Creates a block record for a user.
   * Temporary blocks expire after 7 days.
   */
  const handleBlockUser = async () => {
    if (!targetUserId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Insert block record
    const { error } = await supabase
      .from('user_blocks')
      .insert({
        blocked_user_id: targetUserId,
        blocked_by: user?.id,
        reason: actionReason,
        block_type: blockType,
        // Set expiry for temporary blocks (7 days)
        expires_at: blockType === 'temporary' 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
          : null
      });

    if (error) {
      toast.error('Failed to block user');
      return;
    }

    toast.success('User blocked successfully');
    setBlockDialogOpen(false);
    setTargetUserId('');
    setActionReason('');
    loadBlockedUsers();
  };

  /**
   * handleUnblockUser Function
   * 
   * Removes a block record, restoring user access.
   * 
   * @param blockId - Block record UUID
   */
  const handleUnblockUser = async (blockId: string) => {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      toast.error('Failed to unblock user');
      return;
    }

    toast.success('User unblocked successfully');
    loadBlockedUsers();
  };

  /**
   * handleWarnUser Function
   * 
   * Sends a warning to a user.
   * Creates warning record in database.
   */
  const handleWarnUser = async () => {
    if (!targetUserId || !warningMessage) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Insert warning record
    const { error } = await supabase
      .from('user_warnings')
      .insert({
        user_id: targetUserId,
        warning_type: 'behavior',
        message: warningMessage,
        issued_by: user?.id
      });

    if (error) {
      toast.error('Failed to send warning');
      return;
    }

    toast.success('Warning sent successfully');
    setWarnDialogOpen(false);
    setTargetUserId('');
    setWarningMessage('');
  };

  /**
   * handleResolveMessage Function
   * 
   * Updates moderation status of a flagged message.
   * 
   * @param messageId - Message UUID
   * @param status - New status (cleared, removed)
   */
  const handleResolveMessage = async (messageId: string, status: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ moderation_status: status })
      .eq('id', messageId);

    if (error) {
      toast.error('Failed to update message');
      return;
    }

    toast.success('Message status updated');
    loadFlaggedMessages();
  };

  /**
   * getStatusBadge Function
   * 
   * Returns appropriate badge component for status.
   * 
   * @param status - Status string
   * @returns JSX Badge element
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="bg-muted text-muted-foreground"><XCircle className="w-3 h-3 mr-1" />Dismissed</Badge>;
      case 'cleared':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1" />Cleared</Badge>;
      case 'removed':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" />Removed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /**
   * filteredReports
   * 
   * Applies search and status filters to reports.
   */
  const filteredReports = reports.filter(r => {
    // Search filter: match user name or content
    const matchesSearch = getUserName(r.reported_user_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (r.content?.toLowerCase().includes(searchTerm.toLowerCase()));
    // Status filter
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  /**
   * stats Object
   * 
   * Computed statistics for dashboard cards.
   */
  const stats = {
    totalReports: reports.length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    flaggedMessages: flaggedMessages.length,
    blockedUsers: blockedUsers.length
  };

  // ============= LOADING STATE =============
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ============= MAIN RENDER =============
  return (
    <div className="min-h-screen bg-background">
      {/* ============= HEADER ============= */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <Home className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Moderation Center</h1>
              <p className="text-sm text-muted-foreground">Monitor and manage user reports</p>
            </div>
          </div>
          {/* Refresh button */}
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* ============= STATS CARDS ============= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Reports Card */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Flag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalReports}</p>
                  <p className="text-xs text-muted-foreground">Total Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Review Card */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '50ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingReports}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flagged Messages Card */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.flaggedMessages}</p>
                  <p className="text-xs text-muted-foreground">Flagged Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blocked Users Card */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.blockedUsers}</p>
                  <p className="text-xs text-muted-foreground">Blocked Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============= TABS NAVIGATION ============= */}
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="flagged" className="flex items-center gap-2">
              <MessageSquareWarning className="w-4 h-4" />
              Flagged Chats
            </TabsTrigger>
            <TabsTrigger value="blocked" className="flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Blocked Users
            </TabsTrigger>
          </TabsList>

          {/* ============= REPORTS TAB ============= */}
          <TabsContent value="reports" className="space-y-4">
            {/* Search and filter controls */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reports list */}
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredReports.length === 0 ? (
                  // Empty state
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No reports found</p>
                    </CardContent>
                  </Card>
                ) : (
                  // Map through filtered reports
                  filteredReports.map((report, index) => (
                    <Card 
                      key={report.id}
                      className="animate-in fade-in slide-in-from-left-2 duration-300 hover:shadow-md transition-shadow"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Report type and status badges */}
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {report.report_type.replace(/_/g, ' ')}
                              </Badge>
                              {getStatusBadge(report.status)}
                            </div>
                            {/* Reported and reporter names */}
                            <p className="font-medium">Reported: {getUserName(report.reported_user_id)}</p>
                            <p className="text-sm text-muted-foreground">By: {getUserName(report.reporter_id)}</p>
                            {/* Report content if provided */}
                            {report.content && (
                              <p className="text-sm mt-2 p-2 bg-muted rounded-md">{report.content}</p>
                            )}
                            {/* Timestamp */}
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(report.created_at).toLocaleString()}
                            </p>
                          </div>
                          {/* Action buttons */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                setActionDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                            {/* Show warn/block only for pending reports */}
                            {report.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-amber-500 hover:text-amber-600"
                                  onClick={() => {
                                    setTargetUserId(report.reported_user_id);
                                    setWarnDialogOpen(true);
                                  }}
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setTargetUserId(report.reported_user_id);
                                    setBlockDialogOpen(true);
                                  }}
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ============= FLAGGED MESSAGES TAB ============= */}
          <TabsContent value="flagged" className="space-y-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {flaggedMessages.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <MessageSquareWarning className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No flagged messages</p>
                    </CardContent>
                  </Card>
                ) : (
                  flaggedMessages.map((msg, index) => (
                    <Card 
                      key={msg.id}
                      className="animate-in fade-in slide-in-from-left-2 duration-300 hover:shadow-md transition-shadow"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Flagged badge and moderation status */}
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Flagged
                              </Badge>
                              {msg.moderation_status && getStatusBadge(msg.moderation_status)}
                            </div>
                            {/* Sender -> Receiver */}
                            <p className="text-sm">
                              <span className="font-medium">{getUserName(msg.sender_id)}</span>
                              <span className="text-muted-foreground"> → </span>
                              <span className="font-medium">{getUserName(msg.receiver_id)}</span>
                            </p>
                            {/* Message content */}
                            <p className="text-sm mt-2 p-2 bg-muted rounded-md">{msg.message}</p>
                            {/* Flag reason if available */}
                            {msg.flag_reason && (
                              <p className="text-xs text-amber-500 mt-2">Reason: {msg.flag_reason}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                          {/* Action buttons for flagged messages */}
                          <div className="flex gap-2">
                            {/* Clear message button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-500 hover:text-emerald-600"
                              onClick={() => handleResolveMessage(msg.id, 'cleared')}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            {/* Remove message button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleResolveMessage(msg.id, 'removed')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            {/* Warn sender button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-500 hover:text-amber-600"
                              onClick={() => {
                                setTargetUserId(msg.sender_id);
                                setWarnDialogOpen(true);
                              }}
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ============= BLOCKED USERS TAB ============= */}
          <TabsContent value="blocked" className="space-y-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {blockedUsers.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No blocked users</p>
                    </CardContent>
                  </Card>
                ) : (
                  blockedUsers.map((block, index) => (
                    <Card 
                      key={block.id}
                      className="animate-in fade-in slide-in-from-left-2 duration-300 hover:shadow-md transition-shadow"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            {/* Blocked user name */}
                            <p className="font-medium">{getUserName(block.blocked_user_id)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {/* Block type badge */}
                              <Badge variant={block.block_type === 'permanent' ? 'destructive' : 'secondary'}>
                                {block.block_type}
                              </Badge>
                              {/* Expiry date for temporary blocks */}
                              {block.expires_at && (
                                <span className="text-xs text-muted-foreground">
                                  Expires: {new Date(block.expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {/* Block reason */}
                            {block.reason && (
                              <p className="text-sm text-muted-foreground mt-2">{block.reason}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Blocked on: {new Date(block.created_at).toLocaleString()}
                            </p>
                          </div>
                          {/* Unblock button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnblockUser(block.id)}
                          >
                            Unblock
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* ============= REVIEW REPORT DIALOG ============= */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>Take action on this user report</DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              {/* Report summary */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Reported User:</strong> {getUserName(selectedReport.reported_user_id)}</p>
                <p className="text-sm"><strong>Reporter:</strong> {getUserName(selectedReport.reporter_id)}</p>
                <p className="text-sm"><strong>Type:</strong> {selectedReport.report_type.replace(/_/g, ' ')}</p>
                {selectedReport.content && (
                  <p className="text-sm mt-2"><strong>Content:</strong> {selectedReport.content}</p>
                )}
              </div>
              {/* Notes textarea */}
              <Textarea
                placeholder="Add notes about your decision..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="secondary" 
              onClick={() => selectedReport && handleResolveReport(selectedReport.id, 'dismissed')}
            >
              Dismiss
            </Button>
            <Button 
              onClick={() => selectedReport && handleResolveReport(selectedReport.id, 'action_taken')}
            >
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============= BLOCK USER DIALOG ============= */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>This will prevent the user from using the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Block type selector */}
            <Select value={blockType} onValueChange={setBlockType}>
              <SelectTrigger>
                <SelectValue placeholder="Block type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temporary">Temporary (7 days)</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
            {/* Block reason */}
            <Textarea
              placeholder="Reason for blocking..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlockUser}>
              <Ban className="w-4 h-4 mr-2" />
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============= WARN USER DIALOG ============= */}
      <Dialog open={warnDialogOpen} onOpenChange={setWarnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Warning</DialogTitle>
            <DialogDescription>Send a warning message to this user</DialogDescription>
          </DialogHeader>
          {/* Warning message input */}
          <Textarea
            placeholder="Warning message..."
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleWarnUser} variant="warning">
              <MessageSquareWarning className="w-4 h-4 mr-2" />
              Send Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Export as default for router
export default AdminModerationScreen;

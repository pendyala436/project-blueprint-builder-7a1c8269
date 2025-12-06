import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Shield, 
  AlertTriangle, 
  Ban, 
  MessageSquareWarning,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Flag,
  MessageSquare
} from 'lucide-react';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  report_type: string;
  content: string | null;
  status: string;
  action_taken: string | null;
  created_at: string;
}

interface FlaggedMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  flag_reason: string | null;
  moderation_status: string | null;
  created_at: string;
}

interface UserBlock {
  id: string;
  blocked_user_id: string;
  reason: string | null;
  block_type: string;
  expires_at: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  photo_url: string | null;
}

const AdminModerationScreen = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserBlock[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<FlaggedMessage | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [blockType, setBlockType] = useState('temporary');
  const [targetUserId, setTargetUserId] = useState('');

  useEffect(() => {
    loadData();
    
    // Set up real-time subscription for new reports
    const reportsChannel = supabase
      .channel('moderation-reports')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'moderation_reports'
      }, () => {
        loadReports();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('flagged-messages')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: 'flagged=eq.true'
      }, () => {
        loadFlaggedMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadReports(), loadFlaggedMessages(), loadBlockedUsers()]);
    setLoading(false);
  };

  const loadReports = async () => {
    const { data, error } = await supabase
      .from('moderation_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reports:', error);
      return;
    }

    setReports(data || []);
    
    // Load profiles for users in reports
    const userIds = new Set<string>();
    data?.forEach(r => {
      userIds.add(r.reporter_id);
      userIds.add(r.reported_user_id);
    });
    await loadProfiles(Array.from(userIds));
  };

  const loadFlaggedMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('flagged', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading flagged messages:', error);
      return;
    }

    setFlaggedMessages(data || []);
    
    const userIds = new Set<string>();
    data?.forEach(m => {
      userIds.add(m.sender_id);
      userIds.add(m.receiver_id);
    });
    await loadProfiles(Array.from(userIds));
  };

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
    
    const userIds = data?.map(b => b.blocked_user_id) || [];
    await loadProfiles(userIds);
  };

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

    const newProfiles = new Map(profiles);
    data?.forEach(p => newProfiles.set(p.user_id, p));
    setProfiles(newProfiles);
  };

  const getUserName = (userId: string) => {
    return profiles.get(userId)?.full_name || 'Unknown User';
  };

  const handleResolveReport = async (reportId: string, action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
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
    setActionDialogOpen(false);
    setSelectedReport(null);
    setActionReason('');
    loadReports();
  };

  const handleBlockUser = async () => {
    if (!targetUserId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('user_blocks')
      .insert({
        blocked_user_id: targetUserId,
        blocked_by: user?.id,
        reason: actionReason,
        block_type: blockType,
        expires_at: blockType === 'temporary' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
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

  const handleWarnUser = async () => {
    if (!targetUserId || !warningMessage) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
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

  const filteredReports = reports.filter(r => {
    const matchesSearch = getUserName(r.reported_user_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (r.content?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalReports: reports.length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    flaggedMessages: flaggedMessages.length,
    blockedUsers: blockedUsers.length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/analytics')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Moderation Center</h1>
              <p className="text-sm text-muted-foreground">Monitor and manage user reports</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        {/* Tabs */}
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

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            {/* Filters */}
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

            {/* Reports List */}
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredReports.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No reports found</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredReports.map((report, index) => (
                    <Card 
                      key={report.id}
                      className="animate-in fade-in slide-in-from-left-2 duration-300 hover:shadow-md transition-shadow"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs">{report.report_type.replace(/_/g, ' ')}</Badge>
                              {getStatusBadge(report.status)}
                            </div>
                            <p className="font-medium">Reported: {getUserName(report.reported_user_id)}</p>
                            <p className="text-sm text-muted-foreground">By: {getUserName(report.reporter_id)}</p>
                            {report.content && (
                              <p className="text-sm mt-2 p-2 bg-muted rounded-md">{report.content}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(report.created_at).toLocaleString()}
                            </p>
                          </div>
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

          {/* Flagged Messages Tab */}
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
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Flagged
                              </Badge>
                              {msg.moderation_status && getStatusBadge(msg.moderation_status)}
                            </div>
                            <p className="text-sm">
                              <span className="font-medium">{getUserName(msg.sender_id)}</span>
                              <span className="text-muted-foreground"> → </span>
                              <span className="font-medium">{getUserName(msg.receiver_id)}</span>
                            </p>
                            <p className="text-sm mt-2 p-2 bg-muted rounded-md">{msg.message}</p>
                            {msg.flag_reason && (
                              <p className="text-xs text-amber-500 mt-2">Reason: {msg.flag_reason}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-500 hover:text-emerald-600"
                              onClick={() => handleResolveMessage(msg.id, 'cleared')}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleResolveMessage(msg.id, 'removed')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
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

          {/* Blocked Users Tab */}
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
                            <p className="font-medium">{getUserName(block.blocked_user_id)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={block.block_type === 'permanent' ? 'destructive' : 'secondary'}>
                                {block.block_type}
                              </Badge>
                              {block.expires_at && (
                                <span className="text-xs text-muted-foreground">
                                  Expires: {new Date(block.expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {block.reason && (
                              <p className="text-sm text-muted-foreground mt-2">{block.reason}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Blocked on: {new Date(block.created_at).toLocaleString()}
                            </p>
                          </div>
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

      {/* Action Dialog for Reports */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>Take action on this user report</DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Reported User:</strong> {getUserName(selectedReport.reported_user_id)}</p>
                <p className="text-sm"><strong>Reporter:</strong> {getUserName(selectedReport.reporter_id)}</p>
                <p className="text-sm"><strong>Type:</strong> {selectedReport.report_type.replace(/_/g, ' ')}</p>
                {selectedReport.content && (
                  <p className="text-sm mt-2"><strong>Content:</strong> {selectedReport.content}</p>
                )}
              </div>
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

      {/* Block User Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>This will prevent the user from using the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={blockType} onValueChange={setBlockType}>
              <SelectTrigger>
                <SelectValue placeholder="Block type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temporary">Temporary (7 days)</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Warn User Dialog */}
      <Dialog open={warnDialogOpen} onOpenChange={setWarnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Warning</DialogTitle>
            <DialogDescription>Send a warning message to this user</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Warning message..."
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleWarnUser} className="bg-amber-500 hover:bg-amber-600">
              <MessageSquareWarning className="w-4 h-4 mr-2" />
              Send Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminModerationScreen;

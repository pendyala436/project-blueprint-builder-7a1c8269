import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Megaphone,
  Plus,
  Crown,
  MessageSquare,
  CalendarDays
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

interface LeaderDashboardProps {
  currentUserId: string;
  motherTongue: string;
  members: Array<{
    userId: string;
    fullName: string;
    photoUrl: string | null;
    isOnline: boolean;
    seniority: number;
  }>;
  onClose: () => void;
}

interface Dispute {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  dispute_type: string;
  title: string;
  description: string | null;
  status: string;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter_name?: string;
  reported_name?: string;
}

interface ShiftSchedule {
  id: string;
  user_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  member_name?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  is_active: boolean;
  created_at: string;
}

export const LeaderDashboard = ({
  currentUserId,
  motherTongue,
  members,
  onClose
}: LeaderDashboardProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("shifts");
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [shifts, setShifts] = useState<ShiftSchedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [showResolveDisputeDialog, setShowResolveDisputeDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  
  // Form states
  const [newShift, setNewShift] = useState({
    userId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "17:00",
    notes: ""
  });
  const [resolution, setResolution] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    priority: "normal"
  });

  useEffect(() => {
    loadDashboardData();
  }, [motherTongue]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadDisputes(),
        loadShifts(),
        loadAnnouncements()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDisputes = async () => {
    const { data } = await supabase
      .from("community_disputes")
      .select("*")
      .eq("language_code", motherTongue)
      .order("created_at", { ascending: false });

    if (data) {
      // Get reporter and reported user names
      const userIds = [...new Set([
        ...data.map(d => d.reporter_id),
        ...data.filter(d => d.reported_user_id).map(d => d.reported_user_id)
      ])].filter(Boolean);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      setDisputes(data.map(d => ({
        ...d,
        reporter_name: nameMap.get(d.reporter_id) || "Unknown",
        reported_name: d.reported_user_id ? nameMap.get(d.reported_user_id) || "Unknown" : null
      })));
    }
  };

  const loadShifts = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("community_shift_schedules")
      .select("*")
      .eq("language_code", motherTongue)
      .gte("shift_date", today)
      .order("shift_date", { ascending: true })
      .limit(50);

    if (data) {
      const memberMap = new Map(members.map(m => [m.userId, m.fullName]));
      setShifts(data.map(s => ({
        ...s,
        member_name: memberMap.get(s.user_id) || "Unknown"
      })));
    }
  };

  const loadAnnouncements = async () => {
    const { data } = await supabase
      .from("community_announcements")
      .select("*")
      .eq("language_code", motherTongue)
      .eq("leader_id", currentUserId)
      .order("created_at", { ascending: false });

    if (data) {
      setAnnouncements(data);
    }
  };

  const createShift = async () => {
    if (!newShift.userId || !newShift.date) {
      toast({
        title: t('error', 'Error'),
        description: t('selectMemberAndDate', 'Please select a member and date'),
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("community_shift_schedules")
        .insert({
          language_code: motherTongue,
          user_id: newShift.userId,
          shift_date: newShift.date,
          start_time: newShift.startTime,
          end_time: newShift.endTime,
          notes: newShift.notes || null,
          created_by: currentUserId
        });

      if (error) throw error;

      toast({
        title: t('shiftCreated', 'Shift Created'),
        description: t('shiftScheduledSuccess', 'Shift has been scheduled successfully')
      });

      setShowAddShiftDialog(false);
      setNewShift({
        userId: "",
        date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "17:00",
        notes: ""
      });
      loadShifts();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('shiftCreateFailed', 'Failed to create shift'),
        variant: "destructive"
      });
    }
  };

  const resolveDispute = async () => {
    if (!selectedDispute || !resolution.trim()) return;

    try {
      const { error } = await supabase
        .from("community_disputes")
        .update({
          status: "resolved",
          resolution,
          resolved_by: currentUserId,
          resolved_at: new Date().toISOString()
        })
        .eq("id", selectedDispute.id);

      if (error) throw error;

      toast({
        title: t('disputeResolved', 'Dispute Resolved'),
        description: t('disputeResolvedSuccess', 'The dispute has been resolved')
      });

      setShowResolveDisputeDialog(false);
      setSelectedDispute(null);
      setResolution("");
      loadDisputes();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('disputeResolveFailed', 'Failed to resolve dispute'),
        variant: "destructive"
      });
    }
  };

  const createAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast({
        title: t('error', 'Error'),
        description: t('fillAllFields', 'Please fill all fields'),
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("community_announcements")
        .insert({
          language_code: motherTongue,
          leader_id: currentUserId,
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          priority: newAnnouncement.priority
        });

      if (error) throw error;

      toast({
        title: t('announcementCreated', 'Announcement Created'),
        description: t('announcementPosted', 'Your announcement has been posted')
      });

      setShowAnnouncementDialog(false);
      setNewAnnouncement({ title: "", content: "", priority: "normal" });
      loadAnnouncements();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('announcementFailed', 'Failed to create announcement'),
        variant: "destructive"
      });
    }
  };

  const deleteShift = async (shiftId: string) => {
    try {
      await supabase
        .from("community_shift_schedules")
        .delete()
        .eq("id", shiftId);

      toast({ title: t('shiftDeleted', 'Shift Deleted') });
      loadShifts();
    } catch (error) {
      toast({
        title: t('error', 'Error'),
        description: t('deleteFailed', 'Failed to delete'),
        variant: "destructive"
      });
    }
  };

  const pendingDisputes = disputes.filter(d => d.status === "pending");
  const resolvedDisputes = disputes.filter(d => d.status === "resolved");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            {t('leaderDashboard', 'Leader Dashboard')} - {motherTongue}
          </DialogTitle>
          <DialogDescription>
            {t('leaderDashboardDesc', 'Manage your community shifts, disputes, and announcements')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shifts" className="text-sm">
              <CalendarDays className="w-4 h-4 mr-1" />
              {t('shifts', 'Shifts')}
            </TabsTrigger>
            <TabsTrigger value="disputes" className="text-sm">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {t('disputes', 'Disputes')}
              {pendingDisputes.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {pendingDisputes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="members" className="text-sm">
              <Users className="w-4 h-4 mr-1" />
              {t('members', 'Members')}
            </TabsTrigger>
          </TabsList>

          {/* Shifts Tab */}
          <TabsContent value="shifts" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">{t('upcomingShifts', 'Upcoming Shifts')}</h3>
              <Button size="sm" onClick={() => setShowAddShiftDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                {t('addShift', 'Add Shift')}
              </Button>
            </div>
            <ScrollArea className="h-[350px]">
              {shifts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('noShiftsScheduled', 'No shifts scheduled')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shifts.map((shift) => (
                    <Card key={shift.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{shift.member_name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{format(new Date(shift.shift_date), "MMM d, yyyy")}</span>
                              <span>•</span>
                              <Clock className="w-3 h-3" />
                              <span>{shift.start_time} - {shift.end_time}</span>
                            </div>
                            {shift.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{shift.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={shift.status === "completed" ? "default" : "secondary"}>
                            {shift.status}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteShift(shift.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="mt-4">
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-4">
                <TabsTrigger value="pending">
                  {t('pending', 'Pending')} ({pendingDisputes.length})
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  {t('resolved', 'Resolved')} ({resolvedDisputes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <ScrollArea className="h-[300px]">
                  {pendingDisputes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50 text-green-500" />
                      <p>{t('noDisputesPending', 'No pending disputes')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingDisputes.map((dispute) => (
                        <Card key={dispute.id} className="p-3 border-amber-500/30">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span className="font-medium">{dispute.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {dispute.dispute_type}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {dispute.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{t('reportedBy', 'Reported by')}: {dispute.reporter_name}</span>
                                {dispute.reported_name && (
                                  <span>{t('against', 'Against')}: {dispute.reported_name}</span>
                                )}
                                <span>{format(new Date(dispute.created_at), "MMM d, yyyy")}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedDispute(dispute);
                                setShowResolveDisputeDialog(true);
                              }}
                            >
                              {t('resolve', 'Resolve')}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="resolved">
                <ScrollArea className="h-[300px]">
                  {resolvedDisputes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{t('noResolvedDisputes', 'No resolved disputes yet')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resolvedDisputes.map((dispute) => (
                        <Card key={dispute.id} className="p-3 border-green-500/30">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="font-medium">{dispute.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('resolution', 'Resolution')}: {dispute.resolution}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(dispute.resolved_at || dispute.created_at), "MMM d, yyyy")}
                          </p>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">{t('communityMembers', 'Community Members')} ({members.length})</h3>
              <Button size="sm" variant="outline" onClick={() => setShowAnnouncementDialog(true)}>
                <Megaphone className="w-4 h-4 mr-1" />
                {t('announce', 'Announce')}
              </Button>
            </div>
            <ScrollArea className="h-[350px]">
              <div className="grid gap-2">
                {members.map((member) => (
                  <Card key={member.userId} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.photoUrl || ""} />
                          <AvatarFallback>{member.fullName[0]}</AvatarFallback>
                        </Avatar>
                        {member.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.seniority} {t('daysSeniority', 'days seniority')}
                        </p>
                      </div>
                      <Badge variant={member.isOnline ? "default" : "secondary"}>
                        {member.isOnline ? t('online', 'Online') : t('offline', 'Offline')}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Announcements Section */}
            {announcements.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">{t('yourAnnouncements', 'Your Announcements')}</h4>
                <div className="space-y-2">
                  {announcements.slice(0, 3).map((ann) => (
                    <Card key={ann.id} className="p-2">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-3 h-3 text-primary" />
                        <span className="text-sm font-medium">{ann.title}</span>
                        <Badge variant="outline" className="text-xs">{ann.priority}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Shift Dialog */}
        <Dialog open={showAddShiftDialog} onOpenChange={setShowAddShiftDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('scheduleShift', 'Schedule Shift')}</DialogTitle>
              <DialogDescription>
                {t('scheduleShiftDesc', 'Create a new shift for a community member')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('member', 'Member')}</Label>
                <Select value={newShift.userId} onValueChange={(v) => setNewShift(prev => ({ ...prev, userId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectMember', 'Select member')} />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('date', 'Date')}</Label>
                <Input 
                  type="date" 
                  value={newShift.date}
                  onChange={(e) => setNewShift(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('startTime', 'Start Time')}</Label>
                  <Input 
                    type="time" 
                    value={newShift.startTime}
                    onChange={(e) => setNewShift(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>{t('endTime', 'End Time')}</Label>
                  <Input 
                    type="time" 
                    value={newShift.endTime}
                    onChange={(e) => setNewShift(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>{t('notes', 'Notes')} ({t('optional', 'optional')})</Label>
                <Textarea 
                  value={newShift.notes}
                  onChange={(e) => setNewShift(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('shiftNotes', 'Any notes for this shift...')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddShiftDialog(false)}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button onClick={createShift}>
                {t('createShift', 'Create Shift')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolve Dispute Dialog */}
        <Dialog open={showResolveDisputeDialog} onOpenChange={setShowResolveDisputeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('resolveDispute', 'Resolve Dispute')}</DialogTitle>
              <DialogDescription>
                {selectedDispute?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{selectedDispute?.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('reportedBy', 'Reported by')}: {selectedDispute?.reporter_name}
                </p>
              </div>
              <div>
                <Label>{t('resolution', 'Resolution')}</Label>
                <Textarea 
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder={t('enterResolution', 'Enter your resolution...')}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResolveDisputeDialog(false)}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button onClick={resolveDispute} disabled={!resolution.trim()}>
                {t('markResolved', 'Mark Resolved')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Announcement Dialog */}
        <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createAnnouncement', 'Create Announcement')}</DialogTitle>
              <DialogDescription>
                {t('announcementDesc', 'Post an announcement to your community')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('title', 'Title')}</Label>
                <Input 
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('announcementTitle', 'Announcement title')}
                />
              </div>
              <div>
                <Label>{t('content', 'Content')}</Label>
                <Textarea 
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={t('announcementContent', 'Write your announcement...')}
                  rows={4}
                />
              </div>
              <div>
                <Label>{t('priority', 'Priority')}</Label>
                <Select 
                  value={newAnnouncement.priority} 
                  onValueChange={(v) => setNewAnnouncement(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('low', 'Low')}</SelectItem>
                    <SelectItem value="normal">{t('normal', 'Normal')}</SelectItem>
                    <SelectItem value="high">{t('high', 'High')}</SelectItem>
                    <SelectItem value="urgent">{t('urgent', 'Urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button onClick={createAnnouncement}>
                {t('postAnnouncement', 'Post Announcement')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderDashboard;

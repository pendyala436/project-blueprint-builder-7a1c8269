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
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [showResolveDisputeDialog, setShowResolveDisputeDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  
  // Form states
  const [activeTab, setActiveTab] = useState("disputes");
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
            {t('leaderDashboardDesc', 'Manage community disputes and announcements')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
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

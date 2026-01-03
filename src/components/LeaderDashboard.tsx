import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Crown, 
  Users, 
  MessageCircle, 
  Calendar,
  Activity,
  Send,
  Clock,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

interface TeamMember {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  is_online: boolean;
  current_shift: string | null;
  last_active: string | null;
}

interface AdminMessage {
  id: string;
  message: string;
  sender_role: string;
  created_at: string;
  is_read: boolean;
}

interface LeaderDashboardProps {
  currentUserId: string;
  languageCode: string;
}

export default function LeaderDashboard({ currentUserId, languageCode }: LeaderDashboardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activityStatus, setActivityStatus] = useState<string>("active");
  const [leaderInfo, setLeaderInfo] = useState<{
    term_start: string;
    term_end: string;
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
    subscribeToMessages();
  }, [currentUserId, languageCode]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Get leader info
      const { data: leaderData } = await supabase
        .from("community_leaders")
        .select("term_start, term_end, activity_status")
        .eq("user_id", currentUserId)
        .eq("language_code", languageCode)
        .eq("status", "active")
        .maybeSingle();

      if (leaderData) {
        setLeaderInfo({
          term_start: leaderData.term_start,
          term_end: leaderData.term_end
        });
        setActivityStatus(leaderData.activity_status || "active");
      }

      // Get team members (women with same language)
      const { data: membersData } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, last_active_at")
        .eq("gender", "female")
        .eq("primary_language", languageCode)
        .order("last_active_at", { ascending: false })
        .limit(100);

      if (membersData) {
        // Get online status and shifts
        const memberIds = membersData.map(m => m.user_id);
        
        const { data: statusData } = await supabase
          .from("user_status")
          .select("user_id, is_online, last_seen")
          .in("user_id", memberIds);

        const { data: shiftsData } = await supabase
          .from("women_shift_assignments")
          .select("user_id, shift_template_id, shift_templates(shift_code)")
          .in("user_id", memberIds)
          .eq("is_active", true);

        const statusMap = new Map(statusData?.map(s => [s.user_id, s]) || []);
        const shiftMap = new Map(shiftsData?.map(s => [s.user_id, s]) || []);

        const enrichedMembers: TeamMember[] = membersData.map(m => ({
          user_id: m.user_id,
          full_name: m.full_name || "Unknown",
          photo_url: m.photo_url,
          is_online: statusMap.get(m.user_id)?.is_online || false,
          current_shift: (shiftMap.get(m.user_id) as any)?.shift_templates?.shift_code || null,
          last_active: statusMap.get(m.user_id)?.last_seen || m.last_active_at
        }));

        setTeamMembers(enrichedMembers);
      }

      // Get admin messages
      const { data: messagesData } = await supabase
        .from("leader_admin_messages")
        .select("*")
        .eq("leader_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (messagesData) {
        setAdminMessages(messagesData);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("leader-admin-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leader_admin_messages",
          filter: `leader_id=eq.${currentUserId}`
        },
        (payload) => {
          setAdminMessages(prev => [payload.new as AdminMessage, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessageToAdmin = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      const { error } = await supabase
        .from("leader_admin_messages")
        .insert({
          leader_id: currentUserId,
          sender_id: currentUserId,
          sender_role: "leader",
          language_code: languageCode,
          message: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage("");
      toast({
        title: "Message Sent",
        description: "Admin will receive your message"
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const updateActivityStatus = async (status: string) => {
    try {
      await supabase
        .from("community_leaders")
        .update({ 
          activity_status: status,
          last_activity_at: new Date().toISOString()
        })
        .eq("user_id", currentUserId)
        .eq("language_code", languageCode)
        .eq("status", "active");

      setActivityStatus(status);
      toast({
        title: "Status Updated",
        description: `Your status is now: ${status.replace("_", " ")}`
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const onlineCount = teamMembers.filter(m => m.is_online).length;
  const shiftCounts = {
    A: teamMembers.filter(m => m.current_shift === "A").length,
    B: teamMembers.filter(m => m.current_shift === "B").length,
    C: teamMembers.filter(m => m.current_shift === "C").length
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Leader Dashboard
          </div>
          <Select value={activityStatus} onValueChange={updateActivityStatus}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Active
                </span>
              </SelectItem>
              <SelectItem value="absent">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Absent
                </span>
              </SelectItem>
              <SelectItem value="managing_shifts">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Managing Shifts
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="team" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="team">
              <Users className="h-4 w-4 mr-1" />
              Team
            </TabsTrigger>
            <TabsTrigger value="shifts">
              <Calendar className="h-4 w-4 mr-1" />
              Shifts
            </TabsTrigger>
            <TabsTrigger value="admin">
              <MessageCircle className="h-4 w-4 mr-1" />
              Admin
            </TabsTrigger>
          </TabsList>

          {/* Team Tab */}
          <TabsContent value="team" className="mt-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{teamMembers.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <div className="text-2xl font-bold text-primary">{onlineCount}</div>
                <div className="text-xs text-muted-foreground">Online</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{teamMembers.length - onlineCount}</div>
                <div className="text-xs text-muted-foreground">Offline</div>
              </div>
            </div>

            {/* Member List */}
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {teamMembers.slice(0, 50).map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photo_url || ""} />
                        <AvatarFallback>{member.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                        member.is_online ? "bg-green-500" : "bg-muted"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{member.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.last_active
                          ? formatDistanceToNow(new Date(member.last_active), { addSuffix: true })
                          : "Never"}
                      </div>
                    </div>
                    {member.current_shift && (
                      <Badge variant="outline" className="text-xs">
                        {member.current_shift}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Shifts Tab */}
          <TabsContent value="shifts" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-4 rounded-lg bg-warning/20 border border-warning/30 text-center">
                <div className="text-3xl font-bold">{shiftCounts.A}</div>
                <div className="text-sm font-medium">Shift A</div>
                <div className="text-xs text-muted-foreground">7AM - 4PM</div>
              </div>
              <div className="p-4 rounded-lg bg-info/20 border border-info/30 text-center">
                <div className="text-3xl font-bold">{shiftCounts.B}</div>
                <div className="text-sm font-medium">Shift B</div>
                <div className="text-xs text-muted-foreground">3PM - 12AM</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/20 border border-secondary/30 text-center">
                <div className="text-3xl font-bold">{shiftCounts.C}</div>
                <div className="text-sm font-medium">Shift C</div>
                <div className="text-xs text-muted-foreground">11PM - 8AM</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Currently online per shift</span>
              </div>
            </div>

            {leaderInfo && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <div className="text-sm font-medium mb-1">Your Term</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(leaderInfo.term_start), "MMM d, yyyy")} - {format(new Date(leaderInfo.term_end), "MMM d, yyyy")}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Admin Chat Tab */}
          <TabsContent value="admin" className="mt-4 space-y-4">
            <ScrollArea className="h-[200px] border rounded-lg p-3">
              <div className="space-y-3">
                {adminMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Start a conversation with Admin</p>
                  </div>
                ) : (
                  adminMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_role === "leader" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.sender_role === "leader"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className="text-[10px] opacity-70 mt-1">
                          {format(new Date(msg.created_at), "MMM d, HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                placeholder="Message to Admin..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessageToAdmin()}
              />
              <Button 
                size="icon" 
                onClick={sendMessageToAdmin}
                disabled={isSending || !newMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

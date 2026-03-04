import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { countries } from "@/data/countries";
import { languages } from "@/data/languages";
import { 
  ArrowLeft, 
  Search, 
  Flag, 
  MessageSquare, 
  User, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  Bell,
  Send,
  Users,
  Globe,
  EyeOff,
  Languages,
  Home,
  Video,
  Radio,
} from "lucide-react";

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  translated_message: string | null;
  created_at: string;
  is_read: boolean | null;
  flagged: boolean;
  flagged_by: string | null;
  flagged_at: string | null;
  flag_reason: string | null;
  moderation_status: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  photo_url: string | null;
  gender: string | null;
  country: string | null;
  primary_language: string | null;
}

interface ActiveChat {
  chat_id: string;
  man_user_id: string;
  woman_user_id: string;
  started_at: string;
  last_activity_at: string;
  man_name: string;
  woman_name: string;
  man_country: string;
  woman_country: string;
  man_language: string;
  woman_language: string;
  message_count: number;
}

const AdminChatMonitoring = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFlagged, setFilterFlagged] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Notification states
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationTarget, setNotificationTarget] = useState<"all" | "men" | "women">("all");
  const [sendingNotification, setSendingNotification] = useState(false);
  
  // Silent monitoring states
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [silentMonitorChatId, setSilentMonitorChatId] = useState<string | null>(null);
  const [silentMonitorMessages, setSilentMonitorMessages] = useState<ChatMessage[]>([]);
  const [monitorCountryFilter, setMonitorCountryFilter] = useState<string>("all");
  const [monitorLanguageFilter, setMonitorLanguageFilter] = useState<string>("all");
  const [monitorLanguageGroupFilter, setMonitorLanguageGroupFilter] = useState<string>("all");
  const [languageGroups, setLanguageGroups] = useState<{ id: string; name: string; languages: string[] }[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);

  // Video call monitoring states
  const [activeVideoCalls, setActiveVideoCalls] = useState<any[]>([]);
  const [loadingVideoCalls, setLoadingVideoCalls] = useState(false);

  // Private group monitoring states
  const [liveGroups, setLiveGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [monitoringGroupId, setMonitoringGroupId] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);

  useEffect(() => {
    loadMessages();
    loadActiveChats();
    loadLanguageGroups();
    loadActiveVideoCalls();
    loadLiveGroups();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('chat-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          loadMessages();
          if (silentMonitorChatId) {
            loadSilentMonitorMessages(silentMonitorChatId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_chat_sessions'
        },
        () => {
          loadActiveChats();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_call_sessions' },
        () => { loadActiveVideoCalls(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'private_groups' },
        () => { loadLiveGroups(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_messages' },
        () => {
          if (monitoringGroupId) loadGroupMessages(monitoringGroupId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus, filterFlagged, silentMonitorChatId]);

  const loadMessages = async () => {
    try {
      let query = supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterFlagged === "flagged") {
        query = query.eq("flagged", true);
      } else if (filterFlagged === "unflagged") {
        query = query.eq("flagged", false);
      }

      if (filterStatus !== "all") {
        query = query.eq("moderation_status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);

      // Load profiles for all senders and receivers
      const userIds = new Set<string>();
      data?.forEach((msg) => {
        userIds.add(msg.sender_id);
        userIds.add(msg.receiver_id);
      });

      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, gender, country, primary_language")
          .in("user_id", Array.from(userIds));

        if (profilesData) {
          const profilesMap: Record<string, Profile> = {};
          profilesData.forEach((p) => {
            profilesMap[p.user_id] = {
              user_id: p.user_id,
              full_name: p.full_name,
              photo_url: p.photo_url,
              gender: p.gender,
              country: p.country,
              primary_language: p.primary_language
            };
          });
          setProfiles(profilesMap);
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActiveChats = async () => {
    setLoadingChats(true);
    try {
      const { data: sessions, error } = await supabase
        .from("active_chat_sessions")
        .select("*")
        .eq("status", "active")
        .order("last_activity_at", { ascending: false });

      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        setActiveChats([]);
        return;
      }

      // Get all user IDs
      const userIds = new Set<string>();
      sessions.forEach((s) => {
        userIds.add(s.man_user_id);
        userIds.add(s.woman_user_id);
      });

      // Get profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, country, primary_language")
        .in("user_id", Array.from(userIds));

      const profileMap = new Map<string, any>();
      profilesData?.forEach((p) => profileMap.set(p.user_id, p));

      // Get message counts
      const chatIds = sessions.map((s) => s.chat_id);
      const { data: messageCounts } = await supabase
        .from("chat_messages")
        .select("chat_id")
        .in("chat_id", chatIds);

      const countMap = new Map<string, number>();
      messageCounts?.forEach((m) => {
        countMap.set(m.chat_id, (countMap.get(m.chat_id) || 0) + 1);
      });

      const chats: ActiveChat[] = sessions.map((s) => {
        const manProfile = profileMap.get(s.man_user_id);
        const womanProfile = profileMap.get(s.woman_user_id);
        return {
          chat_id: s.chat_id,
          man_user_id: s.man_user_id,
          woman_user_id: s.woman_user_id,
          started_at: s.started_at,
          last_activity_at: s.last_activity_at,
          man_name: manProfile?.full_name || "Unknown",
          woman_name: womanProfile?.full_name || "Unknown",
          man_country: manProfile?.country || "Unknown",
          woman_country: womanProfile?.country || "India",
          man_language: manProfile?.primary_language || "Unknown",
          woman_language: womanProfile?.primary_language || "Hindi",
          message_count: countMap.get(s.chat_id) || 0,
        };
      });

      setActiveChats(chats);
    } catch (error) {
      console.error("Error loading active chats:", error);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadLanguageGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("language_groups")
        .select("id, name, languages")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (error) throw error;
      setLanguageGroups(data || []);
    } catch (error) {
      console.error("Error loading language groups:", error);
    }
  };

  // Load active video calls for silent monitoring
  const loadActiveVideoCalls = async () => {
    setLoadingVideoCalls(true);
    try {
      const { data: sessions, error } = await supabase
        .from("video_call_sessions")
        .select("*")
        .in("status", ["active", "ringing"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!sessions || sessions.length === 0) {
        setActiveVideoCalls([]);
        return;
      }

      const userIds = new Set<string>();
      sessions.forEach((s: any) => {
        userIds.add(s.man_user_id);
        userIds.add(s.woman_user_id);
      });

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, country, primary_language")
        .in("user_id", Array.from(userIds));

      const profileMap = new Map<string, any>();
      profilesData?.forEach((p: any) => profileMap.set(p.user_id, p));

      const enriched = sessions.map((s: any) => ({
        ...s,
        man_name: profileMap.get(s.man_user_id)?.full_name || "Unknown",
        woman_name: profileMap.get(s.woman_user_id)?.full_name || "Unknown",
        man_country: profileMap.get(s.man_user_id)?.country || "Unknown",
        woman_country: profileMap.get(s.woman_user_id)?.country || "Unknown",
      }));

      setActiveVideoCalls(enriched);
    } catch (error) {
      console.error("Error loading video calls:", error);
    } finally {
      setLoadingVideoCalls(false);
    }
  };

  // Load live private groups for silent monitoring
  const loadLiveGroups = async () => {
    setLoadingGroups(true);
    try {
      const { data, error } = await supabase
        .from("private_groups")
        .select("*")
        .eq("is_active", true)
        .eq("is_live", true)
        .not("current_host_id", "is", null)
        .order("name", { ascending: true });

      if (error) throw error;
      setLiveGroups(data || []);
    } catch (error) {
      console.error("Error loading live groups:", error);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Load group messages for silent monitoring
  const loadGroupMessages = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from("group_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;

      const userIds = new Set<string>();
      data?.forEach((m: any) => userIds.add(m.sender_id));

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", Array.from(userIds));

      const profileMap = new Map<string, string>();
      profilesData?.forEach((p: any) => profileMap.set(p.user_id, p.full_name));

      const enriched = (data || []).map((m: any) => ({
        ...m,
        sender_name: profileMap.get(m.sender_id) || "Unknown",
      }));

      setGroupMessages(enriched);
    } catch (error) {
      console.error("Error loading group messages:", error);
    }
  };

  const startGroupMonitoring = (groupId: string) => {
    setMonitoringGroupId(groupId);
    loadGroupMessages(groupId);
    toast({
      title: "Silent Monitoring Started",
      description: "You are now silently monitoring this group's chat",
    });
  };

  const stopGroupMonitoring = () => {
    setMonitoringGroupId(null);
    setGroupMessages([]);
  };

  const loadSilentMonitorMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setSilentMonitorMessages(data || []);
    } catch (error) {
      console.error("Error loading silent monitor messages:", error);
    }
  };

  const sendBroadcastNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({
        title: "Error",
        description: "Please provide both title and message",
        variant: "destructive",
      });
      return;
    }

    setSendingNotification(true);
    try {
      // Get target users based on selection
      let query = supabase.from("profiles").select("user_id, gender");
      
      if (notificationTarget === "men") {
        query = query.eq("gender", "male");
      } else if (notificationTarget === "women") {
        query = query.eq("gender", "female");
      }

      const { data: users, error: usersError } = await query;
      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        toast({
          title: "No users found",
          description: "No users match the selected criteria",
          variant: "destructive",
        });
        return;
      }

      // Create notifications for each user
      const notifications = users.map((user) => ({
        user_id: user.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: "admin_broadcast",
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;

      toast({
        title: "Success",
        description: `Notification sent to ${users.length} ${notificationTarget === "all" ? "users" : notificationTarget}`,
      });

      setNotificationDialogOpen(false);
      setNotificationTitle("");
      setNotificationMessage("");
      setNotificationTarget("all");
    } catch (error) {
      console.error("Error sending notifications:", error);
      toast({
        title: "Error",
        description: "Failed to send notifications",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const startSilentMonitoring = (chatId: string) => {
    setSilentMonitorChatId(chatId);
    loadSilentMonitorMessages(chatId);
    toast({
      title: "Silent Monitoring Started",
      description: "You are now silently monitoring this chat",
    });
  };

  const stopSilentMonitoring = () => {
    setSilentMonitorChatId(null);
    setSilentMonitorMessages([]);
  };

  const filteredActiveChats = activeChats.filter((chat) => {
    // Country filter
    if (monitorCountryFilter !== "all") {
      if (chat.man_country !== monitorCountryFilter && chat.woman_country !== monitorCountryFilter) {
        return false;
      }
    }
    // Individual language filter
    if (monitorLanguageFilter !== "all") {
      if (chat.man_language !== monitorLanguageFilter && chat.woman_language !== monitorLanguageFilter) {
        return false;
      }
    }
    // Language group filter
    if (monitorLanguageGroupFilter !== "all") {
      const group = languageGroups.find(g => g.id === monitorLanguageGroupFilter);
      if (group) {
        const hasMatchingLanguage = group.languages.some(lang => 
          chat.man_language === lang || chat.woman_language === lang
        );
        if (!hasMatchingLanguage) {
          return false;
        }
      }
    }
    return true;
  });

  const handleFlag = async () => {
    if (!selectedMessage || !flagReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for flagging",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("chat_messages")
        .update({
          flagged: true,
          flagged_by: user.id,
          flagged_at: new Date().toISOString(),
          flag_reason: flagReason.trim(),
          moderation_status: "flagged",
        })
        .eq("id", selectedMessage.id);

      if (error) throw error;

      toast({ title: "Success", description: "Message flagged for review" });
      setFlagDialogOpen(false);
      setFlagReason("");
      setSelectedMessage(null);
      loadMessages();
    } catch (error) {
      console.error("Error flagging message:", error);
      toast({
        title: "Error",
        description: "Failed to flag message",
        variant: "destructive",
      });
    }
  };

  const handleUnflag = async (message: ChatMessage) => {
    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({
          flagged: false,
          flagged_by: null,
          flagged_at: null,
          flag_reason: null,
          moderation_status: "cleared",
        })
        .eq("id", message.id);

      if (error) throw error;

      toast({ title: "Success", description: "Flag removed" });
      loadMessages();
    } catch (error) {
      console.error("Error unflagging message:", error);
      toast({
        title: "Error",
        description: "Failed to remove flag",
        variant: "destructive",
      });
    }
  };

  const handleResolve = async (message: ChatMessage, status: string) => {
    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ moderation_status: status })
        .eq("id", message.id);

      if (error) throw error;

      toast({ title: "Success", description: `Message marked as ${status}` });
      loadMessages();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getUserName = (userId: string) => {
    return profiles[userId]?.full_name || userId.slice(0, 8) + "...";
  };

  const filteredMessages = messages.filter((msg) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      msg.message.toLowerCase().includes(search) ||
      msg.chat_id.toLowerCase().includes(search) ||
      getUserName(msg.sender_id).toLowerCase().includes(search) ||
      getUserName(msg.receiver_id).toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (message: ChatMessage) => {
    if (message.flagged) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Flagged
        </Badge>
      );
    }
    switch (message.moderation_status) {
      case "cleared":
        return (
          <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600">
            <CheckCircle className="h-3 w-3" />
            Cleared
          </Badge>
        );
      case "removed":
        return (
          <Badge variant="secondary" className="gap-1 bg-red-500/20 text-red-600">
            <XCircle className="h-3 w-3" />
            Removed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
              >
                <Home className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Chat Monitoring</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setNotificationDialogOpen(true)} variant="auroraOutline" size="sm" className="gap-2">
                <Bell className="h-4 w-4" />
                Broadcast
              </Button>
              <Button onClick={() => { loadMessages(); loadActiveChats(); }} variant="auroraOutline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{messages.length}</div>
              <div className="text-sm text-muted-foreground">Total Messages</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-destructive">
                {messages.filter((m) => m.flagged).length}
              </div>
              <div className="text-sm text-muted-foreground">Flagged</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {messages.filter((m) => m.moderation_status === "pending").length}
              </div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {messages.filter((m) => m.moderation_status === "cleared").length}
              </div>
              <div className="text-sm text-muted-foreground">Cleared</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">
                {activeChats.length}
              </div>
              <div className="text-sm text-muted-foreground">Active Chats</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="messages" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-2">
              <EyeOff className="h-4 w-4" />
              Chat Monitor
            </TabsTrigger>
            <TabsTrigger value="video-monitor" className="gap-2">
              <Video className="h-4 w-4" />
              Video Monitor
            </TabsTrigger>
            <TabsTrigger value="group-monitor" className="gap-2">
              <Radio className="h-4 w-4" />
              Group Monitor
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages, users, or chat IDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterFlagged} onValueChange={setFilterFlagged}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Flag Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Messages</SelectItem>
                    <SelectItem value="flagged">Flagged Only</SelectItem>
                    <SelectItem value="unflagged">Unflagged</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Mod Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="cleared">Cleared</SelectItem>
                    <SelectItem value="removed">Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Messages List */}
            <ScrollArea className="h-[calc(100vh-480px)]" ref={scrollRef}>
              <div className="space-y-3">
                {filteredMessages.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No messages found matching your criteria
                    </CardContent>
                  </Card>
                ) : (
                  filteredMessages.map((message, index) => (
                    <Card
                      key={message.id}
                      className={`transition-all duration-200 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 ${
                        message.flagged ? "border-destructive/50 bg-destructive/5" : ""
                      }`}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {getStatusBadge(message)}
                              <Badge variant="outline" className="gap-1">
                                <User className="h-3 w-3" />
                                {getUserName(message.sender_id)}
                              </Badge>
                              <span className="text-muted-foreground">→</span>
                              <Badge variant="outline" className="gap-1">
                                <User className="h-3 w-3" />
                                {getUserName(message.receiver_id)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(message.created_at), "MMM d, HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2">{message.message}</p>
                            {message.flag_reason && (
                              <p className="text-xs text-destructive mt-2">
                                <strong>Flag reason:</strong> {message.flag_reason}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedMessage(message);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!message.flagged ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedMessage(message);
                                  setFlagDialogOpen(true);
                                }}
                              >
                                <Flag className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-600 hover:bg-green-600/10"
                                onClick={() => handleUnflag(message)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
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

          {/* Silent Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-4">
            {silentMonitorChatId ? (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <EyeOff className="h-5 w-5 text-primary" />
                      Silent Monitoring Active
                    </CardTitle>
                    <Button variant="destructive" size="sm" onClick={stopSilentMonitoring}>
                      Stop Monitoring
                    </Button>
                  </div>
                  <CardDescription>
                    Chat ID: {silentMonitorChatId} - Messages update in real-time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/30">
                    <div className="space-y-3">
                      {silentMonitorMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg max-w-[80%] ${
                            profiles[msg.sender_id]?.gender === "male"
                              ? "bg-blue-500/10 ml-0"
                              : "bg-pink-500/10 ml-auto"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {getUserName(msg.sender_id)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.created_at), "HH:mm:ss")}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      ))}
                      {silentMonitorMessages.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No messages in this chat yet
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Monitoring Filters */}
                <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                  <Select value={monitorLanguageGroupFilter} onValueChange={setMonitorLanguageGroupFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Users className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Language Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Language Groups</SelectItem>
                      {languageGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} ({group.languages.length} languages)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={monitorCountryFilter} onValueChange={setMonitorCountryFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Globe className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[300px]">
                        <SelectItem value="all">All Countries</SelectItem>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.flag} {country.name}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  <Select value={monitorLanguageFilter} onValueChange={setMonitorLanguageFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Languages className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[300px]">
                        <SelectItem value="all">All Languages</SelectItem>
                        {languages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.name}>
                            {lang.name} ({lang.nativeName})
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Chats List */}
                <ScrollArea className="h-[calc(100vh-480px)]">
                  <div className="space-y-3">
                    {loadingChats ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : filteredActiveChats.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          No active chats found matching your criteria
                        </CardContent>
                      </Card>
                    ) : (
                      filteredActiveChats.map((chat) => (
                        <Card key={chat.chat_id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="gap-1">
                                    <User className="h-3 w-3" />
                                    {chat.man_name}
                                  </Badge>
                                  <span className="text-muted-foreground">↔</span>
                                  <Badge variant="secondary" className="gap-1">
                                    <User className="h-3 w-3" />
                                    {chat.woman_name}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {chat.man_country} ↔ {chat.woman_country}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Languages className="h-3 w-3" />
                                    {chat.man_language} ↔ {chat.woman_language}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {chat.message_count} messages
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => startSilentMonitoring(chat.chat_id)}
                              >
                                <EyeOff className="h-4 w-4" />
                                Monitor
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          {/* Video Call Silent Monitor Tab */}
          <TabsContent value="video-monitor" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Video className="h-5 w-5 text-primary" />
                    Active Video Calls ({activeVideoCalls.length})
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={loadActiveVideoCalls} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
                <CardDescription>
                  Silently monitor active 1-on-1 video calls. Participants cannot see you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingVideoCalls ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : activeVideoCalls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No active video calls at the moment</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {activeVideoCalls.map((call: any) => (
                        <Card key={call.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="gap-1">
                                    <User className="h-3 w-3" />
                                    {call.man_name}
                                  </Badge>
                                  <span className="text-muted-foreground">↔</span>
                                  <Badge variant="secondary" className="gap-1">
                                    <User className="h-3 w-3" />
                                    {call.woman_name}
                                  </Badge>
                                  <Badge className="bg-destructive/20 text-destructive gap-1">
                                    <Video className="h-3 w-3" />
                                    {call.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {call.man_country} ↔ {call.woman_country}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Started: {call.started_at ? format(new Date(call.started_at), "HH:mm:ss") : "N/A"}
                                  </span>
                                  {call.rate_per_minute && (
                                    <span>₹{call.rate_per_minute}/min</span>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="gap-1">
                                <EyeOff className="h-3 w-3" />
                                Monitored
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Private Group Silent Monitor Tab */}
          <TabsContent value="group-monitor" className="space-y-4">
            {monitoringGroupId ? (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <EyeOff className="h-5 w-5 text-primary" />
                      Silent Group Monitoring Active
                    </CardTitle>
                    <Button variant="destructive" size="sm" onClick={stopGroupMonitoring}>
                      Stop Monitoring
                    </Button>
                  </div>
                  <CardDescription>
                    Group: {liveGroups.find((g: any) => g.id === monitoringGroupId)?.name || monitoringGroupId} — Messages update in real-time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/30">
                    <div className="space-y-3">
                      {groupMessages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className="p-3 rounded-lg max-w-[80%] bg-muted"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {msg.sender_name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.created_at), "HH:mm:ss")}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      ))}
                      {groupMessages.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No messages in this group yet
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Radio className="h-5 w-5 text-primary" />
                      Live Private Groups ({liveGroups.length})
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={loadLiveGroups} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                  <CardDescription>
                    Silently monitor active private group calls and their chat messages. Not visible to participants.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingGroups ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : liveGroups.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Radio className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No private groups are live at the moment</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[500px]">
                      <div className="space-y-3">
                        {liveGroups.map((group: any) => (
                          <Card key={group.id} className="hover:shadow-md transition-shadow border-destructive/30">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xl">{group.name === "Rose" ? "🌹" : group.name === "Lily" ? "🌸" : group.name === "Jasmine" ? "🌼" : group.name === "Orchid" ? "🌺" : "🌸"}</span>
                                    <span className="font-semibold">{group.name}</span>
                                    <Badge variant="destructive" className="gap-1 animate-pulse">
                                      <Radio className="h-3 w-3" />
                                      LIVE
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      Host: {group.current_host_name || "Unknown"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {group.participant_count} participants
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => startGroupMonitoring(group.id)}
                                >
                                  <EyeOff className="h-4 w-4" />
                                  Monitor Chat
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Broadcast Notifications
                </CardTitle>
                <CardDescription>
                  Send notifications to all users, men only, or women only
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Audience</label>
                  <div className="flex gap-2">
                    <Button
                      variant={notificationTarget === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNotificationTarget("all")}
                      className="gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      All Users
                    </Button>
                    <Button
                      variant={notificationTarget === "men" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNotificationTarget("men")}
                      className="gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Men Only
                    </Button>
                    <Button
                      variant={notificationTarget === "women" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNotificationTarget("women")}
                      className="gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Women Only
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notification Title</label>
                  <Input
                    placeholder="Enter notification title..."
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Enter notification message..."
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={sendBroadcastNotification}
                  disabled={sendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendingNotification ? "Sending..." : "Send Notification"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Flag Message
            </DialogTitle>
            <DialogDescription>
              Provide a reason for flagging this message for moderation.
            </DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{selectedMessage.message}</p>
              </div>
              <Textarea
                placeholder="Enter reason for flagging..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleFlag}>
              Flag Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">From:</span>
                  <p className="font-medium">{getUserName(selectedMessage.sender_id)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">To:</span>
                  <p className="font-medium">{getUserName(selectedMessage.receiver_id)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sent:</span>
                  <p className="font-medium">
                    {format(new Date(selectedMessage.created_at), "MMM d, yyyy HH:mm:ss")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedMessage)}</div>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Message:</span>
                <div className="p-3 bg-muted rounded-lg mt-1">
                  <p className="text-sm">{selectedMessage.message}</p>
                </div>
              </div>
              {selectedMessage.flag_reason && (
                <div>
                  <span className="text-sm text-muted-foreground">Flag Reason:</span>
                  <div className="p-3 bg-destructive/10 rounded-lg mt-1 border border-destructive/20">
                    <p className="text-sm text-destructive">{selectedMessage.flag_reason}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {selectedMessage?.flagged && (
              <>
                <Button
                  variant="outline"
                  className="text-green-600"
                  onClick={() => {
                    handleResolve(selectedMessage, "cleared");
                    setViewDialogOpen(false);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Cleared
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleResolve(selectedMessage, "removed");
                    setViewDialogOpen(false);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark Removed
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Send Broadcast Notification
            </DialogTitle>
            <DialogDescription>
              Send a notification to all users, men only, or women only
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Audience</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={notificationTarget === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotificationTarget("all")}
                  className="gap-2"
                >
                  <Globe className="h-4 w-4" />
                  All Users
                </Button>
                <Button
                  variant={notificationTarget === "men" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotificationTarget("men")}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Men Only
                </Button>
                <Button
                  variant={notificationTarget === "women" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotificationTarget("women")}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Women Only
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notification Title</label>
              <Input
                placeholder="Enter notification title..."
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Enter notification message..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendBroadcastNotification}
              disabled={sendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendingNotification ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChatMonitoring;

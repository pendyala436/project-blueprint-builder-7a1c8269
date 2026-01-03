import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Crown, 
  Users, 
  MessageCircle, 
  Send,
  ArrowLeft,
  Activity,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

interface Leader {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  language_code: string;
  term_start: string;
  term_end: string;
  activity_status: string;
  last_activity_at: string | null;
  unread_count: number;
}

interface ChatMessage {
  id: string;
  message: string;
  sender_role: string;
  created_at: string;
}

export default function AdminLeadersScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string>("");

  useEffect(() => {
    loadAdminAndLeaders();
  }, []);

  const loadAdminAndLeaders = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentAdminId(user.id);
      }

      // Get all active leaders
      const { data: leadersData } = await supabase
        .from("community_leaders")
        .select("*")
        .eq("status", "active")
        .order("language_code");

      if (leadersData) {
        const enrichedLeaders = await Promise.all(
          leadersData.map(async (leader) => {
            // Get profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, photo_url")
              .eq("user_id", leader.user_id)
              .maybeSingle();

            // Get unread message count
            const { count } = await supabase
              .from("leader_admin_messages")
              .select("*", { count: "exact", head: true })
              .eq("leader_id", leader.user_id)
              .eq("sender_role", "leader")
              .eq("is_read", false);

            return {
              user_id: leader.user_id,
              full_name: profile?.full_name || "Unknown",
              photo_url: profile?.photo_url || null,
              language_code: leader.language_code,
              term_start: leader.term_start,
              term_end: leader.term_end,
              activity_status: leader.activity_status || "active",
              last_activity_at: leader.last_activity_at,
              unread_count: count || 0
            };
          })
        );

        setLeaders(enrichedLeaders);
      }
    } catch (error) {
      console.error("Error loading leaders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = async (leader: Leader) => {
    setSelectedLeader(leader);

    // Load messages
    const { data: messages } = await supabase
      .from("leader_admin_messages")
      .select("*")
      .eq("leader_id", leader.user_id)
      .order("created_at", { ascending: true });

    setChatMessages(messages || []);

    // Mark messages as read
    await supabase
      .from("leader_admin_messages")
      .update({ is_read: true })
      .eq("leader_id", leader.user_id)
      .eq("sender_role", "leader")
      .eq("is_read", false);

    // Update local count
    setLeaders(prev => prev.map(l => 
      l.user_id === leader.user_id ? { ...l, unread_count: 0 } : l
    ));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedLeader) return;
    setIsSending(true);
    try {
      const { data, error } = await supabase
        .from("leader_admin_messages")
        .insert({
          leader_id: selectedLeader.user_id,
          sender_id: currentAdminId,
          sender_role: "admin",
          language_code: selectedLeader.language_code,
          message: newMessage.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setChatMessages(prev => [...prev, data]);
      setNewMessage("");
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "absent": return "bg-yellow-500";
      case "managing_shifts": return "bg-blue-500";
      default: return "bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "absent": return "Absent";
      case "managing_shifts": return "Managing Shifts";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Community Leaders</h1>
            <p className="text-muted-foreground text-sm">
              Manage and communicate with elected leaders
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card">
            <CardContent className="pt-4 text-center">
              <Crown className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{leaders.length}</div>
              <div className="text-xs text-muted-foreground">Active Leaders</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">
                {new Set(leaders.map(l => l.language_code)).size}
              </div>
              <div className="text-xs text-muted-foreground">Language Groups</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-4 text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">
                {leaders.reduce((sum, l) => sum + l.unread_count, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Unread Messages</div>
            </CardContent>
          </Card>
        </div>

        {/* Leaders List */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              All Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded" />
                ))}
              </div>
            ) : leaders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active leaders yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {leaders.map((leader) => (
                    <div
                      key={leader.user_id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => openChat(leader)}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12 ring-2 ring-primary">
                          <AvatarImage src={leader.photo_url || ""} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Crown className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${getStatusColor(leader.activity_status)}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{leader.full_name}</span>
                          <Badge variant="outline" className="text-xs">{leader.language_code}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Activity className="h-3 w-3" />
                          <span>{getStatusLabel(leader.activity_status)}</span>
                          <span>•</span>
                          <Calendar className="h-3 w-3" />
                          <span>Until {format(new Date(leader.term_end), "MMM yyyy")}</span>
                        </div>
                        {leader.last_activity_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Last active: {formatDistanceToNow(new Date(leader.last_activity_at), { addSuffix: true })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {leader.unread_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {leader.unread_count}
                          </Badge>
                        )}
                        <Button size="sm" variant="outline">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat Dialog */}
      <Dialog open={!!selectedLeader} onOpenChange={() => setSelectedLeader(null)}>
        <DialogContent className="bg-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedLeader && (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedLeader.photo_url || ""} />
                    <AvatarFallback><Crown className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <span>{selectedLeader.full_name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {selectedLeader.language_code}
                    </Badge>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[300px] border rounded-lg p-3">
            <div className="space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_role === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.sender_role === "admin"
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
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button 
              size="icon" 
              onClick={sendMessage}
              disabled={isSending || !newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

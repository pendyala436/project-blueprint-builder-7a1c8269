import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
  RefreshCw
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

  useEffect(() => {
    loadMessages();
    
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus, filterFlagged]);

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
          .select("user_id, full_name, photo_url")
          .in("user_id", Array.from(userIds));

        if (profilesData) {
          const profilesMap: Record<string, Profile> = {};
          profilesData.forEach((p) => {
            profilesMap[p.user_id] = p;
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
                onClick={() => navigate("/admin/analytics")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Chat Monitoring</h1>
              </div>
            </div>
            <Button onClick={loadMessages} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>

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
        <ScrollArea className="h-[calc(100vh-380px)]" ref={scrollRef}>
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
              {selectedMessage.translated_message && (
                <div>
                  <span className="text-sm text-muted-foreground">Translated:</span>
                  <div className="p-3 bg-muted rounded-lg mt-1">
                    <p className="text-sm">{selectedMessage.translated_message}</p>
                  </div>
                </div>
              )}
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
    </div>
  );
};

export default AdminChatMonitoring;

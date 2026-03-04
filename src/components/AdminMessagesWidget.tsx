import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, Mail, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AdminMessage {
  id: string;
  subject: string;
  message: string;
  is_broadcast: boolean;
  is_read: boolean;
  created_at: string;
  admin_id: string;
}

interface AdminMessagesWidgetProps {
  currentUserId: string;
}

export const AdminMessagesWidget = ({ currentUserId }: AdminMessagesWidgetProps) => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      // Calculate 7-day cutoff
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch broadcasts and direct admin messages (not chat messages)
      const { data, error } = await supabase
        .from('admin_broadcast_messages')
        .select('*')
        .or(`is_broadcast.eq.true,recipient_id.eq.${currentUserId}`)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading admin messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (err) {
      console.error('Error loading admin messages:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`admin-messages-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_broadcast_messages' },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMessages, currentUserId]);

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    await supabase
      .from('admin_broadcast_messages')
      .update({ is_read: true })
      .eq('id', messageId);

    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, is_read: true } : m))
    );
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-4 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) return null;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2 px-3 sm:px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Megaphone className="h-4 w-4 text-primary" />
            Admin Messages
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 min-w-[16px]">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-3 sm:px-4 pb-3 pt-0">
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {messages.map((msg) => {
                const isExpanded = expandedMessageId === msg.id;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "p-2.5 rounded-lg border transition-all cursor-pointer",
                      msg.is_read
                        ? "border-border bg-muted/30"
                        : "border-primary/40 bg-primary/5"
                    )}
                    onClick={() => {
                      if (!msg.is_read) markAsRead(msg.id);
                      setExpandedMessageId(isExpanded ? null : msg.id);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "mt-0.5 shrink-0 rounded-full p-1",
                        msg.is_broadcast ? "bg-primary/10" : "bg-accent/10"
                      )}>
                        {msg.is_broadcast ? (
                          <Megaphone className="h-3 w-3 text-primary" />
                        ) : (
                          <Mail className="h-3 w-3 text-accent-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            "text-xs font-medium truncate",
                            msg.is_read ? "text-foreground" : "text-foreground font-semibold"
                          )}>
                            {msg.subject}
                          </p>
                          {!msg.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-3.5"
                          >
                            {msg.is_broadcast ? "Broadcast" : "Direct"}
                          </Badge>
                        </div>
                        {isExpanded && (
                          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">
                            {msg.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
};

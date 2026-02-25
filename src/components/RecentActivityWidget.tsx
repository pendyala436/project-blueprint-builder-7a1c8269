/**
 * RecentActivityWidget
 * 
 * Shows users the opposite-sex people they chatted or video-called with
 * in the last 3 days. Men see women, women see men.
 * Users can start a chat or call directly from this widget.
 */

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Video,
  Clock,
  Users,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface RecentContact {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  age: number | null;
  country: string | null;
  primaryLanguage: string | null;
  isOnline: boolean;
  lastInteractionAt: string;
  interactionType: "chat" | "video" | "both";
  chatCount: number;
  videoCount: number;
}

interface RecentActivityWidgetProps {
  currentUserId: string;
  userGender: "male" | "female";
  onStartChat?: (targetUserId: string, targetName: string) => void;
}

export const RecentActivityWidget = ({
  currentUserId,
  userGender,
  onStartChat,
}: RecentActivityWidgetProps) => {
  const [contacts, setContacts] = useState<RecentContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatStarting, setChatStarting] = useState<string | null>(null);

  const loadRecentActivity = useCallback(async () => {
    if (!currentUserId) return;
    setIsLoading(true);

    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const sinceDate = threeDaysAgo.toISOString();

      // Determine which column refers to the current user vs the opposite user
      const myCol = userGender === "male" ? "man_user_id" : "woman_user_id";
      const theirCol = userGender === "male" ? "woman_user_id" : "man_user_id";

      // Fetch chat sessions from last 3 days
      const [chatResult, videoResult] = await Promise.all([
        supabase
          .from("active_chat_sessions")
          .select(`${theirCol}, started_at`)
          .eq(myCol, currentUserId)
          .gte("started_at", sinceDate)
          .order("started_at", { ascending: false }),
        supabase
          .from("video_call_sessions")
          .select(`${theirCol}, started_at`)
          .eq(myCol, currentUserId)
          .gte("started_at", sinceDate)
          .order("started_at", { ascending: false }),
      ]);

      // Build a map of unique users with their interaction details
      const contactMap = new Map<string, {
        lastAt: string;
        chatCount: number;
        videoCount: number;
      }>();

      (chatResult.data || []).forEach((row: any) => {
        const id = row[theirCol];
        if (!id) return;
        const existing = contactMap.get(id);
        if (existing) {
          existing.chatCount++;
          if (row.started_at > existing.lastAt) existing.lastAt = row.started_at;
        } else {
          contactMap.set(id, { lastAt: row.started_at, chatCount: 1, videoCount: 0 });
        }
      });

      (videoResult.data || []).forEach((row: any) => {
        const id = row[theirCol];
        if (!id) return;
        const existing = contactMap.get(id);
        if (existing) {
          existing.videoCount++;
          if (row.started_at > existing.lastAt) existing.lastAt = row.started_at;
        } else {
          contactMap.set(id, { lastAt: row.started_at, chatCount: 0, videoCount: 1 });
        }
      });

      if (contactMap.size === 0) {
        setContacts([]);
        return;
      }

      const userIds = Array.from(contactMap.keys());

      // Fetch profiles and online status
      const [profilesResult, statusResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, age, country, primary_language")
          .in("user_id", userIds),
        supabase
          .from("user_status")
          .select("user_id, is_online")
          .in("user_id", userIds),
      ]);

      const profileMap = new Map(
        (profilesResult.data || []).map(p => [p.user_id, p] as const)
      );
      const onlineMap = new Map(
        (statusResult.data || []).map(s => [s.user_id, s.is_online as boolean] as const)
      );

      const list: RecentContact[] = userIds.map(id => {
        const info = contactMap.get(id)!;
        const profile = profileMap.get(id);
        return {
          userId: id,
          fullName: profile?.full_name || "Unknown",
          photoUrl: profile?.photo_url || null,
          age: profile?.age ?? null,
          country: profile?.country ?? null,
          primaryLanguage: profile?.primary_language ?? null,
          isOnline: onlineMap.get(id) ?? false,
          lastInteractionAt: info.lastAt,
          interactionType: info.chatCount > 0 && info.videoCount > 0 ? "both" :
                           info.videoCount > 0 ? "video" : "chat",
          chatCount: info.chatCount,
          videoCount: info.videoCount,
        };
      });

      // Sort: online first, then by most recent interaction
      list.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return new Date(b.lastInteractionAt).getTime() - new Date(a.lastInteractionAt).getTime();
      });

      setContacts(list);
    } catch (error) {
      console.error("Error loading recent activity:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, userGender]);

  useEffect(() => {
    loadRecentActivity();
  }, [loadRecentActivity]);

  const handleChat = async (contact: RecentContact) => {
    if (onStartChat) {
      onStartChat(contact.userId, contact.fullName);
      return;
    }

    setChatStarting(contact.userId);
    try {
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "start_chat",
          user_id: currentUserId,
          ...(userGender === "male"
            ? { woman_user_id: contact.userId }
            : { man_user_id: contact.userId }),
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to start chat:", err);
    } finally {
      setChatStarting(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Badge variant="secondary" className="text-xs">{contacts.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={loadRecentActivity} className="gap-1">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Users className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No recent chats or calls</p>
          <p className="text-xs mt-1">Your 3-day chat & call history will appear here</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[350px]">
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.userId}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar with online indicator */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.photoUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-sm">
                        {contact.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
                      contact.isOnline ? "bg-online" : "bg-muted-foreground"
                    )} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{contact.fullName}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Interaction type badges */}
                      {contact.chatCount > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <MessageCircle className="h-2.5 w-2.5" /> {contact.chatCount}
                        </Badge>
                      )}
                      {contact.videoCount > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <Video className="h-2.5 w-2.5" /> {contact.videoCount}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(contact.lastInteractionAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    size="sm"
                    className="gap-1 text-xs h-8"
                    disabled={!contact.isOnline || chatStarting === contact.userId}
                    onClick={() => handleChat(contact)}
                  >
                    {chatStarting === contact.userId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <MessageCircle className="h-3.5 w-3.5" />
                    )}
                    Chat
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};

export default RecentActivityWidget;

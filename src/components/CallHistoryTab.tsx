import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicProfiles } from "@/lib/profile-queries";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
// Skeleton removed — using spinner for WhatsApp-style consistency
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Video,
  Phone,
  Users,
  Clock,
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from "lucide-react";

type HistoryType = "all" | "chat" | "video" | "group";

interface HistoryItem {
  id: string;
  type: "chat" | "video" | "group";
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  totalMinutes: number;
  totalEarned: number;
  ratePerMinute: number;
  endReason?: string;
  groupName?: string;
  isIncoming?: boolean; // for calls: did I receive or initiate
}

interface CallHistoryTabProps {
  currentUserId: string;
  userGender: "male" | "female";
}

export const CallHistoryTab: React.FC<CallHistoryTabProps> = ({
  currentUserId,
  userGender,
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<HistoryType>("all");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isMale = userGender === "male";
  const partnerField = isMale ? "woman_user_id" : "man_user_id";

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const items: HistoryItem[] = [];

      // 1. Chat sessions
      const { data: chatSessions } = await supabase
        .from("active_chat_sessions")
        .select("*")
        .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false })
        .limit(100);

      // 2. Video call sessions
      const { data: videoSessions } = await supabase
        .from("video_call_sessions")
        .select("*")
        .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false })
        .limit(100);

      // 3. Group call participation (via group_video_access)
      const { data: groupAccess } = await supabase
        .from("group_video_access")
        .select("*, private_groups(name, owner_id)")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(50);

      // Collect all partner IDs for batch profile fetch
      const partnerIds = new Set<string>();
      chatSessions?.forEach((s) => {
        const pid = s.man_user_id === currentUserId ? s.woman_user_id : s.man_user_id;
        partnerIds.add(pid);
      });
      videoSessions?.forEach((s) => {
        const pid = s.man_user_id === currentUserId ? s.woman_user_id : s.man_user_id;
        partnerIds.add(pid);
      });
      // Group owners
      groupAccess?.forEach((g: any) => {
        if (g.private_groups?.owner_id) partnerIds.add(g.private_groups.owner_id);
      });

      // Batch fetch profiles using RPC (bypasses owner-only RLS on profiles table)
      const profileMap = new Map<string, { full_name: string; photo_url: string }>();
      if (partnerIds.size > 0) {
        const publicProfiles = await fetchPublicProfiles(Array.from(partnerIds));
        publicProfiles.forEach((p) => profileMap.set(p.user_id, { full_name: p.full_name || "User", photo_url: p.photo_url || "" }));
      }

      // Map chat sessions
      chatSessions?.forEach((s) => {
        const pid = s.man_user_id === currentUserId ? s.woman_user_id : s.man_user_id;
        const profile = profileMap.get(pid);
        items.push({
          id: s.id,
          type: "chat",
          partnerId: pid,
          partnerName: profile?.full_name || "User",
          partnerAvatar: profile?.photo_url || "",
          status: s.status,
          startedAt: s.started_at || s.created_at,
          endedAt: s.ended_at || undefined,
          totalMinutes: Number(s.total_minutes) || 0,
          totalEarned: Number(s.total_earned) || 0,
          ratePerMinute: Number(s.rate_per_minute) || 0,
          endReason: s.end_reason || undefined,
          isIncoming: isMale ? false : true,
        });
      });

      // Map video sessions
      videoSessions?.forEach((s) => {
        const pid = s.man_user_id === currentUserId ? s.woman_user_id : s.man_user_id;
        const profile = profileMap.get(pid);
        items.push({
          id: s.id,
          type: "video",
          partnerId: pid,
          partnerName: profile?.full_name || "User",
          partnerAvatar: profile?.photo_url || "",
          status: s.status,
          startedAt: s.started_at || s.created_at,
          endedAt: s.ended_at || undefined,
          totalMinutes: Number(s.total_minutes) || 0,
          totalEarned: Number(s.total_earned) || 0,
          ratePerMinute: Number(s.rate_per_minute) || 0,
          endReason: s.end_reason || undefined,
          isIncoming: !isMale,
        });
      });

      // Map group access
      groupAccess?.forEach((g: any) => {
        const ownerId = g.private_groups?.owner_id || "";
        const profile = profileMap.get(ownerId);
        items.push({
          id: g.id,
          type: "group",
          partnerId: ownerId,
          partnerName: profile?.full_name || "Host",
          partnerAvatar: profile?.photo_url || "",
          status: g.is_active ? "active" : "ended",
          startedAt: g.access_granted_at || g.created_at,
          endedAt: g.access_expires_at || undefined,
          totalMinutes: 0,
          totalEarned: Number(g.gift_amount) || 0,
          ratePerMinute: 0,
          groupName: g.private_groups?.name || "Private Group",
        });
      });

      // Sort by most recent
      items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      setHistory(items);
    } catch (e) {
      console.error("Error fetching history:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, isMale]);

  useEffect(() => {
    if (currentUserId) fetchHistory();
  }, [currentUserId, fetchHistory]);

  const filtered = filter === "all" ? history : history.filter((h) => h.type === filter);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "chat": return <MessageCircle className="w-4 h-4" />;
      case "video": return <Video className="w-4 h-4" />;
      case "group": return <Users className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "chat": return "bg-primary/10 text-primary";
      case "video": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "group": return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "active") return "text-green-600 dark:text-green-400";
    if (status === "ended" || status === "completed") return "text-muted-foreground";
    return "text-yellow-600 dark:text-yellow-400";
  };

  const filterButtons: { id: HistoryType; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All", icon: <Clock className="w-3.5 h-3.5" /> },
    { id: "chat", label: "Chats", icon: <MessageCircle className="w-3.5 h-3.5" /> },
    { id: "video", label: "Video", icon: <Video className="w-3.5 h-3.5" /> },
    { id: "group", label: "Groups", icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Filter bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          {filterButtons.map((fb) => (
            <button
              key={fb.id}
              onClick={() => setFilter(fb.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === fb.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted-foreground/10"
              )}
            >
              {fb.icon}
              {fb.label}
            </button>
          ))}
          <button
            onClick={fetchHistory}
            className="ml-auto p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Clock className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">No history yet</p>
          <p className="text-xs mt-1">Your chat and call history will appear here</p>
        </div>
      )}

      {/* History list */}
      {!loading && filtered.length > 0 && (
        <div className="divide-y divide-border/30">
          {filtered.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => {
                if (item.type === "chat") navigate(`/chat/${item.partnerId}`);
                else if (item.type === "video") navigate(`/profile/${item.partnerId}`);
                else navigate(`/profile/${item.partnerId}`);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={item.partnerAvatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {item.partnerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Type badge overlay */}
                <div className={cn("absolute -bottom-0.5 -right-0.5 p-1 rounded-full border-2 border-background", getTypeBadgeColor(item.type))}>
                  {getTypeIcon(item.type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">
                    {item.type === "group" ? item.groupName : item.partnerName}
                  </span>
                  {item.status === "active" && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-green-500/10 text-green-600 border-green-500/30">
                      LIVE
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  {item.isIncoming !== undefined && (
                    item.isIncoming
                      ? <ArrowDownLeft className="w-3 h-3 text-green-500" />
                      : <ArrowUpRight className="w-3 h-3 text-blue-500" />
                  )}
                  <span className={getStatusColor(item.status)}>
                    {item.status === "active" ? "Ongoing" : item.endReason || "Ended"}
                  </span>
                  {item.totalMinutes > 0 && (
                    <>
                      <span>·</span>
                      <span>{item.totalMinutes.toFixed(1)} min</span>
                    </>
                  )}
                  {item.totalEarned > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <IndianRupee className="w-3 h-3" />
                        {isMale ? `-${item.totalEarned.toFixed(0)}` : `+${item.totalEarned.toFixed(0)}`}
                      </span>
                    </>
                  )}
                </div>
                {item.type === "group" && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    Host: {item.partnerName}
                  </p>
                )}
              </div>

              {/* Timestamp */}
              <div className="text-[10px] text-muted-foreground text-right flex-shrink-0">
                {formatDistanceToNow(new Date(item.startedAt), { addSuffix: true })}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CallHistoryTab;

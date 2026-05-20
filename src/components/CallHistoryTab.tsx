import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicProfiles } from "@/lib/profile-queries";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  /** For men: total charged (debit); for women: total earned (credit) */
  totalAmount: number;
  /** Gender-appropriate rate per minute */
  ratePerMinute: number;
  endReason?: string;
  groupName?: string;
  isIncoming?: boolean;
}

/** Pricing rates – men pay, women earn (must mirror DB get_unified_pricing()) */
const RATES = {
  chat:  { man: 4, woman: 2 },
  audio: { man: 6, woman: 3 },
  video: { man: 8, woman: 4 },
  group: { man: 4, woman: 1 },
} as const;

/** Show precise duration: "5 min : 26 sec" — no rounding */
const formatDuration = (minutes: number): string => {
  const totalSecs = Math.round(minutes * 60);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m} min : ${s.toString().padStart(2, '0')} sec`;
};

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
        .limit(50);

      // 2. Video call sessions
      const { data: videoSessions } = await supabase
        .from("video_call_sessions")
        .select("*")
        .or(`man_user_id.eq.${currentUserId},woman_user_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false })
        .limit(30);

      // 3. Group call participation — unified from wallet_transactions + archive
      //    (>3 month old records live in wallet_transactions_archive)
      const { data: groupTxs } = await supabase.rpc(
        "get_user_group_call_history" as any,
        { p_user_id: currentUserId, p_is_male: isMale, p_limit: 50 }
      );

      // Collect partner IDs
      const partnerIds = new Set<string>();
      chatSessions?.forEach((s) => {
        partnerIds.add(s.man_user_id === currentUserId ? s.woman_user_id : s.man_user_id);
      });
      videoSessions?.forEach((s) => {
        partnerIds.add(s.man_user_id === currentUserId ? s.woman_user_id : s.man_user_id);
      });
      // (Group call partners are not direct 1:1; no extra partner IDs to fetch)

      // Batch fetch profiles
      const profileMap = new Map<string, { full_name: string; photo_url: string }>();
      if (partnerIds.size > 0) {
        const publicProfiles = await fetchPublicProfiles(Array.from(partnerIds));
        publicProfiles.forEach((p) =>
          profileMap.set(p.user_id, { full_name: p.full_name || "User", photo_url: p.photo_url || "" })
        );
      }

      // Map chat sessions — compute amounts based on gender
      chatSessions?.forEach((s) => {
        const pid = s.man_user_id === currentUserId ? s.woman_user_id : s.man_user_id;
        const profile = profileMap.get(pid);
        const mins = Number(s.total_minutes) || 0;
        const rate = isMale ? RATES.chat.man : RATES.chat.woman;
        const amount = mins * rate;
        items.push({
          id: s.id,
          type: "chat",
          partnerId: pid,
          partnerName: profile?.full_name || "User",
          partnerAvatar: profile?.photo_url || "",
          status: s.status,
          startedAt: s.started_at || s.created_at,
          endedAt: s.ended_at || undefined,
          totalMinutes: mins,
          totalAmount: amount,
          ratePerMinute: rate,
          endReason: s.end_reason || undefined,
          isIncoming: !isMale,
        });
      });

      // Map video sessions — detect audio vs video from call_type or rate
      videoSessions?.forEach((s) => {
        const pid = s.man_user_id === currentUserId ? s.woman_user_id : s.man_user_id;
        const profile = profileMap.get(pid);
        const mins = Number(s.total_minutes) || 0;
        const callType = (s as any).call_type;
        const isAudio = callType === 'audio';
        const rateSet = isAudio ? RATES.audio : RATES.video;
        const rate = isMale ? rateSet.man : rateSet.woman;
        const amount = mins * rate;
        items.push({
          id: s.id,
          type: "video",
          partnerId: pid,
          partnerName: profile?.full_name || "User",
          partnerAvatar: profile?.photo_url || "",
          status: s.status,
          startedAt: s.started_at || s.created_at,
          endedAt: s.ended_at || undefined,
          totalMinutes: mins,
          totalAmount: amount,
          ratePerMinute: rate,
          endReason: s.end_reason || undefined,
          isIncoming: !isMale,
        });
      });

      // Map group call transactions — derive duration & amount from wallet_transactions
      groupTxs?.forEach((tx: any) => {
        const secs = Number(tx.duration_seconds) || 0;
        const mins = secs > 0 ? secs / 60 : 0;
        const rate = Number(tx.rate_per_minute) || (isMale ? RATES.group.man : RATES.group.woman);
        items.push({
          id: tx.id,
          type: "group",
          partnerId: "",
          partnerName: "Private Group",
          partnerAvatar: "",
          status: "ended",
          startedAt: tx.created_at,
          endedAt: tx.created_at,
          totalMinutes: mins,
          totalAmount: Number(tx.amount) || 0,
          ratePerMinute: rate,
          groupName: tx.description || "Private Group Call",
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
      case "video": return "bg-accent/20 text-accent-foreground";
      case "group": return "bg-secondary/30 text-secondary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "active") return "text-primary";
    if (status === "ended" || status === "completed") return "text-muted-foreground";
    return "text-foreground";
  };

  const openChat = async (partnerId: string) => {
    const manUserId = userGender === "male" ? currentUserId : partnerId;
    const womanUserId = userGender === "female" ? currentUserId : partnerId;
    try {
      await supabase.functions.invoke("chat-manager", {
        body: {
          action: "start_chat",
          man_user_id: manUserId,
          woman_user_id: womanUserId,
        },
      });
    } catch (error) {
      console.warn("[History] Failed to pre-start chat session:", error);
    } finally {
      navigate(`/chat/${partnerId}`);
    }
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
                if (item.type === "chat") void openChat(item.partnerId);
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
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-primary/10 text-primary border-primary/30">
                      LIVE
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  {item.isIncoming !== undefined && (
                    item.isIncoming
                      ? <ArrowDownLeft className="w-3 h-3 text-primary" />
                      : <ArrowUpRight className="w-3 h-3 text-accent-foreground" />
                  )}
                  <span className={getStatusColor(item.status)}>
                    {item.status === "active" ? "Ongoing" : item.endReason || "Ended"}
                  </span>
                  {item.totalMinutes > 0 && (
                    <>
                      <span>·</span>
                      <span>{formatDuration(item.totalMinutes)}</span>
                    </>
                  )}
                  {item.ratePerMinute > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-muted-foreground">₹{item.ratePerMinute}/min</span>
                    </>
                  )}
                  {item.totalAmount > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <IndianRupee className="w-3 h-3" />
                        {isMale ? `-${item.totalAmount.toFixed(2)}` : `+${item.totalAmount.toFixed(2)}`}
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

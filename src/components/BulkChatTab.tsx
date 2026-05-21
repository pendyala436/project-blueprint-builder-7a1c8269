/**
 * BulkChatTab.tsx
 *
 * PURPOSE:
 *   A dedicated "Bulk Chat" tab inside the Women Dashboard. The woman manually
 *   picks up to 5 men to add to her bulk-chat queue. Each man gets a fully
 *   independent 1-to-1 chat session (via the existing chat-manager edge
 *   function) so the man's experience is indistinguishable from a normal chat.
 *
 * BILLING MODEL:
 *   • Each active man in the queue is billed at the normal rate (₹4 / min).
 *   • The woman earns ₹2 / min for EACH active man simultaneously.
 *   • If 5 men are active → man side total ₹20/min, woman earns ₹10/min.
 *   • Billing is handled 100% by the existing `process_chat_billing` RPC
 *     through the `chat-manager` edge function — no new billing logic needed.
 *
 * HOW IT WORKS:
 *   1. Woman searches online recharged men and taps "Add" → added to queue.
 *   2. Each queued man gets a `start_chat` call → creates a real
 *      `active_chat_sessions` row → billing starts immediately.
 *   3. Woman switches between chat panels by tapping a man's avatar pill.
 *   4. She types & sends messages in the active panel; other chats keep
 *      their billing ticking in the background.
 *   5. She can remove a man anytime → `end_chat` call stops his billing.
 *
 * TABS SHARING:
 *   Wallet balance and Profile are rendered by WomenDashboardScreen outside
 *   this component — this tab just handles its own queue + messaging UI.
 *
 * DATABASE TABLES USED (same as normal chat — no schema changes needed):
 *   - active_chat_sessions  (one row per man in queue, status = 'active')
 *   - chat_messages         (normal insert per message)
 *   - profiles              (partner name / photo lookup)
 *   - user_status           (online indicator)
 *   - chat_pricing          (rate lookup via useChatPricing hook)
 *
 * EDGE FUNCTIONS USED:
 *   - chat-manager: action=start_chat, action=end_chat, action=send_message
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useChatPricing } from "@/hooks/useChatPricing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Users,
  Search,
  X,
  Send,
  Plus,
  Settings2,
  RefreshCw,
  Wallet,
  IndianRupee,
  CheckCheck,
  Check,
  Loader2,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface OnlineMan {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  walletBalance: number;
  motherTongue: string;
  country: string | null;
  activeChatCount: number;
}

interface QueuedMan {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  /** Supabase active_chat_sessions.id */
  sessionId: string | null;
  /** Supabase chat_messages chat_id */
  chatId: string | null;
  /** billing is live once sessionId exists */
  billingActive: boolean;
  /** seconds this session has been running (client-side counter) */
  elapsedSeconds: number;
  /** woman's total earning from this man in this session */
  earnedSoFar: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface BulkChatTabProps {
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
  /** live wallet balance passed from parent (WomenDashboardScreen) */
  walletBalance: number;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_QUEUE = 5;
const BILLING_INTERVAL_MS = 60_000; // 1 minute tick (matches process_chat_billing)
const ELAPSED_TICK_MS = 1_000;      // UI counter ticks every second

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export const BulkChatTab = ({
  currentUserId,
  userName,
  userPhoto,
  walletBalance,
}: BulkChatTabProps) => {
  const { toast } = useToast();
  const { pricing } = useChatPricing();

  // ── State ──────────────────────────────────
  const [queue, setQueue] = useState<QueuedMan[]>([]);
  const [activeManId, setActiveManId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null); // userId being added
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [onlineMen, setOnlineMen] = useState<OnlineMan[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMen, setLoadingMen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [maxSlots, setMaxSlots] = useState(3); // woman's preference, 1-5

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());

  // ── Derived ────────────────────────────────
  const activeChatId = queue.find((m) => m.userId === activeManId)?.chatId ?? null;
  const activeMessages = activeManId ? (messages[activeManId] ?? []) : [];
  const totalEarned = queue.reduce((s, m) => s + m.earnedSoFar, 0);
  const activeCount = queue.filter((m) => m.billingActive).length;

  // ── Scroll to bottom when messages arrive ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

  // ── Elapsed timer (UI only) ─────────────────
  useEffect(() => {
    elapsedTimerRef.current = setInterval(() => {
      setQueue((prev) =>
        prev.map((m) => {
          if (!m.billingActive) return m;
          const newElapsed = m.elapsedSeconds + 1;
          // Every 60 s, add one earning tick to the UI counter
          const earnedTick =
            newElapsed % 60 === 0 ? pricing.womenEarningRate : 0;
          return {
            ...m,
            elapsedSeconds: newElapsed,
            earnedSoFar: m.earnedSoFar + earnedTick,
          };
        })
      );
    }, ELAPSED_TICK_MS);
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [pricing.womenEarningRate]);

  // ── Load online recharged men ───────────────
  const loadOnlineMen = useCallback(async () => {
    setLoadingMen(true);
    try {
      const { data, error } = await supabase.rpc("get_online_men_dashboard");
      if (error) throw error;
      const men: OnlineMan[] = ((data as any[]) || [])
        .filter((m: any) => Number(m.wallet_balance) > 0)
        .map((m: any) => ({
          userId: m.user_id,
          fullName: m.full_name || "Anonymous",
          photoUrl: m.photo_url ?? null,
          walletBalance: Number(m.wallet_balance) || 0,
          motherTongue: m.mother_tongue || m.primary_language || "Unknown",
          country: m.country ?? null,
          activeChatCount: Number(m.active_chat_count) || 0,
        }));
      setOnlineMen(men);
    } catch {
      toast({ title: "Could not load online men", variant: "destructive" });
    } finally {
      setLoadingMen(false);
    }
  }, [toast]);

  useEffect(() => {
    if (showAddPanel) loadOnlineMen();
  }, [showAddPanel, loadOnlineMen]);

  // ── Subscribe to incoming messages for a chatId ──
  const subscribeToChat = useCallback(
    (userId: string, chatId: string) => {
      if (realtimeChannelsRef.current.has(userId)) return;

      const ch = supabase
        .channel(`bulk-chat-${chatId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            const row = payload.new as any;
            const msg: ChatMessage = {
              id: row.id,
              senderId: row.sender_id,
              message: row.message || "",
              createdAt: row.created_at,
              isRead: false,
            };
            setMessages((prev) => ({
              ...prev,
              [userId]: [...(prev[userId] ?? []), msg],
            }));
          }
        )
        .subscribe();

      realtimeChannelsRef.current.set(userId, ch);
    },
    []
  );

  // ── Load existing messages for a chatId ─────
  const loadMessages = useCallback(async (userId: string, chatId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, sender_id, message, created_at, is_read")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (!data) return;
    const msgs: ChatMessage[] = (data as any[]).map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      message: r.message || "",
      createdAt: r.created_at,
      isRead: Boolean(r.is_read),
    }));
    setMessages((prev) => ({ ...prev, [userId]: msgs }));
  }, []);

  // ── Add man to queue ────────────────────────
  const handleAddMan = async (man: OnlineMan) => {
    if (queue.length >= maxSlots) {
      toast({
        title: `Queue full (max ${maxSlots})`,
        description: "Remove a man or increase slot limit in settings.",
      });
      return;
    }
    if (queue.some((m) => m.userId === man.userId)) {
      toast({ title: "Already in queue" });
      return;
    }

    setIsAdding(man.userId);
    try {
      // Start a real chat session → triggers normal billing via chat-manager
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "start_chat",
          man_user_id: man.userId,
          woman_user_id: currentUserId,
        },
      });

      if (error || !data?.success) {
        toast({
          title: "Could not start chat",
          description: data?.message ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }

      const sessionId: string = data.session_id ?? null;
      const chatId: string = data.chat_id ?? null;

      // Send opening message so man sees an active chat
      if (chatId) {
        await supabase.from("chat_messages").insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: man.userId,
          message: "👋 Hi!",
        });
      }

      const queued: QueuedMan = {
        userId: man.userId,
        fullName: man.fullName,
        photoUrl: man.photoUrl,
        sessionId,
        chatId,
        billingActive: true,
        elapsedSeconds: 0,
        earnedSoFar: 0,
      };

      setQueue((prev) => [...prev, queued]);
      if (!activeManId) setActiveManId(man.userId);

      if (chatId) {
        await loadMessages(man.userId, chatId);
        subscribeToChat(man.userId, chatId);
      }

      toast({ title: `${man.fullName} added to Bulk Chat` });
    } catch {
      toast({ title: "Failed to add man", variant: "destructive" });
    } finally {
      setIsAdding(null);
      setShowAddPanel(false);
    }
  };

  // ── Remove man from queue ───────────────────
  const handleRemoveMan = async (userId: string) => {
    const man = queue.find((m) => m.userId === userId);
    if (!man) return;

    setIsRemoving(userId);
    try {
      if (man.chatId) {
        await supabase.functions.invoke("chat-manager", {
          body: {
            action: "end_chat",
            chat_id: man.chatId,
          },
        });
      }
    } catch {
      // Best-effort end
    }

    // Unsubscribe realtime
    const ch = realtimeChannelsRef.current.get(userId);
    if (ch) {
      supabase.removeChannel(ch);
      realtimeChannelsRef.current.delete(userId);
    }

    setQueue((prev) => prev.filter((m) => m.userId !== userId));
    setMessages((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    if (activeManId === userId) {
      const remaining = queue.filter((m) => m.userId !== userId);
      setActiveManId(remaining[0]?.userId ?? null);
    }

    setIsRemoving(null);
  };

  // ── Send message ────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !activeManId || !activeChatId || isSending) return;

    setIsSending(true);
    setInputText("");
    try {
      await supabase.from("chat_messages").insert({
        chat_id: activeChatId,
        sender_id: currentUserId,
        receiver_id: activeManId,
        message: text,
      });
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // ── Cleanup on unmount ──────────────────────
  useEffect(() => {
    return () => {
      realtimeChannelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  // ── Helpers ─────────────────────────────────
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const filteredMen = onlineMen.filter(
    (m) =>
      !queue.some((q) => q.userId === m.userId) &&
      (m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.motherTongue.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">

      {/* ── Top bar ──────────────────────────── */}
      <div className="shrink-0 px-3 py-2 border-b border-border/40 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Bulk Chat
          </span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {activeCount}/{maxSlots} active
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Earnings pill */}
          <div className="flex items-center gap-0.5 text-[10px] bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
            <IndianRupee className="w-2.5 h-2.5" />
            <span className="font-semibold">{totalEarned.toFixed(2)}</span>
            <span className="opacity-70">/session</span>
          </div>

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowSettings((v) => !v)}
          >
            <Settings2 className="w-3.5 h-3.5" />
          </Button>

          {/* Add man */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-primary"
            onClick={() => setShowAddPanel((v) => !v)}
            disabled={queue.length >= maxSlots}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs">Add</span>
          </Button>
        </div>
      </div>

      {/* ── Settings panel ────────────────────── */}
      {showSettings && (
        <div className="shrink-0 border-b border-border/40 bg-background px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-foreground">Bulk Chat Settings</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-foreground">Max simultaneous men</p>
              <p className="text-[10px] text-muted-foreground">1 – 5 slots</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setMaxSlots((v) => Math.max(1, v - 1))}
              >−</Button>
              <span className="text-sm font-semibold w-4 text-center">{maxSlots}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setMaxSlots((v) => Math.min(MAX_QUEUE, v + 1))}
              >+</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-muted/50 rounded px-2 py-1 flex justify-between">
              <span className="text-muted-foreground">Man pays</span>
              <span className="font-semibold">₹{pricing.ratePerMinute}/min each</span>
            </div>
            <div className="bg-muted/50 rounded px-2 py-1 flex justify-between">
              <span className="text-muted-foreground">You earn</span>
              <span className="font-semibold text-green-600">₹{pricing.womenEarningRate}/min each</span>
            </div>
            <div className="bg-muted/50 rounded px-2 py-1 flex justify-between col-span-2">
              <span className="text-muted-foreground">At {activeCount} active men</span>
              <span className="font-semibold text-green-600">
                ₹{(activeCount * pricing.womenEarningRate).toFixed(0)}/min total
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Each man is billed individually at the standard rate. Billing is
            handled by the normal chat-manager — men see a regular 1-to-1 chat.
          </p>
        </div>
      )}

      {/* ── Add man panel ─────────────────────── */}
      {showAddPanel && (
        <div className="shrink-0 border-b border-border/40 bg-background">
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recharged men…"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={loadOnlineMen}
              disabled={loadingMen}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loadingMen && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowAddPanel(false)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filteredMen.length === 0 && !loadingMen && (
              <p className="text-xs text-muted-foreground text-center py-6">
                No recharged men online
              </p>
            )}
            {filteredMen.map((man) => (
              <div
                key={man.userId}
                className="flex items-center gap-3 px-3 py-2 border-b border-border/30 hover:bg-muted/40"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={man.photoUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {man.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{man.fullName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {man.motherTongue} · ₹{man.walletBalance}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={isAdding === man.userId}
                  onClick={() => handleAddMan(man)}
                >
                  {isAdding === man.userId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Queue pills ───────────────────────── */}
      {queue.length > 0 && (
        <div className="shrink-0 border-b border-border/40 bg-muted/10 overflow-x-auto">
          <div className="flex items-center gap-2 px-3 py-2 w-max">
            {queue.map((man) => (
              <button
                key={man.userId}
                onClick={() => setActiveManId(man.userId)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs transition-all shrink-0",
                  activeManId === man.userId
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-foreground border-border/60 hover:border-primary/50"
                )}
              >
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={man.photoUrl ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {man.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[64px] truncate font-medium">
                  {man.fullName.split(" ")[0]}
                </span>
                {man.billingActive && (
                  <span
                    className={cn(
                      "text-[9px] font-mono",
                      activeManId === man.userId
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatTime(man.elapsedSeconds)}
                  </span>
                )}
                {/* Remove button */}
                <span
                  role="button"
                  aria-label={`Remove ${man.fullName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMan(man.userId);
                  }}
                  className={cn(
                    "ml-0.5 rounded-full p-0.5 transition-colors",
                    activeManId === man.userId
                      ? "hover:bg-white/20"
                      : "hover:bg-muted"
                  )}
                >
                  {isRemoving === man.userId ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <X className="w-2.5 h-2.5" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main area ─────────────────────────── */}
      {queue.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary/60" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No men in queue</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tap <strong>+ Add</strong> to pick men from online recharged users.
              Each man gets a normal 1-to-1 chat — billing starts immediately.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddPanel(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add First Man
          </Button>

          {/* Billing explainer */}
          <div className="w-full bg-muted/40 rounded-xl p-3 text-left space-y-1.5 text-[11px]">
            <p className="font-semibold text-foreground">How billing works</p>
            <div className="flex justify-between text-muted-foreground">
              <span>Each man pays</span>
              <span className="font-medium text-foreground">₹{pricing.ratePerMinute}/min</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>You earn per man</span>
              <span className="font-medium text-green-600">₹{pricing.womenEarningRate}/min</span>
            </div>
            <div className="flex justify-between text-muted-foreground border-t border-border/30 pt-1.5 mt-1">
              <span>With 5 men active</span>
              <span className="font-medium text-green-600">
                ₹{5 * pricing.womenEarningRate}/min total
              </span>
            </div>
            <p className="text-muted-foreground/70 leading-snug pt-1">
              Men experience a normal individual chat — they don't know you're
              chatting with others simultaneously.
            </p>
          </div>
        </div>
      ) : (
        /* Active chat area */
        <div className="flex-1 flex flex-col min-h-0">

          {/* Chat partner header */}
          {activeManId && (() => {
            const man = queue.find((m) => m.userId === activeManId);
            if (!man) return null;
            return (
              <div className="shrink-0 px-3 py-2 border-b border-border/30 bg-background flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={man.photoUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {man.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{man.fullName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {man.billingActive ? (
                      <span className="text-green-600">
                        ● Billing active · {formatTime(man.elapsedSeconds)} · earned ₹{man.earnedSoFar.toFixed(2)}
                      </span>
                    ) : (
                      "Connecting…"
                    )}
                  </p>
                </div>
                {/* Per-man live rate */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">You earn</p>
                  <p className="text-xs font-semibold text-green-600">
                    ₹{pricing.womenEarningRate}/min
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2">
            {activeMessages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">
                Chat started — say hello 👋
              </div>
            )}
            {activeMessages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={cn("flex", isMine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-snug",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    <p>{msg.message}</p>
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-0.5",
                        isMine ? "justify-end" : "justify-start"
                      )}
                    >
                      <span className="text-[9px] opacity-60">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isMine &&
                        (msg.isRead ? (
                          <CheckCheck className="w-2.5 h-2.5 text-blue-400" />
                        ) : (
                          <Check className="w-2.5 h-2.5 opacity-60" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="shrink-0 border-t border-border/30 px-3 py-2 bg-background flex items-center gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                activeManId
                  ? `Message ${queue.find((m) => m.userId === activeManId)?.fullName.split(" ")[0] ?? ""}…`
                  : "Select a man above…"
              }
              disabled={!activeManId || isSending}
              className="flex-1 h-9 text-xs"
            />
            <Button
              size="sm"
              className="h-9 w-9 p-0 shrink-0"
              disabled={!inputText.trim() || !activeManId || isSending}
              onClick={handleSend}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Combined earnings strip (all men) */}
          {queue.length > 1 && (
            <div className="shrink-0 border-t border-border/20 bg-muted/20 px-3 py-1.5 overflow-x-auto">
              <div className="flex items-center gap-3 w-max">
                <span className="text-[10px] text-muted-foreground shrink-0">All earnings:</span>
                {queue.map((man) => (
                  <div
                    key={man.userId}
                    className="flex items-center gap-1.5 text-[10px] shrink-0"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={man.photoUrl ?? undefined} />
                      <AvatarFallback className="text-[7px]">
                        {man.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">
                      {man.fullName.split(" ")[0]}
                    </span>
                    <span className="font-semibold text-green-600">
                      ₹{man.earnedSoFar.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-l border-border/40 pl-3 flex items-center gap-1 shrink-0">
                  <Wallet className="w-3 h-3 text-primary" />
                  <span className="font-semibold text-primary">
                    ₹{totalEarned.toFixed(2)} total
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkChatTab;

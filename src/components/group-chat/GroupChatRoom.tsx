import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Pin, X, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGroupChatRoom, useGroupChatBilling, gcLeave, gcEndLive, type GroupChatMessage } from "@/hooks/useGroupChat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { translateText } from "@/lib/translation-service";

interface Props {
  sessionId: string;
  roomId: string;
  roomName: string;
  hostId: string;
  currentUserId: string;
  viewerGender: "male" | "female";
  viewerName: string;
  viewerLanguage?: string;
  onClose: () => void;
}

export const GroupChatRoom: React.FC<Props> = ({
  sessionId, roomId, roomName, hostId, currentUserId, viewerGender, viewerName, viewerLanguage, onClose,
}) => {
  const isHost = currentUserId === hostId;
  const isMan = viewerGender === "male";
  const { messages, participants } = useGroupChatRoom(sessionId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Translate non-self messages in background to viewer's language
  useEffect(() => {
    if (!viewerLanguage) return;
    messages.forEach(async (m) => {
      if (!m.body || m.sender_id === currentUserId) return;
      if (translations[m.id]) return;
      try {
        const out = await translateText(m.body, viewerLanguage, "auto");
        if (out?.translatedText && out.translatedText !== m.body) {
          setTranslations((t) => ({ ...t, [m.id]: out.translatedText }));
        }
      } catch { /* noop */ }
    });
  }, [messages, viewerLanguage, currentUserId, translations]);

  useGroupChatBilling({
    sessionId,
    manId: isMan ? currentUserId : null,
    enabled: isMan,
    onInsufficient: async () => {
      toast({ title: "Wallet empty", description: "Top up to keep chatting.", variant: "destructive" });
      await gcLeave(sessionId);
      onClose();
    },
  });

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const { error } = await supabase.from("group_chat_messages").insert({
      session_id: sessionId,
      room_id: roomId,
      sender_id: currentUserId,
      sender_name: viewerName,
      sender_gender: viewerGender,
      body: text,
    });
    setSending(false);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    setDraft("");
  };

  const pin = async (m: GroupChatMessage) => {
    if (!isHost) return;
    await supabase.from("group_chat_messages").update({ pinned: !m.pinned }).eq("id", m.id);
  };

  const handleLeave = async () => {
    if (isHost) await gcEndLive(sessionId);
    else await gcLeave(sessionId);
    onClose();
  };

  const pinned = messages.filter((m) => m.pinned);

  return (
    <div className="fixed inset-0 z-[125] flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border bg-card">
        <Button size="icon" variant="ghost" onClick={handleLeave}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            {roomName}
          </div>
          <div className="text-[11px] text-muted-foreground">{participants.length} online · {isMan ? "₹2/min" : "Hosting · ₹1/min per man"}</div>
        </div>
        <Button size="sm" variant="destructive" onClick={handleLeave}>
          <X className="w-3.5 h-3.5 mr-1" />{isHost ? "End" : "Leave"}
        </Button>
      </div>

      {pinned.length > 0 && (
        <div className="shrink-0 px-3 py-1.5 bg-muted/40 border-b border-border text-xs">
          {pinned.map((p) => (
            <div key={p.id} className="flex items-center gap-1 truncate">
              <Pin className="w-3 h-3 text-primary" />
              <span className="truncate"><b>{p.sender_name}:</b> {p.body}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">Say hi to start the conversation.</div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          const tr = translations[m.id];
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {!mine && (
                  <div className="text-[10px] font-semibold opacity-80 mb-0.5">{m.sender_name ?? "User"}</div>
                )}
                <div className="break-words whitespace-pre-wrap">{m.body}</div>
                {tr && !mine && (
                  <div className="text-[11px] opacity-70 mt-0.5 italic">{tr}</div>
                )}
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className="text-[9px] opacity-60">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {isHost && !mine && (
                    <button onClick={() => pin(m)} className="opacity-60 hover:opacity-100">
                      <Pin className={`w-3 h-3 ${m.pinned ? "fill-current" : ""}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-card p-2 flex gap-2 items-center pb-[env(safe-area-inset-bottom)]">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          className="flex-1"
        />
        <Button onClick={send} disabled={!draft.trim() || sending} size="icon"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
};

export default GroupChatRoom;

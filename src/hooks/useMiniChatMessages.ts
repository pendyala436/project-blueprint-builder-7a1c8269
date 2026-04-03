import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translateChatMessage } from "@/lib/translation-service";

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  isTranslated?: boolean;
  createdAt: string;
  sendFailed?: boolean; // CHT-C-02: Track failed sends for retry UI
}

interface UseMiniChatMessagesOptions {
  chatId: string;
  currentUserId: string;
  isMinimized: boolean;
  currentUserLanguage?: string;
  partnerLanguage?: string;
}

export const useMiniChatMessages = ({
  chatId,
  currentUserId,
  isMinimized,
  currentUserLanguage,
  partnerLanguage,
}: UseMiniChatMessagesOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effect 1: Load messages & subscribe to realtime inserts
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) {
        setMessages(
          data.map((m) => ({
            id: m.id,
            senderId: m.sender_id,
            message: m.message,
            createdAt: m.created_at,
          }))
        );
      }
    };

    loadMessages();

    const channel = supabase
      .channel(`draggable-chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const m = payload.new as any;
          const isSentByMe = m.sender_id === currentUserId;

          // Translate incoming partner messages
          let translatedMessage: string | undefined;
          let isTranslated = false;

          if (!isSentByMe && partnerLanguage && currentUserLanguage) {
            try {
              const result = await translateChatMessage(
                m.message,
                partnerLanguage,
                currentUserLanguage
              );
              if (result.isTranslated) {
                translatedMessage = result.translated;
                isTranslated = true;
              }
            } catch {
              // Fallback: show original (English fallback)
            }
          }

          const newMsg: Message = {
            id: m.id,
            senderId: m.sender_id,
            message: m.message,
            translatedMessage,
            isTranslated,
            createdAt: m.created_at,
          };

          setMessages((prev) => {
            if (prev.some((msg) => msg.id === m.id)) return prev;
            const filtered = prev.filter(
              (msg) => !msg.id.startsWith("temp-") || msg.senderId !== m.sender_id
            );
            return [...filtered, newMsg];
          });

          if (!isSentByMe) {
            setUnreadCount((prev) => prev + (isMinimized ? 1 : 0));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUserId, isMinimized]);

  // Effect 2: Auto-scroll on new messages
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  return {
    messages,
    setMessages,
    unreadCount,
    setUnreadCount,
    messagesEndRef,
  };
};

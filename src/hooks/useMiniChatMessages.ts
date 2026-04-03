import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translateChatMessage } from "@/lib/translation-service";

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  isTranslated?: boolean;
  translationFailed?: boolean; // CHT-H-04: Badge for failed translation
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

// CHT-H-01: markMessagesAsRead with retry logic
const markMessagesAsReadWithRetry = async (
  chatId: string,
  receiverId: string,
  maxRetries = 3
) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("chat_id", chatId)
        .eq("receiver_id", receiverId)
        .eq("is_read", false);
      
      if (!error) return; // Success
      console.warn(`[markMessagesAsRead] Attempt ${attempt + 1} failed:`, error.message);
    } catch (err) {
      console.warn(`[markMessagesAsRead] Attempt ${attempt + 1} exception:`, err);
    }
    // Exponential backoff: 500ms, 1000ms, 2000ms
    if (attempt < maxRetries - 1) {
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  console.error("[markMessagesAsRead] All retries exhausted for chat:", chatId);
};

export const useMiniChatMessages = ({
  chatId,
  currentUserId,
  isMinimized,
  currentUserLanguage,
  partnerLanguage,
}: UseMiniChatMessagesOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // CHT-H-02: Track seen message IDs to prevent duplicates
  const seenIdsRef = useRef<Set<string>>(new Set());

  // CHT-H-03: Load older messages (pagination)
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || messages.length === 0) return;
    setIsLoadingOlder(true);

    try {
      const oldestMessage = messages[0];
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .lt("created_at", oldestMessage.createdAt)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        const olderMsgs: Message[] = data
          .reverse()
          .filter(m => !seenIdsRef.current.has(m.id))
          .map((m) => {
            seenIdsRef.current.add(m.id);
            return {
              id: m.id,
              senderId: m.sender_id,
              message: m.message,
              translatedMessage: m.translated_message || undefined,
              isTranslated: m.is_translated || false,
              createdAt: m.created_at,
            };
          });
        setMessages((prev) => [...olderMsgs, ...prev]);
        setHasOlderMessages(data.length >= 50);
      } else {
        setHasOlderMessages(false);
      }
    } catch (err) {
      console.error("[loadOlderMessages] Error:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [chatId, messages, isLoadingOlder]);

  // Effect 1: Load messages & subscribe to realtime inserts
  useEffect(() => {
    seenIdsRef.current.clear();

    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) {
        const msgs = data.map((m) => {
          seenIdsRef.current.add(m.id);
          return {
            id: m.id,
            senderId: m.sender_id,
            message: m.message,
            translatedMessage: m.translated_message || undefined,
            isTranslated: m.is_translated || false,
            createdAt: m.created_at,
          };
        });
        setMessages(msgs);
        // CHT-H-03: Check if there might be older messages
        setHasOlderMessages(data.length >= 100);
      }

      // CHT-H-01: Mark messages as read with retry
      markMessagesAsReadWithRetry(chatId, currentUserId);
    };

    loadMessages();

    const channel = supabase
      .channel(`draggable-chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const m = payload.new as any;

          // CHT-H-02: Skip if already seen
          if (seenIdsRef.current.has(m.id)) return;
          seenIdsRef.current.add(m.id);

          const isSentByMe = m.sender_id === currentUserId;

          // Translate incoming partner messages
          let translatedMessage: string | undefined;
          let isTranslated = false;
          let translationFailed = false;

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
              // CHT-H-04: Mark translation as failed so UI can show badge
              translationFailed = true;
            }
          }

          const newMsg: Message = {
            id: m.id,
            senderId: m.sender_id,
            message: m.message,
            translatedMessage,
            isTranslated,
            translationFailed,
            createdAt: m.created_at,
          };

          setMessages((prev) => {
            // CHT-H-02: Double-check dedup in state updater
            if (prev.some((msg) => msg.id === m.id)) return prev;
            const filtered = prev.filter(
              (msg) => !msg.id.startsWith("temp-") || msg.senderId !== m.sender_id
            );
            return [...filtered, newMsg];
          });

          if (!isSentByMe) {
            setUnreadCount((prev) => prev + (isMinimized ? 1 : 0));
            // CHT-H-01: Mark as read with retry
            if (!isMinimized) {
              markMessagesAsReadWithRetry(chatId, currentUserId);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUserId, isMinimized, currentUserLanguage, partnerLanguage]);

  // Effect 2: Auto-scroll on new messages
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  // Mark as read when window is un-minimized
  useEffect(() => {
    if (!isMinimized && unreadCount > 0) {
      setUnreadCount(0);
      markMessagesAsReadWithRetry(chatId, currentUserId);
    }
  }, [isMinimized]);

  return {
    messages,
    setMessages,
    unreadCount,
    setUnreadCount,
    messagesEndRef,
    hasOlderMessages,
    isLoadingOlder,
    loadOlderMessages,
  };
};

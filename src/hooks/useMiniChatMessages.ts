import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translateForViewer, getEnglishTranslation } from "@/lib/translation-service";

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  englishText?: string;
  isTranslated?: boolean;
  translationFailed?: boolean;
  createdAt: string;
  sendFailed?: boolean;
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
      
      if (!error) return;
      console.warn(`[markMessagesAsRead] Attempt ${attempt + 1} failed:`, error.message);
    } catch (err) {
      console.warn(`[markMessagesAsRead] Attempt ${attempt + 1} exception:`, err);
    }
    if (attempt < maxRetries - 1) {
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  console.error("[markMessagesAsRead] All retries exhausted for chat:", chatId);
};

/**
 * Translate a message for the current viewer.
 * Returns { displayText, englishText, isTranslated }.
 */
async function translateMessageForViewer(
  text: string,
  viewerLanguage: string
): Promise<{ displayText: string; englishText: string; isTranslated: boolean }> {
  try {
    const result = await translateForViewer(text, viewerLanguage);
    return {
      displayText: result.nativeText,
      englishText: result.englishText,
      isTranslated: result.nativeText !== text,
    };
  } catch {
    return { displayText: text, englishText: text, isTranslated: false };
  }
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
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const viewerLang = (currentUserLanguage || 'english').toLowerCase().trim();

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
              englishText: m.original_english || undefined,
              isTranslated: m.is_translated || false,
              createdAt: m.created_at,
            };
          });

        // Background-translate older messages for viewer (all languages, including English)
        olderMsgs.forEach(async (msg) => {
          try {
            const result = await translateMessageForViewer(msg.message, currentUserLanguage || 'English');
            setMessages(prev => prev.map(m => 
              m.id === msg.id ? { ...m, translatedMessage: result.displayText, englishText: result.englishText, isTranslated: result.isTranslated } : m
            ));
          } catch { /* fallback is already original text */ }
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
  }, [chatId, messages, isLoadingOlder, currentUserLanguage, viewerLang]);

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
        const msgs: Message[] = data.map((m) => {
          seenIdsRef.current.add(m.id);
          return {
            id: m.id,
            senderId: m.sender_id,
            message: m.message,
            translatedMessage: m.translated_message || undefined,
            englishText: m.original_english || undefined,
            isTranslated: m.is_translated || false,
            createdAt: m.created_at,
          };
        });
        setMessages(msgs);
        setHasOlderMessages(data.length >= 100);

        // Background-translate all loaded messages for the viewer
        msgs.forEach(async (msg) => {
          try {
            const result = await translateMessageForViewer(msg.message, currentUserLanguage || 'English');
            setMessages(prev => prev.map(m => 
              m.id === msg.id 
                ? { ...m, translatedMessage: result.displayText, englishText: result.englishText, isTranslated: result.isTranslated } 
                : m
            ));
          } catch { /* keep original */ }
        });
      }

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

          if (seenIdsRef.current.has(m.id)) return;
          seenIdsRef.current.add(m.id);

          // Translate for viewer (both own and partner messages)
          let translatedMessage: string | undefined;
          let englishText: string | undefined;
          let isTranslated = false;
          let translationFailed = false;

          try {
            const result = await translateMessageForViewer(m.message, currentUserLanguage || 'English');
            translatedMessage = result.displayText;
            englishText = result.englishText;
            isTranslated = result.isTranslated;
          } catch {
            translationFailed = true;
          }

          const newMsg: Message = {
            id: m.id,
            senderId: m.sender_id,
            message: m.message,
            translatedMessage,
            englishText,
            isTranslated,
            translationFailed,
            createdAt: m.created_at,
          };

          setMessages((prev) => {
            if (prev.some((msg) => msg.id === m.id)) return prev;
            const filtered = prev.filter(
              (msg) => !msg.id.startsWith("temp-") || msg.senderId !== m.sender_id
            );
            return [...filtered, newMsg];
          });

          if (m.sender_id !== currentUserId) {
            setUnreadCount((prev) => prev + (isMinimized ? 1 : 0));
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

  // Allow external code to register message IDs (prevents realtime duplicates for optimistic sends)
  const addSeenId = useCallback((id: string) => {
    seenIdsRef.current.add(id);
  }, []);

  return {
    messages,
    setMessages,
    unreadCount,
    setUnreadCount,
    messagesEndRef,
    hasOlderMessages,
    isLoadingOlder,
    loadOlderMessages,
    addSeenId,
  };
};

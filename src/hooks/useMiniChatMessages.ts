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
  deletedForEveryone?: boolean;
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
  viewerLanguage: string,
  senderLanguage?: string
): Promise<{ displayText: string; englishText: string; isTranslated: boolean }> {
  try {
    const result = await translateForViewer(text, viewerLanguage, senderLanguage);
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

  // Pin volatile props to a ref so the realtime subscription doesn't churn
  // (re-subscribing on every minimize/restore was causing dropped messages).
  const subRefs = useRef({ isMinimized, currentUserLanguage, partnerLanguage });
  subRefs.current = { isMinimized, currentUserLanguage, partnerLanguage };

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
            // Determine sender's language: if sender is current user, use currentUserLanguage; else partnerLanguage
            const msgSenderLang = msg.senderId === currentUserId ? currentUserLanguage : partnerLanguage;
            const result = await translateMessageForViewer(msg.message, currentUserLanguage || 'English', msgSenderLang);
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
        // Filter out messages deleted for the current user
        const filtered = data.filter((m: any) => {
          if (m.deleted_for_everyone) return false;
          if (m.sender_id === currentUserId && m.deleted_for_sender) return false;
          if (m.receiver_id === currentUserId && m.deleted_for_receiver) return false;
          return true;
        });
        const msgs: Message[] = filtered.map((m) => {
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
            const msgSenderLang = msg.senderId === currentUserId ? currentUserLanguage : partnerLanguage;
            const result = await translateMessageForViewer(msg.message, currentUserLanguage || 'English', msgSenderLang);
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
      .channel(`draggable-chat-${chatId}-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const m = payload.new as any;

          if (seenIdsRef.current.has(m.id)) return;
          seenIdsRef.current.add(m.id);

          // Translate for viewer (both own and partner messages) — read latest props from refs
          let translatedMessage: string | undefined;
          let englishText: string | undefined;
          let isTranslated = false;
          let translationFailed = false;

          try {
            const viewerLang = subRefs.current.currentUserLanguage || 'English';
            const msgSenderLang = m.sender_id === currentUserId ? subRefs.current.currentUserLanguage : subRefs.current.partnerLanguage;
            const result = await translateMessageForViewer(m.message, viewerLang, msgSenderLang);
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
            const minimizedNow = subRefs.current.isMinimized;
            setUnreadCount((prev) => prev + (minimizedNow ? 1 : 0));
            if (!minimizedNow) {
              markMessagesAsReadWithRetry(chatId, currentUserId);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as any;
          if (m.deleted_for_everyone) {
            setMessages(prev => prev.map(msg =>
              msg.id === m.id ? { ...msg, message: 'This message was deleted', translatedMessage: undefined, englishText: undefined, deletedForEveryone: true } : msg
            ));
            return;
          }
          if (m.sender_id === currentUserId && m.deleted_for_sender) {
            setMessages(prev => prev.filter(msg => msg.id !== m.id));
            return;
          }
          if (m.receiver_id === currentUserId && m.deleted_for_receiver) {
            setMessages(prev => prev.filter(msg => msg.id !== m.id));
            return;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUserId]);

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

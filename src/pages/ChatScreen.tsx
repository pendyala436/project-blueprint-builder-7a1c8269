import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import MeowLogo from "@/components/MeowLogo";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  Send,
  Circle,
  Languages,
  Loader2,
  MoreVertical,
  Check,
  CheckCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  isTranslated: boolean;
  isRead: boolean;
  createdAt: string;
}

interface ChatPartner {
  userId: string;
  fullName: string;
  avatar: string;
  isOnline: boolean;
  preferredLanguage: string;
}

const ChatScreen = () => {
  const navigate = useNavigate();
  const { oderId } = useParams<{ oderId: string }>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatPartner, setChatPartner] = useState<ChatPartner | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserLanguage, setCurrentUserLanguage] = useState<string>("");
  const [showTranslations, setShowTranslations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatId = useRef<string>("");

  useEffect(() => {
    if (oderId) {
      initializeChat(oderId);
    }
  }, [oderId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!chatId.current) return;

    const channel = supabase
      .channel(`chat-${chatId.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId.current}`
        },
        async (payload: any) => {
          const newMsg = payload.new;
          
          // Translate incoming message to current user's language (auto-detect source)
          let translatedMessage = "";
          let isTranslated = false;
          
          if (newMsg.sender_id !== currentUserId) {
            // Translate to current user's preferred language
            const translation = await translateMessage(newMsg.message, currentUserLanguage);
            translatedMessage = translation.translatedMessage;
            isTranslated = translation.isTranslated;
          }

          setMessages(prev => {
            // Check if message already exists
            if (prev.some(m => m.id === newMsg.id)) return prev;
            
            return [...prev, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              message: newMsg.message,
              translatedMessage: translatedMessage || newMsg.translated_message,
              isTranslated: isTranslated || newMsg.is_translated,
              isRead: newMsg.is_read,
              createdAt: newMsg.created_at,
            }];
          });

          // Mark as read if received
          if (newMsg.sender_id !== currentUserId) {
            markAsRead(newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId.current, currentUserId, chatPartner, currentUserLanguage]);

  const initializeChat = async (partnerId: string) => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setCurrentUserId(user.id);

      // Generate consistent chat ID (smaller ID first)
      const ids = [user.id, partnerId].sort();
      chatId.current = `${ids[0]}_${ids[1]}`;

      // Get current user's language
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setCurrentUserLanguage(currentProfile?.preferred_language || "English");

      // Fetch chat partner details
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, preferred_language")
        .eq("user_id", partnerId)
        .maybeSingle();

      const { data: partnerStatus } = await supabase
        .from("user_status")
        .select("is_online")
        .eq("user_id", partnerId)
        .maybeSingle();

      if (partnerProfile) {
        setChatPartner({
          userId: partnerProfile.user_id,
          fullName: partnerProfile.full_name || "Anonymous",
          avatar: partnerProfile.photo_url || "",
          isOnline: partnerStatus?.is_online || false,
          preferredLanguage: partnerProfile.preferred_language || "English",
        });
      }

      // Fetch existing messages
      const { data: existingMessages } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId.current)
        .order("created_at", { ascending: true });

      if (existingMessages) {
        setMessages(existingMessages.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          message: msg.message,
          translatedMessage: msg.translated_message || undefined,
          isTranslated: msg.is_translated || false,
          isRead: msg.is_read || false,
          createdAt: msg.created_at,
        })));

        // Mark unread messages as read
        const unreadIds = existingMessages
          .filter(m => m.receiver_id === user.id && !m.is_read)
          .map(m => m.id);
        
        if (unreadIds.length > 0) {
          await supabase
            .from("chat_messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      }

    } catch (error) {
      console.error("Error initializing chat:", error);
      toast({
        title: "Error",
        description: "Failed to load chat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const translateMessage = async (message: string, targetLanguage: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { message, targetLanguage }
      });

      if (error) throw error;
      return { 
        translatedMessage: data.translatedMessage, 
        isTranslated: data.isTranslated,
        detectedLanguage: data.detectedLanguage 
      };
    } catch (error) {
      console.error("Translation error:", error);
      return { translatedMessage: message, isTranslated: false, detectedLanguage: "unknown" };
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("id", messageId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatPartner || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      // Translate message for receiver (auto-detect source language)
      // The translated message will be shown to the receiver in their language
      const translation = await translateMessage(messageText, chatPartner.preferredLanguage);
      const translatedMessage = translation.translatedMessage;
      const isTranslated = translation.isTranslated;

      const { error } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId.current,
          sender_id: currentUserId,
          receiver_id: chatPartner.userId,
          message: messageText,
          translated_message: translatedMessage || null,
          is_translated: isTranslated,
        });

      if (error) throw error;

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setNewMessage(messageText); // Restore message
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          
          {chatPartner && (
            <div 
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => navigate(`/profile/${chatPartner.userId}`)}
            >
              {/* Avatar */}
              <div className="relative">
                {chatPartner.avatar ? (
                  <img 
                    src={chatPartner.avatar} 
                    alt={chatPartner.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-rose-500/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {chatPartner.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Online indicator */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                  chatPartner.isOnline ? "bg-emerald-500" : "bg-muted-foreground"
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{chatPartner.fullName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {chatPartner.isOnline ? (
                    <span className="text-emerald-500">Online</span>
                  ) : (
                    <span>Offline</span>
                  )}
                  {chatPartner.preferredLanguage !== currentUserLanguage && (
                    <>
                      <span>•</span>
                      <Languages className="w-3 h-3" />
                      <span>{chatPartner.preferredLanguage}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Toggle translations */}
          <button
            onClick={() => setShowTranslations(!showTranslations)}
            className={`p-2 rounded-full transition-colors ${
              showTranslations ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
            }`}
            title={showTranslations ? "Hide translations" : "Show translations"}
          >
            <Languages className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="space-y-3">
              {/* Date separator */}
              <div className="flex justify-center">
                <span className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                  {date}
                </span>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message, index) => {
                const isMine = message.senderId === currentUserId;
                const showAvatar = !isMine && (index === 0 || dateMessages[index - 1]?.senderId !== message.senderId);

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"} animate-slide-up`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? "flex-row-reverse" : ""}`}>
                      {/* Avatar placeholder for alignment */}
                      {!isMine && (
                        <div className="w-8 flex-shrink-0">
                          {showAvatar && chatPartner?.avatar ? (
                            <img 
                              src={chatPartner.avatar} 
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : showAvatar ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-rose-500/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {chatPartner?.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className={`space-y-1`}>
                        {/* Original message - shown to sender, or if no translation */}
                        <div
                          className={`px-4 py-2.5 rounded-2xl ${
                            isMine 
                              ? "bg-primary text-primary-foreground rounded-br-md" 
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          {/* For receiver: show translated message as primary if available */}
                          {!isMine && message.isTranslated && message.translatedMessage ? (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.translatedMessage}</p>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                          )}
                        </div>

                        {/* Show original message for receiver if translated */}
                        {showTranslations && !isMine && message.isTranslated && message.translatedMessage && (
                          <div className="px-4 py-2 rounded-2xl bg-muted/50 border border-border/50 rounded-bl-md">
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                              <Languages className="w-3 h-3" />
                              Original
                            </p>
                            <p className="text-sm text-muted-foreground">{message.message}</p>
                          </div>
                        )}

                        {/* Show translated version for sender (what receiver sees) */}
                        {showTranslations && isMine && message.isTranslated && message.translatedMessage && (
                          <div className="px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 rounded-br-md">
                            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-1">
                              <Languages className="w-3 h-3" />
                              They see
                            </p>
                            <p className="text-sm text-foreground">{message.translatedMessage}</p>
                          </div>
                        )}

                        {/* Time and status */}
                        <div className={`flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          <span className="text-[10px] text-muted-foreground">{formatTime(message.createdAt)}</span>
                          {isMine && (
                            message.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-muted-foreground" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">Say hello to start the conversation!</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Message Input */}
      <footer className="sticky bottom-0 bg-background border-t border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 h-12 rounded-full px-5 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
              disabled={isSending}
              maxLength={1000}
            />
            <Button
              type="submit"
              size="icon"
              className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90"
              disabled={!newMessage.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>

          {/* Language info */}
          {chatPartner && chatPartner.preferredLanguage !== currentUserLanguage && (
            <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Languages className="w-3 h-3" />
              Messages will be translated to {chatPartner.preferredLanguage}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
};

export default ChatScreen;

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Send,
  X,
  Maximize2,
  Clock,
  IndianRupee,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pause,
  Play
} from "lucide-react";

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  isTranslated?: boolean;
  detectedLanguage?: string;
  createdAt: string;
}

interface MiniChatWindowProps {
  chatId: string;
  sessionId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  partnerLanguage: string;
  isPartnerOnline: boolean;
  currentUserId: string;
  currentUserLanguage: string;
  userGender: "male" | "female";
  ratePerMinute: number;
  onClose: () => void;
}

const MiniChatWindow = ({
  chatId,
  sessionId,
  partnerId,
  partnerName,
  partnerPhoto,
  partnerLanguage,
  isPartnerOnline,
  currentUserId,
  currentUserLanguage,
  userGender,
  ratePerMinute,
  onClose
}: MiniChatWindowProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [billingStarted, setBillingStarted] = useState(false);
  const [billingPaused, setBillingPaused] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages and subscribe
  useEffect(() => {
    loadMessages();
    const unsubscribe = subscribeToMessages();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      unsubscribe?.();
    };
  }, [chatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  // Check if billing has started (user sent at least one message)
  useEffect(() => {
    const hasSentMessage = messages.some(m => m.senderId === currentUserId);
    if (hasSentMessage && !billingStarted) {
      setBillingStarted(true);
      setLastActivityTime(Date.now());
      startBilling();
    }
  }, [messages, currentUserId, billingStarted]);

  // Inactivity check - pause billing after 3 mins of no typing
  useEffect(() => {
    if (!billingStarted || billingPaused) return;

    if (inactivityRef.current) {
      clearTimeout(inactivityRef.current);
    }

    inactivityRef.current = setTimeout(() => {
      setBillingPaused(true);
      // Stop the timer and heartbeat
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      toast({
        title: "Billing Paused",
        description: "No activity for 3 minutes. Type to resume.",
      });
    }, INACTIVITY_TIMEOUT_MS);

    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, [lastActivityTime, billingStarted, billingPaused]);

  // Auto-translate a message
  const translateMessage = async (text: string, senderId: string): Promise<{
    translatedMessage?: string;
    isTranslated?: boolean;
    detectedLanguage?: string;
  }> => {
    // Only translate messages from partner (not our own messages)
    if (senderId === currentUserId) {
      return {};
    }

    try {
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { 
          message: text,
          // sourceLanguage is auto-detected from text
          targetLanguage: currentUserLanguage 
        }
      });

      if (error) {
        console.error("Translation error:", error);
        return {};
      }

      return {
        translatedMessage: data.translatedMessage,
        isTranslated: data.isTranslated,
        detectedLanguage: data.detectedLanguage
      };
    } catch (err) {
      console.error("Failed to translate:", err);
      return {};
    }
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) {
      // Translate messages from partner
      const translatedMessages = await Promise.all(
        data.map(async (m) => {
          const translation = await translateMessage(m.message, m.sender_id);
          return {
            id: m.id,
            senderId: m.sender_id,
            message: m.message,
            translatedMessage: translation.translatedMessage,
            isTranslated: translation.isTranslated,
            detectedLanguage: translation.detectedLanguage,
            createdAt: m.created_at
          };
        })
      );
      setMessages(translatedMessages);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`mini-chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload: any) => {
          const newMsg = payload.new;
          
          // Translate if from partner
          const translation = await translateMessage(newMsg.message, newMsg.sender_id);
          
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              message: newMsg.message,
              translatedMessage: translation.translatedMessage,
              isTranslated: translation.isTranslated,
              detectedLanguage: translation.detectedLanguage,
              createdAt: newMsg.created_at
            }];
          });

          // Partner sent a message - update activity and resume billing if paused
          if (newMsg.sender_id !== currentUserId) {
            setLastActivityTime(Date.now());
            if (billingPaused && billingStarted) {
              resumeBilling();
            }
          }

          // Update unread count if minimized
          if (isMinimized && newMsg.sender_id !== currentUserId) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startBilling = () => {
    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    // Start heartbeat for billing (every 60 seconds)
    heartbeatRef.current = setInterval(async () => {
      if (billingPaused) return;
      try {
        await supabase.functions.invoke("chat-manager", {
          body: { action: "heartbeat", chat_id: chatId }
        });
      } catch (error) {
        console.error("Heartbeat error:", error);
      }
    }, 60000);
  };

  const resumeBilling = () => {
    setBillingPaused(false);
    
    // Restart timer if not already running
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }

    // Restart heartbeat if not already running
    if (!heartbeatRef.current) {
      heartbeatRef.current = setInterval(async () => {
        if (billingPaused) return;
        try {
          await supabase.functions.invoke("chat-manager", {
            body: { action: "heartbeat", chat_id: chatId }
          });
        } catch (error) {
          console.error("Heartbeat error:", error);
        }
      }, 60000);
    }

    toast({
      title: "Billing Resumed",
      description: "Chat activity detected.",
    });
  };

  const handleTyping = () => {
    const now = Date.now();
    setLastActivityTime(now);
    
    // Resume billing if paused
    if (billingPaused && billingStarted) {
      resumeBilling();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);
    setLastActivityTime(Date.now());

    // Resume billing if paused
    if (billingPaused && billingStarted) {
      resumeBilling();
    }

    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: messageText
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageText);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (isMinimized) {
      setUnreadCount(0);
    }
  };

  const openFullChat = () => {
    navigate(`/chat/${partnerId}`);
  };

  const handleClose = async () => {
    try {
      await supabase
        .from("active_chat_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          end_reason: "user_closed"
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error closing chat:", error);
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const estimatedCost = billingStarted ? (elapsedSeconds / 60) * ratePerMinute : 0;

  return (
    <Card className={cn(
      "flex flex-col shadow-xl border-2 transition-all duration-200",
      isMinimized ? "w-64 h-14" : "w-72 h-80",
      billingPaused ? "border-warning/50" : isPartnerOnline ? "border-primary/30" : "border-muted"
    )}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-2 bg-gradient-to-r from-primary/10 to-transparent cursor-pointer border-b"
        onClick={toggleMinimize}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <Avatar className="h-7 w-7">
              <AvatarImage src={partnerPhoto || undefined} />
              <AvatarFallback className="text-xs bg-primary/20">
                {partnerName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background",
              isPartnerOnline ? "bg-green-500" : "bg-muted-foreground"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{partnerName}</p>
            {billingStarted && (
              <div className="flex items-center gap-1 text-[10px]">
                {billingPaused ? (
                  <span className="text-warning flex items-center gap-0.5">
                    <Pause className="h-2 w-2" />
                    Paused
                  </span>
                ) : (
                  <>
                    <Clock className="h-2 w-2 text-muted-foreground" />
                    <span className="text-muted-foreground">{formatTime(elapsedSeconds)}</span>
                  </>
                )}
                {userGender === "male" && !billingPaused && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <IndianRupee className="h-2 w-2 text-muted-foreground" />
                    <span className="text-muted-foreground">₹{estimatedCost.toFixed(1)}</span>
                  </>
                )}
              </div>
            )}
            {!billingStarted && (
              <p className="text-[10px] text-muted-foreground">
                Type to start
              </p>
            )}
          </div>
          {unreadCount > 0 && isMinimized && (
            <Badge className="h-4 min-w-[16px] text-[9px] px-1 bg-primary">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); openFullChat(); }}
          >
            <Maximize2 className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}
          >
            {isMinimized ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      {/* Messages area (hidden when minimized) */}
      {!isMinimized && (
        <>
          {billingPaused && (
            <div className="px-2 py-1 bg-warning/10 text-warning text-[10px] text-center flex items-center justify-center gap-1">
              <Pause className="h-2.5 w-2.5" />
              Billing paused - Type to resume
            </div>
          )}
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1.5">
              {messages.length === 0 && (
                <p className="text-center text-[10px] text-muted-foreground py-4">
                  Say hi to start!
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.senderId === currentUserId ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-2 py-1 rounded-xl text-[11px]",
                      msg.senderId === currentUserId
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    )}
                  >
                    {/* Show translated message if available, otherwise original */}
                    {msg.isTranslated && msg.translatedMessage ? (
                      <div className="space-y-0.5">
                        <p>{msg.translatedMessage}</p>
                        <p className="text-[9px] opacity-60 italic border-t border-current/20 pt-0.5 mt-0.5">
                          {msg.message}
                          {msg.detectedLanguage && (
                            <span className="ml-1 opacity-75">({msg.detectedLanguage})</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      msg.message
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-1.5 border-t">
            <div className="flex items-center gap-1">
              <Input
                placeholder="Type..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyPress}
                className="h-7 text-[11px]"
                disabled={isSending}
              />
              <Button
                size="icon"
                className="h-7 w-7"
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default MiniChatWindow;

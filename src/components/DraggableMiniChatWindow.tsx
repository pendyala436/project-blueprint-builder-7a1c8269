import { useState, useEffect, useRef, useCallback } from "react";
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
  Minimize2,
  Clock,
  IndianRupee,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Wallet,
  AlertTriangle,
  GripVertical,
  Move
} from "lucide-react";
import { ChatRelationshipActions } from "@/components/ChatRelationshipActions";
import { GiftSendButton } from "@/components/GiftSendButton";
import { useBlockCheck } from "@/hooks/useBlockCheck";

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes - auto disconnect
const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes - show warning

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  isTranslated?: boolean;
  detectedLanguage?: string;
  createdAt: string;
}

interface DraggableMiniChatWindowProps {
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
  earningRatePerMinute: number;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
}

const DraggableMiniChatWindow = ({
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
  earningRatePerMinute,
  onClose,
  initialPosition = { x: 20, y: 20 },
  zIndex = 50,
  onFocus
}: DraggableMiniChatWindowProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [billingStarted, setBillingStarted] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [totalEarned, setTotalEarned] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [inactiveWarning, setInactiveWarning] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Dragging state
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Resize state
  const [size, setSize] = useState({ width: 320, height: 400 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startWidth: number; startHeight: number; startX: number; startY: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef(false);

  // Check block status
  const { isBlocked, isBlockedByThem } = useBlockCheck(currentUserId, partnerId);

  // Auto-close if blocked
  useEffect(() => {
    if (isBlocked) {
      toast({
        title: "Chat Ended",
        description: isBlockedByThem 
          ? "This user has blocked you" 
          : "You have blocked this user",
        variant: "destructive"
      });
      handleClose();
    }
  }, [isBlocked]);

  // Dragging handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y
    };
    onFocus?.();
  }, [position, isMaximized, onFocus]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      
      setPosition({
        x: Math.max(0, dragRef.current.startPosX + deltaX),
        y: Math.max(0, dragRef.current.startPosY + deltaY)
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startWidth: size.width,
      startHeight: size.height,
      startX: e.clientX,
      startY: e.clientY
    };
  }, [size]);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;
      
      const deltaX = e.clientX - resizeRef.current.startX;
      const deltaY = e.clientY - resizeRef.current.startY;
      
      setSize({
        width: Math.max(280, Math.min(600, resizeRef.current.startWidth + deltaX)),
        height: Math.max(300, Math.min(600, resizeRef.current.startHeight + deltaY))
      });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (userGender === "male") {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", currentUserId)
            .maybeSingle();
          
          if (wallet) {
            setWalletBalance(wallet.balance);
          }
        } else {
          const today = new Date().toISOString().split("T")[0];
          const { data: earnings } = await supabase
            .from("women_earnings")
            .select("amount")
            .eq("user_id", currentUserId)
            .gte("created_at", `${today}T00:00:00`);
          
          const total = earnings?.reduce((acc, e) => acc + Number(e.amount), 0) || 0;
          setTodayEarnings(total);
        }

        if (!sessionStartedRef.current) {
          sessionStartedRef.current = true;
          toast({
            title: "Chat Started",
            description: userGender === "male" 
              ? `You're being charged ₹${ratePerMinute}/min`
              : `You'll earn ₹${earningRatePerMinute}/min`,
          });
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    loadInitialData();
  }, [currentUserId, userGender, ratePerMinute, earningRatePerMinute]);

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

  // Auto-scroll
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  // Billing start check
  useEffect(() => {
    const hasSentMessage = messages.some(m => m.senderId === currentUserId);
    const hasReceivedMessage = messages.some(m => m.senderId !== currentUserId);
    
    // Billing starts only when BOTH parties have exchanged messages
    if (hasSentMessage && hasReceivedMessage && !billingStarted) {
      setBillingStarted(true);
      setLastActivityTime(Date.now());
      startBilling();
    }
  }, [messages, currentUserId, billingStarted]);

  // Inactivity check
  useEffect(() => {
    if (!billingStarted) return;

    const warningInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      
      if (timeSinceActivity >= WARNING_THRESHOLD_MS && timeSinceActivity < INACTIVITY_TIMEOUT_MS) {
        const remainingSecs = Math.ceil((INACTIVITY_TIMEOUT_MS - timeSinceActivity) / 1000);
        setInactiveWarning(`Ends in ${remainingSecs}s`);
      } else {
        setInactiveWarning(null);
      }
    }, 1000);

    if (inactivityRef.current) {
      clearTimeout(inactivityRef.current);
    }

    inactivityRef.current = setTimeout(async () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      toast({
        title: "Chat Disconnected",
        description: "No activity for 3 minutes. Chat ended automatically.",
      });
      
      try {
        await supabase
          .from("active_chat_sessions")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            end_reason: "inactivity_timeout"
          })
          .eq("id", sessionId);
      } catch (error) {
        console.error("Error auto-closing chat:", error);
      }
      
      onClose();
    }, INACTIVITY_TIMEOUT_MS);

    return () => {
      clearInterval(warningInterval);
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, [lastActivityTime, billingStarted, sessionId, onClose]);

  // Auto-translate
  const translateMessage = async (text: string, senderId: string): Promise<{
    translatedMessage?: string;
    isTranslated?: boolean;
    detectedLanguage?: string;
  }> => {
    if (senderId === currentUserId) return {};

    try {
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { 
          message: text,
          targetLanguage: currentUserLanguage 
        }
      });

      if (error) return {};

      return {
        translatedMessage: data.translatedMessage,
        isTranslated: data.isTranslated,
        detectedLanguage: data.detectedLanguage
      };
    } catch (err) {
      return {};
    }
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
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
      .channel(`draggable-chat-${chatId}`)
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

          if (newMsg.sender_id !== currentUserId) {
            setLastActivityTime(Date.now());
          }

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
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    heartbeatRef.current = setInterval(async () => {
      try {
        await supabase.functions.invoke("chat-manager", {
          body: { action: "heartbeat", chat_id: chatId, session_id: sessionId }
        });

        // Refresh wallet balance for men
        if (userGender === "male") {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", currentUserId)
            .maybeSingle();
          
          if (wallet) {
            setWalletBalance(wallet.balance);
            
            // Check if balance is too low
            if (wallet.balance < ratePerMinute) {
              toast({
                title: "Low Balance",
                description: "Please recharge to continue chatting",
                variant: "destructive"
              });
            }
          }
        }
      } catch (error) {
        console.error("Heartbeat error:", error);
      }
    }, 60000);
  };

  const handleTyping = () => {
    setLastActivityTime(Date.now());
  };

  const MAX_MESSAGE_LENGTH = 2000;

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    
    if (messageText.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Messages must be under ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive"
      });
      return;
    }

    setNewMessage("");
    setIsSending(true);
    setLastActivityTime(Date.now());

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

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      setIsMinimized(false);
    }
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
  const estimatedEarning = billingStarted ? (elapsedSeconds / 60) * earningRatePerMinute : 0;

  const windowStyle = isMaximized 
    ? { 
        position: 'fixed' as const, 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        width: '100%', 
        height: '100%',
        zIndex: zIndex + 100 
      }
    : { 
        position: 'fixed' as const,
        right: position.x, 
        bottom: position.y, 
        width: isMinimized ? 240 : size.width, 
        height: isMinimized ? 48 : size.height,
        zIndex
      };

  return (
    <Card 
      ref={windowRef}
      style={windowStyle}
      className={cn(
        "flex flex-col shadow-2xl border-2 transition-all duration-200",
        isPartnerOnline ? "border-primary/30" : "border-muted",
        isDragging && "opacity-90",
        isMaximized && "rounded-none"
      )}
      onClick={onFocus}
    >
      {/* Inactivity Warning */}
      {inactiveWarning && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive text-[9px]">
          <AlertTriangle className="h-2.5 w-2.5" />
          <span>{inactiveWarning}</span>
        </div>
      )}
      
      {/* Header - Draggable */}
      <div 
        className={cn(
          "flex items-center justify-between p-2 bg-gradient-to-r from-primary/10 to-transparent border-b",
          !isMaximized && "cursor-move"
        )}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!isMaximized && (
            <Move className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
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
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium truncate">{partnerName}</p>
              {userGender === "male" && walletBalance > 0 && (
                <Badge variant="outline" className="h-3.5 text-[8px] px-1 gap-0.5">
                  <Wallet className="h-2 w-2" />₹{walletBalance.toFixed(0)}
                </Badge>
              )}
              {userGender === "female" && todayEarnings > 0 && (
                <Badge variant="outline" className="h-3.5 text-[8px] px-1 gap-0.5 border-green-500/30 text-green-600">
                  <TrendingUp className="h-2 w-2" />₹{todayEarnings.toFixed(0)}
                </Badge>
              )}
            </div>
            {billingStarted && (
              <div className="flex items-center gap-1 text-[10px]">
                <Clock className="h-2 w-2 text-muted-foreground" />
                <span className="text-muted-foreground">{formatTime(elapsedSeconds)}</span>
                {userGender === "male" ? (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <IndianRupee className="h-2 w-2 text-destructive" />
                    <span className="text-destructive">₹{estimatedCost.toFixed(1)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <TrendingUp className="h-2 w-2 text-green-500" />
                    <span className="text-green-500">+₹{estimatedEarning.toFixed(1)}</span>
                  </>
                )}
              </div>
            )}
            {!billingStarted && (
              <p className="text-[10px] text-muted-foreground">
                {userGender === "male" 
                  ? `₹${ratePerMinute}/min - Both reply to start` 
                  : `Earn ₹${earningRatePerMinute}/min - Both reply to start`}
              </p>
            )}
          </div>
          {unreadCount > 0 && isMinimized && (
            <Badge className="h-4 min-w-[16px] text-[9px] px-1 bg-primary">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5" onMouseDown={e => e.stopPropagation()}>
          {userGender === "male" && (
            <GiftSendButton
              senderId={currentUserId}
              receiverId={partnerId}
              receiverName={partnerName}
              disabled={!billingStarted}
            />
          )}
          <ChatRelationshipActions
            currentUserId={currentUserId}
            targetUserId={partnerId}
            targetUserName={partnerName}
            onBlock={handleClose}
            className="h-5 w-5"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={toggleMaximize}
          >
            {isMaximized ? <Minimize2 className="h-2.5 w-2.5" /> : <Maximize2 className="h-2.5 w-2.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={toggleMinimize}
          >
            {isMinimized ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive"
            onClick={handleClose}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1.5">
              {messages.length === 0 && (
                <p className="text-center text-[10px] text-muted-foreground py-4">
                  Say hi to start! Billing begins when both reply.
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
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyPress}
                className="h-8 text-xs"
                disabled={isSending}
              />
              <Button
                size="icon"
                className="h-8 w-8"
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

          {/* Resize handle */}
          {!isMaximized && (
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center"
              onMouseDown={handleResizeStart}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground rotate-[-45deg]" />
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default DraggableMiniChatWindow;

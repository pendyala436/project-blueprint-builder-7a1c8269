import { useState, useEffect, useRef, useCallback } from "react";
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
  TrendingUp,
  Wallet,
  AlertTriangle
} from "lucide-react";
import { ChatRelationshipActions } from "@/components/ChatRelationshipActions";
import { GiftSendButton } from "@/components/GiftSendButton";
import { useBlockCheck } from "@/hooks/useBlockCheck";
import { useRealtimeTranslation } from "@/lib/translation";
import { TranslatedTypingIndicator } from "@/components/TranslatedTypingIndicator";
import { useDLTranslate } from "@/lib/dl-translate";

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes - auto disconnect per feature requirement
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
  windowWidthClass?: string;
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
  onClose,
  windowWidthClass = "w-72"
}: MiniChatWindowProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { convertToNative, translate, translateForChat, isLatinScript, isSameLanguage } = useDLTranslate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [displayMessage, setDisplayMessage] = useState(""); // Native script display
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [billingStarted, setBillingStarted] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [totalEarned, setTotalEarned] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [earningRate, setEarningRate] = useState(2);
  const [inactiveWarning, setInactiveWarning] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef(false);
  const transliterationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Only skip conversion if mother tongue is English - all other languages need conversion
  const needsNativeConversion = currentUserLanguage.toLowerCase() !== 'english' && currentUserLanguage.toLowerCase() !== 'en';

  // Real-time typing indicator with translation
  const {
    sendTypingIndicator,
    stopTyping,
    partnerTyping
  } = useRealtimeTranslation({
    currentUserId,
    currentUserLanguage,
    channelId: chatId,
    enabled: true
  });

  // Check block status - auto-close if blocked
  const { isBlocked, isBlockedByThem } = useBlockCheck(currentUserId, partnerId);

  // Auto-close chat if blocked
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

  // Track Latin input separately to avoid double conversion
  const lastLatinInputRef = useRef<string>('');
  const isConvertingRef = useRef(false);

  // Real-time transliteration: Convert typing to native language (ONCE only)
  useEffect(() => {
    // Skip if no conversion needed or empty input
    if (!needsNativeConversion || !newMessage.trim()) {
      setDisplayMessage(newMessage);
      lastLatinInputRef.current = '';
      return;
    }

    // Skip if already in native script (not Latin) - prevents double conversion
    if (!isLatinScript(newMessage)) {
      setDisplayMessage(newMessage);
      return;
    }

    // Skip if we're currently converting (prevents re-entry)
    if (isConvertingRef.current) {
      return;
    }

    // Skip if this is the same input we already processed
    if (lastLatinInputRef.current === newMessage) {
      return;
    }

    // Debounce the conversion
    if (transliterationTimeoutRef.current) {
      clearTimeout(transliterationTimeoutRef.current);
    }

    setIsConverting(true);
    transliterationTimeoutRef.current = setTimeout(async () => {
      // Double-check we're still dealing with Latin input
      if (!isLatinScript(newMessage)) {
        setIsConverting(false);
        return;
      }

      try {
        isConvertingRef.current = true;
        lastLatinInputRef.current = newMessage; // Mark this input as processed
        
        // Use convertToNative for non-Latin languages
        const result = await convertToNative(newMessage, currentUserLanguage);
        
        if (result.isTranslated && result.text && result.text !== newMessage) {
          setDisplayMessage(result.text);
          setNewMessage(result.text); // Update input with native script
        }
      } catch (error) {
        console.error('Transliteration error:', error);
      } finally {
        setIsConverting(false);
        isConvertingRef.current = false;
      }
    }, 500); // 500ms debounce

    return () => {
      if (transliterationTimeoutRef.current) {
        clearTimeout(transliterationTimeoutRef.current);
      }
    };
  }, [newMessage, needsNativeConversion, currentUserLanguage, isLatinScript, convertToNative]);

  // Load initial data (wallet, earnings, pricing)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load pricing
        const { data: pricing } = await supabase
          .from("chat_pricing")
          .select("rate_per_minute, women_earning_rate")
          .eq("is_active", true)
          .maybeSingle();
        
        if (pricing) {
          setEarningRate(pricing.women_earning_rate || ratePerMinute * 0.5);
        }

        if (userGender === "male") {
          // Load wallet balance for men
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", currentUserId)
            .maybeSingle();
          
          if (wallet) {
            setWalletBalance(wallet.balance);
          }
        } else {
          // Load today's earnings for women
          const today = new Date().toISOString().split("T")[0];
          const { data: earnings } = await supabase
            .from("women_earnings")
            .select("amount")
            .eq("user_id", currentUserId)
            .gte("created_at", `${today}T00:00:00`);
          
          const total = earnings?.reduce((acc, e) => acc + Number(e.amount), 0) || 0;
          setTodayEarnings(total);
        }

        // Start chat session if not already started
        if (!sessionStartedRef.current) {
          sessionStartedRef.current = true;
          toast({
            title: "Chat Started",
            description: userGender === "male" 
              ? `You're being charged ₹${pricing?.rate_per_minute || ratePerMinute}/min`
              : `You'll earn ₹${pricing?.women_earning_rate || earningRate}/min`,
          });
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    loadInitialData();
  }, [currentUserId, userGender, ratePerMinute]);

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

  // Inactivity check with warning - auto disconnect after 3 mins of no activity
  useEffect(() => {
    if (!billingStarted) return;

    // Update warning every second
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
        title: "Chat Disconnected",
        description: "No activity for 3 minutes. Chat ended automatically.",
      });
      
      // Auto-close the chat session
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

  // Auto-translate a message to current user's language using dl-translate
  // Skip translation entirely if both users have the same native language
  const translateMessage = useCallback(async (text: string, senderId: string): Promise<{
    translatedMessage?: string;
    isTranslated?: boolean;
    detectedLanguage?: string;
  }> => {
    // Same language - no translation needed, just display native language
    const senderLang = senderId === currentUserId ? currentUserLanguage : partnerLanguage;
    const receiverLang = senderId === currentUserId ? partnerLanguage : currentUserLanguage;
    
    if (isSameLanguage(senderLang, receiverLang)) {
      // Same native language - display as-is
      return { translatedMessage: text, isTranslated: false };
    }
    
    try {
      // Different languages - use translateForChat
      const result = await translateForChat(text, { senderLanguage: partnerLanguage, receiverLanguage: currentUserLanguage });
      return {
        translatedMessage: result.text,
        isTranslated: result.isTranslated,
        detectedLanguage: result.source
      };
    } catch (error) {
      console.error('[MiniChatWindow] Translation error:', error);
      return { translatedMessage: text, isTranslated: false };
    }
  }, [partnerLanguage, currentUserLanguage, currentUserId, isSameLanguage, translateForChat]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) {
      // Translate ALL messages to current user's language
      const translatedMessages = await Promise.all(
        data.map(async (m) => {
          // Translate to current user's language (pass sender_id to check if same language)
          const translation = await translateMessage(m.message, m.sender_id);
          return {
            id: m.id,
            senderId: m.sender_id,
            message: m.message, // Original message (in sender's language)
            translatedMessage: translation.translatedMessage, // In current user's language
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
    // Unique channel per chat session for scalability (supports lakhs of users)
    const channel = supabase
      .channel(`realtime-chat:${chatId}`, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts
          presence: { key: currentUserId } // Track presence per user
        }
      })
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
          
          // Skip if message is from current user (already added locally)
          if (newMsg.sender_id === currentUserId) {
            return;
          }
          
          // Translate message for receiver's language (server-side translation)
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

          // Partner sent a message - update activity time
          setLastActivityTime(Date.now());

          // Update unread count if minimized
          if (isMinimized) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[RealTime] Subscribed to chat: ${chatId}`);
        }
      });

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
      try {
        await supabase.functions.invoke("chat-manager", {
          body: { action: "heartbeat", chat_id: chatId }
        });
      } catch (error) {
        console.error("Heartbeat error:", error);
      }
    }, 60000);
  };

  const handleTyping = () => {
    setLastActivityTime(Date.now());
    // Send typing indicator with translation
    if (newMessage.trim()) {
      sendTypingIndicator(newMessage.trim(), partnerLanguage);
    }
  };

  // Security: Maximum message length to prevent abuse
  const MAX_MESSAGE_LENGTH = 2000;

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    
    // SECURITY: Validate message length to prevent database abuse
    if (messageText.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Messages must be under ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive"
      });
      return;
    }

    // SECURITY: Basic content validation - reject empty or only whitespace
    if (messageText.length === 0) {
      return;
    }

    setNewMessage("");
    stopTyping(); // Stop typing indicator on send
    setIsSending(true);
    setLastActivityTime(Date.now());

    try {
      // Store message as-is - translation happens on receiver's end automatically
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
    // Maximize the window instead of navigating - chat stays in parallel container
    setIsMinimized(false);
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
  const estimatedEarning = billingStarted ? totalEarned + ((elapsedSeconds / 60) * (ratePerMinute * 0.5)) : 0;

  return (
    <Card 
      className={cn(
        "flex flex-col shadow-xl border-2 transition-all duration-200",
        isMinimized ? "w-56 h-12" : `${windowWidthClass} h-80`,
        isPartnerOnline ? "border-primary/30" : "border-muted"
      )}
    >
      {/* Inactivity Warning Bar */}
      {inactiveWarning && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive text-[9px]">
          <AlertTriangle className="h-2.5 w-2.5" />
          <span>{inactiveWarning}</span>
        </div>
      )}
      
      {/* Header */}
      <div 
        className="flex items-center justify-between p-2 bg-gradient-to-r from-primary/10 to-transparent border-b cursor-pointer"
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
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium truncate">{partnerName}</p>
              {/* Partner's language badge */}
              <Badge variant="secondary" className="h-3.5 text-[8px] px-1 bg-primary/10 text-primary">
                {partnerLanguage}
              </Badge>
              {/* Wallet/Earnings badge */}
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
                {userGender === "male" ? `₹${ratePerMinute}/min - Type to start` : `Earn ₹${earningRate}/min`}
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
          {/* Gift Button - only men can send */}
          {userGender === "male" && (
            <GiftSendButton
              senderId={currentUserId}
              receiverId={partnerId}
              receiverName={partnerName}
              disabled={!billingStarted}
            />
          )}
          {/* Relationship Actions (Block/Friend) */}
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
                    {/* Display message in user's native language - translation is invisible */}
                    {msg.translatedMessage || msg.message}
                  </div>
                </div>
              ))}
              
              {/* Real-time typing indicator with translation */}
              {partnerTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <TranslatedTypingIndicator
                      indicator={partnerTyping}
                      partnerName={partnerName}
                      className="text-[11px] p-1.5"
                    />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area - with real-time native script conversion */}
          <div className="p-1.5 border-t">
            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <Input
                  placeholder={needsNativeConversion ? "Type in English..." : "Type your message..."}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={handleKeyPress}
                  className="h-7 text-[11px] pr-6"
                  disabled={isSending}
                />
                {isConverting && (
                  <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
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

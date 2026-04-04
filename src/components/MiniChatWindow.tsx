import { classifyError, ERROR_MESSAGES } from "@/lib/errors";
import { translateChatMessage, getEnglishTranslation, translateForViewer, translateText, isLatinScript, isLatinScriptLanguage } from "@/lib/translation-service";
import { moderateMessage } from '@/lib/content-moderation';
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
  AlertTriangle,
  MoreHorizontal
} from "lucide-react";
import { ChatRelationshipActions } from "@/components/ChatRelationshipActions";
import { GiftSendButton } from "@/components/GiftSendButton";
import { useBlockCheck } from "@/hooks/useBlockCheck";

const BILLING_PAUSE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes - pause billing
const BILLING_WARNING_MS = 2 * 60 * 1000; // 2 minutes - show billing pause warning
const LOGOUT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes - close chat and logout

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  englishText?: string;
  isTranslated?: boolean;
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
  currentUserName?: string;
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
  currentUserName,
  userGender,
  ratePerMinute,
  onClose,
  windowWidthClass = "w-72"
}: MiniChatWindowProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [areButtonsExpanded, setAreButtonsExpanded] = useState(false);
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
  
  const [translatedPlaceholder, setTranslatedPlaceholder] = useState("Type a message...");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const billingPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef(false);
  const billingStartedRef = useRef(false);
  
  const [isBillingPaused, setIsBillingPaused] = useState(false);
  const [lastUserMessageTime, setLastUserMessageTime] = useState<number>(Date.now());
  const [lastPartnerMessageTime, setLastPartnerMessageTime] = useState<number>(Date.now());

  const { isBlocked, isBlockedByThem } = useBlockCheck(currentUserId, partnerId);

  const blockMountedRef = useRef(false);
  useEffect(() => {
    if (!blockMountedRef.current) {
      blockMountedRef.current = true;
      return;
    }
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

  const langNorm = (currentUserLanguage || 'english').toLowerCase().trim();
  const isNonEnglish = langNorm !== 'english';

  // CHT-07 FIX: Translate placeholder dynamically
  useEffect(() => {
    if (!isNonEnglish) { setTranslatedPlaceholder("Type a message..."); return; }
    let cancelled = false;
    translateText('Type a message...', 'English', currentUserLanguage).then(result => {
      if (!cancelled && result) setTranslatedPlaceholder(result);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [currentUserLanguage, isNonEnglish]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const { data: pricing } = await supabase
          .from("chat_pricing")
          .select("rate_per_minute, women_earning_rate")
          .eq("is_active", true)
          .maybeSingle();
        
        if (pricing) {
          setEarningRate(pricing.women_earning_rate || ratePerMinute * 0.5);
        }

        if (userGender === "male") {
          const { data: wallet } = await supabase
            .from("users_wallet")
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
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast({ title: "Chat unavailable", description: ERROR_MESSAGES.chat.loadFailed, variant: "destructive" });
      }
    };

    loadInitialData();
  }, [currentUserId, userGender, ratePerMinute]);

  useEffect(() => {
    loadMessages();
    const unsubscribe = subscribeToMessages();

    // Subscribe to session status changes - auto-close when partner ends chat
    const sessionChannel = supabase
      .channel(`session-status-mini-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_chat_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload: any) => {
          const session = payload.new;
          if (session.status === 'ended') {
            let message = "Chat session ended";
            if (session.end_reason === 'user_closed' || session.end_reason === 'user_ended' || session.end_reason === 'man_closed' || session.end_reason === 'woman_closed') {
              message = `${partnerName} ended the chat`;
            } else if (session.end_reason === 'inactivity_timeout') {
              message = "Chat ended due to inactivity";
            } else if (session.end_reason === 'insufficient_balance') {
              message = "Chat ended - insufficient balance";
            } else if (session.end_reason === 'user_blocked') {
              message = "Chat ended - user blocked";
            } else if (session.end_reason === 'auto_timeout') {
              message = "Chat request expired - no response";
            }
            toast({
              title: "Chat Disconnected",
              description: message + ". You are now available for new chats.",
            });
            onClose();
          }
        }
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (billingPauseTimeoutRef.current) clearTimeout(billingPauseTimeoutRef.current);
      unsubscribe?.();
      supabase.removeChannel(sessionChannel);
    };
  }, [chatId, sessionId]);

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  useEffect(() => {
    const hasSentMessage = messages.some(m => m.senderId === currentUserId);
    const hasReceivedMessage = messages.some(m => m.senderId !== currentUserId);
    if (hasSentMessage && hasReceivedMessage && !billingStartedRef.current) {
      billingStartedRef.current = true;
      setBillingStarted(true);
      setLastActivityTime(Date.now());
      startBilling();
    }
  }, [messages, currentUserId]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId === currentUserId) {
        setLastUserMessageTime(Date.now());
      } else {
        setLastPartnerMessageTime(Date.now());
      }
    }
  }, [messages, currentUserId]);

  useEffect(() => {
    if (isBillingPaused && billingStarted) {
      const now = Date.now();
      const userRepliedAfterPause = lastUserMessageTime > (lastActivityTime + BILLING_PAUSE_TIMEOUT_MS - 30000);
      const partnerRepliedAfterPause = lastPartnerMessageTime > (lastActivityTime + BILLING_PAUSE_TIMEOUT_MS - 30000);
      
      if (userRepliedAfterPause && partnerRepliedAfterPause) {
        setIsBillingPaused(false);
        setLastActivityTime(now);
        startBilling();
        toast({
          title: "Billing Resumed",
          description: "Both users are active again. Charging/earning resumed.",
        });
      }
    }
  }, [lastUserMessageTime, lastPartnerMessageTime, isBillingPaused, billingStarted, lastActivityTime]);

  useEffect(() => {
    if (!billingStarted) return;

    const warningInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      
      if (!isBillingPaused && timeSinceActivity >= BILLING_WARNING_MS && timeSinceActivity < BILLING_PAUSE_TIMEOUT_MS) {
        const remainingSecs = Math.ceil((BILLING_PAUSE_TIMEOUT_MS - timeSinceActivity) / 1000);
        setInactiveWarning(`Billing pauses in ${remainingSecs}s`);
      } 
      else if (isBillingPaused && timeSinceActivity < LOGOUT_TIMEOUT_MS) {
        const remainingMins = Math.ceil((LOGOUT_TIMEOUT_MS - timeSinceActivity) / 60000);
        setInactiveWarning(`Billing paused. Logout in ${remainingMins}m if no activity`);
      } else if (!isBillingPaused) {
        setInactiveWarning(null);
      }
    }, 1000);

    if (billingPauseTimeoutRef.current) {
      clearTimeout(billingPauseTimeoutRef.current);
    }

    if (!isBillingPaused) {
      billingPauseTimeoutRef.current = setTimeout(() => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        
        setIsBillingPaused(true);
        toast({
          title: "Billing Paused",
          description: "No activity for 3 minutes. Charging/earning stopped. Chat remains open.",
        });
      }, BILLING_PAUSE_TIMEOUT_MS);
    }

    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }

    logoutTimeoutRef.current = setTimeout(async () => {
      toast({
        title: "Session Ended",
        description: "No activity for 15 minutes. Logging out...",
      });
      
      try {
        await supabase
          .from("active_chat_sessions")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            end_reason: "inactivity_logout"
          })
          .eq("id", sessionId);
        
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Error during inactivity logout:", error);
      }
      
      onClose();
    }, LOGOUT_TIMEOUT_MS);

    return () => {
      clearInterval(warningInterval);
      if (billingPauseTimeoutRef.current) clearTimeout(billingPauseTimeoutRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
    };
  }, [lastActivityTime, billingStarted, sessionId, onClose, isBillingPaused]);

  // Translate history messages in background using live Lingva translation
  const translateHistoryMessages = useCallback(async (msgs: Message[], viewerLanguage: string) => {
    const batchSize = 5;
    for (let i = 0; i < msgs.length; i += batchSize) {
      const batch = msgs.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (msg) => {
          try {
            const result = await translateForViewer(msg.message, viewerLanguage);
            return {
              id: msg.id,
              translatedMessage: result.nativeText,
              englishText: result.englishText,
              isTranslated: result.nativeText !== msg.message,
            };
          } catch {
            return null;
          }
        })
      );

      setMessages(prev => prev.map(m => {
        const translation = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value)
          .find(r => r && r.id === m.id);
        if (translation) {
          return { ...m, ...translation };
        }
        return m;
      }));
    }
  }, []);


  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) {
      const formattedMessages: Message[] = data.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        message: m.message,
        createdAt: m.created_at
      }));
      setMessages(formattedMessages);

      // Always translate history messages for native display + English subtitles
      const langToUse = currentUserLanguage || 'English';
      translateHistoryMessages(formattedMessages, langToUse);
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
          const isPartnerMessage = newMsg.sender_id !== currentUserId;
          
          // Translate incoming partner messages
          let translatedMessage: string | undefined;
          let englishText: string | undefined;
          let isTranslated = false;

          const langToUse = currentUserLanguage || 'English';
          try {
            const result = await translateForViewer(newMsg.message, langToUse);
            translatedMessage = result.nativeText;
            isTranslated = result.nativeText !== newMsg.message;
            englishText = result.englishText;
          } catch {
            // Fallback: try to at least get English subtitle
            try {
              englishText = await getEnglishTranslation(newMsg.message, 'auto');
            } catch { /* final fallback: no subtitle */ }
          }
          
          setMessages(prev => {
            const existingRealIndex = prev.findIndex(m => m.id === newMsg.id);
            if (existingRealIndex >= 0) return prev;
            
            const filtered = prev.filter(m => 
              !(m.id.startsWith('temp-') && m.senderId === newMsg.sender_id && 
                Math.abs(new Date(m.createdAt).getTime() - new Date(newMsg.created_at).getTime()) < 5000)
            );
            
            return [...filtered, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              message: newMsg.message,
              translatedMessage,
              englishText,
              isTranslated,
              createdAt: newMsg.created_at
            }];
          });

          if (isMinimized && isPartnerMessage) {
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
    // Clear any existing intervals to prevent orphaned timers on resume
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

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

  const MAX_MESSAGE_LENGTH = 2000;

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true); // CHT-03 FIX: prevent double-send

    const messageText = newMessage.trim();
    
    if (messageText.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Messages must be under ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive"
      });
      return;
    }

    // Content moderation - block phone numbers, emails, social media
    const moderationResult = moderateMessage(messageText);
    if (moderationResult.isBlocked) {
      toast({
        title: "Message Blocked",
        description: moderationResult.reason,
        variant: "destructive"
      });
      return;
    }

    if (messageText.length === 0) {
      return;
    }

    setNewMessage("");
    setLastActivityTime(Date.now());

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      message: messageText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // Translate optimistic message for sender's own view (native script + English subtitle)
    const senderLang = currentUserLanguage || 'English';
    translateForViewer(messageText, senderLang).then(result => {
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { 
          ...m, 
          translatedMessage: result.nativeText,
          englishText: result.englishText,
          isTranslated: result.nativeText !== messageText 
        } : m
      ));
    }).catch(() => {
      // For English speakers or on failure, still get English translation for subtitle
      getEnglishTranslation(messageText, 'auto').then(eng => {
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, englishText: eng } : m
        ));
      }).catch(() => { /* fallback: show original */ });
    });

    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: messageText
        });

      if (error) {
        console.error("Error sending message:", error);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false); // CHT-03 FIX: always reset
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
    setIsMinimized(false);
  };

  const handleClose = async () => {
    // Stop billing timers immediately
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    
    try {
      // Call chat-manager end_chat for proper final billing and cleanup
      await supabase.functions.invoke("chat-manager", {
        body: { 
          action: "end_chat", 
          chat_id: chatId, 
          end_reason: userGender === "male" ? "man_closed" : "woman_closed",
          user_id: currentUserId
        }
      });
    } catch (error) {
      console.error("Error closing chat via chat-manager:", error);
      toast({ title: "Chat not closed", description: "Unable to close this chat session properly.", variant: "destructive" });
      // Fallback: directly update session
      try {
        await supabase
          .from("active_chat_sessions")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            end_reason: userGender === "male" ? "man_closed" : "woman_closed"
          })
          .eq("id", sessionId);
      } catch (fallbackError) {
        console.error("Fallback close also failed:", fallbackError);
      }
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const estimatedCost = billingStarted ? (elapsedSeconds / 60) * ratePerMinute : 0;
  const estimatedEarning = billingStarted ? totalEarned + ((elapsedSeconds / 60) * earningRate) : 0;

  return (
    <Card 
      className={cn(
        "flex flex-col shadow-xl border-2 transition-all duration-200",
        isMinimized ? "w-56 h-12" : `${windowWidthClass} h-80`,
        isPartnerOnline ? "border-primary/30" : "border-muted"
      )}
    >
      {inactiveWarning && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive text-[9px]">
          <AlertTriangle className="h-2.5 w-2.5" />
          <span>{inactiveWarning}</span>
        </div>
      )}
      
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
              </div>
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
            onClick={(e) => { e.stopPropagation(); setAreButtonsExpanded(!areButtonsExpanded); }}
            title={areButtonsExpanded ? "Hide actions" : "Show actions"}
          >
            <MoreHorizontal className="h-2.5 w-2.5" />
          </Button>
          
          {areButtonsExpanded && (
            <>
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
                onClick={(e) => { e.stopPropagation(); openFullChat(); }}
                title="Open full chat"
              >
                <Maximize2 className="h-2.5 w-2.5" />
              </Button>
            </>
          )}
          
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
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleClose();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1.5">
              {messages.length === 0 && (
                <p className="text-center text-[10px] text-muted-foreground py-4">
                  Say hi to start!
                </p>
              )}
              {messages.map((msg) => {
                const isOwn = msg.senderId === currentUserId;
                const senderName = isOwn ? (currentUserName || "You") : partnerName;
                const senderLang = isOwn ? currentUserLanguage : partnerLanguage;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col",
                      isOwn ? "items-end" : "items-start"
                    )}
                  >
                    {/* Sender/Receiver name with distinct colors */}
                    <span className={cn(
                      "text-[9px] font-semibold mb-0.5 px-1",
                      isOwn
                        ? "text-primary"
                        : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {senderName}
                      {senderLang && <span className="text-muted-foreground/60 font-normal"> • {senderLang}</span>}
                    </span>
                    <div
                      className={cn(
                        "max-w-[85%] px-2 py-1 rounded-xl text-[11px] shadow-sm border",
                        isOwn
                          ? "bg-primary/5 border-primary/20 rounded-br-sm"
                          : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 rounded-bl-sm"
                      )}
                    >
                      <p className={cn(
                        "unicode-text",
                        isOwn
                          ? "text-primary dark:text-primary"
                          : "text-emerald-800 dark:text-emerald-200"
                      )} dir="auto">
                        {msg.translatedMessage ? msg.translatedMessage : msg.message}
                      </p>
                      {/* English subtitle below every bubble */}
                      {msg.englishText && msg.englishText.toLowerCase() !== (msg.translatedMessage || msg.message).toLowerCase() && (
                        <p className="text-[9px] text-muted-foreground/60 italic mt-0.5" dir="ltr">
                          english: {msg.englishText.toLowerCase()}
                        </p>
                      )}
                      <span className="text-[8px] text-muted-foreground/50 block mt-0.5">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          

          <div className="p-1.5 border-t">
            <div className="flex items-center gap-1">
              <Input
                placeholder={translatedPlaceholder}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  setLastActivityTime(Date.now());
                }}
                onKeyDown={handleKeyPress}
                dir="auto"
                spellCheck={true}
                autoComplete="off"
                autoCorrect="on"
                className="h-7 text-[11px] unicode-text"
              />
              <Button
                size="icon"
                className="h-7 w-7"
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default MiniChatWindow;

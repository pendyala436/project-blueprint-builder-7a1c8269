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
import { useRealtimeTranslation } from "@/lib/translation";
import { TranslatedTypingIndicator } from "@/components/TranslatedTypingIndicator";
// Translation utilities
import { 
  transliterateToNative,
  isSameLanguage,
  isLatinText,
  isLatinScriptLanguage,
  isReady as isTranslatorReady,
  initWorker,
  normalizeUnicode,
  spellCorrectForChat,
} from "@/lib/translation";
import { translateAsync } from "@/lib/translation/async-translator";

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes - auto disconnect per feature requirement
const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes - show warning

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  isTranslated?: boolean;
  isTranslating?: boolean;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized by default
  const [areButtonsExpanded, setAreButtonsExpanded] = useState(false); // Buttons minimized by default
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef(false);
  // Check if translation is needed
  const needsTranslation = !isSameLanguage(currentUserLanguage, partnerLanguage);
  // User's language uses Latin script natively (English, Spanish, French, etc.)
  const userUsesLatinScript = isLatinScriptLanguage(currentUserLanguage);

  // Background task queue for non-blocking operations
  const backgroundTasksRef = useRef<Set<Promise<void>>>(new Set());
  const runInBackground = useCallback((task: () => Promise<void>) => {
    const promise = task().finally(() => {
      backgroundTasksRef.current.delete(promise);
    });
    backgroundTasksRef.current.add(promise);
  }, []);

  // Real-time typing indicator with translation - FULLY ASYNC
  const {
    sendTypingIndicator,
    clearPreview,
    senderNativePreview,
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

  // Initialize translation worker and load messages
  useEffect(() => {
    const init = async () => {
      // Translation is always ready now (embedded, no model loading)
      if (!isTranslatorReady()) {
        console.log('[MiniChatWindow] Initializing translation...');
        await initWorker();
      }
      console.log('[MiniChatWindow] Translation ready, loading messages');
      console.log('[MiniChatWindow] Languages - Current:', currentUserLanguage, 'Partner:', partnerLanguage);
      loadMessages();
    };
    
    init();
    const unsubscribe = subscribeToMessages();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      unsubscribe?.();
    };
  }, [chatId, currentUserLanguage, partnerLanguage]);

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

  // Auto-translate a message to current user's language via Edge Function
  const translateMessage = useCallback(async (text: string, senderId: string): Promise<{
    translatedMessage?: string;
    isTranslated?: boolean;
    detectedLanguage?: string;
  }> => {
    try {
      // Only process messages from the partner - sender sees their own message as-is
      if (senderId === currentUserId) {
        return { translatedMessage: text, isTranslated: false };
      }

      // Detect the actual script/language of the incoming message
      const messageIsLatin = isLatinText(text);
      
      // Determine actual source language based on message script
      // If message is in non-Latin script (e.g., Telugu తెలుగు), use partner's language
      // If message is in Latin, check if it might be English or transliterated partner language
      const actualSourceLanguage = messageIsLatin ? 'english' : partnerLanguage;
      
      console.log('[MiniChatWindow] translateMessage:', {
        text: text.substring(0, 30),
        messageIsLatin,
        actualSourceLanguage,
        partnerLanguage,
        currentUserLanguage
      });
      
      // Check if same language (after determining actual source)
      const sameLanguage = isSameLanguage(actualSourceLanguage, currentUserLanguage);
      
      // Apply spell correction to Latin text only BEFORE processing
      const correctedText = messageIsLatin ? spellCorrectForChat(text, 'english') : text;
      
      let finalText = correctedText;
      let wasTranslated = false;
      
      if (sameLanguage) {
        // Same language - just convert to native script if needed
        if (!isLatinScriptLanguage(currentUserLanguage) && messageIsLatin) {
          finalText = transliterateToNative(correctedText, currentUserLanguage);
        }
      } else {
        // Different languages - translate via Edge Function
        // IMPORTANT: Use actualSourceLanguage (detected from message) not partnerLanguage
        console.log(`[MiniChatWindow] Translating: ${actualSourceLanguage} -> ${currentUserLanguage}`);
        const result = await translateAsync(correctedText, actualSourceLanguage, currentUserLanguage);
        
        if (result.isTranslated && result.text) {
          finalText = result.text;
          wasTranslated = true;
          console.log('[MiniChatWindow] Translation result:', result.text.substring(0, 50));
        } else {
          console.log('[MiniChatWindow] Translation not applied, using original');
        }
        
        // Convert to native script if needed (only if result is Latin)
        if (!isLatinScriptLanguage(currentUserLanguage) && isLatinText(finalText)) {
          const nativeScript = transliterateToNative(finalText, currentUserLanguage);
          if (nativeScript && nativeScript !== finalText) {
            finalText = nativeScript;
          }
        }
      }

      return {
        translatedMessage: normalizeUnicode(finalText),
        isTranslated: wasTranslated || finalText !== text,
        detectedLanguage: actualSourceLanguage
      };
    } catch (error) {
      console.error('[MiniChatWindow] Translation error:', error);
      return { translatedMessage: text, isTranslated: false };
    }
  }, [partnerLanguage, currentUserLanguage, currentUserId]);

  // NON-BLOCKING: Load messages with background translation
  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) {
      // IMMEDIATE: Show messages first without translation
      const initialMessages = data.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        message: m.message,
        translatedMessage: undefined, // Will be filled by background task
        isTranslated: false,
        detectedLanguage: undefined,
        createdAt: m.created_at
      }));
      setMessages(initialMessages);

      // BACKGROUND: Translate all messages without blocking UI
      runInBackground(async () => {
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
      });
    }
  };

  // NON-BLOCKING: Subscribe to new messages with background translation
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
        (payload: any) => {
          const newMsg = payload.new;
          
          // IMMEDIATE: Replace temp message or add new one (non-blocking)
          // Mark partner messages as "translating" initially
          const isPartnerMessage = newMsg.sender_id !== currentUserId;
          const needsTranslationCheck = isPartnerMessage && needsTranslation;
          
          setMessages(prev => {
            // Check if this message already exists (real or temp)
            const existingRealIndex = prev.findIndex(m => m.id === newMsg.id);
            if (existingRealIndex >= 0) return prev;
            
            // Remove any temp messages from same sender (our optimistic messages)
            // and add the real message
            const filtered = prev.filter(m => 
              !(m.id.startsWith('temp-') && m.senderId === newMsg.sender_id && 
                Math.abs(new Date(m.createdAt).getTime() - new Date(newMsg.created_at).getTime()) < 5000)
            );
            
            return [...filtered, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              message: newMsg.message,
              translatedMessage: undefined, // Will be filled by background
              isTranslated: false,
              isTranslating: needsTranslationCheck, // Show loading for partner messages
              detectedLanguage: undefined,
              createdAt: newMsg.created_at
            }];
          });

          // Partner sent a message - update activity time
          if (isPartnerMessage) {
            setLastActivityTime(Date.now());
          }

          // Update unread count if minimized
          if (isMinimized && isPartnerMessage) {
            setUnreadCount(prev => prev + 1);
          }

          // BACKGROUND: Translate message without blocking
          runInBackground(async () => {
            const translation = await translateMessage(newMsg.message, newMsg.sender_id);
            setMessages(prev => prev.map(m => 
              m.id === newMsg.id 
                ? {
                    ...m,
                    translatedMessage: translation.translatedMessage,
                    isTranslated: translation.isTranslated,
                    isTranslating: false, // Translation complete
                    detectedLanguage: translation.detectedLanguage
                  }
                : m
            ));
          });
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

  // NON-BLOCKING: Send message with optimistic UI
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

    // IMMEDIATE: Clear input and update UI (non-blocking)
    setNewMessage("");
    clearPreview(); // Clear typing preview
    setLastActivityTime(Date.now());

    // GBOARD-FIRST: User types in native script directly via Gboard
    // No Latin-to-native conversion - just send what user typed

    // OPTIMISTIC: Add message to UI immediately with temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      message: messageText, // Show exactly what user typed
      translatedMessage: undefined,
      isTranslated: false,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // BACKGROUND: Send message without blocking UI
    runInBackground(async () => {
      try {
        console.log('[MiniChatWindow] Sending:', messageText.substring(0, 30));
        
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
      }
    });
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
          {/* Toggle button to show/hide action buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); setAreButtonsExpanded(!areButtonsExpanded); }}
            title={areButtonsExpanded ? "Hide actions" : "Show actions"}
          >
            <MoreHorizontal className="h-2.5 w-2.5" />
          </Button>
          
          {/* Expandable action buttons */}
          {areButtonsExpanded && (
            <>
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
                title="Open full chat"
              >
                <Maximize2 className="h-2.5 w-2.5" />
              </Button>
            </>
          )}
          
          {/* Always visible: minimize/maximize and close */}
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
                    {/* 
                      For YOUR OWN messages: always show what you typed (in your native script)
                      For PARTNER messages: show translated version in your native language
                      Priority: translatedMessage > message (always prefer translated)
                    */}
                    {msg.senderId === currentUserId ? (
                      // Own message - show in sender's native script
                      <p>{msg.message}</p>
                    ) : msg.isTranslating ? (
                      // Partner message being translated - show with loading indicator
                      <div className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="opacity-70 italic">{msg.message}</span>
                      </div>
                    ) : (
                      // Partner message - show translated version if available, else original
                      <p>{msg.translatedMessage || msg.message}</p>
                    )}
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

          {/* Input area - Gboard native input */}
          <div className="p-1.5 border-t space-y-1">
            {/* Same language indicator */}
            {!needsTranslation && newMessage.trim() && (
              <div className="px-2 py-0.5 bg-muted/50 rounded text-[9px] text-muted-foreground">
                Same language - direct chat
              </div>
            )}
            <div className="flex items-center gap-1">
              <Input
                placeholder={userUsesLatinScript ? "Type your message..." : "Type in your language..."}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyPress}
                className="h-7 text-[11px]"
              />
              <Button
                size="icon"
                className="h-7 w-7"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
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

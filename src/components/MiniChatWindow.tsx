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
import { useRealtimeChatTranslation } from "@/lib/translation";
import { TranslatedTypingIndicator } from "@/components/TranslatedTypingIndicator";
// Translation utilities - Gboard native input, no Latin conversion needed
import { 
  isSameLanguage,
  isLatinScriptLanguage,
  isReady as isTranslatorReady,
  initWorker,
  normalizeUnicode,
} from "@/lib/translation";
import { translateText as universalTranslate, isLatinText, isLatinScriptLanguage as isLatinLang } from "@/lib/translation/translate";
import { dynamicTransliterate } from "@/lib/translation/dynamic-transliterator";
import { useSpellCheck } from "@/hooks/useSpellCheck";

const BILLING_PAUSE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes - pause billing
const BILLING_WARNING_MS = 2 * 60 * 1000; // 2 minutes - show billing pause warning
const LOGOUT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes - close chat and logout

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
  const [rawInput, setRawInput] = useState(""); // What user types (Latin)
  const [newMessage, setNewMessage] = useState(""); // Display text (native script)
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
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const billingPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef(false);
  
  // State for billing pause and activity tracking
  const [isBillingPaused, setIsBillingPaused] = useState(false);
  const [lastUserMessageTime, setLastUserMessageTime] = useState<number>(Date.now());
  const [lastPartnerMessageTime, setLastPartnerMessageTime] = useState<number>(Date.now());
  // Check if translation is needed
  const needsTranslation = !isSameLanguage(currentUserLanguage, partnerLanguage);
  // User's language uses Latin script natively (English, Spanish, French, etc.)
  const userUsesLatinScript = isLatinScriptLanguage(currentUserLanguage);
  // Check if phonetic transliteration is needed (for non-Latin script languages like Telugu)
  const needsTransliteration = !userUsesLatinScript;

  // AI-powered spell check for 900+ languages
  const { 
    isChecking: isSpellChecking, 
    lastSuggestion, 
    checkSpellingDebounced,
    acceptSuggestion,
    dismissSuggestion 
  } = useSpellCheck({ 
    language: currentUserLanguage, 
    enabled: needsTransliteration,
    debounceMs: 800 
  });

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
    getLivePreview,
    processMessage,
  } = useRealtimeChatTranslation(currentUserLanguage, partnerLanguage);
  
  const [senderNativePreview, setSenderNativePreview] = useState('');
  const [partnerTyping, setPartnerTyping] = useState<any>(null);
  
  const sendTypingIndicator = useCallback((text: string) => {
    const preview = getLivePreview(text, currentUserLanguage);
    setSenderNativePreview(preview.preview);
  }, [getLivePreview, currentUserLanguage]);
  
  const clearPreview = useCallback(() => {
    setSenderNativePreview('');
  }, []);

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
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (billingPauseTimeoutRef.current) clearTimeout(billingPauseTimeoutRef.current);
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


  // Track when both users reply to resume billing
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

  // Resume billing when BOTH users have replied after pause
  useEffect(() => {
    if (isBillingPaused && billingStarted) {
      // Check if both users have replied after the pause started
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

  // Inactivity check - pause billing at 3 mins, logout at 15 mins
  useEffect(() => {
    if (!billingStarted) return;

    // Update warning every second
    const warningInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      
      // Show billing pause warning between 2-3 mins
      if (!isBillingPaused && timeSinceActivity >= BILLING_WARNING_MS && timeSinceActivity < BILLING_PAUSE_TIMEOUT_MS) {
        const remainingSecs = Math.ceil((BILLING_PAUSE_TIMEOUT_MS - timeSinceActivity) / 1000);
        setInactiveWarning(`Billing pauses in ${remainingSecs}s`);
      } 
      // Show logout warning after billing paused (between 3-15 mins)
      else if (isBillingPaused && timeSinceActivity < LOGOUT_TIMEOUT_MS) {
        const remainingMins = Math.ceil((LOGOUT_TIMEOUT_MS - timeSinceActivity) / 60000);
        setInactiveWarning(`Billing paused. Logout in ${remainingMins}m if no activity`);
      } else if (!isBillingPaused) {
        setInactiveWarning(null);
      }
    }, 1000);

    // Billing pause timeout (3 minutes)
    if (billingPauseTimeoutRef.current) {
      clearTimeout(billingPauseTimeoutRef.current);
    }

    if (!isBillingPaused) {
      billingPauseTimeoutRef.current = setTimeout(() => {
        // Pause billing - stop timer but DON'T close chat
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

    // Logout timeout (15 minutes)
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }

    logoutTimeoutRef.current = setTimeout(async () => {
      toast({
        title: "Session Ended",
        description: "No activity for 15 minutes. Logging out...",
      });
      
      // Close chat and logout
      try {
        await supabase
          .from("active_chat_sessions")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            end_reason: "inactivity_logout"
          })
          .eq("id", sessionId);
        
        // Logout user
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

  // Auto-translate a message to current user's language via Edge Function
  // GBOARD-FIRST: Users type in their mother tongue, so use profile language
  const translateMessage = useCallback(async (text: string, senderId: string): Promise<{
    translatedMessage?: string;
    isTranslated?: boolean;
    detectedLanguage?: string;
  }> => {
    try {
      // Own messages - sender sees their own message as-is
      if (senderId === currentUserId) {
        return { translatedMessage: text, isTranslated: false };
      }

      // Partner's message - translate to current user's language
      // Source = partner's mother tongue (from profile)
      // Target = current user's mother tongue (from profile)
      const sourceLanguage = partnerLanguage; // Partner typed in their mother tongue via Gboard
      const targetLanguage = currentUserLanguage;
      
      console.log('[MiniChatWindow] translateMessage:', {
        text: text.substring(0, 30),
        sourceLanguage,
        targetLanguage
      });
      
      // Same language - no translation needed
      const sameLanguage = isSameLanguage(sourceLanguage, targetLanguage);
      
      if (sameLanguage) {
        console.log('[MiniChatWindow] Same language, no translation needed');
        return { translatedMessage: text, isTranslated: false, detectedLanguage: sourceLanguage };
      }
      
      // Target is English - no translation needed (English is universal)
      if (isSameLanguage(targetLanguage, 'English')) {
        console.log('[MiniChatWindow] Target is English, no translation needed');
        return { translatedMessage: text, isTranslated: false, detectedLanguage: sourceLanguage };
      }
      
      // Different languages - translate via Universal Translator
      console.log(`[MiniChatWindow] Translating via Universal Translator: ${sourceLanguage} -> ${targetLanguage}`);
      const result = await universalTranslate(text, sourceLanguage, targetLanguage);
      
      if (result.isTranslated && result.text) {
        console.log('[MiniChatWindow] Translation result:', result.text.substring(0, 50));
        return {
          translatedMessage: normalizeUnicode(result.text),
          isTranslated: true,
          detectedLanguage: sourceLanguage
        };
      }
      
      // Translation failed, return original
      console.log('[MiniChatWindow] Translation not applied, using original');
      return { translatedMessage: text, isTranslated: false, detectedLanguage: sourceLanguage };
      
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
      sendTypingIndicator(newMessage.trim());
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
    setRawInput("");
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
                {userGender === "male" ? `₹${ratePerMinute}/min - Type to start` : "Type to start earning"}
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
                    {/* Sender/Receiver name with language label */}
                    <p className={cn(
                      "text-[9px] font-medium mb-0.5",
                      msg.senderId === currentUserId
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}>
                      {msg.senderId === currentUserId 
                        ? `You (${needsTranslation ? currentUserLanguage : "Same language"})`
                        : `${partnerName} (${needsTranslation ? partnerLanguage : "Same language"})`
                      }
                    </p>
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

          {/* Input area - Phonetic transliteration for non-Latin languages */}
          <div className="p-1.5 border-t space-y-1">
            {/* Transliteration hint for non-Latin languages */}
            {needsTransliteration && (
              <div className="px-2 py-0.5 bg-primary/10 rounded text-[9px] text-primary flex items-center gap-1">
                <span>✨</span>
                <span>Type in English → shows in {currentUserLanguage}</span>
              </div>
            )}
            {/* Native script preview for non-Latin languages */}
            {needsTransliteration && newMessage && newMessage !== rawInput && (
              <div className="px-2 py-1 bg-primary/5 border border-primary/20 rounded text-sm unicode-text" dir="auto">
                {newMessage}
                {isSpellChecking && <Loader2 className="inline h-3 w-3 ml-1 animate-spin text-primary/50" />}
              </div>
            )}
            {/* Spell check suggestion */}
            {lastSuggestion?.wasChanged && (
              <div className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-[10px] flex items-center justify-between gap-2">
                <span className="text-yellow-700 dark:text-yellow-400">
                  Did you mean: <strong>{lastSuggestion.corrected}</strong>?
                </span>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-5 px-2 text-[9px]"
                    onClick={() => {
                      const corrected = acceptSuggestion();
                      if (corrected) {
                        setRawInput(corrected);
                        const native = dynamicTransliterate(corrected, currentUserLanguage);
                        setNewMessage(native || corrected);
                      }
                    }}
                  >
                    Yes
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-5 px-2 text-[9px]"
                    onClick={dismissSuggestion}
                  >
                    No
                  </Button>
                </div>
              </div>
            )}
            {/* Same language indicator */}
            {!needsTranslation && newMessage.trim() && !needsTransliteration && (
              <div className="px-2 py-0.5 bg-muted/50 rounded text-[9px] text-muted-foreground">
                Same language - direct chat
              </div>
            )}
            <div className="flex items-center gap-1">
              {/* Input: Shows native script directly for phonetic typing */}
              <Input
                placeholder={needsTransliteration ? `Type "bagunnava" → బాగున్నావా` : `Type in ${currentUserLanguage}...`}
                value={needsTransliteration ? rawInput : newMessage}
                onChange={(e) => {
                  const newValue = e.target.value;
                  
                  if (needsTransliteration) {
                    // Detect if input contains ANY non-Latin characters (GBoard native input)
                    const hasNativeChars = /[^\x00-\x7F\u00C0-\u024F]/.test(newValue);
                    
                    if (hasNativeChars) {
                      // PRIORITY: GBoard/native keyboard detected - use directly, no transliteration
                      console.log('[MiniChat] Native keyboard detected:', newValue);
                      setRawInput(newValue); // Store as-is
                      setNewMessage(newValue); // Use directly
                    } else if (newValue === '' || /^[a-zA-Z0-9\s.,!?'"()\-:;@#$%^&*+=]*$/.test(newValue)) {
                      // Pure Latin input - apply transliteration
                      setRawInput(newValue);
                      if (newValue.trim()) {
                        try {
                          const native = dynamicTransliterate(newValue, currentUserLanguage);
                          console.log('[MiniChat] Transliterate:', newValue, '→', native);
                          setNewMessage(native || newValue);
                        } catch {
                          setNewMessage(newValue);
                        }
                        // Trigger spell check
                        checkSpellingDebounced(newValue);
                      } else {
                        setNewMessage('');
                      }
                    } else {
                      // Mixed or unknown - pass through
                      setRawInput(newValue);
                      setNewMessage(newValue);
                    }
                  } else {
                    setRawInput(newValue);
                    setNewMessage(newValue);
                  }
                  
                  handleTyping();
                }}
                onKeyDown={handleKeyPress}
                lang={needsTransliteration ? "en" : currentUserLanguage}
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

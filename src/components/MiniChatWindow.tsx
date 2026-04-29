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
import { SendGiftButton } from "@/components/SendGiftButton";
import { useBlockCheck } from "@/hooks/useBlockCheck";

const IDLE_CLOSE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes idle → auto-close session
const IDLE_WARNING_MS = 1 * 60 * 1000; // 1 minute → show warning

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  englishText?: string;
  isTranslated?: boolean;
  isTranslating?: boolean;
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
  const [previewNative, setPreviewNative] = useState("");
  const [previewEnglish, setPreviewEnglish] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const billingPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const sessionStartedRef = useRef(false);
  const billingStartedRef = useRef(false);
  const tempToRealIdRef = useRef<Map<string, string>>(new Map());
  
  const [isBillingPaused, setIsBillingPaused] = useState(false);
  const [lastUserMessageTime, setLastUserMessageTime] = useState<number>(Date.now());
  const [lastPartnerMessageTime, setLastPartnerMessageTime] = useState<number>(Date.now());
  
  // Free chat tracking for women chatting with no-balance men
  const [isFreeChatMode, setIsFreeChatMode] = useState(false);
  const [freeChatRemainingSeconds, setFreeChatRemainingSeconds] = useState(300);
  const freeChatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const freeChatElapsedRef = useRef(0);

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

  // Typing preview: debounce 600ms, translate input for sender's own view
  useEffect(() => {
    if (!newMessage.trim()) {
      setPreviewNative("");
      setPreviewEnglish("");
      setIsPreviewLoading(false);
      return;
    }
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    setIsPreviewLoading(true);
    previewDebounceRef.current = setTimeout(() => {
      let cancelled = false;
      const senderLang = currentUserLanguage || 'English';
      translateForViewer(newMessage.trim(), senderLang, senderLang).then(result => {
        if (!cancelled) {
          setPreviewNative(result.nativeText);
          setPreviewEnglish(result.englishText);
          setIsPreviewLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setIsPreviewLoading(false);
      });
    }, 600);
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [newMessage, currentUserLanguage]);

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
            .from("wallets")
            .select("balance")
            .eq("user_id", currentUserId)
            .maybeSingle();
          
          if (wallet) {
            setWalletBalance(wallet.balance);
          }
        } else {
          const today = new Date().toISOString().split("T")[0];
          // Earnings come from wallet_transactions (canonical) — credits are positive amounts
          const { data: earnings } = await supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("user_id", currentUserId)
            .gt("amount", 0)
            .gte("created_at", `${today}T00:00:00`);
          
          const total = earnings?.reduce((acc, e) => acc + Number(e.amount), 0) || 0;
          setTodayEarnings(total);
        }

        // Check if this is a free chat (woman chatting with no-balance man)
        if (userGender === "female") {
          const { data: partnerWallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", partnerId)
            .maybeSingle();
          
          const partnerBalance = partnerWallet?.balance ?? 0;
          if (partnerBalance <= 0) {
            // Check free chat status
            const { data: freeChatStatus } = await supabase.rpc("check_free_chat_status", {
              p_woman_id: currentUserId,
              p_man_id: partnerId,
            });
            
            if (freeChatStatus?.blocked) {
              toast({
                title: "Free Chat Expired",
                description: "You've used your 5-minute free chat with this user. Ask them to recharge!",
                variant: "destructive",
              });
              onClose();
              return;
            }
            
            setIsFreeChatMode(true);
            setFreeChatRemainingSeconds(freeChatStatus?.remaining_seconds ?? 300);
            freeChatElapsedRef.current = freeChatStatus?.seconds_used ?? 0;
          }
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
  }, [currentUserId, userGender, ratePerMinute, partnerId]);

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

  // CHT-F-005 FIX: Reset idle timer on incoming partner messages too
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== currentUserId) {
        // Partner sent a message — reset activity timer
        setLastActivityTime(Date.now());
      }
    }
  }, [messages, currentUserId]);

  // Inactivity warning and auto-close after 2 minutes idle
  useEffect(() => {
    if (!billingStarted) return;

    const warningInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      
      if (timeSinceActivity >= IDLE_WARNING_MS && timeSinceActivity < IDLE_CLOSE_TIMEOUT_MS) {
        const remainingMins = Math.ceil((IDLE_CLOSE_TIMEOUT_MS - timeSinceActivity) / 60000);
        setInactiveWarning(`Chat closes in ${remainingMins} min - send a message!`);
      } else {
        setInactiveWarning(null);
      }
    }, 1000);

    if (billingPauseTimeoutRef.current) {
      clearTimeout(billingPauseTimeoutRef.current);
    }

    // Auto-close session after 2 minutes idle
    billingPauseTimeoutRef.current = setTimeout(async () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      toast({
        title: "Session Ended",
        description: "No activity for 2 minutes. Chat session closed automatically.",
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
        console.error("Error during inactivity close:", error);
      }
      
      onClose();
    }, IDLE_CLOSE_TIMEOUT_MS);

    return () => {
      clearInterval(warningInterval);
      if (billingPauseTimeoutRef.current) clearTimeout(billingPauseTimeoutRef.current);
    };
  }, [lastActivityTime, billingStarted, sessionId, onClose]);

  // Free chat timer: 5-min countdown for women chatting with no-balance men
  useEffect(() => {
    if (!isFreeChatMode || !billingStarted) return;
    
    freeChatTimerRef.current = setInterval(async () => {
      freeChatElapsedRef.current += 10; // update every 10 seconds
      const remaining = Math.max(300 - freeChatElapsedRef.current, 0);
      setFreeChatRemainingSeconds(remaining);
      
      // Persist to DB every 10 seconds
      try {
        const { data } = await supabase.rpc("update_free_chat_usage", {
          p_woman_id: currentUserId,
          p_man_id: partnerId,
          p_seconds: 10,
        });
        
        if (data?.blocked) {
          // 5 minutes up — auto-close and send recharge message
          if (freeChatTimerRef.current) clearInterval(freeChatTimerRef.current);
          
          await supabase.from("chat_messages").insert({
            chat_id: chatId,
            sender_id: currentUserId,
            receiver_id: partnerId,
            message: "⏰ Free chat time is over! Please recharge your wallet to continue chatting. 💳",
          });
          
          toast({
            title: "Free Chat Ended",
            description: "5-minute free chat with this user has ended. They need to recharge to chat again.",
          });
          
          try {
            await supabase
              .from("active_chat_sessions")
              .update({ status: "ended", ended_at: new Date().toISOString(), end_reason: "free_chat_expired" })
              .eq("id", sessionId);
          } catch {}
          
          onClose();
        }
      } catch (err) {
        console.error("[FreeChat] Error updating usage:", err);
      }
    }, 10000); // every 10 seconds
    
    return () => {
      if (freeChatTimerRef.current) clearInterval(freeChatTimerRef.current);
    };
  }, [isFreeChatMode, billingStarted, currentUserId, partnerId, chatId, sessionId, onClose]);

  // Translate history messages in background using live Lingva translation
  const translateHistoryMessages = useCallback(async (msgs: Message[], viewerLanguage: string, userId: string, partnerLang: string) => {
    const batchSize = 5;
    for (let i = 0; i < msgs.length; i += batchSize) {
      const batch = msgs.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (msg) => {
          try {
            const senderLang = msg.senderId === userId ? viewerLanguage : partnerLang;
            const result = await translateForViewer(msg.message, viewerLanguage, senderLang);
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
      translateHistoryMessages(formattedMessages, langToUse, currentUserId, partnerLanguage);
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
            const senderLang = newMsg.sender_id === currentUserId ? currentUserLanguage : partnerLanguage;
            const result = await translateForViewer(newMsg.message, langToUse, senderLang);
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
            
            // For own messages, find and replace temp message, preserving translation
            if (newMsg.sender_id === currentUserId) {
              const tempIdx = prev.findIndex(m =>
                m.id.startsWith('temp-') && m.senderId === newMsg.sender_id &&
                Math.abs(new Date(m.createdAt).getTime() - new Date(newMsg.created_at).getTime()) < 5000
              );
              if (tempIdx !== -1) {
                const tempMsg = prev[tempIdx];
                tempToRealIdRef.current.set(tempMsg.id, newMsg.id);
                const updated = [...prev];
                updated[tempIdx] = {
                  id: newMsg.id,
                  senderId: newMsg.sender_id,
                  message: newMsg.message,
                  translatedMessage: tempMsg.translatedMessage,
                  englishText: tempMsg.englishText,
                  isTranslated: tempMsg.isTranslated,
                  isTranslating: tempMsg.isTranslating,
                  createdAt: newMsg.created_at
                };
                return updated;
              }
            }
            
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
      setIsSending(false);
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
      setIsSending(false);
      return;
    }

    if (messageText.length === 0) {
      setIsSending(false);
      return;
    }

    setNewMessage("");
    setPreviewNative("");
    setPreviewEnglish("");
    setIsPreviewLoading(false);
    setLastActivityTime(Date.now());

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      message: messageText,
      isTranslating: true,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // Translate optimistic message for sender's own view (native script + English subtitle)
    // Pass senderLang as 3rd arg so Strategy C (transliteration bridge) fires for Latin input
    const senderLang = currentUserLanguage || 'English';
    translateForViewer(messageText, senderLang, senderLang).then(result => {
      setMessages(prev => prev.map(m => {
        const realId = tempToRealIdRef.current.get(tempId);
        if (m.id === tempId || (realId && m.id === realId)) {
          return { 
            ...m, 
            translatedMessage: result.nativeText,
            englishText: result.englishText,
            isTranslated: result.nativeText !== messageText,
            isTranslating: false,
          };
        }
        return m;
      }));
      tempToRealIdRef.current.delete(tempId);
    }).catch(() => {
      // For English speakers or on failure, still get English translation for subtitle
      getEnglishTranslation(messageText, 'auto').then(eng => {
        setMessages(prev => prev.map(m => {
          const realId = tempToRealIdRef.current.get(tempId);
          if (m.id === tempId || (realId && m.id === realId)) {
            return { ...m, englishText: eng, isTranslating: false };
          }
          return m;
        }));
        tempToRealIdRef.current.delete(tempId);
      }).catch(() => {
        setMessages(prev => prev.map(m => {
          const realId = tempToRealIdRef.current.get(tempId);
          if (m.id === tempId || (realId && m.id === realId)) {
            return { ...m, isTranslating: false };
          }
          return m;
        }));
        tempToRealIdRef.current.delete(tempId);
      });
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

  // Format as MM:SS — 60 seconds = 1 minute
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
                  <Wallet className="h-2 w-2" />₹{walletBalance.toFixed(2)}
                </Badge>
              )}
              {userGender === "female" && todayEarnings > 0 && (
                <Badge variant="outline" className="h-3.5 text-[8px] px-1 gap-0.5 border-green-500/30 text-green-600">
                  <TrendingUp className="h-2 w-2" />₹{todayEarnings.toFixed(2)}
                </Badge>
              )}
            </div>
            {isFreeChatMode && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-400 text-amber-600">
                ⏱ Free {Math.ceil(freeChatRemainingSeconds / 60)} min
              </Badge>
            )}
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
              {userGender === 'male' && (
                <SendGiftButton
                  senderUserId={currentUserId}
                  recipientUserId={partnerId}
                  context="chat"
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
                      {msg.isTranslating ? (
                        <div className="flex items-center gap-1 py-1">
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground text-[10px]">Translating...</span>
                        </div>
                      ) : (
                        <>
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
                        </>
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

          {/* Typing preview box */}
          {newMessage.trim() && (previewNative || isPreviewLoading) && (
            <div className="px-2 py-1 border-b bg-muted/30">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-0.5">
                <span>👁 Preview:</span>
              </div>
              {isPreviewLoading ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Translating...</span>
                </div>
              ) : (
                <>
                  <p className="text-[11px] unicode-text text-foreground" dir="auto">{previewNative}</p>
                  {previewEnglish && previewEnglish.toLowerCase() !== previewNative.toLowerCase() && (
                    <p className="text-[9px] text-muted-foreground/60 italic" dir="ltr">
                      english: {previewEnglish.toLowerCase()}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

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

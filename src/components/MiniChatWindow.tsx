import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Paperclip,
  Camera,
  Image,
  Video,
  FileText,
  Mic,
  MoreVertical,
  Eye,
  EyeOff
} from "lucide-react";
import { ChatRelationshipActions } from "@/components/ChatRelationshipActions";
import { GiftSendButton } from "@/components/GiftSendButton";
import { HoldToRecordButton } from "@/components/HoldToRecordButton";
import { VoiceRecordButton } from "@/components/VoiceRecordButton";
import { useBlockCheck } from "@/hooks/useBlockCheck";
import { useRealtimeTranslation } from "@/lib/translation";
import { TranslatedTypingIndicator } from "@/components/TranslatedTypingIndicator";
import { useDLTranslate } from "@/lib/dl-translate";

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes - auto disconnect per feature requirement
const WARNING_THRESHOLD_MS = 4 * 60 * 1000; // 4 minutes - show warning

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
  currentUserName: string;
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
  currentUserName,
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
  const [billingPaused, setBillingPaused] = useState(false); // Billing paused due to inactivity
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef(false);
  const transliterationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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
          setDisplayMessage(result.text); // Only update preview, NOT the input
          // Don't update newMessage - keep Latin input, convert only on send
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

  // Inactivity check with warning - PAUSE billing after 5 mins, but keep chat window open
  useEffect(() => {
    if (!billingStarted || billingPaused) return;

    // Update warning every second
    const warningInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      
      if (timeSinceActivity >= WARNING_THRESHOLD_MS && timeSinceActivity < INACTIVITY_TIMEOUT_MS) {
        const remainingSecs = Math.ceil((INACTIVITY_TIMEOUT_MS - timeSinceActivity) / 1000);
        setInactiveWarning(`Billing pauses in ${remainingSecs}s`);
      } else {
        setInactiveWarning(null);
      }
    }, 1000);

    if (inactivityRef.current) {
      clearTimeout(inactivityRef.current);
    }

    inactivityRef.current = setTimeout(async () => {
      // Stop the timer and heartbeat - PAUSE billing, don't close
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      // Mark billing as paused
      setBillingPaused(true);
      setInactiveWarning("Billing paused - send a message to resume");
      
      toast({
        title: "Billing Paused",
        description: "No activity for 5 minutes. Charging/earning stopped. Send a message to resume.",
      });
      
      // Update session status to paused (but not ended)
      try {
        await supabase
          .from("active_chat_sessions")
          .update({
            status: "paused",
            end_reason: "inactivity_pause"
          })
          .eq("id", sessionId);
      } catch (error) {
        console.error("Error pausing chat session:", error);
      }
      
      // DON'T close the chat window - keep it open
    }, INACTIVITY_TIMEOUT_MS);

    return () => {
      clearInterval(warningInterval);
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, [lastActivityTime, billingStarted, billingPaused, sessionId]);

  // Resume billing when user sends a message after pause
  const resumeBilling = useCallback(async () => {
    if (!billingPaused) return;
    
    setBillingPaused(false);
    setInactiveWarning(null);
    setLastActivityTime(Date.now());
    
    // Restart timer
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    
    // Restart heartbeat
    if (!heartbeatRef.current) {
      heartbeatRef.current = setInterval(async () => {
        try {
          await supabase.functions.invoke("chat-manager", {
            body: { action: "heartbeat", chat_id: chatId }
          });
        } catch (error) {
          console.error("Heartbeat error:", error);
        }
      }, 60000);
    }
    
    // Update session back to active
    try {
      await supabase
        .from("active_chat_sessions")
        .update({
          status: "active",
          end_reason: null,
          last_activity_at: new Date().toISOString()
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error resuming chat session:", error);
    }
    
    toast({
      title: "Billing Resumed",
      description: "Charging/earning has resumed.",
    });
  }, [billingPaused, chatId, sessionId]);

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
      // First, show messages immediately without translation (non-blocking)
      const initialMessages = data.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        message: m.message,
        translatedMessage: m.message, // Show original initially
        isTranslated: false,
        detectedLanguage: undefined,
        createdAt: m.created_at
      }));
      setMessages(initialMessages);

      // Then translate in parallel (non-blocking background task)
      data.forEach(async (m) => {
        if (m.sender_id !== currentUserId) {
          try {
            const translation = await translateMessage(m.message, m.sender_id);
            if (translation.isTranslated) {
              setMessages(prev => prev.map(msg => 
                msg.id === m.id 
                  ? { ...msg, translatedMessage: translation.translatedMessage, isTranslated: true, detectedLanguage: translation.detectedLanguage }
                  : msg
              ));
            }
          } catch (err) {
            console.error('Background translation error:', err);
          }
        }
      });
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
          
          // Add message immediately (non-blocking) - show original first
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              message: newMsg.message,
              translatedMessage: newMsg.message, // Show original initially
              isTranslated: false,
              detectedLanguage: undefined,
              createdAt: newMsg.created_at
            }];
          });

          // Partner sent a message - update activity time
          setLastActivityTime(Date.now());

          // Update unread count if minimized
          if (isMinimized) {
            setUnreadCount(prev => prev + 1);
          }

          // Translate in background (parallel, non-blocking)
          translateMessage(newMsg.message, newMsg.sender_id).then(translation => {
            if (translation.isTranslated) {
              setMessages(prev => prev.map(m => 
                m.id === newMsg.id 
                  ? { ...m, translatedMessage: translation.translatedMessage, isTranslated: true, detectedLanguage: translation.detectedLanguage }
                  : m
              ));
            }
          }).catch(err => console.error('Background translation error:', err));
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

  const sendMessage = () => {
    if (!newMessage.trim() || isSending || isBlocked) return;

    const trimmedInput = newMessage.trim();
    // Capture displayMessage BEFORE clearing state
    const currentPreview = displayMessage?.trim() || '';
    
    // SECURITY: Validate message length to prevent database abuse
    if (trimmedInput.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Messages must be under ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive"
      });
      return;
    }

    // Clear input IMMEDIATELY - don't block user from typing next message
    setNewMessage("");
    setDisplayMessage("");
    stopTyping();
    setIsSending(true);
    setLastActivityTime(Date.now());
    
    // Resume billing if it was paused
    if (billingPaused) {
      resumeBilling();
    }

    // Determine message text synchronously - use preview if available
    let messageText = trimmedInput;
    if (needsNativeConversion && isLatinScript(trimmedInput)) {
      if (currentPreview && currentPreview !== trimmedInput && !isLatinScript(currentPreview)) {
        messageText = currentPreview;
      }
      // If no preview, send original - don't block waiting for conversion
    } else if (currentPreview && currentPreview !== trimmedInput) {
      messageText = currentPreview;
    }

    // Optimistic update - immediately show the message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      message: messageText,
      translatedMessage: messageText,
      isTranslated: false,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // Send in background - don't await
    (async () => {
      try {
        const { data: insertedMsg, error } = await supabase
          .from("chat_messages")
          .insert({
            chat_id: chatId,
            sender_id: currentUserId,
            receiver_id: partnerId,
            message: messageText
          })
          .select()
          .single();

        if (error) throw error;

        // Replace optimistic message with real one
        if (insertedMsg) {
          setMessages(prev => prev.map(m => 
            m.id === tempId 
              ? {
                  id: insertedMsg.id,
                  senderId: insertedMsg.sender_id,
                  message: insertedMsg.message,
                  translatedMessage: insertedMsg.message,
                  isTranslated: false,
                  createdAt: insertedMsg.created_at
                }
              : m
          ));
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
        setIsSending(false);
      }
    })();
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

  const handleClose = useCallback(() => {
    // Immediately close the UI (don't wait for database)
    onClose();
    
    // Update database in background
    (async () => {
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
    })();
  }, [sessionId, onClose]);

  // File upload handler - with optimistic UI (show immediately to sender)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setIsAttachOpen(false);
    setLastActivityTime(Date.now());

    const emoji = fileType === 'image' ? '📷' : fileType === 'video' ? '🎬' : '📎';
    const tempId = `temp-file-${Date.now()}`;
    
    // Create local preview URL for immediate display
    const localPreviewUrl = URL.createObjectURL(file);
    const optimisticMessage = `${emoji} [${fileType.toUpperCase()}:${localPreviewUrl}] ${file.name}`;

    // Optimistic update - show file immediately to sender
    const optimisticMsg: Message = {
      id: tempId,
      senderId: currentUserId,
      message: optimisticMessage,
      translatedMessage: optimisticMessage,
      isTranslated: false,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}/${chatId}/${Date.now()}.${fileExt}`;
      const bucket = fileType === 'image' ? 'profile-photos' : 'community-files';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Send message with actual uploaded file URL
      const finalMessage = `${emoji} [${fileType.toUpperCase()}:${publicUrl}] ${file.name}`;
      const { data: insertedMsg, error: messageError } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: finalMessage
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Replace optimistic message with real one (with server URL)
      if (insertedMsg) {
        setMessages(prev => prev.map(m => 
          m.id === tempId 
            ? {
                id: insertedMsg.id,
                senderId: insertedMsg.sender_id,
                message: insertedMsg.message,
                translatedMessage: insertedMsg.message,
                isTranslated: false,
                createdAt: insertedMsg.created_at
              }
            : m
        ));
      }

      // Clean up local preview URL
      URL.revokeObjectURL(localPreviewUrl);

      toast({
        title: "File sent",
        description: `${file.name} has been sent`
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      URL.revokeObjectURL(localPreviewUrl);
      toast({
        title: "Upload failed",
        description: "Failed to send file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = (accept: string, fileType: 'image' | 'video' | 'document') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.dataset.fileType = fileType;
      fileInputRef.current.click();
    }
  };

  // Selfie capture
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take selfies",
        variant: "destructive"
      });
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const captureSelfie = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the image for selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      stopCamera();
      setIsUploading(true);
      setLastActivityTime(Date.now());

      const tempId = `temp-selfie-${Date.now()}`;
      
      // Create local preview URL for immediate display
      const localPreviewUrl = URL.createObjectURL(blob);
      const optimisticMessage = `📷 [IMAGE:${localPreviewUrl}] Selfie`;

      // Optimistic update - show selfie immediately to sender
      const optimisticMsg: Message = {
        id: tempId,
        senderId: currentUserId,
        message: optimisticMessage,
        translatedMessage: optimisticMessage,
        isTranslated: false,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, optimisticMsg]);

      try {
        const fileName = `${currentUserId}/${chatId}/selfie_${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/jpeg'
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName);

        const finalMessage = `📷 [IMAGE:${publicUrl}] Selfie`;
        const { data: insertedMsg, error: messageError } = await supabase
          .from("chat_messages")
          .insert({
            chat_id: chatId,
            sender_id: currentUserId,
            receiver_id: partnerId,
            message: finalMessage
          })
          .select()
          .single();

        if (messageError) throw messageError;

        // Replace optimistic message with real one (with server URL)
        if (insertedMsg) {
          setMessages(prev => prev.map(m => 
            m.id === tempId 
              ? {
                  id: insertedMsg.id,
                  senderId: insertedMsg.sender_id,
                  message: insertedMsg.message,
                  translatedMessage: insertedMsg.message,
                  isTranslated: false,
                  createdAt: insertedMsg.created_at
                }
              : m
          ));
        }

        // Clean up local preview URL
        URL.revokeObjectURL(localPreviewUrl);

        toast({
          title: "Selfie sent!",
          description: "Your photo has been shared"
        });
      } catch (error) {
        console.error("Error sending selfie:", error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        URL.revokeObjectURL(localPreviewUrl);
        toast({
          title: "Failed to send selfie",
          description: "Please try again",
          variant: "destructive"
        });
      } finally {
        setIsUploading(false);
      }
    }, 'image/jpeg', 0.8);
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
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          {/* Toggle button to show/hide actions */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
            title={showActions ? "Hide actions" : "Show actions"}
          >
            {showActions ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
          </Button>
          
          {/* Collapsible action buttons */}
          {showActions && (
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
            </>
          )}
          
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
              {messages.map((msg) => {
                const isSentByMe = msg.senderId === currentUserId;
                // Get first name only for both users
                const myFirstName = currentUserName?.split(' ')[0] || 'Me';
                const partnerFirstName = partnerName?.split(' ')[0] || 'Partner';
                const senderName = isSentByMe ? myFirstName : partnerFirstName;
                
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col",
                      isSentByMe ? "items-end" : "items-start"
                    )}
                  >
                    {/* Sender first name */}
                    <span className="text-[9px] text-muted-foreground mb-0.5 px-1 font-medium">
                      {senderName}
                    </span>
                    <div
                      className={cn(
                        "max-w-[85%] px-2 py-1 rounded-xl text-[11px]",
                        isSentByMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      )}
                    >
                      {/* Display message in user's native language - translation is invisible */}
                      {msg.translatedMessage || msg.message}
                    </div>
                  </div>
                );
              })}
              
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

          {/* Camera Modal for Selfie */}
          {isCameraOpen && (
            <div className="absolute inset-0 bg-background/95 z-50 flex flex-col items-center justify-center p-2">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full max-h-48 rounded-lg object-cover transform -scale-x-100"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={stopCamera}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={captureSelfie} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3 mr-1" />}
                  Capture
                </Button>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const fileType = (e.target.dataset.fileType || 'document') as 'image' | 'video' | 'document';
              handleFileUpload(e, fileType);
            }}
          />

          {/* Input area - with real-time native script conversion */}
          <div className="p-1.5 border-t">
            {/* Native script preview - shown above input when converting */}
            {displayMessage && displayMessage !== newMessage && needsNativeConversion && (
              <div className="mb-1.5 p-1.5 bg-primary/10 rounded text-[10px] text-muted-foreground border border-primary/20">
                <span className="text-[9px] text-muted-foreground/70">Preview: </span>
                <span className="text-foreground font-medium">{displayMessage}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {/* Attach button */}
              <Popover open={isAttachOpen} onOpenChange={setIsAttachOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={isUploading || isBlocked}
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-36 p-1" side="top" align="start">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 text-[10px]"
                      onClick={startCamera}
                    >
                      <Camera className="h-3.5 w-3.5 mr-2 text-primary" />
                      Selfie
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 text-[10px]"
                      onClick={() => triggerFileInput('image/*', 'image')}
                    >
                      <Image className="h-3.5 w-3.5 mr-2 text-blue-500" />
                      Photo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 text-[10px]"
                      onClick={() => triggerFileInput('video/*', 'video')}
                    >
                      <Video className="h-3.5 w-3.5 mr-2 text-purple-500" />
                      Video
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-7 text-[10px]"
                      onClick={() => triggerFileInput('*/*', 'document')}
                    >
                      <FileText className="h-3.5 w-3.5 mr-2 text-orange-500" />
                      File
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Hold to record voice button */}
              <HoldToRecordButton
                chatId={chatId}
                currentUserId={currentUserId}
                partnerId={partnerId}
                onMessageSent={() => setLastActivityTime(Date.now())}
                onOptimisticMessage={(tempId, localBlobUrl, duration) => {
                  // Show voice message immediately to sender
                  const optimisticMsg: Message = {
                    id: tempId,
                    senderId: currentUserId,
                    message: `🎤 [VOICE:${localBlobUrl}]`,
                    translatedMessage: `🎤 [VOICE:${localBlobUrl}]`,
                    isTranslated: false,
                    createdAt: new Date().toISOString()
                  };
                  setMessages(prev => [...prev, optimisticMsg]);
                }}
                onMessageConfirmed={(tempId, serverMessageId, serverUrl) => {
                  // Replace optimistic message with real one
                  setMessages(prev => prev.map(m => 
                    m.id === tempId 
                      ? {
                          id: serverMessageId,
                          senderId: currentUserId,
                          message: `[VOICE:${serverUrl}]`,
                          translatedMessage: `[VOICE:${serverUrl}]`,
                          isTranslated: false,
                          createdAt: m.createdAt
                        }
                      : m
                  ));
                }}
                onMessageFailed={(tempId) => {
                  // Remove optimistic message on error
                  setMessages(prev => prev.filter(m => m.id !== tempId));
                }}
                disabled={isBlocked}
                className="h-7 w-7 shrink-0"
              />

              {/* Voice-to-text button */}
              <VoiceRecordButton
                onTranscription={(text) => {
                  setNewMessage(prev => prev ? `${prev} ${text}` : text);
                  setLastActivityTime(Date.now());
                }}
                disabled={isBlocked}
                className="h-7 w-7 shrink-0"
              />

              {/* Text input */}
              <div className="relative flex-1">
                <Input
                  placeholder={isBlocked ? "Chat ended" : needsNativeConversion ? "Type in English..." : "Type your message..."}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={handleKeyPress}
                  className="h-7 text-[11px] pr-6"
                  disabled={isBlocked}
                />
                {isConverting && (
                  <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>

              {/* Send button */}
              <Button
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending || isBlocked}
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

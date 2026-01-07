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
  Move,
  Paperclip,
  Image,
  Video,
  FileText,
  Mic,
  Square,
  Languages,
  MoreHorizontal
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { MiniChatActions } from "@/components/MiniChatActions";
import { GiftSendButton } from "@/components/GiftSendButton";
import { useBlockCheck } from "@/hooks/useBlockCheck";
import { TranslatedTypingIndicator } from "@/components/TranslatedTypingIndicator";
import { useRealtimeTranslation } from "@/lib/translation";
import {
  isSameLanguage,
  isLatinScriptLanguage,
  normalizeUnicode,
} from "@/lib/translation";
import { translateAsync } from "@/lib/translation/async-translator";

console.log('[DraggableMiniChatWindow] Module loaded - native input + Edge Function translation');

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes - auto disconnect
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
  const [areButtonsExpanded, setAreButtonsExpanded] = useState(false); // Action buttons minimized by default
  const [unreadCount, setUnreadCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [billingStarted, setBillingStarted] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [totalEarned, setTotalEarned] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [inactiveWarning, setInactiveWarning] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [transliterationEnabled, setTransliterationEnabled] = useState(true);
  const [livePreview, setLivePreview] = useState<{ text: string; isLoading: boolean }>({ text: '', isLoading: false });
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if translation is needed (based on mother tongue from profiles)
  const needsTranslation = !isSameLanguage(currentUserLanguage, partnerLanguage);
  // User's language uses Latin script natively (English, Spanish, etc.)
  const userUsesLatinScript = isLatinScriptLanguage(currentUserLanguage);

  // Dragging state - use left/top for absolute positioning anywhere on screen
  const [position, setPosition] = useState(() => {
    // Default to bottom-right if initialPosition is default {20, 20}
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      const defaultWidth = isMobile ? 280 : 320;
      const defaultHeight = isMobile ? 350 : 400;
      return {
        x: initialPosition.x === 20 ? window.innerWidth - defaultWidth - 20 : initialPosition.x,
        y: initialPosition.y === 20 ? window.innerHeight - defaultHeight - 20 : initialPosition.y
      };
    }
    return initialPosition;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Responsive size - smaller on mobile
  const getResponsiveSize = () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      return isMobile ? { width: 280, height: 350 } : { width: 320, height: 400 };
    }
    return { width: 320, height: 400 };
  };
  
  const [size, setSize] = useState(getResponsiveSize);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startWidth: number; startHeight: number; startX: number; startY: number; corner: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartedRef = useRef(false);

  // Check block status
  const { isBlocked, isBlockedByThem } = useBlockCheck(currentUserId, partnerId);

  // Real-time typing indicator with bi-directional translation - FULLY ASYNC
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

  // Dragging handlers - supports both mouse and touch
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startPosX: position.x,
      startPosY: position.y
    };
    onFocus?.();
  }, [position, isMaximized, onFocus]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragRef.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - dragRef.current.startX;
      const deltaY = clientY - dragRef.current.startY;
      
      // Constrain to viewport bounds
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - (isMinimized ? 48 : size.height);
      
      setPosition({
        x: Math.max(0, Math.min(maxX, dragRef.current.startPosX + deltaX)),
        y: Math.max(0, Math.min(maxY, dragRef.current.startPosY + deltaY))
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, size, isMinimized]);

  // Resize handlers - support touch and multiple corners
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, corner: string = 'se') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    resizeRef.current = {
      startWidth: size.width,
      startHeight: size.height,
      startX: clientX,
      startY: clientY,
      corner
    };
  }, [size]);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizing || !resizeRef.current) return;
      
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      
      const deltaX = clientX - resizeRef.current.startX;
      const deltaY = clientY - resizeRef.current.startY;
      
      const minWidth = 280;
      const minHeight = 300;
      const maxWidth = Math.min(600, window.innerWidth - 40);
      const maxHeight = Math.min(600, window.innerHeight - 40);
      
      let newWidth = resizeRef.current.startWidth;
      let newHeight = resizeRef.current.startHeight;
      let newX = position.x;
      let newY = position.y;
      
      const corner = resizeRef.current.corner;
      
      // Handle different corner resizing
      if (corner.includes('e')) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, resizeRef.current.startWidth + deltaX));
      }
      if (corner.includes('w')) {
        const widthDelta = -deltaX;
        newWidth = Math.max(minWidth, Math.min(maxWidth, resizeRef.current.startWidth + widthDelta));
        if (newWidth !== resizeRef.current.startWidth) {
          newX = position.x + (resizeRef.current.startWidth - newWidth);
        }
      }
      if (corner.includes('s')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, resizeRef.current.startHeight + deltaY));
      }
      if (corner.includes('n')) {
        const heightDelta = -deltaY;
        newHeight = Math.max(minHeight, Math.min(maxHeight, resizeRef.current.startHeight + heightDelta));
        if (newHeight !== resizeRef.current.startHeight) {
          newY = position.y + (resizeRef.current.startHeight - newHeight);
        }
      }
      
      setSize({ width: newWidth, height: newHeight });
      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: Math.max(0, newX), y: Math.max(0, newY) });
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      document.addEventListener("touchmove", handleResizeMove, { passive: false });
      document.addEventListener("touchend", handleResizeEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.removeEventListener("touchmove", handleResizeMove);
      document.removeEventListener("touchend", handleResizeEnd);
    };
  }, [isResizing, position]);

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

  // Monitor partner's online status and session status - auto-disconnect if partner goes offline
  useEffect(() => {
    let partnerOnlineStatus = isPartnerOnline;
    
    // Subscribe to partner's online status changes via user_status table (more accurate)
    const statusChannel = supabase
      .channel(`partner-user-status-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
          filter: `user_id=eq.${partnerId}`
        },
        async (payload: any) => {
          const newStatus = payload.new;
          const wasOnline = partnerOnlineStatus;
          
          // Check if partner went offline
          if (newStatus && newStatus.is_online === false && wasOnline) {
            console.log("Partner went offline (user_status), disconnecting...");
            toast({
              title: "Partner Disconnected",
              description: `${partnerName} went offline. You are now free to chat with others.`,
            });
            
            // End the chat session
            try {
              await supabase
                .from("active_chat_sessions")
                .update({
                  status: "ended",
                  ended_at: new Date().toISOString(),
                  end_reason: "partner_offline"
                })
                .eq("id", sessionId);
            } catch (error) {
              console.error("Error ending chat on partner offline:", error);
            }
            
            onClose();
          }
          
          partnerOnlineStatus = newStatus?.is_online ?? false;
        }
      )
      .subscribe();

    // Also subscribe to partner's profile changes as fallback
    const profileChannel = supabase
      .channel(`partner-profile-status-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${partnerId}`
        },
        async (payload: any) => {
          const newProfile = payload.new;
          
          // Check if partner went offline (last_active_at is more than 2 minutes ago)
          if (newProfile.last_active_at) {
            const lastActive = new Date(newProfile.last_active_at).getTime();
            const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
            const isNowOffline = lastActive < twoMinutesAgo;
            
            if (partnerOnlineStatus && isNowOffline) {
              console.log("Partner went offline (profiles), disconnecting...");
              toast({
                title: "Partner Disconnected",
                description: `${partnerName} went offline. You are now free to chat with others.`,
              });
              
              // End the chat session
              try {
                await supabase
                  .from("active_chat_sessions")
                  .update({
                    status: "ended",
                    ended_at: new Date().toISOString(),
                    end_reason: "partner_offline"
                  })
                  .eq("id", sessionId);
              } catch (error) {
                console.error("Error ending chat on partner offline:", error);
              }
              
              onClose();
            }
            
            partnerOnlineStatus = !isNowOffline;
          }
        }
      )
      .subscribe();

    // Also subscribe to session status changes - if partner ends the chat
    const sessionChannel = supabase
      .channel(`session-status-${sessionId}`)
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
          
          // If session was ended by partner, close the chat window
          if (session.status === 'ended' && session.end_reason) {
            console.log("Session ended:", session.end_reason);
            
            let message = "Chat session ended";
            if (session.end_reason === 'partner_offline') {
              message = `${partnerName} went offline`;
            } else if (session.end_reason === 'user_closed' || session.end_reason === 'user_ended') {
              message = `${partnerName} ended the chat`;
            } else if (session.end_reason === 'inactivity_timeout') {
              message = "Chat ended due to inactivity";
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
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [partnerId, partnerName, sessionId, isPartnerOnline, onClose, toast]);

  // Auto-translate partner's messages using profile languages
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
      const sourceLanguage = partnerLanguage;
      const targetLanguage = currentUserLanguage;
      
      console.log('[DraggableMiniChatWindow] translateMessage:', {
        text: text.substring(0, 30),
        sourceLanguage,
        targetLanguage
      });
      
      // Same language - no translation needed
      if (isSameLanguage(sourceLanguage, targetLanguage)) {
        console.log('[DraggableMiniChatWindow] Same language, no translation needed');
        return { translatedMessage: text, isTranslated: false, detectedLanguage: sourceLanguage };
      }
      
      // Different languages - translate via Edge Function
      console.log(`[DraggableMiniChatWindow] Translating: ${sourceLanguage} -> ${targetLanguage}`);
      const result = await translateAsync(text, sourceLanguage, targetLanguage);
      
      if (result.isTranslated && result.text) {
        console.log('[DraggableMiniChatWindow] Translation result:', result.text.substring(0, 50));
        return {
          translatedMessage: normalizeUnicode(result.text),
          isTranslated: true,
          detectedLanguage: sourceLanguage
        };
      }
      
      return { translatedMessage: text, isTranslated: false, detectedLanguage: sourceLanguage };
    } catch (error) {
      console.error('[DraggableMiniChatWindow] Translation error:', error);
      return { translatedMessage: text, isTranslated: false };
    }
  }, [partnerLanguage, currentUserLanguage, currentUserId]);

  // Load messages with immediate display + background translation
  const loadMessages = async () => {
    console.log('[DraggableMiniChatWindow] loadMessages called');
    
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      // STEP 1: IMMEDIATE - Show messages instantly
      const immediateMessages = data.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        message: m.message,
        translatedMessage: undefined,
        isTranslated: false,
        isTranslating: m.sender_id !== currentUserId && needsTranslation,
        createdAt: m.created_at
      }));
      setMessages(immediateMessages);

      // STEP 2: BACKGROUND - Translate partner's messages
      const partnerMessages = data.filter(m => m.sender_id !== currentUserId);
      
      partnerMessages.forEach((m) => {
        if (!needsTranslation) {
          // Same language - no translation needed
          setMessages(prev => prev.map(msg => 
            msg.id === m.id ? { ...msg, isTranslating: false } : msg
          ));
          return;
        }
        
        // Different languages - translate via Edge Function with profile-based language detection
        translateAsync(m.message, partnerLanguage, currentUserLanguage, {
          senderId: partnerId,
          receiverId: currentUserId
        })
          .then((result) => {
            setMessages(prev => prev.map(msg => 
              msg.id === m.id 
                ? {
                    ...msg,
                    translatedMessage: result.isTranslated ? normalizeUnicode(result.text) : undefined,
                    isTranslated: result.isTranslated,
                    isTranslating: false
                  }
                : msg
            ));
          })
          .catch(() => {
            setMessages(prev => prev.map(msg => 
              msg.id === m.id ? { ...msg, isTranslating: false } : msg
            ));
          });
      });
    }
  };

  // Subscribe to new messages with immediate display + background translation
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
        (payload: any) => {
          const newMsg = payload.new;
          const isPartnerMessage = newMsg.sender_id !== currentUserId;
          
          // STEP 1: IMMEDIATE - Add message to UI
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              message: newMsg.message,
              translatedMessage: undefined,
              isTranslated: false,
              isTranslating: isPartnerMessage && needsTranslation,
              createdAt: newMsg.created_at
            }];
          });

          // Update activity and unread count for partner messages
          if (isPartnerMessage) {
            setLastActivityTime(Date.now());
            if (isMinimized) {
              setUnreadCount(prev => prev + 1);
            }
            
            // STEP 2: BACKGROUND - Translate partner message
            if (needsTranslation) {
              translateAsync(newMsg.message, partnerLanguage, currentUserLanguage, {
                senderId: partnerId,
                receiverId: currentUserId
              })
                .then((result) => {
                  setMessages(prev => prev.map(msg => 
                    msg.id === newMsg.id 
                      ? {
                          ...msg,
                          translatedMessage: result.isTranslated ? normalizeUnicode(result.text) : undefined,
                          isTranslated: result.isTranslated,
                          isTranslating: false
                        }
                      : msg
                  ));
                })
                .catch(() => {
                  setMessages(prev => prev.map(msg => 
                    msg.id === newMsg.id ? { ...msg, isTranslating: false } : msg
                  ));
                });
            } else {
              // Same language - mark as complete
              setMessages(prev => prev.map(msg => 
                msg.id === newMsg.id ? { ...msg, isTranslating: false } : msg
              ));
            }
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

  const handleTyping = useCallback((text: string) => {
    setLastActivityTime(Date.now());
    // Send typing indicator with native script preview
    if (text.trim()) {
      sendTypingIndicator(text.trim(), partnerLanguage);
    }
  }, [sendTypingIndicator, partnerLanguage]);

  const MAX_MESSAGE_LENGTH = 10000; // Support very large messages

  // Track the current preview for this typing session - reset after each send
  const currentPreviewRef = useRef<string>('');

  // NON-BLOCKING: Send message with optimistic UI update
  // Bi-directional: Sender sees native script, receiver sees translated native script
  // Send message directly - user types in native script
  const sendMessage = async () => {
    const messageText = newMessage.trim();
    if (!messageText || isSending) return;

    if (messageText.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Messages must be under ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive"
      });
      return;
    }

    // IMMEDIATE: Clear input and UI
    setNewMessage("");
    setLivePreview({ text: '', isLoading: false });
    currentPreviewRef.current = '';
    clearPreview();
    setLastActivityTime(Date.now());
    
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    
    // OPTIMISTIC: Add message to UI immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setMessages(prev => [...prev, {
      id: tempId,
      senderId: currentUserId,
      message: messageText, // Native input - show as-is
      translatedMessage: undefined,
      isTranslated: false,
      createdAt: new Date().toISOString()
    }]);

    // BACKGROUND: Send to database
    setIsSending(true);
    try {
      console.log('[DraggableMiniChatWindow] Sending:', messageText.substring(0, 30));
      
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: messageText
        });

      if (error) throw error;
      
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
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

  // File upload handler
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

      // Send message with file
      const emoji = fileType === 'image' ? '📷' : fileType === 'video' ? '🎬' : '📎';
      const { error: messageError } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId,
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: `${emoji} [${fileType.toUpperCase()}:${publicUrl}] ${file.name}`
        });

      if (messageError) throw messageError;

      toast({
        title: "File sent",
        description: `${file.name} has been sent`
      });
    } catch (error) {
      console.error("Error uploading file:", error);
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

  const estimatedCost = billingStarted ? (elapsedSeconds / 60) * ratePerMinute : 0;
  const estimatedEarning = billingStarted ? (elapsedSeconds / 60) * earningRatePerMinute : 0;

  // When initialPosition is {0,0}, use relative positioning for flex layout
  const useFlexLayout = initialPosition.x === 0 && initialPosition.y === 0;
  
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
    : useFlexLayout
      ? {
          position: 'relative' as const,
          width: isMinimized ? 240 : size.width, 
          height: isMinimized ? 48 : size.height,
          zIndex
        }
      : { 
          position: 'fixed' as const,
          left: position.x, 
          top: position.y, 
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
      
      {/* Header - Draggable with mouse and touch support */}
      <div 
        className={cn(
          "flex items-center justify-between p-2 bg-gradient-to-r from-primary/10 to-transparent border-b touch-none select-none",
          !isMaximized && "cursor-move"
        )}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
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
          
          {/* Expandable action buttons - hidden by default */}
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
              {/* Relationship Actions (Block/Unblock/Friend/Unfriend/Stop) */}
              <MiniChatActions
                currentUserId={currentUserId}
                targetUserId={partnerId}
                targetUserName={partnerName}
                isPartnerOnline={isPartnerOnline}
                onBlock={handleClose}
                onStopChat={handleClose}
                onLogOff={handleClose}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={toggleMaximize}
                title={isMaximized ? "Restore size" : "Maximize"}
              >
                {isMaximized ? <Minimize2 className="h-2.5 w-2.5" /> : <Maximize2 className="h-2.5 w-2.5" />}
              </Button>
            </>
          )}
          
          {/* Always visible: minimize/expand and close */}
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
              {messages.map((msg) => {
                // Parse special message formats
                const isVoice = msg.message.startsWith('[VOICE:');
                const isImage = msg.message.includes('[IMAGE:');
                const isVideo = msg.message.includes('[VIDEO:');
                const isDocument = msg.message.includes('[DOCUMENT:');
                const isFile = isImage || isVideo || isDocument;

                // Extract URL from special format
                const extractUrl = (text: string, type: string) => {
                  const match = text.match(new RegExp(`\\[${type}:([^\\]]+)\\]`));
                  return match ? match[1] : null;
                };

                const fileUrl = isVoice 
                  ? msg.message.replace('[VOICE:', '').replace(']', '')
                  : isImage ? extractUrl(msg.message, 'IMAGE')
                  : isVideo ? extractUrl(msg.message, 'VIDEO')
                  : isDocument ? extractUrl(msg.message, 'DOCUMENT')
                  : null;

                return (
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
                      {isVoice && fileUrl ? (
                        <div className="flex items-center gap-2">
                          <Mic className="h-3 w-3" />
                          <audio src={fileUrl} controls className="h-6 max-w-[150px]" />
                        </div>
                      ) : isImage && fileUrl ? (
                        <div className="space-y-1">
                          <img 
                            src={fileUrl} 
                            alt="Shared image" 
                            className="max-w-[200px] max-h-[150px] rounded object-cover cursor-pointer"
                            onClick={() => window.open(fileUrl, '_blank')}
                          />
                        </div>
                      ) : isVideo && fileUrl ? (
                        <div className="space-y-1">
                          <video 
                            src={fileUrl} 
                            controls 
                            className="max-w-[200px] max-h-[150px] rounded"
                          />
                        </div>
                      ) : isDocument && fileUrl ? (
                        <a 
                          href={fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 underline hover:opacity-80"
                        >
                          <FileText className="h-3 w-3" />
                          <span>View Document</span>
                        </a>
                      ) : msg.senderId === currentUserId ? (
                        // OWN MESSAGE: Show sender's native script (already converted)
                        <p>{msg.message}</p>
                      ) : msg.isTranslating ? (
                        // PARTNER MESSAGE: Translation in progress - show loading indicator
                        <div className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="opacity-70 italic">{msg.message}</span>
                        </div>
                      ) : (
                        // PARTNER MESSAGE: Show translated if available, else original
                        <p>{msg.translatedMessage || msg.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Partner typing indicator - shows in receiver's native language */}
              {partnerTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <TranslatedTypingIndicator
                      indicator={partnerTyping}
                      partnerName={partnerName}
                      className="text-[10px]"
                    />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-1.5 border-t">
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
            
            <div className="flex items-center gap-1">
              {/* Attach button */}
              <Popover open={isAttachOpen} onOpenChange={setIsAttachOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" side="top" align="start">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs"
                      onClick={() => triggerFileInput('image/*', 'image')}
                    >
                      <Image className="h-4 w-4 mr-2 text-blue-500" />
                      Photo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs"
                      onClick={() => triggerFileInput('video/*', 'video')}
                    >
                      <Video className="h-4 w-4 mr-2 text-purple-500" />
                      Video
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs"
                      onClick={() => triggerFileInput('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar', 'document')}
                    >
                      <FileText className="h-4 w-4 mr-2 text-orange-500" />
                      Document
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Simple text input */}
              <div className="flex-1 relative">
                {/* Same language indicator */}
                {!needsTranslation && newMessage.trim() && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 px-2 py-0.5 bg-muted/50 rounded text-[9px] text-muted-foreground">
                    Same language - direct chat
                  </div>
                )}
                <Input
                  placeholder={userUsesLatinScript ? "Type your message..." : "Type in your language..."}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping(e.target.value);
                  }}
                  onKeyDown={handleKeyPress}
                  className="h-8 text-xs w-full"
                  disabled={isSending || isUploading}
                />
              </div>

              {/* Transliteration toggle */}
              <Button
                type="button"
                variant={transliterationEnabled ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0",
                  transliterationEnabled && "bg-primary/20 text-primary hover:bg-primary/30"
                )}
                onClick={() => setTransliterationEnabled(!transliterationEnabled)}
                title={transliterationEnabled ? "Auto-convert enabled" : "Auto-convert disabled"}
              >
                <Languages className={cn(
                  "h-4 w-4",
                  livePreview.isLoading && "animate-pulse"
                )} />
              </Button>

              {/* Send button */}
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 bg-primary hover:bg-primary/90"
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Resize handles - all corners and edges */}
          {!isMaximized && (
            <>
              {/* Corner handles */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'se')}
                onTouchStart={(e) => handleResizeStart(e, 'se')}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground rotate-[-45deg]" />
              </div>
              <div
                className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'sw')}
                onTouchStart={(e) => handleResizeStart(e, 'sw')}
              />
              <div
                className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'ne')}
                onTouchStart={(e) => handleResizeStart(e, 'ne')}
              />
              <div
                className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'nw')}
                onTouchStart={(e) => handleResizeStart(e, 'nw')}
              />
              {/* Edge handles */}
              <div
                className="absolute top-0 left-4 right-4 h-1.5 cursor-n-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'n')}
                onTouchStart={(e) => handleResizeStart(e, 'n')}
              />
              <div
                className="absolute bottom-0 left-4 right-4 h-1.5 cursor-s-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 's')}
                onTouchStart={(e) => handleResizeStart(e, 's')}
              />
              <div
                className="absolute left-0 top-4 bottom-4 w-1.5 cursor-w-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'w')}
                onTouchStart={(e) => handleResizeStart(e, 'w')}
              />
              <div
                className="absolute right-0 top-4 bottom-4 w-1.5 cursor-e-resize touch-none"
                onMouseDown={(e) => handleResizeStart(e, 'e')}
                onTouchStart={(e) => handleResizeStart(e, 'e')}
              />
            </>
          )}
        </>
      )}
    </Card>
  );
};

export default DraggableMiniChatWindow;

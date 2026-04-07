/**
 * ChatScreen.tsx
 * 
 * PURPOSE: Real-time messaging interface between two matched users.
 * 
 * KEY FEATURES:
 * - Real-time message updates via Supabase Realtime subscriptions
 * - Read receipts and message status indicators
 * - Date-grouped message display
 * - Online/offline status indicators
 * 
 * NOTE: Multilingual translation via Lingva (Google Translate scraper) for all 130+ languages.
 * 
 * DATABASE TABLES USED:
 * - chat_messages: Stores all chat messages
 * - profiles: User profile information
 * - user_status: Online/offline tracking
 */

// ============= IMPORTS SECTION =============
// React hooks for state, effects, and refs
import { useState, useEffect, useRef, useCallback } from "react";
// React Router hooks for navigation and URL parameters
import { useNavigate, useParams } from "react-router-dom";
// UI Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import MeowLogo from "@/components/MeowLogo";
import { translateForViewer } from "@/lib/translation-service";
import { Loader2 as PreviewSpinner } from 'lucide-react';
import { moderateMessage } from '@/lib/content-moderation';
// Toast notifications hook
import { useToast } from "@/hooks/use-toast";
// Lucide icons for UI elements
import { 
  ArrowLeft,
  Send,
  Circle,
  Loader2,
  MoreVertical,
  Check,
  CheckCheck,
  Paperclip,
  Image,
  FileText,
  Camera,
  X,
  UserPlus,
  UserMinus,
  Ban,
  Shield,
  Heart,
  AlertTriangle,
  PhoneOff,
  LogOut,
  Home,
  Phone,
  Video,
  Trash2,
  Pin
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Supabase client for database and realtime operations
import { supabase } from "@/integrations/supabase/client";
// Activity status tracking hook
import { useActivityStatus } from "@/hooks/useActivityStatus";
import VoiceMessagePlayer from "@/components/VoiceMessagePlayer";
import { ChatMessageInput } from "@/components/chat/ChatMessageInput";
import { classifyError, ERROR_MESSAGES } from "@/lib/errors";
import { useMessageSound } from "@/hooks/useMessageSound";
import { MessageActions } from "@/components/chat/MessageActions";
import { ReplyPreview } from "@/components/chat/ReplyPreview";
import { ForwardDialog } from "@/components/chat/ForwardDialog";
import { PinnedMessages } from "@/components/chat/PinnedMessages";
import { MessageReactions } from "@/components/chat/MessageReactions";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { useIncomingCallListener } from "@/hooks/useIncomingCallListener";
import { useWhatsAppCall } from "@/hooks/useWhatsAppCall";
import { WhatsAppCallScreen } from "@/components/WhatsAppCallScreen";
import { IncomingCallBanner } from "@/components/IncomingCallBanner";

// MAX_PARALLEL_CHATS is now loaded dynamically from app_settings
// Default fallback only used if database is unavailable
const DEFAULT_MAX_PARALLEL_CHATS = 3;

// ============= WHATSAPP COLOR TOKENS =============
const WA = {
  headerBg      : '#075E54',
  headerText    : '#FFFFFF',
  headerSub     : '#B2DFDB',
  chatBg        : '#E5DDD5',
  sentBubble    : '#DCF8C6',
  sentText      : '#111111',
  recvBubble    : '#FFFFFF',
  recvText      : '#111111',
  subtitleColor : '#888888',
  metaColor     : '#999999',
  tickRead      : '#4FC3F7',
  tickSent      : '#B0BEC5',
  inputBg       : '#F0F0F0',
  inputBarBg    : '#FFFFFF',
  dateSepBg     : 'rgba(255,255,255,0.75)',
  dateSepText   : '#555555',
  attachSheet   : '#FFFFFF',
  previewBarBg  : '#F0FBF8',
  previewBorder : '#075E54',
  onlineDot     : '#4CAF50',
  offlineDot    : '#9E9E9E',
};

/**
 * Message Interface
 * 
 * Defines the structure of a chat message object.
 */
interface Message {
  id: string;                    // UUID of the message
  senderId: string;              // UUID of sender
  message: string;               // Original message text
  translatedMessage?: string;    // Translated message for display
  englishText?: string;          // English translation shown below every bubble
  isTranslated?: boolean;        // Whether translation was applied
  isTranslating?: boolean;       // Whether translation is in progress
  isRead: boolean;               // Read receipt status
  createdAt: string;             // ISO timestamp of creation
  attachmentUrl?: string;        // URL of attached file/image
  attachmentType?: "image" | "file"; // Type of attachment
  sendFailed?: boolean;          // Whether send failed (for retry UI)
  replyToId?: string;            // Message this is replying to
  replyToText?: string;          // Text of replied message (for display)
  replyToSender?: string;        // Sender name of replied message
  isForwarded?: boolean;         // Whether message was forwarded
  isEdited?: boolean;            // Whether message was edited
  isPinned?: boolean;            // Whether message is pinned
  reactions?: { emoji: string; count: number; userReacted: boolean }[];
}

/**
 * ChatPartner Interface
 * 
 * Information about the other user in the chat.
 */
interface ChatPartner {
  userId: string;            // UUID of chat partner
  fullName: string;          // Display name
  avatar: string;            // Profile photo URL
  isOnline: boolean;         // Current online status
  preferredLanguage: string; // Language for translation target
}

/**
 * ChatScreen Component
 * 
 * Main chat interface component that handles:
 * - Message display and sending
 * - Real-time updates
 * - Automatic translation
 */
/** Renders chat attachment with signed URL resolution for private bucket */
const ChatAttachment = ({ url, isMine, resolveUrl }: { url: string; isMine: boolean; resolveUrl: (u: string) => Promise<string> }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveUrl(url).then((u) => {
      if (!cancelled) {
        if (u === '') {
          setFailed(true);
        } else {
          setResolvedUrl(u);
        }
      }
    });
    return () => { cancelled = true; };
  }, [url, resolveUrl]);

  // BUG-IMG-01 FIX: Show error state when signed URL fails
  if (failed) {
    return <div className={`rounded-2xl overflow-hidden px-4 py-3 ${isMine ? "bg-primary/80" : "bg-muted"}`}>
      <span className="text-sm text-destructive">Attachment unavailable</span>
    </div>;
  }

  if (!resolvedUrl) {
    return <div className={`rounded-2xl overflow-hidden px-4 py-3 ${isMine ? "bg-primary/80" : "bg-muted"}`}>
      <span className="text-sm text-muted-foreground">Loading attachment…</span>
    </div>;
  }

  // BUG-IMG-02 FIX: Detect image and video extensions
  const ext = url.split('.').pop()?.toLowerCase() || '';
  const isImage = /^(jpg|jpeg|png|gif|webp|heic|heif|bmp|avif)$/.test(ext);
  const isVideo = /^(mp4|webm|mov|avi|3gp|mkv)$/.test(ext);

  return (
    <div className={`rounded-2xl overflow-hidden ${isMine ? "rounded-br-md" : "rounded-bl-md"}`}>
      {isImage ? (
        <img
          src={resolvedUrl}
          alt="Attachment"
          className="max-w-[280px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(resolvedUrl, "_blank")}
        />
      ) : isVideo ? (
        <video
          src={resolvedUrl}
          controls
          playsInline
          className="max-w-[280px] max-h-[300px] rounded-xl"
        />
      ) : (
        <a
          href={resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-4 py-3 ${isMine ? "bg-primary/80" : "bg-muted"}`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-sm underline">Download File</span>
        </a>
      )}
    </div>
  );
};

/** BUG-VM-02 FIX: Resolves voice URL via signed URL before rendering player */
const ResolvedVoicePlayer = ({ voiceUrl, isMine, resolveUrl }: { voiceUrl: string; isMine: boolean; resolveUrl: (u: string) => Promise<string> }) => {
  const [resolved, setResolved] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    resolveUrl(voiceUrl).then(u => { if (!cancelled) setResolved(u); });
    return () => { cancelled = true; };
  }, [voiceUrl, resolveUrl]);
  if (!resolved || resolved === '') return <div className="text-xs text-muted-foreground px-2 py-1">Voice unavailable</div>;
  return <VoiceMessagePlayer audioUrl={resolved} isMine={isMine} />;
};

const ChatScreen = () => {
  // ============= HOOKS INITIALIZATION =============
  
  // Navigation hook for redirects
  const navigate = useNavigate();
   
  // Extract chat partner ID from URL parameter
  const { partnerId } = useParams<{ partnerId: string }>();
  
  // Toast notifications hook
  const { toast } = useToast();
  const { playMessageSound } = useMessageSound();
  
  // ============= STATE DECLARATIONS =============
  
  // Loading state during initial data fetch
  const [isLoading, setIsLoading] = useState(true);
  
  // Array of chat messages
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Current message being typed
  const [newMessage, setNewMessage] = useState("");
  
  // True while message is being sent
  const [isSending, setIsSending] = useState(false);
  
  // True when partner is typing (future feature)
  const [isTyping, setIsTyping] = useState(false);
  
  // Chat partner profile information
  const [chatPartner, setChatPartner] = useState<ChatPartner | null>(null);
  
  // Current authenticated user's ID
  const [currentUserId, setCurrentUserId] = useState<string>("");
  
  // Current user's preferred language (used for matching display)
  const [currentUserLanguage, setCurrentUserLanguage] = useState<string>("");
  
  // Current user's gender for billing/earnings display
  const [currentUserGender, setCurrentUserGender] = useState<"male" | "female">("male");
  
  // Attachment states
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  // Friend and block states
  const [isFriend, setIsFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByPartner, setIsBlockedByPartner] = useState(false);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [blockId, setBlockId] = useState<string | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Session and reconnection states
  const [sessionChatId, setSessionChatId] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  const [showStopChatDialog, setShowStopChatDialog] = useState(false);
  const [isStoppingChat, setIsStoppingChat] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Typing preview state (native + English subtitle while typing)
  const [previewNative, setPreviewNative] = useState("");
  const [previewEnglish, setPreviewEnglish] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [typingText, setTypingText] = useState("");
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Reply, Forward, Edit state
  const [replyTo, setReplyTo] = useState<{ id: string; text: string; senderName: string } | null>(null);
  const [forwardMsg, setForwardMsg] = useState<{ id: string; text: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; text: string } | null>(null);
  
  // ============= REFS =============
  
  // Reference to bottom of messages for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Store chat ID for realtime subscription (consistent format)
  const chatId = useRef<string>("");
  // Reactive state to trigger subscription re-run when chatId is set
  const [activeChatId, setActiveChatId] = useState<string>("");
  
  // CHT-01 FIX: Ref to avoid stale closures in realtime subscription
  const chatPartnerRef = useRef<ChatPartner | null>(null);
  const currentUserLanguageRef = useRef<string>("");
  const currentUserIdRef = useRef<string>("");
  
  // Refs for file inputs and camera
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Map temp message IDs to real DB IDs for translation resolution
  const tempToRealIdRef = useRef<Map<string, string>>(new Map());

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);
  
  // CHT-01 FIX: Keep refs in sync with state
  useEffect(() => { chatPartnerRef.current = chatPartner; }, [chatPartner]);
  useEffect(() => { currentUserLanguageRef.current = currentUserLanguage; }, [currentUserLanguage]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  
  // ============= ACTIVITY STATUS TRACKING =============
  
  // Track user activity and update online status
  const { setOnlineStatus } = useActivityStatus(currentUserId || null);
  
  // ============= INCOMING CALLS =============
  const { incomingCall, clearIncomingCall } = useIncomingCallListener(currentUserId || null, currentUserGender as 'male' | 'female');
  const { status: callStatus, activeCall, isMuted, isCameraOff, initiateCall, acceptCall, declineCall, endCall, toggleMute, toggleCamera } = useWhatsAppCall(currentUserId || null, currentUserGender as 'male' | 'female', walletBalance);
  
  // ============= AUTO-RECONNECT HANDLER =============
  
  /**
   * Handles auto-reconnection when partner disconnects or is busy
   */
  const handleAutoReconnect = useCallback(async (excludeUserIds: string[] = []) => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      toast({
        title: "Connection Failed",
        description: "Unable to find available users. Please try again later.",
        variant: "destructive"
      });
      reconnectAttemptsRef.current = 0;
      setIsReconnecting(false);
      return;
    }

    reconnectAttemptsRef.current++;
    setIsReconnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "auto_reconnect",
          man_user_id: currentUserId,
          exclude_user_ids: excludeUserIds
        }
      });

      if (error) throw error;

      if (data?.success && data.woman_user_id) {
        // Navigate to new chat partner
        reconnectAttemptsRef.current = 0;
        toast({
          title: "Reconnected!",
          description: `Connecting to ${data.profile?.full_name || "a new user"}...`
        });
        navigate(`/chat/${data.woman_user_id}`);
      } else {
        // No match found
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          // Retry
          await handleAutoReconnect(excludeUserIds);
        } else {
          toast({
            title: "No Users Available",
            description: "All users are currently busy. Please try again later.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Auto-reconnect error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to find available users",
        variant: "destructive"
      });
    } finally {
      setIsReconnecting(false);
    }
  }, [currentUserId, navigate, toast]);

  /**
   * useEffect: Initialize Chat
   * 
   * Runs when component mounts or partner ID changes.
   * Loads chat partner info and message history.
   */
  useEffect(() => {
    if (partnerId) {
      // Reset guard so a new partner triggers fresh initialization
      initializingRef.current = false;
      initializeChat(partnerId);
    }
  }, [partnerId]); // Re-run if partner ID changes

  /**
   * useEffect: Auto-scroll to Latest Message
   * 
   * Scrolls to bottom of message list whenever messages change.
   * Uses smooth scroll animation for better UX.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Re-run when messages array changes

  /**
   * useEffect: Real-time Message Subscription
   * 
   * Sets up Supabase Realtime subscription to listen for new messages.
   * Automatically translates incoming messages from partner.
   * 
   * IMPORTANT: Cleans up subscription on component unmount.
   */
  useEffect(() => {
    // Don't subscribe until chat ID is set
    if (!chatId.current) return;

    // Create realtime channel for this chat
    const channel = supabase
      .channel(`chat-${chatId.current}`)
      .on(
        'postgres_changes',  // Listen to database changes
        {
          event: 'INSERT',   // Only new messages
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId.current}` // Only this chat
        },
        async (payload: any) => {
          // Extract new message from payload
          const newMsg = payload.new;
          
          // CHT-01 FIX: Use refs to avoid stale closures
          const langToUse = currentUserLanguageRef.current || 'English';
          const userId = currentUserIdRef.current;
          const partner = chatPartnerRef.current;
          
          // For PARTNER messages: translate fully BEFORE adding to state (no spinner)
          // For OWN messages: preserve optimistic data
          let translatedMessage: string | undefined;
          let englishText: string | undefined;
          let isTranslated = false;

          if (newMsg.sender_id !== userId && langToUse) {
            const senderLang = partner?.preferredLanguage;
            try {
              const result = await translateForViewer(newMsg.message, langToUse, senderLang);
              translatedMessage = result.nativeText;
              englishText = result.englishText;
              isTranslated = translatedMessage !== newMsg.message;
            } catch {
              // Fallback: show original message
            }
          }

          // BUG-02 FIX: Add message to state with robust deduplication
          setMessages(prev => {
            // Skip if already in state (exact ID match)
            if (prev.some(m => m.id === newMsg.id)) return prev;
            
            // For own messages, preserve optimistic translation data
            if (newMsg.sender_id === userId) {
              const tempIdx = prev.findIndex(m =>
                m.id.startsWith('temp-') && m.senderId === newMsg.sender_id &&
                Math.abs(new Date(m.createdAt).getTime() - new Date(newMsg.created_at).getTime()) < 10000
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
                  isRead: newMsg.is_read,
                  createdAt: newMsg.created_at,
                };
                return updated;
              }
            }
            
            // Remove any remaining temp message from same sender within 10s window
            const filtered = prev.filter(m =>
              !(m.id.startsWith('temp-') && m.senderId === newMsg.sender_id &&
                Math.abs(new Date(m.createdAt).getTime() - new Date(newMsg.created_at).getTime()) < 10000)
            );
            return [...filtered, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              message: newMsg.message,
              translatedMessage,
              englishText,
              isTranslated,
              isRead: newMsg.is_read,
              createdAt: newMsg.created_at,
            }];
          });

          // Mark received messages as read automatically & play sound
          if (newMsg.sender_id !== userId) {
            markAsRead(newMsg.id);
            playMessageSound();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId.current}`
        },
        (payload: any) => {
          const updated = payload.new;
          const userId = currentUserIdRef.current;
          // Handle delete for everyone
          if (updated.deleted_for_everyone) {
            setMessages(prev => prev.filter(m => m.id !== updated.id));
            return;
          }
          // Handle delete for me
          if (updated.sender_id === userId && updated.deleted_for_sender) {
            setMessages(prev => prev.filter(m => m.id !== updated.id));
            return;
          }
          if (updated.receiver_id === userId && updated.deleted_for_receiver) {
            setMessages(prev => prev.filter(m => m.id !== updated.id));
            return;
          }
        }
      )
      .subscribe();

    // Cleanup function: remove channel on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatId]); // CHT-01 FIX: Only depend on activeChatId, use refs for everything else

  // Issue 2.2: Re-translate history when language loads late
  useEffect(() => {
    const langToUse = currentUserLanguage || 'English';
    if (langToUse && messages.length > 0) {
      const untranslated = messages.filter(m => !m.isTranslated && !m.translatedMessage);
      if (untranslated.length > 0) {
        translateHistoryMessages(messages, langToUse);
      }
    }
  }, [currentUserLanguage]);

  /**
   * useEffect: Monitor Partner Online Status and Session
   * 
   * Detects when partner goes offline or closes chat.
   * Triggers auto-reconnect for men when partner disconnects.
   */
  useEffect(() => {
    if (!chatPartner?.userId || !currentUserId) return;
    if (!chatId.current) return; // BUG-CHT-RT-01 FIX: guard against empty chatId
    // 15-second debounce timer for partner offline detection
    // Prevents brief network flickers from ending active chats
    let offlineDebounceTimer: NodeJS.Timeout | null = null;

    // Monitor partner's online status
    const statusChannel = supabase
      .channel(`partner-status-${chatPartner.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_status',
          filter: `user_id=eq.${chatPartner.userId}`
        },
        async (payload: any) => {
          const newStatus = payload.new;
          
          // Partner went offline - debounce for 15 seconds before acting
          if (!newStatus.is_online && isSessionActive) {
            setChatPartner(prev => prev ? { ...prev, isOnline: false } : null);
            
            // Clear any existing timer
            if (offlineDebounceTimer) clearTimeout(offlineDebounceTimer);
            
            offlineDebounceTimer = setTimeout(async () => {
              // Re-check partner status before disconnecting
              const { data: currentStatus } = await supabase
                .from("user_status")
                .select("is_online")
                .eq("user_id", chatPartner.userId)
                .maybeSingle();

              // Only disconnect if partner is still truly offline after 15s
              if (currentStatus && currentStatus.is_online === false) {
                setPartnerDisconnected(true);
                
                // If current user is male, trigger auto-reconnect
                if (currentUserGender === "male") {
                  toast({
                    title: "Partner Disconnected",
                    description: "Finding another available user..."
                  });
                  handleAutoReconnect([chatPartner.userId]);
                }
              } else {
                // Partner came back online within the debounce window
                setChatPartner(prev => prev ? { ...prev, isOnline: true } : null);
              }
            }, 15000); // 15-second debounce
          } else if (newStatus.is_online) {
            // Partner came back online - cancel any pending offline timer
            if (offlineDebounceTimer) {
              clearTimeout(offlineDebounceTimer);
              offlineDebounceTimer = null;
            }
            setPartnerDisconnected(false);
            setChatPartner(prev => prev ? { ...prev, isOnline: true } : null);
          }
        }
      )
      .subscribe();

    // BUG-CHT-RT-01 FIX: Guard against empty chatId to prevent subscribing to ALL sessions
    if (!chatId.current) {
      console.warn('[ChatScreen] session-monitor skipped: chatId.current is empty');
      return;
    }

    // Monitor active_chat_sessions for this conversation
    const sessionChannel = supabase
      .channel(`session-monitor-${chatId.current}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_chat_sessions',
          filter: `chat_id=eq.${chatId.current}`
        },
        (payload: any) => {
          const session = payload.new;
          
          // Check if this is our session and it was ended
          if (session.status === 'ended' && 
              (session.man_user_id === currentUserId || session.woman_user_id === currentUserId)) {
            
            setIsSessionActive(false);
            
            // If ended by partner (woman) and current user is man, auto-reconnect
            if (session.end_reason === 'woman_closed' || session.end_reason === 'partner_offline') {
              if (currentUserGender === "male") {
                toast({
                  title: "Chat Ended",
                  description: "Partner closed the chat. Finding another user..."
                });
                handleAutoReconnect([chatPartner.userId]);
              }
            } else if (session.end_reason === 'man_closed') {
              toast({
                title: "Chat Ended",
                description: "You ended the chat."
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (offlineDebounceTimer) clearTimeout(offlineDebounceTimer);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [chatPartner?.userId, currentUserId, currentUserGender, isSessionActive, handleAutoReconnect, toast]);

  // Typing preview: debounce 600ms, show native script + English subtitle
  useEffect(() => {
    if (!typingText.trim()) {
      setPreviewNative("");
      setPreviewEnglish("");
      setIsPreviewLoading(false);
      return;
    }
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    setIsPreviewLoading(true);
    previewDebounceRef.current = setTimeout(() => {
      let cancelled = false;
      const senderLang = currentUserLanguageRef.current || 'English';
      translateForViewer(typingText.trim(), senderLang, senderLang).then(result => {
        if (!cancelled) {
          setPreviewNative(result.nativeText);
          setPreviewEnglish(result.englishText);
          setIsPreviewLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setIsPreviewLoading(false);
      });
      return () => { cancelled = true; };
    }, 600);
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [typingText]);

  /**
   * translateHistoryMessages
   * 
   * Translates all loaded history messages for the current viewer.
   * Runs in background — updates messages as translations arrive.
   * Uses auto-detect so transliteration, native script, and English all work.
   */
  const translateHistoryMessages = useCallback(async (msgs: Message[], viewerLanguage: string) => {
    const batchSize = 5;
    for (let i = 0; i < msgs.length; i += batchSize) {
      const batch = msgs.slice(i, i + batchSize);
      const translationPromises = batch.map(async (msg) => {
        try {
          // CHT-05 FIX: Use refs for current values
          const msgSenderLang = msg.senderId === currentUserIdRef.current 
            ? currentUserLanguageRef.current 
            : chatPartnerRef.current?.preferredLanguage;
          const result = await translateForViewer(msg.message, viewerLanguage, msgSenderLang);
          return {
            id: msg.id,
            translatedMessage: result.nativeText,
            englishText: result.englishText,
            isTranslated: result.nativeText !== msg.message,
          };
        } catch {
          return null;
        }
      });

      const results = await Promise.allSettled(translationPromises);

      setMessages(prev => prev.map(m => {
        const translation = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value)
          .find(r => r && r.id === m.id);
        if (translation) {
          return {
            ...m,
            translatedMessage: translation.translatedMessage,
            englishText: translation.englishText,
            isTranslated: translation.isTranslated,
          };
        }
        return m;
      }));
    }
  }, []); // Stable — uses refs internally

  /**
   * initializeChat Function
   * 
   * Sets up the chat session:
   * 1. Gets current user info
   * 2. Generates consistent chat ID
   * 3. Fetches partner profile
   * 4. Loads message history
   * 5. Marks unread messages as read
   * 
   * @param partnerId - UUID of chat partner from URL
   */
  const initializingRef = useRef(false);
  const initializeChat = async (partnerId: string) => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    try {
      setIsLoading(true);

      // ============= GET CURRENT USER =============
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Not logged in - redirect to auth
        navigate("/");
        return;
      }
      const user = session.user;
      setCurrentUserId(user.id);

      // ============= GENERATE CHAT ID =============
      
      // Create consistent chat ID by sorting user IDs alphabetically
      // This ensures same chat ID regardless of who initiates
      const ids = [user.id, partnerId].sort();
      chatId.current = `${ids[0]}_${ids[1]}`;
      setActiveChatId(chatId.current);

      // ============= GET USER'S LANGUAGE PREFERENCE AND GENDER =============
      
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("preferred_language, primary_language, gender")
        .eq("user_id", user.id)
        .maybeSingle();
      
      // Also check user_languages for mother tongue
      const { data: userLanguages } = await supabase
        .from("user_languages")
        .select("language_name")
        .eq("user_id", user.id)
        .limit(1);
      
      const motherTongue = userLanguages?.[0]?.language_name || 
                          currentProfile?.primary_language ||
                          currentProfile?.preferred_language || 
                          "English";
      
      setCurrentUserLanguage(motherTongue);
      const userGender = currentProfile?.gender === "female" || currentProfile?.gender === "Female" ? "female" : "male";
      setCurrentUserGender(userGender);

      // Fetch wallet balance for call buttons
      if (userGender === "male") {
        try {
          const { data: walletRpc } = await supabase.rpc('get_men_wallet_balance', {
            p_user_id: user.id
          });
          if (walletRpc) {
            const wd = walletRpc as Record<string, number>;
            setWalletBalance(Number(wd.balance) || 0);
          }
        } catch {
          console.warn('[Chat] Wallet balance fetch failed');
        }

        // Subscribe to wallet balance changes in realtime
        const walletChannel = supabase
          .channel(`wallet-balance-${user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'users_wallet',  // BUG-VID-03 FIX: correct table name
            filter: `user_id=eq.${user.id}`,
          }, (payload: any) => {
            if (payload.new?.balance !== undefined) {
              setWalletBalance(Number(payload.new.balance) || 0);
            }
          })
          .subscribe();

        // Cleanup wallet subscription when component unmounts
        return () => {
          supabase.removeChannel(walletChannel);
        };
      }

      // ============= FETCH PARTNER PROFILE =============
      
      // Use secure RPC for partner profile (excludes sensitive fields)
      const { fetchPublicProfile } = await import("@/lib/profile-queries");
      let partnerProfile = await fetchPublicProfile(partnerId);

      // Note: Only real authenticated users from database - no sample/mock data fallbacks
      
      // Fetch partner's online status
      const { data: partnerStatus } = await supabase
        .from("user_status")
        .select("is_online")
        .eq("user_id", partnerId)
        .maybeSingle();

      // Fetch partner's mother tongue
      const { data: partnerLanguages } = await supabase
        .from("user_languages")
        .select("language_name")
        .eq("user_id", partnerId)
        .limit(1);

      // Determine partner info from profile
      if (partnerProfile) {
        const partnerMotherTongue = partnerLanguages?.[0]?.language_name || 
                              partnerProfile.primary_language ||
                              partnerProfile.preferred_language || 
                              "English";
        const partnerName = partnerProfile.full_name || "Anonymous";
        const partnerAvatar = partnerProfile.photo_url || "";
        const isPartnerOnline = partnerStatus?.is_online || false;

        setChatPartner({
          userId: partnerProfile.user_id,
          fullName: partnerName,
          avatar: partnerAvatar,
          isOnline: isPartnerOnline,
          preferredLanguage: partnerMotherTongue,
        });
      } else {
        // No partner found - show error
        toast({
          title: "Error",
          description: "Chat partner not found",
          variant: "destructive",
        });
        navigate(currentUserGender === "female" ? "/women-dashboard" : "/dashboard");
        return;
      }

      // ============= FETCH MESSAGE HISTORY =============
      
      // CHT-02 FIX: Limit to last 100 messages to avoid hitting Supabase 1000-row cap
      const { data: existingMessages } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId.current)
        .order("created_at", { ascending: false })
        .limit(100);
      
      // Reverse to get chronological order
      existingMessages?.reverse();

      // Transform database records to Message interface
      if (existingMessages) {
        // Filter out messages deleted for the current user
        const filteredMessages = existingMessages.filter(msg => {
          if ((msg as any).deleted_for_everyone) return false;
          if (msg.sender_id === user.id && (msg as any).deleted_for_sender) return false;
          if (msg.receiver_id === user.id && (msg as any).deleted_for_receiver) return false;
          return true;
        });
        const loadedMessages: Message[] = filteredMessages.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          message: msg.message,
          isRead: msg.is_read || false,
          createdAt: msg.created_at,
        }));
        setMessages(loadedMessages);

        // Translate all history messages for current viewer (in background)
        if (motherTongue) {
          translateHistoryMessages(loadedMessages, motherTongue);
        }

        // ============= MARK UNREAD MESSAGES AS READ =============
        
        // Find messages sent to current user that are unread
        const unreadIds = existingMessages
          .filter(m => m.receiver_id === user.id && !m.is_read)
          .map(m => m.id);
        
        // Batch update if there are unread messages
        if (unreadIds.length > 0) {
          await supabase
            .from("chat_messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      }

      // ============= CHECK FRIEND/BLOCK STATUS =============
      await checkFriendshipStatus(user.id, partnerId);
      await checkBlockStatus(user.id, partnerId);

    } catch (error) {
      console.error("Error initializing chat:", error);
      toast({ title: "Chat unavailable", description: ERROR_MESSAGES.chat.initFailed, variant: "destructive" });
    } finally {
      setIsLoading(false);
      initializingRef.current = false;
    }
  };

  /**
   * Check if users are friends
   */
  const checkFriendshipStatus = async (userId: string, partnerId: string) => {
    const { data } = await supabase
      .from("user_friends")
      .select("id, status")
      .or(`and(user_id.eq.${userId},friend_id.eq.${partnerId}),and(user_id.eq.${partnerId},friend_id.eq.${userId})`)
      .eq("status", "accepted")
      .maybeSingle();
    
    if (data) {
      setIsFriend(true);
      setFriendshipId(data.id);
    } else {
      setIsFriend(false);
      setFriendshipId(null);
    }
  };

  /**
   * Check if user is blocked or blocking
   */
  const checkBlockStatus = async (userId: string, partnerId: string) => {
    // Check if current user blocked the partner
    const { data: blockedByMe } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocked_by", userId)
      .eq("blocked_user_id", partnerId)
      .maybeSingle();
    
    if (blockedByMe) {
      setIsBlocked(true);
      setBlockId(blockedByMe.id);
    } else {
      setIsBlocked(false);
      setBlockId(null);
    }

    // Check if partner blocked current user
    const { data: blockedByPartner } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocked_by", partnerId)
      .eq("blocked_user_id", userId)
      .maybeSingle();
    
    setIsBlockedByPartner(!!blockedByPartner);
  };

  /**
   * Add friend
   */
  const handleAddFriend = async () => {
    if (!chatPartner || actionLoading) return;
    setActionLoading(true);

    try {
      const { data, error } = await supabase.rpc('send_friend_request', {
        p_target_user_id: chatPartner.userId,
      });

      if (error) throw error;

      toast({
        title: "Friend Request Sent",
        description: `A friend request has been sent to ${chatPartner.fullName}.`,
      });
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      const msg = error?.message?.includes('already')
        ? "A friend request already exists."
        : "Failed to send friend request";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Remove friend
   */
  const handleRemoveFriend = async () => {
    if (!chatPartner || actionLoading) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("user_friends")
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${chatPartner.userId}),and(user_id.eq.${chatPartner.userId},friend_id.eq.${currentUserId})`);

      if (error) throw error;

      setIsFriend(false);
      setFriendshipId(null);
      toast({
        title: "Friend Removed",
        description: `${chatPartner.fullName} has been removed from your friends.`,
      });
    } catch (error: any) {
      console.error("Error removing friend:", error);
      toast({
        title: "Error",
        description: "Failed to remove friend",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Block user
   */
  const handleBlockUser = async () => {
    if (!chatPartner || actionLoading) return;
    setActionLoading(true);
    setShowBlockDialog(false);

    try {
      const { data, error } = await supabase
        .from("user_blocks")
        .insert({
          blocked_by: currentUserId,
          blocked_user_id: chatPartner.userId,
          block_type: "permanent",
          reason: "Blocked by user"
        })
        .select()
        .single();

      if (error) throw error;

      setIsBlocked(true);
      setBlockId(data.id);
      
      // Also remove friendship if exists
      if (isFriend) {
        await supabase
          .from("user_friends")
          .delete()
          .or(`and(user_id.eq.${currentUserId},friend_id.eq.${chatPartner.userId}),and(user_id.eq.${chatPartner.userId},friend_id.eq.${currentUserId})`);
        setIsFriend(false);
        setFriendshipId(null);
      }

      toast({
        title: "User Blocked",
        description: `${chatPartner.fullName} has been blocked. You won't receive messages from them.`,
      });
    } catch (error: any) {
      console.error("Error blocking user:", error);
      toast({ title: "Could not block user", description: "Unable to block this user right now. Please try again.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Unblock user
   */
  const handleUnblockUser = async () => {
    if (!chatPartner || actionLoading || !blockId) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("id", blockId);

      if (error) throw error;

      setIsBlocked(false);
      setBlockId(null);
      toast({
        title: "User Unblocked",
        description: `${chatPartner.fullName} has been unblocked.`,
      });
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      toast({ title: "Could not unblock user", description: "Unable to unblock this user right now. Please try again.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Stop/End Chat
   * 
   * Allows user (especially men) to manually stop the chat.
   * This ends the billing session and closes the chat.
   */
  const handleStopChat = async () => {
    if (!chatPartner || isStoppingChat) return;
    setIsStoppingChat(true);
    setShowStopChatDialog(false);

    try {
      // End the chat session via chat-manager
      const { error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "end_chat",
          chat_id: chatId.current,
          end_reason: currentUserGender === "male" ? "man_closed" : "woman_closed"
        }
      });

      if (error) throw error;

      setIsSessionActive(false);
      
      toast({
        title: "Chat Ended",
        description: "You have ended this chat session."
      });

      // Navigate back to dashboard
      navigate(currentUserGender === "female" ? "/women-dashboard" : "/dashboard");
      
    } catch (error: any) {
      console.error("Error stopping chat:", error);
      toast({
        title: "Error",
        description: "Failed to end chat session",
        variant: "destructive"
      });
    } finally {
      setIsStoppingChat(false);
    }
  };

  /**
   * Handle going offline manually
   */
  const handleGoOffline = async () => {
    // End the active chat session before going offline
    if (chatId.current && isSessionActive) {
      try {
        await supabase.functions.invoke("chat-manager", {
          body: {
            action: "end_chat",
            chat_id: chatId.current,
            end_reason: "user_went_offline"
          }
        });
        setIsSessionActive(false);
      } catch (error) {
        console.error("[OFFLINE] Failed to end chat session:", error);
      }
    }

    await setOnlineStatus(false);
    toast({
      title: "You're now offline",
      description: "You won't receive new chat requests."
    });
    navigate(currentUserGender === "female" ? "/women-dashboard" : "/dashboard");
  };

  /**
   * markAsRead Function
   * 
   * Updates a message's is_read status to true.
   * Called when receiving messages from partner.
   * 
   * @param messageId - UUID of message to mark
   */
  const markAsRead = async (messageId: string) => {
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("id", messageId);
  };

  /**
   * Delete message for me or for everyone (WhatsApp-style)
   */
  const handleDeleteMessage = async (messageId: string, deleteType: 'for_me' | 'for_everyone') => {
    try {
      if (deleteType === 'for_everyone') {
        const { error } = await supabase
          .from('chat_messages')
          .update({
            deleted_for_everyone: true,
            deleted_for_sender: true,
            deleted_for_receiver: true,
            deleted_at: new Date().toISOString(),
          } as any)
          .eq('id', messageId);
        if (error) throw error;
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast({ title: 'Message deleted for everyone' });
      } else {
        const msg = messages.find(m => m.id === messageId);
        const isMsgSender = msg?.senderId === currentUserId;
        const updateField = isMsgSender ? 'deleted_for_sender' : 'deleted_for_receiver';
        const { error } = await supabase
          .from('chat_messages')
          .update({ [updateField]: true, deleted_at: new Date().toISOString() } as any)
          .eq('id', messageId);
        if (error) throw error;
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast({ title: 'Message deleted' });
      }
    } catch (err) {
      console.error('Delete message error:', err);
      toast({ title: 'Error', description: 'Failed to delete message', variant: 'destructive' });
    }
  };

  // === Reaction handler ===
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji)
        .maybeSingle();
      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('message_reactions').insert({ message_id: messageId, user_id: currentUserId, emoji } as any);
      }
    } catch (err) { console.error('Reaction error:', err); }
  };

  // === Reply handler ===
  const handleReply = (messageId: string, text: string, senderName: string) => {
    setReplyTo({ id: messageId, text, senderName });
  };

  // === Forward handler ===
  const handleForward = (messageId: string, text: string) => {
    setForwardMsg({ id: messageId, text });
  };

  // === Edit handler ===
  const handleStartEdit = (messageId: string, currentText: string) => {
    setEditingMsg({ id: messageId, text: currentText });
  };

  const handleSaveEdit = async (newText: string) => {
    if (!editingMsg) return;
    try {
      await supabase.from('chat_messages').update({
        message: newText,
        is_edited: true,
        edited_at: new Date().toISOString(),
        original_message: editingMsg.text,
      } as any).eq('id', editingMsg.id);
      setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, message: newText, isEdited: true } : m));
      setEditingMsg(null);
      toast({ title: 'Message edited' });
    } catch (err) {
      console.error('Edit error:', err);
      toast({ title: 'Error', description: 'Failed to edit message', variant: 'destructive' });
    }
  };

  // === Pin handler ===
  const handlePinToggle = async (messageId: string, isPinned: boolean) => {
    try {
      await supabase.from('chat_messages').update({
        is_pinned: !isPinned,
        pinned_at: !isPinned ? new Date().toISOString() : null,
        pinned_by: !isPinned ? currentUserId : null,
      } as any).eq('id', messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isPinned: !isPinned } : m));
      toast({ title: isPinned ? 'Message unpinned' : 'Message pinned' });
    } catch (err) {
      console.error('Pin error:', err);
    }
  };


  /**
   * handleSendMessage Function
   * 
   * Sends a new message to the chat partner.
   * Messages are sent as plain text; translation happens via realtime subscription.
   */
  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isSending) return;
    if (!chatPartner) {
      toast({
        title: "Not ready",
        description: "Chat is still loading. Please wait.",
        variant: "destructive",
      });
      return;
    }

    // Check if blocked
    if (isBlocked || isBlockedByPartner) {
      toast({
        title: "Cannot Send Message",
        description: isBlocked 
          ? "You have blocked this user. Unblock to send messages."
          : "You cannot send messages to this user.",
        variant: "destructive",
      });
      return;
    }

    // Content moderation - block phone numbers, emails, social media
    const moderationResult = moderateMessage(messageText);
    if (moderationResult.isBlocked) {
      toast({
        title: "Message Blocked",
        description: moderationResult.reason,
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const senderLang = currentUserLanguageRef.current || 'English';

    // Show a pending bubble, but only send after full async translation resolves
    setMessages(prev => [...prev, {
      id: tempId,
      senderId: currentUserId,
      message: messageText,
      translatedMessage: undefined,
      englishText: undefined,
      isTranslated: false,
      isRead: false,
      isTranslating: true,
      createdAt: new Date().toISOString(),
    }]);

    try {
      let actualMessage = messageText;
      let englishSubtitle: string | undefined;

      try {
        const result = await translateForViewer(messageText, senderLang, senderLang);
        actualMessage = result.nativeText?.trim() || messageText;
        englishSubtitle = result.englishText?.trim() || undefined;
      } catch {
        try {
          const { getEnglishTranslation } = await import("@/lib/translation-service");
          englishSubtitle = (await getEnglishTranslation(messageText, 'auto'))?.trim() || undefined;
        } catch {
          englishSubtitle = undefined;
        }
      }

      setMessages(prev => prev.map(m => {
        const realId = tempToRealIdRef.current.get(tempId);
        if (m.id === tempId || (realId && m.id === realId)) {
          return {
            ...m,
            message: actualMessage,
            englishText: englishSubtitle,
            isTranslating: false,
          };
        }
        return m;
      }));

      const insertData: any = {
          chat_id: chatId.current,
          sender_id: currentUserId,
          receiver_id: chatPartner.userId,
          message: actualMessage,
        };
      if (replyTo) {
        insertData.reply_to_id = replyTo.id;
        setReplyTo(null);
      }
      const { error } = await supabase
        .from("chat_messages")
        .insert(insertData);

      if (error) {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== tempId));
        throw error;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // UX-03 FIX: Keep failed message in state with sendFailed flag for retry
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, sendFailed: true } : m
      ));
      toast({ title: "Message not sent", description: "Tap the message to retry.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Handle Image Selection
   */
   const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Accept by MIME type OR by common image extension (some devices report empty/wrong MIME)
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const mediaExts = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "tiff", "avif", "svg",
                          "mp4", "webm", "mov", "avi", "mkv", "3gp"];
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/") || mediaExts.includes(ext);
      if (!isMedia) {
        toast({
          title: "Invalid file",
          description: "Please select an image or video file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "File too large",
          description: "Maximum image size is 50MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(file.type.startsWith("video/") ? null : URL.createObjectURL(file));
      setIsAttachmentOpen(false);
    }
  };

  /**
   * Handle File Selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "File too large",
          description: "Maximum file size is 50MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(null);
      setIsAttachmentOpen(false);
    }
  };

  /**
   * Open Camera for Selfie
   */
  const openCamera = async () => {
    try {
      // BUG-SELFIE-01 FIX: Acquire stream BEFORE setting state (iOS Safari)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" },
        audio: false 
      });
      streamRef.current = stream;
      setIsAttachmentOpen(false);
      setIsCameraOpen(true);
      // Stream will be assigned to video ref via useEffect below
    } catch (error) {
      console.error("Camera error:", error);
      const camErr = classifyError(error);
      toast({ title: camErr.title, description: camErr.message, variant: "destructive" });
    }
  };

  // BUG-SELFIE-01 FIX: Assign stream to video element after render
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  /**
   * Capture Selfie
   */
  const captureSelfie = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    // BUG-SELFIE-03 FIX: Check video is actually playing before capture
    const doCapture = () => {
      if (video.videoWidth === 0) {
        requestAnimationFrame(doCapture);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: "image/jpeg" });
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(blob));
            closeCamera();
          }
        }, "image/jpeg", 0.8);
      }
    };
    doCapture();
  };

  /**
   * Close Camera
   */
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  /**
   * Cancel Selected File
   */
  const cancelSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Upload File to Supabase Storage
   */
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const randomSuffix = crypto.randomUUID().slice(0, 8);
      const storagePath = `${currentUserId}/${chatId.current}/${Date.now()}-${randomSuffix}.${fileExt}`;
      
      // Determine content type — use file.type if available, otherwise infer from extension
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
        webp: "image/webp", heic: "image/heic", heif: "image/heif", bmp: "image/bmp",
        tiff: "image/tiff", avif: "image/avif", svg: "image/svg+xml",
        mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", avi: "video/x-msvideo",
        mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/x-m4a",
        pdf: "application/pdf", doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        txt: "text/plain", csv: "text/csv", rtf: "application/rtf",
        zip: "application/zip",
      };
      const extLower = (fileExt || "").toLowerCase();
      const contentType = file.type || mimeMap[extLower] || "application/octet-stream";

      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .upload(storagePath, file, { cacheControl: "3600", upsert: false, contentType });
      
      if (error) throw error;
      
      // Store the raw path — signed URLs are generated at display time
      return `chat-attachment://${storagePath}`;
    } catch (error) {
      console.error("Upload error:", error);
      const classified = classifyError(error);
      toast({ title: classified.title, description: classified.message, variant: "destructive" });
      return null;
    }
  };

  /**
   * Send Message with Attachment
   */
  const handleSendWithAttachment = async () => {
    if (!selectedFile || !chatPartner || isSending) return;

    setIsSending(true);
    setIsUploading(true);

    try {
      const attachmentUrl = await uploadFile(selectedFile);
      if (!attachmentUrl) {
        throw new Error("Failed to upload file");
      }

      const attachmentType = selectedFile.type.startsWith("image/") ? "image" : "file";
      const videoExts = ["mp4", "webm", "mov", "avi", "mkv", "3gp"];
      const isVideo = selectedFile.type.startsWith("video/") || videoExts.includes((selectedFile.name.split(".").pop() || "").toLowerCase());
      const messageText = newMessage.trim() || (attachmentType === "image" ? "📷 Image" : isVideo ? "🎬 Video" : `📎 ${selectedFile.name}`);

      const { error } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId.current,
          sender_id: currentUserId,
          receiver_id: chatPartner.userId,
          message: `${messageText}\n[attachment:${attachmentUrl}]`,
        });

      if (error) throw error;

      setNewMessage("");
      cancelSelectedFile();
      toast({
        title: "Sent",
        description: attachmentType === "image" ? "Image sent successfully" : "File sent successfully",
      });
    } catch (error) {
      console.error("Error sending attachment:", error);
      toast({ title: "Attachment not sent", description: ERROR_MESSAGES.chat.attachmentFailed, variant: "destructive" });
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  /**
   * Extract Attachment from Message
   */
  const extractAttachment = (message: string): { text: string; attachmentUrl?: string; voiceUrl?: string } => {
    // Check for voice message — supports both 🎤voice:path and [VOICE:url] formats
    const voiceMatch = message.match(/🎤voice:(.+)/) || message.match(/\[VOICE:(.*?)\]/);
    if (voiceMatch) {
      const voicePath = voiceMatch[1];
      // BUG-VM-02 FIX: Use signed URL scheme instead of public URL for private bucket
      const voiceUrl = voicePath.startsWith('http')
        ? voicePath
        : `chat-attachment://${voicePath}`;
      return { text: '', voiceUrl };
    }
    
    // Check for regular attachment
    const attachmentMatch = message.match(/\[attachment:(.*?)\]/);
    if (attachmentMatch) {
      const text = message.replace(/\n?\[attachment:.*?\]/, "").trim();
      return { text, attachmentUrl: attachmentMatch[1] };
    }
    return { text: message };
  };

  // Signed URL cache for chat attachments
  const signedUrlCache = useRef<Map<string, string>>(new Map());

  /**
   * Resolve attachment URL — generates signed URL for private bucket paths,
   * passes through legacy public URLs unchanged.
   */
  const resolveAttachmentUrl = useCallback(async (url: string): Promise<string> => {
    if (!url.startsWith('chat-attachment://')) return url;

    const cached = signedUrlCache.current.get(url);
    if (cached) return cached;

    const storagePath = url.replace('chat-attachment://', '');
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(storagePath, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      console.error('[Chat] Failed to generate signed URL:', error?.message);
      return '';  // BUG-IMG-01 FIX: return empty so ChatAttachment shows error UI
    }

    signedUrlCache.current.set(url, data.signedUrl);
    return data.signedUrl;
  }, []);

  /**
   * formatTime Function
   * 
   * Formats timestamp to local time string (HH:MM format).
   * 
   * @param dateString - ISO date string
   * @returns Formatted time string
   */
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  /**
   * formatDate Function
   * 
   * Formats date for message grouping headers.
   * Returns "Today", "Yesterday", or date string.
   * 
   * @param dateString - ISO date string
   * @returns Human-readable date label
   */
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

  /**
   * groupedMessages
   * 
   * Groups messages by date for section headers.
   * Uses reduce to create object with date keys and message arrays.
   */
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  // ============= LOADING STATE RENDER =============
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: WA.chatBg }}>
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: WA.headerBg }} />
          <p style={{ color: WA.metaColor }}>Loading chat...</p>
        </div>
      </div>
    );
  }

  // ============= MAIN RENDER =============
  
  return (
    <div className="min-h-screen flex flex-col" style={{ background: WA.chatBg }}>
      {/* ============= INCOMING CALL BANNER ============= */}
      {incomingCall && callStatus === 'idle' && (
        <IncomingCallBanner
          callerName={incomingCall.callerName}
          callerPhoto={incomingCall.callerPhoto}
          callType={incomingCall.callType}
          onAccept={() => {
            acceptCall(incomingCall.callId, incomingCall.callType, incomingCall.callerUserId, incomingCall.callerName, incomingCall.callerPhoto);
            clearIncomingCall();
          }}
          onDecline={() => {
            declineCall(incomingCall.callId);
            clearIncomingCall();
          }}
        />
      )}
      {/* ============= WHATSAPP CALL SCREEN ============= */}
      {(callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'active') && (
        <WhatsAppCallScreen
          status={callStatus}
          activeCall={activeCall}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
        />
      )}
      {/* ============= HEADER SECTION ============= */}
      <header className="sticky top-0 z-50 pt-[env(safe-area-inset-top)]" style={{ background: WA.headerBg }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          {/* Back button */}
          <button 
            onClick={() => {
              const dashboardPath = currentUserGender === "female" ? "/women-dashboard" : "/dashboard";
              window.history.length > 1 ? navigate(-1) : navigate(dashboardPath);
            }}
            className="p-1.5 rounded-full transition-colors"
            style={{ color: WA.headerText }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Chat partner info - clickable to view profile */}
          {chatPartner && (
            <div 
              className="flex items-center gap-2.5 flex-1 cursor-pointer"
              onClick={() => navigate(`/profile/${chatPartner.userId}`)}
            >
              {/* Partner avatar with online indicator */}
              <div className="relative">
                {chatPartner.avatar ? (
                  <img 
                    src={chatPartner.avatar} 
                    alt={chatPartner.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                    style={{ border: '2px solid rgba(255,255,255,0.2)' }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <span className="text-lg font-bold" style={{ color: WA.headerText }}>
                      {chatPartner.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full"
                  style={{
                    background: chatPartner.isOnline ? WA.onlineDot : WA.offlineDot,
                    border: `2px solid ${WA.headerBg}`,
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: 15, fontWeight: 500, color: WA.headerText }}>{chatPartner.fullName}</p>
                <p className="flex items-center gap-1" style={{ fontSize: 12, color: WA.headerSub }}>
                  {chatPartner.isOnline ? (
                    <span style={{ color: WA.headerSub }}>Online</span>
                  ) : (
                    <span>Offline</span>
                  )}
                  {chatPartner.preferredLanguage !== currentUserLanguage && (
                    <>
                      <span>•</span>
                      <span>{chatPartner.preferredLanguage}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Audio & Video Call Buttons - Only men can initiate calls */}
          {currentUserGender === "male" && chatPartner && (
          <div className="flex items-center gap-0.5">
            <button
              className="p-1.5 rounded-full transition-colors"
              style={{ color: WA.headerText }}
              onClick={() => initiateCall(chatPartner.userId, chatPartner.fullName, chatPartner.avatar, 'audio')}
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              className="p-1.5 rounded-full transition-colors"
              style={{ color: WA.headerText }}
              onClick={() => initiateCall(chatPartner.userId, chatPartner.fullName, chatPartner.avatar, 'video')}
            >
              <Video className="w-5 h-5" />
            </button>
          </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-full transition-colors" style={{ color: WA.headerText }}>
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Friend Status Indicator */}
              {isFriend && (
                <div className="px-2 py-1.5 text-xs text-success flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-current" />
                  Friends
                </div>
              )}
              
              {/* Friend/Unfriend - Available for both genders */}
              {isFriend ? (
                <DropdownMenuItem 
                  onClick={handleRemoveFriend}
                  disabled={actionLoading}
                  className="text-destructive focus:text-destructive"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Unfriend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={handleAddFriend}
                  disabled={actionLoading || isBlocked}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Send Friend Request
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {/* Block/Unblock - Available for both genders */}
              {isBlocked ? (
                <DropdownMenuItem 
                  onClick={handleUnblockUser}
                  disabled={actionLoading}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Unblock User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={() => setShowBlockDialog(true)}
                  disabled={actionLoading}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Block User
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {/* View Profile - Available for both genders */}
              <DropdownMenuItem 
                onClick={() => chatPartner && navigate(`/profile/${chatPartner.userId}`)}
              >
                <Circle className="w-4 h-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              
              {/* CHT-11 FIX: Stop Chat - Available for both genders */}
              {(
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowStopChatDialog(true)}
                    disabled={isStoppingChat}
                    className="text-destructive focus:text-destructive"
                  >
                    <PhoneOff className="w-4 h-4 mr-2" />
                    Stop Chat
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              
              {/* Go Offline - Available for both genders */}
              <DropdownMenuItem 
                onClick={handleGoOffline}
                className="text-warning focus:text-warning"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Go Offline
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Block {chatPartner?.fullName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent you from receiving messages from this user. 
              They won't be notified that you blocked them.
              {isFriend && " This will also remove them from your friends list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBlockUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stop Chat Confirmation Dialog - Both genders */}
      {(
        <AlertDialog open={showStopChatDialog} onOpenChange={setShowStopChatDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <PhoneOff className="w-5 h-5 text-destructive" />
                Stop Chat?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will end the current chat session.{currentUserGender === "male" ? " Billing will stop and you'll be disconnected from this conversation." : " You'll be disconnected from this conversation."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleStopChat}
                className="bg-destructive hover:bg-destructive/90"
                disabled={isStoppingChat}
              >
                {isStoppingChat ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  "Stop Chat"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Blocked by partner warning */}
      {isBlockedByPartner && (
        <div className="px-4 py-2" style={{ background: 'rgba(198,40,40,0.08)' }}>
          <p style={{ fontSize: 12, color: '#C62828', textAlign: 'center' }}>
            You cannot send messages to this user.
          </p>
        </div>
      )}

      {/* Your own block warning */}
      {isBlocked && (
        <div className="px-4 py-2" style={{ background: 'rgba(198,40,40,0.08)' }}>
          <p style={{ fontSize: 12, color: '#C62828', textAlign: 'center' }}>
            You have blocked this user. Unblock to send messages.
          </p>
        </div>
      )}

      {/* Translation happens automatically via realtime subscription */}

      {/* ============= MESSAGES AREA ============= */}
      <main className="flex-1 overflow-y-auto wa-chat-scroll px-3 py-2" style={{ background: WA.chatBg }}>
        <div className="space-y-1">
          {/* Iterate through date groups */}
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="space-y-1">
              {/* Date separator label */}
              <div className="flex justify-center my-2">
                <div
                  className="px-3 py-1 rounded-lg shadow-sm"
                  style={{ background: WA.dateSepBg, color: WA.dateSepText, fontSize: 11, fontWeight: 500 }}
                >
                  {date}
                </div>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message, index) => {
                // Determine if message is from current user
                const isMine = message.senderId === currentUserId;
                // Show avatar only for first message in sequence from same sender
                const showAvatar = !isMine && (index === 0 || dateMessages[index - 1]?.senderId !== message.senderId);
                // Extract attachment from message
                const { text: messageText, attachmentUrl, voiceUrl } = extractAttachment(message.message);
                
                // Display: translated native text if available, otherwise original
                // Per spec: both sender AND receiver see native script of their own language
                const displayText = message.translatedMessage || messageText;
                // English subtitle shown below EVERY bubble (per spec)
                const englishSubtitle = message.englishText;
                
                // Skip empty voice message placeholders
                if (message.message === '🎤 Voice message' || message.message.startsWith('🎤voice:') && !extractAttachment(message.message).voiceUrl) {
                  return null;
                }

                return (
                  <MessageActions
                    key={message.id}
                    messageId={message.id}
                    messageText={displayText || message.message}
                    senderId={message.senderId}
                    currentUserId={currentUserId}
                    chatId={activeChatId}
                    createdAt={message.createdAt}
                    isPinned={message.isPinned}
                    senderName={isMine ? "You" : (chatPartner?.fullName || "")}
                    onReply={handleReply}
                    onForward={handleForward}
                    onEdit={handleStartEdit}
                    onDelete={handleDeleteMessage}
                    onReaction={handleReaction}
                    onPinToggle={handlePinToggle}
                  >
                    <div
                      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-[2px]`}
                    >
                      <div className={`flex items-end gap-1 ${isMine ? "flex-row-reverse" : ""}`} style={{ maxWidth: '72%' }}>
                        {!isMine && (
                          <div className="w-8 flex-shrink-0">
                            {showAvatar && chatPartner?.avatar ? (
                              <img src={chatPartner.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : showAvatar ? (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#DDD' }}>
                                <span className="text-xs font-bold" style={{ color: '#555' }}>{chatPartner?.fullName.charAt(0).toUpperCase()}</span>
                              </div>
                            ) : <div className="w-8" />}
                          </div>
                        )}
                        <div>
                          {message.isForwarded && (
                            <span style={{ fontSize: 11, color: WA.metaColor, fontStyle: 'italic' }} className="block mb-0.5 px-1">↗ Forwarded</span>
                          )}

                          {/* Reply quote */}
                          {message.replyToText && (
                            <ReplyPreview replyToText={message.replyToText} replyToSender={message.replyToSender || ''} isOwn={isMine} compact />
                          )}

                          {voiceUrl && (
                            <div style={{
                              background: isMine ? WA.sentBubble : WA.recvBubble,
                              borderRadius: isMine ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                              padding: '6px 10px 4px 10px',
                              boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                            }}>
                              <ResolvedVoicePlayer voiceUrl={voiceUrl} isMine={isMine} resolveUrl={resolveAttachmentUrl} />
                            </div>
                          )}
                          {attachmentUrl && (
                            <div style={{
                              borderRadius: isMine ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                              overflow: 'hidden',
                              boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                            }}>
                              <ChatAttachment url={attachmentUrl} isMine={isMine} resolveUrl={resolveAttachmentUrl} />
                            </div>
                          )}
                          
                          {displayText && !displayText.startsWith("📷") && !displayText.startsWith("📎") && !voiceUrl && (
                            <div style={{
                              background: isMine ? WA.sentBubble : WA.recvBubble,
                              borderRadius: isMine ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                              padding: '6px 10px 4px 10px',
                              boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                            }}>
                              {message.isTranslating ? (
                                <div className="flex items-center gap-1.5 py-1">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: WA.metaColor }} />
                                  <span style={{ fontSize: 12, color: WA.metaColor }}>Translating...</span>
                                </div>
                              ) : (
                                <>
                                  <p className="whitespace-pre-wrap break-words unicode-text" style={{ fontSize: 14, color: isMine ? WA.sentText : WA.recvText }} dir="auto">{displayText}</p>
                                  {englishSubtitle && englishSubtitle.toLowerCase() !== displayText.toLowerCase() && (
                                    <p className="whitespace-pre-wrap break-words" style={{ fontSize: 10, color: WA.subtitleColor, fontStyle: 'italic', marginTop: 2 }} dir="ltr">english: {englishSubtitle.toLowerCase()}</p>
                                  )}
                                </>
                              )}
                              {/* Meta row */}
                              <div className="flex items-center justify-end gap-[3px]" style={{ marginTop: 2 }}>
                                <span style={{ fontSize: 11, color: WA.metaColor }}>{formatTime(message.createdAt)}</span>
                                {message.isEdited && <span style={{ fontSize: 10, color: WA.metaColor, fontStyle: 'italic' }}>edited</span>}
                                {message.isPinned && <Pin className="w-3 h-3" style={{ color: WA.headerBg }} />}
                                {isMine && (message.isRead ? <CheckCheck className="w-[14px] h-[14px]" style={{ color: WA.tickRead }} /> : <Check className="w-[14px] h-[14px]" style={{ color: WA.tickSent }} />)}
                              </div>
                            </div>
                          )}

                          {/* Meta row for voice/attachment-only messages */}
                          {(voiceUrl || attachmentUrl) && (!displayText || displayText.startsWith("📷") || displayText.startsWith("📎")) && (
                            <div className="flex items-center justify-end gap-[3px] px-1" style={{ marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: WA.metaColor }}>{formatTime(message.createdAt)}</span>
                              {isMine && (message.isRead ? <CheckCheck className="w-[14px] h-[14px]" style={{ color: WA.tickRead }} /> : <Check className="w-[14px] h-[14px]" style={{ color: WA.tickSent }} />)}
                            </div>
                          )}

                          {/* Reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <MessageReactions reactions={message.reactions} onToggle={(emoji) => handleReaction(message.id, emoji)} isOwn={isMine} />
                          )}
                        </div>
                      </div>
                    </div>
                  </MessageActions>
                );
              })}
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start mb-[2px]">
              <div style={{
                background: WA.recvBubble,
                borderRadius: '8px 8px 8px 2px',
                padding: '10px 14px',
                display: 'inline-flex',
                gap: 4,
                alignItems: 'center',
                boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
              }}>
                <span className="wa-typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#999', animationDelay: '0s' }} />
                <span className="wa-typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#999', animationDelay: '0.2s' }} />
                <span className="wa-typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#999', animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          {/* Invisible element at bottom for auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ============= CAMERA MODAL ============= */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.6)', padding: '12px 16px' }}>
            <button onClick={closeCamera} className="p-2" style={{ color: 'white' }}>
              <X className="w-6 h-6" />
            </button>
            <span style={{ color: 'white', fontSize: 16, fontWeight: 500 }}>Take Selfie</span>
            <div className="w-10" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="max-w-full max-h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          </div>
          <div className="p-6 flex justify-center">
            <button 
              onClick={captureSelfie}
              className="flex items-center justify-center"
              style={{ width: 64, height: 64, borderRadius: '50%', background: WA.headerBg, border: '4px solid rgba(255,255,255,0.8)' }}
            >
              <Camera className="w-7 h-7" style={{ color: 'white' }} />
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* ============= MESSAGE INPUT AREA ============= */}
      <footer className="sticky bottom-0 pb-[env(safe-area-inset-bottom)]" style={{ background: WA.inputBarBg }}>
        <div>
          {/* Issue 2.3: Show explanation when blocked */}
          {(isBlocked || isBlockedByPartner) && (
            <div className="flex items-center gap-2 px-3 py-2 mx-2 mb-1 rounded-md" style={{ background: 'rgba(198,40,40,0.08)' }}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#C62828' }} />
              <span style={{ fontSize: 12, color: '#C62828' }}>{isBlocked ? "You have blocked this user. Unblock to send messages." : "You cannot send messages to this user."}</span>
            </div>
          )}
          
          {/* Typing preview — native script + English subtitle */}
          {typingText.trim() && (previewNative || isPreviewLoading) && (
            <div className="mx-4 mb-1 px-3 py-2 rounded-lg bg-muted/50 border border-border/30">
              {isPreviewLoading ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Translating preview...</span>
                </div>
              ) : (
                <>
                  <p className="text-sm unicode-text text-foreground" dir="auto">{previewNative}</p>
                  {previewEnglish && previewEnglish.toLowerCase() !== previewNative.toLowerCase() && (
                    <p className="text-[10px] text-muted-foreground/70 italic mt-0.5" dir="ltr">
                      english: {previewEnglish.toLowerCase()}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* WhatsApp-style Chat Input — text only, no attachments */}
          <ChatMessageInput
            onSendMessage={async (msg) => {
              await handleSendMessage(msg);
              setTypingText("");
              setPreviewNative("");
              setPreviewEnglish("");
            }}
            onInputChange={setTypingText}
            disabled={isSending || isBlocked || isBlockedByPartner}
            userLanguage={currentUserLanguage || "english"}
          />
        </div>
      </footer>
    </div>
  );
};

// Export as default for router
export default ChatScreen;

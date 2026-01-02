/**
 * ChatScreen.tsx
 * 
 * PURPOSE: Real-time messaging interface between two matched users.
 * Features automatic message translation using NLLB-200 neural translation.
 * 
 * KEY FEATURES:
 * - Real-time message updates via Supabase Realtime subscriptions
 * - Automatic language translation for cross-language communication
 * - Read receipts and message status indicators
 * - Date-grouped message display
 * - Online/offline status indicators
 * 
 * DATABASE TABLES USED:
 * - chat_messages: Stores all chat messages
 * - profiles: User profile information
 * - user_status: Online/offline tracking
 * 
 * EDGE FUNCTIONS USED:
 * - translate-message: NLLB-200 based neural translation
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
// App logo component
import MeowLogo from "@/components/MeowLogo";
// Toast notifications hook
import { useToast } from "@/hooks/use-toast";
// Translation hook
import { useTranslation } from "@/contexts/TranslationContext";
// Lucide icons for UI elements
import { 
  ArrowLeft,    // Back navigation icon
  Send,         // Send message icon
  Circle,       // Status indicator
  Languages,    // Translation indicator icon
  Loader2,      // Loading spinner
  MoreVertical, // Options menu icon
  Check,        // Single check (sent)
  CheckCheck,   // Double check (read)
  Paperclip,    // Attachment icon
  Image,        // Image upload icon
  FileText,     // File upload icon
  Camera,       // Selfie/camera icon
  X,            // Close icon
  UserPlus,     // Add friend icon
  UserMinus,    // Remove friend icon
  Ban,          // Block icon
  Shield,       // Unblock icon
  Heart,        // Friend icon
  AlertTriangle, // Warning icon
  PhoneOff,     // Stop chat icon
  LogOut        // Leave chat icon
} from "lucide-react";
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
// Billing and earnings display components
import ChatBillingDisplay from "@/components/ChatBillingDisplay";
import ChatEarningsDisplay from "@/components/ChatEarningsDisplay";
// Activity status tracking hook
import { useActivityStatus } from "@/hooks/useActivityStatus";
// Voice-to-text component
// Voice message components
// Voice message components
import VoiceMessageRecorder from "@/components/VoiceMessageRecorder";
import VoiceMessagePlayer from "@/components/VoiceMessagePlayer";
import GiftSendButton from "@/components/GiftSendButton";

// MAX_PARALLEL_CHATS is now loaded dynamically from app_settings
// Default fallback only used if database is unavailable
const DEFAULT_MAX_PARALLEL_CHATS = 3;

/**
 * Message Interface
 * 
 * Defines the structure of a chat message object.
 * Contains both original and translated content.
 */
interface Message {
  id: string;                    // UUID of the message
  senderId: string;              // UUID of sender
  message: string;               // Original message text
  translatedMessage?: string;    // Translated version (optional)
  isTranslated: boolean;         // Whether translation was applied
  isRead: boolean;               // Read receipt status
  createdAt: string;             // ISO timestamp of creation
  attachmentUrl?: string;        // URL of attached file/image
  attachmentType?: "image" | "file"; // Type of attachment
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
const ChatScreen = () => {
  // ============= HOOKS INITIALIZATION =============
  
  // Navigation hook for redirects
  const navigate = useNavigate();
  
  // Extract chat partner ID from URL parameter
  const { chatId: partnerId } = useParams<{ chatId: string }>();
  
  // Toast notifications hook
  const { toast } = useToast();
  
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
  
  // Current user's preferred language for translations
  const [currentUserLanguage, setCurrentUserLanguage] = useState<string>("");
  
  // Toggle for showing/hiding translation previews
  const [showTranslations, setShowTranslations] = useState(true);
  
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
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  
  // ============= REFS =============
  
  // Reference to bottom of messages for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Store chat ID for realtime subscription (consistent format)
  const chatId = useRef<string>("");
  
  // Refs for file inputs and camera
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // ============= ACTIVITY STATUS TRACKING =============
  
  // Track user activity and update online status
  const { setOnlineStatus } = useActivityStatus(currentUserId || null);
  
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
          
          // ============= TRANSLATE INCOMING MESSAGES =============
          
          // Initialize translation variables
          let translatedMessage = "";
          let isTranslated = false;
          
          // Only translate messages from partner (not our own)
          if (newMsg.sender_id !== currentUserId && chatPartner) {
            // Translate from partner's language to current user's preferred language
            const translation = await translateMessage(
              newMsg.message, 
              currentUserLanguage,
              chatPartner.preferredLanguage // Partner's language as source
            );
            translatedMessage = translation.translatedMessage;
            isTranslated = translation.isTranslated;
          }

          // Add message to state (with deduplication check)
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            
            // Append new message
            return [...prev, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              message: newMsg.message,
              translatedMessage: translatedMessage || newMsg.translated_message,
              isTranslated: isTranslated || newMsg.is_translated,
              isRead: newMsg.is_read,
              createdAt: newMsg.created_at,
            }];
          });

          // Mark received messages as read automatically
          if (newMsg.sender_id !== currentUserId) {
            markAsRead(newMsg.id);
          }
        }
      )
      .subscribe(); // Start listening

    // Cleanup function: remove channel on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId.current, currentUserId, chatPartner, currentUserLanguage]); // Dependencies

  /**
   * useEffect: Monitor Partner Online Status and Session
   * 
   * Detects when partner goes offline or closes chat.
   * Triggers auto-reconnect for men when partner disconnects.
   */
  useEffect(() => {
    if (!chatPartner?.userId || !currentUserId) return;

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
        (payload: any) => {
          const newStatus = payload.new;
          
          // Partner went offline
          if (!newStatus.is_online && isSessionActive) {
            setPartnerDisconnected(true);
            setChatPartner(prev => prev ? { ...prev, isOnline: false } : null);
            
            // If current user is male, trigger auto-reconnect
            if (currentUserGender === "male") {
              toast({
                title: "Partner Disconnected",
                description: "Finding another available user..."
              });
              handleAutoReconnect([chatPartner.userId]);
            }
          } else if (newStatus.is_online) {
            setPartnerDisconnected(false);
            setChatPartner(prev => prev ? { ...prev, isOnline: true } : null);
          }
        }
      )
      .subscribe();

    // Monitor active_chat_sessions for this conversation
    const sessionChannel = supabase
      .channel(`session-monitor-${chatId.current}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_chat_sessions'
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
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [chatPartner?.userId, currentUserId, currentUserGender, isSessionActive, handleAutoReconnect, toast]);

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
  const initializeChat = async (partnerId: string) => {
    try {
      setIsLoading(true);

      // ============= GET CURRENT USER =============
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Not logged in - redirect to auth
        navigate("/");
        return;
      }
      setCurrentUserId(user.id);

      // ============= GENERATE CHAT ID =============
      
      // Create consistent chat ID by sorting user IDs alphabetically
      // This ensures same chat ID regardless of who initiates
      const ids = [user.id, partnerId].sort();
      chatId.current = `${ids[0]}_${ids[1]}`;

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
      setCurrentUserGender(currentProfile?.gender === "female" || currentProfile?.gender === "Female" ? "female" : "male");

      // ============= FETCH PARTNER PROFILE =============
      
      // First try profiles table
      let { data: partnerProfile } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, preferred_language, primary_language")
        .eq("user_id", partnerId)
        .maybeSingle();

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
        navigate("/dashboard");
        return;
      }

      // ============= FETCH MESSAGE HISTORY =============
      
      const { data: existingMessages } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId.current)
        .order("created_at", { ascending: true }); // Oldest first

      // Transform database records to Message interface
      if (existingMessages) {
        setMessages(existingMessages.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          message: msg.message,
          translatedMessage: msg.translated_message || undefined,
          isTranslated: msg.is_translated || false,
          isRead: msg.is_read || false,
          createdAt: msg.created_at,
        })));

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
      toast({
        title: "Error",
        description: "Failed to load chat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      const { data, error } = await supabase
        .from("user_friends")
        .insert({
          user_id: currentUserId,
          friend_id: chatPartner.userId,
          status: "accepted",
          created_by: currentUserId
        })
        .select()
        .single();

      if (error) throw error;

      setIsFriend(true);
      setFriendshipId(data.id);
      toast({
        title: "Friend Added",
        description: `${chatPartner.fullName} is now your friend!`,
      });
    } catch (error: any) {
      console.error("Error adding friend:", error);
      toast({
        title: "Error",
        description: "Failed to add friend",
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
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive",
      });
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
    await setOnlineStatus(false);
    toast({
      title: "You're now offline",
      description: "You won't receive new chat requests."
    });
    navigate(currentUserGender === "female" ? "/women-dashboard" : "/dashboard");
  };

  /**
   * translateMessage Function
   * 
   * Calls the translate-message edge function to translate text.
   * Uses NLLB-200 neural machine translation model supporting 200+ languages.
   * 
   * @param message - Text to translate
   * @param targetLanguage - Target language name (e.g., "Spanish", "Hindi")
   * @param sourceLanguage - Optional source language (auto-detected if not provided)
   * @returns Object with translatedMessage, isTranslated flag, and detectedLanguage
   */
  const translateMessage = async (message: string, targetLanguage: string, sourceLanguage?: string) => {
    try {
      // Call Supabase Edge Function for translation
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { 
          text: message,
          message, 
          targetLanguage,
          sourceLanguage: sourceLanguage, // Let edge function auto-detect if not provided
          mode: 'chat' // Use chat mode for better translation context
        }
      });

      if (error) throw error;
      
      // Check if translation actually produced different text
      const translatedText = data.translatedText || data.translatedMessage || message;
      const wasActuallyTranslated = data.isTranslated && translatedText && translatedText !== message;
      
      return { 
        translatedMessage: translatedText, 
        isTranslated: wasActuallyTranslated,
        detectedLanguage: data.detectedLanguage || data.sourceLanguage,
        translationPair: data.translationPair || `${data.detectedLanguage || data.sourceLanguage} → ${targetLanguage}`
      };
    } catch (error) {
      console.error("Translation error:", error);
      // Return original message on error
      return { translatedMessage: message, isTranslated: false, detectedLanguage: "unknown", translationPair: "" };
    }
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
   * convertMessageToTargetLanguage Function
   * 
   * Converts English typing to the target language script.
   * Example: "bagunnava" → బాగున్నావా (Telugu)
   * Example: "kaise ho" → कैसे हो (Hindi)
   * 
   * @param message - Text typed in English/Latin characters
   * @param targetLanguage - Target language name (e.g., "Telugu", "Hindi")
   * @returns Converted text in target language script
   */
  const convertMessageToTargetLanguage = async (message: string, targetLanguage: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { 
          message, 
          targetLanguage,
          mode: "convert" // Force conversion mode for outgoing messages
        }
      });

      if (error) {
        console.error("Conversion error:", error);
        return message;
      }
      
      return data.convertedMessage || data.translatedMessage || message;
    } catch (error) {
      console.error("Conversion failed:", error);
      return message;
    }
  };

  /**
   * handleSendMessage Function
   * 
   * Sends a new message to the chat partner:
   * 1. Validates input
   * 2. Converts English typing to partner's language
   * 3. Translates to partner's language
   * 4. Inserts into database
   * 5. Clears input field
   */
  const handleSendMessage = async () => {
    // ============= VALIDATION =============
    
    // Don't send empty messages or while already sending
    if (!newMessage.trim() || !chatPartner || isSending) return;

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

    // Store message and clear input immediately for responsiveness
    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      // ============= CONVERT ENGLISH TYPING TO TARGET LANGUAGE =============
      
      // First, convert English typing to partner's language script
      const convertedMessage = await convertMessageToTargetLanguage(messageText, chatPartner.preferredLanguage);
      
      // ============= TRANSLATE FOR RECEIVER =============
      
      // Translate message to partner's preferred language (for display)
      const translation = await translateMessage(convertedMessage, chatPartner.preferredLanguage);
      const translatedMessage = translation.translatedMessage;
      const isTranslated = translation.isTranslated;

      // ============= INSERT MESSAGE INTO DATABASE =============
      
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId.current,          // Consistent chat identifier
          sender_id: currentUserId,          // Current user as sender
          receiver_id: chatPartner.userId,   // Partner as receiver
          message: convertedMessage,         // Converted message (English typing → target script)
          translated_message: translatedMessage || null, // Translation if different
          is_translated: isTranslated,       // Flag if translation occurred
        });

      if (error) throw error;

      // Note: Message will appear via realtime subscription
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      // Restore message to input on failure
      setNewMessage(messageText);
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
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsAttachmentOpen(false);
    }
  };

  /**
   * Handle File Selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
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
      setIsCameraOpen(true);
      setIsAttachmentOpen(false);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take a selfie",
        variant: "destructive",
      });
      setIsCameraOpen(false);
    }
  };

  /**
   * Capture Selfie
   */
  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
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
    }
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
      const fileName = `${currentUserId}/${chatId.current}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
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
      const messageText = newMessage.trim() || (attachmentType === "image" ? "📷 Image" : `📎 ${selectedFile.name}`);

      // Translate if needed
      const translation = await translateMessage(messageText, chatPartner.preferredLanguage);

      const { error } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId.current,
          sender_id: currentUserId,
          receiver_id: chatPartner.userId,
          message: `${messageText}\n[attachment:${attachmentUrl}]`,
          translated_message: translation.translatedMessage || null,
          is_translated: translation.isTranslated,
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
      toast({
        title: "Error",
        description: "Failed to send attachment",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  /**
   * Extract Attachment from Message
   */
  const extractAttachment = (message: string): { text: string; attachmentUrl?: string; voiceUrl?: string } => {
    // Check for voice message
    const voiceMatch = message.match(/\[VOICE:(.*?)\]/);
    if (voiceMatch) {
      return { text: '', voiceUrl: voiceMatch[1] };
    }
    
    // Check for regular attachment
    const attachmentMatch = message.match(/\[attachment:(.*?)\]/);
    if (attachmentMatch) {
      const text = message.replace(/\n?\[attachment:.*?\]/, "").trim();
      return { text, attachmentUrl: attachmentMatch[1] };
    }
    return { text: message };
  };

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  // ============= MAIN RENDER =============
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ============= HEADER SECTION ============= */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Back button */}
          <button 
            onClick={() => navigate(-1)} // Go back to previous page
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          
          {/* Chat partner info - clickable to view profile */}
          {chatPartner && (
            <div 
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => navigate(`/profile/${chatPartner.userId}`)}
            >
              {/* Partner avatar with online indicator */}
              <div className="relative">
                {chatPartner.avatar ? (
                  <img 
                    src={chatPartner.avatar} 
                    alt={chatPartner.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  // Fallback avatar with initial
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-rose-500/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {chatPartner.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Online status indicator dot */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                  chatPartner.isOnline ? "bg-online" : "bg-muted-foreground"
                }`} />
              </div>

              {/* Partner name and status */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{chatPartner.fullName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {/* Online/Offline status text */}
                  {chatPartner.isOnline ? (
                    <span className="text-online">Online</span>
                  ) : (
                    <span>Offline</span>
                  )}
                  {/* Show language if different from current user */}
                  {chatPartner.preferredLanguage !== currentUserLanguage && (
                    <>
                      <span>•</span>
                      <Languages className="w-3 h-3" />
                      <span>{chatPartner.preferredLanguage}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Toggle translation visibility button */}
          <button
            onClick={() => setShowTranslations(!showTranslations)}
            className={`p-2 rounded-full transition-colors ${
              showTranslations ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
            }`}
            title={showTranslations ? "Hide translations" : "Show translations"}
          >
            <Languages className="w-5 h-5" />
          </button>

          {/* Friend/Block Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <MoreVertical className="w-5 h-5 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Friend Status Indicator */}
              {isFriend && (
                <div className="px-2 py-1.5 text-xs text-emerald-500 flex items-center gap-1">
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
                  Add Friend
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
              
              {/* Stop Chat - Only for MEN (men control chat start/stop) */}
              {currentUserGender === "male" && (
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
                className="text-amber-600 focus:text-amber-600"
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

      {/* Stop Chat Confirmation Dialog - Only for men */}
      {currentUserGender === "male" && (
        <AlertDialog open={showStopChatDialog} onOpenChange={setShowStopChatDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <PhoneOff className="w-5 h-5 text-destructive" />
                Stop Chat?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will end the current chat session. Billing will stop and you'll be disconnected from this conversation.
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
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
          <p className="text-sm text-destructive text-center">
            You cannot send messages to this user.
          </p>
        </div>
      )}

      {/* Your own block warning */}
      {isBlocked && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-2">
          <p className="text-sm text-warning text-center">
            You have blocked this user. Unblock to send messages.
          </p>
        </div>
      )}

      {/* ============= TRANSLATION INFO BAR ============= */}
      {chatPartner && currentUserLanguage !== chatPartner.preferredLanguage && showTranslations && (
        <div className="bg-info/10 border-b border-info/20 px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-sm text-info">
            <Languages className="w-4 h-4" />
            <span>Auto-translating: <strong>{currentUserLanguage}</strong> ↔ <strong>{chatPartner.preferredLanguage}</strong></span>
            <span className="text-xs opacity-75">(NLLB-200)</span>
          </div>
        </div>
      )}

      {/* ============= BILLING/EARNINGS BAR ============= */}
      {chatPartner && (
        <>
          <ChatBillingDisplay
            chatPartnerId={chatPartner.userId}
            currentUserId={currentUserId}
            userGender={currentUserGender}
            onSessionEnd={(reason) => {
              toast({
                title: "Chat Ended",
                description: reason === "insufficient_balance" 
                  ? "Your balance ran out. Please recharge to continue chatting."
                  : "Chat session ended.",
                variant: "destructive"
              });
            }}
          />
          <ChatEarningsDisplay
            chatPartnerId={chatPartner.userId}
            currentUserId={currentUserId}
            userGender={currentUserGender}
          />
        </>
      )}

      {/* ============= MESSAGES AREA ============= */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Iterate through date groups */}
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="space-y-3">
              {/* Date separator label */}
              <div className="flex justify-center">
                <span className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                  {date}
                </span>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message, index) => {
                // Determine if message is from current user
                const isMine = message.senderId === currentUserId;
                // Show avatar only for first message in sequence from same sender
                const showAvatar = !isMine && (index === 0 || dateMessages[index - 1]?.senderId !== message.senderId);
                // Extract attachment from message
                const { text: messageText, attachmentUrl, voiceUrl } = extractAttachment(message.message);
                const displayText = !isMine && message.isTranslated && message.translatedMessage 
                  ? extractAttachment(message.translatedMessage).text 
                  : messageText;
                
                // Skip empty voice message placeholders (the actual voice URL comes in the next message)
                if (message.message === '🎤 Voice message') {
                  return null;
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"} animate-slide-up`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? "flex-row-reverse" : ""}`}>
                      {/* Avatar placeholder for alignment */}
                      {!isMine && (
                        <div className="w-8 flex-shrink-0">
                          {showAvatar && chatPartner?.avatar ? (
                            <img 
                              src={chatPartner.avatar} 
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : showAvatar ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-rose-500/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {chatPartner?.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Message bubble and translations */}
                      <div className={`space-y-1`}>
                        {/* Voice message player */}
                        {voiceUrl && (
                          <VoiceMessagePlayer 
                            audioUrl={voiceUrl} 
                            isMine={isMine} 
                          />
                        )}
                        
                        {/* Attachment preview */}
                        {attachmentUrl && (
                          <div className={`rounded-2xl overflow-hidden ${isMine ? "rounded-br-md" : "rounded-bl-md"}`}>
                            {attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img 
                                src={attachmentUrl} 
                                alt="Attachment" 
                                className="max-w-[280px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(attachmentUrl, "_blank")}
                              />
                            ) : (
                              <a 
                                href={attachmentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-4 py-3 ${isMine ? "bg-primary/80" : "bg-muted"}`}
                              >
                                <FileText className="w-5 h-5" />
                                <span className="text-sm underline">Download File</span>
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Primary message bubble */}
                        {displayText && !displayText.startsWith("📷") && !displayText.startsWith("📎") && !voiceUrl && (
                          <div
                            className={`px-4 py-2.5 rounded-2xl ${
                              isMine 
                                ? "bg-primary text-primary-foreground rounded-br-md" 
                                : "bg-muted text-foreground rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{displayText}</p>
                          </div>
                        )}

                        {/* Original message for receiver (when translations shown) */}
                        {showTranslations && !isMine && message.isTranslated && message.translatedMessage && (
                          <div className="px-4 py-2 rounded-2xl bg-muted/50 border border-border/50 rounded-bl-md">
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                              <Languages className="w-3 h-3" />
                              Original
                            </p>
                            <p className="text-sm text-muted-foreground">{messageText}</p>
                          </div>
                        )}

                        {/* Translation preview for sender */}
                        {showTranslations && isMine && message.isTranslated && message.translatedMessage && (
                          <div className="px-4 py-2 rounded-2xl bg-info/10 border border-info/20 rounded-br-md">
                            <p className="text-xs text-info flex items-center gap-1 mb-1">
                              <Languages className="w-3 h-3" />
                              They see
                            </p>
                            <p className="text-sm text-foreground">{extractAttachment(message.translatedMessage).text}</p>
                          </div>
                        )}

                        {/* Time and read status */}
                        <div className={`flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          <span className="text-xs text-muted-foreground">{formatTime(message.createdAt)}</span>
                          {/* Read receipt icons (only for sender) */}
                          {isMine && (
                            message.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> // Double check = read
                            ) : (
                              <Check className="w-3.5 h-3.5 text-muted-foreground" /> // Single check = sent
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          
          {/* Invisible element at bottom for auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ============= CAMERA MODAL ============= */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-4">
            <button onClick={closeCamera} className="p-2 text-white">
              <X className="w-6 h-6" />
            </button>
            <span className="text-white font-medium">Take Selfie</span>
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
              className="w-16 h-16 rounded-full bg-primary border-4 border-primary-foreground flex items-center justify-center"
            >
              <Camera className="w-8 h-8 text-primary-foreground" />
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* ============= MESSAGE INPUT AREA ============= */}
      <footer className="sticky bottom-0 bg-background border-t border-border/50 px-4 py-3">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Selected file preview */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded object-cover" />
              ) : (
                <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button 
                onClick={cancelSelectedFile}
                className="p-1.5 hover:bg-muted-foreground/10 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedFile) {
                handleSendWithAttachment();
              } else {
                handleSendMessage();
              }
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden file inputs */}
            <input 
              ref={imageInputRef}
              type="file" 
              accept="image/*" 
              className="hidden"
              onChange={handleImageSelect}
            />
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {/* Attachment button with popover */}
            <Popover open={isAttachmentOpen} onOpenChange={setIsAttachmentOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" side="top" align="start">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Image className="w-5 h-5 text-primary" />
                    <span className="text-sm">Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">File</span>
                  </button>
                  <button
                    type="button"
                    onClick={openCamera}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Camera className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm">Selfie</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Gift button - only show for men */}
            {currentUserGender === "male" && chatPartner && (
              <GiftSendButton
                senderId={currentUserId}
                receiverId={chatPartner.userId}
                receiverName={chatPartner.fullName}
                disabled={isSending}
              />
            )}
            
            {/* Voice message recorder (up to 5 minutes) */}
            <VoiceMessageRecorder
              chatId={chatId.current}
              currentUserId={currentUserId}
              partnerId={chatPartner?.userId || ''}
              disabled={isSending || !chatPartner}
            />
            
            {/* Text input field */}
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={selectedFile ? "Add a caption..." : "Type or hold mic..."}
              className="flex-1 rounded-full bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary"
              disabled={isSending}
            />
            
            {/* Send button */}
            <Button 
              type="submit"
              size="icon"
              className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90"
              disabled={(!newMessage.trim() && !selectedFile) || isSending}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
};

// Export as default for router
export default ChatScreen;

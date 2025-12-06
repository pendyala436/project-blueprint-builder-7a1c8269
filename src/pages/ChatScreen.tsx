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
import { useState, useEffect, useRef } from "react";
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
// Lucide icons for UI elements
import { 
  ArrowLeft,    // Back navigation icon
  Send,         // Send message icon
  Circle,       // Status indicator
  Languages,    // Translation indicator icon
  Loader2,      // Loading spinner
  MoreVertical, // Options menu icon
  Check,        // Single check (sent)
  CheckCheck    // Double check (read)
} from "lucide-react";
// Supabase client for database and realtime operations
import { supabase } from "@/integrations/supabase/client";

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
  // Note: "oderId" is a typo that should be "orderId" but kept for route compatibility
  const { oderId } = useParams<{ oderId: string }>();
  
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
  
  // ============= REFS =============
  
  // Reference to bottom of messages for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Store chat ID for realtime subscription (consistent format)
  const chatId = useRef<string>("");

  /**
   * useEffect: Initialize Chat
   * 
   * Runs when component mounts or partner ID changes.
   * Loads chat partner info and message history.
   */
  useEffect(() => {
    if (oderId) {
      initializeChat(oderId);
    }
  }, [oderId]); // Re-run if partner ID changes

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
          if (newMsg.sender_id !== currentUserId) {
            // Translate to current user's preferred language
            const translation = await translateMessage(newMsg.message, currentUserLanguage);
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

      // ============= GET USER'S LANGUAGE PREFERENCE =============
      
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setCurrentUserLanguage(currentProfile?.preferred_language || "English");

      // ============= FETCH PARTNER PROFILE =============
      
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, preferred_language")
        .eq("user_id", partnerId)
        .maybeSingle();

      // Fetch partner's online status
      const { data: partnerStatus } = await supabase
        .from("user_status")
        .select("is_online")
        .eq("user_id", partnerId)
        .maybeSingle();

      // Set chat partner state
      if (partnerProfile) {
        setChatPartner({
          userId: partnerProfile.user_id,
          fullName: partnerProfile.full_name || "Anonymous",
          avatar: partnerProfile.photo_url || "",
          isOnline: partnerStatus?.is_online || false,
          preferredLanguage: partnerProfile.preferred_language || "English",
        });
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
   * translateMessage Function
   * 
   * Calls the translate-message edge function to translate text.
   * Uses NLLB-200 neural machine translation model.
   * 
   * @param message - Text to translate
   * @param targetLanguage - Target language name (e.g., "Spanish")
   * @returns Object with translatedMessage, isTranslated flag, and detectedLanguage
   */
  const translateMessage = async (message: string, targetLanguage: string) => {
    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { message, targetLanguage }
      });

      if (error) throw error;
      
      return { 
        translatedMessage: data.translatedMessage, 
        isTranslated: data.isTranslated,
        detectedLanguage: data.detectedLanguage 
      };
    } catch (error) {
      console.error("Translation error:", error);
      // Return original message on error
      return { translatedMessage: message, isTranslated: false, detectedLanguage: "unknown" };
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
   * handleSendMessage Function
   * 
   * Sends a new message to the chat partner:
   * 1. Validates input
   * 2. Translates to partner's language
   * 3. Inserts into database
   * 4. Clears input field
   */
  const handleSendMessage = async () => {
    // ============= VALIDATION =============
    
    // Don't send empty messages or while already sending
    if (!newMessage.trim() || !chatPartner || isSending) return;

    // Store message and clear input immediately for responsiveness
    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      // ============= TRANSLATE FOR RECEIVER =============
      
      // Translate message to partner's preferred language
      const translation = await translateMessage(messageText, chatPartner.preferredLanguage);
      const translatedMessage = translation.translatedMessage;
      const isTranslated = translation.isTranslated;

      // ============= INSERT MESSAGE INTO DATABASE =============
      
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          chat_id: chatId.current,          // Consistent chat identifier
          sender_id: currentUserId,          // Current user as sender
          receiver_id: chatPartner.userId,   // Partner as receiver
          message: messageText,              // Original message
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
                  chatPartner.isOnline ? "bg-emerald-500" : "bg-muted-foreground"
                }`} />
              </div>

              {/* Partner name and status */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{chatPartner.fullName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {/* Online/Offline status text */}
                  {chatPartner.isOnline ? (
                    <span className="text-emerald-500">Online</span>
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
        </div>
      </header>

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
                        {/* Primary message bubble */}
                        <div
                          className={`px-4 py-2.5 rounded-2xl ${
                            isMine 
                              ? "bg-primary text-primary-foreground rounded-br-md" 
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          {/* For receiver: show translated message if available */}
                          {!isMine && message.isTranslated && message.translatedMessage ? (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.translatedMessage}</p>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                          )}
                        </div>

                        {/* Original message for receiver (when translations shown) */}
                        {showTranslations && !isMine && message.isTranslated && message.translatedMessage && (
                          <div className="px-4 py-2 rounded-2xl bg-muted/50 border border-border/50 rounded-bl-md">
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                              <Languages className="w-3 h-3" />
                              Original
                            </p>
                            <p className="text-sm text-muted-foreground">{message.message}</p>
                          </div>
                        )}

                        {/* Translation preview for sender */}
                        {showTranslations && isMine && message.isTranslated && message.translatedMessage && (
                          <div className="px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 rounded-br-md">
                            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-1">
                              <Languages className="w-3 h-3" />
                              They see
                            </p>
                            <p className="text-sm text-foreground">{message.translatedMessage}</p>
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

      {/* ============= MESSAGE INPUT AREA ============= */}
      <footer className="sticky bottom-0 bg-background border-t border-border/50 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={(e) => {
              e.preventDefault(); // Prevent form submission page reload
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            {/* Text input field */}
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary"
              disabled={isSending}
            />
            
            {/* Send button */}
            <Button 
              type="submit"
              size="icon"
              className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90"
              disabled={!newMessage.trim() || isSending}
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

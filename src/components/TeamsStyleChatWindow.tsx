import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
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
  Clock,
  IndianRupee,
  Loader2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Maximize2,
  Minimize2,
  Gift,
  MoreVertical
} from "lucide-react";
import { ChatRelationshipActions } from "@/components/ChatRelationshipActions";
import { useBlockCheck } from "@/hooks/useBlockCheck";
import { useP2PCall } from "@/hooks/useP2PCall";
import { GiftSendButton } from "@/components/GiftSendButton";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

interface Message {
  id: string;
  senderId: string;
  message: string;
  translatedMessage?: string;
  isTranslated?: boolean;
  createdAt: string;
}

interface TeamsStyleChatWindowProps {
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
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const TeamsStyleChatWindow = ({
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
  isExpanded = false,
  onToggleExpand
}: TeamsStyleChatWindowProps) => {
  const { toast } = useToast();
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [billingStarted, setBillingStarted] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);

  // Video call state
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Check block status
  const { isBlocked, isBlockedByThem } = useBlockCheck(currentUserId, partnerId);

  // Video call hook (only active when in call)
  const videoCall = useP2PCall({
    callId: callId || `call_${chatId}_${Date.now()}`,
    currentUserId,
    remoteUserId: partnerId,
    isInitiator: false,
    ratePerMinute,
    onCallEnded: () => {
      setIsInVideoCall(false);
      setCallId(null);
    },
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if billing has started
  useEffect(() => {
    const hasSentMessage = messages.some(m => m.senderId === currentUserId);
    const hasReceivedReply = messages.some(m => m.senderId !== currentUserId);
    
    if (hasSentMessage && hasReceivedReply && !billingStarted) {
      setBillingStarted(true);
      setLastActivityTime(Date.now());
      startBilling();
    }
  }, [messages, currentUserId, billingStarted]);

  // Inactivity check
  useEffect(() => {
    if (!billingStarted) return;

    if (inactivityRef.current) {
      clearTimeout(inactivityRef.current);
    }

    inactivityRef.current = setTimeout(async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      
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
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, [lastActivityTime, billingStarted, sessionId, onClose]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        message: m.message,
        translatedMessage: m.translated_message,
        isTranslated: m.is_translated,
        createdAt: m.created_at
      })));
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`teams-chat-${chatId}`)
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
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              message: newMsg.message,
              translatedMessage: newMsg.translated_message,
              isTranslated: newMsg.is_translated,
              createdAt: newMsg.created_at
            }];
          });

          if (newMsg.sender_id !== currentUserId) {
            setLastActivityTime(Date.now());
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
          body: { action: "heartbeat", chat_id: chatId }
        });
      } catch (error) {
        console.error("Heartbeat error:", error);
      }
    }, 60000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    if (messageText.length > 2000) {
      toast({
        title: "Message too long",
        description: "Messages must be under 2000 characters",
        variant: "destructive"
      });
      return;
    }

    setNewMessage("");
    setIsSending(true);
    setLastActivityTime(Date.now());

    try {
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

  const handleClose = async () => {
    if (isInVideoCall) {
      videoCall.endCall();
    }
    
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

  const startVideoCall = async () => {
    // Only men can initiate video calls
    if (userGender === "female") {
      toast({
        title: "Cannot Start Call",
        description: "Only men can initiate video calls",
        variant: "destructive"
      });
      return;
    }

    const newCallId = `call_${chatId}_${Date.now()}`;
    setCallId(newCallId);
    
    try {
      // Create video call session in database
      const { error } = await supabase
        .from("video_call_sessions")
        .insert({
          call_id: newCallId,
          man_user_id: currentUserId,
          woman_user_id: partnerId,
          status: "ringing",
          rate_per_minute: ratePerMinute
        });

      if (error) throw error;
      setIsInVideoCall(true);
    } catch (error) {
      console.error("Error starting video call:", error);
      toast({
        title: "Error",
        description: "Failed to start video call",
        variant: "destructive"
      });
    }
  };

  const endVideoCall = async () => {
    await videoCall.endCall();
    setIsInVideoCall(false);
    setCallId(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const estimatedCost = billingStarted ? (elapsedSeconds / 60) * ratePerMinute : 0;

  return (
    <div className={cn(
      "flex flex-col bg-background border rounded-lg shadow-2xl overflow-hidden transition-all duration-300",
      isExpanded 
        ? "fixed inset-4 z-50" 
        : "w-[400px] h-[500px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarImage src={partnerPhoto || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                {partnerName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
              isPartnerOnline ? "bg-online" : "bg-muted-foreground"
            )} />
          </div>
          <div>
            <p className="font-semibold text-sm">{partnerName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{partnerLanguage}</span>
              {billingStarted && (
                <>
                  <span>•</span>
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(elapsedSeconds)}</span>
                  {userGender === "male" && (
                    <>
                      <span>•</span>
                      <IndianRupee className="h-3 w-3" />
                      <span>₹{estimatedCost.toFixed(1)}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Video Call Button - Only for men to initiate */}
          {userGender === "male" && !isInVideoCall && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              onClick={startVideoCall}
            >
              <Video className="h-4 w-4" />
            </Button>
          )}

          {/* Gift Button */}
          {userGender === "male" && (
            <GiftSendButton
              senderId={currentUserId}
              receiverId={partnerId}
              receiverName={partnerName}
            />
          )}

          {/* Relationship Actions */}
          <ChatRelationshipActions
            currentUserId={currentUserId}
            targetUserId={partnerId}
            targetUserName={partnerName}
            onBlock={handleClose}
            className="h-8 w-8"
          />

          {/* Expand/Collapse */}
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleExpand}>
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content - Split Layout when in video call */}
      <div className={cn(
        "flex-1 flex overflow-hidden",
        isInVideoCall ? "flex-row" : "flex-col"
      )}>
        {/* Video Section - Only shown when in video call */}
        {isInVideoCall && (
          <div className="w-1/2 flex flex-col border-r bg-black">
            {/* Remote Video */}
            <div className="flex-1 relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!videoCall.isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={partnerPhoto || undefined} />
                    <AvatarFallback className="text-2xl">{partnerName.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Local Video PiP */}
              <div className="absolute bottom-4 right-4 w-24 h-18 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Call Duration */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                <div className="flex items-center gap-2 text-white text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(videoCall.callDuration)}</span>
                  {userGender === "male" && (
                    <>
                      <span>•</span>
                      <span>₹{videoCall.totalCost}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Video Controls */}
            <div className="flex items-center justify-center gap-3 p-3 bg-gray-900">
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full h-10 w-10",
                  !videoCall.isAudioEnabled && "bg-destructive border-destructive"
                )}
                onClick={videoCall.toggleAudio}
              >
                {videoCall.isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full h-10 w-10",
                  !videoCall.isVideoEnabled && "bg-destructive border-destructive"
                )}
                onClick={videoCall.toggleVideo}
              >
                {videoCall.isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={endVideoCall}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Chat Section */}
        <div className={cn(
          "flex flex-col min-h-0",
          isInVideoCall ? "w-1/2" : "flex-1"
        )}>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Say hi to start the conversation!
                </p>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2 max-w-[85%]",
                      isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    {!isMe && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={partnerPhoto || undefined} />
                        <AvatarFallback className="text-xs">{partnerName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn(
                      "rounded-2xl px-4 py-2",
                      isMe 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-muted rounded-bl-md"
                    )}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      {msg.translatedMessage && msg.isTranslated && (
                        <p className="text-xs mt-1 opacity-70 italic border-t border-current/20 pt-1">
                          {msg.translatedMessage}
                        </p>
                      )}
                      <p className={cn(
                        "text-[10px] mt-1",
                        isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                      )}>
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-3 border-t bg-background">
            <div className="flex items-center gap-2">
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  setLastActivityTime(Date.now());
                }}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1"
                disabled={isSending}
              />
              <Button
                size="icon"
                className="h-10 w-10"
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!billingStarted && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Billing starts when both parties exchange messages
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamsStyleChatWindow;

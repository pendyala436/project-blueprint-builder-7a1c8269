import { classifyError, ERROR_MESSAGES } from "@/lib/errors";
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
  Send, X, Maximize2, Minimize2, Clock, IndianRupee, Loader2,
  ChevronDown, ChevronUp, TrendingUp, Wallet, AlertTriangle,
  Move, Paperclip, Image, Video, FileText, Mic, MoreHorizontal, Languages
} from "lucide-react";
import { translateText } from "@/lib/translation-service";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { MiniChatActions } from "@/components/MiniChatActions";
import { GiftSendButton } from "@/components/GiftSendButton";
import { useBlockCheck } from "@/hooks/useBlockCheck";
import { useDraggablePosition } from "@/hooks/useDraggablePosition";
import { useResizableWindow } from "@/hooks/useResizableWindow";
import { useMiniChatBilling } from "@/hooks/useMiniChatBilling";
import { useMiniChatMessages } from "@/hooks/useMiniChatMessages";
import { usePartnerMonitor } from "@/hooks/usePartnerMonitor";

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
  currentUserName?: string;
  userGender: "male" | "female";
  ratePerMinute: number;
  earningRatePerMinute: number;
  partnerCountry?: string;
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
  currentUserName,
  userGender,
  ratePerMinute,
  earningRatePerMinute,
  partnerCountry,
  onClose,
  initialPosition = { x: 20, y: 20 },
  zIndex = 50,
  onFocus
}: DraggableMiniChatWindowProps) => {
  const { toast } = useToast();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [areButtonsExpanded, setAreButtonsExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEarningEligible, setIsEarningEligible] = useState(false);
  const [nativePreview, setNativePreview] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const sessionStartedRef = useRef(false);
  const sendingRef = useRef(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  const MAX_MESSAGE_LENGTH = 10000;

  const langNorm = (currentUserLanguage || 'english').toLowerCase().trim();
  const isNonEnglish = langNorm !== 'english';

  const { isBlocked, isBlockedByThem } = useBlockCheck(currentUserId, partnerId);

  // --- Custom hooks for extracted concerns ---

  const { position, setPosition, isDragging, handleDragStart } = useDraggablePosition({
    initialPosition,
    size: { width: 320, height: 400 }, // will be overridden by resize hook
    isMaximized,
    isMinimized,
    onFocus,
  });

  const { size, isResizing, handleResizeStart } = useResizableWindow({
    position,
    setPosition,
  });

  // Re-feed actual size into draggable (the hook uses size for boundary clamping)
  // Both hooks read from the same position state so this is consistent.

  const { messages, setMessages, unreadCount, setUnreadCount, messagesEndRef, hasOlderMessages, isLoadingOlder, loadOlderMessages } =
    useMiniChatMessages({ chatId, currentUserId, isMinimized, currentUserLanguage, partnerLanguage: partnerLanguage });

  const billing = useMiniChatBilling({
    chatId,
    sessionId,
    currentUserId,
    userGender,
    ratePerMinute,
    earningRatePerMinute,
    isEarningEligible,
    messages,
    onClose,
  });

  usePartnerMonitor({
    partnerId,
    partnerName,
    sessionId,
    isPartnerOnline,
    onClose,
  });

  // --- Lightweight effects that remain in the component ---

  // Check earning eligibility for women
  useEffect(() => {
    if (userGender !== "female") return;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("country")
          .eq("user_id", currentUserId)
          .maybeSingle();
        if (profile?.country) {
          const country = profile.country.toLowerCase().trim();
          setIsEarningEligible(["india", "in", "ind", "भारत"].includes(country));
        }
      } catch {
        setIsEarningEligible(false);
      }
    })();
  }, [currentUserId, userGender]);

  // Auto-close if blocked
  useEffect(() => {
    if (isBlocked) {
      toast({
        title: "Chat Ended",
        description: isBlockedByThem ? "This user has blocked you" : "You have blocked this user",
        variant: "destructive",
      });
      handleClose();
    }
  }, [isBlocked]);

  // Load initial wallet/earnings data & show session toast
  useEffect(() => {
    (async () => {
      try {
        if (userGender === "male") {
          const { data: wallet } = await supabase
            .from("users_wallet")
            .select("balance")
            .eq("user_id", currentUserId)
            .maybeSingle();
          if (wallet) billing.setWalletBalance(wallet.balance);
        } else if (isEarningEligible) {
          const today = new Date().toISOString().split("T")[0];
          const { data: earnings } = await supabase
            .from("women_earnings")
            .select("amount")
            .eq("user_id", currentUserId)
            .gte("created_at", `${today}T00:00:00`);
          billing.setTodayEarnings(earnings?.reduce((acc, e) => acc + Number(e.amount), 0) || 0);
        }

        if (!sessionStartedRef.current) {
          sessionStartedRef.current = true;
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast({ title: "Chat unavailable", description: ERROR_MESSAGES.chat.loadFailed, variant: "destructive" });
      }
    })();
  }, [currentUserId, userGender, isEarningEligible]);

  // --- Handlers ---

  const sendMessage = async () => {
    const inputText = newMessage.trim();
    if (!inputText || sendingRef.current) return;
    sendingRef.current = true;

    if (inputText.length > MAX_MESSAGE_LENGTH) {
      toast({ title: "Message too long", description: `Messages must be under ${MAX_MESSAGE_LENGTH} characters`, variant: "destructive" });
      sendingRef.current = false;
      return;
    }

    const { moderateMessage } = await import("@/lib/content-moderation");
    const moderationResult = moderateMessage(inputText);
    if (moderationResult.isBlocked) {
      sendingRef.current = false;
      toast({ title: "Message Blocked", description: moderationResult.reason, variant: "destructive" });
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageTimestamp = new Date().toISOString();

    setNewMessage("");
    billing.setLastActivityTime(Date.now());

    setMessages((prev) => [...prev, { id: tempId, senderId: currentUserId, message: inputText, createdAt: messageTimestamp }]);
    sendingRef.current = false;

    try {
      const { data: insertedMessage, error: insertError } = await supabase
        .from("chat_messages")
        .insert({ chat_id: chatId, sender_id: currentUserId, receiver_id: partnerId, message: inputText })
        .select("id")
        .single();
      if (insertError) throw insertError;
      if (insertedMessage?.id) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: insertedMessage.id } : m)));
      }
    } catch (dbError: any) {
      console.error("[sendMessage] DB insert error:", dbError);
      // CHT-C-02: Show retry option instead of silently removing message
      setMessages((prev) => prev.map((m) => 
        m.id === tempId ? { ...m, id: `failed-${tempId}`, sendFailed: true } : m
      ));
      toast({ 
        title: "Message Not Sent", 
        description: "Tap the failed message to retry sending.",
        variant: "destructive" 
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (isMinimized) setUnreadCount(0);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) setIsMinimized(false);
  };

  const handleClose = async () => {
    billing.stopBillingTimers();
    try {
      await supabase.functions.invoke("chat-manager", {
        body: { action: "end_chat", chat_id: chatId, end_reason: userGender === "male" ? "man_closed" : "woman_closed", user_id: currentUserId },
      });
    } catch (error) {
      console.error("Error closing chat via chat-manager:", error);
      toast({ title: "Chat not closed", description: "Unable to close the chat session properly. The chat may still appear active.", variant: "destructive" });
      try {
        await supabase
          .from("active_chat_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString(), end_reason: userGender === "male" ? "man_closed" : "woman_closed" })
          .eq("id", sessionId);
      } catch (fallbackError) {
        console.error("Fallback close also failed:", fallbackError);
      }
    }
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: "image" | "video" | "document") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 50MB", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setIsAttachOpen(false);
    billing.setLastActivityTime(Date.now());

    try {
      const fileExt = file.name.split(".").pop();
      const randomSuffix = crypto.randomUUID().slice(0, 8);
      const fileName = `${currentUserId}/${chatId}/${Date.now()}-${randomSuffix}.${fileExt}`;
      const bucket = "chat-attachments";

      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const messageUrl = `chat-attachment://${fileName}`;
      const emoji = fileType === "image" ? "📷" : fileType === "video" ? "🎬" : "📎";
      const { error: messageError } = await supabase.from("chat_messages").insert({
        chat_id: chatId, sender_id: currentUserId, receiver_id: partnerId,
        message: `${emoji} [${fileType.toUpperCase()}:${messageUrl}] ${file.name}`,
      });
      if (messageError) throw messageError;
      toast({ title: "File sent", description: `${file.name} has been sent` });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({ title: "Upload failed", description: "Failed to send file. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = (accept: string, fileType: "image" | "video" | "document") => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.dataset.fileType = fileType;
      fileInputRef.current.click();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // --- Layout computation ---

  const useFlexLayout = initialPosition.x === 0 && initialPosition.y === 0;

  const windowStyle = isMaximized
    ? { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", zIndex: zIndex + 100 }
    : useFlexLayout
      ? { position: "relative" as const, width: isMinimized ? 240 : size.width, height: isMinimized ? 48 : size.height, zIndex }
      : { position: "fixed" as const, left: position.x, top: position.y, width: isMinimized ? 240 : size.width, height: isMinimized ? 48 : size.height, zIndex };

  // --- Render ---

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
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-2 bg-gradient-to-r from-primary/10 to-transparent border-b touch-none select-none",
          !isMaximized && "cursor-move"
        )}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!isMaximized && <Move className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
          <div className="relative">
            <Avatar className="h-7 w-7">
              <AvatarImage src={partnerPhoto || undefined} />
              <AvatarFallback className="text-xs bg-primary/20">{partnerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background", isPartnerOnline ? "bg-green-500" : "bg-muted-foreground")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium truncate">{partnerName}</p>
            </div>
            {billing.billingStarted && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-2 w-2 text-muted-foreground" />
                <span className="text-muted-foreground">{formatTime(billing.elapsedSeconds)}</span>
              </div>
            )}
          </div>
          {unreadCount > 0 && isMinimized && (
            <Badge className="h-4 min-w-[16px] text-[9px] px-1 bg-primary">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5" data-no-drag onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setAreButtonsExpanded(!areButtonsExpanded); }} title={areButtonsExpanded ? "Hide actions" : "Show actions"}>
            <MoreHorizontal className="h-2.5 w-2.5" />
          </Button>
          {areButtonsExpanded && (
            <>
              {userGender === "male" && (
                <GiftSendButton senderId={currentUserId} receiverId={partnerId} receiverName={partnerName} disabled={!billing.billingStarted} />
              )}
              <MiniChatActions currentUserId={currentUserId} targetUserId={partnerId} targetUserName={partnerName} isPartnerOnline={isPartnerOnline} onBlock={handleClose} onStopChat={handleClose} onLogOff={handleClose} />
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={toggleMaximize} title={isMaximized ? "Restore size" : "Maximize"}>
                {isMaximized ? <Minimize2 className="h-2.5 w-2.5" /> : <Maximize2 className="h-2.5 w-2.5" />}
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}>
            {isMinimized ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleClose(); }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
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
              {/* CHT-H-03: Load earlier messages button */}
              {hasOlderMessages && (
                <button
                  onClick={loadOlderMessages}
                  disabled={isLoadingOlder}
                  className="w-full text-center text-[10px] text-primary hover:underline py-1 disabled:opacity-50"
                >
                  {isLoadingOlder ? "Loading..." : "↑ Load earlier messages"}
                </button>
              )}
              {messages.length === 0 && (
                <p className="text-center text-[10px] text-muted-foreground py-4">Say hi to start chatting.</p>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} currentUserId={currentUserId} currentUserName={currentUserName} partnerName={partnerName} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-2 border-t">
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
              const fileType = fileInputRef.current?.dataset.fileType as "image" | "video" | "document";
              handleFileUpload(e, fileType);
            }} />
            <div className="flex items-center gap-1">
              <Popover open={isAttachOpen} onOpenChange={setIsAttachOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={isUploading}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1 z-[100] bg-popover border shadow-lg" side="top" align="start">
                  <div className="flex flex-col gap-0.5">
                    <Button variant="ghost" size="sm" className="justify-start h-8 text-xs" onClick={() => triggerFileInput("image/*", "image")}>
                      <Image className="h-4 w-4 mr-2 text-blue-500" />Photo
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start h-8 text-xs" onClick={() => triggerFileInput("video/*", "video")}>
                      <Video className="h-4 w-4 mr-2 text-purple-500" />Video
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start h-8 text-xs" onClick={() => triggerFileInput(".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar", "document")}>
                      <FileText className="h-4 w-4 mr-2 text-orange-500" />Document
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex-1">
                <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyPress} dir="auto" spellCheck={true} autoComplete="off" autoCorrect="on" inputMode="text" enterKeyHint="send" className="h-8 text-xs w-full" disabled={isUploading} />
              </div>
              <Button size="icon" className="h-8 w-8 shrink-0 bg-primary hover:bg-primary/90" onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Resize handles */}
          {!isMaximized && (
            <>
              <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center touch-none" onMouseDown={(e) => handleResizeStart(e, "se")} onTouchStart={(e) => handleResizeStart(e, "se")}>
                <div className="w-2 h-2 border-b-2 border-r-2 border-muted-foreground/30" />
              </div>
              <div className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize touch-none" onMouseDown={(e) => handleResizeStart(e, "sw")} onTouchStart={(e) => handleResizeStart(e, "sw")} />
              <div className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize touch-none" onMouseDown={(e) => handleResizeStart(e, "ne")} onTouchStart={(e) => handleResizeStart(e, "ne")} />
              <div className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize touch-none" onMouseDown={(e) => handleResizeStart(e, "nw")} onTouchStart={(e) => handleResizeStart(e, "nw")} />
            </>
          )}
        </>
      )}
    </Card>
  );
};

// --- Extracted sub-component for message rendering ---

interface MessageBubbleProps {
  msg: { id: string; senderId: string; message: string; translatedMessage?: string; englishText?: string; isTranslated?: boolean; translationFailed?: boolean; sendFailed?: boolean; createdAt: string };
  currentUserId: string;
  currentUserName?: string;
  partnerName: string;
  onRetry?: (msg: any) => void;
}

const MessageBubble = ({ msg, currentUserId, currentUserName, partnerName, onRetry }: MessageBubbleProps) => {
  const isOwn = msg.senderId === currentUserId;
  const isVoice = msg.message.startsWith("[VOICE:");
  const isImage = msg.message.includes("[IMAGE:");
  const isVideo = msg.message.includes("[VIDEO:");
  const isDocument = msg.message.includes("[DOCUMENT:");

  const extractUrl = (text: string, type: string) => {
    const match = text.match(new RegExp(`\\[${type}:([^\\]]+)\\]`));
    return match ? match[1] : null;
  };

  const fileUrl = isVoice
    ? msg.message.replace("[VOICE:", "").replace("]", "")
    : isImage ? extractUrl(msg.message, "IMAGE")
    : isVideo ? extractUrl(msg.message, "VIDEO")
    : isDocument ? extractUrl(msg.message, "DOCUMENT")
    : null;

  // Display text: translated version if available, else original
  const displayText = msg.translatedMessage || msg.message;
  // English subtitle: show if different from display text
  const showEnglishSubtitle = msg.englishText && msg.englishText.toLowerCase().trim() !== displayText.toLowerCase().trim();

  return (
    <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
      {/* Sender name with distinct colors */}
      <span className={cn(
        "text-[9px] font-semibold mb-0.5 px-1",
        isOwn ? "text-primary" : "text-emerald-600 dark:text-emerald-400"
      )}>
        {isOwn ? (currentUserName || "You") : partnerName}
      </span>
      <div 
        className={cn(
          "max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] border shadow-sm",
          isOwn 
            ? "bg-primary/5 border-primary/20 rounded-br-sm" 
            : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 rounded-bl-sm",
          msg.sendFailed && "bg-destructive/10 border-destructive/30 cursor-pointer"
        )}
        onClick={msg.sendFailed && onRetry ? () => onRetry(msg) : undefined}
      >
        {isVoice && fileUrl ? (
          <div className="flex items-center gap-2"><Mic className="h-3 w-3" /><audio src={fileUrl} controls className="h-6 max-w-[150px]" /></div>
        ) : isImage && fileUrl ? (
          <img src={fileUrl} alt="Shared image" className="max-w-[200px] max-h-[150px] rounded object-cover cursor-pointer" onClick={() => window.open(fileUrl, "_blank")} />
        ) : isVideo && fileUrl ? (
          <video src={fileUrl} controls className="max-w-[200px] max-h-[150px] rounded" />
        ) : isDocument && fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline hover:opacity-80">
            <FileText className="h-3 w-3" /><span>View Document</span>
          </a>
        ) : (
          <>
            {/* Primary text — native script / translated */}
            <p className={cn(
              "unicode-text leading-relaxed",
              isOwn ? "text-primary dark:text-primary" : "text-emerald-800 dark:text-emerald-200"
            )} dir="auto">
              {displayText}
            </p>
            {/* English subtitle — always shown below every message */}
            {showEnglishSubtitle && (
              <p className="text-[9px] text-muted-foreground/70 italic mt-0.5" dir="ltr">
                english: {msg.englishText!.toLowerCase()}
              </p>
            )}
            {/* Translation failed badge */}
            {msg.translationFailed && (
              <span className="text-[8px] text-amber-500 block mt-0.5">⚠ Translation unavailable</span>
            )}
          </>
        )}
        {/* Send failed indicator */}
        {msg.sendFailed && (
          <span className="text-[8px] text-destructive block mt-0.5">⚠ Failed — tap to retry</span>
        )}
        <span className="text-[8px] text-muted-foreground/50 block mt-0.5">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
};

export default DraggableMiniChatWindow;

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Send,
  Paperclip,
  Image,
  FileText,
  File,
  X,
  Download,
  Circle,
  MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface CommunityMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  message: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  isOwn: boolean;
}

interface CommunityMember {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  isOnline: boolean;
}

interface LanguageGroupChatProps {
  currentUserId: string;
  languageCode: string;
  languageName: string;
  userName: string;
  userPhoto: string | null;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain"
];

export const LanguageGroupChat = ({
  currentUserId,
  languageCode,
  languageName,
  userName,
  userPhoto
}: LanguageGroupChatProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages and members
  useEffect(() => {
    if (languageName) {
      loadCommunityData();
      subscribeToMessages();
    }
    return () => {
      supabase.removeChannel(supabase.channel(`community-${languageName}`));
    };
  }, [languageName, currentUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadCommunityData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadMessages(), loadMembers()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data: messagesData, error } = await supabase
        .from("language_community_messages")
        .select("*")
        .eq("language_code", languageName)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;

      if (messagesData && messagesData.length > 0) {
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url")
          .in("user_id", senderIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setMessages(messagesData.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: profileMap.get(m.sender_id)?.full_name || "Unknown",
          senderPhoto: profileMap.get(m.sender_id)?.photo_url || null,
          message: m.message,
          fileUrl: m.file_url,
          fileType: m.file_type,
          fileName: m.file_name,
          fileSize: m.file_size,
          createdAt: m.created_at,
          isOwn: m.sender_id === currentUserId
        })));
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadMembers = async () => {
    try {
      // Get all female users who speak this language
      const { data: languageUsers } = await supabase
        .from("user_languages")
        .select("user_id")
        .eq("language_name", languageName);

      const { data: profilesByLanguage } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("gender", "female")
        .or(`primary_language.eq.${languageName},preferred_language.eq.${languageName}`);

      const userIds = [...new Set([
        ...(languageUsers?.map(u => u.user_id) || []),
        ...(profilesByLanguage?.map(p => p.user_id) || [])
      ])];

      if (userIds.length > 0) {
        const [profilesRes, statusRes] = await Promise.all([
          supabase.from("profiles")
            .select("user_id, full_name, photo_url")
            .eq("gender", "female")
            .in("user_id", userIds),
          supabase.from("user_status")
            .select("user_id, is_online")
            .in("user_id", userIds)
        ]);

        const statusMap = new Map(statusRes.data?.map(s => [s.user_id, s.is_online]) || []);

        setMembers(profilesRes.data?.map(p => ({
          userId: p.user_id,
          fullName: p.full_name || "Unknown",
          photoUrl: p.photo_url,
          isOnline: statusMap.get(p.user_id) || false
        })) || []);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`community-${languageName}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "language_community_messages",
          filter: `language_code=eq.${languageName}`
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Get sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, photo_url")
            .eq("user_id", newMsg.sender_id)
            .maybeSingle();

          const message: CommunityMessage = {
            id: newMsg.id,
            senderId: newMsg.sender_id,
            senderName: profile?.full_name || "Unknown",
            senderPhoto: profile?.photo_url || null,
            message: newMsg.message,
            fileUrl: newMsg.file_url,
            fileType: newMsg.file_type,
            fileName: newMsg.file_name,
            fileSize: newMsg.file_size,
            createdAt: newMsg.created_at,
            isOwn: newMsg.sender_id === currentUserId
          };

          setMessages(prev => [...prev, message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || isSending) return;

    setIsSending(true);
    try {
      let fileUrl = null;
      let fileType = null;
      let fileName = null;
      let fileSize = null;

      // Upload file if selected
      if (selectedFile) {
        setIsUploading(true);
        const fileExt = selectedFile.name.split(".").pop();
        const filePath = `${languageName}/${currentUserId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("community-files")
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("community-files")
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileType = selectedFile.type;
        fileName = selectedFile.name;
        fileSize = selectedFile.size;
        setIsUploading(false);
      }

      // Insert message
      const { error } = await supabase
        .from("language_community_messages")
        .insert({
          language_code: languageName,
          sender_id: currentUserId,
          message: newMessage.trim() || null,
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName,
          file_size: fileSize
        });

      if (error) throw error;

      setNewMessage("");
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: t("error", "Error"),
        description: error.message || t("sendFailed", "Failed to send message"),
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t("fileTooLarge", "File Too Large"),
        description: t("maxFileSize", "Maximum file size is 50MB"),
        variant: "destructive"
      });
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: t("invalidFileType", "Invalid File Type"),
        description: t("allowedTypes", "Allowed: Images, PDFs, Word, Excel, PowerPoint"),
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-5 h-5" />;
    if (fileType.startsWith("image/")) return <Image className="w-5 h-5" />;
    if (fileType.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
    if (fileType.includes("word") || fileType.includes("document")) 
      return <FileText className="w-5 h-5 text-blue-500" />;
    if (fileType.includes("sheet") || fileType.includes("excel"))
      return <FileText className="w-5 h-5 text-green-500" />;
    if (fileType.includes("presentation") || fileType.includes("powerpoint"))
      return <FileText className="w-5 h-5 text-orange-500" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onlineCount = members.filter(m => m.isOnline).length;

  if (isLoading) {
    return (
      <Card className="h-[600px]">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-3/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {languageName} {t("community", "Community")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {members.length} {t("members", "members")} · {onlineCount} {t("online", "online")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMembers(!showMembers)}
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            {showMembers ? t("hideMembers", "Hide") : t("showMembers", "Members")}
          </Button>
        </div>
      </CardHeader>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className={cn("flex-1 flex flex-col", showMembers && "md:w-2/3")}>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t("noMessages", "No messages yet")}</p>
                  <p className="text-sm">{t("startConversation", "Start the conversation!")}</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      msg.isOwn && "flex-row-reverse"
                    )}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={msg.senderPhoto || undefined} />
                      <AvatarFallback className="text-xs">
                        {msg.senderName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={cn("max-w-[70%]", msg.isOwn && "text-right")}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {msg.isOwn ? t("you", "You") : msg.senderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div
                        className={cn(
                          "rounded-lg p-3",
                          msg.isOwn 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        )}
                      >
                        {/* File attachment */}
                        {msg.fileUrl && (
                          <div className="mb-2">
                            {msg.fileType?.startsWith("image/") ? (
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={msg.fileUrl}
                                  alt={msg.fileName || "Image"}
                                  className="max-w-full max-h-48 rounded-md object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={msg.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-md",
                                  msg.isOwn ? "bg-primary-foreground/10" : "bg-background"
                                )}
                              >
                                {getFileIcon(msg.fileType)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {msg.fileName}
                                  </p>
                                  <p className="text-xs opacity-70">
                                    {formatFileSize(msg.fileSize)}
                                  </p>
                                </div>
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Message text */}
                        {msg.message && (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Selected file preview */}
          {selectedFile && (
            <div className="px-4 py-2 border-t bg-muted/50">
              <div className="flex items-center gap-2">
                {getFileIcon(selectedFile.type)}
                <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept={ALLOWED_FILE_TYPES.join(",")}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder={t("typeMessage", "Type a message...")}
                disabled={isSending}
                className="flex-1"
              />
              
              <Button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !selectedFile) || isSending}
                size="icon"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Members sidebar */}
        {showMembers && (
          <div className="hidden md:block w-1/3 border-l">
            <div className="p-3 border-b">
              <h3 className="font-medium">{t("members", "Members")}</h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-1">
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted"
                  >
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.photoUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.fullName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {member.isOnline && (
                        <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-green-500 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.isOnline ? t("online", "Online") : t("offline", "Offline")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </Card>
  );
};

export default LanguageGroupChat;

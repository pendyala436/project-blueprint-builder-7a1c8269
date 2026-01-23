import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Users, Radio, Loader2,
  X, Send, Image, Paperclip, File, MessageCircle, Maximize2, Minimize2,
  Circle
} from 'lucide-react';
import { useSFUGroupCall } from '@/hooks/useSFUGroupCall';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GroupMessage {
  id: string;
  sender_id: string;
  message: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  translated_message: string | null;
  created_at: string;
}

interface MemberInfo {
  name: string;
  photo: string | null;
  isOnline: boolean;
}

interface TeamsStyleGroupWindowProps {
  group: {
    id: string;
    name: string;
    participant_count: number;
    is_live: boolean;
    stream_id: string | null;
    access_type: string;
  };
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
  onClose: () => void;
  isOwner: boolean;
}

export function TeamsStyleGroupWindow({
  group,
  currentUserId,
  userName,
  userPhoto,
  onClose,
  isOwner
}: TeamsStyleGroupWindowProps) {
  // Chat state
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [members, setMembers] = useState<Map<string, MemberInfo>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Video state
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const participantVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const hasChat = group.access_type === 'chat' || group.access_type === 'both';
  const hasVideo = group.access_type === 'video' || group.access_type === 'both';

  // SFU Group Call hook
  const {
    isConnecting,
    isConnected,
    isLive,
    participants,
    viewerCount,
    error,
    localVideoRef,
    goLive,
    joinStream,
    endStream,
    toggleVideo,
    toggleAudio,
    cleanup,
  } = useSFUGroupCall({
    groupId: group.id,
    currentUserId,
    userName,
    userPhoto,
    isOwner,
    onParticipantJoin: (participant) => {
      toast.success(`${participant.name} joined`);
    },
    onParticipantLeave: (participantId) => {
      toast.info('A participant left');
      participantVideosRef.current.delete(participantId);
    },
  });

  // Fetch messages
  useEffect(() => {
    if (hasChat) {
      fetchMessages();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`group-chat-${group.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${group.id}`
        }, (payload) => {
          const newMsg = payload.new as GroupMessage;
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [group.id, hasChat]);

  // Fetch members with online status
  useEffect(() => {
    fetchMembers();
    
    // Subscribe to member status changes
    const statusChannel = supabase
      .channel(`group-members-status-${group.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_status'
      }, () => {
        fetchMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [group.id]);

  // Auto-join video if not owner and stream is live
  useEffect(() => {
    if (hasVideo && !isOwner && group.is_live && !isConnected && !isConnecting) {
      joinStream();
    }
  }, [isOwner, group.is_live, isConnected, isConnecting, joinStream, hasVideo]);

  // Set video elements for participants
  useEffect(() => {
    participants.forEach(participant => {
      if (participant.stream && participant.id !== currentUserId) {
        const videoEl = participantVideosRef.current.get(participant.id);
        if (videoEl && videoEl.srcObject !== participant.stream) {
          videoEl.srcObject = participant.stream;
        }
      }
    });
  }, [participants, currentUserId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const fetchMembers = async () => {
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('user_id')
      .eq('group_id', group.id)
      .eq('has_access', true);

    if (memberships) {
      const userIds = memberships.map(m => m.user_id);
      
      // Fetch profiles and online status in parallel
      const [profilesRes, statusRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, photo_url').in('user_id', userIds),
        supabase.from('user_status').select('user_id, is_online').in('user_id', userIds)
      ]);

      const statusMap = new Map(statusRes.data?.map(s => [s.user_id, s.is_online]) || []);
      
      if (profilesRes.data) {
        const memberMap = new Map<string, MemberInfo>();
        profilesRes.data.forEach(p => {
          memberMap.set(p.user_id, { 
            name: p.full_name || 'User', 
            photo: p.photo_url,
            isOnline: statusMap.get(p.user_id) || false
          });
        });
        setMembers(memberMap);
      }
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    // Content moderation - block phone numbers, emails, social media
    const { moderateMessage } = await import('@/lib/content-moderation');
    const moderationResult = moderateMessage(newMessage.trim());
    if (moderationResult.isBlocked) {
      toast.error(moderationResult.reason || 'This message contains prohibited content.');
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: group.id,
          sender_id: currentUserId,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setIsSending(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${group.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('community-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community-files')
        .getPublicUrl(filePath);

      const { error: msgError } = await supabase
        .from('group_messages')
        .insert({
          group_id: group.id,
          sender_id: currentUserId,
          message: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_name: file.name
        });

      if (msgError) throw msgError;
      toast.success('File uploaded');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getSenderInfo = (senderId: string) => {
    if (senderId === currentUserId) {
      return { name: userName, photo: userPhoto, isOnline: true };
    }
    return members.get(senderId) || { name: 'User', photo: null, isOnline: false };
  };

  const handleGoLive = async () => {
    const success = await goLive();
    if (success) {
      toast.success('You are now live!');
    }
  };

  const handleEndStream = async () => {
    await endStream();
    toast.success('Stream ended');
  };

  const handleToggleVideo = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    toggleVideo(newState);
  };

  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    toggleAudio(newState);
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const remoteParticipants = participants.filter(p => p.id !== currentUserId);
  const onlineMembers = Array.from(members.entries()).filter(([_, m]) => m.isOnline);

  const renderFileMessage = (msg: GroupMessage) => {
    if (!msg.file_url) return null;
    
    const isImage = msg.file_type?.startsWith('image/');
    const isVideo = msg.file_type?.startsWith('video/');
    const isAudio = msg.file_type?.startsWith('audio/');

    if (isImage) {
      return (
        <img 
          src={msg.file_url} 
          alt={msg.file_name || 'Image'} 
          className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-90"
          onClick={() => window.open(msg.file_url!, '_blank')}
        />
      );
    }

    if (isVideo) {
      return (
        <video 
          src={msg.file_url} 
          controls 
          className="max-w-full max-h-48 rounded-lg"
        />
      );
    }

    if (isAudio) {
      return (
        <audio src={msg.file_url} controls className="w-full" />
      );
    }

    return (
      <a 
        href={msg.file_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
      >
        <File className="h-5 w-5 text-primary" />
        <span className="text-sm truncate">{msg.file_name || 'Download file'}</span>
      </a>
    );
  };

  return (
    <div className={cn(
      "fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col overflow-hidden",
      isFullscreen 
        ? "inset-4" 
        : "bottom-4 right-4 w-[800px] h-[600px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{group.name}</h3>
          {isLive && (
            <Badge variant="destructive" className="gap-1">
              <Radio className="h-3 w-3 animate-pulse" />
              LIVE
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {viewerCount || group.participant_count}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowMembersList(!showMembersList)}
            className={showMembersList ? 'bg-muted' : ''}
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content - Teams Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Section */}
        {hasVideo && (
          <div className={cn(
            "flex flex-col border-r min-h-0",
            hasChat ? "w-1/2" : "flex-1"
          )}>
            {/* Video Grid */}
            <div className="flex-1 p-2 bg-black min-h-0 overflow-y-auto">
              <div className={cn(
                "grid gap-2 auto-rows-fr h-full",
                remoteParticipants.length === 0 ? 'grid-cols-1' :
                remoteParticipants.length <= 1 ? 'grid-cols-1 sm:grid-cols-2' :
                'grid-cols-2'
              )}>
                {/* Local Video */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden min-h-[150px]">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={userPhoto || undefined} />
                        <AvatarFallback>{userName[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs z-10">
                    You {isOwner && '(Host)'}
                  </div>
                </div>

                {/* Remote Participants */}
                {remoteParticipants.map(participant => (
                  <div key={participant.id} className="relative bg-gray-900 rounded-lg overflow-hidden min-h-[150px]">
                    <video
                      ref={(el) => {
                        if (el) {
                          participantVideosRef.current.set(participant.id, el);
                          if (participant.stream) {
                            el.srcObject = participant.stream;
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {!participant.stream && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={participant.photo} />
                          <AvatarFallback>{participant.name[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs z-10">
                      {participant.name} {participant.isOwner && '(Host)'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Controls */}
            <div className="flex items-center justify-center gap-3 p-3 bg-muted/30 border-t">
              {isConnecting && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </div>
              )}
              
              <Button
                variant={isVideoEnabled ? 'secondary' : 'destructive'}
                size="sm"
                onClick={handleToggleVideo}
                disabled={isConnecting}
              >
                {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>

              <Button
                variant={isAudioEnabled ? 'secondary' : 'destructive'}
                size="sm"
                onClick={handleToggleAudio}
                disabled={isConnecting}
              >
                {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>

              {isOwner && (
                <>
                  {!isLive && !isConnected ? (
                    <Button 
                      size="sm"
                      onClick={handleGoLive} 
                      className="gap-1"
                      disabled={isConnecting}
                    >
                      {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                      Go Live
                    </Button>
                  ) : (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleEndStream} 
                      className="gap-1"
                    >
                      <PhoneOff className="h-4 w-4" />
                      End
                    </Button>
                  )}
                </>
              )}

              {!isOwner && isConnected && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => { cleanup(); }}
                  className="gap-1"
                >
                  <PhoneOff className="h-4 w-4" />
                  Leave
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Chat Section */}
        {hasChat && (
          <div className={cn(
            "flex flex-col",
            hasVideo ? "w-1/2" : "flex-1"
          )}>
            {/* Chat Header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Group Chat</span>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    const sender = getSenderInfo(msg.sender_id);
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex gap-2", isOwn ? 'flex-row-reverse' : 'flex-row')}
                      >
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={sender.photo || undefined} />
                          <AvatarFallback className="text-xs">{sender.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className={cn("max-w-[75%]", isOwn ? 'items-end' : 'items-start')}>
                          {!isOwn && (
                            <p className="text-xs text-muted-foreground mb-1">{sender.name}</p>
                          )}
                          <div
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm",
                              isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            )}
                          >
                            {msg.file_url ? renderFileMessage(msg) : (msg.translated_message || msg.message)}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 border-t flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isSending}
                className="flex-1"
              />
              <Button size="icon" onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Members Sidebar */}
        {showMembersList && (
          <div className="w-48 border-l p-3 bg-muted/20">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({members.size})
            </h4>
            <div className="space-y-2">
              {Array.from(members.entries()).map(([id, member]) => (
                <div key={id} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.photo || undefined} />
                      <AvatarFallback className="text-xs">{member.name[0]}</AvatarFallback>
                    </Avatar>
                    <Circle 
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3",
                        member.isOnline ? "text-green-500 fill-green-500" : "text-gray-400 fill-gray-400"
                      )} 
                    />
                  </div>
                  <span className="text-xs truncate flex-1">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
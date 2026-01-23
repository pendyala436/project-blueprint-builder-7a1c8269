/**
 * PrivateGroupCallWindow
 * 
 * Enhanced private group call UI with:
 * - Host-only video display (participants see only host)
 * - Participants can speak (audio) and chat
 * - 30-minute timer countdown
 * - Optional gift sending during call
 * - 50 participant limit
 * - Refund handling when host ends early
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Users, Radio, Loader2,
  X, Send, Paperclip, File, MessageCircle, Maximize2, Minimize2,
  Clock, Gift, DollarSign, AlertTriangle
} from 'lucide-react';
import { usePrivateGroupCall, MAX_PARTICIPANTS, MAX_DURATION_MINUTES } from '@/hooks/usePrivateGroupCall';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface GroupMessage {
  id: string;
  sender_id: string;
  message: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  created_at: string;
}

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

interface PrivateGroupCallWindowProps {
  group: {
    id: string;
    name: string;
    participant_count: number;
    is_live: boolean;
    stream_id: string | null;
    access_type: string;
    min_gift_amount: number;
    owner_id: string;
  };
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
  onClose: () => void;
  isOwner: boolean;
}

export function PrivateGroupCallWindow({
  group,
  currentUserId,
  userName,
  userPhoto,
  onClose,
  isOwner
}: PrivateGroupCallWindowProps) {
  // Chat state
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI state
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const hasChat = group.access_type === 'chat' || group.access_type === 'both';
  const hasVideo = group.access_type === 'video' || group.access_type === 'both';

  // Enhanced group call hook
  const {
    isConnecting,
    isConnected,
    isLive,
    participants,
    viewerCount,
    error,
    remainingTime,
    totalEarnings,
    isRefunding,
    localVideoRef,
    goLive,
    joinStream,
    endStream,
    toggleVideo,
    toggleAudio,
    cleanup,
  } = usePrivateGroupCall({
    groupId: group.id,
    currentUserId,
    userName,
    userPhoto,
    isOwner,
    giftAmountRequired: group.min_gift_amount,
    onParticipantJoin: (participant) => {
      toast.success(`${participant.name} joined`);
    },
    onParticipantLeave: (participantId, reason) => {
      if (reason === 'insufficient_balance') {
        toast.info('A participant was removed (insufficient balance)');
      } else {
        toast.info('A participant left');
      }
    },
    onSessionEnd: (refunded) => {
      if (refunded && !isOwner) {
        toast.success('Call ended by host. Unused balance has been refunded.');
      }
      onClose();
    },
  });

  // Format remaining time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeProgress = ((MAX_DURATION_MINUTES * 60 - remainingTime) / (MAX_DURATION_MINUTES * 60)) * 100;

  // Fetch messages
  useEffect(() => {
    if (hasChat) {
      fetchMessages();
      
      const channel = supabase
        .channel(`private-group-chat-${group.id}`)
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

  // Auto-join if not owner and stream is live
  useEffect(() => {
    if (hasVideo && !isOwner && group.is_live && !isConnected && !isConnecting) {
      joinStream();
    }
  }, [isOwner, group.is_live, isConnected, isConnecting, joinStream, hasVideo]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Fetch gifts for optional sending
  useEffect(() => {
    const fetchGifts = async () => {
      const { data } = await supabase
        .from('gifts')
        .select('id, name, emoji, price')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (data) setGifts(data);
    };
    fetchGifts();
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await supabase
        .from('group_messages')
        .insert({
          group_id: group.id,
          sender_id: currentUserId,
          message: newMessage.trim()
        });

      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setIsSending(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${group.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('community-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community-files')
        .getPublicUrl(filePath);

      await supabase
        .from('group_messages')
        .insert({
          group_id: group.id,
          sender_id: currentUserId,
          message: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_name: file.name
        });

      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendGift = async (gift: GiftItem) => {
    try {
      const { data, error } = await supabase.rpc('process_group_gift', {
        p_sender_id: currentUserId,
        p_group_id: group.id,
        p_gift_id: gift.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (result.success) {
        toast.success(`${gift.emoji} Gift sent to host!`);
        setShowGiftDialog(false);
      } else {
        toast.error(result.error || 'Failed to send gift');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send gift');
    }
  };

  const handleGoLive = async () => {
    const success = await goLive();
    if (success) {
      toast.success('You are now live!');
    }
  };

  const handleEndStream = async () => {
    setShowEndConfirm(false);
    await endStream(true); // Process refunds
    toast.success('Stream ended');
  };

  const handleToggleVideo = () => {
    if (!isOwner) return; // Only host can toggle video
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
      return <video src={msg.file_url} controls className="max-w-full max-h-48 rounded-lg" />;
    }

    if (isAudio) {
      return <audio src={msg.file_url} controls className="w-full" />;
    }

    return (
      <a 
        href={msg.file_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted"
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
        : "bottom-4 right-4 w-[900px] h-[650px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]"
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
            {viewerCount}/{MAX_PARTICIPANTS}
          </Badge>
          {isLive && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(remainingTime)}
            </Badge>
          )}
          {isOwner && totalEarnings > 0 && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <DollarSign className="h-3 w-3" />
              ₹{totalEarnings.toFixed(0)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timer Progress Bar */}
      {isLive && (
        <div className="px-4 py-1 bg-muted/20">
          <Progress value={timeProgress} className="h-1" />
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            {MAX_DURATION_MINUTES - Math.floor(remainingTime / 60)} of {MAX_DURATION_MINUTES} minutes used
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Section - Host Only */}
        {hasVideo && (
          <div className={cn(
            "flex flex-col border-r min-h-0",
            hasChat ? "w-1/2" : "flex-1"
          )}>
            {/* Video Display */}
            <div className="flex-1 p-2 bg-black min-h-0 flex items-center justify-center">
              {isOwner ? (
                // Host sees their own video
                <div className="relative w-full h-full max-w-2xl">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={userPhoto || undefined} />
                        <AvatarFallback className="text-3xl">{userName[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                    You (Host)
                  </div>
                </div>
              ) : (
                // Participants see ONLY host video
                <div className="relative w-full h-full max-w-2xl">
                  {isConnected ? (
                    <>
                      {/* Host video placeholder - would be replaced with actual stream */}
                      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
                        <div className="text-center text-white">
                          <Avatar className="h-24 w-24 mx-auto mb-4">
                            <AvatarImage src={participants.find(p => p.isOwner)?.photo} />
                            <AvatarFallback className="text-3xl">
                              {participants.find(p => p.isOwner)?.name?.[0] || 'H'}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-lg font-medium">
                            {participants.find(p => p.isOwner)?.name || 'Host'}
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            🎥 Only host video is visible
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            You can speak and chat with everyone
                          </p>
                        </div>
                      </div>
                      <Badge className="absolute top-2 left-2 bg-red-600">
                        <Radio className="h-3 w-3 mr-1 animate-pulse" />
                        Watching Host
                      </Badge>
                    </>
                  ) : (
                    <div className="text-center text-gray-400">
                      <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
                      <p>Connecting to stream...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video Controls */}
            <div className="flex items-center justify-center gap-3 p-3 bg-muted/30 border-t">
              {isConnecting && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </div>
              )}
              
              {isRefunding && (
                <div className="flex items-center gap-2 text-yellow-600 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing refunds...
                </div>
              )}

              {/* Only host can toggle video */}
              {isOwner && (
                <Button
                  variant={isVideoEnabled ? 'secondary' : 'destructive'}
                  size="sm"
                  onClick={handleToggleVideo}
                  disabled={isConnecting}
                >
                  {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
              )}

              {/* Everyone can toggle audio */}
              <Button
                variant={isAudioEnabled ? 'secondary' : 'destructive'}
                size="sm"
                onClick={handleToggleAudio}
                disabled={isConnecting}
              >
                {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>

              {/* Optional gift button for participants */}
              {!isOwner && isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGiftDialog(true)}
                  className="gap-1"
                >
                  <Gift className="h-4 w-4" />
                  Send Gift
                </Button>
              )}

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
                      onClick={() => setShowEndConfirm(true)} 
                      className="gap-1"
                      disabled={isRefunding}
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
                  onClick={handleClose}
                  className="gap-1"
                >
                  <PhoneOff className="h-4 w-4" />
                  Leave
                </Button>
              )}
            </div>

            {/* Participant Info */}
            <div className="px-3 py-2 bg-muted/20 border-t text-center">
              <p className="text-xs text-muted-foreground">
                {isOwner ? (
                  `${viewerCount - 1} viewers watching • Only your video is visible`
                ) : (
                  `${viewerCount} participants • Audio-only for viewers`
                )}
              </p>
            </div>
          </div>
        )}

        {/* Chat Section */}
        {hasChat && (
          <div className={cn(
            "flex flex-col",
            hasVideo ? "w-1/2" : "flex-1"
          )}>
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Group Chat</span>
            </div>

            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    const isHost = msg.sender_id === group.owner_id;
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex gap-2", isOwn ? 'flex-row-reverse' : 'flex-row')}
                      >
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {isOwn ? userName[0] : isHost ? 'H' : 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn("max-w-[75%]", isOwn ? 'items-end' : 'items-start')}>
                          {!isOwn && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {isHost ? '👑 Host' : 'Participant'}
                            </p>
                          )}
                          <div
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm",
                              isOwn ? 'bg-primary text-primary-foreground' : 
                              isHost ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-muted'
                            )}
                          >
                            {msg.file_url ? renderFileMessage(msg) : msg.message}
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

            <div className="p-3 border-t flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
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
      </div>

      {/* Gift Dialog */}
      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Gift to Host</DialogTitle>
            <DialogDescription>
              Optional: Send an additional gift to the host during the call
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            {gifts.slice(0, 9).map((gift) => (
              <Button
                key={gift.id}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => handleSendGift(gift)}
              >
                <span className="text-2xl">{gift.emoji}</span>
                <span className="text-xs">{gift.name}</span>
                <span className="text-xs font-bold">₹{gift.price}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* End Stream Confirmation */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              End Stream Early?
            </DialogTitle>
            <DialogDescription>
              If you end the stream before 30 minutes, participants with remaining balance will receive a refund, and the refund amount will be deducted from your earnings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowEndConfirm(false)}>
              Continue Stream
            </Button>
            <Button variant="destructive" onClick={handleEndStream}>
              End & Process Refunds
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Radio, Loader2, Gift, Clock, Globe, MessageCircle, Send, X } from 'lucide-react';
import { useSFUGroupCall } from '@/hooks/useSFUGroupCall';
import { useGroupVideoAccess } from '@/hooks/useGroupVideoAccess';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface GroupVideoCallProps {
  group: {
    id: string;
    name: string;
    participant_count: number;
    is_live: boolean;
    stream_id: string | null;
    owner_language?: string;
    min_gift_amount?: number;
  };
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
  onClose: () => void;
  isOwner: boolean;
}

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

export function GroupVideoCall({
  group,
  currentUserId,
  userName,
  userPhoto,
  onClose,
  isOwner
}: GroupVideoCallProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string; sender_id: string; message: string; created_at: string; sender_name?: string}>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const participantVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Track video access for men (30 min per gift)
  const {
    hasAccess,
    isOwner: isAccessOwner,
    remainingSeconds,
    groupLanguage,
    minGiftAmount,
    isLoading: accessLoading,
    sendGiftForAccess,
    formatTime,
    checkAccess,
  } = useGroupVideoAccess({
    groupId: group.id,
    userId: currentUserId,
    onAccessExpired: () => {
      toast.warning('Your 30-minute access has expired!', {
        description: 'You have been removed from the video call.',
      });
      cleanup();
      // Automatically close the video call dialog
      onClose();
    },
  });

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
      toast.success(`${participant.name} joined the call`);
    },
    onParticipantLeave: (participantId) => {
      toast.info('A participant left the call');
      participantVideosRef.current.delete(participantId);
    },
  });

  // Fetch gifts and wallet balance for gift dialog
  // Use the group's min_gift_amount directly from props (more reliable than hook state)
  const fetchGiftsAndBalance = async () => {
    const groupMinAmount = group.min_gift_amount || 0;
    
    const [giftsRes, walletRes] = await Promise.all([
      supabase
        .from('gifts')
        .select('id, name, emoji, price')
        .eq('is_active', true)
        .gte('price', groupMinAmount)
        .order('price', { ascending: true }),
      supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', currentUserId)
        .single()
    ]);

    if (giftsRes.data) setGifts(giftsRes.data);
    if (walletRes.data) setWalletBalance(walletRes.data.balance);
  };

  // Fetch total earnings for the group owner (woman)
  const fetchTotalEarnings = async () => {
    if (!isOwner) return;
    
    const { data } = await supabase
      .from('women_earnings')
      .select('amount')
      .eq('user_id', currentUserId);
    
    if (data) {
      const total = data.reduce((sum, row) => sum + (row.amount || 0), 0);
      setTotalEarnings(total);
    }
  };

  // Fetch earnings on mount and periodically for owner
  useEffect(() => {
    if (isOwner) {
      fetchTotalEarnings();
      const interval = setInterval(fetchTotalEarnings, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isOwner, currentUserId]);

  // Fetch chat messages and subscribe to new messages
  useEffect(() => {
    if (!hasAccess && !isOwner) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('group_messages')
        .select('id, sender_id, message, created_at')
        .eq('group_id', group.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        setChatMessages(data);
        scrollChatToBottom();
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`group-chat-video-${group.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${group.id}`
      }, (payload) => {
        const newMsg = payload.new as {id: string; sender_id: string; message: string; created_at: string};
        setChatMessages(prev => [...prev, newMsg]);
        scrollChatToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, hasAccess, isOwner]);

  const scrollChatToBottom = () => {
    setTimeout(() => {
      chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendChatMessage = async () => {
    if (!newMessage.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
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
      setIsSendingMessage(false);
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Track if gift dialog has been shown once
  const [giftDialogShown, setGiftDialogShown] = useState(false);

  // Auto-join if owner or has valid access
  useEffect(() => {
    if (accessLoading) return;
    
    if (isOwner || hasAccess) {
      if (group.is_live && !isConnected && !isConnecting) {
        joinStream();
      }
    } else if (!isOwner && group.is_live && !giftDialogShown) {
      // Show gift dialog only once for men without access
      fetchGiftsAndBalance();
      setShowGiftDialog(true);
      setGiftDialogShown(true);
    }
  }, [isOwner, hasAccess, group.is_live, isConnected, isConnecting, accessLoading, giftDialogShown]);

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

  const handleGoLive = async () => {
    const success = await goLive();
    if (success) {
      toast.success('You are now live!');
    }
  };

  const handleEndStream = async () => {
    await endStream();
    toast.success('Stream ended');
    onClose();
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

  const handleSendGift = async (gift: GiftItem) => {
    if (walletBalance < gift.price) {
      toast.error('Insufficient balance. Please recharge your wallet.');
      return;
    }

    setIsSendingGift(true);
    try {
      const result = await sendGiftForAccess(gift.id);
      
      if (result.success) {
        const giftEmoji = 'gift_emoji' in result ? result.gift_emoji : gift.emoji;
        const giftName = 'gift_name' in result ? result.gift_name : gift.name;
        toast.success(`Gift sent! You have 30 minutes of access.`, {
          description: `${giftEmoji} ${giftName} - 50% to creator, 50% to admin`,
        });
        setShowGiftDialog(false);
        await fetchGiftsAndBalance();
        
        // Join the stream now that we have access
        if (group.is_live && !isConnected && !isConnecting) {
          joinStream();
        }
      } else {
        toast.error(result.error || 'Failed to send gift');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send gift');
    } finally {
      setIsSendingGift(false);
    }
  };

  // For men: only show the host (woman). Men cannot see each other.
  // For host: show all remote participants
  // Find host by isOwner flag OR by having a stream (for men, only host streams video)
  const hostParticipant = participants.find(p => p.isOwner || p.stream);
  const remoteParticipants = isOwner 
    ? participants.filter(p => p.id !== currentUserId) 
    : []; // Men don't see other men

  // Debug: Log participants to verify host detection
  console.log('[GroupVideoCall] Participants:', participants.map(p => ({ id: p.id, isOwner: p.isOwner, hasStream: !!p.stream })));
  console.log('[GroupVideoCall] Host participant:', hostParticipant ? { id: hostParticipant.id, isOwner: hostParticipant.isOwner, hasStream: !!hostParticipant.stream } : 'Not found');

  // Display language name in header
  const displayLanguage = groupLanguage || group.owner_language;

  return (
    <>
      <Dialog open onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {/* Language tag first */}
              {displayLanguage && (
                <Badge variant="outline" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {displayLanguage}
                </Badge>
              )}
              <span>{group.name}</span>
              {isLive && (
                <Badge variant="destructive" className="gap-1">
                  <Radio className="h-3 w-3 animate-pulse" />
                  LIVE
                </Badge>
              )}
              {/* Time remaining for non-owners */}
              {!isOwner && hasAccess && remainingSeconds > 0 && (
                <Badge variant="secondary" className="gap-1 ml-auto">
                  <Clock className="h-3 w-3" />
                  {formatTime(remainingSeconds)}
                </Badge>
              )}
              {/* For women: show user count and earnings */}
              {isOwner && (
                <>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {viewerCount} watching
                  </Badge>
                  <Badge variant="default" className="gap-1 bg-green-600">
                    ₹{totalEarnings.toFixed(2)} earned
                  </Badge>
                </>
              )}
              {/* For men: just show time remaining */}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Access required message for men without access */}
            {!isOwner && !hasAccess && !accessLoading && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Gift className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Gift Required to Watch</p>
                <p className="text-sm text-muted-foreground mb-1">
                  Send a gift of ₹{group.min_gift_amount || minGiftAmount} or more
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  ✓ One-time payment • 30 minutes access • No extra charges
                </p>
                <Button onClick={() => {
                  fetchGiftsAndBalance();
                  setShowGiftDialog(true);
                }}>
                  <Gift className="h-4 w-4 mr-2" />
                  Send Gift to Join
                </Button>
              </div>
            )}

            {/* Video Grid with Chat Panel - only show if owner or has access */}
            {(isOwner || hasAccess) && (
              <div className={`grid gap-2 ${showChat ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
                {/* Video section */}
                <div className={showChat ? 'md:col-span-2' : ''}>
                  {/* For Host (Woman): Show her own video full screen */}
                  {isOwner && (
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {!isVideoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={userPhoto || undefined} />
                            <AvatarFallback className="text-2xl">{userName[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                        {userName} (Host)
                      </div>
                      <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                        {viewerCount} viewers watching
                      </div>
                    </div>
                  )}

                  {/* For Men: Show only the host's video (woman) - full screen */}
                  {!isOwner && hostParticipant && (
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                      <video
                        ref={(el) => {
                          if (el && hostParticipant.stream) {
                            el.srcObject = hostParticipant.stream;
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {!hostParticipant.stream && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={hostParticipant.photo} />
                            <AvatarFallback className="text-2xl">{hostParticipant.name[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                        {hostParticipant.name} (Host)
                      </div>
                    </div>
                  )}

                  {/* For Men: Show waiting message if host not streaming yet */}
                  {!isOwner && !hostParticipant && (
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p>Waiting for host to start streaming...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Panel */}
                {showChat && (
                  <div className="bg-muted/30 rounded-lg flex flex-col h-64 md:h-auto">
                    <div className="p-2 border-b flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        Group Chat
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowChat(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 p-2">
                      <div className="space-y-2">
                        {chatMessages.map((msg) => {
                          const isOwn = msg.sender_id === currentUserId;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] px-2 py-1 rounded text-xs ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                {!isOwn && (
                                  <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                                    {msg.sender_name || 'User'}
                                  </p>
                                )}
                                <p>{msg.message}</p>
                                <p className="text-[9px] opacity-70 mt-0.5">
                                  {format(new Date(msg.created_at), 'HH:mm')}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatScrollRef} />
                      </div>
                    </ScrollArea>
                    <div className="p-2 border-t flex gap-1">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type..."
                        className="h-8 text-xs"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                      />
                      <Button size="icon" className="h-8 w-8" onClick={handleSendChatMessage} disabled={isSendingMessage}>
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Connecting State */}
            {isConnecting && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
              </div>
            )}

            {/* Controls */}
            {(isOwner || hasAccess) && (
              <div className="flex items-center justify-center gap-4">
                {/* Video toggle - only for host (women). Men's video is not visible to anyone */}
                {isOwner && (
                  <Button
                    variant={isVideoEnabled ? 'secondary' : 'destructive'}
                    size="icon"
                    onClick={handleToggleVideo}
                    disabled={isConnecting}
                    title="Toggle your video"
                  >
                    {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>
                )}

                {/* Audio toggle - for both host and men (men can speak) */}
                <Button
                  variant={isAudioEnabled ? 'secondary' : 'destructive'}
                  size="icon"
                  onClick={handleToggleAudio}
                  disabled={isConnecting}
                  title={isOwner ? "Toggle your microphone" : "Toggle your microphone (audio only)"}
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>

                {/* Chat toggle button */}
                <Button
                  variant={showChat ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setShowChat(!showChat)}
                  title="Toggle chat"
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>

                {/* Send extra gift button for men (optional, anytime) */}
                {!isOwner && hasAccess && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      fetchGiftsAndBalance();
                      setShowGiftDialog(true);
                    }}
                    className="gap-2"
                  >
                    <Gift className="h-4 w-4" />
                    Send Gift
                  </Button>
                )}

                {isOwner && (
                  <>
                    {!isLive && !isConnected ? (
                      <Button 
                        onClick={handleGoLive} 
                        className="gap-2"
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Radio className="h-5 w-5" />
                        )}
                        Go Live
                      </Button>
                    ) : (
                      <Button 
                        variant="destructive" 
                        onClick={handleEndStream} 
                        className="gap-2"
                      >
                        <PhoneOff className="h-5 w-5" />
                        End Stream
                      </Button>
                    )}
                  </>
                )}

                {!isOwner && (
                  <Button 
                    variant="destructive" 
                    onClick={handleClose}
                    className="gap-2"
                  >
                    <PhoneOff className="h-5 w-5" />
                    Leave
                  </Button>
                )}
              </div>
            )}

            {/* Info - minimal for clean UI */}
            <div className="text-center text-xs text-muted-foreground">
              {displayLanguage && <span className="mr-2">🌐 {displayLanguage}</span>}
              {isOwner && <span>SFU Group Call</span>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gift Dialog for Video Access */}
      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              {hasAccess ? 'Send Extra Gift' : 'Send Gift for Video Access'}
            </DialogTitle>
            <DialogDescription>
              {hasAccess ? (
                <>
                  Send an optional gift to show your appreciation! 
                  <span className="block mt-1 text-muted-foreground">
                    This adds 30 more minutes to your access.
                  </span>
                </>
              ) : (
                <>
                  Send a gift of ₹{group.min_gift_amount || minGiftAmount} or more to watch {group.name}'s video call for 30 minutes.
                  <span className="block mt-1 font-medium text-foreground">
                    ✓ One-time payment only - no extra charges
                  </span>
                </>
              )}
              {displayLanguage && (
                <span className="block mt-1 text-primary">
                  🌐 Language: {displayLanguage}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Your balance: <span className="font-semibold">₹{walletBalance}</span>
            </p>
            
            {gifts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No gifts available at this price point
              </p>
            ) : (
              <ScrollArea className="h-64">
                <div className="grid grid-cols-2 gap-3">
                  {gifts.map((gift) => (
                    <Button
                      key={gift.id}
                      variant="outline"
                      className="h-auto flex-col py-4 gap-2"
                      disabled={isSendingGift || walletBalance < gift.price}
                      onClick={() => handleSendGift(gift)}
                    >
                      <span className="text-3xl">{gift.emoji}</span>
                      <span className="font-medium">{gift.name}</span>
                      <span className="text-sm text-muted-foreground">₹{gift.price}</span>
                      <span className="text-xs text-primary">30 min access</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            )}

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Gift split: 50% to creator, 50% to admin
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowGiftDialog(false);
              if (!hasAccess && !isOwner) {
                handleClose();
              }
            }}>
              {hasAccess ? 'Cancel' : 'Leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
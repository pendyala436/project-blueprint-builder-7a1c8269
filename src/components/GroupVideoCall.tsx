import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Radio, Loader2, Gift, Clock, Globe } from 'lucide-react';
import { useSFUGroupCall } from '@/hooks/useSFUGroupCall';
import { useGroupVideoAccess } from '@/hooks/useGroupVideoAccess';
import { supabase } from '@/integrations/supabase/client';

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
  const participantVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

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

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Auto-join if owner or has valid access
  useEffect(() => {
    if (accessLoading) return;
    
    if (isOwner || hasAccess) {
      if (group.is_live && !isConnected && !isConnecting) {
        joinStream();
      }
    } else if (!isOwner && group.is_live) {
      // Show gift dialog for men without access
      fetchGiftsAndBalance();
      setShowGiftDialog(true);
    }
  }, [isOwner, hasAccess, group.is_live, isConnected, isConnecting, accessLoading]);

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

  const remoteParticipants = participants.filter(p => p.id !== currentUserId);

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
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {viewerCount} {viewerCount === 1 ? 'participant' : 'participants'}
              </Badge>
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

            {/* Video Grid - only show if owner or has access */}
            {(isOwner || hasAccess) && (
              <div className={`grid gap-2 ${
                remoteParticipants.length === 0 ? 'grid-cols-1' :
                remoteParticipants.length <= 1 ? 'grid-cols-2' :
                remoteParticipants.length <= 3 ? 'grid-cols-2' :
                'grid-cols-3'
              }`}>
                {/* Local Video (Owner/Self) */}
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
                    {userName} {isOwner && '(Host)'}
                  </div>
                </div>

                {/* Remote Participants */}
                {remoteParticipants.map(participant => (
                  <div key={participant.id} className="relative bg-black rounded-lg overflow-hidden aspect-video">
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
                      className="w-full h-full object-cover"
                    />
                    {!participant.stream && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={participant.photo} />
                          <AvatarFallback className="text-2xl">{participant.name[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                      {participant.name} {participant.isOwner && '(Host)'}
                    </div>
                  </div>
                ))}
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
                <Button
                  variant={isVideoEnabled ? 'secondary' : 'destructive'}
                  size="icon"
                  onClick={handleToggleVideo}
                  disabled={isConnecting}
                >
                  {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>

                <Button
                  variant={isAudioEnabled ? 'secondary' : 'destructive'}
                  size="icon"
                  onClick={handleToggleAudio}
                  disabled={isConnecting}
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>

                {/* Extend time button for non-owners */}
                {!isOwner && hasAccess && remainingSeconds < 300 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      fetchGiftsAndBalance();
                      setShowGiftDialog(true);
                    }}
                    className="gap-2"
                  >
                    <Gift className="h-4 w-4" />
                    Add Time
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

            {/* Info */}
            <div className="text-center text-xs text-muted-foreground">
              {displayLanguage && <span className="mr-2">🌐 {displayLanguage}</span>}
              SFU Group Call • {remoteParticipants.length + 1} connected
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
              Send Gift for Video Access
            </DialogTitle>
            <DialogDescription>
              Send a gift of ₹{group.min_gift_amount || minGiftAmount} or more to watch {group.name}'s video call for 30 minutes.
              <span className="block mt-1 font-medium text-foreground">
                ✓ One-time payment only - no extra charges
              </span>
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
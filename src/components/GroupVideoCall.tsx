import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Radio, Loader2 } from 'lucide-react';
import { useSFUGroupCall } from '@/hooks/useSFUGroupCall';

interface GroupVideoCallProps {
  group: {
    id: string;
    name: string;
    participant_count: number;
    is_live: boolean;
    stream_id: string | null;
  };
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
  onClose: () => void;
  isOwner: boolean;
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
  const participantVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

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

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Auto-join if not owner and stream is live
  useEffect(() => {
    if (!isOwner && group.is_live && !isConnected && !isConnecting) {
      joinStream();
    }
  }, [isOwner, group.is_live, isConnected, isConnecting, joinStream]);

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

  const remoteParticipants = participants.filter(p => p.id !== currentUserId);

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {group.name}
            {isLive && (
              <Badge variant="destructive" className="gap-1">
                <Radio className="h-3 w-3 animate-pulse" />
                LIVE
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1 ml-auto">
              <Users className="h-3 w-3" />
              {viewerCount} {viewerCount === 1 ? 'participant' : 'participants'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Grid */}
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

          {/* Connecting State */}
          {isConnecting && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connecting...</span>
            </div>
          )}

          {/* Controls */}
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

          {/* Info */}
          <div className="text-center text-xs text-muted-foreground">
            SFU Group Call • {remoteParticipants.length + 1} connected
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

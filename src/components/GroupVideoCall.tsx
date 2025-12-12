import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Radio } from 'lucide-react';

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
  const [isLive, setIsLive] = useState(group.is_live);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isOwner) {
      initializeMedia();
    }

    // Subscribe to viewer count updates
    const channel = supabase
      .channel(`group-video-${group.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId, name: userName });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      stopMedia();
    };
  }, []);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media:', error);
      toast.error('Could not access camera/microphone');
    }
  };

  const stopMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
  };

  const handleGoLive = async () => {
    try {
      const streamId = `group-${group.id}-${Date.now()}`;
      
      await supabase
        .from('private_groups')
        .update({ is_live: true, stream_id: streamId })
        .eq('id', group.id);

      setIsLive(true);
      toast.success('You are now live!');
    } catch (error) {
      toast.error('Failed to go live');
    }
  };

  const handleEndStream = async () => {
    try {
      await supabase
        .from('private_groups')
        .update({ is_live: false, stream_id: null })
        .eq('id', group.id);

      setIsLive(false);
      stopMedia();
      onClose();
      toast.success('Stream ended');
    } catch (error) {
      toast.error('Failed to end stream');
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl">
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
              {viewerCount} watching
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {isOwner ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={userPhoto || undefined} />
                  <AvatarFallback className="text-3xl">{userName[0]}</AvatarFallback>
                </Avatar>
              </div>
            )}

            {!isVideoEnabled && isOwner && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={userPhoto || undefined} />
                  <AvatarFallback className="text-3xl">{userName[0]}</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          {/* Controls */}
          {isOwner && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isVideoEnabled ? 'secondary' : 'destructive'}
                size="icon"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>

              <Button
                variant={isAudioEnabled ? 'secondary' : 'destructive'}
                size="icon"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              {!isLive ? (
                <Button onClick={handleGoLive} className="gap-2">
                  <Radio className="h-5 w-5" />
                  Go Live
                </Button>
              ) : (
                <Button variant="destructive" onClick={handleEndStream} className="gap-2">
                  <PhoneOff className="h-5 w-5" />
                  End Stream
                </Button>
              )}
            </div>
          )}

          {!isOwner && (
            <div className="text-center text-muted-foreground">
              <p>Watching {group.name}'s live stream</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

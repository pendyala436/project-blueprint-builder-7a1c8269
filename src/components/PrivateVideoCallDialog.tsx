import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Clock, Globe, Loader2 } from 'lucide-react';
import { usePrivateVideoCall } from '@/hooks/usePrivateVideoCall';
import { supabase } from '@/integrations/supabase/client';

interface PrivateVideoCallDialogProps {
  callId: string;
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
  partnerName: string;
  partnerPhoto: string | null;
  partnerLanguage?: string;
  onClose: () => void;
}

export function PrivateVideoCallDialog({
  callId,
  currentUserId,
  userName,
  userPhoto,
  partnerName,
  partnerPhoto,
  partnerLanguage,
  onClose,
}: PrivateVideoCallDialogProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const {
    hasAccess,
    isInitiator,
    remainingSeconds,
    isLoading,
    endCall,
    formatTime,
  } = usePrivateVideoCall({
    callId,
    userId: currentUserId,
    onAccessExpired: () => {
      toast.warning('Your 30-minute call has ended!', {
        description: 'The video call session has expired.',
      });
      handleEndCall();
    },
  });

  // Initialize WebRTC connection
  useEffect(() => {
    if (!hasAccess || isLoading) return;

    const initializeCall = async () => {
      try {
        // Get local media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });
        peerConnectionRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Handle remote tracks
        pc.ontrack = (event) => {
          if (event.streams[0]) {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
          }
        };

        // Subscribe to signaling channel
        const channel = supabase
          .channel(`private-call-${callId}`)
          .on('broadcast', { event: 'offer' }, async ({ payload }) => {
            if (payload.from !== currentUserId) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              
              channel.send({
                type: 'broadcast',
                event: 'answer',
                payload: { answer, from: currentUserId },
              });
            }
          })
          .on('broadcast', { event: 'answer' }, async ({ payload }) => {
            if (payload.from !== currentUserId) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
            if (payload.from !== currentUserId && payload.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (error) {
                console.error('Error adding ICE candidate:', error);
              }
            }
          })
          .subscribe();

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: event.candidate, from: currentUserId },
            });
          }
        };

        // If initiator (woman), create offer
        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: { offer, from: currentUserId },
          });
        }

        setIsConnecting(false);

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error initializing call:', error);
        toast.error('Failed to access camera/microphone');
      }
    };

    initializeCall();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [hasAccess, isLoading, callId, currentUserId, isInitiator]);

  const handleToggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleToggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const handleEndCall = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    await endCall();
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open onOpenChange={handleEndCall}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading call...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!hasAccess) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Call Ended</DialogTitle>
          </DialogHeader>
          <p className="text-center text-muted-foreground py-4">
            This call session has ended or expired.
          </p>
          <Button onClick={onClose} className="w-full">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={handleEndCall}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {partnerLanguage && (
              <Badge variant="outline" className="gap-1">
                <Globe className="h-3 w-3" />
                {partnerLanguage}
              </Badge>
            )}
            <span>Private Call with {partnerName}</span>
            <Badge variant="secondary" className="gap-1 ml-auto">
              <Clock className="h-3 w-3" />
              {formatTime(remainingSeconds)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Main video (remote) */}
          <div className="relative bg-black aspect-video">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {isConnecting ? (
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Connecting...</p>
                  </div>
                ) : (
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={partnerPhoto || undefined} />
                    <AvatarFallback className="text-3xl">{partnerName[0]}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            )}
          </div>

          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-40 h-30 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-background">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userPhoto || undefined} />
                  <AvatarFallback>{userName[0]}</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 p-4 bg-background border-t">
          <Button
            variant={isVideoEnabled ? 'secondary' : 'destructive'}
            size="lg"
            className="rounded-full h-12 w-12"
            onClick={handleToggleVideo}
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          
          <Button
            variant={isAudioEnabled ? 'secondary' : 'destructive'}
            size="lg"
            className="rounded-full h-12 w-12"
            onClick={handleToggleAudio}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full h-12 w-12"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  remoteUserId: string;
  remoteName: string;
  remotePhoto: string | null;
  isInitiator: boolean;
  currentUserId: string;
}

const VideoCallModal = ({
  isOpen,
  onClose,
  callId,
  remoteUserId,
  remoteName,
  remotePhoto,
  isInitiator,
  currentUserId
}: VideoCallModalProps) => {
  const { toast } = useToast();
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'active' | 'ended'>('ringing');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const ratePerMinute = 5; // INR per minute

  useEffect(() => {
    if (isOpen) {
      initializeCall();
      subscribeToCallUpdates();
    }

    return () => {
      cleanup();
    };
  }, [isOpen, callId]);

  useEffect(() => {
    if (callStatus === 'active') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => {
          const newDuration = prev + 1;
          setTotalCost(Math.ceil(newDuration / 60) * ratePerMinute);
          return newDuration;
        });
      }, 1000);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStatus]);

  const subscribeToCallUpdates = () => {
    const channel = supabase
      .channel(`video-call-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_call_sessions',
          filter: `call_id=eq.${callId}`
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'active') {
            setCallStatus('active');
          } else if (newStatus === 'declined' || newStatus === 'ended' || newStatus === 'missed') {
            setCallStatus('ended');
            toast({
              title: "Call Ended",
              description: newStatus === 'declined' ? 'Call was declined' : 'Call has ended',
            });
            setTimeout(onClose, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      peerConnectionRef.current = new RTCPeerConnection(configuration);

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallStatus('active');
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          // In production, send this to the remote peer via signaling server
          console.log('ICE candidate:', event.candidate);
        }
      };

      if (isInitiator) {
        // Create and send offer
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        setCallStatus('connecting');
      }

    } catch (error) {
      console.error('Error initializing call:', error);
      toast({
        title: "Camera/Microphone Error",
        description: "Please allow access to camera and microphone",
        variant: "destructive",
      });
    }
  };

  const cleanup = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const endCall = async () => {
    await supabase
      .from('video_call_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        end_reason: 'user_ended',
        total_minutes: callDuration / 60,
        total_earned: totalCost
      })
      .eq('call_id', callId);

    cleanup();
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => endCall()}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden bg-black">
        <div className="relative w-full h-full flex flex-col">
          {/* Remote Video (Full screen) */}
          <div className="flex-1 relative bg-gray-900">
            {callStatus === 'ringing' || callStatus === 'connecting' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Avatar className="w-32 h-32 mb-4">
                  <AvatarImage src={remotePhoto || undefined} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-pink-500 to-purple-600">
                    {remoteName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-semibold mb-2">{remoteName}</h2>
                <div className="flex items-center gap-2 text-gray-300">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{callStatus === 'ringing' ? 'Ringing...' : 'Connecting...'}</span>
                </div>
              </div>
            ) : (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {/* Local Video (Picture-in-picture) */}
            <div className="absolute bottom-20 right-4 w-40 h-28 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Call Info */}
            {callStatus === 'active' && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono">{formatDuration(callDuration)}</span>
                  <span className="text-sm text-gray-300">₹{totalCost}</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 ${!isAudioEnabled ? 'bg-red-500 border-red-500 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 ${!isVideoEnabled ? 'bg-red-500 border-red-500 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>

              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
                onClick={endCall}
              >
                <PhoneOff className="w-7 h-7" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;

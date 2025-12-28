import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MediaServerCallState {
  isConnecting: boolean;
  isConnected: boolean;
  callStatus: 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';
  callDuration: number;
  totalCost: number;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

interface UseMediaServerCallProps {
  callId: string;
  currentUserId: string;
  remoteUserId: string;
  isInitiator: boolean;
  ratePerMinute?: number;
  onCallEnded?: () => void;
}

export const useMediaServerCall = ({
  callId,
  currentUserId,
  remoteUserId,
  isInitiator,
  ratePerMinute = 5,
  onCallEnded,
}: UseMediaServerCallProps) => {
  const { toast } = useToast();
  
  const [state, setState] = useState<MediaServerCallState>({
    isConnecting: false,
    isConnected: false,
    callStatus: 'idle',
    callDuration: 0,
    totalCost: 0,
    isVideoEnabled: true,
    isAudioEnabled: true,
  });

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  };

  // Start call timer when active
  useEffect(() => {
    if (state.callStatus === 'active') {
      callTimerRef.current = setInterval(() => {
        setState(prev => {
          const newDuration = prev.callDuration + 1;
          return {
            ...prev,
            callDuration: newDuration,
            totalCost: Math.ceil(newDuration / 60) * ratePerMinute,
          };
        });
      }, 1000);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [state.callStatus, ratePerMinute]);

  // Initialize local media
  const initLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error getting local media:', error);
      toast({
        title: "Camera/Microphone Error",
        description: "Please allow access to camera and microphone",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // Setup signaling via Supabase Realtime
  const setupSignaling = useCallback(async () => {
    const channel = supabase.channel(`video-signal-${callId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        console.log('Received offer:', payload);
        if (peerConnectionRef.current && payload.senderId !== currentUserId) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.sdp)
          );
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          channel.send({
            type: 'broadcast',
            event: 'answer',
            payload: { sdp: answer, senderId: currentUserId }
          });
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        console.log('Received answer:', payload);
        if (peerConnectionRef.current && payload.senderId !== currentUserId) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.sdp)
          );
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        console.log('Received ICE candidate:', payload);
        if (peerConnectionRef.current && payload.senderId !== currentUserId) {
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(payload.candidate)
            );
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      })
      .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
        if (payload.senderId !== currentUserId) {
          endCall();
        }
      })
      .subscribe();

    signalChannelRef.current = channel;
    return channel;
  }, [callId, currentUserId]);

  // Create peer connection
  const createPeerConnection = useCallback(async (localStream: MediaStream) => {
    const pc = new RTCPeerConnection(iceServers);

    // Add local tracks
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setState(prev => ({ ...prev, callStatus: 'active', isConnected: true }));
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signalChannelRef.current) {
        signalChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate, senderId: currentUserId }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setState(prev => ({ ...prev, callStatus: 'active', isConnected: true }));
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setState(prev => ({ ...prev, callStatus: 'ended' }));
        onCallEnded?.();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [currentUserId, onCallEnded]);

  // Start call (initiator)
  const startCall = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, callStatus: 'connecting' }));

      // Create room via edge function
      const { data: roomData, error: roomError } = await supabase.functions.invoke('video-call-server', {
        body: {
          action: 'create_room',
          callId,
          userId: currentUserId,
        }
      });

      if (roomError) throw roomError;
      console.log('Room created:', roomData);

      // Initialize media and signaling
      const localStream = await initLocalMedia();
      await setupSignaling();
      const pc = await createPeerConnection(localStream);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      signalChannelRef.current?.send({
        type: 'broadcast',
        event: 'offer',
        payload: { sdp: offer, senderId: currentUserId }
      });

      setState(prev => ({ ...prev, isConnecting: false, callStatus: 'ringing' }));
    } catch (error) {
      console.error('Error starting call:', error);
      setState(prev => ({ ...prev, isConnecting: false, callStatus: 'ended' }));
      toast({
        title: "Error",
        description: "Failed to start video call",
        variant: "destructive",
      });
    }
  }, [callId, currentUserId, initLocalMedia, setupSignaling, createPeerConnection, toast]);

  // Join call (receiver)
  const joinCall = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, callStatus: 'connecting' }));

      // Join room via edge function
      const { data: roomData, error: roomError } = await supabase.functions.invoke('video-call-server', {
        body: {
          action: 'join_room',
          callId,
          userId: currentUserId,
        }
      });

      if (roomError) throw roomError;
      console.log('Joined room:', roomData);

      // Initialize media and signaling
      const localStream = await initLocalMedia();
      await setupSignaling();
      await createPeerConnection(localStream);

      setState(prev => ({ ...prev, isConnecting: false }));
    } catch (error) {
      console.error('Error joining call:', error);
      setState(prev => ({ ...prev, isConnecting: false, callStatus: 'ended' }));
      toast({
        title: "Error",
        description: "Failed to join video call",
        variant: "destructive",
      });
    }
  }, [callId, currentUserId, initLocalMedia, setupSignaling, createPeerConnection, toast]);

  // End call
  const endCall = useCallback(async () => {
    // Notify other participant
    signalChannelRef.current?.send({
      type: 'broadcast',
      event: 'call-ended',
      payload: { senderId: currentUserId }
    });

    // Update database
    await supabase.functions.invoke('video-call-server', {
      body: {
        action: 'end_call',
        callId,
        userId: currentUserId,
      }
    });

    // Update call session with final stats
    await supabase
      .from('video_call_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        end_reason: 'user_ended',
        total_minutes: state.callDuration / 60,
        total_earned: state.totalCost,
      })
      .eq('call_id', callId);

    cleanup();
    setState(prev => ({ ...prev, callStatus: 'ended' }));
    onCallEnded?.();
  }, [callId, currentUserId, state.callDuration, state.totalCost, onCallEnded]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isAudioEnabled: audioTrack.enabled }));
      }
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }
  }, []);

  // Auto-start based on role
  useEffect(() => {
    if (isInitiator) {
      startCall();
    } else {
      joinCall();
    }

    return cleanup;
  }, []);

  // Subscribe to call status updates
  useEffect(() => {
    const channel = supabase
      .channel(`call-status-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_call_sessions',
          filter: `call_id=eq.${callId}`
        },
        (payload) => {
          const status = payload.new.status;
          if (status === 'declined' || status === 'missed') {
            toast({
              title: "Call Ended",
              description: status === 'declined' ? 'Call was declined' : 'Call was missed',
            });
            cleanup();
            setState(prev => ({ ...prev, callStatus: 'ended' }));
            onCallEnded?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, cleanup, onCallEnded, toast]);

  return {
    ...state,
    localVideoRef,
    remoteVideoRef,
    startCall,
    joinCall,
    endCall,
    toggleVideo,
    toggleAudio,
    cleanup,
  };
};

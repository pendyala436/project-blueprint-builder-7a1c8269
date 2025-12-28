import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * SRS (Simple Realtime Server) Configuration
 * 
 * IMPORTANT: No video/audio content is stored or recorded.
 * - All streams are ephemeral (real-time only)
 * - Session metadata is auto-deleted after 5 minutes
 * - SRS is configured without recording (DVR disabled)
 * 
 * Configuration is handled via edge functions - no external URLs needed in client code.
 * The video-call-server edge function manages all SRS communication.
 */
const SRS_CONFIG = {
  noRecording: true, // Flag indicating no content is stored
  // All SRS URLs are handled server-side via edge functions
};

interface SRSCallState {
  isConnecting: boolean;
  isConnected: boolean;
  callStatus: 'idle' | 'publishing' | 'playing' | 'active' | 'ended';
  callDuration: number;
  totalCost: number;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  streamId: string | null;
  isLiveStreaming: boolean;
  viewerCount: number;
}

interface UseSRSCallProps {
  callId: string;
  currentUserId: string;
  remoteUserId?: string;
  isInitiator: boolean;
  ratePerMinute?: number;
  mode?: 'call' | 'stream'; // 1-to-1 call or live streaming
  onCallEnded?: () => void;
}

export const useSRSCall = ({
  callId,
  currentUserId,
  remoteUserId,
  isInitiator,
  ratePerMinute = 5,
  mode = 'call',
  onCallEnded,
}: UseSRSCallProps) => {
  const { toast } = useToast();
  
  const [state, setState] = useState<SRSCallState>({
    isConnecting: false,
    isConnected: false,
    callStatus: 'idle',
    callDuration: 0,
    totalCost: 0,
    isVideoEnabled: true,
    isAudioEnabled: true,
    streamId: null,
    isLiveStreaming: mode === 'stream',
    viewerCount: 0,
  });

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Generate unique stream name
  const streamName = `${callId}_${currentUserId}`;

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
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
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

      console.log('Local media initialized:', stream.getTracks().map(t => t.kind));
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

  // Create SRS WebRTC Publisher
  const createSRSPublisher = useCallback(async (stream: MediaStream) => {
    const pc = new RTCPeerConnection();
    
    // Add local tracks to peer connection
    stream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track.kind);
      pc.addTrack(track, stream);
    });

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log('Created SDP offer for publishing');

    // Send offer to SRS server via edge function
    const { data, error } = await supabase.functions.invoke('video-call-server', {
      body: {
        action: 'srs_publish',
        streamName,
        sdp: offer.sdp,
        callId,
        userId: currentUserId,
        mode,
      }
    });

    if (error || !data?.success) {
      console.error('SRS publish error:', error || data?.error);
      throw new Error(data?.error || 'Failed to connect to SRS server');
    }

    // Set remote description from SRS
    const answer = new RTCSessionDescription({
      type: 'answer',
      sdp: data.sdp,
    });
    await pc.setRemoteDescription(answer);

    console.log('SRS publish connection established');
    peerConnectionRef.current = pc;

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Publisher connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setState(prev => ({ 
          ...prev, 
          isConnected: true,
          streamId: streamName,
        }));
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.error('Publisher connection failed');
      }
    };

    return pc;
  }, [streamName, callId, currentUserId, mode]);

  // Create SRS WebRTC Player
  const createSRSPlayer = useCallback(async (remoteStreamName: string) => {
    const pc = new RTCPeerConnection();

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Create offer (SRS uses offer from client for playing too)
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log('Created SDP offer for playing stream:', remoteStreamName);

    // Send offer to SRS server via edge function
    const { data, error } = await supabase.functions.invoke('video-call-server', {
      body: {
        action: 'srs_play',
        streamName: remoteStreamName,
        sdp: offer.sdp,
        callId,
        userId: currentUserId,
      }
    });

    if (error || !data?.success) {
      console.error('SRS play error:', error || data?.error);
      throw new Error(data?.error || 'Failed to play stream from SRS');
    }

    // Set remote description from SRS
    const answer = new RTCSessionDescription({
      type: 'answer',
      sdp: data.sdp,
    });
    await pc.setRemoteDescription(answer);

    console.log('SRS play connection established');

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log('Player connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setState(prev => ({ ...prev, callStatus: 'active', isConnected: true }));
      }
    };

    return pc;
  }, [callId, currentUserId]);

  // Setup signaling for 1-to-1 calls
  const setupCallSignaling = useCallback(async () => {
    const channel = supabase.channel(`srs-signal-${callId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'stream-ready' }, async ({ payload }) => {
        console.log('Remote stream ready:', payload);
        if (payload.senderId !== currentUserId && payload.streamName) {
          // Start playing remote stream
          try {
            await createSRSPlayer(payload.streamName);
          } catch (error) {
            console.error('Error playing remote stream:', error);
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
  }, [callId, currentUserId, createSRSPlayer]);

  // Start publishing (for initiator or streamer)
  const startPublishing = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, callStatus: 'publishing' }));

      // Initialize local media
      const stream = await initLocalMedia();

      // Setup signaling for calls
      if (mode === 'call') {
        await setupCallSignaling();
      }

      // Create SRS publisher
      await createSRSPublisher(stream);

      // Notify remote user that stream is ready (for calls)
      if (mode === 'call' && signalChannelRef.current) {
        signalChannelRef.current.send({
          type: 'broadcast',
          event: 'stream-ready',
          payload: { senderId: currentUserId, streamName }
        });
      }

      // Update database
      await supabase.functions.invoke('video-call-server', {
        body: {
          action: 'create_room',
          callId,
          userId: currentUserId,
          streamName,
          mode,
        }
      });

      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        callStatus: mode === 'stream' ? 'active' : 'publishing',
        streamId: streamName,
      }));

      if (mode === 'stream') {
        toast({
          title: "Live Stream Started",
          description: "Your stream is now live!",
        });
      }
    } catch (error) {
      console.error('Error starting publishing:', error);
      setState(prev => ({ ...prev, isConnecting: false, callStatus: 'ended' }));
      toast({
        title: "Error",
        description: "Failed to start video",
        variant: "destructive",
      });
    }
  }, [initLocalMedia, setupCallSignaling, createSRSPublisher, callId, currentUserId, mode, streamName, toast]);

  // Start playing (for receiver)
  const startPlaying = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, callStatus: 'playing' }));

      // Setup signaling
      await setupCallSignaling();

      // Initialize local media for 2-way call
      if (mode === 'call') {
        const stream = await initLocalMedia();
        await createSRSPublisher(stream);

        // Notify that our stream is ready
        signalChannelRef.current?.send({
          type: 'broadcast',
          event: 'stream-ready',
          payload: { senderId: currentUserId, streamName }
        });
      }

      // Get remote stream name and start playing
      const remoteStreamName = `${callId}_${remoteUserId}`;
      
      // Wait a bit for remote to publish, then try playing
      setTimeout(async () => {
        try {
          await createSRSPlayer(remoteStreamName);
          setState(prev => ({ ...prev, isConnecting: false, callStatus: 'active' }));
        } catch (error) {
          console.log('Waiting for remote stream...');
        }
      }, 1000);

      // Update database
      await supabase.functions.invoke('video-call-server', {
        body: {
          action: 'join_room',
          callId,
          userId: currentUserId,
        }
      });

    } catch (error) {
      console.error('Error starting playing:', error);
      setState(prev => ({ ...prev, isConnecting: false, callStatus: 'ended' }));
      toast({
        title: "Error",
        description: "Failed to join video call",
        variant: "destructive",
      });
    }
  }, [setupCallSignaling, initLocalMedia, createSRSPublisher, createSRSPlayer, callId, currentUserId, remoteUserId, mode, streamName, toast]);

  // Watch live stream (for viewers)
  const watchStream = useCallback(async (streamerUserId: string) => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, callStatus: 'playing' }));

      const streamToWatch = `${callId}_${streamerUserId}`;
      await createSRSPlayer(streamToWatch);

      setState(prev => ({ ...prev, isConnecting: false, callStatus: 'active' }));
    } catch (error) {
      console.error('Error watching stream:', error);
      setState(prev => ({ ...prev, isConnecting: false, callStatus: 'ended' }));
      toast({
        title: "Stream Unavailable",
        description: "The stream is not available",
        variant: "destructive",
      });
    }
  }, [callId, createSRSPlayer, toast]);

  // Get HLS URL for large-scale streaming (handled server-side)
  const getHLSUrl = useCallback(async () => {
    if (state.streamId) {
      // Request HLS URL from edge function to avoid hardcoded server URLs
      const { data } = await supabase.functions.invoke('video-call-server', {
        body: { action: 'get_hls_url', streamName: state.streamId }
      });
      return data?.hlsUrl || null;
    }
    return null;
  }, [state.streamId]);

  // End call/stream
  const endCall = useCallback(async () => {
    // Notify other participants
    signalChannelRef.current?.send({
      type: 'broadcast',
      event: 'call-ended',
      payload: { senderId: currentUserId }
    });

    // Stop publishing via edge function
    await supabase.functions.invoke('video-call-server', {
      body: {
        action: 'srs_unpublish',
        streamName,
        callId,
        userId: currentUserId,
      }
    });

    // Update database
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
  }, [streamName, callId, currentUserId, state.callDuration, state.totalCost, onCallEnded]);

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

  // Cleanup resources
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
      startPublishing();
    } else if (mode === 'call') {
      startPlaying();
    }

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitiator, mode]);

  // Subscribe to viewer count updates (for streaming)
  useEffect(() => {
    if (mode === 'stream' && state.isConnected) {
      const interval = setInterval(async () => {
        // Get viewer count from SRS API via edge function
        const { data } = await supabase.functions.invoke('video-call-server', {
          body: {
            action: 'srs_get_viewers',
            streamName,
          }
        });
        
        if (data?.viewerCount !== undefined) {
          setState(prev => ({ ...prev, viewerCount: data.viewerCount }));
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [mode, state.isConnected, streamName]);

  return {
    ...state,
    localVideoRef,
    remoteVideoRef,
    startPublishing,
    startPlaying,
    watchStream,
    endCall,
    toggleVideo,
    toggleAudio,
    cleanup,
    getHLSUrl,
    srsConfig: SRS_CONFIG,
  };
};

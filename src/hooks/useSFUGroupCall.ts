import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  name: string;
  photo?: string;
  stream?: MediaStream;
  isOwner: boolean;
}

interface UseSFUGroupCallProps {
  groupId: string;
  currentUserId: string;
  userName: string;
  userPhoto?: string | null;
  isOwner: boolean;
  onParticipantJoin?: (participant: Participant) => void;
  onParticipantLeave?: (participantId: string) => void;
}

interface SFUGroupCallState {
  isConnecting: boolean;
  isConnected: boolean;
  isLive: boolean;
  participants: Participant[];
  viewerCount: number;
  error: string | null;
}

export function useSFUGroupCall({
  groupId,
  currentUserId,
  userName,
  userPhoto,
  isOwner,
  onParticipantJoin,
  onParticipantLeave,
}: UseSFUGroupCallProps) {
  const [state, setState] = useState<SFUGroupCallState>({
    isConnecting: false,
    isConnected: false,
    isLive: false,
    participants: [],
    viewerCount: 0,
    error: null,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ICE servers for WebRTC
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const initLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media:', error);
      setState(prev => ({ ...prev, error: 'Could not access camera/microphone' }));
      return null;
    }
  }, []);

  const createPeerConnection = useCallback((participantId: string) => {
    const pc = new RTCPeerConnection({ iceServers });

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            from: currentUserId,
            to: participantId,
          },
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.id === participantId ? { ...p, stream: remoteStream } : p
        ),
      }));
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        peerConnections.current.delete(participantId);
      }
    };

    peerConnections.current.set(participantId, pc);
    return pc;
  }, [currentUserId, iceServers]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, fromId: string) => {
    let pc = peerConnections.current.get(fromId);
    if (!pc) {
      pc = createPeerConnection(fromId);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'answer',
      payload: {
        answer,
        from: currentUserId,
        to: fromId,
      },
    });
  }, [createPeerConnection, currentUserId]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, fromId: string) => {
    const pc = peerConnections.current.get(fromId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, fromId: string) => {
    const pc = peerConnections.current.get(fromId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const connectToParticipant = useCallback(async (participantId: string) => {
    const pc = createPeerConnection(participantId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'offer',
      payload: {
        offer,
        from: currentUserId,
        to: participantId,
      },
    });
  }, [createPeerConnection, currentUserId]);

  const setupSignaling = useCallback(() => {
    const channel = supabase.channel(`sfu-group-${groupId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUserId },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const participantIds = Object.keys(presenceState);
        
        setState(prev => ({
          ...prev,
          viewerCount: participantIds.length,
          participants: participantIds.map(id => {
            const existing = prev.participants.find(p => p.id === id);
            if (existing) return existing;
            
            const presenceData = presenceState[id]?.[0] as { name?: string; photo?: string; isOwner?: boolean } | undefined;
            return {
              id,
              name: presenceData?.name || 'Unknown',
              photo: presenceData?.photo,
              isOwner: presenceData?.isOwner || false,
            };
          }),
        }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presence = newPresences[0] as { name?: string; photo?: string; isOwner?: boolean } | undefined;
        const newParticipant: Participant = {
          id: key,
          name: presence?.name || 'Unknown',
          photo: presence?.photo,
          isOwner: presence?.isOwner || false,
        };
        
        onParticipantJoin?.(newParticipant);
        
        // If we're the owner or an existing participant, initiate connection
        if (key !== currentUserId && localStream.current) {
          connectToParticipant(key);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        peerConnections.current.get(key)?.close();
        peerConnections.current.delete(key);
        onParticipantLeave?.(key);
        
        setState(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.id !== key),
        }));
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.to === currentUserId) {
          await handleOffer(payload.offer, payload.from);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.to === currentUserId) {
          await handleAnswer(payload.answer, payload.from);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.to === currentUserId) {
          await handleIceCandidate(payload.candidate, payload.from);
        }
      })
      .on('broadcast', { event: 'stream-ended' }, () => {
        cleanup();
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: userName,
          photo: userPhoto,
          isOwner,
        });
        setState(prev => ({ ...prev, isConnected: true }));
      }
    });

    channelRef.current = channel;
    return channel;
  }, [
    groupId,
    currentUserId,
    userName,
    userPhoto,
    isOwner,
    connectToParticipant,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    onParticipantJoin,
    onParticipantLeave,
  ]);

  const goLive = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const stream = await initLocalMedia();
      if (!stream) {
        setState(prev => ({ ...prev, isConnecting: false }));
        return false;
      }

      setupSignaling();

      // Update group status in database
      await supabase
        .from('private_groups')
        .update({ 
          is_live: true, 
          stream_id: `sfu-${groupId}-${Date.now()}` 
        })
        .eq('id', groupId);

      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        isLive: true,
        participants: [{
          id: currentUserId,
          name: userName,
          photo: userPhoto || undefined,
          stream,
          isOwner: true,
        }],
      }));

      return true;
    } catch (error) {
      console.error('Error going live:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Failed to start stream' 
      }));
      return false;
    }
  }, [groupId, currentUserId, userName, userPhoto, initLocalMedia, setupSignaling]);

  const joinStream = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const stream = await initLocalMedia();
      if (!stream) {
        setState(prev => ({ ...prev, isConnecting: false }));
        return false;
      }

      setupSignaling();

      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        isConnected: true,
      }));

      return true;
    } catch (error) {
      console.error('Error joining stream:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Failed to join stream' 
      }));
      return false;
    }
  }, [initLocalMedia, setupSignaling]);

  const endStream = useCallback(async () => {
    // Notify all participants
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stream-ended',
      payload: {},
    });

    // Update database
    await supabase
      .from('private_groups')
      .update({ is_live: false, stream_id: null })
      .eq('id', groupId);

    cleanup();
  }, [groupId]);

  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, []);

  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, []);

  const cleanup = useCallback(() => {
    // Stop local tracks
    localStream.current?.getTracks().forEach(track => track.stop());
    localStream.current = null;

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Unsubscribe from channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setState({
      isConnecting: false,
      isConnected: false,
      isLive: false,
      participants: [],
      viewerCount: 0,
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    localVideoRef,
    goLive,
    joinStream,
    endStream,
    toggleVideo,
    toggleAudio,
    cleanup,
  };
}

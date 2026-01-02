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
  const mountedRef = useRef(true);
  const retryCountRef = useRef<Map<string, number>>(new Map());
  const MAX_RETRIES = 3;

  // Safe state setter to prevent updates after unmount
  const safeSetState = useCallback((updater: (prev: SFUGroupCallState) => SFUGroupCallState) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  // ICE servers for WebRTC with multiple STUN servers
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ];

  const initLocalMedia = useCallback(async () => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Media devices not supported in this browser');
      }

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

      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return null;
      }

      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error: any) {
      console.error('Error accessing media:', error);
      const errorMessage = error.name === 'NotAllowedError' 
        ? 'Camera/microphone permission denied' 
        : error.name === 'NotFoundError'
        ? 'No camera/microphone found'
        : 'Could not access camera/microphone';
      safeSetState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [safeSetState]);

  const retryConnection = useCallback(async (participantId: string) => {
    const retryCount = retryCountRef.current.get(participantId) || 0;
    if (retryCount >= MAX_RETRIES) {
      console.warn(`Max retries reached for participant ${participantId}`);
      return;
    }
    retryCountRef.current.set(participantId, retryCount + 1);
    
    // Close existing connection
    peerConnections.current.get(participantId)?.close();
    peerConnections.current.delete(participantId);
    
    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (mountedRef.current && localStream.current) {
      console.log(`Retrying connection to ${participantId} (attempt ${retryCount + 1})`);
    }
  }, []);

  const createPeerConnection = useCallback((participantId: string) => {
    // Close existing connection if any
    const existingPc = peerConnections.current.get(participantId);
    if (existingPc) {
      existingPc.close();
    }

    const pc = new RTCPeerConnection({ iceServers });

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current && mountedRef.current) {
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

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state with ${participantId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        retryConnection(participantId);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      safeSetState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.id === participantId ? { ...p, stream: remoteStream } : p
        ),
      }));
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantId}:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        retryConnection(participantId);
      } else if (pc.connectionState === 'disconnected') {
        // Wait a bit before cleaning up - might reconnect
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            peerConnections.current.delete(participantId);
          }
        }, 5000);
      } else if (pc.connectionState === 'connected') {
        // Reset retry count on successful connection
        retryCountRef.current.delete(participantId);
      }
    };

    peerConnections.current.set(participantId, pc);
    return pc;
  }, [currentUserId, iceServers, safeSetState, retryConnection]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, fromId: string) => {
    console.log(`[handleOffer] Processing offer from ${fromId}`);
    
    let pc = peerConnections.current.get(fromId);
    if (!pc) {
      pc = createPeerConnection(fromId);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log(`[handleOffer] Sending answer to ${fromId}`);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          answer,
          from: currentUserId,
          to: fromId,
        },
      });
    } catch (err) {
      console.error(`[handleOffer] Error processing offer from ${fromId}:`, err);
      throw err;
    }
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
    console.log(`[connectToParticipant] Creating offer for ${participantId}`);
    
    try {
      const pc = createPeerConnection(participantId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log(`[connectToParticipant] Sending offer to ${participantId}`);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'offer',
        payload: {
          offer,
          from: currentUserId,
          to: participantId,
        },
      });
    } catch (err) {
      console.error(`[connectToParticipant] Error creating offer for ${participantId}:`, err);
    }
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
        if (!mountedRef.current) return;
        const presenceState = channel.presenceState();
        const participantIds = Object.keys(presenceState);
        
        console.log(`[Presence Sync] Total participants: ${participantIds.length}`, participantIds);
        
        const newParticipants = participantIds.map(id => {
          const presenceData = presenceState[id]?.[0] as { name?: string; photo?: string; isOwner?: boolean } | undefined;
          return {
            id,
            name: presenceData?.name || 'Unknown',
            photo: presenceData?.photo,
            isOwner: presenceData?.isOwner || false,
          };
        });
        
        safeSetState(prev => ({
          ...prev,
          viewerCount: participantIds.length,
          participants: newParticipants.map(newP => {
            // Preserve existing stream if we have one
            const existing = prev.participants.find(p => p.id === newP.id);
            return existing?.stream ? { ...newP, stream: existing.stream } : newP;
          }),
        }));
        
        // If we're the host and there are viewers without connections, connect to them
        if (isOwner && localStream.current) {
          participantIds.forEach(id => {
            if (id !== currentUserId && !peerConnections.current.has(id)) {
              console.log(`[Host Sync] Initiating connection to existing viewer: ${id}`);
              connectToParticipant(id);
            }
          });
        }
      })
      .on('presence', { event: 'join' }, async ({ key, newPresences }) => {
        if (!mountedRef.current) return;
        const presence = newPresences[0] as { name?: string; photo?: string; isOwner?: boolean } | undefined;
        const newParticipant: Participant = {
          id: key,
          name: presence?.name || 'Unknown',
          photo: presence?.photo,
          isOwner: presence?.isOwner || false,
        };
        
        // Add participant to state immediately
        safeSetState(prev => {
          const exists = prev.participants.some(p => p.id === key);
          if (exists) return prev;
          return {
            ...prev,
            participants: [...prev.participants, newParticipant],
          };
        });
        
        onParticipantJoin?.(newParticipant);
        
        // Only the owner (host) initiates connections to new viewers
        // This prevents duplicate offers when both sides try to connect
        if (key !== currentUserId && localStream.current && isOwner) {
          console.log(`[Host] Initiating connection to viewer: ${key}`);
          // Small delay to ensure presence is fully synced
          setTimeout(() => {
            if (mountedRef.current && localStream.current) {
              connectToParticipant(key);
            }
          }, 500);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (!mountedRef.current) return;
        peerConnections.current.get(key)?.close();
        peerConnections.current.delete(key);
        retryCountRef.current.delete(key);
        onParticipantLeave?.(key);
        
        safeSetState(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.id !== key),
        }));
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.to === currentUserId) {
          console.log(`[${isOwner ? 'Host' : 'Viewer'}] Received offer from: ${payload.from}`);
          try {
            await handleOffer(payload.offer, payload.from);
          } catch (err) {
            console.error('Error handling offer:', err);
          }
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
      if (status === 'SUBSCRIBED' && mountedRef.current) {
        await channel.track({
          name: userName,
          photo: userPhoto,
          isOwner,
        });
        safeSetState(prev => ({ ...prev, isConnected: true }));
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
    safeSetState,
  ]);

  const goLive = useCallback(async () => {
    safeSetState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const stream = await initLocalMedia();
      if (!stream || !mountedRef.current) {
        safeSetState(prev => ({ ...prev, isConnecting: false }));
        return false;
      }

      setupSignaling();

      // Update group status in database
      const { error } = await supabase
        .from('private_groups')
        .update({ 
          is_live: true, 
          stream_id: `sfu-${groupId}-${Date.now()}` 
        })
        .eq('id', groupId);

      if (error) {
        console.error('Error updating group status:', error);
      }

      safeSetState(prev => ({ 
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
      safeSetState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Failed to start stream' 
      }));
      return false;
    }
  }, [groupId, currentUserId, userName, userPhoto, initLocalMedia, setupSignaling, safeSetState]);

  const joinStream = useCallback(async () => {
    safeSetState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const stream = await initLocalMedia();
      if (!stream || !mountedRef.current) {
        safeSetState(prev => ({ ...prev, isConnecting: false }));
        return false;
      }

      setupSignaling();

      safeSetState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        isConnected: true,
      }));

      return true;
    } catch (error) {
      console.error('Error joining stream:', error);
      safeSetState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Failed to join stream' 
      }));
      return false;
    }
  }, [initLocalMedia, setupSignaling, safeSetState]);

  const cleanup = useCallback(() => {
    // Stop local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStream.current = null;
    }

    // Clear video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    // Close all peer connections
    peerConnections.current.forEach(pc => {
      try {
        pc.close();
      } catch (e) {
        console.warn('Error closing peer connection:', e);
      }
    });
    peerConnections.current.clear();
    retryCountRef.current.clear();

    // Unsubscribe from channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    safeSetState(() => ({
      isConnecting: false,
      isConnected: false,
      isLive: false,
      participants: [],
      viewerCount: 0,
      error: null,
    }));
  }, [safeSetState]);

  const endStream = useCallback(async () => {
    try {
      // Notify all participants
      channelRef.current?.send({
        type: 'broadcast',
        event: 'stream-ended',
        payload: {},
      });

      // Update database
      const { error } = await supabase
        .from('private_groups')
        .update({ is_live: false, stream_id: null })
        .eq('id', groupId);

      if (error) {
        console.error('Error updating group status:', error);
      }
    } catch (error) {
      console.error('Error ending stream:', error);
    } finally {
      cleanup();
    }
  }, [groupId, cleanup]);

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

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
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

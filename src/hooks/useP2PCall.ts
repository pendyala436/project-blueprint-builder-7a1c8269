import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * P2P WebRTC Video Call Hook
 * 
 * Uses peer-to-peer WebRTC with Supabase Realtime for signaling.
 * No external media server required - direct connection between peers.
 * 
 * Benefits:
 * - Scalable: Uses peer resources, not server resources
 * - Low latency: Direct connection between users
 * - No infrastructure: Only needs STUN servers for NAT traversal
 */

interface P2PCallState {
  isConnecting: boolean;
  isConnected: boolean;
  callStatus: 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';
  callDuration: number;
  totalCost: number;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

interface UseP2PCallProps {
  callId: string;
  currentUserId: string;
  remoteUserId: string;
  isInitiator: boolean;
  ratePerMinute?: number;
  onCallEnded?: () => void;
}

// Free STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

export const useP2PCall = ({
  callId,
  currentUserId,
  remoteUserId,
  isInitiator,
  ratePerMinute = 8, // ₹8/min for video calls (spec default)
  onCallEnded,
}: UseP2PCallProps) => {
  const { toast } = useToast();
  
  const [state, setState] = useState<P2PCallState>({
    isConnecting: false,
    isConnected: false,
    callStatus: 'idle',
    callDuration: 0,
    totalCost: 0,
    isVideoEnabled: true,
    isAudioEnabled: true,
  });
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const billingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const lastBilledMinuteRef = useRef<number>(0);
  const billingInProgressRef = useRef<boolean>(false);

  // Get session ID for billing
  const getSessionId = async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    
    const { data } = await supabase
      .from('video_call_sessions')
      .select('id')
      .eq('call_id', callId)
      .single();
    
    if (data) {
      sessionIdRef.current = data.id;
    }
    return data?.id || null;
  };

  // Process video call billing per minute
  const processBilling = async () => {
    // Only bill if call is active and initiator (man) pays
    if (state.callStatus !== 'active' || !isInitiator) return;
    
    // Prevent concurrent billing calls (race condition guard)
    if (billingInProgressRef.current) {
      console.log('[P2P] Billing already in progress - skipping');
      return;
    }
    billingInProgressRef.current = true;

    const sessionId = await getSessionId();
    if (!sessionId) {
      console.error('[P2P] No session ID for billing');
      billingInProgressRef.current = false;
      return;
    }

    try {
      const { data, error } = await supabase.rpc('process_video_billing', {
        p_session_id: sessionId,
        p_minutes: 1 // Bill 1 minute at a time
      });

      if (error) {
        console.error('[P2P] Billing error:', error);
        // If insufficient balance, end call
        if (error.message?.includes('insufficient') || error.message?.includes('Insufficient')) {
          toast({
            title: "Insufficient Balance",
            description: "Call ended due to low balance. Please recharge.",
            variant: "destructive",
          });
          endCall();
        }
        billingInProgressRef.current = false;
        return;
      }

      console.log('[P2P] Billing processed:', data);

      // Check if session was ended due to insufficient funds
      const result = data as Record<string, unknown> | null;
      if (result?.session_ended) {
        toast({
          title: "Call Ended",
          description: "Insufficient wallet balance. Please recharge to continue.",
          variant: "destructive",
        });
        endCall();
      }
      
      if (result?.duplicate_skipped) {
        console.log('[P2P] Duplicate billing skipped by server');
      }
    } catch (err) {
      console.error('[P2P] Billing failed:', err);
    } finally {
      billingInProgressRef.current = false;
    }
  };

  // Start call timer and billing when active
  useEffect(() => {
    if (state.callStatus === 'active') {
      // Duration counter (every second)
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

      // Billing processing (every 60 seconds) - only after first minute
      billingTimerRef.current = setInterval(() => {
        processBilling();
      }, 60000); // Bill every 60 seconds

      console.log('[P2P] Call timers started - billing starts after first minute');
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (billingTimerRef.current) {
        clearInterval(billingTimerRef.current);
      }
    };
  }, [state.callStatus, ratePerMinute]);

  // Initialize local media (camera + microphone)
  const initLocalMedia = useCallback(async () => {
    try {
      console.log('[P2P] Initializing local media...');
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

      console.log('[P2P] Local media initialized:', stream.getTracks().map(t => t.kind));
      return stream;
    } catch (error) {
      console.error('[P2P] Error getting local media:', error);
      toast({
        title: "Camera/Microphone Error",
        description: "Please allow access to camera and microphone",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // Process queued ICE candidates after remote description is set
  const processIceCandidateQueue = useCallback(async () => {
    if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) {
      return;
    }

    console.log(`[P2P] Processing ${iceCandidateQueueRef.current.length} queued ICE candidates`);
    
    for (const candidate of iceCandidateQueueRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[P2P] Added queued ICE candidate');
      } catch (error) {
        console.error('[P2P] Error adding queued ICE candidate:', error);
      }
    }
    
    iceCandidateQueueRef.current = [];
  }, []);

  // Update user status when call starts/ends
  // NOTE: women_availability is handled by DB trigger on video_call_sessions changes
  // This function only handles user_status recalculation
  const syncCallStatus = useCallback(async (callActive: boolean) => {
    try {
      const now = new Date().toISOString();
      
      // Always recalculate status from actual DB counts for BOTH users
      for (const uid of [currentUserId, remoteUserId]) {
        const [{ count: chatCount }, { count: callCount }] = await Promise.all([
          supabase.from('active_chat_sessions').select('*', { count: 'exact', head: true }).or(`man_user_id.eq.${uid},woman_user_id.eq.${uid}`).eq('status', 'active'),
          supabase.from('video_call_sessions').select('*', { count: 'exact', head: true }).or(`man_user_id.eq.${uid},woman_user_id.eq.${uid}`).eq('status', 'active'),
        ]);
        
        const totalVideoCalls = callCount || 0;
        const totalChats = chatCount || 0;
        
        // Status rules: any video call = busy, 3+ chats = busy, else online
        let statusText = 'online';
        if (totalVideoCalls > 0) {
          statusText = 'busy';
        } else if (totalChats >= 3) {
          statusText = 'busy';
        }
        
        await supabase.from('user_status').update({
          status_text: statusText,
          last_seen: now,
        }).eq('user_id', uid);

        // Also update women_availability for accurate call/chat availability flags
        await supabase
          .from('women_availability')
          .update({
            current_call_count: totalVideoCalls,
            is_available: totalChats < 3 && totalVideoCalls === 0,
            is_available_for_calls: totalVideoCalls === 0,
          })
          .eq('user_id', uid);
      }
    } catch (err) {
      console.error('[P2P] Error syncing call status:', err);
    }
  }, [currentUserId, remoteUserId]);

  // Create peer connection with all event handlers
  const createPeerConnection = useCallback(async (localStream: MediaStream) => {
    console.log('[P2P] Creating peer connection...');
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to the connection
    localStream.getTracks().forEach(track => {
      console.log('[P2P] Adding local track:', track.kind);
      pc.addTrack(track, localStream);
    });

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log('[P2P] Received remote track:', event.track.kind);
      if (event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setState(prev => ({ ...prev, callStatus: 'active', isConnected: true }));
        // Sync status to busy when call becomes active
        syncCallStatus(true);
      }
    };

    // Handle ICE candidates - send to remote peer via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && signalChannelRef.current) {
        console.log('[P2P] Sending ICE candidate');
        signalChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { 
            candidate: event.candidate.toJSON(), 
            senderId: currentUserId 
          }
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log('[P2P] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setState(prev => ({ ...prev, callStatus: 'active', isConnected: true }));
        toast({
          title: "Connected",
          description: "Video call connected successfully",
        });
      } else if (pc.connectionState === 'disconnected') {
        toast({
          title: "Connection Lost",
          description: "Attempting to reconnect...",
        });
      } else if (pc.connectionState === 'failed') {
        toast({
          title: "Connection Failed",
          description: "Could not establish video connection",
          variant: "destructive",
        });
        setState(prev => ({ ...prev, callStatus: 'ended' }));
        onCallEnded?.();
      }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('[P2P] ICE connection state:', pc.iceConnectionState);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [currentUserId, onCallEnded, toast, syncCallStatus]);

  // Setup signaling channel via Supabase Realtime
  const setupSignaling = useCallback(async () => {
    console.log('[P2P] Setting up signaling channel:', callId);
    
    const channel = supabase.channel(`p2p-signal-${callId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      // Handle incoming SDP offer (for receiver)
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        console.log('[P2P] Received offer from:', payload.senderId);
        if (peerConnectionRef.current && payload.senderId !== currentUserId) {
          try {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(payload.sdp)
            );
            console.log('[P2P] Set remote description (offer)');
            
            // Process any queued ICE candidates
            await processIceCandidateQueue();
            
            // Create and send answer
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            console.log('[P2P] Created and set local description (answer)');
            
            channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: { sdp: answer, senderId: currentUserId }
            });
          } catch (error) {
            console.error('[P2P] Error handling offer:', error);
          }
        }
      })
      // Handle incoming SDP answer (for initiator)
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        console.log('[P2P] Received answer from:', payload.senderId);
        if (peerConnectionRef.current && payload.senderId !== currentUserId) {
          try {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(payload.sdp)
            );
            console.log('[P2P] Set remote description (answer)');
            
            // Process any queued ICE candidates
            await processIceCandidateQueue();
          } catch (error) {
            console.error('[P2P] Error handling answer:', error);
          }
        }
      })
      // Handle incoming ICE candidates
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.senderId !== currentUserId) {
          console.log('[P2P] Received ICE candidate');
          
          if (peerConnectionRef.current?.remoteDescription) {
            try {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(payload.candidate)
              );
              console.log('[P2P] Added ICE candidate');
            } catch (error) {
              console.error('[P2P] Error adding ICE candidate:', error);
            }
          } else {
            // Queue candidate if remote description not set yet
            console.log('[P2P] Queuing ICE candidate (remote description not set)');
            iceCandidateQueueRef.current.push(payload.candidate);
          }
        }
      })
      // Handle call ended signal
      .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
        if (payload.senderId !== currentUserId) {
          console.log('[P2P] Remote peer ended call');
          toast({
            title: "Call Ended",
            description: "The other user ended the call",
          });
          cleanup();
          setState(prev => ({ ...prev, callStatus: 'ended' }));
          onCallEnded?.();
        }
      })
      .subscribe((status) => {
        console.log('[P2P] Signaling channel status:', status);
      });

    signalChannelRef.current = channel;
    return channel;
  }, [callId, currentUserId, processIceCandidateQueue, onCallEnded, toast]);

  // Start call (initiator creates offer)
  const startCall = useCallback(async () => {
    try {
      console.log('[P2P] Starting call as initiator...');
      setState(prev => ({ ...prev, isConnecting: true, callStatus: 'connecting' }));

      // Update database to mark call as connecting
      await supabase
        .from('video_call_sessions')
        .update({ status: 'connecting' })
        .eq('call_id', callId);

      // Initialize media and signaling
      const localStream = await initLocalMedia();
      await setupSignaling();
      const pc = await createPeerConnection(localStream);

      // Create and send offer
      console.log('[P2P] Creating offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log('[P2P] Set local description (offer)');

      // Send offer via signaling
      signalChannelRef.current?.send({
        type: 'broadcast',
        event: 'offer',
        payload: { sdp: offer, senderId: currentUserId }
      });

      setState(prev => ({ ...prev, isConnecting: false, callStatus: 'ringing' }));
    } catch (error) {
      console.error('[P2P] Error starting call:', error);
      setState(prev => ({ ...prev, isConnecting: false, callStatus: 'ended' }));
      toast({
        title: "Error",
        description: "Failed to start video call",
        variant: "destructive",
      });
    }
  }, [callId, currentUserId, initLocalMedia, setupSignaling, createPeerConnection, toast]);

  // Join call (receiver waits for offer)
  const joinCall = useCallback(async () => {
    try {
      console.log('[P2P] Joining call as receiver...');
      setState(prev => ({ ...prev, isConnecting: true, callStatus: 'connecting' }));

      // IMPORTANT: do not downgrade DB status back to "connecting" on receiver side.
      // The women-side accept flow already marks session as "active" before this hook mounts.
      // Overwriting it here causes active -> connecting flicker and can collapse call UI state.


      // Initialize media and signaling
      const localStream = await initLocalMedia();
      await setupSignaling();
      await createPeerConnection(localStream);

      setState(prev => ({ ...prev, isConnecting: false }));
      console.log('[P2P] Ready to receive offer');
    } catch (error) {
      console.error('[P2P] Error joining call:', error);
      setState(prev => ({ ...prev, isConnecting: false, callStatus: 'ended' }));
      toast({
        title: "Error",
        description: "Failed to join video call",
        variant: "destructive",
      });
    }
  }, [callId, initLocalMedia, setupSignaling, createPeerConnection, toast]);

  // End call and cleanup
  const endCall = useCallback(async () => {
    console.log('[P2P] Ending call...');
    
    // Notify remote peer
    signalChannelRef.current?.send({
      type: 'broadcast',
      event: 'call-ended',
      payload: { senderId: currentUserId }
    });

    // Calculate duration in minutes
    const durationMinutes = state.callDuration / 60;

    // Update database - only if not already ended (prevent double-update)
    const { data: currentSession } = await supabase
      .from('video_call_sessions')
      .select('status')
      .eq('call_id', callId)
      .single();

    if (currentSession && currentSession.status !== 'ended') {
      await supabase
        .from('video_call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          end_reason: 'user_ended',
          total_minutes: durationMinutes,
          // total_earned stores the man's charge amount (rate_per_minute * minutes)
          total_earned: Math.ceil(durationMinutes) * ratePerMinute,
        })
        .eq('call_id', callId);
    }

    // Sync status for both users
    await syncCallStatus(false);

    cleanup();
    setState(prev => ({ ...prev, callStatus: 'ended' }));
    onCallEnded?.();
  }, [callId, currentUserId, state.callDuration, ratePerMinute, onCallEnded, syncCallStatus]);

  // Toggle video on/off
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
        console.log('[P2P] Video:', videoTrack.enabled ? 'enabled' : 'disabled');
      }
    }
  }, []);

  // Toggle audio on/off
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isAudioEnabled: audioTrack.enabled }));
        console.log('[P2P] Audio:', audioTrack.enabled ? 'enabled' : 'disabled');
      }
    }
  }, []);

  // Cleanup all resources
  const cleanup = useCallback(() => {
    console.log('[P2P] Cleaning up...');
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (billingTimerRef.current) {
      clearInterval(billingTimerRef.current);
      billingTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[P2P] Stopped track:', track.kind);
      });
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

    iceCandidateQueueRef.current = [];
  }, []);

  // Auto-start based on role (initiator vs receiver)
  useEffect(() => {
    if (isInitiator) {
      startCall();
    } else {
      joinCall();
    }

    return cleanup;
  }, []);

  // Subscribe to call status updates from database
  useEffect(() => {
    const channel = supabase
      .channel(`p2p-call-status-${callId}`)
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
          console.log('[P2P] Call status update from DB:', status);
          
          if (['declined', 'missed', 'ended'].includes(status)) {
            // Only react if WE didn't trigger it (avoid double-cleanup)
            if (state.callStatus !== 'ended') {
              toast({
                title: "Call Ended",
                description: status === 'declined' ? 'Call was declined' : status === 'missed' ? 'Call was missed' : 'The other user ended the call',
              });
              cleanup();
              setState(prev => ({ ...prev, callStatus: 'ended' }));
              onCallEnded?.();
            }
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

export default useP2PCall;

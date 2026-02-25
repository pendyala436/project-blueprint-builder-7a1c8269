/**
 * usePrivateGroupCall Hook
 * 
 * Enhanced group call hook for private groups with:
 * - Host-only video (participants are audio-only)
 * - 50 participant limit
 * - 30-minute time limit
 * - Per-minute billing with refund on early end
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatPricing } from './useChatPricing';
import { toast } from 'sonner';

export const MAX_PARTICIPANTS = 50;
export const MAX_DURATION_MINUTES = 30;
export const BILLING_INTERVAL_SECONDS = 60; // Bill every minute

interface Participant {
  id: string;
  name: string;
  photo?: string;
  audioStream?: MediaStream;
  videoStream?: MediaStream; // Remote video stream from host
  isOwner: boolean;
  joinedAt: number;
  amountPaid: number;
  balanceRemaining: number;
}

interface PeerConnectionEntry {
  pc: RTCPeerConnection;
  participantId: string;
}

interface GroupSession {
  sessionId: string;
  groupId: string;
  hostId: string;
  startTime: number;
  participants: Map<string, Participant>;
  totalEarnings: number;
}

interface UsePrivateGroupCallProps {
  groupId: string;
  currentUserId: string;
  userName: string;
  userPhoto?: string | null;
  isOwner: boolean;
  giftAmountRequired: number;
  onParticipantJoin?: (participant: Participant) => void;
  onParticipantLeave?: (participantId: string, reason: string) => void;
  onSessionEnd?: (refunded: boolean) => void;
}

interface PrivateGroupCallState {
  isConnecting: boolean;
  isConnected: boolean;
  isLive: boolean;
  participants: Participant[];
  viewerCount: number;
  error: string | null;
  remainingTime: number; // seconds
  totalEarnings: number;
  isRefunding: boolean;
  hostStream: MediaStream | null; // Host's remote stream for participants
}

export function usePrivateGroupCall({
  groupId,
  currentUserId,
  userName,
  userPhoto,
  isOwner,
  giftAmountRequired,
  onParticipantJoin,
  onParticipantLeave,
  onSessionEnd,
}: UsePrivateGroupCallProps) {
  const [state, setState] = useState<PrivateGroupCallState>({
    isConnecting: false,
    isConnected: false,
    isLive: false,
    participants: [],
    viewerCount: 0,
    error: null,
    remainingTime: MAX_DURATION_MINUTES * 60,
    totalEarnings: 0,
    isRefunding: false,
    hostStream: null,
  });

  const { pricing } = useChatPricing();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionRef = useRef<GroupSession | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const billingRef = useRef<NodeJS.Timeout | null>(null);
  const billingInProgressRef = useRef<boolean>(false);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  // ICE servers for WebRTC - single STUN server to reduce overhead
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  // Create a peer connection to a specific participant
  // Architecture: Host sends video+audio to each participant via 1-to-many.
  // Participants send audio-only back to host. No participant-to-participant connections.
  const createPeerConnection = useCallback((participantId: string) => {
    const pc = new RTCPeerConnection({
      iceServers,
      // Reduce ICE gathering overhead
      iceCandidatePoolSize: 1,
    });

    // Only add local tracks - host sends video+audio, participants send audio only
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

    // Handle remote stream (participants receive host video here)
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      console.log(`[PrivateGroupCall] Received remote track from ${participantId}`, remoteStream.getTracks().map(t => t.kind));
      
      // If we're a participant and this stream is from the host, set it as hostStream
      if (!isOwner) {
        const videoTracks = remoteStream.getVideoTracks();
        const audioTracks = remoteStream.getAudioTracks();
        console.log('[PrivateGroupCall] Setting hostStream for participant', {
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          videoEnabled: videoTracks.map(t => t.enabled),
          videoMuted: videoTracks.map(t => t.muted),
          videoReadyState: videoTracks.map(t => t.readyState),
        });
        setState(prev => ({ ...prev, hostStream: remoteStream }));
        
        // Also try to attach to video element immediately if available
        if (remoteVideoRef.current) {
          console.log('[PrivateGroupCall] Attaching hostStream to video element immediately');
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(e => console.warn('[PrivateGroupCall] Auto-play failed:', e));
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[PrivateGroupCall] Connection state with ${participantId}:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.warn(`[PrivateGroupCall] Connection failed with ${participantId}, attempting reconnect...`);
        // Remove failed connection
        peerConnections.current.delete(participantId);
      }
    };

    peerConnections.current.set(participantId, pc);
    return pc;
  }, [currentUserId, isOwner]);

  // Handle incoming WebRTC offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, fromId: string) => {
    let pc = peerConnections.current.get(fromId);
    if (!pc) {
      pc = createPeerConnection(fromId);
    }

    try {
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
    } catch (error) {
      console.error('[PrivateGroupCall] Error handling offer:', error);
    }
  }, [createPeerConnection, currentUserId]);

  // Handle incoming WebRTC answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, fromId: string) => {
    const pc = peerConnections.current.get(fromId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('[PrivateGroupCall] Error handling answer:', error);
      }
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, fromId: string) => {
    const pc = peerConnections.current.get(fromId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[PrivateGroupCall] Error handling ICE candidate:', error);
      }
    }
  }, []);

  // Initiate WebRTC connection to a participant (host sends offer)
  const connectToParticipant = useCallback(async (participantId: string) => {
    try {
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
      console.log(`[PrivateGroupCall] Sent offer to ${participantId}`);
    } catch (error) {
      console.error('[PrivateGroupCall] Error connecting to participant:', error);
    }
  }, [createPeerConnection, currentUserId]);

  // Initialize host media (video + audio)
  const initHostMedia = useCallback(async () => {
    try {
      // Use lower resolution to reduce bandwidth - 50 participants means conservative settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 960 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 22050, // Lower sample rate for group calls
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

  // Initialize participant media (audio only - no video, mic disabled by default)
  const initParticipantMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false, // Participants don't share video
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      // Mic is disabled by default for participants
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      
      localStream.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing audio:', error);
      setState(prev => ({ ...prev, error: 'Could not access microphone' }));
      return null;
    }
  }, []);

  // Check if user can join (balance check) - uses chat rates (₹4/min men, ₹2/min women)
  const checkCanJoin = useCallback(async (): Promise<{ canJoin: boolean; balance: number }> => {
    if (isOwner) return { canJoin: true, balance: 0 };

    const costPerMinute = pricing.ratePerMinute; // Use chat rate (₹4/min)
    const minBalance = costPerMinute * 5; // Need at least 5 minutes worth

    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', currentUserId)
      .single();

    const balance = wallet?.balance || 0;
    
    if (balance < minBalance) {
      return { canJoin: false, balance };
    }

    return { canJoin: true, balance };
  }, [currentUserId, isOwner, pricing.ratePerMinute]);

  // Start billing timer (runs every minute)
  const startBillingTimer = useCallback(() => {
    if (billingRef.current) clearInterval(billingRef.current);

    billingRef.current = setInterval(async () => {
      if (!sessionRef.current || !isOwner) return;
      
      // Prevent concurrent billing calls
      if (billingInProgressRef.current) {
        console.log('[GROUP] Billing already in progress - skipping');
        return;
      }
      billingInProgressRef.current = true;

      try {
      const session = sessionRef.current;
      let totalDeducted = 0;
      const participantsToRemove: string[] = [];

      // Process billing for each participant
      for (const [participantId, participant] of session.participants) {
        if (participant.isOwner) continue;

        const costPerMinute = pricing.ratePerMinute; // ₹4/min for men
        
        // Check participant balance
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', participantId)
          .single();

        const currentBalance = wallet?.balance || 0;

        if (currentBalance < costPerMinute) {
          // No balance - remove participant without refund
          participantsToRemove.push(participantId);
          onParticipantLeave?.(participantId, 'insufficient_balance');
          continue;
        }

        // Deduct from participant wallet
        const { error: deductError } = await supabase.rpc('process_wallet_transaction', {
          p_user_id: participantId,
          p_amount: costPerMinute,
          p_type: 'debit',
          p_description: `Private group call - ${session.groupId}`,
          p_reference_id: session.sessionId
        });

        if (deductError) {
          console.error('Billing error:', deductError);
          continue;
        }

        // Update participant tracking
        participant.amountPaid += costPerMinute;
        participant.balanceRemaining = currentBalance - costPerMinute;
        totalDeducted += costPerMinute;
      }

      // Credit earnings to host - women earn ₹2/min per man (chat earning rate)
      if (totalDeducted > 0) {
        const hostEarning = totalDeducted * (pricing.womenEarningRate / pricing.ratePerMinute);
        
        await supabase.rpc('process_wallet_transaction', {
          p_user_id: session.hostId,
          p_amount: hostEarning,
          p_type: 'credit',
          p_description: `Private group call earnings - ${participantsToRemove.length} participants`,
          p_reference_id: session.sessionId
        });

        session.totalEarnings += hostEarning;
        setState(prev => ({ ...prev, totalEarnings: session.totalEarnings }));
      }

      // Remove participants with no balance
      for (const id of participantsToRemove) {
        session.participants.delete(id);
        
        // Notify participant to leave
        channelRef.current?.send({
          type: 'broadcast',
          event: 'participant-removed',
          payload: { participantId: id, reason: 'insufficient_balance' },
        });
      }

      // Update participant count in state
      setState(prev => ({
        ...prev,
        participants: Array.from(session.participants.values()),
        viewerCount: session.participants.size,
      }));
      } catch (err) {
        console.error('[GROUP] Billing error:', err);
      } finally {
        billingInProgressRef.current = false;
      }
    }, BILLING_INTERVAL_SECONDS * 1000);
  }, [isOwner, pricing, onParticipantLeave]);

  // Start countdown timer
  const startCountdownTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const startTime = Date.now();
    const endTime = startTime + (MAX_DURATION_MINUTES * 60 * 1000);

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setState(prev => ({ ...prev, remainingTime: remaining }));

      if (remaining <= 0) {
        // Time's up - end session normally
        endStream(false);
      }
    }, 1000);
  }, []);

  // Process refunds when host ends early
  const processRefunds = useCallback(async () => {
    if (!sessionRef.current) return;

    setState(prev => ({ ...prev, isRefunding: true }));
    const session = sessionRef.current;
    const elapsedMinutes = Math.floor((Date.now() - session.startTime) / 60000);
    const remainingMinutes = MAX_DURATION_MINUTES - elapsedMinutes;

    if (remainingMinutes <= 0) {
      setState(prev => ({ ...prev, isRefunding: false }));
      return;
    }

    let totalRefunded = 0;
    let totalDeductedFromHost = 0;

    // Refund each participant proportionally
    for (const [participantId, participant] of session.participants) {
      if (participant.isOwner) continue;

      const minutesPaid = Math.floor(participant.amountPaid / pricing.ratePerMinute);
      const unusedMinutes = Math.max(0, minutesPaid - elapsedMinutes);
      
      if (unusedMinutes > 0) {
        const refundAmount = unusedMinutes * pricing.ratePerMinute;

        // Refund to participant
        await supabase.rpc('process_wallet_transaction', {
          p_user_id: participantId,
          p_amount: refundAmount,
          p_type: 'credit',
          p_description: `Refund - Host ended private group call early`,
          p_reference_id: session.sessionId
        });

        totalRefunded += refundAmount;
        
        // Deduct proportional amount from host earnings
        const hostDeduction = refundAmount * (pricing.womenEarningRate / pricing.ratePerMinute);
        totalDeductedFromHost += hostDeduction;
      }
    }

    // Deduct from host wallet
    if (totalDeductedFromHost > 0) {
      await supabase.rpc('process_wallet_transaction', {
        p_user_id: session.hostId,
        p_amount: totalDeductedFromHost,
        p_type: 'debit',
        p_description: `Deduction for ending group call early - refunds issued`,
        p_reference_id: session.sessionId
      });
    }

    console.log(`Refunds processed: ₹${totalRefunded} to participants, ₹${totalDeductedFromHost} from host`);
    setState(prev => ({ ...prev, isRefunding: false }));
  }, [pricing]);

  // Setup signaling channel
  const setupSignaling = useCallback(() => {
    const channel = supabase.channel(`private-group-${groupId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUserId },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const participantIds = Object.keys(presenceState);
        
        setState(prev => ({ ...prev, viewerCount: participantIds.length }));
      })
      .on('presence', { event: 'join' }, async ({ key, newPresences }) => {
        if (key === currentUserId) return;

        // Check participant limit
        if (sessionRef.current && sessionRef.current.participants.size >= MAX_PARTICIPANTS) {
          channel.send({
            type: 'broadcast',
            event: 'join-rejected',
            payload: { participantId: key, reason: 'group_full' },
          });
          return;
        }

        const presence = newPresences[0] as { name?: string; photo?: string; isOwner?: boolean; balance?: number } | undefined;
        const newParticipant: Participant = {
          id: key,
          name: presence?.name || 'Unknown',
          photo: presence?.photo,
          isOwner: presence?.isOwner || false,
          joinedAt: Date.now(),
          amountPaid: 0,
          balanceRemaining: presence?.balance || 0,
        };

        if (sessionRef.current) {
          sessionRef.current.participants.set(key, newParticipant);
        }

        onParticipantJoin?.(newParticipant);
        
        setState(prev => ({
          ...prev,
          participants: Array.from(sessionRef.current?.participants.values() || []),
          viewerCount: sessionRef.current?.participants.size || 0,
        }));

        // DON'T send offer here - wait for participant's 'participant-ready' signal
        // This avoids the race condition where the offer arrives before the participant's listeners are ready
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (sessionRef.current) {
          sessionRef.current.participants.delete(key);
        }
        
        // Close peer connection
        const pc = peerConnections.current.get(key);
        if (pc) {
          pc.close();
          peerConnections.current.delete(key);
        }
        
        onParticipantLeave?.(key, 'left');
        
        setState(prev => ({
          ...prev,
          participants: Array.from(sessionRef.current?.participants.values() || []),
          viewerCount: sessionRef.current?.participants.size || 0,
        }));
      })
      .on('broadcast', { event: 'stream-ended' }, ({ payload }) => {
        if (!isOwner) {
          toast.info(payload.refunded ? 'Host ended the call. Unused balance refunded.' : 'The call has ended.');
          cleanup();
          onSessionEnd?.(payload.refunded);
        }
      })
      .on('broadcast', { event: 'participant-removed' }, ({ payload }) => {
        if (payload.participantId === currentUserId) {
          toast.error('You were removed: Insufficient balance');
          cleanup();
        }
      })
      .on('broadcast', { event: 'join-rejected' }, ({ payload }) => {
        if (payload.participantId === currentUserId) {
          if (payload.reason === 'group_full') {
            toast.error('Group is full (max 50 participants)');
          }
          cleanup();
        }
      })
      // Participant signals it's ready to receive WebRTC offer
      .on('broadcast', { event: 'participant-ready' }, async ({ payload }) => {
        if (isOwner && localStream.current && payload.participantId) {
          console.log(`[PrivateGroupCall] Participant ${payload.participantId} is ready, sending WebRTC offer`);
          // Small delay to ensure participant's listeners are fully active
          setTimeout(() => {
            connectToParticipant(payload.participantId);
          }, 300);
        }
      })
      // WebRTC signaling events
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.to === currentUserId) {
          console.log(`[PrivateGroupCall] Received offer from ${payload.from}`);
          await handleOffer(payload.offer, payload.from);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.to === currentUserId) {
          console.log(`[PrivateGroupCall] Received answer from ${payload.from}`);
          await handleAnswer(payload.answer, payload.from);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.to === currentUserId) {
          await handleIceCandidate(payload.candidate, payload.from);
        }
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const balanceCheck = await checkCanJoin();
        
        await channel.track({
          name: userName,
          photo: userPhoto,
          isOwner,
          balance: balanceCheck.balance,
        });
        
        setState(prev => ({ ...prev, isConnected: true }));

        // If participant, signal ready for WebRTC after a brief delay
        if (!isOwner) {
          setTimeout(() => {
            console.log('[PrivateGroupCall] Participant sending ready signal');
            channel.send({
              type: 'broadcast',
              event: 'participant-ready',
              payload: { participantId: currentUserId },
            });
          }, 500);
        }
      }
    });

    channelRef.current = channel;
    return channel;
  }, [groupId, currentUserId, userName, userPhoto, isOwner, onParticipantJoin, onParticipantLeave, onSessionEnd, checkCanJoin, connectToParticipant, handleOffer, handleAnswer, handleIceCandidate]);

  // Go live (host only)
  const goLive = useCallback(async () => {
    if (!isOwner) return false;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const stream = await initHostMedia();
      if (!stream) {
        setState(prev => ({ ...prev, isConnecting: false }));
        return false;
      }

      // Create session
      const sessionId = `pgs-${groupId}-${Date.now()}`;
      sessionRef.current = {
        sessionId,
        groupId,
        hostId: currentUserId,
        startTime: Date.now(),
        participants: new Map([[currentUserId, {
          id: currentUserId,
          name: userName,
          photo: userPhoto || undefined,
          isOwner: true,
          joinedAt: Date.now(),
          amountPaid: 0,
          balanceRemaining: 0,
        }]]),
        totalEarnings: 0,
      };

      setupSignaling();
      startCountdownTimer();
      startBillingTimer();

      // Update group status in database
      await supabase
        .from('private_groups')
        .update({ 
          is_live: true, 
          stream_id: sessionId,
        })
        .eq('id', groupId);

      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        isLive: true,
        participants: Array.from(sessionRef.current!.participants.values()),
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
  }, [groupId, currentUserId, userName, userPhoto, isOwner, initHostMedia, setupSignaling, startCountdownTimer, startBillingTimer]);

  // Join stream (participant only)
  const joinStream = useCallback(async () => {
    if (isOwner) return false;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Check balance first
      const { canJoin, balance } = await checkCanJoin();
      if (!canJoin) {
        setState(prev => ({ 
          ...prev, 
          isConnecting: false, 
          error: `Insufficient balance. You need at least ₹${pricing.ratePerMinute * 5}` 
        }));
        return false;
      }

      const stream = await initParticipantMedia();
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
  }, [isOwner, checkCanJoin, initParticipantMedia, setupSignaling, pricing.ratePerMinute]);

  // End stream (host only)
  const endStream = useCallback(async (processRefundsFlag = true) => {
    if (processRefundsFlag && sessionRef.current) {
      const elapsedMinutes = Math.floor((Date.now() - sessionRef.current.startTime) / 60000);
      if (elapsedMinutes < MAX_DURATION_MINUTES) {
        // Host ending early - process refunds
        await processRefunds();
      }
    }

    // Notify all participants
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stream-ended',
      payload: { refunded: processRefundsFlag },
    });

    // Update database
    await supabase
      .from('private_groups')
      .update({ is_live: false, stream_id: null })
      .eq('id', groupId);

    cleanup();
    onSessionEnd?.(processRefundsFlag);
  }, [groupId, processRefunds, onSessionEnd]);

  // Toggle video (host only)
  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStream.current && isOwner) {
      localStream.current.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, [isOwner]);

  // Toggle audio
  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    // Stop timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (billingRef.current) clearInterval(billingRef.current);

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

    sessionRef.current = null;

    setState({
      isConnecting: false,
      isConnected: false,
      isLive: false,
      participants: [],
      viewerCount: 0,
      error: null,
      remainingTime: MAX_DURATION_MINUTES * 60,
      totalEarnings: 0,
      isRefunding: false,
      hostStream: null,
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
    remoteVideoRef,
    goLive,
    joinStream,
    endStream,
    toggleVideo,
    toggleAudio,
    cleanup,
    maxParticipants: MAX_PARTICIPANTS,
    maxDuration: MAX_DURATION_MINUTES,
  };
}

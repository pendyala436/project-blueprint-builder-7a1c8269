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
  isOwner: boolean;
  joinedAt: number;
  amountPaid: number;
  balanceRemaining: number;
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
  });

  const { pricing } = useChatPricing();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionRef = useRef<GroupSession | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const billingRef = useRef<NodeJS.Timeout | null>(null);

  // ICE servers for WebRTC
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Initialize host media (video + audio)
  const initHostMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
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

  // Initialize participant media (audio only - no video)
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
      localStream.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing audio:', error);
      setState(prev => ({ ...prev, error: 'Could not access microphone' }));
      return null;
    }
  }, []);

  // Check if user can join (balance check)
  const checkCanJoin = useCallback(async (): Promise<{ canJoin: boolean; balance: number }> => {
    if (isOwner) return { canJoin: true, balance: 0 };

    const costPerMinute = pricing.videoRatePerMinute;
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
  }, [currentUserId, isOwner, pricing.videoRatePerMinute]);

  // Start billing timer (runs every minute)
  const startBillingTimer = useCallback(() => {
    if (billingRef.current) clearInterval(billingRef.current);

    billingRef.current = setInterval(async () => {
      if (!sessionRef.current || !isOwner) return;

      const session = sessionRef.current;
      let totalDeducted = 0;
      const participantsToRemove: string[] = [];

      // Process billing for each participant
      for (const [participantId, participant] of session.participants) {
        if (participant.isOwner) continue;

        const costPerMinute = pricing.videoRatePerMinute;
        
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

      // Credit earnings to host (50% split)
      if (totalDeducted > 0) {
        const hostEarning = totalDeducted * (pricing.videoWomenEarningRate / pricing.videoRatePerMinute);
        
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

      const minutesPaid = Math.floor(participant.amountPaid / pricing.videoRatePerMinute);
      const unusedMinutes = Math.max(0, minutesPaid - elapsedMinutes);
      
      if (unusedMinutes > 0) {
        const refundAmount = unusedMinutes * pricing.videoRatePerMinute;

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
        const hostDeduction = refundAmount * (pricing.videoWomenEarningRate / pricing.videoRatePerMinute);
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
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (sessionRef.current) {
          sessionRef.current.participants.delete(key);
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
      .on('broadcast', { event: 'host-audio' }, ({ payload }) => {
        // Handle host audio stream for participants
      })
      .on('broadcast', { event: 'participant-audio' }, ({ payload }) => {
        // Handle participant audio for host
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
      }
    });

    channelRef.current = channel;
    return channel;
  }, [groupId, currentUserId, userName, userPhoto, isOwner, onParticipantJoin, onParticipantLeave, onSessionEnd, checkCanJoin]);

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
          error: `Insufficient balance. You need at least ₹${pricing.videoRatePerMinute * 5}` 
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
  }, [isOwner, checkCanJoin, initParticipantMedia, setupSignaling, pricing.videoRatePerMinute]);

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
    maxParticipants: MAX_PARTICIPANTS,
    maxDuration: MAX_DURATION_MINUTES,
  };
}

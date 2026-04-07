import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useChatPricing } from '@/hooks/useChatPricing';

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'active' | 'ended';

export interface ActiveCall {
  callId: string;
  callType: CallType;
  remoteUserId: string;
  remoteName: string;
  remotePhoto: string | null;
  isInitiator: boolean;
  startedAt: Date | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const useWhatsAppCall = (
  currentUserId: string | null,
  currentUserGender: 'male' | 'female',
  walletBalance: number
) => {
  const { toast } = useToast();
  const { pricing } = useChatPricing();
  const [status, setStatus] = useState<CallStatus>('idle');
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const statusRef = useRef<CallStatus>('idle');
  const endingRef = useRef(false);

  const setStatusSync = useCallback((s: CallStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
    startTimeRef.current = null;
    endingRef.current = false;
    setIsMuted(false);
    setIsCameraOff(false);
    setStatusSync('idle');
    setActiveCall(null);
  }, [setStatusSync]);

  const acquireMedia = async (callType: CallType): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: callType === 'video'
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        : false,
    });
  };

  const createPC = useCallback((callId: string, callType: CallType): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'ice_candidate',
        payload: { candidate: candidate.toJSON() },
      });
    };

    pc.ontrack = ({ streams }) => {
      remoteStreamRef.current = streams[0] || null;
      setActiveCall(prev => prev ? { ...prev, remoteStream: streams[0] || null } : prev);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        startTimeRef.current = new Date();
        setStatusSync('active');
        setActiveCall(prev => prev ? { ...prev, startedAt: startTimeRef.current } : prev);
        // Update DB to active
        supabase.from('video_call_sessions')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('call_id', callId)
          .then(() => {});
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        if (!endingRef.current) {
          doEndCall(callId, callType);
        }
      }
    };

    return pc;
  }, [setStatusSync]);

  const doEndCall = useCallback(async (callId: string, callType: CallType) => {
    if (endingRef.current) return;
    endingRef.current = true;
    setStatusSync('ended');

    channelRef.current?.send({ type: 'broadcast', event: 'call_ended', payload: {} });

    await supabase.from('video_call_sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('call_id', callId);

    // Trigger billing (idempotent)
    try {
      await supabase.rpc('process_call_billing', {
        p_call_id: callId,
        p_call_type: callType,
      });
    } catch (e) {
      console.error('[WhatsAppCall] Billing error:', e);
    }

    cleanup();
  }, [cleanup, setStatusSync]);

  const initiateCall = useCallback(async (
    targetUserId: string,
    targetName: string,
    targetPhoto: string | null,
    callType: CallType
  ) => {
    if (!currentUserId || currentUserGender !== 'male') return;
    if (statusRef.current !== 'idle') {
      toast({ title: 'Already in a call', variant: 'destructive' });
      return;
    }

    // Check super user
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || '';
    const isSuperUser = /^(female|male|admin)([1-9]|1[0-5])@meow-meow\.com$/i.test(userEmail);

    if (!isSuperUser) {
      const rate = callType === 'audio'
        ? (pricing.audioRatePerMinute || 6)
        : (pricing.videoRatePerMinute || 8);
      const minBal = rate * 2;
      if (walletBalance < minBal) {
        toast({
          title: 'Insufficient balance',
          description: `Need ₹${minBal} minimum for ${callType} call. Please recharge.`,
          variant: 'destructive'
        });
        return;
      }
    }

    // Acquire media in user gesture context
    let stream: MediaStream;
    try {
      stream = await acquireMedia(callType);
    } catch {
      toast({
        title: 'Permission denied',
        description: `Allow microphone${callType === 'video' ? ' and camera' : ''} access.`,
        variant: 'destructive'
      });
      return;
    }
    localStreamRef.current = stream;

    const callId = `call_${currentUserId}_${targetUserId}_${Date.now()}`;
    const rate = callType === 'audio'
      ? (pricing.audioRatePerMinute || 6)
      : (pricing.videoRatePerMinute || 8);

    setStatusSync('calling');
    setActiveCall({
      callId, callType,
      remoteUserId: targetUserId, remoteName: targetName, remotePhoto: targetPhoto,
      isInitiator: true, startedAt: null,
      localStream: stream, remoteStream: null,
    });

    // Insert session
    await supabase.from('video_call_sessions').insert({
      call_id: callId,
      man_user_id: currentUserId,
      woman_user_id: targetUserId,
      status: 'ringing',
      call_type: callType,
      rate_per_minute: rate,
    } as any);

    // Signalling channel
    const ch = supabase.channel(`call:${callId}`);
    channelRef.current = ch;

    ch.on('broadcast', { event: 'call_answered' }, async () => {
      setStatusSync('connecting');
      const pc = createPC(callId, callType);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ch.send({ type: 'broadcast', event: 'offer', payload: { sdp: pc.localDescription } });
    });

    ch.on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } catch (e) {
        console.error('[WhatsAppCall] setRemoteDescription error:', e);
      }
    });

    ch.on('broadcast', { event: 'ice_candidate' }, async ({ payload }: any) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {}
    });

    ch.on('broadcast', { event: 'call_declined' }, () => {
      toast({ title: 'Call declined', description: `${targetName} declined the call.` });
      supabase.from('video_call_sessions')
        .update({ status: 'declined', ended_at: new Date().toISOString() })
        .eq('call_id', callId).then(() => {});
      cleanup();
    });

    ch.on('broadcast', { event: 'call_ended' }, () => {
      if (!endingRef.current) {
        endingRef.current = true;
        cleanup();
      }
    });

    await ch.subscribe();

    // Auto-cancel after 60s
    ringTimerRef.current = setTimeout(async () => {
      if (statusRef.current === 'calling') {
        ch.send({ type: 'broadcast', event: 'call_cancelled', payload: {} });
        await supabase.from('video_call_sessions')
          .update({ status: 'missed', ended_at: new Date().toISOString() })
          .eq('call_id', callId);
        toast({ title: 'No answer', description: `${targetName} did not answer.` });
        cleanup();
      }
    }, 60_000);
  }, [currentUserId, currentUserGender, walletBalance, pricing, toast, cleanup, createPC, setStatusSync]);

  const acceptCall = useCallback(async (
    callId: string,
    callType: CallType,
    callerUserId: string,
    callerName: string,
    callerPhoto: string | null
  ) => {
    let stream: MediaStream;
    try {
      stream = await acquireMedia(callType);
    } catch {
      toast({
        title: 'Permission denied',
        description: `Allow microphone${callType === 'video' ? ' and camera' : ''} to accept.`,
        variant: 'destructive'
      });
      // Decline if can't get media
      await supabase.from('video_call_sessions')
        .update({ status: 'declined', ended_at: new Date().toISOString() })
        .eq('call_id', callId);
      return;
    }
    localStreamRef.current = stream;

    setStatusSync('connecting');
    setActiveCall({
      callId, callType,
      remoteUserId: callerUserId, remoteName: callerName, remotePhoto: callerPhoto,
      isInitiator: false, startedAt: null,
      localStream: stream, remoteStream: null,
    });

    await supabase.from('video_call_sessions')
      .update({ status: 'connecting' }).eq('call_id', callId);

    const ch = supabase.channel(`call:${callId}`);
    channelRef.current = ch;

    ch.on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
      const pc = createPC(callId, callType);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ch.send({ type: 'broadcast', event: 'answer', payload: { sdp: pc.localDescription } });
    });

    ch.on('broadcast', { event: 'ice_candidate' }, async ({ payload }: any) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {}
    });

    ch.on('broadcast', { event: 'call_ended' }, () => {
      if (!endingRef.current) {
        doEndCall(callId, callType);
      }
    });

    ch.on('broadcast', { event: 'call_cancelled' }, () => {
      cleanup();
    });

    await ch.subscribe();

    // Notify initiator
    ch.send({ type: 'broadcast', event: 'call_answered', payload: {} });
  }, [toast, cleanup, createPC, doEndCall, setStatusSync]);

  const declineCall = useCallback(async (callId: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'call_declined', payload: {} });
    await supabase.from('video_call_sessions')
      .update({ status: 'declined', ended_at: new Date().toISOString() })
      .eq('call_id', callId);
    cleanup();
  }, [cleanup]);

  const endCall = useCallback(() => {
    if (activeCall) {
      doEndCall(activeCall.callId, activeCall.callType);
    }
  }, [activeCall, doEndCall]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsCameraOff(!track.enabled);
    }
  }, []);

  return {
    status, activeCall, isMuted, isCameraOff,
    initiateCall, acceptCall, declineCall, endCall,
    toggleMute, toggleCamera,
  };
};

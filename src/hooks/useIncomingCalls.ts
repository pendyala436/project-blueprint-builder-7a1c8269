import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IncomingCall {
  callId: string;
  callerUserId: string;
  callerName: string;
  callerPhoto: string | null;
}

// Audio context for ringtone buzz
let ringAudioContext: AudioContext | null = null;
let ringIntervalId: NodeJS.Timeout | null = null;

const playRingSound = () => {
  try {
    if (!ringAudioContext) {
      ringAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const osc = ringAudioContext.createOscillator();
    const gain = ringAudioContext.createGain();
    osc.connect(gain);
    gain.connect(ringAudioContext.destination);
    osc.frequency.setValueAtTime(440, ringAudioContext.currentTime);
    osc.frequency.setValueAtTime(520, ringAudioContext.currentTime + 0.15);
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ringAudioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ringAudioContext.currentTime + 0.4);
    osc.start(ringAudioContext.currentTime);
    osc.stop(ringAudioContext.currentTime + 0.4);
  } catch (e) {
    console.error("Ring sound error:", e);
  }
};

const startRingLoop = () => {
  if (ringIntervalId) return;
  playRingSound();
  ringIntervalId = setInterval(playRingSound, 2000);
};

const stopRingLoop = () => {
  if (ringIntervalId) {
    clearInterval(ringIntervalId);
    ringIntervalId = null;
  }
};

export const useIncomingCalls = (currentUserId: string | null, userGender?: "male" | "female") => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);

  // Keep ref in sync
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Continuous buzz sound while incoming call is active
  useEffect(() => {
    if (incomingCall) {
      startRingLoop();
    } else {
      stopRingLoop();
    }
    return () => stopRingLoop();
  }, [incomingCall]);

  useEffect(() => {
    if (!currentUserId) return;

    // Determine which column to listen on based on gender
    // Men receive calls on man_user_id (from golden badge women)
    // Women receive calls on woman_user_id (from men)
    const gender = userGender || "female";
    const filterColumn = gender === "male" ? "man_user_id" : "woman_user_id";
    const callerColumn = gender === "male" ? "woman_user_id" : "man_user_id";

    // Subscribe to incoming calls for this user
    const channel = supabase
      .channel(`incoming-calls-${currentUserId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_call_sessions',
          filter: `${filterColumn}=eq.${currentUserId}`
        },
        async (payload) => {
          const call = payload.new as any;
          
          if (call.status === 'ringing') {
            const callerId = call[callerColumn];
            
            // Skip if this user initiated the call (avoid showing own outgoing call as incoming)
            if (callerId === currentUserId) return;
            
            // Fetch caller info from profiles
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('full_name, photo_url')
              .eq('user_id', callerId)
              .single();

            let callerName = callerProfile?.full_name || 'Someone';
            let callerPhoto = callerProfile?.photo_url || null;

            // Fallback to gender-specific profile table
            if (!callerProfile) {
              const fallbackTable = gender === "male" ? "female_profiles" : "male_profiles";
              const { data: fallbackProfile } = await supabase
                .from(fallbackTable)
                .select('full_name, photo_url')
                .eq('user_id', callerId)
                .single();
              
              if (fallbackProfile) {
                callerName = fallbackProfile.full_name || 'Someone';
                callerPhoto = fallbackProfile.photo_url;
              }
            }

            setIncomingCall({
              callId: call.call_id,
              callerUserId: callerId,
              callerName,
              callerPhoto
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_call_sessions',
          filter: `${filterColumn}=eq.${currentUserId}`
        },
        (payload) => {
          const call = payload.new as any;
          if (['ended', 'declined', 'missed', 'timeout_cleanup'].includes(call.status) && 
              incomingCallRef.current?.callId === call.call_id) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, userGender]);

  const clearIncomingCall = () => {
    stopRingLoop();
    setIncomingCall(null);
  };

  return { incomingCall, clearIncomingCall };
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IncomingCall {
  callId: string;
  callerUserId: string;
  callerName: string;
  callerPhoto: string | null;
}

export const useIncomingCalls = (currentUserId: string | null) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    // Check for existing ringing calls on mount
    const checkExistingCalls = async () => {
      const { data: existingCall } = await supabase
        .from('video_call_sessions')
        .select('call_id, man_user_id, status')
        .eq('woman_user_id', currentUserId)
        .eq('status', 'ringing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCall) {
        // Fetch caller info
        const { data: maleProfile } = await supabase
          .from('male_profiles')
          .select('full_name, photo_url')
          .eq('user_id', existingCall.man_user_id)
          .maybeSingle();

        setIncomingCall({
          callId: existingCall.call_id,
          callerUserId: existingCall.man_user_id,
          callerName: maleProfile?.full_name || 'Someone',
          callerPhoto: maleProfile?.photo_url || null
        });
      }
    };

    checkExistingCalls();

    // Subscribe to incoming calls for this user
    const channel = supabase
      .channel(`incoming-calls-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_call_sessions',
          filter: `woman_user_id=eq.${currentUserId}`
        },
        async (payload) => {
          const call = payload.new as any;
          
          if (call.status === 'ringing') {
            // Fetch caller info from male_profiles
            const { data: maleProfile } = await supabase
              .from('male_profiles')
              .select('full_name, photo_url')
              .eq('user_id', call.man_user_id)
              .maybeSingle();

            setIncomingCall({
              callId: call.call_id,
              callerUserId: call.man_user_id,
              callerName: maleProfile?.full_name || 'Someone',
              callerPhoto: maleProfile?.photo_url || null
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
          filter: `woman_user_id=eq.${currentUserId}`
        },
        (payload) => {
          const call = payload.new as any;
          
          // Clear incoming call if it's no longer ringing
          if (call.status !== 'ringing') {
            setIncomingCall(prev => {
              if (prev?.callId === call.call_id) {
                return null;
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  return { incomingCall, clearIncomingCall };
};

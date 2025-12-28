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
          const call = payload.new;
          
          if (call.status === 'ringing') {
            // Fetch caller info
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('full_name, photo_url')
              .eq('user_id', call.man_user_id)
              .single();

            // Try male_profiles if not found
            let callerName = callerProfile?.full_name || 'Someone';
            let callerPhoto = callerProfile?.photo_url;

            if (!callerProfile) {
              const { data: maleProfile } = await supabase
                .from('male_profiles')
                .select('full_name, photo_url')
                .eq('user_id', call.man_user_id)
                .single();
              
              if (maleProfile) {
                callerName = maleProfile.full_name || 'Someone';
                callerPhoto = maleProfile.photo_url;
              }
            }

            setIncomingCall({
              callId: call.call_id,
              callerUserId: call.man_user_id,
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
          filter: `woman_user_id=eq.${currentUserId}`
        },
        (payload) => {
          const call = payload.new;
          
          // Clear incoming call if it's no longer ringing
          if (call.status !== 'ringing' && incomingCall?.callId === call.call_id) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, incomingCall?.callId]);

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  return { incomingCall, clearIncomingCall };
};
